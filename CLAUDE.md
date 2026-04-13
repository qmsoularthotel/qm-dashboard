# CLAUDE.md

Questo file fornisce il contesto completo del progetto a Claude Code.

---

## Strutture gestite

7 hotel a Napoli:
**SoulArt Hotel (SA)**, **Boutique Hotel (BH)**, **San Liborio (SL)**, **Principe (PR)**, **Mastrangelo (MS)**, **Art Resort (AR)**, **Santa Brigida (SB)**.

---

## Risposte alle recensioni Booking.com

- **Firma italiano:** `Paolo P. - Quality Manager`
- **Firma inglese:** `Best regards. Paolo P. - Quality Manager`
- Non ripetere le parole esatte del recensore.
- Includere sempre un incentivo alla prenotazione futura.

---

## Architettura del progetto

### File di produzione

```
/Users/pierpaolopresta/Desktop/qm-dashboard/
├── app.js           ← tutta la logica JS (~3700 righe)
├── index.html       ← shell HTML + riferimento a app.js
├── style.css        ← stili
├── housekeeper.html ← mini app separata per le cameriere
├── breakfast.html   ← mini app separata per il responsabile colazione
└── CLAUDE.md        ← questo file
```

**NON usare** i file nella cartella `.claude/worktrees/` — sono obsoleti.

### Inventario viste obbligatorie (checklist anti-perdita)

Ogni volta che si modifica `index.html`, verificare che TUTTE queste viste esistano:

| ID vista | Descrizione |
|----------|-------------|
| `view-overview` | Panoramica del giorno |
| `view-checklist` | Checklist operativa |
| `view-registrazione` | Registration Cards |
| `view-hkpsheet` | Operativa HKP — SoulArt Hotel |
| `view-hkpsheetar` | Operativa HKP — Art Resort |
| `view-bkfsheet` | Breakfast Sheet — SoulArt Hotel |
| `view-bkfsheetar` | Breakfast Sheet — Art Resort Galleria |
| `view-recensioni-sa/bh/sl/pr/ms/ar/sb` | Recensioni (7 hotel) |
| `view-miniapp` | Mini App — anteprima e link |

Verifica rapida: `grep "id=\"view-" index.html`

### Recovery dal git

Se una funzione o vista viene persa accidentalmente:

```bash
# Trova il commit dove esisteva
git log --oneline

# Visualizza il file in un commit specifico
git show <hash>:index.html | grep -n "funzione_cercata"
git show <hash>:index.html | sed -n 'START,ENDp'

# Commit chiave con implementazioni complete:
# 2183997 — v185 originale con HKP Operative, bkfsheet, tutte le viste
# f97c04d — v187 con viste HKP ripristinate (primo tentativo)
# c973287 — v187 con HKP Operative completa recuperata da v185
```

### Mappa sezioni app.js

Per trovare una sezione: `grep -n "// §§" app.js`

