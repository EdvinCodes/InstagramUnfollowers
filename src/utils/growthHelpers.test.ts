import { describe, expect, it } from 'vitest';
import {
  canFollowToday,
  computeFollowDelayMs,
  getGrowthSkipReason,
  getTodayKey,
  incrementDailyFollowCount,
  isRateLimitResponse,
  mergeUniqueIds,
  parseTargetUsernames,
  postsWithinWindow,
  readDailyFollowCount,
  remainingDailyFollows,
} from './growthHelpers';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

describe('parseTargetUsernames', () => {
  it('splits comma, semicolon and newline separated handles', () => {
    expect(parseTargetUsernames('@Alpha, beta; GAMMA\n@delta')).toEqual([
      'alpha',
      'beta',
      'gamma',
      'delta',
    ]);
  });

  it('filters empty tokens', () => {
    expect(parseTargetUsernames('  , @user , ')).toEqual(['user']);
  });
});

describe('mergeUniqueIds', () => {
  it('deduplicates ids in O(1) lookups', () => {
    const seen = new Set(['1']);
    expect(mergeUniqueIds(seen, ['1', '2', '2', '3'])).toBe(2);
    expect(Array.from(seen).sort()).toEqual(['1', '2', '3']);
  });
});

describe('daily follow limits', () => {
  it('resets count when date changes', () => {
    const storage = new MemoryStorage() as unknown as Storage;
    storage.setItem('ig_growth_daily_follow_date', '2020-01-01');
    storage.setItem('ig_growth_daily_follow_count', '12');
    expect(readDailyFollowCount(storage)).toBe(0);
    expect(canFollowToday(storage, 50)).toBe(true);
  });

  it('tracks increments for the same day', () => {
    const storage = new MemoryStorage() as unknown as Storage;
    incrementDailyFollowCount(storage);
    incrementDailyFollowCount(storage);
    expect(readDailyFollowCount(storage)).toBe(2);
    expect(remainingDailyFollows(storage, 50)).toBe(48);
  });
});

describe('getGrowthSkipReason', () => {
  const base = {
    userId: '10',
    selfUserId: '1',
    followingIds: new Set<string>(),
    pendingRequestIds: new Set<string>(),
    whitelistIds: new Set<string>(),
    isGhost: false,
    isPrivate: false,
    dailyLimitReached: false,
  };

  it('skips self account', () => {
    expect(getGrowthSkipReason({ ...base, userId: '1' })).toBe('self');
  });

  it('skips whitelisted users', () => {
    expect(getGrowthSkipReason({ ...base, whitelistIds: new Set(['10']) })).toBe('whitelisted');
  });

  it('returns null when user is eligible', () => {
    expect(getGrowthSkipReason(base)).toBeNull();
  });
});

describe('isRateLimitResponse', () => {
  it('detects http 429', () => {
    expect(isRateLimitResponse(429)).toBe(true);
  });

  it('detects feedback_required payloads', () => {
    expect(isRateLimitResponse(400, '{"message":"feedback_required"}')).toBe(true);
  });
});

describe('postsWithinWindow', () => {
  it('accepts posts inside the window only', () => {
    const now = Date.UTC(2026, 7, 3);
    const recent = Math.floor(now / 1000) - 60 * 60 * 24;
    const old = Math.floor(now / 1000) - 60 * 60 * 24 * 20;
    expect(postsWithinWindow(recent, 15, now)).toBe(true);
    expect(postsWithinWindow(old, 15, now)).toBe(false);
  });
});

describe('computeFollowDelayMs', () => {
  it('returns at least the base delay', () => {
    expect(computeFollowDelayMs('tortoise')).toBeGreaterThanOrEqual(3 * 60 * 1000);
  });
});

describe('getTodayKey', () => {
  it('returns ISO date prefix', () => {
    expect(getTodayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
