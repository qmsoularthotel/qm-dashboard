# Interfaccia — smartphone, icone, viste

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

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
| `view-agenda` | **Agenda** — to-do personale della settimana del QM (vedi sotto) |
| `view-registrazione` | Registration cards ospiti |
| `view-recensioni-sa` | Recensioni SoulArt |
| `view-recensioni-bh` | Recensioni Boutique |
| `view-recensioni-sl` | Recensioni San Liborio |
| `view-recensioni-pr` | Recensioni Principe |
| `view-recensioni-ms` | Recensioni Mastrangelo |
| `view-recensioni-ar` | Recensioni Art Resort |
| `view-recensioni-sb` | Recensioni Santa Brigida |
| `view-bkfsheet` | Operativa Breakfast — SoulArt |
| `view-bkfsheetar` | Operativa Breakfast — Art Resort |
| `view-hkpsheet` | Operativa HKP (Housekeeping) — SoulArt Hotel |
| `view-miniapp` | **Applicazioni stand alone** — accensione/spegnimento delle 5 app (ex "Pannello App", ex "Mini App") |
| `view-sicurezza` | **Sicurezza** — dispositivi abilitati e copia di sicurezza dell'archivio |
| `view-inventario` | Inventario detersivi (stock + movimenti + analisi + ordini) |
| `view-turni-pref` | Preferenze turni staff (da Google Forms) |
| `view-turnazione` | "Turnazione Corrente" — specchio del pannello turno di Overview (`.staff-area-mirror`) |
| `view-controllo-mattino` | Dashboard distribuzione Culligan (stats + QC settimanale + Stampa A4) |
| `view-conteggio-biancheria` | **Conteggio Biancheria** (16/11/2026) — Conteggio a scorrere (dietro l'interruttore del dispositivo) e Riscontro fatturazioni, tolti da Consumo Biancheria (`biaRenderConteggio`, `#biac-content`) |
| `view-giacenza` | **Giacenza Biancheria** — magazzino e pezzi in mano alle cameriere |
| `view-resi-biancheria` | Resi biancheria inidonea al fornitore Raimondo (solo SoulArt, solo QM) |

---

## Adattamento a smartphone — regola generale

**Gli stili in linea non si adattano.** Gran parte delle viste è costruita in JS con
`style="..."`: nessuna `@media` può raggiungerli. Ogni volta che una misura deve cambiare
su smartphone va **spostata in una classe CSS**, lasciando in linea solo ciò che è
davvero dinamico (colori calcolati, stati). Le classi nate così:

| Classe | Dove | Perché esiste |
|---|---|---|
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

### Emblema del logo: la rosa dei venti inclinata (25/09/2026)

Su richiesta del QM il simbolo del logo (la bussola disegnata in SVG, 36×36, con 8 punte) è
stato sostituito **ovunque** dalla rosa dei venti delle finestre di conferma, inclinata di 22°:
logo del menu di Compass e della Gestione Biancheria, intestazione di `reception.html`, schermata
"Applicazione in aggiornamento" di tutte le app. Sul fondo blu la `compass-stella.png` originale
non si leggeva (linee scure): si usa **`img/compass-stella-chiara.png`**, la stessa immagine con
le linee schiarite e l'oro invariato, senza alone. Misura: 1,45 volte il vecchio SVG (36 → 52).
**Restano gli splash** delle app, che hanno un'altra bussola con l'ago animato.
- Anche la stellina della barra in alto (`.topbar-spark`, accanto alla freccia) è ora la rosa dei venti `img/compass-stella.png` inclinata di 22° (fondo bianco: immagine originale), in Compass e nella Galleria (25/09/2026).

### Icone dei pannelli dell'Overview — `.ov-icon-badge` (26/09/2026)

Le emoji e le foto PNG nelle intestazioni dell'Overview (Turno di oggi, Piano del giorno,
Camere con check-in oggi, Housekeeping, Breakfast, Recensioni) e di Turnazione Corrente sono
diventate badge navy/oro come il menu: classe `.ov-icon-badge` (24px, SVG bianco 12px), stesse
icone delle voci corrispondenti del menu (persone, calendario, chiave, righe HKP, tazza, stella).
Estesa lo stesso giorno a Registration Cards (passaporto), Distribuzione Culligan (goccia),
riga "Prenotazioni (PMS) caricato" (documento) e, nel Culligan,
"Portare bottiglia riempita" (goccia), "Non ancora visitate" (orologio), "Camere controllate
nella settimana" (grafico). Per i titoli costruiti in JavaScript c'è `_ovIcona(nome)` in app.js.
Terzo giro (26/09): Breakfast Sheet (Aggiornamento giornaliero = tazza, Gruppi colazione =
persone, Note operative = blocco note), Occupazione giornaliera (grafico), Bilanciamento Camere
(bilancia), Suddivisione cameriere (persone), Come bilanciare (lampadina), Riepilogo
Housekeepers (righe HKP), Reso Biancheria (cesto), Reception (€), obiettivo recensioni delle 7
strutture (bersaglio), Recensioni in scadenza (clessidra), Preferenze turni "Per il" (calendario
piccolo, `_ovIcona(n,1)` → `.ov-icon-mini` 18px). Le ⚠️ di avviso restano: sono segnali, non icone.

