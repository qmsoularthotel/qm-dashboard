# Sincronizzazione, accesso al Worker, Stato del sistema, backup

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

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

### Elenchi condivisi col telefono — fusione a tre (23/09/2026)

DDT (`qm_ddt`: Compass + `breakfast.html`), movimenti e catalogo dell'Inventario
(`qm_inv_moves_*`, `qm_inv_catalog_*`: Compass + `inventory.html`), ordini (`qm_inv_orders`) e
spunte "risposta inviata" delle recensioni (`qm_rev_sent`, i due Mac) si scrivevano **per
intero** con la copia della postazione. Compass le rileggeva **solo all'apertura**: un DDT
inserito dal telefono alle 10 spariva se alle 15 si correggeva un altro DDT su un Compass
aperto dalla mattina; una rettifica di giacenza cancellava i movimenti scansionati nel
frattempo. In più il telefono **sostituiva** la propria copia con quella del cloud a ogni giro,
buttando ciò che non era riuscito a mandare su.

`_qmTre(base,locale,cloud)` fonde senza tracce delle eliminazioni: ogni postazione ricorda la
**base** (`qmbase:<chiave>` in `localStorage`, l'ultima copia vista sul cloud) e dal confronto
sa chi ha aggiunto, cancellato o modificato cosa. Senza base si uniscono le due copie. Un cloud
vuoto non vale come "tutto cancellato". Record per `id`, oggetti per chiave, righe senza `id`
per contenuto.

| Funzione | Ruolo |
|---|---|
| `_qmElencoSalva(key,vuoto,dopo)` | rilegge, fonde, scrive; una per volta per chiave; cloud illeggibile → non scrive e lo segnala |
| `_qmElencoAggiorna(key,vuoto,dopo)` | rilettura (apertura di Spese e Inventario, avvio, giro del telefono); rimanda su ciò che c'è solo qui |
| `_qmElencoAssorbi` | la fusione vera, **sincrona** dopo l'arrivo del cloud: niente si infila fra lettura e scrittura. `dopo(fuso)` aggiorna chi tiene l'elenco in memoria (`REV_SENT`, `moves`/`catalog` di `inventory.html`) — senza, una scrittura successiva ripartirebbe dalla memoria vecchia e scambierebbe per cancellato ciò che era appena arrivato |

**`_qmTre` è copiata identica in `breakfast.html` e `inventory.html`**, e `test/esegui.sh`
verifica che le tre copie coincidano e che nessuno dei tre file scriva questi elenchi con
`kvSet`/`qmKvSet` diretto. 20 controlli in `test/controlli.js`, verificati con tre sabotaggi.

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

#### La finestra dimenticata aperta si addormenta da sola (09/09/2026)

Il cancello a scheda nascosta **non basta**: una finestra lasciata **in primo piano** con
nessuno davanti continua a leggere il cloud ogni minuto — 7 chiavi a giro, oltre 10.000
letture al giorno per postazione — e le riscritture dei dati derivati che ne seguono pesano
sul tetto **stretto** delle 1.000 scritture. Capita spesso, a casa e in albergo, e chi l'ha
lasciata aperta quasi mai è lì per chiuderla: *"sono alla Casa Moresca, non posso farci
niente"*. Il rimedio non può essere ricordarsene.

Dopo `QM_INATTIVO_MS` (30 minuti) senza un segno di vita il giro si ferma, e **riparte al
primo tocco** con un giro immediato — chi torna davanti allo schermo ha i dati freschi prima
di poter fare qualunque cosa. Il risveglio è registrato in `_qmPolling` e agisce **solo
mentre si è in pausa**, altrimenti ogni clic della giornata proverebbe a fare un giro.

**La pausa non è silenziosa**, e non è un dettaglio estetico: una copia visibile e vecchia è
il punto di partenza di ogni sovrascrittura (incidente pre-stay del 22/08/2026). Compare una
pastiglia ambra in basso — *"Compass in pausa · i dati non si stanno aggiornando — tocca lo
schermo per riprendere"*. Un aggiornamento che si ferma senza dirlo è peggio del consumo che
si sta risparmiando.

**Due orologi diversi, e non vanno confusi:**

| Variabile | Domanda | Parte da |
|---|---|---|
| `_qmUltimoTocco` | quando questa finestra ha visto qualcosa di umano, **o è stata aperta** | `Date.now()` — aprire Compass è di per sé un gesto, e una finestra appena aperta deve aggiornarsi anche prima del primo clic |
| `_qmToccata` | qualcuno ha **davvero** toccato qualcosa | `false` — serve a non spacciare per presidiata una pagina che si è ricaricata da sola: `qmCheckVersione` lo fa anche di notte |

`_qmInattivaDa()` (che decide la pausa) guarda il primo; `_qmQualcunoAlComputer()` (che decide
il `tocco` nel registro delle postazioni) pretende anche il secondo.

**Restano fuori, di proposito**: le 5 app standalone (`qmCheckAppStatus`, 1 lettura al minuto
ciascuna, ~1.400 al giorno) e `reception.html` (3 letture al minuto, ~4.300 al giorno). La
seconda soprattutto: è **pensata per restare aperta** su schermo a reception, e metterla in
pausa contraddirebbe il suo scopo. Se un domani il consumo tornasse a stringere, è lì che
vanno guardate — con l'avvertenza che su reception la pastiglia di pausa dovrebbe essere
molto più evidente di così.

Coperto da 7 controlli, verificati con tre sabotaggi (la finestra abbandonata continua a
leggere; si ferma ma in silenzio; non si riprende più dopo la pausa): 2, 1 e 1 falliscono.
Ogni prova parte da un contatore nuovo: la guardia anti-raffica di `_qmPolling` blocca i giri
troppo ravvicinati, e i controlli girano tutti dentro lo stesso millisecondo.

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

### Dopo un caricamento l'Overview si ridisegna TUTTA — `ovAggiornaTutto()` (23/09/2026)

Dopo ogni upload serviva Cmd+R: `refreshOverviewForDate` aggiorna turno, pulizie e colazioni ma
lascia fermi il giorno del Piano (camere, box Culligan, stato preparazione — tutto dentro
`pianoNavRender`, che ridisegnava solo `pianoOvInit` al primo giro), il riquadro Booking e il
contatore recensioni. `ovAggiornaTutto()` fa tutto questo **mantenendo** il giorno scelto nella
striscia del turno e quello del Piano.

Il gancio è **`setUploadTs`**, per cui passano tutti i caricamenti andati a buon fine: nessun
handler da ricordare. Parte dopo 400 ms (Prenotazioni scrive più dati di fila) e **non usa
`_qmOccupato`**: dopo aver scelto un file il fuoco resta sul campo file, che bloccherebbe il
ridisegno per sempre — si aspetta solo chi sta davvero scrivendo. Lo usano anche il giro
automatico (`_qmRidisegnaVista('overview')`) e il ritorno in Overview da un'altra vista.

### `_qmRidisegnaVista` è separato dai ganci di `setView` — di proposito

`setView` oltre a ridisegnare fa cose che in un aggiornamento in sottofondo **non devono succedere**: apre i gruppi del menu, riporta lo scorrimento in cima, e soprattutto chiama `turniPrefMarkAllSeen()` — un aggiornamento automatico che segna lette le Preferenze Turni le farebbe sparire dal badge senza che nessuno le abbia guardate. Le due liste vanno quindi tenute allineate a mano: **aggiungendo una vista, aggiungerla in tutti e due i posti.**

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

### "Copia codice" non faceva niente dal 06/09 al 23/09/2026

Togliendo i collegamenti di abilitazione erano state cancellate anche `qmChiediPass` e
`qmCopiaCodice`, che il pannello *Dispositivi abilitati* usa ancora: i due pulsanti
(*Abilita questo computer*, *Copia codice*) chiamavano funzioni inesistenti e il clic non
faceva niente, senza nessun errore a schermo. Rimesse; `test/esegui.sh` controlla ora che
**ogni** `onclick`/`onchange`/`oninput` di ogni pagina punti a una funzione che esiste
(`_senza_funzione`), verificato sulla versione rotta: scatta.

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

## Accesso al Worker — la porta è CHIUSA (dal 05/09/2026)

`/kv/*` era completamente aperto: chiunque conoscesse l'indirizzo del Worker — scritto nel
sorgente del sito, quindi pubblico — poteva **leggere, modificare e cancellare** tutto
l'archivio: nomi degli ospiti con camera e date (`qm_rcGuests`, `qm_arriviData`), turni,
fascicolo dipendenti, cassa. Verificato il 02/09/2026 da riga di comando, senza credenziali.

Dal **05/09/2026** la variabile `QM_AUTH_OBBLIGATORIA=si` è attiva sul Worker: senza
lasciapassare valido, lettura, scrittura e cancellazione rispondono **401**. Verificato su
tutti e tre i percorsi.

### Come funziona

| Pezzo | Dove | Cosa fa |
|---|---|---|
| `QM_PASSWORD`, `QM_AUTH_SECRET` | variabili sul Worker | la password che genera i lasciapassare e la chiave con cui si firmano. **Non vanno mai chieste né scritte in chat**: le imposta il QM direttamente su Cloudflare |
| `/auth` | Worker | password → lasciapassare firmato HMAC, valido **180 giorni** |
| `X-QM-Pass` | header aggiunto da Compass e dalle app | il lasciapassare viaggia su ogni richiesta a `/kv/*` |
| `qmMostraAttivazione()` | `app.js` + le 5 app | velo navy pieno con il campo "incolla il codice". Da una macchina non abilitata non si intravede nulla |

### Abilitare un dispositivo — nessuno digita password

Il vincolo esplicito è: **il personale non deve digitare password.** Si passa un **codice**
(il lasciapassare già firmato), uno solo per tutti.

**C'è UNA strada sola: il codice** (06/09/2026). I collegamenti di abilitazione — un indirizzo
con dentro il codice, uno per app — sono stati **rimossi**: il QM manda il codice a mano a chi
si collega, e due strade per la stessa cosa rendevano il pannello incomprensibile. Tolti
`QM_APP_LINK`, `qmLinkAttiva`, `qmCopiaLink`.

**Il lettore invece resta** (`qmEstraiAttiva`, in `app.js` e in tutte le app): un collegamento
mandato prima di quella data continua ad abilitare chi lo apre. Toglierlo avrebbe rotto
qualcosa già in circolazione senza guadagnarci niente — ed è annotato anche in
`test/controlli.js`, dove il controllo sui collegamenti generati è stato sostituito da questa
spiegazione.

I passaggi:

1. Sul proprio computer: **Pannello App → Dispositivi abilitati → Copia codice**
2. Si manda alla persona in chat privata (non in gruppo: chi è nel gruppo può abilitarsi)
3. Sul suo dispositivo: **aprire l'app dall'icona** e incollare il codice nella schermata

**Va incollato DENTRO l'app**, non aperto da WhatsApp: il link dalla chat si apre in Safari,
che ha una memoria separata da quella dell'icona sulla schermata iniziale — il lasciapassare
finirebbe in Safari e l'app resterebbe fuori.

L'abilitazione **non passa dal server**: il codice viene riconosciuto e salvato in locale,
quindi funziona anche a porta chiusa. Se il codice è sbagliato l'app lo accetta (controlla
solo la forma), si ricarica, viene rifiutata e ripropone la schermata: si riparte senza
danni, ma il messaggio non dirà "codice errato".

