# Turni, staff e preferenze

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

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

### Statistiche ricevimento e archivio dei turni

Ogni turno caricato viene **conservato**: `turniVoceStorico()` ne ricava una voce per
settimana (indicizzata sul lunedì) e `turniArchivia()` la fonde con quella già sul cloud
(`qm_turni_storico`). Per la stessa settimana **vince la versione più recente**: il planning
cambia più volte in settimana e si ricarica, e il ricaricamento è la via normale per
correggerlo — non crea doppioni.

**Il conteggio parte dal 17/08/2026**, la prima settimana archiviata: è scritto nell'intestazione
del pannello perché nessuno legga i totali come se coprissero l'anno.

#### Cosa si conta (`turniStatistiche()`) — solo `DEPTS.fo`

Housekeeping, breakfast e manutenzione usano codici tutti loro (`9-17`, `SOUL N.`, `BKF GALL`):
mescolarli renderebbe i totali privi di significato.

| Colonna | Cosa contiene |
|---|---|
| P | turni `P` (Presta/Maddaloni, sede unica) |
| Mattine | `AC` + `AG` |
| Pomeriggi | `CC` + `CG` |
| Intermedi | `INT CAR` + `INT GALL` |
| Notti | `NC` + `NG`, col dettaglio `<n>AR-<n>SA` |
| Riposo domenicale | domeniche **di riposo** |
| Art Resort / SoulArt | dove ha lavorato: `AG`/`CG`/`INT GALL` da un lato, `AC`/`CC`/`INT CAR` dall'altro |
| Malattia / Ferie | assenze esplicite |

**Dal 19/11/2026 (QM)** le colonne sono, in quest'ordine: **P, Intermedi, Mattine, Pomeriggi,
Notti, Riposo domenicale, Malattia, Ferie**. Le colonne Art Resort / SoulArt sono state tolte (i
conteggi per sede restano calcolati in `turniStatistiche`, basta rimetterle nella tabella). La
colonna Persona è larga quanto il nome più lungo (`width:1%`). Stessa tabella nella Galleria.

#### Elenchi ESPLICITI, mai dedotti dai dati

```js
TURNI_NOTTURNI    = ["D'Andrea F.", 'Iannario R.', 'Grieco V.']
TURNI_ORDINE_TESTA= ['Maddaloni M.', 'Presta P.']
TURNI_SEDE_UNICA  = ['Presta P.', 'Maddaloni M.']
```

La prima versione **deduceva** chi fosse notturno da quante notti aveva fatto, e Vatiero —
che le notti le ha fatte in emergenza — finiva fra i notturni. Un elenco scritto a mano è
l'unica cosa che regge: chi fa le notti di ruolo lo si sa, non lo si calcola. Stessa cosa per
chi lavora in una sede sola: a Presta e Maddaloni le colonne Art Resort/SoulArt non si
compilano affatto, perché un `0` farebbe pensare che non abbiano lavorato.

I notturni stanno **in fondo** alla tabella e per loro si mostrano solo notti, domeniche,
ferie e malattie: mattine e pomeriggi non descrivono il loro lavoro.

#### Notturni e personale uscito

`TURNI_NOTTURNI` è un elenco esplicito: D'Andrea, Grieco, Iannario e, dal 31/10/2026,
**Abdalla**. Chi non lavora più con noi sta in `STAFF_CESSATI` con il primo giorno di assenza
(Iannario dal 01/10/2026): **resta in `DEPTS`** perché archivio e statistiche lo devono
riconoscere, ma esce dall'elenco dei nomi dato all'AI per i turni nuovi, e nelle statistiche
chiude la tabella, sbiadito, con "fino al 30/09".

#### Codici scritti a mano — `turniNormalizza()`

I turni arrivano da una foto del planning, scritti da persone diverse: `R`, `R RICHIESTO`,
`R RECUPERO 23/08`, `P (EX R)`, `INT CAR 9/17`. Vengono ricondotti a categorie.

**Una nota fra parentesi non fa un turno diverso**: `AC (CALL)` è un `AC`. Si prova prima il
codice così com'è — esistono sigle che le parentesi le usano davvero, come `INT (GALL)` — e
solo se non lo si riconosce si riprova senza la nota. Allo stesso modo un turno **richiesto**
(`AC RICHIESTO`) è quel turno, mentre `FERIE RICHIESTE` sono ferie e `REC RIP` è riposo
(31/10/2026). Nel turno del giorno (`IS_REST`/`IS_ABSENT`) "RICHIESTO" vuol dire riposo solo
dopo una `R`: prima anche `AC RICHIESTO` finiva fra chi non è in servizio.
`13/21 EVENTO` (e ogni codice con «EVENTO») conta come **P** (QM, 19/11/2026). `GALL/CAR 12-20` è un intermedio e conta con l'**Art Resort** (scelta del QM, 31/10/2026). Gli intermedi si leggono anche scritti
`INT. GALL`, `INT/GALL`, `INTGALL`, e i caratteri invisibili incollati dal foglio si tolgono. Un codice davvero sconosciuto resta
"non riconosciuto" ed è segnalato in un riquadro: **non entra in nessun conteggio**, ed è
giusto che si veda.

