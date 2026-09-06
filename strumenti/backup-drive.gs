/**
 * COMPASS QM — copia di sicurezza automatica su Google Drive
 * ==========================================================
 *
 * Ogni notte legge tutto l'archivio di Compass (Cloudflare KV) e ne salva una copia in una
 * cartella del Drive. Gira nel Google del QM, non su Cloudflare: se un domani sparisse
 * l'account Cloudflare, le copie resterebbero.
 *
 * PERCHE' ESISTE
 * Sul cloud non c'e' nessun backup, e /kv/delete cancella qualunque chiave: a porta chiusa
 * possono farlo i dispositivi abilitati, per errore o per un bug. Il pulsante "Scarica copia"
 * nel Pannello App fa la stessa cosa, ma solo quando qualcuno se lo ricorda.
 *
 * COSA CONSUMA
 * Solo LETTURE (100.000 al giorno) piu' una operazione di elenco (1.000 al giorno).
 * Nessuna scrittura: il tetto stretto di Compass — 1.000 al giorno — non viene toccato.
 *
 * INSTALLAZIONE — cinque minuti, una volta sola
 *   1. script.google.com  →  Nuovo progetto  →  incolla questo file  →  salva
 *   2. Impostazioni progetto (ingranaggio) → Proprieta script → Aggiungi:
 *        QM_PASSWORD   = la password di Compass (la stessa impostata su Cloudflare)
 *      facoltative:
 *        QM_EMAIL      = indirizzo per gli avvisi di errore (senza, usa quello del progetto)
 *        QM_CARTELLA   = nome della cartella su Drive (senza, "Back-Up Compass QM")
 *        QM_COPIE      = quante copie tenere (senza, 30)
 *   3. Seleziona la funzione  installa  e premi Esegui: Google chiede l'autorizzazione
 *      (Drive + invio mail), la si concede una volta.
 *   4. Fine. Da quel momento parte da sola ogni notte fra le 3 e le 4.
 *
 * PER PROVARLA SUBITO: seleziona  backupOra  e premi Esegui.
 */

var PROXY = 'https://anthropic-proxy.qm-d82.workers.dev';

// ── Installazione: crea il promemoria notturno ────────────────────────────────
function installa() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'backupNotturno') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('backupNotturno').timeBased().atHour(3).everyDays(1).create();
  var r = backupOra();
  return 'Promemoria notturno creato (3:00). Prima copia: ' + r;
}

function backupNotturno() {
  try {
    backupOra();
  } catch (e) {
    // Un backup che smette di funzionare in silenzio e' peggio di non averlo: si crede di
    // avere una copia e non c'e'.
    avvisa('Backup Compass NON riuscito', String(e && e.message || e));
    throw e;
  }
}

// ── Il backup vero ────────────────────────────────────────────────────────────
function backupOra() {
  var prop = PropertiesService.getScriptProperties();
  var password = prop.getProperty('QM_PASSWORD');
  if (!password) throw new Error('Manca QM_PASSWORD nelle Proprieta script.');

  // Il lasciapassare si rinnova a ogni giro invece di salvarne uno: dura 180 giorni, e uno
  // salvato scadrebbe un giorno di questi senza che nessuno se ne accorga.
  var pass = chiediLasciapassare(password);

  var chiavi = elencoChiavi(pass);
  if (!chiavi.length) throw new Error('Il Worker non ha restituito nessuna chiave.');

  var dati = leggiTutto(chiavi, pass);
  var trovate = Object.keys(dati).length;

  var contenuto = JSON.stringify({
    archivio: 'Compass QM',
    data: new Date().toISOString(),
    chiavi: trovate,
    fonte: 'backup automatico (Apps Script)',
    dati: dati
  }, null, 1);

  var cartella = cartellaBackup(prop);
  var nome = 'compass-archivio-' + Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd') + '.json';
  // Se c'e' gia' la copia di oggi (prova manuale, secondo giro) si sostituisce invece di
  // affiancarne una seconda con lo stesso nome: su Drive due file omonimi convivono, e a
  // cercarli poi non si sa quale sia quello buono.
  var vecchie = cartella.getFilesByName(nome);
  while (vecchie.hasNext()) vecchie.next().setTrashed(true);
  cartella.createFile(nome, contenuto, 'application/json');

  potaVecchie(cartella, Number(prop.getProperty('QM_COPIE') || 30));
  segnaSuCompass(pass, trovate, nome);

  var esito = trovate + ' chiavi salvate in ' + nome;
  Logger.log(esito);
  return esito;
}

