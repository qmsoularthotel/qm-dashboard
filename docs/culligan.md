# Distribuzione Culligan

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

## Distribuzione Culligan (controllo-mattino.html)

### Scopo

PWA mobile per il giro mattutino di distribuzione acqua Culligan. I dati sono sincronizzati tramite KV e visibili nel dashboard (`view-controllo-mattino`).

### File

| File | Scopo |
|------|-------|
| `controllo-mattino.html` | App PWA standalone (giro distribuzione mobile) |
| `sw.js` | Service worker unificato (network-first per HTML) |
| `app.js` §§ CONTROLLO MATTINO | `cmLoad()`, `cmRender()`, `cmPrintBottle()`, `cmLoadWeeklyQC()`, `cmRenderWeeklyQC()` |
| `index.html` `#view-controllo-mattino` | View dashboard con stats + QC settimanale + Stampa A4 |

### Storage

| Chiave | Contenuto |
|--------|-----------|
| `qm_cm_YYYY-MM-DD` | Stato giornaliero camere |
| `qm_piano` | Piano settimana |

### `cmRender(state, key)` — IMPORTANTE

Anche quando `!state` (nessun dato per oggi), il render chiama **sempre** `cmLoadWeeklyQC()` prima di tornare — così la sezione QC settimanale con i pulsanti WhatsApp è sempre visibile nel dashboard.

### `_todayKey()` in `controllo-mattino.html`

È una **funzione** (non costante) — calcola la chiave KV al momento della chiamata, non al caricamento della pagina. Non trasformarla in `const`.

### Riconsegna bottiglie — secondo giro della giornata

Il giro reale è in due passaggi: 1) **ritiro** delle vuote, stanza per stanza nell'app (`bottiglia:'consumata'` = vuota trovata); 2) dopo il riempimento, **riconsegna** delle piene. Il secondo passaggio prima usava la Stampa A4 (`cmPrintBottle()`/`printBottle()`) come checklist cartacea; ora esiste anche come checklist nell'app stessa.

- Ogni camera ha un campo `consegnata:boolean` (default `false`) in `_defaultRoom()`.
- `_redeliverRooms()` = camere con stato `bottle`/`both` (bottiglia consumata, non DND) — le stesse della Stampa A4.
- Bottone **"🚰 Riconsegna"** in home (badge col numero da consegnare, unico bottone rimasto — "Riepilogo" è stato tolto perché non necessario) → `showRedeliver()` → schermata `#s-redeliver` con le **stesse tile della home** (`.room-card`/`.rooms-grid`, non una lista) — leggibili a distanza perché il telefono resta fissato sul carrello. Gold = da riconsegnare, verde oliva `#4F7942` = consegnata (stesso verde di "non consumata" nel giro di ritiro — stesso significato: bottiglia a posto). Tap sulla tile = `toggleConsegnata(room)` (persiste su localStorage + KV). Niente più pillola di testo sotto la tile: il colore basta.
- `showSummary()`/`printBottle()` (schermata Riepilogo + Stampa A4 da telefono) sono rimasti nel codice ma senza più un bottone che li richiami — irraggiungibili di proposito, non cancellati, nel caso servano di nuovo. La Stampa A4 resta comunque disponibile dal dashboard Compass (`cmPrintBottle()` in `app.js`).

### Camere "pronte" — visibile in tempo reale alla reception

Durante la riconsegna capita di lasciare la bottiglia in una camera non ancora pronta (HK non ha finito) — la bottiglia si lascia comunque, pronta o no, quindi la card diventa sempre "consegnata" indipendentemente dalla scelta.

