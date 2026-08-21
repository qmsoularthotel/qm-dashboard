# Invio mail pre-stay — endpoint sul Cloudflare Worker

Compass è un sito statico: il browser non può parlare SMTP, quindi per far partire
davvero una mail serve un pezzo di server. Lo si aggiunge al Worker che già usate
(`anthropic-proxy.qm-d82.workers.dev`, quello di Claude e del KV).

Questo file è **documentazione**: spiega il perché delle scelte e la storia dei problemi
incontrati. Il **codice da incollare su Cloudflare è `worker.js`** nella radice del
repository — quella è la sorgente canonica, versionata; i frammenti citati qui possono
essere più vecchi. Né questo file né `worker.js` vengono serviti da GitHub Pages come parte
dell'app.

---

## Prima di tutto: perché serve una chiave

Un endpoint pubblico che spedisce mail è un **relay per spam**. Compass è raggiungibile
da chiunque e il suo codice sorgente è pubblico: se l'endpoint accettasse qualsiasi
richiesta, in poche ore verrebbe trovato e usato per spedire spam a vostro nome — con
il vostro dominio che finisce in blacklist.

Le protezioni previste qui sono tre, sovrapposte:

1. **Chiave condivisa** (`X-Prestay-Key`) — inserita una volta in Compass e salvata
   **solo nel browser** (`localStorage`), mai nel codice sorgente né su KV, quindi non
   finisce su GitHub.
2. **Controllo dell'origine** — il Worker accetta solo richieste che arrivano dal
   dominio di Compass.
3. **Limite giornaliero** — oltre N mail al giorno il Worker rifiuta, così anche se la
   chiave trapelasse il danno resta contenuto.

Nessuna delle tre è invalicabile da sola (la chiave sta pur sempre nel browser di chi
la usa), ma insieme rendono l'endpoint poco interessante da attaccare. È il livello di
sicurezza ragionevole per questo caso; se un giorno servisse di più, la strada è un
login vero con sessione lato server.

---

## 1. Servizio di invio

Serve un servizio che spedisca davvero le mail (il Worker da solo non può). Ce ne sono
diversi con piani gratuiti adeguati a questi volumi — una decina di mail al giorno.
Il codice qui sotto è scritto per **Resend** (`https://resend.com`), ma la parte da
cambiare per usarne un altro è solo la `fetch` finale.

Passi:

1. Crea l'account.
2. Aggiungi come dominio **`mail.compass-qm.com`** (il sottodominio, non
   `soularthotel.com`).
3. Il servizio mostrerà dei **record DNS da aggiungere** (tipicamente un TXT per l'SPF del
   sottodominio e uno o più record per il DKIM). Vanno inseriti nel pannello DNS di
   **Namecheap**, dove è gestito `compass-qm.com`.
   **Senza questi record le mail partono ma finiscono in spam.**
4. Attendi che il servizio segni il dominio come verificato (di solito minuti, a volte ore).
5. Genera una **API key** e tienila da parte per il passo 2.

**I record vanno sul sottodominio.** Su Namecheap si inseriscono in *Advanced DNS* con il
nome relativo (`send.mail`, `resend._domainkey.mail`): Namecheap aggiunge da sé
`.compass-qm.com` in fondo. Non va toccato nessun record esistente: si aggiungono soltanto
righe nuove.

**Il DMARC proposto dal servizio va saltato.** Il suo nome è `_dmarc` senza il suffisso del
sottodominio, quindi finirebbe sul dominio principale invece che su `mail.` — ed è marcato
come opzionale: non serve a far partire le mail.

**Perché non `soularthotel.com`.** La casella del QM è su quel dominio, ma i suoi DNS sono
amministrati nell'area clienti Register dell'hotel, a cui il QM non ha accesso. Si spedisce
quindi da `compass-qm.com` (dominio di Compass, su Namecheap) e si riportano le risposte su
`qm@soularthotel.com` col `Reply-To`. Quello che l'ospite legge per primo è comunque il
**nome** del mittente ("SoulArt Hotel — Quality Manager"), non l'indirizzo tecnico.

