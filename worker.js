// Worker Compass QM — sorgente canonica, versionata nel repository.
//
// Per aggiornare quello in produzione: Cloudflare → Workers → anthropic-proxy →
// "Modifica codice" → Cmd+A → incolla questo file → Deploy.
// Le variabili si impostano in Impostazioni → Variabili e segreti (mai nel codice).
//
// Cosa fa, in ordine di percorso:
//   /kv/get|set|delete   archivio condiviso fra i dispositivi (binding QM_STORAGE)
//   /prestay/send        invio del messaggio pre-stay (SMTP della casella dell'hotel)
//   /prestay/risposte    lettura IMAP delle SOLE risposte degli ospiti indicati
//   qualsiasi altro      proxy verso l'API Anthropic
//
// Variabili usate:
//   QM_STORAGE (binding KV) · ANTHROPIC_API_KEY
//   PRESTAY_KEY            chiave condivisa con Compass (header X-Prestay-Key)
//   SMTP_HOST/PORT/USER/PASS   invio; il mittente è SMTP_FROM oppure SMTP_USER
//   PRESTAY_REPLYTO        indirizzo per le risposte degli ospiti
//   IMAP_HOST/PORT/USER/PASS   lettura risposte (casella del Quality Manager)
//   RESEND_KEY, PRESTAY_FROM   riserva usata solo se le variabili SMTP mancano
import { connect } from 'cloudflare:sockets';