| Riga | Sezione |
|------|---------|
| 1 | `§§ COSTANTI & CONFIG` — DEPTS, WEEK fallback, IS_REST |
| 15 | `§§ TURNO — ACCORDIONI UC & UPLOAD BOX` |
| 87 | `§§ TURNO — PARSER TSV/PDF` — parseTurniTSV, handleTurniFile |
| 257 | `§§ TURNO — RENDER & NAVIGAZIONE` — loadWeekData, renderDay, buildWeekNav |
| 347 | `§§ NAVIGAZIONE VISTE` — setView, pageTitles |
| 381 | `§§ MINI APP — RENDER` — miniappRenderBkf, loadHkAccessStats, renderPianoGiorno |
| 484 | `§§ UTILITÀ — FORMATTAZIONE DATE & TIMESTAMP` |
| 520 | `§§ CHECKLIST — TASK ITEMS` — buildTaskItem, renderTaskList |
| 552 | `§§ STORAGE & SYNC KV` — setSyncStatus, kvSet, kvGet, LS, syncFromCloud |
| 663 | `§§ CHECKLIST — STATO CENTRALIZZATO & CUSTOM TASK` — taskKey, addCustomTask |
| 902 | `§§ CHECKLIST — RENDER & PROGRESS` — toggleCheck, updateClProgress |
| 983 | `§§ OVERVIEW — TOGGLE PREVIEW PANELS` |
| 1075 | `§§ OVERVIEW — GRAFICI & METEO` — buildBarChart, fetchMeteo |
| 1155 | `§§ SIDEBAR — OROLOGIO & DATA` — updateSbClock, toggleDatePopup |
| 1207 | `§§ OVERVIEW — RENDER PRINCIPALE + INIT + POLLING 30s` — refreshOverviewForDate |
| 1524 | `§§ RECENSIONI — SCORE TREND MODAL` — openScoreTrend |
| 1611 | `§§ OVERVIEW — RECENSIONI NO-REPLY` — ovUpdateRevNoreply |
| 1683 | `§§ BKF SHEET — ANALISI AI` — bkfSheetAnalyze, bkfSheetSync |
| 1896 | `§§ REPORT PULIZIE — PUL` — handlePulFile, renderPulDay, updateKpiFromPulizie |
| 2059 | `§§ RECENSIONI — SCORING & INIT UPLOAD` — weightedAvgF1 |
| 2090 | `§§ RECENSIONI — LOGICA` — revParseCsv, revRenderCatTrend, revRenderList, revGenerateReply |
| 2850 | `§§ REPORT PASTI — BKF` — handleBkfFile, renderBkfDay, renderOvBkfChart |
| 2967 | `§§ HOUSEKEEPING — HKP UPLOAD & DATI` — handleHkFile, hkSetLoaded |
| 3046 | `§§ PIANO SETTIMANA — UPLOAD & PARSER` — parsePianoItems, checkAndParsePianoRaw |
| 3205 | `§§ BKF — GRUPPI, NOTE & GRAFICI` — bkfRenderGroups, bkfRenderChart |
| 3458 | `§§ REGISTRATION CARDS — RC` — rcParseGuests, rcRenderCards, checkAndParseArriviRaw |
| 3523 | `§§ MODAL — CATEGORIE TREND` — openCatModal |
| 3622 | `§§ ARRIVI GIORNALIERI — UPLOAD & RENDER` — handleArriviFile, renderArriviModal |

### Deploy

- **Repository GitHub**: `https://github.com/qmsoularthotel/qm-dashboard`
- **Hosting**: Cloudflare Pages (auto-deploy da `main`)
- **Cache busting**: aggiornare il parametro `?v=187-YYYYMMDD` in `index.html` quando si modifica `app.js`:
  ```html
  <script src="app.js?v=187-20260412c"></script>
  ```
- **Push**: `cd /Users/pierpaolopresta/Desktop/qm-dashboard && git add -A && git commit -m "..." && git push origin main`

---

## Storage & Sync

| Layer | Dettaglio |
|-------|-----------|
| **localStorage** | Dati primari, prefisso `qm_` |
| **Cloudflare KV** | Sync cloud via proxy `https://anthropic-proxy.qm-d82.workers.dev` |
| **Endpoint KV** | GET `/kv/get?key=qm_XXX` · POST `/kv/set` `{key, value}` · DELETE `/kv/delete?key=qm_XXX` |

### Chiavi KV principali

| Chiave KV | Contenuto |
|-----------|-----------|
| `qm_weekData` | `{giorni:[{label,date,shifts}], _ts}` — turno settimanale staff |
| `qm_arriviData` | `{data,totale_stanze,totale_persone,arrivi:[...], _ts}` — arrivi oggi |
| `qm_rcGuests` | `[{camera,nome,pax,trattamento,checkin,checkout}]` — registration cards |
| `qm_pulData` | Report pulizie giornaliero |
| `qm_bkfData` | Report pasti/colazioni |
| `qm_piano` | `{stampato,giorni:[{label,data,soulart:{partenze[],fermate[],cambi[]},boutique:{partenze[],fermate[],cambi[]},liborio:{partenze[],fermate[],cambi[]}}], _ts}` |
| `qm_hk_soul` | Statistiche HK SoulArt per giorno |
| `qm_hk_bout` | Statistiche HK Boutique per giorno |
| `qm_hk_access` | `{total, today, todayDate, last}` — contatore accessi housekeeper.html |
| `qm_bkf_access` | `{total, today, todayDate, last}` — contatore accessi breakfast.html |
| `qm_arrivi_raw` | `{pdf: base64, _ts}` — PDF grezzo arrivi (temporaneo, usato dal browser per RC cards) |
| `qm_piano_raw` | `{pdf: base64, _ts}` — PDF grezzo piano settimana (temporaneo, usato dal browser) |
| `qm_rev_sa/bh/sl/pr/ms/ar/sb` | CSV recensioni per hotel |

