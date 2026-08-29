import React, { useEffect, useState } from 'react';
import { HistoryEvent, HistoryEventType } from '../model/history';
import { HistoryService } from '../services/historyService';
import { StatsChart } from './StatsChart';
import { t } from '../i18n/i18n';

interface HistoryViewProps {
  onClose: () => void;
  isPro: boolean;
}

export const HistoryView = ({ onClose, isPro }: HistoryViewProps) => {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [stats, setStats] = useState({
    totalUnfollowedByYou: 0,
    totalTraitorsDetected: 0,
    totalWhitelisted: 0,
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
    let history = HistoryService.getHistory();

    if (!isPro) {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      history = history.filter(h => h.timestamp >= thirtyDaysAgo);
    }

    setEvents(history);

    setStats({
      totalTraitorsDetected: history.filter(h => h.type === 'DETECTED_UNFOLLOWER').length,
      totalUnfollowedByYou: history.filter(h => h.type === 'YOU_UNFOLLOWED').length,
      totalWhitelisted: history.filter(h => h.type === 'WHITELISTED').length,
      lastScanDate: history.find(h => h.type === 'DETECTED_UNFOLLOWER')?.timestamp || null,
    });
  }, [isPro]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const handleClear = () => {
    if (confirm(t('confirmClearHistory'))) {
      HistoryService.clearHistory();
      setEvents([]);
      setStats({
        totalUnfollowedByYou: 0,
        totalTraitorsDetected: 0,
        lastScanDate: null,
        totalWhitelisted: 0,
      });
    }
  };

  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat('default', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));

  const getEventStyle = (type: HistoryEventType) => {
    switch (type) {
      case 'DETECTED_UNFOLLOWER':
        return { icon: '🕵️', color: '#f87171', label: t('traitorDetected') };
      case 'YOU_UNFOLLOWED':
        return { icon: '👋', color: '#34d399', label: t('youUnfollowed') };
      case 'YOU_FOLLOWED':
        return { icon: '➕', color: '#22d3ee', label: t('growthYouFollowed') };
      case 'WHITELISTED':
        return { icon: '🛡️', color: '#60a5fa', label: t('whitelisted') };
      case 'UNWHITELISTED':
        return { icon: '🔓', color: '#94a3b8', label: t('unWhitelisted') };
      case 'SOFT_BLOCKED': // <-- Añadido para el Soft Block
        return { icon: '🚫', color: '#eab308', label: t('removedFollower') };
      case 'REQUEST_CANCELLED':
        return { icon: '🚫', color: '#fb923c', label: t('pendingYouCancelled') };
      default: // <-- Seguridad para que TypeScript no se queje
        return { icon: '📝', color: '#ffffff', label: t('unknownEvent') };
    }
  };
  return (
    <div className='backdrop' onClick={onClose} style={{ padding: '0' }}>
      {/* ARREGLO 1: Padding 0 en backdrop para aprovechar espacio en móvil */}

      <div
        className='setting-menu'
        onClick={e => e.stopPropagation()}
        style={{
          // ARREGLO 2: Estilos para Layout Flexible Vertical
          display: 'flex',
          flexDirection: 'column',
          width: '95%', // Ancho casi total en móvil
          maxWidth: '600px', // Tope en escritorio
          height: '85vh', // Altura fija
          maxHeight: '850px',
          padding: '1.5rem',
          overflow: 'hidden', // Ocultamos scroll del contenedor padre
        }}
      >
        {/* === HEADER (Fijo) === */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexShrink: 0, // No encoger
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{t('timeMachine')}</h3>
          <button
            type='button'
            className='close-btn'
            onClick={onClose}
            style={{
              background: 'transparent',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem',
              lineHeight: 1,
            }}
            aria-label={t('cancel')}
          >
            ✕
          </button>
        </div>

        {/* === BODY SCROLLABLE (Chart + Lista) === */}
        {/* ARREGLO 3: Wrapper con scroll para el contenido central */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
            paddingRight: '5px', // Espacio para la barra de scroll visual
          }}
        >
          {/* DASHBOARD */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '1rem', // Menos padding en móvil
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center', // Centrado en móvil
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <StatsChart
              detected={stats.totalTraitorsDetected}
              cleaned={stats.totalUnfollowedByYou}
              whitelisted={stats.totalWhitelisted}
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem',
                minWidth: '140px',
              }}
            >
              {/* Traitors */}
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#f87171',
                    }}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{t('traitors')}</span>
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#f87171' }}>
                  {stats.totalTraitorsDetected}
                </span>
              </div>
              {/* Cleaned */}
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#34d399',
                    }}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{t('cleaned')}</span>
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#34d399' }}>
                  {stats.totalUnfollowedByYou}
                </span>
              </div>
              {/* Protected */}
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#60a5fa',
                    }}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{t('protected')}</span>
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#60a5fa' }}>
                  {stats.totalWhitelisted}
                </span>
              </div>
            </div>
          </div>

          {/* TIMELINE LIST */}
          <div
            className='unfollow-log-container'
            style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '12px',
              padding: '0',
              // Eliminamos overflow aquí porque ahora scrollea el padre (el wrapper)
              overflow: 'visible',
            }}
          >
            {events.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <p>{t('noHistoryYet')}</p>
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
                    <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{style.icon}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {' '}
                      {/* minWidth 0 ayuda al truncado de texto flex */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.2rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span className='history-username'>
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
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {style.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {formatDate(event.timestamp)}
                      </div>
                    </div>

                    <img
                      src={event.user.profile_pic_url}
                      alt=''
                      onError={e => {
                        e.currentTarget.style.visibility = 'hidden';
                      }}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.1)',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
        {/* === FIN BODY SCROLLABLE === */}

        {/* === FOOTER (Fijo Abajo) === */}
        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            justifyContent: 'flex-end',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '1rem',
            flexShrink: 0, // No encoger
          }}
        >
          <button
            type='button'
            className='btn-clear-history'
            onClick={handleClear}
            disabled={events.length === 0}
            title={t('clearHistory')}
          >
            <TrashIcon />
            {t('clearHistory')}
          </button>
        </div>
      </div>
    </div>
  );
};
