import { useState, useRef, useCallback } from 'preact/hooks';
import { UserNode } from '../model/user';
import { UnfollowLogEntry } from '../model/unfollow-log-entry';
import { Timings } from '../model/timings';
import {
  getCookie,
  sleep,
  unfollowUserUrlGenerator,
  removeFollowerUrlGenerator,
} from '../utils/utils';
import { t } from '../i18n/i18n';

// 1. IMPORTAMOS EL SERVICIO DE HISTORIAL (V4.0)
import { HistoryService } from '../services/historyService';

interface UnfollowerState {
  isUnfollowing: boolean;
  progress: number; // 0 a 100
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
    setIsPausedUI(isPausedRef.current); // 🔄 Re-render inmediato
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

      // Reset de estado para un nuevo proceso
      shouldStopRef.current = false;
      isPausedRef.current = false;
      setUnfollowerState({
        isUnfollowing: true,
        progress: 0,
        unfollowLog: [],
        statusMessage: t('statusStartingQueue'),
      });

      const csrftoken = getCookie('csrftoken');
      if (!csrftoken) {
        setUnfollowerState(prev => ({
          ...prev,
          isUnfollowing: false,
          statusMessage: t('statusNoCsrf'),
        }));
        return;
      }

      let counter = 0;

      for (const user of usersToUnfollow) {
        // 1. Verificación de Parada/Pausa
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

        // 2. Acción de Unfollow
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
          // Decidimos qué endpoint usar
          const targetUrl =
            actionType === 'unfollow'
              ? unfollowUserUrlGenerator(user.id)
              : removeFollowerUrlGenerator(user.id);

          const response = await fetch(targetUrl, {
            headers: {
              'content-type': 'application/x-www-form-urlencoded',
              'x-csrftoken': csrftoken,
            },
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
          });
          success = response.ok;
        } catch (e) {
          console.error('Fetch error:', e);
          success = false;
        }

        // --- CONEXIÓN V4.0: GUARDAR EN HISTORIAL ---
        if (success) {
          const historyAction = actionType === 'unfollow' ? 'YOU_UNFOLLOWED' : 'SOFT_BLOCKED';
          HistoryService.addEvent(historyAction, user);
        }
        // -------------------------------------------

        // 3. Actualizar Log y Progreso
        counter++;
        const currentPercentage = Math.floor((counter / usersToUnfollow.length) * 100);

        setUnfollowerState(prev => ({
          ...prev,
          progress: currentPercentage,
          unfollowLog: [...prev.unfollowLog, { user, unfollowedSuccessfully: success }],
        }));

        // 4. Lógica de espera (Anti-Ban)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (counter < usersToUnfollow.length && !shouldStopRef.current) {
          // Jitter entre cada unfollow
          const jitter = Math.floor(Math.random() * (timings.timeBetweenUnfollows * 0.2));
          const waitTime = timings.timeBetweenUnfollows + jitter;

          // Pausa larga cada 5 unfollows
          if (counter % 5 === 0) {
            setUnfollowerState(prev => ({ ...prev, statusMessage: t('statusWaitingCooldown') }));
            await sleep(timings.timeToWaitAfterFiveUnfollows);
          } else {
            await sleep(waitTime);
          }
        }
      }

      setUnfollowerState(prev => ({
        ...prev,
        isUnfollowing: false,
        statusMessage: shouldStopRef.current ? t('statusStopped') : t('statusCompleted'),
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