### Inventario e Ordini — icone a linea `_invIco` (26/09/2026)

Tutte le emoji della vista (schede, contatori esauriti/allerta/ok, filtri, matita, rifornimento,
cestino, movimenti, ordini, modali, Stampa A4, Apri scanner) sono icone SVG a linea col colore
del testo (`_invIco(nome,px)` in testa alla sezione §§ INVENTARIO), stesso disegno di
`RECEPTION_ICON_*`. Restano le emoji solo nel testo del messaggio WhatsApp al fornitore.


### DVR — icone stile Compass (27/09/2026)

Pannelli con badge navy/oro `.ov-icon-badge` (Dipendenti persona, Visite cuore, Art. 37 tocco,
Antincendio fiamma, Primo Soccorso croce, Estintori, Legionella goccia, RLS elmetto, Preposto
chiave, Documento DVR documento). Etichette di gruppo, pulsanti delle società e titoli delle
finestre senza emoji (`DVR_CATS[].label` è testo puro). Modifica/Elimina con `_invIco`.
L'app `dvr.html` non è stata toccata.

---

## Agenda personale della settimana (08/11/2026)

Voce **Agenda** subito sotto Overview, `§§ AGENDA` in app.js, stile `.ag-*` in style.css.
Un'agendina, non un calendario fisso: sette schede da lunedì a domenica, si va avanti e
indietro di settimana. In ogni giorno si **aggiunge** (Invio o "+", ora facoltativa), si
**spunta**, si **corregge** toccando il testo, si **sposta** su un altro giorno (⋯ → Sposta) o
trascinando con la maniglia, si **mette in ordine** con la maniglia (anche col dito), si **elimina** (⋯ → Elimina, senza conferma: è un appunto).
"Togli i fatti della settimana" chiede conferma con `cqConferma`.

- **Rimasti indietro**: dal 14/11/2026 **non c'è più il riquadro in cima** (né "Porta tutti a
  oggi"): il QM l'ha giudicato inutile. Gli impegni non spuntati di un giorno passato restano nel
  loro giorno, in rosso. Niente sparisce da solo.
- **La freccia chiede il giorno** (14/11/2026; dal 17/11 è la voce «Sposta a un altro giorno» del ⋯): *"a oggi"* / *"al giorno dopo"* non andava bene.
  `agScegliGiorno` apre la finestra Compass (`cqAvviso`, pulsante Annulla) con i 14 giorni di
  questa settimana e della prossima (`_agScelta`, griglia `.ag-scegli`, 4 colonne su telefono):
  oggi in oro, il giorno previsto in rosso, quello attuale spento. Se il giorno previsto è prima
  di questa settimana c'è *"Riporta al giorno previsto"*. `agSpostaA` sposta con `_agSposta`:
  riportato al giorno previsto l'impegno **torna in ritardo** (rosso), non evaso.