// ── Pezzi ─────────────────────────────────────────────────────────────────────
function chiediLasciapassare(password) {
  var r = UrlFetchApp.fetch(PROXY + '/auth', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ password: password }),
    muteHttpExceptions: true
  });
  var j = JSON.parse(r.getContentText() || '{}');
  if (r.getResponseCode() !== 200 || !j.pass) {
    throw new Error('Lasciapassare rifiutato (' + r.getResponseCode() + '): ' +
                    (j.error || 'password sbagliata?'));
  }
  return j.pass;
}

function elencoChiavi(pass) {
  var r = UrlFetchApp.fetch(PROXY + '/kv/chiavi', {
    headers: { 'X-QM-Pass': pass },
    muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) {
    throw new Error('Elenco chiavi non disponibile (' + r.getResponseCode() +
                    '). Il Worker pubblicato e\' aggiornato al 06/09/2026 o successivo?');
  }
  var j = JSON.parse(r.getContentText() || '{}');
  if (j.complete === false) {
    avvisa('Backup Compass — archivio molto grande',
           'L\'elenco delle chiavi e\' stato troncato: la copia potrebbe essere incompleta.');
  }
  return j.chiavi || [];
}

function leggiTutto(chiavi, pass) {
  var dati = {};
  // A blocchi: una richiesta per volta su qualche centinaio di chiavi sfiorerebbe il tempo
  // massimo di esecuzione di Apps Script.
  var BLOCCO = 20;
  for (var i = 0; i < chiavi.length; i += BLOCCO) {
    var gruppo = chiavi.slice(i, i + BLOCCO);
    var richieste = gruppo.map(function (k) {
      return {
        url: PROXY + '/kv/get?key=' + encodeURIComponent(k),
        headers: { 'X-QM-Pass': pass },
        muteHttpExceptions: true
      };
    });
    var risposte = UrlFetchApp.fetchAll(richieste);
    for (var n = 0; n < risposte.length; n++) {
      if (risposte[n].getResponseCode() !== 200) continue;
      try {
        var v = JSON.parse(risposte[n].getContentText() || '{}').value;
        if (v !== null && v !== undefined) dati[gruppo[n]] = v;
      } catch (e) { /* una chiave illeggibile non ferma le altre */ }
    }
  }
  return dati;
}

// Lascia una traccia dentro Compass, cosi' il Pannello App puo' dire quando e' stata fatta
// l'ultima copia automatica. Senza, da Compass non si distingue "il backup non c'e'" da
// "il backup c'e' ma sta su un Drive che questa schermata non vede" — e la differenza fra le
// due e' esattamente cio' che si vuole sapere.
//
// E' l'UNICA scrittura di tutto lo script: una al giorno su un tetto di 1.000. Se fallisce
// non si tocca il backup, che a quel punto e' gia' salvato: si scrive solo nel registro.
function segnaSuCompass(pass, chiavi, nomeFile) {
  try {
    UrlFetchApp.fetch(PROXY + '/kv/set', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'X-QM-Pass': pass },
      payload: JSON.stringify({
        key: 'qm_backup_ultimo',
        value: JSON.stringify({ ts: Date.now(), chiavi: chiavi, file: nomeFile, dove: 'drive' })
      }),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('Traccia su Compass non scritta: ' + e);
  }
}

function cartellaBackup(prop) {
  // Il nome predefinito e' quello della cartella che il QM ha creato a mano il 06/09/2026.
  // Se non la trova se ne crea una sua nella home, ed e' esattamente cosi' che ci si ritrova
  // due cartelle di backup con dentro copie diverse.
  var nome = prop.getProperty('QM_CARTELLA') || 'Back-Up Compass QM';
  var trovate = DriveApp.getFoldersByName(nome);
  return trovate.hasNext() ? trovate.next() : DriveApp.createFolder(nome);
}

function potaVecchie(cartella, quante) {
  if (!(quante > 0)) return;
  var file = [];
  var it = cartella.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().indexOf('compass-archivio-') === 0) file.push(f);
  }
  file.sort(function (a, b) { return b.getName().localeCompare(a.getName()); });
  file.slice(quante).forEach(function (f) { f.setTrashed(true); });
}

function avvisa(oggetto, testo) {
  try {
    var a = PropertiesService.getScriptProperties().getProperty('QM_EMAIL') ||
            Session.getEffectiveUser().getEmail();
    if (a) MailApp.sendEmail(a, oggetto, testo);
  } catch (e) { /* se non si puo' avvisare, almeno non si perde il backup */ }
}
