type PendingLocale =
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

export interface PendingTranslationSlice {
  pendingTitle: string;
  pendingEntry: string;
  pendingDescription: string;
  pendingHowTitle: string;
  pendingHow1: string;
  pendingHow2: string;
  pendingHow3: string;
  pendingHow4: string;
  pendingHow5: string;
  pendingHowNote: string;
  pendingUploadBtn: string;
  pendingOrPaste: string;
  pendingPastePlaceholder: string;
  pendingLoadPasted: string;
  pendingParseError: string;
  pendingNoUsernames: string;
  pendingImported: (n: number) => string;
  pendingOpenCount: (n: number) => string;
  pendingDoneCount: (n: number) => string;
  pendingTimeEstimate: (label: string) => string;
  pendingTabOpen: string;
  pendingTabDone: string;
  pendingCancelSelected: (n: number) => string;
  pendingConfirmCancel: (n: number) => string;
  pendingBack: string;
  pendingNewFile: string;
  pendingSavedList: string;
  pendingUseSaved: string;
  pendingLookingUp: (u: string) => string;
  pendingChecking: (u: string) => string;
  pendingCancelling: (u: string) => string;
  pendingSuccess: (u: string) => string;
  pendingFailed: (u: string) => string;
  pendingSkipAccepted: (u: string) => string;
  pendingSkipGone: (u: string) => string;
  pendingSkipNotFound: (u: string) => string;
  pendingRateLimited: string;
  pendingCompleted: string;
  pendingStopped: string;
  pendingCooldown: string;
  pendingPaused: string;
  pendingEmptyOpen: string;
  pendingEmptyDone: string;
  pendingWarning: string;
  pendingYouCancelled: string;
  pendingStatusStarting: string;
  pendingNoCsrf: string;
  pendingDays: (n: number) => string;
  pendingHours: (n: number) => string;
  pendingMinutes: (n: number) => string;
  pendingSelectPage: string;
  pendingSelectAll: string;
  pendingResetDone: string;
  pendingConfirmResetDone: string;
  pendingSkipped: string;
  pendingBackToList: string;
}

const en: PendingTranslationSlice = {
  pendingTitle: 'Cancel pending requests',
  pendingEntry: 'Pending requests',
  pendingDescription:
    'Import the Meta export of follow requests you sent and cancel them slowly, like a normal unfollow queue.',
  pendingHowTitle: 'How to get pending_follow_requests.html',
  pendingHow1: 'Open Instagram → Settings → Accounts Center → Your information and permissions.',
  pendingHow2: 'Tap Download your information and request an Instagram download.',
  pendingHow3: 'Choose Followers and following (Connections). Format: HTML. Date range: All time.',
  pendingHow4: 'Wait for Meta’s email, download the ZIP and unzip it.',
  pendingHow5:
    'Open connections/followers_and_following/pending_follow_requests.html — that list is requests you sent that were never accepted.',
  pendingHowNote:
    'You can also upload the JSON export or paste usernames. Already-cancelled accounts are saved on this device so you can continue another day.',
  pendingUploadBtn: 'Upload Meta file',
  pendingOrPaste: 'Or paste usernames',
  pendingPastePlaceholder: 'username1\nusername2\nusername3',
  pendingLoadPasted: 'Load pasted list',
  pendingParseError: 'Could not read that file. Use the HTML/JSON from Meta or a username list.',
  pendingNoUsernames: 'No usernames found in that file.',
  pendingImported: n => `Imported ${n} pending requests`,
  pendingOpenCount: n => `${n} still pending`,
  pendingDoneCount: n => `${n} already cleared`,
  pendingTimeEstimate: label => `Estimated time with your current delays: ${label}`,
  pendingTabOpen: 'Pending',
  pendingTabDone: 'Cleared',
  pendingCancelSelected: n => `Cancel selected (${n})`,
  pendingConfirmCancel: n =>
    `Cancel ${n} outgoing follow request(s)? This uses the same slow delays as unfollow.`,
  pendingBack: 'Back',
  pendingNewFile: 'Upload a new file',
  pendingSavedList: 'A list from a previous session is saved on this device.',
  pendingUseSaved: 'Continue saved list',
  pendingLookingUp: u => `Looking up @${u}...`,
  pendingChecking: u => `Checking @${u}...`,
  pendingCancelling: u => `Cancelling request to @${u}...`,
  pendingSuccess: u => `Cancelled @${u}`,
  pendingFailed: u => `Could not cancel @${u}`,
  pendingSkipAccepted: u => `Skipped @${u} — they already accepted (not unfollowed)`,
  pendingSkipGone: u => `Skipped @${u} — request is no longer pending`,
  pendingSkipNotFound: u => `Skipped @${u} — account not found`,
  pendingRateLimited: 'Instagram rate-limited the queue. Pause and continue later.',
  pendingCompleted: 'Finished this batch.',
  pendingStopped: 'Stopped.',
  pendingCooldown: 'Cooling down to avoid an action block...',
  pendingPaused: 'Paused...',
  pendingEmptyOpen: 'No pending requests left in this list. The next Meta export should be empty.',
  pendingEmptyDone: 'Nothing cleared yet. Select pending accounts and cancel them.',
  pendingWarning:
    'Only outgoing requests are cancelled. If someone already accepted, they are skipped so you do not unfollow them.',
  pendingYouCancelled: 'Cancelled request',
  pendingStatusStarting: 'Starting cancel queue...',
  pendingNoCsrf: 'Error: no CSRF token. Stay logged into Instagram and try again.',
  pendingDays: n => `${n}d`,
  pendingHours: n => `${n}h`,
  pendingMinutes: n => `${n}m`,
  pendingSelectPage: 'Page',
  pendingSelectAll: 'All',
  pendingResetDone: 'Move cleared back to pending',
  pendingConfirmResetDone:
    'Return locally marked accounts to the pending tab? Use this if some were skipped by mistake.',
  pendingSkipped: 'Skipped',
  pendingBackToList: 'Back to list',
};

