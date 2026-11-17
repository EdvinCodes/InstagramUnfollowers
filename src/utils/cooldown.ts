import { getDynamicStorageKey } from './utils';

/**
 * After Instagram blocks an action or keeps refusing a scan, nothing new may
 * start until this cooldown ends. It survives reloads, so pasting the script
 * again does not walk straight back into the block. Scoped per account.
 */
const COOLDOWN_STORAGE_KEY = 'ig_unfollower_blocked_until';
export const BLOCK_COOLDOWN_MS = 10 * 60 * 1000;

const listeners = new Set<() => void>();

export function subscribeCooldown(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  listeners.forEach(listener => listener());
}

export function getCooldownUntil(storage: Storage = localStorage): number {
  try {
    const value = Number(storage.getItem(getDynamicStorageKey(COOLDOWN_STORAGE_KEY)));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** Starts (or extends) the cooldown. Never shortens one that ends later. */
export function startCooldown(durationMs = BLOCK_COOLDOWN_MS, now = Date.now(), storage: Storage = localStorage): number {
  const until = Math.max(getCooldownUntil(storage), now + durationMs);
  try {
    storage.setItem(getDynamicStorageKey(COOLDOWN_STORAGE_KEY), String(until));
  } catch {
    // Storage unavailable: the block still stops the current run.
  }
  notify();
  return until;
}

export function clearCooldown(storage: Storage = localStorage): void {
  try {
    storage.removeItem(getDynamicStorageKey(COOLDOWN_STORAGE_KEY));
  } catch {
    // Nothing to clear.
  }
  notify();
}

export function cooldownSecondsLeft(now = Date.now(), storage: Storage = localStorage): number {
  return Math.max(0, Math.ceil((getCooldownUntil(storage) - now) / 1000));
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** "m:ss", or "h:mm:ss" from one hour up. */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(rest)}` : `${minutes}:${pad2(rest)}`;
}
