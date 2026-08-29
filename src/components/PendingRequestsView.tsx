import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createInitialPendingState } from '../model/pending-requests-state';
import type { PendingRequestUser } from '../model/pending-request';
import type { State } from '../model/state';
import { Timings } from '../model/timings';
import { usePendingRequests } from '../hooks/usePendingRequests';
import { t } from '../i18n/i18n';
import {
  estimateCancelDurationMs,
  filterPendingUsers,
  formatDurationParts,
  paginatePendingUsers,
} from '../utils/pendingHelpers';
import { parsePendingFollowRequests } from '../utils/pendingRequestsParser';
import {
  clearCancelledUsernames,
  readCancelledUsernames,
  readImportedPendingList,
  saveImportedPendingList,
} from '../utils/pendingStorage';

interface PendingRequestsViewProps {
  state: State;
  setState: (state: State | ((prev: State) => State)) => void;
  timings: Timings;
  isPro: boolean;
  onShowToast: (message: string, style?: 'success' | 'error' | 'warning' | 'info') => void;
}

const formatEta = (ms: number): string => {
  const { days, hours, minutes } = formatDurationParts(ms);
  const parts: string[] = [];
  if (days > 0) {
    parts.push(t('pendingDays')(days));
  }
  if (hours > 0) {
    parts.push(t('pendingHours')(hours));
  }
  if (minutes > 0 && days === 0) {
    parts.push(t('pendingMinutes')(minutes));
  }
  return parts.join(' ') || t('pendingMinutes')(1);
};

