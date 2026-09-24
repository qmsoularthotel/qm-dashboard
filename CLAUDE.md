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
- **Expedia**: usa sempre "Dear Guest," / "Gentile ospite,". **Il nome nell'export c'è** (`review_by`) ma non si usa: è una scelta confermata il 06/09/2026, non un dato mancante — vedi "Formato file Expedia".
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


---

## Compass in breve

SPA in JavaScript puro, **senza build**, pubblicata da GitHub Pages dal ramo **`main`** su
`https://www.compass-qm.com`. Dati su Cloudflare KV tramite il Worker `anthropic-proxy`
(`https://anthropic-proxy.qm-d82.workers.dev`), porta chiusa: ogni richiesta porta il
lasciapassare `X-QM-Pass`.

| File | Cosa è |
|---|---|
| `index.html` + `app.js` (~18.000 righe, sezioni `// §§`) + `style.css` | Compass, il pannello del QM |
| `housekeeper.html`, `breakfast.html`, `inventory.html`, `controllo-mattino.html`, `dvr.html` | le 5 app standalone del Pannello App |
| `reception.html` | cassa di reception (fondo cassa, incasso) |
| `biancheria-galleria.html` | Gestione Biancheria del Resident Manager (Art Resort + Santa Brigida): **copia** del Consumo Biancheria, codice `bg.` che apre solo le chiavi `bg_*` |
| `registration-galleria.html` | registration card della Galleria: **fuori da Compass, niente cloud** |
| `worker.js` | il Worker Cloudflare: **si pubblica a mano** (copia-incolla) |
| `ddt-shared.js`, `sw.js` | funzioni DDT condivise; service worker **unico** per tutto il sito |
| `test/`, `strumenti/` | rete di sicurezza e script (versioni, inizio sessione, backup Drive) |
| `docs/*.md` | il **dettaglio** di ogni parte — vedi l'indice in fondo |

L'utente è il Quality Manager: scrive in italiano, non legge il codice, lavora da due Mac
(casa e hotel) e dallo smartphone. Le risposte vanno date in italiano semplice.

## Come si lavora — ogni volta

1. **Si pubblica su `main`**: `git push origin HEAD:main`. Un ramo non è una consegna: il
   sito serve solo `main`. È autorizzato una volta per tutte, non va chiesto.
2. Prima di pubblicare: **`bash test/esegui.sh`** (esce con 1 se qualcosa non torna) e
   **`bash strumenti/versione.sh`** (aggiorna i `?v=` di `index.html` e i `QM_APP_BUILD`
   delle app). Senza, i browser tengono il file vecchio.
3. Ogni correzione con un difetto dietro ha **i suoi controlli** in `test/controlli.js`
   (o `test/galleria.js`), **provati rompendo il codice di proposito**: un controllo che non
   può fallire non controlla niente. Nomi inventati, mai dati di ospiti veri.
4. `strumenti/inizio.sh` parte da solo a inizio sessione (hook) e allinea la copia.
5. **Worker**: cambiando `worker.js` si cambia anche `WORKER_VERSIONE`, e deve coincidere con
   `WORKER_VERSIONE_ATTESA` in `app.js`. Lo pubblica il QM a mano; ordine: prima il sito, poi
   il Worker. Il codice da incollare si dà **per intero** (o negli appunti con `pbcopy`).
6. **Mai chiedere, ricevere o scrivere segreti** (`QM_PASSWORD`, `QM_AUTH_SECRET`, password
   delle caselle, `CF_API_TOKEN`…): li imposta il QM su Cloudflare o nelle Proprietà script di
   Google. Per guardare i dati si usa il **backup** (`~/Downloads/compass-archivio-*.json` o
   Drive, cartella *Back-Up Compass QM*), mai il lasciapassare.
7. **Stile Compass sempre**: token e componenti esistenti (`.panel`, `.kpi-card`, `--accent`…),
   mai stili inventati. Un modulo "uguale a quello di Compass" per altri si **copia identico**
   con un rinomino meccanico, non si riprogetta (Galleria, 11/09/2026).
