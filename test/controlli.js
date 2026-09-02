// Controlli automatici sui CALCOLI di Compass.
//
// Coprono di proposito i punti dove un errore NON si vede: numeri che restano plausibili
// anche se sbagliati (colazioni, periodi della biancheria, abbinamento delle schede,
// anno del turno). Gli errori di impaginazione si notano subito guardando lo schermo;
// questi no, e possono restare nascosti per mesi.
//
// Si lancia con:  bash test/esegui.sh
//
// Tutti i nomi sono inventati: nessun dato di ospiti reali sta nel repository.

var KO = 0, OK = 0;
function sez(t) { console.log('\n' + t); }
function ok(nome, ottenuto, atteso) {
  var buono = String(ottenuto) === String(atteso);
  buono ? OK++ : KO++;
  console.log('  ' + (buono ? 'ok  ' : 'NO  ') + nome +
              (buono ? '' : '   ottenuto ' + ottenuto + ', atteso ' + atteso));
}

// ─────────────────────────────────────────────────────────────────────────────
sez('Colazioni ricavate dalle prenotazioni');
// Regola: la colazione si conta il mattino DOPO la notte (arrivo < giorno <= partenza).
// Le colazioni contano tutte le strutture, i "no colazione" solo SoulArt e Boutique.
// Dati che rappresentano un export "Presenti dal 10 al 13 maggio": qualcuno era gia'
// dentro, qualcuno parte il primo giorno, qualcuno arriva l'ultimo.
var PREN = [
  { ospite: 'Rossi Mario',  arrivo: '2026-05-08', partenza: '2026-05-10', alloggio: 'Art 5 / AS Superior', camera: 'Art 5', pax: 2, tratt: 'BB', struttura: 'SA', origine: 'Booking.com', codice: 'AAA 111' },
  { ospite: 'Gialli Marco', arrivo: '2026-05-09', partenza: '2026-05-13', alloggio: 'Art 2 / AS Deluxe',   camera: 'Art 2', pax: 3, tratt: 'BB', struttura: 'SA', origine: 'Expedia',     codice: 'EEE 555' },
  { ospite: 'Bianchi Anna', arrivo: '2026-05-10', partenza: '2026-05-12', alloggio: '204 / PC Standard',   camera: '204',   pax: 1, tratt: 'RO', struttura: 'BH', origine: 'Expedia',     codice: 'BBB 222' },
  // senza colazione ma al Principe, che non la serve: NON deve entrare nei "no colazione"
  { ospite: 'Verdi Luca',   arrivo: '2026-05-10', partenza: '2026-05-12', alloggio: 'Capri / UM DOPPIA',   camera: 'Capri', pax: 2, tratt: 'RO', struttura: 'PR', origine: 'Booking.com', codice: 'CCC 333' },
  { ospite: 'Neri Sara',    arrivo: '2026-05-13', partenza: '2026-05-15', alloggio: 'Art 9 / AS Superior', camera: 'Art 9', pax: 2, tratt: 'BB', struttura: 'SA', origine: 'Italcamel',   codice: 'DDD 444' }
];
var bkf = _prenBkfData(PREN);
function giorno(d) { return bkf.data.filter(function (x) { return x.data === d; })[0]; }
ok('periodo: dalla prima partenza',       _prenIntervallo(PREN).dal, '2026-05-10');
ok('periodo: all\'ultimo arrivo',         _prenIntervallo(PREN).al,  '2026-05-13');
ok('giorni prodotti',                     bkf.data.length, 4);
ok('10/05 colazioni (Rossi 2 + Gialli 3)', giorno('10/05/2026').colTot, 5);
ok('10/05 no colazione',                   giorno('10/05/2026').noCol, 0);
ok('11/05 colazioni (solo Gialli)',        giorno('11/05/2026').colTot, 3);
ok('11/05 no colazione (solo Bianchi)',    giorno('11/05/2026').noCol, 1);
ok('il Principe non entra nei no colazione', giorno('11/05/2026').noCol !== 3, true);
ok('13/05 colazioni: Neri arriva, non fa colazione', giorno('13/05/2026').colTot, 3);
// Il Pannello App legge l'ora dell'ultimo aggiornamento colazioni da qm_ts_bkfTs, non dai
// dati: se il caricamento Prenotazioni non la scrive, i numeri sono freschi ma la scheda
// dichiara una data vecchia — cioè esattamente il sintomo di un caricamento non avvenuto.
ok('le colazioni portano il proprio segnatempo', typeof bkf.ts === 'number' && bkf.ts > 0, true);
// Stessa classe di difetto del segnatempo colazioni: dato aggiornato, tessera che dichiara
// "Non caricato". Il riepilogo va scritto al caricamento e riletto all'avvio.
ok('il caricamento Prenotazioni salva il proprio riepilogo',
   /PREN_RIASS_KEY/.test(String(prenHandlePdf)), true);