L'indirizzo mittente deve appartenere al dominio verificato. **Va verificato il
sottodominio `mail.compass-qm.com`, non `soularthotel.com`**: è precisamente questo che
tiene separati i DNS dell'invio da quelli della posta esistente.

---

## 2. Segreti sul Worker

Su Cloudflare → Workers → il vostro worker → Settings → Variables → **Encrypted**:

| Nome | Valore |
|------|--------|
| `RESEND_KEY` | la API key del servizio di invio |
| `PRESTAY_KEY` | una password lunga inventata da voi (è quella che inserirete in Compass) |
| `PRESTAY_FROM` | mittente **di riserva** (usato se Compass non manda un nome per struttura), sul **sottodominio**: `SoulArt Hotel - Quality Manager <qm@mail.compass-qm.com>` — l'indirizzo qui dentro (`qm@mail.compass-qm.com`) è anche quello riusato per comporre il mittente per-struttura, vedi "mittente per struttura" più sotto |
| `PRESTAY_REPLYTO` | indirizzo a cui rispondono gli ospiti: `qm@soularthotel.com` |

**Perché mittente e risposta sono diversi.** Si spedisce da un sottodominio nuovo
(`mail.compass-qm.com`) così i record DNS del dominio principale — su cui gira la posta
vera dell'hotel — **non vengono toccati**: nessun rischio che le mail quotidiane inizino a
finire in spam. Il `Reply-To` riporta però le risposte degli ospiti su
`qm@soularthotel.com`, dove le leggi già.

Vanno inseriti come **Encrypted**, non come plain text: altrimenti restano leggibili
nella dashboard di Cloudflare.

---

## 3. Codice da aggiungere al Worker

Da inserire nel gestore delle richieste, **prima** della logica esistente di
`/v1/messages` e `/kv/*`, che resta invariata.

```js
// ── Invio mail pre-stay ────────────────────────────────────────────────────
// Origini ammesse: solo da qui Compass può chiedere di spedire.
const PRESTAY_ORIGINS = [
  'https://www.compass-qm.com',
  'https://compass-qm.com',
  'https://qmsoularthotel.github.io'
];
const PRESTAY_MAX_GIORNO = 60;   // tetto di sicurezza, non un limite d'uso

function prestayCors(origin) {
  const ok = PRESTAY_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : PRESTAY_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Prestay-Key'
  };
}

async function handlePrestayMail(request, env) {
  const origin = request.headers.get('Origin') || '';
  const cors = prestayCors(origin);

  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: cors });

  if (!PRESTAY_ORIGINS.includes(origin))
    return Response.json({ ok: false, error: 'Origine non ammessa' }, { status: 403, headers: cors });

  if (request.headers.get('X-Prestay-Key') !== env.PRESTAY_KEY)
    return Response.json({ ok: false, error: 'Chiave non valida' }, { status: 401, headers: cors });

  let body;
  try { body = await request.json(); }
  catch (e) { return Response.json({ ok: false, error: 'JSON non valido' }, { status: 400, headers: cors }); }

  const { to, subject, text, html, fromName } = body || {};
  if (!to || !subject || !text)
    return Response.json({ ok: false, error: 'Mancano destinatario, oggetto o testo' }, { status: 400, headers: cors });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))
    return Response.json({ ok: false, error: 'Indirizzo non valido' }, { status: 400, headers: cors });

  // Nome mittente per struttura (es. "Boutique Hotel Piazza Carità - Quality Manager"):
  // l'indirizzo resta sempre quello di PRESTAY_FROM (dominio verificato), cambia solo il
  // nome visualizzato davanti. Ripulito da virgolette/parentesi/a-capo per non rompere
  // l'header From — un client potrebbe mandare qualunque stringa nel body.
  const mittente = (() => {
    if (!fromName) return env.PRESTAY_FROM;
    const nome = String(fromName).replace(/["\r\n<>]/g, '').trim().slice(0, 120);
    if (!nome) return env.PRESTAY_FROM;
    const m = env.PRESTAY_FROM.match(/<([^>]+)>/);
    const addr = m ? m[1] : env.PRESTAY_FROM.trim();
    return `"${nome}" <${addr}>`;
  })();

  // Tetto giornaliero: usa lo stesso KV già collegato al Worker.
  const oggi = new Date().toISOString().slice(0, 10);
  const chiaveContatore = 'prestay_count_' + oggi;
  let n = 0;
  try { n = parseInt(await env.KV.get(chiaveContatore) || '0', 10) || 0; } catch (e) {}
  if (n >= PRESTAY_MAX_GIORNO)
    return Response.json({ ok: false, error: 'Limite giornaliero raggiunto' }, { status: 429, headers: cors });

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.RESEND_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: mittente,
      to: [to],
      reply_to: env.PRESTAY_REPLYTO,
      subject,
      text,
      ...(html ? { html } : {})
    })
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    return Response.json({ ok: false, error: 'Invio rifiutato: ' + t.slice(0, 200) }, { status: 502, headers: cors });
  }

  try { await env.KV.put(chiaveContatore, String(n + 1), { expirationTtl: 172800 }); } catch (e) {}
  return Response.json({ ok: true }, { headers: cors });
}
```

