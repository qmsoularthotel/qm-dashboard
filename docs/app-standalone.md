# App standalone, Pannello di Controllo, DVR, Service worker

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

## DVR — Documento Valutazione Rischi

### Scopo

Gestione dipendenti e documenti DVR per ogni società del gruppo. Dati persistiti in localStorage + KV con chiave `qm_dvr`.

**Voce sidebar**: la sezione menu che contiene il link DVR si chiama **"Fascicolo Dipendenti"** (rinominata da "Sicurezza" — la vista contiene anche anagrafica dipendenti, attestati e scadenze visite mediche, non solo il Documento di Valutazione dei Rischi in senso stretto). Aggiornare sia `index.html` (`nav-section`) sia `app.js` (`breadcrumbs.dvr`) se si rinomina di nuovo — vanno tenuti allineati manualmente, non c'è una fonte unica.

### Lista Dipendenti — Ordinamento

L'elenco dei dipendenti è ordinato con **pin fisso**:
1. **Corduas Vincenzo** — sempre primo
2. **Presta Pierpaolo** — sempre secondo
3. Contratti a termine ordinati per data scadenza (più vicina prima)
4. Tutti gli altri in ordine alfabetico

### Scadenze Contratto — Colori

| Stato | Colore | Stile riga |
|-------|--------|-----------|
| Scaduto (`daysLeft < 0`) | `var(--red)` + bg rosso | `border-left: 3px solid var(--red)` |
| In scadenza (`0 ≤ daysLeft ≤ 30`) | `var(--amber)` + etichetta `⏳ scad. gg/mm (Ngg)` | `border-left: 3px solid var(--amber)` |
| Ok (`daysLeft > 30`) | `var(--text-dim)` | nessun bordo |

---

## Service Worker (`sw.js`)

Versione corrente: **`qm-v26`**. Pattern:
- **Proxy/KV/Google Sheets/cataloghi barcode** → sempre network, mai cache
- **HTML files** → **sempre rete, mai cache** (`cache:'no-store'`, nessun ripiego). Non è una svista: la copia salvata veniva servita quando la rete al risveglio non rispondeva subito — cioè all'apertura dell'app da spenta — e riapparivano versioni vecchie all'infinito. GitHub Pages manda inoltre `cache-control: max-age=600` sugli HTML, quindi senza `no-store` il telefono riusa comunque la pagina per 10 minuti. **Prezzo accettato**: senza rete le pagine non si aprono (vivono di dati cloud, e una pagina vecchia che mostra numeri sbagliati è peggio di una che non si apre)
- **Asset statici** → cache-first (il cache buster gestisce gli aggiornamenti)

### UN SOLO service worker per tutto il sito — non reintrodurne uno per app

`sw.js` è registrato da `index.html`, `housekeeper.html`, `controllo-mattino.html`,
`inventory.html` e `dvr.html`. `breakfast.html` non ne registra nessuno (mai avuto).

Fino al 2026-08-18 esistevano **quattro** service worker (`sw-housekeeper.js`,
`sw-inventory.js`, `sw-dvr.js` e questo), ognuno registrato dalla propria app ma tutti
**sullo stesso scope radice**. Il browser tiene un solo service worker per scope: ogni
app che si apriva *sostituiva* la registrazione della precedente, e all'attivazione
eseguiva `caches.keys().filter(k => k !== CACHE).map(delete)` — cancellando quindi le
cache delle altre app, che non riconosceva come proprie. Le pagine venivano così servite
a intermittenza da versioni diverse (sintomo osservato: lo splash a volte vecchio a volte
nuovo, senza una regola apparente). Tre dei quattro avevano anche perso il
`cache:'no-store'` sull'HTML, che peggiorava la cosa ma **non ne era la causa**.

