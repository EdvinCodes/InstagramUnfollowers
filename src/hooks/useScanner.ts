import { useState, useRef, useCallback } from 'preact/hooks';
import { UserNode, User } from '../model/user';
import { urlGenerator, sleep } from '../utils/utils';
import { Timings } from '../model/timings';
import { t } from '../i18n/i18n';

export type ScanFinishReason = 'completed' | 'rate_limit' | 'error' | 'no_session' | 'stopped';

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

    const results: UserNode[] = [];
    const seenIds = new Set<string>();

    let url: string;
    try {
      url = urlGenerator();
    } catch {
      setScannerState(prev => ({
        ...prev,
        isScanning: false,
        statusMessage: t('statusNoSession'),
        finishReason: 'no_session',
      }));
      return;
    }

    let hasNext = true;
    let totalFollowed = -1;
    let currentCount = 0;
    let scrollCycle = 0;
    let finishReason: ScanFinishReason = 'completed';

    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (hasNext && !shouldStopRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (isPausedRef.current) {
          setScannerState(prev => ({ ...prev, statusMessage: t('statusPaused') }));
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

        setScannerState(prev => ({ ...prev, statusMessage: t('statusFetching') }));
        const response = await fetch(url);

        if (response.status === 429) {
          finishReason = 'rate_limit';
          shouldStopRef.current = true;
          break;
        }

        if (!response.ok) {
          throw new Error(`API Error ${response.status}`);
        }

        const json = await response.json();
        const data: User | undefined = json?.data?.user?.edge_follow;
        if (!data) {
          throw new Error('Unexpected Instagram response');
        }

        if (totalFollowed === -1) {
          totalFollowed = data.count;
        }

        hasNext = data.page_info.has_next_page;
        url = urlGenerator(data.page_info.end_cursor);
        data.edges.forEach(edge => {
          if (!seenIds.has(edge.node.id)) {
            seenIds.add(edge.node.id);
            results.push(edge.node);
          }
        });
        currentCount = results.length;

        const progress =
          totalFollowed > 0 ? Math.min(99, Math.floor((currentCount / totalFollowed) * 100)) : 0;

        setScannerState({
          isScanning: true,
          results: [...results],
          progress,
          statusMessage: t('statusAnalyzed')(currentCount, Math.max(totalFollowed, currentCount)),
          finishReason: null,
        });

        const randomSleep =
          Math.floor(Math.random() * timings.timeBetweenSearchCycles * 0.3) +
          timings.timeBetweenSearchCycles;
        await sleep(randomSleep);

        scrollCycle++;
        if (scrollCycle >= 5) {
          scrollCycle = 0;
          setScannerState(prev => ({ ...prev, statusMessage: t('statusCoolingDown') }));
          await sleep(timings.timeToWaitAfterFiveSearchCycles);
        }
      }

      if (shouldStopRef.current && finishReason === 'completed') {
        finishReason = 'stopped';
      }
    } catch (error) {
      console.error('Scan error:', error);
      finishReason = 'error';
    } finally {
      const statusByReason: Record<ScanFinishReason, string> = {
        completed: t('statusCompleted'),
        rate_limit: t('statusRateLimited'),
        error: t('statusScanError'),
        no_session: t('statusNoSession'),
        stopped: t('statusStopped'),
      };

      setScannerState(prev => ({
        ...prev,
        isScanning: false,
        progress: finishReason === 'completed' ? 100 : prev.progress,
        results: results.length > 0 ? [...results] : prev.results,
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
