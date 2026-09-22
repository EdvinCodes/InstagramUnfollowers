import { UserNode } from '../model/user';
import {
  DEFAULT_USERS_PER_SEARCH_CYCLE,
  MAX_USERS_PER_SEARCH_CYCLE,
  MIN_USERS_PER_SEARCH_CYCLE,
  TIMINGS_STORAGE_KEY,
  UNFOLLOWERS_PER_PAGE,
  WITHOUT_PROFILE_PICTURE_URL_IDS,
} from '../constants/constants';
import { ScanningTab } from '../model/scanning-tab';
import { ScanningFilter } from '../model/scanning-filter';
import { Timings } from '../model/timings';
import { UnfollowLogEntry } from '../model/unfollow-log-entry';
import { UnfollowFilter } from '../model/unfollow-filter';
import { getTranslations } from '../i18n/i18n';
import { calculateGhostScore, getGhostLabel } from './ghostScore';

// Copies the list of usernames to the clipboard.
// Returns a Promise that resolves when successful.
// Removed the alert to handle UI feedback in the component.
export async function copyListToClipboard(nonFollowersList: readonly UserNode[]): Promise<void> {
  const sortedList = [...nonFollowersList].sort((a, b) => a.username.localeCompare(b.username));
  const output = sortedList.map(user => user.username).join('\n');
  await navigator.clipboard.writeText(output);
}

export function getMaxPage(nonFollowersList: readonly UserNode[]): number {
  const pageCalc = Math.ceil(nonFollowersList.length / UNFOLLOWERS_PER_PAGE);
  return pageCalc < 1 ? 1 : pageCalc;
}

export function getSafePage(list: readonly UserNode[], currentPage: number): number {
  const maxPage = getMaxPage(list);
  if (!Number.isFinite(currentPage) || currentPage < 1) {
    return 1;
  }
  return currentPage > maxPage ? maxPage : currentPage;
}

export function getCurrentPageUnfollowers(
  nonFollowersList: readonly UserNode[],
  currentPage: number,
): readonly UserNode[] {
  const safePage = getSafePage(nonFollowersList, currentPage);
  const sortedList = [...nonFollowersList].sort((a, b) =>
    a.username.localeCompare(b.username, undefined, { sensitivity: 'base' }),
  );
  const startIndex = UNFOLLOWERS_PER_PAGE * (safePage - 1);
  return sortedList.slice(startIndex, startIndex + UNFOLLOWERS_PER_PAGE);
}

export function isSameAccount(
  a: { id?: string; username?: string },
  b: { id?: string; username?: string },
): boolean {
  if (a.id && b.id && a.id === b.id) {
    return true;
  }
  const left = a.username?.trim().toLowerCase();
  const right = b.username?.trim().toLowerCase();
  return !!left && !!right && left === right;
}

export function viewerFollowsBack(user: UserNode): boolean {
  const value = user.follows_viewer as unknown;
  return value === true || value === 'true' || value === 1;
}

// Esta cadena es la que viene en la cache_key de las URLs que pasaste
const ANONYMOUS_MARKER = 'anonymous_profile_pic';

export const isProfilePicAnonymous = (url: string | undefined): boolean => {
  if (!url) {
    return true;
  }
  const urlL = url.toLowerCase();
  return (
    urlL.includes('default') ||
    urlL.includes(ANONYMOUS_MARKER) ||
    // El ID numérico que pasaste también es constante en los placeholders
    urlL.includes('573323465_1219825463302212')
  );
};

/** Same "no real profile picture" heuristic used by the showWithOutProfilePicture
 * filter and CSV/PDF exports — pulled out so the Smart Select "No Profile Pic"
 * button (Searching.tsx) can select the exact same set of accounts instead of
 * re-implementing the check and risking it drifting out of sync. */
export function isMissingProfilePicture(user: UserNode): boolean {
  return (
    !!user.has_anonymous_profile_picture ||
    isProfilePicAnonymous(user.profile_pic_url) ||
    WITHOUT_PROFILE_PICTURE_URL_IDS.some(id => user.profile_pic_url.includes(id))
  );
}

