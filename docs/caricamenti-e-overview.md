# Caricamenti quotidiani, file Prenotazioni, Overview

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

## Upload quotidiani — cosa si carica e cosa è derivato

Si caricano **3 PDF** (non 6): Riepilogo Reception, Piano Settimanale, Report pasti.

I tre report pulizie (`pul` Cruscotto pulizie, `soul` Soul HKP, `bout` Boutique HKP)
**non si caricano più**: contengono solo conteggi aggregati arrivi/fermate/partenze per
giorno, senza numeri di camera, ed è tutto ricavabile dal Piano Settimanale.

`hkpDeriveFromPiano()` in `app.js` li genera a ogni caricamento del Piano, negli stessi
formati che producevano `pulParseText()` / `hkParseText()`:

| Derivato | Somma di | Alimenta |
|----------|----------|----------|
| `pulData` | soulart + boutique + liborio | KPI Overview, grafico occupazione |
| `hkSoulData` | soulart | KPI Overview, card KPI `housekeeper.html` |
| `hkBoutData` | boutique (San Liborio sommato a valle, vedi `boutAdj`) | idem |

**Attenzione a non "riparare" cose che non sono rotte:**
- `parsePianoItems` registra anche `arrivi` (arrivi puri `+N` senza partenza). Serve solo
  alla derivazione — Culligan, Room Division e bilanciamento cameriere usano
  `partenze`/`fermate`/`cambi` e vanno lasciati così (un arrivo puro non è una camera
  occupata al mattino).
- Il bilanciamento cameriere Matarese/Altre e il dettaglio camere di `housekeeper.html`
  leggono **il Piano**, non i report HKP — è sempre stato così.

**Per tornare agli upload manuali**: `HKP_DERIVE_FROM_PIANO=false` in cima ad `app.js`.
Riappaiono i 3 slot e gli handler di upload, mai rimossi.

---

## Overview — Topbar KPI & Pannello Occupazione

### Topbar KPI Chips

4 chip sempre visibili nel topbar quando si è nella view `overview` (nascosti nelle altre viste). IIFE all'avvio garantisce visibilità:

```js
(function(){ const k=document.getElementById('topbar-kpis'); if(k) k.style.display='flex'; })();
```

### Pannello Occupazione

Cliccando il chip occupazione si apre `#occ-panel`. Barre orizzontali per struttura, percentuale `%` **fuori** dalla barra (non dentro — altrimenti illeggibile su sfondo grigio). Colori: verde `≥80%`, ambra `50-79%`, rosso `<50%`.

---

## Prenotazioni — il file unico che sostituisce due upload (2026-08-20)

Vista: nessuna (è solo uno slot di Upload Center). Codice: `§§ PRENOTAZIONI` in `app.js`.
Interruttore: **`PREN_UNICO`** in cima alla sezione.

### Cosa si carica

PMS (Hotel in Cloud) → **Prenotazioni** → filtro **Presenti** → intervallo di date →
**tutte le strutture** → Esporta.

**Deve essere "Presenti", non "Arrivi".** Il PMS permette un filtro per volta, ma ogni riga
porta con sé *sia* `Arrivo` *sia* `Partenza`: da "Presenti" su un intervallo si ricava, per
qualsiasi giorno del periodo, chi arriva, chi parte e chi resta. Con "Arrivi" servirebbero
tre export separati.

### Cosa sostituisce

| Upload precedente | Chiave scritta | Come si ricava |
|---|---|---|
| Riepilogo Reception | `qm_arriviData` | arrivi = `Arrivo`=giorno · partenze = `Partenza`=giorno · fermate = `Arrivo` < giorno < `Partenza` |
| Report pasti | `qm_bkfData` | colazioni e no-colazione per ogni giorno dell'intervallo |
| (nessuno: derivato) | `qm_rcGuests` | registration card del giorno, da `qm_arriviData` — vedi sotto |