const ORIGINI = [
  'https://www.compass-qm.com',
  'https://compass-qm.com',
  'https://qmsoularthotel.github.io'
];
const PRESTAY_MAX_GIORNO = 60;      // tetto di sicurezza sugli invii, non un limite d'uso
const RISPOSTE_MAX_INDIRIZZI = 30;  // quante caselle si possono interrogare in una volta

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Prestay-Key',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const json = (obj, status) => new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // ── ARCHIVIO KV ──
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

    // Origine e chiave: valgono per tutti i percorsi /prestay/*
    const autorizza = () => {
      const origin = request.headers.get('Origin') || '';
      if (!ORIGINI.includes(origin)) return json({ ok: false, error: 'Origine non ammessa' }, 403);
      if (request.headers.get('X-Prestay-Key') !== env.PRESTAY_KEY)
        return json({ ok: false, error: 'Chiave non valida' }, 401);
      return null;
    };

    // ── INVIO MESSAGGIO PRE-STAY ──
    if (url.pathname === '/prestay/send') {
      const no = autorizza(); if (no) return no;

      let dati;
      try { dati = await request.json(); }
      catch (e) { return json({ ok: false, error: 'Dati non validi' }, 400); }
      if (!dati.to || !dati.subject || !dati.text)
        return json({ ok: false, error: 'Mancano destinatario, oggetto o testo' }, 400);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dati.to))
        return json({ ok: false, error: 'Indirizzo non valido' }, 400);

      const oggi = new Date().toISOString().slice(0, 10);
      const contatore = 'prestay_count_' + oggi;
      let n = 0;
      try { n = parseInt(await env.QM_STORAGE.get(contatore) || '0', 10) || 0; } catch (e) {}
      if (n >= PRESTAY_MAX_GIORNO) return json({ ok: false, error: 'Limite giornaliero raggiunto' }, 429);

      const viaSmtp = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
      try {
        if (viaSmtp) await inviaConSmtp(env, dati);
        else await inviaConResend(env, dati);
      } catch (e) {
        return json({ ok: false, error: (e && e.message) || 'invio fallito' }, 502);
      }
      try { await env.QM_STORAGE.put(contatore, String(n + 1), { expirationTtl: 172800 }); } catch (e) {}
      return json({ ok: true });
    }

    // ── LETTURA RISPOSTE DEGLI OSPITI ──
    // Cerca SOLO messaggi provenienti dagli indirizzi passati da Compass: l'endpoint non
    // può quindi restituire il resto della casella, nemmeno a chi avesse la chiave.
    if (url.pathname === '/prestay/risposte') {
      const no = autorizza(); if (no) return no;
      if (!(env.IMAP_HOST && env.IMAP_USER && env.IMAP_PASS))
        return json({ ok: false, error: 'Lettura risposte non configurata sul Worker' }, 400);

      let dati;
      try { dati = await request.json(); }
      catch (e) { return json({ ok: false, error: 'Dati non validi' }, 400); }

      const validi = (Array.isArray(dati.indirizzi) ? dati.indirizzi : [])
        .map(x => String(x || '').trim())
        .filter(x => /^[^@\s"\\]+@[^@\s"\\]+\.[^@\s"\\]+$/.test(x))
        .slice(0, RISPOSTE_MAX_INDIRIZZI);
      if (!validi.length) return json({ ok: false, error: 'Nessun indirizzo valido da cercare' }, 400);

      const giorni = Math.min(Math.max(Number(dati.giorni) || 10, 1), 60);
      try {
        return json({ ok: true, risposte: await leggiRisposte(env, validi, giorni) });
      } catch (e) {
        return json({ ok: false, error: (e && e.message) || 'lettura non riuscita' }, 502);
      }
    }

    // ── PROXY ANTHROPIC ──
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
function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function encHeader(s) {
  const v = String(s || '');
  return /^[\x20-\x7E]*$/.test(v) ? v : '=?UTF-8?B?' + b64(v) + '?=';
}

function soloIndirizzo(s) {
  const m = String(s || '').match(/<([^>]+)>/);
  return (m ? m[1] : String(s || '')).trim();
}

function wrap76(s) {
  return s.replace(/(.{1,76})/g, '$1\r\n');
}

function costruisciMessaggio(dati, fromHeader, replyTo) {
  const boundary = '----compass' + Date.now().toString(36);
  const dominio = (soloIndirizzo(fromHeader).split('@')[1]) || 'localhost';
  const data = new Date().toUTCString().replace(/GMT$/, '+0000');
  const righe = [
    'From: ' + fromHeader,
    'To: ' + dati.to,
    replyTo ? 'Reply-To: ' + replyTo : null,
    'Subject: ' + encHeader(dati.subject),
    'Message-ID: <' + crypto.randomUUID() + '@' + dominio + '>',
    'Date: ' + data,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    '',
    '--' + boundary,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(dati.text)).trimEnd(),
    '--' + boundary,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(dati.html || dati.text)).trimEnd(),
    '--' + boundary + '--',
    ''
  ].filter(r => r !== null);
  return righe.join('\r\n');
}

