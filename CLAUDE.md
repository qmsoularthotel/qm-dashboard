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

## Punteggio Booking — decadimento continuo e calibrazione

### Perché è cambiato

Il modello precedente usava tre bucket annuali con pesi fissi: F1 ultimi 12 mesi 85%, F2 12–24 mesi 10%, F3 24–36 mesi 5%. Due difetti strutturali:

1. Dentro F1 una recensione di ieri e una di 11 mesi fa pesavano **identicamente** (85% entrambe).
2. Al 366° giorno il peso crollava da 85% a 10% — una funzione a gradini che produce salti artificiali del punteggio quando una recensione attraversa un confine di bucket, senza che sia successo nulla in hotel.

Verificato su SoulArt (652 rec, 24/08/2023 → 07/08/2026): il modello dava 8.8429 → mostrava **8.8**, mentre Booking mostra **8.9**. Sottostima di ~0.06 che tarava male tutti i calcoli previsionali.

### Le funzioni (sezione `§§ RECENSIONI BOOKING — PUNTEGGIO A DECADIMENTO CONTINUO` in `app.js`)

| Funzione | Scopo |
|----------|-------|
| `punteggioBooking(rec, hl, oggi)` | `{score, pesoEff, nInFinestra}`. Peso di ogni recensione = `0.5^(giorni/hl)`, finestra `REV_FINESTRA_GG=1095` (36 mesi) |
| `calibraHalfLife(rec, scoreReale, oggi)` | Scansiona hl da 20 a 1200 gg e restituisce `{hl, fascia:[min,max], fuoriModello}` — le emivite che riproducono il punteggio dichiarato |
| `revSoglia(target)` | `target - 0.05`: Booking arrotonda a una cifra, per **vedere** 8.9 basta superare 8.85 |
| `revHl(p)` / `revCalibStato(p)` | Emivita in uso per la struttura e stato calibrazione |
| `revCalibApply(p, score)` / `revCalibInput(p, val)` | Ricalcolo e persistenza della calibrazione |
| `revRitmoAlGiorno(scored, oggiTs)` | Recensioni/giorno degli ultimi 12 mesi |
| `revSimulaTarget(...)` | Simulazione giorno per giorno, vedi sotto |
| `revRenderCalib(p, pb, hl)` / `revRenderImpact(p, pb)` | I due pannelli nuovi |

Le funzioni accettano sia la forma interna `{_dateTs,_score}` sia quella documentata `{data,voto}` (helper `_revTs`/`_revVoto`), così restano testabili in isolamento.

### Calibrazione sul punteggio reale

Ogni struttura ha una calibrazione **indipendente**. L'utente inserisce il punteggio che Booking mostra in cima a *Extranet → Recensioni* (una cifra decimale) e da lì si ricava l'emivita.

- Chiave KV **`qm_rev_calib`**: `{ sa:{scoreReale, ts, hl, fascia, fuoriModello}, ... }`, letta dal cloud in `restoreReviews()` così il valore inserito su un PC vale su tutti.
- **Non bloccante**: senza valore si usa `REV_HL_DEFAULT=136` e si mostra il badge `non calibrato`. **136 non deriva dalla sola calibrazione sul punteggio** (che da sola dà una fascia larga 62–285 gg, troppo per un default): è il centro della fascia ristretta osservando **tre transizioni reali del display** su SoulArt (8.9 → un voto 5 → 8.8 → un voto 10 → 8.9), che restringe a 121–151 gg. Un'osservazione empirica vale più di una calibrazione su un solo numero.
- Oltre `REV_CALIB_STALE_GG=90` giorni dall'inserimento → badge `calibrazione da aggiornare`.
- Se nessuna emivita riproduce il valore → `fuoriModello`, avviso rosso esplicito e `console.warn`. **Non fallisce in silenzio**: o il numero è digitato male, o il CSV non è aggiornato.

### Registro osservazioni — calibrazione per intersezione di vincoli

Un singolo punteggio arrotondato a una cifra è un vincolo **debole**: su SoulArt dà una fascia larga 155 gg (78–233). Ma ogni lettura fatta in un momento diverso è un vincolo **indipendente**, e intersecandoli la fascia crolla — tre osservazioni attorno a due transizioni reali (8.9 → rec. da 5 → 8.8 → rec. da 10 → 8.9) la portano a 121–151 gg.

Per questo il campo "Punteggio Booking reale" **non sovrascrive più**: appende al registro `osservazioni:[{ts,display}]` della struttura. Prima ogni inserimento buttava via l'informazione precedente.

`calibraDaOsservazioni(recensioni, osservazioni)` valuta ogni osservazione **sul sottoinsieme di recensioni antecedenti al suo timestamp** — è questo che rende informativa una transizione (prima/dopo una singola recensione) — e tiene le emivite che soddisfano *tutte* le osservazioni.

**Il timestamp delle recensioni deve includere l'ora.** `revParseCsv` faceva `.split(' ')[0]` scartandola: più recensioni possono arrivare lo stesso giorno e senza l'ora l'ordine fra recensione e lettura del punteggio si perde, cioè sparisce proprio ciò che rende informativa la transizione. Ora parsa `YYYY-MM-DDTHH:MM:SS` (lo spazio va convertito in `T`, Safari non parsa la forma con lo spazio), con fallback alla sola data.

### Gerarchia delle fonti — `revCalibRicalcola(p)`

| Priorità | Fonte | Condizione |
|----------|-------|------------|
| 1 | `osservazioni` | ≥ 2 osservazioni usabili e non contraddittorie |
| 2 | `singolo` | fallback: calibrazione sull'osservazione più recente usabile |
| 3 | `default` | registro vuoto, o punteggio fuori modello → `REV_HL_DEFAULT` (136) |

La fonte in uso è **sempre mostrata** nel pannello (`emivita 136gg · da 3 osservazioni (fascia 121–151)`), non solo il numero.

**Il ricalcolo è O(emivite × osservazioni × recensioni)** (~1200 × 10 × 657): si esegue **solo** aggiungendo/rimuovendo un'osservazione o reimportando un CSV — mai a ogni render — e il risultato è memorizzato su KV. I sottoinsiemi di recensioni sono precalcolati fuori dal ciclo sulle emivite.

### Osservazioni "in attesa" — limite = ultimo IMPORT, non ultima recensione (fix 12/08/2026)

Un'osservazione è "usabile" solo fino a un limite temporale, altrimenti resta marcata `in attesa` nel registro ed esclusa dal calcolo (non ignorata in silenzio). **Il limite è il timestamp dell'ultimo import del CSV per quella struttura** (`localStorage['qm_ts_rev_'+p]`), calcolato in `revCalibRicalcola(p)` e passato a `calibraDaOsservazioni(recensioni, osservazioni, importTs)`.

**Versione originale (bug)**: il limite era la data dell'ultima recensione *contenuta* nel CSV, non la data dell'import. Caso reale che l'ha scoperto: recensioni ferme al 10/08, osservazione "8.2" registrata il 12/08, poi CSV **ri-esportato e ricaricato lo stesso 12/08** (confermando che non c'erano recensioni nuove) — restava comunque `in attesa` per sempre, perché l'ultima recensione nel CSV era e restava il 10/08. La card "Punteggio medio" continuava quindi a mostrare la stima calibrata sull'osservazione precedente (8.3), disallineata dal valore reale appena letto (8.2), e il target "recensioni per raggiungere X" veniva calcolato su quella base sbagliata.

**Perché il fix è corretto**: un import fresco del CSV, anche se non porta recensioni nuove, **è di per sé la prova** che a quel momento non ce n'erano — non serve aspettare una recensione futura per "sbloccare" l'osservazione. Restava solo da spostare il limite dalla data-recensione alla data-import. Attenzione all'ordine in `revHandleFile`: `localStorage['qm_ts_rev_'+p]` va scritto **prima** di chiamare `revCalibRicalcola(p)` nello stesso handler — altrimenti il ricalcolo legge ancora il timestamp dell'import precedente.

**Caso d'uso resta**: il pannello incoraggia a registrare il punteggio *appena cambia, senza dover ricaricare il CSV* — è il dato più prezioso — ma quelle osservazioni restano `in attesa` finché non arriva un import (nuovo o di conferma) con timestamp successivo alla loro registrazione. Se le osservazioni sembrano "non fare effetto" anche dopo un reimport, verificare che l'import sia avvenuto **dopo** l'orario dell'osservazione, non solo lo stesso giorno.

### Contraddizioni e qualità

Se **nessuna** emivita soddisfa tutte le osservazioni, si mostra un avviso che **elenca le osservazioni e chiede quale rimuovere** — non si scarta niente automaticamente: l'utente sa quale è sbagliata, il dashboard no. Cause riportate nell'avviso: valore digitato male; Booking aggiorna con ritardo o a lotti; recensioni rimosse per moderazione che restano nel CSV; modello inadatto a quella struttura. Nel frattempo si ricade sulla fonte 2.

### "Conflitto" e "fuori modello" sono due diagnosi diverse (fix 23/08/2026)

`calibraDaOsservazioni` segnalava `contraddittorio` ogni volta che nessuna emivita soddisfaceva tutte le osservazioni — **anche quando l'osservazione era una sola**. Su Principe (371 recensioni, registrato 6.6) il pannello diceva quindi *"osservazioni in conflitto — rimuovi quella sbagliata"*, con una sola riga nel registro: niente da rimuovere, e la diagnosi vera taciuta. `revCalibStato` per giunta dà a `contraddittorio` la precedenza su `fuori-modello`, quindi il messaggio corretto non compariva mai.

La distinzione ora è quella giusta:

| Caso | Condizione | Messaggio |
|---|---|---|
| **Conflitto** | ≥ 2 osservazioni, **ognuna riproducibile da sola**, ma nessuna emivita le soddisfa insieme | elenca e chiede quale togliere |
| **Fuori modello** | almeno una osservazione non è riproducibile **nemmeno da sola** | dice di quanto e da che parte |

Il secondo giro (`daSola`) costa quanto il primo, ma si paga **solo quando qualcosa non torna**, mai nel caso normale.

### `range` — di quanto si sbaglia, non solo che si sbaglia

`calibraHalfLife` restituisce anche `range:[min,max]`: i punteggi producibili con quelle recensioni facendo variare l'emivita in tutto l'intervallo esplorato (20–1200 gg). Senza, *"punteggio non riproducibile"* era una constatazione muta — un valore fuori di due centesimi e uno fuori di mezzo punto hanno cause opposte:

- **sotto il minimo** → Booking sta contando qualcosa di peggiore di quanto c'è nel CSV, tipicamente recensioni recenti non ancora nell'export: **riesportare il CSV** è il rimedio;
- **sopra il massimo** → il CSV contiene recensioni che Booking non conta più (moderazione, fuori finestra), oppure il numero è digitato male.

Il valore è memorizzato in `REV_CALIB[p].range` insieme a `nRec`, così il pannello lo mostra senza ricalcolare.

**Ampiezza della fascia = affidabilità** (`revCalibQualita`): > 100 gg `calibrazione debole` · 30–100 gg `discreta` · < 30 gg `solida`. Quando è debole compare il suggerimento attivo *"registra il punteggio ogni volta che cambia cifra: bastano 3–4 osservazioni per dimezzare l'incertezza"*.

**Le osservazioni che catturano un cambio di cifra valgono molto più di quelle che ripetono lo stesso valore** — verificato in test: aggiungendo una terza osservazione che ripete `8.8` la fascia non si stringe affatto, mentre le due che catturano il cambio la portano da 161 a 143 gg. Se il registro contiene solo valori identici il pannello lo segnala esplicitamente (`tuttiUguali`).

### Migrazione

`revCalibMigra()` converte il vecchio formato a valore singolo (`{scoreReale, ts, hl, fascia}`) nella prima riga del registro. Gira a ogni `revCalibLoad()`, è idempotente (salta i record che hanno già `osservazioni`).

### Regola di arrotondamento — e come monitorarla

Si assume che Booking **arrotondi**: `soglia = targetVisualizzato - 0.05`. Verificato sui dati SoulArt: se troncasse servirebbe 8.90 pieno per vedere 8.9, ma il massimo ottenibile con qualsiasi emivita è 8.8765 — sotto 8.90 — mentre Booking mostra 8.9. Quindi l'arrotondamento è l'ipotesi corretta.

**Segnale di allarme**: se in futuro la calibrazione restituisse `fuoriModello` in modo sistematico su più strutture, è il sintomo che la regola di arrotondamento (o il modello) va rivista. I casi sono loggati in console da `revCalibApply`.

### Simulazione previsionale

Il vecchio calcolo teneva i pesi **congelati** e sovrastimava molto lo sforzo (per SoulArt ~74 recensioni contro le ~10 reali). `revSimulaTarget` simula giorno per giorno: le recensioni esistenti **invecchiano** (e possono uscire dalla finestra 36 mesi) mentre le nuove arrivano al ritmo storico della struttura, distribuite uniformemente. Restituisce il primo giorno in cui si supera la soglia, esposto sia in **numero di recensioni** sia in **tempo stimato**, con un intervallo calcolato sugli estremi della fascia di emivite compatibili.

**Caso "non raggiungibile"**: con una media ponderata il punteggio converge alla media delle recensioni in arrivo. Se il voto del flusso è ≤ soglia il target è irraggiungibile **a prescindere dal tempo**, e viene detto esplicitamente invece di restituire un numero. Per SoulArt la media reale degli ultimi 12 mesi è 8.86, sotto la soglia 8.95 dell'obiettivo 9.0.

### Peso delle recensioni in scadenza — `revEffettoScadenze()`

Quanto conta l'uscita dalla finestra dei 36 mesi **dipende tutto dall'emivita calibrata**, quindi va misurato per struttura invece di assumerlo. Peso di una recensione al 1094° giorno rispetto a una di oggi:

| Emivita | Peso residuo | Serve per valerne una di oggi |
|---------|--------------|-------------------------------|
| 64 gg | 0,001% | ~140.000 |
| 173 gg | 1,2% | 80 |
| 285 gg | 7,0% | 14 |
| 500 gg | 21,9% | 5 |
| 800 gg | 38,8% | 3 |

Nel vecchio modello a bucket la fascia 24–36 mesi pesava un **5% fisso** a prescindere dall'età: sovrastimava le scadenze delle strutture grandi (emivita corta) e sottostimava quelle delle strutture piccole con storico lungo, dove l'emivita calibrata è molto più alta e una singola uscita sposta il punteggio di centesimi.

`revEffettoScadenze(scored, hl, oggiTs, orizzonteGg)` restituisce `{nUscita, pesoUscita, quotaPeso, mediaUscita, scoreOra, scoreFut, deriva, pesoEffOra, pesoEffFut}`. La **deriva** è dove va il punteggio fra N giorni senza nuove recensioni: somma invecchiamento e uscite.

Usata in due punti:
- **Riquadro obiettivo**: la nota scadenze è quantificata (`N rec = X% del peso`) invece del generico `⚠️ N recensioni in scadenza`, e sotto lo 0,5% dice esplicitamente *ininfluenti*.
- **Pannello impatto**: riga "fra 90 giorni" con recensioni in uscita, quota di peso, deriva e nuovo peso effettivo.

**Attenzione a non confondere due cose diverse**: il calo del peso effettivo su 90 giorni è quasi tutto **invecchiamento** dello storico, non scadenze. Su una struttura grande con emivita ~136-173 gg il peso passa da ~147 a ~102 (−30%) mentre le uscite valgono lo 0,55%. Il testo della UI lo dice esplicitamente, perché attribuire il calo alle scadenze porterebbe a decisioni sbagliate.

La **simulazione previsionale tiene già conto delle uscite**: `revSimulaTarget` scorre il tempo su tutto lo storico e salta le recensioni oltre `REV_FINESTRA_GG`, quindi non serve correggerla a valle.

### Pannello "Impatto della prossima recensione"

Prima mostrava solo `delta(voto) = (voto - score) / (pesoEff + 1)` come griglia di sei numeri colorati. **Riprogettato attorno alla domanda operativa vera**: non "di quanto scende il decimale interno" ma **quale voto fa cambiare la cifra che Booking mostra**. Il delta da solo non lo dice — serve ricalcolare `score + delta` e riarrotondare a una cifra:

```
delta(voto)  = (voto - score) / (pesoEff + 1)
nuovoScore   = score + delta(voto)
nuovoDisplay = Math.round(nuovoScore * 10) / 10
```

Tabella per voto (10, 9, 8, 7, 5, 3) con quattro colonne: Voto, Delta, Nuovo score, **Mostrato**. Le righe sono evidenziate **solo dove il display cambia davvero** (rosso se scende, verde se sale) — se metà delle righe è colorata il colore smette di significare qualcosa, come già successo nella tabella Inventari.

In testa al pannello:
- **Margine dalla soglia** (`score - soglia`, es. `+0.097 sopra 8.75`). Sotto `0.010` diventa **stato di allerta** rosso: basta una recensione mediocre per cambiare cifra.
- **Voto più basso che non fa scendere la cifra**, ricalcolato ciclando `v` da 1 a 10 e prendendo il primo il cui display resta ≥ a quello attuale ("fino a un 7 resti a 8.9; da 6 in giù scende"). È la soglia operativa comunicabile in hotel.

**È un pannello aggiuntivo**: "Recensioni in scadenza" (`revRenderExpiring`) resta dov'è e invariato, non è stato sostituito.

### Pannello "Distribuzione del peso nel tempo" — `revRenderDistrib()`

Rende visibile perché poche recensioni recenti spostano il punteggio mentre centinaia di vecchie non contano quasi nulla — la domanda che nasce naturalmente vedendo `652 importate · peso effettivo ≈ 119`.

Fasce di ampiezza pari a **un'emivita** (`0–hl`, `hl–2hl`, `2hl–3hl`, `3hl–5hl`, `oltre 5hl`): per costruzione del decadimento esponenziale la prima vale circa il **50%** del peso, la seconda circa il 25%, e così via. Per ciascuna: numero recensioni, quota % del peso (con barra orizzontale proporzionale) e media dei voti.

La **media di ogni fascia è colorata rispetto alla soglia obiettivo** (verde sopra, rossa sotto): si legge a colpo d'occhio se il periodo che sta *guadagnando* peso è migliore o peggiore di quello che lo sta *perdendo* — cioè se il punteggio sta peggiorando prima che il numero mostrato cambi.

Riga di sintesi sotto la tabella: *"le recensioni degli ultimi N giorni valgono da sole metà del punteggio"*, con N ricavato **cumulando le quote reali** fino a superare 0.5, non assunto uguale all'emivita (che lo approssima soltanto).

### Tutti i punti che mostrano IL punteggio devono usare `punteggioBooking` + `revHl(p)`

Sono **tre** e vanno tenuti allineati, altrimenti la stessa struttura mostra numeri diversi nella stessa pagina:

| Punto | Funzione |
|-------|----------|
| Card "Punteggio medio" | `revRenderStats` → `punteggioBooking(scored, hl, now)` |
| Grafico "Andamento score" (icona ⤢) | `openScoreTrend` → `_trendHl` |
| "Score attuale" nel pannello Recensioni in scadenza | `revRenderExpiring` → `_expHl` |

Il pannello **Recensioni in scadenza** aveva una sua `calcScore` interna a 85/10/5: la struttura del pannello non andava toccata, ma continuava a mostrare `8.8` mentre la card sopra mostrava `8.9`. Ora usa `punteggioBooking`. Nello stesso pannello i chip `BUCKET: F1 (85%) · F2 (10%) · F3 (5%)` non avevano più senso e sono diventati **"Peso per età"**: quanta parte del peso effettivo porta ogni fascia d'età, calcolata sui pesi reali (es. con emivita 64 gg: 0–6 mesi 86%, 6–12 mesi 12%, 1–2 anni 2%, 2–3 anni 0%). Molto più informativo delle percentuali fisse, e mostra a colpo d'occhio perché le recensioni vecchie non spostano il punteggio.

### Pannello "Recensioni in scadenza" — adattivo

Col decadimento calibrato le recensioni in uscita sono la **coda più leggera** dello storico, quindi il pannello quasi sempre non dice nulla di azionabile. Misurato su SoulArt (652 rec, emivita 174 gg): le ~8 recensioni che scadono questa/prossima settimana pesano lo **0,075%** del totale — per spostare il punteggio visualizzato di 0,1 dovrebbero avere una media che si scosta di **134 punti** su una scala 1–10, impossibile per costruzione. Col vecchio modello a bucket la fascia 24–36 mesi valeva un 5% fisso e una scadenza si vedeva davvero: è da lì che nasceva il pannello.

Resta invece rilevante sulle **strutture piccole con storico lungo**, dove l'emivita calibrata è molto più alta e poche uscite valgono punti percentuali veri.

Quindi il pannello si **auto-riduce**: `revRenderExpiring` calcola lo scostamento realmente prodotto dalle uscite (`scoreAfterBoth` vs `scoreAttuale`) e se è sotto 0,01 **e** non cambia il punteggio arrotondato, rende una riga sola ("N in scadenza, pesano X%, effetto invisibile") invece del pannello esteso. Il criterio usa la differenza **calcolata**, non una stima sul numero di recensioni.

Comportamento verificato:

| Scenario | Emivita | Peso in uscita | Δ punteggio | Modalità |
|----------|---------|----------------|-------------|----------|
| Struttura grande | 174 gg | 0,06% | 0,0001 | compatta |
| Struttura media | 350 gg | 0,44% | 0,0025 | compatta |
| Struttura piccola, storico lungo | 600 gg | 1,25% | 0,0206 | **completa** |

### Cosa NON è stato toccato

Import CSV, conteggio "senza risposta", **score per categoria** e **andamento categorie** (restano a 85/10/5 per scelta: sono metriche per categoria, non IL punteggio della struttura), filtri e ordinamenti della lista, la logica di scadenza settimanale del pannello Recensioni in scadenza, tutta la sezione **Recensioni Expedia** (modello di punteggio diverso).

### Nota metodologica (riportata anche nella UI)

L'algoritmo di Booking.com non è pubblico. Questo è un modello **calibrato** sul punteggio reale della struttura, non una replica. Anche dopo la calibrazione resta una fascia di emivite compatibili (per SoulArt 62–285 giorni), quindi le previsioni vanno lette come **ordini di grandezza**.

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
| 1351 | OVERVIEW — RENDER PRINCIPALE + INIT + POLLING 60s | `refreshOverviewForDate()`, polling loop, `renderArriviData()` |
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

## Icone Sidebar — badge SVG navy/oro (`.nav-icon-badge`)

13 delle voci del menu principale usano un badge SVG inline (cerchio navy `var(--accent)`, anello oro `var(--gold)`, icona bianca stroke/fill 18px) al posto della foto PNG originale — stesso linguaggio visivo dei bottoni di Reception (`.btn-badge` in `reception.html`). Classe `.nav-icon-badge` in `style.css`, stesso ingombro 38px di `.nav-icon-img` così l'allineamento con le voci rimaste a icona PNG non cambia.