E nel routing, prima del resto:

```js
if (new URL(request.url).pathname === '/prestay/send') {
  return handlePrestayMail(request, env);
}
```

Se il binding KV nel vostro Worker non si chiama `KV`, correggete `env.KV` di
conseguenza (il contatore è l'unica cosa che lo usa: togliendolo si perde solo il
limite giornaliero).

**Aggiornamento 12/08/2026 — formattazione (grassetto/corsivo/elenchi).** Compass ora manda
anche un campo `html` oltre a `text` (Resend accetta entrambi). Se il vostro Worker è già
deployato con la versione precedente di questo file, **la mail continua a funzionare
comunque** — parte solo in solo testo, senza grassetto/corsivo/elenco resi. Per vederli
resi, incollate di nuovo il codice di `handlePrestayMail` (con l'`html` aggiunto qui sopra)
sul Worker e fate un nuovo **Deploy** — come per i secret, una modifica al codice non ha
effetto finché non si ridistribuisce.

**Aggiornamento 13/08/2026 — mittente per struttura.** Compass ora manda anche `fromName`
(es. `"Boutique Hotel Piazza Carità - Quality Manager"`), diverso da struttura a struttura.
L'indirizzo resta sempre lo stesso (`qm@mail.compass-qm.com`, quello verificato su Resend):
solo il **nome mostrato** cambia, ricomposto attorno a quell'indirizzo. Senza aggiornare il
Worker la mail parte comunque con il mittente fisso di `PRESTAY_FROM` per tutte le
strutture — nessuna rottura, solo il nome resta generico finché non si ridistribuisce.

---

## 4. Configurazione in Compass

In **Reception → Pre-stay → ⚙️ Invio mail**: incolla l'endpoint
(`https://anthropic-proxy.qm-d82.workers.dev/prestay/send`) e la `PRESTAY_KEY` scelta
al passo 2. Compass li salva **solo in questo browser**.

Da quel momento il pulsante ✉️ spedisce davvero. Finché non è configurato, continua a
funzionare come prima aprendo il client di posta — così la sezione resta usabile anche
prima di aver fatto questi passaggi, e su un PC dove non si vuole configurare la chiave.

---

## 5. Prova prima di usarlo sul serio

Manda la prima mail **a te stesso**, non a un ospite:

1. Aggiungi una riga con "+ Aggiungi ospite" e metti il tuo indirizzo.
2. Premi ✉️ e verifica che arrivi.
3. Controlla che **non sia finita in spam**: se ci finisce, mancano o non sono ancora
   propagati i record DNS del passo 1 (possono volerci alcune ore).
4. Guarda il mittente: deve essere quello di `PRESTAY_FROM`, non un indirizzo del
   servizio di invio.

Solo dopo questi quattro controlli conviene usarlo con gli ospiti veri.

---

## 6. Invio dalla casella reale dell'hotel (SMTP) — soluzione al problema Hotmail

### Perché si è dovuto cambiare strada

Con l'invio via Resend da `mail.compass-qm.com` l'autenticazione risultava **perfetta**
(verificato sugli header di una mail realmente ricevuta: `dkim=pass`, `dmarc=pass`,
`compauth=pass reason=100`), ma Microsoft la classificava comunque come spam:

```
X-MS-Exchange-Organization-SCL: 5
X-Microsoft-Antispam-Mailbox-Delivery: ... dest:J; OFR:SpamFilterAuthJ
```

`SpamFilterAuthJ` significa esattamente "autenticata correttamente, ma il filtro spam
l'ha giudicata spam": non è un problema di configurazione, è **reputazione di un dominio
di invio nuovo**. Si risolve da sé in settimane di invii regolari — tempo che il progetto
non aveva.

Le alternative scartate:

- **Aspettare** che la reputazione maturi: il pre-stay doveva partire subito.
- **Tornare a `mailto:`**: impraticabile ai volumi reali — decine di aperture del client,
  scelta manuale del mittente giusto fra più strutture (con rischio di sbagliare), e
  impossibile dai PC senza client di posta configurato.
- **Verificare `soularthotel.com` su Resend**: sarebbe la soluzione più pulita, ma i DNS
  di quel dominio sono nell'area clienti Register dell'hotel e l'autorizzazione non è
  ottenibile.

### La soluzione adottata

Il Worker si collega **direttamente al server SMTP di Register** e spedisce **dalla
casella vera** `qm@soularthotel.com`: stesso mittente, stessi server in uscita e stessa
reputazione della posta che il QM manda a mano da anni. Compass continua a spedire con un
clic da qualsiasi PC, senza client di posta.

Parametri verificati (agosto 2026):

| Voce | Valore |
|------|--------|
| Host | `authsmtp.securemail.pro` (risolve su `smtp.securemail.pro`, 81.88.48.66) |
| Porta | **465**, TLS implicito |
| Autenticazione | `AUTH LOGIN` (annunciata dal server insieme a `PLAIN`) |
| Certificato | SAN include `*.securemail.pro` → la verifica dell'hostname dal Worker passa |

Il TLS implicito su 465 è la ragione per cui questa strada è praticabile da un Worker:
niente `STARTTLS` da negoziare, basta `secureTransport: 'on'` su `connect()`.

### Variabili da aggiungere sul Worker

Tutte come **Secret**, tranne host e porta che possono restare testo:

| Nome | Valore |
|------|--------|
| `SMTP_HOST` | `authsmtp.securemail.pro` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | la casella da cui deve partire la posta (vedi avvertenza qui sotto) |
| `SMTP_PASS` | la password della casella — **Secret**, mai altrove |
| `SMTP_FROM` | opzionale, default = `SMTP_USER` — **se impostata vince su `SMTP_USER`** |

> **`SMTP_USER` decide se gli ospiti Booking ricevono o no.** Gli indirizzi mascherati
> `@guest.booking.com` sono un relay che accetta posta **solo** dall'indirizzo registrato
> sull'Extranet della struttura (`booking@soularthotel.com`): da qualunque altro mittente
> la respinge — a volte in silenzio, a volte con un rimbalzo che torna nella casella del
> mittente. Se le mail pre-stay agli ospiti Booking tornano indietro, il primo controllo è
> qui, non sull'Extranet: l'Extranet dice quale mittente è autorizzato, non quale stiamo
> usando. Da Compass lo si legge in **Messaggi Pre-stay → Impostazioni → Verifica
> mittente**, che interroga `/prestay/stato`.
>
> Cambiando `SMTP_USER`/`SMTP_PASS` per spedire da `booking@soularthotel.com` vanno
> ricordate altre due cose: **cancellare `SMTP_FROM`** se è rimasta impostata (altrimenti
> il mittente non cambia affatto), e sapere che le risposte degli ospiti arriveranno in
> quella casella — quindi anche `IMAP_USER`/`IMAP_PASS`, che alimentano "Controlla
> risposte", vanno spostati lì, altrimenti le risposte smettono di comparire.

`RESEND_KEY` e `PRESTAY_FROM` **vanno lasciate**: se un domani si tolgono le variabili
SMTP, il Worker torna da solo a spedire via Resend senza modifiche al codice.

**Nota di sicurezza.** `SMTP_PASS` è la password della casella vera: chi la ottiene non
manda solo mail, entra nella casella. Resta protetta dalle stesse tre barriere di prima
(chiave `X-Prestay-Key`, controllo origine, tetto giornaliero) e non lascia mai
Cloudflare — Compass non la vede né la salva. Va comunque cambiata se si sospetta una
fuga, e non va mai incollata in chat, ticket o screenshot.

### Dettagli implementativi che non vanno "semplificati"

- **Risposte SMTP multiriga**: l'EHLO di Register risponde su 5 righe (`250-…` fino a
  `250 OK`). Si legge finché non arriva una riga col codice **seguito da spazio**, e si
  guardano **solo le righe già terminate da CRLF**: un `250 OK` arrivato spezzato a metà
  sembrerebbe completo e verrebbe consumato in anticipo. Verificato in test.
