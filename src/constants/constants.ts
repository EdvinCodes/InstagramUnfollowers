export const INSTAGRAM_HOSTNAME = 'www.instagram.com';
export const UNFOLLOWERS_PER_PAGE = 50;
export const WHITELISTED_RESULTS_STORAGE_KEY = 'ig_unfollower_whitelisted_results';
export const HISTORY_RESULTS_STORAGE_KEY = 'ig_unfollower_history_snapshot';
// Like davidarroyo1234's fork, scan/unfollow timing settings persist automatically
// instead of resetting to defaults every time the content script reloads (see
// loadTimings/saveTimings in utils.ts and their use in main.tsx).
export const TIMINGS_STORAGE_KEY = 'ig_unfollower_timings';

/** Must match keys read by public/background.js */
export const CHROME_SCAN_FREQUENCY_KEY = 'ig_scan_frequency';
export const CHROME_LAST_SCAN_DATE_KEY = 'ig_last_scan_date';

// TIMINGS CONSTANTS
export const DEFAULT_TIME_BETWEEN_SEARCH_CYCLES = 1000;
export const DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES = 10000;
export const DEFAULT_TIME_BETWEEN_UNFOLLOWS = 4000;
export const DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS = 300000;
// Accounts requested per following/followers page (davidarroyo1234's fork calls this
// "usersPerSearchCycle" and exposes it in Settings). Instagram may still return fewer
// per page on its own — particularly for followers, which is server-chunked to ~15-25
// regardless of what's requested — this only controls what we ask for.
export const DEFAULT_USERS_PER_SEARCH_CYCLE = 50;
export const MIN_USERS_PER_SEARCH_CYCLE = 10;
export const MAX_USERS_PER_SEARCH_CYCLE = 100;

// FILTER CONSTANTS
export const WITHOUT_PROFILE_PICTURE_URL_IDS = [
  '44884218_345707102882519_2446069589734326272_n',
  '464760996_1254146839119862_3605321457742435801_n',
];
