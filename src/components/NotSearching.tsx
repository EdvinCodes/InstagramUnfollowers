import React, { useMemo } from 'react';
import { t } from '../i18n/i18n';
import { HistoryService } from '../services/historyService';
import { loadCleanLists } from '../utils/cleanLists';
import { loadMetaScanSnapshot } from '../utils/metaScan';
import { readCancelledUsernames, readImportedPendingList } from '../utils/pendingStorage';

interface NotSearchingProps {
  onScan?: () => void;
  onGrowth: () => void;
  onPendingRequests: () => void;
  onMetaImport: () => void;
  onCleanLists: () => void;
  onHistory: () => void;
  isPro: boolean;
}

const IconAnalyze = () => (
  <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8'>
    <circle cx='11' cy='11' r='7' />
    <path d='M21 21l-4.3-4.3' />
  </svg>
);

const IconClean = () => (
  <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8'>
    <path d='M3 6h18' />
    <path d='M8 6V4h8v2' />
    <path d='M19 6l-1 14H6L5 6' />
  </svg>
);

const IconGrow = () => (
  <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8'>
    <polyline points='22 7 13.5 15.5 8.5 10.5 2 17' />
    <polyline points='16 7 22 7 22 13' />
  </svg>
);

const IconHistory = () => (
  <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8'>
    <circle cx='12' cy='12' r='9' />
    <polyline points='12 7 12 12 16 14' />
  </svg>
);

export const NotSearching = ({
  onScan,
  onGrowth,
  onPendingRequests,
  onMetaImport,
  onCleanLists,
  onHistory,
  isPro,
}: NotSearchingProps) => {
  const stats = useMemo(() => {
    try {
      const snapshot = loadMetaScanSnapshot();
      const pending = readImportedPendingList();
      const cancelled = readCancelledUsernames();
      const lists = loadCleanLists();
      const pendingOpen = pending
        ? pending.users.filter(user => !cancelled.has(user.username)).length
        : 0;
      return {
        following: snapshot?.following.length ?? 0,
        followers: snapshot?.followers.length ?? 0,
        hasMeta: !!snapshot && (snapshot.following.length > 0 || snapshot.followers.length > 0),
        pendingOpen,
        listCount: lists
          ? lists.unfollowed.length + lists.blocked.length + lists.recentRequests.length
          : 0,
        historyCount: HistoryService.getHistory().length,
      };
    } catch {
      return {
        following: 0,
        followers: 0,
        hasMeta: false,
        pendingOpen: 0,
        listCount: 0,
        historyCount: 0,
      };
    }
  }, []);

  return (
    <section className='home-hub' aria-label={t('hubTitle')}>
      <header className='home-hub__intro'>
        <p className='home-hub__eyebrow'>{t('hubEyebrow')}</p>
        <h2 className='home-hub__title'>{t('hubTitle')}</h2>
        <p className='home-hub__subtitle'>{t('hubSubtitle')}</p>
      </header>

      <div className='home-hub__grid'>
        <article className='hub-card hub-card--analyze'>
          <div className='hub-card__top'>
            <span className='hub-card__icon' aria-hidden='true'>
              <IconAnalyze />
            </span>
            <div>
              <h3>{t('hubAnalyze')}</h3>
              <p>{t('hubAnalyzeDesc')}</p>
            </div>
          </div>
          <button type='button' className='hub-card__primary' onClick={onScan}>
            {t('hubScanLive')}
          </button>
          <button type='button' className='hub-card__row' onClick={onMetaImport}>
            <span>{t('metaEntry')}</span>
            {stats.hasMeta && (
              <small>{t('hubMetaSaved')(stats.following, stats.followers)}</small>
            )}
          </button>
        </article>

        <article className='hub-card hub-card--clean'>
          <div className='hub-card__top'>
            <span className='hub-card__icon' aria-hidden='true'>
              <IconClean />
            </span>
            <div>
              <h3>{t('hubClean')}</h3>
              <p>{t('hubCleanDesc')}</p>
            </div>
          </div>
          <button type='button' className='hub-card__row' onClick={onPendingRequests}>
            <span>{t('pendingEntry')}</span>
            {stats.pendingOpen > 0 && <small>{t('hubPendingSaved')(stats.pendingOpen)}</small>}
          </button>
          <button type='button' className='hub-card__row' onClick={onCleanLists}>
            <span>{t('cleanEntry')}</span>
            {stats.listCount > 0 && <small>{t('hubListsSaved')(stats.listCount)}</small>}
          </button>
        </article>

        <article className='hub-card hub-card--grow'>
          <div className='hub-card__top'>
            <span className='hub-card__icon' aria-hidden='true'>
              <IconGrow />
            </span>
            <div>
              <h3>
                {t('hubGrow')} <span className='growth-beta-tag'>{t('growthBeta')}</span>
              </h3>
              <p>{t('hubGrowDesc')}</p>
            </div>
          </div>
          <button
            type='button'
            className='hub-card__primary hub-card__primary--grow'
            onClick={onGrowth}
            title={!isPro ? t('growthProRequired') : undefined}
          >
            {t('hubGrowCta')}
          </button>
        </article>

        <article className='hub-card hub-card--history'>
          <div className='hub-card__top'>
            <span className='hub-card__icon' aria-hidden='true'>
              <IconHistory />
            </span>
            <div>
              <h3>{t('hubHistory')}</h3>
              <p>{t('hubHistoryDesc')}</p>
            </div>
          </div>
          <button type='button' className='hub-card__primary hub-card__primary--history' onClick={onHistory}>
            {t('hubOpenHistory')}
          </button>
          {stats.historyCount > 0 && (
            <p className='hub-card__footnote'>{t('hubHistorySaved')(stats.historyCount)}</p>
          )}
        </article>
      </div>
    </section>
  );
};
