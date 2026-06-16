# QM Dashboard — SoulArt Hotel Group

Dashboard di gestione qualità per il gruppo alberghiero di Napoli: **SoulArt Hotel**, **Boutique**, **San Liborio**, **Principe**, **Mastrangelo**, **Art Resort**, **Santa Brigida**.

Sviluppata in vanilla JS, nessun build system. Si apre direttamente nel browser (`index.html`).

---

## Struttura file

| File | Descrizione |
|------|-------------|
| `index.html` | App principale — layout, tutte le viste, CSS inline |
| `app.js` | Tutta la logica (~5500 righe) |
| `housekeeper.html` | App standalone per la governante (checklist camere) |
| `breakfast.html` | App standalone per il breakfast manager |
| `inventory.html` | App mobile per inventario detersivi (scanner barcode) |
| `controllo-mattino.html` | PWA mobile per il giro distribuzione Culligan |
| `sw.js` | Service worker unificato (network-first per HTML, cache per asset) |
| `sw-controllo-mattino.js` | File legacy — si auto-disinstalla al primo caricamento |

---

## Funzionalità principali

### 1. Overview giornaliera
Vista principale con:
- **KPI topbar**: arrivi, partenze, fermate, occupazione del giorno
- **Pannello occupazione**: grafico a barre per struttura con percentuale
- **Piano staff**: turni del giorno per reparto (FO, HK, BKF, MT) — aggiornati automaticamente da KV
- **Meteo Napoli**: previsioni 10 giorni (Open-Meteo)
- **Riepilogo arrivi**: card per ogni struttura con check-in, fermate, cambi

### 2. Turni staff
- Visualizzazione settimanale con navigazione giorno per giorno
- Caricamento automatico da Cloudflare KV (sincronizzato da Google Sheets)
- Modifica manuale turno singolo
- Parser PDF/TSV via Claude AI

### 3. Checklist giornaliera
- Task predefiniti per ogni giorno della settimana (+ specifici mer/gio)
- Task custom aggiungibili e rimovibili
- Stato sincronizzato tra dispositivi via KV
- Progress bar per reparto

### 4. Recensioni Booking.com
Gestione recensioni per tutte e 7 le strutture:
- Caricamento CSV esportato da Booking.com
- Score pesato: 85% anno corrente / 10% anno-2 / 5% anno-3
- Generazione risposta automatica via Claude AI (firma: `Paolo P. - Quality Manager`)
- Tracciamento risposte inviate / non inviate
- Trend score nel tempo con modal grafico
- Filtri per stato, punteggio, periodo

### 5. Registration Cards
- Caricamento PDF arrivi giornalieri
- Estrazione automatica dati ospiti (nome, camera, pax, trattamento, date)
- Stampa registration card per ogni ospite

### 6. Arrivi giornalieri
- Caricamento PDF lista arrivi (Riepilogo Reception o formato HIC)
- Parsing via Claude AI → strutturazione per struttura
- Alimenta: KPI overview, piano colazioni, piano Culligan

### 7. Report Pulizie
- Caricamento report testuale giornaliero
- Visualizzazione per cameriera e per giorno
- KPI integrati nella overview

### 8. Report Pasti (Breakfast)
- Caricamento report colazioni giornaliero
- Visualizzazione per tipo pasto e per giorno
- Grafici consumo
- Gruppi e note per prenotazioni speciali

### 9. Operativa Breakfast (BKF Sheet)
- Caricamento PDF foglio operativo colazioni per SoulArt e Art Resort
- Analisi via Claude AI → tabella ospiti con camera, trattamento, note
- Sincronizzazione dati con Google Sheets

### 10. Operativa Housekeeping (HKP)
- Dati cameriere da Google Sheets (aggiornati in tempo reale)
- Classifica mensile camere pulite per cameriera
- Sparkline trend giornaliero
- Tab "Per giorno" con dettaglio giornaliero
- Due strutture: SoulArt Hotel e Art Resort

### 11. Reclami
- Registrazione reclami per struttura, reparto, categoria
- Storico e follow-up

### 12. Audit qualità
- Checklist audit periodici
- Storico per struttura

### 13. DVR — Documento Valutazione Rischi
- Anagrafica dipendenti per società con tipo contratto
- Alert scadenze contratto (rosso < 0gg, ambra ≤ 30gg)
- Ordinamento fisso: Corduas Vincenzo → Presta Pierpaolo → determinati per scadenza → alfabetico

### 14. Inventari e Ordini
- Stock per magazzino (SoulArt Hotel / Art Resort)
- Movimenti: carico (`in`), scarico (`out`), rettifica (`init`)
- Gestione ordini fornitore sincronizzati tra dispositivi
- Analisi consumo settimanale e prodotti da riordinare (autonomia ≤ 14gg)
- Stampa A4 giacenza

### 15. Piano Settimana
- Caricamento PDF piano camere settimanale
- Visualizzazione partenze, fermate, cambi per ogni giorno
- Alimenta la PWA Distribuzione Culligan

