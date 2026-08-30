type HistoryLocale =
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

export interface HistoryTranslationSlice {
  historyFilterAll: string;
  historyFilterDetected: string;
  historyFilterCleaned: string;
  historyFilterCancelled: string;
  historyCancelled: string;
  historyCancelledBatch: (n: number) => string;
  historyCancelledHint: string;
}

const en: HistoryTranslationSlice = {
  historyFilterAll: 'All',
  historyFilterDetected: 'Detected',
  historyFilterCleaned: 'Unfollowed',
  historyFilterCancelled: 'Cancelled',
  historyCancelled: 'Cancelled',
  historyCancelledBatch: n => (n === 1 ? '1 request cancelled' : `${n} requests cancelled`),
  historyCancelledHint: 'Full list stays in Clean → Pending',
};

const es: HistoryTranslationSlice = {
  ...en,
  historyFilterAll: 'Todo',
  historyFilterDetected: 'Detectados',
  historyFilterCleaned: 'Unfollows',
  historyFilterCancelled: 'Canceladas',
  historyCancelled: 'Canceladas',
  historyCancelledBatch: n => (n === 1 ? '1 solicitud cancelada' : `${n} solicitudes canceladas`),
  historyCancelledHint: 'La lista detallada está en Limpiar → Pendientes',
};

export const HISTORY_STRINGS: Record<HistoryLocale, HistoryTranslationSlice> = {
  en,
  es,
  'pt-BR': { ...en, historyFilterAll: 'Tudo', historyFilterDetected: 'Detectados', historyFilterCleaned: 'Unfollows', historyFilterCancelled: 'Cancelados', historyCancelled: 'Cancelados' },
  fr: { ...en, historyFilterAll: 'Tout', historyFilterDetected: 'Détectés', historyFilterCleaned: 'Unfollows', historyFilterCancelled: 'Annulées', historyCancelled: 'Annulées' },
  it: { ...en, historyFilterAll: 'Tutto', historyFilterDetected: 'Rilevati', historyFilterCleaned: 'Unfollow', historyFilterCancelled: 'Annullate', historyCancelled: 'Annullate' },
  de: { ...en, historyFilterAll: 'Alle', historyFilterDetected: 'Erkannt', historyFilterCleaned: 'Unfollows', historyFilterCancelled: 'Abgebrochen', historyCancelled: 'Abgebrochen' },
  tr: { ...en, historyFilterAll: 'Tümü', historyFilterDetected: 'Tespit', historyFilterCleaned: 'Takipten çıkılan', historyFilterCancelled: 'İptal', historyCancelled: 'İptal' },
  hi: { ...en, historyFilterAll: 'सभी', historyCancelled: 'रद्द' },
  id: { ...en, historyFilterAll: 'Semua', historyCancelled: 'Dibatalkan' },
  ar: { ...en, historyFilterAll: 'الكل', historyCancelled: 'ملغاة' },
  ja: { ...en, historyFilterAll: 'すべて', historyCancelled: 'キャンセル' },
  ko: { ...en, historyFilterAll: '전체', historyCancelled: '취소됨' },
  ru: { ...en, historyFilterAll: 'Все', historyCancelled: 'Отменено' },
  pl: { ...en, historyFilterAll: 'Wszystko', historyCancelled: 'Anulowane' },
  nl: { ...en, historyFilterAll: 'Alles', historyCancelled: 'Geannuleerd' },
  vi: { ...en, historyFilterAll: 'Tất cả', historyCancelled: 'Đã hủy' },
};
