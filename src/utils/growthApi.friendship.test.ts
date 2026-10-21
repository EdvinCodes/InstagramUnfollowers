import { describe, expect, it } from 'vitest';
import { didFriendshipActionSucceed, parseFriendshipStatus, readIgWebConfig } from './growthApi';

describe('parseFriendshipStatus', () => {
  it('reads root-level Instagram show() fields', () => {
    expect(
      parseFriendshipStatus({
        following: false,
        outgoing_request: true,
        followed_by: false,
      }),
    ).toEqual({ following: false, outgoingRequest: true, followedBy: false });
  });

  it('reads nested friendship_status from web_profile_info', () => {
    expect(
      parseFriendshipStatus({
        id: '123',
        friendship_status: { following: false, outgoing_request: true },
      }),
    ).toEqual({ following: false, outgoingRequest: true, followedBy: null });
  });

  it('does not treat a missing nested object as not-pending', () => {
    expect(parseFriendshipStatus({ id: '123', username: 'leiirealj' })).toBeNull();
  });
});

describe('didFriendshipActionSucceed', () => {
  it('does not treat a bare 200 body as an unfollow', () => {
    expect(didFriendshipActionSucceed('destroy', '{"status":"ok"}')).toBeNull();
  });

  it('rejects an unfollow that leaves following true', () => {
    expect(
      didFriendshipActionSucceed(
        'destroy',
        '{"status":"ok","friendship_status":{"following":true,"outgoing_request":false}}',
      ),
    ).toBe(false);
  });

  it('accepts an unfollow only when the relationship is gone', () => {
    expect(
      didFriendshipActionSucceed(
        'destroy',
        '{"status":"ok","friendship_status":{"following":false,"outgoing_request":false}}',
      ),
    ).toBe(true);
  });

  it('treats feedback_required as a failed action', () => {
    expect(didFriendshipActionSucceed('destroy', '{"message":"feedback_required","status":"fail"}')).toBe(
      false,
    );
  });
});

describe('readIgWebConfig', () => {
  it('reads the claim, rollout hash and asbd id embedded in the page', () => {
    const html =
      '{"www_claim":"hmac.AR123","rollout_hash":"1026488586","ASBD_ID":359341,"other":1}';
    expect(readIgWebConfig(html)).toEqual({
      wwwClaim: 'hmac.AR123',
      ajaxId: '1026488586',
      asbdId: '359341',
    });
  });
});
