// Worker Compass QM — sorgente canonica, versionata nel repository.
//
// Per aggiornare quello in produzione: Cloudflare → Workers → anthropic-proxy →
// "Modifica codice" → Cmd+A → incolla questo file → Deploy.
// Le variabili si impostano in Impostazioni → Variabili e segreti (mai nel codice).
//
// Cosa fa, in ordine di percorso:
//   /kv/get|set|delete   archivio condiviso fra i dispositivi (binding QM_STORAGE)
//   qualsiasi altro      proxy verso l'API Anthropic
//
// Variabili usate:
//   QM_STORAGE (binding KV) · ANTHROPIC_API_KEY
//   QM_PASSWORD, QM_AUTH_SECRET, QM_AUTH_OBBLIGATORIA   accesso (lasciapassare)
//   CF_API_TOKEN, CF_ACCOUNT_ID, CF_KV_NAMESPACE        consumo KV (facoltative)

// Versione di questo file. Il Worker si pubblica a mano (copia-incolla su Cloudflare):
// senza un numero dichiarato dal Worker stesso non c'è modo di sapere se quello in
// produzione contiene davvero l'ultima correzione. Lo restituisce /versione.
const WORKER_VERSIONE = '2026-10-01a';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      // X-QM-Pass va dichiarata qui, altrimenti il browser rifiuta di inviarla e ogni
      // richiesta arriverebbe senza lasciapassare — con la porta chiusa, tutto fermo.
      'Access-Control-Allow-Headers': 'Content-Type, X-QM-Pass',
      'Access-Control-Max-Age': '86400',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const json = (obj, status) => new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // ── ACCESSO: PASSWORD → LASCIAPASSARE ──
    // /kv/* era completamente aperto: chiunque conoscesse l'indirizzo di questo Worker —
    // scritto nel codice del sito, quindi pubblico — poteva LEGGERE tutti i dati di Compass
    // (nomi degli ospiti, cassa, DDT), MODIFICARLI e CANCELLARLI.
    // Verificato il 02/09/2026 con tre richieste da riga di comando, senza credenziali.
    //
    // La chiusura avviene in tre tempi, per non lasciare fuori nessuno:
    //   1. (adesso) il Worker rilascia lasciapassare, ma continua ad accettare tutto;
    //      conta pero' quanti accessi arrivano senza, per sapere quando si puo' chiudere.
    //   2. Compass e le app cominciano a usarlo: una password per dispositivo, una volta.
    //   3. quando il contatore degli accessi anonimi resta a zero per un giorno intero,
    //      si mette QM_AUTH_OBBLIGATORIA=si e la porta si chiude.
    //
    // Il lasciapassare e' firmato con QM_AUTH_SECRET e scade: non e' un segreto scritto nel
    // sito, quindi leggerne il sorgente non serve a niente.
    if (url.pathname === '/auth') {
      let corpo; try { corpo = await request.json(); } catch (e) { corpo = {}; }
      if (!env.QM_PASSWORD || !env.QM_AUTH_SECRET)
        return json({ ok: false, error: 'Accesso non ancora configurato sul Worker' }, 501);
      if (String(corpo.password || '') !== String(env.QM_PASSWORD))
        return json({ ok: false, error: 'Password non valida' }, 401);
      const scade = Date.now() + 180 * 86400000;      // sei mesi: si digita due volte l'anno
      return json({ ok: true, pass: await firmaPass(env, scade), scade });
    }

    // ── CODICE DELLA GALLERIA (12/09/2026) ──
    // Gestione Biancheria (biancheria-galleria.html) gira sui PC del Resident Manager, che
    // NON devono vedere l'archivio di Compass: ospiti, turni, cassa, fascicolo dipendenti.
    // Ricevono quindi un lasciapassare DIVERSO, "bg.<scadenza>.<firma>", che apre soltanto
    // la lettura e la scrittura delle chiavi bg_* (vedi permessoGalleria). Lo rilascia chi
    // ha già il lasciapassare di Compass, cioè il QM dal Pannello di Controllo; dura un anno
    // e l'app lo rinnova da sola. Si revoca come l'altro: cambiando QM_AUTH_SECRET.
    if (url.pathname === '/auth/galleria' || url.pathname === '/auth/galleria/rinnova') {
      const pass = request.headers.get('X-QM-Pass') || '';
      const ok = url.pathname === '/auth/galleria' ? await verificaPass(env, pass) : await verificaPassBg(env, pass);
      if (!ok) return json({ ok: false, error: 'Accesso non autorizzato' }, 401);
      const scade = Date.now() + 365 * 86400000;
      return json({ ok: true, pass: await firmaPassBg(env, scade), scade });
    }

    // Vale per tutti i percorsi /kv/*. Finche' QM_AUTH_OBBLIGATORIA non e' 'si' non blocca
    // niente: si limita a contare chi passa senza lasciapassare, cosi' la decisione di
    // chiudere si prende su un numero e non a sensazione.
    if (url.pathname.startsWith('/kv/')) {
      const pass = request.headers.get('X-QM-Pass') || url.searchParams.get('pass') || '';
      let valido = await verificaPass(env, pass);
      // Codice della Galleria: vale solo per leggere e scrivere chiavi bg_*, anche a porta
      // aperta — altrimenti un codice limitato aprirebbe più di quanto dichiara.
      if (!valido && String(pass).startsWith('bg.')) {
        if (!(await verificaPassBg(env, pass))) return json({ ok: false, error: 'Accesso non autorizzato' }, 401);
        let chiave = '';
        if (url.pathname === '/kv/get') chiave = url.searchParams.get('key') || '';
        else if (url.pathname === '/kv/set') { try { chiave = String((await request.clone().json()).key || ''); } catch (e) {} }
        if (!permessoGalleria(url.pathname, chiave))
          return json({ ok: false, error: 'Questo codice apre solo i dati della Galleria' }, 403);
        valido = true;
      }
      if (!valido) {
        if (String(env.QM_AUTH_OBBLIGATORIA || '').toLowerCase() === 'si')
          return json({ ok: false, error: 'Accesso non autorizzato' }, 401);
        // Traccia gli accessi senza lasciapassare SENZA bruciare le scritture.
        //
        // La prima versione di questo contatore (02/09/2026) ne consumava una per OGNI
        // richiesta. Le letture sul piano gratuito sono 100.000 al giorno e non erano un
        // problema; le scritture sono 1.000, e ogni interrogazione di ogni dispositivo —
        // il giro di controllo ogni 30 secondi, moltiplicato per i PC e i telefoni — e'
        // diventata una scrittura. Il 03/09/2026 il limite era esaurito nel pomeriggio, e
        // da quel momento nessun dispositivo poteva piu' salvare niente.
        //
        // Ora si scrive al massimo una volta ogni 10 minuti (144 al giorno nel caso
        // peggiore). Il numero non e' piu' il totale degli accessi anonimi ma quante
        // finestre da dieci minuti hanno visto passare qualcuno senza lasciapassare: per
        // decidere se chiudere la porta serve sapere se e' zero, non quanto vale.
        try {
          const g = 'qm_auth_anon_' + new Date().toISOString().slice(0, 10);
          let st = {};
          try { st = JSON.parse(await env.QM_STORAGE.get(g) || '{}') || {}; } catch (e) { st = {}; }
          const ora = Date.now();
          if (typeof st !== 'object' || !st.ultimo || ora - st.ultimo > 600000) {
            await env.QM_STORAGE.put(g, JSON.stringify({
              n: ((st && st.n) || 0) + 1,
              ultimo: ora,
              visto: new Date(ora).toISOString(),
            }), { expirationTtl: 1209600 });
          }
        } catch (e) {}
      }
    }

    // ── ARCHIVIO KV ──
    // Elenco delle chiavi presenti nell'archivio. Serve al backup: KV non si racconta da
    // solo, e finora l'elenco di cosa salvare era scritto a mano in app.js — una chiave
    // nuova che nessuno aggiungeva restava fuori dal backup senza che si potesse
    // accorgersene, fino al giorno in cui l'originale non c'e' piu'.
    //
    // Sta sotto /kv/, quindi passa dallo stesso cancello: a porta chiusa vuole il
    // lasciapassare come tutto il resto. Le operazioni di elenco hanno un tetto proprio
    // (1.000 al giorno sul piano gratuito) e ognuna di queste ne consuma una per pagina:
    // e' pensato per il backup notturno, non per essere chiamato di continuo.
    if (url.pathname === '/kv/chiavi') {
      const chiavi = [];
      let cursore = undefined;
      // Tetto di sicurezza: 20 pagine da 1.000 = 20.000 chiavi. Oltre, meglio fermarsi e
      // dirlo che restare in giro finche' il Worker non viene ucciso per tempo di CPU.
      for (let i = 0; i < 20; i++) {
        const p = await env.QM_STORAGE.list({ limit: 1000, cursor: cursore });
        (p.keys || []).forEach(k => chiavi.push(k.name));
        if (p.list_complete || !p.cursor) return json({ ok: true, chiavi, complete: true });
        cursore = p.cursor;
      }
      return json({ ok: true, chiavi, complete: false });
    }
    if (url.pathname === '/kv/get') {
      const key = url.searchParams.get('key');
      if (!key) return new Response('missing key', { status: 400, headers: corsHeaders });
      return json({ value: await env.QM_STORAGE.get(key) });
    }
    if (url.pathname === '/kv/set') {
      const body = await request.json();
      await env.QM_STORAGE.put(body.key, body.value);
      return json({ ok: true });
    }
    if (url.pathname === '/kv/delete') {
      const key = url.searchParams.get('key');
      if (!key) return new Response('missing key', { status: 400, headers: corsHeaders });
      await env.QM_STORAGE.delete(key);
      return json({ ok: true });
    }

    // Il Worker si pubblica a mano: una correzione può essere scritta, versionata e non
    // attiva, senza che nessuno se ne accorga (è successo il 21/08/2026, per ore). Questo
    // punto permette a test/esegui.sh di confrontare la versione viva con quella nel
    // repository e segnalare la differenza prima di ogni pubblicazione.
    // Senza chiave di proposito: una stringa di versione non è un segreto, e un controllo
    // che richiede credenziali è un controllo che nessuno esegue.
    if (url.pathname === '/versione') {
      // `portaChiusa` serve alla scheda "Stato del sistema" di Compass: la variabile la
      // imposta il QM su Cloudflare, e da Compass non c'era modo di sapere se avesse fatto
      // presa. Non e' un segreto — dice solo se le richieste vengono filtrate, cosa che
      // chiunque scopre in un secondo provando a fare una richiesta.
      return json({
        ok: true,
        versione: WORKER_VERSIONE,
        portaChiusa: String(env.QM_AUTH_OBBLIGATORIA || '').toLowerCase() === 'si',
      });
    }


    // ── CONSUMO KV — il contatore vero di Cloudflare, tutte le postazioni ──────────
    // Il tetto stretto e' 1.000 scritture al giorno e ci e' gia' costato una giornata di
    // lavoro (03/09/2026). Ogni dispositivo puo' contare le proprie, ma il ciclo impazzito
    // puo' stare su un'altra macchina: serve il numero complessivo, e l'unico che lo conosce
    // e' Cloudflare stessa.
    //
    // Si interroga la sua interfaccia statistiche in sola lettura. Nessuna scrittura, nessun
    // dato di ospiti: solo quanti sono stati gli accessi all'archivio. Se le variabili non ci
    // sono, o il piano non espone quei dati, si risponde `disponibile:false` e Compass non
    // mostra la riga — meglio niente che un numero inventato.
    if (url.pathname === '/consumo') {
      const passC = request.headers.get('X-QM-Pass') || url.searchParams.get('pass') || '';
      if (String(env.QM_AUTH_OBBLIGATORIA || '').toLowerCase() === 'si' && !(await verificaPass(env, passC)))
        return json({ ok: false, error: 'Accesso non autorizzato' }, 401);
      if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_KV_NAMESPACE)
        return json({ ok: true, disponibile: false, motivo: 'variabili non configurate sul Worker' });

      const oggi = new Date().toISOString().slice(0, 10);
      const q = `query($acct:String!,$ns:String!,$dal:Date!){
        viewer{ accounts(filter:{accountTag:$acct}){
          kvOperationsAdaptiveGroups(limit:1000, filter:{date_geq:$dal, namespaceId:$ns}){
            sum{ requests } dimensions{ actionType }
          } } } }`;
      try {
        const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + env.CF_API_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, variables: { acct: env.CF_ACCOUNT_ID, ns: env.CF_KV_NAMESPACE, dal: oggi } }),
        });
        const j = await r.json();
        if (j.errors && j.errors.length)
          return json({ ok: true, disponibile: false, motivo: (j.errors[0] && j.errors[0].message) || 'la statistica non risponde' });
        const gruppi = (((j.data || {}).viewer || {}).accounts || [{}])[0];
        const righe = (gruppi && gruppi.kvOperationsAdaptiveGroups) || [];
        const per = {};
        righe.forEach(x => {
          const tipo = ((x.dimensions || {}).actionType) || 'altro';
          per[tipo] = (per[tipo] || 0) + (((x.sum || {}).requests) || 0);
        });
        return json({ ok: true, disponibile: true, giorno: oggi, operazioni: per });
      } catch (e) {
        return json({ ok: true, disponibile: false, motivo: (e && e.message) || 'errore di rete' });
      }
    }

    // ── PROXY ANTHROPIC ──
    // Anche questo vuole il lasciapassare. Non custodisce dati degli ospiti — quelli stanno
    // in /kv/ — ma gira richieste a carico di ANTHROPIC_API_KEY: senza controllo, chiunque
    // conosca l'indirizzo del Worker (che e' pubblico nel sorgente del sito) puo' spendere
    // soldi altrui. Stesso interruttore di /kv/: finche' QM_AUTH_OBBLIGATORIA non e' 'si'
    // non blocca niente, cosi' l'ordine di pubblicazione non puo' spegnere l'analisi dei PDF.
    if (String(env.QM_AUTH_OBBLIGATORIA || '').toLowerCase() === 'si') {
      const passAI = request.headers.get('X-QM-Pass') || url.searchParams.get('pass') || '';
      if (!(await verificaPass(env, passAI)))
        return json({ ok: false, error: 'Accesso non autorizzato' }, 401);
    }
    const body = await request.json();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    return json(await response.json());
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Utilità comuni
// ────────────────────────────────────────────────────────────────────────────
// Lasciapassare = scadenza + firma HMAC-SHA256 con QM_AUTH_SECRET. Non contiene dati e non
// si puo' fabbricare senza il segreto, che vive solo qui sul Worker.
async function chiaveHmac(env) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(String(env.QM_AUTH_SECRET || '')),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
function b64url(buf) {
  let s = '';
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function firmaPass(env, scade) {
  const k = await chiaveHmac(env);
  const f = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(String(scade)));
  return scade + '.' + b64url(f);
}
async function verificaPass(env, pass) {
  try {
    if (!env.QM_AUTH_SECRET || !pass) return false;
    const i = String(pass).indexOf('.');
    if (i < 1) return false;
    const scade = Number(String(pass).slice(0, i));
    if (!(scade > Date.now())) return false;              // scaduto
    return (await firmaPass(env, scade)) === String(pass); // firma corrispondente
  } catch (e) { return false; }
}

// Il lasciapassare della Galleria: stessa firma, ma su "bg.<scadenza>", così uno non si
// può spacciare per l'altro.
async function firmaPassBg(env, scade) {
  const k = await chiaveHmac(env);
  const f = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('bg.' + scade));
  return 'bg.' + scade + '.' + b64url(f);
}
async function verificaPassBg(env, pass) {
  try {
    if (!env.QM_AUTH_SECRET || !pass) return false;
    const m = String(pass).match(/^bg\.(\d+)\./);
    if (!m) return false;
    const scade = Number(m[1]);
    if (!(scade > Date.now())) return false;
    return (await firmaPassBg(env, scade)) === String(pass);
  } catch (e) { return false; }
}
// Cosa apre il codice della Galleria: SOLO /kv/get e /kv/set, SOLO chiavi bg_*. Niente
// elenco delle chiavi, niente cancellazioni, niente proxy AI.
function permessoGalleria(percorso, chiave) {
  if (percorso !== '/kv/get' && percorso !== '/kv/set') return false;
  return /^bg_[A-Za-z0-9_]+$/.test(String(chiave || ''));
}
