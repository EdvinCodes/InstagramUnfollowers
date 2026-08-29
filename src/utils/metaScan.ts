import { Typename, UserNode } from '../model/user';
import type { MetaExportUser } from './metaExportParser';
import { getDynamicStorageKey } from './utils';

export const META_SCAN_SNAPSHOT_KEY = 'ig_meta_scan_snapshot';

function emptyReel(username: string): UserNode['reel'] {
  return {
    id: username,
    expiring_at: 0,
    has_pride_media: false,
    latest_reel_media: 0,
    seen: null,
    owner: {
      __typename: Typename.GraphUser,
      id: username,
      profile_pic_url: '',
      username,
    },
  };
}

export function metaUserToNode(user: MetaExportUser, followsViewer: boolean): UserNode {
  return {
    id: user.username,
    username: user.username,
    full_name: user.fullName,
    profile_pic_url: '',
    is_private: false,
    is_verified: false,
    followed_by_viewer: true,
    follows_viewer: followsViewer,
    requested_by_viewer: false,
    has_anonymous_profile_picture: false,
    reel: emptyReel(user.username),
  };
}

export function buildMetaScanResults(
  following: readonly MetaExportUser[],
  followers: readonly MetaExportUser[],
): UserNode[] {
  const followerNames = new Set(followers.map(user => user.username));
  const byName = new Map<string, MetaExportUser>();
  for (const user of following) {
    byName.set(user.username, user);
  }
  return Array.from(byName.values()).map(user => metaUserToNode(user, followerNames.has(user.username)));
}

export function loadMetaSnapshotUsernames(): Set<string> | null {
  try {
    const raw = localStorage.getItem(getDynamicStorageKey(META_SCAN_SNAPSHOT_KEY));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { usernames?: unknown };
    if (!Array.isArray(parsed.usernames)) {
      return null;
    }
    return new Set(parsed.usernames.filter((item): item is string => typeof item === 'string'));
  } catch {
    return null;
  }
}

export function saveMetaSnapshot(results: readonly UserNode[]): void {
  const nonFollowers = results.filter(user => !user.follows_viewer).map(user => user.username);
  try {
    localStorage.setItem(
      getDynamicStorageKey(META_SCAN_SNAPSHOT_KEY),
      JSON.stringify({ timestamp: Date.now(), usernames: nonFollowers }),
    );
  } catch {
    // Ignore quota.
  }
}

export function markNewMetaUnfollowers(results: readonly UserNode[]): UserNode[] {
  const previous = loadMetaSnapshotUsernames();
  if (!previous) {
    return [...results];
  }
  return results.map(user => ({
    ...user,
    is_new_unfollower: !user.follows_viewer && !previous.has(user.username),
  }));
}

