type UxLocale =
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

export interface UxTranslationSlice {
  openTool: string;
  scanFinishedNew: (n: number) => string;
  scanStoppedRateLimit: string;
  scanCompletedToast: string;
  scanErrorToast: string;
  unfollowFinished: string;
  emptyResultsTitle: string;
  emptyResultsHint: string;
  emptyResultsScanning: string;
  noSearchResults: string;
  timingSearchCycles: string;
  timingAfterFiveSearch: string;
  timingBetweenUnfollows: string;
  timingAfterFiveUnfollows: string;
  statusRateLimited: string;
  statusNoSession: string;
  proTemporarilyFree: string;
  closeNotification: string;
  confirmFilterChange: string;
  prevPage: string;
  nextPage: string;
  searchAccounts: string;
}

const en: UxTranslationSlice = {
  openTool: 'Open Instagram Unfollowers',
  scanFinishedNew: n => `Scan finished. Found ${n} new unfollowers.`,
  scanStoppedRateLimit: 'Scan paused by anti-ban (HTTP 429). Showing partial results.',
  scanCompletedToast: 'Scanning completed!',
  scanErrorToast: 'Scan interrupted. Showing partial results.',
  unfollowFinished: 'Unfollow process finished!',
  emptyResultsTitle: 'No accounts here',
  emptyResultsHint: 'Try another tab or clear filters and search.',
  emptyResultsScanning: 'Scanning your following list…',
  noSearchResults: 'No accounts match your search.',
  timingSearchCycles: 'Time between search cycles',
  timingAfterFiveSearch: 'Wait after five search cycles',
  timingBetweenUnfollows: 'Time between unfollows',
  timingAfterFiveUnfollows: 'Wait after five unfollows',
  statusRateLimited: 'Rate limited (429). Stopped to protect your account.',
  statusNoSession: 'No Instagram session found. Refresh the page and log in.',
  proTemporarilyFree: 'All PRO features are free while we migrate payment providers.',
  closeNotification: 'Close notification',
  confirmFilterChange: 'Changing filters will clear selected users. Continue?',
  prevPage: 'Previous page',
  nextPage: 'Next page',
  searchAccounts: 'Search accounts',
};

const es: UxTranslationSlice = {
  openTool: 'Abrir Instagram Unfollowers',
  scanFinishedNew: n => `Escaneo terminado. Se encontraron ${n} unfollowers nuevos.`,
  scanStoppedRateLimit: 'Escaneo pausado por anti-baneo (HTTP 429). Mostrando resultados parciales.',
  scanCompletedToast: '¡Escaneo completado!',
  scanErrorToast: 'Escaneo interrumpido. Mostrando resultados parciales.',
  unfollowFinished: '¡Proceso de unfollow terminado!',
  emptyResultsTitle: 'No hay cuentas aquí',
  emptyResultsHint: 'Prueba otra pestaña o limpia filtros y búsqueda.',
  emptyResultsScanning: 'Escaneando tu lista de seguidos…',
  noSearchResults: 'Ninguna cuenta coincide con tu búsqueda.',
  timingSearchCycles: 'Tiempo entre ciclos de búsqueda',
  timingAfterFiveSearch: 'Espera tras cinco ciclos de búsqueda',
  timingBetweenUnfollows: 'Tiempo entre unfollows',
  timingAfterFiveUnfollows: 'Espera tras cinco unfollows',
  statusRateLimited: 'Límite de peticiones (429). Detenido para proteger tu cuenta.',
  statusNoSession: 'No hay sesión de Instagram. Recarga la página e inicia sesión.',
  proTemporarilyFree: 'Todas las funciones PRO son gratis mientras migramos de pasarela de pago.',
  closeNotification: 'Cerrar notificación',
  confirmFilterChange: 'Cambiar filtros desmarcará a los usuarios seleccionados. ¿Continuar?',
  prevPage: 'Página anterior',
  nextPage: 'Página siguiente',
  searchAccounts: 'Buscar cuentas',
};

