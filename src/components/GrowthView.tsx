import React, { useState, useRef, useCallback } from 'react';
import type { GrowthSpeed, GrowthState } from '../model/growth-state';
import type { State } from '../model/state';
import { useGrowth } from '../hooks/useGrowth';

interface GrowthViewProps {
  state: State;
  setState: (state: State | ((prev: State) => State)) => void;
  onBack: () => void;
}

const SPEED_LABELS: Record<GrowthSpeed, string> = {
  tortoise: '🐢 Tortuga — 1 follow / 3 min (recomendado)',
  human: '🚶 Humano — 1 follow / 1 min',
  kamikaze: '💀 Kamikaze — 1 follow / 15 s (alto riesgo)',
};

const SPEED_COLORS: Record<GrowthSpeed, string> = {
  tortoise: '#22c55e',
  human: '#eab308',
  kamikaze: '#ef4444',
};

export const GrowthView = ({ state, setState, onBack }: GrowthViewProps) => {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [targetsInput, setTargetsInput] = useState('');
  const [speed, setSpeed] = useState<GrowthSpeed>('tortoise');

  const stateRef = useRef<State>(state);
  const logEndRef = useRef<HTMLDivElement>(null);
  stateRef.current = state;
  const getState = useCallback(() => stateRef.current, []);

  const { startGrowth, stopGrowth } = useGrowth(setState, getState);

  const growthState = state.status === 'growth' ? (state as GrowthState) : null;
  const phase = growthState?.phase;
  const isRunning = phase === 'scraping' || phase === 'following';

  const progressPercent =
    growthState && growthState.totalToFollow > 0
      ? Math.round(
          ((growthState.followedCount + growthState.skippedCount) / growthState.totalToFollow) *
            100,
        )
      : 0;

  const handleStart = () => {
    const targets = targetsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (targets.length === 0) return;

    const initial: GrowthState = {
      status: 'growth',
      phase: 'scraping', // ya en scraping desde el inicio
      targetAccounts: [],
      commenterQueue: [],
      followedCount: 0,
      skippedCount: 0,
      totalToFollow: 0,
      logs: [`[${new Date().toLocaleTimeString()}] 🚀 Iniciando Growth...`],
      speed,
      isPaused: false,
      disclaimerAccepted: true,
    };
    setState(initial);

    setTimeout(() => {
      void startGrowth(targets, speed);
    }, 50);
  };

  const handleStop = () => {
    stopGrowth();
    if (state.status === 'growth') {
      setState({ ...(state as GrowthState), phase: 'done', isPaused: false });
    }
  };

  const handleTogglePause = () => {
    if (state.status === 'growth') {
      setState({ ...(state as GrowthState), isPaused: !(state as GrowthState).isPaused });
    }
  };

  const handleReset = () => {
    setDisclaimerAccepted(false);
    setTargetsInput('');
    setSpeed('tortoise');
    onBack();
  };

  // ── PANTALLA 1: DISCLAIMER ────────────────────────────────────────
  if (!disclaimerAccepted && phase !== 'scraping' && phase !== 'following' && phase !== 'done') {
    return (
      <div
        className='empty-state-container'
        style={{ padding: '2rem', maxWidth: '540px', margin: '0 auto' }}
      >
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2
            style={{
              color: '#ef4444',
              margin: '0 0 1rem 0',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            ⚠️ DISCLAIMER — LEE ANTES DE CONTINUAR
          </h2>
          <ul
            style={{
              color: '#f87171',
              fontSize: '0.85rem',
              lineHeight: '1.8',
              paddingLeft: '1.2rem',
              margin: 0,
            }}
          >
            <li>
              Esta herramienta <strong>automatiza acciones</strong> en Instagram, lo cual puede
              violar sus Términos de Servicio.
            </li>
            <li>
              Instagram puede aplicar un <strong>Action Block temporal o permanente</strong> a tu
              cuenta.
            </li>
            <li>
              El modo Kamikaze tiene <strong>alto riesgo de ban</strong>. Se recomienda Tortuga.
            </li>
            <li>
              El autor <strong>no se hace responsable</strong> de ninguna sanción sobre tu cuenta.
            </li>
            <li>
              Úsalo a tu propia <strong>responsabilidad y riesgo</strong>.
            </li>
          </ul>
        </div>
        <p
          style={{
            color: '#94a3b8',
            fontSize: '0.8rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          Al continuar confirmas que has leído y aceptas los riesgos.
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className='btn' onClick={onBack} style={{ flex: 1 }}>
            ← Volver
          </button>
          <button
            className='btn btn-primary'
            onClick={() => setDisclaimerAccepted(true)}
            style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}
          >
            Acepto el riesgo — Continuar
          </button>
        </div>
      </div>
    );
  }

  // ── PANTALLA 2: SETUP ─────────────────────────────────────────────
  if (!isRunning && phase !== 'done') {
    return (
      <div
        className='empty-state-container'
        style={{ padding: '2rem', maxWidth: '540px', margin: '0 auto' }}
      >
        <h2 style={{ color: '#06b6d4', margin: '0 0 0.25rem 0', fontSize: '1.2rem' }}>
          🚀 Growth (Beta Experimental)
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
          Extrae comentaristas de cuentas objetivo y síguelos automáticamente.
        </p>

        <label
          style={{
            display: 'block',
            color: '#f8fafc',
            fontSize: '0.82rem',
            marginBottom: '0.4rem',
            fontWeight: 600,
          }}
        >
          Cuentas objetivo (separadas por comas)
        </label>
        <textarea
          value={targetsInput}
          onChange={e => setTargetsInput((e.target as HTMLTextAreaElement).value)}
          placeholder='@artista1, @competencia2, @nicho3'
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
            marginBottom: '1.25rem',
            boxSizing: 'border-box',
          }}
          onKeyDown={e => e.stopPropagation()}
        />

        <label
          style={{
            display: 'block',
            color: '#f8fafc',
            fontSize: '0.82rem',
            marginBottom: '0.5rem',
            fontWeight: 600,
          }}
        >
          Velocidad de seguimiento
        </label>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {(Object.keys(SPEED_LABELS) as GrowthSpeed[]).map(s => (
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
                transition: 'all 0.2s',
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
              <span
                style={{ color: speed === s ? SPEED_COLORS[s] : '#94a3b8', fontSize: '0.88rem' }}
              >
                {SPEED_LABELS[s]}
              </span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className='btn' onClick={onBack} style={{ flex: 1 }}>
            ← Volver
          </button>
          <button
            className='btn btn-primary'
            onClick={handleStart}
            disabled={!targetsInput.trim()}
            style={{ flex: 2 }}
          >
            🚀 Iniciar Growth
          </button>
        </div>
      </div>
    );
  }

  // ── PANTALLA 3: RUNNING / DONE ────────────────────────────────────
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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: 0, color: '#06b6d4', fontSize: '1rem' }}>
          🚀 Growth
          {phase === 'scraping' && (
            <span style={{ color: '#eab308', fontSize: '0.75rem', marginLeft: '8px' }}>
              ● Extrayendo...
            </span>
          )}
          {phase === 'following' && !growthState?.isPaused && (
            <span style={{ color: '#22c55e', fontSize: '0.75rem', marginLeft: '8px' }}>
              ● Siguiendo...
            </span>
          )}
          {phase === 'following' && growthState?.isPaused && (
            <span style={{ color: '#f59e0b', fontSize: '0.75rem', marginLeft: '8px' }}>
              ⏸ En pausa
            </span>
          )}
          {phase === 'done' && (
            <span style={{ color: '#22c55e', fontSize: '0.75rem', marginLeft: '8px' }}>
              ✅ Completado
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {isRunning && phase === 'following' && (
            <button
              className='btn'
              onClick={handleTogglePause}
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.7rem' }}
            >
              {growthState?.isPaused ? '▶ Reanudar' : '⏸ Pausar'}
            </button>
          )}
          {isRunning && (
            <button
              className='btn'
              onClick={handleStop}
              style={{
                fontSize: '0.78rem',
                padding: '0.25rem 0.7rem',
                color: '#ef4444',
                borderColor: '#ef4444',
              }}
            >
              ■ Detener
            </button>
          )}
          {phase === 'done' && (
            <button
              className='btn btn-primary'
              onClick={handleReset}
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.7rem' }}
            >
              ← Reiniciar
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.85rem', flexShrink: 0 }}>
        {[
          { label: 'Seguidos', value: growthState?.followedCount ?? 0, color: '#22c55e' },
          { label: 'Saltados', value: growthState?.skippedCount ?? 0, color: '#94a3b8' },
          { label: 'En cola', value: growthState?.totalToFollow ?? 0, color: '#06b6d4' },
          {
            label: 'Cuentas obj.',
            value: growthState?.targetAccounts.length ?? 0,
            color: '#a78bfa',
          },
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
            <div style={{ color: stat.color, fontSize: '1.3rem', fontWeight: 700, lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.65rem', marginTop: '2px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {phase === 'following' && growthState && growthState.totalToFollow > 0 && (
        <div style={{ marginBottom: '0.85rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Progreso</span>
            <span style={{ color: '#06b6d4', fontSize: '0.72rem', fontWeight: 600 }}>
              {progressPercent}%
            </span>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.09)',
              borderRadius: '4px',
              height: '5px',
              overflow: 'hidden',
            }}
          >
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

      {/* Log console */}
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
          lineHeight: '1.7',
          color: '#94a3b8',
          minHeight: '120px',
        }}
      >
        {(!growthState || growthState.logs.length === 0) && (
          <span style={{ color: '#334155' }}>Esperando inicio...</span>
        )}
        {growthState?.logs.map((log, i) => {
          let color = '#94a3b8';
          if (log.includes('✅') || log.includes('🎉')) color = '#22c55e';
          if (log.includes('❌') || log.includes('⚠️')) color = '#f87171';
          if (log.includes('👻')) color = '#a78bfa';
          if (log.includes('➕')) color = '#06b6d4';
          if (log.includes('⏳')) color = '#eab308';
          if (log.includes('🚀') || log.includes('🎯')) color = '#f8fafc';
          if (log.includes('🛑')) color = '#f87171';
          return (
            <div key={i} style={{ color }}>
              {log}
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