### Se qualcuno resta fuori

Non serve riaprire la porta: chi non ha il codice vede la schermata di abilitazione e lo
chiede. **Riaprire** significa togliere `QM_AUTH_OBBLIGATORIA` (o metterla a un valore
diverso da `si`) su Cloudflare e ridistribuire — da fare solo se l'attività si blocca
davvero, perché rimette l'archivio in chiaro per chiunque.

**Revocare un singolo dispositivo non si può**: il codice è uno solo per tutti. L'unico modo
è cambiare `QM_AUTH_SECRET`, che rimette fuori *tutti* e obbliga a rifare il giro. I codici
per persona sono stati discussi e rimandati.

### Cosa resta fuori dalla porta

- **`registration-galleria.html`** non usa il cloud in nessun modo (vedi la sua sezione): non
  ha lasciapassare e non gli serve.
- **Il proxy AI** (tutto ciò che non è `/kv/` né `/prestay/`) è **chiuso dal 05/09/2026**,
  con lo stesso interruttore `QM_AUTH_OBBLIGATORIA`. Non custodisce dati degli ospiti, ma gira
  richieste a carico di `ANTHROPIC_API_KEY`: senza controllo chiunque conosca l'indirizzo può
  spendere soldi altrui. Il gancio `fetch` di Compass e delle app aggiunge ora `X-QM-Pass` a
  **ogni** richiesta al Worker, non solo a quelle `/kv/` — prima l'analisi dei PDF partiva
  senza lasciapassare. **Ordine di pubblicazione**: prima il sito, poi il Worker; al
  contrario, una pagina non ancora ricaricata perde l'analisi dei PDF finché non ricarica.
