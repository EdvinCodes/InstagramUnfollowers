import React, { ChangeEvent, FormEvent, useState, useRef } from 'react';
import { Timings } from '../model/timings';
import { getDynamicStorageKey } from '../utils/utils';
import { WHITELISTED_RESULTS_STORAGE_KEY } from '../constants/constants';

interface SettingMenuProps {
  setSettingState: (state: boolean) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

interface SettingInputProps {
  label: string;
  value: number;
  min: number;
  name: string;
  onChange: (newValue: number) => void;
}

const SettingRow = ({ label, value, min, name, onChange }: SettingInputProps) => (
  <div className='row'>
    <label htmlFor={name}>{label}</label>
    <div className='input-group'>
      <input
        type='number'
        id={name}
        name={name}
        min={min}
        max={999999}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.currentTarget.value))}
      />
      <span className='unit'>(ms)</span>
    </div>
  </div>
);

export const SettingMenu = ({
  setSettingState,
  currentTimings,
  setTimings,
  theme,
  toggleTheme,
}: SettingMenuProps) => {
  const [timeBetweenSearchCycles, setTimeBetweenSearchCycles] = useState(
    currentTimings.timeBetweenSearchCycles,
  );
  const [timeToWaitAfterFiveSearchCycles, setTimeToWaitAfterFiveSearchCycles] = useState(
    currentTimings.timeToWaitAfterFiveSearchCycles,
  );
  const [timeBetweenUnfollows, setTimeBetweenUnfollows] = useState(
    currentTimings.timeBetweenUnfollows,
  );
  const [timeToWaitAfterFiveUnfollows, setTimeToWaitAfterFiveUnfollows] = useState(
    currentTimings.timeToWaitAfterFiveUnfollows,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    setTimings({
      timeBetweenSearchCycles,
      timeToWaitAfterFiveSearchCycles,
      timeBetweenUnfollows,
      timeToWaitAfterFiveUnfollows,
    });
    setSettingState(false);
  };

  // --- LÓGICA DE BACKUP Y RESTAURACIÓN ---
  const handleExportBackup = () => {
    const dynamicWhitelistKey = getDynamicStorageKey(WHITELISTED_RESULTS_STORAGE_KEY);
    const whitelistData = localStorage.getItem(dynamicWhitelistKey);

    const backup = {
      timings: {
        timeBetweenSearchCycles,
        timeToWaitAfterFiveSearchCycles,
        timeBetweenUnfollows,
        timeToWaitAfterFiveUnfollows,
      },
      whitelist: whitelistData ? JSON.parse(whitelistData) : [],
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `ig_unfollowers_backup_${dateStr}.json`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportBackup = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target?.result as string);

        // Restaurar Timings
        if (data.timings) {
          setTimeBetweenSearchCycles(data.timings.timeBetweenSearchCycles);
          setTimeToWaitAfterFiveSearchCycles(data.timings.timeToWaitAfterFiveSearchCycles);
          setTimeBetweenUnfollows(data.timings.timeBetweenUnfollows);
          setTimeToWaitAfterFiveUnfollows(data.timings.timeToWaitAfterFiveUnfollows);
        }

        // Restaurar Whitelist
        if (data.whitelist && Array.isArray(data.whitelist)) {
          const dynamicWhitelistKey = getDynamicStorageKey(WHITELISTED_RESULTS_STORAGE_KEY);
          localStorage.setItem(dynamicWhitelistKey, JSON.stringify(data.whitelist));
        }

        alert(
          'Backup imported successfully! Save settings to apply timings. Whitelist is already restored.',
        );
      } catch (err) {
        alert('Error importing backup. Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <form onSubmit={handleSave}>
      <div className='backdrop'>
        <div className='setting-menu'>
          <div>
            <h3>Settings & Backup</h3>
          </div>

          <SettingRow
            label='Default time between search cycles'
            name='searchCycles'
            min={500}
            value={timeBetweenSearchCycles}
            onChange={setTimeBetweenSearchCycles}
          />

          <SettingRow
            label='Default time to wait after five search cycles'
            name='fiveSearchCycles'
            min={4000}
            value={timeToWaitAfterFiveSearchCycles}
            onChange={setTimeToWaitAfterFiveSearchCycles}
          />

          <SettingRow
            label='Default time between unfollows'
            name='timeBetweenUnfollow'
            min={1000}
            value={timeBetweenUnfollows}
            onChange={setTimeBetweenUnfollows}
          />

          <SettingRow
            label='Default time to wait after five unfollows'
            name='timeAfterFiveUnfollows'
            min={70000}
            value={timeToWaitAfterFiveUnfollows}
            onChange={setTimeToWaitAfterFiveUnfollows}
          />

          <SettingRow
            label='Default time to wait after five unfollows'
            name='timeAfterFiveUnfollows'
            min={70000}
            value={timeToWaitAfterFiveUnfollows}
            onChange={setTimeToWaitAfterFiveUnfollows}
          />

          {/* <-- SECCIÓN DE TEMA AÑADIDA --> */}
          <div
            className='row'
            style={{
              marginTop: '1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '1.5rem',
            }}
          >
            <label>App Visual Theme</label>
            <button
              type='button'
              className='btn'
              onClick={toggleTheme}
              style={{
                minWidth: '140px',
                background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#06b6d4',
                color: theme === 'dark' ? 'white' : '#0f172a',
              }}
            >
              {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
          </div>

          {/* SECCIÓN DE BACKUP Y RESTAURACIÓN */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Data Management (Export your Whitelist & Settings)
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type='button'
                className='btn'
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  color: '#06b6d4',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                }}
                onClick={handleExportBackup}
              >
                📥 Export Backup
              </button>

              <input
                type='file'
                accept='.json'
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImportBackup}
              />
              <button
                type='button'
                className='btn'
                style={{ flex: 1 }}
                onClick={() => fileInputRef.current?.click()}
              >
                📤 Import Backup
              </button>
            </div>
          </div>

          <div className='warning-container'>
            <h3 className='warning'>
              <b>WARNING:</b> Modifying these settings significantly increases the risk of your
              account being banned.
            </h3>
            <h3 className='warning'>USE AT YOUR OWN RISK.</h3>
          </div>

          <div className='btn-container'>
            <button className='btn' type='button' onClick={() => setSettingState(false)}>
              Cancel
            </button>
            <button className='btn btn-primary' type='submit'>
              Save
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