const es: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'Cancelar solicitudes pendientes',
  pendingEntry: 'Solicitudes pendientes',
  pendingDescription:
    'Importa el export de Meta con las solicitudes que enviaste y cancélalas poco a poco, como la cola de unfollow.',
  pendingHowTitle: 'Cómo conseguir pending_follow_requests.html',
  pendingHow1: 'Abre Instagram → Configuración → Cuentas → Tu información y permisos.',
  pendingHow2: 'Pulsa Descargar tu información y pide una copia de Instagram.',
  pendingHow3: 'Elige Seguidores y cuentas seguidas (Connections). Formato: HTML. Rango: Todo el tiempo.',
  pendingHow4: 'Espera el email de Meta, descarga el ZIP y descomprímelo.',
  pendingHow5:
    'Abre connections/followers_and_following/pending_follow_requests.html — esa lista son solicitudes que tú enviaste y nadie aceptó.',
  pendingHowNote:
    'También puedes subir el JSON de Meta o pegar usuarios. Las ya canceladas se guardan en este dispositivo para continuar otro día.',
  pendingUploadBtn: 'Subir archivo de Meta',
  pendingOrPaste: 'O pega usuarios',
  pendingPastePlaceholder: 'usuario1\nusuario2\nusuario3',
  pendingLoadPasted: 'Cargar lista pegada',
  pendingParseError: 'No se pudo leer el archivo. Usa el HTML/JSON de Meta o una lista de usuarios.',
  pendingNoUsernames: 'No se encontraron usuarios en ese archivo.',
  pendingImported: n => `Importadas ${n} solicitudes pendientes`,
  pendingOpenCount: n => `${n} siguen pendientes`,
  pendingDoneCount: n => `${n} ya limpiadas`,
  pendingTimeEstimate: label => `Tiempo estimado con tus pausas actuales: ${label}`,
  pendingTabOpen: 'Pendientes',
  pendingTabDone: 'Limpiadas',
  pendingCancelSelected: n => `Cancelar seleccionadas (${n})`,
  pendingConfirmCancel: n =>
    `¿Cancelar ${n} solicitud(es) enviada(s)? Usará las mismas pausas lentas que el unfollow.`,
  pendingBack: 'Volver',
  pendingNewFile: 'Subir un archivo nuevo',
  pendingSavedList: 'Hay una lista guardada de una sesión anterior en este dispositivo.',
  pendingUseSaved: 'Continuar lista guardada',
  pendingLookingUp: u => `Buscando @${u}...`,
  pendingChecking: u => `Comprobando @${u}...`,
  pendingCancelling: u => `Cancelando solicitud a @${u}...`,
  pendingSuccess: u => `Cancelada @${u}`,
  pendingFailed: u => `No se pudo cancelar @${u}`,
  pendingSkipAccepted: u => `Omitida @${u} — ya te aceptó (no se deja de seguir)`,
  pendingSkipGone: u => `Omitida @${u} — ya no está pendiente`,
  pendingSkipNotFound: u => `Omitida @${u} — cuenta no encontrada`,
  pendingRateLimited: 'Instagram limitó la cola. Para y continúa más tarde.',
  pendingCompleted: 'Lote terminado.',
  pendingStopped: 'Detenido.',
  pendingCooldown: 'Pausa larga para evitar un bloqueo de acciones...',
  pendingPaused: 'Pausado...',
  pendingEmptyOpen: 'No quedan solicitudes en esta lista. El próximo export de Meta debería ir vacío.',
  pendingEmptyDone: 'Aún no hay nada limpiado. Selecciona pendientes y cancélalas.',
  pendingWarning:
    'Solo se cancelan solicitudes que tú enviaste. Si alguien ya aceptó, se omite para no dejar de seguirle.',
  pendingYouCancelled: 'Solicitud cancelada',
  pendingStatusStarting: 'Iniciando cola de cancelación...',
  pendingNoCsrf: 'Error: no hay token CSRF. Quédate logueado en Instagram e inténtalo de nuevo.',
  pendingDays: n => `${n}d`,
  pendingHours: n => `${n}h`,
  pendingMinutes: n => `${n}m`,
  pendingSelectPage: 'Página',
  pendingSelectAll: 'Todas',
  pendingResetDone: 'Devolver limpiadas a pendientes',
  pendingConfirmResetDone:
    '¿Quitar la marca local y volver a mostrarlas como pendientes? Úsalo si se omitieron por error.',
  pendingSkipped: 'Omitidas',
  pendingBackToList: 'Volver al listado',
};

