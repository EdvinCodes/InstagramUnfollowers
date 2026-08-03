export type GrowthPhase = 'setup' | 'scraping' | 'following' | 'done';

export type GrowthSpeed = 'tortoise' | 'human' | 'kamikaze';

export interface GrowthTargetAccount {
  readonly username: string;
  readonly userId: string;
  readonly postsScraped: number;
  readonly commentersFound: number;
}

export interface GrowthState {
  readonly status: 'growth';
  readonly phase: GrowthPhase;
  readonly targetAccounts: readonly GrowthTargetAccount[];
  readonly commenterQueue: readonly string[];
  readonly followedCount: number;
  readonly skippedCount: number;
  readonly totalToFollow: number;
  readonly logs: readonly string[];
  readonly speed: GrowthSpeed;
  readonly isPaused: boolean;
  readonly isRunning: boolean;
  readonly disclaimerAccepted: boolean;
}

export function createInitialGrowthState(): GrowthState {
  return {
    status: 'growth',
    phase: 'setup',
    targetAccounts: [],
    commenterQueue: [],
    followedCount: 0,
    skippedCount: 0,
    totalToFollow: 0,
    logs: [],
    speed: 'tortoise',
    isPaused: false,
    isRunning: false,
    disclaimerAccepted: false,
  };
}
