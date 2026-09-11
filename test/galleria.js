// Controlli su biancheria-galleria.html — l'app del Resident Manager per Art Resort e
// Art Suite Santa Brigida. Vive fuori da Compass e fuori dal cloud, quindi non ha
// nessun'altra rete sotto: se questi calcoli sbagliano, nessuno se ne accorge finché
// non manca della biancheria e il saldo racconta una storia che non è vera.
//
// Lo script della pagina viene caricato da test/node.js (e dal ramo osascript di
// esegui.sh) allo stesso modo di app.js: qui ci sono solo i casi.

sez('Biancheria Galleria: i due calendari, il periodo e il saldo');

function _bgQ(o) { var q = _bgVuote(); Object.keys(o || {}).forEach(function (k) { q[k] = o[k]; }); return q; }
function _bgReset() { _bg = { consumi: [], consegne: [], resi: [] }; }
var _F = 'Federa', _LM = 'Lenzuolo matrimoniale';

// ── I calendari sono DIVERSI per struttura, ed è la ragione per cui non si poteva
//    riusare il modulo di Compass così com'era: Art Resort lun/mer/ven, Santa Brigida
//    mar/gio/sab. Pescare il calendario dell'altra sposterebbe il periodo di un giorno,
//    cioè farebbe uscire o entrare una giornata intera di consumi.
//    2026-09-14 è un lunedì.
ok('Art Resort: il lunedì passa',            _bgGiornoGiro('ar', new Date(2026, 8, 14)), true);
ok('Art Resort: il martedì no',              _bgGiornoGiro('ar', new Date(2026, 8, 15)), false);
ok('Santa Brigida: il martedì passa',        _bgGiornoGiro('sb', new Date(2026, 8, 15)), true);
ok('Santa Brigida: il lunedì no',            _bgGiornoGiro('sb', new Date(2026, 8, 14)), false);
ok('Art Resort: prima di mer 16 c\'è lun 14',    _bgFmt(_bgCalPrec('ar', new Date(2026, 8, 16))), '14/09/2026');
ok('Art Resort: prima di lun 14 c\'è ven 11',    _bgFmt(_bgCalPrec('ar', new Date(2026, 8, 14))), '11/09/2026');
ok('Santa Brigida: prima di gio 17 c\'è mar 15', _bgFmt(_bgCalPrec('sb', new Date(2026, 8, 17))), '15/09/2026');

// ── Il periodo ritirato: dalla consegna precedente (INCLUSA) al giorno PRIMA di questa.
//    Raimondo passa alle 8, prima che le camere si facciano: il consumo del giorno stesso
//    esce la volta dopo. È la regola che, sbagliata, fa uscire due volte gli stessi pezzi.
_bgReset();
_bg.consegne.push({ id: 'c1', hotel: 'ar', data: '14/09/2026', consegnato: _bgQ({ Federa: 10 }), ricevuto: _bgQ({}), ts: 1 });
var _per = _bgPeriodo('ar', '16/09/2026');
ok('periodo: parte dal giorno della consegna precedente', _bgFmt(_per.dal), '14/09/2026');
ok('periodo: arriva al giorno PRIMA di questa',           _bgFmt(_per.al),  '15/09/2026');
ok('periodo: comanda lo storico, non il calendario',      _per.fonte, 'consegna');
ok('il giorno della consegna resta FUORI dal periodo',
   _bgGiorniPeriodo(_per).map(_bgFmt).join(' '), '14/09/2026 15/09/2026');
// Fino a quattro giorni si scrivono coi nomi: un intervallo di date non dice a colpo
// d'occhio se sono i giorni giusti, "lunedì 14 e martedì 15" sì.
ok('il periodo si legge coi nomi dei giorni', _bgPeriodoTxt(_per), 'di lunedì 14 e martedì 15');

// Primo giro in assoluto: non c'è una consegna precedente, comanda il calendario — e i
// consumi più vecchi restano fuori, perché sono già usciti con i giri fatti prima che
// l'app esistesse.
_bgReset();
_per = _bgPeriodo('ar', '16/09/2026');
ok('primo giro: il "dal" viene dal calendario', _bgFmt(_per.dal), '14/09/2026');
ok('primo giro: la fonte è dichiarata',          _per.fonte, 'calendario');
_per = _bgPeriodo('sb', '17/09/2026');
ok('primo giro: ogni struttura usa il SUO calendario', _bgFmt(_per.dal), '15/09/2026');

