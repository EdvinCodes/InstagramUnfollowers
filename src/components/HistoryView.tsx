import React, { useEffect, useState } from 'react';
import { HistoryEvent, HistoryEventType } from '../model/history';
import { HistoryService } from '../services/historyService';

interface HistoryViewProps {
  onClose: () => void;
}

// const TrashIcon = () => (
//   <svg
//     viewBox='0 0 24 24'
//     fill='none'
//     stroke='currentColor'
//     strokeLinecap='round'
//     strokeLinejoin='round'
//   >
//     <polyline points='3 6 5 6 21 6' />
//     <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
//   </svg>
// );

export const HistoryView = ({ onClose }: HistoryViewProps) => {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [stats, setStats] = useState({
    totalUnfollowedByYou: 0,
    totalTraitorsDetected: 0,
    lastScanDate: null as number | null,
  });

  const TrashIcon = () => (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='3 6 5 6 21 6' />
      <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
    </svg>
  );

  useEffect(() => {
    // Cargar datos al abrir
    setEvents(HistoryService.getHistory());
    setStats(HistoryService.getStats());
  }, []);

  const handleClear = () => {
    if (confirm('Are you sure you want to delete all history? This cannot be undone.')) {
      HistoryService.clearHistory();
      setEvents([]);
      setStats({ totalUnfollowedByYou: 0, totalTraitorsDetected: 0, lastScanDate: null });
    }
  };

  // Helper para formatear fecha (Ej: "Today, 14:30")
  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));

  // Helper para iconos y colores según el evento
  const getEventStyle = (type: HistoryEventType) => {
    switch (type) {
      case 'DETECTED_UNFOLLOWER':
        return { icon: '🕵️', color: '#f87171', label: 'Traitor Detected' }; // Rojo
      case 'YOU_UNFOLLOWED':
        return { icon: '👋', color: '#34d399', label: 'You Unfollowed' }; // Verde
      case 'WHITELISTED':
        return { icon: '🛡️', color: '#60a5fa', label: 'Whitelisted' }; // Azul
      case 'UNWHITELISTED':
        return { icon: '🔓', color: '#94a3b8', label: 'Un-whitelisted' }; // Gris
    }
  };

  return (
    <div className='backdrop' onClick={onClose}>
      <div
        className='setting-menu'
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '600px', height: '85vh' }}
      >
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Time Machine 🕰️</h3>
          <button
            className='close-btn'
            onClick={onClose}
            style={{
              background: 'transparent',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            ✕
          </button>
        </div>

        {/* STATS DASHBOARD */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '1rem',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f87171' }}>
              {stats.totalTraitorsDetected}
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                color: '#fca5a5',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              New Traitors Found
            </div>
          </div>
          <div
            style={{
              background: 'rgba(52, 211, 153, 0.1)',
              padding: '1rem',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(52, 211, 153, 0.3)',
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#34d399' }}>
              {stats.totalUnfollowedByYou}
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                color: '#6ee7b7',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Cleaned by You
            </div>
          </div>
        </div>

        {/* TIMELINE */}
        <div
          className='unfollow-log-container'
          style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '0' }}
        >
          {events.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              <p>No history yet. Start scanning to populate the timeline!</p>
            </div>
          ) : (
            events.map(event => {
              const style = getEventStyle(event.type);
              return (
                <div
                  key={event.id}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  {/* Icono */}
                  <div style={{ fontSize: '1.5rem' }}>{style.icon}</div>

                  {/* Info Central */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.2rem',
                      }}
                    >
                      <span style={{ fontWeight: 'bold', color: 'white' }}>
                        @{event.user.username}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: style.color,
                          color: '#000',
                          fontWeight: 'bold',
                        }}
                      >
                        {style.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {formatDate(event.timestamp)}
                    </div>
                  </div>

                  {/* Avatar */}
                  <img
                    src={event.user.profile_pic_url}
                    alt=''
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'flex-end',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '1.5rem',
          }}
        >
          <button
            className='btn-clear-history'
            onClick={handleClear}
            disabled={events.length === 0} // Se desactiva si no hay nada que borrar
            title='Permanently delete all logs'
          >
            <TrashIcon />
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
};
