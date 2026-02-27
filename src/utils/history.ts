import { HISTORY_RESULTS_STORAGE_KEY } from '../constants/constants';
import { UserNode } from '../model/user';
import { getDynamicStorageKey } from './utils';

interface HistorySnapshot {
  timestamp: number;
  ids: string[];
}

/**
 * Guarda los resultados actuales en localStorage para compararlos en el futuro.
 * Solo guardamos los IDs para no llenar la memoria.
 */
export function saveScanSnapshot(results: readonly UserNode[]): void {
  const snapshot: HistorySnapshot = {
    timestamp: Date.now(),
    ids: results.map(u => u.id),
  };
  localStorage.setItem(getDynamicStorageKey(HISTORY_RESULTS_STORAGE_KEY), JSON.stringify(snapshot));
}

/**
 * Carga el snapshot anterior y devuelve un Set de IDs para búsqueda rápida.
 */
export function loadPreviousSnapshotIds(): Set<string> | null {
  const stored = localStorage.getItem(getDynamicStorageKey(HISTORY_RESULTS_STORAGE_KEY));
  if (!stored) {
    return null;
  }
  try {
    const snapshot: HistorySnapshot = JSON.parse(stored);
    return new Set(snapshot.ids);
  } catch (e) {
    console.error('Error loading history snapshot', e);
    return null;
  }
}

/**
 * Compara los resultados actuales con el historial.
 * Devuelve la lista de usuarios con la propiedad 'is_new_unfollower' marcada.
 */
export function identifyNewUnfollowers(currentResults: readonly UserNode[]): UserNode[] {
  // <--- CAMBIO AQUÍ: Quita el 'readonly' de esta línea
  const previousIds = loadPreviousSnapshotIds();

  if (!previousIds) {
    return [...currentResults];
  }

  return currentResults.map(user => {
    const isNew = !previousIds.has(user.id);
    return {
      ...user,
      is_new_unfollower: isNew,
    };
  });
}
