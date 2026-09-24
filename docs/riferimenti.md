# Riferimenti — variabili, endpoint, funzioni, recupero, problemi noti

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

## Global Variables & Constants

| Nome | Tipo | Contenuto |
|------|------|-----------|
| `DEPTS` | const object | Reparti: `fo` (Front Office), `hk` (Housekeeping), `bkf` (Breakfast), `mt` (Maintenance) — con `label`, `cls`, `members[]` |
| `REV_HOTELS` | const object | Struttura dati recensioni Booking.com per hotel (sa, bh, sl, pr, ms, ar, sb) |
| `REV_EXP_HOTELS` | const object | Struttura dati recensioni Expedia per hotel (sa, bh, ar, sb) — con `tone:'bilanciato'` default |
| `HKP_DATA` | let object | Dati HKP operative: `{sa: null, ar: null}` |
| `HKP_TAB` | let object | Tab attivo HKP: `{sa: 'riepilogo', ar: 'riepilogo'}` |
| `HKP_URLS` | const object | Endpoint Google Apps Script per HKP (sa, ar) |
| `DVR_DATA` | let object | Dati DVR per società: `{geriart: {...}, ...}` |
| `IS_REST` | const fn | Ritorna `true` se il valore turno è vuoto/null (non in programma) |
| `IS_ABSENT` | const fn | Ritorna `true` SOLO per valori espliciti: `R`, `RIPOSO`, `R RICHIESTO`, `RECUPERO`, `MALATTIA`, `OFF`, `FERIE` — usare per contare assenze reali. Il trattino resta fuori di proposito, vedi `IS_DASH` |
| `IS_DASH` | const fn | Ritorna `true` solo per `-`/`–`/`—`: un trattino nel turno non è un'assenza vera, è "non pertinente" — la persona non deve comparire né come in servizio né come non in servizio/Riposo |
| `weekData` | let | Dati turno settimana parsati (non più fallback hardcoded) |
| `activeDay` | let | Indice giorno attivo (0-6) |
| `PROXY` | const string | `https://anthropic-proxy.qm-d82.workers.dev` |
| `SHEETS_URL` | const string | Apps Script endpoint BKF SoulArt |
| `SHEETS_URL_AR` | const string | Apps Script endpoint BKF Art Resort |
| `TURNI_PREF_URL` | const string | Apps Script endpoint Preferenze Turni (Google Forms responses) |
| `DAILY_TASKS` | const array | Task giornalieri predefiniti per tutti i giorni |
| `WED_TASKS`, `THU_TASKS` | const arrays | Task specifici mer/gio |
| `customDate` | let | Data selezionata nel date picker sidebar |
| `bkfSheetData`, `bkfSheetARData` | let arrays | Dati breakfast sheet parsati (SoulArt, Art Resort) |
| `pulData`, `pulActiveDay`, `pulOpen` | let | Stato report pulizie |
| `bkfData`, `bkfActiveDay`, `bkfOpen` | let | Stato report pasti |
| `pianoData` | let | Dati piano settimana |
| `bkfGroups`, `bkfNotes` | let objects | Gruppi e note breakfast |
| `guestsData` | let array | Lista ospiti registration card |
| `arriviData` | let object | Dati arrivi giornalieri parsati |
| `REV_CATS`, `REV_TREND_CATS` | const arrays | Categorie recensioni |
| `DECAY_F1_MS` | const number | Finestra decadimento 270 giorni per F1 weighting |
| `ROOM_CODES`, `tratMap` | const objects | Codici tipo camera, mappatura trattamenti |
| `_tpData` | let array | Richieste preferenze turni caricate da Apps Script |
| `_tpFilter` | let string | Filtro reparto attivo nella view turni-pref (`'tutti'` o nome reparto) |
| `_tpCalYear`, `_tpCalMonth` | let number | Anno/mese visualizzato nel calendario preferenze turni |
| `_tpCalDay` | let string | Giorno selezionato nel calendario (`dd/MM/yyyy`) per filtrare lista |

---

## Endpoints & URLs

| URL | Scopo |
|-----|-------|
| `https://anthropic-proxy.qm-d82.workers.dev/v1/messages` | Claude API proxy (AI analysis PDF/immagini + risposte recensioni) |
| `https://anthropic-proxy.qm-d82.workers.dev` | KV storage operations (cloud sync) |
| `https://script.google.com/macros/s/AKfycbz-6o…/exec` | Google Sheets BKF SoulArt (`SHEETS_URL`) |
| `https://script.google.com/macros/s/AKfycbzmkY…/exec` | Google Sheets BKF Art Resort (`SHEETS_URL_AR`) |
| `https://script.google.com/macros/s/AKfycbyagJEm…/exec` | Google Sheets HKP SoulArt (`HKP_URLS.sa`) — attuale |
| `https://script.google.com/macros/s/AKfycbw1M5j…/exec` | Google Sheets HKP Art Resort (`HKP_URLS.ar`) — attuale |
| `https://script.google.com/macros/s/AKfycbzCbHxJbSfx…/exec` | Google Sheets Preferenze Turni (`TURNI_PREF_URL`) — attuale |
| `https://api.open-meteo.com/v1/forecast?latitude=40.8518&longitude=14.2681` | Meteo Napoli (previsioni 10 giorni) |
| `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js` | PDF.js worker |

---

## Funzioni Chiave per Sezione

### Turni

| Funzione | Scopo |
|----------|-------|
| `parseTurniTSV(text)` | Parse TSV → dati settimana |
| `handleTurniFile(file)` | Upload handler → base64 → Claude API → loadWeekData |
| `loadWeekData(data)` | Carica turni in memoria, imposta activeDay su oggi |
| `renderDay(idx)` | Render layout staff giorno singolo (include HK extras non in DEPTS) |
| `buildWeekNav()` | Costruisce bottoni nav settimana |
| `getShift(shifts, name)` | Lookup turno persona/giorno (case-insensitive) |
| `editShift(dayIdx, nome)` | Modifica turno individuale via prompt |
| `resetTurni()` | Azzera tutti i turni (localStorage + KV) |

### Storage & Sync

