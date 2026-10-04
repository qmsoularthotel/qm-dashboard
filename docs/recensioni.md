# Recensioni — punteggio Booking, Booking.com, Expedia

> Dettaglio spostato da CLAUDE.md il 24/09/2026. Si legge quando si lavora su questa parte.

## Punteggio Booking — fasce annuali (dal 04/10/2026)

### Come calcola Booking

Dal gennaio 2025 Booking fa la **media dei voti di ciascun anno** (ultimi 12 mesi, 12–24 mesi,
24–36 mesi) e poi pesa le tre medie. Dopo 36 mesi la recensione esce. Uno studio universitario
ha ricostruito i pesi su 100 hotel e 74.882 recensioni: **85% / 10% / 5%** (Mellinas, Di
Nolfo-Aiassa, Martin-Fuentes, *The weight of a review: Assessing Booking.com's new scoring
system*, Tourism and Hospitality Research, settembre 2025). Un anno senza recensioni non conta e
il suo peso va agli altri. La cifra mostrata è **arrotondata** a un decimale (8.85 → 8.9).

Compass usa **90% / 6% / 4%** (`REV_PESI_ANNI`), uguali per tutte le strutture.

### Perché è cambiato (04/10/2026) — e cosa NON rifare

Dal 12/08 al 04/10/2026 Compass usava un **decadimento esponenziale** con un'emivita
"calibrata" per ogni struttura sulle letture del QM. Messo alla prova sulle **34 letture vere**
registrate in `qm_rev_calib` (backup del 04/10/2026):

| Modello | Letture riprodotte | Ultima lettura sbagliata in |
|---|---|---|
| Emivita (come era in uso) | 13 / 34 | SoulArt 8.8 invece di 8.9, Principe 6.8 invece di 6.6, Art Resort 8.5 invece di 8.6 |
| Media semplice 36 mesi | 6 / 34 | quasi tutte |
| Fasce annuali 85/10/5 (studio) | 23 / 34 | — |
| **Fasce annuali 90/6/4** | **28 / 34** | — |

