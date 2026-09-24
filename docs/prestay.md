# Pre-stay

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

## Pre-stay — messaggi agli ospiti in arrivo (view `prestay`)

### Scopo e vincolo di partenza

Ogni giorno si scrive agli ospiti che arrivano **fra 2 giorni** (`PRESTAY_GG=2`). I contatti (mail, telefono) stanno sul PMS e **non sono esportabili in alcun formato**: vanno inseriti a mano, non c'è modo di aggirarlo.

### GLI OSPITI NON SONO LEGATI ALLA CAMERA — non reintrodurre quella chiave

Il Piano Settimanale serve **solo a sapere QUANTI arrivi ci sono per struttura** in quel giorno (`_psArriviPerStruttura(iso)`). Le schede sono **"Arrivo 1, 2, 3…" dentro il gruppo della struttura**, identificate da un `id` proprio: il numero di camera non compare da nessuna parte.

**Perché** (storia da non ripetere — è costata tre implementazioni successive): la prima versione indicizzava i dati per camera, `_prestay[iso][camera]`. Ma la reception sposta gli ospiti di stanza di continuo, e a ogni spostamento i contatti restavano orfani sulla vecchia riga mentre la nuova camera compariva vuota da ricompilare. Si è provato prima con un pulsante di spostamento manuale (rifiutato: *"io non posso ricordare dove sposto ciascun ospite"*), poi col consolidamento automatico per email (ancora troppo: richiedeva di ridigitare l'email), poi con l'inferenza dal diff del Piano — che è **inaffidabile per costruzione**: il Piano contiene solo data/struttura/camera, quindi *"203 sparita, 204 comparsa"* è indistinguibile da *"una prenotazione cancellata più una nuova"*, e indovinare significa prima o poi attribuire i contatti di un ospite a un altro.

La soluzione è stata **togliere del tutto l'aggancio**: senza camera non c'è niente da riagganciare, e uno spostamento diventa un non-evento. Il numero di camera qui non serviva a nulla — **non compare nel messaggio** (confermato dall'utente: non ci sarà mai) e non determina il testo, che dipende dalla struttura. Se un domani si volesse mostrare la camera all'ospite, ripensare l'intero modello, non aggiungere un campo camera come chiave.

### Fonte degli arrivi: il PDF del PMS, NON più il Piano Settimanale (15/08/2026)

Il pre-stay è stato **staccato dal Piano Settimanale** e collegato al **PDF "Arrivi" esportato dal PMS**. Il Piano dava solo un conteggio di camere; il PDF elenca le prenotazioni reali **con il nome dell'ospite**, quindi è insieme più completo e più attendibile. `pianoData` non è più letto da questa sezione.

**Perché non il Piano, e perché un giorno alla volta** (riconfermato il 2026-08-20): il
Piano contiene **solo numeri di camera** (`Art 5`, `Art 10`) e nessun nome — verificato sui
dati reali in KV. Servirebbe quindi digitare a mano anche i nomi, non solo mail e telefono.
E non ha senso nemmeno caricare in anticipo più PDF Arrivi di giorni diversi: **le
prenotazioni entrano di continuo**, quindi una lista caricata in anticipo è già incompleta
il giorno dopo. Il PDF del giorno, caricato quando serve, è la fonte più aggiornata.

**Il PDF non contiene email né telefono** (verificato sull'export reale): quelli restano manuali. L'import serve a fissare *quanti* arrivi ci sono, *chi* sono e a *quale struttura* appartengono — la parte che non si può controllare a memoria.

**La camera viene usata solo in fase di lettura**, per dedurre la struttura (`_psStrutturaDaCamera`: 204 → Boutique, Art 5 → SoulArt, LIB → San Liborio, R1-3 → Mastrangelo, CAPRI/NAPOLI/… → Principe, altre numeriche → SoulArt — stesse regole di `fixArriviStruttura`), e poi **scartata**: le schede non hanno campo camera. Verificato in test. Non salvarla.

#### Dove si carica

Due punti, stessa funzione `prestayHandlePdf(file)`: lo slot **"Arrivi Pre-stay"** nell'Upload Center (prima riga, accanto a "Riepilogo Reception") e il pulsante **"Carica PDF arrivi"** dentro la vista. Lo stato viene riportato in entrambi.

**Nome scelto**: "Arrivi Pre-stay" e non "Pre-Stay Message" — quello che si carica è la *lista arrivi*, non un messaggio; e va distinto da "Riepilogo Reception", che è lo stesso tipo di report del PMS ma esportato per la giornata corrente anziché per fra due giorni.

Aggiungendo altri slot ricordarsi di inserire la chiave negli **elenchi della fisarmonica** in `ucToggle` e `ucSetState` (`['turno','arrivi','prestay',…]`), altrimenti il pannello non si chiude quando se ne apre un altro. Lo slot **non** è incluso in `ucUpdateProgress`: non modifica il contatore giornaliero degli upload.

#### Parsing deterministico sulle colonne — `_psParsePdfArrivi(items)`

Niente chiamata AI: si legge la posizione `x` di ogni frammento di testo da pdf.js. **Motivo**: nomi e tipi camera vanno a capo nell'export reale (`Chacon Oviedo` / `Karina`, `AS` / `SUP`), e un parser sul testo concatenato li spezzerebbe o infilerebbe il tipo camera dentro il nome.

| Costante | Valore | Significato |
|---|---|---|
| `PS_COL_OSPITE_DA` | 90 | x minima della colonna "Ospite (Prenotante)" |
| `PS_COL_OSPITE_A` | 177 | x della colonna "Pax" = fine colonna ospite |

Nell'export reale: camera/tipo a x 40–77, ospite a x 96–135, Pax a 177,5. Una riga con `/` nella colonna sinistra apre una prenotazione; le righe successive senza `/` sono continuazioni e il loro testo nella colonna ospite viene **accodato al nome**. `PS_RE_CAMERA` valida la camera così che l'intestazione `Numero/` non venga scambiata per una prenotazione.

**La data si legge dall'intestazione** (`Arrivi - 17/08/2026`) e l'import va su quel giorno, spostando anche la vista: importare nel giorno sbagliato sarebbe peggio che non importare.

#### Re-import senza perdere il lavoro fatto — `_psImportaArrivi(iso,lista)`

Ricaricare una lista aggiornata è normale (le prenotazioni cambiano fino all'ultimo) e **non deve costare la ridigitazione delle email**. Regole, in ordine:

1. stesso nome nella stessa struttura → si **tiene la scheda esistente**, con email, telefono, lingua e stato di invio;
2. nome nuovo → riempie una scheda vuota della struttura, altrimenti ne crea una;
3. scheda con dati non più in lista → **non si cancella**, si marca `fuoriLista` e compare "non più in lista" in ambra (prenotazione cancellata o nome corretto: decide l'utente);
4. scheda vuota non più in lista → si rimuove, non serviva.

`_psNomeChiave` normalizza minuscole, punteggiatura **e ordine delle parole**: "Rossi Mario" e "MARIO ROSSI" sono la stessa persona — altrimenti un'inversione nome/cognome fra due export creerebbe un doppione e un doppio messaggio.

**Verificato con 34 test sul PDF reale del 17/08/2026** (9 arrivi, 3 Boutique + 6 SoulArt): nomi su più righe ricomposti, tipi camera mai finiti nel nome, intestazione e riga totali non importate, contatti e stato di invio conservati al re-import, nessun duplicato.

### Adattamento a smartphone (17/08/2026)

Schede e barra sono costruite in JS con **stili in linea**, che non possono rispondere alla larghezza. Le sole parti che devono adattarsi stanno quindi in `style.css` come classi — non spostarle di nuovo in linea:

| Classe | Desktop | ≤1200px | ≤768px |
|---|---|---|---|
| `.ps-grid` | 3 colonne | 2 colonne | **1 colonna** |
| `.ps-bar-stato` | allineato a destra | idem | a capo, piena larghezza |
| `.ps-bar-prog` | barra a destra | idem | a sinistra |
| `.ps-bar-cfg` | gruppo a destra | idem | a capo, pulsanti espansi |

A tre colonne su telefono il campo email diventa illeggibile — ed è proprio il dato che si incolla dal PMS e si rilegge, quindi una colonna sola è la scelta obbligata, non un ripiego estetico.

Verificato dal vivo a schermo stretto: `.ps-grid` risolve a una colonna e `margin-left` di stato e configurazione passa a `0`. Il breakpoint 768px è lo stesso già usato dal resto di Compass (sidebar a cassetto, tabelle scorrevoli).

### Barra di intestazione su due piani (17/08/2026)

Prima era una riga sola con data, due contatori e quattro pulsanti. I due contatori — `9/14 con contatto` e `9/14 contattati` — si leggevano come una ripetizione pur dicendo cose diverse, e i pulsanti avevano tutti lo stesso peso pur non avendo lo stesso uso.

Ora due piani dentro un unico riquadro:
- **sopra**: navigazione del giorno, data, e a destra **un solo numero** (`9 di 14 contattati`) con `N da fare` in ambra e una barra di avanzamento. A completamento: spunta, barra piena, tutto verde;
- **sotto**, separata da un filo: le azioni. A sinistra quelle quotidiane (**Controlla risposte**, **Aggiungi arrivo**), a destra raggruppate quelle di configurazione (**Modifica testi**, **Impostazioni**) — stanno insieme perché si usano raramente e per ragioni affini.

I conteggi sono sui **contattabili** (Italcamel esclusi, vedi sopra). Con zero contattabili non compare la spunta di completamento: non è un traguardo. Verificato con 19 test, casi limite inclusi.

### Impaginazione a schede, non a tabella (16/08/2026)

Gli arrivi sono **schede in griglia a tre colonne fisse** (`repeat(3,minmax(0,1fr))`, come il Pannello App) dentro il gruppo della struttura, non righe di tabella. Contorno a **1px**: a 2px il colore del canale diventava una fascia pesante, e con dodici schede a schermo l'insieme risultava rumoroso. Il numero d'arrivo è una **pastiglia tenue** con `Arrivo N` come testo unico: una prima versione con il numero dentro un cerchietto pieno e peso 800 risultava troppo pesante, una a testo grigio minuto troppo debole — questa sta in mezzo, e diventa verde a invio avvenuto. La tabella tagliava le email — `cgroth.972512@guest.boo` — proprio sul dato che si incolla a mano e che quindi va riletto; nella scheda i tre campi sono impilati a piena larghezza.

Una scheda già contattata ha **fondo e bordo verdi** e il pulsante diventa **"Rinvia"** senza riempimento pieno: resta possibile, ma non è più l'azione attesa. Il resto (spunte correggibili, badge `non più in lista`, avviso indirizzo Booking, errore di invio) è invariato, solo ricollocato.

### Risposte degli ospiti sulle schede (17/08/2026)

Nel pre-stay si chiedono orario di arrivo, preferenza sul letto e allergie. Le risposte servono a chi prepara la camera, ma cercarle nella webmail è un lavoro a parte: il pulsante **"↓ Controlla risposte"** le porta sulle schede.

`prestayControllaRisposte()` manda al Worker **gli indirizzi degli arrivi di quella data**; il Worker (`/prestay/risposte` in `worker.js`) si collega in IMAP alla casella del QM e cerca **solo messaggi provenienti da quegli indirizzi**. Non è un dettaglio implementativo ma la ragione per cui la cosa è accettabile: **l'endpoint non può restituire il resto della casella**, nemmeno a chi avesse la chiave. Non sostituirlo con un "leggi le ultime N mail e filtra lato client".

L'endpoint si **ricava** da quello di invio (`/prestay/send` → `/prestay/risposte`, vedi `_psEndpointRisposte`): una sola impostazione da tenere allineata invece di due.

Le risposte stanno **solo in localStorage** (`qm_prestay_risposte`), mai su KV: sono messaggi di ospiti, e spargerli su tutti i dispositivi per una comodità di lettura non vale il rischio.

**Limite noto**: chi risponde *dentro* la messaggistica di Booking senza usare la mail non genera un messaggio nella casella, quindi non compare. Quelle risposte si leggono solo nell'Extranet, e l'avviso lo dice invece di far pensare a un guasto.

#### Parsing IMAP — le tre insidie già risolte

Sono in `worker.js`, verificate con 24 test; non semplificarle:

1. **Completamento della risposta** (`imapCompleta`): la riga `TAG OK` può comparire *dentro* i dati di un literal `{N}`. Si scandisce in sequenza saltando i literal, invece di cercare la stringa nel buffer — un test copre esattamente questo caso.
2. **Codifiche del corpo**: `quoted-printable` e `base64` vanno decodificati e poi **reinterpretati come UTF-8**, altrimenti gli accenti si rompono. Su un `multipart/alternative` si prende la parte `text/plain`, ripiegando sull'HTML ripulito solo se manca.
3. **Taglio della citazione** (`soloRisposta`): la risposta contiene tutto il nostro pre-stay citato sotto. Si taglia al primo marcatore (`>`, `Il … ha scritto:`, `On … wrote:`, `Messaggio originale`, underscore) — senza questo, l'informazione utile sarebbe illeggibile.

Si scaricano i primi 16 KB del messaggio (`BODY.PEEK[]<0.16384>`): il testo dell'ospite sta in cima, prima della citazione, e il consumo resta prevedibile.

**Variabili nuove sul Worker**: `IMAP_HOST` = **`pop.securemail.pro`** (il nome dice "pop" ma serve IMAP: è l'host che Register indica per la posta in entrata), `IMAP_PORT` = 993, `IMAP_USER` = indirizzo completo, `IMAP_PASS`.

**Due host scartati, entrambi provati sul campo** — vale la pena ricordarlo perché il secondo errore è insidioso:
- `mail.register.it`: risponde in IMAP, ma il certificato è per `*.securemail.pro` e la verifica dell'hostname fallirebbe dal Worker;
- `mail.securemail.pro`: risponde **e** il certificato combacia, quindi sembrava corretto — ma la casella non vive su quel nodo e Dovecot rifiuta le credenziali con `AUTHENTICATIONFAILED`. L'errore sembra "password sbagliata" mentre significa "utente sconosciuto su questo server".

**Lezione**: su hosting condiviso l'host di posta va preso dalle istruzioni del fornitore, non dedotto dal fatto che un nome risponda e presenti il certificato giusto.

### Colore del bordo = canale di provenienza (17/08/2026)

Il bordo della scheda dice da dove arriva la prenotazione, leggendolo dall'**indirizzo email** (`_psBordoPerEmail`). Serve perché tono del messaggio e vincoli di recapito cambiano per canale.

| Indirizzo | Bordo |
|---|---|
| `@guest.booking.com` | `#0071C2` (blu Booking, tono chiaro) |
| contiene `expediapartnercentral.com` | `#FFB300` |
| contiene `g2-travel.com` | `#76573A` |
| qualunque altro | `#111111` (nero) |
| **già contattato** | verde — **vince su tutti**, `data-fatto="1"` |

**I colori sono scelti per distinguersi fra loro, non per fedeltà al marchio.** Il blu istituzionale di Booking (`#003580`) era indistinguibile dal nero delle dirette e dal marrone di G2 — si usa il loro blu chiaro. Il giallo Expedia è stato scurito da `#ffd933` a `#FFB300` perché quello pallido non si leggeva. Cambiandoli in futuro, verificarli **affiancati**, non uno per uno.

**Il bordo cambia mentre si digita**, non al termine: `oninput` chiama `_psAggiornaBordo(id,email)` che tocca **solo** `style.borderColor` della scheda. Un `prestayRender()` a ogni tasto farebbe perdere il fuoco al campo — non sostituirlo con un re-render. `onchange` resta separato e continua a salvare.

### Arrivi Italcamel — spunta manuale, scheda spenta

Gli arrivi di un tour operator non portano né email né telefono dell'ospite: non sono contattabili e non devono sembrare "da compilare". Si segnano con una **casella sulla scheda** (`prestayToggleItalcamel`), che la spegne: sovrapposizione sfocata (`backdrop-filter`) con la scritta **Italcamel** (non in maiuscolo, 26px) nella tipografia del logo Compass — stesse quattro proprietà di `.logo-title` in `style.css` (`'Helvetica Neue'`, 20px, peso 700, `letter-spacing:-.01em`). Se il logo cambia carattere, questa scritta va aggiornata a mano: sono due punti separati, non c'è una classe condivisa.

**Fuori dai conteggi.** Gli arrivi Italcamel restano visibili ma **non entrano nei contatori**, né in quelli del gruppo né in quelli della barra in alto: non sono contattabili per definizione, quindi tenerli nel denominatore avrebbe lasciato i gruppi eternamente incompleti (`2/5`) e l'avviso ambra accesso anche a lavoro finito. Ora il gruppo mostra `2/2 contattati · + 3 Italcamel` e il verde di "tutti contattati" scatta quando il lavoro è davvero finito. Un gruppo di soli Italcamel **non** si dichiara completo: zero contattabili non è un traguardo.

**Perché a mano e non dedotto**: un primo tentativo leggeva le colonne Azienda/Gruppo del PDF (x 315–411), ma **il PMS non le popola** — nell'export reale contengono sempre `-`. Il parsing è stato rimosso: non reintrodurlo senza prima verificare che quelle colonne abbiano un contenuto.

Due dettagli che non vanno semplificati:
- la casella sta **in fondo alla scheda, allineata a destra**, dopo i pulsanti;
- la sovrapposizione è `pointer-events:none` e la **casella sta sopra di essa** (`z-index:3` contro `2`), altrimenti spegnendo la scheda non si potrebbe più riaccenderla;
- il flag `italcamel` **non viene toccato da `_psImportaArrivi`**: è una marcatura dell'utente e deve sopravvivere al reimport del PDF. Verificato in test.

### Ordine delle strutture, invio in blocco, nomi (15/08/2026)

**L'ordine delle chiavi di `PRESTAY_HOTELS` è l'ordine dei gruppi nella pagina**: Boutique, SoulArt, San Liborio, Principe, Mastrangelo. Per cambiare l'ordine si riordinano le chiavi, non serve altro. **Art Resort è stato rimosso di proposito** dal pre-stay (e da `PRESTAY_FROM_NAME`): da qui non lo si contatta.

**Invio in blocco per struttura** — `prestayInviaGruppo(hotel)`, pulsante "Invia tutte (N)" nell'intestazione del gruppo:
- richiede l'invio diretto configurato; col solo `mailto:` si rifiuta e lo spiega, perché aprirebbe una finestra del client per ogni ospite;
- **manda una mail alla volta, aspettando l'esito della precedente** (`await`): l'SMTP condiviso di Register e il tetto giornaliero del Worker non gradiscono raffiche, e in caso di errore si sa dove ci si è fermati;
- **salta chi non ha email e chi ha già `mailTs`**, quindi ripremere il pulsante dopo aver aggiunto un ospite manda solo la mail mancante — verificato in test;
- non passa dall'anteprima (è il senso dell'invio in blocco) ma chiede conferma con il conteggio, segnalando quanti arrivi verranno saltati perché senza email.

**La normalizzazione vale anche sui dati GIÀ salvati**: applicarla solo all'import lasciava in maiuscolo tutto ciò che era stato caricato prima (i dati vivono su KV e sopravvivono agli aggiornamenti dell'app — è il caso normale, non l'eccezione). `_psGiorno` ripassa i nomi a ogni apertura del giorno e salva **solo se qualcosa è cambiato**, così non innesca un ciclo di scritture su KV. Anche la migrazione dal vecchio formato normalizza subito, non alla seconda apertura.

**Lo slot dell'Upload Center va ripristinato dopo un refresh** — `prestaySetLoaded()`: lo stato del riquadro vive nel DOM, i dati in localStorage/KV, quindi dopo Cmd+R il riquadro tornava "Non caricato" pur avendo gli arrivi. Viene richiamato all'avvio e dopo il pull da KV (arrivi importati su un altro PC). Stesso schema di `pianoSetLoaded`.

**Nomi in maiuscolo** — `_psNomeUmano(s)`: gli export del PMS danno "SALADINI LAURA" o "DABBARHI Ayoub", che in un messaggio all'ospite si leggono come una sgridata. La normalizzazione lavora **parola per parola**, non sull'intera stringa, proprio per gestire il secondo caso; una parola con maiuscole e minuscole insieme è voluta ("McDonald", "O'Brien") e non viene toccata. Le particelle (`de`, `di`, `van`, `der`…) restano minuscole se non iniziali, e i composti con apostrofo o trattino sono gestiti ("D'ANGELO" → "D'Angelo"). Si applica sia all'import sia alla digitazione manuale.

**Il caricamento del PDF è solo nell'Upload Center** (riquadro "Arrivi Pre-stay"): il pulsante dentro la vista è stato rimosso perché ridondante.

**Scorrimento — attenzione: a scorrere NON è la finestra** ma il contenitore `.content` (`overflow-y:auto`). Agire su `window.scrollY` / `window.scrollTo` non ha alcun effetto: è stato un errore commesso e corretto. Tutto ciò che tocca lo scorrimento passa da `_psScroller()`.

| Funzione | Comportamento voluto |
|---|---|
| `prestayToggleTpl` | **porta l'editor in vista** (`scrollTop` sull'`offsetTop` di `#psTplPanel`): si costruisce in fondo alla vista, quindi né lasciare fermo né andare in cima lo mostrerebbe. Chiudendolo si torna in cima all'elenco |
| `prestayToggleMailCfg` | conserva la posizione (`_psSenzaSalto`) |
| `_psWrapSel` / `_psBulletSel` | conservano la posizione: `focus()` su una textarea fuori vista la trascinerebbe in vista |

In entrambi i casi si riapplica anche a `requestAnimationFrame`, perché il layout può assestarsi dopo il ridisegno.

**Evidenza degli invii** — un pallino piccolo non bastava ("così non è intuitivo"). Ora, a tre livelli:
- **riga**: chi è già stato contattato ha sfondo verde tenue e barra verde a sinistra (`inset 3px 0 0`), così si distingue senza leggere; sostituisce la zebratura per quella riga;
- **chip**: pieno verde con l'**ora** dell'invio (`✓ mail 17:20`) invece del solo segno di spunta; resta cliccabile per correggere a mano;
- **intestazione di gruppo e barra in alto**: `N/M contattati`, che diventa verde pieno con ✓ quando il gruppo è completo, e il bordo del gruppo diventa verde.

Chi non ha né email né telefono non sparisce: il gruppo mostra in ambra `N senza contatto inserito`, così un ospite senza recapito non passa per "fatto".

Il pulsante di configurazione si chiama **"Impostazioni"**, non più "Invio mail".

Per un arrivo isolato o per strutture non presenti nell'export resta **"+ Aggiungi arrivo"**, che **chiede la struttura** da un elenco numerato. **La struttura va CHIESTA, non indovinata**: nella prima versione veniva assegnata d'ufficio `'pr'` (Principe) e il messaggio nominava la struttura sbagliata usando pure il template sbagliato — scoperto solo alla prima mail di prova reale. Non introdurre fallback di struttura scelti d'ufficio.

### Migrazione dal vecchio formato

`_psGiorno(iso)` migra **pigramente** (alla prima apertura di quella data) dal formato indicizzato per camera `{'203':{…}}` al nuovo `{arrivi:[…]}`: ogni vecchia riga diventa una scheda normale conservando nome, email, telefono, lingua, struttura e stato di invio — si perde solo la camera come chiave, che è il punto. Verificato che non si ripeta alla seconda apertura.

### Invio mail diretto — opzionale, via Cloudflare Worker

Il pulsante ✉️ ha **due comportamenti** a seconda della configurazione (`⚙️ Invio mail` nella barra della sezione):

| Stato | Comportamento |
|-------|---------------|
| Non configurato (default) | `mailto:` — apre il client di posta col messaggio già scritto |
| Configurato | `POST` all'endpoint del Worker: **la mail parte davvero**, previa conferma |

Il codice del Worker, i passaggi su Cloudflare, il servizio di invio e i record DNS sono in **`worker-prestay-mail.md`** (documentazione, non servita dall'app).

**Perché serve una chiave.** Un endpoint pubblico che spedisce mail è un **relay per spam**: Compass è raggiungibile da chiunque e il sorgente è pubblico. Tre protezioni sovrapposte: chiave condivisa (`X-Prestay-Key`), controllo dell'origine, tetto giornaliero sul Worker. Nessuna è invalicabile da sola, insieme rendono l'endpoint poco interessante da attaccare.

**Configurazione reale in uso** (fatta l'11/08/2026): si spedisce da `qm@mail.compass-qm.com` — sottodominio su Namecheap, dove il QM ha accesso ai DNS; `soularthotel.com` è amministrato nell'area clienti Register dell'hotel, non accessibile. Servizio di invio Resend, region Ireland. I tre record DNS (DKIM, SPF TXT, SPF MX) sono su `compass-qm.com`; il DMARC proposto è stato saltato di proposito perché finirebbe sul dominio principale. Per aggiungere l'MX è stato necessario passare Namecheap da "Email Forwarding" a **Custom MX** — verificato prima che non ci fossero inoltri configurati, quindi nessuna perdita. `compass-qm.com` non ha più record MX: se un domani servisse un inoltro vanno reinseriti i cinque `eforward1-5.registrar-servers.com` (priorità 10,10,10,15,20).

**Due trappole trovate alla prima prova reale**: il display name in `PRESTAY_FROM` va **tra virgolette e senza caratteri non-ASCII** (un trattino lungo `—` faceva scartare il nome, e Gmail mostrava solo l'indirizzo); e le variabili nuove diventano attive **solo dopo un nuovo deploy** del Worker, non al salvataggio.

### L'avviso "indirizzo Booking" diceva il falso — `caselle` buttate via (02/09/2026)

**Sintomo**: una mail al Boutique **regolarmente recapitata**, visibile nel thread Booking
con l'ospite, mostrava lo stesso sulla scheda `indirizzo Booking · non recapitabile con il
mittente attuale`.

**Causa**: `/prestay/stato` restituisce `caselle` — la casella dichiarata **per struttura**
(`{bh:'booking@hotelpiazzacarita.com'}`) — e `_psMittenteAttuale(p)` la legge, ma
`prestayVerificaMittente` **non la salvava**: costruiva `_psMitt` con tutti gli altri campi
e lasciava fuori proprio quello. Senza, ogni struttura con casella propria ricadeva sulla
principale, il confronto con il suo indirizzo Extranet falliva **sempre**, e nessun clic su
"Verifica mittente" poteva sistemarlo. Il campo esisteva solo in `test/controlli.js`, dove
veniva scritto a mano: i controlli passavano su un dato che in produzione non arrivava mai.

L'invio invece era corretto da sempre: la casella la sceglie il Worker (`casellaPer`) dal
campo `hotel` del payload. Era **solo il racconto** a essere sbagliato — il caso peggiore
per un avviso, perché insegna a ignorarlo.

**Corretto**, oltre alla causa:

| Prima | Ora |
|---|---|
| Verifica solo a mano, una volta per postazione | `_psVerificaAuto()` la fa da sola all'apertura della sezione se l'invio diretto è configurato (stesse credenziali), in silenzio; TTL 6 ore, e una cache **senza `caselle`** viene dal difetto e si rifà |
| L'avviso compariva anche su una mail **già partita** | Solo su ciò che deve ancora partire: a cose fatte era una smentita, e falsa se il messaggio era arrivato |
| "non recapitabile" anche quando il mittente non era noto | Se noto: `parte da X, Booking accetta solo Y`. Se ignoto: `mittente non ancora verificato` — un'ipotesi non si scrive come un fatto |

**Regola che ne esce**: un controllo che dichiara *non funzionerà* deve poggiare su un dato
verificato, non su un'assunzione; e quando l'assunzione è pessimistica va detto che è tale.
Il pulsante manuale resta in Impostazioni per rifare la verifica su richiesta.

Corretto anche `PRESTAY_BOOKING_MITTENTE` concatenato nel testo del pannello (mappa dal
31/08: si leggeva `[object Object]`).

### Struttura di PRENOTAZIONE ≠ struttura di ARRIVO — campo `mitt` (02/09/2026)

Un ospite che prenota al **Boutique** e riceve un **upgrade** dorme al SoulArt, ma **non
lo sa fino a quando non arriva in hotel**. Il pre-stay deve quindi partire dalla struttura
in cui *ha prenotato*: quel nome mittente, quel testo, e soprattutto **quella casella di
posta**. Mandarlo dall'altra vuol dire scrivergli da un albergo che non conosce — e se
l'indirizzo è un alias `@guest.booking.com` **non gli arriva affatto**, perché le liste dei
mittenti autorizzati sull'Extranet sono separate per struttura (vedi "Una casella per
struttura").

**Non è deducibile dall'export**: il PMS riporta la camera **assegnata**, che dopo
l'upgrade è già quella nuova, e non esiste una colonna con la struttura di prenotazione.
La scelta è quindi **manuale, per scheda**.

| Campo | Significato |
|---|---|
| `hotel` | struttura di **arrivo** — decide il gruppo nella pagina. **Non cambia mai per un upgrade** |
| `mitt` | struttura di **prenotazione**, cioè chi scrive. Vuoto (caso normale) = la stessa di `hotel` |
| `hotelPrec` | struttura in cui la prenotazione risultava al caricamento precedente. Solo un suggerimento, vedi sotto |

`_psHotelMitt(a)` è **l'unico modo** di ricavare la struttura che scrive; `_psMittDiverso(a)`
dice se è un caso da segnalare. Tutto ciò che riguarda il *messaggio* passa da lì:
`{struttura}` in `_psCompila`, il template (`_psTpl`), `PRESTAY_FROM_NAME` e il campo
`hotel` mandato al Worker in `_psInviaMail` (è quello che sceglie la casella SMTP, vedi
`casellaPer`), il blocco Booking (`_psBookingBloccato`, `_psMittAtteso`,
`_psMittenteAttuale`) sia sulla scheda sia nell'invio in blocco.

**Il raggruppamento resta su `hotel`, di proposito**: il numero di arrivi per struttura è
la rete di sicurezza contro il dimenticarne uno e deve continuare a combaciare con la lista
del PMS. Una scheda con mittente cambiato resta quindi nel gruppo della struttura d'arrivo,
con una riga in accent (`prenotato al … · arriva al …`) e il selettore evidenziato, così la
deviazione è visibile senza aprire nulla. Anche l'anteprima lo dichiara in testa.

**Il suggerimento automatico non decide.** In `_psImportaArrivi`, se una prenotazione già
esistente cambia struttura fra due caricamenti, la struttura di prima viene ricordata in
`hotelPrec` e la scheda **propone** ("scrivi da lì") di usarla come mittente. Non la si
applica da sola: un cambio di struttura può anche essere la correzione di una camera
sbagliata, e indovinare vorrebbe dire scrivere all'ospite dall'albergo sbagliato — lo
stesso errore che questa funzione esiste per evitare. Il suggerimento **non compare** se
`mitt` è già stato scelto a mano.

**`mitt` sopravvive a tutto**: `_psImportaArrivi` non lo tocca (come la spunta Italcamel) e
`_psAssorbi` lo riprende dal cloud solo se qui la scheda non è mai stata toccata (`ts`) —
altrimenti toglierlo a mano non avrebbe effetto, tornerebbe da solo al primo giro.

**Corretto nella stessa modifica**: due messaggi dell'invio in blocco concatenavano
`PRESTAY_BOOKING_MITTENTE`, che dal 31/08/2026 è una **mappa** e non più una stringa — si
leggeva `[object Object]`. Ora l'elenco dei mittenti attesi si ricava dalle schede
realmente bloccate, che con i mittenti per struttura possono essere più di uno.

Coperto da **15 controlli** in `test/controlli.js` ("Pre-stay: chi ha prenotato altrove
riceve dalla sua struttura"), verificati sabotando `_psHotelMitt`: 3 falliscono.

### Vincolo Booking.com — il mittente si VERIFICA, non si dichiara (21/08/2026)

Gli ospiti che prenotano su Booking hanno un indirizzo mascherato `@guest.booking.com`, che è un **relay**: Booking inoltra alla casella vera **solo le mail spedite dall'indirizzo registrato sull'Extranet della struttura** — `booking@soularthotel.com` (costante `PRESTAY_BOOKING_MITTENTE`). Da qualunque altro mittente le rifiuta: a volte le **scarta in silenzio** (nessun rimbalzo, nessun errore), a volte le **rimanda indietro** con un bounce nella casella del mittente.

**Perché è pericoloso e non solo scomodo**: il nostro invio va a buon fine (Register accetta e consegna a Booking), quindi `mailTs` verrebbe valorizzato e la riga diventerebbe verde "inviata" per un messaggio che nessuno ha ricevuto. Una spunta che mente è peggio di una mancante.

Finché il mittente non è quello autorizzato:
- `_psAliasBooking(email)` riconosce gli indirizzi (`@guest.booking.com` e `@booking.com`, con trim e case-insensitive; non confonde `booking.com@gmail.com` né domini simili);
- la riga mostra il campo email bordato ambra e la nota *"indirizzo Booking · non recapitabile con il mittente attuale"*;
- l'anteprima mail aggiunge un avviso esplicito, suggerendo WhatsApp come alternativa;
- **l'invio in blocco li ESCLUDE** invece di spedirli nel vuoto, e dice quanti ne ha saltati. Il conteggio del gruppo resta quindi incompleto — ed è corretto così.

#### Perché la costante scritta a mano non poteva funzionare (rimbalzi del 21/08/2026)

`PRESTAY_MITTENTE_BOOKING_OK` era stata messa a `true` — cioè *"ormai spediamo dall'indirizzo registrato su Booking"* — **senza che sul Worker fosse cambiato niente**: `SMTP_USER` era ed è rimasta `qm@soularthotel.com`. Compass ha quindi ripreso a spedire agli indirizzi `@guest.booking.com` dal mittente sbagliato, e le mail sono tornate indietro. Dalla dashboard era invisibile: l'invio riusciva (Register accetta e consegna a Booking, il rifiuto arriva dopo) e la scheda diventava verde.

**L'equivoco da non ripetere**: *"l'indirizzo è ok sull'Extranet"* e *"le mail partono da quell'indirizzo"* sono due cose diverse. L'Extranet dice quale mittente è **autorizzato**; solo il Worker sa quale mittente stiamo **usando**. Una costante in `app.js` non può saperlo: sta in un file che nessuno ridistribuisce quando si tocca una variabile su Cloudflare.

Il blocco non dipende quindi più da una costante:

| Funzione | Ruolo |
|---|---|
| `prestayVerificaMittente()` | chiede a `GET /prestay/stato` sul Worker da quale casella parte davvero la posta (pulsante **Verifica mittente** in Impostazioni) |
| `_psMitt` (`qm_prestay_mittente`, localStorage) | ultima risposta: `{mittente,mittenteDa,via,smtpHost,replyTo,imap,versione,ts}` |
| `_psMittenteOkBooking()` | confronta il mittente reale con `PRESTAY_BOOKING_MITTENTE` |
| `PRESTAY_MITTENTE_BOOKING_OK` | **solo** l'assunzione finché non si è mai verificato: ora `false` — un invio in meno è meno grave di una spunta verde che mente |

`/prestay/stato` restituisce solo indirizzi e nomi di host (mai password), dietro la stessa chiave e lo stesso controllo di origine degli altri percorsi `/prestay/*`, e dichiara `WORKER_VERSIONE`: se la verifica risponde `404`, il Worker in produzione è più vecchio di `worker.js` e va ripubblicato — cosa che, pubblicando a mano, capita.

**Come si sblocca davvero**: su Cloudflare `SMTP_USER`/`SMTP_PASS` della casella `booking@soularthotel.com`, **cancellare `SMTP_FROM`** se è rimasta impostata (`SMTP_FROM || SMTP_USER`: vince lei, ed è la svista che rende inutile cambiare `SMTP_USER`), ripubblicare il Worker, premere **Verifica mittente**. Il pannello lo dice esplicitamente quando il mittente arriva da `SMTP_FROM`. Verificato in test che con il mittente giusto quegli indirizzi tornano inviabili, e che restano bloccati sia col mittente sbagliato sia quando non è mai stato verificato.

### Una casella per struttura (31/08/2026)

Le liste degli indirizzi approvati sull'Extranet Booking sono **separate per struttura**, e
il Boutique spedisce da `booking@hotelpiazzacarita.com` — dominio diverso, casella diversa,
password diversa. Un mittente unico non poteva funzionare per tutte.

`casellaPer(env, hotel)` in `worker.js` sceglie `SMTP_USER_<COD>`/`SMTP_PASS_<COD>` se
esistono entrambe, altrimenti la casella principale. **Aggiungere una struttura non
richiede modifiche al codice**, solo le variabili su Cloudflare:

| Variabile | Esempio | Quando serve |
|-----------|---------|--------------|
| `SMTP_USER_BH` | `booking@hotelpiazzacarita.com` | sempre |
| `SMTP_PASS_BH` | (segreto) | sempre |
| `PRESTAY_REPLYTO_BH` | `booking@hotelpiazzacarita.com, qm@soularthotel.com` | per far arrivare le risposte in entrambe le caselle |
| `SMTP_HOST_BH` | — | **solo** se il server di invio è diverso. Boutique e SoulArt sono entrambi su register.it, quindi non serve |

`SMTP_FROM` vale **solo** per la casella principale: una struttura con casella propria deve
spedire dalla sua, altrimenti si torna al problema che si voleva risolvere.

Lato Compass: `PRESTAY_BOOKING_MITTENTE` è una mappa (`_default` + `bh`), `_psBookingBloccato(email, hotel)`
segue la struttura della scheda, e l'invio manda `hotel` nel payload — senza quel campo
tutte le mail partirebbero dalla casella principale. Il pannello **Verifica mittente**
mostra una riga per struttura: con due caselle un semaforo unico non basta, può essere a
posto una e non l'altra.

**Trappola vista in produzione**: `SMTP 535 5.7.0 authentication rejected` con credenziali
giuste. Due cause, in ordine: la password incollata si porta dietro uno spazio o un a capo
(rimedio: **riscriverla a mano**, non incollarla), e le variabili **non diventano attive
finché non si ripubblica il Worker**. Se anche così viene rifiutata, verificare che la
casella sia abilitata all'invio autenticato su `authsmtp.securemail.pro`: la webmail
funziona per un'altra strada, quindi entrare in webmail **non** dimostra che possa spedire.

**Spostando la casella di invio si spostano anche le risposte**: `IMAP_USER`/`IMAP_PASS` alimentano "Controlla risposte" e puntano oggi a `qm@soularthotel.com`. Se restano lì mentre si spedisce da `booking@`, le risposte degli ospiti non compaiono più. Il pannello segnala il disallineamento invece di lasciarlo scoprire per caso.

**Nota su `PRESTAY_REPLYTO`**: oggi punta a `qm@soularthotel.com`. Passando a `booking@`, valutare se allinearlo — una risposta dell'ospite dentro il thread Booking dovrebbe restare nel loro sistema, e un `Reply-To` divergente può essere riscritto o ignorato dal relay.

### Mittente per struttura — `PRESTAY_FROM_NAME`

`PRESTAY_FROM` sul Worker è **un solo indirizzo per tutte le strutture** (`qm@mail.compass-qm.com`, l'unico dominio verificato su Resend) — ma il nome mostrato all'ospite non deve essere sempre "SoulArt Hotel": un ospite del Boutique che vede "SoulArt Hotel" come mittente non lo riconosce. `PRESTAY_FROM_NAME` (app.js, vicino a `PRESTAY_HOTELS`) mappa `hotel → nome da mostrare`, **deliberatamente un oggetto separato da `PRESTAY_HOTELS[].name`**: quello alimenta anche `{struttura}` nel corpo dei messaggi, allungarlo lì (es. "Boutique Hotel Piazza Carità" invece di "Boutique Hotel") avrebbe cambiato il testo di ogni template esistente, non solo il mittente.

`_psSpedisciMail` manda `fromName` (il valore già completo di `PRESTAY_FROM_NAME[hotel]`) nel body della POST al Worker, che lo ricompone attorno all'indirizzo fisso di `PRESTAY_FROM` (regex su `<...>`), ripulito da virgolette/parentesi/a-capo prima di finire nell'header `From` — un client (o una richiesta malformata) potrebbe altrimenti mandare qualunque stringa. Senza `fromName` (client vecchio, o hotel non mappato) il Worker ricade su `PRESTAY_FROM` intero, comportamento identico a prima.

**"- Quality Manager" è stato tolto da tutti i mittenti** (prima c'era su SoulArt/Boutique, rimosso su richiesta esplicita nella stessa sessione): `PRESTAY_FROM_NAME` contiene solo nomi di struttura, senza suffisso ruolo. **Non concatenarlo di nuovo in `_psSpedisciMail`**: la stringa in `PRESTAY_FROM_NAME` è già il nome finale, va passata così com'è. SoulArt ha in più `| Design Experience` (barretta verticale, spazi attorno) — solo SoulArt, non le altre strutture.

Il `mailto:` (invio non configurato) **non è toccato**: il client di posta dell'utente decide da solo il mittente, non è mai stato possibile personalizzarlo da lì.

### Perché si spedisce via SMTP e non più via Resend (14/08/2026)

Le mail inviate da `mail.compass-qm.com` via Resend finivano **in spam su Hotmail/Outlook** nonostante autenticazione perfetta — verificato sugli header reali: `dkim=pass`, `dmarc=pass`, `compauth=pass reason=100`, ma `SCL: 5` e `OFR:SpamFilterAuthJ`, cioè "autenticata ma giudicata spam". **Non era un problema di DNS o di codice: era reputazione di un dominio di invio nuovo**, che matura solo in settimane di invii.

Scartate: aspettare (il progetto doveva partire subito); tornare a `mailto:` (impraticabile ai volumi reali — decine di aperture del client, scelta manuale del mittente fra più strutture, impossibile dai PC senza client); verificare `soularthotel.com` su Resend (DNS nell'area Register dell'hotel, autorizzazione non ottenibile).

**Soluzione**: il Worker parla SMTP direttamente col server di Register (`authsmtp.securemail.pro:465`, TLS implicito, `AUTH LOGIN`) e spedisce **dalla casella vera `qm@soularthotel.com`** — stessa reputazione della posta che il QM manda da anni. Compass non cambia: stesso clic, stesso endpoint, stesso payload (`fromName` incluso). Codice completo e dettagli in **`worker-prestay-mail.md` §6**.

Il Worker **ricade automaticamente su Resend** se le variabili `SMTP_*` non ci sono: per tornare indietro basta rimuoverle, senza toccare il codice.

**Non "semplificare" queste quattro cose nel Worker** (tutte verificate in test): risposte SMTP multiriga lette solo su righe già terminate da CRLF (un `250 OK` spezzato a metà sembrerebbe completo); corpo in base64 (risolve accenti *e* dot-stuffing insieme); intestazioni RFC 2047 (`Carità` altrimenti illeggibile); `MAIL FROM` uguale all'utente autenticato (i server condivisi rifiutano mittenti di busta diversi — il nome per struttura sta nell'header `From:`, che è quello che l'ospite legge).

### Configurazione dell'invio: solo la chiave, e si può rileggere (02/09/2026)

Prima servivano **due** campi su ogni postazione, endpoint e chiave, e il campo chiave era
`type="password"`: non si poteva rileggere quanto inserito, quindi per attivare un computer
nuovo bisognava ripescare il valore su Cloudflare.

- **L'endpoint non è un segreto**: è lo stesso Worker che tutta l'app già usa, scritto in
  chiaro nel sorgente. Ora `_psEndpoint()` ricade su `PROXY+'/prestay/send'` quando il
  campo è vuoto, e il campo è sparito dal pannello (resta sovrascrivibile — un Worker di
  prova — con un collegamento per tornare a quello normale). `_psMailPronto()` guarda
  quindi solo la chiave.
- **La chiave si mostra e si copia** (`prestayToggleChiave`, `prestayCopiaChiave`): è così
  che la si porta su un'altra postazione senza andarla a cercare altrove.

**Perché non si può distribuire da sola**: `/kv/get` sul Worker è **senza autenticazione**
— qualunque cosa finisse su KV sarebbe leggibile da chiunque conosca l'indirizzo, che è
pubblico nel sorgente. Una chiave d'invio pubblica è un relay per spam a nome dell'albergo.
Finché l'archivio KV non è protetto, la chiave resta per postazione: è un incollaggio, una
volta per computer.

**La chiave sta solo nel browser** (`localStorage`, chiave `qm_prestay_mailcfg`) — **mai su KV, mai nel codice**: non deve finire su GitHub né essere sincronizzata sugli altri PC insieme al resto dei dati. Va quindi reinserita su ogni postazione da cui si vuole spedire. Verificato in test che non compaia dentro `qm_prestay`.

**Se l'invio fallisce la riga NON viene segnata come inviata** e l'errore resta visibile sulla riga (chiave sbagliata, rete assente, rifiuto del servizio): altrimenti un errore silenzioso farebbe credere che l'ospite sia stato contattato. Un reinvio riuscito azzera l'errore. Con l'invio diretto si chiede **conferma** prima di spedire: con nome e dati presi a mano dal PMS, saltare del tutto la rilettura non è prudente.

Togliendo la chiave si torna immediatamente al comportamento `mailto:`.

### Invio — quando non configurato, Compass non spedisce ma apre il messaggio già scritto

Compass è un sito statico su GitHub Pages: non ha SMTP e non può inviare nulla. I due pulsanti aprono il messaggio **già compilato** e l'invio lo conferma l'utente:

| Pulsante | Meccanismo | Note |
|----------|-----------|------|
| ✉️ mail | `mailto:` con `subject` e `body` già scritti | Apre il client di posta predefinito |
| 💬 WhatsApp | `wa.me/<numero>?text=…` | Stesso meccanismo del giro Culligan; il numero viene ripulito da spazi e `+` |

Di conseguenza **lo stato "inviato" è una spunta, non una certezza**: viene segnata al click sul pulsante, ma è sempre correggibile cliccando il chip `✓ mail` / `✓ wa` (se il client non si apre, o si annulla l'invio). Salvata su KV `qm_prestay` così chi scrive dalla reception e chi controlla dall'ufficio vedono lo stesso stato e non si mandano doppioni.

### Anteprima prima dell'invio — `prestayAnteprima(camera, canale)`

**Dal 17/08/2026 l'anteprima si apre in LETTURA**: mostra il messaggio **finito**, come lo leggerà l'ospite — testo reso, grassetti applicati, oggetto come titolo — non il sorgente con gli asterischi. Nella maggior parte dei casi la si apre solo per rileggere prima di premere invio, e vedere il markup era rumore.

La modifica resta a un clic sulla **matita** in alto a destra (`prestayAntModifica`), che scopre oggetto, barra B/I/• e casella di testo; il pulsante diventa "Fine".

**`_psAntLeggiCampi()` va chiamata prima di ogni ridisegno e prima dell'invio**: travasa il contenuto dei campi nello stato `_psAnteprima`. Senza, una correzione appena digitata andrebbe persa passando a lettura, o non finirebbe nel messaggio spedito se si preme invia senza confermare. Verificato in test.

I pulsanti ✉️/💬 **non spediscono al volo**: aprono un modal col messaggio già compilato e **modificabile**, e solo da lì parte l'invio (`prestayInviaDaAnteprima()` → `_psSpedisciMail` / `_psSpedisciWa`). Con nome e contatti copiati a mano dal PMS, un refuso o un segnaposto rimasto vuoto si vedono solo rileggendo — e una mail sbagliata a un ospite non si richiama indietro.

**Le correzioni valgono per quel singolo invio**, non toccano il template: altrimenti una modifica al volo per un ospite se la porterebbero dietro tutti i successivi. Per cambiare il testo di tutti c'è "✏️ Modifica testi".

Il modal segnala tre cose che si notano solo rileggendo:
- il testo contiene ancora `[SCRIVI QUI IL TESTO DEL PRE-STAY]` (template mai personalizzato);
- il nome ospite è vuoto → il messaggio dirà genericamente "Gentile Ospite";
- è rimasto un segnaposto tra graffe non sostituito (di solito scritto male, es. `{Nome}`).

**Tre pulsanti per riga, tre modi di aprire la stessa anteprima** (`canale`):

| Pulsante | `canale` | Cosa mostra |
|----------|----------|-------------|
| 👁 | `'both'` | messaggio + **entrambe** le vie di invio: si sceglie da lì. L'oggetto è marcato "solo per la mail" |
| ✉️ | `'mail'` | anteprima già orientata alla mail, un solo pulsante di invio |
| 💬 | `'wa'` | anteprima senza campo oggetto (WhatsApp non ce l'ha) |

Con `'both'` compaiono solo le vie per cui esiste il contatto: se manca il telefono resta il solo pulsante mail. Senza nessun contatto l'anteprima non si apre e lo dice.

`prestayInviaDaAnteprima(canaleScelto)` accetta il canale come argomento proprio per il caso `'both'`, dove la scelta avviene nel modal e non è nota all'apertura.

L'etichetta del pulsante mail distingue fra invio diretto ("Invia la mail") e apertura del client ("Apri il client di posta"), così si sa sempre cosa sta per succedere.

### Modello dati

```js
qm_prestay     = { 'YYYY-MM-DD': { arrivi: [ {id,hotel,mitt,nome,email,tel,lang:'it'|'en',mailTs,waTs,mailErr} ] } }
qm_prestay_tpl = { sa:{it:{ogg,corpo}, en:{ogg,corpo}}, bh:{…}, sl:{…}, ar:{…}, pr:{…}, ms:{…} }
```

`id` è generato (`_psNuovoId`) e non cambia mai: è l'unica identità della scheda, usata da invio, anteprima e spunte. **Nessun campo camera**, per le ragioni sopra.

`hotel` è la struttura di **arrivo**; `mitt` (di norma vuoto) è quella di **prenotazione**,
cioè da chi parte il messaggio — vedi "Struttura di PRENOTAZIONE ≠ struttura di ARRIVO".

`rimossi:[id]` (per giorno) è la traccia delle schede eliminate a mano: senza, la fusione descritta sotto le rimetterebbe dentro a ogni salvataggio e cancellarle diventerebbe impossibile. Se ne tengono le ultime 100. `ts` sulla scheda è l'ultima modifica fatta a mano, e decide chi vince su spunta Italcamel e lingua.

### Il salvataggio non può più cancellare — incidente del 22/08/2026

**Cos'è successo.** `_psSave()` scriveva su KV **l'intero oggetto di tutti i giorni**, senza rileggere e senza guardie: ultimo che scrive vince, in silenzio. È bastata una copia partita con il `localStorage` vuoto — un altro profilo del browser, o **la copia di sviluppo, che punta allo stesso Worker della produzione** — perché un caricamento del PDF Prenotazioni riscrivesse la chiave con schede nuove: nomi presenti, email e telefono vuoti, spunte di invio perse. I 19 pre-stay del 24 agosto, **già inviati via WhatsApp e mail**, sono spariti.

**Perché non si è potuto recuperare.** All'avvio il ripristino dal cloud faceva `localStorage.setItem(k, j.value)`, cioè **sovrascriveva la copia locale con quella del cloud già impoverita**. Aprendo Compass la mattina dopo — gesto normale, nessun avviso — è sparita anche l'ultima copia buona rimasta su quella postazione. KV non è versionato: non c'era altro da cui ripartire.

**Le regole ora**, in ordine di importanza:

| Regola | Dove |
|---|---|
| Non si scrive mai alla cieca: si rilegge il cloud e, se non risponde, **la scrittura non parte** | `_psScriviCloud` |
| Si **fonde** invece di sostituire: una scheda compilata che sta sul cloud e non in memoria viene rimessa dentro | `_psFondi` |
| La corrispondenza è per **codice prenotazione**, poi nome+struttura — mai per `id`, che una reimportazione rigenera | `_psStessaScheda` |
| Un valore già presente in locale non viene mai sovrascritto da quello remoto: **quello lo si sta digitando adesso** | `_psAssorbi` |
| Un invio non si perde mai: se risulta contattato da una parte, è contattato | `_psAssorbi` |
| All'avvio si fonde, **non si sostituisce**: una giornata che sta solo in locale sopravvive all'apertura | `restoreReviews` |
| Prima di una reimportazione in blocco ci si riallinea al cloud | `prestayHandlePdf`, `prenHandlePdf` |
| Una scrittura per volta, le altre si accodano | `_psSalvaCloud` |
| L'esito è **visibile**: pallino di sincronizzazione + riquadro rosso nella vista | `_psSegnalaCloud` |

**"Compilata" (`_psCompilata`) vuol dire che c'è qualcosa da perdere**: email, telefono, `mailTs` o `waTs`. Il solo nome non basta — quello lo rigenera l'importazione, e trattarlo come dato da salvare riempirebbe le giornate di doppioni.

**La copia di sviluppo scrive su una chiave sua** (`_psChiave()`: `qm_prestay_dev` quando l'host è `localhost`/`127.0.0.1` o il protocollo è `file:`), e lo dichiara in console. Aprire una copia locale non deve poter toccare i dati veri — è metà della causa di questo incidente. **Se in futuro si aggiungono altre chiavi KV scritte per intero da più postazioni, vale lo stesso ragionamento**: rileggi, fondi, e non far scrivere la copia di sviluppo sulla chiave di produzione.

**La vista si rilegge da sola ogni 60 secondi** mentre resta aperta, ma **non ridisegna se qualcuno sta scrivendo** dentro di essa (`INPUT`/`TEXTAREA`/`SELECT` col fuoco): rigenerare l'HTML sotto le dita fa perdere il testo in corso — stessa lezione della casella "Ricevuto" in Biancheria. Una copia ferma da ore non è solo scomoda: è il punto di partenza di ogni sovrascrittura.

Coperto da **26 controlli** in `test/controlli.js` ("Pre-stay: la fusione col cloud non perde niente"), che riproducono esattamente lo scenario del 22/08: cloud pieno, copia in memoria appena reimportata con `id` nuovi.

### Template — editabili dalla schermata, non nel codice

Un testo per **struttura e lingua** (IT/EN), modificabile da "✏️ Modifica testi" senza toccare il codice. `PRESTAY_TPL_DEFAULT` contiene solo segnaposto (`[SCRIVI QUI IL TESTO DEL PRE-STAY]`) da riscrivere al primo uso.

Segnaposto sostituiti **al momento dell'invio, non salvati** (`_psCompila`): modificando un template cambiano subito anche i messaggi non ancora inviati.

`{nome}` · `{struttura}` · `{data}` — l'oggetto vale solo per la mail, WhatsApp usa il solo corpo. **`{camera}` non esiste più**: gli ospiti non sono legati a una stanza.

### Formattazione nei template — sintassi nativa WhatsApp, tradotta per la mail

Sintassi nel corpo: `*grassetto*`, `_corsivo_`, righe che iniziano con `- ` per un elenco puntato. Scelta deliberatamente **identica alla sintassi nativa di WhatsApp** (non Markdown standard, che userebbe `**grassetto**`): il canale WhatsApp non richiede quindi nessuna conversione, solo la mail va tradotta.

| Funzione | Uso | Canale |
|----------|-----|--------|
| `_psMdToHtml(txt)` | markup → HTML (`<strong>`/`<em>`/`<ul><li>`/`<p>`), con escape HTML prima della conversione (niente injection da un nome ospite scritto male) | mail via Worker (`html` oltre a `text` nella POST a `/prestay/send`) |
| `_psMdStrip(txt)` | toglie i marcatori, converte `- ` in `• ` | `mailto:` (il client apre un body testo semplice, non sa mostrare HTML) |
| corpo grezzo, nessuna conversione | i marcatori sono già ciò che WhatsApp si aspetta | `_psSpedisciWa` (solo `- `→`• `, `*`/`_` restano intatti) |

`_psMdToHtml` lavora **riga per riga**, non a blocchi separati da riga vuota: un elenco che segue subito una riga introduttiva senza riga vuota in mezzo (`"Ecco alcune info:\n- Check-in\n- Wifi"`, caso reale comune) va comunque riconosciuto come elenco — un primo tentativo a blocchi lo trascinava dentro il paragrafo perché non tutte le righe del blocco erano bullet.

**Toolbar B/I/•** sopra ogni textarea (editor template e corpo dell'anteprima), stessa funzione condivisa `_psWrapSel(taId,before,after)` / `_psBulletSel(taId)`: avvolge la selezione (o inserisce un segnaposto "testo"/"voce elenco" se non c'è selezione) e simula un evento `change` così il salvataggio (`onchange="prestaySetTpl(...)"`) parte anche se il valore è stato scritto via JS, non digitato.

Nell'anteprima, quando `canale!=='wa'`, sotto la textarea compare un riquadro **"Come apparirà nella mail"** che mostra `_psMdToHtml` renderizzato, aggiornato in diretta (`oninput` sulla textarea) — utile perché il grassetto/corsivo/elenco nella mail sono resi realmente, mentre nel corpo grezzo restano solo asterischi/trattini.

**Worker**: perché la mail arrivi davvero in HTML serve che `handlePrestayMail` sul Cloudflare Worker inoltri anche `html` a Resend, oltre a `text` — vedi `worker-prestay-mail.md`. Senza aggiornare/ridistribuire il Worker, la mail parte comunque (usa il campo `text`, che Compass manda già ripulito dai marcatori via `_psMdStrip`), solo senza grassetto/corsivo/elenco resi.

---
