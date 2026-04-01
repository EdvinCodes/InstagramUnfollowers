import React from 'react';
import { getUnfollowLogForDisplay } from '../utils/utils';
import { State } from '../model/state';
import { UnfollowLogEntry } from '../model/unfollow-log-entry';
import { t } from '../i18n/i18n';

interface UnfollowingProps {
  state: State;
  handleUnfollowFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isPaused: boolean;
  togglePause: () => void;
}

// --- Sub-componente para limpiar la lógica de renderizado ---
interface LogEntryProps {
  entry: UnfollowLogEntry;
  index: number;
  total: number;
}

const LogEntryItem = ({ entry, index, total }: LogEntryProps) => {
  const countLabel = `[${index + 1}/${total}]`;

  if (entry.unfollowedSuccessfully) {
    return (
      <div className='p-medium'>
        {t('succeeded')}
        <a
          className='clr-inherit'
          target='_blank'
          href={`https://www.instagram.com/${entry.user.username}`}
          rel='noreferrer'
          style={{ fontWeight: 'bold', textDecoration: 'none' }}
        >
          &nbsp;{entry.user.username}
        </a>
        <span className='clr-cyan'>&nbsp; {countLabel}</span>
      </div>
    );
  }

  return (
    <div className='p-medium clr-red'>
      {t('failedToUnfollow')} {entry.user.username} {countLabel}
    </div>
  );
};

// --- Componente Principal ---
export const Unfollowing = ({
  state,
  handleUnfollowFilter,
  isPaused,
  togglePause,
}: UnfollowingProps) => {
  if (state.status !== 'unfollowing') {
    return null;
  }

  const logsToDisplay = getUnfollowLogForDisplay(state.unfollowLog, state.searchTerm, state.filter);
  const isFinished =
    state.unfollowLog.length === state.selectedResults.length && state.selectedResults.length > 0;

  return (
    <section className='flex' style={{ height: '100%', overflow: 'hidden' }}>
      <aside className='app-sidebar'>
        <menu className='flex column grow m-clear p-clear'>
          <p className='p-small' style={{ fontWeight: 'bold' }}>
            {t('filterResults2')}
          </p>

          <label className='badge m-small' style={{ cursor: 'pointer' }}>
            <input
              type='checkbox'
              name='showSucceeded'
              checked={state.filter.showSucceeded}
              onChange={handleUnfollowFilter}
            />
            &nbsp;{t('succeeded')}
          </label>

          <label className='badge m-small' style={{ cursor: 'pointer' }}>
            <input
              type='checkbox'
              name='showFailed'
              checked={state.filter.showFailed}
              onChange={handleUnfollowFilter}
            />
            &nbsp;{t('failed')}
          </label>

          {/* --- AÑADIDO: Controles de Pausa para el Unfollow --- */}
          {!isFinished && (
            <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '10px' }}>
              <p className='p-small' style={{ fontWeight: 'bold' }}>
                {t('actions')}
              </p>
              <button
                className={`button-control ${isPaused ? 'btn-resume' : 'btn-pause'}`}
                style={{ width: '100%', padding: '8px' }}
                onClick={togglePause}
              >
                {isPaused ? t('resume') : t('pause')}
              </button>
            </div>
          )}
        </menu>
      </aside>

      {/* ARREGLO AQUÍ: Altura máxima y scroll automático */}
      <article
        className='unfollow-log-container'
        style={{
          flex: 1,
          overflowY: 'auto',
          height: '100%',
          paddingBottom: '20px', // Espacio extra al final
        }}
      >
        {isFinished && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <hr />
            <div className='fs-large p-medium clr-green'>{t('allDone')}</div>
            <hr />
          </div>
        )}

        {logsToDisplay.map((entry, index) => (
          <LogEntryItem
            key={entry.user.id}
            entry={entry}
            index={index}
            total={state.selectedResults.length}
          />
        ))}
      </article>
    </section>
  );
};
