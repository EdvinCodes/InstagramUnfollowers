import React, { useEffect } from 'react';

interface ToastProps {
  show?: boolean;
  style?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  closeLabel?: string;
}

const Icons = {
  success: (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
      <polyline points='22 4 12 14.01 9 11.01' />
    </svg>
  ),
  error: (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle cx='12' cy='12' r='10' />
      <line x1='15' y1='9' x2='9' y2='15' />
      <line x1='9' y1='9' x2='15' y2='15' />
    </svg>
  ),
  warning: (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
      <line x1='12' y1='9' x2='12' y2='13' />
      <line x1='12' y1='17' x2='12.01' y2='17' />
    </svg>
  ),
  info: (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle cx='12' cy='12' r='10' />
      <line x1='12' y1='16' x2='12' y2='12' />
      <line x1='12' y1='8' x2='12.01' y2='8' />
    </svg>
  ),
};

export const Toast = ({
  show = false,
  style = 'info',
  message,
  onClose,
  closeLabel = 'Close',
}: ToastProps) => {
  useEffect(() => {
    if (!show || !onClose) {
      return;
    }
    const timer = window.setTimeout(() => {
      onClose();
    }, 4500);
    return () => {
      window.clearTimeout(timer);
    };
    // onClose is typically an inline lambda; message/show reset the timer instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, message]);

  return (
    <div className={`toast ${show ? 'show' : ''} ${style}`} role='alert' aria-live='assertive'>
      <div className='toast__icon'>{Icons[style]}</div>

      <div className='toast__content'>
        <p className='toast__message'>{message}</p>
      </div>

      {onClose && (
        <button
          className='toast__close-button'
          onClick={onClose}
          title={closeLabel}
          aria-label={closeLabel}
        >
          &times;
        </button>
      )}
    </div>
  );
};
