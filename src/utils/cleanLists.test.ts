import { describe, expect, it } from 'vitest';
import { defaultCleanTab } from '../model/clean-lists-state';
import { filterCleanUsers, usersForCleanTab } from './cleanLists';

describe('filterCleanUsers', () => {
  it('filters by username, name or date and sorts A-Z', () => {
    const users = [
      { username: 'zeta', fullName: 'Zeta', dateLabel: 'ago. 29, 2026' },
      { username: 'alpha', fullName: 'Ana', dateLabel: 'ene. 01, 2025' },
    ];
    expect(filterCleanUsers(users, 'ana').map(user => user.username)).toEqual(['alpha']);
    expect(filterCleanUsers(users, '2026').map(user => user.username)).toEqual(['zeta']);
    expect(filterCleanUsers(users, '').map(user => user.username)).toEqual(['alpha', 'zeta']);
  });
});

describe('usersForCleanTab', () => {
  it('returns the matching list', () => {
    const lists = {
      unfollowed: [{ username: 'a', fullName: 'A' }],
      blocked: [{ username: 'b', fullName: 'B' }],
      recentRequests: [{ username: 'c', fullName: 'C' }],
    };
    expect(usersForCleanTab(lists, 'blocked')[0]?.username).toBe('b');
  });
});

describe('defaultCleanTab', () => {
  it('prefers the first list that has people', () => {
    expect(
      defaultCleanTab({
        unfollowed: [],
        blocked: [{ username: 'b', fullName: 'B' }],
        recentRequests: [{ username: 'c', fullName: 'C' }],
      }),
    ).toBe('blocked');
  });
});
