/**
 * 3C — Real-Time Unfollower Alert
 * Runs silently inside the content script.
 * Periodically compares the current non-follower list with the stored
 * snapshot. When new unfollowers are detected it sends a message to
 * background.js which fires a Chrome notification.
 *
 * Never runs while the user has a scan or unfollow queue open
 * (foregroundWork), and never while a block cooldown is active — those
 * share Instagram's rate budget.
 */
import { UserNode } from '../model/user';
import {
  DEFAULT_USERS_PER_SEARCH_CYCLE,
  FOLLOWERS_PAGE_SAFETY_LIMIT,
  FOLLOWING_PAGE_SAFETY_LIMIT,
} from '../constants/constants';
import { sleep, getCookie, getDynamicStorageKey, loadTimings } from '../utils/utils';
import { getUserBrief } from '../utils/growthApi';
import { followersLookTruncated, monitorMayCommitSnapshot } from '../utils/scanOutcome';
import {
  fetchFollowersPage,
  fetchFollowingPage,
  fetchFollowedByMany,
  findUnclassifiedUserIds,
  mapRestUserToNode,
  addRestUserToFollowerIndex,
  restUserFollowsViewer,
  isSuspiciousEmptyFirstPage,
  RestUser,
} from '../utils/igListsApi';
import { isForegroundWorkActive } from '../utils/foregroundWork';
import { cooldownSecondsLeft } from '../utils/cooldown';

const MONITOR_ENABLED_KEY = 'ig-realtime-monitor-enabled';
const PREV_NF_SNAPSHOT_KEY = 'ig-prev-nonfollower-ids';
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 min
const STARTUP_DELAY_MS = 5 * 60 * 1000; // 5 min after page load

let _intervalId: ReturnType<typeof setInterval> | null = null;
let scanInFlight = false;

export function isMonitorEnabled(): boolean {
  try {
    return localStorage.getItem(getDynamicStorageKey(MONITOR_ENABLED_KEY)) === 'true';
  } catch {
    return false;
  }
}

async function silentScan(): Promise<UserNode[]> {
  const userId = getCookie('ds_user_id');
  if (!userId) {
    return [];
  }
  if (isForegroundWorkActive() || cooldownSecondsLeft() > 0) {
    return [];
  }

  const followingByPk = new Map<string, RestUser>();
  const followerIds = new Set<string>();
  const followerNames = new Set<string>();
  const pageSize = loadTimings()?.usersPerSearchCycle ?? DEFAULT_USERS_PER_SEARCH_CYCLE;

  try {
    const brief = await getUserBrief(userId);
    const totalFollowing = brief?.followingCount ?? -1;
    const totalFollowers = brief?.followerCount ?? -1;

    let followingComplete = false;
    let followersComplete = false;
    let showManyRateLimited = false;

    let maxId: string | null = null;
    let page = 0;
    while (page < FOLLOWING_PAGE_SAFETY_LIMIT) {
      if (isForegroundWorkActive()) {
        return [];
      }
      const result = await fetchFollowingPage(userId, maxId, pageSize);
      if (result.failure || result.status !== 200) {
        break;
      }
      if (page === 0 && isSuspiciousEmptyFirstPage(result.users, totalFollowing)) {
        break;
      }
      for (const user of result.users) {
        followingByPk.set(user.pk, user);
      }
      if (!result.nextMaxId || result.nextMaxId === maxId) {
        followingComplete = true;
        break;
      }
      maxId = result.nextMaxId;
      page++;
      await sleep(1500 + Math.floor(Math.random() * 500));
    }

    let followersMaxId: string | null = null;
    let followerPage = 0;
    while (followingComplete && followerPage < FOLLOWERS_PAGE_SAFETY_LIMIT) {
      if (isForegroundWorkActive()) {
        return [];
      }
      const result = await fetchFollowersPage(userId, followersMaxId, pageSize);
      if (result.failure || result.status !== 200) {
        break;
      }
      if (followerPage === 0 && isSuspiciousEmptyFirstPage(result.users, totalFollowers)) {
        break;
      }
      result.users.forEach(user => addRestUserToFollowerIndex(user, followerIds, followerNames));
      if (!result.nextMaxId || result.nextMaxId === followersMaxId) {
        followersComplete = true;
        break;
      }
      followersMaxId = result.nextMaxId;
      followerPage++;
      await sleep(1500 + Math.floor(Math.random() * 500));
    }

    if (followersComplete && followersLookTruncated(followerNames.size, totalFollowers)) {
      followersComplete = false;
    }

    const canSweep =
      followingComplete && followersComplete && followingByPk.size > 0 && (followerIds.size > 0 || totalFollowers === 0);
    if (canSweep) {
      const unclassifiedIds = findUnclassifiedUserIds(
        Array.from(followingByPk.values()),
        followerIds,
        followerNames,
      );
      if (unclassifiedIds.length > 0) {
        const many = await fetchFollowedByMany(unclassifiedIds);
        if (many.failure === 'rate_limited') {
          showManyRateLimited = true;
        } else {
          many.followedByIds.forEach(id => followerIds.add(id));
        }
      }
    }

    if (
      !monitorMayCommitSnapshot({
        followingComplete,
        followersComplete,
        resolvedFollowers: followerIds.size,
        knownFollowerTotal: totalFollowers,
        showManyRateLimited,
        followingCount: followingByPk.size,
      })
    ) {
      return [];
    }

    return Array.from(followingByPk.values()).map(user =>
      mapRestUserToNode(user, restUserFollowsViewer(user, followerIds, followerNames)),
    );
  } catch {
    return [];
  }
}

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
  if (scanInFlight) {
    return;
  }
  scanInFlight = true;
  try {
    await runUnfollowerCheck();
  } finally {
    scanInFlight = false;
  }
}

async function runUnfollowerCheck(): Promise<void> {
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

  (_intervalId as unknown) = timeoutId;
}

export function stopRealtimeMonitor(): void {
  if (_intervalId) {
    clearInterval(_intervalId);
    clearTimeout(_intervalId as unknown as ReturnType<typeof setTimeout>);
    _intervalId = null;
  }
}

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
