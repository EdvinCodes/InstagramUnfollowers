import type { IgFailure } from './igClient';
import type { ListPage } from './igListsApi';

/** Pauses before each retry, by failure. Their count is the retry budget. */
const RETRY_DELAYS_MS: Partial<Record<IgFailure, readonly number[]>> = {
  // Instagram's HTML answer on long lists clears after a pause; give it room.
  soft_block: [30_000, 60_000, 120_000, 240_000, 300_000],
  rate_limited: [60_000, 120_000, 240_000, 300_000, 300_000],
  network: [5_000, 15_000, 30_000],
  server: [15_000, 30_000, 60_000],
};

export function retryDelaysFor(failure: IgFailure): readonly number[] {
  return RETRY_DELAYS_MS[failure] ?? [];
}

export type WalkEnd =
  | { readonly kind: 'complete' }
  | { readonly kind: 'stopped' }
  | { readonly kind: 'failed'; readonly failure: IgFailure; readonly detail: string }
  | { readonly kind: 'stuck'; readonly reason: 'cursor_loop' | 'page_cap' }
  | { readonly kind: 'rejected' };

export interface WalkResult {
  readonly end: WalkEnd;
  readonly pages: number;
  /** Cursor of the next page to fetch, so an interrupted walk can resume. Null once complete. */
  readonly cursor: string | null;
}

export interface RetryNotice {
  readonly failure: IgFailure;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly secondsLeft: number;
}

export interface WalkDeps {
  fetchPage: (cursor: string | null) => Promise<ListPage>;
  /** 'reject' ends the walk without trusting the page (e.g. an empty first page). */
  onPage: (page: ListPage, pageIndex: number) => 'continue' | 'reject';
  /** Called once a page is absorbed and the cursor advanced. */
  onCursor?: (cursor: string, pagesFetched: number) => void;
  shouldStop: () => boolean;
  waitWhilePaused: () => Promise<void>;
  pace: (pagesFetched: number) => Promise<void>;
  onRetry: (notice: RetryNotice) => void;
  onOffline: () => void;
  /** Throws when the logged-in account changed. */
  checkAccount: () => void;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  isOnline: () => boolean;
  waitForOnline: () => Promise<void>;
}

export interface WalkOptions {
  readonly startCursor: string | null;
  readonly pageCap: number;
}

async function countdown(
  waitMs: number,
  notice: Omit<RetryNotice, 'secondsLeft'>,
  deps: WalkDeps,
): Promise<'stopped' | 'done'> {
  const endAt = deps.now() + waitMs;
  while (deps.now() < endAt) {
    if (deps.shouldStop()) {
      return 'stopped';
    }
    deps.checkAccount();
    deps.onRetry({ ...notice, secondsLeft: Math.ceil((endAt - deps.now()) / 1000) });
    await deps.sleep(Math.min(1000, endAt - deps.now()));
  }
  return 'done';
}

/**
 * Walks one following/followers list page by page. It never decides who
 * follows whom: it only reports how the walk ended, so callers can tell a
 * finished list from one Instagram cut short.
 */
export async function walkList(options: WalkOptions, deps: WalkDeps): Promise<WalkResult> {
  let cursor = options.startCursor;
  let pages = 0;
  let attempt = 0;

  for (;;) {
    deps.checkAccount();
    await deps.waitWhilePaused();
    if (deps.shouldStop()) {
      return { end: { kind: 'stopped' }, pages, cursor };
    }

    const page = await deps.fetchPage(cursor);
    deps.checkAccount();

    if (page.failure) {
      if (page.failure === 'network' && !deps.isOnline()) {
        // Offline is not Instagram's doing: wait for the connection without
        // spending the retry budget.
        deps.onOffline();
        await deps.waitForOnline();
        continue;
      }
      const delays = retryDelaysFor(page.failure);
      if (attempt < delays.length) {
        const waitMs = delays[attempt];
        attempt += 1;
        const waited = await countdown(
          waitMs,
          { failure: page.failure, attempt, maxAttempts: delays.length },
          deps,
        );
        if (waited === 'stopped') {
          return { end: { kind: 'stopped' }, pages, cursor };
        }
        continue;
      }
      return { end: { kind: 'failed', failure: page.failure, detail: page.detail }, pages, cursor };
    }
    attempt = 0;

    if (deps.onPage(page, pages) === 'reject') {
      return { end: { kind: 'rejected' }, pages, cursor };
    }
    pages += 1;

    const next = page.nextMaxId;
    if (!next) {
      return { end: { kind: 'complete' }, pages, cursor: null };
    }
    if (next === cursor) {
      return page.cursorIsSynthetic
        ? { end: { kind: 'complete' }, pages, cursor: null }
        : { end: { kind: 'stuck', reason: 'cursor_loop' }, pages, cursor };
    }
    cursor = next;
    deps.onCursor?.(cursor, pages);
    if (pages >= options.pageCap) {
      return { end: { kind: 'stuck', reason: 'page_cap' }, pages, cursor };
    }
    await deps.pace(pages);
  }
}

/** Page cap that still guards against an endless walk on very large lists. */
export function pageCapFor(knownTotal: number, minimumCap: number): number {
  if (knownTotal <= 0) {
    return minimumCap;
  }
  // Instagram can drop to ~10 users per page; leave head room above that.
  return Math.max(minimumCap, Math.ceil(knownTotal / 10) + 50);
}

/** Pause multiplier for long followers walks, where Instagram starts soft-blocking. */
export function pacingFactorFor(followersLoaded: number): number {
  if (followersLoaded >= 10_000) {
    return 3;
  }
  if (followersLoaded >= 5_000) {
    return 2;
  }
  return 1;
}