#### Turni archiviati — sfogliare una settimana passata

Sotto le statistiche, il pannello **Turni archiviati**: un pulsante per settimana
(`turniArchivioSettimane()`), e cliccandone uno la tabella persone × 7 giorni con i codici
originali (`turniRenderArchivio()`). Mostra **chi compare in quella settimana**, non chi è in
organico oggi: un extra di tre settimane fa deve restare visibile, altrimenti il turno
archiviato non è più quello che era. Ricevimento in alto, poi housekeeping e altri; riposi,
ferie e malattie **in rosso**, con filetto verticale fra i giorni.

**Si apre sull'ultimo turno caricato** (19/11/2026, QM): `_turniSettSel` parte `undefined` e alla prima apertura diventa la settimana più recente (anche nella Galleria, `_gtuSettSel`, rimesso a `undefined` a ogni ingresso nella vista); `null` = chiusa a mano.

**Settimane mancanti** (19/11/2026, QM): `_turniSettimaneMancanti(chiavi,oggi)` cerca i lunedì
che mancano fra la prima settimana archiviata e quella in corso; nel pannello compaiono come
pulsante rosso tratteggiato «… · manca» al loro posto e con un avviso rosso sotto i pulsanti
(«carica quel turno, altrimenti le statistiche non la contano»).

**Ordine** (19/11/2026, QM): nel ricevimento (statistiche e archivio, `turniOrdina`) Vatiero
sta subito dopo Perez (`TURNI_DOPO`), il resto in ordine alfabetico. In «Housekeeping e altri»
l'ordine è fisso (`TURNI_ORDINE_ALTRI`): Matarese, Cavaliere, Sarnataro, Anushka, Roberta,
Ditta (dopo Roberta), Amorese, Extra BKF, Ferace, Panagodage, Basile (`TURNI_GRUPPI_ALTRI`: housekeeping, colazione, manutenzione); chi non è nell'elenco va in fondo. **Linea più spessa** (2px) dopo Presta, prima di Amorese e prima di Basile (`_turniDopoTesta`, `_turniGruppoAltri`); quella dopo Presta anche nelle statistiche.

**Nomi nell'archivio** (19/11/2026): la tabella di una settimana passa i nomi da
`_turniSenzaEsclusi` su una **copia** (nessuna scrittura), così le settimane vecchie con
«EXTRA ANU»/«EXTRA ROB» e i nuovi «Ditta A»/«Ditta R» si leggono **Anushka** e **Roberta**.

#### L'anno sbagliato e la settimana doppia

Il planning è una foto e l'anno spesso non c'è. Il 24/08/2026 la settimana 17-23 agosto è
finita in archivio **due volte**, una col 2025 e una col 2026: le statistiche la contavano
due volte, la prima con i dati vecchi, e nessun avviso da nessuna parte — i numeri sembravano
solo un po' alti. Ora `turniVoceStorico()` normalizza l'anno con `_annoPlausibile()`, e
`turniRipuliArchivio()` fonde **in lettura** le voci già scritte (nessuna scrittura KV),
ripulendo l'archivio vero al caricamento successivo.

### Riorganizzazione sezione "Reception" (menu)

La sezione menu **Staff** è stata eliminata: "Preferenze Turni" si è spostata dentro **Reception**, insieme a "Turnazione Corrente" (e a "Passaggi di Cassa", tolta il 10/11/2026). `breadcrumbs['turni-pref']` e `breadcrumbs['turnazione']` sono ora `'Reception'` (prima `'turni-pref'` era `'Operativo Quotidiano'`).

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

Membri fissi: `Matarese A., Nacci M., De Masi C., Chiantese M., Ditta Antonella, Anushka, Ditta Giuditta, Ditta Nunzia, Roberta, Scognamillo E., Esposito M., Branno M., Sarnataro A.`

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

## Preferenze Turni

**Dal 16/11/2026 l'etichetta è «Preferenze Turnazione»** (menu e titolo della pagina); la chiave della vista resta `turni-pref`.

### Foglio Google collegato

`https://docs.google.com/spreadsheets/d/1KysJxvGY-PxCSrjdWMjYCz_7KlFOIG6bSe3fXCVfObo`

Apps Script: `TURNI_PREF_URL = 'https://script.google.com/macros/s/AKfycbzCbHxJbSfxg8X49w2JlfI9xo3HqhDiOa6E_0SDstdrvpQTQfqd2euaGp1oIK3zo0CA/exec'`

Usa `typeof v.getTime === 'function'` invece di `instanceof Date` per evitare bug Apps Script.

### Click su un giorno del calendario — lista piatta, non raggruppata per mese

