import { HistoryEvent, HistoryEventType } from '../model/history';
import { UserNode } from '../model/user';

const HISTORY_STORAGE_KEY = 'ig_unfollowers_history_v1';
const MAX_HISTORY_ITEMS = 1000; // Límite para no petar la memoria del navegador

// Helper para generar IDs únicos simples
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const HistoryService = {
  /**
   * Obtiene todo el historial ordenado (más reciente primero)
   */
  getHistory: (): HistoryEvent[] => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading history', e);
      return [];
    }
  },

  /**
   * Guarda un nuevo evento en el historial
   */
  addEvent: (type: HistoryEventType, user: UserNode) => {
    const history = HistoryService.getHistory();

    const newEvent: HistoryEvent = {
      id: generateId(),
      timestamp: Date.now(),
      type,
      user,
    };

    // Añadimos al principio del array
    const updatedHistory = [newEvent, ...history];

    // Mantenemos el límite de tamaño (limpieza automática)
    if (updatedHistory.length > MAX_HISTORY_ITEMS) {
      updatedHistory.length = MAX_HISTORY_ITEMS;
    }

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
  },

  /**
   * Borra todo el historial (botón de pánico o limpieza)
   */
  clearHistory: () => {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  },

  /**
   * Obtiene estadísticas básicas
   */
  getStats: () => {
    const history = HistoryService.getHistory();
    return {
      totalUnfollowedByYou: history.filter(h => h.type === 'YOU_UNFOLLOWED').length,
      totalTraitorsDetected: history.filter(h => h.type === 'DETECTED_UNFOLLOWER').length,
      lastScanDate: history.find(h => h.type === 'DETECTED_UNFOLLOWER')?.timestamp || null,
    };
  },
};
