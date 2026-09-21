import { useState, useRef, useCallback } from 'preact/hooks';
import { UserNode } from '../model/user';
import { getCookie, sleep } from '../utils/utils';
import { fetchFollowersPage, fetchFollowingPage, fetchFollowedByMany, findUnclassifiedUserIds, isSuspiciousEmptyFirstPage, mapRestUserToNode, addRestUserToFollowerIndex, restUserFollowsViewer, RestUser } from '../utils/igListsApi';
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

    // Keyed by pk so a following account that shifts position between pages
    // (Instagram's list can reorder mid-pagination) never shows up twice.
    const followingByPk = new Map<string, RestUser>();
    const followerIds = new Set<string>();
    const followerNames = new Set<string>();
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

    // Anti-ban pacing between pages — same cadence the old GraphQL loop used, just
    // decoupled from the (now dead) query_hash pagination. No status text here on
    // purpose: followers and following now run concurrently (see below), so the
    // combined counter from `publish()` is the only thing allowed to touch the
    // status line — otherwise both loops would fight over it and flicker.
    const pacingSleep = async (pageIndex: number) => {
      const randomSleep =
        Math.floor(Math.random() * timings.timeBetweenSearchCycles * 0.3) + timings.timeBetweenSearchCycles;
      await sleep(randomSleep);

      if (pageIndex > 0 && pageIndex % 5 === 0) {
        await sleep(timings.timeToWaitAfterFiveSearchCycles);
      }
    };

    try {
      // Best-effort totals from a separate endpoint. Used only for progress % and to tell a
      // genuinely-empty list apart from Instagram silently failing to return one (see below).
      const brief = await getUserBrief(dsUserId);
      const totalFollowing = brief?.followingCount ?? -1;
      const totalFollowers = brief?.followerCount ?? -1;
      const combinedTotal = totalFollowing > 0 && totalFollowers > 0 ? totalFollowing + totalFollowers : -1;

      // Following and followers are fetched CONCURRENTLY below and published as ONE
      // combined counter/progress bar. Fetching them sequentially (8.8.4) was correct
      // but doubled wall-clock time and looked broken on big accounts: the list stayed
      // empty for the entire followers pass, then a second, smaller counter appeared to
      // "reset" and only then started filling once following began. Running both at once
      // fixes both complaints — the (usually much smaller) following list fills in almost
      // immediately, and mutuals keep resolving as followers streams in alongside it.
      const publish = () => {
        const combined = followingByPk.size + followerIds.size;
        const progress =
          combinedTotal > 0
            ? Math.min(99, Math.floor((combined / combinedTotal) * 99))
            : Math.min(90, Math.floor(combined / 10));

        setScannerState({
          isScanning: true,
          results: Array.from(followingByPk.values()).map(user =>
            mapRestUserToNode(user, restUserFollowsViewer(user, followerIds, followerNames)),
          ),
          progress,
          statusMessage: t('statusAnalyzed')(combined, combinedTotal > 0 ? combinedTotal : combined),
          finishReason: null,
        });
      };

      // ── Followers loop ───────────────────────────────────────────────────────
      const runFollowers = async () => {
        let followersMaxId: string | null = null;
        let followersRankToken: string | null = null;
        let followerPage = 0;
        let followerRetries = 0;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (!shouldStopRef.current) {
          await waitWhilePaused();
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (shouldStopRef.current) {
            break;
          }

          const pageResult = await fetchFollowersPage(dsUserId, followersMaxId, followersRankToken);

          if (pageResult.status === 429 || pageResult.status === 0) {
            // status 0 = a 2xx response that wasn't JSON (challenge/error page) —
            // treated exactly like a rate limit so it backs off and retries instead
            // of throwing a raw SyntaxError that would abort the whole scan.
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

          if (followerPage === 0 && isSuspiciousEmptyFirstPage(pageResult.users, totalFollowers)) {
            // Same "200 OK but empty" failure mode as issue #5, just on the followers
            // endpoint. Left unchecked, phase 3 below would still (wrongly) mark every
            // following account as a non-follower.
            finishReason = 'blocked';
            shouldStopRef.current = true;
            break;
          }

          pageResult.users.forEach(user => addRestUserToFollowerIndex(user, followerIds, followerNames));
          followersRankToken = pageResult.rankToken ?? followersRankToken;
          publish();

          if (!pageResult.nextMaxId || pageResult.nextMaxId === followersMaxId) {
            break;
          }
          followersMaxId = pageResult.nextMaxId;
          followerPage++;
          await pacingSleep(followerPage);
        }
      };

      // ── Following loop ───────────────────────────────────────────────────────
      const runFollowing = async () => {
        let maxId: string | null = null;
        let followingRankToken: string | null = null;
        let page = 0;
        let retries = 0;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (!shouldStopRef.current) {
          await waitWhilePaused();
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (shouldStopRef.current) {
            break;
          }

          const pageResult = await fetchFollowingPage(dsUserId, maxId, followingRankToken);

          if (pageResult.status === 429 || pageResult.status === 0) {
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
            // Instagram says we follow `totalFollowing` accounts but handed back zero of
            // them. Reporting "0 results / completed" here is exactly the bug from issue
            // #5 — bail out loudly instead.
            finishReason = 'blocked';
            shouldStopRef.current = true;
            break;
          }

          for (const user of pageResult.users) {
            followingByPk.set(user.pk, user);
          }
          followingRankToken = pageResult.rankToken ?? followingRankToken;
          publish();

          if (!pageResult.nextMaxId || pageResult.nextMaxId === maxId) {
            break;
          }
          maxId = pageResult.nextMaxId;
          page++;
          await pacingSleep(page);
        }
      };

      await Promise.all([runFollowers(), runFollowing()]);

      // ── Phase 3: bulk follow-back check for whatever the loops above couldn't
      // resolve — Instagram omitted friendship_status AND the id/username didn't
      // match anything in the followers index (partial followers-list failure,
      // id-scheme mismatch, etc.). Runs for the unresolved subset only, regardless
      // of how many mutuals were already found.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!shouldStopRef.current && followingByPk.size > 0) {
        const unclassifiedIds = findUnclassifiedUserIds(
          Array.from(followingByPk.values()),
          followerIds,
          followerNames,
        );
        if (unclassifiedIds.length > 0) {
          const many = await fetchFollowedByMany(unclassifiedIds);
          many.followedByIds.forEach(id => followerIds.add(id));
          if (many.status === 429) {
            finishReason = 'rate_limit';
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (shouldStopRef.current && finishReason === 'completed') {
        finishReason = 'stopped';
      }
    } catch (error) {
      console.error('Scan error:', error);
      finishReason = 'error';
    } finally {
      const finalResults = Array.from(followingByPk.values()).map(user =>
        mapRestUserToNode(user, restUserFollowsViewer(user, followerIds, followerNames)),
      );

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
