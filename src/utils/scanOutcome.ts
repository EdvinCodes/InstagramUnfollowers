import { UserNode } from '../model/user';
import type { IgFailure } from './igClient';
import { findUnclassifiedUserIds, mapRestUserToNode, restUserFollowsViewer, RestUser } from './igListsApi';

/** Same finish reasons useScanner reports. Kept here so the decisions can be tested without the hook. */
export type ScanFinishReason =
  | 'completed'
  | 'partial'
  | 'rate_limit'
  | 'error'
  | 'no_session'
  | 'stopped'
  | 'blocked'
  | 'account_changed'
  | 'cooldown';

/** What a scan managed to read, for the banners and the resume button. */
export interface ScanReport {
  readonly followersComplete: boolean;
  readonly followersLoaded: number;
  /** From the profile. -1 when unknown. */
  readonly followersTotal: number;
  readonly followingComplete: boolean;
  readonly followingChecked: number;
  readonly followingTotal: number;
  /** Followers kept in the resume checkpoint after this run (0 = nothing to resume). */
  readonly savedFollowers: number;
  readonly failure: IgFailure | null;
}

export const EMPTY_SCAN_REPORT: ScanReport = {
  followersComplete: false,
  followersLoaded: 0,
  followersTotal: -1,
  followingComplete: false,
  followingChecked: 0,
  followingTotal: -1,
  savedFollowers: 0,
  failure: null,
};

/** Last page wins for a repeated pk. Instagram reorders large following lists mid-pagination. */
export function absorbFollowingUsers(followingByPk: Map<string, RestUser>, users: readonly RestUser[]): void {
  for (const user of users) {
    followingByPk.set(user.pk, user);
  }
}

/**
 * Instagram ended the followers list cleanly, but far short of the profile's
 * follower count. Classifying against it would mark real followers as
 * non-followers, so it is treated as cut short.
 */
export function followersLookTruncated(loaded: number, knownTotal: number): boolean {
  return knownTotal > 0 && loaded < knownTotal * 0.7 && knownTotal - loaded > 25;
}

/**
 * Results are only safe once the whole followers list is in: every account is
 * then checked against it, so a stopped following pass still shows correct
 * (if incomplete) results. With a partial followers list a real follower
 * would show up as a non-follower and could be unfollowed by mistake.
 */
export function shouldPublishScanResults(
  finishReason: ScanFinishReason,
  resultCount: number,
  followersComplete: boolean,
): boolean {
  return followersComplete && resultCount > 0 && finishReason !== 'account_changed';
}

/**
 * The silent monitor may notify and replace its snapshot only when both lists
 * actually finished. A truncated or empty follower index would alert on mutuals
 * and then save that bad list.
 */
export function monitorMayCommitSnapshot(input: {
  followingComplete: boolean;
  followersComplete: boolean;
  resolvedFollowers: number;
  /** From the profile brief. 0 means the account really has no followers. -1 means unknown. */
  knownFollowerTotal: number;
  /** True when the bounded show_many sweep hit a 429 — leave the previous snapshot alone. */
  showManyRateLimited?: boolean;
  followingCount: number;
}): boolean {
  if (!input.followingComplete || !input.followersComplete) {
    return false;
  }
  if (input.showManyRateLimited) {
    return false;
  }
  if (input.followingCount === 0) {
    return false;
  }
  if (input.resolvedFollowers === 0 && input.knownFollowerTotal !== 0) {
    return false;
  }
  if (followersLookTruncated(input.resolvedFollowers, input.knownFollowerTotal)) {
    return false;
  }
  return true;
}

/** Cross-reference following against the followers index. `followed_by: false` is not a yes. */
export function classifyFollowing(
  following: Iterable<RestUser>,
  followerIds: ReadonlySet<string>,
  followerNames: ReadonlySet<string>,
): UserNode[] {
  return Array.from(following).map(user =>
    mapRestUserToNode(user, restUserFollowsViewer(user, followerIds, followerNames)),
  );
}

/** Ids that still need the bounded show_many sweep. A stale `followed_by: false` stays in this list. */
export function idsStillNeedingSweep(
  following: readonly RestUser[],
  followerIds: ReadonlySet<string>,
  followerNames: ReadonlySet<string>,
): readonly string[] {
  return findUnclassifiedUserIds(following, followerIds, followerNames);
}
