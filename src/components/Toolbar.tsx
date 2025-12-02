import React, { ChangeEvent, useState } from 'react';
import { State } from '../model/state';
import { assertUnreachable, copyListToClipboard, getUsersForDisplay } from '../utils/utils';
import { SettingMenu } from './SettingMenu';
import { SettingIcon } from './icons/SettingIcon';
import { Timings } from '../model/timings';
import { Logo } from './icons/Logo';

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
}: ToolBarProps) => {
  const [settingMenu, setSettingMenu] = useState(false);

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

  // Helper para calcular si "Select All" debe estar marcado
  const isSelectAllChecked = () => {
    if (state.status !== 'scanning') {
      return false;
    }

    const displayedUsers = getUsersForDisplay(
      state.results,
      state.whitelistedResults,
      state.currentTab,
      state.searchTerm,
      state.filter,
    );
    return state.selectedResults.length === displayedUsers.length && displayedUsers.length > 0;
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

        {/* COPY BUTTON */}
        {state.status === 'scanning' && (
          <button className='copy-list' onClick={handleCopyClick}>
            Copy List
          </button>
        )}

        {/* SETTINGS ICON */}
        {state.status === 'initial' && <SettingIcon onClickLogo={() => setSettingMenu(true)} />}

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
              checked={isSelectAllChecked()}
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
    </header>
  );
};