### 16. Preferenze Turni
- Raccoglie richieste da Google Forms (compilato dallo staff)
- Calendario mensile con conteggio richieste per giorno
- Filtro per reparto
- Badge notifiche richieste non lette

### 17. Distribuzione Culligan
- Dashboard riepilogo del giro mattutino (Da mettere / Non consumate / Da visitare)
- **QC Settimanale**: conta quante volte ogni camera ha avuto la bottiglia sostituita nella settimana corrente (dom→sab)
- Stampa A4 bottiglie da mettere + camere DND
- Invio report settimanale via WhatsApp alla direttrice

---

## Upload Center — cosa si carica dove

Ogni sezione ha la propria zona di upload (drag & drop o click). Ecco cosa si carica in ciascuna:

### Turni staff
**File accettato**: PDF o TSV esportato dal gestionale turni  
**Cosa fa**: invia il file a Claude AI che estrae nome, reparto e turno per ogni giorno della settimana → popola la vista turni con i 7 giorni → salva in KV per sincronizzazione automatica su tutti i dispositivi

### Arrivi giornalieri
**File accettato**: PDF "Riepilogo Reception" o lista arrivi HIC dal gestionale  
**Cosa fa**: Claude AI legge il PDF e struttura gli arrivi per struttura (SoulArt, Art Resort, ecc.) con camera, nome ospite, trattamento, pax → alimenta i KPI overview, il piano colazioni, e il piano distribuzione Culligan

### Registration Cards
**File accettato**: PDF lista arrivi giornalieri  
**Cosa fa**: estrae con PDF.js (lato client, senza AI) nome ospite, numero camera, pax, trattamento, date check-in/out → genera le registration card pronte per la stampa

### Report Pulizie
**File accettato**: file di testo (.txt) con il report giornaliero delle pulizie  
**Cosa fa**: parser testuale lato client → estrae camere pulite per cameriera e per giorno → aggiorna i KPI pulizie nell'overview

### Report Pasti (Breakfast)
**File accettato**: file di testo (.txt) con il report giornaliero colazioni  
**Cosa fa**: parser testuale lato client → estrae pasti per tipo e per giorno → aggiorna i KPI breakfast nell'overview e i grafici consumo

### Operativa Breakfast — SoulArt
**File accettato**: PDF foglio operativo colazioni SoulArt  
**Cosa fa**: invia il PDF a Claude AI che estrae la lista ospiti con camera, numero persone, trattamento, orario e note speciali → tabella operativa per il breakfast manager

### Operativa Breakfast — Art Resort
**File accettato**: PDF foglio operativo colazioni Art Resort  
**Cosa fa**: identico al precedente, per la struttura Art Resort

### Piano Settimana
**File accettato**: PDF piano camere settimanale dal gestionale  
**Cosa fa**: Claude AI estrae per ogni giorno della settimana le partenze, fermate e cambi camera per SoulArt Hotel → alimenta la PWA Distribuzione Culligan (banner stato piano, icone per camera)

### Recensioni (per ogni struttura)
**File accettato**: CSV esportato da Booking.com (una struttura alla volta)  
**Cosa fa**: parser CSV lato client → carica tutte le recensioni con punteggio, testo, data → calcola score pesato → mostra lista con filtri e stato risposta

---

## Sincronizzazione dati

- **localStorage** — persistenza locale immediata
- **Cloudflare KV** (via proxy `anthropic-proxy.qm-d82.workers.dev`) — sync cloud tra dispositivi; tutte le fetch usano `cache: 'no-store'` per evitare dati stantii
- **Google Sheets** (Apps Script) — turni staff, dati HKP, preferenze turni, dati breakfast operativi
- Stato sync visibile nel topbar (punto colorato)

## AI Integration

Claude API (`claude-sonnet-4-6`) via proxy Cloudflare. Usata per:
- Parsing turni da PDF/immagine
- Parsing arrivi giornalieri da PDF
- Parsing foglio operativo breakfast da PDF
- Parsing piano settimana da PDF
- Generazione risposte recensioni Booking.com

---

## Storage keys principali (KV / localStorage)

| Chiave | Contenuto |
|--------|-----------|
| `qm_weekData` | Turni settimanali |
| `qm_arriviData` | Arrivi giornalieri parsati |
| `qm_cm_YYYY-MM-DD` | Stato giro Culligan per giorno |
| `qm_piano` | Piano settimana camere |
| `qm_inv_catalog` | Anagrafica prodotti inventario |
| `qm_inv_moves_sa` / `_ar` | Movimenti inventario per magazzino |
| `qm_inv_orders` | Ordini fornitore |
| `qm_dvr` | Dati DVR dipendenti |
| `qm_turni_pref` | Preferenze turni staff |
| `qm_checklist` | Stato task checklist |
| `qm_reclami` | Storico reclami |
| `qm_audit` | Storico audit |
| `rev_data_[sa/bh/sl/pr/ms/ar/sb]` | Recensioni per struttura |