async function inviaConSmtp(env, dati) {
  const host = env.SMTP_HOST;
  const port = Number(env.SMTP_PORT || 465);
  const socket = connect({ hostname: host, port }, { secureTransport: 'on', allowHalfOpen: false });

  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  // Una risposta SMTP può essere multiriga: le intermedie hanno "250-", l'ultima "250 ".
  // Si legge finché non arriva una riga col codice seguito da spazio. Si guardano solo le
  // righe già terminate da CRLF: l'ultima porzione del buffer può essere ancora parziale
  // (un "250 OK" arrivato a metà sembrerebbe completo e verrebbe consumato in anticipo).
  async function leggi(attesi) {
    for (;;) {
      const fine = buffer.lastIndexOf('\r\n');
      if (fine !== -1) {
        const complete = buffer.slice(0, fine).split('\r\n');
        for (let i = 0; i < complete.length; i++) {
          if (/^\d{3} /.test(complete[i])) {
            const finale = complete[i];
            buffer = buffer.slice(complete.slice(0, i + 1).join('\r\n').length + 2);
            const codice = parseInt(finale.slice(0, 3), 10);
            if (attesi && !attesi.includes(codice)) {
              throw new Error('SMTP ' + codice + ': ' + finale.slice(0, 160));
            }
            return codice;
          }
        }
      }
      const { value, done } = await reader.read();
      if (done) throw new Error('connessione SMTP chiusa dal server');
      buffer += decoder.decode(value, { stream: true });
    }
  }
  const scrivi = (s) => writer.write(encoder.encode(s));

  try {
    await leggi([220]);
    await scrivi('EHLO compass-qm.com\r\n');
    await leggi([250]);

    await scrivi('AUTH LOGIN\r\n');
    await leggi([334]);
    await scrivi(b64(env.SMTP_USER) + '\r\n');
    await leggi([334]);
    await scrivi(b64(env.SMTP_PASS) + '\r\n');
    await leggi([235]);

    // Il mittente di busta deve essere la casella autenticata: molti server
    // rifiutano un MAIL FROM diverso dall'utente con cui ci si è autenticati.
    const mittenteBusta = soloIndirizzo(env.SMTP_FROM || env.SMTP_USER);
    await scrivi('MAIL FROM:<' + mittenteBusta + '>\r\n');
    await leggi([250]);
    await scrivi('RCPT TO:<' + dati.to + '>\r\n');
    await leggi([250, 251]);
    await scrivi('DATA\r\n');
    await leggi([354]);

    const nome = String(dati.fromName || '').replace(/["\r\n<>]/g, '').trim().slice(0, 120);
    const fromHeader = nome
      ? encHeader(nome) + ' <' + mittenteBusta + '>'
      : mittenteBusta;
    const messaggio = costruisciMessaggio(dati, fromHeader, env.PRESTAY_REPLYTO || mittenteBusta);

    await scrivi(messaggio + '\r\n.\r\n');
    await leggi([250]);
    await scrivi('QUIT\r\n');
  } finally {
    try { await writer.close(); } catch (e) {}
    try { await socket.close(); } catch (e) {}
  }
}

async function inviaConResend(env, dati) {
  let mittente = env.PRESTAY_FROM;
  if (dati.fromName) {
    const nome = String(dati.fromName).replace(/["\r\n<>]/g, '').trim().slice(0, 120);
    if (nome) mittente = '"' + nome + '" <' + soloIndirizzo(env.PRESTAY_FROM) + '>';
  }
  const invio = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.RESEND_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: mittente,
      to: [dati.to],
      reply_to: env.PRESTAY_REPLYTO,
      subject: dati.subject,
      text: dati.text,
      ...(dati.html ? { html: dati.html } : {})
    })
  });
  if (!invio.ok) {
    const errTxt = await invio.text().catch(() => '');
    throw new Error('Invio rifiutato: ' + errTxt.slice(0, 200));
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Lettura risposte via IMAP
// ────────────────────────────────────────────────────────────────────────────
// Host: pop.securemail.pro:993, TLS implicito — è quello indicato da Register per la
// posta in entrata (il nome dice "pop" ma serve IMAP).
// DUE HOST DA NON USARE, entrambi provati:
//  - mail.register.it: risponde, ma il certificato è per *.securemail.pro e la verifica
//    dell'hostname fallirebbe dal Worker;
//  - mail.securemail.pro: risponde E il certificato combacia, ma la casella non vive su
//    quel nodo e Dovecot rifiuta le credenziali con AUTHENTICATIONFAILED — un errore che
//    sembra "password sbagliata" mentre è "utente sconosciuto su questo server".
//    Su hosting condiviso l'host va preso dalle istruzioni del fornitore, non dedotto.
async function leggiRisposte(env, indirizzi, giorni) {
  const socket = connect(
    { hostname: env.IMAP_HOST, port: Number(env.IMAP_PORT || 993) },
    { secureTransport: 'on', allowHalfOpen: false }
  );
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';
  let seq = 0;

  const scrivi = (s) => writer.write(encoder.encode(s));
  async function unChunk() {
    const { value, done } = await reader.read();
    if (done) throw new Error('connessione IMAP chiusa dal server');
    buffer += decoder.decode(value, { stream: true });
  }
  async function attendiSaluto() {
    while (!/^\* (OK|PREAUTH)\b/m.test(buffer)) await unChunk();
    buffer = '';
  }
  // Esegue un comando e restituisce tutto ciò che il server ha risposto per quel tag.
  async function cmd(testo, etichetta) {
    const tag = 'c' + (++seq);
    await scrivi(tag + ' ' + testo + '\r\n');
    for (;;) {
      const fine = imapCompleta(buffer, tag);
      if (fine) {
        const dati = buffer;
        buffer = '';
        if (fine.esito !== 'OK')
          throw new Error('IMAP ' + (etichetta || 'comando') + ': ' + fine.riga.slice(0, 140));
        return dati;
      }
      await unChunk();
    }
  }
  // Le virgolette e le barre vanno protette: finiscono in un comando IMAP.
  const q = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

  try {
    await attendiSaluto();
    await cmd('LOGIN ' + q(env.IMAP_USER) + ' ' + q(env.IMAP_PASS), 'LOGIN');
    await cmd('SELECT INBOX', 'SELECT');

    const MESI = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date(Date.now() - giorni * 86400000);
    const since = d.getDate() + '-' + MESI[d.getMonth()] + '-' + d.getFullYear();

    const out = {};
    for (const ind of indirizzi) {
      const trovati = imapNumeriSearch(await cmd('SEARCH SINCE ' + since + ' FROM ' + q(ind), 'SEARCH'));
      if (!trovati.length) continue;
      // Solo l'ultimo messaggio di quell'indirizzo: è la risposta che conta.
      // Si scaricano i primi 16 KB — il testo dell'ospite sta in cima, prima della
      // citazione del nostro messaggio, e così il consumo resta prevedibile.
      const raw = imapPrimoLiteral(
        await cmd('FETCH ' + trovati[trovati.length - 1] + ' (BODY.PEEK[]<0.16384>)', 'FETCH')
      );
      if (!raw) continue;
      const m = estraiMessaggio(raw);
      const testo = soloRisposta(m.corpo).slice(0, 1500);
      if (testo) out[ind.toLowerCase()] = { data: m.data, oggetto: m.oggetto, testo: testo };
    }
    try { await scrivi('z LOGOUT\r\n'); } catch (e) {}
    return out;
  } finally {
    try { await writer.close(); } catch (e) {}
    try { await socket.close(); } catch (e) {}
  }
}
// ── Parsing delle risposte IMAP: la parte delicata, testata a parte ─────────

// Una risposta IMAP termina con la riga "TAG OK|NO|BAD", ma quella sequenza può comparire
// anche DENTRO i dati di un literal ({N} seguito da N byte). Si scandisce quindi in
// sequenza saltando i literal, invece di cercare la stringa nel buffer.
function imapCompleta(buf, tag) {
  const re = new RegExp('^' + tag + ' (OK|NO|BAD)\\b', 'i');
  let i = 0;
  while (i < buf.length) {
    const nl = buf.indexOf('\r\n', i);
    if (nl === -1) return null;
    const riga = buf.slice(i, nl);
    const lit = riga.match(/\{(\d+)\}$/);
    if (lit) {
      const fine = nl + 2 + Number(lit[1]);
      if (fine > buf.length) return null;      // literal ancora incompleto
      i = fine;
      continue;
    }
    if (re.test(riga)) return { esito: riga.split(' ')[1].toUpperCase(), riga: riga };
    i = nl + 2;
  }
  return null;
}

// Numeri dei messaggi da una risposta SEARCH ("* SEARCH 3 7 12"). Nessun risultato = [].
function imapNumeriSearch(buf) {
  const m = buf.match(/^\* SEARCH([ \d]*)\r?$/mi);
  if (!m) return [];
  return m[1].trim().split(/\s+/).filter(Boolean).map(Number).filter(n => n > 0);
}

// Estrae il payload del primo literal presente (i dati del FETCH).
function imapPrimoLiteral(buf) {
  const m = buf.match(/\{(\d+)\}\r\n/);
  if (!m) return '';
  const inizio = m.index + m[0].length;
  return buf.substr(inizio, Number(m[1]));
}

function qpDecode(s) {
  return String(s || '')
    .replace(/=\r?\n/g, '')                                       // soft line break
    .replace(/=([0-9A-F]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16)));
}
function b64Decode(s) {
  try { return atob(String(s || '').replace(/\s+/g, '')); } catch (e) { return ''; }
}
// I byte decodificati sono UTF-8: vanno reinterpretati, altrimenti gli accenti si rompono.
function utf8(s) {
  try {
    const b = new Uint8Array(String(s || '').length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
    return new TextDecoder('utf-8').decode(b);
  } catch (e) { return s; }
}

// Dal messaggio grezzo: intestazioni utili + corpo in testo semplice.
// Su un multipart si cerca la prima parte text/plain; se c'è solo HTML si ripulisce.
function estraiMessaggio(raw) {
  const sep = raw.indexOf('\r\n\r\n');
  const testa = sep === -1 ? raw : raw.slice(0, sep);
  let corpo = sep === -1 ? '' : raw.slice(sep + 4);

  const hdr = (nome) => {
    const re = new RegExp('^' + nome + ':\\s*([\\s\\S]*?)(?=\\r\\n[^ \\t]|$)', 'im');
    const m = testa.match(re);
    return m ? m[1].replace(/\r\n[ \t]+/g, ' ').trim() : '';
  };
  const ct = hdr('Content-Type');
  const boundary = (ct.match(/boundary="?([^";]+)"?/i) || [])[1];

  let cte = hdr('Content-Transfer-Encoding').toLowerCase();
  if (boundary) {
    const parti = corpo.split('--' + boundary);
    let scelta = null, scelte_html = null;
    for (const p of parti) {
      const s = p.indexOf('\r\n\r\n');
      if (s === -1) continue;
      const ph = p.slice(0, s), pb = p.slice(s + 4);
      const pct = (ph.match(/Content-Type:\s*([^;\r\n]+)/i) || [])[1] || '';
      const pcte = ((ph.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i) || [])[1] || '').trim().toLowerCase();
      if (/text\/plain/i.test(pct) && !scelta) scelta = { corpo: pb, cte: pcte };
      else if (/text\/html/i.test(pct) && !scelte_html) scelte_html = { corpo: pb, cte: pcte };
    }
    const usata = scelta || scelte_html;
    if (usata) { corpo = usata.corpo; cte = usata.cte; }
  }

  if (cte === 'base64') corpo = utf8(b64Decode(corpo));
  else if (cte === 'quoted-printable') corpo = utf8(qpDecode(corpo));
  else corpo = utf8(corpo);

  if (/<[a-z][\s\S]*>/i.test(corpo) && !/text\/plain/i.test(ct) && corpo.indexOf('<') > -1) {
    corpo = corpo.replace(/<style[\s\S]*?<\/style>/gi, '')
                 .replace(/<br\s*\/?>/gi, '\n')
                 .replace(/<\/p>/gi, '\n')
                 .replace(/<[^>]+>/g, '')
                 .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  }
  return { from: hdr('From'), data: hdr('Date'), oggetto: hdr('Subject'), corpo: corpo };
}

// La risposta contiene tutto il nostro pre-stay citato sotto: mostrarlo renderebbe
// l'informazione illeggibile. Si taglia al primo segno di citazione.
const TAGLI = [
  /^>/,
  /^-{2,}\s*(messaggio originale|original message|forwarded message)/i,
  /^_{5,}/,
  /^il .+ ha scritto:\s*$/i,
  /^on .+ wrote:\s*$/i,
  /^da:\s/i,
  /^from:\s/i,
  /^inviato da/i,
  /^sent from my/i
];
function soloRisposta(txt) {
  const righe = String(txt || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  for (const r of righe) {
    if (TAGLI.some(re => re.test(r.trim()))) break;
    out.push(r);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
