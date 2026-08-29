export interface MetaExportUser {
  readonly username: string;
  readonly fullName: string;
}

const USERNAME_RE = /^[a-zA-Z0-9._]{1,30}$/;

const RESERVED_PATHS = new Set([
  'about',
  'accounts',
  'direct',
  'emails',
  'explore',
  'legal',
  'p',
  'privacy',
  'reel',
  'reels',
  'stories',
  'www',
]);

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

const LINK_RE = /instagram\.com\/(?:_u\/)?([a-zA-Z0-9._]+)/gi;
const H2_RE = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;

export function normalizeMetaUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function isMetaUsername(value: string): boolean {
  const normalized = normalizeMetaUsername(value);
  return USERNAME_RE.test(normalized) && !RESERVED_PATHS.has(normalized);
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
  const match = href.match(/instagram\.com\/(?:_u\/)?([a-zA-Z0-9._]+)/i);
  if (!match) {
    return null;
  }
  const username = normalizeMetaUsername(match[1]);
  return isMetaUsername(username) ? username : null;
}

export function dedupeMetaUsers(users: readonly MetaExportUser[]): MetaExportUser[] {
  const seen = new Set<string>();
  const result: MetaExportUser[] = [];
  for (const user of users) {
    const username = normalizeMetaUsername(user.username);
    if (!isMetaUsername(username) || seen.has(username)) {
      continue;
    }
    seen.add(username);
    result.push({
      username,
      fullName: user.fullName.trim() || username,
    });
  }
  return result;
}

function parseHtmlTables(html: string): MetaExportUser[] {
  const users: MetaExportUser[] = [];
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];

  for (const table of tables) {
    let fullName = '';
    let username = '';
    ROW_RE.lastIndex = 0;
    let row = ROW_RE.exec(table);
    while (row) {
      const label = decodeHtml(row[1]).toLowerCase();
      const value = decodeHtml(row[2]);
      if (USERNAME_LABELS.has(label) && isMetaUsername(value)) {
        username = normalizeMetaUsername(value);
      } else if (NAME_LABELS.has(label)) {
        fullName = value;
      }
      row = ROW_RE.exec(table);
    }
    if (username) {
      users.push({ username, fullName: fullName || username });
    }
  }

  return users;
}

function parseHtmlLinksAndHeadings(html: string): MetaExportUser[] {
  const users: MetaExportUser[] = [];
  LINK_RE.lastIndex = 0;
  let link = LINK_RE.exec(html);
  while (link) {
    const username = normalizeMetaUsername(link[1]);
    if (isMetaUsername(username)) {
      users.push({ username, fullName: username });
    }
    link = LINK_RE.exec(html);
  }

  H2_RE.lastIndex = 0;
  let heading = H2_RE.exec(html);
  while (heading) {
    const username = normalizeMetaUsername(decodeHtml(heading[1]));
    if (isMetaUsername(username)) {
      users.push({ username, fullName: username });
    }
    heading = H2_RE.exec(html);
  }

  return users;
}

function usernameFromJsonEntry(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  if (typeof record.value === 'string' && isMetaUsername(record.value)) {
    return normalizeMetaUsername(record.value);
  }
  if (typeof record.href === 'string') {
    return usernameFromHref(record.href);
  }
  return null;
}

function collectFromUnknown(value: unknown, bucket: MetaExportUser[]): void {
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
      const username = usernameFromJsonEntry(entry);
      if (username) {
        bucket.push({
          username,
          fullName: title && !isMetaUsername(title) ? title : username,
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

function parsePlainText(text: string): MetaExportUser[] {
  return text
    .split(/[\s,;]+/)
    .map(token => normalizeMetaUsername(token))
    .filter(isMetaUsername)
    .map(username => ({ username, fullName: username }));
}

export function parseMetaUserList(input: string): MetaExportUser[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const users: MetaExportUser[] = [];
      collectFromUnknown(JSON.parse(trimmed) as unknown, users);
      return dedupeMetaUsers(users);
    } catch {
      // Fall through.
    }
  }

  if (/<html|<table|instagram\.com|_a6_q|<h2/i.test(trimmed)) {
    return dedupeMetaUsers([...parseHtmlTables(trimmed), ...parseHtmlLinksAndHeadings(trimmed)]);
  }

  return dedupeMetaUsers(parsePlainText(trimmed));
}

export type MetaConnectionsKind = 'following' | 'followers' | 'other';

export function classifyMetaConnectionsFile(fileName: string, text: string): MetaConnectionsKind {
  const name = fileName.toLowerCase().replace(/\\/g, '/');
  const base = name.split('/').pop() ?? name;
  if (base.includes('pending') || base.includes('blocked') || base.includes('unfollowed')) {
    return 'other';
  }
  if (/^following\.(html|json)$/.test(base) || (base.includes('following') && !base.includes('followers'))) {
    return 'following';
  }
  if (base.includes('followers')) {
    return 'followers';
  }

  const title = `${text.match(/<title>([^<]+)<\/title>/i)?.[1] ?? ''} ${
    text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ''
  }`.toLowerCase();
  if (/siguiendo|following|comptes suivis|seguidos/.test(title) && !/seguidores|followers/.test(title)) {
    return 'following';
  }
  if (/seguidores|followers/.test(title)) {
    return 'followers';
  }
  return 'other';
}
