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
  .replace("export default {", "var _workerFetch = {")
  .replace(/^(\s*)(const|let)\s/gm, "$1var ");
// compass-ops.html e'"'"' un'"'"'app a se, fuori da Compass e fuori dal cloud: non ha
// nessun'"'"'altra rete sotto. Si estrae il suo script principale (l'"'"'ULTIMO blocco <script>
// del file) e lo si carica come app.js. La direttiva "use strict" va tolta: in eval
// stretto le var resterebbero chiuse dentro e le funzioni non sarebbero raggiungibili.
var gHtml    = leggi("compass-ops.html");
var gFine    = gHtml.lastIndexOf("</script>");
var gInizio  = gHtml.lastIndexOf("<script>", gFine);
var galleria = gHtml.slice(gInizio + 8, gFine)
  .replace(/\x27use strict\x27;/, "")
  .replace(/^(\s*)(const|let)\s/gm, "$1var ");
var casi     = leggi("test/controlli.js") + "\n" + leggi("test/galleria.js");
try {
  eval(ambiente + "\n" + app + "\n" + worker + "\n" + galleria + "\n" + casi);
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

# Guida di stile (24/11/2026, richiesta del QM): ogni cambio di stile si riporta in
# compass-qm-design-system.html nello stesso lavoro, altrimenti la guida invecchia in silenzio.
if _mod style.css && ! _mod compass-qm-design-system.html; then
  echo ""
  echo "  ERRORE      style.css è cambiato ma la guida di stile no."
  echo "              Riportare il cambio in compass-qm-design-system.html (token, componente o schermata)."
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
# San Liborio non ha mai la colazione: l'app non lo mostra mai, nemmeno coi dati vecchi.
if ! grep -q "!/lib/i.test(String(r.camera))" breakfast.html || [ "$(grep -c 'Object.values(bkfRoomInfo||{}).flat()' breakfast.html)" != "1" ]; then
  echo "  NO  breakfast.html: San Liborio può ricomparire nell'app (le camere non passano da _bkStanze)"
  BKF_KO=1
fi
# Tre card (22/11/2026): le intolleranze le scrivono più telefoni, quindi passano dalla fusione
# a tre; «In check out» conta tutti, room only compresi, e lo dice (22/11/2026).
if ! grep -q "_qmElencoSalva(BKF_INT_KEY" breakfast.html || ! grep -q "_qmElencoAggiorna(BKF_INT_KEY" breakfast.html; then
  echo "  NO  breakfast.html: le intolleranze non passano più dalla fusione a tre"
  BKF_KO=1
fi
if ! grep -q "include i room only" breakfast.html; then
  echo "  NO  breakfast.html: «In check out» non dice più che include i room only"
  BKF_KO=1
fi
# Colazione Booking.com (22/11/2026): anche l'app mostra solo chi ha la colazione inclusa,
# decide il trattamento, mai la camera — copia di _bkfConColazione in app.js.
if ! grep -q "conColazione(r)&&presentOn(r)" breakfast.html || ! grep -q "conColazione=r=>/^(BB|HB|FB|AI|MP)\$/i" breakfast.html; then
  echo "  NO  breakfast.html: la Colazione Booking.com non filtra più sulla colazione inclusa"
  BKF_KO=1
fi
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
  # Da una macchina non abilitata non si deve intravedere niente: velo pieno, non
  # trasparente, e invalicabile appena il Worker rifiuta (401). Se sparisse, i dati degli
  # ospiti tornerebbero visibili a chiunque digiti l'indirizzo.
  if ! grep -q 'qmMostraAttivazione' "$_app"; then
    echo ""
    echo "  ERRORE      $_app non mostra piu' la schermata di abilitazione."
    echo "              Una macchina non abilitata vedrebbe i dati degli ospiti."
    BKF_KO=1
  fi
  if ! grep -q 'res.status===401' "$_app"; then
    echo ""
    echo "  ERRORE      $_app non reagisce piu' al rifiuto del Worker (401)."
    echo "              Chiudendo la porta mostrerebbe una pagina vuota invece della"
    echo "              schermata di abilitazione: sembrerebbe un guasto."
    BKF_KO=1
  fi
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
  # Una scrittura non arrivata deve dirlo a chi ha il dispositivo in mano: il cloud non puo'
  # essere avvisato (se le scritture non passano, non passa nemmeno quella che segnala il
  # guasto), quindi questo e' l'unico avviso possibile. Senza, si torna al 02/09/2026: giro
  # Culligan fatto davvero, dati mai arrivati, e nessuno che potesse accorgersene.
  if ! grep -q 'qmAvvisoScrittura' "$_app"; then
    echo ""
    echo "  ERRORE      $_app non avvisa piu' quando una scrittura non arriva sul cloud."
    echo "              Chi la usa crederebbe di aver salvato, e i dati resterebbero li'."
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

# Sezioni di app.js mai documentate. Il file e' passato da 6.300 a 16.400 righe e la mappa in
# CLAUDE.md era ferma a mesi prima: dodici sezioni non erano citate da nessuna parte, e chi
# apriva il progetto (o io stesso in una sessione nuova) non poteva sapere che esistevano.
NONDOC=$(python3 - <<'PYDOC'
import re
app = open('app.js', encoding='utf-8').read()
doc = open('CLAUDE.md', encoding='utf-8').read()
nomi = [l.split('§§', 1)[1].strip() for l in app.split('\n') if '// §§' in l]
fuori = []
for n in nomi:
    # si confronta la prima parte del nome, prima di trattino o parentesi
    chiave = re.split(r'[—\-(]', n)[0].strip()
    if len(chiave) > 3 and chiave.lower() not in doc.lower():
        fuori.append(chiave)
print(' | '.join(sorted(set(fuori))))
PYDOC
)
if [ -n "$NONDOC" ]; then
  echo ""
  echo "  ATTENZIONE  sezioni di app.js non documentate in CLAUDE.md:"
  echo "              $NONDOC"
  echo "              Non blocca, ma e' cosi' che si perdono i pezzi: chi riapre il"
  echo "              progetto fra sei mesi non sa nemmeno che esistono."
fi

# La scheda "Stato del sistema" confronta la versione del Worker in linea con quella che il
# codice si aspetta (WORKER_VERSIONE_ATTESA in app.js). Se quella costante resta indietro
# rispetto a worker.js, la scheda dice "da ripubblicare" anche dopo una pubblicazione fatta
# — cioe' un allarme che suona sempre, che e' il modo piu' rapido per farlo ignorare.
ATTESA=$(sed -n "s/^const WORKER_VERSIONE_ATTESA='\([^']*\)'.*/\1/p" app.js)
LOCALE=$(sed -n "s/^const WORKER_VERSIONE = '\([^']*\)'.*/\1/p" worker.js)
if [ -n "$ATTESA" ] && [ -n "$LOCALE" ] && [ "$ATTESA" != "$LOCALE" ]; then
  echo ""
  echo "  ERRORE      app.js si aspetta il Worker $ATTESA, worker.js e' la $LOCALE."
  echo "              Allinea WORKER_VERSIONE_ATTESA in app.js, altrimenti la scheda"
  echo "              Stato del sistema dira' 'da ripubblicare' anche quando e' a posto."
  BKF_KO=1
fi

# Backup dell'archivio: l'elenco delle chiavi da salvare e' scritto a mano (KV non sa
# elencare le proprie chiavi). Una chiave nuova che nessuno aggiunge a QM_BACKUP_FISSE e'
# una chiave che nel backup NON c'e', e non lo si scopre fino al giorno in cui serve —
# cioe' quando l'originale non c'e' piu'.
MANCANTI=$(python3 - <<'PYCHK'
import re, glob
app = open('app.js', encoding='utf-8').read()
m = re.search(r"const QM_BACKUP_FISSE=\[(.*?)\];", app, re.S)
elenco = set(re.findall(r"'(qm_[A-Za-z_0-9]+)'", m.group(1))) if m else set()
prefissi = ['qm_rev_', 'qm_ts_rev_', 'qm_rev_exp_', 'qm_ts_rev_exp_',
            'qm_inv_catalog_', 'qm_inv_moves_', 'qm_cm_']
scritte = set()
for f in ['app.js'] + glob.glob('*.html'):
    s = open(f, encoding='utf-8').read()
    # Le tre strade per cui un dato finisce sul cloud: kvSet/qmKvSet diretto, LS.set (che
    # antepone 'qm_'), e _qmSalvaArchivio (gli archivi a elenchi: DVR, biancheria, resi).
    scritte |= set(re.findall(r"(?:qmK|k)vSet(?:Local)?\('(qm_[A-Za-z_0-9]+)'", s))
    scritte |= set('qm_' + k for k in re.findall(r"LS\.set\('([A-Za-z_0-9]+)'", s))
    scritte |= set(re.findall(r"_qmSalvaArchivio\('(qm_[A-Za-z_0-9]+)'", s))
    # ...e le costanti: kvSet(NOME_KEY, ...) con 'const NOME_KEY = "qm_..."' altrove.
    for cost in set(re.findall(r"(?:qmK|k)vSet(?:Local)?\(([A-Z][A-Z_0-9]+)\s*,", s)):
        for f2 in ['app.js'] + glob.glob('*.html'):
            m2 = re.search(r"const %s\s*=\s*'(qm_[A-Za-z_0-9]+)'" % cost, open(f2, encoding='utf-8').read())
            if m2:
                scritte.add(m2.group(1)); break
fuori = [k for k in sorted(scritte)
         if k not in elenco and not any(k.startswith(p) for p in prefissi) and k not in ('qm_', 'qm_hk_')]
print(' '.join(fuori))
PYCHK
)
if [ -n "$MANCANTI" ]; then
  echo ""
  echo "  ERRORE      chiavi salvate sul cloud ma assenti dalla copia di sicurezza:"
  echo "              $MANCANTI"
  echo "              Aggiungerle a QM_BACKUP_FISSE in app.js, altrimenti quei dati non"
  echo "              sono in nessun backup e non c'e' modo di accorgersene."
  BKF_KO=1
fi

# pdf.js arriva da un CDN. Una riga di primo livello che lo tocca senza guardia lancia a
# caricamento quando il CDN non risponde, e porta giu' TUTTO il resto di app.js: le
# costanti restano non inizializzate e ogni vista muore in "Cannot access ... before
# initialization". La pagina resta a schermo, inerte, senza dire perche'. Non basta
# controllare che PDF_OK esista: va verificato che NESSUNO tocchi pdfjsLib fuori dalla
# guardia, che e' il comportamento vero.
PDFKO=$(python3 - <<'PYPDF'
import re
brutte = []
for f in ['app.js', 'registration-galleria.html']:
    for n, l in enumerate(open(f, encoding='utf-8'), 1):
        if 'pdfjsLib' not in l or l.lstrip().startswith('//'):
            continue
        s = l.strip()
        # ammessi: la prova di esistenza, la riga guardata da PDF_OK, e l'unico punto che
        # apre davvero un documento (dentro una funzione, quindi rientrato).
        if re.match(r"(const|var)\s+PDF_OK\s*=", s): continue
        if s.startswith('if(PDF_OK)') or s.startswith('if (PDF_OK)'): continue
        if l[:1] in (' ', '\t'): continue      # dentro una funzione: non gira a caricamento
        brutte.append('%s:%d' % (f, n))
print(' '.join(brutte))
PYPDF
)
if [ -n "$PDFKO" ]; then
  echo ""
  echo "  ERRORE      pdfjsLib toccato a primo livello senza guardia PDF_OK:"
  echo "              $PDFKO"
  echo "              Se il CDN non risponde quella riga lancia e porta giu' tutto il file:"
  echo "              l'app resta a schermo ma inerte. Vedi 'PDF_OK' in app.js."
  BKF_KO=1
fi
# E ogni apertura di PDF deve passare dall'unico punto che sa dirlo a parole quando il
# lettore manca: altrimenti l'utente legge "pdfjsLib is not defined" e non sa cosa fare.
if grep -n 'pdfjsLib.getDocument' app.js | grep -qv '_pdfApri\|return pdfjsLib.getDocument'; then
  echo ""
  echo "  ERRORE      un PDF viene aperto senza passare da _pdfApri() in app.js."
  BKF_KO=1
fi

# registration-galleria.html e' un'app a se': dei colleghi della Galleria, fuori da Compass,
# senza schermata di abilitazione. Dal 23/11/2026 (QM) legge l'interruttore del Pannello App e
# segna l'ultimo utilizzo, ma SOLO sulle sue due chiavi bg_rc_status / bg_rc_ultimo e col codice
# della Galleria gia' presente sul PC: niente elenco, niente cancellazioni, nessuna chiave qm_*,
# nessuna schermata che chieda un codice, e nell'ultimo utilizzo solo ora, parola e numero —
# mai nomi, camere o date degli ospiti. Senza codice o senza rete l'app resta accesa.
_RC_KO=""
grep -q "qmKvSet\|/kv/delete\|/kv/chiavi\|gbMostraAttivazione\|qmMostraAttivazione" registration-galleria.html && _RC_KO="usa funzioni o percorsi del cloud non ammessi"
[ "$(grep -c "/kv/" registration-galleria.html)" = "2" ] || _RC_KO="le chiamate al cloud non sono piu' solo le due dell'interruttore"
grep "/kv/" registration-galleria.html | grep -qv "RC_STATO_KEY\|RC_USO_KEY" && _RC_KO="una chiamata al cloud non usa le chiavi bg_rc_*"
grep -q "const RC_STATO_KEY='bg_rc_status',RC_USO_KEY='bg_rc_ultimo';" registration-galleria.html || _RC_KO="chiavi dell'interruttore cambiate"
grep -q "JSON.stringify({ts:Date.now(),cosa:cosa==='stampa'?'stampa':'caricamento',n:Math.max(0,parseInt(n,10)||0)})" registration-galleria.html || _RC_KO="l'ultimo utilizzo potrebbe portare altri dati"
{ grep -A1 "^async function rcControllaStato(){" registration-galleria.html | grep -q "const pass=_rcPass();if(!pass)return;" \
  && sed -n '/^async function rcControllaStato(){/,/^}/p' registration-galleria.html | grep -q "if(!r.ok)return;" \
  && sed -n '/^async function rcControllaStato(){/,/^}/p' registration-galleria.html | grep -q "}catch(e){return;}"; } \
  || _RC_KO="senza codice o senza rete l'app potrebbe non restare accesa"
if [ -n "$_RC_KO" ]; then
  echo ""
  echo "  ERRORE      registration-galleria.html: $_RC_KO."
  echo "              Deve leggere solo il suo interruttore e segnare solo ora e numero di schede."
  BKF_KO=1
fi
# L'aggiornamento automatico invece deve restarci: guarda solo il proprio file, non serve
# nessun server, ed e' l'unico modo perche' una correzione pubblicata arrivi a chi tiene
# l'app sempre aperta.
for _c in QM_APP_BUILD qmCheckVersione; do
  if ! grep -q "$_c" registration-galleria.html; then
    echo ""
    echo "  ERRORE      registration-galleria.html non si aggiorna piu' da sola ($_c)."
    BKF_KO=1
  fi
done
# compass-ops.html e' l'app del Resident Manager per Art Resort e Santa Brigida.
# Dal 12/09/2026 usa il cloud di Compass, ma con un codice che il Worker limita a leggere e
# scrivere chiavi bg_* (permessoGalleria in worker.js). La pagina non deve quindi mai
# chiedere l'elenco delle chiavi, cancellare, o toccare una chiave qm_*: il Worker lo
# rifiuterebbe comunque, ma una pagina che ci prova e' una pagina che si e' persa la regola.
if grep -qE "/kv/delete|/kv/chiavi|qmKvSet|_gbKv(Get|Set)\('qm_" compass-ops.html; then
  echo ""
  echo "  ERRORE      compass-ops.html chiede al Worker piu' di quanto il suo codice apre."
  echo "              Il codice della Galleria vale solo per /kv/get e /kv/set su chiavi bg_*."
  BKF_KO=1
fi
if ! grep -qF "function permessoGalleria(" worker.js || ! grep -qF "/^bg_[A-Za-z0-9_]+\$/" worker.js; then
  echo ""
  echo "  ERRORE      worker.js non limita piu' il codice della Galleria alle chiavi bg_*."
  BKF_KO=1
fi
# Ogni pulsante deve chiamare una funzione che esiste. Il 06/09/2026 togliendo i collegamenti
# di abilitazione sono sparite anche qmChiediPass e qmCopiaCodice: "Copia codice" in
# Sicurezza non ha fatto niente per diciassette giorni, senza un errore a schermo.
_senza_funzione(){  # $1 = pagina, altri = file che ne compongono il codice
  local _p="$1"; shift
  for _n in $(cat "$@" | grep -oE "on(click|change|input|keydown|keyup|blur|focus)=\\\\?[\"'](return )?(await )?[A-Za-z_\$][A-Za-z0-9_\$]*\(" \
              | sed -E "s/.*[\"'](return )?(await )?//; s/\($//" | sort -u); do
    case "$_n" in if|event|this|document|window|setTimeout|alert|confirm|location|history) continue;; esac
    if ! cat "$@" | grep -qE "function[[:space:]]+$_n[[:space:]]*\(|(const|let|var)[[:space:]]+$_n[[:space:]]*="; then
      echo ""
      echo "  ERRORE      $_p: un pulsante chiama $_n(), che non esiste. Il clic non fa niente."
      BKF_KO=1
    fi
  done
}
_senza_funzione index.html index.html app.js ddt-shared.js
_senza_funzione breakfast.html breakfast.html ddt-shared.js
for _f in housekeeper.html inventory.html controllo-mattino.html dvr.html compass-ops.html registration-galleria.html; do
  _senza_funzione "$_f" "$_f"
