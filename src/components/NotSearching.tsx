import React from 'react';
import { t } from '../i18n/i18n';

interface NotSearchingProps {
  onScan?: () => void;
  onGrowth: () => void;
  isPro: boolean;
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
    <path d='M5 12a7 7 0 1 0 14 0 7 7 0 0 0 -14 0' />
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

export const NotSearching = ({ onScan, onGrowth, isPro }: NotSearchingProps) => (
    <section className='empty-state-container'>
      <div className='empty-state-icon'>
        <ScanIcon />
      </div>

      <h2 className='empty-state-title'>{t('readyToAnalyze')}</h2>

      <p className='empty-state-description'>{t('scanDescription')}</p>

      <button className='run-scan-btn' onClick={onScan}>
        {t('startScanning')}
      </button>

      <button
        type='button'
        className='btn growth-entry-btn'
        onClick={onGrowth}
        title={!isPro ? t('growthProRequired') : undefined}
      >
        <GrowthIcon />
        <span>
          {t('growthTitle')} <span className='growth-beta-tag'>{t('growthBeta')}</span>
        </span>
      </button>
    </section>
);