| Funzione | Scopo |
|----------|-------|
| `kvSet(key, value, retries)` | Set valore KV cloud con retry |
| `kvGet(key)` | Get valore KV |
| `syncFromCloud()` | Fetch tutti i keys da KV, aggiorna localStorage |
| `setSyncStatus(state)` | Aggiorna indicatore punto sync |

### Overview

| Funzione | Scopo |
|----------|-------|
| `refreshOverviewForDate(date)` | Render principale overview — usa confronto anno/mese/giorno per weekData |
| `renderArriviData()` | Render KPI cards arrivi |
| `buildBarChart(data)` | Generatore SVG bar chart |
| `fetchMeteo()` | Fetch previsioni meteo |
| `updateSbClock()` | **Inerte**: aggiornava `#sbClock`/`#sbShift`, rimossi dal redisegno della sidebar. Gira ancora ogni 10s ma non scrive da nessuna parte (le scritture sono protette da `if(el)`). Non "ripararlo": l'orologio in sidebar non esiste più di proposito |

### Recensioni Booking

| Funzione | Scopo |
|----------|-------|
| `revParseCsv(text)` | Parse CSV recensioni |
| `revRenderList(p)` | Render lista recensioni filtrata |
| `revGenerateReply(r)` | Genera risposta via Claude (3 par, 5-7 frasi, no "hai ragione") |
| `revCopyReply(uid)` | Copia risposta — usa `data-msg` attribute (non JSON inline in onclick) |
| `revMarkSent(p, gi)` | Traccia risposte inviate |
| `revApplyFilters(p)` | Filtra e ordina recensioni |

### Recensioni Expedia

| Funzione | Scopo |
|----------|-------|
| `revExpGenerateReply(r)` | Genera risposta Expedia via Claude (Dear Guest, stesse regole Booking) |
| `revExpHandleFile(p, file)` | Upload/parse TSV Expedia |
| `revExpRenderList(p)` | Render lista recensioni Expedia |

### Arrivi & Registration Cards

| Funzione | Scopo |
|----------|-------|
| `handleArriviFile(file)` | Upload, parse via Claude API |
| `fixArriviStruttura(arrivi)` | Corregge codici struttura da numero camera |
| `rcParseGuests(text)` | Estrae dati ospiti da PDF arrivi |
| `rcRenderCards(guests)` | Render cards ospiti |
| `preparePrint(idx)` | Genera HTML per stampa |

### Inventario Detersivi

| Funzione | Scopo |
|----------|-------|
| `invRender()` | Render completo view inventario |
| `invRenderStock(catalog, moves)` | Render griglia stock |
| `invRenderMoves(catalog, moves)` | Render lista movimenti |
| `invRenderAnalysis(catalog, moves)` | Render tab analisi |
| `invCalcStock(catalog, moves)` | Calcola qty corrente per barcode |
| `invEditQty(bc, currentQty)` | Modifica qty stock (crea movimento init) |
| `invOrdersMarkReceived(id)` | Apre modal DDT |
| `invOrdersConfirmDDT(id)` | Conferma DDT, crea movimenti, salva movIds |
| `invOrdersUndoReceived(id)` | Annulla ricezione, rimuove movimenti da movIds |
| `invDDTAddRow()` | Aggiunge riga extra prodotto nel modal DDT |

### Preferenze Turni

| Funzione | Scopo |
|----------|-------|
| `turniPrefLoad()` | Fetch dati da Apps Script, salva in localStorage |
| `turniPrefRender()` | Render calendario + lista richieste |
| `turniPrefMarkAllSeen()` | Segna tutte le richieste come lette |
| `_tpFmtDate(s)` | Normalizza qualsiasi formato data → `dd/MM/yyyy` |
| `turniPrefUpdateBadge()` | Aggiorna badge nav con richieste non lette |

### Compass (`index.html`)

Lo splash video parte **una volta per scheda**, non a ogni ricaricamento. La decisione
passa da `sessionStorage.qm_splash`, non da `nav.type==='reload'`:

```js
var gia=false;
try{ gia = sessionStorage.getItem('qm_splash')==='1'; }catch(e){}
if(gia){ /* rimuovi lo splash */ return; }
try{ sessionStorage.setItem('qm_splash','1'); }catch(e){}
```

**Perché non basta `nav.type`**: quando la versione nell'URL non combacia, lo script di
controllo versione in cima al file fa `location.replace(...)`, che è una navigazione di
tipo `navigate`, **non** `reload`. Siccome la versione cambia a ogni pubblicazione, in
pratica ogni aggiornamento dell'utente passava di lì e il video ripartiva.
`sessionStorage` sopravvive sia al ricaricamento sia alla redirezione e si azzera quando
la scheda viene chiusa: è esattamente "solo in apertura".

### Le 5 app standalone

Splash proprio, in CSS (nessun video): sfondo navy, bussola con ago che oscilla ed eco
radar, "Compass QM" e sotto il nome dell'app. Resta 3 secondi, si salta al tocco, e non
compare sui ricaricamenti.

**Eccezione al ricaricamento**: `housekeeper.html` e `inventory.html` fanno
`location.reload()` quando il nuovo service worker si attiva. Quel reload sarebbe
indistinguibile da un F5 manuale, quindi prima di ricaricare marcano
`sessionStorage.qm_sw_reload` e lo splash lo tratta come una prima apertura — altrimenti
verrebbe saltato o troncato a metà.

---

## Recovery — Recupero Codice Perso

```bash
git log --oneline -20

# Commit chiave con tutte le viste originali
git show 2183997:index.html | grep 'id="view-'

# Altri commit utili
# f97c04d — versione con HKP views
# c973287 — versione stabile pre-modifiche
```

Le viste `view-hkpsheet` e `view-hkpsheetar` erano state perse e recuperate (commit `2183997`). `view-hkpsheetar` è stata poi **rimossa di proposito** il 17/08/2026: non recuperarla dai commit vecchi credendola persa di nuovo.

### Commit di riferimento — sessione redesign Pannello App + Spese Fornitori (2026-07-06)

Se qualcosa nel Pannello App, nel toggle on/off, nell'avviso Breakfast o in Spese Fornitori smette di funzionare, questi sono i commit "noti buoni" a cui confrontare o tornare (`git show <hash>:app.js`, `git diff <hash> HEAD -- app.js`, ecc.):

