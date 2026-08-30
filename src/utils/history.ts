import { HISTORY_RESULTS_STORAGE_KEY } from '../constants/constants';
import { UserNode } from '../model/user';
import { getDynamicStorageKey, viewerFollowsBack } from './utils';

const SNAPSHOT_VERSION = 2;

interface HistorySnapshot {
  version?: number;
  timestamp: number;
  ids: string[];
}

/**
 * Guarda solo IDs de no-followers para comparar "quién dejó de seguirte".
 * v2: un snapshot viejo (todos los following) se ignora para no marcar falsos NEW.
 */
export function saveScanSnapshot(results: readonly UserNode[]): void {
  const snapshot: HistorySnapshot = {
    version: SNAPSHOT_VERSION,
    timestamp: Date.now(),
    ids: results.filter(user => !viewerFollowsBack(user)).map(user => user.id),
  };

  try {
    localStorage.setItem(
      getDynamicStorageKey(HISTORY_RESULTS_STORAGE_KEY),
      JSON.stringify(snapshot),
    );
  } catch (e) {
    console.error('Storage full!', e);
  }
}

export function loadPreviousSnapshotIds(): Set<string> | null {
  const stored = localStorage.getItem(getDynamicStorageKey(HISTORY_RESULTS_STORAGE_KEY));
  if (!stored) {
    return null;
  }
  try {
    const snapshot: HistorySnapshot = JSON.parse(stored);
    if (snapshot.version !== SNAPSHOT_VERSION || !Array.isArray(snapshot.ids)) {
      return null;
    }
    return new Set(snapshot.ids);
  } catch (e) {
    console.error('Error loading history snapshot', e);
    return null;
  }
}

export function identifyNewUnfollowers(currentResults: readonly UserNode[]): UserNode[] {
  const previousIds = loadPreviousSnapshotIds();

  if (!previousIds) {
    return currentResults.map(user => ({ ...user, is_new_unfollower: false }));
  }

  return currentResults.map(user => ({
    ...user,
    is_new_unfollower: !viewerFollowsBack(user) && !previousIds.has(user.id),
  }));
}
