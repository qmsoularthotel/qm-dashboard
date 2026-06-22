// Service Worker unificato — QM Dashboard + Distribuzione Culligan
// Network-first per tutti gli HTML (sempre aggiornati al refresh),
// cache-first per asset statici (img, js, css)

const CACHE = 'qm-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // KV, API, Google Sheets: sempre network, mai cache
  if (
    url.includes('anthropic-proxy') ||
    url.includes('script.google.com') ||
    url.includes('open-meteo.com')
  ) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // HTML: network-first — garantisce che Cmd+R carichi sempre la versione aggiornata
  if (
    url.includes('index.html') ||
    url.includes('controllo-mattino.html') ||
    url.includes('breakfast.html') ||
    url.includes('housekeeper.html') ||
    url.includes('inventory.html') ||
    url.endsWith('/')
  ) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Asset statici (img, js, css): cache-first (il cache buster gestisce gli aggiornamenti)
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
