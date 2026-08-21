#!/bin/bash
# Da lanciare QUANDO SI COMINCIA a lavorare su una macchina — casa o hotel:
#
#     bash strumenti/inizio.sh
#
# Dice com'è messa questa copia rispetto alle altre e, se può farlo senza rischi,
# si allinea da sola. Non tocca mai niente quando c'è il minimo dubbio: in quel caso
# spiega la situazione e si ferma.
#
# Il problema che risolve: cominciare a modificare una copia vecchia. Il lavoro non si
# perde — git non perde niente — ma le due versioni divergono e vanno riunite a mano,
# che è la parte fastidiosa.

cd "$(dirname "$0")/.." || exit 1
echo ""

if ! git fetch -q origin 2>/dev/null; then
  echo "  Non riesco a raggiungere il repository remoto."
  echo "  Controlla la connessione: senza, non posso sapere se questa copia è aggiornata."
  exit 1
fi

SPORCO=$(git status --porcelain | grep -v '^??' | wc -l | tr -d ' ')
DIETRO=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
AVANTI=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)

# ── Caso 1: lavoro non salvato ────────────────────────────────────────────────
if [ "$SPORCO" -gt 0 ]; then
  echo "  ATTENZIONE — ci sono modifiche non salvate su questa copia:"
  echo ""
  git status --short | grep -v '^??' | sed 's/^/      /'
  echo ""
  echo "  Non sincronizzo: prima vanno salvate o scartate, altrimenti si rischia"
  echo "  di mescolarle con quelle arrivate dall'altra macchina."
  exit 1
fi

# ── Caso 2: le due copie sono andate ognuna per conto suo ─────────────────────
if [ "$DIETRO" -gt 0 ] && [ "$AVANTI" -gt 0 ]; then
  echo "  Le due copie hanno lavori diversi che vanno riuniti."
  echo ""
  echo "      solo qui:        $AVANTI"
  git log --oneline origin/main..HEAD | sed 's/^/      /'
  echo ""
  echo "      solo sull'altra: $DIETRO"
  git log --oneline HEAD..origin/main | sed 's/^/      /'
  echo ""
  echo "  Non decido da solo come unirli: dimmelo e lo facciamo insieme."
  exit 1
fi

# ── Caso 3: questa copia è indietro → si allinea ──────────────────────────────
if [ "$DIETRO" -gt 0 ]; then
  echo "  Arrivano $DIETRO modifiche dall'altra macchina:"
  echo ""
  git log --oneline HEAD..origin/main | sed 's/^/      /'
  echo ""
  git pull -q --ff-only origin main && echo "  Copia allineata." || { echo "  Allineamento non riuscito."; exit 1; }
  echo ""
  echo "  Verifico che tutto regga insieme..."
  echo ""
  bash test/esegui.sh | tail -3
  exit $?
fi

# ── Caso 4: questa copia ha roba non ancora pubblicata ────────────────────────
if [ "$AVANTI" -gt 0 ]; then
  echo "  Questa copia ha $AVANTI modifiche non ancora pubblicate:"
  echo ""
  git log --oneline origin/main..HEAD | sed 's/^/      /'
  echo ""
  echo "  Vanno pubblicate, altrimenti dall'altra macchina non si vedono."
  exit 1
fi

echo "  Tutto allineato: questa copia è identica alle altre."
echo ""
