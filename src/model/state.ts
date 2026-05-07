import { ScanningState } from './scanning-state';
import { UnfollowingState } from './unfollowing-state';
import { GrowthState } from './growth-state';

export type State = { readonly status: 'initial' } | ScanningState | UnfollowingState | GrowthState;
