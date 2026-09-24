# Recensioni — punteggio Booking, Booking.com, Expedia

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

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

### Formato file Expedia — TAB o VIRGOLA, si prova, non si indovina (06/09/2026)

Expedia Partner Central esportava **separato da TAB** e ora esporta **separato da
virgola**, coi campi fra virgolette. `revExpParseTsv` splittava solo sul TAB: un export
CSV dava **una colonna sola**, `review_rating` non si trovava mai e la vista rispondeva
*"Nessuna recensione trovata nel file"* — un file perfettamente valido rifiutato, con un
messaggio che accusava il file invece del parser. Le recensioni Booking non ne
risentivano: `revParseCsv` è un parser CSV vero da sempre.

Il nome della funzione resta `revExpParseTsv` (è quello documentato e usato in due punti),
ma ora accetta **TAB, virgola e punto e virgola** — l'ultimo è quello che si ottiene
aprendo il CSV con Excel in italiano e risalvandolo.

**Il separatore si sceglie provandolo**, non contando le occorrenze: un testo di
recensione pieno di virgole ingannerebbe un conteggio, mentre le colonne attese le
produce un separatore solo. Si tiene il primo che fa comparire `review_rating` fra le
intestazioni.

`_revRighe(str,sep)` è l'**unica** copia del parser a campi virgolettati (una virgola o un
a capo *dentro* le virgolette non spezzano niente), condivisa da Booking ed Expedia: erano
due copie, e infatti una delle due è rimasta indietro. Estratta da `revParseCsv`, che ora
la chiama con `','` — comportamento identico a prima.

**Compatibile all'indietro**: i file già salvati in TSV su `qm_rev_exp_<p>` (localStorage e
KV) continuano a essere letti, quindi nessun reimport necessario.

**Il messaggio d'errore ora dice cosa ha trovato** (`_revExpDiagnosi`): file vuoto,
oppure le intestazioni realmente presenti quando manca `review_rating`. È la differenza
fra *"ho scaricato il file sbagliato"* e *"il formato dell'export è cambiato di nuovo"*,
due cause con rimedi opposti — e la seconda, senza questo, si scopre solo leggendo il
codice.

Colonne reali dell'export: `review_date` · `brand_type` (Expedia / Hotels / Orbitz) ·
`review_by` · `review_rating` (`"10 out of 10"`) · `review_title` · `review_text` ·
`review_response_date` · `review_response_by` · `review_response`.

**Il nome dell'ospite c'è, e si continua a NON usarlo** (deciso il 06/09/2026). L'export
riporta `review_by` (mostrato in lista), quindi il nome sarebbe disponibile: le risposte
Expedia devono comunque aprire **sempre** con "Dear Guest," / "Gentile ospite,". È una
**scelta**, non un ripiego per un dato mancante — il vecchio testo di questa sezione
diceva che il nome non c'era, e da lì nasce l'equivoco.

**Non "correggerla" trovando `review_by` nei dati**: vedere il nome disponibile e passare
a usarlo come su Booking è esattamente l'errore che questa nota esiste per prevenire. La
regola vive nel prompt di `revExpGenerateReply` (regola 1: *mai il nome*) e va cambiata
solo se lo chiede il QM.

Coperto da **17 controlli** in `test/controlli.js` ("Recensioni Expedia: l'export si
carica comunque sia separato"), verificati con due sabotaggi (si prova solo il TAB; il
separatore dentro le virgolette spezza il campo): 10 e 6 falliscono — il secondo mostra
proprio lo slittamento delle colonne, con `brand_type` che legge `2026`.

### `revExpGenerateReply(r)` — regole specifiche

- Apertura sempre con "Dear Guest," (inglese) o "Gentile ospite," (italiano)
- Recensione senza testo (`review_text` vuoto): 2 frasi concise, non template fisso
- Stesse regole di Booking su critiche, punteggio, invito a tornare, no contatto diretto

---
