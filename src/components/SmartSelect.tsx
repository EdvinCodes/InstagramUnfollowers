import React from 'react';
import { t } from '../i18n/i18n';

export const SmartSelect = ({
  selectedCount,
  showWhitelist,
  whitelistLabel,
  onSelectVerified,
  onSelectPrivate,
  onSelectNoPic,
  onSelectGhosts,
  onClear,
  onBulkWhitelist,
}: {
  selectedCount: number;
  showWhitelist: boolean;
  whitelistLabel: string;
  onSelectVerified: () => void;
  onSelectPrivate: () => void;
  onSelectNoPic: () => void;
  onSelectGhosts: () => void;
  onClear: () => void;
  onBulkWhitelist: () => void;
}) => (
  <div className='smart-select'>
    <p style={{ fontWeight: 'bold' }}>{t('smartSelectTitle')}</p>
    <div className='smart-select-grid'>
      <button type='button' className='smart-select-btn' onClick={onSelectVerified}>
        {t('verified')}
      </button>
      <button type='button' className='smart-select-btn' onClick={onSelectPrivate}>
        {t('private')}
      </button>
      <button type='button' className='smart-select-btn' onClick={onSelectNoPic}>
        {t('selectNoPic')}
      </button>
      <button type='button' className='smart-select-btn' onClick={onSelectGhosts}>
        {t('selectGhosts')}
      </button>
    </div>
    <button
      type='button'
      className='smart-select-btn smart-select-btn--wide'
      onClick={onClear}
      disabled={selectedCount === 0}
    >
      {t('clearSelection')}
      {selectedCount > 0 ? ` (${selectedCount})` : ''}
    </button>
    {showWhitelist && (
      <button
        type='button'
        className='smart-select-btn smart-select-btn--wide smart-select-btn--protect'
        onClick={onBulkWhitelist}
        disabled={selectedCount === 0}
      >
        {whitelistLabel}
        {selectedCount > 0 ? ` (${selectedCount})` : ''}
      </button>
    )}
  </div>
);
