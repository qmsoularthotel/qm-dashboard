// Service Worker — Distribuzione Culligan app
// Strategia: network-first per controllo-mattino.html (sempre aggiornato),
// cache-first per asset statici (img, css, font)

const CACHE = 'qm-cm-v19';

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

  // Richieste KV/API: sempre network, mai cache
  if (url.includes('anthropic-proxy')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // controllo-mattino.html: sempre network, aggiorna cache, fallback se offline
  if (url.includes('controllo-mattino.html') || url.endsWith('/controllo-mattino')) {
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
