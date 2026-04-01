import { useState, useRef, useCallback } from 'preact/hooks';
import { UserNode, User } from '../model/user';
import { urlGenerator, sleep } from '../utils/utils';
import { Timings } from '../model/timings';
import { t } from '../i18n/i18n';

interface ScannerState {
  isScanning: boolean;
  progress: number;
  results: UserNode[];
  statusMessage: string;
}

export const useScanner = (timings: Timings) => {
  const [scannerState, setScannerState] = useState<ScannerState>({
    isScanning: false,
    progress: 0,
    results: [],
    statusMessage: '',
  });

  const isPausedRef = useRef<boolean>(false);
  const [isPausedUI, setIsPausedUI] = useState(false);

  const shouldStopRef = useRef<boolean>(false);

  const togglePause = useCallback(() => {
    isPausedRef.current = !isPausedRef.current;
    setIsPausedUI(isPausedRef.current); // 🔄 Esto fuerza el re-render del botón
  }, []);

  const stopScan = useCallback(() => {
    shouldStopRef.current = true;
  }, []);

  const startScan = useCallback(async () => {
    shouldStopRef.current = false;
    isPausedRef.current = false;

    setScannerState(prev => ({
      ...prev,
      isScanning: true,
      results: [],
      progress: 0,
    }));

    const results: UserNode[] = [];
    let url = urlGenerator();
    let hasNext = true;
    let totalFollowed = -1;
    let currentCount = 0;
    let scrollCycle = 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (hasNext && !shouldStopRef.current) {
        // 1. Pause Logic
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

        // 2. Fetch Data
        setScannerState(prev => ({ ...prev, statusMessage: t('statusFetching') }));

        const response = await fetch(url);
        // <-- FIX QUERY HASH: Interceptamos si IG nos corta el grifo
        if (!response.ok) {
          throw new Error(
            `API Error (${response.status}). The query hash might be outdated or Instagram is temporarily blocking your requests.`,
          );
        }

        const json = await response.json();
        const data: User = json.data.user.edge_follow;

        if (totalFollowed === -1) {
          totalFollowed = data.count;
        }

        // 3. Process Data
        hasNext = data.page_info.has_next_page;
        url = urlGenerator(data.page_info.end_cursor);

        data.edges.forEach(edge => results.push(edge.node));
        currentCount += data.edges.length;

        // 4. Update State
        setScannerState({
          isScanning: true,
          results: [...results],
          progress: Math.floor((currentCount / totalFollowed) * 100),
          statusMessage: t('statusAnalyzed')(currentCount, totalFollowed),
        });

        // 5. Anti-Ban Sleep Logic
        const randomSleep =
          Math.floor(Math.random() * (timings.timeBetweenSearchCycles * 0.3)) +
          timings.timeBetweenSearchCycles;

        await sleep(randomSleep);

        scrollCycle++;
        if (scrollCycle >= 5) {
          scrollCycle = 0;
          setScannerState(prev => ({
            ...prev,
            statusMessage: t('statusCoolingDown'),
          }));
          await sleep(timings.timeToWaitAfterFiveSearchCycles);
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScannerState(prev => ({ ...prev, statusMessage: t('statusScanError') }));
    } finally {
      setScannerState(prev => ({
        ...prev,
        isScanning: false,
        statusMessage: t('statusCompleted'),
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