const ptBR: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'Cancelar solicitações pendentes',
  pendingEntry: 'Solicitações pendentes',
  pendingDescription:
    'Importe o arquivo da Meta com os pedidos que você enviou e cancele-os devagar, como a fila de unfollow.',
  pendingHowTitle: 'Como obter pending_follow_requests.html',
  pendingUploadBtn: 'Enviar arquivo da Meta',
  pendingTabOpen: 'Pendentes',
  pendingTabDone: 'Limpos',
  pendingCancelSelected: n => `Cancelar selecionados (${n})`,
  pendingBack: 'Voltar',
  pendingUseSaved: 'Continuar lista salva',
  pendingYouCancelled: 'Pedido cancelado',
};

const fr: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'Annuler les demandes en attente',
  pendingEntry: 'Demandes en attente',
  pendingHowTitle: 'Comment obtenir pending_follow_requests.html',
  pendingUploadBtn: 'Importer le fichier Meta',
  pendingTabOpen: 'En attente',
  pendingTabDone: 'Annulées',
  pendingCancelSelected: n => `Annuler la sélection (${n})`,
  pendingBack: 'Retour',
  pendingUseSaved: 'Continuer la liste enregistrée',
  pendingYouCancelled: 'Demande annulée',
};

const it: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'Annulla richieste in sospeso',
  pendingEntry: 'Richieste in sospeso',
  pendingHowTitle: 'Come ottenere pending_follow_requests.html',
  pendingUploadBtn: 'Carica file Meta',
  pendingTabOpen: 'In sospeso',
  pendingTabDone: 'Cancellate',
  pendingCancelSelected: n => `Annulla selezionate (${n})`,
  pendingBack: 'Indietro',
  pendingUseSaved: 'Continua lista salvata',
  pendingYouCancelled: 'Richiesta annullata',
};

const de: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'Ausstehende Anfragen abbrechen',
  pendingEntry: 'Ausstehende Anfragen',
  pendingHowTitle: 'So erhältst du pending_follow_requests.html',
  pendingUploadBtn: 'Meta-Datei hochladen',
  pendingTabOpen: 'Offen',
  pendingTabDone: 'Erledigt',
  pendingCancelSelected: n => `Auswahl abbrechen (${n})`,
  pendingBack: 'Zurück',
  pendingUseSaved: 'Gespeicherte Liste fortsetzen',
  pendingYouCancelled: 'Anfrage abgebrochen',
};

const tr: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'Bekleyen istekleri iptal et',
  pendingEntry: 'Bekleyen istekler',
  pendingUploadBtn: 'Meta dosyasını yükle',
  pendingTabOpen: 'Bekleyen',
  pendingTabDone: 'Temizlenen',
  pendingCancelSelected: n => `Seçilenleri iptal et (${n})`,
  pendingBack: 'Geri',
  pendingYouCancelled: 'İstek iptal edildi',
};

