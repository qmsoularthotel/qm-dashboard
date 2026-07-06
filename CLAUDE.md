# CLAUDE.md

Guida per Claude Code su questo repository.

---

## 1. Panoramica progetto

**Compass QM** è la dashboard di gestione qualità per un gruppo di 7 strutture alberghiere a Napoli (SoulArt Hotel, Boutique, San Liborio, Principe, Mastrangelo, Art Resort, Santa Brigida). Serve il Quality Manager (Paolo) e lo staff operativo (reception, housekeeping, breakfast) per centralizzare turni, arrivi, checklist, recensioni, inventario e report giornalieri.

**Architettura**: applicazione **single-file HTML + JS vanilla**, nessun framework, nessun build system. Persistenza a due livelli — `localStorage` per accesso immediato, **Cloudflare KV** (via Worker proxy) per sincronizzazione cloud tra dispositivi. L'AI (Claude API) viene chiamata tramite lo stesso Worker per estrarre dati strutturati da PDF/immagini (turni, arrivi, DDT fornitori, ecc.).

- **Dominio produzione**: `compass-qm.com` (file `CNAME` nel repo)
- **Hosting**: GitHub Pages (deploy automatico da `main`)
- **Repo**: `https://github.com/qmsoularthotel/qm-dashboard`

---

## 2. Struttura file

| File | Righe | Descrizione |
|------|------|--------------|
| `index.html` | ~1550 | App principale: sidebar, tutte le viste (`div#view-*`), nessun CSS inline (usa `style.css` esterno) |
| `app.js` | ~8280 | Tutta la logica dell'app principale, organizzata in sezioni marcate `// §§` |
| `style.css` | — | Foglio di stile condiviso da `index.html` e `breakfast.html` |
| `breakfast.html` | ~1320 | App standalone per il **breakfast manager** — usa `style.css` + un proprio `<style>` inline aggiuntivo |
| `housekeeper.html` | ~575 | App standalone per la **governante** (checklist camere) — CSS inline proprio, indipendente da `style.css` |
| `controllo-mattino.html` | ~1030 | PWA mobile per il giro distribuzione Culligan — CSS inline proprio |
| `inventory.html` | ~1070 | App mobile inventario detersivi con scanner barcode — CSS inline proprio |
| `dvr.html` | ~483 | Vista standalone Documento Valutazione Rischi — CSS inline proprio |
| `sw.js` | 62 | Service worker unificato per `index.html` (network-first HTML, cache-first asset) |
| `sw-controllo-mattino.js`, `sw-dvr.js`, `sw-housekeeper.js`, `sw-inventory.js` | — | Service worker dedicati per ciascuna PWA standalone |
| `CNAME` | 1 riga | `compass-qm.com` — dominio custom GitHub Pages |
| `README.md` | — | Documentazione funzionalità e Upload Center, in italiano, buona base di riferimento |

### Le 3 app principali (oltre alla dashboard)

1. **breakfast.html** — gestione DDT fornitori colazione, categorizzazione spesa, report pasti/coperti. Contatore accessi per dispositivo (`qm_bkf_access`).
2. **housekeeper.html** — checklist pulizia camere per piano, stato (pulita/sporca/da ispezionare/OOO). Legge `qm_arriviData` e `qm_piano` in sola lettura per sapere partenze/fermate del giorno.
3. **inventory.html** / **controllo-mattino.html** — utility operative mobile-first (scanner barcode inventario; giro distribuzione acqua Culligan).

Nota: il progetto NON contiene il codice sorgente del Cloudflare Worker (`anthropic-proxy.qm-d82.workers.dev`) — è deployato separatamente. Gli endpoint sotto sono dedotti dall'uso lato client, non dal sorgente del worker.

---

## 3. Struttura dati KV

Tutte le chiavi hanno prefisso `qm_`. Convenzione: **snake_case**, quasi sempre coerente. Formato: valore sempre una **stringa JSON** (mai oggetto raw — sia in KV che in localStorage).