| Commit | Cosa introduce |
|--------|------------------|
| `0d56bb4` | Fix stato persistente categorie Spese Fornitori (`_speseCatOpen`) |
| `2828af1` | `breakfast.html` legge `qm_spese_cat_override` |
| `31549ab` | Tabella spesa/coperti mensili con VAR% allineata a smartphone |
| `d5cdb28` / `e510193` | "+ Nuovo prodotto" manuale in `inventory.html` e dashboard |
| `3615c6b` | Sidebar "Sicurezza" → "Fascicolo Dipendenti" |
| `26f79a4` | Toggle on/off + schermata manutenzione Compass su tutte e 5 le app |
| `2606fde` | Ricontrollo on/off su `visibilitychange` + polling 30s (app aperta in background) |
| `48eb398` | "Mini App" → "Pannello App", redesign a mosaico |
| `c1f6f70` | KPI orario/data invece di conteggi, avviso toast Breakfast (prima versione) |
| `08d9231` | Fix avviso Breakfast agganciato alla tab sbagliata (`report`, non un sub-tab di `orders`) |
| `5afcd8f` | Icone card Pannello App uguali alla sidebar |

Se il **Pannello App è vuoto o rotto**, verificare prima che questi ID esistano ancora in `index.html`: `miniapp-hk-status`, `miniapp-bkf-status`, `miniapp-cm-status`, `miniapp-inv-status`, `miniapp-dvr-status`, `miniapp-hk-toggle` (e gli altri 4 `-toggle`), `miniapp-bkf-banner-tabs`, `miniapp-avvisi-corpo`, `miniapp-avvisi-tasto`, `miniapp-avvisi-conta`.

**Struttura delle schede (02/09/2026)**: il markup ripetuto a mano dentro `index.html` è stato sostituito da classi in `style.css` (`.miniapp-card`, `.miniapp-card-top`, `.miniapp-btn`, `.miniapp-sw`…). **I riquadri sono sempre della stessa dimensione**: `min-height:196px` più pulsanti ancorati in fondo (`margin-top:auto`), così una riga di stato che va a capo — es. "Scorte da riordinare" — non alza solo quella scheda. Le colonne sono **3, poi 2 sotto i 1080px, poi 1 su smartphone**: soglie esplicite e non `auto-fill`, perché con tre colonne imposte a ogni larghezza le schede si strizzavano a ~180px (titoli e persino "Copia link" a capo), mentre con `auto-fill` uno schermo largo ne faceva quattro e le cinque schede si spezzavano 4+1. Gli avvisi Breakfast si aprono **sovrapposti** alle schede sottostanti (`position:absolute`, come una tendina): se si aprissero dentro la scheda, quella crescerebbe e i riquadri non sarebbero più uguali. **Gli avvisi Breakfast sono dentro la sua scheda ma chiusi** (`miniappToggleAvvisi()`): tenerli sempre aperti la faceva alta il doppio delle altre. A scheda chiusa un contatore dorato dice quanti avvisi sono accesi (`miniappRenderContaAvvisi()`) — serve a non lasciarne uno attivo per settimane senza accorgersene. L'interruttore resta 36×21 con la pallina a 2px/17px perché è il JS a spostarla: cambiare quelle misure nel CSS la lascerebbe fuori posto. Le funzioni JS corrispondenti sono tutte in `app.js` sotto il marker `// §§ MINI APP — PANNELLO DI CONTROLLO`.

### Deploy GitHub Pages bloccato — cosa fare

Il 2026-07-06 la pipeline "pages build and deployment" ha smesso di completare i deploy per ~2 ore (run rimasta in coda dal 14/06, non cancellabile né da UI né da API con token normale — nemmeno `force-cancel` funzionava, errore "Cannot cancel a workflow re-run that has not yet queued"). Si è risolta da sola dopo un cambio del Source in **Settings → Pages** (da "Deploy from a branch" a "GitHub Actions" e ritorno) seguito da un nuovo push — non è chiaro quale dei due passaggi abbia effettivamente sbloccato la coda. Se ricapita:

