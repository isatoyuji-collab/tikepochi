// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// プッシュ通知受信時のバッジ点灯
self.addEventListener('push', (event) => {
  let data = {
    title: 'チケポチ！からのお知らせ🐾',
    body: '観劇に関する新しいお知らせがありますワン！',
    icon: '/images/mascot/icon_app_yellow.png',
    badge: '/images/mascot/icon_app_yellow.png',
    url: '/'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/images/mascot/icon_app_yellow.png',
    badge: data.badge || '/images/mascot/icon_app_yellow.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    (async () => {
      // 🔴 アプリアイコンにバッジを点灯
      if ('setAppBadge' in navigator) {
        try {
          await navigator.setAppBadge(1);
        } catch (err) {
          console.error('Badge error:', err);
        }
      }
      return self.registration.showNotification(data.title, options);
    })()
  );
});

// 通知タップ時のバッジ消去 ＆ 画面オープン
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      // ⚪ バッジをクリア
      if ('clearAppBadge' in navigator) {
        try {
          await navigator.clearAppBadge();
        } catch (err) {
          console.error('Clear badge error:', err);
        }
      }

      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })()
  );
});