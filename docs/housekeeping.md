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

- **Oggi non si propone mai** (26/09/2026): siccome si spostano solo soggiorni che arrivano dopo oggi, nessuna mossa può cambiare le partenze o il carico di oggi. `_hkPrimoGiorno()` = indice di oggi + 1 (0 se oggi non è nel Piano): da lì partono `sbilanciati`, il punteggio della settimana e i pulsanti dei giorni del pannello "Come bilanciare". Oggi e i giorni passati non hanno pulsante, e se il giorno selezionato in cima è oggi (quello con cui si apre la vista) i suggerimenti aprono direttamente domani. La "Suddivisione cameriere" in cima resta invece su oggi.

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

---

## "Fatto nel PMS", Piano della settimana, partenze del mese, avviso (27/09/2026)

**Fatto nel PMS** (`hkSegnaFatto`, chiave condivisa `qm_hk_fatte`, fusione a tre come gli
altri elenchi condivisi, riletta a ogni giro da `_qmSyncGiro`). Una mossa fatta diventa
`{id,ts,cat,righe:[{da,a,s,e}]}`: ogni soggiorno spostato, riconosciuto da camera + data
d'arrivo (`s`, dd/mm/yyyy — non l'indice: il Piano nuovo può partire da un altro giorno).
`renderRoomDivision` disegna sul **Piano effettivo** (`_hkPianoEffettivo`): il Piano caricato
con quegli spostamenti applicati; per la durata del disegno `pianoData` è quello effettivo e
`_hkPianoVero` il caricato. Il resto di Compass vede il Piano caricato. Esiti per mossa:
`attesa` (ancora dov'era: si applica), `nelPiano` (il Piano nuovo lo contiene: esce
dall'elenco), `sparito` (né dov'era né dove doveva andare: riga ambra "Non trovato", pulsante
Togli), `fuori` (date fuori dal Piano: esce). In uno scambio i soggiorni si tolgono tutti
prima di rimetterli, perché possono arrivare lo stesso giorno.

