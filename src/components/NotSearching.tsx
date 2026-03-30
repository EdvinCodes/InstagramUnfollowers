import React from 'react';

interface NotSearchingProps {
  onScan?: () => void;
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

export const NotSearching = ({ onScan }: NotSearchingProps) => {
  // 1. Creamos el interceptor del clic
  const handleStartScan = () => {
    // A. Silenciamos el recordatorio de background.js y quitamos el globo rojo
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ ig_last_scan_date: Date.now() });
      if (chrome.action) {
        chrome.action.setBadgeText({ text: '' });
      }
    }

    // B. Ejecutamos el escaneo original
    if (onScan) {
      onScan();
    }
  };

  return (
    <section className='empty-state-container'>
      <div className='empty-state-icon'>
        <ScanIcon />
      </div>

      <h2 className='empty-state-title'>Ready to Analyze?</h2>

      <p className='empty-state-description'>
        Start scanning your profile to detect users who are not following you back.
      </p>

      {/* 2. Conectamos el botón a nuestra nueva función */}
      <button className='run-scan-btn' onClick={handleStartScan}>
        START SCANNING
      </button>
    </section>
  );
};
