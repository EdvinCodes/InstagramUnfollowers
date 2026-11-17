import { useState, useRef, useCallback } from 'preact/hooks';
import { UserNode } from '../model/user';
import { UnfollowLogEntry } from '../model/unfollow-log-entry';
import { Timings } from '../model/timings';
import { sleep } from '../utils/utils';
import { removeFollower, unfollowUser } from '../utils/growthApi';
import { t } from '../i18n/i18n';
import { HistoryService } from '../services/historyService';
import { assertSameViewer, currentViewerId, isAccountChangedError } from '../utils/accountGuard';
import { beginForegroundWork } from '../utils/foregroundWork';
import { cooldownSecondsLeft, formatCountdown, startCooldown } from '../utils/cooldown';

interface UnfollowerState {
  isUnfollowing: boolean;
  progress: number;
  unfollowLog: UnfollowLogEntry[];
  statusMessage: string;
}

export const useUnfollowerQueue = (timings: Timings) => {
  const [unfollowerState, setUnfollowerState] = useState<UnfollowerState>({
    isUnfollowing: false,
    progress: 0,
    unfollowLog: [],
    statusMessage: t('statusReadyToUnfollow'),
  });

  const isPausedRef = useRef<boolean>(false);
  const [isPausedUI, setIsPausedUI] = useState(false);
  const shouldStopRef = useRef<boolean>(false);

  const togglePause = useCallback(() => {
    isPausedRef.current = !isPausedRef.current;
    setIsPausedUI(isPausedRef.current);
  }, []);

  const stopUnfollowing = useCallback(() => {
    shouldStopRef.current = true;
  }, []);

  const startUnfollowing = useCallback(
    async (
      usersToUnfollow: UserNode[],
      actionType: 'unfollow' | 'remove_follower' = 'unfollow',
    ) => {
      if (usersToUnfollow.length === 0) {
        return;
      }

      shouldStopRef.current = false;
      isPausedRef.current = false;
      setIsPausedUI(false);
      setUnfollowerState({
        isUnfollowing: true,
        progress: 0,
        unfollowLog: [],
        statusMessage: t('statusStartingQueue'),
      });

      const cooldownLeft = cooldownSecondsLeft();
      if (cooldownLeft > 0) {
        setUnfollowerState(prev => ({
          ...prev,
          isUnfollowing: false,
          statusMessage: t('cooldownToast')(formatCountdown(cooldownLeft)),
        }));
        return;
      }

      const viewerId = currentViewerId();
      if (!viewerId) {
        setUnfollowerState(prev => ({
          ...prev,
          isUnfollowing: false,
          statusMessage: t('statusNoSession'),
        }));
        return;
      }

      const releaseWork = beginForegroundWork();
      let counter = 0;
      let abortedByRateLimit = false;
      let abortedBecauseIgnored = false;
      let abortedByAccountChange = false;

      try {
        for (const user of usersToUnfollow) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (shouldStopRef.current) {
            break;
          }

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          while (isPausedRef.current) {
            setUnfollowerState(prev => ({ ...prev, statusMessage: t('statusUnfollowPaused') }));
            await sleep(1000);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (shouldStopRef.current) {
              break;
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (shouldStopRef.current) {
            break;
          }

          assertSameViewer(viewerId);

          const actionText =
            actionType === 'unfollow'
              ? t('statusUnfollowing')(user.username)
              : t('statusRemoving')(user.username);
          setUnfollowerState(prev => ({
            ...prev,
            statusMessage: actionText,
          }));

          let success = false;
          try {
            const result =
              actionType === 'unfollow'
                ? await unfollowUser(user.id, user.username)
                : await removeFollower(user.id, user.username);
            if (
              result.failure === 'rate_limited' ||
              result.failure === 'action_blocked' ||
              result.failure === 'soft_block'
            ) {
              abortedByRateLimit = true;
              startCooldown();
              shouldStopRef.current = true;
              success = false;
            } else if (!result.ok && result.ignored) {
              abortedBecauseIgnored = true;
              shouldStopRef.current = true;
              success = false;
            } else {
              success = result.ok;
            }
          } catch (e) {
            if (isAccountChangedError(e)) {
              abortedByAccountChange = true;
              shouldStopRef.current = true;
            } else {
              console.error('Fetch error:', e);
            }
            success = false;
          }

          if (success) {
            const historyAction = actionType === 'unfollow' ? 'YOU_UNFOLLOWED' : 'SOFT_BLOCKED';
            HistoryService.addEvent(historyAction, user);
          }

          counter++;
          const currentPercentage = Math.floor((counter / usersToUnfollow.length) * 100);

          setUnfollowerState(prev => ({
            ...prev,
            progress: currentPercentage,
            unfollowLog: [...prev.unfollowLog, { user, unfollowedSuccessfully: success }],
          }));

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (counter < usersToUnfollow.length && !shouldStopRef.current) {
            const jitter = Math.floor(Math.random() * (timings.timeBetweenUnfollows * 0.2));
            const waitTime = timings.timeBetweenUnfollows + jitter;

            if (counter % 5 === 0) {
              setUnfollowerState(prev => ({ ...prev, statusMessage: t('statusWaitingCooldown') }));
              await sleep(timings.timeToWaitAfterFiveUnfollows);
            } else {
              await sleep(waitTime);
            }
          }
        }
      } finally {
        releaseWork();
      }

      setUnfollowerState(prev => ({
        ...prev,
        isUnfollowing: false,
        statusMessage: abortedByAccountChange
          ? t('accountChanged')
          : abortedByRateLimit
            ? t('statusRateLimited')
            : abortedBecauseIgnored
              ? t('statusUnfollowIgnored')
              : shouldStopRef.current
                ? t('statusStopped')
                : t('statusCompleted'),
      }));
    },
    [timings],
  );

  return {
    unfollowerState,
    startUnfollowing,
    stopUnfollowing,
    togglePause,
    isPaused: isPausedUI,
  };
};
