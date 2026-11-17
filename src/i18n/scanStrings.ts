type ScanLocale =
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

export interface ScanTranslationSlice {
  cooldownToast: (countdown: string) => string;
  retryRateLimited: (seconds: number, attempt: number, maxAttempts: number) => string;
  retryNetwork: (seconds: number, attempt: number, maxAttempts: number) => string;
  retryServer: (seconds: number, attempt: number, maxAttempts: number) => string;
  retrySoftBlock: (seconds: number, attempt: number, maxAttempts: number) => string;
  resumingFollowers: (count: number) => string;
  followersSavedToast: (count: number) => string;
  accountChanged: string;
  sessionRejected: string;
  waitingForConnection: string;
  followingPartialTitle: string;
  cooldownBanner: (countdown: string) => string;
  resumeCheckpointBanner: (count: number) => string;
  resumeCheckpointButton: string;
  startFreshScan: string;
  scanAccountChangedToast: string;
  scanCooldownActiveToast: (countdown: string) => string;
}

const en: ScanTranslationSlice = {
  cooldownToast: countdown => `Instagram asked us to wait. Try again in ${countdown}.`,
  retryRateLimited: (seconds, attempt, maxAttempts) =>
    `Rate limited — retrying in ${seconds}s (${attempt}/${maxAttempts})…`,
  retryNetwork: (seconds, attempt, maxAttempts) =>
    `Network error — retrying in ${seconds}s (${attempt}/${maxAttempts})…`,
  retryServer: (seconds, attempt, maxAttempts) =>
    `Instagram server error — retrying in ${seconds}s (${attempt}/${maxAttempts})…`,
  retrySoftBlock: (seconds, attempt, maxAttempts) =>
    `Instagram answered with a page instead of data — retrying in ${seconds}s (${attempt}/${maxAttempts})…`,
  resumingFollowers: count => `Resuming followers download from ${count} saved…`,
  followersSavedToast: count =>
    `Scan paused. Saved ${count} followers — tap Resume when you are ready.`,
  accountChanged: 'Instagram account changed during the scan. Start again on the account you want.',
  sessionRejected: 'Instagram rejected the session. Refresh the page and log in again.',
  waitingForConnection: 'Waiting for an internet connection…',
  followingPartialTitle: 'Following list was cut short. Results so far are accurate for the accounts loaded.',
  cooldownBanner: countdown => `Cooldown active — wait ${countdown} before scanning or unfollowing again.`,
  resumeCheckpointBanner: count =>
    `You have ${count} followers saved from an interrupted scan. Resume to continue, or start fresh.`,
  resumeCheckpointButton: 'Resume saved scan',
  startFreshScan: 'Start fresh',
  scanAccountChangedToast: 'Account changed mid-scan. Results were discarded for safety.',
  scanCooldownActiveToast: countdown => `Still cooling down. Try again in ${countdown}.`,
};

const es: ScanTranslationSlice = {
  cooldownToast: countdown => `Instagram pidió esperar. Inténtalo de nuevo en ${countdown}.`,
  retryRateLimited: (seconds, attempt, maxAttempts) =>
    `Límite de peticiones — reintentando en ${seconds}s (${attempt}/${maxAttempts})…`,
  retryNetwork: (seconds, attempt, maxAttempts) =>
    `Error de red — reintentando en ${seconds}s (${attempt}/${maxAttempts})…`,
  retryServer: (seconds, attempt, maxAttempts) =>
    `Error del servidor de Instagram — reintentando en ${seconds}s (${attempt}/${maxAttempts})…`,
  retrySoftBlock: (seconds, attempt, maxAttempts) =>
    `Instagram respondió con una página en vez de datos — reintentando en ${seconds}s (${attempt}/${maxAttempts})…`,
  resumingFollowers: count => `Reanudando descarga de seguidores desde ${count} guardados…`,
  followersSavedToast: count =>
    `Escaneo pausado. Se guardaron ${count} seguidores — pulsa Reanudar cuando quieras.`,
  accountChanged: 'La cuenta de Instagram cambió durante el escaneo. Empieza de nuevo en la cuenta correcta.',
  sessionRejected: 'Instagram rechazó la sesión. Recarga la página e inicia sesión otra vez.',
  waitingForConnection: 'Esperando conexión a internet…',
  followingPartialTitle:
    'La lista de seguidos se cortó. Los resultados hasta ahora son correctos para las cuentas cargadas.',
  cooldownBanner: countdown =>
    `Enfriamiento activo — espera ${countdown} antes de escanear o dejar de seguir otra vez.`,
  resumeCheckpointBanner: count =>
    `Tienes ${count} seguidores guardados de un escaneo interrumpido. Reanuda para continuar, o empieza de cero.`,
  resumeCheckpointButton: 'Reanudar escaneo guardado',
  startFreshScan: 'Empezar de cero',
  scanAccountChangedToast: 'La cuenta cambió a mitad del escaneo. Se descartaron los resultados por seguridad.',
  scanCooldownActiveToast: countdown => `Sigue el enfriamiento. Inténtalo en ${countdown}.`,
};