const ptBR: UxTranslationSlice = {
  openTool: 'Abrir Instagram Unfollowers',
  scanFinishedNew: n => `Varredura concluída. Encontrados ${n} novos unfollowers.`,
  scanStoppedRateLimit: 'Varredura pausada pelo anti-ban (HTTP 429). Mostrando resultados parciais.',
  scanCompletedToast: 'Varredura concluída!',
  scanErrorToast: 'Varredura interrompida. Mostrando resultados parciais.',
  unfollowFinished: 'Processo de unfollow concluído!',
  emptyResultsTitle: 'Nenhuma conta aqui',
  emptyResultsHint: 'Tente outra aba ou limpe filtros e pesquisa.',
  emptyResultsScanning: 'Analisando quem você segue…',
  noSearchResults: 'Nenhuma conta corresponde à pesquisa.',
  timingSearchCycles: 'Tempo entre ciclos de busca',
  timingAfterFiveSearch: 'Espera após cinco ciclos de busca',
  timingBetweenUnfollows: 'Tempo entre unfollows',
  timingAfterFiveUnfollows: 'Espera após cinco unfollows',
  statusRateLimited: 'Limite de requisições (429). Parado para proteger sua conta.',
  statusNoSession: 'Nenhuma sessão do Instagram. Atualize a página e entre.',
  proTemporarilyFree: 'Todos os recursos PRO estão grátis enquanto migramos o pagamento.',
  closeNotification: 'Fechar notificação',
  confirmFilterChange: 'Alterar filtros limpará os usuários selecionados. Continuar?',
  prevPage: 'Página anterior',
  nextPage: 'Próxima página',
  searchAccounts: 'Buscar contas',
};

const fr: UxTranslationSlice = {
  openTool: 'Ouvrir Instagram Unfollowers',
  scanFinishedNew: n => `Analyse terminée. ${n} nouveaux unfollowers trouvés.`,
  scanStoppedRateLimit: 'Analyse pausée (anti-ban HTTP 429). Résultats partiels affichés.',
  scanCompletedToast: 'Analyse terminée !',
  scanErrorToast: 'Analyse interrompue. Résultats partiels affichés.',
  unfollowFinished: 'Désabonnement terminé !',
  emptyResultsTitle: 'Aucun compte ici',
  emptyResultsHint: 'Changez d’onglet ou réinitialisez filtres et recherche.',
  emptyResultsScanning: 'Analyse de votre liste d’abonnements…',
  noSearchResults: 'Aucun compte ne correspond à la recherche.',
  timingSearchCycles: 'Délai entre les cycles de recherche',
  timingAfterFiveSearch: 'Pause après cinq cycles de recherche',
  timingBetweenUnfollows: 'Délai entre les désabonnements',
  timingAfterFiveUnfollows: 'Pause après cinq désabonnements',
  statusRateLimited: 'Limite atteinte (429). Arrêt pour protéger le compte.',
  statusNoSession: 'Aucune session Instagram. Rechargez la page et connectez-vous.',
  proTemporarilyFree: 'Toutes les fonctions PRO sont gratuites pendant la migration du paiement.',
  closeNotification: 'Fermer la notification',
  confirmFilterChange: 'Changer les filtres videra la sélection. Continuer ?',
  prevPage: 'Page précédente',
  nextPage: 'Page suivante',
  searchAccounts: 'Rechercher des comptes',
};

const it: UxTranslationSlice = {
  openTool: 'Apri Instagram Unfollowers',
  scanFinishedNew: n => `Scansione completata. Trovati ${n} nuovi unfollower.`,
  scanStoppedRateLimit: 'Scansione in pausa (anti-ban HTTP 429). Risultati parziali.',
  scanCompletedToast: 'Scansione completata!',
  scanErrorToast: 'Scansione interrotta. Risultati parziali.',
  unfollowFinished: 'Processo di unfollow completato!',
  emptyResultsTitle: 'Nessun account qui',
  emptyResultsHint: 'Prova un’altra scheda o cancella filtri e ricerca.',
  emptyResultsScanning: 'Scansione della lista following…',
  noSearchResults: 'Nessun account corrisponde alla ricerca.',
  timingSearchCycles: 'Tempo tra i cicli di ricerca',
  timingAfterFiveSearch: 'Attesa dopo cinque cicli di ricerca',
  timingBetweenUnfollows: 'Tempo tra gli unfollow',
  timingAfterFiveUnfollows: 'Attesa dopo cinque unfollow',
  statusRateLimited: 'Limite raggiunto (429). Fermato per proteggere l’account.',
  statusNoSession: 'Nessuna sessione Instagram. Ricarica la pagina e accedi.',
  proTemporarilyFree: 'Tutte le funzioni PRO sono gratis durante la migrazione dei pagamenti.',
  closeNotification: 'Chiudi notifica',
  confirmFilterChange: 'Cambiare i filtri deselezionerà gli utenti. Continuare?',
  prevPage: 'Pagina precedente',
  nextPage: 'Pagina successiva',
  searchAccounts: 'Cerca account',
};

