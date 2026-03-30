import { UserNode } from '../model/user';

export type GhostLevel = 'safe' | 'suspicious' | 'ghost' | 'bot';

export interface GhostAnalysis {
  level: GhostLevel;
  score: number;
  reasons: string[];
}

export const calculateGhostScore = (user: UserNode): GhostAnalysis => {
  let score = 0;
  const reasons: string[] = [];
  const usernameL = user.username.toLowerCase();

  // Sin foto de perfil
  if (!user.profile_pic_url || user.profile_pic_url.includes('default')) {
    score += 15;
    reasons.push('No profile picture');
  }

  // Secuencia numérica larga
  if (/\d{6,}/.test(user.username)) {
    score += 20;
    reasons.push('Long numeric sequence in username');
  }

  // Patrón letras+números tipo bot
  if (/^[a-z]{2,6}\d{4,}$/.test(usernameL)) {
    score += 25;
    reasons.push('Bot-like username pattern');
  }

  // Keyboard mashing — filas del teclado QWERTY
  const keyboardRows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  let keyboardHit = false;
  for (const row of keyboardRows) {
    for (let i = 0; i <= row.length - 4; i++) {
      if (usernameL.includes(row.slice(i, i + 4))) {
        keyboardHit = true;
        break;
      }
    }
    if (keyboardHit) {
      break;
    }
  }
  if (keyboardHit) {
    score += 25;
    reasons.push('Keyboard mashing pattern');
  }

  // Sin nombre real
  if (!user.full_name || user.full_name.trim() === '') {
    score += 10;
    reasons.push('No display name');
  }

  // Nombre igual al username
  if (user.full_name && user.full_name.trim().toLowerCase() === usernameL) {
    score += 10;
    reasons.push('Display name same as username');
  }

  let level: GhostLevel = 'safe';
  if (score >= 65) {
    level = 'bot';
  } else if (score >= 45) {
    level = 'ghost';
  } else if (score >= 25) {
    level = 'suspicious';
  }

  return { level, score, reasons };
};

export const getGhostLabel = (level: GhostLevel): string => {
  switch (level) {
    case 'bot':
      return 'BOT';
    case 'ghost':
      return 'INACT';
    case 'suspicious':
      return 'RISK';
    default:
      return '';
  }
};

export const getGhostColor = (level: GhostLevel): string => {
  switch (level) {
    case 'bot':
      return '#ef4444';
    case 'ghost':
      return '#f87171';
    case 'suspicious':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
};
