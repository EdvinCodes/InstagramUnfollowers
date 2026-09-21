import {
  getCurrentUserId,
  getHeaders,
  parseFriendshipStatus,
  type FriendshipStatus,
} from './growthApi';
import { searchOwnFollowing } from './igListsApi';
import { extractUserIdFromProfileHtml } from './igProfileLookup';
import { readCachedUserId, writeCachedUserId } from './pendingStorage';

export interface UserLookupResult {
  id: string | null;
  status: number;
  friendship: FriendshipStatus | null;
}

function friendshipFromFollowingMatch(
  outgoingRequest: boolean | null,
): FriendshipStatus | null {
  if (outgoingRequest === true) {
    return { following: false, outgoingRequest: true };
  }
  if (outgoingRequest === false) {
    return { following: true, outgoingRequest: false };
  }
  return null;
}

async function lookupViaOwnFollowing(username: string): Promise<UserLookupResult | null> {
  const selfId = getCurrentUserId();
  if (!selfId) {
    return null;
  }
  const page = await searchOwnFollowing(selfId, username);
  if (page.status === 429) {
    return { id: null, status: 429, friendship: null };
  }
  if (page.status !== 200) {
    return null;
  }
  const match = page.users.find(user => user.username.toLowerCase() === username.toLowerCase());
  if (!match) {
    return { id: null, status: 200, friendship: null };
  }
  return {
    id: match.pk,
    status: 200,
    friendship: friendshipFromFollowingMatch(match.outgoingRequest),
  };
}

async function lookupViaUsernameInfo(username: string): Promise<UserLookupResult | null> {
  const res = await fetch(
    `https://www.instagram.com/api/v1/users/${encodeURIComponent(username)}/usernameinfo/`,
    { headers: getHeaders(), credentials: 'include' },
  );
  if (res.status === 429) {
    return { id: null, status: 429, friendship: null };
  }
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as {
    user?: { pk?: string | number; pk_id?: string | number; friendship_status?: unknown };
  };
  const id = json.user?.pk ?? json.user?.pk_id;
  if (id === undefined) {
    return { id: null, status: res.status, friendship: null };
  }
  return {
    id: String(id),
    status: res.status,
    friendship: parseFriendshipStatus(json.user ?? null),
  };
}

async function lookupViaProfilePage(username: string): Promise<UserLookupResult | null> {
  const res = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
    credentials: 'include',
    headers: {
      accept: 'text/html',
      referer: 'https://www.instagram.com/',
    },
  });
  if (res.status === 429) {
    return { id: null, status: 429, friendship: null };
  }
  if (!res.ok) {
    return null;
  }
  const html = await res.text();
  const id = extractUserIdFromProfileHtml(html, username);
  if (!id) {
    return null;
  }
  return { id, status: 200, friendship: null };
}

async function lookupViaWebProfileInfo(username: string): Promise<UserLookupResult> {
  const res = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    { headers: getHeaders(), credentials: 'include' },
  );
  if (!res.ok) {
    return { id: null, status: res.status, friendship: null };
  }
  const json = (await res.json()) as {
    data?: { user?: { id?: string; friendship_status?: unknown } };
  };
  const user = json.data?.user;
  return {
    id: user?.id ?? null,
    status: res.status,
    friendship: parseFriendshipStatus(user ?? null),
  };
}

/**
 * Resolve a username to an Instagram user id without leaning on web_profile_info,
 * which Instagram 429s almost immediately in a cancel queue of thousands.
 *
 * Order matches what actually works in the browser:
 *  1. cached id from a previous successful cancel/scan
 *  2. search in your own following list (same REST the live scan uses)
 *  3. usernameinfo
 *  4. the public profile HTML (same document as opening the account)
 *  5. web_profile_info as last resort
 */
export async function lookupUserByUsername(username: string): Promise<UserLookupResult> {
  const handle = username.trim().replace(/^@/, '');
  if (!handle) {
    return { id: null, status: 0, friendship: null };
  }

  const cached = readCachedUserId(handle);
  if (cached) {
    return { id: cached, status: 200, friendship: null };
  }

  const attempts = [
    lookupViaOwnFollowing,
    lookupViaUsernameInfo,
    lookupViaProfilePage,
    lookupViaWebProfileInfo,
  ];

  let lastRateLimit: UserLookupResult | null = null;

  for (const attempt of attempts) {
    try {
      const result = await attempt(handle);
      if (!result) {
        continue;
      }
      if (result.status === 429) {
        lastRateLimit = result;
        continue;
      }
      if (result.id) {
        writeCachedUserId(handle, result.id);
        return result;
      }
    } catch {
      // Try the next strategy.
    }
  }

  return lastRateLimit ?? { id: null, status: 0, friendship: null };
}
