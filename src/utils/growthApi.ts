import { getCookie, isProfilePicAnonymous, sleep } from './utils';
import { postsWithinWindow } from './growthHelpers';
import {
  GROWTH_MAX_COMMENT_PAGES,
  GROWTH_MAX_POSTS,
  GROWTH_POST_WINDOW_DAYS,
} from '../constants/growth';
import {
  getWebSessionTokens,
  igFetchJson,
  jazoest,
  instagramApiHeaders,
  type IgFailure,
} from './igClient';
import { pageListsAccount, searchOwnFollowing } from './igListsApi';
import { INSTAGRAM_UNFOLLOW_DOC_ID, INSTAGRAM_UNFOLLOW_FRIENDLY_NAME } from '../constants/constants';

export interface IgUserBrief {
  id: string;
  username: string;
  isPrivate: boolean;
  isGhost: boolean;
  mediaCount: number;
  followingCount: number;
  followerCount: number;
}

export interface FriendshipStatus {
  following: boolean;
  outgoingRequest: boolean;
  /** Present when Instagram sent `followed_by`. Null when the field was absent. */
  followedBy?: boolean | null;
}

/** Headers for every Instagram API call. Prefer this over hand-built headers. */
export function getHeaders(): HeadersInit {
  return instagramApiHeaders({ referer: 'https://www.instagram.com/' });
}

export function getCurrentUserId(): string | null {
  return getCookie('ds_user_id') ?? null;
}

interface WebProfileFriendship {
  following?: boolean;
  outgoing_request?: boolean;
  followed_by?: boolean;
}

interface WebProfileResponse {
  data?: {
    user?: {
      id?: string;
      is_private?: boolean;
      friendship_status?: WebProfileFriendship;
    };
  };
}

interface FeedItem {
  pk?: string | number;
  id?: string | number;
  taken_at?: number;
}

interface UserFeedResponse {
  items?: FeedItem[];
  next_max_id?: string;
}

interface CommentUser {
  pk?: string | number;
  user_id?: string | number;
}

interface Comment {
  user?: CommentUser;
  user_id?: string | number;
}

interface CommentsResponse {
  comments?: Comment[];
  next_max_id?: string;
  next_min_id?: string;
}

interface UserInfoResponse {
  user?: {
    pk?: string | number;
    username?: string;
    is_private?: boolean;
    media_count?: number;
    profile_pic_url?: string;
    profile_pic_url_hd?: string;
    follower_count?: number;
    following_count?: number;
  };
}

export function parseFriendshipStatus(json: unknown): FriendshipStatus | null {
  if (!json || typeof json !== 'object') {
    return null;
  }
  const record = json as Record<string, unknown>;
  const nested = record.friendship_status;
  const source =
    nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : record;
  if (!('following' in source) && !('outgoing_request' in source) && !('followed_by' in source)) {
    return null;
  }
  return {
    following: Boolean(source.following),
    outgoingRequest: Boolean(source.outgoing_request),
    followedBy: typeof source.followed_by === 'boolean' ? source.followed_by : null,
  };
}