- **Il giorno previsto non si perde** (14/11/2026). Il QM: *"i task rimasti indietro non devono
  essere tolti dai riquadri… non so in che giorno era previsto (la pill rossa non basta)"*.
  Un impegno non fatto resta nel riquadro del suo giorno, in rosso con *in ritardo* (`.ag-ritardo`).
  Spostato da un giorno passato (freccia o trascinamento) prende
  `previsto` = il giorno d'origine (`_agSposta`, solo la prima volta): quel riquadro tiene una
  traccia tratteggiata *"spostato a oggi / al gio 5 nov"* (o *fatto il …*), e la riga nel nuovo
  giorno porta *"previsto mar 3 nov"* (`.ag-da`). Riportato al suo giorno, `previsto` si toglie. Controlli in
  `test/controlli.js` ("lascia la traccia nel suo giorno").
- **Ordine degli impegni a mano** (17/11/2026). Il QM: *"dai la possibilità di spostare l'ordine
  degli impegni"*. Messi in fila, gli impegni da fare del giorno prendono `pos` 0,1,2…
  (`_agMettiInFila`); `_agOrdina` ordina per (fatto, `pos`, ora, ts): chi non ha `pos` (nuovo o
  arrivato con la freccia da un altro giorno: `_agSposta` lo toglie) va **dopo** quelli in fila,
  con la regola di sempre. Senza spostamenti l'ordine è quello di prima. `pos` viaggia nella
  fusione a tre come ogni altro campo.
- **La riga dell'impegno: maniglia a sinistra, ⋯ a destra** (17/11/2026, sostituisce le frecce
  su/giù dello stesso giorno). Il QM: *"ci sono troppi segni dopo il task, accorciano il task"*;
  fra tre proposte (menu ⋯ / comandi al tocco / maniglia) ha scelto la **maniglia**.
  - **Maniglia ⠿** (`agPrendi`, pointer events: mouse **e dito**, `touch-action:none`): si tiene
    premuta e si porta l'impegno sopra un altro, anche di un altro giorno. Metà alta della riga =
    prima di quello, metà bassa = prima del successivo (`_agDoveCade`); spazio vuoto del giorno =
    in fondo. Lasciato, `_agFineTrascina` → `_agTrascinaFine` (cambia giorno con `_agSposta`,
    quindi con la traccia del previsto, poi mette in fila) → `_agScrivi`. Il giorno sotto il
    dito si trova con `elementFromPoint` e `data-iso` sul riquadro; vicino al bordo `.content`
    scorre da sola. Gli impegni fatti non hanno maniglia. Il vecchio trascinamento HTML5
    (`draggable`, solo computer) è stato tolto: la maniglia fa lo stesso anche da telefono.
  - **⋯** (`agMenu`, `_agMenuAperto`): Sposta a un altro giorno (la scelta dei 14 giorni di
    prima, non per i fatti), Modifica, Elimina. Si chiude toccando fuori o con Esc. Toccare il
    testo continua a correggerlo.
  - Le pillole (*in ritardo*, *previsto …*) stanno **sotto** il testo (`.ag-sotto`).
  - Durante un trascinamento o col menu aperto, un aggiornamento dal cloud **non** ridisegna
    (`_agDopoFusione`). Controlli in `test/controlli.js` ("ordine degli impegni a mano").
