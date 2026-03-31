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
  isPro: boolean;
  activatePro: (key: string) => Promise<boolean>;
  deactivatePro: () => void;
  isLicenseLoading: boolean;
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
  isPro,
  activatePro,
  deactivatePro,
  isLicenseLoading: isLoading,
}: SettingMenuProps) => {
  // Inicializamos el gestor de licencias
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseError, setLicenseError] = useState(false);

  const handleActivate = async () => {
    const success = await activatePro(licenseInput);
    if (!success) {
      setLicenseError(true);
      setTimeout(() => setLicenseError(false), 3000);
    } else {
      setLicenseInput('');
    }
  };

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
          try {
            localStorage.setItem(dynamicWhitelistKey, JSON.stringify(data.whitelist));
          } catch (err) {
            console.error('Error writing whitelist', err);
          }
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <h3 style={{ margin: 0 }}>Settings & Backup</h3>
            <button
              type='button'
              className='close-btn'
              onClick={() => setSettingState(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'inherit',
                padding: '0.5rem',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
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
          <div className='row'>
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

          {/* --- SECCIÓN PREMIUM --- */}
          <div
            style={{
              padding: '15px',
              borderRadius: '8px',
              background: isPro ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.05)',
              border: `1px solid ${isPro ? '#4ade80' : '#ef4444'}`,
              marginTop: '1.5rem',
            }}
          >
            <h3
              style={{
                margin: '0 0 10px 0',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isPro ? '👑 PRO Version Activated' : '🔒 Upgrade to PRO'}
            </h3>

            {isLoading ? (
              <p style={{ fontSize: '12px', color: '#888' }}>Checking license...</p>
            ) : isPro ? (
              <div>
                <p style={{ fontSize: '12px', color: '#4ade80', marginBottom: '10px' }}>
                  All premium features unlocked. Thank you for your support!
                </p>
                <button
                  type='button'
                  onClick={deactivatePro}
                  style={{
                    background: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Deactivate License
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                  Unlock the Health Report PDF, Ghost Score 0-100, and advanced exports.
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type='text'
                    placeholder='Paste License Key (IGPRO-...)'
                    value={licenseInput}
                    onChange={e => setLicenseInput((e.target as HTMLInputElement).value)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '4px',
                      border: '1px solid #555',
                      background: '#222',
                      color: '#fff',
                    }}
                  />
                  <button
                    type='button'
                    onClick={handleActivate}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '0 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Activate
                  </button>
                </div>
                {licenseError && (
                  <span style={{ color: '#ef4444', fontSize: '11px' }}>Invalid License Key.</span>
                )}
                <a
                  href='https://igunfollowerspro.lemonsqueezy.com/checkout/buy/32e77393-d119-4d87-92c9-a32b022c80dc'
                  target='_blank'
                  rel='noopener noreferrer'
                  style={{
                    color: '#ef4444',
                    fontSize: '12px',
                    textDecoration: 'underline',
                    marginTop: '4px',
                  }}
                >
                  Get a License Key (€9.99)
                </a>
              </div>
            )}
          </div>

          {/* SECCIÓN DE BACKUP */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Data Management (Export Whitelist & Settings)
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
              <b>WARNING:</b> Modifying these settings increases ban risk.
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