`turniPrefRender()` filtra correttamente `items` per `_tpCalDay` (giorno **richiesto**, `r.giornoRichiesto`), ma il rendering della lista raggruppava comunque i risultati per **mese di invio** della richiesta (`r.ts`) — due richieste per lo stesso giorno ma inviate in mesi diversi finivano sotto etichette di mese diverse, invece di comparire subito insieme. Quando `_tpCalDay` è valorizzato, la lista è ora **piatta** (un solo titolo "Richieste per il gg/MM/yyyy", tutte le righe sotto, nessun raggruppamento) — il raggruppamento per mese resta solo quando non è selezionato nessun giorno (vista di navigazione libera di tutte le richieste).

### Settimana prossima riquadrata ed elencata (16/11/2026)

Il QM: *"evidenzia la settimana successiva a quella corrente creando un riquadro nel
calendario; sotto il calendario elenca tutte le richieste per quella settimana"*.

- `_tpSettimanaProssima(oggi)` → `{da,a,giorni:[dd/MM/yyyy ×7]}`, da lunedì a domenica della
  settimana dopo quella di oggi (di domenica è ancora quella che inizia domani).
- Nel calendario ogni cella ha **riga e colonna esplicite** (`grid-row`/`grid-column`): solo
  così il riquadro oro (`title="Settimana prossima"`, `var(--gold)`/`var(--gold-bg)`) può stare
  sotto le celle della settimana — in una griglia gli elementi posizionati a mano si
  sovrappongono, quelli automatici no. Una settimana a cavallo di mese è riquadrata per la
  parte del mese mostrato. Legenda sotto il calendario.
- Pannello **«Richieste per la settimana prossima»** fra calendario ed elenco: giorno per
  giorno, nomi in ordine alfabetico, col filtro di **reparto** ma **non** col giorno cliccato
  (è l'elenco su cui si prepara il turno, non deve sparire).

9 controlli in `test/controlli.js` (sabotaggio: settimana corrente al posto della prossima ed
elenco tolto → 7 falliscono).

### Settimana prossima «stile E», un reparto solo, consuntivo del trimestre (16/11/2026)

- **Stile E** scelto dal QM fra sei proposte (artefatto): riquadro a **filo oro** senza fondo,
  e i giorni **fuori** dalla settimana prossima a `opacity:.38` (il giorno selezionato resta pieno).
- **Due filtri «Housekeeping»**: il foglio scrive lo stesso reparto come `HOUSEKEEPING` e
  `Housekeeping`. `_tpRepNorm` porta tutto a iniziale maiuscola all'inizio di `turniPrefRender`
  (anche `_tpFilter`), prima di contare e filtrare.
- **Consuntivo per persona** accanto al calendario (`flex-wrap`: su telefono va sotto):
  `_tpConsuntivo(dati,filtro,oggi)` conta le richieste per **giorno richiesto** nel trimestre in
  corso (`_tpTrimestre`), una riga per persona anche se scritta in modi diversi, col filtro di
  reparto; ordinato per numero, con totale.

13 controlli nuovi; sabotaggio (niente normalizzazione, niente limite di trimestre) → 6 falliscono.

**Poi, stesso giorno (QM):** il consuntivo mostra **solo chi ha almeno una richiesta per la
settimana prossima** («Chi chiede la settimana prossima · N° trimestre»), con due colonne:
*Sett. prossima* (oro) e *Nel trimestre*. Se la settimana prossima cade già nel trimestre dopo,
la persona compare lo stesso con 0 nel trimestre. Fra le scritture dello stesso nome si mostra
quella «ben scritta» (Rossi Anna). La legenda sotto il calendario è sostituita da una
**didascalia «Settimana prossima»** appoggiata sul bordo del riquadro (z-index 2, fondo
`var(--bg)` che interrompe il filo oro).

**Trimestre a ritroso (QM, 16/11/2026):** la colonna *3 mesi prima* conta le richieste nei tre
mesi che finiscono il giorno prima del lunedì della settimana prossima, **esclusa** la settimana
stessa (lunedì 23/11 → 23/08 – 22/11), non più il trimestre di calendario. `_tpTrimestre(oggi)`
→ `{da,a}`; l'intervallo è scritto nell'intestazione del riquadro. Sabotaggio (settimana inclusa)
→ 3 controlli falliscono.

**Ritocchi del QM (16/11/2026, sera):**
- Riquadro con **linguetta oro piena** «SETTIMANA PROSSIMA» attaccata all'angolo in alto a sinistra
  (disegno del QM): bordo 2px, angolo in alto a sinistra squadrato; la linguetta copre in parte
  la riga sopra (z-index 2).
- Riepilogo: il numero di *3 mesi prima* è un pulsante che apre/chiude l'elenco delle richieste
  di quella persona nel periodo (`turniPrefToggleCons`, `_tpConsAperto`; `x.lista` da
  `_tpConsuntivo`). Barra a scala fissa 21 colorata da `_tpConsColore`: **verde 0–7, arancio
  8–15, rosso da 16**. Tolta la riga *Totale*. `prefColor` è stato spostato prima del riepilogo
  (era una `const` dichiarata più in basso nella stessa funzione).
- Elenco: i mesi degli **anni precedenti** stanno raccolti sotto il loro anno (chiave
  `anno:AAAA` in `_tpMesiAperti`), chiuso; aperto mostra i suoi mesi, chiusi anche loro.
- Poi: riepilogo più stretto (`flex:0 1 520px`) e più distante dal calendario (gap 56px);
  titolo «Chi chiede la settimana gg/mm – gg/mm», colonne «Settimana gg/mm – gg/mm» e
  «Trimestre in corso» (è sempre il trimestre a ritroso descritto sopra, il QM lo chiama così).
  L'arancio della barra è il nuovo token **`--orange`** (`style.css`, chiaro e scuro): `--amber`
  accanto al rosso non si distingueva.

### Mesi precedenti chiusi nell'elenco (16/11/2026)

Nell'elenco raggruppato per mese di invio il **mese in corso** resta aperto, i **precedenti**
partono chiusi: intestazione cliccabile con ▸/▾ e «· N richieste» (`turniPrefToggleMese`,
`_tpMesiAperti` fuori dal render, ridisegno con `_qmSenzaSalto`). 4 controlli.

---

## Persone escluse dall'elaborazione (02/10/2026)

`TURNI_ESCLUSI` (cognomi, minuscolo): chi compare nel planning ma non va in Compass. Oggi **Grasso E.**
(Amministrazione), che senza reparto finiva fra gli extra Housekeeping. Si toglie a ogni caricamento
(`loadWeekData` → `_turniSenzaEsclusi`, quindi anche dai turni già salvati). **Dal 25/11/2026 non si
butta più**: l'AI la legge e la si mette da parte in `g.esclusi` (fuori da turni e statistiche, ma in
archivio), perché Presenze Cascione di Compass OPS compila la sua riga — vedi Presenze Cascione.

