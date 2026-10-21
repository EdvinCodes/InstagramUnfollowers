import { getCookie, isProfilePicAnonymous, sleep } from './utils';
import { isRateLimitResponse, postsWithinWindow } from './growthHelpers';
import {
  GROWTH_MAX_COMMENT_PAGES,
  GROWTH_MAX_POSTS,
  GROWTH_POST_WINDOW_DAYS,
} from '../constants/growth';

const IG_APP_ID = '936619743392459';

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

export function getHeaders(): HeadersInit {
  const csrfToken = getCookie('csrftoken') ?? '';
  return {
    'x-ig-app-id': IG_APP_ID,
    'x-csrftoken': csrfToken,
    'x-requested-with': 'XMLHttpRequest',
    'accept': '*/*',
    'referer': 'https://www.instagram.com/',
  };
}

export function getCurrentUserId(): string | null {
  return getCookie('ds_user_id') ?? null;
}

interface WebProfileFriendship {
  following?: boolean;
  outgoing_request?: boolean;
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

interface FriendshipShowResponse {
  following?: boolean;
  outgoing_request?: boolean;
  friendship_status?: WebProfileFriendship;
}

export function parseFriendshipStatus(json: unknown): FriendshipStatus | null {
  if (!json || typeof json !== 'object') {
    return null;
  }
  const record = json as Record<string, unknown>;
  const nested = record.friendship_status;
  const source =
    nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : record;
  if (
    !('following' in source) &&
    !('outgoing_request' in source) &&
    !('followed_by' in source)
  ) {
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
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      { headers: getHeaders(), credentials: 'include' },
    );
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as WebProfileResponse;
    return json.data?.user?.id ?? null;
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

      const res = await fetch(url, { headers: getHeaders(), credentials: 'include' });
      if (!res.ok) {
        break;
      }

      const json = (await res.json()) as UserFeedResponse;
      const items = json.items ?? [];
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

      if (reachedOldPosts || !json.next_max_id) {
        break;
      }
      nextMaxId = json.next_max_id;
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

      const res = await fetch(url, { headers: getHeaders(), credentials: 'include' });
      if (!res.ok) {
        break;
      }

      const json = (await res.json()) as CommentsResponse;
      const comments = json.comments ?? [];

      for (const c of comments) {
        const uid = String(c.user?.pk ?? c.user_id ?? c.user?.user_id ?? '');
        if (uid && !seen.has(uid)) {
          seen.add(uid);
          ids.push(uid);
        }
      }

      nextMaxId = json.next_max_id ?? json.next_min_id;
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
    const res = await fetch(`https://www.instagram.com/api/v1/users/${userId}/info/`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as UserInfoResponse;
    const user = json.user;
    if (!user) {
      return null;
    }

    const picUrl = user.profile_pic_url_hd ?? user.profile_pic_url ?? '';
    const mediaCount = user.media_count ?? 0;
    const isGhost = isProfilePicAnonymous(picUrl) || mediaCount === 0;

    return {
      id: String(user.pk ?? userId),
      username: user.username ?? userId,
      isPrivate: Boolean(user.is_private),
      isGhost,
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
): Promise<{ status: number; friendship: FriendshipStatus | null }> {
  try {
    const res = await fetch(`https://www.instagram.com/api/v1/friendships/show/${userId}/`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      return { status: res.status, friendship: null };
    }
    const json = (await res.json()) as FriendshipShowResponse;
    return {
      status: res.status,
      friendship: parseFriendshipStatus(json),
    };
  } catch {
    return { status: 0, friendship: null };
  }
}

export async function getFriendshipStatus(userId: string): Promise<FriendshipStatus | null> {
  const result = await fetchFriendshipStatus(userId);
  return result.friendship;
}

/**
 * Instagram retired POST /web/friendships/{id}/unfollow/ (it now 404s).
 * A 200 from /api/v1/friendships/destroy/ is not enough: the body can be
 * `{"status":"ok"}` while the account is still followed. Success means
 * friendships/show says the relationship is gone.
 */
export type FriendshipAction = 'create' | 'destroy' | 'remove_follower';

export interface FriendshipMutationResult {
  ok: boolean;
  status: number;
  body: string;
  /** HTTP succeeded but the follow is still there. The queue should stop. */
  ignored?: boolean;
}

const IG_ASBD_FALLBACK = '129477';

interface IgWebConfig {
  wwwClaim: string;
  ajaxId: string;
  asbdId: string;
}

let cachedWebConfig: IgWebConfig | null = null;

export function readIgWebConfig(html: string): IgWebConfig {
  const claim = html.match(/"www_claim"\s*:\s*"(hmac\.[^"]+)"/)?.[1] ?? '0';
  const ajax = html.match(/"rollout_hash"\s*:\s*"(\d+)"/)?.[1] ?? '1';
  const asbd =
    html.match(/"ASBD_ID"\s*:\s*"?(\d+)"?/)?.[1] ??
    html.match(/"asbd_id"\s*:\s*"?(\d+)"?/)?.[1] ??
    IG_ASBD_FALLBACK;
  return { wwwClaim: claim, ajaxId: ajax, asbdId: asbd };
}

function getIgWebConfig(): IgWebConfig {
  if (!cachedWebConfig) {
    cachedWebConfig = readIgWebConfig(document.documentElement.innerHTML);
  }
  return cachedWebConfig;
}

function rememberWwwClaim(response: Response): void {
  const claim = response.headers.get('x-ig-set-www-claim');
  if (!claim || claim === '0') {
    return;
  }
  cachedWebConfig = { ...getIgWebConfig(), wwwClaim: claim };
}

/** True when the body proves the action, false when it proves it did not, null when it does not say. */
export function didFriendshipActionSucceed(action: FriendshipAction, body: string): boolean | null {
  let json: unknown;
  try {
    json = JSON.parse(body) as unknown;
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

function friendshipFormBody(userId: string): string {
  return new URLSearchParams({
    user_id: userId,
    container_module: 'profile',
    nav_chain: 'PolarisProfileRoot:profilePage:1:via_cold_start',
    radio_type: 'wifi-none',
  }).toString();
}

function actionHeaders(username?: string): Record<string, string> {
  const config = getIgWebConfig();
  const referer = username
    ? `https://www.instagram.com/${encodeURIComponent(username)}/`
    : 'https://www.instagram.com/';
  return {
    'x-ig-app-id': IG_APP_ID,
    'x-asbd-id': config.asbdId,
    'x-csrftoken': getCookie('csrftoken') ?? '',
    'x-instagram-ajax': config.ajaxId,
    'x-ig-www-claim': config.wwwClaim,
    'x-requested-with': 'XMLHttpRequest',
    'content-type': 'application/x-www-form-urlencoded',
    'origin': 'https://www.instagram.com',
    referer,
    'accept': '*/*',
  };
}

async function postFriendshipUrl(
  url: string,
  userId: string,
  username?: string,
): Promise<FriendshipMutationResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: actionHeaders(username),
      credentials: 'include',
      body: friendshipFormBody(userId),
    });
    rememberWwwClaim(res);
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: '' };
  }
}

