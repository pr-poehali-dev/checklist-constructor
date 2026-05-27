const CACHE_NAME = 'checkflow-v1';
const OFFLINE_QUEUE_KEY = 'cf_offline_queue';

// Файлы для кэширования
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API запросы — network first, fallback offline
  if (url.hostname === 'functions.poehali.dev') {
    event.respondWith(
      fetch(event.request.clone()).catch(() => {
        return new Response(JSON.stringify({ error: 'offline', offline: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // Статика — cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Синхронизация офлайн-очереди при восстановлении сети
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-responses') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  // Сообщаем клиенту о необходимости синхронизации
  const clients = await self.clients.matchAll();
  clients.forEach((client) => client.postMessage({ type: 'SYNC_QUEUE' }));
}

// Push уведомления
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'CheckFlow';
  const options = {
    body: data.body || 'Новое задание',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action !== 'close') {
    event.waitUntil(
      self.clients.openWindow(event.notification.data?.url || '/')
    );
  }
});