8. Chiudendo un lavoro: aggiornare il file di `docs/` della parte toccata (e questa pagina solo
   se cambia una regola generale). La mappa `§§` qui sotto si **rigenera**, non si ritocca.

## Regole che non si rompono

Ognuna è nata da un incidente vero; il racconto completo è nel file indicato.

**Dati sul cloud**
- **Mai scrivere un elenco condiviso per intero senza rileggere il cloud.** Le forme già
  protette: archivi a elenchi (`_qmSalvaArchivio`, DVR/Biancheria/Resi/Giacenza), pre-stay
  (`_psScriviCloud`), cassa (`_cassaUnisci`), elenchi condivisi col telefono — DDT, Inventario,
  ordini, spunte recensioni — con la **fusione a tre** `_qmTre` (copiata identica in
  `breakfast.html` e `inventory.html`). Una chiave nuova scritta da più postazioni va protetta
  allo stesso modo. → `docs/sincronizzazione-e-accesso.md`
- Senza aver letto il cloud **non si scrive**; un cloud vuoto non vuol dire "tutto cancellato".
- Le eliminazioni negli archivi vanno segnate **prima** di salvare (`_qmSegnaRimosso`).
- La copia di sviluppo (localhost/file:) non deve scrivere le chiavi di produzione.
- Tetti del piano gratuito: **1.000 scritture** e 100.000 letture al giorno. `kvSet` salta le
  scritture identiche; il polling si ferma a scheda nascosta e dopo 30 minuti senza nessuno.
- Una scrittura non arrivata **si dice** (fascia rossa, Stato del sistema), mai in silenzio.

**Pagina e interfaccia**
- **Non ridisegnare sotto le dita**: niente render completo mentre si scrive in una casella
  (`_qmOccupato`); aggiornare solo i pezzi che cambiano.
- A scorrere è **`.content`**, non la finestra (`_psScroller`, `_psSenzaSalto`).
- **Mai `grid-template-columns` inline**: su smartphone la `@media` non lo raggiunge. Le
  misure che cambiano stanno in classi CSS. → `docs/interfaccia.md`
- Dopo ogni caricamento l'Overview si ridisegna tutta da sola (`setUploadTs` → `ovAggiornaTutto`),
  **senza** `loadWeekData` (riporterebbe il turno a oggi). → `docs/caricamenti-e-overview.md`
- Ogni `onclick` deve puntare a una funzione che esiste (sentinella in `esegui.sh`).
- Conferme e avvisi: `cqConferma` / `cqAvviso`, mai `confirm()`/`alert()` del browser.
- Le **etichette** del menu si possono rinominare, le **chiavi** delle viste e dei dati no.

**Codice**
- `pdf.js` viene da un CDN: solo dietro `PDF_OK` e `_pdfApri()`, altrimenti senza rete muore
  tutta la pagina.
- Un `try/catch` avvolge **solo** la chiamata di rete, mai il nome della funzione (il caso
  `kvGet` inesistente, inghiottito per settimane).
- Una `const` dichiarata più in basso nel file non si legge a caricamento (TDZ): usare `try`.
- Nelle app, `qmKvSet` chiama `_qmKvScrivi`, **mai se stessa** (02/09/2026: nessuna app
  scriveva più).
- Date del turno fissate a mezzogiorno; anno del planning corretto da `_annoPlausibile`.

**Dominio**
- Pre-stay: gli ospiti **non** sono legati alla camera; struttura di prenotazione (`mitt`) ≠
  struttura d'arrivo (`hotel`). → `docs/prestay.md`