Da 2 caricamenti al giorno a **1**. Turno e Piano Settimanale restano invariati.

### Le registration card sono una derivazione, non un effetto collaterale

Scrivere `qm_arriviData` **non** aggiorna le registration card: la vista Registrazione
legge `qm_rcGuests`, che va riscritto a parte. Nella prima versione `prenHandlePdf` non lo
faceva, quindi caricando il PDF Prenotazioni le card restavano quelle dell'ultimo
Riepilogo Reception caricato a mano — con l'aggravante che tutto il resto (arrivi,
colazioni) si aggiornava regolarmente, per cui sembrava un problema della sola
vista Registrazione e non del caricamento.

La derivazione vive in **`rcAggiornaDaArrivi(sameDayAsPrev)`**, estratta dall'IIFE che
stava dentro `handleArriviFile`: unica copia, chiamata da entrambi i percorsi di
caricamento. Esclude Principe e Mastrangelo (non fanno registration card) e restituisce:

| Esito | Significato |
|---|---|
| `ok` | card ridisegnate |
| `nessuna` | c'erano arrivi, ma tutti Principe/Mastrangelo — non è un errore |
| `vuoto` | nessun arrivo valido: le card **non** sono state toccate |

L'esito finisce nel messaggio dello slot: *"… registration card aggiornate"* oppure
l'avviso che non lo sono. Card ferme senza dirlo sono peggio di un errore, perché si
stampa la scheda di un ospite partito ieri.

I nomi passano da `_qmNomeUmano`: l'export del PMS è in maiuscolo (`BIANCHI ANNA`) e sulla
card stampata, a 24pt, si legge come una sgridata.

`rcRenderSourceLine` (la riga "documento caricato" sopra la coda di stampa) segue
`PREN_UNICO`: con il file unico nomina *Prenotazioni (PMS)*, legge `qm_ts_prenTs` e
riapre `prenFileInput` — non più il Riepilogo Reception, il cui slot è nascosto.

### Le card si riallineano da sole — `rcRiallineaConArrivi()`