const de: UxTranslationSlice = {
  openTool: 'Instagram Unfollowers öffnen',
  scanFinishedNew: n => `Scan fertig. ${n} neue Entfolger gefunden.`,
  scanStoppedRateLimit: 'Scan pausiert (Anti-Ban HTTP 429). Teilresultate werden angezeigt.',
  scanCompletedToast: 'Scan abgeschlossen!',
  scanErrorToast: 'Scan unterbrochen. Teilresultate werden angezeigt.',
  unfollowFinished: 'Entfolgen abgeschlossen!',
  emptyResultsTitle: 'Keine Konten hier',
  emptyResultsHint: 'Anderen Tab wählen oder Filter und Suche leeren.',
  emptyResultsScanning: 'Deine Following-Liste wird gescannt…',
  noSearchResults: 'Keine Konten passen zur Suche.',
  timingSearchCycles: 'Zeit zwischen Suchzyklen',
  timingAfterFiveSearch: 'Warten nach fünf Suchzyklen',
  timingBetweenUnfollows: 'Zeit zwischen Entfolgen',
  timingAfterFiveUnfollows: 'Warten nach fünf Entfolgen',
  statusRateLimited: 'Rate-Limit (429). Gestoppt, um dein Konto zu schützen.',
  statusNoSession: 'Keine Instagram-Sitzung. Seite neu laden und anmelden.',
  proTemporarilyFree: 'Alle PRO-Funktionen sind während der Zahlungs-Migration kostenlos.',
  closeNotification: 'Benachrichtigung schließen',
  confirmFilterChange: 'Filter ändern hebt die Auswahl auf. Fortfahren?',
  prevPage: 'Vorherige Seite',
  nextPage: 'Nächste Seite',
  searchAccounts: 'Konten suchen',
};

const tr: UxTranslationSlice = {
  openTool: 'Instagram Unfollowers’ı aç',
  scanFinishedNew: n => `Tarama bitti. ${n} yeni takipten çıkan bulundu.`,
  scanStoppedRateLimit: 'Tarama anti-ban (HTTP 429) ile duraklatıldı. Kısmi sonuçlar gösteriliyor.',
  scanCompletedToast: 'Tarama tamamlandı!',
  scanErrorToast: 'Tarama kesildi. Kısmi sonuçlar gösteriliyor.',
  unfollowFinished: 'Takipten çıkma işlemi bitti!',
  emptyResultsTitle: 'Burada hesap yok',
  emptyResultsHint: 'Başka bir sekmeyi deneyin veya filtreleri temizleyin.',
  emptyResultsScanning: 'Takip listen taranıyor…',
  noSearchResults: 'Aramanızla eşleşen hesap yok.',
  timingSearchCycles: 'Arama döngüleri arası süre',
  timingAfterFiveSearch: 'Beş arama döngüsünden sonra bekleme',
  timingBetweenUnfollows: 'Takipten çıkmalar arası süre',
  timingAfterFiveUnfollows: 'Beş takipten çıkmadan sonra bekleme',
  statusRateLimited: 'İstek limiti (429). Hesabını korumak için durduruldu.',
  statusNoSession: 'Instagram oturumu yok. Sayfayı yenile ve giriş yap.',
  proTemporarilyFree: 'Ödeme geçişi sırasında tüm PRO özellikler ücretsiz.',
  closeNotification: 'Bildirimi kapat',
  confirmFilterChange: 'Filtreleri değiştirmek seçimi temizler. Devam?',
  prevPage: 'Önceki sayfa',
  nextPage: 'Sonraki sayfa',
  searchAccounts: 'Hesap ara',
};

