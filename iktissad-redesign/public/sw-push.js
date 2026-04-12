// Service Worker for Web Push Notifications — IKTISSAD
// This file must be served from the root for scope coverage.

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'الإقتصاد والأعمال',
      body: event.data.text(),
    };
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/badge-72.png',
    dir: 'rtl',
    lang: 'ar',
    tag: payload.articleId || 'iktissad-notification',
    renotify: true,
    data: {
      url: payload.url || '/',
      articleId: payload.articleId,
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'الإقتصاد والأعمال', options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If a tab is already open, focus it
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