- **Corpo in base64**: risolve in un colpo solo gli accenti e il *dot stuffing* — una riga
  con un punto isolato chiuderebbe il `DATA` — perché l'alfabeto base64 non contiene il
  punto.
- **Intestazioni RFC 2047**: `Boutique Hotel Piazza Carità` e gli oggetti accentati vanno
  codificati `=?UTF-8?B?…?=`, altrimenti arrivano illeggibili.
- **`MAIL FROM` = utente autenticato**: i server condivisi rifiutano un mittente di busta
  diverso dall'utente con cui ci si è autenticati. Il nome per struttura resta
  nell'intestazione `From:`, che è quella che l'ospite legge.
- **Solo CRLF**: un LF isolato rompe il protocollo.

### Codice completo del Worker

```js
import { connect } from 'cloudflare:sockets';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Prestay-Key',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const json = (obj, status) => new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // ── KV STORAGE ──
    if (url.pathname === '/kv/get') {
      const key = url.searchParams.get('key');
      if (!key) return new Response('missing key', { status: 400, headers: corsHeaders });
      const value = await env.QM_STORAGE.get(key);
      return json({ value });
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

    // ── INVIO MAIL PRE-STAY ──
    if (url.pathname === '/prestay/send') {
      const origin = request.headers.get('Origin') || '';
      const ORIGINI = [
        'https://www.compass-qm.com',
        'https://compass-qm.com',
        'https://qmsoularthotel.github.io'
      ];
      if (!ORIGINI.includes(origin)) return json({ ok: false, error: 'Origine non ammessa' }, 403);
      if (request.headers.get('X-Prestay-Key') !== env.PRESTAY_KEY) {
        return json({ ok: false, error: 'Chiave non valida' }, 401);
      }

      let dati;
      try { dati = await request.json(); }
      catch (e) { return json({ ok: false, error: 'Dati non validi' }, 400); }
      if (!dati.to || !dati.subject || !dati.text) {
        return json({ ok: false, error: 'Mancano destinatario, oggetto o testo' }, 400);
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dati.to)) {
        return json({ ok: false, error: 'Indirizzo non valido' }, 400);
      }

      // Tetto giornaliero
      const oggi = new Date().toISOString().slice(0, 10);
      const contatore = 'prestay_count_' + oggi;
      let n = 0;
      try { n = parseInt(await env.QM_STORAGE.get(contatore) || '0', 10) || 0; } catch (e) {}
      if (n >= 60) return json({ ok: false, error: 'Limite giornaliero raggiunto' }, 429);

      // SMTP se configurato (si spedisce dalla casella vera dell'hotel), altrimenti Resend.
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

    // ── ANTHROPIC PROXY ──
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
    const data = await response.json();
    return json(data);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Helper comuni
// ────────────────────────────────────────────────────────────────────────────

// base64 di una stringa UTF-8, a blocchi: lo spread di un array grande
// (String.fromCharCode(...arr)) supera lo stack su messaggi lunghi.
function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

// Intestazioni con caratteri non ASCII (es. "Carità") vanno codificate RFC 2047,
// altrimenti il nome mittente o l'oggetto arrivano illeggibili.
function encHeader(s) {
  const v = String(s || '');
  return /^[\x20-\x7E]*$/.test(v) ? v : '=?UTF-8?B?' + b64(v) + '?=';
}

// Estrae l'indirizzo da "Nome <a@b.c>" oppure restituisce la stringa già pulita.
function soloIndirizzo(s) {
  const m = String(s || '').match(/<([^>]+)>/);
  return (m ? m[1] : String(s || '')).trim();
}

function wrap76(s) {
  return s.replace(/(.{1,76})/g, '$1\r\n');
}

// Corpo MIME: due parti (testo e HTML) entrambe in base64. Il base64 risolve da solo
// sia i caratteri accentati sia il "dot stuffing" (una riga con un punto isolato
// chiuderebbe il DATA), perché il suo alfabeto non contiene il punto.
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

// ────────────────────────────────────────────────────────────────────────────
// Invio via SMTP autenticato (casella reale dell'hotel)
// ────────────────────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────────────────────
// Invio via Resend (usato solo se SMTP non è configurato)
// ────────────────────────────────────────────────────────────────────────────
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
```