export function getUsersForDisplay(
  results: readonly UserNode[],
  whitelistedResults: readonly UserNode[],
  currentTab: ScanningTab,
  searchTerm: string,
  filter: ScanningFilter,
  t: any,
): readonly UserNode[] {
  const lowerSearchTerm = searchTerm.toLowerCase();

  return results.filter(user => {
    const isWhitelisted = whitelistedResults.some(w => isSameAccount(w, user));

    // 1. LÓGICA DE PESTAÑAS
    switch (currentTab) {
      case 'whitelisted':
        if (!isWhitelisted) {
          return false;
        }
        break;
      case 'non_whitelisted':
        if (isWhitelisted) {
          return false;
        }
        if (viewerFollowsBack(user)) {
          return false;
        }
        break;
      case 'mutuals':
        if (isWhitelisted) {
          return false;
        }
        if (!viewerFollowsBack(user)) {
          return false;
        }
        break;
      case 'changes':
        return false;
      default:
        return false;
    }

    // 2. FILTROS REALES
    // Si marcas la casilla, SÓLO ves a los que cumplen eso

    // Si busco privados y el usuario NO es privado, lo descarto
    if (filter.showPrivate && !user.is_private) {
      return false;
    }

    // Si busco verificados y el usuario NO está verificado, lo descarto
    if (filter.showVerified && !user.is_verified) {
      return false;
    }

    // BUG FIX #1: Filtro "Sin foto de perfil" unificado con la lógica de ghostScore.ts
    // Se añade la comprobación de la palabra 'default' en la URL (igual que ghostScore)
    // y se usa has_anonymous_profile_picture con una comprobación de falsiness más robusta
    // para cubrir los casos donde el campo llega como undefined desde la API.
    if (filter.showWithOutProfilePicture && !isMissingProfilePicture(user)) {
      return false;
    }

    // Si busco fantasmas y este usuario es 'safe' (seguro), lo descarto
    if (filter.showGhostsOnly && calculateGhostScore(user, t).level === 'safe') {
      return false;
    }

    // 3. BUSCADOR
    if (searchTerm !== '') {
      const matchesSearch =
        user.username.toLowerCase().includes(lowerSearchTerm) ||
        user.full_name.toLowerCase().includes(lowerSearchTerm);
      if (!matchesSearch) {
        return false;
      }
    }

    return true;
  });
}

export function getUnfollowLogForDisplay(
  log: readonly UnfollowLogEntry[],
  searchTerm: string,
  filter: UnfollowFilter,
): UnfollowLogEntry[] {
  const lowerSearchTerm = searchTerm.toLowerCase();
  return log.filter(entry => {
    if (!filter.showSucceeded && entry.unfollowedSuccessfully) {
      return false;
    }
    if (!filter.showFailed && !entry.unfollowedSuccessfully) {
      return false;
    }
    if (searchTerm !== '') {
      const matchesSearch = entry.user.username.toLowerCase().includes(lowerSearchTerm);
      if (!matchesSearch) {
        return false;
      }
    }
    return true;
  });
}