const hi: UxTranslationSlice = {
  openTool: 'Instagram Unfollowers खोलें',
  scanFinishedNew: n => `स्कैन पूरा। ${n} नए अनफॉलोअर मिले।`,
  scanStoppedRateLimit: 'एंटी-बैन (HTTP 429) से स्कैन रुका। आंशिक परिणाम दिख रहे हैं।',
  scanCompletedToast: 'स्कैन पूरा हुआ!',
  scanErrorToast: 'स्कैन बाधित। आंशिक परिणाम दिख रहे हैं।',
  unfollowFinished: 'अनफॉलो प्रक्रिया पूरी!',
  emptyResultsTitle: 'यहाँ कोई खाता नहीं',
  emptyResultsHint: 'दूसरा टैब आज़माएँ या फ़िल्टर साफ़ करें।',
  emptyResultsScanning: 'फ़ॉलोइंग सूची स्कैन हो रही है…',
  noSearchResults: 'खोज से कोई खाता मेल नहीं खाता।',
  timingSearchCycles: 'खोज चक्रों के बीच समय',
  timingAfterFiveSearch: 'पाँच खोज चक्रों के बाद प्रतीक्षा',
  timingBetweenUnfollows: 'अनफॉलो के बीच समय',
  timingAfterFiveUnfollows: 'पाँच अनफॉलो के बाद प्रतीक्षा',
  statusRateLimited: 'रेट लिमिट (429)। खाते की सुरक्षा के लिए रोका गया।',
  statusNoSession: 'Instagram सत्र नहीं मिला। पेज रीफ़्रेश करें और लॉग इन करें।',
  proTemporarilyFree: 'पेमेंट माइग्रेशन तक सभी PRO सुविधाएँ मुफ़्त हैं।',
  closeNotification: 'सूचना बंद करें',
  confirmFilterChange: 'फ़िल्टर बदलने से चयन साफ़ होगा। जारी रखें?',
  prevPage: 'पिछला पृष्ठ',
  nextPage: 'अगला पृष्ठ',
  searchAccounts: 'खाते खोजें',
};

const id: UxTranslationSlice = {
  openTool: 'Buka Instagram Unfollowers',
  scanFinishedNew: n => `Pemindaian selesai. Ditemukan ${n} unfollower baru.`,
  scanStoppedRateLimit: 'Pemindaian dijeda anti-ban (HTTP 429). Menampilkan hasil sebagian.',
  scanCompletedToast: 'Pemindaian selesai!',
  scanErrorToast: 'Pemindaian terhenti. Menampilkan hasil sebagian.',
  unfollowFinished: 'Proses unfollow selesai!',
  emptyResultsTitle: 'Tidak ada akun di sini',
  emptyResultsHint: 'Coba tab lain atau hapus filter dan pencarian.',
  emptyResultsScanning: 'Memindai daftar following…',
  noSearchResults: 'Tidak ada akun yang cocok dengan pencarian.',
  timingSearchCycles: 'Waktu antar siklus pencarian',
  timingAfterFiveSearch: 'Tunggu setelah lima siklus pencarian',
  timingBetweenUnfollows: 'Waktu antar unfollow',
  timingAfterFiveUnfollows: 'Tunggu setelah lima unfollow',
  statusRateLimited: 'Batas permintaan (429). Dihentikan untuk melindungi akun.',
  statusNoSession: 'Tidak ada sesi Instagram. Muat ulang halaman dan masuk.',
  proTemporarilyFree: 'Semua fitur PRO gratis selama migrasi pembayaran.',
  closeNotification: 'Tutup notifikasi',
  confirmFilterChange: 'Mengubah filter akan menghapus pilihan. Lanjutkan?',
  prevPage: 'Halaman sebelumnya',
  nextPage: 'Halaman berikutnya',
  searchAccounts: 'Cari akun',
};