export const PendingRequestsView = ({
  state,
  setState,
  timings,
  isPro,
  onShowToast,
}: PendingRequestsViewProps) => {
  const [pasteText, setPasteText] = useState('');
  const [cancelledTick, setCancelledTick] = useState(0);
  const [savedList] = useState(() => readImportedPendingList());
  const fileRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const getState = useCallback(() => stateRef.current, []);
  const { startCancel, stopCancel, togglePause } = usePendingRequests(setState, getState, timings);

  const pending = state.status === 'pending_requests' ? state : null;
  const cancelled = useMemo(() => readCancelledUsernames(), [cancelledTick, pending?.cancelledCount, pending?.skippedCount]);

  const openTotal = useMemo(
    () => (pending ? filterPendingUsers(pending.users, cancelled, 'open', '') : []),
    [pending, cancelled],
  );
  const doneTotal = useMemo(
    () => (pending ? filterPendingUsers(pending.users, cancelled, 'done', '') : []),
    [pending, cancelled],
  );
  const openUsers = useMemo(
    () => (pending ? filterPendingUsers(pending.users, cancelled, 'open', pending.searchTerm) : []),
    [pending, cancelled],
  );
  const doneUsers = useMemo(
    () => (pending ? filterPendingUsers(pending.users, cancelled, 'done', pending.searchTerm) : []),
    [pending, cancelled],
  );
  const visibleUsers = pending?.tab === 'done' ? doneUsers : openUsers;
  const { pageUsers, safePage, maxPage } = paginatePendingUsers(visibleUsers, pending?.page ?? 1);

  useEffect(() => {
    if (!pending || pending.page === safePage) {
      return;
    }
    setState(prev => (prev.status === 'pending_requests' ? { ...prev, page: safePage } : prev));
  }, [pending, safePage, setState]);

  const applyUsers = (users: PendingRequestUser[], sourceName: string) => {
    if (users.length === 0) {
      onShowToast(t('pendingNoUsernames'), 'warning');
      return;
    }
    saveImportedPendingList(users, sourceName);
    setCancelledTick(tick => tick + 1);
    setState({
      ...createInitialPendingState(),
      phase: 'list',
      users,
      sourceName,
    });
    onShowToast(t('pendingImported')(users.length), 'success');
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      applyUsers(parsePendingFollowRequests(text), file.name);
    } catch {
      onShowToast(t('pendingParseError'), 'error');
    }
  };

  const handlePasteLoad = () => {
    applyUsers(parsePendingFollowRequests(pasteText), 'pasted');
  };

  const handleUseSaved = () => {
    if (!savedList || savedList.users.length === 0) {
      return;
    }
    setState({
      ...createInitialPendingState(),
      phase: 'list',
      users: savedList.users,
      sourceName: savedList.sourceName,
    });
  };

  const toggleUser = (username: string, checked: boolean) => {
    if (!pending || pending.isRunning) {
      return;
    }
    setState({
      ...pending,
      selectedUsernames: checked
        ? [...pending.selectedUsernames, username]
        : pending.selectedUsernames.filter(item => item !== username),
    });
  };

  const togglePage = (checked: boolean) => {
    if (!pending || pending.isRunning) {
      return;
    }
    const pageNames = pageUsers.map(user => user.username);
    setState({
      ...pending,
      selectedUsernames: checked
        ? Array.from(new Set([...pending.selectedUsernames, ...pageNames]))
        : pending.selectedUsernames.filter(name => !pageNames.includes(name)),
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    if (!pending || pending.isRunning) {
      return;
    }
    setState({
      ...pending,
      selectedUsernames: checked ? visibleUsers.map(user => user.username) : [],
    });
  };

  const selectedOpen = pending
    ? pending.selectedUsernames.filter(name => !cancelled.has(name))
    : [];

  const handleStart = () => {
    if (!pending || selectedOpen.length === 0) {
      return;
    }
    if (!isPro && selectedOpen.length > 1) {
      onShowToast(t('proFeatureMultiUnfollow'), 'warning');
      return;
    }
    if (!confirm(t('pendingConfirmCancel')(selectedOpen.length))) {
      return;
    }
    const selectedUsers = filterPendingUsers(pending.users, cancelled, 'open', '').filter(user =>
      selectedOpen.includes(user.username),
    );
    void startCancel(selectedUsers);
  };

  const handleResetDone = () => {
    if (!pending || pending.isRunning || doneTotal.length === 0) {
      return;
    }
    if (!confirm(t('pendingConfirmResetDone'))) {
      return;
    }
    clearCancelledUsernames();
    setCancelledTick(tick => tick + 1);
    setState({
      ...pending,
      tab: 'open',
      page: 1,
      selectedUsernames: [],
    });
  };

  if (!pending) {
    return null;
  }

  if (pending.phase === 'running') {
    const isFinished = !pending.isRunning && pending.logs.length > 0;

    return (
      <section className='flex' style={{ height: '100%', overflow: 'hidden' }}>
        <aside className='app-sidebar'>
          <menu className='flex column grow m-clear p-clear'>
            <p className='p-small' style={{ fontWeight: 'bold' }}>
              {t('filterResults2')}
            </p>
            <label className='badge m-small' style={{ cursor: 'pointer' }}>
              <input
                type='checkbox'
                checked={pending.logFilter.showSucceeded}
                onChange={event =>
                  setState({
                    ...pending,
                    logFilter: { ...pending.logFilter, showSucceeded: event.currentTarget.checked },
                  })
                }
              />
              &nbsp;{t('succeeded')}
            </label>
            <label className='badge m-small' style={{ cursor: 'pointer' }}>
              <input
                type='checkbox'
                checked={pending.logFilter.showSkipped}
                onChange={event =>
                  setState({
                    ...pending,
                    logFilter: { ...pending.logFilter, showSkipped: event.currentTarget.checked },
                  })
                }
              />
              &nbsp;{t('pendingSkipped')}
            </label>
            <label className='badge m-small' style={{ cursor: 'pointer' }}>
              <input
                type='checkbox'
                checked={pending.logFilter.showFailed}
                onChange={event =>
                  setState({
                    ...pending,
                    logFilter: { ...pending.logFilter, showFailed: event.currentTarget.checked },
                  })
                }
              />
              &nbsp;{t('failed')}
            </label>

            <div className='grow stats-box'>
              <p>
                {pending.processedCount} / {pending.queueTotal}
              </p>
              <p>
                {t('succeeded')}: {pending.cancelledCount}
              </p>
              <p>
                {t('pendingSkipped')}: {pending.skippedCount}
              </p>
              <p>
                {t('failed')}: {pending.failedCount}
              </p>
            </div>

            {!isFinished && (
              <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '10px' }}>
                <p className='p-small' style={{ fontWeight: 'bold' }}>
                  {t('actions')}
                </p>
                <button
                  type='button'
                  className={`button-control ${pending.isPaused ? 'btn-resume' : 'btn-pause'}`}
                  style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                  onClick={togglePause}
                >
                  {pending.isPaused ? t('resume') : t('pause')}
                </button>
                <button type='button' className='unfollow btn-danger' onClick={stopCancel}>
                  {t('growthStop')}
                </button>
              </div>
            )}

            {isFinished && (
              <button
                type='button'
                className='btn pending-back-btn'
                onClick={() => {
                  setCancelledTick(tick => tick + 1);
                  setState({
                    ...pending,
                    phase: 'list',
                    logs: [],
                    searchTerm: '',
                    page: 1,
                    tab: 'open',
                    selectedUsernames: [],
                  });
                }}
              >
                {t('pendingBackToList')}
              </button>
            )}
          </menu>
        </aside>

        <article
          className='unfollow-log-container'
          style={{ flex: 1, overflowY: 'auto', height: '100%', paddingBottom: '20px' }}
        >
          {isFinished && (
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <hr />
              <div className='fs-large p-medium clr-green'>{t('allDone')}</div>
              <hr />
            </div>
          )}
          {pending.logs.map((entry, index) => {
            if (
              (entry.kind === 'success' && !pending.logFilter.showSucceeded) ||
              (entry.kind === 'skip' && !pending.logFilter.showSkipped) ||
              (entry.kind === 'fail' && !pending.logFilter.showFailed)
            ) {
              return null;
            }
            if (
              pending.searchTerm &&
              !entry.username.toLowerCase().includes(pending.searchTerm.toLowerCase()) &&
              !entry.text.toLowerCase().includes(pending.searchTerm.toLowerCase())
            ) {
              return null;
            }
            const label =
              entry.kind === 'success'
                ? t('succeeded')
                : entry.kind === 'skip'
                  ? t('pendingSkipped')
                  : t('failed');
            return (
              <div
                key={`${entry.username}-${index}`}
                className={entry.kind === 'fail' ? 'p-medium clr-red' : 'p-medium'}
              >
                {label}
                {entry.username && (
                  <a
                    className='clr-inherit'
                    target='_blank'
                    href={`https://www.instagram.com/${entry.username}`}
                    rel='noreferrer'
                    style={{ fontWeight: 'bold', textDecoration: 'none' }}
                  >
                    &nbsp;{entry.username}
                  </a>
                )}
                <span className='clr-cyan'>&nbsp; [{index + 1}/{pending.queueTotal}]</span>
              </div>
            );
          })}
        </article>
      </section>
    );
  }

  if (pending.phase === 'setup') {
    return (
      <div className='empty-state-container pending-setup'>
        <h2 className='empty-state-title' style={{ fontSize: '1.7rem' }}>
          {t('pendingTitle')}
        </h2>
        <p className='pending-setup-lead'>{t('pendingDescription')}</p>

        <div className='pending-how'>
          <h3>{t('pendingHowTitle')}</h3>
          <ol>
            <li>{t('pendingHow1')}</li>
            <li>{t('pendingHow2')}</li>
            <li>{t('pendingHow3')}</li>
            <li>{t('pendingHow4')}</li>
            <li>{t('pendingHow5')}</li>
          </ol>
          <p className='pending-how-note'>{t('pendingHowNote')}</p>
        </div>

        {savedList && savedList.users.length > 0 && (
          <>
            <p className='pending-how-note'>{t('pendingSavedList')}</p>
            <button type='button' className='btn growth-entry-btn' onClick={handleUseSaved}>
              {t('pendingUseSaved')} ({savedList.users.length})
            </button>
          </>
        )}

        <input
          ref={fileRef}
          type='file'
          accept='.html,.json,.txt,.csv'
          hidden
          onChange={event => {
            void handleFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <button type='button' className='run-scan-btn pending-upload-btn' onClick={() => fileRef.current?.click()}>
          {t('pendingUploadBtn')}
        </button>

        <label className='pending-paste-label' htmlFor='pending-paste'>
          {t('pendingOrPaste')}
        </label>
        <textarea
          id='pending-paste'
          className='pending-paste'
          rows={4}
          placeholder={t('pendingPastePlaceholder')}
          value={pasteText}
          onKeyDown={event => event.stopPropagation()}
          onChange={event => setPasteText(event.currentTarget.value)}
        />
        <button type='button' className='btn growth-entry-btn' onClick={handlePasteLoad} disabled={!pasteText.trim()}>
          {t('pendingLoadPasted')}
        </button>
        <button type='button' className='btn pending-back-btn' onClick={() => setState({ status: 'initial' })}>
          {t('pendingBack')}
        </button>
      </div>
    );
  }

  const eta = formatEta(estimateCancelDurationMs(selectedOpen.length || openTotal.length, timings));
  const pageSelected =
    pageUsers.length > 0 && pageUsers.every(user => pending.selectedUsernames.includes(user.username));
  const allSelected = visibleUsers.length > 0 && visibleUsers.length === pending.selectedUsernames.length;

  return (
    <section className='flex pending-list-layout'>
      <aside className='app-sidebar'>
        <p style={{ fontWeight: 'bold' }}>{t('pendingTitle')}</p>
        <div className='grow stats-box'>
          <p>{t('pendingImported')(pending.users.length)}</p>
          <p>{t('pendingOpenCount')(openTotal.length)}</p>
          <p>{t('pendingDoneCount')(doneTotal.length)}</p>
          <p className='pending-eta'>{t('pendingTimeEstimate')(eta)}</p>
        </div>
        <p className='pending-warning'>{t('pendingWarning')}</p>

        <div className='pending-select-row'>
          <label>
            <input
              type='checkbox'
              checked={pageSelected}
              disabled={pending.isRunning || pending.tab === 'done' || pageUsers.length === 0}
              onChange={event => togglePage(event.currentTarget.checked)}
            />
            {t('pendingSelectPage')}
          </label>
          <label>
            <input
              type='checkbox'
              checked={allSelected}
              disabled={pending.isRunning || pending.tab === 'done' || visibleUsers.length === 0}
              onChange={event => toggleAllVisible(event.currentTarget.checked)}
            />
            {t('pendingSelectAll')}
          </label>
        </div>

        <div className='pagination-controls'>
          <p>{t('pages')}</p>
          <div className='pagination-row'>
            <button
              type='button'
              className='btn-icon'
              disabled={safePage <= 1}
              onClick={() => setState({ ...pending, page: safePage - 1, selectedUsernames: pending.selectedUsernames })}
            >
              ‹
            </button>
            <span className='page-indicator'>
              {safePage} / {maxPage}
            </span>
            <button
              type='button'
              className='btn-icon'
              disabled={safePage >= maxPage}
              onClick={() => setState({ ...pending, page: safePage + 1 })}
            >
              ›
            </button>
          </div>
        </div>

        {!pending.isRunning ? (
          <button
            type='button'
            className='unfollow btn-danger'
            disabled={selectedOpen.length === 0}
            onClick={handleStart}
          >
            {t('pendingCancelSelected')(selectedOpen.length)}
          </button>
        ) : (
          <div className='controls'>
            <button
              type='button'
              className={`button-control ${pending.isPaused ? 'btn-resume' : 'btn-pause'}`}
              onClick={togglePause}
            >
              {pending.isPaused ? t('resume') : t('pause')}
            </button>
            <button type='button' className='unfollow btn-danger' onClick={stopCancel}>
              {t('growthStop')}
            </button>
          </div>
        )}

        {doneTotal.length > 0 && !pending.isRunning && (
          <button type='button' className='btn pending-back-btn' onClick={handleResetDone}>
            {t('pendingResetDone')}
          </button>
        )}

        <button
          type='button'
          className='btn pending-back-btn'
          disabled={pending.isRunning}
          onClick={() => setState(createInitialPendingState())}
        >
          {t('pendingNewFile')}
        </button>
        <button
          type='button'
          className='btn pending-back-btn'
          disabled={pending.isRunning}
          onClick={() => setState({ status: 'initial' })}
        >
          {t('pendingBack')}
        </button>
      </aside>

      <article className='results-container'>
        <input
          type='search'
          className='search-bar results-search'
          placeholder={t('searchPlaceholder')}
          value={pending.searchTerm}
          disabled={pending.isRunning}
          onKeyDown={event => event.stopPropagation()}
          onChange={event =>
            setState({
              ...pending,
              searchTerm: event.currentTarget.value,
              page: 1,
              selectedUsernames: [],
            })
          }
        />
        <nav className='tabs-container'>
          <div
            className={`tab ${pending.tab === 'open' ? 'tab-active' : ''}`}
            onClick={() => !pending.isRunning && setState({ ...pending, tab: 'open', page: 1, selectedUsernames: [] })}
          >
            {t('pendingTabOpen')} ({openTotal.length})
          </div>
          <div
            className={`tab ${pending.tab === 'done' ? 'tab-active' : ''}`}
            onClick={() => !pending.isRunning && setState({ ...pending, tab: 'done', page: 1, selectedUsernames: [] })}
          >
            {t('pendingTabDone')} ({doneTotal.length})
          </div>
        </nav>

        {pageUsers.length === 0 ? (
          <div className='results-empty-hint'>
            <p className='results-empty-title'>
              {pending.tab === 'open' ? t('pendingEmptyOpen') : t('pendingEmptyDone')}
            </p>
          </div>
        ) : (
          pageUsers.map((user, index) => {
            const isDone = cancelled.has(user.username);
            const checked = pending.selectedUsernames.includes(user.username);
            const letter = (user.username[0] || '#').toUpperCase();
            const prevLetter = index > 0 ? (pageUsers[index - 1].username[0] || '#').toUpperCase() : '';
            return (
              <React.Fragment key={user.username}>
                {letter !== prevLetter && <div className='alphabet-character'>{letter}</div>}
                <label className={`result-item pending-result-item ${isDone ? 'pending-done-item' : ''}`}>
                  <input
                    type='checkbox'
                    checked={checked}
                    disabled={pending.isRunning || isDone}
                    onChange={event => toggleUser(user.username, event.currentTarget.checked)}
                  />
                  <div className='pending-avatar' aria-hidden='true'>
                    {letter}
                  </div>
                  <div className='pending-user-meta'>
                    <a
                      href={`https://www.instagram.com/${user.username}/`}
                      target='_blank'
                      rel='noreferrer'
                      onClick={event => event.stopPropagation()}
                    >
                      @{user.username}
                    </a>
                    {user.fullName && user.fullName !== user.username && <span>{user.fullName}</span>}
                  </div>
                </label>
              </React.Fragment>
            );
          })
        )}
      </article>
    </section>
  );
};
