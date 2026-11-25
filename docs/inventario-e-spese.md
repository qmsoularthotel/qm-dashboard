# Inventario detersivi e Spese fornitori

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

## Inventario Detersivi — Ordini

### Tab Stock — «Cosa ordinare» sul calendario e a distribuzioni (25/11/2026, QM)

Composizione della Registration Cards della Galleria (modello indicato dal QM) e **calcolo sul lavoro
reale** (QM, dopo aver visto proporre «una balla di carta igienica» con 9 giorni di anticipo): la merce
**non si consuma un po' al giorno**, esce dal magazzino **a blocchi** con la **distribuzione settimanale**
ai carrelli HKP e alla cucina (tutte registrate come **scarichi**). Si ordina il **venerdì ogni 15 giorni**
(da venerdì 4/12/2026, `INV_CICLO_VENERDI`, uguale per SoulArt e Art Resort), consegna il **martedì**,
carrelli il **mercoledì**: **ogni ordine copre due distribuzioni**.
- `_invCiclo(oggi)`: prossimo venerdì del ciclo (oggi compreso), consegna (+4), carrelli (+5), consegna dopo.
- `_invSettimane(bm,ora)`: quanto esce in ognuna delle ultime 8 **settimane complete** (lunedì–domenica;
  la settimana in corso no, la distribuzione può essere a metà): scarichi + ammanchi dei conteggi
  (`_invRettifiche`, in ordine di data); solo da quando il prodotto esiste.
- `_invTipicoOrdine(sett)`: **mediana delle ultime coppie di settimane** (fino a 4) = quanto esce di solito
  in 15 giorni (la «statistica»: la candeggina finisce ogni 15 giorni). Meno di due settimane: `null`
  («non si sa»). Un ordine eccezionale non sposta la mediana.
- `_invProposta(tipico,magazzino,inArrivo)` = per eccesso, tipico − max(0,magazzino) − in arrivo.
- `_invListaPronta(C)`: la lista con le quantità **solo dal giovedì prima dell'ordine** (dopo l'ultima
  distribuzione); prima il titolo dice «La lista si prepara giovedì …» e l'unico avviso è **«Da tenere
  d'occhio»**: in magazzino meno di metà del tipico (una distribuzione) e niente in arrivo. Il magazzino
  vuoto subito dopo una distribuzione non è più un'urgenza.
- Pagina (`invRenderStock`, `.inv5-*`): riga oro «<STRUTTURA> · PROSSIMO ORDINE …», titolo; a sinistra
  «Da ordinare» (lista pronta) o «Da tenere d'occhio»; a destra «Prossimo ordine» con quattro tappe
  (Lista pronta giovedì · Ordine venerdì · Consegna martedì · Carrelli HKP mercoledì), il foglio e
  **«Crea l'ordine»** (`invStockCreaOrdine` → scheda Ordini → `_invOrdineDaStock` letto in
  `invRenderOrders` → «Nuovo ordine» già compilato con struttura, data del venerdì, prodotti e quantità);
  tre riquadri (Da tenere d'occhio · In arrivo · Senza storico); tabella (In magazzino · Di solito ogni
  15 giorni · Ultimo ordine ricevuto, `_invUltimiOrdini`); fascia che spiega il «di solito».
- **Mai decimali**: interi, «meno di 1» se esce meno di un pezzo.
- Tolte le funzioni del calcolo a media giornaliera (`_invConsumoMedio`, `_invDaOrdinare`,
  `_invUsoTesto`, `_invConsumoDa`) e le pastiglie 15/30/45. La scheda Analisi ha la sua media e non cambia.
Limite: conta solo ciò che è scansionato o contato. Controlli in `test/controlli.js` («ciclo: …»,
«distribuzioni: …», «proposta: …», «lista pronta …», «Inventario: ultimo ordine ricevuto …»).

### Aggiornamenti di giacenza frequenti (25/11/2026, QM: «faccio spesso l'aggiornamento dello stock»)

