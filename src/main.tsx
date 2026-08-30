import './publicPath';

import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { render } from 'preact';

// @ts-ignore
import styles from './styles.scss';

import { UserNode } from './model/user';
import { Toast } from './components/Toast';
import { UserCheckIcon } from './components/icons/UserCheckIcon';
import { UserUncheckIcon } from './components/icons/UserUncheckIcon';
import {
  CHROME_LAST_SCAN_DATE_KEY,
  DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
  DEFAULT_TIME_BETWEEN_UNFOLLOWS,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
  INSTAGRAM_HOSTNAME,
  WHITELISTED_RESULTS_STORAGE_KEY,
} from './constants/constants';
import {
  assertUnreachable,
  getCurrentPageUnfollowers,
  getUsersForDisplay,
  getDynamicStorageKey,
  isChromeStorageAvailable,
  viewerFollowsBack,
} from './utils/utils';
import { identifyNewUnfollowers, saveScanSnapshot } from './utils/history';

import { NotSearching } from './components/NotSearching';
import { State } from './model/state';
import { Searching } from './components/Searching';
import { Toolbar } from './components/Toolbar';
import { Unfollowing } from './components/Unfollowing';
import { Timings } from './model/timings';

import { useScanner } from './hooks/useScanner';
import { useUnfollowerQueue } from './hooks/useUnfollowerQueue';
import { useLicense } from './hooks/useLicense';

import { HistoryService } from './services/historyService';
import { Logo } from './components/icons/Logo';

import { startRealtimeMonitor, isMonitorEnabled } from './services/realtimeMonitor';
import { CloudSync } from './services/cloudSync';

import { GrowthView } from './components/GrowthView';
import { createInitialGrowthState } from './model/growth-state';
import { PendingRequestsView } from './components/PendingRequestsView';
import { createInitialPendingState } from './model/pending-requests-state';
import { MetaImportView } from './components/MetaImportView';
import { CleanListsView } from './components/CleanListsView';
import { createInitialCleanListsState } from './model/clean-lists-state';
import { buildCommunityDiff, communityDiffCount } from './utils/metaDiff';
import { buildMetaScanResults, loadMetaScanSnapshot, markNewMetaUnfollowers, saveMetaCommunitySnapshot } from './utils/metaScan';

import { HistoryView } from './components/HistoryView';
import { subscribeLocale, t } from './i18n/i18n';

type ToastStyle = 'success' | 'error' | 'warning' | 'info';
type ToastState =
  | { readonly show: false }
  | { readonly show: true; readonly text: string; readonly style: ToastStyle };