done
# Quale avviso va a schermo oggi: Compass lo dice al QM, l'app lo mostra in cucina. Se le
# due copie divergono, i due vedono avvisi diversi (05/10/2026).
_avv(){ sed -n '/^function _bkfAvvisoDiOggi(/,/^}/p' "$1"; }
if [ "$(_avv app.js)" != "$(_avv breakfast.html)" ] || [ -z "$(_avv breakfast.html)" ]; then
  echo ""
  echo "  ERRORE      _bkfAvvisoDiOggi in breakfast.html non e' identica a quella di app.js."
  BKF_KO=1
fi
# Chi e' in casa e chi e' in check out (23/11/2026): stesse regole in Compass e nell'app, e
# l'app deve sapere di che giorno e' lo snapshot, altrimenti prima del caricamento del mattino
# mostra come «in check out» i partiti di ieri.
for _fn in _bkfPresenteIl _bkfInCheckout; do
  _cp(){ sed -n "/^function $_fn(/,/^}/p" "$1"; }
  if [ "$(_cp app.js)" != "$(_cp breakfast.html)" ] || [ -z "$(_cp breakfast.html)" ]; then
    echo ""
    echo "  ERRORE      $_fn in breakfast.html non e' identica a quella di app.js."
    BKF_KO=1
  fi