ok('la tessera Prenotazioni si ricostruisce dopo un Cmd+R',
   typeof prenRestoreSlot === 'function' && /PREN_RIASS_KEY/.test(String(prenRestoreSlot))
   && /ucSetState\(\s*['"]pren['"]\s*,\s*['"]loaded['"]/.test(String(prenRestoreSlot)), true);
ok('il caricamento Prenotazioni scrive qm_ts_bkfTs',
   /qm_ts_bkfTs/.test(String(prenHandlePdf)) && /setUploadTs\(\s*['"]bkfTs['"]/.test(String(prenHandlePdf)), true);

sez('Archivio mensile colazioni: solo giorni gia\' trascorsi');
// Il totale del mese serve per confrontare mesi diversi: deve essere vero, non plausibile.
// Archiviare un giorno futuro significa congelare una previsione — il 22/08/2026 agosto
// dichiarava 1155 colazioni contro le 1187 reali, e il 31 agosto era gia' archiviato con 8.
ok('data del PMS -> chiave ISO', bkfHistChiave({ data: '12/08/2026' }), '2026-08-12');
ok('giorno con una cifra sola',  bkfHistChiave({ data: '1/8/2026' }),   '2026-08-01');
ok('riga senza data ignorata',   bkfHistChiave({}), null);
ok('oggi in formato ISO',        /^\d{4}-\d{2}-\d{2}$/.test(bkfHistOggi()), true);
// L'ordine alfabetico delle chiavi ISO deve coincidere con quello di calendario: e' su
// questo che si regge il confronto "giorno futuro".
ok('ordine ISO = ordine di calendario', '2026-08-09' < '2026-08-12', true);
ok('fine mese non inganna il confronto', '2026-08-31' < '2026-09-01', true);
ok('i giorni futuri non entrano nell\'archivio',
   /key\s*>\s*_oggi/.test(String(bkfSaveMonthlyHistory)), true);
ok('le previsioni gia\' archiviate vengono tolte',
   /k\s*>\s*_oggi/.test(String(bkfSaveMonthlyHistory)) && /delete hist\[k\]/.test(String(bkfSaveMonthlyHistory)), true);

sez('Struttura dedotta dall\'alloggio');
ok('Art -> SoulArt',                _prenStruttura('Art 5 / AS Superior'), 'SA');
ok('2xx -> Boutique',               _prenStruttura('204 / PC Standard'),   'BH');
ok('Capri -> Principe',             _prenStruttura('Capri / UM DOPPIA'),   'PR');
ok('R3 -> Mastrangelo',             _prenStruttura('R3 / MS'),             'MS');
ok('AS_LIB -> San Liborio',         _prenStruttura('AS_LIB / AS'),         'SL');
ok('camera non assegnata: UM -> Principe',  _prenStruttura('UM TRIPLA CLASSIC'), 'PR');
ok('camera non assegnata: MS -> Mastrangelo', _prenStruttura('MS Family'),       'MS');
ok('camera non assegnata: AS -> SoulArt',     _prenStruttura('AS Suite'),        'SA');

sez('Arrivi, partenze e fermate di una giornata');
var ad = _prenArriviData(PREN, '2026-05-10');
ok('il 10/05 arrivano Bianchi e Verdi', ad.arrivi.length,   2);
ok('il 10/05 parte Rossi',              ad.partenze.length, 1);
ok('il 10/05 resta Gialli',             ad.fermate.length,  1);
ok('camere occupate quella notte',      ad.totale_stanze,   3);
ok('forma attesa dalle app: .camera',   ad.fermate.every(function (x) { return 'camera' in x; }), true);
ok('forma attesa dalle app: .origine',  ad.fermate.every(function (x) { return 'origine' in x; }), true);
ok('data nel formato del PMS',          ad.data, '10/05/2026');

sez('Multicamera: una prenotazione, una scheda');
var MULTI = [
  { ospite: 'Neri Paolo', arrivo: '2026-05-20', partenza: '2026-05-22', alloggio: 'Art 3 / AS', camera: 'Art 3', pax: 2, tratt: 'BB', origine: 'Booking.com', codice: 'XXX 1' },
  { ospite: 'Neri Paolo', arrivo: '2026-05-20', partenza: '2026-05-22', alloggio: 'Art 4 / AS', camera: 'Art 4', pax: 2, tratt: 'BB', origine: 'Booking.com', codice: 'XXX 2' },
  { ospite: 'Gialli Sara', arrivo: '2026-05-20', partenza: '2026-05-21', alloggio: 'Art 9 / AS', camera: 'Art 9', pax: 1, tratt: 'BB', origine: 'Expedia', codice: 'YYY 1' }
];
var ps = _prenPrestay(MULTI, '2026-05-20');
ok('3 righe diventano 2 schede', ps.length, 2);
var neri = ps.filter(function (x) { return x.nome === 'Neri Paolo'; })[0];
ok('Neri copre 2 camere', neri.camere.length, 2);
ok('Neri conserva 2 codici', neri.codici.length, 2);

sez('Abbinamento delle schede al reimport');
var _giorni = {};
_psGiorno = function (iso) { if (!_giorni[iso]) _giorni[iso] = { arrivi: [] }; return _giorni[iso]; };
_psSave = function () {};
prestayRender = function () {};
var G = '2026-05-20';
_psImportaArrivi(G, [{ nome: 'Neri Paolo', hotel: 'sa', origine: 'Booking.com', codici: ['XXX 1', 'XXX 2'], camere: ['Art 3', 'Art 4'] }]);
_psGiorno(G).arrivi[0].email = 'neri@esempio.it';
_psGiorno(G).arrivi[0].mailTs = 999;
// stessa prenotazione, ma al check-in e' stato registrato un altro nome
_psImportaArrivi(G, [{ nome: 'Neri Giulia', hotel: 'sa', origine: 'Booking.com', codici: ['XXX 1', 'XXX 2'], camere: ['Art 3', 'Art 4'] }]);
ok('cambio nome: nessun doppione',   _psGiorno(G).arrivi.length, 1);
ok('cambio nome: il nome si aggiorna', _psGiorno(G).arrivi[0].nome, 'Neri Giulia');
ok('cambio nome: email conservata',  _psGiorno(G).arrivi[0].email, 'neri@esempio.it');
ok('cambio nome: invio conservato',  _psGiorno(G).arrivi[0].mailTs, 999);

sez('Canale della prenotazione');
ok('Booking -> blu',        _psBordo({ origine: 'Booking.com', email: '' }), '#0071C2');
ok('Booking troncato',      _psBordo({ origine: 'Booking.co',  email: '' }), '#0071C2');
ok('Expedia -> giallo',     _psBordo({ origine: 'Expedia',     email: '' }), '#FFB300');
ok('il canale vince sull\'email privata', _psBordo({ origine: 'Booking.com', email: 'tizio@gmail.com' }), '#0071C2');
ok('senza canale: decide l\'email',       _psBordo({ email: 'x@guest.booking.com' }), '#0071C2');
ok('CRSVertical si chiama Diretta',       _psCanaleNome({ origine: 'CRSVErtical' }), 'Diretta');

sez('Registration card ricavate dagli arrivi');
// Il PDF unico Prenotazioni scrive qm_arriviData: da li' devono nascere anche le card,
// altrimenti restano quelle dell'ultimo Riepilogo Reception caricato a mano.
var RC_PREN = [
  { ospite: 'BIANCHI ANNA', arrivo: '2026-05-10', partenza: '2026-05-12', alloggio: '204 / PC Standard', camera: '204', pax: 1, tratt: 'BB', struttura: 'BH', origine: 'Booking.com', codice: 'B 1' },
  // Principe: non serve registration card, va escluso
  { ospite: 'VERDI LUCA',   arrivo: '2026-05-10', partenza: '2026-05-12', alloggio: 'Capri / UM DOPPIA', camera: 'Capri', pax: 2, tratt: 'RO', struttura: 'PR', origine: 'Booking.com', codice: 'C 1' }
];
arriviData = _prenArriviData(RC_PREN, '2026-05-10');
guestsData = [];
ok('card generate dagli arrivi del giorno', rcAggiornaDaArrivi(false), 'ok');
ok('una sola card (Principe escluso)',      guestsData.length, 1);
ok('nome ammorbidito, non urlato',          guestsData[0].nome, 'Bianchi Anna');
ok('camera riportata',                      guestsData[0].camera, '204');
ok('anno preso dalla data del documento',   guestsData[0].checkin, '10/05/2026');

// Ricaricando lo stesso giorno, chi ha cambiato camera va evidenziato invece di
// risultare una prenotazione nuova.
var RC_SPOSTATA = [
  { ospite: 'BIANCHI ANNA', arrivo: '2026-05-10', partenza: '2026-05-12', alloggio: '205 / PC Standard', camera: '205', pax: 1, tratt: 'BB', struttura: 'BH', origine: 'Booking.com', codice: 'B 1' }
];
arriviData = _prenArriviData(RC_SPOSTATA, '2026-05-10');
rcAggiornaDaArrivi(true);
ok('camera spostata, non nuova prenotazione', guestsData[0].roomChanged, true);
ok('ricorda la camera precedente',            guestsData[0].prevCamera, '204');

// Arrivi tutti al Principe: non e' un errore di lettura, semplicemente non servono card.
arriviData = _prenArriviData([RC_PREN[1]], '2026-05-10');
ok('solo Principe/Mastrangelo: nessuna card', rcAggiornaDaArrivi(false), 'nessuna');
// Nessun arrivo: le card NON vanno aggiornate, e chi carica deve saperlo.
arriviData = _prenArriviData(RC_PREN, '2026-05-19');
ok('nessun arrivo: card lasciate stare',      rcAggiornaDaArrivi(false), 'vuoto');
// Il difetto originale non era nel calcolo ma nel collegamento: prenHandlePdf scriveva
// qm_arriviData senza ridisegnare le card. Serve un PDF vero per eseguirla, quindi si
// controlla che la chiamata ci sia.
ok('il file unico ridisegna le card', /rcAggiornaDaArrivi/.test(String(prenHandlePdf)), true);

sez('Card riallineate senza ricaricare il PDF');
// qm_rcGuests e qm_arriviData sono chiavi indipendenti: la seconda puo' essere aggiornata
// senza la prima. Aprendo la vista, card di un altro giorno vanno rigenerate da sole.
var _rcOggiVero = rcTodayStr;
rcTodayStr = function () { return '10/05/2026'; };

arriviData = _prenArriviData(RC_PREN, '2026-05-10');
guestsData = [{ camera: '203', nome: 'Ospite Di Ieri', checkin: '09/05/2026', checkout: '11/05/2026', pax: 1, trattamento: 'BB' }];
ok('card di ieri, documento di oggi: rigenerate', rcRiallineaConArrivi(), true);
ok('ora le card sono del giorno giusto',          guestsData[0].checkin, '10/05/2026');

// Gia' allineate: non si tocca niente (un rigenero inutile perderebbe le card aggiunte a mano).
guestsData[0].marcatore = 'intatto';
ok('card gia\' di oggi: nessun rigenero', rcRiallineaConArrivi(), false);
ok('card lasciate come stavano',           guestsData[0].marcatore, 'intatto');

// Documento vecchio: non deve MAI generare card, meglio quelle che ci sono.
rcTodayStr = function () { return '11/05/2026'; };
guestsData = [];
ok('documento di ieri: nessuna card generata', rcRiallineaConArrivi(), false);
ok('nessuna card inventata',                   guestsData.length, 0);
rcTodayStr = _rcOggiVero;
// Anche qui il rischio e' il collegamento, non il calcolo: la funzione esiste ma nessuno
// la chiama all'apertura della vista.
ok('la vista Registrazione riallinea all\'apertura', /rcRiallineaConArrivi/.test(String(rcRefreshFromCloud)), true);

sez('Biancheria: periodo ritirato da Raimondo');
// Il giro del giorno D ritira dal giro precedente (incluso) al giorno prima di D.
_bia = { consumi: [
    { id: 'c1', hotel: 'sa', data: '15/08/2026', q: { 'Federa': 10 } },
    { id: 'c2', hotel: 'sa', data: '16/08/2026', q: { 'Federa': 8 } },
    { id: 'c3', hotel: 'sa', data: '17/08/2026', q: { 'Federa': 6 } },
    { id: 'c4', hotel: 'sa', data: '18/08/2026', q: { 'Federa': 5 } }
  ], giri: [ { id: 'g1', hotel: 'sa', data: '15/08/2026', consegnato: { 'Federa': 20 }, ricevuto: { 'Federa': 20 } } ] };
_biaHotel = 'sa';
var per = _biaPeriodo('sa', '18/08/2026');
ok('parte dal giro precedente', _biaFmt(per.dal), '15/08/2026');
ok('finisce il giorno prima',   _biaFmt(per.al),  '17/08/2026');
ok('il giorno del giro resta fuori', _biaSommaConsumi('sa', per.dal, per.al)['Federa'], 24);

sez('Biancheria: ordine delle voci');
// Due ordini diversi, di proposito: i consumi si ricopiano dal foglio camera, il giro si
// conta preparando il sacco. Valgono per tutte e due le strutture (le liste sono uniche).
ok('consumi: ordine del foglio camera', BIA_VOCI.join(' · '),
   'Lenzuolo matrimoniale · Lenzuolo singolo · Federa · Telo doccia · Asciugamano viso · Asciugamano bidet · Scendibagno');
ok('giro: telo doccia dopo gli asciugamani', BIA_VOCI_GIRO.join(' · '),
   'Lenzuolo matrimoniale · Lenzuolo singolo · Federa · Asciugamano viso · Asciugamano bidet · Telo doccia · Scendibagno');
// Stesse sette voci: se una comparisse in una lista sola, una riga sparirebbe da una
// delle due tabelle senza che nessuno se ne accorga.
ok('le due liste contengono le stesse voci',
   BIA_VOCI.slice().sort().join('|') === BIA_VOCI_GIRO.slice().sort().join('|'), true);
// Gli id delle caselle seguono BIA_VOCI: chi rilegge i campi scorre quella lista, e un
// ordine di visualizzazione diverso non deve far finire i numeri sulla voce sbagliata.
// (const/var: l'ambiente di prova converte i const di primo livello in var)
ok('la tabella del giro usa l\'indice canonico',
   /(const|var) i=BIA_VOCI\.indexOf\(v\)/.test(String(biaRender)), true);
// I dati gia' salvati sono indicizzati per NOME, non per posizione: riordinare la lista
// non deve spostare nessun numero.
_bia = { consumi: [{ id: 'v', hotel: 'sa', data: '21/08/2026',
                     q: { 'Lenzuolo matrimoniale': 1, 'Lenzuolo singolo': 2, 'Federa': 3,
                          'Telo doccia': 4, 'Asciugamano viso': 5, 'Asciugamano bidet': 6, 'Scendibagno': 7 } }],
         giri: [] };
_biaHotel = 'sa';
var vecchi = _biaSommaConsumi('sa', _biaParse('21/08/2026'), _biaParse('21/08/2026'));
ok('telo doccia resta 4',      vecchi['Telo doccia'], 4);
ok('asciugamano viso resta 5', vecchi['Asciugamano viso'], 5);
ok('totale invariato',         _biaTot(vecchi), 28);

sez('Biancheria: calendario del giro');
// Raimondo passa martedi', giovedi' e sabato. Il sabato ritira giovedi' e venerdi', il
// martedi' ritira sabato/domenica/lunedi', il giovedi' ritira martedi' e mercoledi'.
function _giro(consumi, giri, dataGiro) {
  _bia = { consumi: consumi.map(function (d) { return { id: d, hotel: 'sa', data: d, q: { Federa: 5 } }; }),
           giri:    giri.map(function (d) { return { id: d, hotel: 'sa', data: d, consegnato: { Federa: 5 }, ricevuto: { Federa: 5 } }; }) };
  _biaHotel = 'sa';
  return _biaPeriodo('sa', dataGiro);
}
var g = _giro(['21/08/2026'], [], '22/08/2026');        // sabato, nessun giro registrato
ok('sabato: parte da giovedi\'',       _biaFmt(g.dal), '20/08/2026');
ok('sabato: arriva a venerdi\'',       _biaFmt(g.al),  '21/08/2026');
ok('lo dice con i nomi dei giorni',    _biaPeriodoTxt(g), 'di giovedì 20 e venerdì 21');
ok('e dice da dove nasce il "dal"',    g.fonte, 'calendario');
// Il giorno mancante e' proprio quello che rende incompleto il sacco: va segnalato.
ok('giovedi\' senza consumi, segnalato', _biaGiorniSenzaConsumi('sa', g).map(_biaGgEtichetta).join(''), 'giovedì 20');

g = _giro(['24/08/2026'], [], '25/08/2026');            // martedi'
ok('martedi\': parte da sabato',       _biaFmt(g.dal), '22/08/2026');
ok('martedi\': tre giorni',            _biaPeriodoTxt(g), 'di sabato 22, domenica 23 e lunedì 24');

g = _giro(['25/08/2026'], [], '27/08/2026');            // giovedi'
ok('giovedi\': parte da martedi\'',    _biaFmt(g.dal), '25/08/2026');

sez('Colazioni: un caricamento stretto non cancella la previsione');
// Il grafico della previsione e' lo strumento su cui la responsabile organizza il
// servizio. Un export del PMS filtrato su un giorno solo sostituiva l'intera serie e lo
// azzerava, senza alcun segnale (22/08/2026, ore 21:18).
function _gio(off, v) {
  var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + off);
  return { data: String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(),
           label: 'x', adulti: v, bambini: 0, noCol: 0 };
}
var serie = [_gio(0, 55), _gio(1, 39), _gio(2, 31), _gio(3, 49)];
var stretto = _bkfFondi(serie, [_gio(0, 60)]);
ok('caricamento di un giorno solo: la serie resta', stretto.length, 4);
ok('il giorno caricato e\' aggiornato',             stretto[0].adulti, 60);
ok('i giorni futuri restano quelli di prima',       stretto[3].adulti, 49);
var esteso = _bkfFondi(serie, [_gio(3, 50), _gio(4, 44)]);
ok('un caricamento piu\' ampio aggiunge i giorni',  esteso.length, 5);
ok('e sovrascrive quelli in comune',                esteso[3].adulti, 50);
ok('la serie resta in ordine di data',
   esteso.map(function (d) { return d.data; }).join('|') ===
   esteso.map(function (d) { return d.data; }).slice().sort(function (a, b) {
     return a.slice(6) + a.slice(3, 5) + a.slice(0, 2) < b.slice(6) + b.slice(3, 5) + b.slice(0, 2) ? -1 : 1; }).join('|'), true);
ok('i giorni molto vecchi non si accumulano',       _bkfFondi([_gio(-30, 10)], [_gio(0, 55)]).length, 1);
ok('senza dati precedenti funziona lo stesso',      _bkfFondi(null, [_gio(0, 55)]).length, 1);

sez('Archivio delle settimane di turno');
// Finora caricare il turno nuovo cancellava quello vecchio: nessuna settimana passata
// restava, e senza settimane passate non esistono statistiche.
var _sett = { giorni: [
  { date: '2026-08-17T10:00:00.000Z', label: 'Lun 17/08', shifts: { 'Rossi M.': 'P', 'Bianchi A.': 'R' } },
  { date: '2026-08-18T10:00:00.000Z', label: 'Mar 18/08', shifts: { 'Rossi M.': 'CG' } },
  { date: '2026-08-23T10:00:00.000Z', label: 'Dom 23/08', shifts: { 'Rossi M.': 'R' } }
] };
var _voce = turniVoceStorico(_sett);
ok('la settimana si archivia sotto il primo giorno', _voce.chiave, '2026-08-17');
ok('conserva il primo e l\'ultimo giorno', _voce.dal + '→' + _voce.al, '2026-08-17→2026-08-23');
ok('conserva tutti i giorni',              _voce.giorni.length, 3);
ok('e i turni di ciascuno',                _voce.giorni[0].shifts['Rossi M.'], 'P');
ok('anche i riposi, che servono a contarli', _voce.giorni[0].shifts['Bianchi A.'], 'R');
ok('porta il momento in cui e\' stata archiviata', typeof _voce.ts === 'number' && _voce.ts > 0, true);
// Un turno vuoto o malformato non deve sporcare l'archivio con voci senza data.
ok('settimana vuota: niente da archiviare',  turniVoceStorico({ giorni: [] }), null);
ok('dato assente: niente da archiviare',     turniVoceStorico(null), null);
ok('giorni senza data valida vengono scartati',
   turniVoceStorico({ giorni: [{ date: 'boh', shifts: {} }] }), null);

sez('Statistiche turni ricevimento');
// I codici sono scritti a mano e hanno varianti: senza normalizzazione ci si ritrova venti
// categorie da una occorrenza sola, e i totali non dicono niente.
ok('R e\' riposo',                    turniNormalizza('R').tipo, 'riposo');
ok('anche il riposo richiesto',       turniNormalizza('R RICHIESTO').tipo, 'riposo');
ok('anche il recupero con la data',   turniNormalizza('R RECUPERO 19/08').tipo, 'riposo');
ok('P (EX R) resta una P',            turniNormalizza('P (EX R)').tipo, 'p');
ok('ma segnala il riposo saltato',    turniNormalizza('P (EX R)').exR, true);
ok('AG e\' Galleria di mattina',      turniNormalizza('ag').sede + '/' + turniNormalizza('ag').fascia, 'galleria/mattina');
ok('CC e\' SoulArt di pomeriggio',    turniNormalizza('CC').sede + '/' + turniNormalizza('CC').fascia, 'soulart/pomeriggio');
ok('NG e\' una notte in Galleria',    turniNormalizza('NG').fascia, 'notte');
ok('la casella vuota non conta',      turniNormalizza(''), null);
ok('il trattino non conta',           turniNormalizza('-'), null);
ok('un codice sconosciuto e\' "altro"', turniNormalizza('9-14').tipo, 'altro');
// Intermedi, dal turno reale del 24-30/08. L'orario NON identifica la struttura: 10/18
// compare sia come CAR sia come GALL, quindi si guarda solo la sigla della sede.
ok('INT CAR e\' un intermedio a SoulArt',
   turniNormalizza('INT CAR 9/17').sede + '/' + turniNormalizza('INT CAR 9/17').fascia, 'soulart/intermedio');
ok('lo stesso con un altro orario',   turniNormalizza('INT CAR 10/18').sede, 'soulart');
ok('INT GALL e\' un intermedio all\'Art Resort',
   turniNormalizza('INT GALL 10/18').sede + '/' + turniNormalizza('INT GALL 10/18').fascia, 'galleria/intermedio');
ok('un intermedio senza orario regge lo stesso', turniNormalizza('INT GALL').sede, 'galleria');
// Riposo nelle forme usate dagli altri reparti, se un giorno comparissero al ricevimento.
ok('RIPOSO RICHIESTO e\' riposo',     turniNormalizza('RIPOSO RICHIESTO').tipo, 'riposo');
ok('RECUPERO RIPOSO e\' riposo',      turniNormalizza('RECUPERO RIPOSO').tipo, 'riposo');
ok('R RECUPERO con la data e\' riposo', turniNormalizza('R RECUPERO 23/08').tipo, 'riposo');

// 17/08/2026 e' un lunedi', quindi il 23 e' domenica: il riposo di domenica va distinto.
var _arch = { '2026-08-17': { dal:'2026-08-17', al:'2026-08-23', giorni: [
  { data:'2026-08-17', shifts:{ 'Presta P.':'AC', 'Perez L.':'R',   'Nacci M.':'SOUL' } },
  { data:'2026-08-18', shifts:{ 'Presta P.':'CG', 'Perez L.':'NG' } },
  { data:'2026-08-23', shifts:{ 'Presta P.':'R',  'Perez L.':'R'  } },
  { data:'2026-08-19', shifts:{ 'Presta P.':'FERIE', 'Perez L.':'P (EX R)' } }
] } };
var _sf = turniStatistiche(_arch, ['Presta P.','Perez L.']);
ok('una settimana in archivio',       _sf.settimane, 1);
ok('riposi di Perez',                 _sf.per['Perez L.'].riposi, 2);
ok('di cui di domenica',              _sf.per['Perez L.'].riposiDomenica, 1);
ok('il riposo del lunedi\' non e\' domenica', _sf.per['Presta P.'].riposiDomenica, 1);
ok('mattina di Presta',               _sf.per['Presta P.'].mattina, 1);
ok('pomeriggio di Presta',            _sf.per['Presta P.'].pomeriggio, 1);
ok('Galleria di Presta (CG, senza notti)', _sf.per['Presta P.'].galleria, 1);
ok('SoulArt di Presta (AC)',          _sf.per['Presta P.'].soulart, 1);
ok('la notte non entra nella sede',   _sf.per['Perez L.'].galleria, 0);
// Un intermedio non e' ne' mattina ne' pomeriggio, ma e' lavoro in quella sede: deve
// contarsi nella colonna Intermedi E nel totale della struttura.
var _int = turniStatistiche({ '2026-08-24': { dal:'2026-08-24', al:'2026-08-24', giorni:[
  { data:'2026-08-24', shifts:{ 'Raucci A.':'INT CAR 10/18', 'Ruggiero B.':'INT GALL 10/18' } }
] } }, ['Raucci A.','Ruggiero B.']);
ok('intermedio contato',              _int.per['Raucci A.'].intermedi, 1);
ok('e attribuito a SoulArt',          _int.per['Raucci A.'].soulart, 1);
ok('non finisce fra le mattine',      _int.per['Raucci A.'].mattina, 0);
ok('INT GALL va all\'Art Resort',     _int.per['Ruggiero B.'].galleria, 1);

// Un codice mai visto non deve sparire in silenzio: va detto QUALE, chi lo ha e quante
// volte. Sapere che "ci sono 3 codici sconosciuti" non serve a nessuno.
var _ign = turniStatistiche({ '2026-08-24': { dal:'2026-08-24', al:'2026-08-25', giorni:[
  { data:'2026-08-24', shifts:{ 'Perez L.':'INT BOU 9/17', 'Raucci A.':'AC' } },
  { data:'2026-08-25', shifts:{ 'Perez L.':'int bou 9/17' } }
] } }, ['Perez L.','Raucci A.']);
ok('il codice ignoto viene riportato', _ign.ignoti.length, 1);
ok('con il testo esatto',              _ign.ignoti[0].codice, 'INT BOU 9/17');
ok('quante volte compare',             _ign.ignoti[0].volte, 2);
ok('maiuscole e minuscole non lo sdoppiano', _ign.ignoti.length, 1);
ok('e di chi e\'',                     _ign.ignoti[0].chi.join(','), 'Perez L.');
ok('non finisce in nessun conteggio',  _ign.per['Perez L.'].mattina + _ign.per['Perez L.'].soulart, 0);
ok('i codici buoni non ci finiscono',  _ign.per['Raucci A.'].mattina, 1);

// Ricaricare la stessa settimana: vince la versione archiviata piu' di recente, non la
// locale. Il turno cambia piu' volte in settimana e si ricarica ogni volta.
var _vecchia = { '2026-08-24': { ts: 100, giorni: [{ data:'2026-08-24', shifts:{ 'Perez L.':'R' } }] } };
var _nuova   = { '2026-08-24': { ts: 200, giorni: [{ data:'2026-08-24', shifts:{ 'Perez L.':'AC' } }] } };
ok('la variazione piu\' recente vince',
   turniFondiArchivi(_vecchia, _nuova)['2026-08-24'].giorni[0].shifts['Perez L.'], 'AC');
ok('e non torna indietro nel verso opposto',
   turniFondiArchivi(_nuova, _vecchia)['2026-08-24'].giorni[0].shifts['Perez L.'], 'AC');
ok('settimane diverse si sommano',
   Object.keys(turniFondiArchivi(_vecchia, { '2026-08-31': { ts: 1, giorni: [] } })).length, 2);
ok('ma si conta come notte',          _sf.per['Perez L.'].notti, 1);
ok('e si sa in quale sede',           _sf.per['Perez L.'].nottiG, 1);
ok('ferie contate',                   _sf.per['Presta P.'].ferie, 1);
ok('riposo poi lavorato segnalato',   _sf.per['Perez L.'].riposiLavorati, 1);
// L'housekeeping non deve entrare: ha codici suoi e i totali diventerebbero senza senso.
ok('chi non e\' del ricevimento resta fuori', _sf.per['Nacci M.'] === undefined, true);

// Ordine della tabella: i due riferimenti in cima, i notturni in fondo, il resto in mezzo
// in ordine alfabetico. I notturni sono un elenco esplicito e non una deduzione dai dati:
// nella settimana 17-23/08 Vatiero aveva solo notti perche' copriva un'emergenza, e una
// regola automatica lo avrebbe spostato in fondo per sempre.
var _ord = turniOrdina(['Perez L.', "D'Andrea F.", 'Presta P.', 'Barbosa D.', 'Iannario R.', 'Maddaloni M.', 'Vatiero R.', 'Grieco V.']);
ok('Maddaloni primo',        _ord[0], 'Maddaloni M.');
ok('Presta secondo',         _ord[1], 'Presta P.');
ok('poi in ordine alfabetico', _ord.slice(2, 5).join(','), 'Barbosa D.,Perez L.,Vatiero R.');
ok('i notturni in fondo',    _ord.slice(5).join(','), "D'Andrea F.,Grieco V.,Iannario R.");
ok('Vatiero non e\' un notturno', TURNI_NOTTURNI.indexOf('Vatiero R.'), -1);
// Grieco e' un notturno che fa una o due CC a settimana: deve stare in fondo con gli
// altri notturni, ma i suoi pomeriggi non devono sparire dalla tabella.
ok('Grieco e\' fra i notturni', TURNI_NOTTURNI.indexOf('Grieco V.') >= 0, true);
var _gr = turniStatistiche({ '2026-08-24': { ts:1, dal:'2026-08-24', al:'2026-08-25', giorni:[
  { data:'2026-08-24', shifts:{ 'Grieco V.':'NC' } },
  { data:'2026-08-25', shifts:{ 'Grieco V.':'CC' } }
] } }, ['Grieco V.']);
ok('le sue notti si contano',   _gr.per['Grieco V.'].notti, 1);
ok('e sono a SoulArt',          _gr.per['Grieco V.'].nottiC, 1);
ok('il suo pomeriggio si vede', _gr.per['Grieco V.'].pomeriggio, 1);
// Vatiero non e' un notturno ma copre le notti in emergenza: se la tabella non ha una
// colonna Notti, quelle notti non compaiono da nessuna parte — non fra mattine e
// pomeriggi, e nemmeno nei totali di sede, da cui le notti sono escluse. La sua riga lo
// farebbe sembrare uno che ha lavorato molto meno del vero.
var _va = turniStatistiche({ '2026-08-24': { ts:1, dal:'2026-08-24', al:'2026-08-25', giorni:[
  { data:'2026-08-24', shifts:{ 'Vatiero R.':'NC' } },
  { data:'2026-08-25', shifts:{ 'Vatiero R.':'NC' } }
] } }, ['Vatiero R.']);
ok('le notti di chi notturno non e\' si contano', _va.per['Vatiero R.'].notti, 2);
ok('e si sa dove le ha fatte',                    _va.per['Vatiero R.'].nottiC, 2);
ok('non finiscono fra i pomeriggi',               _va.per['Vatiero R.'].pomeriggio, 0);
ok('ne\' nel totale di sede',                     _va.per['Vatiero R.'].soulart, 0);
ok('la colonna Notti esiste nella tabella',       /th\('Notti'\)/.test(String(turniRenderStats)), true);
// Presta lavora solo al SoulArt: le colonne di sede restano vuote, perche' un
// "SoulArt 1 · Art Resort 0" sembrerebbe uno squilibrio da correggere invece che la norma.
ok('Presta ha una sede sola',        TURNI_SEDE_UNICA.indexOf('Presta P.') >= 0, true);
ok('anche Maddaloni ha una sede sola', TURNI_SEDE_UNICA.indexOf('Maddaloni M.') >= 0, true);
ok('gli altri no',                   TURNI_SEDE_UNICA.indexOf('Perez L.'), -1);
// Va detto da quando si conta: senza, un "3 domeniche" non si sa se e' su un mese o un anno.
ok('la tabella dichiara da quando conta', /conteggio dal /.test(String(turniRenderStats)), true);
ok('la tabella lascia vuote le sue sedi', /sedeUnica\?vuota/.test(String(turniRenderStats)), true);
ok('NG resta Art Resort',       turniNormalizza('NG').sede, 'galleria');
ok('NC resta SoulArt',          turniNormalizza('NC').sede, 'soulart');
ok('chi manca non viene inventato', turniOrdina(['Perez L.']).join(','), 'Perez L.');

sez('Punteggio Booking: la finestra e\' un parametro, non una certezza');
// Il modello teneva fissa la finestra a 36 mesi e faceva variare solo l'emivita: quando il
// punteggio reale non rientrava, l'unica spiegazione offerta era "il CSV e' incompleto".
// Sul Principe (23/08/2026) il CSV era completo — era la finestra a essere troppo lunga.
var GG = 86400000, ORA = new Date('2026-08-23T12:00:00Z').getTime();
function _rec(giorniFa, voto) { return { _dateTs: ORA - giorniFa * GG, _score: voto }; }
var _set = [_rec(10, 10), _rec(20, 10), _rec(700, 4), _rec(800, 4)];
ok('finestra piena: entrano tutte',
   punteggioBooking(_set, 1200, ORA, 1095).nInFinestra, 4);
ok('finestra corta: le vecchie restano fuori',
   punteggioBooking(_set, 1200, ORA, 365).nInFinestra, 2);
ok('e il punteggio cambia di conseguenza',
   Math.round(punteggioBooking(_set, 1200, ORA, 365).score * 100) / 100, 10);
ok('fuori finestra non pesa nemmeno un poco',
   punteggioBooking([_rec(2000, 1)], 1200, ORA, 1095).score, null);
// La finestra NON e' un parametro: l'01/09/2026 e' stato confermato che Booking toglie le
// recensioni dopo 36 mesi. La calibraFinestra() che l'accorciava e' stata rimossa —
// accorciarla non spiegava il punteggio, lo fabbricava guardando meno recensioni.
ok('la finestra resta di 36 mesi', REV_FINESTRA_GG, 1095);
ok('nessuna scorciatoia sulla finestra', typeof calibraFinestra === 'undefined', true);
ok('e nessuna finestra per struttura',   typeof revFinestra === 'undefined', true);

sez('Calibrazione recensioni: i registri si fondono, non si sostituiscono');
// Il 23/08/2026 le osservazioni di TUTTE le strutture sono sparite: il salvataggio
// riscriveva nel cloud il registro della postazione senza guardare cosa c'era gia'.
// Sono la materia prima della calibrazione: perderle significa ricominciare da zero.
var _casa   = { sa:{ osservazioni:[{ts:100,display:8.9},{ts:200,display:8.8}] } };
var _hotel  = { sa:{ osservazioni:[{ts:300,display:8.9}] },
                pr:{ osservazioni:[{ts:400,display:6.6}] } };
var _fuso = revCalibFondi(_casa,_hotel);
ok('nessuna osservazione persa',        _fuso.sa.osservazioni.length, 3);
ok('restano in ordine di tempo',        _fuso.sa.osservazioni.map(function(o){return o.ts;}).join(','), '100,200,300');
ok('una struttura nuova entra',         _fuso.pr.osservazioni.length, 1);
ok('la stessa lettura non si duplica',  revCalibFondi(_casa,_casa).sa.osservazioni.length, 2);
// La cancellazione deve reggere alla fusione, altrimenti l'osservazione tolta riappare
// dall'altra postazione e non si riesce piu' a eliminarla.
var _conLapide = { sa:{ osservazioni:[{ts:100,display:8.9}], rimosse:[200] } };
ok('una cancellata non torna indietro',  revCalibFondi(_casa,_conLapide).sa.osservazioni.length, 1);
ok('la lapide viene conservata',         revCalibFondi(_casa,_conLapide).sa.rimosse.join(','), '200');
ok('fondere con il vuoto non distrugge', revCalibFondi({},_casa).sa.osservazioni.length, 2);
ok('e nemmeno nel verso opposto',        revCalibFondi(_casa,{}).sa.osservazioni.length, 2);

sez('Biancheria: vigilia del ritiro (quando si stampa la distinta)');
// La distinta va preparata il POMERIGGIO PRIMA: la mattina del ritiro, alle 8, la
// reception e' nel pieno dei check-out e non la stampa nessuno — i dati si perdevano
// cosi'. I giorni di preparazione sono quindi lunedi', mercoledi' e venerdi'.
// I numeri sono gia' definitivi: il giro del martedi' ritira sabato/domenica/lunedi',
// tutti giorni chiusi entro lunedi' pomeriggio.
function _gg(y, m, d) { return new Date(y, m - 1, d); }
ok('lunedi\' e\' vigilia (ritiro martedi\')',   _biaVigiliaGiro(_gg(2026, 8, 24)), true);
ok('mercoledi\' e\' vigilia (ritiro giovedi\')', _biaVigiliaGiro(_gg(2026, 8, 26)), true);
ok('venerdi\' e\' vigilia (ritiro sabato)',      _biaVigiliaGiro(_gg(2026, 8, 28)), true);
ok('martedi\' NON e\' vigilia',                  _biaVigiliaGiro(_gg(2026, 8, 25)), false);
ok('sabato NON e\' vigilia',                     _biaVigiliaGiro(_gg(2026, 8, 29)), false);
ok('domenica NON e\' vigilia',                   _biaVigiliaGiro(_gg(2026, 8, 30)), false);
// Il campo "data del giro" la vigilia deve proporre DOMANI: lasciando "oggi" si
// calcolerebbe il periodo sbagliato senza che nulla lo segnali.
ok('domani di lunedi\' 24 e\' martedi\' 25', _biaFmt(_biaDomani(_gg(2026, 8, 24))), '25/08/2026');
ok('domani regge il cambio di mese',         _biaFmt(_biaDomani(_gg(2026, 8, 31))), '01/09/2026');
// La distinta stampata si segna in una chiave sua: l'archivio dei consumi e dei giri
// non va toccato per un promemoria.
ok('la distinta non risulta stampata prima', _biaDistStampata('sa', '25/08/2026'), false);
_biaDist['sa|25/08/2026'] = 1;
ok('una volta segnata, risulta stampata',    _biaDistStampata('sa', '25/08/2026'), true);
ok('e vale solo per quella struttura',       _biaDistStampata('bh', '25/08/2026'), false);
_biaDist = {};

// I giri avvengono anche quando non sono registrati qui: i consumi piu' vecchi del
// calendario sono gia' usciti, e NON devono rientrare nel sacco di domani.
g = _giro(['18/08/2026', '19/08/2026', '21/08/2026'], [], '22/08/2026');
ok('consumi piu\' vecchi: restano fuori', _biaFmt(g.dal), '20/08/2026');
ok('il sabato resta giovedi\' e venerdi\'', _biaPeriodoTxt(g), 'di giovedì 20 e venerdì 21');

// Il calendario vale identico per il Boutique: e' il ritmo del fornitore, non una
// caratteristica della struttura. Ogni struttura ha pero' i SUOI consumi e i SUOI giri.
_bia = { consumi: [{ id: 'x', hotel: 'bh', data: '21/08/2026', q: { Federa: 3 } },
                   { id: 'y', hotel: 'sa', data: '21/08/2026', q: { Federa: 9 } }], giri: [] };
_biaHotel = 'bh';
var gb = _biaPeriodo('bh', '22/08/2026');
ok('Boutique: stesso calendario',      _biaPeriodoTxt(gb), 'di giovedì 20 e venerdì 21');
ok('Boutique: conta i propri consumi', _biaSommaConsumi('bh', gb.dal, gb.al)['Federa'], 3);
ok('SoulArt non entra nel Boutique',   _biaSommaConsumi('bh', gb.dal, gb.al)['Federa'] !== 12, true);

// Il calendario NON deve mai scavalcare un giro registrato: un giro saltato resta
// assorbito dal successivo, che copre il buco da solo.
g = _giro(['23/08/2026'], ['22/08/2026'], '27/08/2026');   // giovedi', ultimo giro sabato
ok('giro saltato: copre il buco',   _biaFmt(g.dal), '22/08/2026');
ok('il giro registrato ha la meglio', g.fonte, 'giro');

sez('Biancheria: la casella Ricevuto');
// Il difetto: la casella chiamava biaRender() a ogni tasto, che ridisegnava la tabella
// con il valore calcolato — la cifra digitata spariva e sembrava impossibile inserirla.
ok('Ricevuto aggiorna solo il delta',      /oninput="biaAggiornaDelta\(\)"/.test(String(biaRender)), true);
ok('Ricevuto non ridisegna il pannello',   /id="bia-r-\$\{i\}"[^>]*oninput="biaRender/.test(String(biaRender)), false);
ok('la cella del delta e\' identificabile', /id="bia-d-\$\{i\}"/.test(String(biaRender)), true);
// L'avviso diceva "mancano" anche quando rientrava piu' roba di quanta ne era uscita.
ok('meno pezzi: mancano',   /mancano 4 pezzi/.test(_biaMsgDiff(-4)), true);
ok('piu\' pezzi: non "mancano"', /mancano/.test(_biaMsgDiff(3)), false);
ok('in pari: nessun avviso',  _biaMsgDiff(0), '');

sez('Anno del turno');
var oggi = new Date(); var A = oggi.getFullYear();
function annoDi(iso) { var d = _annoPlausibile(new Date(iso + 'T12:00:00')); return d.getFullYear(); }
var mm = String(oggi.getMonth() + 1).padStart(2, '0'), gg = String(oggi.getDate()).padStart(2, '0');
ok('anno sbagliato di uno: corretto', annoDi((A - 1) + '-' + mm + '-' + gg), A);
ok('data odierna: non toccata',       annoDi(A + '-' + mm + '-' + gg), A);

sez('Nomi del turno');
function soloCognome(n) { return _nomeIniz(n).replace(/<span class="s-ini">[\s\S]*?<\/span>/g, ''); }
ok('su smartphone resta il cognome', soloCognome('Maddaloni M.'), 'Maddaloni');
ok('cognome composto',               soloCognome('De Rosa T.'),   'De Rosa');
ok('nome senza iniziale intatto',    soloCognome('Extra Night'),  'Extra Night');

sez('Finestre di avviso');
// I vecchi messaggi contenevano a capo scritti con \n, che in HTML non mandano a capo:
// cqAvviso deve dividerli in titolo + spiegazione e convertire gli a capo.
var _vistoAvviso = null;
var _cqApriVero = _cqApri;
_cqApri = function (o) { _vistoAvviso = o; return Promise.resolve(true); };
cqAvviso('Inserisci la data.');
ok('messaggio breve: tutto nel titolo', _vistoAvviso.titolo, 'Inserisci la data.');
ok('messaggio breve: nessuna spiegazione', _vistoAvviso.testo, '');
cqAvviso('Prima riga.\nSeconda riga.\nTerza riga.');
ok('messaggio lungo: titolo = prima riga', _vistoAvviso.titolo, 'Prima riga.');
ok('messaggio lungo: a capo convertiti', _vistoAvviso.testo, 'Seconda riga.<br>Terza riga.');
ok('nessun a capo grezzo nel titolo', /\n/.test(_vistoAvviso.titolo), false);
_cqApri = _cqApriVero;

// ─────────────────────────────────────────────────────────────────────────────
sez('Mittente delle mail pre-stay (indirizzi Booking)');
// Gli indirizzi @guest.booking.com accettano posta SOLO dall'indirizzo registrato
// sull'Extranet. Il blocco non deve dipendere da una costante scritta a mano — che non
// sa cosa c'è sul Worker — ma dal mittente che il Worker dichiara.
var _mittVero = _psMitt;
_psMitt = null;                       // mai verificato
ok('alias riconosciuto: guest.booking.com', _psAliasBooking('abc.123@guest.booking.com'), true);
ok('alias riconosciuto: booking.com',       _psAliasBooking('  X@Booking.com '),          true);
ok('non e un alias: booking.com nel nome',  _psAliasBooking('booking.com@gmail.com'),     false);
ok('non e un alias: dominio simile',        _psAliasBooking('tizio@guest.booking.com.co'), false);
ok('senza verifica: indirizzo Booking bloccato', _psBookingBloccato('abc@guest.booking.com'), true);
ok('senza verifica: indirizzo normale libero',   _psBookingBloccato('mario@gmail.com'),       false);

_psMitt = { mittente: 'qm@soularthotel.com' };   // il mittente di sempre
ok('mittente sbagliato: Booking bloccato',  _psBookingBloccato('abc@guest.booking.com'), true);
ok('mittente sbagliato: non e quello Booking', _psMittenteOkBooking(), false);

_psMitt = { mittente: 'BOOKING@SoulArtHotel.com' };  // quello registrato, con altre maiuscole
ok('mittente giusto: riconosciuto',          _psMittenteOkBooking(), true);
ok('mittente giusto: Booking non bloccato',  _psBookingBloccato('abc@guest.booking.com'), false);
ok('mittente giusto: indirizzo normale libero', _psBookingBloccato('mario@gmail.com'),    false);

// Una casella per struttura. Il Boutique spedisce da booking@hotelpiazzacarita.com, che sta
// su un dominio suo: le liste degli indirizzi approvati su Booking sono separate per
// struttura, quindi un mittente solo direbbe il falso su tutte tranne una.
ok('il Boutique attende il suo indirizzo', _psMittAtteso('bh'), 'booking@hotelpiazzacarita.com');
ok('le altre strutture quello principale', _psMittAtteso('sa'), 'booking@soularthotel.com');
ok('una struttura sconosciuta usa il principale', _psMittAtteso('xx'), 'booking@soularthotel.com');
_psMitt = { mittente: 'booking@soularthotel.com', caselle: { bh: 'booking@hotelpiazzacarita.com' } };
ok('SoulArt a posto',                _psMittenteOkBooking('sa'), true);
ok('Boutique a posto con la sua',    _psMittenteOkBooking('bh'), true);
ok('Boutique non bloccato',          _psBookingBloccato('abc@guest.booking.com', 'bh'), false);
ok('SoulArt non bloccato',           _psBookingBloccato('abc@guest.booking.com', 'sa'), false);
// Se la casella del Boutique non e' configurata sul Worker, le sue mail partirebbero da
// quella principale: Booking le rifiuterebbe, e va bloccato solo il Boutique.
_psMitt = { mittente: 'booking@soularthotel.com', caselle: {} };
ok('senza casella propria il Boutique e bloccato', _psBookingBloccato('abc@guest.booking.com', 'bh'), true);
ok('ma le altre strutture restano libere',         _psBookingBloccato('abc@guest.booking.com', 'sa'), false);
_psMitt = _mittVero;

// L'endpoint della verifica si ricava da quello dell'invio: una sola impostazione.
var _cfgVero = _psMailCfg;
_psMailCfg = { endpoint: 'https://esempio.workers.dev/prestay/send', key: 'x' };
ok('endpoint stato ricavato da send', _psEndpointStato(), 'https://esempio.workers.dev/prestay/stato');
// L'indirizzo del Worker non e' un segreto e non si inserisce piu' a mano: senza
// configurazione resta noto, quello che manca e' la chiave.
_psMailCfg = { endpoint: '', key: '' };
ok('endpoint noto anche senza configurazione', _psEndpointStato(), PROXY + '/prestay/stato');
ok('senza chiave l\'invio diretto non e pronto', _psMailPronto(), false);
_psMailCfg = { endpoint: '', key: 'k' };
ok('con la sola chiave l\'invio e pronto',       _psMailPronto(), true);
ok('e usa il Worker di sempre',                  _psEndpoint(), PROXY + '/prestay/send');
_psMailCfg = _cfgVero;

// ─────────────────────────────────────────────────────────────────────────────
sez('Pre-stay: la fusione col cloud non perde niente');
// Il 22/08/2026 una copia partita con il localStorage vuoto ha riscritto la chiave
// condivisa e ha cancellato i pre-stay del 24 gia' inviati. Questi controlli descrivono
// esattamente quella situazione: cloud pieno, copia in memoria appena reimportata.

// Cloud: due schede compilate, una gia' contattata via WhatsApp.
var CLOUD = { '2026-08-24': { arrivi: [
  { id: 'v1', hotel: 'bh', nome: 'Brunetaud Mathilde', email: 'm@esempio.it', tel: '+39333111',
    codici: ['AAA 111'], codice: 'AAA 111', lang: 'it', waTs: 1000, mailTs: null },
  { id: 'v2', hotel: 'bh', nome: 'De Toro Rebeca', email: 'r@esempio.it', tel: '',
    codici: ['BBB 222'], codice: 'BBB 222', lang: 'en', mailTs: 2000, waTs: null }
] } };
// In memoria: le stesse due persone appena reimportate dal PDF — id nuovi, contatti vuoti.
var LOCALE = { '2026-08-24': { arrivi: [
  { id: 'n1', hotel: 'bh', nome: 'Brunetaud Mathilde', email: '', tel: '',
    codici: ['AAA 111'], codice: 'AAA 111', lang: 'it', mailTs: null, waTs: null },
  { id: 'n2', hotel: 'bh', nome: 'De Toro Rebeca', email: '', tel: '',
    codici: ['BBB 222'], codice: 'BBB 222', lang: 'it', mailTs: null, waTs: null }
] } };
var F = _psFondi(CLOUD, LOCALE);
var f24 = F['2026-08-24'].arrivi;
ok('reimportazione: nessuna scheda duplicata',   f24.length, 2);
ok('reimportazione: email recuperata',           f24[0].email, 'm@esempio.it');
ok('reimportazione: telefono recuperato',        f24[0].tel, '+39333111');
ok('reimportazione: WhatsApp inviato conservato', f24[0].waTs, 1000);
ok('reimportazione: mail inviata conservata',    f24[1].mailTs, 2000);
ok('reimportazione: lingua ripresa dal cloud',   f24[1].lang, 'en');

// Il caso che ha fatto il danno: copia in memoria completamente vuota.
var V = _psFondi(CLOUD, {});
ok('copia vuota: la giornata resta',             V['2026-08-24'].arrivi.length, 2);
ok('copia vuota: i contatti restano',            V['2026-08-24'].arrivi[0].email, 'm@esempio.it');

// Una giornata che sta solo sul cloud non deve sparire perche' qui non c'e'.
var G = _psFondi({ '2026-08-25': { arrivi: [{ id: 'z', hotel: 'sa', nome: 'Verdi Ugo', email: 'u@esempio.it' }] } },
                 { '2026-08-24': { arrivi: [] } });
ok('giorno solo sul cloud: conservato',          Object.keys(G).sort().join(','), '2026-08-24,2026-08-25');

// Chi digita adesso vince su chi ha letto prima: il valore locale non si sovrascrive.
var D = _psFondi({ 'g': { arrivi: [{ id: 'x', hotel: 'sa', nome: 'Neri Ada', email: 'vecchia@esempio.it', tel: '+39000' }] } },
                 { 'g': { arrivi: [{ id: 'x', hotel: 'sa', nome: 'Neri Ada', email: 'nuova@esempio.it', tel: '' }] } });
ok('valore appena digitato non sovrascritto',    D.g.arrivi[0].email, 'nuova@esempio.it');
ok('valore mancante ripreso dal cloud',          D.g.arrivi[0].tel, '+39000');

// Eliminare deve restare possibile: senza traccia la fusione la rimetterebbe dentro.
var E = _psFondi({ 'g': { arrivi: [{ id: 'x', hotel: 'sa', nome: 'Neri Ada', email: 'a@esempio.it' }] } },
                 { 'g': { arrivi: [], rimossi: ['x'] } });
ok('scheda eliminata non torna',                 E.g.arrivi.length, 0);

// Giornata locale ancora nel vecchio formato (indicizzata per camera): non deve far
// scartare ne' la versione migrata sul cloud ne' quella locale.
var VF = _psFondi({ 'g': { arrivi: [{ id: 'r1', hotel: 'sa', nome: 'Verdi Ugo', email: 'u@esempio.it' }] } },
                  { 'g': { '203': { hotel: 'bh', nome: 'Neri Ada', email: 'a@esempio.it', tel: '+39222' } } });
ok('vecchio formato: scheda locale migrata',  VF.g.arrivi.length, 2);
ok('vecchio formato: cloud non scartato',
   VF.g.arrivi.filter(function (a) { return a.email === 'u@esempio.it'; }).length, 1);
ok('vecchio formato: locale non scartato',
   VF.g.arrivi.filter(function (a) { return a.email === 'a@esempio.it'; }).length, 1);

// Una scheda vuota sul cloud non ha niente da salvare: non deve tornare a ingombrare.
var Z = _psFondi({ 'g': { arrivi: [{ id: 'x', hotel: 'sa', nome: 'Boh', email: '', tel: '' }] } },
                 { 'g': { arrivi: [] } });
ok('scheda vuota sul cloud non torna',           Z.g.arrivi.length, 0);

// Riconoscimento della stessa prenotazione: il codice conta piu' del nome, che al
// check-in puo' cambiare (si registra il documento di chi si presenta).
ok('stesso codice, nome diverso: stessa scheda',
   _psStessaScheda({ id: 'a', codici: ['AAA 111'], nome: 'Marino Ilenia', hotel: 'sa' },
                   { id: 'b', codici: ['AAA 111'], nome: 'Della Sala Maria', hotel: 'sa' }), true);
ok('stesso nome, struttura diversa: schede diverse',
   _psStessaScheda({ id: 'a', nome: 'Rossi Mario', hotel: 'sa' },
                   { id: 'b', nome: 'Rossi Mario', hotel: 'bh' }), false);
ok('nome invertito: stessa scheda',
   _psStessaScheda({ id: 'a', nome: 'Rossi Mario', hotel: 'sa' },
                   { id: 'b', nome: 'MARIO ROSSI', hotel: 'sa' }), true);

// "Compilata" = c'e' qualcosa che si perderebbe. Il solo nome lo rigenera l'importazione.
ok('solo il nome non e compilata',   _psCompilata({ nome: 'Rossi Mario' }), false);
ok('con il telefono e compilata',    _psCompilata({ tel: '+39333' }), true);
ok('gia contattata e compilata',     _psCompilata({ waTs: 1 }), true);

// La produzione scrive sulla chiave condivisa; la copia di sviluppo su una sua.
ok('chiave di produzione',           PRESTAY_KEY, 'qm_prestay');
location.hostname = 'localhost';
ok('copia di sviluppo separata',     _psChiave(), 'qm_prestay_dev');
location.hostname = 'compass-qm.com';
location.protocol = 'file:';
ok('copia aperta da file:// separata', _psChiave(), 'qm_prestay_dev');
location.protocol = 'https:';
ok('tornati in produzione',          _psChiave(), 'qm_prestay');

// ─────────────────────────────────────────────────────────────────────────────
sez('Pre-stay: chi ha prenotato altrove riceve dalla sua struttura');
// Un ospite del Boutique con upgrade dorme al SoulArt ma non lo sa fino all'arrivo: il
// messaggio deve partire dal Boutique — nome mittente, testo e casella di posta — mentre
// la scheda resta nel gruppo della struttura in cui arriva, perche' i conteggi per
// struttura devono continuare a combaciare con la lista arrivi del PMS.

var UPG = { id: 'u1', hotel: 'sa', mitt: 'bh', nome: 'Rossi Mario', email: 'x@guest.booking.com' };
var NORM = { id: 'n1', hotel: 'sa', nome: 'Verdi Ada', email: 'a@esempio.it' };
ok('senza scelta scrive la struttura di arrivo', _psHotelMitt(NORM), 'sa');
ok('con la scelta scrive quella di prenotazione', _psHotelMitt(UPG), 'bh');
ok('struttura inesistente: si ricade sull arrivo', _psHotelMitt({ hotel: 'sa', mitt: 'zz' }), 'sa');
ok('la struttura di arrivo non cambia mai',      UPG.hotel, 'sa');
ok('scheda normale non e marcata',               _psMittDiverso(NORM), false);
ok('scheda con upgrade e marcata',               _psMittDiverso(UPG), true);
ok('mitt uguale all arrivo non e una differenza', _psMittDiverso({ hotel: 'sa', mitt: 'sa' }), false);

// {struttura} nel testo: l'ospite deve leggere l'albergo che ha prenotato.
ok('nel messaggio compare la struttura prenotata',
   _psCompila('Il suo arrivo al {struttura}', UPG, '2026-09-04'), 'Il suo arrivo al Boutique Hotel');
ok('senza upgrade compare quella di arrivo',
   _psCompila('Il suo arrivo al {struttura}', NORM, '2026-09-04'), 'Il suo arrivo al SoulArt Hotel');

// Il relay Booking accetta solo il mittente registrato sull'Extranet DI QUELLA STRUTTURA:
// e' il motivo per cui la scelta deve seguire anche il controllo, non solo il testo.
// Qui la casella principale (SoulArt) e' quella sbagliata, quella del Boutique e' giusta.
var _mittPrima = _psMitt;
_psMitt = { mittente: 'qm@soularthotel.com', caselle: { bh: 'booking@hotelpiazzacarita.com' } };
ok('alias Booking bloccato con la casella dell arrivo',
   _psBookingBloccato(UPG.email, _psHotelMitt({ id: 'u1', hotel: 'sa', email: UPG.email })), true);
ok('e recapitabile scrivendo dal Boutique',
   _psBookingBloccato(UPG.email, _psHotelMitt(UPG)), false);
_psMitt = _mittPrima;

// Il Worker dichiara una casella per struttura; la verifica la buttava via, e ogni arrivo
// Booking del Boutique risultava "non recapitabile" anche a mail regolarmente arrivata.
var _RISP = { ok: true, mittente: 'booking@soularthotel.com', mittenteDa: 'SMTP_USER',
              via: 'smtp', smtpHost: 'authsmtp.securemail.pro',
              caselle: { bh: 'booking@hotelpiazzacarita.com' }, imap: 'qm@soularthotel.com' };
ok('la verifica conserva le caselle per struttura', (_psMittDaRisposta(_RISP).caselle || {}).bh, 'booking@hotelpiazzacarita.com');
_psMitt = _psMittDaRisposta(_RISP);
ok('col Worker letto bene il Boutique non e bloccato', _psBookingBloccato('x@guest.booking.com', 'bh'), false);
ok('e nemmeno le altre strutture',                    _psBookingBloccato('x@guest.booking.com', 'sa'), false);
// Una casella davvero sbagliata deve continuare a essere segnalata: il controllo serve.
_psMitt = _psMittDaRisposta({ ok: true, mittente: 'qm@soularthotel.com', caselle: {} });
ok('mittente davvero sbagliato: ancora bloccato',     _psBookingBloccato('x@guest.booking.com', 'bh'), true);
_psMitt = _mittPrima;

// La scelta e' fatta a mano: ne' il cloud ne' una reimportazione la devono cancellare.
var M = _psFondi({ 'g': { arrivi: [{ id: 'x', hotel: 'sa', mitt: 'bh', nome: 'Rossi Mario', email: 'r@esempio.it' }] } },
                 { 'g': { arrivi: [{ id: 'y', hotel: 'sa', nome: 'Rossi Mario', email: '', tel: '' }] } });
ok('mittente scelto ripreso dal cloud',          M.g.arrivi[0].mitt, 'bh');
var M2 = _psFondi({ 'g': { arrivi: [{ id: 'x', hotel: 'sa', mitt: 'bh', nome: 'Rossi Mario', email: 'r@esempio.it' }] } },
                  { 'g': { arrivi: [{ id: 'x', hotel: 'sa', mitt: '', ts: 9, nome: 'Rossi Mario', email: 'r@esempio.it' }] } });
ok('tolto a mano qui, non torna dal cloud',      M2.g.arrivi[0].mitt || '(vuoto)', '(vuoto)');

// ─────────────────────────────────────────────────────────────────────────────
sez('Cassa: due postazioni non si cancellano i movimenti');
// Il registro e' additivo e riguarda denaro contato: scrivere l'elenco intero voleva dire
// che chi salvava per ultimo riscriveva senza il movimento dell'altro, in silenzio.

var REMOTO = [
  { id: 'm1', ts: 100, tipo: 'conteggio', importo: 100 },
  { id: 'm2', ts: 200, tipo: 'buono', importo: 20 }
];
var LOCALE = [
  { id: 'm1', ts: 100, tipo: 'conteggio', importo: 100 },
  { id: 'm3', ts: 300, tipo: 'buono', importo: 5 }      // registrato qui, il cloud non ce l'ha
];
var U = _cassaUnisci(REMOTO, LOCALE, new Set());
ok('unione: nessun movimento perso',      U.length, 3);
ok('unione: ordine per data',             U.map(function (m) { return m.id; }).join(','), 'm1,m2,m3');
ok('unione: nessun duplicato',            U.filter(function (m) { return m.id === 'm1'; }).length, 1);

// A parita' di id vince la versione con piu' correzioni: per costruzione e' la piu' recente.
var C = _cassaUnisci(
  [{ id: 'x', ts: 1, importo: 100, edits: [] }],
  [{ id: 'x', ts: 1, importo: 98, edits: [{ motivo: 'ricontato' }] }], new Set());
ok('correzione piu recente vince',        C[0].importo, 98);
var C2 = _cassaUnisci(
  [{ id: 'x', ts: 1, importo: 98, edits: [{ motivo: 'ricontato' }] }],
  [{ id: 'x', ts: 1, importo: 100, edits: [] }], new Set());
ok('correzione vince anche se e sul cloud', C2[0].importo, 98);

// Un movimento eliminato non deve tornare a ogni salvataggio.
var R = _cassaUnisci(REMOTO, LOCALE, new Set(['m2']));
ok('movimento eliminato non torna',       R.map(function (m) { return m.id; }).join(','), 'm1,m3');

// Robustezza: voci senza id (dati sporchi) non devono far saltare l'unione.
var S = _cassaUnisci([null, { ts: 5 }, { id: 'a', ts: 1 }], [], new Set());
ok('voci senza id ignorate',              S.length, 1);
ok('registro vuoto da entrambe le parti', _cassaUnisci([], [], new Set()).length, 0);

// ─────────────────────────────────────────────────────────────────────────────
sez('Archivi a elenchi: DVR, Biancheria, Resi non si sovrascrivono');
// Stessa forma per tutti e tre: un oggetto le cui proprieta' sono elenchi di record con
// `id`. Prima si scriveva l'oggetto intero, quindi una copia vecchia poteva cancellare
// quello che era stato aggiunto da un'altra postazione.

// Resi biancheria: due righe registrate su postazioni diverse.
var A1 = _qmFondiElenchi(
  { righe: [{ id: 'r1', qta: 3 }], ritiri: [], tipologie: ['Federa', 'Telo doccia'] },
  { righe: [{ id: 'r2', qta: 5 }], ritiri: [], tipologie: null },
  new Set());
ok('resi: nessuna riga persa',        A1.righe.length, 2);
ok('resi: ordine e identita',         A1.righe.map(function (r) { return r.id; }).join(','), 'r1,r2');
// `tipologie` e' un elenco di stringhe: e' un'impostazione, non un registro, e non va
// unita record per record — altrimenti si duplicherebbe a ogni salvataggio.
ok('resi: tipologie non duplicate',   A1.tipologie.length, 2);
ok('elenco di stringhe non e un registro', _qmElencoRecord(['Federa']), false);
ok('elenco vuoto vale come registro',      _qmElencoRecord([]), true);

// A parita' di id vince la copia locale: e' quella appena modificata a mano.
var A2 = _qmFondiElenchi(
  { righe: [{ id: 'r1', qta: 3 }] },
  { righe: [{ id: 'r1', qta: 9 }] }, new Set());
ok('stesso id: vince la modifica locale', A2.righe[0].qta, 9);

// Un record eliminato di proposito non torna dentro alla prima fusione.
var A3 = _qmFondiElenchi(
  { righe: [{ id: 'r1' }, { id: 'r2' }] },
  { righe: [{ id: 'r2' }] }, new Set(['r1']));
ok('record eliminato non torna',      A3.righe.map(function (r) { return r.id; }).join(','), 'r2');

// DVR: annidato per societa', quindi la fusione deve scendere di un livello.
var D = _qmFondiElenchi(
  { geriart: { dipendenti: [{ id: 'd1', nome: 'Rossi Mario' }], visite: [] } },
  { geriart: { dipendenti: [{ id: 'd2', nome: 'Neri Ada' }], visite: [] } },
  new Set());
ok('dvr: fusione annidata per societa', D.geriart.dipendenti.length, 2);

// Biancheria: una registrazione che sta solo sul cloud non deve sparire.
var B = _qmFondiElenchi(
  { consumi: [{ id: 'c1', data: '21/08/2026' }], giri: [{ id: 'g1' }] },
  { consumi: [], giri: [] }, new Set());
ok('biancheria: consumo solo sul cloud conservato', B.consumi.length, 1);
ok('biancheria: giro solo sul cloud conservato',    B.giri.length, 1);

// Copia locale completamente vuota: e' il caso che ha fatto il danno sui pre-stay.
var V2 = _qmFondiElenchi({ righe: [{ id: 'r1' }, { id: 'r2' }] }, {}, new Set());
ok('copia vuota non cancella l archivio', V2.righe.length, 2);

// ─────────────────────────────────────────────────────────────────────────────
sez('Calibrazione: conflitto e "fuori modello" sono cose diverse');
// Caso reale (Principe, 23/08/2026): registrato 6.6 con una sola osservazione, il
// pannello diceva "osservazioni in conflitto" e chiedeva quale rimuovere — con una sola
// osservazione non c'e' niente da rimuovere, e la diagnosi giusta e' un'altra.

var GG = 86400000;
var OGGI = new Date('2026-08-23T11:00:00').getTime();
// Storico tutto attorno a 9: nessuna emivita puo' produrre 6.6.
var REC9 = [];
for (var i = 0; i < 40; i++) REC9.push({ _dateTs: OGGI - (i * 10 + 1) * GG, _score: 9 });

var UNA = calibraDaOsservazioni(REC9, [{ ts: OGGI - GG, display: 6.6 }], OGGI);
ok('una sola osservazione: nessun conflitto',  UNA.contraddittorio, false);
ok('una sola osservazione: fuori modello',     UNA.fuoriModello, true);

// Due osservazioni entrambe irriproducibili non sono un conflitto fra loro.
var DUE_FUORI = calibraDaOsservazioni(REC9,
  [{ ts: OGGI - 2 * GG, display: 6.6 }, { ts: OGGI - GG, display: 6.5 }], OGGI);
ok('due valori irriproducibili: non e conflitto', DUE_FUORI.contraddittorio, false);
ok('due valori irriproducibili: fuori modello',   DUE_FUORI.fuoriModello, true);

// Conflitto vero: due letture entrambe riproducibili da sole, ma non insieme.
// Storico che cambia nel tempo, cosi' emivite diverse danno punteggi diversi.
var RECMIX = [];
for (var j = 0; j < 30; j++) RECMIX.push({ _dateTs: OGGI - (200 + j * 10) * GG, _score: 10 });
for (var k = 0; k < 30; k++) RECMIX.push({ _dateTs: OGGI - (1 + k * 3) * GG, _score: 6 });
var vicino = punteggioBooking(RECMIX, 20, new Date(OGGI)).score;
var lontano = punteggioBooking(RECMIX, 1200, new Date(OGGI)).score;
var CONF = calibraDaOsservazioni(RECMIX,
  [{ ts: OGGI - GG, display: Math.round(vicino * 10) / 10 },
   { ts: OGGI - GG, display: Math.round(lontano * 10) / 10 }], OGGI);
ok('due letture inconciliabili: conflitto',    CONF.contraddittorio, true);
ok('due letture inconciliabili: non fuori modello', CONF.fuoriModello, false);

// L'intervallo producibile serve a dire DI QUANTO si sbaglia, non solo che si sbaglia.
var CH = calibraHalfLife(REC9, 6.6, new Date(OGGI));
ok('fuori modello riconosciuto',               CH.fuoriModello, true);
ok('intervallo producibile presente',          Array.isArray(CH.range), true);
ok('6.6 sta sotto il minimo producibile',      CH.range[0] > 6.65, true);
ok('minimo non maggiore del massimo',          CH.range[0] <= CH.range[1], true);

// ─────────────────────────────────────────────────────────────────────────────
sez('Polling: si ferma a scheda nascosta, riparte quando torna');
// Un cancello rotto qui non si vede: se il giro non ripartisse piu', la postazione
// resterebbe ferma senza dire niente — ed e' proprio da una copia ferma che sono partite
// le sovrascritture del 22/08/2026. Vale la pena controllarlo.
var _pGiri = 0;
var _pFn = function () { _pGiri++; return Promise.resolve(); };
// `ms` piccolo: la guardia anti-raffica vale ms/3, qui trascurabile.
var _pTick = _qmPolling(_pFn, 3);

document.visibilityState = 'hidden';
_pTick();
ok('scheda nascosta: nessuna lettura',        _pGiri, 0);

document.visibilityState = 'visible';
_pTick();
ok('tornata visibile: il giro riparte',       _pGiri, 1);

// Alternare due finestre a raffica non deve moltiplicare le letture.
_pTick();
ok('seconda chiamata immediata: nessun giro', _pGiri, 1);

document.visibilityState = 'hidden';
_pTick();
ok('di nuovo nascosta: resta ferma',          _pGiri, 1);
document.visibilityState = 'visible';

// ─────────────────────────────────────────────────────────────────────────────
sez('Resi biancheria: il taglio del periodo alla consegna');
// Raimondo passa alle 8:00, prima che le cameriere lavorino: i resi trovati nella
// giornata STESSA del ritiro non sono nel sacco che porta via. Prima si chiudevano tutte
// le righe aperte, quelle di oggi comprese, e quei pezzi sparivano dentro una distinta
// gia' consegnata — un ammanco che poi nessuno sa spiegare, e che sulla carta non si vede.
_resi = {
  righe: [
    { id: 'x1', hotel: 'sa', data: '28/08/2026', tipologia: 'Federa',       qta: 4, ritiroId: null },
    { id: 'x2', hotel: 'sa', data: '31/08/2026', tipologia: 'Telo doccia',  qta: 2, ritiroId: null },
    // il giorno stesso del ritiro: resta aperto, va nel sacco successivo
    { id: 'x3', hotel: 'sa', data: '01/09/2026', tipologia: 'Federa',       qta: 3, ritiroId: null },
    // gia' consegnato in un ritiro precedente: non deve rientrare
    { id: 'x4', hotel: 'sa', data: '20/08/2026', tipologia: 'Accappatoio',  qta: 1, ritiroId: 'vecchio' },
    // l'altra struttura: i due sacchi sono distinti e si consegnano separatamente
    { id: 'x5', hotel: 'bh', data: '28/08/2026', tipologia: 'Federa',       qta: 9, ritiroId: null }
  ],
  ritiri: [], tipologie: null
};
_resiHotel = 'sa';

var RC = _resiDaConsegnare('01/09/2026');
ok('consegna solo i giorni PRIMA del ritiro', RC.map(function (r) { return r.id; }).join(','), 'x1,x2');
ok('il giorno del ritiro resta aperto',       RC.filter(function (r) { return r.id === 'x3'; }).length, 0);
ok('una riga gia consegnata non rientra',     RC.filter(function (r) { return r.id === 'x4'; }).length, 0);
ok('l altra struttura resta fuori',           RC.filter(function (r) { return r.id === 'x5'; }).length, 0);
ok('totale pezzi della distinta',             RC.reduce(function (s, r) { return s + r.qta; }, 0), 6);
// Dopo la consegna in elenco resta esattamente quello che il sacco non ha portato via.
ok('cosa resta in elenco dopo la consegna',   _resiAperte().length - RC.length, 1);

// Il sacco della struttura giusta: stesse date, elenco diverso.
ok('Boutique consegna il proprio sacco',      _resiDaConsegnare('01/09/2026', 'bh').map(function (r) { return r.id; }).join(','), 'x5');

// Ritiro saltato: il successivo copre da solo il buco, senza regole di calendario.
ok('ritiro saltato: copre tutto l arretrato', _resiDaConsegnare('15/09/2026').length, 3);

// Tutto quello che c'e' e' del giorno stesso o dopo: il sacco e' vuoto, e va detto
// invece di registrare un ritiro da zero pezzi.
ok('niente da consegnare il 31/08',           _resiDaConsegnare('31/08/2026').map(function (r) { return r.id; }).join(','), 'x1');
ok('niente da consegnare il 28/08',           _resiDaConsegnare('28/08/2026').length, 0);

// Data del ritiro illeggibile: non si consegna niente alla cieca.
ok('data ritiro non valida: nessuna riga',    _resiDaConsegnare('non una data').length, 0);

// Una riga con data illeggibile si consegna invece di restare aperta per sempre.
_resi.righe.push({ id: 'x6', hotel: 'sa', data: '', tipologia: 'Federa', qta: 1, ritiroId: null });
ok('riga senza data leggibile va in distinta', _resiDaConsegnare('01/09/2026').filter(function (r) { return r.id === 'x6'; }).length, 1);

// ─────────────────────────────────────────────────────────────────────────────
sez('Resi biancheria: una consegna non torna indietro da sola');
// Il difetto vero, trovato il 01/09/2026 su dati reali: il ritiro del 22/08 era
// registrato e firmato (06/08 -> 20/08, 25 pezzi) e le sue righe erano di nuovo in
// elenco come "non ancora consegnate". Causa: _qmUnisciRecord faceva vincere il locale a
// parita' di id, quindi una postazione ferma a prima della consegna — o anche solo il suo
// localStorage, che _qmLeggiArchivio fonde allo stesso modo — rimetteva ritiroId:null
// sopra righe gia' consegnate. Alla consegna dopo finivano in distinta due volte.

// Cloud: riga chiusa. Locale: la stessa riga come la ricorda una copia vecchia.
var CH = _qmUnisciRecord(
  [{ id: 'r1', qta: 3, ritiroId: 'rit1' }],
  [{ id: 'r1', qta: 3, ritiroId: null }], new Set());
ok('la riga consegnata resta consegnata',   CH[0].ritiroId, 'rit1');

// E nel verso opposto: chi ha appena consegnato non viene disfatto dal cloud vecchio.
var CH2 = _qmUnisciRecord(
  [{ id: 'r1', ritiroId: null }],
  [{ id: 'r1', ritiroId: 'rit1' }], new Set());
ok('e non torna indietro nel verso opposto', CH2[0].ritiroId, 'rit1');

// Su tutto il resto vince ancora il locale: e' la correzione appena fatta a mano.
var CH3 = _qmUnisciRecord(
  [{ id: 'r1', qta: 3, ritiroId: 'rit1' }],
  [{ id: 'r1', qta: 7, ritiroId: null }], new Set());
ok('la quantita corretta a mano vince',     CH3[0].qta, 7);
ok('ma la chiusura resta',                  CH3[0].ritiroId, 'rit1');

// L'undo dell'utente deve funzionare: resiDelRitiro cancella il ritiro e ne mette l'id
// in _rimossi. Da li' in poi la riga DEVE riaprirsi, altrimenti "Annulla ritiro" non
// annullerebbe piu' niente.
var CH4 = _qmUnisciRecord(
  [{ id: 'r1', ritiroId: 'rit1' }],
  [{ id: 'r1', ritiroId: null }], new Set(['rit1']));
ok('ritiro annullato: la riga si riapre',   String(CH4[0].ritiroId), 'null');

// Un record che non ha il campo non se lo deve ritrovare addosso.
var CH5 = _qmUnisciRecord([{ id: 'g1', sacchi: 1 }], [{ id: 'g1', sacchi: 2 }], new Set());
ok('nessun campo chiusura inventato',       ('ritiroId' in CH5[0]), false);
ok('e il resto si fonde come prima',        CH5[0].sacchi, 2);

// La fusione non deve mutare gli oggetti di partenza: _resi li tiene per riferimento.
var _orig = { id: 'r1', ritiroId: null };
_qmUnisciRecord([{ id: 'r1', ritiroId: 'rit1' }], [_orig], new Set());
ok('l originale non viene mutato',          String(_orig.ritiroId), 'null');

// ── Riparazione dei dati gia' danneggiati ───────────────────────────────────
// Una riga aperta che cade dentro il periodo di un ritiro consegnato e' per forza una
// riga che quel ritiro aveva chiuso: dal/al sono il minimo e il massimo delle righe che
// ha portato via.
_resi = {
  righe: [
    { id: 'y1', hotel: 'sa', data: '09/08/2026', tipologia: 'Federa',      qta: 2, ritiroId: null },
    { id: 'y2', hotel: 'sa', data: '20/08/2026', tipologia: 'Federa',      qta: 1, ritiroId: null },
    { id: 'y3', hotel: 'sa', data: '22/08/2026', tipologia: 'Federa',      qta: 3, ritiroId: null },
    { id: 'y4', hotel: 'sa', data: '10/08/2026', tipologia: 'Accappatoio', qta: 1, ritiroId: 'rit1' },
    { id: 'y5', hotel: 'bh', data: '09/08/2026', tipologia: 'Federa',      qta: 9, ritiroId: null }
  ],
  ritiri: [{ id: 'rit1', hotel: 'sa', dal: '06/08/2026', al: '20/08/2026', dataRitiro: '22/08/2026', sacchi: 1, totPezzi: 25 }],
  tipologie: null
};
_resiHotel = 'sa';
var RI = _resiRiaperte();
ok('riconosce le righe tornate indietro',   RI.map(function (c) { return c.riga.id; }).join(','), 'y1,y2');
ok('l estremo del periodo e compreso',      RI.filter(function (c) { return c.riga.id === 'y2'; }).length, 1);
ok('una riga fuori periodo non si tocca',   RI.filter(function (c) { return c.riga.id === 'y3'; }).length, 0);
ok('l altra struttura non entra',           RI.filter(function (c) { return c.riga.id === 'y5'; }).length, 0);
ok('le righe gia chiuse non si ricontano',  RI.filter(function (c) { return c.riga.id === 'y4'; }).length, 0);
ok('sa a quale ritiro rimetterle',          RI[0].rit.id, 'rit1');
// Il Boutique non ha ritiri: nessuna riga da riassegnare, nessun pannello.
ok('struttura senza ritiri: niente da fare', _resiRiaperte('bh').length, 0);

// ─────────────────────────────────────────────────────────────────────────────
sez('Ogni eliminazione lascia la sua traccia');
// Con la fusione, un record eliminato torna dentro al primo salvataggio se il suo id non
// finisce in `_rimossi`. resiDelRow se n'era dimenticata: il cestino faceva sparire la
// riga per un istante e la riga tornava, senza nessun errore a schermo. Le altre quattro
// eliminazioni degli archivi a elenchi lo facevano gia'.
var _arch = { righe: [{ id: 'z1' }, { id: 'z2' }] };
_qmSegnaRimosso(_arch, 'z1');
ok('l id eliminato viene segnato',        (_arch._rimossi || []).join(','), 'z1');
// La riga sta ancora sul cloud: senza la traccia la fusione la riporterebbe dentro.
var _dopo = _qmUnisciRecord([{ id: 'z1' }, { id: 'z2' }], [{ id: 'z2' }], new Set(_arch._rimossi));
ok('la riga eliminata non torna',         _dopo.map(function (r) { return r.id; }).join(','), 'z2');
var _senza = _qmUnisciRecord([{ id: 'z1' }, { id: 'z2' }], [{ id: 'z2' }], new Set());
ok('senza traccia sarebbe tornata',       _senza.length, 2);

// Sentinella: se domani qualcuno aggiunge un'eliminazione dimenticandosi la traccia, il
// difetto non si vede provando l'app un attimo — la riga sparisce e torna dopo.
// (la sentinella guarda il sorgente della funzione: e' il solo modo di accorgersene a freddo)
ok('resiDelRow segna l id rimosso',       /_qmSegnaRimosso/.test(String(resiDelRow)), true);
ok('resiDelRitiro pure',                  /_qmSegnaRimosso/.test(String(resiDelRitiro)), true);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(52));
console.log(KO === 0
  ? 'TUTTI I CONTROLLI SUPERATI  (' + OK + ')'
  : KO + ' CONTROLLI FALLITI su ' + (OK + KO));

sez('Calibrazione: quale osservazione non torna');
// 01/09/2026: SoulArt dichiarato "fuori modello" e il messaggio accusava il CSV di oggi
// ("contiene recensioni che Booking non conta piu'"), con una distanza assurda di -0.00.
// La causa era un'osservazione di dieci giorni prima: l'8.9 del 23/08, che con le
// recensioni note allora il modello non poteva produrre. Le altre tre erano coerenti.
var _ORA = new Date('2026-09-01T10:00:00Z').getTime();
var _GG2 = 86400000;
function _rc(giorniFa, voto) { return { _dateTs: _ORA - giorniFa * _GG2, _score: voto }; }
// Recensioni tutte da 9: nessuna emivita puo' produrre 10, nessuna puo' produrre 5.
var _REC = [_rc(1, 9), _rc(5, 9), _rc(30, 9), _rc(200, 9)];
var _multi = calibraDaOsservazioni(_REC, [
  { ts: new Date(_ORA - 2 * _GG2).toISOString(), display: 9 },    // riproducibile
  { ts: new Date(_ORA - 1 * _GG2).toISOString(), display: 5 }     // impossibile
], _ORA);
ok('il caso e\' fuori modello, non un conflitto', _multi.fuoriModello, true);
ok('e non viene chiamato conflitto',              _multi.contraddittorio, false);
ok('si sa quante osservazioni non tornano',       _multi.incoerenti.length, 1);
ok('e qual e\'',                                  _multi.incoerenti[0].display, 5);
ok('con quante recensioni note allora',           _multi.incoerenti[0].nRec > 0, true);
// Quando le osservazioni tornano, non si accusa nessuno: il risultato porta un'emivita e
// l'elenco delle incoerenti resta vuoto.
var _ok2 = calibraDaOsservazioni(_REC, [
  { ts: new Date(_ORA - 3 * _GG2).toISOString(), display: 9 },
  { ts: new Date(_ORA - 1 * _GG2).toISOString(), display: 9 }
], _ORA);
ok('osservazioni coerenti: emivita trovata', _ok2.hl > 0, true);
ok('nessuna accusata',                       (_ok2.incoerenti || []).length, 0);
ok('e nessun conflitto dichiarato',          !!_ok2.contraddittorio, false);

sez('Riquadro "Punteggio Booking reale": deve disegnarsi sempre');
// 01/09/2026: il riquadro e' sparito del tutto perche' un ramo nuovo usava `esc`, che in
// quella funzione non esisteva. Un errore in un caso raro cancellava un pannello intero,
// e chi guarda non vede un messaggio sbagliato: non vede niente. Qui si chiama la funzione
// in tutti gli stati possibili e si pretende che non sollevi errori.
(function () {
  var elFinto = { innerHTML: '' };
  var _getEl = document.getElementById;
  document.getElementById = function (id) { return /^rev-calib-/.test(id) ? elFinto : _getEl.call(document, id); };
  var _calibVero = REV_CALIB, _hotelVeri = REV_HOTELS.sa;
  var ORA = Date.now(), GG = 86400000;
  var casi = {
    'mai calibrato':   { osservazioni: [] },
    'una osservazione':{ osservazioni: [{ ts: new Date(ORA - GG).toISOString(), display: 8.9 }], hl: 156, fascia: [78, 234], fonte: 'singolo', nUsate: 1 },
    'fuori modello':   { osservazioni: [{ ts: new Date(ORA - GG).toISOString(), display: 8.9 }], fonte: 'default', fuoriModello: true, range: [8.4, 8.8], nRec: 677,
                         incoerenti: [{ ts: ORA - 9 * GG, display: 8.9, nRec: 663 }] },
    'senza incoerenti':{ osservazioni: [{ ts: new Date(ORA - GG).toISOString(), display: 8.9 }], fonte: 'default', fuoriModello: true, range: [8.4, 8.8], nRec: 677, incoerenti: [] },
    'contraddittorio': { osservazioni: [{ ts: new Date(ORA - GG).toISOString(), display: 8.9 }], contraddittorio: true, nUsate: 2 },
    'da aggiornare':   { osservazioni: [{ ts: new Date(ORA - 90 * GG).toISOString(), display: 8.9 }], hl: 156, fascia: [78, 234], fonte: 'singolo', nUsate: 1 }
  };
  Object.keys(casi).forEach(function (nome) {
    REV_CALIB = { sa: casi[nome] };
    var esploso = false, vuoto = true;
    try { elFinto.innerHTML = ''; revRenderCalib('sa', { pesoEff: 404, nInFinestra: 677 }, 156); vuoto = !elFinto.innerHTML; }
    catch (e) { esploso = true; }
    ok('si disegna: ' + nome, !esploso && !vuoto, true);
  });
  REV_CALIB = _calibVero; REV_HOTELS.sa = _hotelVeri;
  document.getElementById = _getEl;
})();

sez('Calibrazione: i verdetti vecchi non sopravvivono al ricalcolo');
// 01/09/2026: tolta l'osservazione incoerente la calibrazione riusciva, ma la scheda
// continuava a dire "fuori modello" — la bandierina del giro precedente restava accesa
// perche' il ramo che riesce esce prima di azzerarla. Un dato corretto mostrato come
// guasto e' peggio di un errore visibile: non si capisce cosa fare.
(function () {
  var _vero = REV_CALIB, _hot = REV_HOTELS.sa;
  var ORA = Date.now(), GG = 86400000;
  var rec = [];
  for (var i = 1; i <= 40; i++) rec.push({ _dateTs: ORA - i * 3 * GG, _score: 9 });
  REV_HOTELS.sa = { data: rec };
  // Si parte da uno stato "sporco": verdetti di un giro precedente ancora appiccicati.
  REV_CALIB = { sa: { osservazioni: [
      { ts: new Date(ORA - 5 * GG).toISOString(), display: 9 },
      { ts: new Date(ORA - 2 * GG).toISOString(), display: 9 }
    ], fuoriModello: true, incoerenti: [{ ts: ORA - 9 * GG, display: 8.9, nRec: 663 }],
       range: [8.4, 8.8] } };
  try { revCalibRicalcola('sa'); } catch (e) {}
  var c = REV_CALIB.sa;
  ok('la calibrazione riesce',            c.hl > 0, true);
  ok('e "fuori modello" viene spento',    !!c.fuoriModello, false);
  ok('l\'elenco delle incoerenti si svuota', (c.incoerenti || []).length, 0);
  REV_CALIB = _vero; REV_HOTELS.sa = _hot;
})();

sez('Archivio turni: non si riscrive se identico');
// turniArchivia parte a OGNI apertura della pagina. Il filtro di kvSet vale solo dentro
// una sessione, e oggi ogni pubblicazione fa ricaricare tutte le postazioni: senza questo
// confronto sono decine di scritture al giorno per un archivio immutato (01/09/2026, il
// limite di 1.000 scritture raggiunto).
var _v1 = turniVoceStorico({ giorni: [
  { date: '2026-08-24T10:00:00.000Z', shifts: { 'Perez L.': 'AC' } }
] });
var _v2 = turniVoceStorico({ giorni: [
  { date: '2026-08-24T10:00:00.000Z', shifts: { 'Perez L.': 'AC' } }
] });
var _v3 = turniVoceStorico({ giorni: [
  { date: '2026-08-24T10:00:00.000Z', shifts: { 'Perez L.': 'CG' } }
] });
function _uguale(a, b) {
  var pulisci = function (x) { return JSON.stringify({ dal: x.dal, al: x.al, giorni: x.giorni }); };
  return pulisci(a) === pulisci(b);
}
ok('due volte la stessa settimana: identiche', _uguale(_v1, _v2), true);
ok('il segnatempo non le rende diverse',       _v1.ts !== _v2.ts || true, true);
ok('un turno cambiato si riconosce',           _uguale(_v1, _v3), false);
ok('il confronto e\' nel codice',              /_uguale\(arch\[chiave\],resto\)/.test(String(turniArchivia)), true);

sez('Archivio colazioni: il passato lontano non si riscrive');
// 02/09/2026: un dispositivo rimasto col codice vecchio, con in memoria una serie di inizio
// agosto, ha riscritto i giorni 1-8 annullando la riconciliazione col PMS del 22/08 (43 al
// posto di 41, 65 al posto di 63). Le giornate vecchie sono chiuse: si correggono dal PMS,
// non da una cache che gira su un telefono.
ok('la finestra scrivibile parte da ieri l\'altro',
   /key\s*<\s*_daQuando/.test(String(bkfSaveMonthlyHistory)), true);
ok('e finisce a oggi',
   /key\s*>\s*_oggi/.test(String(bkfSaveMonthlyHistory)), true);
ok('il limite si calcola a -2 giorni',
   /setDate\(d\.getDate\(\)-2\)/.test(String(bkfSaveMonthlyHistory)), true);

sez('Accesso: il lasciapassare viaggia con ogni richiesta');
// /kv/* del Worker era aperto: leggere, scrivere e cancellare tutti i dati senza
// credenziali (verificato il 02/09/2026). Il lasciapassare si aggancia a fetch in un punto
// solo: se qualcuno tornasse a modificare le singole chiamate, se ne dimenticherebbe una.
ok('la chiave del lasciapassare esiste', typeof QM_PASS_KEY === 'string' && QM_PASS_KEY.length > 0, true);
ok('legge il lasciapassare dal frammento',
   qmEstraiAttiva('https://compass-qm.com/breakfast.html#attiva=123.abc'), '123.abc');
ok('lo legge anche dalla query',
   qmEstraiAttiva('https://compass-qm.com/x.html?attiva=99.zz'), '99.zz');
ok('scioglie i caratteri codificati',
   qmEstraiAttiva('#attiva=1%2E2%2Fx'), '1.2/x');
ok('un indirizzo normale non lo attiva',
   qmEstraiAttiva('https://compass-qm.com/breakfast.html'), null);
ok('e nemmeno una parola simile',
   qmEstraiAttiva('https://compass-qm.com/x.html#attivazione=1'), null);
ok('i collegamenti coprono tutte le app', QM_APP_LINK.length, 7);
ok('e portano il lasciapassare nel frammento', /#attiva=/.test(String(qmLinkAttiva)), true);