const ar: UxTranslationSlice = {
  openTool: 'فتح Instagram Unfollowers',
  scanFinishedNew: n => `انتهى الفحص. تم العثور على ${n} غير متابعين جدد.`,
  scanStoppedRateLimit: 'توقف الفحص بسبب الحماية (HTTP 429). عرض نتائج جزئية.',
  scanCompletedToast: 'اكتمل الفحص!',
  scanErrorToast: 'انقطع الفحص. عرض نتائج جزئية.',
  unfollowFinished: 'انتهت عملية إلغاء المتابعة!',
  emptyResultsTitle: 'لا توجد حسابات هنا',
  emptyResultsHint: 'جرّب تبويبًا آخر أو امسح عوامل التصفية والبحث.',
  emptyResultsScanning: 'جارٍ فحص قائمة المتابَعين…',
  noSearchResults: 'لا توجد حسابات مطابقة للبحث.',
  timingSearchCycles: 'الوقت بين دورات البحث',
  timingAfterFiveSearch: 'الانتظار بعد خمس دورات بحث',
  timingBetweenUnfollows: 'الوقت بين إلغاء المتابعة',
  timingAfterFiveUnfollows: 'الانتظار بعد خمس عمليات إلغاء متابعة',
  statusRateLimited: 'تم تجاوز الحد (429). توقف لحماية حسابك.',
  statusNoSession: 'لا توجد جلسة إنستغرام. حدّث الصفحة وسجّل الدخول.',
  proTemporarilyFree: 'كل ميزات PRO مجانية أثناء ترحيل الدفع.',
  closeNotification: 'إغلاق الإشعار',
  confirmFilterChange: 'تغيير عوامل التصفية سيلغي التحديد. متابعة؟',
  prevPage: 'الصفحة السابقة',
  nextPage: 'الصفحة التالية',
  searchAccounts: 'البحث عن حسابات',
};

const ja: UxTranslationSlice = {
  openTool: 'Instagram Unfollowers を開く',
  scanFinishedNew: n => `スキャン完了。新しいアンフォロワーが ${n} 人見つかりました。`,
  scanStoppedRateLimit: 'レート制限（HTTP 429）で一時停止。一部の結果を表示します。',
  scanCompletedToast: 'スキャンが完了しました！',
  scanErrorToast: 'スキャンが中断されました。一部の結果を表示します。',
  unfollowFinished: 'アンフォローが完了しました！',
  emptyResultsTitle: 'アカウントがありません',
  emptyResultsHint: '別のタブを試すか、フィルターと検索をクリアしてください。',
  emptyResultsScanning: 'フォロー中リストをスキャンしています…',
  noSearchResults: '検索に一致するアカウントはありません。',
  timingSearchCycles: '検索サイクル間の待ち時間',
  timingAfterFiveSearch: '5回の検索後の待ち時間',
  timingBetweenUnfollows: 'アンフォロー間の待ち時間',
  timingAfterFiveUnfollows: '5回のアンフォロー後の待ち時間',
  statusRateLimited: 'レート制限（429）。アカウント保護のため停止しました。',
  statusNoSession: 'Instagram のセッションがありません。再読み込みしてログインしてください。',
  proTemporarilyFree: '決済移行中はすべての PRO 機能が無料です。',
  closeNotification: '通知を閉じる',
  confirmFilterChange: 'フィルターを変更すると選択が解除されます。続けますか？',
  prevPage: '前のページ',
  nextPage: '次のページ',
  searchAccounts: 'アカウントを検索',
};

