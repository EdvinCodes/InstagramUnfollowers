/**
 * 4B — Cloud Sync PRO
 * Uses the Supabase REST API directly (no SDK) to keep bundle size minimal.
 * The device-id + ig-user-id pair acts as the row-level identifier.
 *
 * Required .env vars:
 *   REACT_APP_SUPABASE_URL   = https://xxxx.supabase.co
 *   REACT_APP_SUPABASE_ANON  = eyJ...
 *
 * Required Supabase tables (run once):
 * create table ig_history (
 *   user_id        text not null,
 *   event_id       text not null,
 *   timestamp      bigint not null,
 *   type           text not null,
 *   ig_username    text not null,
 *   ig_user_id     text not null,
 *   profile_pic_url text not null default '',
 *   full_name      text not null default '',
 *   primary key (user_id, event_id)
 * );
 * alter table ig_history enable row level security;
 * create policy "anon_own_rows" on ig_history
 *   using (true) with check (true);  -- tighten to JWT sub in production
 *
 * create table ig_whitelist (
 *   user_id         text not null,
 *   ig_user_id      text not null,
 *   ig_username     text not null,
 *   profile_pic_url text not null default '',
 *   full_name       text not null default '',
 *   primary key (user_id, ig_user_id)
 * );
 * alter table ig_whitelist enable row level security;
 * create policy "anon_own_rows" on ig_whitelist
 *   using (true) with check (true);
 */
import { HistoryEvent } from '../model/history';
import { UserNode } from '../model/user';
import { getCookie } from '../utils/utils';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL ?? '';
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON ?? '';
const LAST_SYNC_KEY = 'ig-last-cloud-sync';
const DEVICE_ID_KEY = 'ig-device-id';

// Helpers

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getCompositeUserId(): string {
  const igId = getCookie('ds_user_id') ?? 'anon';
  return `${getDeviceId()}_${igId}`;
}

async function req(method: string, table: string, body?: unknown, qs?: string): Promise<Response> {
  const url = `${SUPABASE_URL}/rest/v1/${table}${qs ? `?${qs}` : ''}`;
  return fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      ...(method === 'POST' ? { Prefer: 'resolution=merge-duplicates' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// Public API

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export const CloudSync = {
  isConfigured(): boolean {
    // BYPASS TEMPORAL: Supabase no configurado aún
    return false;
    // return Boolean(SUPABASE_URL && SUPABASE_ANON);
  },

  getLastSyncTs(): number | null {
    try {
      const v = localStorage.getItem(LAST_SYNC_KEY);
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  },

  // Push

  async pushHistory(events: readonly HistoryEvent[]): Promise<boolean> {
    if (!this.isConfigured() || events.length === 0) {
      return true;
    }
    const uid = getCompositeUserId();
    const rows = events.map(e => ({
      user_id: uid,
      event_id: e.id,
      timestamp: e.timestamp,
      type: e.type,
      ig_username: e.user.username,
      ig_user_id: e.user.id,
      profile_pic_url: e.user.profile_pic_url,
      full_name: e.user.full_name,
    }));
    try {
      const r = await req('POST', 'ig_history', rows);
      return r.ok;
    } catch {
      return false;
    }
  },

  async pushWhitelist(users: readonly UserNode[]): Promise<boolean> {
    if (!this.isConfigured()) {
      return true;
    }
    const uid = getCompositeUserId();
    // Replace strategy: delete then insert
    try {
      await req('DELETE', 'ig_whitelist', undefined, `user_id=eq.${uid}`);
      if (users.length === 0) {
        return true;
      }
      const rows = users.map(u => ({
        user_id: uid,
        ig_user_id: u.id,
        ig_username: u.username,
        profile_pic_url: u.profile_pic_url,
        full_name: u.full_name,
      }));
      const r = await req('POST', 'ig_whitelist', rows);
      return r.ok;
    } catch {
      return false;
    }
  },

  // Pull

  async pullHistory(): Promise<HistoryEvent[] | null> {
    if (!this.isConfigured()) {
      return null;
    }
    const uid = getCompositeUserId();
    try {
      const r = await req(
        'GET',
        'ig_history',
        undefined,
        `user_id=eq.${uid}&order=timestamp.desc&limit=1000`,
      );
      if (!r.ok) {
        return null;
      }
      const rows = (await r.json()) as Array<{
        event_id: string;
        timestamp: number;
        type: string;
        ig_username: string;
        ig_user_id: string;
        profile_pic_url: string;
        full_name: string;
      }>;
      return rows.map(row => ({
        id: row.event_id,
        timestamp: row.timestamp,
        type: row.type as HistoryEvent['type'],
        user: {
          id: row.ig_user_id,
          username: row.ig_username,
          profile_pic_url: row.profile_pic_url,
          full_name: row.full_name,
        } as UserNode,
      }));
    } catch {
      return null;
    }
  },

  async pullWhitelist(): Promise<UserNode[] | null> {
    if (!this.isConfigured()) {
      return null;
    }
    const uid = getCompositeUserId();
    try {
      const r = await req('GET', 'ig_whitelist', undefined, `user_id=eq.${uid}`);
      if (!r.ok) {
        return null;
      }
      const rows = (await r.json()) as Array<{
        ig_user_id: string;
        ig_username: string;
        profile_pic_url: string;
        full_name: string;
      }>;
      return rows.map(
        row =>
          ({
            id: row.ig_user_id,
            username: row.ig_username,
            profile_pic_url: row.profile_pic_url,
            full_name: row.full_name,
          }) as UserNode,
      );
    } catch {
      return null;
    }
  },

  // Full bidirectional sync

  async sync(history: readonly HistoryEvent[], whitelist: readonly UserNode[]): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }
    try {
      const [hOk, wOk] = await Promise.all([
        this.pushHistory(history),
        this.pushWhitelist(whitelist),
      ]);
      if (hOk && wOk) {
        localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
};
