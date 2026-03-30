import { UserNode } from '../model/user';

export interface GhostAnalysis {
  score: number;
  level: 'safe' | 'suspicious' | 'ghost' | 'bot';
  reasons: string[];
}

const BOT_NAME_PATTERNS = [/\d{4,}/, /^[a-z]+\d{5,}$/, /[._]{2,}/, /^user\d+/i];

export function calculateGhostScore(user: UserNode): GhostAnalysis {
  let score = 0;
  const reasons: string[] = [];

  // 1. Sin foto de perfil (+30 puntos)
  if (!user.profile_pic_url || user.profile_pic_url.includes('default')) {
    score += 30;
    reasons.push('Sin foto de perfil');
  }

  // 2. Username con patrón de bot (+20 puntos)
  if (BOT_NAME_PATTERNS.some(pattern => pattern.test(user.username))) {
    score += 20;
    reasons.push('Username con patrón de bot');
  }

  // 3. Sin nombre completo (+10 puntos)
  if (!user.full_name || user.full_name.trim() === '') {
    score += 10;
    reasons.push('Sin nombre completo');
  }

  // 4. Cuenta privada (+15 puntos)
  if (user.is_private) {
    score += 15;
    reasons.push('Cuenta privada');
  }

  // 5. Username muy largo o muy corto (+10 puntos)
  if (user.username.length > 20 || user.username.length < 3) {
    score += 10;
    reasons.push('Longitud de username inusual');
  }

  // 6. Verificado = descuento (-20 puntos)
  if (user.is_verified) {
    score = Math.max(0, score - 20);
    reasons.push('Cuenta verificada ✓');
  }

  // Clamp 0-100
  score = Math.min(100, Math.max(0, score));

  // Nivel según score
  let level: GhostAnalysis['level'];
  if (score >= 70) {
    level = 'bot';
  } else if (score >= 45) {
    level = 'ghost';
  } else if (score >= 20) {
    level = 'suspicious';
  } else {
    level = 'safe';
  }

  return { score, level, reasons };
}

export function getGhostLabel(level: GhostAnalysis['level']): string {
  const labels: Record<GhostAnalysis['level'], string> = {
    safe: '✅ Real',
    suspicious: '⚠️ Sospechoso',
    ghost: '👻 Fantasma',
    bot: '🤖 Bot',
  };
  return labels[level];
}

export function getGhostColor(level: GhostAnalysis['level']): string {
  const colors: Record<GhostAnalysis['level'], string> = {
    safe: '#4ade80',
    suspicious: '#fbbf24',
    ghost: '#f87171',
    bot: '#ef4444',
  };
  return colors[level];
}
