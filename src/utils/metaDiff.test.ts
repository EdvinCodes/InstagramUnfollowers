import { describe, expect, it } from 'vitest';
import { buildCommunityDiff, communityDiffCount, listDiffPeople } from './metaDiff';
import type { MetaScanSnapshot } from './metaScan';

const snapshot = (
  following: string[],
  followers: string[],
  names: Record<string, string> = {},
): MetaScanSnapshot => ({
  timestamp: 1,
  following,
  followers,
  usernames: following.filter(username => !followers.includes(username)),
  names,
});

describe('buildCommunityDiff', () => {
  it('returns null without a full previous snapshot', () => {
    expect(
      buildCommunityDiff(snapshot([], []), [{ username: 'a', fullName: 'A' }], [{ username: 'a', fullName: 'A' }]),
    ).toBeNull();
    expect(buildCommunityDiff(null, [{ username: 'a', fullName: 'A' }], [{ username: 'a', fullName: 'A' }])).toBeNull();
  });

  it('detects they left, you unfollowed, new follows and new followers', () => {
    const previous = snapshot(['old', 'kept', 'traitor'], ['kept', 'traitor', 'leaver'], {
      old: 'Old Name',
    });
    const diff = buildCommunityDiff(
      previous,
      [
        { username: 'kept', fullName: 'Kept' },
        { username: 'traitor', fullName: 'Traitor' },
        { username: 'fresh', fullName: 'Fresh' },
      ],
      [
        { username: 'kept', fullName: 'Kept' },
        { username: 'newbie', fullName: 'Newbie' },
      ],
    );
    expect(diff?.youUnfollowed.map(user => user.username)).toEqual(['old']);
    expect(diff?.youUnfollowed[0]?.fullName).toBe('Old Name');
    expect(diff?.theyUnfollowed.map(user => user.username).sort()).toEqual(['leaver', 'traitor']);
    expect(diff?.youFollowed.map(user => user.username)).toEqual(['fresh']);
    expect(diff?.newFollowers.map(user => user.username)).toEqual(['newbie']);
    expect(communityDiffCount(diff!)).toBeGreaterThan(0);
  });

  it('marks someone who started following back as now mutual', () => {
    const previous = snapshot(['alpha'], []);
    const diff = buildCommunityDiff(
      previous,
      [{ username: 'alpha', fullName: 'Alpha' }],
      [{ username: 'alpha', fullName: 'Alpha' }],
    );
    expect(diff?.nowMutual.map(user => user.username)).toEqual(['alpha']);
  });

  it('is empty when both exports match', () => {
    const following = [
      { username: 'a', fullName: 'A' },
      { username: 'b', fullName: 'B' },
    ];
    const followers = [{ username: 'a', fullName: 'A' }];
    const diff = buildCommunityDiff(snapshot(['a', 'b'], ['a']), following, followers);
    expect(communityDiffCount(diff!)).toBe(0);
    expect(listDiffPeople(diff!)).toEqual([]);
  });
});