## Housekeeping: "Extra" → "Ditta" (02/10/2026)

Le camere 200 le pulisce la ditta esterna: nel turno chi è scritto "Extra …" in Housekeeping diventa
"Ditta …" (`_turnoNomeHK`, applicata a ogni caricamento da `_turniSenzaEsclusi`). Eccezioni interne:
"Extra Rob…" → **Roberta**, "Extra Anu…" → **Anushka**. Dal 19/11/2026 anche "Extra A"/"Ditta A" → **Anushka** e "Extra R"/"Ditta R" → **Roberta**. Gli Extra della reception (Extra Night, Extra
Angelica, Extra Benedetta) restano come sono. In `DEPTS.hk` i nomi sono aggiornati di conseguenza.

**Le camere 200 sono solo della ditta** (02/10/2026): un "200" su chi non è "Ditta …" è un errore di
lettura (l'AI scivola di una riga quando due righe vicine hanno il trattino: Roberta il 2/10). Torna alla
ditta e la persona va a "-". Anche il prompt ora chiede di non spostare i valori fra le righe.

**Non tutti gli Extra sono Housekeeping** (06/10/2026): "Extra ABD" → **Abdalla** (Ricevimento, in `DEPTS.fo`);
"Extra BKF" resta **Extra BKF** (Breakfast, in `DEPTS.bkf`), mai "Ditta BKF".

## Preferenze Turnazione nella Galleria, dietro PIN (16/11/2026)

Il Resident Manager fa i turni di tutti e vede **tutte** le richieste, come il QM in Compass;
sui PC della Galleria però lavorano anche i receptionist. Voce **Preferenze Turnazione** (sezione
*Turni* del menu) nell'app della Galleria, copia del modulo di Compass (rinomino `_tp`→`_gt`,
`turniPref`→`gtPref`), che si apre **solo col PIN**:

- **due PIN**: quello del **Resident** (lo sceglie lui al primo accesso, una volta sola; per
  cambiarlo il QM lo azzera) e quello del **QM** (lo sceglie il QM da Compass → Sicurezza →
  «PIN di Preferenze Turnazione — Galleria», dove può anche azzerare quello del Resident);
- li controlla il **Worker** (`/turni-pref`, azioni `stato`, `imposta-resident`, `imposta-qm`,
  `azzera-resident`, `apri`, `dati`): PIN mai in chiaro (sale + PBKDF2, chiavi `qm_pin_*`, che il
  codice della Galleria non legge); 5 PIN sbagliati fermano i tentativi 15 minuti;
- il PIN giusto dà un permesso `tp.` di **5 minuti**; le richieste si leggono solo con quello.
  L'app della Galleria **non conosce l'indirizzo del foglio** e **non salva** le richieste nel
  browser (restano in memoria e si cancellano chiudendo);
- si chiude **dopo 5 minuti** e con «Chiudi ora». **Cambiando voce** la pagina si svuota ma il
  permesso resta: tornando entro i 5 minuti non si rimette il PIN (`gtPrefEntra` → `_gtAperto`).
  Il QM l'ha chiesto il 16/11/2026: chiudere a ogni cambio di voce era troppo pesante (prima
  `bgSezione` chiamava `gtPrefChiudi`). Conto alla rovescia senza ridisegno (`#gt-resta`).
