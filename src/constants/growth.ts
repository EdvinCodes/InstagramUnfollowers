export const GROWTH_DISCLAIMER_KEY = 'ig_growth_disclaimer_v1';
export const GROWTH_DAILY_COUNT_KEY = 'ig_growth_daily_follow_count';
export const GROWTH_DAILY_DATE_KEY = 'ig_growth_daily_follow_date';

export const GROWTH_POST_WINDOW_DAYS = 15;
export const GROWTH_MAX_POSTS = 24;
export const GROWTH_MAX_COMMENT_PAGES = 3;
export const GROWTH_DAILY_LIMIT_PRO = 50;

export const GROWTH_SCRAPE_DELAY_MS = 1500;
export const GROWTH_ACCOUNT_DELAY_MS = 2000;
export const GROWTH_RATE_LIMIT_BACKOFF_MS = 120_000;
export const GROWTH_FOLLOWS_BEFORE_COOLDOWN = 5;

export type GrowthSpeed = 'tortoise' | 'human' | 'kamikaze';

export const GROWTH_SPEED_DELAYS: Record<GrowthSpeed, number> = {
  tortoise: 3 * 60 * 1000,
  human: 60 * 1000,
  kamikaze: 15 * 1000,
};

export const GROWTH_JITTER_RATIO = 0.2;