Per camere **non in fermata** (partenza/cambio — in fermata l'ospite è già dentro, "pronta" non si applica): tap sulla tile in `#s-redeliver` apre `openReadySheet(room)`, che sostituisce quella card con una versione a piena larghezza (`grid-column:1/-1`) con due bottoni grandi `.ready-big` ("🧹 Non pronta" / "✓ Pronta") — bersaglio piccolo in un angolo scartato perché scomodo da colpire in movimento. `chooseReady(room,val)` imposta sia `pronta` sia `consegnata:true` insieme, chiude il foglio e persiste. La scelta resta poi come striscia fissa in fondo alla card (`.rc-ready-strip`, verde/ambra). Per le camere in fermata il tap resta il vecchio `toggleConsegnata(room)` diretto, nessun foglio.

**Palette delle tile in `#s-redeliver`** (scoperta solo qui, non tocca la home): navy sempre — non più gold/oliva — perché lo stato "da riconsegnare" vs "consegnata" lo dice l'icona in filigrana (`.rc-watermark`: bottiglia = non ancora consegnata, spunta = consegnata), non il colore della tile. La home continua a usare `gold-2` per lo stato "bottle" — il cambio è scoperto con `#s-redeliver .room-card.s-bottle .rc-top` ecc. per non toccarla. La striscia in fondo alle card in fermata (senza testo) usa lo stesso `var(--navy)`, coerente col colore unico della tile. L'icona è nell'angolo in basso a destra (non più centrata dietro il numero), 72px, opacity .32 — più grande e più carica di prima.

**Distribuzione (bseg in camera)**: `bc-consumata` = `var(--navy-light)`/`var(--navy-light-bg)` (#5B7A9C), `bc-noncons` = `var(--navy)`/`var(--navy-bg)` (#1c3a5e) — stessa tinta di brand della Riconsegna, due sole intensità invece di due colori diversi. `--gold-1` (vecchio colore di `bc-consumata`) rimosso perché non più usato da nessuna parte.

**Home (`_renderHome()`)**: le tile "bottle"/"both" (bottiglia consumata) e "ok" (non consumata, tutto conforme) usano la stessa coppia navy-light/navy della distribuzione, con un'icona **affiancata** al numero dentro `.rc-top-row` (non in filigrana come in Riconsegna) — numero a sinistra, icona a destra (`.rc-num` prima di `sideIcon` nel markup, l'ordine DOM decide l'ordine visivo nel flex row). Bottiglia navy piena (`var(--navy)`, non blu) a 48px per "bottle"/"both" — più grande della spunta bianca a 34px per "ok", perché è lo stato che richiede un'azione. La parte bassa bianca della card (`.rc-bottom`, icona/etichetta piano) resta invariata. `--gold-2` (vecchio colore di queste tile) rimosso, non più usato.

Le card statistiche "Da portare"/"OK" in `#stat-row` usano gli stessi colori delle tile a cui si riferiscono (navy-light/navy), non più amber/verde — coerenza tra il riepilogo numerico in alto e le card sotto.

Il banner `#piano-banner` (stato caricamento Piano, sopra "Camere visitate") è stato **rimosso** dalla home: niente più elemento in HTML, niente più blocco che lo popola in `_renderHome()`. `_reloadPianoCloud()` resta nel codice (già con `if(pb)` di guardia) ma è irraggiungibile — il suo pulsante "🔄 Ricarica" viveva dentro il banner ora tolto.

- Campo `pronta:boolean|null` in `_defaultRoom()` — stesso oggetto stato giornaliero (`qm_cm_YYYY-MM-DD`) già sincronizzato su KV da `_persist()`, nessuna chiave nuova.
- Lato Compass: `renderOvRoomReadiness(giorno)` in `app.js` (vicino a `renderOvCulliganBox`) legge lo stesso KV, filtra **solo** le camere Art in `cambi` del Piano del giorno (partenze **con** un nuovo arrivo lo stesso giorno — non più anche le partenze pure senza check-in successivo, che non hanno bisogno di essere "pronte per qualcuno" entro un orario preciso), e mostra una pillola per camera in `#ov-room-readiness` (Overview, sotto il grafico occupazione) — verde "✓ pronta", ambra "🧹 non pronta", grigio "da verificare". Titolo sezione "Camere in partenza con nuovo arrivo oggi"; tolto il tag "check-in oggi" per camera (era ridondante, ora vero per tutte quelle mostrate).
- **Pillole cliccabili — segna pronta al volo da Compass** (`ovMarkRoomPronta(room)`): scrive sulla **stessa** chiave KV (`qm_cm_YYYY-MM-DD`) che legge/scrive l'app Culligan sul campo — quella resta sempre la fonte primaria di verità, questo è solo un override rapido per il QM quando serve correggere senza aprire il telefono. Se la camera non è mai stata toccata dall'app Culligan oggi, crea un oggetto stato compatibile con `_defaultRoom()` di `controllo-mattino.html` (stessi campi: `visited`/`libera`/`dnd`/`bottiglia`/`checks`/`note`/`consegnata`/`pronta`, `checks` con le stesse chiavi di `CM_LABELS`) invece di scriverne uno parziale che confonderebbe l'app quando lo rilegge; se esiste già, tocca **solo** `pronta`/`ts`, lasciando invariati tutti gli altri campi scritti dall'app Culligan (visited, checks, note, consegnata...).
- **Card "day-tile" invece di pillole di testo** — molto più visibili per la reception. Stessa impaginazione delle card giorno di `pianoNavRender()` (nome in alto, due cerchi icona separati da un filo verticale, bordo colorato in cima): cerchio sinistro = camera/arrivo (fisso, navy, icona porta); cerchio destro = stato pronta/non pronta/da verificare (verde/ambra/grigio, colora anche il bordo in cima alla card). Stesso click-to-mark-pronta di prima (`ovMarkRoomPronta`).
- **Posizione**: `#ov-room-readiness` è ora subito dopo `#ov-booking-box` (riepilogo arrivi Booking.com), **prima** del grafico occupazione settimanale — non più in fondo dopo il grafico. Deve saltare all'occhio scorrendo la pagina, non essere l'ultima cosa in basso.
- Chiamata da `pianoNavRender()` (quindi ad ogni cambio giorno/ricarica Piano) e già dentro il polling esistente (che richiama `pianoNavRender(pianoNavIdx)`) — si aggiorna da sola mentre il giro è in corso, senza bisogno di ricaricare la pagina.

### Bottiglia animata (Overview → box Culligan)

`renderOvCulliganBox()` in `app.js` disegna una sagoma SVG di bottiglia Culligan reale (`cmBottlePath`, `viewBox="0 0 64 142"`, logo mascherato da `img/logo-culligan.png`) che si riempie in base a `visited / camere occupate del giorno` — **camere visitate durante il giro**, non un conteggio esatto di bottiglie fisicamente sostituite (una camera "vista" conta anche se non aveva bisogno di bottiglia nuova). Al caricamento parte vuota e sale fino al livello reale (`cmFillUp`), poi la superficie "respira" (`cmWave`) — animazioni in `style.css`.

**Bollicine nel liquido**: generate in `app.js` (array `cmBubbles`, 16 cerchi con posizione/durata/ritardo randomizzati ad ogni render) e clippate all'**intersezione** tra la sagoma della bottiglia (`cmBottleClip`) e il rettangolo del riempimento attuale (`cmLiquidClip`, stessi `fillY`/`fillH` del liquido) — così restano sempre dentro la zona di liquido vera, anche quando il livello sale/scende col progredire del giro (non clippate solo alla sagoma intera, altrimenti apparirebbero anche sopra il livello del liquido).

Il punto di nascita (`cy`) è vicino al **fondo** del liquido (`cmBottomY - spawnBand`, non distribuito su tutta l'altezza) e ogni bolla risale quasi fino alla superficie (`--cm-brise`, variabile CSS per bolla) — prima `cy` era campionato uniformemente su tutta la colonna di liquido, quindi circa metà delle bolle nascevano già a metà altezza invece che dal basso, un difetto visibile confrontato con l'artefatto di riferimento (dove tutte nascono vicino al fondo del frame). Animazione `cmBubbleRise` in `style.css`, classe `.cm-bubble`, rispetta `prefers-reduced-motion`. Nessun bubble generato se `fillH<=4` (bottiglia praticamente vuota).

### Annulla — ritiro e riconsegna

**Schermata camera (ritiro, `s-room`)**: ogni tap (bottiglia, checklist, libera, DND) scrive **subito** in memoria su `_state[room]`, non solo premendo "Salva camera" — prima il tasto "‹" chiamava `goHome()` direttamente, senza annullare nulla: le modifiche restavano comunque in memoria e potevano finire salvate lo stesso alla prossima `_persist()` (es. salvando un'altra camera, dato che persiste l'intero `_state`). Ora `openRoom(room)` fotografa lo stato della camera (`_roomSnapshot`/`_roomSnapshotRoom`) **solo quando si entra in una camera diversa** da quella già fotografata (non ad ogni ri-render interno che le funzioni di tap richiamano per aggiornare la vista — altrimenti la fotografia si aggiornerebbe ad ogni tap invece di restare quella originale). Il tasto "‹" chiama `cancelRoom()`, che ripristina `_state[room]` alla fotografia prima di tornare alla home. `saveRoom()` svuota la fotografia dopo aver salvato.

**Foglio pronta/non pronta (riconsegna)**: una volta scelto "pronta" o "non pronta" (`chooseReady()`), prima non si poteva tornare a "da confermare" — solo passare da un'opzione all'altra. Aggiunto un link "Annulla" sotto i due bottoni grandi (non un terzo bottone alla pari: i due bersagli principali restano grandi, si usa camminando) — `cancelReadySheet(room)` chiude il foglio senza scegliere, e se una scelta era già stata fatta la annulla (`pronta:null`, `consegnata:false`).

### Dashboard (`cmLoad()`) — KV come source of truth

Legge sempre KV prima (fonte dei dati scritti da smartphone), poi fallback localStorage.

### Camera pronta — due punti di raccolta, stesso campo (15/08/2026)

`rs.pronta` (`true`/`false`/`null`) si imposta da **due** punti dell'app Culligan, che scrivono lo stesso campo sulla stessa chiave `qm_cm_YYYY-MM-DD`:

1. **Foglio nella vista Riconsegna** (`chooseReady`) — il percorso storico, per le camere che si visitano nel giro;
2. **Popup dal dettaglio camera** (`apriPopPronta` → `scegliProntaPop`) — si apre impostando la bottiglia su **non consumata** in una camera in **cambio** (partenza + arrivo). Motivo: trovando la bottiglia piena non si passa dal giro di riconsegna, quindi la domanda "è pronta?" resterebbe senza risposta proprio su una camera che va rifatta per il nuovo ospite.

È un **nodo aggiunto al `body`**, non parte del render della camera: così non viene spazzato via da un `openRoom` successivo e sta sopra la barra di salvataggio (`z-index` 400 contro 200). Va quindi chiuso a mano — `goHome()` lo fa, altrimenti resterebbe sopra la griglia riferito a una stanza che non si sta più guardando.

Si apre **solo al cambio effettivo di valore** (`prima!=='non_consumata'`): ritoccare il pulsante già attivo non deve far ricomparire il popup, mentre tornarci da un altro valore sì, così una scelta sbagliata si corregge. "Decido dopo" chiude senza scrivere nulla. Verificato con 16 test.

### Overview — stato preparazione: cambi **e** arrivi puri

`renderOvRoomReadiness` mostra le camere con un **check-in oggi**, in due categorie:

| Categoria | Da dove | Sottotitolo card | Stato predefinito |
|---|---|---|---|
| **Cambio** (partenza + arrivo) | `sa.cambi` | `partenza/arrivo` | `Da verificare` (grigio) — va rifatta, lo decide chi passa |
| **Arrivo puro** (nessuna partenza prima) | `sa.arrivi` meno i cambi | `solo arrivo (pulita)` | **`Pronta`** (verde) — non era occupata la notte prima, non c'è nulla da rifare |

Gli arrivi puri prima **non comparivano affatto**: la reception non vedeva un pezzo degli arrivi della giornata. Le partenze pure restano fuori di proposito (senza un check-in successivo non devono essere pronte entro un orario) e così le fermate (l'ospite è già dentro).

#### `prontaVerificata` — NON usare `pronta!==null` per capire se qualcuno ha guardato

Questo è il punto su cui si sbaglia, ed è già costato due correzioni sbagliate di fila
(2026-08-20).

`_rs(room)` in `controllo-mattino.html` **crea la voce della camera se manca**, e viene
chiamata anche per motivi che non c'entrano nulla con la preparazione — per esempio
`_redeliverRooms()` la invoca su ogni camera solo per contare le bottiglie da
riconsegnare. Basta quindi **aprire l'app Culligan** al mattino perché ogni camera in
piano abbia un oggetto con `pronta:null`, senza che nessuno abbia guardato niente.

Ne segue che **né** `state[room]` esistente **né** `pronta===null` dicono se qualcuno ha
davvero deciso. Serve il flag dedicato:

```js
const verificata = !!(state && state[r] && state[r].prontaVerificata);
const p = verificata ? state[r].pronta : undefined;
const stato = p===true||p===false ? p : (!verificata && soloArrivo ? true : null);
```

`prontaVerificata:true` lo scrivono **solo** le scelte umane vere:
`chooseReady`, `cancelReadySheet`, `scegliProntaPop` in `controllo-mattino.html`, e
`ovMarkRoomPronta` in `app.js`. Senza il flag vale sempre il valore predefinito della
tabella sopra, qualunque cosa contenga l'oggetto.

Il flag serve anche a rendere distinguibile un **reset esplicito**: dopo il terzo clic
`pronta` torna `null` ma `prontaVerificata` resta `true`, quindi la card mostra
`Da verificare` invece di ricadere sul verde automatico.

#### Ciclo a tre stati con un clic solo

Ogni card — di qualunque categoria, anche già pronta — al clic avanza:
`Da verificare → Pronta → Non pronta → Da verificare`. Il valore da scrivere lo calcola la
card (`_next`) in base a quello che **sta mostrando**, e il `title` annuncia cosa farà il
prossimo clic. `ovMarkRoomPronta(room, valore)` scrive il valore così com'è
(`undefined` → `true`, per compatibilità con la vecchia chiamata senza argomento).

#### `statoNoto` — perché il render non rilegge dal cloud dopo un clic

`renderOvRoomReadiness(giorno, statoNoto)`: chi ha appena scritto passa il proprio stato e
il render **salta la rilettura**. Senza, si rileggeva da KV mentre `kvSet` era ancora in
volo (non è atteso), tornava il valore precedente, la card non cambiava e sembrava
servisse un secondo clic — che poi invertiva di nuovo, da cui un comportamento
apparentemente casuale. Il polling e le altre chiamate continuano a leggere da KV.

#### Impaginazione delle card

Griglia `.ov-room-grid` (`auto-fill`, celle da 132px), **non** flex: con `flex:1`
l'ultima card rimasta sola su una riga si allargava a tutta larghezza e le altre
cambiavano misura a ogni ridimensionamento. Il sottotitolo ha `min-height` per due righe
con testo centrato: senza, `solo arrivo (pulita)` andando a capo spingeva il cerchio più
in basso e disallineava le icone della fila.

L'icona è **un solo cerchio**, che è lo stato (prima ce n'era anche uno navy fisso con
l'icona della camera, identico su tutte le card: non distingueva niente). Dentro, un letto
col lenzuolo dritto (verde, pronta) o mosso (rosso, non pronta); punto interrogativo
grigio per `Da verificare`.

### QC Settimanale

Conta le camere **effettivamente controllate** (condizione: `pronta===true`) per le 7 chiavi della settimana corrente da KV — non le bottiglie sostituite (`bottiglia==='consumata'`, usata invece dal contatore "sostituzioni" nel box Culligan di Overview, metrica diversa). Solo le camere confermate "pronta" nel foglio di riconsegna sono state davvero ispezionate: quando non è pronta si lascia solo la bottiglia piena senza controllare nulla, quindi non conta. Stessa condizione sia nel totale (`cmLoadWeeklyQC`) sia nel registro cronologico per giorno dentro `cmRenderWeeklyQC`.

**Pulsanti**: WhatsApp albergo (`wa.me/393274919588`) | 📋 Copia testo (`data-msg` attribute) | 👁 Anteprima.

### `rs.ts` — timestamp per camera (per Pannello App)

`saveRoom()` ora scrive anche `rs.ts = Date.now()` oltre a `rs.visited = true`. Serve esclusivamente al Pannello App (vedi sotto) per calcolare l'orario dell'ultimo controllo registrato oggi — non è usato altrove in `controllo-mattino.html` stesso.

---
