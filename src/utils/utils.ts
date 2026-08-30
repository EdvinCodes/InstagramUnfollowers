import { UserNode } from '../model/user';
import { UNFOLLOWERS_PER_PAGE, WITHOUT_PROFILE_PICTURE_URL_IDS } from '../constants/constants';
import { ScanningTab } from '../model/scanning-tab';
import { ScanningFilter } from '../model/scanning-filter';
import { UnfollowLogEntry } from '../model/unfollow-log-entry';
import { UnfollowFilter } from '../model/unfollow-filter';
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
    const isWhitelisted = whitelistedResults.some(w => w.id === user.id);

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
    if (filter.showWithOutProfilePicture) {
      const isMissingPic =
        !!user.has_anonymous_profile_picture ||
        isProfilePicAnonymous(user.profile_pic_url) ||
        WITHOUT_PROFILE_PICTURE_URL_IDS.some(id => user.profile_pic_url.includes(id));

      if (!isMissingPic) {
        return false;
      }
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

export function urlGenerator(nextCode?: string): string {
  const ds_user_id = getCookie('ds_user_id');
  if (!ds_user_id) {
    throw new Error('No active Instagram session found');
  }

  // NOTE: This query_hash is specific to Instagram's API version.
  // If IG updates their API, this hash might need to be updated.
  const QUERY_HASH = '3dec7e2c57367ef3da3d987d89f9dbc8';
  const variables: Record<string, string> = {
    id: ds_user_id,
    include_reel: 'true',
    fetch_mutual: 'false',
    first: '24',
    ...(nextCode ? { after: nextCode } : {}),
  };

  return `https://www.instagram.com/graphql/query/?query_hash=${QUERY_HASH}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
}

export function unfollowUserUrlGenerator(idToUnfollow: string): string {
  return `https://www.instagram.com/web/friendships/${idToUnfollow}/unfollow/`;
}

// Genera y descarga un archivo CSV con los resultados del escaneo.
export const exportToCSV = (
  results: readonly UserNode[],
  whitelistedResults: readonly UserNode[],
  isPro: boolean,
  t: any, // Objeto de traducciones
) => {
  if (results.length === 0) {
    return;
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
    const isWhitelisted = whitelistedResults.some(w => w.id === user.id);
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
