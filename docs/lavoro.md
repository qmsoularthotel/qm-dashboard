# Come si lavora — controlli, versioni, pubblicazione, due Mac

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

## Development

**URL produzione**: `https://www.compass-qm.com`  — servito da **`main`**: finché il lavoro non è su `main` non lo vede nessuno (vedi "SI PUBBLICA SU `main`").

Aprire `index.html` direttamente nel browser. Nessun server necessario.

Per trovare rapidamente sezioni di codice usare il grep con i marker `// §§`:

```bash
grep -n "§§" app.js          # lista tutte le sezioni con numero di riga
grep -n "§§ TURNO" app.js    # trova sezione specifica
```

Poi leggere solo il blocco rilevante con `offset` e `limit` invece di caricare l'intero file.

---

## Numeri di versione — `bash strumenti/versione.sh`

I `?v=` in `index.html` costringono il browser a ricaricare i file modificati. Senza, si
ricarica la pagina e non cambia niente.

Lo strumento li aggiorna **solo se serve**: confronta `app.js` e `style.css` con l'ultimo
commit e tocca soltanto quelli davvero cambiati. `app.js` e la costante `V` si aggiornano
insieme — `V` è quella che forza il ricaricamento della pagina.

`test/esegui.sh` **segnala** se `app.js` o `style.css` sono cambiati senza che `index.html`
lo sia, ed esce con codice 1. Segnala invece di correggere da solo: uno strumento che
modifica i file mentre stai controllando altro è peggio del problema che risolve.

---

## SI PUBBLICA SU `main`. SEMPRE.

**GitHub Pages serve `main`.** Finché il lavoro resta su un branch, su
`https://www.compass-qm.com` **non si vede niente** — il QM apre Compass e trova la
versione di ieri, senza nessun indizio che altrove esista del codice nuovo.

> Al termine di ogni modifica: `git push origin HEAD:main`.
> Un branch di lavoro va bene per lavorarci, **non è una consegna.**

Vale anche quando l'ambiente di sessione assegna un branch di sviluppo (le sessioni di
Claude Code sul web ne creano uno per conto loro, tipo `claude/...`): quello serve al
sistema, non al QM. La consegna è su `main`, e **non va richiesta ogni volta** — è già
autorizzata qui, per iscritto, dal proprietario del repository.

Ordine giusto quando si tocca anche il Worker: **prima il sito su `main`, poi il Worker**
(vedi "Accesso al Worker"). Prima della pubblicazione: `bash test/esegui.sh` e
`bash strumenti/versione.sh`, altrimenti i browser continuano a usare il file vecchio.

---

## Lavorare da due Mac — casa e hotel

```
bash strumenti/inizio.sh      quando si COMINCIA su una macchina
bash test/esegui.sh           prima di ogni pubblicazione
```

**`inizio.sh` parte da solo** (dal 02/09/2026): `.claude/settings.json` contiene un hook
`SessionStart` che lo esegue all'apertura di ogni sessione di Claude Code in questa
cartella. Nasce da un equivoco reale — *"da casa non lo faccio mai, credo lo faccia da
solo"* — e il rischio non è teorico: cominciare a modificare una copia vecchia è ciò che
fa divergere le due macchine. Il file è versionato, quindi vale su entrambi i Mac appena
lo si scarica.

Non cambia il comportamento dello script: si allinea da solo solo quando è sicuro, e negli
altri casi si limita a spiegare e fermarsi (il suo `exit 1` non blocca la sessione, il
testo finisce nel contesto). Resta lanciabile a mano quando serve, ed è ancora l'unico modo
di rilanciarlo **senza** riaprire la sessione. Per disattivarlo o modificarlo: `/hooks`,
oppure `.claude/settings.json`.

`inizio.sh` confronta questa copia con il repository remoto e si comporta così:

| Situazione | Cosa fa |
|---|---|
| tutto allineato | lo dice e basta |
| questa copia è indietro | si allinea da sola e rilancia la rete di sicurezza |
| ci sono modifiche non salvate | **si ferma** e le elenca |
| le due copie sono divergenti | **si ferma** e mostra cosa c'è di là e cosa di qua |
| lavoro non ancora pubblicato | avvisa che dall'altra macchina non si vede |

Non decide mai da solo come riunire due versioni divergenti: quello va guardato caso per
caso.

`test/esegui.sh` controlla in più se la copia è rimasta indietro, così non si pubblica
partendo da codice vecchio — è ciò che fa divergere le due versioni. Se manca la rete il
controllo viene saltato, per poter lavorare scollegati.

### `.DS_Store` non va nel repository

Era tracciato: il Finder lo riscrive di continuo, quindi risultava sempre "modificato" su
entrambi i Mac e poteva generare conflitti su un file che non contiene niente di utile.
Tolto dal repository e messo in `.gitignore`. **Non reintrodurlo.**

### Cosa resta fuori dal repository

`culligan.png`, `icone compass/` e `loghi compass/` non sono tracciati: stanno solo sul
Mac dove sono stati creati. Nessun codice li richiama — `img/compass-stella.png`, che serve
alle finestre di conferma, è invece dentro il repository. Se un domani servissero anche
altrove, vanno aggiunti.

---

