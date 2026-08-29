import type {
  PendingLogEntry,
  PendingLogFilter,
  PendingPhase,
  PendingRequestUser,
  PendingTab,
} from './pending-request';

export interface PendingRequestsState {
  readonly status: 'pending_requests';
  readonly phase: PendingPhase;
  readonly users: readonly PendingRequestUser[];
  readonly selectedUsernames: readonly string[];
  readonly searchTerm: string;
  readonly page: number;
  readonly tab: PendingTab;
  readonly isRunning: boolean;
  readonly isPaused: boolean;
  readonly logs: readonly PendingLogEntry[];
  readonly logFilter: PendingLogFilter;
  readonly queueTotal: number;
  readonly statusMessage: string;
  readonly percentage: number;
  readonly processedCount: number;
  readonly cancelledCount: number;
  readonly skippedCount: number;
  readonly failedCount: number;
  readonly sourceName: string;
}

export function createInitialPendingState(): PendingRequestsState {
  return {
    status: 'pending_requests',
    phase: 'setup',
    users: [],
    selectedUsernames: [],
    searchTerm: '',
    page: 1,
    tab: 'open',
    isRunning: false,
    isPaused: false,
    logs: [],
    logFilter: {
      showSucceeded: true,
      showSkipped: true,
      showFailed: true,
    },
    queueTotal: 0,
    statusMessage: '',
    percentage: 0,
    processedCount: 0,
    cancelledCount: 0,
    skippedCount: 0,
    failedCount: 0,
    sourceName: '',
  };
}
