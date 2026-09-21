import { describe, expect, it } from 'vitest';
import {
  isSuspiciousEmptyFirstPage,
  mapRestUserToNode,
  normalizeRestUser,
  parseFollowedBy,
  parseNextMaxId,
  restUserFollowsViewer,
} from './igListsApi';

const baseUser = {
  pk: '1',
  ids: ['1'],
  username: 'alpha',
  fullName: 'Alpha',
  profilePicUrl: '',
  isPrivate: false,
  isVerified: false,
  followedBy: null as boolean | null,
  outgoingRequest: null as boolean | null,
};

describe('normalizeRestUser', () => {
  it('maps pk, username, picture and followed_by', () => {
    expect(
      normalizeRestUser({
        pk: 123,
        username: 'alpha',
        full_name: 'Alpha One',
        profile_pic_url: 'https://example.com/pic.jpg',
        is_private: true,
        is_verified: false,
        friendship_status: { followed_by: true, following: true },
      }),
    ).toEqual({
      pk: '123',
      ids: ['123'],
      username: 'alpha',
      fullName: 'Alpha One',
      profilePicUrl: 'https://example.com/pic.jpg',
      isPrivate: true,
      isVerified: false,
      followedBy: true,
      outgoingRequest: null,
    });
  });

  it('collects pk, pk_id and id together for matching', () => {
    const user = normalizeRestUser({
      pk: 123,
      pk_id: '123',
      id: '17841400000000000',
      username: 'beta',
    });
    expect(user?.pk).toBe('123');
    expect(user?.ids).toEqual(['123', '17841400000000000']);
  });

  it('falls back to pk_id or id when pk is missing', () => {
    expect(normalizeRestUser({ pk_id: '456', username: 'beta' })?.pk).toBe('456');
    expect(normalizeRestUser({ id: '789', username: 'gamma' })?.pk).toBe('789');
  });

  it('prefers the HD profile picture when available', () => {
    expect(
      normalizeRestUser({
        pk: '1',
        username: 'delta',
        profile_pic_url: 'https://example.com/small.jpg',
        profile_pic_url_hd: 'https://example.com/hd.jpg',
      })?.profilePicUrl,
    ).toBe('https://example.com/hd.jpg');
  });

  it('returns null when there is no id or no username', () => {
    expect(normalizeRestUser({ username: 'no-id' })).toBeNull();
    expect(normalizeRestUser({ pk: '1' })).toBeNull();
  });
});

describe('parseFollowedBy', () => {
  it('reads nested friendship_status.followed_by', () => {
    expect(parseFollowedBy({ friendship_status: { followed_by: false } })).toBe(false);
  });

  it('reads a root-level followed_by flag', () => {
    expect(parseFollowedBy({ followed_by: true })).toBe(true);
  });

  it('returns null when Instagram omitted the flag', () => {
    expect(parseFollowedBy({ pk: '1', username: 'x' })).toBeNull();
  });
});

describe('parseNextMaxId', () => {
  it('stringifies numeric and object cursors', () => {
    expect(parseNextMaxId({ next_max_id: 50 }, '9')).toBe('50');
    expect(parseNextMaxId({ next_max_id: { cached_index: 12 } }, '9')).toBe('{"cached_index":12}');
  });

  it('uses the last pk only when has_more is true and there is no cursor', () => {
    expect(parseNextMaxId({ has_more: true }, '99')).toBe('99');
    expect(parseNextMaxId({ big_list: true }, '99')).toBeNull();
  });
});

describe('restUserFollowsViewer', () => {
  it('trusts friendship_status.followed_by when Instagram sent it', () => {
    expect(restUserFollowsViewer({ ...baseUser, followedBy: true }, new Set(), new Set())).toBe(true);
  });

  it('matches a follower by a secondary Instagram id (pk vs graph id)', () => {
    const user = { ...baseUser, ids: ['123', '17841400000000000'] };
    expect(restUserFollowsViewer(user, new Set(['17841400000000000']), new Set())).toBe(true);
  });

  it('matches a follower by username when ids differ', () => {
    expect(restUserFollowsViewer(baseUser, new Set(), new Set(['alpha']))).toBe(true);
  });

  it('does not mark everyone as a non-follower only because the followers list was empty', () => {
    expect(restUserFollowsViewer({ ...baseUser, followedBy: null }, new Set(), new Set())).toBe(false);
  });
});

describe('mapRestUserToNode', () => {
  it('marks the account as followed_by_viewer (it comes from the following list)', () => {
    const node = mapRestUserToNode(baseUser, true);
    expect(node.followed_by_viewer).toBe(true);
    expect(node.follows_viewer).toBe(true);
    expect(node.id).toBe('1');
  });

  it('flags anonymous profile pictures as ghosts-eligible', () => {
    const node = mapRestUserToNode(
      {
        ...baseUser,
        pk: '2',
        ids: ['2'],
        username: 'ghost',
        fullName: '',
        profilePicUrl: 'https://example.com/anonymous_profile_pic.jpg',
      },
      false,
    );
    expect(node.has_anonymous_profile_picture).toBe(true);
  });
});

describe('isSuspiciousEmptyFirstPage', () => {
  it('flags an empty page when Instagram reports a positive total elsewhere', () => {
    expect(isSuspiciousEmptyFirstPage([], 2834)).toBe(true);
  });

  it('does not flag an empty page when the total is unknown or genuinely zero', () => {
    expect(isSuspiciousEmptyFirstPage([], -1)).toBe(false);
    expect(isSuspiciousEmptyFirstPage([], 0)).toBe(false);
  });

  it('does not flag a page that actually has users', () => {
    expect(isSuspiciousEmptyFirstPage([baseUser], 2834)).toBe(false);
  });
});