done
if ! grep -q "key=qm_bkf_room_info_date" breakfast.html || ! grep -q "_bkfInCheckout(r,targetDay,snapGiorno)" breakfast.html; then
  echo ""
  echo "  ERRORE      breakfast.html: «In check out» non tiene piu' conto del giorno del caricamento."
  BKF_KO=1
fi
# La casella del nuovo avviso sta in una colonna: senza flex:none il suo flex:1 la schiaccia
# a due righe e il testo lungo scorre dentro invece di farla crescere (05/10/2026).
if ! grep -qE '^\.miniapp-avviso-prog \.miniapp-avviso-testo\{flex:none' style.css; then
  echo ""
  echo "  ERRORE      la casella del nuovo avviso Breakfast non cresce piu' col testo (manca flex:none)."
  BKF_KO=1
fi
# La fusione a tre degli elenchi condivisi (_qmTre) e' copiata in breakfast.html e
# inventory.html: se una delle tre copie cambia da sola, telefono e Compass fondono in
# modo diverso e un DDT o un movimento puo' sparire di nuovo.
_tre(){ sed -n '/^function _qmTre(/,/^}/p' "$1"; }
for _f in breakfast.html inventory.html; do
  if [ "$(_tre app.js)" != "$(_tre $_f)" ] || [ -z "$(_tre $_f)" ]; then
    echo ""
    echo "  ERRORE      _qmTre in $_f non e' identica a quella di app.js."
    BKF_KO=1
  fi
  if grep -qE "qmKvSet\((DDT_KEY|'qm_inv_(moves|catalog)_)" "$_f" || grep -qE "kvSet\('qm_inv_(moves|catalog)_" "$_f"; then
    echo ""
    echo "  ERRORE      $_f scrive DDT o inventario senza fondere col cloud (_qmElencoSalva)."
    BKF_KO=1
  fi
