import { describe, expect, it } from 'vitest';
import { estimateCancelDurationMs, filterPendingUsers, paginatePendingUsers } from './pendingHelpers';

describe('estimateCancelDurationMs', () => {
  const timings = {
    timeBetweenSearchCycles: 1000,
    timeToWaitAfterFiveSearchCycles: 10000,
    timeBetweenUnfollows: 4000,
    timeToWaitAfterFiveUnfollows: 300000,
  };

  it('returns 0 for a single action', () => {
    expect(estimateCancelDurationMs(1, timings)).toBe(0);
  });

  it('uses cooldown after every fifth cancel', () => {
    // waits: 4s, 4s, 4s, 4s, 300s
    expect(estimateCancelDurationMs(6, timings)).toBe(4000 * 4 + 300000);
  });
});

describe('filterPendingUsers', () => {
  const users = [
    { username: 'alpha', fullName: 'Alpha One' },
    { username: 'beta', fullName: 'Beta' },
  ];

  it('hides cancelled usernames from the open tab and sorts A-Z', () => {
    expect(filterPendingUsers(users, new Set(['alpha']), 'open', '')).toEqual([
      { username: 'beta', fullName: 'Beta' },
    ]);
    expect(filterPendingUsers(users, new Set(), 'open', '').map(user => user.username)).toEqual([
      'alpha',
      'beta',
    ]);
  });

  it('filters by search on username or name', () => {
    expect(filterPendingUsers(users, new Set(), 'open', 'ONE')).toEqual([
      { username: 'alpha', fullName: 'Alpha One' },
    ]);
  });
});

describe('paginatePendingUsers', () => {
  it('clamps the page to the last available page', () => {
    const users = Array.from({ length: 51 }, (_, i) => ({
      username: `user${i}`,
      fullName: `User ${i}`,
    }));
    const result = paginatePendingUsers(users, 99);
    expect(result.safePage).toBe(2);
    expect(result.maxPage).toBe(2);
    expect(result.pageUsers).toHaveLength(1);
  });
});