// Una consegna saltata non lascia un buco: la successiva copre da sola.
_bgReset();
_bg.consegne.push({ id: 'c1', hotel: 'ar', data: '11/09/2026', consegnato: _bgQ({ Federa: 5 }), ricevuto: _bgQ({ Federa: 5 }), ts: 1 });
ok('consegna saltata: la successiva copre il buco', _bgFmt(_bgPeriodo('ar', '16/09/2026').dal), '11/09/2026');

// ── Somma dei consumi sul periodo, estremi inclusi.
_bgReset();
_bg.consumi.push({ id: 'a', hotel: 'ar', data: '14/09/2026', q: _bgQ({ Federa: 4, 'Lenzuolo matrimoniale': 2 }) });
_bg.consumi.push({ id: 'b', hotel: 'ar', data: '15/09/2026', q: _bgQ({ Federa: 6 }) });
_bg.consumi.push({ id: 'c', hotel: 'ar', data: '16/09/2026', q: _bgQ({ Federa: 99 }) });  // giorno del giro: fuori
_bg.consumi.push({ id: 'd', hotel: 'sb', data: '15/09/2026', q: _bgQ({ Federa: 50 }) });  // altra struttura: fuori
_per = _bgPeriodo('ar', '16/09/2026');
var _somma = _bgSomma('ar', _per.dal, _per.al);
ok('somma: solo i giorni del periodo',       _somma[_F], 10);
ok('somma: le altre voci seguono',           _somma[_LM], 2);
ok('somma: il totale è lo sporco che esce',  _bgTot(_somma), 12);

// ── Il modello, confermato dal QM: quello che prende deve riportarlo.
_bgReset();
_bg.consegne.push({ id: 'c1', hotel: 'ar', data: '14/09/2026', consegnato: _bgQ({ Federa: 20 }), ricevuto: _bgQ({ Federa: 1 }), ts: 1 });
ok('atteso = sporco consegnato la volta prima', _bgTot(_bgAtteso('ar', '16/09/2026')), 20);
ok('alla prima consegna non c\'è un atteso',    _bgAtteso('ar', '14/09/2026'), null);
// L'errore facile ora che le due strutture convivono nello stesso archivio: pescare
// l'atteso da quella sbagliata inventerebbe un ammanco che non esiste.
_bg.consegne.push({ id: 'c2', hotel: 'sb', data: '15/09/2026', consegnato: _bgQ({ Federa: 500 }), ricevuto: _bgQ({ Federa: 500 }), ts: 2 });
ok('l\'atteso non passa MAI da un\'altra struttura', _bgTot(_bgAtteso('ar', '16/09/2026')), 20);

// ── UNO ZERO MAI INSERITO NON È UNO ZERO. L'app salva sempre tutte e sette le voci,
//    quindi una consegna mai compilata arriva con sette zeri dentro: guardare solo se
//    l'oggetto ha delle chiavi non basta. Senza questa regola quelle righe inventano un
//    ammanco pari a tutto ciò che era uscito.
ok('sette zeri = nessuno ha scritto cosa ha riportato', _bgRegistrata({ ricevuto: _bgVuote() }), false);
ok('ricevuto assente = consegna non registrata',        _bgRegistrata({}), false);
ok('un valore vero = consegna registrata',              _bgRegistrata({ ricevuto: _bgQ({ Federa: 1 }) }), true);

_bgReset();
_bg.consegne.push({ id: 'c1', hotel: 'ar', data: '14/09/2026', consegnato: _bgQ({ Federa: 20 }), ricevuto: _bgQ({ Federa: 10 }), ts: 1 });
_bg.consegne.push({ id: 'c2', hotel: 'ar', data: '16/09/2026', consegnato: _bgQ({ Federa: 8 }),  ricevuto: _bgVuote(), ts: 2 });
var _r2 = _bgRiga(_bg.consegne[1]);
ok('consegna non registrata: nessuna differenza inventata', _r2.delta, null);
ok('consegna non registrata: la riga lo dichiara',          _r2.registrata, false);
ok('il saldo esclude le consegne non registrate', _bgSaldo('ar').tot, 0);
ok('e dice su quante consegne è calcolato',       _bgSaldo('ar').n, 0);

