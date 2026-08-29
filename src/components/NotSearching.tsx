import React from 'react';
import { t } from '../i18n/i18n';

interface NotSearchingProps {
  onScan?: () => void;
  onGrowth: () => void;
  onPendingRequests: () => void;
  onMetaImport: () => void;
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

const PendingIcon = () => (
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
    <path d='M9 11l3 3L22 4' />
    <path d='M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' />
  </svg>
);

const MetaIcon = () => (
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
    <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
    <polyline points='14 2 14 8 20 8' />
    <line x1='16' y1='13' x2='8' y2='13' />
    <line x1='16' y1='17' x2='8' y2='17' />
    <polyline points='10 9 9 9 8 9' />
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

export const NotSearching = ({ onScan, onGrowth, onPendingRequests, onMetaImport, isPro }: NotSearchingProps) => (
    <section className='empty-state-container'>
      <div className='empty-state-icon'>
        <ScanIcon />
      </div>

      <h2 className='empty-state-title'>{t('readyToAnalyze')}</h2>

      <p className='empty-state-description'>{t('scanDescription')}</p>

      <button className='run-scan-btn' onClick={onScan}>
        {t('startScanning')}
      </button>

      <button type='button' className='btn meta-entry-btn' onClick={onMetaImport}>
        <MetaIcon />
        <span>{t('metaEntry')}</span>
      </button>

      <button
        type='button'
        className='btn pending-entry-btn'
        onClick={onPendingRequests}
        title={!isPro ? t('growthProRequired') : undefined}
      >
        <PendingIcon />
        <span>{t('pendingEntry')}</span>
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