**Voci convertite**: Overview (casa), Registration Cards (passaporto), Bilanciamento Camere (ex "Room Division"/"Suddivisione Camere", chiave), Distribuzione Culligan (goccia d'acqua), Breakfast Sheet (tazza), Operativa HKP (ex "Operativa Housekeeping", scopa), Passaggi di Cassa (glifo € pieno — stessa icona del bottone "Conta e conferma fondo cassa"), Preferenze Turni (calendario con spunta), Turnazione Corrente (gruppo persone), Recensioni Booking (stella piena), Recensioni Expedia (stella outline), DVR (scudo), Inventari e Ordini (scatola), Spese Fornitori (grafico a barre), Pannello App (griglia app).

Non c'è generazione di file immagine: sono tutti `<svg>` inline nel markup di `index.html`, nessun asset in `img/icons/` aggiunto o modificato — i PNG originali restano nella cartella ma non più referenziati da queste voci.

### Icone Upload Center — `.uc-icon-badge`

Stesso trattamento applicato alle 4 card visibili dell'Upload Center in sidebar (`.uc-slot`): classe `.uc-icon-badge` in `style.css` (32px, stesso ingombro di `.uc-icon-img`) — Turno (griglia turni), Riepilogo Reception (campanello), Piano Settimanale (calendario settimana), Report pasti (posate). Le card nascoste (`uc-pul`, `uc-soul`, `uc-bout` — non più nel flusso upload da quando `HKP_DERIVE_FROM_PIANO=true`, vedi sezione "Upload quotidiani") restano con l'icona PNG originale, irraggiungibili comunque dall'interfaccia.

### Layout Upload Center — `.uc-row` / `.uc-row-cards` (non più CSS grid condivisa)

Ogni "riga" di card è un `<div class="uc-row">` indipendente che contiene un `.uc-row-cards` (flex, le card sempre affiancate) seguito dai `.uc-panel` di quella riga (block, non più `grid-column:1/-1` dentro una grid unica). Prima tutte le card e tutti i pannelli condividevano un'unica `.uc-grid{display:grid}`: aprire il pannello di una card a metà lista (es. "Piano Settimanale") spingeva in basso, fuori dal loro allineamento a coppia, tutte le card successive — e per "Report pasti" il pannello finiva addirittura sotto la tile del logo Compass invece che sotto la propria card, perché quest'ultima ha `grid-column:1/-1` e la ricalcolava fuori posto nell'auto-placement della grid condivisa.

Righe attuali: (Turno, Riepilogo Reception) · `uc-row-derived` (Report pulizie, Compass Housekeeper SoulArt, Compass Housekeeper Boutique — nascosta in blocco da `ucHideDerivedSlots()` quando `HKP_DERIVE_FROM_PIANO=true`, non più le singole card) · (Piano Settimanale, Report pasti) · tile logo Compass da sola. Ogni pannello resta un fratello diretto delle sue card nello stesso `.uc-row`, quindi si apre sempre subito sotto di esse indipendentemente da cosa c'è nelle righe successive.

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
| `view-hkpsheet` | Operativa HKP (Housekeeping) — SoulArt Hotel |
| `view-miniapp` | Pannello App — centro controllo delle 5 app standalone (ex "Mini App") |
| `view-inventario` | Inventario detersivi (stock + movimenti + analisi + ordini) |
| `view-turni-pref` | Preferenze turni staff (da Google Forms) |
| `view-turnazione` | "Turnazione Corrente" — specchio del pannello turno di Overview (`.staff-area-mirror`) |
| `view-controllo-mattino` | Dashboard distribuzione Culligan (stats + QC settimanale + Stampa A4) |
| `view-reception` | Fondo Cassa & Incasso Contante — sola lettura + modifica per il QM |
| `view-resi-biancheria` | Resi biancheria inidonea al fornitore Raimondo (solo SoulArt, solo QM) |
| `view-prestay` | Pre-stay — messaggi agli ospiti in arrivo fra 2 giorni |

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

### L'anno NON lo indovina il modello (`_annoPlausibile`)

Il planning fotografato riporta "lunedì 30 marzo" **senza anno**. Il prompt dichiara quindi
la data odierna (`OGGI È ${_oggiIso}`) e istruisce a usare l'anno corrente; anche gli
esempi dentro il prompt si generano da `_annoOggi`, non sono scritti a mano.

In più, ogni data restituita passa da `_annoPlausibile()`, che corregge l'anno quando è
palesemente sbagliato — è già successo: un turno di agosto 2026 caricato e datato 2025,
con l'intestazione dell'Overview che mostrava l'anno sbagliato tutti i giorni.

La regola è **deliberatamente prudente**, e la prima versione ("scegli l'anno più vicino a
oggi") era sbagliata — spostava al 2027 un planning di gennaio 2026, che è legittimo:

> Si corregge **solo** se la data dista più di **180 giorni** da oggi **e** se cambiando
> anno (±3) torna entro **90 giorni**. Altrimenti si lascia com'è.

La scelta è **per singolo giorno**, non per l'intera settimana, così le settimane a cavallo
di capodanno restano corrette (giorni della stessa settimana possono appartenere ad anni
diversi).

**Attenzione**: agisce al caricamento. Un turno **già in memoria** con l'anno sbagliato non
si corregge da solo — va ricaricato il planning, oppure corretto direttamente il valore
`qm_weekData` su KV (fatto il 2026-08-20; ricordarsi che il browser adotta la versione dal
cloud solo se `_ts` è **maggiore** di `qm_ts_turnoTs` in localStorage).

### Niente più auto-sync da Google Sheets

Il vecchio sistema di aggiornamento automatico dal foglio Google è stato rimosso. Rimane solo il **KV sync tra dispositivi**: quando si carica il turno su un PC, appare su tutti gli altri PC dell'hotel entro un minuto (subito, su una postazione che torna in primo piano).

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

### Nuova sezione "Housekeeping" (menu)

Creata una sezione menu propria **Housekeeping**, tra "Operativo Quotidiano" e "Reception", che raggruppa:
- **Operativa HKP** — voce diretta su `view-hkpsheet` (SoulArt). Dal 17/08/2026 **Art Resort è stato rimosso**: restando una sola struttura, il gruppo a fisarmonica e la scelta nel menu non avevano più ragione d'essere. Rimossi anche `view-hkpsheetar`, la chiave `ar` in `HKP_URL_DEFAULTS`/`HKP_CONFIG` e la funzione `toggleHkpGroup`.
- **Bilanciamento Camere** (ex "Room Division", poi "Suddivisione Camere", `view-room-division`) — stesso `onclick="setView('room-division',this)"` e stessa icona di prima, solo spostata di sezione e rinominata.

Entrambe le voci prima vivevano dentro **Operativo Quotidiano**. `pageTitles['room-division']` è ora `'Bilanciamento Camere'`, `breadcrumbs['room-division']` è `'Housekeeping'`, `breadcrumbs.hkpsheet`/`breadcrumbs.hkpsheetar` sono `'Housekeeping · Operativa HKP'`. Il `<span class="panel-title">` della vista `view-room-division` è stato aggiornato allo stesso modo.

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
  if (['R','RIPOSO','RIPOSO RICHIESTO','R RICHIESTO','RECUPERO','MALATTIA','OFF','FERIE'].includes(u)) return true;
  return u.includes('RECUPER')||u.includes('RIPOSO')||u.includes('MALATTIA')||u.includes('FERIE')||u.includes('RICHIEST');
};
```

`IS_ABSENT` ritorna `true` solo per valori espliciti di assenza, non per chi semplicemente non è in turno (cella vuota/`undefined`, che resta `false`). **`R Richiesto`** (riposo richiesto dal dipendente, scritto abbreviato nel turno) conta come riposo tanto in `IS_ABSENT` quanto in `IS_REST` — entrambe matchano via `u.includes('RICHIEST')`, non solo la stringa "RIPOSO RICHIESTO" per esteso.

### Trattino nel turno — non è un riposo, è "non pertinente"

Un **trattino** (`-`/`–`/`—`) nella cella del turno è diverso sia da una cella vuota sia da un vero riposo: significa che quella persona/giorno non è pertinente (es. non ancora assunta, fuori roster quella settimana), non che abbia richiesto un giorno libero. `IS_REST('-')` è comunque `true` (va escluso da "in turno", corretto: non sta lavorando), ma non deve MAI comparire come "Riposo" — né nella striscia "Non in servizio" di `renderDay()`, né nel widget `paoloTurno` della sidebar. Per questo esiste `IS_DASH(v)`, usata per escludere esplicitamente il trattino da quelle liste anche se `IS_REST` lo classificherebbe come riposo:

```js
const IS_DASH = v => {
  if (!v) return false;
  const u = v.trim();
  return u==='-'||u==='–'||u==='—';
};
```

Applicata in due punti:
- `renderDay()`, calcolo di `nonServizio`: `IS_REST(...) && !IS_DASH(...)` — chi ha il trattino non entra nella striscia "Non in servizio".
- `paoloTurno` (sidebar, `refreshOverviewForDate`): se il turno di Presta P. è un trattino mostra `'Quality Manager'` (stato neutro) invece di `'Riposo'` in rosso.

`IS_ABSENT` resta senza il trattino nell'elenco esplicito (di proposito — vedi tabella "Global Variables & Constants"): un trattino non deve contare né tra gli "in turno" né tra i "non in servizio" nei conteggi della sidebar (`updateSidebarInfo`).

**Il trattino deve arrivare intatto dal parsing.** `IS_DASH` funziona solo se il valore del turno salvato è davvero il carattere `"-"`. Il prompt di `handleTurniFile` (upload screenshot/PDF via Claude) ha una regola dedicata per questo — **regola 4**, che PRIMA convertiva ogni cella con trattino in `"R"` prima di salvarla, rendendo `IS_DASH` inutile perché il dato originale era già perso. Ora la regola dice esplicitamente di scrivere `"-"` nel JSON:

> `4. Celle con solo un trattino ("-") → metti esattamente "-" nel JSON, NON convertirlo in "R" [...]. Celle con solo "." o completamente vuote → metti "R".`

Se il trattino torna a comparire come "Riposo" nonostante `IS_DASH` sia presente, il primo sospetto è questa regola nel prompt (non la logica JS): un caricamento del turno fatto PRIMA di questa correzione ha già salvato "R" al posto del trattino in `weekData`, quindi serve un **nuovo upload** per rigenerare i dati corretti — il vecchio weekData in localStorage/KV non si autocorregge.

### Manutenzione (`mt`) — non deve mai sparire

Il reparto `mt` ha un solo addetto fisso (Basile G.). Le altre card in `renderDay()` restano nascoste quando nessuno è in turno (`if(!showMembers.length)return;`), ma per `mt` questo dava l'impressione di un dato mancante quando l'addetto è a riposo/ferie — la card spariva del tutto invece di mostrare "nessuno in turno". Fix: solo per `key==='mt'`, quando `showMembers` è vuoto viene comunque renderizzata la card con un placeholder ("Nessuno in turno") invece di fare `return` senza stampare nulla. Le altre card (fo/hk/bkf) restano nascoste come prima quando vuote.

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

### Tab Analisi — consumo settimanale (`invRenderAnalysis`)

Il filtro periodo (7/30/90 giorni, o "Tutto") controlla sia la finestra dei movimenti considerati sia il divisore usato per proiettare il consumo a settimana. Il divisore (`effectiveDays`) **non deve avere un minimo di 14 giorni quando il periodo è fisso e scelto dall'utente** — solo quando `_invPeriod===0` ("Tutto"), dove `days` è ricavato dallo storico reale del prodotto (può essere di 1-2 giorni per un prodotto appena inserito, da smorzare). Applicare comunque il minimo 14 col filtro "7 giorni" **dimezzava** il consumo mostrato (divideva un consumo reale di 7 giorni per 14) e quindi raddoppiava l'autonomia stimata, facendo sparire prodotti realmente critici dalla sezione "Da riordinare". Fix:

```js
const effectiveDays=_invPeriod>0?days:Math.max(14,days);
```

### Tabella dettaglio prodotti — media/sett e media/mese sempre su tutto lo storico

Prima la tabella mostrava un'unica colonna "Cons./sett" legata al filtro periodo selezionato sopra, in ordine alfabetico. Due problemi: (1) una "media" che cambia a seconda di quale bottone hai cliccato non è più una media, è il dato di un periodo; (2) l'ordine alfabetico nasconde a colpo d'occhio quali prodotti si consumano di più.

Aggiunte **due colonne fisse, indipendenti dal filtro periodo**: `mediaSett` e `mediaMese`, calcolate sempre su tutto lo storico del prodotto (stesso smorzamento minimo 14gg di "Tutto", mai sui giorni del filtro corrente):

```js
const allOuts=bm.filter(m=>m.type==='out').reduce((s,m)=>s+m.qty,0);
const storicoDays=bm.length?Math.max(1,Math.ceil((now-Math.min(...bm.map(m=>m.ts)))/86400000)):1;
const mediaDays=Math.max(14,storicoDays);
const mediaSett=allOuts>0?Math.round((allOuts/mediaDays)*7*10)/10:0;
const mediaMese=allOuts>0?Math.round((allOuts/mediaDays)*30*10)/10:0;
```

Il filtro periodo (7/30/90/Tutto) in cima continua a controllare solo i KPI "Totale scaricato/caricato" e la sezione "Da riordinare" (autonomia), che invece è giusto restino legati a un periodo recente — sono domande diverse ("quanto dura in media" vs "cosa sta succedendo adesso").

La tabella è anche stata **riordinata per consumo medio settimanale decrescente** (`sorted.sort((a,b)=>b.mediaSett-a.mediaSett)`), non più alfabetico: i prodotti che si consumano di più sono in cima.

**Poi estesa a 6 colonne** (media e consumo reale affiancati per settimana e mese, in tabella con intestazioni raggruppate `SETTIMANA`/`MESE`) — **ma con 6 colonne numeriche quasi ogni riga aveva un numero rosso o verde**, il colore smetteva di distinguere "questo prodotto ha un problema" da "questo prodotto è normale": era rumore visivo, non segnale. Giudicata "UI brutta" dall'utente.

**Rifatta come "Opzione B"** tra tre alternative mostrate (A: card con barra di confronto; B: tabella leggera con badge; C: raggruppamento per andamento) — scelta B. Prima versione: media e reale ENTRAMBI dietro l'accordion, solo "Prodotto/Stock/Ritmo" in vista — **corretto dopo che l'utente ha fatto notare di dover vedere le medie senza cliccare**: `Media/sett` e `Media/mese` sono tornate **colonne sempre visibili** (6 colonne totali: Prodotto, Media/sett, Media/mese, Stock, badge Ritmo, freccetta). **Solo il consumo REALE di dettaglio** (ultimi 7gg / da inizio mese) resta nell'accordion `invAnToggle(bc)` (stesso pattern di `ddtToggle`) — è quello che, se rimesso sempre in vista accanto alla media, ricreerebbe le sei colonne colorate del design scartato.

```js
const ritmo=it=>{
  const rS=it.mediaSett>0?it.cons7gg/it.mediaSett:null;
  const rM=it.mediaMese>0?it.consMeseCorr/it.mediaMese:null;
  const cands=[rS,rM].filter(r=>r!==null);
  if(!cands.length)return{label:'nessun dato',...};
  const worst=Math.max(...cands),best=Math.min(...cands);
  if(worst>=1.3)return{label:'sopra media',...};   // ambra
  if(best<=0.6)return{label:'sotto media',...};    // verde
  return{label:'in linea',...};                    // neutro
};
```

Il badge guarda **lo scarto più marcato tra settimana e mese** (non due giudizi separati che potrebbero contraddirsi): se anche solo uno dei due periodi è fuori soglia, il prodotto è segnalato. Stesse soglie di prima (+30%/-40%), ma ora producono **un badge per riga** invece di **fino a due numeri colorati per riga** — la maggioranza dei prodotti "in linea" torna visivamente neutra, i pochi fuori norma risaltano davvero.

Righe dispari e "Da riordinare" (bordo sinistro rosso/ambra su autonomia critica) restano come prima; solo la presentazione dei dati di consumo è cambiata.

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

### Tabella "Spesa e coperti mensili" — variazione mese su mese ridisegnata

La tabella nella dashboard (Compass) aveva solo `MESE | SPESA TOTALE | COPERTI BB`; `breakfast.html` aveva in più le colonne **VAR%** (spesa e coperti, mese su mese) con badge colorato. Prima allineate mostrando le stesse 5 colonne su entrambi (`MESE | SPESA | VAR% | COPERTI | VAR%`).

**Poi giudicata "troppo difficile" e ridisegnata** (stessa logica su Compass e `breakfast.html`, tenerle allineate se si tocca una delle due):

- **Due colonne "VAR%" identiche erano ambigue** — non si capiva a colpo d'occhio quale percentuale appartenesse a spesa e quale a coperti. Ora il delta sta **sotto il valore a cui si riferisce** (niente colonne separate), con il mese e il valore di confronto scritti per esteso (`↑ 10.0% vs € 3.000,00 Giu`) invece di una percentuale nuda.
- **Il mese in corso confrontava i primi N giorni contro il mese precedente INTERO** — mostrava quindi sempre e comunque un calo enorme, indipendentemente dal ritmo reale (es. 9 giorni di agosto contro tutto luglio). Corretto con un confronto **a parità di giorni**: primi N giorni del mese in corso contro i primi N giorni del mese precedente (`_spesaPrimiGG`/`_copPrimiGG` in `app.js`, filtrano DDT per giorno e `bkfHist`/`_bkfHistory` — quest'ultimo ha granularità giornaliera per data `YYYY-MM-DD` — allo stesso modo). Le righe dei mesi passati (mese pieno) restano confrontate a mese pieno, invariato.
- **Aggiunta la colonna € / COPERTO** (spesa ÷ coperti): è il numero che dice se il costo per ospite sta davvero salendo. Prima spesa e coperti potevano mostrare due frecce diverse senza dire nulla sull'efficienza reale — es. spesa +10% e coperti +10% nello stesso mese sembrano due segnali contrastanti da leggere separatamente, ma il costo per coperto è **invariato**: è esattamente questo che la colonna nuova rende immediato da vedere, cosa impossibile prima.
- Il mese senza precedente da confrontare mostra `mese prec. n/d` invece di un trattino muto.

Verificato con dati sintetici (`osascript`): confronto a parità di giorni corretto, colonna €/coperto stabile quando spesa e coperti si muovono in proporzione, riga di mese pieno confrontata a mese pieno.

### Ordine sezioni tab Analisi — Proiezione prima di Spesa e coperti; rimossa "Variazione mese su mese"

Due modifiche successive (stessa logica su Compass e `breakfast.html`):

- **🔔 Proiezione mese corrente** (l'alert con spesa-a-oggi vs proiezione fine mese) ora è la **prima** sezione della tab Analisi, prima di "☕ Spesa e coperti mensili": è l'informazione più immediatamente azionabile (dove sta andando la spesa *questo* mese), la tabella sotto è lo storico di dettaglio.
- **Eliminato interamente il pannello "📊 Variazione mese su mese"** (su Compass; su `breakfast.html` la stessa logica esisteva già come variabile `variazioni` calcolata ma mai renderizzata — codice morto, rimosso anche quello). Scomponeva la variazione di spesa in "impatto coperti" vs "prezzi & volumi" — giudicato di troppo dettaglio/difficile da leggere insieme alla tabella sopra, che con la colonna €/coperto copre già la stessa domanda in modo più diretto. Non toccare per errore il testo `_varLine`/i delta della tabella "Spesa e coperti mensili" (sezione precedente) pensando che sia lo stesso pannello: sono due cose diverse, uno resta e uno è stato tolto.

### Modifica di un DDT già inserito — su Compass e su `breakfast.html`

Prima si poteva modificare un DDT già salvato **solo** su `breakfast.html` (`ddtBkfOpenEditModal`). Su Compass c'era solo "🗑 Elimina DDT" nella riga di dettaglio della lista (`ddtRenderList`), niente modifica: per correggere un prezzo bisognava cancellare e ricaricare da capo.

Aggiunto `ddtOpenEditModal(id)` in `app.js`, speculare a quella di `breakfast.html`: precompila `_ddtParsedData` col DDT esistente e riusa la stessa maschera dell'inserimento (`ddtShowParsedResult`). Nuova variabile `_ddtEditingId` — quando è valorizzata, `ddtConfirmSave()` aggiorna il record esistente nell'array invece di pusharne uno nuovo; `ddtCloseModal()` la resetta a `null`. Bottone **"✏️ Modifica"** accanto a "🗑 Elimina DDT" nella riga di dettaglio.

**Nota**: in modalità modifica su Compass, fornitore e hotel restano quelli originali (non c'è un campo per cambiarli nella maschera — a differenza di `data`/`numero_ddt`/`totale`/articoli, che sono tutti editabili). Se in futuro serve poterli correggere, va aggiunto un campo fornitore/hotel dentro `ddtShowParsedResult` come già fa `ddtBkfShowParsed` su `breakfast.html`.

### Ricalcolo automatico dei totali — `ddtRecalcRowTotale()` / `ddtRecalcTotaleOrdine()` (`ddt-shared.js`)

Prima modificare qtà o prezzo unitario di una riga (in inserimento o in modifica, su entrambi i file) non toccava il campo Totale della riga né il Totale del DDT: bisognava ricalcolarli e digitarli a mano. Due funzioni pure in `ddt-shared.js` (nessun accesso al DOM, quindi utilizzabili identiche da entrambi i file):

```js
function ddtRecalcRowTotale(articoli,i){       // totale riga = qta × prezzo_unit
  const a=articoli[i]; const q=Number(a.qta),p=Number(a.prezzo_unit);
  if(!isNaN(q)&&!isNaN(p))a.totale=Math.round(q*p*100)/100;
}
function ddtRecalcTotaleOrdine(d){              // totale DDT = somma dei totali riga
  const somma=(d.articoli||[]).reduce((s,a)=>{const t=Number(a.totale);return isNaN(t)?s:s+t;},0);
  d.totale_ordine=Math.round(somma*100)/100;
}
```

Comportamento (identico in `ddtShowParsedResult` di `app.js` e `ddtBkfShowParsed` di `breakfast.html`):
- `onchange` su **Qtà** o **P.Unit** di una riga → `ddtRecalcRowTotale` (ricalcola quella riga) → `ddtRecalcTotaleOrdine` (ricalcola il DDT) → ri-render.
- `onchange` su **Totale** riga digitato a mano (es. per applicare uno sconto) → **non** tocca qtà/prezzo, ricalcola solo il totale del DDT.
- Rimuovere una riga (`ddtRemoveArticolo`/`ddtBkfRemoveArt`) ricalcola il totale del DDT.

Il campo **Totale € del DDT** in cima alla maschera resta comunque editabile a mano (per allinearlo a un totale con IVA/arrotondamenti diverso dalla somma delle righe): l'ultima modifica manuale a quel campo resta finché non si tocca di nuovo qtà/prezzo di una riga, che lo sovrascrive.

### Report mensile stampabile — `ddtOpenPrintModal()` / `ddtPrintMonthReport(ym)`

Solo su Compass (non su `breakfast.html`). Bottone **"🖨️ Report"** dentro `tabBar` di `ddtRenderSpese()` — a fianco delle due tab, non dentro nessuna delle due, così è visibile sia in "DDT & Fornitori" sia in "Insights Breakfast".

`ddtOpenPrintModal()` apre un modal con un `<select>` dei soli mesi che hanno almeno un DDT caricato (non tutti i 12 mesi dell'anno), più recenti in cima, mese corrente preselezionato quando presente. Se non c'è nessun DDT, un `alert()` lo dice subito invece di aprire un modal vuoto.

**Il report rispecchia il contenuto della tab "Insights Breakfast" (`ddtBuildAnalisi()`), non la tab "DDT & Fornitori"** — è per la responsabile del breakfast, deve leggere l'andamento, non consultare i singoli documenti. Prima conteneva un elenco DDT dettagliato ed era scritto da zero senza ricalcare le sezioni di Insights Breakfast: tolto l'elenco, riscritto per coprire le stesse sezioni, tutte **ricalcolate solo sui DDT `reparto:'bkf'`** (come fa `ddtBuildAnalisi`, esclude DECA/hk e Amonn/altro) e **filtrate al mese scelto**:

| Sezione | Cosa mostra | Nota |
|---------|-------------|------|
| KPI in testa | Spesa, coperti BB, €/coperto, N° DDT — ciascuno con variazione % vs il mese precedente | Stessa fonte giornaliera `qm_bkf_monthly_history` della tabella "Spesa e coperti mensili" |
| 📈 Trend prezzi | Prodotti con un rialzo >5% **nel mese scelto** (non in assoluto): confronta l'ultimo prezzo registrato nel mese con l'ultimo prezzo prima dell'inizio del mese | Diverso da `alerts` di `ddtBuildAnalisi`, che è su tutta la storia — qui la finestra è quella del mese |
| 🏆 Top 10 prodotti per spesa | Ricalcolato solo sui DDT del mese scelto | `ddtBuildAnalisi` lo mostra su tutta la storia; nel report non avrebbe senso, va isolato al mese |
| ⚖️ Stesso prodotto, fornitori diversi | Confronto prezzo medio tra fornitori, solo DDT del mese scelto | Equivalente a `multiItems`, ricalcolato per mese |
| 🏷️ Spesa per categoria | Stessa classificazione della dashboard (`CAT_RULES` + `_speseCatOverride`), solo sul mese scelto | Reso possibile rendendo `CAT_RULES`/`CAT_ICONS_SPESE` **costanti globali** (prima erano locali a `ddtBuildAnalisi`, impossibile riusarle altrove — vedi sotto) |

Se il mese scelto è quello in corso, un avviso in cima dice che spesa e confronti sono parziali (calcolati sui giorni già trascorsi) — niente proiezione a fine mese sul cartaceo: su un report stampato la proiezione diventerebbe subito un dato vecchio e fuorviante, ha senso solo guardando la dashboard in tempo reale.

**`CAT_RULES`/`CAT_ICONS_SPESE` sono ora costanti globali** (spostate sopra `SPESE_CAT_OVERRIDE_KEY`, subito dopo `DDT_FORNITORI`), non più locali dentro `ddtBuildAnalisi()`. `ddtBuildAnalisi()` le usa esattamente come prima (stesso nome, nessuna modifica al suo codice a parte togliere la doppia dichiarazione locale) — è **l'unica copia**, non due copie da tenere allineate: se si tocca la classificazione (aggiungere una keyword, una categoria), farlo qui in cima al file, non dentro `ddtBuildAnalisi`.

Verificato con dati sintetici (`osascript`): mese isolato correttamente dagli altri, DDT non-breakfast esclusi, trend/top/multi-fornitore/categorie tutti ricalcolati sul solo mese scelto con importi verificati a mano, coperti aggregati dalla granularità giornaliera, avviso "mese in corso" quando pertinente.

### Trend prezzi — bottone "Verifica DDT" per risalire ai refusi di scansione

Nel pannello "📈 Trend prezzi" (tab Insights Breakfast di Spese Fornitori, `ddtBuildAnalisi()`), un rialzo >5% è quasi sempre un **refuso della scansione AI** (es. `14,75` letto `59,00`) più che un vero aumento del fornitore. Prima non c'era modo di risalire a QUALE DDT avesse generato il prezzo sospetto se non cercandolo a mano nella lista per fornitore/mese.

`priceMap` ora porta `ddtId`/`numeroDdt` su ogni entry di prezzo (non solo `data`/`prezzo`/`unita`), presi da `ddt.id`/`ddt.numero_ddt` al momento della costruzione. Due punti di accesso diretto, entrambi via `ddtOpenEditModal(id)` (stessa funzione della modifica DDT, vedi sopra):

- **Card alert** (`alerts`, rialzo >5%): bottone rosso "🔍 Verifica DDT NNN" che apre il **`p.latest`** — quello con il prezzo più alto tra i due confrontati, che ha generato l'alert.
- **Riga della tabella storico** (`trendItems`): icona 🔍 nell'ultima colonna che apre il DDT dell'entry con `prezzo===p.max` (`p.sorted.find(...)`, non necessariamente l'ultimo cronologicamente — il massimo storico può essere un DDT più vecchio).

Aprire il DDT da qui usa la stessa maschera di modifica di Compass: si corregge il prezzo lì, si salva, e `ddtConfirmSave()` richiama `ddtRenderSpese()` che ridisegna subito il pannello Trend prezzi con il valore corretto — nessun passaggio aggiuntivo per tornare alla lista DDT.

---

## Operativa HKP (ex "Operativa Housekeeping")

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

## Bilanciamento Camere (ex "Room Division", poi "Suddivisione Camere") — Suggerimenti di bilanciamento (`hkSuggestMoves()`)

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

**`m.start` di uno scambio in blocco NON è l'inizio di un soggiorno** (fix 03/09/2026). È il primo giorno toccato dallo scambio, calcolato come minimo fra i soggiorni futuri di **entrambe** le camere — quindi può benissimo venire dall'altra. La riga del suggerimento lo mostrava però con la stessa formula degli altri tipi di mossa (`soggiorno ${lbl(m.start)} → ${lbl(m.end)}`), e siccome `end` non esiste per un blocco si leggeva:

> `Art 12 ⇄ Art 14 (tutta la settimana)` — *soggiorno Sab 5/9 → —*

mentre il 5 settembre **Art 12 era vuota**: il suo unico soggiorno futuro cominciava martedì 8, e il 5 veniva da Art 14. La mossa era corretta (proprio perché Art 12 è libera da sabato a lunedì può accogliere i soggiorni di Art 14), **a sbagliare era solo il racconto** — che è il caso peggiore: chi verifica sul Piano trova la camera vuota e smette di fidarsi dell'intero pannello.

Ora la mossa porta i periodi veri di ciascuna camera (`perA`/`perB`, costruiti da `_hkPeriodo`) e la riga li elenca: *"Art 12 cede 1 prenotazione (Mar 8/9 in poi) · Art 14 cede 3 prenotazioni (Sab 5/9 → Dom 6/9, …)"*. Il prefisso `soggiorno …` non viene più stampato per questo tipo di mossa. `end:null` significa soggiorno ancora aperto a fine settimana e si scrive *"in poi"*, non una data di partenza inventata. `m.start` resta per l'ordinamento e per la chiave di deduplicazione.

**Regola che ne esce**: una mossa che tocca più soggiorni non ha un "soggiorno" da esibire. Aggiungendo un nuovo tipo di mossa, se non riguarda un singolo soggiorno non riusare `periodo` — porta i suoi periodi veri.

Coperto da **13 controlli** in `test/controlli.js` ("Bilanciamento camere: lo scambio in blocco non inventa soggiorni"), verificati sabotando sia la riga sia i periodi: 1 e 6 falliscono.

### "Ci sono altre possibilità?" — mostra alternative già calcolate, non ne cerca di nuove

`hkSuggestMoves()` calcola sempre **tutte** le mosse valide e migliorative, poi le taglia a `maxN` (default 3) — `out.totMosse` tiene il conteggio prima del taglio, `out.mosse` è la lista tagliata. Il bottone "Ci sono altre possibilità?" (visibile solo se `totMosse>mosse.length`, altrimenti non c'è nulla in più da mostrare) chiama `hkSuggMore()`, che alza `_hkSuggMoreN` di 5 e rirenderizza — non ricalcola l'algoritmo da capo con criteri diversi, semplicemente alza il tetto e mostra alternative che esistevano già. `_hkSuggMoreN` si azzera in `pianoNavRender()` solo quando il giorno selezionato **cambia davvero** (non ad ogni refresh del polling sullo stesso giorno, altrimenti l'espansione sparirebbe da sola pochi secondi dopo averla aperta).

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

### Turni archiviati — sfogliare una settimana passata

La vista **Turnazione Corrente** mostra, sotto le statistiche, il pannello **Turni archiviati**: un pulsante per settimana (`turniArchivioSettimane()`), e cliccandone uno la tabella persone × 7 giorni con i codici originali (`turniRenderArchivio()`). I dati erano in archivio da sempre — si vedevano solo i conteggi aggregati.

Mostra **chi compare in quella settimana**, non chi è in organico oggi: un extra di tre settimane fa deve restare visibile, altrimenti il turno archiviato non è più quello che era. Ricevimento in alto nell'ordine di `turniOrdina()`, poi housekeeping e altri. Riposi in grigio, ferie in ambra, malattie in rosso.

---

## Periodic Timers

| Intervallo | Scopo |
|-----------|-------|
| 10 sec | `updateSbClock()` — **inerte**, vedi Funzioni Chiave: gli elementi che aggiornava non esistono più |
| 10 min | `fetchMeteo()` — aggiorna previsioni meteo |
| 60 sec | Polling overview + cloud sync + `turniPrefLoad()` + sync weekData da KV — **solo a scheda visibile**, vedi [Consumo KV](#consumo-kv--il-polling-si-ferma-a-scheda-nascosta) |

---

## Splash — solo alla prima apertura, non a ogni aggiornamento

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

## Service Worker (`sw.js`)

Versione corrente: **`qm-v26`**. Pattern:
- **Proxy/KV/Google Sheets/cataloghi barcode** → sempre network, mai cache
- **HTML files** → **sempre rete, mai cache** (`cache:'no-store'`, nessun ripiego). Non è una svista: la copia salvata veniva servita quando la rete al risveglio non rispondeva subito — cioè all'apertura dell'app da spenta — e riapparivano versioni vecchie all'infinito. GitHub Pages manda inoltre `cache-control: max-age=600` sugli HTML, quindi senza `no-store` il telefono riusa comunque la pagina per 10 minuti. **Prezzo accettato**: senza rete le pagine non si aprono (vivono di dati cloud, e una pagina vecchia che mostra numeri sbagliati è peggio di una che non si apre)
- **Asset statici** → cache-first (il cache buster gestisce gli aggiornamenti)

### UN SOLO service worker per tutto il sito — non reintrodurne uno per app

`sw.js` è registrato da `index.html`, `housekeeper.html`, `controllo-mattino.html`,
`inventory.html` e `dvr.html`. `breakfast.html` non ne registra nessuno (mai avuto).

Fino al 2026-08-18 esistevano **quattro** service worker (`sw-housekeeper.js`,
`sw-inventory.js`, `sw-dvr.js` e questo), ognuno registrato dalla propria app ma tutti
**sullo stesso scope radice**. Il browser tiene un solo service worker per scope: ogni
app che si apriva *sostituiva* la registrazione della precedente, e all'attivazione
eseguiva `caches.keys().filter(k => k !== CACHE).map(delete)` — cancellando quindi le
cache delle altre app, che non riconosceva come proprie. Le pagine venivano così servite
a intermittenza da versioni diverse (sintomo osservato: lo splash a volte vecchio a volte
nuovo, senza una regola apparente). Tre dei quattro avevano anche perso il
`cache:'no-store'` sull'HTML, che peggiorava la cosa ma **non ne era la causa**.

I tre file per-app (`sw-housekeeper.js`, `sw-inventory.js`, `sw-dvr.js`) sono stati
**eliminati** il 2026-08-20, a migrazione conclusa: nessuna pagina li referenziava più. Se
un dispositivo molto vecchio provasse ancora a registrarli, `register()` fallisce e il
`.catch()` già presente lo assorbe — l'app resta usabile, semplicemente senza service
worker finché non ricarica. **Non reintrodurli.** Se serve cambiare la strategia di cache,
si cambia solo qui.

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

### Scrittura sicura dei registri — due postazioni non si cancellano i movimenti

Stessa classe di problema dei pre-stay (22/08/2026), su denaro contato: `kvSetLocal` (`reception.html`) e `_receptionSave` (`app.js`) scrivevano **l'elenco intero** con la copia che quella postazione si portava dietro. Due receptionist che registravano nello stesso momento da due PC si cancellavano un movimento a testa, in silenzio — e il polling a 30s che *sostituiva* `_fondo` con la copia del cloud faceva sparire anche in locale un movimento la cui scrittura non era andata a buon fine.

Ora si rilegge e si **unisce per `id`** (`_cassaUnisci`, stessa funzione duplicata nei due file — `test/esegui.sh` controlla che ci sia in entrambi):

- un movimento non sparisce mai perché un'altra postazione aveva una copia più vecchia;
- a parità di `id` vince la versione con **più `edits`**, che per costruzione è la più recente;
- l'unione vale anche nel polling e all'avvio: si unisce alla copia in memoria, non la si sostituisce;
- senza aver mai letto il cloud in quella sessione **non si scrive** — sarebbe sovrascrivere alla cieca.

**Le eliminazioni hanno bisogno di una traccia.** Con l'unione, un movimento eliminato tornerebbe dentro a ogni salvataggio. L'id finisce quindi in **`qm_cassa_rimossi`** (`{fondo:[…],incasso:[…]}`), chiave **separata** per non cambiare la forma degli array che `reception.html` e Compass si scambiano da sempre. Va segnato **prima** di salvare l'elenco, altrimenti l'unione dentro il salvataggio rimette dentro ciò che si è appena tolto. Gli id rimossi si uniscono a loro volta fra postazioni: sono stringhe, l'unione non può che crescere.

**Limite noto**: `cancellaMovimento` è ora `async`; i suoi `onclick` ignorano la promessa, come già facevano. E una postazione ferma da meno di un minuto può ancora far riapparire per un giro un movimento eliminato altrove — l'eliminazione è rara e voluta, mentre perdere un movimento registrato è il danno grave: la priorità è quella.

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

## Pre-stay — messaggi agli ospiti in arrivo (view `prestay`)

### Scopo e vincolo di partenza

Ogni giorno si scrive agli ospiti che arrivano **fra 2 giorni** (`PRESTAY_GG=2`). I contatti (mail, telefono) stanno sul PMS e **non sono esportabili in alcun formato**: vanno inseriti a mano, non c'è modo di aggirarlo.

### GLI OSPITI NON SONO LEGATI ALLA CAMERA — non reintrodurre quella chiave

Il Piano Settimanale serve **solo a sapere QUANTI arrivi ci sono per struttura** in quel giorno (`_psArriviPerStruttura(iso)`). Le schede sono **"Arrivo 1, 2, 3…" dentro il gruppo della struttura**, identificate da un `id` proprio: il numero di camera non compare da nessuna parte.

**Perché** (storia da non ripetere — è costata tre implementazioni successive): la prima versione indicizzava i dati per camera, `_prestay[iso][camera]`. Ma la reception sposta gli ospiti di stanza di continuo, e a ogni spostamento i contatti restavano orfani sulla vecchia riga mentre la nuova camera compariva vuota da ricompilare. Si è provato prima con un pulsante di spostamento manuale (rifiutato: *"io non posso ricordare dove sposto ciascun ospite"*), poi col consolidamento automatico per email (ancora troppo: richiedeva di ridigitare l'email), poi con l'inferenza dal diff del Piano — che è **inaffidabile per costruzione**: il Piano contiene solo data/struttura/camera, quindi *"203 sparita, 204 comparsa"* è indistinguibile da *"una prenotazione cancellata più una nuova"*, e indovinare significa prima o poi attribuire i contatti di un ospite a un altro.

La soluzione è stata **togliere del tutto l'aggancio**: senza camera non c'è niente da riagganciare, e uno spostamento diventa un non-evento. Il numero di camera qui non serviva a nulla — **non compare nel messaggio** (confermato dall'utente: non ci sarà mai) e non determina il testo, che dipende dalla struttura. Se un domani si volesse mostrare la camera all'ospite, ripensare l'intero modello, non aggiungere un campo camera come chiave.

### Fonte degli arrivi: il PDF del PMS, NON più il Piano Settimanale (15/08/2026)

Il pre-stay è stato **staccato dal Piano Settimanale** e collegato al **PDF "Arrivi" esportato dal PMS**. Il Piano dava solo un conteggio di camere; il PDF elenca le prenotazioni reali **con il nome dell'ospite**, quindi è insieme più completo e più attendibile. `pianoData` non è più letto da questa sezione.

**Perché non il Piano, e perché un giorno alla volta** (riconfermato il 2026-08-20): il
Piano contiene **solo numeri di camera** (`Art 5`, `Art 10`) e nessun nome — verificato sui
dati reali in KV. Servirebbe quindi digitare a mano anche i nomi, non solo mail e telefono.
E non ha senso nemmeno caricare in anticipo più PDF Arrivi di giorni diversi: **le
prenotazioni entrano di continuo**, quindi una lista caricata in anticipo è già incompleta
il giorno dopo. Il PDF del giorno, caricato quando serve, è la fonte più aggiornata.

**Il PDF non contiene email né telefono** (verificato sull'export reale): quelli restano manuali. L'import serve a fissare *quanti* arrivi ci sono, *chi* sono e a *quale struttura* appartengono — la parte che non si può controllare a memoria.

**La camera viene usata solo in fase di lettura**, per dedurre la struttura (`_psStrutturaDaCamera`: 204 → Boutique, Art 5 → SoulArt, LIB → San Liborio, R1-3 → Mastrangelo, CAPRI/NAPOLI/… → Principe, altre numeriche → SoulArt — stesse regole di `fixArriviStruttura`), e poi **scartata**: le schede non hanno campo camera. Verificato in test. Non salvarla.

#### Dove si carica

Due punti, stessa funzione `prestayHandlePdf(file)`: lo slot **"Arrivi Pre-stay"** nell'Upload Center (prima riga, accanto a "Riepilogo Reception") e il pulsante **"Carica PDF arrivi"** dentro la vista. Lo stato viene riportato in entrambi.

**Nome scelto**: "Arrivi Pre-stay" e non "Pre-Stay Message" — quello che si carica è la *lista arrivi*, non un messaggio; e va distinto da "Riepilogo Reception", che è lo stesso tipo di report del PMS ma esportato per la giornata corrente anziché per fra due giorni.

Aggiungendo altri slot ricordarsi di inserire la chiave negli **elenchi della fisarmonica** in `ucToggle` e `ucSetState` (`['turno','arrivi','prestay',…]`), altrimenti il pannello non si chiude quando se ne apre un altro. Lo slot **non** è incluso in `ucUpdateProgress`: non modifica il contatore giornaliero degli upload.

#### Parsing deterministico sulle colonne — `_psParsePdfArrivi(items)`

Niente chiamata AI: si legge la posizione `x` di ogni frammento di testo da pdf.js. **Motivo**: nomi e tipi camera vanno a capo nell'export reale (`Chacon Oviedo` / `Karina`, `AS` / `SUP`), e un parser sul testo concatenato li spezzerebbe o infilerebbe il tipo camera dentro il nome.

| Costante | Valore | Significato |
|---|---|---|
| `PS_COL_OSPITE_DA` | 90 | x minima della colonna "Ospite (Prenotante)" |
| `PS_COL_OSPITE_A` | 177 | x della colonna "Pax" = fine colonna ospite |

Nell'export reale: camera/tipo a x 40–77, ospite a x 96–135, Pax a 177,5. Una riga con `/` nella colonna sinistra apre una prenotazione; le righe successive senza `/` sono continuazioni e il loro testo nella colonna ospite viene **accodato al nome**. `PS_RE_CAMERA` valida la camera così che l'intestazione `Numero/` non venga scambiata per una prenotazione.

**La data si legge dall'intestazione** (`Arrivi - 17/08/2026`) e l'import va su quel giorno, spostando anche la vista: importare nel giorno sbagliato sarebbe peggio che non importare.

#### Re-import senza perdere il lavoro fatto — `_psImportaArrivi(iso,lista)`

Ricaricare una lista aggiornata è normale (le prenotazioni cambiano fino all'ultimo) e **non deve costare la ridigitazione delle email**. Regole, in ordine:

1. stesso nome nella stessa struttura → si **tiene la scheda esistente**, con email, telefono, lingua e stato di invio;
2. nome nuovo → riempie una scheda vuota della struttura, altrimenti ne crea una;
3. scheda con dati non più in lista → **non si cancella**, si marca `fuoriLista` e compare "non più in lista" in ambra (prenotazione cancellata o nome corretto: decide l'utente);
4. scheda vuota non più in lista → si rimuove, non serviva.

`_psNomeChiave` normalizza minuscole, punteggiatura **e ordine delle parole**: "Rossi Mario" e "MARIO ROSSI" sono la stessa persona — altrimenti un'inversione nome/cognome fra due export creerebbe un doppione e un doppio messaggio.

**Verificato con 34 test sul PDF reale del 17/08/2026** (9 arrivi, 3 Boutique + 6 SoulArt): nomi su più righe ricomposti, tipi camera mai finiti nel nome, intestazione e riga totali non importate, contatti e stato di invio conservati al re-import, nessun duplicato.

### Adattamento a smartphone (17/08/2026)

Schede e barra sono costruite in JS con **stili in linea**, che non possono rispondere alla larghezza. Le sole parti che devono adattarsi stanno quindi in `style.css` come classi — non spostarle di nuovo in linea:

| Classe | Desktop | ≤1200px | ≤768px |
|---|---|---|---|
| `.ps-grid` | 3 colonne | 2 colonne | **1 colonna** |
| `.ps-bar-stato` | allineato a destra | idem | a capo, piena larghezza |
| `.ps-bar-prog` | barra a destra | idem | a sinistra |
| `.ps-bar-cfg` | gruppo a destra | idem | a capo, pulsanti espansi |

A tre colonne su telefono il campo email diventa illeggibile — ed è proprio il dato che si incolla dal PMS e si rilegge, quindi una colonna sola è la scelta obbligata, non un ripiego estetico.

Verificato dal vivo a schermo stretto: `.ps-grid` risolve a una colonna e `margin-left` di stato e configurazione passa a `0`. Il breakpoint 768px è lo stesso già usato dal resto di Compass (sidebar a cassetto, tabelle scorrevoli).

### Barra di intestazione su due piani (17/08/2026)

Prima era una riga sola con data, due contatori e quattro pulsanti. I due contatori — `9/14 con contatto` e `9/14 contattati` — si leggevano come una ripetizione pur dicendo cose diverse, e i pulsanti avevano tutti lo stesso peso pur non avendo lo stesso uso.

Ora due piani dentro un unico riquadro:
- **sopra**: navigazione del giorno, data, e a destra **un solo numero** (`9 di 14 contattati`) con `N da fare` in ambra e una barra di avanzamento. A completamento: spunta, barra piena, tutto verde;
- **sotto**, separata da un filo: le azioni. A sinistra quelle quotidiane (**Controlla risposte**, **Aggiungi arrivo**), a destra raggruppate quelle di configurazione (**Modifica testi**, **Impostazioni**) — stanno insieme perché si usano raramente e per ragioni affini.

I conteggi sono sui **contattabili** (Italcamel esclusi, vedi sopra). Con zero contattabili non compare la spunta di completamento: non è un traguardo. Verificato con 19 test, casi limite inclusi.

### Impaginazione a schede, non a tabella (16/08/2026)

Gli arrivi sono **schede in griglia a tre colonne fisse** (`repeat(3,minmax(0,1fr))`, come il Pannello App) dentro il gruppo della struttura, non righe di tabella. Contorno a **1px**: a 2px il colore del canale diventava una fascia pesante, e con dodici schede a schermo l'insieme risultava rumoroso. Il numero d'arrivo è una **pastiglia tenue** con `Arrivo N` come testo unico: una prima versione con il numero dentro un cerchietto pieno e peso 800 risultava troppo pesante, una a testo grigio minuto troppo debole — questa sta in mezzo, e diventa verde a invio avvenuto. La tabella tagliava le email — `cgroth.972512@guest.boo` — proprio sul dato che si incolla a mano e che quindi va riletto; nella scheda i tre campi sono impilati a piena larghezza.

Una scheda già contattata ha **fondo e bordo verdi** e il pulsante diventa **"Rinvia"** senza riempimento pieno: resta possibile, ma non è più l'azione attesa. Il resto (spunte correggibili, badge `non più in lista`, avviso indirizzo Booking, errore di invio) è invariato, solo ricollocato.

### Risposte degli ospiti sulle schede (17/08/2026)

Nel pre-stay si chiedono orario di arrivo, preferenza sul letto e allergie. Le risposte servono a chi prepara la camera, ma cercarle nella webmail è un lavoro a parte: il pulsante **"↓ Controlla risposte"** le porta sulle schede.

`prestayControllaRisposte()` manda al Worker **gli indirizzi degli arrivi di quella data**; il Worker (`/prestay/risposte` in `worker.js`) si collega in IMAP alla casella del QM e cerca **solo messaggi provenienti da quegli indirizzi**. Non è un dettaglio implementativo ma la ragione per cui la cosa è accettabile: **l'endpoint non può restituire il resto della casella**, nemmeno a chi avesse la chiave. Non sostituirlo con un "leggi le ultime N mail e filtra lato client".

L'endpoint si **ricava** da quello di invio (`/prestay/send` → `/prestay/risposte`, vedi `_psEndpointRisposte`): una sola impostazione da tenere allineata invece di due.

Le risposte stanno **solo in localStorage** (`qm_prestay_risposte`), mai su KV: sono messaggi di ospiti, e spargerli su tutti i dispositivi per una comodità di lettura non vale il rischio.

**Limite noto**: chi risponde *dentro* la messaggistica di Booking senza usare la mail non genera un messaggio nella casella, quindi non compare. Quelle risposte si leggono solo nell'Extranet, e l'avviso lo dice invece di far pensare a un guasto.

#### Parsing IMAP — le tre insidie già risolte

Sono in `worker.js`, verificate con 24 test; non semplificarle:

1. **Completamento della risposta** (`imapCompleta`): la riga `TAG OK` può comparire *dentro* i dati di un literal `{N}`. Si scandisce in sequenza saltando i literal, invece di cercare la stringa nel buffer — un test copre esattamente questo caso.
2. **Codifiche del corpo**: `quoted-printable` e `base64` vanno decodificati e poi **reinterpretati come UTF-8**, altrimenti gli accenti si rompono. Su un `multipart/alternative` si prende la parte `text/plain`, ripiegando sull'HTML ripulito solo se manca.
3. **Taglio della citazione** (`soloRisposta`): la risposta contiene tutto il nostro pre-stay citato sotto. Si taglia al primo marcatore (`>`, `Il … ha scritto:`, `On … wrote:`, `Messaggio originale`, underscore) — senza questo, l'informazione utile sarebbe illeggibile.

Si scaricano i primi 16 KB del messaggio (`BODY.PEEK[]<0.16384>`): il testo dell'ospite sta in cima, prima della citazione, e il consumo resta prevedibile.

**Variabili nuove sul Worker**: `IMAP_HOST` = **`pop.securemail.pro`** (il nome dice "pop" ma serve IMAP: è l'host che Register indica per la posta in entrata), `IMAP_PORT` = 993, `IMAP_USER` = indirizzo completo, `IMAP_PASS`.

**Due host scartati, entrambi provati sul campo** — vale la pena ricordarlo perché il secondo errore è insidioso:
- `mail.register.it`: risponde in IMAP, ma il certificato è per `*.securemail.pro` e la verifica dell'hostname fallirebbe dal Worker;
- `mail.securemail.pro`: risponde **e** il certificato combacia, quindi sembrava corretto — ma la casella non vive su quel nodo e Dovecot rifiuta le credenziali con `AUTHENTICATIONFAILED`. L'errore sembra "password sbagliata" mentre significa "utente sconosciuto su questo server".

**Lezione**: su hosting condiviso l'host di posta va preso dalle istruzioni del fornitore, non dedotto dal fatto che un nome risponda e presenti il certificato giusto.

### Colore del bordo = canale di provenienza (17/08/2026)

Il bordo della scheda dice da dove arriva la prenotazione, leggendolo dall'**indirizzo email** (`_psBordoPerEmail`). Serve perché tono del messaggio e vincoli di recapito cambiano per canale.

| Indirizzo | Bordo |
|---|---|
| `@guest.booking.com` | `#0071C2` (blu Booking, tono chiaro) |
| contiene `expediapartnercentral.com` | `#FFB300` |
| contiene `g2-travel.com` | `#76573A` |
| qualunque altro | `#111111` (nero) |
| **già contattato** | verde — **vince su tutti**, `data-fatto="1"` |

**I colori sono scelti per distinguersi fra loro, non per fedeltà al marchio.** Il blu istituzionale di Booking (`#003580`) era indistinguibile dal nero delle dirette e dal marrone di G2 — si usa il loro blu chiaro. Il giallo Expedia è stato scurito da `#ffd933` a `#FFB300` perché quello pallido non si leggeva. Cambiandoli in futuro, verificarli **affiancati**, non uno per uno.

**Il bordo cambia mentre si digita**, non al termine: `oninput` chiama `_psAggiornaBordo(id,email)` che tocca **solo** `style.borderColor` della scheda. Un `prestayRender()` a ogni tasto farebbe perdere il fuoco al campo — non sostituirlo con un re-render. `onchange` resta separato e continua a salvare.

### Arrivi Italcamel — spunta manuale, scheda spenta

Gli arrivi di un tour operator non portano né email né telefono dell'ospite: non sono contattabili e non devono sembrare "da compilare". Si segnano con una **casella sulla scheda** (`prestayToggleItalcamel`), che la spegne: sovrapposizione sfocata (`backdrop-filter`) con la scritta **Italcamel** (non in maiuscolo, 26px) nella tipografia del logo Compass — stesse quattro proprietà di `.logo-title` in `style.css` (`'Helvetica Neue'`, 20px, peso 700, `letter-spacing:-.01em`). Se il logo cambia carattere, questa scritta va aggiornata a mano: sono due punti separati, non c'è una classe condivisa.

**Fuori dai conteggi.** Gli arrivi Italcamel restano visibili ma **non entrano nei contatori**, né in quelli del gruppo né in quelli della barra in alto: non sono contattabili per definizione, quindi tenerli nel denominatore avrebbe lasciato i gruppi eternamente incompleti (`2/5`) e l'avviso ambra accesso anche a lavoro finito. Ora il gruppo mostra `2/2 contattati · + 3 Italcamel` e il verde di "tutti contattati" scatta quando il lavoro è davvero finito. Un gruppo di soli Italcamel **non** si dichiara completo: zero contattabili non è un traguardo.

**Perché a mano e non dedotto**: un primo tentativo leggeva le colonne Azienda/Gruppo del PDF (x 315–411), ma **il PMS non le popola** — nell'export reale contengono sempre `-`. Il parsing è stato rimosso: non reintrodurlo senza prima verificare che quelle colonne abbiano un contenuto.

Due dettagli che non vanno semplificati:
- la casella sta **in fondo alla scheda, allineata a destra**, dopo i pulsanti;
- la sovrapposizione è `pointer-events:none` e la **casella sta sopra di essa** (`z-index:3` contro `2`), altrimenti spegnendo la scheda non si potrebbe più riaccenderla;
- il flag `italcamel` **non viene toccato da `_psImportaArrivi`**: è una marcatura dell'utente e deve sopravvivere al reimport del PDF. Verificato in test.

### Ordine delle strutture, invio in blocco, nomi (15/08/2026)

**L'ordine delle chiavi di `PRESTAY_HOTELS` è l'ordine dei gruppi nella pagina**: Boutique, SoulArt, San Liborio, Principe, Mastrangelo. Per cambiare l'ordine si riordinano le chiavi, non serve altro. **Art Resort è stato rimosso di proposito** dal pre-stay (e da `PRESTAY_FROM_NAME`): da qui non lo si contatta.

**Invio in blocco per struttura** — `prestayInviaGruppo(hotel)`, pulsante "Invia tutte (N)" nell'intestazione del gruppo:
- richiede l'invio diretto configurato; col solo `mailto:` si rifiuta e lo spiega, perché aprirebbe una finestra del client per ogni ospite;
- **manda una mail alla volta, aspettando l'esito della precedente** (`await`): l'SMTP condiviso di Register e il tetto giornaliero del Worker non gradiscono raffiche, e in caso di errore si sa dove ci si è fermati;
- **salta chi non ha email e chi ha già `mailTs`**, quindi ripremere il pulsante dopo aver aggiunto un ospite manda solo la mail mancante — verificato in test;
- non passa dall'anteprima (è il senso dell'invio in blocco) ma chiede conferma con il conteggio, segnalando quanti arrivi verranno saltati perché senza email.