// ── Il cumulato per voce: un −2 non dice se mancano le federe o i lenzuoli, ed è quella
//    la sola informazione con cui si contesta qualcosa al fornitore.
_bgReset();
_bg.consegne.push({ id: 'c1', hotel: 'ar', data: '11/09/2026', consegnato: _bgQ({ Federa: 20, 'Lenzuolo matrimoniale': 10 }), ricevuto: _bgQ({ Federa: 1 }), ts: 1 });
_bg.consegne.push({ id: 'c2', hotel: 'ar', data: '14/09/2026', consegnato: _bgQ({ Federa: 15 }), ricevuto: _bgQ({ Federa: 18, 'Lenzuolo matrimoniale': 10 }), ts: 2 });
_bg.consegne.push({ id: 'c3', hotel: 'ar', data: '16/09/2026', consegnato: _bgQ({ Federa: 9 }),  ricevuto: _bgQ({ Federa: 15 }), ts: 3 });
var _sal = _bgSaldo('ar'), _rip = _bgRiepilogo('ar');
ok('cumulato: mancano 2 federe',            _sal.q[_F], -2);
ok('cumulato: i lenzuoli sono in pari',     _sal.q[_LM], 0);
ok('cumulato: totale',                      _sal.tot, -2);
ok('cumulato: su due consegne confrontabili', _sal.n, 2);
// Le tre letture del pannello devono usare lo STESSO insieme di consegne, altrimenti
// "ha portato N su M" e il saldo divergono senza che si capisca perché.
ok('portato meno dovuto coincide col saldo', _rip.portato - _rip.dovuto, _sal.tot);

// Una voce ATTESA e MAI TORNATA è l'ammanco più grave e la riga che si va a cercare:
// filtrarla via perché "portato è zero" è l'errore facile.
_bgReset();
_bg.consegne.push({ id: 'c1', hotel: 'ar', data: '14/09/2026', consegnato: _bgQ({ Federa: 20, 'Lenzuolo matrimoniale': 5 }), ricevuto: _bgQ({ Federa: 1 }), ts: 1 });
_bg.consegne.push({ id: 'c2', hotel: 'ar', data: '16/09/2026', consegnato: _bgQ({}), ricevuto: _bgQ({ Federa: 20 }), ts: 2 });
var _det = _bgDettaglio(_bg.consegne[1]);
var _vLM = _det.filter(function (x) { return x.voce === _LM; })[0];
ok('una voce attesa e mai tornata resta in tabella', !!_vLM, true);
ok('e dice quanti ne mancano',                       _vLM ? _vLM.delta : null, -5);

// ── Solo un AMMANCO è rosso. In pari e rientro in più sono tutte e due notizie buone:
//    un "+8" dipinto di rosso si legge come una perdita e fa perdere fiducia nel pannello.
//    Il colore del numero e la tinta della riga devono dire la stessa cosa.
ok('ammanco: numero rosso',                 _bgCol(-3), 'var(--red)');
ok('in pari: numero verde',                 _bgCol(0),  'var(--green)');
ok('rientro in più: VERDE, non rosso',      _bgCol(5),  'var(--green)');
ok('ammanco: riga tinta di rosso',          _bgCls(-1), 'bg-neg');
ok('rientro in più: riga tinta di verde',   _bgCls(1),  'bg-pos');
ok('in pari: nessuna tinta sulla riga',     _bgCls(0),  '');
ok('il testo dice "in pari", non "0"',      _bgTxt(0),  'in pari');

// ── I pezzi inidonei seguono lo STESSO taglio dei consumi: quelli trovati il giorno del
//    giro non sono nel sacco delle 8. Se cambia l'orario di Raimondo vanno cambiati
//    tutti e due insieme.
_bgReset();
_bg.resi.push({ id: 'r1', hotel: 'ar', data: '15/09/2026', tipologia: _F, qta: 2, consegnaId: null });
_bg.resi.push({ id: 'r2', hotel: 'ar', data: '16/09/2026', tipologia: _F, qta: 3, consegnaId: null });
_bg.resi.push({ id: 'r3', hotel: 'sb', data: '15/09/2026', tipologia: _F, qta: 9, consegnaId: null });
ok('resi aperti: solo la struttura selezionata', _bgResiAperti('ar').length, 2);
var _d16 = _bgParse('16/09/2026');
var _escono = _bgResiAperti('ar').filter(function (x) { return _bgParse(x.data) < _d16; });
ok('il reso del giorno stesso NON esce col sacco', _escono.length, 1);
ok('esce quello del giorno prima',                 _escono[0].id, 'r1');