function withEnglishFallback(partial: Partial<ScanTranslationSlice>): ScanTranslationSlice {
  return { ...en, ...partial };
}

export const SCAN_STRINGS: Record<ScanLocale, ScanTranslationSlice> = {
  en,
  es,
  'pt-BR': withEnglishFallback({
    cooldownToast: countdown => `O Instagram pediu para esperar. Tente de novo em ${countdown}.`,
    resumeCheckpointButton: 'Retomar varredura salva',
    startFreshScan: 'Começar do zero',
    accountChanged: 'A conta do Instagram mudou durante a varredura. Comece de novo na conta certa.',
    waitingForConnection: 'Aguardando conexão com a internet…',
  }),
  fr: withEnglishFallback({
    cooldownToast: countdown => `Instagram demande d'attendre. Réessayez dans ${countdown}.`,
    resumeCheckpointButton: 'Reprendre l’analyse enregistrée',
    startFreshScan: 'Recommencer',
    accountChanged: 'Le compte Instagram a changé pendant l’analyse. Recommencez sur le bon compte.',
    waitingForConnection: 'En attente d’une connexion Internet…',
  }),
  it: withEnglishFallback({
    cooldownToast: countdown => `Instagram ha chiesto di aspettare. Riprova tra ${countdown}.`,
    resumeCheckpointButton: 'Riprendi scansione salvata',
    startFreshScan: 'Ricomincia da zero',
    accountChanged: 'L’account Instagram è cambiato durante la scansione. Ricomincia sull’account giusto.',
    waitingForConnection: 'In attesa di una connessione Internet…',
  }),
  de: withEnglishFallback({
    cooldownToast: countdown => `Instagram bittet um eine Pause. Versuche es in ${countdown} erneut.`,
    resumeCheckpointButton: 'Gespeicherten Scan fortsetzen',
    startFreshScan: 'Neu starten',
    accountChanged: 'Instagram-Konto wurde während des Scans gewechselt. Starte auf dem richtigen Konto neu.',
    waitingForConnection: 'Warte auf Internetverbindung…',
  }),
  tr: withEnglishFallback({
    cooldownToast: countdown => `Instagram beklemenizi istedi. ${countdown} sonra tekrar dene.`,
    resumeCheckpointButton: 'Kayıtlı taramayı sürdür',
    startFreshScan: 'Sıfırdan başla',
  }),
  hi: withEnglishFallback({
    resumeCheckpointButton: 'सेव किया स्कैन जारी रखें',
    startFreshScan: 'फिर से शुरू करें',
  }),
  id: withEnglishFallback({
    resumeCheckpointButton: 'Lanjutkan pindai tersimpan',
    startFreshScan: 'Mulai dari awal',
  }),
  ar: withEnglishFallback({
    resumeCheckpointButton: 'استئناف المسح المحفوظ',
    startFreshScan: 'بدء من جديد',
  }),
  ja: withEnglishFallback({
    resumeCheckpointButton: '保存したスキャンを再開',
    startFreshScan: '最初から',
  }),
  ko: withEnglishFallback({
    resumeCheckpointButton: '저장된 스캔 재개',
    startFreshScan: '처음부터',
  }),
  ru: withEnglishFallback({
    resumeCheckpointButton: 'Продолжить сохранённое сканирование',
    startFreshScan: 'Начать заново',
  }),
  pl: withEnglishFallback({
    resumeCheckpointButton: 'Wznów zapisany skan',
    startFreshScan: 'Zacznij od nowa',
  }),
  nl: withEnglishFallback({
    resumeCheckpointButton: 'Hervat opgeslagen scan',
    startFreshScan: 'Opnieuw beginnen',
  }),
  vi: withEnglishFallback({
    resumeCheckpointButton: 'Tiếp tục quét đã lưu',
    startFreshScan: 'Bắt đầu lại',
  }),
};
