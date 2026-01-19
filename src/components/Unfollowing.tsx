import React from 'react';
import { getUnfollowLogForDisplay } from '../utils/utils';
import { State } from '../model/state';
import { UnfollowLogEntry } from '../model/unfollow-log-entry';

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
        Unfollowed
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
      Failed to unfollow {entry.user.username} {countLabel}
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
    <section className='flex'>
      <aside className='app-sidebar'>
        <menu className='flex column grow m-clear p-clear'>
          <p className='p-small' style={{ fontWeight: 'bold' }}>
            Filter Results
          </p>

          <label className='badge m-small' style={{ cursor: 'pointer' }}>
            <input
              type='checkbox'
              name='showSucceeded'
              checked={state.filter.showSucceeded}
              onChange={handleUnfollowFilter}
            />
            &nbsp;Succeeded
          </label>

          <label className='badge m-small' style={{ cursor: 'pointer' }}>
            <input
              type='checkbox'
              name='showFailed'
              checked={state.filter.showFailed}
              onChange={handleUnfollowFilter}
            />
            &nbsp;Failed
          </label>

          {/* --- AÑADIDO: Controles de Pausa para el Unfollow --- */}
          {!isFinished && (
            <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '10px' }}>
              <p className='p-small' style={{ fontWeight: 'bold' }}>
                Actions
              </p>
              <button
                className={`button-control ${isPaused ? 'btn-resume' : 'btn-pause'}`}
                style={{ width: '100%', padding: '8px' }}
                onClick={togglePause}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          )}
        </menu>
      </aside>

      <article className='unfollow-log-container'>
        {isFinished && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <hr />
            <div className='fs-large p-medium clr-green'>All DONE!</div>
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