| Chiave | Contenuto | Formato/esempio |
|--------|-----------|------------------|
| `qm_weekData` | Turni settimanali | `{ giorni: [{ label, date: "2026-03-23", shifts: {...} }, ...] }` |
| `qm_arriviData` | Arrivi/partenze/fermate del giorno (da AI) | `{ data: "06/07/2026", arrivi: [{camera, ospite, pax, trattamento, arrivo, partenza, origine, note, alert}], partenze: [...], fermate: [...], _ts }` |
| `qm_rcGuests` | Lista ospiti per Registration Cards, derivata da `arrivi` | Array di `{camera, nome, pax, trattamento, checkin, checkout, origine}` |
| `qm_piano` | Piano settimana camere | `{ giorni: [{data, soulart:{partenze,fermate,cambi}}] }` |
| `qm_cm_YYYY-MM-DD` | Stato giornaliero giro Culligan | Oggetto per camera con stato amenities/bottiglia |
| `qm_ddt` | Tutti i DDT fornitori (usato sia da `app.js` che da `breakfast.html` — **stessa chiave, due implementazioni parallele** di parsing/categorizzazione) | Array di `{id, ts, data, fornitore, reparto, hotel, numero_ddt, articoli:[{descrizione,qta,unita,prezzo_unit,totale}], totale_ordine}` |
| `qm_spese_cat_override` | Riassegnazione manuale categoria prodotto (solo Spese Fornitori) | `{ "descrizione prodotto normalizzata": "categoria_id" }` |
| `qm_dvr` | Anagrafica dipendenti/documenti DVR per società | Oggetto per società con array dipendenti |
| `qm_hkpN_<hotel>_<yyyy-mm>` | Griglia housekeeping camere/aree per hotel e mese | `{ "camere:0_1": "AM", ... }` (chiave = `tab:riga_colonna`) |
| `qm_hkp_config` | URL Google Apps Script per HKP per hotel | `{ sa: "https://script.google.com/...", ar: "..." }` |
| `qm_inv_catalog_sa` / `_ar` | Anagrafica prodotti inventario per magazzino | `{ [barcode]: {name, unit, soglia?} }` |
| `qm_inv_moves_sa` / `_ar` | Movimenti inventario (carico/scarico/init) | Array di `{id, barcode, type, qty, ts, note}` |
| `qm_inv_orders` | Ordini fornitore inventario | da verificare con Paolo (struttura esatta) |
| `qm_pulData` | Report pulizie giornaliero parsato | Array `{label, data, arrivi, fermate, fermatePulizia, partenze}` |
| `qm_bkfData` | Report pasti/colazioni giornaliero | da verificare con Paolo |
| `qm_bkf_monthly_history` | Storico coperti breakfast per giorno | `{ "yyyy-mm-dd": {bb, ro} }` |
| `qm_bkfGroups`, `qm_bkfNotes` | Gruppi e note breakfast | da verificare con Paolo |
| `qm_rev_<hotel>` (sa/bh/sl/pr/ms/ar/sb) | Recensioni Booking.com per struttura | da verificare con Paolo (struttura CSV parsata) |
| `qm_rev_sent`, `qm_rev_exp_*`, `qm_ts_rev_*` | Stato risposte inviate / dati export recensioni | da verificare con Paolo |
| `qm_turni_pref` | Richieste preferenze turni da Google Forms | Array di richieste |
| `qm_tp_seen_until` | Badge letto/non letto preferenze turni | timestamp |
| `qm_checklist`, `qm_custom_tasks`, `qm_dept_custom_tasks` | Stato checklist giornaliera | da verificare con Paolo |
| `qm_bkf_access`, `qm_hk_access`, `qm_dvr_access` | Contatore accessi per dispositivo (analytics uso app standalone) | `{total, today, todayDate, last, devices: {[devId]: {...}}}` |
| `qm_ts_*` (es. `qm_ts_arriviTs`, `qm_ts_pulTs`) | Timestamp upload per mostrare "aggiornato il..." nell'UI | timestamp numerico |

### Chiavi specifiche delle app standalone

| Chiave | File | Contenuto |
|--------|------|-----------|
| `qm_bkf_access` | breakfast.html | Contatore accessi per dispositivo: `{total, today, todayDate, last, devices:{[devId]:{firstSeen,total,today,todayDate,last}}}` |
| `qm_hk_access` | housekeeper.html | Stesso pattern, per housekeeper |
| `qm_dvr_access` | dvr.html | Stesso pattern, per dvr |
| `qm_inv_wh` | inventory.html | Magazzino selezionato |

### Incoerenze di naming trovate

