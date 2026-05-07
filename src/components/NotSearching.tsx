import React from 'react';
import { t } from '../i18n/i18n';

interface NotSearchingProps {
  onScan?: () => void;
  onGrowth: () => void;
}

const ScanIcon = () => (
  <svg
    width='48'
    height='48'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.5'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M21 21l-6-6' />
    <path d='M5 12a7 7 0 1 0 14 0 7 7 0 0 0-14 0' />
    <path d='M12 9v3' />
    <path d='M12 15h.01' />
  </svg>
);

const GrowthIcon = () => (
  <svg
    width='18'
    height='18'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <polyline points='22 7 13.5 15.5 8.5 10.5 2 17' />
    <polyline points='16 7 22 7 22 13' />
  </svg>
);

export const NotSearching = ({ onScan, onGrowth }: NotSearchingProps) => {
  const handleStartScan = () => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ 'ig-last-scan-date': Date.now() });
    }
    if (onScan) onScan();
  };

  return (
    <section className='empty-state-container'>
      <div className='empty-state-icon'>
        <ScanIcon />
      </div>

      <h2 className='empty-state-title'>{t('readyToAnalyze')}</h2>

      <p className='empty-state-description'>{t('startScanning')}</p>

      <button className='run-scan-btn' onClick={handleStartScan}>
        {t('startScanning')}
      </button>

      {/* ── BOTÓN GROWTH (nuevo) ── */}
      <button className='btn growth-entry-btn' onClick={onGrowth}>
        <GrowthIcon />
        <span>
          Growth <span className='growth-beta-tag'>BETA</span>
        </span>
      </button>

      <style>{`
        .growth-entry-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: -0.25rem;
          width: 100%;
          max-width: 280px;
          padding: 0.65rem 1.4rem;
          background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1));
          border: 1px solid rgba(139,92,246,0.35) !important;
          color: #c4b5fd !important;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.3px;
        }
        .growth-entry-btn:hover {
          background: linear-gradient(135deg, rgba(139,92,246,0.28), rgba(99,102,241,0.2));
          border-color: rgba(167,139,250,0.6) !important;
          color: #ede9fe !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(139,92,246,0.2);
        }
        .growth-beta-tag {
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 1px;
          background: rgba(139,92,246,0.3);
          border: 1px solid rgba(167,139,250,0.4);
          color: #c4b5fd;
          padding: 1px 5px;
          border-radius: 4px;
          vertical-align: middle;
          margin-left: 2px;
        }
      `}</style>
    </section>
  );
};
