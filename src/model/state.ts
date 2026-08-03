import { ScanningState } from './scanning-state';
import { UnfollowingState } from './unfollowing-state';

// Estado global de la aplicación que une los diferentes flujos
import { GrowthState } from './growth-state';

export type State =
  | { readonly status: 'initial' }
  | ScanningState
  | UnfollowingState
  | GrowthState;
