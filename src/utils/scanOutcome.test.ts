import { describe, expect, it } from 'vitest';
import { isSuspiciousEmptyFirstPage, RestUser } from './igListsApi';
import {
  absorbFollowingUsers,
  classifyFollowing,
  followersPassFailure,
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
    expect(shouldPublishScanResults('blocked', 0)).toBe(false);
    // Following was already loaded, but followers came back empty. Publishing would
    // mark every account a non-follower — the bug issue #5 kept coming back as.
    expect(shouldPublishScanResults('blocked', 500)).toBe(false);
  });
});

describe('followersPassFailure', () => {
  it('blocks when nothing was resolved and marks a partial index as partial', () => {
    expect(followersPassFailure(0)).toBe('blocked');
    expect(followersPassFailure(4)).toBe('partial');
  });
});

describe('shouldPublishScanResults', () => {
  it('publishes a completed or partial list and keeps every unfinished scan off screen', () => {
    expect(shouldPublishScanResults('completed', 3)).toBe(true);
    expect(shouldPublishScanResults('partial', 3)).toBe(true);
    expect(shouldPublishScanResults('completed', 0)).toBe(false);
    expect(shouldPublishScanResults('blocked', 3)).toBe(false);
    // Following was already loaded, followers never ran. Publishing would mark
    // every account a non-follower.
    expect(shouldPublishScanResults('rate_limit', 500)).toBe(false);
    expect(shouldPublishScanResults('error', 500)).toBe(false);
    expect(shouldPublishScanResults('stopped', 500)).toBe(false);
    expect(shouldPublishScanResults('no_session', 0)).toBe(false);
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
