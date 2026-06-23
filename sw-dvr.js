// Service Worker — DVR app
// Strategia: network-first per dvr.html (sempre aggiornato),
// cache-first per asset statici

const CACHE = 'qm-dvr-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Proxy/KV: sempre network, mai cache
  if (url.includes('anthropic-proxy') || url.includes('workers.dev')) {
    return;
  }

  // dvr.html: network-first, aggiorna cache, fallback offline
  if (url.includes('dvr.html') || url.endsWith('/dvr')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Asset statici: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }))
  );
});
