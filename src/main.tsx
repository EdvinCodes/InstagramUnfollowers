import React, { ChangeEvent, useEffect, useState } from 'react';
import { render } from 'preact';

// @ts-ignore
import styles from './styles.scss';

import { UserNode } from './model/user';
import { Toast } from './components/Toast';
import { UserCheckIcon } from './components/icons/UserCheckIcon';
import { UserUncheckIcon } from './components/icons/UserUncheckIcon';
import {
  DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
  DEFAULT_TIME_BETWEEN_UNFOLLOWS,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
  INSTAGRAM_HOSTNAME,
  WHITELISTED_RESULTS_STORAGE_KEY,
} from './constants/constants';
import { assertUnreachable, getCurrentPageUnfollowers, getUsersForDisplay } from './utils/utils';
import { identifyNewUnfollowers, saveScanSnapshot } from './utils/history';

import { NotSearching } from './components/NotSearching';
import { State } from './model/state';
import { Searching } from './components/Searching';
import { Toolbar } from './components/Toolbar';
import { Unfollowing } from './components/Unfollowing';
import { Timings } from './model/timings';

import { useScanner } from './hooks/useScanner';
import { useUnfollowerQueue } from './hooks/useUnfollowerQueue';

function App() {
  const [state, setState] = useState<State>({
    status: 'initial',
  });

  const [toast, setToast] = useState<
    { readonly show: false } | { readonly show: true; readonly text: string }
  >({
    show: false,
  });

  const [timings, setTimings] = useState<Timings>({
    timeBetweenSearchCycles: DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
    timeToWaitAfterFiveSearchCycles: DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
    timeBetweenUnfollows: DEFAULT_TIME_BETWEEN_UNFOLLOWS,
    timeToWaitAfterFiveUnfollows: DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
  });

  // Inicialización de Hooks
  const {
    scannerState,
    startScan,
    togglePause: toggleScanPause,
    isPaused: isScanPaused,
  } = useScanner(timings);
  const {
    unfollowerState,
    startUnfollowing,
    togglePause: toggleUnfollowPause,
    isPaused: isUnfollowPaused,
  } = useUnfollowerQueue(timings);

  let isActiveProcess: boolean;
  switch (state.status) {
    case 'initial': {
      isActiveProcess = false;
      break;
    }
    case 'scanning': {
      isActiveProcess = scannerState.isScanning;
      break;
    }
    case 'unfollowing': {
      isActiveProcess = unfollowerState.isUnfollowing;
      break;
    }
    default: {
      assertUnreachable(state);
    }
  }

  // Sincronización del Escáner
  useEffect(() => {
    if (state.status === 'scanning') {
      // 1. Obtenemos los resultados brutos del hook
      let processedResults = [...scannerState.results];

      // CONDICIÓN RELAJADA: Entramos si ha terminado O si el progreso es 100
      const isFinished =
        !scannerState.isScanning &&
        (scannerState.progress >= 99 || scannerState.statusMessage === 'Completed');

      if (isFinished) {
        // 1. Calculamos los nuevos
        processedResults = identifyNewUnfollowers(scannerState.results);

        // 2. Guardamos snapshot
        saveScanSnapshot(processedResults);

        // 3. Log de depuración para ver si hay algún "new" detectado
        const totalNew = processedResults.filter(u => u.is_new_unfollower).length;

        if (totalNew > 0) {
          setToast({ show: true, text: `Scan finished! Found ${totalNew} new unfollowers.` });
        } else {
          setToast({ show: true, text: 'Scanning completed!' });
        }
      }

      setState(prev => ({
        ...prev,
        results: processedResults, // <--- ¡AQUÍ ESTÁ LA CLAVE! Usamos la versión procesada
        percentage: scannerState.progress,
      }));
    }
  }, [scannerState, state.status]);

  // Sincronización del Unfollower
  useEffect(() => {
    if (state.status === 'unfollowing') {
      setState(prev => {
        if (prev.status !== 'unfollowing') {
          return prev;
        }
        return {
          ...prev,
          percentage: unfollowerState.progress,
          unfollowLog: unfollowerState.unfollowLog,
        };
      });

      if (!unfollowerState.isUnfollowing && unfollowerState.progress === 100) {
        setToast({ show: true, text: 'Unfollow process finished!' });
      }
    }
  }, [unfollowerState, state.status]);

  const onScan = async () => {
    if (state.status !== 'initial') {
      return;
    }
    const whitelistedResultsFromStorage: string | null = localStorage.getItem(
      WHITELISTED_RESULTS_STORAGE_KEY,
    );
    const whitelistedResults: readonly UserNode[] =
      whitelistedResultsFromStorage === null ? [] : JSON.parse(whitelistedResultsFromStorage);

    setState({
      status: 'scanning',
      page: 1,
      searchTerm: '',
      currentTab: 'non_whitelisted',
      percentage: 0,
      results: [],
      selectedResults: [],
      whitelistedResults,
      filter: {
        showNonFollowers: true,
        showFollowers: false,
        showVerified: true,
        showPrivate: true,
        showWithOutProfilePicture: true,
      },
    });

    startScan();
  };

  const handleScanFilter = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== 'scanning') {
      return;
    }

    if (state.selectedResults.length > 0) {
      if (!confirm('Changing filter options will clear selected users')) {
        setState({ ...state });
        return;
      }
    }
    setState({
      ...state,
      selectedResults: [],
      filter: {
        ...state.filter,
        [e.currentTarget.name]: e.currentTarget.checked,
      },
    });
  };

  const handleUnfollowFilter = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== 'unfollowing') {
      return;
    }
    setState({
      ...state,
      filter: {
        ...state.filter,
        [e.currentTarget.name]: e.currentTarget.checked,
      },
    });
  };

  const toggleUser = (newStatus: boolean, user: UserNode) => {
    if (state.status !== 'scanning') {
      return;
    }
    if (newStatus) {
      setState({ ...state, selectedResults: [...state.selectedResults, user] });
    } else {
      setState({
        ...state,
        selectedResults: state.selectedResults.filter(result => result.id !== user.id),
      });
    }
  };

  const toggleAllUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== 'scanning') {
      return;
    }
    if (e.currentTarget.checked) {
      setState({
        ...state,
        selectedResults: getUsersForDisplay(
          state.results,
          state.whitelistedResults,
          state.currentTab,
          state.searchTerm,
          state.filter,
        ),
      });
    } else {
      setState({ ...state, selectedResults: [] });
    }
  };

  const toggleCurrentePageUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== 'scanning') {
      return;
    }
    if (e.currentTarget.checked) {
      setState({
        ...state,
        selectedResults: getCurrentPageUnfollowers(
          getUsersForDisplay(
            state.results,
            state.whitelistedResults,
            state.currentTab,
            state.searchTerm,
            state.filter,
          ),
          state.page,
        ),
      });
    } else {
      setState({ ...state, selectedResults: [] });
    }
  };

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isActiveProcess) {
        return;
      }
      e.preventDefault();
      (e as any).returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isActiveProcess]);

  // Función para disparar el proceso de Unfollow desde la UI
  const onStartUnfollowing = () => {
    if (state.status !== 'scanning' || state.selectedResults.length === 0) {
      return;
    }

    const usersToProcess = [...state.selectedResults];

    // ERROR 1 CORREGIDO: Usamos el estado anterior para no perder 'searchTerm' y 'currentTab'
    setState(prev => {
      if (prev.status !== 'scanning') {
        return prev;
      }
      return {
        ...prev,
        status: 'unfollowing',
        percentage: 0,
        unfollowLog: [], // TypeScript lo inferirá correctamente del modelo
        selectedResults: usersToProcess,
        filter: {
          ...prev.filter,
          showSucceeded: true,
          showFailed: true,
        },
      };
    });

    startUnfollowing(usersToProcess);
  };

  let markup: React.JSX.Element;
  switch (state.status) {
    case 'initial': {
      markup = <NotSearching onScan={onScan} />;
      break;
    }

    case 'scanning': {
      markup = (
        <Searching
          state={state}
          handleScanFilter={handleScanFilter}
          toggleUser={toggleUser}
          pauseScan={toggleScanPause}
          setState={setState}
          scanningPaused={isScanPaused}
          UserCheckIcon={UserCheckIcon}
          UserUncheckIcon={UserUncheckIcon}
          onStartUnfollowing={onStartUnfollowing}
        />
      );
      break;
    }

    case 'unfollowing': {
      markup = (
        <Unfollowing
          state={state}
          handleUnfollowFilter={handleUnfollowFilter}
          isPaused={isUnfollowPaused}
          togglePause={toggleUnfollowPause}
        />
      );
      break;
    }

    default: {
      assertUnreachable(state);
    }
  }

  return (
    <main id='main' role='main' className='iu'>
      <style>{styles.toString()}</style>

      <section className='overlay'>
        <Toolbar
          state={state}
          setState={setState}
          scanningPaused={state.status === 'scanning' ? isScanPaused : isUnfollowPaused}
          isActiveProcess={isActiveProcess}
          toggleAllUsers={toggleAllUsers}
          toggleCurrentePageUsers={toggleCurrentePageUsers}
          setTimings={setTimings}
          currentTimings={timings}
          onShowToast={text => {
            setToast({ show: true, text });
          }}
        />

        {markup}

        {/* Mensajes de estado de los hooks */}
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: 5,
            borderRadius: 5,
            pointerEvents: 'none',
          }}
        >
          {state.status === 'scanning' && scannerState.statusMessage}
          {state.status === 'unfollowing' && unfollowerState.statusMessage}
        </div>

        {toast.show && (
          <Toast
            show={toast.show}
            message={toast.text}
            onClose={() => {
              setToast({ show: false });
            }}
          />
        )}
      </section>
    </main>
  );
}

const APP_ID = 'ig-unfollower-pro-overlay';

if (location.hostname !== INSTAGRAM_HOSTNAME) {
  alert('This tool only works inside Instagram.');
} else {
  if (!document.getElementById(APP_ID)) {
    const appHost = document.createElement('div');
    appHost.id = APP_ID;
    appHost.style.position = 'fixed';
    appHost.style.top = '0';
    appHost.style.left = '0';
    appHost.style.width = '100vw';
    appHost.style.height = '100vh';
    appHost.style.zIndex = '99999';
    appHost.style.pointerEvents = 'none';

    document.body.appendChild(appHost);
    const shadowRoot = appHost.attachShadow({ mode: 'open' });

    render(<App />, shadowRoot as unknown as Element);
  }
}