// Exhaustive check for switch-case statements.
export function assertUnreachable(_value: never): never {
  throw new Error('Statement should be unreachable');
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getCookie(name: string): string | null {
  // Regex is safer and more robust than string splitting for cookies
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  if (match) {
    return match[2];
  }
  return null;
}

export function unfollowUserUrlGenerator(idToUnfollow: string): string {
  return `https://www.instagram.com/web/friendships/${idToUnfollow}/unfollow/`;
}

// Genera y descarga un archivo CSV con los resultados del escaneo.
export const exportToCSV = (
  results: readonly UserNode[],
  whitelistedResults: readonly UserNode[],
  isPro: boolean,
  t: any, // Objeto de traducciones o función t()
) => {
  if (results.length === 0) {
    return;
  }
  if (typeof t === 'function') {
    t = getTranslations();
  }

  const headers = [
    'Username',
    'Full Name',
    'Profile URL',
    t.relation,
    t.status,
    t.isWhitelisted,
    t.isVerified,
    t.isPrivate,
    ...(isPro ? [t.ghostScore, t.accountHealth] : [t.ghostAnalysis]),
    'ID',
  ];

  const csvRows = results.map(user => {
    const isWhitelisted = whitelistedResults.some(w => isSameAccount(w, user));
    const relation = user.follows_viewer ? t.mutual : t.nonFollower;
    const status = user.is_new_unfollower ? t.newBadge : t.old;
    const profileUrl = `https://www.instagram.com/${user.username}`;
    const ghostAnalysis = calculateGhostScore(user, t);
    const csvEscape = (text: any) => `"${String(text).replace(/"/g, '""')}"`;

    let premiumColumns: string[];
    if (isPro) {
      premiumColumns = [
        ghostAnalysis.score.toString(),
        csvEscape(getGhostLabel(ghostAnalysis.level, t)),
      ];
    } else {
      const basicGhost = ghostAnalysis.level === 'safe' ? t.no : t.yes;
      premiumColumns = [csvEscape(`${basicGhost} ${t.csvUpgradePromo}`)];
    }

    return [
      csvEscape(user.username),
      csvEscape(user.full_name),
      csvEscape(profileUrl),
      csvEscape(relation),
      csvEscape(status),
      isWhitelisted ? t.yes : t.no,
      user.is_verified ? t.yes : t.no,
      user.is_private ? t.yes : t.no,
      ...premiumColumns,
      csvEscape(user.id),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...csvRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `ig-unfollowers-report-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Genera una clave de almacenamiento única para la cuenta de Instagram activa.
// Esto evita que se mezclen datos entre diferentes cuentas en el mismo navegador.
export function getDynamicStorageKey(baseKey: string): string {
  const userId = getCookie('ds_user_id') ?? 'unknown_user';
  return `${baseKey}_${userId}`;
}

export function isChromeStorageAvailable(): boolean {
  try {
    const chromeApi = (globalThis as { chrome?: typeof chrome }).chrome;
    return !!chromeApi?.storage.local;
  } catch {
    return false;
  }
}

export function removeFollowerUrlGenerator(idToRemove: string): string {
  return `https://www.instagram.com/web/friendships/${idToRemove}/remove_follower/`;
}

// Like davidarroyo1234's fork: scan/unfollow timing settings persist across
// page reloads instead of silently resetting to defaults every time (the
// content script re-runs its whole app on every Instagram page load). Scoped
// per-account via getDynamicStorageKey, same as the whitelist/history keys.
/** Saved timings from before usersPerSearchCycle existed. loadTimings fills that field. */
type StoredTimings = Omit<Timings, 'usersPerSearchCycle'> & { usersPerSearchCycle?: number };

function isStoredTimings(value: unknown): value is StoredTimings {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.timeBetweenSearchCycles === 'number' &&
    typeof candidate.timeToWaitAfterFiveSearchCycles === 'number' &&
    typeof candidate.timeBetweenUnfollows === 'number' &&
    typeof candidate.timeToWaitAfterFiveUnfollows === 'number' &&
    (candidate.usersPerSearchCycle === undefined || typeof candidate.usersPerSearchCycle === 'number')
  );
}

/** Clamps a candidate `usersPerSearchCycle` value into the safe range, falling back to
 * the default for anything non-finite (missing field, corrupted storage, empty input). */
export function clampUsersPerSearchCycle(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_USERS_PER_SEARCH_CYCLE;
  }
  return Math.min(MAX_USERS_PER_SEARCH_CYCLE, Math.max(MIN_USERS_PER_SEARCH_CYCLE, Math.round(value)));
}

export function loadTimings(): Timings | null {
  try {
    const raw = localStorage.getItem(getDynamicStorageKey(TIMINGS_STORAGE_KEY));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!isStoredTimings(parsed)) {
      return null;
    }
    // Older stored timings (saved before usersPerSearchCycle existed) won't have this
    // field — backfill the default instead of discarding the rest of the saved settings.
    return {
      ...parsed,
      usersPerSearchCycle: clampUsersPerSearchCycle(parsed.usersPerSearchCycle),
    };
  } catch {
    return null;
  }
}

export function saveTimings(timings: Timings): void {
  try {
    localStorage.setItem(getDynamicStorageKey(TIMINGS_STORAGE_KEY), JSON.stringify(timings));
  } catch {
    // storage full or unavailable — ignore, defaults will be used next time
  }
}
