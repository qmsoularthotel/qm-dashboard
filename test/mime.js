// Controlli sulla lettura delle risposte degli ospiti (worker.js).
//
// Il Worker non era coperto dalla rete di sicurezza: e' un file a se', pubblicato a mano,
// e la parte che legge le risposte e' la piu' fragile di tutto Compass — un messaggio
// leggermente diverso e sulla scheda compare il testo grezzo con separatori e accenti
// rotti. E' successo il 18/08/2026 e di nuovo il 31/08.
//
// Si lancia da test/esegui.sh insieme agli altri. Non tocca rete ne' dati veri.

var CR = '\r\n';
function messaggio(intestazioni, corpo) { return intestazioni.join(CR) + CR + CR + corpo; }

var B = '0000000000005a7f36065a5c4674';
var CORPO_DIVISO =
  '--' + B + CR +
  'Content-Type: text/plain; charset="UTF-8"' + CR +
  'Content-Transfer-Encoding: quoted-printable' + CR + CR +
  'Prova' + CR + CR +
  'Il lun 31 ago 2026, 20:49 Boutique Hotel Piazza Carit=C3=A0 <booking@ho=' + CR +
  'telpiazzacarita.com> ha scritto:' + CR + CR +
  '> tutto il messaggio pre-stay citato' + CR +
  '--' + B + '--' + CR;

var INTESTAZIONI = ['From: Ospite <ospite@gmail.com>',
                    'Date: Mon, 31 Aug 2026 20:50:09 +0200',
                    'Subject: Re: Il suo arrivo'];

function testo(raw) { return soloRisposta(estraiMessaggio(raw).corpo); }

sez('Risposte degli ospiti: lettura del messaggio');
// Caso normale: l'intestazione dichiara la divisione in parti.
ok('multipart dichiarato: solo il testo dell\'ospite',
   testo(messaggio(INTESTAZIONI.concat(['Content-Type: multipart/alternative; boundary="' + B + '"']), CORPO_DIVISO)),
   'Prova');
// Caso reale del 31/08/2026: il corpo e' diviso ma l'intestazione non lo dichiara.
// Senza dedurre il separatore dal corpo, sulla scheda finivano separatore, intestazioni
// di parte, accenti codificati (Carit=C3=A0) e l'intero messaggio citato.
ok('multipart non dichiarato: si deduce dal corpo',
   testo(messaggio(INTESTAZIONI, CORPO_DIVISO)), 'Prova');
// La ricomposizione finale degli accenti usa TextDecoder, che su Cloudflare c'e' e nella
// prova su Mac no: verificare direttamente "Carita'" renderebbe il controllo diverso a
// seconda di dove gira. Si verifica quindi il passaggio che conta e che e' nostro: la
// codifica =C3=A0 non deve piu' comparire, e le righe spezzate con "=" vanno ricongiunte.
var _dec = estraiMessaggio(messaggio(INTESTAZIONI, CORPO_DIVISO)).corpo;
ok('codifica quoted-printable risolta', _dec.indexOf('=C3=A0'), -1);
ok('righe spezzate ricongiunte',        _dec.indexOf('<booking@hotelpiazzacarita.com>') >= 0, true);
ok('e la citazione si taglia',          _dec.indexOf('ha scritto:') >= 0, true);
ok('nessun separatore nel testo mostrato',
   testo(messaggio(INTESTAZIONI, CORPO_DIVISO)).indexOf('--' + B), -1);

// Un messaggio semplice non deve essere scambiato per diviso in parti.
ok('messaggio semplice invariato',
   testo(messaggio(INTESTAZIONI.concat(['Content-Type: text/plain; charset="UTF-8"']),
                   'Va benissimo, grazie' + CR + CR + 'Il lun ha scritto:' + CR + '> citato')),
   'Va benissimo, grazie');
// Una riga che comincia con due trattini non e' un separatore: serve che si ripeta.
ok('due trattini isolati non ingannano',
   testo(messaggio(INTESTAZIONI, '--a presto' + CR + 'Mario')), '--a presto\nMario');
ok('separatore che compare una volta sola: ignorato',
   typeof boundaryDalCorpo('--' + B + CR + 'testo') === 'object', true);
ok('separatore vero riconosciuto', boundaryDalCorpo(CORPO_DIVISO), B);

sez('Risposte degli ospiti: taglio della citazione');
ok('taglia su "ha scritto:"',
   soloRisposta('Grazie mille' + CR + CR + 'Il 31 ago 2026 Tizio ha scritto:' + CR + '> testo'),
   'Grazie mille');
ok('taglia su "wrote:"',
   soloRisposta('Thanks' + CR + CR + 'On 31 Aug 2026 Tizio wrote:' + CR + '> text'), 'Thanks');
ok('taglia sulle righe citate', soloRisposta('Ok' + CR + '> vecchio'), 'Ok');
