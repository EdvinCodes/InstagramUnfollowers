import { useRef, useCallback } from 'preact/hooks';
import type { GrowthSpeed, GrowthState } from '../model/growth-state';
import type { State } from '../model/state';
import {
  getUserId,
  getRecentPostIds,
  getCommenterIds,
  checkIfGhost,
  followUser,
} from '../utils/growthApi';

const SPEED_DELAYS: Record<GrowthSpeed, number> = {
  tortoise: 3 * 60 * 1000,
  human: 60 * 1000,
  kamikaze: 15 * 1000,
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface StopSignal {
  stopped: boolean;
}

// Tipamos setState para que acepte funciones actualizadoras (prev => newState)
type SetStateUpdater = (state: State | ((prev: State) => State)) => void;

export function useGrowth(setState: SetStateUpdater, getState: () => State) {
  const stopSignal = useRef<StopSignal>({ stopped: false });

  const addLog = useCallback(
    (msg: string) => {
      setState((prev: State) => {
        if (prev.status !== 'growth') return prev;
        const g = prev as GrowthState;
        return {
          ...g,
          logs: [...g.logs.slice(-199), `[${new Date().toLocaleTimeString()}] ${msg}`],
        };
      });
    },
    [setState],
  );

  const startGrowth = useCallback(
    async (targets: string[], speed: GrowthSpeed) => {
      stopSignal.current.stopped = false;
      const delay = SPEED_DELAYS[speed];

      setState((prev: State) => {
        if (prev.status !== 'growth') return prev;
        const g = prev as GrowthState;
        return {
          ...g,
          phase: 'scraping',
          logs: [`[${new Date().toLocaleTimeString()}] 🚀 Iniciando Growth...`],
          followedCount: 0,
          skippedCount: 0,
          totalToFollow: 0,
          commenterQueue: [],
          targetAccounts: [],
        };
      });

      const allCommenterIds: string[] = [];

      for (const rawUsername of targets) {
        if (stopSignal.current.stopped) break;

        const username = rawUsername.replace(/^@/, '').trim();
        if (!username) continue;

        addLog(`🔍 Buscando ID de @${username}...`);
        const userId = await getUserId(username);

        if (!userId) {
          addLog(`⚠️  @${username} no encontrado o privado. Saltando.`);
          continue;
        }

        addLog(`✅ @${username} → ID: ${userId}`);
        addLog(`📅 Extrayendo posts recientes de @${username}...`);

        const postIds = await getRecentPostIds(userId);

        if (postIds.length === 0) {
          addLog(`ℹ️  Sin posts en los últimos 15 días para @${username}.`);
          continue;
        }

        addLog(`📌 ${postIds.length} posts encontrados en @${username}.`);

        let commentersFromAccount = 0;

        for (const mediaId of postIds) {
          if (stopSignal.current.stopped) break;

          addLog('💬 Extrayendo comentarios de post...');
          const ids = await getCommenterIds(mediaId);

          for (const id of ids) {
            if (!allCommenterIds.includes(id)) {
              allCommenterIds.push(id);
              commentersFromAccount++;
            }
          }

          await sleep(1500);
        }

        addLog(`✅ @${username}: ${commentersFromAccount} comentaristas únicos.`);

        setState((prev: State) => {
          if (prev.status !== 'growth') return prev;
          const g = prev as GrowthState;
          return {
            ...g,
            targetAccounts: [
              ...(g.targetAccounts || []),
              {
                username,
                userId,
                postsScraped: postIds.length,
                commentersFound: commentersFromAccount,
              },
            ],
          };
        });

        await sleep(2000);
      }

      if (stopSignal.current.stopped) {
        addLog('🛑 Detenido por el usuario.');
        return;
      }

      if (allCommenterIds.length === 0) {
        addLog('⚠️  No se encontraron comentaristas.');
        setState((prev: State) => {
          if (prev.status !== 'growth') return prev;
          const g = prev as GrowthState;
          return { ...g, phase: 'done' };
        });
        return;
      }

      setState((prev: State) => {
        if (prev.status !== 'growth') return prev;
        const g = prev as GrowthState;
        return {
          ...g,
          phase: 'following',
          commenterQueue: allCommenterIds,
          totalToFollow: allCommenterIds.length,
        };
      });

      addLog(`🎯 Cola lista: ${allCommenterIds.length} usuarios a procesar.`);

      for (let i = 0; i < allCommenterIds.length; i++) {
        if (stopSignal.current.stopped) break;

        // Bucle de pausa limpio y sin variables no utilizadas (no-constant-condition solucionado)
        while (!stopSignal.current.stopped) {
          const currentState = getState();
          if (currentState.status !== 'growth') break;
          const gState = currentState as GrowthState;
          if (!gState.isPaused) break;
          await sleep(1000);
        }

        if (stopSignal.current.stopped) break;

        const currentUserId = allCommenterIds[i];
        addLog(`🔎 Verificando ${i + 1}/${allCommenterIds.length}...`);

        const ghostResult = await checkIfGhost(currentUserId);

        if (ghostResult.isGhost) {
          addLog('👻 Fantasma detectado. Saltando.');
          setState((prev: State) => {
            if (prev.status !== 'growth') return prev;
            const g = prev as GrowthState;
            return { ...g, skippedCount: (g.skippedCount || 0) + 1 };
          });
          continue;
        }

        addLog(`➕ Siguiendo a ID: ${currentUserId}...`);
        const ok = await followUser(currentUserId);

        if (ok) {
          addLog('✅ Seguido correctamente.');
          setState((prev: State) => {
            if (prev.status !== 'growth') return prev;
            const g = prev as GrowthState;
            return { ...g, followedCount: (g.followedCount || 0) + 1 };
          });
        } else {
          addLog('❌ Error al seguir (rate-limit). Esperando 2 min extra...');
          setState((prev: State) => {
            if (prev.status !== 'growth') return prev;
            const g = prev as GrowthState;
            return { ...g, skippedCount: (g.skippedCount || 0) + 1 };
          });
          await sleep(2 * 60 * 1000);
          continue;
        }

        if (i < allCommenterIds.length - 1) {
          addLog(`⏳ Esperando ${delay / 1000}s antes del siguiente follow...`);
          await sleep(delay);
        }
      }

      if (!stopSignal.current.stopped) {
        setState((prev: State) => {
          if (prev.status !== 'growth') return prev;
          const g = prev as GrowthState;
          return { ...g, phase: 'done' };
        });
        addLog('🎉 ¡Proceso completado!');
      }
    },
    [setState, getState, addLog],
  );

  const stopGrowth = useCallback(() => {
    stopSignal.current.stopped = true;
  }, []);

  return { startGrowth, stopGrowth };
}