## Rete di sicurezza — `bash test/esegui.sh`

**Lanciarla prima di ogni pubblicazione.** Esce con codice 1 se qualcosa non torna.

```
test/ambiente.js   finti document, window, fetch, localStorage… perché app.js si carichi
test/controlli.js  i casi di prova
test/esegui.sh     lo script da lanciare
test/node.js       esecutore per ambienti con Node
```

**Funziona su entrambe le macchine.** `esegui.sh` usa Node dove c'è (Linux, claude.ai) e
`osascript` dove non c'è (Mac). Le due strade leggono gli stessi file e fanno gli stessi
controlli: se se ne modifica una, aggiornare anche l'altra.

### Cosa copre e perché proprio quello

Solo i **calcoli**, non l'aspetto. Il criterio è: un errore di impaginazione si vede subito
guardando lo schermo, un errore nei numeri no — resta plausibile e può passare inosservato
per mesi. Coperti quindi: colazioni e periodo dell'export, struttura dedotta dall'alloggio,
arrivi/partenze/fermate, multicamera, abbinamento delle schede al reimport, canale della
prenotazione, periodo della biancheria, anno del turno, nomi del turno, mittente ammesso
dal relay Booking, fusione dei pre-stay col cloud, unione dei registri di cassa, fusione degli archivi a elenchi, diagnosi della calibrazione, periodi annunciati dai suggerimenti di bilanciamento, confronto, dettaglio per tipologia e andamento dello storico biancheria, cancello del polling a
scheda nascosta, separatore dell'export Expedia, conteggio delle mosse annunciato dalle chip, ancoraggio della giacenza biancheria al conteggio, registro delle scritture non arrivate, elenco delle postazioni che hanno scritto, pausa della finestra abbandonata, calendari e periodo dell'app biancheria della Galleria, codice della Galleria limitato alle chiavi `bg_*`, fusione fra i due PC della Galleria, riallineamento di un totale congelato sbagliato. 732 controlli.

Il cancello del polling è l'unica eccezione al "solo i calcoli": non è un numero, ma un
guasto che si manifesterebbe con una postazione che smette di aggiornarsi **senza dire
niente** — la stessa categoria di errore invisibile, e da una copia ferma sono partite le
sovrascritture del 22/08/2026.

### Come funziona

Carica **tutto** `app.js` nell'ambiente finto, invece di ritagliarne pezzi per numero di
riga: quel ritaglio si rompeva a ogni modifica del file, ed era già successo più volte.
`const`/`let` di primo livello vengono convertiti in `var`, altrimenti in `eval` restano
chiusi e le funzioni non sarebbero raggiungibili.

### Aggiungere un controllo

Una riga in `test/controlli.js`:

```js
ok('descrizione leggibile', valoreOttenuto, valoreAtteso);
```

Le funzioni di `app.js` sono già tutte disponibili. **Usare sempre nomi inventati**: nel
repository non deve finire nessun dato di ospiti reali.

### Il riepilogo finale va tenuto in fondo (fix 03/09/2026)

La riga `TUTTI I CONTROLLI SUPERATI (N)` stava a **metà** di `controlli.js`: tutto ciò che
veniva aggiunto sotto — e `test/mime.js`, caricato dopo — restava fuori dal conteggio.
Diceva `(351)` con 65 controlli non ancora eseguiti, e continuava a dirlo anche quando uno
di quelli falliva. L'**esito** (`ESITO:OK`/`FALLITO`, l'unica cosa che `esegui.sh` legge per
il codice di uscita) è sempre stato corretto perché si calcola alla fine: a mentire era solo
la riga che legge una persona.

Ora è la funzione `riepilogo()`, chiamata dall'**ultima riga dell'ultimo file caricato**
(oggi `test/mime.js`). Aggiungendo un altro file di controlli, spostare lì la chiamata.

### Verificata sabotando il codice

Non basta che i controlli passino: devono anche **fallire quando serve**. Provata
introducendo di proposito tre difetti — regola delle colazioni spostata di un giorno,
Principe incluso nei "no colazione", abbinamento per codice disattivato. Tutti e tre
colti, con il dettaglio di cosa non tornava.

---

### La finestra è 36 mesi — è un fatto, non un parametro (confermato 01/09/2026)

Booking toglie le recensioni dopo **36 mesi** (`REV_FINESTRA_GG=1095`). Confermato dalla
proprietà, non dedotto.

**Tentativo rimosso**: il 23/08/2026, non riuscendo a riprodurre il 6.6 del Principe, era
stata aggiunta una `calibraFinestra()` che accorciava la finestra fino a 12 mesi finché il
punteggio tornava. Sul Principe aveva "risolto" scegliendo 21 mesi. Era una spiegazione
**fabbricata**: una finestra corta riproduce qualunque punteggio proprio perché guarda meno
recensioni. Rimossa insieme a `revFinestra()` e al campo `finestraGg`; i dati calibrati così
sono stati riportati a "da ricalcolare".

**Se un punteggio non è riproducibile con 36 mesi la causa è nei dati**, tipicamente
recensioni recenti non ancora presenti nell'export: si riesporta il CSV dall'Extranet.
Tre controlli in `test/controlli.js` impediscono di reintrodurre la scorciatoia.
