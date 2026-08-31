// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// プッシュ通知の受信
self.addEventListener('push', (event) => {
  let data = {
    title: 'チケポチ！からのお知らせ🐾',
    body: '観劇に関する新しいお知らせがありますワン！',
    icon: '/images/mascot/icon_app_yellow.png',
    badge: '/images/mascot/icon_app_yellow.png',
    url: '/',
    notifMode: 'ALL' // 'ALL' | 'BADGE_ONLY' | 'OFF'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  if (data.notifMode === 'OFF') {
    return;
  }

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

      // バッジのみの場合はバナー表示をスキップ
      if (data.notifMode === 'BADGE_ONLY') {
        return;
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

      return self.registration.showNotification(data.title, options);
    })()
  );
});

// 通知タップ時
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
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