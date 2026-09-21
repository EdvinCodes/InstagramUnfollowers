/**
 * 3C — Real-Time Unfollower Alert
 * Runs silently inside the content script.
 * Periodically compares the current non-follower list with the stored
 * snapshot. When new unfollowers are detected it sends a message to
 * background.js which fires a Chrome notification.
 */
import { UserNode } from '../model/user';
import { sleep, getCookie, getDynamicStorageKey } from '../utils/utils';
import { fetchFollowersPage, fetchFollowingPage, fetchFollowedByMany, findUnclassifiedUserIds, mapRestUserToNode, addRestUserToFollowerIndex, restUserFollowsViewer, RestUser } from '../utils/igListsApi';

const MONITOR_ENABLED_KEY = 'ig-realtime-monitor-enabled';
const PREV_NF_SNAPSHOT_KEY = 'ig-prev-nonfollower-ids';
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 min
const STARTUP_DELAY_MS = 5 * 60 * 1000; // 5 min after page load

let _intervalId: ReturnType<typeof setInterval> | null = null;

// Persistence helpers

export function isMonitorEnabled(): boolean {
  try {
    return localStorage.getItem(getDynamicStorageKey(MONITOR_ENABLED_KEY)) === 'true';
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

  // Keyed by pk so a following account that shifts position between pages never
  // shows up twice in the silent-scan snapshot (same fix as useScanner.ts).
  const followingByPk = new Map<string, RestUser>();
  const followerIds = new Set<string>();
  const followerNames = new Set<string>();

  try {
    // Followers list first — needed to know who follows back BEFORE we classify
    // the following list (same ordering fix as the main scanner, see useScanner.ts).
    let followersMaxId: string | null = null;
    let followersRankToken: string | null = null;
    let followerCycles = 0;
    while (followerCycles < 60) {
      const page = await fetchFollowersPage(userId, followersMaxId, followersRankToken);
      if (page.status !== 200) {
        break;
      }
      page.users.forEach(user => addRestUserToFollowerIndex(user, followerIds, followerNames));
      followersRankToken = page.rankToken ?? followersRankToken;
      if (!page.nextMaxId) {
        break;
      }
      followersMaxId = page.nextMaxId;
      followerCycles++;
      await sleep(1500 + Math.floor(Math.random() * 500));
    }

    // Following list — same private REST endpoint the Instagram web app uses.
    // (The old GraphQL query_hash this used to call stopped returning edges in 2026.)
    let maxId: string | null = null;
    let followingRankToken: string | null = null;
    let cycles = 0;
    while (cycles < 60) {
      const page = await fetchFollowingPage(userId, maxId, followingRankToken);
      if (page.status !== 200) {
        break;
      }
      for (const user of page.users) {
        followingByPk.set(user.pk, user);
      }
      followingRankToken = page.rankToken ?? followingRankToken;
      if (!page.nextMaxId) {
        break;
      }
      maxId = page.nextMaxId;
      cycles++;
      await sleep(1500 + Math.floor(Math.random() * 500));
    }

    // Safety net: whatever the followers pass couldn't resolve (friendship_status
    // omitted + id/username mismatch) gets a bulk show_many check, so we don't fire
    // a false "new unfollower" notification for someone who actually follows back.
    if (followingByPk.size > 0) {
      const unclassifiedIds = findUnclassifiedUserIds(
        Array.from(followingByPk.values()),
        followerIds,
        followerNames,
      );
      if (unclassifiedIds.length > 0) {
        const many = await fetchFollowedByMany(unclassifiedIds);
        many.followedByIds.forEach(id => followerIds.add(id));
      }
    }
  } catch {
    // Fail silently — don't disturb the user's browsing
  }

  return Array.from(followingByPk.values()).map(user =>
    mapRestUserToNode(user, restUserFollowsViewer(user, followerIds, followerNames)),
  );
}

// Core check

function readPrevNonFollowerIds(): Set<string> {
  try {
    const stored = localStorage.getItem(getDynamicStorageKey(PREV_NF_SNAPSHOT_KEY));
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writePrevNonFollowerIds(ids: readonly string[]): void {
  try {
    localStorage.setItem(getDynamicStorageKey(PREV_NF_SNAPSHOT_KEY), JSON.stringify(ids));
  } catch {
    // storage full — ignore
  }
}

async function checkForNewUnfollowers(): Promise<void> {
  const currentFollowing = await silentScan();
  if (currentFollowing.length === 0) {
    return;
  }

  const prevNfIds = readPrevNonFollowerIds();
  const currentNf = currentFollowing.filter(u => !u.follows_viewer);
  const currentIds = currentNf.map(u => u.id);

  if (prevNfIds.size === 0) {
    writePrevNonFollowerIds(currentIds);
    return;
  }

  const brandNew = currentNf.filter(u => !prevNfIds.has(u.id));
  writePrevNonFollowerIds(currentIds);

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
    localStorage.setItem(getDynamicStorageKey(MONITOR_ENABLED_KEY), String(enabled));
  } catch {
    // ignore
  }
  if (enabled) {
    startRealtimeMonitor();
  } else {
    stopRealtimeMonitor();
  }
}