done
if grep -qE "kvSet\((DDT_KEY|ORD_KEY|movKey|'qm_inv_(moves|catalog)_|'qm_rev_sent')" app.js; then
  echo ""
  echo "  ERRORE      app.js scrive un elenco condiviso senza fondere col cloud (_qmElencoSalva)."
  BKF_KO=1
fi
# La tessera Prenotazioni delle altre postazioni si aggiorna solo se il giro e l'avvio
# passano gli arrivi letti dal cloud a _prenTesseraDaCloud (27/09/2026: pallino rosso sul
# Mac della collega, PDF ricaricato da capo). Due chiamate: giro e avvio.
if [ "$(grep -c '_prenTesseraDaCloud(\(obj\|arriviData\))' app.js)" -lt 2 ]; then
  echo ""
  echo "  ERRORE      il giro o l'avvio non aggiornano piu' la tessera Prenotazioni dal cloud."
  BKF_KO=1
fi
# Due funzioni con lo stesso nome nella stessa pagina: vince l'ultima, in silenzio. Il
# 24/09/2026 la copia di _biaEsito nella Galleria si chiamava _gbEsito come la funzione che
# scrive "salvato / NON salvato sul cloud", e l'avviso di salvataggio e' sparito.
for _f in app.js housekeeper.html breakfast.html inventory.html controllo-mattino.html dvr.html compass-ops.html registration-galleria.html; do
  _dup=$(grep -oE "^(async )?function [A-Za-z_\$][A-Za-z0-9_\$]*" "$_f" | awk '{print $NF}' | sort | uniq -d | tr '\n' ' ')
  if [ -n "$_dup" ]; then
    echo ""
    echo "  ERRORE      $_f: funzioni definite due volte ($_dup) — vale solo l'ultima."
    BKF_KO=1
  fi
