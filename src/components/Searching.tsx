import React, { useState, useMemo, useEffect } from 'react';
import { t } from '../i18n/i18n';
import {
  assertUnreachable,
  getCurrentPageUnfollowers,
  getMaxPage,
  getSafePage,
  getUsersForDisplay,
  getDynamicStorageKey,
} from '../utils/utils';
import { calculateGhostScore, getGhostLabel, getGhostColor } from '../utils/ghostScore';
import { communityDiffCount, listDiffPeople, paginateDiffPeople, type MetaDiffKind } from '../utils/metaDiff';
import { State } from '../model/state';
import { UserNode } from '../model/user';
import { ScanningFilter } from '../model/scanning-filter';
import { WHITELISTED_RESULTS_STORAGE_KEY } from '../constants/constants';

import { HistoryService } from '../services/historyService';

export interface SearchingProps {
  state: State;
  setState: (state: State) => void;
  scanningPaused: boolean;
  pauseScan: () => void;
  handleScanFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleUser: (checked: boolean, user: UserNode) => void;
  UserCheckIcon: React.FC;
  UserUncheckIcon: React.FC;
  onStartUnfollowing: (actionType: 'unfollow' | 'remove_follower') => void;
  isPro: boolean;
}

const FilterIcon = () => (
  <svg
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <line x1='4' y1='21' x2='4' y2='14' />
    <line x1='4' y1='10' x2='4' y2='3' />
    <line x1='12' y1='21' x2='12' y2='12' />
    <line x1='12' y1='8' x2='12' y2='3' />
    <line x1='20' y1='21' x2='20' y2='16' />
    <line x1='20' y1='12' x2='20' y2='3' />
    <line x1='1' y1='14' x2='7' y2='14' />
    <line x1='9' y1='8' x2='15' y2='8' />
    <line x1='17' y1='16' x2='23' y2='16' />
  </svg>
);

