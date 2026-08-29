import { getCookie, isProfilePicAnonymous } from './utils';
import {
  GROWTH_MAX_COMMENT_PAGES,
  GROWTH_MAX_POSTS,
  GROWTH_POST_WINDOW_DAYS,
} from '../constants/growth';
import { postsWithinWindow } from './growthHelpers';

const IG_APP_ID = '936619743392459';

export interface IgUserBrief {
  id: string;
  username: string;
  isPrivate: boolean;
  isGhost: boolean;
  mediaCount: number;
}

export interface FriendshipStatus {
  following: boolean;
  outgoingRequest: boolean;
}

function getHeaders(): HeadersInit {
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
    };
  } catch {
    return null;
  }
}

export async function getFriendshipStatus(userId: string): Promise<FriendshipStatus | null> {
  const result = await fetchFriendshipStatus(userId);
  return result.friendship;
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

export async function followUser(userId: string): Promise<{ ok: boolean; status: number; body: string }> {
  const csrfToken = getCookie('csrftoken') ?? '';
  try {
    const res = await fetch(`https://www.instagram.com/api/v1/friendships/create/${userId}/`, {
      method: 'POST',
      headers: {
        'x-ig-app-id': IG_APP_ID,
        'x-csrftoken': csrfToken,
        'content-type': 'application/x-www-form-urlencoded',
        'x-requested-with': 'XMLHttpRequest',
        'referer': 'https://www.instagram.com/',
      },
      credentials: 'include',
      body: `user_id=${userId}`,
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: '' };
  }
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

export async function cancelFollowRequest(
  userId: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const csrfToken = getCookie('csrftoken') ?? '';
  try {
    const res = await fetch(`https://www.instagram.com/web/friendships/${userId}/unfollow/`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-csrftoken': csrfToken,
      },
      mode: 'cors',
      credentials: 'include',
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: '' };
  }
}
