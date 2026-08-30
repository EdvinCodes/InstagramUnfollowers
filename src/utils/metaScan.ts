import { Typename, UserNode } from '../model/user';
import type { MetaExportUser } from './metaExportParser';
import { getDynamicStorageKey } from './utils';

export const META_SCAN_SNAPSHOT_KEY = 'ig_meta_scan_snapshot';

export interface MetaScanSnapshot {
  readonly timestamp: number;
  readonly following: readonly string[];
  readonly followers: readonly string[];
  readonly usernames: readonly string[];
  readonly names: Readonly<Record<string, string>>;
}

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

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function nameMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const names: Record<string, string> = {};
  for (const [key, name] of Object.entries(value as Record<string, unknown>)) {
    if (typeof name === 'string' && name.trim()) {
      names[key] = name;
    }
  }
  return names;
}

export function loadMetaScanSnapshot(): MetaScanSnapshot | null {
  try {
    const raw = localStorage.getItem(getDynamicStorageKey(META_SCAN_SNAPSHOT_KEY));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {
      timestamp?: unknown;
      following?: unknown;
      followers?: unknown;
      usernames?: unknown;
      names?: unknown;
    };
    const usernames = stringList(parsed.usernames);
    const following = stringList(parsed.following);
    const followers = stringList(parsed.followers);
    if (usernames.length === 0 && following.length === 0 && followers.length === 0) {
      return null;
    }
    return {
      timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
      following,
      followers,
      usernames,
      names: nameMap(parsed.names),
    };
  } catch {
    return null;
  }
}

export function loadMetaSnapshotUsernames(): Set<string> | null {
  const snapshot = loadMetaScanSnapshot();
  if (!snapshot) {
    return null;
  }
  const followerSet = new Set(snapshot.followers);
  const names =
    snapshot.usernames.length > 0
      ? snapshot.usernames
      : snapshot.following.filter(username => !followerSet.has(username));
  return new Set(names);
}

export function saveMetaCommunitySnapshot(
  following: readonly MetaExportUser[],
  followers: readonly MetaExportUser[],
): void {
  const followerNames = new Set(followers.map(user => user.username));
  const names: Record<string, string> = {};
  for (const user of [...following, ...followers]) {
    names[user.username] = user.fullName;
  }
  try {
    localStorage.setItem(
      getDynamicStorageKey(META_SCAN_SNAPSHOT_KEY),
      JSON.stringify({
        timestamp: Date.now(),
        following: following.map(user => user.username),
        followers: followers.map(user => user.username),
        usernames: following.filter(user => !followerNames.has(user.username)).map(user => user.username),
        names,
      }),
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