### Prova prima di usarlo sul serio

1. Manda una mail di prova **a te stesso**, possibilmente su Hotmail/Outlook.
2. Controlla che il mittente sia quello impostato in `SMTP_USER`, col nome della struttura
   giusta. Lo stesso indirizzo lo dichiara `/prestay/stato` senza dover mandare nulla.
3. Controlla che **non sia in spam** — è il motivo per cui esiste tutta questa sezione.
4. Verifica grassetto/corsivo/elenchi resi.

**Esito (14/08/2026): funziona.** Prima mail di prova su Hotmail arrivata **in posta in
arrivo**, non più in spam — che era l'intero motivo di questa sezione. Deploy verificato
anche lato endpoint: 403 su origine non ammessa, 401 su chiave errata, `/kv/*` ancora 200
(nessuna regressione su sync/turni), preflight CORS con `X-Prestay-Key` corretto.

**Da tenere d'occhio col tempo**: `authsmtp.securemail.pro` è un SMTP condiviso di Register,
che può avere limiti di invio orari/giornalieri non documentati. Il tetto di 60/giorno nel
Worker è nostro, non loro. Se un giorno gli invii iniziassero a fallire in blocco a metà
giornata con errori `4xx`, è lì che va guardato — non nel codice.

Se compare un errore `SMTP 535`, la password è sbagliata o Register richiede
un'abilitazione all'invio SMTP esterno per quella casella.

