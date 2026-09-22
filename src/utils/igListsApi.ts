/**
 * Instagram's legacy GraphQL following query (query_hash-based) stopped returning
 * `edges` sometime around August 2026 — it still answers 200 OK with the real
 * `count`, but the array is always empty. See:
 * https://github.com/EdvinCodes/InstagramUnfollowers/issues/5
 *
 * This module replaces it with the same private REST endpoints the Instagram web
 * app itself uses for the following/followers lists:
 *   GET /api/v1/friendships/{userId}/following/?count=50[&max_id=...]
 *   GET /api/v1/friendships/{userId}/followers/?count=50[&max_id=...]
 *
 * `count` defaults to 50 here but is configurable end-to-end (see
 * Timings.usersPerSearchCycle, set in Settings) — same knob davidarroyo1234's fork
 * exposes. Instagram may still return fewer per page on its own regardless of what's
 * requested (particularly for followers, which is server-chunked to ~15-25), so this
 * only controls the upper bound of what we ask for, not a guarantee.
 *
 * These are unofficial endpoints — Instagram can change or rate-limit them too,
 * so every caller must treat a non-200 status explicitly instead of assuming
 * "no data" means "no accounts".
 */
import { getHeaders } from './growthApi';
import { Typename, UserNode } from '../model/user';
import { getCookie, isProfilePicAnonymous, sleep } from './utils';

const LIST_PAGE_SIZE = 50;

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
  follow_ranking_token?: string;
}

export interface FetchListPageResult {
  readonly users: readonly RestUser[];
  readonly nextMaxId: string | null;
  /** Ranking token Instagram echoes back; pass it into the next page of the SAME list. */
  readonly rankToken: string | null;
  /** Raw HTTP status. Callers must branch on 429 (rate limit) vs other errors themselves. */
  readonly status: number;
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

/** Instagram's own clients echo this back on every following/followers page request
 * after the first, to keep list ordering stable while it paginates. Optional — the
 * endpoint still works without it — but omitting it can let entries shift between
 * pages on large lists. */
export function parseRankToken(json: RestListResponse): string | null {
  return typeof json.follow_ranking_token === 'string' ? json.follow_ranking_token : null;
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

/**
 * Instagram sometimes answers a private-API call with `200 OK` (or another 2xx) but
 * hands back an HTML "please wait a few minutes" / challenge page instead of JSON —
 * calling `.json()` directly then throws a raw `SyntaxError` ("Unexpected token '<'")
 * that has nothing to do with rate limiting or pagination, yet aborts the entire scan
 * if left uncaught. Parse defensively so callers can treat it as a soft failure.
 */
async function safeJsonParse<T>(response: Response): Promise<T | null> {
  try {
    const text = await response.text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
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

async function fetchListPage(
  userId: string,
  kind: 'following' | 'followers',
  maxId: string | null,
  query?: string,
  rankToken?: string | null,
  count: number = LIST_PAGE_SIZE,
): Promise<FetchListPageResult> {
  const url = new URL(`https://www.instagram.com/api/v1/friendships/${userId}/${kind}/`);
  url.searchParams.set('count', String(count));
  url.searchParams.set('search_surface', 'follow_list_page');
  if (query) {
    url.searchParams.set('query', query);
  }
  if (maxId) {
    url.searchParams.set('max_id', maxId);
  }
  if (rankToken) {
    url.searchParams.set('rank_token', rankToken);
  }

  const response = await fetch(url.toString(), {
    headers: getHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    return { users: [], nextMaxId: null, rankToken: null, status: response.status };
  }

  const json = await safeJsonParse<RestListResponse>(response);
  if (json === null) {
    // 2xx status but not JSON — treat like a soft rate limit (status 0) so callers
    // back off and retry instead of an uncaught SyntaxError killing the whole scan.
    return { users: [], nextMaxId: null, rankToken: null, status: 0 };
  }
  const users = (json.users ?? [])
    .map(normalizeRestUser)
    .filter((user): user is RestUser => user !== null);
  const lastPk = users.length > 0 ? users[users.length - 1].pk : null;

  return {
    users,
    nextMaxId: parseNextMaxId(json, lastPk),
    rankToken: parseRankToken(json),
    status: response.status,
  };
}

export function fetchFollowingPage(
  userId: string,
  maxId: string | null,
  rankToken?: string | null,
  count?: number,
): Promise<FetchListPageResult> {
  return fetchListPage(userId, 'following', maxId, undefined, rankToken, count);
}

export function fetchFollowersPage(
  userId: string,
  maxId: string | null,
  rankToken?: string | null,
  count?: number,
): Promise<FetchListPageResult> {
  return fetchListPage(userId, 'followers', maxId, undefined, rankToken, count);
}

export function searchOwnFollowing(userId: string, username: string): Promise<FetchListPageResult> {
  return fetchListPage(userId, 'following', null, username);
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
 * in the followers index, no earlier show_many call). These need a `show_many` bulk
 * check instead of being silently defaulted to "does not follow back".
 *
 * IMPORTANT: this intentionally does NOT special-case `followedBy === false` as
 * "already resolved, skip it". An earlier version of this function did that (treating
 * `false` as just as trustworthy as `true`), and it caused real, confirmed mutuals to
 * get stuck permanently in "non-follower" — Instagram's `friendship_status` on the
 * *following* list is not reliable in the false/negative direction (it looks like it
 * can be stale or simply wrong), only in the positive one. `show_many` is the
 * authoritative check either way, so anyone not already confirmed `true` gets
 * verified, regardless of what the list said.
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

/**
 * Bulk follow-back check. Used when the followers list came back empty / IDs
 * didn't match, so we would otherwise mark the entire following list as
 * non-followers.
 *
 * Best-effort by design: a single bad chunk (429, any other error status, or a
 * non-JSON "challenge page" body) only skips THAT chunk — it never throws and
 * never discards whatever earlier chunks already resolved. Only a 429 is
 * reported back via `status` so the caller can decide to slow down; every other
 * hiccup is silent since this is already a safety net for a handful of stragglers,
 * not the primary classification path.
 */
export async function fetchFollowedByMany(
  userIds: readonly string[],
): Promise<{ followedByIds: Set<string>; status: number }> {
  const followedByIds = new Set<string>();
  const csrfToken = getCookie('csrftoken') ?? '';
  const chunkSize = 20;
  let sawRateLimit = false;

  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const res = await fetch('https://www.instagram.com/api/v1/friendships/show_many/', {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'content-type': 'application/x-www-form-urlencoded',
        'x-csrftoken': csrfToken,
      },
      credentials: 'include',
      body: `user_ids=${chunk.join(',')}`,
    });

    if (res.status === 429) {
      sawRateLimit = true;
    } else if (res.ok) {
      const json = await safeJsonParse<ShowManyResponse>(res);
      // json === null means 2xx but non-JSON (challenge page) — skip this chunk only.
      if (json !== null) {
        for (const [id, status] of Object.entries(json.friendship_statuses ?? {})) {
          if (status.followed_by) {
            followedByIds.add(id);
          }
        }
      }
    }
    // Any other status: skip this chunk, keep going — a handful of unresolved
    // stragglers is fine, aborting the whole safety net is not.

    if (i + chunkSize < userIds.length) {
      await sleep(300);
    }
  }

  return { followedByIds, status: sawRateLimit ? 429 : 200 };
}
