import { useRef, useCallback } from 'preact/hooks';
import type { GrowthSpeed, GrowthState } from '../model/growth-state';
import type { State } from '../model/state';
import { UserNode } from '../model/user';
import {
  GROWTH_ACCOUNT_DELAY_MS,
  GROWTH_FOLLOWS_BEFORE_COOLDOWN,
  GROWTH_RATE_LIMIT_BACKOFF_MS,
  GROWTH_SCRAPE_DELAY_MS,
} from '../constants/growth';
import {
  canFollowToday,
  computeFollowDelayMs,
  getGrowthSkipReason,
  incrementDailyFollowCount,
  isRateLimitResponse,
  mergeUniqueIds,
  remainingDailyFollows,
} from '../utils/growthHelpers';
import {
  followUser,
  getCommenterIds,
  getCurrentUserId,
  getFriendshipStatus,
  getRecentPostIds,
  getUserBrief,
  getUserIdByUsername,
} from '../utils/growthApi';
import { getDynamicStorageKey, sleep } from '../utils/utils';
import { WHITELISTED_RESULTS_STORAGE_KEY } from '../constants/constants';
import { HistoryService } from '../services/historyService';
import { t } from '../i18n/i18n';

type SetStateUpdater = (state: State | ((prev: State) => State)) => void;

function formatLog(msg: string): string {
  return `[${new Date().toLocaleTimeString()}] ${msg}`;
}

function loadWhitelistIds(): Set<string> {
  try {
    const key = getDynamicStorageKey(WHITELISTED_RESULTS_STORAGE_KEY);
    const raw = localStorage.getItem(key);
    if (!raw) {
      return new Set();
    }
    const users = JSON.parse(raw) as UserNode[];
    return new Set(users.map(u => u.id));
  } catch {
    return new Set();
  }
}

