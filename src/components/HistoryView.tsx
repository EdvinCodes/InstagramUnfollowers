import React, { useEffect, useMemo, useState } from 'react';
import { HistoryEvent, HistoryEventType } from '../model/history';
import { HistoryService } from '../services/historyService';
import { t } from '../i18n/i18n';
import {
  HistoryFilter,
  isCancelledSummary,
  matchesHistoryFilter,
  totalCancelled,
} from '../utils/historyEvents';
import { StatsChart } from './StatsChart';
import { UserAvatar } from './UserAvatar';

interface HistoryViewProps {
  onClose: () => void;
  isPro: boolean;
}

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

function emptyStats() {
  return {
    totalUnfollowedByYou: 0,
    totalTraitorsDetected: 0,
    totalWhitelisted: 0,
    totalCancelled: 0,
    lastScanDate: null as number | null,
  };
}

export const HistoryView = ({ onClose, isPro }: HistoryViewProps) => {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [stats, setStats] = useState(emptyStats);

  useEffect(() => {
    let history = HistoryService.getHistory();

    if (!isPro) {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      history = history.filter(item => item.timestamp >= thirtyDaysAgo);
    }

    setEvents(history);
    setStats({
      totalTraitorsDetected: history.filter(item => item.type === 'DETECTED_UNFOLLOWER').length,
      totalUnfollowedByYou: history.filter(item => item.type === 'YOU_UNFOLLOWED').length,
      totalWhitelisted: history.filter(item => item.type === 'WHITELISTED').length,
      totalCancelled: totalCancelled(history),
      lastScanDate: history.find(item => item.type === 'DETECTED_UNFOLLOWER')?.timestamp || null,
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

  const visibleEvents = useMemo(
    () => events.filter(event => matchesHistoryFilter(event, filter)),
    [events, filter],
  );

  const handleClear = () => {
    if (confirm(t('confirmClearHistory'))) {
      HistoryService.clearHistory();
      setEvents([]);
      setStats(emptyStats());
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
      case 'SOFT_BLOCKED':
        return { icon: '🚫', color: '#eab308', label: t('removedFollower') };
      case 'REQUEST_CANCELLED':
        return { icon: '🚫', color: '#fb923c', label: t('pendingYouCancelled') };
      default:
        return { icon: '📝', color: '#ffffff', label: t('unknownEvent') };
    }
  };

  const filters: { id: HistoryFilter; label: string }[] = [
    { id: 'all', label: t('historyFilterAll') },
    { id: 'detected', label: t('historyFilterDetected') },
    { id: 'cleaned', label: t('historyFilterCleaned') },
    { id: 'cancelled', label: t('historyFilterCancelled') },
  ];

  return (
    <div className='backdrop' onClick={onClose} style={{ padding: '0' }}>
      <div
        className='setting-menu history-modal'
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '95%',
          maxWidth: '600px',
          height: '85vh',
          maxHeight: '850px',
          padding: '1.5rem',
          overflow: 'hidden',
        }}
      >
        <div className='history-modal__header'>
          <h3>{t('timeMachine')}</h3>
          <button
            type='button'
            className='close-btn'
            onClick={onClose}
            aria-label={t('cancel')}
          >
            ✕
          </button>
        </div>

        <div className='history-modal__body'>
          <div className='history-dashboard'>
            <StatsChart
              detected={stats.totalTraitorsDetected}
              cleaned={stats.totalUnfollowedByYou}
              whitelisted={stats.totalWhitelisted}
              cancelled={stats.totalCancelled}
            />

            <div className='history-legend'>
              <div className='history-legend__row'>
                <span>
                  <i style={{ background: '#f87171' }} />
                  {t('traitors')}
                </span>
                <strong style={{ color: '#f87171' }}>{stats.totalTraitorsDetected}</strong>
              </div>
              <div className='history-legend__row'>
                <span>
                  <i style={{ background: '#34d399' }} />
                  {t('cleaned')}
                </span>
                <strong style={{ color: '#34d399' }}>{stats.totalUnfollowedByYou}</strong>
              </div>
              <div className='history-legend__row'>
                <span>
                  <i style={{ background: '#fb923c' }} />
                  {t('historyCancelled')}
                </span>
                <strong style={{ color: '#fb923c' }}>{stats.totalCancelled}</strong>
              </div>
              <div className='history-legend__row'>
                <span>
                  <i style={{ background: '#60a5fa' }} />
                  {t('protected')}
                </span>
                <strong style={{ color: '#60a5fa' }}>{stats.totalWhitelisted}</strong>
              </div>
            </div>
          </div>

          <div className='history-filters' role='tablist' aria-label={t('timeMachine')}>
            {filters.map(item => (
              <button
                key={item.id}
                type='button'
                role='tab'
                aria-selected={filter === item.id}
                className={filter === item.id ? 'history-filter history-filter--active' : 'history-filter'}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className='unfollow-log-container history-timeline'>
            {visibleEvents.length === 0 ? (
              <div className='history-empty'>
                <p>{t('noHistoryYet')}</p>
              </div>
            ) : (
              visibleEvents.map(event => {
                const style = getEventStyle(event.type);
                const summary = isCancelledSummary(event);
                const count = event.count ?? 1;
                return (
                  <div key={event.id} className='history-row'>
                    <div className='history-row__icon' aria-hidden='true'>
                      {style.icon}
                    </div>
                    <div className='history-row__copy'>
                      <div className='history-row__title'>
                        <span className='history-username'>
                          {summary
                            ? t('historyCancelledBatch')(count)
                            : `@${event.user.username}`}
                        </span>
                        <span className='history-row__badge' style={{ background: style.color }}>
                          {style.label}
                        </span>
                      </div>
                      <div className='history-row__meta'>
                        {formatDate(event.timestamp)}
                        {summary ? ` · ${t('historyCancelledHint')}` : ''}
                      </div>
                    </div>
                    {summary ? (
                      <div className='avatar-container avatar-container--sm history-batch-avatar' aria-hidden='true'>
                        <div className='avatar avatar-letter'>#</div>
                      </div>
                    ) : (
                      <div className='avatar-container avatar-container--sm'>
                        <UserAvatar username={event.user.username} src={event.user.profile_pic_url} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className='history-modal__footer'>
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
