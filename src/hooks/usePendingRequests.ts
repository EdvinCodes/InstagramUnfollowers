import { useCallback, useRef } from 'preact/hooks';
import {
  cancelFollowRequest,
  type FriendshipStatus,
} from '../utils/growthApi';
import { lookupUserByUsername } from '../utils/igUserLookup';
import type { PendingLogEntry, PendingRequestUser } from '../model/pending-request';
import type { PendingRequestsState } from '../model/pending-requests-state';
import type { State } from '../model/state';
import { Timings } from '../model/timings';
import { HistoryService } from '../services/historyService';
import { t } from '../i18n/i18n';
import { computeBackoffMs, isRateLimitResponse } from '../utils/growthHelpers';
import {
  GROWTH_RATE_LIMIT_BACKOFF_MAX_MS,
  GROWTH_RATE_LIMIT_BACKOFF_MS,
  RATE_LIMIT_MAX_RETRIES,
} from '../constants/growth';
import { toPendingHistoryUser } from '../utils/pendingHelpers';
import { addCancelledUsernames } from '../utils/pendingStorage';
import { getCookie, sleep } from '../utils/utils';

type SetStateUpdater = (state: State | ((prev: State) => State)) => void;

export function usePendingRequests(
  setState: SetStateUpdater,
  getState: () => State,
  timings: Timings,
) {
  const stopSignal = useRef({ stopped: false });
  const isStopped = useCallback(() => stopSignal.current.stopped, []);

  const patch = useCallback(
    (update: Partial<PendingRequestsState>) => {
      setState(prev => (prev.status === 'pending_requests' ? { ...prev, ...update } : prev));
    },
    [setState],
  );

  const setStatus = useCallback(
    (statusMessage: string) => {
      patch({ statusMessage });
    },
    [patch],
  );

  const addResult = useCallback(
    (kind: PendingLogEntry['kind'], username: string, text: string) => {
      setState(prev => {
        if (prev.status !== 'pending_requests') {
          return prev;
        }
        return {
          ...prev,
          logs: [...prev.logs, { kind, username, text }],
          statusMessage: text,
        };
      });
    },
    [setState],
  );

  const stopCancel = useCallback(() => {
    stopSignal.current.stopped = true;
  }, []);

  const togglePause = useCallback(() => {
    setState(prev =>
      prev.status === 'pending_requests' ? { ...prev, isPaused: !prev.isPaused } : prev,
    );
  }, [setState]);

  const startCancel = useCallback(
    async (usersToCancel: readonly PendingRequestUser[]) => {
      if (usersToCancel.length === 0) {
        return;
      }

      stopSignal.current.stopped = false;
      patch({
        phase: 'running',
        isRunning: true,
        isPaused: false,
        logs: [],
        queueTotal: usersToCancel.length,
        processedCount: 0,
        cancelledCount: 0,
        skippedCount: 0,
        failedCount: 0,
        percentage: 0,
        searchTerm: '',
        statusMessage: t('pendingStatusStarting'),
      });

      const csrftoken = getCookie('csrftoken');
      if (!csrftoken) {
        addResult('fail', '', t('pendingNoCsrf'));
        patch({ isRunning: false });
        return;
      }

      let processed = 0;
      let cancelled = 0;
      let skipped = 0;
      let failed = 0;
      let abortedByRateLimit = false;

      const waitIfPaused = async () => {
        while (!isStopped()) {
          const current = getState();
          if (current.status !== 'pending_requests' || !current.isPaused) {
            break;
          }
          setStatus(t('pendingPaused'));
          await sleep(1000);
        }
      };

      const interruptibleSleep = async (ms: number) => {
        const end = Date.now() + ms;
        while (Date.now() < end && !isStopped()) {
          await waitIfPaused();
          if (isStopped()) {
            break;
          }
          await sleep(Math.min(1000, end - Date.now()));
        }
      };

      // Instagram rate-limits this endpoint hard (GET web_profile_info especially) once a queue
      // gets into the thousands. Instead of dying on the very first 429 like before, back off
      // with growing delays and retry automatically — only give up for good after several
      // consecutive failures in a row.
      let consecutiveRateLimitHits = 0;

      const backoffAndRetry = async (): Promise<boolean> => {
        consecutiveRateLimitHits += 1;
        if (consecutiveRateLimitHits > RATE_LIMIT_MAX_RETRIES) {
          abortedByRateLimit = true;
          return false;
        }

        const waitMs = computeBackoffMs(
          consecutiveRateLimitHits,
          GROWTH_RATE_LIMIT_BACKOFF_MS,
          GROWTH_RATE_LIMIT_BACKOFF_MAX_MS,
        );
        const endAt = Date.now() + waitMs;
        while (Date.now() < endAt && !isStopped()) {
          await waitIfPaused();
          if (isStopped()) {
            break;
          }
          const remainingSeconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
          setStatus(t('pendingRetryingIn')(remainingSeconds));
          await sleep(Math.min(1000, Math.max(0, endAt - Date.now())) || 1);
        }
        return !isStopped();
      };

      for (const user of usersToCancel) {
        await waitIfPaused();
        if (isStopped()) {
          break;
        }

        let lookupId: string | null = null;
        let friendship: FriendshipStatus | null = null;
        let handled = false;
        let aborted = false;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (!handled) {
          if (isStopped()) {
            aborted = true;
            break;
          }

          if (lookupId === null) {
            setStatus(t('pendingLookingUp')(user.username));
            const lookup = await lookupUserByUsername(user.username);

            if (isRateLimitResponse(lookup.status)) {
              if (!(await backoffAndRetry())) {
                aborted = true;
                break;
              }
              continue;
            }
            consecutiveRateLimitHits = 0;

            if (!lookup.id) {
              const transient =
                lookup.status === 0 || lookup.status === 401 || lookup.status === 403 || lookup.status >= 500;
              failed += 1;
              processed += 1;
              if (!transient) {
                addCancelledUsernames([user.username]);
                addResult('skip', user.username, t('pendingSkipNotFound')(user.username));
              } else {
                addResult('fail', user.username, t('pendingFailed')(user.username));
              }
              patch({
                processedCount: processed,
                failedCount: failed,
                percentage: Math.floor((processed / usersToCancel.length) * 100),
              });
              handled = true;
              break;
            }

            lookupId = lookup.id;
            friendship = lookup.friendship;
          }

          await waitIfPaused();
          if (isStopped()) {
            aborted = true;
            break;
          }

          if (friendship?.following) {
            skipped += 1;
            processed += 1;
            addCancelledUsernames([user.username]);
            addResult('skip', user.username, t('pendingSkipAccepted')(user.username));
            patch({
              processedCount: processed,
              skippedCount: skipped,
              percentage: Math.floor((processed / usersToCancel.length) * 100),
            });
            handled = true;
            break;
          }

          setStatus(t('pendingCancelling')(user.username));
          const result = await cancelFollowRequest(lookupId);

          if (isRateLimitResponse(result.status, result.body)) {
            if (!(await backoffAndRetry())) {
              aborted = true;
              break;
            }
            continue;
          }
          consecutiveRateLimitHits = 0;

          processed += 1;
          if (result.ok) {
            cancelled += 1;
            addCancelledUsernames([user.username]);
            HistoryService.addEvent(
              'REQUEST_CANCELLED',
              toPendingHistoryUser(user.username, lookupId, user.fullName),
            );
            addResult('success', user.username, t('pendingSuccess')(user.username));
          } else {
            failed += 1;
            addResult('fail', user.username, t('pendingFailed')(user.username));
          }
          patch({
            processedCount: processed,
            cancelledCount: cancelled,
            failedCount: failed,
            percentage: Math.floor((processed / usersToCancel.length) * 100),
          });
          handled = true;
        }

        if (aborted) {
          break;
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- abortedByRateLimit is set inside the backoffAndRetry closure
        if (processed < usersToCancel.length && !isStopped() && !abortedByRateLimit) {
          if (processed % 5 === 0) {
            setStatus(t('pendingCooldown'));
            await interruptibleSleep(timings.timeToWaitAfterFiveUnfollows);
          } else {
            const jitter = Math.floor(Math.random() * (timings.timeBetweenUnfollows * 0.2));
            await interruptibleSleep(timings.timeBetweenUnfollows + jitter);
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- abortedByRateLimit is set inside the backoffAndRetry closure
      const finishedAll = processed >= usersToCancel.length && !abortedByRateLimit && !isStopped();
      patch({
        isRunning: false,
        isPaused: false,
        percentage: finishedAll ? 100 : Math.floor((processed / usersToCancel.length) * 100),
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- abortedByRateLimit is set inside the backoffAndRetry closure
        statusMessage: abortedByRateLimit
          ? t('pendingRateLimited')
          : isStopped()
            ? t('pendingStopped')
            : t('pendingCompleted'),
      });
    },
    [addResult, getState, isStopped, patch, setStatus, timings],
  );

  return {
    startCancel,
    stopCancel,
    togglePause,
  };
}
