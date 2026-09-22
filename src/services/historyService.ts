import { HistoryEvent, HistoryEventType } from '../model/history';
import { UserNode } from '../model/user';
import { compactCancelledEvents, mergeCancelledIntoHistory, totalCancelled } from '../utils/historyEvents';
import { getCookie } from '../utils/utils';

const BASE_HISTORY_STORAGE_KEY = 'ig_unfollowers_history_v1';
const MAX_HISTORY_ITEMS = 1000;

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const getStorageKey = () => {
  const userId = getCookie('ds_user_id') || 'unknown_user';
  return `${BASE_HISTORY_STORAGE_KEY}_${userId}`;
};

function persist(events: HistoryEvent[]): void {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(events));
  } catch (e) {
    console.error('Error writing history', e);
  }
}

function capHistory(events: HistoryEvent[]): HistoryEvent[] {
  if (events.length <= MAX_HISTORY_ITEMS) {
    return events;
  }
  return events.slice(0, MAX_HISTORY_ITEMS);
}

function createHistoryEvent(type: HistoryEventType, user: UserNode): HistoryEvent {
  const minimalUser: Partial<UserNode> = {
    id: user.id,
    username: user.username,
    profile_pic_url: user.profile_pic_url,
    full_name: user.full_name,
  };
  return {
    id: generateId(),
    timestamp: Date.now(),
    type,
    user: minimalUser as UserNode,
    count: type === 'REQUEST_CANCELLED' ? 1 : undefined,
  };
}

export const HistoryService = {
  getHistory: (): HistoryEvent[] => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      const parsed = stored ? (JSON.parse(stored) as HistoryEvent[]) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }
      const compacted = capHistory(compactCancelledEvents(parsed));
      if (JSON.stringify(compacted) !== JSON.stringify(parsed)) {
        persist(compacted);
      }
      return compacted;
    } catch (e) {
      console.error('Error reading history', e);
      return [];
    }
  },

  addEvent: (type: HistoryEventType, user: UserNode) => {
    if (type === 'REQUEST_CANCELLED') {
      const history = HistoryService.getHistory();
      const newEvent = createHistoryEvent(type, user);
      persist(capHistory(mergeCancelledIntoHistory(history, newEvent)));
      return;
    }
    HistoryService.addEvents(type, [user]);
  },

  /**
   * Same event shape as addEvent, but one localStorage read and one write for the
   * whole batch. Bulk whitelist ("Protect selected") used to call addEvent per user,
   * which re-read and re-wrote the full history N times and could freeze the tab.
   * Newest user in `users` ends up first, matching a loop of addEvent.
   */
  addEvents: (type: HistoryEventType, users: readonly UserNode[]) => {
    if (users.length === 0 || type === 'REQUEST_CANCELLED') {
      return;
    }
    const history = HistoryService.getHistory();
    const newestFirst: HistoryEvent[] = [];
    for (let i = users.length - 1; i >= 0; i--) {
      newestFirst.push(createHistoryEvent(type, users[i]));
    }
    persist(capHistory([...newestFirst, ...history]));
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
      totalCancelled: totalCancelled(history),
      lastScanDate: history.find(h => h.type === 'DETECTED_UNFOLLOWER')?.timestamp ?? null,
    };
  },
};
