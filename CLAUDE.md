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

Versione corrente: **`qm-v26`**. Pattern:
- **Proxy/KV/Google Sheets/cataloghi barcode** → sempre network, mai cache
- **HTML files** → network-first con `cache:'no-store'` (garantisce Cmd+R sempre aggiornato)
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

I tre file per-app restano sul disco ma non sono più referenziati da nessuna pagina: non
vanno cancellati (una pagina vecchia ancora in cache potrebbe richiederli) e non vanno
riattivati. Se serve cambiare la strategia di cache, si cambia solo qui.

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

## Pre-stay — messaggi agli ospiti in arrivo (view `prestay`)

### Scopo e vincolo di partenza

Ogni giorno si scrive agli ospiti che arrivano **fra 2 giorni** (`PRESTAY_GG=2`). I contatti (mail, telefono) stanno sul PMS e **non sono esportabili in alcun formato**: vanno inseriti a mano, non c'è modo di aggirarlo.

### GLI OSPITI NON SONO LEGATI ALLA CAMERA — non reintrodurre quella chiave

Il Piano Settimanale serve **solo a sapere QUANTI arrivi ci sono per struttura** in quel giorno (`_psArriviPerStruttura(iso)`). Le schede sono **"Arrivo 1, 2, 3…" dentro il gruppo della struttura**, identificate da un `id` proprio: il numero di camera non compare da nessuna parte.