---

## Drive Script (Google Apps Script)

### Script 1 — Upload DSB (Upload automatico file)

Associato alla cartella Drive "Upload DSB". Processa PDF caricati in base al nome file:

| Nome file (lowercase, inizia con) | Handler | Salva in KV |
|-----------------------------------|---------|-------------|
| `arrivi oggi` | `processArrivi` | `qm_arriviData` + `qm_arrivi_raw` |
| `piano settimana` | `processPiano` | `qm_piano_raw` |
| `hkp oggi` | `processHkpOggi` | `qm_pulData` |
| `bkf oggi` | `processBkfOggi` | `qm_bkfData` |
| `hkp soul` | `processHkpSoul` | `qm_hk_soul` |
| `hkp boutique` | `processHkpBoutique` | `qm_hk_bout` |

**Costanti Drive script:**
```javascript
const PROXY = 'https://anthropic-proxy.qm-d82.workers.dev';
const MODEL = 'claude-sonnet-4-20250514';
const FOLDER_NAME = 'Upload DSB';
```

**`kvSet` corretto (POST, non PUT):**
```javascript
function kvSet(key, value) {
  UrlFetchApp.fetch(PROXY + '/kv/set', {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({ key: key, value: JSON.stringify(value) }),
    muteHttpExceptions: true
  });
}
```

**`processPiano`** — salva PDF grezzo (NON usa Claude AI, evita errori di parsing):
```javascript
function processPiano(file) {
  const base64 = Utilities.base64Encode(file.getBlob().getBytes());
  kvSet('qm_piano_raw', { pdf: base64, _ts: Date.now() });
}
```

**`processArrivi`** — salva PDF grezzo + Claude AI per struttura:
```javascript
function processArrivi(file) {
  const base64 = Utilities.base64Encode(file.getBlob().getBytes());
  kvSet('qm_arrivi_raw', { pdf: base64, _ts: Date.now() });
  const data = callClaude(base64, `...prompt arriviData...`);
  data._ts = Date.now();
  kvSet('qm_arriviData', data);
}
```

### Script 2 — Turno Settimanale (Foglio Google)

**File**: `TURNI DA 19/09` — ID `11qLWMXkC46bu2-9JvN5Tr5G_ry11-qMUPzHifcgsQso` — Tab gid `2003426322`

Funzione `leggiTurnoSettimana()`:
- Legge la settimana corrente per colonne (NAME_COL=11, START_COL=12, START_DATE=2025-09-01)
- Salva `kvSet('qm_weekData', { giorni, _ts: Date.now() })`
- **Trigger**: "In caso di modifica" → Da foglio di lavoro

---

## Parser browser (affidabili, coordinati)

I PDF vengono parsati nel browser con **pdfjsLib** — molto più affidabili di Claude AI per layout fissi.

### `parsePianoItems(items)` — app.js riga 3058 (`§§ PIANO SETTIMANA`)
- Input: array `{s, x, y, p}` da pdfjsLib
- Raggruppa per riga (tolleranza y=4), trova header con ≥2 abbreviazioni giorno
- `-` = partenza, `=` = fermata, `-+` = cambio (partenza con arrivo), `+` = solo arrivo (ignorato)
- Rileva camera: `Art N` → soulart, `200-299` → boutique, `AS_LIB` → liborio
- Struttura per giorno: `{soulart:{partenze[],fermate[],cambi[]}, boutique:{...}, liborio:{...}}`
- **Liborio in overview**: fuso con boutique in `renderPianoGiorno` (mostra con label "Boutique - San Liborio")
- **Liborio in housekeeper.html**: fuso con boutique nella sezione Boutique Hotel
- **Cambio camera (⇄)**: chip rosso con simbolo `⇄` bold bianco; didascalia inline

