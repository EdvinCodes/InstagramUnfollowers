export type PendingTab = 'open' | 'done';

export type PendingPhase = 'setup' | 'list' | 'running';

export type PendingLogKind = 'success' | 'skip' | 'fail';

export interface PendingRequestUser {
  readonly username: string;
  readonly fullName: string;
  readonly requestedAt?: string;
}

export interface PendingLogFilter {
  readonly showSucceeded: boolean;
  readonly showSkipped: boolean;
  readonly showFailed: boolean;
}

export interface PendingLogEntry {
  readonly kind: PendingLogKind;
  readonly username: string;
  readonly text: string;
}

export interface ImportedPendingList {
  readonly users: readonly PendingRequestUser[];
  readonly importedAt: number;
  readonly sourceName: string;
}
