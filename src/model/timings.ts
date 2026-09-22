export interface Timings {
  timeBetweenSearchCycles: number;
  timeToWaitAfterFiveSearchCycles: number;
  timeBetweenUnfollows: number;
  timeToWaitAfterFiveUnfollows: number;
  /** Accounts requested per following/followers page during a live scan. Clamped to
   * [MIN_USERS_PER_SEARCH_CYCLE, MAX_USERS_PER_SEARCH_CYCLE] (see constants.ts) wherever
   * it's read/saved. Older stored timings won't have this field — utils.ts#loadTimings
   * backfills the default instead of discarding the rest of the saved settings. */
  usersPerSearchCycle: number;
}