done
# Le pagine si APRONO davvero in Chrome senza finestra (26/09/2026): i controlli qui sopra
# provano i calcoli, questa prova che Compass e le app partano senza errori JavaScript.
# Senza Chrome (sessioni sul web) si salta e lo dice. Vedi test/pagine.py.
echo ""
echo "── Pagine nel browser ─────────────────────────────"
if ! python3 test/pagine.py; then
  BKF_KO=1
fi
# Leggere il lasciapassare di Compass (qm_pass) e' ammesso; scrivere una qm_* no.
if grep -qE "localStorage\.(set|remove)Item\(.qm_" compass-ops.html; then
  echo ""
  echo "  ERRORE      compass-ops.html scrive su una chiave qm_*."
  echo "              Le sue chiavi devono restare sotto bg_: una qm_ entrerebbe nel giro"
  echo "              di sincronizzazione di Compass e le due app si sovrascriverebbero."
  BKF_KO=1
fi
# L'aggiornamento automatico invece deve restarci: guarda solo il proprio file, non serve
# nessun server, ed e' l'unico modo perche' una correzione arrivi a chi la tiene aperta.
# Lo splash parte a ogni apertura e si salta sul ricaricamento; l'aggiornamento automatico lo segna in sessionStorage, NON basta performance.navigation.type: quando cambia
# QM_APP_BUILD l'aggiornamento fa location.replace(...?v=...), che e' una navigazione di tipo
# `navigate` e non `reload` — col solo nav.type ripartirebbe a ogni pubblicazione. E' lo
# stesso difetto gia' corretto su index.html, vedi CLAUDE.md "Compass (index.html)".
if ! grep -qF "sessionStorage.getItem('bg_splash')" compass-ops.html; then
  echo ""
  echo "  ERRORE      lo splash di compass-ops.html non usa piu' sessionStorage."
  echo "              Con performance.navigation.type ripartirebbe a ogni aggiornamento"
  echo "              automatico, che non e' una riapertura."
  BKF_KO=1
