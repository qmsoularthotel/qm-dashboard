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
4. Ripristina stato localStorage: reclami, audit, turni settimanali, arrivi, recensioni, dati HKP, pulizie, pasti, DVR, preferenze turni
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
| 696 | STORAGE & SYNC KV | `kvSet()`, `kvGet()`, `syncFromCloud()`, `setSyncStatus()` |
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

## Icone Sidebar — badge SVG navy/oro (`.nav-icon-badge`)

13 delle voci del menu principale usano un badge SVG inline (cerchio navy `var(--accent)`, anello oro `var(--gold)`, icona bianca stroke/fill 18px) al posto della foto PNG originale — stesso linguaggio visivo dei bottoni di Reception (`.btn-badge` in `reception.html`). Classe `.nav-icon-badge` in `style.css`, stesso ingombro 38px di `.nav-icon-img` così l'allineamento con le voci rimaste a icona PNG non cambia.

**Voci convertite**: Overview (casa), Registration Cards (passaporto), Room Division (chiave), Distribuzione Culligan (goccia d'acqua), Breakfast Sheet (tazza), Operativa Housekeeping (scopa), Passaggi di Cassa (glifo € pieno — stessa icona del bottone "Conta e conferma fondo cassa"), Preferenze Turni (calendario con spunta), Turnazione Corrente (gruppo persone), Recensioni Booking (stella piena), Recensioni Expedia (stella outline), DVR (scudo), Inventari e Ordini (scatola), Spese Fornitori (grafico a barre), Pannello App (griglia app).

Non c'è generazione di file immagine: sono tutti `<svg>` inline nel markup di `index.html`, nessun asset in `img/icons/` aggiunto o modificato — i PNG originali restano nella cartella ma non più referenziati da queste voci.

### Icone Upload Center — `.uc-icon-badge`

Stesso trattamento applicato alle 4 card visibili dell'Upload Center in sidebar (`.uc-slot`): classe `.uc-icon-badge` in `style.css` (32px, stesso ingombro di `.uc-icon-img`) — Turno (griglia turni), Riepilogo Reception (campanello), Piano Settimanale (calendario settimana), Report pasti (posate). Le card nascoste (`uc-pul`, `uc-soul`, `uc-bout` — non più nel flusso upload da quando `HKP_DERIVE_FROM_PIANO=true`, vedi sezione "Upload quotidiani") restano con l'icona PNG originale, irraggiungibili comunque dall'interfaccia.

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
| `view-turnazione` | "Turnazione Corrente" — specchio del pannello turno di Overview (`.staff-area-mirror`) |
| `view-controllo-mattino` | Dashboard distribuzione Culligan (stats + QC settimanale + Stampa A4) |
| `view-reception` | Fondo Cassa & Incasso Contante — sola lettura + modifica per il QM |
| `view-resi-biancheria` | Resi biancheria inidonea al fornitore Raimondo (solo SoulArt, solo QM) |

---

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

### "Turnazione Corrente" (`view-turnazione`) — specchio del pannello turno

Voce di menu nella sezione **Reception**, non un pannello indipendente: mostra lo stesso identico contenuto del pannello "Turno di oggi" in Overview, senza duplicare la logica.

- `renderDay(idx)` non scrive più direttamente su `#staffArea`: l'ultima riga chiama `_setStaffAreaHTML(html)`, che fa `document.querySelectorAll('.staff-area-mirror').forEach(el=>el.innerHTML=html)`. Sia `#staffArea` (Overview) sia `#staffAreaMirror` (`view-turnazione`) hanno la classe `.staff-area-mirror` — un solo render li aggiorna entrambi.
- Stesso trattamento per gli altri due punti che scrivono nel pannello turno: `resetTurni()` (stato vuoto) e il fallback "turni settimana precedente" dentro `refreshOverviewForDate`. Se si aggiunge un quarto punto di scrittura in futuro, usare `_setStaffAreaHTML()` invece di `document.getElementById('staffArea').innerHTML=`, altrimenti quello specifico stato non comparirebbe nello specchio.
- `setView('turnazione',...)` richiama `renderDay(activeDay)` solo per popolare lo specchio se la vista viene aperta prima che Overview l'abbia mai fatto in questa sessione (altrimenti resterebbe vuoto finché non cambia giorno).
- I click sui pulsanti giorno dentro `renderDay()` (`wday-btn`, generati inline nell'HTML) funzionano identici in entrambe le copie: chiamano `renderDay(wi)` globale, non legato a un contenitore specifico.

### Riorganizzazione sezione "Reception" (menu)

La sezione menu **Staff** è stata eliminata: "Preferenze Turni" si è spostata dentro **Reception**, insieme a "Passaggi di Cassa" e "Turnazione Corrente". `breadcrumbs['turni-pref']` e `breadcrumbs['turnazione']` sono ora `'Reception'` (prima `'turni-pref'` era `'Operativo Quotidiano'`).

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

## Room Division — Suggerimenti di bilanciamento (`hkSuggestMoves()`)

### Scopo

`hkSuggestMoves(maxN, focusIdx)` in `app.js` propone scambi di camere (stessa tipologia, solo soggiorni non ancora iniziati) tra Matarese e le altre cameriere, per pareggiare il **carico pesato** (`_hkDayScore`) giorno per giorno — non sui totali di settimana, perché è il singolo giorno che le cameriere si confrontano tra loro.

### Le partenze pesano più del carico generale — `HK_PESO_PARTENZE`

Una partenza pesa già 2 nel carico (2,5 sulle camere Art 1/2/3/8/9/13). Lo squilibrio di un giorno è `|differenza carico| + HK_PESO_PARTENZE × |differenza partenze|`, e una mossa viene proposta solo se **migliora** questo punteggio complessivo (mai peggiora la settimana).

Le cameriere non ragionano in carico pesato — è un concetto astratto per loro — guardano il numero di partenze assegnate a testa: "perché io ne ho di più?". `HK_PESO_PARTENZE` era 3 (bastava a spareggiare a parità di carico), ma troppe mosse che pareggiavano perfettamente le partenze venivano scartate perché peggioravano di poco il carico generale altrove, risultando in un guadagno complessivo negativo — pochi suggerimenti mostrati. Alzato a **8** (una partenza in meno/in più vale come 4 camere intere di carico): il motore ora accetta anche mosse che peggiorano il carico pur di pareggiare le partenze, proponendo più soluzioni.

Alzare ulteriormente `HK_PESO_PARTENZE` rende il bilanciamento delle partenze ancora più prioritario rispetto al carico; abbassarlo torna a dare più peso al carico generale.

### Soglie di "sbilanciato" (non toccate da questo cambio)

- Un giorno entra tra i `sbilanciati` solo se `|pM-pA|>=2` (uno scarto di 1 è inevitabile con un totale dispari e nessuno lo percepisce come ingiusto).
- Col focus su un giorno specifico, è "sbilanciato" se `|pM-pA|>=2` **oppure** `|cM-cA|>=2` (2 di carico = il peso di una camera intera).

### Vincoli strutturali

- Solo camere della **stessa tipologia** possono essere scambiate (mai tra tipologie diverse) — vincolo non negoziabile, unico bacino da cui `hkSuggestMoves()` pesca le camere candidate per tutti e tre i tipi di mossa (sposta/scambia/catena).
- `HK_TIPI_FISSE`/`HK_CAMERE_FISSE` (Junior Suite, Suite: Art 1,2,3,8,9,13) non si spostano mai.
- **`spostabile(b)` = soggiorno con arrivo DOPO oggi** (`b.start>todayIdx`, non `>=`): un arrivo previsto **proprio oggi** non va mai proposto come riassegnabile, anche se il check-in non è ancora avvenuto — reception/HK possono già lavorare su quella camera per la giornata odierna, quindi spostarla creerebbe confusione operativa. Restano fuori sia gli ospiti già in casa sia gli arrivi di oggi.

Se non c'è nessuna mossa possibile, `out.ostacoli` spiega camera per camera perché (tipologia senza corrispettivo dall'altro lato, oppure occupata in quelle notti).

### "Occupata" non vuol dire bloccata — anche con più di un occupante

Una camera candidata occupata in quelle notti non è automaticamente uno scarto: se c'è **un solo** soggiorno che si sovrappone, il motore prova già uno scambio diretto (`tipo:'scambia'`) o una catena a tre (`tipo:'catena'`, il soggiorno che occupa si sposta in una terza camera libera della stessa tipologia). Prima però, se la camera candidata era occupata da **più soggiorni diversi** sovrapposti in periodi differenti, il motore rinunciava subito senza nemmeno provare.

Aggiunto un quarto caso, `tipo:'catena-multi'`: se tutti gli occupanti in conflitto sono spostabili (nessuno già in casa), il motore prova a ricollocare **ognuno** in una camera libera diversa della stessa tipologia (assegnazione greedy, una camera a testa — niente scambi incrociati tra loro, per restare un'operazione eseguibile a mano nel PMS). Se anche solo uno degli occupanti non trova posto altrove, la mossa non viene proposta (mai un suggerimento che in pratica non si può eseguire).

**La camera di partenza (A) stessa è una destinazione valida** per uno degli occupanti multipli di B: si è appena liberata con la partenza di X, quindi va inclusa tra i candidati (`candidatiMulti=[A, ...altre stesso tipo]`), non solo le "terze camere". Prima A era esclusa a priori (`usate=new Set([A,B])`), scartando soluzioni valide quando uno dei soggiorni sovrapposti in B poteva semplicemente entrare nella camera appena svuotata. Ogni candidato riceve al massimo un occupante (nessuna verifica di compatibilità tra due occupanti nella stessa camera di destinazione, anche se in teoria non si sovrappongono tra loro — semplificazione voluta, per restare un'assegnazione facile da eseguire a mano).

**Etichette leggibili**: `HK_TIPO_LABELS`/`_hkTipoLbl()` traducono i codici grezzi del Piano ("AS SUP"→Superior, "AS DLX DP"→Deluxe) ovunque una tipologia viene mostrata nei suggerimenti e nella diagnostica ostacoli.

**Diagnostica più precisa**: il messaggio "occupata in quelle notti" era generico e non distingueva perché il blocco fosse reale. Ora, guardando la prima camera candidata come esempio rappresentativo (non un'analisi esaustiva di tutte), il messaggio specifica: occupata da un ospite già in casa, occupata da un soggiorno che non entra altrove, occupata da più soggiorni incluso un ospite già in casa, oppure occupata da più soggiorni sovrapposti non ricollocabili tutti.

### Scambio in blocco — tutta la settimana tra due camere, non un soggiorno alla volta

Tutti i tipi di mossa sopra ragionano su **un singolo soggiorno** che si sposta. Ma spesso la richiesta reale è diversa: "scambia Art 11 con Art 14 per tutta la settimana" — cioè scambiare **tutte** le prenotazioni future delle due camere in un colpo solo, non una alla volta. Prima questo tipo di mossa non veniva cercato affatto.

`tipo:'scambio-blocco'`: per ogni coppia di camere A/B della stessa tipologia con almeno un soggiorno futuro ciascuna, prende **tutte** le prenotazioni future di A (`spostabile`) e le scambia con tutte quelle future di B — chi è già in casa (non spostabile) resta fisicamente dov'è, non viene mai toccato. È sempre strutturalmente valido (stessa tipologia) **a patto che** i soggiorni futuri di A entrino tra gli ospiti già in casa di B e viceversa (verificato con `_hkFits`, altrimenti scartato — mai un suggerimento che creerebbe una doppia prenotazione).

Nato da un caso reale: l'utente indicava una data (evidenziata come "oggi" nel Piano) in cui un soggiorno breve aveva appena fatto check-in/check-out lo stesso giorno (turnover), seguito da un soggiorno più lungo che iniziava il giorno dopo — lo scambio che l'utente aveva in mente riguardava **l'intera sequenza futura della camera**, non il singolo soggiorno più lungo. Verificato con test sintetico: scambio valido quando i soggiorni futuri non si sovrappongono con chi è già in casa nell'altra camera, correttamente scartato quando lo farebbero.

**Non filtrato sul singolo giorno in focus**: `valuta()` scarta le mosse su un singolo soggiorno se non migliorano proprio il giorno selezionato (`hasFocus`) — corretto per sposta/scambia/catena/catena-multi, che riguardano un giorno alla volta. Ma `scambio-blocco` riguarda **tutta la settimana** per costruzione: filtrarlo sul giorno in focus lo scartava ingiustamente anche quando migliorava tutti gli altri giorni della vista settimanale. Per questo tipo di mossa il filtro per-giorno è disattivato (basta il guadagno complessivo sulla settimana, già verificato); `gFocus` viene comunque calcolato per l'ordinamento (a parità di guadagno, si preferisce comunque la mossa che aiuta anche il giorno che si sta guardando), solo non usato per scartarla. La ricerca stessa non è mai stata limitata a coppie di camere specifiche — cicla già su tutte le camere `ART` della stessa tipologia.

### "Ci sono altre possibilità?" — mostra alternative già calcolate, non ne cerca di nuove

`hkSuggestMoves()` calcola sempre **tutte** le mosse valide e migliorative, poi le taglia a `maxN` (default 3) — `out.totMosse` tiene il conteggio prima del taglio, `out.mosse` è la lista tagliata. Il bottone "Ci sono altre possibilità?" (visibile solo se `totMosse>mosse.length`, altrimenti non c'è nulla in più da mostrare) chiama `hkSuggMore()`, che alza `_hkSuggMoreN` di 5 e rirenderizza — non ricalcola l'algoritmo da capo con criteri diversi, semplicemente alza il tetto e mostra alternative che esistevano già. `_hkSuggMoreN` si azzera in `pianoNavRender()` solo quando il giorno selezionato **cambia davvero** (non ad ogni refresh del polling 30s sullo stesso giorno, altrimenti l'espansione sparirebbe da sola pochi secondi dopo averla aperta).

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

## Reception — Cassa (reception.html)

### Scopo

App standalone **desktop** (non mobile-first: usata sui PC di reception, non su smartphone) per la gestione di due registri distinti, mai unificati:

- **Fondo Cassa**: fondo fisso da €100, contato a ogni cambio turno, temporaneamente ridotto dai buoni spesa e riportato a 100 dall'amministrazione.
- **Incasso Contante**: cassa separata, consegnata a 3 fasce fisse (07:00 / 15:00 / 23:00), nessun legame col fondo cassa.

I receptionist operano solo su questa app (non accedono a Compass regolarmente — Compass resta un pannello di controllo per il QM). Sezione di menu dedicata **"Reception"** in Compass, voce **"Passaggi di Cassa"** (→ `view-reception`) — legge lo stesso KV in sola lettura + **modifica libera di qualunque voce** per il QM.

### Modello dati — registro di movimenti, mai un numero solo

Due chiavi KV, ciascuna un array JSON di movimenti:

| Chiave | Contenuto |
|--------|-----------|
| `qm_cassa_fondo` | `{id, ts, tipo:'conteggio'\|'buono'\|'ripristino', importo, importoIncasso, motivazione, persona, nota, edits:[]}` — `importo` = quota a carico del fondo cassa (letta da `fondoSaldo()`), `importoIncasso` = quota pagata dall'incasso giornaliero (non tocca il fondo), solo su `tipo:'buono'` |
| `qm_cassa_incasso` | `{id, ts, fascia:'07'\|'15'\|'23', importo, consegnaDa, consegnaA, nota, edits:[]}` |

Il saldo del fondo cassa **non è mai un campo modificabile a mano**: si calcola sempre a partire dall'**ultimo conteggio fisico registrato** (non sempre dai 100 ideali) + i buoni/ripristini avvenuti dopo (`fondoSaldo()` in `reception.html`, `_receptionFondoSaldo()` in `app.js` — stessa formula in entrambi i posti, tenerla allineata se cambia). Se non è mai stato fatto un conteggio, si parte dai 100 di default.

Il conteggio a inizio turno spesso non torna (es. 98€ invece di 100€) e **nessuno sa spiegare perché** — va comunque accettato: chi arriva in turno non può bloccarsi in attesa di una spiegazione. Ogni conteggio registra `atteso` (il saldo calcolato subito prima) e `differenza` (`importo - atteso`): la discrepanza resta sempre visibile nello storico, spiegata o no, ma **diventa la nuova base reale** su cui contare i buoni successivi — altrimenti il saldo calcolato diverge subito dalla cassa fisica (es. contati 98€, buono da 5€: il saldo dev'essere 93€, non 95€ come sarebbe partendo sempre dai 100 ideali).

### Fondo cassa = Contanti + Buoni spesa in essere (`fondoBreakdown()`)

Il fondo non è un solo numero: è **contanti fisici + buoni spesa non ancora rimborsati dall'amministrazione**. Un buono spesa è un cambio di forma del denaro (contante → voucher), non una perdita — quindi il **totale non deve scendere solo perché è stato emesso un buono legittimo** (es. fondo a 100€, buono da 20€ preso: contanti 80€, buoni 20€, totale resta 100€; solo un vero ammanco riscontrato al conteggio fa scendere il totale).

- `fondoSaldo()` (`reception.html`) / `_receptionFondoSaldo()` (`app.js`) restano **invariate**: calcolano solo i **contanti** (formula ad ancoraggio sull'ultimo conteggio, vedi sopra).
- `fondoBreakdown()` (`reception.html`) / `_receptionFondoBreakdown()` (`app.js` — stessa formula, tenerle allineate) calcolano separatamente i **buoni in essere**: ripartono dal campo `buoniSpesa` salvato sull'ultimo conteggio (0 se assente — conteggi vecchi restano "tutto contanti", nessuna migrazione dati necessaria), poi `+= buono.importo` e `-= ripristino.importo` per i movimenti successivi (un ripristino salda/rimborsa i buoni in essere). Ritornano `{contanti, buoni, saldo}` con `saldo = contanti + buoni` — è questo **saldo/totale**, non i soli contanti, il numero mostrato come "Fondo cassa attuale" e confrontato con `FONDO_TARGET` per il tag ✓/⚠.
- Nel modal "Conta e conferma fondo cassa": il campo si chiama **"Contanti (€)"** (non più "Importo contato"), sotto compare in sola lettura "Buoni spesa in essere (€)" (dal breakdown corrente) e poi il **"Totale fondo cassa"** = contanti inseriti + buoni correnti. `saveConta()` salva `contanti`, `buoniSpesa` (istantanea, non cambia col solo conteggio) e usa `importo:contanti` (il campo che `fondoSaldo()` legge come base) — **non** `contanti+buoniSpesa`: se `importo` includesse anche i buoni, la formula dei contanti si gonfierebbe permanentemente del valore dei buoni ancora in essere. `atteso`/`differenza` restano confrontati **solo sui contanti** (mai sul totale), altrimenti un buono legittimo genererebbe una differenza fittizia.
- **Home — vere kpi-card di Compass, non un totale grande**: scrivere solo il totale come cifra principale era fuorviante — un receptionist con 70€ fisici in cassa e 30€ di buoni in essere leggeva "€ 100,00" e lo interpretava come contante disponibile. Dopo due iterazioni (prima due numeri alla pari in un'unica card, poi questa versione) "Contanti" e "Buoni spesa" (etichette accorciate — non più "in cassa"/"in essere") sono ora **due vere kpi-card** — stesso componente di `style.css`/Overview (`.kpi-card`, bordo colorato 4px in cima, icona quadrata nell'angolo, numero leggero 30px), non un pannello inventato per questa pagina — più una terza card compatta per il Totale col tag di stato. In `reception.html` le classi `.kpi-card`/`.kpi-card-icon`/`.kpi-label`/`.kpi-value`/`.kpi-total-card` sono ridefinite nel `<style>` locale con i token navy/oro della app; lato Compass (`receptionRender()` in `app.js`) sono le **stesse identiche classi** di `style.css`, riusate direttamente (non duplicate).
- **Font dei bottoni azione**: `.btn` in `reception.html` usa `font-weight:500` (non 600 — più leggero) e `font-family:'Helvetica Neue',Helvetica,Arial,sans-serif` esplicito, lo stesso font che i bottoni reali di Compass (`.btn-primary`, `.wday-btn`, `.rev-tone-btn` in `style.css`) impostano esplicitamente invece di ereditare lo stack di sistema (`-apple-system`) usato dal resto della pagina.

### Buono pagato dall'incasso giornaliero, non dal fondo cassa

Un buono spesa **non è sempre** prelevato dal fondo cassa: spesso viene pagato con la cassa dell'incasso giornaliero (i contanti del servizio, non ancora consegnati), e in quel caso **non deve** ridurre il fondo cassa — quei soldi non ci sono mai passati.

Il modulo "Nuovo buono spesa" ha quindi **due campi importo**: "Importo prelevato da fondo cassa (€)" (`buono-importo`, invariato nell'id) e "Importo prelevato da incasso giornaliero (€)" (`buono-importo-incasso`, nuovo) — almeno uno dei due dev'essere > 0. Il movimento salvato ha `importo` (quota fondo cassa — **stesso campo di sempre**, letto da `fondoSaldo()`/`fondoBreakdown()` senza alcuna modifica a quelle formule) e `importoIncasso` (quota incasso, nuovo campo, ignorata dai calcoli del fondo). Un buono può quindi essere: tutto da fondo, tutto da incasso (`importo:0`), o misto.

Nello storico del fondo cassa, un buono con `importo<=0` mostra "—" invece di "-€0,00" (fuorviante), con una nota "(+ X da incasso)" quando `importoIncasso>0`. Nello stampato A4 l'importo totale resta `importo+importoIncasso`, con una riga extra "di cui da fondo cassa X · da incasso giornaliero Y" solo quando entrambe le quote sono valorizzate.

Nel tab Incasso Contante (sia `reception.html` sia il pannello Compass) un riquadro informativo elenca i buoni di oggi pagati dall'incasso (`renderIncassoBuoniInfo()` in `reception.html`, blocco equivalente dentro `receptionRender()` in `app.js`) — **derivato da `_fondo`/`_receptionFondo`, nessuna nuova chiave KV**: serve solo a spiegare perché il contante consegnato è più basso del previsto.

### "Sposta a incasso" — come si ripristina il fondo senza un ripristino amministrativo

Caso frequente: un buono già registrato a carico del fondo cassa viene in un secondo momento **riclassificato** come pagato dall'incasso giornaliero (es. l'amministrazione decide di far assorbire quella spesa dall'incasso), così il fondo cassa torna (in tutto o in parte) al suo valore senza che l'amministrazione debba fare un vero ripristino in contanti.

`spostaBuonoAIncasso(id)` in `reception.html` / `receptionSpostaBuonoIncasso(id)` in `app.js` (stessa logica): chiede quanto spostare (max = `importo` corrente del buono), sposta quella cifra da `importo` a `importoIncasso` sullo stesso movimento (non crea un nuovo movimento), e registra un `edits[]` con vecchio/nuovo valore di entrambi i campi e motivo — mai una correzione silenziosa. Poiché `fondoSaldo()`/`fondoBreakdown()` leggono solo `m.importo` per i buoni, ridurre `importo` fa automaticamente risalire i "contanti" stimati e scendere i "buoni in essere" della stessa cifra, senza toccare il totale. Link "sposta a incasso" visibile solo sulle righe `tipo:'buono'` con `importo>0` (niente da spostare altrimenti).

### Modifica con storico, non sovrascrittura silenziosa

Ogni voce è **sempre modificabile** (dalla reception i movimenti recenti, da Compass qualsiasi voce), ma ogni correzione aggiunge una riga a `m.edits` (`{ts, persona, campo, vecchio, nuovo, motivo}`) invece di sostituire il valore senza lasciare traccia — "deve rimanere traccia di tutto" anche quando si corregge un errore di battitura. La tabella mostra `(corretto N×)` accanto a ogni voce già modificata.

### App reception (`reception.html`)

**Allineamento ai token reali di Compass (`style.css`)**: alcuni dettagli visivi introdotti durante lo sviluppo (badge circolari con anello oro, numeri in grassetto, raggi larghi 12-14px) erano invenzioni di sessione, non il linguaggio visivo effettivo del resto della dashboard. Corretti per coerenza con `.panel`/`.kpi-card`/`.btn-primary` in `style.css`:
- Card con `border-top:4px solid var(--gold)` (4px, non un bordo sottile uniforme) — firma di ogni `.panel`/`.kpi-card` in Compass.
- Numero grande (fondo cassa, incasso) in `font-weight:300` (non 800), come `.kpi-value` — le cifre pesanti non fanno parte del linguaggio Compass.
- Raggi stretti: 8px per card/tabelle/modal, 6px per bottoni e campi input (`--r:8px`, prima 12px).
- Bottoni con hover a sollevamento + ombra tinta navy (`transform:translateY(-2px)`, come `.btn-primary:hover` reale), non più statici.
- Badge azione (`.act-btn`) e badge Tipo (`.tipo-badge`) sono quadrati arrotondati (7px) con sfondo tinto e icona dello stesso colore (`var(--navy-bg)`/`var(--navy)`), non più cerchi pieni con anello oro — stessa coppia sfondo-tinto/icona-colorata di `.kpi-card-icon` nel resto della dashboard. Sui bottoni azione principali (`.btn-badge`), il badge dei bottoni secondari (bianchi) segue la stessa logica; quello dei bottoni primari (navy pieno) resta un quadrato bianco-translucido con icona bianca, perché lì lo sfondo è già navy.

- Due tab: **Fondo Cassa** (bottoni "Conta e conferma fondo cassa" / "Nuovo buono spesa": importo, **motivazione** in testo libero — obbligatoria, sopra "Chi preleva" nel modulo — poi persona; niente più causale a chip, tolta su richiesta) e **Incasso Contante** (bottone "Conta e consegna incasso" con fascia a chip 07/15/23).
- Il movimento `tipo:'buono'` ha campo `motivazione` (obbligatorio), non più `causale`/`nota`. `renderFondo()`/`receptionRender()` (Compass) leggono `m.motivazione||m.nota` per compatibilità con eventuali voci salvate prima di questo cambio.

### Stampa A4 del buono spesa

Ogni riga `tipo:'buono'` nello storico ha un link **"stampa"** (accanto a "correggi", sia in `reception.html` sia nel pannello Compass) — `printBuono(id)` / `receptionPrintBuono(id)`, stesso template duplicato nei due file (nessuna condivisione di codice tra standalone app e `app.js`, pattern consolidato). Genera un documento A4 **volutamente semplice**: solo testo nero e sottolineature, niente logo né sfondi pieni — va all'amministrazione, non serve una veste elaborata, e consuma meno toner.

Il modulo "Nuovo buono spesa" ha **un solo bottone**, "🖨️ Salva e stampa" — il "Salva" semplice (senza stampa) è stato tolto perché non serve: `saveBuono()` salva il movimento e chiama sempre `printBuono(m.id)` sul nuovo id, senza dover poi cercare la riga nello storico.

### Icone bottoni azione — badge Compass (navy/gold)

I tre bottoni principali ("Conta e conferma fondo cassa" / "Nuovo buono spesa" / "Conta e consegna incasso") usano un badge circolare `.btn-badge` (cerchio navy `var(--navy)`, anello gold `var(--gold)`, 26px) al posto dell'emoji — stesso linguaggio visivo del logo bussola e delle icone del Pannello App. Scelte dopo un'esplorazione con varianti multiple (`euro_icons.html`, `reception_icons.html` nello scratchpad di sessione): glifo € pieno/solido per "Conta e conferma fondo cassa", icona modulo/foglio per "Nuovo buono spesa", icona banconota per "Conta e consegna incasso".

### Icone azione nello storico movimenti — pulsanti circolari, non link testuali

I link testuali ("stampa"/"sposta a incasso"/"correggi") impilati in una colonna stretta si accatastavano su più righe, illeggibili. Sostituiti con pulsanti circolari `.act-btn` (28px, sfondo `var(--navy-bg)`, icona stroke `var(--navy)`) affiancati in `.act-row` — stesse icone SVG di `ICON_STAMPA`/`ICON_SPOSTA`/`ICON_CORREGGI` in `reception.html`. Lato Compass (`app.js`), stesso pattern ma con i colori del design system principale (`var(--accent)`/`var(--accent-bg)`, non `--navy`/`--navy-bg` che lì non esistono — nota: `var(--accent)` in `style.css` è comunque lo stesso navy `#1c3a5e`, quindi visivamente identico) tramite l'helper `_receptionActBtn(icon,tip,onclick)` e le costanti `RECEPTION_ICON_*`.

**Didascalia al passaggio del mouse — bolla stile Compass, non tooltip nativo del browser.** Il `title` HTML nativo ha uno stile di sistema non personalizzabile: sostituito con l'attributo `data-tip` letto da CSS (`content:attr(data-tip)` su `::after`, freccetta su `::before`), bolla navy/accent con testo bianco che appare in dissolvenza sopra il pulsante. In `reception.html` è la regola `.act-btn::after`/`.act-btn::before` nel `<style>` inline; lato Compass è la classe `.rc-act-btn` in `style.css` (v239+, cache buster incrementato) — stessa tecnica, nessuna dipendenza da libreria esterna.

### Formato euro — spazio tra simbolo e cifra

`fmtEuro()` (`reception.html`) / `_receptionFmtEuro()` (`app.js`) restituiscono `"€ 98,00"` (spazio dopo il simbolo), non più `"€98,00"` — vale ovunque nell'app perché tutte le cifre passano da questa unica funzione (storico, stato, stampa A4).

### Icona "Elimina" nello storico movimenti

Quarta icona accanto a stampa/sposta/correggi: `cancellaMovimento(key,id)` in `reception.html` / `receptionDeleteFondo(id)`+`receptionDeleteIncasso(id)` in `app.js`. A differenza di "correggi" (che aggiunge sempre un `edits[]`, mai sovrascrittura silenziosa), questa è una **rimozione definitiva** dell'intero movimento dall'array — riservata a voci inserite per errore (doppioni, prove), con conferma `confirm()` esplicita prima di procedere. Non lascia traccia nello storico (a differenza di ogni altra modifica in questa app) — usarla con cautela, non per correggere un importo sbagliato (per quello c'è "correggi").

### Badge Tipo nello storico — niente più emoji

La colonna "Tipo" mostrava emoji (🧮/🧾/🔄) davanti al nome del movimento. Sostituite con lo stesso badge circolare navy/gold usato sui bottoni azione, con l'icona SVG coerente: euro pieno per "Conteggio" (stessa icona di "Conta e conferma fondo cassa"), modulo/foglio per "Buono spesa" (stessa icona di "Nuovo buono spesa"), frecce cicliche per "Ripristino". `TIPO_ICON`/`TIPO_LBL` in `reception.html` (classe `.tipo-badge`/`.tipo-cell`); `RECEPTION_TIPO_ICON`/`_receptionTipoCell()` in `app.js` (badge inline con `var(--accent)`, stesso pattern). `RECEPTION_TIPO_LBL` resta testo puro (serve anche dentro un `prompt()` in `receptionEditFondo()`, che non può contenere HTML).

Campi: data/ora dal movimento, importo, **Consegna (amministrativo)** = `m.persona` (chi ha prelevato in app), **Riceve** = sempre lasciato in bianco (l'app non cattura chi riceve materialmente il denaro), motivazione, due righe firma in fondo (consegna/riceve). Apertura con `window.open('','_blank')` + `document.write()` + `print()` dopo 400ms, stesso pattern già usato altrove nel dashboard (es. `cmPrintBottle()`).
- Stato sempre visibile in alto: saldo fondo cassa con tag "✓ in regola" / "mancano X€"; prossima consegna incasso con tag "✓ consegnata" / "⚠ non ancora consegnata" — pensato per restare aperta su schermo a reception, non per essere cercata quando serve.
- `incassoStatus()` determina la fascia "dovuta" dall'ora corrente (07-15 → dovuta 07, 15-23 → dovuta 15, 23-07 → dovuta 23) e controlla se esiste già una consegna di quella fascia per la data odierna.
- **"Aggiungi al fondo cassa"** (`openRipristinoModal()`/`saveRipristino()`): permette anche al receptionist di registrare un'aggiunta al fondo (es. ripristino ricevuto dall'amministrazione, arrotondamento) — stesso `tipo:'ripristino'` già usato da `fondoSaldo()`/`fondoBreakdown()`, nessuna nuova formula. Prima esisteva solo su Compass (`receptionAddRipristino()`, ancora presente e usata anche lì) — ora è disponibile su entrambi i lati.
- `STAFF` è una copia hardcoded di `DEPTS.fo.members` **ridotta**: esclude Imparato G., Barbosa D., Maddaloni M., D'Andrea F., Extra Night, Extra Angelica, Extra Benedetta (non gestiscono la cassa) — a differenza di `ROOMS` in `controllo-mattino.html`, qui l'elenco NON coincide col reparto FO completo di `app.js`. Tenerlo allineato manualmente solo per le persone che maneggiano davvero la cassa, non ad ogni cambio dello staff FO.
- Il campo "Chi conta" nel modal "Conta e conferma fondo cassa" si chiama **"Operatore di reception"** (non più "Chi conta").
- Stessa schermata di manutenzione delle altre app standalone (`qm_app_status`, chiave `cassa` — non ancora agganciata al Pannello App/toggle on-off: se serve, aggiungere `'cassa'` a `MINIAPP_KEYS` in `app.js` e una card nella vista Pannello App, stesso schema delle altre 5 app).

### Lato Compass (`app.js` §§ RECEPTION — CASSA, `index.html` `#view-reception`)

`receptionLoad()` (chiamata da `setView('reception',...)`) legge entrambe le chiavi KV e chiama `receptionRender()`. Modifica via `receptionEditFondo(id)` / `receptionEditIncasso(id)` — usano `prompt()` per nuovo importo e motivo (stesso pattern di modifica rapida già usato altrove nel dashboard, es. `editShift`), non un modale dedicato.

---

## Resi Biancheria — Fornitore Raimondo (view `resi-biancheria`)

### Scopo e confini

Traccia digitale della **distinta cartacea** che le housekeeper compilano ogni giorno per la biancheria macchiata/difettata da rendere al fornitore Raimondo. Deliberatamente **solo lato Compass e solo per il QM**: le HKP continuano a scrivere sul modulo cartaceo come da procedura, il QM trascrive qui e da qui genera la distinta riepilogativa A4 da far firmare a Raimondo. Nessuna app mobile per le cameriere, nessun accesso per la ditta esterna di Art Resort.

**Due strutture** (`RESI_HOTELS`): SoulArt Hotel (`sa`) e Boutique Hotel Piazza Carità (`bh`), selezionabili a linguette. **Art Resort resta fuori di proposito** — fa capo al Sig. Maddaloni, non al QM, e la sua ditta di pulizie è esterna. I due sacchi sono fisicamente distinti e si consegnano separatamente, quindi periodo aperto, totali, avviso e distinta sono **sempre di una struttura sola**.

### Modello dati (chiave KV `qm_resi_biancheria`)

```js
{
  righe:  [{id, ts, hotel:'sa'|'bh', data:'dd/MM/yyyy', tipologia, qta, motivo, hk, ritiroId, edits:[]}],
  ritiri: [{id, ts, hotel, dal, al, sacchi, totPezzi, dataRitiro, firmato}],
  tipologie: [...]   // null = usa RESI_TIPOLOGIE_DEFAULT (condivise tra le strutture)
}
```

Righe e ritiri salvati **prima** dell'aggiunta del Boutique non hanno il campo `hotel`: `_resiH()` li fa valere come SoulArt (era l'unica struttura gestita), così i dati già inseriti restano dove sono invece di sparire dal filtro.

**Periodo aperto = righe con `ritiroId:null`.** Non esiste una "quindicina" calcolata a calendario: le righe si accumulano nel periodo aperto finché non si registra un ritiro, che le chiude tutte assegnando il proprio id — rispecchia la procedura reale (il ritiro avviene "ogni 15 giorni" ma nella pratica quando passa Raimondo). Il periodo `dal`/`al` del ritiro è ricavato dalle **date minime/massime delle righe**, non dalla data del ritiro. `resiDelRitiro()` annulla un ritiro rimettendo le sue righe nel periodo aperto.

Le correzioni di quantità (`resiEditQta`) aggiungono sempre una riga a `edits[]` con vecchio/nuovo valore e motivo — stesso principio della cassa reception, mai sovrascrittura silenziosa.

### Avviso ritiro (`RESI_GIORNI_RITIRO = 15`)

`_resiGiorniDaUltimoRitiro(hotel)` conta i giorni **dall'ultimo ritiro** della struttura, o — se non ce n'è mai stato uno — **dal reso più vecchio ancora aperto**. Oltre la soglia compare un banner ambra sopra il form.

Ritorna `null` (nessun avviso) quando **non ci sono righe aperte**: senza resi in attesa non c'è nulla da sollecitare, e un avviso perenne diventerebbe rumore da ignorare. Sulla linguetta della struttura **non** selezionata compare un pallino ambra se anche lì il periodo è da chiudere — altrimenti un ritardo sull'altra struttura resterebbe invisibile finché non ci si passa sopra.

### Tipologie e motivi

`RESI_TIPOLOGIE_DEFAULT` (13 voci standard: lenzuola, federe, copripiumino, asciugamani, ecc.) è modificabile dall'interfaccia ("Modifica elenco tipologie" → salva in `_resi.tipologie`), così i totali per tipologia restano coerenti invece di dipendere da come ognuno scrive la stessa cosa. `RESI_MOTIVI` è invece fisso nel codice (Macchiata, Strappata, Usurata, Ingiallita, Bruciata, Scolorita, Altro).

### Stampa A4 (`resiPrintDistinta(ritiroId)`)

Replica il modulo cartaceo originale: intestazione struttura + periodo + totale pezzi, riquadro con le 3 note della procedura, tabella `Data | Tipologia | Quantità | Motivo | Firma HK`, blocco "Ritiro Fornitore Raimondo" con n° sacchi/totale/data e riga firma, blocco "Consegna distinta firmata" al Sig. Presta. Senza argomento stampa il **periodo aperto** (righe da consegnare); con un `ritiroId` **ristampa** un periodo già consegnato. Stesso pattern `window.open` + `document.write` + `print()` usato altrove nel dashboard.

L'intestazione riporta la struttura **del ritiro che si sta ristampando** (`rit.hotel`), non quella selezionata al momento nella vista: ristampando un vecchio periodo del Boutique mentre si è sulla linguetta SoulArt, la distinta deve restare del Boutique.

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
- Chiamata da `pianoNavRender()` (quindi ad ogni cambio giorno/ricarica Piano) e già dentro il polling 30s esistente (che richiama `pianoNavRender(pianoNavIdx)`) — si aggiorna da sola mentre il giro è in corso, senza bisogno di ricaricare la pagina.

### Bottiglia animata (Overview → box Culligan)

`renderOvCulliganBox()` in `app.js` disegna una sagoma SVG di bottiglia Culligan reale (`cmBottlePath`, `viewBox="0 0 64 142"`, logo mascherato da `img/logo-culligan.png`) che si riempie in base a `visited / camere occupate del giorno` — **camere visitate durante il giro**, non un conteggio esatto di bottiglie fisicamente sostituite (una camera "vista" conta anche se non aveva bisogno di bottiglia nuova). Al caricamento parte vuota e sale fino al livello reale (`cmFillUp`), poi la superficie "respira" (`cmWave`) — animazioni in `style.css`.

**Bollicine nel liquido**: generate in `app.js` (array `cmBubbles`, 16 cerchi con posizione/durata/ritardo randomizzati ad ogni render) e clippate all'**intersezione** tra la sagoma della bottiglia (`cmBottleClip`) e il rettangolo del riempimento attuale (`cmLiquidClip`, stessi `fillY`/`fillH` del liquido) — così restano sempre dentro la zona di liquido vera, anche quando il livello sale/scende col progredire del giro (non clippate solo alla sagoma intera, altrimenti apparirebbero anche sopra il livello del liquido).

Il punto di nascita (`cy`) è vicino al **fondo** del liquido (`cmBottomY - spawnBand`, non distribuito su tutta l'altezza) e ogni bolla risale quasi fino alla superficie (`--cm-brise`, variabile CSS per bolla) — prima `cy` era campionato uniformemente su tutta la colonna di liquido, quindi circa metà delle bolle nascevano già a metà altezza invece che dal basso, un difetto visibile confrontato con l'artefatto di riferimento (dove tutte nascono vicino al fondo del frame). Animazione `cmBubbleRise` in `style.css`, classe `.cm-bubble`, rispetta `prefers-reduced-motion`. Nessun bubble generato se `fillH<=4` (bottiglia praticamente vuota).

### Annulla — ritiro e riconsegna

**Schermata camera (ritiro, `s-room`)**: ogni tap (bottiglia, checklist, libera, DND) scrive **subito** in memoria su `_state[room]`, non solo premendo "Salva camera" — prima il tasto "‹" chiamava `goHome()` direttamente, senza annullare nulla: le modifiche restavano comunque in memoria e potevano finire salvate lo stesso alla prossima `_persist()` (es. salvando un'altra camera, dato che persiste l'intero `_state`). Ora `openRoom(room)` fotografa lo stato della camera (`_roomSnapshot`/`_roomSnapshotRoom`) **solo quando si entra in una camera diversa** da quella già fotografata (non ad ogni ri-render interno che le funzioni di tap richiamano per aggiornare la vista — altrimenti la fotografia si aggiornerebbe ad ogni tap invece di restare quella originale). Il tasto "‹" chiama `cancelRoom()`, che ripristina `_state[room]` alla fotografia prima di tornare alla home. `saveRoom()` svuota la fotografia dopo aver salvato.

**Foglio pronta/non pronta (riconsegna)**: una volta scelto "pronta" o "non pronta" (`chooseReady()`), prima non si poteva tornare a "da confermare" — solo passare da un'opzione all'altra. Aggiunto un link "Annulla" sotto i due bottoni grandi (non un terzo bottone alla pari: i due bersagli principali restano grandi, si usa camminando) — `cancelReadySheet(room)` chiude il foglio senza scegliere, e se una scelta era già stata fatta la annulla (`pronta:null`, `consegnata:false`).

### Dashboard (`cmLoad()`) — KV come source of truth

Legge sempre KV prima (fonte dei dati scritti da smartphone), poi fallback localStorage.

### QC Settimanale

Conta le camere **effettivamente controllate** (condizione: `pronta===true`) per le 7 chiavi della settimana corrente da KV — non le bottiglie sostituite (`bottiglia==='consumata'`, usata invece dal contatore "sostituzioni" nel box Culligan di Overview, metrica diversa). Solo le camere confermate "pronta" nel foglio di riconsegna sono state davvero ispezionate: quando non è pronta si lascia solo la bottiglia piena senza controllare nulla, quindi non conta. Stessa condizione sia nel totale (`cmLoadWeeklyQC`) sia nel registro cronologico per giorno dentro `cmRenderWeeklyQC`.

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

### Click su un giorno del calendario — lista piatta, non raggruppata per mese

`turniPrefRender()` filtra correttamente `items` per `_tpCalDay` (giorno **richiesto**, `r.giornoRichiesto`), ma il rendering della lista raggruppava comunque i risultati per **mese di invio** della richiesta (`r.ts`) — due richieste per lo stesso giorno ma inviate in mesi diversi finivano sotto etichette di mese diverse, invece di comparire subito insieme. Quando `_tpCalDay` è valorizzato, la lista è ora **piatta** (un solo titolo "Richieste per il gg/MM/yyyy", tutte le righe sotto, nessun raggruppamento) — il raggruppamento per mese resta solo quando non è selezionato nessun giorno (vista di navigazione libera di tutte le richieste).

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