**La normalizzazione vale anche sui dati GIÀ salvati**: applicarla solo all'import lasciava in maiuscolo tutto ciò che era stato caricato prima (i dati vivono su KV e sopravvivono agli aggiornamenti dell'app — è il caso normale, non l'eccezione). `_psGiorno` ripassa i nomi a ogni apertura del giorno e salva **solo se qualcosa è cambiato**, così non innesca un ciclo di scritture su KV. Anche la migrazione dal vecchio formato normalizza subito, non alla seconda apertura.

**Lo slot dell'Upload Center va ripristinato dopo un refresh** — `prestaySetLoaded()`: lo stato del riquadro vive nel DOM, i dati in localStorage/KV, quindi dopo Cmd+R il riquadro tornava "Non caricato" pur avendo gli arrivi. Viene richiamato all'avvio e dopo il pull da KV (arrivi importati su un altro PC). Stesso schema di `pianoSetLoaded`.

**Nomi in maiuscolo** — `_psNomeUmano(s)`: gli export del PMS danno "SALADINI LAURA" o "DABBARHI Ayoub", che in un messaggio all'ospite si leggono come una sgridata. La normalizzazione lavora **parola per parola**, non sull'intera stringa, proprio per gestire il secondo caso; una parola con maiuscole e minuscole insieme è voluta ("McDonald", "O'Brien") e non viene toccata. Le particelle (`de`, `di`, `van`, `der`…) restano minuscole se non iniziali, e i composti con apostrofo o trattino sono gestiti ("D'ANGELO" → "D'Angelo"). Si applica sia all'import sia alla digitazione manuale.

