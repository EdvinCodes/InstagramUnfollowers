import { UserNode } from './user';
import { UnfollowLogEntry } from './unfollow-log-entry';
import { UnfollowFilter } from './unfollow-filter';

export interface UnfollowingState {
  readonly status: 'unfollowing';
  readonly searchTerm: string;
  readonly percentage: number;
  readonly selectedResults: readonly UserNode[];
  readonly unfollowLog: readonly UnfollowLogEntry[];
  readonly filter: UnfollowFilter;
}
