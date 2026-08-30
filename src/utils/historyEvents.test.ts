import { describe, expect, it } from 'vitest';
import { HistoryEvent } from '../model/history';
import { Typename, UserNode } from '../model/user';
import {
  compactCancelledEvents,
  mergeCancelledIntoHistory,
  totalCancelled,
} from './historyEvents';

function user(username: string): UserNode {
  return {
    id: username,
    username,
    full_name: username,
    profile_pic_url: '',
    is_private: false,
    is_verified: false,
    followed_by_viewer: false,
    follows_viewer: false,
    requested_by_viewer: false,
    reel: {
      id: '',
      expiring_at: 0,
      has_pride_media: false,
      latest_reel_media: 0,
      seen: null,
      owner: {
        __typename: Typename.GraphUser,
        id: username,
        profile_pic_url: '',
        username,
      },
    },
  };
}

function event(partial: Partial<HistoryEvent> & Pick<HistoryEvent, 'id' | 'type' | 'timestamp'>): HistoryEvent {
  return {
    user: user(partial.user?.username || partial.id),
    ...partial,
  };
}

describe('compactCancelledEvents', () => {
  it('collapses same-day cancellations into one summary', () => {
    const day = new Date(2026, 7, 30, 10).getTime();
    const compacted = compactCancelledEvents([
      event({ id: '1', type: 'REQUEST_CANCELLED', timestamp: day, user: user('a') }),
      event({ id: '2', type: 'YOU_UNFOLLOWED', timestamp: day + 1, user: user('keep') }),
      event({ id: '3', type: 'REQUEST_CANCELLED', timestamp: day + 2, user: user('b') }),
    ]);

    expect(compacted.filter(item => item.type === 'REQUEST_CANCELLED')).toHaveLength(1);
    expect(totalCancelled(compacted)).toBe(2);
    expect(compacted.some(item => item.type === 'YOU_UNFOLLOWED' && item.user.username === 'keep')).toBe(
      true,
    );
  });
});

describe('mergeCancelledIntoHistory', () => {
  it('increments today instead of appending a row', () => {
    const now = Date.now();
    const first = mergeCancelledIntoHistory(
      [],
      event({ id: '1', type: 'REQUEST_CANCELLED', timestamp: now, user: user('a') }),
    );
    const second = mergeCancelledIntoHistory(
      first,
      event({ id: '2', type: 'REQUEST_CANCELLED', timestamp: now + 10, user: user('b') }),
    );

    expect(second.filter(item => item.type === 'REQUEST_CANCELLED')).toHaveLength(1);
    expect(totalCancelled(second)).toBe(2);
  });
});
