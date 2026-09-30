import { describe, expect, it } from 'vitest';
import { absorbLookupAttempt, finishLookup, type LookupAttemptState } from './igUserLookup';

function state(): LookupAttemptState {
  return { found: null, rateLimit: null };
}

describe('absorbLookupAttempt', () => {
  it('keeps a missing account as not-found even after another strategy was rate-limited', () => {
    const current = state();
    expect(absorbLookupAttempt(current, { id: null, status: 429, friendship: null })).toBe('next');
    expect(absorbLookupAttempt(current, { id: null, status: 404, friendship: null })).toBe('done');
    expect(finishLookup(current)).toEqual({ id: null, status: 404, friendship: null });
  });

  it('reports a rate limit only when no strategy found the account or proved it is missing', () => {
    const current = state();
    absorbLookupAttempt(current, null);
    absorbLookupAttempt(current, { id: null, status: 429, friendship: null });
    expect(finishLookup(current).status).toBe(429);
  });

  it('returns the id from the first strategy that resolved it', () => {
    const current = state();
    expect(
      absorbLookupAttempt(current, {
        id: '99',
        status: 200,
        friendship: { following: false, outgoingRequest: true },
      }),
    ).toBe('done');
    expect(finishLookup(current).id).toBe('99');
  });
});
