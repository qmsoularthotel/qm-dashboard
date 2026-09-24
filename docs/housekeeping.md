# Housekeeping — Operativa HKP e Bilanciamento Camere

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

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

### Come si legge un suggerimento (rifatto il 03/09/2026)

Prima l'azione era una frase ("sposta prima X, poi Y") e a destra quattro numeri senza
etichetta: l'ordine delle operazioni andava ricostruito ogni volta, **molte volte al giorno**.

Ora ogni spostamento è una **riga a sé, da eseguire dall'alto in basso**, sotto intestazioni
fisse `SPOSTO` / `QUANDO` / `COSA CAMBIA`. Camera di partenza grigia, camera di arrivo blu
piena: la direzione si vede senza leggere. Quando i passi sono più d'uno compaiono numerati,
con l'etichetta ambra "N spostamenti, in quest'ordine".

**Le partenze sono l'obiettivo, il carico è un dettaglio.** Le cameriere confrontano fra loro
le partenze pro capite: il carico (lavoro pesato, con le fermate che valgono meno di una
partenza) è una grandezza interna al motore. Ogni giorno toccato mostra quindi sempre le
**partenze** prima → dopo; il carico si nomina solo quando le partenze non cambiano ("cambia
solo il carico"), altrimenti la riga sembrerebbe senza effetto. L'esito in alto a destra
nomina la cosa e il giorno ("pareggia le partenze di Sab 5/9"), ed è costruito sui giorni in
cui le partenze cambiano davvero, non sul primo dell'elenco.

**Lo scambio in blocco** elenca una riga **per prenotazione**, ciascuna con le sue date. Il
viaggio di ritorno (le prenotazioni dell'altra camera) non è un passo: è una conseguenza
obbligata, detta una volta sola in una riga — elencarla raddoppiava le righe senza aggiungere
una decisione.

**Selettore dei giorni nell'intestazione**: gli stessi sette pulsanti del pannello in alto
(chiamano `pianoNavRender()`, non un secondo stato), con sotto ciascuno le **partenze del
giorno** `Matarese · Altre`, verdi se in pari e rosse se sbilanciate. Soglia identica a quella
del motore (≥2 di scarto): uno di scarto con numeri dispari è inevitabile, segnarlo in rosso
manderebbe a cercare una soluzione che non esiste. I giorni passati sono in grigio.

**Terza riga: quante mosse ci sono per quel giorno** (06/09/2026). Le partenze dicono se il
giorno è **storto**, non se c'è **qualcosa da fare**, e sono due cose diverse: un giorno con
le partenze in pari può avere mosse (il motore guarda anche il carico — è il caso della
schermata che ha fatto nascere la riga: `8 · 8` verdi ma *da sistemare*, carico 17,5 · 20,5),
e un giorno rosso può non averne nessuna (tipologie tutte da un lato, camere occupate).
L'unico modo di saperlo era **aprire i giorni uno per uno**, ogni giorno.

Ora ogni pulsante porta `2 mosse` in ambra, oppure **`—`** dove non c'è niente da proporre.
Il trattino si stampa sempre: se la riga comparisse solo dove c'è qualcosa, un giorno senza
mosse sarebbe indistinguibile da uno non ancora calcolato, e i pulsanti avrebbero altezze
diverse fra loro. La didascalia (`title`) dice la stessa cosa a parole.

**Costa poco, e per un motivo preciso**: `hkSuggestMoves` esce subito (`return out`) per un
giorno passato o già in pari, quindi il giro completo del motore lo pagano **solo i giorni
davvero sbilanciati** — misurato ~20 ms per tutta la settimana su un piano da 20 camere,
contro i 2 ms di una chiamata sola. Il giorno aperto non si ricalcola: il suo conteggio è
già in `s.totMosse`. Se un domani il motore perdesse quell'uscita anticipata, questa riga
diventerebbe cara: è la condizione da non toccare.

**Il numero non può mentire**: dev'essere quello che si trova aprendo quel giorno
(`s.totMosse`, il conteggio *prima* del taglio a `maxN`). Una chip che promette suggerimenti
e poi non ne mostra è peggio di nessuna chip — si smette di fidarsi del pannello e si torna
ad aprirli tutti a mano. È l'invariante verificata dai controlli.

Coperto da **13 controlli** in `test/controlli.js` ("Bilanciamento camere: le chip dicono
dove ci sono suggerimenti"), verificati con tre sabotaggi (la chip non dichiara mai niente;
conta il giorno sbagliato; riga vuota invece del trattino): 3, 4 e 1 falliscono.

**Mosse che non toccano il giorno selezionato**: per gli `scambio-blocco` il filtro sul giorno
in focus è saltato di proposito (riguardano tutta la settimana), e la nota diceva il contrario.
Ora quelle mosse portano il badge grigio **non tocca \<giorno\>**.
