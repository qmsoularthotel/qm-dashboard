# Reception — Cassa (tolta il 10/11/2026)

**Passaggi di Cassa è stata tolta da Compass il 10/11/2026**, su richiesta del QM: era una
funzione prevista e mai messa in uso. Sono stati tolti:

- la voce di menu "Passaggi di Cassa" (sezione Reception) e la vista `view-reception`;
- la sezione `§§ RECEPTION — CASSA` di `app.js` (`receptionLoad`, `receptionRender`,
  `_receptionSave`, `_cassaUnisci`…) e le classi `.reception-kpi-grid` di `style.css`;
- l'app `reception.html` (fondo cassa da €100, incasso contante a tre fasce);
- le chiavi `qm_cassa_fondo`, `qm_cassa_incasso`, `qm_cassa_rimossi` dal backup e dallo
  Stato del sistema (sul cloud, se c'erano, restano: nessuno le legge più);
- i controlli della cassa in `test/controlli.js` e `test/esegui.sh`.

Restano in `app.js`, sopra il Reso Biancheria, i pulsanti-icona `_receptionActBtn` e
`RECEPTION_ICON_*`: li usano anche altre sezioni. Nella sezione Reception del menu restano
Preferenze Turni e Turnazione Corrente.

**Per recuperarla**: l'ultima versione completa è al commit `3299058` (prima della rimozione).
`git show 3299058:reception.html`, `git show 3299058:docs/reception-cassa.md` (il racconto completo:
modello dati, fondo = contanti + buoni, scrittura sicura per `id`), `git show 3299058:app.js`
per la sezione di Compass.
