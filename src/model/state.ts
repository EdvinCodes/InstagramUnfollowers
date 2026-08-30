import { ScanningState } from './scanning-state';
import { UnfollowingState } from './unfollowing-state';

// Estado global de la aplicación que une los diferentes flujos
import { CleanListsState } from './clean-lists-state';
import { GrowthState } from './growth-state';
import { PendingRequestsState } from './pending-requests-state';

export type State =
  | { readonly status: 'initial' }
  | { readonly status: 'meta_import' }
  | ScanningState
  | UnfollowingState
  | GrowthState
  | PendingRequestsState
  | CleanListsState;
