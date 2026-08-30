type HubLocale =
  | 'en'
  | 'pt-BR'
  | 'es'
  | 'fr'
  | 'it'
  | 'de'
  | 'tr'
  | 'hi'
  | 'id'
  | 'ar'
  | 'ja'
  | 'ko'
  | 'ru'
  | 'pl'
  | 'nl'
  | 'vi';

export interface HubTranslationSlice {
  hubEyebrow: string;
  hubTitle: string;
  hubSubtitle: string;
  hubAnalyze: string;
  hubAnalyzeDesc: string;
  hubClean: string;
  hubCleanDesc: string;
  hubGrow: string;
  hubGrowDesc: string;
  hubHistory: string;
  hubHistoryDesc: string;
  hubMetaSaved: (following: number, followers: number) => string;
  hubPendingSaved: (n: number) => string;
  hubListsSaved: (n: number) => string;
  hubHistorySaved: (n: number) => string;
  hubOpenHistory: string;
  hubScanLive: string;
  hubGrowCta: string;
}

const en: HubTranslationSlice = {
  hubEyebrow: 'Suite',
  hubTitle: 'Manage your community',
  hubSubtitle: 'Analyze, clean, grow and review — locally, without giving Instagram a password.',
  hubAnalyze: 'Analyze',
  hubAnalyzeDesc: 'See who does not follow you back. Live scan or a Meta export with zero requests.',
  hubClean: 'Clean',
  hubCleanDesc: 'Cancel outgoing requests and review unfollowed, blocked and recent lists.',
  hubGrow: 'Grow',
  hubGrowDesc: 'Follow commenters in a niche, slowly, with the same safe queue as unfollow.',
  hubHistory: 'History',
  hubHistoryDesc: 'Unfollows, detections and whitelist changes on this account.',
  hubMetaSaved: (following, followers) => `${following} following · ${followers} followers saved`,
  hubPendingSaved: n => `${n} pending left`,
  hubListsSaved: n => `${n} on saved lists`,
  hubHistorySaved: n => `${n} events`,
  hubOpenHistory: 'Open timeline',
  hubScanLive: 'Scan live',
  hubGrowCta: 'Open Growth',
};

const es: HubTranslationSlice = {
  ...en,
  hubEyebrow: 'Suite',
  hubTitle: 'Gestiona tu comunidad',
  hubSubtitle: 'Analiza, limpia, crece y revisa — en local, sin dar la contraseña a Instagram.',
  hubAnalyze: 'Analizar',
  hubAnalyzeDesc: 'Quién no te sigue. Escaneo en vivo o export de Meta, sin peticiones.',
  hubClean: 'Limpiar',
  hubCleanDesc: 'Cancela solicitudes enviadas y revisa unfollowed, bloqueados y recientes.',
  hubGrow: 'Crecer',
  hubGrowDesc: 'Sigue a comentaristas de un nicho, despacio, con la misma cola segura.',
  hubHistory: 'Historial',
  hubHistoryDesc: 'Unfollows, detecciones y cambios de whitelist en esta cuenta.',
  hubMetaSaved: (following, followers) => `${following} following · ${followers} followers guardados`,
  hubPendingSaved: n => `${n} pendientes abiertas`,
  hubListsSaved: n => `${n} en listas guardadas`,
  hubHistorySaved: n => `${n} eventos`,
  hubOpenHistory: 'Abrir línea de tiempo',
  hubScanLive: 'Escanear en vivo',
  hubGrowCta: 'Abrir Crecer',
};

export const HUB_STRINGS: Record<HubLocale, HubTranslationSlice> = {
  en,
  es,
  'pt-BR': { ...en, hubTitle: 'Gerencie sua comunidade', hubAnalyze: 'Analisar', hubClean: 'Limpar', hubGrow: 'Crescer', hubHistory: 'Histórico' },
  fr: { ...en, hubTitle: 'Gérez votre communauté', hubAnalyze: 'Analyser', hubClean: 'Nettoyer', hubGrow: 'Croître', hubHistory: 'Historique' },
  it: { ...en, hubTitle: 'Gestisci la community', hubAnalyze: 'Analizza', hubClean: 'Pulisci', hubGrow: 'Cresci', hubHistory: 'Cronologia' },
  de: { ...en, hubTitle: 'Community verwalten', hubAnalyze: 'Analysieren', hubClean: 'Bereinigen', hubGrow: 'Wachsen', hubHistory: 'Verlauf' },
  tr: { ...en, hubTitle: 'Topluluğunu yönet', hubAnalyze: 'Analiz', hubClean: 'Temizle', hubGrow: 'Büyü', hubHistory: 'Geçmiş' },
  hi: { ...en, hubTitle: 'कम्युनिटी मैनेज करें', hubAnalyze: 'विश्लेषण', hubClean: 'साफ़ करें', hubGrow: 'बढ़ाएँ', hubHistory: 'इतिहास' },
  id: { ...en, hubTitle: 'Kelola komunitas', hubAnalyze: 'Analisis', hubClean: 'Bersihkan', hubGrow: 'Tumbuh', hubHistory: 'Riwayat' },
  ar: { ...en, hubTitle: 'أدِر مجتمعك', hubAnalyze: 'تحليل', hubClean: 'تنظيف', hubGrow: 'نمو', hubHistory: 'السجل' },
  ja: { ...en, hubTitle: 'コミュニティを管理', hubAnalyze: '分析', hubClean: '整理', hubGrow: '成長', hubHistory: '履歴' },
  ko: { ...en, hubTitle: '커뮤니티 관리', hubAnalyze: '분석', hubClean: '정리', hubGrow: '성장', hubHistory: '기록' },
  ru: { ...en, hubTitle: 'Управляйте сообществом', hubAnalyze: 'Анализ', hubClean: 'Очистка', hubGrow: 'Рост', hubHistory: 'История' },
  pl: { ...en, hubTitle: 'Zarządzaj społecznością', hubAnalyze: 'Analizuj', hubClean: 'Czyść', hubGrow: 'Rozwój', hubHistory: 'Historia' },
  nl: { ...en, hubTitle: 'Beheer je community', hubAnalyze: 'Analyseren', hubClean: 'Opschonen', hubGrow: 'Groeien', hubHistory: 'Geschiedenis' },
  vi: { ...en, hubTitle: 'Quản lý cộng đồng', hubAnalyze: 'Phân tích', hubClean: 'Dọn dẹp', hubGrow: 'Tăng trưởng', hubHistory: 'Lịch sử' },
};
