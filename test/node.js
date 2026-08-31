// Esecutore della rete di sicurezza per ambienti con Node (Linux, claude.ai).
// Su Mac senza Node c'è la strada alternativa con osascript: vedi test/esegui.sh.
// Fanno esattamente la stessa cosa, sugli stessi file.
const fs = require('fs');
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const leggi = (p) => fs.readFileSync(p, 'utf8');

// 1. Sintassi: se app.js non si carica, i controlli non avrebbero senso.
try {
  new Function(leggi('app.js'));
} catch (e) {
  console.log('ERRORE DI SINTASSI in app.js: ' + e.message);
  console.log('ESITO:FALLITO');
  process.exit(0);
}
console.log('sintassi di app.js: ok');

// 2. Controlli. const e let al primo livello resterebbero chiusi dentro la funzione e
//    non sarebbero raggiungibili dai controlli: si convertono in var.
const ambiente = leggi('test/ambiente.js');
const app      = leggi('app.js').replace(/^(\s*)(const|let)\s/gm, '$1var ');
// worker.js e' un modulo (import/export): si neutralizzano le due righe e si carica come
// gli altri. Serve per i controlli sulla lettura delle risposte (test/mime.js).
const worker   = leggi('worker.js')
  .replace("import { connect } from 'cloudflare:sockets';", 'var connect=function(){};')
  .replace('export default {', 'var _workerFetch = {')
  .replace(/^(\s*)(const|let)\s/gm, '$1var ');
const casi     = leggi('test/controlli.js') + '\n' + leggi('test/mime.js');

try {
  // indirect eval: esegue nello scope globale, così le funzioni restano raggiungibili
  const globalEval = eval;
  globalEval(ambiente + '\n' + app + '\n' + worker + '\n' + casi);
  console.log(typeof KO !== 'undefined' && KO > 0 ? 'ESITO:FALLITO' : 'ESITO:OK');
} catch (e) {
  console.log('\nERRORE DURANTE I CONTROLLI: ' + (e && e.message ? e.message : e));
  console.log('ESITO:FALLITO');
}
