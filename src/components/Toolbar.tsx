import React, { ChangeEvent, useState } from 'react';
import { t } from '../i18n/i18n';
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
  <div className='icon-button minimize-btn' onClick={onClick} title={t('minimize')}>
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
  toggleCurrentPageUsers: (e: ChangeEvent<HTMLInputElement>) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
  onShowToast: (message: string) => void;
  isPageSelected: boolean;
  isAllSelected: boolean;
  onMinimize: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  isPro: boolean;
  activatePro: (key: string) => Promise<boolean>;
  deactivatePro: () => void;
  isLicenseLoading: boolean;
}

export const Toolbar = ({
  isActiveProcess,
  state,
  setState,
  scanningPaused,
  toggleAllUsers,
  toggleCurrentPageUsers,
  currentTimings,
  setTimings,
  onShowToast,
  isPageSelected,
  isAllSelected,
  onMinimize,
  theme,
  toggleTheme,
  isPro,
  activatePro,
  deactivatePro,
  isLicenseLoading,
}: ToolBarProps) => {
  const [settingMenu, setSettingMenu] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleLogoClick = () => {
    if (isActiveProcess) {
      return;
    }
    switch (state.status) {
      case 'initial':
        if (confirm(t('confirmGoBack'))) {
          location.reload();
        }
        break;
      case 'growth':
        setState({ status: 'initial' });
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
        t,
      );

      await copyListToClipboard(usersToCopy);
      onShowToast(t('copiedToClipboard')(usersToCopy.length));
    }
  };

  const handleExportClick = () => {
    if (state.status === 'scanning') {
      exportToCSV(state.results, state.whitelistedResults, isPro, t); // Pasa isPro aquí
      onShowToast(t('exportedToCSV')(state.results.length));
    }
  };

  const handlePdfClick = async () => {
    // EL PAYWALL ACTIVO PARA EL PDF
    if (!isPro) {
      onShowToast(`${t('proFeaturePDF')}`);
      return;
    }

    if (state.status === 'scanning') {
      const nonFollowers = state.results.filter(u => !u.follows_viewer);

      onShowToast(`${t('generatingPDF')}`);
      try {
        await generateHealthReportPDF(nonFollowers, state.whitelistedResults, t);
        onShowToast(`${t('healthReportDownloaded')}`);
      } catch (error) {
        onShowToast(`${t('pdfError')}`);
      }
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    switch (state.status) {
      case 'initial':
      case 'growth':
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
          value={
            state.status === 'scanning' || state.status === 'unfollowing' ? state.percentage : 0
          }
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
            placeholder={t('searchPlaceholder')}
            value={
              state.status === 'scanning' || state.status === 'unfollowing' ? state.searchTerm : ''
            }
            onKeyDown={e => e.stopPropagation()}
            onChange={handleSearchChange}
            style={{ margin: '0 1rem' }}
          />
        )}

        {/* CHECKBOXES */}
        {state.status === 'scanning' && (
          <div style={{ display: 'flex', gap: '8px', marginRight: '0.5rem', alignItems: 'center' }}>
            <label className='checkbox-label' title={t('selectPage')}>
              <input
                type='checkbox'
                disabled={state.percentage > 0 && state.percentage < 100 && !scanningPaused}
                className='toggle-all-checkbox'
                onClick={toggleCurrentPageUsers}
                checked={isPageSelected}
              />
              <span className='checkbox-text'>{t('page')}</span>
            </label>
            <label className='checkbox-label' title={t('selectAll')}>
              <input
                type='checkbox'
                disabled={state.percentage > 0 && state.percentage < 100 && !scanningPaused}
                checked={isAllSelected}
                className='toggle-all-checkbox'
                onClick={toggleAllUsers}
              />
              <span className='checkbox-text'>{t('all')}</span>
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
                title={t('copyList')}
                style={{ padding: '0.5rem' }}
              >
                <CopyIcon />
              </button>
              <button
                className='copy-list'
                onClick={handleExportClick}
                style={{ padding: '0.5rem' }}
                title={t('exportCsv')}
              >
                <DownloadIcon />
              </button>

              {/* BOTÓN PREMIUM PDF PROTEGIDO */}
              <button
                className='copy-list premium-report-btn'
                onClick={handlePdfClick}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={t('downloadHealthReport')}
              >
                <PdfIcon />
                <span className='btn-text'>{isPro ? t('reportBtn') : '🔒 ' + t('reportBtn')}</span>
              </button>
            </>
          )}

          {/* Initial Actions */}
          {state.status === 'initial' && (
            <>
              <KofiButton
                title={t('kofiTitle')}
                ariaLabel={t('kofiAriaLabel')}
                text={t('support')}
              />
              <HistoryIcon title={t('history')} onClick={() => setHistoryOpen(true)} />
              <SettingIcon title={t('settingsTooltip')} onClickLogo={() => setSettingMenu(true)} />
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
          isPro={isPro}
          activatePro={activatePro}
          deactivatePro={deactivatePro}
          isLicenseLoading={isLicenseLoading}
        />
      )}

      {historyOpen && <HistoryView onClose={() => setHistoryOpen(false)} isPro={isPro} />}
    </header>
  );
};
