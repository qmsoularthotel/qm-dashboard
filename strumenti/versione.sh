#!/bin/bash
# Aggiorna i numeri di versione in index.html — si lancia con:
#
#     bash strumenti/versione.sh
#
# Servono a costringere il browser a ricaricare i file modificati: senza, si ricarica la
# pagina e non cambia niente, perché il browser riusa la copia vecchia.
#
# Aggiorna solo quello che serve davvero: se app.js non è cambiato rispetto all'ultima
# pubblicazione, il suo numero resta com'è. Così il numero cresce quando c'è un motivo.
cd "$(dirname "$0")/.." || exit 1

python3 - <<'PY'
import re, subprocess, datetime

OGGI = datetime.date.today().strftime('%Y%m%d')

def cambiato(f):
    """True se il file è diverso dall'ultimo commit (o non è ancora tracciato)."""
    r = subprocess.run(['git', 'diff', 'HEAD', '--name-only', '--', f],
                       capture_output=True, text=True)
    if r.stdout.strip():
        return True
    r = subprocess.run(['git', 'ls-files', '--others', '--exclude-standard', '--', f],
                       capture_output=True, text=True)
    return bool(r.stdout.strip())

s = open('index.html', encoding='utf-8').read()
orig = s
fatto = []

# app.js e la costante V vanno insieme: V è il controllo che forza la ricarica della pagina
if cambiato('app.js'):
    m = re.search(r"app\.js\?v=(\d+)-\d+", s)
    if m:
        n = int(m.group(1)) + 1
        s = re.sub(r"app\.js\?v=\d+-\d+", f"app.js?v={n}-{OGGI}", s)
        fatto.append(f"app.js -> v{n}-{OGGI}")
    m = re.search(r"const V='(\d+)-\d+'", s)
    if m:
        n = int(m.group(1)) + 1
        s = re.sub(r"const V='\d+-\d+'", f"const V='{n}-{OGGI}'", s)
        fatto.append(f"ricarica pagina -> V={n}-{OGGI}")

if cambiato('style.css'):
    m = re.search(r"style\.css\?v=(\d+)", s)
    if m:
        n = int(m.group(1)) + 1
        s = re.sub(r"style\.css\?v=\d+", f"style.css?v={n}", s)
        fatto.append(f"style.css -> v{n}")

if s != orig:
    open('index.html', 'w', encoding='utf-8').write(s)

if fatto:
    for f in fatto:
        print('  aggiornato ' + f)
else:
    print('  nessun aggiornamento necessario: app.js e style.css non sono cambiati')
PY
