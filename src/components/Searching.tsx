import React, { useState, useMemo, useEffect } from 'react';
import {
  assertUnreachable,
  getCurrentPageUnfollowers,
  getMaxPage,
  getUsersForDisplay,
} from '../utils/utils';
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
  onStartUnfollowing: () => void;
}

// Icono de Filtros
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
    ].map(filter => (
      <label key={filter.name} className='badge m-small' style={{ cursor: 'pointer' }}>
        <input
          type='checkbox'
          name={filter.name}
          // @ts-ignore
          checked={state.filter[filter.name]}
          onChange={handleScanFilter}
        />
        &nbsp;{filter.label}
      </label>
    ))}
  </menu>
);

// --- CONSTANTE ESTABLE PARA REFERENCIAS VACÍAS ---
// Definirla fuera asegura que la referencia de memoria sea siempre la misma
// y evita que el useMemo se dispare innecesariamente.
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
}: SearchingProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // UX: Estado para dar feedback inmediato al pulsar el botón
  const [isTogglingPause, setIsTogglingPause] = useState(false);

  // UX: Cuando la propiedad real cambia, quitamos el estado de "cargando"
  useEffect(() => {
    setIsTogglingPause(false);
  }, [scanningPaused]);

  // --- EXTRACCIÓN SEGURA Y ESTABLE ---
  // Usamos EMPTY_LIST en lugar de [] para mantener la referencia estable.
  const scanResults = state.status === 'scanning' ? state.results : EMPTY_LIST;
  const whitelistedResults = state.status === 'scanning' ? state.whitelistedResults : EMPTY_LIST;

  // Primitivos (strings) y undefined son seguros por naturaleza
  const currentTab = state.status === 'scanning' ? state.currentTab : 'non_whitelisted';
  const searchTerm = state.status === 'scanning' ? state.searchTerm : '';
  const filter = state.status === 'scanning' ? state.filter : undefined;

  // OPTIMIZACIÓN: Memorizamos la lista
  const usersForDisplay = useMemo(() => {
    if (!filter) {
      return EMPTY_LIST;
    }

    return getUsersForDisplay(scanResults, whitelistedResults, currentTab, searchTerm, filter);
  }, [
    // Ahora todas estas dependencias son estables y seguras
    scanResults,
    whitelistedResults,
    currentTab,
    searchTerm,
    filter,
  ]);

  if (state.status !== 'scanning') {
    return null;
  }

  let currentLetter = '';
  const renderLetterHeader = (firstLetter: string) => {
    currentLetter = firstLetter;
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

    localStorage.setItem(WHITELISTED_RESULTS_STORAGE_KEY, JSON.stringify(newWhitelisted));
    setState({ ...state, whitelistedResults: newWhitelisted });
  };

  const handleUnfollowStart = () => {
    if (!confirm(`Are you sure you want to unfollow ${state.selectedResults.length} users?`)) {
      return;
    }
    if (state.selectedResults.length === 0) {
      alert('Select at least one user to unfollow.');
      return;
    }
    setIsMobileMenuOpen(false);
    onStartUnfollowing();
  };

  // UX: Handler para el botón de Pausa con feedback inmediato
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

        <div className='controls'>
          {/* BOTÓN PAUSA MEJORADO */}
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

        <button
          className='unfollow btn-danger'
          onClick={handleUnfollowStart}
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
                <div className='flex grow align-center'>
                  <div className='avatar-container' onClick={e => handleWhitelistToggle(e, user)}>
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

                  <div className='flex column m-medium user-info'>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '6px',
                        width: 'fit-content',
                      }}
                    >
                      <a
                        className='fs-xlarge user-link'
                        target='_blank'
                        href={`https://www.instagram.com/${user.username}`}
                        rel='noreferrer'
                        title={user.username}
                        style={{ lineHeight: '1' }}
                      >
                        {user.username}
                      </a>

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
                          }}
                        >
                          NEW
                        </span>
                      )}
                    </div>

                    <span className='fs-medium text-muted' title={user.full_name}>
                      {user.full_name}
                    </span>
                  </div>

                  {user.is_verified && (
                    <div
                      className='verified-badge'
                      style={{ display: 'flex', alignItems: 'center' }}
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
                  {user.is_private && <div className='private-indicator'>Private</div>}
                </div>
                <input
                  className='account-checkbox'
                  type='checkbox'
                  checked={state.selectedResults.some(r => r.id === user.id)}
                  onChange={e => toggleUser(e.currentTarget.checked, user)}
                />
              </label>
            </React.Fragment>
          );
        })}
      </article>
    </section>
  );
};