- Compass continua a leggere il foglio direttamente: l'indirizzo resta nel suo codice. Per
  chiuderlo davvero si potrà far passare anche Compass dal Worker e ripubblicare lo script
  Google con un indirizzo nuovo (variabile `TURNI_PREF_URL` del Worker).

Worker `2026-11-16a` (= `WORKER_VERSIONE_ATTESA`). Controlli in `test/galleria.js`; sabotaggio
(niente chiusura uscendo, niente scadenza, niente verifica del permesso) → 3 falliscono.

### Galleria: «Statistiche ricevimento e archivio turni» (19/11/2026)

Sottovoce di Preferenze Turnazione nell'app della Galleria (rientrata, con lucchetto), dietro lo
**stesso PIN** e gli stessi 5 minuti: chi ha aperto una delle due voci apre anche l'altra. Contiene
le card **Statistiche ricevimento** e **Turni archiviati**, copiate da Compass con rinomino
meccanico (`turni`→`gtu`, `_turni`→`_gtu`, `_turno`→`_gtuT`, `TURNI_`→`GTU_`, `DEPTS`→`GTU_DEPTS`):
**ogni correzione alle statistiche o all'archivio di Compass va riportata qui**. L'archivio
(`qm_turni_storico`) lo dà il Worker con l'azione `storico` di `/turni-pref`, solo col permesso
`tp.`; resta in memoria (`_gtuArch`) e si butta chiudendo. `gtPrefRender` instrada su `gtuRender`
quando la sezione è `statistiche`; schermata del PIN e barra «Aperto col PIN» sono comuni
(`_gtSchermataPin`, `_gtBanner`). Worker `2026-11-19a`.

**5 minuti dall'ultima attività** (19/11/2026, QM): non più dall'apertura. Ogni movimento sulla
pagina (`pointerdown`, `pointermove`, `keydown`, `wheel`, `touchstart`, `scroll`) aggiorna
`_gtUltimaAttivita` (`_gtAttivita`); `_gtAperto()` vuole permesso valido **e** meno di 5 minuti da
lì. Il permesso del Worker dura 5 minuti: con meno di 3 rimasti `_gtAttivita` chiede l'azione
`rinnova` (Worker `2026-11-19b`, serve un permesso ancora valido). L'orologio ogni secondo chiude
se si è fermi da 5 minuti; la barra dice «senza attività si chiude fra m:ss». Un movimento dopo la
chiusura non riapre: si rimette il PIN.

**Menu «B»** (19/11/2026, QM): nella Galleria il gruppo **Gestione Turnazione** ha un lucchetto solo,
sul titolo, e tre voci su una riga: **Preferenze**, **Statistiche ricevimento**, **Archivio turni**
(sezioni `preferenze`, `statistiche`, `archivio`; contenitori `gt-pref-content`, `gtu-content`,
`gtu-arch-content`). Il PIN è uno per tutto il gruppo: aperta una voce, le altre si aprono senza
rimetterlo finché non si chiude. `gtuRender` disegna statistiche o archivio secondo la sezione.

**Presenze Cascione** (19/11/2026 voce vuota; **modulo vero dal 23/11/2026**, QM): quarta voce del
gruppo Gestione Turnazione nella Galleria (sezione `presenze`, `_gbRenderPresenze`), dietro lo
stesso PIN (`gtPresenzeEntra`). Ogni mese il Front Office Manager manda al consulente Cascione un
foglio presenze **per società** (oggi Ge.Ri.Art., Booking Elite, Geriart Group).

