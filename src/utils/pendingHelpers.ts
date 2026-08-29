import { UNFOLLOWERS_PER_PAGE } from '../constants/constants';
import type { PendingRequestUser } from '../model/pending-request';
import { Timings } from '../model/timings';
import { Typename, UserNode } from '../model/user';

export function estimateCancelDurationMs(count: number, timings: Timings): number {
  if (count <= 1) {
    return 0;
  }

  let total = 0;
  for (let i = 1; i < count; i++) {
    if (i % 5 === 0) {
      total += timings.timeToWaitAfterFiveUnfollows;
    } else {
      total += timings.timeBetweenUnfollows;
    }
  }
  return total;
}

export function formatDurationParts(ms: number): { days: number; hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  return {
    days: Math.floor(totalMinutes / (60 * 24)),
    hours: Math.floor((totalMinutes % (60 * 24)) / 60),
    minutes: totalMinutes % 60,
  };
}

export function filterPendingUsers(
  users: readonly PendingRequestUser[],
  cancelled: ReadonlySet<string>,
  tab: 'open' | 'done',
  searchTerm: string,
): PendingRequestUser[] {
  const query = searchTerm.trim().toLowerCase();
  return users
    .filter(user => {
      const isDone = cancelled.has(user.username);
      if (tab === 'open' && isDone) {
        return false;
      }
      if (tab === 'done' && !isDone) {
        return false;
      }
      if (!query) {
        return true;
      }
      return user.username.includes(query) || user.fullName.toLowerCase().includes(query);
    })
    .sort((a, b) => a.username.localeCompare(b.username, undefined, { sensitivity: 'base' }));
}

export function paginatePendingUsers(
  users: readonly PendingRequestUser[],
  page: number,
): { pageUsers: PendingRequestUser[]; safePage: number; maxPage: number } {
  const maxPage = Math.max(1, Math.ceil(users.length / UNFOLLOWERS_PER_PAGE));
  const safePage = !Number.isFinite(page) || page < 1 ? 1 : Math.min(page, maxPage);
  const start = UNFOLLOWERS_PER_PAGE * (safePage - 1);
  return {
    pageUsers: users.slice(start, start + UNFOLLOWERS_PER_PAGE),
    safePage,
    maxPage,
  };
}

export function toPendingHistoryUser(username: string, id: string, fullName: string): UserNode {
  return {
    id,
    username,
    full_name: fullName,
    profile_pic_url: '',
    is_private: true,
    is_verified: false,
    followed_by_viewer: false,
    follows_viewer: false,
    requested_by_viewer: false,
    reel: {
      id: '',
      expiring_at: 0,
      has_pride_media: false,
      latest_reel_media: 0,
      seen: null,
      owner: {
        __typename: Typename.GraphUser,
        id,
        profile_pic_url: '',
        username,
      },
    },
  };
}
