import React from 'react';
import { t } from '../i18n/i18n';

export const ScanSummary = ({
  nonFollowers,
  mutuals,
  privateAccounts,
  ghosts,
}: {
  nonFollowers: number;
  mutuals: number;
  privateAccounts: number;
  ghosts: number;
}) => (
  <div className='scan-summary'>
    <p style={{ fontWeight: 'bold' }}>{t('scanSummaryTitle')}</p>
    <div className='scan-summary-grid'>
      <div className='scan-summary-cell'>
        <span className='scan-summary-value'>{nonFollowers}</span>
        <span className='scan-summary-label'>{t('nonFollowers')}</span>
      </div>
      <div className='scan-summary-cell'>
        <span className='scan-summary-value'>{mutuals}</span>
        <span className='scan-summary-label'>{t('mutuals')}</span>
      </div>
      <div className='scan-summary-cell'>
        <span className='scan-summary-value'>{privateAccounts}</span>
        <span className='scan-summary-label'>{t('private')}</span>
      </div>
      <div className='scan-summary-cell'>
        <span className='scan-summary-value'>{ghosts}</span>
        <span className='scan-summary-label'>{t('selectGhosts')}</span>
      </div>
    </div>
  </div>
);
