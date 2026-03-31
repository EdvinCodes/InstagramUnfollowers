// public/background.js

// 1. Programamos el latido del motor
chrome.runtime.onInstalled.addListener(() => {
  console.log('IG Unfollowers PRO: Motor de recordatorios activado (Modo Seguro).');

  // La alarma despertará al Service Worker cada hora para comprobar
  chrome.alarms.create('check_last_scan', {
    delayInMinutes: 1,
    periodInMinutes: 60,
  });
});

// 2. Escuchamos el latido
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'check_last_scan') {
    checkIfScanNeeded();
  }
});

// 3. Lógica inteligente de aviso
async function checkIfScanNeeded() {
  chrome.storage.local.get(['ig_last_scan_date'], result => {
    const lastScan = result.ig_last_scan_date;
    const now = Date.now();

    // 7 días = 7 * 24 * 60 * 60 * 1000 = 604,800,000 ms
    // Lo ponemos en 60.000 ms (1 minuto) para que lo veas funcionar ya.
    const TIME_LIMIT = 604800000;

    // Si nunca ha escaneado, o si ha pasado el tiempo límite...
    if (!lastScan || now - lastScan > TIME_LIMIT) {
      // Ponemos un circulito rojo (badge) en el icono de Chrome
      if (chrome.action) {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      }

      // Lanzamos la notificación al escritorio
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'favicon.svg', // Tu logo
        title: 'Instagram Unfollowers PRO',
        message:
          '¡Hace tiempo que no revisas tu cuenta! Entra para escanear tus nuevos unfollowers.',
        priority: 2,
      });
    }
  });

  // Limpia el badge rojo cuando el usuario inicia un nuevo scan
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.ig_last_scan_date) {
      if (chrome.action) {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  });

  // Abrir Instagram cuando el usuario hace clic en la notificación push
  chrome.notifications.onClicked.addListener(notificationId => {
    if (notificationId === 'ig_reminder') {
      chrome.tabs.create({ url: 'https://www.instagram.com/' });
      chrome.notifications.clear(notificationId);
    }
  });
}
