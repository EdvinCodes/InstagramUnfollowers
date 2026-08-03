import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { GrowthSpeed, GrowthState } from '../model/growth-state';
import { createInitialGrowthState } from '../model/growth-state';
import type { State } from '../model/state';
import { useGrowth } from '../hooks/useGrowth';
import { parseTargetUsernames } from '../utils/growthHelpers';
import { GROWTH_DISCLAIMER_KEY } from '../constants/growth';
import { t } from '../i18n/i18n';

interface GrowthViewProps {
  state: State;
  setState: (state: State | ((prev: State) => State)) => void;
  onBack: () => void;
  isPro: boolean;
  onShowToast: (message: string) => void;
}

const SPEED_COLORS: Record<GrowthSpeed, string> = {
  tortoise: '#22c55e',
  human: '#eab308',
  kamikaze: '#ef4444',
};

const getSpeedLabel = (s: GrowthSpeed): string => {
  switch (s) {
    case 'tortoise':
      return t('growthSpeedTortoise');
    case 'human':
      return t('growthSpeedHuman');
    case 'kamikaze':
      return t('growthSpeedKamikaze');
    default:
      return t('growthSpeedTortoise');
  }
};

export const GrowthView = ({ state, setState, onBack, isPro, onShowToast }: GrowthViewProps) => {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => {
    try {
      return localStorage.getItem(GROWTH_DISCLAIMER_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [targetsInput, setTargetsInput] = useState('');
  const [speed, setSpeed] = useState<GrowthSpeed>('tortoise');
  const [expertMode, setExpertMode] = useState(false);

  const stateRef = useRef(state);
  const logEndRef = useRef<HTMLDivElement>(null);
  stateRef.current = state;
  const getState = useCallback(() => stateRef.current, []);

  const { startGrowth, stopGrowth, remainingDailyFollows } = useGrowth(setState, getState);

  const growthState = state.status === 'growth' ? state : null;
  const phase = growthState?.phase ?? 'setup';
  const isRunning = Boolean(growthState?.isRunning);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [growthState?.logs.length]);

  const progressPercent =
    growthState && growthState.totalToFollow > 0
      ? Math.round(
          ((growthState.followedCount + growthState.skippedCount) / growthState.totalToFollow) *
            100,
        )
      : 0;

  const acceptDisclaimer = () => {
    setDisclaimerAccepted(true);
    try {
      localStorage.setItem(GROWTH_DISCLAIMER_KEY, '1');
    } catch {
      // ignore
    }
  };

  const canFollowTodayCheck = () => remainingDailyFollows() > 0;

  const handleStart = () => {
    if (!isPro) {
      onShowToast(t('growthProRequired'));
      return;
    }

    if (!canFollowTodayCheck()) {
      onShowToast(t('growthDailyLimitReached'));
      return;
    }

    const targets = parseTargetUsernames(targetsInput);
    if (targets.length === 0) {
      return;
    }

    const initial: GrowthState = {
      ...createInitialGrowthState(),
      phase: 'scraping',
      speed,
      disclaimerAccepted: true,
      isRunning: true,
      logs: [],
    };
    setState(initial);

    setTimeout(() => {
      void startGrowth(targets, speed);
    }, 50);
  };

  const handleStop = () => {
    stopGrowth();
    setState(prev =>
      prev.status === 'growth'
        ? { ...prev, phase: 'done', isPaused: false, isRunning: false }
        : prev,
    );
  };

  const handleTogglePause = () => {
    setState(prev =>
      prev.status === 'growth' ? { ...prev, isPaused: !prev.isPaused } : prev,
    );
  };

  const handleReset = () => {
    setTargetsInput('');
    setSpeed('tortoise');
    setExpertMode(false);
    onBack();
  };

  if (!disclaimerAccepted && !isRunning && phase !== 'done') {
    return (
      <div className='empty-state-container' style={{ padding: '2rem', maxWidth: '540px', margin: '0 auto' }}>
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ color: '#ef4444', margin: '0 0 1rem 0', fontSize: '1rem' }}>
            {t('growthDisclaimerTitle')}
          </h2>
          <ul style={{ color: '#f87171', fontSize: '0.85rem', lineHeight: 1.8, paddingLeft: '1.2rem', margin: 0 }}>
            <li>{t('growthDisclaimer1')}</li>
            <li>{t('growthDisclaimer2')}</li>
            <li>{t('growthDisclaimer3')}</li>
            <li>{t('growthDisclaimer4')}</li>
            <li>{t('growthDisclaimer5')}</li>
          </ul>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          {t('growthDisclaimerFooter')}
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type='button' className='btn' onClick={onBack} style={{ flex: 1 }}>
            {t('growthBack')}
          </button>
          <button
            type='button'
            className='btn btn-primary'
            onClick={acceptDisclaimer}
            style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}
          >
            {t('growthAcceptRisk')}
          </button>
        </div>
      </div>
    );
  }

  if (!isRunning && phase !== 'done' && phase !== 'following') {
    return (
      <div className='empty-state-container' style={{ padding: '2rem', maxWidth: '540px', margin: '0 auto' }}>
        <h2 style={{ color: '#06b6d4', margin: '0 0 0.25rem 0', fontSize: '1.2rem' }}>
          {t('growthTitle')}{' '}
          <span style={{ fontSize: '0.65rem', verticalAlign: 'middle' }}>{t('growthBeta')}</span>
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{t('growthDescription')}</p>
        <p style={{ color: '#a78bfa', fontSize: '0.78rem', marginBottom: '0.5rem' }}>{t('growthBetaFreeNotice')}</p>
        {isPro && (
          <p style={{ color: '#22c55e', fontSize: '0.78rem', marginBottom: '1rem' }}>
            {t('growthRemainingToday')(remainingDailyFollows())}
          </p>
        )}

        <label style={{ display: 'block', color: '#f8fafc', fontSize: '0.82rem', marginBottom: '0.4rem', fontWeight: 600 }}>
          {t('growthTargetsLabel')}
        </label>
        <textarea
          value={targetsInput}
          onChange={e => setTargetsInput((e.target as HTMLTextAreaElement).value)}
          placeholder={t('growthTargetsPlaceholder')}
          rows={3}
          style={{
            width: '100%',
            background: 'rgba(30,41,59,0.8)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '0.9rem',
            padding: '0.75rem',
            resize: 'vertical',
            fontFamily: 'inherit',
            marginBottom: '1rem',
            boxSizing: 'border-box',
          }}
          onKeyDown={e => e.stopPropagation()}
        />

        <label style={{ display: 'block', color: '#f8fafc', fontSize: '0.82rem', marginBottom: '0.5rem', fontWeight: 600 }}>
          {t('growthSpeedLabel')}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['tortoise', 'human', ...(expertMode ? (['kamikaze'] as GrowthSpeed[]) : [])] as GrowthSpeed[]).map(
            s => (
              <label
                key={s}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: `1px solid ${speed === s ? SPEED_COLORS[s] : 'rgba(255,255,255,0.1)'}`,
                  background: speed === s ? `${SPEED_COLORS[s]}18` : 'transparent',
                }}
              >
                <input
                  type='radio'
                  name='growth-speed'
                  value={s}
                  checked={speed === s}
                  onChange={() => setSpeed(s)}
                  style={{ accentColor: SPEED_COLORS[s] }}
                />
                <span style={{ color: speed === s ? SPEED_COLORS[s] : '#94a3b8', fontSize: '0.88rem' }}>
                  {getSpeedLabel(s)}
                </span>
              </label>
            ),
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          <input type='checkbox' checked={expertMode} onChange={e => setExpertMode((e.target as HTMLInputElement).checked)} />
          {t('growthExpertMode')}
        </label>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type='button' className='btn' onClick={onBack} style={{ flex: 1 }}>
            {t('growthBack')}
          </button>
          <button
            type='button'
            className='btn btn-primary'
            onClick={handleStart}
            disabled={!targetsInput.trim() || !isPro}
            style={{ flex: 2, opacity: isPro ? 1 : 0.6 }}
            title={!isPro ? t('growthProRequired') : undefined}
          >
            {t('growthStart')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 70px)',
        marginTop: '70px',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexShrink: 0 }}>
        <h2 style={{ margin: 0, color: '#06b6d4', fontSize: '1rem' }}>
          {t('growthTitle')}
          {phase === 'scraping' && (
            <span style={{ color: '#eab308', fontSize: '0.75rem', marginLeft: '8px' }}>● {t('growthPhaseScraping')}</span>
          )}
          {phase === 'following' && !growthState?.isPaused && (
            <span style={{ color: '#22c55e', fontSize: '0.75rem', marginLeft: '8px' }}>● {t('growthPhaseFollowing')}</span>
          )}
          {phase === 'following' && growthState?.isPaused && (
            <span style={{ color: '#f59e0b', fontSize: '0.75rem', marginLeft: '8px' }}>⏸ {t('growthPhasePaused')}</span>
          )}
          {phase === 'done' && (
            <span style={{ color: '#22c55e', fontSize: '0.75rem', marginLeft: '8px' }}>✅ {t('growthPhaseDone')}</span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {isRunning && phase === 'following' && (
            <button type='button' className='btn' onClick={handleTogglePause} style={{ fontSize: '0.78rem', padding: '0.25rem 0.7rem' }}>
              {growthState?.isPaused ? t('growthResume') : t('growthPause')}
            </button>
          )}
          {isRunning && (
            <button type='button' className='btn' onClick={handleStop} style={{ fontSize: '0.78rem', padding: '0.25rem 0.7rem', color: '#ef4444', borderColor: '#ef4444' }}>
              {t('growthStop')}
            </button>
          )}
          {phase === 'done' && (
            <button type='button' className='btn btn-primary' onClick={handleReset} style={{ fontSize: '0.78rem', padding: '0.25rem 0.7rem' }}>
              {t('growthReset')}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.85rem', flexShrink: 0 }}>
        {[
          { label: t('growthStatFollowed'), value: growthState?.followedCount ?? 0, color: '#22c55e' },
          { label: t('growthStatSkipped'), value: growthState?.skippedCount ?? 0, color: '#94a3b8' },
          { label: t('growthStatQueued'), value: growthState?.totalToFollow ?? 0, color: '#06b6d4' },
          { label: t('growthStatTargets'), value: growthState?.targetAccounts.length ?? 0, color: '#a78bfa' },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              background: 'rgba(30,41,59,0.6)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '8px',
              padding: '0.5rem 0.4rem',
              textAlign: 'center',
            }}
          >
            <div style={{ color: stat.color, fontSize: '1.3rem', fontWeight: 700, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.65rem', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {phase === 'following' && growthState && growthState.totalToFollow > 0 && (
        <div style={{ marginBottom: '0.85rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{t('growthProgress')}</span>
            <span style={{ color: '#06b6d4', fontSize: '0.72rem', fontWeight: 600 }}>{progressPercent}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                borderRadius: '4px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '8px',
          padding: '0.75rem',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          lineHeight: 1.7,
          color: '#94a3b8',
          minHeight: '120px',
        }}
      >
        {(!growthState || growthState.logs.length === 0) && (
          <span style={{ color: '#334155' }}>{t('growthWaitingStart')}</span>
        )}
        {growthState?.logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
