import { describe, expect, it } from 'vitest';
import { UserNode } from '../model/user';
import { dropAccountsFromSelection, isExactDisplayedSelection } from './utils';

function account(id: string, username = id): UserNode {
  return { id, username } as UserNode;
}

describe('dropAccountsFromSelection', () => {
  it('removes the protected account and leaves the rest selected', () => {
    const selected = [account('1', 'alpha'), account('2', 'beta'), account('3', 'gamma')];
    expect(dropAccountsFromSelection(selected, [account('2', 'beta')]).map(user => user.id)).toEqual(['1', '3']);
  });

  it('matches a renamed id by username', () => {
    const selected = [account('old', 'beta')];
    expect(dropAccountsFromSelection(selected, [{ username: 'beta' }])).toEqual([]);
  });
});

describe('isExactDisplayedSelection', () => {
  it('is on only when the selection is exactly the rows on screen', () => {
    const displayed = [account('1'), account('2')];
    expect(isExactDisplayedSelection(displayed, [account('2'), account('1')])).toBe(true);
    expect(isExactDisplayedSelection(displayed, [account('9'), account('8')])).toBe(false);
    expect(isExactDisplayedSelection(displayed, [account('1')])).toBe(false);
    expect(isExactDisplayedSelection([], [])).toBe(false);
  });
});