fi
for _c in "QM_APP_BUILD=" "function qmCheckVersione(" "setInterval(qmCheckVersione"; do
  if ! grep -qF "$_c" compass-ops.html; then
    echo ""
    echo "  ERRORE      compass-ops.html non si aggiorna piu' da sola ($_c)."
    echo "              Resta aperta per giorni sul PC del Resident: senza questo"
    echo "              continuerebbe a girare col codice con cui e' stata caricata."
    BKF_KO=1
  fi
done

# Compass resta aperto tutto il giorno sui PC: senza il controllo sull'ETag continuerebbe a
# girare col codice con cui e' stato caricato, anche per settimane. Il controllo vive in
# app.js (index.html non ha JS proprio oltre a splash e versione).
for _pag in app.js; do
  if ! grep -q 'qmCheckVersione' "$_pag"; then
    echo ""
    echo "  ERRORE      $_pag non controlla piu' se il codice pubblicato e' cambiato."
    echo "              E' la pagina che resta aperta tutto il giorno: senza, una"
    echo "              correzione pubblicata non arriva mai su quella postazione."
    BKF_KO=1
  fi
done
if ! grep -q 'key>oggi' breakfast.html; then
  echo ""
  echo "  ERRORE      breakfast.html non esclude piu' i giorni futuri dall'archivio mensile."
  echo "              Cerca bkfAggiornaHistoryInMemoria(): serve il controllo key>oggi."
  BKF_KO=1
fi

# Registration Cards: il file non si carica dalla pagina, solo dai Caricamenti (14/11/2026).
if grep -q 'id="rcFileInput"' index.html || grep -q 'rcResetApp()' index.html \
   || awk '/^function rcRenderSourceLine/,/^}/' app.js | grep -q 'Aggiorna file'; then
  echo ""
  echo "  ERRORE      Registration Cards: e' tornata la possibilita' di caricare il file dalla pagina."
  BKF_KO=1
fi

# Didascalia "Aggiornato" dell'app Housekeeping: deve prendere il dato PIU' RECENTE (Piano,
# Prenotazioni), non il segnatempo dei conteggi SA/BH, che Compass di proposito non
# riscrive se i numeri non cambiano. Restava fermo al primo caricamento e le cameriere
# credevano che l'app non si aggiornasse (28/09/2026).
if ! grep -q 'pianoData&&pianoData._ts' housekeeper.html || ! grep -q '_arriviTs=ad._ts' housekeeper.html \
   || ! grep -q 'hkAggTesto(hkUltimoAggiornamento())' housekeeper.html; then
  echo ""
  echo "  ERRORE      housekeeper.html: la didascalia \"Aggiornato\" non guarda piu' l'ultimo"
  echo "              caricamento (Piano/Prenotazioni). Mostrerebbe di nuovo una data vecchia."
  BKF_KO=1
fi

# "Aggiornato" di Housekeeping e Breakfast: pillola leggibile che lampeggia (14/11/2026).
for f in housekeeper.html breakfast.html; do
  if ! grep -q 'id="hDataTs" class="h-agg"' $f || ! grep -q 'h-agg.lampo{animation:hAggLampo' $f; then
    echo ""
    echo "  ERRORE      $f: la scritta \"Aggiornato\" non e' piu' la pillola che lampeggia."
    BKF_KO=1
  fi
done