- **Il modello è il foglio di Cascione**, caricato una volta per società («+ Carica foglio di
  Cascione»): nomi, numeri d'ordine (anche doppi: due «11» in Ge.Ri.Art.), ore al giorno (il numero
  più frequente della riga O: 8, 6, 5) e chi scrive le notti **NL** (chi le ha NL nel foglio,
  `notte`). **Il DVR non si usa** (scelta del QM). `_gpModello` cerca la riga «Cognome e nome» coi
  giorni 1–31 e le colonne dei totali **S**/**A** (Geriart Group ha solo la A), la cella dopo
  «Periodo» e per ogni persona le righe con D = O, S, A. Ricaricare il foglio di una società lo
  sostituisce (stesso nome → stesso id) e tiene gli agganci ai turni già scelti.
- **Aggancio ai turni** (`_gpAbbina`): cognome uguale al nome dei turni senza l'iniziale
  (nomi di esempio: «DE LUCA ANNA» = «De Luca A.», «Rossi Maria» = «Rossi L.» anche con l’iniziale diversa); con due candidati non sceglie.
  Si corregge in «Persone del foglio · nome nei turni». Chi non è agganciato, o non compare in
  nessun giorno del mese (es. l'amministrazione: `assente`), è **a mano** e lo dice un avviso.
- **Dal turno al foglio** (`_gpDaTurno`): lavoro = ore della persona; R/RIPOSO/RECUPERO/REC RIP =
  **R**; FERIE (anche «richieste») = **FE**; MALATTIA = **ML**; PERMESSO = **PE**; NC/NG = **NL**
  per i notturni, ore per gli altri (una notte fatta in emergenza = 8); vuoto o «-» = **-**. Un riposo o
  una ferie scritti in mezzo al codice («BRIGIDA RIPOSO SAL») contano lavoro ma vanno controllati.
  Giorni senza planning in archivio: vuoti, con l'avviso «Turni non caricati».
- **Prova su ottobre 2026**: ricostruito dall'archivio coincide coi tre fogli veri di Cascione giorno
  per giorno, tranne pochi cambi dell'ultimo minuto non ricaricati in Compass (si correggono a mano).
- **Niente riquadri** Persone / Da controllare / Corretti a mano (tolti il 23/11/2026, QM: non servono): in cima solo «Prima di inviare».
- **«+ Carica foglio di Cascione»** in alto solo finché non c'è nessun foglio; poi sta in fondo a «Persone del foglio» (QM, 23/11/2026). **R in rosso** come ML.
- **Chi non c'è più** (QM, 23/11/2026): in «Persone del foglio» il pulsante «Non c'è più da <mese
  mostrato>» mette `uscita` = 'AAAA-MM'. Da quel mese la persona sparisce dalla griglia e
  dall'Excel: `_gpTogliRighe` elimina le sue tre righe e sposta in su righe, celle, formule
  (`A18+1` → `A15+1`, `SUM(E14:AF14)` → `SUM(E11:AF11)`), celle unite (quelle tutte dentro le righe
  tolte spariscono), riquadro bloccato, selezione e dimensione. I mesi prima restano com'erano;
  «Rimetti» la riporta. Ricaricando il foglio l'uscita resta.
- **Verifica accurata del 23/11/2026** (QM: «il file deve essere esatto»). Trovato e corretto:
  - un **foglio di Cascione vuoto** (senza ore e senza data del periodo) faceva mettere **8 ore a
    chi ne fa 6** e lasciava il periodo vuoto, in silenzio. Ora le ore vengono SOLO dal foglio
    (`ore:''` se non ci sono); si indicano in «Persone del foglio» (`gpOre`, `oreAMano`, che resta
    ricaricando un foglio vuoto; stesso per «notti NL», `gpNotte`). Il periodo è la cella dopo
    la cella unita di «Periodo» (P5:V5 → W5) anche se vuota (`_gpUnite`). Senza ore o senza
    periodo **l'Excel non si scarica** (`_gpBloccanti`, avviso rosso «Da sistemare»);
  - chi **non compare nel turno di un giorno** ma c'è negli altri giorni della stessa settimana
    (un nome saltato leggendo il planning) ha «-» **da controllare** (`_gpNellaSettimana`);
  - con giorni da controllare lo scaricamento chiede conferma;
  - **formule condivise**: riscrivendo la cella madre le figlie restano col valore (`_gpScrivi`),
    altrimenti Excel chiederebbe di riparare;
  - giorni mancanti scritti come intervalli («3–5, 9»), non «primo–ultimo».
  Prova sui fogli veri con l'archivio del 23/11: i tre file di novembre coincidono **cella per
  cella** con un controllo scritto a parte in Python (zero differenze, periodo novembre 2026), e
  fuori dalle celle dei giorni restano **identici** al foglio di Cascione (valori, stili, celle
  unite, tutti gli altri file dello xlsx).
- **Righe S e A: le compila Cascione** (QM, 23/11/2026). Nella griglia sono vuote e non si toccano;
  nell'Excel i giorni S/A escono vuoti e i totali restano **la formula di Cascione** se c'è
  (Geriart Group `SUM(E11:AF11)`), mentre un numero scritto nel foglio caricato (i totali di ottobre
  di Ge.Ri.Art.) si svuota (`{svuota:true}` in `_gpCelleExport` / `_gpScrivi`).
- **Correzioni a mano** cella per cella (finestrella: ore, R, FE, ML, NL, PE o «Altro»; righe S e A di Cascione), segnate col pallino oro; «Rimetti dai turni» toglie la singola correzione,
  «Rimetti tutto dai turni» quelle del mese. Una correzione non salvata si dice e si annulla.
- **Scarica Excel per Cascione**: si riapre il SUO file e si riscrivono solo le celle dei giorni
  (oltre fine mese vuote), i totali S e A (al posto delle formule) e il periodo
  (`_gpCelleExport`, `_gpScrivi`: stile della cella tenuto, celle mancanti inserite in ordine).
  Lo zip si legge (`DecompressionStream`) e si riscrive senza compressione (`_gpZip`) qui, senza
  librerie da internet. Nome: «Novembre Presenze <società>.xlsx».
- **Dati**: `qm_presenze_cascione` = `{societa:{id:{…modello, persone, file base64}}, mesi:{'AAAA-MM|id':{o,s,a}}}`.
  Solo dal Worker col permesso del PIN: azioni `presenze` (lettura) e `presenze-salva` (una
  società, un mese o **una cella** per volta, rileggendo la chiave: due computer non si cancellano
  le correzioni). Bloccate anche dall'interruttore della Gestione Turnazione. Worker `2026-11-23a`.
  Nel backup di Compass (`QM_BACKUP_FISSE`). Chiudendo il PIN i dati si buttano dalla pagina.
- **Grasso si compila dal planning** (25/11/2026, QM: è nel foglio di Ge.Ri.Art. e «non si
  compilava»). Compass la toglieva dal planning (`TURNI_ESCLUSI`) e l'archivio non l'aveva mai.
  Ora l'AI la legge («compresa Grasso») e `_turniSenzaEsclusi` la **mette da parte** in
  `g.esclusi` invece di buttarla: turni, statistiche e Bilanciamento leggono solo `g.shifts`, quindi
  per loro non cambia niente; `turniVoceStorico`/`turniRipuliArchivio` (e le copie `gtu*` di Compass
  OPS) la portano in archivio (`_turniConEsclusi`); `_gpGiorniTurni` la unisce ai turni del giorno.
  Le settimane caricate PRIMA del 25/11 non la hanno: vanno ricaricate in Compass.
- **Persona aggiunta** (25/11/2026, QM: Cavaliere passata da Geriart Group a Ge.Ri.Art. da
  novembre, nel foglio di Cascione non c'è): «+ Aggiungi persona da <mese>» in «Persone del
  foglio» (`gpAggiungi`: nome come lo scrive Cascione, ore; aggancio ai turni dal cognome; numero =
  il più alto + 1). `aggiunta:true`, `entrata:'AAAA-MM'`: prima di quel mese non c'è (`_gpNelMese`),
  non conta fra chi non c'è più (`_gpUsciti`), «Togli» la toglie del tutto. Nell'Excel
  (`_gpConAggiunte` → `_gpInserisci`): le sue righe vanno **sotto l'ultima persona del foglio**,
  copiate dal blocco di quella (stile, altezza, celle unite, colonna D O/S/A; formule spostate come
  «copia e incolla» di Excel, le condivise riscritte per intero; valori vecchi tolti) e tutto quello
  che sta sotto scende (`_gpApriRighe`: righe, formule, celle unite, dimensione, selezioni). Nome e
  numero li scrive `_gpCelleExport` (il numero solo se la cella non ha la formula «=A12+1»:
  `tieniFormula`). Ricaricando il foglio di Cascione le aggiunte restano finché il foglio non le ha.
  Nell'altra società si usa «Non c'è più da <mese>».
- **Riferimento circolare corretto** (25/11/2026, trovato aprendo un Excel vero): togliendo una
  persona a metà elenco, il numero d'ordine «=A12+1» di quella dopo diventava «=A12+1» dentro A12.
  `_gpTogliRighe(xml,togli,h)`: una formula che nomina una riga tolta punta alla stessa riga della
  persona sopra (salto di `h` righe), così la numerazione continua. Con righe tolte o aggiunte
  l'Excel si ricalcola all'apertura (`_gpRicalcolaAllApertura`, `fullCalcOnLoad`). Provato con un
  .xlsx creato con openpyxl, passato nel browser e riaperto: file valido, numerazione 1-2-3.
- Controlli: «Presenze Cascione: foglio del consulente compilato dai turni» in `test/galleria.js`
  (foglio finto con nomi inventati; sabotaggi provati: codici, legenda, stile, formula, ordine
  delle celle, permesso del Worker, correzione non salvata).

**Attesa dopo il PIN** (19/11/2026, QM): mentre il Worker controlla il PIN e la pagina si apre,
al posto della schermata del PIN compare la bussola dello splash in piccolo, con l'ago che gira
(`_gtAttesa`, `_gtMostraAttesa`; «Verifica del PIN…», poi «Apertura…»). Ferma con
`prefers-reduced-motion`. Nello stesso giorno è stata tolta la rosa dei venti dal menu della
Galleria: con le voci nuove il menu è cresciuto e finiva sotto le voci.

**Finestrella del giorno** (19/11/2026, QM): nella settimana evidenziata, cliccando un giorno con
richieste (col filtro di reparto) si apre una finestra agganciata alla data (`turniPrefApriGiorno`,
`#tp-giorno-pop` dentro `#tp-cal-box`): giorno, numero di richieste e per ognuna nome, reparto,
tipo colorato, motivazione e data d'invio. Si chiude con la ×, cliccando fuori o con Esc. Gli
altri giorni filtrano l'elenco come prima. Stessa cosa nella Galleria (`gtPrefApriGiorno`).

**Scritte** (19/11/2026, QM): in alto a destra «Totale richieste fino alla settimana in oggetto · gg/mm – gg/mm», colonna «Totale richieste». Il conto resta quello dei 3 mesi prima della settimana (scelta confermata dal QM): cambia solo la scritta.

**Invito a cliccare** (20/11/2026, QM, dopo aver scartato l'anello che pulsava sui giorni): un
**fumetto blu a destra della settimana evidenziata**, alla sua altezza, con la punta verso i giorni,
che si avvicina e si allontana piano: «Clicca su un giorno per vedere le richieste — della settimana
evidenziata». Lo mette `_tpPosaInvito` dopo il disegno, agganciato all'ultimo giorno della riga
(`data-tp-sett`); sparisce al primo giorno aperto (`_tpInvitoVisto`) e si rimette a posto se cambia
la finestra. Stile `.tp-invito-fum` in `style.css`. Uguale nella Galleria (`_gtPosaInvito`).

**21/11/2026 (QM)**: codici nuovi in `turniNormalizza` — `INT` da solo = **P**, `P GALL` = **P Gall**,
`P RIP SPOST AL 18/7` e `RIP.REC. DEL 11/07` (tutto ciò che comincia con «RIP» o «P RIP») =
**riposo**. Con l'archivio del 21/11 non resta nessun codice non riconosciuto. **Abdalla** si conta
dal **01/10/2026** (`TURNI_DAL`, scritto «· dal 01/10» accanto al nome); fino al 30/09 c'era
Iannario. **Turni archiviati** raccolti per **anno** e **mese** (`turniArchivioGruppo`,
`_turniGruppi`): aperti l'anno in corso e il mese della settimana mostrata. Tutto uguale nella
Galleria (`gtu…`).

**21/11/2026, correzioni (QM):** tornano le colonne **Art Resort (Galleria)** e **SoulArt (Carità)**,
tolte per errore il 19/11 (l'elenco del QM non le nominava, ma non andavano tolte): ordine P,
Intermedi, Mattine, Pomeriggi, Notti, Riposo domenicale, Art Resort, SoulArt, Malattia, Ferie.
Nella Galleria mancava **D'Andrea**: `_gbJson` toglie l'apostrofo dalle chiavi e nell'archivio le
persone sono chiavi. `_gtChiedi` usa ora `_gtJson`, che lo lascia. Un controllo in
`test/galleria.js` confronta **ogni funzione** di statistiche e archivio della Galleria con
quella di Compass (rinominata all'indietro) e gli elenchi: devono essere identici.

### Planning caricati a ritroso (21/11/2026)

Il QM carica i planning vecchi, fino a gennaio 2026, per avere le statistiche reali del 2026.
(Un primo tentativo dello stesso giorno li bloccava come «date lette male»: era sbagliato ed è
stato tolto.) Ora:
- una settimana **già finita** (`_turnoPassato`) si **archivia** e basta: `handleTurniFile` non
  scrive `qm_weekData` e dice «Archiviata: …»; il turno corrente salvato non cambia;
- `loadWeekData` archivia sempre e, se la settimana è passata, mostra nella Turnazione corrente la
  settimana in corso presa dall'archivio (`_turnoCorrenteDaArchivio`);
- l'archivio conta dal **01/01/2026** (`TURNI_INIZIO`, anche nella Galleria);
- `_annoPlausibile`: una data passata dell'anno in corso resta nell'anno; nessuna correzione
  sposta una data più di 30 giorni nel futuro (la settimana 29/12/2025–04/01/2026 resta lì);
- il prompt dell'AI dice che il planning può essere di una settimana passata: leggere le date
  scritte senza spostarle verso oggi.


### Preferenze Turnazione: settimana prossima intera a cavallo del mese (23/11/2026)

**Difetto** (segnalato dal QM con una foto): con la settimana prossima 30/11 – 06/12, il
calendario di novembre mostrava solo il 30. Il riquadro oro copriva quindi una colonna sola, e la
sua linguetta «Settimana prossima» (testo su una riga) allargava quella colonna; le colonne erano
`1fr`, tutte uguali, e il calendario usciva dai suoi 360 px finendo sotto la tabella «Chi chiede».

**Correzione**, in Compass e identica nella Galleria:
- `_tpCelleMese(anno,mese,settimana)` (`_gtCelleMese` nella Galleria) dà le celle del mese con
  riga e colonna e, se la settimana prossima tocca il mese, aggiunge **nella stessa riga** i suoi
  giorni del mese accanto (`fuori:true`, con il mese scritto piccolo: «1 dic», «30 nov»).
  Le celle escono ordinate per riga e colonna: il riquadro prende la prima e l'ultima (a dicembre
  il 30/11 finiva in fondo e il riquadro si sarebbe disegnato al contrario).
- Griglia in classe `.tp-cal-griglia` con `repeat(7,minmax(0,1fr))`: nessun contenuto può più
  allargare le colonne. Regola generale: mai `1fr` da solo in una griglia che contiene testo che
  non va a capo.

Controlli in `test/controlli.js` ("Preferenze Turnazione: la settimana prossima intera anche a
cavallo del mese") e `test/galleria.js` (copia identica), verificati con tre sabotaggi.

Stesso giorno, richiesta del QM («da fastidio»): quando la settimana prossima è la **prima riga**
del mese, la linguetta oro copriva le lettere dei giorni (L M M…). Ora in quel caso la griglia
prende la classe `tp-sett-prima` e le intestazioni (`.tp-cal-int`) hanno 20 px di spazio sotto,
dove sta la linguetta. Negli altri mesi il calendario resta com'era. Controlli in
`test/controlli.js`, `test/galleria.js` e `test/esegui.sh` (regola CSS).
