import React from 'preact/compat';

interface Props {
  onClick?: () => void;
  title?: string;
}

// eslint-disable-next-line react/prop-types
export const HistoryIcon = ({ onClick, title }: Props) => (
  <div
    className='icon-button'
    onClick={onClick}
    style={{ cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
    title={title}
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