`qm_rcGuests` e `qm_arriviData` sono chiavi **indipendenti**: la seconda può cambiare
senza la prima (un altro PC che carica, il polling che la rilegge da KV, una versione
dell'app in cui il caricamento non ridisegnava le card). Il sintomo non si nota
guardando: card perfettamente plausibili, ma dell'ospite sbagliato.

All'apertura della vista Registrazione (`rcRefreshFromCloud`) e al ripristino all'avvio,
le card vengono rigenerate se **entrambe** le condizioni valgono:

1. il documento arrivi è di **oggi** — un documento vecchio non genera MAI card, meglio
   lasciare quelle che ci sono, che almeno la riga sorgente data e attribuisce;
2. **nessuna** card ha il check-in di quel giorno — ne basta una che combaci per
   considerarle allineate, perché qualcuna può essere stata aggiunta a mano.

Chi carica il PDF quindi non deve fare altro: se il caricamento è avvenuto su un altro PC,
o prima che questa correzione fosse pubblicata, basta aprire la vista.

### La forma dei dati NON cambia

`qm_arriviData` e `qm_bkfData` vengono scritte **identiche a prima**, campo per campo. È un
vincolo, non un dettaglio: le leggono tre app standalone.

| App | Chiave | Campi usati |
|---|---|---|
| `housekeeper.html` | `qm_arriviData` | `.camera` |
| `controllo-mattino.html` | `qm_arriviData` | `.camera`, `.origine` (test `/booking/i`) |
| `breakfast.html` | `qm_bkfData` | `data`, `label`, `noCol`, e `adulti`+`bambini` **sempre sommati** |

### REGOLA DELLE COLAZIONI — il mattino dopo, e solo due strutture

Verificata riproducendo il report del PMS su 8 giorni su 8, per entrambe le righe:

> **Colazioni**: prenotazioni con `arrivo < giorno <= partenza` (la colazione si serve il
> mattino DOPO la notte) e trattamento `BB`. **Tutte le strutture.**
>
> **No colazione**: stessa finestra, trattamento `RO`, ma **solo SoulArt e Boutique** —
> sono le uniche che servono la colazione, altrove `RO` è la norma e non viene conteggiato.

Sbagliare una delle due fa divergere i numeri dal PMS senza che si veda.

### Breakfast Sheet dall'Upload Center (26/11/2026)

Il QM caricava ogni giorno il Report pasti dentro il Breakfast Sheet (lettura AI, poi
«Sincronizza»), due volte (SoulArt e Galleria), e spesso se ne dimenticava. Ora c'è la tessera
**Breakfast Sheet** nell'Upload Center (`uc-bsheet`): due riquadri, SoulArt e Galleria, perché le
intestazioni dei due PDF del PMS sono **identiche** e solo il riquadro dice quale è quale.
`bsheetHandle` legge il PDF **senza AI** (`_bsheetLinee` + `_bsheetRighe`, formato fisso
«Sab 28/11/2026  2 (2 a + 0 b)  33 (33 a + 0 b) …»), prende **8 righe dal giorno del caricamento
+ 2** (il riquadro A45:D52 del foglio Google, che non cambia forma; «-» in PRESENZA GRUPPI) e
chiama `bkfSheetSync`/`bkfSheetARSync`, che ora restituiscono l'esito e segnano l'invio in
`qm_bsheet` ({sa, ar}: si fonde col cloud, tiene il più recente). La tessera è verde solo con
**tutte e due** inviate **oggi**; a mezzanotte torna «Da caricare oggi» ed entra in «Mancano».
Se il PDF parte dopo dopodomani o ha meno di 8 giorni lo dice in rosso.
Provato sui due PDF reali del 26/11: 8 righe identiche al foglio compilato a mano dal QM. Invio vero ai due fogli Google confermato dal QM lo stesso giorno («funziona tutto»).
**Perché non dal file Prenotazioni o dal «Pasti del periodo»**: le Prenotazioni dei colleghi non
arrivano a 9 giorni; il «Pasti del periodo» non ha i RO (R sempre 0, le camere RO sono caselle
vuote come i blocchi). Solo il Report pasti ha BB e RO precisi. La lettura AI nel Breakfast Sheet
resta come riserva.

### Ospiti BB Booking.com: solo colazione inclusa (22/11/2026)

La lista «Ospiti BB Booking.com» (si chiamava «Colazione Booking.com») (Overview e `breakfast.html`) mostra **solo** le prenotazioni
Booking con la colazione inclusa (`BB`, `HB`, `FB`, `AI`, `MP`): le `RO` non ci vanno più.
Decide **il trattamento della prenotazione, mai la camera**: la 206 con ospiti in `BB` c'è.
**San Liborio invece non c'è mai** (deciso dal QM la sera del 22/11): non ha la colazione e i
suoi ospiti non possono venire a farla. `bkfRoomInfoBuild` lo esclude come Principe e
Mastrangelo, e l'app Breakfast lo toglie anche dai dati vecchi (`_bkStanze`).
Regola in `_bkfConColazione` (app.js), copiata identica in `breakfast.html` (sentinella in
`esegui.sh`). Per questo `qm_arriviData` porta ora `trattamento` anche per fermate e
partenze (prima solo per gli arrivi): un campo in più, nessun lettore ne risente.

Il PMS chiama San Liborio `AS_LIB`: `_prenCamera` lo scrive **«Liborio»**, come già
l'Operativa HKP. I conteggi BB/RO del report non cambiano.

### Nomi andati a capo a metà parola (22/11/2026)

Il PMS manda a capo i testi lunghi della colonna anche **a metà parola** («FINOCCHIA» + «RO
ANTONINO», «Booking.co» + «m»), e prima Compass riattaccava i pezzi sempre con uno spazio.
Il segnale sta nel PDF, ma `getTextContent` di pdf.js lo butta: lo spazio in fondo alla riga
c'è solo nelle istruzioni di disegno (`getOperatorList`), che `_prenSpaziFinali` allinea uno
a uno ai pezzi di testo (se non si allineano, si legge come prima). `_prenUnisci` riattacca
senza spazio solo se: niente spazio in fondo, riga sotto non spostata (x 11,7 = spazio
spostato a capo), primo pezzo sotto di **massimo 3 lettere** — il PMS a volte toglie lo
spazio anche fra due parole intere («DARBENZIO» + «STEFANO»), e lì solo la lunghezza
distingue. Provato su 7 PDF, 575 prenotazioni: 39 nomi corretti, nessun errore.
`_prenStessa` confronta i codici senza spazi (i vecchi caricamenti li hanno con lo spazio).

### L'intervallo si deduce dai dati, non dal PDF

Il PDF **non riporta** l'intervallo chiesto all'export (a differenza del vecchio Report
pasti, che scriveva "Lista dei pasti dal … al …"). Si ricava così:

> **dal** = prima `Partenza` presente nel file · **al** = ultimo `Arrivo`

Una prenotazione compare in "Presenti dal X al Y" solo se parte dopo X e arriva prima di Y,
quindi quei due estremi coincidono col filtro impostato.

**Non usare "primo arrivo → ultima partenza"**: sconfinano largamente fuori dal periodo,
perché includono chi era già dentro da giorni e chi resterà per settimane. Con quella
regola il grafico delle colazioni copriva 22 giorni invece di 8 — errore realmente
commesso e corretto.

### Adulti/bambini: si tiene solo il totale

La colonna `Ospiti` non riporta lo split in modo affidabile (una prenotazione che il PMS
conta 1 adulto + 1 bambino può comparire come `2`). Il **totale è sempre corretto**. Si
scrive quindi il totale in `adulti` e `0` in `bambini`: nessuno usa i due campi separati —
`app.js` e `breakfast.html` li sommano in tutti i punti tranne una scritta decorativa.

### La struttura si deduce dall'alloggio INTERO, non dal numero di camera

`_prenStruttura` riceve `"Art 21 / AS Superior"`, non `"Art 21"`. Quando la camera non è
ancora assegnata il PMS scrive lì solo il tipo (`UM TRIPLA CLASSIC`, `MS Family`,
`AS Suite`) e il codice dopo la barra è l'unico appiglio:

`AS`=SoulArt · `PC`=Boutique · `UM`=Principe · `MS`=Mastrangelo · `AS_LIB`=San Liborio
(controllato per primo, altrimenti lo intercetta `AS`).

Senza questo ripiego quelle prenotazioni finivano tutte su SoulArt e i "no colazione" non
tornavano — errore trovato proprio così.

**Correzione di un difetto preesistente**: `fixArriviStruttura` veniva applicata **solo agli
arrivi**, mai a fermate e partenze, per cui alcune camere Art risultavano `AR` (Art Resort)
invece di `SA`. Qui la struttura è assegnata in modo deterministico a tutte e tre le liste.

### Partenze di oggi già in check-out — l'ordine dei caricamenti non conta più (24/09/2026)

Con il filtro "Presenti" il PMS toglie dal PDF chi ha già fatto il check-out (confermato dal QM
il 24/09/2026: le camere in check-out spariscono, non restano con un altro stato), e ogni
caricamento **sostituisce** i dati di oggi: un caricamento fatto dopo i check-out perdeva le
partenze di oggi (Overview, Housekeeper, Culligan) e abbassava le colazioni di oggi, che
finivano così anche nell'archivio mensile. Per questo il primo caricamento della giornata
andava fatto prima dei check-out.

Ora l'ultimo caricamento resta in `qm_pren_ultimo` (solo le prenotazioni che partono da oggi
in poi). `_prenRecuperaPartenze` rimette dentro ogni prenotazione che **parte oggi**, era **già
in casa** e nel nuovo PDF non c'è più — né col suo codice né con nome, camera e arrivo
(`_prenStessa`). Le annullate restano nel PDF con lo stato, quindi una prenotazione sparita è
uscita per il check-out. Basta anche il caricamento di ieri sera, dove le partenze di oggi
c'erano come fermate. Il messaggio dello slot dice quante ne ha riprese.

