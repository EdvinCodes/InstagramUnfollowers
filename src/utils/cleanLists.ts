import { UNFOLLOWERS_PER_PAGE } from '../constants/constants';
import type { CleanListTab } from '../model/clean-lists-state';
import type { MetaExportUser } from './metaExportParser';
import { assertUnreachable, getDynamicStorageKey } from './utils';

export const CLEAN_LISTS_STORAGE_KEY = 'ig_clean_lists';

export interface SavedCleanLists {
  readonly unfollowed: readonly MetaExportUser[];
  readonly blocked: readonly MetaExportUser[];
  readonly recentRequests: readonly MetaExportUser[];
  readonly savedAt: number;
}

export function usersForCleanTab(
  lists: SavedCleanLists | Pick<SavedCleanLists, 'unfollowed' | 'blocked' | 'recentRequests'>,
  tab: CleanListTab,
): readonly MetaExportUser[] {
  switch (tab) {
    case 'unfollowed':
      return lists.unfollowed;
    case 'blocked':
      return lists.blocked;
    case 'recent_requests':
      return lists.recentRequests;
    default:
      return assertUnreachable(tab);
  }
}

export function filterCleanUsers(
  users: readonly MetaExportUser[],
  searchTerm: string,
): MetaExportUser[] {
  const query = searchTerm.trim().toLowerCase();
  return [...users]
    .filter(user => {
      if (!query) {
        return true;
      }
      return (
        user.username.includes(query) ||
        user.fullName.toLowerCase().includes(query) ||
        (user.dateLabel ?? '').toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.username.localeCompare(b.username, undefined, { sensitivity: 'base' }));
}

export function paginateCleanUsers(
  users: readonly MetaExportUser[],
  page: number,
): { pageUsers: MetaExportUser[]; safePage: number; maxPage: number } {
  const maxPage = Math.max(1, Math.ceil(users.length / UNFOLLOWERS_PER_PAGE));
  const safePage = !Number.isFinite(page) || page < 1 ? 1 : Math.min(page, maxPage);
  const start = UNFOLLOWERS_PER_PAGE * (safePage - 1);
  return {
    pageUsers: users.slice(start, start + UNFOLLOWERS_PER_PAGE),
    safePage,
    maxPage,
  };
}

function isUser(value: unknown): value is MetaExportUser {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.username === 'string' && typeof record.fullName === 'string';
}

export function loadCleanLists(): SavedCleanLists | null {
  try {
    const raw = localStorage.getItem(getDynamicStorageKey(CLEAN_LISTS_STORAGE_KEY));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<SavedCleanLists>;
    if (
      !Array.isArray(parsed.unfollowed) ||
      !Array.isArray(parsed.blocked) ||
      !Array.isArray(parsed.recentRequests)
    ) {
      return null;
    }
    return {
      unfollowed: parsed.unfollowed.filter(isUser),
      blocked: parsed.blocked.filter(isUser),
      recentRequests: parsed.recentRequests.filter(isUser),
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveCleanLists(
  lists: Pick<SavedCleanLists, 'unfollowed' | 'blocked' | 'recentRequests'>,
): void {
  try {
    localStorage.setItem(
      getDynamicStorageKey(CLEAN_LISTS_STORAGE_KEY),
      JSON.stringify({
        unfollowed: lists.unfollowed,
        blocked: lists.blocked,
        recentRequests: lists.recentRequests,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Ignore quota.
  }
}