**Perché** (storia da non ripetere — è costata tre implementazioni successive): la prima versione indicizzava i dati per camera, `_prestay[iso][camera]`. Ma la reception sposta gli ospiti di stanza di continuo, e a ogni spostamento i contatti restavano orfani sulla vecchia riga mentre la nuova camera compariva vuota da ricompilare. Si è provato prima con un pulsante di spostamento manuale (rifiutato: *"io non posso ricordare dove sposto ciascun ospite"*), poi col consolidamento automatico per email (ancora troppo: richiedeva di ridigitare l'email), poi con l'inferenza dal diff del Piano — che è **inaffidabile per costruzione**: il Piano contiene solo data/struttura/camera, quindi *"203 sparita, 204 comparsa"* è indistinguibile da *"una prenotazione cancellata più una nuova"*, e indovinare significa prima o poi attribuire i contatti di un ospite a un altro.

La soluzione è stata **togliere del tutto l'aggancio**: senza camera non c'è niente da riagganciare, e uno spostamento diventa un non-evento. Il numero di camera qui non serviva a nulla — **non compare nel messaggio** (confermato dall'utente: non ci sarà mai) e non determina il testo, che dipende dalla struttura. Se un domani si volesse mostrare la camera all'ospite, ripensare l'intero modello, non aggiungere un campo camera come chiave.

### Fonte degli arrivi: il PDF del PMS, NON più il Piano Settimanale (15/08/2026)

Il pre-stay è stato **staccato dal Piano Settimanale** e collegato al **PDF "Arrivi" esportato dal PMS**. Il Piano dava solo un conteggio di camere; il PDF elenca le prenotazioni reali **con il nome dell'ospite**, quindi è insieme più completo e più attendibile. `pianoData` non è più letto da questa sezione.

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

### Vincolo Booking.com — `PRESTAY_MITTENTE_BOOKING_OK` (16/08/2026)

Gli ospiti che prenotano su Booking hanno un indirizzo mascherato `@guest.booking.com`, che è un **relay**: Booking inoltra alla casella vera **solo le mail spedite dall'indirizzo registrato sull'Extranet della struttura** — `booking@soularthotel.com`. Da qualunque altro mittente le **scarta in silenzio**: nessun rimbalzo, nessun errore.

**Perché è pericoloso e non solo scomodo**: il nostro invio va a buon fine (Register accetta e consegna a Booking), quindi `mailTs` verrebbe valorizzato e la riga diventerebbe verde "inviata" per un messaggio che nessuno ha ricevuto. Una spunta che mente è peggio di una mancante.

Finché il mittente non è quello autorizzato:
- `_psAliasBooking(email)` riconosce gli indirizzi (`@guest.booking.com` e `@booking.com`, con trim e case-insensitive; non confonde `booking.com@gmail.com` né domini simili);
- la riga mostra il campo email bordato ambra e la nota *"indirizzo Booking · non recapitabile con il mittente attuale"*;
- l'anteprima mail aggiunge un avviso esplicito, suggerendo WhatsApp come alternativa;
- **l'invio in blocco li ESCLUDE** invece di spedirli nel vuoto, e dice quanti ne ha saltati. Il conteggio del gruppo resta quindi incompleto — ed è corretto così.

**Come si sblocca**: quando su Cloudflare `SMTP_USER` e `SMTP_PASS` saranno quelli di `booking@soularthotel.com`, mettere `PRESTAY_MITTENTE_BOOKING_OK=true`. **Nient'altro da cambiare**: il Worker compone mittente di busta e intestazione `From` da `SMTP_FROM || SMTP_USER`, quindi cambiare le due variabili sposta l'invio sulla casella giusta senza toccare il codice. Verificato in test che con la costante a `true` quegli indirizzi tornano inviabili.

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
qm_prestay     = { 'YYYY-MM-DD': { arrivi: [ {id,hotel,nome,email,tel,lang:'it'|'en',mailTs,waTs,mailErr} ] } }
qm_prestay_tpl = { sa:{it:{ogg,corpo}, en:{ogg,corpo}}, bh:{…}, sl:{…}, ar:{…}, pr:{…}, ms:{…} }
```

`id` è generato (`_psNuovoId`) e non cambia mai: è l'unica identità della scheda, usata da invio, anteprima e spunte. **Nessun campo camera**, per le ragioni sopra.

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

### Camera pronta — due punti di raccolta, stesso campo (15/08/2026)

`rs.pronta` (`true`/`false`/`null`) si imposta da **due** punti dell'app Culligan, che scrivono lo stesso campo sulla stessa chiave `qm_cm_YYYY-MM-DD`:

1. **Foglio nella vista Riconsegna** (`chooseReady`) — il percorso storico, per le camere che si visitano nel giro;
2. **Popup dal dettaglio camera** (`apriPopPronta` → `scegliProntaPop`) — si apre impostando la bottiglia su **non consumata** in una camera in **cambio** (partenza + arrivo). Motivo: trovando la bottiglia piena non si passa dal giro di riconsegna, quindi la domanda "è pronta?" resterebbe senza risposta proprio su una camera che va rifatta per il nuovo ospite.

È un **nodo aggiunto al `body`**, non parte del render della camera: così non viene spazzato via da un `openRoom` successivo e sta sopra la barra di salvataggio (`z-index` 400 contro 200). Va quindi chiuso a mano — `goHome()` lo fa, altrimenti resterebbe sopra la griglia riferito a una stanza che non si sta più guardando.

Si apre **solo al cambio effettivo di valore** (`prima!=='non_consumata'`): ritoccare il pulsante già attivo non deve far ricomparire il popup, mentre tornarci da un altro valore sì, così una scelta sbagliata si corregge. "Decido dopo" chiude senza scrivere nulla. Verificato con 16 test.

### Overview — stato preparazione: cambi **e** arrivi puri

`renderOvRoomReadiness` mostra le camere con un **check-in oggi**, in due categorie:

| Categoria | Da dove | Stato iniziale |
|---|---|---|
| **Cambio** (partenza + arrivo) | `sa.cambi` | `Da verificare` — va rifatta, lo decide chi passa |
| **Arrivo puro** (nessuna partenza prima) | `sa.arrivi` meno i cambi | **già `✓ Pronta`** — la camera non era occupata la notte prima, non c'è nulla da rifare |

Gli arrivi puri prima **non comparivano affatto**: la reception non vedeva un pezzo degli arrivi della giornata. Le partenze pure restano fuori di proposito (senza un check-in successivo non devono essere pronte entro un orario) e così le fermate (l'ospite è già dentro).

**Un sopralluogo esplicito vince sempre sul valore predefinito**: se `state[room].pronta` è valorizzato si usa quello anche per un arrivo puro — chi è passato può aver trovato la camera non a posto. Il default scatta solo quando il campo è `null`. La sottoscritta della card distingue i due casi (`arrivo · nessuna partenza` contro `check-in oggi`).

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

### Funzioni

| Funzione | Scopo |
|----------|-------|
| `biaLoad()` | Carica da KV con fallback localStorage, poi render |
| `_biaPeriodo(hotel,dataGiro)` | Intervallo dei consumi ritirati — vedi regola sopra |
| `_biaSommaConsumi(hotel,dal,al)` | Somma per voce nell'intervallo, estremi inclusi |
| `_biaAtteso(hotel,dataGiro)` | Sporco consegnato al giro precedente |
| `_biaSaldo(hotel)` | Cumulato dei pezzi non rientrati per voce |
| `biaSalvaConsumi()` | Salva i 7 totali del giorno (sovrascrive se la data esiste già) |
| `biaRegistraGiro()` | Registra/aggiorna il giro congelando `consegnato` |
| `biaPrintDistinta(giroId)` | Distinta A4 di consegna; senza id usa il form corrente |

---

## Note & Problemi Noti

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
| Inventario, filtro "7 giorni" mostrava metà del consumo reale | `effectiveDays` aveva un minimo di 14gg applicato anche ai periodi fissi scelti dall'utente, non solo a "Tutto" | `effectiveDays=_invPeriod>0?days:Math.max(14,days)` — il minimo 14 vale solo per "Tutto" |
| Splash mini app a volte vecchio a volte nuovo, senza regola | 4 service worker sullo stesso scope radice si sostituivano a vicenda e si cancellavano le cache l'uno dell'altro | Un solo `sw.js` registrato da tutte le app — vedi [Service Worker](#service-worker-swjs) |
| Splash saltato o tagliato a metà | `location.reload()` del service worker aggiornato è indistinguibile da un Cmd+R via `nav.type` | Flag `qm_sw_reload` in `sessionStorage` prima del reload automatico |