const FiltersSidebar = ({
  state,
  handleScanFilter,
}: {
  state: State;
  handleScanFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const isMeta = state.status === 'scanning' && state.source === 'meta';
  const filters = isMeta
    ? []
    : [
        { name: 'showVerified', label: t('verified') },
        { name: 'showPrivate', label: t('private') },
        { name: 'showWithOutProfilePicture', label: t('noProfilePic') },
        { name: 'showGhostsOnly', label: t('ghostsBotsOnly') },
      ];

  return (
    <menu className='flex column m-clear p-clear'>
      {!isMeta && <p style={{ fontWeight: 'bold' }}>{t('filterResults')}</p>}
      {isMeta && <p className='meta-offline-note'>{t('metaOfflineBanner')}</p>}
      {isMeta && state.status === 'scanning' && !state.metaDiff && (
        <p className='meta-offline-note'>{t('metaDiffBaseline')}</p>
      )}
      {filters.map(filter => (
        <label key={filter.name} className='badge m-small' style={{ cursor: 'pointer' }}>
          <input
            type='checkbox'
            name={filter.name}
            checked={state.status === 'scanning' ? state.filter[filter.name as keyof ScanningFilter] : false}
            onChange={handleScanFilter}
          />
          &nbsp;{filter.label}
        </label>
      ))}
    </menu>
  );
};

const EMPTY_LIST: readonly UserNode[] = [];

const diffKindLabel = (kind: MetaDiffKind): string => {
  switch (kind) {
    case 'they_unfollowed':
      return t('metaDiffTheyLeft');
    case 'you_unfollowed':
      return t('metaDiffYouUnfollowed');
    case 'you_followed':
      return t('metaDiffYouFollowed');
    case 'new_follower':
      return t('metaDiffNewFollower');
    case 'now_mutual':
      return t('metaDiffNowMutual');
    default:
      return kind;
  }
};

export const Searching = ({
  state,
  setState,
  scanningPaused,
  pauseScan,
  handleScanFilter,
  toggleUser,
  UserCheckIcon,
  UserUncheckIcon,
  onStartUnfollowing,
  isPro,
}: SearchingProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTogglingPause, setIsTogglingPause] = useState(false);

  useEffect(() => {
    setIsTogglingPause(false);
  }, [scanningPaused]);

  const scanResults = state.status === 'scanning' ? state.results : EMPTY_LIST;
  const whitelistedResults = state.status === 'scanning' ? state.whitelistedResults : EMPTY_LIST;
  const currentTab = state.status === 'scanning' ? state.currentTab : 'non_whitelisted';
  const searchTerm = state.status === 'scanning' ? state.searchTerm : '';
  const filter = state.status === 'scanning' ? state.filter : undefined;

  const metaDiff = state.status === 'scanning' ? state.metaDiff : null;
  const isChangesTab = currentTab === 'changes';
  const changePeople = useMemo(
    () => (isChangesTab && metaDiff ? listDiffPeople(metaDiff, searchTerm) : []),
    [isChangesTab, metaDiff, searchTerm],
  );

  const usersForDisplay = useMemo(() => {
    if (isChangesTab || !filter) {
      return EMPTY_LIST;
    }
    return getUsersForDisplay(scanResults, whitelistedResults, currentTab, searchTerm, filter, t);
  }, [isChangesTab, scanResults, whitelistedResults, currentTab, searchTerm, filter]);

  const scanningPage = state.status === 'scanning' ? state.page : 1;
  const changePage = paginateDiffPeople(changePeople, scanningPage);
  const maxPage = isChangesTab ? changePage.maxPage : getMaxPage(usersForDisplay);
  const safePage = isChangesTab ? changePage.safePage : getSafePage(usersForDisplay, scanningPage);
  const pageUsers = useMemo(
    () => (isChangesTab ? EMPTY_LIST : getCurrentPageUnfollowers(usersForDisplay, safePage)),
    [isChangesTab, usersForDisplay, safePage],
  );
  const pageChangePeople = isChangesTab ? changePage.pagePeople : [];

  useEffect(() => {
    if (state.status !== 'scanning') {
      return;
    }
    if (state.page === safePage) {
      return;
    }
    setState({ ...state, page: safePage });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only resync when page bounds change
  }, [safePage, scanningPage, state.status]);

  if (state.status !== 'scanning') {
    return null;
  }

  let lastRenderedLetter = '';
  const handlePageChange = (direction: 'prev' | 'next') => {
    let newPage = safePage;
    if (direction === 'prev' && safePage > 1) {
      newPage = safePage - 1;
    }
    if (direction === 'next' && safePage < maxPage) {
      newPage = safePage + 1;
    }
    if (newPage !== state.page) {
      setState({ ...state, page: newPage });
    }
  };

  const handleWhitelistToggle = (e: React.MouseEvent<HTMLDivElement>, user: UserNode) => {
    e.preventDefault();
    e.stopPropagation();
    let newWhitelisted: readonly UserNode[] = [];

    switch (state.currentTab) {
      case 'non_whitelisted':
      case 'mutuals':
        newWhitelisted = [...state.whitelistedResults, user];
        HistoryService.addEvent('WHITELISTED', user);
        break;
      case 'whitelisted':
        newWhitelisted = state.whitelistedResults.filter(u => u.id !== user.id);
        HistoryService.addEvent('UNWHITELISTED', user);
        break;
      case 'changes':
        return;
      default:
        return assertUnreachable(state);
    }

    const dynamicWhitelistKey = getDynamicStorageKey(WHITELISTED_RESULTS_STORAGE_KEY);
    try {
      localStorage.setItem(dynamicWhitelistKey, JSON.stringify(newWhitelisted));
    } catch (err) {
      console.error('Error writing whitelist', err);
    }

    setState({ ...state, whitelistedResults: newWhitelisted });
  };

  const handleUnfollowStart = (actionType: 'unfollow' | 'remove_follower') => {
    if (state.source === 'meta') {
      onStartUnfollowing(actionType);
      return;
    }

    // EL PAYWALL
    if (!isPro && state.selectedResults.length > 1) {
      alert(t('proFeatureMultiUnfollow'));
      return;
    }

    if (
      !confirm(
        actionType === 'unfollow'
          ? t('confirmUnfollowAction')(state.selectedResults.length)
          : t('confirmRemoveAction')(state.selectedResults.length),
      )
    ) {
      return;
    }

    setIsMobileMenuOpen(false);
    onStartUnfollowing(actionType);
  };

  const onTogglePauseClick = () => {
    setIsTogglingPause(true);
    setTimeout(() => {
      pauseScan();
    }, 10);
  };

  return (
    <section className='flex'>
      {/* FAB Mobile */}
      <button
        className={`mobile-fab-btn ${isMobileMenuOpen ? 'hidden' : ''}`}
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <FilterIcon />
        <span>
          {t('actions')} ({state.selectedResults.length})
        </span>
      </button>

      {/* Sidebar */}
      <aside className={`app-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className='mobile-sidebar-header'>
          <h3>{t('filtersActions')}</h3>
          <button className='close-btn' onClick={() => setIsMobileMenuOpen(false)}>
            ✕
          </button>
        </div>
        <FiltersSidebar state={state} handleScanFilter={handleScanFilter} />
        <div className='grow stats-box'>
          <p>
            {t('displayed')}: {isChangesTab ? changePeople.length : usersForDisplay.length}
          </p>
          <p>
            {t('total')}: {state.results.length}
          </p>
          {metaDiff && (
            <>
              <p>
                {t('metaDiffTheyLeft')}: {metaDiff.theyUnfollowed.length}
              </p>
              <p>
                {t('metaDiffYouUnfollowed')}: {metaDiff.youUnfollowed.length}
              </p>
              <p>
                {t('metaDiffYouFollowed')}: {metaDiff.youFollowed.length}
              </p>
              <p>
                {t('metaDiffNewFollower')}: {metaDiff.newFollowers.length}
              </p>
            </>
          )}
        </div>
        {/* Solo mostramos los controles si el escaneo está en curso */}
        {state.percentage > 0 && state.percentage < 100 && (
          <div className='controls'>
            <button
              className={`button-control ${scanningPaused ? 'btn-resume' : 'btn-pause'}`}
              onClick={onTogglePauseClick}
              disabled={isTogglingPause}
              style={{
                opacity: isTogglingPause ? 0.7 : 1,
                cursor: isTogglingPause ? 'wait' : 'pointer',
              }}
            >
              {isTogglingPause
                ? scanningPaused
                  ? t('resuming')
                  : t('pausing')
                : scanningPaused
                  ? t('resumeScan')
                  : t('pauseScan')}
            </button>
          </div>
        )}
        <div className='pagination-controls'>
          <p>{t('pages')}</p>
          <div className='pagination-row'>
            <button
              type='button'
              className='btn-icon'
              onClick={() => handlePageChange('prev')}
              disabled={safePage <= 1}
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
              onClick={() => handlePageChange('next')}
              disabled={safePage >= maxPage}
              aria-label={t('nextPage')}
            >
              ›
            </button>
          </div>
        </div>
        {state.source !== 'meta' && state.currentTab === 'mutuals' && (
          <button
            className='unfollow'
            style={{
              marginBottom: '10px',
              background: 'rgba(234, 179, 8, 0.15)',
              color: '#eab308',
              borderColor: 'rgba(234, 179, 8, 0.3)',
            }}
            onClick={() => handleUnfollowStart('remove_follower')}
            disabled={state.selectedResults.length === 0}
          >
            {t('removeFollower')} ({state.selectedResults.length})
          </button>
        )}
        {state.source !== 'meta' && (
          <button
            className='unfollow btn-danger'
            onClick={() => handleUnfollowStart('unfollow')}
            disabled={state.selectedResults.length === 0}
          >
            {t('unfollow')} ({state.selectedResults.length})
          </button>
        )}
      </aside>

      {/* Lista de Resultados */}
      <article className='results-container'>
        <input
          type='search'
          className='search-bar results-search'
          placeholder={t('searchPlaceholder')}
          value={state.searchTerm}
          onKeyDown={e => e.stopPropagation()}
          onChange={e => setState({ ...state, searchTerm: e.currentTarget.value, page: 1, selectedResults: [] })}
          aria-label={t('searchAccounts')}
        />
        <nav className='tabs-container'>
          <div
            className={`tab ${state.currentTab === 'non_whitelisted' ? 'tab-active' : ''}`}
            onClick={() =>
              setState({ ...state, currentTab: 'non_whitelisted', selectedResults: [], page: 1 })
            }
          >
            {t('nonFollowers')}
          </div>
          <div
            className={`tab ${state.currentTab === 'mutuals' ? 'tab-active' : ''}`}
            onClick={() =>
              setState({ ...state, currentTab: 'mutuals', selectedResults: [], page: 1 })
            }
          >
            {t('mutuals')}
          </div>
          <div
            className={`tab ${state.currentTab === 'whitelisted' ? 'tab-active' : ''}`}
            onClick={() =>
              setState({ ...state, currentTab: 'whitelisted', selectedResults: [], page: 1 })
            }
          >
            {t('whitelisted')}
          </div>
          {state.source === 'meta' && metaDiff && communityDiffCount(metaDiff) > 0 && (
            <div
              className={`tab ${state.currentTab === 'changes' ? 'tab-active' : ''}`}
              onClick={() =>
                setState({ ...state, currentTab: 'changes', selectedResults: [], page: 1 })
              }
            >
              {t('metaDiffTab')} ({communityDiffCount(metaDiff)})
            </div>
          )}
        </nav>

        {isChangesTab ? (
          pageChangePeople.length === 0 ? (
            <div className='results-empty-hint'>
              <p className='results-empty-title'>{state.searchTerm ? t('noSearchResults') : t('metaDiffEmpty')}</p>
            </div>
          ) : (
            pageChangePeople.map((person, index) => {
              const letter = (person.username[0] || '#').toUpperCase();
              const prevLetter =
                index > 0 ? (pageChangePeople[index - 1].username[0] || '#').toUpperCase() : '';
              return (
                <React.Fragment key={person.username}>
                  {letter !== prevLetter && <div className='alphabet-character'>{letter}</div>}
                  <div className='result-item pending-result-item'>
                    <div className='pending-avatar' aria-hidden='true'>
                      {letter}
                    </div>
                    <div className='pending-user-meta'>
                      <a href={`https://www.instagram.com/${person.username}/`} target='_blank' rel='noreferrer'>
                        @{person.username}
                      </a>
                      {person.fullName && person.fullName !== person.username && <span>{person.fullName}</span>}
                      <span className='meta-diff-kinds'>
                        {person.kinds.map(kind => (
                          <span key={kind} className={`meta-diff-badge meta-diff-badge--${kind}`}>
                            {diffKindLabel(kind)}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )
        ) : pageUsers.length === 0 ? (
          <div className='results-empty-hint'>
            <p className='results-empty-title'>
              {state.percentage < 100 && state.results.length === 0
                ? t('emptyResultsScanning')
                : state.searchTerm
                  ? t('noSearchResults')
                  : t('emptyResultsTitle')}
            </p>
            {!(state.percentage < 100 && state.results.length === 0) && (
              <p className='text-muted'>{t('emptyResultsHint')}</p>
            )}
            <p className='text-muted'>
              {t('displayed')}: 0 · {t('total')}: {state.results.length}
            </p>
          </div>
        ) : (
          pageUsers.map(user => {
            const firstLetter = (user.username[0] || '#').toUpperCase();
            const showLetterHeader = firstLetter !== lastRenderedLetter;
            if (showLetterHeader) {
              lastRenderedLetter = firstLetter;
            }

            return (
              <React.Fragment key={user.id}>
                {showLetterHeader && <div className='alphabet-character'>{firstLetter}</div>}
              <label className='result-item'>
                <div
                  className='flex grow align-center'
                  style={{
                    minWidth: 0,
                    flex: 1,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className='avatar-container'
                    onClick={e => handleWhitelistToggle(e, user)}
                    style={{ flexShrink: 0 }}
                  >
                    {state.source === 'meta' || !user.profile_pic_url ? (
                      <div className='avatar avatar-letter' aria-hidden='true'>
                        {(user.username[0] || '#').toUpperCase()}
                      </div>
                    ) : (
                      <img
                        className='avatar'
                        alt={user.username}
                        src={user.profile_pic_url}
                        loading='lazy'
                        onError={e => {
                          e.currentTarget.style.visibility = 'hidden';
                        }}
                      />
                    )}
                    <span className='avatar-icon-overlay-container'>
                      {state.currentTab === 'non_whitelisted' ? (
                        <UserCheckIcon />
                      ) : (
                        <UserUncheckIcon />
                      )}
                    </span>
                  </div>

                  <div
                    className='flex column m-medium user-info'
                    style={{
                      minWidth: 0,
                      flex: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: 0,
                        overflow: 'hidden',
                        width: '100%',
                        flexWrap: 'nowrap',
                      }}
                    >
                      {/* USERNAME — flex:1 para que tome el espacio restante */}
                      <a
                        className='fs-xlarge user-link'
                        target='_blank'
                        href={`https://www.instagram.com/${user.username}`}
                        rel='noreferrer'
                        title={user.username}
                        style={{
                          lineHeight: '1',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          minWidth: 0,
                          flex: 1,
                          display: 'block',
                        }}
                      >
                        {user.username}
                      </a>

                      {/* Badge NEW */}
                      {user.is_new_unfollower && (
                        <span
                          style={{
                            background: 'linear-gradient(45deg, #ff3b30, #ff2d55)',
                            color: 'white',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 2px 4px rgba(255, 45, 85, 0.3)',
                            height: 'fit-content',
                            whiteSpace: 'nowrap',
                            lineHeight: '1.2',
                            flexShrink: 0,
                          }}
                        >
                          {t('newBadge')}
                        </span>
                      )}

                      {/* Badge Ghost/Bot/Suspicious — maxWidth para no aplastar el username */}
                      {state.source !== 'meta' && (() => {
                        const ghost = calculateGhostScore(user, t);
                        if (ghost.level === 'safe') {
                          return null;
                        }
                        return (
                          <span
                            style={{
                              background: 'rgba(148, 163, 184, 0.1)',
                              color: getGhostColor(ghost.level),
                              border: `1px solid ${getGhostColor(ghost.level)}40`,
                              fontSize: '9px',
                              fontWeight: 'bold',
                              padding: '2px 5px',
                              borderRadius: '10px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              height: 'fit-content',
                              whiteSpace: 'nowrap',
                              lineHeight: '1.2',
                              cursor: 'default',
                              flexShrink: 0,
                              maxWidth: '72px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={isPro ? ghost.reasons.join(' · ') : t('proFeatureGhostDetails')}
                          >
                            {getGhostLabel(ghost.level, t)} {isPro ? ghost.score : '🔒'}
                          </span>
                        );
                      })()}
                    </div>

                    <span
                      className='fs-medium text-muted'
                      title={user.full_name}
                      style={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {user.full_name}
                    </span>
                  </div>

                  {user.is_verified && (
                    <div
                      className='verified-badge'
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width='18'
                        height='18'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <path
                          d='M12.0001 2L14.7105 4.31686L18.2323 3.99307L19.3879 7.33923L22.646 8.91307L22.0944 12.3999L24.0001 15.178L21.579 17.8427L21.4393 21.393L17.9734 22.0305L15.6843 24.6291L12.4497 23.3333L9.21517 24.6291L6.926 22.0305L3.46014 21.393L3.32044 17.8427L0.899323 15.178L2.80501 12.3999L2.25338 8.91307L5.51147 7.33923L6.66711 3.99307L10.1889 4.31686L12.0001 2Z'
                          fill='#06b6d4'
                        />
                        <path
                          d='M17 9L10 16L7 13'
                          stroke='white'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    </div>
                  )}

                  {user.is_private && (
                    <div className='private-indicator' style={{ flexShrink: 0 }}>
                      {t('private')}
                    </div>
                  )}
                </div>

                {state.source !== 'meta' && (
                  <input
                    className='account-checkbox'
                    type='checkbox'
                    checked={state.selectedResults.some(r => r.id === user.id)}
                    onChange={e => toggleUser(e.currentTarget.checked, user)}
                    style={{ flexShrink: 0 }}
                  />
                )}
              </label>
            </React.Fragment>
          );
          })
        )}
      </article>
    </section>
  );
};
