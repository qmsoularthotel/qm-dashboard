// Service Worker — Housekeeper app
// Strategia: network-first per housekeeper.html (sempre aggiornato),
// cache-first per asset statici (img, css, font)

const CACHE = 'qm-hk-v1';

self.addEventListener('install', e => {
  self.skipWaiting(); // attiva immediatamente senza aspettare tab chiuse
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()) // prende controllo di tutti i tab aperti
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // housekeeper.html: sempre network, aggiorna cache, fallback se offline
  if (url.includes('housekeeper.html') || url.endsWith('/housekeeper')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Asset statici (img, js, css): cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }))
  );
});
