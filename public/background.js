// public/background.js — Service Worker

// --- MINI-DICCIONARIO PARA EL SERVICE WORKER ---
const bgTranslations = {
  en: {
    title: 'Instagram Unfollowers PRO',
    reminder: 'Time for your review! Discover if someone unfollowed you.',
    alertTitle: '🕵️ New Unfollower Detected!',
    alertSingle: u => `${u} just unfollowed you!`,
    alertMulti: (u, extra) => `${u}${extra} unfollowed you!`,
    more: n => ` and ${n} more`,
  },
  es: {
    title: 'Instagram Unfollowers PRO',
    reminder: '¡Hora de tu revisión! Descubre si alguien te dejó de seguir.',
    alertTitle: '🕵️ ¡Traidor Detectado!',
    alertSingle: u => `¡${u} te acaba de dejar de seguir!`,
    alertMulti: (u, extra) => `¡${u}${extra} te dejaron de seguir!`,
    more: n => ` y ${n} más`,
  },
  pt: {
    title: 'Instagram Unfollowers PRO',
    reminder: 'Hora da sua revisão! Descubra se alguém deixou de te seguir.',
    alertTitle: '🕵️ Novo Traidor Detectado!',
    alertSingle: u => `${u} deixou de te seguir!`,
    alertMulti: (u, extra) => `${u}${extra} deixaram de te seguir!`,
    more: n => ` e mais ${n}`,
  },
  fr: {
    title: 'Instagram Unfollowers PRO',
    reminder: "Heure de votre vérification ! Découvrez si quelqu'un s'est désabonné.",
    alertTitle: '🕵️ Nouvel unfollower détecté !',
    alertSingle: u => `${u} vient de se désabonner !`,
    alertMulti: (u, extra) => `${u}${extra} se sont désabonnés !`,
    more: n => ` et ${n} autres`,
  },
  it: {
    title: 'Instagram Unfollowers PRO',
    reminder: 'Tempo di revisione! Scopri se qualcuno ha smesso di seguirti.',
    alertTitle: '🕵️ Nuovo Unfollower Rilevato!',
    alertSingle: u => `${u} ha smesso di seguirti!`,
    alertMulti: (u, extra) => `${u}${extra} hanno smesso di seguirti!`,
    more: n => ` e altri ${n}`,
  },
  de: {
    title: 'Instagram Unfollowers PRO',
    reminder: 'Zeit für deine Überprüfung! Finde heraus, ob dir jemand entfolgt ist.',
    alertTitle: '🕵️ Neuer Entfolger entdeckt!',
    alertSingle: u => `${u} ist dir gerade entfolgt!`,
    alertMulti: (u, extra) => `${u}${extra} sind dir entfolgt!`,
    more: n => ` und ${n} weitere`,
  },
};

function getT() {
  const lang = (navigator.language || 'en').slice(0, 2);
  return bgTranslations[lang] || bgTranslations['en'];
}

// 1. Scheduled scan alarm (default 7 days)
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('ig-scheduled-scan', { periodInMinutes: 60 * 24 * 7 });
});

// 2. Listen for config changes from UI
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes['ig-scan-frequency']) {
      chrome.alarms.create('ig-scheduled-scan', {
        periodInMinutes: 60 * 24 * Number(changes['ig-scan-frequency'].newValue),
      });
    }
    if (changes['ig-last-scan-date']) {
      if (chrome.action) chrome.action.setBadgeText({ text: '' });
    }
  }
});

// 3. Scheduled alarm fires
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== 'ig-scheduled-scan') return;
  if (chrome.action) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  }

  const t = getT();
  chrome.notifications.create('ig-reminder', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title: t.title,
    message: t.reminder,
    requireInteraction: true,
    priority: 2,
  });
});

// 4. Real-Time Unfollower Notifications (Feature 3C)
chrome.runtime.onMessage.addListener(message => {
  if (message.type !== 'REALTIME_UNFOLLOWERS') return;

  const t = getT();
  const count = message.count;
  const usernames = message.usernames.join(', ');

  const extraStr = count > 3 ? t.more(count - 3) : '';
  const body = count === 1 ? t.alertSingle(usernames) : t.alertMulti(usernames, extraStr);

  chrome.notifications.create(`ig-realtime-${Date.now()}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title: t.alertTitle,
    message: body,
    requireInteraction: false,
    priority: 2,
  });

  chrome.action.getBadgeText({}, current => {
    const prev = parseInt(current ?? '0', 10) || 0;
    chrome.action.setBadgeText({ text: String(prev + count) });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  });
});

// 5. Click on notification -> open Instagram
chrome.notifications.onClicked.addListener(notifId => {
  if (notifId.startsWith('ig-')) {
    chrome.tabs.create({ url: 'https://www.instagram.com' });
    chrome.notifications.clear(notifId);
    if (chrome.action) chrome.action.setBadgeText({ text: '' });
  }
});
