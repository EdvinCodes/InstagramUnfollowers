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

/** A blocked scan must not publish a list we already know is misleading. */
export function shouldPublishScanResults(finishReason: ScanFinishReason, resultCount: number): boolean {
  return finishReason !== 'blocked' && resultCount > 0;
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
