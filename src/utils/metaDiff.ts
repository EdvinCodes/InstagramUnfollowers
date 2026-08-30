import { UNFOLLOWERS_PER_PAGE } from '../constants/constants';
import type { MetaExportUser } from './metaExportParser';
import type { MetaScanSnapshot } from './metaScan';

export type MetaDiffKind =
  | 'they_unfollowed'
  | 'you_unfollowed'
  | 'you_followed'
  | 'new_follower'
  | 'now_mutual';

export interface MetaDiffPerson {
  readonly username: string;
  readonly fullName: string;
  readonly kinds: readonly MetaDiffKind[];
}

export interface MetaCommunityDiff {
  readonly previousAt: number;
  readonly theyUnfollowed: readonly MetaExportUser[];
  readonly youUnfollowed: readonly MetaExportUser[];
  readonly youFollowed: readonly MetaExportUser[];
  readonly newFollowers: readonly MetaExportUser[];
  readonly nowMutual: readonly MetaExportUser[];
}

function namedUser(
  username: string,
  names: Readonly<Record<string, string>>,
  fallback?: MetaExportUser,
): MetaExportUser {
  return {
    username,
    fullName: fallback?.fullName || names[username] || username,
  };
}

export function buildCommunityDiff(
  previous: MetaScanSnapshot | null,
  following: readonly MetaExportUser[],
  followers: readonly MetaExportUser[],
): MetaCommunityDiff | null {
  if (!previous || (previous.following.length === 0 && previous.followers.length === 0)) {
    return null;
  }

  const prevFollowing = new Set(previous.following);
  const prevFollowers = new Set(previous.followers);
  const nextFollowing = new Map(following.map(user => [user.username, user]));
  const nextFollowers = new Map(followers.map(user => [user.username, user]));
  const names = previous.names;

  const theyUnfollowed = previous.followers
    .filter(username => !nextFollowers.has(username))
    .map(username => namedUser(username, names, nextFollowing.get(username)));
  const youUnfollowed = previous.following
    .filter(username => !nextFollowing.has(username))
    .map(username => namedUser(username, names));
  const youFollowed = following.filter(user => !prevFollowing.has(user.username));
  const newFollowers = followers.filter(user => !prevFollowers.has(user.username));
  const nowMutual = following.filter(
    user =>
      nextFollowers.has(user.username) &&
      prevFollowing.has(user.username) &&
      !prevFollowers.has(user.username),
  );

  return {
    previousAt: previous.timestamp,
    theyUnfollowed,
    youUnfollowed,
    youFollowed,
    newFollowers,
    nowMutual,
  };
}

export function communityDiffCount(diff: MetaCommunityDiff): number {
  return (
    diff.theyUnfollowed.length +
    diff.youUnfollowed.length +
    diff.youFollowed.length +
    diff.newFollowers.length +
    diff.nowMutual.length
  );
}

export function listDiffPeople(diff: MetaCommunityDiff, searchTerm = ''): MetaDiffPerson[] {
  const byName = new Map<string, { fullName: string; kinds: MetaDiffKind[] }>();
  const add = (kind: MetaDiffKind, users: readonly MetaExportUser[]) => {
    for (const user of users) {
      const current = byName.get(user.username);
      if (current) {
        if (!current.kinds.includes(kind)) {
          current.kinds.push(kind);
        }
        if (user.fullName && user.fullName !== user.username) {
          current.fullName = user.fullName;
        }
      } else {
        byName.set(user.username, { fullName: user.fullName || user.username, kinds: [kind] });
      }
    }
  };

  add('they_unfollowed', diff.theyUnfollowed);
  add('you_unfollowed', diff.youUnfollowed);
  add('you_followed', diff.youFollowed);
  add('new_follower', diff.newFollowers);
  add('now_mutual', diff.nowMutual);

  const query = searchTerm.trim().toLowerCase();
  return Array.from(byName.entries())
    .map(([username, value]) => ({ username, fullName: value.fullName, kinds: value.kinds }))
    .filter(person => {
      if (!query) {
        return true;
      }
      return person.username.includes(query) || person.fullName.toLowerCase().includes(query);
    })
    .sort((a, b) => a.username.localeCompare(b.username, undefined, { sensitivity: 'base' }));
}

export function paginateDiffPeople(
  people: readonly MetaDiffPerson[],
  page: number,
): { pagePeople: MetaDiffPerson[]; safePage: number; maxPage: number } {
  const maxPage = Math.max(1, Math.ceil(people.length / UNFOLLOWERS_PER_PAGE));
  const safePage = !Number.isFinite(page) || page < 1 ? 1 : Math.min(page, maxPage);
  const start = UNFOLLOWERS_PER_PAGE * (safePage - 1);
  return {
    pagePeople: people.slice(start, start + UNFOLLOWERS_PER_PAGE),
    safePage,
    maxPage,
  };
}

export function formatSnapshotDate(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleDateString();
  } catch {
    return '';
  }
}