I tre file per-app (`sw-housekeeper.js`, `sw-inventory.js`, `sw-dvr.js`) sono stati
**eliminati** il 2026-08-20, a migrazione conclusa: nessuna pagina li referenziava più. Se
un dispositivo molto vecchio provasse ancora a registrarli, `register()` fallisce e il
`.catch()` già presente lo assorbe — l'app resta usabile, semplicemente senza service
worker finché non ricarica. **Non reintrodurli.** Se serve cambiare la strategia di cache,
si cambia solo qui.

`sw-controllo-mattino.js` è legacy e si auto-disinstalla. Non modificarlo.

---

## Registration Cards Galleria — un'app a sé, fuori da Compass

`registration-galleria.html`. È il file HTML che i colleghi dell'altra struttura già usavano
per generare le registration card: legge il PDF arrivi del PMS con pdf.js **dentro il
browser** e stampa le schede A4 (dati carta di credito e firma inclusi, da compilare a
mano). Il loro codice non è stato riscritto: è quello, con in più l'aggiornamento
automatico e la veste grafica Compass.

**Perché non è una vista dentro Compass**: i colleghi non hanno (e non devono avere) accesso
a Compass, che resta il pannello del QM. Serviva una pagina loro, con un indirizzo loro.

**Non manda NIENTE sul cloud, ed è una scelta, non una dimenticanza.** Legge il PDF nel
browser e stampa: nomi degli ospiti, date, camere e dati della carta non escono da lì.

**Dal 02/09/2026 non tocca il cloud in nessun modo, e quindi non compare più nel Pannello
App.** Fino a quel giorno mandava due sole cose — acceso/spento (chiave `rc` in
`qm_app_status`) e l'orario dell'ultimo utilizzo (`qm_rc_last`) — ed era per questo che
aveva una scheda nel pannello. Sono state tolte quando l'accesso al Worker è stato
riservato ai dispositivi abilitati: restare agganciata avrebbe voluto dire chiedere un
lasciapassare anche ai colleghi della Galleria, che usano l'app solo per stampare le
schede e non hanno niente a che fare con Compass. **Il prezzo, accettato consapevolmente:
dal Pannello App non si spegne più da remoto e non si vede più quando è stata usata.** Se
serve fermarla, si toglie il file o si cambia il link.

Per questo non ha (e non deve avere) la schermata di abilitazione delle altre cinque app.
Un controllo in `test/esegui.sh` verifica che non le rientri dentro una `fetch` verso il
Worker: succederebbe in silenzio e l'app smetterebbe di funzionare in Galleria.

Ha anche l'aggiornamento automatico delle altre app (`QM_APP_BUILD` + confronto ETag), con
una guardia in più: non si ricarica mentre è aperta l'anteprima di una scheda.
`strumenti/versione.sh` la include nell'elenco delle app di cui aggiorna `QM_APP_BUILD`.