**Il caricamento del PDF è solo nell'Upload Center** (riquadro "Arrivi Pre-stay"): il pulsante dentro la vista è stato rimosso perché ridondante.

**Scorrimento — attenzione: a scorrere NON è la finestra** ma il contenitore `.content` (`overflow-y:auto`). Agire su `window.scrollY` / `window.scrollTo` non ha alcun effetto: è stato un errore commesso e corretto. Tutto ciò che tocca lo scorrimento passa da `_psScroller()`.

| Funzione | Comportamento voluto |
|---|---|
| `prestayToggleTpl` | **porta l'editor in vista** (`scrollTop` sull'`offsetTop` di `#psTplPanel`): si costruisce in fondo alla vista, quindi né lasciare fermo né andare in cima lo mostrerebbe. Chiudendolo si torna in cima all'elenco |
| `prestayToggleMailCfg` | conserva la posizione (`_psSenzaSalto`) |
| `_psWrapSel` / `_psBulletSel` | conservano la posizione: `focus()` su una textarea fuori vista la trascinerebbe in vista |

In entrambi i casi si riapplica anche a `requestAnimationFrame`, perché il layout può assestarsi dopo il ridisegno.

**Evidenza degli invii** — un pallino piccolo non bastava ("così non è intuitivo"). Ora, a tre livelli:
- **riga**: chi è già stato contattato ha sfondo verde tenue e barra verde a sinistra (`inset 3px 0 0`), così si distingue senza leggere; sostituisce la zebratura per quella riga;
- **chip**: pieno verde con l'**ora** dell'invio (`✓ mail 17:20`) invece del solo segno di spunta; resta cliccabile per correggere a mano;
- **intestazione di gruppo e barra in alto**: `N/M contattati`, che diventa verde pieno con ✓ quando il gruppo è completo, e il bordo del gruppo diventa verde.

Chi non ha né email né telefono non sparisce: il gruppo mostra in ambra `N senza contatto inserito`, così un ospite senza recapito non passa per "fatto".

Il pulsante di configurazione si chiama **"Impostazioni"**, non più "Invio mail".

Per un arrivo isolato o per strutture non presenti nell'export resta **"+ Aggiungi arrivo"**, che **chiede la struttura** da un elenco numerato. **La struttura va CHIESTA, non indovinata**: nella prima versione veniva assegnata d'ufficio `'pr'` (Principe) e il messaggio nominava la struttura sbagliata usando pure il template sbagliato — scoperto solo alla prima mail di prova reale. Non introdurre fallback di struttura scelti d'ufficio.

### Migrazione dal vecchio formato

`_psGiorno(iso)` migra **pigramente** (alla prima apertura di quella data) dal formato indicizzato per camera `{'203':{…}}` al nuovo `{arrivi:[…]}`: ogni vecchia riga diventa una scheda normale conservando nome, email, telefono, lingua, struttura e stato di invio — si perde solo la camera come chiave, che è il punto. Verificato che non si ripeta alla seconda apertura.

### Invio mail diretto — opzionale, via Cloudflare Worker

Il pulsante ✉️ ha **due comportamenti** a seconda della configurazione (`⚙️ Invio mail` nella barra della sezione):

| Stato | Comportamento |
|-------|---------------|
| Non configurato (default) | `mailto:` — apre il client di posta col messaggio già scritto |
| Configurato | `POST` all'endpoint del Worker: **la mail parte davvero**, previa conferma |

