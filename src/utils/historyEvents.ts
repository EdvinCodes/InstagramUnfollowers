import { HistoryEvent } from '../model/history';

export type HistoryFilter = 'all' | 'detected' | 'cleaned' | 'cancelled';

export function historyDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function cancelledCountOf(event: HistoryEvent): number {
  if (event.type !== 'REQUEST_CANCELLED') {
    return 0;
  }
  return Math.max(1, event.count ?? 1);
}

export function isCancelledSummary(event: HistoryEvent): boolean {
  return event.type === 'REQUEST_CANCELLED' && !event.user?.username;
}

export function totalCancelled(events: readonly HistoryEvent[]): number {
  return events.reduce((sum, event) => sum + cancelledCountOf(event), 0);
}

export function matchesHistoryFilter(event: HistoryEvent, filter: HistoryFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'detected':
      return event.type === 'DETECTED_UNFOLLOWER';
    case 'cleaned':
      return event.type === 'YOU_UNFOLLOWED' || event.type === 'SOFT_BLOCKED';
    case 'cancelled':
      return event.type === 'REQUEST_CANCELLED';
    default:
      return true;
  }
}

export function compactCancelledEvents(events: readonly HistoryEvent[]): HistoryEvent[] {
  const cancelledByDay = new Map<string, HistoryEvent[]>();
  const others: HistoryEvent[] = [];

  for (const event of events) {
    if (event.type === 'REQUEST_CANCELLED') {
      const key = historyDayKey(event.timestamp);
      const bucket = cancelledByDay.get(key) ?? [];
      bucket.push(event);
      cancelledByDay.set(key, bucket);
    } else {
      others.push(event);
    }
  }

  const summaries: HistoryEvent[] = [];
  for (const bucket of Array.from(cancelledByDay.values())) {
    const latest = bucket.reduce((best: HistoryEvent, event: HistoryEvent) =>
      event.timestamp >= best.timestamp ? event : best,
    );
    summaries.push({
      ...latest,
      count: bucket.reduce((sum: number, event: HistoryEvent) => sum + cancelledCountOf(event), 0),
      user: {
        ...latest.user,
        id: `request_cancelled_${historyDayKey(latest.timestamp)}`,
        username: '',
        full_name: '',
        profile_pic_url: '',
      },
    });
  }

  return [...others, ...summaries].sort((a, b) => b.timestamp - a.timestamp);
}

export function mergeCancelledIntoHistory(
  events: readonly HistoryEvent[],
  incoming: HistoryEvent,
): HistoryEvent[] {
  if (incoming.type !== 'REQUEST_CANCELLED') {
    return [incoming, ...events];
  }

  const day = historyDayKey(incoming.timestamp);
  let merged = false;
  const next = events.map(event => {
    if (event.type !== 'REQUEST_CANCELLED' || historyDayKey(event.timestamp) !== day) {
      return event;
    }
    merged = true;
    return {
      ...event,
      timestamp: Math.max(event.timestamp, incoming.timestamp),
      count: cancelledCountOf(event) + cancelledCountOf(incoming),
      user: {
        ...event.user,
        username: '',
        full_name: '',
        profile_pic_url: '',
      },
    };
  });

  if (merged) {
    return next.sort((a, b) => b.timestamp - a.timestamp);
  }

  return compactCancelledEvents([incoming, ...events]);
}

