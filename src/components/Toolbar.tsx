import React, { ChangeEvent, useState } from 'react';
import { State } from '../model/state';
import { SettingMenu } from './SettingMenu';
import { SettingIcon } from './icons/SettingIcon';
import { Timings } from '../model/timings';
import { Logo } from './icons/Logo';
import { KofiButton } from './icons/KofiIcon';
import {
  exportToCSV,
  assertUnreachable,
  copyListToClipboard,
  getUsersForDisplay,
} from '../utils/utils';
import { CopyIcon } from './icons/CopyIcon';
import { DownloadIcon } from './icons/DownloadIcon';

import { generateHealthReportPDF } from '../utils/pdfGenerator';
import { PdfIcon } from './icons/PdfIcon';

import { HistoryView } from './HistoryView';
import { HistoryIcon } from './icons/HistoryIcon';

// Icono simple de Minimizar
const MinimizeIcon = ({ onClick }: { onClick: () => void }) => (
  <div className='icon-button minimize-btn' onClick={onClick} title='Minimize overlay'>
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
      <polyline points='6 9 12 15 18 9' />
    </svg>
  </div>
);

interface ToolBarProps {
  isActiveProcess: boolean;
  state: State;
  setState: (state: State) => void;
  scanningPaused: boolean;
  toggleAllUsers: (e: ChangeEvent<HTMLInputElement>) => void;
  toggleCurrentePageUsers: (e: ChangeEvent<HTMLInputElement>) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
  onShowToast: (message: string) => void;
  isPageSelected: boolean;
  isAllSelected: boolean;
  onMinimize: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const Toolbar = ({
  isActiveProcess,
  state,
  setState,
  scanningPaused,
  toggleAllUsers,
  toggleCurrentePageUsers,
  currentTimings,
  setTimings,
  onShowToast,
  isPageSelected,
  isAllSelected,
  onMinimize,
  theme,
  toggleTheme,
}: ToolBarProps) => {
  const [settingMenu, setSettingMenu] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleLogoClick = () => {
    if (isActiveProcess) {
      return;
    }
    switch (state.status) {
      case 'initial':
        if (confirm('Go back to Instagram?')) {
          location.reload();
        }
        break;
      case 'scanning':
      case 'unfollowing':
        setState({ status: 'initial' });
        break;
    }
  };

  const handleCopyClick = async () => {
    if (state.status === 'scanning') {
      const usersToCopy = getUsersForDisplay(
        state.results,
        state.whitelistedResults,
        state.currentTab,
        state.searchTerm,
        state.filter,
      );

      await copyListToClipboard(usersToCopy);
      onShowToast(`Copied ${usersToCopy.length} users to clipboard!`);
    }
  };

  const handleExportClick = () => {
    if (state.status === 'scanning') {
      exportToCSV(state.results, state.whitelistedResults);
      onShowToast(`Exported ${state.results.length} users to CSV!`);
    }
  };

  const handlePdfClick = async () => {
    if (state.status === 'scanning') {
      // Filtramos solo a los "traidores" (los que no te siguen) para el reporte
      const nonFollowers = state.results.filter(u => !u.follows_viewer);

      onShowToast('Generating Health Report...');
      try {
        await generateHealthReportPDF(nonFollowers, state.whitelistedResults);
        onShowToast('Health Report PDF downloaded!');
      } catch (error) {
        console.error('PDF generation failed:', error);
        onShowToast('Error generating PDF.');
      }
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    switch (state.status) {
      case 'initial':
        return;
      case 'scanning':
      case 'unfollowing':
        setState({ ...state, searchTerm: value });
        break;
      default:
        assertUnreachable(state);
    }
  };

  return (
    <header className='app-header'>
      {/* CSS RESPONSIVO INLINE */}
      <style>{`
        .minimize-btn {
           cursor: pointer;
           padding: 8px;
           display: flex;
           align-items: center;
           border-radius: 50%;
           transition: background 0.2s;
        }
        .minimize-btn:hover {
           background: rgba(255,255,255,0.1);
        }
        
        /* REGLAS MOVIL (< 500px) */
        @media (max-width: 500px) {
          .logo-text {
            display: none !important; 
          }
          /* OCULTAMOS SEARCH BAR EN MOVIL */
          .search-bar {
            display: none !important;
          }
          .app-header-content {
            gap: 0.5rem;
            justify-content: space-between; /* Espaciado máximo */
          }
          .checkbox-label {
             margin-right: 5px;
          }
          .checkbox-text {
             font-size: 0.8rem;
          }
        }
      `}</style>

      {isActiveProcess && (
        <progress
          className='progressbar'
          value={state.status !== 'initial' ? state.percentage : 0}
          max='100'
        />
      )}

      <div className='app-header-content'>
        {/* LOGO AREA */}
        <div
          className='logo'
          onClick={handleLogoClick}
          style={{
            cursor: isActiveProcess ? 'default' : 'pointer',
            marginRight: 'auto',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Logo />
          <div className='logo-text'>
            <span>Instagram</span>
            <span>Unfollowers</span>
          </div>
        </div>

        {/* SEARCH BAR (Ahora se oculta sola con el CSS de arriba) */}
        {state.status !== 'initial' && (
          <input
            type='text'
            className='search-bar'
            placeholder='Search...'
            value={state.searchTerm}
            onKeyDown={e => e.stopPropagation()}
            onChange={handleSearchChange}
            style={{ margin: '0 1rem' }}
          />
        )}

        {/* CHECKBOXES */}
        {state.status === 'scanning' && (
          <div style={{ display: 'flex', gap: '8px', marginRight: '0.5rem', alignItems: 'center' }}>
            <label className='checkbox-label' title='Select Page'>
              <input
                type='checkbox'
                disabled={state.percentage < 100 && !scanningPaused}
                className='toggle-all-checkbox'
                onClick={toggleCurrentePageUsers}
                checked={isPageSelected}
              />
              <span className='checkbox-text'>Page</span>
            </label>
            <label className='checkbox-label' title='Select All'>
              <input
                type='checkbox'
                disabled={state.percentage < 100 && !scanningPaused}
                checked={isAllSelected}
                className='toggle-all-checkbox'
                onClick={toggleAllUsers}
              />
              <span className='checkbox-text'>All</span>
            </label>
          </div>
        )}

        {/* RIGHT ACTIONS GROUP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          {/* Scanning Actions */}
          {state.status === 'scanning' && (
            <>
              <button
                className='copy-list'
                onClick={handleCopyClick}
                title='Copy visible list'
                style={{ padding: '0.5rem' }}
              >
                <CopyIcon />
              </button>
              <button
                className='copy-list'
                onClick={handleExportClick}
                style={{ backgroundColor: '#2d3748', padding: '0.5rem' }}
                title='Export CSV'
              >
                <DownloadIcon />
              </button>

              {/* NUEVO BOTÓN PREMIUM PDF */}
              <button
                className='copy-list'
                onClick={handlePdfClick}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title='Download Premium Health Report'
              >
                <PdfIcon /> Report
              </button>
            </>
          )}

          {/* Initial Actions */}
          {state.status === 'initial' && (
            <>
              <KofiButton />
              <HistoryIcon onClick={() => setHistoryOpen(true)} />
              <SettingIcon onClickLogo={() => setSettingMenu(true)} />
            </>
          )}

          {/* Separador vertical sutil */}
          <div
            style={{
              width: '1px',
              height: '20px',
              background: 'rgba(255,255,255,0.2)',
              margin: '0 5px',
            }}
          />

          {/* MINIMIZE BUTTON */}
          <MinimizeIcon onClick={onMinimize} />
        </div>
      </div>

      {/* MODALS */}
      {settingMenu && (
        <SettingMenu
          setSettingState={setSettingMenu}
          currentTimings={currentTimings}
          setTimings={setTimings}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {historyOpen && <HistoryView onClose={() => setHistoryOpen(false)} />}
    </header>
  );
};
