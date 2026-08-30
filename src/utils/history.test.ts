import { describe, expect, it, beforeEach } from 'vitest';
import { HISTORY_RESULTS_STORAGE_KEY } from '../constants/constants';
import { Typename, UserNode } from '../model/user';
import { identifyNewUnfollowers, loadPreviousSnapshotIds, saveScanSnapshot } from './history';

const memory = new Map<string, string>();

function stubBrowser() {
  memory.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
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

function node(id: string, followsViewer: boolean): UserNode {
  return {
    id,
    username: id,
    full_name: id,
    profile_pic_url: 'https://example.com/pic.jpg',
    is_private: false,
    is_verified: false,
    followed_by_viewer: true,
    follows_viewer: followsViewer,
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

describe('identifyNewUnfollowers', () => {
  beforeEach(() => {
    stubBrowser();
  });

  it('does not mark anyone on the first scan', () => {
    const marked = identifyNewUnfollowers([node('1', false), node('2', true)]);
    expect(marked.every(user => !user.is_new_unfollower)).toBe(true);
  });

  it('marks only new non-followers after a v2 snapshot', () => {
    saveScanSnapshot([node('old-nf', false), node('mutual', true)]);
    expect(loadPreviousSnapshotIds()?.has('old-nf')).toBe(true);
    expect(loadPreviousSnapshotIds()?.has('mutual')).toBe(false);

    const marked = identifyNewUnfollowers([
      node('old-nf', false),
      node('new-nf', false),
      node('mutual', true),
    ]);

    expect(marked.find(user => user.id === 'new-nf')?.is_new_unfollower).toBe(true);
    expect(marked.find(user => user.id === 'old-nf')?.is_new_unfollower).toBe(false);
    expect(marked.find(user => user.id === 'mutual')?.is_new_unfollower).toBe(false);
  });

  it('ignores legacy snapshots that stored every following id', () => {
    localStorage.setItem(
      `${HISTORY_RESULTS_STORAGE_KEY}_unknown_user`,
      JSON.stringify({ timestamp: Date.now(), ids: ['1', '2'] }),
    );
    const marked = identifyNewUnfollowers([node('1', false)]);
    expect(marked[0].is_new_unfollower).toBeFalsy();
    expect(loadPreviousSnapshotIds()).toBeNull();
  });
});