### `checkAndParsePianoRaw()` — app.js
- Fetcha `qm_piano_raw` da KV (non localStorage — troppo grande)
- Se `_ts` > `qm_piano._ts`: decode base64 → pdfjsLib → `parsePianoItems` → salva `qm_piano`
- Elimina `qm_piano_raw` da KV dopo il parsing

### `rcParseGuests(text)` — app.js riga 3470 (`§§ REGISTRATION CARDS`)
- Input: testo estratto da pdfjsLib
- Regex su pattern `camera / tipo ospite pax trattamento arrivo-partenza`
- Output: `[{camera, nome, pax, trattamento, checkin, checkout}]`

### `checkAndParseArriviRaw()` — app.js
- Fetcha `qm_arrivi_raw` da KV
- Se `_ts` > `qm_ts_arriviRaw`: decode base64 → pdfjsLib → testo → `rcParseGuests` → `rcRenderCards`
- Elimina `qm_arrivi_raw` da KV dopo il parsing

---

## Auto-polling (ogni 30 secondi)

In `app.js`, dopo `setInterval(tick, 10000)`, c'è un `setInterval` da 30s che:
1. Controlla `qm_arriviData` in KV — se `_ts` > locale aggiorna UI arrivi
2. Chiama `checkAndParseArriviRaw()` — processa PDF grezzo arrivi → RC cards
3. Chiama `checkAndParsePianoRaw()` — processa PDF grezzo piano
4. Controlla `qm_weekData` in KV — se `_ts` > locale aggiorna turno

---

## Sync al caricamento (syncFromCloud)

`LS.syncFromCloud()` — app.js ~riga 510
- Fetcha tutte le chiavi KV in parallelo e salva in localStorage
- **NON include `piano_raw` e `arrivi_raw`** — troppo grandi, gestiti separatamente
- Per `hk_soul`, `hk_bout`, `piano`: aggiorna anche timestamp visivo e chiama `hkSetLoaded`

---

## Struttura Staff

```javascript
const DEPTS = {
  fo:  { members: ['Maddaloni M.','Presta P.','De Rosa T.','Pennacchio V.','Perez L.','Imparato G.','Vatiero R.','Barbosa D.',"D'Andrea F.",'Grieco V.','Extra Night','Extra Roberto'] },
  hk:  { members: ['Matarese A.','Nacci M.','De Masi C.','Chiantese M.','Extra Antonella','Extra Anushka','Extra Giuditta','Scognamillo E.','Esposito M.','Branno M.','Sarnataro A.'] },
  bkf: { members: ['Amorese S.','Albano D.','Ferace C.','Panagodage S.'] },
  mt:  { members: ['Basile G.'] }
};
// NAME_ALIAS nel parser turno: {'extra i.':'Extra Roberto','extra bkf sau':'Panagodage S.'}
```

---

## housekeeper.html

Mini app separata per le cameriere. Legge da KV:
- `qm_piano` → partenze/fermate/cambi per giorno (SoulArt, Boutique, Liborio)
- `qm_hk_soul` / `qm_hk_bout` → statistiche HK giornaliere
- `MATARESE` = Set camere Art 1–22 assegnate a Matarese
- Sezioni: **Matarese** (Art 1–22 selezionate), **Altre housekeeper** (restanti SoulArt), **Boutique Hotel - San Liborio** (Boutique + Liborio)
- Contatore accessi su KV `qm_hk_access`; esclusione dispositivo via `?notrack` (flag in localStorage)

---

## breakfast.html

Mini app separata per il responsabile colazione. Legge da KV:
- `qm_bkfData` → `{data:[{label,data,adulti,bambini,noCol}], activeDay, ts}`
- Mostra: coperti totali (adulti+bambini), room only, prossimi giorni, grafico settimanale SVG
- Contatore accessi su KV `qm_bkf_access`; esclusione dispositivo via `?notrack`
- Navigazione giorni ‹ › con sessionStorage per persistere il giorno selezionato
- Cache locale in localStorage (`bkf_cache`) per caricamento istantaneo

---

## Overview — layout v187

- **Riga 1** (4 col): Arrivi · Partenze · Fermate · Occupazione (da `pulData` / report pulizie)
- **Piano camere** (panel): SoulArt + Boutique - San Liborio; cambi con `⇄`
- **Riga 2** (3 col): Coperti colazione · Grafico settimanale SVG · Room Only
- Pannello occupazione, pulizie, BKF espandibili sotto

