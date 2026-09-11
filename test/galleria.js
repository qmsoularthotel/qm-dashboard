// Controlli su biancheria-galleria.html — Gestione Biancheria, l'app del Resident Manager
// per Art Resort e Art Suite Santa Brigida.
//
// Dall'11/09/2026 è una COPIA del modulo "Consumo Biancheria" di Compass (le funzioni
// sono le stesse, col prefisso gb/_gb/GB_ invece di bia/_bia/BIA_). Il modulo di Compass
// ha già i suoi controlli in test/controlli.js: qui si controlla ciò che nella copia è
// DIVERSO — i due calendari, il salvataggio solo locale, la lettura dei dati della
// versione semplificata, i pezzi inidonei che escono col sacco — più le regole che
// devono restare identiche fra le due copie.
//
// Lo script della pagina viene caricato da test/node.js (e dal ramo osascript di
// esegui.sh) allo stesso modo di app.js: qui ci sono solo i casi.

sez('Gestione Biancheria (Galleria): copia di Compass, con due calendari');

function _gbQ(o) { var q = _gbVuote(); Object.keys(o || {}).forEach(function (k) { q[k] = o[k]; }); return q; }
function _gbReset() { _gb = { consumi: [], giri: [], resi: [] }; _gbDist = {}; }

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
ok('i resi restano',                           _mig.resi.length, 1);
ok('formato nuovo: si legge com\'è',           _gbMigra({ consumi: [], giri: [{ id: 'a' }, { id: 'b' }] }).giri.length, 2);
ok('niente: archivio vuoto',                   _gbMigra(null).giri.length, 0);

// ── Pezzi inidonei: escono col sacco della consegna, datati PRIMA ──
_gbReset();
_gb.resi.push({ id: 'r1', hotel: 'sb', data: '14/09/2026', tipologia: 'Federa', qta: 2, motivo: 'Macchiata', consegnaId: null });
_gb.resi.push({ id: 'r2', hotel: 'sb', data: '15/09/2026', tipologia: 'Telo doccia', qta: 1, motivo: 'Strappata', consegnaId: null });
_gb.resi.push({ id: 'r3', hotel: 'ar', data: '14/09/2026', tipologia: 'Federa', qta: 5, motivo: 'Usurata', consegnaId: null });
var _rs = _gbResiDaConsegnare('sb', '15/09/2026').map(function (r) { return r.id; }).join(',');
ok('resi: esce quello del giorno prima',       _rs, 'r1');
_gb.giri.push({ id: 'g15', hotel: 'sb', data: '15/09/2026', consegnato: _gbQ({ Federa: 4 }), ricevuto: _gbQ({ Federa: 4 }), ts: 1 });
_gbLegaResi('sb', '15/09/2026');
ok('registrando il giro, esce col sacco',      _gb.resi[0].consegnaId, 'g15');
ok('quello del giorno stesso resta in attesa', _gb.resi[1].consegnaId, null);
ok('l\'altra struttura non viene toccata',     _gb.resi[2].consegnaId, null);

// ── Prossima consegna (per i resi): oggi se Raimondo passa oggi e manca ancora ──
_gbReset();
ok('venerdì AR, non registrata: oggi',         _gbProssimaConsegna('ar', new Date(2026, 8, 11)), '11/09/2026');
_gb.giri.push({ id: 'o', hotel: 'ar', data: '11/09/2026', consegnato: _gbQ({}), ricevuto: _gbQ({ Federa: 1 }), ts: 1 });
ok('venerdì AR, registrata: lunedì',           _gbProssimaConsegna('ar', new Date(2026, 8, 11)), '14/09/2026');
ok('venerdì SB: sabato',                       _gbProssimaConsegna('sb', new Date(2026, 8, 11)), '12/09/2026');
_gbReset();
