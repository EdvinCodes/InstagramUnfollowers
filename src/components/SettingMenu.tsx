import React, { ChangeEvent, FormEvent, useState, useRef, useEffect } from 'react';
import { Timings } from '../model/timings';
import { t, getLocale, setLocale } from '../i18n/i18n';
import type { Locale } from '../i18n/translations';
import { isMonitorEnabled, setMonitorEnabled } from '../services/realtimeMonitor';
// import { CloudSync, type SyncState } from '../services/cloudSync';
// import { HistoryService } from '../services/historyService';
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
  // deactivatePro,
  isLicenseLoading: isLoading,
}: SettingMenuProps) => {
  const [monitorEnabled, setMonitorEnabledState] = useState(isMonitorEnabled);
  // const [syncState, setSyncState] = useState<SyncState>('idle');
  // const [lastSync, setLastSync] = useState<number | null>(CloudSync.getLastSyncTs);
  const [locale, setLocaleState] = useState<Locale>(getLocale);
  // Inicializamos el gestor de licencias
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseError, setLicenseError] = useState(false);

  const [scanFrequency, setScanFrequency] = useState<number>(7);

  // Leer la configuración actual de Chrome Storage (ESLint & TS Happy)
  useEffect(() => {
    chrome.storage.local.get(['ig_scan_frequency'], result => {
      if (result.ig_scan_frequency) {
        setScanFrequency(Number(result.ig_scan_frequency)); // Forzamos a Number
      }
    });
  }, []);

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

        alert(t('backupImportSuccess'));
      } catch (err) {
        alert(t('backupImportError'));
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
            <h3 style={{ margin: 0 }}>{t('settingsBackup')}</h3>
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

          {/* <-- SECCIÓN DE TEMA AÑADIDA --> */}
          <div className='row'>
            <label>{t('appVisualTheme')}</label>
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
              {theme === 'dark' ? t('darkMode') : t('lightMode')}
            </button>
          </div>

          <div className='row'>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 'bold', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}>
                {t('scheduledAlerts')}
              </span>
              <span
                style={{ fontSize: '0.75rem', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
              >
                {t('scheduledAlertsDesc')}
              </span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={scanFrequency}
                onChange={e => {
                  if (!isPro) {
                    alert(t('proFeatureUpgrade'));
                    return;
                  }
                  const val = Number(e.currentTarget.value);
                  setScanFrequency(val);
                  chrome.storage.local.set({ ig_scan_frequency: val });
                }}
                style={{
                  // 1. Ocultamos la flecha nativa del navegador
                  appearance: 'none',
                  WebkitAppearance: 'none',

                  // 2. Color de fondo (usamos backgroundColor en lugar de background para no pisar la imagen)
                  backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',

                  // 3. Dibujamos nuestra propia flecha SVG dinámica según el tema
                  backgroundImage:
                    theme === 'dark'
                      ? "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f8fafc'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")"
                      : "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%230f172a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                  backgroundPosition: 'calc(100% - 12px) center', // Separada 12px del borde derecho
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '16px',

                  // Resto de estilos adaptados
                  color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                  border: `1px solid ${
                    isPro
                      ? theme === 'dark'
                        ? '#4ade80'
                        : '#16a34a'
                      : theme === 'dark'
                        ? 'rgba(255,255,255,0.15)'
                        : '#cbd5e1'
                  }`,
                  padding: '0.5rem 2.5rem 0.5rem 1rem', // 2.5rem a la derecha para que el texto no pise la nueva flecha
                  borderRadius: '50px',
                  cursor: isPro ? 'pointer' : 'not-allowed',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  minWidth: '160px',
                }}
              >
                <option value={7}>{t('every7days')}</option>
                <option value={3} disabled={!isPro}>
                  {t('every3days')}
                </option>
                <option value={1} disabled={!isPro}>
                  {t('every24hours')}
                </option>
              </select>
              {!isPro && (
                <span
                  style={{ position: 'absolute', right: '-25px', top: '8px', fontSize: '14px' }}
                >
                  🔒
                </span>
              )}
            </div>
          </div>

          {/* --- SECCIÓN PREMIUM --- */}
          <div
            style={{
              padding: '15px',
              borderRadius: '8px',
              background: isPro ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.05)',
              border: `1px solid ${isPro ? '#4ade80' : '#ef4444'}`,
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
              {isPro ? t('proVersionActivated') : t('upgradeToPro')}
            </h3>

            {isLoading ? (
              <p style={{ fontSize: '12px', color: '#888' }}>{t('checkingLicense')}</p>
            ) : isPro ? (
              <div>
                <p style={{ fontSize: '12px', color: '#4ade80', marginBottom: '10px' }}>
                  {t('allFeaturesUnlocked')}
                </p>
                {/* <button
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
                  {t('deactivateLicense')}
                </button> */}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                  {t('proVersionActivatedDesc')}
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type='text'
                    placeholder={t('pasteLicenseKey')}
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
                    {t('activate')}
                  </button>
                </div>
                {licenseError && (
                  <span style={{ color: '#ef4444', fontSize: '11px' }}>
                    {t('invalidLicenseKey')}
                  </span>
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
                  {t('getLicenseKey')}
                </a>
              </div>
            )}
          </div>

          {/* SECCIÓN DE BACKUP */}
          <div
            style={{
              marginTop: '1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              {t('dataManagement')}
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
                📥 {t('exportBackup')}
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
                📤 {t('importBackup')}
              </button>
            </div>
          </div>

          {/* LANGUAGE */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{t('language')}</span>
            <select
              value={locale}
              onChange={e => {
                const newLocale = e.currentTarget.value as Locale;
                setLocale(newLocale);
                setLocaleState(newLocale);
              }}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
                padding: '0.5rem 2.5rem 0.5rem 1rem',
                borderRadius: '50px',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                minWidth: '160px',
              }}
            >
              <option value='en'>🇬🇧 English</option>
              <option value='es'>🇪🇸 Español</option>
              <option value='pt-BR'>🇧🇷 Português (BR)</option>
              <option value='fr'>🇫🇷 Français</option>
              <option value='it'>🇮🇹 Italiano</option>
              <option value='de'>🇩🇪 Deutsch</option>
              <option value='tr'>🇹🇷 Türkçe</option>
            </select>
          </div>

          {/* REAL-TIME ALERTS (3C) */}
          <div
            style={{
              marginTop: '1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <p style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
              {t('realtimeAlerts')}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.8rem' }}>
              {t('realtimeAlertsDesc')}
            </p>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}
            >
              <input
                type='checkbox'
                checked={monitorEnabled}
                onChange={e => {
                  const val = e.currentTarget.checked;
                  setMonitorEnabled(val);
                  setMonitorEnabledState(val);
                }}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.9rem' }}>{t('realtimeEnabled')}</span>
            </label>
          </div>

          {/* BYPASS TEMPORAL: CloudSync oculto temporalmente hasta configurar Supabase */}
          {/* <div
            style={{
              marginTop: '1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <p style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
              {t('cloudSync')} {!isPro && <span style={{ fontSize: 14 }}>🔒</span>}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.8rem' }}>
              {t('cloudSyncDesc')}
            </p>
            {lastSync && (
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.6rem' }}>
                {t('lastSynced')}:{' '}
                {new Intl.DateTimeFormat('default', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date(lastSync))}
              </p>
            )}
            <button
              type='button'
              disabled={!isPro || !CloudSync.isConfigured() || syncState === 'syncing'}
              onClick={async () => {
                if (!isPro) {
                  alert(t('proFeatureUpgrade'));
                  return;
                }
                setSyncState('syncing');
                try {
                  const history = HistoryService.getHistory();
                  const wlKey = getDynamicStorageKey(WHITELISTED_RESULTS_STORAGE_KEY);
                  const wlRaw = localStorage.getItem(wlKey);
                  const whitelist = wlRaw ? JSON.parse(wlRaw) : [];
                  const ok = await CloudSync.sync(history, whitelist);
                  setSyncState(ok ? 'synced' : 'error');
                  if (ok) {
                    setLastSync(CloudSync.getLastSyncTs());
                  }
                  setTimeout(() => setSyncState('idle'), 3000);
                } catch {
                  setSyncState('error');
                  setTimeout(() => setSyncState('idle'), 3000);
                }
              }}
              style={{
                background: isPro ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.05)',
                color: isPro ? '#06b6d4' : '#94a3b8',
                border: `1px solid ${isPro ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.1)'}`,
                padding: '0.5rem 1.2rem',
                borderRadius: '50px',
                cursor: isPro && CloudSync.isConfigured() ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
              }}
            >
              {syncState === 'syncing'
                ? t('syncing')
                : syncState === 'synced'
                  ? t('synced')
                  : syncState === 'error'
                    ? t('syncError')
                    : t('syncNow')}
            </button>
            {!CloudSync.isConfigured() && isPro && (
              <p style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.4rem' }}>
                Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON to your .env file to enable
                cloud sync.
              </p>
            )}
          </div>
          */}

          <div className='warning-container'>
            <h3 className='warning'>
              <b>{t('warningMsg')}</b>
            </h3>
            <h3 className='warning'>{t('useAtOwnRisk')}</h3>
          </div>

          <div className='btn-container'>
            <button className='btn' type='button' onClick={() => setSettingState(false)}>
              {t('cancel')}
            </button>
            <button className='btn btn-primary' type='submit'>
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
