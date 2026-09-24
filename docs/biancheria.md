# Biancheria — Consumo, Reso, Giacenza, Galleria

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

## Resi Biancheria — Fornitore Raimondo (view `resi-biancheria`)

### Scopo e confini

Traccia digitale della **distinta cartacea** che le housekeeper compilano ogni giorno per la biancheria macchiata/difettata da rendere al fornitore Raimondo. Deliberatamente **solo lato Compass e solo per il QM**: le HKP continuano a scrivere sul modulo cartaceo come da procedura, il QM trascrive qui e da qui genera la distinta riepilogativa A4 da far firmare a Raimondo. Nessuna app mobile per le cameriere, nessun accesso per la ditta esterna di Art Resort.

**Due strutture** (`RESI_HOTELS`): SoulArt Hotel (`sa`) e Boutique Hotel Piazza Carità (`bh`), selezionabili a linguette. **Art Resort resta fuori di proposito** — fa capo al Sig. Maddaloni, non al QM, e la sua ditta di pulizie è esterna. I due sacchi sono fisicamente distinti e si consegnano separatamente, quindi periodo aperto, totali, avviso e distinta sono **sempre di una struttura sola**.

**Voce menu**: "Messaggi Pre-stay" vive in **Operativo Quotidiano**, subito dopo Registration Cards — è un'attività quotidiana di reception, non un'impostazione. `breadcrumbs.prestay` è `'Operativo Quotidiano'`.

**Voce menu**: la voce sidebar **Reso Biancheria** vive dentro la sezione **Housekeeping** (insieme a "Operativa HKP" e "Bilanciamento Camere"), non più in una sezione "Biancheria" a sé — eliminata perché conteneva una sola voce. `breadcrumbs['resi-biancheria']` è `'Housekeeping'`.

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

## Gestione Biancheria — l'app del Resident Manager, fuori da Compass

`biancheria-galleria.html`, intitolata **Gestione Biancheria**: ciclo pulito/sporco e resi per
le due strutture che fanno capo al **Resident Manager** — **Art Resort Galleria Umberto** e
**Art Suite Santa Brigida** — cioè quelle che i moduli biancheria di Compass lasciano fuori.

### È una COPIA del modulo "Consumo Biancheria" di Compass (11/09/2026)

La prima versione era una riscrittura *semplificata*, rifatta più volte nella stessa giornata
(riquadro "Cosa fare oggi" diverso, pulito in un riquadro a parte, caselle giorno per giorno,
distinta solo la vigilia…). Il QM l'ha fermata: *"perché non fai esattamente come Compass? È più
semplice e i receptionist già conoscono il metodo. Fallo identico."*

Ora il codice della sezione `§§ BIANCHERIA` di `app.js` è **copiato così com'è** dentro la
pagina, generato con un rinomino meccanico. **Tre sole differenze**, e nessun'altra va
introdotta:

| Differenza | Perché |
|---|---|
| Prefissi `gb`/`_gb`/`GB_` al posto di `bia`/`_bia`/`BIA_` (id HTML `gb-…`) | `test/esegui.sh` carica `app.js` e questa pagina **nello stesso spazio**: due `biaRender` si sovrascriverebbero e i controlli di Compass girerebbero sulla copia senza accorgersene. Un controllo verifica che `BIA_HOTELS` e `GB_HOTELS` restino distinti |
| **Due calendari**: `GB_GIORNI_H={ar:[1,3,5],sb:[2,4,6]}` | In Compass SoulArt e Boutique passano insieme (mar/gio/sab). Qui Art Resort lun/mer/ven, Santa Brigida mar/gio/sab. `_gbGiornoGiro(d,h)`, `_gbVigiliaGiro(d,h)`, `_gbGiroCalPrec(d,h)` prendono la struttura (senza, vale quella selezionata); `_gbPeriodo` passa la sua |
| **Niente cloud**: `_gbLeggi`/`_gbScrivi`/`_gbKvGet`/`_gbKvSet` al posto di `_qmLeggiArchivio`/`_qmSalvaArchivio`/`kvGet`/`kvSet` | Solo `localStorage` (`bg_biancheria`, `bg_distinte`). Anche `cqConferma`/`cqAvviso` e `_psSenzaSalto` hanno una versione locale (`confirm`/`alert`, scorrimento della finestra) |

Tolto il promemoria dell'Overview (`biaRenderPromemoria`), che qui non ha dove stare.

**"Ultimi consumi inseriti" sta subito sotto "Consumi giornalieri dai fogli camera"** (richiesta
del QM, 12/09/2026): in Compass è in fondo alla pagina. È uno spostamento del blocco dentro
`_gbRenderCore`, il contenuto è identico.

**`gbSetHotel` svuota la data della consegna**, unica riga in più rispetto a `biaSetHotel`. Il
modulo di Compass rilegge la data dal campo, che sopravvive al ridisegno: con un calendario solo
va bene, con due no — passando da Art Resort (giro oggi) a Santa Brigida (giro domani) restava la
data di Art Resort, e al posto di *"Prepara il ritiro di domani"* compariva il giro sbagliato.

**Anche l'aspetto è quello di Compass.** I token di `:root` (colori, `--fs-*`, `--text-dim` e
`--text-muted` — che nella prima versione erano **invertiti** rispetto a Compass) e le regole
`.panel`/`.panel-header`/`.panel-title`/`.panel-body` sono copiati da `style.css`. Le regole
generiche della vecchia versione (`table`, `th`, `td`, `input`, `label.f`, `.row`, `.btn`,
`.avviso`, `.nota`…) valevano per tutta la pagina e deformavano le tabelle copiate da Compass,
che lì sono stilate in linea: ora sono limitate a `#gb-extra` (la copia di sicurezza).

**Due scostamenti voluti, per lo stesso motivo**: *Consegne di Raimondo*, *Pezzi non rientrati* e
*Ultimi consumi inseriti* in Compass compaiono solo quando ci sono dati — e lì ci sono sempre,
perché SoulArt li ha. Qui l'app parte vuota, e un riquadro assente è un riquadro che chi arriva
da Compass cerca e non trova (*"manca questo"*, 11/09/2026). Si mostrano quindi anche vuoti,
con una riga che dice perché.

