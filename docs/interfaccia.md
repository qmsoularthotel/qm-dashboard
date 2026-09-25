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
| `view-reception` | Fondo Cassa & Incasso Contante — sola lettura + modifica per il QM |
| `view-giacenza` | **Giacenza Biancheria** — magazzino e pezzi in mano alle cameriere |
| `view-resi-biancheria` | Resi biancheria inidonea al fornitore Raimondo (solo SoulArt, solo QM) |
| `view-prestay` | Pre-stay — messaggi agli ospiti in arrivo fra 2 giorni |

---

## Adattamento a smartphone — regola generale

**Gli stili in linea non si adattano.** Gran parte delle viste è costruita in JS con
`style="..."`: nessuna `@media` può raggiungerli. Ogni volta che una misura deve cambiare
su smartphone va **spostata in una classe CSS**, lasciando in linea solo ciò che è
davvero dinamico (colori calcolati, stati). Le classi nate così:

| Classe | Dove | Perché esiste |
|---|---|---|
| `.ps-grid`, `.ps-bar-*` | Messaggi Pre-stay | Schede a 3/2/1 colonne; barra di stato che va a capo |
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
