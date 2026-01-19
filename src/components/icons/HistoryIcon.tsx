import React from 'react';

export const HistoryIcon = ({ onClick }: { onClick?: () => void }) => (
  <div
    className='icon-button'
    onClick={onClick}
    style={{ cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
    title='Open History Log'
  >
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
      <circle cx='12' cy='12' r='10' />
      <polyline points='12 6 12 12 16 14' />
    </svg>
  </div>
);