**Correggendo una delle due copie, va corretta anche l'altra.** È già successo di dimenticarlo:
il riallineo dei totali congelati (*Riallinea ai consumi* / *Va bene così*, 19/09/2026) era
entrato solo in Compass ed è stato portato nella Galleria il 23/09/2026, con lo stesso rinomino
meccanico applicato al diff del commit. Il modo più sicuro è rigenerare
la copia dallo stesso rinomino (sostituzioni `\b_bia`→`_gb`, `\bbia(?=[A-Z])`→`gb`,
`\bBIA_`→`GB_`, `\bbia-`→`gb-`, più i servizi elencati sopra e le righe dei calendari),
invece di ritoccarla a mano.

### Cosa c'è in più rispetto a Compass — e cosa NO

- `gbRender()` è un involucro: chiama `_gbRenderCore()` (il `biaRender` di Compass, che riempie
  `#gb-content`); `#gb-extra` è vuoto dal 12/09/2026.
- **Niente pezzi inidonei** (tolti l'11/09/2026 su richiesta del QM): in Galleria la procedura
  di reso si fa **a mano, su carta**. Non reintrodurre il riquadro né la loro distinta. I resi
  eventualmente salvati dalla versione precedente vengono lasciati cadere alla lettura.

### I dati della versione semplificata si leggono ancora

`_gbMigra`: quella versione chiamava i giri `consegne` e teneva le distinte stampate dentro
l'archivio (`distinte:{…:{ts,q}}`). Alla lettura le consegne diventano `giri` e le distinte
passano in `bg_distinte`; anche una copia di sicurezza di quella versione si ricarica.

### I dati stanno sul cloud di Compass, con un codice che apre SOLO la Galleria (12/09/2026)

Fino all'11/09/2026 i dati stavano solo nel `localStorage` del browser. Il QM ha deciso di no:
in Galleria l'app deve girare su **due PC**, e dati locali vogliono dire due archivi che non si
parlano, nessun backup notturno, e niente di visibile da Compass.

| Pezzo | Dove | Cosa fa |
|---|---|---|
| Codice `bg.<scadenza>.<firma>` | `firmaPassBg`/`verificaPassBg` in `worker.js` | firmato con `QM_AUTH_SECRET` come il lasciapassare di Compass, ma su `"bg."+scadenza`: uno non si spaccia per l'altro. Dura un anno |
| `permessoGalleria(percorso,chiave)` | `worker.js`, nel cancello di `/kv/` | il codice della Galleria apre **solo** `/kv/get` e `/kv/set` su chiavi `^bg_[A-Za-z0-9_]+$`. Niente elenco, niente cancellazioni, niente proxy AI, niente `qm_*` (ospiti, turni, cassa, dipendenti). Vale anche a porta aperta |
| `POST /auth/galleria` | Worker | rilascia un codice della Galleria a chi ha il lasciapassare di Compass |
| `POST /auth/galleria/rinnova` | Worker | rinnova un codice della Galleria valido; l'app lo chiama da sola a meno di 90 giorni dalla scadenza (`_gbRinnova`) |
| **Copia codice Galleria** | Compass → Pannello di Controllo → Sicurezza (`qmCodiceGalleria`) | chiede il codice al Worker e lo copia. Ogni pressione ne genera uno nuovo, tutti validi |
| Schermata di abilitazione | `gbMostraAttivazione`/`gbAbilita` | velo navy come nelle app di Compass: si incolla il codice una volta per PC, nessuno digita password. Ricompare se il Worker risponde 401 |

**Salvataggio come in Compass**: `_gbScrivi` rilegge, fonde (`_gbFondi`/`_gbUnisci`: unione per
`id`, a parità vince questa postazione, gli id in `_rimossi` non tornano) e scrive; senza aver mai
letto il cloud nella sessione **non scrive**. `_gbLeggi` fonde cloud e copia locale, e se la copia
locale ha qualcosa che il cloud non ha lo rimanda su — è così che i dati inseriti col vecchio
salvataggio locale arrivano sul cloud alla prima apertura. Il `localStorage` resta come copia di
questo browser. L'esito di ogni salvataggio sta in alto a destra; se non arriva sul cloud lo dice
in rosso. **Revoca**: come per Compass, cambiando `QM_AUTH_SECRET` (fuori tutti).

`_gbGiro()` rilegge ogni minuto, a scheda visibile e mai mentre si scrive in una casella: è così
che i due PC si vedono a vicenda. Le distinte stampate (`bg_distinte`) viaggiano allo stesso modo.

**Il QM entra senza codice della Galleria** (12/09/2026): `_gbPass()` ripiega sul lasciapassare di
Compass (`qm_pass`, stesso sito e quindi stesso `localStorage`), che apre tutto l'archivio. Serve
per controlli e supporto. La pagina lo **legge** soltanto; la sentinella in `esegui.sh` vieta di
scrivere chiavi `qm_*`, non di leggere questa. Scheda **Gestione Biancheria** in *Applicazioni
stand alone* (`miniappBgStatus`): data degli ultimi consumi per struttura, ambra se una delle due è
ferma da più di due giorni. La scheda è identica alle altre (classe `panel miniapp-card`) e ha
**l'interruttore acceso/spento**, che però scrive **`bg_app_status`** (`{attiva:false}`) e non
`qm_app_status`: col suo codice la Galleria non può leggere chiavi `qm_*`. L'app lo controlla
all'avvio e a ogni giro (`_gbControllaStato`) e mostra la stessa schermata di manutenzione delle
altre app; se la rete manca resta utilizzabile.

Le chiavi restano `bg_*`, mai `qm_*`. Due sentinelle in `test/esegui.sh`: la pagina non chiede
elenco né cancellazioni né chiavi `qm_`, e `worker.js` contiene ancora `permessoGalleria` con la
sua espressione. `bg_biancheria` e `bg_distinte` entrano nel **backup notturno su Drive** senza
toccare niente, perché il backup prende l'elenco completo da `/kv/chiavi`.

**La copia di sicurezza (scarica/ricarica un file) è stata tolta** il 12/09/2026, su richiesta
del QM: coi dati sul cloud la rete è il backup notturno su Drive. `vBackup`, `bgScarica` e
`bgRicarica` non esistono più; `#gb-extra` resta vuoto, pronto per eventuali riquadri propri.

### Veste

Splash identico alle altre app (bussola, *Compass QM*, **Gestione Biancheria** e le due
strutture su una riga, separate da un trattino). **Parte a ogni apertura** — da un link o dai
preferiti, anche nella stessa scheda — e **non** quando si ricarica col pulsante del browser
(richiesta del QM, 12/09/2026; la prima versione lo mostrava una volta per scheda). Il
ricaricamento si riconosce da `performance` (`type==='reload'`); l'aggiornamento automatico,
che è una redirezione `?v=` e quindi una navigazione `navigate`, segna prima `bg_splash`=`salta`
in `sessionStorage` e lo splash lo consuma. Riga di paternità in fondo alla pagina,
non sul foglio stampato: la distinta va a Raimondo, che è esterno. Le variabili `--fs-xxs`,
`--fs-xs`, `--fs-sm` e la classe `.panel-header` sono definite nel `<style>` della pagina perché
il codice copiato da Compass le usa.

### Controlli

`test/galleria.js` (≈40): nomi distinti da Compass, due calendari, periodo col calendario
della struttura giusta, zero mai inserito, atteso e saldo, lettura della versione semplificata,
**`permessoGalleria`** (cosa apre il codice della Galleria) e **fusione fra i due PC**
(`_gbFondi`, `_gbSegnaRimosso`). Il resto del comportamento è quello di Compass ed è coperto dai
suoi controlli in `test/controlli.js`. Sentinelle in `test/esegui.sh`: la pagina non chiede
elenco né cancellazioni né chiavi `qm_*`, non **scrive** chiavi `qm_*` in `localStorage` (leggere
`qm_pass` è ammesso), `worker.js` contiene ancora `permessoGalleria`, splash deciso da
`sessionStorage`, aggiornamento automatico al suo posto.

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

### Ma un totale congelato SBAGLIATO va potuto correggere (19/09/2026)

Il congelamento è giusto, e non si tocca. Il problema è cosa succede quando il numero
congelato nasce da un **refuso**: resta il *doveva portare* di tutte le consegne
successive, e inventa un ammanco che nessuno riesce a spiegare.

Caso reale, Boutique: la consegna del 17/09 era stata registrata con **123** asciugamani
bidet invece di **24**. Il QM ha rifatto i consumi del 15 e del 16 — e il 123 è rimasto lì.
Giustamente, per la regola sopra. **Ma dalla maschera non c'era nessun modo di
correggerlo**: selezionando la data di un giro già registrato, la casella *tot pezzi da
dargli* mostra il valore **congelato** e non quello ricalcolato, quindi «Aggiorna giro»
risalvava lo stesso numero sbagliato. Un vicolo cieco.

**Non si riallinea da solo**, e non è pigrizia: il totale può legittimamente differire dai
consumi — la maschera stessa dice *"correggilo solo se il sacco contiene qualcosa di
diverso"*. Si **segnala** e si riallinea su richiesta.

| Pezzo | Ruolo |
|---|---|
| `daiConsumi` | la somma calcolata **al momento della registrazione**, salvata accanto a `consegnato`. Non entra in nessun conto: serve solo a distinguere un refuso da una scelta |
| `_biaSommaDelGiro(g)` | la somma che quel periodo dà **oggi** |
| `_biaScostamento(g)` | `null` se allineato o se non c'è niente da dire, altrimenti le voci che non tornano |
| `_biaApplicaRiallineo(g,sc)` | `consegnato` ← i consumi correnti, con traccia in `edits` |
| `_biaApplicaConferma(g,sc)` | *"va bene così"*: **non** tocca `consegnato`, registra solo contro quali consumi è stato verificato |
| `_biaBoxScostamento(g,sc,titolo)` | l'unico riquadro d'avviso, per tutti i punti che lo mostrano |

**Quando si segnala** — `consegnato` diverso dalla somma di oggi **e** (`daiConsumi`
assente **oppure** uguale a `consegnato`):

| `daiConsumi` | Significa | Avviso |
|---|---|---|
| uguale a `consegnato` | registrato col valore calcolato → **i consumi sono stati corretti dopo** | sì, e lo dice come un fatto |
| diverso da `consegnato` | qualcuno l'ha scritto a mano di proposito | **no**: non c'è niente da segnalare |
| assente (giri registrati prima del 19/09/2026) | non si sa | sì, ma **senza dichiarare quale delle due cose sia** — un'ipotesi non si scrive come un fatto |

**«Va bene così» esiste perché l'avviso deve potersi spegnere.** Scrive `daiConsumi` = la
somma attuale, che per costruzione è diversa da `consegnato`: da lì in poi quel giro ricade
nella riga "scritto a mano". Senza, un totale legittimamente diverso resterebbe segnalato
per sempre — e un avviso che non si spegne è un avviso che si impara a ignorare.

**Si segnala in tre punti, perché il difetto si manifesta in due colonne diverse:**

1. sulla consegna aperta nella maschera (colonna *tot pezzi da dargli*);
2. sulla consegna **precedente**, che è quella che riempie il *doveva portare* — ed è lì
   che il numero sbagliato si **nota**, mentre la causa sta nel giro prima. È il punto che
   risolve il caso reale: il QM guardava il 19/09 e non aveva modo di sapere che il colpevole
   era il 17;
3. nello storico: una **`!`** ambra accanto a *usciti quel giorno*, anche a riga chiusa —
   un totale che non torna sta in fondo all'elenco e nessuno aprirebbe sette righe per
   cercarlo. Il dettaglio e i due pulsanti restano dentro, dove c'è lo spazio per spiegare.

Il riallineo **chiede sempre conferma** mostrando voce per voce cosa cambia (un giro chiuso
può essere stato firmato) e lascia una riga in `edits`, come la cassa e i resi: mai una
sovrascrittura muta.

**Le due mutazioni stanno fuori** dalle funzioni che chiedono conferma e salvano
(`biaRiallineaGiro` / `biaConfermaGiro`): là dentro, oltre a una finestra e a una chiamata
di rete, i controlli non arrivano — e un riallineo che smettesse di toccare `consegnato`,
limitandosi a spegnere l'avviso, passerebbe inosservato. Stessa ragione per cui esiste
`_qmVoceMia`.

Coperto da **21 controlli** in `test/controlli.js` ("Biancheria: un totale congelato
sbagliato si può riallineare"), verificati con cinque sabotaggi (`daiConsumi` ignorato;
scostamento mai visto; il giorno del giro rientra nel periodo; il riallineo non tocca
`consegnato`; «va bene così» lo tocca): 2, 5, 6, 2 e 1 falliscono.

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

### `kvGet` era chiamata ma non esisteva (07/09/2026)

**Il difetto più insidioso trovato finora.** `kvGet(key)` era usata in tre punti — le distinte
biancheria (`_biaDistCarica`, `_biaDistSegna`) e l'archivio colazioni
(`bkfSaveMonthlyHistory`) — ma **non era mai stata definita**. Ogni chiamata lanciava un
`ReferenceError` che il `try/catch` attorno inghiottiva, quindi:

- le distinte segnate su una postazione **non arrivavano mai** sulle altre — il sintomo che ha
  fatto scoprire tutto: una distinta stampata dal Mac dell'hotel lasciava il promemoria acceso
  a casa;
- `bkfSaveMonthlyHistory` ricadeva ogni volta sul ramo `catch`, cioè leggeva l'archivio
  colazioni **da localStorage invece che da KV**, esattamente il contrario di quanto dice il
  suo commento (*"Sempre KV-first: evita di sovrascrivere history da altri dispositivi"*).

Nessun errore a schermo, nessuna traccia: il `catch` che doveva proteggere da un problema di
rete nascondeva un errore di programmazione. È la ragione per cui dal 06/09 gli errori non
gestiti finiscono nello Stato del sistema — ma questo era *gestito*, e quindi invisibile
anche a quello.

**Regola che ne esce**: un `try/catch` attorno a una chiamata di rete deve avvolgere **solo**
la chiamata, non anche il nome della funzione. E un controllo in `test/controlli.js` verifica
ora che le funzioni di archivio esistano davvero (`typeof kvGet === 'function'`).

### Parole della vista Biancheria (07/09/2026)

Nei testi mostrati si dice **consegna**, non "giro", e **tot pezzi**, non "sacchi": il giro è
quello del Culligan, e i sacchi non si contano — si contano i pezzi, ed è quello che finisce
sulla distinta. Il pannello dello storico si chiama **"Consegne di Raimondo"** (era "Cosa ha
portato Raimondo") e sta **sopra** "Pezzi non rientrati": prima si guarda cosa è successo
consegna per consegna, poi il totale che ne deriva — al contrario si legge un numero senza
sapere da dove viene, ed è il numero che spinge a contestare qualcosa al fornitore. I nomi nel codice (`_biaGiri`, `giri`, `biaToggleGiro`) **non** sono stati
rinominati: cambiarli avrebbe toccato la forma dei dati salvati su KV per una questione di
parole.

**Il promemoria "stampa la distinta" ora dice per chi e per quando** — struttura e data della
consegna — e porta il collegamento *"L'ho già stampata"* (`biaSegnaDistintaFatta`). La stampa
si segna per `hotel|data` (`qm_bia_distinte`): se la distinta è stata stampata da un'altra
postazione, o su carta, il promemoria resterebbe acceso per sempre, e un avviso che non si
spegne è un avviso che si impara a ignorare.

### Uno zero mai inserito NON è uno zero (07/09/2026)

Il giro del 20/08/2026 mostrava *"ha portato 0"* perché quel giorno nessuno aveva registrato
cosa riportava Raimondo. La riga **affermava una cosa falsa** — che non avesse portato niente —
e con essa cadeva la credibilità del saldo: *"se il primo dato è sbagliato, perché dovrei
fidarmi del −306?"*.

`_biaRegistrato(g)` guarda se `ricevuto` esiste **e se il totale è maggiore di zero**.

Il primo tentativo controllava solo che ci fossero delle voci, e **non bastava**: il modulo
salva tutte e sette le tipologie, quindi un giro mai compilato arriva con sette zeri dentro,
indistinguibile da uno zero vero. La regola giusta la dà la realtà del servizio: **un giro in
cui Raimondo non riporta niente non esiste**, perché quello che prende deve riportarlo. Un
totale a zero significa quindi *"nessuno ha scritto cosa ha riportato"*.

Se un giorno capitasse davvero un giro a vuoto, comparirebbe come non registrato e andrebbe
annotato a parte: è un caso così raro che conviene trattarlo a mano, invece di lasciare che
sette zeri silenziosi inventino un ammanco di centinaia di pezzi.

Un giro non registrato:
- mostra **"non registrato"** in ambra al posto del totale, e *"fuori conteggio"* al posto della
  differenza — la riga resta visibile, perché nasconderla sarebbe peggio;
- **resta fuori** da `_biaRiepilogoPortato`, `_biaSaldo`, `_biaTotPerVoce` e `_biaAndamento`:
  tutti e quattro, altrimenti i numeri del pannello divergerebbero fra loro;
- viene **dichiarato** nell'intestazione della struttura (*"1 senza il dato di cosa ha
  riportato, esclusi dal conto"*), così il saldo dice su cosa è calcolato.

Coperto da 9 controlli, verificati sul caso reale: senza l'esclusione il saldo sarebbe −110
invece di −10, cioè un ammanco inventato di cento pezzi.

### Lo storico è una TABELLA, non un elenco di frasi (07/09/2026)

Ogni giro era una riga di prosa con dentro cinque numeri — *"05/09/2026 ha portato 209 su 207
attesi — i sacchi del 03/09/2026 +2"* più una seconda riga grigia e tre pulsanti: otto giri
così sono un muro di testo, e i numeri non si confrontano fra loro perché non sono incolonnati.

Ora è una tabella: `Giro · Ha portato · Doveva · Differenza · Usciti quel giorno`. Stessi dati,
stessa logica, ma si leggono in colonna. Le azioni non gridano più: il dettaglio per tipologia
si apre da una freccia, la ristampa è un'icona, e **"elimina" sta dentro il dettaglio aperto**,
non fra i pulsanti che si premono tutti i giorni — un'azione irreversibile non va messa a un
clic di distanza fra due che si usano di continuo.

La frase *"i sacchi dati a lui quel giorno tornano al giro dopo"* è ora nel dettaglio: era
ripetuta identica su ogni riga e occupava metà pannello per dire una cosa che si impara una
volta sola.

**Attenzione ai controlli**: contavano le righe cercando *"sacchi dati a lui quel giorno"*, che
non compare più in ogni riga. Ora contano l'icona di ristampa (una per riga).

**Niente più fisarmonica** (07/09/2026): il pannello *Consegne di Raimondo* e quello dei consumi
recenti sono **sempre visibili**. Erano chiusi per difetto "perché servono solo per controllare
o ristampare", ma sono la cosa che si apre ogni volta: tenerli chiusi voleva dire due clic in
più ogni giorno per arrivare al motivo per cui si è entrati nella pagina. Rimossi
`_biaStorico` e `biaToggleStorico`.

Il pulsante **"Report per la direzione"** è passato nell'intestazione delle Consegne, dove è in
contesto: prima stava sopra un titolo che non lo riguardava, accanto alla fisarmonica.

### "Ultimi consumi inseriti": gli ultimi 14, oppure tutti (23/09/2026)

Il riquadro mostra i 14 consumi più recenti della struttura; **"Mostra tutti (N)"** li apre
tutti, divisi per mese (`_biaConsumiTutti`, `biaToggleConsumiTutti`, `BIA_CONSUMI_VISTI`). Serviva
per ritrovare e correggere consumi di più di due settimane prima. Stessa cosa nella Galleria.

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

**Il modello è CONFERMATO** (07/09/2026, dal QM): *"quello che prende deve riportare"* —
Raimondo non riporta in due volte. Quindi `atteso(N) = consegnato(N−1)` è la regola giusta, e
**il saldo negativo è merce che manca davvero**, non uno sfasamento fra un giro e l'altro.

Era rimasto come dubbio aperto dal 03/09: se la resa fosse avvenuta in due passaggi, tutte le
differenze sarebbero state da ricalcolare. Non è così — non riaprire la questione senza un
fatto nuovo dal fornitore.

Sui dati reali di SoulArt il cumulato è **−306 pezzi su 7 giri confrontabili**: è un ammanco
da contestare, e il dettaglio *"Cosa porta, per tipologia"* dice su quali articoli si
concentra — che è ciò che serve per farlo.

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
| `biaRegistraGiro()` | Registra/aggiorna il giro congelando `consegnato` (e salvando `daiConsumi`) |
| `_biaSommaDelGiro(g)` | Quanto darebbero **oggi** i consumi di quel periodo |
| `_biaScostamento(g)` | Le voci in cui il totale congelato non corrisponde più — vedi sopra |
| `biaRiallineaGiro(id)` / `biaConfermaGiro(id)` | Riallinea ai consumi, oppure tiene il totale e spegne l'avviso |
| `biaPrintDistinta(giroId)` | Distinta A4 di consegna; senza id usa il form corrente |

---

### Le etichette del menu sono cambiate, le chiavi NO (07/09/2026)

| Voce di menu | Era | Vista (chiave) | Sezione in `app.js` |
|---|---|---|---|
| **Consumo Biancheria** | Gestione Biancheria | `biancheria` | `§§ BIANCHERIA` |
| **Reso Biancheria** | Resi Biancheria | `resi-biancheria` | `§§ RESI BIANCHERIA` |
| Giacenza Biancheria | — | `giacenza` | `§§ GIACENZA BIANCHERIA` |

**Si è rinominata solo l'etichetta**: `pageTitles` in `app.js` e il testo della voce in
`index.html`. Gli id delle viste, i `breadcrumbs`, i nomi delle sezioni `§§`, le chiavi KV
(`qm_biancheria`, `qm_resi_biancheria`) e i prefissi delle funzioni (`bia*`, `resi*`)
**restano quelli**. Non sono nomi, sono chiavi: `qm_last_view` in `localStorage` ricorda
l'ultima vista aperta su ogni postazione, e rinominarla farebbe ripartire tutti da capo;
`_qmRidisegnaVista` e `setView` le confrontano per stringa.

Chi rinomina di nuovo deve toccare **due punti** e tenerli allineati a mano — non c'è una
fonte unica: la voce in `index.html` e `pageTitles` in `app.js`.

---

## Giacenza Biancheria — magazzino e pezzi in mano alle cameriere (view `giacenza`)

`§§ GIACENZA BIANCHERIA` in `app.js`, chiave KV `qm_giacenza`, voce di menu **Housekeeping →
Giacenza Biancheria**.

### Non confondere i tre moduli biancheria

| Modulo | Vista | A cosa risponde |
|---|---|---|
| **Consumo Biancheria** | `biancheria` | il giro del fornitore: pulito che entra, sporco che esce |
| **Reso Biancheria** | `resi-biancheria` | i pezzi inidonei (macchiati, strappati) resi a Raimondo a parte |
| **Giacenza Biancheria** | `giacenza` | quanto c'è **nel magazzino dell'albergo** e **chi ne ha in mano** |

Il problema che risolve: la biancheria si preleva dal magazzino a mani nude, senza che resti
traccia di chi ha preso cosa. Quando i conti non tornano non c'è modo di dire se manca
davvero qualcosa o se è semplicemente ancora su un carrello.

### Modello dati

```js
qm_giacenza = {
  movimenti: [{id, ts, hotel:'sa'|'bh', data:'dd/MM/yyyy',
               tipo:'prelievo'|'restituzione'|'conteggio',
               persona, q:{voce:qta}, atteso:{voce:qta}|null, nota, edits:[]}],
  tipologie: null,   // null = GIAC_VOCI_DEFAULT
  _rimossi: []
}
```

**Un movimento porta più voci insieme**: una cameriera non prende una federa alla volta,
carica il carrello. Stessa forma dei consumi giornalieri della biancheria.

### Il magazzino si ANCORA all'ultimo conteggio, non è un numero che si digita

Stesso schema del fondo cassa di reception: `_giacMagazzino(h)` riparte sempre
dall'**ultimo conteggio fisico registrato** e applica i movimenti successivi. Il conteggio
salva anche `atteso` (quanto ci si aspettava di trovare), così la differenza resta nello
storico — spiegata o no — e il valore contato diventa la nuova base. Senza quell'ancoraggio
il calcolo divergerebbe subito dallo scaffale.

**Finché non si è mai contato il numero NON si mostra** (`contato:false`): sarebbe solo
"restituito meno prelevato", cioè quasi sempre un negativo che sembra un guasto. La colonna
«In magazzino» resta a trattini e una riga sotto la tabella spiega perché — i trattini da
soli sembrerebbero un guasto. *In mano alle cameriere* resta invece valido: non dipende dal
conteggio dello scaffale.

### Niente card in cima: ripetevano la tabella (07/09/2026)

La vista apriva con tre `.kpi-card` — *In magazzino · In mano alle cameriere · Giacenza
totale* — che mostravano **esattamente** i tre numeri della riga `Totale` della tabella
*Giacenza per tipologia* poco più sotto: gli stessi tre valori due volte nella stessa
schermata. Tolte su richiesta del QM.

L'unica cosa che dicevano e la tabella no — che il magazzino **non è mai stato contato** —
è ora una riga ambra sotto la tabella, cioè accanto ai trattini che ha il compito di
spiegare. Se un domani si rimettono delle card in cima, **non ripetere quel totale**: se
serve un riepilogo a colpo d'occhio, deve dire qualcosa che la tabella non dice già.

**Ordine dei pannelli** (07/09/2026): *Giacenza per tipologia* sta **sopra** *Chi ha pezzi
in carico*. Tolte le card, la prima cosa a schermo era l'elenco delle cameriere con un
carico aperto — un dettaglio — mentre la domanda con cui si apre la pagina è *quanto c'è*.
Il carico resta subito sotto, dove risponde alla domanda successiva (*e dov'è il resto*).

### I quattro tipi di movimento — e perché «Aggiunta» non è una restituzione (07/09/2026)

| Tipo | Magazzino | Carico di una persona | Quando |
|---|---|---|---|
| **Prelievo** | −1 | lo **apre** | una cameriera porta via dei pezzi |
| **Restituzione** | +1 | lo **chiude** | riporta quelli che aveva preso |
| **Aggiunta** | +1 | **nessuno** | pezzi nuovi: acquisto, consegna del fornitore, materiale ritrovato |
| **Conteggio** | fa da **ancora** | nessuno | si conta lo scaffale |

L'ordine delle chiavi di `GIAC_TIPI` **è** l'ordine dei pulsanti nella maschera: Aggiunta
sta fra Restituzione e Conteggio.

**Aggiunta e Restituzione fanno la stessa cosa al magazzino (+1) e non sono la stessa
cosa.** Prima che Aggiunta esistesse, per registrare della merce nuova bisognava per forza
intestare una restituzione a qualcuno — e quel qualcuno si ritrovava un **carico negativo**,
cioè un ammanco inventato in una pagina che esiste proprio per stabilire se manca qualcosa.

**Il carico si decide su `carico`, NON sul segno** (`_giacCarico`). Col segno, un'aggiunta
sarebbe indistinguibile da una restituzione e accrediterebbe a una persona pezzi che non ha
mai preso. Per la stessa ragione `persona` non viene nemmeno salvata sui tipi che non ne
hanno una (`GIAC_TIPI[tipo].persona` decide insieme se il campo compare, come si chiama, e
se il nome finisce nel movimento): un nome su un'aggiunta sarebbe un carico fantasma il
giorno in cui qualcuno cambiasse quella regola.

Aggiungendo un tipo nuovo, i tre campi da compilare sono quelli: `segno` (magazzino),
`persona` (etichetta o `null`), `carico` (apre/chiude un carico). Nessun `if` sul nome del
tipo sparso per la vista.

### Il segno del carico è ROVESCIATO rispetto a quello del magazzino

`GIAC_TIPI[t].segno` è il segno del **magazzino** (un prelievo lo svuota, `-1`). Sul carico
della persona vale l'opposto: quello che esce dallo scaffale finisce nelle sue mani, quindi
`_giacCarico` usa `-segno`. **Non è un refuso** — è l'errore che i controlli hanno colto
alla prima esecuzione, con tutti i carichi negativi.

Per la stessa ragione **un conteggio del magazzino non azzera i carichi aperti**: contare
lo scaffale dice quanti pezzi ci sono *lì*, non quanti ne ha ancora Anna sul carrello.
Azzerarli a ogni inventario cancellerebbe proprio il dato che la pagina esiste per tenere.

### `apertoDa` non è la data dell'ultimo prelievo

È il giorno in cui il carico di quella persona è passato da zero a qualcosa e **non è più
tornato a zero**; torna `null` appena riporta tutto. È l'unica cosa azionabile — *"in
sospeso da N giorni"* — mentre la data dell'ultimo prelievo direbbe il contrario proprio
quando serve di più (chi preleva ogni giorno sembrerebbe sempre a posto). Oltre
`GIAC_GG_APERTO=3` giorni la riga è segnata in ambra.

Un carico **negativo** (ha riportato più di quanto risulta preso, di solito un prelievo mai
registrato) è verde e non rosso, e la riga lo dice a parole: non è un ammanco. Stessa scala
del rientro in più nello storico della biancheria.

### UNA struttura sola — `GIAC_HOTELS` non è più un alias di `BIA_HOTELS` (07/09/2026)

Il magazzino biancheria esiste **solo al SoulArt**: al Boutique non c'è, quindi la linguetta
per sceglierlo mostrava una vista che non descriveva niente. Tolta su richiesta del QM,
insieme al selettore di struttura in `giacRender()` e a `giacSetHotel()`.

`const GIAC_HOTELS={sa:BIA_HOTELS.sa}` — il **nome** continua a venire da `BIA_HOTELS`,
così la stessa struttura non si chiama in due modi in due pannelli, ma l'elenco no: consumi
e resi restano su due strutture, la giacenza su una. Non "ripristinare l'alias" credendolo
una svista.

**I movimenti salvati con `hotel:'bh'` continuano a essere letti**, non scartati: `_giacH` e
tutti i calcoli filtrano già per struttura, e nessuno ne scrive più. Se un domani il
Boutique aprisse un suo magazzino, basta rimetterlo in `GIAC_HOTELS` e ricompare tutto —
per questo i controlli sull'isolamento fra strutture (`hotel:'bh'` che non tocca il SoulArt)
sono rimasti al loro posto.

Il nome della struttura resta nell'intestazione della vista e **sul foglio stampato**, dove
serve a chi lo tiene in mano.

### Le voci sono quelle dei fogli camera, e chi esce dall'elenco non perde i suoi pezzi

`GIAC_VOCI_DEFAULT = BIA_VOCI` — le stesse sette: giacenza, consumi e giro devono parlare
degli stessi pezzi, altrimenti i tre pannelli non si confrontano. **Non** è
`RESI_TIPOLOGIE_DEFAULT`, che è più lungo di proposito.

L'elenco è modificabile dalla vista (il magazzino può contenere coprimaterassi o tappetini
che sul foglio camera non compaiono) e finisce in `tipologie`. I movimenti sono indicizzati
per **nome** della voce: riordinare è innocuo, **rinominare orfana** i pezzi salvati sotto
il vecchio nome. `_giacVociUsate` rimette in fondo alla tabella, marcate `fuori elenco`, le
voci uscite che hanno ancora pezzi da qualche parte: **escono dalla maschera, mai dai
totali**. Salvando un elenco che ne toglie una con pezzi, la conferma lo dice prima.

### Chi preleva: elenco aperto, non fisso

`_giacPersone()` mette insieme tre fonti — organico `DEPTS.hk.members`, nomi del turno
caricato, nomi già usati in questo registro — e il campo resta comunque a **testo libero**:
il personale HK cambia ogni settimana (extra e interinali) e una cameriera nuova non deve
poter bloccare un prelievo perché non è in nessun elenco. Dal turno si prendono solo i nomi
che non appartengono a un altro reparto: il planning li contiene tutti, e ricevimento,
colazioni e manutenzione non prelevano biancheria.

### Cambiare persona NON ridisegna la maschera

`giacSetPersona` aggiorna **solo** le caselle e i suggerimenti (`giacAggiornaCarico`).
Rigenerare l'HTML mentre si compila fa perdere quel che si è digitato — stessa lezione della
casella "Ricevuto" in Biancheria e della vista pre-stay. Per lo stesso motivo la data va
riletta dal campo prima di ogni ridisegno, altrimenti qualunque giorno selezionato tornerebbe
a oggi.

In una **restituzione** le quantità si precompilano con quello che la persona ha in mano: il
caso normale è che riporti tutto, e proporlo evita di ridigitare sette numeri. Resta
correggibile — capita che ne riporti solo una parte.

### Un prelievo che sfora il magazzino si AVVISA, non si blocca

Il conteggio può essere vecchio e i pezzi sullo scaffale esserci davvero: impedire di
registrare un prelievo reale vorrebbe dire perdere proprio il dato che la pagina raccoglie.
La conferma dice voce per voce quanti ne risultano, e si registra lo stesso.

### Correzioni ed eliminazioni

`giacCorreggi(id,voce)` cambia una quantità e **aggiunge sempre una riga a `edits[]`** con
vecchio, nuovo e motivo — mai una sovrascrittura silenziosa, come la cassa e i resi; lo
storico mostra `corretto N×`. `giacEliminaMovimento` è invece una rimozione definitiva e
chiama `_qmSegnaRimosso` **prima** di salvare: senza, la fusione col cloud rimetterebbe
dentro il movimento al primo giro (è il difetto che `resiDelRow` si era dimenticato).

### Funzioni

| Funzione | Scopo |
|---|---|
| `giacLoad()` / `_giacSave()` | Fusione con il cloud via `_qmLeggiArchivio` / `_qmSalvaArchivio` |
| `_giacMov(h)` | Movimenti della struttura in ordine di **registrazione** (`ts`), non di data |
| `_giacMagazzino(h)` | `{q, contato, data}` — ancorato all'ultimo conteggio |
| `_giacCarico(h)` | Per persona: `{q, tot, ultimo, apertoDa}` |
| `_giacCaricoTot(h)` | Lo stesso sommato su tutte le persone |
| `_giacVociUsate(h)` | Elenco corrente + le voci fuori elenco che hanno ancora pezzi |
| `_giacPersone()` | Organico + turno + nomi già usati |
| `giacSalvaMovimento()` | Legge la maschera, avvisa sugli sfori e sulle differenze, registra |
| `giacAggiornaCarico(pre)` | Aggiorna suggerimenti e precompilazione **senza ridisegnare** |
| `giacPreparaResa(p)` | Dalla tabella "chi ha in carico": prepara la restituzione già intestata |
| `giacPrintGiacenza()` / `_giacStampa(h)` | Il foglio A4 per la governante — vedi sopra |
| `_giacJs(s)` | Nome dentro un `onclick`: neutralizza apice e barra rovescia **prima** dell'escape HTML — con dei `D'` in organico, senza questo il pulsante si rompe |

Coperto da **42 controlli** in `test/controlli.js` ("Giacenza biancheria: il magazzino si
ancora al conteggio, il carico no"), verificati con quattro sabotaggi (il conteggio non fa
più da ancora; segno del carico rovesciato; voci fuori elenco buttate via; strutture
mescolate): 10, 8, 1 e 3 falliscono. I due che tengono in piedi «Aggiunta» sono verificati
allo stesso modo (il carico deciso di nuovo dal segno; il pulsante rimesso in fondo): 1 e 1
falliscono.

### Foglio A4 per la governante — `giacPrintGiacenza()` / `_giacStampa(hotel)`

Pulsante **"🖨 Foglio per la governante"** nell'intestazione del pannello *Giacenza per
tipologia* — cioè accanto alla tabella che stampa. Stampa la **struttura selezionata**:
sono due magazzini distinti e un foglio con dentro tutte e due non si porta a nessuno
scaffale.

Contiene, in una pagina: intestazione con struttura e data di stampa; la riga che dice
**quando è stato contato** il magazzino; la tabella per tipologia (`In magazzino · In mano ·
Totale · **Contato**`); l'elenco di **chi ha pezzi in carico** con da quanti giorni e cosa
ha, voce per voce; due righe di firma (*Contato da* / *Data del conteggio*).

**La colonna «Contato» è vuota di proposito.** Il foglio non serve solo a leggere la
situazione in ufficio: serve a portarla allo scaffale. Senza quella colonna la governante
scriverebbe comunque i numeri a margine, e a quel punto il foglio è mezzo documento. Con
essa la riga dice insieme *quanto risulta* e *quanto trovi*. Una nota sotto la tabella
ricorda che **i pezzi sul carrello non vanno contati lì**: sono già nella colonna «In mano».

**Magazzino mai contato**: la colonna mostra `—` e non `0`, e l'avviso in testa dice che il
foglio serve proprio a fare il primo conteggio. Una colonna di trattini senza spiegazione
sembrerebbe un guasto della stampa.

**Nessun fondo pieno**, come la distinta resi e il report biancheria: testo nero e filetti.
Si stampa ogni volta che si conta, in bianco e nero, e un blocco pieno consuma toner senza
aggiungere niente. `page-break-inside:avoid` sulle righe.

Verificato generando il PDF con Chromium in tutti e due gli stati — magazzino contato e mai
contato: **una pagina sola** in entrambi, numeri e date corretti, nessun errore JS.

### Cosa NON fa, di proposito

Nessuna app per le cameriere (come i resi: scrivono sul cartaceo, il QM trascrive),
nessun promemoria in Overview, e **nessun aggancio automatico ai consumi
giornalieri** del Consumo Biancheria. La tentazione è dedurre che *prelevato meno
restituito = consumato*: è quasi sempre vero, ma sono due registri con due fonti diverse
(qui il magazzino, là i fogli camera) e legarli vorrebbe dire far dipendere un numero
dichiarato da uno calcolato. Se un domani serve un confronto, va **mostrato** come confronto,
non usato per correggere l'uno con l'altro.

---

### Totali del mese, per incrociare la fattura (24/09/2026)

Riquadro **"Totali del mese"** (sopra "Pezzi non rientrati"), con un menu dei mesi che hanno
dati e il pulsante **Stampa** (A4 senza fondi pieni). Per ogni tipologia, nella struttura
scelta: **Dati a Raimondo** (sporco delle consegne del mese), **Portati da Raimondo** (solo
le consegne registrate: quelle senza il dato sono elencate a parte) e **Consumi fogli camera**.

Le consegne contano nel mese della **loro data**, i consumi nel mese del giorno a cui si
riferiscono: una consegna del 2 ottobre porta via consumi di fine settembre e sta in ottobre,
perché è lì che la fattura la conta. Per questo le colonne "dati" e "consumi" dello stesso mese
non coincidono esattamente, e ad agosto 2026 i consumi sono molto più alti: le consegne si
registrano dal 20/08, i consumi da prima.

`_biaMese(h,ym)`, `_biaMesiDisponibili`, `_biaTabellaMese` (unica tabella per schermo e
stampa), `biaPrintMese`. Stessa cosa nella Galleria (`gb…`). 9 controlli.

**Rifatto per la fattura il 24/09/2026.** Colonne: *Dati a Raimondo*, *Portati da Raimondo*,
**In fattura** (quantità della fattura LANA.POLI, inserite a mano, per struttura e mese in
`_bia.fatture['sa|2026-09'].q`), **Fattura − portati**, **Fattura − dati** (rosso se si fattura
più di quanto risulta), **Importo** senza IVA con i prezzi della fattura n. 730 del 01/09/2026
(`BIA_FATTURA`: nomi e prezzi per voce; il Boutique ha fattura separata — se i prezzi fossero
diversi, `BIA_FATTURA` va fatta per struttura). Tolta la colonna "Consumi fogli camera": sono
gli stessi pezzi contati per giorno d'uso, e affiancati al mese di consegna sembravano un
errore (29–31 agosto escono con la consegna del 1° settembre).

`biaSetFattura` salva **senza ridisegnare** (col Tab si passa alla casella dopo) e scrive `''`
per una casella svuotata: con `delete` la fusione col cloud rimetterebbe il valore vecchio.
Nella Galleria `_gbMigra`/`_gbFondi` sono stati estesi a `fatture`: prima avrebbero buttato
via tutto ciò che non era consumi o consegne. Agosto 2026 non è confrontabile (Compass parte dal
18–20/08); il primo mese completo è settembre.

### "Giro" sparito anche dagli ultimi testi (24/09/2026)

Il riquadro di registrazione si chiamava ancora **"Giro di Raimondo"**. Ora è **"Consegna biancheria
pulita · giovedì 24/09"** (nome scelto dal QM), con giorno e data della consegna che si sta registrando (la vigilia
resta "Prepara il ritiro di domani"). Sistemati anche "Aggiorna giro" → "Aggiorna consegna",
"primo giro" → "prima consegna", le frasi sul periodo e il report per la direzione. I nomi nel
codice (`giri`, `biaRegistraGiro`, `bia-giro-data`) restano: sono chiavi, non parole.

### Via la colonna "Tot pezzi da dargli" (24/09/2026)

Nella tabella della consegna c'era una casella per voce con lo sporco che esce. Il valore era
già calcolato dai consumi, ma la casella lo faceva sembrare da compilare ed era la strada dei
refusi (i 123 asciugamani bidet del Boutique). Tolta su richiesta del QM: **"inutile e
fuorviante"**. Ora `biaRegistraGiro` congela la somma dei consumi del periodo (`daiConsumi`) e,
aggiornando una consegna già registrata, tiene il totale già congelato; `biaPrintDistinta`
senza id usa il totale della consegna registrata o la somma dei consumi. Per cambiare quanto
esce si correggono i consumi dei giorni e poi "Riallinea ai consumi". Stessa cosa nella Galleria.
