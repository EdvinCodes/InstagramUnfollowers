import { useState, useRef, useCallback } from 'preact/hooks';
import { UserNode } from '../model/user';
import { getCookie, sleep } from '../utils/utils';
import { fetchFollowingPage, fetchFollowedByMany, findUnclassifiedUserIds, isSuspiciousEmptyFirstPage, mapRestUserToNode, restUserFollowsViewer, RestUser } from '../utils/igListsApi';
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
      statusMessage: t('statusFetching'),
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
    // Populated from `friendship_status`/show_many, NOT from a separate followers
    // fetch — see the "Why this scan only fetches ONE list" comment below.
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

    // Anti-ban pacing between pages — same cadence the old GraphQL loop used.
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
      // Best-effort total from a separate endpoint. Used only for progress % and to
      // tell a genuinely-empty list apart from Instagram silently failing to return
      // one (see isSuspiciousEmptyFirstPage below).
      const brief = await getUserBrief(dsUserId);
      const totalFollowing = brief?.followingCount ?? -1;

      // ── Why this scan only fetches ONE list (following) ─────────────────────
      // v8.3.0's GraphQL `edge_follow` query had `follows_viewer` baked into every
      // edge — Instagram told us "follows you back" for free, one list, done. That
      // query stopped returning edges (issue #5) and got replaced with Instagram's
      // private REST following list, which frequently omits `friendship_status`
      // altogether on larger ("big list") accounts — exactly the "I follow 5k
      // accounts" case reported here. Earlier fixes compensated by ALSO fetching
      // the entire followers list in parallel and cross-referencing it, but on a
      // big account that second list can take just as long (or longer) than
      // following, so for most of the scan almost everyone was shown as a
      // non-follower and kept "jumping" to mutuals as followers slowly caught up —
      // technically correct at the very end, but nothing like the instant,
      // stays-put sorting from 8.3.0.
      //
      // Fix: use `friendships/show_many/` — the same bulk follow-back check
      // Instagram's own client relies on — right after EACH page of following
      // loads, for just the handful of accounts that page couldn't already
      // resolve via `friendship_status`. That's one extra lightweight request per
      // page instead of a second full list pagination, so a page's accounts are
      // classified correctly within a second or two of appearing — no separate
      // followers fetch needed, no reclassification churn, no doubled requests
      // (kinder to rate limits, too).
      const publish = () => {
        const analyzed = followingByPk.size;
        const total = totalFollowing > 0 ? totalFollowing : analyzed;
        const progress =
          totalFollowing > 0 ? Math.min(99, Math.floor((analyzed / total) * 99)) : Math.min(90, Math.floor(analyzed / 10));

        setScannerState({
          isScanning: true,
          results: Array.from(followingByPk.values()).map(user =>
            mapRestUserToNode(user, restUserFollowsViewer(user, followerIds, followerNames)),
          ),
          progress,
          statusMessage: t('statusAnalyzed')(analyzed, total),
          finishReason: null,
        });
      };

      // Resolutions are chained (not run in parallel) so we never have more than
      // one show_many call in flight — same "one request at a time" anti-ban
      // posture as the page pagination itself. Because it isn't awaited from the
      // main loop below, it runs while `pacingSleep` is already waiting between
      // pages, so it typically costs zero *extra* wall-clock time.
      let resolutionChain: Promise<void> = Promise.resolve();
      const queueFollowBackResolution = (pageUsers: readonly RestUser[]) => {
        resolutionChain = resolutionChain
          .then(async () => {
            const unresolved = findUnclassifiedUserIds(pageUsers, followerIds, followerNames);
            if (unresolved.length === 0) {
              return;
            }
            const many = await fetchFollowedByMany(unresolved);
            many.followedByIds.forEach(id => followerIds.add(id));
            publish();
          })
          .catch(err => {
            // Best-effort — a handful of unresolved accounts just fall through to
            // the final safety-net sweep below, or default to "non-follower".
            console.error('follow-back resolution failed (non-fatal):', err);
          });
      };

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
          // status 0 = a 2xx response that wasn't JSON (challenge/error page) —
          // treated exactly like a rate limit so it backs off and retries instead
          // of throwing a raw SyntaxError that would abort the whole scan.
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
          // Instagram says we follow `totalFollowing` accounts but handed back zero
          // of them. Reporting "0 results / completed" here is exactly the bug
          // from issue #5 — bail out loudly instead.
          finishReason = 'blocked';
          shouldStopRef.current = true;
          break;
        }

        for (const user of pageResult.users) {
          followingByPk.set(user.pk, user);
        }
        followingRankToken = pageResult.rankToken ?? followingRankToken;
        publish();
        queueFollowBackResolution(pageResult.users);

        if (!pageResult.nextMaxId || pageResult.nextMaxId === maxId) {
          break;
        }
        maxId = pageResult.nextMaxId;
        page++;
        await pacingSleep(page);
      }

      // Drain any still-pending per-page resolutions before the final sweep below
      // so it only has to deal with genuine failures, not just "hasn't run yet".
      await resolutionChain;

      // ── Final safety net for whatever per-page resolution couldn't resolve —
      // Instagram omitted friendship_status AND that page's show_many call itself
      // errored/rate-limited. Runs once for the unresolved subset only, regardless
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