export function useGrowth(setState: SetStateUpdater, getState: () => State) {
  const stopSignal = useRef({ stopped: false });

  const addLog = useCallback(
    (msg: string) => {
      setState(prev => {
        if (prev.status !== 'growth') {
          return prev;
        }
        const g = prev;
        return {
          ...g,
          logs: [...g.logs.slice(-199), formatLog(msg)],
        };
      });
    },
    [setState],
  );

  const patchGrowth = useCallback(
    (patch: Partial<GrowthState>) => {
      setState(prev => {
        if (prev.status !== 'growth') {
          return prev;
        }
        return { ...prev, ...patch };
      });
    },
    [setState],
  );

  const startGrowth = useCallback(
    async (targets: string[], speed: GrowthSpeed) => {
      stopSignal.current.stopped = false;
      const selfUserId = getCurrentUserId();
      const seenCommenters = new Set<string>();
      const whitelistIds = loadWhitelistIds();

      patchGrowth({
        phase: 'scraping',
        isRunning: true,
        isPaused: false,
        logs: [formatLog(t('growthLogStarting'))],
        followedCount: 0,
        skippedCount: 0,
        totalToFollow: 0,
        commenterQueue: [],
        targetAccounts: [],
        speed,
      });

      for (const username of targets) {
        if (stopSignal.current.stopped) {
          break;
        }

        addLog(t('growthLogLookup')(username));
        const userId = await getUserIdByUsername(username);

        if (!userId) {
          addLog(t('growthLogUserNotFound')(username));
          continue;
        }

        addLog(t('growthLogUserFound')(username, userId));
        addLog(t('growthLogFetchingPosts')(username));

        const postIds = await getRecentPostIds(userId);
        if (postIds.length === 0) {
          addLog(t('growthLogNoPosts')(username));
          continue;
        }

        addLog(t('growthLogPostsFound')(postIds.length, username));
        let commentersFromAccount = 0;

        for (const mediaId of postIds) {
          if (stopSignal.current.stopped) {
            break;
          }

          addLog(t('growthLogFetchingComments'));
          const ids = await getCommenterIds(mediaId);
          commentersFromAccount += mergeUniqueIds(seenCommenters, ids);
          await sleep(GROWTH_SCRAPE_DELAY_MS);
        }

        addLog(t('growthLogAccountDone')(username, commentersFromAccount));

        setState(prev => {
          if (prev.status !== 'growth') {
            return prev;
          }
          return {
            ...prev,
            targetAccounts: [
              ...prev.targetAccounts,
              {
                username,
                userId,
                postsScraped: postIds.length,
                commentersFound: commentersFromAccount,
              },
            ],
          };
        });

        await sleep(GROWTH_ACCOUNT_DELAY_MS);
      }

      if (stopSignal.current.stopped) {
        addLog(t('growthLogStopped'));
        patchGrowth({ phase: 'done', isRunning: false });
        return;
      }

      const queue = Array.from(seenCommenters);
      if (queue.length === 0) {
        addLog(t('growthLogNoCommenters'));
        patchGrowth({ phase: 'done', isRunning: false });
        return;
      }

      patchGrowth({
        phase: 'following',
        commenterQueue: queue,
        totalToFollow: queue.length,
      });
      addLog(t('growthLogQueueReady')(queue.length));

      let followsSinceCooldown = 0;

      for (let i = 0; i < queue.length; i++) {
        if (stopSignal.current.stopped) {
          break;
        }

        while (!stopSignal.current.stopped) {
          const current = getState();
          if (current.status !== 'growth' || !current.isPaused) {
            break;
          }
          await sleep(1000);
        }

        if (stopSignal.current.stopped) {
          break;
        }

        if (!canFollowToday()) {
          addLog(t('growthLogSkipDailyLimit'));
          patchGrowth({ phase: 'done', isRunning: false });
          break;
        }

        const targetUserId = queue[i];
        addLog(t('growthLogChecking')(i + 1, queue.length));

        const friendship = await getFriendshipStatus(targetUserId);
        const brief = await getUserBrief(targetUserId);

        const skipReason = getGrowthSkipReason({
          userId: targetUserId,
          selfUserId,
          followingIds: new Set(friendship?.following ? [targetUserId] : []),
          pendingRequestIds: new Set(friendship?.outgoingRequest ? [targetUserId] : []),
          whitelistIds,
          isGhost: brief?.isGhost ?? false,
          isPrivate: brief?.isPrivate ?? false,
          dailyLimitReached: !canFollowToday(),
        });

        if (skipReason) {
          const skipMessages: Record<string, string> = {
            self: t('growthLogSkipSelf'),
            whitelisted: t('growthLogSkipWhitelist'),
            already_following: t('growthLogSkipFollowing'),
            pending_request: t('growthLogSkipPending'),
            private: t('growthLogSkipPrivate'),
            ghost: t('growthLogSkipGhost'),
            daily_limit: t('growthLogSkipDailyLimit'),
          };
          addLog(skipMessages[skipReason] ?? t('growthLogSkipGhost'));
          setState(prev =>
            prev.status === 'growth' ? { ...prev, skippedCount: prev.skippedCount + 1 } : prev,
          );
          continue;
        }

        addLog(t('growthLogFollowing')(brief?.username ?? targetUserId));
        const result = await followUser(targetUserId);

        if (result.ok) {
          incrementDailyFollowCount();
          addLog(t('growthLogFollowSuccess'));
          setState(prev =>
            prev.status === 'growth' ? { ...prev, followedCount: prev.followedCount + 1 } : prev,
          );

          if (brief) {
            HistoryService.addEvent(
              'YOU_FOLLOWED',
              {
                id: brief.id,
                username: brief.username,
                full_name: brief.username,
                profile_pic_url: '',
                is_verified: false,
                is_private: brief.isPrivate,
                followed_by_viewer: true,
                follows_viewer: false,
                requested_by_viewer: false,
                reel: {
                  id: '',
                  expiring_at: 0,
                  has_pride_media: false,
                  latest_reel_media: 0,
                  seen: null,
                  owner: {
                    __typename: 'GraphUser' as const,
                    id: brief.id,
                    profile_pic_url: '',
                    username: brief.username,
                  },
                },
              } as UserNode,
            );
          }

          followsSinceCooldown++;
        } else {
          addLog(t('growthLogFollowFailed'));
          setState(prev =>
            prev.status === 'growth' ? { ...prev, skippedCount: prev.skippedCount + 1 } : prev,
          );

          if (isRateLimitResponse(result.status, result.body)) {
            addLog(t('growthLogRateLimited'));
            await sleep(GROWTH_RATE_LIMIT_BACKOFF_MS);
          }
          continue;
        }

        if (i < queue.length - 1 && !stopSignal.current.stopped) {
          if (followsSinceCooldown >= GROWTH_FOLLOWS_BEFORE_COOLDOWN) {
            addLog(t('statusWaitingCooldown'));
            await sleep(GROWTH_RATE_LIMIT_BACKOFF_MS / 2);
            followsSinceCooldown = 0;
          } else {
            const delayMs = computeFollowDelayMs(speed);
            addLog(t('growthLogWaiting')(Math.round(delayMs / 1000)));
            await sleep(delayMs);
          }
        }
      }

      if (!stopSignal.current.stopped) {
        patchGrowth({ phase: 'done', isRunning: false });
        addLog(t('growthLogCompleted'));
      } else {
        patchGrowth({ isRunning: false });
      }
    },
    [addLog, getState, patchGrowth, setState],
  );

  const stopGrowth = useCallback(() => {
    stopSignal.current.stopped = true;
  }, []);

  return {
    startGrowth,
    stopGrowth,
    remainingDailyFollows,
  };
}