function relationshipCleared(status: FriendshipStatus | null): boolean | null {
  if (!status) {
    return null;
  }
  return !status.following && !status.outgoingRequest;
}

export async function lookupUserByUsername(
  username: string,
): Promise<{ id: string | null; status: number; friendship: FriendshipStatus | null }> {
  try {
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      { headers: getHeaders(), credentials: 'include' },
    );
    if (!res.ok) {
      return { id: null, status: res.status, friendship: null };
    }
    const json = (await res.json()) as WebProfileResponse;
    const user = json.data?.user;
    return {
      id: user?.id ?? null,
      status: res.status,
      friendship: parseFriendshipStatus(user ?? null),
    };
  } catch {
    return { id: null, status: 0, friendship: null };
  }
}

type ConfirmVerdict = 'yes' | 'no' | 'rate';

async function readRelationship(
  userId: string,
  username: string | undefined,
): Promise<{ verdict: ConfirmVerdict | 'unknown' }> {
  if (username) {
    const lookup = await lookupUserByUsername(username);
    if (isRateLimitResponse(lookup.status)) {
      return { verdict: 'rate' };
    }
    if (lookup.friendship) {
      const cleared = relationshipCleared(lookup.friendship);
      return { verdict: cleared ? 'yes' : 'no' };
    }
  }
  const shown = await fetchFriendshipStatus(userId);
  if (isRateLimitResponse(shown.status)) {
    return { verdict: 'rate' };
  }
  const cleared = relationshipCleared(shown.friendship);
  if (cleared === null) {
    return { verdict: 'unknown' };
  }
  return { verdict: cleared ? 'yes' : 'no' };
}

