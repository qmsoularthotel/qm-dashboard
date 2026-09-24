# Architettura

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

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
4. Ripristina stato localStorage: turni settimanali, arrivi, recensioni, dati HKP, pulizie, pasti, DVR, preferenze turni
5. Avvia timer: clock (10s), meteo (10min), polling overview (60s, **fermo a scheda nascosta**) — il polling chiama anche `turniPrefLoad()`
6. IIFE mostra `topbar-kpis` (display:flex) all'avvio

### Review Scoring Formula (Booking)

**Decadimento esponenziale continuo con emivita calibrata** — vedi sezione dedicata "Punteggio Booking — decadimento continuo e calibrazione". Il vecchio modello a tre bucket annuali 85/10/5 è stato sostituito. Resta 85/10/5 solo per gli **score per categoria** e per l'**andamento categorie**, che il refactor non doveva toccare.

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

### Responsive / smartphone — regola d'oro: mai `grid-template-columns` inline

Tutta la responsività vive in **un solo blocco** `@media(max-width:768px)` in fondo a `style.css`. Perché funzioni, le griglie devono essere definite con una **classe**, mai con uno `style=""` inline: **uno stile inline vince sempre su una media query**, quindi una griglia scritta inline resta multi-colonna sullo smartphone qualunque cosa dica il `@media`. È stato esattamente il bug di Breakfast Sheet, DVR, Pannello App e del blocco colazioni in Overview, tutti scritti inline e quindi mai collassati.

Classi disponibili (definite sopra il blocco `@media`, collassate dentro):

| Classe | Desktop | Mobile |
|--------|---------|--------|
| `.grid-2` | `1fr 1fr` | `1fr` |
| `.grid-3` | `2fr 1fr` | `1fr` |
| `.grid-2-wide` | `1fr 1.5fr` | `1fr` |
| `.ov-bkf-grid` | `1fr 2fr 1fr` | `1fr` |
| `.ov-bkf-grid-wide` | `1fr 3fr 0.8fr` | `1fr` |
| `.miniapp-grid` | `repeat(3,minmax(0,1fr))` | `1fr` |
| `.inv-stock-row` | `1fr 72px 52px 88px 44px` | `1fr 44px 62px 40px`, 2ª colonna ("Ultimo mov.") nascosta |
| `.reception-kpi-grid` | `1fr 1fr auto` | `1fr 1fr`, il "Totale" (ultimo figlio) va a tutta larghezza sotto |

**Card KPI (`.kpi-card`) su mobile** — a due colonne su 375px ogni card sta in ~150px: con il padding a 20px e `.kpi-value` a 30px l'importo andava a capo (`€ 100,` troncato) e `.kpi-label`, che non ha spazio riservato a destra, finiva **sotto** `.kpi-card-icon` (posizionata `absolute` in alto a destra) — si leggeva `CO[€]NT` invece di `CONTANTI`. Nella media query le card si compattano: padding 14px, icona 24px, `.kpi-value` 22px e `.kpi-label{padding-right:28px}` per non passare sotto l'icona. Vale per tutte le ~40 card KPI del progetto, Overview compresa.

**Schema "grafico a sinistra + riquadro dati a destra"** — `.side-split` (contenitore flex) con dentro `.side-split-main` (il grafico, `min-width:0` così può stringersi) e `.side-split-aside` (la colonna dati, `flex-shrink:0` + `min-width:172px`). Usato in **Overview** (occupazione settimanale + bottiglia Culligan) e in **Bilanciamento Camere** (vista settimanale + totali). Su mobile `.side-split` diventa `flex-direction:column` e l'aside si impila sotto, con il separatore che passa da bordo sinistro a bordo superiore. Era scritto inline in entrambi i punti: la colonna dati si teneva ~180px dei 375 disponibili e schiacciava grafico e testo a una parola per riga.

`gap`, `margin` e `align-items` possono restare inline senza problemi: non incidono sul numero di colonne e conservano la spaziatura originale di ogni vista. Solo `grid-template-columns` (e `display:grid`) vanno nella classe.

