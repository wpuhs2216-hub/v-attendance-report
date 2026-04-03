const CACHE_NAME = 'v-report-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // ナビゲーションリクエストはindex.htmlにフォールバック（PWA 404対策）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
