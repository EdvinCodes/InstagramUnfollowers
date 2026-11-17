import { useState, useRef, useCallback } from 'preact/hooks';
import { UserNode } from '../model/user';
import { sleep } from '../utils/utils';
import {
  addRestUserToFollowerIndex,
  fetchFollowedByMany,
  fetchFollowersPage,
  fetchFollowingPage,
  isSuspiciousEmptyFirstPage,
  mapRestUserToNode,
  restUserFollowsViewer,
  type ListPage,
  type RestUser,
} from '../utils/igListsApi';
import { getUserBrief } from '../utils/growthApi';
import type { IgFailure } from '../utils/igClient';
import { FOLLOWERS_PAGE_SAFETY_LIMIT, FOLLOWING_PAGE_SAFETY_LIMIT } from '../constants/constants';
import { Timings } from '../model/timings';
import { t } from '../i18n/i18n';
import {
  absorbFollowingUsers,
  EMPTY_SCAN_REPORT,
  followersLookTruncated,
  idsStillNeedingSweep,
  shouldPublishScanResults,
  type ScanFinishReason,
  type ScanReport,
} from '../utils/scanOutcome';
import { pacingFactorFor, pageCapFor, walkList, type RetryNotice, type WalkDeps, type WalkResult } from '../utils/scanWalker';
import {
  clearFollowersCheckpoint,
  loadFollowersCheckpoint,
  saveFollowersCheckpoint,
} from '../utils/scanCheckpoint';
import { assertSameViewer, currentViewerId, isAccountChangedError } from '../utils/accountGuard';
import { cooldownSecondsLeft, formatCountdown, startCooldown } from '../utils/cooldown';
import { beginForegroundWork } from '../utils/foregroundWork';

export type { ScanFinishReason };

interface ScannerState {
  isScanning: boolean;
  progress: number;
  results: UserNode[];
  statusMessage: string;
  finishReason: ScanFinishReason | null;
  report: ScanReport;
}

export interface StartScanOptions {
  /** Drop saved followers and start the download from the top. */
  readonly fresh?: boolean;
}

const CHECKPOINT_EVERY_PAGES = 5;

function retryMessage(notice: RetryNotice): string {
  const { secondsLeft, attempt, maxAttempts } = notice;
  switch (notice.failure) {
    case 'rate_limited':
      return t('retryRateLimited')(secondsLeft, attempt, maxAttempts);
    case 'network':
      return t('retryNetwork')(secondsLeft, attempt, maxAttempts);
    case 'server':
      return t('retryServer')(secondsLeft, attempt, maxAttempts);
    default:
      return t('retrySoftBlock')(secondsLeft, attempt, maxAttempts);
  }
}

/** Finish reason for a list walk that did not complete. */
function reasonForWalk(result: WalkResult): ScanFinishReason {
  switch (result.end.kind) {
    case 'stopped':
      return 'stopped';
    case 'failed':
      return reasonForFailure(result.end.failure);
    default:
      return 'blocked';
  }
}

function reasonForFailure(failure: IgFailure): ScanFinishReason {
  switch (failure) {
    case 'rate_limited':
    case 'action_blocked':
      return 'rate_limit';
    case 'soft_block':
      return 'blocked';
    case 'session':
      return 'no_session';
    default:
      return 'error';
  }
}

/** Instagram pushed back (not a network or server hiccup): wait before trying again. */
function isInstagramBlock(failure: IgFailure): boolean {
  return failure === 'rate_limited' || failure === 'action_blocked' || failure === 'soft_block';
}

function statusForReason(reason: ScanFinishReason): string {
  switch (reason) {
    case 'no_session':
      return t('sessionRejected');
    case 'rate_limit':
      return t('statusRateLimited');
    case 'stopped':
      return t('statusStopped');
    case 'account_changed':
      return t('accountChanged');
    default:
      return t('statusScanError');
  }
}

