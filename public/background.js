// 1. Al instalar la extensión, programamos la alarma
chrome.runtime.onInstalled.addListener(() => {
  console.log('IG Unfollowers PRO: Motor en segundo plano activado.');

  // Creamos una alarma. Para producción será cada 7 días (10080 minutos).
  // ¡Pero para probar ahora mismo, la ponemos a 1 minuto!
  chrome.alarms.create('ig_scheduled_scan', {
    delayInMinutes: 1,
    periodInMinutes: 10080,
  });
});

// 2. Escuchamos el latido de la alarma
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'ig_scheduled_scan') {
    console.log('⏰ Alarma disparada: Iniciando comprobación silenciosa...');

    // Aquí irá la lógica real de comparar seguidores con la base de datos
    // Por ahora, lanzamos la notificación push de prueba:
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'favicon.svg', // Asegúrate de que este archivo existe en tu carpeta public
      title: 'Instagram Unfollowers PRO',
      message: "It's time to check your account! You might have new unfollowers.",
      priority: 2,
    });
  }
});
