import { useState, useRef, useCallback } from 'preact/hooks';
import { UserNode } from '../model/user';
import { getCookie, sleep } from '../utils/utils';
import {
  fetchFollowersPage,
  fetchFollowingPage,
  fetchFollowedByMany,
  findUnclassifiedUserIds,
  isSuspiciousEmptyFirstPage,
  mapRestUserToNode,
  addRestUserToFollowerIndex,
  restUserFollowsViewer,
  RestUser,
} from '../utils/igListsApi';
import { getUserBrief } from '../utils/growthApi';
import { computeBackoffMs } from '../utils/growthHelpers';
import { GROWTH_RATE_LIMIT_BACKOFF_MAX_MS, GROWTH_RATE_LIMIT_BACKOFF_MS, RATE_LIMIT_MAX_RETRIES } from '../constants/growth';
import { Timings } from '../model/timings';
import { t } from '../i18n/i18n';

export type ScanFinishReason = 'completed' | 'partial' | 'rate_limit' | 'error' | 'no_session' | 'stopped' | 'blocked';

interface ScannerState {
  isScanning: boolean;
  progress: number;
  results: UserNode[];
  statusMessage: string;
  finishReason: ScanFinishReason | null;
}

// Generous hard caps against a genuinely runaway loop (Instagram repeating a
// cursor forever, etc). The real loop-termination guard is "next_max_id didn't
// change", checked on every page below — these are just a last-resort backstop,
// sized well above any real personal account (davidarroyo1234's fork uses 60/250
// pages at the same page size; we go much higher since issue #5 was reported by
// someone following 5k+ accounts).
const FOLLOWING_PAGE_SAFETY_LIMIT = 1000;
const FOLLOWERS_PAGE_SAFETY_LIMIT = 2000;

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

    // ── Why nothing is classified/shown until BOTH lists are fully in ────────
    // v8.3.0's GraphQL `edge_follow` query had `follows_viewer` baked into every
    // following edge — Instagram told us "follows you back" for free, one list,
    // done. That query stopped returning edges (issue #5) and got replaced with
    // Instagram's private REST following list. Two different attempts to keep
    // classifying "as you go" off of that REST list's own signals each turned
    // out to be unsafe on real accounts: `friendship_status.followed_by` is
    // frequently omitted entirely on large ("big list") accounts, AND (confirmed
    // by a real bug report) can come back an outright wrong `false` — trusting
    // either one, alone or via a per-page `show_many` check, got real mutuals
    // stuck under "Non-followers".
    //
    // The only signal that cannot lie is: is this account's id/username actually
    // present in MY followers list. That requires the full followers list, which
    // takes time to paginate — so, like the reference fork this was rebuilt from
    // (github.com/davidarroyo1234/InstagramUnfollowers), this scan fetches
    // following fully, then followers fully, cross-references once, and only
    // THEN writes `results` into state. Nothing is shown or sorted into Mutuals /
    // Non-followers before that — see the in-app banner in Searching.tsx.
    // `show_many` is kept only as a last-resort sweep afterwards, for whoever the
    // followers list itself still couldn't resolve (id-scheme mismatch, a
    // followers page that failed mid-scan, etc.) — never the primary signal.
    const followingByPk = new Map<string, RestUser>();
    const followerIds = new Set<string>();
    const followerNames = new Set<string>();
    let finishReason: ScanFinishReason = 'completed';
    // Set when the followers list (or the final show_many sweep) couldn't be
    // fully resolved but we still have a usable following list — the scan
    // proceeds with what it has instead of throwing everything away, but the
    // result gets flagged as `partial` instead of a clean `completed`.
    let resultsMayBeIncomplete = false;

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

    // Anti-ban pacing between pages: the user-configured cycle time, PLUS a
    // small random micro-pause, PLUS a longer jittered cooldown every 5 pages —
    // same shape as davidarroyo1234's fork (a small extra randomization on top
    // of a fixed cadence is less pattern-like than a fixed cadence alone).
    const pacingSleep = async (pageIndex: number) => {
      const microPause = Math.floor(Math.random() * 1500) + 500; // 500-2000ms
      await sleep(microPause);

      const randomSleep =
        Math.floor(Math.random() * timings.timeBetweenSearchCycles * 0.3) + timings.timeBetweenSearchCycles;
      await sleep(randomSleep);

      if (pageIndex > 0 && pageIndex % 5 === 0) {
        // Only the status text changes here, not the progress number — avoids
        // needing to know which phase/percentage is "current" from in here.
        setScannerState(prev => ({ ...prev, statusMessage: t('statusCoolingDown') }));
        const jitter = Math.random() * 10000 - 5000; // +/- 5s so it isn't a fixed, detectable pattern
        await sleep(Math.max(0, timings.timeToWaitAfterFiveSearchCycles + jitter));
      }
    };

    try {
      // Best-effort totals from a separate endpoint. Used only for progress % and
      // to tell a genuinely-empty list apart from Instagram silently failing to
      // return one (see isSuspiciousEmptyFirstPage below).
      const brief = await getUserBrief(dsUserId);
      const totalFollowing = brief?.followingCount ?? -1;
      const totalFollowers = brief?.followerCount ?? -1;

      const publishProgress = (statusMessage: string, progress: number) => {
        setScannerState(prev => ({
          ...prev,
          isScanning: true,
          statusMessage,
          progress,
          finishReason: null,
        }));
      };

      // ── Phase A: following — 0% to 50% ───────────────────────────────────────
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
          // Instagram says we follow `totalFollowing` accounts but handed back
          // zero of them. Reporting "0 results / completed" here is exactly the
          // bug from issue #5 — bail out loudly instead.
          finishReason = 'blocked';
          shouldStopRef.current = true;
          break;
        }

        for (const user of pageResult.users) {
          followingByPk.set(user.pk, user);
        }
        followingRankToken = pageResult.rankToken ?? followingRankToken;

        const analyzed = followingByPk.size;
        const followingTotal = totalFollowing > 0 ? totalFollowing : analyzed;
        const phaseProgress =
          totalFollowing > 0
            ? Math.min(50, Math.floor((analyzed / followingTotal) * 50))
            : Math.min(45, Math.floor(analyzed / 10));
        publishProgress(t('statusPhaseFollowing')(analyzed, followingTotal), phaseProgress);

        if (!pageResult.nextMaxId || pageResult.nextMaxId === maxId) {
          break;
        }
        maxId = pageResult.nextMaxId;
        page++;
        if (page >= FOLLOWING_PAGE_SAFETY_LIMIT) {
          console.error(`Stopping following scan early: hit the safety cap of ${FOLLOWING_PAGE_SAFETY_LIMIT} pages.`);
          break;
        }
        await pacingSleep(page);
      }

      // ── Phase B: followers — 50% to 95% ──────────────────────────────────────
      let followersCompletedOk = false;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!shouldStopRef.current && finishReason === 'completed') {
        let followersMaxId: string | null = null;
        let followersRankToken: string | null = null;
        let followerPage = 0;
        let followerRetries = 0;
        let followersFetched = 0;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (!shouldStopRef.current) {
          await waitWhilePaused();
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (shouldStopRef.current) {
            break;
          }

          const pageResult = await fetchFollowersPage(dsUserId, followersMaxId, followersRankToken);

          if (pageResult.status === 429 || pageResult.status === 0) {
            followerRetries++;
            if (followerRetries > RATE_LIMIT_MAX_RETRIES) {
              // Give up on followers rather than abort the whole scan — handled
              // as blocked/partial right after this loop, based on whether we
              // already have SOME followers data to work with.
              break;
            }
            await sleep(
              computeBackoffMs(followerRetries, GROWTH_RATE_LIMIT_BACKOFF_MS, GROWTH_RATE_LIMIT_BACKOFF_MAX_MS),
            );
            continue;
          }

          if (pageResult.status !== 200) {
            break;
          }
          followerRetries = 0;

          if (followerPage === 0 && isSuspiciousEmptyFirstPage(pageResult.users, totalFollowers)) {
            // Same "200 OK but empty" failure mode as issue #5, just on the
            // followers endpoint. Left unchecked, the cross-reference below
            // would (wrongly) mark every following account as a non-follower.
            finishReason = 'blocked';
            shouldStopRef.current = true;
            break;
          }

          pageResult.users.forEach(user => addRestUserToFollowerIndex(user, followerIds, followerNames));
          followersFetched += pageResult.users.length;
          followersRankToken = pageResult.rankToken ?? followersRankToken;

          const followersTotal = totalFollowers > 0 ? totalFollowers : followersFetched;
          const phaseProgress =
            totalFollowers > 0
              ? 50 + Math.min(45, Math.floor((followersFetched / followersTotal) * 45))
              : Math.min(95, 50 + Math.floor(followersFetched / 20));
          publishProgress(t('statusPhaseFollowers')(followersFetched, followersTotal), phaseProgress);

          if (!pageResult.nextMaxId || pageResult.nextMaxId === followersMaxId) {
            followersCompletedOk = true;
            break;
          }
          followersMaxId = pageResult.nextMaxId;
          followerPage++;
          if (followerPage >= FOLLOWERS_PAGE_SAFETY_LIMIT) {
            console.error(`Stopping followers scan early: hit the safety cap of ${FOLLOWERS_PAGE_SAFETY_LIMIT} pages.`);
            break;
          }
          await pacingSleep(followerPage);
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!shouldStopRef.current && finishReason === 'completed' && !followersCompletedOk) {
          if (followerIds.size === 0) {
            // Never resolved a single follower despite following succeeding —
            // showing "0 followers" would flag EVERY following account as a
            // non-follower, exactly the bug this rewrite exists to fix. Don't
            // show a list we know is misleading.
            finishReason = 'blocked';
          } else {
            resultsMayBeIncomplete = true;
          }
        }
      }

      // ── Phase C: cross-reference + one optional show_many sweep — 95% to 100% ─
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!shouldStopRef.current && finishReason === 'completed' && followingByPk.size > 0) {
        publishProgress(t('statusClassifying'), 96);
        const unclassifiedIds = findUnclassifiedUserIds(
          Array.from(followingByPk.values()),
          followerIds,
          followerNames,
        );
        if (unclassifiedIds.length > 0) {
          const many = await fetchFollowedByMany(unclassifiedIds);
          many.followedByIds.forEach(id => followerIds.add(id));
          if (many.status === 429) {
            resultsMayBeIncomplete = true;
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (shouldStopRef.current && finishReason === 'completed') {
        finishReason = 'stopped';
      } else if (resultsMayBeIncomplete && finishReason === 'completed') {
        finishReason = 'partial';
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
        partial: t('statusCompleted'),
        rate_limit: t('statusRateLimited'),
        error: t('statusScanError'),
        blocked: t('statusScanError'),
        no_session: t('statusNoSession'),
        stopped: t('statusStopped'),
      };

      setScannerState(prev => ({
        ...prev,
        isScanning: false,
        progress: finishReason === 'completed' || finishReason === 'partial' ? 100 : prev.progress,
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
