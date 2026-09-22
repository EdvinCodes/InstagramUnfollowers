import { UserNode } from '../model/user';
import { findUnclassifiedUserIds, mapRestUserToNode, restUserFollowsViewer, RestUser } from './igListsApi';

/** Same finish reasons useScanner reports. Kept here so the decisions can be tested without the hook. */
export type ScanFinishReason = 'completed' | 'partial' | 'rate_limit' | 'error' | 'no_session' | 'stopped' | 'blocked';

/** Last page wins for a repeated pk. Instagram reorders large following lists mid-pagination. */
export function absorbFollowingUsers(followingByPk: Map<string, RestUser>, users: readonly RestUser[]): void {
  for (const user of users) {
    followingByPk.set(user.pk, user);
  }
}

/**
 * The followers pass stopped before a clean end.
 * Zero resolved followers would mark every following account a non-follower, so that is blocked.
 * A partial index is still usable and must be flagged, not thrown away.
 */
export function followersPassFailure(resolvedFollowerCount: number): 'blocked' | 'partial' {
  return resolvedFollowerCount === 0 ? 'blocked' : 'partial';
}

/**
 * Only a finished cross-reference is safe to show.
 * `completed` and `partial` already ran the followers pass.
 * `rate_limit`, `error`, `stopped`, `no_session`, and `blocked` may have a
 * following list and an empty follower index — publishing that marks everyone
 * as a non-follower.
 */
export function shouldPublishScanResults(finishReason: ScanFinishReason, resultCount: number): boolean {
  const followersWereChecked = finishReason === 'completed' || finishReason === 'partial';
  return followersWereChecked && resultCount > 0;
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
  showManyRateLimited: boolean;
  followingCount: number;
}): boolean {
  if (!input.followingComplete || !input.followersComplete || input.showManyRateLimited) {
    return false;
  }
  if (input.followingCount === 0) {
    return false;
  }
  if (input.resolvedFollowers === 0 && input.knownFollowerTotal !== 0) {
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

/** Ids that still need the last-resort show_many sweep. A stale `followed_by: false` stays in this list. */
export function idsStillNeedingSweep(
  following: readonly RestUser[],
  followerIds: ReadonlySet<string>,
  followerNames: ReadonlySet<string>,
): readonly string[] {
  return findUnclassifiedUserIds(following, followerIds, followerNames);
}
