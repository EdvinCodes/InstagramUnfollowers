/**
 * Followers downloaded by a scan Instagram interrupted, plus the cursor of the
 * next page. On long lists Instagram soft-blocks the walk after a few thousand
 * followers; with this the next run continues instead of starting over.
 *
 * Kept briefly: a resumed walk does not revisit pages it already read, so a
 * follower gained in between could be missed.
 */
const CHECKPOINT_KEY_PREFIX = 'ig_unfollower_followers_checkpoint_';
export const FOLLOWERS_CHECKPOINT_TTL_MS = 2 * 60 * 60 * 1000;
// Instagram shares this origin's storage; never take a large share of it.
const MAX_CHECKPOINT_CHARS = 3_000_000;

export interface FollowersCheckpoint {
  readonly version: 1;
  readonly accountId: string;
  readonly ids: readonly string[];
  readonly usernames: readonly string[];
  readonly cursor: string;
  readonly timestamp: number;
}

function keyFor(accountId: string): string {
  return `${CHECKPOINT_KEY_PREFIX}${accountId}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function isValidCheckpoint(value: unknown, accountId: string, now: number): value is FollowersCheckpoint {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === 1 &&
    candidate.accountId === accountId &&
    isStringArray(candidate.ids) &&
    isStringArray(candidate.usernames) &&
    typeof candidate.cursor === 'string' &&
    candidate.cursor !== '' &&
    typeof candidate.timestamp === 'number' &&
    now - candidate.timestamp >= 0 &&
    now - candidate.timestamp < FOLLOWERS_CHECKPOINT_TTL_MS
  );
}

export function saveFollowersCheckpoint(checkpoint: FollowersCheckpoint, storage: Storage = localStorage): boolean {
  try {
    const serialized = JSON.stringify(checkpoint);
    if (serialized.length > MAX_CHECKPOINT_CHARS) {
      console.warn(`Followers checkpoint not saved: ${serialized.length} characters is too large.`);
      return false;
    }
    storage.setItem(keyFor(checkpoint.accountId), serialized);
    return true;
  } catch (error) {
    console.warn('Could not save the followers checkpoint', error);
    return false;
  }
}

export function clearFollowersCheckpoint(accountId: string, storage: Storage = localStorage): void {
  try {
    storage.removeItem(keyFor(accountId));
  } catch {
    // Nothing to clear.
  }
}

/** The account's checkpoint if it is still fresh. A stale or broken one is removed. */
export function loadFollowersCheckpoint(
  accountId: string,
  now = Date.now(),
  storage: Storage = localStorage,
): FollowersCheckpoint | null {
  try {
    const raw = storage.getItem(keyFor(accountId));
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (isValidCheckpoint(parsed, accountId, now)) {
      return parsed;
    }
  } catch {
    // Fall through and drop it.
  }
  clearFollowersCheckpoint(accountId, storage);
  return null;
}

export function checkpointFollowerCount(checkpoint: FollowersCheckpoint): number {
  return checkpoint.usernames.length;
}
