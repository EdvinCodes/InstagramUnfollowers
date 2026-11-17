/**
 * Every request this tool sends to instagram.com goes through here, so it
 * carries the same headers as Instagram's own web client. Since ~21 Oct 2026
 * Instagram answers API calls without them with its HTML page (HTTP 200)
 * instead of JSON — that is what broke scans with "Unexpected token '<'".
 */
import { getCookie } from './utils';

export const IG_WEB_APP_ID = '936619743392459';

// Instagram's web client moved X-ASBD-ID from 129477 to 359341 in Oct 2026.
// With the old value the friendships endpoints answer with the HTML page. If
// that happens again, copy the X-ASBD-ID header from Instagram's own followers
// request (DevTools → Network) into this constant.
export const IG_ASBD_ID = '359341';

// Instagram keeps this claim in sessionStorage and refreshes it through the
// X-IG-Set-WWW-Claim response header. "0" is accepted until one is known.
const WWW_CLAIM_STORAGE_KEY = 'www-claim-v2';
let wwwClaim: string | null = null;

function readWwwClaim(): string {
  if (wwwClaim === null) {
    try {
      wwwClaim = sessionStorage.getItem(WWW_CLAIM_STORAGE_KEY) || '0';
    } catch {
      wwwClaim = '0';
    }
  }
  return wwwClaim;
}

export function rememberWwwClaim(response: Response): void {
  const claim = response.headers.get('x-ig-set-www-claim');
  if (!claim) {
    return;
  }
  wwwClaim = claim;
  try {
    sessionStorage.setItem(WWW_CLAIM_STORAGE_KEY, claim);
  } catch {
    // The in-memory copy is enough for this page.
  }
}

function randomGroup(): string {
  return `${Math.random().toString(36).slice(2)}000000`.slice(0, 6);
}

// Three base36 groups, generated once per page load like the web client does.
const WEB_SESSION_ID = `${randomGroup()}:${randomGroup()}:${randomGroup()}`;

export function instagramApiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-IG-App-ID': IG_WEB_APP_ID,
    'X-ASBD-ID': IG_ASBD_ID,
    'X-IG-WWW-Claim': readWwwClaim(),
    'X-Web-Session-ID': WEB_SESSION_ID,
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': '*/*',
    ...extra,
  };
  const csrfToken = getCookie('csrftoken');
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }
  return headers;
}

/**
 * Why a request did not return usable JSON.
 * - rate_limited: 429 or "please wait a few minutes"
 * - action_blocked: feedback_required / spam on a write
 * - soft_block: a 2xx HTML page instead of JSON (often a redirect to the home page)
 * - session: logged out, checkpoint or challenge
 */
export type IgFailure =
  | 'rate_limited'
  | 'action_blocked'
  | 'soft_block'
  | 'session'
  | 'not_found'
  | 'network'
  | 'server'
  | 'failed';

/** Failures that usually clear up on their own after a pause. */
export function isRetryableFailure(failure: IgFailure): boolean {
  return failure === 'rate_limited' || failure === 'soft_block' || failure === 'network' || failure === 'server';
}

export interface IgJsonResponse<T> {
  readonly status: number;
  readonly json: T | null;
  readonly failure: IgFailure | null;
  /** Status, content type, redirect and the start of the body, for the console. */
  readonly detail: string;
}

