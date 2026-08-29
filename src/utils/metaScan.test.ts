import { describe, expect, it } from 'vitest';
import { calculateGhostScore } from './ghostScore';
import { buildMetaScanResults, metaUserToNode } from './metaScan';

describe('buildMetaScanResults', () => {
  it('marks people you follow who are not in followers as non-followers', () => {
    const results = buildMetaScanResults(
      [
        { username: 'alpha', fullName: 'Alpha' },
        { username: 'beta', fullName: 'Beta' },
      ],
      [{ username: 'beta', fullName: 'Beta' }],
    );
    expect(results.find(user => user.username === 'alpha')?.follows_viewer).toBe(false);
    expect(results.find(user => user.username === 'beta')?.follows_viewer).toBe(true);
  });

  it('does not treat Meta users without photos as anonymous ghosts', () => {
    const node = metaUserToNode({ username: 'normal.user', fullName: 'normal.user' }, false);
    const ghost = calculateGhostScore(node, {
      reasonNoPic: 'pic',
      reasonLongNums: 'nums',
      reasonBotPattern: 'bot',
      reasonKeyboard: 'keys',
      reasonNoName: 'name',
      reasonSameName: 'same',
    });
    expect(ghost.reasons).not.toContain('pic');
    expect(ghost.reasons).not.toContain('same');
    expect(ghost.level).toBe('safe');
  });
});