// ── Le due strutture non si mescolano mai, in nessuna lettura.
_bgReset();
_bg.consumi.push({ id: 'a', hotel: 'sb', data: '15/09/2026', q: _bgQ({ Federa: 99 }) });
ok('i consumi di Santa Brigida non compaiono in Art Resort', _bgConsumi('ar').length, 0);
ok('e ci sono in Santa Brigida',                             _bgConsumi('sb').length, 1);

_bgReset();

// ── La data proposta è la prossima consegna DA REGISTRARE, non il prossimo giorno di
//    calendario: chi è rimasto indietro deve vedersi proporre la più VECCHIA che manca,
//    perché ogni consegna ha bisogno della precedente per sapere cosa era uscito. E se
//    la data proposta fosse una già registrata, la maschera si aprirebbe sull'avviso
//    "esiste già" tutte le volte. (Oggi nei controlli è il 11/09/2026, un venerdì.)
_bgReset();
_bg.consegne.push({ id: 'c1', hotel: 'ar', data: '11/09/2026', consegnato: _bgQ({ Federa: 5 }), ricevuto: _bgQ({ Federa: 5 }), ts: 1 });
ok('proposta: salta il giorno già registrato',   _bgFmt(_bgCalProx('ar')), '14/09/2026');
_bg.consegne.push({ id: 'c2', hotel: 'ar', data: '14/09/2026', consegnato: _bgQ({ Federa: 5 }), ricevuto: _bgQ({ Federa: 5 }), ts: 2 });
ok('proposta: e anche il successivo',            _bgFmt(_bgCalProx('ar')), '16/09/2026');
// Rimasti indietro: l'ultima registrata è vecchia, si riparte da lì, non da oggi.
_bgReset();
_bg.consegne.push({ id: 'c1', hotel: 'ar', data: '26/08/2026', consegnato: _bgQ({ Federa: 5 }), ricevuto: _bgQ({ Federa: 5 }), ts: 1 });
ok('rimasti indietro: propone la più vecchia che manca', _bgFmt(_bgCalProx('ar')), '28/08/2026');
// Ogni struttura resta sul suo calendario anche qui.
_bgReset();
_bg.consegne.push({ id: 'c1', hotel: 'sb', data: '26/08/2026', consegnato: _bgQ({ Federa: 5 }), ricevuto: _bgQ({ Federa: 5 }), ts: 1 });
ok('la proposta segue il calendario della struttura', _bgFmt(_bgCalProx('sb')), '27/08/2026');

_bgReset();

// ── Cambiando linguetta la data proposta si ricalcola. È uno STATO del modulo e non un
//    valore riletto dal campo, perché il campo sopravvive al ridisegno: Santa Brigida si
//    apriva sulla data di Art Resort, con l'avviso "di norma passa martedì, giovedì e
//    sabato" che accusava l'utente di un errore fatto dall'app.
_bgReset();
_bgHotel = 'ar';
_bgDataConsegna = null;
ok('AR propone un suo giorno di calendario', _bgGiornoGiro('ar', _bgParse(_bgDataConsegnaCorrente('ar'))), true);
bgSetDataConsegna('2026-09-16');
ok('la data scelta a mano resta',            _bgDataConsegnaCorrente('ar'), '16/09/2026');
bgSetHotel('sb');
ok('cambiando struttura la data si azzera',  _bgDataConsegna, null);
ok('e la nuova proposta è del calendario di Santa Brigida',
   _bgGiornoGiro('sb', _bgParse(_bgDataConsegnaCorrente('sb'))), true);
_bgHotel = 'ar';
_bgDataConsegna = null;
_bgReset();

