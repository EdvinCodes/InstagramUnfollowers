import { useState, useRef, useCallback } from 'preact/hooks';
import { UserNode } from '../model/user';
import { getCookie, sleep } from '../utils/utils';
import { fetchFollowersPage, fetchFollowingPage, isSuspiciousEmptyFirstPage, mapRestUserToNode, RestUser } from '../utils/igListsApi';
import { getUserBrief } from '../utils/growthApi';
import { computeBackoffMs } from '../utils/growthHelpers';
import { GROWTH_RATE_LIMIT_BACKOFF_MAX_MS, GROWTH_RATE_LIMIT_BACKOFF_MS, RATE_LIMIT_MAX_RETRIES } from '../constants/growth';
import { Timings } from '../model/timings';
import { t } from '../i18n/i18n';

export type ScanFinishReason = 'completed' | 'rate_limit' | 'error' | 'no_session' | 'stopped' | 'blocked';

interface ScannerState {
  isScanning: boolean;
  progress: number;
  results: UserNode[];
  statusMessage: string;
  finishReason: ScanFinishReason | null;
}

export const useScanner = (timings: Timings) => {
  const [scannerState, setScannerState] = useState<ScannerState>({
    isScanning: false,
    progress: 0,
    results: [],
    statusMessage: '',
    finishReason: null,
  });

  const isPausedRef = useRef<boolean>(false);
  const [isPausedUI, setIsPausedUI] = useState(false);
  const shouldStopRef = useRef<boolean>(false);

  const togglePause = useCallback(() => {
    isPausedRef.current = !isPausedRef.current;
    setIsPausedUI(isPausedRef.current);
  }, []);

  const stopScan = useCallback(() => {
    shouldStopRef.current = true;
  }, []);

  const startScan = useCallback(async () => {
    shouldStopRef.current = false;
    isPausedRef.current = false;
    setIsPausedUI(false);

    setScannerState({
      isScanning: true,
      results: [],
      progress: 0,
      statusMessage: '',
      finishReason: null,
    });

    const dsUserId = getCookie('ds_user_id');
    if (!dsUserId) {
      setScannerState(prev => ({
        ...prev,
        isScanning: false,
        statusMessage: t('statusNoSession'),
        finishReason: 'no_session',
      }));
      return;
    }

    const followingUsers: RestUser[] = [];
    const followerIds = new Set<string>();
    let finishReason: ScanFinishReason = 'completed';

    const waitWhilePaused = async () => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (isPausedRef.current) {
        setScannerState(prev => ({ ...prev, statusMessage: t('statusPaused') }));
        await sleep(1000);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (shouldStopRef.current) {
          break;
        }
      }
    };

    // Anti-ban pacing between pages, with a longer cooldown every 5 pages — same cadence the old
    // GraphQL loop used, just decoupled from the (now dead) query_hash pagination.
    const pacingSleep = async (pageIndex: number) => {
      const randomSleep =
        Math.floor(Math.random() * timings.timeBetweenSearchCycles * 0.3) + timings.timeBetweenSearchCycles;
      await sleep(randomSleep);

      if (pageIndex > 0 && pageIndex % 5 === 0) {
        setScannerState(prev => ({ ...prev, statusMessage: t('statusCoolingDown') }));
        await sleep(timings.timeToWaitAfterFiveSearchCycles);
      }
    };

    try {
      // Best-effort totals from a separate endpoint. Used only for progress % and to tell a
      // genuinely-empty list apart from Instagram silently failing to return one (see below).
      const brief = await getUserBrief(dsUserId);
      const totalFollowing = brief?.followingCount ?? -1;
      const totalFollowers = brief?.followerCount ?? -1;

      // ── Phase 1: following ────────────────────────────────────────────────
      let maxId: string | null = null;
      let page = 0;
      let retries = 0;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (!shouldStopRef.current) {
        await waitWhilePaused();
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (shouldStopRef.current) {
          break;
        }

        setScannerState(prev => ({ ...prev, statusMessage: t('statusFetching') }));
        const pageResult = await fetchFollowingPage(dsUserId, maxId);

        if (pageResult.status === 429) {
          retries++;
          if (retries > RATE_LIMIT_MAX_RETRIES) {
            finishReason = 'rate_limit';
            shouldStopRef.current = true;
            break;
          }
          await sleep(computeBackoffMs(retries, GROWTH_RATE_LIMIT_BACKOFF_MS, GROWTH_RATE_LIMIT_BACKOFF_MAX_MS));
          continue;
        }

        if (pageResult.status !== 200) {
          throw new Error(`API Error ${pageResult.status}`);
        }
        retries = 0;

        if (page === 0 && isSuspiciousEmptyFirstPage(pageResult.users, totalFollowing)) {
          // Instagram says we follow `totalFollowing` accounts but handed back zero of them.
          // Reporting "0 results / completed" here is exactly the bug from issue #5 — bail out
          // loudly instead.
          finishReason = 'blocked';
          shouldStopRef.current = true;
          break;
        }

        followingUsers.push(...pageResult.users);

        const currentCount = followingUsers.length;
        const progress =
          totalFollowing > 0
            ? Math.min(49, Math.floor((currentCount / totalFollowing) * 49))
            : Math.min(45, page * 5);

        setScannerState({
          isScanning: true,
          results: followingUsers.map(user => mapRestUserToNode(user, false)),
          progress,
          statusMessage: t('statusAnalyzed')(currentCount, Math.max(totalFollowing, currentCount)),
          finishReason: null,
        });

        if (!pageResult.nextMaxId) {
          break;
        }
        maxId = pageResult.nextMaxId;
        page++;
        await pacingSleep(page);
      }

      // ── Phase 2: followers (only to know who follows back) ──────────────────
      if (!shouldStopRef.current && followingUsers.length > 0) {
        let followersMaxId: string | null = null;
        let followerPage = 0;
        let followerRetries = 0;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (!shouldStopRef.current) {
          await waitWhilePaused();
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (shouldStopRef.current) {
            break;
          }

          setScannerState(prev => ({ ...prev, statusMessage: t('statusFetching') }));
          const pageResult = await fetchFollowersPage(dsUserId, followersMaxId);

          if (pageResult.status === 429) {
            followerRetries++;
            if (followerRetries > RATE_LIMIT_MAX_RETRIES) {
              finishReason = 'rate_limit';
              shouldStopRef.current = true;
              break;
            }
            await sleep(
              computeBackoffMs(followerRetries, GROWTH_RATE_LIMIT_BACKOFF_MS, GROWTH_RATE_LIMIT_BACKOFF_MAX_MS),
            );
            continue;
          }

          if (pageResult.status !== 200) {
            throw new Error(`API Error ${pageResult.status}`);
          }
          followerRetries = 0;

          pageResult.users.forEach(user => followerIds.add(user.pk));

          const fetchedFollowers = followerIds.size;
          const progress =
            totalFollowers > 0
              ? 50 + Math.min(49, Math.floor((fetchedFollowers / totalFollowers) * 49))
              : Math.min(95, 50 + followerPage * 5);

          setScannerState(prev => ({
            ...prev,
            progress,
            statusMessage: t('statusAnalyzed')(fetchedFollowers, Math.max(totalFollowers, fetchedFollowers)),
          }));

          if (!pageResult.nextMaxId) {
            break;
          }
          followersMaxId = pageResult.nextMaxId;
          followerPage++;
          await pacingSleep(followerPage);
        }
      }

      if (shouldStopRef.current && finishReason === 'completed') {
        finishReason = 'stopped';
      }
    } catch (error) {
      console.error('Scan error:', error);
      finishReason = 'error';
    } finally {
      const finalResults = followingUsers.map(user => mapRestUserToNode(user, followerIds.has(user.pk)));

      const statusByReason: Record<ScanFinishReason, string> = {
        completed: t('statusCompleted'),
        rate_limit: t('statusRateLimited'),
        error: t('statusScanError'),
        blocked: t('statusScanError'),
        no_session: t('statusNoSession'),
        stopped: t('statusStopped'),
      };

      setScannerState(prev => ({
        ...prev,
        isScanning: false,
        progress: finishReason === 'completed' ? 100 : prev.progress,
        results: finalResults.length > 0 ? finalResults : prev.results,
        statusMessage: statusByReason[finishReason],
        finishReason,
      }));
    }
  }, [timings]);

  return {
    scannerState,
    startScan,
    stopScan,
    togglePause,
    isPaused: isPausedUI,
  };
};