"Il file riguarda oggi" si decide da **chi è in casa oggi**, non da `_prenIntervallo`: la prima
partenza del file è proprio quella che manca dopo i check-out (errore commesso e colto dai
controlli). 9 controlli.

### La tessera Prenotazioni sulle altre postazioni (27/09/2026)

Caricato il file dal Mac del lavoro, arrivi e colazioni arrivavano a tutti, ma la
**tessera** dell'Upload Center (riepilogo *"120 prenotazioni · 27/09–03/10"* e ora) stava solo
nel `localStorage` di chi aveva caricato (`qm_pren_riass`, `qm_ts_prenTs`). Sugli altri Mac
restava all'ultimo caricamento fatto lì e dopo 24 ore il suo pallino diventava **rosso**: la
collega, vedendolo, ricaricava il PDF da capo.

Ora il riepilogo viaggia **dentro `qm_arriviData`** (campo `_pren:{riass,ts}`), che il giro di
ogni postazione rilegge già: nessuna chiave e nessuna lettura in più. `_prenTesseraDaCloud`
lo applica al giro e all'avvio, e vince il più recente. Coperto da 7 controlli in
`test/controlli.js` e da una sentinella in `test/esegui.sh`, verificati con tre sabotaggi.

### Tornare indietro

`PREN_UNICO=false` in cima alla sezione: riappaiono gli slot separati e tornano attivi i
loro handler, **mai rimossi** (`handleArriviFile`, `handleBkfFile`). Stesso
schema di `HKP_DERIVE_FROM_PIANO`. Punto di ritorno completo: tag git
**`pre-prenotazioni-unico`**.

