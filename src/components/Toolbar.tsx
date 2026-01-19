import React, { ChangeEvent, useState } from 'react';
import { State } from '../model/state';
import { SettingMenu } from './SettingMenu';
import { SettingIcon } from './icons/SettingIcon';
import { Timings } from '../model/timings';
import { Logo } from './icons/Logo';
import {
  exportToCSV,
  assertUnreachable,
  copyListToClipboard,
  getUsersForDisplay,
} from '../utils/utils';
import { CopyIcon } from './icons/CopyIcon';
import { DownloadIcon } from './icons/DownloadIcon';

import { HistoryView } from './HistoryView';
import { HistoryIcon } from './icons/HistoryIcon';

interface ToolBarProps {
  isActiveProcess: boolean;
  state: State;
  setState: (state: State) => void;
  scanningPaused: boolean;
  toggleAllUsers: (e: ChangeEvent<HTMLInputElement>) => void;
  toggleCurrentePageUsers: (e: ChangeEvent<HTMLInputElement>) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
  // Nueva prop para mostrar feedback al usuario
  onShowToast: (message: string) => void;
  isPageSelected: boolean;
  isAllSelected: boolean;
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
}: ToolBarProps) => {
  const [settingMenu, setSettingMenu] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // --- Handlers para limpiar el JSX ---

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
          style={{ cursor: isActiveProcess ? 'default' : 'pointer' }}
        >
          <Logo />
          <div className='logo-text'>
            <span>Instagram</span>
            <span>Unfollowers</span>
          </div>
        </div>

        {/* ACTION BUTTONS GROUP */}
        {state.status === 'scanning' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* BOTÓN COPY (Con icono añadido) */}
            <button
              className='copy-list'
              onClick={handleCopyClick}
              title='Copy visible list to clipboard'
            >
              <CopyIcon />
              Copy List
            </button>

            {/* BOTÓN EXPORT */}
            <button
              className='copy-list'
              onClick={handleExportClick}
              // Movemos el color a una clase CSS si fuera posible, si no, este style está bien
              style={{ backgroundColor: '#2d3748' }}
              title='Download full report as CSV'
            >
              <DownloadIcon />
              Export CSV
            </button>
          </div>
        )}

        {/* ICONS GROUP (Initial State) */}
        {state.status === 'initial' && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Nuevo botón Historial */}
            <HistoryIcon onClick={() => setHistoryOpen(true)} />
            {/* Botón Ajustes existente */}
            <SettingIcon onClickLogo={() => setSettingMenu(true)} />
          </div>
        )}

        {/* SEARCH BAR (Solo visible si NO estamos en inicio) */}
        {state.status !== 'initial' && (
          <input
            type='text'
            className='search-bar'
            placeholder='Search...'
            value={state.searchTerm}
            // Bloqueamos eventos de teclado de Instagram
            onKeyDown={e => e.stopPropagation()}
            onChange={handleSearchChange}
          />
        )}

        {/* CHECKBOX: SELECT CURRENT PAGE */}
        {state.status === 'scanning' && (
          <label className='checkbox-label' title='Select all visible users on this page'>
            <input
              type='checkbox'
              disabled={state.percentage < 100 && !scanningPaused}
              className='toggle-all-checkbox'
              onClick={toggleCurrentePageUsers}
              checked={isPageSelected}
            />
            <span className='checkbox-text'>Select Page</span>
          </label>
        )}

        {/* CHECKBOX: SELECT ALL GLOBAL */}
        {state.status === 'scanning' && (
          <label className='checkbox-label' title='Select absolutely everyone found'>
            <input
              type='checkbox'
              disabled={state.percentage < 100 && !scanningPaused}
              checked={isAllSelected}
              className='toggle-all-checkbox'
              onClick={toggleAllUsers}
            />
            <span className='checkbox-text'>Select All</span>
          </label>
        )}
      </div>

      {/* SETTINGS MODAL */}
      {settingMenu && (
        <SettingMenu
          setSettingState={setSettingMenu}
          currentTimings={currentTimings}
          setTimings={setTimings}
        />
      )}

      {/* HISTORY MODAL */}
      {historyOpen && <HistoryView onClose={() => setHistoryOpen(false)} />}
    </header>
  );
};