## Mini App — sezione dashboard

Entrambi i pannelli (HKP e Breakfast) nella vista `miniapp`:
- **HKP**: preview dati oggi (soul+bout), piano camere, contatore accessi, link
- **Breakfast**: oggi (coperti+room only+gruppi+note), prossimi 3 giorni, grafico settimanale, link

---

## Operativa Housekeeping (HKP) — Google Sheets

Due viste dedicate nel menu sidebar, sezione **Operativa Housekeeping**:

| Vista | Struttura | Foglio Google |
|-------|-----------|---------------|
| `hkpsheet` | SoulArt Hotel | [1NzJCavF4hb...](https://docs.google.com/spreadsheets/d/1NzJCavF4hb-rHSSERSUgHBcVpHDHrSolMcwpZAtx-Pc/edit) |
| `hkpsheetar` | Art Resort | [1FO9YxVpojx...](https://docs.google.com/spreadsheets/d/1FO9YxVpojxWD1eyi_IxVwQOYbddfDk9iOLBtD-fH3qo/edit) |

**Apps Script URL (lettura dati dal foglio):**
```javascript
const HKP_URLS = {
  sa: 'https://script.google.com/macros/s/AKfycbyosKJIaYIxh7D7GnCMFU7K_gABx2uNSy2VuaEjRc4ND1eEF9zrcSyUgc1Kp3X27lPa/exec',
  ar: 'https://script.google.com/macros/s/AKfycbwtxy0lngIzQ07QKRX2llx3lBCp2GdE1CoXsAW7GbKre5OEEARNdpCDuahc0DFsPAp7/exec'
};
```

**Struttura dati restituita dallo script:**
```javascript
{
  mese: "marzo 2026",
  giorni_elaborati: 20,
  giorni_mese: 31,
  tot_mese: 480,
  totale_per_giorno: { 1: 24, 2: 22, ... },   // giorno del mese → n. camere
  cameriere: [
    { nome: "Matarese A.", camere_tot: 120, camere_per_giorno: { 1: 8, 2: 6, ... } }
  ]
}
```

**Funzioni principali (`§§ HKP OPERATIVE` in app.js):**
- `hkpLoad(p)` — chiama Apps Script, salva in localStorage + KV
- `hkpRenderAll(p)` — aggiorna KPI + chiama renderContent
- `hkpRenderContent(p)` — tab "riepilogo" (ranking + sparkline) o "dettaglio" (per giorno)
- `hkpSelectDay(p, day)` — navigazione giornaliera nel tab dettaglio
- `hkpSave(p)` / `hkpRestore()` — persistenza localStorage + KV (`qm_hkp_sa`, `qm_hkp_ar`)

**KPI mostrati:** Camere mese · Media/giorno · Top cameriera 👑 · Cameriere attive

---

## Problemi noti e soluzioni applicate

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| Piano settimana sbagliato da Drive | Claude AI misconta colonne coordinate | Drive salva PDF grezzo → browser parsa con `parsePianoItems` |
| RC cards mancano 2 ospiti su 14 | Claude AI manca camere con note lunghe | Drive salva PDF grezzo → browser parsa con `rcParseGuests` |
| `piano_raw` riempie localStorage | PDF base64 ~2MB occupa quota | `piano_raw` non passa per localStorage, fetcha direttamente da KV |
| RC cards non si aggiornano in tempo reale | Dashboard sync solo all'avvio | Polling ogni 30s controlla KV e aggiorna UI |
| `kvSet` non funzionava | Drive usava PUT `/kv/{key}` non supportato | Corretto in POST `/kv/set` con `{key, value}` |
| `qm_weekData` cancellato | `piano_raw` aveva riempito localStorage | Ora `piano_raw` non tocca localStorage |
| Viste HKP Operative sparite | Refactoring da v185 (file unico) a v187 (app.js+index.html) | Recuperate da `git show 2183997:index.html`; ora documentate nell'inventario viste |

---

## CSS Design Tokens

```css
--bg: #E8E8EA       /* sfondo pagina */
--surface: #F4F4F6  /* card */
--accent: #1E4080   /* blu primario */
--green: #1E7A48
--red: #C0352A
--amber: #A05A00
```
