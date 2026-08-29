import type { ImportedPendingList, PendingRequestUser } from '../model/pending-request';
import { getDynamicStorageKey } from './utils';
import { normalizePendingUsername } from './pendingRequestsParser';

export const PENDING_CANCELLED_STORAGE_KEY = 'ig_pending_cancelled';
export const PENDING_IMPORTED_STORAGE_KEY = 'ig_pending_imported';

export function readCancelledUsernames(storage: Storage = localStorage): Set<string> {
  try {
    const raw = storage.getItem(getDynamicStorageKey(PENDING_CANCELLED_STORAGE_KEY));
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(
      parsed.filter((item): item is string => typeof item === 'string').map(normalizePendingUsername),
    );
  } catch {
    return new Set();
  }
}

export function addCancelledUsernames(
  usernames: readonly string[],
  storage: Storage = localStorage,
): Set<string> {
  const next = readCancelledUsernames(storage);
  for (const username of usernames) {
    next.add(normalizePendingUsername(username));
  }
  try {
    storage.setItem(
      getDynamicStorageKey(PENDING_CANCELLED_STORAGE_KEY),
      JSON.stringify(Array.from(next)),
    );
  } catch {
    // Quota or private mode — keep working from memory this session.
  }
  return next;
}

export function clearCancelledUsernames(storage: Storage = localStorage): void {
  try {
    storage.removeItem(getDynamicStorageKey(PENDING_CANCELLED_STORAGE_KEY));
  } catch {
    // Ignore.
  }
}

export function readImportedPendingList(storage: Storage = localStorage): ImportedPendingList | null {
  try {
    const raw = storage.getItem(getDynamicStorageKey(PENDING_IMPORTED_STORAGE_KEY));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ImportedPendingList;
    if (!Array.isArray(parsed.users)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveImportedPendingList(
  users: readonly PendingRequestUser[],
  sourceName: string,
  storage: Storage = localStorage,
): ImportedPendingList {
  const payload: ImportedPendingList = {
    users,
    sourceName,
    importedAt: Date.now(),
  };
  try {
    storage.setItem(getDynamicStorageKey(PENDING_IMPORTED_STORAGE_KEY), JSON.stringify(payload));
  } catch {
    // Ignore persistence failures.
  }
  return payload;
}
