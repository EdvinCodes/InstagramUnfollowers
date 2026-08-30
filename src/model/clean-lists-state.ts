import type { MetaExportUser } from '../utils/metaExportParser';

export type CleanListTab = 'unfollowed' | 'blocked' | 'recent_requests';

export type CleanListsPhase = 'setup' | 'lists';

export interface CleanListsState {
  readonly status: 'clean_lists';
  readonly phase: CleanListsPhase;
  readonly searchTerm: string;
  readonly page: number;
  readonly currentTab: CleanListTab;
  readonly unfollowed: readonly MetaExportUser[];
  readonly blocked: readonly MetaExportUser[];
  readonly recentRequests: readonly MetaExportUser[];
}

export function createInitialCleanListsState(): CleanListsState {
  return {
    status: 'clean_lists',
    phase: 'setup',
    searchTerm: '',
    page: 1,
    currentTab: 'unfollowed',
    unfollowed: [],
    blocked: [],
    recentRequests: [],
  };
}

export function defaultCleanTab(lists: {
  readonly unfollowed: readonly MetaExportUser[];
  readonly blocked: readonly MetaExportUser[];
  readonly recentRequests: readonly MetaExportUser[];
}): CleanListTab {
  if (lists.unfollowed.length > 0) {
    return 'unfollowed';
  }
  if (lists.blocked.length > 0) {
    return 'blocked';
  }
  return 'recent_requests';
}
