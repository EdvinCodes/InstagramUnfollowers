import { UserNode } from '../model/user';
import { UNFOLLOWERS_PER_PAGE, WITHOUT_PROFILE_PICTURE_URL_IDS } from '../constants/constants';
import { ScanningTab } from '../model/scanning-tab';
import { ScanningFilter } from '../model/scanning-filter';
import { UnfollowLogEntry } from '../model/unfollow-log-entry';
import { UnfollowFilter } from '../model/unfollow-filter';
import { calculateGhostScore, getGhostLabel } from './ghostScore';

/**
 * Copies the list of usernames to the clipboard.
 * Returns a Promise that resolves when successful.
 * Removed the 'alert' to handle UI feedback in the component.
 */
export async function copyListToClipboard(nonFollowersList: readonly UserNode[]): Promise<void> {
  const sortedList = [...nonFollowersList].sort((a, b) => a.username.localeCompare(b.username));

  const output = sortedList.map(user => user.username).join('\n');

  await navigator.clipboard.writeText(output);
}

export function getMaxPage(nonFollowersList: readonly UserNode[]): number {
  const pageCalc = Math.ceil(nonFollowersList.length / UNFOLLOWERS_PER_PAGE);
  return pageCalc < 1 ? 1 : pageCalc;
}

export function getCurrentPageUnfollowers(
  nonFollowersList: readonly UserNode[],
  currentPage: number,
): readonly UserNode[] {
  // Using localeCompare is better for string sorting
  const sortedList = [...nonFollowersList].sort((a, b) => a.username.localeCompare(b.username));

  // Use slice instead of splice to avoid mutation confusion (although we cloned it)
  const startIndex = UNFOLLOWERS_PER_PAGE * (currentPage - 1);
  return sortedList.slice(startIndex, startIndex + UNFOLLOWERS_PER_PAGE);
}

export function getUsersForDisplay(
  results: readonly UserNode[],
  whitelistedResults: readonly UserNode[],
  currentTab: ScanningTab,
  searchTerm: string,
  filter: ScanningFilter,
): readonly UserNode[] {
  const lowerSearchTerm = searchTerm.toLowerCase();

  return results.filter(user => {
    const isWhitelisted = whitelistedResults.some(w => w.id === user.id);

    // 1. LÓGICA DE PESTAÑAS (Usando Switch para evitar quejas del Linter)
    switch (currentTab) {
      case 'whitelisted': {
        if (!isWhitelisted) {
          return false;
        }
        break;
      }
      case 'non_whitelisted': {
        if (isWhitelisted) {
          return false;
        }
        // Solo mostrar si NO te siguen
        if (user.follows_viewer) {
          return false;
        }
        break;
      }
      case 'mutuals': {
        if (isWhitelisted) {
          return false;
        }
        // Solo mostrar si SÍ te siguen
        if (!user.follows_viewer) {
          return false;
        }
        break;
      }
      default: {
        // Esto satisface el chequeo de exhaustividad de TypeScript
        return false;
      }
    }

    // 2. FILTROS DE ATRIBUTOS (Con llaves {} para satisfacer eslintcurly)
    if (!filter.showPrivate && user.is_private) {
      return false;
    }
    if (!filter.showVerified && user.is_verified) {
      return false;
    }

    if (
      !filter.showWithOutProfilePicture &&
      WITHOUT_PROFILE_PICTURE_URL_IDS.some(id => user.profile_pic_url.includes(id))
    ) {
      return false;
    }

    if (filter.showGhostsOnly && calculateGhostScore(user).level === 'safe') {
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
) {
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

/**
 * Exhaustive check for switch-case statements.
 */
export function assertUnreachable(_value: never): never {
  throw new Error('Statement should be unreachable');
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getCookie(name: string): string | null {
  // Regex is safer and more robust than string splitting for cookies
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) {
    return match[2];
  }
  return null;
}

export function urlGenerator(nextCode?: string): string {
  const ds_user_id = getCookie('ds_user_id');

  // NOTE: This query_hash is specific to Instagram's API version.
  // If IG updates their API, this hash might need to be updated.
  const QUERY_HASH = '3dec7e2c57367ef3da3d987d89f9dbc8';

  // We construct the JSON string manually to ensure 'after' is only added if it exists,
  // matching the original logic string strictness.
  let variablesString = `{"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24"`;

  if (nextCode) {
    variablesString += `,"after":"${nextCode}"`;
  }
  variablesString += '}';

  return `https://www.instagram.com/graphql/query/?query_hash=${QUERY_HASH}&variables=${variablesString}`;
}

export function unfollowUserUrlGenerator(idToUnfollow: string): string {
  return `https://www.instagram.com/web/friendships/${idToUnfollow}/unfollow/`;
}

/**
 * Genera y descarga un archivo CSV con los resultados del escaneo.
 */
export const exportToCSV = (
  results: readonly UserNode[],
  whitelistedResults: readonly UserNode[],
  isPro: boolean, // <-- 1. Añadimos el parámetro de seguridad
) => {
  if (results.length === 0) {
    return;
  }

  // 2. Definir Cabeceras Condicionales
  const headers = [
    'Username',
    'Full Name',
    'Profile URL',
    'Relation',
    'Status',
    'Is Whitelisted',
    'Is Verified',
    'Is Private',
    ...(isPro ? ['Ghost Score', 'Account Health'] : ['Ghost Analysis']), // <-- Paywall en cabecera
    'ID',
  ];

  // 3. Construir filas
  const csvRows = results.map(user => {
    const isWhitelisted = whitelistedResults.some(w => w.id === user.id);
    const relation = user.follows_viewer ? 'Mutual (Friend)' : 'Non-Follower (Traitor)';
    const status = user.is_new_unfollower ? 'NEW' : 'Old';
    const profileUrl = `https://www.instagram.com/${user.username}`;

    const ghostAnalysis = calculateGhostScore(user);
    const escape = (text: string) => `"${text.replace(/"/g, '""')}"`;

    // 4. LÓGICA DE PAYWALL PARA LOS DATOS
    let premiumColumns: string[];
    if (isPro) {
      // Si ha pagado, le damos los datos exactos
      premiumColumns = [ghostAnalysis.score.toString(), escape(getGhostLabel(ghostAnalysis.level))];
    } else {
      // Si es gratis, censuramos el dato y le invitamos a pagar
      const basicGhost = ghostAnalysis.level === 'safe' ? 'No' : 'Yes';
      premiumColumns = [escape(`${basicGhost} (Upgrade to PRO for exact score)`)];
    }

    return [
      escape(user.username),
      escape(user.full_name),
      escape(profileUrl),
      escape(relation),
      escape(status),
      isWhitelisted ? 'Yes' : 'No',
      user.is_verified ? 'Yes' : 'No',
      user.is_private ? 'Yes' : 'No',
      ...premiumColumns, // <-- Inyectamos la información protegida
      escape(user.id),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...csvRows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `ig_unfollowers_report_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Genera una clave de almacenamiento única para la cuenta de Instagram activa.
 * Esto evita que se mezclen datos entre diferentes cuentas en el mismo navegador.
 */
export function getDynamicStorageKey(baseKey: string): string {
  const userId = getCookie('ds_user_id') || 'unknown_user';
  return `${baseKey}_${userId}`;
}

export function removeFollowerUrlGenerator(idToRemove: string): string {
  return `https://www.instagram.com/web/friendships/${idToRemove}/remove_follower/`;
}
