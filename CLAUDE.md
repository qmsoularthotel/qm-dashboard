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
- **`app.js`** — Tutta la logica JS (~3950 linee, ~29 sezioni §§)
- **`housekeeper.html`** — App separata per la governante (HK checklist camere)
- **`breakfast.html`** — App separata per il breakfast manager

Non esiste build system, package manager o step di compilazione.

### Versionamento

Il numero di versione va incrementato:
1. Nel `<title>` tag di `index.html` (es. `v186` → `v187`)
2. Nel cache buster `<script src="app.js?v=187-YYYYMMDD">` in fondo a `index.html`

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
- **External**: Google Sheets (Apps Script) — dati operativi HKP e breakfast

### AI Integration

Claude API chiamata via proxy Cloudflare:
- **Model**: `claude-sonnet-4-20250514`
- **Usi**: parsing PDF/immagini di turni, arrivi, documenti pasto → JSON strutturato
- **Pattern**: file upload → base64 → `fetch(PROXY)` → JSON parse → state update → localStorage + KV

### Initialization Sequence (`DOMContentLoaded` in app.js)

1. Imposta data corrente
2. Costruisce KPI bar chart
3. Pull async da Cloudflare KV (cloud sync)
4. Ripristina stato localStorage: checklist, reclami, audit, task custom, turni settimanali, arrivi, recensioni, dati HKP, pulizie, pasti
5. Avvia timer: clock (10s), meteo (10min), polling overview (30s)

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
| 1 | COSTANTI & CONFIG | `DEPTS`, `WEEK`, `IS_REST`, costanti globali |
| 15 | TURNO — ACCORDIONI UC & UPLOAD BOX | Toggle accordioni turni, upload box UI |
| 87 | TURNO — PARSER TSV/PDF | `parseTurniTSV()`, `handleTurniFile()` |
| 257 | TURNO — RENDER & NAVIGAZIONE | `renderDay()`, `buildWeekNav()`, `loadWeekData()` |
| 349 | NAVIGAZIONE VISTE | `setView()`, `pageTitles`, toggle gruppi nav |
| 357 | HKP OPERATIVE — Google Sheets | `hkpLoad()`, `hkpRenderAll()`, `hkpSave()`, `hkpRestore()` |
| 525 | MINI APP — RENDER | `miniappRenderBkf()`, `miniappRenderPiano()` |
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
| `IS_REST` | const fn | Ritorna `true` se il valore turno è 'R' (riposo) |
| `WEEK` | const object | Turno settimana fallback hardcoded (7 giorni) |
| `weekData` | let | Dati turno settimana parsati |
| `activeDay` | let | Indice giorno attivo (0-6) |
| `PROXY` | const string | `https://anthropic-proxy.qm-d82.workers.dev` |
| `SHEETS_URL` | const string | Apps Script endpoint BKF SoulArt |
| `SHEETS_URL_AR` | const string | Apps Script endpoint BKF Art Resort |
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

---

## Endpoints & URLs

| URL | Scopo |
|-----|-------|
| `https://anthropic-proxy.qm-d82.workers.dev/v1/messages` | Claude API proxy (AI analysis PDF/immagini) |
| `https://anthropic-proxy.qm-d82.workers.dev` | KV storage operations (cloud sync) |
| `https://script.google.com/macros/s/AKfycbz-6o…/exec` | Google Sheets BKF SoulArt (`SHEETS_URL`) |
| `https://script.google.com/macros/s/AKfycbzmkY…/exec` | Google Sheets BKF Art Resort (`SHEETS_URL_AR`) |
| `https://script.google.com/macros/s/AKfycbyosK…/exec` | Google Sheets HKP SoulArt (`HKP_URLS.sa`) |
| `https://script.google.com/macros/s/AKfycbwtxy…/exec` | Google Sheets HKP Art Resort (`HKP_URLS.ar`) |
| `https://api.open-meteo.com/v1/forecast?latitude=40.8518&longitude=14.2681` | Meteo Napoli (previsioni 10 giorni) |
| `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js` | PDF.js worker |

---

## Inventario Viste Obbligatorie (index.html)

Tutte e 15 le view devono essere presenti. Verifica con:

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

---

## Operativa Housekeeping (HKP)

### Scopo

Mostra i consuntivi di lavoro delle cameriere (camere fatte per giorno, classifica mensile, sparkline trend). I dati vengono da Google Sheets aggiornati dalla governante.

### Apps Script Endpoints

```js
HKP_URLS = {
  sa: 'https://script.google.com/macros/s/AKfycbyosKJIaYIxh7D7GnCMFU7K_gABx2uNSy2VuaEjRc4ND1eEF9zrcSyUgc1Kp3X27lPa/exec',
  ar: 'https://script.google.com/macros/s/AKfycbwtxy0lngIzQ07QKRX2llx3lBCp2GdE1CoXsAW7GbKre5OEARNdpCDuahc0DFsPAp7/exec'
}
```

### Struttura Dati HKP

```js
{
  cameriere: [
    {
      nome: string,
      camere_tot: number,
      camere_per_giorno: { "1": 4, "2": 6, ... }
    }
  ],
  tot_mese: number,
  totale_per_giorno: { "1": 12, "2": 18, ... },
  mese: string,          // es. "Aprile 2026"
  giorni_elaborati: number,
  giorni_mese: number
}
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

- **Riepilogo mensile**: classifica cameriere (camere totali) + sparkline trend giornaliero
- **Per giorno**: dettaglio camere per ogni giorno del mese

---

## Staff Attuale (DEPTS)

### Front Office (`fo`)
Aggiornare in `app.js` sezione `§§ COSTANTI & CONFIG`.

### Housekeeping (`hk`)
Membri attuali includono: Extra Giuditta (aggiunta), Extra Vincenza (rimossa).

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

---

## Periodic Timers

| Intervallo | Scopo |
|-----------|-------|
| 10 sec | `updateSbClock()` — aggiorna orologio sidebar |
| 10 min | `fetchMeteo()` — aggiorna previsioni meteo |
| 30 sec | Polling overview + cloud sync + aggiornamento KPI |

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
