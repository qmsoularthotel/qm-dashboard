# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Strutture gestite

Il gruppo comprende 7 strutture alberghiere a Napoli:
**SoulArt Hotel**, **Boutique**, **San Liborio**, **Principe**, **Mastrangelo**, **Art Resort**, **Santa Brigida**.

Codici hotel: `sa` (SoulArt), `bh` (Boutique), `sl` (San Liborio), `pr` (Principe), `ms` (Mastrangelo), `ar` (Art Resort), `sb` (Santa Brigida).

---

## Risposte alle recensioni Booking.com

- **Firma in italiano:** `Paolo P. - Quality Manager`
- **Firma in inglese:** `Best regards. Paolo P. - Quality Manager`
- Non ripetere le parole esatte usate dal recensore.
- Includere sempre un incentivo alla prenotazione futura.

---

## Project Overview

**QM Dashboard** è una SPA vanilla JS per la gestione qualità di un gruppo alberghiero multi-struttura a Napoli. Il codice è diviso in:

- **`index.html`** — Layout HTML, sidebar nav, tutte le view (div#view-*), CSS inline, tag `<script src="app.js?v=...">` in fondo
- **`app.js`** — Tutta la logica JS (~5200 linee, ~31 sezioni §§)
- **`housekeeper.html`** — App separata per la governante (HK checklist camere)
- **`breakfast.html`** — App separata per il breakfast manager
- **`inventory.html`** — App separata per l'inventario detersivi (mobile, scanner barcode)

Non esiste build system, package manager o step di compilazione.

### Versionamento

Il numero di versione va incrementato:
1. Nel `<title>` tag di `index.html` (es. `v186` → `v187`)
2. Nel cache buster `<script src="app.js?v=317-YYYYMMDD">` in fondo a `index.html`

Ad ogni modifica ad `app.js`, **aggiornare il cache buster** altrimenti il browser userà la versione vecchia.

---

## Development

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
- **Model**: `claude-sonnet-4-20250514`
- **Usi**: parsing PDF/immagini di turni, arrivi, documenti pasto → JSON strutturato
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

I numeri di camera determinano la struttura di appartenenza:
- `Art` prefix → Art Resort
- `200–299` → Boutique Hotel

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
| 1 | COSTANTI & CONFIG | `DEPTS`, `WEEK`, `IS_REST`, `IS_ABSENT`, costanti globali |
| 15 | TURNO — ACCORDIONI UC & UPLOAD BOX | Toggle accordioni turni, upload box UI |
| 87 | TURNO — PARSER TSV/PDF | `parseTurniTSV()`, `handleTurniFile()` |
| 257 | TURNO — RENDER & NAVIGAZIONE | `renderDay()`, `buildWeekNav()`, `loadWeekData()` |
| 349 | NAVIGAZIONE VISTE | `setView()`, `pageTitles`, toggle gruppi nav |
| 357 | HKP OPERATIVE — Google Sheets | `hkpLoad()`, `hkpRenderAll()`, `hkpSave()`, `hkpRestore()` |
| 525 | MINI APP — RENDER | `miniappRenderBkf()`, `miniappRenderPiano()` |
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
| 2235 | RECENSIONI — LOGICA | `revParseCsv()`, `revRenderList()`, `revGenerateReply()`, filtri |
| 2995 | REPORT PASTI — BKF | `bkfParseText()`, `renderBkfData()`, `updateKpiFromBkf()` |
| 3112 | HOUSEKEEPING — HKP UPLOAD & DATI | Upload HKP, parsing dati, reset slot |
| 3191 | PIANO SETTIMANA — UPLOAD & PARSER | `parsePianoItems()` (~line 3220), upload e parsing piano settimanale |
| 3350 | BKF — GRUPPI, NOTE & GRAFICI | Gruppi breakfast, note, grafici |
| 3603 | REGISTRATION CARDS — RC | `rcParseGuests()` (~line 3650), `rcRenderCards()`, stampa |
| 3668 | MODAL — CATEGORIE TREND | Modal trend categorie, calcolo score pesato |
| 3767 | ARRIVI GIORNALIERI — UPLOAD & RENDER | `handleArriviFile()`, `renderArriviModal()`, `fixArriviStruttura()` |
| ~4634 | INVENTARIO DETERSIVI | `invCalcStock()`, `invRender()`, `invRenderStock()`, `invRenderMoves()`, `invRenderAnalysis()`, `invEditQty()`, `invPrintStock()` |
| ~5090 | PREFERENZE TURNI | `turniPrefLoad()`, `turniPrefRender()`, `turniPrefMarkAllSeen()`, `_tpFmtDate()` |

---

## Global Variables & Constants

| Nome | Tipo | Contenuto |
|------|------|-----------|
| `DEPTS` | const object | Reparti: `fo` (Front Office), `hk` (Housekeeping), `bkf` (Breakfast), `mt` (Maintenance) — con `label`, `cls`, `members[]` |
| `REV_HOTELS` | const object | Struttura dati recensioni per hotel (sa, bh, sl, pr, ms, ar, sb) |
| `TASK_STATE` | let object | Stato centralizzato di tutti i task checklist |
| `HKP_DATA` | let object | Dati HKP operative: `{sa: null, ar: null}` |
| `HKP_TAB` | let object | Tab attivo HKP: `{sa: 'riepilogo', ar: 'riepilogo'}` |
| `HKP_URLS` | const object | Endpoint Google Apps Script per HKP (sa, ar) |
| `DVR_DATA` | let object | Dati DVR per società: `{geriart: {...}, ...}` |
| `IS_REST` | const fn | Ritorna `true` se il valore turno è vuoto/null (non in programma) |
| `IS_ABSENT` | const fn | Ritorna `true` SOLO per valori espliciti: `R`, `RIPOSO`, `OFF`, `FERIE` — usare per contare assenze reali |
| `WEEK` | const object | Turno settimana fallback hardcoded (7 giorni) |
| `weekData` | let | Dati turno settimana parsati |
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
| `https://anthropic-proxy.qm-d82.workers.dev/v1/messages` | Claude API proxy (AI analysis PDF/immagini) |
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
| `view-miniapp` | Mini app preview |
| `view-inventario` | Inventario detersivi (stock + movimenti + analisi) |
| `view-turni-pref` | Preferenze turni staff (da Google Forms) |

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

**Logica colonne nel range A32:AG39:** identica a SoulArt (nome idx 1, giorno d → idx d+1).

### Struttura Dati HKP (JSON restituito dall'Apps Script)

```js
{
  cameriere: [
    {
      nome: string,
      camere_tot: number,
      camere_per_giorno: { "1": 4, "2": 6, ... }  // chiavi = numero giorno del mese
    }
  ],
  tot_mese: number,
  tot_duplex: number,
  totale_per_giorno: { "1": 31, "2": 28, ... },
  mese: string,           // es. "aprile 2026" — da C2 del foglio
  giorni_elaborati: number,
  giorni_mese: number
}
```

### Calcolo giorni con dati (client-side)

`giorni_elaborati` dall'Apps Script può essere impreciso. Il client calcola in autonomia:

```js
const _daysSet = new Set();
(data.cameriere || []).forEach(c =>
  Object.entries(c.camere_per_giorno || {}).forEach(([d, v]) => {
    if (v > 0) _daysSet.add(d);
  })
);
const giorniConDati = _daysSet.size || data.giorni_elaborati || 1;
```

### Funzioni HKP

| Funzione | Scopo |
|----------|-------|
| `hkpLoad(p)` | Fetch dati da Google Sheets (p = 'sa' o 'ar') |
| `hkpRenderAll(p)` | Render completo view HKP (KPI + content) |
| `hkpRenderContent(p)` | Render tab corrente (riepilogo o dettaglio) |
| `hkpTab(p, tab, btn)` | Cambia tab attivo |
| `hkpSave(p)` | Salva in localStorage + KV |
| `hkpRestore()` | Ripristina da localStorage |
| `hkpSelectDay(p, day)` | Switch vista per giorno |

### Tab Disponibili

- **Riepilogo mensile**: classifica cameriere (camere totali) + barra duplex separata + sparkline trend giornaliero
  - Nomi non troncati: `width:160px; flex-shrink:0` (senza `overflow:hidden`)
  - Righe con nome `/duplex/i` filtrate dalla lista cameriere (mostrate solo nella barra duplex)
- **Per giorno**: dettaglio camere per ogni giorno del mese, con totale camere per cameriera

### Apps Script Template

Quando l'utente ridistribuisce lo script, cambia solo `HKP_URLS[p]` in app.js e aggiorna il cache buster. **Non modificare la logica client.**

Template Apps Script generico (adattare i range):

```javascript
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const hkpRows = sheet.getRange('A38:AG47').getValues(); // adattare
  const cameriere = [], totale_per_giorno = {};
  let tot_mese = 0;
  for (let i = 0; i < hkpRows.length; i++) {
    const nome = String(hkpRows[i][1] || '').trim(); // col B = idx 1
    if (!nome) continue;
    const camere_per_giorno = {};
    let camere_tot = 0;
    for (let d = 1; d <= 31; d++) {
      const v = Number(hkpRows[i][d + 1]) || 0; // col C = idx 2 = d+1 quando d=1
      if (v > 0) {
        camere_per_giorno[d] = v;
        totale_per_giorno[d] = (totale_per_giorno[d] || 0) + v;
        camere_tot += v;
      }
    }
    cameriere.push({ nome, camere_tot, camere_per_giorno });
    tot_mese += camere_tot;
  }
  const giorni_elaborati = Object.keys(totale_per_giorno).length;
  const duplexData = sheet.getRange('C48:AG57').getValues(); // adattare
  let tot_duplex = 0;
  duplexData.forEach(row => row.forEach(v => { tot_duplex += Number(v) || 0; }));
  const firstDate = sheet.getRange('C2').getValue();
  const mese = firstDate instanceof Date
    ? firstDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    : String(firstDate);
  return ContentService
    .createTextOutput(JSON.stringify({ cameriere, tot_mese, tot_duplex,
      totale_per_giorno, mese, giorni_elaborati, giorni_mese: 30 }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## DVR — Documento Valutazione Rischi

### Scopo

Gestione dipendenti e documenti DVR per ogni società del gruppo. Dati persistiti in localStorage + KV con chiave `qm_dvr`.

### Storage

```js
// Salvataggio
function dvrSave() {
  const json = JSON.stringify(DVR_DATA);
  try { localStorage.setItem('qm_dvr', json); } catch(e) {}
  kvSet('qm_dvr', json).catch(() => {});  // chiave con prefisso qm_
}

// syncFromCloud deve chiamare dvrRestore() dopo aver scritto il localStorage
if (k === 'dvr') {
  try { dvrRestore(); if (view?.classList.contains('active')) dvrRender(); } catch(e) {}
}
```

### Lista Dipendenti — Ordinamento

L'elenco dei dipendenti è ordinato con **pin fisso**:
1. **Corduas Vincenzo** — sempre primo
2. **Presta Pierpaolo** — sempre secondo
3. Contratti a termine ordinati per data scadenza (più vicina prima)
4. Tutti gli altri in ordine alfabetico

```js
const pinRank = n => { if (/corduas/i.test(n)) return 0; if (/presta/i.test(n)) return 1; return 2; };
const isTermine = c => c && c !== 'Tempo indeterminato';
```

### Lista Dipendenti — Layout Riga

Ogni riga mostra:
1. **Nome** + badge tipo contratto
2. **Mansione/qualifica** (riga separata)
3. **Date** sotto la qualifica:
   - Tutti i contratti: `dal gg/mm/aaaa`
   - Tempo determinato, part-time, tirocinio, apprendistato: `dal gg/mm/aaaa → scad. gg/mm/aaaa` (con colore)
4. **Note** (se presenti)

### Scadenze Contratto — Colori

| Stato | Colore | Stile riga |
|-------|--------|-----------|
| Scaduto (`daysLeft < 0`) | `var(--red)` + bg rosso | `border-left: 3px solid var(--red)` |
| In scadenza (`0 ≤ daysLeft ≤ 30`) | `var(--amber)` + etichetta `⏳ scad. gg/mm (Ngg)` | `border-left: 3px solid var(--amber)` |
| Ok (`daysLeft > 30`) | `var(--text-dim)` | nessun bordo |

### Tipi Contratto con Scadenza

I seguenti tipi richiedono e mostrano la data di scadenza:
- Tempo determinato
- Tempo determinato part-time
- Part-time
- Tirocinio
- Apprendistato

---

## Overview — Topbar KPI & Pannello Occupazione

### Topbar KPI Chips

4 chip sempre visibili nel topbar quando si è nella view `overview` (nascosti nelle altre viste):

```html
<div id="topbar-kpis">
  <div class="topbar-kpi-chip" id="kpi-arrivi">...</div>
  <div class="topbar-kpi-chip" id="kpi-partenze">...</div>
  <div class="topbar-kpi-chip" id="kpi-fermate">...</div>
  <div class="topbar-kpi-chip" id="kpi-occ-val">...</div>
</div>
```

`setView()` gestisce la visibilità:
```js
const kpis = document.getElementById('topbar-kpis');
if (kpis) kpis.style.display = id === 'overview' ? 'flex' : 'none';
```

IIFE all'avvio garantisce che siano visibili al caricamento:
```js
(function(){ const k=document.getElementById('topbar-kpis'); if(k) k.style.display='flex'; })();
```

### Pannello Occupazione

Cliccando il chip occupazione si apre `#occ-panel`, un div full-width posizionato tra il topbar e `.content`. Contiene un grafico a barre HTML (non SVG) con:
- Barre orizzontali per struttura
- Percentuale `%` esterna alla barra (span separato con colore)
- Colori: verde `≥80%`, ambra `50-79%`, rosso `<50%`

---

## Staff Attuale (DEPTS)

### Front Office (`fo`)
Aggiornare in `app.js` sezione `§§ COSTANTI & CONFIG`.

### Housekeeping (`hk`)
Membri attuali includono:
- Extra Giuditta (aggiunta)
- **Extra Nunzia** (aggiunta nella sessione corrente)
- Extra Vincenza (rimossa)

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

## Funzioni Chiave per Sezione

### Turni

| Funzione | Linea approx. | Scopo |
|----------|--------------|-------|
| `parseTurniTSV(text)` | §87 | Parse TSV/PDF → dati settimana |
| `handleTurniFile(file)` | §87 | Upload handler → base64 → Claude API |
| `loadWeekData(data)` | §257 | Carica turni in memoria |
| `renderDay(idx)` | §257 | Render layout staff giorno singolo |
| `buildWeekNav()` | §257 | Costruisce bottoni nav settimana |
| `getShift(shifts, name)` | §257 | Lookup turno persona/giorno |
| `editShift(dayIdx, nome)` | §257 | Modifica turno individuale |
| `resetTurni()` | §257 | Azzera tutti i turni |

### Checklist

| Funzione | Linea approx. | Scopo |
|----------|--------------|-------|
| `buildTaskItem(t, listId)` | §664 | Crea elemento DOM task |
| `renderTaskList(listId, ...)` | §664 | Render lista task |
| `syncTaskState(key, done, time)` | §807 | Aggiorna stato task (localStorage + KV) |
| `addCustomTask(inp)` | §807 | Aggiunge task custom |
| `toggleCheck(li, listId)` | §1046 | Toggle completamento task |
| `removeCustomTask(text, btn)` | §807 | Elimina task custom |
| `restoreChecklistState()` | §807 | Ripristino da localStorage |

### Storage & Sync

| Funzione | Linea approx. | Scopo |
|----------|--------------|-------|
| `kvSet(key, value, retries)` | §696 | Set valore KV cloud con retry |
| `kvGet(key)` | §696 | Get valore KV |
| `syncFromCloud()` | §696 | Fetch tutti i keys da KV, aggiorna localStorage |
| `setSyncStatus(state)` | §696 | Aggiorna indicatore punto sync |

### Overview

| Funzione | Linea approx. | Scopo |
|----------|--------------|-------|
| `refreshOverviewForDate(date)` | §1351 | Render principale overview |
| `renderArriviData()` | §1351 | Render KPI cards arrivi |
| `buildBarChart(data)` | §1219 | Generatore SVG bar chart |
| `fetchMeteo()` | §1219 | Fetch previsioni meteo |
| `updateSbClock()` | §1299 | Aggiorna orologio sidebar (ogni 10s) |
| `toggleOccupazionePreview()` | §1127 | Toggle pannello occupazione full-width |

### DVR

| Funzione | Linea approx. | Scopo |
|----------|--------------|-------|
| `dvrRender()` | §540 | Render completo view DVR |
| `dvrSave()` | §540 | Salva DVR_DATA in localStorage + KV |
| `dvrRestore()` | §540 | Ripristina DVR_DATA da localStorage |
| `dvrRenderDipendenti()` | §540 | Render lista dipendenti con pin e badge |
| `dvrEmpOpenModal(id)` | §540 | Apre modal modifica/aggiunta dipendente |
| `dvrToggleScadContr(val)` | §540 | Mostra/nasconde campo scadenza contratto |

### Recensioni

| Funzione | Linea approx. | Scopo |
|----------|--------------|-------|
| `revParseCsv(text)` | §2235 | Parse CSV recensioni (tutti gli hotel) |
| `revHandleFile(p, file)` | §2235 | Upload handler per hotel |
| `revRenderList(p)` | §2235 | Render lista recensioni filtrata |
| `revGenerateReply(r)` | §2235 | Genera risposta via Claude |
| `revCopyReply(uid)` | §2235 | Copia risposta generata |
| `revMarkSent(p, gi)` | §2235 | Traccia risposte inviate |
| `revApplyFilters(p)` | §2235 | Filtra e ordina recensioni |

### Arrivi & Registration Cards

| Funzione | Linea approx. | Scopo |
|----------|--------------|-------|
| `handleArriviFile(file)` | §3767 | Upload, parse via Claude API |
| `fixArriviStruttura(arrivi)` | §3767 | Corregge codici struttura da numero camera |
| `renderArriviModal(...)` | §3767 | Render cards arrivi con filtri |
| `rcParseGuests(text)` | §3603 (~3650) | Estrae dati ospiti da PDF arrivi |
| `rcRenderCards(guests)` | §3603 | Render cards ospiti |
| `preparePrint(idx)` | §3603 | Genera HTML per stampa |

### Inventario Detersivi

| Funzione | Linea approx. | Scopo |
|----------|--------------|-------|
| `invSetWh(wh, btn)` | ~4634 | Cambia magazzino attivo nel dashboard |
| `invSetTab(tab)` | ~4634 | Cambia tab stock/movimenti/analisi |
| `invRender()` | ~4634 | Render completo view inventario |
| `invRenderStock(catalog, moves)` | ~4634 | Render griglia stock |
| `invRenderMoves(catalog, moves)` | ~4634 | Render lista movimenti |
| `invRenderAnalysis(catalog, moves)` | ~4634 | Render tab analisi (cons. settimanale, da riordinare) |
| `invCalcStock(catalog, moves)` | ~4634 | Calcola qty corrente per barcode |
| `invEditQty(bc, currentQty)` | ~4634 | Modifica qty stock da dashboard (crea movimento init) |
| `invEditSoglia(bc)` | ~4634 | Imposta soglia minima per prodotto |
| `invPrintStock()` | ~4634 | Stampa A4 giacenza (ordine alfabetico) |

### Preferenze Turni

| Funzione | Linea approx. | Scopo |
|----------|--------------|-------|
| `turniPrefLoad()` | ~5090 | Fetch dati da Apps Script, salva in localStorage |
| `turniPrefRestore()` | ~5090 | Ripristina `_tpData` da localStorage |
| `turniPrefRender()` | ~5090 | Render calendario + lista richieste |
| `turniPrefMarkAllSeen()` | ~5090 | Segna tutte le richieste come lette |
| `turniPrefSetFilter(f)` | ~5090 | Filtra per reparto |
| `turniPrefNavCal(dir)` | ~5090 | Naviga mese calendario (+1/-1) |
| `turniPrefSelectDay(d)` | ~5090 | Seleziona giorno per filtrare lista |
| `_tpFmtDate(s)` | ~5090 | Normalizza qualsiasi formato data → `dd/MM/yyyy` |
| `turniPrefUpdateBadge()` | ~5090 | Aggiorna badge nav con richieste non lette |

---

## Periodic Timers

| Intervallo | Scopo |
|-----------|-------|
| 10 sec | `updateSbClock()` — aggiorna orologio sidebar |
| 10 min | `fetchMeteo()` — aggiorna previsioni meteo |
| 30 sec | Polling overview + cloud sync + `turniPrefLoad()` |

---

## Recovery — Recupero Codice Perso

Se delle viste o funzionalità spariscono, recuperare dal git history:

```bash
# Lista commit recenti
git log --oneline -20

# Commit chiave con tutte le viste originali
git show 2183997:index.html | grep 'id="view-'

# Estrarre blocco specifico da commit (es. linee 3500-3800)
git show 2183997:index.html | sed -n '3500,3800p'

# Altri commit utili
# f97c04d — versione con HKP views
# c973287 — versione stabile pre-modifiche
```

### Viste da non perdere

Le viste `view-hkpsheet` e `view-hkpsheetar` sono state perse e recuperate (commit `2183997`). Se scompaiono di nuovo, il codice completo è disponibile in quel commit.

---

## Note & Problemi Noti

| Problema | Causa | Fix |
|----------|-------|-----|
| HKP views scomparse | Sovrascrittura accidentale index.html | Recuperare da git `2183997` |
| Browser usa versione vecchia app.js | Cache buster non aggiornato | Aggiornare `?v=...` in `<script src="app.js?v=...">` |
| MT card non visibile in overview | `inT.length === 0` saltava il reparto | `showMembers = key==='mt' ? dept.members : inT` |
| Basile '9-17' mostrato come non-attivo | '9-17' non in lista shift standard | MT usa `!IS_REST(sv)` invece di lista whitelist |
| Extra Vincenza appare nell'UI | Era in DEPTS anche se nascosta nel foglio | Rimossa da `DEPTS.hk.members` |
| "Non in servizio" conta anche chi non è in turno | `IS_REST(v)` ritorna true per valori null/vuoti | Usare `IS_ABSENT(v)` che richiede R/FERIE espliciti |
| DVR dati non persistenti | `dvrSave()` chiamava `LS.kvSet()` inesistente | Usare `kvSet('qm_dvr', json)` direttamente |
| DVR vuoto su altro PC | `syncFromCloud` scriveva localStorage ma non chiamava `dvrRestore()` | Aggiunto `dvrRestore()` nel case `dvr` di `syncFromCloud` |
| KPI chips nascosti al caricamento | `setView()` non chiamato all'avvio | IIFE che imposta `topbar-kpis` display:flex |
| KPI chips tagliati | `overflow:hidden` su `.topbar-kpis` | Cambiato a `overflow:visible` + `flex-shrink:0` sui chip |
| Meteo non funziona | `const days=data.daily` dichiarato dopo l'uso in `if(mm&&days)` | Spostata dichiarazione prima del blocco `if` |
| % occupazione illeggibile | `position:absolute;right:8px` dentro la barra su sfondo grigio | Span % spostato FUORI dal container della barra |
| Righe DUPLEX duplicate in HKP riepilogo | Range A38:AG47 include righe duplex | Filtro client-side `/duplex/i.test(c.nome)` |
| `giorni_elaborati` sempre 1 in SoulArt | Apps Script leggeva range sbagliato | Script riscritto con range corretti; calcolo client-side da `camere_per_giorno` |
| Inventario vuoto al refresh pagina | `invRender()` controlla `classList.contains('active')` prima che la view sia attivata | `setView()` chiama `invRender()` quando `id === 'inventario'` |
| Date preferenze turni mostrano "Sun" | Apps Script restituisce `String(date)` = `"Sun Apr 06 2025 22:00:00 GMT+0200"` quando `instanceof Date` fallisce | `_tpFmtDate()` usa regex su nome mese inglese; Apps Script aggiornato con `typeof v.getTime === 'function'` |
| Calendario preferenze turni senza conteggi | `countByDay` usava stringa completa con orario come chiave | `_tpFmtDate()` normalizza prima del confronto |
| QC settimanale mostra dati sbagliati/mancanti | `_todayKey` era `const` calcolata al caricamento — reset del mattino sovrascriveva il giorno precedente se app aperta overnight | `_todayKey` diventa funzione, calcola data corrente ad ogni chiamata (`controllo-mattino.html`) |
| Dati giornalieri Culligan persi dopo reset | Stesso bug `_todayKey` statico | Stessa fix: `_todayKey()` come funzione |

---

## Inventario Detersivi

### Scopo

Gestione stock detersivi e prodotti per i due magazzini (SoulArt Hotel e Art Resort). I movimenti vengono registrati tramite scanner barcode da smartphone; il dashboard mostra stock, storico e analisi.

### File

| File | Scopo |
|------|-------|
| `inventory.html` | App mobile standalone (scanner + movimenti) |
| `app.js` §§ INVENTARIO DETERSIVI | Logica dashboard: calcolo stock, render view, edit qty |
| `index.html` `#view-inventario` | View nel dashboard (stock + movimenti + analisi) |

### Storage (Cloudflare KV + localStorage)

| Chiave KV / localStorage | Contenuto |
|--------------------------|-----------|
| `qm_inv_catalog` | Anagrafica prodotti condivisa: `{ [barcode]: { name, unit, soglia? } }` |
| `qm_inv_moves_sa` | Movimenti magazzino SoulArt: array |
| `qm_inv_moves_ar` | Movimenti magazzino Art Resort: array |

### Struttura movimento

```js
{
  id:      string,   // timestamp_random
  barcode: string,
  type:    'init' | 'in' | 'out',  // giacenza iniziale / carico / scarico
  qty:     number,
  ts:      number,   // Date.now()
  note:    string,
}
```

### Calcolo stock

Per ogni prodotto per magazzino:
1. Trova l'ultimo movimento `type === 'init'` → valore base
2. Somma i movimenti `in` successivi
3. Sottrae i movimenti `out` successivi
4. Se nessun `init`: somma pura `in - out`

```js
invCalcStock(catalog, moves) → { [barcode]: qty }
```

### Modifica qty da dashboard

Cliccando il valore qty in una riga stock si apre un prompt. Il nuovo valore viene salvato come movimento `init` con nota "Rettifica da dashboard" → pushato su KV → l'app mobile recepisce al prossimo caricamento.

### Tab Analisi — Note

- Prodotti in ordine **alfabetico**
- Mostra **consumo settimanale medio** (`consumo / days * 7`)
- Sezione **⚠️ Da riordinare**: prodotti con autonomia ≤14gg, ordinati per urgenza
- Periodo selezionabile: 7 / 30 / 90 giorni / tutto
- Tabella dettaglio a `max-width: 420px`

### inventory.html — Funzionalità

- Selezione magazzino: SoulArt Hotel / Art Resort
- Scanner barcode: `BarcodeDetector` nativo (Android) con fallback ZXing
- Prima scansione codice sconosciuto: chiede nome + unità → salva in catalogo
- 3 tab: **Stock**, **Movimenti**, **Catalogo**
- Modal movimenti: chip unità, stepper +/−, default Scarico per prodotti noti
- Sync KV all'avvio + push al salvataggio

---

## Preferenze Turni

### Scopo

Raccoglie le richieste di preferenza turno del personale inviate via Google Forms. Il dashboard mostra un calendario mensile con conteggio richieste per giorno e una lista filtrata per reparto.

### Foglio Google collegato

`https://docs.google.com/spreadsheets/d/1KysJxvGY-PxCSrjdWMjYCz_7KlFOIG6bSe3fXCVfObo`

Foglio: **Risposte del modulo 1**

| Colonna | Campo | Note |
|---------|-------|------|
| A | Timestamp invio | Data/ora compilazione modulo |
| B | Nome dipendente | |
| C | Reparto | Ricevimento / Breakfast / Housekeeping |
| D | Data richiesta | Giorno in cui viene fatta la richiesta |
| E | Giorno richiesto | Giorno per cui si chiede la preferenza |
| F | Preferenza turno | RIPOSO, FERIE, RECEPTION APERTURA/CHIUSURA, ecc. |
| G | Motivazione | Facoltativa |

### Apps Script attuale

```
TURNI_PREF_URL = 'https://script.google.com/macros/s/AKfycbzCbHxJbSfxg8X49w2JlfI9xo3HqhDiOa6E_0SDstdrvpQTQfqd2euaGp1oIK3zo0CA/exec'
```

Template Apps Script (usa `typeof v.getTime === 'function'` invece di `instanceof Date` per evitare bug Apps Script):

```javascript
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('Risposte del modulo 1');
  if (!sheet) return resp({error:'sheet not found'});
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return resp({richieste:[], total:0});

  const isDate = v => v && typeof v.getTime === 'function';
  const fmt = v => isDate(v) ? Utilities.formatDate(v,'Europe/Rome','dd/MM/yyyy') : String(v||'').trim();

  const data = rows.slice(1).map(row => ({
    ts:              isDate(row[0]) ? row[0].toISOString() : String(row[0]||''),
    nome:            String(row[1]||'').trim(),
    reparto:         String(row[2]||'').trim(),
    dataRichiesta:   fmt(row[3]),
    giornoRichiesto: fmt(row[4]),
    preferenza:      String(row[5]||'').trim(),
    motivazione:     String(row[6]||'').trim()
  })).filter(r => r.nome);

  data.sort((a,b) => new Date(b.ts) - new Date(a.ts));
  return resp({richieste: data, total: data.length});
}

function resp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Storage

| Chiave localStorage | Contenuto |
|--------------------|-----------|
| `qm_turni_pref` | Array richieste (cache locale) |
| `qm_tp_seen` | Array di timestamp (`r.ts`) già letti |

### Funzionamento badge

Badge sul nav item mostra il numero di richieste con `r.ts` non presenti in `qm_tp_seen`. Aprire la view marca automaticamente tutte come lette.

### `_tpFmtDate(s)` — normalizzazione date

Apps Script può restituire date in formati diversi. La funzione gestisce:
- `"dd/MM/yyyy"` → restituisce invariato
- `"yyyy-MM-ddT..."` (ISO) → converte in `dd/MM/yyyy`
- `"Sun Apr 06 2025 22:00:00 GMT+0200"` (JS Date.toString) → regex su nome mese inglese

---

## housekeeper.html & breakfast.html

### housekeeper.html

App standalone per la governante. Funzionalità:
- Checklist camere per stato (pulita, sporca, da ispezionare, OOO)
- Mappa visiva delle camere per piano
- Persistenza locale via localStorage

### breakfast.html

App standalone per il breakfast manager. Funzionalità:
- Lista ospiti con colazione inclusa
- Filtri per struttura e trattamento
- Stato servizio (servito / non servito)
- Dati alimentati dagli arrivi giornalieri

---

## Distribuzione Culligan (controllo-mattino.html)

### Scopo

PWA mobile per il giro mattutino di distribuzione acqua Culligan. Il QM scansiona/verifica ogni camera: mette le bottiglie, controlla le amenities bagno, segna il risultato. I dati sono sincronizzati tramite KV e visibili nel dashboard (`view-controllo-mattino`).

### File

| File | Scopo |
|------|-------|
| `controllo-mattino.html` | App PWA standalone (giro distribuzione mobile) |
| `sw.js` | Service worker unificato (network-first per HTML, cache-first per asset) |
| `app.js` §§ CONTROLLO MATTINO | Logica dashboard: `cmLoad()`, `cmRender()`, `cmPrintBottle()`, `cmLoadWeeklyQC()`, `cmRenderWeeklyQC()` |
| `index.html` `#view-controllo-mattino` | View dashboard con stats + QC settimanale + pulsante Stampa A4 |

### Storage (Cloudflare KV + localStorage)

| Chiave | Contenuto |
|--------|-----------|
| `qm_cm_YYYY-MM-DD` | Stato giornaliero: oggetto con camere e loro stato amenities/bottiglia |
| `qm_piano` | Piano settimana (`{giorni:[{data:'DD/MM/YYYY', soulart:{partenze:[], fermate:[], cambi:[]}}]}`) |

### `_todayKey()` — CRITICO

In `controllo-mattino.html`, `_todayKey` è una **funzione** (non una costante) che calcola la chiave KV del giorno corrente al momento della chiamata:

```javascript
function _todayKey() {
  const d = new Date();
  return 'qm_cm_'+d.getFullYear()+'-'+
    String(d.getMonth()+1).padStart(2,'0')+'-'+
    String(d.getDate()).padStart(2,'0');
}
```

**Non trasformarla mai in `const`**: se fosse calcolata al caricamento della pagina, tenere l'app aperta overnight causerebbe il reset del mattino a sovrascrivere i dati del giorno precedente invece di inizializzare il nuovo giorno.

### Flusso reset giornaliero

Il reset si fa **la mattina del giorno in cui si inizia il giro**, non la sera prima:
- Reset di lunedì mattina → scrive `{}` nella chiave di **lunedì** → i dati di domenica restano intatti in KV
- Reset di martedì mattina → scrive `{}` nella chiave di **martedì** → i dati di lunedì restano intatti in KV

### QC Settimanale (`cmLoadWeeklyQC` / `cmRenderWeeklyQC`)

Conta quante volte durante la settimana corrente (dom→sab) la bottiglia è stata **consumata e sostituita** per ogni camera.

**Condizione di conteggio**: `rs.visited && !rs.dnd && !rs.libera && rs.bottiglia === 'consumata'`

Non viene conteggiato:
- Bottiglia non consumata (trovata ancora piena)
- Camera DND
- Camera libera (bottiglia non sostituita)

**Logica**: legge le 7 chiavi `qm_cm_YYYY-MM-DD` della settimana da KV. Per ogni giorno con dati, incrementa il contatore per camera. Risultato finale: `perRoom[r]` = numero di sostituzioni della camera `r` nella settimana.

**Pulsanti nel report**:
- **WhatsApp albergo** — link `wa.me/393274919588` con messaggio pre-compilato (apre WhatsApp Web dell'albergo)
- **📋 Copia testo** — copia il messaggio negli appunti per incollarlo nel WhatsApp personale
- **👁 Anteprima** — mostra il testo del messaggio

### Service Worker

Versione corrente in `sw.js`: `qm-v2`. Pattern:
- **Proxy/KV requests** → sempre network, mai cache
- **HTML files** → network-first, aggiorna cache, fallback offline
- **Asset statici** → cache-first

`sw-controllo-mattino.js` è un file legacy che si auto-disinstalla (cancella tutte le cache e si de-registra). Non modificarlo.

### Dashboard (`cmLoad()`) — KV come source of truth

Legge sempre KV prima (fonte dei dati scritti da smartphone), poi fallback localStorage.
