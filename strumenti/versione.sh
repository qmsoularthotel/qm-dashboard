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

# Le 5 app standalone portano dentro di sé la propria versione (QM_APP_BUILD): all'avvio
# la confrontano con quella pubblicata e, se non coincide, si ricaricano. Senza questo
# aggiornamento automatico il numero resterebbe fermo e il controllo diventerebbe inutile:
# l'app crederebbe di essere aggiornata qualunque cosa succeda.
for app in ('housekeeper.html', 'breakfast.html', 'controllo-mattino.html',
            'inventory.html', 'dvr.html'):
    if not cambiato(app):
        continue
    t = open(app, encoding='utf-8').read()
    m = re.search(r"const QM_APP_BUILD='([\d-]+)\.(\d+)'", t)
    if not m:
        continue
    data, n = m.group(1), int(m.group(2))
    oggi_p = datetime.date.today().strftime('%Y-%m-%d')
    nuovo = f"{oggi_p}.{n + 1 if data == oggi_p else 1}"
    t = re.sub(r"const QM_APP_BUILD='[^']*'", f"const QM_APP_BUILD='{nuovo}'", t)
    open(app, 'w', encoding='utf-8').write(t)
    fatto.append(f"{app} -> {nuovo}")

if fatto:
    for f in fatto:
        print('  aggiornato ' + f)
else:
    print('  nessun aggiornamento necessario: app.js e style.css non sono cambiati')
PY
