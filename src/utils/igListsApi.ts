/**
 * Instagram's legacy GraphQL following query (query_hash-based) stopped returning
 * `edges` sometime around August 2026 — it still answers 200 OK with the real
 * `count`, but the array is always empty. See:
 * https://github.com/EdvinCodes/InstagramUnfollowers/issues/5
 *
 * This module replaces it with the same private REST endpoints the Instagram web
 * app itself uses for the following/followers lists:
 *   GET /api/v1/friendships/{userId}/following/?count=50&search_surface=follow_list_page[&max_id=...]
 *   GET /api/v1/friendships/{userId}/followers/?count=50&search_surface=follow_list_page[&max_id=...]
 *
 * The query matches what instagram.com sends (no rank_token), and the headers
 * come from igClient. `count` is configurable end-to-end (Timings.usersPerSearchCycle);
 * Instagram may still return fewer per page (followers come in chunks of ~25).
 *
 * These are unofficial endpoints, so every page reports *why* it failed
 * (`failure`) instead of an empty list that could pass for "no accounts".
 */
import { igFetchJson, type IgFailure } from './igClient';
import { Typename, UserNode } from '../model/user';
import { clampUsersPerSearchCycle, isProfilePicAnonymous, sleep } from './utils';

const LIST_PAGE_SIZE = 50;
const SEARCH_PAGE_SIZE = 12;

export interface RestUser {
  readonly pk: string;
  readonly ids: readonly string[];
  readonly username: string;
  readonly fullName: string;
  readonly profilePicUrl: string;
  readonly isPrivate: boolean;
  readonly isVerified: boolean;
  /** true/false when Instagram sent friendship_status.followed_by; null if unknown. */
  readonly followedBy: boolean | null;
  readonly outgoingRequest: boolean | null;
}

interface RawFriendship {
  followed_by?: boolean;
  following?: boolean;
  outgoing_request?: boolean;
}

interface RawRestUser {
  pk?: string | number;
  pk_id?: string | number;
  id?: string | number;
  username?: string;
  full_name?: string;
  profile_pic_url?: string;
  profile_pic_url_hd?: string;
  is_private?: boolean;
  is_verified?: boolean;
  followed_by?: boolean;
  friendship_status?: RawFriendship;
}

interface RestListResponse {
  users?: RawRestUser[];
  next_max_id?: string | number | Record<string, unknown> | null;
  has_more?: boolean;
  big_list?: boolean;
  status?: string;
}

export interface ListPage {
  readonly users: readonly RestUser[];
  readonly nextMaxId: string | null;
  /**
   * The cursor is the last pk, guessed because Instagram said has_more without
   * sending next_max_id. Getting that same guess back means the list ended;
   * getting a real cursor back means the walk is stuck.
   */
  readonly cursorIsSynthetic: boolean;
  readonly status: number;
  readonly failure: IgFailure | null;
  readonly detail: string;
}

