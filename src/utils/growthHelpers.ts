import {
  GROWTH_DAILY_COUNT_KEY,
  GROWTH_DAILY_DATE_KEY,
  GROWTH_DAILY_LIMIT_PRO,
  GROWTH_JITTER_RATIO,
  GROWTH_SPEED_DELAYS,
  GrowthSpeed,
} from '../constants/growth';

export type GrowthSkipReason =
  | 'self'
  | 'already_following'
  | 'pending_request'
  | 'whitelisted'
  | 'ghost'
  | 'private'
  | 'daily_limit';

export function parseTargetUsernames(input: string): string[] {
  return input
    .split(/[,;\n]+/)
    .map(s => s.trim().replace(/^@/, '').toLowerCase())
    .filter(Boolean);
}

export function mergeUniqueIds(seen: Set<string>, ids: readonly string[]): number {
  let added = 0;
  for (const id of ids) {
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    added++;
  }
  return added;
}

export function computeFollowDelayMs(speed: GrowthSpeed): number {
  const base = GROWTH_SPEED_DELAYS[speed];
  const jitter = Math.floor(Math.random() * base * GROWTH_JITTER_RATIO);
  return base + jitter;
}

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readDailyFollowCount(storage: Storage = localStorage): number {
  const date = storage.getItem(GROWTH_DAILY_DATE_KEY);
  if (date !== getTodayKey()) {
    return 0;
  }
  const raw = storage.getItem(GROWTH_DAILY_COUNT_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function incrementDailyFollowCount(storage: Storage = localStorage): number {
  const today = getTodayKey();
  const current = readDailyFollowCount(storage);
  const next = current + 1;
  storage.setItem(GROWTH_DAILY_DATE_KEY, today);
  storage.setItem(GROWTH_DAILY_COUNT_KEY, String(next));
  return next;
}

export function canFollowToday(
  storage: Storage = localStorage,
  limit: number = GROWTH_DAILY_LIMIT_PRO,
): boolean {
  return readDailyFollowCount(storage) < limit;
}

export function remainingDailyFollows(
  storage: Storage = localStorage,
  limit: number = GROWTH_DAILY_LIMIT_PRO,
): number {
  return Math.max(0, limit - readDailyFollowCount(storage));
}

export interface GrowthSkipContext {
  userId: string;
  username?: string;
  selfUserId: string | null;
  followingIds: ReadonlySet<string>;
  pendingRequestIds: ReadonlySet<string>;
  whitelistIds: ReadonlySet<string>;
  isGhost: boolean;
  isPrivate: boolean;
  dailyLimitReached: boolean;
}

export function getGrowthSkipReason(ctx: GrowthSkipContext): GrowthSkipReason | null {
  if (ctx.dailyLimitReached) {
    return 'daily_limit';
  }
  if (ctx.selfUserId && ctx.userId === ctx.selfUserId) {
    return 'self';
  }
  if (
    ctx.whitelistIds.has(ctx.userId) ||
    (ctx.username && ctx.whitelistIds.has(ctx.username.toLowerCase()))
  ) {
    return 'whitelisted';
  }
  if (ctx.followingIds.has(ctx.userId)) {
    return 'already_following';
  }
  if (ctx.pendingRequestIds.has(ctx.userId)) {
    return 'pending_request';
  }
  if (ctx.isPrivate) {
    return 'private';
  }
  if (ctx.isGhost) {
    return 'ghost';
  }
  return null;
}

export function isRateLimitResponse(status: number, body?: string): boolean {
  if (status === 429) {
    return true;
  }
  if (!body) {
    return false;
  }
  const lower = body.toLowerCase();
  return (
    lower.includes('feedback_required') ||
    lower.includes('rate limit') ||
    lower.includes('please wait')
  );
}

export function postsWithinWindow(takenAt: number, windowDays: number, nowMs = Date.now()): boolean {
  const cutoff = Math.floor(nowMs / 1000) - windowDays * 24 * 60 * 60;
  return takenAt >= cutoff;
}
