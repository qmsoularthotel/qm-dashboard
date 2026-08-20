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

if echo "$USCITA" | grep -q "^ESITO:OK"; then
  exit 0
fi
exit 1
