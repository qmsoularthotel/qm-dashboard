#!/usr/bin/env python3
"""Prova delle pagine nel browser (26/09/2026).

I controlli di test/controlli.js verificano i calcoli, ma non APRONO le pagine: un errore che
blocca il caricamento (una funzione definita due volte, un testo con caratteri rotti, una
parentesi mancante) passava inosservato fino a quando qualcuno apriva l'app. Qui ogni pagina
si apre davvero in Chrome senza finestra, e si segnala ogni errore JavaScript non gestito.

Non tocca i dati veri: il browser di prova non ha il lasciapassare, quindi ogni richiesta al
cloud viene rifiutata (401) e non si scrive niente.

Senza Chrome (sessioni sul web, Linux) la prova si salta e lo dice: esce con 0.
Esce con 1 se una pagina ha errori.
"""
import http.server, functools, threading, subprocess, tempfile, shutil, os, re, sys, socket

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PAGINE = ['index.html', 'housekeeper.html', 'breakfast.html', 'inventory.html',
          'controllo-mattino.html', 'dvr.html', 'reception.html',
          'registration-galleria.html', 'biancheria-galleria.html']
# Errori che non dipendono dal nostro codice: rete assente o rifiutata (il browser di prova
# non e' abilitato) e risorse esterne. Tutto il resto e' un difetto.
IGNORA = re.compile(r'Failed to load resource|net::ERR_|status of 40[13]|favicon', re.I)

def cartella():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Gestore(http.server.SimpleHTTPRequestHandler):
    # Senza charset il browser legge male gli accenti e una regex di app.js diventa invalida:
    # su GitHub Pages non succede, qui va dichiarato.
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'application/javascript; charset=utf-8',
                      '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8'}
    def log_message(self, *a): pass

def main():
    if not os.path.exists(CHROME):
        print('  (prova delle pagine saltata: Chrome non disponibile su questa macchina)')
        return 0
    s = socket.socket(); s.bind(('127.0.0.1', 0)); porta = s.getsockname()[1]; s.close()
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', porta),
                                          functools.partial(Gestore, directory=cartella()))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    errori = 0
    def prova(p):
        # --incognito e NON --user-data-dir: un profilo nuovo sul Mac resta in attesa del
        # portachiavi e non finisce mai; l'incognito parte pulito (niente cache ne' service
        # worker delle prove precedenti) e non chiede niente.
        prof = tempfile.mkdtemp()
        try:
            r = subprocess.run([CHROME, '--headless=new', '--incognito', '--disable-gpu',
                                '--enable-logging=stderr', '--v=0',
                                '--virtual-time-budget=6000', '--window-size=1200,800',
                                '--screenshot=' + os.path.join(prof, 's.png'),
                                f'http://127.0.0.1:{porta}/{p}'],
                               capture_output=True, text=True, timeout=45)
            return [l for l in r.stderr.splitlines() if 'CONSOLE' in l]
        except subprocess.TimeoutExpired:
            return ['la pagina non ha finito di caricarsi in 45 secondi']
        finally:
            shutil.rmtree(prof, ignore_errors=True)
    def apri(p):
        # Un secondo tentativo solo se il browser di prova non risponde: capita, senza che la
        # pagina c'entri, e non deve diventare un falso allarme che si impara a ignorare.
        righe = prova(p)
        if len(righe) == 1 and 'non ha finito' in righe[0]:
            righe = prova(p)
        return righe
    # Tre pagine per volta: una per volta la prova durava fino a due minuti.
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=3) as ex:
        esiti = dict(zip(PAGINE, ex.map(apri, PAGINE)))
    for p in PAGINE:
        righe = esiti[p]
        cattivi = []
        for l in righe:
            m = re.search(r'"(.*)", source: (\S+) \((\d+)\)', l)
            testo = m.group(1) if m else l
            if IGNORA.search(testo): continue
            if 'Uncaught' in testo or 'SyntaxError' in testo or 'non ha finito' in testo:
                dove = f' ({m.group(2).rsplit("/",1)[-1]}:{m.group(3)})' if m else ''
                cattivi.append(testo[:200] + dove)
        if cattivi:
            errori += 1
            print(f'  ERRORE      {p}:')
            for c in cattivi[:5]: print('              ' + c)
        else:
            print(f'  ok  {p} si apre senza errori')
    srv.shutdown()
    return 1 if errori else 0

if __name__ == '__main__':
    sys.exit(main())
