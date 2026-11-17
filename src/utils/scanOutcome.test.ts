import { describe, expect, it } from 'vitest';
import { isSuspiciousEmptyFirstPage, RestUser } from './igListsApi';
import {
  absorbFollowingUsers,
  classifyFollowing,
  followersLookTruncated,
  idsStillNeedingSweep,
  monitorMayCommitSnapshot,
  shouldPublishScanResults,
} from './scanOutcome';

function user(overrides: Partial<RestUser> & Pick<RestUser, 'pk' | 'username'>): RestUser {
  return {
    ids: [overrides.pk],
    fullName: overrides.username,
    profilePicUrl: '',
    isPrivate: false,
    isVerified: false,
    followedBy: null,
    outgoingRequest: null,
    ...overrides,
  };
}

describe('absorbFollowingUsers', () => {
  it('keeps one row when Instagram repeats a pk on a later page', () => {
    const following = new Map<string, RestUser>();
    absorbFollowingUsers(following, [user({ pk: '1', username: 'alpha' }), user({ pk: '2', username: 'beta' })]);
    absorbFollowingUsers(following, [user({ pk: '1', username: 'alpha-renamed' })]);
    expect([...following.keys()]).toEqual(['1', '2']);
    expect(following.get('1')?.username).toBe('alpha-renamed');
  });
});

describe('classifyFollowing', () => {
  const mutual = user({ pk: '10', username: 'real-mutual', followedBy: false, ids: ['10', 'ig-10'] });
  const stranger = user({ pk: '11', username: 'not-following-back', followedBy: false });
  const confirmed = user({ pk: '12', username: 'flag-true', followedBy: true });

  it('trusts the followers index over a false followed_by flag', () => {
    const nodes = classifyFollowing([mutual, stranger, confirmed], new Set(['ig-10']), new Set());
    expect(nodes.find(n => n.username === 'real-mutual')?.follows_viewer).toBe(true);
    expect(nodes.find(n => n.username === 'not-following-back')?.follows_viewer).toBe(false);
    expect(nodes.find(n => n.username === 'flag-true')?.follows_viewer).toBe(true);
  });

  it('sends the stale false flag to the show_many sweep and leaves a confirmed true out', () => {
    expect(idsStillNeedingSweep([mutual, stranger, confirmed], new Set(['ig-10']), new Set())).toEqual(['11']);
  });

  it('does not classify an empty first page as a finished scan of zero accounts', () => {
    expect(isSuspiciousEmptyFirstPage([], 2834)).toBe(true);
    expect(shouldPublishScanResults('blocked', 0, false)).toBe(false);
    expect(shouldPublishScanResults('blocked', 500, false)).toBe(false);
  });
});

describe('followersLookTruncated', () => {
  it('flags a list that ended far short of the profile total', () => {
    expect(followersLookTruncated(100, 400)).toBe(true);
    expect(followersLookTruncated(380, 400)).toBe(false);
    expect(followersLookTruncated(0, -1)).toBe(false);
  });
});

describe('shouldPublishScanResults', () => {
  it('publishes only when the followers list finished and there is something to show', () => {
    expect(shouldPublishScanResults('completed', 3, true)).toBe(true);
    expect(shouldPublishScanResults('partial', 3, true)).toBe(true);
    expect(shouldPublishScanResults('stopped', 500, true)).toBe(true);
    expect(shouldPublishScanResults('completed', 0, true)).toBe(false);
    expect(shouldPublishScanResults('blocked', 3, false)).toBe(false);
    expect(shouldPublishScanResults('rate_limit', 500, false)).toBe(false);
    expect(shouldPublishScanResults('error', 500, false)).toBe(false);
    expect(shouldPublishScanResults('account_changed', 500, true)).toBe(false);
    expect(shouldPublishScanResults('no_session', 0, false)).toBe(false);
  });
});

describe('monitorMayCommitSnapshot', () => {
  const ready = {
    followingComplete: true,
    followersComplete: true,
    resolvedFollowers: 12,
    knownFollowerTotal: 12,
    showManyRateLimited: false,
    followingCount: 20,
  };

  it('commits a scan that finished both lists', () => {
    expect(monitorMayCommitSnapshot(ready)).toBe(true);
  });

  it('commits a real zero-follower account', () => {
    expect(
      monitorMayCommitSnapshot({ ...ready, resolvedFollowers: 0, knownFollowerTotal: 0 }),
    ).toBe(true);
  });

  it('refuses a truncated list, an empty follower index, or a rate-limited sweep', () => {
    expect(monitorMayCommitSnapshot({ ...ready, followersComplete: false })).toBe(false);
    expect(monitorMayCommitSnapshot({ ...ready, followingComplete: false })).toBe(false);
    expect(monitorMayCommitSnapshot({ ...ready, resolvedFollowers: 0, knownFollowerTotal: -1 })).toBe(false);
    expect(monitorMayCommitSnapshot({ ...ready, resolvedFollowers: 0, knownFollowerTotal: 400 })).toBe(false);
    expect(monitorMayCommitSnapshot({ ...ready, showManyRateLimited: true })).toBe(false);
    expect(monitorMayCommitSnapshot({ ...ready, followingCount: 0 })).toBe(false);
  });
});