const ko: UxTranslationSlice = {
  openTool: 'Instagram Unfollowers 열기',
  scanFinishedNew: n => `스캔 완료. 새 언팔로워 ${n}명을 찾았습니다.`,
  scanStoppedRateLimit: '안티밴(HTTP 429)으로 일시 중지. 부분 결과를 표시합니다.',
  scanCompletedToast: '스캔이 완료되었습니다!',
  scanErrorToast: '스캔이 중단되었습니다. 부분 결과를 표시합니다.',
  unfollowFinished: '언팔로우가 완료되었습니다!',
  emptyResultsTitle: '여기 계정이 없습니다',
  emptyResultsHint: '다른 탭을 시도하거나 필터와 검색을 지우세요.',
  emptyResultsScanning: '팔로잉 목록을 스캔하는 중…',
  noSearchResults: '검색과 일치하는 계정이 없습니다.',
  timingSearchCycles: '검색 주기 사이 대기 시간',
  timingAfterFiveSearch: '검색 5회 후 대기 시간',
  timingBetweenUnfollows: '언팔로우 사이 대기 시간',
  timingAfterFiveUnfollows: '언팔로우 5회 후 대기 시간',
  statusRateLimited: '요청 한도(429). 계정 보호를 위해 중지했습니다.',
  statusNoSession: 'Instagram 세션이 없습니다. 새로고침 후 로그인하세요.',
  proTemporarilyFree: '결제 이전 동안 모든 PRO 기능이 무료입니다.',
  closeNotification: '알림 닫기',
  confirmFilterChange: '필터를 바꾸면 선택이 해제됩니다. 계속할까요?',
  prevPage: '이전 페이지',
  nextPage: '다음 페이지',
  searchAccounts: '계정 검색',
};

const ru: UxTranslationSlice = {
  openTool: 'Открыть Instagram Unfollowers',
  scanFinishedNew: n => `Сканирование завершено. Найдено новых отписчиков: ${n}.`,
  scanStoppedRateLimit: 'Пауза из‑за антибана (HTTP 429). Показаны частичные результаты.',
  scanCompletedToast: 'Сканирование завершено!',
  scanErrorToast: 'Сканирование прервано. Показаны частичные результаты.',
  unfollowFinished: 'Отписки завершены!',
  emptyResultsTitle: 'Здесь нет аккаунтов',
  emptyResultsHint: 'Выберите другую вкладку или сбросьте фильтры и поиск.',
  emptyResultsScanning: 'Сканируем список подписок…',
  noSearchResults: 'Нет аккаунтов по вашему запросу.',
  timingSearchCycles: 'Пауза между циклами поиска',
  timingAfterFiveSearch: 'Ожидание после пяти циклов поиска',
  timingBetweenUnfollows: 'Пауза между отписками',
  timingAfterFiveUnfollows: 'Ожидание после пяти отписок',
  statusRateLimited: 'Лимит запросов (429). Остановлено для защиты аккаунта.',
  statusNoSession: 'Нет сессии Instagram. Обновите страницу и войдите.',
  proTemporarilyFree: 'Все функции PRO бесплатны на время смены оплаты.',
  closeNotification: 'Закрыть уведомление',
  confirmFilterChange: 'Смена фильтров снимет выделение. Продолжить?',
  prevPage: 'Предыдущая страница',
  nextPage: 'Следующая страница',
  searchAccounts: 'Поиск аккаунтов',
};

const pl: UxTranslationSlice = {
  openTool: 'Otwórz Instagram Unfollowers',
  scanFinishedNew: n => `Skan zakończony. Znaleziono ${n} nowych unfollowers.`,
  scanStoppedRateLimit: 'Skan wstrzymany (anti-ban HTTP 429). Pokazuję częściowe wyniki.',
  scanCompletedToast: 'Skan zakończony!',
  scanErrorToast: 'Skan przerwany. Pokazuję częściowe wyniki.',
  unfollowFinished: 'Proces unfollow zakończony!',
  emptyResultsTitle: 'Brak kont',
  emptyResultsHint: 'Wybierz inną kartę albo wyczyść filtry i wyszukiwanie.',
  emptyResultsScanning: 'Skanowanie listy obserwowanych…',
  noSearchResults: 'Brak kont pasujących do wyszukiwania.',
  timingSearchCycles: 'Czas między cyklami wyszukiwania',
  timingAfterFiveSearch: 'Czekaj po pięciu cyklach wyszukiwania',
  timingBetweenUnfollows: 'Czas między unfollowami',
  timingAfterFiveUnfollows: 'Czekaj po pięciu unfollowach',
  statusRateLimited: 'Limit zapytań (429). Zatrzymano, by chronić konto.',
  statusNoSession: 'Brak sesji Instagram. Odśwież stronę i zaloguj się.',
  proTemporarilyFree: 'Wszystkie funkcje PRO są darmowe podczas migracji płatności.',
  closeNotification: 'Zamknij powiadomienie',
  confirmFilterChange: 'Zmiana filtrów wyczyści zaznaczenie. Kontynuować?',
  prevPage: 'Poprzednia strona',
  nextPage: 'Następna strona',
  searchAccounts: 'Szukaj kont',
};

