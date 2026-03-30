import React, { useState, useMemo, useEffect } from 'react';
import {
  assertUnreachable,
  getCurrentPageUnfollowers,
  getMaxPage,
  getUsersForDisplay,
  getDynamicStorageKey,
} from '../utils/utils';
import { calculateGhostScore, getGhostLabel, getGhostColor } from '../utils/ghostScore';
import { State } from '../model/state';
import { UserNode } from '../model/user';
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
}) => (
  <menu className='flex column m-clear p-clear'>
    <p style={{ fontWeight: 'bold' }}>Filters</p>
    {[
      { name: 'showNonFollowers', label: 'Non-Followers' },
      { name: 'showFollowers', label: 'Followers' },
      { name: 'showVerified', label: 'Verified' },
      { name: 'showPrivate', label: 'Private' },
      { name: 'showWithOutProfilePicture', label: 'No Profile Pic' },
      { name: 'showGhostsOnly', label: 'Ghosts / Bots Only' },
    ].map(filter => (
      <label key={filter.name} className='badge m-small' style={{ cursor: 'pointer' }}>
        <input
          type='checkbox'
          name={filter.name}
          // @ts-ignore
          checked={state.filter[filter.name as keyof ScanningFilter]}
          onChange={handleScanFilter}
        />
        &nbsp;{filter.label}
      </label>
    ))}
  </menu>
);

const EMPTY_LIST: readonly UserNode[] = [];

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

  const usersForDisplay = useMemo(() => {
    if (!filter) {
      return EMPTY_LIST;
    }
    return getUsersForDisplay(scanResults, whitelistedResults, currentTab, searchTerm, filter);
  }, [scanResults, whitelistedResults, currentTab, searchTerm, filter]);

  if (state.status !== 'scanning') {
    return null;
  }

  let currentLetter = ''; // ← se muta durante el render
  const renderLetterHeader = (firstLetter: string) => {
    currentLetter = firstLetter; // ← mutación directa
    return <div className='alphabet-character'>{currentLetter}</div>;
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    const maxPage = getMaxPage(usersForDisplay);
    let newPage = state.page;
    if (direction === 'prev' && state.page > 1) {
      newPage--;
    }
    if (direction === 'next' && state.page < maxPage) {
      newPage++;
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
      default:
        assertUnreachable(state.currentTab);
    }

    const dynamicWhitelistKey = getDynamicStorageKey(WHITELISTED_RESULTS_STORAGE_KEY);
    localStorage.setItem(dynamicWhitelistKey, JSON.stringify(newWhitelisted));

    setState({ ...state, whitelistedResults: newWhitelisted });
  };

  const handleUnfollowStart = (actionType: 'unfollow' | 'remove_follower') => {
    const actionName = actionType === 'unfollow' ? 'unfollow' : 'remove';

    // EL PAYWALL
    if (!isPro && state.selectedResults.length > 1) {
      alert(
        '🔒 PRO Feature: Upgrade to process multiple users automatically. Free version only allows 1 by 1.',
      );
      return;
    }

    if (!confirm(`Are you sure you want to ${actionName} ${state.selectedResults.length} users?`)) {
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
        <span>Actions ({state.selectedResults.length})</span>
      </button>

      {/* Sidebar */}
      <aside className={`app-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className='mobile-sidebar-header'>
          <h3>Filters & Actions</h3>
          <button className='close-btn' onClick={() => setIsMobileMenuOpen(false)}>
            ✕
          </button>
        </div>
        <FiltersSidebar state={state} handleScanFilter={handleScanFilter} />
        <div className='grow stats-box'>
          <p>Displayed: {usersForDisplay.length}</p>
          <p>Total: {state.results.length}</p>
        </div>
        {/* Solo mostramos los controles si realmente hay un escaneo en curso y no ha llegado al final */}
        {state.percentage > 0 && state.percentage < 98 && (
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
                  ? 'Resuming...'
                  : 'Pausing...'
                : scanningPaused
                  ? 'Resume Scan'
                  : 'Pause Scan'}
            </button>
          </div>
        )}
        <div className='grow t-center pagination-controls'>
          <p>Pages</p>
          <div className='flex justify-center align-center'>
            <button className='btn-icon' onClick={() => handlePageChange('prev')}>
              ❮
            </button>
            <span className='page-indicator'>
              {state.page} / {getMaxPage(usersForDisplay)}
            </span>
            <button className='btn-icon' onClick={() => handlePageChange('next')}>
              ❯
            </button>
          </div>
        </div>
        {state.currentTab === 'mutuals' && (
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
            REMOVE FOLLOWER ({state.selectedResults.length})
          </button>
        )}
        <button
          className='unfollow btn-danger'
          onClick={() => handleUnfollowStart('unfollow')}
          disabled={state.selectedResults.length === 0}
        >
          UNFOLLOW ({state.selectedResults.length})
        </button>
      </aside>

      {/* Lista de Resultados */}
      <article className='results-container'>
        <nav className='tabs-container'>
          <div
            className={`tab ${state.currentTab === 'non_whitelisted' ? 'tab-active' : ''}`}
            onClick={() =>
              setState({ ...state, currentTab: 'non_whitelisted', selectedResults: [], page: 1 })
            }
          >
            Non-Followers
          </div>
          <div
            className={`tab ${state.currentTab === 'mutuals' ? 'tab-active' : ''}`}
            onClick={() =>
              setState({ ...state, currentTab: 'mutuals', selectedResults: [], page: 1 })
            }
          >
            Mutuals
          </div>
          <div
            className={`tab ${state.currentTab === 'whitelisted' ? 'tab-active' : ''}`}
            onClick={() =>
              setState({ ...state, currentTab: 'whitelisted', selectedResults: [], page: 1 })
            }
          >
            Whitelisted
          </div>
        </nav>

        {getCurrentPageUnfollowers(usersForDisplay, state.page).map(user => {
          const firstLetter = user.username.substring(0, 1).toUpperCase();
          const isNewLetter = firstLetter !== currentLetter;

          return (
            <React.Fragment key={user.id}>
              {isNewLetter && renderLetterHeader(firstLetter)}
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
                    <img
                      className='avatar'
                      alt={user.username}
                      src={user.profile_pic_url}
                      loading='lazy'
                    />
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
                          NEW
                        </span>
                      )}

                      {/* Badge Ghost/Bot/Suspicious — maxWidth para no aplastar el username */}
                      {(() => {
                        const ghost = calculateGhostScore(user);
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
                            title={
                              isPro
                                ? ghost.reasons.join(' · ')
                                : 'Upgrade to PRO to see detailed reasons'
                            }
                          >
                            {getGhostLabel(ghost.level)} {isPro ? ghost.score : '🔒'}
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
                      Private
                    </div>
                  )}
                </div>

                <input
                  className='account-checkbox'
                  type='checkbox'
                  checked={state.selectedResults.some(r => r.id === user.id)}
                  onChange={e => toggleUser(e.currentTarget.checked, user)}
                  style={{ flexShrink: 0 }}
                />
              </label>
            </React.Fragment>
          );
        })}
      </article>
    </section>
  );
};