- **`/prestay/*`** era già protetto da `PRESTAY_KEY` + lista di origini ammesse.
- **Il codice della Galleria** (`bg.…`, dal 12/09/2026) passa dal cancello di `/kv/` ma apre
  **solo** `/kv/get`/`/kv/set` su chiavi `bg_*` (`permessoGalleria`). Vedi "Gestione Biancheria".

### Stato del sistema — `qmRenderStatoSistema()`

Nella vista **Stato del sistema**, impaginata per essere letta in due secondi: un **verdetto
grande** in cima (verde *"Tutto in ordine"*, oppure rosso con elencato cosa non va), sotto il
**consumo dell'archivio con una barra**, e in fondo, in piccolo, i dettagli — che si leggono
solo quando qualcosa non torna.

Prima erano sei righe con lo stesso peso: un elenco da leggere, non uno stato da guardare.
Entrando lì la domanda è una sola — *va tutto bene?* — e la risposta deve arrivare prima dei
dettagli. Le voci rispondono comunque a domande a cui da Compass **non si poteva rispondere**:
si scoprivano solo aprendo Cloudflare o chiedendo a Claude.

| Riga | Da dove | Quando è rossa |
|---|---|---|
| Worker in linea, versione | `GET /versione` (pubblico, nessuna chiave) | non risponde |
| Accesso riservato / **APERTO** | campo `portaChiusa` di `/versione` | `QM_AUTH_OBBLIGATORIA` non attiva |
| Ultimo **salvataggio** altrove · e chi ha Compass aperto senza nessuno | `qm_ultimo_agg` su KV, una riga per postazione | mai — è informativa |
| Questo computer · nome | `qm_dispositivo` in `localStorage` | mai |
| Compass v… · aperto da … | il `?v=` del tag `<script>` e `_QM_APERTO_DA` | mai — è informativa |
| Errori del programma oggi | `localStorage`, raccolti da `_qmSegnaErrore` | rossa se ce n'è almeno uno |
| Scritture non ancora arrivate | `localStorage`, registro tenuto da `_kvNonRiuscita`/`_kvRiuscita` | rossa finché un dato resta fermo su questo computer |

