type CleanLocale =
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

export interface CleanTranslationSlice {
  cleanEntry: string;
  cleanTitle: string;
  cleanDescription: string;
  cleanHowTitle: string;
  cleanHow1: string;
  cleanHow2: string;
  cleanHow3: string;
  cleanHow4: string;
  cleanHowNote: string;
  cleanUploadBtn: string;
  cleanNeedLists: string;
  cleanParseError: string;
  cleanImported: (unfollowed: number, blocked: number, recent: number) => string;
  cleanReadOnlyBanner: string;
  cleanTabUnfollowed: string;
  cleanTabBlocked: string;
  cleanTabRecent: string;
  cleanEmpty: string;
  cleanBack: string;
  cleanNewFile: string;
  cleanCopy: string;
  cleanCopied: (n: number) => string;
  cleanSavedList: string;
  cleanUseSaved: string;
  cleanUsePending: string;
  cleanUseScan: string;
}

const en: CleanTranslationSlice = {
  cleanEntry: 'Clean other lists',
  cleanTitle: 'Account lists (read only)',
  cleanDescription:
    'Open recently unfollowed, blocked, and recent follow requests from your Meta download. Nothing is sent to Instagram.',
  cleanHowTitle: 'Which files to upload',
  cleanHow1: 'In the ZIP, open connections/followers_and_following/.',
  cleanHow2: 'Select recently_unfollowed_profiles.html, blocked_profiles.html and/or recent_follow_requests.html.',
  cleanHow3: 'You can pick several files at once. The app detects which is which.',
  cleanHow4: 'This is a list only. Canceling pending requests and unfollowing stay in their own flows.',
  cleanHowNote: 'Same Meta download. Pending outgoing requests still use the Pending button.',
  cleanUploadBtn: 'Upload list files',
  cleanNeedLists: 'Need at least one of: recently unfollowed, blocked, or recent requests.',
  cleanParseError: 'Could not read those files. Use the HTML from Meta.',
  cleanImported: (unfollowed, blocked, recent) =>
    `Unfollowed ${unfollowed} · Blocked ${blocked} · Recent requests ${recent}`,
  cleanReadOnlyBanner: 'Read-only Meta lists — no Instagram requests',
  cleanTabUnfollowed: 'Unfollowed',
  cleanTabBlocked: 'Blocked',
  cleanTabRecent: 'Recent requests',
  cleanEmpty: 'Nothing in this list.',
  cleanBack: 'Back',
  cleanNewFile: 'New files',
  cleanCopy: 'Copy usernames',
  cleanCopied: n => `Copied ${n} usernames`,
  cleanSavedList: 'You have a saved import on this account.',
  cleanUseSaved: 'Open saved lists',
  cleanUsePending: 'That file is pending requests. Use the Pending button to cancel them.',
  cleanUseScan: 'Following/followers belong in Analyze Meta export.',
};

const es: CleanTranslationSlice = {
  ...en,
  cleanEntry: 'Limpiar otras listas',
  cleanTitle: 'Listas de la cuenta (solo lectura)',
  cleanDescription:
    'Abre a quién dejaste de seguir, bloqueados y solicitudes recientes de tu descarga de Meta. No se envía nada a Instagram.',
  cleanHowTitle: 'Qué archivos subir',
  cleanHow1: 'En el ZIP, entra en connections/followers_and_following/.',
  cleanHow2:
    'Elige recently_unfollowed_profiles.html, blocked_profiles.html y/o recent_follow_requests.html.',
  cleanHow3: 'Puedes seleccionar varios a la vez. La app detecta cuál es cuál.',
  cleanHow4: 'Solo se listan. Cancelar pendientes y dejar de seguir siguen en sus flujos.',
  cleanHowNote: 'Es la misma descarga de Meta. Las solicitudes salientes van al botón de Pendientes.',
  cleanUploadBtn: 'Subir listas',
  cleanNeedLists: 'Falta al menos un archivo: unfollowed, blocked o recent requests.',
  cleanParseError: 'No se pudieron leer. Usa los HTML de Meta.',
  cleanImported: (unfollowed, blocked, recent) =>
    `Dejaste de seguir ${unfollowed} · Bloqueados ${blocked} · Solicitudes recientes ${recent}`,
  cleanReadOnlyBanner: 'Listas de Meta en solo lectura — cero peticiones a Instagram',
  cleanTabUnfollowed: 'Dejaste de seguir',
  cleanTabBlocked: 'Bloqueados',
  cleanTabRecent: 'Solicitudes recientes',
  cleanEmpty: 'Esta lista está vacía.',
  cleanBack: 'Volver',
  cleanNewFile: 'Otros archivos',
  cleanCopy: 'Copiar usuarios',
  cleanCopied: n => `Copiados ${n} usuarios`,
  cleanSavedList: 'Hay un import guardado en esta cuenta.',
  cleanUseSaved: 'Abrir listas guardadas',
  cleanUsePending: 'Ese archivo es de solicitudes pendientes. Usa el botón Pendientes para cancelarlas.',
  cleanUseScan: 'Following/followers van en Analizar export de Meta.',
};

export const CLEAN_STRINGS: Record<CleanLocale, CleanTranslationSlice> = {
  en,
  es,
  'pt-BR': { ...en, cleanEntry: 'Limpar outras listas', cleanBack: 'Voltar' },
  fr: { ...en, cleanEntry: 'Nettoyer d’autres listes', cleanBack: 'Retour' },
  it: { ...en, cleanEntry: 'Pulisci altre liste', cleanBack: 'Indietro' },
  de: { ...en, cleanEntry: 'Weitere Listen', cleanBack: 'Zurück' },
  tr: { ...en, cleanEntry: 'Diğer listeleri temizle', cleanBack: 'Geri' },
  hi: { ...en, cleanEntry: 'अन्य सूचियाँ', cleanBack: 'वापस' },
  id: { ...en, cleanEntry: 'Daftar lainnya', cleanBack: 'Kembali' },
  ar: { ...en, cleanEntry: 'قوائم أخرى', cleanBack: 'رجوع' },
  ja: { ...en, cleanEntry: '他のリスト', cleanBack: '戻る' },
  ko: { ...en, cleanEntry: '다른 목록', cleanBack: '뒤로' },
  ru: { ...en, cleanEntry: 'Другие списки', cleanBack: 'Назад' },
  pl: { ...en, cleanEntry: 'Inne listy', cleanBack: 'Wstecz' },
  nl: { ...en, cleanEntry: 'Andere lijsten', cleanBack: 'Terug' },
  vi: { ...en, cleanEntry: 'Danh sách khác', cleanBack: 'Quay lại' },
};
