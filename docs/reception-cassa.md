# Reception — Cassa

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

## Reception — Cassa (reception.html)

### Scopo

App standalone **desktop** (non mobile-first: usata sui PC di reception, non su smartphone) per la gestione di due registri distinti, mai unificati:

- **Fondo Cassa**: fondo fisso da €100, contato a ogni cambio turno, temporaneamente ridotto dai buoni spesa e riportato a 100 dall'amministrazione.
- **Incasso Contante**: cassa separata, consegnata a 3 fasce fisse (07:00 / 15:00 / 23:00), nessun legame col fondo cassa.

I receptionist operano solo su questa app (non accedono a Compass regolarmente — Compass resta un pannello di controllo per il QM). Sezione di menu dedicata **"Reception"** in Compass, voce **"Passaggi di Cassa"** (→ `view-reception`) — legge lo stesso KV in sola lettura + **modifica libera di qualunque voce** per il QM.

### Modello dati — registro di movimenti, mai un numero solo

Due chiavi KV, ciascuna un array JSON di movimenti:

| Chiave | Contenuto |
|--------|-----------|
| `qm_cassa_fondo` | `{id, ts, tipo:'conteggio'\|'buono'\|'ripristino', importo, importoIncasso, motivazione, persona, nota, edits:[]}` — `importo` = quota a carico del fondo cassa (letta da `fondoSaldo()`), `importoIncasso` = quota pagata dall'incasso giornaliero (non tocca il fondo), solo su `tipo:'buono'` |
| `qm_cassa_incasso` | `{id, ts, fascia:'07'\|'15'\|'23', importo, consegnaDa, consegnaA, nota, edits:[]}` |

Il saldo del fondo cassa **non è mai un campo modificabile a mano**: si calcola sempre a partire dall'**ultimo conteggio fisico registrato** (non sempre dai 100 ideali) + i buoni/ripristini avvenuti dopo (`fondoSaldo()` in `reception.html`, `_receptionFondoSaldo()` in `app.js` — stessa formula in entrambi i posti, tenerla allineata se cambia). Se non è mai stato fatto un conteggio, si parte dai 100 di default.