- **Il mio turno in ogni giorno** (17/11/2026). Il QM: *"metti su ogni giorno il mio turno del
  giorno"*. Nella testa di ogni giorno, accanto alla data, una pillola col turno di `Presta P.`
  (`AG_QM`): verde *Turno P*, rossa *Riposo* / *Ferie* / *Malattia*; niente col trattino o senza
  turno. `_agTurnoQM(iso, weekData, archivio)` legge prima il turno caricato, poi l'archivio
  `qm_turni_storico` (`turniStoricoLeggi`) per le altre settimane, **solo a data esatta**:
  `findWeekDayIndex` ripiega sul giorno della settimana e qui darebbe il turno di un'altra
  settimana. Un turno nuovo (`loadWeekData`) ridisegna l'Agenda se è aperta, non sotto le dita.
  Controlli in `test/controlli.js` ("il mio turno in ogni giorno"), provati con sei sabotaggi.
- **Badge del menu**: impegni da fare di oggi + rimasti indietro.
- **Dati**: `qm_agenda`, elenco `[{id, giorno:'AAAA-MM-GG', testo, ora, fatto, ts, previsto?, pos?}]`, scritto
  dai due Mac e dal telefono: passa **solo** da `_qmElencoSalva` (fusione a tre), è in
  `QM_ELENCHI_CONDIVISI` e nel backup. Si rilegge il cloud aprendo la vista e tornando sulla
  scheda; **non** è nel polling dei 30 secondi (nessuna lettura in più a pagina aperta).
- Date ISO costruite a mezzogiorno (`_agDaIso`): il cambio d'ora non sposta i giorni.
- 15 controlli in `test/controlli.js` ("Agenda della settimana"), verificati con quattro
  sabotaggi (lunedì sbagliato, `kvSet` diretto, ridisegno sotto le dita, testo senza `_esc`).

---

## Firma in fondo a ogni pagina (24/11/2026)

Richiesta del QM: «il footer ovunque». `.firma` (in `style.css`, nata in Compass OPS) chiude
Compass (in fondo a `.content`, uguale per tutte le viste), Compass OPS, la guida di stile e,
copiata nello stile proprio di ognuna, le app: Housekeeping, Breakfast, Inventario,
Distribuzione Culligan, DVR, Registration Cards. Testo: «<nome> fa parte della Suite Compass
QM, interamente ideata e creata dal Quality Manager Pierpaolo Presta. Per esclusivo uso
interno.» Una frase in più solo se è vera e verificata nel codice: Compass OPS (dati a cui
accede, PDF delle Registration letto solo sul computer) e Registration Cards (dati degli
ospiti non inviati). **Compass OPS ha una firma sua** (24/11/2026, scelta del QM fra tre proposte, la «firma
d'autore»): `.firma.firma-ops` — marchio «Compass **OPS**» (navy + oro) e «Suite Compass QM» a
sinistra, filo oro verticale, a destra «*Ideazione e creazione del Quality Manager*
**Pierpaolo Presta***, nell'ottica del miglioramento continuo e della qualità dei processi.*
Per esclusivo uso interno.» e, più piccola, la frase sui dati. Su smartphone si impila e
centra. Compass e le altre app tengono la firma comune.
Nelle app con i nomi dei grigi scambiati la copia usa i nomi scambiati,
così il colore è identico. Dentro Compass OPS la Registration nasconde la sua
(`.rc-dentro .firma`). `esegui.sh` si ferma se una pagina `.html` non ha `class="firma"`.


## Agenda: impegni in maiuscoletto (28/11/2026, QM)

Il testo degli impegni (`.ag-tt`, in `_agRiga` e `_agTraccia`) e la casella in cui si scrivono
(`.ag-testo-in`) si vedono in maiuscoletto comunque siano scritti. Solo aspetto: il testo salvato
resta com'è. `font-variant-caps:all-small-caps` è stato provato e scartato: il carattere di Compass
non ha un vero maiuscoletto e il browser lasciava alcune lettere minuscole; si usano maiuscole
all'88% con un filo di spaziatura. Su smartphone la casella resta a 16px (iOS).
