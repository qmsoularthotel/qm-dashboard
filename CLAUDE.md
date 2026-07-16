# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Strutture gestite

Il gruppo comprende 7 strutture alberghiere a Napoli:
**SoulArt Hotel**, **Boutique**, **San Liborio**, **Principe**, **Mastrangelo**, **Art Resort**, **Santa Brigida**.

Codici hotel: `sa` (SoulArt), `bh` (Boutique), `sl` (San Liborio), `pr` (Principe), `ms` (Mastrangelo), `ar` (Art Resort), `sb` (Santa Brigida).

---

## Risposte alle recensioni (Booking.com + Expedia)

- **Firma in italiano:** su due righe, esattamente `Cordiali saluti,\nPaolo P. - Quality Manager`
- **Firma in inglese:** su due righe, esattamente `Best regards,\nPaolo P. - Quality Manager`
- **Struttura**: 3 paragrafi, 5-7 frasi totali. Non di più.
- **Apertura**: ringrazia sempre della recensione.
- **Booking.com**: usa sempre il nome dell'ospite nell'apertura; tono esclusivamente formale con il "Lei" (maiuscole di cortesia: La, Le, Suo, Sua), mai dare del tu.
- **Expedia**: usa sempre "Dear Guest," / "Gentile ospite," (policy OTA: nomi non disponibili).
- **Recensioni Booking senza testo**: non generare risposta ("Nessun commento scritto — risposta non necessaria").
- **Recensioni Expedia senza testo**: genera risposta breve (2 frasi concise, sempre diversa).
- Non ripetere le parole esatte usate dal recensore.
- **MAI**: "hai ragione", "hai assolutamente ragione" — per critiche usare "Prendiamo nota della sua osservazione" o "Apprezziamo il suo feedback su X".
- **MAI**: invitare al contatto diretto o alla prenotazione diretta (vietato dalle OTA).
- Citare il punteggio SOLO se è alto e la recensione è entusiasta, altrimenti non menzionarlo.
- **Fidelizzazione**: invitare a tornare specificamente presso quella struttura, mai formule generiche ("tornare in città"/"a Napoli").
- **Linea difensiva sui reclami** (Booking.com, `REV_DEFENSE_PLAYBOOK` in app.js): scusarsi solo per disservizi accidentali/isolati, mai per caratteristiche strutturali/storiche/di design. Colazione = punto di forza da difendere; letti/cuscini = comodi e di categoria; rumori = infissi ultra-insonorizzati di ultima generazione; arredamento minimal (solo SoulArt) e barocco napoletano (Art Resort/Art Suite Santa Brigida) = scelte di design, non lacune; reception non fronte-strada = conformazione dell'edificio storico/Galleria Umberto; ascensore "vecchio" = va definito **antico**, preservato per il fascino storico.
- **Caratteristiche per struttura** (`REV_HOTEL_FACTS` in app.js):
  - **SoulArt Hotel**: nuova apertura, palazzo anni '30 di epoca fascista, centro storico a pochi passi da via Toledo, arredamento **minimal** ultramoderno.
  - **Boutique Hotel**: palazzo anni '30 di epoca fascista, Piazza Carità, centro storico a pochi passi da via Toledo.
  - **Art Suite San Liborio**: nel pittoresco Vico San Liborio, quartiere Pignasecca.
  - **Art Suite Principe Umberto**: vicino Stazione Centrale.
  - **Rooms Mastrangelo**: vicino Stazione Centrale.
  - **Art Resort**: interno Galleria Umberto I, a pochi passi da Piazza del Plebiscito, camere Deluxe/Junior Suite vista Galleria, arredamento e stile **barocco napoletano**.
  - **Art Suite Santa Brigida**: interno Galleria Umberto I, a pochi passi da Piazza del Plebiscito, arredamento e stile **barocco napoletano**.
- **Esempi di stile**: il prompt include fino a 3 risposte già scritte e presenti nei CSV caricati (stessa lingua) come esempio di registro da seguire (`revGetStyleExamples`).
- **Booking.com**: solo tono **Formale** (selettore tono rimosso). La maschera di risposta ha un campo "Istruzioni aggiuntive" opzionale: se c'è già una bozza generata, il testo inserito viene usato per **correggere quella bozza specifica** (non per rigenerare da zero ignorandola).
- **Expedia**: Toni disponibili: **Formale** | **Bilanciato** | **Empatico** (default: Bilanciato). Il tono "Caldo" è stato rimosso.
- Risposte varie: evitare frasi identiche tra una risposta e l'altra (l'AI si sgama).
- Includere sempre un invito a tornare.

---

## Project Overview

**QM Dashboard** è una SPA vanilla JS per la gestione qualità di un gruppo alberghiero multi-struttura a Napoli. Il codice è diviso in:

- **`index.html`** — Layout HTML, sidebar nav, tutte le view (div#view-*), CSS inline, tag `<script src="app.js?v=...">` in fondo
- **`app.js`** — Tutta la logica JS (~6300 linee, ~33 sezioni §§)
- **`housekeeper.html`** — App separata per la governante (HK checklist camere)
- **`breakfast.html`** — App separata per il breakfast manager
- **`inventory.html`** — App separata per l'inventario detersivi (mobile, scanner barcode)
- **`controllo-mattino.html`** — App separata PWA per il giro distribuzione Culligan (mattino)
- **`dvr.html`** — App separata per consultare/gestire il DVR (General Manager)

Tutte e 5 le app standalone sopra sono controllabili on/off dalla dashboard — vedi [Pannello App](#pannello-app--centro-controllo-app-standalone).

Non esiste build system, package manager o step di compilazione.

### Versionamento

Il numero di versione va incrementato:
1. Nel `<title>` tag di `index.html` (es. `v186` → `v187`)
2. Nel cache buster `<script src="app.js?v=345-YYYYMMDD">` in fondo a `index.html`

Ad ogni modifica ad `app.js`, **aggiornare il cache buster** altrimenti il browser userà la versione vecchia.

---

## Development

**URL produzione**: `https://www.compass-qm.com`

Aprire `index.html` direttamente nel browser. Nessun server necessario.

Per trovare rapidamente sezioni di codice usare il grep con i marker `// §§`:

```bash
grep -n "§§" app.js          # lista tutte le sezioni con numero di riga
grep -n "§§ TURNO" app.js    # trova sezione specifica
```

Poi leggere solo il blocco rilevante con `offset` e `limit` invece di caricare l'intero file.

---

## Architecture

### Storage & Sync

- **Primary**: `localStorage` — ogni modifica viene persistita qui
- **Secondary**: Cloudflare KV via proxy `https://anthropic-proxy.qm-d82.workers.dev` — sync cloud tra dispositivi; stato mostrato nel topbar
- **External**: Google Sheets (Apps Script) — dati operativi HKP, breakfast, preferenze turni

### AI Integration

Claude API chiamata via proxy Cloudflare:
- **Model**: `claude-sonnet-4-6`
- **Usi**: parsing PDF/immagini di turni, arrivi, documenti pasto → JSON strutturato; generazione risposte recensioni
- **Pattern**: file upload → base64 → `fetch(PROXY)` → JSON parse → state update → localStorage + KV

### Initialization Sequence (`DOMContentLoaded` in app.js)

1. Imposta data corrente
2. Costruisce KPI bar chart
3. Pull async da Cloudflare KV (cloud sync)
4. Ripristina stato localStorage: checklist, reclami, audit, task custom, turni settimanali, arrivi, recensioni, dati HKP, pulizie, pasti, DVR, preferenze turni
5. Avvia timer: clock (10s), meteo (10min), polling overview (30s) — il polling chiama anche `turniPrefLoad()`
6. IIFE mostra `topbar-kpis` (display:flex) all'avvio

### Review Scoring Formula

Media pesata: **85% anno corrente / 10% anno-2 / 5% anno-3**, con fattore di decadimento a 271 giorni per il tracking delle scadenze.

### Hotel Room Detection Logic

I numeri di camera determinano la struttura di appartenenza (vedi `fixArriviStruttura()` in app.js):
- `Art` prefix → **SoulArt Hotel**
- `200–299` → Boutique Hotel
- `CAPRI/NAPOLI/PROCIDA/ISCHIA/POSITANO` prefix → Principe/Umberto
- `LIB` prefix → San Liborio
- `R1/R2/R3` → Mastrangelo
- Altre camere numeriche → SoulArt Hotel (fallback)

### CSS Design Tokens

```css
--bg: #E8E8EA      /* sfondo pagina */
--surface: #F4F4F6 /* superfici card */
--accent: #1E4080  /* blu primario */
--green: #1E7A48
--red: #C0352A
--amber: #A05A00
```

---

## §§ Section Map (app.js)

| Linea approx. | Sezione | Contenuto |
|--------------|---------|-----------|
| 1 | COSTANTI & CONFIG | `DEPTS`, `IS_REST`, `IS_ABSENT`, costanti globali (WEEK rimosso) |
| 15 | TURNO — ACCORDIONI UC & UPLOAD BOX | Toggle accordioni turni, upload box UI |
| 87 | TURNO — PARSER TSV/PDF | `parseTurniTSV()`, `handleTurniFile()` |
| 257 | TURNO — RENDER & NAVIGAZIONE | `renderDay()`, `buildWeekNav()`, `loadWeekData()` |
| 349 | NAVIGAZIONE VISTE | `setView()`, `pageTitles`, toggle gruppi nav |
| 357 | HKP OPERATIVE — Google Sheets | `hkpLoad()`, `hkpRenderAll()`, `hkpSave()`, `hkpRestore()` |
| ~525 | MINI APP — PANNELLO DI CONTROLLO | `miniappRenderStatus()`, `miniapp{Hk,Bkf,Cm,Inv,Dvr}Status()`, `miniappToggleApp()`, `miniappLoadBkfBanner()` — vedi sezione dedicata [Pannello App](#pannello-app--centro-controllo-app-standalone) |
| 540 | DVR — DOCUMENTO VALUTAZIONE RISCHI | `dvrRender()`, `dvrSave()`, `dvrRestore()`, `dvrRenderDipendenti()` |
| 628 | UTILITÀ — FORMATTAZIONE DATE & TIMESTAMP | `fmtNow()`, `fmtUploadTs()`, `setUploadTs()` |
| 664 | CHECKLIST — TASK ITEMS | `buildTaskItem()`, `renderTaskList()` |
| 696 | STORAGE & SYNC KV | `kvSet()`, `kvGet()`, `syncFromCloud()`, `setSyncStatus()` |
| 807 | CHECKLIST — STATO CENTRALIZZATO | `TASK_STATE`, `addCustomTask()`, `syncTaskState()` |
| 1046 | CHECKLIST — RENDER & PROGRESS | `toggleCheck()`, `toggleCheckV2()`, progress updates |
| 1127 | OVERVIEW — TOGGLE PREVIEW PANELS | Toggle pannelli occupancy/pulizie/breakfast |
| 1219 | OVERVIEW — GRAFICI & METEO | `buildBarChart()`, `fetchMeteo()`, `toggleWeatherForecast()` |
| 1299 | SIDEBAR — OROLOGIO & DATA | `updateSbClock()`, `toggleDatePopup()`, `saveDate()` |
| 1351 | OVERVIEW — RENDER PRINCIPALE + INIT + POLLING 30s | `refreshOverviewForDate()`, polling loop, `renderArriviData()` |
| 1669 | RECENSIONI — SCORE TREND MODAL | Modal trend punteggi con media pesata |
| 1756 | OVERVIEW — RECENSIONI NO-REPLY | Tracking recensioni senza risposta in overview |
| 1828 | BKF SHEET — ANALISI AI | `bkfSheetAnalyze()`, `bkfSheetARAnalyze()` via Claude API |
| 2041 | REPORT PULIZIE — PUL | `pulParseText()`, `renderPulData()`, `updateKpiFromPulizie()` |
| 2204 | RECENSIONI — SCORING & INIT UPLOAD | Scoring recensioni, init upload per tutti gli hotel |
| 2235 | RECENSIONI BOOKING — LOGICA | `revParseCsv()`, `revRenderList()`, `revGenerateReply()`, filtri |
| ~2995 | REPORT PASTI — BKF | `bkfParseText()`, `renderBkfData()`, `updateKpiFromBkf()` |
| ~3112 | HOUSEKEEPING — HKP UPLOAD & DATI | Upload HKP, parsing dati, reset slot |
| ~3191 | PIANO SETTIMANA — UPLOAD & PARSER | `parsePianoItems()`, upload e parsing piano settimanale |
| ~3350 | BKF — GRUPPI, NOTE & GRAFICI | Gruppi breakfast, note, grafici |
| ~3603 | REGISTRATION CARDS — RC | `rcParseGuests()`, `rcRenderCards()`, stampa |
| ~3668 | MODAL — CATEGORIE TREND | Modal trend categorie, calcolo score pesato |
| ~3767 | ARRIVI GIORNALIERI — UPLOAD & RENDER | `handleArriviFile()`, `renderArriviModal()`, `fixArriviStruttura()` |
| ~4634 | INVENTARIO DETERSIVI | `invCalcStock()`, `invRender()`, `invRenderStock()`, `invRenderMoves()`, `invRenderAnalysis()`, `invEditQty()`, `invPrintStock()`, `invOrdersMarkReceived()`, `invOrdersConfirmDDT()`, `invOrdersUndoReceived()` |
| ~5090 | PREFERENZE TURNI | `turniPrefLoad()`, `turniPrefRender()`, `turniPrefMarkAllSeen()`, `_tpFmtDate()` |
| ~5357 | CONTROLLO MATTINO | `cmLoad()`, `cmRender()`, `cmPrintBottle()`, `cmLoadWeeklyQC()`, `cmRenderWeeklyQC()` |
| ~6300 | RECENSIONI EXPEDIA | `revExpGenerateReply()`, `REV_EXP_HOTELS`, upload/parse Expedia TSV |

---

## Global Variables & Constants

| Nome | Tipo | Contenuto |
|------|------|-----------|
| `DEPTS` | const object | Reparti: `fo` (Front Office), `hk` (Housekeeping), `bkf` (Breakfast), `mt` (Maintenance) — con `label`, `cls`, `members[]` |
| `REV_HOTELS` | const object | Struttura dati recensioni Booking.com per hotel (sa, bh, sl, pr, ms, ar, sb) |
| `REV_EXP_HOTELS` | const object | Struttura dati recensioni Expedia per hotel (sa, bh, ar, sb) — con `tone:'bilanciato'` default |
| `TASK_STATE` | let object | Stato centralizzato di tutti i task checklist |
| `HKP_DATA` | let object | Dati HKP operative: `{sa: null, ar: null}` |
| `HKP_TAB` | let object | Tab attivo HKP: `{sa: 'riepilogo', ar: 'riepilogo'}` |
| `HKP_URLS` | const object | Endpoint Google Apps Script per HKP (sa, ar) |
| `DVR_DATA` | let object | Dati DVR per società: `{geriart: {...}, ...}` |
| `IS_REST` | const fn | Ritorna `true` se il valore turno è vuoto/null (non in programma) |
| `IS_ABSENT` | const fn | Ritorna `true` SOLO per valori espliciti: `R`, `RIPOSO`, `OFF`, `FERIE` — usare per contare assenze reali |
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

## Inventario Viste Obbligatorie (index.html)

Tutte le view devono essere presenti. Verifica con:

```bash
grep -n 'id="view-' index.html
```

| View ID | Descrizione |
|---------|-------------|
| `view-overview` | Dashboard principale con KPI, turni, meteo |
| `view-registrazione` | Registration cards ospiti |
| `view-checklist` | Task checklist giornaliera |
| `view-reclami` | Gestione reclami |
| `view-recensioni-sa` | Recensioni SoulArt |
| `view-recensioni-bh` | Recensioni Boutique |
| `view-recensioni-sl` | Recensioni San Liborio |
| `view-recensioni-pr` | Recensioni Principe |
| `view-recensioni-ms` | Recensioni Mastrangelo |
| `view-recensioni-ar` | Recensioni Art Resort |
| `view-recensioni-sb` | Recensioni Santa Brigida |
| `view-audit` | Audit qualità |
| `view-bkfsheet` | Operativa Breakfast — SoulArt |
| `view-bkfsheetar` | Operativa Breakfast — Art Resort |
| `view-hkpsheet` | Operativa Housekeeping — SoulArt Hotel |
| `view-hkpsheetar` | Operativa Housekeeping — Art Resort |
| `view-miniapp` | Pannello App — centro controllo delle 5 app standalone (ex "Mini App") |
| `view-inventario` | Inventario detersivi (stock + movimenti + analisi + ordini) |
| `view-turni-pref` | Preferenze turni staff (da Google Forms) |
| `view-controllo-mattino` | Dashboard distribuzione Culligan (stats + QC settimanale + Stampa A4) |

---

## Turno Settimanale

### Come funziona

Il turno si carica **manualmente ogni settimana** con uno screenshot o PDF del planning:

1. Aprire il Google Sheet del turno (anche solo in visualizzazione)
2. **Cmd+Shift+4** → selezionare le celle con i turni → screenshot salvato sul Desktop
3. Cliccare l'accordione **"Turno"** nell'Upload Center sidebar → appare il box 📷
4. Cliccare il box → selezionare lo screenshot → Claude analizza e carica il planning

**Formati accettati**: immagini (PNG, JPG), PDF, Excel/TSV.

### Niente più auto-sync da Google Sheets

Il vecchio sistema di aggiornamento automatico dal foglio Google è stato rimosso. Rimane solo il **KV sync tra dispositivi**: quando si carica il turno su un PC, appare su tutti gli altri PC dell'hotel entro 30 secondi.

### Upload box in index.html

Il pannello `#uc-turno-panel` contiene un `div#turniUploadBox` che triggera `turniFileInput.click()`. Senza questo elemento il click non funziona — non rimuoverlo.

### Prompt `handleTurniFile` — logica nomi

Il prompt differenzia il trattamento per reparto:
- **FO / BKF / MT**: Claude mappa i nomi dell'immagine sui nomi canonici in `DEPTS` (es. "MADDALONI" → "Maddaloni M.")
- **HK**: Claude usa il nome **esattamente come scritto** nell'immagine — il personale HK cambia ogni settimana, non mappare su lista fissa

### `renderDay()` — extra HK

`renderDay` mostra non solo i `DEPTS.hk.members` ma anche chiunque compaia nei `shifts` e non sia in nessun reparto DEPTS. Questi vengono aggiunti alla card Housekeeping.

```js
// Per HK: aggiungi nomi dal turno non presenti in nessun reparto
extras = Object.keys(shifts).filter(n => !IS_REST(...) && !allStaffLow.has(n.toLowerCase()));
```

### Confronto date in `refreshOverviewForDate`

Il confronto per trovare il giorno corrente nel weekData usa **anno/mese/giorno** (non `getTime()`):

```js
gd.getFullYear()===ref.getFullYear() && gd.getMonth()===ref.getMonth() && gd.getDate()===ref.getDate()
```

Questo evita falsi mismatch da timezone.

### `paoloTurno` (sidebar)

L'elemento `#paoloTurno` nella sidebar mostra il turno di Presta P. leggendo da `weekData` (non più dalla costante WEEK rimossa). Se `weekData` è null, mostra "Quality Manager".

---

## Staff Attuale (DEPTS)

### Front Office (`fo`)

Membri attuali (aggiornare in `app.js` sezione `§§ COSTANTI & CONFIG`):

`Maddaloni M., Presta P., De Rosa T., Pennacchio V., Perez L., Imparato G., Vatiero R., Barbosa D., D'Andrea F., Grieco V., Extra Night, Iannario R., Extra Angelica, Extra Benedetta, Raucci A., Ruggiero B.`

### Housekeeping (`hk`)

Il personale HK **cambia ogni settimana** (tante extra/interinali). I membri fissi in DEPTS sono quelli stabili; gli extra settimanali vengono mostrati dinamicamente da `renderDay` leggendo i nomi direttamente dai dati di turno caricati.

Membri fissi: `Matarese A., Nacci M., De Masi C., Chiantese M., Extra Antonella, Extra Anushka, Extra Giuditta, Extra Nunzia, Extra Roberta, Scognamillo E., Esposito M., Branno M., Sarnataro A.`

### Conteggio "non in servizio" — IS_ABSENT

**IMPORTANTE**: `IS_REST(v)` ritorna `true` anche per valori vuoti/null. Per contare chi è assente usare `IS_ABSENT`:

```js
const IS_ABSENT = v => {
  if (!v) return false;
  const u = v.trim().toUpperCase();
  return ['R', 'RIPOSO', 'OFF', 'FERIE'].includes(u);
};
```

`IS_ABSENT` ritorna `true` solo per valori espliciti di assenza, non per chi semplicemente non è in turno.

### Manutenzione (`mt`) — Comportamento Speciale

Il reparto `mt` ha logica speciale in `renderDay()`:
- **Sempre visibile** anche quando `inT.length === 0` (nessuno in turno)
- **Sempre mostra tutti i membri**: `showMembers = key==='mt' ? dept.members : inT`
- **Active styling per qualsiasi shift non-riposo**: `isActive = key==='mt' ? !IS_REST(sv) : ['P','AC','CG',...].includes(sv)`
- Ragione: il personale di manutenzione può avere turni custom (es. '9-17') non nella lista standard

---

## Recensioni Booking.com

### `revGenerateReply(r)` — regole prompt

- 3 paragrafi distinti, 5-7 frasi totali
- Apertura: ringrazia con nome ospite
- Critica: MAI "hai ragione/assolutamente ragione" — usare "Prendiamo nota di..."
- Punteggio: solo se alto E recensione entusiasta
- Chiusura: invito a tornare, no contatto diretto, no prenotazione diretta
- Tono: solo **Formale** (selettore tono rimosso — istituzionale e professionale, sobrio, senza eccedere in calore)
- Campo "Istruzioni aggiuntive" opzionale nella maschera di risposta: se compilato, il testo viene incluso nel prompt come vincolo aggiuntivo (senza poter violare le regole sopra)

---

## Recensioni Expedia

### Struttura `REV_EXP_HOTELS`

Hotel supportati: `sa` (SoulArt), `bh` (Boutique), `ar` (Art Resort), `sb` (Santa Brigida).

```js
REV_EXP_HOTELS = {
  sa: { name:'SoulArt Hotel', data:[], filtered:[], filter:'all', sort:'date_desc', search:'', page:0, tone:'bilanciato' },
  bh: { name:'Boutique Hotel', ... },
  ar: { name:'Art Resort', ... },
  sb: { name:'Santa Brigida', ... }
}
```

### Formato file Expedia

TSV (tab-separated). Colonne chiave: `review_text`, `rating`, `date`, `title`. Nessun nome ospite (policy Expedia).

### `revExpGenerateReply(r)` — regole specifiche

- Apertura sempre con "Dear Guest," (inglese) o "Gentile ospite," (italiano)
- Recensione senza testo (`review_text` vuoto): 2 frasi concise, non template fisso
- Stesse regole di Booking su critiche, punteggio, invito a tornare, no contatto diretto

---

## Inventario Detersivi — Ordini

### Flusso ricezione merce (DDT modal)

Quando si clicca **✅ Ricevuto** su un ordine in stato `ordinato`, si apre un modal DDT invece di caricare automaticamente le quantità:

1. Campo **N° DDT** (documento di trasporto)
2. Tabella prodotti ordinati con **quantità consegnata editabile** per ogni riga
3. Pulsante **"+ Aggiungi prodotto non ordinato"** — aggiunge riga con select dal catalogo + qty
4. **Conferma** → crea movimenti `in`, salva `movIds` sull'ordine, marca `status: 'ricevuto'`

### `invOrdersUndoReceived(id)`

Annulla una ricezione: rimuove i movimenti creati (usando `o.movIds`) e resetta l'ordine a `status: 'ordinato'`. **Nota**: ordini ricevuti prima dell'introduzione di `movIds` non hanno movimenti tracciati — l'undo resetta solo lo stato.

### Struttura ordine

```js
{
  id:          string,   // timestamp_random
  wh:          string,   // 'sa' | 'ar'
  date:        string,   // 'DD/MM/YYYY'
  ts:          number,   // Date.now()
  fornitore:   string,
  status:      'ordinato' | 'ricevuto',
  tsRicevuto:  number,   // Date.now() al momento ricezione
  ddt:         string,   // numero DDT
  movIds:      string[], // ID movimenti creati al DDT — usati per undo
  items:       [{ barcode, name, qty }]
}
```

### Funzioni ordini

| Funzione | Scopo |
|----------|-------|
| `invOrdersMarkReceived(id)` | Apre modal DDT per ricezione merce |
| `invDDTAddRow()` | Aggiunge riga extra prodotto non ordinato nel modal DDT |
| `invOrdersConfirmDDT(id)` | Conferma DDT: crea movimenti, salva movIds, chiude modal |
| `invOrdersUndoReceived(id)` | Annulla ricezione: rimuove movimenti da movIds, resetta status |
| `invOrdersDelete(id)` | Elimina ordine (solo se non ricevuto) |

### Aggiunta manuale prodotto al catalogo (senza scanner)

Prima si poteva registrare un nuovo prodotto **solo** scansionando un barcode sconosciuto. Ora esiste anche un percorso da tastiera, in due posti paralleli:

- **`inventory.html`** (tab Catalogo): pulsante **"+ Nuovo"** → `openManualNewProduct()` → apre lo stesso modal usato dallo scanner (`openMoveModal`), ma con un flag `isManualAdd=true` che mostra anche un campo **codice a barre digitabile**. Se lasciato vuoto, `saveMove()` genera un codice sintetico `'manual_'+Date.now()` e verifica che non collida con uno esistente.
- **Dashboard (`app.js`)**: tab Catalogo → pulsante **"+ Nuovo prodotto"** → `invAddProduct()` — usa una sequenza di `prompt()` (nome, codice a barre opzionale, unità, soglia), stesso pattern di `invEditProduct()` già esistente.

Entrambi i percorsi scrivono nello stesso `qm_inv_catalog_<wh>` — nessuna nuova chiave KV.

---

## Spese Fornitori (view `spese`)

### Scopo

Analisi spesa fornitori: DDT caricati (chiave `qm_ddt`, condivisa con `breakfast.html`), suddivisi per categoria prodotto con classificazione automatica per keyword (`CAT_RULES`).

### Riassegnazione manuale categoria (`qm_spese_cat_override`)

Nella tab **Analisi**, ogni prodotto ha un menu **"Sposta ▾"** per spostarlo manualmente in un'altra categoria — la riassegnazione ha sempre priorità sulle keyword automatiche e vale per sempre (tutti i mesi, passati e futuri), perché la chiave dell'override è la **descrizione del prodotto**, non un mese/DDT specifico.

```js
const SPESE_CAT_OVERRIDE_KEY = 'qm_spese_cat_override';
let _speseCatOverride = {};  // { [descrizioneNormalizzata]: categoriaId }
```

**Persiste anche su `breakfast.html`**: prima la riassegnazione fatta su Compass non veniva letta da `breakfast.html` (che classifica gli stessi DDT solo per keyword) — un prodotto spostato su Compass restava "non classificato" sul telefono. Ora `breakfast.html` legge `qm_spese_cat_override` con la stessa priorità e si risincronizza dal cloud ogni 60s oltre che al caricamento (`ddtBkfSyncFromCloud()`).

### Stato UI persistente tra i re-render

`speseCatMoveProduct()` chiama `ddtRenderSpese()` che rigenera l'intero HTML della vista — questo resettava a `display:none` i pannelli categoria espansi ad ogni spostamento, riportando l'utente alla lista principale. Risolto con stato di modulo persistente:

```js
let _speseCatOpen = null;      // id categoria espansa (sopravvive al re-render)
let _speseUncatOpen = false;   // stato pannello "Non classificati"
```

### Tabella "Spesa e coperti mensili" — allineata a smartphone

La tabella nella dashboard (Compass) aveva solo `MESE | SPESA TOTALE | COPERTI BB`; `breakfast.html` aveva in più le colonne **VAR%** (spesa e coperti, mese su mese) con badge colorato. Allineate: Compass ora mostra le stesse 5 colonne (`MESE | SPESA | VAR% | COPERTI | VAR%`), stile CSS-token invece dei colori hardcoded dello smartphone.

---

## Operativa Housekeeping (HKP)

### Scopo

Mostra i consuntivi di lavoro delle cameriere (camere fatte per giorno, classifica mensile, sparkline trend). I dati vengono da Google Sheets aggiornati dalla governante.

### Apps Script Endpoints (URL aggiornati)

```js
HKP_URLS = {
  sa: 'https://script.google.com/macros/s/AKfycbyagJEmayDGyuXxN_gdt_GpcF61P9SETlhBvGfMxPXZxLWa9iyZjso2ifL8LXqU3Wgz/exec',
  ar: 'https://script.google.com/macros/s/AKfycbw1M5jjfv-Kq8MuoTaI3zkH7u9Qha6OrHO_vq4QXpQk6FHlK0AyTILLBPjR22PQ3pg/exec'
}
```

### Struttura Fogli Google — SoulArt

| Range | Contenuto |
|-------|-----------|
| `A38:AG47` | Cameriere per giorno: nome in col B (idx 1), giorni 1-31 in col C-AG (idx `d+1`) |
| `C48:AG57` | Duplex totale (camere duplex per giorno) |
| `B61:C70` | Totali mensili per cameriera: nome in B, totale in C (usato come fallback) |

**Logica colonne nel range A38:AG47:**
- `values[i][0]` = col A (vuota o etichetta gruppo)
- `values[i][1]` = col B = nome cameriera
- `values[i][d+1]` = col corrispondente al giorno `d` (d=1 → col C, d=31 → col AG)

### Struttura Fogli Google — Art Resort

| Range | Contenuto |
|-------|-----------|
| `A32:AG39` | Cameriere per giorno: nome in col B (idx 1), giorni 1-31 in col C-AG (idx `d+1`) |
| `C36:AG39` | Duplex totale |
| `B43:C46` | Totali mensili per cameriera: nome in B, totale in C |
| Riga 41 | Totali giornalieri (TOT. CAMERE) |

### Struttura Dati HKP (JSON restituito dall'Apps Script)

```js
{
  cameriere: [{ nome, camere_tot, camere_per_giorno: { "1": 4, ... } }],
  tot_mese: number,
  tot_duplex: number,
  totale_per_giorno: { "1": 31, ... },
  mese: string,        // es. "aprile 2026"
  giorni_elaborati: number,
  giorni_mese: number
}
```

### Tab Disponibili

- **Riepilogo mensile**: classifica cameriere + barra duplex + sparkline trend giornaliero
- **Per giorno**: dettaglio camere per ogni giorno del mese

---

## DVR — Documento Valutazione Rischi

### Scopo

Gestione dipendenti e documenti DVR per ogni società del gruppo. Dati persistiti in localStorage + KV con chiave `qm_dvr`.

**Voce sidebar**: la sezione menu che contiene il link DVR si chiama **"Fascicolo Dipendenti"** (rinominata da "Sicurezza" — la vista contiene anche anagrafica dipendenti, attestati e scadenze visite mediche, non solo il Documento di Valutazione dei Rischi in senso stretto). Aggiornare sia `index.html` (`nav-section`) sia `app.js` (`breadcrumbs.dvr`) se si rinomina di nuovo — vanno tenuti allineati manualmente, non c'è una fonte unica.

### Lista Dipendenti — Ordinamento

L'elenco dei dipendenti è ordinato con **pin fisso**:
1. **Corduas Vincenzo** — sempre primo
2. **Presta Pierpaolo** — sempre secondo
3. Contratti a termine ordinati per data scadenza (più vicina prima)
4. Tutti gli altri in ordine alfabetico

### Scadenze Contratto — Colori

| Stato | Colore | Stile riga |
|-------|--------|-----------|
| Scaduto (`daysLeft < 0`) | `var(--red)` + bg rosso | `border-left: 3px solid var(--red)` |
| In scadenza (`0 ≤ daysLeft ≤ 30`) | `var(--amber)` + etichetta `⏳ scad. gg/mm (Ngg)` | `border-left: 3px solid var(--amber)` |
| Ok (`daysLeft > 30`) | `var(--text-dim)` | nessun bordo |

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
| `updateSbClock()` | Aggiorna orologio sidebar (ogni 10s) |

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

---

## Periodic Timers

| Intervallo | Scopo |
|-----------|-------|
| 10 sec | `updateSbClock()` — aggiorna orologio sidebar |
| 10 min | `fetchMeteo()` — aggiorna previsioni meteo |
| 30 sec | Polling overview + cloud sync + `turniPrefLoad()` + sync weekData da KV |

---

## Service Worker (`sw.js`)

Versione corrente: **`qm-v3`**. Pattern:
- **Proxy/KV/Google Sheets requests** → sempre network, mai cache
- **HTML files** → network-first con `cache:'no-store'` (garantisce Cmd+R sempre aggiornato)
- **Asset statici** → cache-first (il cache buster gestisce gli aggiornamenti)

`sw-controllo-mattino.js` è legacy e si auto-disinstalla. Non modificarlo.

---

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

### Dashboard (`cmLoad()`) — KV come source of truth

Legge sempre KV prima (fonte dei dati scritti da smartphone), poi fallback localStorage.

### QC Settimanale

Conta sostituzioni bottiglie (condizione: `visited && !dnd && !libera && bottiglia==='consumata'`) per le 7 chiavi della settimana corrente da KV.

**Pulsanti**: WhatsApp albergo (`wa.me/393274919588`) | 📋 Copia testo (`data-msg` attribute) | 👁 Anteprima.

### `rs.ts` — timestamp per camera (per Pannello App)

`saveRoom()` ora scrive anche `rs.ts = Date.now()` oltre a `rs.visited = true`. Serve esclusivamente al Pannello App (vedi sotto) per calcolare l'orario dell'ultimo controllo registrato oggi — non è usato altrove in `controllo-mattino.html` stesso.

---

## Pannello App — Centro Controllo App Standalone

### Scopo

Vista `miniapp` (voce sidebar **"Pannello App"**, ex "Mini App") — pannello di controllo per le 5 app standalone (Housekeeping, Breakfast, Distribuzione Culligan, Inventari Detersivi, DVR). Non è più un semplice elenco di link con contatore accessi: mostra uno **stato colorato** con KPI operativo per ciascuna app, un **toggle on/off** che può disattivarle da remoto, e un **avviso toast** per Breakfast.

### Layout

Griglia mosaico a **3 colonne fisse** (`grid-template-columns:repeat(3,minmax(0,1fr))`) — non `auto-fit`, perché con 5 card l'ultima riga (2 card) andava a stiracchiarsi in modo disomogeneo rispetto alle 4 sopra. Icone delle card identiche a quelle della sidebar (`img/icons/housekeeping.png`, `breakfast_sheet.png`, `acqua_culligan.png`, `inventari_e_ordini.png`, `dvr.png`).

### Stato colorato per card — `miniapp*Status()`

| App | Funzione | Verde | Ambra | Rosso | KPI mostrato |
|-----|----------|-------|-------|-------|--------------|
| Housekeeping | `miniappHkStatus()` | Piano caricato e aggiornato a oggi | Piano caricato ma non per oggi | Piano non caricato | `ore HH:MM` da `qm_ts_pianoTs` |
| Breakfast | `miniappBkfStatus()` | Report presente per oggi | Report caricato ma non per oggi | Report non caricato | `ore HH:MM` da `qm_ts_bkfTs` |
| Distribuzione Culligan | `miniappCmStatus()` (async) | Giro completato (0 camere pending) | Giro in corso | Nessun controllo oggi | `ore HH:MM` — max di `rs.ts` tra le camere di oggi |
| Inventari Detersivi | `miniappInvStatus()` | 0 prodotti sotto soglia | 1-2 sotto soglia | ≥3 sotto soglia | `SA gg/mm · AR gg/mm` — data ultima consegna ricevuta per magazzino (`tsRicevuto` degli ordini `status:'ricevuto'`) |
| DVR & Compliance | `miniappDvrStatus()` | Nessun contratto in scadenza | Contratti in scadenza ≤30gg | Contratti già scaduti | conteggio contratti interessati |

**Nota**: i KPI mostrano un **orario/data reale** (da timestamp di aggiornamento dati), non un conteggio — prima Housekeeping/Breakfast/Culligan mostravano "N cambi camera" / "N coperti" / "N camere da visitare", giudicati poco utili; ora mostrano quando il dato è stato aggiornato l'ultima volta, coerente con lo scopo "pannello di controllo".

### Toggle on/off — `qm_app_status`

Ogni card ha un interruttore (`miniappToggleApp(key)`, key ∈ `hk|bkf|cm|inv|dvr`) che scrive su una chiave KV condivisa:

```js
const MINIAPP_KEYS = ['hk','bkf','cm','inv','dvr'];
let _appStatus = {};  // qm_app_status: { hk:true, bkf:false, ... } — assente/true = attiva
```

**Lato app standalone**: ciascuno dei 5 file (`housekeeper.html`, `breakfast.html`, `controllo-mattino.html`, `inventory.html`, `dvr.html`) ha, subito dopo la dichiarazione di `PROXY`, una funzione `qmCheckAppStatus()` che legge `qm_app_status` (`cache:'no-store'`) e, se il proprio flag è `false`, mostra un overlay fullscreen `#qm-maintenance-screen` (logo Compass + "Applicazione in aggiornamento") al posto della UI normale.

**Ricontrollo mentre l'app resta aperta**: `qmCheckAppStatus()` gira al caricamento, su `visibilitychange` (quando l'app torna in primo piano) e ogni 30s via `setInterval` — necessario perché un'app rimasta aperta in background su uno smartphone (icona home screen mai chiusa) non rileggerebbe mai lo stato senza questo. Se il fetch fallisce (rete assente), l'app **resta utilizzabile** (fail-open) — non blocca mai per un problema di connessione.

**Non implementato**: contatore accessi per dispositivo (rimosso su richiesta esplicita — "non si è rivelato utile"). Le funzioni `loadHkAccessStats`, `loadBkfAccessStats`, `loadDvrAccessStats` e il toggle "escludi questo dispositivo" sono stati eliminati insieme alle relative sezioni UI. Le app standalone continuano a scrivere silenziosamente `qm_hk_access` / `qm_bkf_access` / `qm_dvr_access` (codice non toccato), ma la dashboard non li legge/mostra più.

### Avviso toast — solo Breakfast (`qm_bkf_banner`)

Messaggio scritto dalla dashboard, mostrato come toast temporaneo (7s) su `breakfast.html`, **solo quando si è sulla tab "Analisi"** (attenzione: nel codice quella tab è `switchTab('report')` — non un sub-tab `_ddtBkfTab==='analisi'` dentro Ordini/Acquisti, che esiste ma non è mai raggiungibile da nessun bottone della UI. Il bottom-nav di `breakfast.html` è: Servizio→`day`, Acquisti→`orders`, **Analisi→`report`**).

```js
const BKF_BANNER_KEY = 'qm_bkf_banner';
let _bkfBanner = { enabled: false, message: '' };
```

- Interruttore acceso/spento **indipendente** da quello dell'app (`miniappToggleBkfBanner()` vs `miniappToggleApp('bkf')`).
- Campo testo libero + pulsante "Salva avviso" (`miniappSaveBkfBanner(btn)` — mostra "✓ Salvato" per 1.5s sul bottone stesso, poi torna al testo originale: è solo conferma visiva, non un errore se sembra "tornare indietro").
- In `breakfast.html`: `qmCheckBanner()` viene chiamata su `visibilitychange`→visible e dentro `switchTab()` quando `tab==='report'`; si nasconde subito se si esce da quella tab. Non è nel polling a 30s (quello è solo per il check on/off dell'app).
- Toast: icona SVG bell (non emoji — sostituita due volte su richiesta, prima 📢 poi 🔔, ora SVG outline oro senza sfondo), testo centrato, posizionato `bottom:72px` (sopra la bottom-nav fissa, non sopra di essa — la prima versione a `bottom:16px` copriva i pulsanti Servizio/Acquisti/Analisi).

### Didascalie toggle

Ogni toggle ha una didascalia breve **accanto** ("Attiva/disattiva app"), non più una frase lunga su una riga a parte sopra il link — cambiato dopo feedback che il testo grigio a 9-10px era illeggibile (portato a `--fs-xs`, 13px).

---

## Preferenze Turni

### Foglio Google collegato

`https://docs.google.com/spreadsheets/d/1KysJxvGY-PxCSrjdWMjYCz_7KlFOIG6bSe3fXCVfObo`

Apps Script: `TURNI_PREF_URL = 'https://script.google.com/macros/s/AKfycbzCbHxJbSfxg8X49w2JlfI9xo3HqhDiOa6E_0SDstdrvpQTQfqd2euaGp1oIK3zo0CA/exec'`

Usa `typeof v.getTime === 'function'` invece di `instanceof Date` per evitare bug Apps Script.

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

Le viste `view-hkpsheet` e `view-hkpsheetar` sono state perse e recuperate (commit `2183997`).

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

Se il **Pannello App è vuoto o rotto**, verificare prima che questi ID esistano ancora in `index.html`: `miniapp-hk-status`, `miniapp-bkf-status`, `miniapp-cm-status`, `miniapp-inv-status`, `miniapp-dvr-status`, `miniapp-hk-toggle` (e gli altri 4 `-toggle`), `bkf-banner-msg`, `miniapp-bkf-banner-toggle`. Le funzioni JS corrispondenti sono tutte in `app.js` sotto il marker `// §§ MINI APP — PANNELLO DI CONTROLLO`.

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

| Problema | Causa | Fix |
|----------|-------|-----|
| HKP views scomparse | Sovrascrittura accidentale index.html | Recuperare da git `2183997` |
| Browser usa versione vecchia app.js | Cache buster non aggiornato | Aggiornare `?v=...` in `<script src="app.js?v=...">` |
| MT card non visibile in overview | `inT.length === 0` saltava il reparto | `showMembers = key==='mt' ? dept.members : inT` |
| Extra HK non visibili in overview | `renderDay` iterava solo `dept.members` | Aggiunti extra dal turno non in DEPTS alla card HK |
| Turno upload box non appare | `#turniUploadBox` mancante in `#uc-turno-panel` | Aggiunto `div#turniUploadBox` nel pannello sidebar |
| Warning "settimana precedente" con turno corretto | Confronto `getTime()` sensibile al timezone | Confronto con `getFullYear/Month/Date` |
| `paoloTurno` mostra dati marzo 2026 | Usava costante `WEEK` hardcoded rimossa | Ora legge da `weekData` reale |
| Testo HTML visibile nel pulsante "Copia testo" | `JSON.stringify` produceva virgolette che rompevano `onclick` | Usa `data-msg` attribute + `this.dataset.msg` |
| QC settimanale non visibile senza dati giornalieri | `cmRender` faceva `return` anticipato prima di `cmLoadWeeklyQC()` | Chiamata `cmLoadWeeklyQC()` prima del return nel branch vuoto |
| Voce Expedia scompare dopo Cmd+R | SW v2 cachava HTML senza `no-store` | `sw.js` aggiornato a `qm-v3` con `cache:'no-store'` per HTML |
| `rcFmtDate` restituiva URL Google nel caso else | URL rimasta per errore nel ternary | Else branch corretto: `return raw` |
| "Non in servizio" conta anche chi non è in turno | `IS_REST(v)` ritorna true per valori null/vuoti | Usare `IS_ABSENT(v)` che richiede R/FERIE espliciti |
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
