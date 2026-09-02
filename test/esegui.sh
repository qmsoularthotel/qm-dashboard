#!/bin/bash
# Rete di sicurezza di Compass — si lancia dalla cartella del progetto con:
#
#     bash test/esegui.sh
#
# Carica app.js in un ambiente finto (test/ambiente.js) ed esegue i controlli sui calcoli
# (test/controlli.js). Non tocca internet, non tocca i dati veri, non apre il browser.
#
# Esce con codice 1 se qualcosa non torna. Va lanciato PRIMA di ogni pubblicazione.

cd "$(dirname "$0")/.." || exit 1

if [ ! -f app.js ]; then
  echo "app.js non trovato: lancia lo script dalla cartella del progetto."
  exit 1
fi

# Due strade per lo stesso lavoro: Node dove c'è (Linux, claude.ai), altrimenti osascript
# (Mac senza Node). Stessi file, stessi controlli.
if command -v node >/dev/null 2>&1; then
  USCITA=$(node test/node.js 2>&1)
else
  USCITA=$(osascript -l JavaScript -e '
function leggi(p){ return $.NSString.stringWithContentsOfFileEncodingError(p,$.NSUTF8StringEncoding,null).js; }

// 1. Sintassi: se app.js non si carica, i controlli non avrebbero senso.
try { eval("(function(){" + leggi("app.js") + "})"); }
catch (e) { console.log("ERRORE DI SINTASSI in app.js: " + e); console.log("ESITO:FALLITO"); $.exit(0); }
console.log("sintassi di app.js: ok");

// 2. Controlli. const e let al primo livello resterebbero chiusi dentro eval e le
//    funzioni non sarebbero raggiungibili: si convertono in var.
var ambiente = leggi("test/ambiente.js");
var app      = leggi("app.js").replace(/^(\s*)(const|let)\s/gm, "$1var ");
var worker   = leggi("worker.js")
  .replace("import { connect } from '"'"'cloudflare:sockets'"'"';", "var connect=function(){};")
  .replace("export default {", "var _workerFetch = {")
  .replace(/^(\s*)(const|let)\s/gm, "$1var ");
var casi     = leggi("test/controlli.js") + "\n" + leggi("test/mime.js");
try {
  eval(ambiente + "\n" + app + "\n" + worker + "\n" + casi);
  console.log(KO > 0 ? "ESITO:FALLITO" : "ESITO:OK");
} catch (e) {
  console.log("\nERRORE DURANTE I CONTROLLI: " + e);
  console.log("ESITO:FALLITO");
}
' 2>&1)
fi

echo "$USCITA" | grep -v "^ESITO:"

# Numeri di versione: se app.js o style.css sono cambiati ma index.html no, chi ricarica
# la pagina continua a vedere la versione vecchia e nessuno dei due capisce perché.
# Si segnala qui invece di aggiornarli d'ufficio: uno strumento che modifica i file mentre
# stai controllando qualcos'altro è peggio del problema che risolve.
VERSIONE_KO=0
_mod() { git diff HEAD --name-only -- "$1" 2>/dev/null | grep -q . ; }
if _mod app.js && ! _mod index.html; then
  echo ""
  echo "  ATTENZIONE  app.js è cambiato ma il numero di versione no."
  echo "              Lancia:  bash strumenti/versione.sh"
  VERSIONE_KO=1
fi
if _mod style.css && ! _mod index.html; then
  echo ""
  echo "  ATTENZIONE  style.css è cambiato ma il numero di versione no."
  echo "              Lancia:  bash strumenti/versione.sh"
  VERSIONE_KO=1
fi

# Copia vecchia: se nel frattempo l'altra macchina ha pubblicato qualcosa, pubblicare da
# qui farebbe divergere le due versioni, e riunirle a mano è la parte fastidiosa. Il
# controllo non blocca se manca la rete: si lavora anche scollegati.
COPIA_KO=0
if git fetch -q origin 2>/dev/null; then
  DIETRO=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
  if [ "$DIETRO" -gt 0 ]; then
    echo ""
    echo "  ATTENZIONE  questa copia è indietro di $DIETRO modifiche fatte sull'altra macchina."
    echo "              Lancia:  bash strumenti/inizio.sh"
    COPIA_KO=1
  fi
fi

# Stessa regola in breakfast.html, che i controlli non possono caricare (e' una pagina a se,
# non app.js). L'archivio mensile e' condiviso fra dashboard e app: se una delle due
# tornasse ad archiviare i giorni futuri, il totale del mese ricomincerebbe a mentire.
BKF_KO=0
# Aggiornamento automatico: senza, un'app rimasta aperta continua a girare col codice
# vecchio a tempo indeterminato — ed e' cosi' che una correzione pubblicata resta inefficace
# senza che nessuno se ne accorga (22/08/2026, archivio colazioni).
for _app in housekeeper.html breakfast.html controllo-mattino.html inventory.html dvr.html; do
  # Le richieste devono avere la maschera di Compass, non quelle del browser: "compass-qm.com
  # dice" su un'azione che cancella dati non dice a nessuno chi sta chiedendo.
  case "$_app" in
    breakfast.html|inventory.html|controllo-mattino.html)
      if ! grep -q 'function cqConferma' "$_app"; then
        echo ""
        echo "  ERRORE      $_app non ha piu' la finestra di conferma di Compass."
        echo "              Le richieste tornerebbero a essere quelle grigie del browser."
        BKF_KO=1
      fi ;;
  esac
  # Scritture sul cloud: il piano gratuito ne concede 1.000 al giorno e l'01/09/2026 siamo
  # arrivati a 934, quasi tutte ripetizioni identiche partite da sole. Senza il filtro si
  # torna a consumarle a vuoto, e quando il limite e' superato due postazioni smettono di
  # vedersi fino a mezzanotte.
  if ! grep -q 'function qmKvSet' "$_app"; then
    echo ""
    echo "  ERRORE      $_app non filtra piu' le scritture identiche sul cloud."
    echo "              Il limite giornaliero si esaurirebbe di nuovo a vuoto."
    BKF_KO=1
  fi
  # Il filtro qui sopra, nella sua prima versione, chiamava SE STESSO invece della fetch:
  # la seconda chiamata trovava il valore appena memorizzato e tornava subito, quindi la
  # scrittura non partiva mai. Nessun errore da nessuna parte, l'app continuava a salvare
  # in localStorage e nessun altro dispositivo vedeva piu' niente (giro Culligan del 02/09).
  # Il controllo di prima non bastava: verificava che la funzione esistesse, non che
  # scrivesse.
  # Si guarda DENTRO il corpo della funzione (dalla riga della firma alla graffa di
  # chiusura, saltando la firma stessa): un commento che cita l'errore, o un altro
  # chiamante legittimo altrove nel file, non devono far scattare il controllo.
  if sed -n '/^function qmKvSet(/,/^}/p' "$_app" | tail -n +2 | grep -q 'qmKvSet('; then
    echo ""
    echo "  ERRORE      $_app: qmKvSet chiama se stessa, la scrittura sul cloud non parte."
    echo "              L'app sembra funzionare ma i dati restano solo su quel dispositivo."
    BKF_KO=1
  fi
  if ! grep -q "_qmKvScrivi" "$_app"; then
    echo ""
    echo "  ERRORE      $_app non ha piu' _qmKvScrivi: chi esegue davvero la scrittura?"
    BKF_KO=1
  fi
  if ! grep -q 'QM_APP_BUILD' "$_app"; then
    echo ""
    echo "  ERRORE      $_app non dichiara piu' la propria versione (QM_APP_BUILD)."
    echo "              Senza, l'app non puo' accorgersi di essere una copia vecchia."
    BKF_KO=1
  fi
  if ! grep -q 'qmCheckVersione' "$_app"; then
    echo ""
    echo "  ERRORE      $_app non si aggiorna piu' da sola quando pubblichi una correzione."
    echo "              Manca qmCheckVersione(): l'app resterebbe al codice vecchio finche'"
    echo "              qualcuno non la chiude a mano."
    BKF_KO=1
  fi
