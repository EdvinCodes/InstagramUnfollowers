import type { PendingRequestUser } from '../model/pending-request';

const USERNAME_RE = /^[a-zA-Z0-9._]{1,30}$/;

const USERNAME_LABELS = new Set([
  'nombre de usuario',
  'username',
  'user name',
  'nome de usuário',
  'nome de usuario',
  'nome utente',
  "nom d'utilisateur",
  'nom utilisateur',
  'benutzername',
  'gebruikersnaam',
  'kullanıcı adı',
  'kullanici adi',
  'имя пользователя',
  'nazwa użytkownika',
  'tên người dùng',
  'ユーザー名',
  '사용자 이름',
  'اسم المستخدم',
]);

const NAME_LABELS = new Set([
  'nombre',
  'name',
  'nome',
  'nom',
  'full name',
  'nome completo',
  'display name',
]);

const ROW_RE =
  /<td[^>]*class="[^"]*_a6_q[^"]*"[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class="[^"]*_a6_r[^"]*"[^>]*>([\s\S]*?)<\/td>/gi;

export function normalizePendingUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function isPendingUsername(value: string): boolean {
  const normalized = normalizePendingUsername(value);
  return USERNAME_RE.test(normalized);
}

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function usernameFromHref(href: string): string | null {
  const match = href.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (!match) {
    return null;
  }
  const username = normalizePendingUsername(match[1]);
  return isPendingUsername(username) ? username : null;
}

function dedupeUsers(users: PendingRequestUser[]): PendingRequestUser[] {
  const seen = new Set<string>();
  const result: PendingRequestUser[] = [];
  for (const user of users) {
    const username = normalizePendingUsername(user.username);
    if (!isPendingUsername(username) || seen.has(username)) {
      continue;
    }
    seen.add(username);
    result.push({
      username,
      fullName: user.fullName.trim() || username,
      requestedAt: user.requestedAt,
    });
  }
  return result;
}

function parseHtmlExport(html: string): PendingRequestUser[] {
  const users: PendingRequestUser[] = [];
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];

  for (const table of tables) {
    let fullName = '';
    let username = '';
    ROW_RE.lastIndex = 0;
    let row = ROW_RE.exec(table);
    while (row) {
      const label = decodeHtml(row[1]).toLowerCase();
      const value = decodeHtml(row[2]);
      if (USERNAME_LABELS.has(label) && isPendingUsername(value)) {
        username = normalizePendingUsername(value);
      } else if (NAME_LABELS.has(label)) {
        fullName = value;
      } else if (!username && isPendingUsername(value) && USERNAME_LABELS.has(label)) {
        username = normalizePendingUsername(value);
      }
      row = ROW_RE.exec(table);
    }
    if (username) {
      users.push({ username, fullName: fullName || username });
    }
  }

  return users;
}

function usernameFromJsonEntry(entry: unknown): { username: string; requestedAt?: string } | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  if (typeof record.value === 'string' && isPendingUsername(record.value)) {
    return {
      username: normalizePendingUsername(record.value),
      requestedAt: typeof record.timestamp === 'number' ? String(record.timestamp) : undefined,
    };
  }
  if (typeof record.href === 'string') {
    const username = usernameFromHref(record.href);
    if (username) {
      return {
        username,
        requestedAt: typeof record.timestamp === 'number' ? String(record.timestamp) : undefined,
      };
    }
  }
  return null;
}

function collectFromUnknown(value: unknown, bucket: PendingRequestUser[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectFromUnknown(item, bucket);
    }
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }

  const record = value as Record<string, unknown>;
  const list = record.string_list_data;
  if (Array.isArray(list)) {
    const title = typeof record.title === 'string' ? record.title : '';
    for (const entry of list) {
      const parsed = usernameFromJsonEntry(entry);
      if (parsed) {
        bucket.push({
          username: parsed.username,
          fullName: title && !isPendingUsername(title) ? title : parsed.username,
          requestedAt: parsed.requestedAt,
        });
      }
    }
  }

  for (const nested of Object.values(record)) {
    if (nested && typeof nested === 'object') {
      collectFromUnknown(nested, bucket);
    }
  }
}

function parseJsonExport(data: unknown): PendingRequestUser[] {
  const users: PendingRequestUser[] = [];
  collectFromUnknown(data, users);
  return users;
}

function parsePlainText(text: string): PendingRequestUser[] {
  return text
    .split(/[\s,;]+/)
    .map(token => normalizePendingUsername(token))
    .filter(isPendingUsername)
    .map(username => ({ username, fullName: username }));
}

export function parsePendingFollowRequests(input: string): PendingRequestUser[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return dedupeUsers(parseJsonExport(JSON.parse(trimmed) as unknown));
    } catch {
      // Fall through to HTML / plain text.
    }
  }

  if (/<table|class="_a6_q"|pending_follow_requests|solicitudes de seguimiento/i.test(trimmed)) {
    return dedupeUsers(parseHtmlExport(trimmed));
  }

  return dedupeUsers(parsePlainText(trimmed));
}
