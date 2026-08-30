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
import { listDiffPeople } from '../utils/metaDiff';
import { CopyIcon } from './icons/CopyIcon';
import { DownloadIcon } from './icons/DownloadIcon';

import { generateHealthReportPDF } from '../utils/pdfGenerator';
import { PdfIcon } from './icons/PdfIcon';

import { HistoryIcon } from './icons/HistoryIcon';

// Icono simple de Minimizar
const MinimizeIcon = ({ onClick }: { onClick: () => void }) => (
  <button
    type='button'
    className='icon-button minimize-btn'
    onClick={onClick}
    title={t('minimize')}
    aria-label={t('minimize')}
  >
    <svg
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <polyline points='6 9 12 15 18 9' />
    </svg>
  </button>
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
  onOpenHistory: () => void;
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
  onOpenHistory,
}: ToolBarProps) => {
  const [settingMenu, setSettingMenu] = useState(false);

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
      case 'pending_requests':
      case 'meta_import':
      case 'clean_lists':
        setState({ status: 'initial' });
        break;
      case 'scanning':
      case 'unfollowing':
        setState({ status: 'initial' });
        break;
      default:
        assertUnreachable(state);
    }
  };

  const handleCopyClick = async () => {
    if (state.status !== 'scanning') {
      return;
    }
    if (state.currentTab === 'changes' && state.metaDiff) {
      const people = listDiffPeople(state.metaDiff, state.searchTerm);
      await navigator.clipboard.writeText(people.map(person => person.username).join('\n'));
      onShowToast(t('copiedToClipboard')(people.length));
      return;
    }
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
      case 'meta_import':
      case 'clean_lists':
        return;
      case 'pending_requests':
        if (state.phase !== 'running') {
          return;
        }
        setState({ ...state, searchTerm: value });
        break;
      case 'scanning':
        setState({ ...state, searchTerm: value, page: 1, selectedResults: [] });
        break;
      case 'unfollowing':
        setState({ ...state, searchTerm: value });
        break;
      default:
        assertUnreachable(state);
    }
  };

  return (
    <header className='app-header'>
      {isActiveProcess && (
        <progress
          className='progressbar'
          value={
            state.status === 'scanning' ||
            state.status === 'unfollowing' ||
            state.status === 'pending_requests'
              ? state.percentage
              : 0
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
        {(state.status === 'scanning' ||
          state.status === 'unfollowing' ||
          (state.status === 'pending_requests' && state.phase === 'running')) && (
          <input
            type='text'
            className='search-bar header-search'
            placeholder={t('searchPlaceholder')}
            value={state.searchTerm}
            onKeyDown={e => e.stopPropagation()}
            onChange={handleSearchChange}
            aria-label={t('searchAccounts')}
          />
        )}

        {/* CHECKBOXES */}
        {state.status === 'scanning' && state.source !== 'meta' && (
          <div style={{ display: 'flex', gap: '8px', marginRight: '0.5rem', alignItems: 'center' }}>
            <label className='checkbox-label' title={t('selectPage')}>
              <input
                type='checkbox'
                disabled={state.percentage > 0 && state.percentage < 100 && !scanningPaused}
                className='toggle-all-checkbox'
                onChange={toggleCurrentPageUsers}
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
                onChange={toggleAllUsers}
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
              <HistoryIcon title={t('history')} onClick={onOpenHistory} />
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

    </header>
  );
};
