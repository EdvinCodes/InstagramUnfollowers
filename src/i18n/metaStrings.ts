type MetaLocale =
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

export interface MetaTranslationSlice {
  metaEntry: string;
  metaTitle: string;
  metaDescription: string;
  metaHowTitle: string;
  metaHow1: string;
  metaHow2: string;
  metaHow3: string;
  metaHow4: string;
  metaHowNote: string;
  metaUploadBtn: string;
  metaNeedBoth: string;
  metaParseError: string;
  metaImported: (following: number, followers: number, nonFollowers: number) => string;
  metaOfflineBanner: string;
  metaUnfollowDisabled: string;
  metaBack: string;
}

const en: MetaTranslationSlice = {
  metaEntry: 'Analyze Meta export',
  metaTitle: 'Offline scan (zero risk)',
  metaDescription:
    'Compare following.html and followers from your Meta download. Nothing is sent to Instagram.',
  metaHowTitle: 'Which files to upload',
  metaHow1: 'In the ZIP, open connections/followers_and_following/.',
  metaHow2: 'Select following.html and followers_1.html (and followers_2.html if you have more).',
  metaHow3: 'You can pick several files at once. The app detects which is which.',
  metaHow4: 'You will see non-followers and mutuals instantly. Unfollow still needs a live scan.',
  metaHowNote:
    'Same download you already used for pending requests. This step only reads the files on this device.',
  metaUploadBtn: 'Upload following + followers',
  metaNeedBoth: 'Need both files: following.html and at least one followers_*.html.',
  metaParseError: 'Could not read those files. Use the HTML from Meta.',
  metaImported: (following, followers, nonFollowers) =>
    `Following ${following} · Followers ${followers} · ${nonFollowers} don't follow back`,
  metaOfflineBanner: 'Offline Meta export — no Instagram requests',
  metaUnfollowDisabled: 'To unfollow, run a live scan. This export has no user IDs.',
  metaBack: 'Back',
};

const es: MetaTranslationSlice = {
  ...en,
  metaEntry: 'Analizar export de Meta',
  metaTitle: 'Escaneo offline (cero riesgo)',
  metaDescription:
    'Cruza following.html y followers de tu descarga de Meta. No se envía nada a Instagram.',
  metaHowTitle: 'Qué archivos subir',
  metaHow1: 'En el ZIP, entra en connections/followers_and_following/.',
  metaHow2: 'Elige following.html y followers_1.html (y followers_2.html si hay más).',
  metaHow3: 'Puedes seleccionar varios a la vez. La app detecta cuál es cuál.',
  metaHow4: 'Verás no-followers y mutuals al instante. Para dejar de seguir hace falta el escaneo en vivo.',
  metaHowNote:
    'Es la misma descarga que usaste para las solicitudes. Esto solo se lee en este dispositivo.',
  metaUploadBtn: 'Subir following + followers',
  metaNeedBoth: 'Faltan archivos: following.html y al menos un followers_*.html.',
  metaParseError: 'No se pudieron leer. Usa los HTML de Meta.',
  metaImported: (following, followers, nonFollowers) =>
    `Siguiendo ${following} · Seguidores ${followers} · ${nonFollowers} no te siguen`,
  metaOfflineBanner: 'Export de Meta offline — cero peticiones a Instagram',
  metaUnfollowDisabled: 'Para dejar de seguir, lanza un escaneo en vivo. Este export no trae IDs.',
  metaBack: 'Volver',
};

export const META_STRINGS: Record<MetaLocale, MetaTranslationSlice> = {
  en,
  es,
  'pt-BR': { ...en, metaEntry: 'Analisar export da Meta', metaBack: 'Voltar' },
  fr: { ...en, metaEntry: 'Analyser l’export Meta', metaBack: 'Retour' },
  it: { ...en, metaEntry: 'Analizza export Meta', metaBack: 'Indietro' },
  de: { ...en, metaEntry: 'Meta-Export analysieren', metaBack: 'Zurück' },
  tr: { ...en, metaEntry: 'Meta dışa aktarımını analiz et', metaBack: 'Geri' },
  hi: { ...en, metaEntry: 'Meta एक्सपोर्ट विश्लेषण', metaBack: 'वापस' },
  id: { ...en, metaEntry: 'Analisis ekspor Meta', metaBack: 'Kembali' },
  ar: { ...en, metaEntry: 'تحليل تصدير ميتا', metaBack: 'رجوع' },
  ja: { ...en, metaEntry: 'Metaエクスポートを分析', metaBack: '戻る' },
  ko: { ...en, metaEntry: 'Meta보내기 분석', metaBack: '뒤로' },
  ru: { ...en, metaEntry: 'Анализ экспорта Meta', metaBack: 'Назад' },
  pl: { ...en, metaEntry: 'Analizuj eksport Meta', metaBack: 'Wstecz' },
  nl: { ...en, metaEntry: 'Meta-export analyseren', metaBack: 'Terug' },
  vi: { ...en, metaEntry: 'Phân tích file Meta', metaBack: 'Quay lại' },
};