**Altre regole mobile già presenti:**
- `.app{height:100svh;min-height:100svh}` — fuori dalla media query `.app` ha `height:100vh;min-height:640px`, e su iOS Safari `100vh` include l'area dietro la barra indirizzi (fondo pagina tagliato). Serve sovrascrivere **height**, non solo `min-height`.
- `.panel-body table{display:block;overflow-x:auto;min-width:100%}` — le tabelle dati larghe (Spese Fornitori, Inventari e Ordini, Breakfast Sheet) diventano il proprio contenitore scorrevole invece di allargare la pagina. Non serve più aggiungere a mano un wrapper `overflow-x:auto` intorno a ogni nuova tabella. Le stampe (`invPrintStock`, `invOrdersPrint`, `resiPrintDistinta`) scrivono in un altro documento e non sono toccate.
- I modali usano già ovunque `max-width:NNNpx;width:100%` — schema da mantenere per i nuovi.

---

## Project Overview

**QM Dashboard** è una SPA vanilla JS per la gestione qualità di un gruppo alberghiero multi-struttura a Napoli. Il codice è diviso in:

- **`index.html`** — Layout HTML, sidebar nav, tutte le view (div#view-*), CSS inline, tag `<script src="app.js?v=...">` in fondo
- **`app.js`** — Tutta la logica JS (~16.400 righe, 49 sezioni §§ — vedi la mappa più sotto)
- **`housekeeper.html`** — App separata per la governante (HK checklist camere)
- **`breakfast.html`** — App separata per il breakfast manager
- **`inventory.html`** — App separata per l'inventario detersivi (mobile, scanner barcode)
- **`controllo-mattino.html`** — App separata PWA per il giro distribuzione Culligan (mattino)
- **`dvr.html`** — App separata per consultare/gestire il DVR (General Manager)
- **`reception.html`** — Cassa di reception (fondo cassa, incasso contante) — vedi la sua sezione
- **`registration-galleria.html`** — App dei colleghi dell'Art Resort/Galleria. **Sta fuori da Compass**: dal 02/09/2026 non usa il cloud in nessun modo e non compare nel Pannello App — vedi la sua sezione
- **`biancheria-galleria.html`** — **Gestione Biancheria**, l'app del Resident Manager per il ciclo biancheria di Art Resort Galleria Umberto e Art Suite Santa Brigida. Copia del Consumo Biancheria di Compass; dati sul cloud di Compass con un **codice che apre solo le chiavi `bg_*`** — vedi la sua sezione
- **`worker.js`** — Il Cloudflare Worker: archivio KV, proxy AI, invio e lettura mail pre-stay, lasciapassare. **Si pubblica a mano**, vedi la sezione dedicata
- **`sw.js`** — Service worker unico per tutto il sito
- **`test/`** — 771 controlli automatici (`bash test/esegui.sh`), `strumenti/` — script di versionamento

Le **6 app del Pannello App** (housekeeper, breakfast, controllo-mattino, inventory, dvr e, dal
12/09/2026, **biancheria-galleria**) sono accendibili e spegnibili da remoto — vedi
[Pannello App](#pannello-app--centro-controllo-app-standalone). La Galleria usa una chiave sua,
`bg_app_status`, perché il suo codice legge solo chiavi `bg_*`.
`reception.html` e `registration-galleria.html` no: la prima non è mai stata inserita nel
pannello, la seconda ne è stata tolta di proposito.

Non esiste build system, package manager o step di compilazione.

### Versionamento

Il numero di versione va incrementato:
1. Nel `<title>` tag di `index.html` (es. `v186` → `v187`)
2. Nel cache buster `<script src="app.js?v=345-YYYYMMDD">` in fondo a `index.html`

Ad ogni modifica ad `app.js`, **aggiornare il cache buster** altrimenti il browser userà la versione vecchia.

---

