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

## Prenotazioni — il file unico che sostituisce tre upload (2026-08-20)

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
| Arrivi Pre-stay | schede `_prestay` | un import per ogni giorno futuro presente nel file |
| (nessuno: derivato) | `qm_rcGuests` | registration card del giorno, da `qm_arriviData` — vedi sotto |

Da 3 caricamenti al giorno a **1**. Turno e Piano Settimanale restano invariati.

### Le registration card sono una derivazione, non un effetto collaterale

Scrivere `qm_arriviData` **non** aggiorna le registration card: la vista Registrazione
legge `qm_rcGuests`, che va riscritto a parte. Nella prima versione `prenHandlePdf` non lo
faceva, quindi caricando il PDF Prenotazioni le card restavano quelle dell'ultimo
Riepilogo Reception caricato a mano — con l'aggravante che tutto il resto (arrivi,
colazioni, pre-stay) si aggiornava regolarmente, per cui sembrava un problema della sola
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

I nomi passano da `_psNomeUmano`: l'export del PMS è in maiuscolo (`BIANCHI ANNA`) e sulla
card stampata, a 24pt, si legge come una sgridata. Stessa regola già in uso nel pre-stay.

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

### Multicamera: una sola scheda, non una per camera

Una prenotazione su più camere compare nell'export come **una riga per camera**. È una sola
prenotazione con una sola email, quindi deve produrre **una sola scheda**.

**Il codice NON è condiviso fra le camere del gruppo** — verificato sul file reale: fra 158
prenotazioni non ce ne sono due uguali, nemmeno all'interno dei gruppi (e nemmeno spezzando
il codice nei suoi due token). Quello che coincide sono **nome, arrivo, partenza e canale**:
è su quelli che `_prenPrestay` raggruppa. Nel file di prova emergono 9 gruppi, da 2 a 4
camere (Olimpio Michele ne ha 4, Talhami Alla 3).

La scheda conserva `codici[]` con i codici di **tutte** le camere: al reimport basta che
**uno** combaci, così il gruppo si riconosce anche se una camera viene tolta o cambiata.
`codice` resta valorizzato col primo, per le schede salvate prima che la lista esistesse.

Sulla card compare una pastiglia ambra **"N camere"** con l'elenco nel tooltip: senza,
il raggruppamento sarebbe invisibile e sembrerebbe che manchino degli arrivi.

**Attenzione**: due ospiti diversi con lo stesso nome, stesso arrivo e stessa partenza
verrebbero uniti. È il compromesso accettato — la pastiglia "N camere" lo rende però
visibile a colpo d'occhio.

### L'abbinamento delle schede va sul CODICE, non sul nome

Il nome dell'ospite **cambia**: al check-in viene registrato il documento di chi si
presenta, che può essere l'accompagnatore. Caso reale (20/08/2026): pre-stay inviato a
"Marino Ilenia", al banco registrata "Della Sala Maria Concetta", e al reimport la stessa
prenotazione tornava come un secondo arrivo — con l'invio già fatto rimasto sulla scheda
vecchia e una scheda nuova apparentemente da compilare.

`_psImportaArrivi` abbina in quest'ordine:

1. **`codice`** della prenotazione (colonna `Codice`, x 470–519) — non cambia mai. Presente
   e univoco su tutte le prenotazioni dell'export (verificato: 158 su 158, zero duplicati).
   Quando combacia, **il nome viene aggiornato** con quello del PMS.
2. **nome**, per le schede importate prima che il codice esistesse
3. prima scheda vuota della stessa struttura
4. scheda nuova

Il codice va a capo nell'export (`7BK7M6L` + `7MXYPP`): va accodato come il nome, altrimenti
resta troncato e non abbina più.

Abbinando per codice si aggiorna anche `hotel`: una prenotazione può essere spostata di
struttura senza per questo diventare un secondo arrivo.

### Il canale colora la scheda pre-stay all'import

La colonna `Origine` viene salvata sulla scheda (`a.origine`) e decide il colore del bordo
tramite `PS_CANALI`, **prima** che si digiti l'email:

`booking` blu · `expedia` giallo · `g2 travel` marrone · `italcamel` viola · altri neutro

Prima il canale si deduceva dall'indirizzo email (`PS_BORDI`), che però si inserisce a
mano: all'import le schede restavano neutre e prendevano colore solo a compilazione fatta.
Quella regola resta come **ripiego** per le schede vecchie o aggiunte a mano, e per le
prenotazioni la cui origine non è fra quelle mappate.

Il canale **vince sull'email**: un ospite Booking che lascia un indirizzo privato resta
blu. Per questo `_psAggiornaBordo` legge `data-canale` sulla card e, se c'è, non tocca il
colore mentre si digita.

Sulla scheda compare anche una **pastiglia col nome del canale** (`_psCanaleNome`), dello
stesso colore del bordo:

`Booking` · `Expedia` · `Italcamel` · `G2 Travel` · **`Diretta`** per CRSVertical, che è il
motore di prenotazione del sito — chiamarla col nome del fornitore non direbbe niente a chi
legge. Un'origine non prevista viene mostrata com'è (accorciata a 14 caratteri); senza
origine non compare nessuna pastiglia.

**Italcamel si accende da sola** quando l'origine lo dichiara: la spunta manuale resta per
i casi non coperti, ma non è più l'unico modo.

Attenzione a `Booking.co`: il PDF manda a capo `Booking.com` e nella colonna resta troncato.
Le espressioni di `PS_CANALI` cercano sottostringhe (`/booking/i`), non uguaglianze, proprio
per questo.

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

### Tornare indietro

`PREN_UNICO=false` in cima alla sezione: riappaiono i tre slot e tornano attivi i loro
handler, **mai rimossi** (`handleArriviFile`, `prestayHandlePdf`, `handleBkfFile`). Stesso
schema di `HKP_DERIVE_FROM_PIANO`. Punto di ritorno completo: tag git
**`pre-prenotazioni-unico`**.

### Perché il parsing è deterministico e non AI

Colonne a posizione x fissa, come `_psParsePdfArrivi`: nomi e tipi camera vanno a capo
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