- **`qm_ddt` è condiviso** tra `app.js` (view Spese Fornitori, tutti i fornitori) e `breakfast.html` (solo fornitori colazione) — ciascuno con la propria logica di categorizzazione prodotto (`CAT_RULES` duplicato in entrambi i file, ora allineato manualmente ma a rischio di disallineamento futuro se uno dei due viene modificato senza l'altro).
- **Doppio meccanismo di persistenza**: alcune chiavi passano dall'oggetto centralizzato `LS.get/set/del` (che auto-prefissa `qm_` e fa sync KV), altre chiamano `kvSet`/`fetch` direttamente con la chiave già prefissata scritta a mano. Nessun problema funzionale, ma stile non uniforme all'interno dello stesso `app.js`.
- Naming quasi tutto coerente (snake_case, prefisso `qm_`); non ho trovato vere incoerenze bloccanti oltre a quanto sopra.

---

## 4. Endpoint Cloudflare Worker

Base URL: `https://anthropic-proxy.qm-d82.workers.dev` (costante `PROXY`, ridefinita identica in ogni file HTML — non condivisa via import).

| Endpoint | Metodo | Input | Output | Uso |
|----------|--------|-------|--------|-----|
| `/kv/get?key=<chiave>` | GET | query param `key` | `{ value: "<stringa JSON>" \| null }` | Lettura di qualunque chiave KV. Sempre chiamato con `cache:'no-store'` per evitare dati stantii |
| `/kv/set` | POST | JSON body `{ key, value }` (value = stringa, tipicamente `JSON.stringify(...)`) | da verificare con Paolo (probabile `{ok:true}`, osservato in sessione) | Scrittura chiave KV |
| `/kv/delete?key=<chiave>` | GET (osservato in `app.js`, es. `qm_arrivi_raw`) | query param `key` | da verificare con Paolo | Cancellazione chiave |
| `/v1/messages` | POST | JSON body stile Anthropic Messages API: `{ model:'claude-sonnet-4-6', max_tokens, messages:[{role:'user', content:[...]}] }`; `content` può includere blocchi `image`/`document` (base64) + `text` (prompt) | Risposta stile Anthropic Messages API (`data.content[0].text`) | Proxy verso Claude API per il parsing PDF/immagini → JSON strutturato (turni, arrivi, DDT, piano settimana, risposte recensioni) |

Non essendo il sorgente del Worker in questo repo, comportamenti di dettaglio (retry, timeout, gestione errori server-side) **da verificare con Paolo** o nel repo del Worker se esiste separatamente.

---

## 5. Convenzioni di codice

- **Indentazione**: 2 spazi, nessun tab, in tutti i file `.js`/`.html`.
- **Naming funzioni**: `camelCase`, spesso con **prefisso di modulo** che indica la sezione di appartenenza — es. `hkpN*` (griglia housekeeping nuova), `ddtBkf*` (DDT in breakfast.html) vs `ddt*` senza suffisso (DDT in app.js), `bkfSheet*`, `dvr*`, `inv*`, `turniPref*`, `cm*` (controllo mattino).
- **Naming variabili di stato modulo**: prefisso underscore per variabili mutabili "private" al modulo — es. `_ddtMonth`, `_hkpNsel`, `_analMese`, `_speseCatOverride`. Variabili `let` globali senza underscore per stato condiviso più ampio (`weekData`, `activeDay`, `arriviData`, `guestsData`).
- **Costanti**: `UPPER_SNAKE_CASE` per configurazione statica (`DEPTS`, `CAT_RULES`, `HKP_SYM`, `PROXY`, `DDT_MON`).
- **Sezioni nel file `app.js`**: marcate con commenti `// §§ NOME SEZIONE` — usare `grep -n "§§" app.js` per navigare. Vedi mappa dettagliata in fondo a questo file.
- **CSS**: `index.html` e `breakfast.html` condividono `style.css` (esterno, cache-busted con `?v=N`); le altre 4 app standalone (`housekeeper`, `dvr`, `controllo-mattino`, `inventory`) hanno **CSS inline proprio**, per restare completamente autonome/portabili senza dipendenze esterne.
- **Nessun commento superfluo**: il codice è denso, quasi privo di commenti esplicativi — i pochi presenti spiegano un **perché** non ovvio (es. ordine critico delle keyword in `CAT_RULES`, workaround per bug noti).
- **Stile JS**: niente semicolon-free style; funzioni spesso molto lunghe (centinaia di righe) che costruiscono stringhe HTML via template literal e le assegnano a `innerHTML`.

### Versionamento

Il numero di versione va incrementato ad ogni modifica ad `app.js`:
1. Nel `<title>` tag di `index.html` (es. `v186` → `v187`)
2. Nel cache buster `<script src="app.js?v=235-YYYYMMDD">` in fondo a `index.html`

Senza aggiornare il cache buster, browser e service worker continuano a servire la versione vecchia.

---

## 6. Comandi operativi

### Sviluppo locale

Nessun build. Si apre `index.html` direttamente nel browser (nessun server richiesto per lo sviluppo base). Per testare correttamente i service worker serve un server HTTP locale, perché non si registrano su `file://`:

```bash
python3 -m http.server 8080
```

Per trovare rapidamente sezioni di codice in `app.js`:

```bash
grep -n "§§" app.js          # lista tutte le sezioni con numero di riga
grep -n "§§ TURNO" app.js    # trova sezione specifica
```

Poi leggere solo il blocco rilevante con `offset`/`limit` invece di caricare l'intero file.

### Deploy (GitHub Pages)

Il deploy è **automatico**: ogni push su `main` triggera il workflow di default di GitHub Pages ("pages build and deployment" — build Jekyll + deploy). Non esiste un file `.github/workflows/*.yml` custom in questo repo — è la pipeline automatica che GitHub genera quando Pages è abilitato da Settings.

```bash
git add <file>
git commit -m "messaggio"
git push
```

**Nota operativa importante**: questa pipeline **fallisce in modo intermittente** allo step "Deploy to GitHub Pages" anche quando il build Jekyll passa. Se il sito non si aggiorna dopo un push:
1. Aspettare 1-2 minuti
2. Se non parte/fallisce, ritriggerare con un commit vuoto: `git commit --allow-empty -m "chore: retry deploy" && git push`
3. In alternativa, da GitHub → tab Actions → aprire il run fallito → "Re-run all jobs"

### Verificare che il deploy sia andato a buon fine

```bash
curl -s "https://api.github.com/repos/qmsoularthotel/qm-dashboard/actions/runs?per_page=3" | python3 -m json.tool
curl -s "https://compass-qm.com/index.html" | grep -o "app.js?v=[^\"]*"
```

L'API GitHub non autenticata ha un rate limit di 60 richieste/ora — durante troubleshooting intenso è facile esaurirlo (il controllo diretto con `curl compass-qm.com` non ha lo stesso limite).

### Recovery — Recupero codice perso

Se delle viste o funzionalità spariscono, recuperare dal git history:

```bash
git log --oneline -20
git show 2183997:index.html | grep 'id="view-'      # commit con tutte le viste originali
git show 2183997:index.html | sed -n '3500,3800p'    # blocco specifico
```

Le viste `view-hkpsheet` e `view-hkpsheetar` sono state perse e recuperate una volta da questo commit — se scompaiono di nuovo, il codice completo è lì.

Inventario view obbligatorie — verifica con `grep -n 'id="view-' index.html`: overview, registrazione, checklist, reclami, recensioni-{sa,bh,sl,pr,ms,ar,sb}, audit, bkfsheet, bkfsheetar, hkpsheet, hkpsheetar, miniapp, inventario, turni-pref, controllo-mattino.

---

## 7. Bug noti e limitazioni

| Problema | Causa | Fix / stato |
|----------|-------|-----|
| Turno settimanale mostrava "domenica" invece del giorno corrente | Confronto tra oggetti `Date` costruiti da stringhe con fuso orario ambiguo | **Risolto**: `loadWeekData` confronta date come stringhe/numeri (`parseLocalDate` via regex su `YYYY-MM-DD`), mai come oggetti `Date` diretti. Fallback su parsing del label se manca la stringa ISO |
| Banner "piano non caricato" sempre giallo (controllo-mattino) | `_renderHome()` chiamata sync prima che `_loadPiano()` (async) completasse | **Risolto**: `_loadPiano().then(() => _renderHome())` — mai chiamare render sync dopo async |
| App controllo-mattino non si aggiornava su smartphone | Service worker condiviso faceva cache dell'HTML | **Risolto**: `sw-controllo-mattino.js` dedicato, network-first per l'HTML |
| Dashboard non rifletteva attività smartphone (controllo mattino) | `cmLoad()` leggeva localStorage (stale) invece di KV | **Risolto**: legge sempre KV prima, poi fallback localStorage |
| Browser usa versione vecchia di app.js | Cache buster non aggiornato | Aggiornare `?v=...` in `<script src="app.js?v=...">` |
| "Non in servizio" contava anche chi non è in turno | `IS_REST(v)` ritorna true per valori null/vuoti | **Risolto**: usare `IS_ABSENT(v)`, richiede valore esplicito R/RIPOSO/OFF/FERIE |
| DVR dati non persistenti / vuoto su altro PC | `dvrSave()` chiamava una funzione KV inesistente; `syncFromCloud` non richiamava `dvrRestore()` | **Risolto**: `kvSet('qm_dvr', json)` diretto + `dvrRestore()` aggiunto nel case `dvr` di `syncFromCloud` |
| Meteo non funzionava | `const days = data.daily` dichiarato dopo l'uso in `if(mm && days)` | **Risolto**: dichiarazione spostata prima del blocco `if` |
| Righe DUPLEX duplicate in HKP riepilogo | Il range letto include righe duplex | **Risolto**: filtro client-side `/duplex/i.test(c.nome)` |
| `giorni_elaborati` sempre 1 in SoulArt (HKP) | Apps Script leggeva range sbagliato | **Risolto**: script con range corretti + calcolo client-side da `camere_per_giorno` |
| Date preferenze turni mostravano "Sun ..." | Apps Script restituiva `String(date)` in formato `Date.toString()` quando `instanceof Date` falliva | **Risolto**: `_tpFmtDate()` con regex su nome mese inglese + Apps Script aggiornato con `typeof v.getTime === 'function'` |
| Disconnessione Remote Control da mobile | Non è un bug nel codice — infrastruttura di accesso remoto al Mac usata per operare su questo repo | Limitazione operativa nota, riferita da Paolo; richiede accesso fisico al Mac per ripristinare |
| Deploy GitHub Pages intermittente | Pipeline automatica GitHub Pages, non deterministico | Vedi sezione 6 — retry con commit vuoto risolve quasi sempre |
| `qm_ddt` con due implementazioni parallele di categorizzazione prodotto | `CAT_RULES` esiste sia in `app.js` che in `breakfast.html` | Rischio di manutenzione, non un bug attivo — tenerle sincronizzate è manuale |
| Parsing AI arrivi — possibile "trascinamento" di data tra righe adiacenti | Comportamento intrinseco del modello su tabelle lunghe del Riepilogo Reception, specialmente al confine tra sezione "Arrivi" e "In Casa" | Mitigato con istruzioni esplicite nel prompt; causa occasionale di registration card duplicate — non eliminato al 100% |
| Nessun commento `TODO`/`FIXME`/`HACK` nel codice | — | Verificato via grep su tutti i file — il codice non usa questi marker per segnalare lavoro in sospeso |

---

## 8. Decisioni architetturali

- **Single-file HTML invece di build system**: nessuna build step, nessuna dipendenza da Node/npm per l'esecuzione — chiunque nello staff può aprire il file direttamente. Coerente con un progetto mantenuto in gran parte tramite iterazioni assistite da AI (Claude Code) piuttosto che da un team di sviluppo dedicato: meno moving parts, meno cose che si possono rompere per un aggiornamento di dipendenze.
- **Cloudflare KV invece di database tradizionale**: il caso d'uso è sincronizzazione di stato semplice (documenti JSON) tra pochi dispositivi, con bassa scrittura/lettura concorrente. KV dà persistenza cloud a costo/complessità minimi senza gestire un server/DB proprio; il Worker fa anche da proxy per nascondere la API key di Claude lato client.
- **Google Sheets come backend per dati operativi** (HKP, breakfast, preferenze turni): permette allo staff non tecnico di inserire dati in un'interfaccia familiare (foglio di calcolo) invece che in un form custom, con Apps Script che espone i dati come JSON.
- **App standalone separate (breakfast/housekeeper/inventory/controllo-mattino)** invece di tutto dentro la dashboard principale: ciascuna è ottimizzata per un utente/contesto d'uso specifico (governante, breakfast manager, giro mattutino su smartphone) con service worker/PWA dedicati, evitando di caricare tutta la dashboard (pesante, con dati sensibili come recensioni/DVR/turni completi) per chi deve fare un solo compito da mobile.
- **Parsing PDF via Claude AI invece di un parser PDF strutturato**: i documenti sorgente (Riepilogo Reception, piano camere, foglio breakfast) hanno formati non sempre identici tra loro o nel tempo (esportati da un gestionale esterno); un parser AI generalista tollera meglio le variazioni di formato rispetto a un parser posizionale rigido, al costo di occasionali errori di classificazione (vedi bug arrivi/fermate in sezione 7).
- **Merge "sostituzione piena" invece di merge incrementale per gli arrivi**: il documento sorgente è sempre un'istantanea completa della giornata (non un delta) — un merge intelligente per nome ospite era stato provato e scartato perché rischiava di fondere per errore prenotazioni diverse con più camere sotto lo stesso nominativo.
- **`§§` come sistema di navigazione del codice** invece di split in più file: dato che tutto vive in un `app.js` da ~8300 righe, i marker `§§` servono da indice grep-abile per orientarsi senza dover aprire un IDE con outline.
- **Firma differenziata italiano/inglese per risposte recensioni**: `Paolo P. - Quality Manager` vs `Best regards. Paolo P. - Quality Manager` — scelta di tono/branding specifica del gruppo, non tecnica.

---

## 9. Task in sospeso

- **Onboarding overlay per `breakfast.html` e `housekeeper.html`**: non ancora implementato (verificato via grep — nessuna occorrenza di "onboarding"/"overlay"/"walkthrough" in nessuno dei due file). Da progettare da zero.

---

## 10. Regole di dominio (invariate rispetto alle versioni precedenti)

### Strutture gestite

7 strutture: **SoulArt Hotel**, **Boutique**, **San Liborio**, **Principe**, **Mastrangelo**, **Art Resort**, **Santa Brigida**.
Codici: `sa`, `bh`, `sl`, `pr`, `ms`, `ar`, `sb`.

### Risposte alle recensioni Booking.com

- Firma italiano: `Paolo P. - Quality Manager`
- Firma inglese: `Best regards. Paolo P. - Quality Manager`
- Non ripetere le parole esatte usate dal recensore
- Includere sempre un incentivo alla prenotazione futura

### Hotel Room Detection Logic

I numeri di camera determinano la struttura di appartenenza:
- `Art` prefix → Art Resort
- `200–299` → Boutique Hotel

### Review Scoring Formula

Media pesata: **85% anno corrente / 10% anno-2 / 5% anno-3**, con fattore di decadimento a 271 giorni per il tracking delle scadenze.

### CSS Design Tokens

```css
--bg: #E8E8EA
--surface: #F4F4F6
--accent: #1E4080
--green: #1E7A48
--red: #C0352A
--amber: #A05A00
```

### Conteggio "non in servizio" — IS_ABSENT

`IS_REST(v)` ritorna `true` anche per valori vuoti/null. Per contare chi è realmente assente usare `IS_ABSENT`, che ritorna `true` solo per valori espliciti (`R`, `RIPOSO`, `OFF`, `FERIE`):

```js
const IS_ABSENT = v => {
  if (!v) return false;
  const u = v.trim().toUpperCase();
  return ['R', 'RIPOSO', 'OFF', 'FERIE'].includes(u);
};
```

### Manutenzione (`mt`) — comportamento speciale in `renderDay()`

- Sempre visibile anche quando nessuno è in turno
- Mostra sempre tutti i membri del reparto (non solo quelli in turno)
- Considerato "attivo" per qualsiasi shift non-riposo (non una whitelist di sigle), perché il personale può avere turni custom (es. `9-17`) non nella lista standard

### DVR — ordinamento dipendenti

Pin fisso: 1) Corduas Vincenzo, 2) Presta Pierpaolo, 3) contratti a termine per scadenza più vicina, 4) resto in ordine alfabetico.

---

## Riferimento rapido — mappa sezioni `app.js`

Per la mappa dettagliata riga-per-sezione (`§§`), eseguire:

```bash
grep -n "§§" app.js
```