E intanto la calibrazione dava emivite assurde (21 giorni a SoulArt, "osservazioni in
conflitto"), Principe e Art Resort "fuori modello", e **decine di letture giuste erano state
cancellate** perché "non tornavano". La lezione: con una sola cifra decimale da rispettare, un
parametro libero per struttura spiega qualunque lettura e non prevede niente. **Non
reintrodurre un parametro per struttura**: le letture servono a verificare la formula, non a
piegarla.

**Perché 90/6/4 e non 85/10/5.** Per non scambiare il rumore per un segnale: pesi stimati su 6
strutture, provati sulla settima, a turno. In 6 casi su 7 la stima è ricaduta su 90/6/4, e fuori
campione ha indovinato **27 letture contro 23** (il Boutique, mai visto dalla stima, 9 su 9).
Con 85/10/5 il Boutique stava sistematicamente a 8.24 contro l'8.3 di Booking.

Provati e scartati: ritardo di aggiornamento di Booking (da 12 ore a 7 giorni: peggiora),
confini delle fasce spostati di qualche giorno (nessun guadagno stabile), peso fisso per
singola recensione invece che per media dell'anno (24/34).

### Le 6 letture che non tornano (al 04/10/2026)

SoulArt 11 e 13/08 (Booking 8.9, Compass 8.83–8.84), Principe 26/09 (6.7 contro 6.54, e la
settimana dopo 6.6 torna), Mastrangelo 17/09 (7.4 contro 7.347: tre millesimi), Santa Brigida
12/09 (8.6 contro 8.55, e il 19/09 di nuovo 8.5), San Liborio 01/09. Nessuno spostamento dei
pesi le fa tornare senza romperne altre: sono più probabilmente recensioni che nel CSV non
c'erano ancora o che Booking ha tolto/aggiunto in ritardo.

### Come rifare la prova (quando la verifica comincia a sbagliare su più strutture)

1. Scaricare l'ultimo backup (Drive, *Back-Up Compass QM*, `compass-archivio-*.json`): le chiavi
   `qm_rev_<p>` (CSV), `qm_ts_rev_<p>` (ultimo caricamento), `qm_rev_calib` (letture).
2. Caricare `app.js` come fa `test/node.js` e chiamare `revVerifica(revParseCsv(csv), letture,
   ts)` per ogni struttura: dà ✓/✗ e la stima di ogni lettura.
3. Per cambiare i pesi: provarli **fuori campione** (stimare su 6 strutture, provare sulla
   settima) e cambiarli solo se migliorano in modo netto. Mai dati veri nei controlli.

### Le funzioni (sezione `§§ RECENSIONI BOOKING — PUNTEGGIO A FASCE ANNUALI` in `app.js`)

| Funzione | Scopo |
|---|---|
| `punteggioBooking(rec, pesi, oggi)` | `{score, anni:[{n,somma,media,quota,pesoUna}], pesoEff, nInFinestra}`. `quota` = parte del punteggio portata dall'anno, `pesoUna` = da una sua recensione, `pesoEff` = recensioni "equivalenti" |
| `revConNuove(pb, voto, n)` | punteggio esatto se arrivassero oggi n recensioni con quel voto (spostano la media dell'ultimo anno) |
| `revPesoDi(pb, gg)` | parte del punteggio portata da una recensione di quell'età |
| `revDisplay(s)` / `revSoglia(t)` | cifra mostrata da Booking (arrotondata) / soglia per mostrare t (t − 0.05) |
| `revVerifica(rec, letture, importTs)` / `revVerificaStruttura(p)` | ogni lettura confrontata con il calcolo **di quel momento**, con le sole recensioni arrivate fino ad allora |
| `revSimulaTarget(...)` | giorno per giorno: le recensioni invecchiano, passano d'anno ed escono, le nuove arrivano al ritmo storico |
| `revEffettoScadenze(...)` | cosa cambia da solo: `nCambio`/`mediaCambio` (compiono un anno: dal 90% al 6%), `nUscita` (escono dai 36 mesi), `deriva` |
| `revRenderCalib` / `revRenderImpact` / `revRenderDistrib` | i pannelli Verifica, Impatto della prossima recensione, Distribuzione del peso |

**Tutti i punti che mostrano il punteggio usano `punteggioBooking` + `REV_PESI_ANNI`**: card
"Punteggio medio" (`revRenderStats`), grafico "Andamento score" (`openScoreTrend`), "Score
attuale" del pannello Recensioni in scadenza (`revRenderExpiring`). Un modello diverso in uno
solo dei tre mostra numeri diversi per lo stesso giorno (è già successo).

Il grafico **Andamento score** mostra **due decimali** (04/10/2026: con uno solo 8.85 e 8.94
sembravano uguali) e, passandoci sopra, il valore di ogni mese. Ogni punto è calcolato a fine
mese **ma mai oltre oggi**: per il mese in corso la fine del mese sta nel futuro e l'ultimo punto
non coincideva con la card (8.94 contro 8.916).

### Pannello "Punteggio Booking reale" — ora è una verifica

Il QM registra il punteggio dell'extranet ogni volta che cambia (registro `qm_rev_calib`:
`{ sa:{ osservazioni:[{ts,display}], rimosse:[ts] } }`). Per ogni lettura il pannello mostra
✓ / ✗ e, fra parentesi, cosa calcolava Compass **in quel momento**; in testa "Compass = Booking
in X letture su Y". Se l'ultima non torna dice di quanto e da che parte, con il rimedio
(riesportare il CSV). La ✕ toglie una lettura **solo se digitata male**: una lettura giusta che
non torna è proprio l'informazione per migliorare la formula.

Regole rimaste valide dal vecchio pannello:
- **"In attesa" fino all'ultimo IMPORT** del CSV (`qm_ts_rev_<p>`), non fino all'ultima
  recensione che contiene (fix 12/08/2026): un import fresco prova che a quel momento non
  c'erano recensioni nuove.
- **Il timestamp delle recensioni include l'ora** (`revParseCsv` converte lo spazio in `T`,
  per Safari): più recensioni lo stesso giorno, e l'ordine rispetto a una lettura conta.
- **Il registro si FONDE col cloud** (`revCalibFondi`), con le lapidi `rimosse`: il 23/08/2026
  un salvataggio a sovrascrittura aveva azzerato il registro di tutte le strutture.
- I campi della vecchia calibrazione (`hl`, `fascia`, `contraddittorio`, `fuoriModello`…) li
  toglie `revCalibRicalcola` una volta sola, poi non riscrive più.

### Pannelli previsionali

- **Impatto della prossima recensione**: margine dalla soglia, tabella voto → nuovo punteggio
  → cifra mostrata (colorate solo le righe dove la cifra cambia), voto più basso che non fa
  scendere la cifra, "un 5 pesa X volte un 10". Riga **fra 90 giorni**: quante recensioni
  **compiono un anno** (la leva vera: dal 90% al 6%) e quante escono dai 36 mesi (quasi niente).