const nl: UxTranslationSlice = {
  openTool: 'Instagram Unfollowers openen',
  scanFinishedNew: n => `Scan klaar. ${n} nieuwe unfollowers gevonden.`,
  scanStoppedRateLimit: 'Scan gepauzeerd (anti-ban HTTP 429). Gedeeltelijke resultaten.',
  scanCompletedToast: 'Scan voltooid!',
  scanErrorToast: 'Scan onderbroken. Gedeeltelijke resultaten.',
  unfollowFinished: 'Unfollow-proces voltooid!',
  emptyResultsTitle: 'Geen accounts hier',
  emptyResultsHint: 'Probeer een ander tabblad of wis filters en zoekopdracht.',
  emptyResultsScanning: 'Je volglijst wordt gescand…',
  noSearchResults: 'Geen accounts komen overeen met je zoekopdracht.',
  timingSearchCycles: 'Tijd tussen zoekcycli',
  timingAfterFiveSearch: 'Wachten na vijf zoekcycli',
  timingBetweenUnfollows: 'Tijd tussen unfollows',
  timingAfterFiveUnfollows: 'Wachten na vijf unfollows',
  statusRateLimited: 'Limiet bereikt (429). Gestopt om je account te beschermen.',
  statusNoSession: 'Geen Instagram-sessie. Vernieuw de pagina en log in.',
  proTemporarilyFree: 'Alle PRO-functies zijn gratis tijdens de betalingsmigratie.',
  closeNotification: 'Melding sluiten',
  confirmFilterChange: 'Filters wijzigen wist de selectie. Doorgaan?',
  prevPage: 'Vorige pagina',
  nextPage: 'Volgende pagina',
  searchAccounts: 'Accounts zoeken',
};

const vi: UxTranslationSlice = {
  openTool: 'Mở Instagram Unfollowers',
  scanFinishedNew: n => `Quét xong. Tìm thấy ${n} unfollower mới.`,
  scanStoppedRateLimit: 'Tạm dừng chống ban (HTTP 429). Đang hiện kết quả một phần.',
  scanCompletedToast: 'Quét hoàn tất!',
  scanErrorToast: 'Quét bị gián đoạn. Đang hiện kết quả một phần.',
  unfollowFinished: 'Quá trình unfollow đã xong!',
  emptyResultsTitle: 'Không có tài khoản ở đây',
  emptyResultsHint: 'Thử tab khác hoặc xóa bộ lọc và tìm kiếm.',
  emptyResultsScanning: 'Đang quét danh sách đang follow…',
  noSearchResults: 'Không có tài khoản khớp với tìm kiếm.',
  timingSearchCycles: 'Thời gian giữa các chu kỳ tìm',
  timingAfterFiveSearch: 'Chờ sau năm chu kỳ tìm',
  timingBetweenUnfollows: 'Thời gian giữa các lần unfollow',
  timingAfterFiveUnfollows: 'Chờ sau năm lần unfollow',
  statusRateLimited: 'Giới hạn yêu cầu (429). Đã dừng để bảo vệ tài khoản.',
  statusNoSession: 'Không có phiên Instagram. Tải lại trang và đăng nhập.',
  proTemporarilyFree: 'Tất cả tính năng PRO miễn phí trong lúc chuyển cổng thanh toán.',
  closeNotification: 'Đóng thông báo',
  confirmFilterChange: 'Đổi bộ lọc sẽ bỏ chọn người dùng. Tiếp tục?',
  prevPage: 'Trang trước',
  nextPage: 'Trang sau',
  searchAccounts: 'Tìm tài khoản',
};

export const UX_STRINGS: Record<UxLocale, UxTranslationSlice> = {
  en,
  'pt-BR': ptBR,
  es,
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