function App() {
  const [state, setState] = useState<State>({
    status: 'initial',
  });

  const [toast, setToast] = useState<ToastState>({
    show: false,
  });

  const [isMinimized, setIsMinimized] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [, setLocaleTick] = useState(0);

  const { isPro, isLoading, activatePro, deactivatePro } = useLicense();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [timings, setTimings] = useState<Timings>({
    timeBetweenSearchCycles: DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
    timeToWaitAfterFiveSearchCycles: DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
    timeBetweenUnfollows: DEFAULT_TIME_BETWEEN_UNFOLLOWS,
    timeToWaitAfterFiveUnfollows: DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
  });

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

  const showToast = useCallback((text: string, style: ToastStyle = 'info') => {
    setToast({ show: true, text, style });
  }, []);

  const hideToast = useCallback(() => {
    setToast({ show: false });
  }, []);

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
    case 'growth': {
      isActiveProcess = state.isRunning;
      break;
    }
    case 'pending_requests': {
      isActiveProcess = state.isRunning;
      break;
    }
    case 'meta_import': {
      isActiveProcess = false;
      break;
    }
    case 'clean_lists': {
      isActiveProcess = false;
      break;
    }
    default: {
      assertUnreachable(state);
    }
  }

  useEffect(() => subscribeLocale(() => setLocaleTick(tick => tick + 1)), []);

  useEffect(() => {
    const storedTheme = localStorage.getItem('ig_unfollowers_theme');
    if (storedTheme === 'light') {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (isMonitorEnabled()) {
      startRealtimeMonitor();
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('ig_unfollowers_theme', newTheme);
  };

  const currentPercentage = state.status === 'scanning' ? state.percentage : 0;

  useEffect(() => {
    if (state.status !== 'scanning' || state.source === 'meta') {
      return;
    }

    const isFinished = !scannerState.isScanning && scannerState.finishReason !== null;
    const isJustFinished = isFinished && currentPercentage !== 100;
    let processedResults = [...scannerState.results];

    if (isJustFinished) {
      const scanCompleted = scannerState.finishReason === 'completed';
      let newTraitors: UserNode[] = [];
      if (scanCompleted) {
        processedResults = identifyNewUnfollowers(scannerState.results);
        newTraitors = processedResults.filter(u => u.is_new_unfollower && !viewerFollowsBack(u));

        saveScanSnapshot(processedResults);

        if (isPro && CloudSync.isConfigured()) {
          const history = HistoryService.getHistory();
          const wlKey = getDynamicStorageKey(WHITELISTED_RESULTS_STORAGE_KEY);
          const wlRaw = localStorage.getItem(wlKey);
          const whitelist = wlRaw ? (JSON.parse(wlRaw) as UserNode[]) : [];
          void CloudSync.sync(history, whitelist);
        }

        if (newTraitors.length > 0) {
          newTraitors.forEach(traitor => HistoryService.addEvent('DETECTED_UNFOLLOWER', traitor));
        }
      }

      switch (scannerState.finishReason) {
        case 'rate_limit':
          showToast(t('scanStoppedRateLimit'), 'warning');
          break;
        case 'error':
        case 'stopped':
          showToast(t('scanErrorToast'), 'warning');
          break;
        case 'no_session':
          showToast(t('statusNoSession'), 'error');
          break;
        case 'completed': {
          const totalNew = newTraitors.length;
          if (totalNew > 0) {
            showToast(t('scanFinishedNew')(totalNew), 'success');
          } else {
            showToast(t('scanCompletedToast'), 'success');
          }
          break;
        }
        default:
          break;
      }
    }

    setState(prev => {
      if (prev.status !== 'scanning') {
        return prev;
      }

      if (isFinished && prev.percentage === 100) {
        return prev;
      }

      return {
        ...prev,
        results: isJustFinished ? processedResults : scannerState.results,
        percentage: isFinished ? 100 : scannerState.progress,
      };
    });
  }, [scannerState, state.status, currentPercentage, isPro, showToast]);

  useEffect(() => {
    if (state.status !== 'unfollowing') {
      return;
    }

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

    if (!unfollowerState.isUnfollowing) {
      if (unfollowerState.statusMessage === t('statusRateLimited')) {
        showToast(t('scanStoppedRateLimit'), 'warning');
      } else if (unfollowerState.progress === 100) {
        showToast(t('unfollowFinished'), 'success');
      }
    }
  }, [unfollowerState, state.status, showToast]);

  const onScan = async () => {
    if (state.status !== 'initial') {
      return;
    }

    if (isChromeStorageAvailable()) {
      chrome.storage.local.set({ [CHROME_LAST_SCAN_DATE_KEY]: Date.now() });
    }

    const dynamicWhitelistKey = getDynamicStorageKey(WHITELISTED_RESULTS_STORAGE_KEY);
    const whitelistedResultsFromStorage: string | null = localStorage.getItem(dynamicWhitelistKey);

    let whitelistedResults: readonly UserNode[] = [];
    if (whitelistedResultsFromStorage !== null) {
      try {
        whitelistedResults = JSON.parse(whitelistedResultsFromStorage);
      } catch {
        localStorage.removeItem(dynamicWhitelistKey);
      }
    }

    setState({
      status: 'scanning',
      source: 'live',
      page: 1,
      searchTerm: '',
      currentTab: 'non_whitelisted',
      percentage: 0,
      results: [],
      selectedResults: [],
      whitelistedResults,
      filter: {
        showVerified: false,
        showPrivate: false,
        showWithOutProfilePicture: false,
        showGhostsOnly: false,
      },
    });

    startScan();
  };

  const handleScanFilter = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== 'scanning') {
      return;
    }

    if (state.selectedResults.length > 0) {
      if (!confirm(t('confirmFilterChange'))) {
        e.currentTarget.checked = !e.currentTarget.checked;
        setState({ ...state });
        return;
      }
    }

    setState({
      ...state,
      page: 1,
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
          t,
        ),
      });
    } else {
      setState({ ...state, selectedResults: [] });
    }
  };

  const toggleCurrentPageUsers = (e: ChangeEvent<HTMLInputElement>) => {
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
            t,
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

  const applyMetaScan = (following: { username: string; fullName: string }[], followers: { username: string; fullName: string }[]) => {
    const dynamicWhitelistKey = getDynamicStorageKey(WHITELISTED_RESULTS_STORAGE_KEY);
    const whitelistedResultsFromStorage: string | null = localStorage.getItem(dynamicWhitelistKey);
    let whitelistedResults: readonly UserNode[] = [];
    if (whitelistedResultsFromStorage !== null) {
      try {
        whitelistedResults = JSON.parse(whitelistedResultsFromStorage);
      } catch {
        localStorage.removeItem(dynamicWhitelistKey);
      }
    }

    const previous = loadMetaScanSnapshot();
    const built = buildMetaScanResults(following, followers);
    const processed = markNewMetaUnfollowers(built);
    const metaDiff = buildCommunityDiff(previous, following, followers);
    saveMetaCommunitySnapshot(following, followers);

    const nonFollowers = processed.filter(user => !user.follows_viewer).length;
    const hasChanges = !!metaDiff && communityDiffCount(metaDiff) > 0;
    setState({
      status: 'scanning',
      source: 'meta',
      page: 1,
      searchTerm: '',
      currentTab: hasChanges ? 'changes' : 'non_whitelisted',
      percentage: 100,
      results: processed,
      selectedResults: [],
      whitelistedResults,
      filter: {
        showVerified: false,
        showPrivate: false,
        showWithOutProfilePicture: false,
        showGhostsOnly: false,
      },
      metaDiff,
    });
    if (hasChanges && metaDiff) {
      showToast(
        t('metaDiffImported')(
          metaDiff.theyUnfollowed.length,
          metaDiff.youUnfollowed.length,
          metaDiff.youFollowed.length,
          metaDiff.newFollowers.length,
        ),
        'success',
      );
    } else if (previous && previous.following.length + previous.followers.length > 0) {
      showToast(t('metaImported')(following.length, followers.length, nonFollowers), 'success');
    } else {
      showToast(t('metaDiffBaselineSaved')(following.length, followers.length), 'success');
    }
  };

  const onStartUnfollowing = (actionType: 'unfollow' | 'remove_follower' = 'unfollow') => {
    if (state.status !== 'scanning' || state.selectedResults.length === 0) {
      return;
    }
    if (state.source === 'meta') {
      showToast(t('metaUnfollowDisabled'), 'warning');
      return;
    }

    const usersToProcess = [...state.selectedResults];

    setState(prev => {
      if (prev.status !== 'scanning') {
        return prev;
      }

      return {
        ...prev,
        status: 'unfollowing',
        percentage: 0,
        unfollowLog: [],
        selectedResults: usersToProcess,
        filter: {
          ...prev.filter,
          showSucceeded: true,
          showFailed: true,
        },
      };
    });

    startUnfollowing(usersToProcess, actionType);
  };

  let isPageSelected = false;
  let isAllSelected = false;

  if (state.status === 'scanning') {
    const usersDisplayed = getUsersForDisplay(
      state.results,
      state.whitelistedResults,
      state.currentTab,
      state.searchTerm,
      state.filter,
      t,
    );
    const usersOnCurrentPage = getCurrentPageUnfollowers(usersDisplayed, state.page);
    isPageSelected =
      usersOnCurrentPage.length > 0 &&
      usersOnCurrentPage.every(u => state.selectedResults.some(s => s.id === u.id));
    isAllSelected =
      usersDisplayed.length > 0 && usersDisplayed.length === state.selectedResults.length;
  }

  let markup: React.JSX.Element;
  switch (state.status) {
    case 'initial': {
      markup = (
        <NotSearching
          onScan={onScan}
          onGrowth={() => setState(createInitialGrowthState())}
          onPendingRequests={() => setState(createInitialPendingState())}
          onMetaImport={() => setState({ status: 'meta_import' })}
          onCleanLists={() => setState(createInitialCleanListsState())}
          onHistory={() => setHistoryOpen(true)}
          isPro={isPro}
        />
      );
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
          isPro={isPro}
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
    case 'growth': {
      markup = (
        <GrowthView
          state={state}
          setState={setState}
          onBack={() => setState({ status: 'initial' })}
          isPro={isPro}
          onShowToast={text => showToast(text, 'info')}
        />
      );
      break;
    }
    case 'pending_requests': {
      markup = (
        <PendingRequestsView
          state={state}
          setState={setState}
          timings={timings}
          isPro={isPro}
          onShowToast={showToast}
        />
      );
      break;
    }
    case 'meta_import': {
      markup = (
        <MetaImportView
          onImported={applyMetaScan}
          onBack={() => setState({ status: 'initial' })}
          onShowToast={showToast}
        />
      );
      break;
    }
    case 'clean_lists': {
      markup = <CleanListsView state={state} setState={setState} onShowToast={showToast} />;
      break;
    }
    default: {
      assertUnreachable(state);
    }
  }

  const processStatus =
    state.status === 'scanning'
      ? state.source === 'meta'
        ? t('metaOfflineBanner')
        : scannerState.statusMessage
      : state.status === 'unfollowing'
        ? unfollowerState.statusMessage
        : state.status === 'pending_requests'
          ? state.statusMessage
          : state.status === 'clean_lists' && state.phase === 'lists'
            ? t('cleanReadOnlyBanner')
            : '';

  return (
    <main
      id='main'
      role='main'
      className={`iu theme-${theme}`}
      style={
        isMinimized
          ? {
              background: 'transparent',
              backgroundImage: 'none',
              pointerEvents: 'none',
            }
          : {}
      }
    >
      <style>{styles.toString()}</style>

      {isMinimized ? (
        <button
          type='button'
          className='launcher-fab'
          onClick={() => setIsMinimized(false)}
          title={t('openTool')}
          aria-label={t('openTool')}
        >
          <span className='launcher-fab__logo'>
            <Logo />
          </span>
        </button>
      ) : (
        <section className='overlay'>
          <Toolbar
            state={state}
            setState={setState}
            scanningPaused={state.status === 'scanning' ? isScanPaused : isUnfollowPaused}
            isActiveProcess={isActiveProcess}
            toggleAllUsers={toggleAllUsers}
            toggleCurrentPageUsers={toggleCurrentPageUsers}
            setTimings={setTimings}
            currentTimings={timings}
            onShowToast={text => showToast(text, 'success')}
            isPageSelected={isPageSelected}
            isAllSelected={isAllSelected}
            onMinimize={() => setIsMinimized(true)}
            theme={theme}
            toggleTheme={toggleTheme}
            isPro={isPro}
            activatePro={activatePro}
            deactivatePro={deactivatePro}
            isLicenseLoading={isLoading}
            onOpenHistory={() => setHistoryOpen(true)}
          />

          {markup}

          {historyOpen && <HistoryView onClose={() => setHistoryOpen(false)} isPro={isPro} />}

          {processStatus && <div className='process-status-bar'>{processStatus}</div>}
        </section>
      )}

      {toast.show && (
        <Toast
          show={toast.show}
          message={toast.text}
          style={toast.style}
          closeLabel={t('closeNotification')}
          onClose={hideToast}
        />
      )}
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