Il codice del Worker, i passaggi su Cloudflare, il servizio di invio e i record DNS sono in **`worker-prestay-mail.md`** (documentazione, non servita dall'app).

**Perché serve una chiave.** Un endpoint pubblico che spedisce mail è un **relay per spam**: Compass è raggiungibile da chiunque e il sorgente è pubblico. Tre protezioni sovrapposte: chiave condivisa (`X-Prestay-Key`), controllo dell'origine, tetto giornaliero sul Worker. Nessuna è invalicabile da sola, insieme rendono l'endpoint poco interessante da attaccare.

**Configurazione reale in uso** (fatta l'11/08/2026): si spedisce da `qm@mail.compass-qm.com` — sottodominio su Namecheap, dove il QM ha accesso ai DNS; `soularthotel.com` è amministrato nell'area clienti Register dell'hotel, non accessibile. Servizio di invio Resend, region Ireland. I tre record DNS (DKIM, SPF TXT, SPF MX) sono su `compass-qm.com`; il DMARC proposto è stato saltato di proposito perché finirebbe sul dominio principale. Per aggiungere l'MX è stato necessario passare Namecheap da "Email Forwarding" a **Custom MX** — verificato prima che non ci fossero inoltri configurati, quindi nessuna perdita. `compass-qm.com` non ha più record MX: se un domani servisse un inoltro vanno reinseriti i cinque `eforward1-5.registrar-servers.com` (priorità 10,10,10,15,20).

**Due trappole trovate alla prima prova reale**: il display name in `PRESTAY_FROM` va **tra virgolette e senza caratteri non-ASCII** (un trattino lungo `—` faceva scartare il nome, e Gmail mostrava solo l'indirizzo); e le variabili nuove diventano attive **solo dopo un nuovo deploy** del Worker, non al salvataggio.

### L'avviso "indirizzo Booking" diceva il falso — `caselle` buttate via (02/09/2026)

**Sintomo**: una mail al Boutique **regolarmente recapitata**, visibile nel thread Booking
con l'ospite, mostrava lo stesso sulla scheda `indirizzo Booking · non recapitabile con il
mittente attuale`.

**Causa**: `/prestay/stato` restituisce `caselle` — la casella dichiarata **per struttura**
(`{bh:'booking@hotelpiazzacarita.com'}`) — e `_psMittenteAttuale(p)` la legge, ma
`prestayVerificaMittente` **non la salvava**: costruiva `_psMitt` con tutti gli altri campi
e lasciava fuori proprio quello. Senza, ogni struttura con casella propria ricadeva sulla
principale, il confronto con il suo indirizzo Extranet falliva **sempre**, e nessun clic su
"Verifica mittente" poteva sistemarlo. Il campo esisteva solo in `test/controlli.js`, dove
veniva scritto a mano: i controlli passavano su un dato che in produzione non arrivava mai.

L'invio invece era corretto da sempre: la casella la sceglie il Worker (`casellaPer`) dal
campo `hotel` del payload. Era **solo il racconto** a essere sbagliato — il caso peggiore
per un avviso, perché insegna a ignorarlo.

**Corretto**, oltre alla causa:

| Prima | Ora |
|---|---|
| Verifica solo a mano, una volta per postazione | `_psVerificaAuto()` la fa da sola all'apertura della sezione se l'invio diretto è configurato (stesse credenziali), in silenzio; TTL 6 ore, e una cache **senza `caselle`** viene dal difetto e si rifà |
| L'avviso compariva anche su una mail **già partita** | Solo su ciò che deve ancora partire: a cose fatte era una smentita, e falsa se il messaggio era arrivato |
| "non recapitabile" anche quando il mittente non era noto | Se noto: `parte da X, Booking accetta solo Y`. Se ignoto: `mittente non ancora verificato` — un'ipotesi non si scrive come un fatto |

**Regola che ne esce**: un controllo che dichiara *non funzionerà* deve poggiare su un dato
verificato, non su un'assunzione; e quando l'assunzione è pessimistica va detto che è tale.
Il pulsante manuale resta in Impostazioni per rifare la verifica su richiesta.

Corretto anche `PRESTAY_BOOKING_MITTENTE` concatenato nel testo del pannello (mappa dal
31/08: si leggeva `[object Object]`).

### Struttura di PRENOTAZIONE ≠ struttura di ARRIVO — campo `mitt` (02/09/2026)

Un ospite che prenota al **Boutique** e riceve un **upgrade** dorme al SoulArt, ma **non
lo sa fino a quando non arriva in hotel**. Il pre-stay deve quindi partire dalla struttura
in cui *ha prenotato*: quel nome mittente, quel testo, e soprattutto **quella casella di
posta**. Mandarlo dall'altra vuol dire scrivergli da un albergo che non conosce — e se
l'indirizzo è un alias `@guest.booking.com` **non gli arriva affatto**, perché le liste dei
mittenti autorizzati sull'Extranet sono separate per struttura (vedi "Una casella per
struttura").

**Non è deducibile dall'export**: il PMS riporta la camera **assegnata**, che dopo
l'upgrade è già quella nuova, e non esiste una colonna con la struttura di prenotazione.
La scelta è quindi **manuale, per scheda**.

| Campo | Significato |
|---|---|
| `hotel` | struttura di **arrivo** — decide il gruppo nella pagina. **Non cambia mai per un upgrade** |
| `mitt` | struttura di **prenotazione**, cioè chi scrive. Vuoto (caso normale) = la stessa di `hotel` |
| `hotelPrec` | struttura in cui la prenotazione risultava al caricamento precedente. Solo un suggerimento, vedi sotto |

`_psHotelMitt(a)` è **l'unico modo** di ricavare la struttura che scrive; `_psMittDiverso(a)`
dice se è un caso da segnalare. Tutto ciò che riguarda il *messaggio* passa da lì:
`{struttura}` in `_psCompila`, il template (`_psTpl`), `PRESTAY_FROM_NAME` e il campo
`hotel` mandato al Worker in `_psInviaMail` (è quello che sceglie la casella SMTP, vedi
`casellaPer`), il blocco Booking (`_psBookingBloccato`, `_psMittAtteso`,
`_psMittenteAttuale`) sia sulla scheda sia nell'invio in blocco.

**Il raggruppamento resta su `hotel`, di proposito**: il numero di arrivi per struttura è
la rete di sicurezza contro il dimenticarne uno e deve continuare a combaciare con la lista
del PMS. Una scheda con mittente cambiato resta quindi nel gruppo della struttura d'arrivo,
con una riga in accent (`prenotato al … · arriva al …`) e il selettore evidenziato, così la
deviazione è visibile senza aprire nulla. Anche l'anteprima lo dichiara in testa.

**Il suggerimento automatico non decide.** In `_psImportaArrivi`, se una prenotazione già
esistente cambia struttura fra due caricamenti, la struttura di prima viene ricordata in
`hotelPrec` e la scheda **propone** ("scrivi da lì") di usarla come mittente. Non la si
applica da sola: un cambio di struttura può anche essere la correzione di una camera
sbagliata, e indovinare vorrebbe dire scrivere all'ospite dall'albergo sbagliato — lo
stesso errore che questa funzione esiste per evitare. Il suggerimento **non compare** se
`mitt` è già stato scelto a mano.

**`mitt` sopravvive a tutto**: `_psImportaArrivi` non lo tocca (come la spunta Italcamel) e
`_psAssorbi` lo riprende dal cloud solo se qui la scheda non è mai stata toccata (`ts`) —
altrimenti toglierlo a mano non avrebbe effetto, tornerebbe da solo al primo giro.

**Corretto nella stessa modifica**: due messaggi dell'invio in blocco concatenavano
`PRESTAY_BOOKING_MITTENTE`, che dal 31/08/2026 è una **mappa** e non più una stringa — si
leggeva `[object Object]`. Ora l'elenco dei mittenti attesi si ricava dalle schede
realmente bloccate, che con i mittenti per struttura possono essere più di uno.

Coperto da **15 controlli** in `test/controlli.js` ("Pre-stay: chi ha prenotato altrove
riceve dalla sua struttura"), verificati sabotando `_psHotelMitt`: 3 falliscono.

### Vincolo Booking.com — il mittente si VERIFICA, non si dichiara (21/08/2026)

Gli ospiti che prenotano su Booking hanno un indirizzo mascherato `@guest.booking.com`, che è un **relay**: Booking inoltra alla casella vera **solo le mail spedite dall'indirizzo registrato sull'Extranet della struttura** — `booking@soularthotel.com` (costante `PRESTAY_BOOKING_MITTENTE`). Da qualunque altro mittente le rifiuta: a volte le **scarta in silenzio** (nessun rimbalzo, nessun errore), a volte le **rimanda indietro** con un bounce nella casella del mittente.

**Perché è pericoloso e non solo scomodo**: il nostro invio va a buon fine (Register accetta e consegna a Booking), quindi `mailTs` verrebbe valorizzato e la riga diventerebbe verde "inviata" per un messaggio che nessuno ha ricevuto. Una spunta che mente è peggio di una mancante.

Finché il mittente non è quello autorizzato:
- `_psAliasBooking(email)` riconosce gli indirizzi (`@guest.booking.com` e `@booking.com`, con trim e case-insensitive; non confonde `booking.com@gmail.com` né domini simili);
- la riga mostra il campo email bordato ambra e la nota *"indirizzo Booking · non recapitabile con il mittente attuale"*;
- l'anteprima mail aggiunge un avviso esplicito, suggerendo WhatsApp come alternativa;
- **l'invio in blocco li ESCLUDE** invece di spedirli nel vuoto, e dice quanti ne ha saltati. Il conteggio del gruppo resta quindi incompleto — ed è corretto così.

#### Perché la costante scritta a mano non poteva funzionare (rimbalzi del 21/08/2026)

`PRESTAY_MITTENTE_BOOKING_OK` era stata messa a `true` — cioè *"ormai spediamo dall'indirizzo registrato su Booking"* — **senza che sul Worker fosse cambiato niente**: `SMTP_USER` era ed è rimasta `qm@soularthotel.com`. Compass ha quindi ripreso a spedire agli indirizzi `@guest.booking.com` dal mittente sbagliato, e le mail sono tornate indietro. Dalla dashboard era invisibile: l'invio riusciva (Register accetta e consegna a Booking, il rifiuto arriva dopo) e la scheda diventava verde.

**L'equivoco da non ripetere**: *"l'indirizzo è ok sull'Extranet"* e *"le mail partono da quell'indirizzo"* sono due cose diverse. L'Extranet dice quale mittente è **autorizzato**; solo il Worker sa quale mittente stiamo **usando**. Una costante in `app.js` non può saperlo: sta in un file che nessuno ridistribuisce quando si tocca una variabile su Cloudflare.

Il blocco non dipende quindi più da una costante:

| Funzione | Ruolo |
|---|---|
| `prestayVerificaMittente()` | chiede a `GET /prestay/stato` sul Worker da quale casella parte davvero la posta (pulsante **Verifica mittente** in Impostazioni) |
| `_psMitt` (`qm_prestay_mittente`, localStorage) | ultima risposta: `{mittente,mittenteDa,via,smtpHost,replyTo,imap,versione,ts}` |
| `_psMittenteOkBooking()` | confronta il mittente reale con `PRESTAY_BOOKING_MITTENTE` |
| `PRESTAY_MITTENTE_BOOKING_OK` | **solo** l'assunzione finché non si è mai verificato: ora `false` — un invio in meno è meno grave di una spunta verde che mente |

`/prestay/stato` restituisce solo indirizzi e nomi di host (mai password), dietro la stessa chiave e lo stesso controllo di origine degli altri percorsi `/prestay/*`, e dichiara `WORKER_VERSIONE`: se la verifica risponde `404`, il Worker in produzione è più vecchio di `worker.js` e va ripubblicato — cosa che, pubblicando a mano, capita.

**Come si sblocca davvero**: su Cloudflare `SMTP_USER`/`SMTP_PASS` della casella `booking@soularthotel.com`, **cancellare `SMTP_FROM`** se è rimasta impostata (`SMTP_FROM || SMTP_USER`: vince lei, ed è la svista che rende inutile cambiare `SMTP_USER`), ripubblicare il Worker, premere **Verifica mittente**. Il pannello lo dice esplicitamente quando il mittente arriva da `SMTP_FROM`. Verificato in test che con il mittente giusto quegli indirizzi tornano inviabili, e che restano bloccati sia col mittente sbagliato sia quando non è mai stato verificato.

### Una casella per struttura (31/08/2026)

Le liste degli indirizzi approvati sull'Extranet Booking sono **separate per struttura**, e
il Boutique spedisce da `booking@hotelpiazzacarita.com` — dominio diverso, casella diversa,
password diversa. Un mittente unico non poteva funzionare per tutte.

`casellaPer(env, hotel)` in `worker.js` sceglie `SMTP_USER_<COD>`/`SMTP_PASS_<COD>` se
esistono entrambe, altrimenti la casella principale. **Aggiungere una struttura non
richiede modifiche al codice**, solo le variabili su Cloudflare:

| Variabile | Esempio | Quando serve |
|-----------|---------|--------------|
| `SMTP_USER_BH` | `booking@hotelpiazzacarita.com` | sempre |
| `SMTP_PASS_BH` | (segreto) | sempre |
| `PRESTAY_REPLYTO_BH` | `booking@hotelpiazzacarita.com, qm@soularthotel.com` | per far arrivare le risposte in entrambe le caselle |
| `SMTP_HOST_BH` | — | **solo** se il server di invio è diverso. Boutique e SoulArt sono entrambi su register.it, quindi non serve |

`SMTP_FROM` vale **solo** per la casella principale: una struttura con casella propria deve
spedire dalla sua, altrimenti si torna al problema che si voleva risolvere.

Lato Compass: `PRESTAY_BOOKING_MITTENTE` è una mappa (`_default` + `bh`), `_psBookingBloccato(email, hotel)`
segue la struttura della scheda, e l'invio manda `hotel` nel payload — senza quel campo
tutte le mail partirebbero dalla casella principale. Il pannello **Verifica mittente**
mostra una riga per struttura: con due caselle un semaforo unico non basta, può essere a
posto una e non l'altra.

**Trappola vista in produzione**: `SMTP 535 5.7.0 authentication rejected` con credenziali
giuste. Due cause, in ordine: la password incollata si porta dietro uno spazio o un a capo
(rimedio: **riscriverla a mano**, non incollarla), e le variabili **non diventano attive
finché non si ripubblica il Worker**. Se anche così viene rifiutata, verificare che la
casella sia abilitata all'invio autenticato su `authsmtp.securemail.pro`: la webmail
funziona per un'altra strada, quindi entrare in webmail **non** dimostra che possa spedire.

**Spostando la casella di invio si spostano anche le risposte**: `IMAP_USER`/`IMAP_PASS` alimentano "Controlla risposte" e puntano oggi a `qm@soularthotel.com`. Se restano lì mentre si spedisce da `booking@`, le risposte degli ospiti non compaiono più. Il pannello segnala il disallineamento invece di lasciarlo scoprire per caso.

**Nota su `PRESTAY_REPLYTO`**: oggi punta a `qm@soularthotel.com`. Passando a `booking@`, valutare se allinearlo — una risposta dell'ospite dentro il thread Booking dovrebbe restare nel loro sistema, e un `Reply-To` divergente può essere riscritto o ignorato dal relay.

### Mittente per struttura — `PRESTAY_FROM_NAME`

`PRESTAY_FROM` sul Worker è **un solo indirizzo per tutte le strutture** (`qm@mail.compass-qm.com`, l'unico dominio verificato su Resend) — ma il nome mostrato all'ospite non deve essere sempre "SoulArt Hotel": un ospite del Boutique che vede "SoulArt Hotel" come mittente non lo riconosce. `PRESTAY_FROM_NAME` (app.js, vicino a `PRESTAY_HOTELS`) mappa `hotel → nome da mostrare`, **deliberatamente un oggetto separato da `PRESTAY_HOTELS[].name`**: quello alimenta anche `{struttura}` nel corpo dei messaggi, allungarlo lì (es. "Boutique Hotel Piazza Carità" invece di "Boutique Hotel") avrebbe cambiato il testo di ogni template esistente, non solo il mittente.

`_psSpedisciMail` manda `fromName` (il valore già completo di `PRESTAY_FROM_NAME[hotel]`) nel body della POST al Worker, che lo ricompone attorno all'indirizzo fisso di `PRESTAY_FROM` (regex su `<...>`), ripulito da virgolette/parentesi/a-capo prima di finire nell'header `From` — un client (o una richiesta malformata) potrebbe altrimenti mandare qualunque stringa. Senza `fromName` (client vecchio, o hotel non mappato) il Worker ricade su `PRESTAY_FROM` intero, comportamento identico a prima.

**"- Quality Manager" è stato tolto da tutti i mittenti** (prima c'era su SoulArt/Boutique, rimosso su richiesta esplicita nella stessa sessione): `PRESTAY_FROM_NAME` contiene solo nomi di struttura, senza suffisso ruolo. **Non concatenarlo di nuovo in `_psSpedisciMail`**: la stringa in `PRESTAY_FROM_NAME` è già il nome finale, va passata così com'è. SoulArt ha in più `| Design Experience` (barretta verticale, spazi attorno) — solo SoulArt, non le altre strutture.

Il `mailto:` (invio non configurato) **non è toccato**: il client di posta dell'utente decide da solo il mittente, non è mai stato possibile personalizzarlo da lì.

### Perché si spedisce via SMTP e non più via Resend (14/08/2026)

Le mail inviate da `mail.compass-qm.com` via Resend finivano **in spam su Hotmail/Outlook** nonostante autenticazione perfetta — verificato sugli header reali: `dkim=pass`, `dmarc=pass`, `compauth=pass reason=100`, ma `SCL: 5` e `OFR:SpamFilterAuthJ`, cioè "autenticata ma giudicata spam". **Non era un problema di DNS o di codice: era reputazione di un dominio di invio nuovo**, che matura solo in settimane di invii.

Scartate: aspettare (il progetto doveva partire subito); tornare a `mailto:` (impraticabile ai volumi reali — decine di aperture del client, scelta manuale del mittente fra più strutture, impossibile dai PC senza client); verificare `soularthotel.com` su Resend (DNS nell'area Register dell'hotel, autorizzazione non ottenibile).

**Soluzione**: il Worker parla SMTP direttamente col server di Register (`authsmtp.securemail.pro:465`, TLS implicito, `AUTH LOGIN`) e spedisce **dalla casella vera `qm@soularthotel.com`** — stessa reputazione della posta che il QM manda da anni. Compass non cambia: stesso clic, stesso endpoint, stesso payload (`fromName` incluso). Codice completo e dettagli in **`worker-prestay-mail.md` §6**.

Il Worker **ricade automaticamente su Resend** se le variabili `SMTP_*` non ci sono: per tornare indietro basta rimuoverle, senza toccare il codice.

**Non "semplificare" queste quattro cose nel Worker** (tutte verificate in test): risposte SMTP multiriga lette solo su righe già terminate da CRLF (un `250 OK` spezzato a metà sembrerebbe completo); corpo in base64 (risolve accenti *e* dot-stuffing insieme); intestazioni RFC 2047 (`Carità` altrimenti illeggibile); `MAIL FROM` uguale all'utente autenticato (i server condivisi rifiutano mittenti di busta diversi — il nome per struttura sta nell'header `From:`, che è quello che l'ospite legge).

### Configurazione dell'invio: solo la chiave, e si può rileggere (02/09/2026)

Prima servivano **due** campi su ogni postazione, endpoint e chiave, e il campo chiave era
`type="password"`: non si poteva rileggere quanto inserito, quindi per attivare un computer
nuovo bisognava ripescare il valore su Cloudflare.

- **L'endpoint non è un segreto**: è lo stesso Worker che tutta l'app già usa, scritto in
  chiaro nel sorgente. Ora `_psEndpoint()` ricade su `PROXY+'/prestay/send'` quando il
  campo è vuoto, e il campo è sparito dal pannello (resta sovrascrivibile — un Worker di
  prova — con un collegamento per tornare a quello normale). `_psMailPronto()` guarda
  quindi solo la chiave.
- **La chiave si mostra e si copia** (`prestayToggleChiave`, `prestayCopiaChiave`): è così
  che la si porta su un'altra postazione senza andarla a cercare altrove.

**Perché non si può distribuire da sola**: `/kv/get` sul Worker è **senza autenticazione**
— qualunque cosa finisse su KV sarebbe leggibile da chiunque conosca l'indirizzo, che è
pubblico nel sorgente. Una chiave d'invio pubblica è un relay per spam a nome dell'albergo.
Finché l'archivio KV non è protetto, la chiave resta per postazione: è un incollaggio, una
volta per computer.

**La chiave sta solo nel browser** (`localStorage`, chiave `qm_prestay_mailcfg`) — **mai su KV, mai nel codice**: non deve finire su GitHub né essere sincronizzata sugli altri PC insieme al resto dei dati. Va quindi reinserita su ogni postazione da cui si vuole spedire. Verificato in test che non compaia dentro `qm_prestay`.

**Se l'invio fallisce la riga NON viene segnata come inviata** e l'errore resta visibile sulla riga (chiave sbagliata, rete assente, rifiuto del servizio): altrimenti un errore silenzioso farebbe credere che l'ospite sia stato contattato. Un reinvio riuscito azzera l'errore. Con l'invio diretto si chiede **conferma** prima di spedire: con nome e dati presi a mano dal PMS, saltare del tutto la rilettura non è prudente.

Togliendo la chiave si torna immediatamente al comportamento `mailto:`.

### Invio — quando non configurato, Compass non spedisce ma apre il messaggio già scritto

Compass è un sito statico su GitHub Pages: non ha SMTP e non può inviare nulla. I due pulsanti aprono il messaggio **già compilato** e l'invio lo conferma l'utente:

| Pulsante | Meccanismo | Note |
|----------|-----------|------|
| ✉️ mail | `mailto:` con `subject` e `body` già scritti | Apre il client di posta predefinito |
| 💬 WhatsApp | `wa.me/<numero>?text=…` | Stesso meccanismo del giro Culligan; il numero viene ripulito da spazi e `+` |

Di conseguenza **lo stato "inviato" è una spunta, non una certezza**: viene segnata al click sul pulsante, ma è sempre correggibile cliccando il chip `✓ mail` / `✓ wa` (se il client non si apre, o si annulla l'invio). Salvata su KV `qm_prestay` così chi scrive dalla reception e chi controlla dall'ufficio vedono lo stesso stato e non si mandano doppioni.

### Anteprima prima dell'invio — `prestayAnteprima(camera, canale)`

**Dal 17/08/2026 l'anteprima si apre in LETTURA**: mostra il messaggio **finito**, come lo leggerà l'ospite — testo reso, grassetti applicati, oggetto come titolo — non il sorgente con gli asterischi. Nella maggior parte dei casi la si apre solo per rileggere prima di premere invio, e vedere il markup era rumore.

La modifica resta a un clic sulla **matita** in alto a destra (`prestayAntModifica`), che scopre oggetto, barra B/I/• e casella di testo; il pulsante diventa "Fine".

**`_psAntLeggiCampi()` va chiamata prima di ogni ridisegno e prima dell'invio**: travasa il contenuto dei campi nello stato `_psAnteprima`. Senza, una correzione appena digitata andrebbe persa passando a lettura, o non finirebbe nel messaggio spedito se si preme invia senza confermare. Verificato in test.

I pulsanti ✉️/💬 **non spediscono al volo**: aprono un modal col messaggio già compilato e **modificabile**, e solo da lì parte l'invio (`prestayInviaDaAnteprima()` → `_psSpedisciMail` / `_psSpedisciWa`). Con nome e contatti copiati a mano dal PMS, un refuso o un segnaposto rimasto vuoto si vedono solo rileggendo — e una mail sbagliata a un ospite non si richiama indietro.

**Le correzioni valgono per quel singolo invio**, non toccano il template: altrimenti una modifica al volo per un ospite se la porterebbero dietro tutti i successivi. Per cambiare il testo di tutti c'è "✏️ Modifica testi".

Il modal segnala tre cose che si notano solo rileggendo:
- il testo contiene ancora `[SCRIVI QUI IL TESTO DEL PRE-STAY]` (template mai personalizzato);
- il nome ospite è vuoto → il messaggio dirà genericamente "Gentile Ospite";
- è rimasto un segnaposto tra graffe non sostituito (di solito scritto male, es. `{Nome}`).

**Tre pulsanti per riga, tre modi di aprire la stessa anteprima** (`canale`):

| Pulsante | `canale` | Cosa mostra |
|----------|----------|-------------|
| 👁 | `'both'` | messaggio + **entrambe** le vie di invio: si sceglie da lì. L'oggetto è marcato "solo per la mail" |
| ✉️ | `'mail'` | anteprima già orientata alla mail, un solo pulsante di invio |
| 💬 | `'wa'` | anteprima senza campo oggetto (WhatsApp non ce l'ha) |

Con `'both'` compaiono solo le vie per cui esiste il contatto: se manca il telefono resta il solo pulsante mail. Senza nessun contatto l'anteprima non si apre e lo dice.

`prestayInviaDaAnteprima(canaleScelto)` accetta il canale come argomento proprio per il caso `'both'`, dove la scelta avviene nel modal e non è nota all'apertura.

L'etichetta del pulsante mail distingue fra invio diretto ("Invia la mail") e apertura del client ("Apri il client di posta"), così si sa sempre cosa sta per succedere.

### Modello dati

```js
qm_prestay     = { 'YYYY-MM-DD': { arrivi: [ {id,hotel,mitt,nome,email,tel,lang:'it'|'en',mailTs,waTs,mailErr} ] } }
qm_prestay_tpl = { sa:{it:{ogg,corpo}, en:{ogg,corpo}}, bh:{…}, sl:{…}, ar:{…}, pr:{…}, ms:{…} }
```

`id` è generato (`_psNuovoId`) e non cambia mai: è l'unica identità della scheda, usata da invio, anteprima e spunte. **Nessun campo camera**, per le ragioni sopra.

`hotel` è la struttura di **arrivo**; `mitt` (di norma vuoto) è quella di **prenotazione**,
cioè da chi parte il messaggio — vedi "Struttura di PRENOTAZIONE ≠ struttura di ARRIVO".

`rimossi:[id]` (per giorno) è la traccia delle schede eliminate a mano: senza, la fusione descritta sotto le rimetterebbe dentro a ogni salvataggio e cancellarle diventerebbe impossibile. Se ne tengono le ultime 100. `ts` sulla scheda è l'ultima modifica fatta a mano, e decide chi vince su spunta Italcamel e lingua.

### Il salvataggio non può più cancellare — incidente del 22/08/2026

**Cos'è successo.** `_psSave()` scriveva su KV **l'intero oggetto di tutti i giorni**, senza rileggere e senza guardie: ultimo che scrive vince, in silenzio. È bastata una copia partita con il `localStorage` vuoto — un altro profilo del browser, o **la copia di sviluppo, che punta allo stesso Worker della produzione** — perché un caricamento del PDF Prenotazioni riscrivesse la chiave con schede nuove: nomi presenti, email e telefono vuoti, spunte di invio perse. I 19 pre-stay del 24 agosto, **già inviati via WhatsApp e mail**, sono spariti.

**Perché non si è potuto recuperare.** All'avvio il ripristino dal cloud faceva `localStorage.setItem(k, j.value)`, cioè **sovrascriveva la copia locale con quella del cloud già impoverita**. Aprendo Compass la mattina dopo — gesto normale, nessun avviso — è sparita anche l'ultima copia buona rimasta su quella postazione. KV non è versionato: non c'era altro da cui ripartire.

**Le regole ora**, in ordine di importanza:

| Regola | Dove |
|---|---|
| Non si scrive mai alla cieca: si rilegge il cloud e, se non risponde, **la scrittura non parte** | `_psScriviCloud` |
| Si **fonde** invece di sostituire: una scheda compilata che sta sul cloud e non in memoria viene rimessa dentro | `_psFondi` |
| La corrispondenza è per **codice prenotazione**, poi nome+struttura — mai per `id`, che una reimportazione rigenera | `_psStessaScheda` |
| Un valore già presente in locale non viene mai sovrascritto da quello remoto: **quello lo si sta digitando adesso** | `_psAssorbi` |
| Un invio non si perde mai: se risulta contattato da una parte, è contattato | `_psAssorbi` |
| All'avvio si fonde, **non si sostituisce**: una giornata che sta solo in locale sopravvive all'apertura | `restoreReviews` |
| Prima di una reimportazione in blocco ci si riallinea al cloud | `prestayHandlePdf`, `prenHandlePdf` |
| Una scrittura per volta, le altre si accodano | `_psSalvaCloud` |
| L'esito è **visibile**: pallino di sincronizzazione + riquadro rosso nella vista | `_psSegnalaCloud` |

**"Compilata" (`_psCompilata`) vuol dire che c'è qualcosa da perdere**: email, telefono, `mailTs` o `waTs`. Il solo nome non basta — quello lo rigenera l'importazione, e trattarlo come dato da salvare riempirebbe le giornate di doppioni.

**La copia di sviluppo scrive su una chiave sua** (`_psChiave()`: `qm_prestay_dev` quando l'host è `localhost`/`127.0.0.1` o il protocollo è `file:`), e lo dichiara in console. Aprire una copia locale non deve poter toccare i dati veri — è metà della causa di questo incidente. **Se in futuro si aggiungono altre chiavi KV scritte per intero da più postazioni, vale lo stesso ragionamento**: rileggi, fondi, e non far scrivere la copia di sviluppo sulla chiave di produzione.

**La vista si rilegge da sola ogni 60 secondi** mentre resta aperta, ma **non ridisegna se qualcuno sta scrivendo** dentro di essa (`INPUT`/`TEXTAREA`/`SELECT` col fuoco): rigenerare l'HTML sotto le dita fa perdere il testo in corso — stessa lezione della casella "Ricevuto" in Biancheria. Una copia ferma da ore non è solo scomoda: è il punto di partenza di ogni sovrascrittura.

Coperto da **26 controlli** in `test/controlli.js` ("Pre-stay: la fusione col cloud non perde niente"), che riproducono esattamente lo scenario del 22/08: cloud pieno, copia in memoria appena reimportata con `id` nuovi.

### Template — editabili dalla schermata, non nel codice

Un testo per **struttura e lingua** (IT/EN), modificabile da "✏️ Modifica testi" senza toccare il codice. `PRESTAY_TPL_DEFAULT` contiene solo segnaposto (`[SCRIVI QUI IL TESTO DEL PRE-STAY]`) da riscrivere al primo uso.

Segnaposto sostituiti **al momento dell'invio, non salvati** (`_psCompila`): modificando un template cambiano subito anche i messaggi non ancora inviati.

`{nome}` · `{struttura}` · `{data}` — l'oggetto vale solo per la mail, WhatsApp usa il solo corpo. **`{camera}` non esiste più**: gli ospiti non sono legati a una stanza.

### Formattazione nei template — sintassi nativa WhatsApp, tradotta per la mail

Sintassi nel corpo: `*grassetto*`, `_corsivo_`, righe che iniziano con `- ` per un elenco puntato. Scelta deliberatamente **identica alla sintassi nativa di WhatsApp** (non Markdown standard, che userebbe `**grassetto**`): il canale WhatsApp non richiede quindi nessuna conversione, solo la mail va tradotta.

| Funzione | Uso | Canale |
|----------|-----|--------|
| `_psMdToHtml(txt)` | markup → HTML (`<strong>`/`<em>`/`<ul><li>`/`<p>`), con escape HTML prima della conversione (niente injection da un nome ospite scritto male) | mail via Worker (`html` oltre a `text` nella POST a `/prestay/send`) |
| `_psMdStrip(txt)` | toglie i marcatori, converte `- ` in `• ` | `mailto:` (il client apre un body testo semplice, non sa mostrare HTML) |
| corpo grezzo, nessuna conversione | i marcatori sono già ciò che WhatsApp si aspetta | `_psSpedisciWa` (solo `- `→`• `, `*`/`_` restano intatti) |

`_psMdToHtml` lavora **riga per riga**, non a blocchi separati da riga vuota: un elenco che segue subito una riga introduttiva senza riga vuota in mezzo (`"Ecco alcune info:\n- Check-in\n- Wifi"`, caso reale comune) va comunque riconosciuto come elenco — un primo tentativo a blocchi lo trascinava dentro il paragrafo perché non tutte le righe del blocco erano bullet.

**Toolbar B/I/•** sopra ogni textarea (editor template e corpo dell'anteprima), stessa funzione condivisa `_psWrapSel(taId,before,after)` / `_psBulletSel(taId)`: avvolge la selezione (o inserisce un segnaposto "testo"/"voce elenco" se non c'è selezione) e simula un evento `change` così il salvataggio (`onchange="prestaySetTpl(...)"`) parte anche se il valore è stato scritto via JS, non digitato.

Nell'anteprima, quando `canale!=='wa'`, sotto la textarea compare un riquadro **"Come apparirà nella mail"** che mostra `_psMdToHtml` renderizzato, aggiornato in diretta (`oninput` sulla textarea) — utile perché il grassetto/corsivo/elenco nella mail sono resi realmente, mentre nel corpo grezzo restano solo asterischi/trattini.

**Worker**: perché la mail arrivi davvero in HTML serve che `handlePrestayMail` sul Cloudflare Worker inoltri anche `html` a Resend, oltre a `text` — vedi `worker-prestay-mail.md`. Senza aggiornare/ridistribuire il Worker, la mail parte comunque (usa il campo `text`, che Compass manda già ripulito dai marcatori via `_psMdStrip`), solo senza grassetto/corsivo/elenco resi.

---

## Resi Biancheria — Fornitore Raimondo (view `resi-biancheria`)

### Scopo e confini

Traccia digitale della **distinta cartacea** che le housekeeper compilano ogni giorno per la biancheria macchiata/difettata da rendere al fornitore Raimondo. Deliberatamente **solo lato Compass e solo per il QM**: le HKP continuano a scrivere sul modulo cartaceo come da procedura, il QM trascrive qui e da qui genera la distinta riepilogativa A4 da far firmare a Raimondo. Nessuna app mobile per le cameriere, nessun accesso per la ditta esterna di Art Resort.

**Due strutture** (`RESI_HOTELS`): SoulArt Hotel (`sa`) e Boutique Hotel Piazza Carità (`bh`), selezionabili a linguette. **Art Resort resta fuori di proposito** — fa capo al Sig. Maddaloni, non al QM, e la sua ditta di pulizie è esterna. I due sacchi sono fisicamente distinti e si consegnano separatamente, quindi periodo aperto, totali, avviso e distinta sono **sempre di una struttura sola**.

**Voce menu**: "Messaggi Pre-stay" vive in **Operativo Quotidiano**, subito dopo Registration Cards — è un'attività quotidiana di reception, non un'impostazione. `breadcrumbs.prestay` è `'Operativo Quotidiano'`.

**Voce menu**: la voce sidebar "Resi Biancheria" vive dentro la sezione **Housekeeping** (insieme a "Operativa HKP" e "Bilanciamento Camere"), non più in una sezione "Biancheria" a sé — eliminata perché conteneva una sola voce. `breadcrumbs['resi-biancheria']` è `'Housekeeping'`.

### Modello dati (chiave KV `qm_resi_biancheria`)

```js
{
  righe:  [{id, ts, hotel:'sa'|'bh', data:'dd/MM/yyyy', tipologia, qta, motivo, hk, ritiroId, edits:[]}],
  ritiri: [{id, ts, hotel, dal, al, sacchi, totPezzi, dataRitiro, firmato}],
  tipologie: [...]   // null = usa RESI_TIPOLOGIE_DEFAULT (condivise tra le strutture)
}
```

Righe e ritiri salvati **prima** dell'aggiunta del Boutique non hanno il campo `hotel`: `_resiH()` li fa valere come SoulArt (era l'unica struttura gestita), così i dati già inseriti restano dove sono invece di sparire dal filtro.

**Periodo aperto = righe con `ritiroId:null`.** Non esiste una "quindicina" calcolata a calendario: le righe si accumulano nel periodo aperto finché non si registra un ritiro, che le chiude assegnando il proprio id — rispecchia la procedura reale (il ritiro avviene "ogni 15 giorni" ma nella pratica quando passa Raimondo). Il periodo `dal`/`al` del ritiro è ricavato dalle **date minime/massime delle righe consegnate**, non dalla data del ritiro. `resiDelRitiro()` annulla un ritiro rimettendo le sue righe nel periodo aperto.

### La stampa della distinta È la consegna — e il taglio è al giorno del ritiro (01/09/2026)

Due difetti che si sommavano, entrambi invisibili guardando la schermata:

1. **`resiPrintDistinta()` non toccava i dati.** A chiudere il periodo era solo il bottone separato "✓ Registra ritiro Raimondo": chi stampava la distinta, la faceva firmare a Raimondo e gli consegnava il sacco si ritrovava l'elenco "Periodo aperto — resi non ancora consegnati" ancora pieno dei pezzi appena dati via. Alla consegna successiva finivano in distinta una seconda volta.
2. **Si chiudevano tutte le righe aperte, quelle del giorno stesso comprese.** Raimondo passa alle **8:00**, prima che le cameriere lavorino: i resi trovati nella giornata del ritiro non sono nel sacco che porta via. Finivano dentro una distinta già consegnata, cioè sparivano — e un pezzo che manca senza comparire da nessuna parte è esattamente il problema che questo modulo esiste per risolvere.

| Funzione | Ruolo |
|---|---|
| `_resiDaConsegnare(dataRitiro,h)` | Le righe aperte **datate PRIMA** del giorno del ritiro. È il taglio |
| `_resiChiudiPeriodo()` | **Unico** punto che crea un ritiro: chiede data e sacchi, mostra cosa esce e cosa resta, chiude. Ci passano sia la stampa sia "Registra ritiro" |
| `resiPrintDistinta(id)` | Senza `id`: chiude il periodo **e poi** stampa la distinta di quel ritiro (sacchi e data già compilati, prima restavano in bianco). Con un `id`: ristampa, non tocca nulla |
| `resiPrintBozza()` | Copia di lavoro del periodo aperto, **non** chiude niente — marcata BOZZA sul foglio. È l'unico modo rimasto di stampare senza consegnare |
| `resiRegistraRitiro()` | Per chi consegna senza stampare |

**La regola del taglio è la stessa del modulo Biancheria** ("il consumo del giorno del giro finisce nel giro successivo"): stesso fornitore, stesso passaggio delle 8:00. Se un domani cambia l'orario di Raimondo, vanno cambiate tutte e due.

La conferma prima di chiudere **dice sempre quante righe restano aperte** e perché: senza, un elenco che non si svuota del tutto sembrerebbe un guasto. Se *tutte* le righe aperte sono del giorno del ritiro o successive non si registra un ritiro da zero pezzi: si spiega che quel sacco è vuoto.

**Attenzione all'ordine dentro `_resiChiudiPeriodo`**: `ritiroId` e il `push` del ritiro vanno fatti **prima** dell'`await _resiSave()`. `_resiSave()` riassegna `_resi` con l'archivio fuso dal cloud, quindi dopo l'attesa quegli oggetti non sono più quelli dentro `_resi` e le modifiche andrebbero perse (stessa trappola annotata in "Salvataggio sicuro degli archivi a elenchi").

Coperto da **12 controlli** in `test/controlli.js` ("Resi biancheria: il taglio del periodo alla consegna"), verificati sabotando la regola (`d<lim` → `d<=lim`): 6 falliscono.

Le correzioni di quantità (`resiEditQta`) aggiungono sempre una riga a `edits[]` con vecchio/nuovo valore e motivo — stesso principio della cassa reception, mai sovrascrittura silenziosa.

### Una consegna non torna indietro da sola (01/09/2026)

**Il difetto vero**, trovato su dati reali dopo la correzione qui sopra: il ritiro del 22/08 era registrato **e firmato** (`06/08 → 20/08`, 1 sacco, 25 pezzi), e le sue righe erano di nuovo nel periodo aperto come *"non ancora consegnate"*. Non erano state riaperte da nessuno: erano **tornate indietro**.

Causa, in `_qmUnisciRecord` (§§ SINCRONIZZAZIONE CONTINUA): a parità di `id` vinceva **sempre** il locale. La regola è giusta per una correzione fatta a mano, ma `ritiroId` non è un campo che si corregge — è un **passaggio di stato**, e "assente" ne è la versione più vecchia. Bastava quindi una postazione ferma a prima della consegna (o anche solo il suo `localStorage`, che `_qmLeggiArchivio` fonde allo stesso modo) per rimettere `ritiroId:null` sopra righe già consegnate. Alla consegna successiva finivano in distinta una seconda volta.

`_QM_CHIUSURE=['ritiroId']` inverte la regola per quei campi soli: **vince chi è chiuso**. Con una eccezione necessaria — se il ritiro è in `_rimossi` (cioè `resiDelRitiro` lo ha annullato di proposito) la riga **deve** riaprirsi, altrimenti "Annulla ritiro" non annullerebbe più niente. Su tutti gli altri campi continua a vincere il locale. La fusione **non muta** i record di partenza (`Object.assign` su copia): `_resi` li tiene per riferimento.

Aggiungendo in futuro altri campi che segnano una chiusura irreversibile, basta metterli in `_QM_CHIUSURE`.

**Le righe già tornate indietro non si riparano da sole** — `ritiroId` era stato azzerato, non c'è più traccia di quale ritiro le avesse chiuse. `_resiRiaperte()` le riconosce **dalla data**: una riga aperta che cade dentro il periodo di un ritiro consegnato è per forza una riga che quel ritiro aveva chiuso, perché `dal`/`al` sono per costruzione il minimo e il massimo delle righe che ha portato via. Un banner ambra le segnala e `resiRiassegnaRiaperte()` le rimette al loro posto.

**La riassegnazione non è automatica**, e il motivo è un caso reale che l'accostamento per data sbaglierebbe: un reso trascritto in ritardo, datato dentro un periodo già consegnato ma mai finito nel sacco. La conferma dice quante righe e quali ritiri tocca, e ricorda quel caso — stessa scelta delle osservazioni in conflitto della calibrazione: l'utente sa quale è sbagliata, il dashboard no.

Coperto da **15 controlli** ("Resi biancheria: una consegna non torna indietro da sola"), verificati sabotando sia `_QM_CHIUSURE` sia l'estremo del periodo.

### Avviso ritiro (`RESI_GIORNI_RITIRO = 15`)

`_resiGiorniDaUltimoRitiro(hotel)` conta i giorni **dall'ultimo ritiro** della struttura, o — se non ce n'è mai stato uno — **dal reso più vecchio ancora aperto**. Oltre la soglia compare un banner ambra sopra il form.

Ritorna `null` (nessun avviso) quando **non ci sono righe aperte**: senza resi in attesa non c'è nulla da sollecitare, e un avviso perenne diventerebbe rumore da ignorare. Sulla linguetta della struttura **non** selezionata compare un pallino ambra se anche lì il periodo è da chiudere — altrimenti un ritardo sull'altra struttura resterebbe invisibile finché non ci si passa sopra.

### Tipologie e motivi

`RESI_TIPOLOGIE_DEFAULT` (13 voci standard: lenzuola, federe, copripiumino, asciugamani, ecc.) è modificabile dall'interfaccia ("Modifica elenco tipologie" → salva in `_resi.tipologie`), così i totali per tipologia restano coerenti invece di dipendere da come ognuno scrive la stessa cosa. `RESI_MOTIVI` è invece fisso nel codice (Macchiata, Strappata, Usurata, Ingiallita, Bruciata, Scolorita, Altro).

### Stampa A4 (`_resiStampa(ritiroId,bozza)`)

Replica il modulo cartaceo originale: intestazione struttura + periodo + totale pezzi, riquadro con le 3 note della procedura, tabella `Data | Tipologia | Quantità | Motivo | Firma HK`, blocco "Ritiro Fornitore Raimondo" con n° sacchi/totale/data e riga firma, blocco "Consegna distinta firmata" al Sig. Presta. Stesso pattern `window.open` + `document.write` + `print()` usato altrove nel dashboard.

È il solo disegnatore del documento: ci arrivano `resiPrintDistinta(id)` (dopo aver chiuso il periodo, o per una ristampa) e `resiPrintBozza()`. Con `bozza` in cima al foglio compare l'avviso che il periodo **non** è chiuso — altrimenti una copia di lavoro sarebbe indistinguibile dalla distinta buona e potrebbe essere firmata da Raimondo per sbaglio.

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

## Registration Cards Galleria — un'app a sé, fuori da Compass

`registration-galleria.html`. È il file HTML che i colleghi dell'altra struttura già usavano
per generare le registration card: legge il PDF arrivi del PMS con pdf.js **dentro il
browser** e stampa le schede A4 (dati carta di credito e firma inclusi, da compilare a
mano). Il loro codice non è stato riscritto: è quello, con in più l'aggiornamento
automatico e la veste grafica Compass.

**Perché non è una vista dentro Compass**: i colleghi non hanno (e non devono avere) accesso
a Compass, che resta il pannello del QM. Serviva una pagina loro, con un indirizzo loro.

**Non manda NIENTE sul cloud, ed è una scelta, non una dimenticanza.** Legge il PDF nel
browser e stampa: nomi degli ospiti, date, camere e dati della carta non escono da lì.

**Dal 02/09/2026 non tocca il cloud in nessun modo, e quindi non compare più nel Pannello
App.** Fino a quel giorno mandava due sole cose — acceso/spento (chiave `rc` in
`qm_app_status`) e l'orario dell'ultimo utilizzo (`qm_rc_last`) — ed era per questo che
aveva una scheda nel pannello. Sono state tolte quando l'accesso al Worker è stato
riservato ai dispositivi abilitati: restare agganciata avrebbe voluto dire chiedere un
lasciapassare anche ai colleghi della Galleria, che usano l'app solo per stampare le
schede e non hanno niente a che fare con Compass. **Il prezzo, accettato consapevolmente:
dal Pannello App non si spegne più da remoto e non si vede più quando è stata usata.** Se
serve fermarla, si toglie il file o si cambia il link.

Per questo non ha (e non deve avere) la schermata di abilitazione delle altre cinque app.
Un controllo in `test/esegui.sh` verifica che non le rientri dentro una `fetch` verso il
Worker: succederebbe in silenzio e l'app smetterebbe di funzionare in Galleria.

Ha anche l'aggiornamento automatico delle altre app (`QM_APP_BUILD` + confronto ETag), con
una guardia in più: non si ricarica mentre è aperta l'anteprima di una scheda.
`strumenti/versione.sh` la include nell'elenco delle app di cui aggiorna `QM_APP_BUILD`.

**Veste grafica allineata a Compass** (02/09/2026): token `--accent` navy / `--gold`,
topbar navy con filo oro e stella della bussola, card con bordo superiore oro e
intestazione navy, e lo **splash** delle altre app (bussola con ago che ruota ed eco radar,
"Compass QM" + nome dell'app) a ogni apertura — saltato sui ricaricamenti, altrimenti un
aggiornamento automatico sembrerebbe una riapertura. **Il CSS di STAMPA e l'anteprima
`.mp` non sono stati toccati**: quella è la scheda che si consegna all'ospite, non
l'interfaccia.

**La scheda stampata segue lo stesso linguaggio** (02/09/2026): bordi delle sezioni navy
invece che neri, fasce di sezione in azzurro tenue, etichette IT/EN come pastiglie navy
piene. **L'intestazione è a FONDO BIANCO**, con titolo e numero camera in navy e il filo
oro sotto: la prima versione la riempiva di navy pieno, ed è stata rifatta subito — un
blocco pieno alto ~20mm su tutta la larghezza, per ogni ospite di ogni giorno, consuma
troppo toner. È l'unico riempimento a copertura piena che c'era; le fasce di sezione
rimaste sono azzurro chiarissimo. **Se si ritocca questa scheda, non reintrodurre fondi
pieni.** **Il testo resta nero**: su una stampante in
bianco e nero il navy diventa grigio scuro e un testo grigio si legge peggio; l'oro è solo
decorativo, quindi stampato in monocromatico non porta via nessuna informazione. Nessun
marchio Compass sul foglio: è un documento che si consegna all'ospite, non uno strumento
interno.

**Ogni scheda usciva con una SECONDA PAGINA BIANCA dietro** — un foglio sprecato per ogni
ospite, difetto presente fin dall'origine. `.print-page` è alta `297mm` esatti e ha i suoi
margini interni (11/13mm), ma i margini di stampa del browser si sommano: il foglio non
entra nell'area stampabile e trabocca. Risolto con `@page { size: A4; margin: 0; }` dentro
il blocco di stampa. Verificato generando il PDF con Chromium prima e dopo: 2 pagine contro
1, e con due ospiti 2 pagine (non 4). La riga della firma resta dentro il foglio (misurata:
contenuto 1123px = altezza pagina, firma a 1064).

**pdf.js arriva da un CDN e la sua assenza non deve uccidere la pagina**: la riga
`pdfjsLib.GlobalWorkerOptions.workerSrc = …` in cima allo script lanciava un errore che
portava giù *tutto* il resto — la pagina restava a schermo ma inerte, e il riquadro di
caricamento non rispondeva senza dire perché (visto dal vivo provando la pagina senza
rete). Ora c'è `PDF_OK` e, al caricamento di un file, un messaggio esplicito.

**La sentinella di `test/esegui.sh` la include** nel giro delle app standalone, quindi vale
anche qui il controllo che `qmKvSet` non chiami se stessa.

Difetti noti del file originale, **non toccati** perché è la loro app e funziona sui loro
export — da sistemare solo se lo chiedono:
- il parser è una `RegExp` sul testo concatenato: un nome andato a capo nell'export lo
  spezzerebbe (Compass per lo stesso motivo legge le colonne per posizione, vedi
  `_psParsePdfArrivi`);
- l'anno si prende dall'intestazione del PDF e vale per arrivo **e** partenza: un soggiorno
  a cavallo di capodanno (30/12 → 02/01) darebbe notti negative, quindi `—`.

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

**Ricontrollo mentre l'app resta aperta**: `qmCheckAppStatus()` gira al caricamento, su `visibilitychange` (quando l'app torna in primo piano) e ogni 60s via `setInterval`, **solo mentre l'app è a schermo** — necessario perché un'app rimasta aperta in background su uno smartphone (icona home screen mai chiusa) non rileggerebbe mai lo stato senza questo. Se il fetch fallisce (rete assente), l'app **resta utilizzabile** (fail-open) — non blocca mai per un problema di connessione.

**Non implementato**: contatore accessi per dispositivo (rimosso su richiesta esplicita — "non si è rivelato utile"). Le funzioni `loadHkAccessStats`, `loadBkfAccessStats`, `loadDvrAccessStats` e il toggle "escludi questo dispositivo" sono stati eliminati insieme alle relative sezioni UI. **Dal 04/09/2026 anche le app hanno smesso di scriverlo**: `qm_hk_access` / `qm_bkf_access` / `qm_dvr_access` costavano una lettura e una scrittura a ogni apertura per un dato che nessuno leggeva più, e le scritture sul piano gratuito sono 1.000 al giorno. Se un domani servisse contare gli accessi va ripensato: non un contatore riscritto da ogni dispositivo a ogni apertura.

### Avviso toast — solo Breakfast (`qm_bkf_banner`)

Messaggio scritto dalla dashboard, mostrato come toast temporaneo (7s) su `breakfast.html`, **solo quando si è sulla tab "Analisi"** (attenzione: nel codice quella tab è `switchTab('report')` — non un sub-tab `_ddtBkfTab==='analisi'` dentro Ordini/Acquisti, che esiste ma non è mai raggiungibile da nessun bottone della UI. Il bottom-nav di `breakfast.html` è: Servizio→`day`, Acquisti→`orders`, **Analisi→`report`**).

```js
const BKF_BANNER_KEY = 'qm_bkf_banner';
let _bkfBanner = { enabled: false, message: '' };
```

- Interruttore acceso/spento **indipendente** da quello dell'app (`miniappToggleBkfBanner()` vs `miniappToggleApp('bkf')`).
- Campo testo libero + pulsante "Salva avviso" (`miniappSaveBkfBanner(btn)` — mostra "✓ Salvato" per 1.5s sul bottone stesso, poi torna al testo originale: è solo conferma visiva, non un errore se sembra "tornare indietro").
- In `breakfast.html`: `qmCheckBanner()` viene chiamata su `visibilitychange`→visible e dentro `switchTab()` quando `tab==='report'`; si nasconde subito se si esce da quella tab. Non è nel polling periodico (quello è solo per il check on/off dell'app).
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

## Biancheria — Ciclo pulito/sporco (Fornitore Raimondo)

Vista `biancheria` (`§§ BIANCHERIA` in app.js, chiave KV `qm_biancheria`). **Da non
confondere con `resi-biancheria`**, che è un modulo diverso: quello tratta i pezzi
inidonei (macchiati, strappati) che viaggiano in un sacco separato con distinta propria
ogni 15 giorni; questo tratta il giro normale del pulito e dello sporco.

### Il problema che risolve

Raimondo consegna il pulito lasciando la **sua** distinta, che l'albergo conserva, ma
**ritira lo sporco senza che nessuno lo conti e senza firmare niente**. Mancando quel
documento, quando salta fuori del materiale mancante non si può stabilire se è sparito
dentro l'albergo o se non è tornato dalla lavanderia. Il modulo genera la distinta di
consegna che oggi non esiste.

### Lo sporco non si conta a parte

La quantità che esce **è** la somma dei consumi giornalieri dei fogli camera del periodo.
Non esiste una seconda conta dei sacchi: se dal giro scorso sono state consumate 26
federe, escono 26 federe. Il campo resta correggibile, ma il valore proposto viene sempre
dai consumi.

### REGOLA DEL PERIODO — il giorno del giro resta fuori

Raimondo passa alle **8:00**, prima che le cameriere lavorino. Quindi:

> Il giro del giorno D ritira i consumi **dal giorno del giro precedente (incluso) al
> giorno prima di D (incluso)**. Il consumo del giorno stesso del giro finisce nel giro
> successivo.

Con il calendario martedì / giovedì / sabato: martedì ritira sab+dom+lun, giovedì ritira
mar+mer, sabato ritira gio+ven.

Il `dal` si ricava dai **giri realmente registrati**, non dal calendario: se un giro
salta, il successivo copre da solo il buco. Non sostituire questa logica con un calcolo
sui giorni della settimana.

#### Il calendario serve solo al primo giro — `BIA_GIORNI_GIRO`

Finché **non esiste nessun giro registrato** non c'è un "dal" da cui partire. La prima
versione ripiegava sul consumo più vecchio registrato, e con un solo giorno inserito il
periodo si riduceva a quel giorno: per un giro di sabato con i soli consumi del venerdì
mostrava *"dal 21/08 al 21/08"*, e sembrava che l'app ignorasse il ritmo del giro.

Il ripiego è **il giorno di calendario in cui Raimondo sarebbe passato la volta prima**
(`BIA_GIORNI_GIRO=[2,4,6]`, martedì/giovedì/sabato): sabato → giovedì, martedì → sabato,
giovedì → martedì. Vale **identico per tutte e due le strutture**: è il ritmo del
fornitore, non una caratteristica dell'hotel — ma consumi e giri restano separati per
struttura.

**I consumi più vecchi del calendario restano fuori.** Una versione intermedia li faceva
uscire tutti ("escono anche i consumi più vecchi mai consegnati"), e per un giro di sabato
mostrava *da martedì a venerdì* invece di *giovedì e venerdì*. È sbagliato perché **i giri
avvengono comunque, registrati qui o no**: quello sporco è già uscito con i giri fatti
prima di iniziare a usare il modulo. Restano fuori dal sacco, ma il pannello li **nomina**
in una riga a parte, con l'indicazione di registrare quel giro se davvero non erano mai
stati consegnati — sparire in silenzio sarebbe peggio che restare fuori con una
spiegazione.

`_biaPeriodo` restituisce anche `fonte` (`giro` · `calendario`), **mostrata sempre nel
pannello**: un intervallo di date senza spiegazione non permette di accorgersi che è
sbagliato. Il calendario non scavalca mai un giro registrato — verificato in test.

Due segnalazioni nate dallo stesso equivoco:

- **giorni del periodo senza consumi registrati** (`_biaGiorniSenzaConsumi`), in ambra:
  è ciò che rende incompleto lo sporco che esce, ed è la dimenticanza più facile;
- **data del giro fuori calendario** (una domenica): non è un errore — un giro
  straordinario è legittimo — ma se è una svista va vista prima di stampare la distinta.

Il periodo si scrive con i **nomi dei giorni** fino a quattro giorni (*"di giovedì 20 e
venerdì 21"*), non come intervallo di date: `18/08 → 21/08` non dice a colpo d'occhio se
sono i giorni giusti, `martedì 18 … venerdì 21` sì.

### Congelamento dello sporco consegnato

`consegnato` viene salvato sul giro al momento della registrazione, non ricalcolato al
volo. Correggere più tardi un consumo giornaliero non deve cambiare i giri già chiusi né
le distinte già firmate da Raimondo.

### Confronto e saldo

- **Atteso** al giro N = `consegnato` del giro N-1 (stessa struttura). Al primo giro è
  `null` e la colonna mostra `—`.
- **Ricevuto** si precompila uguale all'atteso: nel caso normale non si digita nulla, si
  interviene solo quando la distinta di Raimondo dice altro.
- **Saldo** = somma su tutti i giri di (ricevuto − atteso). Un singolo giro può chiudere
  in pari per caso; è il cumulato che rivela una perdita sistematica.

### Voci e strutture

Le sette voci dei fogli camera (`BIA_VOCI`) sono **diverse** da `RESI_TIPOLOGIE_DEFAULT`
e non vanno unificate: `Lenzuolo matrimoniale, Lenzuolo singolo, Federa, Telo doccia,
Asciugamano viso, Asciugamano bidet, Scendibagno`. Strutture: SoulArt e Boutique
(`BIA_HOTELS`), come per i resi — Art Resort resta fuori.

### La casella "Ricevuto" non ridisegna il pannello

`biaRender()` rigenera **tutto** l'HTML della vista. La casella *Ricevuto* aveva
`oninput="biaRender()"` per aggiornare la colonna Δ mentre si digita: a ogni tasto la
tabella veniva ricostruita con il valore **calcolato** (l'atteso, cioè `0` finché non
esiste un giro precedente), quindi la cifra appena digitata spariva e il campo perdeva il
fuoco. Da fuori sembrava semplicemente che il numero non si potesse inserire — segnalato
come *"tento di digitare il numero ma resta sempre 0"*.

Ora l'`oninput` chiama `biaAggiornaDelta()`, che tocca **solo** le celle interessate: il Δ
di ogni riga (`bia-d-N`), lo sfondo della riga e l'avviso di ammanco (`bia-diff-msg`, ora
sempre presente nel DOM e nascosto quando non serve). L'atteso della tabella a schermo sta
in `_biaAttesoVis`, scritto da `biaRender()`.

**Regola per qualunque casella futura di questo pannello**: aggiornare i pezzi che
cambiano, mai ridisegnare tutto sotto le dita di chi sta scrivendo.

Nella stessa correzione: l'avviso diceva *"mancano N pezzi"* anche quando ne rientravano
**più** di quanti ne erano usciti (usava `Math.abs` su una differenza con segno) —
`_biaMsgDiff(tot)` ora distingue i due casi. Le tre caselle numeriche hanno
`onfocus="this.select()"`: partendo da `0`, digitare senza cancellare dava `50` invece di
`5`.

### Lo storico è di ENTRAMBE le strutture, e dice con cosa confronta (fix 03/09/2026)

**Sintomo**: la riga del 01/09 diceva `consegnati 436 · ricevuti 318` e accanto **in pari**.
Chi legge fa `318 − 436 = −118` e conclude che il pannello mente.

**Il conto era giusto**: 318 ricevuti contro **318 attesi**, cioè i sacchi usciti al giro
precedente (29/08). A mancare era il termine di confronto, che non compariva da nessuna
parte — e al suo posto c'era un numero, i 436 sacchi usciti *quel* giorno, che col
confronto non c'entra nulla: quelli tornano al giro **dopo**. Stessa classe di difetto dei
suggerimenti di bilanciamento: numeri giusti, racconto sbagliato.

La riga ora dice: *"01/09/2026 · SoulArt · ha portato **318** su **318 attesi — i sacchi del
29/08/2026** · in pari"*, con sotto, in grigio, *"sacchi dati a lui quel giorno: 436 —
tornano al giro dopo, non contano in questa riga"*. Il linguaggio è lo stesso della tabella
di lavoro (*Doveva portare / Ha portato*), che era già chiara: era solo lo storico a
ricadere nel gergo ambiguo.

**Lo storico copre tutte e due le strutture** (`_biaGiriTutti`), con la struttura in
pastiglia su ogni riga: Raimondo è lo stesso fornitore per entrambe e va controllato
insieme, non una linguetta alla volta. **I calcoli restano rigorosamente per struttura** —
`_biaRigaGiro` passa sempre da `_biaGiroPrec(_biaH(g), …)`, mai dall'hotel selezionato a
schermo. È l'errore facile ora che le due convivono nella stessa lista: col 01/09 presente
su entrambe, pescare l'atteso dall'hotel sbagliato darebbe al Boutique un ammanco inventato
di −228 (verificato sabotando).

In testa al pannello, per ciascuna struttura: *"ha portato N pezzi su M attesi"* con il
saldo. Somma **solo i giri con un termine di confronto**, gli stessi che conta `_biaSaldo`,
così `portato − atteso` coincide sempre col saldo del pannello sopra invece di divergere di
un giro senza che si capisca perché; il primo giro viene contato a parte e dichiarato.

**Un rientro in più non è un ammanco: è VERDE, numero e riga.** Il `+3` del 25/08 era
dipinto di **rosso** come una perdita; una prima correzione lo portò ad **ambra** — meglio,
ma pur sempre un colore d'allarme su una cosa che non è un problema. La regola definitiva è:
**solo un ammanco è rosso**, in pari e rientro in più sono tutti e due verdi.

Tre funzioni, una scala sola per tutti i punti che mostrano una differenza (tabella del
giro, storico, saldo cumulato, avviso):

| Funzione | Cosa colora |
|---|---|
| `_biaColDelta(d)` | il **numero** — `d<0` rosso, altrimenti verde |
| `_biaBgDelta(d)` | la **riga** — rosso tenue se manca, verde tenue se è tornato di più, niente se in pari |
| `_biaStileMsg(tot)` | l'**avviso** in cima alla tabella |

**Il numero da solo non basta**: colorare di verde un `+8` lasciando la riga tinta di rosso
è la stessa contraddizione di prima, spostata di due centimetri. Stesso discorso per
l'avviso, che diceva *"sono rientrati 8 pezzi in più"* dentro un riquadro rosso d'allarme.
Le tinte di riga sono `rgba` scritte a mano e non token: servono all'8-9% di opacità e
devono restare leggibili anche in tema scuro, dove `--green` è molto più acceso.

Vale per il render **e** per l'aggiornamento mentre si digita (`biaAggiornaDelta`), che
tocca colore del numero, sfondo della riga e stile dell'avviso insieme.

### Non solo QUANTO porta, ma COSA (03/09/2026)

Un totale non è azionabile: `−66` non dice se mancano le federe o i teli doccia, che è la
sola informazione con cui si contesta qualcosa al fornitore o si cercano i pezzi in
albergo. I dati per voce c'erano da sempre — `ricevuto`/`consegnato` sono oggetti
indicizzati per tipologia — ma la vista li sommava e li buttava via.

| Dove | Cosa mostra |
|---|---|
| **Ogni riga dello storico** | pulsante *"Cosa ha portato"* → tabella `Tipologia · Ha portato · Doveva portare · Differenza` per quel singolo giro |
| **In testa al pannello** | *"Cosa porta, per tipologia"* → la stessa tabella sommata su tutti i giri confrontabili, per struttura: dice **dove si concentra** l'ammanco |

`_biaTabellaVoci(righe,conf)` è l'**unica** funzione che disegna quella tabella: i due punti
non possono divergere nel formato. `conf` dice se esiste un termine di confronto — al primo
giro le colonne del dovuto e della differenza non vengono stampate invece di mostrare zeri
inventati.

**Il filtro tiene le voci che si sono mosse su UNA QUALSIASI delle tre colonne**
(`portato || dovuto || uscito`), non solo sul portato. Una voce **attesa e mai tornata** è
l'ammanco più grave e la riga che si va a cercare: filtrarla via perché `portato===0` è
l'errore facile, coperto da tre controlli.

`_biaTotPerVoce` somma **solo i giri con un termine di confronto**, lo stesso insieme di
`_biaSaldo` e `_biaRiepilogoPortato`: le tre letture non possono raccontare cose diverse.
Verificato in test che le somme del dettaglio coincidano sempre col totale della riga e col
saldo del pannello.

**Stato aperto fuori da `biaRender`** (`_biaGiroAperto`, un `Set`, e `_biaVociAperte`):
`biaRender()` rigenera tutto l'HTML, quindi uno stato interno si richiuderebbe da solo al
primo ridisegno — stessa lezione di `_speseCatOpen` in Spese Fornitori. È un insieme e non
un id solo perché due strutture nello stesso giorno si confrontano solo tenendole aperte
insieme.

Nella stessa modifica, due correzioni di impaginazione: la pastiglia usa un **nome corto**
(`BIA_HOTEL_BREVE`) — *"Boutique Hotel Piazza Carità"* per intero mandava i pulsanti a capo
su una riga tutta loro — e i pulsanti stanno **fuori** dal flex che va a capo, così restano
allineati alla riga che comandano.

Coperto da **24 controlli** ("Biancheria: non solo quanto porta Raimondo, ma COSA"),
verificati con tre sabotaggi (dovuto dall'hotel sbagliato, primo giro confrontato con se
stesso, filtro sul solo portato): 3, 6 e 5 falliscono.

### Strutture RAGGRUPPATE, non mescolate per data (03/09/2026)

Mostrare i giri delle due strutture in un unico elenco cronologico sembrava dare più
informazione e invece ne toglieva: la catena di confronto è **per struttura**, quindi due
righe della stessa data — *"03/09 SoulArt … i sacchi del 01/09"* seguita da *"03/09 Boutique
… i sacchi del 01/09"* — si leggevano come la stessa cosa scritta due volte, e seguire la
serie di una struttura sola voleva dire saltare una riga sì e una no.

Ora il pannello ha **un blocco per struttura**, ciascuno con la sua intestazione, il suo
totale (`ha portato N su M attesi`) e il suo dettaglio per tipologia. La pastiglia per riga
è sparita insieme a `BIA_HOTEL_BREVE`: col raggruppamento non serviva più, e lasciarla
sarebbe stato codice morto.

Un controllo conta le **righe** (`sacchi dati a lui quel giorno`) fra un'intestazione e
l'altra, non le date: le due strutture hanno giri negli stessi giorni, quindi una data non
distingue niente — ed è esattamente il motivo per cui mescolarle era illeggibile.

### Aprire un pannello deve portarlo in vista

Cliccando *"Storico e ristampe"* la pagina si allungava ma il pannello restava sotto il
bordo dello schermo: bisognava scorrere a mano per vedere quello che si era appena chiesto.

**A scorrere non è la finestra ma `.content`** (vedi la regola generale nel pre-stay):
`_qmPortaInVista(id,margine)` — accanto a `_psScroller`, prefisso `_ps` storico ma
contenitore unico per tutta la dashboard — porta un elemento in cima alla vista, con il
doppio giro via `requestAnimationFrame` perché aprendo un pannello il layout si assesta al
frame successivo e la prima misura sarebbe quella di prima dell'espansione.

Distinzione importante: **aprire lo storico porta in vista, aprire una riga NO**.
`biaToggleGiro`/`biaToggleVoci` passano da `_psSenzaSalto`: si sta già guardando quella
riga, e un salto la porterebbe via proprio mentre la si legge.

### Report andamento per la direzione — `biaPrintAndamento()`

Diverso dalla distinta: quella è il documento che Raimondo firma, questo è il foglio da
portare in riunione. Racconta la **serie**, non il singolo giro.

Per struttura: KPI (giri, dovuto, portato, differenza, **resa**), grafico a barre della resa
per giro, tabella dei giri con cumulato, tabella per tipologia. In fondo il totale di gruppo.

La **resa** (`portato/dovuto`) è ciò che rende confrontabili giri di dimensione diversa: un
−20 su 100 pezzi e un −20 su 500 non sono lo stesso fatto, e il solo saldo non lo dice.
`_biaAndamento(hotel)` produce la serie ed è testabile in isolamento; il suo **cumulato
finale deve coincidere col saldo del pannello** — sono lo stesso numero detto in due posti,
e un controllo lo verifica.

Tre scelte da non ribaltare:

- **Le barre non portano il numero.** Una barra etichettata `99%` accanto a un `98,5%` in
  tabella fa sembrare sbagliato il documento: il grafico dà la **forma** dell'andamento, i
  numeri li dà la tabella. Nessun arrotondamento può quindi contraddire nulla.
- **`BIA_GRAF_MAX=15`**: oltre una quindicina di barre su 470pt diventano stanghette
  illeggibili. Il grafico mostra gli ultimi giri e lo **dichiara nel titolo**; la tabella li
  elenca comunque tutti.
- **Nessun fondo pieno**, come la distinta: testo nero e filetti, si stampa in bianco e nero
  senza perdere niente e non consuma toner. `page-break-inside:avoid` sta su KPI, grafico e
  singole righe, **non** sull'intera sezione — lì lascerebbe mezza pagina bianca.

Coperto da **28 controlli** ("Biancheria: andamento per la direzione e strutture separate"),
verificati con quattro sabotaggi (storico rimescolato, cumulato azzerato a ogni giro, serie
presa da tutte le strutture, scorrimento tolto): 3, 2, 5 e 1 falliscono.

**Attenzione al modello, non toccato qui**: `atteso(N) = consegnato(N−1)` assume che
Raimondo riporti in **un solo giro**. Sui dati reali di SoulArt il saldo cumulato è −308
pezzi su 6 giri: se la resa fosse in due giri, tutte quelle differenze sarebbero da
ricalcolare. Ora che il confronto è visibile riga per riga, è verificabile guardando una
distinta vera.

Coperto da **23 controlli** in `test/controlli.js` ("Biancheria: lo storico dice CON COSA
sta confrontando"), verificati con tre sabotaggi (atteso dall'hotel sbagliato, confronto
sullo sporco uscito, rientro in più di nuovo rosso): 4, 8 e 1 falliscono.

### Funzioni

| Funzione | Scopo |
|----------|-------|
| `biaLoad()` | Carica da KV con fallback localStorage, poi render |
| `_biaGiroPrec(hotel,data)` | Il giro precedente della **stessa** struttura — dà anche la sua data, che lo storico mostra |
| `_biaGiriTutti()` | Tutti i giri di **tutte** le strutture, dal più recente |
| `_biaRigaGiro(g)` | Riga di storico già calcolata: portato, dovuto, data del confronto, differenza |
| `_biaRiepilogoPortato(h)` | Totale portato vs atteso per struttura, sui soli giri confrontabili |
| `_biaDettaglioGiro(g)` | Cosa ha portato **voce per voce** in un singolo giro |
| `_biaTotPerVoce(h)` | Lo stesso sommato sui giri confrontabili: dove si concentra l'ammanco |
| `_biaTabellaVoci(righe,conf)` | L'unica funzione che disegna la tabella per tipologia |
| `_biaAndamento(h)` | Serie storica con resa e cumulato, per il report alla direzione |
| `_biaGraficoResa(serie,l,a)` | Barre della resa, SVG a mano (nessuna libreria nel documento stampato) |
| `biaPrintAndamento()` | Il report A4 per la direzione |
| `_biaColDelta(d)` / `_biaTxtDelta(d)` | Unica scala di colore/testo del numero di una differenza |
| `_biaBgDelta(d)` | Tinta della riga, coerente col numero |
| `_biaStileMsg(tot)` | Stile dell'avviso in cima alla tabella del giro |
| `biaAggiornaDelta()` | Aggiorna Δ e avviso mentre si digita, senza rigenerare l'HTML |
| `_biaPeriodo(hotel,dataGiro)` | Intervallo dei consumi ritirati — vedi regola sopra |
| `_biaSommaConsumi(hotel,dal,al)` | Somma per voce nell'intervallo, estremi inclusi |
| `_biaAtteso(hotel,dataGiro)` | Sporco consegnato al giro precedente |
| `_biaSaldo(hotel)` | Cumulato dei pezzi non rientrati per voce |
| `biaSalvaConsumi()` | Salva i 7 totali del giorno (sovrascrive se la data esiste già) |
| `biaRegistraGiro()` | Registra/aggiorna il giro congelando `consegnato` |
| `biaPrintDistinta(giroId)` | Distinta A4 di consegna; senza id usa il form corrente |

---

## Sincronizzazione continua — ogni postazione si aggiorna da sola

`§§ SINCRONIZZAZIONE CONTINUA` in `app.js`. Nato dalla richiesta: *"Compass deve dare risultati affidabili ed essere sempre aggiornato indipendentemente da quale postazione è accesa o spenta. Non posso chiedere ai collaboratori di uscire e rientrare."*

Prima Compass restava fermo a quello che aveva letto **all'avvio**: chi caricava un PDF su un PC lo vedeva, su tutti gli altri la pagina mostrava i dati vecchi finché qualcuno non premeva Cmd+R. E una copia ferma da ore non è solo scomoda: è **il punto di partenza di ogni sovrascrittura** (vedi l'incidente pre-stay del 22/08/2026). Tenere le postazioni fresche è una misura di sicurezza, non una comodità.

### Tre livelli

| Livello | Cosa fa | Dove |
|---|---|---|
| **Codice** | Una `HEAD` sulla pagina confronta l'**ETag**: se il file è cambiato, la pagina si ricarica da sola. Nessun numero di versione da mantenere a mano | `qmCheckVersione` in `app.js` e in `reception.html` |
| **Dati** | Il polling ora guarda anche **Piano Settimanale** e **registration card**, che nessuno rileggeva | `_qmSyncGiro` |
| **Viste** | La vista attiva si ridisegna quando è arrivato un dato nuovo | `_qmRidisegnaVista` |

`index.html` e `reception.html` erano le **uniche due pagine senza aggiornamento automatico del codice** — proprio quelle che restano aperte tutto il giorno. Le 5 app standalone ce l'avevano dal 22/08.

### Salvataggio sicuro degli archivi a elenchi — DVR, Biancheria, Resi

`_qmSalvaArchivio` / `_qmLeggiArchivio` / `_qmFondiElenchi` nella stessa sezione. I tre archivi hanno la **stessa forma**: un oggetto le cui proprietà sono elenchi di record con `id` — `{righe:[…],ritiri:[…]}`, `{consumi:[…],giri:[…]}`, `{geriart:{visite:[…],dipendenti:[…]}}` — più qualche campo che elenco non è (`tipologie` dei resi). E avevano tutti lo stesso difetto dei pre-stay: si scriveva l'oggetto **intero** con la copia che quella postazione si portava dietro.

Qui non è mai successo perché li tocca praticamente solo il QM da una postazione, ma la forma del difetto era identica.

| Regola | Nota |
|---|---|
| Si rilegge e si **fonde** prima di scrivere | `_qmSalvaArchivio` |
| Gli elenchi di record si uniscono per `id`; a parità di id vince il **locale**, che è quello appena modificato a mano | `_qmUnisciRecord` |
| **Tranne i campi di chiusura** (`_QM_CHIUSURE`, oggi il solo `ritiroId`): lì vince chi è **chiuso**, perché "assente" è la versione più vecchia di un passaggio di stato, non una correzione. Salvo che la chiusura sia in `_rimossi`: quello è l'undo dell'utente | `_qmTieniChiusure` |
| Gli oggetti si scendono ricorsivamente — serve al DVR, annidato per società | `_qmFondiElenchi` |
| Un array che **non** è fatto di record con `id` (le `tipologie`) è un'impostazione, non un registro: vince il locale e non si unisce | `_qmElencoRecord` |
| Senza aver mai letto il cloud in quella sessione **non si scrive** | `_qmSalvaArchivio` |
| Anche la lettura fonde: una scrittura non andata a buon fine non si butta via riaprendo | `_qmLeggiArchivio` |
| Le eliminazioni lasciano l'id in `_rimossi` dentro l'archivio stesso, altrimenti la fusione le rimetterebbe dentro | `_qmSegnaRimosso` |
| **L'id va segnato PRIMA di salvare l'elenco**, e la chiamata è facilissima da dimenticare: `resiDelRow` non ce l'aveva, e il cestino dei resi non cancellava nulla — la riga spariva per un istante e tornava al primo giro, senza nessun errore a schermo. Una sentinella in `test/controlli.js` controlla che ogni funzione di eliminazione la contenga | `resiDelRow`, `resiDelRitiro`, `dvrEmpDelete`, `dvrDelete`, e le due della biancheria |

**`qm_dvr` è letto anche da `dvr.html`**, che però non lo scrive mai (scrive solo `qm_dvr_access`): la chiave `_rimossi` aggiunta in cima all'oggetto non lo disturba, perché itera `DVR_SOC_KEYS`. `qm_biancheria` e `qm_resi_biancheria` sono solo di Compass.

**`dvrSave`, `_biaSave` e `_resiSave` sono ora `async`** e **riassegnano** la loro variabile (`DVR_DATA`, `_bia`, `_resi`) con l'archivio fuso. Chi tiene un riferimento a un elenco *attraverso* l'attesa (`const items=DVR_DATA[soc].dipendenti`) modificherebbe l'oggetto vecchio: verificato che nessun chiamante lo faccia, ma è la trappola da ricordare aggiungendone di nuovi.

### Consumo KV — il polling si ferma a scheda nascosta

Il 31/08/2026 Cloudflare ha avvisato che l'account aveva consumato il **50% del tetto
giornaliero KV del piano gratuito** (100.000 letture al giorno) a metà serata, senza che
nessuno stesse lavorando. Il conto tornava fin troppo bene:

| Pagina | Chiavi lette per giro | Ogni | Letture/giorno a pagina aperta |
|---|---|---|---|
| Compass | `arriviData`, `weekData`, `pulData`, `bkfData`, `hkp_n_sa`, `piano`, `rcGuests` = **7** | 30s | **20.160** |
| `reception.html` (`ricaricaRegistri`) | 3 | 30s | 8.640 |
| Le 5 app standalone (`qmCheckAppStatus`) | 1 ciascuna | 30s | 2.880 ciascuna |
| `breakfast.html` (`ddtBkfSyncFromCloud`) | 2 | 60s | 2.880 |

**Tre Compass aperti sui PC di reception facevano 60.000 letture al giorno da soli**, quasi
tutte di notte o a schermo spento, e nessuna di quelle letture veniva mai guardata da
qualcuno. Il tetto non si superava per un uso intenso: si superava per pagine dimenticate
aperte.

Due misure, entrambe solo lato client (nessuna modifica al Worker):

1. **`_qmPolling(fn,ms)`** (`§§ SINCRONIZZAZIONE CONTINUA`): il giro parte solo se
   `document.visibilityState==='visible'`, e riparte **subito** al `visibilitychange` di
   ritorno in primo piano. Stessa tecnica di `qmCheckVersione`. Usato dal giro principale
   di Compass; le altre pagine hanno la stessa guardia scritta in linea (duplicazione
   voluta: le app standalone non condividono codice con `app.js`).
2. **Intervallo da 30 a 60 secondi** sul giro di Compass, su `ricaricaRegistri` di
   `reception.html` e su `qmCheckAppStatus` delle 5 app.

Insieme portano il consumo a vuoto sotto il 10% di prima.

**Perché non contraddice la regola per cui una copia ferma è pericolosa** (incidente
pre-stay del 22/08/2026): una scheda nascosta non la sta usando nessuno, e il giro riparte
prima che torni utilizzabile. Il rischio è una copia *visibile* e vecchia, non una copia
nascosta.

`visibilitychange` **non** scatta quando la finestra perde solo il fuoco restando a
schermo: una postazione con Compass affiancato a un altro programma continua ad
aggiornarsi, ed è giusto — lì il dato lo si sta guardando davvero.

**Il tetto più stretto è quello delle scritture: 1.000 al giorno**, contro 100.000 letture.
Il polling non scrive mai, quindi non c'è stato problema finora, ma un giro Culligan lungo
(`_persist()` a ogni tocco) o una serata di pre-stay ci si avvicinano. Se un domani
l'avviso riguardasse le scritture, è lì che va guardato — non nel polling.

**Se non bastasse**, il passo successivo è una chiave **manifest** con i timestamp di tutte
le chiavi: si legge quella (1 lettura) e le altre solo quando una è cambiata davvero,
portando il giro di Compass da 7 letture a 1. Richiede però di toccare `worker.js` e
**ripubblicarlo a mano** (vedi "Pubblicazione del Worker"), quindi non è stato fatto
insieme a queste due misure, che non richiedono nulla.

### Non si ridisegna mai a vuoto — `_qmCambiato`

Il polling segna `_qmCambiato=true` solo nei rami che hanno davvero applicato un dato nuovo (arrivi, turno, pulizie, colazioni, Piano). Senza quel flag si ridisegnerebbe a ogni giro anche quando non è cambiato niente: accordion che si richiudono da soli, pannelli che sfarfallano, e il giorno del turno che torna a oggi mentre lo stai leggendo.

### `_qmOccupato()` — non si tocca niente mentre l'utente lavora

Ridisegnare sotto le dita fa perdere il testo in corso; ricaricare butta via un modale a metà (un'anteprima già corretta, un DDT in compilazione). Si salta il giro se: il fuoco è in un `INPUT`/`TEXTAREA`/`SELECT` o in un elemento editabile, `#cqDialog` è aperto, o c'è a schermo un elemento con `modal`/`overlay` nel nome (`offsetParent` non nullo e alto più di 40px). Nel dubbio si aspetta il giro dopo — un minuto, non un problema.

### Overview: **mai** `loadWeekData` nel ridisegno in sottofondo

`loadWeekData()` rimette `activeDay` a **oggi**, e anche `refreshOverviewForDate` lo fa (punto 2 della funzione). Chiamarli in un aggiornamento automatico significa strappare via il giorno che l'utente sta guardando nella striscia del turno, a ogni giro. `_qmRidisegnaVista('overview')` quindi **non chiama `loadWeekData`** e, dopo il ridisegno, **rimette il giorno che era selezionato**:

```js
const prima=activeDay;
refreshOverviewForDate(customDate||new Date());
if(nG&&prima!==activeDay&&prima>=0&&prima<nG){activeDay=prima;renderDay(activeDay);updateWeekNavActive();}
```

### `_qmRidisegnaVista` è separato dai ganci di `setView` — di proposito

`setView` oltre a ridisegnare fa cose che in un aggiornamento in sottofondo **non devono succedere**: apre i gruppi del menu, riporta lo scorrimento in cima, e soprattutto chiama `turniPrefMarkAllSeen()` — un aggiornamento automatico che segna lette le Preferenze Turni le farebbe sparire dal badge senza che nessuno le abbia guardate. Le due liste vanno quindi tenute allineate a mano: **aggiungendo una vista, aggiungerla in tutti e due i posti.**

## Adattamento a smartphone — regola generale

**Gli stili in linea non si adattano.** Gran parte delle viste è costruita in JS con
`style="..."`: nessuna `@media` può raggiungerli. Ogni volta che una misura deve cambiare
su smartphone va **spostata in una classe CSS**, lasciando in linea solo ciò che è
davvero dinamico (colori calcolati, stati). Le classi nate così:

| Classe | Dove | Perché esiste |
|---|---|---|
| `.ps-grid`, `.ps-bar-*` | Messaggi Pre-stay | Schede a 3/2/1 colonne; barra di stato che va a capo |
| `.ov-pad` | Blocchi del Piano del giorno | 20px per lato mangiavano un sesto della larghezza su 375px |
| `.ov-bkf-mid`, `.ov-bkf-right` | Pannello Breakfast | Impilandosi, i bordi **verticali** fra le tre celle restavano ai lati come linee nel nulla: diventano sopra/sotto |
| `.ov-week-wrap` | Striscia 7 giorni | Margine ridotto per lasciare larghezza alle schede |
| `.piano-cols`, `.piano-col`, `.piano-cols-div` | Housekeeping in Overview | Le due strutture **si impilano** su smartphone (vedi sotto) |
| `.room-chip-grid` | Camere (Overview + Bilanciamento) | Griglia a colonne uguali invece del capo libero |
| `.ov-room-grid` | Card stato preparazione | Celle fisse: l'ultima card sola non si allarga |
| `.non-servizio-strip`, `.ns-*` | Turno di oggi | Pastiglie tutte uguali, motivo mai a capo |
| `.s-ini` | Nomi del turno | Nasconde l'iniziale del nome (solo cognomi su smartphone) |

### Il collo di bottiglia è la larghezza disponibile, non la dimensione del testo

Due errori commessi e corretti, entrambi risolti guardando **cosa occupa la larghezza**
invece di rimpicciolire:

- **Striscia dei 7 giorni**: si stringevano le schede a 48px per farceli stare tutti, e i
  numeri scendevano a 14px. Ma la larghezza minima la imponevano le **due cifre
  affiancate**. Impilandole, ogni riga usa tutta la scheda e il numero **sale** a 16px pur
  con schede più strette.
- **Camere Housekeeping**: le pastiglie non erano il problema — lo era il fatto che le due
  strutture stessero **affiancate**, con ~170px a testa. Impilate, si passa da 1-2 colonne
  a 3-4 e la pagina si accorcia molto.

### Nomi: separare, non troncare

L'iniziale del nome (`Maddaloni M.`) è racchiusa in `<span class="s-ini">` da `_nomeIniz()`
e **nascosta dal CSS** su smartphone, invece di essere tolta in JS. Così non serve
ridisegnare al ridimensionamento della finestra.

### Attenzione a `window.innerWidth` letto al momento del disegno

`pianoRenderWeek` sceglie la disposizione leggendo `window.innerWidth`. Il valore resta
quello del **momento del disegno**: ridimensionando la finestra il layout restava sbagliato
fino al ridisegno successivo (che il polling fa solo al giro dopo), col risultato di vedere il
layout da telefono su desktop e di vederlo "guarire da solo" dopo mezzo minuto. C'è ora un
listener su `resize` che ridisegna **solo quando la soglia dei 768px viene attraversata**.
Se si aggiunge altrove una scelta di layout basata su `innerWidth`, serve lo stesso
accorgimento.

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

## Conferme — finestra Compass al posto di `confirm()`

`§§ CONFERME` in `app.js`. Sostituisce i dialoghi nativi del browser, che mostrano
"compass-qm.com dice", non si possono impaginare e compaiono ancorate in alto.

```js
if(!await cqConferma('Eliminare questo arrivo?',
    '<strong>'+nome+'</strong><br>I dati inseriti andranno persi.',
    {ok:'Elimina'}))return;

await cqAvviso('Nessun arrivo riconosciuto','Controlla il filtro dell\'export.');
```

`cqConferma` restituisce una **Promise<boolean>**: chi la chiama deve essere `async`. Le 17
conferme convertite erano tutte gestori di `onclick`, che ignorano il valore restituito —
per questo renderle asincrone è stato sicuro. **Verificarlo prima**, se se ne convertono
altre: una funzione il cui risultato viene usato in modo sincrono si romperebbe.

Il secondo argomento accetta **HTML** (`<strong>`, `<br>`), non `\n`.

### Aspetto

Impianto ereditato da `.print-dialog`: stesse misure, stessa ombra, pulsante navy come
"Stampa". **Nessuna icona per tipo**: al loro posto la rosa dei venti del logo
(`img/compass-stella.png`) grande e sbiadita nell'angolo superiore sinistro, inclinata di
22°, ritagliata dal bordo — è un `::before` sul riquadro, quindi non aggiunge nodi. Titolo,
testo e pulsanti hanno `position:relative` per stare sopra. Testo sempre centrato.

`img/compass-stella.png` è derivata da `loghi compass/compass logo stella.png`, che ha il
canale alpha ma **nessun pixel trasparente**: lo sfondo bianco pieno dentro la finestra si
sarebbe visto come un rettangolo. Il bianco è stato reso trasparente sfumando i bordi in
proporzione, per non scalinettare il contorno.

### Comportamento

Invio conferma, Esc e clic fuori dal riquadro annullano. Se il contenitore `#cqDialog` non
esiste si ripiega su `confirm()` nativo invece di bloccare l'operazione.

### Gli avvisi non si attendono

`alert()` era una notifica, non una domanda: nella quasi totalità dei casi il codice dopo si
limitava a `return`. Le 46 chiamate sono quindi state convertite in `cqAvviso(...)`
**senza `await`**, e nessuna funzione ha dovuto diventare `async`. Verificato prima che non
ci fossero due avvisi consecutivi, che con una finestra non bloccante si sovrascriverebbero
(i due vicini in `handleArriviFile` sono in rami alternativi).

`cqAvviso` accetta anche un messaggio solo, nel vecchio formato con gli `\n`: divide la
prima riga come titolo, il resto come spiegazione, e converte gli a capo in `<br>` — in
HTML `\n` non manda a capo. Per questo la conversione è stata una sostituzione diretta
`alert(` → `cqAvviso(` senza riscrivere i 46 testi a mano.

---

## Pubblicazione del Worker — resta MANUALE, di proposito (20/08/2026)

`worker.js` si pubblica a mano: Cloudflare → Workers → anthropic-proxy → Modifica codice →
Cmd+A → incolla → Deploy.

**Valutata e scartata l'automazione via GitHub Actions.** Il motivo non è la difficoltà:
è il rapporto fra rischio e guadagno.

Il Worker non è solo codice. Ha collegato il binding KV `QM_STORAGE` — cioè la
sincronizzazione fra dispositivi, su cui poggia **tutto** Compass — e circa quattordici
variabili d'ambiente impostate dal pannello (`SMTP_*`, `IMAP_*`, `PRESTAY_KEY`,
`ANTHROPIC_API_KEY`, `RESEND_KEY`…). Pubblicando con `wrangler` quella configurazione va
ridichiarata in un `wrangler.toml`: un errore lì non rompe le mail, rompe la
sincronizzazione, e con essa l'intera applicazione.

Il guadagno sarebbe risparmiare un copia-incolla che capita circa una volta al mese.

**Se un domani si decide di farlo davvero**: verificare prima, una per una, tutte le
variabili e il binding presenti nel pannello Cloudflare, e provare su un Worker di prova
prima di toccare quello vivo. Non improvvisare.

### Il problema che restava aperto — risolto il 21/08/2026

Una correzione a `worker.js` poteva essere scritta, versionata e **non attiva**, senza che
nessuno se ne accorgesse: il 21/08/2026 è successo per ore, mentre si cercava la causa dei
rimbalzi Booking proprio nel Worker non pubblicato.

Ora il Worker dichiara la propria versione su **`GET /versione`** (senza chiave: una
stringa di versione non è un segreto, e un controllo che richiede credenziali è un
controllo che nessuno esegue), e `test/esegui.sh` la confronta con `WORKER_VERSIONE` in
`worker.js` prima di ogni pubblicazione:

```
ATTENZIONE  il Worker pubblicato è la versione X, worker.js è la Y.
            Le correzioni a mail e risposte NON sono attive finché non lo ripubblichi.
```

**Non blocca** la pubblicazione: tace se manca la rete, e tace se in produzione gira un
Worker anteriore a questo controllo (nessun `/versione` → niente da confrontare).

**Quando si modifica `worker.js`, cambiare anche `WORKER_VERSIONE`**, altrimenti il
controllo confronta due numeri uguali e non segnala nulla.

---

## Numeri di versione — `bash strumenti/versione.sh`

I `?v=` in `index.html` costringono il browser a ricaricare i file modificati. Senza, si
ricarica la pagina e non cambia niente.

Lo strumento li aggiorna **solo se serve**: confronta `app.js` e `style.css` con l'ultimo
commit e tocca soltanto quelli davvero cambiati. `app.js` e la costante `V` si aggiornano
insieme — `V` è quella che forza il ricaricamento della pagina.

`test/esegui.sh` **segnala** se `app.js` o `style.css` sono cambiati senza che `index.html`
lo sia, ed esce con codice 1. Segnala invece di correggere da solo: uno strumento che
modifica i file mentre stai controllando altro è peggio del problema che risolve.

---

## Lavorare da due Mac — casa e hotel

```
bash strumenti/inizio.sh      quando si COMINCIA su una macchina
bash test/esegui.sh           prima di ogni pubblicazione
```

**`inizio.sh` parte da solo** (dal 02/09/2026): `.claude/settings.json` contiene un hook
`SessionStart` che lo esegue all'apertura di ogni sessione di Claude Code in questa
cartella. Nasce da un equivoco reale — *"da casa non lo faccio mai, credo lo faccia da
solo"* — e il rischio non è teorico: cominciare a modificare una copia vecchia è ciò che
fa divergere le due macchine. Il file è versionato, quindi vale su entrambi i Mac appena
lo si scarica.

Non cambia il comportamento dello script: si allinea da solo solo quando è sicuro, e negli
altri casi si limita a spiegare e fermarsi (il suo `exit 1` non blocca la sessione, il
testo finisce nel contesto). Resta lanciabile a mano quando serve, ed è ancora l'unico modo
di rilanciarlo **senza** riaprire la sessione. Per disattivarlo o modificarlo: `/hooks`,
oppure `.claude/settings.json`.

`inizio.sh` confronta questa copia con il repository remoto e si comporta così:

| Situazione | Cosa fa |
|---|---|
| tutto allineato | lo dice e basta |
| questa copia è indietro | si allinea da sola e rilancia la rete di sicurezza |
| ci sono modifiche non salvate | **si ferma** e le elenca |
| le due copie sono divergenti | **si ferma** e mostra cosa c'è di là e cosa di qua |
| lavoro non ancora pubblicato | avvisa che dall'altra macchina non si vede |

Non decide mai da solo come riunire due versioni divergenti: quello va guardato caso per
caso.

`test/esegui.sh` controlla in più se la copia è rimasta indietro, così non si pubblica
partendo da codice vecchio — è ciò che fa divergere le due versioni. Se manca la rete il
controllo viene saltato, per poter lavorare scollegati.

### `.DS_Store` non va nel repository

Era tracciato: il Finder lo riscrive di continuo, quindi risultava sempre "modificato" su
entrambi i Mac e poteva generare conflitti su un file che non contiene niente di utile.
Tolto dal repository e messo in `.gitignore`. **Non reintrodurlo.**

### Cosa resta fuori dal repository

`culligan.png`, `icone compass/` e `loghi compass/` non sono tracciati: stanno solo sul
Mac dove sono stati creati. Nessun codice li richiama — `img/compass-stella.png`, che serve
alle finestre di conferma, è invece dentro il repository. Se un domani servissero anche
altrove, vanno aggiunti.

---

## Rete di sicurezza — `bash test/esegui.sh`

**Lanciarla prima di ogni pubblicazione.** Esce con codice 1 se qualcosa non torna.

```
test/ambiente.js   finti document, window, fetch, localStorage… perché app.js si carichi
test/controlli.js  i casi di prova
test/esegui.sh     lo script da lanciare
test/node.js       esecutore per ambienti con Node
```

**Funziona su entrambe le macchine.** `esegui.sh` usa Node dove c'è (Linux, claude.ai) e
`osascript` dove non c'è (Mac). Le due strade leggono gli stessi file e fanno gli stessi
controlli: se se ne modifica una, aggiornare anche l'altra.

### Cosa copre e perché proprio quello

Solo i **calcoli**, non l'aspetto. Il criterio è: un errore di impaginazione si vede subito
guardando lo schermo, un errore nei numeri no — resta plausibile e può passare inosservato
per mesi. Coperti quindi: colazioni e periodo dell'export, struttura dedotta dall'alloggio,
arrivi/partenze/fermate, multicamera, abbinamento delle schede al reimport, canale della
prenotazione, periodo della biancheria, anno del turno, nomi del turno, mittente ammesso
dal relay Booking, fusione dei pre-stay col cloud, unione dei registri di cassa, fusione degli archivi a elenchi, diagnosi della calibrazione, periodi annunciati dai suggerimenti di bilanciamento, confronto, dettaglio per tipologia e andamento dello storico biancheria, cancello del polling a
scheda nascosta. 500 controlli.

Il cancello del polling è l'unica eccezione al "solo i calcoli": non è un numero, ma un
guasto che si manifesterebbe con una postazione che smette di aggiornarsi **senza dire
niente** — la stessa categoria di errore invisibile, e da una copia ferma sono partite le
sovrascritture del 22/08/2026.

### Come funziona

Carica **tutto** `app.js` nell'ambiente finto, invece di ritagliarne pezzi per numero di
riga: quel ritaglio si rompeva a ogni modifica del file, ed era già successo più volte.
`const`/`let` di primo livello vengono convertiti in `var`, altrimenti in `eval` restano
chiusi e le funzioni non sarebbero raggiungibili.

### Aggiungere un controllo

Una riga in `test/controlli.js`:

```js
ok('descrizione leggibile', valoreOttenuto, valoreAtteso);
```

Le funzioni di `app.js` sono già tutte disponibili. **Usare sempre nomi inventati**: nel
repository non deve finire nessun dato di ospiti reali.

### Il riepilogo finale va tenuto in fondo (fix 03/09/2026)

La riga `TUTTI I CONTROLLI SUPERATI (N)` stava a **metà** di `controlli.js`: tutto ciò che
veniva aggiunto sotto — e `test/mime.js`, caricato dopo — restava fuori dal conteggio.
Diceva `(351)` con 65 controlli non ancora eseguiti, e continuava a dirlo anche quando uno
di quelli falliva. L'**esito** (`ESITO:OK`/`FALLITO`, l'unica cosa che `esegui.sh` legge per
il codice di uscita) è sempre stato corretto perché si calcola alla fine: a mentire era solo
la riga che legge una persona.

Ora è la funzione `riepilogo()`, chiamata dall'**ultima riga dell'ultimo file caricato**
(oggi `test/mime.js`). Aggiungendo un altro file di controlli, spostare lì la chiamata.

### Verificata sabotando il codice

Non basta che i controlli passino: devono anche **fallire quando serve**. Provata
introducendo di proposito tre difetti — regola delle colazioni spostata di un giorno,
Principe incluso nei "no colazione", abbinamento per codice disattivato. Tutti e tre
colti, con il dettaglio di cosa non tornava.

---

### La finestra è 36 mesi — è un fatto, non un parametro (confermato 01/09/2026)

Booking toglie le recensioni dopo **36 mesi** (`REV_FINESTRA_GG=1095`). Confermato dalla
proprietà, non dedotto.

**Tentativo rimosso**: il 23/08/2026, non riuscendo a riprodurre il 6.6 del Principe, era
stata aggiunta una `calibraFinestra()` che accorciava la finestra fino a 12 mesi finché il
punteggio tornava. Sul Principe aveva "risolto" scegliendo 21 mesi. Era una spiegazione
**fabbricata**: una finestra corta riproduce qualunque punteggio proprio perché guarda meno
recensioni. Rimossa insieme a `revFinestra()` e al campo `finestraGg`; i dati calibrati così
sono stati riportati a "da ricalcolare".

**Se un punteggio non è riproducibile con 36 mesi la causa è nei dati**, tipicamente
recensioni recenti non ancora presenti nell'export: si riesporta il CSV dall'Extranet.
Tre controlli in `test/controlli.js` impediscono di reintrodurre la scorciatoia.

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
| Le app scrivevano un registro accessi che nessuno leggeva | `qm_hk_access` / `qm_bkf_access` / `qm_dvr_access`: una lettura e una scrittura a ogni apertura, per una sezione della dashboard rimossa a luglio | Rimosso da `housekeeper.html`, `breakfast.html`, `dvr.html` il 04/09/2026 |
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
| Camere Art marcate "Art Resort" nelle fermate | `fixArriviStruttura` applicata solo a `arrivi`, mai a `fermate`/`partenze` | Struttura dedotta in modo deterministico da `_prenStruttura` su tutte e tre le liste |