**Veste grafica allineata a Compass** (02/09/2026): token `--accent` navy / `--gold`,
topbar navy con filo oro e stella della bussola, card con bordo superiore oro e
intestazione navy, e lo **splash** delle altre app (bussola con ago che ruota ed eco radar,
"Compass QM" + nome dell'app) a ogni apertura — saltato sui ricaricamenti, altrimenti un
aggiornamento automatico sembrerebbe una riapertura. **Il CSS di STAMPA e l'anteprima
`.mp` non sono stati toccati**: quella è la scheda che si consegna all'ospite, non
l'interfaccia.

**La scheda stampata segue lo stesso linguaggio** (02/09/2026): bordi delle sezioni navy
invece che neri, fasce di sezione in azzurro tenue, etichette IT/EN come pastiglie navy
piene. **L'intestazione è a FONDO BIANCO**, con titolo e numero camera in navy e il filo
oro sotto: la prima versione la riempiva di navy pieno, ed è stata rifatta subito — un
blocco pieno alto ~20mm su tutta la larghezza, per ogni ospite di ogni giorno, consuma
troppo toner. È l'unico riempimento a copertura piena che c'era; le fasce di sezione
rimaste sono azzurro chiarissimo. **Se si ritocca questa scheda, non reintrodurre fondi
pieni.** **Il testo resta nero**: su una stampante in
bianco e nero il navy diventa grigio scuro e un testo grigio si legge peggio; l'oro è solo
decorativo, quindi stampato in monocromatico non porta via nessuna informazione. Nessun
marchio Compass sul foglio: è un documento che si consegna all'ospite, non uno strumento
interno.

**Ogni scheda usciva con una SECONDA PAGINA BIANCA dietro** — un foglio sprecato per ogni
ospite, difetto presente fin dall'origine. `.print-page` è alta `297mm` esatti e ha i suoi
margini interni (11/13mm), ma i margini di stampa del browser si sommano: il foglio non
entra nell'area stampabile e trabocca. Risolto con `@page { size: A4; margin: 0; }` dentro
il blocco di stampa. Verificato generando il PDF con Chromium prima e dopo: 2 pagine contro
1, e con due ospiti 2 pagine (non 4). La riga della firma resta dentro il foglio (misurata:
contenuto 1123px = altezza pagina, firma a 1064).

**pdf.js arriva da un CDN e la sua assenza non deve uccidere la pagina**: la riga
`pdfjsLib.GlobalWorkerOptions.workerSrc = …` in cima allo script lanciava un errore che
portava giù *tutto* il resto — la pagina restava a schermo ma inerte, e il riquadro di
caricamento non rispondeva senza dire perché (visto dal vivo provando la pagina senza
rete). Ora c'è `PDF_OK` e, al caricamento di un file, un messaggio esplicito.

**La sentinella di `test/esegui.sh` la include** nel giro delle app standalone, quindi vale
anche qui il controllo che `qmKvSet` non chiami se stessa.

Difetti noti del file originale, **non toccati** perché è la loro app e funziona sui loro
export — da sistemare solo se lo chiedono:
- il parser è una `RegExp` sul testo concatenato: un nome andato a capo nell'export lo
  spezzerebbe (Compass per lo stesso motivo legge le colonne per posizione, vedi
  `_psParsePdfArrivi`);
- l'anno si prende dall'intestazione del PDF e vale per arrivo **e** partenza: un soggiorno
  a cavallo di capodanno (30/12 → 02/01) darebbe notti negative, quindi `—`.

---

---

## Pannello di Controllo — due voci: Applicazioni e Sicurezza

Dal **06/09/2026** la sezione di menu si chiama **Pannello di Controllo** e contiene tre voci:

| Voce | Vista | Cosa c'è | Risponde a |
|---|---|---|---|
| **Applicazioni stand alone** | `view-miniapp` | le 6 schede con stato, interruttore on/off e link (5 app di Compass + Gestione Biancheria della Galleria) | *le app sono accese e aggiornate?* |
| **Sicurezza** | `view-sicurezza` | copia di sicurezza dell'archivio, dispositivi abilitati (`#qmDispositivi`) | *chi entra, e cosa c'è al sicuro* |
| **Stato del sistema** | `view-sistema` | scheda di diagnosi (`qmRenderStatoSistema()`) + **pallino** nella voce di menu | *le macchine funzionano* |

Sistema oggi ha **una scheda sola**: è il posto dove finiranno le prossime diagnosi. Se fra
qualche mese fosse ancora l'unica, tanto vale riunirla a Sicurezza — una vista con un solo
riquadro non giustifica una voce di menu (stessa ragione per cui la sezione "Biancheria" è
stata eliminata).

Prima stavano nella stessa vista, ma sono due mestieri diversi: le app si accendono e si
spengono nell'operatività quotidiana, dispositivi e backup si toccano di rado e per motivi di
sicurezza. I ganci in `setView` seguono i pezzi: `qmRenderDispositivi()` e `qmRenderBackup()`
girano su `sicurezza`, `miniappRender()` su `miniapp`.

**Attenzione ai doppioni in `pageTitles`/`breadcrumbs`**: sono oggetti letterali su una riga
sola e una chiave ripetuta **vince l'ultima**. Aggiungendo `miniapp:'Pannello di Controllo'`
in testa restava attiva la vecchia `miniapp:'Strumenti'` più avanti, e la briciola non
cambiava. Cercare sempre `grep -o "miniapp:'[^']*'"` dopo averle toccate.

### Scopo (vista Applicazioni)

Vista `miniapp` — pannello di controllo per le 5 app standalone (Housekeeping, Breakfast, Distribuzione Culligan, Inventari Detersivi, DVR). Non è più un semplice elenco di link con contatore accessi: mostra uno **stato colorato** con KPI operativo per ciascuna app, un **toggle on/off** che può disattivarle da remoto, e un **avviso toast** per Breakfast.

### Layout

Griglia mosaico a **3 colonne fisse** (`grid-template-columns:repeat(3,minmax(0,1fr))`) — non `auto-fit`, perché con 5 card l'ultima riga (2 card) andava a stiracchiarsi in modo disomogeneo rispetto alle 4 sopra.

**Icone: badge navy/oro, non più le foto PNG** (06/09/2026). `.miniapp-ico-badge` in `style.css` ha lo stesso impianto di `.nav-icon-badge` (cerchio `--accent`, anello `--gold`, SVG bianco), 36px invece di 38 per stare nella riga della scheda. Gli SVG sono **gli stessi della voce di menu corrispondente**, copiati da lì: scopa (Operativa HKP), tazza (Breakfast Sheet), goccia (Distribuzione Culligan), scatola (Inventari), scudo (DVR). Non sono due varianti della stessa idea: sono lo stesso disegno in due posti, e **se se ne cambia uno va cambiato anche l'altro** — non c'è una fonte condivisa. I PNG in `img/icons/` restano nella cartella ma non sono più referenziati dalle schede.

### Stato colorato per card — `miniapp*Status()`

| App | Funzione | Verde | Ambra | Rosso | KPI mostrato |
|-----|----------|-------|-------|-------|--------------|
| Housekeeping | `miniappHkStatus()` | Piano caricato e aggiornato a oggi | Piano caricato ma non per oggi | Piano non caricato | `ore HH:MM` da `qm_ts_pianoTs` |
| Breakfast | `miniappBkfStatus()` | Report presente per oggi | Report caricato ma non per oggi | Report non caricato | `ore HH:MM` da `qm_ts_bkfTs` |
| Distribuzione Culligan | `miniappCmStatus()` (async) | Giro completato, **oppure** giro finito con qualche camera saltata | Giro in corso (ultima attività < 90 min) | Nessun controllo oggi dopo le 12 | `ore HH:MM` — max di `rs.ts` tra le camere di oggi |
| Inventari Detersivi | `miniappInvStatus()` | 0 prodotti sotto soglia | 1-2 sotto soglia | ≥3 sotto soglia | `SA gg/mm · AR gg/mm` — data ultima consegna ricevuta per magazzino (`tsRicevuto` degli ordini `status:'ricevuto'`) |
| DVR & Compliance | `miniappDvrStatus()` | Nessun contratto in scadenza | Contratti in scadenza ≤30gg | Contratti già scaduti | conteggio contratti interessati |

**"Giro in corso" non dura più fino a mezzanotte** (07/09/2026): pretendeva che risultassero
visitate **tutte e 22** le camere, ma qualcuna si salta di proposito — libera, o non c'era
bisogno di entrarci — e la scheda restava arancione su un giro chiuso alle 14. Ora dopo
`CM_FINE_GIRO_MS` (un'ora e mezza) di silenzio il giro è considerato finito e la scheda dice
**quante camere sono state fatte** (`18 camere su 22`) invece di raccontare che è ancora in
corso. Il giro dura una decina di minuti, quindi una pausa di un'ora e mezza non è una pausa.

**Nota**: i KPI mostrano un **orario/data reale** (da timestamp di aggiornamento dati), non un conteggio — prima Housekeeping/Breakfast/Culligan mostravano "N cambi camera" / "N coperti" / "N camere da visitare", giudicati poco utili; ora mostrano quando il dato è stato aggiornato l'ultima volta, coerente con lo scopo "pannello di controllo".

### Toggle on/off — `qm_app_status`

Ogni card ha un interruttore (`miniappToggleApp(key)`, key ∈ `hk|bkf|cm|inv|dvr`) che scrive su una chiave KV condivisa:

```js
const MINIAPP_KEYS = ['hk','bkf','cm','inv','dvr'];
let _appStatus = {};  // qm_app_status: { hk:true, bkf:false, ... } — assente/true = attiva
```

**Lato app standalone**: ciascuno dei 5 file (`housekeeper.html`, `breakfast.html`, `controllo-mattino.html`, `inventory.html`, `dvr.html`) ha, subito dopo la dichiarazione di `PROXY`, una funzione `qmCheckAppStatus()` che legge `qm_app_status` (`cache:'no-store'`) e, se il proprio flag è `false`, mostra un overlay fullscreen `#qm-maintenance-screen` (logo Compass + "Applicazione in aggiornamento") al posto della UI normale.

**Ricontrollo mentre l'app resta aperta**: `qmCheckAppStatus()` gira al caricamento, su `visibilitychange` (quando l'app torna in primo piano) e ogni 60s via `setInterval`, **solo mentre l'app è a schermo** — necessario perché un'app rimasta aperta in background su uno smartphone (icona home screen mai chiusa) non rileggerebbe mai lo stato senza questo. Se il fetch fallisce (rete assente), l'app **resta utilizzabile** (fail-open) — non blocca mai per un problema di connessione.

**Non implementato**: contatore accessi per dispositivo (rimosso su richiesta esplicita — "non si è rivelato utile"). Le funzioni `loadHkAccessStats`, `loadBkfAccessStats`, `loadDvrAccessStats` e il toggle "escludi questo dispositivo" sono stati eliminati insieme alle relative sezioni UI. **Dal 04/09/2026 anche le app hanno smesso di scriverlo**: `qm_hk_access` / `qm_bkf_access` / `qm_dvr_access` costavano una lettura e una scrittura a ogni apertura per un dato che nessuno leggeva più, e le scritture sul piano gratuito sono 1.000 al giorno. Se un domani servisse contare gli accessi va ripensato: non un contatore riscritto da ogni dispositivo a ogni apertura.

### Avviso toast — solo Breakfast (`qm_bkf_banner`)

Messaggio scritto dalla dashboard, mostrato come toast temporaneo (10s) su `breakfast.html`, **solo quando si è sulla tab "Analisi"** (attenzione: nel codice quella tab è `switchTab('report')` — non un sub-tab `_ddtBkfTab==='analisi'` dentro Ordini/Acquisti, che esiste ma non è mai raggiungibile da nessun bottone della UI. Il bottom-nav di `breakfast.html` è: Servizio→`day`, Acquisti→`orders`, **Analisi→`report`**).

```js
const BKF_BANNER_KEY = 'qm_bkf_banner';
let _bkfBanner = { enabled: false, message: '' };
```

- Interruttore acceso/spento **indipendente** da quello dell'app (`miniappToggleBkfBanner()` vs `miniappToggleApp('bkf')`).
- Campo testo libero + pulsante "Salva avviso" (`miniappSaveBkfBanner(btn)` — mostra "✓ Salvato" per 1.5s sul bottone stesso, poi torna al testo originale: è solo conferma visiva, non un errore se sembra "tornare indietro").
- **Il messaggio si scrive su più righe** (19/09/2026): era un `<input type="text">`, cioè una finestra da una riga su cui un avviso di due frasi si rileggeva solo scorrendo con le frecce — ed è rileggendolo che ci si accorge di un refuso. Ora è un `<textarea>`, e gli a capo sono l'unico modo di separare *cos'è successo* da *cosa devo fare*. Tre punti che devono restare allineati:
  - **il valore sta fra i tag, non in un attributo**: va protetto da `&` e `<` (con l'`<input>` bastavano le virgolette). Un nome di prodotto con una `&` sfigurerebbe la casella al primo ridisegno.
  - **gli a capo si conservano** — `_bkfBannerTesto(v)` normalizza i soli CRLF di Windows, toglie gli spazi a fine riga e taglia ai bordi (uno spazio in cima diventerebbe una riga vuota sull'avviso). **Non rimettere un `.trim()` secco sul valore grezzo**: quello va bene, è il `replace` degli a capo con spazi che romperebbe tutto.
  - **sul telefono serve `white-space:pre-line`** su `#qm-banner-toast-text` (`breakfast.html`): `textContent` conserva gli a capo nel dato, ma senza quella regola il browser li rende come semplici spazi e le righe tornano una sola — l'avviso sembrerebbe salvato male, mentre il difetto è nella resa.
- **La casella cresce con il testo** (`_bkfBannerAltezza`/`_bkfBannerAltezzaTutte`), e non ha l'angolo da trascinare (`resize:none`): un'altezza scelta a mano verrebbe sovrascritta al tasto successivo. `_bkfBannerAltezzaTutte()` va richiamata **anche all'apertura della tendina** (`miniappToggleAvvisi`): a pannello chiuso `scrollHeight` vale 0, quindi l'altezza si può misurare solo quando è a schermo.
- In `breakfast.html`: `qmCheckBanner()` viene chiamata su `visibilitychange`→visible e dentro `switchTab()` quando `tab==='report'`; si nasconde subito se si esce da quella tab. Non è nel polling periodico (quello è solo per il check on/off dell'app).
- **Compare a ogni apertura, dura 10 secondi, si chiude al primo tocco** (19/09/2026). Tre cose che vanno tenute insieme, tutte verificate guidando l'app con Playwright:
  - **All'apertura aspetta lo splash.** Lo splash copre tutto per 3 secondi e sta a `z-index:99998` contro i 9998 del toast: l'avviso partiva sotto il velo e ne bruciava metà. `qmCheckBanner` rimanda quando trova `#qm-splash` (un'attesa sola, non una per chiamata — `_bannerAttesaSplash`).
  - **La chiamata iniziale è su `DOMContentLoaded`, non a metà script.** Più sotto c'è `let _activeTab` **nella stessa `<script>`**: in quel punto è in zona morta e `typeof _activeTab` **lancia** (non vale `'undefined'` come per una variabile mai dichiarata), il `try/catch` se lo mangiava, e **a ogni ricaricamento — compreso quello dell'aggiornamento automatico — l'avviso non compariva affatto**. Stessa famiglia del difetto `kvGet`: un `catch` attorno a una chiamata di rete che nascondeva un errore di programmazione.
  - **Il tocco che lo fa comparire non lo chiude**: gli ascoltatori (`pointerdown`/`touchstart`, in **cattura**, così vale anche toccando qualcosa che ferma la propagazione) si attaccano dopo `QM_BANNER_GRAZIA_MS=400`. Senza, il clic su una voce del menu in basso — che è ciò che fa comparire l'avviso di quella schermata — risaliva fino a `document` e lo spegneva all'istante.
  - `qmBannerNascondi()` spegne **timer e ascoltatori**, non solo `display:none`: `switchTab` faceva il solo `display:none` e il timer del vecchio avviso restava vivo, pronto a spegnere quello nuovo prima del tempo.
- Toast: icona SVG bell (non emoji — sostituita due volte su richiesta, prima 📢 poi 🔔, ora SVG outline oro senza sfondo), testo centrato, posizionato `bottom:72px` (sopra la bottom-nav fissa, non sopra di essa — la prima versione a `bottom:16px` copriva i pulsanti Servizio/Acquisti/Analisi).

### Didascalie toggle

Ogni toggle ha una didascalia breve **accanto** ("Attiva/disattiva app"), non più una frase lunga su una riga a parte sopra il link — cambiato dopo feedback che il testo grigio a 9-10px era illeggibile (portato a `--fs-xs`, 13px).

---