### Perché il parsing è deterministico e non AI

Colonne a posizione x fissa: nomi e tipi camera vanno a capo
nell'export reale, e un parser sul testo concatenato li spezzerebbe. Niente chiamata AI
significa anche nessun costo e nessuna variabilità fra un caricamento e l'altro.

| Colonna | x |
|---|---|
| Ospite | 0–64 |
| Arrivo | 162–215 |
| Partenza | 215–268 |
| Alloggio | 300–354 |
| Ospiti | 354–388 |
| Stato | 388–424 |
| Tratt. | 563–595 |
| Origine | 595–649 |

Le prenotazioni annullate vengono scartate (`stato`). `origine` arriva dal PMS: è il canale
(Booking, Expedia, Italcamel, CRSVertical), che prima si indovinava dall'email.

---

### Registration card bloccate fino ai caricamenti del giorno (06/11/2026)

La mattina i colleghi aprivano la vista Registrazione senza caricare niente e stampavano comunque le card.
Ora la griglia (`#rcPanel`) è nascosta, e al suo posto c'è l'avviso `#rcScadute`, finché **oggi** non sono
stati caricati **sia** le Prenotazioni **sia** il Piano Settimanale: `rcFileMancanti()` guarda il `_ts`
dentro `arriviData` e `pianoData` (vale il caricamento fatto da qualunque postazione, perché viaggia col cloud).
`rcApplicaScadenza()` si rifà in `rcRenderCards`, `rcRefreshFromCloud` (apertura vista e giro di
aggiornamento, quindi anche passata la mezzanotte con la pagina aperta), `pianoSetLoaded` e `prenHandlePdf`;
`rcOpenPrintDialog` ricontrolla prima di stampare. I dati non si cancellano. Controlli in `test/controlli.js`
("visibili solo dopo i caricamenti di oggi").

