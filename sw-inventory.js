// Service Worker — QM Inventario (offline support)
const CACHE = 'qm-inv-v7';

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Richieste al proxy KV: sempre network, mai cache
  if (url.includes('anthropic-proxy') || url.includes('openproductsfacts') ||
      url.includes('openfoodfacts') || url.includes('openbeautyfacts')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  // HTML dinamici: sempre network, fallback cache se offline
  if (url.includes('inventory.html') || url.includes('housekeeper.html') ||
      url.includes('breakfast.html') || url.includes('index.html') ||
      url.includes('controllo-mattino.html') || url.endsWith('/')) {
    e.respondWith(fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request)));
    return;
  }
  // App shell e librerie: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