---

## 7. `/prestay/stato` — chi spedisce davvero (21/08/2026)

`GET /prestay/stato`, stessa chiave e stesso controllo di origine degli altri percorsi
`/prestay/*`. Risponde con **soli indirizzi e nomi di host, nessuna password**:

```json
{ "ok": true, "versione": "2026-08-21", "via": "smtp",
  "mittente": "qm@soularthotel.com", "mittenteDa": "SMTP_USER",
  "smtpHost": "authsmtp.securemail.pro",
  "replyTo": "qm@soularthotel.com", "imap": "qm@soularthotel.com" }
```

### Perché esiste

Il mittente lo decidono le variabili del Worker, che Compass non può vedere. Ad agosto 2026
la costante `PRESTAY_MITTENTE_BOOKING_OK` in `app.js` era stata messa a `true` — cioè
"ormai spediamo dall'indirizzo registrato su Booking" — **senza che sul Worker fosse
cambiato niente**. Compass ha quindi ripreso a mandare le mail agli indirizzi
`@guest.booking.com` da `qm@soularthotel.com`, e Booking le ha rimandate indietro. Dalla
dashboard non c'era modo di accorgersene: l'invio risultava riuscito e la spunta diventava
verde.

Il blocco degli indirizzi Booking **non dipende più da una costante scritta a mano**: si
basa sul mittente che il Worker dichiara qui (`_psMittenteOkBooking()` in `app.js`).
Finché non è stato verificato su quella postazione, si assume che non sia quello giusto —
un invio in meno è meno grave di una spunta verde che mente.

### `versione`

Il Worker si pubblica a mano, quindi una correzione può essere scritta, versionata e **non
attiva**. `WORKER_VERSIONE` in cima a `worker.js` viene restituita qui: se "Verifica
mittente" risponde `404`, il Worker in produzione è più vecchio di `worker.js` e va
ripubblicato.

