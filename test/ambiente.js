// Ambiente finto per far girare app.js fuori dal browser.
//
// app.js dà per scontati document, window, fetch, localStorage e altro: qui vengono
// sostituiti con versioni innocue, così il file si carica per intero e le sue funzioni
// diventano richiamabili dai controlli. Niente rete, niente pagina, nessun dato vero.
//
// Perché caricare TUTTO app.js invece di ritagliarne dei pezzi: ritagliare per numero di
// riga si rompe a ogni modifica del file, ed è già successo più volte. Così invece i
// controlli restano validi anche quando il codice si sposta.

var _noop = function () {};

// Elemento finto: risponde a qualunque cosa senza fare niente.
var _el = new Proxy({}, {
  get: function (t, k) {
    if (k === 'style')     return new Proxy({}, { get: _noop, set: function () { return true; } });
    if (k === 'classList') return { add: _noop, remove: _noop, contains: function () { return false; }, toggle: _noop };
    if (k === 'dataset')   return {};
    if (k === 'addEventListener' || k === 'removeEventListener' || k === 'remove' ||
        k === 'click' || k === 'focus' || k === 'appendChild' || k === 'scrollIntoView' ||
        k === 'setAttribute' || k === 'removeAttribute') return _noop;
    if (k === 'querySelectorAll') return function () { return []; };
    if (k === 'querySelector')    return function () { return _el; };
    if (k === 'value' || k === 'textContent' || k === 'innerHTML') return '';
    if (k === 'files') return [];
    return undefined;
  },
  set: function () { return true; }
});

var document = {
  getElementById: function () { return _el; },
  querySelector:  function () { return _el; },
  querySelectorAll: function () { return []; },
  createElement:  function () { return _el; },
  addEventListener: _noop, removeEventListener: _noop,
  body: _el, documentElement: _el, head: _el, visibilityState: 'visible'
};

function _memoria() {
  return { _d: {},
    getItem: function (k) { return this._d[k] || null; },
    setItem: function (k, v) { this._d[k] = String(v); },
    removeItem: function (k) { delete this._d[k]; } };
}
var localStorage = _memoria();
var sessionStorage = _memoria();

var window = {
  innerWidth: 1400, innerHeight: 900,
  addEventListener: _noop, removeEventListener: _noop,
  location: { search: '', href: 'https://compass-qm.com/', replace: _noop, reload: _noop },
  open: function () { return null; },
  matchMedia: function () { return { matches: false, addListener: _noop, addEventListener: _noop }; },
  scrollTo: _noop, getComputedStyle: function () { return {}; }
};
var navigator = { serviceWorker: { register: function () { return Promise.resolve({}); }, addEventListener: _noop }, userAgent: 'test' };

// Nessuna chiamata di rete parte davvero: risponde sempre "niente dati".
function fetch() {
  return Promise.resolve({ ok: false, status: 0,
    json: function () { return Promise.resolve({}); },
    text: function () { return Promise.resolve(''); } });
}
function setInterval() { return 0; }  function clearInterval() {}
function setTimeout()  { return 0; }  function clearTimeout()  {}
function requestAnimationFrame() { return 0; }
var performance = { getEntriesByType: function () { return [{ type: 'navigate' }]; }, now: function () { return 0; } };
var pdfjsLib = { GlobalWorkerOptions: {}, getDocument: function () { return { promise: Promise.resolve({ numPages: 0 }) }; } };
var alert = _noop;
var confirm = function () { return true; };
var prompt = function () { return null; };
var crypto = { randomUUID: function () { return 'test-uuid'; } };
var btoa = function (s) { return s; };
var atob = function (s) { return s; };