- **Distribuzione del peso**: le tre fasce con recensioni, quota, "1 rec. vale" (rispetto a una
  dell'ultimo anno) e media colorata rispetto alla soglia.
- **Obiettivo** (+0.1): `revSimulaTarget`; "non raggiungibile" se il voto delle nuove è sotto la
  soglia (il punteggio converge alla media del flusso).
- **Recensioni in scadenza** (`revRenderExpiring`): si riduce a una riga quando le uscite non
  spostano la cifra — con le fasce annuali il terzo anno vale il 4% in tutto.

### Cosa NON è stato toccato

Import CSV, conteggio "senza risposta", **score per categoria** e **andamento categorie**
(restano a 85/10/5: sono le sotto-voci, non IL punteggio), filtri e ordinamenti della lista,
tutta la sezione **Recensioni Expedia** (modello diverso, `weightedAvgF1`).

---

## Recensioni Booking.com

### `revGenerateReply(r)` — regole prompt

- 3 paragrafi distinti, 5-7 frasi totali
- Apertura: ringrazia con nome ospite
- Critica: MAI "hai ragione/assolutamente ragione" — usare "Prendiamo nota di..."
- Punteggio: solo se alto E recensione entusiasta
- Chiusura: invito a tornare, no contatto diretto, no prenotazione diretta
- Tono: solo **Formale** (selettore tono rimosso — istituzionale e professionale, sobrio, senza eccedere in calore)
- Campo "Istruzioni aggiuntive" opzionale nella maschera di risposta: se compilato, il testo viene incluso nel prompt come vincolo aggiuntivo (senza poter violare le regole sopra)

---

## Recensioni Expedia

### Struttura `REV_EXP_HOTELS`

Hotel supportati: `sa` (SoulArt), `bh` (Boutique), `ar` (Art Resort), `sb` (Santa Brigida).

```js
REV_EXP_HOTELS = {
  sa: { name:'SoulArt Hotel', data:[], filtered:[], filter:'all', sort:'date_desc', search:'', page:0, tone:'bilanciato' },
  bh: { name:'Boutique Hotel', ... },
  ar: { name:'Art Resort', ... },
  sb: { name:'Santa Brigida', ... }
}
```

### Formato file Expedia — TAB o VIRGOLA, si prova, non si indovina (06/09/2026)

Expedia Partner Central esportava **separato da TAB** e ora esporta **separato da
virgola**, coi campi fra virgolette. `revExpParseTsv` splittava solo sul TAB: un export
CSV dava **una colonna sola**, `review_rating` non si trovava mai e la vista rispondeva
*"Nessuna recensione trovata nel file"* — un file perfettamente valido rifiutato, con un
messaggio che accusava il file invece del parser. Le recensioni Booking non ne
risentivano: `revParseCsv` è un parser CSV vero da sempre.

Il nome della funzione resta `revExpParseTsv` (è quello documentato e usato in due punti),
ma ora accetta **TAB, virgola e punto e virgola** — l'ultimo è quello che si ottiene
aprendo il CSV con Excel in italiano e risalvandolo.

**Il separatore si sceglie provandolo**, non contando le occorrenze: un testo di
recensione pieno di virgole ingannerebbe un conteggio, mentre le colonne attese le
produce un separatore solo. Si tiene il primo che fa comparire `review_rating` fra le
intestazioni.

`_revRighe(str,sep)` è l'**unica** copia del parser a campi virgolettati (una virgola o un
a capo *dentro* le virgolette non spezzano niente), condivisa da Booking ed Expedia: erano
due copie, e infatti una delle due è rimasta indietro. Estratta da `revParseCsv`, che ora
la chiama con `','` — comportamento identico a prima.

**Compatibile all'indietro**: i file già salvati in TSV su `qm_rev_exp_<p>` (localStorage e
KV) continuano a essere letti, quindi nessun reimport necessario.

**Il messaggio d'errore ora dice cosa ha trovato** (`_revExpDiagnosi`): file vuoto,
oppure le intestazioni realmente presenti quando manca `review_rating`. È la differenza
fra *"ho scaricato il file sbagliato"* e *"il formato dell'export è cambiato di nuovo"*,
due cause con rimedi opposti — e la seconda, senza questo, si scopre solo leggendo il
codice.

Colonne reali dell'export: `review_date` · `brand_type` (Expedia / Hotels / Orbitz) ·
`review_by` · `review_rating` (`"10 out of 10"`) · `review_title` · `review_text` ·
`review_response_date` · `review_response_by` · `review_response`.

**Il nome dell'ospite c'è, e si continua a NON usarlo** (deciso il 06/09/2026). L'export
riporta `review_by` (mostrato in lista), quindi il nome sarebbe disponibile: le risposte
Expedia devono comunque aprire **sempre** con "Dear Guest," / "Gentile ospite,". È una
**scelta**, non un ripiego per un dato mancante — il vecchio testo di questa sezione
diceva che il nome non c'era, e da lì nasce l'equivoco.

**Non "correggerla" trovando `review_by` nei dati**: vedere il nome disponibile e passare
a usarlo come su Booking è esattamente l'errore che questa nota esiste per prevenire. La
regola vive nel prompt di `revExpGenerateReply` (regola 1: *mai il nome*) e va cambiata
solo se lo chiede il QM.

Coperto da **17 controlli** in `test/controlli.js` ("Recensioni Expedia: l'export si
carica comunque sia separato"), verificati con due sabotaggi (si prova solo il TAB; il
separatore dentro le virgolette spezza il campo): 10 e 6 falliscono — il secondo mostra
proprio lo slittamento delle colonne, con `brand_type` che legge `2026`.

### `revExpGenerateReply(r)` — regole specifiche

- Apertura sempre con "Dear Guest," (inglese) o "Gentile ospite," (italiano)
- Recensione senza testo (`review_text` vuoto): 2 frasi concise, non template fisso
- Stesse regole di Booking su critiche, punteggio, invito a tornare, no contatto diretto

---
