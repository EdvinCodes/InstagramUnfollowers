/**
 * 3C — Real-Time Unfollower Alert
 * Runs silently inside the content script.
 * Periodically compares the current non-follower list with the stored
 * snapshot. When new unfollowers are detected it sends a message to
 * background.js which fires a Chrome notification.
 */
import { UserNode, User } from '../model/user';
import { urlGenerator, sleep, getCookie } from '../utils/utils';
import { loadPreviousSnapshotIds, saveScanSnapshot } from '../utils/history';

const MONITOR_ENABLED_KEY = 'ig-realtime-monitor-enabled';
const PREV_NF_SNAPSHOT_KEY = 'ig-prev-nonfollower-ids';
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 min
const STARTUP_DELAY_MS = 5 * 60 * 1000; // 5 min after page load

let _intervalId: ReturnType<typeof setInterval> | null = null;

// Persistence helpers

export function isMonitorEnabled(): boolean {
  try {
    return localStorage.getItem(MONITOR_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

// Silent scan

async function silentScan(): Promise<UserNode[]> {
  const userId = getCookie('ds_user_id');
  if (!userId) {
    return [];
  }

  const results: UserNode[] = [];
  let url = urlGenerator();
  let hasNext = true;
  let cycles = 0;

  try {
    while (hasNext && cycles < 60) {
      const response = await fetch(url);
      if (!response.ok) {
        break;
      }
      const json = (await response.json()) as { data: { user: { edge_follow: User } } };
      const data = json.data.user.edge_follow;
      hasNext = data.page_info.has_next_page;
      url = urlGenerator(data.page_info.end_cursor);
      data.edges.forEach(edge => results.push(edge.node));
      await sleep(1500 + Math.floor(Math.random() * 500));
      cycles++;
    }
  } catch {
    // Fail silently — don't disturb the user's browsing
  }
  return results;
}

// Core check

async function checkForNewUnfollowers(): Promise<void> {
  const baselineIds = loadPreviousSnapshotIds();
  if (!baselineIds || baselineIds.size === 0) {
    return;
  }

  const currentFollowing = await silentScan();
  if (currentFollowing.length === 0) {
    return;
  }

  let prevNfIds: Set<string>;
  try {
    const stored = localStorage.getItem(PREV_NF_SNAPSHOT_KEY);
    prevNfIds = stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    prevNfIds = new Set();
  }

  // Current non-followers = people you follow who DON'T follow you back
  const currentNf = currentFollowing.filter(u => !u.follows_viewer);

  // Brand-new unfollowers = in currentNf NOW but were NOT non-followers before
  const brandNew = currentNf.filter(u => !prevNfIds.has(u.id));

  // Save updated non-follower snapshot
  try {
    localStorage.setItem(PREV_NF_SNAPSHOT_KEY, JSON.stringify(currentNf.map(u => u.id)));
  } catch {
    // storage full — ignore
  }

  saveScanSnapshot(currentFollowing);

  if (brandNew.length === 0) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'REALTIME_UNFOLLOWERS',
      count: brandNew.length,
      usernames: brandNew.slice(0, 3).map(u => u.username),
    });
  }
}

// ─── Lifecycle — defined BEFORE setMonitorEnabled to avoid no-use-before-define

export function startRealtimeMonitor(): void {
  if (_intervalId) {
    return;
  }
  const timeoutId = setTimeout(() => {
    void checkForNewUnfollowers();
    _intervalId = setInterval(() => {
      void checkForNewUnfollowers();
    }, CHECK_INTERVAL_MS);
  }, STARTUP_DELAY_MS);

  // Cast so stopRealtimeMonitor can cancel it even before the first fire
  (_intervalId as unknown) = timeoutId;
}

export function stopRealtimeMonitor(): void {
  if (_intervalId) {
    clearInterval(_intervalId);
    clearTimeout(_intervalId as unknown as ReturnType<typeof setTimeout>);
    _intervalId = null;
  }
}

// ─── setMonitorEnabled — AFTER start/stop to satisfy no-use-before-define ────

export function setMonitorEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(MONITOR_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
  if (enabled) {
    startRealtimeMonitor();
  } else {
    stopRealtimeMonitor();
  }
}
