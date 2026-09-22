import React from 'react';
import { t } from '../i18n/i18n';
import { ScanningFilter } from '../model/scanning-filter';
import { State } from '../model/state';

const FilterIcon = () => (
  <svg
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <line x1='4' y1='21' x2='4' y2='14' />
    <line x1='4' y1='10' x2='4' y2='3' />
    <line x1='12' y1='21' x2='12' y2='12' />
    <line x1='12' y1='8' x2='12' y2='3' />
    <line x1='20' y1='21' x2='20' y2='16' />
    <line x1='20' y1='12' x2='20' y2='3' />
    <line x1='1' y1='14' x2='7' y2='14' />
    <line x1='9' y1='8' x2='15' y2='8' />
    <line x1='17' y1='16' x2='23' y2='16' />
  </svg>
);

export { FilterIcon };

export const FiltersSidebar = ({
  state,
  handleScanFilter,
}: {
  state: State;
  handleScanFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const isMeta = state.status === 'scanning' && state.source === 'meta';
  const filters = isMeta
    ? []
    : [
        { name: 'showVerified', label: t('verified') },
        { name: 'showPrivate', label: t('private') },
        { name: 'showWithOutProfilePicture', label: t('noProfilePic') },
        { name: 'showGhostsOnly', label: t('ghostsBotsOnly') },
      ];

  return (
    <menu className='flex column m-clear p-clear'>
      {!isMeta && <p style={{ fontWeight: 'bold' }}>{t('filterResults')}</p>}
      {isMeta && <p className='meta-offline-note'>{t('metaOfflineBanner')}</p>}
      {isMeta && state.status === 'scanning' && !state.metaDiff && (
        <p className='meta-offline-note'>{t('metaDiffBaseline')}</p>
      )}
      {filters.map(filter => (
        <label key={filter.name} className='badge m-small' style={{ cursor: 'pointer' }}>
          <input
            type='checkbox'
            name={filter.name}
            checked={state.status === 'scanning' ? state.filter[filter.name as keyof ScanningFilter] : false}
            onChange={handleScanFilter}
          />
          &nbsp;{filter.label}
        </label>
      ))}
    </menu>
  );
};
