import { describe, expect, it } from 'vitest';
import { isSuspiciousEmptyFirstPage, mapRestUserToNode, normalizeRestUser } from './igListsApi';

describe('normalizeRestUser', () => {
  it('maps pk, username and picture fields', () => {
    expect(
      normalizeRestUser({
        pk: 123,
        username: 'alpha',
        full_name: 'Alpha One',
        profile_pic_url: 'https://example.com/pic.jpg',
        is_private: true,
        is_verified: false,
      }),
    ).toEqual({
      pk: '123',
      username: 'alpha',
      fullName: 'Alpha One',
      profilePicUrl: 'https://example.com/pic.jpg',
      isPrivate: true,
      isVerified: false,
    });
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

describe('mapRestUserToNode', () => {
  it('marks the account as followed_by_viewer (it comes from the following list)', () => {
    const node = mapRestUserToNode(
      {
        pk: '1',
        username: 'alpha',
        fullName: 'Alpha',
        profilePicUrl: '',
        isPrivate: false,
        isVerified: false,
      },
      true,
    );
    expect(node.followed_by_viewer).toBe(true);
    expect(node.follows_viewer).toBe(true);
    expect(node.id).toBe('1');
  });

  it('flags anonymous profile pictures as ghosts-eligible', () => {
    const node = mapRestUserToNode(
      {
        pk: '2',
        username: 'ghost',
        fullName: '',
        profilePicUrl: 'https://example.com/anonymous_profile_pic.jpg',
        isPrivate: false,
        isVerified: false,
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
    expect(
      isSuspiciousEmptyFirstPage(
        [{ pk: '1', username: 'a', fullName: '', profilePicUrl: '', isPrivate: false, isVerified: false }],
        2834,
      ),
    ).toBe(false);
  });
});
