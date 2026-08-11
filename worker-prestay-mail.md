# Invio mail pre-stay — endpoint sul Cloudflare Worker

Compass è un sito statico: il browser non può parlare SMTP, quindi per far partire
davvero una mail serve un pezzo di server. Lo si aggiunge al Worker che già usate
(`anthropic-proxy.qm-d82.workers.dev`, quello di Claude e del KV).

Questo file è **documentazione + codice da incollare su Cloudflare**: non viene servito
da GitHub Pages e non fa parte dell'app.

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
2. Aggiungi come dominio **`mail.soularthotel.com`** (il sottodominio, non
   `soularthotel.com`).
3. Il servizio mostrerà dei **record DNS da aggiungere** (tipicamente un TXT per l'SPF del
   sottodominio e uno o più record per il DKIM). Vanno inseriti nel pannello DNS di
   **Register.it**, dove è gestito `soularthotel.com`.
   **Senza questi record le mail partono ma finiscono in spam.**
4. Attendi che il servizio segni il dominio come verificato (di solito minuti, a volte ore).
5. Genera una **API key** e tienila da parte per il passo 2.

**I record vanno sul sottodominio.** Se il servizio chiede di creare un record chiamato
`mail` o `resend._domainkey.mail`, va inserito così su Register dentro la zona di
`soularthotel.com` — Register aggiunge da sé il dominio in fondo. Non va toccato nessun
record esistente: si aggiungono soltanto righe nuove.

L'indirizzo mittente deve appartenere al dominio verificato. **Va verificato il
sottodominio `mail.soularthotel.com`, non `soularthotel.com`**: è precisamente questo che
tiene separati i DNS dell'invio da quelli della posta esistente.

---

## 2. Segreti sul Worker

Su Cloudflare → Workers → il vostro worker → Settings → Variables → **Encrypted**:

| Nome | Valore |
|------|--------|
| `RESEND_KEY` | la API key del servizio di invio |
| `PRESTAY_KEY` | una password lunga inventata da voi (è quella che inserirete in Compass) |
| `PRESTAY_FROM` | mittente, sul **sottodominio**: `Quality Manager <qm@mail.soularthotel.com>` |
| `PRESTAY_REPLYTO` | indirizzo a cui rispondono gli ospiti: `qm@soularthotel.com` |

**Perché mittente e risposta sono diversi.** Si spedisce da un sottodominio nuovo
(`mail.soularthotel.com`) così i record DNS del dominio principale — su cui gira la posta
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

  const { to, subject, text } = body || {};
  if (!to || !subject || !text)
    return Response.json({ ok: false, error: 'Mancano destinatario, oggetto o testo' }, { status: 400, headers: cors });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))
    return Response.json({ ok: false, error: 'Indirizzo non valido' }, { status: 400, headers: cors });

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
      from: env.PRESTAY_FROM,
      to: [to],
      reply_to: env.PRESTAY_REPLYTO,
      subject,
      text
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