const hi: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'लंबित अनुरोध रद्द करें',
  pendingEntry: 'लंबित अनुरोध',
  pendingUploadBtn: 'Meta फ़ाइल अपलोड करें',
  pendingTabOpen: 'लंबित',
  pendingTabDone: 'साफ़',
  pendingCancelSelected: n => `चयनित रद्द करें (${n})`,
  pendingBack: 'वापस',
  pendingYouCancelled: 'अनुरोध रद्द',
};

const id: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'Batalkan permintaan tertunda',
  pendingEntry: 'Permintaan tertunda',
  pendingUploadBtn: 'Unggah file Meta',
  pendingTabOpen: 'Tertunda',
  pendingTabDone: 'Selesai',
  pendingCancelSelected: n => `Batalkan terpilih (${n})`,
  pendingBack: 'Kembali',
  pendingYouCancelled: 'Permintaan dibatalkan',
};

const ar: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'إلغاء الطلبات المعلقة',
  pendingEntry: 'طلبات معلقة',
  pendingUploadBtn: 'رفع ملف ميتا',
  pendingTabOpen: 'معلق',
  pendingTabDone: 'تم',
  pendingCancelSelected: n => `إلغاء المحدد (${n})`,
  pendingBack: 'رجوع',
  pendingYouCancelled: 'تم إلغاء الطلب',
};

const ja: PendingTranslationSlice = {
  ...en,
  pendingTitle: '保留中のリクエストをキャンセル',
  pendingEntry: '保留中のリクエスト',
  pendingUploadBtn: 'Metaファイルをアップロード',
  pendingTabOpen: '保留中',
  pendingTabDone: '完了',
  pendingCancelSelected: n => `選択をキャンセル（${n}）`,
  pendingBack: '戻る',
  pendingYouCancelled: 'リクエストをキャンセル',
};

const ko: PendingTranslationSlice = {
  ...en,
  pendingTitle: '대기 중인 요청 취소',
  pendingEntry: '대기 중인 요청',
  pendingUploadBtn: 'Meta 파일 업로드',
  pendingTabOpen: '대기',
  pendingTabDone: '완료',
  pendingCancelSelected: n => `선택 취소 (${n})`,
  pendingBack: '뒤로',
  pendingYouCancelled: '요청 취소됨',
};

const ru: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'Отменить исходящие заявки',
  pendingEntry: 'Ожидающие заявки',
  pendingUploadBtn: 'Загрузить файл Meta',
  pendingTabOpen: 'Ожидают',
  pendingTabDone: 'Готово',
  pendingCancelSelected: n => `Отменить выбранные (${n})`,
  pendingBack: 'Назад',
  pendingYouCancelled: 'Заявка отменена',
};

const pl: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'Anuluj oczekujące zaproszenia',
  pendingEntry: 'Oczekujące zaproszenia',
  pendingUploadBtn: 'Wgraj plik Meta',
  pendingTabOpen: 'Oczekujące',
  pendingTabDone: 'Wyczyszczone',
  pendingCancelSelected: n => `Anuluj zaznaczone (${n})`,
  pendingBack: 'Wstecz',
  pendingYouCancelled: 'Anulowano zaproszenie',
};

const nl: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'Openstaande verzoeken annuleren',
  pendingEntry: 'Openstaande verzoeken',
  pendingUploadBtn: 'Meta-bestand uploaden',
  pendingTabOpen: 'Openstaand',
  pendingTabDone: 'Gewist',
  pendingCancelSelected: n => `Selectie annuleren (${n})`,
  pendingBack: 'Terug',
  pendingYouCancelled: 'Verzoek geannuleerd',
};

const vi: PendingTranslationSlice = {
  ...en,
  pendingTitle: 'Hủy lời mời đang chờ',
  pendingEntry: 'Lời mời đang chờ',
  pendingUploadBtn: 'Tải tệp Meta',
  pendingTabOpen: 'Đang chờ',
  pendingTabDone: 'Đã xóa',
  pendingCancelSelected: n => `Hủy đã chọn (${n})`,
  pendingBack: 'Quay lại',
  pendingYouCancelled: 'Đã hủy lời mời',
};

export const PENDING_STRINGS: Record<PendingLocale, PendingTranslationSlice> = {
  en,
  es,
  'pt-BR': ptBR,
  fr,
  it,
  de,
  tr,
  hi,
  id,
  ar,
  ja,
  ko,
  ru,
  pl,
  nl,
  vi,
};
