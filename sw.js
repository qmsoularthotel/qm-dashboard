// Service Worker unificato — dashboard e TUTTE le app standalone.
// Network-first per tutti gli HTML (sempre aggiornati al refresh),
// cache-first per asset statici (img, js, css).
//
// UN SOLO service worker per tutto il sito, di proposito. Prima ce n'erano
// quattro (sw-housekeeper.js, sw-inventory.js, sw-dvr.js, questo) registrati
// tutti sulla radice: poiché il browser tiene un solo service worker per
// percorso, ogni app che si apriva sostituiva la registrazione dell'altra, e
// all'attivazione cancellava le cache che non riconosceva come proprie. Il
// risultato erano pagine servite a intermittenza da versioni diverse.
// Non reintrodurre service worker per singola app.

// Cambiando questo nome, all'attivazione le cache vecchie vengono cancellate: è il modo
// per liberarsi delle pagine salvate dalle versioni precedenti, che altrimenti resterebbero
// lì a essere servite.
const CACHE = 'qm-v27';

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
  const path = new URL(url).pathname;

  // KV, API, Google Sheets, cataloghi barcode: sempre network, mai cache
  if (
    url.includes('anthropic-proxy') ||
    url.includes('script.google.com') ||
    url.includes('open-meteo.com') ||
    url.includes('openproductsfacts') ||
    url.includes('openfoodfacts') ||
    url.includes('openbeautyfacts')
  ) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // HTML (incluso root con query param tipo /?v=...): network-first
  if (
    path === '/' ||
    path.endsWith('.html')
  ) {
    // Le pagine NON si mettono più in cache, di proposito.
    //
    // Prima si salvavano e, se la rete al risveglio non rispondeva subito, si serviva la
    // copia salvata: all'apertura dell'app da spenta il telefono deve ancora agganciare la
    // connessione, ed è esattamente quel momento. Il risultato era che chiudendo e
    // riaprendo l'app ricompariva la versione vecchia, all'infinito, perché quella copia
    // non conteneva nemmeno il codice capace di accorgersene.
    //
    // A questo si somma il fatto che GitHub Pages manda "cache-control: max-age=600" sugli
    // HTML: senza no-store, il telefono ha comunque il diritto di riusare la pagina per
    // dieci minuti. Qui la si chiede sempre alla rete, senza rete di scorta.
    //
    // Il prezzo è che senza connessione le pagine non si aprono. È accettabile: queste app
    // vivono di dati che stanno sul cloud — senza rete non servirebbero comunque a niente,
    // e una pagina vecchia che mostra numeri sbagliati è peggio di una pagina che non si
    // apre, perché non si vede che è vecchia.
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  // Asset statici (img, js, css): cache-first (il cache buster gestisce gli aggiornamenti)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
