import { getCookie } from './utils';

/**
 * Thrown when the logged-in Instagram account changes while a scan or queue
 * runs (account switch in another tab). Mixing two accounts' lists, or acting
 * on the wrong account, is worse than stopping.
 */
export class AccountChangedError extends Error {
  constructor() {
    super('Instagram account changed');
    Object.setPrototypeOf(this, AccountChangedError.prototype);
    this.name = 'AccountChangedError';
  }
}

export function currentViewerId(): string | null {
  return getCookie('ds_user_id');
}

export function assertSameViewer(viewerId: string): void {
  if (currentViewerId() !== viewerId) {
    throw new AccountChangedError();
  }
}

export function isAccountChangedError(error: unknown): error is AccountChangedError {
  return error instanceof AccountChangedError;
}