export async function getUserIdByUsername(username: string): Promise<string | null> {
  try {
    const res = await igFetchJson<WebProfileResponse>(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    );
    return res.json?.data?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getRecentPostIds(userId: string): Promise<string[]> {
  const postIds: string[] = [];
  let nextMaxId: string | undefined;

  try {
    while (postIds.length < GROWTH_MAX_POSTS) {
      const url = nextMaxId
        ? `https://www.instagram.com/api/v1/feed/user/${userId}/?count=12&max_id=${encodeURIComponent(nextMaxId)}`
        : `https://www.instagram.com/api/v1/feed/user/${userId}/?count=12`;

      const res = await igFetchJson<UserFeedResponse>(url);
      if (res.failure || !res.json) {
        break;
      }

      const items = res.json.items ?? [];
      if (items.length === 0) {
        break;
      }

      let reachedOldPosts = false;
      for (const item of items) {
        const takenAt = item.taken_at ?? 0;
        if (!postsWithinWindow(takenAt, GROWTH_POST_WINDOW_DAYS)) {
          reachedOldPosts = true;
          continue;
        }
        const mediaId = String(item.pk ?? item.id ?? '');
        if (mediaId) {
          postIds.push(mediaId);
        }
        if (postIds.length >= GROWTH_MAX_POSTS) {
          break;
        }
      }

      if (reachedOldPosts || !res.json.next_max_id) {
        break;
      }
      nextMaxId = res.json.next_max_id;
    }
  } catch {
    return postIds;
  }

  return postIds;
}

export async function getCommenterIds(mediaId: string): Promise<string[]> {
  const seen = new Set<string>();
  const ids: string[] = [];
  let nextMaxId: string | undefined;

  try {
    for (let page = 0; page < GROWTH_MAX_COMMENT_PAGES; page++) {
      const url = nextMaxId
        ? `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true&permalink_enabled=false&max_id=${encodeURIComponent(nextMaxId)}`
        : `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true&permalink_enabled=false`;

      const res = await igFetchJson<CommentsResponse>(url);
      if (res.failure || !res.json) {
        break;
      }

      const comments = res.json.comments ?? [];
      for (const comment of comments) {
        const uid = String(comment.user?.pk ?? comment.user_id ?? comment.user?.user_id ?? '');
        if (uid && !seen.has(uid)) {
          seen.add(uid);
          ids.push(uid);
        }
      }

      nextMaxId = res.json.next_max_id ?? res.json.next_min_id;
      if (!nextMaxId || comments.length === 0) {
        break;
      }
    }
  } catch {
    return ids;
  }

  return ids;
}

export async function getUserBrief(userId: string): Promise<IgUserBrief | null> {
  try {
    const res = await igFetchJson<UserInfoResponse>(`https://www.instagram.com/api/v1/users/${userId}/info/`);
    const user = res.json?.user;
    if (res.failure || !user) {
      return null;
    }

    const picUrl = user.profile_pic_url_hd ?? user.profile_pic_url ?? '';
    const mediaCount = user.media_count ?? 0;
    return {
      id: String(user.pk ?? userId),
      username: user.username ?? userId,
      isPrivate: Boolean(user.is_private),
      isGhost: isProfilePicAnonymous(picUrl) || mediaCount === 0,
      mediaCount,
      followingCount: user.following_count ?? 0,
      followerCount: user.follower_count ?? 0,
    };
  } catch {
    return null;
  }
}

export async function fetchFriendshipStatus(
  userId: string,
): Promise<{ status: number; friendship: FriendshipStatus | null; failure: IgFailure | null }> {
  const res = await igFetchJson(`https://www.instagram.com/api/v1/friendships/show/${userId}/`);
  return {
    status: res.status,
    friendship: parseFriendshipStatus(res.json),
    failure: res.failure,
  };
}

export async function getFriendshipStatus(userId: string): Promise<FriendshipStatus | null> {
  return (await fetchFriendshipStatus(userId)).friendship;
}

export type FriendshipAction = 'create' | 'destroy' | 'remove_follower';

export interface FriendshipMutationResult {
  ok: boolean;
  status: number;
  body: string;
  failure: IgFailure | null;
  /** HTTP succeeded but the relationship is still there. The queue should stop. */
  ignored?: boolean;
}

function friendshipFormBody(userId: string, tokens: { fbDtsg: string }): string {
  return new URLSearchParams({
    user_id: userId,
    container_module: 'profile',
    nav_chain: 'PolarisProfilePostsTabRoot:profilePage:1:via_cold_start',
    fb_dtsg: tokens.fbDtsg,
    jazoest: jazoest(tokens.fbDtsg),
  }).toString();
}

/** True when the body proves the action, false when it proves it did not, null when it does not say. */
export function didFriendshipActionSucceed(action: FriendshipAction, body: string): boolean | null {
  let json: unknown;
  try {
    json = JSON.parse(body.replace(/^for \(;;\);/, '')) as unknown;
  } catch {
    return null;
  }
  if (!json || typeof json !== 'object') {
    return null;
  }
  const record = json as Record<string, unknown>;
  if (record.status === 'fail') {
    return false;
  }
  const nested = record.friendship_status;
  const source = nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : record;
  const following = typeof source.following === 'boolean' ? source.following : null;
  const outgoing = typeof source.outgoing_request === 'boolean' ? source.outgoing_request : null;
  const followedBy = typeof source.followed_by === 'boolean' ? source.followed_by : null;

  if (action === 'remove_follower') {
    if (followedBy === null) {
      return null;
    }
    return !followedBy;
  }
  if (action === 'create') {
    if (following === null && outgoing === null) {
      return null;
    }
    return following === true || outgoing === true;
  }
  if (following === null && outgoing === null) {
    return null;
  }
  if (following === true || outgoing === true) {
    return false;
  }
  return true;
}

export function findFriendshipInPayload(node: unknown, depth = 0): FriendshipStatus | null {
  if (depth > 12 || !node || typeof node !== 'object') {
    return null;
  }
  const parsed = parseFriendshipStatus(node);
  if (parsed) {
    return parsed;
  }
  for (const value of Object.values(node as Record<string, unknown>)) {
    const found = findFriendshipInPayload(value, depth + 1);
    if (found) {
      return found;
    }
  }
  return null;
}

async function isStillInFollowingList(userId: string, username: string): Promise<boolean | null> {
  const viewerId = getCurrentUserId();
  if (!viewerId) {
    return null;
  }
  const page = await searchOwnFollowing(viewerId, username);
  if (page.failure) {
    return null;
  }
  return pageListsAccount(page, userId, username);
}

async function confirmDestroyed(
  userId: string,
  username: string | undefined,
  body: string,
): Promise<'yes' | 'no' | 'rate' | 'unknown'> {
  const reported = didFriendshipActionSucceed('destroy', body);
  if (reported === true) {
    return 'yes';
  }
  if (reported === false) {
    return 'no';
  }
  if (username) {
    const stillThere = await isStillInFollowingList(userId, username);
    if (stillThere === true) {
      return 'no';
    }
    if (stillThere === false) {
      return 'yes';
    }
  }
  const shown = await fetchFriendshipStatus(userId);
  if (shown.failure === 'rate_limited' || shown.failure === 'soft_block') {
    return 'rate';
  }
  if (!shown.friendship) {
    return 'unknown';
  }
  return !shown.friendship.following && !shown.friendship.outgoingRequest ? 'yes' : 'no';
}

async function postFriendshipAction(
  action: FriendshipAction,
  userId: string,
  username?: string,
): Promise<FriendshipMutationResult> {
  const tokens = await getWebSessionTokens();
  if (!tokens) {
    return { ok: false, status: 0, body: 'missing fb_dtsg', failure: 'session', ignored: true };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (tokens.revision) {
    headers['X-Instagram-AJAX'] = tokens.revision;
  }
  if (username) {
    headers.referer = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  }

  const res = await igFetchJson(`https://www.instagram.com/api/v1/friendships/${action}/${userId}/`, {
    method: 'POST',
    headers,
    body: friendshipFormBody(userId, tokens),
  });
  const body = res.json ? JSON.stringify(res.json) : res.detail;

  if (res.failure) {
    return {
      ok: false,
      status: res.status,
      body,
      failure: res.failure,
      ignored: res.failure === 'soft_block' || res.failure === 'failed',
    };
  }

  if (action === 'create') {
    const created = didFriendshipActionSucceed('create', body);
    return {
      ok: created !== false,
      status: res.status,
      body,
      failure: created === false ? 'failed' : null,
    };
  }

  if (action === 'remove_follower') {
    const removed = didFriendshipActionSucceed('remove_follower', body);
    if (removed === true) {
      return { ok: true, status: res.status, body, failure: null };
    }
    await sleep(400);
    const shown = await fetchFriendshipStatus(userId);
    if (shown.friendship?.followedBy === false) {
      return { ok: true, status: res.status, body, failure: null };
    }
    if (shown.friendship?.followedBy === true || removed === false) {
      return { ok: false, status: res.status, body, failure: 'failed', ignored: true };
    }
    return { ok: false, status: res.status, body, failure: 'failed', ignored: true };
  }

  const verdict = await confirmDestroyed(userId, username, body);
  if (verdict === 'rate') {
    return { ok: false, status: 429, body, failure: 'rate_limited' };
  }
  if (verdict === 'yes') {
    return { ok: true, status: res.status, body, failure: null };
  }
  return { ok: false, status: res.status, body, failure: 'failed', ignored: true };
}

/**
 * Instagram's own Unfollow button, as of Nov 2026:
 * POST /api/v1/friendships/destroy/{id}/ with the web client's headers and
 * fb_dtsg in the body. A 200 alone is not enough — the relationship must be gone.
 *
 * GraphQL (usePolarisUnfollowMutation) stays as a fallback when destroy answers
 * with the HTML page (soft_block), the same way the web client fell back for a
 * while in October.
 */
async function destroyRelationship(
  userId: string,
  username: string | undefined,
  purpose: 'unfollow' | 'cancel',
): Promise<FriendshipMutationResult> {
  const primary = await postFriendshipAction('destroy', userId, username);
  if (primary.ok) {
    return primary;
  }
  // Only fall back to GraphQL when destroy looked like the Oct soft-block
  // (HTML page) or an opaque fail — not for rate limits / session / not_found.
  if (primary.failure !== 'soft_block' && primary.failure !== 'failed') {
    return primary;
  }

  // Soft-block / opaque fail: try the GraphQL mutation the web button used in Oct.
  const tokens = await getWebSessionTokens();
  if (!tokens) {
    return primary;
  }
  const params: Record<string, string> = {
    av: getCurrentUserId() ?? '',
    __d: 'www',
    __user: '0',
    __a: '1',
    __comet_req: '7',
    fb_dtsg: tokens.fbDtsg,
    jazoest: jazoest(tokens.fbDtsg),
    lsd: tokens.lsd,
    fb_api_caller_class: 'RelayModern',
    fb_api_req_friendly_name: INSTAGRAM_UNFOLLOW_FRIENDLY_NAME,
    variables: JSON.stringify({
      target_user_id: userId,
      container_module: 'profile',
      nav_chain: 'PolarisProfilePostsTabRoot:profilePage:1:via_cold_start',
    }),
    server_timestamps: 'true',
    doc_id: INSTAGRAM_UNFOLLOW_DOC_ID,
  };
  if (tokens.revision) {
    params.__rev = tokens.revision;
    params.__spin_r = tokens.revision;
  }

  const res = await igFetchJson('https://www.instagram.com/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-fb-friendly-name': INSTAGRAM_UNFOLLOW_FRIENDLY_NAME,
      'x-fb-lsd': tokens.lsd,
    },
    body: new URLSearchParams(params).toString(),
  });
  const body = res.json ? JSON.stringify(res.json) : res.detail;
  if (res.failure || !res.json) {
    return {
      ok: false,
      status: res.status,
      body,
      failure: res.failure ?? 'soft_block',
      ignored: true,
    };
  }

  const reported = findFriendshipInPayload(res.json);
  if (reported && (reported.following || reported.outgoingRequest)) {
    return { ok: false, status: res.status, body, failure: 'failed', ignored: true };
  }
  if (purpose === 'unfollow' && username) {
    const stillThere = await isStillInFollowingList(userId, username);
    if (stillThere === true) {
      return { ok: false, status: res.status, body, failure: 'failed', ignored: true };
    }
    if (stillThere === false) {
      return { ok: true, status: res.status, body, failure: null };
    }
  }
  if (reported && !reported.following && !reported.outgoingRequest) {
    return { ok: true, status: res.status, body, failure: null };
  }
  const shown = await fetchFriendshipStatus(userId);
  if (shown.friendship && !shown.friendship.following && !shown.friendship.outgoingRequest) {
    return { ok: true, status: res.status, body, failure: null };
  }
  return { ok: false, status: res.status, body, failure: 'failed', ignored: true };
}

export function followUser(userId: string, username?: string): Promise<FriendshipMutationResult> {
  return postFriendshipAction('create', userId, username);
}

export function removeFollower(userId: string, username?: string): Promise<FriendshipMutationResult> {
  return postFriendshipAction('remove_follower', userId, username);
}

export function unfollowUser(userId: string, username?: string): Promise<FriendshipMutationResult> {
  return destroyRelationship(userId, username, 'unfollow');
}

export function cancelFollowRequest(userId: string, username?: string): Promise<FriendshipMutationResult> {
  return destroyRelationship(userId, username, 'cancel');
}

export async function lookupUserByUsername(
  username: string,
): Promise<{ id: string | null; status: number; friendship: FriendshipStatus | null }> {
  const res = await igFetchJson<WebProfileResponse>(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
  );
  const user = res.json?.data?.user;
  return {
    id: user?.id ?? null,
    status: res.status,
    friendship: parseFriendshipStatus(user ?? null),
  };
}

// Kept for the friendship unit tests that cover the GraphQL / HTML parsers.
export { parseInstagramJson as parseInstagramGraphql, jazoest, readWebSessionTokens } from './igClient';
export { IG_ASBD_ID as IG_ASBD_FALLBACK } from './igClient';

export function readIgWebConfig(html: string): { wwwClaim: string; ajaxId: string; asbdId: string } {
  const claim = html.match(/"www_claim"\s*:\s*"(hmac\.[^"]+)"/)?.[1] ?? '0';
  const ajax = html.match(/"rollout_hash"\s*:\s*"(\d+)"/)?.[1] ?? '1';
  const asbd =
    html.match(/"ASBD_ID"\s*:\s*"?(\d+)"?/)?.[1] ?? html.match(/"asbd_id"\s*:\s*"?(\d+)"?/)?.[1] ?? '359341';
  return { wwwClaim: claim, ajaxId: ajax, asbdId: asbd };
}

export function findGraphqlFriendship(
  node: unknown,
  depth = 0,
): { following: boolean | null; outgoingRequest: boolean | null } | null {
  const found = findFriendshipInPayload(node, depth);
  if (!found) {
    return null;
  }
  return { following: found.following, outgoingRequest: found.outgoingRequest };
}