#### "Ultimo salvataggio altrove" — le ALTRE postazioni, mai la propria (fix 09/09/2026)

La domanda che con due postazioni ci si fa più spesso è *è stato toccato qualcosa **da
un'altra parte** da quando non guardo?*. La prima versione teneva un valore solo
(`{ts,dispositivo}`) riscritto da chiunque salvasse: siccome a firmarlo è la postazione che
si sta usando, a ogni salvataggio, la riga diceva sempre **"questo computer, poco fa"** —
cioè una cosa che chi legge sa già. *"Non è un dato molto utile, è ovvio"*, ed era vero.

`qm_ultimo_agg` è ora un registro **con una riga per postazione**
(`{postazioni:{Hotel:{ts,dato,tocco}, …}}`), e la scheda mostra solo le **altre**
(`_qmAltrePostazioni`), dalla più recente: *"Ultimo aggiornamento altrove — Hotel oggi alle
14:32 · Casa ieri alle 21:10"*. Senza nessun'altra, lo dice (*"nessuna ha ancora scritto"*)
invece di ripetere la propria.

- **Si rilegge e si fonde prima di scrivere**, come ogni chiave toccata da più postazioni:
  mandare solo la propria riga cancellerebbe quelle delle altre, cioè esattamente il dato
  che serve.
- **Si leggono tutte e tre le generazioni del registro** (`_qmVoceAgg`): il valore unico
  originale `{ts,dispositivo}`, quello a una riga per postazione col solo segnatempo, e
  quello attuale `{ts,dato,tocco}`. Nessuna migrazione da lanciare, e chi aveva scritto per
  ultimo non sparisce.
- `QM_AGG_POSTAZIONI_MAX=12`: browser diversi e nomi riscritti farebbero crescere il registro
  all'infinito; si tengono le più recenti.
- Resta una scrittura ogni mezz'ora al massimo per postazione (`QM_AGG_OGNI_MS`), più una
  lettura per la fusione.

##### "Aggiornamento" era la parola sbagliata, e la riga raccontava una cosa falsa

Due difetti trovati insieme, subito dopo:

- **"Aggiornamento" vuol dire anche il cambio di versione di Compass.** Qui è sempre stato
  un'altra cosa: una postazione che ha **salvato un dato**. Si dice quindi *salvataggio*, e
  si **nomina il dato** (`_kvNomeDato`, la stessa mappa delle scritture non arrivate) —
  *"Hotel · Piano settimanale, oggi alle 14:32"*. Senza il nome del dato, "aggiornamento"
  non vuol dire niente.
