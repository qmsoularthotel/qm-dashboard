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
_psMitt = _mittVero;

// L'endpoint della verifica si ricava da quello dell'invio: una sola impostazione.
var _cfgVero = _psMailCfg;
_psMailCfg = { endpoint: 'https://esempio.workers.dev/prestay/send', key: 'x' };
ok('endpoint stato ricavato da send', _psEndpointStato(), 'https://esempio.workers.dev/prestay/stato');
_psMailCfg = { endpoint: '', key: '' };
ok('senza configurazione nessun endpoint', _psEndpointStato(), '');
_psMailCfg = _cfgVero;

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(52));
console.log(KO === 0
  ? 'TUTTI I CONTROLLI SUPERATI  (' + OK + ')'
  : KO + ' CONTROLLI FALLITI su ' + (OK + KO));