- Prenotazioni: filtro **"Presenti"**; il PMS toglie dal PDF chi è in check-out, e
  `_prenRecuperaPartenze` le rimette dall'ultimo caricamento. Colazioni: `arrivo < giorno <=
  partenza`, "no colazione" solo SoulArt e Boutique. → `docs/caricamenti-e-overview.md`
- Biancheria: il giro del giorno D ritira i consumi dal giro precedente al giorno prima;
  `atteso(N) = consegnato(N−1)`; uno zero mai inserito non è uno zero; ogni correzione al
  Consumo Biancheria va riportata nella copia della Galleria. → `docs/biancheria.md`
- Recensioni: punteggio Booking a decadimento continuo calibrato, finestra 36 mesi fissa; le
  risposte Expedia non usano il nome dell'ospite di proposito. → `docs/recensioni.md`
- Culligan: `prontaVerificata` dice se qualcuno ha davvero guardato, non `pronta!==null`.

## Dove sta il dettaglio

| File | Contenuto |
|---|---|
| `docs/lavoro.md` | rete di sicurezza, numeri di versione, pubblicazione su `main`, due Mac |
| `docs/architettura.md` | storage, AI, avvio, token CSS, rilevamento struttura dalla camera |
| `docs/sincronizzazione-e-accesso.md` | sincronizzazione continua, fusioni, consumo KV, accesso e lasciapassare, Stato del sistema, backup, pubblicazione del Worker, conferme |
| `docs/caricamenti-e-overview.md` | caricamenti quotidiani, file unico Prenotazioni, Overview |
| `docs/turni-e-staff.md` | turno settimanale, statistiche, organico (`DEPTS`), preferenze turni |
| `docs/recensioni.md` | punteggio Booking e calibrazione, Booking.com, Expedia |
| `docs/prestay.md` | messaggi pre-stay, invio mail, mittenti, risposte |
| `docs/biancheria.md` | Consumo, Reso, Giacenza Biancheria e l'app della Galleria |
| `docs/housekeeping.md` | Operativa HKP (sigle cameriere), Bilanciamento Camere |
| `docs/culligan.md` | app Culligan, riconsegna, stato preparazione camere |
| `docs/reception-cassa.md` | cassa di reception |
| `docs/inventario-e-spese.md` | inventario detersivi, ordini, spese fornitori, DDT |
| `docs/app-standalone.md` | Pannello di Controllo, app standalone, service worker, Registration Galleria, DVR |
| `docs/interfaccia.md` | smartphone, icone del menu, viste obbligatorie |
| `docs/riferimenti.md` | variabili globali, endpoint, funzioni chiave, recupero da git, **problemi noti** |

Prima di toccare una parte, **leggere il suo file**: le soluzioni "ovvie" sono spesso proprio
quelle già provate e scartate.

## §§ Section Map (app.js)

Si rigenera con `grep -n "// §§" app.js | sed 's|// §§||'`. Un controllo in `test/esegui.sh`
verifica che ogni sezione compaia qui. Rigenerata il 24/09/2026 — 17964 righe.

| Riga | Sezione |
|------|---------|
| 26 | DARK MODE |
| 34 | COSTANTI & CONFIG (DEPTS, WEEK fallback, IS_REST) |
| 54 | TURNO — ACCORDIONI UC & UPLOAD BOX |
| 170 | TURNO — PARSER TSV/PDF (parseTurniTSV, handleTurniFile) |
| 322 | TURNO — RENDER & NAVIGAZIONE (loadWeekData, renderDay, buildWeekNav) |
| 953 | NAVIGAZIONE VISTE (setView, pageTitles, toggleRecGroup) |
| 956 | HKP OPERATIVE — Google Sheets (hkpLoad, hkpRenderAll, hkpRenderContent, hkpTab, hkpSave, hkpRestore) |
| 972 | HKP NATIVE — griglia nativa (Camere / Aree Comuni / Fondi & Lavaggi) |
| 1976 | DVR — SCADENZE SICUREZZA & COMPLIANCE |
| 2033 | MOBILE SIDEBAR |
| 2376 | MINI APP — PANNELLO DI CONTROLLO (stato colorato per app standalone, mosaico) |
| 3702 | ROOM DIVISION — Suddivisione cameriere, vista settimanale carico pesato e |
| 3965 | UTILITÀ — FORMATTAZIONE DATE & TIMESTAMP (fmtNow, fmtUploadTs, setUploadTs) |
| 4005 | BACKUP ARCHIVIO — l'unica copia che esiste fuori dal cloud |
| 4356 | STORAGE & SYNC KV (setSyncStatus, kvSet, kvGet, LS, syncFromCloud) |
| 4932 | OVERVIEW — TOGGLE PREVIEW PANELS (toggleOccupazionePreview, togglePulPreview, toggleBkfPreview) |
| 4963 | OVERVIEW — GRAFICI & METEO (fetchMeteo, toggleWeatherForecast) |
| 5036 | SIDEBAR — OROLOGIO & DATA (toggleDatePopup, saveDate, updateDateDisplay) |
| 5073 | OVERVIEW — RENDER PRINCIPALE + INIT + POLLING 30s (refreshOverviewForDate, renderArriviData, syncFromCloud) |
| 5447 | RECENSIONI — SCORE TREND MODAL (openScoreTrend) |
| 5525 | OVERVIEW — RECENSIONI NO-REPLY (ovUpdateRevNoreply) |
| 5643 | BKF SHEET — ANALISI AI (bkfSheetAnalyze, bkfSheetSync, bkfSheetAR*) |
| 5865 | REPORT PULIZIE — PUL (handlePulFile, pulParseText, renderPulData, renderPulDay, updateKpiFromPulizie) |
| 6043 | RECENSIONI — SCORING & INIT UPLOAD (weightedAvgF1, revHandleFile init per tutti gli hotel) |
| 6110 | RECENSIONI — LOGICA (revParseCsv, revRenderCatTrend, revRenderExpiring, revRenderStats, revRenderList, revGenerateReply) |
| 6542 | RECENSIONI BOOKING — PUNTEGGIO A DECADIMENTO CONTINUO + CALIBRAZIONE |
| 7664 | REPORT PASTI — BKF (handleBkfFile, bkfParseText, renderBkfData, renderBkfDay, renderOvBkfChart) |
| 7905 | HOUSEKEEPING — HKP UPLOAD & DATI (handleHkFile, hkParseText, hkSetLoaded, resetSoulData/BoutData) |
| 7984 | PIANO SETTIMANA — UPLOAD & PARSER (handlePianoFile, parsePianoItems, pianoSetLoaded) |
| 8197 | BKF — GRUPPI, NOTE & GRAFICI (bkfLoadOps, bkfAddGroup, bkfRenderGroups, bkfRenderChart, updateKpiFromBkf) |
| 8522 | REGISTRATION CARDS — RC (handleRCFile, rcParseGuests, rcRenderCards) |
| 8694 | MODAL — CATEGORIE TREND (openCatModal, closeCatModal) |
| 8793 | ARRIVI GIORNALIERI — UPLOAD & RENDER (handleArriviFile, resetArrivi, arriviUpdateKpi, detectStruttura, renderArriviModal) |
| 8795 | COLAZIONE BOOKING.COM — snapshot ospiti per camera (nome/origine/trattamento/checkout) |
| 9324 | INVENTARIO DETERSIVI |
| 9900 | INVENTARIO — ORDINI |
| 10405 | PREFERENZE TURNI |
| 10614 | CONTROLLO MATTINO (cmLoad, cmRender) |
| 10949 | RECENSIONI EXPEDIA (revExpParseTsv, revExpHandleFile, revExpRenderStats, revExpRenderList, revExpGenerateReply) |
| 11264 | DDT FORNITORI — upload DDT, spese per fornitore/reparto, storico |
| 12590 | PRE-STAY — MESSAGGI AGLI OSPITI IN ARRIVO FRA 2 GIORNI |
| 14175 | RECEPTION — CASSA (fondo cassa, incasso contante) |
| 14562 | RESI BIANCHERIA — Distinta reso biancheria inidonea (Fornitore Raimondo) |
| 15073 | BIANCHERIA — Ciclo pulito/sporco (Fornitore Raimondo) |
| 16242 | GIACENZA BIANCHERIA — magazzino e pezzi in mano alle cameriere |
| 16918 | PRENOTAZIONI — file unico dal PMS (arrivi + colazioni + pre-stay) |
| 17333 | CONFERME — finestra Compass al posto di confirm()/alert() del browser |
| 17388 | SINCRONIZZAZIONE CONTINUA — ogni postazione si aggiorna da sola |
| 17858 | ACCESSO — ABILITAZIONE DEI DISPOSITIVI |