### Nessun caricamento dalla vista Registrazione (14/11/2026)

Il file si carica **solo** dai Caricamenti dell'Overview. Dalla vista Registrazione sono stati tolti
"Aggiorna file" nella riga `#rcSourceLine` (resta solo l'informazione: documento, ora, arrivi), la
zona di trascinamento `#rcUploadZone` con `#rcFileInput` e il pulsante "Carica altro" (`rcResetApp`).
`#rcUploadZone` è rimasto come avviso `.ov-empty` ("Nessun arrivo disponibile") perché il codice lo
nasconde/mostra già per id. Controllo in `test/esegui.sh`.

### Stampa delle registration card a basso consumo di toner (06/11/2026)

`PRINT_CSS`: tolta la fascia nera in testa (hotel e camera in nero su bianco con una riga), logo SoulArt con
`filter:invert(1)` (resta la scritta, sparisce il disco nero), nome dell'ospite e camera a tratto sottile,
etichette IT/EN senza fondo. **Il grigio resta di proposito** sulle intestazioni "Dati carta" e "Informativa
privacy" (scelta del QM). Circa -68% di inchiostro misurato sulla pagina. Controllo in `test/controlli.js`
("stampa a basso consumo di toner").

Tipologia sulla card col solo nome (06/11/2026): `rcRoomTypeLabel` riduce i nomi del PMS ("AS Deluxe Doppia",
"AS Junior Suite Depandance", "PC Superior"…) a **Superior, Deluxe, Junior Suite, Suite** (e Standard per il
Boutique). Junior Suite si cerca prima di Suite; un nome sconosciuto perde solo il prefisso AS/PC.

Riga delle date sulla card (06/11/2026): le sei caselle (Arrivo, Partenza, Notti, Ospiti, Tipologia, Trattamento)
stanno su **una riga sola** (`.pc-dates` in flex, scelta del QM: la versione su due righe è stata scartata), col
valore accanto alla didascalia separato da una barretta verticale più bassa della casella. Anno a due cifre su
tutta la card (`_rcAnno2`, solo sulla carta), trattamento in sola sigla (BB, HB…): "HB – Mezza pensione" non
entrava. Il caso più lungo (Junior Suite, 11 notti, HB) ci sta senza molto margine: aggiungendo testo alla riga
va riprovato. Controlli in `test/controlli.js` ("riga delle date").


## Settimana del Piano in stile «Registration Cards» (28/11/2026, QM)

`pianoRenderWeek` disegna i sette giorni come schede `.pw-day` (style.css): «Oggi» in oro, giorno,
data, fermate e partenze+cambi nei cerchi chiari (azzurro con bordo oro / arancio, vuoto se zero: il QM ha scartato i cerchi blu pieni, «troppe pallette blu»), «Tot» in
fondo; il giorno scelto ha il filo oro in alto. Niente più icone PNG né misure scritte in JavaScript:
la disposizione per smartphone sta nelle `@media` di `.pw-*` (sotto 1100px spariscono le scritte
accanto ai cerchi, che restano nel suggerimento al passaggio del mouse). Esempio nella guida di stile.

**Due strisce** (28/11/2026, QM): una per SoulArt + San Liborio e una per la Boutique (`_striscia`,
`.pw-sez`/`.pw-sez-t`/`.pw-riga`). Prima i conti erano uno solo e San Liborio era sommato alla
Boutique. Il giorno scelto si accende in tutte e due; la situazione del giorno sotto non cambia.

**San Liborio indicato** (28/11/2026, QM): nella striscia SoulArt + San Liborio, accanto a fermate e
partenze, la scritta oro «Lib n», senza pastiglia (`_sl`, `.pw-sl`; prima era «SL» in pastiglia, scartata dal QM) dice quante sono di San Liborio; se zero resta lo
spazio vuoto (`.pw-sl.vuoto`, invisibile) perché su smartphone i giorni restino allineati.