- **A firmare il registro è OGNI scrittura riuscita, comprese quelle automatiche.** Una
  postazione lasciata aperta rilegge il cloud, ricalcola i dati derivati e li risalva:
  risultava quindi "aggiornata" con nessuno davanti. Visto il 09/09/2026 — la scheda diceva
  che *Casa* aveva aggiornato mentre il QM era fuori Napoli e aveva solo lasciato la finestra
  aperta. Una riga che fa pensare a un collega al lavoro dove non c'è nessuno è peggio di
  nessuna riga.

Il segnale che distingue i due casi è `_qmQualcunoAlComputer()`: qualcuno ha toccato **questa**
pagina negli ultimi `QM_TOCCO_MS` (10 minuti)? Un tocco, un tasto, o il ritorno in primo piano.
Non prova che quella scrittura l'abbia voluta lui, ma separa una postazione presidiata da una
finestra dimenticata, che è la differenza che conta. Finisce in `tocco` sulla voce del
registro, e la scheda mostra due righe distinte:

| Riga | Quando compare |
|---|---|
| **Ultimo salvataggio altrove** | postazioni con `tocco!==false` — la più recente, col dato salvato |
| **Compass aperto, ma senza nessuno** | postazioni con `tocco===false`, elencate |

`tocco` **assente** (voci scritte da una versione precedente) resta fra le presidiate: è la
lettura neutra: non si sa, e non si scrive come se si sapesse.

`_qmVoceMia(key,ora)` costruisce la propria riga ed esiste **separata** apposta per essere
verificabile: dentro `_qmSegnaAggiornamento` sta oltre una lettura di rete, che la banca di
controlli non attraversa — un `tocco:true` scritto a mano lì non lo coglierebbe nessuno
(provato: il sabotaggio non falliva finché la funzione non è stata estratta).

Coperto da 22 controlli, verificati con sei sabotaggi (la propria postazione torna
nell'elenco; il vecchio formato viene buttato; l'ordine di recenza sparisce; una finestra
dimenticata si dichiara presidiata; `dato` e `tocco` buttati in lettura; il registro col solo
segnatempo non si legge più): 4, 2, 2, 1, 2 e 1 falliscono. Il registro di prova ha di
proposito l'ordine di inserimento **diverso** da quello di recenza, altrimenti il controllo
sull'ordinamento non potrebbe fallire.

Il nome della postazione **lo dà l'utente** (`qmRinominaDispositivo()`, collegamento *rinomina*
nella stessa riga): dedurlo dal browser darebbe stringhe illeggibili e per giunta sbagliate —
due Mac uguali sarebbero indistinguibili. Vive in `localStorage`, quindi è per computer.

Il segnatempo lo scrive **`kvSet` stessa** dopo una scrittura riuscita, così segue i dati veri
senza doversene ricordare in ogni punto che salva — ma **al massimo una volta ogni mezz'ora**
(`QM_AGG_OGNI_MS`): al ritmo di una per salvataggio consumerebbe più tetto giornaliero di
quanto valga. E non firma se stessa, o si rincorrerebbe.

La riga della versione **non** serve a scoprire se la pagina è vecchia: a quello pensa
`qmCheckVersione`, che ricarica da sola entro dieci minuti. Serve a sapere se una correzione
appena pubblicata è arrivata **su quella macchina** (il 06/07/2026 GitHub Pages è rimasto
bloccato due ore senza che nessuno se ne accorgesse) e a poter dire a voce quale versione gira
quando si lavora da due postazioni. Il "da quanto è aperta" oltre le 24 ore suggerisce di
ricaricare: una scheda ferma da ieri è il punto di partenza di ogni sovrascrittura.

### Consumo dell'archivio — il contatore vero di Cloudflare

Riga *"N scritture oggi su 1.000"* nello Stato del sistema: è il numero **complessivo di tutte
le postazioni**, telefoni compresi, non una stima locale. Verde sotto 500, ambra fino a 800,
rossa oltre.

**Perché serviva il totale e non il conteggio per dispositivo**: il ciclo che il 03/09/2026 ha
esaurito il tetto girava su una macchina sola, e da un'altra postazione sarebbe stato
invisibile. Un contatore locale avrebbe detto "37" mentre altrove se ne facevano 5.700.

`GET /consumo` sul Worker interroga l'**interfaccia statistiche di Cloudflare** (GraphQL,
`kvOperationsAdaptiveGroups`) in sola lettura: nessuna scrittura, nessun dato di ospiti.
Verificato funzionante sull'account del QM il 06/09/2026 (piano gratuito).

Tre variabili sul Worker, tutte da impostare a mano su Cloudflare:

| Variabile | Cos'è |
|---|---|
| `CF_API_TOKEN` | token con la sola autorizzazione `Account · Analytics · Read`, creato da Profilo → Token API. **Nessun filtro per IP**: a chiamare è il Worker dalla rete Cloudflare, non il QM |
| `CF_ACCOUNT_ID` | la stringa nella barra degli indirizzi di `dash.cloudflare.com/<qui>/workers/…` |
| `CF_KV_NAMESPACE` | l'ID di `QM_STORAGE` |

Se una manca, o il piano non espone i dati, il Worker risponde `disponibile:false` e **la riga
non compare affatto**: meglio nessun numero che uno inventato — su questa misura si erano già
prese decisioni sbagliate.

### Errori del programma — `_qmSegnaErrore()`

Quando qualcosa va storto nel codice il messaggio finisce **nella console del browser**, che
il QM non apre (giustamente): un guasto può quindi restare invisibile finché non si rompe
qualcosa di grosso, e chi lo corregge non lo vede mai. Un ascoltatore su `error` e su
`unhandledrejection` — quest'ultimo è il caso più comune in Compass, dove quasi tutto è
asincrono — tiene gli **ultimi 20 errori del giorno** in `localStorage` (nessuna scrittura sul
cloud), mostrati nello Stato del sistema con un pulsante **"copia gli errori"** per girarli a
chi deve guardarli.

Lo stesso errore ripetuto non riempie l'elenco: si tiene il conto (`×N`). I messaggi sono
tagliati a 300 caratteri — uno stack intero gonfierebbe il registro senza aggiungere nulla.

**I `catch(e){}` sparsi nel codice non passano di qui**, ed è voluto: quelli sono errori
previsti e gestiti. Qui arriva solo ciò che nessuno aveva previsto.

**Il pallino accanto alla voce di menu** (`#navStatoDot`, `qmAggiornaPallinoStato()`) è verde
solo se **tutto** è come deve essere: Worker raggiungibile, versione uguale a quella attesa,
porta dichiarata chiusa, nessuna scrittura persa e nessun errore del programma oggi. Rosso in ogni altro caso — anche per un
Worker da ripubblicare, che è comunque qualcosa da fare. Serve a notare un guasto **mentre si
sta facendo altro**: è l'unico punto fuori dalla vista che lo dice.

Scheda e pallino leggono **la stessa funzione** (`_qmStatoSistema()`): due calcoli separati
prima o poi direbbero cose diverse, e un pallino verde sopra una scheda rossa è peggio di
nessun pallino. Il giro parte all'avvio, ogni 15 minuti e al ritorno in primo piano — è una
richiesta al Worker, non una lettura KV, quindi non tocca i tetti dell'archivio.

**La versione attesa è una costante** (`WORKER_VERSIONE_ATTESA` in `app.js`): il Worker si
pubblica a mano, quindi codice e server possono divergere. Un controllo in `test/esegui.sh`
verifica che combaci con `WORKER_VERSIONE` in `worker.js` — se restasse indietro, la scheda
direbbe "da ripubblicare" anche dopo una pubblicazione fatta, cioè un allarme che suona sempre
e che si impara a ignorare. Verificato disallineandola di proposito: scatta.

**Se il Worker non dichiara `portaChiusa`** (versione precedente al 06/09/2026) la riga dice
*"non dichiarato"*, non *"aperto"*: un'assunzione scritta come un fatto è esattamente l'errore
dell'avviso pre-stay sul mittente Booking.

#### Il registro delle scritture non arrivate — sospese, non un contatore (fix 09/09/2026)

Vive **in questo browser**, per giorno (`qm_kv_fallite_<data>`): consumare una scrittura sul
cloud per dire che una scrittura non è riuscita sarebbe assurdo. Completa la fascia rossa di
`_kvRenderAvviso()`, che si vede solo mentre si è sulla pagina e sparisce al ricaricamento.

**Era un numero solo, e non tornava mai indietro.** Un intoppo alle 7 del mattino faceva dire
alla scheda *"3 dati non sono arrivati sul cloud"* fino a mezzanotte, anche dopo che quei dati
erano arrivati benissimo — e ricaricare i PDF non spegneva niente, perché **niente** lo poteva
spegnere: `_kvRiuscita` ripuliva solo `_kvFallite`, che è memoria di sessione e dopo un
ricaricamento è già vuota. Visto su iPad il 09/09/2026. Un allarme che non si spegne è un
allarme che si impara a ignorare, e questo per giunta taceva sull'unica cosa azionabile:
**quali** dati fossero rimasti indietro.

Il registro tiene ora i **nomi delle chiavi**, in due gruppi:

