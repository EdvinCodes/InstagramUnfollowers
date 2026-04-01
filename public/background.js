// public/background.js

// 1. Crear la alarma por defecto al instalar la extensión (7 días)
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('ig_scheduled_scan', {
    periodInMinutes: 60 * 24 * 7, // 7 días en minutos
  });
});

// 2. Escuchar cambios desde la UI
chrome.storage.onChanged.addListener((changes, namespace) => {
  // Si el usuario cambia la frecuencia en los Settings PRO
  if (namespace === 'local' && changes.ig_scan_frequency) {
    chrome.alarms.create('ig_scheduled_scan', {
      periodInMinutes: 60 * 24 * changes.ig_scan_frequency.newValue,
    });
  }

  // Limpia el badge rojo cuando el usuario hace un nuevo scan
  if (namespace === 'local' && changes.ig_last_scan_date) {
    if (chrome.action) {
      chrome.action.setBadgeText({ text: '' });
    }
  }
});

// 3. Ejecutar la acción cuando suena la alarma
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'ig_scheduled_scan') {
    // Ponemos el Badge rojo de forma segura
    if (chrome.action) {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    }

    // Lanzamos la notificación
    chrome.notifications.create('ig_reminder', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon.png'),
      title: 'Instagram Unfollowers PRO',
      message: '¡Es hora de tu revisión! Descubre si alguien te ha dejado de seguir.',
      requireInteraction: true,
      priority: 2,
    });
  }
});

// 4. Acción al hacer clic en la notificación
chrome.notifications.onClicked.addListener(notificationId => {
  if (notificationId === 'ig_reminder') {
    chrome.tabs.create({ url: 'https://www.instagram.com/' });
    chrome.notifications.clear(notificationId);

    // Limpiamos el badge rojo de forma segura
    if (chrome.action) {
      chrome.action.setBadgeText({ text: '' });
    }
  }
});
