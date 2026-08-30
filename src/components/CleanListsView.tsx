import React, { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n/i18n';
import {
  createInitialCleanListsState,
  defaultCleanTab,
  type CleanListTab,
  type CleanListsState,
} from '../model/clean-lists-state';
import type { State } from '../model/state';
import type { MetaExportUser } from '../utils/metaExportParser';
import { classifyMetaListKind, dedupeMetaUsers, parseMetaUserList } from '../utils/metaExportParser';
import {
  filterCleanUsers,
  loadCleanLists,
  paginateCleanUsers,
  saveCleanLists,
  usersForCleanTab,
} from '../utils/cleanLists';

interface CleanListsViewProps {
  state: State;
  setState: (state: State | ((prev: State) => State)) => void;
  onShowToast: (message: string, style?: 'success' | 'error' | 'warning' | 'info') => void;
}

const applyLists = (
  setState: CleanListsViewProps['setState'],
  onShowToast: CleanListsViewProps['onShowToast'],
  lists: Pick<CleanListsState, 'unfollowed' | 'blocked' | 'recentRequests'>,
) => {
  const unfollowed = dedupeMetaUsers(lists.unfollowed);
  const blocked = dedupeMetaUsers(lists.blocked);
  const recentRequests = dedupeMetaUsers(lists.recentRequests);
  if (unfollowed.length === 0 && blocked.length === 0 && recentRequests.length === 0) {
    onShowToast(t('cleanNeedLists'), 'warning');
    return;
  }
  saveCleanLists({ unfollowed, blocked, recentRequests });
  setState({
    ...createInitialCleanListsState(),
    phase: 'lists',
    currentTab: defaultCleanTab({ unfollowed, blocked, recentRequests }),
    unfollowed,
    blocked,
    recentRequests,
  });
  onShowToast(t('cleanImported')(unfollowed.length, blocked.length, recentRequests.length), 'success');
};

export const CleanListsView = ({ state, setState, onShowToast }: CleanListsViewProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [savedList] = useState(() => loadCleanLists());
  const clean = state.status === 'clean_lists' ? state : null;

  const tabUsers = useMemo(() => {
    if (!clean) {
      return [];
    }
    return filterCleanUsers(usersForCleanTab(clean, clean.currentTab), clean.searchTerm);
  }, [clean]);

  const { pageUsers, safePage, maxPage } = paginateCleanUsers(tabUsers, clean?.page ?? 1);

  useEffect(() => {
    if (!clean || clean.page === safePage) {
      return;
    }
    setState(prev => (prev.status === 'clean_lists' ? { ...prev, page: safePage } : prev));
  }, [clean, safePage, setState]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const unfollowed: MetaExportUser[] = [];
    const blocked: MetaExportUser[] = [];
    const recentRequests: MetaExportUser[] = [];
    let sawPending = false;
    let sawScan = false;

    try {
      for (const file of Array.from(fileList)) {
        const text = await file.text();
        const kind = classifyMetaListKind(file.name, text);
        const users = parseMetaUserList(text);
        if (kind === 'unfollowed') {
          unfollowed.push(...users);
        } else if (kind === 'blocked') {
          blocked.push(...users);
        } else if (kind === 'recent_requests') {
          recentRequests.push(...users);
        } else if (kind === 'pending') {
          sawPending = true;
        } else if (kind === 'following' || kind === 'followers') {
          sawScan = true;
        }
      }
    } catch {
      onShowToast(t('cleanParseError'), 'error');
      return;
    }

    if (unfollowed.length === 0 && blocked.length === 0 && recentRequests.length === 0) {
      if (sawPending) {
        onShowToast(t('cleanUsePending'), 'info');
        return;
      }
      if (sawScan) {
        onShowToast(t('cleanUseScan'), 'info');
        return;
      }
      onShowToast(t('cleanNeedLists'), 'warning');
      return;
    }

    applyLists(setState, onShowToast, { unfollowed, blocked, recentRequests });
  };

  const handleCopy = async () => {
    if (tabUsers.length === 0) {
      return;
    }
    try {
      await navigator.clipboard.writeText(tabUsers.map(user => user.username).join('\n'));
      onShowToast(t('cleanCopied')(tabUsers.length), 'success');
    } catch {
      onShowToast(t('cleanParseError'), 'error');
    }
  };

  const setTab = (currentTab: CleanListTab) => {
    if (!clean) {
      return;
    }
    setState({ ...clean, currentTab, page: 1, searchTerm: '' });
  };

  if (!clean || clean.phase === 'setup') {
    return (
      <div className='empty-state-container pending-setup'>
        <h2 className='empty-state-title' style={{ fontSize: '1.7rem' }}>
          {t('cleanTitle')}
        </h2>
        <p className='pending-setup-lead'>{t('cleanDescription')}</p>
        <div className='pending-how'>
          <h3>{t('cleanHowTitle')}</h3>
          <ol>
            <li>{t('cleanHow1')}</li>
            <li>{t('cleanHow2')}</li>
            <li>{t('cleanHow3')}</li>
            <li>{t('cleanHow4')}</li>
          </ol>
          <p className='pending-how-note'>{t('cleanHowNote')}</p>
        </div>
        {savedList &&
          (savedList.unfollowed.length > 0 ||
            savedList.blocked.length > 0 ||
            savedList.recentRequests.length > 0) && (
            <>
              <p className='pending-how-note'>{t('cleanSavedList')}</p>
              <button
                type='button'
                className='btn growth-entry-btn'
                onClick={() => applyLists(setState, onShowToast, savedList)}
              >
                {t('cleanUseSaved')}
              </button>
            </>
          )}
        <input
          ref={fileRef}
          type='file'
          accept='.html,.json,.txt'
          multiple
          hidden
          onChange={event => {
            void handleFiles(event.currentTarget.files);
            event.currentTarget.value = '';
          }}
        />
        <button type='button' className='run-scan-btn pending-upload-btn' onClick={() => fileRef.current?.click()}>
          {t('cleanUploadBtn')}
        </button>
        <button type='button' className='btn pending-back-btn' onClick={() => setState({ status: 'initial' })}>
          {t('cleanBack')}
        </button>
      </div>
    );
  }

  const tabs: { id: CleanListTab; label: string; count: number }[] = [
    { id: 'unfollowed', label: t('cleanTabUnfollowed'), count: clean.unfollowed.length },
    { id: 'blocked', label: t('cleanTabBlocked'), count: clean.blocked.length },
    { id: 'recent_requests', label: t('cleanTabRecent'), count: clean.recentRequests.length },
  ];

  return (
    <section className='flex pending-list-layout clean-list-layout'>
      <aside className='app-sidebar'>
        <p style={{ fontWeight: 'bold' }}>{t('cleanTitle')}</p>
        <p className='meta-offline-note'>{t('cleanReadOnlyBanner')}</p>
        <div className='grow stats-box'>
          <p>
            {t('cleanTabUnfollowed')}: {clean.unfollowed.length}
          </p>
          <p>
            {t('cleanTabBlocked')}: {clean.blocked.length}
          </p>
          <p>
            {t('cleanTabRecent')}: {clean.recentRequests.length}
          </p>
          <p>
            {t('displayed')}: {tabUsers.length}
          </p>
        </div>
        <div className='pagination-controls'>
          <p>{t('pages')}</p>
          <div className='pagination-row'>
            <button
              type='button'
              className='btn-icon'
              disabled={safePage <= 1}
              onClick={() => setState({ ...clean, page: safePage - 1 })}
              aria-label={t('prevPage')}
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
              onClick={() => setState({ ...clean, page: safePage + 1 })}
              aria-label={t('nextPage')}
            >
              ›
            </button>
          </div>
        </div>
        <button
          type='button'
          className='unfollow'
          onClick={() => void handleCopy()}
          disabled={tabUsers.length === 0}
        >
          {t('cleanCopy')}
        </button>
        <button type='button' className='btn pending-back-btn' onClick={() => setState(createInitialCleanListsState())}>
          {t('cleanNewFile')}
        </button>
        <button type='button' className='btn pending-back-btn' onClick={() => setState({ status: 'initial' })}>
          {t('cleanBack')}
        </button>
      </aside>

      <article className='results-container'>
        <input
          type='search'
          className='search-bar results-search'
          placeholder={t('searchPlaceholder')}
          value={clean.searchTerm}
          onKeyDown={event => event.stopPropagation()}
          onChange={event => setState({ ...clean, searchTerm: event.currentTarget.value, page: 1 })}
          aria-label={t('searchAccounts')}
        />
        <nav className='tabs-container'>
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`tab ${clean.currentTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => setTab(tab.id)}
            >
              {tab.label} ({tab.count})
            </div>
          ))}
        </nav>

        {pageUsers.length === 0 ? (
          <div className='results-empty-hint'>
            <p className='results-empty-title'>{t('cleanEmpty')}</p>
          </div>
        ) : (
          pageUsers.map((user, index) => {
            const letter = (user.username[0] || '#').toUpperCase();
            const prevLetter = index > 0 ? (pageUsers[index - 1].username[0] || '#').toUpperCase() : '';
            return (
              <React.Fragment key={user.username}>
                {letter !== prevLetter && <div className='alphabet-character'>{letter}</div>}
                <div className='result-item pending-result-item'>
                  <div className='pending-avatar clean-avatar' aria-hidden='true'>
                    {letter}
                  </div>
                  <div className='pending-user-meta'>
                    <a
                      href={`https://www.instagram.com/${user.username}/`}
                      target='_blank'
                      rel='noreferrer'
                    >
                      @{user.username}
                    </a>
                    {user.fullName && user.fullName !== user.username && <span>{user.fullName}</span>}
                    {user.dateLabel && <span>{user.dateLabel}</span>}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </article>
    </section>
  );
};
