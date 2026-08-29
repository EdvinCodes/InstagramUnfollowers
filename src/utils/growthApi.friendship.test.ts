import { describe, expect, it } from 'vitest';
import { parseFriendshipStatus } from './growthApi';

describe('parseFriendshipStatus', () => {
  it('reads root-level Instagram show() fields', () => {
    expect(
      parseFriendshipStatus({
        following: false,
        outgoing_request: true,
        followed_by: false,
      }),
    ).toEqual({ following: false, outgoingRequest: true });
  });

  it('reads nested friendship_status from web_profile_info', () => {
    expect(
      parseFriendshipStatus({
        id: '123',
        friendship_status: { following: false, outgoing_request: true },
      }),
    ).toEqual({ following: false, outgoingRequest: true });
  });

  it('does not treat a missing nested object as not-pending', () => {
    expect(parseFriendshipStatus({ id: '123', username: 'leiirealj' })).toBeNull();
  });
});