done
# Compass e la cassa restano aperte tutto il giorno sui PC: senza il controllo sull'ETag
# continuerebbero a girare col codice con cui sono state caricate, anche per settimane.
# Per Compass il controllo vive in app.js (index.html non ha JS proprio oltre a splash e
# versione); per la cassa dentro reception.html, che e' una pagina a se.
for _pag in app.js reception.html; do
  if ! grep -q 'qmCheckVersione' "$_pag"; then
    echo ""
    echo "  ERRORE      $_pag non controlla piu' se il codice pubblicato e' cambiato."
    echo "              Sono le pagine che restano aperte tutto il giorno: senza, una"
    echo "              correzione pubblicata non arriva mai su quella postazione."
    BKF_KO=1
  fi
done
# La scrittura sicura dei registri di cassa e' duplicata in reception.html e app.js (una
# e' una pagina a se, l'altra la dashboard): se una delle due tornasse a sovrascrivere
# l'elenco intero, due postazioni ricomincerebbero a cancellarsi i movimenti a vicenda.
for _pag in reception.html app.js; do
  if ! grep -q '_cassaUnisci' "$_pag"; then
    echo ""
    echo "  ERRORE      $_pag non unisce piu' i registri di cassa per id."
    echo "              Due postazioni che registrano insieme si perderebbero un"
    echo "              movimento a testa, in silenzio, su denaro contato."
    BKF_KO=1
  fi
done
if ! grep -q 'key>oggi' breakfast.html; then
  echo ""
  echo "  ERRORE      breakfast.html non esclude piu' i giorni futuri dall'archivio mensile."
  echo "              Cerca bkfAggiornaHistoryInMemoria(): serve il controllo key>oggi."
  BKF_KO=1
fi

# Worker non pubblicato: worker.js si pubblica a mano su Cloudflare (vedi CLAUDE.md, la
# pubblicazione automatica è stata valutata e scartata). Una correzione può quindi essere
# scritta, versionata e non attiva — successo il 21/08/2026, per ore, senza alcun segnale.
# Il Worker dichiara la propria versione su /versione: qui si confronta con quella scritta
# nel file. Non blocca: se manca la rete, o se il punto /versione non c'è ancora perché il
# Worker in produzione è anteriore a questo controllo, si tace e si va avanti.
VIVA=$(curl -s -m 6 "https://anthropic-proxy.qm-d82.workers.dev/versione" 2>/dev/null \
       | sed -n 's/.*"versione"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
LOCALE=$(sed -n "s/^const WORKER_VERSIONE = '\([^']*\)'.*/\1/p" worker.js)
if [ -n "$VIVA" ] && [ -n "$LOCALE" ] && [ "$VIVA" != "$LOCALE" ]; then
  echo ""
  echo "  ATTENZIONE  il Worker pubblicato è la versione $VIVA, worker.js è la $LOCALE."
  echo "              Le correzioni a mail e risposte NON sono attive finché non lo ripubblichi:"
  echo "              Cloudflare → Workers → anthropic-proxy → Modifica codice → Cmd+A → incolla → Deploy."
fi

if echo "$USCITA" | grep -q "^ESITO:OK" && [ "$VERSIONE_KO" = "0" ] && [ "$COPIA_KO" = "0" ] && [ "$BKF_KO" = "0" ]; then
  exit 0
fi
exit 1