async function confirmDestroyed(
  userId: string,
  body: string,
  username?: string,
): Promise<ConfirmVerdict> {
  const parsed = didFriendshipActionSucceed('destroy', body);
  await sleep(400);
  const live = await readRelationship(userId, username);
  if (live.verdict === 'rate') {
    return 'rate';
  }
  if (live.verdict === 'yes') {
    return 'yes';
  }
  if (live.verdict === 'no' && parsed === true) {
    await sleep(700);
    const again = await readRelationship(userId, username);
    if (again.verdict === 'rate') {
      return 'rate';
    }
    if (again.verdict === 'yes' || again.verdict === 'no') {
      return again.verdict;
    }
  }
  if (live.verdict === 'no') {
    return 'no';
  }
  return parsed === true ? 'yes' : 'no';
}

async function confirmRemoved(userId: string, body: string): Promise<ConfirmVerdict> {
  const parsed = didFriendshipActionSucceed('remove_follower', body);
  await sleep(400);
  const shown = await fetchFriendshipStatus(userId);
  if (isRateLimitResponse(shown.status)) {
    return 'rate';
  }
  if (shown.friendship?.followedBy === false) {
    return 'yes';
  }
  if (shown.friendship?.followedBy === true) {
    return 'no';
  }
  return parsed === true ? 'yes' : 'no';
}

async function postFriendshipAction(
  action: FriendshipAction,
  userId: string,
  username?: string,
): Promise<FriendshipMutationResult> {
  const posted = await postFriendshipUrl(
    `https://www.instagram.com/api/v1/friendships/${action}/${userId}/`,
    userId,
    username,
  );
  if (isRateLimitResponse(posted.status, posted.body)) {
    return { ok: false, status: posted.status, body: posted.body };
  }
  if (action === 'create') {
    const created = didFriendshipActionSucceed('create', posted.body);
    return { ok: posted.ok && created !== false, status: posted.status, body: posted.body };
  }

  const verdict = action === 'remove_follower'
    ? await confirmRemoved(userId, posted.body)
    : await confirmDestroyed(userId, posted.body, username);
  if (verdict === 'rate') {
    return { ok: false, status: 429, body: posted.body };
  }
  if (verdict === 'yes') {
    return { ok: true, status: posted.status, body: posted.body };
  }

  if (action === 'destroy') {
    const fallback = await postFriendshipUrl(
      `https://www.instagram.com/api/v1/web/friendships/${userId}/unfollow/`,
      userId,
      username,
    );
    if (isRateLimitResponse(fallback.status, fallback.body)) {
      return { ok: false, status: fallback.status, body: fallback.body };
    }
    if (fallback.status !== 404 && fallback.status !== 0) {
      const again = await confirmDestroyed(userId, fallback.body, username);
      if (again === 'rate') {
        return { ok: false, status: 429, body: fallback.body };
      }
      if (again === 'yes') {
        return { ok: true, status: fallback.status, body: fallback.body };
      }
      return { ok: false, status: fallback.status, body: fallback.body, ignored: true };
    }
  }

  return { ok: false, status: posted.status, body: posted.body, ignored: true };
}

async function resolveProfileId(
  userId: string,
  username?: string,
): Promise<{ id: string; status: number }> {
  if (!username) {
    return { id: userId, status: 200 };
  }
  const lookup = await lookupUserByUsername(username);
  if (isRateLimitResponse(lookup.status)) {
    return { id: userId, status: lookup.status };
  }
  return { id: lookup.id ?? userId, status: lookup.status };
}

export function followUser(userId: string, username?: string): Promise<FriendshipMutationResult> {
  return postFriendshipAction('create', userId, username);
}

export async function unfollowUser(userId: string, username?: string): Promise<FriendshipMutationResult> {
  const resolved = await resolveProfileId(userId, username);
  if (isRateLimitResponse(resolved.status)) {
    return { ok: false, status: resolved.status, body: '' };
  }
  return postFriendshipAction('destroy', resolved.id, username);
}

export async function removeFollower(userId: string, username?: string): Promise<FriendshipMutationResult> {
  const resolved = await resolveProfileId(userId, username);
  if (isRateLimitResponse(resolved.status)) {
    return { ok: false, status: resolved.status, body: '' };
  }
  return postFriendshipAction('remove_follower', resolved.id, username);
}

export function cancelFollowRequest(userId: string, username?: string): Promise<FriendshipMutationResult> {
  return postFriendshipAction('destroy', userId, username);
}