| Gruppo | Cosa contiene | Effetto |
|---|---|---|
| `sospese` | non ancora arrivate | è l'unica cosa che fa **rosso**, e la scheda le **elenca per nome** (`_kvNomeDato`, non la chiave grezza) |
| `risolte` | non riuscite al primo colpo e poi arrivate | resta la traccia della giornata, come nota accanto al verde — non come problema |

`_kvSegnaArrivataOggi(key)` sposta da un gruppo all'altro e viene chiamata a **ogni** scrittura
riuscita, anche in una sessione diversa da quella che ha fallito: è questo che permette
all'avviso di spegnersi ricaricando il dato. Non legarla di nuovo a `_kvFallite`.

**Un 401 non è una scrittura persa** — `_kvVaSegnalato(stato)`. Il commento lo dichiarava già
dal 03/09, ma il codice faceva `if(res.status===401)break;` e il `break` salta solo i
ritentativi: `_kvNonRiuscita` veniva eseguita comunque. Ogni dispositivo nuovo apriva quindi
Compass con una manciata di "dati non arrivati" prodotti dalle scritture tentate **prima**
dell'abilitazione — cioè da un rifiuto di cui il velo di abilitazione si occupa già.

**Il vecchio formato (un numero nudo) non viene trascinato**: non dice quali chiavi né se
siano poi arrivate, quindi terrebbe acceso un allarme su cui non si può fare nulla.

Coperto da 12 controlli, verificati con tre sabotaggi (la pulizia torna legata alla sola
memoria di sessione; il 401 conta di nuovo; il vecchio contatore viene trascinato): 5, 1 e 1
falliscono.

### Copia di sicurezza dell'archivio — Sicurezza → "Scarica copia"

**Sul cloud non esiste nessun backup.** `/kv/delete` cancella qualunque chiave e, a porta
chiusa, a poterlo fare sono i dispositivi abilitati — cioè i colleghi, per errore o per un
bug. Senza copia, mesi di dati si recupererebbero solo dal `localStorage` di una macchina che
per caso li ha ancora.

`qmEsportaArchivio()` legge tutte le chiavi note e scarica un JSON `compass-archivio-<data>`.
È **sola lettura**: non consuma nessuna delle 1.000 scritture giornaliere. Nel Pannello App
una riga dice da quanto non si fa una copia (verde entro 30 giorni, ambra oltre) — il
promemoria vive in `localStorage`, non su KV, perché serve proprio quando il cloud non c'è.

**L'elenco delle chiavi lo dà il Worker** (`GET /kv/chiavi`, dal 06/09/2026): `list()` di KV,
paginato, sotto lo stesso cancello di `/kv/*` — a porta chiusa vuole il lasciapassare. Così il
backup è completo **per costruzione**. Le operazioni di elenco hanno un tetto proprio (1.000 al
giorno): è pensato per il backup notturno, non per essere chiamato di continuo.

