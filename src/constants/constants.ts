export const INSTAGRAM_HOSTNAME = 'www.instagram.com';
export const UNFOLLOWERS_PER_PAGE = 50;
export const WHITELISTED_RESULTS_STORAGE_KEY = 'ig_unfollower_whitelisted_results';
export const HISTORY_RESULTS_STORAGE_KEY = 'ig_unfollower_history_snapshot';

/** Must match keys read by public/background.js */
export const CHROME_SCAN_FREQUENCY_KEY = 'ig_scan_frequency';
export const CHROME_LAST_SCAN_DATE_KEY = 'ig_last_scan_date';

// TIMINGS CONSTANTS
export const DEFAULT_TIME_BETWEEN_SEARCH_CYCLES = 1000;
export const DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES = 10000;
export const DEFAULT_TIME_BETWEEN_UNFOLLOWS = 4000;
export const DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS = 300000;

// FILTER CONSTANTS
export const WITHOUT_PROFILE_PICTURE_URL_IDS = [
  '44884218_345707102882519_2446069589734326272_n',
  '464760996_1254146839119862_3605321457742435801_n',
];
