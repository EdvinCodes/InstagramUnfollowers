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
 * These are unofficial endpoints — Instagram can change or rate-limit them too,
 * so every caller must treat a non-200 status explicitly instead of assuming
 * "no data" means "no accounts".
 */
import { getHeaders } from './growthApi';
import { Typename, UserNode } from '../model/user';
import { isProfilePicAnonymous } from './utils';

const LIST_PAGE_SIZE = 50;

export interface RestUser {
  readonly pk: string;
  readonly username: string;
  readonly fullName: string;
  readonly profilePicUrl: string;
  readonly isPrivate: boolean;
  readonly isVerified: boolean;
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
}

interface RestListResponse {
  users?: RawRestUser[];
  next_max_id?: string;
  big_list?: boolean;
  status?: string;
}

export interface FetchListPageResult {
  readonly users: readonly RestUser[];
  readonly nextMaxId: string | null;
  /** Raw HTTP status. Callers must branch on 429 (rate limit) vs other errors themselves. */
  readonly status: number;
}

export function normalizeRestUser(raw: RawRestUser): RestUser | null {
  const pk = raw.pk ?? raw.pk_id ?? raw.id;
  if (pk === undefined || !raw.username) {
    return null;
  }
  return {
    pk: String(pk),
    username: raw.username,
    fullName: raw.full_name ?? '',
    profilePicUrl: raw.profile_pic_url_hd ?? raw.profile_pic_url ?? '',
    isPrivate: Boolean(raw.is_private),
    isVerified: Boolean(raw.is_verified),
  };
}

async function fetchListPage(
  userId: string,
  kind: 'following' | 'followers',
  maxId: string | null,
): Promise<FetchListPageResult> {
  const url = new URL(`https://www.instagram.com/api/v1/friendships/${userId}/${kind}/`);
  url.searchParams.set('count', String(LIST_PAGE_SIZE));
  if (maxId) {
    url.searchParams.set('max_id', maxId);
  }

  const response = await fetch(url.toString(), {
    headers: getHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    return { users: [], nextMaxId: null, status: response.status };
  }

  const json = (await response.json()) as RestListResponse;
  const users = (json.users ?? [])
    .map(normalizeRestUser)
    .filter((user): user is RestUser => user !== null);

  return {
    users,
    nextMaxId: json.next_max_id ?? null,
    status: response.status,
  };
}

export function fetchFollowingPage(userId: string, maxId: string | null): Promise<FetchListPageResult> {
  return fetchListPage(userId, 'following', maxId);
}

export function fetchFollowersPage(userId: string, maxId: string | null): Promise<FetchListPageResult> {
  return fetchListPage(userId, 'followers', maxId);
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