`QM_BACKUP_FISSE` + `qmBackupChiavi()` restano come **ripiego** (Worker più vecchio, elenco non
disponibile): non si deve restare senza copia proprio nel momento in cui la si sta facendo. Il
file salvato dichiara quale dei due elenchi ha usato (campo `fonte`). Una chiave nuova dimenticata lì è
una chiave che nel backup non c'è, e non lo si scopre fino al giorno in cui serve — per
questo `test/esegui.sh` verifica che **ogni** chiave scritta da Compass sia coperta, seguendo
tutte le strade con cui un dato finisce sul cloud: `kvSet`/`qmKvSet`/**`kvSetLocal`** con
literal o con una costante da risolvere, `LS.set`, `_qmSalvaArchivio`. Verificato togliendo
prima `qm_dvr` e poi `qm_cassa_fondo` di proposito: scatta.

**Il 06/09/2026 questo controllo ha mancato due chiavi vere**, `qm_cassa_fondo` e
`qm_cassa_incasso` — i due registri della cassa. `reception.html` li scrive con una funzione
sua (`kvSetLocal`), che la scansione non seguiva: la copia manuale del 05/09 **non conteneva i
movimenti di cassa**. Se ne è accorto solo il passaggio all'elenco del Worker (207 chiavi
contro 175). È la ragione per cui l'elenco a mano resta un ripiego e non la fonte.

**Il ripristino non è automatico**: il file si ricarica a mano, chiave per chiave (sarebbero
centinaia di scritture, da fare consapevolmente e non con un bottone).

### Backup automatico notturno su Drive — `strumenti/backup-drive.gs`

Il pulsante funziona solo se qualcuno se lo ricorda. Lo script Apps Script (nel Google del QM,
non su Cloudflare) fa la stessa cosa **ogni notte alle 3**: chiede un lasciapassare a `/auth`,
legge l'elenco da `/kv/chiavi`, scarica tutto e salva un JSON in una cartella del Drive,
tenendo le ultime 30 copie. Se fallisce **manda una mail**: un backup che smette in silenzio è
peggio di non averlo, perché si crede di avere una copia.

- **Solo letture** + una operazione di elenco: non tocca il tetto delle 1.000 scritture.
- **Il lasciapassare si rinnova a ogni giro** invece di essere salvato: dura 180 giorni, e uno
  salvato scadrebbe un giorno senza che nessuno se ne accorga.
- La cartella predefinita è **`Back-Up Compass QM`**, quella creata dal QM. Se il nome non
  combacia lo script **se ne crea una sua nella home** — ed è così che ci si ritrova due
  cartelle di backup con dentro copie diverse. Si cambia con la proprietà `QM_CARTELLA`.
- La password di Compass sta nelle **Proprietà script** del progetto Google del QM
  (`QM_PASSWORD`), mai nel file — che infatti è nel repository. Facoltative: `QM_EMAIL`,
  `QM_CARTELLA`, `QM_COPIE`.
- Le letture vanno a blocchi di 20 con `fetchAll`: una per volta su qualche centinaio di
  chiavi sfiorerebbe il tempo massimo di esecuzione di Apps Script.
- Installazione e prova: funzioni `installa` e `backupOra`, istruzioni in testa al file.
- **Lascia una traccia dentro Compass** (`qm_backup_ultimo` su KV, `segnaSuCompass()`): è
  l'unica scrittura di tutto lo script, una al giorno. Serve perché dal Pannello App non si
  distingue *"il backup non c'è"* da *"il backup c'è ma sta su un Drive che questa schermata
  non vede"* — ed è esattamente la differenza che si vuole sapere. Se quella scrittura
  fallisce il backup resta salvato: si perde solo la riga nel pannello.
- Il pannello mostra **due righe distinte**: la copia automatica su Drive (il dato che conta)
  e l'ultimo scaricamento a mano da quel browser (dice se su quella postazione c'è una copia
  raggiungibile anche a cloud spento). Ambra oltre i 3 giorni.

### Dati dell'ospite messi in pagina — `_rcPulito()`

Nomi, camere e date arrivano dal PDF del PMS e finiscono in pagina come HTML: un nome
contenente tag verrebbe interpretato invece che scritto. `rcCardHTML()` e `rcBuildPreview()`
lavorano su una **copia ripulita** dell'ospite, così ogni campo interpolato più sotto è già
innocuo. L'oggetto originale non si tocca: altrove finisce in `textContent`, dove la
ripulitura mostrerebbe `&amp;` al posto di `&`.

### Una scrittura persa lo dice a chi ha il dispositivo in mano

Le sei app (`housekeeper`, `breakfast`, `controllo-mattino`, `inventory`, `dvr`,
`reception`) mostrano una **fascia rossa in cima** quando una scrittura non arriva sul cloud:
*"restano su questo dispositivo, in albergo non li vedono"*. Sparisce da sola alla prima
scrittura riuscita. `qmAvvisoScrittura()` in ciascun file, sorvegliata da una sentinella in
`test/esegui.sh` (verificata togliendola da `dvr.html`: scatta).

**Compass non può essere avvisato dall'app, ed è un limite fisico, non una scelta**: se le
scritture non passano, non passa nemmeno la scrittura che segnalerebbe il guasto. Dal lato
Compass il sintomo si vede solo come **dati che non arrivano** — è quello che mostrano le
schede in *Applicazioni stand alone* (l'orario dell'ultimo aggiornamento per app) e il rosso
di Culligan dopo le 12.

Nasce da due incidenti reali in cui il giro era stato fatto davvero e nessuno poteva saperlo:
il 02/09/2026 (`qmKvSet` chiamava se stessa, la scrittura non partiva mai) e il 03/09/2026
(tetto giornaliero delle scritture esaurito).

### Il contatore degli accessi anonimi non serve più

`qm_auth_anon_<data>` contava le finestre da dieci minuti in cui qualcuno passava senza
lasciapassare, per decidere quando chiudere. A porta chiusa il gate risponde 401 **prima** di
contare, quindi resta fermo: da ora il segnale che qualcuno è rimasto fuori è la persona che
chiede il codice, non quel numero.

---
