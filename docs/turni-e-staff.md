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
| Domeniche | domeniche **di riposo** |
| Art Resort / SoulArt | dove ha lavorato: `AG`/`CG`/`INT GALL` da un lato, `AC`/`CC`/`INT CAR` dall'altro |
| Malattia / Ferie | assenze esplicite |

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

#### Codici scritti a mano — `turniNormalizza()`

I turni arrivano da una foto del planning, scritti da persone diverse: `R`, `R RICHIESTO`,
`R RECUPERO 23/08`, `P (EX R)`, `INT CAR 9/17`. Vengono ricondotti a categorie.

**Una nota fra parentesi non fa un turno diverso**: `AC (CALL)` è un `AC`. Si prova prima il
codice così com'è — esistono sigle che le parentesi le usano davvero, come `INT (GALL)` — e
solo se non lo si riconosce si riprova senza la nota. Un codice davvero sconosciuto resta
"non riconosciuto" ed è segnalato in un riquadro: **non entra in nessun conteggio**, ed è
giusto che si veda.

#### Turni archiviati — sfogliare una settimana passata

Sotto le statistiche, il pannello **Turni archiviati**: un pulsante per settimana
(`turniArchivioSettimane()`), e cliccandone uno la tabella persone × 7 giorni con i codici
originali (`turniRenderArchivio()`). Mostra **chi compare in quella settimana**, non chi è in
organico oggi: un extra di tre settimane fa deve restare visibile, altrimenti il turno
archiviato non è più quello che era. Ricevimento in alto, poi housekeeping e altri; riposi,
ferie e malattie **in rosso**, con filetto verticale fra i giorni.

#### L'anno sbagliato e la settimana doppia

Il planning è una foto e l'anno spesso non c'è. Il 24/08/2026 la settimana 17-23 agosto è
finita in archivio **due volte**, una col 2025 e una col 2026: le statistiche la contavano
due volte, la prima con i dati vecchi, e nessun avviso da nessuna parte — i numeri sembravano
solo un po' alti. Ora `turniVoceStorico()` normalizza l'anno con `_annoPlausibile()`, e
`turniRipuliArchivio()` fonde **in lettura** le voci già scritte (nessuna scrittura KV),
ripulendo l'archivio vero al caricamento successivo.

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

## Preferenze Turni

### Foglio Google collegato

`https://docs.google.com/spreadsheets/d/1KysJxvGY-PxCSrjdWMjYCz_7KlFOIG6bSe3fXCVfObo`

Apps Script: `TURNI_PREF_URL = 'https://script.google.com/macros/s/AKfycbzCbHxJbSfxg8X49w2JlfI9xo3HqhDiOa6E_0SDstdrvpQTQfqd2euaGp1oIK3zo0CA/exec'`

Usa `typeof v.getTime === 'function'` invece di `instanceof Date` per evitare bug Apps Script.

### Click su un giorno del calendario — lista piatta, non raggruppata per mese

`turniPrefRender()` filtra correttamente `items` per `_tpCalDay` (giorno **richiesto**, `r.giornoRichiesto`), ma il rendering della lista raggruppava comunque i risultati per **mese di invio** della richiesta (`r.ts`) — due richieste per lo stesso giorno ma inviate in mesi diversi finivano sotto etichette di mese diverse, invece di comparire subito insieme. Quando `_tpCalDay` è valorizzato, la lista è ora **piatta** (un solo titolo "Richieste per il gg/MM/yyyy", tutte le righe sotto, nessun raggruppamento) — il raggruppamento per mese resta solo quando non è selezionato nessun giorno (vista di navigazione libera di tutte le richieste).

---
