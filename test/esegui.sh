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
var casi     = leggi("test/controlli.js");
try {
  eval(ambiente + "\n" + app + "\n" + casi);
  console.log(KO > 0 ? "ESITO:FALLITO" : "ESITO:OK");
} catch (e) {
  console.log("\nERRORE DURANTE I CONTROLLI: " + e);
  console.log("ESITO:FALLITO");
}
' 2>&1)

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

if echo "$USCITA" | grep -q "^ESITO:OK" && [ "$VERSIONE_KO" = "0" ] && [ "$COPIA_KO" = "0" ]; then
  exit 0
fi
exit 1
