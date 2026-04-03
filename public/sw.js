const CACHE_NAME = 'v-report-v2';

self.addEventListener('install', () => self.skipWaiting());

// 古いキャッシュを自動削除
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // 全リクエスト Network-first: オンラインなら常に最新を取得、オフラインならキャッシュ
  e.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        return res;
      })
      .catch(() =>
        caches.match(req).then((r) => {
          if (r) return r;
          // ナビゲーションはindex.htmlにフォールバック
          if (req.mode === 'navigate') return caches.match('index.html');
          return new Response('offline', { status: 503 });
        })
      )
  );
});