// ── La distinta si prepara la VIGILIA, e il promemoria lo dice (11/09/2026) ──
//    Raimondo passa alle 8: il foglio va stampato il pomeriggio prima. Con due calendari
//    sfalsati quasi ogni giorno è la vigilia di una delle due strutture, e sbagliare
//    struttura vorrebbe dire far trovare Raimondo senza distinta.
//    2026-09-14 è un lunedì: vigilia di Santa Brigida (mar), non di Art Resort (mer).
_bgReset();
var _lun = new Date(2026, 8, 14), _mar = new Date(2026, 8, 15);
var _cSb = _bgCompiti('sb', _lun), _cAr = _bgCompiti('ar', _lun);
ok('lunedì è la vigilia di Santa Brigida',          _cSb.vigilia, true);
ok('ma non di Art Resort',                          _cAr.vigilia, false);
ok('Santa Brigida: c\'è la distinta di domani',     _cSb.passi.some(function (p) { return p.tipo === 'distinta' && p.data === '15/09/2026'; }), true);
ok('Art Resort: nessuna distinta da stampare',      _cAr.passi.some(function (p) { return p.tipo === 'distinta'; }), false);
ok('Art Resort: lunedì passa, va registrata',       _cAr.passi.some(function (p) { return p.tipo === 'registra'; }), true);
ok('Art Resort: la prossima distinta è martedì',    _cAr.vigiliaProssimo, '15/09/2026');
// I consumi di oggi vengono PRIMA della distinta: finiscono nel sacco di domani.
ok('prima i consumi, poi la distinta',              _cSb.passi.map(function (p) { return p.tipo; }).join(','), 'consumi,distinta');
// Stampata la distinta, il promemoria si spegne — e solo per quella struttura e data.
_bgSegnaDistinta('sb', '15/09/2026');
ok('stampata, il promemoria si spegne',             _bgCompiti('sb', _lun).passi.some(function (p) { return p.tipo === 'distinta'; }), false);
ok('non spegne l\'altra struttura',                 _bgDistStampata('ar', '15/09/2026'), false);
// Una consegna registrata con sette zeri non è "fatta": è un modulo mai compilato.
_bg.consegne.push({ id: 'z', hotel: 'sb', data: '15/09/2026', consegnato: _bgQ({ Federa: 5 }), ricevuto: _bgQ({}), ts: 1 });
ok('consegna a zero: resta da registrare',          _bgCompiti('sb', _mar).passi.some(function (p) { return p.tipo === 'registra'; }), true);
_bg.consegne[0].ricevuto = _bgQ({ Federa: 5 });
ok('consegna registrata: il passo sparisce',        _bgCompiti('sb', _mar).passi.some(function (p) { return p.tipo === 'registra'; }), false);
// Un archivio salvato prima delle distinte non ha il campo: non deve rompersi.
_bg = { consumi: [], consegne: [], resi: [] };
ok('archivio vecchio senza distinte: si legge',     _bgDistStampata('sb', '15/09/2026'), false);
_bgReset();

// ── Distinta dei resi: escono quelli datati PRIMA della consegna (11/09/2026) ──
//    Stesso taglio dello sporco: i pezzi trovati il giorno stesso non sono nel sacco
//    delle 8. Stampare quelli sbagliati darebbe a Raimondo un foglio che non combacia
//    col sacco che ha in mano.
_bgReset();
_bg.resi.push({ id: 'r1', hotel: 'sb', data: '14/09/2026', tipologia: 'Federa', qta: 2, motivo: 'Macchiata', consegnaId: null });
_bg.resi.push({ id: 'r2', hotel: 'sb', data: '15/09/2026', tipologia: 'Telo doccia', qta: 1, motivo: 'Strappata', consegnaId: null });
_bg.resi.push({ id: 'r3', hotel: 'ar', data: '14/09/2026', tipologia: 'Federa', qta: 5, motivo: 'Usurata', consegnaId: null });
_bg.resi.push({ id: 'r4', hotel: 'sb', data: '13/09/2026', tipologia: 'Federa', qta: 9, motivo: 'Usurata', consegnaId: 'vecchia' });
var _rs = _bgResiDaConsegnare('sb', '15/09/2026').map(function (r) { return r.id; }).join(',');
ok('resi: esce quello del giorno prima',           _rs.indexOf('r1') >= 0, true);
ok('resi: quello del giorno stesso resta',          _rs.indexOf('r2') >= 0, false);
ok('resi: l\'altra struttura non entra',            _rs.indexOf('r3') >= 0, false);
ok('resi: uno già uscito non esce due volte',       _rs.indexOf('r4') >= 0, false);
_bgReset();
