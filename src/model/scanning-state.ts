import { UserNode } from './user';
import { ScanningTab } from './scanning-tab';
import { ScanningFilter } from './scanning-filter';
import type { MetaCommunityDiff } from '../utils/metaDiff';

export interface ScanningState {
  readonly status: 'scanning';
  readonly source: 'live' | 'meta';
  readonly page: number;
  readonly currentTab: ScanningTab;
  readonly searchTerm: string;
  readonly percentage: number;
  readonly results: readonly UserNode[];
  readonly whitelistedResults: readonly UserNode[];
  readonly selectedResults: readonly UserNode[];
  readonly filter: ScanningFilter;
  readonly metaDiff?: MetaCommunityDiff | null;
}
