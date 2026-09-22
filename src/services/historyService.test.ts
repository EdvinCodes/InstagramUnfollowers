import { beforeEach, describe, expect, it } from 'vitest';
import { Typename, UserNode } from '../model/user';
import { HistoryService } from './historyService';

const memory = new Map<string, string>();
let writes = 0;

function stubBrowser() {
  memory.clear();
  writes = 0;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        writes += 1;
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
    },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie: '' },
  });
}

function node(id: string): UserNode {
  return {
    id,
    username: id,
    full_name: id,
    profile_pic_url: '',
    is_private: false,
    is_verified: false,
    followed_by_viewer: true,
    follows_viewer: false,
    requested_by_viewer: false,
    reel: {
      id,
      expiring_at: 0,
      has_pride_media: false,
      latest_reel_media: 0,
      seen: null,
      owner: {
        __typename: Typename.GraphUser,
        id,
        profile_pic_url: '',
        username: id,
      },
    },
  };
}

describe('HistoryService.addEvents', () => {
  beforeEach(() => {
    stubBrowser();
  });

  it('writes the whole batch once, newest user first', () => {
    HistoryService.addEvents('WHITELISTED', [node('a'), node('b'), node('c')]);
    expect(writes).toBe(1);
    const history = HistoryService.getHistory();
    expect(history.map(event => event.user.username)).toEqual(['c', 'b', 'a']);
    expect(history.every(event => event.type === 'WHITELISTED')).toBe(true);
  });

  it('does not write when the batch is empty', () => {
    HistoryService.addEvents('WHITELISTED', []);
    expect(writes).toBe(0);
    expect(HistoryService.getHistory()).toEqual([]);
  });
});