/** JSON object out of an Instagram body, or null for an HTML page / anything else. */
export function parseInstagramJson(text: string, contentType = ''): Record<string, unknown> | null {
  const body = text.replace(/^for \(;;\);/, '').trim();
  if (!body || body.charAt(0) === '<' || /html/i.test(contentType)) {
    return null;
  }
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function jsonMessage(json: Record<string, unknown>): string {
  const parts: unknown[] = [json.message, json.error_type, json.errorSummary, json.errorDescription];
  if (Array.isArray(json.errors)) {
    parts.push(JSON.stringify(json.errors));
  } else if (json.errors !== undefined || json.error !== undefined) {
    parts.push(JSON.stringify(json.errors ?? json.error));
  }
  return parts
    .filter(part => part !== undefined && part !== null)
    .map(part => String(part))
    .join(' ')
    .toLowerCase();
}

export interface InstagramResponseShape {
  readonly status: number;
  readonly contentType: string;
  readonly text: string;
  readonly redirected: boolean;
  readonly finalUrl: string;
}

export function classifyInstagramResponse(response: InstagramResponseShape): {
  json: Record<string, unknown> | null;
  failure: IgFailure | null;
} {
  const json = parseInstagramJson(response.text, response.contentType);
  // Only JSON messages are matched against keywords: Instagram's HTML page
  // embeds words like "challenge" in its scripts.
  const message = json ? jsonMessage(json) : '';
  const redirectedToLogin = response.redirected && /\/accounts\/login|\/challenge/.test(response.finalUrl);

  let failure: IgFailure | null = null;
  if (response.status === 429) {
    failure = 'rate_limited';
  } else if (json?.spam === true || message.includes('feedback_required')) {
    failure = 'action_blocked';
  } else if (/please wait a few minutes|rate limit|too many requests/.test(message)) {
    failure = 'rate_limited';
  } else if (
    response.status === 401 ||
    response.status === 403 ||
    redirectedToLogin ||
    /login_required|checkpoint_required|challenge_required/.test(message)
  ) {
    failure = 'session';
  } else if (response.status === 404) {
    failure = 'not_found';
  } else if (response.status >= 500) {
    failure = 'server';
  } else if (json === null) {
    failure = response.status >= 200 && response.status < 300 ? 'soft_block' : 'failed';
  } else if (response.status < 200 || response.status >= 300 || json.status === 'fail' || json.errors !== undefined) {
    failure = 'failed';
  }
  return { json, failure };
}

interface IgRequestInit {
  readonly method?: 'GET' | 'POST';
  readonly body?: string;
  readonly headers?: Record<string, string>;
}

export async function igFetchJson<T>(url: string, init: IgRequestInit = {}): Promise<IgJsonResponse<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? 'GET',
      credentials: 'include',
      headers: instagramApiHeaders(init.headers),
      body: init.body,
    });
  } catch (error) {
    return { status: 0, json: null, failure: 'network', detail: `${url}: ${String(error)}` };
  }

  rememberWwwClaim(response);
  const text = await response.text().catch(() => '');
  const contentType = response.headers.get('content-type') ?? '';
  const { json, failure } = classifyInstagramResponse({
    status: response.status,
    contentType,
    text,
    redirected: response.redirected,
    finalUrl: response.url,
  });
  const detail = failure
    ? `HTTP ${response.status} (${contentType || 'no content-type'}${
        response.redirected ? `, redirected to ${response.url}` : ''
      }) for ${url}: ${text.slice(0, 160)}`
    : '';
  return { status: response.status, json: json as T | null, failure, detail };
}

// --- Session tokens instagram.com's own write requests carry --------------

export interface WebSessionTokens {
  readonly fbDtsg: string;
  readonly lsd: string;
  readonly revision?: string;
}

let cachedWebSessionTokens: WebSessionTokens | null = null;

export function readWebSessionTokens(html: string): WebSessionTokens | null {
  const fbDtsg =
    /"DTSGInitialData",\[\],\{"token":"([^"]+)"/.exec(html)?.[1] ?? /"dtsg":\{"token":"([^"]+)"/.exec(html)?.[1];
  const lsd = /"LSD",\[\],\{"token":"([^"]+)"/.exec(html)?.[1];
  if (!fbDtsg || !lsd) {
    return null;
  }
  const revision = /"client_revision":(\d+)/.exec(html)?.[1];
  return revision ? { fbDtsg, lsd, revision } : { fbDtsg, lsd };
}

/** Instagram's checksum of fb_dtsg: "2" plus the sum of its char codes. */
export function jazoest(fbDtsg: string): string {
  let sum = 0;
  for (let i = 0; i < fbDtsg.length; i++) {
    sum += fbDtsg.charCodeAt(i);
  }
  return `2${sum}`;
}

interface RequireModule {
  token?: string;
  client_revision?: string | number;
}

function readRequireTokens(): WebSessionTokens | null {
  const req = (window as unknown as { require?: (name: string) => RequireModule | undefined }).require;
  if (typeof req !== 'function') {
    return null;
  }
  try {
    const fbDtsg = req('DTSGInitialData')?.token;
    const lsd = req('LSD')?.token;
    if (!fbDtsg || !lsd) {
      return null;
    }
    const revision = req('SiteData')?.client_revision;
    return revision === undefined || revision === ''
      ? { fbDtsg, lsd }
      : { fbDtsg, lsd, revision: String(revision) };
  } catch {
    return null;
  }
}

/**
 * fb_dtsg / lsd come from the page's module registry while it is loaded
 * (console paste), else from the inline page data (extension content script),
 * else from a fresh copy of instagram.com.
 */
export async function getWebSessionTokens(): Promise<WebSessionTokens | null> {
  if (cachedWebSessionTokens) {
    return cachedWebSessionTokens;
  }
  cachedWebSessionTokens = readRequireTokens() ?? readWebSessionTokens(document.documentElement.innerHTML);
  if (!cachedWebSessionTokens) {
    try {
      const res = await fetch('https://www.instagram.com/', { credentials: 'include' });
      cachedWebSessionTokens = readWebSessionTokens(await res.text());
    } catch (error) {
      console.warn('Could not load Instagram session tokens', error);
    }
  }
  return cachedWebSessionTokens;
}