**Piano della settimana** (`hkPianoSettimana`, selettore "Giorno per giorno / Piano della
settimana", preferenza del browser `hkModo`): la mossa migliore sull'intera settimana, poi la
migliore sul Piano con quella mossa, fino a 8 passi o finché non migliora più. Il pulsante
"Fatto nel PMS" c'è solo sul primo passo: gli altri sono calcolati sul Piano dopo i precedenti.

**Partenze del mese** (`qm_hk_mese`, `{ 'YYYY-MM-DD': {m,a} }`, elenco condiviso): a ogni
disegno si registrano i giorni del Piano effettivo fino a oggi (partenze + cambi, come
"Totale settimana"); si scrive solo se cambia qualcosa. Il riquadro mostra il **mese intero**: i
giorni passati registrati più quelli ancora in programma nel Piano fino a fine mese
(`_hkMeseTotali(oggi,piano)`) — solo i passati davano "Matarese 5" quando il Piano ne
mostrava 17 da domani al 30 (28/09/2026). Il conto parte dal **28/09/2026**
(`HK_MESE_DAL`, scelta del QM): prima non esiste. Spareggio nel motore: a parità di beneficio, se Matarese è in
credito nel mese vince la mossa che le toglie più partenze (`dM`), e viceversa.

**Avviso** (`_hkAvvisoHtml`): in cima alla vista, solo se nei prossimi tre giorni c'è uno
squilibrio di almeno 2 partenze **e** ci sono mosse possibili. "Vedi le mosse" apre il giorno
in modalità giorno per giorno e scorre ai suggerimenti (`hkVaiAlGiorno`).

I pulsanti dei giorni chiamano `hkGiorno(i)` (torna a "giorno per giorno"), non più
`pianoNavRender(i)` direttamente. Controlli: "Bilanciamento: mosse fatte nel PMS, piano della
settimana, mese" in `test/controlli.js`.

### Operativa HKP: SoulArt e Boutique (ditta esterna) — 28/09/2026

Da settembre 2026 le camere del Boutique (200) le pulisce una ditta esterna: Betty (BE), Rita
(RI), Tiziana (TI), Martina (MA), Pina (PI, aggiunta il 04/10/2026) in `HKP_HW_NAMES`, sigle della ditta in `HKP_DITTA_ESTERNA` (con DI). Arabella (AR, 04/10/2026) è solo un nome in `HKP_HW_NAMES`: conta come interna.
Nel tab Camere della SoulArt le card del periodo sono divise **per area**: "SoulArt" (camere
Art) e "Boutique · ditta esterna" (camere 200 e San Liborio — Liborio sta col Boutique come nel
Bilanciamento). Nel mese del passaggio (`HKP_MESE_PASSAGGIO='2026-09'`) le interne che
compaiono nelle 200 hanno bordo e sigla ambra e l'etichetta "interna", e stanno tutte insieme in un gruppo a parte
("Interne che a settembre hanno lavorato nelle 200") sotto le card della ditta. De Masi (CD) e Daniela
(DA) escono dall'azienda dopo settembre: restano nei nomi per i mesi passati.
Le card dei simboli (camere libere, ripassi, non disturbare) hanno una sezione loro, "Camere libere,
ripassi e non disturbare", sotto quelle delle cameriere.
Nel tab Camere della SoulArt quella sezione è divisa per struttura (SoulArt / Boutique · ditta esterna,
`symArt`/`symBou`). In Bilanciamento Camere il "Riepilogo Housekeepers Boutique" evidenzia e raggruppa
le interne nelle 200 nel mese del passaggio, come Operativa HKP.
**San Liborio resta alle interne** (28/09/2026): dal 21/09/2026 (`HKP_DATA_PASSAGGIO`) la riga LIBORIO conta
con la SoulArt — card delle cameriere e LIB/ND/RP — prima col Boutique (`_hkpAreaSoulArt(p,row,giorno)`,
usata da Operativa HKP e dai riepiloghi del Bilanciamento).
La scritta del riempimento segue lo spostamento (`_hkpCapienza`): 22/11 camere fino ad agosto, "22 camere, 23 dal 21/9"
e "11 camere, 10 dal 21/9" a settembre, 23/10 da ottobre.
Titoli: "SoulArt · San Liborio" e "Boutique 200 · ditta esterna" (la ditta ha solo le 200).
**Griglia Camere: San Liborio nel riquadro ART 8–9 / 13–21** (04/10/2026). Si cambia solo come si
**mostra** (`HKP_ROOMS.sa.vistaCamere`, letta da `hkpNRigheVista`): le celle sono salvate per posizione
nella lista `camere` (`camere:{ri}_{giorno}`, LIBORIO = riga 32), che **non va riordinata** — spostare
LIBORIO lì sposterebbe di una riga i dati di tutte le 200 in tutti i mesi. Griglia e stampa usano la
vista; le frecce/Invio si muovono per posizione a schermo (`data-vi`), non per `data-ri`.
**Clic su una card cameriera** (04/10/2026): le sue caselle nella griglia si colorano d'arancio
(`hkpNEvidenzia` → `_hkpNEvidApplica`, classe `td.hkp-evid`); secondo clic sulla stessa card spegne.
Conta l'area della card: dalla card SoulArt solo camere ART e San Liborio (dal 21/09), dalla card
Boutique solo le 200. È **solo colore, non selezione**: con `_hkpNsel` un Canc per sbaglio
cancellerebbe tutte le sue camere del mese. Si rimette dopo ogni ridisegno. Le card del
Bilanciamento Camere non sono cliccabili (lì non c'è la griglia): il 6° parametro `area` di
`hkpMonthlyCameriereHtml` lo passa solo Operativa HKP.

### Revisione del 28/09/2026 — difetti trovati e chiusi

- **Scambio fra soggiorni con lo stesso giorno d'arrivo.** Il soggiorno si riconosceva solo
  da camera + arrivo: caricato il Piano nuovo, nella camera di partenza c'era l'ALTRO
  soggiorno con la stessa data, la mossa risultava "ancora da fare" e veniva applicata al
  contrario (i numeri disfacevano lo scambio vero). Ora conta anche la partenza (`r.e`),
  quando è nota: non lo è sull'ultimo giorno del Piano, dove non si distingue una partenza
  da un soggiorno che continua.
- **Camera d'arrivo occupata nel frattempo** (nuova prenotazione nel PMS): applicare la mossa
  metteva due ospiti nella stessa camera. Ora l'esito è `conflitto` — riga ambra "Camera ora
  occupata", i numeri non la contano, pulsante Togli.
- **Ridisegno a vista nascosta.** Il polling richiama `pianoNavRender` ogni minuto, e con lui
  il Bilanciamento: Piano della settimana, conteggio mosse per giorno e avviso giravano anche
  con la vista chiusa, su ogni postazione. Ora `renderRoomDivision` disegna solo se la vista è
  aperta (registra comunque le partenze del mese) e `setView('room-division')` la ridisegna
  all'apertura.

### San Liborio con la SoulArt nell'app Housekeeping e nell'Overview (06/10/2026)

Nell'app `housekeeper.html` San Liborio sta sotto "SoulArt Hotel - San Liborio": le sue camere vanno fra le
"Altre housekeeper" e nei conteggi SoulArt (anche nell'anteprima dei giorni successivi); il Boutique resta da
solo ("Boutique Hotel", ditta esterna). Stessa cosa nel riquadro Housekeeping dell'Overview di Compass
(`renderPianoGiorno`: "SoulArt - San Liborio" e "Boutique").

### App Housekeeping: schede per cameriera (06/10/2026)

Disegno "idea A" approvato dal QM. Per ogni struttura: tre numeri (partenze, fermate, camere) con icone a linea,
poi una **scheda per cameriera** — "Matarese", "Altre housekeeper" (SoulArt + San Liborio), "Ditta esterna"
(Boutique 200) — con a destra il riquadro arancione delle **partenze** (numero grande), sotto il nome le fermate
e il **carico** (`hkCarico`: partenza 2, fermata 1; Art 1-2-3-8-9-13 2,5 e 1,5, come Compass), e le camere in
due gruppi, "Partenze" (⇄ = con arrivo) e "Fermate". Camere SoulArt sempre "Art N", Liborio "San Liborio".
Icone (`hkIco`) al posto delle emoji, "B" di Booking come in Compass (`HK_BK`), legenda in fondo. Tolte
`renderRoomDetail` e `renderKpi` (vecchio disegno). Il riquadro di confronto del carico in alto è stato provato
e scartato dal QM.
Tolti su richiesta del QM (06/10/2026) la legenda in fondo e il riquadro "Totale giorno — entrambe le strutture".

Numeri ingranditi (06/10/2026): tessere 30px, partenze della scheda 30px (40 provato e scartato), camere 17px, anteprime 26px.
