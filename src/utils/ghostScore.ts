import { getTranslations } from '../i18n/i18n';
import { UserNode } from '../model/user';
import { assertUnreachable, isProfilePicAnonymous } from './utils';

function labels(t: any) {
  return typeof t === 'function' ? getTranslations() : t;
}

export type GhostLevel = 'safe' | 'suspicious' | 'ghost' | 'bot';

const SCORE_BOT = 65;
const SCORE_GHOST = 45;
const SCORE_SUSPICIOUS = 25;

export interface GhostAnalysis {
  level: GhostLevel;
  score: number;
  reasons: string[];
}

export const calculateGhostScore = (user: UserNode, t: any): GhostAnalysis => {
  const copy = labels(t);
  let score = 0;
  const reasons: string[] = [];
  const usernameL = user.username.toLowerCase();

  const picUnknown = !user.profile_pic_url && !user.has_anonymous_profile_picture;

  // Sin foto de perfil (URL vacía sin flag = export Meta, no es anónima)
  if (
    !picUnknown &&
    (user.has_anonymous_profile_picture || isProfilePicAnonymous(user.profile_pic_url))
  ) {
    score += 15;
    reasons.push(copy.reasonNoPic);
  }

  // Secuencia numérica larga
  if (/\d{6,}/.test(user.username)) {
    score += 20;
    reasons.push(copy.reasonLongNums);
  }

  // Patrón letras+números tipo bot
  if (/^[a-z]{2,6}\d{4,}$/.test(usernameL)) {
    score += 25;
    reasons.push(copy.reasonBotPattern);
  }

  // Keyboard mashing — filas del teclado QWERTY
  const keyboardRows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const hasKeyboardMash = keyboardRows.some(row =>
    Array.from({ length: row.length - 3 }, (_, i) => row.slice(i, i + 4)).some(seq =>
      usernameL.includes(seq),
    ),
  );
  if (hasKeyboardMash) {
    score += 25;
    reasons.push(copy.reasonKeyboard);
  }

  if (!picUnknown) {
    // Sin nombre real
    if (!user.full_name || user.full_name.trim() === '') {
      score += 10;
      reasons.push(copy.reasonNoName);
    }

    // Nombre igual al username
    if (user.full_name && user.full_name.trim().toLowerCase() === usernameL) {
      score += 10;
      reasons.push(copy.reasonSameName);
    }
  }

  let level: GhostLevel = 'safe';
  if (score >= SCORE_BOT) {
    level = 'bot';
  } else if (score >= SCORE_GHOST) {
    level = 'ghost';
  } else if (score >= SCORE_SUSPICIOUS) {
    level = 'suspicious';
  }

  return { level, score, reasons };
};

export const getGhostLabel = (level: GhostLevel, t: any): string => {
  const copy = labels(t);
  switch (level) {
    case 'bot':
      return copy.lblBot;
    case 'ghost':
      return copy.lblInact;
    case 'suspicious':
      return copy.lblRisk;
    case 'safe':
      return '';
    default:
      return assertUnreachable(level);
  }
};

export const getGhostColor = (level: GhostLevel): string => {
  switch (level) {
    case 'bot':
      return '#ef4444';
    case 'ghost':
      return '#f97316';
    case 'suspicious':
      return '#f59e0b';
    case 'safe':
      return '#6b7280';
    default:
      return assertUnreachable(level);
  }
};