export function collectRawUserIds(raw: RawRestUser): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of [raw.pk, raw.pk_id, raw.id]) {
    if (value === undefined || value === '') {
      continue;
    }
    const id = String(value);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function parseOutgoingRequest(raw: RawRestUser): boolean | null {
  if (typeof raw.friendship_status?.outgoing_request === 'boolean') {
    return raw.friendship_status.outgoing_request;
  }
  return null;
}

export function parseFollowedBy(raw: RawRestUser): boolean | null {
  if (typeof raw.friendship_status?.followed_by === 'boolean') {
    return raw.friendship_status.followed_by;
  }
  if (typeof raw.followed_by === 'boolean') {
    return raw.followed_by;
  }
  return null;
}

export function parseNextMaxId(json: RestListResponse, lastPk: string | null): string | null {
  const raw = json.next_max_id;
  if (raw !== undefined && raw !== null) {
    if (typeof raw === 'object') {
      try {
        return JSON.stringify(raw);
      } catch {
        return lastPk;
      }
    }
    return String(raw);
  }
  if (json.has_more === true) {
    return lastPk;
  }
  return null;
}

export function normalizeRestUser(raw: RawRestUser): RestUser | null {
  const ids = collectRawUserIds(raw);
  if (ids.length === 0 || !raw.username) {
    return null;
  }
  return {
    pk: ids[0],
    ids,
    username: raw.username,
    fullName: raw.full_name ?? '',
    profilePicUrl: raw.profile_pic_url_hd ?? raw.profile_pic_url ?? '',
    isPrivate: Boolean(raw.is_private),
    isVerified: Boolean(raw.is_verified),
    followedBy: parseFollowedBy(raw),
    outgoingRequest: parseOutgoingRequest(raw),
  };
}

function failedPage(status: number, failure: IgFailure, detail: string): ListPage {
  return { users: [], nextMaxId: null, cursorIsSynthetic: false, status, failure, detail };
}

/** Turns one Instagram list answer into a page. Exported for tests. */
export function readListPage(status: number, json: RestListResponse, url: string): ListPage {
  if (!Array.isArray(json.users)) {
    // A JSON answer without the list is not "zero accounts": treat it like the
    // HTML soft-block so the walk pauses and retries.
    return failedPage(status, 'soft_block', `No users array in the answer for ${url}`);
  }
  const users = json.users.map(normalizeRestUser).filter((user): user is RestUser => user !== null);
  const lastPk = users.length > 0 ? users[users.length - 1].pk : null;
  const nextMaxId = parseNextMaxId(json, lastPk);
  return {
    users,
    nextMaxId,
    cursorIsSynthetic: nextMaxId !== null && (json.next_max_id === undefined || json.next_max_id === null),
    status,
    failure: null,
    detail: '',
  };
}

async function fetchListPage(
  userId: string,
  kind: 'following' | 'followers',
  maxId: string | null,
  query: string | undefined,
  count: number,
): Promise<ListPage> {
  const url = new URL(`https://www.instagram.com/api/v1/friendships/${userId}/${kind}/`);
  url.searchParams.set('count', String(count));
  url.searchParams.set('search_surface', 'follow_list_page');
  if (query) {
    url.searchParams.set('query', query);
  }
  if (maxId) {
    url.searchParams.set('max_id', maxId);
  }

  const response = await igFetchJson<RestListResponse>(url.toString());
  if (response.failure || !response.json) {
    return failedPage(response.status, response.failure ?? 'soft_block', response.detail);
  }
  return readListPage(response.status, response.json, url.toString());
}

export function fetchFollowingPage(userId: string, maxId: string | null, count?: number): Promise<ListPage> {
  return fetchListPage(userId, 'following', maxId, undefined, clampUsersPerSearchCycle(count ?? LIST_PAGE_SIZE));
}

export function fetchFollowersPage(userId: string, maxId: string | null, count?: number): Promise<ListPage> {
  return fetchListPage(userId, 'followers', maxId, undefined, clampUsersPerSearchCycle(count ?? LIST_PAGE_SIZE));
}

/** Instagram's own search box in the "Following" dialog. */
export function searchOwnFollowing(userId: string, username: string): Promise<ListPage> {
  return fetchListPage(userId, 'following', null, username, SEARCH_PAGE_SIZE);
}

/** Instagram's own search box in the "Followers" dialog. */
export function searchOwnFollowers(userId: string, username: string): Promise<ListPage> {
  return fetchListPage(userId, 'followers', null, username, SEARCH_PAGE_SIZE);
}

/** True when the page lists this account (by any id variant or by username). */
export function pageListsAccount(page: ListPage, userId: string, username: string): boolean {
  const target = username.trim().toLowerCase();
  return page.users.some(user => user.ids.includes(userId) || (!!target && user.username.toLowerCase() === target));
}

export function addRestUserToFollowerIndex(
  user: RestUser,
  followerIds: Set<string>,
  followerNames: Set<string>,
): void {
  for (const id of user.ids) {
    followerIds.add(id);
  }
  followerNames.add(user.username.toLowerCase());
}

/**
 * Old GraphQL nodes had `follows_viewer` on each following edge. REST following
 * lists often include `friendship_status.followed_by`; when they don't, we fall
 * back to membership in the followers list (by any id variant or username).
 */
export function restUserFollowsViewer(
  user: RestUser,
  followerIds: ReadonlySet<string>,
  followerNames: ReadonlySet<string>,
): boolean {
  if (user.followedBy === true) {
    return true;
  }
  for (const id of user.ids) {
    if (followerIds.has(id)) {
      return true;
    }
  }
  if (followerNames.has(user.username.toLowerCase())) {
    return true;
  }
  return false;
}

function emptyReel(id: string): UserNode['reel'] {
  return {
    id,
    expiring_at: 0,
    has_pride_media: false,
    latest_reel_media: 0,
    seen: null,
    owner: {
      __typename: Typename.GraphUser,
      id,
      profile_pic_url: '',
      username: id,
    },
  };
}

/** Maps a REST following-list user into the internal UserNode shape used across the app. */
export function mapRestUserToNode(user: RestUser, followsViewer: boolean): UserNode {
  return {
    id: user.pk,
    username: user.username,
    full_name: user.fullName,
    profile_pic_url: user.profilePicUrl,
    is_private: user.isPrivate,
    is_verified: user.isVerified,
    followed_by_viewer: true,
    follows_viewer: followsViewer,
    requested_by_viewer: false,
    has_anonymous_profile_picture: isProfilePicAnonymous(user.profilePicUrl),
    reel: emptyReel(user.pk),
  };
}

/**
 * Guard against a "fake success": Instagram can answer 200 OK on the very first
 * page with zero users while the account's real following/follower count (from a
 * separate, independent endpoint) is known to be positive. That combination means
 * the list endpoint is blocked/broken right now — it must NOT be reported as a
 * genuine "this account follows 0 people".
 */
export function isSuspiciousEmptyFirstPage(pageUsers: readonly RestUser[], knownTotal: number): boolean {
  return pageUsers.length === 0 && knownTotal > 0;
}

/**
 * Following-list accounts we still can't classify as "follows back" for sure —
 * nothing already confirms it (no `friendship_status.followed_by === true`, no match
 * in the followers index). These go to the bounded `show_many` sweep instead of
 * being trusted blindly.
 *
 * IMPORTANT: this intentionally does NOT special-case `followedBy === false` as
 * "already resolved, skip it". An earlier version of this function did that (treating
 * `false` as just as trustworthy as `true`), and it caused real, confirmed mutuals to
 * get stuck permanently in "non-follower" — Instagram's `friendship_status` on the
 * *following* list is not reliable in the false/negative direction (it looks like it
 * can be stale or simply wrong), only in the positive one.
 */
export function findUnclassifiedUserIds(
  followingUsers: readonly RestUser[],
  followerIds: ReadonlySet<string>,
  followerNames: ReadonlySet<string>,
): string[] {
  return followingUsers
    .filter(user => !restUserFollowsViewer(user, followerIds, followerNames))
    .map(user => user.pk);
}

interface ShowManyResponse {
  friendship_statuses?: Record<string, { followed_by?: boolean }>;
}

const SHOW_MANY_CHUNK = 20;
const SHOW_MANY_MAX_IDS = 100;

/**
 * Bulk follow-back check for the few accounts the complete followers list
 * still did not match (an id-scheme mismatch). Only ever adds "follows you".
 *
 * Bounded and polite: at most SHOW_MANY_MAX_IDS ids, and it stops at the first
 * failed chunk instead of pushing more requests into a limit.
 */
export async function fetchFollowedByMany(
  userIds: readonly string[],
): Promise<{ followedByIds: Set<string>; failure: IgFailure | null }> {
  const followedByIds = new Set<string>();
  const ids = userIds.slice(0, SHOW_MANY_MAX_IDS);

  for (let i = 0; i < ids.length; i += SHOW_MANY_CHUNK) {
    const chunk = ids.slice(i, i + SHOW_MANY_CHUNK);
    const response = await igFetchJson<ShowManyResponse>('https://www.instagram.com/api/v1/friendships/show_many/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `user_ids=${chunk.join(',')}`,
    });
    if (response.failure || !response.json) {
      return { followedByIds, failure: response.failure ?? 'soft_block' };
    }
    const statuses = response.json.friendship_statuses ?? {};
    for (const id of Object.keys(statuses)) {
      if (statuses[id].followed_by) {
        followedByIds.add(id);
      }
    }
    if (i + SHOW_MANY_CHUNK < ids.length) {
      await sleep(400);
    }
  }

  return { followedByIds, failure: null };
}