Il conteggio a inizio turno spesso non torna (es. 98€ invece di 100€) e **nessuno sa spiegare perché** — va comunque accettato: chi arriva in turno non può bloccarsi in attesa di una spiegazione. Ogni conteggio registra `atteso` (il saldo calcolato subito prima) e `differenza` (`importo - atteso`): la discrepanza resta sempre visibile nello storico, spiegata o no, ma **diventa la nuova base reale** su cui contare i buoni successivi — altrimenti il saldo calcolato diverge subito dalla cassa fisica (es. contati 98€, buono da 5€: il saldo dev'essere 93€, non 95€ come sarebbe partendo sempre dai 100 ideali).

### Fondo cassa = Contanti + Buoni spesa in essere (`fondoBreakdown()`)

Il fondo non è un solo numero: è **contanti fisici + buoni spesa non ancora rimborsati dall'amministrazione**. Un buono spesa è un cambio di forma del denaro (contante → voucher), non una perdita — quindi il **totale non deve scendere solo perché è stato emesso un buono legittimo** (es. fondo a 100€, buono da 20€ preso: contanti 80€, buoni 20€, totale resta 100€; solo un vero ammanco riscontrato al conteggio fa scendere il totale).

- `fondoSaldo()` (`reception.html`) / `_receptionFondoSaldo()` (`app.js`) restano **invariate**: calcolano solo i **contanti** (formula ad ancoraggio sull'ultimo conteggio, vedi sopra).
- `fondoBreakdown()` (`reception.html`) / `_receptionFondoBreakdown()` (`app.js` — stessa formula, tenerle allineate) calcolano separatamente i **buoni in essere**: ripartono dal campo `buoniSpesa` salvato sull'ultimo conteggio (0 se assente — conteggi vecchi restano "tutto contanti", nessuna migrazione dati necessaria), poi `+= buono.importo` e `-= ripristino.importo` per i movimenti successivi (un ripristino salda/rimborsa i buoni in essere). Ritornano `{contanti, buoni, saldo}` con `saldo = contanti + buoni` — è questo **saldo/totale**, non i soli contanti, il numero mostrato come "Fondo cassa attuale" e confrontato con `FONDO_TARGET` per il tag ✓/⚠.
- Nel modal "Conta e conferma fondo cassa": il campo si chiama **"Contanti (€)"** (non più "Importo contato"), sotto compare in sola lettura "Buoni spesa in essere (€)" (dal breakdown corrente) e poi il **"Totale fondo cassa"** = contanti inseriti + buoni correnti. `saveConta()` salva `contanti`, `buoniSpesa` (istantanea, non cambia col solo conteggio) e usa `importo:contanti` (il campo che `fondoSaldo()` legge come base) — **non** `contanti+buoniSpesa`: se `importo` includesse anche i buoni, la formula dei contanti si gonfierebbe permanentemente del valore dei buoni ancora in essere. `atteso`/`differenza` restano confrontati **solo sui contanti** (mai sul totale), altrimenti un buono legittimo genererebbe una differenza fittizia.
- **Home — vere kpi-card di Compass, non un totale grande**: scrivere solo il totale come cifra principale era fuorviante — un receptionist con 70€ fisici in cassa e 30€ di buoni in essere leggeva "€ 100,00" e lo interpretava come contante disponibile. Dopo due iterazioni (prima due numeri alla pari in un'unica card, poi questa versione) "Contanti" e "Buoni spesa" (etichette accorciate — non più "in cassa"/"in essere") sono ora **due vere kpi-card** — stesso componente di `style.css`/Overview (`.kpi-card`, bordo colorato 4px in cima, icona quadrata nell'angolo, numero leggero 30px), non un pannello inventato per questa pagina — più una terza card compatta per il Totale col tag di stato. In `reception.html` le classi `.kpi-card`/`.kpi-card-icon`/`.kpi-label`/`.kpi-value`/`.kpi-total-card` sono ridefinite nel `<style>` locale con i token navy/oro della app; lato Compass (`receptionRender()` in `app.js`) sono le **stesse identiche classi** di `style.css`, riusate direttamente (non duplicate).
- **Font dei bottoni azione**: `.btn` in `reception.html` usa `font-weight:500` (non 600 — più leggero) e `font-family:'Helvetica Neue',Helvetica,Arial,sans-serif` esplicito, lo stesso font che i bottoni reali di Compass (`.btn-primary`, `.wday-btn`, `.rev-tone-btn` in `style.css`) impostano esplicitamente invece di ereditare lo stack di sistema (`-apple-system`) usato dal resto della pagina.

### Buono pagato dall'incasso giornaliero, non dal fondo cassa

Un buono spesa **non è sempre** prelevato dal fondo cassa: spesso viene pagato con la cassa dell'incasso giornaliero (i contanti del servizio, non ancora consegnati), e in quel caso **non deve** ridurre il fondo cassa — quei soldi non ci sono mai passati.

Il modulo "Nuovo buono spesa" ha quindi **due campi importo**: "Importo prelevato da fondo cassa (€)" (`buono-importo`, invariato nell'id) e "Importo prelevato da incasso giornaliero (€)" (`buono-importo-incasso`, nuovo) — almeno uno dei due dev'essere > 0. Il movimento salvato ha `importo` (quota fondo cassa — **stesso campo di sempre**, letto da `fondoSaldo()`/`fondoBreakdown()` senza alcuna modifica a quelle formule) e `importoIncasso` (quota incasso, nuovo campo, ignorata dai calcoli del fondo). Un buono può quindi essere: tutto da fondo, tutto da incasso (`importo:0`), o misto.

Nello storico del fondo cassa, un buono con `importo<=0` mostra "—" invece di "-€0,00" (fuorviante), con una nota "(+ X da incasso)" quando `importoIncasso>0`. Nello stampato A4 l'importo totale resta `importo+importoIncasso`, con una riga extra "di cui da fondo cassa X · da incasso giornaliero Y" solo quando entrambe le quote sono valorizzate.

Nel tab Incasso Contante (sia `reception.html` sia il pannello Compass) un riquadro informativo elenca i buoni di oggi pagati dall'incasso (`renderIncassoBuoniInfo()` in `reception.html`, blocco equivalente dentro `receptionRender()` in `app.js`) — **derivato da `_fondo`/`_receptionFondo`, nessuna nuova chiave KV**: serve solo a spiegare perché il contante consegnato è più basso del previsto.

### "Sposta a incasso" — come si ripristina il fondo senza un ripristino amministrativo

Caso frequente: un buono già registrato a carico del fondo cassa viene in un secondo momento **riclassificato** come pagato dall'incasso giornaliero (es. l'amministrazione decide di far assorbire quella spesa dall'incasso), così il fondo cassa torna (in tutto o in parte) al suo valore senza che l'amministrazione debba fare un vero ripristino in contanti.

`spostaBuonoAIncasso(id)` in `reception.html` / `receptionSpostaBuonoIncasso(id)` in `app.js` (stessa logica): chiede quanto spostare (max = `importo` corrente del buono), sposta quella cifra da `importo` a `importoIncasso` sullo stesso movimento (non crea un nuovo movimento), e registra un `edits[]` con vecchio/nuovo valore di entrambi i campi e motivo — mai una correzione silenziosa. Poiché `fondoSaldo()`/`fondoBreakdown()` leggono solo `m.importo` per i buoni, ridurre `importo` fa automaticamente risalire i "contanti" stimati e scendere i "buoni in essere" della stessa cifra, senza toccare il totale. Link "sposta a incasso" visibile solo sulle righe `tipo:'buono'` con `importo>0` (niente da spostare altrimenti).

### Scrittura sicura dei registri — due postazioni non si cancellano i movimenti

Stessa classe di problema dei pre-stay (22/08/2026), su denaro contato: `kvSetLocal` (`reception.html`) e `_receptionSave` (`app.js`) scrivevano **l'elenco intero** con la copia che quella postazione si portava dietro. Due receptionist che registravano nello stesso momento da due PC si cancellavano un movimento a testa, in silenzio — e il polling a 30s che *sostituiva* `_fondo` con la copia del cloud faceva sparire anche in locale un movimento la cui scrittura non era andata a buon fine.

Ora si rilegge e si **unisce per `id`** (`_cassaUnisci`, stessa funzione duplicata nei due file — `test/esegui.sh` controlla che ci sia in entrambi):

- un movimento non sparisce mai perché un'altra postazione aveva una copia più vecchia;
- a parità di `id` vince la versione con **più `edits`**, che per costruzione è la più recente;
- l'unione vale anche nel polling e all'avvio: si unisce alla copia in memoria, non la si sostituisce;
- senza aver mai letto il cloud in quella sessione **non si scrive** — sarebbe sovrascrivere alla cieca.

**Le eliminazioni hanno bisogno di una traccia.** Con l'unione, un movimento eliminato tornerebbe dentro a ogni salvataggio. L'id finisce quindi in **`qm_cassa_rimossi`** (`{fondo:[…],incasso:[…]}`), chiave **separata** per non cambiare la forma degli array che `reception.html` e Compass si scambiano da sempre. Va segnato **prima** di salvare l'elenco, altrimenti l'unione dentro il salvataggio rimette dentro ciò che si è appena tolto. Gli id rimossi si uniscono a loro volta fra postazioni: sono stringhe, l'unione non può che crescere.

**Limite noto**: `cancellaMovimento` è ora `async`; i suoi `onclick` ignorano la promessa, come già facevano. E una postazione ferma da meno di un minuto può ancora far riapparire per un giro un movimento eliminato altrove — l'eliminazione è rara e voluta, mentre perdere un movimento registrato è il danno grave: la priorità è quella.

### Modifica con storico, non sovrascrittura silenziosa

Ogni voce è **sempre modificabile** (dalla reception i movimenti recenti, da Compass qualsiasi voce), ma ogni correzione aggiunge una riga a `m.edits` (`{ts, persona, campo, vecchio, nuovo, motivo}`) invece di sostituire il valore senza lasciare traccia — "deve rimanere traccia di tutto" anche quando si corregge un errore di battitura. La tabella mostra `(corretto N×)` accanto a ogni voce già modificata.

### App reception (`reception.html`)

**Allineamento ai token reali di Compass (`style.css`)**: alcuni dettagli visivi introdotti durante lo sviluppo (badge circolari con anello oro, numeri in grassetto, raggi larghi 12-14px) erano invenzioni di sessione, non il linguaggio visivo effettivo del resto della dashboard. Corretti per coerenza con `.panel`/`.kpi-card`/`.btn-primary` in `style.css`:
- Card con `border-top:4px solid var(--gold)` (4px, non un bordo sottile uniforme) — firma di ogni `.panel`/`.kpi-card` in Compass.
- Numero grande (fondo cassa, incasso) in `font-weight:300` (non 800), come `.kpi-value` — le cifre pesanti non fanno parte del linguaggio Compass.
- Raggi stretti: 8px per card/tabelle/modal, 6px per bottoni e campi input (`--r:8px`, prima 12px).
- Bottoni con hover a sollevamento + ombra tinta navy (`transform:translateY(-2px)`, come `.btn-primary:hover` reale), non più statici.
- Badge azione (`.act-btn`) e badge Tipo (`.tipo-badge`) sono quadrati arrotondati (7px) con sfondo tinto e icona dello stesso colore (`var(--navy-bg)`/`var(--navy)`), non più cerchi pieni con anello oro — stessa coppia sfondo-tinto/icona-colorata di `.kpi-card-icon` nel resto della dashboard. Sui bottoni azione principali (`.btn-badge`), il badge dei bottoni secondari (bianchi) segue la stessa logica; quello dei bottoni primari (navy pieno) resta un quadrato bianco-translucido con icona bianca, perché lì lo sfondo è già navy.

- Due tab: **Fondo Cassa** (bottoni "Conta e conferma fondo cassa" / "Nuovo buono spesa": importo, **motivazione** in testo libero — obbligatoria, sopra "Chi preleva" nel modulo — poi persona; niente più causale a chip, tolta su richiesta) e **Incasso Contante** (bottone "Conta e consegna incasso" con fascia a chip 07/15/23).
- Il movimento `tipo:'buono'` ha campo `motivazione` (obbligatorio), non più `causale`/`nota`. `renderFondo()`/`receptionRender()` (Compass) leggono `m.motivazione||m.nota` per compatibilità con eventuali voci salvate prima di questo cambio.

### Stampa A4 del buono spesa

Ogni riga `tipo:'buono'` nello storico ha un link **"stampa"** (accanto a "correggi", sia in `reception.html` sia nel pannello Compass) — `printBuono(id)` / `receptionPrintBuono(id)`, stesso template duplicato nei due file (nessuna condivisione di codice tra standalone app e `app.js`, pattern consolidato). Genera un documento A4 **volutamente semplice**: solo testo nero e sottolineature, niente logo né sfondi pieni — va all'amministrazione, non serve una veste elaborata, e consuma meno toner.

Il modulo "Nuovo buono spesa" ha **un solo bottone**, "🖨️ Salva e stampa" — il "Salva" semplice (senza stampa) è stato tolto perché non serve: `saveBuono()` salva il movimento e chiama sempre `printBuono(m.id)` sul nuovo id, senza dover poi cercare la riga nello storico.

### Icone bottoni azione — badge Compass (navy/gold)

I tre bottoni principali ("Conta e conferma fondo cassa" / "Nuovo buono spesa" / "Conta e consegna incasso") usano un badge circolare `.btn-badge` (cerchio navy `var(--navy)`, anello gold `var(--gold)`, 26px) al posto dell'emoji — stesso linguaggio visivo del logo bussola e delle icone del Pannello App. Scelte dopo un'esplorazione con varianti multiple (`euro_icons.html`, `reception_icons.html` nello scratchpad di sessione): glifo € pieno/solido per "Conta e conferma fondo cassa", icona modulo/foglio per "Nuovo buono spesa", icona banconota per "Conta e consegna incasso".

### Icone azione nello storico movimenti — pulsanti circolari, non link testuali

I link testuali ("stampa"/"sposta a incasso"/"correggi") impilati in una colonna stretta si accatastavano su più righe, illeggibili. Sostituiti con pulsanti circolari `.act-btn` (28px, sfondo `var(--navy-bg)`, icona stroke `var(--navy)`) affiancati in `.act-row` — stesse icone SVG di `ICON_STAMPA`/`ICON_SPOSTA`/`ICON_CORREGGI` in `reception.html`. Lato Compass (`app.js`), stesso pattern ma con i colori del design system principale (`var(--accent)`/`var(--accent-bg)`, non `--navy`/`--navy-bg` che lì non esistono — nota: `var(--accent)` in `style.css` è comunque lo stesso navy `#1c3a5e`, quindi visivamente identico) tramite l'helper `_receptionActBtn(icon,tip,onclick)` e le costanti `RECEPTION_ICON_*`.

**Didascalia al passaggio del mouse — bolla stile Compass, non tooltip nativo del browser.** Il `title` HTML nativo ha uno stile di sistema non personalizzabile: sostituito con l'attributo `data-tip` letto da CSS (`content:attr(data-tip)` su `::after`, freccetta su `::before`), bolla navy/accent con testo bianco che appare in dissolvenza sopra il pulsante. In `reception.html` è la regola `.act-btn::after`/`.act-btn::before` nel `<style>` inline; lato Compass è la classe `.rc-act-btn` in `style.css` (v239+, cache buster incrementato) — stessa tecnica, nessuna dipendenza da libreria esterna.

### Formato euro — spazio tra simbolo e cifra

`fmtEuro()` (`reception.html`) / `_receptionFmtEuro()` (`app.js`) restituiscono `"€ 98,00"` (spazio dopo il simbolo), non più `"€98,00"` — vale ovunque nell'app perché tutte le cifre passano da questa unica funzione (storico, stato, stampa A4).

### Icona "Elimina" nello storico movimenti

Quarta icona accanto a stampa/sposta/correggi: `cancellaMovimento(key,id)` in `reception.html` / `receptionDeleteFondo(id)`+`receptionDeleteIncasso(id)` in `app.js`. A differenza di "correggi" (che aggiunge sempre un `edits[]`, mai sovrascrittura silenziosa), questa è una **rimozione definitiva** dell'intero movimento dall'array — riservata a voci inserite per errore (doppioni, prove), con conferma `confirm()` esplicita prima di procedere. Non lascia traccia nello storico (a differenza di ogni altra modifica in questa app) — usarla con cautela, non per correggere un importo sbagliato (per quello c'è "correggi").

### Badge Tipo nello storico — niente più emoji

La colonna "Tipo" mostrava emoji (🧮/🧾/🔄) davanti al nome del movimento. Sostituite con lo stesso badge circolare navy/gold usato sui bottoni azione, con l'icona SVG coerente: euro pieno per "Conteggio" (stessa icona di "Conta e conferma fondo cassa"), modulo/foglio per "Buono spesa" (stessa icona di "Nuovo buono spesa"), frecce cicliche per "Ripristino". `TIPO_ICON`/`TIPO_LBL` in `reception.html` (classe `.tipo-badge`/`.tipo-cell`); `RECEPTION_TIPO_ICON`/`_receptionTipoCell()` in `app.js` (badge inline con `var(--accent)`, stesso pattern). `RECEPTION_TIPO_LBL` resta testo puro (serve anche dentro un `prompt()` in `receptionEditFondo()`, che non può contenere HTML).

Campi: data/ora dal movimento, importo, **Consegna (amministrativo)** = `m.persona` (chi ha prelevato in app), **Riceve** = sempre lasciato in bianco (l'app non cattura chi riceve materialmente il denaro), motivazione, due righe firma in fondo (consegna/riceve). Apertura con `window.open('','_blank')` + `document.write()` + `print()` dopo 400ms, stesso pattern già usato altrove nel dashboard (es. `cmPrintBottle()`).
- Stato sempre visibile in alto: saldo fondo cassa con tag "✓ in regola" / "mancano X€"; prossima consegna incasso con tag "✓ consegnata" / "⚠ non ancora consegnata" — pensato per restare aperta su schermo a reception, non per essere cercata quando serve.
- `incassoStatus()` determina la fascia "dovuta" dall'ora corrente (07-15 → dovuta 07, 15-23 → dovuta 15, 23-07 → dovuta 23) e controlla se esiste già una consegna di quella fascia per la data odierna.
- **"Aggiungi al fondo cassa"** (`openRipristinoModal()`/`saveRipristino()`): permette anche al receptionist di registrare un'aggiunta al fondo (es. ripristino ricevuto dall'amministrazione, arrotondamento) — stesso `tipo:'ripristino'` già usato da `fondoSaldo()`/`fondoBreakdown()`, nessuna nuova formula. Prima esisteva solo su Compass (`receptionAddRipristino()`, ancora presente e usata anche lì) — ora è disponibile su entrambi i lati.
- `STAFF` è una copia hardcoded di `DEPTS.fo.members` **ridotta**: esclude Imparato G., Barbosa D., Maddaloni M., D'Andrea F., Extra Night, Extra Angelica, Extra Benedetta (non gestiscono la cassa) — a differenza di `ROOMS` in `controllo-mattino.html`, qui l'elenco NON coincide col reparto FO completo di `app.js`. Tenerlo allineato manualmente solo per le persone che maneggiano davvero la cassa, non ad ogni cambio dello staff FO.
- Il campo "Chi conta" nel modal "Conta e conferma fondo cassa" si chiama **"Operatore di reception"** (non più "Chi conta").
- Stessa schermata di manutenzione delle altre app standalone (`qm_app_status`, chiave `cassa` — non ancora agganciata al Pannello App/toggle on-off: se serve, aggiungere `'cassa'` a `MINIAPP_KEYS` in `app.js` e una card nella vista Pannello App, stesso schema delle altre 5 app).

### Lato Compass (`app.js` §§ RECEPTION — CASSA, `index.html` `#view-reception`)

`receptionLoad()` (chiamata da `setView('reception',...)`) legge entrambe le chiavi KV e chiama `receptionRender()`. Modifica via `receptionEditFondo(id)` / `receptionEditIncasso(id)` — usano `prompt()` per nuovo importo e motivo (stesso pattern di modifica rapida già usato altrove nel dashboard, es. `editShift`), non un modale dedicato.

---
