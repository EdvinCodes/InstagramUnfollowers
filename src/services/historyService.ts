import { HistoryEvent, HistoryEventType } from '../model/history';
import { UserNode } from '../model/user';
import { getCookie } from '../utils/utils'; // <-- Importamos getCookie

const BASE_HISTORY_STORAGE_KEY = 'ig_unfollowers_history_v1';
const MAX_HISTORY_ITEMS = 1000;

// Generador de ID único
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// <-- FIX MULTI-CUENTA: Creamos una key dinámica basada en el usuario logueado
const getStorageKey = () => {
  const userId = getCookie('ds_user_id') || 'unknown_user';
  return `${BASE_HISTORY_STORAGE_KEY}_${userId}`;
};

export const HistoryService = {
  getHistory: (): HistoryEvent[] => {
    try {
      // Usamos la key dinámica
      const stored = localStorage.getItem(getStorageKey());
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading history', e);
      return [];
    }
  },

  addEvent: (type: HistoryEventType, user: UserNode) => {
    const history = HistoryService.getHistory();

    // <-- FIX MEMORIA: Limpiamos la basura de IG y guardamos solo lo vital
    const minimalUser: Partial<UserNode> = {
      id: user.id,
      username: user.username,
      profile_pic_url: user.profile_pic_url,
      full_name: user.full_name,
    };

    const newEvent: HistoryEvent = {
      id: generateId(),
      timestamp: Date.now(),
      type,
      user: minimalUser as UserNode, // Casteamos para mantener tipado
    };

    const updatedHistory = [newEvent, ...history];

    if (updatedHistory.length > MAX_HISTORY_ITEMS) {
      updatedHistory.length = MAX_HISTORY_ITEMS;
    }

    // Usamos la key dinámica
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Error writing history', e);
    }
  },

  clearHistory: () => {
    localStorage.removeItem(getStorageKey());
  },

  getStats() {
    const history = HistoryService.getHistory();
    return {
      totalUnfollowedByYou: history.filter(h => h.type === 'YOU_UNFOLLOWED').length,
      totalTraitorsDetected: history.filter(h => h.type === 'DETECTED_UNFOLLOWER').length,
      totalWhitelisted: history.filter(h => h.type === 'WHITELISTED').length,
      lastScanDate: history.find(h => h.type === 'DETECTED_UNFOLLOWER')?.timestamp ?? null,
    };
  },
};
