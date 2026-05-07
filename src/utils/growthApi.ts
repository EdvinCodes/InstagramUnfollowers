import { getCookie } from './utils';

function getHeaders(): HeadersInit {
  const csrfToken = getCookie('csrftoken') ?? '';
  return {
    'x-ig-app-id': '936619743392459',
    'x-csrftoken': csrfToken,
    'x-requested-with': 'XMLHttpRequest',
    'accept': '*/*',
    'referer': 'https://www.instagram.com/',
  };
}

/** Convierte @username → User ID numérico */
export async function getUserId(username: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: getHeaders(),
        credentials: 'include',
      },
    );

    if (!res.ok) return null;

    const json = (await res.json()) as {
      data?: { user?: { id?: string } };
    };

    return json?.data?.user?.id ?? null;
  } catch {
    return null;
  }
}

const FIFTEEN_DAYS_S = 15 * 24 * 60 * 60;

/**
 * Devuelve shortcodes de posts de los últimos 15 días para un userId.
 * Usa la API REST v1 en lugar del GraphQL legacy.
 */
export async function getRecentPostIds(userId: string): Promise<string[]> {
  const cutoff = Math.floor(Date.now() / 1000) - FIFTEEN_DAYS_S;
  const postIds: string[] = [];

  try {
    const res = await fetch(`https://www.instagram.com/api/v1/feed/user/${userId}/?count=12`, {
      headers: getHeaders(),
      credentials: 'include',
    });

    if (!res.ok) return [];

    const json = (await res.json()) as any;
    const items: any[] = json?.items ?? [];

    for (const item of items) {
      const takenAt: number = item.taken_at ?? 0;
      if (takenAt < cutoff) continue;

      // Extraemos el ID numérico interno directamente, ignorando el shortcode
      const mediaId = String(item.pk ?? item.id ?? '');

      if (mediaId) postIds.push(mediaId);
    }
  } catch {
    return [];
  }

  return postIds;
}

/**
 * Devuelve IDs de usuarios que comentaron en un post (por shortcode).
 */
export async function getCommenterIds(mediaId: string): Promise<string[]> {
  const seen = new Set<string>();
  const ids: string[] = [];

  try {
    // Vamos directos al endpoint de comentarios usando el mediaId
    const commentsRes = await fetch(
      `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true&permalink_enabled=false`,
      {
        headers: getHeaders(),
        credentials: 'include',
      },
    );

    if (!commentsRes.ok) return [];

    const commentsJson = (await commentsRes.json()) as any;
    const comments: any[] = commentsJson?.comments ?? [];

    for (const c of comments) {
      const uid: string = c?.user?.pk ?? c?.user_id ?? '';
      if (uid && !seen.has(uid)) {
        seen.add(uid);
        ids.push(uid);
      }
    }
  } catch {
    return [];
  }

  return ids;
}

export interface GhostCheckResult {
  isGhost: boolean;
  reason: string;
}

/** Detecta fantasmas: sin foto de perfil o con 0 posts */
export async function checkIfGhost(userId: string): Promise<GhostCheckResult> {
  try {
    const res = await fetch(`https://www.instagram.com/api/v1/users/${userId}/info/`, {
      headers: getHeaders(),
      credentials: 'include',
    });

    if (!res.ok) return { isGhost: false, reason: '' };

    const json = (await res.json()) as any;
    const user = json?.user;

    if (!user) return { isGhost: false, reason: '' };

    const picUrl: string = user.profile_pic_url_hd ?? user.profile_pic_url ?? '';
    const posts: number = user.media_count ?? 0;

    const isAnon =
      picUrl.includes('44884218_345707102882519') ||
      picUrl.toLowerCase().includes('anonymousprofilepic') ||
      picUrl === '';

    if (isAnon) return { isGhost: true, reason: 'sin foto de perfil' };
    if (posts === 0) return { isGhost: true, reason: '0 posts' };

    return { isGhost: false, reason: '' };
  } catch {
    return { isGhost: false, reason: '' };
  }
}

/** POST a /api/v1/friendships/create/{userId}/ */
export async function followUser(userId: string): Promise<boolean> {
  const csrfToken = getCookie('csrftoken') ?? '';

  try {
    const res = await fetch(`https://www.instagram.com/api/v1/friendships/create/${userId}/`, {
      method: 'POST',
      headers: {
        'x-ig-app-id': '936619743392459',
        'x-csrftoken': csrfToken,
        'content-type': 'application/x-www-form-urlencoded',
        'x-requested-with': 'XMLHttpRequest',
        'referer': 'https://www.instagram.com/',
      },
      credentials: 'include',
      body: `user_id=${userId}`,
    });

    return res.ok;
  } catch {
    return false;
  }
}