# Numeri in alto dell'app Housekeeping (partenze, fermate, camere): si contano dal Piano,
# come le schede delle cameriere, non dalla copia qm_hk_soul/bout che puo' restare indietro
# (05/11/2026: SoulArt 12 camere in alto, 14 nelle schede). Anche nell'anteprima dei giorni.
# Il conto stesso: 2 partenze + 1 cambio + 3 fermate SoulArt e 1 fermata Liborio = 3 · 4.
_HK_CONTA=$(sed -n '/^function hkContaPiano/,/^}/p' housekeeper.html)
# Node dove c'e' (cloud, Linux), altrimenti osascript (Mac): come il resto della rete.
_HK_PROVA="const r=hkContaPiano({partenze:['Art 1','Art 2'],cambi:['Art 3'],fermate:['Art 4','Art 5','Art 6']},{fermate:['Liborio']},null);"
if command -v node >/dev/null 2>&1; then
  _HK_RIS=$(node -e "$_HK_CONTA
$_HK_PROVA console.log(r.partenze+'·'+r.fermate)" 2>&1)
else
  _HK_RIS=$(osascript -l JavaScript -e "$_HK_CONTA
$_HK_PROVA r.partenze+'·'+r.fermate" 2>&1)
fi
for _hk in 'hkContaPiano(pianoDay.soulart,libPiano)' 'hkContaPiano(pianoDay.boutique)' \
           'hkContaPiano(ndP.soulart,ndL)' 'hkContaPiano(ndP.boutique)'; do
  grep -qF "$_hk" housekeeper.html || _HK_RIS="manca $_hk"
done
if [ "$_HK_RIS" != "3·4" ]; then
  echo ""
  echo "  ERRORE      housekeeper.html: i numeri in alto non si contano piu' dal Piano ($_HK_RIS)."
  echo "              Tornerebbero a non coincidere con le schede delle cameriere."
  BKF_KO=1
fi

# Giorno scelto con le frecce nelle app Housekeeping e Breakfast (23/11/2026): si ricorda la
# DATA e il giorno in cui e' stata scelta, non la posizione. Con la posizione un telefono
# lasciato aperto la notte ripartiva la mattina sul giorno di ieri. Copia identica nelle due.
_GG_F=$(sed -n '/^function _qmGiornoIso(/,/^function findTodayIdx(/p' breakfast.html | sed '$d')
_GG_H=$(sed -n '/^function _qmGiornoIso(/,/^function findTodayIdx(/p' housekeeper.html | sed '$d')
_GG_PROVA="var _m={};var sessionStorage={getItem:function(k){return k in _m?_m[k]:null;},setItem:function(k,v){_m[k]=String(v);}};
var G=[{data:'22/11/2026'},{data:'23/11/2026'},{data:'24/11/2026'}],oggi=function(){return 1;},r=[];
r.push(_qmGiornoIdx('k',G,oggi));
_qmGiornoSalva('k','24/11/2026');r.push(_qmGiornoIdx('k',G,oggi));
r.push(_qmGiornoIdx('k',[{data:'24/11/2026'},{data:'25/11/2026'}],oggi));
_m.k=JSON.stringify({data:'24/11/2026',il:'2000-01-01'});r.push(_qmGiornoIdx('k',G,oggi));
_m.k='2';r.push(_qmGiornoIdx('k',G,oggi));
_qmGiornoSalva('k','01/01/1999');r.push(_qmGiornoIdx('k',G,oggi));"
if command -v node >/dev/null 2>&1; then
  _GG_RIS=$(node -e "$_GG_F
$_GG_PROVA console.log(r.join(','))" 2>&1)
else
  _GG_RIS=$(osascript -l JavaScript -e "$_GG_F
$_GG_PROVA r.join(',')" 2>&1)
fi
for _f in breakfast.html housekeeper.html; do
  grep -q "parseInt(saved)\|parseInt(si)" $_f && _GG_RIS="$_f ripristina ancora la posizione"
done
grep -q "_qmGiornoIdx('bkf_day_idx',bkfData,findTodayIdx)" breakfast.html || _GG_RIS="breakfast.html non usa _qmGiornoIdx"
grep -q "_qmGiornoIdx('hk_day_idx',allDays,findTodayIdx)" housekeeper.html || _GG_RIS="housekeeper.html non usa _qmGiornoIdx"
if [ "$_GG_F" != "$_GG_H" ] || [ -z "$_GG_F" ] || [ "$_GG_RIS" != "1,2,0,1,1,1" ]; then
  echo ""
  echo "  ERRORE      app Housekeeping/Breakfast: il giorno scelto non si ricorda piu' per data e"
  echo "              per oggi soltanto ($_GG_RIS). La mattina potrebbero ripartire dal giorno di ieri."
  BKF_KO=1
fi

# Pannello App in due sezioni (23/11/2026, QM), schede in ordine alfabetico: SoulArt (Breakfast,
# Culligan, DVR, Housekeeping, Inventari) e Galleria (Compass Ops, Registration).
_PAN=$(python3 - <<'PY'
import re
s=open('index.html',encoding='utf-8').read()
a=s.find('<div class="ms-sez">SoulArt</div>');b=s.find('<div class="ms-sez ms-sez-spazio">Galleria</div>')
c=s.find('<!-- ── INVENTARIO ── -->',b)
if a<0 or b<a or c<b: print('sezioni mancanti');raise SystemExit
t=lambda x:re.findall(r'miniapp-([a-z]+)-toggle"',x)
sa,ga=t(s[a:b]),t(s[b:c])
css=open('style.css',encoding='utf-8').read()
riga='class="miniapp-grid miniapp-grid-galleria" id="miniappGridGalleria"' in s and '.miniapp-grid-galleria .miniapp-card-larga{grid-column:span 2;}' in css
if not riga: sa=sa+['(Compass Ops e Registration non più sulla stessa riga)']
print('ok' if sa==['bkf','cm','dvr','hk','inv'] and ga==['bg','rc'] else 'SoulArt '+','.join(sa)+' / Galleria '+','.join(ga))
PY
)
if [ "$_PAN" != "ok" ]; then
  echo ""
  echo "  ERRORE      Pannello App: le due sezioni SoulArt e Galleria non sono piu' quelle scelte ($_PAN)."
  BKF_KO=1
fi

# Preferenze Turnazione: con la settimana prossima nella prima riga la linguetta oro non deve
# coprire le lettere dei giorni (23/11/2026): serve la regola che fa posto.
if ! grep -q '^.tp-cal-griglia.tp-sett-prima .tp-cal-int{margin-bottom:20px;}' style.css; then
  echo ""
  echo "  ERRORE      style.css: manca lo spazio fra le lettere dei giorni e la linguetta della settimana prossima."
  BKF_KO=1
fi

# Finestre del browser (24/11/2026): conferme, avvisi e domande con casella passano dalla
# finestra di Compass (cqConferma/cqAvviso/cqModulo/cqChiedi, nelle app le copie _gb*).
# Quelle grigie del browser ("compass-qm.com dice") non dicono chi chiede e non si impaginano.
# Ammesso solo il ripiego dentro _cqApri/_gbCqApri, quando la finestra di Compass manca.
NATIVE=$(python3 - <<'PYNAT'
import re, glob
brutte = []
for f in ['app.js', 'ddt-shared.js'] + sorted(glob.glob('*.html')):
    for n, l in enumerate(open(f, encoding='utf-8'), 1):
        s = l.strip()
        if s.startswith('//') or s.startswith('*') or s.startswith('/*'):
            continue
        codice = re.sub(r"//.*$", "", s) if not re.search(r"https?://", s) else s
        if not re.search(r"(?<![\w.$])(window\.)?(prompt|confirm|alert)\((?!\))", codice):
            continue
        if re.search(r"(o\.soloAvviso\?true:window\.confirm\(o\.titolo\)|window\.prompt\(c\.etichetta\|\|o\.titolo)", codice):
            continue
        brutte.append('%s:%d' % (f, n))
print(' '.join(brutte))
PYNAT
)
if [ -n "$NATIVE" ]; then
  echo ""
  echo "  ERRORE      finestre del browser al posto di quella di Compass:"
  echo "              $NATIVE"
  echo "              Usare cqConferma / cqAvviso / cqModulo / cqChiedi (nelle app della Galleria _gb*)."
  BKF_KO=1
fi

# Firma in fondo (24/11/2026, il QM: «il footer ovunque»): ogni pagina la porta. Una pagina
# nuova senza firma si ferma qui.
for _p in *.html; do
  if ! grep -Eq 'class="firma[ "]' "$_p"; then
    echo ""
    echo "  ERRORE      $_p non ha la firma in fondo (class=\"firma\": vedi la guida di stile)."
    BKF_KO=1
  fi
done

# Bollino NEW (QM, 24/11/2026): resta SEMPRE 5 giorni. data-nuovo-fino e' il primo giorno
# senza bollino, quindi una voce aggiunta oggi ha al massimo oggi+5. Una data piu' lontana
# vuol dire un bollino tenuto piu' a lungo del dovuto (successo il 24/11: 14 giorni).
NEWKO=$(python3 - <<'PYNEW'
import re, glob, datetime
limite = datetime.date.today() + datetime.timedelta(days=5)
brutte = []
for f in sorted(glob.glob('*.html')) + ['app.js']:
    for n, l in enumerate(open(f, encoding='utf-8'), 1):
        for d in re.findall(r'data-nuovo-fino="(\d{4}-\d{2}-\d{2})"', l):
            if datetime.date.fromisoformat(d) > limite:
                brutte.append('%s:%d (%s)' % (f, n, d))
print(' '.join(brutte))
PYNEW
)
if [ -n "$NEWKO" ]; then
  echo ""
  echo "  ERRORE      bollino NEW oltre i 5 giorni: $NEWKO"
  echo "              data-nuovo-fino = giorno dell'aggiunta + 5."
  BKF_KO=1
fi

# Vecchio indirizzo di Compass OPS (24/11/2026): biancheria-galleria.html resta e porta a
# compass-ops.html. Senza, i collegamenti sui PC della Galleria finirebbero su una pagina vuota.
if ! grep -qF "location.replace('compass-ops.html'+location.search+location.hash)" biancheria-galleria.html 2>/dev/null; then
  echo ""
  echo "  ERRORE      biancheria-galleria.html non porta piu' a compass-ops.html: i collegamenti dei colleghi si rompono."
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
