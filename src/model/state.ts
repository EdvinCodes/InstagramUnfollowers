import { ScanningState } from './scanning-state';
import { UnfollowingState } from './unfollowing-state';

// Estado global de la aplicación que une los diferentes flujos
export type State = { readonly status: 'initial' } | ScanningState | UnfollowingState;