1. Verificare lo stato: `curl -s "https://api.github.com/repos/qmsoularthotel/qm-dashboard/actions/runs?per_page=5"`
2. Controllare se c'è una run ferma in `"status":"queued"` da più di qualche minuto
3. Provare prima un retry semplice: `git commit --allow-empty -m "chore: retry deploy" && git push`
4. Se persiste, in **Settings → Pages** cambiare temporaneamente il Source su "GitHub Actions" e poi rimetterlo su "Deploy from a branch" (branch `main`, cartella `/`), poi ripetere il retry
5. Se persiste ancora, aprire un ticket a [support.github.com/contact](https://support.github.com/contact) categoria "Errori, problemi... Azioni problemi flusso di lavoro" — servono privilegi che l'utente/token normale non ha per sbloccare una run realmente incastrata

Non creare workflow YAML personalizzati come soluzione: ne è stato creato uno (`​.github/workflows/deploy-pages.yml`, action `actions/deploy-pages@v4`) durante il troubleshooting e poi **eliminato** perché ridondante — la pipeline automatica di GitHub Pages basta da sola quando non è bloccata.

---

## Note & Problemi Noti

### Aggiornamento automatico delle 5 app standalone (22/08/2026)

Ogni app (`housekeeper`, `breakfast`, `controllo-mattino`, `inventory`, `dvr`) contiene
`qmCheckVersione()`, accanto a `qmCheckAppStatus()`: una richiesta **HEAD** sul proprio file
confronta l'**ETag** con quello letto al caricamento e, se il file è cambiato, ricarica la
pagina. Gira al caricamento, al ritorno in primo piano e ogni 10 minuti.

- **Nessun numero di versione da mantenere**: l'ETag cambia solo se cambia il contenuto.
- **Non ricarica mentre si scrive** in un `INPUT`/`TEXTAREA`/`SELECT`: riprova al giro dopo.
- `sw.js` mette in cache **solo le GET**: `Cache.put` rifiuta le HEAD e lasciava una promessa
  respinta a ogni controllo.

**Perché esiste**: un'app aperta e mai chiusa continuava a usare il codice con cui era stata
caricata, per settimane. Il 22/08/2026 una copia rimasta aperta ha riscritto l'archivio
colazioni con la regola vecchia ore dopo la pubblicazione della correzione. **Spegnere
l'app dal Pannello App non basta**: `qmCheckAppStatus()` mostra l'overlay di manutenzione ma
non ferma il codice sottostante, che continua a leggere e scrivere.

**Limite da ricordare**: un'app già aperta con il codice *precedente* a questa modifica non
si aggiorna da sola — non contiene ancora `qmCheckVersione()`. Va chiusa a mano una volta.

### Il filtro sulle scritture KV chiamava se stesso — nessuna app scriveva più (02/09/2026)

**Sintomo**: il giro Culligan del 02/09 fatto regolarmente sul telefono (bottiglie ritirate,
riconsegnate, camere impostate "pronta") e sul PC il pannello mostrava `0 / 13 camere
visitate`, con tutte le camere ancora "da visitare". I giorni precedenti c'erano.

**Causa**, introdotta il 01/09/2026 (commit `3ef692f`, il filtro anti-scritture-identiche):

```js
function qmKvSet(key,value){
  ...
  _qmKvUltimo[key]=v;
  return qmKvSet(key,v)      // ← se stessa, non la fetch
```

La seconda chiamata trovava `_qmKvUltimo[key]===v` (appena impostato), tornava
`Promise.resolve(true)` e **la fetch non partiva mai**. Nessun errore da nessuna parte: le
app salvano prima in `localStorage`, quindi sul dispositivo sembrava tutto a posto, mentre
nessun altro dispositivo vedeva più niente. Il `.catch(()=>{})` dei chiamanti avrebbe
comunque nascosto un errore, ma non ce n'era nemmeno uno da nascondere.

Colpiti tutti e sei i file che avevano ricevuto il filtro. **`app.js` no**: lì `kvSet` fa la
fetch direttamente, senza wrapper.

| File | Cosa non arrivava sul cloud dal 01/09 19:44 |
|---|---|
| `controllo-mattino.html` | il giro del giorno (`qm_cm_<data>`) — l'intero stato camere |
| `breakfast.html` | archivio colazioni (`qm_bkf_monthly_history`) e **DDT** inseriti dal telefono |
| `inventory.html` | tutto: il suo `kvSet` interno passa di lì (catalogo, movimenti, ordini) |
| `reception.html` | solo `qm_cassa_rimossi`: i movimenti passano da `kvSetLocal`, che ha una fetch propria. **Le eliminazioni** però non si propagavano |
| `housekeeper.html`, `dvr.html` | solo i contatori di accesso, che nessuno legge più |

**Correzione**: la scrittura vera è ora una funzione separata, `_qmKvScrivi(key,v)`, e
`qmKvSet` chiama quella. Il filtro resta e continua a saltare le scritture identiche
(verificato: prima scrittura → una fetch, seconda identica → nessuna).

**Recupero del giro già fatto** (`_load()` in `controllo-mattino.html`): se la giornata sta
in `localStorage` ma **sul cloud non c'è nulla**, si ripubblica. È esattamente lo stato
prodotto dal difetto, e la condizione "cloud vuoto per quella chiave" lo rende sicuro: se il
cloud ha già qualcosa è più aggiornato di questa copia e non va toccato. Gli altri archivi
si riallineano alla prima scrittura successiva, che manda comunque l'elenco intero.

**Perché la rete di sicurezza non l'ha visto**: la sentinella controllava che
`function qmKvSet` **esistesse**, non che scrivesse. Ora guarda dentro il corpo della
funzione e fallisce se contiene una chiamata a se stessa, e pretende `_qmKvScrivi`.
Verificata rimettendo il difetto: la segnala.

**Regola che ne esce**: una sentinella che controlla la *presenza* di una funzione non
controlla niente. Quando la si aggiunge per proteggere un comportamento, deve poter
fallire se quel comportamento sparisce — e va provata sabotandolo.

### pdf.js viene da un CDN, e la sua assenza non deve uccidere Compass (07/09/2026)

`pdfjsLib.GlobalWorkerOptions.workerSrc = …` stava **a primo livello** in `app.js`, senza
guardia. Quando cdnjs non risponde — rete d'albergo che filtra, CDN giù, PC offline — quella
riga lancia **a caricamento** e porta giù *tutto il resto del file*: le funzioni ci sono
ancora (sono dichiarazioni, vengono issate), ma **nessuna costante viene inizializzata**.
Ogni vista muore quindi in `Cannot access 'GIAC_KEY' before initialization`, e Compass resta
a schermo **inerte, senza dire perché** — il sintomo peggiore, perché sembra un guasto di
rete generico e non c'è niente da leggere.

**È lo stesso difetto già corretto in `registration-galleria.html`** (vedi la sua sezione) e
mai riportato qui: la correzione era stata fatta solo di là, dove era saltata fuori.

| Pezzo | Ruolo |
|---|---|
| `PDF_OK` | `typeof pdfjsLib!=='undefined'` — la riga `workerSrc` è ora dietro questa guardia |
| `_pdfApri(ab)` | **unico** punto da cui si apre un PDF (7 chiamanti). Senza lettore lancia una frase leggibile invece di `pdfjsLib is not defined` sopra un riquadro di caricamento |

Verificato in un browser con **ogni indirizzo esterno bloccato**: costanti inizializzate,
sei viste che si aprono (giacenza, biancheria, overview, reception, pre-stay, pannello app),
nessun errore JS, e il messaggio giusto provando ad aprire un PDF. Prima della correzione, lo
stesso giro dava tre `Cannot access … before initialization` e viste vuote.

**Due sentinelle in `test/esegui.sh`**, entrambe provate sabotando: nessuna riga di primo
livello può toccare `pdfjsLib` fuori dalla guardia, e nessun PDF può essere aperto
scavalcando `_pdfApri`. Non controllano che `PDF_OK` *esista* — quello non controllerebbe
niente (vedi la lezione di `qmKvSet`): controllano il comportamento.

### Riferimenti inerti — non sono guasti, non "ripararli" (verificato 21/08/2026)

Un controllo su tutti gli `onclick` e su tutti i `getElementById` letterali ha dato:
**nessun pulsante orfano** (212 handler, tutti con la loro funzione) e **8 elementi cercati
ma inesistenti**, tutti protetti da `if(el)` e quindi innocui:

`sbClock`, `sbShift` (orologio sidebar, rimosso col redisegno) · `qualityBarChart` ·
`darkToggle` · `alertTime` · `kpi-checkin`, `kpi-checkin-sub`, `kpi-checkout-delta`
(sostituiti da `kpi-arrivi*` quando i chip del topbar sono stati rifatti).

Sono residui di parti della pagina eliminate. Trovarli e "sistemarli" significherebbe
riportare in vita funzioni che nessuno ha chiesto. Se un giorno si volesse ripulire, si
rimuovono le righe che li cercano — mai si aggiungono gli elementi mancanti.

Per rifare il controllo: cercare gli `id` in `getElementById('…')` dentro `app.js` e
confrontarli con quelli presenti in `index.html`.

| Problema | Causa | Fix |
|----------|-------|-----|
| HKP views scomparse | Sovrascrittura accidentale index.html | Recuperare da git `2183997` |
| Browser usa versione vecchia app.js | Cache buster non aggiornato | Aggiornare `?v=...` in `<script src="app.js?v=...">` |
| MT card sparisce quando l'addetto è a riposo/ferie | `if(!showMembers.length)return;` saltava il reparto per tutti, mt incluso | Solo per `key==='mt'`, se vuoto renderizza comunque la card con placeholder "Nessuno in turno" |
| Extra HK non visibili in overview | `renderDay` iterava solo `dept.members` | Aggiunti extra dal turno non in DEPTS alla card HK |
| Turno upload box non appare | `#turniUploadBox` mancante in `#uc-turno-panel` | Aggiunto `div#turniUploadBox` nel pannello sidebar |
| Warning "settimana precedente" con turno corretto | Confronto `getTime()` sensibile al timezone | Confronto con `getFullYear/Month/Date` |
| `paoloTurno` mostra dati marzo 2026 | Usava costante `WEEK` hardcoded rimossa | Ora legge da `weekData` reale |
| Testo HTML visibile nel pulsante "Copia testo" | `JSON.stringify` produceva virgolette che rompevano `onclick` | Usa `data-msg` attribute + `this.dataset.msg` |
| QC settimanale non visibile senza dati giornalieri | `cmRender` faceva `return` anticipato prima di `cmLoadWeeklyQC()` | Chiamata `cmLoadWeeklyQC()` prima del return nel branch vuoto |
| Voce Expedia scompare dopo Cmd+R | SW v2 cachava HTML senza `no-store` | `sw.js` aggiornato a `qm-v3` con `cache:'no-store'` per HTML |
| `rcFmtDate` restituiva URL Google nel caso else | URL rimasta per errore nel ternary | Else branch corretto: `return raw` |
| "Non in servizio" conta anche chi non è in turno | `IS_REST(v)` ritorna true per valori null/vuoti | Usare `IS_ABSENT(v)` che richiede R/FERIE espliciti |
| "R Richiesto" in turno trattato come attivo invece che riposo | Nessun match in `IS_REST`/`IS_ABSENT`/`_absenceReason` per la stringa "R RICHIESTO" (solo "RIPOSO RICHIESTO" era coperta) | Aggiunto `u.includes('RICHIEST')` a tutte e tre le funzioni |
| Trattino nel turno mostrato come "Riposo" nella striscia "Non in servizio" e nel widget `paoloTurno`, anche dopo un nuovo upload | Causa reale: il **prompt** di `handleTurniFile` (regola 4) diceva a Claude di convertire ogni cella con trattino in `"R"` prima ancora di salvarla — `IS_DASH` lato app non riceveva mai il carattere originale, quindi non poteva funzionare | Corretta la regola 4 del prompt: il trattino va scritto esattamente come `"-"` nel JSON, non più convertito in `"R"`. Aggiunta anche `IS_DASH(v)`, usata per escludere il trattino da `nonServizio` (renderDay) e dal ramo "Riposo" di `paoloTurno` — resta comunque escluso da "in turno" e da `IS_ABSENT`, quindi non appare in nessuna delle due liste. **Serve un nuovo upload del turno** perché i dati già salvati con la vecchia regola hanno il trattino già trasformato in "R" e restano indistinguibili da un riposo vero |
| DVR vuoto su altro PC | `syncFromCloud` non chiamava `dvrRestore()` | Aggiunto `dvrRestore()` nel case `dvr` di `syncFromCloud` |
| Inventario vuoto al refresh | `invRender()` controlla `active` prima che la view sia attiva | `setView()` chiama `invRender()` quando `id === 'inventario'` |
| Date preferenze turni mostrano "Sun" | Apps Script restituisce `String(date)` formato JS | `_tpFmtDate()` usa regex su nome mese inglese |
| Banner "piano non caricato" sempre giallo | `_renderHome()` chiamata sync prima che `_loadPiano()` completasse | `_loadPiano().then(() => _renderHome())` |
| Dashboard Culligan non aggiornato da smartphone | `cmLoad()` leggeva localStorage invece di KV | `cmLoad()` legge sempre KV prima |
| Spesa Fornitori: spostare un prodotto riportava alla lista categorie | `ddtRenderSpese()` rigenera tutto l'HTML, azzerando i pannelli espansi | Stato di modulo `_speseCatOpen`/`_speseUncatOpen` sopravvive al re-render |
| Prodotti ricategorizzati su Compass restavano "non classificati" su breakfast.html | `breakfast.html` classificava solo per keyword, non leggeva `qm_spese_cat_override` | Aggiunta lettura override + sync ogni 60s |
| Toggle app spento dalla dashboard non aveva effetto su app già aperta | Check `qm_app_status` girava solo al load iniziale | Ricontrollo anche su `visibilitychange` + `setInterval(30000)` |
| Avviso Breakfast non compariva mai | Condizione controllava `_ddtBkfTab==='analisi'`, uno stato mai raggiungibile da nessun bottone della UI | Corretto a `_activeTab==='report'` (la tab "Analisi" reale nel bottom-nav) |
| Banner Breakfast copriva i pulsanti della bottom-nav | Posizionato a `bottom:16px`, dentro l'area della nav fissa (~60px) | Spostato a `bottom:72px`, sopra la nav |
| Deploy GitHub Pages bloccato per ~2 ore (2026-07-06) | Run "queued" incastrata dal 14/06, non cancellabile da UI/API | Risolta con cambio Source Settings→Pages avanti/indietro + retry — vedi sezione Recovery |
| Un turno annotato fra parentesi restava fuori dalle statistiche | `AC (CALL)` non corrispondeva a nessuna sigla nota, quindi finiva fra i "codici non riconosciuti" e non entrava in nessun conteggio | `turniNormalizza` riprova senza la nota fra parentesi quando il codice intero non è riconosciuto (`AC (CALL)`→`AC`), lasciando intatti i codici che le parentesi le usano davvero |
| La stessa settimana contata due volte nelle statistiche | Il planning si carica da una foto senza anno: il 24/08/2026 il primo caricamento è stato letto come 2025 e la correzione successiva come 2026, quindi due chiavi diverse per la stessa settimana. **Ricaricare la foto della settimana in corso è normale e non duplica nulla** — la voce ha la stessa chiave e vince la più recente | `turniVoceStorico` normalizza l'anno con `_annoPlausibile`; `turniRipuliArchivio` fonde in **lettura** le voci già scritte (nessuna scrittura KV) e ripulisce l'archivio al prossimo caricamento |
| I suggerimenti di riassegnazione richiedevano troppo tempo per essere capiti | L'azione era una frase ("sposta prima X, poi Y") e a destra quattro numeri senza etichetta: l'ordine delle operazioni andava ricostruito ogni volta, molte volte al giorno | Ogni spostamento è una **riga a sé** numerata, da eseguire dall'alto in basso (camera di partenza grigia, di arrivo blu piena); a destra una riga per giorno con la parola **CARICO** o **PARTENZE** che dice cosa cambia, e l'esito nomina la cosa: "pareggia il carico di Sab 5/9" |
| Lo scambio in blocco non diceva **quando** | La riga diceva "tutte le prenotazioni future" e le date stavano nella nota grigia sotto, in caratteri piccoli: bisognava leggerle lì e ricordare a memoria l'ordine | Una riga numerata **per prenotazione**, ciascuna con le sue date. Il viaggio di ritorno (le prenotazioni dell'altra camera) **non è un passo**: è una conseguenza obbligata, detta una volta in una riga sola — elencarla raddoppiava le righe senza aggiungere una decisione. Intestazioni fisse `SPOSTO` / `QUANDO` / `COSA CAMBIA` |
| I suggerimenti mostravano il **carico** dove serviva il numero di **partenze** | Il carico (lavoro pesato, con le fermate che valgono meno di una partenza) è una grandezza interna al motore. Le cameriere confrontano fra loro le **partenze pro capite**: è quello l'obiettivo da pareggiare | Ogni giorno mostra sempre le partenze; il carico si nomina solo quando le partenze non cambiano ("cambia solo il carico"), altrimenti la riga sembrerebbe inutile. L'esito è costruito sui giorni in cui le partenze cambiano davvero, non sul primo dell'elenco |
| Compass aperto e fermo consumava scritture KV | `hkpDeriveFromPiano()` scriveva `qm_hk_soul` e `qm_hk_bout` con `caricato: new Date()`: un orario nuovo a ogni derivazione, quindi il filtro di `kvSet` non riconosceva mai la ripetizione. Parte a ogni caricamento del Piano, **anche quello del giro di aggiornamento** → 2 scritture per ciclo, fino a ~5.700 al giorno per una postazione aperta (tetto: 1.000) | `_hkSalvaDerivato()` confronta i soli conteggi, ignorando `caricato` e `_ts`, e scrive solo se i numeri sono cambiati. Misurato il 04/09/2026: con Compass fermo erano le uniche due chiavi che cambiavano da sole |
| Una scrittura sul cloud che falliva non lo diceva a nessuno | `kvSet` restituisce `false`, ma la maggior parte dei punti che la chiamano scarta il risultato con `.catch(()=>{})`: il dato restava sul dispositivo e Compass sembrava aver salvato. Successo il 03/09/2026 col tetto giornaliero esaurito — le altre postazioni non vedevano niente | Il conto lo tiene `kvSet` stessa (`_kvFallite`) e lo dice una volta sola con una fascia rossa in cima (`_kvRenderAvviso`), che sparisce da sola appena la scrittura riesce. Corretto lì e non nei ~20 punti di chiamata, che domani sarebbero di nuovo 21. Il 401 è escluso di proposito: quello lo racconta già il velo di abilitazione |
| "3 dati non sono arrivati sul cloud" fermo tutto il giorno, anche dopo aver ricaricato i dati | Il registro del giorno era un **numero che non tornava mai indietro**: `_kvRiuscita` ripuliva solo `_kvFallite` (memoria di sessione, vuota dopo un ricaricamento), quindi niente poteva spegnere l'avviso. In più il 401 delle scritture tentate prima di abilitare il dispositivo veniva contato come dato perso, benché il commento dicesse il contrario: `if(res.status===401)break;` salta i ritentativi, non `_kvNonRiuscita`. Visto su iPad il 09/09/2026 | Registro con i **nomi** delle chiavi diviso in `sospese`/`risolte`: si spegne da solo quando il dato arriva, anche in una sessione successiva, e la scheda dice **quale** dato è fermo. `_kvVaSegnalato(401)` è `false`. Vedi "Il registro delle scritture non arrivate" |
| "Ultimo aggiornamento" diceva sempre questo computer, poco fa | `qm_ultimo_agg` era un valore solo, e a firmarlo è la postazione che si sta usando a ogni salvataggio: rispondeva a una domanda che non si fa nessuno, mentre quella vera è se abbia scritto **qualcun altro** | Registro con una riga per postazione, fuso a ogni scrittura; la scheda mostra solo le altre, dalla più recente. Vedi "Ultimo aggiornamento altrove" |
| "Ultimo aggiornamento — da Casa" con nessuno a casa | A firmare il registro è **ogni** scrittura riuscita, comprese quelle automatiche: una postazione lasciata aperta rilegge il cloud, ricalcola i dati derivati e li risalva. E "aggiornamento" si confondeva col cambio di versione di Compass | Si dice **salvataggio** e si nomina il dato; `_qmQualcunoAlComputer()` separa le postazioni presidiate da quelle lasciate aperte, che finiscono in una riga a parte ("Compass aperto, ma senza nessuno") |
| Una postazione lasciata aperta consuma tutto il giorno | Il cancello a scheda nascosta non copre la finestra lasciata **in primo piano** con nessuno davanti: 7 letture al minuto, oltre 10.000 al giorno, più le riscritture dei dati derivati sul tetto stretto delle 1.000 scritture. E chi l'ha lasciata aperta non è lì per chiuderla | Dopo 30 minuti senza un segno di vita il giro si ferma e riparte al primo tocco, dichiarandolo con una pastiglia in basso — una copia ferma che non lo dice è peggio del consumo risparmiato |
| Le app scrivevano un registro accessi che nessuno leggeva | `qm_hk_access` / `qm_bkf_access` / `qm_dvr_access`: una lettura e una scrittura a ogni apertura, per una sezione della dashboard rimossa a luglio | Rimosso da `housekeeper.html`, `breakfast.html`, `dvr.html` il 04/09/2026 |
| Per sapere se un giorno aveva suggerimenti bisognava aprirlo | Le chip mostravano solo le **partenze**, che dicono se il giorno è storto, non se c'è qualcosa da fare: un giorno in pari può avere mosse (il motore guarda anche il carico) e uno rosso può non averne. Si aprivano i sette giorni uno per uno, ogni giorno | Terza riga nella chip: `2 mosse` in ambra, `—` dove non c'è niente. Il conteggio è `s.totMosse`, lo stesso che si trova aprendo il giorno. Costa ~20 ms a settimana perché `hkSuggestMoves` esce subito sui giorni in pari o passati |
| Suggerimenti che non toccano il giorno selezionato | Per gli `scambio-blocco` il filtro sul giorno in focus è saltato di proposito (riguardano tutta la settimana), ma la nota diceva "solo le mosse che migliorano X" | Badge grigio **non tocca \<giorno\>** sulla mossa, e nota corretta |
| Per cambiare giorno bisognava risalire in cima alla vista | Il selettore dei giorni stava solo sopra la suddivisione cameriere, e i suggerimenti sono in fondo: si risaliva e si riscendeva a ogni giorno | Lo stesso selettore è ripetuto nell'intestazione dei suggerimenti, a destra del titolo. Chiama `pianoNavRender(i)`, la navigazione vera: non è una seconda copia dello stato |
| Non si vedeva quale giorno avesse bisogno di attenzione | Il selettore mostrava solo le date: per sapere dove intervenire si aprivano i giorni uno per uno | Sotto ogni giorno le sue partenze `Matarese · Altre`, **verdi se in pari, rosse se sbilanciate**. La soglia è la stessa del motore (≥2 di scarto): uno di scarto con numeri dispari è inevitabile e nessuno lo percepisce. I giorni già passati sono in grigio |
| Inventario, filtro "7 giorni" mostrava metà del consumo reale | `effectiveDays` aveva un minimo di 14gg applicato anche ai periodi fissi scelti dall'utente, non solo a "Tutto" | `effectiveDays=_invPeriod>0?days:Math.max(14,days)` — il minimo 14 vale solo per "Tutto" |
| Splash mini app a volte vecchio a volte nuovo, senza regola | 4 service worker sullo stesso scope radice si sostituivano a vicenda e si cancellavano le cache l'uno dell'altro | Un solo `sw.js` registrato da tutte le app — vedi [Service Worker](#service-worker-swjs) |
| Splash saltato o tagliato a metà | `location.reload()` del service worker aggiornato è indistinguibile da un Cmd+R via `nav.type` | Flag `qm_sw_reload` in `sessionStorage` prima del reload automatico |
| Riepilogo mese colazioni più basso del PMS (1155 contro 1187, agosto 2026) | `qm_bkf_monthly_history` archiviava **ogni** giorno presente in `bkfData`, futuri compresi. Un giorno futuro è una previsione: le prenotazioni continuano ad arrivare, ma la fotografia scattata in anticipo non veniva più corretta perché nessuno ricarica un giorno passato. I giorni 8–13/08 erano fermi a quando mancavano prenotazioni (il 12: sedici in meno), tre giorni gonfiati da cancellazioni mai tolte, e il 30/08 (21) e 31/08 (8) erano già archiviati | Si archiviano **solo i giorni ≤ oggi** (`bkfSaveMonthlyHistory` in `app.js`, `bkfAggiornaHistoryInMemoria` in `breakfast.html`), e le previsioni già scritte vengono cancellate. **Un dato mancante si vede, un dato sbagliato no**: se un giorno non viene caricato resta fuori dal totale, ed è preferibile. Sorvegliato da 8 controlli + una sentinella su `breakfast.html` in `esegui.sh`. **Archivio riconciliato col PMS il 22/08/2026** per tutto il 2026 (gen–ago): gen–mag erano già esatti, corretti 1 giorno di giugno, 13 di luglio, 10 di agosto — gli scarti maggiori erano sui *no colazione* (luglio: 91 archiviati contro 113 reali) |
| Pannello App / Breakfast: "ultimo aggiornamento" fermo a giorni prima, con dati invece freschi | `qm_ts_bkfTs` lo scriveva solo il vecchio upload del Report pasti; unificati i caricamenti, `prenHandlePdf` aggiornava `qm_bkfData` ma non il segnatempo | `prenHandlePdf` scrive `qm_ts_bkfTs` + `setUploadTs('bkfTs')`. **Regola generale**: chi sostituisce un upload deve portarsi dietro *tutti* gli effetti del vecchio, segnatempo compresi — un dato fresco con data vecchia sembra un caricamento mancato |
| Pre-stay: "indirizzo Booking · non recapitabile con il mittente attuale" su schede che prima partivano | **Non è un avviso di Booking, è di Compass.** `_psBookingBloccato()` blocca gli alias `@guest.booking.com` finché il mittente reale non è stato verificato: senza verifica ricade su `PRESTAY_MITTENTE_BOOKING_OK=false`, cioè "presumo sbagliato". La verifica sta in `localStorage` (`qm_prestay_mittente`), quindi **è per postazione**: ricompare su ogni PC/browser nuovo anche se la configurazione è corretta | Pre-stay → Impostazioni → **Verifica mittente** (una volta per postazione). Richiede un Worker che risponda a `/prestay/stato` — se dà 500/1101 la versione pubblicata è vecchia |
| Splash ripartiva a ogni aggiornamento | `nav.type==='reload'` non intercetta il `location.replace` del controllo versione, che è `navigate` | Flag `qm_splash` in `sessionStorage` |
| Stato camera: serviva un secondo clic | Il render rileggeva da KV mentre `kvSet` era ancora in volo | Parametro `statoNoto`: chi scrive passa il proprio stato |
| Arrivi puri sempre grigi anche dopo Cmd+R | `_rs()` crea la voce come effetto collaterale del conteggio bottiglie: "esiste una voce" non significa "qualcuno ha guardato" | Flag `prontaVerificata`, scritto solo dalle scelte umane |
| Icone card camere disallineate | `solo arrivo (pulita)` va su due righe, `partenza/arrivo` su una | `min-height` per due righe sul sottotitolo, testo centrato |
| Turno datato con l'anno sbagliato | Il prompt non dichiarava la data odierna e il planning non riporta l'anno | Data odierna nel prompt + `_annoPlausibile()` sulle date restituite |
| Registration card ferme al giorno prima dopo aver caricato il PDF Prenotazioni | `prenHandlePdf` scriveva `qm_arriviData` ma non `qm_rcGuests`: la derivazione delle card viveva dentro `handleArriviFile`, cioè nel percorso di upload che il file unico ha sostituito | Estratta in `rcAggiornaDaArrivi()`, chiamata da entrambi i percorsi; l'esito viene scritto nel messaggio dello slot |
| Mail pre-stay agli ospiti Booking di nuovo respinte, pur essendo `booking@soularthotel.com` corretto sull'Extranet | `PRESTAY_MITTENTE_BOOKING_OK` messa a `true` in `app.js` mentre sul Worker `SMTP_USER` era rimasta `qm@soularthotel.com`: Compass toglieva il blocco senza che il mittente fosse cambiato. L'Extranet dice quale mittente è autorizzato, non quale si sta usando | Il blocco ora segue il mittente che il Worker dichiara su `/prestay/stato` (**Impostazioni → Verifica mittente**), non una costante. Per spedire davvero da `booking@`: `SMTP_USER`/`SMTP_PASS` su Cloudflare, `SMTP_FROM` cancellata, Worker ripubblicato — e `IMAP_USER`/`IMAP_PASS` spostati sulla stessa casella, altrimenti spariscono le risposte |
| Pre-stay di una giornata già inviata tornati vuoti: nomi presenti, email/telefono da reinserire, spunte di invio perse | `_psSave()` scriveva su KV **tutti i giorni in blocco**, senza rileggere: una copia col `localStorage` vuoto (altro profilo, o la copia di sviluppo che punta allo stesso Worker) importava il PDF Prenotazioni e sovrascriveva il lavoro fatto. E siccome all'avvio il ripristino dal cloud **sovrascrive anche il localStorage**, riaprire Compass cancellava l'ultima copia buona rimasta | Rilettura obbligatoria prima di ogni scrittura, **fusione** invece di sostituzione (per codice prenotazione, mai per `id`), avvio che fonde invece di sostituire, chiave separata per la copia di sviluppo, errore di scrittura visibile. Vedi "Il salvataggio non può più cancellare" |
| Avviso Cloudflare: 50% del tetto giornaliero KV consumato senza che nessuno lavorasse | Il polling girava ogni 30s anche a scheda nascosta: 7 letture a giro su Compass, 20.160 al giorno per ogni pagina lasciata aperta | `_qmPolling` ferma il giro quando la scheda non è visibile e lo riprende al ritorno in primo piano; intervallo da 30 a 60 secondi. Vedi "Consumo KV" |
| Resi biancheria già consegnati e firmati di nuovo in elenco come "non ancora consegnati" | `_qmUnisciRecord` faceva vincere il locale a parità di `id`: una postazione ferma a prima della consegna (o il suo solo `localStorage`, che `_qmLeggiArchivio` fonde uguale) rimetteva `ritiroId:null` sopra righe chiuse. Alla consegna dopo finivano in distinta due volte | `_QM_CHIUSURE`: sui campi di chiusura vince chi è chiuso, salvo ritiro annullato di proposito. Per le righe già tornate indietro, banner + `resiRiassegnaRiaperte()`, che le riconosce dalla data e chiede conferma |
| Il cestino nei Resi Biancheria non cancellava la riga: spariva e tornava | `resiDelRow` non chiamava `_qmSegnaRimosso`, unica eliminazione degli archivi a elenchi a esserselo dimenticato. La riga restava sul cloud e `_qmUnisciRecord` la riportava dentro al primo salvataggio | Aggiunto `_qmSegnaRimosso(_resi,id)` **prima** di `_resiSave()`, più una sentinella nei controlli che verifica la chiamata in ogni funzione di eliminazione |
| Recensioni Expedia: "Nessuna recensione trovata nel file" su un export valido (le Booking si caricavano) | Expedia Partner Central ha cambiato l'export da TAB a **virgola**, coi campi fra virgolette. `revExpParseTsv` splittava solo sul TAB: una colonna sola, `review_rating` mai trovata, zero righe. Booking non ne risentiva perché `revParseCsv` è un parser CSV vero | Il separatore si prova (TAB, virgola, punto e virgola) e si tiene quello che fa comparire `review_rating`; parser a campi virgolettati unico (`_revRighe`) condiviso con Booking. TSV già salvato su KV continua a leggersi. Il messaggio d'errore ora elenca le colonne trovate |
| Compass a schermo ma inerte, nessuna vista funziona | `pdfjsLib.GlobalWorkerOptions.workerSrc=…` a primo livello in `app.js`: col CDN irraggiungibile lancia a caricamento e porta giù tutto il file, lasciando ogni costante non inizializzata. Difetto presente dall'origine, già corretto solo in `registration-galleria.html` | `PDF_OK` + `_pdfApri()`, unico punto che apre un PDF e che sa dirlo a parole. Due sentinelle in `test/esegui.sh` |
| Camere Art marcate "Art Resort" nelle fermate | `fixArriviStruttura` applicata solo a `arrivi`, mai a `fermate`/`partenze` | Struttura dedotta in modo deterministico da `_prenStruttura` su tutte e tre le liste |