export const useScanner = (timings: Timings) => {
  const [scannerState, setScannerState] = useState<ScannerState>({
    isScanning: false,
    progress: 0,
    results: [],
    statusMessage: '',
    finishReason: null,
    report: EMPTY_SCAN_REPORT,
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

  const startScan = useCallback(
    async (options: StartScanOptions = {}) => {
      shouldStopRef.current = false;
      isPausedRef.current = false;
      setIsPausedUI(false);

      let report: ScanReport = EMPTY_SCAN_REPORT;
      const setStatus = (statusMessage: string) => setScannerState(prev => ({ ...prev, statusMessage }));
      const finish = (finishReason: ScanFinishReason, results: UserNode[], statusMessage: string) => {
        setScannerState(prev => ({
          ...prev,
          isScanning: false,
          progress: shouldPublishScanResults(finishReason, results.length, report.followersComplete)
            ? 100
            : prev.progress,
          results: shouldPublishScanResults(finishReason, results.length, report.followersComplete) ? results : [],
          statusMessage,
          finishReason,
          report,
        }));
      };

      setScannerState({
        isScanning: true,
        results: [],
        progress: 0,
        statusMessage: t('statusFetching'),
        finishReason: null,
        report,
      });

      const viewerIdOrNull = currentViewerId();
      if (!viewerIdOrNull) {
        finish('no_session', [], t('statusNoSession'));
        return;
      }
      const viewerId: string = viewerIdOrNull;

      const cooldownLeft = cooldownSecondsLeft();
      if (cooldownLeft > 0) {
        finish('cooldown', [], t('cooldownToast')(formatCountdown(cooldownLeft)));
        return;
      }
      if (options.fresh) {
        clearFollowersCheckpoint(viewerId);
      }

      const releaseWork = beginForegroundWork();

      const waitWhilePaused = async () => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (isPausedRef.current && !shouldStopRef.current) {
          setStatus(t('statusPaused'));
          await sleep(1000);
        }
      };

      // Sleeps in one-second steps so a stop request is honoured quickly.
      const pauseFor = async (ms: number) => {
        const endAt = Date.now() + ms;
        while (Date.now() < endAt && !shouldStopRef.current) {
          await sleep(Math.min(1000, endAt - Date.now()));
        }
      };

      // Anti-ban pacing: the user's cycle time plus jitter, and a longer pause
      // every five pages. `factor` stretches it on very long followers lists.
      const pacingSleep = async (pagesFetched: number, factor: number) => {
        await pauseFor(Math.floor(Math.random() * 1500) + 500);
        const base = timings.timeBetweenSearchCycles;
        await pauseFor((Math.floor(Math.random() * base * 0.3) + base) * factor);
        if (pagesFetched % 5 === 0) {
          const jitter = Math.random() * 10000 - 5000;
          const cooldownMs = Math.max(0, timings.timeToWaitAfterFiveSearchCycles * factor + jitter);
          setStatus(t('statusCoolingDown')(Math.round(cooldownMs / 1000)));
          await pauseFor(cooldownMs);
        }
      };

      const walkDeps = (
        fetchPage: WalkDeps['fetchPage'],
        onPage: WalkDeps['onPage'],
        pacingFactor: () => number,
        onCursor?: WalkDeps['onCursor'],
      ): WalkDeps => ({
        fetchPage,
        onPage,
        onCursor,
        shouldStop: () => shouldStopRef.current,
        waitWhilePaused,
        pace: pagesFetched => pacingSleep(pagesFetched, pacingFactor()),
        onRetry: notice => setStatus(retryMessage(notice)),
        onOffline: () => setStatus(t('waitingForConnection')),
        checkAccount: () => assertSameViewer(viewerId),
        sleep,
        now: () => Date.now(),
        isOnline: () => navigator.onLine,
        waitForOnline: async () => {
          while (!navigator.onLine && !shouldStopRef.current) {
            await sleep(1000);
          }
        },
      });

      const publishProgress = (statusMessage: string, progress: number, results?: UserNode[]) => {
        setScannerState(prev => ({
          ...prev,
          isScanning: true,
          statusMessage,
          progress,
          results: results ?? prev.results,
          finishReason: null,
          report,
        }));
      };

      try {
        // Totals from the profile: progress, page caps, and the truncation check.
        const brief = await getUserBrief(viewerId);
        assertSameViewer(viewerId);
        const followersTotal = brief?.followerCount ?? -1;
        const followingTotal = brief?.followingCount ?? -1;
        report = { ...report, followersTotal, followingTotal };

        // ── Phase 1: the full followers list — 0% to 50% ─────────────────────
        // Nothing is classified before this list is complete. A partial list
        // would mark real followers as non-followers.
        const followerIds = new Set<string>();
        const followerNames = new Set<string>();
        let followersCursor: string | null = null;
        let resumed = false;

        const checkpoint = loadFollowersCheckpoint(viewerId);
        if (checkpoint) {
          checkpoint.ids.forEach(id => followerIds.add(id));
          checkpoint.usernames.forEach(name => followerNames.add(name));
          followersCursor = checkpoint.cursor;
          resumed = true;
          report = { ...report, followersLoaded: followerNames.size };
        }

        const saveCheckpoint = (): number => {
          if (!followersCursor || followerNames.size === 0) {
            return 0;
          }
          const saved = saveFollowersCheckpoint({
            version: 1,
            accountId: viewerId,
            ids: Array.from(followerIds),
            usernames: Array.from(followerNames),
            cursor: followersCursor,
            timestamp: Date.now(),
          });
          return saved ? followerNames.size : 0;
        };

        const followersProgress = () => {
          const loaded = followerNames.size;
          return followersTotal > 0
            ? Math.min(49, Math.floor((loaded / followersTotal) * 50))
            : Math.min(45, Math.floor(loaded / 20));
        };
        if (resumed) {
          publishProgress(t('resumingFollowers')(followerNames.size), followersProgress());
        }

        const onFollowersPage = (page: ListPage, pageIndex: number): 'continue' | 'reject' => {
          if (pageIndex === 0 && !resumed && isSuspiciousEmptyFirstPage(page.users, followersTotal)) {
            return 'reject';
          }
          if (
            pageIndex === 0 &&
            resumed &&
            page.users.length > 0 &&
            page.users.every(user => followerNames.has(user.username.toLowerCase()))
          ) {
            console.warn('Instagram did not continue from the saved cursor. Saved followers are kept.');
          }
          page.users.forEach(user => addRestUserToFollowerIndex(user, followerIds, followerNames));
          report = { ...report, followersLoaded: followerNames.size };
          publishProgress(
            t('statusPhaseFollowers')(followerNames.size, followersTotal > 0 ? followersTotal : followerNames.size),
            followersProgress(),
          );
          return 'continue';
        };

        const followersWalk = await walkList(
          {
            startCursor: followersCursor,
            pageCap: pageCapFor(followersTotal, FOLLOWERS_PAGE_SAFETY_LIMIT),
          },
          walkDeps(
            cursor => fetchFollowersPage(viewerId, cursor, timings.usersPerSearchCycle),
            onFollowersPage,
            () => pacingFactorFor(followerNames.size),
            (cursor, pagesFetched) => {
              followersCursor = cursor;
              if (pagesFetched % CHECKPOINT_EVERY_PAGES === 0) {
                saveCheckpoint();
              }
            },
          ),
        );

        let followersComplete = followersWalk.end.kind === 'complete';
        if (followersComplete && followersLookTruncated(followerNames.size, followersTotal)) {
          console.warn(
            `Instagram ended the followers list at ${followerNames.size} of ${followersTotal}. Not trusting it.`,
          );
          followersComplete = false;
        }
        report = { ...report, followersComplete, followersLoaded: followerNames.size };

        if (!followersComplete) {
          const end = followersWalk.end;
          if (end.kind === 'failed') {
            console.error('followers request failed:', end.detail);
          }
          // Keep what was downloaded when continuing later can help; a list
          // that ended short or a cursor Instagram loops on would only repeat.
          const resumable =
            end.kind === 'failed' || end.kind === 'stopped' || (end.kind === 'stuck' && end.reason === 'page_cap');
          followersCursor = resumable ? followersWalk.cursor : null;
          const savedFollowers = resumable ? saveCheckpoint() : 0;
          if (!resumable) {
            clearFollowersCheckpoint(viewerId);
          }
          if (end.kind === 'failed' && isInstagramBlock(end.failure)) {
            startCooldown();
          }
          report = {
            ...report,
            savedFollowers,
            failure: end.kind === 'failed' ? end.failure : null,
          };
          const reason = end.kind === 'complete' ? 'blocked' : reasonForWalk(followersWalk);
          finish(reason, [], savedFollowers > 0 ? t('followersSavedToast')(savedFollowers) : statusForReason(reason));
          return;
        }
        clearFollowersCheckpoint(viewerId);

        // ── Phase 2: following, checked against the complete followers list ──
        // Every page is final as soon as it arrives, so results stream in.
        const followingByPk = new Map<string, RestUser>();
        const classified = new Map<string, UserNode>();

        const onFollowingPage = (page: ListPage, pageIndex: number): 'continue' | 'reject' => {
          if (pageIndex === 0 && isSuspiciousEmptyFirstPage(page.users, followingTotal)) {
            return 'reject';
          }
          absorbFollowingUsers(followingByPk, page.users);
          for (const user of page.users) {
            classified.set(user.pk, mapRestUserToNode(user, restUserFollowsViewer(user, followerIds, followerNames)));
          }
          const checked = followingByPk.size;
          report = { ...report, followingChecked: checked };
          const total = followingTotal > 0 ? followingTotal : checked;
          const progress =
            followingTotal > 0 ? 50 + Math.min(45, Math.floor((checked / followingTotal) * 45)) : Math.min(95, 50 + Math.floor(checked / 10));
          publishProgress(t('statusPhaseFollowing')(checked, total), progress, Array.from(classified.values()));
          return 'continue';
        };

        const followingWalk = await walkList(
          { startCursor: null, pageCap: pageCapFor(followingTotal, FOLLOWING_PAGE_SAFETY_LIMIT) },
          walkDeps(
            cursor => fetchFollowingPage(viewerId, cursor, timings.usersPerSearchCycle),
            onFollowingPage,
            () => 1,
          ),
        );

        const followingComplete = followingWalk.end.kind === 'complete';
        report = { ...report, followingComplete, followingChecked: followingByPk.size };
        if (followingWalk.end.kind === 'failed') {
          console.error('following request failed:', followingWalk.end.detail);
          report = { ...report, failure: followingWalk.end.failure };
          if (isInstagramBlock(followingWalk.end.failure)) {
            startCooldown();
          }
        }

        // ── Phase 3: a bounded show_many check for the few the lists did not match ──
        if (followingComplete) {
          publishProgress(t('statusClassifying'), 96);
          const unmatched = idsStillNeedingSweep(Array.from(followingByPk.values()), followerIds, followerNames);
          if (unmatched.length > 0) {
            const sweep = await fetchFollowedByMany(unmatched);
            sweep.followedByIds.forEach(id => {
              const node = classified.get(id);
              if (node) {
                classified.set(id, { ...node, follows_viewer: true });
              }
            });
          }
        }

        const results = Array.from(classified.values());
        if (followingComplete) {
          finish('completed', results, t('statusCompleted'));
        } else if (followingWalk.end.kind === 'stopped') {
          finish('stopped', results, t('statusStopped'));
        } else if (followingWalk.end.kind === 'rejected' || results.length === 0) {
          const reason = reasonForWalk(followingWalk);
          finish(reason, results, statusForReason(reason));
        } else {
          finish('partial', results, t('followingPartialTitle'));
        }
      } catch (error) {
        if (isAccountChangedError(error)) {
          finish('account_changed', [], statusForReason('account_changed'));
        } else {
          console.error('Scan error:', error);
          finish('error', [], t('statusScanError'));
        }
      } finally {
        releaseWork();
      }
    },
    [timings],
  );

  return {
    scannerState,
    startScan,
    stopScan,
    togglePause,
    isPaused: isPausedUI,
  };
};