- **Ordine di data**: stock (`invCalcStock` in Compass, `calcStock` in `inventory.html`) e rettifiche
  (`_invRettifiche`) leggono i movimenti di un prodotto **per data** (`_invInOrdine`; a parità di data
  l'ordine di salvataggio), non nell'ordine in cui sono stati salvati. Un carico segnato in ritardo o
  arrivato dal telefono dopo non finisce più dopo un conteggio più recente.
- **Consumati da allora** (Stock › Ultimo ordine, `_invConsumoDa`): scarichi + ammanchi dei conteggi
  successivi (quello che un aggiornamento di giacenza trova in meno), come la Media di Analisi. Un
  conteggio che trova di più è un carico non registrato e non conta come consumo.
- **App Inventario**: senza nessun conteggio, `calcStock` contava due volte quasi tutti i movimenti
  (ciclo da `from+1` e poi di nuovo tutti); ora una volta sola. Sentinella in `esegui.sh`.

### Ricezione segnata in ritardo (25/11/2026, QM: ordini del 21/09 mai segnati ricevuti)

Nella finestra «Ricevimento merce» (`invOrdersMarkReceived`): **«Arrivato il»** (`#ddt_data`, di
base oggi, mai nel futuro) e **«Aggiungi le quantità allo stock»** (`#ddt_stock`). **La spunta resta
anche con una data passata** (corretto lo stesso giorno, dopo l'ordine per data): il carico va al suo
posto nel tempo, un aggiornamento di giacenza successivo vale più di lui (lo stock non si gonfia) e il
conteggio dopo non sembra più trovare merce «in più» (il consumo non esce più basso del vero).
Toglierla serve solo in casi particolari; `invDDTData` aggiorna solo la nota. `invOrdersConfirmDDT`: `tsRicevuto` = mezzogiorno
del giorno scelto (`_invTsRicezione`; oggi = adesso); senza spunta **nessun movimento di carico**,
`o.senzaStock=true` (nella lista ordini «· stock non toccato»), `qtyRicevuta` comunque scritta. Con
la spunta i carichi hanno la data scelta. L'«Ultimo ordine» dello Stock e il «consumati da allora»
partono così dalla data vera. Annullando la ricezione si toglie anche `senzaStock`.

### Tab Movimenti — a settimane (25/11/2026, QM: «movimenti»)

`invRenderMoves` mostra una scheda per **settimana** (lunedì–domenica, dalla più recente; le prime
6, poi «Mostra le settimane precedenti» → `invMovTutte()`), perché la distribuzione ai carrelli è
una a settimana. In ogni scheda tre gruppi: **Usciti** (scarichi: carrelli HKP, cucina),
**Entrati** (consegne), **Conteggi** (rettifiche `init`). Ogni conteggio dice di quanto ha
corretto il previsto: `_invMovDelta(moves)` → per id, contati − previsti in ordine di data
(«mancavano 2» rosso, «in più 1» blu, «tornava»; il primo conteggio di un prodotto non ha
previsto). Prima l'elenco seguiva l'ordine di **salvataggio** e i giorni uscivano mescolati: ora
passa da `_invInOrdine`. Stile: `.inv5-cornice`/`.inv5-hero` della Stock + classi `.inv6-*`
(guida di stile, «Elenco a settimane Movimenti»). Eliminazione invariata (`invDeleteMove`).

### Tab Analisi — a cicli d'ordine (25/11/2026, QM: «per analisi bisogna rivedere i criteri»)

Prima ragionava a **giorni**: consumo medio con decimali, «autonomia» in giorni, «Da riordinare» a
7/14 giorni, filtro 7/30/90/Tutto. Non c'entrava con come si lavora (ordine ogni 15 giorni, una
distribuzione a settimana) e contraddiceva la Stock. Ora `_invAnalisi(bm, ordinati, ora)`:
- **cicli**: quanto è uscito in ogni **coppia di settimane complete** delle ultime 12
  (`INV_AN_SETT`), scarichi + quello che i conteggi hanno trovato in meno (`_invSettimane`);
  **Di solito** = `_invTipicoOrdine` (lo stesso numero della Stock). Sempre interi.
- **andamento**: ultimo ciclo contro la mediana dei precedenti (servono 3 cicli): «in aumento» se
  ≥ +1/3 e almeno 2 pezzi in più, «in calo» al contrario, altrimenti «stabile».
- **ordinato / usato** nelle stesse 12 settimane: ordinato = ordini **ricevuti**
  (`_invOrdinatiPerProdotto`, quantità arrivata); «Il magazzino cresciuto di X · troppo» quando
  l'avanzo supera un ordine tipico (= si ordina più del necessario).
- **mancati**: pezzi trovati in meno ai conteggi (`_invRettifiche`), sotto il nome in rosso.
Il «cosa ordinare» sta **solo** nella Stock. `invSetPeriod`/`_invPeriod` restano ma non servono più.
Stile: `.inv5-*` + `.inv7-*` (guida, «Tabella a cicli d'ordine Analisi»).

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

**Descrizione per intero** (28/10/2026): nella maschera (inserimento e modifica, Compass) ogni
articolo occupa due righe — sopra la descrizione in una casella che va a capo (`textarea`,
righe in base alla lunghezza), sotto Qtà/UM/P.Unit/Totale a tutta larghezza. Prima la
descrizione stava in 130px e se ne leggevano due parole; anche "1200" e "133,06" si
tagliavano. Maschera larga 640px. I valori passano da `_esc` (testo dell'AI/PDF). La maschera
di `breakfast.html` (`ddtBkfShowParsed`) non è stata toccata. Controlli: "DDT: la descrizione
si legge per intero nella maschera".

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

### LANA.POLI — lavanderia (24/09/2026)

Nuovo fornitore in `DDT_FORNITORI`: `'LANA.POLI'`, reparto Housekeeping, stessa card e stessi
criteri degli altri; logo `lanapoli.png` (dal file del QM, sfondo reso trasparente, 26/09/2026). È la lavanderia di Raimondo: fattura una volta
al mese per struttura, SoulArt e Boutique separate. Nel caricamento si sceglie dal menu
fornitore, e l'hotel ora comprende anche **Boutique** (prima solo SoulArt e Art Resort). Il nome
sul documento "LANA.POLI SRL" si riconosce da solo (`ddtNormFornGeneric` ignora punti e spazi).
Le quantità della fattura si incrociano in Consumo Biancheria → Totali del mese.

## Analisi: le rettifiche di stock contano (06/10/2026)

Una rettifica dalla matita (`invEditQty`, move `type:'init'`) era ignorata dall'analisi: il prodotto uscito
senza scansione non risultava consumato (media più bassa, autonomia più lunga, "da riordinare" tardi).
Ora `_invRettifiche` calcola per ogni rettifica la differenza rispetto allo stock di quel momento: in meno =
**consumo non scansionato** (entra in consumo del periodo, medie, ultimi 7gg, mese, quindi anche in autonomia),
in più = carico non registrato (entra in "Totale caricato"). Il primo `init` (inventario iniziale) non conta.
Si vede in "Totale scaricato · di cui N non scansionati" e nel dettaglio di ogni prodotto. L'app Inventario
del telefono non ha l'analisi: non cambia.

