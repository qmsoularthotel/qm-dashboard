// ═══════════════════════════════════════════════════════════════════════════
// INTERRUTTORE DI RITORNO — HKP DERIVATO DAL PIANO SETTIMANALE
// ═══════════════════════════════════════════════════════════════════════════
// I tre report pulizie (Cruscotto pulizie, Soul HKP, Boutique HKP) contengono
// SOLO conteggi aggregati arrivi/fermate/partenze per giorno — nessun numero di
// camera. Sono tutti ricavabili dal Piano Settimanale, che è già caricato e molto
// più ricco (dettaglio camera per camera). Derivandoli si eliminano 3 upload
// quotidiani su 6 e i numeri si aggiornano da soli a ogni ricarica del Piano.
//
// Corrispondenza verificata sui PDF reali del 26/07/2026, tutti i giorni:
//   pul  (Cruscotto pulizie) = soulart + boutique + liborio
//   soul (Compass HKP SoulArt)  = solo soulart
//   bout (Compass HKP Boutique) = solo boutique (San Liborio lo somma a valle
//                                 housekeeper.html, vedi boutAdj)
//
// ⚠️  PER TORNARE INDIETRO: metti false qui sotto e ricarica.
//     Riappaiono i 3 slot nell'Upload Center e tornano attivi gli upload manuali
//     dei PDF — il loro codice (handleHkFile, pulParseText, ecc.) è rimasto
//     intatto e funzionante, non è stato rimosso nulla.
const HKP_DERIVE_FROM_PIANO=true;
const HKP_DERIVED_SLOTS=['pul','soul','bout'];

// Booking.com icon — usato ovunque al posto dell'emoji 📘
const BK_ICON=`<svg width="13" height="13" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:2px;flex-shrink:0;"><rect width="24" height="24" rx="4" fill="#003580"/><text x="5" y="18" font-family="Arial,sans-serif" font-size="17" font-weight="bold" fill="white">B</text></svg>`;

// §§ DARK MODE
function toggleDarkMode(){
  const dark=document.body.classList.toggle('dark');
  try{localStorage.setItem('qm_dark',dark?'1':'0');}catch(e){}
  const btn=document.getElementById('darkToggle');
  if(btn)btn.textContent=dark?'☀️':'🌙';
}
(function(){
  if(localStorage.getItem('qm_dark')==='1'){
    document.body.classList.add('dark');
    const btn=document.getElementById('darkToggle');
    if(btn)btn.textContent='☀️';
  }
})();
// §§ COSTANTI & CONFIG (DEPTS, WEEK fallback, IS_REST)
const DEPTS={fo:{label:'Ricevimento',cls:'fo',members:['Maddaloni M.','Presta P.','De Rosa T.','Pennacchio V.','Perez L.','Imparato G.','Vatiero R.','Barbosa D.','D\'Andrea F.','Grieco V.','Extra Night','Iannario R.','Extra Angelica','Extra Benedetta','Raucci A.','Ruggiero B.']},hk:{label:'Housekeeping',cls:'hk',members:['Matarese A.','Nacci M.','De Masi C.','Chiantese M.','Extra Antonella','Extra Anushka','Extra Giuditta','Extra Nunzia','Extra Roberta','Scognamillo E.','Esposito M.','Branno M.','Sarnataro A.']},bkf:{label:'Breakfast',cls:'bkf',members:['Amorese S.','Albano D.','Ferace C.','Panagodage S.']},mt:{label:'Manutenzione',cls:'mt',members:['Basile G.']}};
const ALL_STAFF=Object.values(DEPTS).flatMap(d=>d.members);
let weekData=null,activeDay=0;
const IS_REST=v=>{
  if(!v)return true;
  const u=v.trim().toUpperCase();
  if(['R','RIPOSO','RIPOSO RICHIESTO','R RICHIESTO','RECUPERO','MALATTIA','FERIE','OFF','—','-','–',''].includes(u))return true;
  // Match anche su etichette composte tipo "R Recupero", "R Richiesto", "Recupero straordinario" ecc.
  return u.includes('RECUPER')||u.includes('RIPOSO')||u.includes('MALATTIA')||u.includes('FERIE')||u.includes('RICHIEST');
};
// Un trattino nella cella del turno non è un riposo vero e proprio (nessuno lo ha deciso/
// richiesto), è un valore "non pertinente" — la persona non deve comparire né come in
// servizio (già escluso da IS_REST) né come "non in servizio"/Riposo nelle liste, a
// differenza di R/RIPOSO/FERIE ecc. che restano assenze vere e vanno mostrate.
const IS_DASH=v=>{
  if(!v)return false;
  const u=v.trim();
  return u==='-'||u==='–'||u==='—';
};
// §§ TURNO — ACCORDIONI UC & UPLOAD BOX
let turnoOpen=false;
function toggleTurnoAccordion(){}
function ucToggle(key){
  const slot=document.getElementById('uc-'+key);
  const panel=document.getElementById('uc-'+key+'-panel');
  if(!panel)return;
  const isOpen=panel.classList.contains('open');
  // Chiudi tutti gli altri
  ['turno','pren','arrivi','prestay','pul','bkf','soul','bout','piano'].forEach(k=>{
    if(k===key)return;
    const p=document.getElementById('uc-'+k+'-panel');
    const s=document.getElementById('uc-'+k);
    if(p){p.classList.remove('open');}
    if(s){s.classList.remove('open');}
  });
  // Toggle questo
  if(isOpen){
    panel.classList.remove('open');
    slot.classList.remove('open');
  } else {
    panel.classList.add('open');
    slot.classList.add('open');
  }
}
function ucSetState(key,state,sub,silent){
  const slot=document.getElementById('uc-'+key);
  const subEl=document.getElementById('uc-'+key+'-sub');
  const badge=document.getElementById('uc-'+key+'-badge');
  const panel=document.getElementById('uc-'+key+'-panel');
  if(!slot)return;
  slot.classList.remove('loaded','loading','error');
  if(state==='loaded'){
    slot.classList.add('loaded');
    if(!silent){
      // Fisarmonica: chiudi tutti, apri questo
      ['turno','pren','arrivi','prestay','pul','bkf','soul','bout','piano'].forEach(k=>{
        const p=document.getElementById('uc-'+k+'-panel');
        const s=document.getElementById('uc-'+k);
        if(p){p.classList.remove('open');}
        if(s){s.classList.remove('open');}
      });
      if(panel){panel.classList.add('open');slot.classList.add('open');}
    }
  } else if(state==='loading'){
    slot.classList.add('loading');
  } else if(state==='error'){
    slot.classList.add('error');
  }
  if(badge)badge.textContent='▾';
  if(subEl&&sub)subEl.textContent=sub;
  ucUpdateProgress();
}
// Nasconde l'intera riga (.uc-row) dei report ora derivati dal Piano (vedi
// HKP_DERIVE_FROM_PIANO in cima al file) — Report pulizie/Soul HKP/Boutique HKP
// vivono tutti nella stessa riga uc-row-derived. Gli elementi restano nel DOM e
// il loro codice di upload è intatto: rimettendo il flag a false la riga riappare
// e torna funzionante senza altre modifiche.
(function ucHideDerivedSlots(){
  if(!HKP_DERIVE_FROM_PIANO)return;
  const row=document.getElementById('uc-row-derived');if(row)row.style.display='none';
})();
// Fonti tracciate per il riepilogo Upload Center — 'piano' non entra nel conteggio
// rigoroso "X/N" (Turno resta l'unico davvero settimanale, escluso dalla scadenza 24h
// in _setUcTs) ma viene comunque segnalato nella riga "mancano" se scaduto/non caricato,
// perché in pratica viene ricaricato di continuo come gli altri.
const UC_SOURCES=[
  {key:'turno',label:'Turno'},
  {key:'piano',label:'Piano camere'},
  {key:'arrivi',label:'Arrivi'},
  {key:'bkf',label:'Report pasti'},
  {key:'pul',label:'Report pulizie'},
  {key:'soul',label:'Soul HKP'},
  {key:'bout',label:'Boutique HKP'}
].filter(s=>!(HKP_DERIVE_FROM_PIANO&&HKP_DERIVED_SLOTS.includes(s.key)));
function ucUpdateProgress(){
  const slots=['turno','arrivi','pul','bkf','soul','bout']
    .filter(k=>!(HKP_DERIVE_FROM_PIANO&&HKP_DERIVED_SLOTS.includes(k)));
  const tot=slots.length;
  const loaded=slots.filter(k=>{
    const el=document.getElementById('uc-'+k);
    return el&&el.classList.contains('loaded')&&!el.classList.contains('stale');
  }).length;
  const bar=document.getElementById('ucProgressBar');
  const label=document.getElementById('ucProgressLabel');
  if(bar)bar.style.width=(tot?loaded/tot*100:0)+'%';
  if(label)label.textContent=loaded+'/'+tot;
  const missing=UC_SOURCES.filter(({key})=>{
    const el=document.getElementById('uc-'+key);
    if(!el)return false;
    return !el.classList.contains('loaded')||el.classList.contains('stale');
  }).map(s=>s.label);
  const missingEl=document.getElementById('ucMissingLine');
  if(missingEl){
    if(missing.length){missingEl.style.display='block';missingEl.textContent='Mancano: '+missing.join(', ');}
    else missingEl.style.display='none';
  }
}
const turniInput=document.getElementById('turniFileInput');
const turniStatus=document.getElementById('turniStatus');
const turniBox={classList:{add:()=>{},remove:()=>{}}};
(function(){
  const box=document.getElementById('turniUploadBox');
  if(box){box.addEventListener('click',()=>turniInput.click());box.addEventListener('dragover',e=>{e.preventDefault();box.classList.add('dragover');});box.addEventListener('dragleave',()=>box.classList.remove('dragover'));box.addEventListener('drop',e=>{e.preventDefault();box.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f)handleTurniFile(f);});}
  turniInput.addEventListener('change',e=>{if(e.target.files[0])handleTurniFile(e.target.files[0]);});
})();
// §§ TURNO — PARSER TSV/PDF (parseTurniTSV, handleTurniFile)
function parseTurniTSV(text){
  const rows=text.trim().split(/\r?\n/).map(r=>r.split('\t'));
  if(rows.length<2)return null;
  const MESI={gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12};
  const GIORNI_IT={lunedì:'Lun',martedì:'Mar',mercoledì:'Mer',giovedì:'Gio',venerdì:'Ven',sabato:'Sab',domenica:'Dom',lun:'Lun',mar:'Mar',mer:'Mer',gio:'Gio',ven:'Ven',sab:'Sab',dom:'Dom'};
  const year=new Date().getFullYear();
  // Cerca le date nelle prime 3 righe (row 0 o row 1 o row 2 come header)
  let cols=[],headerRow=0;
  const tryParseDate=(h,i)=>{
    const s=h.trim().toLowerCase();
    if(!s)return;
    // "lunedì 30 marzo" o "sab 04 aprile 2026"
    let m=s.match(/(\w+)\s+(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?/);
    if(m){
      const gg=GIORNI_IT[m[1]];const d=parseInt(m[2]);const mo=MESI[m[3]];const y=m[4]?parseInt(m[4]):year;
      if(gg&&d&&mo){cols.push({i,label:gg+' '+String(d).padStart(2,'0')+'/'+String(mo).padStart(2,'0'),date:y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0')});return;}
    }
    // "30/03", "30/03/2026", "30-03", "30.03"
    m=s.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{4}))?/);
    if(m){
      const d=parseInt(m[1]),mo=parseInt(m[2]),y=m[3]?parseInt(m[3]):year;
      if(d>=1&&d<=31&&mo>=1&&mo<=12){
        const wd=new Date(y,mo-1,d).getDay();
        const gg=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][wd];
        cols.push({i,label:gg+' '+String(d).padStart(2,'0')+'/'+String(mo).padStart(2,'0'),date:y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0')});
      }
    }
  };
  for(let hr=0;hr<Math.min(3,rows.length)&&!cols.length;hr++){
    rows[hr].forEach((h,i)=>{if(i>0)tryParseDate(h,i);});
    if(cols.length)headerRow=hr;
  }
  if(!cols.length)return null;
  console.log('[Turno] headerRow='+headerRow+' cols trovate:',cols.map(c=>c.label+'(col'+c.i+')').join(', '));

  // Settimana corrente: lun precedente → dom successiva
  const today=new Date();today.setHours(0,0,0,0);
  const todayDow=today.getDay();
  const diffToMon=todayDow===0?-6:1-todayDow;
  const monday=new Date(today);monday.setDate(today.getDate()+diffToMon);
  const sunday=new Date(monday);sunday.setDate(monday.getDate()+6);sunday.setHours(23,59,59,999);
  console.log('[Turno] settimana:',monday.toLocaleDateString('it'),'–',sunday.toLocaleDateString('it'));

  let pool=cols.filter(c=>{const d=new Date(c.date+'T12:00:00');return d>=monday&&d<=sunday;}).sort((a,b)=>a.i-b.i);
  console.log('[Turno] in settimana:',pool.map(c=>c.label).join(', ')||'NESSUNO');
  // Fallback solo se non trovato nessun giorno nella settimana corrente
  if(pool.length<1){
    const scored=cols.map(c=>{const d=new Date(c.date+'T12:00:00');return{...c,diff:Math.abs(d-today)};});
    scored.sort((a,b)=>a.diff-b.diff);
    pool=scored.slice(0,7).sort((a,b)=>a.i-b.i);
    console.log('[Turno] FALLBACK 7 più vicini:',pool.map(c=>c.label).join(', '));
  }
  const giorni7=pool.map(c=>({label:c.label,date:c.date,shifts:{}}));

  // Alias nomi foglio → nome canonico DEPTS
  const NAME_ALIAS={'extra i.':'Iannario R.','extra bkf sau':'Panagodage S.'};
  // Righe dati — filtra staff noto (exact o prefix) o Extra*
  for(let ri=headerRow+1;ri<rows.length;ri++){
    const row=rows[ri];
    let nome=(row[0]||'').trim();
    if(!nome)continue;
    // 0) alias: mappa vecchi nomi foglio → nome canonico
    if(NAME_ALIAS[nome.toLowerCase()])nome=NAME_ALIAS[nome.toLowerCase()];
    const nomeLow=nome.toLowerCase();
    // 1) match esatto
    let canonical=ALL_STAFF.find(s=>s.toLowerCase()===nomeLow);
    // 2) match per prefisso: "Perez" → "Perez L."
    if(!canonical)canonical=ALL_STAFF.find(s=>s.toLowerCase().startsWith(nomeLow+' ')||s.toLowerCase().startsWith(nomeLow+'.'));
    const isExtra=/^extra/i.test(nome);
    if(!canonical&&!isExtra){console.log('[Turno] skip:',nome);continue;}
    canonical=canonical||nome;
    pool.forEach((c,ci)=>{
      const val=(row[c.i]||'').trim();
      giorni7[ci].shifts[canonical]=val===''||val==='-'||val==='.'?'R':val;
    });
  }
  console.log('[Turno] risultato:',giorni7.map(g=>g.label+':'+Object.keys(g.shifts).length+'staff').join(', '));
  return{giorni:giorni7};
}
async function handleTurniFile(file){
  ucSetState('turno','loading','Analisi in corso...');
  try{
    // Converti file in base64
    const base64=await new Promise((res,rej)=>{
      const r=new FileReader();
      r.onload=()=>res(r.result.split(',')[1]);
      r.onerror=()=>rej(new Error('Lettura file fallita'));
      r.readAsDataURL(file);
    });
    const isPDF=file.type==='application/pdf';
    const mediaType=isPDF?'application/pdf':file.type||'image/jpeg';
    const staff=ALL_STAFF;
    const foStaff=Object.values(DEPTS).filter((_,i)=>i!==1).flatMap(d=>d.members);
    const _oggi=new Date();
    const _annoOggi=_oggi.getFullYear();
    const _oggiIso=_annoOggi+'-'+String(_oggi.getMonth()+1).padStart(2,'0')+'-'+String(_oggi.getDate()).padStart(2,'0');
    const prompt=`Sei un assistente che analizza planning settimanali di turni per un hotel.
OGGI È ${_oggiIso}. Il planning riguarda quasi sempre la settimana corrente o quella
successiva: se nell'immagine non compare l'anno, usa ${_annoOggi}. Non dedurre l'anno da
altro.
Analizza questa immagine/PDF del planning e restituisci SOLO un oggetto JSON valido con questa struttura esatta:
{
  "giorni": [
    {
      "label": "Lun 23/03",
      "date": "${_annoOggi}-03-23",
      "shifts": {
        "Nome Cognome": "turno",
        ...
      }
    },
    ...
  ]
}

DIPENDENTI FISSI (Front Office, Breakfast, Manutenzione) — mappa sempre questi nomi esatti nel JSON:
${foStaff.join(', ')}

REGOLE:
1. Per i dipendenti fissi: abbina il nome del planning al più simile in lista (es. "MADDALONI" → "Maddaloni M.", "De Rosa" → "De Rosa T.") e usa il nome della lista come chiave.
2. Per l'Housekeeping: il personale cambia ogni settimana. Usa il nome ESATTAMENTE come scritto nel planning (es. "Extra Maria", "Rossi A."). Non tentare di abbinarlo a nessuna lista.
3. Includi TUTTE le persone visibili nel planning senza saltarne nessuna.
4. Celle con solo un trattino ("-") → metti esattamente "-" nel JSON, NON convertirlo in "R": il trattino indica una persona non pertinente quel giorno (es. non ancora in servizio quella settimana), diverso da un riposo vero. Celle con solo "." o completamente vuote → metti "R".
5. "R" da solo → "R" (riposo). "P" è turno valido (presenza), NON è riposo.
6. Qualsiasi altro valore ("P", "AC", "CG", "AG", "CC", "NC", "NG", "FERIE", "9-17", ecc.) → valore ESATTO della cella.
7. Date "lunedì 30 marzo" → date "${_annoOggi}-03-30", label "Lun 30/03". Includi tutti i 7 giorni.

Restituisci SOLO il JSON, nessun testo prima o dopo.`;
    const contentBlock=isPDF
      ?{type:'document',source:{type:'base64',media_type:mediaType,data:base64}}
      :{type:'image',source:{type:'base64',media_type:mediaType,data:base64}};
    // Controllo di sicurezza automatico: l'AI legge lo screenshot 3 volte in
    // parallelo (nessun intervento umano). Per ogni cella si tiene il valore su
    // cui concordano almeno 2 letture su 3 — una singola lettura isolata sbagliata
    // (es. scambio tra due giorni della stessa persona) non basta più a "vincere".
    ucSetState('turno','loading','Analisi e verifica automatica in corso...');
    const passes=await Promise.all([
      _turnoClaudeParse(contentBlock,prompt),
      _turnoClaudeParse(contentBlock,prompt),
      _turnoClaudeParse(contentBlock,prompt)
    ]);
    const parsed=_turnoReconcile(passes);
    // Converti date string in oggetti Date
    parsed.giorni=parsed.giorni.map(g=>({
      ...g,
      date:g.date?_annoPlausibile(new Date(g.date+'T12:00:00')):new Date()
    }));
    // Salva in localStorage + cloud
    try{
      const _wts=Date.now();
      const toSave={giorni:parsed.giorni.map(g=>({...g,date:g.date.toISOString()})),_ts:_wts};
      localStorage.setItem('qm_weekData',JSON.stringify(toSave));
      localStorage.setItem('qm_ts_turnoTs',String(_wts));
      kvSet('qm_weekData',JSON.stringify(toSave));
    }catch(e){}
    loadWeekData(parsed);
    const range=parsed.giorni[0].label+' – '+parsed.giorni[parsed.giorni.length-1].label;
    ucSetState('turno','loaded',range);
    setUploadTs('turnoTs');
    // Forza overview alla data odierna
    setTimeout(()=>{try{refreshOverviewForDate(new Date());}catch(e){}},100);
  }catch(err){
    ucSetState('turno','error','Errore caricamento');
  }
}
// Il planning fotografato riporta "lunedì 30 marzo" senza anno, quindi l'anno lo deve
// dedurre il modello: e può sbagliarlo (è successo, con un turno datato 2025 caricato nel
// 2026). Rete di sicurezza: fra l'anno restituito e i due adiacenti si tiene quello che
// avvicina di più la data a oggi. Vale anche per le settimane a cavallo di capodanno,
// dove giorni della stessa settimana appartengono ad anni diversi — per questo la scelta
// è per singolo giorno e non per l'intera settimana.
function _annoPlausibile(d){
  if(!(d instanceof Date)||isNaN(d))return d;
  const G=86400000;
  const oggi=new Date();oggi.setHours(12,0,0,0);
  // Entro sei mesi la data è già plausibile per un planning: non si tocca.
  if(Math.abs(d-oggi)<=180*G)return d;
  let best=d,bestDist=Math.abs(d-oggi);
  for(let off=-3;off<=3;off++){
    if(!off)continue;
    const c=new Date(d.getTime());
    c.setFullYear(d.getFullYear()+off);
    const dist=Math.abs(c-oggi);
    if(dist<bestDist){best=c;bestDist=dist;}
  }
  // Si corregge solo se cambiare anno riporta la data a ridosso di oggi: è il segno di un
  // anno sbagliato. Una data lontana che resta lontana anche cambiando anno (un planning
  // di gennaio riaperto in agosto) va lasciata com'è, non spostata all'anno dopo.
  return bestDist<=90*G?best:d;
}

async function _turnoClaudeParse(contentBlock,prompt){
  const response=await fetch('https://anthropic-proxy.qm-d82.workers.dev/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'claude-sonnet-4-6',
      max_tokens:4000,
      messages:[{role:'user',content:[contentBlock,{type:'text',text:prompt}]}]
    })
  });
  const data=await response.json();
  if(!data.content||!data.content[0])throw new Error('Risposta vuota');
  let jsonText=data.content[0].text.replace(/```json/g,'').replace(/```/g,'').trim();
  const parsed=JSON.parse(jsonText);
  if(!parsed.giorni||!Array.isArray(parsed.giorni)||!parsed.giorni.length){
    throw new Error('Struttura JSON non valida');
  }
  return parsed;
}
function _turnoReconcile(passes){
  const base=passes[0];
  const giorni=base.giorni.map((g,gi)=>{
    const allNames=new Set();
    passes.forEach(p=>{if(p.giorni[gi])Object.keys(p.giorni[gi].shifts||{}).forEach(n=>allNames.add(n));});
    const shifts={};
    allNames.forEach(name=>{
      const votes={};
      passes.forEach(p=>{
        const v=(p.giorni[gi]?.shifts?.[name]??'').toString();
        votes[v]=(votes[v]||0)+1;
      });
      let bestVal=g.shifts?.[name]??'',bestCount=-1;
      Object.entries(votes).forEach(([v,c])=>{if(c>bestCount){bestCount=c;bestVal=v;}});
      shifts[name]=bestVal;
    });
    return{label:g.label,date:g.date,shifts};
  });
  return{giorni};
}
// §§ TURNO — RENDER & NAVIGAZIONE (loadWeekData, renderDay, buildWeekNav)
// Ricerca robusta del giorno corrispondente a refDate in weekData.giorni: prova prima
// la data esatta (anno/mese/giorno), poi l'abbreviazione del giorno della settimana nel
// label (es. "Mar" per martedì). Condivisa tra loadWeekData e refreshOverviewForDate così
// le due funzioni concordano sempre su "il turno di oggi c'è" — prima usavano logiche
// diverse e potevano disaccordare, mostrando l'avviso "settimana precedente" anche quando
// il turno era quello giusto.
function findWeekDayIndex(data,refDate){
  const refD=refDate.getDate(),refM=refDate.getMonth()+1,refY=refDate.getFullYear();
  function parseLocalDate(g){
    // Prova prima con date field come stringa ISO "2026-03-23"
    if(g.date){
      const s=typeof g.date==='string'?g.date:g.date.toISOString?g.date.toISOString():'';
      const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if(m)return{y:parseInt(m[1]),mo:parseInt(m[2]),d:parseInt(m[3])};
    }
    // Fallback: leggi dal label "Lun 23/03" o "Lun 23/03/2026" o "Lun 23"
    if(g.label){
      const m2=g.label.match(/(\d{1,2})\/(\d{2})(?:\/(\d{4}))?/);
      if(m2)return{y:m2[3]?parseInt(m2[3]):refY,mo:parseInt(m2[2]),d:parseInt(m2[1])};
      const m3=g.label.match(/(\d{1,2})$/);
      if(m3)return{y:refY,mo:refM,d:parseInt(m3[1])};
    }
    return null;
  }
  let idx=data.giorni.findIndex(g=>{
    const p=parseLocalDate(g);
    return p&&p.d===refD&&p.mo===refM&&p.y===refY;
  });
  if(idx===-1){
    const dayPfx=['dom','lun','mar','mer','gio','ven','sab'][refDate.getDay()];
    idx=data.giorni.findIndex(g=>g.label&&g.label.toLowerCase().startsWith(dayPfx));
  }
  return idx;
}
function loadWeekData(data){
  weekData=data;
  const today=new Date();
  let idx=findWeekDayIndex(data,today);
  if(idx===-1){
    // Nessuna corrispondenza nemmeno per giorno della settimana — mostra comunque
    // il primo o l'ultimo giorno disponibile, il più vicino a oggi
    const parseLocalDate=g=>{
      if(g.date){const s=typeof g.date==='string'?g.date:g.date.toISOString?g.date.toISOString():'';const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return{y:parseInt(m[1]),mo:parseInt(m[2]),d:parseInt(m[3])};}
      if(g.label){const m2=g.label.match(/(\d{1,2})\/(\d{2})(?:\/(\d{4}))?/);if(m2)return{y:m2[3]?parseInt(m2[3]):today.getFullYear(),mo:parseInt(m2[2]),d:parseInt(m2[1])};}
      return null;
    };
    const todayD=today.getDate(),todayM=today.getMonth()+1,todayY=today.getFullYear();
    const lastP=parseLocalDate(data.giorni[data.giorni.length-1]);
    const isPast=lastP&&(lastP.y<todayY||(lastP.y===todayY&&lastP.mo<todayM)||(lastP.y===todayY&&lastP.mo===todayM&&lastP.d<todayD));
    idx=isPast?data.giorni.length-1:0;
  }
  activeDay=idx;buildWeekNav();renderDay(activeDay);updateSidebarInfo();
  document.getElementById('weekNavWrap').style.display='block';
  document.getElementById('loadedInfo').classList.add('visible');
  document.getElementById('btnReload').style.display='block';
}
function buildWeekNav(){const nav=document.getElementById('weekNav');nav.innerHTML='';weekData.giorni.forEach((g,i)=>{const btn=document.createElement('button');btn.className='wday-btn'+(i===activeDay?' active':'');btn.textContent=g.label.split(' ')[0].substring(0,3);btn.title=g.label;btn.onclick=()=>{activeDay=i;renderDay(i);updateWeekNavActive();updateSidebarInfo();};nav.appendChild(btn);});document.getElementById('weekRangeLabel').textContent=weekData.giorni[0].label+' – '+weekData.giorni[weekData.giorni.length-1].label;}
function updateWeekNavActive(){document.querySelectorAll('.wday-btn').forEach(b=>{const i=Array.prototype.indexOf.call(b.parentElement.children,b);b.classList.toggle('active',i===activeDay);});}
const IS_ABSENT=v=>{
  if(!v)return false;
  const u=v.trim().toUpperCase();
  // Il trattino resta fuori di proposito: non è un'assenza reale (R/RIPOSO/FERIE/...),
  // è un valore "non pertinente" che non deve contare né come in turno né come assente.
  if(['R','RIPOSO','RIPOSO RICHIESTO','R RICHIESTO','RECUPERO','MALATTIA','OFF','FERIE'].includes(u))return true;
  return u.includes('RECUPER')||u.includes('RIPOSO')||u.includes('MALATTIA')||u.includes('FERIE')||u.includes('RICHIEST');
};
function updateSidebarInfo(){if(!weekData)return;const g=weekData.giorni[activeDay];document.getElementById('loadedDate').textContent=g.label;document.getElementById('loadedActive').textContent=ALL_STAFF.filter(n=>!IS_REST(getShift(g.shifts,n))).length+' in turno';document.getElementById('loadedAbsent').textContent=ALL_STAFF.filter(n=>IS_ABSENT(getShift(g.shifts,n))).length+' non in servizio';}
// Cerca lo shift di un membro DEPTS in modo case-insensitive
function getShift(shifts,name){
  if(shifts[name]!==undefined)return shifts[name];
  const low=name.toLowerCase();
  const key=Object.keys(shifts).find(k=>k.toLowerCase()===low);
  return key!==undefined?shifts[key]:undefined;
}
function _fmtDateLongIt(d){
  const months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  return d.getDate()+' '+months[d.getMonth()]+' '+d.getFullYear();
}
function toggleStaffPanel(){
  const b=document.getElementById('staffArea'),chev=document.getElementById('staffPanelChevron');
  if(!b)return;
  const collapsed=b.style.display==='none';
  b.style.display=collapsed?'':'none';
  if(chev)chev.style.transform=collapsed?'':'rotate(-90deg)';
}
function updateStaffPanelHeader(dateObj){
  const titleEl=document.getElementById('staffPanelTitle');
  if(titleEl)titleEl.textContent='Turno di oggi · '+_fmtDateLongIt(dateObj||customDate||new Date());
  const updEl=document.getElementById('staffPanelUpdated');
  if(updEl){
    const ts=parseInt(localStorage.getItem('qm_ts_turnoTs')||'0');
    updEl.textContent=ts?('Ultimo aggiornamento '+_fmtDateLongIt(new Date(ts))+', '+String(new Date(ts).getHours()).padStart(2,'0')+':'+String(new Date(ts).getMinutes()).padStart(2,'0')):'';
  }
}
// Gerarchia di ordinamento del personale in servizio per reparto, in "Turno di oggi":
// - Ricevimento: Maddaloni e Presta sempre primi, poi gli altri ordinati per codice
//   turno (AC prima di AG, AG prima di CC, ecc.) — chi non ha uno di questi codici
//   resta in fondo, nell'ordine in cui compare.
// - Housekeeping: ordinati in base al valore scritto nel turno (struttura assegnata
//   quel giorno) secondo questa priorità: SOUL, SOUL N., 200, BRIGIDA, PR/MS.
// - Breakfast: stesso principio, priorità BKF SOUL, BKF GALL.
const DEPT_ORDER={
  fo:{names:['Maddaloni M.','Presta P.'],codes:['AC','AG','CC','CG','NC','NG']},
  hk:{codes:['SOUL','SOUL N.','200','BRIGIDA','PR/MS']},
  bkf:{codes:['BKF SOUL','BKF GALL']},
};
function sortDeptMembers(key,names,shifts){
  const cfg=DEPT_ORDER[key];
  if(!cfg)return names;
  const namePriority=cfg.names||[];
  const codePriority=cfg.codes||[];
  // Livello intermedio: nomi che iniziano con "Int" (interinali) vanno sempre subito
  // dopo Maddaloni/Presta (o in prima posizione se entrambi assenti quel giorno),
  // ma prima di tutti gli altri ordinati per codice turno. Solo per Ricevimento
  // (unico reparto con namePriority configurata).
  const hasIntTier=namePriority.length>0;
  // "Int" è nel valore del turno (es. "INT GALL 9/17"), non nel nome della persona.
  const isInt=n=>/^int/i.test((getShift(shifts,n)||'').trim());
  const tierOf=n=>{
    const ni=namePriority.indexOf(n);
    if(ni!==-1)return ni; // 0..namePriority.length-1
    if(hasIntTier&&isInt(n))return 1000; // livello intermedio
    return 2000; // tutti gli altri
  };
  return names.map((n,i)=>({n,i})).sort((A,B)=>{
    const a=A.n,b=B.n;
    const ta=tierOf(a),tb=tierOf(b);
    if(ta!==tb)return ta-tb;
    if(ta===1000)return A.i-B.i; // più Int: ordine originale tra loro
    if(ta<1000)return 0; // stesso nome in namePriority (non capita, ta è già indice univoco)
    const va=(getShift(shifts,a)||'').trim().toUpperCase();
    const vb=(getShift(shifts,b)||'').trim().toUpperCase();
    const ca=codePriority.indexOf(va),cb=codePriority.indexOf(vb);
    if(ca===-1&&cb===-1)return A.i-B.i; // ordine originale invariato
    if(ca===-1)return 1;
    if(cb===-1)return -1;
    return ca-cb;
  }).map(x=>x.n);
}
// I nomi del turno arrivano come "Cognome I." (es. "Maddaloni M."). L'iniziale viene
// separata in uno span invece di essere tolta qui: su smartphone la nasconde il CSS, così
// non serve ridisegnare al ridimensionamento della finestra (vedi il caso del piano del
// giorno, dove leggere innerWidth al momento del disegno lasciava il layout sbagliato
// fino al polling successivo). Chi non ha quel formato — "Extra Night", i nomi liberi
// delle extra HK — resta intatto.
const _nomeIniz=n=>{
  const m=String(n||'').match(/^(.*\S)(\s+[A-Za-z\u00C0-\u024F]\.)$/);
  return m?`${m[1]}<span class="s-ini">${m[2]}</span>`:String(n||'');
};

function renderDay(idx){
  const g=weekData.giorni[idx],shifts=g.shifts;
  updateStaffPanelHeader(g.date?(typeof g.date==='string'?new Date(g.date):g.date):null);
  // Indice case-insensitive dei nomi DEPTS per escluderli dagli extra
  const allStaffLow=new Set(ALL_STAFF.map(n=>n.toLowerCase()));
  const shiftsKeys=new Set(Object.keys(shifts).map(k=>k.toLowerCase()));
  // Chi cambia ogni settimana (extra HK non in DEPTS) compare nel turno ma non in
  // ALL_STAFF: se è a riposo va comunque mostrata da qualche parte, altrimenti sparisce
  // del tutto dalla giornata invece di finire nella striscia "Non in servizio".
  const extraNames=Object.keys(shifts).filter(n=>!allStaffLow.has(n.toLowerCase()));
  const nonServizio=[
    ...ALL_STAFF.filter(n=>shiftsKeys.has(n.toLowerCase())&&IS_REST(getShift(shifts,n))&&!IS_DASH(getShift(shifts,n))),
    ...extraNames.filter(n=>IS_REST(getShift(shifts,n))&&!IS_DASH(getShift(shifts,n)))
  ];
  // Motivo dell'assenza per differenziare la striscia "Non in servizio" — riposo è normale
  // (grigio), ferie è pianificato (ambra), malattia è l'unico che merita davvero attenzione (rosso)
  function _absenceReason(v){
    const u=String(v||'').trim().toUpperCase();
    if(['R','RIPOSO','RIPOSO RICHIESTO','R RICHIESTO','RECUPERO'].includes(u)||u.includes('RECUPER')||u.includes('RIPOSO')||u.includes('RICHIEST'))return{label:'Riposo',bg:'var(--surface2)',fg:'var(--text-dim)',ord:0};
    if(u==='MALATTIA'||u.includes('MALATTIA'))return{label:'Malattia',bg:'var(--red-bg)',fg:'var(--red)',ord:1};
    if(u==='FERIE'||u.includes('FERIE'))return{label:'Ferie',bg:'var(--amber-bg)',fg:'var(--amber)',ord:2};
    return{label:'',bg:'var(--surface2)',fg:'var(--text-dim)',ord:3};
  }
  const nonServizioSorted=[...nonServizio].sort((a,b)=>_absenceReason(getShift(shifts,a)).ord-_absenceReason(getShift(shifts,b)).ord);
  let html='';
  html+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
    <div style="display:flex;gap:2px;flex-shrink:0;">
      ${weekData.giorni.map((wg,wi)=>`<button onclick="activeDay=${wi};renderDay(${wi});updateWeekNavActive();updateSidebarInfo();" class="wday-btn${wi===idx?' active':''}" style="flex:none;padding:3px 8px;">${wg.label.split(' ')[0].substring(0,3)}</button>`).join('')}
    </div>
    <span style="font-size:var(--fs-xxs);color:var(--text-dim);white-space:nowrap;">${g.label}</span>
  </div>`;
  html+=`<div class="non-servizio-strip" style="background:var(--surface2);border:1.5px solid var(--border);"><span class="ns-label" style="color:var(--text-muted);">Non in servizio</span>${nonServizioSorted.length?nonServizioSorted.map(n=>{const r=_absenceReason(getShift(shifts,n));return`<span class="ns-chip" style="color:var(--text);background:#fff;border:1px solid var(--border-light);"><span class="ns-nome">${_nomeIniz(n)}</span>${r.label?`<span class="ns-motivo" style="background:${r.bg};color:${r.fg};">${r.label}</span>`:''}</span>`;}).join(''):`<span class="ns-chip" style="color:var(--text-dim);background:#fff;border:1px solid var(--border-light);">Tutti in servizio</span>`}</div>`;
  const shiftRow=(n,sv,cls)=>`<div class="staff-row" style="cursor:pointer;" title="Clicca per correggere" onclick="editShift(${idx},'${n.replace(/'/g,"\\'")}')"><span class="sname">${_nomeIniz(n)}</span><span class="sshift ${cls}">${sv||'—'}</span></div>`;
  // Raggruppa con una cornice verde sottile i colleghi consecutivi (dopo l'ordinamento)
  // che hanno esattamente lo stesso valore turno (es. due "CG") — capita spesso e aiuta
  // a vederli subito come coppia.
  const renderStaffRows=(members,deptKey)=>{
    let out='';
    let i=0;
    while(i<members.length){
      const sv=(getShift(shifts,members[i])||'').trim();
      let j=i+1;
      while(j<members.length&&sv&&(getShift(shifts,members[j])||'').trim().toUpperCase()===sv.toUpperCase())j++;
      const groupRows=members.slice(i,j).map(m=>{
        const smv=(getShift(shifts,m)||'').trim();
        return shiftRow(m,smv,(!IS_REST(smv))?'ss-active':'ss-special');
      }).join('');
      out+=(deptKey==='fo'&&(j-i)>=2)?`<div style="border:1.5px solid #a5d6a7;background:var(--green-bg,#e8f5e9);border-radius:6px;margin:3px 0;overflow:hidden;">${groupRows}</div>`:groupRows;
      i=j;
    }
    return out;
  };
  html+='<div class="staff-grid">';
  Object.entries(DEPTS).forEach(([key,dept])=>{
    // Membri DEPTS in turno
    const inT=dept.members.filter(n=>!IS_REST(getShift(shifts,n)));
    // Per HK aggiungi anche nomi dal turno non presenti in nessun reparto
    let extras=[];
    if(key==='hk'){
      extras=Object.keys(shifts).filter(n=>{
        if(IS_REST(getShift(shifts,n)))return false;
        const nl=n.toLowerCase();
        return!allStaffLow.has(nl);
      });
    }
    const showMembers=sortDeptMembers(key,[...inT,...extras],shifts);
    if(!showMembers.length){
      // Manutenzione resta sempre visibile anche a riposo/ferie — un solo addetto
      // (Basile G.), sparire del tutto dava l'impressione di un dato mancante.
      // Le altre card invece restano nascoste quando nessuno è in turno.
      if(key==='mt'){
        html+=`<div class="staff-dept-card"><div class="sdh"><span class="sdh-name ${dept.cls}">${dept.label}</span></div><div class="staff-list"><div style="padding:6px 2px;text-align:center;color:var(--text-dim);font-size:var(--fs-xs);">Nessuno in turno</div></div></div>`;
      }
      return;
    }
    html+=`<div class="staff-dept-card"><div class="sdh"><span class="sdh-name ${dept.cls}">${dept.label}</span></div><div class="staff-list">${renderStaffRows(showMembers,key)}</div></div>`;
  });
  html+='</div>';_setStaffAreaHTML(html);
}
// Scrive lo stesso HTML in ogni copia del pannello turno — l'originale in Overview
// (#staffArea) e lo specchio nella vista "Turnazione Corrente" (#staffAreaMirror),
// entrambi con classe .staff-area-mirror. Un solo renderDay() li tiene sincronizzati
// invece di dover duplicare la logica o richiamarla due volte.
function _setStaffAreaHTML(html){document.querySelectorAll('.staff-area-mirror').forEach(el=>el.innerHTML=html);}
function editShift(dayIdx,nome){
  if(!weekData||!weekData.giorni[dayIdx])return;
  const shifts=weekData.giorni[dayIdx].shifts;
  // Trova la chiave reale (case-insensitive)
  const realKey=Object.keys(shifts).find(k=>k.toLowerCase()===nome.toLowerCase())||nome;
  const cur=shifts[realKey]||'';
  const nuovo=window.prompt(`Turno di ${nome} — ${weekData.giorni[dayIdx].label}\nValore attuale: "${cur}"\n\nInserisci il turno corretto:`,cur);
  if(nuovo===null)return; // annullato
  shifts[realKey]=nuovo.trim();
  // Salva in localStorage e cloud
  const toSave={giorni:weekData.giorni.map(g=>({...g,date:g.date instanceof Date?g.date.toISOString():g.date})),_ts:Date.now()};
  localStorage.setItem('qm_weekData',JSON.stringify(toSave));
  kvSet('qm_weekData',JSON.stringify(toSave));
  renderDay(dayIdx);
  updateSidebarInfo();
}
function resetTurni(){weekData=null;activeDay=0;ucSetState('turno','','Non caricato');turniInput.value='';
  try{localStorage.removeItem('qm_weekData');}catch(e){}
  try{localStorage.removeItem('qm_ts_turnoTs');}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_weekData',value:null})}).catch(()=>{});}catch(e){}document.getElementById('loadedInfo').classList.remove('visible');document.getElementById('weekNavWrap').style.display='none';document.getElementById('btnReload').style.display='none';const ts=document.getElementById('turnoTs');if(ts){ts.textContent='';ts.classList.remove('visible');}updateStaffPanelHeader();_setStaffAreaHTML(`<div class="ov-empty"><div class="ov-empty-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="ov-empty-text">Nessun turno caricato</div><div class="ov-empty-sub">Carica uno screenshot o PDF del planning dalla sidebar</div></div>`);}
// §§ NAVIGAZIONE VISTE (setView, pageTitles, toggleRecGroup)
const pageTitles={overview:'Panoramica del giorno',registrazione:'Registration Cards','room-division':'Bilanciamento Camere','recensioni-sa':'Recensioni SoulArt','recensioni-bh':'Recensioni Boutique','recensioni-sl':'Recensioni San Liborio','recensioni-pr':'Recensioni Principe','recensioni-ms':'Recensioni Mastrangelo','recensioni-ar':'Recensioni Art Resort','recensioni-sb':'Recensioni Santa Brigida','recensioni-exp-sa':'Expedia — SoulArt','recensioni-exp-bh':'Expedia — Boutique','recensioni-exp-ar':'Expedia — Art Resort','recensioni-exp-sb':'Expedia — Santa Brigida',hkpsheet:'Operativa HKP — SoulArt',bkfsheet:'Breakfast Sheet — SoulArt',bkfsheetar:'Breakfast Sheet — Galleria',dvr:'DVR','miniapp':'Pannello App',inventario:'Inventari e Ordini',spese:'Spese Fornitori','turni-pref':'Preferenze Turni','controllo-mattino':'Distribuzione Culligan',reception:'Passaggi di Cassa',turnazione:'Turnazione Corrente','resi-biancheria':'Resi Biancheria',biancheria:'Gestione Biancheria',prestay:'Messaggi Pre-stay'};
const breadcrumbs={overview:'Operativo Quotidiano',registrazione:'Operativo Quotidiano','room-division':'Housekeeping',hkpsheet:'Housekeeping',bkfsheet:'Breakfast Sheet',bkfsheetar:'Breakfast Sheet','recensioni-sa':'Qualità · Recensioni','recensioni-bh':'Qualità · Recensioni','recensioni-sl':'Qualità · Recensioni','recensioni-pr':'Qualità · Recensioni','recensioni-ms':'Qualità · Recensioni','recensioni-ar':'Qualità · Recensioni','recensioni-sb':'Qualità · Recensioni','recensioni-exp-sa':'Qualità · Expedia','recensioni-exp-bh':'Qualità · Expedia','recensioni-exp-ar':'Qualità · Expedia','recensioni-exp-sb':'Qualità · Expedia',dvr:'Fascicolo Dipendenti',miniapp:'Strumenti','turni-pref':'Reception',reception:'Reception',turnazione:'Reception','resi-biancheria':'Housekeeping',biancheria:'Housekeeping',prestay:'Operativo Quotidiano'};
// §§ HKP OPERATIVE — Google Sheets (hkpLoad, hkpRenderAll, hkpRenderContent, hkpTab, hkpSave, hkpRestore)
// Operativa HKP: solo SoulArt. Art Resort è stato rimosso (17/08/2026) — non più
// necessario, quindi via anche la scelta della struttura dal menu.
const HKP_URL_DEFAULTS={
  sa:{foglio:'https://docs.google.com/spreadsheets/d/1lhbaUyFTzLX6NNForKkad3KQTF9HH0BB1BFdhZJZSmo/edit',script:'https://script.google.com/macros/s/AKfycbw1xDrmcRUm0WqM47wTmTin4eqC4wJn9w1KLZbq2XiMryEu6a2UWNsUF6hYcNRjVYgc/exec'}
};
let HKP_CONFIG={sa:{...HKP_URL_DEFAULTS.sa}};
function hkpSaveConfig(){
  const json=JSON.stringify(HKP_CONFIG);
  try{localStorage.setItem('qm_hkp_config',json);}catch(e){}
  kvSet('qm_hkp_config',json).catch(()=>{});
}
function hkpRestoreConfig(){
  try{const s=localStorage.getItem('qm_hkp_config');if(s){const p=JSON.parse(s);['sa'].forEach(k=>{if(p[k]?.foglio)HKP_CONFIG[k].foglio=p[k].foglio;if(p[k]?.script)HKP_CONFIG[k].script=p[k].script;});}}catch(e){}
  ['sa'].forEach(k=>{const link=document.getElementById('hkp-'+k+'-link');if(link)link.href=HKP_CONFIG[k].foglio;});
}
function hkpEditUrl(p){
  const nome='SoulArt';
  const curFoglio=HKP_CONFIG[p].foglio;
  const curScript=HKP_CONFIG[p].script;
  const newFoglio=(prompt(`[${nome}] URL Google Sheets (Apri foglio):\n\nIncolla il nuovo URL del foglio mensile:`,curFoglio)||'').trim();
  if(!newFoglio||newFoglio===curFoglio){return;}
  HKP_CONFIG[p].foglio=newFoglio;
  const newScript=(prompt(`[${nome}] URL Apps Script (Aggiorna dati):\n\nIncolla il nuovo URL del deploy Apps Script (.../exec):`,curScript)||'').trim();
  if(newScript&&newScript!==curScript)HKP_CONFIG[p].script=newScript;
  hkpSaveConfig();
  const link=document.getElementById('hkp-'+p+'-link');if(link)link.href=HKP_CONFIG[p].foglio;
  cqAvviso(`URL ${nome} aggiornati. Clicca Aggiorna per ricaricare i dati.`);
}
// §§ HKP NATIVE — griglia nativa (Camere / Aree Comuni / Fondi & Lavaggi)
// Storage: una chiave per hotel/mese → qm_hkpN_{p}_{yyyy-mm}
// Cell IDs: "{tab}:{ri}_{day|task}" — prefisso tab garantisce isolamento totale
const HKP_ROOMS={
  sa:{
    camere:[
      {g:'ART 1–7\n10–12 · 22',list:['ART 01','ART 02','ART 03','ART 04','ART 05','ART 06','ART 07','ART 10','ART 11','ART 12','ART 22']},
      {g:'ART 8–9\n13–21',list:['ART 08','ART 09','ART 13','ART 14','ART 15','ART 16','ART 17','ART 18','ART 19','ART 20','ART 21']},
      {g:'Boutique\nSan Liborio',list:['201','203','204','205','206','207','208','209','210','211','LIBORIO']},
    ],
    aree:[
      {g:'A — Interni',list:['Corridoio S.Art Vecchie','Corridoio S.Art Nuovo','Hall Reception','Sala Colazioni','Direzione']},
      {g:'B — Servizi',list:['Bagni Piano (inizio)','Bagni Piano (fine)','Spogliatoi']},
      {g:'C — Esterni',list:['Terrazzo Sinistro','Terrazzo Destro','Aree Esterne']},
    ],
    fondi:{
      tasks:['FONDO','FILTRI AC','LAVAGGIO PIUMONI -\nCOPRIMATERASSI','LAVAGGIO TENDE','LAVAGGIO VETRI E\nFINESTRE'],
      groups:[
        {name:'Soulart',rooms:['ART 1','ART 2','ART 3','ART 4','ART 5','ART 6','ART 7','ART 8','ART 9','ART 10','ART 11','ART 12','ART 13','ART 14','ART 15','ART 16','ART 17','ART 18','ART 19','ART 20','ART 21','ART 22']},
        {name:'Boutique',rooms:['201','203','204','205','206','207','208','209','210','211']},
      ],
    },
  },
  ar:{
    camere:[
      {g:'Art Resort',list:['AR 01','AR 02','AR 03','AR 04','AR 05','AR 06','AR 07','AR 08','AR 09','AR 10']},
    ],
    aree:[
      {g:'Interni',list:['Corridoio','Hall Reception','Sala Colazioni']},
      {g:'Servizi',list:['Bagni Piano','Spogliatoi']},
      {g:'Esterni',list:['Aree Esterne']},
    ],
    fondi:{
      tasks:['FONDO','FILTRI AC','LAVAGGIO PIUMONI -\nCOPRIMATERASSI','LAVAGGIO TENDE','LAVAGGIO VETRI E\nFINESTRE'],
      groups:[
        {name:'Art Resort',rooms:['AR 01','AR 02','AR 03','AR 04','AR 05','AR 06','AR 07','AR 08','AR 09','AR 10']},
      ],
    },
  },
};
let HKP_NTAB={sa:'camere',ar:'camere'};
let HKP_NMON={sa:'',ar:''};
let _hkpNdata={};   // {p_yyyy-mm: {cellId: val}}
let _hkpNdebounce={};
let _hkpNsel={drag:false,cells:new Set()};
const HKP_SYM={RP:'hkp-ripasso',ND:'hkp-nd',LIB:'open-sign',NE:'non-eseguito'};
// Mappatura sigla in griglia → nome esteso cameriera (da completare con l'elenco fornito dall'utente)
const HKP_HW_NAMES={AM:'Matarese',IA:'Acunzo',CD:'De Masi',LC:'Cavaliere',ANU:'Anushka'};
// Aree comuni escluse dal conteggio "chi fa cosa" — non richiedono un controllo puntuale
const HKP_AREE_ESCLUSE=new Set(['Corridoio S.Art Vecchie','Corridoio S.Art Nuovo','Corridoio','Terrazzo Sinistro','Terrazzo Destro','Aree Esterne']);
const HKP_SYM_EXT='png';
const HKP_MON_NAMES=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
function hkpNStorKey(p){return 'qm_hkpN_'+p+'_'+hkpNCurMon(p);}
function hkpNCacheKey(p){return p+'_'+hkpNCurMon(p);}
function hkpNCurMon(p){
  if(!HKP_NMON[p]){const n=new Date();HKP_NMON[p]=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}
  return HKP_NMON[p];
}
function hkpNNavMon(p,dir){
  const [y,m]=hkpNCurMon(p).split('-').map(Number);
  const d=new Date(y,m-1+dir,1);
  HKP_NMON[p]=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  // flush previous debounce before switching month
  clearTimeout(_hkpNdebounce[p]);
  hkpNRender(p);
}
function hkpNGetData(p){
  const ck=hkpNCacheKey(p);
  if(!_hkpNdata[ck]){
    try{const s=localStorage.getItem(hkpNStorKey(p));_hkpNdata[ck]=s?JSON.parse(s):{};}
    catch(e){_hkpNdata[ck]={};}
  }
  return _hkpNdata[ck];
}
function hkpNGetCell(p,tab,ri,col){return hkpNGetData(p)[tab+':'+ri+'_'+col]||'';}
function hkpNSetCell(p,tab,ri,col,val){
  const data=hkpNGetData(p);
  const k=tab+':'+ri+'_'+col;
  const t=(val||'').trim().toUpperCase();
  if(t)data[k]=t;else delete data[k];
}
function hkpNSave(p){
  const sk=hkpNStorKey(p);
  const json=JSON.stringify(_hkpNdata[hkpNCacheKey(p)]||{});
  try{localStorage.setItem(sk,json);}catch(e){}
  kvSet(sk,json).catch(()=>{});
}
function hkpNSaveAll(p){
  hkpNSave(p);
  const btn=document.getElementById('hkpN-'+p+'-savebtn');
  if(btn){btn.textContent='✓ Salvato';setTimeout(()=>{btn.textContent='Salva';},1800);}
}
function hkpNGetRows(p,tab){
  const conf=HKP_ROOMS[p]&&HKP_ROOMS[p][tab];
  if(Array.isArray(conf)){
    const rows=[];
    conf.forEach(grp=>grp.list.forEach(name=>rows.push(name)));
    return rows;
  }
  if(conf&&Array.isArray(conf.tasks))return conf.tasks;
  return[];
}
// Presenza reale della cameriera nel mese: va sempre letta dal tab Camere, mai dedotta
// da altri tab (es. Aree Comuni) — non partecipare alla pulizia aree comuni un giorno
// non significa che quel giorno non fosse presente in servizio.
function hkpNCamerePresenceDays(p,days){
  const conf=HKP_ROOMS[p]&&HKP_ROOMS[p].camere;
  const presence={};
  if(!Array.isArray(conf))return presence;
  const camRows=[];conf.forEach(grp=>grp.list.forEach(name=>camRows.push(name)));
  camRows.forEach((name,ri)=>{
    days.forEach(d=>{
      const v=hkpNGetCell(p,'camere',ri,d);
      if(!v)return;
      v.split('/').forEach(k=>{
        const t=k.trim();
        if(t&&!HKP_SYM[t])(presence[t]=presence[t]||new Set()).add(d);
      });
    });
  });
  return presence;
}
// Matrice "per area → per cameriera": quante volte ciascuna cameriera ha fatto ciascuna
// area comune (esclusi corridoi/terrazzi/esterne) — dato oggettivo per capire chi fa
// davvero un compito specifico, non solo il totale complessivo di una persona
function hkpNAreaStaffMatrix(p,tab,rows,days){
  const areaNames=[];
  const matrix={};
  rows.forEach((row,ri)=>{
    const name=typeof row==='string'?row:row.name;
    if(HKP_AREE_ESCLUSE.has(name))return;
    if(!matrix[name]){matrix[name]={};areaNames.push(name);}
    days.forEach(d=>{
      const v=hkpNGetCell(p,tab,ri,d);
      if(!v)return;
      v.split('/').forEach(k=>{
        const t=k.trim();
        if(!t||HKP_SYM[t])return;
        matrix[name][t]=(matrix[name][t]||0)+1;
      });
    });
  });
  const staffCodes=[...new Set(Object.values(matrix).flatMap(m=>Object.keys(m)))]
    .sort((a,b)=>{
      const totA=areaNames.reduce((s,ar)=>s+(matrix[ar][a]||0),0);
      const totB=areaNames.reduce((s,ar)=>s+(matrix[ar][b]||0),0);
      return totB-totA;
    });
  return{areaNames,matrix,staffCodes};
}
// Tabella area × cameriera — dato oggettivo e presentabile: chi fa davvero ciascuna area
// e quante volte, riga per riga, senza ambiguità (utile per un confronto in direzione)
function hkpNRenderAreaMatrixHTML(p,tab,rows,days,variant){
  const{areaNames,matrix,staffCodes}=hkpNAreaStaffMatrix(p,tab,rows,days);
  if(!areaNames.length||!staffCodes.length)return'';
  const isPrint=variant==='print';
  const hdrBg=isPrint?'#1E4080':'#f5f6f8',hdrColor=isPrint?'#fff':'#333';
  const B=isPrint?'border:1px solid #ccc;':'border:1px solid #e2e4e8;';
  let t='<div style="margin-top:16px;overflow-x:auto;">';
  t+='<div style="font-size:'+(isPrint?'13px':'12px')+';font-weight:700;color:'+(isPrint?'#1E4080':'#1a1a1a')+';margin-bottom:8px;">Chi fa cosa — tabella area × cameriera</div>';
  t+='<table style="border-collapse:collapse;font-size:'+(isPrint?'12px':'12px')+';">';
  t+='<thead><tr>';
  t+='<th style="'+B+'background:'+hdrBg+';color:'+hdrColor+';padding:5px 10px;text-align:left;white-space:nowrap;">Area</th>';
  staffCodes.forEach(code=>{
    const fullName=HKP_HW_NAMES[code.toUpperCase()]||code;
    t+='<th style="'+B+'background:'+hdrBg+';color:'+hdrColor+';padding:5px 8px;text-align:center;white-space:nowrap;">'+fullName+'</th>';
  });
  t+='<th style="'+B+'background:'+(isPrint?'#1a5c2e':'#e2e4e8')+';color:'+(isPrint?'#fff':'#333')+';padding:5px 8px;text-align:center;white-space:nowrap;">Totale</th>';
  t+='</tr></thead><tbody>';
  areaNames.forEach(area=>{
    const rowTot=staffCodes.reduce((s,c)=>s+(matrix[area][c]||0),0);
    t+='<tr>';
    t+='<td style="'+B+'padding:4px 10px;white-space:nowrap;color:#333;">'+area+'</td>';
    staffCodes.forEach(code=>{
      const n=matrix[area][code]||0;
      t+='<td style="'+B+'padding:4px 8px;text-align:center;font-weight:'+(n?'700':'400')+';color:'+(n?'#1E4080':'#bbb')+';background:'+(n?'#f0f5ff':'#fff')+';">'+(n||'—')+'</td>';
    });
    t+='<td style="'+B+'padding:4px 8px;text-align:center;font-weight:700;background:#d4edda;color:#1a5c2e;">'+rowTot+'</td>';
    t+='</tr>';
  });
  t+='<tr>';
  t+='<td style="'+B+'padding:4px 10px;font-weight:700;color:#333;">Totale</td>';
  let grand=0;
  staffCodes.forEach(code=>{
    const colTot=areaNames.reduce((s,a)=>s+(matrix[a][code]||0),0);
    grand+=colTot;
    t+='<td style="'+B+'padding:4px 8px;text-align:center;font-weight:700;background:#e2e4e8;">'+colTot+'</td>';
  });
  t+='<td style="'+B+'padding:4px 8px;text-align:center;font-weight:800;background:#c3e6cb;color:#155724;">'+grand+'</td>';
  t+='</tr>';
  t+='</tbody></table></div>';
  return t;
}
function hkpNPrint(p){
  const tab=HKP_NTAB[p]||'camere';
  const tabLabels={camere:'Camere',aree:'Aree Comuni',fondi:'Fondi & Lavaggi'};
  const hotel=p==='sa'?'SoulArt Hotel':'Art Resort';
  const [y,m]=hkpNCurMon(p).split('-').map(Number);
  const monName=(HKP_MON_NAMES||['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'])[m-1];
  const days=new Array(new Date(y,m,0).getDate()).fill(0).map((_,i)=>i+1);
  const rows=hkpNGetRows(p,tab);
  const data=(_hkpNdata[hkpNCacheKey(p)]||{})[tab]||{};

  // Build totals — conta le celle con assegnazione cameriera (esclude simboli
  // come RP/ND/LIB/NE), stessa logica di hkpNRenderGrid, non una somma numerica
  const rowTotals={},dayTotals={};
  rows.forEach((row,ri)=>{
    let rt=0;
    days.forEach(d=>{
      const v=hkpNGetCell(p,tab,ri,d);
      if(!v)return;
      let hasStaff=false;
      v.split('/').forEach(k=>{const t=k.trim();if(t&&!HKP_SYM[t])hasStaff=true;});
      if(hasStaff){rt++;dayTotals[d]=(dayTotals[d]||0)+1;}
    });
    rowTotals[ri]=rt;
  });
  const grandTot=Object.values(rowTotals).reduce((a,b)=>a+b,0);

  // Totale per cameriera — conta le occorrenze (camere) di ogni codice non-simbolo
  // e i giorni di presenza distinti (almeno una camera quel giorno) su tutto il mese
  const staffTotals={},staffDays={};
  rows.forEach((row,ri)=>{
    days.forEach(d=>{
      const v=hkpNGetCell(p,tab,ri,d);
      if(!v)return;
      v.split('/').forEach(k=>{
        const t=k.trim();
        if(!t||HKP_SYM[t])return;
        staffTotals[t]=(staffTotals[t]||0)+1;
        (staffDays[t]=staffDays[t]||new Set()).add(d);
      });
    });
  });
  const staffList=Object.entries(staffTotals).sort((a,b)=>b[1]-a[1]);

  // Build print HTML
  let th='<tr><th style="background:#1E4080;color:#fff;padding:6px 10px;white-space:nowrap;border:1px solid #ccc;">Gruppo</th>'
        +'<th style="background:#1E4080;color:#fff;padding:6px 10px;white-space:nowrap;border:1px solid #ccc;">Camera</th>';
  days.forEach(d=>th+='<th style="background:#1E4080;color:#fff;padding:4px 6px;text-align:center;border:1px solid #ccc;font-size:11px;">'+d+'</th>');
  th+='<th style="background:#1a5c2e;color:#fff;padding:4px 8px;text-align:center;border:1px solid #ccc;">Tot</th></tr>';

  let groups=[];
  const conf=HKP_ROOMS[p]&&HKP_ROOMS[p][tab];
  if(Array.isArray(conf)){
    conf.forEach(grp=>grp.list.forEach((name,idx)=>groups.push({group:idx===0?grp.g:'',room:name})));
  } else {
    rows.forEach(r=>groups.push({group:'',room:r}));
  }

  let tbody='';
  let lastGrp='';
  groups.forEach((g,ri)=>{
    const isNewGroup=g.group!==lastGrp;
    lastGrp=g.group;
    const rTot=rowTotals[ri]||0;
    tbody+='<tr>';
    tbody+='<td style="border:1px solid #ccc;padding:4px 8px;white-space:nowrap;font-size:11px;color:#555;">'+( isNewGroup?g.group:'')+'</td>';
    tbody+='<td style="border:1px solid #ccc;padding:4px 8px;white-space:nowrap;font-weight:600;font-size:12px;">'+g.room+'</td>';
    days.forEach(d=>{
      const v=hkpNGetCell(p,tab,ri,d);
      const dual=v.includes('/');
      tbody+='<td style="border:1px solid #ccc;padding:3px 4px;text-align:center;font-size:12px;font-weight:'+(v?'700':'400')+';color:'+(dual?'#1E4080':'#1a1a1a')+';background:'+(v?'#f0f5ff':'#fff')+';">'+v+'</td>';
    });
    tbody+='<td style="border:1px solid #ccc;text-align:center;background:#d4edda;color:#1a5c2e;font-weight:700;font-size:12px;padding:3px 6px;">'+(rTot||'')+'</td>';
    tbody+='</tr>';
  });

  // Footer row totals
  tbody+='<tr style="background:#f0f0f0;">';
  tbody+='<td colspan="2" style="border:1px solid #ccc;padding:4px 8px;font-weight:700;font-size:11px;text-align:right;">Totale</td>';
  days.forEach(d=>tbody+='<td style="border:1px solid #ccc;text-align:center;background:#d4edda;color:#1a5c2e;font-weight:700;font-size:12px;padding:3px 4px;">'+(dayTotals[d]||'')+'</td>');
  tbody+='<td style="border:1px solid #ccc;text-align:center;background:#c3e6cb;color:#155724;font-weight:800;font-size:13px;padding:3px 6px;">'+(grandTot||'')+'</td>';
  tbody+='</tr>';

  // Aree comuni: dettaglio "chi fa cosa e quante volte" (esclusi corridoi/terrazzi/esterne),
  // sostituisce il riepilogo generico usato per Camere
  let staffTitle='Totale camere e giorni di presenza per cameriera';
  let staffChips;
  if(tab==='aree'){
    staffTitle='Dettaglio interventi per cameriera (esclusi corridoi, terrazzi, aree esterne)';
    const staffAreaCounts={};
    rows.forEach((row,ri)=>{
      if(HKP_AREE_ESCLUSE.has(row))return;
      days.forEach(d=>{
        const v=hkpNGetCell(p,tab,ri,d);
        if(!v)return;
        v.split('/').forEach(k=>{
          const t=k.trim();
          if(!t||HKP_SYM[t])return;
          staffAreaCounts[t]=staffAreaCounts[t]||{};
          staffAreaCounts[t][row]=(staffAreaCounts[t][row]||0)+1;
        });
      });
    });
    // Giorni di presenza SEMPRE dal tab Camere — non farlo nel tab Aree significa solo
    // che quel giorno non ha pulito aree comuni, non che non fosse in servizio
    const camPresence=hkpNCamerePresenceDays(p,days);
    // Ordinato per totale interventi nel mese — è il numero richiesto ("chi ha fatto
    // cosa e quante volte" al mese, non una media giornaliera)
    const staffStats=Object.keys(staffAreaCounts).map(code=>{
      const areas=staffAreaCounts[code];
      const tot=Object.values(areas).reduce((s,n)=>s+n,0);
      const gg=camPresence[code]?camPresence[code].size:0;
      return{code,areas,tot,gg,media:gg?tot/gg:0};
    }).sort((a,b)=>b.tot-a.tot);
    // Confronto semplice per direzione e cameriere: % presenze vs % lavoro fatto sul
    // totale del gruppo — leggibile senza calcoli, niente formule o "quote"
    const totGGall2=staffStats.reduce((s,x)=>s+x.gg,0),totTOTall2=staffStats.reduce((s,x)=>s+x.tot,0);
    staffChips=staffStats.length?staffStats.map(({code,areas,tot,gg})=>{
      const detail=Object.entries(areas).sort((a,b)=>b[1]-a[1]).map(([area,n])=>'<div>'+area+' ×'+n+'</div>').join('');
      const pctPresenza=totGGall2?Math.round(gg/totGGall2*100):0;
      const pctLavoro=totTOTall2?Math.round(tot/totTOTall2*100):0;
      const diff=pctLavoro-pctPresenza;
      let balColor='#888',balLabel='Nessun confronto possibile';
      if(gg>0){
        if(diff>=10){balColor='#c62828';balLabel='Fa più del previsto';}
        else if(diff<=-10){balColor='#a05a00';balLabel='Fa meno del previsto';}
        else{balColor='#2e7d32';balLabel='Nella norma';}
      }
      return '<div style="background:#f0f5ff;border:1px solid #B8CEEE;border-radius:8px;padding:8px 12px;margin:0 0 6px;">'
      +'<span style="font-weight:700;font-size:13px;color:#1E4080;">'+code+'</span> '
      +'<span style="font-size:13px;color:#1E4080;font-weight:800;">'+tot+' interventi/mese</span> '
      +'<span style="font-size:11px;color:#1a5c2e;font-weight:700;">· '+gg+' '+(gg===1?'giorno':'giorni')+' presenza</span> '
      +'<span style="font-size:11px;font-weight:800;color:'+balColor+';">· '+balLabel+'</span>'
      +'<div style="margin-top:5px;max-width:340px;">'
      +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;"><span style="font-size:10px;color:#666;width:60px;">Presenze</span><div style="flex:1;height:8px;border-radius:4px;background:#dde2ea;overflow:hidden;"><div style="width:'+pctPresenza+'%;height:100%;background:#888;"></div></div><span style="font-size:10px;color:#666;width:28px;text-align:right;">'+pctPresenza+'%</span></div>'
      +'<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:10px;color:#666;width:60px;">Lavoro</span><div style="flex:1;height:8px;border-radius:4px;background:#dde2ea;overflow:hidden;"><div style="width:'+pctLavoro+'%;height:100%;background:'+balColor+';"></div></div><span style="font-size:10px;color:#666;width:28px;text-align:right;">'+pctLavoro+'%</span></div>'
      +'</div>'
      +'<div style="font-size:13px;color:#333;margin-top:5px;">'+detail+'</div></div>';
    }).join(''):'<div style="font-size:11px;color:#888;">Nessuna assegnazione registrata.</div>';
  } else {
    staffChips=staffList.length?staffList.map(([code,n])=>{
      const gg=(staffDays[code]?staffDays[code].size:0);
      const media=gg?(n/gg).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1}):'—';
      return '<div style="display:inline-flex;align-items:baseline;gap:8px;background:#f0f5ff;border:1px solid #B8CEEE;border-radius:8px;padding:5px 12px;margin:0 6px 6px 0;">'
      +'<span style="font-weight:700;font-size:13px;color:#1E4080;">'+code+'</span>'
      +'<span style="font-size:11px;color:#333;">'+n+' camere</span>'
      +'<span style="font-size:11px;color:#1a5c2e;font-weight:700;">· '+gg+' '+(gg===1?'giorno':'giorni')+'</span>'
      +'<span style="font-size:11px;color:#1E4080;font-weight:700;">· '+media+'/gg</span></div>';
    }).join(''):'<div style="font-size:11px;color:#888;">Nessuna assegnazione registrata.</div>';
  }

  const areaMatrixHTML=tab==='aree'?hkpNRenderAreaMatrixHTML(p,tab,rows,days,'print'):'';

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${hotel} — HKP ${tabLabels[tab]} ${monName} ${y}</title>
<style>
@page{size:A4 landscape;margin:8mm}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;margin:0;padding:0}
h2{margin:0 0 4px;font-size:15px;color:#1E4080}
h3{margin:0 0 8px;font-size:13px;color:#1E4080}
p{margin:0 0 10px;font-size:11px;color:#555}
table{border-collapse:collapse;width:100%}
.staff-section{margin-top:14px;page-break-inside:avoid;}
@media print{button{display:none}}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
  <div><h2>${hotel} — ${tabLabels[tab]}</h2><p>${monName} ${y}</p></div>
  <button onclick="window.print()" style="padding:6px 14px;background:#1E4080;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">🖨 Stampa</button>
</div>
<table><thead>${th}</thead><tbody>${tbody}</tbody></table>
<div class="staff-section">
  <h3>${staffTitle} — ${monName} ${y}</h3>
  <div>${staffChips}</div>
</div>
${areaMatrixHTML}
</body></html>`;

  const w=window.open('','_blank','width=1100,height=750');
  if(w){w.document.write(html);w.document.close();w.onload=()=>w.print();}
}
function hkpNTab(p,tab){HKP_NTAB[p]=tab;hkpNRender(p);}
function hkpNRender(p){
  const viewId='view-hkp'+(p==='sa'?'sheet':'sheetar');
  const [y,m]=hkpNCurMon(p).split('-').map(Number);
  const today=new Date();const isCurMon=today.getFullYear()===y&&today.getMonth()+1===m;
  const monEl=document.getElementById('hkpN-'+p+'-month');
  if(monEl){
    monEl.innerHTML='<span style="font-weight:700;font-size:var(--fs-sm);color:var(--text);">'+HKP_MON_NAMES[m-1]+'</span> <span style="color:var(--text-dim);font-size:var(--fs-xs);">'+y+'</span>'+(isCurMon?' <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);vertical-align:middle;margin-left:4px;" title="Mese corrente"></span>':'');
  }
  const tab=HKP_NTAB[p];
  document.querySelectorAll('#'+viewId+' .hkpN-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  if(tab==='fondi')hkpNRenderFondi(p);else hkpNRenderGrid(p,tab);
  hkpNSyncFromCloud(p);
}
// hkpNGetData legge solo dalla cache locale/localStorage: su un dispositivo diverso da quello
// che ha salvato i dati (kvSet in hkpNSave) non arrivano mai senza questo fetch esplicito da KV.
// Non ri-renderizza MAI se l'utente ha una cella selezionata o in modifica in quel momento,
// per evitare di invalidare i riferimenti di selezione a metà interazione (bug corretto in precedenza).
function _hkpNUserBusy(p){
  const el=document.getElementById('hkpN-'+p+'-body');
  if(!el)return false;
  const active=document.activeElement;
  if(active&&el.contains(active)&&active.tagName==='INPUT')return true;
  if(_hkpNsel&&_hkpNsel.cells&&_hkpNsel.cells.size)return true;
  if(_hkpNsel&&_hkpNsel.drag)return true;
  return false;
}
async function hkpNSyncFromCloud(p){
  try{
    if(_hkpNUserBusy(p))return;
    const sk=hkpNStorKey(p);
    const res=await fetch(PROXY+'/kv/get?key='+encodeURIComponent(sk),{cache:'no-store'});
    const json=await res.json();
    if(!json.value)return;
    if(json.value===localStorage.getItem(sk))return;
    if(_hkpNUserBusy(p))return; // ricontrolla: l'utente potrebbe aver iniziato a interagire nel frattempo
    localStorage.setItem(sk,json.value);
    _hkpNdata[hkpNCacheKey(p)]=JSON.parse(json.value);
    if(HKP_NTAB[p]!=='fondi')hkpNRenderGrid(p,HKP_NTAB[p]);
  }catch(e){}
}
// Card "Riepilogo cameriere" (camere assegnate nel mese) — estratta da hkpNRenderGrid
// per essere riusata anche nella card Housekeeping di Overview, stessa fonte dati
// (Operativa Housekeeping) e stesso mese attualmente selezionato lì.
// Stato aperto/chiuso delle card "Riepilogo mensile" in Overview — persiste tra un
// re-render e l'altro della card Housekeeping (cambio giorno ecc.), chiuso di default.
let _hkMonthlyOpen={sa:false,bh:false};
function hkMonthlyToggle(key){
  _hkMonthlyOpen[key]=!_hkMonthlyOpen[key];
  const body=document.getElementById('hk-monthly-'+key);
  const chev=document.getElementById('hk-monthly-chev-'+key);
  if(body)body.style.display=_hkMonthlyOpen[key]?'block':'none';
  if(chev)chev.style.transform=_hkMonthlyOpen[key]?'rotate(180deg)':'';
}
function hkpMonthlyCameriereHtml(p,roomFilter,presenceLabel,capacity){
  presenceLabel=presenceLabel||'presenza';
  const tab='camere';
  const conf=HKP_ROOMS[p][tab];
  const [yr,mo]=hkpNCurMon(p).split('-').map(Number);
  const daysInMonth=new Date(yr,mo,0).getDate();
  const days=[];for(let d=1;d<=daysInMonth;d++)days.push(d);
  // L'array rows include SEMPRE tutte le camere nell'ordine originale — gli indici (ri)
  // corrispondono a come sono salvate le celle in memoria, non si può filtrare l'array
  // prima altrimenti si rompe il lookup hkpNGetCell(p,tab,ri,d). Il filtro si applica
  // solo in fase di conteggio, riga per riga.
  const rows=[];
  conf.forEach(grp=>grp.list.forEach((name,idx)=>rows.push({name,grp:grp.g,isFirst:idx===0,grpSize:grp.list.length})));
  const hwCounts={},hwDays={};
  let lastDayWithData=0,libCount=0,occCount=0;
  rows.forEach((row,ri)=>{
    if(roomFilter&&!roomFilter(row))return;
    days.forEach(d=>{
      const v=hkpNGetCell(p,tab,ri,d);
      if(!v)return;
      if(d>lastDayWithData)lastDayWithData=d;
      const tokens=v.split('/').map(k=>k.trim()).filter(Boolean);
      // Camere libere ("LIB") = non occupate quel giorno — usate per stimare il
      // coefficiente di riempimento (solo se è indicata una capacità camere).
      if(tokens.some(t=>t.toUpperCase()==='LIB'))libCount++;else occCount++;
      tokens.forEach(t=>{
        if(!HKP_SYM[t]){hwCounts[t]=(hwCounts[t]||0)+1;(hwDays[t]=hwDays[t]||new Set()).add(d);}
      });
    });
  });
  const sortedHw=Object.entries(hwCounts).sort((a,b)=>b[1]-a[1]);
  if(!sortedHw.length)return'';
  const MON_IT_FULL=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  let occHtml='';
  if(capacity){
    const totRoomDays=libCount+occCount;
    const occPct=totRoomDays?Math.round(occCount/totRoomDays*100):null;
    if(occPct!==null)occHtml=` · <strong style="color:var(--accent);font-weight:700;">${occPct}%</strong> <span style="color:var(--text-dim);">riempimento (su ${capacity} camere)</span>`;
  }
  let h=`<div style="font-size:13px;color:var(--text-muted);margin-bottom:10px;">Periodo: <strong style="color:var(--text);font-weight:700;">1 – ${lastDayWithData} ${MON_IT_FULL[mo-1]} ${yr}</strong>${occHtml}</div>`;
  h+='<div style="display:flex;flex-wrap:wrap;gap:8px;">';
  sortedHw.forEach(([init,cnt])=>{
    const fullName=HKP_HW_NAMES[init.toUpperCase()]||init;
    const gg=hwDays[init]?hwDays[init].size:0;
    const media=gg?(cnt/gg).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1}):'—';
    h+='<div style="background:#fff;border-radius:8px;padding:10px 14px;border:1px solid var(--border-light,#dde2ea);display:flex;align-items:center;gap:10px;">';
    h+='<span style="display:inline-flex;width:34px;height:34px;border-radius:50%;background:var(--accent-bg,#e8f0f8);color:var(--accent,#1c3a5e);font-size:11px;font-weight:500;align-items:center;justify-content:center;">'+init.substring(0,3)+'</span>';
    h+='<div><div style="font-size:21px;font-weight:400;line-height:1.1;color:var(--text,#0c1f33);">'+cnt+'</div><div style="font-size:11.5px;color:var(--text-dim,#888880);margin-top:1px;">'+fullName+'</div><div style="font-size:10.5px;color:var(--green,#2e7d32);font-weight:500;margin-top:1px;">'+gg+' '+(gg===1?'giorno':'giorni')+' '+presenceLabel+'</div><div style="font-size:10.5px;color:var(--accent,#1c3a5e);font-weight:500;margin-top:1px;">'+media+' camere/giorno</div></div></div>';
  });
  h+='</div>';
  return h;
}
function hkpNRenderGrid(p,tab){
  const el=document.getElementById('hkpN-'+p+'-body');
  if(!el)return;
  const conf=HKP_ROOMS[p][tab];
  const [yr,mo]=hkpNCurMon(p).split('-').map(Number);
  const daysInMonth=new Date(yr,mo,0).getDate();
  const days=[];for(let d=1;d<=daysInMonth;d++)days.push(d);
  const MON_IT=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const monLabel=MON_IT[mo-1]+' '+yr;
  const rows=[];
  conf.forEach(grp=>grp.list.forEach((name,idx)=>rows.push({name,grp:grp.g,isFirst:idx===0,grpSize:grp.list.length})));
  const dayTotals={};const rowTotals={};const hwCounts={};const symCounts={};const hwDays={};
  rows.forEach((row,ri)=>{
    days.forEach(d=>{
      const v=hkpNGetCell(p,tab,ri,d);
      if(!v)return;
      let hasStaff=false;
      v.split('/').forEach(k=>{
        const t=k.trim();if(!t)return;
        if(HKP_SYM[t]){symCounts[t]=(symCounts[t]||0)+1;}
        else{hwCounts[t]=(hwCounts[t]||0)+1;hasStaff=true;(hwDays[t]=hwDays[t]||new Set()).add(d);}
      });
      // Il totale camere conta solo le assegnazioni a una cameriera, non ripasso/non disturbare/camera libera
      if(hasStaff){dayTotals[d]=(dayTotals[d]||0)+1;rowTotals[ri]=(rowTotals[ri]||0)+1;}
    });
  });
  const maxCam=Math.max(...rows.map(r=>r.name.length));
  const RW=Math.max(70,maxCam*9+20);
  const maxGrp=Math.max(...conf.map(g=>Math.max(...g.g.split('\n').map(l=>l.length))));
  const GW=Math.max(70,Math.min(110,maxGrp*7+14));
  const DW=46;const TOTW=46;
  const RH=36; // altezza riga fissa per allineamento tra le due tabelle
  const B='border:1px solid var(--border-light,#dde2ea);';
  const today=new Date();

  // === TABELLA SINISTRA: Gruppo (rowspan) + Camera ===
  // height:RH su ogni <tr> impedisce al rowspan di alterare le altezze → allineamento garantito
  let L='<table style="border-collapse:collapse;table-layout:fixed;">';
  L+='<colgroup><col style="width:'+GW+'px"><col style="width:'+RW+'px"></colgroup>';
  L+='<thead><tr style="height:'+RH+'px;">';
  L+='<th style="background:var(--accent-bg,#e8f0f8);color:var(--accent,#1c3a5e);'+B+'padding:6px 4px;font-size:11px;font-weight:600;text-align:center;text-transform:uppercase;letter-spacing:.04em;height:'+RH+'px;">Gruppo</th>';
  L+='<th style="background:var(--surface,#f8f9fb);color:var(--text-dim,#888880);'+B+'padding:6px 10px;font-size:12px;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;height:'+RH+'px;"></th>';
  L+='</tr></thead><tbody>';
  rows.forEach((row,ri)=>{
    const grpBorder=(row.isFirst&&ri>0)?'border-top:2px solid var(--border,#cdd4de);':'';
    L+='<tr style="height:'+RH+'px;'+grpBorder+'">';
    if(row.isFirst){
      const grpBorderBlue=(ri>0)?'border-top:2px solid #fff;':'';
      L+='<td rowspan="'+row.grpSize+'" style="background:var(--accent-bg,#e8f0f8);color:var(--accent,#1c3a5e);'+B
        +'padding:4px 5px;font-size:12px;font-weight:500;text-align:center;vertical-align:middle;'
        +'overflow:hidden;line-height:1.5;max-width:'+GW+'px;'+grpBorderBlue+'">'+row.grp.replace(/\n/g,'<br>')+'</td>';
    }
    L+='<td style="background:#fff;'+B+'padding:0 10px;font-size:14px;font-weight:400;color:var(--text,#0c1f33);white-space:nowrap;height:'+RH+'px;vertical-align:middle;overflow:hidden;'+grpBorder+'">'+row.name+'</td>';
    L+='</tr>';
  });
  L+='<tr style="height:'+RH+'px;"><td style="background:var(--surface2,#e8ecf1);'+B+'height:'+RH+'px;"></td>';
  L+='<td style="background:var(--surface2,#e8ecf1);'+B+'padding:0 10px;font-size:12.5px;font-weight:600;color:var(--text-muted,#4a5568);height:'+RH+'px;vertical-align:middle;white-space:nowrap;">Totali</td></tr>';
  L+='</tbody></table>';

  // === Calcolo larghezze dinamiche: misura contenuto reale per ogni colonna ===
  const CW=10; // px per carattere stimati a font-size 15px
  const colW={};
  days.forEach(d=>{
    let mx=1;
    rows.forEach((_,ri)=>{const v=hkpNGetCell(p,tab,ri,d);if(v.length>mx)mx=v.length;});
    colW[d]=Math.max(38,mx*CW+16);
  });

  // === TABELLA DESTRA: solo giorni (colonna Tot rimossa) ===
  let R='<table style="border-collapse:collapse;table-layout:fixed;">';
  R+='<colgroup>';
  days.forEach(d=>R+='<col style="width:'+colW[d]+'px">');
  R+='</colgroup>';
  R+='<thead><tr style="height:'+RH+'px;">';
  days.forEach(d=>{
    const isToday=today.getDate()===d&&today.getMonth()+1===mo&&today.getFullYear()===yr;
    R+='<th style="background:var(--surface,#f8f9fb);'+B+'padding:6px 2px;font-size:12px;font-weight:'+(isToday?'600':'400')+';text-align:center;color:'+(isToday?'var(--accent,#1c3a5e)':'var(--text-dim,#888880)')+';height:'+RH+'px;'+(isToday?'border-bottom:2px solid var(--accent,#1c3a5e);':'')+'">'+d+'</th>';
  });
  R+='</tr></thead><tbody>';
  rows.forEach((row,ri)=>{
    const grpBorder=(row.isFirst&&ri>0)?'border-top:2px solid var(--border,#cdd4de);':'';
    R+='<tr style="height:'+RH+'px;">';
    days.forEach(d=>{
      const v=hkpNGetCell(p,tab,ri,d);
      const isToday=today.getDate()===d&&today.getMonth()+1===mo&&today.getFullYear()===yr;
      const iw=colW[d]-2;
      R+='<td style="'+B+'padding:1px;background:'+(isToday&&!v?'var(--accent-bg,#e8f0f8)':'#fff')+';height:'+RH+'px;overflow:hidden;'+grpBorder+'">'
        +'<input type="text" maxlength="10" value="'+v+'" data-p="'+p+'" data-tab="'+tab+'" data-ri="'+ri+'" data-col="'+d+'" '
        +'oninput="hkpNInput(this)" onblur="hkpNBlur(this)" onfocus="hkpNFocus(this)" onkeydown="hkpNKey(this,event)" '
        +'onmousedown="hkpNDragStart(this,event)" onmouseover="hkpNDragOver(this)" '
        +'style="width:'+iw+'px;height:'+(RH-2)+'px;border:none;background:transparent;text-align:center;font-size:14px;'
        +'font-family:inherit;padding:0 2px;outline:none;color:'+(v?'var(--accent,#1c3a5e)':'var(--text,#0c1f33)')+';font-weight:'+(v?'500':'400')+';'
        +'cursor:default;display:block;caret-color:transparent;box-sizing:border-box;"/></td>';
    });
    R+='</tr>';
  });
  R+='<tr style="height:'+RH+'px;">';
  days.forEach(d=>R+='<td style="'+B+'text-align:center;background:var(--surface2,#e8ecf1);color:var(--text-muted,#4a5568);font-size:12.5px;font-weight:600;height:'+RH+'px;vertical-align:middle;padding:0 2px;">'+(dayTotals[d]||'')+'</td>');
  R+='</tr></tbody></table>';

  // Wrapper: sinistra fissa + destra scrollabile
  const symBtnStyle='display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border:1px solid #d0d3db;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;color:#333;font-weight:600;';
  const cancelBtnStyle=symBtnStyle+'background:#fef2f2;border-color:#fca5a5;color:#b91c1c;';
  const imgStyle='height:28px;width:auto;mix-blend-mode:multiply;';
  let h='<div style="font-size:17px;font-weight:700;color:#1a1a1a;padding:0 0 8px;letter-spacing:.01em;">'+monLabel+'</div>';
  h+='<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">';
  if(tab==='camere'){
    h+='<button onclick="hkpNInsertSymbol(\''+p+'\',\'RP\')" style="'+symBtnStyle+'"><img src="img/hkp-ripasso.'+HKP_SYM_EXT+'" style="'+imgStyle+'"> Ripasso</button>';
    h+='<button onclick="hkpNInsertSymbol(\''+p+'\',\'ND\')" style="'+symBtnStyle+'"><img src="img/hkp-nd.'+HKP_SYM_EXT+'" style="'+imgStyle+'"> Non disturbare</button>';
    h+='<button onclick="hkpNInsertSymbol(\''+p+'\',\'LIB\')" style="'+symBtnStyle+'"><img src="img/open-sign.'+HKP_SYM_EXT+'" style="'+imgStyle+'"> Camera libera</button>';
  }else if(tab==='aree'){
    h+='<button onclick="hkpNInsertSymbol(\''+p+'\',\'NE\')" style="'+symBtnStyle+'"><img src="img/non-eseguito.'+HKP_SYM_EXT+'" style="'+imgStyle+'"> Non eseguito</button>';
  }
  h+='<button onclick="hkpNInsertSymbol(\''+p+'\',\'\')" style="'+cancelBtnStyle+'">✕ Cancella</button>';
  h+='</div>';
  h+='<div style="display:flex;border:1px solid var(--border-light,#dde2ea);border-radius:8px;overflow:hidden;background:#fff;">';
  h+='<div data-hkpnl="'+p+'" style="flex-shrink:0;border-right:2px solid var(--accent-bg,#e8f0f8);overflow:hidden;">'+L+'</div>';
  h+='<div data-hkpnr="'+p+'" style="overflow-x:auto;flex:1;">'+R+'</div>';
  h+='</div>';
  if(tab==='aree'){
    // Aree comuni: conteggio "chi fa cosa e quante volte", non il totale grezzo — escluse
    // le aree che non richiedono un controllo puntuale (corridoi, terrazzi, aree esterne)
    const staffAreaCounts={};
    rows.forEach((row,ri)=>{
      if(HKP_AREE_ESCLUSE.has(row.name))return;
      days.forEach(d=>{
        const v=hkpNGetCell(p,tab,ri,d);
        if(!v)return;
        v.split('/').forEach(k=>{
          const t=k.trim();
          if(!t||HKP_SYM[t])return;
          staffAreaCounts[t]=staffAreaCounts[t]||{};
          staffAreaCounts[t][row.name]=(staffAreaCounts[t][row.name]||0)+1;
        });
      });
    });
    // Giorni di presenza SEMPRE dal tab Camere — non farlo nel tab Aree significa solo
    // che quel giorno non ha pulito aree comuni, non che non fosse in servizio
    const camPresence=hkpNCamerePresenceDays(p,days);
    // Metrica principale: interventi per giorno di presenza — è l'unico numero
    // confrontabile equamente tra chi è più o meno presente nel mese
    const staffStats=Object.keys(staffAreaCounts).map(code=>{
      const areas=staffAreaCounts[code];
      const tot=Object.values(areas).reduce((s,n)=>s+n,0);
      const gg=camPresence[code]?camPresence[code].size:0;
      return{code,areas,tot,gg,media:gg?tot/gg:0};
    }).sort((a,b)=>b.tot-a.tot);
    if(staffStats.length){
      // Confronto semplice, leggibile da chiunque: due barre affiancate sulla stessa scala
      // (% presenze sul totale del gruppo vs % lavoro fatto sul totale del gruppo) —
      // se le due barre sono simili è bilanciato, se una è molto più lunga dell'altra no.
      const totGGall=staffStats.reduce((s,x)=>s+x.gg,0),totTOTall=staffStats.reduce((s,x)=>s+x.tot,0);
      h+='<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;">';
      staffStats.forEach(({code,areas,tot,gg})=>{
        const fullName=HKP_HW_NAMES[code.toUpperCase()]||code;
        const detail=Object.entries(areas).sort((a,b)=>b[1]-a[1]).map(([area,n])=>'<div>'+area+' ×'+n+'</div>').join('');
        const pctPresenza=totGGall?Math.round(gg/totGGall*100):0;
        const pctLavoro=totTOTall?Math.round(tot/totTOTall*100):0;
        const diff=pctLavoro-pctPresenza;
        let balColor='#888',balLabel='Nessun confronto possibile';
        if(gg>0){
          if(diff>=10){balColor='#c62828';balLabel='Fa più del previsto';}
          else if(diff<=-10){balColor='#a05a00';balLabel='Fa meno del previsto';}
          else{balColor='#2e7d32';balLabel='Nella norma';}
        }
        h+='<div style="background:#fff;border-radius:8px;padding:10px 14px;border:1px solid var(--border-light,#dde2ea);min-width:260px;flex:1;">';
        h+='<div style="display:flex;align-items:center;gap:10px;">';
        h+='<span style="display:inline-flex;width:34px;height:34px;border-radius:50%;background:var(--accent-bg,#e8f0f8);color:var(--accent,#1c3a5e);font-size:11px;font-weight:500;align-items:center;justify-content:center;flex-shrink:0;">'+code.substring(0,3)+'</span>';
        h+='<div><div style="font-size:21px;font-weight:400;line-height:1.1;color:var(--text,#0c1f33);">'+tot+' <span style="font-size:10.5px;font-weight:400;color:var(--text-dim,#888880);">interventi/mese</span></div>';
        h+='<div style="font-size:11.5px;color:var(--text-dim,#888880);">'+fullName+' · '+gg+' '+(gg===1?'giorno':'giorni')+' presenza</div></div>';
        h+='</div>';
        h+='<div style="margin-top:8px;">';
        h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;"><span style="font-size:10px;color:var(--text-dim,#888880);width:64px;flex-shrink:0;">Presenze</span><div style="flex:1;height:8px;border-radius:4px;background:var(--surface2,#e8ecf1);overflow:hidden;"><div style="width:'+pctPresenza+'%;height:100%;background:var(--border,#cdd4de);"></div></div><span style="font-size:10px;color:var(--text-dim,#888880);width:32px;text-align:right;">'+pctPresenza+'%</span></div>';
        h+='<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:10px;color:var(--text-dim,#888880);width:64px;flex-shrink:0;">Lavoro fatto</span><div style="flex:1;height:8px;border-radius:4px;background:var(--surface2,#e8ecf1);overflow:hidden;"><div style="width:'+pctLavoro+'%;height:100%;background:'+balColor+';"></div></div><span style="font-size:10px;color:var(--text-dim,#888880);width:32px;text-align:right;">'+pctLavoro+'%</span></div>';
        h+='</div>';
        h+='<div style="font-size:10.5px;font-weight:500;color:'+balColor+';margin-top:6px;">'+balLabel+'</div>';
        h+='<div style="font-size:12.5px;color:var(--text-muted,#4a5568);margin-top:5px;">'+detail+'</div>';
        h+='</div>';
      });
      h+='</div>';
    }
    h+=hkpNRenderAreaMatrixHTML(p,tab,rows,days,'screen');
  } else {
    // Riepilogo cameriere: card camere assegnate (senza colori, nome esteso) separate da card simboli (RP/ND/LIB)
    const cardsHtml=hkpMonthlyCameriereHtml(p);
    if(cardsHtml)h+='<div style="margin-top:12px;">'+cardsHtml+'</div>';
  }
  const sortedSym=Object.entries(symCounts).sort((a,b)=>b[1]-a[1]);
  if(sortedSym.length){
    h+='<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;">';
    sortedSym.forEach(([code,cnt])=>{
      const symFile=HKP_SYM[code];
      const labels={RP:'Ripasso',ND:'Non disturbare',LIB:'Camera libera',NE:'Non eseguito'};
      h+='<div style="background:#fff;border-radius:8px;padding:10px 14px;border:1px solid var(--border-light,#dde2ea);display:flex;align-items:center;gap:10px;">';
      h+='<img src="img/'+symFile+'.'+HKP_SYM_EXT+'" style="width:32px;height:32px;object-fit:contain;mix-blend-mode:multiply;">';
      h+='<div><div style="font-size:21px;font-weight:400;line-height:1.1;color:var(--text,#0c1f33);">'+cnt+'</div><div style="font-size:11.5px;color:var(--text-dim,#888880);margin-top:1px;">'+(labels[code]||code)+'</div></div></div>';
    });
    h+='</div>';
  }
  el.innerHTML=h;
  // Sincronizza altezze righe dopo il render (rowspan nella tabella sinistra può sfasarle)
  requestAnimationFrame(()=>hkpNSyncRowHeights(p));
  setTimeout(()=>hkpNUpdateAllSymbols(p),60);
}
function _hkpNUpdateCellDisplay(input){
  const td=input.parentElement;
  if(!td)return;
  const v=(input.value||'').trim().toUpperCase();
  const sym=HKP_SYM[v];
  // Rimuovi overlay precedente
  const old=td.querySelector('.hkpSymImg');if(old)old.remove();
  if(sym){
    input.style.color='transparent';
    td.style.position='relative';
    const img=document.createElement('img');
    img.className='hkpSymImg';
    img.src='img/'+sym+'.'+HKP_SYM_EXT;
    img.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:82%;height:82%;object-fit:contain;mix-blend-mode:multiply;pointer-events:none;z-index:2;image-rendering:-webkit-optimize-contrast;image-rendering:crisp-edges;';
    td.appendChild(img);
    td.style.background='#fff';
  }else{
    const dual=v.includes('/');
    input.style.color=dual?'var(--accent,#1E4080)':'#1a1a1a';
  }
}
function hkpNUpdateAllSymbols(p){
  const el=document.getElementById('hkpN-'+p+'-body');
  if(!el)return;
  el.querySelectorAll('input[data-p="'+p+'"]').forEach(inp=>_hkpNUpdateCellDisplay(inp));
}
function hkpNInsertSymbol(p,code){
  if(_hkpNsel.cells.size===0)return;
  _hkpNsel.cells.forEach(key=>{
    const [sp,stab,sri,scol]=key.split(':');
    if(sp!==p)return;
    hkpNSetCell(sp,stab,parseInt(sri),scol,code);
    const el=document.querySelector('input[data-p="'+sp+'"][data-tab="'+stab+'"][data-ri="'+sri+'"][data-col="'+scol+'"]');
    if(el){el.value=code;_hkpNUpdateCellDisplay(el);el.parentElement.style.background=code?'#f0f5ff':'#fff';}
  });
  clearTimeout(_hkpNdebounce[p]);
  hkpNSave(p);
  hkpNRender(p);
}
function hkpNSyncRowHeights(p){
  const el=document.getElementById('hkpN-'+p+'-body');
  if(!el)return;
  const lTbody=el.querySelector('[data-hkpnl] tbody');
  const rTbody=el.querySelector('[data-hkpnr] tbody');
  if(!lTbody||!rTbody)return;
  const lRows=lTbody.querySelectorAll('tr');
  const rRows=rTbody.querySelectorAll('tr');
  const n=Math.min(lRows.length,rRows.length);
  for(let i=0;i<n;i++){
    // La tabella destra non ha rowspan → le sue altezze sono la fonte di verità
    const h=rRows[i].getBoundingClientRect().height;
    lRows[i].style.height=h+'px';
  }
}
function hkpNRenderFondi(p){
  const el=document.getElementById('hkpN-'+p+'-body');
  if(!el)return;
  const conf=HKP_ROOMS[p].fondi;
  const tasks=conf.tasks;
  const [yr,mo]=hkpNCurMon(p).split('-').map(Number);
  const monLabel=HKP_MON_NAMES[mo-1]+' '+yr;
  const B='border:1px solid var(--border-light,#dde2ea);';
  const RH=36;const CW=52;const LW=158;
  const allRooms=conf.groups.flatMap(g=>g.rooms);
  const symBtnStyle='display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border:1px solid var(--border,#cdd4de);border-radius:6px;background:#fff;cursor:pointer;font-size:12px;color:var(--text-muted,#4a5568);font-weight:500;';
  const cancelBtnStyle=symBtnStyle+'background:var(--red-bg,#ffebee);border-color:#f3b8b8;color:var(--red,#c62828);';
  // Header mese
  let h='<div style="font-size:15px;font-weight:500;color:var(--text,#0c1f33);padding:0 0 8px;letter-spacing:.01em;">'+monLabel+'</div>';
  // Toolbar asterischi
  h+='<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">';
  ['*','**','***','****','*****'].forEach(a=>h+='<button onclick="hkpNInsertSymbol(\''+p+'\',\''+a+'\')" style="'+symBtnStyle+'">'+a+'</button>');
  h+='<button onclick="hkpNInsertSymbol(\''+p+'\',\'\')" style="'+cancelBtnStyle+'">✕ Cancella</button>';
  h+='</div>';
  h+='<div style="display:flex;flex-direction:column;gap:16px;">';
  conf.groups.forEach(grp=>{
    const rooms=grp.rooms;
    // Calcola totali per colonna
    const colTots=rooms.map(room=>{const gri=allRooms.indexOf(room);return tasks.reduce((s,_,ti)=>s+(hkpNGetCell(p,'fondi',ti,gri)?1:0),0);});
    h+='<div style="border:1px solid var(--border-light,#dde2ea);border-radius:8px;overflow:hidden;background:#fff;">';
    h+='<div style="display:flex;">';
    // Tabella sinistra: etichette task
    h+='<div style="flex-shrink:0;border-right:2px solid var(--accent-bg,#e8f0f8);overflow:hidden;">';
    h+='<table style="border-collapse:collapse;table-layout:fixed;"><colgroup><col style="width:'+LW+'px"></colgroup>';
    h+='<thead><tr style="height:'+RH+'px;"><th style="background:var(--accent-bg,#e8f0f8);color:var(--accent,#1c3a5e);'+B+'padding:6px 10px;font-size:12px;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:.04em;height:'+RH+'px;">'+grp.name+'</th></tr></thead><tbody>';
    tasks.forEach(task=>{
      h+='<tr style="height:'+RH+'px;"><td style="background:var(--accent-bg,#e8f0f8);color:var(--accent,#1c3a5e);'+B+'padding:4px 10px;font-size:11px;font-weight:400;vertical-align:middle;white-space:pre-line;height:'+RH+'px;line-height:1.3;max-width:'+LW+'px;overflow:hidden;">'+task+'</td></tr>';
    });
    h+='<tr style="height:'+RH+'px;"><td style="background:var(--surface2,#e8ecf1);'+B+'padding:0 10px;font-size:12.5px;font-weight:600;color:var(--text-muted,#4a5568);height:'+RH+'px;vertical-align:middle;">Totali</td></tr>';
    h+='</tbody></table></div>';
    // Tabella destra: colonne camere (scrollabile)
    h+='<div style="overflow-x:auto;flex:1;">';
    h+='<table style="border-collapse:collapse;table-layout:fixed;"><colgroup>';
    rooms.forEach(()=>h+='<col style="width:'+CW+'px">');
    h+='</colgroup><thead><tr style="height:'+RH+'px;">';
    rooms.forEach(room=>h+='<th style="background:var(--surface,#f8f9fb);'+B+'padding:6px 2px;font-size:12px;font-weight:400;text-align:center;color:var(--text-dim,#888880);height:'+RH+'px;">'+room+'</th>');
    h+='</tr></thead><tbody>';
    tasks.forEach((_,ti)=>{
      h+='<tr style="height:'+RH+'px;">';
      rooms.forEach(room=>{
        const gri=allRooms.indexOf(room);
        const v=hkpNGetCell(p,'fondi',ti,gri);
        h+='<td style="'+B+'padding:1px;background:#fff;height:'+RH+'px;overflow:hidden;">'
          +'<input type="text" value="'+v+'" data-p="'+p+'" data-tab="fondi" data-ri="'+ti+'" data-col="'+gri+'" data-fondi="1" '
          +'oninput="hkpNInput(this)" onblur="hkpNBlur(this)" onfocus="hkpNFocus(this)" onkeydown="hkpNKey(this,event)" '
          +'onmousedown="hkpNDragStart(this,event)" onmouseover="hkpNDragOver(this)" '
          +'style="width:'+(CW-2)+'px;height:'+(RH-2)+'px;border:none;background:transparent;text-align:center;font-size:14px;'
          +'font-family:inherit;padding:0 2px;outline:none;caret-color:transparent;display:block;color:'+(v?'var(--accent,#1c3a5e)':'var(--text,#0c1f33)')+';font-weight:'+(v?'500':'400')+';cursor:default;box-sizing:border-box;"/></td>';
      });
      h+='</tr>';
    });
    h+='<tr style="height:'+RH+'px;">';
    colTots.forEach(tot=>h+='<td style="'+B+'text-align:center;background:var(--surface2,#e8ecf1);color:var(--text-muted,#4a5568);font-size:12.5px;font-weight:600;height:'+RH+'px;vertical-align:middle;padding:0 2px;">'+(tot||'')+'</td>');
    h+='</tr></tbody></table></div>';
    h+='</div></div>';
  });
  h+='</div>';
  el.innerHTML=h;
}
// --- Drag multi-select helpers ---
function _hkpNSelKey(inp){return inp.dataset.p+':'+inp.dataset.tab+':'+inp.dataset.ri+':'+inp.dataset.col;}
function _hkpNSelAdd(inp){
  const key=_hkpNSelKey(inp);
  if(_hkpNsel.cells.has(key))return;
  _hkpNsel.cells.add(key);
  inp.parentElement.style.background='#eef4ff';
  inp.parentElement.style.boxShadow='inset 0 0 0 2px var(--accent,#1E4080)';
}
function _hkpNClearSel(){
  _hkpNsel.cells.forEach(key=>{
    const [sp,stab,sri,scol]=key.split(':');
    const el=document.querySelector('input[data-p="'+sp+'"][data-tab="'+stab+'"][data-ri="'+sri+'"][data-col="'+scol+'"]');
    if(el){el.parentElement.style.boxShadow='';el.parentElement.style.background=el.value?'#f0f5ff':'#fff';}
  });
  _hkpNsel.cells.clear();
}
function hkpNDragStart(inp,e){
  if(e.button!==0)return;
  e.preventDefault();
  _hkpNsel.drag=true;
  _hkpNClearSel();
  _hkpNSelAdd(inp);
  inp.focus();inp.select();
}
function hkpNDragOver(inp){
  if(!_hkpNsel.drag)return;
  _hkpNSelAdd(inp);
}
// --- Cell interaction ---
function hkpNFocus(input){
  if(!_hkpNsel.drag){
    _hkpNClearSel();
    _hkpNSelAdd(input);
  }
  // Rendi visibile il testo per la modifica (anche se era trasparente per mostrare immagine)
  const v=(input.value||'').trim().toUpperCase();
  input.style.color=v.includes('/')?'var(--accent,#1E4080)':'#1a1a1a';
  input.select();
}
function _hkpNApplyCell(inp,val){
  const v=val.trim();const dual=v.includes('/');
  inp.value=v;
  inp.style.color=dual?'var(--accent,#1E4080)':'#1a1a1a';
  inp.style.fontWeight=v?'700':'400';
  if(!_hkpNsel.cells.has(_hkpNSelKey(inp)))
    inp.parentElement.style.background=v?'#f0f5ff':'#fff';
}
function hkpNInput(input){
  const {p,tab,ri,col}=input.dataset;
  const val=input.value;
  hkpNSetCell(p,tab,parseInt(ri),col,val);
  _hkpNApplyCell(input,val);
  // Propaga a tutte le celle selezionate
  if(_hkpNsel.cells.size>1){
    _hkpNsel.cells.forEach(key=>{
      const [sp,stab,sri,scol]=key.split(':');
      if(sri===ri&&scol===col&&sp===p&&stab===tab)return;
      hkpNSetCell(sp,stab,parseInt(sri),scol,val);
      const el=document.querySelector('input[data-p="'+sp+'"][data-tab="'+stab+'"][data-ri="'+sri+'"][data-col="'+scol+'"]');
      if(el)_hkpNApplyCell(el,val);
    });
  }
  clearTimeout(_hkpNdebounce[p]);
  _hkpNdebounce[p]=setTimeout(()=>{
    // Salva il focus attuale prima del re-render
    const ae=document.activeElement;
    const fRi=ae?.dataset?.ri, fCol=ae?.dataset?.col, fTab=ae?.dataset?.tab, fP=ae?.dataset?.p;
    hkpNSave(p);
    hkpNRender(p);
    // Ripristina focus dopo sync righe (requestAnimationFrame in hkpNRender)
    if(fRi!=null&&fCol!=null){
      setTimeout(()=>{
        const el=document.querySelector('input[data-p="'+fP+'"][data-tab="'+fTab+'"][data-ri="'+fRi+'"][data-col="'+fCol+'"]');
        if(el){el.focus();el.select();}
      },80);
    }
  },2000);
}
function hkpNBlur(input){
  if(!_hkpNsel.cells.has(_hkpNSelKey(input)))
    input.parentElement.style.boxShadow='';
  if(input.type==='text'){
    const up=input.value.trim().toUpperCase();
    if(up!==input.value)input.value=up;
    hkpNSetCell(input.dataset.p,input.dataset.tab,parseInt(input.dataset.ri),input.dataset.col,up);
    input.style.fontWeight=up?'700':'400';
    if(!_hkpNsel.cells.has(_hkpNSelKey(input)))
      input.parentElement.style.background=HKP_SYM[up]?'#fff':up?'#f0f5ff':'#fff';
    _hkpNUpdateCellDisplay(input);
  }
}
function hkpNKey(input,e){
  const ri=parseInt(input.dataset.ri);
  const col=input.dataset.col;
  const tab=input.dataset.tab;
  const table=input.closest('table');
  if(e.key==='Escape'){_hkpNClearSel();return;}
  // Delete/Backspace su selezione multipla: gestito a livello globale in _hkpNGlobalDelete
  // (non qui, per non dipendere dal fatto che questo specifico input abbia ancora il focus)
  if((e.key==='Delete'||e.key==='Backspace')&&_hkpNsel.cells.size>1){
    e.preventDefault();
    return;
  }
  const go=(newRi,newCol)=>{
    const next=table.querySelector('input[data-ri="'+newRi+'"][data-tab="'+tab+'"][data-col="'+newCol+'"]');
    if(next){e.preventDefault();next.focus();next.select();return true;}
    return false;
  };
  if(e.key==='Enter'||e.key==='ArrowDown'){
    if(!go(ri+1,col)){const colN=parseInt(col)+1;go(0,String(colN));}
  }else if(e.key==='ArrowUp'){
    go(ri-1,col);
  }else if(e.key==='ArrowRight'){
    go(ri,String(parseInt(col)+1));
  }else if(e.key==='ArrowLeft'){
    go(ri,String(parseInt(col)-1));
  }else if(e.key==='Tab'){
    e.preventDefault();
    if(e.shiftKey){if(!go(ri,String(parseInt(col)-1)))go(ri-1,col);}
    else{if(!go(ri,String(parseInt(col)+1)))go(ri+1,col);}
  }
}
// Termina drag-select al rilascio del mouse ovunque
document.addEventListener('mouseup',()=>{_hkpNsel.drag=false;});
// Cancellazione selezione multipla a livello globale: non dipende da quale specifico
// input abbia ancora il focus dopo un trascinamento (bug: serviva premere Canc due volte)
document.addEventListener('keydown',e=>{
  if(e.key!=='Delete'&&e.key!=='Backspace')return;
  if(!_hkpNsel||!_hkpNsel.cells||_hkpNsel.cells.size<=1)return;
  const ae=document.activeElement;
  if(ae&&ae.tagName==='INPUT'&&ae.dataset&&ae.dataset.p&&!_hkpNsel.cells.has(_hkpNSelKey(ae)))return;
  e.preventDefault();
  const keysArr=[..._hkpNsel.cells];
  const [p]=keysArr[0].split(':');
  keysArr.forEach(key=>{
    const [sp,stab,sri,scol]=key.split(':');
    hkpNSetCell(sp,stab,parseInt(sri),scol,'');
  });
  _hkpNsel.cells.clear();
  clearTimeout(_hkpNdebounce[p]);
  hkpNSave(p);
  hkpNRender(p);
});
// stub for old references still in syncFromCloud
function hkpSave(p){}
function hkpRestore(){}
let recGroupOpen=false;
function toggleRecGroup(){
  recGroupOpen=!recGroupOpen;
  document.getElementById('recGroupToggle').classList.toggle('open',recGroupOpen);
  document.getElementById('recGroupItems').classList.toggle('open',recGroupOpen);
}
let expGroupOpen=false;
function toggleExpGroup(){
  expGroupOpen=!expGroupOpen;
  document.getElementById('expGroupToggle').classList.toggle('open',expGroupOpen);
  document.getElementById('expGroupItems').classList.toggle('open',expGroupOpen);
}
let bkfGroupOpen=false;
function toggleBkfGroup(){
  bkfGroupOpen=!bkfGroupOpen;
  document.getElementById('bkfGroupToggle').classList.toggle('open',bkfGroupOpen);
  document.getElementById('bkfGroupItems').classList.toggle('open',bkfGroupOpen);
}
function setView(id,navEl){closeMobileSidebar();document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById('view-'+id).classList.add('active');document.getElementById('pageTitle').textContent=pageTitles[id]||id;const bc=document.getElementById('breadcrumb');if(bc)bc.textContent=breadcrumbs[id]||'';const kpis=document.getElementById('topbar-kpis');if(kpis)kpis.style.display=id==='overview'?'flex':'none';if(navEl){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));navEl.classList.add('active');}
  if(id==='bkfsheet'||id==='bkfsheetar'){if(!bkfGroupOpen){bkfGroupOpen=true;document.getElementById('bkfGroupToggle').classList.add('open');document.getElementById('bkfGroupItems').classList.add('open');}}
  if(id.startsWith('recensioni-')&&!id.startsWith('recensioni-exp-')){if(!recGroupOpen){recGroupOpen=true;document.getElementById('recGroupToggle').classList.add('open');document.getElementById('recGroupItems').classList.add('open');}}
  if(id.startsWith('recensioni-exp-')){if(!expGroupOpen){expGroupOpen=true;document.getElementById('expGroupToggle').classList.add('open');document.getElementById('expGroupItems').classList.add('open');}}
  try{localStorage.setItem('qm_last_view',id);}catch(e){}
  if(id==='inventario'){try{invRender();}catch(e){}}
  if(id==='spese'){try{ddtRenderSpese();if(_ddtTab==='spese')ddtRenderList();}catch(e){}}
  if(id==='turni-pref'){try{turniPrefRender();turniPrefMarkAllSeen();}catch(e){}}
  if(id==='controllo-mattino'){try{cmLoad();}catch(e){}}
  if(id==='reception'){try{receptionLoad();}catch(e){}}
  if(id==='resi-biancheria'){try{resiLoad();}catch(e){}}
  if(id==='biancheria'){try{biaLoad();}catch(e){}}
  if(id==='prestay'){try{prestayRender();}catch(e){}}
  // "Turnazione Corrente" mostra lo stesso pannello turno di Overview (stesso renderDay(),
  // .staff-area-mirror) — ririchiamato qui solo per popolare lo specchio se la vista
  // viene aperta prima che Overview l'abbia mai fatto in questa sessione.
  if(id==='turnazione'){try{if(weekData)renderDay(activeDay);}catch(e){}}
  if(id==='registrazione'){try{rcRefreshFromCloud();}catch(e){}}
  document.querySelector('.content').scrollTo({top:0,behavior:'instant'});
  if(id==='overview'&&weekData){
    try{loadWeekData(weekData);}catch(e){}
    try{refreshOverviewForDate(new Date());}catch(e){}
  }
  if(id==='hkpsheet')setTimeout(()=>hkpNRender('sa'),50);
  if(id==='bkfsheet')setTimeout(bkfRenderChart,50);
  if(id==='bkfsheetar')setTimeout(bkfRenderChartAR,50);
  if(id==='miniapp'){setTimeout(miniappRender,50);}
  if(id==='dvr'){setTimeout(dvrRender,50);dvrMarkSeen();dvrBadgeUpdate();}
}
// §§ DVR — SCADENZE SICUREZZA & COMPLIANCE
const DVR_CATS={
  visite:       {label:'💉 Visite Mediche',      nomeLbl:'Nome',              extra:{key:'mansione',  lbl:'Mansione',            ph:'es. Receptionist'},      dataLbl:'Data visita'},
  art37:        {label:'📋 Formazione Art. 37',  nomeLbl:'Nome',              extra:{key:'ruolo',     lbl:'Ruolo / figura',      ph:'es. Dirigente'},          dataLbl:'Data formazione'},
  antincendio:  {label:'🔥 Attestati Antincendio',nomeLbl:'Nome',             extra:{key:'livello',   lbl:'Livello rischio',     ph:'Basso / Medio / Alto'},   dataLbl:'Data attestato'},
  primosoccorso:{label:'🚑 Primo Soccorso',       nomeLbl:'Nome',             extra:{key:'mansione',  lbl:'Mansione',            ph:'es. Receptionist'},       dataLbl:'Data attestato'},
  estintori:    {label:'🧯 Estintori',            nomeLbl:'Posizione / ID',   extra:{key:'tipo',      lbl:'Tipo',                ph:'Polvere / CO₂ / Acqua'}, dataLbl:'Ultima verifica'},
  legionella:   {label:'🦠 Legionella',           nomeLbl:'Punto campion.',   extra:{key:'metodo',    lbl:'Metodo analisi',      ph:'es. Colturale'},          dataLbl:'Data analisi'},
  rspp:         {label:'🛡️ RSPP',                 nomeLbl:'Nome',             extra:{key:'tipo',      lbl:'Tipo nomina',         ph:'Interno / Esterno'},      dataLbl:'Data incarico'},
  rls:          {label:'👷 RLS',                  nomeLbl:'Nome',             extra:{key:'mansione',  lbl:'Mansione',            ph:'es. Receptionist'},       dataLbl:'Data elezione'},
  preposto:     {label:'🔑 Preposto',             nomeLbl:'Nome',             extra:{key:'mansione',  lbl:'Mansione',            ph:'es. Capo Ricevimento'},   dataLbl:'Data nomina'},
  dvrdoc:       {label:'📄 Documento DVR',        nomeLbl:'Versione / Rev.',  extra:{key:'motivo',    lbl:'Motivo revisione',    ph:'es. Modifica organiz.'},  dataLbl:'Data redazione'}
};
const DVR_KEYS=Object.keys(DVR_CATS);
const DVR_SOCS={geriart:'GE.RI.ART SRL',bookingelite:'BOOKING ELITE'};
const DVR_SOC_KEYS=Object.keys(DVR_SOCS);
let DVR_DATA=Object.fromEntries(DVR_SOC_KEYS.map(s=>[s,{...Object.fromEntries(DVR_KEYS.map(k=>[k,[]])),dipendenti:[]}]));
let _dvrSoc='geriart';
let _dvrModalType='visite';let _dvrModalId=null;
let _dvrEmpId=null;
function dvrCountAlerts(){
  const now=new Date();now.setHours(0,0,0,0);
  let count=0;
  DVR_SOC_KEYS.forEach(soc=>{
    DVR_KEYS.forEach(k=>{
      (DVR_DATA[soc]?.[k]||[]).forEach(it=>{
        if(!it.scadenza)return;
        const exp=new Date(it.scadenza);exp.setHours(0,0,0,0);
        if(Math.round((exp-now)/86400000)<=30)count++;
      });
    });
    (DVR_DATA[soc]?.dipendenti||[]).forEach(it=>{
      if(!it.scadenzaContratto)return;
      const exp=new Date(it.scadenzaContratto);exp.setHours(0,0,0,0);
      if(Math.round((exp-now)/86400000)<=30)count++;
    });
  });
  return count;
}
function dvrMarkSeen(){
  try{localStorage.setItem('qm_dvr_seen',String(dvrCountAlerts()));}catch(e){}
}
function dvrBadgeUpdate(){
  const badge=document.getElementById('dvrNavBadge');
  if(!badge)return;
  const count=dvrCountAlerts();
  const seen=parseInt(localStorage.getItem('qm_dvr_seen')||'-1');
  // mostra badge solo se ci sono nuovi alert rispetto all'ultima visita
  const show=count>0&&count>seen;
  badge.textContent=count;
  badge.style.display=show?'inline':'none';
}
function dvrSave(){
  const json=JSON.stringify(DVR_DATA);
  try{localStorage.setItem('qm_dvr',json);}catch(e){}
  kvSet('qm_dvr',json).catch(()=>{});
  dvrBadgeUpdate();
}
// §§ MOBILE SIDEBAR
function toggleMobileSidebar(){
  const sb=document.querySelector('.sidebar');
  const ov=document.getElementById('mobileOverlay');
  const isOpen=sb&&sb.classList.contains('mobile-open');
  if(isOpen){closeMobileSidebar();}else{if(sb)sb.classList.add('mobile-open');if(ov)ov.classList.add('open');}
}
function closeMobileSidebar(){
  const sb=document.querySelector('.sidebar');
  const ov=document.getElementById('mobileOverlay');
  if(sb)sb.classList.remove('mobile-open');
  if(ov)ov.classList.remove('open');
}
function dvrRestore(){
  try{
    const s=localStorage.getItem('qm_dvr');
    if(s){
      const p=JSON.parse(s);
      DVR_SOC_KEYS.forEach(soc=>{
        if(!DVR_DATA[soc])DVR_DATA[soc]={};
        // compat: vecchi dati salvati con chiave 'sa' → migra a 'geriart'
        const src=p[soc]||(soc==='geriart'?p.sa:null)||{};
        DVR_KEYS.forEach(k=>{DVR_DATA[soc][k]=src[k]||[];});
        DVR_DATA[soc].dipendenti=src.dipendenti||[];
      });
    }
  }catch(e){}
}
function dvrSetSoc(soc,btn){
  _dvrSoc=soc;
  _dvrOpenIds=new Set();
  _dvrSectCollapsed=new Set(_DVR_ALL_SECTS());
  document.querySelectorAll('.dvr-soc-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  dvrRender();
}
// ── Compliance check dipendenti ────────────────────────────
function _dvrNameMatch(a,b){
  const wa=a.toLowerCase().trim().split(/\s+/);
  const wb=b.toLowerCase().trim().split(/\s+/);
  return wa.every(w=>wb.includes(w))||wb.every(w=>wa.includes(w));
}
function dvrGetMissing(){
  const dips=(DVR_DATA[_dvrSoc]?.dipendenti)||[];
  const visite=(DVR_DATA[_dvrSoc]?.visite)||[];
  const art37=(DVR_DATA[_dvrSoc]?.art37)||[];
  return dips.filter(d=>!/corduas/i.test(d.nome||'')).map(d=>{
    const inVisite=visite.some(v=>_dvrNameMatch(d.nome||'',v.nome||''));
    const inArt37=art37.some(v=>_dvrNameMatch(d.nome||'',v.nome||''));
    const missing=[];
    if(!inVisite)missing.push('visite');
    if(!inArt37)missing.push('art37');
    return{id:d.id,nome:d.nome,missing};
  }).filter(x=>x.missing.length>0);
}
function dvrRenderWarnings(){
  const box=document.getElementById('dvr-warnings');if(!box)return;
  const missing=dvrGetMissing();
  if(!missing.length){box.innerHTML='';return;}
  const rows=missing.map(x=>{
    const tags=x.missing.map(m=>m==='visite'
      ?'<span style="background:var(--red-bg,#fdecea);color:var(--red);font-size:10px;padding:1px 7px;border-radius:4px;font-weight:600;">💉 Manca visita</span>'
      :'<span style="background:var(--amber-bg);color:var(--amber);font-size:10px;padding:1px 7px;border-radius:4px;font-weight:600;">📋 Manca art.37</span>'
    ).join(' ');
    return`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;${missing.indexOf(x)>0?'border-top:1px solid var(--border-light);':''}">
      <span style="font-size:var(--fs-sm);font-weight:600;flex:1;">${x.nome||'—'}</span>${tags}</div>`;
  }).join('');
  box.innerHTML=`<div style="background:var(--red-bg,#fdecea);border:1px solid var(--red);border-radius:10px;padding:12px 16px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="font-size:15px;">⚠️</span>
      <span style="font-size:var(--fs-sm);font-weight:700;color:var(--red);">${missing.length} dipendent${missing.length===1?'e':'i'} con documentazione incompleta</span>
    </div>
    <div style="padding-left:4px;">${rows}</div>
  </div>`;
}
// ── Lista Dipendenti ─────────────────────────────────────────
let _dvrOpenIds=new Set();
const _DVR_ALL_SECTS=()=>DVR_KEYS.filter(k=>k!=='primosoccorso'&&k!=='rspp').concat(['dipendenti','ps-rspp']);
let _dvrSectCollapsed=new Set(_DVR_ALL_SECTS());
function dvrToggleSection(key){
  if(_dvrSectCollapsed.has(key))_dvrSectCollapsed.delete(key);else _dvrSectCollapsed.add(key);
  _dvrApplyCollapse(key);
}
function dvrToggleEmp(id){
  if(_dvrOpenIds.has(id))_dvrOpenIds.delete(id);else _dvrOpenIds.add(id);
  dvrRenderDipendenti();
}
function dvrRenderDipendenti(){
  const list=document.getElementById('dvr-list-dipendenti');
  if(!list)return;
  const items=(DVR_DATA[_dvrSoc]?.dipendenti)||[];
  if(!items.length){list.innerHTML='<div style="padding:16px;text-align:center;color:var(--text-dim);font-size:var(--fs-sm);">Nessun dipendente inserito</div>';return;}
  const pinRank=n=>{if(/corduas/i.test(n))return 0;if(/presta/i.test(n))return 1;return 2;};
  const isTermine=c=>c&&c!=='Tempo indeterminato';
  const sorted=[...items].sort((a,b)=>{
    const ra=pinRank(a.nome||''),rb=pinRank(b.nome||'');
    if(ra!==rb)return ra-rb;
    if(ra===2){
      const ta=isTermine(a.contratto),tb=isTermine(b.contratto);
      if(ta!==tb)return ta?-1:1;
      if(ta&&tb){
        const sa=a.scadenzaContratto,sb=b.scadenzaContratto;
        if(sa&&sb)return new Date(sa)-new Date(sb);
        if(sa)return -1;
        if(sb)return 1;
      }
    }
    return(a.nome||'').localeCompare(b.nome||'');
  });
  const _missingMap=Object.fromEntries(dvrGetMissing().map(x=>[x.id,x.missing]));
  list.innerHTML=sorted.map((it,i)=>{
    const open=_dvrOpenIds.has(it.id);
    const contratto=it.contratto||'';
    const assunzFmt=it.dataAssunzione?new Date(it.dataAssunzione).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
    const scadContrFmt=it.scadenzaContratto?new Date(it.scadenzaContratto).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
    const _scadMs=it.scadenzaContratto?new Date(it.scadenzaContratto).setHours(0,0,0,0):null;
    const _now=new Date().setHours(0,0,0,0);
    const _daysLeft=_scadMs!==null?Math.ceil((_scadMs-_now)/86400000):null;
    const scadExpired=_daysLeft!==null&&_daysLeft<0;
    const scadSoon=_daysLeft!==null&&_daysLeft>=0&&_daysLeft<=30;
    const scadColor=scadExpired?'var(--red)':scadSoon?'var(--amber)':'var(--text-dim)';
    const scadBg=scadExpired?'var(--red-bg)':scadSoon?'var(--amber-bg)':'var(--surface2)';
    const scadLabel=scadExpired?`⚠️ scad. ${scadContrFmt}`:scadSoon?`⏳ scad. ${scadContrFmt} (${_daysLeft}gg)`:`scad. ${scadContrFmt}`;
    const rowBorder=scadExpired?'border-left:3px solid var(--red);padding-left:11px;':scadSoon?'border-left:3px solid var(--amber);padding-left:11px;':'';
    const _badgeStyle=(c=>{
      if(/indeterminato/i.test(c))return'background:#e6f4ec;color:var(--green)';
      if(/determinato/i.test(c))return'background:var(--amber-bg);color:var(--amber)';
      if(/tirocinio/i.test(c))return'background:#f3eeff;color:#7c3aed';
      if(/apprendistato/i.test(c))return'background:#fff0e6;color:#c2440c';
      return'background:var(--accent-bg,#e8eef8);color:var(--accent)';
    })(contratto);
    const badge=contratto?`<span style="font-size:10px;padding:1px 7px;border-radius:5px;font-weight:500;${_badgeStyle};">${contratto}</span>`:'';
    const needsScad=['Tempo determinato','Tempo determinato part-time','Part-time','Tirocinio','Apprendistato'].includes(contratto);
    const datesLine=needsScad
      ?[assunzFmt?`dal ${assunzFmt}`:'',scadContrFmt?`<span style="color:${scadColor};font-weight:${scadSoon||scadExpired?'600':'400'};">${scadLabel}</span>`:''].filter(Boolean).join(' &nbsp;→&nbsp; ')
      :(assunzFmt?`dal ${assunzFmt}`:'');
    // riga collassata: solo nome + badge + chevron
    const chevron=`<span style="font-size:11px;color:var(--text-dim);transition:transform .2s;display:inline-block;transform:rotate(${open?'90':'0'}deg);">›</span>`;
    // alert scadenza visibile anche da collassato
    const alertBadge=(scadExpired||scadSoon)?`<span style="font-size:10px;padding:1px 6px;border-radius:5px;background:${scadBg};color:${scadColor};font-weight:600;">${scadExpired?'⚠️ scaduto':(`⏳ ${_daysLeft}gg`)}</span>`:'';
    // badge compliance mancante
    const _mis=_missingMap[it.id]||[];
    const missBadges=_mis.map(m=>m==='visite'
      ?'<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:var(--red-bg,#fdecea);color:var(--red);font-weight:600;">💉</span>'
      :'<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:var(--amber-bg);color:var(--amber);font-weight:600;">📋</span>'
    ).join('');
    const detailHtml=open?`<div style="padding:8px 14px 10px;border-top:1px solid var(--border-light);background:var(--surface);">
        ${it.mansione?`<div style="font-size:var(--fs-xs);color:var(--text-dim);margin-bottom:4px;">📋 ${it.mansione}</div>`:''}
        ${datesLine?`<div style="font-size:var(--fs-xs);color:var(--text-dim);margin-bottom:4px;">📅 ${datesLine}</div>`:''}
        ${it.note?`<div style="font-size:var(--fs-xs);color:var(--text-muted);margin-bottom:6px;white-space:pre-line;">📝 ${it.note}</div>`:''}
        <div style="display:flex;gap:6px;margin-top:4px;">
          <button onclick="dvrEmpOpenModal('${it.id}')" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;">✏️ Modifica</button>
          <button onclick="dvrEmpDelete('${it.id}')" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;color:var(--red);">🗑 Elimina</button>
        </div>
      </div>`:'';
    const scadInline=(needsScad&&scadContrFmt)?`<div style="font-size:11px;color:${scadColor};font-weight:${scadSoon||scadExpired?'600':'400'};margin-top:1px;">${scadLabel}</div>`:'';
    return`<div style="${i>0?'border-top:1px solid var(--border-light);':''}${rowBorder}">
      <div onclick="dvrToggleEmp('${it.id}')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;user-select:none;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:var(--fs-sm);font-weight:600;">${it.nome||'—'}</span>${badge}${alertBadge}${missBadges}
          </div>
          ${scadInline}
        </div>
        ${chevron}
      </div>
      ${detailHtml}
    </div>`;
  }).join('');
  if(_dvrSectCollapsed.has('dipendenti')){list.style.display='none';}else{list.style.display='';}
}
function dvrEmpOpenModal(id){
  _dvrEmpId=id||null;
  const it=id?(DVR_DATA[_dvrSoc]?.dipendenti||[]).find(x=>x.id===id):null;
  const modal=document.getElementById('dvrModal');
  document.getElementById('dvrModalTitle').textContent='👤 Dipendente'+(id?' — Modifica':' — Aggiungi');
  const inp='width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--fs-sm);background:var(--bg);color:var(--text);';
  const lbl='font-size:var(--fs-xs);color:var(--text-dim);display:block;margin-bottom:4px;';
  const contrTypes=['Tempo indeterminato','Tempo determinato','Tempo determinato part-time','Part-time','Tirocinio','Apprendistato'];
  const _contrHasScad=v=>['Tempo determinato','Tempo determinato part-time','Part-time','Tirocinio','Apprendistato'].includes(v);
  const hasDet=_contrHasScad(it?.contratto);
  document.getElementById('dvrModalBody').innerHTML=`
    <input type="hidden" id="dvr-f-empmode" value="1">
    <label style="${lbl}">Nome e Cognome</label>
    <input id="dvr-f-nome" value="${it?.nome||''}" placeholder="Nome e Cognome" style="${inp}margin-bottom:12px;">
    <label style="${lbl}">Mansione / Ruolo</label>
    <input id="dvr-f-extra" value="${it?.mansione||''}" placeholder="es. Receptionist, Cameriere…" style="${inp}margin-bottom:12px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
      <div>
        <label style="${lbl}">Tipo contratto</label>
        <select id="dvr-f-contratto" style="${inp}" onchange="dvrToggleScadContr(this.value)">
          <option value="">—</option>
          ${contrTypes.map(c=>`<option value="${c}"${it?.contratto===c?' selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="${lbl}">Data assunzione</label>
        <input type="date" id="dvr-f-data" value="${it?.dataAssunzione||''}" style="${inp}">
      </div>
    </div>
    <div id="dvr-scad-contr-wrap" style="margin-bottom:12px;${hasDet?'':'display:none;'}">
      <label style="${lbl}">⚠️ Scadenza contratto</label>
      <input type="date" id="dvr-f-scad-contr" value="${it?.scadenzaContratto||''}" style="${inp}">
    </div>
    <label style="${lbl}">Note</label>
    <textarea id="dvr-f-note" rows="2" placeholder="Note aggiuntive…" style="${inp}resize:vertical;">${it?.note||''}</textarea>`;
  modal.style.display='flex';
  setTimeout(()=>document.getElementById('dvr-f-nome').focus(),50);
}
function dvrToggleScadContr(val){
  const w=document.getElementById('dvr-scad-contr-wrap');
  const show=['Tempo determinato','Tempo determinato part-time','Part-time','Tirocinio','Apprendistato'].includes(val);
  if(w)w.style.display=show?'':'none';
}
async function dvrEmpDelete(id){
  if(!await cqConferma('Eliminare questo dipendente?','Verranno persi anche i documenti e le scadenze collegate.',{ok:'Elimina'}))return;
  DVR_DATA[_dvrSoc].dipendenti=(DVR_DATA[_dvrSoc].dipendenti||[]).filter(x=>x.id!==id);
  dvrSave();dvrRenderDipendenti();
}
function dvrStatus(scadenza){
  if(!scadenza)return{color:'var(--text-dim)',days:null};
  const today=new Date();today.setHours(0,0,0,0);
  const exp=new Date(scadenza);exp.setHours(0,0,0,0);
  const days=Math.round((exp-today)/(1000*60*60*24));
  if(days<0)return{color:'var(--red)',days};
  if(days<=30)return{color:'var(--amber)',days};
  return{color:'var(--green)',days};
}
function dvrRenderPanel(type){
  const cat=DVR_CATS[type];
  const list=document.getElementById('dvr-list-'+type);
  if(!list)return;
  const items=(DVR_DATA[_dvrSoc]||{})[type]||[];
  if(!items.length){list.innerHTML='<div style="padding:16px;text-align:center;color:var(--text-dim);font-size:var(--fs-sm);">Nessuna voce inserita</div>';return;}
  const sorted=[...items].sort((a,b)=>new Date(a.scadenza||'9999')-new Date(b.scadenza||'9999'));
  list.innerHTML=sorted.map((it,i)=>{
    const st=dvrStatus(it.scadenza);
    const daysLbl=st.days!==null?(st.days<0?`${Math.abs(st.days)}gg fa`:`tra ${st.days}gg`):'';
    const scadFmt=it.scadenza?new Date(it.scadenza).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
    const extraVal=it[cat.extra.key]?`<span style="color:var(--text-dim);font-size:var(--fs-xxs);">${it[cat.extra.key]}</span>`:'';
    return`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;${i>0?'border-top:1px solid var(--border-light);':''}">
      <div style="width:8px;height:8px;border-radius:50%;background:${st.color};flex-shrink:0;margin-top:1px;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--fs-sm);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.nome||'—'}</div>
        ${extraVal}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:var(--fs-xs);font-weight:600;color:${st.color};">${scadFmt}</div>
        <div style="font-size:var(--fs-xxs);color:var(--text-dim);">${daysLbl}</div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button onclick="dvrOpenModal('${type}','${it.id}')" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;">✏️</button>
        <button onclick="dvrDelete('${type}','${it.id}')" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;">🗑</button>
      </div>
    </div>`;
  }).join('');
  if(_dvrSectCollapsed.has(type)){list.style.display='none';}else{list.style.display='';}
}
function _dvrApplyCollapse(key){
  const collapsed=_dvrSectCollapsed.has(key);
  const el=document.getElementById('dvr-combined-'+key)||document.getElementById('dvr-list-'+key);
  const chev=document.getElementById('dvr-chev-'+key);
  if(el)el.style.display=collapsed?'none':'';
  if(chev)chev.style.transform=collapsed?'rotate(0deg)':'rotate(90deg)';
}
function dvrRender(){
  DVR_KEYS.forEach(dvrRenderPanel);
  dvrRenderDipendenti();
  dvrRenderWarnings();
  _DVR_ALL_SECTS().forEach(_dvrApplyCollapse);
}
function dvrOpenModal(type,id){
  _dvrModalType=type;_dvrModalId=id||null;
  const cat=DVR_CATS[type];
  const modal=document.getElementById('dvrModal');
  document.getElementById('dvrModalTitle').textContent=cat.label+(id?' — Modifica':' — Aggiungi');
  const it=id?(DVR_DATA[_dvrSoc]?.[type]||[]).find(x=>x.id===id):null;
  const inp='width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--fs-sm);background:var(--bg);color:var(--text);';
  const lbl='font-size:var(--fs-xs);color:var(--text-dim);display:block;margin-bottom:4px;';
  document.getElementById('dvrModalBody').innerHTML=`
    <label style="${lbl}">${cat.nomeLbl}</label>
    <input id="dvr-f-nome" value="${it?.nome||''}" placeholder="${cat.nomeLbl}" style="${inp}margin-bottom:12px;">
    <label style="${lbl}">${cat.extra.lbl}</label>
    <input id="dvr-f-extra" value="${it?.[cat.extra.key]||''}" placeholder="${cat.extra.ph}" style="${inp}margin-bottom:12px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
      <div><label style="${lbl}">${cat.dataLbl}</label><input type="date" id="dvr-f-data" value="${it?.dataEv||''}" style="${inp}"></div>
      <div><label style="${lbl}">Scadenza</label><input type="date" id="dvr-f-scad" value="${it?.scadenza||''}" style="${inp}"></div>
    </div>
    <label style="${lbl}">Note</label>
    <textarea id="dvr-f-note" rows="2" placeholder="Note aggiuntive…" style="${inp}resize:vertical;">${it?.note||''}</textarea>`;
  modal.style.display='flex';
  setTimeout(()=>document.getElementById('dvr-f-nome').focus(),50);
}
function dvrCloseModal(){document.getElementById('dvrModal').style.display='none';}
function dvrSaveEntry(){
  const nome=(document.getElementById('dvr-f-nome').value||'').trim();
  if(!nome)return;
  const isEmp=!!(document.getElementById('dvr-f-empmode'));
  if(isEmp){
    const contr=(document.getElementById('dvr-f-contratto')?.value||'').trim();
    const entry={nome,
      mansione:(document.getElementById('dvr-f-extra').value||'').trim(),
      contratto:contr,
      dataAssunzione:(document.getElementById('dvr-f-data').value||'').trim(),
      scadenzaContratto:['Tempo determinato','Tempo determinato part-time','Part-time','Tirocinio','Apprendistato'].includes(contr)?(document.getElementById('dvr-f-scad-contr')?.value||'').trim():'',
      note:(document.getElementById('dvr-f-note').value||'').trim()};
    if(!DVR_DATA[_dvrSoc].dipendenti)DVR_DATA[_dvrSoc].dipendenti=[];
    const items=DVR_DATA[_dvrSoc].dipendenti;
    if(_dvrEmpId){const idx=items.findIndex(x=>x.id===_dvrEmpId);if(idx>=0)items[idx]={...items[idx],...entry};}
    else items.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),...entry});
    dvrSave();dvrCloseModal();dvrRenderDipendenti();return;
  }
  const cat=DVR_CATS[_dvrModalType];
  const entry={nome,
    [cat.extra.key]:(document.getElementById('dvr-f-extra').value||'').trim(),
    dataEv:(document.getElementById('dvr-f-data').value||'').trim(),
    scadenza:(document.getElementById('dvr-f-scad').value||'').trim(),
    note:(document.getElementById('dvr-f-note').value||'').trim()};
  if(!DVR_DATA[_dvrSoc])DVR_DATA[_dvrSoc]={};
  if(!DVR_DATA[_dvrSoc][_dvrModalType])DVR_DATA[_dvrSoc][_dvrModalType]=[];
  const items=DVR_DATA[_dvrSoc][_dvrModalType];
  if(_dvrModalId){const idx=items.findIndex(x=>x.id===_dvrModalId);if(idx>=0)items[idx]={...items[idx],...entry};}
  else items.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),...entry});
  dvrSave();dvrCloseModal();dvrRenderPanel(_dvrModalType);
}
async function dvrDelete(type,id){
  if(!await cqConferma('Eliminare questa voce?','L\'operazione non si può annullare.',{ok:'Elimina'}))return;
  DVR_DATA[_dvrSoc][type]=(DVR_DATA[_dvrSoc][type]||[]).filter(x=>x.id!==id);
  dvrSave();dvrRenderPanel(type);
}
function miniappCopy(inputId,btn){
  const inp=document.getElementById(inputId);
  navigator.clipboard.writeText(inp.value).then(()=>{
    const orig=btn.textContent;btn.textContent='✓ Copiato';btn.style.background='var(--green)';
    setTimeout(()=>{btn.textContent=orig;btn.style.background='';},2000);
  }).catch(()=>{inp.select();document.execCommand('copy');});
}
function miniappOpen(inputId){
  const inp=document.getElementById(inputId);
  if(inp&&inp.value)window.open(inp.value,'_blank');
}
// §§ MINI APP — PANNELLO DI CONTROLLO (stato colorato per app standalone, mosaico)
function miniappRender(){
  miniappRenderStatus();
  miniappLoadAppStatus();
  miniappLoadBkfBanner();
}
// Interruttore acceso/spento per ciascuna app standalone (qm_app_status in KV,
// letto da ogni app all'avvio: se il proprio flag è false mostra la schermata
// "in aggiornamento" invece della UI normale).
const MINIAPP_KEYS=['hk','bkf','cm','inv','dvr'];
let _appStatus={};
async function miniappLoadAppStatus(){
  try{
    const r=await fetch(PROXY+'/kv/get?key=qm_app_status',{cache:'no-store'});
    const j=await r.json();
    _appStatus=j&&j.value?JSON.parse(j.value):{};
  }catch(e){
    try{_appStatus=JSON.parse(localStorage.getItem('qm_app_status')||'{}');}catch(e2){_appStatus={};}
  }
  miniappRenderToggles();
}
function miniappRenderToggles(){
  MINIAPP_KEYS.forEach(k=>{
    const btn=document.getElementById('miniapp-'+k+'-toggle');
    if(!btn)return;
    const on=_appStatus[k]!==false;
    btn.style.background=on?'var(--green)':'var(--border)';
    const knob=btn.querySelector('.miniapp-toggle-knob');
    if(knob)knob.style.left=on?'17px':'2px';
  });
}
function miniappToggleApp(key){
  const on=_appStatus[key]!==false;
  _appStatus[key]=!on;
  const json=JSON.stringify(_appStatus);
  try{localStorage.setItem('qm_app_status',json);}catch(e){}
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_app_status',value:json})}).catch(()=>{});
  miniappRenderToggles();
}
// Avviso temporaneo (toast) solo per breakfast.html — un messaggio (e uno stato
// attivo/disattivo) indipendente per ciascuna delle 3 tab dell'app (Servizio/
// Acquisti/Analisi), mostrato sul telefono per 7s quando si è su quella tab.
const BKF_BANNER_KEY='qm_bkf_banner';
const BKF_BANNER_TABS=[['day','Servizio'],['orders','Acquisti'],['report','Analisi']];
let _bkfBanner={day:{enabled:false,message:''},orders:{enabled:false,message:''},report:{enabled:false,message:''}};
function _bkfBannerNorm(v){
  const out={};
  BKF_BANNER_TABS.forEach(([k])=>{out[k]=(v&&v[k])?{enabled:!!v[k].enabled,message:v[k].message||''}:{enabled:false,message:''};});
  return out;
}
async function miniappLoadBkfBanner(){
  try{
    const r=await fetch(PROXY+'/kv/get?key='+BKF_BANNER_KEY,{cache:'no-store'});
    const j=await r.json();
    _bkfBanner=_bkfBannerNorm(j&&j.value?JSON.parse(j.value):null);
  }catch(e){
    try{_bkfBanner=_bkfBannerNorm(JSON.parse(localStorage.getItem(BKF_BANNER_KEY)||'null'));}catch(e2){_bkfBanner=_bkfBannerNorm(null);}
  }
  miniappRenderBkfBanner();
}
function miniappRenderBkfBanner(){
  const wrap=document.getElementById('miniapp-bkf-banner-tabs');
  if(!wrap)return;
  wrap.innerHTML=BKF_BANNER_TABS.map(([k,lbl])=>{
    const st=_bkfBanner[k]||{enabled:false,message:''};
    return`<div>
      <div style="font-size:10.5px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">${lbl}</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input data-bkf-banner-tab="${k}" type="text" value="${(st.message||'').replace(/"/g,'&quot;')}" placeholder="es. Nuovo turno caricato, ricarica" style="flex:1;min-width:0;padding:7px 9px;font-size:13px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);">
        <button onclick="miniappToggleBkfBanner('${k}')" title="Attiva/disattiva avviso su ${lbl}" style="width:36px;height:21px;border-radius:11px;border:none;position:relative;cursor:pointer;padding:0;flex-shrink:0;background:${st.enabled?'var(--green)':'var(--border)'};"><span style="position:absolute;top:2px;left:${st.enabled?'17px':'2px'};width:17px;height:17px;border-radius:50%;background:#fff;transition:left .15s;"></span></button>
      </div>
    </div>`;
  }).join('');
}
function miniappSaveBkfBannerToKV(){
  const json=JSON.stringify(_bkfBanner);
  try{localStorage.setItem(BKF_BANNER_KEY,json);}catch(e){}
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:BKF_BANNER_KEY,value:json})}).catch(()=>{});
}
function miniappToggleBkfBanner(tab){
  _bkfBanner[tab].enabled=!_bkfBanner[tab].enabled;
  miniappSaveBkfBannerToKV();
  miniappRenderBkfBanner();
}
function miniappSaveBkfBanner(btn){
  document.querySelectorAll('[data-bkf-banner-tab]').forEach(inp=>{
    const tab=inp.dataset.bkfBannerTab;
    if(_bkfBanner[tab])_bkfBanner[tab].message=(inp.value||'').trim();
  });
  miniappSaveBkfBannerToKV();
  if(btn){const orig=btn.textContent;btn.textContent='✓ Salvato';setTimeout(()=>{btn.textContent=orig;},1500);}
}
// Pannello di controllo — stato colorato per ciascuna app standalone,
// calcolato da dati già in memoria/localStorage (nessuna fetch aggiuntiva
// tranne Culligan, che legge la chiave giornaliera KV come fa cmLoad()).
function _miniappStatusHTML(color,label,kpi){
  const colorMap={green:{c:'var(--green)',bg:'var(--green-bg)'},amber:{c:'var(--amber)',bg:'var(--amber-bg)'},red:{c:'var(--red)',bg:'var(--red-bg)'}};
  const m=colorMap[color]||colorMap.green;
  return`<div style="display:flex;align-items:center;gap:8px;background:${m.bg};border-radius:8px;padding:8px 12px;">
    <span style="width:8px;height:8px;border-radius:50%;background:${m.c};flex-shrink:0;"></span>
    <span style="font-size:var(--fs-xs);font-weight:700;color:${m.c};">${label}</span>
    ${kpi?`<span style="font-size:var(--fs-xs);color:var(--text-dim);margin-left:auto;">${kpi}</span>`:''}
  </div>`;
}
function _miniappFmtTime(ts){
  if(!ts)return'—';
  const d=new Date(ts);
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function _miniappFmtDate(ts){
  if(!ts)return'mai';
  const d=new Date(ts);
  return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
}
function miniappHkStatus(){
  if(!pianoData||!pianoData.giorni||!pianoData.giorni.length)return _miniappStatusHTML('red','Piano non caricato','');
  const idx=pianoGetGiornoIdx();
  if(idx===-1)return _miniappStatusHTML('amber','Piano non aggiornato a oggi','');
  const ts=parseInt(localStorage.getItem('qm_ts_pianoTs')||'0')||null;
  return _miniappStatusHTML('green','Aggiornato a oggi',`ore ${_miniappFmtTime(ts)}`);
}
function miniappBkfStatus(){
  if(!bkfData||!bkfData.length)return _miniappStatusHTML('red','Report pasti non caricato','');
  const today=new Date();
  const todayStr=String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0');
  const todayIdx=bkfData.findIndex(d=>d.label&&d.label.includes(todayStr));
  if(todayIdx===-1)return _miniappStatusHTML('amber','Report non aggiornato a oggi','');
  const ts=parseInt(localStorage.getItem('qm_ts_bkfTs')||'0')||null;
  return _miniappStatusHTML('green','Aggiornato a oggi',`ore ${_miniappFmtTime(ts)}`);
}
function miniappDvrStatus(){
  let scaduti=0,inScadenza=0;
  DVR_SOC_KEYS.forEach(soc=>{
    (DVR_DATA[soc]?.dipendenti||[]).forEach(it=>{
      if(!it.scadenzaContratto)return;
      const scadMs=new Date(it.scadenzaContratto).setHours(0,0,0,0);
      const nowMs=new Date().setHours(0,0,0,0);
      const daysLeft=Math.ceil((scadMs-nowMs)/86400000);
      if(daysLeft<0)scaduti++;else if(daysLeft<=30)inScadenza++;
    });
  });
  if(scaduti>0)return _miniappStatusHTML('red','Contratti scaduti',`${scaduti} da rinnovare`);
  if(inScadenza>0)return _miniappStatusHTML('amber','In scadenza ≤30gg',`${inScadenza} contratt${inScadenza===1?'o':'i'}`);
  return _miniappStatusHTML('green','Tutto in regola','');
}
function miniappInvStatus(){
  let sottoSoglia=0;
  ['sa','ar'].forEach(wh=>{
    let catalog={},moves=[];
    try{catalog=JSON.parse(localStorage.getItem('qm_inv_catalog_'+wh)||'{}');}catch(e){}
    try{moves=JSON.parse(localStorage.getItem('qm_inv_moves_'+wh)||'[]');}catch(e){}
    const stock=invCalcStock(catalog,moves);
    Object.entries(stock).forEach(([bc,qty])=>{
      if(invItemStatus(qty,catalog[bc]?.soglia??null)!=='ok')sottoSoglia++;
    });
  });
  const lastDelivery=wh=>{
    const orders=invOrdersGet().filter(o=>o.wh===wh&&o.status==='ricevuto'&&o.tsRicevuto);
    return orders.length?Math.max(...orders.map(o=>o.tsRicevuto)):null;
  };
  const kpi=`SA ${_miniappFmtDate(lastDelivery('sa'))} · AR ${_miniappFmtDate(lastDelivery('ar'))}`;
  if(sottoSoglia>=3)return _miniappStatusHTML('red','Scorte da riordinare',kpi);
  if(sottoSoglia>0)return _miniappStatusHTML('amber','Alcune scorte basse',kpi);
  return _miniappStatusHTML('green','Scorte ok',kpi);
}
async function miniappCmStatus(){
  const d=new Date();
  const key='qm_cm_'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  let state=null;
  try{
    const r=await fetch(PROXY+'/kv/get?key='+encodeURIComponent(key),{cache:'no-store'});
    if(r.ok){const j=await r.json();if(j&&j.value)state=JSON.parse(j.value);}
  }catch(e){}
  if(!state){try{const r=localStorage.getItem(key);if(r)state=JSON.parse(r);}catch(e){}}
  if(!state||!Object.keys(state).length)return _miniappStatusHTML('red','Nessun controllo oggi','');
  const lastTs=Math.max(0,...CM_ROOMS.map(r=>state[r]?.ts||0))||null;
  const pending=CM_ROOMS.filter(r=>!state[r]?.visited).length;
  if(pending>0)return _miniappStatusHTML('amber','Giro in corso',`ore ${_miniappFmtTime(lastTs)}`);
  return _miniappStatusHTML('green','Giro completato',`ore ${_miniappFmtTime(lastTs)}`);
}
function miniappRenderStatus(){
  const hk=document.getElementById('miniapp-hk-status');if(hk)hk.innerHTML=miniappHkStatus();
  const bkf=document.getElementById('miniapp-bkf-status');if(bkf)bkf.innerHTML=miniappBkfStatus();
  const dvr=document.getElementById('miniapp-dvr-status');if(dvr)dvr.innerHTML=miniappDvrStatus();
  const inv=document.getElementById('miniapp-inv-status');if(inv)inv.innerHTML=miniappInvStatus();
  const cmEl=document.getElementById('miniapp-cm-status');
  if(cmEl)miniappCmStatus().then(html=>{cmEl.innerHTML=html;});
}
let pianoNavIdx=null; // indice giorno selezionato nel pannello overview
let _cmPianoStats=null; // {prev,cur} sostituzioni bottiglia Art (eventi, non camere uniche) sett. scorsa/corrente
async function cmLoadPianoStats(){
  const now=new Date();
  const dow=now.getDay(); // 0=Dom..6=Sab
  const curSunday=new Date(now);curSunday.setDate(now.getDate()-dow);curSunday.setHours(0,0,0,0);
  const prevSunday=new Date(curSunday);prevSunday.setDate(curSunday.getDate()-7);
  const keyFor=d=>'qm_cm_'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const curKeys=[];for(let i=0;i<=dow;i++){const d=new Date(curSunday);d.setDate(curSunday.getDate()+i);curKeys.push(keyFor(d));}
  const prevKeys=[];for(let i=0;i<7;i++){const d=new Date(prevSunday);d.setDate(prevSunday.getDate()+i);prevKeys.push(keyFor(d));}
  async function fetchDay(key){
    try{
      const r=await fetch(PROXY+'/kv/get?key='+encodeURIComponent(key),{cache:'no-store'});
      if(r.ok){const j=await r.json();if(j&&j.value)return JSON.parse(j.value);}
    }catch(e){}
    try{const s=localStorage.getItem(key);if(s)return JSON.parse(s);}catch(e){}
    return null;
  }
  function totalSostituzioni(states){
    let n=0;
    states.forEach(state=>{
      if(!state)return;
      CM_ROOMS.forEach(r=>{
        const rs=state[r];
        if(rs&&rs.visited&&!rs.dnd&&!rs.libera&&rs.bottiglia==='consumata')n++;
      });
    });
    return n;
  }
  const[curStates,prevStates]=await Promise.all([Promise.all(curKeys.map(fetchDay)),Promise.all(prevKeys.map(fetchDay))]);
  _cmPianoStats={cur:totalSostituzioni(curStates),prev:totalSostituzioni(prevStates)};
  try{if(pianoNavIdx!==null)pianoNavRender(pianoNavIdx);}catch(e){}
}

function pianoGetGiornoIdx(refDate){
  if(!pianoData||!pianoData.giorni)return -1;
  const ref=new Date(refDate||new Date());
  const refStr=String(ref.getDate()).padStart(2,'0')+'/'+String(ref.getMonth()+1).padStart(2,'0')+'/'+ref.getFullYear();
  const normDate=s=>s.split('/').map((p,i)=>i<2?p.padStart(2,'0'):p).join('/');
  return pianoData.giorni.findIndex(g=>g.data&&normDate(g.data)===refStr);
}

function pianoNavRender(idx){
  if(!pianoData||!pianoData.giorni||!pianoData.giorni.length)return;
  // Cambio giorno reale (non un semplice refresh dello stesso giorno, es. dal polling
  // 30s): il "Ci sono altre possibilità?" espanso da un giorno non deve restare aperto
  // per un altro giorno, quindi si resetta solo qui.
  if(pianoNavIdx!==idx)_hkSuggMoreN=0;
  pianoNavIdx=idx;
  const giorno=pianoData.giorni[idx];
  if(!giorno)return;
  // Aggiorna label giorno
  const lbl=document.getElementById('ov-piano-day-label');
  if(lbl)lbl.textContent=giorno.label;
  // Riepilogo settimana
  pianoRenderWeek(idx);
  // Alert scadenza
  pianoCheckScadenza();
  // Contenuto giorno
  renderPianoGiorno('ov-piano-preview',null,idx);
  // Box Culligan accanto al grafico occupazione
  renderOvCulliganBox(giorno);
  // Stato preparazione camere in partenza/cambio (async: fetch KV separato)
  try{renderOvRoomReadiness(giorno);}catch(e){}
  // Room Division (view separata dal menu laterale)
  renderRoomDivision(idx);
}

function pianoPrevDay(){
  if(!pianoData||pianoNavIdx===null)return;
  if(pianoNavIdx>0)pianoNavRender(pianoNavIdx-1);
}
function pianoNextDay(){
  if(!pianoData||pianoNavIdx===null)return;
  if(pianoNavIdx<pianoData.giorni.length-1)pianoNavRender(pianoNavIdx+1);
}

function pianoRenderWeek(activeIdx){
  const row=document.getElementById('ov-piano-week-row');
  const wrap=document.getElementById('ov-piano-week');
  if(!row||!wrap||!pianoData)return;
  wrap.style.display='block';
  const today=new Date();today.setHours(0,0,0,0);
  const _mob=window.innerWidth<=768;
  // Su smartphone i sette giorni devono stare tutti in schermo insieme, senza scorrere.
  // Per ottenerlo senza rimpicciolire le cifre non si stringe la scheda: si impilano le
  // due metriche invece di affiancarle. Affiancate sono loro a imporre la larghezza
  // minima (due icone + due numeri + separatore); impilate, ogni riga usa tutta la
  // larghezza della scheda e il numero resta leggibile anche a 40px.
  const _ico=_mob?'12px':'36px';
  const _numFs=_mob?'16px':'18px';
  const _dayFs=_mob?'12px':'15px';
  const _dateFs=_mob?'10px':'11px';
  const _pad=_mob?'7px 2px 6px':'12px 8px 10px';
  const _minW=_mob?'36px':'70px';
  row.innerHTML=pianoData.giorni.map((g,i)=>{
    const lib=g.liborio||{partenze:[],fermate:[],cambi:[]};
    const bMerged={partenze:[...(g.boutique?.partenze||[]),...lib.partenze],fermate:[...(g.boutique?.fermate||[]),...lib.fermate],cambi:[...(g.boutique?.cambi||[]),...lib.cambi]};
    const totP=(g.soulart?.partenze?.length||0)+(g.soulart?.cambi?.length||0)+bMerged.partenze.length+bMerged.cambi.length;
    const totF=(g.soulart?.fermate?.length||0)+bMerged.fermate.length;
    const isActive=i===activeIdx;
    const parts=g.label?g.label.split(' '):['?'];
    const dayName=parts[0].substring(0,3);
    const dayDate=parts[1]||'';
    const pColor=totP>0?'var(--amber)':'var(--text-dim)';
    const fColor=totF>0?'var(--accent)':'var(--text-dim)';
    const bg=isActive?'var(--surface2)':'var(--surface)';
    const borderTop=isActive?'border-top:3px solid var(--accent);':'border-top:3px solid transparent;';
    const totTot=totF+totP;
    return`<div onclick="pianoNavRender(${i})" style="flex:1;min-width:${_minW};background:${bg};border:1px solid var(--border);${borderTop}border-radius:10px;padding:${_pad};text-align:center;cursor:pointer;transition:all .15s;">
      <div style="font-size:${_dayFs};font-weight:700;color:${isActive?'var(--accent)':'var(--text)'};line-height:1;">${dayName}</div>
      <div style="font-size:${_dateFs};color:var(--text-dim);margin-bottom:6px;margin-top:2px;">${dayDate}</div>
      ${_mob?`<div style="display:flex;flex-direction:column;gap:3px;margin-bottom:5px;">
        <div style="display:flex;align-items:center;justify-content:center;gap:2px;">
          <img src="img/icons/fermata.png" class="ov-icon" style="width:${_ico};height:${_ico};object-fit:contain;">
          <span style="font-size:${_numFs};font-weight:700;color:${fColor};line-height:1;">${totF}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;gap:2px;">
          <img src="img/icons/arrivi.png" class="ov-icon" style="width:${_ico};height:${_ico};object-fit:contain;">
          <span style="font-size:${_numFs};font-weight:700;color:${pColor};line-height:1;">${totP}</span>
        </div>
      </div>`:`<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:5px;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <img src="img/icons/fermata.png" class="ov-icon" style="width:${_ico};height:${_ico};object-fit:contain;">
          <span style="font-size:${_numFs};font-weight:700;color:${fColor};line-height:1;">${totF}</span>
        </div>
        <div style="width:1px;height:40px;background:var(--border-light);"></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <img src="img/icons/arrivi.png" class="ov-icon" style="width:${_ico};height:${_ico};object-fit:contain;">
          <span style="font-size:${_numFs};font-weight:700;color:${pColor};line-height:1;">${totP}</span>
        </div>
      </div>`}
      <div style="border-top:1px solid var(--border-light);padding-top:4px;">
        <span style="font-size:10px;color:var(--text-dim);">tot </span><span style="font-size:${_mob?'12px':'14px'};font-weight:700;color:var(--text);">${totTot}</span>
      </div>
    </div>`;
  }).join('');
  // Il gap è in linea sull'elemento in index.html: per stringerlo su smartphone va
  // scritto qui, altrimenti nessuna regola CSS lo raggiunge.
  row.style.gap=_mob?'3px':'4px';
}

// pianoRenderWeek decide la disposizione (cifre affiancate su desktop, impilate su
// smartphone) leggendo window.innerWidth al momento del disegno. Ridimensionando la
// finestra restava quella scelta prima, fino al disegno successivo — e quello lo fa solo
// il polling ogni 30 secondi: abbastanza per vedersi il layout da telefono su desktop e
// credere che sia rotto. Si ridisegna solo quando la soglia viene davvero attraversata,
// non a ogni pixel di trascinamento del bordo.
let _pianoEraMob=window.innerWidth<=768;
let _pianoResizeT=null;
window.addEventListener('resize',()=>{
  const oraMob=window.innerWidth<=768;
  if(oraMob===_pianoEraMob)return;
  _pianoEraMob=oraMob;
  clearTimeout(_pianoResizeT);
  _pianoResizeT=setTimeout(()=>{try{if(pianoNavIdx!==null)pianoRenderWeek(pianoNavIdx);}catch(e){}},120);
});

function pianoCheckScadenza(){
  const badge=document.getElementById('ov-piano-scadenza');
  if(!badge||!pianoData||!pianoData.giorni)return;
  const last=pianoData.giorni[pianoData.giorni.length-1];
  if(!last||!last.data)return;
  const parts=last.data.split('/');
  if(parts.length<3)return;
  const lastDate=new Date(parseInt(parts[2]),parseInt(parts[1])-1,parseInt(parts[0]));
  lastDate.setHours(0,0,0,0);
  const today=new Date();today.setHours(0,0,0,0);
  const diff=Math.ceil((lastDate-today)/(24*60*60*1000));
  if(diff<=1){badge.textContent=diff<0?'Piano scaduto':'Scade oggi';badge.style.display='inline';}
  else if(diff<=2){badge.textContent='Scade domani';badge.style.display='inline';}
  else{badge.style.display='none';}
}

// Stessa suddivisione camere fissa dell'app smartphone (housekeeper.html) — sola lettura,
// solo per controllare il risultato del bilanciamento carico cameriere (che avviene
// spostando fisicamente le camere sul PMS, poi caricando il Piano Settimana: non è
// un'assegnazione modificabile da qui).
const MATARESE=new Set(['Art 1','Art 2','Art 3','Art 4','Art 5','Art 6','Art 7','Art 10','Art 11','Art 12','Art 22']);
function splitSoulart(rooms){
  const m={partenze:[],fermate:[],cambi:[]},a={partenze:[],fermate:[],cambi:[]};
  if(!rooms)return{m,a};
  (rooms.cambi||[]).forEach(r=>(MATARESE.has(r)?m:a).cambi.push(r));
  (rooms.partenze||[]).forEach(r=>(MATARESE.has(r)?m:a).partenze.push(r));
  (rooms.fermate||[]).forEach(r=>(MATARESE.has(r)?m:a).fermate.push(r));
  return{m,a};
}
// Carico pesato: una partenza (pulizia completa) pesa il doppio di una fermata
// (rifacimento/ripasso) — stima approssimativa per confrontare il carico reale,
// non solo il numero di camere. Alcune camere (più grandi/complesse) hanno un peso
// leggermente maggiore: Art 1,2,3,8,9,13 = "pesanti", tutte le altre = standard.
const HK_WEIGHT_PARTENZA=2,HK_WEIGHT_FERMATA=1;
const HK_WEIGHT_PARTENZA_HEAVY=2.5,HK_WEIGHT_FERMATA_HEAVY=1.5;
const HK_HEAVY_ROOMS=new Set(['Art 1','Art 2','Art 3','Art 8','Art 9','Art 13']);
function hkRoomWeight(room,isPartenza){
  const heavy=HK_HEAVY_ROOMS.has(room);
  if(isPartenza)return heavy?HK_WEIGHT_PARTENZA_HEAVY:HK_WEIGHT_PARTENZA;
  return heavy?HK_WEIGHT_FERMATA_HEAVY:HK_WEIGHT_FERMATA;
}
function hkCarico(rooms){
  let tot=0;
  (rooms.partenze||[]).forEach(r=>tot+=hkRoomWeight(r,true));
  (rooms.cambi||[]).forEach(r=>tot+=hkRoomWeight(r,true));
  (rooms.fermate||[]).forEach(r=>tot+=hkRoomWeight(r,false));
  return tot;
}

// ═══ SUGGERIMENTI DI BILANCIAMENTO ═══════════════════════════════════════════
// Il carico di una prenotazione non pesa su un giorno solo: un ospite che arriva
// lunedì e parte giovedì pesa su tutti e quattro i giorni. Spostare una camera
// quindi ri-bilancia più giorni insieme — è il calcolo che a mano è scomodo e che
// qui viene simulato. Sono SOLO suggerimenti: le modifiche vanno fatte a mano nel PMS.
//
// Vincoli (decisi con l'utente):
//  - stessa tipologia camera (dal Piano, campo `tipi`)
//  - camera di destinazione libera per TUTTA la durata del soggiorno
//  - solo prenotazioni non ancora arrivate: gli ospiti già in casa non si spostano
//    se non per motivi gravi, quindi i soggiorni iniziati prima di oggi sono esclusi
function _hkRoomState(giorno,room){
  const s=(giorno&&giorno.soulart)||{};
  if((s.cambi||[]).includes(room))return'cambio';
  if((s.partenze||[]).includes(room))return'partenza';
  if((s.fermate||[]).includes(room))return'fermata';
  if((s.arrivi||[]).includes(room))return'arrivo';
  return null;
}
// Stessa scala di hkCarico: cambio/partenza pesano come partenza, fermata come
// fermata, arrivo puro 0 (la camera era libera, non va rifatta quella mattina).
function _hkStateWeight(room,state){
  if(state==='partenza'||state==='cambio')return hkRoomWeight(room,true);
  if(state==='fermata')return hkRoomWeight(room,false);
  return 0;
}
// Ricostruisce i soggiorni: '+' apre un blocco, '=' lo prosegue, '-' lo chiude.
// I soggiorni già in corso al primo giorno della settimana non vengono ricostruiti
// (start resta null) e restano quindi esclusi dai suggerimenti — è voluto.
function hkBuildBlocks(){
  if(!pianoData||!pianoData.giorni)return[];
  const giorni=pianoData.giorni;
  const rooms=new Set();
  giorni.forEach(g=>{const s=g.soulart||{};['partenze','fermate','cambi','arrivi'].forEach(k=>(s[k]||[]).forEach(r=>rooms.add(r)));});
  const N=giorni.length,byRoom={};
  // Celle con pax non valorizzati: l'arrivo (o la partenza) è una riprotezione/blocco
  // camera, non un ospite. Il soggiorno che ne nasce va contato ma non spostato.
  const incA=new Set((pianoData&&pianoData.incArr)||[]);
  const incP=new Set((pianoData&&pianoData.incPar)||[]);
  rooms.forEach(room=>{
    const out=[];let cur=null;
    giorni.forEach((g,i)=>{
      const st=_hkRoomState(g,room);
      // Se qualcuno risulta presente ma non l'abbiamo visto arrivare, il soggiorno è
      // iniziato prima della settimana: serve per calcolare gli stati, ma non è
      // spostabile (start:-1) perché è un ospite già in casa.
      if((st==='fermata'||st==='partenza'||st==='cambio')&&!cur)cur={room,start:-1,openStart:true};
      if(st==='partenza'||st==='cambio'){if(cur){cur.end=i;if(incP.has(room+'|'+i))cur.speciale=true;out.push(cur);cur=null;}}
      if(st==='arrivo'||st==='cambio'){cur={room,start:i};if(incA.has(room+'|'+i))cur.speciale=true;}
    });
    if(cur){cur.end=N-1;cur.openEnd=true;out.push(cur);}
    byRoom[room]=out;
  });
  return byRoom;
}
// Un soggiorno [s..e] occupa le NOTTI s..e-1: chi parte la mattina del giorno e non
// occupa quella notte, quindi un altro ospite può entrare lo stesso giorno. È questo
// che permette di spostare un soggiorno in una camera che quel giorno ha un check-out.
function _hkNights(b,N){
  const s=Math.max(0,b.start),e=b.openEnd?N-1:b.end-1;
  const out=new Set();
  for(let d=s;d<=e;d++)out.add(d);
  return out;
}
function _hkOverlap(a,b){for(const x of a)if(b.has(x))return true;return false;}
function _hkStatesFromBlocks(bs,N){
  const out=new Array(N).fill(null);
  for(let d=0;d<N;d++){
    let arr=false,par=false,mid=false;
    bs.forEach(b=>{
      const end=b.openEnd?N:b.end;
      if(b.start===d)arr=true;
      if(!b.openEnd&&b.end===d)par=true;
      if(b.start<d&&d<end)mid=true;
    });
    out[d]=mid?'fermata':(arr&&par?'cambio':par?'partenza':arr?'arrivo':null);
  }
  return out;
}
// Una partenza (o un cambio, che è comunque una camera da rifare da capo) è ciò che
// le housekeeper percepiscono come "lavoro". Il carico pesato è più corretto ma per
// loro è astratto: la domanda che fanno è "perché io ho più partenze di lei?".
// Quindi l'obiettivo è doppio — bilanciare il carico E il numero di partenze — con
// le partenze pesate di più perché è lì che nasce la percezione di ingiustizia.
const _hkIsPartenza=s=>(s==='partenza'||s==='cambio')?1:0;
// Quanto vale uno squilibrio di UNA partenza in unità di carico. Una partenza pesa
// già 2 (2,5 sulle camere grandi): a 3 contava poco più del suo peso reale — bastava a
// spareggiare a parità di carico, ma troppe mosse che pareggiavano le partenze venivano
// scartate perché peggioravano di poco il carico generale altrove, risultando in "guadagno"
// complessivo negativo e quindi pochi suggerimenti. Le cameriere non ragionano in carico
// pesato (è un concetto astratto per loro): guardano il numero di partenze assegnate a
// testa, quindi qui il peso è alzato molto di più — una partenza in meno/in più conta come
// 4 camere intere di carico, così il motore accetta anche mosse che peggiorano il carico
// pur di pareggiare le partenze, e propone più soluzioni.
const HK_PESO_PARTENZE=8;
// Tipologie che non si spostano mai: Junior Suite e Suite. Restano nel conteggio del
// carico e delle partenze (il lavoro c'è comunque), ma il motore non le propone né come
// camera di partenza né come destinazione. Aggiungere qui una sigla la esclude del tutto.
const HK_TIPI_FISSE=['JS','SUI'];
// Le stesse camere anche per numero, non solo per sigla: se una settimana il Piano scrive
// la tipologia in un altro modo il vincolo deve reggere comunque. Sono le JS (1,2,3) e le
// Suite (8,9,13). Coincidono oggi con HK_HEAVY_ROOMS ma il significato è diverso: là è il
// peso del carico, qui è "non si tocca".
const HK_CAMERE_FISSE=new Set(['Art 1','Art 2','Art 3','Art 8','Art 9','Art 13']);
const _hkFissa=r=>HK_CAMERE_FISSE.has(r)||HK_TIPI_FISSE.indexOf((pianoData&&pianoData.tipi&&pianoData.tipi[r])||'')>=0;
// Etichette leggibili per le tipologie camera nei suggerimenti/diagnostica Room Division —
// i codici grezzi del Piano ("AS SUP", "AS DLX DP") non sono immediatamente comprensibili.
const HK_TIPO_LABELS={'AS SUP':'Superior','AS DLX DP':'Deluxe'};
const _hkTipoLbl=t=>HK_TIPO_LABELS[t]||t;
// L'equilibrio va cercato GIORNO PER GIORNO, non sui totali di settimana: una
// settimana può chiudere 27 partenze a 27 e avere comunque un mercoledì da 6 contro 3.
// È il singolo giorno che le housekeeper vivono, ed è lì che nasce la lamentela.
// Lo squilibrio di un giorno = |differenza carico| + peso × |differenza partenze|;
// l'obiettivo complessivo è la somma su tutti i giorni.
function _hkDayScore(d){return Math.abs(d.cM-d.cA)+HK_PESO_PARTENZE*Math.abs(d.pM-d.pA);}
// I totali si calcolano dagli stati RICOSTRUITI DAI SOGGIORNI, non da quelli grezzi del
// Piano. Differiscono quando una cella contiene solo ".." (pax ignoti): il Piano la
// lascia vuota anche se la camera è occupata — succede con le riprotezioni, che durano
// più giorni e hanno i pax non valorizzati. Usando i soggiorni la camera risulta
// correttamente occupata, e soprattutto la base di partenza coincide con quella usata
// per simulare gli spostamenti: altrimenti ogni simulazione produce un delta fantasma.
function hkDayTotalsFrom(stato,rooms,N){
  const out=[];
  for(let d=0;d<N;d++){
    let cM=0,cA=0,pM=0,pA=0;
    rooms.forEach(r=>{
      const s=stato[r]?stato[r][d]:null;
      const w=_hkStateWeight(r,s),p=_hkIsPartenza(s);
      if(MATARESE.has(r)){cM+=w;pM+=p;}else{cA+=w;pA+=p;}
    });
    out.push({cM,cA,pM,pA});
  }
  return out;
}
// Un soggiorno entra in una camera se le sue notti non si sovrappongono a quelle dei
// soggiorni già presenti (esclusi quelli che vengono spostati via nella stessa mossa).
function _hkFits(block,blocks,escludi,N){
  const n=_hkNights(block,N);
  return!(blocks||[]).some(z=>escludi.indexOf(z)<0&&_hkOverlap(n,_hkNights(z,N)));
}
// Effetto di una riassegnazione: `changes` è {camera: nuoviSoggiorni}. Calcola quanto
// migliora (o peggiora) lo squilibrio complessivo e su quali giorni.
function _hkEffetto(days,stato,changes,todayIdx,N){
  const nuovi={};
  Object.keys(changes).forEach(r=>{nuovi[r]=_hkStatesFromBlocks(changes[r],N);});
  let delta=0;const effetti=[],peggiori=[],giorni={};
  for(let d=todayIdx;d<N;d++){
    const o=days[d];
    let cM=o.cM,cA=o.cA,pM=o.pM,pA=o.pA;
    Object.keys(changes).forEach(r=>{
      const os=stato[r][d],ns=nuovi[r][d];
      const dw=_hkStateWeight(r,ns)-_hkStateWeight(r,os),dp=_hkIsPartenza(ns)-_hkIsPartenza(os);
      if(MATARESE.has(r)){cM+=dw;pM+=dp;}else{cA+=dw;pA+=dp;}
    });
    const n={cM,cA,pM,pA},so=_hkDayScore(o),sn=_hkDayScore(n);
    delta+=sn-so;
    // `giorni` tiene il prima/dopo di OGNI giorno toccato, non solo di quelli migliorati:
    // serve per filtrare le mosse sul giorno che l'utente sta guardando in Room Division
    // e per dirgli se una mossa che aiuta quel giorno ne peggiora un altro.
    // Serve anche il carico: una mossa può lasciare le partenze pari e riequilibrare solo
    // il carico — senza mostrarlo la riga sembrerebbe "2-4 → 2-4", cioè inutile.
    const ef={i:d,daP:[o.pM,o.pA],aP:[n.pM,n.pA],daC:[o.cM,o.cA],aC:[n.cM,n.cA]};
    giorni[d]=Object.assign({so,sn},ef);
    if(sn<so-0.01)effetti.push(ef);
    else if(sn>so+0.01)peggiori.push(ef);
  }
  return{guadagno:-delta,effetti,peggiori,giorni};
}
// Motore. Tre forme di riassegnazione, in ordine di complessità per chi deve poi
// eseguirle a mano nel PMS:
//   1. spostamento  — il soggiorno va in una camera libera in quelle notti
//   2. scambio      — due soggiorni si scambiano di camera
//   3. catena a 3   — il soggiorno va in B, e il soggiorno di B che dà fastidio si
//                     sposta in una terza camera C, liberando lo spazio
// La fattibilità si misura sulle NOTTI, non sui giorni: chi parte la mattina non
// occupa quella notte, quindi un altro può entrare lo stesso giorno.
// `focusIdx` = giorno selezionato in Room Division. Quando è valorizzato, la ricerca
// resta comunque su tutta la settimana (una mossa tocca più giorni e il bilancio
// complessivo non deve peggiorare), ma vengono proposte solo le mosse che migliorano
// QUEL giorno, ordinate per quanto lo migliorano. Senza focus vale il criterio globale.
function hkSuggestMoves(maxN,focusIdx){
  const out={ok:false,motivo:'',giorni:[],sbilanciati:[],mosse:[],ostacoli:[],focus:null};
  if(!pianoData||!pianoData.giorni||!pianoData.giorni.length){out.motivo='piano';return out;}
  if(!pianoData.tipi||!Object.keys(pianoData.tipi).length){out.motivo='tipi';return out;}
  const giorni=pianoData.giorni,N=giorni.length;
  const todayIdx=Math.max(0,pianoGetGiornoIdx());
  const ART=Object.keys(pianoData.tipi).filter(r=>/^art\s/i.test(r));
  const BL=hkBuildBlocks();
  const stato={};
  ART.forEach(r=>{stato[r]=_hkStatesFromBlocks(BL[r]||[],N);});
  const days=hkDayTotalsFrom(stato,ART,N);
  out.ok=true;
  out.giorni=days;
  // Diagnosi: i giorni da qui in avanti con partenze non pari (≥2 di differenza:
  // con numeri dispari uno di scarto è inevitabile e nessuno lo percepisce come ingiusto)
  days.forEach((d,i)=>{
    if(i<todayIdx)return;
    const dp=d.pM-d.pA;
    if(Math.abs(dp)>=2)out.sbilanciati.push({i,pM:d.pM,pA:d.pA,dp});
  });
  out.sbilanciati.sort((a,b)=>Math.abs(b.dp)-Math.abs(a.dp));
  // Stato del giorno selezionato, così la vista può parlare di quel giorno anche quando
  // è già in pari (o è passato) invece di ragionare solo sulla settimana.
  const hasFocus=typeof focusIdx==='number'&&focusIdx>=0&&focusIdx<N;
  if(hasFocus){
    const f=days[focusIdx];
    out.focus={i:focusIdx,pM:f.pM,pA:f.pA,cM:f.cM,cA:f.cA,
      passato:focusIdx<todayIdx,
      // Vale la pena parlarne solo se lo scarto si nota: 2 partenze (con numeri dispari
      // una di scarto è inevitabile e nessuno la percepisce) o 2 di carico, che è quanto
      // pesa una camera intera. Sotto, il giorno è di fatto in pari e segnalarlo è rumore.
      sbilanciato:Math.abs(f.pM-f.pA)>=2||Math.abs(f.cM-f.cA)>=2};
  }
  const scoreCur=days.reduce((t,d,i)=>t+(i<todayIdx?0:_hkDayScore(d)),0);
  if(scoreCur<0.01)return out;
  if(hasFocus&&(out.focus.passato||!out.focus.sbilanciato))return out;
  // Spostabile = soggiorno che arriva DOPO oggi, riprotezioni comprese (si possono
  // riassegnare a un'altra camera come una prenotazione). Restano fuori sia gli ospiti
  // già in casa SIA gli arrivi previsti proprio oggi (start===todayIdx) anche se non
  // hanno ancora fatto il check-in — reception/HK possono già lavorare su quella camera
  // per la giornata odierna, quindi non va proposta come riassegnabile. Il flag
  // `speciale` serve a segnalare le riprotezioni nell'interfaccia, per non farle
  // passare per prenotazioni normali.
  const spostabile=b=>b.start>todayIdx;
  const mosse=[];
  const valuta=(cand,changes)=>{
    const{guadagno,effetti,peggiori,giorni}=_hkEffetto(days,stato,changes,todayIdx,N);
    if(guadagno<=0.01)return;                              // mai peggiorare la settimana
    // Con un giorno selezionato conta solo se aiuta QUEL giorno: una mossa che pareggia
    // il venerdì non è una risposta utile a chi sta guardando il mercoledì. Eccezione:
    // lo scambio in blocco (scambio-blocco) riguarda TUTTA la settimana per costruzione,
    // non un giorno solo — filtrarlo sul singolo giorno in focus lo scartava ingiustamente
    // anche quando migliorava tutti gli altri giorni della vista settimanale. Per quello
    // basta il guadagno complessivo già verificato sopra.
    let gFocus=0;
    if(hasFocus){
      const f=giorni[focusIdx];
      if(cand.tipo==='scambio-blocco'){
        gFocus=f?f.so-f.sn:0;                             // usato solo per l'ordinamento, non filtra
      }else{
        if(!f||f.sn>=f.so-0.01)return;
        gFocus=f.so-f.sn;
      }
    }
    mosse.push(Object.assign({guadagno,gFocus,effetti,peggiori,giorni},cand));
  };
  ART.forEach(A=>{
    if(!MATARESE.has(A))return;                          // A sempre lato Matarese
    const tipo=pianoData.tipi[A];if(!tipo)return;
    if(_hkFissa(A))return;                               // JS e SUI non si spostano mai
    // Vincolo non negoziabile: solo scambi tra camere della STESSA tipologia (stessoTipo
    // qui sotto è l'unico bacino da cui pescare B/C in tutti e tre i tipi di mossa più giù
    // — sposta, scambia, catena). Mai proporre un cambio tra tipologie diverse.
    const stessoTipo=ART.filter(r=>pianoData.tipi[r]===tipo&&!_hkFissa(r));
    // Scambio IN BLOCCO: tutti i soggiorni futuri di A passano a B e viceversa, non un
    // soggiorno alla volta — è quello che si intende davvero quando si dice "sposta Art X
    // su Art Y per tutta la settimana". Chi è già in casa (non spostabile) resta dov'è
    // fisicamente; si scambiano solo le prenotazioni non ancora arrivate. Sempre valido
    // strutturalmente (stessa tipologia) A PATTO che i soggiorni futuri di A entrino tra
    // gli ospiti già in casa di B e viceversa — per questo serve comunque _hkFits.
    const futureA=(BL[A]||[]).filter(spostabile);
    if(futureA.length){
      const restA=(BL[A]||[]).filter(z=>!spostabile(z));
      stessoTipo.forEach(B=>{
        if(B===A||MATARESE.has(B))return;
        const futureB=(BL[B]||[]).filter(spostabile);
        if(!futureB.length)return;
        const restB=(BL[B]||[]).filter(z=>!spostabile(z));
        if(!futureA.every(z=>_hkFits(z,restB,[],N)))return;
        if(!futureB.every(z=>_hkFits(z,restA,[],N)))return;
        valuta({tipo:'scambio-blocco',from:A,to:B,cat:tipo,nA:futureA.length,nB:futureB.length,
                start:Math.min(...futureA.map(z=>z.start),...futureB.map(z=>z.start))},
               {[A]:restA.concat(futureB),[B]:restB.concat(futureA)});
      });
    }
    (BL[A]||[]).filter(spostabile).forEach(X=>{
      stessoTipo.forEach(B=>{
        if(B===A||MATARESE.has(B))return;                // B sempre lato Altre
        // 1) spostamento semplice: X entra in B così com'è
        if(_hkFits(X,BL[B],[],N)){
          valuta({tipo:'sposta',from:A,to:B,cat:tipo,start:X.start,end:X.end,xSpec:!!X.speciale},
                 {[A]:(BL[A]||[]).filter(z=>z!==X),[B]:(BL[B]||[]).concat([X])});
          return;                                        // se entra già, niente scambi o catene
        }
        // Chi dà fastidio in B?
        const intralcio=(BL[B]||[]).filter(z=>_hkOverlap(_hkNights(X,N),_hkNights(z,N)));
        if(!intralcio.length)return;                      // non dovrebbe succedere: se non c'è overlap _hkFits sarebbe già stato true sopra
        if(intralcio.length===1){
          const Y=intralcio[0];
          if(!spostabile(Y))return;                       // ospite già in casa: non si tocca
          // 2) scambio: Y va in A al posto di X
          if(_hkFits(Y,BL[A],[X],N)){
            valuta({tipo:'scambia',from:A,to:B,cat:tipo,start:X.start,end:X.end,yStart:Y.start,yEnd:Y.end,xSpec:!!X.speciale,ySpec:!!Y.speciale},
                   {[A]:(BL[A]||[]).filter(z=>z!==X).concat([Y]),[B]:(BL[B]||[]).filter(z=>z!==Y).concat([X])});
          }
          // 3) catena a tre: Y si sposta in una terza camera C, liberando B per X
          stessoTipo.forEach(C=>{
            if(C===A||C===B)return;
            if(!_hkFits(Y,BL[C],[],N))return;
            valuta({tipo:'catena',from:A,to:B,via:C,cat:tipo,start:X.start,end:X.end,yStart:Y.start,yEnd:Y.end,xSpec:!!X.speciale,ySpec:!!Y.speciale},
                   {[A]:(BL[A]||[]).filter(z=>z!==X),
                    [B]:(BL[B]||[]).filter(z=>z!==Y).concat([X]),
                    [C]:(BL[C]||[]).concat([Y])});
          });
          return;
        }
        // 4) più soggiorni sovrapposti in B: "occupata" non vuol dire automaticamente
        // bloccata anche con più di un ospite di mezzo — prova a ricollocare OGNUNO in
        // una camera libera diversa della stessa tipologia (una a testa, non incrociati
        // tra loro: niente scambi multipli, solo destinazioni libere dirette, per restare
        // un'operazione che si può ancora eseguire a mano nel PMS senza troppi passaggi).
        // A stessa è una destinazione valida: si è appena liberata con la partenza di X,
        // quindi uno degli occupanti di B potrebbe semplicemente entrare lì — escluderla
        // a priori scartava soluzioni valide (es. A libera solo in parte delle notti di X,
        // ma abbastanza per uno dei soggiorni sovrapposti in B).
        if(intralcio.some(z=>!spostabile(z)))return;        // un ospite già in casa: blocco reale, non risolvibile
        const candidatiMulti=[A,...stessoTipo.filter(c=>c!==A&&c!==B)];
        const fitsInCandidato=(Z,C)=>C===A?_hkFits(Z,BL[A],[X],N):_hkFits(Z,BL[C],[],N);
        const usate=new Set([B]);
        const assegnazioni=[];
        const tutteRicollocate=intralcio.every(Z=>{
          const C=candidatiMulti.find(c=>!usate.has(c)&&fitsInCandidato(Z,c));
          if(!C)return false;
          usate.add(C);
          assegnazioni.push({Z,C});
          return true;
        });
        if(!tutteRicollocate)return;
        const changesMulti={[A]:(BL[A]||[]).filter(z=>z!==X),
          [B]:(BL[B]||[]).filter(z=>intralcio.indexOf(z)<0).concat([X])};
        assegnazioni.forEach(({Z,C})=>{changesMulti[C]=(changesMulti[C]||BL[C]||[]).concat([Z]);});
        valuta({tipo:'catena-multi',from:A,to:B,cat:tipo,start:X.start,end:X.end,xSpec:!!X.speciale,
                vias:assegnazioni.map(a=>({room:a.C,start:a.Z.start,end:a.Z.end,speciale:!!a.Z.speciale}))},
               changesMulti);
      });
    });
  });
  // A parità di beneficio preferisci la mossa più semplice da eseguire nel PMS
  const costo={sposta:0,scambia:1,catena:2,'scambio-blocco':2,'catena-multi':3};
  mosse.sort((x,y)=>{
    // Con un giorno selezionato vince chi migliora di più QUEL giorno; il beneficio sulla
    // settimana resta come secondo criterio, così tra due mosse equivalenti sul giorno
    // si preferisce quella che aiuta anche il resto.
    if(hasFocus&&Math.abs(y.gFocus-x.gFocus)>0.01)return y.gFocus-x.gFocus;
    if(Math.abs(y.guadagno-x.guadagno)>0.01)return y.guadagno-x.guadagno;
    return costo[x.tipo]-costo[y.tipo];
  });
  // Una sola proposta per coppia di camere coinvolte, per non ripetere varianti simili
  const visti=new Set();
  const dedup=mosse.filter(m=>{const k=m.from+'>'+m.to+'>'+m.start;if(visti.has(k))return false;visti.add(k);return true;});
  out.totMosse=dedup.length;              // quante alternative esistono davvero, prima del taglio
  out.mosse=dedup.slice(0,maxN||3);
  // Se un giorno resta sbilanciato e non c'è mossa che lo migliori, spiega il perché
  // camera per camera: è l'informazione che serve davvero per capire se il vincolo è
  // strutturale (tipologia senza corrispettivo) o solo di disponibilità.
  // Con un giorno selezionato si spiega QUEL giorno; altrimenti il peggiore della settimana.
  const gDiag=hasFocus?{i:focusIdx,pM:days[focusIdx].pM,pA:days[focusIdx].pA,dp:days[focusIdx].pM-days[focusIdx].pA}
                      :out.sbilanciati[0];
  if(!out.mosse.length&&gDiag){
    const g=gDiag;
    out.diag=g;
    // Chi ha più partenze; a pari partenze si guarda chi ha più carico.
    const eccesso=g.dp!==0?g.dp>0:days[g.i].cM>days[g.i].cA;
    ART.forEach(r=>{
      const inMat=MATARESE.has(r);
      if(eccesso?!inMat:inMat)return;
      if(_hkFissa(r))return;   // camere mai spostabili: non vanno nemmeno elencate
      const s=stato[r][g.i];
      if(s!=='partenza'&&s!=='cambio')return;
      const tipo=pianoData.tipi[r]||'—';
      const X=(BL[r]||[]).find(b=>b.end===g.i&&!b.openEnd);
      let perche;
      if(!X)perche='soggiorno non ricostruibile dal Piano';
      else if(X.start<todayIdx)perche='ospite già in casa da prima';
      else{
        const contro=ART.filter(o=>MATARESE.has(o)!==inMat&&pianoData.tipi[o]===tipo);
        if(!contro.length)perche='nessuna camera '+_hkTipoLbl(tipo)+' dall\'altro lato';
        else{
          // "Occupata" da sola non basta a spiegare il blocco — dice PERCHÉ, guardando il
          // primo candidato (rappresentativo, non un'analisi esaustiva di tutti), invece
          // del generico "sono occupate" che non distingue un ospite già in casa da un
          // soggiorno semplicemente non spostabile altrove, né un blocco reale da un caso
          // con più occupanti non ricollocabili.
          const B=contro[0];
          const intralcio=(BL[B]||[]).filter(z=>_hkOverlap(_hkNights(X,N),_hkNights(z,N)));
          if(!intralcio.length)perche=`${B} risultava libera — riprova, potrebbe essere un caso limite`;
          else if(intralcio.length===1){
            const Y=intralcio[0];
            perche=!spostabile(Y)
              ?`${B} occupata da un ospite già in casa`
              :`${B} occupata da un soggiorno che non entra né in ${r} né altrove`;
          }else if(intralcio.some(z=>!spostabile(z))){
            perche=`${B} occupata da più soggiorni, incluso un ospite già in casa`;
          }else{
            perche=`${B} occupata da più soggiorni sovrapposti — non è stato possibile ricollocarli tutti`;
          }
        }
      }
      out.ostacoli.push({giorno:g.i,camera:r,tipo:_hkTipoLbl(tipo),perche});
    });
  }
  return out;
}
function _hkNum(n){return n.toLocaleString('it-IT',{minimumFractionDigits:n%1?1:0,maximumFractionDigits:1});}
// Prima/dopo di un giorno: mostra le partenze se cambiano, altrimenti il carico — così una
// riga non sembra mai un "2-4 → 2-4" senza effetto quando il guadagno è sul solo carico.
function _hkEffTxt(l,e){
  const cambiaP=e.daP[0]!==e.aP[0]||e.daP[1]!==e.aP[1];
  return cambiaP
    ?`${l}: ${e.daP[0]}-${e.daP[1]} → ${e.aP[0]}-${e.aP[1]}`
    :`${l}: carico ${_hkNum(e.daC[0])}-${_hkNum(e.daC[1])} → ${_hkNum(e.aC[0])}-${_hkNum(e.aC[1])}`;
}
function _hkSgn(n){return(n>0?'+':'')+_hkNum(n);}
// Quante mosse mostrare oltre le prime 3 — "Ci sono altre possibilità?" alza il tetto,
// invece di rigenerare da capo: le alternative in più esistevano già, erano solo tagliate.
let _hkSuggMoreN=0;
function hkSuggMore(){_hkSuggMoreN+=5;try{renderRoomDivision(pianoNavIdx);}catch(e){}}
function renderHkSuggestions(focusIdx){
  const s=hkSuggestMoves(3+_hkSuggMoreN,focusIdx);
  const fLbl=(pianoData&&pianoData.giorni&&pianoData.giorni[focusIdx]&&pianoData.giorni[focusIdx].label)||'';
  // Il titolo dice di quale giorno si sta parlando: i suggerimenti seguono il giorno
  // selezionato nella suddivisione cameriere qui sopra, non la settimana intera.
  const titolo=s.focus&&fLbl?'💡 Come bilanciare '+fLbl:'💡 Come bilanciare la settimana';
  const box=(inner,tint)=>`<div style="border-top:1px solid var(--border-light);margin-top:14px;padding-top:14px;">
    <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">${titolo}</div>${inner}</div>`;
  if(!s.ok){
    if(s.motivo==='tipi')return box(`<div style="background:var(--amber-bg);color:var(--amber);border-radius:8px;padding:10px 14px;font-size:12.5px;font-weight:600;">Ricarica il Piano Settimanale per attivare i suggerimenti — quello in memoria è stato caricato prima di questa funzione e non contiene le tipologie camera.</div>`);
    return'';
  }
  const lbl=i=>((pianoData.giorni[i]&&pianoData.giorni[i].label)||'—');
  // Diagnosi per giorno: è il singolo giorno che le housekeeper confrontano tra loro,
  // non il totale della settimana (che può chiudere 27 a 27 con dentro un 6 contro 3).
  const pill=(l,pM,pA,col)=>`<span style="display:inline-flex;align-items:center;gap:6px;background:var(--${col}-bg);border:1px solid var(--${col});border-radius:7px;padding:4px 10px;font-size:12px;">
      <strong style="color:var(--${col});">${l}</strong>
      <span style="color:var(--text-muted);font-variant-numeric:tabular-nums;">${pM} <span style="color:var(--text-dim);">Mat</span> · ${pA} <span style="color:var(--text-dim);">Altre</span></span>
    </span>`;
  // Con un giorno selezionato la testa parla di quel giorno; gli altri giorni squilibrati
  // restano come promemoria cliccabile ("cambia giorno per i suoi suggerimenti").
  let testa;
  if(s.focus){
    const f=s.focus,altri=s.sbilanciati.filter(g=>g.i!==f.i);
    const suo=f.passato
      ?`<div style="font-size:12.5px;color:var(--text-dim);">${fLbl} è già passato: niente da riorganizzare.</div>`
      :(f.sbilanciato
        ?`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            ${pill(fLbl,f.pM,f.pA,'amber')}
            <span style="font-size:11.5px;color:var(--text-dim);font-variant-numeric:tabular-nums;">carico ${_hkNum(f.cM)} · ${_hkNum(f.cA)}</span>
          </div>`
        :`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            ${pill(fLbl,f.pM,f.pA,'green')}
            <span style="font-size:12.5px;color:var(--green);font-weight:600;">✓ già equilibrato</span>
          </div>`);
    testa=`<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border-light);">
      <div style="font-size:9.5px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.04em;margin-bottom:7px;">Partenze del giorno selezionato</div>
      ${suo}
      ${altri.length?`<div style="font-size:12px;color:var(--text-muted);margin-top:9px;line-height:1.5;">Altri giorni da sistemare: ${altri.map(g=>`<strong style="color:var(--amber);">${lbl(g.i)}</strong> ${g.pM}-${g.pA}`).join(' · ')} — spostati su quel giorno con ‹ › per i suoi suggerimenti.</div>`:''}
    </div>`;
  }else{
    testa=s.sbilanciati.length
      ?`<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border-light);">
          <div style="font-size:9.5px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.04em;margin-bottom:7px;">Giorni con partenze sbilanciate</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">${s.sbilanciati.map(g=>pill(lbl(g.i),g.pM,g.pA,'amber')).join('')}</div>
        </div>`
      :`<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border-light);font-size:12.5px;color:var(--green);font-weight:600;">✓ Nessun giorno con partenze sbilanciate da oggi in avanti.</div>`;
  }
  if(!s.mosse.length){
    // Giorno passato o già in pari: la testa ha già detto tutto, non serve un secondo box.
    if(s.focus&&(s.focus.passato||!s.focus.sbilanciato))return box(testa);
    if(!s.focus&&!s.sbilanciati.length)return box(testa+`<div style="background:var(--green-bg);color:var(--green);border-radius:8px;padding:10px 14px;font-size:12.5px;font-weight:600;">✓ Nessuno scambio necessario.</div>`);
    if(!s.diag)return box(testa);
    // Nessuna mossa possibile: invece di un generico "non si può", spiega camera per
    // camera cosa blocca il giorno peggiore. Serve a capire se il vincolo è strutturale
    // (una tipologia che sta tutta da un lato) o solo di disponibilità in quelle notti.
    const g=s.diag;
    const righe=s.ostacoli.map(o=>`<div style="display:flex;gap:10px;padding:7px 0;font-size:12.5px;">
        <span style="font-weight:700;color:var(--text);min-width:52px;">${o.camera}</span>
        <span style="color:var(--text-muted);min-width:62px;">${o.tipo}</span>
        <span style="color:var(--text);flex:1;">${o.perche}</span>
      </div>`).join('');
    return box(testa+`<div style="background:var(--surface2);border-radius:8px;padding:12px 14px;">
      <div style="font-size:13px;color:var(--text);line-height:1.55;margin-bottom:${righe?'8px':'0'};">Nessuno scambio possibile con le regole attuali. Perché <strong style="color:var(--text);">${lbl(g.i)}</strong> resta ${g.dp!==0?`${g.pM}-${g.pA}`:`con il carico a ${_hkNum(s.giorni[g.i].cM)}-${_hkNum(s.giorni[g.i].cA)}`}${righe?':':' non ci sono camere riassegnabili in quel giorno.'}</div>
      ${righe}
      ${righe?`<div style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.5;">Se il blocco è la tipologia, l'unico modo per sbloccarlo è consentire scambi tra tipologie diverse (es. a parità di capienza).</div>`:''}
    </div>`);
  }
  const frecciaG=`<span style="color:var(--text-dim);font-weight:400;">→</span>`;
  const frecciaB=`<span style="color:var(--accent);font-weight:400;">⇄</span>`;
  // Una riprotezione si può spostare come una prenotazione, ma va detto: chi legge deve
  // sapere che sta muovendo un blocco camera e non un ospite.
  const tagRip=`<span style="background:var(--amber-bg);color:var(--amber);border-radius:4px;padding:1px 5px;font-size:9.5px;font-weight:700;margin-left:4px;">riprotezione</span>`;
  const righe=s.mosse.map((m,i)=>{
    const periodo=(m.start===m.end?lbl(m.start):lbl(m.start)+' → '+lbl(m.end))+(m.xSpec?tagRip:'');
    const perY=m.yStart!=null?((m.yStart===m.yEnd?lbl(m.yStart):lbl(m.yStart)+' → '+lbl(m.yEnd))+(m.ySpec?tagRip:'')):'';
    let titolo,dett;
    if(m.tipo==='scambia'){
      titolo=`${m.from} ${frecciaB} ${m.to}`;
      dett=`scambio col soggiorno ${perY} di ${m.to}`;
    }else if(m.tipo==='catena'){
      // Due spostamenti in sequenza: va detto chiaramente, sono due operazioni nel PMS
      titolo=`${m.from} ${frecciaG} ${m.to} ${frecciaG} ${m.via}`;
      dett=`2 spostamenti: sposta prima ${perY} da ${m.to} a ${m.via}, poi ${periodo} da ${m.from} a ${m.to}`;
    }else if(m.tipo==='catena-multi'){
      // Più soggiorni sovrapposti in "to", ognuno ricollocato in una camera diversa
      // della stessa tipologia — va detto quanti spostamenti servono davvero, non solo 2.
      const viaLbl=v=>(v.start===v.end?lbl(v.start):lbl(v.start)+' → '+lbl(v.end))+(v.speciale?tagRip:'');
      titolo=`${m.from} ${frecciaG} ${m.to} <span style="font-size:11px;color:var(--text-dim);font-weight:600;">(+${m.vias.length} camere)</span>`;
      dett=`${1+m.vias.length} spostamenti: ${m.vias.map(v=>`${m.to}→${v.room} (${viaLbl(v)})`).join(', ')}, poi ${periodo} da ${m.from} a ${m.to}`;
    }else if(m.tipo==='scambio-blocco'){
      // Non un soggiorno alla volta: TUTTE le prenotazioni future delle due camere si
      // scambiano in un colpo solo — chi è già in casa resta dov'è fisicamente.
      titolo=`${m.from} ${frecciaB} ${m.to} <span style="font-size:11px;color:var(--text-dim);font-weight:600;">(tutta la settimana)</span>`;
      dett=`scambio in blocco: ${m.nA} prenotazion${m.nA===1?'e':'i'} future da ${m.from} a ${m.to}, ${m.nB} da ${m.to} a ${m.from} — chi è già in casa resta dov'è`;
    }else{
      titolo=`${m.from} ${frecciaG} ${m.to}`;
      dett=`${m.to} libera in quelle notti`;
    }
    return`<div style="display:flex;align-items:center;gap:14px;padding:11px 0;${i>0?'border-top:1px solid var(--border-light);':''}">
      <span style="width:22px;height:22px;border-radius:50%;background:var(--accent-bg);color:var(--accent);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:700;color:var(--text);">${titolo}</div>
        <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px;line-height:1.4;">soggiorno ${periodo} · ${_hkTipoLbl(m.cat)} · ${dett}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;font-variant-numeric:tabular-nums;">
        ${(s.focus?[...m.effetti].sort((a,b)=>(a.i===s.focus.i?-1:0)-(b.i===s.focus.i?-1:0)):m.effetti).slice(0,3).map(e=>{
          const isF=s.focus&&e.i===s.focus.i;   // il giorno che si sta guardando va in evidenza
          return`<div style="font-size:11.5px;color:var(--green);font-weight:${isF?'800':'600'};white-space:nowrap;${isF?'':'opacity:.75;'}">${_hkEffTxt(lbl(e.i),e)}</div>`;
        }).join('')}
        ${m.effetti.length>3?`<div style="font-size:11px;color:var(--text-muted);">+${m.effetti.length-3} altri giorni</div>`:''}
        ${(m.peggiori||[]).slice(0,2).map(e=>`<div style="font-size:11px;color:var(--amber);font-weight:600;white-space:nowrap;">${_hkEffTxt(lbl(e.i),e)}</div>`).join('')}
      </div>
    </div>`;
  }).join('');
  const haPegg=s.mosse.some(m=>(m.peggiori||[]).length);
  const nota=`<div style="font-size:12px;color:var(--text-muted);margin-top:10px;line-height:1.55;">I numeri a destra sono il prima e dopo di ogni giorno (Matarese-Altre): le <strong style="color:var(--text);">partenze</strong> se cambiano, il <strong style="color:var(--text);">carico</strong> se la mossa riequilibra solo quello${s.focus?`. <strong style="color:var(--text);">${fLbl}</strong> è in evidenza`:''}${haPegg?`; in <span style="color:var(--amber);font-weight:700;">ambra</span> i giorni che peggiorano — il bilancio complessivo resta comunque migliore`:''}. ${s.focus?`Sono elencate solo le mosse che migliorano <strong style="color:var(--text);">${fLbl}</strong>: cambia giorno per vedere le sue.`:`L'obiettivo è pareggiare ogni singolo giorno, non solo il totale della settimana.`} Solo stessa tipologia e solo prenotazioni non ancora arrivate. Da applicare a mano nel PMS: Compass non modifica nulla.</div>`;
  // "Ci sono altre possibilità?" — mostra solo se esistono davvero altre alternative già
  // calcolate e tagliate dal limite mosse mostrate, non un pulsante sempre presente a vuoto.
  const altreN=s.totMosse-s.mosse.length;
  const altreBtn=altreN>0
    ?`<button onclick="hkSuggMore()" style="margin-top:10px;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:7px 14px;border-radius:7px;font-size:11.5px;font-weight:600;cursor:pointer;">Ci sono altre possibilità? <span style="color:var(--text-dim);font-weight:400;">(+${Math.min(altreN,5)})</span></button>`
    :'';
  return box(testa+righe+altreBtn+nota);
}
// Contenitore per la vista settimanale — popolato via _bkfChartRender() (stesso motore
// SVG di Breakfast/Occupazione: barra accent + linea rossa tratteggiata) subito dopo
// che questo markup viene inserito nel DOM, così lo stile del grafico resta sempre
// identico in tutta la dashboard invece di reinventarlo con div colorati ad-hoc.
// Stesso schema di "Andamento occupazione settimanale": grafico a sinistra, dati a
// destra separati da un bordo, stessa altezza (240px).
function renderHkWeekViewContainer(){
  let totPartM=0,totFermM=0,totPartA=0,totFermA=0;
  pianoData.giorni.forEach(g=>{
    const{m,a}=splitSoulart(g.soulart||{});
    totPartM+=(m.partenze?.length||0)+(m.cambi?.length||0);
    totFermM+=(m.fermate?.length||0);
    totPartA+=(a.partenze?.length||0)+(a.cambi?.length||0);
    totFermA+=(a.fermate?.length||0);
  });
  const totM=totPartM+totFermM,totA=totPartA+totFermA;
  const diff=totM-totA;
  const diffTxt=diff===0?'Bilanciato':(diff>0?`Matarese +${diff} rispetto ad Altre`:`Altre +${-diff} rispetto a Matarese`);
  const diffColor=Math.abs(diff)<=2?'var(--green)':'var(--amber)';
  const row=(lbl,vM,vA)=>`<div style="margin-bottom:10px;">
      <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;margin-bottom:3px;">${lbl}</div>
      <div style="display:flex;gap:20px;align-items:baseline;">
        <div><span style="font-size:22px;font-weight:300;line-height:1;color:var(--accent);">${vM}</span><div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Matarese</div></div>
        <div><span style="font-size:22px;font-weight:300;line-height:1;color:#5b7ca3;">${vA}</span><div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Altre</div></div>
      </div>
    </div>`;
  return`<div class="side-split" style="margin-top:14px;border-top:1px solid var(--border-light);padding-top:14px;">
    <div class="side-split-main">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;">Vista settimanale (carico pesato)</div>
      <div style="font-size:13px;font-weight:500;color:var(--text-muted);line-height:1.5;margin-bottom:10px;">Il numero sopra ogni colonna non è il totale camere: una partenza pesa 2 e una fermata 1 (2,5 e 1,5 per le camere Art 1,2,3,8,9,13, più impegnative) — es. 6 partenze + 3 fermate = 15.</div>
      <div id="hk-week-chart" style="width:100%;box-sizing:border-box;height:300px;display:flex;flex-direction:column;"></div>
    </div>
    <div class="side-split-aside">
      <div class="kpi-label" style="margin-bottom:8px;">Totale settimana</div>
      ${row('Partenze',totPartM,totPartA)}
      ${row('Fermate',totFermM,totFermA)}
      <div style="border-top:1px solid var(--border-light);padding-top:8px;margin-bottom:8px;">${row('Totali',totM,totA)}</div>
      <div style="border-top:1px solid var(--border-light);padding-top:8px;margin-bottom:10px;"><div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;">Bilanciamento</div><div style="font-size:16px;font-weight:700;color:${diffColor};margin-top:6px;">${diffTxt}</div></div>
      <button onclick="setView('hkpsheet')" style="font-size:var(--fs-xs);padding:9px 16px;border:1px solid var(--accent);border-radius:7px;background:var(--accent-bg);color:var(--accent);cursor:pointer;font-weight:600;white-space:nowrap;">Operativa HKP SoulArt</button>
    </div>
  </div>`;
}
// Matarese e Altre come due colonne affiancate per giorno (non barra+linea) — stessa
// griglia/etichette/font del grafico standard (_bkfChartRender). Colori: quelli già
// stabiliti nel riquadro Housekeeping stesso (accent navy e verde di "Fermata"), non
// nuovi colori introdotti solo per questo grafico.
function renderHkWeekChart(activeIdx){
  const el=document.getElementById('hk-week-chart');if(!el)return;
  const pts=pianoData.giorni.map(g=>{
    const{m,a}=splitSoulart(g.soulart||{});
    return{label:(g.label?g.label.split(' ')[0]:'?').substring(0,3),cm:hkCarico(m),ca:hkCarico(a)};
  });
  if(!pts.length){el.innerHTML='<div style="margin:auto;color:var(--text-dim);font-size:var(--fs-xs);">Carica il piano settimana per vedere il grafico</div>';return;}
  const W=600,H=290,PL0=34,PR0=14,PT=26,PB=28;
  const plotW0=W-PL0-PR0,plotH=H-PT-PB;
  const YMAX=Math.max(10,...pts.map(p=>Math.max(p.cm,p.ca)))+5;
  const groupW=Math.min(58,plotW0/pts.length*0.72),barW=groupW/2-1;
  const AXGAP=20; // spazio vuoto tra la linea/etichette dell'asse verticale e la prima colonna
  const PL=PL0+groupW/2+AXGAP,PR=PR0+groupW/2;
  const plotW=W-PL-PR;
  const sx=i=>PL+i/(pts.length-1||1)*plotW;
  const sy=v=>PT+plotH-(v/YMAX)*plotH;
  let svg=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="width:100%;flex:1;min-height:0;display:block;">`;
  for(let v=0;v<=YMAX;v+=Math.ceil(YMAX/4/5)*5){
    const y=sy(v);
    svg+=`<line x1="${PL0}" y1="${y}" x2="${W-PR+groupW/2}" y2="${y}" stroke="var(--border-light)" stroke-width="${v===0?1.5:1}"/>`;
    svg+=`<text x="${PL0-4}" y="${y+4}" font-size="11" fill="var(--text-dim)" text-anchor="end">${v}</text>`;
  }
  pts.forEach((p,i)=>{
    const x=sx(i),isActive=i===activeIdx;
    const ym=sy(p.cm),ya=sy(p.ca);
    svg+=`<rect x="${x-barW-3}" y="${ym}" width="${barW}" height="${sy(0)-ym}" rx="4" fill="var(--accent)" stroke="var(--accent)" stroke-width="1.5"/>`;
    svg+=`<rect x="${x+3}" y="${ya}" width="${barW}" height="${sy(0)-ya}" rx="4" fill="#e8f0f8" stroke="var(--accent)" stroke-width="1.5"/>`;
    svg+=`<text x="${x-barW-3+barW/2}" y="${ym-6}" font-size="11" font-weight="700" fill="var(--accent)" text-anchor="middle">${p.cm}</text>`;
    svg+=`<text x="${x+3+barW/2}" y="${ya-6}" font-size="11" font-weight="700" fill="var(--accent)" text-anchor="middle">${p.ca}</text>`;
    svg+=`<text x="${x}" y="${H-8}" font-size="11" fill="${isActive?'var(--accent)':'var(--text-dim)'}" font-weight="${isActive?'700':'400'}" text-anchor="middle">${p.label}</text>`;
  });
  svg+='</svg>';
  el.innerHTML=`${svg}<div style="display:flex;gap:14px;flex-shrink:0;margin-top:2px;">
    <span style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-dim);"><span style="width:10px;height:10px;background:var(--accent);border-radius:2px;display:inline-block;"></span>Matarese</span>
    <span style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-dim);"><span style="width:10px;height:10px;background:#e8f0f8;border:1px solid var(--accent);border-radius:2px;display:inline-block;"></span>Altre housekeeper</span>
  </div>`;
}

function renderPianoGiorno(elId,refDate,forceIdx){
  const el=document.getElementById(elId);if(!el)return;
  if(!pianoData||!pianoData.giorni||!pianoData.giorni.length){
    const _mob=window.innerWidth<=768;
    el.innerHTML=`<div style="color:var(--text-dim);font-size:var(--fs-xs);">${_mob?'Piano non caricato — caricare da PC':'Carica il piano settimana per vedere i cambi camera'}</div>`;return;
  }
  let idx=forceIdx!=null?forceIdx:pianoGetGiornoIdx(refDate);
  if(idx===-1){el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Oggi non è nel piano caricato</div>';return;}
  const giorno=pianoData.giorni[idx];
  if(!giorno){el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Giorno non disponibile</div>';return;}
  function sortRooms(arr){return[...arr].sort((a,b)=>{const na=parseInt(a.replace(/\D/g,''))||0,nb=parseInt(b.replace(/\D/g,''))||0;return na-nb;});}
  function renderHotel(label,data){
    const cambi=sortRooms(data.cambi||[]),partenze=sortRooms(data.partenze||[]),fermate=sortRooms(data.fermate||[]);
    if(!cambi.length&&!partenze.length&&!fermate.length)return'';
    const dot=`<span style="position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:var(--red);animation:ucDotBlink 1.1s ease-in-out infinite;"></span>`;
    // Pillole conteggi: Partenza senza arrivo (neutra) / Partenza con arrivo (neutra + pallino rosso lampeggiante) / Fermata (verde)
    let h=`<div style="margin-bottom:10px;">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">${label}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
        ${partenze.length?`<div style="text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 14px;"><div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;">Partenza senza arrivo</div><div style="font-size:17px;font-weight:700;color:var(--text);">${partenze.length}</div></div>`:''}
        ${cambi.length?`<div style="position:relative;text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 14px;">${dot}<div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;">Partenza con arrivo</div><div style="font-size:17px;font-weight:700;color:var(--text);">${cambi.length}</div></div>`:''}
        ${fermate.length?`<div style="text-align:center;background:var(--green-bg);border:1px solid var(--green);border-radius:8px;padding:6px 14px;"><div style="font-size:9px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.03em;">Fermata</div><div style="font-size:17px;font-weight:700;color:var(--green);">${fermate.length}</div></div>`:''}
      </div>`;
    const groupLbl=t=>`<div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px;">${t}</div>`;
    if(partenze.length)h+=`<div style="margin-bottom:8px;">${groupLbl('Partenza senza arrivo')}<div class="room-chip-grid">${partenze.map(r=>`<span style="background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;">${r}</span>`).join('')}</div></div>`;
    if(cambi.length)h+=`<div style="margin-bottom:8px;">${groupLbl('Partenza con arrivo')}<div class="room-chip-grid">${cambi.map(r=>`<span style="position:relative;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:11px;font-weight:700;padding:4px 16px 4px 10px;border-radius:7px;">${r} ⇄<span style="position:absolute;top:3px;right:5px;width:6px;height:6px;border-radius:50%;background:var(--red);animation:ucDotBlink 1.1s ease-in-out infinite;"></span></span>`).join('')}</div></div>`;
    if(fermate.length)h+=`<div>${groupLbl('Fermata')}<div class="room-chip-grid">${fermate.map(r=>`<span style="background:var(--green-bg);border:1px solid var(--green);color:var(--green);font-size:11px;font-weight:600;padding:4px 10px;border-radius:7px;">${r}</span>`).join('')}</div></div>`;
    h+=`</div>`;return h;
  }
  const lib=giorno.liborio||{partenze:[],fermate:[],cambi:[]};
  const bMerged={partenze:[...(giorno.boutique?.partenze||[]),...lib.partenze],fermate:[...(giorno.boutique?.fermate||[]),...lib.fermate],cambi:[...(giorno.boutique?.cambi||[]),...lib.cambi]};
  const sHtml=renderHotel('SoulArt',giorno.soulart||{}),bHtml=renderHotel('Boutique - San Liborio',bMerged);
  if(!sHtml&&!bHtml){el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Nessuna camera nel piano per questo giorno</div>';return;}
  const cols=sHtml&&bHtml
    ?`<div class="piano-cols">
        <div class="piano-col">${sHtml}</div>
        <div class="piano-cols-div"></div>
        <div class="piano-col">${bHtml}</div>
      </div>`
    :`${sHtml}${bHtml}`;
  el.innerHTML=`${cols}<div style="font-size:9px;color:var(--text-dim);margin-top:8px;">↑ partenza senza arrivo · = fermata · ⇄ partenza con arrivo</div>`;
}

// §§ ROOM DIVISION — Suddivisione cameriere, vista settimanale carico pesato e
// riepiloghi mensili SoulArt/Boutique. Spostati fuori dalla card Housekeeping
// dell'Overview in una view dedicata del menu laterale (stesso pianoNavIdx/giorno
// condiviso con "Piano del giorno" — cambiare giorno da un pannello aggiorna anche
// l'altro).
function renderRoomDivision(idx){
  const el=document.getElementById('rd-content');if(!el)return;
  if(!pianoData||!pianoData.giorni||!pianoData.giorni.length){
    el.innerHTML=`<div style="color:var(--text-dim);font-size:var(--fs-xs);">Carica il piano settimana per vedere la suddivisione cameriere</div>`;return;
  }
  const giorno=pianoData.giorni[idx];
  if(!giorno){el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Giorno non disponibile</div>';return;}
  function sortRooms(arr){return[...arr].sort((a,b)=>{const na=parseInt(a.replace(/\D/g,''))||0,nb=parseInt(b.replace(/\D/g,''))||0;return na-nb;});}
  function renderCameriera(name,rooms){
    const cambi=sortRooms(rooms.cambi||[]),partenze=sortRooms(rooms.partenze||[]),fermate=sortRooms(rooms.fermate||[]);
    if(!cambi.length&&!partenze.length&&!fermate.length)return'';
    const chip=(r,isCambio)=>isCambio
      ?`<span style="position:relative;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:11px;font-weight:700;padding:4px 16px 4px 10px;border-radius:7px;">${r} ⇄<span style="position:absolute;top:3px;right:5px;width:6px;height:6px;border-radius:50%;background:var(--red);animation:ucDotBlink 1.1s ease-in-out infinite;"></span></span>`
      :`<span style="background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;">${r}</span>`;
    const nPart=cambi.length+partenze.length;
    const carico=hkCarico({partenze,cambi,fermate});
    const caricoTxt=carico.toLocaleString('it-IT',{minimumFractionDigits:carico%1?1:0,maximumFractionDigits:1});
    let h=`<div style="flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px;">${name}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
        ${nPart?`<span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;background:var(--surface2);border:1px solid var(--border);color:var(--text);">🛫 ${nPart} partenz${nPart===1?'a':'e'}</span>`:''}
        ${fermate.length?`<span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;background:var(--green-bg);border:1px solid var(--green);color:var(--green);">🛏 ${fermate.length} fermat${fermate.length===1?'a':'e'}</span>`:''}
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;background:var(--surface);border:1px solid var(--border);color:var(--text-dim);" title="Carico pesato: partenza=${HK_WEIGHT_PARTENZA} (${HK_WEIGHT_PARTENZA_HEAVY} per Art 1,2,3,8,9,13), fermata=${HK_WEIGHT_FERMATA} (${HK_WEIGHT_FERMATA_HEAVY} per Art 1,2,3,8,9,13)"><span style="font-size:24px;line-height:1;color:var(--text);position:relative;top:1px;">⚖</span><span>Carico pesato: <strong style="color:var(--text);">${caricoTxt}</strong></span></span>
      </div>`;
    if(nPart){
      h+=`<div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px;">🛫 Partenze</div>`;
      h+=`<div class="room-chip-grid" style="margin-bottom:8px;">${partenze.map(r=>chip(r,false)).join('')}${cambi.map(r=>chip(r,true)).join('')}</div>`;
    }
    if(fermate.length){
      h+=`<div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px;">🛏 Fermate</div>`;
      h+=`<div class="room-chip-grid">${fermate.map(r=>`<span style="background:var(--green-bg);border:1px solid var(--green);color:var(--green);font-size:11px;font-weight:600;padding:4px 10px;border-radius:7px;">${r}</span>`).join('')}</div>`;
    }
    h+=`</div>`;return h;
  }
  // Suddivisione cameriere SoulArt (Matarese / Altre) — sola lettura, stesso elenco fisso
  // camere dell'app smartphone, per controllare il risultato del bilanciamento carico
  // fatto spostando le camere sul PMS prima di caricare il Piano Settimana.
  let mHtml='';
  const {m,a}=splitSoulart(giorno.soulart);
  const mCard=renderCameriera('Matarese',m),aCard=renderCameriera('Altre housekeeper',a);
  if(mCard||aCard){
    mHtml=`<div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">👥 Suddivisione cameriere — SoulArt</span>
        <div style="display:flex;align-items:center;gap:4px;margin-left:auto;">
          <button onclick="pianoPrevDay()" style="background:none;border:1px solid var(--border);border-radius:5px;padding:2px 8px;cursor:pointer;font-size:14px;color:var(--text-dim);">‹</button>
          <span style="font-size:var(--fs-xxs);color:var(--text-dim);min-width:60px;text-align:center;">${giorno.label||'—'}</span>
          <button onclick="pianoNextDay()" style="background:none;border:1px solid var(--border);border-radius:5px;padding:2px 8px;cursor:pointer;font-size:14px;color:var(--text-dim);">›</button>
        </div>
      </div>
      <div style="display:flex;gap:20px;align-items:stretch;">
        ${mCard||'<div style="flex:1;"></div>'}
        <div style="width:1px;background:var(--border-light);flex-shrink:0;"></div>
        ${aCard||'<div style="flex:1;"></div>'}
      </div>
      ${renderHkWeekViewContainer()}
    </div>`;
  }else{
    mHtml=`<div style="color:var(--text-dim);font-size:var(--fs-xs);">Nessun cambio/partenza/fermata SoulArt per questo giorno.</div>`;
  }
  // Replica delle card "Riepilogo cameriere" di Operativa Housekeeping — SoulArt e
  // Boutique/San Liborio (stessa fonte dati e stesso mese selezionato lì), per non
  // dover aprire quella vista. Mostrate come due card cliccabili (chiuse di default,
  // stato ricordato in _hkMonthlyOpen) invece che sempre aperte — "Suddivisione
  // cameriere" sopra resta invece sempre visibile perché usata di continuo.
  const monthlyCardsSa=hkpMonthlyCameriereHtml('sa',row=>row.name.toUpperCase().startsWith('ART'),'al SoulArt',22);
  const monthlyCardsBh=hkpMonthlyCameriereHtml('sa',row=>!row.name.toUpperCase().startsWith('ART'),'al Boutique',11);
  const _hkTile=(key,label,sub)=>`<div onclick="hkMonthlyToggle('${key}')" style="flex:1;background:#fff;border:1px solid var(--border-light);border-radius:9px;padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;">
    <span style="font-size:18px;">🧹</span>
    <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:var(--text);">${label}</div><div style="font-size:10.5px;color:var(--text-dim);">${sub}</div></div>
    <span id="hk-monthly-chev-${key}" style="font-size:11px;color:var(--text-dim);transition:transform .2s;${_hkMonthlyOpen[key]?'transform:rotate(180deg);':''}">▾</span>
  </div>`;
  const monthlyHtml=(monthlyCardsSa||monthlyCardsBh)?`<div style="border-top:1px solid var(--border-light);margin-top:14px;padding-top:14px;">
    <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Riepiloghi mensili</div>
    <div style="display:flex;gap:10px;">
      ${monthlyCardsSa?_hkTile('sa','Riepilogo Housekeepers SoulArt','Camere Art · mese in corso'):''}
      ${monthlyCardsBh?_hkTile('bh','Riepilogo Housekeepers Boutique','Camere 200 + Liborio · mese in corso'):''}
    </div>
    ${monthlyCardsSa?`<div id="hk-monthly-sa" style="display:${_hkMonthlyOpen.sa?'block':'none'};margin-top:12px;">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;line-height:1.5;">Solo camere SoulArt (Art).<br>Per il totale con anche il Boutique: vedi Operativa HKP.</div>
      ${monthlyCardsSa}
    </div>`:''}
    ${monthlyCardsBh?`<div id="hk-monthly-bh" style="display:${_hkMonthlyOpen.bh?'block':'none'};margin-top:12px;">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;line-height:1.5;">Solo camere Boutique (200) e San Liborio.<br>Per il totale con anche il SoulArt: vedi Operativa HKP.</div>
      ${monthlyCardsBh}
    </div>`:''}
  </div>`:'';
  let sugg='';
  // I suggerimenti seguono il giorno selezionato con ‹ › qui sopra: chi guarda mercoledì
  // vuole sapere come sistemare mercoledì, non la settimana in generale.
  try{sugg=renderHkSuggestions(idx);}catch(e){sugg='';}
  el.innerHTML=`${mHtml}${sugg}${monthlyHtml}`;
  if(mCard||aCard)renderHkWeekChart(idx);
}

// Box "Distribuzione Culligan" — accanto al grafico occupazione in Piano del giorno.
// Stessa fonte/logica dell'app smartphone (controllo-mattino.html → _applyPianoLibere)
// prima di iniziare il ritiro: camere Art occupate secondo il Piano Settimana
// (partenze+fermate+cambi), non il Riepilogo Reception (fonte diversa, numeri diversi).
function renderOvCulliganBox(giorno){
  const el=document.getElementById('ov-culligan-box');if(!el)return;
  if(!giorno){el.innerHTML='';return;}
  let cmN=0;
  try{
    const sa=giorno.soulart||{};
    const inPlan=new Set([...(sa.partenze||[]),...(sa.fermate||[]),...(sa.cambi||[])]);
    cmN=inPlan.size;
  }catch(e){}
  const stats=_cmPianoStats;
  const hasContent=cmN>0||(stats&&(stats.cur>0||stats.prev>0));
  if(!hasContent){el.innerHTML='';return;}
  const todayLine=cmN>0?`<div style="display:flex;align-items:baseline;gap:8px;${stats?'margin-bottom:10px;':''}">
    <span style="font-size:30px;font-weight:300;line-height:1;">${cmN}</span>
    <span style="font-size:11px;color:var(--text-dim);">camere da controllare oggi</span>
  </div>`:'';
  const statsLine=stats?`<div style="display:flex;gap:20px;${cmN>0?'border-top:1px solid var(--border-light);padding-top:10px;':''}">
    <div><div style="font-size:30px;font-weight:300;line-height:1;">${stats.prev}</div><div style="font-size:11px;color:var(--text-dim);margin-top:3px;">sostituzioni<br>sett. scorsa</div></div>
    <div><div style="font-size:30px;font-weight:300;line-height:1;">${stats.cur}</div><div style="font-size:11px;color:var(--text-dim);margin-top:3px;">sostituzioni<br>questa sett.</div></div>
  </div>`:'';
  el.innerHTML=`<div class="kpi-label" style="margin-bottom:8px;">Distribuzione Culligan</div>${todayLine}${statsLine}`;
}

// Stato di preparazione delle camere in partenza/cambio oggi, segnato dal QM sullo
// smartphone mentre gira per la riconsegna bottiglie (app Culligan → togglePronta()).
// Letto qui dallo stesso stato giornaliero (qm_cm_YYYY-MM-DD) via KV: la reception lo
// vede in tempo reale senza dover chiedere via radio/telefono se una camera è pronta.
// Escluse le camere in fermata: l'ospite è già dentro, "pronta" non ha senso per loro.
let _ovReadinessGiorno=null;                // ultimo giorno renderizzato, per ri-renderizzare dopo un click
// statoNoto: stato giornaliero già in mano al chiamante. Serve dopo un clic sulla card —
// senza, il render rileggeva dal cloud mentre la scrittura era ancora in volo e poteva
// tornare il valore vecchio: la card non cambiava e sembrava servisse un secondo clic.
async function renderOvRoomReadiness(giorno,statoNoto){
  _ovReadinessGiorno=giorno;
  const el=document.getElementById('ov-room-readiness');if(!el)return;
  if(!giorno){el.innerHTML='';return;}
  const sa=giorno.soulart||{};
  // Due categorie, entrambe con un check-in oggi:
  //  - CAMBIO (partenza + arrivo): va rifatta, lo stato "pronta" lo decide chi passa;
  //  - ARRIVO PURO (nessuna partenza prima): la camera era già libera e pulita, quindi
  //    si mostra GIÀ PRONTA — prima mancava del tutto e la reception non vedeva un pezzo
  //    degli arrivi della giornata.
  // Le partenze pure restano fuori: senza un check-in successivo non devono essere
  // "pronte per qualcuno" entro un orario.
  const cambio=new Set(sa.cambi||[]);
  const arrivoPuro=new Set((sa.arrivi||[]).filter(r=>!cambio.has(r)));
  const rooms=CM_ROOMS.filter(r=>cambio.has(r)||arrivoPuro.has(r));
  if(!rooms.length){el.innerHTML='';return;}
  const d=new Date();
  const key='qm_cm_'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  let state=statoNoto||null;
  if(!state){
    try{
      const r=await fetch(PROXY+'/kv/get?key='+encodeURIComponent(key),{cache:'no-store'});
      if(r.ok){const j=await r.json();if(j&&j.value)state=JSON.parse(j.value);}
    }catch(e){}
    if(!state){try{const s=localStorage.getItem(key);if(s)state=JSON.parse(s);}catch(e){}}
  }
  // Card "day-tile" (stessa impaginazione delle card giorno di pianoNavRender: nome in
  // alto, cerchio icona, stato in fondo, bordo colorato in cima) applicata a ogni camera
  // invece che a un giorno della settimana. Un solo cerchio, che è lo stato: prima ce
  // n'era anche uno navy fisso con l'icona della camera, uguale su tutte le card — non
  // distingueva niente e rubava spazio. L'icona è un letto: liscio quando la camera è
  // pronta, con la coperta mossa quando non lo è.
  const _bedBase='<path d="M2 18v-6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6"/><path d="M6 10V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/>';
  const _bedSvg=d=>'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+_bedBase+d+'</svg>';
  const iconBedOk=_bedSvg('<path d="M2 14.5h20"/>');
  const iconBedNo=_bedSvg('<path d="M2.5 14.6c3-1.8 6 1.2 9-.6s6 1.2 9-.6"/>');
  const iconQ='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 1.8-2 3.3"/><circle cx="12" cy="17" r=".6" fill="#fff" stroke="none"/></svg>';
  const roomCard=r=>{
    // "verificata" = qualcuno ha DAVVERO scelto uno stato per questa camera — non basta
    // che esista una voce nello stato del giorno: _rs() in controllo-mattino.html crea
    // l'oggetto anche per motivi che non c'entrano con la preparazione (es. il conteggio
    // delle bottiglie da riconsegnare tocca ogni camera). Senza distinguerlo, una camera
    // mai controllata da nessuno risultava già "toccata" al solo aprire l'app Culligan,
    // e mostrava "Da verificare" invece del valore automatico. Il flag prontaVerificata
    // lo scrivono solo le scelte umane vere: chooseReady/cancelReadySheet/
    // scegliProntaPop in controllo-mattino.html, e ovMarkRoomPronta qui.
    const verificata=!!(state&&state[r]&&state[r].prontaVerificata);
    const p=verificata?state[r].pronta:undefined;
    // Un arrivo senza partenza precedente parte da "pronta" finché nessuno l'ha
    // verificata davvero: la camera non era occupata la notte prima, non c'è nulla da
    // rifare. Una volta verificata, pronta:null è un "Da verificare" scelto
    // esplicitamente (reset) e resta tale — non ricade sul valore automatico.
    const soloArrivo=arrivoPuro.has(r);
    const stato=p===true||p===false?p:(!verificata&&soloArrivo?true:null);
    const cfg=stato===true?{border:'var(--green)',icon:iconBedOk,iconBg:'var(--green)',fg:'var(--green)',lbl:'Pronta'}
      :stato===false?{border:'var(--red)',icon:iconBedNo,iconBg:'var(--red)',fg:'var(--red)',lbl:'Non pronta'}
      :{border:'var(--border)',icon:iconQ,iconBg:'var(--text-dim)',fg:'var(--text-dim)',lbl:'Da verificare'};
    const sotto=soloArrivo?'solo arrivo (pulita)':'partenza/arrivo';
    // Ciclo a tre stati con un clic solo: da verificare -> pronta -> non pronta -> da
    // verificare. Il terzo passaggio segna esplicitamente "da verificare" — vale anche
    // sulle camere con solo arrivo, che partono pronte di default ma una volta toccate
    // seguono il ciclo come tutte le altre (vedi la nota su "toccata" sopra).
    const _next=stato===true?{v:'false',t:'NON pronta'}
      :stato===false?{v:'null',t:'da verificare'}
      :{v:'true',t:'pronta'};
    // Cliccabile per segnarla pronta al volo da Compass — la fonte primaria resta
    // sempre l'app Culligan sul campo, questo è solo un override rapido per il QM
    // quando serve correggere senza aprire il telefono (scrive sulla stessa chiave KV).
    return`<div onclick="ovMarkRoomPronta('${r}',${_next.v})" title="Clicca per segnarla ${_next.t}" style="background:var(--surface);border:1px solid var(--border-light);border-top:3px solid ${cfg.border};border-radius:10px;padding:12px 8px 10px;text-align:center;cursor:pointer;transition:transform .12s;">
      <div style="font-size:15px;font-weight:700;color:var(--text);line-height:1;">${r}</div>
      <div style="font-size:11px;color:var(--text-dim);margin:2px 0 8px;line-height:1.35;min-height:30px;display:flex;align-items:center;justify-content:center;">${sotto}</div>
      <div style="display:flex;align-items:center;justify-content:center;margin-bottom:6px;">
        <div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${cfg.iconBg};flex-shrink:0;">${cfg.icon}</div>
      </div>
      <div style="font-size:13px;font-weight:700;color:${cfg.fg};">${cfg.lbl}</div>
    </div>`;
  };
  el.innerHTML=`<div class="kpi-label" style="border-top:1px solid var(--border-light);padding-top:12px;margin-bottom:8px;">🔑 Camere con check-in oggi — stato preparazione</div>
    <div class="ov-room-grid">${rooms.map(roomCard).join('')}</div>`;
}
// Segna una camera "pronta" direttamente da Overview — scrive sulla STESSA chiave KV
// (qm_cm_YYYY-MM-DD) che legge/scrive l'app Culligan sul campo, quella resta sempre la
// fonte primaria di verità: questo è solo un override rapido per il QM, non sostituisce
// il giro reale. Non tocca visited/checks/consegnata — solo il campo pronta e il ts.
// valore: true = pronta, false = non pronta, null = da verificare (torna allo stato di
// partenza). Lo passa la card in base a quello che sta mostrando, così un clic fa sempre
// avanzare il ciclo. Chiamata senza argomento: pronta, come faceva prima.
// null è lo stesso valore che controllo-mattino.html usa per "non ancora verificata",
// quindi l'app sul campo lo rilegge correttamente.
async function ovMarkRoomPronta(room,valore){
  const d=new Date();
  const key='qm_cm_'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  let state=null;
  try{
    const r=await fetch(PROXY+'/kv/get?key='+encodeURIComponent(key),{cache:'no-store'});
    if(r.ok){const j=await r.json();if(j&&j.value)state=JSON.parse(j.value);}
  }catch(e){}
  if(!state){try{const s=localStorage.getItem(key);if(s)state=JSON.parse(s);}catch(e){}}
  if(!state)state={};
  if(!state[room]){
    // Stessa forma di _defaultRoom() in controllo-mattino.html — se la camera non è
    // ancora stata toccata dall'app Culligan oggi, crea un oggetto compatibile invece
    // di scriverne uno parziale che confonderebbe l'app quando lo rilegge.
    const checks={};
    Object.keys(CM_LABELS).forEach(id=>checks[id]=true);
    state[room]={visited:false,libera:false,dnd:false,bottiglia:'consumata',checks,note:'',consegnata:false,pronta:null};
  }
  state[room].pronta=(valore===undefined?true:valore);
  // Stesso flag scritto da controllo-mattino.html (chooseReady/cancelReadySheet): segna
  // che QUESTO valore è una scelta vera, distinta da un oggetto creato per altri motivi
  // (es. il conteggio bottiglie tocca ogni camera senza che nessuno ne verifichi lo
  // stato). Senza questo, un clic da Compass su una camera mai controllata sarebbe
  // indistinguibile da quella stessa camera toccata solo di striscio dall'app Culligan.
  state[room].prontaVerificata=true;
  state[room].ts=Date.now();
  try{localStorage.setItem(key,JSON.stringify(state));}catch(e){}
  kvSet(key,JSON.stringify(state)).catch(()=>{});
  if(_ovReadinessGiorno)renderOvRoomReadiness(_ovReadinessGiorno,state);
}

function pianoOvInit(){
  if(!pianoData||!pianoData.giorni)return;
  const todayIdx=pianoGetGiornoIdx();
  const idx=todayIdx!==-1?todayIdx:0;
  pianoNavRender(idx);
}

// §§ UTILITÀ — FORMATTAZIONE DATE & TIMESTAMP (fmtNow, fmtUploadTs, setUploadTs)
function fmtNow(){const n=new Date();return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');}
function fmtUploadTs(ts){const n=ts?new Date(ts):new Date();const ms=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];return'↑ '+n.getDate()+' '+ms[n.getMonth()]+' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');}
const TS_TO_UC={turnoTs:'uc-turno-sub',arriviTs:'uc-arrivi-sub',pulTs:'uc-pul-sub',bkfTs:'uc-bkf-sub',soulTs:'uc-soul-sub',boutTs:'uc-bout-sub',pianoTs:'uc-piano-sub'};
// Soglie pallino tile Upload Center: >12h non aggiornato -> ambra lampeggiante,
// >24h -> rosso lampeggiante (quest'ultima soglia è anche quella storica di 'stale'
// usata da ucUpdateProgress per il conteggio X/6 — non cambiare il nome della classe).
function _ucStaleClasses(slot,ts){
  if(!slot)return;
  const age=ts?(Date.now()-ts):Infinity;
  slot.classList.toggle('stale',!!ts&&age>86400000);
  slot.classList.toggle('warn12',!!ts&&age>43200000&&age<=86400000);
}
function _setUcTs(elId,ts){
  const formatted=fmtUploadTs(ts);
  // Tag collassato (es. #uc-pul-sub) — visibile sempre
  const subId=TS_TO_UC[elId];
  if(subId){const sub=document.getElementById(subId);if(sub)sub.textContent=formatted;}
  // Div upload-ts nel pannello espanso (es. #pulTs) — visibile solo se aperto
  const tsEl=document.getElementById(elId);
  if(tsEl){tsEl.textContent=formatted;tsEl.classList.toggle('visible',!!ts);}
  if(elId==='turnoTs')return;
  if(subId){const slot=document.getElementById(subId.replace('-sub',''));
    _ucStaleClasses(slot,ts);}
}
function setUploadTs(elId,ts){const t=ts||Date.now();_setUcTs(elId,t);try{localStorage.setItem('qm_ts_'+elId,String(t));}catch(e){}}
function restoreUploadTs(elId,ts){if(!ts)return;try{const existing=parseInt(localStorage.getItem('qm_ts_'+elId)||'0');if(existing>ts){_setUcTs(elId,existing);return;}_setUcTs(elId,ts);localStorage.setItem('qm_ts_'+elId,String(ts));}catch(e){_setUcTs(elId,ts);}}
function loadStoredTs(elId){try{const t=localStorage.getItem('qm_ts_'+elId);if(t)_setUcTs(elId,parseInt(t));}catch(e){}}
// Ricalcola i pallini ambra/rosso lampeggianti anche senza nuovi upload (il tempo passa da solo)
function ucRefreshStaleTracking(){
  Object.keys(TS_TO_UC).forEach(elId=>{
    if(elId==='turnoTs')return;
    try{
      const t=parseInt(localStorage.getItem('qm_ts_'+elId)||'0');
      if(!t)return;
      const slot=document.getElementById(TS_TO_UC[elId].replace('-sub',''));
      _ucStaleClasses(slot,t);
    }catch(e){}
  });
}
setInterval(ucRefreshStaleTracking,60000);
// §§ STORAGE & SYNC KV (setSyncStatus, kvSet, kvGet, LS, syncFromCloud)
const PROXY='https://anthropic-proxy.qm-d82.workers.dev';
function setSyncStatus(state){
  // state: 'syncing' | 'ok' | 'error' | 'offline'
  const dot=document.getElementById('syncDot');
  const label=document.getElementById('syncLabel');
  if(!dot||!label)return;
  const cfg={
    syncing:{color:'#f59e0b',text:'Sincronizzazione…',anim:true},
    ok:      {color:'#1a7a3a',text:'Sincronizzato ✓',anim:false},
    error:   {color:'#dc2626',text:'Errore sync',anim:false},
    offline: {color:'#9ca3af',text:'Offline — dati locali',anim:false},
  }[state]||{color:'#aaa',text:'—',anim:false};
  dot.style.background=cfg.color;
  dot.style.animation=cfg.anim?'pulse 1s infinite':'none';
  label.textContent=cfg.text;
}
// CSS pulse animation
const styleEl=document.createElement('style');
styleEl.textContent='@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}';
document.head.appendChild(styleEl);
// Storage ibrido: localStorage (veloce/offline) + KV cloud (sync tra dispositivi)
async function kvSet(key,value,retries=3){
  for(let i=0;i<retries;i++){
    try{
      const res=await fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,value})});
      if(res.ok)return true;
    }catch(e){}
    if(i<retries-1)await new Promise(r=>setTimeout(r,1500*(i+1)));
  }
  return false;
}
const LS={
  today:()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();},
  // Salva in localStorage E sul cloud
  set:(k,v)=>{
    try{localStorage.setItem('qm_'+k,JSON.stringify(v));}catch(e){}
    setSyncStatus('syncing');
    kvSet('qm_'+k,JSON.stringify(v))
      .then(ok=>setSyncStatus(ok?'ok':'error'))
      .catch(()=>setSyncStatus('error'));
  },
  // Legge da localStorage (sincrono, per uso immediato)
  get:(k,def)=>{
    try{const v=localStorage.getItem('qm_'+k);return v!==null?JSON.parse(v):def;}catch(e){return def;}
  },
  // Cancella da entrambi
  del:(k)=>{
    try{localStorage.removeItem('qm_'+k);}catch(e){}
    fetch(PROXY+'/kv/delete?key=qm_'+encodeURIComponent(k)).catch(()=>{});
  },
  // Carica tutti i dati dal cloud e aggiorna localStorage (chiamata all'avvio)
  syncFromCloud:async()=>{
    const keys=['pulData','bkfData',
      'rev_sa','rev_bh','rev_sl','rev_pr','rev_ms','rev_ar','rev_sb',
      'rev_sent',
      'weekData','arriviData','rcGuests','bkfGroups','bkfNotes','hk_soul','hk_bout','bkfSheetARData','bkfARChartData','bkfChartData','piano',
      'ts_rev_sa','ts_rev_bh','ts_rev_sl','ts_rev_pr','ts_rev_ms','ts_rev_ar','ts_rev_sb','dvr',
      'inv_catalog_sa','inv_catalog_ar','inv_moves_sa','inv_moves_ar','inv_orders',
      'tp_seen_until','hkp_config','ddt','spese_cat_override'];
    let synced=0;
    await Promise.all(keys.map(async k=>{
      try{
        const res=await fetch(PROXY+'/kv/get?key=qm_'+encodeURIComponent(k),{cache:'no-store'});
        const json=await res.json();
        if(json.value!==null&&json.value!==undefined){
          // Per pulData/bkfData: confronta timestamp; se cloud è più recente aggiorna anche il ts visivo
          if(k==='pulData'||k==='bkfData'){
            try{
              const tsKey=k==='pulData'?'qm_ts_pulTs':'qm_ts_bkfTs';
              const elId=k==='pulData'?'pulTs':'bkfTs';
              const localTs=parseInt(localStorage.getItem(tsKey)||'0');
              const cloudObj=JSON.parse(json.value);
              if(cloudObj.ts && localTs>cloudObj.ts)return; // locale più recente: tieni locale
              // cloud più recente (o locale non ancora impostato): aggiorna ts e visual
              if(cloudObj.ts){
                localStorage.setItem(tsKey,String(cloudObj.ts));
                try{_setUcTs(elId,cloudObj.ts);}catch(e){}
              }
            }catch(e){}
          }
          localStorage.setItem('qm_'+k,json.value);
          // Per weekData/arriviData: aggiorna timestamp visivo se cloud ha _ts
          if(k==='weekData'||k==='arriviData'){
            try{
              const cloudObj=JSON.parse(json.value);
              const elId=k==='weekData'?'turnoTs':'arriviTs';
              const tsKey='qm_ts_'+elId;
              const cloudTs=cloudObj._ts;
              if(cloudTs){localStorage.setItem(tsKey,String(cloudTs));try{_setUcTs(elId,cloudTs);}catch(e){}}
            }catch(e){}
          }
          // Per dvr: ricarica in memoria e ri-renderizza se la view è attiva
          if(k==='dvr'){
            try{dvrRestore();dvrBadgeUpdate();if(document.getElementById('view-dvr')?.classList.contains('active'))dvrRender();}catch(e){}
          }
          // Per inventario: ri-renderizza se la view è attiva + aggiorna badge nav
          if(k==='inv_catalog_sa'||k==='inv_catalog_ar'||k==='inv_moves_sa'||k==='inv_moves_ar'){
            try{if(document.getElementById('view-inventario')?.classList.contains('active'))invRender();}catch(e){}
          }
          // Per tp_seen_until: aggiorna badge preferenze turni
          if(k==='tp_seen_until'){
            try{turniPrefUpdateBadge();}catch(e){}
          }
          // Per hkp_config: aggiorna URL foglio/script HKP
          if(k==='hkp_config'){
            try{hkpRestoreConfig();}catch(e){}
          }
          if(k==='ddt'){
            try{if(document.getElementById('view-spese')?.classList.contains('active')){ddtRenderSpese();ddtRenderList();}}catch(e){}
          }
          if(k==='spese_cat_override'){
            try{speseCatLoadOverride();if(document.getElementById('view-spese')?.classList.contains('active'))ddtRenderSpese();}catch(e){}
          }
          // Per rcGuests: aggiorna guestsData in memoria e ri-renderizza le card se diverse da quelle mostrate
          if(k==='rcGuests'){
            try{
              const cloudGuests=JSON.parse(json.value);
              if(cloudGuests&&JSON.stringify(cloudGuests)!==JSON.stringify(guestsData)){
                if(cloudGuests.length){
                  document.getElementById('rcUploadZone').style.display='none';
                  document.getElementById('rcProcessing').style.display='none';
                  rcRenderCards(cloudGuests);
                }else{
                  guestsData=[];
                  document.getElementById('rcResults').style.display='none';
                }
              }
            }catch(e){}
          }
          // Per hk_soul, hk_bout, piano: aggiorna timestamp visivo se cloud ha _ts
          if(k==='hk_soul'||k==='hk_bout'||k==='piano'){
            try{
              const cloudObj=JSON.parse(json.value);
              const elId=k==='hk_soul'?'soulTs':k==='hk_bout'?'boutTs':'pianoTs';
              const tsKey='qm_ts_'+elId;
              const cloudTs=cloudObj._ts;
              if(cloudTs){localStorage.setItem(tsKey,String(cloudTs));try{_setUcTs(elId,cloudTs);}catch(e){}}
              if(k==='hk_soul'){hkSoulData=cloudObj;try{hkSetLoaded('soul',true);}catch(e){}}
              else if(k==='hk_bout'){hkBoutData=cloudObj;try{hkSetLoaded('bout',true);}catch(e){}}
            }catch(e){}
          }
          synced++;
        }
      }catch(e){}
    }));
    return synced;
  }
};
// §§ OVERVIEW — TOGGLE PREVIEW PANELS (toggleOccupazionePreview, togglePulPreview, toggleBkfPreview)
function toggleOccupazionePreview(e){
  if(e)e.stopPropagation();
  const panel=document.getElementById('occ-panel');
  if(!panel)return;
  if(panel.style.display==='block'){panel.style.display='none';return;}
  const body=document.getElementById('occ-chart-body');
  if(!pulData||!pulData.length){
    body.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Carica il report pulizie per vedere il grafico</div>';
    panel.style.display='block';return;
  }
  const CAP=CAP_CAMERE||33;
  const pts=pulData.map(d=>{
    const occ=Math.min(CAP,(d.fermatePulizia||d.fermate||0)+d.arrivi);
    const pct=Math.round((occ/CAP)*100);
    return{label:d.label.split(' ')[0],pct};
  });
  // Barre orizzontali — una riga per giorno
  const rows=pts.map(p=>{
    const col=p.pct>=80?'var(--green)':p.pct>=60?'var(--amber)':'var(--red)';
    return`<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
      <span style="font-size:12px;color:var(--text-muted);width:32px;text-align:right;flex-shrink:0;">${p.label}</span>
      <div style="flex:1;background:var(--surface2);border-radius:6px;overflow:hidden;height:22px;">
        <div style="height:100%;width:${p.pct}%;background:${col};border-radius:6px;"></div>
      </div>
      <span style="font-size:13px;font-weight:700;color:${col};width:36px;flex-shrink:0;">${p.pct}%</span>
    </div>`;
  }).join('');
  body.innerHTML=`<div style="max-width:640px;">${rows}</div>`;
  panel.style.display='block';
}
function togglePulPreview(){
  const el=document.getElementById('kpi-pul-preview');
  if(!el)return;
  if(el.style.display==='block'){el.style.display='none';return;}
  if(!pulData||!pulData.length){return;}
  const pts=pulData.map(d=>({label:d.label,arrivi:d.arrivi,fermate:d.fermatePulizia||d.fermate||0,partenze:d.partenze}));
  const W=600,H=200,PL=32,PR=12,PT=16,PB=30;
  const plotW=W-PL-PR,plotH=H-PT-PB;
  const YMAX=Math.max(20,...pts.map(p=>Math.max(p.arrivi,p.fermate,p.partenze)))+5;
  const sx=i=>PL+i/(pts.length-1||1)*plotW;
  const sy=v=>PT+plotH-(v/YMAX)*plotH;
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">`;
  for(let v=0;v<=YMAX;v+=5){const y=sy(v);svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border-light)" stroke-width="${v===0?1.5:1}"/><text x="${PL-4}" y="${y+4}" font-size="11" fill="var(--text-dim)" text-anchor="end">${v}</text>`;}
  pts.forEach((p,i)=>{svg+=`<text x="${sx(i)}" y="${H-6}" font-size="11" fill="var(--text-dim)" text-anchor="middle">${p.label.split(' ')[0]}</text>`;});
  const colors={arrivi:'var(--green)',fermate:'var(--accent)',partenze:'var(--red)'};
  ['arrivi','fermate','partenze'].forEach(k=>{
    const linePath='M'+pts.map((p,i)=>`${sx(i)},${sy(p[k])}`).join('L');
    svg+=`<path d="${linePath}" fill="none" stroke="${colors[k]}" stroke-width="1.5"/>`;
    pts.forEach((p,i)=>{svg+=`<circle cx="${sx(i)}" cy="${sy(p[k])}" r="3" fill="${colors[k]}" stroke="white" stroke-width="1.5"/>`;});
  });
  svg+=`<text x="${W-PR}" y="${PT}" font-size="10" fill="var(--green)" text-anchor="end">● Arrivi</text>`;
  svg+=`<text x="${W-PR}" y="${PT+14}" font-size="10" fill="var(--accent)" text-anchor="end">● Fermate</text>`;
  svg+=`<text x="${W-PR}" y="${PT+28}" font-size="10" fill="var(--red)" text-anchor="end">● Partenze</text>`;
  svg+='</svg>';
  el.innerHTML=`<div style="font-size:11px;font-weight:600;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">📊 Report pulizie — andamento settimanale</div>`+svg;
  el.style.display='block';
}
function toggleBkfPreview(){
  const el=document.getElementById('kpi-bkf-preview');
  if(!el)return;
  if(el.style.display==='block'){el.style.display='none';return;}
  if(!bkfData||!bkfData.length){return;}
  const pts=bkfData.map(d=>({label:d.label,v:d.adulti+d.bambini}));
  const W=600,H=200,PL=32,PR=12,PT=16,PB=30;
  const plotW=W-PL-PR,plotH=H-PT-PB;
  const YMAX=Math.max(70,...pts.map(p=>p.v))+10;
  const sx=i=>PL+i/(pts.length-1||1)*plotW;
  const sy=v=>PT+plotH-(v/YMAX)*plotH;
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">`;
  for(let v=0;v<=YMAX;v+=10){
    const y=sy(v);
    svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border-light)" stroke-width="${v===0?1.5:1}"/>`;
    svg+=`<text x="${PL-4}" y="${y+4}" font-size="11" fill="var(--text-dim)" text-anchor="end">${v}</text>`;
  }
  pts.forEach((p,i)=>{
    svg+=`<text x="${sx(i)}" y="${H-6}" font-size="11" fill="var(--text-dim)" text-anchor="middle">${p.label.split(' ')[0]}</text>`;
  });
  const linePath='M'+pts.map((p,i)=>`${sx(i)},${sy(p.v)}`).join('L');
  const areaPath=linePath+`L${sx(pts.length-1)},${sy(0)} L${sx(0)},${sy(0)} Z`;
  svg+=`<path d="${areaPath}" fill="var(--accent)" opacity="0.1"/>`;
  svg+=`<path d="${linePath}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>`;
  pts.forEach((p,i)=>{
    const x=sx(i),y=sy(p.v);
    svg+=`<circle cx="${x}" cy="${y}" r="3" fill="var(--accent)" stroke="white" stroke-width="1.5"/>`;
    svg+=`<text x="${x}" y="${y-9}" font-size="11" fill="var(--accent)" text-anchor="middle" font-weight="600">${p.v}</text>`;
  });
  svg+='</svg>';
  el.innerHTML=`<div style="font-size:11px;font-weight:600;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">📊 Report pasti SoulArt — coperti settimanali</div>`+svg;
  el.style.display='block';
}
// §§ OVERVIEW — GRAFICI & METEO (buildBarChart, fetchMeteo, toggleWeatherForecast)
function buildBarChart(){
  const data=[{l:'Lun 10',v:91},{l:'Mar 11',v:89},{l:'Mer 12',v:92},{l:'Gio 13',v:90},{l:'Ven 14',v:93},{l:'Sab 15',v:92},{l:'Oggi',v:94}];
  const max=100,target=90,H=96;
  const wrap=document.getElementById('qualityBarChart');
  if(!wrap)return;
  const targetY=H-Math.round((target/max)*H);
  wrap.style.position='relative';
  // target dashed line
  const tLine=`<div style="position:absolute;left:0;right:0;top:${targetY}px;border-top:1.5px dashed var(--amber);opacity:.6;pointer-events:none;z-index:1;"><span style="position:absolute;right:0;top:-9px;font-size:8px;color:var(--amber);background:var(--surface);padding:0 3px;opacity:.9;">target ${target}</span></div>`;
  const bars=data.map((d,i)=>{
    const isToday=d.l==='Oggi';
    const color=isToday?'var(--accent)':d.v>=target?'var(--green)':'var(--amber)';
    const h=Math.round((d.v/max)*H);
    const label=isToday?`<strong>${d.l}</strong>`:d.l;
    return`<div class="bar-col">
      <div class="bar-val" style="font-size:10px;font-weight:700;color:${color};margin-bottom:2px;">${d.v}</div>
      <div class="bar-wrap" style="height:${H}px;position:relative;">
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:72%;height:${h}px;background:${color};border-radius:4px 4px 2px 2px;opacity:${isToday?1:.85};transition:height .3s;"></div>
      </div>
      <div class="bar-label" style="margin-top:4px;">${label}</div>
    </div>`;
  }).join('');
  wrap.innerHTML=`<div style="position:relative;display:flex;gap:0;align-items:flex-end;width:100%;">${tLine}${bars.replace(/<div class="bar-col">/g,'<div class="bar-col" style="flex:1;display:flex;flex-direction:column;align-items:center;">')}</div>`;
}
const WC_ICONS={
  clear:'<circle cx="12" cy="12" r="4" fill="none" stroke="var(--amber)" stroke-width="1.5"/><line x1="12" y1="2" x2="12" y2="5" stroke="var(--amber)" stroke-width="1.5"/><line x1="12" y1="19" x2="12" y2="22" stroke="var(--amber)" stroke-width="1.5"/><line x1="2" y1="12" x2="5" y2="12" stroke="var(--amber)" stroke-width="1.5"/><line x1="19" y1="12" x2="22" y2="12" stroke="var(--amber)" stroke-width="1.5"/>',
  cloud:'<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="none" stroke="var(--text-dim)" stroke-width="1.5"/>',
  rain:'<path d="M17.5 16H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="none" stroke="var(--blue)" stroke-width="1.5"/><line x1="9" y1="19" x2="8" y2="22" stroke="var(--blue)" stroke-width="1.5"/><line x1="13" y1="19" x2="12" y2="22" stroke="var(--blue)" stroke-width="1.5"/><line x1="17" y1="19" x2="16" y2="22" stroke="var(--blue)" stroke-width="1.5"/>',
  storm:'<path d="M17.5 16H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="none" stroke="var(--text-dim)" stroke-width="1.5"/><polyline points="13,17 11,21 14,21 12,25" fill="none" stroke="var(--amber)" stroke-width="1.5"/>'
};
function wcToIcon(code){
  if(code<=1)return WC_ICONS.clear;
  if(code<=3)return WC_ICONS.cloud;
  if(code<=67||code===80||code===81||code===82)return WC_ICONS.rain;
  if(code>=95)return WC_ICONS.storm;
  return WC_ICONS.cloud;
}
function wcToLabel(code){
  if(code<=0)return'Sereno';if(code<=2)return'Parz. nuvoloso';if(code<=3)return'Nuvoloso';
  if(code<=9)return'Nebbia';if(code<=19)return'Pioviggine';if(code<=29)return'Pioggia';
  if(code<=39)return'Neve';if(code<=49)return'Nebbia';if(code<=59)return'Pioviggine';
  if(code<=69)return'Pioggia';if(code<=79)return'Neve';if(code<=82)return'Rovesci';
  if(code<=84)return'Grandine';if(code<=94)return'Neve';return'Temporale';
}
const DAY_NAMES=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
async function fetchMeteo(){
  try{
    const url='https://api.open-meteo.com/v1/forecast?latitude=40.8518&longitude=14.2681'
      +'&current=temperature_2m,weathercode'
      +'&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max'
      +'&timezone=Europe%2FRome&forecast_days=4';
    const res=await fetch(url);
    const data=await res.json();
    const temp=Math.round(data.current.temperature_2m);
    const code=data.current.weathercode;
    document.getElementById('weatherTemp').textContent=temp+'\u00b0C';
    document.getElementById('weatherIcon').innerHTML=wcToIcon(code);
    const days=data.daily;
    const mm=document.getElementById('weatherMinMax');
    if(mm&&days)mm.textContent=Math.round(days.temperature_2m_max[0])+'° / '+Math.round(days.temperature_2m_min[0])+'°';
    const grid=document.getElementById('forecastGrid');
    if(!grid)return;
    let html='';
    html+=`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border-light);">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" style="flex-shrink:0;">${wcToIcon(days.weathercode[0])}</svg>
      <span style="font-size:var(--fs-xs);color:var(--text);font-weight:500;width:28px;">Oggi</span>
      <span style="font-size:var(--fs-xs);color:var(--text-muted);flex:1;">${wcToLabel(days.weathercode[0])}</span>
      <span style="font-size:var(--fs-xs);color:var(--blue);width:30px;text-align:right;">${days.precipitation_probability_max[0]}%</span>
      <span style="font-size:var(--fs-xs);color:var(--text);font-weight:500;min-width:60px;text-align:right;">${Math.round(days.temperature_2m_max[0])}° <span style="color:var(--text-dim);font-weight:400;">${Math.round(days.temperature_2m_min[0])}°</span></span>
    </div>`;
    for(let i=1;i<=3;i++){
      const d=new Date(days.time[i]+'T12:00:00');
      html+=`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;${i<3?'border-bottom:1px solid var(--border-light);':''}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" style="flex-shrink:0;">${wcToIcon(days.weathercode[i])}</svg>
        <span style="font-size:var(--fs-xs);color:var(--text-muted);width:28px;">${DAY_NAMES[d.getDay()]}</span>
        <span style="font-size:var(--fs-xs);color:var(--text-muted);flex:1;">${wcToLabel(days.weathercode[i])}</span>
        <span style="font-size:var(--fs-xs);color:var(--blue);width:30px;text-align:right;">${days.precipitation_probability_max[i]}%</span>
        <span style="font-size:var(--fs-xs);color:var(--text);font-weight:500;min-width:60px;text-align:right;">${Math.round(days.temperature_2m_max[i])}° <span style="color:var(--text-dim);font-weight:400;">${Math.round(days.temperature_2m_min[i])}°</span></span>
      </div>`;
    }
    html+=`<div style="font-size:9px;color:var(--text-dim);margin-top:6px;text-align:right;">% pioggia &nbsp;·&nbsp; max / min</div>`;
    grid.innerHTML=html;
  }catch(e){document.getElementById('weatherTemp').textContent='\u2014';}
}
function toggleWeatherForecast(e){
  e.stopPropagation();
  const p=document.getElementById('weatherForecast');
  document.getElementById('datePopup').classList.remove('open');
  p.classList.toggle('open');
}
fetchMeteo();
setInterval(fetchMeteo,10*60*1000);
// Mostra KPI topbar se overview è la view iniziale
(function(){const k=document.getElementById('topbar-kpis');if(k)k.style.display='flex';})();
try{updateStaffPanelHeader();}catch(e){}
try{cmLoadPianoStats();}catch(e){}
// §§ SIDEBAR — OROLOGIO & DATA (updateSbClock, toggleDatePopup, saveDate, updateDateDisplay)
function updateSbClock(){
  const n=new Date();
  const hh=String(n.getHours()).padStart(2,'0');
  const mm=String(n.getMinutes()).padStart(2,'0');
  const el=document.getElementById('sbClock');
  if(el)el.textContent=hh+':'+mm;
  const h=n.getHours();
  const shiftEl=document.getElementById('sbShift');
  if(shiftEl){
    if(h>=7&&h<15)       shiftEl.textContent='🌅 Turno di apertura  7:00–15:00';
    else if(h>=15&&h<23) shiftEl.textContent='🌇 Turno di chiusura  15:00–23:00';
    else                  shiftEl.textContent='🌙 Turno notturno  23:00–7:00';
  }
}
updateSbClock();
setInterval(updateSbClock,10000);
// Data
let customDate=null;
function toggleDatePopup(e){
  e.stopPropagation();
  const p=document.getElementById('datePopup');
  document.getElementById('weatherForecast')?.classList.remove('open');
  const opening=!p.classList.contains('open');
  p.classList.toggle('open');
  if(opening){
    const d=customDate||new Date();
    document.getElementById('dateInput').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
}
function saveDate(){
  const val=document.getElementById('dateInput').value;
  if(!val)return;
  const parts=val.split('-');
  customDate=new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]),12,0,0);
  updateDateDisplay();
  document.getElementById('datePopup').classList.remove('open');
  LS.set('customDate',val);
}
function resetDate(){
  customDate=null;
  updateDateDisplay();
  document.getElementById('datePopup').classList.remove('open');
  LS.del('customDate');
}
function updateDateDisplay(){
  const d=customDate||new Date();
  const days=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const months=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  document.getElementById('todayDate').textContent=days[d.getDay()]+' '+d.getDate()+' '+months[d.getMonth()];
  try{if(!weekData)updateStaffPanelHeader(d);}catch(e){}
  try{refreshOverviewForDate(d);}catch(e){}
}
// §§ OVERVIEW — RENDER PRINCIPALE + INIT + POLLING 30s (refreshOverviewForDate, renderArriviData, syncFromCloud)
function refreshOverviewForDate(d){
  const ref=new Date(d||customDate||new Date());
  ref.setHours(0,0,0,0);
  // 1. Turno di Paolo
  try{
    const el=document.getElementById('paoloTurno');
    if(el){
      if(weekData){
        const _pIdx=findWeekDayIndex(weekData,ref);
        const giorno=_pIdx!==-1?weekData.giorni[_pIdx]:null;
        if(!giorno){el.textContent='Quality Manager';el.style.color='';}
        else{const turno=giorno.shifts['Presta P.'];if(IS_DASH(turno)){el.textContent='Quality Manager';el.style.color='';}else if(!turno||IS_REST(turno)){el.textContent='Riposo';el.style.color='var(--red)';}else{el.textContent='Turno: '+turno;el.style.color='var(--green)';}}
      }else{el.textContent='Quality Manager';el.style.color='';}
    }
  }catch(e){}
  // 2. Staff area
  try{
    if(weekData){
      let idx=findWeekDayIndex(weekData,ref);
      if(idx!==-1){
        activeDay=idx;renderDay(activeDay);updateWeekNavActive();updateSidebarInfo();
      } else {
        // Oggi non è nella settimana caricata — mostra avviso
        updateStaffPanelHeader(ref);
        _setStaffAreaHTML(`<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:10px;padding:14px 16px;text-align:center;">
          <div style="font-size:1.3rem;margin-bottom:6px;">⚠️</div>
          <div style="font-weight:700;font-size:13px;color:#92400E;margin-bottom:4px;">Turni settimana precedente</div>
          <div style="font-size:12px;color:#92400E;">Carica il turno della settimana corrente per vedere il personale di oggi.</div>
        </div>`);
      }
    }
  }catch(e){}
  // 4. Pulizie
  try{
    if(pulData){
      const idx=pulData.findIndex(p=>{if(!p.data)return false;const pts=p.data.split('/');if(pts.length<3)return false;const pd=new Date(parseInt(pts[2]),parseInt(pts[1])-1,parseInt(pts[0]),12,0,0);pd.setHours(0,0,0,0);return pd.getTime()===ref.getTime();});
      if(idx!==-1){pulActiveDay=idx;renderPulDay();}
    }
  }catch(e){}
  // 5. BKF pasti
  try{
    if(bkfData){
      const idx=bkfData.findIndex(b=>{if(!b.data)return false;const pts=b.data.split('/');if(pts.length<3)return false;const bd=new Date(parseInt(pts[2]),parseInt(pts[1])-1,parseInt(pts[0]),12,0,0);bd.setHours(0,0,0,0);return bd.getTime()===ref.getTime();});
      if(idx!==-1){bkfActiveDay=idx;renderBkfDay();}
    }
  }catch(e){}
  // 6. Piano camere
  try{if(pianoNavIdx===null)pianoOvInit();else{pianoCheckScadenza();pianoRenderWeek(pianoNavIdx);}}catch(e){}
}
document.addEventListener('click',()=>{
  document.getElementById('datePopup')?.classList.remove('open');
  document.getElementById('weatherForecast')?.classList.remove('open');
});
document.querySelector('.content').addEventListener('scroll',function(){
  const btn=document.getElementById('backToTop');
  if(btn)btn.style.display=this.scrollTop>300?'block':'none';
});
(function(){
  // Sempre data odierna all'avvio — ignora customDate salvata
  customDate=null;
  LS.del('customDate');
  updateDateDisplay();
  function tick(){const n=new Date();document.getElementById('liveTime').textContent=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');}
  tick();setInterval(tick,10000);
  // Auto-poll KV ogni 2 minuti per aggiornamenti da Drive script
  let _lastPollTs=Date.now();
  setInterval(async()=>{
    try{
      // Controlla arrivi
      const ar=await fetch(PROXY+'/kv/get?key=qm_arriviData',{cache:'no-store'}).then(r=>r.json());
      if(ar.value){
        const obj=JSON.parse(ar.value);
        const localTs=parseInt(localStorage.getItem('qm_ts_arriviTs')||'0');
        if(obj._ts&&obj._ts>localTs){
          localStorage.setItem('qm_arriviData',ar.value);
          localStorage.setItem('qm_ts_arriviTs',String(obj._ts));
          arriviData=obj;arriviData.arrivi=fixArriviStruttura(arriviData.arrivi);
          arriviUpdateKpi();ucSetState('arrivi','loaded',arriviData.data+' · '+arriviData.arrivi.length+' arrivi',true);
          try{document.getElementById('arriviLoadedDate').textContent=arriviData.data;}catch(e){}
          restoreUploadTs('arriviTs',obj._ts);
          bkfRoomInfoBuild();
        }
      }
      // Controlla weekData
      const wd=await fetch(PROXY+'/kv/get?key=qm_weekData',{cache:'no-store'}).then(r=>r.json());
      if(wd.value){
        const obj=JSON.parse(wd.value);
        const localTs=parseInt(localStorage.getItem('qm_ts_turnoTs')||'0');
        if(obj._ts&&obj._ts>localTs){
          localStorage.setItem('qm_weekData',wd.value);
          localStorage.setItem('qm_ts_turnoTs',String(obj._ts));
          const arr=Array.isArray(obj)?obj:obj.giorni;
          const restored={giorni:arr.map(g=>{const d=new Date(g.date);return{...g,date:new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0)};})};
          loadWeekData(restored);
          const range=restored.giorni[0].label+' – '+restored.giorni[restored.giorni.length-1].label;
          ucSetState('turno','loaded',range,true);
          restoreUploadTs('turnoTs',obj._ts);
        }
      }
    }catch(e){}
    // Controlla pulData e bkfData
    try{
      const pd=await fetch(PROXY+'/kv/get?key=qm_pulData',{cache:'no-store'}).then(r=>r.json());
      if(pd.value){
        const obj=JSON.parse(pd.value);
        const localTs=parseInt(localStorage.getItem('qm_ts_pulTs')||'0');
        if(obj.ts&&obj.ts>localTs){
          localStorage.setItem('qm_pulData',pd.value);
          localStorage.setItem('qm_ts_pulTs',String(obj.ts));
          pulData=obj.data||obj;pulActiveDay=obj.activeDay||0;
          renderPulData(true);
          restoreUploadTs('pulTs',obj.ts);
        }
      }
      const bd=await fetch(PROXY+'/kv/get?key=qm_bkfData',{cache:'no-store'}).then(r=>r.json());
      if(bd.value){
        const obj=JSON.parse(bd.value);
        const localTs=parseInt(localStorage.getItem('qm_ts_bkfTs')||'0');
        if(obj.ts&&obj.ts>localTs){
          localStorage.setItem('qm_bkfData',bd.value);
          localStorage.setItem('qm_ts_bkfTs',String(obj.ts));
          bkfData=obj.data||obj;bkfActiveDay=obj.activeDay||0;
          renderBkfData(true);
          restoreUploadTs('bkfTs',obj.ts);
        }
      }
    }catch(e){}
    try{turniPrefLoad();}catch(e){}
    // Sincronizza dati Operativa Housekeeping SoulArt da KV anche se quella view non è
    // mai stata aperta in questa sessione — altrimenti i Riepiloghi mensili in Overview
    // (SoulArt/Boutique) restano fermi allo snapshot letto da localStorage all'avvio.
    try{
      await hkpNSyncFromCloud('sa');
      if(pianoNavIdx!==null)pianoNavRender(pianoNavIdx);
    }catch(e){}
  },30000);
  const alertTimeEl=document.getElementById('alertTime');if(alertTimeEl)alertTimeEl.textContent='Aggiornato '+String(new Date().getHours()).padStart(2,'0')+':'+String(new Date().getMinutes()).padStart(2,'0');
  buildBarChart();
  // Sync dal cloud poi ripristina TUTTI i dati
  (async()=>{
    setSyncStatus('syncing');
    try{
      const n=await LS.syncFromCloud();
      setSyncStatus('ok');
    }catch(e){
      setSyncStatus('offline');
    }
    // Ripristina dati persistenti
  setTimeout(async()=>{
    // Rileggi REV_SENT da localStorage (può essere stato aggiornato dalla sync cloud)
    try{const s=localStorage.getItem('qm_rev_sent');if(s)REV_SENT=JSON.parse(s);}catch(e){}
    ovUpdateRevNoreply();ovUpdateRevImport();
    hkpRestoreConfig();
    dvrRestore();dvrBadgeUpdate();
    turniPrefRestore();turniPrefLoad();
    // Ripristina turno settimanale
    try{
      const saved=localStorage.getItem('qm_weekData');
      if(saved){
        const parsed=JSON.parse(saved);
        // Supporta sia formato array (vecchio) sia oggetto {giorni,_ts} (nuovo)
        const arr=Array.isArray(parsed)?parsed:parsed.giorni;
        const pts=parsed._ts;
        const restored={giorni:arr.map(g=>{const d=new Date(g.date);return{...g,date:new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0)};})};
        loadWeekData(restored);
        const range=restored.giorni[0].label+' – '+restored.giorni[restored.giorni.length-1].label;
        ucSetState('turno','loaded',range,true);
        if(pts)restoreUploadTs('turnoTs',pts);else loadStoredTs('turnoTs');
        // Forza overview alla data odierna dopo un tick (usa loadWeekData per parseLocalDate robusto)
        setTimeout(()=>{try{if(weekData)loadWeekData(weekData);}catch(e){}},50);
      }
    }catch(e){}
    // Ripristina arrivi oggi
    try{
      const saved=localStorage.getItem('qm_arriviData');
      if(saved){
        arriviData=JSON.parse(saved);
        arriviData.arrivi=fixArriviStruttura(arriviData.arrivi);
        arriviUpdateKpi();
        ucSetState('arrivi','loaded',arriviData.data+' · '+arriviData.arrivi.length+' arrivi',true);
        document.getElementById('arriviLoadedDate').textContent=arriviData.data;
        if(arriviData._ts)restoreUploadTs('arriviTs',arriviData._ts);else loadStoredTs('arriviTs');
        // Se BKF_ROOM_INFO è ancora vuoto (es. subito dopo il deploy di questa funzione,
        // prima di qualsiasi nuovo caricamento) popolalo subito dal Riepilogo Reception
        // già presente, invece di aspettare il prossimo upload per mostrare qualcosa.
        if(!Object.keys(BKF_ROOM_INFO).length)bkfRoomInfoBuild();else bkfBookingRender();
      }
    }catch(e){}
    // Ripristina RC guests
    setTimeout(()=>{
      try{
        const savedRC=localStorage.getItem('qm_rcGuests');
        if(savedRC){
          const guests=JSON.parse(savedRC);
          if(guests&&guests.length){
            document.getElementById('rcUploadZone').style.display='none';
            document.getElementById('rcProcessing').style.display='none';
            rcRenderCards(guests);
          }
        }
        // Gli arrivi sono già stati ripristinati sopra: se le card salvate sono di ieri
        // (o non ci sono) e il documento è di oggi, si rigenerano subito invece di
        // aspettare che qualcuno ricarichi il PDF.
        rcRiallineaConArrivi();
      }catch(e){}
    },300);
    // Ripristina report pulizie
    const savedPul=LS.get('pulData',null);
    if(savedPul&&savedPul.data){
      pulData=savedPul.data;pulActiveDay=savedPul.activeDay||0;
      setTimeout(()=>{renderPulData(true);if(savedPul.ts)restoreUploadTs('pulTs',savedPul.ts);else loadStoredTs('pulTs');},100);
    }
    // Ripristina report pasti
    const savedBkf=LS.get('bkfData',null);
    if(savedBkf&&savedBkf.data){
      bkfData=savedBkf.data;bkfActiveDay=savedBkf.activeDay||0;
      setTimeout(()=>{renderBkfData(true);bkfLoadOps();if(savedBkf.ts)restoreUploadTs('bkfTs',savedBkf.ts);else loadStoredTs('bkfTs');},150);
    }
    // Ripristina i grafici coperti SoulArt/Galleria — persistono sempre, indipendenti dal
    // ciclo di upload/sync del giorno (a differenza delle tabelle di revisione sotto)
    const savedChart=LS.get('bkfChartData',null);
    if(savedChart&&Array.isArray(savedChart)&&savedChart.length){
      bkfChartData=savedChart;
      setTimeout(bkfRenderChart,50);
    }
    const savedARChart=LS.get('bkfARChartData',null);
    if(savedARChart&&Array.isArray(savedARChart)&&savedARChart.length){
      bkfARChartData=savedARChart;
      setTimeout(bkfRenderChartAR,50);
    }
    // Ripristina BKF Sheet Galleria (solo se i dati sono di oggi)
    const savedARData=LS.get('bkfSheetARData',null);
    if(savedARData&&Array.isArray(savedARData)&&savedARData.length){
      const todayDDMM=(()=>{const n=new Date();return String(n.getDate()).padStart(2,'0')+'/'+String(n.getMonth()+1).padStart(2,'0');})();
      const firstD=savedARData[0]&&savedARData[0].d?String(savedARData[0].d).substring(0,5):'';
      if(firstD===todayDDMM){
        bkfSheetARData=savedARData;
        const tbody=document.getElementById('bkfSheetARTableBody');
        if(tbody)tbody.innerHTML=bkfSheetARData.map(r=>`<tr><td style="font-weight:500;">${r.d||'—'}</td><td><span class="bkf-ro">${r.r??'—'}</span></td><td><span class="bkf-badge">${r.b??'—'}</span></td><td style="font-size:var(--fs-xs);color:var(--text-muted);">${r.pg||''}</td></tr>`).join('');
        bkfSheetARSetStatus('ready');
        setTimeout(bkfRenderChartAR,50);
      } else {
        LS.set('bkfSheetARData',null);
      }
    }
    // Ripristina recensioni — prima da localStorage, poi da cloud se mancano
    async function restoreReviews(){
      // Calibrazioni punteggio Booking (emivita per struttura): il cloud è la fonte, così
      // il valore inserito su un PC vale su tutti. Se il fetch fallisce si tiene il locale.
      try{
        const rc=await fetch(PROXY+'/kv/get?key='+REV_CALIB_KEY,{cache:'no-store'});
        const rj=await rc.json();
        if(rj.value){REV_CALIB=JSON.parse(rj.value)||{};localStorage.setItem(REV_CALIB_KEY,rj.value);}
      }catch(e){}
      // Pre-stay: contatti ospiti e stato invii, più i testi dei messaggi. Il cloud è la
      // fonte così chi scrive dalla reception e chi controlla dall'ufficio vedono lo stesso
      // stato e non si mandano doppioni.
      for(const k of [PRESTAY_KEY,PRESTAY_TPL_KEY]){
        try{
          const r=await fetch(PROXY+'/kv/get?key='+k,{cache:'no-store'});
          const j=await r.json();
          if(j.value){
            if(k===PRESTAY_KEY)_prestay=JSON.parse(j.value)||{};else _prestayTpl=JSON.parse(j.value)||{};
            localStorage.setItem(k,j.value);
          }
        }catch(e){}
      }
      try{if(document.getElementById('prestay-content'))prestayRender();}catch(e){}
      // Gli arrivi possono arrivare dal cloud (importati su un altro PC): anche in quel
      // caso lo slot dell'Upload Center deve risultare caricato.
      try{prestaySetLoaded(true);}catch(e){}
      for(const p of ['sa','bh','sl','pr','ms','ar','sb']){
        try{
          let csvText=localStorage.getItem('qm_rev_'+p);
          // Se non in locale, prova dal cloud
          if(!csvText||!csvText.trim()){
            try{
              const res=await fetch(PROXY+'/kv/get?key=qm_rev_'+p);
              const json=await res.json();
              if(json.value){csvText=json.value;localStorage.setItem('qm_rev_'+p,csvText);}
            }catch(e){}
          }
          if(!csvText||!csvText.trim())continue;
          const rows=revParseCsv(csvText);
          if(!rows.length)continue;
          REV_HOTELS[p].data=rows;
          REV_HOTELS[p].filtered=[...rows];
          revAutoMarkNoComment(p,rows);
          // Un nuovo CSV può rendere valutabili osservazioni prima "in attesa" (perché
          // successive all'ultima recensione esportata): ricalcola qui, non a ogni render.
          try{revCalibRicalcola(p);}catch(e){}
          document.getElementById('revContent-'+p).style.display='block';
          document.getElementById('revUploadZone-'+p).style.display='none';
          // Timestamp upload: prima dal localStorage, poi dal cloud KV
          try{
            let _t=localStorage.getItem('qm_ts_rev_'+p);
            if(!_t){
              try{const _r=await fetch(PROXY+'/kv/get?key=qm_ts_rev_'+p);const _j=await _r.json();if(_j.value){_t=_j.value;localStorage.setItem('qm_ts_rev_'+p,_t);}}catch(e){}
            }
            if(_t)setTimeout(()=>revShowTs(p,_t),100);
          }catch(e){}
          revRenderStats(p);
          revRenderExpiring(p);
          revRenderCatTrend(p);
          revRenderList(p);
          ovUpdateRevNoreply();ovUpdateRevImport();
        }catch(e){}
      }
    }
    await restoreReviews();
    // Ripristina recensioni Expedia
    (async()=>{
      for(const p of Object.keys(REV_EXP_HOTELS)){
        try{
          let tsv=localStorage.getItem('qm_rev_exp_'+p);
          if(!tsv){try{const r=await fetch(PROXY+'/kv/get?key=qm_rev_exp_'+p,{cache:'no-store'});const j=await r.json();if(j.value){tsv=j.value;localStorage.setItem('qm_rev_exp_'+p,tsv);}}catch(e){}}
          if(!tsv)continue;
          const rows=revExpParseTsv(tsv);
          if(!rows.length)continue;
          REV_EXP_HOTELS[p].data=rows;REV_EXP_HOTELS[p].filtered=[...rows];
          document.getElementById('revExpContent-'+p).style.display='block';
          document.getElementById('revExpUploadZone-'+p).style.display='none';
          revExpRenderStats(p);revExpRenderList(p);
          try{let _t=localStorage.getItem('qm_ts_rev_exp_'+p);if(_t)setTimeout(()=>revExpShowTs(p,_t),100);}catch(e){}
        }catch(e){}
      }
    })();
  // Ripristina ultima vista (non torna in overview al reload/cmd+shift+r)
  try{
    const lastView=localStorage.getItem('qm_last_view');
    if(lastView&&lastView!=='overview'&&document.getElementById('view-'+lastView)){
      const navEl=document.querySelector('[onclick*="\''+lastView+'\'"]');
      setView(lastView,navEl||undefined);
    }
  }catch(e){}
  },150);
  })(); // fine async sync
})();
// §§ RECENSIONI — SCORE TREND MODAL (openScoreTrend)
function openScoreTrend(p){
  const data=REV_HOTELS[p].data;
  if(!data||!data.length)return;
  const scored=data.filter(r=>r._score>0&&r._dateTs>0);
  // Costruisci lista mesi dal più vecchio al più recente
  const minTs=Math.min(...scored.map(r=>r._dateTs));
  const maxTs=Math.max(...scored.map(r=>r._dateTs));
  const startDate=new Date(minTs); startDate.setDate(1); startDate.setHours(0,0,0,0);
  const endDate=new Date(maxTs); endDate.setDate(1); endDate.setHours(0,0,0,0);
  const months=[];
  const labels=[];
  const mesiBrevi=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const cur=new Date(startDate);
  while(cur<=endDate){
    months.push(new Date(cur));
    labels.push(mesiBrevi[cur.getMonth()]+'\''+String(cur.getFullYear()).slice(2));
    cur.setMonth(cur.getMonth()+1);
  }
  // Stesso modello della card Punteggio medio (decadimento continuo con emivita calibrata):
  // se qui restasse il vecchio 85/10/5 il grafico mostrerebbe un valore diverso dalla card.
  const _trendHl=revHl(p);
  function calcWeightedAt(refDate){
    const refTs=refDate.getTime()+30*24*60*60*1000; // fine del mese
    return punteggioBooking(scored,_trendHl,refTs).score;
  }
  const vals=months.map(m=>calcWeightedAt(m));
  const validVals=vals.filter(v=>v!==null);
  if(validVals.length<2)return;
  const title=REV_HOTELS[p].name;
  document.getElementById('catChartModalTitle').textContent='📈 Andamento score — '+title;
  document.getElementById('catChartModalTitle').style.color='#003580';
  document.getElementById('catChartModalSub').textContent='Decadimento continuo, emivita '+_trendHl+'gg · '+months.length+' mesi · tutto il periodo';
  const W=700,H=260,PL=40,PR=20,PT=30,PB=40;
  const plotW=W-PL-PR,plotH=H-PT-PB;
  const minY=Math.max(0,Math.min(...validVals)-0.2);
  const maxY=Math.min(10,Math.max(...validVals)+0.2);
  const rng=maxY-minY||0.5;
  function sx(i){return PL+i/(months.length-1)*plotW;}
  function sy(v){return PT+plotH-(v-minY)/rng*plotH;}
  const points=vals.map((v,i)=>v!==null?{x:sx(i),y:sy(v),v,m:labels[i]}:null).filter(Boolean);
  function linePath(pts){
    if(!pts.length)return'';
    return`M${pts[0].x},${pts[0].y}`+pts.slice(1).map(p=>`L${p.x},${p.y}`).join('');
  }
  const path=linePath(points);
  const areaClose=`L${points[points.length-1].x},${PT+plotH} L${points[0].x},${PT+plotH} Z`;
  const labelStep=Math.max(1,Math.ceil(points.length/12));
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;">`;
  // Griglia
  const steps=5;
  for(let i=0;i<=steps;i++){
    const v=minY+i/steps*rng;
    const y=sy(v);
    svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border-light)" stroke-width="1"/>`;
    svg+=`<text x="${PL-5}" y="${y+4}" font-size="11" fill="var(--text-dim)" text-anchor="end">${v.toFixed(1)}</text>`;
  }
  // Labels mesi
  points.forEach((pt,i)=>{
    if(i%labelStep===0||i===points.length-1){
      svg+=`<line x1="${pt.x}" y1="${PT+plotH}" x2="${pt.x}" y2="${PT+plotH+5}" stroke="var(--border-light)" stroke-width="1"/>`;
      svg+=`<text x="${pt.x}" y="${H-6}" font-size="11" fill="var(--text-dim)" text-anchor="middle">${pt.m}</text>`;
    }
  });
  svg+=`<path d="${path} ${areaClose}" fill="#003580" opacity="0.08"/>`;
  svg+=`<path d="${path}" fill="none" stroke="#003580" stroke-width="1.5"/>`;
  points.forEach((pt,i)=>{
    svg+=`<circle cx="${pt.x}" cy="${pt.y}" r="2.5" fill="#003580" stroke="white" stroke-width="1.5"/>`;
    if(i%2===0||i===points.length-1){
      const above=i%4<2;
      const ty=above?pt.y-10:pt.y+16;
      svg+=`<text x="${pt.x}" y="${ty}" font-size="9.5" fill="#003580" text-anchor="middle" font-weight="600">${pt.v.toFixed(1)}</text>`;
    }
  });
  svg+='</svg>';
  document.getElementById('catChartModalBody').innerHTML=svg;
  document.getElementById('catChartModal').style.display='flex';
}
// §§ OVERVIEW — RECENSIONI NO-REPLY (ovUpdateRevNoreply)
function ovUpdateRevNoreply(){
  const el=document.getElementById('ov-rev-noreply');
  const badge=document.getElementById('ov-rev-badge');
  if(!el)return;
  const now=Date.now();
  const DAYS15=15*24*60*60*1000;
  const recent=[];
  ['sa','bh','sl','pr','ms','ar','sb'].forEach(p=>{
    const h=REV_HOTELS[p];
    if(!h||!h.data.length)return;
    h.data.forEach(r=>{
      const sent=REV_SENT[revUniqueKey(p,r)];
      if(!r._hasReply && r._dateTs && (now-r._dateTs)<=DAYS15 && sent!==true && sent!=='not_needed'){
        recent.push({...r, _hotel:h.name, _p:p});
      }
    });
  });
  if(!recent.length){
    el.innerHTML='<div style="color:var(--green);font-size:var(--fs-xs);">✓ Nessuna recensione recente senza risposta</div>';
    if(badge)badge.style.display='none';
    return;
  }
  recent.sort((a,b)=>b._dateTs-a._dateTs);
  if(badge){badge.textContent=recent.length;badge.style.display='inline';}
  const fmt=ts=>{const d=new Date(ts);return d.getDate()+'/'+(d.getMonth()+1);};
  const scoreColor=s=>s>=9?'var(--green)':s>=7?'var(--amber)':'var(--red)';
  function makeItem(r){
    const name=r["Nome dell'ospite"]||'Ospite';
    const score=r._score||0;
    const p=r._p;
    return`<div class="notif-item" style="cursor:pointer;" onclick="setView('recensioni-${p}',document.querySelector('[onclick*=&quot;recensioni-${p}&quot;]'))">
      <div class="notif-dot" style="background:${scoreColor(score)};flex-shrink:0;"></div>
      <div style="flex:1;min-width:0;">
        <div class="notif-text" style="display:flex;align-items:center;gap:6px;">
          <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</strong>
          <span style="font-size:9px;background:var(--surface2);padding:1px 6px;border-radius:4px;color:var(--text-dim);flex-shrink:0;">${r._hotel}</span>
          <span style="margin-left:auto;font-weight:700;color:${scoreColor(score)};flex-shrink:0;">${score}</span>
        </div>
        <div class="notif-time">${fmt(r._dateTs)}</div>
      </div>
    </div>`;
  }
  const first3=recent.slice(0,3);
  const rest=recent.slice(3);
  let html=first3.map(makeItem).join('');
  if(rest.length>0){
    const restHtml=rest.map(makeItem).join('');
    html+=`<div id="ov-rev-rest" style="display:none;">${restHtml}</div>
    <div style="margin-top:6px;text-align:center;">
      <button id="ov-rev-expand-btn" onclick="(function(){
        const r=document.getElementById('ov-rev-rest');
        const btn=document.getElementById('ov-rev-expand-btn');
        const open=r.style.display!=='none';
        r.style.display=open?'none':'block';
        btn.textContent=open?'Vedi altre ${rest.length} ↓':'Nascondi ↑';
      })()" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 12px;font-size:var(--fs-xxs);color:var(--text-dim);cursor:pointer;">Vedi altre ${rest.length} ↓</button>
    </div>`;
  }
  el.innerHTML=html;
}
function ovUpdateRevImport(){
  const el=document.getElementById('ov-rev-import');
  const badge=document.getElementById('ov-rev-import-badge');
  if(!el)return;
  const HOTEL_NAMES={sa:'SoulArt',bh:'Boutique',sl:'San Liborio',pr:'Principe',ms:'Mastrangelo',ar:'Art Resort',sb:'Santa Brigida'};
  const SOGLIA_GIORNI=7;
  const now=Date.now();
  const scaduti=[];
  const ok=[];
  ['sa','bh','sl','pr','ms','ar','sb'].forEach(p=>{
    const ts=parseInt(localStorage.getItem('qm_ts_rev_'+p)||'0');
    const giorni=ts?Math.floor((now-ts)/(24*60*60*1000)):null;
    if(!ts){scaduti.push({p,nome:HOTEL_NAMES[p],giorni:null});}
    else if(giorni>SOGLIA_GIORNI){scaduti.push({p,nome:HOTEL_NAMES[p],giorni});}
    else{ok.push({p,nome:HOTEL_NAMES[p],giorni});}
  });
  if(badge){
    if(scaduti.length){badge.textContent=scaduti.length;badge.style.display='inline';}
    else{badge.style.display='none';}
  }
  if(!scaduti.length){
    el.innerHTML='<div style="color:var(--green);font-size:var(--fs-xs);">✓ Tutte le strutture aggiornate negli ultimi '+SOGLIA_GIORNI+' giorni</div>';
    return;
  }
  let html='';
  scaduti.forEach(h=>{
    const label=h.giorni===null?'Nessun import':''+h.giorni+' giorni fa';
    const color=h.giorni===null?'var(--text-dim)':h.giorni>14?'var(--red)':'var(--amber)';
    html+=`<div class="notif-item" style="cursor:pointer;" onclick="setView('recensioni-${h.p}',document.querySelector('[onclick*=&quot;recensioni-${h.p}&quot;]'))">
      <div class="notif-dot" style="background:${color};flex-shrink:0;"></div>
      <div style="flex:1;">
        <div class="notif-text"><strong>${h.nome}</strong></div>
        <div class="notif-time" style="color:${color};">⚠️ ${label}</div>
      </div>
      <span style="font-size:var(--fs-xxs);color:var(--accent);font-weight:600;">Aggiorna →</span>
    </div>`;
  });
  if(ok.length){
    html+=`<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border-light);font-size:var(--fs-xxs);color:var(--text-dim);">✓ OK: ${ok.map(h=>h.nome).join(', ')}</div>`;
  }
  el.innerHTML=html;
}
const SHEETS_URL='https://script.google.com/macros/s/AKfycbz-6oOgrKCZMwhTpmFO3VuaIJQ5EmGnvkriHOiaoshZ8DD1OlSbbl6dSeNgCKkrql4H/exec';
let bkfSheetData=[];
// Dataset separato e persistente per il grafico "Andamento coperti" SoulArt, alimentato
// dall'upload BKF Soul di questo pannello (non dal Report Pasti dell'Upload Center) — resta
// invariato tra un ciclo di upload/sync e il successivo, stesso pattern di bkfARChartData.
let bkfChartData=[];
(function initBkfSheet(){
  const zone=document.getElementById('bkfSheetUploadZone');
  const inp=document.getElementById('bkfSheetFileInput');
  zone.addEventListener('click',()=>inp.click());
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f&&f.type==='application/pdf')bkfSheetAnalyze(f);else bkfSheetShowError('Carica un file PDF.');});
  inp.addEventListener('change',e=>{if(e.target.files[0])bkfSheetAnalyze(e.target.files[0]);inp.value='';});
})();
// §§ BKF SHEET — ANALISI AI (bkfSheetAnalyze, bkfSheetSync, bkfSheetAR*)
async function bkfSheetAnalyze(file){
  bkfSheetSetStatus('analyzing');
  try{
    const base64=await new Promise((res,rej)=>{
      const r=new FileReader();
      r.onloadend=()=>res(r.result.split(',')[1]);
      r.onerror=()=>rej(new Error('Errore lettura file'));
      r.readAsDataURL(file);
    });
    const prompt=`Analizza questo PDF "BKF OGGI" del SoulArt Hotel ed estrai i dati delle colazioni.
REGOLE OBBLIGATORIE:
1. DATA: Estrai la data di ogni riga ESATTAMENTE come appare nel PDF, nel formato "Gio 09/04" (giorno abbreviato + gg/mm). NON aggiungere l'anno. NON inventare date.
2. RO (Room Only): Estrai il totale persone in Room Only per ogni data.
3. Pax BB: SOMMA Adulti + Bambini per ogni data.
4. PRESENZA GRUPPI: Se presente nel PDF, estrai il testo della colonna "Presenza Gruppi", altrimenti "".
5. Rispondi SOLO con un array JSON valido, senza markdown, senza commenti, senza testo aggiuntivo.
6. Formato esatto: [{"d": "Lun 02/03", "r": 5, "b": 37, "pg": ""}]
7. Massimo 8 righe.`;
    const response=await fetch('https://anthropic-proxy.qm-d82.workers.dev',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:1000,
        messages:[{
          role:'user',
          content:[
            {type:'document',source:{type:'base64',media_type:'application/pdf',data:base64}},
            {type:'text',text:prompt}
          ]
        }]
      })
    });
    const data=await response.json();
    if(data.error){throw new Error('API: '+data.error.type+' — '+data.error.message);}
    if(!data.content||!data.content[0]){throw new Error('Risposta vuota dal server.');}
    let jsonText=data.content[0].text.replace(/```json/g,'').replace(/```/g,'').trim();
    // estrai solo la parte JSON se ci sono testi aggiuntivi
    const match=jsonText.match(/\[[\s\S]*\]/);
    if(match)jsonText=match[0];
    bkfSheetData=JSON.parse(jsonText);
    if(!Array.isArray(bkfSheetData)||!bkfSheetData.length)throw new Error('Nessun dato estratto dal PDF.');
    // Rimuovi anno se l'AI lo ha aggiunto (es. "dom 14/03/2004" → "dom 14/03")
    bkfSheetData=bkfSheetData.map(r=>({...r,d:r.d?r.d.replace(/(\d{2}\/\d{2})\/\d{4}/,'$1'):r.d}));
    bkfSheetRenderTable();
    bkfChartData=bkfSheetData;
    LS.set('bkfChartData',bkfChartData);
    bkfRenderChart();
    bkfSheetSetStatus('ready');
  }catch(err){
    bkfSheetShowError('Errore: '+err.message);
  }
}
function bkfSheetRenderTable(){
  const tbody=document.getElementById('bkfSheetTableBody');
  tbody.innerHTML=bkfSheetData.map(r=>`
    <tr>
      <td style="font-weight:500;">${r.d||'—'}</td>
      <td><span class="bkf-ro">${r.r??'—'}</span></td>
      <td><span class="bkf-badge">${r.b??'—'}</span></td>
      <td style="font-size:var(--fs-xs);color:var(--text-muted);">${r.pg||''}</td>
    </tr>`).join('');
}
async function bkfSheetSync(){
  const btn=document.getElementById('bkfSheetSyncBtn');
  btn.disabled=true;btn.textContent='Sincronizzazione...';
  try{
    for(let i=0;i<3;i++){
      try{
        await fetch(SHEETS_URL+'?data='+encodeURIComponent(JSON.stringify(bkfSheetData)),{method:'GET'});
        break;
      }catch(e){
        if(i===2)throw e;
        await new Promise(r=>setTimeout(r,1000*Math.pow(2,i)));
      }
    }
    setTimeout(()=>bkfSheetSetStatus('success'),800);
  }catch(err){
    bkfSheetShowError('Errore di rete: '+err.message);
    btn.disabled=false;btn.textContent='↑ Sincronizza Google Sheets';
  }
}
function bkfSheetSetStatus(s){
  document.getElementById('bkfSheetUploadZone').style.display=s==='idle'?'block':'none';
  document.getElementById('bkfSheetProcessing').style.display=s==='analyzing'?'flex':'none';
  document.getElementById('bkfSheetError').style.display='none';
  document.getElementById('bkfSheetResults').style.display=s==='ready'?'block':'none';
  document.getElementById('bkfSheetSuccess').style.display=s==='success'?'block':'none';
  const btn=document.getElementById('bkfSheetSyncBtn');
  if(btn){btn.disabled=false;btn.textContent='↑ Sincronizza Google Sheets';}
}
function bkfSheetReset(){
  bkfSheetData=[];
  bkfSheetSetStatus('idle');
  document.getElementById('bkfSheetFileInput').value='';
}
function bkfSheetShowError(msg){
  document.getElementById('bkfSheetUploadZone').style.display='block';
  document.getElementById('bkfSheetProcessing').style.display='none';
  document.getElementById('bkfSheetResults').style.display='none';
  document.getElementById('bkfSheetSuccess').style.display='none';
  const e=document.getElementById('bkfSheetError');e.textContent=msg;e.style.display='block';
}
const SHEETS_URL_AR='https://script.google.com/macros/s/AKfycbzmkYzbHDgxOYXe-rnkcjpOsPArlt4gimwXHNiQfCur5FeHM6qfu2BlN0NswI4aICM/exec';
let bkfSheetARData=[];
// Dataset separato e persistente per il grafico "Andamento coperti" Galleria — a differenza
// di bkfSheetARData (righe della revisione corrente, azzerate a ogni "Nuovo caricamento")
// questo resta invariato tra un ciclo di upload/sync e il successivo.
let bkfARChartData=[];
(function initBkfSheetAR(){
  const zone=document.getElementById('bkfSheetARUploadZone');
  const inp=document.getElementById('bkfSheetARFileInput');
  zone.addEventListener('click',()=>inp.click());
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f&&f.type==='application/pdf')bkfSheetARAnalyze(f);else bkfSheetARShowError('Carica un file PDF.');});
  inp.addEventListener('change',e=>{if(e.target.files[0])bkfSheetARAnalyze(e.target.files[0]);inp.value='';});
})();
async function bkfSheetARAnalyze(file){
  bkfSheetARSetStatus('analyzing');
  try{
    const base64=await new Promise((res,rej)=>{
      const r=new FileReader();
      r.onloadend=()=>res(r.result.split(',')[1]);
      r.onerror=()=>rej(new Error('Errore lettura file'));
      r.readAsDataURL(file);
    });
    const prompt=`Analizza questo PDF "BKF OGGI" della Galleria ed estrai i dati delle colazioni.
REGOLE OBBLIGATORIE:
1. DATA: Estrai la data di ogni riga ESATTAMENTE come appare nel PDF, nel formato "Gio 09/04" (giorno abbreviato + gg/mm). NON aggiungere l'anno. NON inventare date.
2. RO (Room Only): Estrai il totale persone in Room Only per ogni data.
3. Pax BB: SOMMA Adulti + Bambini per ogni data.
4. PRESENZA GRUPPI: Se presente nel PDF, estrai il testo della colonna "Presenza Gruppi", altrimenti "".
5. Rispondi SOLO con un array JSON valido, senza markdown, senza commenti, senza testo aggiuntivo.
6. Formato esatto: [{"d": "Lun 02/03", "r": 5, "b": 37, "pg": ""}]
7. Massimo 8 righe.`;
    const response=await fetch('https://anthropic-proxy.qm-d82.workers.dev',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:1000,
        messages:[{
          role:'user',
          content:[
            {type:'document',source:{type:'base64',media_type:'application/pdf',data:base64}},
            {type:'text',text:prompt}
          ]
        }]
      })
    });
    const data=await response.json();
    if(data.error){throw new Error('API: '+data.error.type+' — '+data.error.message);}
    if(!data.content||!data.content[0]){throw new Error('Risposta vuota dal server.');}
    let jsonText=data.content[0].text.replace(/```json/g,'').replace(/```/g,'').trim();
    const match=jsonText.match(/\[[\s\S]*\]/);
    if(match)jsonText=match[0];
    bkfSheetARData=JSON.parse(jsonText);
    if(!Array.isArray(bkfSheetARData)||!bkfSheetARData.length)throw new Error('Nessun dato estratto dal PDF.');
    // Rimuovi anno se l'AI lo ha aggiunto (es. "dom 14/03/2004" → "dom 14/03")
    bkfSheetARData=bkfSheetARData.map(r=>({...r,d:r.d?r.d.replace(/(\d{2}\/\d{2})\/\d{4}/,'$1'):r.d}));
    // Render tabella
    document.getElementById('bkfSheetARTableBody').innerHTML=bkfSheetARData.map(r=>`
      <tr>
        <td style="font-weight:500;">${r.d||'—'}</td>
        <td><span class="bkf-ro">${r.r??'—'}</span></td>
        <td><span class="bkf-badge">${r.b??'—'}</span></td>
        <td style="font-size:var(--fs-xs);color:var(--text-muted);">${r.pg||''}</td>
      </tr>`).join('');
    LS.set('bkfSheetARData',bkfSheetARData);
    bkfARChartData=bkfSheetARData;
    LS.set('bkfARChartData',bkfARChartData);
    bkfSheetARSetStatus('ready');
    bkfRenderChartAR();
  }catch(err){
    bkfSheetARShowError('Errore: '+err.message);
  }
}
async function bkfSheetARSync(){
  const btn=document.getElementById('bkfSheetARSyncBtn');
  btn.disabled=true;btn.textContent='Sincronizzazione...';
  try{
    for(let i=0;i<3;i++){
      try{
        await fetch(SHEETS_URL_AR+'?data='+encodeURIComponent(JSON.stringify(bkfSheetARData)),{method:'GET'});
        break;
      }catch(e){
        if(i===2)throw e;
        await new Promise(r=>setTimeout(r,1000*Math.pow(2,i)));
      }
    }
    setTimeout(()=>bkfSheetARSetStatus('success'),800);
  }catch(err){
    bkfSheetARShowError('Errore di rete: '+err.message);
    btn.disabled=false;btn.textContent='↑ Sincronizza Google Sheets';
  }
}
function bkfSheetARSetStatus(s){
  document.getElementById('bkfSheetARUploadZone').style.display=s==='idle'?'block':'none';
  document.getElementById('bkfSheetARProcessing').style.display=s==='analyzing'?'flex':'none';
  document.getElementById('bkfSheetARError').style.display='none';
  document.getElementById('bkfSheetARResults').style.display=s==='ready'?'block':'none';
  document.getElementById('bkfSheetARSuccess').style.display=s==='success'?'block':'none';
  const btn=document.getElementById('bkfSheetARSyncBtn');
  if(btn){btn.disabled=false;btn.textContent='↑ Sincronizza Google Sheets';}
}
function bkfSheetARReset(){
  bkfSheetARData=[];
  LS.del('bkfSheetARData');
  bkfSheetARSetStatus('idle');
  bkfRenderChartAR();
  document.getElementById('bkfSheetARFileInput').value='';
}
function bkfSheetARShowError(msg){
  document.getElementById('bkfSheetARUploadZone').style.display='block';
  document.getElementById('bkfSheetARProcessing').style.display='none';
  document.getElementById('bkfSheetARResults').style.display='none';
  document.getElementById('bkfSheetARSuccess').style.display='none';
  const e=document.getElementById('bkfSheetARError');e.textContent=msg;e.style.display='block';
}
const CAP_CAMERE=33;
// §§ REPORT PULIZIE — PUL (handlePulFile, pulParseText, renderPulData, renderPulDay, updateKpiFromPulizie)
let pulData=null,pulActiveDay=0;
let pulOpen=false;
function togglePulAccordion(){}
(function initPulUpload(){
  const box=document.getElementById('pulUploadBox');
  const inp=document.getElementById('pulFileInput');
  if(box){box.addEventListener('click',()=>inp.click());box.addEventListener('dragover',e=>{e.preventDefault();box.classList.add('dragover');});box.addEventListener('dragleave',()=>box.classList.remove('dragover'));box.addEventListener('drop',e=>{e.preventDefault();box.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f&&f.type==='application/pdf')handlePulFile(f);else pulShowError('Carica un file PDF.');});}
  inp.addEventListener('change',e=>{if(e.target.files[0])handlePulFile(e.target.files[0]);});
})();
async function handlePulFile(file){
  ucSetState('pul','loading','Lettura PDF...');
  try{
    const ab=await file.arrayBuffer();
    const pdfDoc=await pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise;
    let text='';
    for(let i=1;i<=pdfDoc.numPages;i++){
      const page=await pdfDoc.getPage(i);
      const tc=await page.getTextContent();
      text+=tc.items.map(x=>x.str).join(' ')+'\n';
    }
    const days=pulParseText(text);
    if(!days.length){pulShowError('Nessun dato trovato nel PDF.');return;}
    pulData=days;
    pulShowStatus('');
    const _newPts=Date.now();
    localStorage.setItem('qm_ts_pulTs',String(_newPts));
    renderPulData();
    setUploadTs('pulTs',_newPts);
  }catch(e){pulShowError('Errore lettura: '+e.message);}
}
function pulParseText(text){
  const days=[];
  // Pattern: giorno data arrivi fermate-totali fermate-da-pulire partenze
  // es: "Lun 16/03/2026 17 11 11 7"
  const pat=/(?:Lun|Mar|Mer|Gio|Ven|Sab|Dom)\s+(\d{1,2}\/\d{2}\/\d{4})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/gi;
  const dayNames={Lun:'Lun',Mar:'Mar',Mer:'Mer',Gio:'Gio',Ven:'Ven',Sab:'Sab',Dom:'Dom'};
  const norm=text.replace(/\s+/g,' ');
  const pat2=/((Lun|Mar|Mer|Gio|Ven|Sab|Dom)\s+(\d{1,2}\/\d{2}\/\d{4})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+))/gi;
  let m;
  while((m=pat2.exec(norm))!==null){
    days.push({
      label:m[2]+' '+m[3].substring(0,5),
      data:m[3],
      arrivi:parseInt(m[4]),
      fermate:parseInt(m[5]),
      fermatePulizia:parseInt(m[6]),
      partenze:parseInt(m[7])
    });
  }
  return days;
}
function renderPulData(silent){
  if(!pulData||!pulData.length)return;
  // auto-seleziona il giorno corrente
  const today=new Date();
  const todayStr=String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear();
  let idx=pulData.findIndex(d=>d.data===todayStr);
  if(idx===-1)idx=0;
  pulActiveDay=idx;
  // build week nav
  const nav=document.getElementById('pulWeekNav');
  nav.innerHTML='';
  pulData.forEach((d,i)=>{
    const btn=document.createElement('button');
    btn.className='pul-day-btn'+(i===idx?' active':'');
    btn.textContent=d.label.split(' ')[0];
    btn.title=d.label;
    btn.onclick=()=>{pulActiveDay=i;renderPulDay();document.querySelectorAll('.pul-day-btn').forEach((b,j)=>b.classList.toggle('active',j===i));};
    nav.appendChild(btn);
  });
  ucSetState('pul','loaded',pulData[0].label+' – '+pulData[pulData.length-1].label,silent);
  // Il box resta cliccabile anche a dati già caricati: un nuovo file si carica con un
  // solo clic, senza dover prima premere "Rimuovi" (come già per Turno e Arrivi).
  document.getElementById('pulLoadedInfo').classList.add('visible');
  document.getElementById('pulStatGrid').style.display='grid';
  document.getElementById('pulOccBar').style.display='block';
  document.getElementById('btnPulReload').style.display='block';
  renderPulDay(silent);
  updateKpiFromPulizie(pulData[pulActiveDay]);
}
function renderPulDay(silent){
  if(!pulData)return;
  const d=pulData[pulActiveDay];
  document.getElementById('pulLoadedDate').textContent=d.label;
  // stats grid
  const occ=Math.max(0,Math.min(CAP_CAMERE,CAP_CAMERE-d.partenze+d.arrivi));
  const occPct=Math.round((occ/CAP_CAMERE)*100);
  document.getElementById('pulStatGrid').innerHTML=`
    <div class="pul-stat"><div class="pul-stat-val arr">${d.arrivi}</div><div class="pul-stat-lbl">Arrivi</div></div>
    <div class="pul-stat"><div class="pul-stat-val dep">${d.partenze}</div><div class="pul-stat-lbl">Partenze</div></div>
    <div class="pul-stat"><div class="pul-stat-val fer">${d.fermatePulizia}</div><div class="pul-stat-lbl">Fermate</div></div>`;
  document.getElementById('pulOccPct').textContent=occPct+'%  ('+occ+'/'+CAP_CAMERE+')';
  document.getElementById('pulOccFill').style.width=occPct+'%';
  updateKpiFromPulizie(d);
  renderOvOccChart();
  if(!silent){const _pts=localStorage.getItem('qm_ts_pulTs');LS.set('pulData',{data:pulData,activeDay:pulActiveDay,ts:_pts?parseInt(_pts):Date.now()});}
}
// Grafico "Andamento occupazione settimanale" in Piano del giorno — stesso stile SVG
// del grafico coperti Breakfast (_bkfChartRender), dati reali da pulData (Report pulizie):
// occupazione % = min(CAP_CAMERE, fermate+arrivi)/CAP_CAMERE, camere libere = il complemento.
function renderOvOccChart(){
  const pts=(pulData||[]).map(d=>{
    const occEst=Math.min(CAP_CAMERE,(d.fermatePulizia||0)+(d.arrivi||0));
    return{label:d.label.split(' ')[0],v:Math.round((occEst/CAP_CAMERE)*100),nc:CAP_CAMERE-occEst};
  });
  _bkfChartRender('ov-occ-chart',pts,pulActiveDay,'Carica il report pulizie per vedere il grafico','Occupazione %','Camere libere');
}
function updateKpiFromPulizie(d){
  // Se per questa data abbiamo il Riepilogo Reception (AI, deduplicato), usa quel conteggio
  // reale degli arrivi invece del numero del Report Pulizie, che può essere impreciso/non aggiornato.
  if(arriviData&&arriviData.data===d.data&&Array.isArray(arriviData.arrivi)){
    d={...d,arrivi:arriviData.arrivi.length};
  }
  const occ=d.arrivi - d.partenze; // camere nette in entrata oggi
  // calcolo camere occupate: usiamo arrivi come check-in del giorno
  // e partenze come check-out; l'occupazione è stimata come arrivi della settimana
  // ma il PDF non dà il totale in casa, quindi usiamo: camere_occup = arrivi (check-in oggi)
  // e occupazione % = arrivi / CAP * 100 come indicatore giornaliero
  const pct=Math.round((d.arrivi/CAP_CAMERE)*100);
  const totCamere=d.arrivi+d.fermatePulizia; // camere coinvolte oggi (arrivi + fermate)
  const occEstimata=Math.min(CAP_CAMERE,d.fermatePulizia+d.arrivi);
  const occPct=Math.round((occEstimata/CAP_CAMERE)*100);
  // KPI riga 1 — Check-in
  const chkEl=document.getElementById('kpi-checkin');
  const chkDelta=document.getElementById('kpi-checkout-delta');
  const chkSub=document.getElementById('kpi-checkin-sub');
  if(chkEl){chkEl.textContent=d.arrivi;}
  if(chkDelta){chkDelta.textContent='↑ '+d.partenze+' partenze oggi';chkDelta.className='kpi-delta';}
  if(chkSub){chkSub.textContent=d.label;}
  // KPI riga 2 — Arrivi
  const arrEl=document.getElementById('kpi-arrivi');
  const arrDelta=document.getElementById('kpi-arrivi-delta');
  const arrSub=document.getElementById('kpi-arrivi-sub');
  if(arrEl){arrEl.textContent=d.arrivi;}
  if(arrDelta){arrDelta.textContent='Check-in previsti';arrDelta.className='kpi-delta up';}
  if(arrSub){arrSub.textContent=d.label;}
  // KPI riga 2 — Partenze
  const depEl=document.getElementById('kpi-partenze');
  const depDelta=document.getElementById('kpi-partenze-delta');
  const depSub=document.getElementById('kpi-partenze-sub');
  if(depEl){depEl.textContent=d.partenze;}
  if(depDelta){depDelta.textContent='Check-out previsti';depDelta.className='kpi-delta down';}
  if(depSub){depSub.textContent=d.label;}
  // KPI riga 2 — Fermate
  const ferEl=document.getElementById('kpi-fermate');
  const ferDelta=document.getElementById('kpi-fermate-delta');
  const ferSub=document.getElementById('kpi-fermate-sub');
  if(ferEl){ferEl.textContent=d.fermatePulizia;}
  if(ferDelta){ferDelta.textContent='Camere in fermata';ferDelta.className='kpi-delta';}
  if(ferSub){ferSub.textContent='Di cui '+d.fermatePulizia+' da pulire';}
  // KPI riga 2 — Occupazione
  const occEl=document.getElementById('kpi-occ-val');
  const occBar=document.getElementById('kpi-occ-bar');
  const occSub=document.getElementById('kpi-occ-sub');
  if(occEl){occEl.textContent=occPct+'%';}
  if(occBar){occBar.style.width=occPct+'%';}
  if(occSub){occSub.textContent=occEstimata+' / '+CAP_CAMERE+' camere occupate';}
}
function resetPulizie(){
  pulData=null;pulActiveDay=0;
  const pulBox=document.getElementById('pulUploadBox');if(pulBox)pulBox.style.display='';
  document.getElementById('pulLoadedInfo').classList.remove('visible');
  document.getElementById('pulStatGrid').style.display='none';
  document.getElementById('pulOccBar').style.display='none';
  document.getElementById('pulWeekNav').innerHTML='';
  document.getElementById('btnPulReload').style.display='none';
  document.getElementById('pulFileInput').value='';
  ucSetState('pul','','Non caricato');
  LS.del('pulData');
}
function pulShowStatus(msg){
  if(msg)ucSetState('pul','loading',msg);
  else ucSetState('pul','','Non caricato');
}
function pulShowError(msg){
  ucSetState('pul','error','Errore');
  cqAvviso(msg);
}
// §§ RECENSIONI — SCORING & INIT UPLOAD (weightedAvgF1, revHandleFile init per tutti gli hotel)
const DECAY_F1_MS=270*24*60*60*1000;
function weightedAvgF1(reviews, nowTs){
  if(!reviews.length)return null;
  const ws=reviews.reduce((s,r)=>s+Math.exp(-(nowTs-r._dateTs)/DECAY_F1_MS)*r._score,0);
  const wt=reviews.reduce((s,r)=>s+Math.exp(-(nowTs-r._dateTs)/DECAY_F1_MS),0);
  return wt?ws/wt:null;
}
const REV_CATS=['Staff','Pulizia','Posizione','Servizi','Comfort','Rapporto qualità/prezzo'];
const REV_CAT_LABELS={'Rapporto qualità/prezzo':'Qualità/prezzo'};
const catLabel=cat=>REV_CAT_LABELS[cat]||cat;
const REV_REPLY_STORE={};
const REV_HOTELS={
  sa:{name:'SoulArt Hotel',data:[],filtered:[],filters:[],sort:'date_desc',search:'',page:0},
  bh:{name:'Boutique Hotel',data:[],filtered:[],filters:[],sort:'date_desc',page:0},
  sl:{name:'San Liborio',data:[],filtered:[],filters:[],sort:'date_desc',page:0},
  pr:{name:'Principe',data:[],filtered:[],filters:[],sort:'date_desc',page:0},
  ms:{name:'Mastrangelo',data:[],filtered:[],filters:[],sort:'date_desc',page:0},
  ar:{name:'Art Resort',data:[],filtered:[],filters:[],sort:'date_desc',page:0},
  sb:{name:'Santa Brigida',data:[],filtered:[],filters:[],sort:'date_desc',page:0},
};
// Caratteristiche distintive per struttura — usate nel prompt di risposta recensioni
// per valorizzare/difendere l'identità reale di ciascun hotel invece di frasi generiche
const REV_HOTEL_FACTS={
  sa:'SoulArt Hotel è una struttura di nuova apertura, nuovissima e super moderna: situato in un palazzo storico degli anni \'30 di epoca fascista, nel cuore del centro storico di Napoli a pochi passi da via Toledo. Arredamento e stile minimalisti e ultramoderni — una scelta di carattere, non un limite.',
  bh:'Boutique Hotel è situato in un palazzo storico degli anni \'30 di epoca fascista, in Piazza Carità, nel cuore del centro storico di Napoli a pochi passi da via Toledo.',
  sl:'Art Suite San Liborio si trova nel pittoresco Vico San Liborio, nel quartiere della Pignasecca.',
  pr:'Art Suite Principe Umberto si trova vicino alla Stazione Centrale di Napoli.',
  ms:'Rooms Mastrangelo si trova vicino alla Stazione Centrale di Napoli.',
  ar:'Art Resort è un prestigioso hotel 4 stelle situato all\'interno della celebre Galleria Umberto I, a pochi passi da Piazza del Plebiscito, con camere Deluxe e Junior Suite con vista diretta sulla Galleria. Arredamento e stile in barocco napoletano.',
  sb:'Art Suite Santa Brigida si trova all\'interno della Galleria Umberto I, a pochi passi da Piazza del Plebiscito. Arredamento e stile in barocco napoletano.',
};
const REV_DEFENSE_PLAYBOOK=`- Scusati SOLO per reali disservizi accidentali o episodi isolati (es. un guasto tecnico temporaneo) — MAI per caratteristiche strutturali, storiche o di design della struttura.
- Colazione: è un nostro punto di forza riconosciuto e molto apprezzato — valorizzala e difendila da critiche generiche, non scusarti.
- Letti e cuscini: sottolinea che sono comodi, di alta qualità, con standard adeguati alla categoria 4 stelle.
- Rumori dal centro città / insonorizzazione: evidenzia gli infissi di ultima generazione ultra-insonorizzati, pensati apposta per isolare dal contesto esterno pur essendo in posizione centralissima.
- Arredamento SoulArt (minimal): se lamentano l'assenza di armadi o arredi classici, non scusarti — rivendica la scelta di un design minimalista e ultramoderno, coerente con l'identità della struttura.
- Arredamento Art Resort / Art Suite Santa Brigida (barocco napoletano): se lamentano uno stile "eccessivo" o "troppo decorato", non scusarti — rivendica lo stile barocco napoletano come scelta identitaria, in linea con la posizione nella storica Galleria Umberto I.
- Reception/difficoltà a trovare l'hotel: essendo strutture all'interno di palazzi storici o della Galleria Umberto I, spiega che per questa conformazione la reception si trova all'interno dell'edificio e non fronte strada.
- Ascensore "vecchio": chiarisci che non è vecchio ma ANTICO, coerente con l'epoca del palazzo e preservato appositamente per mantenere intatto il fascino storico dell'edificio.`;
// Recupera fino a `n` risposte già scritte e presenti nei CSV caricati (stesso codice
// lingua della recensione corrente) da usare come esempio di stile per l'AI — impara dal
// tono/registro realmente usato in passato invece di inventarlo da zero
function revGetStyleExamples(isItalianTarget,n){
  const pool=[];
  Object.values(REV_HOTELS).forEach(h=>{
    (h.data||[]).forEach(r=>{
      const txt=(r['Risposta della struttura']||'').trim();
      if(txt.length<40)return;
      if(revIsItalian(r)!==isItalianTarget)return;
      pool.push(txt);
    });
  });
  // Varietà: mescola e prendi le prime n invece delle prime n in ordine di caricamento
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,n).map(t=>t.length>600?t.slice(0,600)+'…':t);
}
// Init upload per entrambi gli hotel
['sa','bh','sl','pr','ms','ar','sb'].forEach(p=>{
  const zone=document.getElementById('revUploadZone-'+p);
  const inp=document.getElementById('revFileInput-'+p);
  zone.addEventListener('click',()=>inp.click());
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f)revHandleFile(p,f);});
  inp.addEventListener('change',e=>{if(e.target.files[0])revHandleFile(p,e.target.files[0]);});
});
// §§ RECENSIONI — LOGICA (revParseCsv, revRenderCatTrend, revRenderExpiring, revRenderStats, revRenderList, revGenerateReply)
function revAutoMarkNoComment(p,rows){
  // Recensioni senza alcun commento → non necessaria (Booking non consente risposta)
  let changed=false;
  rows.forEach(r=>{
    const hasComment=!!(
      (r['Recensione positiva']&&r['Recensione positiva'].trim())||
      (r['Recensione negativa']&&r['Recensione negativa'].trim())||
      (r['Titolo della recensione']&&r['Titolo della recensione'].trim())
    );
    if(!hasComment&&!r._hasReply){
      const key=revUniqueKey(p,r);
      if(REV_SENT[key]!=='not_needed'){REV_SENT[key]='not_needed';changed=true;}
    }
  });
  if(changed){
    try{localStorage.setItem('qm_rev_sent',JSON.stringify(REV_SENT));}catch(e){}
    try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_rev_sent',value:JSON.stringify(REV_SENT)})}).catch(()=>{});}catch(e){}
  }
}
function revHandleFile(p,file){
  document.getElementById('revProcessing-'+p).style.display='flex';
  document.getElementById('revUploadZone-'+p).style.display='none';
  document.getElementById('revError-'+p).style.display='none';
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const csvText=e.target.result;
      const rows=revParseCsv(csvText);
      if(!rows.length){revShowError(p,'Nessuna recensione trovata nel file.');return;}
      REV_HOTELS[p].data=rows;
      REV_HOTELS[p].filtered=[...rows];
      revAutoMarkNoComment(p,rows);
      // Timestamp di QUESTO import, salvato SUBITO: revCalibRicalcola lo usa come limite di
      // "usabilità" delle osservazioni (vedi nota lì) — deve già essere in localStorage
      // quando lo legge, non quello dell'import precedente.
      const _revTs=Date.now();
      try{localStorage.setItem('qm_ts_rev_'+p,String(_revTs));
        fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_ts_rev_'+p,value:String(_revTs)})}).catch(()=>{});} catch(e){}
      // Un nuovo CSV può rendere valutabili osservazioni prima "in attesa", anche senza
      // recensioni nuove (l'import fresco da solo conferma "nessuna novità"): ricalcola
      // qui, non a ogni render.
      try{revCalibRicalcola(p);}catch(e){}
      document.getElementById('revProcessing-'+p).style.display='none';
      document.getElementById('revContent-'+p).style.display='block';
      revRenderStats(p);
      revRenderExpiring(p);
      revRenderCatTrend(p);
      revRenderList(p);
      ovUpdateRevNoreply();ovUpdateRevImport();
      // Salva il testo CSV grezzo in localStorage e cloud KV
      try{localStorage.setItem('qm_rev_'+p, csvText);}catch(e){}
      revShowTs(p,_revTs);
      try{
        fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({key:'qm_rev_'+p, value:csvText})}).catch(()=>{});
      }catch(e){}
    }catch(err){revShowError(p,'Errore: '+err.message);}
  };
  reader.readAsText(file,'UTF-8');
}
function revParseCsv(text){
  // Parser CSV robusto: gestisce newline reali dentro campi quotati
  function parseCSVFull(str){
    const results=[];
    let i=0, row=[], cur='', inQ=false;
    while(i<str.length){
      const c=str[i];
      if(inQ){
        if(c==='"'&&str[i+1]==='"'){cur+='"';i+=2;}       // "" → "
        else if(c==='"'){inQ=false;i++;}                   // chiude quota
        else{cur+=c;i++;}                                  // testo dentro quota (inclusi \n)
      } else {
        if(c==='"'){inQ=true;i++;}                         // apre quota
        else if(c===','){row.push(cur);cur='';i++;}        // separatore
        else if(c==='\r'&&str[i+1]==='\n'){row.push(cur);results.push(row);row=[];cur='';i+=2;}
        else if(c==='\n'){row.push(cur);results.push(row);row=[];cur='';i++;}
        else{cur+=c;i++;}
      }
    }
    if(cur||row.length)row.push(cur);
    if(row.length>1||(row.length===1&&row[0]))results.push(row);
    return results;
  }
  const allRows=parseCSVFull(text);
  if(!allRows.length)return[];
  const headers=allRows[0].map(h=>h.trim());
  const rows=[];
  for(let i=1;i<allRows.length;i++){
    const vals=allRows[i];
    const obj={};
    headers.forEach((h,j)=>obj[h]=(vals[j]||'').trim());
    if(!obj['Punteggio della recensione'])continue;
    obj._score=parseFloat(obj['Punteggio della recensione'])||0;
    // Timestamp COMPLETO (YYYY-MM-DD HH:MM:SS), non la sola data: più recensioni possono
    // arrivare lo stesso giorno, e per la calibrazione dalle osservazioni è proprio
    // l'ORDINE fra recensione e lettura del punteggio a rendere informativa la transizione.
    // Lo spazio va convertito in 'T' — Safari non parsa "2026-08-09 15:00:00".
    const rawFull=(obj['Data della recensione']||'').trim();
    let parsedDate=new Date(rawFull.replace(' ','T'));
    if(isNaN(parsedDate))parsedDate=new Date(rawFull.split(' ')[0]);
    obj._dateTs=isNaN(parsedDate)?0:parsedDate.getTime();
    obj._date=isNaN(parsedDate)?new Date(0):parsedDate;
    obj._hasReply=!!(obj['Risposta della struttura']&&obj['Risposta della struttura'].trim());
    rows.push(obj);
  }
  return rows.sort((a,b)=>b._dateTs-a._dateTs);
}
const REV_TREND_CATS=['Staff','Pulizia','Servizi','Comfort','Rapporto qualità/prezzo'];
const REV_TREND_COLORS=['#4A90D9','#27AE60','#E67E22','#9B59B6','#E74C3C'];
function revRenderCatTrend(p){
  const data=REV_HOTELS[p].data;
  const el=document.getElementById('revCatTrend-'+p);
  if(!el||!data.length)return;
  // Raggruppa per mese
  const byMonth={};
  data.forEach(r=>{
    if(!r._dateTs)return;
    const d=new Date(r._dateTs);
    const key=d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0');
    if(!byMonth[key])byMonth[key]=[];
    byMonth[key].push(r);
  });
  const months=Object.keys(byMonth).sort();
  if(months.length<2){
    el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Servono almeno 2 mesi di dati</div>';
    return;
  }
  const mesiBrevi=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const labels=months.map(m=>{const[y,mo]=m.split('-');return mesiBrevi[parseInt(mo)-1]+'\''+y.slice(2);});
  function smoothPath(points,W,H){
    if(points.length<2)return'';
    let d=`M${points[0].x},${points[0].y}`;
    for(let i=0;i<points.length-1;i++){
      const p0=points[Math.max(0,i-1)];
      const p1=points[i];
      const p2=points[i+1];
      const p3=points[Math.min(points.length-1,i+2)];
      const cp1x=p1.x+(p2.x-p0.x)/6;
      const cp1y=p1.y+(p2.y-p0.y)/6;
      const cp2x=p2.x-(p3.x-p1.x)/6;
      const cp2y=p2.y-(p3.y-p1.y)/6;
      d+=` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  }
  function makeCatCard(cat, color){
    const vals=months.map(m=>{
      const v=byMonth[m].map(r=>parseFloat(r[cat])).filter(v=>!isNaN(v)&&v>0);
      return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
    });
    const validVals=vals.filter(v=>v!==null);
    if(!validVals.length)return'';
    // Calcolo ponderato 85/10/5 su tutte le recensioni (non per mese)
    const nowTs=Date.now();
    function catWeighted85(){
      const allRevs=Object.values(byMonth).flat();
      const f1=allRevs.filter(r=>(nowTs-r._dateTs)/86400000<=365);
      const f2=allRevs.filter(r=>{const d=(nowTs-r._dateTs)/86400000;return d>365&&d<=730;});
      const f3=allRevs.filter(r=>{const d=(nowTs-r._dateTs)/86400000;return d>730&&d<=1096;});
      const avg=arr=>{const v=arr.map(r=>parseFloat(r[cat])).filter(v=>!isNaN(v)&&v>0);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
      const a1=avg(f1),a2=avg(f2),a3=avg(f3);
      let wT=0,wS=0;
      if(a1!==null){wT+=0.85;wS+=0.85*a1;}
      if(a2!==null){wT+=0.10;wS+=0.10*a2;}
      if(a3!==null){wT+=0.05;wS+=0.05*a3;}
      return wT>0?wS/wT:null;
    }
    const weightedScore=catWeighted85();
    const displayScore=weightedScore!==null?weightedScore:validVals[validVals.length-1];
    const last=validVals[validVals.length-1]; // ultimo mese per trend
    const prev=validVals.length>1?validVals[validVals.length-2]:null;
    const trend=prev!==null?last-prev:0;
    const trendIcon=trend>0.1?'▲':trend<-0.1?'▼':'→';
    const trendColor=trend>0.1?'var(--green)':trend<-0.1?'var(--red)':'var(--text-dim)';
    const scoreColor=displayScore>=9?'var(--green)':displayScore>=7.5?'var(--amber)':'var(--red)';
    const W=220,H=60,PL=4,PR=4,PT=6,PB=18;
    const plotW=W-PL-PR,plotH=H-PT-PB;
    const minY=Math.max(0,Math.min(...validVals)-0.5);
    const maxY=Math.min(10,Math.max(...validVals)+0.5);
    const rng=maxY-minY||1;
    const points=vals.map((v,i)=>{
      if(v===null)return null;
      return{x:PL+i/(months.length-1)*plotW, y:PT+plotH-(v-minY)/rng*plotH};
    }).filter(Boolean);
    const path=smoothPath(points);
    const areaClose=`L${points[points.length-1].x},${PT+plotH} L${points[0].x},${PT+plotH} Z`;
    let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:60px;">`;
    // Area fill
    svg+=`<path d="${path} ${areaClose}" fill="${color}" opacity="0.08"/>`;
    // Linea
    svg+=`<path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
    // Punti
    points.forEach((pt,i)=>{
      svg+=`<circle cx="${pt.x}" cy="${pt.y}" r="2.5" fill="${color}" stroke="white" stroke-width="1.2"/>`;
    });
    // Labels mesi sull'asse X (solo primo e ultimo)
    svg+=`<text x="${PL}" y="${H-2}" font-size="8" fill="var(--text-dim)">${labels[0]}</text>`;
    svg+=`<text x="${W-PR}" y="${H-2}" font-size="8" fill="var(--text-dim)" text-anchor="end">${labels[labels.length-1]}</text>`;
    svg+='</svg>';
    return`<div class="panel" style="min-width:180px;cursor:pointer;transition:box-shadow .15s;" onmouseenter="this.style.boxShadow='0 4px 16px rgba(0,0,0,.12)'" onmouseleave="this.style.boxShadow=''" onclick="openCatModal('${cat}','${color}',_revMonths_${p},_revByMonth_${p},_revLabels_${p})">
      <div class="panel-header" style="border-bottom:none;padding-bottom:4px;">
        <span class="panel-title" style="font-size:var(--fs-xs);color:${color};">${catLabel(cat)}</span>
        <span style="margin-left:auto;font-size:9px;color:var(--text-dim);">⤢</span>
      </div>
      <div style="padding:0 14px 4px;">
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:2px;">
          <span style="font-size:22px;font-weight:700;color:${scoreColor};">${displayScore.toFixed(1)}</span>
          <span style="font-size:11px;color:${trendColor};font-weight:600;">${trendIcon} ${Math.abs(trend).toFixed(1)}</span>
          <span style="font-size:9px;color:var(--text-dim);margin-left:auto;">ult. mese ${last.toFixed(1)}</span>
        </div>
        ${svg}
      </div>
    </div>`;
  }
  const cards=REV_TREND_CATS.map((cat,i)=>makeCatCard(cat,REV_TREND_COLORS[i])).filter(Boolean);
  // Salva dati globali per il modal
  window['_revMonths_'+p]=months;
  window['_revByMonth_'+p]=byMonth;
  window['_revLabels_'+p]=labels;
  el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">${cards.join('')}</div>`;
}
function revRenderExpiring(p){
  const data=REV_HOTELS[p].data;
  const el=document.getElementById('rev-expiring-'+p);
  if(!el||!data.length)return;
  const nowTs=Date.now();
  const now=new Date(); now.setHours(0,0,0,0);
  const THREE_YEARS=3*365.25*24*60*60*1000;
  // Settimane
  const dayOfWeek=now.getDay()===0?6:now.getDay()-1;
  const startThisWeek=new Date(now); startThisWeek.setDate(now.getDate()-dayOfWeek);
  const endThisWeek=new Date(startThisWeek); endThisWeek.setDate(startThisWeek.getDate()+6); endThisWeek.setHours(23,59,59,999);
  const startNextWeek=new Date(endThisWeek); startNextWeek.setDate(endThisWeek.getDate()+1); startNextWeek.setHours(0,0,0,0);
  const endNextWeek=new Date(startNextWeek); endNextWeek.setDate(startNextWeek.getDate()+6); endNextWeek.setHours(23,59,59,999);
  const scored=data.filter(r=>r._score>0);
  const allExpiring=scored.map(r=>({...r,_expDate:new Date(r._dateTs+THREE_YEARS)}))
    .filter(r=>r._expDate>=startThisWeek&&r._expDate<=endNextWeek);
  const thisWeek=allExpiring.filter(r=>r._expDate<=endThisWeek);
  const nextWeek=allExpiring.filter(r=>r._expDate>endThisWeek);
  // Stesso modello della card Punteggio medio: se qui restasse il vecchio 85/10/5 questo
  // pannello mostrerebbe uno "score attuale" diverso da quello in cima alla pagina.
  const _expHl=revHl(p);
  function calcScore(reviewSet){
    return punteggioBooking(reviewSet,_expHl,nowTs).score;
  }
  const scoreAttuale=calcScore(scored);
  // Score dopo scadenza questa settimana
  const afterThisWeek=scored.filter(r=>!thisWeek.find(e=>e._dateTs===r._dateTs));
  const scoreAfterThis=calcScore(afterThisWeek);
  // Score dopo scadenza entrambe le settimane
  const afterBoth=scored.filter(r=>!allExpiring.find(e=>e._dateTs===r._dateTs));
  const scoreAfterBoth=calcScore(afterBoth);
  // Simulatore: quante recensioni con 10 (o 9) servono per compensare
  function neededToCompensate(baseReviews, targetScore, scoreVal){
    if(!targetScore)return null;
    for(let n=1;n<=300;n++){
      const sim=[...baseReviews,...Array(n).fill({_score:scoreVal,_dateTs:nowTs})];
      const s=calcScore(sim);
      if(s!==null&&s>=targetScore-0.005)return n;
    }
    return 300;
  }
  const ceilScoreAtt=scoreAttuale?Math.round(scoreAttuale*10)/10:null;
  const needed10=scoreAfterBoth&&scoreAttuale?neededToCompensate(afterBoth,ceilScoreAtt,10):null;
  const needed9=scoreAfterBoth&&scoreAttuale?neededToCompensate(afterBoth,ceilScoreAtt,9):null;
  // ── Helpers UI ──
  function fmt(d){return d.getDate()+'/'+(d.getMonth()+1);}
  function deltaStr(a,b){if(a===null||b===null)return'';const d=b-a;return(d>=0?'+':'')+d.toFixed(2);}
  function deltaColor(a,b){if(a===null||b===null)return'var(--text-dim)';return b>=a?'var(--green)':'var(--red)';}
  const scoreGroups=[
    {label:'1–5',min:1,max:5,color:'var(--red)',tag:'sfavorevole'},
    {label:'6',min:6,max:6,color:'var(--amber)',tag:'sfavorevole'},
    {label:'7',min:7,max:7,color:'var(--amber)',tag:'sfavorevole'},
    {label:'8',min:8,max:8,color:'var(--accent)',tag:'neutro'},
    {label:'9',min:9,max:9,color:'var(--green)',tag:'favorevole'},
    {label:'10',min:10,max:10,color:'var(--green)',tag:'favorevole'},
  ];
  // Semaforo settimana
  function semaforo(reviews, currentScore){
    if(!reviews.length)return{color:'var(--green)',label:'Nessuna scadenza',icon:'✓'};
    const avgExp=reviews.reduce((s,r)=>s+r._score,0)/reviews.length;
    const favorable=reviews.filter(r=>r._score>=9).length;
    const unfavorable=reviews.filter(r=>r._score<=7).length;
    if(favorable>unfavorable)return{color:'var(--red)',label:'Attenzione — score alto in scadenza',icon:'🔴'};
    if(unfavorable>favorable)return{color:'var(--green)',label:'Favorevole — score basso in scadenza',icon:'🟢'};
    return{color:'var(--amber)',label:'Neutro — impatto bilanciato',icon:'🟡'};
  }
  function renderWeekSection(reviews,title,weekColor,afterScore){
    const sem=semaforo(reviews, scoreAttuale);
    const favorevoli=reviews.filter(r=>r._score>=9);
    const sfavorevoli=reviews.filter(r=>r._score<=7);
    const neutri=reviews.filter(r=>r._score===8);
    let html=`<div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border-light);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
        <span style="font-size:var(--fs-xs);font-weight:600;color:${weekColor};">${title}</span>
        <span style="font-size:var(--fs-xxs);font-weight:600;background:var(--surface2);padding:3px 9px;border-radius:8px;color:var(--text-muted);">${reviews.length} recension${reviews.length===1?'e':'i'}</span>
        <span style="font-size:11px;" title="${sem.label}">${sem.icon} ${sem.label}</span>`;
    if(afterScore!==null&&scoreAttuale!==null){
      const dScoreAtt=Math.round(scoreAttuale*10)/10;
      const dScoreAft=Math.round(afterScore*10)/10;
      const delta=dScoreAft-dScoreAtt;
      const dc=delta>=0?'var(--green)':'var(--red)';
      html+=`<span style="margin-left:auto;font-size:var(--fs-xs);font-weight:700;color:${dc};">${dScoreAtt.toFixed(1)} → ${dScoreAft.toFixed(1)} <span style="font-size:var(--fs-xxs);">(${delta>=0?'+':''}${delta.toFixed(1)})</span></span>`;
    }
    html+=`</div>`;
    if(!reviews.length){html+=`<div style="color:var(--green);font-size:var(--fs-xs);">✓ Nessuna recensione in scadenza</div></div>`;return html;}
    // Impatto netto
    html+=`<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">`;
    if(favorevoli.length)html+=`<div style="background:#e8f5e9;border:1px solid var(--green);border-radius:6px;padding:4px 10px;font-size:var(--fs-xxs);color:var(--green);font-weight:600;">📉 ${favorevoli.length} favorevoli in scadenza</div>`;
    if(sfavorevoli.length)html+=`<div style="background:#fce8e8;border:1px solid var(--red);border-radius:6px;padding:4px 10px;font-size:var(--fs-xxs);color:var(--red);font-weight:600;">📈 ${sfavorevoli.length} sfavorevoli in scadenza</div>`;
    if(neutri.length)html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:600;">➡️ ${neutri.length} neutri</div>`;
    html+=`</div>`;
    // Gruppi per score
    html+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;">`;
    scoreGroups.forEach(g=>{
      const group=reviews.filter(r=>r._score>=g.min&&r._score<=g.max);
      if(!group.length)return;
      html+=`<div style="background:var(--surface2);border:1px solid var(--border-light);border-radius:7px;padding:8px 10px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-size:13px;font-weight:700;color:${g.color};">${g.label}</span>
          <span style="font-size:var(--fs-xxs);background:${g.color};color:#fff;border-radius:9px;padding:2px 8px;font-weight:700;">${group.length}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          ${group.map(r=>`<div style="font-size:var(--fs-xxs);color:var(--text-dim);display:flex;justify-content:space-between;gap:4px;">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r["Nome dell'ospite"]||'—'}</span>
            <span style="flex-shrink:0;color:var(--text-muted);">${fmt(r._expDate)}</span>
          </div>`).join('')}
        </div>
      </div>`;
    });
    html+=`</div></div>`;
    return html;
  }
  // ── Header score attuale vs proiezione ──
  const hasExp=allExpiring.length>0;
  const proiezioneDelta=scoreAfterBoth!==null&&scoreAttuale!==null?(Math.round(scoreAfterBoth*10)/10)-(Math.round(scoreAttuale*10)/10):null;
  const proiezioneColor=proiezioneDelta===null?'var(--text-dim)':proiezioneDelta>=0?'var(--green)':'var(--red)';
  // ── Modalità compatta ────────────────────────────────────────────────────
  // Con il decadimento calibrato le recensioni in uscita sono la coda più leggera dello
  // storico: su una struttura grande (emivita ~174 gg) ~8 recensioni in scadenza pesano
  // lo 0,08% del totale e per spostare il punteggio di 0,1 dovrebbero scostarsi di 134
  // punti su una scala 1-10 — impossibile per costruzione. Col vecchio modello a bucket
  // invece la fascia 24-36 mesi valeva un 5% fisso e la scadenza si vedeva davvero.
  // Resta però rilevante sulle strutture piccole con storico lungo, dove l'emivita
  // calibrata è molto più alta: lì poche uscite valgono punti percentuali veri.
  // Criterio: si guarda lo scostamento EFFETTIVAMENTE calcolato, non una stima.
  const _expPesoTot=punteggioBooking(scored,_expHl,nowTs).pesoEff;
  const _expPesoUscita=allExpiring.reduce((acc,r)=>{
    const gg=(nowTs-r._dateTs)/86400000;
    return(gg>=0&&gg<=REV_FINESTRA_GG)?acc+Math.pow(0.5,gg/_expHl):acc;
  },0);
  const _expQuota=_expPesoTot>0?_expPesoUscita/_expPesoTot:0;
  const _expDelta=(scoreAttuale!==null&&scoreAfterBoth!==null)?Math.abs(scoreAfterBoth-scoreAttuale):0;
  const _expInvisibile=scoreAttuale===null||(_expDelta<0.01&&Math.round(scoreAttuale*10)===Math.round(scoreAfterBoth*10));
  if(_expInvisibile){
    el.innerHTML=`<div style="background:var(--surface2);border:1px solid var(--border-light);border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:var(--fs-xs);color:var(--text-muted);line-height:1.5;">
      <span style="font-size:15px;">⏳</span>
      <span style="flex:1;min-width:220px;">${allExpiring.length===0
        ?`<strong style="color:var(--text);">Nessuna recensione in scadenza</strong> questa o la prossima settimana.`
        :`<strong style="color:var(--text);">${allExpiring.length} recension${allExpiring.length===1?'e in scadenza':'i in scadenza'}</strong> questa/prossima settimana, ma pesano solo il <strong style="color:var(--text);">${(_expQuota*100).toFixed(2)}%</strong> del punteggio: uscendo lo sposterebbero di ${_expDelta<0.005?'meno di 0,01':_expDelta.toFixed(3)}, invisibile sul valore mostrato da Booking.`}
        <span style="color:var(--text-dim);">Con l'emivita calibrata (${_expHl} gg) le recensioni vecchie hanno già perso quasi tutto il peso.</span></span>
    </div>`;
    return;
  }
  let html=`<div class="panel">
    <div class="panel-header">
      <span class="panel-title">⏳ Recensioni in scadenza</span>
      <span style="margin-left:auto;background:var(--amber-bg);color:#A05A00;border-radius:10px;padding:2px 10px;font-size:var(--fs-xxs);font-weight:600;">${allExpiring.length} questa/prossima settimana</span>
    </div>
    <div class="panel-body" style="padding:12px 14px;">`;
  // Score attuale vs proiezione post-scadenza
  if(scoreAttuale!==null){
    html+=`<div style="display:flex;align-items:center;gap:16px;background:var(--surface2);border-radius:8px;padding:12px 16px;margin-bottom:14px;flex-wrap:wrap;">
      <div style="text-align:center;">
        <div style="font-size:var(--fs-xxs);color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">Score attuale</div>
        <div style="font-size:24px;font-weight:700;color:var(--accent);">${(Math.round(scoreAttuale*10)/10).toFixed(1)}</div>
      </div>
      ${hasExp?`<div style="font-size:20px;color:var(--text-dim);">→</div>
      <div style="text-align:center;">
        <div style="font-size:var(--fs-xxs);color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">Dopo scadenze</div>
        <div style="font-size:24px;font-weight:700;color:${proiezioneColor};">${scoreAfterBoth!==null?(Math.round(scoreAfterBoth*10)/10).toFixed(1):'—'}</div>
      </div>
      <div style="font-size:18px;font-weight:700;color:${proiezioneColor};">${proiezioneDelta!==null?(proiezioneDelta>=0?'▲ +':'▼ ')+proiezioneDelta.toFixed(2):''}</div>`:''}
    </div>`;
  }
  // Ripartizione del peso reale per età (non più i bucket 85/10/5): con il decadimento
  // continuo conta quanto peso porta ogni fascia d'età, non una percentuale fissa.
  const _expPb=punteggioBooking(scored,_expHl,nowTs);
  const fasceEta=[
    {lbl:'0–6 mesi',min:0,max:183},
    {lbl:'6–12 mesi',min:183,max:365},
    {lbl:'1–2 anni',min:365,max:730},
    {lbl:'2–3 anni',min:730,max:REV_FINESTRA_GG}
  ].map(f=>{
    let pw=0,n=0,sv=0;
    for(const r of scored){
      const gg=(nowTs-r._dateTs)/86400000;
      if(!(gg>=f.min)||gg>f.max||gg>REV_FINESTRA_GG)continue;
      const w=Math.pow(0.5,gg/_expHl);
      pw+=w;n++;sv+=w*r._score;
    }
    return{lbl:f.lbl,n:n,peso:pw,quota:_expPb.pesoEff>0?pw/_expPb.pesoEff:0,avg:pw>0?sv/pw:null};
  }).filter(f=>f.n>0);
  html+=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">
    <div style="font-size:var(--fs-xxs);color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Peso per età:</div>
    ${fasceEta.map(f=>`<div style="background:var(--surface2);border:1px solid var(--border-light);border-radius:7px;padding:4px 10px;font-size:var(--fs-xs);">
      <span style="color:var(--accent);font-weight:700;">${f.lbl}</span> <span style="color:var(--text-muted);">${f.n} rec · avg </span><span style="font-weight:700;color:var(--text);">${f.avg!==null?f.avg.toFixed(2):'—'}</span> <span style="color:var(--text-muted);">(${(f.quota*100).toFixed(0)}% del peso)</span>
    </div>`).join('')}
    <div style="font-size:var(--fs-xxs);color:var(--text-muted);font-weight:600;">emivita ${_expHl} gg</div>
  </div>`;
  if(!hasExp){
    html+=`<div style="color:var(--green);font-size:var(--fs-xs);">✓ Nessuna recensione in scadenza questa o la prossima settimana</div>`;
  } else {
    html+=renderWeekSection(thisWeek,'Settimana corrente','var(--red)',scoreAfterThis);
    html+=renderWeekSection(nextWeek,'Prossima settimana','var(--amber)',scoreAfterBoth);
    // ── Simulatore compensazione ──
    if(needed10!==null||needed9!==null){
      html+=`<div style="background:var(--accent-bg);border:1px solid var(--accent);border-radius:8px;padding:12px 16px;margin-top:4px;">
        <div style="font-size:var(--fs-xxs);font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">🎯 Per mantenere lo score ${scoreAttuale!==null?(Math.round(scoreAttuale*10)/10).toFixed(1):''} dopo le scadenze</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          ${needed10!==null?`<div style="font-size:var(--fs-sm);"><span style="font-size:22px;font-weight:700;color:var(--accent);">${needed10===300?'300+':needed10}</span> <span style="color:var(--text-dim);">recensioni con <strong>10</strong></span></div>`:''}
          ${needed9!==null?`<div style="font-size:var(--fs-sm);"><span style="font-size:22px;font-weight:700;color:var(--text-muted);">${needed9===300?'300+':needed9}</span> <span style="color:var(--text-dim);">recensioni con <strong>9</strong></span></div>`:''}
        </div>
      </div>`;
    }
  }
  html+=`</div></div>`;
  el.style.display='block';
  el.innerHTML=html;
}
// §§ RECENSIONI BOOKING — PUNTEGGIO A DECADIMENTO CONTINUO + CALIBRAZIONE
// Sostituisce il vecchio modello a tre bucket annuali con pesi fissi 85/10/5.
// Perché: dentro il bucket "ultimi 12 mesi" una recensione di ieri e una di 11 mesi fa
// pesavano identicamente, poi al 366° giorno il peso crollava da 85% a 10%. Una funzione
// a gradini che approssima male una curva continua e produce salti artificiali quando una
// recensione attraversa un confine di bucket, senza che sia successo nulla in hotel.
// Verificato su SoulArt (652 rec): il modello a bucket dava 8.84 → mostrava 8.8, mentre
// Booking mostra 8.9. Sottostima di ~0.06 che tarava male tutti i calcoli previsionali.
//
// ATTENZIONE: non è l'algoritmo di Booking (non è pubblico). È un modello calibrato sul
// punteggio reale che la struttura legge nell'extranet. Anche dopo la calibrazione resta
// una fascia di emivite compatibili, quindi le previsioni sono ordini di grandezza.
// Emivita di ripiego se la struttura non è calibrata. 136 giorni non è la sola
// calibrazione sul punteggio (che da sola dà una fascia larga 62-285 gg), ma il centro
// della fascia ristretta osservando TRE transizioni reali del display su SoulArt
// (8.9 → voto 5 → 8.8 → voto 10 → 8.9): 121-151 gg. Più affidabile del solo punteggio.
const REV_HL_DEFAULT=136;
const REV_FINESTRA_GG=1095;        // 36 mesi: finestra di validità delle recensioni Booking
const REV_CALIB_KEY='qm_rev_calib';
const REV_CALIB_STALE_GG=90;       // oltre questo, la calibrazione va rinfrescata
let REV_CALIB={};

// Le recensioni interne hanno {_dateTs,_score}; la firma pubblica documentata è
// {data,voto}. Accettate entrambe così le funzioni restano testabili in isolamento.
const _revTs=r=>r._dateTs!=null?r._dateTs:new Date(r.data).getTime();
const _revVoto=r=>r._score!=null?r._score:r.voto;

/**
 * Punteggio Booking stimato con decadimento esponenziale continuo.
 * @param {Array<{data:string|Date,voto:number}>} recensioni
 * @param {number} halfLifeGiorni - emivita del peso di una recensione
 * @param {Date|number} oggi
 * @returns {{score:number|null, pesoEff:number, nInFinestra:number}}
 */
function punteggioBooking(recensioni,halfLifeGiorni=REV_HL_DEFAULT,oggi=new Date()){
  const oggiTs=oggi instanceof Date?oggi.getTime():oggi;
  let num=0,den=0,n=0;
  for(const r of recensioni||[]){
    const voto=_revVoto(r);
    if(!(voto>0))continue;
    const gg=(oggiTs-_revTs(r))/86400000;
    if(!(gg>=0)||gg>REV_FINESTRA_GG)continue;
    const w=Math.pow(0.5,gg/halfLifeGiorni);
    num+=w*voto;den+=w;n++;
  }
  return den>0
    ?{score:num/den,pesoEff:den,nInFinestra:n}
    :{score:null,pesoEff:0,nInFinestra:0};
}

/**
 * Trova l'emivita compatibile con il punteggio realmente mostrato da Booking.
 * scoreReale ha una sola cifra decimale, quindi il valore vero sta in
 * [scoreReale-0.05, scoreReale+0.05): restituisce il centro della fascia di emivite
 * compatibili, più gli estremi. fuoriModello=true se nessuna emivita lo riproduce.
 */
function calibraHalfLife(recensioni,scoreReale,oggi=new Date()){
  const min=scoreReale-0.05,max=scoreReale+0.05;
  const compatibili=[];
  for(let hl=20;hl<=1200;hl++){
    const s=punteggioBooking(recensioni,hl,oggi).score;
    if(s!==null&&s>=min&&s<max)compatibili.push(hl);
  }
  if(!compatibili.length)return{hl:REV_HL_DEFAULT,fascia:null,fuoriModello:true};
  const centro=compatibili[Math.floor(compatibili.length/2)];
  return{hl:centro,fascia:[compatibili[0],compatibili[compatibili.length-1]],fuoriModello:false};
}

// Booking mostra una sola cifra decimale e arrotonda: per far comparire 8.9 basta
// superare 8.85, non raggiungere 8.90. Tutti i target passano da qui.
// (Se troncasse servirebbe 8.90 pieno: su SoulArt il troncamento è incompatibile col
// modello — il massimo con qualsiasi emivita è 8.8765, sotto 8.90, mentre Booking mostra
// 8.9 — quindi l'arrotondamento è l'ipotesi corretta. Se in futuro la calibrazione
// restituisse fuoriModello in modo sistematico su più strutture, è il segnale che questa
// regola va rivista: i casi vengono loggati in console da revCalibRicalcola.)
const revSoglia=targetVisualizzato=>targetVisualizzato-0.05;

// ── Registro osservazioni per struttura ─────────────────────────────────────
// Un singolo punteggio arrotondato a una cifra è un vincolo DEBOLE: su SoulArt la fascia
// compatibile è larga 155 giorni (78-233). Ma ogni lettura fatta in un momento diverso è
// un vincolo INDIPENDENTE, e intersecandoli la fascia crolla: tre osservazioni attorno a
// due transizioni reali (8.9 → rec. da 5 → 8.8 → rec. da 10 → 8.9) la portano a 121-151.
// Per questo il campo "Punteggio Booking reale" non sovrascrive più il valore precedente
// ma APPENDE al registro: prima l'informazione veniva buttata via a ogni inserimento.
//
// { sa:{ osservazioni:[{ts,display}], hl, fascia, fonte, contraddittorio, nUsate }, ... }
function revCalibLoad(){
  try{const s=localStorage.getItem(REV_CALIB_KEY);if(s)REV_CALIB=JSON.parse(s)||{};}catch(e){REV_CALIB={};}
  revCalibMigra();
}
// Migrazione dal formato a valore singolo: l'osservazione già inserita non va persa,
// diventa la prima riga del registro.
function revCalibMigra(){
  let cambiato=false;
  Object.keys(REV_CALIB||{}).forEach(p=>{
    const c=REV_CALIB[p];
    if(!c||Array.isArray(c.osservazioni))return;
    c.osservazioni=(c.scoreReale!=null&&c.ts)?[{ts:new Date(c.ts).toISOString(),display:c.scoreReale}]:[];
    cambiato=true;
  });
  if(cambiato){try{localStorage.setItem(REV_CALIB_KEY,JSON.stringify(REV_CALIB));}catch(e){}}
}
function revCalibSave(){
  try{localStorage.setItem(REV_CALIB_KEY,JSON.stringify(REV_CALIB));}catch(e){}
  try{kvSet(REV_CALIB_KEY,JSON.stringify(REV_CALIB));}catch(e){}
}
revCalibLoad();
function revOss(p){const c=REV_CALIB[p];return(c&&Array.isArray(c.osservazioni))?c.osservazioni:[];}

/**
 * Emivite compatibili con TUTTE le osservazioni registrate.
 * Ogni osservazione è valutata sul sottoinsieme di recensioni antecedenti al suo timestamp:
 * è questo che rende informativa una transizione (prima/dopo una singola recensione).
 * Un'osservazione è valutabile fino al momento dell'ultimo IMPORT del CSV (non fino
 * all'ultima recensione che contiene): un import fresco è la prova che a quel momento non
 * c'erano recensioni più recenti, anche se il CSV non ne aggiunge di nuove. Senza questo
 * limite un'osservazione presa oggi resterebbe "in attesa" per sempre finché non arriva
 * davvero una recensione nuova — anche quando l'assenza di novità è già stata verificata
 * ri-esportando il CSV.
 */
function calibraDaOsservazioni(recensioni,osservazioni,importTs){
  const rec=(recensioni||[]).filter(r=>r._score>0&&r._dateTs>0);
  const oss=(osservazioni||[]).filter(o=>o&&o.ts&&o.display!=null);
  if(!rec.length||!oss.length)return{hl:null,fascia:null,contraddittorio:false,nUsate:0,nAttesa:oss.length};
  const limite=importTs!=null?importTs:Math.max(...rec.map(r=>r._dateTs));
  const usabili=oss.filter(o=>+new Date(o.ts)<=limite);
  const nAttesa=oss.length-usabili.length;
  if(!usabili.length)return{hl:null,fascia:null,contraddittorio:false,nUsate:0,nAttesa};
  // Sottoinsiemi precalcolati una volta sola: dentro il ciclo sulle emivite rifiltrare
  // 657 recensioni × 1200 emivite × N osservazioni sarebbe inutilmente pesante.
  const ctx=usabili.map(o=>{
    const t=+new Date(o.ts);
    return{ts:t,display:Number(o.display),sub:rec.filter(r=>r._dateTs<=t)};
  }).filter(c=>c.sub.length);
  if(!ctx.length)return{hl:null,fascia:null,contraddittorio:false,nUsate:0,nAttesa};
  const compatibili=[];
  for(let hl=20;hl<=1200;hl++){
    let ok=true;
    for(const c of ctx){
      const s=punteggioBooking(c.sub,hl,c.ts).score;
      if(!(s!==null&&s>=c.display-0.05&&s<c.display+0.05)){ok=false;break;}
    }
    if(ok)compatibili.push(hl);
  }
  if(!compatibili.length)return{hl:null,fascia:null,contraddittorio:true,nUsate:ctx.length,nAttesa};
  return{
    hl:compatibili[Math.floor(compatibili.length/2)],
    fascia:[compatibili[0],compatibili[compatibili.length-1]],
    contraddittorio:false,nUsate:ctx.length,nAttesa
  };
}

// Gerarchia delle fonti: intersezione (≥2 osservazioni) → punteggio singolo → default.
// Il risultato viene MEMORIZZATO su KV perché il ciclo è O(emivite × oss × recensioni):
// va rifatto solo aggiungendo un'osservazione o reimportando il CSV, mai a ogni render.
function revCalibRicalcola(p){
  const scored=(REV_HOTELS[p]&&REV_HOTELS[p].data||[]).filter(r=>r._score>0&&r._dateTs>0);
  const oss=revOss(p);
  if(!REV_CALIB[p])REV_CALIB[p]={osservazioni:[]};
  const c=REV_CALIB[p];
  c.osservazioni=oss;
  if(!scored.length||!oss.length){
    c.hl=null;c.fascia=null;c.fonte='default';c.contraddittorio=false;c.nUsate=0;c.nAttesa=oss.length;
    revCalibSave();return;
  }
  // Limite di "usabilità": l'ultimo import del CSV per questa struttura (qm_ts_rev_<p>),
  // non l'ultima recensione che contiene. Vedi nota su calibraDaOsservazioni.
  const importTs=Math.max(parseInt(localStorage.getItem('qm_ts_rev_'+p)||'0')||0,Math.max(...scored.map(r=>r._dateTs)));
  const multi=calibraDaOsservazioni(scored,oss,importTs);
  if(multi.nUsate>=2&&!multi.contraddittorio&&multi.hl){
    c.hl=multi.hl;c.fascia=multi.fascia;c.fonte='osservazioni';
    c.contraddittorio=false;c.nUsate=multi.nUsate;c.nAttesa=multi.nAttesa;
    revCalibSave();return;
  }
  // Contraddizione o una sola osservazione: si ricade sul punteggio più recente usabile.
  const usabili=oss.filter(o=>+new Date(o.ts)<=importTs).sort((a,b)=>+new Date(b.ts)-+new Date(a.ts));
  const nAttesa=oss.length-usabili.length;
  if(!usabili.length){
    c.hl=null;c.fascia=null;c.fonte='default';c.contraddittorio=!!multi.contraddittorio;c.nUsate=0;c.nAttesa=nAttesa;
    revCalibSave();return;
  }
  const ultima=usabili[0];
  const single=calibraHalfLife(scored.filter(r=>r._dateTs<=+new Date(ultima.ts)),Number(ultima.display),new Date(ultima.ts));
  c.hl=single.fuoriModello?null:single.hl;
  c.fascia=single.fascia;
  c.fonte=single.fuoriModello?'default':'singolo';
  c.fuoriModello=single.fuoriModello;
  c.contraddittorio=!!multi.contraddittorio;
  c.nUsate=multi.nUsate;c.nAttesa=nAttesa;
  if(single.fuoriModello){
    console.warn('[Recensioni] Calibrazione fuori modello per '+p+': nessuna emivita tra 20 e 1200 giorni riproduce il punteggio '+ultima.display+'. Modello o dato da verificare.');
  }
  revCalibSave();
}

// Emivita in uso. Ordine: intersezione osservazioni → punteggio singolo → default 136.
function revHl(p){
  const c=REV_CALIB[p];
  return(c&&c.hl&&!c.contraddittorio)?c.hl:REV_HL_DEFAULT;
}
// Ampiezza della fascia compatibile = affidabilità della calibrazione.
function revCalibQualita(fascia){
  if(!fascia)return null;
  const amp=fascia[1]-fascia[0];
  if(amp>100)return{amp,label:'calibrazione debole',col:'amber'};
  if(amp>=30)return{amp,label:'calibrazione discreta',col:'accent'};
  return{amp,label:'calibrazione solida',col:'green'};
}
function revCalibStato(p){
  const c=REV_CALIB[p];
  const oss=revOss(p);
  if(!c||!oss.length)return{stato:'non-calibrato',oss:[],fonte:'default'};
  const ultima=[...oss].sort((a,b)=>+new Date(b.ts)-+new Date(a.ts))[0];
  const gg=(Date.now()-+new Date(ultima.ts))/86400000;
  return{
    stato:c.contraddittorio?'contraddittorio':(c.fonte==='default'&&c.fuoriModello?'fuori-modello':(gg>REV_CALIB_STALE_GG?'da-aggiornare':'ok')),
    scoreReale:ultima.display,ts:+new Date(ultima.ts),gg:Math.floor(gg),
    hl:c.hl,fascia:c.fascia,fonte:c.fonte||'default',
    nUsate:c.nUsate||0,nAttesa:c.nAttesa||0,oss,
    qualita:revCalibQualita(c.fascia),
    tuttiUguali:oss.length>1&&oss.every(o=>Number(o.display)===Number(oss[0].display))
  };
}

// Aggiunge un'osservazione al registro. Non serve ricaricare il CSV: anzi, registrare il
// punteggio proprio quando CAMBIA cifra è il caso più prezioso (è la transizione a
// restringere la fascia, non la ripetizione dello stesso valore).
function revCalibAddOss(p,display){
  if(!REV_CALIB[p])REV_CALIB[p]={osservazioni:[]};
  const c=REV_CALIB[p];
  if(!Array.isArray(c.osservazioni))c.osservazioni=[];
  const now=Date.now();
  const ultima=[...c.osservazioni].sort((a,b)=>+new Date(b.ts)-+new Date(a.ts))[0];
  // Stesso valore entro 24h: non è un vincolo nuovo, è la stessa lettura ripetuta.
  if(ultima&&Number(ultima.display)===Number(display)&&(now-+new Date(ultima.ts))<86400000)return false;
  c.osservazioni.push({ts:new Date(now).toISOString(),display:Number(display)});
  revCalibRicalcola(p);
  return true;
}
function revCalibDelOss(p,ts){
  const c=REV_CALIB[p];
  if(!c||!Array.isArray(c.osservazioni))return;
  c.osservazioni=c.osservazioni.filter(o=>o.ts!==ts);
  revCalibRicalcola(p);
  try{revRenderStats(p);}catch(e){}
}
function revCalibInput(p,val){
  const v=parseFloat(String(val).replace(',','.'));
  if(isNaN(v)||v<1||v>10){try{revRenderStats(p);}catch(e){}return;}
  revCalibAddOss(p,Math.round(v*10)/10);
  try{revRenderStats(p);}catch(e){}
}

// ── Simulazione previsionale ────────────────────────────────────────────────
// Fa decadere ANCHE le recensioni esistenti mentre arrivano le nuove: il vecchio calcolo
// teneva i pesi congelati e sovrastimava di molto lo sforzo necessario (per SoulArt ~74
// recensioni contro le ~10 reali). Restituisce il primo giorno in cui si supera la soglia.
function revRitmoAlGiorno(scored,oggiTs){
  const ultimoAnno=scored.filter(r=>(oggiTs-r._dateTs)/86400000<=365);
  return ultimoAnno.length/365;
}
/**
 * @returns {{raggiungibile:boolean, motivo?:string, nRec?:number, giorni?:number}}
 */
function revSimulaTarget(scored,hl,targetVisualizzato,votoNuove,recAlGiorno,oggiTs){
  const soglia=revSoglia(targetVisualizzato);
  const attuale=punteggioBooking(scored,hl,oggiTs).score;
  if(attuale!==null&&attuale>=soglia)return{raggiungibile:true,nRec:0,giorni:0};
  // Con una media ponderata il punteggio converge alla media delle recensioni in arrivo:
  // se il flusso vale meno della soglia, il target è irraggiungibile a prescindere dal tempo.
  if(votoNuove<=soglia)return{raggiungibile:false,motivo:'flusso'};
  if(!(recAlGiorno>0))return{raggiungibile:false,motivo:'nessun-flusso'};
  const MAX_GG=REV_FINESTRA_GG;
  for(let t=1;t<=MAX_GG;t++){
    const oraTs=oggiTs+t*86400000;
    let num=0,den=0;
    for(const r of scored){
      const gg=(oraTs-r._dateTs)/86400000;
      if(gg>REV_FINESTRA_GG)continue;          // uscita dalla finestra 36 mesi
      const w=Math.pow(0.5,gg/hl);
      num+=w*r._score;den+=w;
    }
    const nNuove=Math.floor(recAlGiorno*t);
    for(let j=1;j<=nNuove;j++){
      const eta=t-j/recAlGiorno;               // arrivi distribuiti uniformemente
      const w=Math.pow(0.5,eta/hl);
      num+=w*votoNuove;den+=w;
    }
    if(den>0&&num/den>=soglia)return{raggiungibile:true,nRec:nNuove,giorni:t};
  }
  return{raggiungibile:false,motivo:'oltre-orizzonte'};
}

// ── Effetto delle recensioni in scadenza ────────────────────────────────────
// Quanto pesa davvero l'uscita dalla finestra dei 36 mesi dipende TUTTO dall'emivita
// calibrata, quindi va misurato per struttura invece di assumerlo: una recensione al
// 1094° giorno vale lo 0,4% di una di oggi con emivita 136 gg, ma il 7% con emivita 285
// e oltre il 20% con emivita 500 (tipico delle strutture con poche recensioni).
// Nel vecchio modello a bucket la fascia 24-36 mesi pesava invece un 5% fisso a
// prescindere dall'età, il che sovrastimava sistematicamente le scadenze recenti e
// sottostimava quelle delle strutture con storico lungo.
//
// La "deriva" è dove va il punteggio fra N giorni SENZA nuove recensioni: somma
// invecchiamento e uscite. Se è negativa servono più recensioni nuove del previsto —
// revSimulaTarget ne tiene già conto perché fa scorrere il tempo su tutto lo storico.
function revEffettoScadenze(scored,hl,oggiTs,orizzonteGg){
  const ora=punteggioBooking(scored,hl,oggiTs);
  const fut=punteggioBooking(scored,hl,oggiTs+orizzonteGg*86400000);
  let pesoUscita=0,nUscita=0,sommaVoti=0;
  for(const r of scored){
    const gg=(oggiTs-r._dateTs)/86400000;
    if(!(gg>=0)||gg>REV_FINESTRA_GG)continue;
    if(REV_FINESTRA_GG-gg<=orizzonteGg){          // esce entro l'orizzonte
      const w=Math.pow(0.5,gg/hl);
      pesoUscita+=w;nUscita++;sommaVoti+=w*r._score;
    }
  }
  return{
    nUscita:nUscita,
    pesoUscita:pesoUscita,
    quotaPeso:ora.pesoEff>0?pesoUscita/ora.pesoEff:0,
    mediaUscita:pesoUscita>0?sommaVoti/pesoUscita:null,
    scoreOra:ora.score,
    scoreFut:fut.score,
    deriva:(fut.score!=null&&ora.score!=null)?fut.score-ora.score:null,
    pesoEffOra:ora.pesoEff,
    pesoEffFut:fut.pesoEff
  };
}

// ── UI: calibrazione sul punteggio reale ────────────────────────────────────
// Non bloccante: senza valore inserito si usa l'emivita di default e si mostra il badge
// "non calibrato". Il dashboard resta pienamente funzionante.
function revRenderCalib(p,pb,hl){
  const el=document.getElementById('rev-calib-'+p);
  if(!el)return;
  const cs=revCalibStato(p);
  const fmtD=ts=>{const d=new Date(ts);return d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();};
  const fmtDT=ts=>{const d=new Date(ts);return d.getDate()+'/'+(d.getMonth()+1)+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
  let badge='',avviso='';
  if(cs.stato==='non-calibrato'){
    badge=`<span style="font-size:var(--fs-xs);font-weight:700;padding:4px 11px;border-radius:12px;background:var(--surface2);color:var(--text-muted);border:1px solid var(--border);">non calibrato</span>`;
  }else if(cs.stato==='contraddittorio'){
    badge=`<span style="font-size:var(--fs-xs);font-weight:700;padding:4px 11px;border-radius:12px;background:var(--red-bg);color:var(--red);">osservazioni in conflitto</span>`;
    // Non scartare arbitrariamente un'osservazione: l'utente sa quale è sbagliata, il
    // dashboard no. Si elencano e si chiede quale rimuovere, ricadendo intanto sull'ultima.
    avviso=`<div style="margin-top:8px;background:var(--red-bg);color:var(--red);border-radius:7px;padding:10px 13px;font-size:var(--fs-xs);line-height:1.6;">
      <strong>Nessuna emivita spiega tutte le osservazioni insieme.</strong> Cause possibili: un valore digitato male; Booking aggiorna il punteggio con ritardo o a lotti, quindi la cifra letta non rifletteva ancora l'ultima recensione; recensioni rimosse da Booking per moderazione che restano nel CSV; oppure il modello esponenziale non descrive bene questa struttura.
      <span style="display:block;margin-top:4px;">Rimuovi con la ✕ l'osservazione che ritieni sbagliata. Nel frattempo si usa la sola osservazione più recente.</span>
    </div>`;
  }else if(cs.stato==='fuori-modello'){
    badge=`<span style="font-size:var(--fs-xs);font-weight:700;padding:4px 11px;border-radius:12px;background:var(--red-bg);color:var(--red);">fuori modello</span>`;
    avviso=`<div style="margin-top:8px;background:var(--red-bg);color:var(--red);border-radius:7px;padding:9px 12px;font-size:var(--fs-xs);line-height:1.5;">
      <strong>Punteggio non riproducibile.</strong> Nessuna emivita tra 20 e 1200 giorni produce ${Number(cs.scoreReale).toFixed(1)} con queste recensioni: o il numero è stato digitato male, o il CSV non è aggiornato all'ultima esportazione. Nel frattempo si usa l'emivita di default (${REV_HL_DEFAULT} giorni).</div>`;
  }else{
    const col=cs.stato==='da-aggiornare'?'amber':'green';
    badge=`<span style="font-size:var(--fs-xs);font-weight:700;padding:4px 11px;border-radius:12px;background:var(--${col}-bg);color:var(--${col});">${cs.oss.length} osservazion${cs.oss.length===1?'e':'i'} · ultima ${fmtD(cs.ts)}</span>`;
    if(cs.stato==='da-aggiornare')avviso=`<div style="margin-top:8px;background:var(--amber-bg);color:var(--amber);border-radius:7px;padding:9px 12px;font-size:var(--fs-xs);line-height:1.5;">Ultima osservazione di ${cs.gg} giorni fa: registra di nuovo il punteggio dall'extranet per tenere allineate le previsioni.</div>`;
  }
  // Fonte in uso: dice sempre da dove viene l'emivita, non solo quale numero è.
  const fonteTxt=cs.fonte==='osservazioni'?`da ${cs.nUsate} osservazioni`:cs.fonte==='singolo'?'da punteggio singolo':'default';
  const q=cs.qualita;
  const qBadge=q?`<span style="font-size:var(--fs-xxs);font-weight:700;padding:2px 8px;border-radius:10px;background:var(--${q.col}-bg);color:var(--${q.col});margin-left:6px;">${q.label} · fascia ${q.amp} gg</span>`:'';
  const fasciaTxt=cs.fascia?` (fascia ${cs.fascia[0]}–${cs.fascia[1]} gg)`:'';
  // Suggerimenti attivi: cosa fare per stringere la fascia, non solo constatarne l'ampiezza.
  let sugg='';
  if(q&&q.col==='amber'){
    sugg=`<div style="margin-top:6px;font-size:var(--fs-xs);color:var(--amber);line-height:1.55;">Registra il punteggio ogni volta che cambia cifra: bastano 3–4 osservazioni per dimezzare l'incertezza.</div>`;
  }
  if(cs.tuttiUguali){
    sugg+=`<div style="margin-top:6px;font-size:var(--fs-xs);color:var(--text-muted);line-height:1.55;">Tutte le osservazioni riportano ${Number(cs.oss[0].display).toFixed(1)} — la fascia si restringe solo osservando un <strong>cambio</strong> di cifra, non ripetendo lo stesso valore.</div>`;
  }
  // Registro: lista compatta, ogni riga eliminabile per correggere un errore di battitura.
  // "in attesa" fino all'ultimo IMPORT del CSV (qm_ts_rev_<p>), non fino all'ultima
  // recensione che contiene: un import fresco basta a confermare l'osservazione anche
  // senza recensioni nuove, perché prova che a quel momento non ce n'erano.
  const importTs=(()=>{const t=parseInt(localStorage.getItem('qm_ts_rev_'+p)||'0')||0;const d=(REV_HOTELS[p]&&REV_HOTELS[p].data||[]).filter(r=>r._dateTs>0);const ultimaRecTs=d.length?Math.max(...d.map(r=>r._dateTs)):0;return Math.max(t,ultimaRecTs);})();
  const ossHtml=cs.oss.length?`<div style="margin-top:10px;border-top:1px solid var(--border-light);padding-top:8px;">
    <div style="font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;">Registro osservazioni</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      ${[...cs.oss].sort((a,b)=>+new Date(b.ts)-+new Date(a.ts)).map(o=>{
        const attesa=importTs&&+new Date(o.ts)>importTs;
        return`<span style="display:inline-flex;align-items:center;gap:6px;background:${attesa?'var(--surface2)':'var(--surface)'};border:1px solid var(--border-light);border-radius:8px;padding:4px 8px;font-size:var(--fs-xs);">
          <strong style="color:var(--text);">${Number(o.display).toFixed(1)}</strong>
          <span style="color:var(--text-dim);">${fmtDT(o.ts)}</span>
          ${attesa?`<span title="Registrata dopo l'ultimo import del CSV: ricarica il CSV (anche senza nuove recensioni) per confermarla" style="font-size:9px;color:var(--amber);font-weight:700;">in attesa</span>`:''}
          <span onclick="revCalibDelOss('${p}','${o.ts}')" title="Rimuovi questa osservazione" style="cursor:pointer;color:var(--text-dim);font-weight:700;">✕</span>
        </span>`;
      }).join('')}
    </div>
  </div>`:'';
  el.innerHTML=`<div style="background:var(--surface2);border:1px solid var(--border-light);border-radius:8px;padding:12px 16px;margin-bottom:14px;">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <div style="flex:1 1 240px;min-width:200px;">
        <label for="revCalibIn-${p}" style="display:block;font-size:var(--fs-xs);font-weight:700;color:var(--text);margin-bottom:2px;">Punteggio Booking reale</label>
        <div style="font-size:var(--fs-xs);color:var(--text-muted);">lo trovi in cima a Extranet → Recensioni · registralo <strong>ogni volta che cambia</strong>, anche senza ricaricare il CSV</div>
      </div>
      <input id="revCalibIn-${p}" type="number" step="0.1" min="1" max="10" inputmode="decimal"
        value="" placeholder="es. 8.9"
        onchange="revCalibInput('${p}',this.value)"
        style="width:92px;padding:8px 10px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font-size:var(--fs-sm);font-weight:700;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">
      ${badge}
    </div>
    ${avviso}
    ${ossHtml}
    <div style="margin-top:8px;font-size:var(--fs-xs);color:var(--text-muted);line-height:1.6;">
      Emivita in uso <strong style="color:var(--text);">${hl} giorni</strong> · <strong style="color:var(--text);">${fonteTxt}</strong>${fasciaTxt}${qBadge} · peso effettivo ≈ <strong style="color:var(--text);">${Math.round(pb.pesoEff)}</strong> su ${pb.nInFinestra} recensioni nella finestra di 36 mesi.
      ${sugg}
      <span style="display:block;margin-top:6px;">L'algoritmo di Booking non è pubblico: questo è un modello calibrato sul punteggio reale della struttura, non una replica. Anche dopo la calibrazione resta una fascia di emivite compatibili, quindi le previsioni vanno lette come ordini di grandezza.</span>
    </div>
  </div>`;
}

// ── UI: impatto di una nuova recensione ─────────────────────────────────────
// delta(voto) = (voto - score) / (pesoEff + 1). L'asimmetria è l'informazione che
// cambia le priorità operative: un voto basso pesa 3-4 volte più di un voto pieno.
function revRenderImpact(p,pb,scored,hl,oggiTs){
  const el=document.getElementById('rev-impact-'+p);
  if(!el)return;
  if(pb.score===null){el.innerHTML='';return;}
  // Le scadenze abbassano il peso effettivo, e un peso effettivo più basso significa che
  // ogni nuova recensione conta di più: è la faccia utile del calo, va mostrata accanto
  // all'impatto di oggi invece di restare un avviso staccato.
  const scad90=(scored&&hl&&oggiTs)?revEffettoScadenze(scored,hl,oggiTs,90):null;
  const voti=[10,9,8,7,5,3];
  const delta=v=>(v-pb.score)/(pb.pesoEff+1);
  const d10=delta(10),d5=delta(5);
  const rapporto=d10>0?Math.abs(d5)/d10:null;
  // Riga "fra 90 giorni": quanto peso esce e quanto varrà allora una nuova recensione.
  let scadHtml='';
  if(scad90&&scad90.nUscita>0){
    const quota=scad90.quotaPeso*100;
    const d10fut=(10-(scad90.scoreFut!=null?scad90.scoreFut:pb.score))/(scad90.pesoEffFut+1);
    const derivaTxt=(scad90.deriva!=null&&Math.abs(scad90.deriva)>=0.005)
      ?` Senza nuove recensioni il punteggio si sposterebbe di <strong>${scad90.deriva>0?'+':'−'}${Math.abs(scad90.deriva).toFixed(2)}</strong>.`
      :' La deriva sul punteggio è sotto il centesimo.';
    const rilevante=quota>=0.5;
    scadHtml=`<div style="margin-top:10px;background:${rilevante?'var(--accent-bg)':'var(--surface2)'};border:1px solid var(--border-light);border-radius:7px;padding:10px 13px;font-size:var(--fs-xs);color:var(--text);line-height:1.6;">
      <strong style="color:var(--text);">Fra 90 giorni</strong> escono dalla finestra dei 36 mesi <strong style="color:var(--text);">${scad90.nUscita}</strong> recensioni${scad90.mediaUscita!=null?` (media ${scad90.mediaUscita.toFixed(1)})`:''}, pari al <strong style="color:var(--text);">${quota.toFixed(1)}%</strong> del peso attuale.${derivaTxt}
      ${rilevante?'':`Con l'emivita calibrata (${hl} gg) le recensioni in uscita pesano ormai quasi nulla: le scadenze non sono la leva su cui agire.`}
      <span style="display:block;margin-top:5px;">Nello stesso periodo il peso effettivo passa da <strong style="color:var(--text);">${Math.round(scad90.pesoEffOra)}</strong> a <strong style="color:var(--text);">${Math.round(scad90.pesoEffFut)}</strong> — quasi tutto per <strong style="color:var(--text);">invecchiamento</strong> dello storico, le uscite ne spiegano solo ${quota.toFixed(1)} punti percentuali. Con un denominatore più basso un 10 varrà <strong style="color:var(--green);">+${d10fut.toFixed(3)}</strong> invece di +${delta(10).toFixed(3)}: aspettare rende ogni recensione più efficace, ma si parte da un punteggio diverso.</span>
    </div>`;
  }
  // La domanda operativa non è "di quanto scende il decimale interno" ma "quale voto fa
  // cambiare la CIFRA che Booking mostra". Il delta da solo non lo dice: serve simulare il
  // nuovo score e riarrotondarlo. Righe evidenziate solo dove il display cambia davvero.
  const displayOra=Math.round(pb.score*10)/10;
  const soglia=revSoglia(displayOra);            // sotto questa, Booking mostra un decimo in meno
  const margine=pb.score-soglia;
  const votiTab=[10,9,8,7,6,5,4,3,2,1];
  const righeTab=votiTab.map(v=>{
    const d=delta(v);
    const nuovo=pb.score+d;
    const disp=Math.round(nuovo*10)/10;
    const scende=disp<displayOra, sale=disp>displayOra;
    const bg=scende?'var(--red-bg)':sale?'var(--green-bg)':'transparent';
    const fg=scende?'var(--red)':sale?'var(--green)':'var(--text)';
    return`<tr style="background:${bg};">
      <td style="padding:6px 10px;font-size:var(--fs-xs);font-weight:700;color:${fg};">${v}</td>
      <td style="padding:6px 10px;font-size:var(--fs-xs);text-align:right;color:var(--text-muted);font-variant-numeric:tabular-nums;">${d>=0?'+':'−'}${Math.abs(d).toFixed(3)}</td>
      <td style="padding:6px 10px;font-size:var(--fs-xs);text-align:right;color:var(--text-muted);font-variant-numeric:tabular-nums;">${nuovo.toFixed(3)}</td>
      <td style="padding:6px 10px;font-size:var(--fs-sm);text-align:right;font-weight:800;color:${fg};font-variant-numeric:tabular-nums;">${disp.toFixed(1)}</td>
    </tr>`;
  }).join('');
  // Voto più basso che NON fa scendere la cifra: la soglia operativa da comunicare in hotel.
  let votoSicuro=null;
  for(let v=1;v<=10;v++){
    if(Math.round((pb.score+delta(v))*10)/10>=displayOra){votoSicuro=v;break;}
  }
  const allerta=margine<0.010;
  const margHtml=`<div style="background:${allerta?'var(--red-bg)':'var(--surface2)'};border:1px solid ${allerta?'var(--red)':'var(--border-light)'};border-radius:8px;padding:10px 13px;margin-bottom:12px;font-size:var(--fs-xs);line-height:1.55;color:var(--text);">
    <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">
      <strong style="font-size:var(--fs-sm);color:${allerta?'var(--red)':'var(--text)'};">Margine ${margine>=0?'+':'−'}${Math.abs(margine).toFixed(3)}</strong>
      <span style="color:var(--text-muted);">sopra ${soglia.toFixed(2)}, la soglia per continuare a mostrare <strong style="color:var(--text);">${displayOra.toFixed(1)}</strong></span>
    </div>
    ${allerta?`<div style="margin-top:5px;color:var(--red);font-weight:600;">Margine sottile: basta una recensione mediocre per far scendere la cifra mostrata.</div>`:''}
    ${votoSicuro!==null?`<div style="margin-top:5px;color:var(--text-muted);">${votoSicuro<=1?'Anche un 1 non farebbe scendere la cifra.':`Fino a un <strong style="color:var(--text);">${votoSicuro}</strong> resti a ${displayOra.toFixed(1)}; da <strong style="color:var(--red);">${votoSicuro-1}</strong> in giù scende.`}</div>`:`<div style="margin-top:5px;color:var(--red);font-weight:600;">Qualunque voto in arrivo fa scendere la cifra mostrata.</div>`}
  </div>`;
  el.innerHTML=`<div class="panel" style="margin-bottom:14px;">
    <div class="panel-header"><span class="panel-title">Impatto della prossima recensione</span><span style="font-size:var(--fs-xxs);color:var(--text-dim);">peso effettivo ≈ ${Math.round(pb.pesoEff)}</span></div>
    <div class="panel-body" style="padding:14px;">
      ${margHtml}
      <div style="overflow-x:auto;border:1px solid var(--border-light);border-radius:8px;">
        <table style="border-collapse:collapse;width:100%;">
          <thead><tr style="background:var(--bg);">
            <th style="padding:6px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:left;">Voto</th>
            <th style="padding:6px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:right;">Delta</th>
            <th style="padding:6px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:right;">Nuovo score</th>
            <th style="padding:6px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:right;">Mostrato</th>
          </tr></thead>
          <tbody>${righeTab}</tbody>
        </table>
      </div>
      ${rapporto?`<div style="margin-top:10px;background:var(--amber-bg);color:var(--amber);border-radius:7px;padding:9px 12px;font-size:var(--fs-xs);line-height:1.5;">
        <strong>Un 5 pesa ${rapporto.toFixed(1)} volte più di un 10.</strong> Evitare una recensione bassa vale molto più che ottenerne una piena: la priorità operativa è intercettare l'ospite scontento prima che scriva, non chiedere altri 10.</div>`:''}
      ${scadHtml}
    </div>
  </div>`;
}
// ── UI: distribuzione del peso nel tempo ────────────────────────────────────
// Rende visibile perché poche recensioni recenti spostano il punteggio mentre centinaia
// di vecchie non contano quasi nulla. Fasce di ampiezza pari a un'emivita: per costruzione
// la prima vale circa il 50% del peso, la seconda circa il 25%, e così via.
function revRenderDistrib(p,pb,scored,hl,oggiTs){
  const el=document.getElementById('rev-distrib-'+p);
  if(!el)return;
  if(pb.score===null||!scored||!scored.length){el.innerHTML='';return;}
  const soglia=revSoglia(Math.round(pb.score*10)/10);
  const fasce=[
    {min:0,max:hl},
    {min:hl,max:2*hl},
    {min:2*hl,max:3*hl},
    {min:3*hl,max:5*hl},
    {min:5*hl,max:REV_FINESTRA_GG}
  ].filter(f=>f.min<REV_FINESTRA_GG).map(f=>{
    let n=0,peso=0,somma=0;
    for(const r of scored){
      const gg=(oggiTs-r._dateTs)/86400000;
      if(!(gg>=f.min)||gg>=f.max||gg>REV_FINESTRA_GG)continue;
      const w=Math.pow(0.5,gg/hl);
      n++;peso+=w;somma+=w*r._score;
    }
    const lbl=f.max>=REV_FINESTRA_GG?`oltre ${Math.round(f.min)} gg`:`${Math.round(f.min)}–${Math.round(f.max)} gg`;
    return{lbl,n,peso,quota:pb.pesoEff>0?peso/pb.pesoEff:0,media:peso>0?somma/peso:null};
  }).filter(f=>f.n>0);
  if(!fasce.length){el.innerHTML='';return;}
  const righe=fasce.map(f=>{
    // Media della fascia colorata rispetto alla soglia obiettivo: si legge a colpo d'occhio
    // se il periodo che sta GUADAGNANDO peso è migliore o peggiore di quello che lo perde.
    const col=f.media===null?'var(--text-dim)':(f.media>=soglia?'var(--green)':'var(--red)');
    return`<tr>
      <td style="padding:7px 10px;font-size:var(--fs-xs);color:var(--text);white-space:nowrap;">${f.lbl}</td>
      <td style="padding:7px 10px;font-size:var(--fs-xs);text-align:right;color:var(--text-muted);">${f.n}</td>
      <td style="padding:7px 10px;width:45%;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:1;height:7px;background:var(--surface2);border-radius:4px;overflow:hidden;min-width:40px;">
            <div style="height:7px;width:${(f.quota*100).toFixed(1)}%;background:var(--accent);border-radius:4px;"></div>
          </div>
          <span style="font-size:var(--fs-xs);font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;min-width:44px;text-align:right;">${(f.quota*100).toFixed(1)}%</span>
        </div>
      </td>
      <td style="padding:7px 10px;font-size:var(--fs-xs);text-align:right;font-weight:700;color:${col};font-variant-numeric:tabular-nums;">${f.media!==null?f.media.toFixed(2):'—'}</td>
    </tr>`;
  }).join('');
  // "Gli ultimi N giorni valgono il 50% del punteggio": N ricavato cumulando le fasce fino
  // a superare metà del peso, non assunto uguale all'emivita (che lo approssima soltanto).
  let cum=0,gg50=null;
  for(const f of fasce){cum+=f.quota;if(cum>=0.5){gg50=f.lbl;break;}}
  el.innerHTML=`<div class="panel" style="margin-bottom:14px;">
    <div class="panel-header"><span class="panel-title">Distribuzione del peso nel tempo</span><span style="font-size:var(--fs-xxs);color:var(--text-dim);">emivita ${hl} gg</span></div>
    <div class="panel-body" style="padding:14px;">
      <div style="overflow-x:auto;border:1px solid var(--border-light);border-radius:8px;">
        <table style="border-collapse:collapse;width:100%;">
          <thead><tr style="background:var(--bg);">
            <th style="padding:6px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:left;">Fascia</th>
            <th style="padding:6px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:right;">Rec.</th>
            <th style="padding:6px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:left;">Quota del peso</th>
            <th style="padding:6px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:right;">Media voti</th>
          </tr></thead>
          <tbody>${righe}</tbody>
        </table>
      </div>
      <div style="margin-top:10px;font-size:var(--fs-xs);color:var(--text-muted);line-height:1.55;">
        ${gg50?`Le recensioni degli <strong style="color:var(--text);">ultimi ${gg50.replace('–',' – ').replace(' gg','')} giorni</strong> valgono da sole metà del punteggio.`:''}
        Media in <span style="color:var(--green);font-weight:700;">verde</span> dove la fascia è sopra la soglia ${soglia.toFixed(2)}, in <span style="color:var(--red);font-weight:700;">rosso</span> dove è sotto: se la fascia recente è più rossa di quelle vecchie il punteggio sta peggiorando anche senza che il numero mostrato sia ancora cambiato.
      </div>
    </div>
  </div>`;
}

function revRenderStats(p){
  const data=REV_HOTELS[p].data;
  if(!data.length)return;
  const scored=data.filter(r=>r._score>0);
  const scores=scored.map(r=>r._score);
  // Media semplice
  const avgSimple=scores.reduce((a,b)=>a+b,0)/scores.length;
  // Punteggio a decadimento esponenziale continuo con emivita calibrata sul punteggio
  // reale della struttura (vedi sezione RECENSIONI BOOKING — PUNTEGGIO A DECADIMENTO
  // CONTINUO). Sostituisce i tre bucket annuali 85/10/5, che facevano pesare uguale una
  // recensione di ieri e una di 11 mesi fa e poi crollare il peso di colpo al 366° giorno.
  const now=Date.now();
  const hl=revHl(p);
  const pb=punteggioBooking(scored,hl,now);
  const avgWeighted=pb.score!==null?pb.score:avgSimple;
  const pesoEff=pb.pesoEff;
  const noReply=data.filter(r=>!r._hasReply && REV_SENT[revUniqueKey(p,r)]!=='not_needed').length;
  const nrBtn=document.getElementById('revFlt-'+p+'-noreply');
  if(nrBtn){
    nrBtn.textContent=noReply>0?`Senza risposta (${noReply})`:'Senza risposta';
    nrBtn.style.background=noReply>0&&!nrBtn.classList.contains('active')?'var(--amber-bg)':'';
    nrBtn.style.borderColor=noReply>0&&!nrBtn.classList.contains('active')?'var(--amber)':'';
    nrBtn.style.color=noReply>0&&!nrBtn.classList.contains('active')?'var(--amber)':'';
  }
  const g=id=>document.getElementById(id+'-'+p);
  g('rev-avg').textContent=(Math.round(avgWeighted*10)/10).toFixed(1);
  g('rev-avg-sub').textContent='decadimento continuo, emivita '+(revCalibStato(p).stato==='ok'||revCalibStato(p).stato==='da-aggiornare'?'calibrata ':'')+hl+'gg · media semplice '+avgSimple.toFixed(1);
  const avgCard=g('rev-avg');
  if(avgCard&&avgCard.closest('.kpi-card'))avgCard.closest('.kpi-card').title='Stima calibrata sul punteggio reale inserito — non è il calcolo ufficiale di Booking. Clicca per vedere l\u2019andamento.';
  g('rev-count').textContent=data.length;
  // Il peso effettivo è il denominatore reale dei calcoli previsionali: spiega perché
  // poche recensioni recenti muovono il punteggio più di tante vecchie.
  g('rev-count-sub').textContent=data.length+' importate · peso effettivo ≈ '+Math.round(pesoEff);
  g('rev-noreply').textContent=noReply;
  g('rev-noreply-sub').textContent=noReply>0?noReply+' in attesa di risposta':'Tutte con risposta';
  const dates=data.map(r=>r._date).filter(d=>!isNaN(d));
  if(dates.length){const fmt=d=>d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();g('revPeriod').textContent=fmt(new Date(Math.min(...dates)))+' – '+fmt(new Date(Math.max(...dates)));}
  g('revCatGrid').innerHTML=REV_CATS.map(cat=>{
    // Calcolo ponderato 85/10/5 per categoria
    function catWeighted(reviewSet){
      const f1=reviewSet.filter(r=>(now-r._dateTs)/(86400000)<=365);
      const f2=reviewSet.filter(r=>{const d=(now-r._dateTs)/86400000;return d>365&&d<=730;});
      const f3=reviewSet.filter(r=>{const d=(now-r._dateTs)/86400000;return d>730&&d<=1096;});
      const avg=arr=>{const v=arr.map(r=>parseFloat(r[cat])).filter(v=>!isNaN(v)&&v>0);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
      const a1=avg(f1),a2=avg(f2),a3=avg(f3);
      let wT=0,wS=0;
      if(a1!==null){wT+=0.85;wS+=0.85*a1;}
      if(a2!==null){wT+=0.10;wS+=0.10*a2;}
      if(a3!==null){wT+=0.05;wS+=0.05*a3;}
      return wT>0?wS/wT:null;
    }
    const a=catWeighted(scored);
    if(a===null)return'';
    const color=a>=9?'var(--green)':a>=7.5?'var(--amber)':'var(--red)';
    return`<div class="rev-cat-card"><div class="rev-cat-label">${catLabel(cat)}</div><div class="rev-cat-val" style="color:${color}">${a.toFixed(1)}</div><div class="rev-cat-bar"><div class="rev-cat-fill" style="width:${a/10*100}%;background:${color}"></div></div></div>`;
  }).join('');
  // Calcolo target: quante recensioni con score 10 (o 9) servono per salire di 0.1
  // Formula: aggiunge N nuove recensioni in fascia 1 (ultimi 12m) e ricalcola
  const targetEl=document.getElementById('rev-target-'+p);
  const targetTitle=document.getElementById('rev-target-title-'+p);
  const targetDetail=document.getElementById('rev-target-detail-'+p);
  if(targetEl&&targetTitle&&targetDetail){
    const displayScore=Math.round(avgWeighted*10)/10;
    const target=Math.round((displayScore+0.1)*10)/10;
    // Booking arrotonda a una cifra: per vedere 8.9 basta superare 8.85, non 8.90.
    const soglia=revSoglia(target);
    // Recensioni in scadenza — nota informativa, il pannello dedicato resta separato
    const THREE_YEARS=3*365.25*24*60*60*1000;
    const expiringThisMonth=scored.filter(r=>{
      const exp=r._dateTs+THREE_YEARS;
      return exp>=now&&exp<=(now+30*24*60*60*1000);
    });
    // Nota scadenze quantificata: quanto peso esce davvero e come sposta il punteggio,
    // invece di un generico "N recensioni in scadenza" che non dice se conta o no.
    const scad30=revEffettoScadenze(scored,hl,now,30);
    let expiringNote='';
    if(expiringThisMonth.length>0){
      const quota=(scad30.quotaPeso*100);
      const dz=scad30.deriva!=null?Math.abs(scad30.deriva):0;
      expiringNote=quota<0.5
        ? ` · ${expiringThisMonth.length} rec. in scadenza entro 30gg (peso ${quota.toFixed(1)}%, ininfluenti)`
        : ` · ⚠️ ${expiringThisMonth.length} rec. in scadenza entro 30gg = ${quota.toFixed(1)}% del peso${dz>=0.005?` (punteggio ${scad30.deriva>0?'+':'−'}${dz.toFixed(2)} se non arriva nulla)`:''}`;
    }
    const ritmo=revRitmoAlGiorno(scored,now);
    // La simulazione fa invecchiare anche le recensioni esistenti mentre arrivano le
    // nuove: a pesi congelati lo sforzo risultava 5-7 volte più alto del reale.
    const sim10=revSimulaTarget(scored,hl,target,10,ritmo,now);
    const sim9=revSimulaTarget(scored,hl,target,9,ritmo,now);
    const mesi=g_=>g_<30?`${g_} giorni`:(g_<365?`~${Math.round(g_/30)} mesi`:`~${(g_/365).toFixed(1)} anni`);
    targetEl.style.display='flex';
    if(sim10.raggiungibile&&sim10.nRec===0){
      targetTitle.textContent=`Score già a ${displayScore.toFixed(1)} — ottimo!`;
      targetDetail.textContent=expiringNote||'';
    }else if(sim10.raggiungibile){
      targetTitle.textContent=sim10.nRec===1
        ?`1 recensione con 10 per raggiungere ${target.toFixed(1)}`
        :`${sim10.nRec} recensioni con 10 per raggiungere ${target.toFixed(1)}`;
      // Intervallo temporale sugli estremi della fascia di emivite compatibili: fuori da
      // quella fascia la previsione non è distinguibile, va letta come ordine di grandezza.
      const cs=revCalibStato(p);
      let range='';
      if(cs.fascia){
        const a=revSimulaTarget(scored,cs.fascia[0],target,10,ritmo,now);
        const b=revSimulaTarget(scored,cs.fascia[1],target,10,ritmo,now);
        const gg=[a,b].filter(x=>x.raggiungibile&&x.giorni).map(x=>x.giorni);
        if(gg.length===2&&Math.min(...gg)!==Math.max(...gg))range=` (fascia ${mesi(Math.min(...gg))}–${mesi(Math.max(...gg))})`;
      }
      const d9=sim9.raggiungibile&&sim9.nRec?` · con 9: ${sim9.nRec} rec`:'';
      targetDetail.textContent=`Score attuale ${displayScore.toFixed(1)} → obiettivo ${target.toFixed(1)} (serve superare ${soglia.toFixed(2)}) · stimati ${mesi(sim10.giorni)}${range}${d9}${expiringNote}`;
    }else if(sim10.motivo==='flusso'){
      targetTitle.textContent=`${target.toFixed(1)} non raggiungibile al ritmo qualitativo attuale`;
      targetDetail.textContent=`Con una media ponderata il punteggio converge alla media delle recensioni in arrivo: serve superare ${soglia.toFixed(2)}, quindi finché la qualità media non sale il target resta fuori portata a prescindere dal tempo.${expiringNote}`;
    }else if(sim10.motivo==='nessun-flusso'){
      targetTitle.textContent=`Nessuna recensione negli ultimi 12 mesi`;
      targetDetail.textContent=`Senza un flusso in arrivo non è possibile stimare i tempi.${expiringNote}`;
    }else{
      targetTitle.textContent=`${target.toFixed(1)} oltre l'orizzonte di 36 mesi`;
      targetDetail.textContent=`Anche con sole recensioni da 10 il target non si raggiunge entro la finestra di validità Booking.${expiringNote}`;
    }
  }
  // Pannelli aggiuntivi: calibrazione e impatto di una nuova recensione
  try{revRenderCalib(p,pb,hl);}catch(e){}
  try{revRenderImpact(p,pb,scored,hl,now);}catch(e){}
  try{revRenderDistrib(p,pb,scored,hl,now);}catch(e){}
}
function revSetPage(p,page){
  const h=REV_HOTELS[p];
  const total=Math.ceil(h.filtered.length/10);
  h.page=Math.max(0,Math.min(page,total-1));
  revRenderList(p);
  document.querySelector('.content').scrollTo({top:0,behavior:'smooth'});
}
function revRenderList(p){
  const data=REV_HOTELS[p].data;
  const filtered=REV_HOTELS[p].filtered;
  const PAGE_SIZE=10;
  const page=REV_HOTELS[p].page||0;
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const pageData=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const list=document.getElementById('revList-'+p);
  if(!filtered.length){list.innerHTML=`<div style="text-align:center;padding:30px;color:var(--text-dim);font-size:var(--fs-sm);">Nessuna recensione con i filtri selezionati</div>`;return;}
  list.innerHTML=pageData.map(r=>{
    const gi=data.indexOf(r);
    const uid=p+'-'+gi;
    const s=r._score;
    const cls=s>=9?'rev-score-hi':s>=7?'rev-score-mid':'rev-score-lo';
    const scoreColor=s>=9?'var(--green)':s>=7?'var(--amber)':'var(--red)';
    const R=14,circ=2*Math.PI*R,arc=Math.min(s/10,1)*circ;
    const scoreSvg=`<svg width="40" height="40" viewBox="0 0 40 40" style="flex-shrink:0;"><circle cx="20" cy="20" r="${R}" fill="none" stroke="var(--border-light)" stroke-width="2.5"/><circle cx="20" cy="20" r="${R}" fill="none" stroke="${scoreColor}" stroke-width="2.5" stroke-dasharray="${arc.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round" transform="rotate(-90 20 20)"/><text x="20" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="${scoreColor}" font-family="Helvetica Neue,Arial,sans-serif">${s.toFixed(1)}</text></svg>`;
    const d=r._date;
    const dateStr=isNaN(d)?'—':(d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear());
    const bookingNum=r['Numero di prenotazione']||r['Reservation number']||'';
    const bookingBadge=bookingNum?`<span style="font-size:var(--fs-xs);color:var(--text-muted);margin-left:8px;letter-spacing:.01em;font-weight:500;"># ${bookingNum}</span>`:'';
    const pos=r['Recensione positiva']?`<div class="rev-pos">+ ${r['Recensione positiva']}</div>`:'';
    const neg=r['Recensione negativa']?`<div class="rev-neg">− ${r['Recensione negativa']}</div>`:'';
    const italian=revIsItalian(r);
    const langBadge=!italian?`<span class="rev-lang-badge">🌐 Non italiano</span>`:'';
    const translateBtn=!italian?`<button class="rev-btn-translate" id="rtb-${uid}" onclick="revTranslate('${p}',${gi})">🌐 Traduci in italiano</button>`:'';
    const replyText=r['Risposta della struttura']||'';
    const replyShort=replyText.length>300;
    REV_REPLY_STORE[uid]=replyText;
    const replyHtmlShort=replyText.substring(0,300).replace(/\n/g,'<br>')+(replyShort?'…':'');
    const reply=r._hasReply?`<div class="rev-reply" style="margin-top:8px;">
      <span style="font-size:9px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;">Risposta struttura</span>
      <div id="rev-reply-text-${uid}" style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:4px;line-height:1.6;">${replyHtmlShort}</div>
      ${replyShort?`<span onclick="revToggleReply('${uid}')" style="font-size:9px;color:var(--accent);cursor:pointer;" id="rev-reply-toggle-${uid}">▾ Mostra tutto</span>`:''}
    </div>`:'';
    const noReplyBadge=!r._hasReply?`<span class="rev-no-reply">Senza risposta</span>`:'';
    const sentKey=revUniqueKey(p,r);
    const sentVal=REV_SENT[sentKey]||false;
    const isSent=sentVal===true;
    const isNotNeeded=sentVal==='not_needed';
    const sentBadge=isSent?`<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:#d4edda;color:#1a7a3a;font-weight:600;">✓ Risposta inviata</span>`:isNotNeeded?`<span onclick="revUndoNotNeeded('${p}',${gi})" style="font-size:9px;padding:2px 8px;border-radius:10px;background:var(--surface2);color:var(--text-dim);border:1px solid var(--border);font-weight:600;cursor:pointer;" title="Clicca per annullare">— Non necessaria ✕</span>`:'';
    const catMini=REV_CATS.map(c=>{const v=parseFloat(r[c]);return isNaN(v)?'':
      `<span style="font-size:var(--fs-xs);padding:3px 8px;border-radius:5px;background:var(--surface2);color:var(--text-muted);border:1px solid var(--border-light);">${c.split(' ')[0]} <strong style="color:var(--text);">${v.toFixed(1)}</strong></span>`;
    }).filter(Boolean).join('');
    const replyPanel=(!r._hasReply&&!isNotNeeded&&!isSent)?`
      <div class="rev-reply-panel" id="rp-${uid}">
        <input type="text" class="rev-instructions-input" id="ri-${uid}" placeholder="Non ti convince? Scrivi cosa correggere e premi Rigenera (opzionale)…" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:var(--fs-xs);background:var(--surface);margin-bottom:6px;box-sizing:border-box;font-family:'Helvetica Neue',Arial,sans-serif;">
        <textarea class="rev-reply-textarea" id="rt-${uid}" placeholder="Genera o scrivi la risposta…" oninput="revUpdateCharCount('${uid}')"></textarea>
        <div class="rev-reply-actions">
          <button class="rev-btn-generate" id="rb-${uid}" onclick="revGenerateReply('${p}',${gi})">✦ Genera risposta</button>
          <button class="rev-btn-copy" id="rc-${uid}" onclick="revCopyReply('${uid}')">Copia</button>
          <button onclick="revMarkSent('${p}',${gi})" style="background:${isSent?'#d4edda':'var(--surface2)'};color:${isSent?'#1a7a3a':'var(--text-muted)'};border:1px solid ${isSent?'#a3d9b1':'var(--border)'};border-radius:5px;padding:6px 13px;font-size:var(--fs-xs);cursor:pointer;font-family:'Helvetica Neue',Arial,sans-serif;" id="rs-${uid}">${isSent?'✓ Inviata':'Segna inviata'}</button>
          <button onclick="revMarkNotNeeded('${p}',${gi})" style="background:var(--surface2);color:var(--text-muted);border:1px solid var(--border);border-radius:5px;padding:6px 13px;font-size:var(--fs-xs);cursor:pointer;font-family:'Helvetice Neue',Arial,sans-serif;" title="Non è possibile rispondere a questa recensione">Non necessaria</button>
          <span class="rev-char-count" id="rcc-${uid}"></span>
        </div>
      </div>`:(isSent||isNotNeeded)?`<div style="margin-top:6px;">${sentBadge}</div>`:'';
    return`<div class="rev-card">
      <div class="rev-card-header">${scoreSvg}<span class="rev-guest">${r["Nome dell'ospite"]||'Ospite anonimo'}</span>${noReplyBadge}${sentBadge}${langBadge}<span class="rev-date">${dateStr}</span>${bookingBadge}</div>
      ${r['Titolo della recensione']?`<div class="rev-title"><span id="revTitleTxt-${uid}">${r['Titolo della recensione']}</span></div>`:''}
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">${catMini}</div>
      <div class="rev-body" id="revBody-${uid}">${pos}${neg}</div>${translateBtn}${reply}${replyPanel}
    </div>`;
  }).join('')+(totalPages>1?`<div class="rev-pagination"><button class="rev-pg-btn" onclick="revSetPage('${p}',${page-1})" ${page===0?'disabled':''}>← Prec</button><span class="rev-pg-info">Pagina ${page+1} di ${totalPages} · ${filtered.length} recensioni</span><button class="rev-pg-btn" onclick="revSetPage('${p}',${page+1})" ${page>=totalPages-1?'disabled':''}>Succ →</button></div>`:'');
}
function revUpdateCharCount(uid){
  const ta=document.getElementById('rt-'+uid),cc=document.getElementById('rcc-'+uid);
  if(ta&&cc)cc.textContent=ta.value.length+' caratteri';
}
function revIsItalian(r){
  const txt=(r['Recensione positiva']||'')+(r['Recensione negativa']||'')+(r['Titolo della recensione']||'');
  if(!txt.trim())return true;
  // Caratteri impossibili in italiano → non italiano
  if(/[čšžřěůőűñßąęłśćźďťĺľŕãõæøåœ]/i.test(txt))return false;
  // Accenti specifici italiani (solo gravi: à è ì ò ù) + parole chiave italiane
  return /[àèìòùÀÈÌÒÙ]|(\b(?:ottimo|buono|bello|camera|colazione|personale|posizione|pulizia|servizio|soggiorno|consiglio|esperienza|fantastico|eccellente|grazie|molto|tutto|anche|però|questo|questa|erano|abbiamo|siamo|stanza|struttura|personale|bellissimo|purtroppo|davvero)\b)/i.test(txt);
}
async function revTranslate(p,gi){
  const r=REV_HOTELS[p].data[gi];if(!r)return;
  const uid=p+'-'+gi;
  const btn=document.getElementById('rtb-'+uid);
  const body=document.getElementById('revBody-'+uid);
  const titleEl=document.getElementById('revTitleTxt-'+uid);
  if(!btn||!body)return;
  btn.disabled=true;btn.innerHTML='<div class="rev-gen-spinner" style="border-top-color:var(--accent);border-color:rgba(0,0,0,.15);"></div> Traduzione…';
  const testo=[
    r['Titolo della recensione']?'Titolo: '+r['Titolo della recensione']:'',
    r['Recensione positiva']?'Positivo: '+r['Recensione positiva']:'',
    r['Recensione negativa']?'Negativo: '+r['Recensione negativa']:''
  ].filter(Boolean).join('\n');
  try{
    const res=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:600,messages:[{role:'user',content:`Traduci in italiano il testo di questa recensione di hotel. Rispondi SOLO con la traduzione, mantenendo la struttura:\n${r['Titolo della recensione']?'Titolo: [titolo tradotto]\n':''}${r['Recensione positiva']?'Positivo: [testo tradotto]\n':''}${r['Recensione negativa']?'Negativo: [testo tradotto]':''}\n\nTESTO ORIGINALE:\n${testo}`}]})});
    const data=await res.json();
    if(data.content&&data.content[0]){
      const t=data.content[0].text;
      const posM=t.match(/Positivo:\s*([\s\S]+?)(?=\nNegativo:|$)/);
      const negM=t.match(/Negativo:\s*([\s\S]+?)$/);
      const titM=t.match(/Titolo:\s*(.+)/);
      let html='';
      if(posM)html+=`<div class="rev-pos">+ ${posM[1].trim()}</div>`;
      if(negM)html+=`<div class="rev-neg">− ${negM[1].trim()}</div>`;
      if(html)body.innerHTML=html;
      if(titM&&titleEl)titleEl.textContent=titM[1].trim();
      btn.textContent='✓ Tradotto';btn.style.opacity='.5';
    }else{btn.disabled=false;btn.textContent='🌐 Traduci';}
  }catch(e){btn.disabled=false;btn.textContent='🌐 Traduci';}
}
async function revGenerateReply(p,gi){
  const r=REV_HOTELS[p].data[gi];
  if(!r)return;
  const uid=p+'-'+gi;
  const btn=document.getElementById('rb-'+uid),ta=document.getElementById('rt-'+uid);
  if(!btn||!ta)return;
  btn.disabled=true;btn.innerHTML='<div class="rev-gen-spinner"></div> Generazione…';
  const isItalian=revIsItalian(r);
  const lang=isItalian?'italiano':'inglese';
  const firma=isItalian?'Cordiali saluti,\nPaolo P. - Quality Manager':'Best regards,\nPaolo P. - Quality Manager';
  const hotelName=REV_HOTELS[p].name;
  const hotelFacts=REV_HOTEL_FACTS[p]||'';
  const posText=(r['Recensione positiva']||'').trim();
  const negText=(r['Recensione negativa']||'').trim();
  const hasBookingText=posText.length>3||negText.length>3;
  if(!hasBookingText){ta.value='Nessun commento scritto — risposta non necessaria per Booking.com.';btn.disabled=false;btn.innerHTML='✦ Genera risposta';return;}
  const guestName=r["Nome dell'ospite"]||'Ospite';
  const instructions=(document.getElementById('ri-'+uid)?.value||'').trim();
  const currentDraft=ta.value.trim();
  const isRevision=Boolean(instructions&&currentDraft&&!currentDraft.startsWith('Errore')&&!currentDraft.startsWith('Nessun commento'));
  // Se l'utente non è convinto della risposta e scrive un suggerimento, non rigenerare
  // da zero ignorando la bozza: passa il testo attuale e chiedi di correggerlo secondo
  // l'indicazione — altrimenti l'AI non sa cosa "non va" e il suggerimento viene ignorato.
  const instructionsBlock=isRevision
    ?`\n\nQuesta è la bozza di risposta già generata, che l'utente NON ritiene ancora adatta:\n"""\n${currentDraft}\n"""\n\nCorreggi/riscrivi la bozza seguendo questa indicazione dell'utente (obbligatoria, ha priorità sulle scelte stilistiche libere ma non sulle regole sopra):\n${instructions}`
    :(instructions?`\n\nISTRUZIONI AGGIUNTIVE DELL'UTENTE — tienine conto se pertinenti, senza violare le regole sopra:\n${instructions}`:'');
  // Impara dallo stile delle risposte già scritte e caricate in Compass (stessa lingua)
  const examples=revGetStyleExamples(isItalian,3);
  const examplesBlock=examples.length?`\n\nESEMPI DI RISPOSTE GIÀ SCRITTE E APPROVATE (stesso stile/registro da seguire, non copiarle):\n${examples.map((t,i)=>`${i+1}. ${t}`).join('\n')}`:'';
  const prompt=`Sei un assistente AI specializzato nella gestione della reputazione online per il nostro gruppo alberghiero di lusso a Napoli. Il tuo compito è redigere risposte professionali, eleganti e strategiche alle recensioni ricevute su Booking.com, a nome di Paolo P. - Quality Manager.\n\nDevi rispondere a questa recensione del ${hotelName} in ${lang}.\n\nDATI RECENSIONE:\n- Ospite: ${guestName}\n- Punteggio: ${r._score}/10\n- Titolo: ${r['Titolo della recensione']||'—'}\n- Commento positivo: ${posText||'—'}\n- Commento negativo: ${negText||'—'}\n\nCARATTERISTICHE DELLA STRUTTURA (usale per valorizzare/difendere, non genericamente):\n${hotelFacts}\n\nREGOLE DI STILE E TONO — rispettale tutte:\n1. TONO FORMALE: rivolgiti all'ospite esclusivamente con il "Lei" (maiuscole di cortesia: La, Le, Suo, Sua se in italiano) — mai dare del tu. In inglese resta comunque formale.\n2. APERTURA: rivolgiti all'ospite per nome e ringrazia per la recensione — varia il modo ad ogni risposta.\n3. LUNGHEZZA: 3 paragrafi. Primo: 1-2 frasi (ringraziamento + positivi). Secondo: 2-3 frasi (feedback/critiche con spiegazione e azione). Terzo: 1 frase (chiusura). Totale 5-7 frasi.\n4. FIDELIZZAZIONE: invita l'ospite a tornare specificamente presso QUESTA struttura (mai formule generiche come "tornare in città" o "a Napoli").\n5. CRITICHE — REGOLA FONDAMENTALE: non dire mai "hai ragione"/"you are right"/"you are absolutely right" — riconosci il feedback in modo neutro e professionale (es. "Prendiamo nota della sua osservazione", "We appreciate your feedback on X") e poi spiega l'azione concreta.\n6. LINEA DIFENSIVA sui reclami:\n${REV_DEFENSE_PLAYBOOK}\n7. PUNTEGGIO: citalo solo se è alto (9-10/10) E la recensione è entusiasta.\n8. PUNTI POSITIVI: richiama aspetti specifici citati dall'ospite, non frasi generiche.\n9. VIETATO: non menzionare mai sito web, telefono, email o vantaggi della prenotazione diretta — Booking.com rileva e penalizza queste risposte.\n10. FIRMA — chiudi ESATTAMENTE su due righe separate così:\n"${firma}"\n11. Non ripetere le parole esatte usate dall'ospite nella sua critica.\n12. Se in inglese: linguaggio semplice, naturale e scorrevole, non complicato.\n13. Rispondi SOLO con il testo della risposta, senza preamboli.${examplesBlock}${instructionsBlock}`;
  try{
    const response=await fetch('https://anthropic-proxy.qm-d82.workers.dev',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
    const data=await response.json();
    if(data.error){ta.value='Errore API: '+data.error.type+' — '+data.error.message;btn.disabled=false;btn.innerHTML='✦ Genera risposta';return;}
    if(!data.content||!data.content[0]){ta.value='Risposta inattesa: '+JSON.stringify(data).substring(0,200);btn.disabled=false;btn.innerHTML='✦ Genera risposta';return;}
    ta.value=data.content[0].text;revUpdateCharCount(uid);btn.disabled=false;btn.innerHTML='✦ Rigenera';
  }catch(e){ta.value='Errore di rete: '+e.message;btn.disabled=false;btn.innerHTML='✦ Genera risposta';}
}
function revCopyReply(uid){
  const ta=document.getElementById('rt-'+uid),btn=document.getElementById('rc-'+uid);
  if(!ta||!ta.value.trim())return;
  navigator.clipboard.writeText(ta.value).then(()=>{btn.textContent='✓ Copiato';btn.classList.add('copied');setTimeout(()=>{btn.textContent='Copia';btn.classList.remove('copied');},2000);}).catch(()=>{ta.select();document.execCommand('copy');btn.textContent='✓ Copiato';setTimeout(()=>{btn.textContent='Copia';},2000);});
}
// Tracciamento risposte inviate
let REV_SENT=JSON.parse(localStorage.getItem('qm_rev_sent')||'{}')
function revUniqueKey(p,r){
  // Chiave stabile: struttura + nome ospite + data recensione (non dipende dall'indice)
  const nome=(r["Nome dell'ospite"]||'anonimo').trim().toLowerCase().replace(/\s+/g,'_');
  const data=r._dateTs?String(r._dateTs):'0';
  return p+'_'+nome+'_'+data;
}
function revMarkSent(p,gi){
  const r=REV_HOTELS[p].data[gi];
  const key=revUniqueKey(p,r);
  REV_SENT[key]=!REV_SENT[key];
  try{localStorage.setItem('qm_rev_sent',JSON.stringify(REV_SENT));}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_rev_sent',value:JSON.stringify(REV_SENT)})}).catch(()=>{});}catch(e){}
  revRenderList(p);
  revRenderStats(p);
  revRenderExpiring(p);
  revRenderCatTrend(p);
  ovUpdateRevNoreply();ovUpdateRevImport();
}
function revToggleReply(uid){
  const el=document.getElementById('rev-reply-text-'+uid);
  const toggle=document.getElementById('rev-reply-toggle-'+uid);
  if(!el)return;
  const fullText=REV_REPLY_STORE[uid]||'';
  const isExpanded=el.dataset.expanded==='1';
  if(!isExpanded){
    el.innerHTML=fullText.replace(/\n/g,'<br>');
    el.dataset.expanded='1';
    if(toggle)toggle.textContent='▴ Nascondi';
  } else {
    el.innerHTML=fullText.substring(0,300).replace(/\n/g,'<br>')+'…';
    el.dataset.expanded='0';
    if(toggle)toggle.textContent='▾ Mostra tutto';
  }
}
function revToggleFilter(p,f){
  const h=REV_HOTELS[p];
  if(f==='all'){
    h.filters=[];
  } else {
    const idx=h.filters.indexOf(f);
    if(idx>=0)h.filters.splice(idx,1);else h.filters.push(f);
  }
  // Aggiorna stato bottoni
  const allBtn=document.getElementById('revFlt-'+p+'-all');
  if(allBtn)allBtn.classList.toggle('active',h.filters.length===0);
  ['hi','mid','lo','noreply'].forEach(k=>{
    const b=document.getElementById('revFlt-'+p+'-'+k);
    if(b)b.classList.toggle('active',h.filters.includes(k));
  });
  revApplyFilters(p);
}
function revSort(p,s){REV_HOTELS[p].sort=s;revApplyFilters(p);}
function revSearch(p,val){REV_HOTELS[p].search=(val||'').toLowerCase().trim();revApplyFilters(p);}
function revApplyFilters(p){
  const h=REV_HOTELS[p];
  let d=[...h.data];
  const fs=h.filters||[];
  // Filtri score (OR tra quelli selezionati)
  const scoreFs=fs.filter(f=>['hi','mid','lo'].includes(f));
  if(scoreFs.length>0){
    d=d.filter(r=>
      (scoreFs.includes('hi')&&r._score>=9)||
      (scoreFs.includes('mid')&&r._score>=7&&r._score<9)||
      (scoreFs.includes('lo')&&r._score<7)
    );
  }
  // Filtro senza risposta (AND)
  if(fs.includes('noreply')){
    d=d.filter(r=>{
      const sent=REV_SENT[revUniqueKey(p,r)];
      return !r._hasReply&&sent!==true&&sent!=='not_needed';
    });
  }
  // Cerca per nome ospite o numero prenotazione
  if(h.search){
    const q=h.search;
    d=d.filter(r=>
      (r["Nome dell'ospite"]||'').toLowerCase().includes(q)||
      (r['Numero di prenotazione']||r['Reservation number']||'').toLowerCase().includes(q)
    );
  }
  if(h.sort==='date_asc')d.sort((a,b)=>a._dateTs-b._dateTs);
  else if(h.sort==='date_desc')d.sort((a,b)=>b._dateTs-a._dateTs);
  else if(h.sort==='score_desc')d.sort((a,b)=>b._score-a._score);
  else if(h.sort==='score_asc')d.sort((a,b)=>a._score-b._score);
  h.filtered=d;h.page=0;revRenderList(p);
}
function revUndoNotNeeded(p,gi){
  const r=REV_HOTELS[p].data[gi];
  const key=revUniqueKey(p,r);
  delete REV_SENT[key];
  try{localStorage.setItem('qm_rev_sent',JSON.stringify(REV_SENT));}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_rev_sent',value:JSON.stringify(REV_SENT)})}).catch(()=>{});}catch(e){}
  revApplyFilters(p);revRenderStats(p);
}
function revMarkNotNeeded(p,gi){
  const r=REV_HOTELS[p].data[gi];
  const key=revUniqueKey(p,r);
  REV_SENT[key]='not_needed';
  try{localStorage.setItem('qm_rev_sent',JSON.stringify(REV_SENT));}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_rev_sent',value:JSON.stringify(REV_SENT)})}).catch(()=>{});}catch(e){}
  revApplyFilters(p);revRenderStats(p);
}
function revShowTs(p,ts){
  const el=document.getElementById('revTs-'+p);
  if(!el||!ts)return;
  const n=new Date(typeof ts==='string'?parseInt(ts):ts);
  const days=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const ms=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  el.textContent='↑ '+days[n.getDay()]+' '+n.getDate()+' '+ms[n.getMonth()]+' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
}
function revReset(p){
  REV_HOTELS[p].data=[];REV_HOTELS[p].filtered=[];REV_HOTELS[p].filters=[];REV_HOTELS[p].sort='date_desc';REV_HOTELS[p].page=0;
  document.getElementById('revUploadZone-'+p).style.display='block';
  document.getElementById('revContent-'+p).style.display='none';
  document.getElementById('revFileInput-'+p).value='';
  document.getElementById('revError-'+p).style.display='none';
  try{localStorage.removeItem('qm_rev_'+p);}catch(e){}
}
function revShowError(p,msg){
  document.getElementById('revProcessing-'+p).style.display='none';
  document.getElementById('revUploadZone-'+p).style.display='block';
  const e=document.getElementById('revError-'+p);e.textContent=msg;e.style.display='block';
}
// §§ REPORT PASTI — BKF (handleBkfFile, bkfParseText, renderBkfData, renderBkfDay, renderOvBkfChart)
let bkfData=null,bkfActiveDay=0,bkfOpen=false;
function toggleBkfAccordion(){}
(function initBkfUpload(){
  const box=document.getElementById('bkfUploadBox');
  const inp=document.getElementById('bkfFileInput');
  if(box){box.addEventListener('click',()=>inp.click());box.addEventListener('dragover',e=>{e.preventDefault();box.classList.add('dragover');});box.addEventListener('dragleave',()=>box.classList.remove('dragover'));box.addEventListener('drop',e=>{e.preventDefault();box.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f&&f.type==='application/pdf')handleBkfFile(f);else bkfShowStatus('Carica un file PDF.');});}
  inp.addEventListener('change',e=>{if(e.target.files[0])handleBkfFile(e.target.files[0]);});
})();
async function handleBkfFile(file){
  ucSetState('bkf','loading','Lettura PDF...');
  try{
    const ab=await file.arrayBuffer();
    const pdfDoc=await pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise;
    let text='';
    for(let i=1;i<=pdfDoc.numPages;i++){
      const page=await pdfDoc.getPage(i);
      const tc=await page.getTextContent();
      text+=tc.items.map(x=>x.str).join(' ')+'\n';
    }
    const days=bkfParseText(text);
    if(!days.length){bkfShowStatus('Nessun dato trovato.');return;}
    bkfData=days;
    bkfShowStatus('');
    const _newBts=Date.now();
    localStorage.setItem('qm_ts_bkfTs',String(_newBts));
    renderBkfData();
    setUploadTs('bkfTs',_newBts);
  }catch(e){bkfShowStatus('Errore: '+e.message);}
}
function bkfParseText(text){
  const days=[];
  const norm=text.replace(/\s+/g,' ');
  // Pattern: "Lun 16/03/2026 1 (1 a + 0 b) 37 (36 a + 1 b) 0 0"
  // oppure "Ven 20/03/2026 0 44 (41 a + 3 b) 0 0"
  // Cattura: giorno data | noCol totale (a b) | col totale (a b)
  const pat=/((Lun|Mar|Mer|Gio|Ven|Sab|Dom)\s+(\d{1,2}\/\d{2}\/\d{4}))\s+(\d+)(?:\s*\([^)]*\))?\s+(\d+)\s*(?:\((\d+)\s*a\s*\+\s*(\d+)\s*b\))?/gi;
  let m;
  while((m=pat.exec(norm))!==null){
    days.push({
      label:m[2]+' '+m[3].substring(0,5),
      data:m[3],
      noCol:parseInt(m[4])||0,
      colTot:parseInt(m[5])||0,
      adulti:parseInt(m[6])||0,
      bambini:parseInt(m[7])||0,
    });
  }
  return days;
}
function renderBkfData(silent){
  if(!bkfData||!bkfData.length)return;
  const today=new Date();
  const todayStr=String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear();
  let idx=bkfData.findIndex(d=>d.data===todayStr);
  if(idx===-1)idx=0;
  bkfActiveDay=idx;
  const nav=document.getElementById('bkfWeekNav');
  nav.innerHTML='';
  bkfData.forEach((d,i)=>{
    const btn=document.createElement('button');
    btn.className='pul-day-btn'+(i===idx?' active':'');
    btn.textContent=d.label.split(' ')[0];
    btn.title=d.label+' — '+d.colTot+' colazioni';
    btn.onclick=()=>{bkfActiveDay=i;renderBkfDay();document.querySelectorAll('#bkfWeekNav .pul-day-btn').forEach((b,j)=>b.classList.toggle('active',j===i));};
    nav.appendChild(btn);
  });
  ucSetState('bkf','loaded',bkfData[0].label+' – '+bkfData[bkfData.length-1].label,silent);
  // Box sempre cliccabile: ricaricare non richiede prima "Rimuovi report" (v. pul/piano).
  document.getElementById('bkfLoadedInfo').classList.add('visible');
  document.getElementById('bkfStatGrid').style.display='grid';
  document.getElementById('btnBkfReload').style.display='block';
  renderBkfDay(silent);
}
function renderBkfDay(silent){
  if(!bkfData)return;
  const d=bkfData[bkfActiveDay];
  const coperti=d.adulti+d.bambini;
  document.getElementById('bkfLoadedDate').textContent=d.label;
  document.getElementById('bkfStatGrid').innerHTML=`
    <div class="pul-stat"><div class="pul-stat-val" style="color:var(--amber)">${coperti}</div><div class="pul-stat-lbl">Coperti</div></div>
    <div class="pul-stat"><div class="pul-stat-val" style="color:var(--text-muted)">${d.noCol}</div><div class="pul-stat-lbl">No col.</div></div>`;
  updateKpiFromBkf(d);
  if(!silent){const _bts=localStorage.getItem('qm_ts_bkfTs');LS.set('bkfData',{data:bkfData,activeDay:bkfActiveDay,ts:_bts?parseInt(_bts):Date.now()});bkfSaveMonthlyHistory();}
  bkfRenderChart();
  bkfRenderChartAR();
  bkfRenderNotes();
  renderOvBkfChart();
  renderOvBkfStats();
}
// Chiave YYYY-MM-DD da una riga di bkfData (che porta la data come GG/MM/AAAA).
function bkfHistChiave(d){
  if(!d||!d.data)return null;
  const p=String(d.data).split('/');if(p.length!==3)return null;
  return p[2]+'-'+p[1].padStart(2,'0')+'-'+p[0].padStart(2,'0');
}
function bkfHistOggi(){
  const n=new Date();
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
}
// Nell'archivio mensile delle colazioni entrano SOLO i giorni già trascorsi, oggi compreso.
//
// Un giorno futuro è una previsione, non un dato: le prenotazioni per quella data
// continuano ad arrivare. Archiviandolo in anticipo, la fotografia scattata quel giorno
// restava per sempre — nessuno torna a ricaricare il 12 agosto. Il 22/08/2026 l'archivio
// dichiarava per agosto 1155 colazioni contro le 1187 del PMS: i giorni dall'8 al 13 erano
// stati scritti quando mancavano ancora prenotazioni (il 12 ne mancavano sedici), tre
// giorni erano gonfiati da prenotazioni poi cancellate, e in coda c'erano già archiviati
// il 30 agosto con 21 colazioni e il 31 con 8.
//
// Sono numeri usati per confronti fra mesi: devono essere veri, non plausibili.
// Il confronto fra chiavi è fra stringhe ISO, il cui ordine alfabetico è quello di calendario.
async function bkfSaveMonthlyHistory(){
  if(!bkfData||!bkfData.length)return;
  const HIST_KEY='qm_bkf_monthly_history';
  let hist={};
  // Sempre KV-first: evita di sovrascrivere history da altri dispositivi
  try{
    const kvVal=await kvGet(HIST_KEY);
    if(kvVal)hist=JSON.parse(kvVal);
  }catch(e){
    try{hist=JSON.parse(localStorage.getItem(HIST_KEY)||'{}');}catch(e2){}
  }
  // Rimuovi vecchi record formato YYYY-MM (aggregati mensili, obsoleti)
  Object.keys(hist).forEach(k=>{if(k.length!==10)delete hist[k];});
  // Salva ogni giorno come YYYY-MM-DD → {bb, ro}, MA solo i giorni già trascorsi.
  // Vedi bkfHistOggi(): un giorno futuro è una previsione e non va archiviato.
  const _oggi=bkfHistOggi();
  bkfData.forEach(d=>{
    const key=bkfHistChiave(d);
    if(!key||key>_oggi)return;
    hist[key]={bb:(d.adulti||0)+(d.bambini||0),ro:(d.noCol||0),ts:Date.now()};
  });
  // Ripulisce le previsioni archiviate dal comportamento precedente: senza questo, i giorni
  // futuri già scritti diventerebbero "storico" al loro arrivo con numeri provvisori.
  Object.keys(hist).forEach(k=>{if(k.length===10&&k>_oggi)delete hist[k];});
  const json=JSON.stringify(hist);
  try{localStorage.setItem(HIST_KEY,json);}catch(e){}
  kvSet(HIST_KEY,json).catch(()=>{});
}
function renderOvBkfChart(){
  const el=document.getElementById('ov-bkf-chart');if(!el)return;
  if(!bkfData||!bkfData.length){el.innerHTML='<div style="margin:auto;color:var(--text-dim);font-size:var(--fs-xs);">Carica il report pasti per vedere il grafico</div>';return;}
  const pts=bkfData.map(d=>({label:d.label.split(' ')[0],v:d.adulti+d.bambini,nc:d.noCol||0}));
  const W=600,H=220,PL0=34,PR0=14,PT=26,PB=28;
  const plotW0=W-PL0-PR0,plotH=H-PT-PB;
  const YMAX=Math.max(30,...pts.map(p=>p.v))+10;
  const barW=Math.min(40,plotW0/pts.length*0.5);
  const PL=PL0+barW/2,PR=PR0+barW/2;
  const plotW=W-PL-PR;
  const sx=i=>PL+i/(pts.length-1||1)*plotW;
  const sy=v=>PT+plotH-(v/YMAX)*plotH;
  let svg=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;flex:1;min-height:0;display:block;">`;
  for(let v=0;v<=YMAX;v+=Math.ceil(YMAX/4/10)*10){
    const y=sy(v);
    svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border-light)" stroke-width="1"/>`;
    svg+=`<text x="${PL-4}" y="${y+4}" font-size="11" fill="var(--text-dim)" text-anchor="end">${v}</text>`;
  }
  // Barre coperti
  pts.forEach((p,i)=>{
    const x=sx(i),y=sy(p.v),isActive=i===bkfActiveDay;
    svg+=`<rect x="${x-barW/2}" y="${y}" width="${barW}" height="${sy(0)-y}" rx="4" fill="${isActive?'var(--accent)':'var(--accent-bg)'}" stroke="var(--accent)" stroke-width="1.5"/>`;
  });
  // Linea tratteggiata Room Only sulla stessa scala
  const roLine='M'+pts.map((p,i)=>`${sx(i)},${sy(p.nc)}`).join('L');
  svg+=`<path d="${roLine}" fill="none" stroke="var(--red)" stroke-width="2" stroke-dasharray="3 3"/>`;
  pts.forEach((p,i)=>{svg+=`<circle cx="${sx(i)}" cy="${sy(p.nc)}" r="3" fill="var(--red)"/>`;});
  // Etichette valori + giorni
  pts.forEach((p,i)=>{
    const x=sx(i),y=sy(p.v),isActive=i===bkfActiveDay;
    if(isActive)svg+=`<text x="${x}" y="${y+16}" font-size="13" fill="#fff" text-anchor="middle" font-weight="800">${p.v}</text>`;
    else svg+=`<text x="${x}" y="${y-6}" font-size="11.5" fill="var(--accent)" text-anchor="middle" font-weight="700">${p.v}</text>`;
    svg+=`<text x="${x}" y="${H-8}" font-size="11" fill="${isActive?'var(--accent)':'var(--text-dim)'}" font-weight="${isActive?'700':'400'}" text-anchor="middle">${p.label}</text>`;
  });
  svg+='</svg>';
  el.innerHTML=`<div class="kpi-label" style="flex-shrink:0;">Andamento settimanale</div>${svg}<div style="display:flex;gap:14px;flex-shrink:0;margin-top:2px;">
    <span style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-dim);"><span style="width:10px;height:10px;background:var(--accent);border-radius:2px;display:inline-block;"></span>Coperti</span>
    <span style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-dim);"><span style="width:10px;height:2px;background:var(--red);display:inline-block;"></span>Room Only</span>
  </div>`;
}
function renderOvBkfStats(){
  const el=document.getElementById('ov-bkf-stats');if(!el)return;
  if(!bkfData||!bkfData.length){el.style.display='none';el.innerHTML='';return;}
  const pts=bkfData.map(d=>({label:d.label.split(' ')[0],v:d.adulti+d.bambini}));
  const avg=Math.round(pts.reduce((s,p)=>s+p.v,0)/pts.length);
  const maxP=pts.reduce((a,b)=>b.v>a.v?b:a);
  const minP=pts.reduce((a,b)=>b.v<a.v?b:a);
  const today=bkfData[bkfActiveDay];
  const totToday=today.adulti+today.bambini+(today.noCol||0);
  const roPct=totToday>0?Math.round((today.noCol||0)/totToday*100):0;
  el.style.display='flex';
  el.innerHTML=`
    <div>
      <div class="kpi-label">Media coperti/giorno</div>
      <div class="kpi-value">${avg}</div>
    </div>
    <div style="border-left:1px solid var(--border-light);padding-left:24px;">
      <div class="kpi-label">Giorno più alto</div>
      <div class="kpi-value" style="color:var(--green);">${maxP.v}</div>
      <div class="kpi-sub">${maxP.label}</div>
    </div>
    <div style="border-left:1px solid var(--border-light);padding-left:24px;">
      <div class="kpi-label">Giorno più basso</div>
      <div class="kpi-value" style="color:var(--red);">${minP.v}</div>
      <div class="kpi-sub">${minP.label}</div>
    </div>
    <div style="border-left:1px solid var(--border-light);padding-left:24px;">
      <div class="kpi-label">Room Only oggi</div>
      <div class="kpi-value">${roPct}%</div>
      <div class="kpi-sub">${today.noCol||0} su ${totToday} ospiti</div>
    </div>`;
}
// §§ HOUSEKEEPING — HKP UPLOAD & DATI (handleHkFile, hkParseText, hkSetLoaded, resetSoulData/BoutData)
let hkSoulData=null;
let hkBoutData=null;
(function initHkUploads(){
  ['soul','bout'].forEach(key=>{
    const box=document.getElementById(key+'UploadBox');
    const inp=document.getElementById(key+'FileInput');
    if(box){
      box.addEventListener('click',()=>inp.click());
      box.addEventListener('dragover',e=>{e.preventDefault();box.classList.add('dragover');});
      box.addEventListener('dragleave',()=>box.classList.remove('dragover'));
      box.addEventListener('drop',e=>{e.preventDefault();box.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f)handleHkFile(key,f);});
    }
    if(inp)inp.addEventListener('change',e=>{if(e.target.files[0])handleHkFile(key,e.target.files[0]);});
  });
  ['soul','bout'].forEach(key=>{
    try{const saved=localStorage.getItem('qm_hk_'+key);if(saved){const data=JSON.parse(saved);if(key==='soul')hkSoulData=data;else hkBoutData=data;setTimeout(()=>{hkSetLoaded(key,true);if(data._ts)restoreUploadTs(key+'Ts',data._ts);else loadStoredTs(key+'Ts');},200);}}catch(e){}
  });
})();
async function handleHkFile(key,file){
  ucSetState(key,'loading','Analisi in corso...');
  try{
    const ab=await file.arrayBuffer();
    const pdfDoc=await pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise;
    let text='';
    for(let i=1;i<=pdfDoc.numPages;i++){const page=await pdfDoc.getPage(i);const tc=await page.getTextContent();text+=tc.items.map(x=>x.str).join(' ')+'\n';}
    const data=hkParseText(text,key);
    if(!data||!data.giorni||!data.giorni.length)throw new Error('Nessun dato trovato nel PDF');
    if(key==='soul')hkSoulData=data;else hkBoutData=data;
    data._ts=Date.now();
    localStorage.setItem('qm_hk_'+key,JSON.stringify(data));
    kvSet('qm_hk_'+key,JSON.stringify(data));
    setUploadTs(key+'Ts',data._ts);
    hkSetLoaded(key);
  }catch(e){ucSetState(key,'error','Errore: '+e.message);}
}
function hkParseText(text,key){
  const giorni=[];
  const re=/([A-Za-z]{3})\s+(\d{1,2}\/\d{2}\/\d{4})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/g;
  let m;
  while((m=re.exec(text))!==null){giorni.push({label:m[1]+' '+m[2].substring(0,5),data:m[2],arrivi:parseInt(m[3]),fermate:parseInt(m[5]),partenze:parseInt(m[6])});}
  return{struttura:key==='soul'?'SoulArt Hotel':'Boutique Hotel',giorni,caricato:new Date().toISOString()};
}
function hkSetLoaded(key,silent){
  const data=key==='soul'?hkSoulData:hkBoutData;
  if(!data||!data.giorni)return;
  const range=data.giorni[0]?.label+' – '+data.giorni[data.giorni.length-1]?.label;
  ucSetState(key,'loaded',range,silent);
  if(data._ts){try{_setUcTs(key+'Ts',data._ts);}catch(e){}}
  const dateEl=document.getElementById(key+'LoadedDate');if(dateEl)dateEl.textContent=data.struttura+' · '+range;
  const btnId='btn'+key.charAt(0).toUpperCase()+key.slice(1)+'Reload';
  const btn=document.getElementById(btnId);if(btn)btn.style.display='block';
  const box=document.getElementById(key+'UploadBox');if(box)box.style.display='none';
  const li=document.getElementById(key+'LoadedInfo');if(li)li.classList.add('visible');
  const today=new Date();
  const todayStr=String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear();
  const g=data.giorni.find(d=>d.data===todayStr)||data.giorni[0];
  if(g){
    const kpiId=key==='soul'?'kpi-hkp':'kpi-hkp-ar';
    const valEl=document.getElementById(kpiId+'-val');
    const deltaEl=document.getElementById(kpiId+'-delta');
    const subEl=document.getElementById(kpiId+'-sub');
    if(valEl)valEl.textContent=g.fermate;
    if(deltaEl){deltaEl.textContent=g.arrivi+' arrivi · '+g.partenze+' partenze';deltaEl.className='kpi-delta';}
    if(subEl)subEl.textContent=g.label;
  }
}
function resetSoulData(){hkSoulData=null;hkResetSlot('soul');}
function resetBoutData(){hkBoutData=null;hkResetSlot('bout');}
function hkResetSlot(key){
  localStorage.removeItem('qm_hk_'+key);
  kvSet('qm_hk_'+key,null);
  ucSetState(key,'','Non caricato');
  const box=document.getElementById(key+'UploadBox');if(box)box.style.display='';
  const li=document.getElementById(key+'LoadedInfo');if(li)li.classList.remove('visible');
  const btnId='btn'+key.charAt(0).toUpperCase()+key.slice(1)+'Reload';
  const btn=document.getElementById(btnId);if(btn)btn.style.display='none';
  const inp=document.getElementById(key+'FileInput');if(inp)inp.value='';
}
// §§ PIANO SETTIMANA — UPLOAD & PARSER (handlePianoFile, parsePianoItems, pianoSetLoaded)
let pianoData=null;
(()=>{try{const s=localStorage.getItem('qm_piano');if(s){pianoData=JSON.parse(s);setTimeout(()=>{pianoSetLoaded(true);if(pianoData._ts)restoreUploadTs('pianoTs',pianoData._ts);else loadStoredTs('pianoTs');},200);}}catch(e){}})();
(()=>{
  const box=document.getElementById('pianoUploadBox');
  const inp=document.getElementById('pianoFileInput');
  if(!inp)return;
  if(box){box.addEventListener('click',()=>inp.click());box.addEventListener('dragover',e=>{e.preventDefault();box.classList.add('dragover');});box.addEventListener('dragleave',()=>box.classList.remove('dragover'));box.addEventListener('drop',e=>{e.preventDefault();box.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f&&f.type==='application/pdf')handlePianoFile(f);else ucSetState('piano','error','Carica un PDF.');});}
  inp.addEventListener('change',e=>{if(e.target.files[0])handlePianoFile(e.target.files[0]);});
})();
async function handlePianoFile(file){
  ucSetState('piano','loading','Lettura PDF...');
  try{
    const ab=await file.arrayBuffer();
    const pdfDoc=await pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise;
    const allItems=[];
    for(let p=1;p<=pdfDoc.numPages;p++){
      const page=await pdfDoc.getPage(p);
      const tc=await page.getTextContent();
      tc.items.forEach(it=>{const s=it.str.trim();if(s)allItems.push({s,x:Math.round(it.transform[4]),y:Math.round(it.transform[5]),p});});
    }
    const data=parsePianoItems(allItems);
    if(!data||!data.giorni||!data.giorni.length)throw new Error('Nessun dato trovato');
    data._ts=Date.now();
    bkfRoomInfoReconcilePianoChange(pianoData,data);
    pianoData=data;
    localStorage.setItem('qm_piano',JSON.stringify(data));
    setSyncStatus('syncing');
    kvSet('qm_piano',JSON.stringify(data)).then(ok=>{setSyncStatus(ok?'ok':'error');if(!ok)ucSetState('piano','error','Errore cloud — riprova');});
    setUploadTs('pianoTs');
    pianoSetLoaded();
  }catch(e){ucSetState('piano','error','Errore: '+e.message);}
}
function parsePianoItems(items){
  // Raggruppa in righe per (page, y) con tolleranza 4
  const rows=[];
  items.forEach(it=>{
    const r=rows.find(r=>r.p===it.p&&Math.abs(r.y-it.y)<4);
    if(r)r.items.push(it);
    else rows.push({p:it.p,y:it.y,items:[it]});
  });
  rows.sort((a,b)=>a.p!==b.p?a.p-b.p:b.y-a.y);
  rows.forEach(r=>r.items.sort((a,b)=>a.x-b.x));
  // Anno da "stampato: DD/MM/YYYY"
  let year='2026',stampato='';
  for(const r of rows){const m=r.items.map(i=>i.s).join(' ').match(/(\d{2}\/\d{2}\/(\d{4}))/);if(m){stampato=m[1];year=m[2];break;}}
  // Riga header: contiene ≥2 abbreviazioni giorno
  const DAYS=['Gio','Ven','Sab','Dom','Lun','Mar','Mer'];
  const hIdx=rows.findIndex(r=>r.items.filter(it=>DAYS.includes(it.s)).length>=2);
  if(hIdx<0)return null;
  const dayXItems=rows[hIdx].items.filter(it=>DAYS.includes(it.s)).sort((a,b)=>a.x-b.x);
  // Date items: nella riga header e nella successiva
  const nextRow=rows[hIdx+1];
  const dateItems=[
    ...rows[hIdx].items.filter(it=>/^\d{1,2}\/\d{1,2}$/.test(it.s)),
    ...(nextRow&&nextRow.p===rows[hIdx].p?nextRow.items.filter(it=>/^\d{1,2}\/\d{1,2}$/.test(it.s)):[])
  ];
  // Costruisci colonne abbinando giorno ↔ data per X più vicino
  const cols=[];
  dayXItems.forEach(dIt=>{
    let bestDate='',bestDist=Infinity;
    dateItems.forEach(di=>{const d=Math.abs(di.x-dIt.x);if(d<bestDist){bestDist=d;bestDate=di.s;}});
    let fullDate=null;
    if(bestDate){const[dd,mm]=bestDate.split('/');fullDate=dd.padStart(2,'0')+'/'+mm.padStart(2,'0')+'/'+year;}
    cols.push({x:dIt.x,label:dIt.s+(bestDate?' '+bestDate:''),data:fullDate});
  });
  if(!cols.length)return null;
  cols.sort((a,b)=>a.x-b.x);
  const firstColX=cols[0].x;
  const BH=new Set(['201','203','204','205','206','207','208','209','210','211']);
  // 'arrivi' = camere con SOLO arrivo (+N senza partenza): prima non venivano
  // registrate da nessuna parte. Servono per derivare il conteggio arrivi dei report
  // pulizie (vedi hkpDeriveFromPiano). Nessuna vista esistente le legge, quindi
  // aggiungerle non altera partenze/fermate/cambi né la logica Culligan/Room Division.
  const giorni=cols.map(c=>({label:c.label,data:c.data,soulart:{partenze:[],fermate:[],cambi:[],arrivi:[]},boutique:{partenze:[],fermate:[],cambi:[],arrivi:[]},liborio:{partenze:[],fermate:[],cambi:[],arrivi:[]}}));
  // Tipologia camera (es. "AS DLX DP", "AS SUI"): è nel PDF subito dopo lo slash ma
  // finora veniva scartata. Serve ai suggerimenti di bilanciamento, che propongono
  // spostamenti solo tra camere della stessa tipologia.
  const tipi={},incArr=[],incPar=[];
  // Righe dati: tutto dopo header+daterow (anche page 2+)
  const hPage=rows[hIdx].p;
  const skipUntil=nextRow&&nextRow.p===hPage&&dateItems.length?hIdx+1:hIdx;
  for(let ri=0;ri<rows.length;ri++){
    if(rows[ri].p===hPage&&ri<=skipUntil)continue;
    const its=rows[ri].items;
    if(!its.length)continue;
    const rowStr=its.map(i=>i.s).join(' ');
    // Rilevamento camera
    let roomCode=null,roomType=null;
    const artM=rowStr.match(/\bArt\s+(\d{1,2})\b/);
    if(artM){const n=parseInt(artM[1]);if(n>=1&&n<=22){roomCode='Art '+n;roomType='soulart';}}
    if(!roomCode){const bhM=rowStr.match(/\b(20[1-9]|210|211)\b/);if(bhM&&BH.has(bhM[1])){roomCode=bhM[1];roomType='boutique';}}
    if(!roomCode&&/\bAS_LIB\b/i.test(rowStr)){roomCode='Liborio';roomType='liborio';}
    if(!roomCode)continue;
    // Tipologia: subito dopo lo slash, fino al primo valore (-,+,=,..)
    // "Art 5 / AS DLX DP -2 +2 …" → "AS DLX DP"
    if(!tipi[roomCode]){
      const sp=rowStr.indexOf('/');
      if(sp>=0){
        const tm=rowStr.slice(sp+1).match(/^\s*([A-Z][A-Z0-9_]*(?:\s+[A-Z][A-Z0-9_]*)*)/);
        if(tm)tipi[roomCode]=tm[1].trim();
      }
    }
    // Item valore: in zona colonne, contiene -, +, = o ".."
    const valItems=its.filter(it=>it.x>=firstColX-25&&(/^[-+=]/.test(it.s)||it.s==='..'));
    const colVals=cols.map(()=>'');
    valItems.forEach(vit=>{
      let ni=0,nd=Infinity;
      cols.forEach((c,ci)=>{const d=Math.abs(vit.x-c.x);if(d<nd){nd=d;ni=ci;}});
      colVals[ni]+=vit.s;
    });
    colVals.forEach((val,ci)=>{
      if(!val||/^\.+$/.test(val))return;
      // Pax non valorizzati ("+..", "-..") = riprotezioni o blocchi camera, non
      // prenotazioni normali: si contano come occupazione e come lavoro, ma non si
      // possono spostare in un'altra camera come un ospite. Arrivo e partenza vanno
      // distinti: in "-1+.." parte un ospite vero (-1) ed entra un blocco (+..).
      const mMinus=val.match(/-([\d.]*)/),mPlus=val.match(/\+([\d.]*)/);
      if(mPlus&&mPlus[1].indexOf('.')>=0)incArr.push(roomCode+'|'+ci);
      if(mMinus&&mMinus[1].indexOf('.')>=0)incPar.push(roomCode+'|'+ci);
      const hasMinus=val.includes('-'),hasPlus=val.includes('+');
      if(hasMinus&&hasPlus)giorni[ci][roomType].cambi.push(roomCode);
      else if(hasMinus)giorni[ci][roomType].partenze.push(roomCode);
      else if(hasPlus)giorni[ci][roomType].arrivi.push(roomCode);
      else if(val.includes('='))giorni[ci][roomType].fermate.push(roomCode);
    });
  }
  return{stampato,giorni,tipi,incArr,incPar};
}
// Deriva dal Piano Settimanale i conteggi che prima arrivavano dai tre PDF report
// pulizie. Vedi il commento dell'interruttore HKP_DERIVE_FROM_PIANO in cima al file.
// I dati salvati prima di questa modifica non hanno il campo 'arrivi' (arrivi puri):
// in quel caso il conteggio arrivi resta sottostimato finché non si ricarica il Piano,
// senza però rompere nulla — si risistema da solo al primo upload.
function _hkpCountDay(g,keys){
  let arrivi=0,fermate=0,partenze=0;
  keys.forEach(k=>{
    const s=g[k];if(!s)return;
    const nCambi=(s.cambi||[]).length;
    arrivi+=nCambi+(s.arrivi||[]).length;   // cambio = partenza + arrivo sulla stessa camera
    partenze+=nCambi+(s.partenze||[]).length;
    fermate+=(s.fermate||[]).length;
  });
  return{arrivi,fermate,partenze};
}
function hkpDeriveFromPiano(){
  if(!HKP_DERIVE_FROM_PIANO)return;
  if(!pianoData||!pianoData.giorni||!pianoData.giorni.length)return;
  const mk=keys=>pianoData.giorni.map(g=>{
    const c=_hkpCountDay(g,keys);
    return{label:g.label,data:g.data,arrivi:c.arrivi,fermate:c.fermate,fermatePulizia:c.fermate,partenze:c.partenze};
  });
  const ts=pianoData._ts||Date.now();
  // Cruscotto pulizie → KPI Overview + grafico occupazione
  pulData=mk(['soulart','boutique','liborio']);
  pulActiveDay=0;
  try{renderPulData(true);}catch(e){}
  try{LS.set('pulData',{data:pulData,activeDay:pulActiveDay,ts});}catch(e){}
  // Compass Housekeeper SoulArt / Boutique → KPI Overview + app housekeeper.html
  // (il bilanciamento cameriere e il dettaglio camere di quell'app leggono già il
  // Piano direttamente, qui si replicano solo i conteggi aggregati delle card KPI)
  hkSoulData={struttura:'SoulArt Hotel',giorni:mk(['soulart']),caricato:new Date().toISOString(),_ts:ts};
  hkBoutData={struttura:'Boutique Hotel',giorni:mk(['boutique']),caricato:new Date().toISOString(),_ts:ts};
  try{localStorage.setItem('qm_hk_soul',JSON.stringify(hkSoulData));}catch(e){}
  try{localStorage.setItem('qm_hk_bout',JSON.stringify(hkBoutData));}catch(e){}
  kvSet('qm_hk_soul',JSON.stringify(hkSoulData)).catch(()=>{});
  kvSet('qm_hk_bout',JSON.stringify(hkBoutData)).catch(()=>{});
  try{hkSetLoaded('soul',true);hkSetLoaded('bout',true);}catch(e){}
}
function pianoSetLoaded(silent){
  if(!pianoData||!pianoData.giorni)return;
  const range=(pianoData.giorni[0]?.label||'')+' – '+(pianoData.giorni[pianoData.giorni.length-1]?.label||'');
  ucSetState('piano','loaded',range,silent);
  const dateEl=document.getElementById('pianoLoadedDate');if(dateEl)dateEl.textContent='Settimana: '+range;
  const btn=document.getElementById('btnPianoReload');if(btn)btn.style.display='block';
  // Box sempre cliccabile: ricaricare il piano non richiede prima "Rimuovi" (v. pul/bkf).
  const li=document.getElementById('pianoLoadedInfo');if(li)li.classList.add('visible');
  // Conteggi pulizie/HKP derivati dal Piano (sostituiscono 3 upload PDF)
  try{hkpDeriveFromPiano();}catch(e){}
  // Se si sta già guardando un giorno specifico (pianoNavIdx già impostato), resta lì
  // dopo il nuovo caricamento invece di tornare a oggi — coerente col comportamento
  // già usato altrove (vedi il polling overview) quando il piano si ricarica.
  try{if(pianoNavIdx===null)pianoOvInit();else pianoNavRender(pianoNavIdx);}catch(e){}
}
function resetPianoData(){
  pianoData=null;
  localStorage.removeItem('qm_piano');
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_piano',value:null})}).catch(()=>{});
  ucSetState('piano','','Non caricato');
  const box=document.getElementById('pianoUploadBox');if(box)box.style.display='';
  const li=document.getElementById('pianoLoadedInfo');if(li)li.classList.remove('visible');
  const btn=document.getElementById('btnPianoReload');if(btn)btn.style.display='none';
  document.getElementById('pianoFileInput').value='';
}
// §§ BKF — GRUPPI, NOTE & GRAFICI (bkfLoadOps, bkfAddGroup, bkfRenderGroups, bkfRenderChart, updateKpiFromBkf)
let bkfGroups=[];
let bkfNotes={};
function bkfLoadOps(){
  try{const g=localStorage.getItem('qm_bkfGroups');if(g)bkfGroups=JSON.parse(g);}catch(e){}
  try{const n=localStorage.getItem('qm_bkfNotes');if(n)bkfNotes=JSON.parse(n);}catch(e){}
  bkfRenderGroups();
  bkfRenderNotes();
}
function bkfSaveOps(){
  try{localStorage.setItem('qm_bkfGroups',JSON.stringify(bkfGroups));}catch(e){}
  try{localStorage.setItem('qm_bkfNotes',JSON.stringify(bkfNotes));}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_bkfGroups',value:JSON.stringify(bkfGroups)})}).catch(()=>{});}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_bkfNotes',value:JSON.stringify(bkfNotes)})}).catch(()=>{});}catch(e){}
}
function bkfAddGroup(){
  const today=new Date();
  const dd=String(today.getDate()).padStart(2,'0');
  const mm=String(today.getMonth()+1).padStart(2,'0');
  const iso=today.getFullYear()+'-'+mm+'-'+dd;
  document.getElementById('bkfGrpArrivo').value=iso;
  document.getElementById('bkfGrpPartenza').value=iso;
  document.getElementById('bkfGrpNome').value='';
  document.getElementById('bkfGrpPax').value='';
  document.getElementById('bkfGrpOrario').value='';
  document.getElementById('bkfGrpNote').value='';
  document.getElementById('bkfGroupModal').style.display='flex';
}
function bkfSaveGroup(){
  const nome=document.getElementById('bkfGrpNome').value.trim();
  const arrivo=document.getElementById('bkfGrpArrivo').value;
  const partenza=document.getElementById('bkfGrpPartenza').value;
  const pax=parseInt(document.getElementById('bkfGrpPax').value)||0;
  const orario=document.getElementById('bkfGrpOrario').value.trim();
  const note=document.getElementById('bkfGrpNote').value.trim();
  if(!nome||!arrivo||!partenza||!pax){cqAvviso('Compila almeno nome, date e numero persone.');return;}
  bkfGroups.push({id:Date.now(),nome,arrivo,partenza,pax,orario,note});
  bkfGroups.sort((a,b)=>a.arrivo.localeCompare(b.arrivo));
  document.getElementById('bkfGroupModal').style.display='none';
  bkfSaveOps();
  bkfRenderGroups();
}
function bkfDeleteGroup(id){
  bkfGroups=bkfGroups.filter(g=>g.id!==id);
  bkfSaveOps();
  bkfRenderGroups();
}
function bkfRenderGroups(){
  const el=document.getElementById('bkfGroupsList');
  if(!el)return;
  if(!bkfGroups.length){
    const msg='<div style="padding:16px;text-align:center;color:var(--text-dim);font-size:var(--fs-xs);">Nessun gruppo aggiunto</div>';
    el.innerHTML=msg;
    const elAR=document.getElementById('bkfGroupsListAR');if(elAR)elAR.innerHTML=msg;
    return;
  }
  const today=new Date();today.setHours(0,0,0,0);
  let html='';
  bkfGroups.forEach((g,i)=>{
    // Supporta sia vecchio formato (data) che nuovo (arrivo/partenza)
    const arrivoDate=new Date(g.arrivo||g.data);arrivoDate.setHours(0,0,0,0);
    const partenzaDate=new Date(g.partenza||g.arrivo||g.data);partenzaDate.setHours(0,0,0,0);
    const isActive=today>=arrivoDate&&today<=partenzaDate;
    const isPast=partenzaDate<today;
    const isFuture=arrivoDate>today;
    const fmt=d=>{if(!d)return'—';const p=d.split('-');return p[2]+'/'+p[1];};
    const opacity=isPast?'opacity:.5;':'';
    const statusBadge=isActive
      ?'<span style="background:var(--accent);color:#fff;border-radius:4px;padding:1px 6px;font-size:9px;font-weight:700;">IN CASA</span>'
      :isFuture
      ?`<span style="background:#e8eef8;color:var(--accent);border-radius:4px;padding:1px 6px;font-size:9px;">arr. ${fmt(g.arrivo||g.data)}</span>`
      :'<span style="background:var(--surface2);color:var(--text-dim);border-radius:4px;padding:1px 6px;font-size:9px;">partito</span>';
    html+=`<div style="display:flex;align-items:start;gap:10px;padding:10px 14px;${i>0?'border-top:1px solid var(--border-light);':''}${opacity}">
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
          <span style="font-size:var(--fs-sm);font-weight:600;color:var(--text);">${g.nome}</span>
          ${statusBadge}
        </div>
        <div style="display:flex;gap:12px;font-size:var(--fs-xxs);color:var(--text-dim);flex-wrap:wrap;margin-bottom:3px;">
          <span>📅 ${fmt(g.arrivo||g.data)} → ${fmt(g.partenza||g.arrivo||g.data)}</span>
          <span style="font-weight:600;color:var(--text);">👥 ${g.pax} persone</span>
          ${g.orario?`<span>🕐 ${g.orario}</span>`:''}
        </div>
        ${g.note?`<div style="font-size:var(--fs-xxs);color:var(--text-muted);font-style:italic;">${g.note}</div>`:''}
      </div>
      <button onclick="bkfDeleteGroup(${g.id})" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:14px;padding:2px 4px;flex-shrink:0;">✕</button>
    </div>`;
  });
  el.innerHTML=html;
  const elAR=document.getElementById('bkfGroupsListAR');if(elAR)elAR.innerHTML=html;
}
function bkfRenderNotes(){
  const el=document.getElementById('bkfNotesList');
  if(!el)return;
  if(!bkfData||!bkfData.length){
    const msg='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Carica il report pasti per aggiungere note per giorno</div>';
    el.innerHTML=msg;
    const elAR=document.getElementById('bkfNotesListAR');if(elAR)elAR.innerHTML=msg;
    return;
  }
  let html='';
  bkfData.forEach((d,i)=>{
    const note=bkfNotes[d.label]||'';
    html+=`<div style="${i>0?'border-top:1px solid var(--border-light);':''}padding:8px 0;">
      <div style="font-size:var(--fs-xxs);font-weight:600;color:var(--text);margin-bottom:4px;">${d.label}</div>
      <textarea onchange="bkfSaveNote('${d.label}',this.value)" style="width:100%;padding:6px 8px;font-size:var(--fs-xxs);border:1px solid var(--border-light);border-radius:5px;background:var(--surface2);color:var(--text);resize:none;height:48px;font-family:inherit;" placeholder="Note per la responsabile...">${note}</textarea>
    </div>`;
  });
  el.innerHTML=html;
  const elAR=document.getElementById('bkfNotesListAR');if(elAR)elAR.innerHTML=html;
}
function bkfSaveNote(label,value){
  if(value.trim())bkfNotes[label]=value.trim();
  else delete bkfNotes[label];
  bkfSaveOps();
}
// Grafico identico a quello di Overview (renderOvBkfChart): barre coperti + linea
// tratteggiata Room Only + legenda, SVG a piena altezza/larghezza della card (flex:1).
function _bkfChartRender(elId,pts,activeIdx,emptyMsg,legendBar,legendLine){
  legendBar=legendBar||'Coperti';legendLine=legendLine||'Room Only';
  const el=document.getElementById(elId);if(!el)return;
  if(!pts||!pts.length){el.innerHTML=`<div style="margin:auto;color:var(--text-dim);font-size:var(--fs-xs);">${emptyMsg}</div>`;return;}
  const W=600,H=220,PL0=34,PR0=14,PT=26,PB=28;
  const plotW0=W-PL0-PR0,plotH=H-PT-PB;
  const YMAX=Math.max(30,...pts.map(p=>p.v))+10;
  const barW=Math.min(40,plotW0/pts.length*0.5);
  const PL=PL0+barW/2,PR=PR0+barW/2;
  const plotW=W-PL-PR;
  const sx=i=>PL+i/(pts.length-1||1)*plotW;
  const sy=v=>PT+plotH-(v/YMAX)*plotH;
  let svg=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="width:100%;flex:1;min-height:0;display:block;">`;
  for(let v=0;v<=YMAX;v+=Math.ceil(YMAX/4/10)*10){
    const y=sy(v);
    svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border-light)" stroke-width="1"/>`;
    svg+=`<text x="${PL-4}" y="${y+4}" font-size="11" fill="var(--text-dim)" text-anchor="end">${v}</text>`;
  }
  pts.forEach((p,i)=>{
    const x=sx(i),y=sy(p.v),isActive=i===activeIdx;
    svg+=`<rect x="${x-barW/2}" y="${y}" width="${barW}" height="${sy(0)-y}" rx="4" fill="${isActive?'var(--accent)':'var(--accent-bg)'}" stroke="var(--accent)" stroke-width="1.5"/>`;
  });
  const roLine='M'+pts.map((p,i)=>`${sx(i)},${sy(p.nc)}`).join('L');
  svg+=`<path d="${roLine}" fill="none" stroke="var(--red)" stroke-width="2" stroke-dasharray="3 3"/>`;
  pts.forEach((p,i)=>{svg+=`<circle cx="${sx(i)}" cy="${sy(p.nc)}" r="3" fill="var(--red)"/>`;});
  pts.forEach((p,i)=>{
    const x=sx(i),y=sy(p.v),isActive=i===activeIdx;
    if(isActive)svg+=`<text x="${x}" y="${y+16}" font-size="13" fill="#fff" text-anchor="middle" font-weight="800">${p.v}</text>`;
    else svg+=`<text x="${x}" y="${y-6}" font-size="11.5" fill="var(--accent)" text-anchor="middle" font-weight="700">${p.v}</text>`;
    svg+=`<text x="${x}" y="${H-8}" font-size="11" fill="${isActive?'var(--accent)':'var(--text-dim)'}" font-weight="${isActive?'700':'400'}" text-anchor="middle">${p.label}</text>`;
  });
  svg+='</svg>';
  el.innerHTML=`${svg}<div style="display:flex;gap:14px;flex-shrink:0;margin-top:2px;">
    <span style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-dim);"><span style="width:10px;height:10px;background:var(--accent);border-radius:2px;display:inline-block;"></span>${legendBar}</span>
    <span style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-dim);"><span style="width:10px;height:2px;background:var(--red);display:inline-block;"></span>${legendLine}</span>
  </div>`;
}
function bkfRenderChart(){
  const pts=(bkfChartData||[]).map(r=>({label:(r.d||'—').split(' ')[0],v:(parseInt(r.r)||0)+(parseInt(r.b)||0),nc:parseInt(r.r)||0}));
  _bkfChartRender('bkfChartBody',pts,pts.length-1,'Carica il file BKF Soul per visualizzare il grafico');
}
function bkfRenderChartAR(){
  const pts=(bkfARChartData||[]).map(r=>({label:(r.d||'—').split(' ')[0],v:(parseInt(r.r)||0)+(parseInt(r.b)||0),nc:parseInt(r.r)||0}));
  _bkfChartRender('bkfChartBodyAR',pts,pts.length-1,'Carica il file BKF Galleria per visualizzare il grafico');
}
function updateKpiFromBkf(d){
  // Room Only
  const noColEl=document.getElementById('kpi-bkf-nocol');
  const noColDelta=document.getElementById('kpi-bkf-nocol-delta');
  const noColSub=document.getElementById('kpi-bkf-nocol-sub');
  if(noColEl)noColEl.textContent=d.noCol;
  if(noColDelta){noColDelta.textContent=d.noCol>0?'Ospiti Room Only':'Nessun Room Only';noColDelta.className='kpi-delta'+(d.noCol>0?' down':' up');noColDelta.style.color='';}
  if(noColSub)noColSub.textContent=d.label;
  // 3 giorni incolonnati nella card
  const days=bkfData?bkfData.slice(bkfActiveDay,bkfActiveDay+3):[d];
  const container=document.getElementById('kpi-bkf-multiday');
  if(!container)return;
  let html=`<div style="display:grid;grid-template-columns:repeat(${days.length},1fr);gap:8px;margin-top:4px;">`;
  days.forEach((nd,i)=>{
    const nc=nd.adulti+nd.bambini;
    html+=`<div>
      <div class="kpi-value" style="font-size:22px;">${nc}</div>
      <div class="kpi-delta" style="color:var(--text-dim);">${nd.adulti}a · ${nd.bambini}b</div>
      <div class="kpi-sub">${nd.label}</div>
    </div>`;
  });
  html+='</div>';
  container.innerHTML=html;
  // Nasconde elementi legacy
  ['kpi-bkf-tot','kpi-bkf-delta','kpi-bkf-sub'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.style.display='none';
  });
  const previewEl=document.getElementById('kpi-bkf-preview');
  if(previewEl)previewEl.style.display='none';
}
function resetBkf(){
  bkfData=null;bkfActiveDay=0;
  const bkfBox=document.getElementById('bkfUploadBox');if(bkfBox)bkfBox.style.display='';
  document.getElementById('bkfLoadedInfo').classList.remove('visible');
  document.getElementById('bkfStatGrid').style.display='none';
  document.getElementById('bkfWeekNav').innerHTML='';
  document.getElementById('btnBkfReload').style.display='none';
  document.getElementById('bkfFileInput').value='';
  ucSetState('bkf','','Non caricato');
  ['kpi-bkf-tot','kpi-bkf-nocol'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='—';});
  ['kpi-bkf-delta','kpi-bkf-nocol-delta'].forEach(id=>{const el=document.getElementById(id);if(el){el.textContent='Carica report pasti';el.className='kpi-delta';el.style.color='var(--text-dim)';}});
  ['kpi-bkf-sub','kpi-bkf-nocol-sub'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='';});
  const statsEl=document.getElementById('ov-bkf-stats');if(statsEl){statsEl.style.display='none';statsEl.innerHTML='';}
  LS.del('bkfData');
}
function bkfShowStatus(msg){
  if(msg)ucSetState('bkf','loading',msg);
  else ucSetState('bkf','','Non caricato');
}
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const ROOM_CODES=['STD','SUP','DLX','DEL','JS','JR','SUITE','TRP','TPL','TRI','DBL','SGL','DUS','DEP','DP','PC','AS','BB','HB','FB','RO','AI','MP'];
const tratMap={BB:'BB',HB:'HB – Mezza pensione',FB:'FB – Pensione completa',RO:'RO – Solo pernottamento',AI:'AI – All inclusive',MP:'MP – Mezza pensione'};
let guestsData=[];
const rcUploadZone=document.getElementById('rcUploadZone'),rcFileInput=document.getElementById('rcFileInput');
rcUploadZone.addEventListener('click',()=>rcFileInput.click());
rcUploadZone.addEventListener('dragover',e=>{e.preventDefault();rcUploadZone.classList.add('dragover');});
rcUploadZone.addEventListener('dragleave',()=>rcUploadZone.classList.remove('dragover'));
rcUploadZone.addEventListener('drop',e=>{e.preventDefault();rcUploadZone.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f&&f.type==='application/pdf')handleRCFile(f);else rcShowError('Carica un file PDF.');});
rcFileInput.addEventListener('change',e=>{if(e.target.files[0])handleRCFile(e.target.files[0]);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){rcCloseModal();closePrintDialog();}});
// Deriva le registration card dagli arrivi correnti (arriviData) — arrivi con check-in
// oggi, esclusi Principe e Mastrangelo che non ne hanno bisogno.
//
// Estratta da handleArriviFile perché serve IDENTICA al caricamento del file unico
// Prenotazioni (prenHandlePdf): quello scriveva qm_arriviData ma non ridisegnava le card,
// che restavano quindi ferme al giorno precedente pur avendo caricato il PDF del giorno.
//
// sameDayAsPrev: confronta col set precedente per evidenziare nuove prenotazioni e camere
// spostate. Ha senso solo se il caricamento precedente era dello stesso giorno, altrimenti
// si confronterebbe con gli ospiti di ieri.
//
// Ritorna 'ok' · 'nessuna' (arrivi presenti, ma tutti Principe/Mastrangelo) · 'vuoto'
// (nessun arrivo valido: le card NON sono state aggiornate).
function rcAggiornaDaArrivi(sameDayAsPrev){
    // Claude ora classifica già in "arrivi" tutti gli ospiti con check-in oggi,
    // anche se nel PDF erano già in sezione "In Casa"
    if(!arriviData||!arriviData.arrivi||!arriviData.arrivi.length){return'vuoto';}
    const year=arriviData.data?parseInt(arriviData.data.split('/').pop())||new Date().getFullYear():new Date().getFullYear();
    const toGuest=a=>({
      camera:a.camera,
      nome:_psNomeUmano(a.ospite||''),
      pax:parseInt(a.pax)||1,
      trattamento:a.trattamento||'BB',
      checkin:a.arrivo?rcFmtDate(a.arrivo,year):'',
      checkout:a.partenza?rcFmtDate(a.partenza,year):'',
      origine:a.origine||'',
      struttura:a.struttura||'',
      tipoCamera:a.tipo_camera||''
    });
    // Principe/Umberto e Mastrangelo non necessitano di registration card
    const _rcExclStruct=new Set(['PR','MS']);
    let guests=(arriviData.arrivi||[]).filter(a=>!_rcExclStruct.has((a.struttura||'').toUpperCase())).map(toGuest).filter(g=>g.nome&&g.nome.trim());
    // Segna nuove prenotazioni e camere spostate rispetto al set precedente di RC,
    // per evidenziarle e permettere di stampare solo quelle — solo se il caricamento
    // precedente era per lo stesso giorno, altrimenti confronteremmo con ieri
    if(sameDayAsPrev){
      // Chiave per nome tollerante a ordine parole/accenti/maiuscole: l'AI può leggere
      // lo stesso nome in modo leggermente diverso tra un upload e l'altro (es. "Priva Yeela"
      // vs "Yeela Priva") — confrontando l'insieme ordinato delle parole invece della stringa
      // esatta si evita di segnare come "nuova prenotazione" chi ha solo cambiato camera.
      const _rcNormName=s=>String(s||'').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .split(/\s+/).filter(w=>w.length>1).sort().join(' ');
      const _prevGuests=Array.isArray(guestsData)?guestsData:[];
      const _prevByName={};
      _prevGuests.forEach(g=>{const k=_rcNormName(g.nome);if(k)_prevByName[k]=g;});
      guests=guests.map(g=>{
        const prev=_prevByName[_rcNormName(g.nome)];
        if(!prev)return{...g,isNew:true};
        if(String(prev.camera||'').trim()!==String(g.camera||'').trim())return{...g,roomChanged:true,prevCamera:prev.camera};
        return g;
      });
    }
    if(!guests.length){
      // Se gli arrivi grezzi c'erano ma erano tutti Principe/Mastrangelo, non è un errore di parsing
      const _hadRawArrivi=arriviData.arrivi.some(a=>(a.ospite||'').trim());
      return _hadRawArrivi?'nessuna':'vuoto';
    }
    document.getElementById('rcUploadZone').style.display='none';
    document.getElementById('rcProcessing').style.display='none';
    rcRenderCards(guests);
    return'ok';
}

// Card di un giorno diverso dal documento arrivi? Le rigenera, senza aspettare un nuovo
// caricamento del PDF.
//
// qm_rcGuests e qm_arriviData sono due chiavi INDIPENDENTI: la seconda può essere
// aggiornata senza la prima — da un altro PC, dal polling che la rilegge da KV, o da una
// versione dell'app in cui il caricamento non ridisegnava le card. Il sintomo è sempre lo
// stesso e non si nota guardando: card perfettamente plausibili, ma dell'ospite sbagliato.
//
// Due condizioni, entrambe necessarie:
//  1. il documento arrivi è di OGGI — un documento vecchio non deve MAI generare card,
//     meglio lasciare quelle che ci sono (che almeno la riga sorgente data e attribuisce);
//  2. nessuna card ha il check-in di quel giorno. Ne basta una che combaci per considerarle
//     allineate: qualcuna può essere stata aggiunta a mano.
function rcRiallineaConArrivi(){
  if(!arriviData||!Array.isArray(arriviData.arrivi)||!arriviData.arrivi.length)return false;
  if(arriviData.data!==rcTodayStr())return false;
  const cards=Array.isArray(guestsData)?guestsData:[];
  if(cards.length&&cards.some(g=>g.checkin===arriviData.data))return false;
  const esito=rcAggiornaDaArrivi(false);
  if(esito==='ok')console.log('[RC] card riallineate al documento del '+arriviData.data);
  return esito==='ok';
}

// §§ REGISTRATION CARDS — RC (handleRCFile, rcParseGuests, rcRenderCards)
async function handleRCFile(file){rcShowProc('Lettura del PDF...');rcHideError();try{const ab=await file.arrayBuffer();const pdfData=new Uint8Array(ab);rcShowProc('Estrazione testo...');const pdfDoc=await pdfjsLib.getDocument({data:pdfData}).promise;let fullText='';for(let i=1;i<=pdfDoc.numPages;i++){const page=await pdfDoc.getPage(i);const tc=await page.getTextContent();fullText+=tc.items.map(x=>x.str).join(' ')+'\n';}const guests=rcParseGuests(fullText);rcHideProc();if(!guests.length){rcShowProc('Analisi AI in corso...');try{await handleArriviFile(file);}finally{rcHideProc();}}else{rcRenderCards(guests);}}catch(err){rcHideProc();rcShowError('Errore: '+err.message);}}
function rcCleanName(raw){let name=raw.trim().replace(/\s*\([^)]+\)/g,'').trim();const cp=new RegExp('^('+ROOM_CODES.join('|')+')\\s+','i');let prev='';while(prev!==name){prev=name;name=name.replace(cp,'').trim();}return name;}
function rcParseGuests(text){let year=new Date().getFullYear();const ym=text.match(/arrivi\s*[-–]\s*\d{1,2}\/\d{1,2}\/(\d{4})/i);if(ym)year=parseInt(ym[1]);const norm=text.replace(/\s+/g,' ').trim();const guests=[];const pat=/(\b(?:Art\s*\d+|\d{2,3}|AS_LIB|[A-Z]{2,8}_?[A-Z]*\d*)\b)\s*\/\s*(?:[A-Z_\s]{2,20}?)\s+([A-ZÀÈÉÌÒÙ][A-Za-zÀ-ÿ\s']+?(?:\s+\([^)]+\))?)\s+(\d)\s+(BB|HB|FB|RO|AI|MP)\s+(\d{1,2}\/\d{1,2})\s*[-–]\s*(\d{1,2}\/\d{1,2})/gi;let m;while((m=pat.exec(norm))!==null){const nome=rcCleanName(m[2]);if(!nome||nome.length<2)continue;guests.push({camera:m[1].trim(),nome,pax:parseInt(m[3]),trattamento:m[4].trim(),checkin:rcFmtDate(m[5],year),checkout:rcFmtDate(m[6],year)});}return guests;}
function rcFmtDate(raw,year){const p=raw.split('/');return p.length===2?String(p[0]).padStart(2,'0')+'/'+String(p[1]).padStart(2,'0')+'/'+year:raw;}
function rcCalcNights(ci,co){try{const[di,mi,yi]=ci.split('/').map(Number),[d2,m2,y2]=co.split('/').map(Number);const n=Math.round((new Date(y2,m2-1,d2)-new Date(yi,mi-1,di))/86400000);return n>0?n:'—';}catch{return '—';}}
function rcTodayStr(){const d=new Date();return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
function ccNumberHTML(){const g=[0,1,2,3].map(()=>`<div class="cc-group">${[0,1,2,3].map(()=>`<span class="cc-digit"></span>`).join('')}</div>`);return`<div class="cc-num-wrap">${g[0]}<span class="cc-dash">–</span>${g[1]}<span class="cc-dash">–</span>${g[2]}<span class="cc-dash">–</span>${g[3]}</div>`;}
function ccExpiryHTML(){return`<div class="cc-exp-wrap"><span class="cc-exp-digit"></span><span class="cc-exp-digit"></span><span class="cc-slash">/</span><span class="cc-exp-digit"></span><span class="cc-exp-digit"></span></div>`;}
const RC_ROOM_TYPES={STD:'Standard',SUP:'Superior',DLX:'Deluxe',JS:'Junior Suite',SUI:'Suite',TRP:'Triple','DLX TP':'Triple Deluxe','TP DLX':'Triple Deluxe','TRP DLX':'Triple Deluxe'};
function rcRoomTypeLabel(code){
  if(!code)return'';
  const c=String(code).trim().toUpperCase().replace(/\s+/g,' ');
  return RC_ROOM_TYPES[c]||code;
}
const RC_HOTELS={
  SA:{name:'SoulArt Hotel',logo:'img/logo-soulart-round.png'},
  BH:{name:'Boutique Hotel'},
  SL:{name:'San Liborio'},
  AR:{name:'Art Resort'},
  SB:{name:'Santa Brigida'}
};
function rcCardHTML(g){const nights=rcCalcNights(g.checkin,g.checkout),trat=tratMap[g.trattamento]||g.trattamento;
  const hotel=RC_HOTELS[(g.struttura||'').toUpperCase()]||{name:''};
  const logoImg=hotel.logo?`<img class="pc-logo" src="${hotel.logo}" alt="${hotel.name}">`:'';
  const roomType=rcRoomTypeLabel(g.tipoCamera);
  return`<div class="pc-header"><div class="pc-hotel-wrap">${logoImg}<div><div class="pc-hotel-name">${hotel.name}</div><div class="pc-sub">Registration Card · Check-in ${rcTodayStr()}</div></div></div><div class="pc-room-box"><div class="pc-rlabel">Camera / Room</div><div class="pc-room">${g.camera}</div></div></div><div class="pc-body"><div class="pc-name">${g.nome}</div><div class="pc-dates"><div class="pc-dc"><div class="pc-dl">Arrivo<br>Arrival</div><div class="pc-dv">${g.checkin||'—'}</div></div><div class="pc-dc"><div class="pc-dl">Partenza<br>Departure</div><div class="pc-dv">${g.checkout||'—'}</div></div><div class="pc-dc"><div class="pc-dl">Notti<br>Nights</div><div class="pc-dv">${nights}</div></div><div class="pc-dc"><div class="pc-dl">Ospiti<br>Guests</div><div class="pc-dv">${g.pax}</div></div><div class="pc-dc"><div class="pc-dl">Tipologia<br>Room type</div><div class="pc-dv">${roomType||'—'}</div></div><div class="pc-dc"><div class="pc-dl">Trattamento<br>Board</div><div class="pc-dv">${trat}</div></div></div><div class="pc-bilingual"><div class="pc-lc"><div class="pc-ltag">IT — Garanzia</div><div class="pc-ltitle">Carta di credito a garanzia</div><div class="pc-ltext">In conformità alla nostra policy, viene richiesta una carta di credito a garanzia per eventuali extra, danni alla camera o servizi non inclusi nella prenotazione. Nessun importo verrà addebitato senza preventiva comunicazione e consenso dell'ospite.</div></div><div class="pc-lc"><div class="pc-ltag">EN — Guarantee</div><div class="pc-ltitle">Credit card guarantee</div><div class="pc-ltext">In accordance with our policy, a credit card is required as a guarantee for any extras, room damages or services not included in the reservation. No amount will be charged without prior notice and the guest's explicit consent.</div></div></div><div class="pc-cc"><div class="pc-cc-head"><span class="pc-cc-hlabel">Dati carta / Card details</span><div class="pc-cc-types"><span class="pc-cc-type">☐ Visa</span><span class="pc-cc-type">☐ Mastercard</span><span class="pc-cc-type">☐ Amex</span><span class="pc-cc-type">☐ Other</span></div></div><div class="pc-cc-body"><div class="pc-cc-row"><div><div class="pc-fl">Numero carta / Card number</div>${ccNumberHTML()}</div><div><div class="pc-fl">Scadenza / Expiry (MM/AA)</div>${ccExpiryHTML()}</div></div><div><div class="pc-fl">Titolare / Cardholder name</div><div class="pc-holder"></div></div></div></div><div class="pc-privacy"><div class="pc-privacy-head"><span class="pc-privacy-label">Informativa Privacy — Privacy Notice (GDPR Reg. UE 2016/679)</span></div><div class="pc-privacy-body"><div class="pc-pc"><b>IT —</b> I dati personali raccolti con questa scheda saranno trattati dalla struttura ricettiva in qualità di Titolare del trattamento, ai sensi del Reg. UE 2016/679 (GDPR), esclusivamente per finalità di gestione del soggiorno, adempimenti fiscali e di pubblica sicurezza (comunicazione alle autorità ai sensi del T.U.L.P.S.). I dati non saranno ceduti a terzi per finalità commerciali. L'ospite ha diritto di accesso, rettifica, cancellazione e opposizione al trattamento.</div><div class="pc-pc"><b>EN —</b> Personal data collected through this form will be processed by the accommodation facility as Data Controller, pursuant to EU Regulation 2016/679 (GDPR), solely for stay management, fiscal obligations and public security requirements (communication to authorities pursuant to T.U.L.P.S.). Data will not be shared with third parties for commercial purposes. Guests have the right to access, rectify, erase and object to the processing of their personal data.</div></div></div><div class="pc-sign"><div class="pc-sf"><div class="pc-slabel">Firma ospite / Guest signature</div><div class="pc-sline"></div></div><div class="pc-sf"><div class="pc-slabel">Data / Date &nbsp;${rcTodayStr()}</div><div class="pc-sline"></div></div></div></div>`;}
const PRINT_CSS=`*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;margin:0;}@page{margin:0;size:A4;}.page{width:210mm;min-height:297mm;padding:11mm 13mm;page-break-after:always;page-break-inside:avoid;font-size:10pt;color:#1A1916;background:#fff;display:flex;flex-direction:column;}.page:last-child{page-break-after:avoid;}.pc-header{background:#1A1916!important;padding:15px 22px;border-radius:7px 7px 0 0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}.pc-hotel-wrap{display:flex;align-items:center;gap:14px;}.pc-logo{width:52px;height:52px;object-fit:contain;flex-shrink:0;}.pc-hotel-name{font-size:15pt;font-weight:600;color:#fff!important;line-height:1.2;margin-bottom:4px;}.pc-sub{font-size:8pt;text-transform:uppercase;color:#9A9890!important;margin-top:0;letter-spacing:.04em;}.pc-room-box{text-align:center;}.pc-rlabel{font-size:7.5pt;text-transform:uppercase;color:#9A9890!important;margin-bottom:12px;}.pc-room{font-size:28pt;font-weight:600;color:#fff!important;line-height:1;text-align:center;}.pc-body{border:1px solid #E0DED8;border-top:none;border-radius:0 0 7px 7px;padding:16px 20px;flex:1;display:flex;flex-direction:column;}.pc-name{font-size:24pt;font-weight:600;color:#1A1916;padding-bottom:10px;border-bottom:2px solid #1A1916;margin-bottom:18px;flex-shrink:0;}.pc-dates{display:grid;grid-template-columns:repeat(6,1fr);border:1px solid #E0DED8;border-radius:5px;overflow:hidden;margin-bottom:18px;flex-shrink:0;}.pc-dc{padding:11px 10px;border-right:1px solid #E0DED8;}.pc-dc:last-child{border-right:none;}.pc-dl{font-size:7pt;text-transform:uppercase;color:#6A6860;margin-bottom:5px;line-height:1.4;}.pc-dv{font-size:12.5pt;font-weight:600;color:#1A1916;}.pc-bilingual{display:grid;grid-template-columns:1fr 1fr;border:1px solid #E0DED8;border-radius:5px;overflow:hidden;margin-bottom:18px;flex-shrink:0;}.pc-lc{padding:13px 15px;}.pc-lc:first-child{border-right:1px solid #E0DED8;}.pc-ltag{font-size:7pt;font-weight:600;text-transform:uppercase;color:#1A1916;background:#F0EFEC!important;display:inline-block;padding:2px 8px;border-radius:3px;margin-bottom:6px;}.pc-ltitle{font-size:10.5pt;font-weight:600;margin-bottom:7px;}.pc-ltext{font-size:9pt;color:#6A6860;line-height:1.65;}.pc-cc{border:1px solid #E0DED8;border-radius:5px;overflow:hidden;margin-bottom:18px;flex-shrink:0;}.pc-cc-head{background:#F0EFEC!important;padding:9px 15px;border-bottom:1px solid #E0DED8;display:flex;align-items:center;justify-content:space-between;}.pc-cc-hlabel{font-size:9pt;font-weight:600;text-transform:uppercase;color:#1A1916;}.pc-cc-types{display:flex;gap:7px;}.pc-cc-type{font-size:9pt;border:1px solid #E0DED8;border-radius:4px;padding:3px 11px;background:#fff!important;color:#1A1916;}.pc-cc-body{padding:14px 18px;}.pc-cc-row{display:flex;flex-direction:column;gap:12px;margin-bottom:14px;}.pc-fl{font-size:7.5pt;text-transform:uppercase;color:#6A6860;margin-bottom:7px;}.cc-num-wrap{display:flex;align-items:center;gap:6px;}.cc-group{display:flex;gap:3px;}.cc-digit{width:26px;height:26px;border:1px solid #E0DED8;border-radius:4px;background:#fff!important;display:inline-block;}.cc-dash{font-size:14pt;font-weight:600;color:#1A1916;line-height:26px;}.cc-exp-wrap{display:flex;align-items:center;gap:3px;}.cc-exp-digit{width:26px;height:26px;border:1px solid #E0DED8;border-radius:4px;background:#fff!important;display:inline-block;}.cc-slash{font-size:16pt;font-weight:600;color:#1A1916;line-height:26px;padding:0 3px;}.pc-holder{width:100%;height:30px;border:1px solid #E0DED8;border-radius:4px;display:block;background:#fff!important;}.pc-privacy{border:1px solid #E0DED8;border-radius:5px;overflow:hidden;margin-bottom:18px;flex-shrink:0;}.pc-privacy-head{background:#F0EFEC!important;padding:8px 15px;border-bottom:1px solid #E0DED8;}.pc-privacy-label{font-size:8.5pt;font-weight:600;text-transform:uppercase;color:#1A1916;}.pc-privacy-body{display:grid;grid-template-columns:1fr 1fr;}.pc-pc{padding:10px 14px;font-size:8pt;color:#6A6860;line-height:1.65;}.pc-pc:first-child{border-right:1px solid #E0DED8;}.pc-pc b{color:#1A1916;}.pc-sign{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:flex-end;padding-top:10px;}.pc-sf{display:flex;flex-direction:column;justify-content:flex-end;}.pc-slabel{font-size:8pt;text-transform:uppercase;color:#6A6860;margin-bottom:48px;line-height:1.4;}.pc-sline{border-bottom:2px solid #1A1916;}`;
function preparePrint(idx){const cards=idx===null?guestsData:[guestsData[idx]];rcOpenPrintDialog(cards);}
function preparePrintIdxs(idxs){const cards=idxs.map(i=>guestsData[i]);rcOpenPrintDialog(cards);}
function rcOpenPrintDialog(cards){const pages=cards.map(g=>`<div class="page">${rcCardHTML(g)}</div>`).join('');const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PRINT_CSS}</style></head><body>${pages}</body></html>`;document.getElementById('printIframe').srcdoc=html;const n=cards.length;document.getElementById('pdTitle').textContent=n===1?`Camera ${cards[0].camera} — ${cards[0].nome}`:`${n} registration card${n>1?'s':''} pronte`;document.getElementById('printDialog').classList.add('open');}
function executePrint(){const iframe=document.getElementById('printIframe');iframe.contentWindow.focus();iframe.contentWindow.print();}
function closePrintDialog(){document.getElementById('printDialog').classList.remove('open');}
let _rcSelected=new Set();
function rcRenderCards(guests){
  // Le card evidenziate (nuove/spostate) vanno in cima, per non doverle cercare nella griglia
  const sorted=[...guests].map((g,i)=>({g,i})).sort((a,b)=>{
    const fa=a.g.isNew||a.g.roomChanged?0:1,fb=b.g.isNew||b.g.roomChanged?0:1;
    return fa-fb||a.i-b.i;
  }).map(o=>o.g);
  guestsData=sorted;
  _rcSelected=new Set();
  document.getElementById('rcCountBadge').textContent=sorted.length+(sorted.length===1?' ospite':' ospiti');
  const grid=document.getElementById('rcCardGrid');
  grid.innerHTML='';
  sorted.forEach((g,i)=>grid.appendChild(rcBuildPreview(g,i)));
  document.getElementById('rcResults').style.display='block';
  // Bottone "stampa solo evidenziate" — visibile solo se ci sono nuove prenotazioni o camere spostate
  const hiCount=sorted.filter(g=>g.isNew||g.roomChanged).length;
  const hiBtn=document.getElementById('rcPrintHighlightBtn');
  if(hiBtn){
    hiBtn.style.display=hiCount?'inline-flex':'none';
    hiBtn.textContent='🔴 Stampa evidenziate ('+hiCount+')';
  }
  rcRenderSourceLine();
  rcUpdateSelectedBtn();
  // Salva per ripristino
  try{localStorage.setItem('qm_rcGuests',JSON.stringify(sorted));}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_rcGuests',value:JSON.stringify(sorted)})}).catch(()=>{});}catch(e){}
}
// Riga sorgente dati sopra la coda di stampa: da quale documento vengono le card,
// quando è stato caricato, quanti arrivi contiene — non rende obbligatorio ricaricare.
function rcRenderSourceLine(){
  const el=document.getElementById('rcSourceLine');
  if(!el)return;
  if(!arriviData||!arriviData.arrivi||!arriviData.arrivi.length){el.style.display='none';return;}
  // Col file unico la fonte è l'export Prenotazioni, non più il Riepilogo Reception:
  // nome, timestamp e slot da riaprire cambiano di conseguenza (vedi PREN_UNICO).
  const unico=(typeof PREN_UNICO!=='undefined'&&PREN_UNICO);
  const doc=unico?'Prenotazioni (PMS)':'Riepilogo Reception';
  const inputId=unico?'prenFileInput':'arriviFileInput';
  let ts=null;
  try{ts=parseInt(localStorage.getItem('qm_ts_'+(unico?'prenTs':'arriviTs'))||'0')||null;}catch(e){}
  const tsStr=ts?fmtUploadTs(ts).replace('↑ ',''):'';
  el.style.display='flex';
  el.innerHTML=`<span>📄 ${doc} caricato${tsStr?' · '+tsStr:''} · ${arriviData.arrivi.length} arrivi rilevati</span><span onclick="document.getElementById('${inputId}')?.click();" style="margin-left:auto;color:var(--accent);cursor:pointer;font-weight:600;">Aggiorna file</span>`;
}
function rcPrintHighlighted(){
  const idxs=guestsData.map((g,i)=>g.isNew||g.roomChanged?i:-1).filter(i=>i>=0);
  if(!idxs.length){cqAvviso('Nessuna card nuova o con camera spostata da stampare.');return;}
  preparePrintIdxs(idxs);
}
function rcToggleSelect(idx,checked){
  if(checked)_rcSelected.add(idx);else _rcSelected.delete(idx);
  const card=document.getElementById('rc-card-'+idx);
  if(card)card.classList.toggle('rc-card-selected',checked);
  rcUpdateSelectedBtn();
}
function rcUpdateSelectedBtn(){
  const bar=document.getElementById('rcSelectionBar');
  const barText=document.getElementById('rcSelectionBarText');
  if(bar){
    bar.style.display=_rcSelected.size?'flex':'none';
    if(barText)barText.textContent=_rcSelected.size+(_rcSelected.size===1?' card selezionata per la stampa':' card selezionate per la stampa');
  }
  const summaryEl=document.getElementById('rcSummaryLine');
  if(summaryEl&&Array.isArray(guestsData)){
    const hiCount=guestsData.filter(g=>g.isNew||g.roomChanged).length;
    const ready=guestsData.length-hiCount;
    summaryEl.textContent=ready+' pronte'+(hiCount?' · '+hiCount+' da ristampare':'')+(_rcSelected.size?' · '+_rcSelected.size+' selezionate':'');
  }
}
function rcPrintSelected(){
  const idxs=[..._rcSelected].sort((a,b)=>a-b);
  if(!idxs.length){cqAvviso('Nessuna card selezionata.');return;}
  preparePrintIdxs(idxs);
}
function rcBuildPreview(g,idx){const nights=rcCalcNights(g.checkin,g.checkout);
  const normCam=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
  const arrivoMatch=arriviData&&arriviData.arrivi&&arriviData.arrivi.find(a=>normCam(a.camera)===normCam(g.camera));
  const origine=String(g.origine||(arrivoMatch&&arrivoMatch.origine)||'').trim();
  const isBooking=/booking/i.test(origine);
  const origBadge=origine?`<span class="rc-gcard-pill${isBooking?' booking':''}">${isBooking?BK_ICON:''}${origine}</span>`:'';
  // Evidenzia in rosso nuove prenotazioni e camere spostate rispetto al caricamento precedente —
  // sempre subito sotto l'intestazione della card
  const hiIcon=g.isNew?'🆕':(g.roomChanged?'↔️':'');
  const hiText=g.isNew?'Nuova prenotazione':(g.roomChanged?'Camera spostata — era '+g.prevCamera:'');
  const hiLabel=hiText;
  const hiBand=hiLabel?`<div class="rc-gcard-hi-band">${hiIcon} ${hiText}</div>`:'';
  const card=document.createElement('div');card.className='rc-gcard'+(hiLabel?' hi':'');card.id='rc-card-'+idx;
  const checkbox=`<label onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:5px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:10px;color:var(--text-dim);flex-shrink:0;"><input type="checkbox" onchange="rcToggleSelect(${idx},this.checked)" style="cursor:pointer;">Seleziona</label>`;
  card.innerHTML=`<div class="rc-gcard-top"><span class="rc-gcard-label">Registration Card</span><span class="rc-gcard-room">Camera ${g.camera}</span></div>${hiBand}<div class="rc-gcard-guest">${g.nome}</div><div class="rc-gcard-dates"><div class="rc-gdate-cell"><div class="rc-gdate-lbl">Arrivo</div><div class="rc-gdate-val">${g.checkin||'—'}</div></div><div class="rc-gdate-cell"><div class="rc-gdate-lbl">Partenza</div><div class="rc-gdate-val">${g.checkout||'—'}</div></div><div class="rc-gdate-cell"><div class="rc-gdate-lbl">Notti</div><div class="rc-gdate-val">${nights}</div></div></div><div class="rc-gcard-pills"><span class="rc-gcard-pill">${g.pax} ${g.pax===1?'ospite':'ospiti'}</span><span class="rc-gcard-pill">${tratMap[g.trattamento]||g.trattamento}</span>${origBadge}</div><div class="rc-gcard-footer"><span class="rc-gcard-hint">Clicca per anteprima</span><div style="display:flex;align-items:center;gap:8px;">${checkbox}<button class="btn-print-one" onclick="event.stopPropagation();preparePrint(${idx})">Stampa</button></div></div>`;card.addEventListener('click',()=>rcOpenModal(idx));return card;}
function rcOpenModal(idx){const g=guestsData[idx];document.getElementById('rcModalTitle').textContent=g.nome+' — Camera '+g.camera;document.getElementById('rcModalBody').innerHTML=`<div class="mp" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:9pt;color:#1A1916;">${rcCardHTML(g)}</div>`;document.getElementById('rcModalPrintBtn').onclick=()=>{rcCloseModal();setTimeout(()=>preparePrint(idx),150);};document.getElementById('rcModalOverlay').classList.add('open');}
function rcCloseModal(){document.getElementById('rcModalOverlay').classList.remove('open');}
function rcCloseModalOutside(e){if(e.target===document.getElementById('rcModalOverlay'))rcCloseModal();}
function rcResetApp(){document.getElementById('rcResults').style.display='none';document.getElementById('rcUploadZone').style.display='block';document.getElementById('rcFileInput').value='';guestsData=[];try{localStorage.removeItem('qm_rcGuests');}catch(e){}}
// Forza allineamento con la fonte dati (KV) ogni volta che si apre la view Registrazione,
// indipendentemente dal polling in background: previene card bloccate su una vecchia sessione/tab.
async function rcRefreshFromCloud(){
  try{
    const res=await fetch(PROXY+'/kv/get?key=qm_rcGuests',{cache:'no-store'});
    const json=await res.json();
    const nuove=json.value&&!(json.value===localStorage.getItem('qm_rcGuests')&&guestsData.length);
    if(nuove){
      localStorage.setItem('qm_rcGuests',json.value);
      const cloudGuests=JSON.parse(json.value);
      if(cloudGuests&&cloudGuests.length){
        document.getElementById('rcUploadZone').style.display='none';
        document.getElementById('rcProcessing').style.display='none';
        rcRenderCards(cloudGuests);
      }
    }
  }catch(e){}
  // Allineare le card al cloud non basta: su KV possono essere vecchie quanto quelle locali.
  try{rcRiallineaConArrivi();}catch(e){}
}
function rcShowProc(msg){document.getElementById('rcProcText').textContent=msg;document.getElementById('rcProcessing').style.display='flex';document.getElementById('rcUploadZone').style.display='none';}
function rcHideProc(){document.getElementById('rcProcessing').style.display='none';}
function rcShowError(msg){document.getElementById('rcError').textContent=msg;document.getElementById('rcError').style.display='block';document.getElementById('rcUploadZone').style.display='block';}
function rcHideError(){document.getElementById('rcError').style.display='none';}
// §§ MODAL — CATEGORIE TREND (openCatModal, closeCatModal)
let _catModalData=null;
function openCatModal(cat,color,months,byMonth,labels){
  _catModalData={cat,color,months,byMonth,labels};
  document.getElementById('catChartModalTitle').textContent=catLabel(cat);
  document.getElementById('catChartModalTitle').style.color=color;
  // Ricostruisci lista completa recensioni con timestamp
  const allRevs=Object.values(byMonth).flat().filter(r=>{
    const v=parseFloat(r[cat]);
    return !isNaN(v)&&v>0&&r._dateTs>0;
  });
  if(!allRevs.length){
    document.getElementById('catChartModalBody').innerHTML='<div style="color:var(--text-dim)">Nessun dato disponibile</div>';
    document.getElementById('catChartModal').style.display='flex';
    return;
  }
  // Costruisci lista mesi dal più vecchio al più recente
  const minTs=Math.min(...allRevs.map(r=>r._dateTs));
  const maxTs=Math.max(...allRevs.map(r=>r._dateTs));
  const startDate=new Date(minTs); startDate.setDate(1); startDate.setHours(0,0,0,0);
  const endDate=new Date(maxTs); endDate.setDate(1); endDate.setHours(0,0,0,0);
  const monthDates=[],monthLabels=[];
  const mesiBrevi=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const cur=new Date(startDate);
  while(cur<=endDate){
    monthDates.push(new Date(cur));
    monthLabels.push(mesiBrevi[cur.getMonth()]+'\''+String(cur.getFullYear()).slice(2));
    cur.setMonth(cur.getMonth()+1);
  }
  // Calcola score ponderato cumulativo 85/10/5 per categoria ad ogni mese
  function calcCatWeightedAt(refDate){
    const refTs=refDate.getTime()+30*24*60*60*1000;
    const available=allRevs.filter(r=>r._dateTs<=refTs);
    if(!available.length)return null;
    const f1=available.filter(r=>(refTs-r._dateTs)/86400000<=365);
    const f2=available.filter(r=>{const d=(refTs-r._dateTs)/86400000;return d>365&&d<=730;});
    const f3=available.filter(r=>{const d=(refTs-r._dateTs)/86400000;return d>730&&d<=1096;});
    const avg=arr=>{const v=arr.map(r=>parseFloat(r[cat])).filter(v=>!isNaN(v)&&v>0);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
    const a1=avg(f1),a2=avg(f2),a3=avg(f3);
    let wT=0,wS=0;
    if(a1!==null){wT+=0.85;wS+=0.85*a1;}
    if(a2!==null){wT+=0.10;wS+=0.10*a2;}
    if(a3!==null){wT+=0.05;wS+=0.05*a3;}
    return wT>0?wS/wT:null;
  }
  const vals=monthDates.map(m=>calcCatWeightedAt(m));
  const validVals=vals.filter(v=>v!==null);
  if(validVals.length<2){
    document.getElementById('catChartModalBody').innerHTML='<div style="color:var(--text-dim)">Dati insufficienti</div>';
    document.getElementById('catChartModal').style.display='flex';
    return;
  }
  document.getElementById('catChartModalSub').textContent='Score ponderato Booking 85/10/5 · '+monthDates.length+' mesi · tutto il periodo';
  const W=700,H=260,PL=40,PR=20,PT=30,PB=40;
  const plotW=W-PL-PR,plotH=H-PT-PB;
  const minY=Math.max(0,Math.min(...validVals)-0.2);
  const maxY=Math.min(10,Math.max(...validVals)+0.2);
  const rng=maxY-minY||0.5;
  function sx(i){return PL+i/(monthDates.length-1)*plotW;}
  function sy(v){return PT+plotH-(v-minY)/rng*plotH;}
  const points=vals.map((v,i)=>v!==null?{x:sx(i),y:sy(v),v,m:monthLabels[i]}:null).filter(Boolean);
  function linePath(pts){
    if(!pts.length)return'';
    return`M${pts[0].x},${pts[0].y}`+pts.slice(1).map(p=>`L${p.x},${p.y}`).join('');
  }
  const path=linePath(points);
  const areaClose=`L${points[points.length-1].x},${PT+plotH} L${points[0].x},${PT+plotH} Z`;
  const labelStep=Math.max(1,Math.ceil(points.length/12));
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;">`;
  const steps=5;
  for(let i=0;i<=steps;i++){
    const v=minY+i/steps*rng;
    const y=sy(v);
    svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border-light)" stroke-width="1"/>`;
    svg+=`<text x="${PL-5}" y="${y+4}" font-size="11" fill="var(--text-dim)" text-anchor="end">${v.toFixed(1)}</text>`;
  }
  points.forEach((pt,i)=>{
    if(i%labelStep===0||i===points.length-1){
      svg+=`<line x1="${pt.x}" y1="${PT+plotH}" x2="${pt.x}" y2="${PT+plotH+5}" stroke="var(--border-light)" stroke-width="1"/>`;
      svg+=`<text x="${pt.x}" y="${H-6}" font-size="11" fill="var(--text-dim)" text-anchor="middle">${pt.m}</text>`;
    }
  });
  svg+=`<path d="${path} ${areaClose}" fill="${color}" opacity="0.1"/>`;
  svg+=`<path d="${path}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
  points.forEach((pt,i)=>{
    svg+=`<circle cx="${pt.x}" cy="${pt.y}" r="2.5" fill="${color}" stroke="white" stroke-width="1.5"/>`;
    if(i%2===0||i===points.length-1){
      const above=i%4<2;
      svg+=`<text x="${pt.x}" y="${above?pt.y-10:pt.y+16}" font-size="9.5" fill="${color}" text-anchor="middle" font-weight="600">${pt.v.toFixed(1)}</text>`;
    }
  });
  svg+='</svg>';
  document.getElementById('catChartModalBody').innerHTML=svg;
  document.getElementById('catChartModal').style.display='flex';
}
function closeCatModal(){
  document.getElementById('catChartModal').style.display='none';
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCatModal();closeArriviModal();}});
// §§ ARRIVI GIORNALIERI — UPLOAD & RENDER (handleArriviFile, resetArrivi, arriviUpdateKpi, detectStruttura, renderArriviModal)
let arriviData=null;
// §§ COLAZIONE BOOKING.COM — snapshot ospiti per camera (nome/origine/trattamento/checkout)
// costruito dal Riepilogo Reception, e "seguito" quando cambia camera durante la room
// division: il Piano Settimana non ha mai il nome ospite, quindi non possiamo scoprire CHI
// si è spostato, ma se il confronto tra due caricamenti del Piano mostra esattamente una
// camera che esce dai "cambi" di oggi e una sola che vi entra, è ragionevole assumere che
// sia la stessa prenotazione spostata — migriamo l'informazione dalla vecchia alla nuova
// camera. Se il confronto è ambiguo (più di uno spostamento insieme) non indoviniamo
// l'abbinamento: segnaliamo solo che qualcosa è cambiato e serve una verifica manuale.
let BKF_ROOM_INFO={};
let BKF_ROOM_AMBIGUOUS=0;
let BKF_ROOM_INFO_DATE=null; // data del documento rappresentato dallo snapshot corrente
(()=>{try{const s=localStorage.getItem('qm_bkf_room_info');if(s)BKF_ROOM_INFO=JSON.parse(s);}catch(e){}
  try{const a=localStorage.getItem('qm_bkf_room_ambiguous');if(a)BKF_ROOM_AMBIGUOUS=parseInt(a)||0;}catch(e){}
  try{const d=localStorage.getItem('qm_bkf_room_info_date');if(d)BKF_ROOM_INFO_DATE=d;}catch(e){}
  setTimeout(()=>bkfBookingRender(),200);})();
function bkfRoomInfoPersist(){
  try{localStorage.setItem('qm_bkf_room_info',JSON.stringify(BKF_ROOM_INFO));}catch(e){}
  try{localStorage.setItem('qm_bkf_room_ambiguous',String(BKF_ROOM_AMBIGUOUS));}catch(e){}
  try{localStorage.setItem('qm_bkf_room_info_date',BKF_ROOM_INFO_DATE||'');}catch(e){}
  kvSet('qm_bkf_room_info',JSON.stringify(BKF_ROOM_INFO)).catch(()=>{});
  kvSet('qm_bkf_room_ambiguous',String(BKF_ROOM_AMBIGUOUS)).catch(()=>{});
  kvSet('qm_bkf_room_info_date',BKF_ROOM_INFO_DATE||'').catch(()=>{});
}
// Converte date brevi tipo "20/3" o "20/3/2026" in Date (mezzanotte). Senza anno usa
// quello corrente — sufficiente per l'orizzonte di pochi giorni di questa vista.
function _bkfParseShortDate(s){
  if(!s)return null;
  const m=String(s).trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if(!m)return null;
  const day=parseInt(m[1]),mon=parseInt(m[2])-1;
  let year=m[3]?parseInt(m[3]):new Date().getFullYear();
  if(year<100)year+=2000;
  const d=new Date(year,mon,day);d.setHours(0,0,0,0);
  return isNaN(d)?null:d;
}
// Un ospite conta per il giorno "target" solo se è già in casa quella mattina: arrivato
// PRIMA (non lo stesso giorno — chi arriva oggi non ha ancora fatto colazione oggi) e non
// ancora ripartito (chi parte oggi conta ancora, ha fatto colazione prima di andarsene).
// Per "oggi" (isToday=true) il tipo riga (arrivo/fermata/partenza) è un dato certo del
// Riepilogo Reception — usarlo come regola primaria, senza dipendere dal parsing della
// data di arrivo/partenza che per alcune righe l'AI può non leggere correttamente.
function _bkfGuestPresentOn(g,targetDate,isToday){
  if(isToday)return g.tipo!=='arrivo';
  const ci=_bkfParseShortDate(g.checkin);
  const co=_bkfParseShortDate(g.checkout);
  if(ci&&ci>=targetDate)return false;
  if(co&&co<targetDate)return false;
  return true;
}
let _bkfBookingDayOffset=0;
function bkfRoomInfoBuild(){
  if(!arriviData)return;
  // Una camera può avere DUE prenotazioni lo stesso giorno (cambio: qualcuno parte e un
  // altro arriva) — un oggetto singolo per camera perdeva quella in partenza sovrascritta
  // dall'arrivo. Ogni camera ora ha un ARRAY di prenotazioni, non una sola.
  const freshMap={};
  const add=(list,tipo)=>(list||[]).forEach(a=>{
    const cam=(a.camera||'').trim();
    if(!cam)return;
    // Principe/Umberto e Mastrangelo non fanno colazione tracciata qui — escluse.
    // Controlla il nome camera (stessa regola di fixArriviStruttura), non il campo
    // struttura: nelle "fermate"/"partenze" arriva grezzo dall'AI e non sempre è affidabile.
    const c=cam.toUpperCase();
    if(/^(CAPRI|NAPOLI|PROCIDA|ISCHIA|POSITANO)/i.test(c))return; // Principe/Umberto
    if(/^R[123]$/i.test(c))return; // Rooms Mastrangelo
    const checkin=a.arrivo||null;
    const checkout=a.partenza||(tipo==='partenza'?arriviData.data:null);
    (freshMap[cam]=freshMap[cam]||[]).push({camera:cam,nome:a.ospite||'',origine:a.origine||'',trattamento:a.trattamento||'',checkin,checkout,pax:a.pax||null,tipo});
  });
  add(arriviData.fermate,'fermata');
  add(arriviData.partenze,'partenza');
  add(arriviData.arrivi,'arrivo');
  // Il Riepilogo Reception, quando una camera ha un checkout (con o senza turnover),
  // spesso SMETTE di riportare l'ospite uscito nei caricamenti successivi dello stesso
  // giorno — non perché sia sbagliato, ma perché la reception lo processa e Hotel in
  // Cloud lo toglie dal documento. Se ricarichiamo più volte lo STESSO giorno, quelle
  // camere non devono sparire da Compass/app: si fonde il nuovo documento su quello
  // vecchio invece di sostituirlo, così un checkout già visto resta noto per la
  // giornata anche se il caricamento successivo non lo riporta più. Il reset completo
  // avviene solo quando il documento cambia giorno.
  // Confronto tollerante: l'AI può restituire la data del documento con formattazione
  // leggermente diversa tra un caricamento e l'altro (es. "24/7/2026" vs "24/07/2026") —
  // un confronto stringa esatto farebbe scattare un reset completo per errore.
  const normDate=s=>String(s||'').trim().split('/').map((p,i)=>i<2?p.padStart(2,'0'):p).join('/');
  const sameDay=BKF_ROOM_INFO_DATE&&normDate(BKF_ROOM_INFO_DATE)===normDate(arriviData.data);
  if(sameDay){
    // Fusione per SINGOLA prenotazione, non per intera camera: quando una camera ha un
    // turnover, il documento nuovo la riporta comunque (col nuovo ospite arrivato) — un
    // merge a livello di camera sovrascriverebbe l'intero array perdendo la partenza
    // precedente. Le partenze già note per oggi si tengono sempre; fermate/arrivi si
    // aggiornano con l'ultimo documento (evita di trascinare avanti dati vecchi su chi
    // resta o su chi arriva).
    const merged={...freshMap};
    Object.keys(BKF_ROOM_INFO).forEach(cam=>{
      const oldPartenze=(BKF_ROOM_INFO[cam]||[]).filter(r=>r.tipo==='partenza');
      if(!oldPartenze.length)return;
      const already=new Set((merged[cam]||[]).filter(r=>r.tipo==='partenza').map(r=>r.nome));
      const toAdd=oldPartenze.filter(r=>!already.has(r.nome));
      if(toAdd.length)merged[cam]=[...(merged[cam]||[]),...toAdd];
    });
    BKF_ROOM_INFO=merged;
  }else{
    BKF_ROOM_INFO=freshMap;
  }
  BKF_ROOM_INFO_DATE=arriviData.data;
  BKF_ROOM_AMBIGUOUS=0; // riepilogo appena ricaricato: azzera eventuali segnalazioni precedenti
  bkfRoomInfoPersist();
  bkfBookingRender();
}
function bkfBookingNav(delta){
  // Oltre domani i dati non sono affidabili (dipendono da arrivi/checkout non ancora
  // riflessi nell'ultimo Riepilogo Reception caricato) — vista limitata a oggi e domani.
  _bkfBookingDayOffset=Math.max(0,Math.min(1,_bkfBookingDayOffset+delta));
  bkfBookingRender();
}
function _pianoFindTodayGiorno(data){
  if(!data||!data.giorni)return null;
  const ref=new Date();
  const refStr=String(ref.getDate()).padStart(2,'0')+'/'+String(ref.getMonth()+1).padStart(2,'0')+'/'+ref.getFullYear();
  const normDate=s=>s.split('/').map((p,i)=>i<2?p.padStart(2,'0'):p).join('/');
  return data.giorni.find(g=>g.data&&normDate(g.data)===refStr)||null;
}
function bkfRoomInfoReconcilePianoChange(oldData,newData){
  try{
    const oldG=_pianoFindTodayGiorno(oldData);
    const newG=_pianoFindTodayGiorno(newData);
    if(!oldG||!newG)return; // niente da confrontare (il piano non copriva oggi prima o dopo)
    const oldCambi=new Set((oldG.soulart&&oldG.soulart.cambi)||[]);
    const newCambi=new Set((newG.soulart&&newG.soulart.cambi)||[]);
    const removed=[...oldCambi].filter(r=>!newCambi.has(r));
    const added=[...newCambi].filter(r=>!oldCambi.has(r));
    if(!removed.length&&!added.length)return;
    if(removed.length===1&&added.length===1){
      const from=removed[0],to=added[0];
      if(BKF_ROOM_INFO[from]){
        BKF_ROOM_INFO[to]=BKF_ROOM_INFO[from].map(r=>({...r,camera:to}));
        delete BKF_ROOM_INFO[from];
      }
    }else{
      // più camere cambiate insieme: non c'è modo di sapere quale prenotazione è andata dove
      BKF_ROOM_AMBIGUOUS+=removed.length+added.length;
    }
    bkfRoomInfoPersist();
    bkfBookingRender();
  }catch(e){}
}
function bkfBookingRender(){
  const el=document.getElementById('ov-bkf-booking');
  if(!el)return;
  const target=new Date();target.setHours(0,0,0,0);target.setDate(target.getDate()+_bkfBookingDayOffset);
  const dateLbl=target.toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'});
  const isToday=_bkfBookingDayOffset===0;
  const all=Object.values(BKF_ROOM_INFO).flat().filter(r=>r&&r.camera); // ogni camera può avere più prenotazioni (cambio)
  const rows=all.filter(r=>/booking/i.test(r.origine||'')&&_bkfGuestPresentOn(r,target,isToday));
  // Camere "200" (Boutique) prima, poi le "Art" (SoulArt) — non ordinamento puramente
  // numerico, altrimenti Art 12 finirebbe prima di 207.
  rows.sort((a,b)=>{
    const ga=/^art/i.test((a.camera||'').trim())?1:0,gb=/^art/i.test((b.camera||'').trim())?1:0;
    if(ga!==gb)return ga-gb;
    return (parseInt((a.camera||'').replace(/\D/g,''))||0)-(parseInt((b.camera||'').replace(/\D/g,''))||0);
  });
  if(!all.length&&!BKF_ROOM_AMBIGUOUS){el.innerHTML='';return;}
  const warnHtml=(isToday&&BKF_ROOM_AMBIGUOUS)?`<div style="background:var(--amber-bg);color:var(--amber);border-radius:8px;padding:8px 12px;font-size:11.5px;font-weight:600;margin-bottom:10px;">⚠️ Ci sono stati cambi camera oggi non riconducibili con certezza — verifica manualmente le camere Booking.com sotto.</div>`:'';
  el.innerHTML=`<div style="border-top:1px solid var(--border-light);margin-top:16px;padding-top:14px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap;">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">${BK_ICON} Colazione Booking.com</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <button onclick="bkfBookingNav(-1)" ${_bkfBookingDayOffset<=0?'disabled':''} style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;width:24px;height:24px;cursor:pointer;color:var(--text-muted);font-size:12px;${_bkfBookingDayOffset<=0?'opacity:.35;cursor:default;':''}">‹</button>
        <span style="font-size:11.5px;color:var(--text-dim);min-width:74px;text-align:center;text-transform:capitalize;">${isToday?'Oggi':dateLbl}</span>
        <button onclick="bkfBookingNav(1)" ${_bkfBookingDayOffset>=1?'disabled':''} style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;width:24px;height:24px;cursor:pointer;color:var(--text-muted);font-size:12px;${_bkfBookingDayOffset>=1?'opacity:.35;cursor:default;':''}">›</button>
      </div>
    </div>
    ${warnHtml}
    ${rows.length?`<div style="display:flex;flex-direction:column;gap:0;">${rows.map((r,idx)=>{
      const isRO=/^ro$/i.test((r.trattamento||'').trim());
      return`<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px 12px;padding:9px 0;${idx>0?'border-top:1px solid var(--border-light);':''}">
        <span style="font-size:13px;font-weight:700;color:var(--accent);flex-shrink:0;">${r.camera}</span>
        <span style="flex:1;min-width:120px;font-size:13px;color:var(--text);word-break:break-word;">${r.nome||'—'}</span>
        ${r.trattamento?`<span style="font-size:10px;font-weight:800;padding:3px 7px;border-radius:5px;letter-spacing:.02em;flex-shrink:0;background:${isRO?'var(--surface2)':'var(--green-bg)'};color:${isRO?'var(--text-dim)':'var(--green)'};">${r.trattamento}</span>`:''}
        <span style="font-size:11px;color:var(--text-dim);flex-shrink:0;">out ${r.checkout||'—'}</span>
      </div>`;
    }).join('')}</div>`:`<div style="color:var(--text-dim);font-size:12.5px;">Nessun ospite Booking.com a colazione ${isToday?'oggi':'quel giorno'}.</div>`}
  </div>`;
}
function toggleArriviAccordion(){}
const arriviBox={classList:{add:()=>{},remove:()=>{}}};
const arriviInput=document.getElementById('arriviFileInput');
(function(){
  const box=document.getElementById('arriviUploadBox');
  if(box){box.addEventListener('click',()=>arriviInput.click());box.addEventListener('dragover',e=>{e.preventDefault();box.classList.add('dragover');});box.addEventListener('dragleave',()=>box.classList.remove('dragover'));box.addEventListener('drop',e=>{e.preventDefault();box.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f)handleArriviFile(f);});}
  arriviInput.addEventListener('change',e=>{if(e.target.files[0])handleArriviFile(e.target.files[0]);});
})();
async function handleArriviFile(file){
  ucSetState('arrivi','loading','Analisi in corso...');
  try{
    const base64=await new Promise((res,rej)=>{
      const r=new FileReader();
      r.onload=()=>res(r.result.split(',')[1]);
      r.onerror=()=>rej(new Error('Lettura fallita'));
      r.readAsDataURL(file);
    });
    const isPDF=file.type==='application/pdf';
    const mediaType=isPDF?'application/pdf':file.type||'image/jpeg';
    const contentBlock=isPDF
      ?{type:'document',source:{type:'base64',media_type:mediaType,data:base64}}
      :{type:'image',source:{type:'base64',media_type:mediaType,data:base64}};
    const prompt=`Analizza questo documento di un hotel (può essere "Arrivi oggi" oppure "Riepilogo Reception" di Hotel in Cloud) e restituisci SOLO un JSON valido con questa struttura:
{
  "data": "20/03/2026",
  "totale_stanze": 22,
  "totale_persone": 42,
  "arrivi": [
    {
      "camera": "203",
      "struttura": "SA",
      "tipo_camera": "STD",
      "ospite": "Canetto Martina",
      "pax": 2,
      "trattamento": "BB",
      "arrivo": "20/3",
      "partenza": "22/3",
      "note": "PAGA ROOM 188€ + TAX",
      "alert": false,
      "origine": "Booking.com"
    }
  ],
  "partenze": [
    {
      "camera": "205",
      "struttura": "BH",
      "ospite": "Rossi Marco",
      "pax": 2,
      "origine": "Booking.com"
    }
  ],
  "fermate": [
    {
      "camera": "201",
      "struttura": "BH",
      "ospite": "Bianchi Luigi",
      "pax": 2,
      "arrivo": "17/5",
      "partenza": "20/5",
      "origine": "Booking.com"
    }
  ]
}
Se il documento è un "Riepilogo Reception" (contiene sezioni Partenze / Arrivi / In Casa):
- In "arrivi": includi TUTTI gli ospiti la cui data di arrivo (campo check-in nel documento) coincide con la data del documento — sia quelli nella sezione "Arrivi" sia quelli già nella sezione "In Casa" (un ospite può essere già in casa perché ha fatto check-in prima dell'upload ma è comunque arrivato oggi). REGOLA CHIAVE: confronta la data di arrivo di ogni ospite con la data del documento; se coincidono → va in "arrivi".
- In "partenze": estrai TUTTE le righe della sezione "Partenze" senza eccezioni — includi camere con prefisso Art (Art 5, Art 11, Art 12…), camere con nomi geografici (Ischia, Napoli, Capri, Positano, Procida…), camere numeriche e qualsiasi altro formato. Non fermarti mai prima di aver estratto l'ultima riga della sezione. Per ogni partenza includi il campo origine.
- In "fermate": includi SOLO gli ospiti della sezione "In Casa" la cui data di arrivo è PRECEDENTE alla data del documento (ospiti arrivati nei giorni scorsi)
- ATTENZIONE ERRORE FREQUENTE: leggendo tabelle lunghe è facile "trascinare" per errore la data della riga precedente su righe successive, specialmente al confine tra la sezione "Arrivi" e "In Casa". Leggi la data di arrivo di OGNI riga individualmente dal documento, senza mai assumere che sia uguale a quella della riga sopra. In caso di dubbio su una riga vicino al confine tra sezioni, ricontrolla il valore esatto stampato sul documento per quella riga specifica.
Se il documento è solo "Arrivi oggi" (senza sezioni Partenze / In Casa), metti "partenze": [] e "fermate": [].
Per "struttura" identifica la struttura dal NUMERO/PREFISSO della camera:
- "SA": camere numeriche 100-199 e generiche → SoulArt Hotel
- "AR": camere con prefisso "Art" (es. Art 2, Art 5, Art 22) → Art Resort
- "BH": camere numeriche 200-299 (es. 201, 202, 203, 215) → Boutique Hotel
- "SL": camere con prefisso Lib → San Liborio
- "PR": camere con nome geografico: Capri, Napoli, Procida, Ischia, Positano → Principe/Umberto
- "MS": camere R1, R2, R3 → Rooms Mastrangelo
- "NA": qualsiasi altra camera non identificata
Per "alert" metti true se le note contengono parole come: ATTENZIONE, NON SPOSTARE, REPEATER, MASSIMA PULIZIA, IMPORTANTE, WARNING.
Per "origine": estrai il canale dalla colonna Origine (es. "Booking.com, it," → "Booking.com"; "Booking.com 2, en," → "Booking.com"; "Expedia," → "Expedia"; "Italcamel," → "Italcamel"; "CRSVErtical, it," → "CRSVErtical"; "External portal via Figaro," → "Figaro"). Se assente lascia "".
Restituisci SOLO il JSON, nessun testo prima o dopo.`;
    const response=await fetch('https://anthropic-proxy.qm-d82.workers.dev/v1/messages',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:8192,
        messages:[{role:'user',content:[contentBlock,{type:'text',text:prompt}]}]})
    });
    const data=await response.json();
    if(!data.content||!data.content[0]){console.error('[Arrivi] risposta API:',JSON.stringify(data));throw new Error(data.error?.message||'Risposta vuota');}
    let jsonText=data.content[0].text.replace(/```json/g,'').replace(/```/g,'').trim();
    const newData=JSON.parse(jsonText);
    newData.arrivi=fixArriviStruttura(newData.arrivi||[]);
    newData.partenze=newData.partenze||[];
    newData.fermate=newData.fermate||[];
    // Ogni upload del Riepilogo Reception è un'istantanea COMPLETA della giornata, non un
    // incremento: arrivi/partenze/fermate vengono sempre sostituiti interamente col nuovo
    // parsing, mai uniti al precedente. Il merge per camera/nome causava doppioni quando un
    // ospite cambiava camera, e un merge per nome rischiava di unire per errore prenotazioni
    // diverse con più camere sotto lo stesso nominativo — la sostituzione piena evita entrambi.
    // Guardia deterministica: scarta dagli arrivi chi ha data di arrivo diversa dalla data del documento
    // (l'AI a volte include per errore ospiti già in casa da giorni precedenti classificandoli come "arrivi";
    // applicata DOPO il merge così pulisce anche eventuali residui di upload precedenti nello stesso giorno)
    const _normDM=s=>{const m=String(s||'').match(/(\d{1,2})\/(\d{1,2})/);return m?m[1].padStart(2,'0')+'/'+m[2].padStart(2,'0'):'';};
    const _docDM=_normDM(newData.data);
    if(_docDM)newData.arrivi=newData.arrivi.filter(a=>!a.arrivo||_normDM(a.arrivo)===_docDM);
    const _normCam=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
    // Guardia deterministica: chi ha già fatto check-in prima dell'upload finisce nella sezione
    // "In Casa" del documento e l'AI a volte lo classifica in "fermate" invece che in "arrivi",
    // anche se la sua data di arrivo coincide con quella del documento — in tal caso è comunque
    // un arrivo di oggi (semplicemente già check-in-ato), non va perso: lo spostiamo qui in modo
    // deterministico, senza affidarci solo al prompt AI (non fatto in modo diverso a seconda che
    // sia un check-in o un check-out: stessa logica usata per non perdere le fermate con partenza=oggi).
    if(_docDM){
      const daSpostare=(newData.fermate||[]).filter(f=>f.arrivo&&_normDM(f.arrivo)===_docDM);
      if(daSpostare.length){
        newData.arrivi=newData.arrivi.concat(daSpostare);
        const spostateCam=new Set(daSpostare.map(f=>_normCam(f.camera)));
        newData.fermate=newData.fermate.filter(f=>!spostateCam.has(_normCam(f.camera)));
      }
    }
    // Guardia deterministica: chi è già in "fermate" (in casa da prima) non può essere anche un "arrivo" di oggi
    const _fermateCam=new Set((newData.fermate||[]).map(f=>_normCam(f.camera)));
    if(_fermateCam.size)newData.arrivi=newData.arrivi.filter(a=>!_fermateCam.has(_normCam(a.camera)));
    // Il nuovo caricamento è sempre la fonte di verità (può diminuire per una cancellazione
    // legittima, non solo per un errore di lettura AI: i dati non vengono MAI alterati o
    // "recuperati" automaticamente). Se gli arrivi diminuiscono rispetto al giro precedente,
    // segnala solo chi non risulta più, per un rapido controllo manuale — cancellazione vera
    // o errore di lettura, la decisione resta a chi carica il documento.
    let _arriviWarning=null;
    if(arriviData&&arriviData.data===newData.data&&Array.isArray(arriviData.arrivi)&&newData.arrivi.length<arriviData.arrivi.length){
      const seenCam=new Set(newData.arrivi.map(a=>_normCam(a.camera)));
      const missing=arriviData.arrivi.filter(a=>!seenCam.has(_normCam(a.camera)));
      if(missing.length){
        _arriviWarning='Gli arrivi sono passati da '+arriviData.arrivi.length+' a '+newData.arrivi.length+'. Non risultano più: '+missing.map(a=>(a.ospite||'?')+' ('+a.camera+')').join(', ')+'. Se è una cancellazione va bene così, altrimenti ricontrolla il documento.';
      }
    }
    // Serve dopo per capire se confrontare le RC col caricamento precedente ha senso
    // (solo se era lo stesso giorno — altrimenti confronteremmo con gli ospiti di ieri)
    const _rcSameDayAsPrev=!!(arriviData&&arriviData.data===newData.data);
    arriviData=newData;
    // Salva locale + cloud
    arriviData._ts=Date.now();
    try{localStorage.setItem('qm_arriviData',JSON.stringify(arriviData));}catch(e){}
    try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_arriviData',value:JSON.stringify(arriviData)})}).catch(()=>{});}catch(e){}
    // Aggiorna UI
    document.getElementById('arriviLoadedDate').textContent=arriviData.data;
    setUploadTs('arriviTs');
    arriviUpdateKpi();
    bkfRoomInfoBuild();
    // Aggiorna RC cards: arrivi + fermate arrivate OGGI (stessa data del documento)
    const _rcEsito=rcAggiornaDaArrivi(_rcSameDayAsPrev);
    const _rcCardsOk=_rcEsito!=='vuoto';
    const _rcNoneNeeded=_rcEsito==='nessuna';
    // Se l'analisi non ha prodotto arrivi validi, avvisa chiaramente invece di fallire in silenzio
    // (le registration card resterebbero quelle vecchie senza che nessuno se ne accorga)
    if(_rcNoneNeeded){
      ucSetState('arrivi','loaded',arriviData.data+' · '+arriviData.arrivi.length+' arrivi (nessuna RC — solo Principe/Mastrangelo)');
    }else if(!_rcCardsOk){
      ucSetState('arrivi','error',arriviData.data+' · 0 arrivi rilevati — verifica il documento');
      cqAvviso('Attenzione: dal documento caricato non risultano arrivi validi.\nLe registration card NON sono state aggiornate.\nControlla il file e ricarica il Riepilogo Reception.');
    }else if(_arriviWarning){
      ucSetState('arrivi','error',arriviData.data+' · '+arriviData.arrivi.length+' arrivi — verifica manuale consigliata');
      cqAvviso('⚠️ Controllo automatico\n\n'+_arriviWarning);
    }else{
      ucSetState('arrivi','loaded',arriviData.data+' · '+arriviData.arrivi.length+' arrivi');
    }
  }catch(err){
    console.error('[Arrivi] errore caricamento:',err);
    ucSetState('arrivi','error','Errore: '+(err&&err.message?err.message:'caricamento fallito'));
  }
}
function resetArrivi(){
  arriviData=null;
  ucSetState('arrivi','','Non caricato');
  document.getElementById('arriviFileInput').value='';
  document.getElementById('arriviLoadedDate').textContent='';
  document.getElementById('btnArriviReload').style.display='none';
  try{localStorage.removeItem('qm_arriviData');}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_arriviData',value:null})}).catch(()=>{});}catch(e){}
}
function arriviUpdateKpi(){
  if(!arriviData)return;
  const alerts=arriviData.arrivi.filter(a=>a.alert).length;
  const sub=document.getElementById('kpi-arrivi-sub');
  if(sub&&alerts>0)sub.textContent='⚠️ '+alerts+' con note critiche';

  // Breakdown canali da origine
  const arriviConOrigine=arriviData.arrivi.filter(a=>a.origine&&a.origine.trim());
  if(arriviConOrigine.length>0){
    // Conta per canale
    const counts={};
    arriviData.arrivi.forEach(a=>{const o=(a.origine||'').trim();if(o)counts[o]=(counts[o]||0)+1;});
    const canali=Object.entries(counts).sort((a,b)=>b[1]-a[1]);

    // Topbar chip Booking.com — conta arrivi + fermate (presenza totale oggi)
    const bkArriviN=canali.filter(([k])=>/booking/i.test(k)).reduce((s,[,v])=>s+v,0);
    const bkFermateN=(arriviData.fermate||[]).filter(f=>/booking/i.test(f.origine||'')).length;
    const bkCount=bkArriviN+bkFermateN;
    const bkChip=document.getElementById('kpi-booking-chip');
    const bkVal=document.getElementById('kpi-booking-val');
    if(bkChip&&bkVal){bkVal.textContent=bkCount;bkChip.style.display=bkCount>0?'':'none';}

    // Riquadro arrivi — breakdown canali
    const canaliDiv=document.getElementById('arriviCanali');
    if(canaliDiv){
      canaliDiv.innerHTML=canali.map(([k,n])=>{
        const isBk=/booking/i.test(k);
        return`<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${isBk?'var(--accent-bg)':'rgba(0,0,0,.06)'};color:${isBk?'var(--accent)':'var(--text-dim)'};font-weight:${isBk?'600':'400'};">${isBk?BK_ICON:''}${k} <b>${n}</b></span>`;
      }).join('');
    }
  } else {
    // Nessun dato origine — nasconde chip e svuota riquadro
    const bkChip=document.getElementById('kpi-booking-chip');
    if(bkChip)bkChip.style.display='none';
    const canaliDiv=document.getElementById('arriviCanali');
    if(canaliDiv)canaliDiv.innerHTML='';
  }

  // Box overview — arrivi Booking.com + fermate + partenze (recensioni attese)
  const ovBox=document.getElementById('ov-booking-box');
  if(ovBox){
    const isBk=o=>/booking/i.test(o||'');
    // Data documento in formato D/M per confrontare con campo partenza delle fermate
    const docDM=(()=>{const p=(arriviData.data||'').split('/');return p.length>=2?parseInt(p[0])+'/'+parseInt(p[1]):'';})();
    const fermataEscOggi=f=>{if(!f.partenza)return false;const p=f.partenza.split('/');return parseInt(p[0])+'/'+parseInt(p[1])===docDM;};
    const bkArrivi=(arriviData.arrivi||[]).filter(a=>isBk(a.origine));
    const bkFermate=(arriviData.fermate||[]).filter(f=>isBk(f.origine)&&!fermataEscOggi(f));
    // Checkout: partenze formali + fermate Booking.com con partenza=oggi (non ancora processate)
    const bkPartenze=[
      ...(arriviData.partenze||[]).filter(p=>isBk(p.origine)),
      ...(arriviData.fermate||[]).filter(f=>isBk(f.origine)&&fermataEscOggi(f))
    ];
    if(bkArrivi.length>0||bkFermate.length>0||bkPartenze.length>0){
      let html=`<div style="border-top:1px solid var(--border-light);padding-top:12px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          ${BK_ICON}<span style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Situazione odierna camere Booking.com</span>
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;">`;
      if(bkArrivi.length>0){
        const chips=bkArrivi.map(a=>`<span style="padding:3px 10px;border-radius:10px;background:var(--accent-bg);color:var(--accent);font-size:var(--fs-xxs);font-weight:600;border:1px solid #B8CEEE;">↓ ${a.camera}${a.ospite?' · '+a.ospite.split(' ')[0]:''}</span>`).join('');
        html+=`<div style="flex:1;min-width:160px;"><div style="font-size:var(--fs-xxs);color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">Check-in <span style="background:var(--accent);color:#fff;border-radius:6px;padding:0 6px;">${bkArrivi.length}</span></div><div class="bk-chip-grid">${chips}</div></div>`;
      }
      if(bkFermate.length>0){
        const chips=bkFermate.map(f=>`<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:10px;background:var(--accent-bg);color:var(--accent);font-size:var(--fs-xxs);font-weight:600;border:1px solid #B8CEEE;"><img src="img/icons/fermata.png" class="ov-icon" style="width:16px;height:16px;object-fit:contain;">${f.camera}${f.ospite?' · '+f.ospite.split(' ')[0]:''}</span>`).join('');
        html+=`<div style="flex:1;min-width:160px;"><div style="font-size:var(--fs-xxs);color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">In fermata <span style="background:var(--accent);color:#fff;border-radius:6px;padding:0 6px;">${bkFermate.length}</span></div><div class="bk-chip-grid">${chips}</div></div>`;
      }
      if(bkPartenze.length>0){
        const chips=bkPartenze.map(p=>`<span style="padding:3px 10px;border-radius:10px;background:var(--accent-bg);color:var(--accent);font-size:var(--fs-xxs);font-weight:600;border:1px solid #B8CEEE;">↑ ${p.camera}${p.ospite?' · '+p.ospite.split(' ')[0]:''}</span>`).join('');
        html+=`<div style="flex:1;min-width:160px;"><div style="font-size:var(--fs-xxs);color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">Check-out — recensioni attese <span style="background:var(--accent);color:#fff;border-radius:6px;padding:0 6px;">${bkPartenze.length}</span></div><div class="bk-chip-grid">${chips}</div></div>`;
      }
      html+=`</div></div>`;
      ovBox.innerHTML=html;
      ovBox.style.display='block';
    } else {
      ovBox.innerHTML='';
      ovBox.style.display='none';
    }
  }
  // Aggiorna la previsione Culligan nel pannello Piano camere (dipende da arriviData)
  try{if(pianoNavIdx!==null&&pianoNavIdx!==undefined)pianoNavRender(pianoNavIdx);}catch(e){}
}
function detectStruttura(camera){
  if(!camera)return'NA';
  const c=camera.trim().toUpperCase();
  // Art Resort: prefisso "ART" seguito da numero (Art 2, Art 5, Art 10...)
  if(/^ART\s*\d+/.test(c)||/^AS\s/.test(c))return'AR';
  // SoulArt: puramente numeriche 100-199 o 200-299 senza prefisso "Art"
  // Boutique: serie 200 (201-299) — distingui: SoulArt ha 203, 206, 208
  // In realtà SoulArt = camere numeriche 100-999 SENZA prefisso
  if(/^(ART|LIB|CAPRI|NAPOLI|PROCIDA|ISCHIA|POSITANO|R[123]$)/.test(c)){}
  if(/^(CAPRI|NAPOLI|PROCIDA|ISCHIA|POSITANO)/.test(c))return'PR';
  if(/^LIB/.test(c))return'SL';
  if(/^R[123]$/.test(c))return'MS';
  // Boutique serie 200 (es. 200, 201...299) - ma SoulArt può avere 203
  // Usa prefisso dal PDF: "PC" = SoulArt, "AS" = Art Resort, "200" = Boutique
  // Camere numeriche: dipende dal documento — lascia all'AI
  if(/^\d+$/.test(c))return'SA'; // numeriche pure → SoulArt (default)
  return'NA';
}
function fixArriviStruttura(arrivi){
  return arrivi.map(a=>{
    const camera=a.camera||'';
    const c=camera.trim().toUpperCase();
    let struttura=a.struttura;
    if(/^(CAPRI|NAPOLI|PROCIDA|ISCHIA|POSITANO)/i.test(c))struttura='PR';
    else if(/^LIB/i.test(c))struttura='SL';
    else if(/^R[123]$/i.test(c))struttura='MS';
    else if(/^\d+$/.test(c)&&parseInt(c)>=200&&parseInt(c)<=299)struttura='BH'; // 200-299 → Boutique
    else struttura='SA'; // Art XX, altre numeriche → SoulArt
    return{...a,struttura};
  });
}
function strutLabel(s){return({SA:'SoulArt',AR:'Art Resort',BH:'Boutique',SL:'San Liborio',PR:'Principe',MS:'Mastrangelo',SB:'S.Brigida',NA:'Napoli'})[s]||s;}
function strutStyle(s){const styles={SA:'background:#e8eef8;color:#003580',AR:'background:#e8f5e9;color:#1b5e20',BH:'background:#fff3e0;color:#e65100',SL:'background:#f3e5f5;color:#6a1b9a',PR:'background:#fce4ec;color:#880e4f',MS:'background:#e8f5e9;color:#2e7d32',SB:'background:#e3f2fd;color:#0d47a1',NA:'background:var(--surface2);color:var(--text-dim)'};return styles[s]||'background:var(--surface2);color:var(--text-dim)';}
function openArriviModal(filtOrigine='all'){
  const modal=document.getElementById('arriviModal');
  if(!modal)return;
  if(!arriviData){
    modal.querySelector('#arriviModalBody').innerHTML=
      '<div style="text-align:center;padding:30px;color:var(--text-dim);">Carica prima il PDF arrivi dalla sidebar</div>';
  } else {
    renderArriviModal('all','all',filtOrigine);
  }
  modal.style.display='flex';
}
function closeArriviModal(){
  const modal=document.getElementById('arriviModal');
  if(modal)modal.style.display='none';
}
function renderArriviModal(filtStruttura='all', filtTratt='all', filtOrigine='all'){
  if(!arriviData)return;
  let list=arriviData.arrivi;
  if(filtStruttura!=='all')list=list.filter(a=>a.struttura===filtStruttura);
  if(filtTratt!=='all')list=list.filter(a=>a.trattamento===filtTratt);
  if(filtOrigine==='booking')list=list.filter(a=>/booking/i.test(a.origine||''));
  const strutture=[...new Set(arriviData.arrivi.map(a=>a.struttura))].sort();
  const trattamenti=[...new Set(arriviData.arrivi.map(a=>a.trattamento))].sort();
  const hasOrigine=arriviData.arrivi.some(a=>a.origine&&a.origine.trim());
  const origineBar=hasOrigine?`
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
    <span style="font-size:var(--fs-xxs);color:var(--text-dim);align-self:center;">Canale:</span>
    <button class="rev-filter-btn${filtOrigine==='all'?' active':''}" onclick="renderArriviModal('${filtStruttura}','${filtTratt}','all')">Tutti</button>
    <button class="rev-filter-btn${filtOrigine==='booking'?' active':''}" onclick="renderArriviModal('${filtStruttura}','${filtTratt}','booking')">${BK_ICON} Solo Booking.com</button>
  </div>`:'';
  const filterBar=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
    <span style="font-size:var(--fs-xxs);color:var(--text-dim);align-self:center;">Struttura:</span>
    ${['all',...strutture].map(s=>`<button class="rev-filter-btn${filtStruttura===s?' active':''}" onclick="renderArriviModal('${s}','${filtTratt}','${filtOrigine}')">${s==='all'?'Tutte':strutLabel(s)}</button>`).join('')}
    <span style="font-size:var(--fs-xxs);color:var(--text-dim);align-self:center;margin-left:8px;">Trattamento:</span>
    ${['all',...trattamenti].map(t=>`<button class="rev-filter-btn${filtTratt===t?' active':''}" onclick="renderArriviModal('${filtStruttura}','${t}','${filtOrigine}')">${t==='all'?'Tutti':t}</button>`).join('')}
  </div>`+origineBar;
  const cards=list.map(a=>{
    const alertBorder=a.alert?'border-color:var(--red);':'';
    const alertTop=a.alert?'background:#fff0f0;':'background:var(--surface2);';
    return`<div class="rc-card" style="${alertBorder}">
      <div class="rc-card-top" style="${alertTop}">
        <span class="rc-card-label">${strutLabel(a.struttura)}${a.alert?' ⚠️':''}</span>
        <span class="rc-card-room">Cam. ${a.camera}</span>
      </div>
      <div class="rc-card-guest">${a.ospite}</div>
      <div class="rc-card-dates">
        <div class="rc-date-cell"><div class="rc-date-label">Arrivo</div><div class="rc-date-val">${a.arrivo||'—'}</div></div>
        <div class="rc-date-cell"><div class="rc-date-label">Partenza</div><div class="rc-date-val">${a.partenza||'—'}</div></div>
        <div class="rc-date-cell"><div class="rc-date-label">Pax</div><div class="rc-date-val">${a.pax}</div></div>
      </div>
      <div class="rc-pills">
        <span class="rc-pill">${a.trattamento}</span>
        ${a.tipo_camera?`<span class="rc-pill">${a.tipo_camera}</span>`:''}
        ${a.origine?`<span class="rc-pill" style="background:${/booking/i.test(a.origine)?'var(--accent-bg)':'var(--surface2)'};color:${/booking/i.test(a.origine)?'var(--accent)':'var(--text-dim)'};font-weight:${/booking/i.test(a.origine)?'700':'400'};">${/booking/i.test(a.origine)?BK_ICON:''}${a.origine}</span>`:''}
      </div>
      ${a.note?`<div style="font-size:var(--fs-xxs);color:${a.alert?'var(--red)':'var(--text-muted)'};background:${a.alert?'rgba(220,53,69,.06)':'var(--surface2)'};border-radius:0 0 7px 7px;padding:6px 12px;border-top:1px solid var(--border-light);line-height:1.5;">${a.note}</div>`:''}
    </div>`;
  }).join('');
  const summary=`<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
    <div style="background:var(--accent-bg);border-radius:8px;padding:8px 14px;font-size:var(--fs-xs);">
      <span style="font-weight:700;color:var(--accent);">${list.length}</span> <span style="color:var(--text-dim);">arrivi${filtStruttura!=='all'?' ('+filtStruttura+')':''}</span>
    </div>
    <div style="background:var(--surface2);border-radius:8px;padding:8px 14px;font-size:var(--fs-xs);">
      <span style="font-weight:700;">${list.reduce((s,a)=>s+a.pax,0)}</span> <span style="color:var(--text-dim);">persone</span>
    </div>
    ${list.filter(a=>a.alert).length>0?`<div style="background:#fff3f3;border-radius:8px;padding:8px 14px;font-size:var(--fs-xs);">
      <span style="font-weight:700;color:var(--red);">⚠️ ${list.filter(a=>a.alert).length}</span> <span style="color:var(--text-dim);">note critiche</span>
    </div>`:''}
  </div>`;
  document.getElementById('arriviModalBody').innerHTML=
    filterBar+summary+`<div class="rc-card-grid">${cards}</div>`;
}

// §§ INVENTARIO DETERSIVI
let _invWh=localStorage.getItem('qm_inv_wh')||'sa';
let _invTab='stock';
let _invFilter='all'; // 'all' | 'alert' | 'ok'
let _invPeriod=30;    // giorni per analisi consumi

function invSetWh(wh,btn){
  _invWh=wh;
  try{localStorage.setItem('qm_inv_wh',wh);}catch(e){}
  document.querySelectorAll('.inv-wh-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  invRender();
}
function invSetTab(tab){
  _invTab=tab;
  ['stock','moves','analysis','catalog','orders'].forEach(t=>{
    const el=document.getElementById('invTab-'+t);
    if(!el)return;
    el.style.borderBottomColor=t===tab?'var(--accent)':'transparent';
    el.style.color=t===tab?'var(--accent)':'var(--text-dim)';
    const view=document.getElementById('inv-'+t+'-view');
    if(view)view.style.display=t===tab?'':'none';
  });
  invRender();
}
function invSetPeriod(days){
  _invPeriod=days;
  const{catalog,moves}=invGetData();
  invRenderAnalysis(catalog,moves);
}
function invSetFilter(f){
  _invFilter=f;
  const{catalog,moves}=invGetData();
  invRenderStock(catalog,moves);
}
function invGetData(){
  let catalog={},moves=[];
  try{catalog=JSON.parse(localStorage.getItem('qm_inv_catalog_'+_invWh)||'{}');}catch(e){}
  try{moves=JSON.parse(localStorage.getItem('qm_inv_moves_'+_invWh)||'[]');}catch(e){}
  return{catalog,moves};
}
function invCalcStock(catalog,moves){
  const result={};
  for(const bc of Object.keys(catalog)){
    const bm=moves.filter(m=>m.barcode===bc);
    if(!bm.length){result[bc]=0;continue;}
    let lastInit=-1;
    for(let i=bm.length-1;i>=0;i--){if(bm[i].type==='init'){lastInit=i;break;}}
    let qty=0;
    if(lastInit>=0){
      qty=bm[lastInit].qty;
      for(let i=lastInit+1;i<bm.length;i++){
        if(bm[i].type==='in')qty+=bm[i].qty;
        if(bm[i].type==='out')qty-=bm[i].qty;
      }
    }else{
      for(const m of bm){if(m.type==='in')qty+=m.qty;if(m.type==='out')qty-=m.qty;}
    }
    result[bc]=Math.round(qty*1000)/1000;
  }
  return result;
}
function invItemStatus(qty,soglia){
  if(qty<=0)return'out';
  if(soglia!=null&&qty<=soglia)return'low';
  return'ok';
}
function invLastMove(bc,moves){
  for(let i=moves.length-1;i>=0;i--){if(moves[i].barcode===bc)return moves[i];}
  return null;
}
function invFmtDate(ts){
  if(!ts)return'—';
  const d=new Date(ts),n=new Date();
  const sameDay=(a,b)=>a.getDate()===b.getDate()&&a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear();
  if(sameDay(d,n))return'oggi '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  const y=new Date(n);y.setDate(y.getDate()-1);
  if(sameDay(d,y))return'ieri';
  return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'});
}
function invRender(){
  const view=document.getElementById('view-inventario');
  if(!view||!view.classList.contains('active'))return;
  // Ripristina bottone struttura attivo
  document.querySelectorAll('.inv-wh-btn').forEach(b=>{
    b.classList.toggle('active',b.id==='invWh-'+_invWh);
  });
  const{catalog,moves}=invGetData();
  invRenderStock(catalog,moves);
  invRenderMoves(catalog,moves);
  invRenderAnalysis(catalog,moves);
  invRenderCatalog();
  // Ordini: fetch fresco da KV poi render
  (async()=>{
    try{
      const r=await fetch(PROXY+'/kv/get?key=qm_inv_orders',{cache:'no-store'});
      const j=await r.json();
      if(j&&j.value){try{localStorage.setItem('qm_inv_orders',j.value);}catch(e){}}
    }catch(e){}
    invRenderOrders();
  })();
}
function invRenderStock(catalog,moves){
  const el=document.getElementById('inv-stock-view');
  if(!el)return;
  const stock=invCalcStock(catalog,moves);
  // Build full item list with status
  const allItems=Object.entries(catalog).map(([bc,p])=>{
    const qty=stock[bc]??null;
    if(qty===null)return null;
    const status=invItemStatus(qty,p.soglia??null);
    const last=invLastMove(bc,moves);
    return{bc,name:p.name,unit:p.unit||'',soglia:p.soglia??null,qty,status,last};
  }).filter(Boolean).sort((a,b)=>{
    const ord={out:0,low:1,ok:2};
    if(ord[a.status]!==ord[b.status])return ord[a.status]-ord[b.status];
    return a.name.localeCompare(b.name,'it');
  });
  if(!allItems.length){
    el.innerHTML='<div style="padding:40px 20px;text-align:center;color:var(--text-dim);font-size:var(--fs-sm);">Nessun prodotto — apri lo scanner su smartphone per aggiungere prodotti</div>';
    return;
  }
  const tot=allItems.length;
  const nOut=allItems.filter(i=>i.status==='out').length;
  const nLow=allItems.filter(i=>i.status==='low').length;
  const nOk=allItems.filter(i=>i.status==='ok').length;
  const nAlert=nOut+nLow;
  // KPI chips
  const kpiHtml=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
    <div style="background:var(--surface);border:1px solid var(--border-light);border-radius:8px;padding:7px 13px;display:flex;align-items:center;gap:6px;">
      <span style="font-size:16px;font-weight:700;">${tot}</span>
      <span style="font-size:var(--fs-xxs);color:var(--text-dim);">prodotti</span>
    </div>
    ${nOut?`<div style="background:var(--red-bg);border:1px solid #e8b0ac;border-radius:8px;padding:7px 13px;display:flex;align-items:center;gap:6px;">
      <span style="font-size:16px;font-weight:700;color:var(--red);">⚠️ ${nOut}</span>
      <span style="font-size:var(--fs-xxs);color:var(--red);">esauriti</span>
    </div>`:''}
    ${nLow?`<div style="background:var(--amber-bg);border:1px solid #d4aa70;border-radius:8px;padding:7px 13px;display:flex;align-items:center;gap:6px;">
      <span style="font-size:16px;font-weight:700;color:var(--amber);">⏳ ${nLow}</span>
      <span style="font-size:var(--fs-xxs);color:var(--amber);">in allerta</span>
    </div>`:''}
    ${nAlert===0?`<div style="background:var(--green-bg);border:1px solid #90cca8;border-radius:8px;padding:7px 13px;display:flex;align-items:center;gap:6px;">
      <span style="font-size:16px;font-weight:700;color:var(--green);">✅ ${nOk}</span>
      <span style="font-size:var(--fs-xxs);color:var(--green);">tutto ok</span>
    </div>`:''}
  </div>`;
  // Filter buttons
  const fBtn=(f,label,count)=>`<button onclick="invSetFilter('${f}')" style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);font-size:var(--fs-xxs);cursor:pointer;font-weight:600;transition:all .12s;${_invFilter===f?'background:var(--accent);color:#fff;border-color:var(--accent);':'background:var(--surface);color:var(--text-muted);'}">${label} (${count})</button>`;
  const filterHtml=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
    ${fBtn('all','Tutti',tot)}
    ${nAlert?fBtn('alert','⚠️ Allerta',nAlert):''}
    ${fBtn('ok','✅ OK',nOk)}
  </div>`;
  // Apply filter
  const items=_invFilter==='alert'?allItems.filter(i=>i.status!=='ok'):_invFilter==='ok'?allItems.filter(i=>i.status==='ok'):allItems;
  // Column headers
  const hdrs=`<div class="inv-stock-row" style="padding:4px 12px 6px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-transform:uppercase;letter-spacing:.05em;">
    <div>Prodotto</div><div style="text-align:center;">Ultimo mov.</div><div style="text-align:center;">Soglia</div><div style="text-align:right;">Stock</div><div></div>
  </div>`;
  // Rows
  const rows=items.map(it=>{
    const borderColor=it.status==='out'?'var(--red)':it.status==='low'?'var(--amber)':'transparent';
    const qtyColor=it.status==='out'?'var(--red)':it.status==='low'?'var(--amber)':'var(--green)';
    const lastStr=invFmtDate(it.last?.ts);
    const sogliaStr=it.soglia!=null?`<span style="cursor:pointer;color:var(--text-muted);" onclick="invEditSoglia('${it.bc}')" title="Modifica soglia">${it.soglia}</span>`:`<span style="cursor:pointer;color:var(--text-dim);font-style:italic;" onclick="invEditSoglia('${it.bc}')" title="Imposta soglia">—</span>`;
    const unit=it.unit?`<span style="font-size:var(--fs-xxs);color:var(--text-dim);margin-left:2px;">${_esc(it.unit)}</span>`:'';
    return`<div class="inv-stock-row" style="align-items:center;padding:9px 12px;background:var(--surface);border:1px solid var(--border-light);border-left:3px solid ${borderColor};border-radius:8px;margin-bottom:5px;">
      <div style="font-size:var(--fs-xs);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${_esc(it.name)}">${_esc(it.name)}</div>
      <div style="font-size:var(--fs-xxs);color:var(--text-dim);text-align:center;">${lastStr}</div>
      <div style="font-size:var(--fs-xs);text-align:center;">${sogliaStr}</div>
      <div style="font-size:var(--fs-md);font-weight:700;color:${qtyColor};text-align:right;cursor:pointer;" onclick="invEditQty('${it.bc}',${it.qty})" title="Modifica quantità">${it.qty}${unit} <span style="font-size:10px;opacity:.4;">✏️</span></div>
      <div style="display:flex;gap:3px;justify-content:center;">
        <button onclick="invQuickRestock('${it.bc}')" style="background:var(--green-bg);border:1px solid #90cca8;border-radius:5px;cursor:pointer;font-size:12px;padding:2px 4px;color:var(--green);" title="Rifornimento rapido">⬆️</button>
        <button onclick="invDeleteProduct('${it.bc}')" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--text-dim);padding:2px;line-height:1;" title="Elimina prodotto">🗑</button>
      </div>
    </div>`;
  }).join('');
  const hint='<div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-top:8px;">💡 Clicca sulla soglia per impostarla — quando lo stock scende sotto viene evidenziato in arancione</div>';
  el.innerHTML=`<div style="max-width:560px;">${kpiHtml+filterHtml+hdrs+rows+(allItems.every(i=>i.soglia==null)?hint:'')}</div>`;
}
function invRenderMoves(catalog,moves){
  const el=document.getElementById('inv-moves-view');
  if(!el)return;
  const list=[...(moves||[])].reverse();
  if(!list.length){
    el.innerHTML='<div style="padding:40px 20px;text-align:center;color:var(--text-dim);font-size:var(--fs-sm);">Nessun movimento registrato</div>';
    return;
  }
  const icons={init:'📋',in:'⬆️',out:'⬇️'};
  const signs={init:'',in:'+',out:'−'};
  const colors={init:'var(--accent)',in:'var(--green)',out:'var(--red)'};
  let html='',lastDay='';
  for(const m of list){
    const p=catalog[m.barcode]||{name:m.barcode,unit:''};
    const d=new Date(m.ts);
    const dayKey=d.toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'long'});
    if(dayKey!==lastDay){
      html+=`<div style="font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:10px 2px 4px;">${dayKey}</div>`;
      lastDay=dayKey;
    }
    const ts=d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
    const unit=p.unit?' '+p.unit:'';
    const note=m.note?` · <em>${_esc(m.note)}</em>`:'';
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--surface);border:1px solid var(--border-light);border-radius:8px;margin-bottom:4px;">
      <div style="font-size:15px;flex-shrink:0;">${icons[m.type]}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--fs-xs);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(p.name)}</div>
        <div style="font-size:var(--fs-xxs);color:var(--text-dim);">${ts}${note}</div>
      </div>
      <div style="font-size:var(--fs-sm);font-weight:700;color:${colors[m.type]};flex-shrink:0;">${signs[m.type]}${m.qty}${unit}</div>
      <button onclick="invDeleteMove('${m.id}')" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--text-dim);padding:2px 0 2px 6px;flex-shrink:0;" title="Elimina movimento">🗑</button>
    </div>`;
  }
  el.innerHTML=`<div style="max-width:560px;">${html}</div>`;
}
async function invDeleteMove(id){
  if(!await cqConferma('Eliminare questo movimento?','La giacenza del prodotto verrà ricalcolata.',{ok:'Elimina'}))return;
  let moves=[];
  try{moves=JSON.parse(localStorage.getItem('qm_inv_moves_'+_invWh)||'[]');}catch(e){}
  const filtered=moves.filter(m=>m.id!==id);
  try{localStorage.setItem('qm_inv_moves_'+_invWh,JSON.stringify(filtered));}catch(e){}
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_inv_moves_'+_invWh,value:JSON.stringify(filtered)})}).catch(()=>{});
  invRender();
}
function invEditQty(bc,currentQty){
  let catalog={};
  try{catalog=JSON.parse(localStorage.getItem('qm_inv_catalog_'+_invWh)||'{}');}catch(e){}
  const p=catalog[bc];if(!p)return;
  const val=prompt(`Nuova quantità in stock per "${p.name}":`,currentQty);
  if(val===null)return;
  const n=parseFloat(val);
  if(isNaN(n)||n<0){cqAvviso('Quantità non valida');return;}
  let moves=[];
  try{moves=JSON.parse(localStorage.getItem('qm_inv_moves_'+_invWh)||'[]');}catch(e){}
  moves.push({id:Date.now()+'_'+Math.random().toString(36).slice(2),barcode:bc,type:'init',qty:n,ts:Date.now(),note:'Rettifica da dashboard'});
  try{localStorage.setItem('qm_inv_moves_'+_invWh,JSON.stringify(moves));}catch(e){}
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_inv_moves_'+_invWh,value:JSON.stringify(moves)})}).catch(()=>{});
  invRender();
}
function invEditSoglia(bc){
  let catalog={};
  try{catalog=JSON.parse(localStorage.getItem('qm_inv_catalog_'+_invWh)||'{}');}catch(e){}
  const p=catalog[bc];if(!p)return;
  const val=prompt(`Soglia minima per "${p.name}" (lascia vuoto per rimuovere):`,p.soglia!=null?p.soglia:'');
  if(val===null)return;
  const n=parseFloat(val);
  catalog[bc].soglia=(val.trim()===''||isNaN(n))?null:n;
  try{localStorage.setItem('qm_inv_catalog_'+_invWh,JSON.stringify(catalog));}catch(e){}
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_inv_catalog_'+_invWh,value:JSON.stringify(catalog)})}).catch(()=>{});
  invRender();
}
async function invDeleteProduct(bc){
  let catalog={};
  try{catalog=JSON.parse(localStorage.getItem('qm_inv_catalog_'+_invWh)||'{}');}catch(e){}
  const name=catalog[bc]?.name||bc;
  if(!await cqConferma('Eliminare questo prodotto dal catalogo?',`<strong>${name}</strong><br>I movimenti di questo magazzino verranno rimossi. L'altro magazzino non viene toccato.`,{ok:'Elimina'}))return;
  delete catalog[bc];
  try{localStorage.setItem('qm_inv_catalog_'+_invWh,JSON.stringify(catalog));}catch(e){}
  let moves=[];
  try{moves=JSON.parse(localStorage.getItem('qm_inv_moves_'+_invWh)||'[]');}catch(e){}
  const filtered=moves.filter(m=>m.barcode!==bc);
  try{localStorage.setItem('qm_inv_moves_'+_invWh,JSON.stringify(filtered));}catch(e){}
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_inv_moves_'+_invWh,value:JSON.stringify(filtered)})}).catch(()=>{});
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_inv_catalog_'+_invWh,value:JSON.stringify(catalog)})}).catch(()=>{});
  invRender();
}
function invQuickRestock(bc){
  // Apre inventory.html in nuova tab con il barcode pre-selezionato (via hash)
  window.open('inventory.html#restock='+encodeURIComponent(bc),'_blank');
}
function invRenderAnalysis(catalog,moves){
  const el=document.getElementById('inv-analysis-view');
  if(!el)return;
  const now=Date.now();
  const cutoff=_invPeriod>0?now-_invPeriod*86400000:0;
  const stock=invCalcStock(catalog,moves);
  const items=Object.entries(catalog).map(([bc,p])=>{
    const bm=moves.filter(m=>m.barcode===bc);
    const periodOuts=bm.filter(m=>m.type==='out'&&m.ts>=cutoff);
    const periodIns=bm.filter(m=>m.type==='in'&&m.ts>=cutoff);
    const consumo=periodOuts.reduce((s,m)=>s+m.qty,0);
    const rifornimento=periodIns.reduce((s,m)=>s+m.qty,0);
    const days=_invPeriod>0?_invPeriod:(bm.length?Math.max(1,Math.ceil((now-Math.min(...bm.map(m=>m.ts)))/86400000)):1);
    // Consumo settimanale: basato su scarichi (out). Il minimo 14gg per smorzare picchi
    // da pochi dati vale SOLO per "Tutto" (days ricavato dallo storico reale, che per un
    // prodotto appena inserito può essere di 1-2 giorni). Con un periodo fisso scelto
    // dall'utente (7/30/90) days è già quel numero: applicare comunque il minimo 14
    // dimezzava il consumo mostrato col filtro "7 giorni" (divideva per 14 invece che
    // per 7 un consumo reale di soli 7 giorni).
    const effectiveDays=_invPeriod>0?days:Math.max(14,days);
    const consumoSett=consumo>0?Math.round((consumo/effectiveDays)*7*10)/10:0;
    const consumoGg=consumoSett/7;
    const autonomia=consumoGg>0?Math.round((stock[bc]??0)/consumoGg):null;
    // Media settimanale/mensile "quanto dura in media" — SEMPRE su tutto lo storico del
    // prodotto, indipendente dal filtro periodo sopra: una media non deve cambiare a
    // seconda di cosa hai cliccato, altrimenti non è più una media ma un dato del periodo.
    // Stesso smorzamento minimo 14gg di "Tutto" (un prodotto con 2 soli giorni di storico
    // darebbe una media falsata).
    const allOuts=bm.filter(m=>m.type==='out').reduce((s,m)=>s+m.qty,0);
    const storicoDays=bm.length?Math.max(1,Math.ceil((now-Math.min(...bm.map(m=>m.ts)))/86400000)):1;
    const mediaDays=Math.max(14,storicoDays);
    const mediaSett=allOuts>0?Math.round((allOuts/mediaDays)*7*10)/10:0;
    const mediaMese=allOuts>0?Math.round((allOuts/mediaDays)*30*10)/10:0;
    // Consumo REALE (non media) negli ultimi 7gg e nel mese in corso a oggi — a fianco
    // delle medie storiche, per vedere se il ritmo recente si scosta da quello abituale.
    // Fissi, indipendenti dal filtro periodo sopra: "ultimi 7gg" è sempre gli ultimi 7gg
    // da adesso, non il consumo del periodo selezionato con quei bottoni.
    const cons7gg=bm.filter(m=>m.type==='out'&&m.ts>=now-7*86400000).reduce((s,m)=>s+m.qty,0);
    const meseStart=new Date();meseStart.setDate(1);meseStart.setHours(0,0,0,0);
    const consMeseCorr=bm.filter(m=>m.type==='out'&&m.ts>=meseStart.getTime()).reduce((s,m)=>s+m.qty,0);
    return{bc,name:p.name,unit:p.unit||'',qty:stock[bc]??0,consumo,rifornimento,consumoSett,mediaSett,mediaMese,cons7gg,consMeseCorr,autonomia,hasMoves:bm.length>0};
  }).filter(it=>it.hasMoves);

  if(!items.length){
    el.innerHTML='<div style="padding:40px 20px;text-align:center;color:var(--text-dim);font-size:var(--fs-sm);">Nessun dato — registra i movimenti con lo scanner</div>';
    return;
  }

  const totConsumo=items.reduce((s,i)=>s+i.consumo,0);
  const totRiforn=items.reduce((s,i)=>s+i.rifornimento,0);
  const critici=items.filter(i=>i.autonomia!==null&&i.autonomia>=0&&i.autonomia<=7);
  const preavviso=items.filter(i=>i.autonomia!==null&&i.autonomia>7&&i.autonomia<=14);

  // Periodo selector
  const pBtn=(d,lbl)=>`<button onclick="invSetPeriod(${d})" style="padding:5px 11px;border-radius:6px;border:1px solid var(--border);font-size:var(--fs-xxs);cursor:pointer;font-weight:600;transition:all .12s;${_invPeriod===d?'background:var(--accent);color:#fff;border-color:var(--accent);':'background:var(--surface);color:var(--text-muted);'}">${lbl}</button>`;
  const periodHtml=`<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">${pBtn(7,'7 giorni')}${pBtn(30,'30 giorni')}${pBtn(90,'90 giorni')}${pBtn(0,'Tutto')}</div>`;

  // KPI chips
  const topBySett=[...items].sort((a,b)=>b.consumoSett-a.consumoSett)[0];
  const kpi=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:16px;">
    <div style="background:var(--surface);border:1px solid var(--border-light);border-radius:9px;padding:10px 13px;">
      <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:3px;">Totale scaricato</div>
      <div style="font-size:20px;font-weight:700;">${Math.round(totConsumo*10)/10}</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border-light);border-radius:9px;padding:10px 13px;">
      <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:3px;">Totale caricato</div>
      <div style="font-size:20px;font-weight:700;color:var(--green);">${Math.round(totRiforn*10)/10}</div>
    </div>
    ${topBySett&&topBySett.consumoSett>0?`<div style="background:var(--surface);border:1px solid var(--border-light);border-radius:9px;padding:10px 13px;">
      <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:3px;">Più consumato/sett</div>
      <div style="font-size:var(--fs-xs);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(topBySett.name)}</div>
      <div style="font-size:var(--fs-xxs);color:var(--text-muted);">${topBySett.consumoSett} ${topBySett.unit}/sett</div>
    </div>`:''}
    ${critici.length>0?`<div style="background:var(--red-bg);border:1px solid #e8b0ac;border-radius:9px;padding:10px 13px;">
      <div style="font-size:var(--fs-xxs);color:var(--red);margin-bottom:3px;">Autonomia critica</div>
      <div style="font-size:20px;font-weight:700;color:var(--red);">${critici.length}</div>
      <div style="font-size:var(--fs-xxs);color:var(--red);">prodotti ≤7gg</div>
    </div>`:''}
  </div>`;

  // Sezione riordino urgente
  const urgenti=[...critici,...preavviso].sort((a,b)=>(a.autonomia??999)-(b.autonomia??999));
  const urgBlock=urgenti.length?`<div style="margin-bottom:16px;">
    <div style="font-size:var(--fs-xxs);font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim);margin-bottom:7px;">⚠️ Da riordinare</div>
    ${urgenti.map(it=>{
      const isRed=it.autonomia!==null&&it.autonomia<=7;
      const col=isRed?'var(--red)':'var(--amber)';
      const bg=isRed?'var(--red-bg)':'var(--amber-bg)';
      const brd=isRed?'#e8b0ac':'#d4aa70';
      const autLbl=it.autonomia<=0?'esaurito':it.autonomia===1?'1 giorno':`${it.autonomia} giorni`;
      return`<div style="display:flex;align-items:center;justify-content:space-between;background:${bg};border:1px solid ${brd};border-radius:8px;padding:8px 12px;margin-bottom:5px;">
        <div style="font-size:var(--fs-xs);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${_esc(it.name)}</div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;margin-left:10px;">
          <div style="font-size:var(--fs-xxs);color:var(--text-muted);">stock: <b>${it.qty}</b>${it.unit?` ${_esc(it.unit)}`:''}</div>
          <div style="font-size:var(--fs-xxs);font-weight:700;color:${col};">${autLbl}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`:'';

  // Tabella dettaglio — ordinata per consumo medio settimanale decrescente: i prodotti
  // che si consumano di più stanno in cima, non sparsi in mezzo all'ordine alfabetico.
  // "Opzione B" del confronto tra design fatto vedere all'utente: una sola riga di
  // intestazione (non due), un badge di testo al posto di due numeri colorati per riga
  // (con sei colonne quasi ogni riga aveva un colore, il colore smetteva di significare
  // qualcosa), i valori grezzi (media/reale per settimana e mese) spostati in un dettaglio
  // a tendina per prodotto invece di stare sempre in vista.
  const sorted=[...items].sort((a,b)=>b.mediaSett-a.mediaSett||a.name.localeCompare(b.name,'it'));
  // Badge unico che riassume l'andamento: guarda lo scarto più marcato tra i due periodi
  // (settimana/mese) invece di due giudizi separati che potrebbero anche contraddirsi.
  const ritmo=it=>{
    const rS=it.mediaSett>0?it.cons7gg/it.mediaSett:null;
    const rM=it.mediaMese>0?it.consMeseCorr/it.mediaMese:null;
    const cands=[rS,rM].filter(r=>r!==null);
    if(!cands.length)return{label:'nessun dato',bg:'var(--surface2)',fg:'var(--text-dim)'};
    const worst=Math.max(...cands),best=Math.min(...cands);
    if(worst>=1.3)return{label:'sopra media',bg:'var(--amber-bg)',fg:'var(--amber)'};
    if(best<=0.6)return{label:'sotto media',bg:'var(--green-bg)',fg:'var(--green)'};
    return{label:'in linea',bg:'var(--surface2)',fg:'var(--text-dim)'};
  };
  // Media/sett e Media/mese SEMPRE visibili in colonna (l'utente le deve vedere senza
  // dover aprire l'accordion) — solo il consumo REALE di dettaglio (ultimi 7gg/da inizio
  // mese) resta dietro al tocco, per non tornare a sei colonne colorate.
  const rows=sorted.map((it,i)=>{
    const borderL=it.autonomia!==null&&it.autonomia<=7?'var(--red)':it.autonomia!==null&&it.autonomia<=14?'var(--amber)':'transparent';
    const r=ritmo(it);
    const zebra=i%2===1?'background:var(--bg);':'';
    const detCell=(lbl,media,reale)=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:2px 0;">
      <span style="color:var(--text-dim);">${lbl}, reale</span>
      <span><b style="color:var(--text);">${reale>0?reale:'—'}</b> <span style="color:var(--text-muted);">(media ${media>0?media:'—'})</span></span>
    </div>`;
    return`<tr onclick="invAnToggle('${it.bc}')" style="${zebra}border-left:3px solid ${borderL};cursor:pointer;">
      <td style="padding:8px 10px;font-size:var(--fs-xs);font-weight:600;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${_esc(it.name)}">${_esc(it.name)}</td>
      <td style="padding:8px 8px;font-size:var(--fs-xs);text-align:right;color:var(--text-muted);white-space:nowrap;">${it.mediaSett>0?it.mediaSett:'—'}</td>
      <td style="padding:8px 8px;font-size:var(--fs-xs);text-align:right;color:var(--text-muted);white-space:nowrap;">${it.mediaMese>0?it.mediaMese:'—'}</td>
      <td style="padding:8px 10px;font-size:var(--fs-xs);text-align:right;color:var(--text-muted);white-space:nowrap;">${it.qty}${it.unit?' '+_esc(it.unit):''}</td>
      <td style="padding:8px 10px;text-align:right;"><span style="background:${r.bg};color:${r.fg};font-size:var(--fs-xxs);font-weight:700;padding:3px 10px;border-radius:10px;white-space:nowrap;">${r.label}</span></td>
      <td style="padding:8px 10px;text-align:center;color:var(--text-dim);font-size:11px;width:20px;"><span id="inv-an-chev-${it.bc}">▾</span></td>
    </tr>
    <tr id="inv-an-body-${it.bc}" style="display:none;${zebra}border-left:3px solid ${borderL};">
      <td colspan="6" style="padding:0 10px 10px;font-size:var(--fs-xs);">
        ${detCell('Settimana',it.mediaSett,it.cons7gg)}
        ${detCell('Mese',it.mediaMese,it.consMeseCorr)}
      </td>
    </tr>`;
  }).join('');
  const tableHtml=`<div style="overflow-x:auto;background:var(--surface);border:1px solid var(--border-light);border-radius:10px;">
    <table style="border-collapse:collapse;width:100%;">
      <thead><tr style="background:var(--bg);">
        <th style="padding:6px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:left;">Prodotto</th>
        <th style="padding:6px 8px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:right;" title="Media settimanale, tutto lo storico">Media/sett</th>
        <th style="padding:6px 8px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:right;" title="Media mensile, tutto lo storico">Media/mese</th>
        <th style="padding:6px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:right;">Stock</th>
        <th style="padding:6px 10px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-align:right;">Ritmo</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;

  el.innerHTML=periodHtml+kpi+urgBlock+`<div>
    <div style="font-size:var(--fs-xxs);font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim);margin-bottom:2px;">📋 Dettaglio prodotti</div>
    <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:7px;">Media = tutto lo storico. Tocca un prodotto per il consumo reale (ultimi 7gg / da inizio mese), indipendente dal periodo selezionato sopra, che riguarda solo i totali e "Da riordinare".</div>
  `+tableHtml+`</div>`;
}
function invAnToggle(bc){
  const body=document.getElementById('inv-an-body-'+bc);
  const chev=document.getElementById('inv-an-chev-'+bc);
  if(!body)return;
  const open=body.style.display!=='none';
  body.style.display=open?'none':'table-row';
  if(chev)chev.textContent=open?'▾':'▴';
}
function invPrintStock(){
  const{catalog,moves}=invGetData();
  const stock=invCalcStock(catalog,moves);
  const whName=_invWh==='sa'?'SoulArt Hotel':'Art Resort';
  const dateStr=new Date().toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

  const items=Object.entries(catalog).map(([bc,p])=>{
    const qty=stock[bc]??0;
    const status=invItemStatus(qty,p.soglia??null);
    return{name:p.name,unit:p.unit||'',qty,status,soglia:p.soglia??null};
  }).filter(i=>i.name).sort((a,b)=>a.name.localeCompare(b.name,'it'));

  const statusColor=s=>s==='out'?'#C0352A':s==='low'?'#A05A00':'#1E7A48';
  const statusLabel=s=>s==='out'?'ESAURITO':s==='low'?'BASSO':'OK';
  const rows=items.map((it,i)=>`
    <tr style="background:${i%2===0?'#fff':'#f8f8f9'};">
      <td style="padding:7px 10px;border-bottom:1px solid #e5e5e7;font-size:13px;">${it.name}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e5e5e7;font-size:13px;text-align:center;color:#666;">${it.unit}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e5e5e7;font-size:15px;font-weight:700;text-align:center;">${it.qty}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e5e5e7;text-align:center;">
        <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;color:${statusColor(it.status)};background:${it.status==='out'?'#fae2e0':it.status==='low'?'#fae8cc':'#d8f0e4'};">${statusLabel(it.status)}</span>
      </td>
      <td style="padding:7px 10px;border-bottom:1px solid #e5e5e7;font-size:12px;color:#999;text-align:center;">${it.soglia!==null?it.soglia:'—'}</td>
    </tr>`).join('');

  const html=`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
  <title>Giacenza ${whName} — ${dateStr}</title>
  <style>
    @page{size:A4;margin:18mm 15mm 18mm 15mm;}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1c1c1e;margin:0;}
    .header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;gap:16px;}
    h1{font-size:18px;font-weight:700;margin:0 0 3px;}
    .sub{font-size:12px;color:#888;}
    .date-badge{background:#1E4080;color:#fff;padding:10px 18px;border-radius:8px;text-align:center;flex-shrink:0;}
    .date-badge-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;opacity:.75;margin-bottom:4px;}
    .date-badge-value{font-size:15px;font-weight:700;line-height:1.2;}
    table{width:100%;border-collapse:collapse;}
    thead th{background:#1E4080;color:#fff;padding:8px 10px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;text-align:left;}
    thead th:nth-child(3),thead th:nth-child(4),thead th:nth-child(5){text-align:center;}
    tfoot td{padding:10px 10px 0;font-size:11px;color:#999;}
    .firma{margin-top:28px;display:flex;gap:40px;}
    .firma-box{flex:1;border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#666;}
  </style>
  </head><body>
  <div class="header">
    <div>
      <h1>📦 Giacenza Magazzino — ${whName}</h1>
      <div class="sub">Stampato il ${new Date().toLocaleString('it-IT')}</div>
    </div>
    <div class="date-badge">
      <div class="date-badge-label">Rilevazione al</div>
      <div class="date-badge-value">${dateStr}</div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Prodotto</th><th style="text-align:center;">Unità</th>
      <th style="text-align:center;">Quantità</th><th style="text-align:center;">Stato</th>
      <th style="text-align:center;">Soglia</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="5">${items.length} prodotti</td></tr></tfoot>
  </table>
  </body></html>`;

  const w=window.open('','_blank');
  w.document.write(html);
  w.document.close();
  w.onload=()=>w.print();
}

function invEditProduct(bc){
  let catalog={};
  try{catalog=JSON.parse(localStorage.getItem('qm_inv_catalog_'+_invWh)||'{}');}catch(e){}
  const p=catalog[bc];if(!p)return;
  const newName=prompt('Nome prodotto:',p.name);
  if(newName===null)return;
  if(!newName.trim()){cqAvviso('Il nome non può essere vuoto.');return;}
  const newUnit=prompt('Unità di misura (es. fl, kg, lt):',p.unit||'');
  if(newUnit===null)return;
  const sogliaRaw=prompt('Soglia minima (lascia vuoto per nessuna soglia):',p.soglia!=null?p.soglia:'');
  if(sogliaRaw===null)return;
  const n=parseFloat(sogliaRaw);
  catalog[bc]={...p,name:newName.trim(),unit:newUnit.trim(),soglia:(sogliaRaw.trim()===''||isNaN(n))?null:n};
  try{localStorage.setItem('qm_inv_catalog_'+_invWh,JSON.stringify(catalog));}catch(e){}
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_inv_catalog_'+_invWh,value:JSON.stringify(catalog)})}).catch(()=>{});
  invRender();
}
function invAddProduct(){
  let catalog={};
  try{catalog=JSON.parse(localStorage.getItem('qm_inv_catalog_'+_invWh)||'{}');}catch(e){}
  const name=prompt('Nome prodotto:','');
  if(name===null)return;
  if(!name.trim()){cqAvviso('Il nome non può essere vuoto.');return;}
  let bc=prompt('Codice a barre (lascia vuoto se non disponibile):','');
  if(bc===null)return;
  bc=bc.trim()||('manual_'+Date.now());
  if(catalog[bc]){cqAvviso('Codice già usato da un altro prodotto.');return;}
  const unit=prompt('Unità di misura (es. fl, kg, lt):','');
  if(unit===null)return;
  const sogliaRaw=prompt('Soglia minima (lascia vuoto per nessuna soglia):','');
  if(sogliaRaw===null)return;
  const n=parseFloat(sogliaRaw);
  catalog[bc]={name:name.trim(),unit:(unit||'').trim(),soglia:(sogliaRaw.trim()===''||isNaN(n))?null:n};
  try{localStorage.setItem('qm_inv_catalog_'+_invWh,JSON.stringify(catalog));}catch(e){}
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_inv_catalog_'+_invWh,value:JSON.stringify(catalog)})}).catch(()=>{});
  invRender();
}
function invRenderCatalog(){
  const el=document.getElementById('inv-catalog-view');
  if(!el)return;
  const{catalog}=invGetData();
  const items=Object.entries(catalog).sort((a,b)=>a[1].name.localeCompare(b[1].name,'it'));
  const addBtn=`<div style="max-width:560px;margin-bottom:10px;"><button onclick="invAddProduct()" style="padding:7px 14px;border-radius:7px;background:var(--accent);color:#fff;border:none;font-size:var(--fs-xs);font-weight:700;cursor:pointer;">+ Nuovo prodotto</button></div>`;
  if(!items.length){el.innerHTML=addBtn+'<div style="padding:32px;text-align:center;color:var(--text-dim);font-size:var(--fs-sm);">Nessun prodotto in catalogo</div>';return;}
  el.innerHTML=addBtn+`<div style="max-width:560px;"><div style="display:flex;flex-direction:column;gap:6px;padding:4px 0;">
    ${items.map(([bc,p])=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface);border:1px solid var(--border-light);border-radius:9px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--fs-sm);font-weight:600;">${_esc(p.name)}</div>
        <div style="display:flex;gap:8px;margin-top:2px;align-items:center;flex-wrap:wrap;">
          <span style="font-size:11px;font-family:monospace;background:var(--bg);padding:1px 6px;border-radius:4px;color:var(--text-dim);">${bc}</span>
          ${p.unit?`<span style="font-size:var(--fs-xxs);color:var(--text-dim);">${_esc(p.unit)}</span>`:''}
          ${p.soglia!=null?`<span style="font-size:var(--fs-xxs);color:var(--amber);">soglia: ${p.soglia}</span>`:''}
        </div>
      </div>
      <button onclick="invEditProduct('${bc}')" style="border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:13px;padding:4px 8px;border-radius:6px;color:var(--text-muted);" title="Modifica">✏️</button>
      <button onclick="invDeleteProduct('${bc}')" style="border:none;background:none;cursor:pointer;color:var(--red);font-size:16px;padding:4px 6px;" title="Elimina">🗑️</button>
    </div>`).join('')}
  </div></div>`;
}

function invUpdateNavBadge(){
  let total=0;
  for(const wh of['sa','ar']){
    let catalog={},wMoves=[];
    try{catalog=JSON.parse(localStorage.getItem('qm_inv_catalog_'+wh)||'{}');}catch(e){}
    try{wMoves=JSON.parse(localStorage.getItem('qm_inv_moves_'+wh)||'[]');}catch(e){}
    const stock=invCalcStock(catalog,wMoves);
    for(const[bc,qty]of Object.entries(stock)){
      const p=catalog[bc];if(!p)continue;
      if(invItemStatus(qty,p.soglia??null)!=='ok')total++;
    }
  }
  const navEl=document.querySelector('[onclick*="inventario"]');
  if(!navEl)return;
  let badge=navEl.querySelector('.nav-badge');
  if(!badge){badge=document.createElement('span');badge.className='nav-badge';navEl.appendChild(badge);}
  if(total>0){badge.style.background='var(--amber)';badge.textContent=total;badge.style.display='';}
  else{badge.style.display='none';}
}

// §§ INVENTARIO — ORDINI
// Struttura ordine: { id, wh, date (DD/MM/YYYY), ts, fornitore, note, status, tsRicevuto, items:[{barcode,name,unit,qty}] }
let _invOrdersWh='tutti';   // tutti | sa | ar
let _invOrdersStatus='tutti'; // tutti | ordinato | ricevuto | annullato
let _invOrdersDraft=[];      // items correnti nel modal di creazione

const ORD_KEY='qm_inv_orders';
function invOrdersGet(){try{return JSON.parse(localStorage.getItem(ORD_KEY)||'[]');}catch(e){return[];}}
function invOrdersSave(orders){
  const json=JSON.stringify(orders);
  try{localStorage.setItem(ORD_KEY,json);}catch(e){}
  kvSet(ORD_KEY,json).catch(()=>{});
}
const _ordFmtDate=ts=>{const d=new Date(ts);return String(d.getDate()).padStart(2,'0')+'/'+(String(d.getMonth()+1).padStart(2,'0'))+'/'+d.getFullYear();};
const _ordWhlabel=wh=>wh==='sa'?'SoulArt':'Art Resort';

function invOrdersBackfillQtyRicevuta(){
  const orders=invOrdersGet();
  let changed=false;
  orders.forEach(o=>{
    if(o.status!=='ricevuto')return;
    if(!(o.movIds&&o.movIds.length))return;
    const needsBackfill=(o.items||[]).some(it=>it.qtyRicevuta==null);
    if(!needsBackfill)return;
    let moves=[];
    try{moves=JSON.parse(localStorage.getItem('qm_inv_moves_'+o.wh)||'[]');}catch(e){}
    const movById=Object.fromEntries(moves.filter(m=>o.movIds.includes(m.id)).map(m=>[m.id,m]));
    // mappa barcode→qty dai movimenti di questo ordine
    const qtyByBarcode={};
    Object.values(movById).forEach(m=>{qtyByBarcode[m.barcode]=(qtyByBarcode[m.barcode]||0)+m.qty;});
    (o.items||[]).forEach(it=>{
      if(it.qtyRicevuta==null&&qtyByBarcode[it.barcode]!=null){
        it.qtyRicevuta=qtyByBarcode[it.barcode];
        changed=true;
      }
    });
  });
  if(changed)invOrdersSave(orders);
}

function invRenderOrders(){
  invOrdersBackfillQtyRicevuta();
  const view=document.getElementById('inv-orders-view');
  if(!view)return;
  const allOrders=invOrdersGet().sort((a,b)=>b.ts-a.ts);
  // catalogo combinato entrambi i magazzini
  let catSA={},catAR={};
  try{catSA=JSON.parse(localStorage.getItem('qm_inv_catalog_sa')||'{}');}catch(e){}
  try{catAR=JSON.parse(localStorage.getItem('qm_inv_catalog_ar')||'{}');}catch(e){}
  const cat={...catSA,...catAR};

  const filtered=allOrders.filter(o=>
    (_invOrdersWh==='tutti'||o.wh===_invOrdersWh)&&
    (_invOrdersStatus==='tutti'||o.status===_invOrdersStatus)
  );

  const sBadge=s=>s==='ordinato'
    ?`<span style="background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:10px;font-size:var(--fs-xxs);font-weight:600;">⏳ In attesa</span>`
    :s==='ricevuto'
    ?`<span style="background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:10px;font-size:var(--fs-xxs);font-weight:600;">✅ Ricevuto</span>`
    :`<span style="background:#FEE2E2;color:#991B1B;padding:2px 8px;border-radius:10px;font-size:var(--fs-xxs);font-weight:600;">✗ Annullato</span>`;
  const whBadge=wh=>`<span style="background:var(--accent-bg);color:var(--accent);padding:2px 8px;border-radius:10px;font-size:var(--fs-xxs);font-weight:700;">${_ordWhlabel(wh)}</span>`;

  const filterBtn=(val,cur,label,fn)=>`<button onclick="${fn}('${val}')" style="font-size:var(--fs-xxs);padding:4px 12px;border-radius:20px;border:1px solid ${cur===val?'var(--accent)':'var(--border)'};background:${cur===val?'var(--accent-bg)':'var(--surface)'};color:${cur===val?'var(--accent)':'var(--text-dim)'};cursor:pointer;font-weight:${cur===val?'700':'400'};">${label}</button>`;

  let h=`<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      ${filterBtn('tutti',_invOrdersWh,'Tutti gli hotel','invOrdersSetWh')}
      ${filterBtn('sa',_invOrdersWh,'SoulArt','invOrdersSetWh')}
      ${filterBtn('ar',_invOrdersWh,'Art Resort','invOrdersSetWh')}
    </div>
    <div style="display:flex;gap:6px;">
      <button onclick="invOrdersPrint()" style="font-size:var(--fs-xxs);padding:5px 12px;border-radius:6px;background:var(--surface);border:1px solid var(--border);cursor:pointer;">🖨️ Stampa lista</button>
      <button onclick="invOrdersOpenModal()" style="font-size:var(--fs-xxs);padding:5px 14px;border-radius:6px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-weight:600;">+ Nuovo ordine</button>
    </div>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
    ${filterBtn('tutti',_invOrdersStatus,'Tutti','invOrdersSetStatus')}
    ${filterBtn('ordinato',_invOrdersStatus,'⏳ In attesa','invOrdersSetStatus')}
    ${filterBtn('ricevuto',_invOrdersStatus,'✅ Ricevuti','invOrdersSetStatus')}
    ${filterBtn('annullato',_invOrdersStatus,'✗ Annullati','invOrdersSetStatus')}
  </div>`;

  if(!filtered.length){
    h+=`<div style="text-align:center;padding:40px;color:var(--text-dim);">Nessun ordine trovato.</div>`;
  } else {
    h+=`<div style="display:flex;flex-direction:column;gap:10px;max-width:420px;">`;
    filtered.forEach(o=>{
      const nItems=(o.items||[]).length;
      const rcvDate=o.tsRicevuto?` → ricevuto ${_ordFmtDate(o.tsRicevuto)}${o.ddt?' ('+o.ddt+')':''}`:'';
      const itemRows=(o.items||[]).map(it=>{
        const dispQty=it.qtyRicevuta!=null?it.qtyRicevuta:it.qty;
        const qtyCell=dispQty?`<td style="padding:7px 12px;font-size:var(--fs-xs);text-align:right;font-weight:700;">${dispQty}${it.unit?' '+it.unit:''}</td>`:`<td></td>`;
        return`<tr><td style="padding:7px 12px;font-size:var(--fs-xs);">${it.name}</td>${qtyCell}</tr>`;
      }).join('');
      // Messaggio WhatsApp
      const waLines=(o.items||[]).map(it=>it.qty?`• ${it.name} — ${it.qty}${it.unit?' '+it.unit:''}`:`• ${it.name}`).join('\n');
      const waText=encodeURIComponent(`📋 *Ordine del ${o.date}*\n🏨 ${_ordWhlabel(o.wh)}${o.fornitore?'\n🛒 Fornitore: '+o.fornitore:''}\n\n${waLines}\n\n_Quality Manager Paolo P._`);
      const waBtn=`<a href="https://wa.me/393274919588?text=${waText}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:var(--fs-xxs);padding:4px 10px;border-radius:6px;background:#25D366;color:#fff;text-decoration:none;font-weight:600;line-height:1.4;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.555 4.122 1.528 5.857L.057 23.882a.5.5 0 0 0 .607.65l6.277-1.638A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.13-1.418l-.36-.214-3.733.974.998-3.647-.236-.374A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        Invia</a>`;
      const actions=o.status==='ordinato'
        ?`<button onclick="invOrdersMarkReceived('${o.id}')" style="font-size:var(--fs-xxs);padding:4px 10px;border-radius:6px;background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;cursor:pointer;font-weight:600;">✅ Ricevuto</button>
           <button onclick="invOrdersEditOrder('${o.id}')" style="font-size:var(--fs-xxs);padding:4px 10px;border-radius:6px;background:var(--surface);border:1px solid var(--border);cursor:pointer;">✏️ Modifica</button>
           <button onclick="invOrdersCancel('${o.id}')" style="font-size:var(--fs-xxs);padding:4px 10px;border-radius:6px;background:var(--surface);border:1px solid var(--border);cursor:pointer;">Annulla</button>`
        :o.status==='ricevuto'
        ?`<button onclick="invOrdersUndoReceived('${o.id}')" style="font-size:var(--fs-xxs);padding:4px 10px;border-radius:6px;background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;cursor:pointer;">↩ Annulla ricezione</button>
           <button onclick="invOrdersDelete('${o.id}')" style="font-size:var(--fs-xxs);padding:4px 8px;border-radius:6px;background:var(--surface);border:1px solid var(--border);cursor:pointer;" title="Elimina">🗑</button>`
        :`<button onclick="invOrdersDelete('${o.id}')" style="font-size:var(--fs-xxs);padding:4px 8px;border-radius:6px;background:var(--surface);border:1px solid var(--border);cursor:pointer;" title="Elimina">🗑</button>`;
      h+=`<div style="background:var(--surface);border-radius:12px;border:1px solid var(--border-light);overflow:hidden;">
        <div style="padding:12px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <div style="flex:1;min-width:160px;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
              <span style="font-weight:700;font-size:var(--fs-sm);">📋 ${o.date}</span>
              ${whBadge(o.wh)}
              ${sBadge(o.status)}
            </div>
            <div style="font-size:var(--fs-xs);color:var(--text-dim);">${o.fornitore||'—'}${rcvDate}</div>
            <div style="font-size:var(--fs-xs);color:var(--text-dim);margin-top:2px;">${nItems} ${nItems===1?'prodotto':'prodotti'}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;">${waBtn}<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">${actions}</div></div>
        </div>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid var(--border-light);">
          <tbody>${itemRows}</tbody>
        </table>
      </div>`;
    });
    h+=`</div>`;
  }
  view.innerHTML=h;
  view.insertAdjacentHTML('beforeend',_invOrdersModalHTML(cat));
}

function _invOrdersModalHTML(cat){
  const today=(()=>{const n=new Date();return String(n.getDate()).padStart(2,'0')+'/'+(String(n.getMonth()+1).padStart(2,'0'))+'/'+n.getFullYear();})();
  const opts=Object.entries(cat).sort((a,b)=>a[1].name.localeCompare(b[1].name))
    .map(([bc,p])=>`<option value="${bc}">${p.name} (${p.unit})</option>`).join('');
  return`<div id="invOrderModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;align-items:center;justify-content:center;">
  <div style="background:var(--bg);border-radius:16px;padding:24px;width:min(520px,96vw);max-height:90vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.25);">
    <div style="font-weight:700;font-size:var(--fs-md);margin-bottom:16px;">📋 Nuovo ordine</div>
    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;">
        <label style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);display:block;margin-bottom:4px;">DATA ORDINE</label>
        <input id="invOrdDate" type="text" value="${today}" placeholder="DD/MM/YYYY" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:var(--fs-sm);">
      </div>
      <div style="flex:1;min-width:120px;">
        <label style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);display:block;margin-bottom:4px;">HOTEL</label>
        <select id="invOrdWh" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:var(--fs-sm);">
          <option value="sa">SoulArt Hotel</option>
          <option value="ar">Art Resort</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);display:block;margin-bottom:4px;">FORNITORE</label>
      <input id="invOrdFornitore" type="text" placeholder="es. Ecolab, Amazon, Lidl…" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:var(--fs-sm);">
    </div>
    <div style="margin-bottom:8px;">
      <label style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);display:block;margin-bottom:6px;">PRODOTTI</label>
      <div id="invOrdItems" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;"></div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        <select id="invOrdProd" style="flex:2;min-width:160px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:var(--fs-sm);">
          <option value="">— Seleziona prodotto —</option>${opts}
        </select>
        <input id="invOrdQty" type="number" min="1" placeholder="qty" style="width:60px;padding:7px 8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:var(--fs-sm);">
        <button onclick="invOrdersAddItem()" style="padding:7px 14px;border-radius:8px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-weight:600;white-space:nowrap;">+ Aggiungi</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--border-light);">
      <button onclick="document.getElementById('invOrderModal').style.display='none'" style="padding:8px 18px;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;">Annulla</button>
      <button onclick="invOrdersSubmit()" style="padding:8px 18px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-weight:600;cursor:pointer;">Salva ordine</button>
    </div>
  </div>
</div>`;
}

function invOrdersSetWh(w){_invOrdersWh=w;invRenderOrders();}
function invOrdersSetStatus(s){_invOrdersStatus=s;invRenderOrders();}

function invOrdersOpenModal(){
  _invOrdersDraft=[];
  const m=document.getElementById('invOrderModal');
  if(m){m.style.display='flex';_invOrdersDraftRender();}
}

function invOrdersAddItem(){
  const bc=document.getElementById('invOrdProd')?.value;
  if(!bc){cqAvviso('Seleziona un prodotto.');return;}
  const qtyRaw=parseInt(document.getElementById('invOrdQty')?.value)||0;
  const qty=qtyRaw>0?qtyRaw:null;
  let catSA={},catAR={};
  try{catSA=JSON.parse(localStorage.getItem('qm_inv_catalog_sa')||'{}');}catch(e){}
  try{catAR=JSON.parse(localStorage.getItem('qm_inv_catalog_ar')||'{}');}catch(e){}
  const cat={...catSA,...catAR};
  const prod=cat[bc]||{};
  const existing=_invOrdersDraft.find(i=>i.barcode===bc);
  if(existing){if(qty)existing.qty=(existing.qty||0)+qty;}
  else{_invOrdersDraft.push({barcode:bc,name:prod.name||bc,unit:prod.unit||'pz',qty});}
  document.getElementById('invOrdProd').value='';
  document.getElementById('invOrdQty').value='';
  _invOrdersDraftRender();
}

function _invOrdersDraftRender(){
  const el=document.getElementById('invOrdItems');
  if(!el)return;
  if(!_invOrdersDraft.length){el.innerHTML=`<div style="color:var(--text-dim);font-size:var(--fs-xxs);padding:6px 0;">Nessun prodotto aggiunto.</div>`;return;}
  el.innerHTML=_invOrdersDraft.map((it,i)=>`<div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid var(--border-light);border-radius:8px;padding:6px 10px;">
    <span style="font-size:var(--fs-sm);">${it.name}</span>
    <div style="display:flex;align-items:center;gap:8px;">
      ${it.qty?`<span style="font-weight:600;font-size:var(--fs-sm);">${it.qty}${it.unit?' '+it.unit:''}</span>`:''}
      <button onclick="invOrdersRemoveItem(${i})" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:14px;padding:2px 4px;">✕</button>
    </div>
  </div>`).join('');
}

function invOrdersRemoveItem(i){_invOrdersDraft.splice(i,1);_invOrdersDraftRender();}

function invOrdersSubmit(){
  const date=(document.getElementById('invOrdDate')?.value||'').trim();
  const wh=document.getElementById('invOrdWh')?.value||'sa';
  const fornitore=(document.getElementById('invOrdFornitore')?.value||'').trim();
  if(!date){cqAvviso('Inserisci la data ordine.');return;}
  if(!_invOrdersDraft.length){cqAvviso('Aggiungi almeno un prodotto.');return;}
  const orders=invOrdersGet();
  orders.push({id:Date.now()+'_'+Math.random().toString(36).slice(2,6),wh,date,ts:Date.now(),fornitore,status:'ordinato',items:[..._invOrdersDraft]});
  invOrdersSave(orders);
  document.getElementById('invOrderModal').style.display='none';
  _invOrdersDraft=[];
  invRenderOrders();
}

function invOrdersMarkReceived(id){
  const orders=invOrdersGet();
  const o=orders.find(x=>x.id===id);
  if(!o)return;
  // Carica catalogo del magazzino per il selettore prodotti extra
  let catalog={};
  try{catalog=JSON.parse(localStorage.getItem('qm_inv_catalog_'+o.wh)||'{}');}catch(e){}
  const catalogOpts=Object.entries(catalog).sort((a,b)=>a[1].name.localeCompare(b[1].name))
    .map(([bc,p])=>`<option value="${bc}" data-unit="${p.unit||''}">${p.name}</option>`).join('');
  window._ddtOrderId=id;
  window._ddtCatalogOpts=catalogOpts;
  window._ddtWh=o.wh;
  let rows=(o.items||[]).map((it,i)=>`
    <tr>
      <td style="padding:6px 8px;font-size:var(--fs-xs);">${it.name}</td>
      <td style="padding:6px 8px;font-size:var(--fs-xs);color:var(--text-dim);text-align:center;">${it.qty||''} ${it.unit||''}</td>
      <td style="padding:6px 8px;text-align:center;">
        <input type="number" min="0" step="1" value="${it.qty||0}" id="ddt_qty_${i}"
          style="width:70px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:var(--fs-xs);text-align:center;">
      </td>
    </tr>`).join('');
  const modal=document.createElement('div');
  modal.id='ddt-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML=`
    <div style="background:var(--surface);border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,.25);">
      <div style="font-weight:700;font-size:var(--fs-md);margin-bottom:4px;">📦 Ricevimento merce</div>
      <div style="font-size:var(--fs-xs);color:var(--text-dim);margin-bottom:14px;">Ordine ${o.date}${o.fornitore?' · '+o.fornitore:''}</div>
      <div style="margin-bottom:14px;">
        <label style="font-size:var(--fs-xs);font-weight:600;display:block;margin-bottom:4px;">N° DDT / documento di trasporto</label>
        <input id="ddt_num" type="text" placeholder="es. DDT 2026/1234" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--fs-xs);">
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;" id="ddt-table">
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th style="padding:6px 8px;font-size:var(--fs-xxs);text-align:left;color:var(--text-dim);">Prodotto</th>
            <th style="padding:6px 8px;font-size:var(--fs-xxs);text-align:center;color:var(--text-dim);">Ordinato</th>
            <th style="padding:6px 8px;font-size:var(--fs-xxs);text-align:center;color:var(--text-dim);">Consegnato</th>
          </tr>
        </thead>
        <tbody id="ddt-tbody">${rows}</tbody>
      </table>
      <button onclick="invDDTAddRow()" style="width:100%;padding:7px;border-radius:8px;border:1px dashed var(--border);background:transparent;font-size:var(--fs-xs);color:var(--accent);cursor:pointer;margin-bottom:16px;">+ Aggiungi prodotto non ordinato</button>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="document.getElementById('ddt-modal').remove()" style="padding:7px 16px;border-radius:8px;border:1px solid var(--border);background:var(--surface);font-size:var(--fs-xs);cursor:pointer;">Annulla</button>
        <button onclick="invOrdersConfirmDDT('${id}')" style="padding:7px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-size:var(--fs-xs);font-weight:600;cursor:pointer;">✅ Conferma ricezione</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function invDDTAddRow(){
  const tbody=document.getElementById('ddt-tbody');
  if(!tbody)return;
  const i='extra_'+Date.now();
  const tr=document.createElement('tr');
  tr.innerHTML=`
    <td style="padding:6px 8px;" colspan="2">
      <select id="ddt_sel_${i}" style="width:100%;padding:5px 6px;border:1px solid var(--border);border-radius:6px;font-size:var(--fs-xs);">
        <option value="">— seleziona prodotto —</option>
        ${window._ddtCatalogOpts||''}
      </select>
    </td>
    <td style="padding:6px 8px;text-align:center;">
      <input type="number" min="0" step="1" value="1" id="ddt_qty_${i}"
        data-extra="1" data-sel="ddt_sel_${i}"
        style="width:70px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:var(--fs-xs);text-align:center;">
    </td>`;
  tbody.appendChild(tr);
}

function invOrdersConfirmDDT(id){
  const orders=invOrdersGet();
  const o=orders.find(x=>x.id===id);
  if(!o)return;
  const ddtNum=(document.getElementById('ddt_num')?.value||'').trim();
  const movKey='qm_inv_moves_'+o.wh;
  const noteBase='DDT'+(ddtNum?' '+ddtNum:'')+' · '+o.date+(o.fornitore?' · '+o.fornitore:'');
  const createdIds=[];
  try{
    const moves=JSON.parse(localStorage.getItem(movKey)||'[]');
    // Prodotti dell'ordine
    (o.items||[]).forEach((it,i)=>{
      const qty=parseFloat(document.getElementById('ddt_qty_'+i)?.value||0);
      if(qty>0){const mid=Date.now()+'_'+Math.random().toString(36).slice(2,5);createdIds.push(mid);moves.push({id:mid,barcode:it.barcode,type:'in',qty,ts:Date.now(),note:noteBase});}
      it.qtyRicevuta=qty>0?qty:(it.qty||0);
    });
    // Prodotti extra aggiunti nel modal
    document.querySelectorAll('#ddt-tbody input[data-extra="1"]').forEach(inp=>{
      const qty=parseFloat(inp.value||0);
      const bc=document.getElementById(inp.dataset.sel)?.value||'';
      if(qty>0&&bc){const mid=Date.now()+'_'+Math.random().toString(36).slice(2,5);createdIds.push(mid);moves.push({id:mid,barcode:bc,type:'in',qty,ts:Date.now(),note:noteBase+' (extra)'});}
    });
    const json=JSON.stringify(moves);
    localStorage.setItem(movKey,json);
    kvSet(movKey,json).catch(()=>{});
  }catch(e){}
  o.status='ricevuto';
  o.tsRicevuto=Date.now();
  if(ddtNum) o.ddt=ddtNum;
  o.movIds=createdIds;
  invOrdersSave(orders);
  document.getElementById('ddt-modal')?.remove();
  invRenderOrders();
}

function invOrdersCancel(id){
  const orders=invOrdersGet();
  const o=orders.find(x=>x.id===id);
  if(o){o.status='annullato';invOrdersSave(orders);invRenderOrders();}
}

async function invOrdersUndoReceived(id){
  if(!await cqConferma('Annullare la ricezione?','I movimenti di carico creati verranno rimossi dall\'inventario e l\'ordine tornerà in attesa.',{ok:'Annulla ricezione'}))return;
  const orders=invOrdersGet();
  const o=orders.find(x=>x.id===id);
  if(!o)return;
  // Rimuove movimenti creati dal DDT
  const movKey='qm_inv_moves_'+o.wh;
  const ids=new Set(o.movIds||[]);
  if(ids.size>0){
    try{
      const moves=JSON.parse(localStorage.getItem(movKey)||'[]').filter(m=>!ids.has(m.id));
      const json=JSON.stringify(moves);
      localStorage.setItem(movKey,json);
      kvSet(movKey,json).catch(()=>{});
    }catch(e){}
  }
  o.status='ordinato';
  delete o.tsRicevuto;
  delete o.ddt;
  delete o.movIds;
  invOrdersSave(orders);
  invRenderOrders();
}

async function invOrdersDelete(id){
  if(!await cqConferma('Eliminare questo ordine?','L\'operazione non si può annullare.',{ok:'Elimina'}))return;
  const orders=invOrdersGet().filter(o=>o.id!==id);
  invOrdersSave(orders);
  invRenderOrders();
}

let _invEditDraft=[];
let _invEditId=null;

function invOrdersEditOrder(id){
  const orders=invOrdersGet();
  const o=orders.find(x=>x.id===id);
  if(!o)return;
  _invEditId=id;
  _invEditDraft=o.items.map(it=>({...it}));
  let catSA={},catAR={};
  try{catSA=JSON.parse(localStorage.getItem('qm_inv_catalog_sa')||'{}');}catch(e){}
  try{catAR=JSON.parse(localStorage.getItem('qm_inv_catalog_ar')||'{}');}catch(e){}
  const cat={...catSA,...catAR};
  const opts=Object.entries(cat).sort((a,b)=>a[1].name.localeCompare(b[1].name))
    .map(([bc,p])=>`<option value="${bc}">${p.name} (${p.unit||'pz'})</option>`).join('');
  const modal=document.createElement('div');
  modal.id='inv-edit-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML=`
    <div style="background:var(--surface);border-radius:16px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,.25);">
      <div style="font-weight:700;font-size:var(--fs-md);margin-bottom:4px;">✏️ Modifica ordine</div>
      <div style="font-size:var(--fs-xs);color:var(--text-dim);margin-bottom:14px;">${o.date}${o.fornitore?' · '+o.fornitore:''}</div>
      <div id="inv-edit-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;"></div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--border-light);margin-bottom:16px;">
        <select id="inv-edit-prod" style="flex:2;min-width:140px;padding:7px 8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:var(--fs-xs);">
          <option value="">— Aggiungi prodotto —</option>${opts}
        </select>
        <input id="inv-edit-qty" type="number" min="1" placeholder="qty" style="width:60px;padding:7px 6px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:var(--fs-xs);">
        <button onclick="invOrdersEditAddItem()" style="padding:7px 12px;border-radius:8px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-weight:600;font-size:var(--fs-xs);">+</button>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="document.getElementById('inv-edit-modal').remove()" style="padding:7px 16px;border-radius:8px;border:1px solid var(--border);background:var(--surface);font-size:var(--fs-xs);cursor:pointer;">Annulla</button>
        <button onclick="invOrdersEditSave()" style="padding:7px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-size:var(--fs-xs);font-weight:600;cursor:pointer;">💾 Salva</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  _invEditDraftRender();
}

function _invEditDraftRender(){
  const el=document.getElementById('inv-edit-list');
  if(!el)return;
  if(!_invEditDraft.length){el.innerHTML=`<div style="color:var(--text-dim);font-size:var(--fs-xs);padding:4px 0;">Nessun prodotto.</div>`;return;}
  el.innerHTML=_invEditDraft.map((it,i)=>`
    <div style="display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--border-light);border-radius:8px;padding:7px 10px;">
      <span style="flex:1;font-size:var(--fs-xs);">${it.name}</span>
      <input type="number" min="0" step="1" value="${it.qty||''}" placeholder="—" id="ied_qty_${i}"
        style="width:65px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:var(--fs-xs);text-align:center;">
      ${it.unit?`<span style="font-size:var(--fs-xxs);color:var(--text-dim);">${it.unit}</span>`:''}
      <button onclick="invOrdersEditRemove(${i})" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:14px;padding:2px 4px;flex-shrink:0;">✕</button>
    </div>`).join('');
}

function invOrdersEditAddItem(){
  const bc=document.getElementById('inv-edit-prod')?.value;
  if(!bc)return;
  const qtyRaw=parseInt(document.getElementById('inv-edit-qty')?.value)||0;
  const qty=qtyRaw>0?qtyRaw:null;
  let catSA={},catAR={};
  try{catSA=JSON.parse(localStorage.getItem('qm_inv_catalog_sa')||'{}');}catch(e){}
  try{catAR=JSON.parse(localStorage.getItem('qm_inv_catalog_ar')||'{}');}catch(e){}
  const cat={...catSA,...catAR};
  const prod=cat[bc]||{};
  const existing=_invEditDraft.find(i=>i.barcode===bc);
  if(existing){if(qty)existing.qty=(existing.qty||0)+qty;}
  else{_invEditDraft.push({barcode:bc,name:prod.name||bc,unit:prod.unit||'pz',qty});}
  document.getElementById('inv-edit-prod').value='';
  document.getElementById('inv-edit-qty').value='';
  _invEditDraftRender();
}

function invOrdersEditRemove(i){_invEditDraft.splice(i,1);_invEditDraftRender();}

function invOrdersEditSave(){
  // Legge le qty dai campi input prima di salvare
  _invEditDraft.forEach((it,i)=>{
    const el=document.getElementById('ied_qty_'+i);
    if(el){const v=parseFloat(el.value);it.qty=isNaN(v)||v<=0?null:v;}
  });
  const orders=invOrdersGet();
  const o=orders.find(x=>x.id===_invEditId);
  if(!o)return;
  o.items=[..._invEditDraft];
  invOrdersSave(orders);
  document.getElementById('inv-edit-modal')?.remove();
  invRenderOrders();
}

function invOrdersPrint(){
  const allOrders=invOrdersGet().sort((a,b)=>b.ts-a.ts);
  const filtered=allOrders.filter(o=>
    (_invOrdersWh==='tutti'||o.wh===_invOrdersWh)&&
    (_invOrdersStatus==='tutti'||o.status===_invOrdersStatus)
  );
  if(!filtered.length){cqAvviso('Nessun ordine da stampare.');return;}
  const sBadgeTxt=s=>s==='ordinato'?'In attesa':s==='ricevuto'?'Ricevuto':'Annullato';
  const rows=filtered.map(o=>{
    const itemList=(o.items||[]).map(it=>`<tr><td style="padding:3px 8px;font-size:11px;">${it.name}</td><td style="padding:3px 8px;font-size:11px;text-align:right;">${it.qty?it.qty+(it.unit?' '+it.unit:''):''}</td></tr>`).join('');
    const rcv=o.tsRicevuto?` → Ricevuto ${_ordFmtDate(o.tsRicevuto)}`:'';
    return`<div style="border:1px solid #ddd;border-radius:8px;margin-bottom:12px;overflow:hidden;break-inside:avoid;">
      <div style="background:#f5f5f5;padding:8px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #ddd;">
        <span style="font-weight:700;font-size:13px;">📋 ${o.date}</span>
        <span style="background:#1E4080;color:#fff;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${_ordWhlabel(o.wh)}</span>
        <span style="font-size:11px;color:#555;">${o.fornitore||'—'}${rcv}</span>
        <span style="margin-left:auto;font-size:11px;font-weight:600;color:${o.status==='ricevuto'?'#065F46':o.status==='ordinato'?'#92400E':'#991B1B'};">${sBadgeTxt(o.status)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr><th style="padding:5px 8px;font-size:11px;text-align:left;color:#555;font-weight:600;border-bottom:1px solid #eee;">Prodotto</th><th style="padding:5px 8px;font-size:11px;text-align:right;color:#555;font-weight:600;border-bottom:1px solid #eee;">Quantità</th></tr></thead>
        <tbody>${itemList}</tbody>
      </table>
    </div>`;
  }).join('');
  const whLabel=_invOrdersWh==='tutti'?'Tutti gli hotel':_ordWhlabel(_invOrdersWh);
  const sLabel=_invOrdersStatus==='tutti'?'Tutti gli stati':sBadgeTxt(_invOrdersStatus);
  const now=new Date();
  const nowStr=now.getDate()+'/'+(now.getMonth()+1)+'/'+now.getFullYear()+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ordini Inventario</title>
  <style>body{font-family:Arial,sans-serif;margin:20mm 15mm;color:#111;}h1{font-size:16px;margin:0 0 4px;}p{font-size:11px;color:#555;margin:0 0 16px;}@media print{body{margin:10mm 12mm;}}</style>
  </head><body>
  <h1>Ordini Inventario — ${whLabel}</h1>
  <p>Filtro: ${sLabel} · ${filtered.length} ordini · Stampato il ${nowStr} · Quality Manager Paolo P.</p>
  ${rows}
  </body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),300);
}

// §§ PREFERENZE TURNI
const TURNI_PREF_URL='https://script.google.com/macros/s/AKfycbzCbHxJbSfxg8X49w2JlfI9xo3HqhDiOa6E_0SDstdrvpQTQfqd2euaGp1oIK3zo0CA/exec';
let _tpData=[];
let _tpFilter='tutti';
let _tpFilterNome='';
let _tpCalYear=new Date().getFullYear();
let _tpCalMonth=new Date().getMonth(); // 0-based
let _tpCalDay=null; // giorno selezionato nel calendario (dd/MM/yyyy)

function turniPrefUpdateBadge(){
  const badge=document.getElementById('turniPrefBadge');
  if(!badge)return;
  // Usa un singolo timestamp "letto fino a" invece di un array di 307 voci
  const until=localStorage.getItem('qm_tp_seen_until')||'';
  const nuovi=until
    ? _tpData.filter(r=>r.ts&&r.ts>until).length
    : 0; // se non c'è ancora il valore, non mostrare badge (prima apertura)
  if(nuovi>0){badge.textContent=nuovi;badge.style.display='';}
  else{badge.style.display='none';}
}

async function turniPrefLoad(){
  if(!TURNI_PREF_URL)return;
  try{
    const res=await fetch(TURNI_PREF_URL);
    const json=await res.json();
    const richieste=json.richieste||[];
    _tpData=richieste;
    try{localStorage.setItem('qm_turni_pref',JSON.stringify(richieste));}catch(e){}
    turniPrefUpdateBadge();
    const view=document.getElementById('view-turni-pref');
    if(view&&view.classList.contains('active'))turniPrefRender();
  }catch(e){console.warn('turniPrefLoad error',e);}
}

function turniPrefRestore(){
  try{
    const raw=localStorage.getItem('qm_turni_pref');
    if(raw){_tpData=JSON.parse(raw)||[];}
  }catch(e){}
  turniPrefUpdateBadge();
}

function turniPrefMarkAllSeen(){
  // Salva il ts più recente come "letto fino a" — singolo valore, non array
  const tsList=_tpData.map(r=>r.ts).filter(Boolean).sort();
  const until=tsList[tsList.length-1]||new Date().toISOString();
  try{localStorage.setItem('qm_tp_seen_until',until);}catch(e){}
  kvSet('qm_tp_seen_until',until).catch(()=>{});
  turniPrefUpdateBadge();
  turniPrefRender();
}

function turniPrefSetFilter(f){
  _tpFilter=f;
  turniPrefRender();
}

function turniPrefNavCal(dir){_tpCalMonth+=dir;if(_tpCalMonth>11){_tpCalMonth=0;_tpCalYear++;}else if(_tpCalMonth<0){_tpCalMonth=11;_tpCalYear--;}turniPrefRender();}
function turniPrefSelectDay(d){_tpCalDay=_tpCalDay===d?null:d;turniPrefRender();}

// Normalizza qualsiasi formato data → dd/MM/yyyy
// Gestisce: "dd/MM/yyyy", "yyyy-MM-dd[T...]", "Sun Apr 06 2025 22:00:00 GMT+0200 (CEST)"
function _tpFmtDate(s){
  if(!s)return'—';
  const str=String(s).trim();
  if(!str||str==='—')return'—';
  // Già dd/MM/yyyy
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(str))return str;
  // ISO yyyy-MM-dd[T...]
  const iso=str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso)return`${iso[3]}/${iso[2]}/${iso[1]}`;
  // JS Date.toString: "... MonName DD YYYY ..." es. "Sun Apr 06 2025 22:00:00 GMT+0200"
  const jsdt=str.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})\b/);
  if(jsdt){const mo={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};const m=mo[jsdt[1]];if(m)return`${String(jsdt[2]).padStart(2,'0')}/${m}/${jsdt[3]}`;}
  // Fallback: native parse con timezone Rome
  try{const d=new Date(str);if(!isNaN(d.getTime()))return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Rome'});}catch(e){}
  return str.split(' ')[0].split('T')[0]||'—';
}

function turniPrefRender(){
  const el=document.getElementById('turni-pref-content');
  if(!el)return;
  const seenUntil=localStorage.getItem('qm_tp_seen_until')||'';

  if(!_tpData.length){
    el.innerHTML='<div style="padding:40px 20px;text-align:center;color:var(--text-dim);font-size:var(--fs-sm);">Nessuna richiesta ricevuta</div>';
    return;
  }

  // Conta richieste per giorno — normalizza togliendo orario
  const countByDay={};
  _tpData.forEach(r=>{
    if(!r.giornoRichiesto)return;
    if(_tpFilter!=='tutti'&&r.reparto!==_tpFilter)return;
    const k=_tpFmtDate(r.giornoRichiesto);
    if(k!=='—')countByDay[k]=(countByDay[k]||0)+1;
  });

  // Calendario mensile
  const mesiIt=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const giorniIt=['L','M','M','G','V','S','D'];
  const today=new Date();
  const todayKey=`${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;
  const firstDay=new Date(_tpCalYear,_tpCalMonth,1);
  const daysInMonth=new Date(_tpCalYear,_tpCalMonth+1,0).getDate();
  // giorno settimana del 1° (0=dom→adatta a lun=0)
  let startDow=(firstDay.getDay()+6)%7;

  let calCells='';
  // intestazione giorni
  calCells+=giorniIt.map(g=>`<div style="text-align:center;font-size:10px;font-weight:700;color:var(--text-dim);padding:4px 0;">${g}</div>`).join('');
  // celle vuote iniziali
  for(let i=0;i<startDow;i++)calCells+=`<div></div>`;
  // giorni
  for(let d=1;d<=daysInMonth;d++){
    const key=`${String(d).padStart(2,'0')}/${String(_tpCalMonth+1).padStart(2,'0')}/${_tpCalYear}`;
    const cnt=countByDay[key]||0;
    const isToday=key===todayKey;
    const isSel=key===_tpCalDay;
    const bg=isSel?'var(--accent)':cnt>=3?'#1a3a70':cnt>=2?'#1e4a90':cnt>=1?'var(--accent-bg)':'var(--surface)';
    const col=isSel?'#fff':cnt>=2?'#fff':cnt>=1?'var(--accent)':'var(--text-dim)';
    const border=isToday?'2px solid var(--accent)':'1px solid var(--border-light)';
    calCells+=`<div onclick="turniPrefSelectDay('${key}')" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border:${border};border-radius:7px;background:${bg};cursor:${cnt>0||isSel?'pointer':'default'};transition:all .12s;user-select:none;">
      <div style="font-size:12px;font-weight:${isToday?'800':'600'};color:${col};line-height:1;">${d}</div>
      ${cnt>0?`<div style="font-size:10px;font-weight:700;color:${isSel?'rgba(255,255,255,.85)':cnt>=2?'rgba(255,255,255,.85)':'var(--accent)'};margin-top:1px;">${cnt}</div>`:''}
    </div>`;
  }

  const calHtml=`<div style="max-width:360px;margin-bottom:18px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <button onclick="turniPrefNavCal(-1)" style="border:none;background:none;font-size:16px;cursor:pointer;color:var(--text-muted);padding:4px 8px;">‹</button>
      <div style="font-size:var(--fs-sm);font-weight:700;">${mesiIt[_tpCalMonth]} ${_tpCalYear}</div>
      <button onclick="turniPrefNavCal(1)" style="border:none;background:none;font-size:16px;cursor:pointer;color:var(--text-muted);padding:4px 8px;">›</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">${calCells}</div>
    ${_tpCalDay?`<div style="margin-top:8px;font-size:var(--fs-xxs);color:var(--accent);font-weight:600;">📅 Filtro: ${_tpCalDay} — <span onclick="turniPrefSelectDay('${_tpCalDay}')" style="cursor:pointer;text-decoration:underline;">rimuovi</span></div>`:''}
  </div>`;

  // Reparti disponibili
  const reparti=[...new Set(_tpData.map(r=>r.reparto).filter(Boolean))].sort();
  const nuovi=seenUntil ? _tpData.filter(r=>r.ts&&r.ts>seenUntil).length : 0;

  // Toolbar filtri
  const fBtn=(f,lbl)=>`<button onclick="turniPrefSetFilter('${f}')" style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);font-size:var(--fs-xxs);cursor:pointer;font-weight:600;transition:all .12s;${_tpFilter===f?'background:var(--accent);color:#fff;border-color:var(--accent);':'background:var(--surface);color:var(--text-muted);'}">${lbl}</button>`;
  const toolbar=`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
    ${fBtn('tutti','Tutti')}${reparti.map(r=>fBtn(r,r)).join('')}
    <div style="flex:1;"></div>
    ${nuovi>0?`<button onclick="turniPrefMarkAllSeen()" style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);font-size:var(--fs-xxs);cursor:pointer;background:var(--surface);color:var(--text-muted);">✓ Letti</button>`:''}
    <button onclick="turniPrefLoad()" style="padding:5px 10px;border-radius:6px;border:1px solid var(--border);font-size:var(--fs-xxs);cursor:pointer;background:var(--surface);color:var(--text-muted);" title="Aggiorna">↺</button>
  </div>`;

  // Lista richieste
  let items=_tpData;
  if(_tpFilter!=='tutti')items=items.filter(r=>r.reparto===_tpFilter);
  if(_tpCalDay)items=items.filter(r=>_tpFmtDate(r.giornoRichiesto)===_tpCalDay);

  const prefColor=p=>{const u=(p||'').toUpperCase();if(u.includes('FERIE'))return'var(--amber)';if(u.includes('RIPOSO'))return'var(--text-muted)';if(u.includes('CHIUSURA')||u.includes('APERTURA'))return'var(--accent)';return'var(--text)';};

  // Riga singola richiesta — estratta per essere riusata sia nella vista raggruppata
  // per mese (nessun giorno selezionato) sia nella vista piatta (giorno selezionato).
  const rowHtml=r=>{
    const isNew=seenUntil ? (r.ts&&r.ts>seenUntil) : false;
    const d=new Date(r.ts);
    const tsStr=isNaN(d)?_tpFmtDate(r.ts):d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});
    return`<div style="background:var(--surface);border:1px solid var(--border-light);border-left:3px solid ${isNew?'var(--accent)':'transparent'};border-radius:8px;padding:11px 14px;margin-bottom:5px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;">
      <div>
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
          ${isNew?'<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;background:var(--accent);color:#fff;flex-shrink:0;">NUOVO</span>':''}
          <span style="font-size:var(--fs-xs);font-weight:700;">${_esc(r.nome)}</span>
          <span style="font-size:var(--fs-xxs);color:var(--text-dim);background:var(--bg);padding:1px 7px;border-radius:4px;">${_esc(r.reparto)}</span>
        </div>
        <div style="font-size:var(--fs-xs);font-weight:700;color:${prefColor(r.preferenza)};margin-bottom:3px;">${_esc(r.preferenza)}</div>
        <div style="display:flex;gap:12px;font-size:var(--fs-xxs);color:var(--text-muted);">
          <span>📅 Per il <b>${_esc(_tpFmtDate(r.giornoRichiesto))}</b></span>
          <span>Richiesta: ${_esc(_tpFmtDate(r.dataRichiesta))}</span>
        </div>
        ${r.motivazione?`<div style="margin-top:4px;font-size:var(--fs-xxs);color:var(--text-dim);font-style:italic;">${_esc(r.motivazione)}</div>`:''}
      </div>
      <div style="font-size:10px;color:var(--text-dim);white-space:nowrap;">${tsStr}</div>
    </div>`;
  };

  let listHtml='';
  if(!items.length){
    listHtml='<div style="padding:20px 0;text-align:center;color:var(--text-dim);font-size:var(--fs-sm);">Nessuna richiesta</div>';
  } else if(_tpCalDay){
    // Giorno selezionato dal calendario: chi ha chiesto cosa PER quel giorno, subito —
    // niente raggruppamento per mese di invio (fuorviante quando si è già filtrato per
    // un giorno preciso, e nascondeva le richieste sotto etichette di mesi diversi).
    listHtml+=`<div style="font-size:var(--fs-xxs);font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim);margin:12px 0 6px;">Richieste per il ${_tpCalDay}</div>`;
    items.forEach(r=>{listHtml+=rowHtml(r);});
  } else {
    const grouped={};
    items.forEach(r=>{
      const d=new Date(r.ts);
      const key=isNaN(d)?'—':d.toLocaleDateString('it-IT',{month:'long',year:'numeric'});
      if(!grouped[key])grouped[key]=[];
      grouped[key].push(r);
    });
    Object.entries(grouped).forEach(([mese,rows])=>{
      listHtml+=`<div style="font-size:var(--fs-xxs);font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim);margin:12px 0 6px;">${mese}</div>`;
      rows.forEach(r=>{listHtml+=rowHtml(r);});
    });
  }

  el.innerHTML=toolbar+calHtml+listHtml;
}

// §§ CONTROLLO MATTINO (cmLoad, cmRender)
const CM_CHECKS=[
  {id:'acqua',items:[{id:'a1'},{id:'a2'},{id:'a3'},{id:'a4'},{id:'a5'}]},
  {id:'scrivania',items:[{id:'s1'},{id:'s2'},{id:'s3'},{id:'s4'},{id:'s5'},{id:'s6'},{id:'s7'},{id:'s8'},{id:'s9'},{id:'s10'},{id:'s11'},{id:'s12'},{id:'s13'}]},
  {id:'amenities',items:[{id:'m1'},{id:'m2'},{id:'m3'}]},
];
const CM_LABELS={
  a1:'Vassoio in angolo pulito',a2:'Bottiglia Culligan',a3:'Eticchetta/logo/QR',a4:'Cartellino Benvenuti',a5:'2 bicchieri capovolti',
  s1:'Cartello Non Disturbare',s2:'Bollitore elettrico',s3:'2 tazze+piattini',s4:'2× Nescafé',s5:'2× Tè V1',s6:'2× Tè V2',s7:'2× Camomilla',
  s8:'2× Zucchero bianco',s9:'2× Zucchero canna',s10:'1× Biscotti',s11:'2× Bacchette',s12:'Cataloghi arte',s13:'Pulizia superfici',
  m1:'Body Lotion',m2:'Shoe Sponge',m3:'2× Sapone'
};
const CM_ROOMS=Array.from({length:22},(_,i)=>'Art '+(i+1));

async function cmLoad(){
  const d=new Date();
  const key='qm_cm_'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  let data=null;
  try{
    const r=await fetch(PROXY+'/kv/get?key='+encodeURIComponent(key),{cache:'no-store'});
    if(r.ok){const j=await r.json();if(j&&j.value){data=JSON.parse(j.value);try{localStorage.setItem(key,j.value);}catch(e){}}}
  }catch(e){}
  if(!data){
    try{const r=localStorage.getItem(key);if(r)data=JSON.parse(r);}catch(e){}
  }
  cmRender(data,key);
}

function cmRender(state,key){
  const el=document.getElementById('cm-content');
  if(!el)return;
  const d=new Date();
  const dateStr=d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  // Nessun dato ancora per oggi (es. subito dopo mezzanotte, prima che il giro mobile
  // inizi) — mostra comunque la card completa con bottiglia vuota e tutte le camere
  // "da visitare", invece di un placeholder che lascia la pagina vuota fino al primo
  // salvataggio da smartphone.
  state=state||{};
  // Camere effettivamente occupate oggi secondo il Piano Settimana — stessa logica
  // dell'app smartphone (_applyPianoLibere): le camere non in partenze/fermate/cambi
  // sono "libere" e non contano come "da visitare", altrimenti il totale mostrato
  // resta sempre fisso a 22 anche quando l'hotel non è pieno.
  const giornoIdx=pianoGetGiornoIdx(d);
  const giornoCM=(pianoData&&pianoData.giorni&&giornoIdx>=0)?pianoData.giorni[giornoIdx]:null;
  const inPlan=giornoCM?new Set([...(giornoCM.soulart?.partenze||[]),...(giornoCM.soulart?.fermate||[]),...(giornoCM.soulart?.cambi||[])]):null;
  function cmStatus(room){
    const rs=state[room];
    if(!rs||!rs.visited){
      if(inPlan&&!inPlan.has(room))return'empty';
      return'pending';
    }
    if(rs.libera)return'empty';
    const nc=Object.values(rs.checks||{}).some(v=>!v);
    const needsBottle=rs.bottiglia==='consumata';
    if(nc&&needsBottle)return'both';if(nc)return'warn';if(needsBottle)return'bottle';return'ok';
  }
  const CM_OCCUPIED=inPlan?CM_ROOMS.filter(r=>inPlan.has(r)):CM_ROOMS;
  const visited=CM_OCCUPIED.filter(r=>state[r]?.visited).length;
  const btl=CM_OCCUPIED.filter(r=>{const s=cmStatus(r);return s==='bottle'||s==='both';});
  const wrn=CM_OCCUPIED.filter(r=>{const s=cmStatus(r);return s==='warn'||s==='both';});
  const ok=CM_OCCUPIED.filter(r=>cmStatus(r)==='ok');
  const emp=CM_ROOMS.filter(r=>cmStatus(r)==='empty');
  const pnd=CM_OCCUPIED.filter(r=>cmStatus(r)==='pending');

  const pct=CM_OCCUPIED.length?visited/CM_OCCUPIED.length:0;
  let h=`<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:16px;flex-wrap:wrap;">
    <div style="font-size:var(--fs-xxs);text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim);font-weight:700;">${dateStr}</div>
    <div style="display:flex;gap:8px;">
      <button onclick="cmPrintBottle()" style="display:inline-flex;align-items:center;gap:5px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);padding:9px 16px;border-radius:9px;font-weight:700;font-size:var(--fs-xxs);cursor:pointer;">🖨️ Stampa A4</button>
      <a href="controllo-mattino.html" target="_blank" style="display:inline-flex;align-items:center;gap:5px;background:var(--accent);color:#fff;padding:9px 16px;border-radius:9px;font-weight:700;font-size:var(--fs-xxs);text-decoration:none;">📱 Apri app mobile</a>
    </div>
  </div>`;
  // Metafora bottiglia: coerente col soggetto (distribuzione acqua Culligan) — il livello
  // di riempimento della sagoma è la % di camere visitate, invece di un anello generico.
  // Sagoma ridisegnata sulla bottiglia Culligan reale (collo stretto e lungo, corpo dritto).
  // Etichetta col logo: sopra il livello del liquido è colorata come il riempimento,
  // sotto — appena il livello la raggiunge — diventa bianca per restare leggibile.
  const cmBottlePath='M23.5 11h17v24c9 2 11 9 11.5 17v62c0 4-3 7-7 7H19c-4 0-7-3-7-7V52c0.5-8 2.5-15 11.5-17V11z';
  const fillH=Math.round(107*pct);
  const fillY=14+(107-fillH);
  // Bollicine dentro il liquido — clippate all'intersezione tra la sagoma della bottiglia
  // e il rettangolo del riempimento attuale (fillY/fillH), così restano sempre nella zona
  // di liquido vera anche quando il livello sale/scende col progredire del giro. Nascono
  // vicino al FONDO del liquido (non distribuite su tutta l'altezza — altrimenti metà
  // nascevano già a metà colonna) e risalgono quasi fino alla superficie, tragitto lungo
  // come nell'artefatto di riferimento.
  const cmBottomY=fillY+fillH;
  const cmSpawnBand=Math.max(Math.min(fillH*0.3,20),3);
  const cmBubbles=Array.from({length:16},()=>{
    const r=1+Math.random()*1.3;
    const cx=(14+Math.random()*36).toFixed(1);
    const cyNum=cmBottomY-2-Math.random()*cmSpawnBand;
    const cy=cyNum.toFixed(1);
    const rise=Math.max(cyNum-fillY-2,4).toFixed(1);
    const dur=(1.6+Math.random()*1.6).toFixed(2);
    const delay=(-Math.random()*dur).toFixed(2);
    return`<circle class="cm-bubble" cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" style="--cm-bdur:${dur}s;--cm-bdelay:${delay}s;--cm-brise:${rise}px;"/>`;
  }).join('');
  const cmIconBottle='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6M9 2v3.2c0 .6-.3 1.1-.8 1.5C7.1 7.6 6.5 9 6.5 10.5V20a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-9.5c0-1.5-.6-2.9-1.7-3.8-.5-.4-.8-.9-.8-1.5V2"/></svg>';
  const cmIconCheck='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>';
  const cmIconEye='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>';
  h+=`<div style="display:grid;grid-template-columns:180px 1fr;gap:26px;align-items:center;margin-bottom:16px;">
    <div style="position:relative;width:156px;height:346.125px;margin:0 auto;filter:drop-shadow(0 6px 8px rgba(0,0,0,.10)) drop-shadow(0 1px 2px rgba(0,0,0,.06));">
      <svg width="156" height="346.125" viewBox="0 0 64 142">
        <defs>
          <clipPath id="cmBottleClip"><path d="${cmBottlePath}"/></clipPath>
          <mask id="cmLogoMask"><image href="img/logo-culligan.png" x="13" y="64" width="38" height="11.45"/></mask>
          <clipPath id="cmLogoAbove"><rect x="0" y="0" width="64" height="${fillY}"/></clipPath>
          <clipPath id="cmLogoBelow"><rect x="0" y="${fillY}" width="64" height="${142-fillY}"/></clipPath>
          <clipPath id="cmLiquidClip"><rect x="6" y="${fillY}" width="52" height="${fillH}"/></clipPath>
        </defs>
        <path d="${cmBottlePath}" fill="var(--surface2)" stroke="var(--border)" stroke-width="1.5"/>
        <rect class="cm-fill" x="6" y="${fillY}" width="52" height="${fillH}" fill="var(--accent)" clip-path="url(#cmBottleClip)" style="--cm-fy:${fillY};--cm-fh:${fillH};transition:y .6s cubic-bezier(.65,0,.35,1),height .6s cubic-bezier(.65,0,.35,1);"/>
        <rect class="cm-wave" x="6" y="${fillY}" width="52" height="3" fill="var(--accent)" opacity=".5" clip-path="url(#cmBottleClip)"/>
        ${fillH>4?`<g clip-path="url(#cmBottleClip)"><g clip-path="url(#cmLiquidClip)">${cmBubbles}</g></g>`:''}
        <g clip-path="url(#cmBottleClip)">
          <g clip-path="url(#cmLogoAbove)"><rect x="0" y="60" width="64" height="20" fill="var(--accent)" mask="url(#cmLogoMask)"/></g>
          <g clip-path="url(#cmLogoBelow)"><rect x="0" y="60" width="64" height="20" fill="#fff" mask="url(#cmLogoMask)"/></g>
        </g>
        <rect x="24" y="4" width="16" height="7" rx="1.2" fill="#B9C2CC" stroke="#8B95A1" stroke-width="1"/>
      </svg>
    </div>
    <div>
      <div style="font-size:26px;font-weight:700;color:var(--text);line-height:1;margin-bottom:16px;">${visited}<span style="font-size:15px;font-weight:400;color:var(--text-dim);"> / ${CM_OCCUPIED.length} camere visitate</span></div>
      <div style="border-top:1px solid var(--border-light);padding-top:16px;display:flex;gap:22px;flex-wrap:wrap;">
        ${[[btl.length,'Da mettere',cmIconBottle,'#2F80D9','#E4F0FC'],[ok.length,'Non consumate',cmIconCheck,'var(--green)','var(--green-bg)'],[pnd.length,'Da visitare',cmIconEye,'var(--text-dim)','var(--surface2)']].map(([n,lbl,icon,fg,bg])=>`
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${bg};color:${fg};">${icon}</div>
          <div><div style="font-size:22px;font-weight:300;color:${fg};line-height:1;">${n}</div><div style="font-size:10.5px;color:var(--text-dim);text-transform:uppercase;margin-top:4px;">${lbl}</div></div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
  const groupLbl=(t,tint)=>`<div style="font-size:12px;font-weight:700;color:${tint||'var(--text-muted)'};text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">${t}</div>`;
  h+=`<div style="border-top:1px solid var(--border-light);margin-top:2px;padding-top:14px;margin-bottom:14px;">`;
  if(btl.length>0){
    h+=groupLbl(`💧 Portare bottiglia riempita — ${btl.length} ${btl.length===1?'camera':'camere'}`,'var(--amber)');
    h+=`<div style="display:flex;flex-wrap:wrap;gap:8px;">${btl.map(r=>`<span style="padding:6px 15px;border-radius:20px;font-size:var(--fs-xs);font-weight:600;background:var(--accent-bg);color:var(--accent);border:1px solid #B8CEEE;">${r}</span>`).join('')}</div>`;
  }else{
    h+=`<div style="font-size:var(--fs-xs);font-weight:600;color:var(--green);">💧 Nessuna bottiglia consumata — niente da portare ✅</div>`;
  }
  h+=`</div>`;
  if(pnd.length>0){
    h+=`<div style="border-top:1px solid var(--border-light);padding-top:14px;">`;
    h+=groupLbl(`⭕ Non ancora visitate — ${pnd.length} ${pnd.length===1?'camera':'camere'}`);
    h+=`<div style="display:flex;flex-wrap:wrap;gap:8px;">${pnd.map(r=>`<span style="padding:6px 15px;border-radius:20px;font-size:var(--fs-xs);font-weight:600;background:var(--surface2);color:var(--text-dim);border:1px solid var(--border-light);">${r}</span>`).join('')}</div>`;
    h+=`</div>`;
  }
  el.innerHTML=h;
  // Carica report QC settimanale in background
  cmLoadWeeklyQC();
}

async function cmLoadWeeklyQC(){
  // Settimana dom→sab (la domenica è il giorno 0, inizia da domenica)
  const now=new Date();
  const dow=now.getDay(); // 0=Dom, 6=Sab
  const sunday=new Date(now);
  sunday.setDate(now.getDate()-dow);
  sunday.setHours(0,0,0,0);
  const days=Array.from({length:7},(_,i)=>{
    const d=new Date(sunday);d.setDate(sunday.getDate()+i);
    return{
      label:['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][i],
      date:d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'}),
      key:'qm_cm_'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),
      isFuture:d>now
    };
  });
  const results=await Promise.all(days.map(async dy=>{
    if(dy.isFuture)return{...dy,state:null};
    try{
      const r=await fetch(PROXY+'/kv/get?key='+encodeURIComponent(dy.key),{cache:'no-store'});
      if(r.ok){const j=await r.json();if(j&&j.value)return{...dy,state:JSON.parse(j.value)};}
    }catch(e){}
    try{const s=localStorage.getItem(dy.key);if(s)return{...dy,state:JSON.parse(s)};}catch(e){}
    return{...dy,state:null};
  }));
  const perRoom={};
  CM_ROOMS.forEach(r=>{perRoom[r]=0;});
  let totalChecks=0;
  results.forEach(({state})=>{
    if(!state)return;
    CM_ROOMS.forEach(r=>{
      const rs=state[r];
      // QC solo sulle camere segnate "pronta" durante la riconsegna — sono le uniche
      // davvero controllate. Se non è pronta si lascia solo la bottiglia piena senza
      // verificare nulla, quindi non conta come camera controllata.
      if(rs&&rs.pronta===true){perRoom[r]++;totalChecks++;}
    });
  });
  const weekFrom=days[0].date;
  const weekTo=days[6].date;
  cmRenderWeeklyQC(perRoom,totalChecks,weekFrom,weekTo,results);
}

function cmRenderWeeklyQC(perRoom,totalChecks,weekFrom,weekTo,days){
  const el=document.getElementById('cm-content');
  if(!el)return;
  // Camere in ordine crescente (Art 1 → Art 22), già in ordine in CM_ROOMS
  const roomsChecked=CM_ROOMS.filter(r=>perRoom[r]>0);
  const roomsNot=CM_ROOMS.filter(r=>!perRoom[r]);
  // Registro cronologico: un rigo per giorno (Dom→oggi) con le camere effettivamente
  // rifornite quel giorno, invece di un totale aggregato per camera — mostra l'ordine
  // reale del giro invece di solo il numero finale.
  const pastDays=days.filter(dy=>!dy.isFuture);
  const logRows=pastDays.length?pastDays.map((dy,idx)=>{
    const roomsDay=dy.state?CM_ROOMS.filter(r=>{
      const rs=dy.state[r];
      return rs&&rs.pronta===true;
    }):[];
    const bodyHtml=roomsDay.length
      ?`<div style="display:flex;flex-wrap:wrap;gap:6px;">${roomsDay.map(r=>`<span style="padding:3px 11px;border-radius:14px;font-size:11px;font-weight:600;background:var(--accent-bg);color:var(--accent);border:1px solid #B8CEEE;">${r}</span>`).join('')}</div>`
      :`<span style="color:var(--text-dim);font-style:italic;font-size:12px;">Nessun giro registrato</span>`;
    return`<div style="display:flex;gap:12px;padding:9px 0;${idx>0?'border-top:1px solid var(--border-light)':''};">
      <div style="width:70px;flex-shrink:0;font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;padding-top:3px;">${dy.label} ${dy.date}</div>
      <div style="width:2px;background:var(--border-light);position:relative;flex-shrink:0;"><span style="position:absolute;left:-3px;top:4px;width:8px;height:8px;border-radius:50%;background:${roomsDay.length?'var(--green)':'var(--surface2)'};"></span></div>
      <div style="flex:1;padding-bottom:2px;">${bodyHtml}</div>
    </div>`;
  }).join(''):`<div style="color:var(--text-dim);font-size:13px;padding:10px 0;">Nessun controllo questa settimana.</div>`;
  // Testo anteprima WhatsApp
  const waLines=roomsChecked.map(r=>`• ${r} — ${perRoom[r]} ${perRoom[r]===1?'volta':'volte'}`).join('\n');
  const waMsg=`Ciao Laura ti invio il report settimanale dei miei controlli qualità nelle camere SoulArt legati alla distribuzione delle Bottiglie Culligan.\n\n📊 Camere controllate nella settimana\n${weekFrom} → ${weekTo}\n\n✅ ${roomsChecked.length} ${roomsChecked.length===1?'camera controllata':'camere controllate'} su ${CM_ROOMS.length}\n\n${waLines||'Nessun dato'}\n\nQuality Manager Paolo P.`;
  const waText=encodeURIComponent(waMsg);
  const section=document.createElement('div');
  section.style.cssText='border-top:1px solid var(--border-light);margin-top:14px;padding-top:14px;';
  section.innerHTML=`
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">📊 Camere controllate nella settimana</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">${weekFrom} → ${weekTo}</div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:20px;font-weight:700;color:var(--text);">${roomsChecked.length}</span>
          <span style="font-size:11px;color:var(--text-dim);"> / ${CM_ROOMS.length} camere</span>
        </div>
      </div>
      <div>${logRows}</div>
      ${roomsNot.length?`<div style="padding-top:10px;margin-top:6px;border-top:1px solid var(--border-light);">
        <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px;">Non visitate questa settimana</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${roomsNot.map(r=>`<span style="padding:3px 11px;border-radius:14px;font-size:11px;font-weight:600;background:var(--surface2);color:var(--text-dim);border:1px solid var(--border-light);">${r}</span>`).join('')}</div>
      </div>`:''}
      <div style="padding-top:12px;margin-top:10px;border-top:1px solid var(--border-light);display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <a href="https://wa.me/393274919588?text=${waText}" target="_blank" style="display:inline-flex;align-items:center;gap:7px;font-size:var(--fs-xs);padding:10px 18px;border-radius:10px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.555 4.122 1.528 5.857L.057 23.882a.5.5 0 0 0 .607.65l6.277-1.638A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.13-1.418l-.36-.214-3.733.974.998-3.647-.236-.374A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            WhatsApp albergo
          </a>
          <button data-msg="${waMsg.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" onclick="navigator.clipboard.writeText(this.dataset.msg).then(()=>{this.textContent='✓ Copiato!';setTimeout(()=>this.textContent='📋 Copia testo',2000);});" style="display:inline-flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:var(--fs-xs);color:var(--text);cursor:pointer;font-weight:600;">📋 Copia testo</button>
          <button onclick="const p=this.parentNode.parentNode.querySelector('.qc-preview');p.style.display=p.style.display==='none'?'block':'none';this.textContent=p.style.display==='none'?'👁 Anteprima':'✕ Chiudi';" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:var(--fs-xs);color:var(--text-dim);cursor:pointer;">👁 Anteprima</button>
        </div>
        <div class="qc-preview" style="display:none;background:var(--green-bg);border:1px solid var(--green);border-radius:8px;padding:12px;">
          <pre style="font-family:inherit;font-size:12px;color:var(--green);white-space:pre-wrap;margin:0;">${waMsg.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>
        </div>
      </div>`;
  el.appendChild(section);
}

function cmPrintBottle(){
  const d=new Date();
  const key='qm_cm_'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  let state=null;
  try{const r=localStorage.getItem(key);if(r)state=JSON.parse(r);}catch(e){}
  function cmSt(room){
    const rs=state&&state[room];
    if(!rs||!rs.visited)return'pending';
    if(rs.libera)return'empty';
    const nc=Object.values(rs.checks||{}).some(v=>!v);
    const nb=rs.bottiglia==='consumata';
    if(nc&&nb)return'both';if(nc)return'warn';if(nb)return'bottle';return'ok';
  }
  const isDnd=r=>!!(state&&state[r]&&state[r].dnd);
  const btl=CM_ROOMS.filter(r=>{const s=cmSt(r);return !isDnd(r)&&(s==='bottle'||s==='both');});
  const dndRooms=CM_ROOMS.filter(r=>isDnd(r));
  // Set camere in fermata (da arriviData globale)
  const fermataSet=new Set((arriviData&&arriviData.fermate||[]).map(f=>(f.camera||'').trim()));
  const dateStr=d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const timeStr=d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  function roomCard(r,color){
    const borderCol=color==='amber'?'#D97706':'#DC2626';
    const bgCol=color==='amber'?'#FFFBEB':'#FEF2F2';
    const note=(state&&state[r]&&state[r].note)||'';
    const isFermata=fermataSet.has(r);
    return`<div style="border:2.5px solid ${borderCol};border-radius:8px;background:${bgCol};
      padding:10px 8px 8px;text-align:center;break-inside:avoid;display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:22px;height:22px;border:2.5px solid #333;border-radius:4px;flex-shrink:0;background:#fff;"></div>
      <div style="font-size:22pt;font-weight:900;line-height:1;color:#111;">${r}</div>
      ${isFermata?`<div style="font-size:8pt;font-weight:700;color:#1D4ED8;background:#DBEAFE;border-radius:4px;padding:2px 6px;letter-spacing:.03em;">FERMATA</div>`:''}
      ${note?`<div style="font-size:8pt;color:#888;font-style:italic;line-height:1.3;">${note.replace(/</g,'&lt;')}</div>`:''}
    </div>`;
  }
  function roomGrid(rooms,color){
    if(!rooms.length)return`<p style="color:#9CA3AF;font-style:italic;font-size:11pt;padding:4mm 0;">Nessuna camera.</p>`;
    return`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5mm;margin:4mm 0 8mm;">${rooms.map(r=>roomCard(r,color)).join('')}</div>`;
  }
  const html=`<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<title>Distribuzione Culligan — ${dateStr}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  html,body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#000;}
  body{padding:14mm 16mm;}
  .hdr{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:5mm;margin-bottom:8mm;border-bottom:3px solid #000;}
  .hdr-hotel{font-size:18pt;font-weight:900;letter-spacing:.01em;}
  .hdr-sub{font-size:10pt;color:#555;margin-top:2mm;}
  .hdr-right{text-align:right;font-size:10pt;color:#333;line-height:1.8;}
  .sec-title{font-size:14pt;font-weight:900;padding:4mm 6mm;border-radius:6px;margin-bottom:4mm;display:flex;align-items:center;gap:6px;}
  .sec-title.amber{background:#FEF3C7;color:#92400E;border-left:5px solid #D97706;}
  .sec-title.red{background:#FEE2E2;color:#B91C1C;border-left:5px solid #DC2626;}
  .sec-count{font-size:11pt;font-weight:700;opacity:.75;}
  .footer{margin-top:10mm;padding-top:5mm;border-top:1.5px solid #ccc;display:flex;justify-content:space-between;font-size:10pt;color:#444;}
  @media print{@page{size:A4 portrait;margin:0;}body{padding:14mm 16mm;}}
</style>
</head><body>
<div class="hdr">
  <div><div class="hdr-hotel">SoulArt Hotel</div><div class="hdr-sub">Distribuzione Acqua Culligan — Art 1–22</div></div>
  <div class="hdr-right">${dateStr}<br>Ore ${timeStr} &nbsp;·&nbsp; QM Paolo P.</div>
</div>
<div class="sec-title amber">💧 Bottiglie da portare <span class="sec-count">(${btl.length} ${btl.length===1?'camera':'camere'})</span></div>
${roomGrid(btl,'amber')}
${dndRooms.length>0?`<div class="sec-title red">🚫 Non Disturbare — verificare più tardi <span class="sec-count">(${dndRooms.length})</span></div>${roomGrid(dndRooms,'red')}`:''}
<div class="footer">
  <span>Quality Manager — Paolo P.</span>
  <span>Firma: _________________________________ &nbsp;&nbsp; Ora completamento: __________</span>
</div>
</body></html>`;
  const w=window.open('','_blank');
  if(!w){cqAvviso('Abilita i popup per stampare.');return;}
  w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
}
function _esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// §§ RECENSIONI EXPEDIA (revExpParseTsv, revExpHandleFile, revExpRenderStats, revExpRenderList, revExpGenerateReply)
const REV_EXP_HOTELS={
  sa:{name:'SoulArt Hotel',data:[],filtered:[],filter:'all',sort:'date_desc',search:'',page:0,tone:'bilanciato'},
  bh:{name:'Boutique Hotel',data:[],filtered:[],filter:'all',sort:'date_desc',search:'',page:0,tone:'bilanciato'},
  ar:{name:'Art Resort',data:[],filtered:[],filter:'all',sort:'date_desc',search:'',page:0,tone:'bilanciato'},
  sb:{name:'Santa Brigida',data:[],filtered:[],filter:'all',sort:'date_desc',search:'',page:0,tone:'bilanciato'},
};
const REV_EXP_REPLY_STORE={};

// Init upload per tutti gli hotel Expedia
['sa','bh','ar','sb'].forEach(p=>{
  const zone=document.getElementById('revExpUploadZone-'+p);
  const inp=document.getElementById('revExpFileInput-'+p);
  if(!zone||!inp)return;
  zone.addEventListener('click',()=>inp.click());
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f)revExpHandleFile(p,f);});
  inp.addEventListener('change',e=>{if(e.target.files[0])revExpHandleFile(p,e.target.files[0]);inp.value='';});
});

function revExpParseTsv(text){
  const lines=text.split('\n');
  if(!lines.length)return[];
  const headers=lines[0].split('\t').map(h=>h.trim().replace(/^"|"$/g,''));
  const rows=[];
  for(let i=1;i<lines.length;i++){
    const line=lines[i].trim();
    if(!line)continue;
    const vals=line.split('\t');
    const obj={};
    headers.forEach((h,j)=>obj[h]=(vals[j]||'').trim().replace(/^"(.*)"$/,'$1'));
    if(!obj['review_rating'])continue;
    const m=obj['review_rating'].match(/^(\d+(?:\.\d+)?)/);
    obj._score=m?parseFloat(m[1]):0;
    const d=new Date(obj['review_date']);
    obj._dateTs=isNaN(d)?0:d.getTime();
    obj._date=isNaN(d)?new Date(0):d;
    const resp=(obj['review_response']||'').replace(/^"|"$/g,'').trim();
    obj._hasReply=!!(resp&&resp.length>0);
    obj._brand=obj['brand_type']||'Expedia';
    rows.push(obj);
  }
  return rows.sort((a,b)=>b._dateTs-a._dateTs);
}

function revExpHandleFile(p,file){
  document.getElementById('revExpProcessing-'+p).style.display='flex';
  document.getElementById('revExpUploadZone-'+p).style.display='none';
  document.getElementById('revExpError-'+p).style.display='none';
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const rows=revExpParseTsv(e.target.result);
      if(!rows.length){
        document.getElementById('revExpProcessing-'+p).style.display='none';
        document.getElementById('revExpUploadZone-'+p).style.display='flex';
        document.getElementById('revExpError-'+p).style.display='block';
        document.getElementById('revExpError-'+p).textContent='Nessuna recensione trovata nel file.';
        return;
      }
      REV_EXP_HOTELS[p].data=rows;
      REV_EXP_HOTELS[p].filtered=[...rows];
      document.getElementById('revExpProcessing-'+p).style.display='none';
      document.getElementById('revExpContent-'+p).style.display='block';
      revExpRenderStats(p);
      revExpRenderList(p);
      try{localStorage.setItem('qm_rev_exp_'+p,e.target.result);}catch(ex){}
      const ts=Date.now();
      try{localStorage.setItem('qm_ts_rev_exp_'+p,String(ts));}catch(ex){}
      try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_rev_exp_'+p,value:e.target.result})}).catch(()=>{});}catch(ex){}
      try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_ts_rev_exp_'+p,value:String(ts)})}).catch(()=>{});}catch(ex){}
      revExpShowTs(p,ts);
    }catch(err){
      document.getElementById('revExpProcessing-'+p).style.display='none';
      document.getElementById('revExpUploadZone-'+p).style.display='flex';
      document.getElementById('revExpError-'+p).style.display='block';
      document.getElementById('revExpError-'+p).textContent='Errore: '+err.message;
    }
  };
  reader.readAsText(file,'UTF-8');
}

function revExpShowTs(p,ts){
  const el=document.getElementById('revExpTs-'+p);
  if(!el||!ts)return;
  const n=new Date(parseInt(ts));
  const ms=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  el.textContent='↑ '+n.getDate()+' '+ms[n.getMonth()]+' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
}

function revExpRenderStats(p){
  const h=REV_EXP_HOTELS[p];
  const data=h.data;
  if(!data.length)return;
  const now=Date.now();
  const avg=weightedAvgF1(data,now);
  document.getElementById('revExp-avg-'+p).textContent=avg?avg.toFixed(1):'—';
  document.getElementById('revExp-count-'+p).textContent=data.length;
  // Date range
  const dates=data.map(r=>r._dateTs).filter(Boolean);
  if(dates.length){
    const fmt=ts=>{const d=new Date(ts);return d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();};
    document.getElementById('revExpPeriod-'+p).textContent=fmt(Math.min(...dates))+' – '+fmt(Math.max(...dates));
  }
  // No-reply count
  const noreply=data.filter(r=>{
    if(r._hasReply)return false;
    const k=revExpUniqueKey(p,r);
    return REV_SENT[k]!==true&&REV_SENT[k]!=='not_needed';
  }).length;
  document.getElementById('revExp-noreply-'+p).textContent=noreply;
}

function revExpApplyFilters(p){
  const h=REV_EXP_HOTELS[p];
  let rows=[...h.data];
  const flt=h.filter||'all';
  const srch=(h.search||'').toLowerCase().trim();
  if(flt==='hi')rows=rows.filter(r=>r._score>=9);
  else if(flt==='mid')rows=rows.filter(r=>r._score>=7&&r._score<9);
  else if(flt==='lo')rows=rows.filter(r=>r._score<7);
  else if(flt==='noreply')rows=rows.filter(r=>{
    if(r._hasReply)return false;
    return REV_SENT[revExpUniqueKey(p,r)]!==true&&REV_SENT[revExpUniqueKey(p,r)]!=='not_needed';
  });
  if(srch)rows=rows.filter(r=>(r['review_by']||'').toLowerCase().includes(srch)||(r['review_text']||'').toLowerCase().includes(srch));
  const srt=h.sort||'date_desc';
  if(srt==='date_asc')rows.sort((a,b)=>a._dateTs-b._dateTs);
  else if(srt==='score_desc')rows.sort((a,b)=>b._score-a._score);
  else if(srt==='score_asc')rows.sort((a,b)=>a._score-b._score);
  else rows.sort((a,b)=>b._dateTs-a._dateTs);
  h.filtered=rows;
  h.page=0;
}

function revExpToggleFilter(p,type){
  REV_EXP_HOTELS[p].filter=type;
  ['all','hi','mid','lo','noreply'].forEach(t=>{
    const btn=document.getElementById('revExpFlt-'+p+'-'+t);
    if(btn)btn.classList.toggle('active',t===type);
  });
  revExpApplyFilters(p);revExpRenderList(p);
}
function revExpSort(p,val){REV_EXP_HOTELS[p].sort=val;revExpApplyFilters(p);revExpRenderList(p);}
function revExpSearch(p,val){REV_EXP_HOTELS[p].search=val;revExpApplyFilters(p);revExpRenderList(p);}
function revExpSetPage(p,pg){REV_EXP_HOTELS[p].page=pg;revExpRenderList(p);}

function revExpUniqueKey(p,r){
  const nome=(r['review_by']||'anonimo').trim().toLowerCase().replace(/\s+/g,'_');
  return 'exp_'+p+'_'+nome+'_'+(r._dateTs||'0');
}

function revExpIsItalian(r){
  const txt=(r['review_text']||'')+(r['review_title']||'');
  if(!txt.trim())return true;
  if(/[čšžřěůőűñßąęłśćźďťĺľŕãõæøåœ]/i.test(txt))return false;
  return /[àèìòùÀÈÌÒÙ]|(\b(?:ottimo|buono|bello|camera|colazione|personale|posizione|pulizia|servizio|soggiorno|consiglio|esperienza|fantastico|eccellente|grazie|molto|tutto|anche|però|questo|questa|erano|abbiamo|siamo|stanza|struttura|bellissimo|purtroppo|davvero)\b)/i.test(txt);
}

function revExpUpdateCharCount(uid){
  const ta=document.getElementById('ret-'+uid),cc=document.getElementById('recc-'+uid);
  if(ta&&cc)cc.textContent=ta.value.length+' caratteri';
}

function revExpRenderList(p){
  const h=REV_EXP_HOTELS[p];
  const data=h.data;
  const filtered=h.filtered;
  const PAGE_SIZE=10;
  const page=h.page||0;
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const pageData=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const list=document.getElementById('revExpList-'+p);
  if(!list)return;
  if(!filtered.length){list.innerHTML=`<div style="text-align:center;padding:30px;color:var(--text-dim);font-size:var(--fs-sm);">Nessuna recensione con i filtri selezionati</div>`;return;}
  list.innerHTML=pageData.map(r=>{
    const gi=data.indexOf(r);
    const uid=p+'-'+gi;
    const s=r._score;
    const scoreColor=s>=9?'var(--green)':s>=7?'var(--amber)':'var(--red)';
    const R=14,circ=2*Math.PI*R,arc=Math.min(s/10,1)*circ;
    const scoreSvg=`<svg width="40" height="40" viewBox="0 0 40 40" style="flex-shrink:0;"><circle cx="20" cy="20" r="${R}" fill="none" stroke="var(--border-light)" stroke-width="2.5"/><circle cx="20" cy="20" r="${R}" fill="none" stroke="${scoreColor}" stroke-width="2.5" stroke-dasharray="${arc.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round" transform="rotate(-90 20 20)"/><text x="20" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="${scoreColor}" font-family="Helvetica Neue,Arial,sans-serif">${s.toFixed(1)}</text></svg>`;
    const d=r._date;
    const dateStr=isNaN(d)?'—':(d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear());
    const brandColor=r._brand==='Hotels'?'#FF5A00':'#FFC200';
    const brandLabel=r._brand==='Hotels'?'Hotels.com':'Expedia';
    const brandBg=r._brand==='Hotels'?'#FF5A00':'#FFC200';
    const brandTxt=r._brand==='Hotels'?'#fff':'#1A1A1A';
    const brandBadge=`<span style="font-size:9px;padding:2px 7px;border-radius:10px;background:${brandBg};color:${brandTxt};font-weight:700;flex-shrink:0;">${brandLabel}</span>`;
    const italian=revExpIsItalian(r);
    const langBadge=!italian?`<span class="rev-lang-badge">🌐 Non italiano</span>`:'';
    const noReplyBadge=!r._hasReply?`<span class="rev-no-reply">Senza risposta</span>`:'';
    const sentKey=revExpUniqueKey(p,r);
    const sentVal=REV_SENT[sentKey]||false;
    const isSent=sentVal===true;
    const isNotNeeded=sentVal==='not_needed';
    const sentBadge=isSent?`<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:#d4edda;color:#1a7a3a;font-weight:600;">✓ Risposta inviata</span>`:isNotNeeded?`<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:var(--surface2);color:var(--text-dim);border:1px solid var(--border);font-weight:600;">— Non necessaria</span>`:'';
    const reviewTxt=r['review_text']||'';
    const reviewHtml=reviewTxt?`<div style="font-size:var(--fs-xs);color:var(--text);line-height:1.6;margin-bottom:8px;">${reviewTxt.replace(/</g,'&lt;')}</div>`:'';
    REV_EXP_REPLY_STORE[uid]=r._hasReply?(r['review_response']||'').replace(/^"|"$/g,'').trim():'';
    const replyHtml=r._hasReply&&REV_EXP_REPLY_STORE[uid]?`<div class="rev-reply" style="margin-top:8px;"><span style="font-size:9px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;">Risposta struttura</span><div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:4px;line-height:1.6;">${REV_EXP_REPLY_STORE[uid].replace(/\n/g,'<br>').replace(/</g,'&lt;')}</div></div>`:'';
    const _tone=h.tone||'bilanciato';
    const replyPanel=(!r._hasReply&&!isNotNeeded&&!isSent)?`
      <div class="rev-reply-panel" id="rep-${uid}">
        <div class="rev-tone-bar">
          <span style="font-size:10px;color:var(--text-dim);flex-shrink:0;">Tono:</span>
          <button class="rev-tone-btn${_tone==='formale'?' active':''}" onclick="revExpSetTone('${p}','formale',event)">Formale</button>
          <button class="rev-tone-btn${_tone==='bilanciato'?' active':''}" onclick="revExpSetTone('${p}','bilanciato',event)">Bilanciato</button>
          <button class="rev-tone-btn${_tone==='empatico'?' active':''}" onclick="revExpSetTone('${p}','empatico',event)">Empatico</button>
        </div>
        <textarea class="rev-reply-textarea" id="ret-${uid}" placeholder="Genera o scrivi la risposta…" oninput="revExpUpdateCharCount('${uid}')"></textarea>
        <div class="rev-reply-actions">
          <button class="rev-btn-generate" id="reb-${uid}" onclick="revExpGenerateReply('${p}',${gi})">✦ Genera risposta</button>
          <button class="rev-btn-copy" id="rec-${uid}" onclick="revExpCopyReply('${uid}')">Copia</button>
          <button onclick="revExpMarkSent('${p}',${gi})" style="background:var(--surface2);color:var(--text-muted);border:1px solid var(--border);border-radius:5px;padding:6px 13px;font-size:var(--fs-xs);cursor:pointer;" id="res-${uid}">Segna inviata</button>
          <span class="rev-char-count" id="recc-${uid}"></span>
        </div>
      </div>`:(isSent||isNotNeeded)?`<div style="margin-top:6px;">${sentBadge}</div>`:'';
    return`<div class="rev-card">
      <div class="rev-card-header">${scoreSvg}<span class="rev-guest">${r['review_by']||'Ospite anonimo'}</span>${brandBadge}${noReplyBadge}${sentBadge}${langBadge}<span class="rev-date">${dateStr}</span></div>
      ${r['review_title']?`<div class="rev-title">${r['review_title'].replace(/</g,'&lt;')}</div>`:''}
      ${reviewHtml}${replyHtml}${replyPanel}
    </div>`;
  }).join('')+(totalPages>1?`<div class="rev-pagination"><button class="rev-pg-btn" onclick="revExpSetPage('${p}',${page-1})" ${page===0?'disabled':''}>← Prec</button><span class="rev-pg-info">Pagina ${page+1} di ${totalPages} · ${filtered.length} recensioni</span><button class="rev-pg-btn" onclick="revExpSetPage('${p}',${page+1})" ${page>=totalPages-1?'disabled':''}>Succ →</button></div>`:'');
}

function revExpSetTone(p,tone,evt){
  if(evt)evt.stopPropagation();
  REV_EXP_HOTELS[p].tone=tone;
  revExpRenderList(p);
}

async function revExpGenerateReply(p,gi){
  const h=REV_EXP_HOTELS[p];
  const r=h.data[gi];if(!r)return;
  const uid=p+'-'+gi;
  const btn=document.getElementById('reb-'+uid),ta=document.getElementById('ret-'+uid);
  if(!btn||!ta)return;
  btn.disabled=true;btn.innerHTML='<div class="rev-gen-spinner"></div> Generazione…';
  const italian=revExpIsItalian(r);
  const lang=italian?'italiano':'inglese';
  const firma=italian?'Paolo P. - Quality Manager':'Best regards. Paolo P. - Quality Manager';
  const hotelName=h.name;
  const tone=h.tone||'bilanciato';
  const toneDesc=tone==='formale'?'Tono istituzionale e professionale, sobrio e distaccato.':tone==='empatico'?'Tono molto empatico e vicino, mostra comprensione autentica.':'Tono bilanciato: professionale e cordiale, né freddo né eccessivamente caloroso. Il registro naturale di un Quality Manager competente.';
  const platform=r._brand==='Hotels'?'Hotels.com':'Expedia';
  const hasText=(r['review_text']||'').trim().length>3;
  const prompt=`Sei Paolo P., Quality Manager del ${hotelName} a Napoli, un hotel 4 stelle con storia e carattere unico.\n\nDevi rispondere a questa recensione ${platform} in ${lang}.\n\nDATI RECENSIONE:\n- Punteggio: ${r._score}/10\n- Titolo: ${r['review_title']||'—'}\n- Testo: ${r['review_text']||'(nessun testo)'}\n\nREGOLE — rispettale tutte:\n1. APERTURA FISSA: inizia SEMPRE con "${italian?'Gentile ospite,':'Dear Guest,'}" — mai il nome (policy Expedia/Hotels.com)\n2. Ringrazia per la recensione — varia il modo ad ogni risposta\n3. LUNGHEZZA: ${hasText?'3 paragrafi. Primo: 1-2 frasi (ringraziamento + positivi). Secondo: 2-3 frasi (feedback/critiche con spiegazione e azione). Terzo: 1 frase (chiusura). Totale 5-7 frasi.':'2 frasi, varia il phrasing ad ogni risposta'}\n4. TONO: professionale e caldo come un Quality Manager di un 4 stelle\n5. CRITICHE — REGOLA FONDAMENTALE: non dire mai "hai ragione", "you are right", "you are absolutely right" — riconosci in modo neutro (es. "We take note of your observation", "We appreciate your feedback on X") poi spiega l'azione concreta\n6. PUNTEGGIO: citalo solo se è alto (9-10/10) E la recensione è entusiasta\n7. PUNTI POSITIVI: richiama aspetti specifici citati (colazione, posizione, staff, Galleria Umberto I, ascensore storico)\n8. CARATTERE STRUTTURA: valorizza Galleria Umberto I, palazzo storico napoletano, ascensore d'epoca quando pertinente\n9. CHIUSURA: invita a tornare — varia il phrasing\n10. VIETATO: non invitare mai al contatto diretto né alla prenotazione diretta (OTA)\n11. FIRMA su riga separata: "${firma}"\n12. Non ripetere le parole dell'ospite\n13. Rispondi SOLO con il testo, senza preamboli`;
  try{
    const res=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
    const data=await res.json();
    if(data.error){ta.value='Errore API: '+data.error.type+' — '+data.error.message;btn.disabled=false;btn.innerHTML='✦ Genera risposta';return;}
    if(!data.content||!data.content[0]){ta.value='Risposta inattesa.';btn.disabled=false;btn.innerHTML='✦ Genera risposta';return;}
    ta.value=data.content[0].text;revExpUpdateCharCount(uid);btn.disabled=false;btn.innerHTML='✦ Rigenera';
  }catch(e){ta.value='Errore di rete: '+e.message;btn.disabled=false;btn.innerHTML='✦ Genera risposta';}
}

function revExpCopyReply(uid){
  const ta=document.getElementById('ret-'+uid),btn=document.getElementById('rec-'+uid);
  if(!ta||!ta.value.trim())return;
  navigator.clipboard.writeText(ta.value).then(()=>{btn.textContent='✓ Copiato';btn.classList.add('copied');setTimeout(()=>{btn.textContent='Copia';btn.classList.remove('copied');},2000);}).catch(()=>{ta.select();document.execCommand('copy');btn.textContent='✓ Copiato';setTimeout(()=>{btn.textContent='Copia';},2000);});
}

function revExpMarkSent(p,gi){
  const r=REV_EXP_HOTELS[p].data[gi];if(!r)return;
  const key=revExpUniqueKey(p,r);
  REV_SENT[key]=!REV_SENT[key];
  try{localStorage.setItem('qm_rev_sent',JSON.stringify(REV_SENT));}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_rev_sent',value:JSON.stringify(REV_SENT)})}).catch(()=>{});}catch(e){}
  revExpRenderList(p);revExpRenderStats(p);
}

function revExpReset(p){
  REV_EXP_HOTELS[p].data=[];REV_EXP_HOTELS[p].filtered=[];REV_EXP_HOTELS[p].page=0;REV_EXP_HOTELS[p].filter='all';
  document.getElementById('revExpContent-'+p).style.display='none';
  document.getElementById('revExpUploadZone-'+p).style.display='flex';
  document.getElementById('revExpError-'+p).style.display='none';
  try{localStorage.removeItem('qm_rev_exp_'+p);}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_rev_exp_'+p,value:''})}).catch(()=>{});}catch(e){}
}

// §§ DDT FORNITORI — upload DDT, spese per fornitore/reparto, storico
const DDT_KEY='qm_ddt';
const DDT_FORNITORI={
  DECA:      {reparto:'hk',  rLabel:'Housekeeping', color:'#eceef0', fg:'#4a4a4a', accent:'#6b6b6b', logo:'deca.png'},
  Amonn:     {reparto:'altro', rLabel:'Altro',       color:'#fde8e9', fg:'#d90e13', accent:'#d90e13', logo:'amonn.png'},
  Vistaprint:{reparto:'altro', rLabel:'Altro',       color:'#e3f2fb', fg:'#006196', accent:'#006196', logo:'vistaprint.png'},
  SDM:       {reparto:'bkf', rLabel:'Breakfast',    color:'#e0e1f5', fg:'#292b82', accent:'#292b82', logo:'sdm2.png'},
  SAIMA:     {reparto:'bkf', rLabel:'Breakfast',    color:'#f5efe9', fg:'#2d1c12', accent:'#6b4a2f', logo:'saima.png'},
  MARR:      {reparto:'bkf', rLabel:'Breakfast',    color:'#fbdadc', fg:'#db0d15', accent:'#db0d15', logo:'marr.png'},
  Cozzolino: {reparto:'bkf', rLabel:'Breakfast',    color:'#dcebe0', fg:'#1e5631', accent:'#1e5631'},
  Valgarda:  {reparto:'bkf', rLabel:'Breakfast',    color:'#f2eee2', fg:'#8a7643', accent:'#b99e5d', logo:'valgarda.png'},
};
// Riassegnazione manuale categoria prodotto (solo Spese Fornitori): una volta spostato un
// prodotto in una categoria, resta lì per sempre — in tutti i mesi già caricati e in quelli
// futuri — perché la chiave è la descrizione del prodotto, non un mese/DDT specifico.
// Categorie prodotto Spese Fornitori — costanti globali (non più locali a ddtBuildAnalisi)
// così sono riusabili anche dal report mensile stampabile (ddtPrintMonthReport).
// Stesse categorie, icone e stile di breakfast.html: se si tocca una delle due copie di
// dati/classificazione, verificare che l'altra (qui non c'è più una copia — c'è solo qui)
// resti coerente con quella di breakfast.html.
const CAT_ICONS_SPESE={
    teecaffe:    'icone%20app%20breakfast/the%20camere.png',
    lievitati:   'icone%20app%20breakfast/dolci.png',
    latticini:   'icone%20app%20breakfast/latte.png',
    uova:        'icone%20app%20breakfast/uova.png',
    bacon:       'icone%20app%20breakfast/bacon.png',
    salumi:      'icone%20app%20breakfast/salumi.png',
    miele:       'icone%20app%20breakfast/miele.png',
    succhi:      'icone%20app%20breakfast/bevande.png',
    distributori:'icone%20app%20breakfast/distributore.png',
    frutta:      'icone%20app%20breakfast/frutta.png',
    sottoli:     'icone%20app%20breakfast/sottoli.png',
    verdure:     'icone%20app%20breakfast/verdure.png',
    nonalim:     'icone%20app%20breakfast/non%20alimentari.png',
};
const CAT_RULES=[
    // ORDINE CRITICO (identico a breakfast.html):
    // teecaffe prima di lievitati (bisc.gocce → camere, non lievitati)
    // lievitati prima di latticini (pancake/waffle con latte → lievitati)
    // latticini prima di miele (bevande avena/soia → latticini, non cereali)
    {id:'teecaffe',  label:'☕ Dotazioni bar e camere',                 color:'#f0f9ff',fg:'#0369a1',
     kw:["te'",'twinings','earl grey','nescafe','bisc.gocce','gocce ciocc',
         'orzo solub','orzo bimbo','capsule caffe','cialde caffe','caffe solub',
         'the bag','tea bag','bustina te','infuso','tisana','camomilla','camom.',
         'the twin','pure green','verde pure',
         'prosecco','prosecchino','spumante','vino ','minibar',
         'cocacola','coca cola','coca-cola','aranciata','cedrata','chinotto','limonata',
         'fanta','sprite','pepsi','birra','peroni','nastro azzurro',
         's.bened','san benedetto','acqua s.ben','stefano','acqua nat 50']},
    {id:'lievitati', label:'🥐 Lievitati, Torte & Dolci',          color:'#fefce8',fg:'#854d0e',
     kw:['pane','brioche','cornetto','croissant','brioches','krapfen','ciambella','sfoglia',
         'plumcake','focaccia','torta','crostata','pasticceria','frolla','biscotto','biscotti',
         'merendina','wafer','fetta biscottata','fette biscottate','grissino','cracker','crackers',
         'tarallo','taralli','panettone','pandoro','colomba','veneziana','babà','baba','veneziane',
         'pancake','waffle','waffel','wafle','cialda','crepe','crêpe',
         'pastier','carezza','vien.','vienn','tulip','pasticciotto','rustic',
         'bisc.','panfette','mini tris','tris fantasia','fantasia 40','nonna rotonda','lemoncake','lemon cake',
         'focac.']},
    {id:'latticini', label:'🧀 Latte, Yogurt, Latticini & Formaggi',        color:'#f0fdf4',fg:'#166534',
     kw:['latte','yogurt','burro','formaggio','mozzarella','ricotta','panna','mascarpone',
         'scamorza','provolone','pecorino','grana','parmigiano','philadelphia','stracchino',
         'kefir','fontina','emmental','cheddar','fior di latte','primo sale','asiago','brie',
         'camembert','gruyere','gruviera','taleggio','caciotta','caciocavallo','robiola',
         'edamer','edam',
         'form.','formagg','cacioc','canestr',
         'bevan. avena','bevanda avena','avena valsoia','avena bio','avena s.g.','latte avena',
         'drink avena','bevan. soia','bevanda soia','latte soia','drink soia','avena 1 l',
         'latte mandorla','latte riso','drink riso','bevanda riso','bevanda mandorla']},
    {id:'uova',      label:'🥚 Uova',                               color:'#fffbeb',fg:'#78350f',
     kw:['uovo','uova']},
    {id:'bacon',     label:'🥓 Bacon',                              color:'#fef2f2',fg:'#991b1b',
     kw:['bacon','pancetta affum','pancetta tesa','pancetta coppata']},
    {id:'salumi',    label:'🍖 Salumi',                      color:'#fce7f3',fg:'#9d174d',
     kw:['prosciutto','salame','bresaola','mortadella','mort.','speck','coppa','pancetta','wurstel',
         'affettato','salsiccia','lardo','guanciale','culatello','lonza','cotto','crudo',
         'tacchino','fesa tacchino','arrosto tacchino','pollo arrosto','pollo cotto']},
    {id:'miele',     label:'🍯 Miele, Confetture, Nutella, Frutta secca, Fette biscottate & Cereali', color:'#fef3c7',fg:'#b45309',
     kw:['miele','sciroppo','scirop.','nutella','crema nocciola','crema di nocciole',
         'cereali','fiocchi','avena','granola','corn flakes','muesli','kellogg',
         'frutta secca','noci','mandorle','nocciole','pistacchio','uvetta','anacardi','pinoli','datteri',
         'marmellata','confettura','conf.s.day','s.day','zucchero','dolcificante','bifette',
         'semi di chia','chia','sesamo','semi di lino','semi di girasole',
         'olio extrav','olio oliv','olio di oliv']},
    {id:'succhi',    label:'🧃 Succhi & Bevande',                   color:'#fff7ed',fg:'#9a3412',
     kw:['succo brik','brik succo','zuegg','brik arancio','brik pesca','brik ace','brik mela',
         'succo 200','succo 125','succo di frutta','nectar','nettare',
         'santal','bev.ace','g.d.sapori']},
    {id:'distributori',label:'🤖 Distributori bevande',             color:'#fdf4ff',fg:'#7e22ce',
     kw:['tube ','tube multi','tube silver','tube gold','tube purple','tube red',
         'multivitamin','multivitam','vitamina c','vitamina d',
         'caffe spray',"caffe' spray",'caffe lio','spray caffe','liofilizzato','lio.puro',
         'tostato','caffe tostato','grani caffe',
         'cioccolato','cacao','orzo instant','cappuccino instant']},
    {id:'frutta',    label:'🍓 Frutta fresca',                      color:'#dcfce7',fg:'#15803d',
     kw:['kiwi','melone','anguria','ananas','banana','banan','mela ','mele',
         'pesca','pesche','percoc','arancia','arance','fragola','fragole',
         'lampone','lamponi','mirtillo','mirtilli','pera','pere',
         'ciliegia','ciliegie','pompelmo','mango','papaya',
         'cantalupo','macedonia','clementine','mandarino','uva','frutta fresca','frutti di bosco',
         'stark','golden del','fuji','granny']},
    {id:'sottoli',   label:'🫒 Sottoli & Conserve buffet',          color:'#f7fee7',fg:'#3f6212',
     kw:["pomodori secchi","sott'olio","sottoli","capperi","giardiniera",
         "sacla","acciughe","tonno","antipasto","peperoni grig","verdure grig",
         "melanzane","melanzana","melanzane filetti","d'amico"]},
    {id:'verdure',   label:'🥗 Verdure buffet',                     color:'#f0fdf4',fg:'#14532d',
     kw:['pomodori','pomod','ciliegine','insalata','verdura','zucchine','peperoni','rucola','lattuga',
         'radicchio','spinaci','funghi','carote','sedano','finocchio','broccoli',
         'cetriol','asparagi','carciofi','cipolla','cavolfiore',
         'misticanza','songino','indivia','bieta','cavolo',
         'olive','limone','limoni']},
    {id:'nonalim',   label:'📦 Non alimentari bar e cucina',                     color:'#f8fafc',fg:'#475569',
     kw:['pellicola','carta forno','rotolo pvc','alluminio','film pvc','film alim',
         'sacchetto','busta frigo','guanti mono','tovagliolo','tovaglietta','stuzzicadenti',
         'detersivo','detergente','sapone mani','candeggina','alcool etil',
         'carta assorbente','veline','bicchiere monouso','piatto monouso',
         'bicch.','palette','sacchi','rotolo carta','fazzoletti','tovagliett',
         'shopper','bag kraft','contenitore alim','vaschetta alim']},
];

const SPESE_CAT_OVERRIDE_KEY='qm_spese_cat_override';
let _speseCatOverride={};
function speseCatLoadOverride(){
  try{const s=localStorage.getItem(SPESE_CAT_OVERRIDE_KEY);_speseCatOverride=s?JSON.parse(s):{};}catch(e){_speseCatOverride={};}
}
speseCatLoadOverride();
function speseCatNormDesc(s){return String(s||'').trim().toLowerCase();}
function speseCatSetOverride(desc,catId){
  const k=speseCatNormDesc(desc);
  if(!k)return;
  _speseCatOverride[k]=catId;
  const json=JSON.stringify(_speseCatOverride);
  try{localStorage.setItem(SPESE_CAT_OVERRIDE_KEY,json);}catch(e){}
  kvSet(SPESE_CAT_OVERRIDE_KEY,json).catch(()=>{});
}
function speseCatMoveProduct(desc,newCatId){
  if(!newCatId)return;
  speseCatSetOverride(desc,newCatId);
  ddtRenderSpese();
}
// Menu personalizzato (stile Compass) per riassegnare la categoria di un prodotto,
// al posto del menu nativo del browser (illeggibile e non personalizzabile)
function speseCatToggleMenu(id){
  document.querySelectorAll('.spese-cat-menu').forEach(m=>{if(m.id!==id)m.style.display='none';});
  const el=document.getElementById(id);
  if(el)el.style.display=el.style.display==='none'?'block':'none';
}
document.addEventListener('click',()=>{document.querySelectorAll('.spese-cat-menu').forEach(m=>m.style.display='none');});
let _ddtTab='spese';
let _ddtMonth='';
let _ddtFilter='';
let _ddtSearch='';
let _ddtUploadModal=null;
let _ddtParsedData=null;
let _ddtUploadFornitore='';
let _ddtUploadHotel='sa';
let _ddtEditingId=null;
// Categoria/pannello espanso in Analisi Spese Fornitori — persiste tra i re-render
// così "Sposta" un prodotto non riporta l'utente alla lista principale delle categorie.
let _speseCatOpen=null;
let _speseUncatOpen=false;

function ddtSetTab(tab){_ddtTab=tab;ddtRenderSpese();if(tab==='spese')ddtRenderList();}
function ddtSpeseToggleCat(id){
  _speseCatOpen=(_speseCatOpen===id)?null:id;
  const d=document.getElementById('spesecatdet-'+id);
  if(d)d.style.display=_speseCatOpen===id?'block':'none';
}
function ddtSpeseToggleUncat(){
  _speseUncatOpen=!_speseUncatOpen;
  const d=document.getElementById('uncat-det-spese');
  if(d)d.style.display=_speseUncatOpen?'block':'none';
}

function ddtBuildAnalisi(){
  const all=ddtGet();
  const _nf=d=>ddtNormForn(d.fornitore)||d.fornitore;
  // solo fornitori breakfast (esclude DECA/hk, Amonn/altro)
  const bkfAll=all.filter(d=>{const forn=_nf(d);return(DDT_FORNITORI[forn]?.reparto||d.reparto||'bkf')==='bkf';});
  const _conf=f=>DDT_FORNITORI[f]||{color:'#f1f5f9',fg:'#64748b',accent:'#94a3b8'};
  const _fmt=n=>n!=null&&n!==''?'€'+Number(n).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:true}):'—';
  const _parseD=s=>{if(!s)return 0;const p=s.split('/');return p.length===3?new Date(p[2],p[1]-1,p[0]).getTime():0;};

  // ── Carica storico coperti ──
  let bkfHist={};
  try{bkfHist=JSON.parse(localStorage.getItem('qm_bkf_monthly_history')||'{}');}catch(e){}
  // Aggrega per mese YYYY-MM → {bb, ro} — mese corrente: solo date ≤ oggi
  // (altrimenti il totale include giorni futuri già presenti nello storico,
  // disallineandosi dall'etichetta "al gg/mm" mostrata in tabella)
  const _todayCop=new Date();_todayCop.setHours(23,59,59,999);
  const _nowYMCop=_todayCop.getFullYear()+'-'+String(_todayCop.getMonth()+1).padStart(2,'0');
  const copertiPerMese={};
  Object.entries(bkfHist).forEach(([k,v])=>{
    if(k.length!==10)return;
    const ym=k.substring(0,7);
    if(ym===_nowYMCop){const dt=new Date(k+'T00:00:00');if(dt>_todayCop)return;}
    if(!copertiPerMese[ym])copertiPerMese[ym]={bb:0,ro:0};
    copertiPerMese[ym].bb+=(v.bb||0);
    copertiPerMese[ym].ro+=(v.ro||0);
  });

  // Spesa BKF per mese (solo fornitori breakfast)
  const spesaBkfPerMese={};
  bkfAll.forEach(d=>{
    const ym=ddtYM(d.data);if(!ym)return;
    if(!spesaBkfPerMese[ym])spesaBkfPerMese[ym]=0;
    spesaBkfPerMese[ym]+=(d.totale_ordine||0);
  });

  // Mesi in comune tra spesa e coperti
  const mesiComuni=[...new Set([...Object.keys(spesaBkfPerMese),...Object.keys(copertiPerMese)])].sort().reverse();
  const MON_IT=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const _monLabel=ym=>{const[y,m]=ym.split('-');return MON_IT[parseInt(m)-1]+' '+y;};

  // ── A: price history per (forn, prodotto) ──
  const priceMap={};
  bkfAll.forEach(ddt=>{
    const forn=_nf(ddt);
    (ddt.articoli||[]).forEach(a=>{
      if(!a.descrizione||a.prezzo_unit==null)return;
      const k=forn+'||'+a.descrizione.toLowerCase().trim().replace(/\s+/g,' ');
      if(!priceMap[k])priceMap[k]={desc:a.descrizione,forn,entries:[]};
      // ddtId/numeroDdt servono a risalire in un clic al documento che ha generato il
      // prezzo, spesso un refuso di scansione (es. 14,75 letto come 59,00) più che un
      // rialzo reale — vedi bottone "Verifica DDT" più sotto.
      priceMap[k].entries.push({data:ddt.data,ts:_parseD(ddt.data),prezzo:Number(a.prezzo_unit),unita:a.unita||'',ddtId:ddt.id,numeroDdt:ddt.numero_ddt||''});
    });
  });
  const trendItems=Object.values(priceMap).filter(p=>p.entries.length>=2).map(p=>{
    const sorted=[...p.entries].sort((a,b)=>a.ts-b.ts);
    const latest=sorted[sorted.length-1],prev=sorted[sorted.length-2];
    const varPct=prev.prezzo?((latest.prezzo-prev.prezzo)/prev.prezzo*100):0;
    const min=Math.min(...sorted.map(e=>e.prezzo)),max=Math.max(...sorted.map(e=>e.prezzo));
    return{...p,sorted,latest,prev,varPct,min,max};
  }).sort((a,b)=>b.varPct-a.varPct);
  const alerts=trendItems.filter(p=>p.varPct>5);

  // ── B: ranking ──
  const prodSpend={};
  bkfAll.forEach(ddt=>{
    const forn=_nf(ddt);
    (ddt.articoli||[]).forEach(a=>{
      if(!a.descrizione)return;
      const k=a.descrizione.toLowerCase().trim().replace(/\s+/g,' ');
      if(!prodSpend[k])prodSpend[k]={desc:a.descrizione,total:0,count:0,forn:new Set()};
      prodSpend[k].total+=(a.totale||(a.qta&&a.prezzo_unit?a.qta*a.prezzo_unit:0));
      prodSpend[k].count++;
      prodSpend[k].forn.add(forn);
    });
  });
  const topSpend=Object.values(prodSpend).filter(p=>p.total>0).sort((a,b)=>b.total-a.total).slice(0,10);
  const topFreq=Object.values(prodSpend).sort((a,b)=>b.count-a.count).slice(0,8);

  // ── D: multi-supplier ──
  const multiMap={};
  bkfAll.forEach(ddt=>{
    const forn=_nf(ddt);
    (ddt.articoli||[]).forEach(a=>{
      if(!a.descrizione||a.prezzo_unit==null)return;
      const k=a.descrizione.toLowerCase().trim().replace(/\s+/g,' ');
      if(!multiMap[k])multiMap[k]={desc:a.descrizione,forn:{}};
      if(!multiMap[k].forn[forn])multiMap[k].forn[forn]=[];
      multiMap[k].forn[forn].push(Number(a.prezzo_unit));
    });
  });
  const multiItems=Object.values(multiMap).filter(p=>Object.keys(p.forn).length>=2).map(p=>{
    const list=Object.entries(p.forn).map(([f,pp])=>({f,avg:pp.reduce((s,v)=>s+v,0)/pp.length,min:Math.min(...pp),max:Math.max(...pp),conf:_conf(f)})).sort((a,b)=>a.avg-b.avg);
    const diff=list.length>=2?((list[list.length-1].avg-list[0].avg)/list[0].avg*100):0;
    return{...p,list,diff};
  }).sort((a,b)=>b.diff-a.diff);

  // ── C: categorie prodotto ── (CAT_RULES/CAT_ICONS_SPESE ora globali, vedi sopra DDT_FORNITORI)
  const selMese=ddtAnalCurMese();
  const catDdts=bkfAll.filter(d=>ddtYM(d.data)===selMese);
  const catTotals={};const catItems={};const uncatItems=[];
  CAT_RULES.forEach(c=>{catTotals[c.id]=0;catItems[c.id]=[];});
  catDdts.forEach(ddt=>{
    const forn=_nf(ddt);
    (ddt.articoli||[]).forEach(a=>{
      if(!a.descrizione)return;
      const desc=a.descrizione.toLowerCase();
      const val=a.totale||(a.qta&&a.prezzo_unit?a.qta*a.prezzo_unit:0);
      if(!val)return;
      // La riassegnazione manuale (speseCatSetOverride) ha sempre priorità sulle keyword
      const override=_speseCatOverride[speseCatNormDesc(a.descrizione)];
      const cat=override?{id:override}:CAT_RULES.find(c=>c.kw.some(kw=>desc.includes(kw)));
      if(cat&&catTotals[cat.id]!==undefined){catTotals[cat.id]+=val;catItems[cat.id].push({desc:a.descrizione,forn,val});}
      else if(override){catTotals[override]=(catTotals[override]||0)+val;(catItems[override]=catItems[override]||[]).push({desc:a.descrizione,forn,val});}
      else uncatItems.push({desc:a.descrizione,forn,val});
    });
  });
  const catGrandTotal=Object.values(catTotals).reduce((s,v)=>s+v,0);

  // ── Alert preventivo (mese corrente in corso) ──
  const todayD=new Date();
  const nowYM=todayD.getFullYear()+'-'+String(todayD.getMonth()+1).padStart(2,'0');
  const dayOfMon=todayD.getDate();
  const daysInMon=new Date(todayD.getFullYear(),todayD.getMonth()+1,0).getDate();
  const curMonDdts=bkfAll.filter(d=>ddtYM(d.data)===nowYM);
  const spesaCurr=curMonDdts.reduce((s,d)=>s+(d.totale_ordine||0),0);
  const projected=dayOfMon>0?spesaCurr/dayOfMon*daysInMon:0;
  const [pY,pM]=nowYM.split('-').map(Number);
  const prevYM=pM===1?`${pY-1}-12`:`${pY}-${String(pM-1).padStart(2,'0')}`;
  const spesaPrevMon=spesaBkfPerMese[prevYM]||0;

  let h='';

  // ── SEZIONE 4: alert preventivo (prima di "Spesa e coperti mensili": è l'informazione
  // più immediatamente azionabile — dove sta andando la spesa questo mese — mentre la
  // tabella sotto è lo storico di dettaglio) ──
  if(spesaCurr>0&&dayOfMon<daysInMon){
    const projDelta=projected-spesaPrevMon;
    const projDeltaPct=spesaPrevMon?projDelta/spesaPrevMon*100:0;
    const isOver=projDelta>0;
    const alertColor=Math.abs(projDeltaPct)>10?(isOver?'#fef2f2':'#f0fdf4'):'#fffbeb';
    const alertBorder=Math.abs(projDeltaPct)>10?(isOver?'var(--red)':'var(--green)'):'var(--amber)';
    const alertFg=Math.abs(projDeltaPct)>10?(isOver?'var(--red)':'var(--green)'):'#92400e';
    const arrow=isOver?'↑':'↓';
    h+=`<div style="margin-bottom:22px;">
    <div style="font-size:var(--fs-sm);font-weight:800;color:var(--text);margin-bottom:8px;">🔔 Proiezione mese corrente</div>
    <div style="background:${alertColor};border:1px solid ${alertBorder};border-radius:10px;padding:14px 16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
        <div>
          <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:2px;">Spesa al ${dayOfMon}/${String(todayD.getMonth()+1).padStart(2,'0')}</div>
          <div style="font-size:var(--fs-md);font-weight:800;color:var(--text);">${_fmt(spesaCurr)}</div>
          <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-top:4px;">su ${curMonDdts.length} DDT caricati (${daysInMon-dayOfMon} giorni rimanenti)</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:2px;">Proiezione a fine mese</div>
          <div style="font-size:var(--fs-md);font-weight:800;color:var(--text);">${_fmt(projected)}</div>
          ${spesaPrevMon?`<div style="font-size:var(--fs-xs);font-weight:700;color:${alertFg};margin-top:4px;">${arrow} ${Math.abs(projDeltaPct).toFixed(1)}% vs ${_monLabel(prevYM)} (${_fmt(spesaPrevMon)})</div>`:''}
        </div>
      </div>
      ${spesaPrevMon&&Math.abs(projDeltaPct)>10?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid ${alertBorder};opacity:0.9;font-size:var(--fs-xxs);color:var(--text);">
        <b>Attenzione:</b> al ritmo attuale si prevede una spesa ${isOver?'superiore':'inferiore'} del ${Math.abs(projDeltaPct).toFixed(0)}% rispetto al mese scorso.
      </div>`:''}
    </div></div>`;
  }

  // ── SEZIONE 0: Spesa e coperti mensili ──
  // Prima: due colonne "VAR%" identiche (una per spesa, una per coperti) senza dire a cosa
  // si riferisce ciascuna, percentuali sole senza il valore prima/dopo, e per il mese in
  // corso un confronto fuorviante (spesa/coperti dei primi N giorni contro il mese PRECEDENTE
  // intero — mostrava sempre un calo enorme, indipendentemente dal ritmo reale). Sistemato:
  // il delta va sotto il valore a cui appartiene (niente colonne ambigue), mostra il valore
  // del mese precedente tra parentesi, aggiunta la spesa per coperto (il numero che conta
  // davvero: spesa e coperti possono muoversi insieme senza che cambi nulla nel costo per
  // ospite), e il mese in corso si confronta a parità di giorni contro lo stesso periodo del
  // mese precedente, non contro il suo totale intero.
  h+=`<div style="margin-bottom:22px;">
  <div style="font-size:var(--fs-sm);font-weight:800;color:var(--text);margin-bottom:4px;">☕ Spesa e coperti mensili</div>
  <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:10px;">Spesa fornitori e coperti BB per mese · sotto ogni valore la variazione rispetto al mese precedente.</div>`;
  if(!mesiComuni.length){
    h+=`<div style="color:var(--text-dim);font-size:var(--fs-xs);">Nessun dato disponibile — carica DDT e report pasti.</div>`;
  }else{
    const _varPct=(cur,prev)=>{if(!prev)return null;return(cur-prev)/prev*100;};
    // invertGood=true → calo è verde (spesa, €/coperto); invertGood=false → aumento è verde (coperti)
    const _varLine=(pct,prevVal,fmtPrev,invertGood)=>{
      if(pct===null)return'<div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-top:2px;">mese prec. n/d</div>';
      const good=invertGood?pct<=0:pct>=0;
      const c=Math.abs(pct)<1?'var(--text-dim)':(good?'var(--green)':'var(--red)');
      const arr=pct>0.5?'↑':pct<-0.5?'↓':'→';
      return`<div style="font-size:var(--fs-xxs);color:${c};font-weight:700;margin-top:2px;white-space:nowrap;">${arr} ${Math.abs(pct).toFixed(1)}% <span style="color:var(--text-dim);font-weight:400;">vs ${fmtPrev(prevVal)}</span></div>`;
    };
    // Spesa/coperti dei primi N giorni di un mese — usati solo per il confronto "a parità di
    // giorni" del mese in corso, che altrimenti sarebbe sempre e comunque in forte calo.
    const _spesaPrimiGG=(ym,n)=>bkfAll.filter(d=>{if(ddtYM(d.data)!==ym)return false;const dd=parseInt((d.data||'').split('/')[0],10);return dd&&dd<=n;}).reduce((s,d)=>s+(d.totale_ordine||0),0);
    const _copPrimiGG=(ym,n)=>Object.entries(bkfHist).filter(([k])=>k.length===10&&k.startsWith(ym)&&parseInt(k.substring(8,10),10)<=n).reduce((s,[,v])=>s+(v.bb||0),0);
    const _mesi12=mesiComuni.slice(0,13);
    h+=`<div style="background:var(--surface);border:1px solid var(--border-light);border-radius:10px;overflow:hidden;">
    <table style="width:100%;border-collapse:collapse;">
    <thead><tr style="background:var(--bg);">
      <th style="padding:7px 12px;text-align:left;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;">MESE</th>
      <th style="padding:7px 10px;text-align:center;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;">SPESA</th>
      <th style="padding:7px 10px;text-align:center;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;">COPERTI</th>
      <th style="padding:7px 10px;text-align:center;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;">€ / COPERTO</th>
    </tr></thead><tbody>`;
    _mesi12.slice(0,12).forEach((ym,i)=>{
      const spesa=spesaBkfPerMese[ym]||0;
      const cop=copertiPerMese[ym]?.bb||0;
      const perCop=cop?spesa/cop:null;
      const isCur=ym===ddtCurMonth();
      const ymPrev=_mesi12[i+1];
      let spesaPrev,copPrev,fmtPrevSpesa,fmtPrevCop,ggNote='';
      if(isCur&&ymPrev){
        // Parità di giorni: "primi 9 giorni" contro "primi 9 giorni" del mese precedente,
        // non contro il mese precedente intero — altrimenti il calo è garantito e non dice
        // nulla sul ritmo reale.
        spesaPrev=_spesaPrimiGG(ymPrev,dayOfMon);
        copPrev=_copPrimiGG(ymPrev,dayOfMon);
        fmtPrevSpesa=v=>'gg 1-'+dayOfMon+' '+_monLabel(ymPrev).split(' ')[0];
        fmtPrevCop=fmtPrevSpesa;
        ggNote=`<div style="font-size:9px;color:var(--text-dim);opacity:.75;margin-top:1px;">al ${todayD.getDate()}/${todayD.getMonth()+1} · mese in corso</div>`;
      }else{
        spesaPrev=ymPrev?(spesaBkfPerMese[ymPrev]||0):null;
        copPrev=ymPrev?(copertiPerMese[ymPrev]?.bb||0):null;
        fmtPrevSpesa=v=>_fmt(v)+' '+_monLabel(ymPrev).split(' ')[0];
        fmtPrevCop=v=>v+' '+_monLabel(ymPrev).split(' ')[0];
      }
      const perCopPrev=(spesaPrev&&copPrev)?spesaPrev/copPrev:null;
      const vSpesa=spesa?_varLine(spesaPrev!==null?_varPct(spesa,spesaPrev):null,spesaPrev,fmtPrevSpesa,true):'';
      const vCop=cop?_varLine(copPrev!==null?_varPct(cop,copPrev):null,copPrev,fmtPrevCop,false):'';
      const vPerCop=perCop!==null?_varLine(perCopPrev!==null?_varPct(perCop,perCopPrev):null,perCopPrev,v=>_fmt(v)+' '+_monLabel(ymPrev).split(' ')[0],true):'';
      h+=`<tr style="${i>0?'border-top:1px solid var(--border-light)':''}${isCur?';background:var(--accent-bg)':''}">
        <td style="padding:8px 12px;font-size:var(--fs-xs);font-weight:${isCur?700:400};color:${isCur?'var(--accent)':'var(--text)'};">${_monLabel(ym)}${isCur?'<div style="font-size:9px;color:var(--accent);opacity:.8;">in corso</div>':''}</td>
        <td style="padding:8px 10px;text-align:center;">
          <div style="font-size:var(--fs-xs);font-weight:600;color:var(--text);">${spesa?_fmt(spesa):'—'}</div>${vSpesa}
        </td>
        <td style="padding:8px 10px;text-align:center;">
          <div style="font-size:var(--fs-xs);color:var(--text);">${cop||'—'}${ggNote}</div>${vCop}
        </td>
        <td style="padding:8px 10px;text-align:center;">
          <div style="font-size:var(--fs-xs);font-weight:700;color:var(--accent);">${perCop!==null?_fmt(perCop):'—'}</div>${vPerCop}
        </td>
      </tr>`;
    });
    h+=`</tbody></table></div>`;
  }
  h+=`</div>`;

  // ── SEZIONE 3: categorie prodotto (stesse icone, stile e navigazione mese di breakfast.html) ──
  {
    const catList=[...CAT_RULES.map(c=>({...c,total:catTotals[c.id],items:catItems[c.id]})),{id:'altro',label:'Altro',color:'#f1f5f9',fg:'#64748b',total:catTotals.altro||0,items:catItems.altro||[]}].filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
    const catMax=catList[0]?.total||1;
    const nowYMCat=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
    const isCurCat=selMese===nowYMCat;
    h+=`<div style="margin-bottom:22px;">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
      <div style="font-size:var(--fs-sm);font-weight:800;color:var(--text);flex:1;">Spesa per categoria</div>
      <button onclick="ddtNavAnalMese(-1)" style="width:28px;height:28px;border:1px solid var(--border-light);background:var(--surface);border-radius:7px;cursor:pointer;font-size:16px;line-height:1;flex-shrink:0;">‹</button>
      <span style="font-size:12px;font-weight:700;color:${isCurCat?'var(--accent)':'var(--text)'};min-width:90px;text-align:center;">${ddtMonLabel(selMese)}</span>
      <button onclick="ddtNavAnalMese(1)" style="width:28px;height:28px;border:1px solid var(--border-light);background:var(--surface);border-radius:7px;cursor:pointer;font-size:16px;line-height:1;flex-shrink:0;">›</button>
    </div>`;
    if(!catGrandTotal){
      h+=`<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">Nessuna spesa registrata per ${ddtMonLabel(selMese)}.</div></div>`;
    }else{
    h+=`<div style="background:var(--surface);border:1px solid var(--border-light);border-radius:10px;">`;
    catList.forEach((c,i)=>{
      const pct=catMax?c.total/catMax*100:0;
      const sharePct=catGrandTotal?c.total/catGrandTotal*100:0;
      const agg={};
      c.items.forEach(it=>{
        const k=it.forn+'§'+it.desc;
        if(!agg[k])agg[k]={desc:it.desc,forn:it.forn,val:0,n:0};
        agg[k].val+=it.val;agg[k].n++;
      });
      const prodotti=Object.values(agg).sort((a,b)=>b.val-a.val);
      const detId='spesecatdet-'+c.id;
      h+=`<div style="${i>0?'border-top:1px solid var(--border-light)':''}">
        <div style="display:flex;align-items:center;gap:0;cursor:pointer;user-select:none;" onclick="ddtSpeseToggleCat('${c.id}')">
          <div style="flex:1;min-width:0;padding:10px 10px 8px 12px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              ${CAT_ICONS_SPESE[c.id]?`<div style="flex-shrink:0;"><img src="${CAT_ICONS_SPESE[c.id]}" width="38" height="38" style="object-fit:contain;display:block;"></div>`:''}
              <div style="font-size:13px;font-weight:600;color:var(--text);">${c.label.replace(/^\S+\s/,'')}</div>
            </div>
            <div style="height:3px;background:var(--border-light);border-radius:2px;"><div style="height:3px;width:${pct.toFixed(1)}%;background:${c.fg};border-radius:2px;"></div></div>
          </div>
          <div style="padding:10px 12px;text-align:right;flex-shrink:0;">
            <div style="font-size:14px;font-weight:800;color:var(--text);">${_fmt(c.total)}</div>
            <div style="font-size:10px;color:var(--text-dim);margin-top:1px;">${sharePct.toFixed(0)}%</div>
          </div>
        </div>
        <div id="${detId}" style="display:${_speseCatOpen===c.id?'block':'none'};border-top:1px solid var(--border-light);padding:8px 12px 10px 16px;background:var(--bg);">
          ${prodotti.map((p,pIdx)=>{
            const escDesc=p.desc.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
            const menuId='spesemenu-'+c.id+'-'+pIdx;
            const allCats=[...CAT_RULES,{id:'altro',label:'Altro'}];
            const menuRows=allCats.map(cr=>`<div onclick="event.stopPropagation();speseCatMoveProduct('${escDesc}','${cr.id}');document.getElementById('${menuId}').style.display='none';" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='transparent'" style="padding:8px 14px;font-size:13px;cursor:pointer;white-space:nowrap;background:transparent;${cr.id===c.id?'font-weight:700;color:var(--accent);':'color:var(--text);'}">${cr.label.replace(/^\S+\s/,'')}</div>`).join('');
            return`<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;gap:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.desc}</div>
              <div style="font-size:9px;color:var(--text-dim);">${p.forn}${p.n>1?' · '+p.n+' DDT':''}</div>
            </div>
            <div style="position:relative;flex-shrink:0;">
              <button onclick="event.stopPropagation();speseCatToggleMenu('${menuId}')" title="Sposta in un'altra categoria (vale per tutti i mesi, passati e futuri)" style="font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid var(--border-light);background:var(--surface);color:var(--text-dim);cursor:pointer;white-space:nowrap;">Sposta ▾</button>
              <div id="${menuId}" class="spese-cat-menu" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;z-index:50;background:var(--surface);border:1px solid var(--border-light);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.15);min-width:220px;max-height:280px;overflow-y:auto;">${menuRows}</div>
            </div>
            <span style="font-size:12px;font-weight:700;flex-shrink:0;white-space:nowrap;">${_fmt(p.val)}</span>
          </div>`;}).join('')}
        </div>
      </div>`;
    });
    h+=`</div></div>`;
    // ── Non classificati ──
    if(uncatItems.length){
      const uncatAgg={};
      uncatItems.forEach(it=>{
        const k=it.forn+'§'+it.desc;
        if(!uncatAgg[k])uncatAgg[k]={desc:it.desc,forn:it.forn,val:0,n:0};
        uncatAgg[k].val+=it.val;uncatAgg[k].n++;
      });
      const uncatSorted=Object.values(uncatAgg).sort((a,b)=>b.val-a.val);
      const uncatTot=uncatSorted.reduce((s,p)=>s+p.val,0);
      h+=`<div style="margin-bottom:22px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:800;color:#92400e;">⚠️ Non classificati</span>
        <span style="font-size:11px;color:#92400e;font-weight:700;">${_fmt(uncatTot)}</span>
      </div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
        <div style="padding:7px 12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-radius:10px 10px 0 0;" onclick="ddtSpeseToggleUncat()">
          <span style="font-size:11px;color:#92400e;">${uncatSorted.length} prodott${uncatSorted.length===1?'o':'i'} senza categoria — spostali con il menu qui sotto</span>
          <span style="font-size:11px;color:#92400e;">▾</span>
        </div>
        <div id="uncat-det-spese" style="display:${_speseUncatOpen?'block':'none'};border-top:1px solid #fde68a;padding:6px 12px;">
          ${uncatSorted.map((p,pIdx)=>{
            const escDesc=p.desc.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
            const menuId='spesemenu-unc-'+pIdx;
            const menuRows=CAT_RULES.map(cr=>`<div onclick="event.stopPropagation();speseCatMoveProduct('${escDesc}','${cr.id}');document.getElementById('${menuId}').style.display='none';" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='transparent'" style="padding:8px 14px;font-size:13px;cursor:pointer;white-space:nowrap;background:transparent;color:var(--text);">${cr.label.replace(/^\S+\s/,'')}</div>`).join('');
            return`<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;gap:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.desc}</div>
              <div style="font-size:9px;color:var(--text-dim);">${p.forn}${p.n>1?' · '+p.n+' DDT':''}</div>
            </div>
            <div style="position:relative;flex-shrink:0;">
              <button onclick="event.stopPropagation();speseCatToggleMenu('${menuId}')" title="Assegna una categoria (vale per tutti i mesi, passati e futuri)" style="font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid #fde68a;background:#fff;color:#92400e;cursor:pointer;white-space:nowrap;">Assegna ▾</button>
              <div id="${menuId}" class="spese-cat-menu" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;z-index:50;background:var(--surface);border:1px solid var(--border-light);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.15);min-width:220px;max-height:280px;overflow-y:auto;">${menuRows}</div>
            </div>
            <span style="font-size:12px;font-weight:700;flex-shrink:0;white-space:nowrap;">${_fmt(p.val)}</span>
          </div>`;}).join('')}
        </div>
      </div></div>`;
    }
    }
  }

  // ── SEZIONE A ──
  h+=`<div style="margin-bottom:22px;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
    <span style="font-size:var(--fs-sm);font-weight:800;color:var(--text);">📈 Trend prezzi</span>
    ${alerts.length?`<span style="background:#fef2f2;color:var(--red);font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;">${alerts.length} rialz${alerts.length===1?'o':'i'} &gt;5%</span>`:''}
  </div>`;
  if(!trendItems.length){
    h+=`<div style="color:var(--text-dim);font-size:var(--fs-xs);padding:12px 0;">Carica DDT dello stesso fornitore in date diverse per vedere i trend prezzi.</div>`;
  }else{
    if(alerts.length){
      alerts.forEach(p=>{
        // Il rialzo è quasi sempre un refuso di scansione (es. 14,75 letto 59,00) più che
        // un aumento reale del fornitore: il bottone porta dritto al DDT con il prezzo più
        // alto (p.latest, quello che genera l'alert) invece di dover cercarlo a mano nella
        // lista DDT per fornitore/mese.
        const ddtRef=p.latest.numeroDdt?`DDT ${p.latest.numeroDdt}`:'DDT '+p.latest.data;
        h+=`<div style="background:#fef2f2;border-left:3px solid var(--red);border-radius:8px;padding:8px 12px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div style="flex:1;min-width:160px;"><div style="font-size:var(--fs-xs);font-weight:700;color:var(--text);">${p.desc}</div>
          <div style="font-size:var(--fs-xxs);color:var(--text-dim);">${p.forn} · ${p.prev.data} → ${p.latest.data}</div></div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:var(--fs-sm);font-weight:800;color:var(--red);">↑ ${p.varPct.toFixed(1)}%</div>
            <div style="font-size:var(--fs-xxs);color:var(--text-dim);">${_fmt(p.prev.prezzo)} → <b>${_fmt(p.latest.prezzo)}</b></div>
          </div>
          ${p.latest.ddtId?`<button onclick="ddtOpenEditModal('${p.latest.ddtId}')" title="Apre il ${ddtRef} per controllare/correggere il prezzo scansionato" style="font-size:var(--fs-xxs);font-weight:700;padding:5px 10px;border-radius:7px;background:#fff;border:1px solid var(--red);color:var(--red);cursor:pointer;white-space:nowrap;flex-shrink:0;">🔍 Verifica ${ddtRef}</button>`:''}
          </div>`;
      });
    }
    h+=`<div style="background:var(--surface);border:1px solid var(--border-light);border-radius:10px;overflow:hidden;margin-top:${alerts.length?8:0}px;">
    <table style="width:100%;border-collapse:collapse;">
    <thead><tr style="background:var(--bg);">
      <th style="padding:7px 12px;text-align:left;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;">PRODOTTO</th>
      <th style="padding:7px 12px;text-align:left;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;">FORN.</th>
      <th style="padding:7px 10px;text-align:right;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;">ATTUALE</th>
      <th style="padding:7px 10px;text-align:right;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;">VAR%</th>
      <th style="padding:7px 10px;text-align:right;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;">MIN–MAX</th>
      <th style="padding:7px 10px;text-align:center;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;"></th>
    </tr></thead><tbody>`;
    trendItems.slice(0,25).forEach((p,i)=>{
      const vc=p.varPct>5?'var(--red)':p.varPct<-5?'var(--green)':'var(--text-dim)';
      const arr=p.varPct>0.5?'↑':p.varPct<-0.5?'↓':'→';
      const c=_conf(p.forn);
      // Il valore MAX potrebbe essere il prezzo reale più alto pagato, oppure un refuso di
      // scansione: il bottone porta dritto al DDT che l'ha generato per verificarlo.
      const maxEntry=p.sorted.find(e=>e.prezzo===p.max);
      const maxRef=maxEntry?.ddtId?`<button onclick="ddtOpenEditModal('${maxEntry.ddtId}')" title="Apre il DDT del ${_fmt(p.max)} (${maxEntry.numeroDdt?'DDT '+maxEntry.numeroDdt+', ':''}${maxEntry.data}) per verificarlo" style="font-size:11px;padding:2px 6px;border-radius:5px;background:var(--surface2);border:1px solid var(--border);color:var(--text-dim);cursor:pointer;">🔍</button>`:'';
      h+=`<tr style="${i>0?'border-top:1px solid var(--border-light)':''}">
        <td style="padding:7px 12px;font-size:var(--fs-xs);color:var(--text);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${p.desc}">${p.desc}</td>
        <td style="padding:7px 12px;"><span style="background:${c.color};color:${c.fg};padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">${p.forn}</span></td>
        <td style="padding:7px 10px;text-align:right;font-size:var(--fs-xs);font-weight:700;">${_fmt(p.latest.prezzo)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:var(--fs-xs);font-weight:700;color:${vc};">${arr} ${Math.abs(p.varPct).toFixed(1)}%</td>
        <td style="padding:7px 10px;text-align:right;font-size:var(--fs-xxs);color:var(--text-dim);white-space:nowrap;">${_fmt(p.min)}–${_fmt(p.max)}</td>
        <td style="padding:7px 10px;text-align:center;">${maxRef}</td>
      </tr>`;
    });
    h+=`</tbody></table></div>`;
  }
  h+=`</div>`;

  // ── SEZIONE B: top spesa ──
  h+=`<div style="margin-bottom:22px;">
  <div style="font-size:var(--fs-sm);font-weight:800;color:var(--text);margin-bottom:10px;">🏆 Top prodotti per spesa</div>`;
  if(!topSpend.length){h+=`<div style="color:var(--text-dim);font-size:var(--fs-xs);">Nessun dato</div>`;}
  else{
    const mx=topSpend[0].total;
    h+=`<div style="background:var(--surface);border:1px solid var(--border-light);border-radius:10px;overflow:hidden;">`;
    topSpend.forEach((p,i)=>{
      const pct=mx?p.total/mx*100:0;
      const tags=[...p.forn].map(f=>{const c=_conf(f);return`<span style="background:${c.color};color:${c.fg};padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;">${f}</span>`;}).join(' ');
      h+=`<div style="padding:8px 12px;${i>0?'border-top:1px solid var(--border-light)':''}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div style="font-size:var(--fs-xs);font-weight:600;color:var(--text);flex:1;padding-right:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.desc} ${tags}</div>
          <div style="font-size:var(--fs-xs);font-weight:800;color:var(--accent);white-space:nowrap;">${_fmt(p.total)}</div>
        </div>
        <div style="height:3px;background:var(--border-light);border-radius:2px;"><div style="height:3px;width:${pct.toFixed(1)}%;background:var(--accent);border-radius:2px;"></div></div>
      </div>`;
    });
    h+=`</div>`;
  }
  h+=`</div>`;

  // ── SEZIONE B2: top frequenza ──
  h+=`<div style="margin-bottom:22px;">
  <div style="font-size:var(--fs-sm);font-weight:800;color:var(--text);margin-bottom:10px;">🔄 Top prodotti per frequenza</div>`;
  if(!topFreq.length){h+=`<div style="color:var(--text-dim);font-size:var(--fs-xs);">Nessun dato</div>`;}
  else{
    const mx=topFreq[0].count;
    h+=`<div style="background:var(--surface);border:1px solid var(--border-light);border-radius:10px;overflow:hidden;">`;
    topFreq.forEach((p,i)=>{
      const pct=mx?p.count/mx*100:0;
      h+=`<div style="padding:8px 12px;${i>0?'border-top:1px solid var(--border-light)':''}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div style="font-size:var(--fs-xs);font-weight:600;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.desc}</div>
          <div style="font-size:var(--fs-xs);font-weight:800;color:var(--text-dim);white-space:nowrap;margin-left:8px;">${p.count}×</div>
        </div>
        <div style="height:3px;background:var(--border-light);border-radius:2px;"><div style="height:3px;width:${pct.toFixed(1)}%;background:#60a5fa;border-radius:2px;"></div></div>
      </div>`;
    });
    h+=`</div>`;
  }
  h+=`</div>`;

  // ── SEZIONE D: confronto fornitori ──
  h+=`<div style="margin-bottom:22px;">
  <div style="font-size:var(--fs-sm);font-weight:800;color:var(--text);margin-bottom:10px;">⚖️ Stesso prodotto, fornitori diversi</div>`;
  if(!multiItems.length){
    h+=`<div style="color:var(--text-dim);font-size:var(--fs-xs);">Nessun prodotto trovato su più fornitori.</div>`;
  }else{
    multiItems.slice(0,15).forEach(p=>{
      h+=`<div style="background:var(--surface);border:1px solid var(--border-light);border-radius:10px;padding:10px 14px;margin-bottom:8px;">
        <div style="font-size:var(--fs-xs);font-weight:700;color:var(--text);margin-bottom:8px;">${p.desc}
          ${p.diff>10?`<span style="font-size:9px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;margin-left:6px;font-weight:700;">Δ ${p.diff.toFixed(0)}% differenza</span>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">`;
      p.list.forEach((f,i)=>{
        const best=i===0;
        h+=`<div style="background:${best?f.conf.color:'var(--bg)'};border:1px solid ${best?f.conf.accent:'var(--border-light)'};border-radius:8px;padding:6px 10px;flex:1;min-width:80px;">
          <div style="font-size:9px;font-weight:700;color:${f.conf.fg};margin-bottom:2px;">${f.f}${best?' ✓':''}</div>
          <div style="font-size:var(--fs-sm);font-weight:800;color:${best?f.conf.fg:'var(--text)'};">${_fmt(f.avg)}</div>
          ${f.min!==f.max?`<div style="font-size:9px;color:var(--text-dim);">${_fmt(f.min)}–${_fmt(f.max)}</div>`:''}
        </div>`;
      });
      h+=`</div></div>`;
    });
  }
  h+=`</div>`;

  return h;
}
function ddtToggle(id){
  const body=document.getElementById('ddt-body-'+id);
  const chev=document.getElementById('ddt-chev-'+id);
  if(!body)return;
  const open=body.style.display!=='none';
  const isTr=body.tagName==='TR';
  body.style.display=open?'none':(isTr?'table-row':'block');
  if(chev)chev.style.transform=open?'':'rotate(180deg)';
}
function ddtGet(){try{return JSON.parse(localStorage.getItem(DDT_KEY)||'[]');}catch(e){return[];}}
function ddtNormForn(s){return ddtNormFornGeneric(s,DDT_FORNITORI);}
function ddtSave(arr){
  const json=JSON.stringify(arr);
  try{localStorage.setItem(DDT_KEY,json);}catch(e){}
  kvSet(DDT_KEY,json).catch(()=>{});
}
function ddtCurMonth(){
  if(!_ddtMonth){const n=new Date();_ddtMonth=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}
  return _ddtMonth;
}
function ddtNavMonth(dir){
  const[y,m]=ddtCurMonth().split('-').map(Number);
  const d=new Date(y,m-1+dir,1);
  _ddtMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  ddtRenderSpese();ddtRenderList();
}
function ddtSetMonth(ym){
  _ddtMonth=ym;
  ddtRenderSpese();ddtRenderList();
}
// Click su un mese nella pillola di un chip fornitore: vai a quel mese E filtra su quel fornitore
function ddtGoToMonth(nome,ym,evt){
  if(evt)evt.stopPropagation();
  _ddtMonth=ym;
  _ddtFilter=nome;
  _ddtSearch='';
  ddtRenderSpese();ddtRenderList();
}
let _analMese='';
function ddtAnalCurMese(){
  if(!_analMese){const n=new Date();_analMese=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}
  return _analMese;
}
function ddtNavAnalMese(dir){
  const[y,m]=ddtAnalCurMese().split('-').map(Number);
  const d=new Date(y,m-1+dir,1);
  _analMese=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  ddtRenderSpese();
}
function ddtMonLabel(ym){const[y,m]=ym.split('-').map(Number);return DDT_MON[m-1]+' '+y;}
function ddtFmt(n){if(!n&&n!==0)return'—';return'€ '+Number(n).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:true});}
function ddtYM(data){
  // "DD/MM/YYYY" → "YYYY-MM"
  const p=(data||'').split('/');
  if(p.length!==3)return'';
  return p[2]+'-'+p[1].padStart(2,'0');
}

// ── TAB SPESE ─────────────────────────────────────────────────────────────────
function ddtRenderSpese(){
  const view=document.getElementById('inv-spese-view');if(!view)return;
  // Il bottone report vive dentro tabBar (non nei due branch sotto) così è visibile
  // in entrambe le tab — "DDT & Fornitori" ritorna subito dopo se _ddtTab è 'analisi'.
  const tabBar=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
    <div style="display:flex;gap:0;flex:1;border-radius:10px;overflow:hidden;border:1px solid var(--border);">
      <button onclick="ddtSetTab('spese')" style="flex:1;padding:9px;border:none;background:${_ddtTab==='spese'?'var(--accent)':'var(--surface)'};color:${_ddtTab==='spese'?'#fff':'var(--text-dim)'};font-weight:700;font-size:var(--fs-xs);cursor:pointer;">🗂️ DDT &amp; Fornitori</button>
      <button onclick="ddtSetTab('analisi')" style="flex:1;padding:9px;border:none;border-left:1px solid var(--border);background:${_ddtTab==='analisi'?'var(--accent)':'var(--surface)'};color:${_ddtTab==='analisi'?'#fff':'var(--text-dim)'};font-weight:700;font-size:var(--fs-xs);cursor:pointer;">🔍 Insights Breakfast</button>
    </div>
    <button onclick="ddtOpenPrintModal()" style="padding:9px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-weight:700;font-size:var(--fs-xs);cursor:pointer;white-space:nowrap;flex-shrink:0;">🖨️ Report</button>
  </div>`;
  if(_ddtTab==='analisi'){view.innerHTML=tabBar+ddtBuildAnalisi();return;}
  const mon=ddtCurMonth();
  const all=ddtGet();
  const monDdt=all.filter(d=>ddtYM(d.data)===mon);
  const _nf=d=>ddtNormForn(d.fornitore)||d.fornitore;
  const _repOf=d=>DDT_FORNITORI[_nf(d)]?.reparto||d.reparto||'bkf';
  // mesi con ordini per fornitore (anno corrente)
  const curYear=new Date().getFullYear();
  const _fornMesi={};
  Object.keys(DDT_FORNITORI).forEach(k=>{_fornMesi[k]=new Set();});
  all.forEach(d=>{const nf=_nf(d);if(_fornMesi[nf]){const ym=ddtYM(d.data);if(ym&&ym.startsWith(String(curYear))){_fornMesi[nf].add(parseInt(ym.split('-')[1]));}}});
  const MON_ABB=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const _mesiPills=(nome,conf,active)=>{
    const mesi=[..._fornMesi[nome]].sort((a,b)=>a-b);
    if(!mesi.length)return `<div style="font-size:9px;color:var(--text-dim);margin-top:10px;">nessun ordine</div>`;
    return `<div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:10px;">${mesi.map(m=>{const ym=curYear+'-'+String(m).padStart(2,'0');const isCur=ym===mon;return`<span onclick="ddtGoToMonth('${nome}','${ym}',event)" style="font-size:9px;padding:1px 5px;border-radius:4px;cursor:pointer;background:${isCur?conf.accent:(active?conf.fg+'22':conf.color)};color:${isCur?'#fff':(active?conf.fg:'var(--text-dim)')};font-weight:${isCur?800:600};">${MON_ABB[m-1]}</span>`;}).join('')}</div>`;
  };

  // ── Topbar: tutti i mesi dell'anno in fila (cliccabili) + upload ──
  const monthRow=Array.from({length:12},(_,i)=>i+1).map(m=>{
    const ym=curYear+'-'+String(m).padStart(2,'0');
    const isCur=ym===mon;
    return `<button onclick="ddtSetMonth('${ym}')" style="padding:6px 11px;border:1px solid ${isCur?'var(--accent)':'var(--border)'};background:${isCur?'var(--accent)':'var(--surface)'};color:${isCur?'#fff':'var(--text-dim)'};border-radius:7px;font-size:var(--fs-xs);font-weight:${isCur?700:500};cursor:pointer;flex-shrink:0;white-space:nowrap;">${MON_ABB[m-1]}</button>`;
  }).join('');
  let h=tabBar+`<div style="display:flex;align-items:center;gap:6px;padding-bottom:14px;margin-bottom:16px;border-bottom:1px solid var(--border-light);overflow-x:auto;">
    ${monthRow}
    <button onclick="ddtOpenUploadModal()" style="padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:7px;font-size:var(--fs-xs);font-weight:700;cursor:pointer;flex-shrink:0;margin-left:auto;white-space:nowrap;">📷 Carica DDT</button>
  </div>`;

  // SAIMA è un fornitore attivo solo a gennaio/febbraio 2026 — da marzo in poi sparisce dai fornitori disponibili
  const _fornVisibili=Object.entries(DDT_FORNITORI).filter(([nome])=>!ddtSupplierHidden(nome,mon));

  // ── Card fornitori (cliccabili) con logo in evidenza, importo grande e mesi pills ──
  h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin-bottom:20px;">`;
  _fornVisibili.forEach(([nome,conf])=>{
    const fDdt=monDdt.filter(d=>_nf(d)===nome);
    const fTot=fDdt.reduce((s,d)=>s+(d.totale_ordine||0),0);
    const active=_ddtFilter===nome;
    const logoHtml=conf.logo?`<img src="${conf.logo}?v=4" alt="${nome}" style="height:56px;max-width:100%;object-fit:contain;display:block;margin:0 auto 10px;">`:`<div style="height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:10px;">
      <div style="width:36px;height:3px;background:${conf.accent};border-radius:2px;margin-bottom:8px;"></div>
      <div style="font-size:${nome.length>8?14:16}px;font-weight:800;letter-spacing:.04em;color:var(--text);text-transform:uppercase;">${nome}</div>
    </div>`;
    h+=`<div id="ddt-chip-${nome}" onclick="ddtSelectForn('${nome}')" style="background:${active?conf.color:'#fff'};border:1px solid ${active?conf.accent:'var(--border-light)'};border-top:3px solid ${conf.accent};border-radius:12px;padding:18px 14px;cursor:pointer;text-align:center;transition:background .15s,border-color .15s,box-shadow .15s;box-shadow:${active?'0 4px 14px rgba(0,0,0,.08)':'none'};">
      ${logoHtml}
      <div style="font-size:22px;font-weight:600;color:${fTot?'var(--text)':'var(--text-dim)'};">${fTot?ddtFmt(fTot):'—'}</div>
      <div style="font-size:var(--fs-xxs);color:${active?conf.fg:'var(--text-dim)'};margin-top:4px;opacity:.8;">${fDdt.length} DDT · ${conf.rLabel}${active?' ▲':' ▼'}</div>
      ${_mesiPills(nome,conf,active)}
    </div>`;
  });
  h+=`</div>`;

  // ── Lista DDT (visibile solo quando chip selezionato) ──
  h+=`<div id="ddtListSection"></div>`;

  // ── Storico 12 mesi — accordion, una colonna per fornitore ──
  const now=new Date();
  const months=[];
  for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}
  const fornList=Object.keys(DDT_FORNITORI);
  const byMon={};months.forEach(m=>{byMon[m]={};fornList.forEach(f=>{byMon[m][f]=0;});});
  all.forEach(d=>{const ym=ddtYM(d.data);if(!byMon[ym])return;const nf=_nf(d);if(byMon[ym][nf]==null)return;byMon[ym][nf]+=(d.totale_ordine||0);});
  const storId='storico-12m';
  const th=s=>`<th style="text-align:${s==='Mese'?'left':'right'};padding:7px 10px;font-size:var(--fs-xxs);font-weight:700;color:var(--text-dim);border-bottom:1px solid var(--border-light);white-space:nowrap;">${s}</th>`;
  h+=`<div style="margin-top:16px;background:var(--surface);border:1px solid var(--border-light);border-radius:10px;overflow:hidden;">
    <div onclick="ddtToggle('${storId}')" style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;">
      <span style="font-size:var(--fs-xs);font-weight:700;color:var(--text);">Storico 12 mesi</span>
      <span id="ddt-chev-${storId}" style="color:var(--text-dim);font-size:11px;display:inline-block;transition:transform .2s;">▼</span>
    </div>
    <div id="ddt-body-${storId}" style="display:none;border-top:1px solid var(--border-light);overflow-x:auto;">
      <table style="border-collapse:collapse;width:100%;">
      <thead><tr>${th('Mese')}${fornList.map(f=>th(f)).join('')}</tr></thead><tbody>`;
  [...months].reverse().forEach(ym=>{
    const r=byMon[ym];const isCur=ym===mon;
    h+=`<tr style="background:${isCur?'var(--accent-bg)':''}" >
      <td style="padding:7px 12px;font-size:var(--fs-xs);font-weight:${isCur?700:400};color:${isCur?'var(--accent)':'var(--text)'};white-space:nowrap;">${ddtMonLabel(ym)}</td>
      ${fornList.map(f=>`<td style="padding:7px 10px;font-size:var(--fs-xs);text-align:right;color:${r[f]?'var(--text)':'var(--text-dim)'};">${r[f]?ddtFmt(r[f]):'—'}</td>`).join('')}
    </tr>`;
  });
  h+=`</tbody></table></div></div>`;

  view.innerHTML=h;
  ddtRenderList();
}

function ddtSelectForn(nome){
  _ddtFilter=(_ddtFilter===nome)?'':nome;
  _ddtSearch='';
  ddtRenderSpese();
}

function ddtRenderList(){
  const view=document.getElementById('ddtListSection');if(!view)return;
  const mon=ddtCurMonth();
  const _parseDate=s=>{if(!s)return 0;const p=s.split('/');return p.length===3?new Date(p[2],p[1]-1,p[0]).getTime():0;};
  const all=ddtGet().filter(d=>ddtYM(d.data)===mon&&(ddtNormForn(d.fornitore)||d.fornitore)===_ddtFilter).sort((a,b)=>_parseDate(b.data)-_parseDate(a.data));
  const filtered=_ddtSearch?all.filter(d=>{
    const q=_ddtSearch.toLowerCase();
    const inArt=(d.articoli||[]).some(a=>(a.descrizione||'').toLowerCase().includes(q));
    return inArt||(d.numero_ddt||'').toLowerCase().includes(q);
  }):all;
  if(!_ddtFilter){view.innerHTML='';return;}
  const conf=DDT_FORNITORI[_ddtFilter]||{accent:'var(--accent)',fg:'var(--accent)'};
  let h=`<div style="border-top:2px solid ${conf.accent};margin-bottom:14px;padding-top:14px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="font-size:var(--fs-xs);font-weight:700;color:${conf.fg};text-transform:uppercase;letter-spacing:.04em;">DDT ${_ddtFilter}</span>
      <span style="font-size:var(--fs-xxs);color:var(--text-dim);margin-left:auto;">${all.length} documenti</span>
      <input type="text" placeholder="Cerca n° DDT, articolo…" oninput="_ddtSearch=this.value;ddtRenderList()" value="${_ddtSearch}" style="padding:5px 10px;border:1px solid var(--border);border-radius:7px;font-size:var(--fs-xxs);background:var(--surface);width:200px;">
    </div>`;
  if(!filtered.length){
    h+=`<div style="text-align:center;padding:32px 20px;color:var(--text-dim);font-size:var(--fs-xs);">${all.length?'Nessun risultato.':'Nessun DDT per '+_ddtFilter+' in questo mese.'}</div></div>`;
    view.innerHTML=h;return;
  }
  const thStyle='padding:8px 12px;font-size:var(--fs-xxs);font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid var(--border-light);white-space:nowrap;';
  h+=`<div style="overflow-x:auto;"><table style="border-collapse:collapse;width:100%;">
    <thead><tr style="background:var(--surface);">
      <th style="${thStyle}text-align:left;">Fornitore</th>
      <th style="${thStyle}text-align:left;">Data</th>
      <th style="${thStyle}text-align:left;">N° DDT</th>
      <th style="${thStyle}text-align:center;">Art.</th>
      <th style="${thStyle}text-align:left;">Hotel</th>
      <th style="${thStyle}text-align:left;">Reparto</th>
      <th style="${thStyle}text-align:right;">Totale</th>
      <th style="${thStyle}text-align:center;width:28px;"></th>
    </tr></thead><tbody>`;
  filtered.forEach((d,i)=>{
    const nf=ddtNormForn(d.fornitore)||d.fornitore||'—';
    const conf=DDT_FORNITORI[nf]||{};
    const repLabel=conf.rLabel||(d.reparto==='hk'?'HK':'BKF');
    const hotelLabel=d.hotel==='ar'?'Art Resort':'SoulArt';
    const zebra=i%2===1?'background:var(--surface);':'';
    const artRows=(d.articoli||[]).map(a=>`<tr style="border-bottom:1px solid var(--border-light);">
      <td style="padding:6px 12px;font-size:var(--fs-xs);color:var(--text);">${a.descrizione||''}</td>
      <td style="padding:6px 12px;font-size:var(--fs-xs);text-align:right;color:var(--text-dim);white-space:nowrap;">${a.qta!=null?a.qta:''} ${a.unita||''}</td>
      <td style="padding:6px 12px;font-size:var(--fs-xs);text-align:right;color:var(--text-dim);">${a.prezzo_unit!=null?'€ '+Number(a.prezzo_unit).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:true}):''}</td>
      <td style="padding:6px 12px;font-size:var(--fs-xs);text-align:right;font-weight:600;color:var(--text);">${a.totale!=null?'€ '+Number(a.totale).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:true}):''}</td>
      <td></td><td></td><td></td><td></td>
    </tr>`).join('');
    // Main row
    h+=`<tr onclick="ddtToggle('${d.id}')" style="${zebra}cursor:pointer;border-bottom:1px solid var(--border-light);" onmouseover="this.style.background='var(--accent-bg)'" onmouseout="this.style.background='${zebra?'var(--surface)':''}'">
      <td style="padding:10px 12px;font-size:var(--fs-xs);font-weight:700;color:var(--text);">${nf}</td>
      <td style="padding:10px 12px;font-size:var(--fs-xs);color:var(--text-dim);white-space:nowrap;">${d.data||'—'}</td>
      <td style="padding:10px 12px;font-size:var(--fs-xs);color:var(--text-dim);">${d.numero_ddt||'—'}</td>
      <td style="padding:10px 12px;font-size:var(--fs-xs);text-align:center;color:var(--text-dim);">${(d.articoli||[]).length}</td>
      <td style="padding:10px 12px;font-size:var(--fs-xxs);"><span style="background:var(--accent-bg);color:var(--accent);padding:2px 8px;border-radius:10px;font-weight:700;white-space:nowrap;">${hotelLabel}</span></td>
      <td style="padding:10px 12px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:600;">${repLabel}</td>
      <td style="padding:10px 12px;font-size:var(--fs-xs);text-align:right;font-weight:800;color:var(--accent);white-space:nowrap;">${ddtFmt(d.totale_ordine)}</td>
      <td style="padding:10px 12px;text-align:center;"><span id="ddt-chev-${d.id}" style="color:var(--text-dim);font-size:11px;display:inline-block;transition:transform .2s;">▼</span></td>
    </tr>`;
    // Detail row (hidden)
    h+=`<tr id="ddt-body-${d.id}" style="display:none;">
      <td colspan="8" style="padding:0;border-bottom:2px solid var(--accent);">
        <div style="background:var(--bg);padding:4px 0;">
          <table style="border-collapse:collapse;width:100%;">
            <thead><tr style="background:var(--surface);">
              <th style="padding:6px 12px;font-size:var(--fs-xxs);font-weight:700;color:var(--text-dim);text-align:left;">Articolo</th>
              <th style="padding:6px 12px;font-size:var(--fs-xxs);font-weight:700;color:var(--text-dim);text-align:right;">Qtà</th>
              <th style="padding:6px 12px;font-size:var(--fs-xxs);font-weight:700;color:var(--text-dim);text-align:right;">P.Unit</th>
              <th style="padding:6px 12px;font-size:var(--fs-xxs);font-weight:700;color:var(--text-dim);text-align:right;">Totale</th>
              <th colspan="4"></th>
            </tr></thead>
            <tbody>${artRows}</tbody>
          </table>
          <div style="padding:8px 12px;text-align:right;display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="event.stopPropagation();ddtOpenEditModal('${d.id}')" style="font-size:var(--fs-xxs);padding:5px 14px;border-radius:8px;background:var(--accent-bg);border:1px solid var(--accent);color:var(--accent);cursor:pointer;font-weight:600;">✏️ Modifica</button>
            <button onclick="event.stopPropagation();ddtDelete('${d.id}')" style="font-size:var(--fs-xxs);padding:5px 14px;border-radius:8px;background:#fff0f0;border:1px solid #fca5a5;color:#b91c1c;cursor:pointer;font-weight:600;">🗑 Elimina DDT</button>
          </div>
        </div>
      </td>
    </tr>`;
  });
  h+=`</tbody></table></div></div>`;
  view.innerHTML=h;
}

// ── UPLOAD MODAL ───────────────────────────────────────────────────────────────
function ddtOpenUploadModal(){
  if(_ddtUploadModal)_ddtUploadModal.remove();
  const m=document.createElement('div');
  m.id='ddtModal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;';
  m.onclick=e=>{if(e.target===m)ddtCloseModal();};
  m.innerHTML=`<div onclick="event.stopPropagation()" style="background:var(--surface);border-radius:14px;padding:24px;max-width:500px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);position:relative;margin:auto;">
    <button onclick="ddtCloseModal()" style="position:absolute;top:14px;right:14px;background:var(--surface2);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:14px;">✕</button>
    <div style="font-size:var(--fs-sm);font-weight:700;margin-bottom:16px;">📷 Carica DDT</div>
    <div style="display:flex;gap:10px;margin-bottom:12px;">
      <div style="flex:1;">
        <label style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);display:block;margin-bottom:4px;">FORNITORE</label>
        <select id="ddt-sel-forn" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--fs-xs);background:var(--surface);" onchange="_ddtUploadFornitore=this.value">
          <option value="">Seleziona…</option>
          <option value="DECA">DECA (Housekeeping)</option>
          <option value="Amonn">Amonn (Housekeeping)</option>
          <option value="SDM">SDM (Breakfast)</option>
          <option value="MARR">MARR (Breakfast)</option>
          <option value="SAIMA">SAIMA (Breakfast)</option>
          <option value="Cozzolino">Cozzolino (Breakfast)</option>
          <option value="Valgarda">Valgarda (Breakfast)</option>
        </select>
      </div>
      <div style="flex:1;">
        <label style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);display:block;margin-bottom:4px;">HOTEL</label>
        <select id="ddt-sel-hotel" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--fs-xs);background:var(--surface);" onchange="_ddtUploadHotel=this.value">
          <option value="sa">SoulArt Hotel</option>
          <option value="ar">Art Resort</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);display:block;margin-bottom:4px;">FOTO / PDF DDT</label>
      <input type="file" id="ddt-file-input" accept="image/*,.pdf" capture="environment" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:var(--fs-xs);background:var(--surface);" onchange="ddtHandleFileSelect(this)">
    </div>
    <div id="ddt-parse-status" style="display:none;padding:12px;background:var(--accent-bg);border-radius:8px;font-size:var(--fs-xs);color:var(--accent);margin-bottom:12px;">⏳ Analisi AI in corso…</div>
    <div id="ddt-parsed-result" style="display:none;"></div>
  </div>`;
  document.body.appendChild(m);
  _ddtUploadModal=m;
}
function ddtCloseModal(){if(_ddtUploadModal){_ddtUploadModal.remove();_ddtUploadModal=null;}_ddtParsedData=null;_ddtEditingId=null;}

// Modifica di un DDT già salvato — prima disponibile solo su breakfast.html
// (ddtBkfOpenEditModal). Stessa maschera dell'inserimento (ddtShowParsedResult),
// precompilata con i dati esistenti; ddtConfirmSave aggiorna il record invece di
// crearne uno nuovo quando _ddtEditingId è impostato.
function ddtOpenEditModal(id){
  const item=ddtGet().find(d=>d.id===id);
  if(!item)return;
  if(_ddtUploadModal)_ddtUploadModal.remove();
  const m=document.createElement('div');
  m.id='ddtModal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;';
  m.onclick=e=>{if(e.target===m)ddtCloseModal();};
  m.innerHTML=`<div onclick="event.stopPropagation()" style="background:var(--surface);border-radius:14px;padding:24px;max-width:500px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);position:relative;margin:auto;">
    <button onclick="ddtCloseModal()" style="position:absolute;top:14px;right:14px;background:var(--surface2);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:14px;">✕</button>
    <div style="font-size:var(--fs-sm);font-weight:700;margin-bottom:16px;">✏️ Modifica DDT</div>
    <div id="ddt-parsed-result"></div>
  </div>`;
  document.body.appendChild(m);
  _ddtUploadModal=m;
  _ddtEditingId=id;
  _ddtParsedData={...item,articoli:(item.articoli||[]).map(a=>({...a}))};
  ddtShowParsedResult(_ddtParsedData);
}

async function ddtHandleFileSelect(input){
  const file=input.files[0];if(!file)return;
  const forn=document.getElementById('ddt-sel-forn')?.value||_ddtUploadFornitore;
  const hotel=document.getElementById('ddt-sel-hotel')?.value||_ddtUploadHotel;
  const status=document.getElementById('ddt-parse-status');
  const result=document.getElementById('ddt-parsed-result');
  if(status){status.style.display='';status.textContent='⏳ Analisi AI in corso…';status.style.background='var(--accent-bg)';status.style.color='var(--accent)';}
  if(result)result.style.display='none';
  try{
    const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(file);});
    const isPdf=file.type==='application/pdf';
    const mediaType=isPdf?'application/pdf':(file.type||'image/jpeg');
    const prompt=`Estrai da questo documento di trasporto (DDT) italiano i dati e restituisci SOLO JSON valido, niente altro:\n{"numero_ddt":"stringa","data":"DD/MM/YYYY","fornitore":"ragione sociale","articoli":[{"descrizione":"nome prodotto","qta":numero,"unita":"kg o lt o pz o cf etc","prezzo_unit":numero,"totale":numero}],"totale_ordine":numero}\nSe un valore non è leggibile usa null. Prezzi in EUR senza simbolo.`;
    const body={model:'claude-sonnet-4-6',max_tokens:4096,messages:[{role:'user',content:[
      isPdf?{type:'document',source:{type:'base64',media_type:mediaType,data:base64}}:{type:'image',source:{type:'base64',media_type:mediaType,data:base64}},
      {type:'text',text:prompt}
    ]}]};
    const resp=await fetch(PROXY+'/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!resp.ok)throw new Error('API '+resp.status);
    const data=await resp.json();
    const text=data.content?.[0]?.text||'';
    let parsed={};
    try{const m=text.match(/\{[\s\S]*\}/);if(m)parsed=JSON.parse(m[0]);}catch(e){throw new Error('JSON non valido');}
    if(forn)parsed.fornitore=forn;
    const reparto=DDT_FORNITORI[forn]?.reparto||DDT_FORNITORI[parsed.fornitore]?.reparto||'bkf';
    _ddtParsedData={...parsed,hotel,reparto};
    if(status)status.style.display='none';
    ddtShowParsedResult(_ddtParsedData);
  }catch(e){
    if(status){status.textContent='❌ Errore: '+e.message;status.style.background='#fee2e2';status.style.color='#991b1b';}
  }
}

function ddtShowParsedResult(d){
  const result=document.getElementById('ddt-parsed-result');if(!result)return;
  const inp=(val,cb,w,type,step)=>`<input ${type?'type="'+type+'"':''} ${step?'step="'+step+'"':''} value="${val!=null?val:''}" onchange="${cb}" style="width:${w||'100%'};padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:var(--fs-xs);background:var(--surface);${type==='number'?'text-align:right;':''}">`;
  // Qtà e prezzo unitario ricalcolano da soli il totale della riga (qta*prezzo); il
  // totale riga (anche se digitato a mano) ricalcola sempre il totale del DDT — vedi
  // ddtRecalcRowTotale/ddtRecalcTotaleOrdine in ddt-shared.js, condivise con breakfast.html.
  const artRows=(d.articoli||[]).map((a,i)=>`<tr>
    <td style="padding:3px 4px;">${inp(a.descrizione,'_ddtParsedData.articoli['+i+'].descrizione=this.value','130px','','')}</td>
    <td style="padding:3px 4px;">${inp(a.qta,'_ddtParsedData.articoli['+i+'].qta=parseFloat(this.value)||0;ddtRecalcRowTotale(_ddtParsedData.articoli,'+i+');ddtRecalcTotaleOrdine(_ddtParsedData);ddtShowParsedResult(_ddtParsedData)','55px','number','0.001')}</td>
    <td style="padding:3px 4px;">${inp(a.unita,'_ddtParsedData.articoli['+i+'].unita=this.value','40px','','')}</td>
    <td style="padding:3px 4px;">${inp(a.prezzo_unit,'_ddtParsedData.articoli['+i+'].prezzo_unit=parseFloat(this.value)||0;ddtRecalcRowTotale(_ddtParsedData.articoli,'+i+');ddtRecalcTotaleOrdine(_ddtParsedData);ddtShowParsedResult(_ddtParsedData)','65px','number','0.01')}</td>
    <td style="padding:3px 4px;">${inp(a.totale,'_ddtParsedData.articoli['+i+'].totale=parseFloat(this.value)||0;ddtRecalcTotaleOrdine(_ddtParsedData);ddtShowParsedResult(_ddtParsedData)','65px','number','0.01')}</td>
    <td style="padding:3px 4px;"><button onclick="ddtRemoveArticolo(${i})" style="font-size:11px;padding:2px 6px;border:1px solid var(--border);border-radius:4px;cursor:pointer;background:var(--surface);">✕</button></td>
  </tr>`).join('');
  result.style.display='';
  result.innerHTML=`<div style="border-top:1px solid var(--border-light);padding-top:14px;">
    <div style="font-size:var(--fs-xxs);font-weight:700;color:var(--accent);margin-bottom:10px;">✅ DDT rilevato — verifica e conferma</div>
    <div style="display:flex;gap:10px;margin-bottom:10px;">
      <div style="flex:1;"><label style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);display:block;margin-bottom:3px;">DATA</label>
        <input value="${d.data||''}" onchange="_ddtParsedData.data=this.value" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--fs-xs);background:var(--surface);">
      </div>
      <div style="flex:1;"><label style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);display:block;margin-bottom:3px;">N° DDT</label>
        <input value="${d.numero_ddt||''}" onchange="_ddtParsedData.numero_ddt=this.value" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--fs-xs);background:var(--surface);">
      </div>
      <div style="flex:1;"><label style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);display:block;margin-bottom:3px;">TOTALE €</label>
        <input type="number" step="0.01" value="${d.totale_ordine!=null?d.totale_ordine:''}" onchange="_ddtParsedData.totale_ordine=parseFloat(this.value)||0" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--fs-xs);background:var(--surface);text-align:right;">
      </div>
    </div>
    <div style="overflow-x:auto;margin-bottom:10px;">
      <table style="border-collapse:collapse;font-size:var(--fs-xs);">
        <thead><tr style="background:var(--surface2);">
          <th style="padding:5px 4px;text-align:left;font-size:var(--fs-xxs);color:var(--text-dim);min-width:130px;">Descrizione</th>
          <th style="padding:5px 4px;text-align:right;font-size:var(--fs-xxs);color:var(--text-dim);">Qtà</th>
          <th style="padding:5px 4px;text-align:center;font-size:var(--fs-xxs);color:var(--text-dim);">UM</th>
          <th style="padding:5px 4px;text-align:right;font-size:var(--fs-xxs);color:var(--text-dim);">P.Unit</th>
          <th style="padding:5px 4px;text-align:right;font-size:var(--fs-xxs);color:var(--text-dim);">Totale</th>
          <th></th>
        </tr></thead>
        <tbody>${artRows}</tbody>
      </table>
    </div>
    <button onclick="ddtAddArticolo()" style="font-size:var(--fs-xxs);padding:4px 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);cursor:pointer;margin-bottom:12px;">+ Aggiungi riga</button>
    <button onclick="ddtConfirmSave()" style="width:100%;padding:10px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:var(--fs-xs);font-weight:700;cursor:pointer;">💾 Salva DDT</button>
  </div>`;
}
function ddtRemoveArticolo(i){if(!_ddtParsedData)return;_ddtParsedData.articoli.splice(i,1);ddtRecalcTotaleOrdine(_ddtParsedData);ddtShowParsedResult(_ddtParsedData);}
function ddtAddArticolo(){if(!_ddtParsedData)return;(_ddtParsedData.articoli=_ddtParsedData.articoli||[]).push({descrizione:'',qta:null,unita:'',prezzo_unit:null,totale:null});ddtShowParsedResult(_ddtParsedData);}

function ddtConfirmSave(){
  if(!_ddtParsedData)return;
  const arr=ddtGet();
  if(_ddtEditingId){
    const idx=arr.findIndex(d=>d.id===_ddtEditingId);
    if(idx>=0){
      arr[idx]={...arr[idx],
        data:_ddtParsedData.data||'',fornitore:_ddtParsedData.fornitore||'',
        reparto:_ddtParsedData.reparto||arr[idx].reparto||'bkf',hotel:_ddtParsedData.hotel||arr[idx].hotel||'sa',
        numero_ddt:_ddtParsedData.numero_ddt||'',
        articoli:_ddtParsedData.articoli||[],
        totale_ordine:_ddtParsedData.totale_ordine||0};
    }
  }else{
    arr.push({id:Date.now()+'_'+Math.random().toString(36).slice(2,6),ts:Date.now(),
      data:_ddtParsedData.data||'',fornitore:_ddtParsedData.fornitore||'',
      reparto:_ddtParsedData.reparto||'bkf',hotel:_ddtParsedData.hotel||'sa',
      numero_ddt:_ddtParsedData.numero_ddt||'',
      articoli:_ddtParsedData.articoli||[],
      totale_ordine:_ddtParsedData.totale_ordine||0});
  }
  ddtSave(arr);
  ddtCloseModal();
  ddtRenderList();ddtRenderSpese();
}
async function ddtDelete(id){
  if(!await cqConferma('Eliminare questo DDT?','Le righe di spesa collegate spariranno dalle analisi.',{ok:'Elimina'}))return;
  ddtSave(ddtGet().filter(d=>d.id!==id));
  ddtRenderList();ddtRenderSpese();
}

// ── REPORT MENSILE STAMPABILE ───────────────────────────────────────────────
// Modal per scegliere il mese: solo i mesi che hanno almeno un DDT caricato,
// più recenti in cima. Il mese corrente è preselezionato quando presente.
function ddtOpenPrintModal(){
  const all=ddtGet();
  const mesi=[...new Set(all.map(d=>ddtYM(d.data)).filter(Boolean))].sort().reverse();
  if(!mesi.length){cqAvviso('Nessun DDT caricato: non c\'è ancora nulla da riportare.');return;}
  const curMon=ddtCurMonth();
  const opts=mesi.map(ym=>`<option value="${ym}" ${ym===curMon?'selected':''}>${ddtMonLabel(ym)}</option>`).join('');
  const m=document.createElement('div');
  m.id='ddtPrintModal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div onclick="event.stopPropagation()" style="background:var(--surface);border-radius:14px;padding:24px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);">
    <div style="font-size:var(--fs-sm);font-weight:700;margin-bottom:14px;">🖨️ Report Breakfast</div>
    <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:14px;margin-top:-8px;">Stesso contenuto della tab "Insights Breakfast", per il mese scelto</div>
    <label style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);display:block;margin-bottom:4px;">MESE</label>
    <select id="ddt-print-mese" style="width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--fs-xs);background:var(--surface);margin-bottom:16px;">${opts}</select>
    <div style="display:flex;gap:8px;">
      <button onclick="document.getElementById('ddtPrintModal').remove()" style="flex:1;padding:9px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text-dim);font-weight:600;font-size:var(--fs-xs);cursor:pointer;">Annulla</button>
      <button onclick="ddtPrintMonthReport(document.getElementById('ddt-print-mese').value)" style="flex:1;padding:9px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:var(--fs-xs);cursor:pointer;">Genera report</button>
    </div>
  </div>`;
  document.body.appendChild(m);
}

// Report A4 stampabile del mese scelto: **stessi contenuti di "Insights Breakfast"**
// (proiezione, spesa/coperti/€ per coperto, trend prezzi, top prodotti, prodotti più
// frequenti, confronto tra fornitori, spesa per categoria), tutti ricalcolati SOLO sui
// DDT breakfast (bkf, come fa ddtBuildAnalisi) e filtrati al mese scelto — non un elenco
// DDT (quello resta nella vista a schermo, qui non serve: il report è per la responsabile
// del breakfast, che deve leggere l'andamento, non i singoli documenti).
function ddtPrintMonthReport(ym){
  if(!ym)return;
  document.getElementById('ddtPrintModal')?.remove();
  const all=ddtGet();
  const _nf=d=>ddtNormForn(d.fornitore)||d.fornitore||'—';
  const bkfAll=all.filter(d=>(DDT_FORNITORI[_nf(d)]?.reparto||d.reparto||'bkf')==='bkf');
  const monDdt=bkfAll.filter(d=>ddtYM(d.data)===ym);
  const [pY,pM]=ym.split('-').map(Number);
  const prevYm=pM===1?`${pY-1}-12`:`${pY}-${String(pM-1).padStart(2,'0')}`;
  const prevMonDdt=bkfAll.filter(d=>ddtYM(d.data)===prevYm);
  const totale=monDdt.reduce((s,d)=>s+(d.totale_ordine||0),0);
  const totalePrev=prevMonDdt.reduce((s,d)=>s+(d.totale_ordine||0),0);
  const monLabel=ddtMonLabel(ym);
  const varSpesa=totalePrev?((totale-totalePrev)/totalePrev*100):null;

  // Coperti BB del mese e del precedente — stessa fonte/granularità della card "Spesa e
  // coperti mensili" (qm_bkf_monthly_history, chiave YYYY-MM-DD).
  let bkfHistPrint={};
  try{bkfHistPrint=JSON.parse(localStorage.getItem('qm_bkf_monthly_history')||'{}');}catch(e){}
  const _copertiMese=y=>Object.entries(bkfHistPrint).filter(([k])=>k.length===10&&k.startsWith(y)).reduce((s,[,v])=>s+(v.bb||0),0);
  const coperti=_copertiMese(ym),copertiPrev=_copertiMese(prevYm);
  const perCoperto=coperti?totale/coperti:null;
  const perCopertoPrev=copertiPrev?totalePrev/copertiPrev:null;
  const varCoperti=copertiPrev?((coperti-copertiPrev)/copertiPrev*100):null;
  const varPerCop=perCopertoPrev?((perCoperto-perCopertoPrev)/perCopertoPrev*100):null;

  // Il mese scelto è ancora in corso (spesa parziale) → avviso, niente proiezione fine
  // mese sul cartaceo: la proiezione ha senso solo guardando la dashboard in tempo reale,
  // su un report stampato diventerebbe subito un dato vecchio e fuorviante.
  const todayYm=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
  const inCorso=ym===todayYm;

  const fmtVar=(pct,invertGood)=>{
    if(pct===null)return'<span style="color:#999;">mese prec. n/d</span>';
    const good=invertGood?pct<=0:pct>=0;
    const col=Math.abs(pct)<1?'#999':(good?'#1E7A48':'#C0352A');
    const arr=pct>0.5?'↑':pct<-0.5?'↓':'→';
    return`<span style="color:${col};font-weight:700;">${arr} ${Math.abs(pct).toFixed(1)}%</span> <span style="color:#999;">vs ${ddtMonLabel(prevYm)}</span>`;
  };

  // ── Trend prezzi: cosa è cambiato IN QUESTO MESE (non tutta la storia) ──
  // Serve lo storico completo (non solo monDdt) per trovare l'ultimo prezzo registrato
  // PRIMA del mese scelto, da usare come base del confronto.
  const _parseD=s=>{if(!s)return 0;const p=s.split('/');return p.length===3?new Date(p[2],p[1]-1,p[0]).getTime():0;};
  const monStart=new Date(pY,pM-1,1).getTime(),monEnd=new Date(pY,pM,0,23,59,59,999).getTime();
  const priceMap={};
  bkfAll.forEach(d=>{
    const forn=_nf(d);
    (d.articoli||[]).forEach(a=>{
      if(!a.descrizione||a.prezzo_unit==null)return;
      const k=forn+'||'+a.descrizione.toLowerCase().trim().replace(/\s+/g,' ');
      if(!priceMap[k])priceMap[k]={desc:a.descrizione,forn,entries:[]};
      priceMap[k].entries.push({ts:_parseD(d.data),prezzo:Number(a.prezzo_unit),data:d.data});
    });
  });
  const trendMese=Object.values(priceMap).map(p=>{
    const sorted=[...p.entries].sort((a,b)=>a.ts-b.ts);
    const before=[...sorted].reverse().find(e=>e.ts<monStart);
    const inMonth=sorted.filter(e=>e.ts>=monStart&&e.ts<=monEnd);
    if(!before||!inMonth.length)return null;
    const cur=inMonth[inMonth.length-1];
    const varPct=before.prezzo?((cur.prezzo-before.prezzo)/before.prezzo*100):0;
    return{desc:p.desc,forn:p.forn,before,cur,varPct};
  }).filter(x=>x&&Math.abs(x.varPct)>5).sort((a,b)=>b.varPct-a.varPct);

  // ── Top prodotti per spesa e per frequenza — solo su questo mese ──
  const prodAgg={};
  monDdt.forEach(d=>{
    const forn=_nf(d);
    (d.articoli||[]).forEach(a=>{
      if(!a.descrizione)return;
      const k=a.descrizione.toLowerCase().trim().replace(/\s+/g,' ');
      if(!prodAgg[k])prodAgg[k]={desc:a.descrizione,total:0,count:0,forn:new Set()};
      prodAgg[k].total+=(a.totale||(a.qta&&a.prezzo_unit?a.qta*a.prezzo_unit:0));
      prodAgg[k].count++;prodAgg[k].forn.add(forn);
    });
  });
  const topSpendMese=Object.values(prodAgg).filter(p=>p.total>0).sort((a,b)=>b.total-a.total).slice(0,10);

  // ── Confronto tra fornitori sullo stesso prodotto — solo su questo mese ──
  const multiMap={};
  monDdt.forEach(d=>{
    const forn=_nf(d);
    (d.articoli||[]).forEach(a=>{
      if(!a.descrizione||a.prezzo_unit==null)return;
      const k=a.descrizione.toLowerCase().trim().replace(/\s+/g,' ');
      if(!multiMap[k])multiMap[k]={desc:a.descrizione,forn:{}};
      if(!multiMap[k].forn[forn])multiMap[k].forn[forn]=[];
      multiMap[k].forn[forn].push(Number(a.prezzo_unit));
    });
  });
  const multiMese=Object.values(multiMap).filter(p=>Object.keys(p.forn).length>=2).map(p=>{
    const list=Object.entries(p.forn).map(([f,pp])=>({f,avg:pp.reduce((s,v)=>s+v,0)/pp.length})).sort((a,b)=>a.avg-b.avg);
    const diff=((list[list.length-1].avg-list[0].avg)/list[0].avg*100);
    return{desc:p.desc,list,diff};
  }).sort((a,b)=>b.diff-a.diff).slice(0,10);

  // ── Spesa per categoria — stessa classificazione della dashboard (CAT_RULES globali +
  // riassegnazioni manuali _speseCatOverride), solo su questo mese ──
  const catTotals={};CAT_RULES.forEach(c=>{catTotals[c.id]=0;});
  let catAltro=0;
  monDdt.forEach(d=>{
    (d.articoli||[]).forEach(a=>{
      if(!a.descrizione)return;
      const desc=a.descrizione.toLowerCase();
      const val=a.totale||(a.qta&&a.prezzo_unit?a.qta*a.prezzo_unit:0);
      if(!val)return;
      const override=_speseCatOverride[speseCatNormDesc(a.descrizione)];
      const cat=override?{id:override}:CAT_RULES.find(c=>c.kw.some(kw=>desc.includes(kw)));
      if(cat&&catTotals[cat.id]!==undefined)catTotals[cat.id]+=val;
      else if(override)catTotals[override]=(catTotals[override]||0)+val;
      else catAltro+=val;
    });
  });
  const catList=[...CAT_RULES.map(c=>({label:c.label,total:catTotals[c.id]||0})),{label:'Altro',total:catAltro}].filter(c=>c.total>0).sort((a,b)=>b.total-a.total);

  // ── HTML ──
  const kpiBox=(lbl,val)=>`<div class="kpi-box"><div class="kpi-lbl">${lbl}</div><div class="kpi-val">${val}</div></div>`;
  const trendRows=trendMese.map(p=>`
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;font-weight:600;">${p.desc}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;color:#888;">${p.forn}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;text-align:right;color:#888;">${ddtFmt(p.before.prezzo)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;text-align:right;font-weight:700;">${ddtFmt(p.cur.prezzo)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;text-align:right;font-weight:700;color:#C0352A;">↑ ${p.varPct.toFixed(1)}%</td>
    </tr>`).join('');
  const topSpendRows=topSpendMese.map((p,i)=>`
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;color:#888;">${i+1}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;font-weight:600;">${p.desc}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;color:#888;">${[...p.forn].join(', ')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;text-align:center;color:#888;">${p.count}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;text-align:right;font-weight:700;">${ddtFmt(p.total)}</td>
    </tr>`).join('');
  const multiRows=multiMese.map(p=>`
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;font-weight:600;">${p.desc}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;color:#888;">${p.list.map(l=>l.f+' '+ddtFmt(l.avg)).join(' · ')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;text-align:right;font-weight:700;color:${p.diff>20?'#C0352A':'#888'};">+${p.diff.toFixed(0)}%</td>
    </tr>`).join('');
  const catMax=catList[0]?.total||1;
  const catRows=catList.map(c=>`
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;font-weight:600;">${c.label}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;">
        <div style="background:#e5e5e7;border-radius:3px;height:6px;width:100%;overflow:hidden;"><div style="background:#1E4080;height:6px;width:${(c.total/catMax*100).toFixed(0)}%;"></div></div>
      </td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;text-align:right;font-weight:700;">${ddtFmt(c.total)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e5e7;font-size:11px;text-align:right;color:#888;">${totale?(c.total/totale*100).toFixed(0)+'%':'—'}</td>
    </tr>`).join('');

  const html=`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
  <title>Report Breakfast — ${monLabel}</title>
  <style>
    @page{size:A4;margin:16mm 14mm;}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1c1c1e;margin:0;}
    .header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;gap:16px;}
    h1{font-size:18px;font-weight:700;margin:0 0 3px;}
    h2{font-size:13px;font-weight:700;margin:22px 0 8px;color:#1E4080;text-transform:uppercase;letter-spacing:.04em;}
    .sub{font-size:11px;color:#888;}
    .badge-corso{display:inline-block;background:#fffbeb;color:#92400e;border:1px solid #fde68a;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;margin-left:8px;}
    .date-badge{background:#1E4080;color:#fff;padding:10px 18px;border-radius:8px;text-align:center;flex-shrink:0;}
    .date-badge-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;opacity:.75;margin-bottom:4px;}
    .date-badge-value{font-size:15px;font-weight:700;line-height:1.2;}
    .kpi-row{display:flex;gap:10px;flex-wrap:wrap;}
    .kpi-box{background:#f8f8f9;border-radius:8px;padding:10px 16px;flex:1;min-width:130px;}
    .kpi-lbl{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;}
    .kpi-val{font-size:17px;font-weight:800;color:#1E4080;}
    .kpi-var{font-size:11px;margin-top:3px;}
    table{width:100%;border-collapse:collapse;}
    thead th{background:#f0f0f2;color:#555;padding:7px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;text-align:left;}
    .empty{font-size:11px;color:#999;padding:8px 0;}
    .avviso{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:10px 14px;font-size:11px;margin-top:6px;}
  </style>
  </head><body>
  <div class="header">
    <div>
      <h1>☕ Report Breakfast — Spese Fornitori${inCorso?'<span class="badge-corso">mese in corso</span>':''}</h1>
      <div class="sub">${monLabel} · stampato il ${new Date().toLocaleString('it-IT')}</div>
    </div>
    <div class="date-badge">
      <div class="date-badge-label">Totale mese</div>
      <div class="date-badge-value">${ddtFmt(totale)}</div>
    </div>
  </div>
  ${inCorso?`<div class="avviso">Il mese è ancora in corso: il totale e i confronti sotto sono parziali, calcolati sui giorni già trascorsi.</div>`:''}
  <div class="kpi-row" style="margin-top:14px;">
    <div class="kpi-box"><div class="kpi-lbl">Spesa</div><div class="kpi-val">${ddtFmt(totale)}</div><div class="kpi-var">${fmtVar(varSpesa,true)}</div></div>
    <div class="kpi-box"><div class="kpi-lbl">Coperti BB</div><div class="kpi-val">${coperti||'—'}</div><div class="kpi-var">${fmtVar(varCoperti,false)}</div></div>
    <div class="kpi-box"><div class="kpi-lbl">€ / coperto</div><div class="kpi-val">${perCoperto!=null?ddtFmt(perCoperto):'—'}</div><div class="kpi-var">${fmtVar(varPerCop,true)}</div></div>
    ${kpiBox('DDT ricevuti',monDdt.length)}
  </div>

  <h2>📈 Trend prezzi — variazioni di questo mese</h2>
  ${trendRows?`<table>
    <thead><tr><th>Prodotto</th><th>Fornitore</th><th style="text-align:right;">Prima</th><th style="text-align:right;">${monLabel.split(' ')[0]}</th><th style="text-align:right;">Var.</th></tr></thead>
    <tbody>${trendRows}</tbody>
  </table>`:`<div class="empty">Nessun rialzo &gt;5% registrato questo mese.</div>`}

  <h2>🏆 Top 10 prodotti per spesa</h2>
  ${topSpendRows?`<table>
    <thead><tr><th>#</th><th>Prodotto</th><th>Fornitore</th><th style="text-align:center;">Volte</th><th style="text-align:right;">Totale</th></tr></thead>
    <tbody>${topSpendRows}</tbody>
  </table>`:`<div class="empty">Nessun dato per questo mese.</div>`}

  <h2>⚖️ Stesso prodotto, fornitori diversi</h2>
  ${multiRows?`<table>
    <thead><tr><th>Prodotto</th><th>Prezzo medio per fornitore</th><th style="text-align:right;">Differenza</th></tr></thead>
    <tbody>${multiRows}</tbody>
  </table>`:`<div class="empty">Nessun prodotto acquistato da più fornitori questo mese.</div>`}

  <h2>🏷️ Spesa per categoria</h2>
  ${catRows?`<table>
    <thead><tr><th>Categoria</th><th></th><th style="text-align:right;">Totale</th><th style="text-align:right;">%</th></tr></thead>
    <tbody>${catRows}</tbody>
  </table>`:`<div class="empty">Nessuna spesa classificata per questo mese.</div>`}
  </body></html>`;

  const w=window.open('','_blank');
  if(!w)return;
  w.document.write(html);
  w.document.close();
  w.onload=()=>w.print();
}
// §§ PRE-STAY — MESSAGGI AGLI OSPITI IN ARRIVO FRA 2 GIORNI
// Ogni giorno si scrive agli ospiti che arrivano fra due giorni. I contatti (mail,
// telefono) stanno sul PMS e NON sono esportabili: si inseriscono a mano.
//
// GLI OSPITI NON SONO LEGATI AL NUMERO DI CAMERA. Il Piano Settimanale viene usato solo
// per sapere QUANTI arrivi ci sono per struttura in quel giorno — il conteggio è la rete
// di sicurezza contro il dimenticarne uno. Le schede sono "Arrivo 1, 2, 3…" dentro il
// gruppo della struttura.
//
// Perché non si indicizza per camera (lo si è fatto e si è dovuto disfare): la reception
// sposta gli ospiti di stanza di continuo. Con i dati agganciati alla camera, a ogni
// spostamento i contatti restavano orfani sulla vecchia riga e la nuova andava
// ricompilata. Nessun automatismo può rimediare in modo affidabile, perché il Piano
// contiene solo data/struttura/camera: "203 sparita, 204 comparsa" è indistinguibile da
// "una prenotazione cancellata più una nuova", e indovinare vorrebbe dire prima o poi
// attribuire i contatti di un ospite a un altro. Slegando l'ospite dalla camera il
// problema non esiste più: non c'è nessun aggancio da mantenere. Il numero di camera non
// serve a nulla qui — non compare nel messaggio e non determina il testo, che dipende
// dalla struttura. NON reintrodurlo come chiave.
//
// Compass è un sito statico e non può spedire da sé: la mail parte dal Worker (invio
// diretto, vedi worker-prestay-mail.md) oppure apre il client di posta; WhatsApp usa wa.me.
const PRESTAY_KEY='qm_prestay';
const PRESTAY_TPL_KEY='qm_prestay_tpl';
const PRESTAY_GG=2;                 // quanti giorni prima dell'arrivo si scrive
let _prestay={};                    // { 'YYYY-MM-DD': { arrivi:[{id,hotel,nome,email,tel,lang,mailTs,waTs}] } }
let _prestayTpl={};                 // { sa:{it:{ogg,corpo}, en:{...}}, ... }
let _prestayData=null;              // data selezionata 'YYYY-MM-DD' (null = oggi+2)
let _prestayTplOpen=false;
let _psAvviso=null;                 // messaggio informativo mostrato una volta sola

// Icone busta/nuvoletta/occhio — stesso stile outline (stroke, non emoji) dell'icona
// "Messaggi Pre-stay" nella sidebar, per coerenza visiva nei pulsanti della riga.
const PS_ICON_EYE='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>';
const PS_ICON_MAIL='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
const PS_ICON_WA='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
const PS_ICON_LOAD='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9"/></svg>';

// Strutture. `piano` è la chiave usata dal Piano Settimanale: null = struttura non coperta
// dal Piano, i cui arrivi vanno aggiunti a mano.
// L'ORDINE DELLE CHIAVI È L'ORDINE DEI GRUPPI nella pagina: Boutique per prima, poi
// SoulArt, San Liborio, Principe, Mastrangelo. Art Resort è escluso di proposito dal
// pre-stay (non lo si contatta da qui). Cambiando l'ordine qui cambia la pagina.
const PRESTAY_HOTELS={
  bh:{name:'Boutique Hotel',piano:'boutique'},
  sa:{name:'SoulArt Hotel',piano:'soulart'},
  sl:{name:'San Liborio',piano:'liborio'},
  pr:{name:'Principe',piano:null},
  ms:{name:'Mastrangelo',piano:null}
};
// Nome mostrato come MITTENTE della mail (invio diretto via Worker) — separato da
// PRESTAY_HOTELS[].name perché quello alimenta anche {struttura} nel corpo del messaggio.
// Qui serve il nome completo che l'ospite deve riconoscere nella casella di posta.
// ── Vincolo Booking.com ─────────────────────────────────────────────────────
// Gli ospiti che prenotano su Booking hanno un indirizzo mascherato @guest.booking.com,
// che è un relay: Booking inoltra alla casella vera dell'ospite SOLO le mail spedite
// dall'indirizzo registrato sull'Extranet della struttura (booking@soularthotel.com).
// Da qualunque altro mittente le rifiuta: a volte le SCARTA IN SILENZIO — nessun rimbalzo,
// nessun errore, per noi l'invio risulta riuscito e la spunta verde direbbe una cosa falsa
// — a volte le RIMANDA INDIETRO, con un rimbalzo che arriva nella casella del mittente
// (agosto 2026, dopo che il blocco era stato tolto senza cambiare mittente sul Worker).
// In entrambi i casi l'ospite non riceve niente: è il motivo per cui queste righe vanno
// riconosciute e trattate a parte.
//
// COME SI TOGLIE QUESTO BLOCCO: si mettono `SMTP_USER` e `SMTP_PASS` della casella
// booking@soularthotel.com sul Worker, si ripubblica, poi si preme "Verifica mittente" in
// Impostazioni. Non c'è più una costante da cambiare a mano: il blocco cade da solo
// quando il Worker dichiara di spedire da quell'indirizzo (vedi worker-prestay-mail.md).
// ATTENZIONE alla svista che ha fatto ripartire i rimbalzi: se sul Worker è rimasta
// impostata `SMTP_FROM`, quella vince su `SMTP_USER` e il mittente non cambia.
// L'indirizzo registrato sull'Extranet Booking della struttura: è l'UNICO da cui il relay
// @guest.booking.com accetta posta. Averlo "ok su Extranet" non basta — deve essere anche
// quello da cui Compass spedisce davvero, cioè SMTP_USER sul Worker.
const PRESTAY_BOOKING_MITTENTE='booking@soularthotel.com';
// Assunzione usata SOLO finché il mittente reale non è stato verificato (vedi
// prestayVerificaMittente): fino ad allora si dà per scontato che non sia quello giusto,
// perché è lo stato in cui il sistema è nato e perché una spunta verde sbagliata è peggio
// di un invio in meno. Una costante scritta a mano qui non può sapere cosa c'è su
// Cloudflare: è esattamente così che le mail hanno ripreso a rimbalzare senza avvisi.
const PRESTAY_MITTENTE_BOOKING_OK=false;
const PS_MITT_KEY='qm_prestay_mittente';
// Ultima verifica del mittente reale, chiesta al Worker: {mittente,mittenteDa,via,smtpHost,
// replyTo,imap,versione,ts}. Sta in localStorage come la configurazione di invio — è una
// diagnosi di questa postazione, si rifà con un clic.
let _psMitt=null;
try{const s=localStorage.getItem(PS_MITT_KEY);if(s)_psMitt=JSON.parse(s)||null;}catch(e){}
function _psMittenteAttuale(){return _psMitt&&_psMitt.mittente?String(_psMitt.mittente).trim():'';}
// Il mittente reale coincide con quello registrato su Booking? Se non è mai stato
// verificato si ricade sull'assunzione qui sopra.
function _psMittenteOkBooking(){
  const m=_psMittenteAttuale();
  return m?m.toLowerCase()===PRESTAY_BOOKING_MITTENTE:PRESTAY_MITTENTE_BOOKING_OK;
}
const _psAliasBooking=e=>/@(guest\.)?booking\.com$/i.test(String(e||'').trim());
// true quando la mail a quell'indirizzo NON verrebbe recapitata con il mittente attuale
const _psBookingBloccato=e=>!_psMittenteOkBooking()&&_psAliasBooking(e);

const PRESTAY_FROM_NAME={
  bh:'Boutique Hotel Piazza Carità',
  sa:'SoulArt Hotel | Design Experience',
  sl:'Art Suite San Liborio',
  pr:'Art Suite Principe Umberto',
  ms:'Rooms Mastrangelo'
};
// I nomi dal PMS arrivano spesso tutti in maiuscolo ("SALADINI LAURA"): in un messaggio a
// un ospite si leggono come se gli si stesse gridando addosso. Si normalizzano SOLO se non
// contengono già minuscole — così un nome scritto a mano correttamente ("Chacon Oviedo
// Karina") o con maiuscole interne volute ("McDonald", "D'Angelo") non viene toccato.
// Le particelle nobiliari e i prefissi restano minuscoli, come si scrivono in italiano.
const PS_PARTICELLE=new Set(['de','di','da','del','della','dei','degli','dal','dalla','van','von','der','den','la','le','lo','di\'','y','e']);
function _psNomeUmano(s){
  const t=String(s||'').trim();
  if(!t)return'';
  // Parola per parola, non sull'intera stringa: negli export capita il solo cognome in
  // maiuscolo ("DABBARHI Ayoub"), che va ammorbidito lo stesso. Una parola con maiuscole
  // e minuscole insieme è voluta ("McDonald", "O'Brien") e non si tocca.
  return t.split(/\s+/).map((p,i)=>{
    if(!/^[A-ZÀ-Ý][A-ZÀ-Ý'’\-]*$/.test(p)||p.length<2)return p;   // non tutta maiuscola
    const b=p.toLowerCase();
    if(i>0&&PS_PARTICELLE.has(b))return b;
    // Tratta anche i composti con apostrofo o trattino: d'angelo -> D'Angelo
    return b.replace(/(^|['’-])([a-zà-ÿ])/g,(m,sep,c)=>sep+c.toUpperCase());
  }).join(' ');
}
// Testi di partenza: sono segnaposto da riscrivere dalla schermata (Modifica testi).
// I placeholder {nome} {struttura} {data} vengono sostituiti all'invio.
const PRESTAY_TPL_DEFAULT={
  it:{ogg:'Il suo arrivo al {struttura}',corpo:'Gentile {nome},\n\nmanca poco al suo arrivo previsto per il {data} presso {struttura}.\n\n[SCRIVI QUI IL TESTO DEL PRE-STAY]\n\nRestiamo a disposizione per qualsiasi necessità.\n\nCordiali saluti,\n{struttura}'},
  en:{ogg:'Your upcoming stay at {struttura}',corpo:'Dear {nome},\n\nyour arrival at {struttura} on {data} is approaching.\n\n[WRITE THE PRE-STAY TEXT HERE]\n\nWe remain at your disposal for anything you may need.\n\nBest regards,\n{struttura}'}
};

function _psFmtISO(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _psFmtIT(iso){const[y,m,d]=iso.split('-');return d+'/'+m+'/'+y;}
function _psTargetISO(){
  if(_prestayData)return _prestayData;
  const d=new Date();d.setDate(d.getDate()+PRESTAY_GG);return _psFmtISO(d);
}
function _psLoad(){
  try{const s=localStorage.getItem(PRESTAY_KEY);_prestay=s?JSON.parse(s):{};}catch(e){_prestay={};}
  try{const s=localStorage.getItem(PRESTAY_TPL_KEY);_prestayTpl=s?JSON.parse(s):{};}catch(e){_prestayTpl={};}
}
function _psSave(){
  try{localStorage.setItem(PRESTAY_KEY,JSON.stringify(_prestay));}catch(e){}
  try{kvSet(PRESTAY_KEY,JSON.stringify(_prestay));}catch(e){}
}
function _psSaveTpl(){
  try{localStorage.setItem(PRESTAY_TPL_KEY,JSON.stringify(_prestayTpl));}catch(e){}
  try{kvSet(PRESTAY_TPL_KEY,JSON.stringify(_prestayTpl));}catch(e){}
}
_psLoad();
// Dopo un refresh lo slot dell'Upload Center ripartiva da "Non caricato" anche con gli
// arrivi già importati: lo stato del riquadro vive nel DOM, i dati invece in localStorage/KV.
// Va quindi ricostruito al caricamento, come fanno gli altri slot (vedi pianoSetLoaded).
function prestaySetLoaded(silent){
  const iso=_psTargetISO();
  const g=_prestay[iso];
  const n=(g&&Array.isArray(g.arrivi))?g.arrivi.length:0;
  if(!n)return;
  try{ucSetState('prestay','loaded',n+' arriv'+(n===1?'o':'i')+' · '+_psFmtIT(iso).slice(0,5),silent!==false);}catch(e){}
  try{loadStoredTs('prestayTs');}catch(e){}
}
setTimeout(()=>{try{prestaySetLoaded(true);}catch(e){}},250);
function _psTpl(hotel,lang){
  const h=_prestayTpl[hotel]||{};
  const t=h[lang];
  if(t&&(t.ogg||t.corpo))return t;
  return PRESTAY_TPL_DEFAULT[lang]||PRESTAY_TPL_DEFAULT.it;
}

// ── Lettura del PDF "Arrivi" del PMS ────────────────────────────────────────
// Il pre-stay NON dipende più dal Piano Settimanale: la fonte è il PDF Arrivi del PMS, che
// elenca le prenotazioni reali del giorno con il nome dell'ospite. Il Piano dava solo un
// conteggio di camere; questo dà i nomi, quindi è insieme più completo e più attendibile.
//
// Il PDF NON contiene email né telefono (verificato sull'export reale): quelli restano da
// inserire a mano dal PMS. L'importazione serve a fissare QUANTI arrivi ci sono, CHI sono
// e a quale struttura appartengono — cioè la parte che non si può controllare a memoria.
//
// La camera viene usata SOLO qui, per dedurre la struttura (204 → Boutique, Art 5 →
// SoulArt), e poi buttata via: le schede restano "Arrivo 1, 2, 3…" senza camera, così uno
// spostamento di stanza continua a non avere alcun effetto. Non salvarla nelle schede.
//
// Parsing deterministico sulle COLONNE (coordinate x), non sul testo concatenato: nomi e
// tipi camera vanno a capo ("Chacon Oviedo / Karina", "AS / SUP") e un parser a stringa li
// spezzerebbe o li mescolerebbe. Verificato sull'export reale del 17/08/2026.
const PS_COL_OSPITE_DA=90;    // x minima della colonna "Ospite (Prenotante)"
const PS_COL_OSPITE_A=177;    // x della colonna "Pax": fine della colonna ospite
// ── Colore del bordo della scheda in base al canale di provenienza ──────────
// L'indirizzo email dice da dove arriva la prenotazione, e riconoscerlo a colpo d'occhio
// conta: il tono del messaggio e i vincoli di recapito cambiano per canale.
// I colori sono scelti per DISTINGUERSI FRA LORO, non per fedelta al marchio: il blu
// istituzionale di Booking (#003580) e talmente scuro da confondersi col nero delle dirette
// e col marrone di G2, quindi si usa il loro blu chiaro.
const PS_BORDI=[
  {re:/@guest\.booking\.com$/i,        col:'#0071C2'},   // blu Booking, tono chiaro
  {re:/expediapartnercentral\.com/i,    col:'#FFB300'},   // giallo Expedia piu carico
  {re:/g2-travel\.com/i,                col:'#76573A'}    // marrone G2 Travel
];
const PS_BORDO_ALTRI='#111111';        // qualunque altro indirizzo
function _psBordoPerEmail(email){
  const e=String(email||'').trim();
  for(const b of PS_BORDI)if(b.re.test(e))return b.col;
  return PS_BORDO_ALTRI;
}
// Canale di provenienza dichiarato dal PMS (colonna Origine dell'export Prenotazioni).
// Ha la precedenza sull'email: l'email la digiti tu dopo, quindi all'import la scheda
// sarebbe grigia e prenderebbe colore solo a compilazione avvenuta — invece il canale si
// sa gia' dal file. Restano le regole sull'email come ripiego per le schede vecchie o
// aggiunte a mano.
const PS_CANALI=[
  {re:/booking/i,        col:'#0071C2'},
  {re:/expedia/i,        col:'#FFB300'},
  {re:/g2[\s-]*travel/i, col:'#76573A'},
  {re:/italcamel/i,      col:'#7B5EA7'}
];
// Colore dovuto al canale dichiarato dal PMS, o stringa vuota se il file non lo portava.
// Serve al render per marcare la scheda (data-canale) e a _psAggiornaBordo per non
// sovrascriverlo mentre si digita l'email.
// Etichetta leggibile del canale, per mostrarlo sulla scheda. "CRSVertical" e' il motore
// di prenotazione del sito: quelle sono prenotazioni dirette, e chiamarle col nome del
// fornitore non direbbe niente a chi legge.
const PS_CANALI_NOME=[
  {re:/booking/i,        txt:'Booking'},
  {re:/expedia/i,        txt:'Expedia'},
  {re:/italcamel/i,      txt:'Italcamel'},
  {re:/g2[\s-]*travel/i, txt:'G2 Travel'},
  {re:/crs|vertical/i,   txt:'Diretta'}
];
function _psCanaleNome(a){
  const o=String(a&&a.origine||'').trim();
  if(!o)return'';
  for(const c of PS_CANALI_NOME)if(c.re.test(o))return c.txt;
  return o.length>14?o.slice(0,14):o;      // origine sconosciuta: si mostra com'e'
}
function _psCanaleCol(a){
  const o=String(a&&a.origine||'').trim();
  if(o)for(const c of PS_CANALI)if(c.re.test(o))return c.col;
  return '';
}
function _psBordo(a){
  return _psCanaleCol(a)||_psBordoPerEmail(a&&a.email);
}
// Il bordo deve cambiare mentre si digita, non al termine: un re-render a ogni tasto
// farebbe perdere il fuoco al campo, quindi si tocca solo lo stile della scheda.
// Le schede già inviate restano verdi: `data-fatto` le esclude.
function _psAggiornaBordo(id,email){
  const c=document.getElementById('psCard-'+id);
  if(!c||c.dataset.fatto==='1')return;
  // Se il canale arriva dal PMS resta quello: digitare un indirizzo privato non deve
  // cambiare il colore di una prenotazione che sappiamo essere Booking o Expedia.
  if(c.dataset.canale){c.style.borderColor=c.dataset.canale;return;}
  c.style.borderColor=_psBordoPerEmail(email);
}
// Italcamel si segna A MANO: il PMS non popola la colonna Azienda del PDF, quindi non c'e
// modo di dedurlo dal documento. Spuntandolo la scheda si spegne — quegli arrivi non hanno
// contatti dell'ospite e non devono sembrare "da compilare".
const _psItalcamel=a=>!!(a&&a.italcamel);
function prestayToggleItalcamel(id){
  const iso=_psTargetISO(),a=_psScheda(iso,id);
  if(!a)return;
  a.italcamel=!a.italcamel;
  _psSave();prestayRender();
}
// Riconosce l'inizio di una prenotazione nella colonna "Numero/Tipo" (es. "204 / PC STD",
// "Art 10 / AS"). Esclude l'intestazione "Numero/", che pure contiene una barra.
const PS_RE_CAMERA=/^(\d{1,4}|Art\s*\d+|LIB\s*\w*|R\s*\d|CAPRI|NAPOLI|PROCIDA|ISCHIA|POSITANO)\b/i;
// Struttura dalla camera: stesse regole di fixArriviStruttura, in minuscolo per PRESTAY_HOTELS.
function _psStrutturaDaCamera(camera){
  const c=String(camera||'').trim().toUpperCase();
  if(/^(CAPRI|NAPOLI|PROCIDA|ISCHIA|POSITANO)/.test(c))return'pr';
  if(/^LIB/.test(c))return'sl';
  if(/^R\s*[123]$/.test(c))return'ms';
  if(/^\d+$/.test(c)&&+c>=200&&+c<=299)return'bh';
  return'sa';                                   // Art XX e altre numeriche → SoulArt
}
/**
 * @param {Array<{s:string,x:number,y:number}>} items testo con coordinate (da pdf.js)
 * @returns {{iso:string|null, arrivi:Array<{camera,nome,hotel}>}}
 */
function _psParsePdfArrivi(items){
  const righe=new Map();
  (items||[]).forEach(it=>{
    const s=String(it.s||'').trim();if(!s)return;
    const y=Math.round(it.y);
    if(!righe.has(y))righe.set(y,[]);
    righe.get(y).push({s,x:it.x});
  });
  const ordinate=[...righe.entries()].sort((a,b)=>b[0]-a[0]).map(e=>e[1]);
  const col=(r,da,a)=>r.filter(i=>i.x>=da&&i.x<a).sort((p,q)=>p.x-q.x).map(i=>i.s).join(' ').trim();
  // Data dall'intestazione "Arrivi - 17/08/2026": importare nel giorno sbagliato sarebbe
  // peggio che non importare, quindi la si legge dal documento invece di assumerla.
  let iso=null;
  for(const r of ordinate){
    const m=r.map(i=>i.s).join(' ').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(m){iso=m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');break;}
  }
  const arrivi=[];
  ordinate.forEach(r=>{
    const sinistra=col(r,0,PS_COL_OSPITE_DA);
    const ospite=col(r,PS_COL_OSPITE_DA,PS_COL_OSPITE_A);
    const barra=sinistra.indexOf('/');
    if(barra>0){
      const camera=sinistra.slice(0,barra).trim();
      if(PS_RE_CAMERA.test(camera)){
        arrivi.push({camera,nome:ospite,hotel:_psStrutturaDaCamera(camera)});
        return;
      }
    }
    // Riga di continuazione: nome andato a capo. Si accoda solo se una prenotazione è aperta.
    if(ospite&&arrivi.length)arrivi[arrivi.length-1].nome=(arrivi[arrivi.length-1].nome+' '+ospite).trim();
  });
  arrivi.forEach(a=>{a.nome=_psNomeUmano(a.nome.replace(/\s+/g,' ').trim());});
  return{iso,arrivi};
}

let _psSeq=0;
function _psNuovoId(){return 'a'+Date.now().toString(36)+(_psSeq++).toString(36);}
function _psNuovaScheda(hotel){
  return{id:_psNuovoId(),hotel:hotel,nome:'',email:'',tel:'',lang:'it',origine:'',codice:'',codici:[],camere:[],italcamel:false,mailTs:null,waTs:null,mailErr:null};
}
// Accesso al giorno, con migrazione dal vecchio formato indicizzato per camera
// (`{'203':{...}}`) al nuovo (`{arrivi:[…]}`). La migrazione è pigra — avviene alla prima
// apertura di quella data — così il numero di camera già digitato non viene perso: diventa
// una scheda normale, semplicemente senza più la camera come chiave.
function _psGiorno(iso){
  if(!_prestay[iso])_prestay[iso]={arrivi:[]};
  const g=_prestay[iso];
  if(Array.isArray(g.arrivi)){
    // Normalizzazione anche dei nomi GIÀ salvati: applicarla solo all'import lasciava in
    // maiuscolo tutto ciò che era stato caricato prima della modifica, ed è esattamente il
    // caso normale (i dati stanno su KV e sopravvivono agli aggiornamenti dell'app).
    let tocc=false;
    g.arrivi.forEach(a=>{
      const n=_psNomeUmano(a.nome);
      if(n!==a.nome){a.nome=n;tocc=true;}
    });
    if(tocc)_psSave();
  }
  if(!Array.isArray(g.arrivi)){
    const arrivi=[];
    Object.keys(g).forEach(k=>{
      const r=g[k];
      if(!r||typeof r!=='object'||Array.isArray(r))return;
      arrivi.push({id:_psNuovoId(),hotel:r.hotel||'sa',nome:_psNomeUmano(r.nome||''),email:r.email||'',
                   tel:r.tel||'',lang:r.lang||'it',italcamel:!!r.italcamel,mailTs:r.mailTs||null,
                   waTs:r.waTs||null,mailErr:r.mailErr||null});
      delete g[k];
    });
    g.arrivi=arrivi;
    _psSave();
  }
  return g;
}
// Importa gli arrivi letti dal PDF nella giornata, SENZA perdere ciò che è già stato
// digitato: ricaricare una lista aggiornata è un'operazione normale (le prenotazioni
// cambiano fino all'ultimo) e non deve costare la ridigitazione delle email.
//
// Regole, in ordine:
//  1. stesso nome nella stessa struttura → si tiene la scheda esistente (email e telefono
//     già inseriti restano, insieme allo stato di invio);
//  2. nome nuovo → riempie una scheda vuota della struttura, altrimenti ne crea una;
//  3. scheda con dati che non è più nella lista → NON si cancella, si marca `fuoriLista`
//     (prenotazione cancellata o nome cambiato: lo decide l'utente, non il codice);
//  4. scheda vuota non più nella lista → si rimuove, non serviva a nulla.
function _psNomeChiave(s){
  return String(s||'').toLowerCase().replace(/[^a-zà-ÿ\s]/gi,' ').replace(/\s+/g,' ').trim()
    .split(' ').sort().join(' ');   // ordine indifferente: "Rossi Mario" = "Mario Rossi"
}
function _psImportaArrivi(iso,lista){
  const g=_psGiorno(iso);
  const esistenti=g.arrivi||[];
  const usate=new Set();
  const risultato=[];
  let nuovi=0,ritrovati=0;
  (lista||[]).forEach(a=>{
    const chiave=_psNomeChiave(a.nome);
    // 1) Codice della prenotazione: è l'unico riferimento che NON cambia. Il nome sì —
    //    al check-in viene registrato il documento di chi si presenta, che può essere
    //    l'accompagnatore. Senza questo abbinamento la stessa prenotazione tornava come
    //    un secondo arrivo, con il pre-stay già inviato rimasto sulla scheda vecchia.
    // Una multicamera ha un codice per camera: basta che UNO combaci per riconoscere la
    // scheda. `codici` è la lista completa; `codice` resta come primo elemento per le
    // schede salvate prima che esistesse la lista.
    const cod=a.codici&&a.codici.length?a.codici:(a.codice?[a.codice]:[]);
    const suoi=e=>(e.codici&&e.codici.length?e.codici:(e.codice?[e.codice]:[]));
    let s=cod.length?esistenti.find(e=>!usate.has(e.id)&&suoi(e).some(c=>cod.includes(c))):null;
    if(s){ritrovati++;s.nome=a.nome;}     // il nome segue quello del PMS
    else{
      // 2) Nome, per le schede importate prima che ci fosse il codice
      s=chiave?esistenti.find(e=>!usate.has(e.id)&&e.hotel===a.hotel&&_psNomeChiave(e.nome)===chiave):null;
      if(s){ritrovati++;}
      else{
        s=esistenti.find(e=>!usate.has(e.id)&&e.hotel===a.hotel&&_psVuota(e));
        if(s)s.nome=a.nome;
        else{s=_psNuovaScheda(a.hotel);s.nome=a.nome;nuovi++;}
      }
    }
    if(cod.length){s.codici=cod;s.codice=cod[0];}
    if(a.camere)s.camere=a.camere;        // camere della prenotazione, per mostrarne il numero
    s.hotel=a.hotel;                      // una prenotazione può cambiare struttura
    s.fuoriLista=false;
    // Canale di provenienza dal PMS, quando il file lo porta (export "Prenotazioni").
    // Colora il bordo della scheda già all'import, senza aspettare che si digiti l'email,
    // e accende da sé la spunta Italcamel — che prima si metteva a mano perché il vecchio
    // PDF arrivi non aveva l'informazione. Il vecchio import non passa `origine` e qui non
    // tocca nulla, quindi le schede esistenti restano come sono.
    if(a.origine){
      s.origine=a.origine;
      if(/italcamel/i.test(a.origine))s.italcamel=true;
    }
    usate.add(s.id);
    risultato.push(s);
  });
  // Schede rimaste fuori dalla lista importata
  let fuori=0;
  esistenti.forEach(e=>{
    if(usate.has(e.id))return;
    if(_psVuota(e))return;              // scheda vuota inutile: si lascia cadere
    e.fuoriLista=true;fuori++;
    risultato.push(e);
  });
  g.arrivi=risultato;
  _psSave();
  return{totale:(lista||[]).length,nuovi,ritrovati,fuori};
}
// Caricabile da due punti — dall'Upload Center (slot "Arrivi Pre-stay") e dal pulsante
// dentro la vista — che chiamano la stessa funzione: lo stato viene riportato in entrambi.
async function prestayHandlePdf(file){
  const box=document.getElementById('psUploadStato');
  const msg=t=>{if(box)box.textContent=t;};
  const uc=(stato,sub)=>{try{ucSetState('prestay',stato,sub,true);}catch(e){}};
  try{
    msg('Lettura del PDF…');
    uc('loading','Lettura PDF...');
    const ab=await file.arrayBuffer();
    const pdfDoc=await pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise;
    const items=[];
    for(let p=1;p<=pdfDoc.numPages;p++){
      const page=await pdfDoc.getPage(p);
      const tc=await page.getTextContent();
      // Le pagine successive ripartono dall'alto: si sfalsa la y per non mescolare le righe.
      tc.items.forEach(it=>{
        const s=(it.str||'').trim();
        if(s)items.push({s,x:it.transform[4],y:it.transform[5]-(p-1)*10000});
      });
    }
    const{iso,arrivi}=_psParsePdfArrivi(items);
    if(!arrivi.length){
      msg('Nessun arrivo riconosciuto in questo PDF. Controlla di aver esportato la lista "Arrivi" dal PMS.');
      uc('error','Nessun arrivo riconosciuto');
      return;
    }
    // La data si prende dal documento: importare nel giorno sbagliato sarebbe peggio che
    // non importare. Se manca, si usa il giorno mostrato.
    const target=iso||_psTargetISO();
    const r=_psImportaArrivi(target,arrivi);
    _prestayData=target;
    _psAvviso='Importati '+r.totale+' arrivi del '+_psFmtIT(target)+
      (r.ritrovati?' · '+r.ritrovati+' già presenti, contatti conservati':'')+
      (r.nuovi?' · '+r.nuovi+' nuovi':'')+
      (r.fuori?' · '+r.fuori+' non più in lista, segnalati in ambra':'');
    msg('');
    uc('loaded',r.totale+' arriv'+(r.totale===1?'o':'i')+' · '+_psFmtIT(target).slice(0,5));
    try{setUploadTs('prestayTs');}catch(e){}
    prestayRender();
  }catch(e){
    msg('Errore nella lettura: '+(e&&e.message||e));
    uc('error','Errore nella lettura');
  }
}
// Collegamento dello slot Upload Center (click sul riquadro, drag&drop, input file).
(function(){
  const box=document.getElementById('prestayUploadBox');
  const inp=document.getElementById('prestayFileInput');
  if(!inp)return;
  if(box){
    box.addEventListener('click',()=>inp.click());
    box.addEventListener('dragover',e=>{e.preventDefault();box.classList.add('dragover');});
    box.addEventListener('dragleave',()=>box.classList.remove('dragover'));
    box.addEventListener('drop',e=>{
      e.preventDefault();box.classList.remove('dragover');
      const f=e.dataTransfer.files[0];
      if(f&&/pdf$/i.test(f.type||f.name))prestayHandlePdf(f);
      else ucSetState('prestay','error','Carica un PDF.');
    });
  }
  inp.addEventListener('change',e=>{if(e.target.files[0]){prestayHandlePdf(e.target.files[0]);e.target.value='';}});
})();
function _psScheda(iso,id){return (_psGiorno(iso).arrivi||[]).find(a=>a.id===id)||null;}
function _psVuota(a){return !(a.nome||a.email||a.tel);}

function prestaySetScheda(id,campo,val){
  const iso=_psTargetISO();
  const a=_psScheda(iso,id);
  if(!a)return;
  // Anche digitando (o incollando dal PMS) un nome tutto maiuscolo va ammorbidito: finisce
  // nel messaggio all'ospite. Chi scrive in maiuscolo/minuscolo normale non viene toccato.
  a[campo]=campo==='nome'?_psNomeUmano(val):val;
  _psSave();
  if(campo==='nome'&&a[campo]!==val)prestayRender();
  else if(campo==='lang'||campo==='hotel')prestayRender();
}
function prestayNavDay(delta){
  const d=new Date(_psTargetISO()+'T12:00:00');
  d.setDate(d.getDate()+delta);
  _prestayData=_psFmtISO(d);
  prestayRender();
}
function prestayOggi(){_prestayData=null;prestayRender();}
// Aggiunge un arrivo non presente nell'export: serve per Principe e Mastrangelo (che nel
// PDF possono mancare) e per una prenotazione arrivata dopo l'ultimo caricamento.
function prestayAddArrivo(){
  const codici=Object.keys(PRESTAY_HOTELS);
  const elenco=codici.map((k,i)=>(i+1)+') '+PRESTAY_HOTELS[k].name).join('\n');
  const scelta=prompt('Struttura del nuovo arrivo:\n\n'+elenco+'\n\nScrivi il numero:','1');
  if(scelta===null)return;
  const idx=parseInt(scelta,10)-1;
  if(!(idx>=0&&idx<codici.length)){cqAvviso('Struttura non valida: riprova scrivendo un numero da 1 a '+codici.length+'.');return;}
  const iso=_psTargetISO();
  _psGiorno(iso).arrivi.push(_psNuovaScheda(codici[idx]));
  _psSave();prestayRender();
}
async function prestayDelScheda(id){
  const iso=_psTargetISO();
  const g=_psGiorno(iso);
  const a=(g.arrivi||[]).find(x=>x.id===id);
  if(!a)return;
  if(!_psVuota(a)&&!await cqConferma('Eliminare questo arrivo?',(a.nome?'<strong>'+a.nome+'</strong><br>':'')+'I dati inseriti andranno persi.',{ok:'Elimina'}))return;
  g.arrivi=g.arrivi.filter(x=>x.id!==id);
  _psSave();prestayRender();
}

// ── Formattazione leggera nei template ──────────────────────────────────────
// Sintassi nativa WhatsApp (*grassetto*, _corsivo_, righe "- voce" per elenchi): il canale
// WhatsApp non ha bisogno di alcuna conversione, la riceve così com'è. Solo la mail va
// tradotta in HTML (Resend accetta un campo html oltre a text) e il testo semplice del
// mailto: (che non sa mostrare HTML) va ripulito dai marcatori.
function _psMdInline(s){
  return s.replace(/\*([^*\n]+)\*/g,'<strong>$1</strong>').replace(/_([^_\n]+)_/g,'<em>$1</em>');
}
// Riga per riga, non a blocchi separati da riga vuota: un elenco che segue subito una riga
// di testo introduttiva (caso reale comune, "Ecco alcune info:\n- Check-in\n- Wifi", senza
// riga vuota in mezzo) va comunque riconosciuto come elenco, non trascinato nel paragrafo.
function _psMdToHtml(txt){
  const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const righe=String(txt||'').split('\n');
  let out='',buf=[],modo=null;
  const flush=()=>{
    if(buf.length){
      out+=modo==='ul'
        ?'<ul style="margin:0 0 12px;padding-left:20px;">'+buf.map(r=>'<li>'+_psMdInline(esc(r))+'</li>').join('')+'</ul>'
        :'<p style="margin:0 0 12px;">'+buf.map(r=>_psMdInline(esc(r))).join('<br>')+'</p>';
    }
    buf=[];modo=null;
  };
  for(const riga of righe){
    if(!riga.trim()){flush();continue;}
    const m=riga.match(/^\s*-\s+(.*)$/);
    if(m){if(modo==='p')flush();modo='ul';buf.push(m[1]);}
    else{if(modo==='ul')flush();modo='p';buf.push(riga);}
  }
  flush();
  // Stesso font usato negli input di Compass: senza specificarlo la mail arriverebbe col
  // font di default del client dell'ospite e l'anteprima non rispecchierebbe il risultato.
  return '<div style="font-family:\'Helvetica Neue\',Arial,sans-serif;font-size:13px;line-height:1.5;color:#1a1a1a;">'+out+'</div>';
}
// Marcatori tolti, righe elenco convertite in punto elenco leggibile: per il mailto: (il
// client di posta apre un body testo semplice, non HTML) e come fallback generico.
function _psMdStrip(txt){
  return String(txt||'').split('\n').map(r=>r.replace(/^\s*-\s+/,'• ')).join('\n')
    .replace(/\*([^*\n]+)\*/g,'$1').replace(/_([^_\n]+)_/g,'$1');
}
// Toolbar B/I/• sopra le textarea dei template: avvolge la selezione (o inserisce un
// segnaposto se non c'è selezione) e simula il change così il salvataggio (onchange) parte
// subito, anche se il valore è stato scritto via JS e non digitato.
// focus() su una textarea fuori dalla viewport la scrolla in vista: su un editor con 12
// textarea questo faceva "saltare" la pagina in fondo a ogni click. Si salva e ripristina
// la posizione di scroll — il cursore resta dove serve, solo la pagina non si muove.
function _psWrapSel(taId,before,after){
  const ta=document.getElementById(taId);
  if(!ta)return;
  const cont=_psScroller(),scrollY=cont?cont.scrollTop:0;
  const s=ta.selectionStart,e=ta.selectionEnd,val=ta.value;
  const sel=val.slice(s,e)||'testo';
  ta.value=val.slice(0,s)+before+sel+after+val.slice(e);
  ta.focus();ta.setSelectionRange(s+before.length,s+before.length+sel.length);
  ta.dispatchEvent(new Event('change'));
  if(cont)cont.scrollTop=scrollY;
}
function _psBulletSel(taId){
  const ta=document.getElementById(taId);
  if(!ta)return;
  const cont=_psScroller(),scrollY=cont?cont.scrollTop:0;
  const s=ta.selectionStart,e=ta.selectionEnd,val=ta.value;
  let sel=val.slice(s,e)||'voce elenco';
  sel=sel.split('\n').map(r=>r.trim()?('- '+r.replace(/^\s*-\s+/,'')):r).join('\n');
  ta.value=val.slice(0,s)+sel+val.slice(e);
  ta.focus();ta.setSelectionRange(s,s+sel.length);
  ta.dispatchEvent(new Event('change'));
  if(cont)cont.scrollTop=scrollY;
}
const PS_TOOLBAR_STYLE='padding:3px 8px;border:1px solid var(--border);background:var(--surface);border-radius:5px;cursor:pointer;font-size:11px;font-weight:700;color:var(--text-dim);';
const psToolbar=taId=>`<div style="display:flex;gap:4px;margin-bottom:4px;">
  <button type="button" title="Grassetto: *testo*" onclick="_psWrapSel('${taId}','*','*')" style="${PS_TOOLBAR_STYLE}">B</button>
  <button type="button" title="Corsivo: _testo_" onclick="_psWrapSel('${taId}','_','_')" style="${PS_TOOLBAR_STYLE}font-style:italic;">I</button>
  <button type="button" title="Elenco puntato: righe che iniziano con &quot;- &quot;" onclick="_psBulletSel('${taId}')" style="${PS_TOOLBAR_STYLE}">•</button>
</div>`;

// Sostituzione segnaposto: fatta al momento dell'invio, non salvata — così se cambi il
// template i messaggi non ancora inviati usano subito la versione nuova.
// NON esiste {camera}: gli ospiti non sono legati a una stanza (vedi nota in cima).
function _psCompila(txt,a,iso){
  const hn=(PRESTAY_HOTELS[a.hotel]||{}).name||'';
  return String(txt||'')
    .replace(/\{nome\}/g,(a.nome||'').trim()||'Ospite')
    .replace(/\{struttura\}/g,hn)
    .replace(/\{data\}/g,_psFmtIT(iso));
}

// Configurazione invio diretto. Endpoint e chiave stanno SOLO in questo browser
// (localStorage, non KV): la chiave non deve finire su GitHub né essere sincronizzata su
// altri dispositivi insieme al resto dei dati. Vedi worker-prestay-mail.md.
const PRESTAY_MAIL_CFG_KEY='qm_prestay_mailcfg';
let _psMailCfg={endpoint:'',key:''};
try{const c=localStorage.getItem(PRESTAY_MAIL_CFG_KEY);if(c)_psMailCfg=JSON.parse(c)||_psMailCfg;}catch(e){}
function _psMailPronto(){return!!(_psMailCfg.endpoint&&_psMailCfg.key);}
function prestaySetMailCfg(campo,val){
  _psMailCfg[campo]=String(val||'').trim();
  try{localStorage.setItem(PRESTAY_MAIL_CFG_KEY,JSON.stringify(_psMailCfg));}catch(e){}
  prestayRender();
}
// A scorrere NON è la finestra ma il contenitore `.content` (overflow-y:auto): agire su
// window.scrollY non ha effetto. Tutto ciò che tocca lo scorrimento in questa sezione deve
// passare da qui.
function _psScroller(){return document.querySelector('.content');}
// Conserva la posizione: usato quando il ridisegno non deve spostare l'occhio.
function _psSenzaSalto(fn){
  const c=_psScroller(),y=c?c.scrollTop:0;
  fn();
  if(c){
    c.scrollTop=y;
    // Il layout può assestarsi al frame successivo: si ripristina di nuovo.
    requestAnimationFrame(()=>{c.scrollTop=y;});
  }
}
// ── Risposte degli ospiti ───────────────────────────────────────────────────
// Nel pre-stay si chiedono orario di arrivo, preferenza sul letto e allergie: le risposte
// servono a chi prepara la camera, ma andarle a cercare nella webmail è un lavoro a parte.
// Il Worker le legge in IMAP cercando SOLO gli indirizzi degli arrivi del giorno, quindi
// l'endpoint non può restituire il resto della casella (vedi worker.js).
//
// Restano SOLO in questo browser: sono messaggi di ospiti, e tenerli fuori da KV evita di
// spargere corrispondenza su tutti i dispositivi per una comodità di lettura.
const PRESTAY_RISP_KEY='qm_prestay_risposte';
let _psRisposte={};            // { iso: { 'email': {data,oggetto,testo} } }
try{const r=localStorage.getItem(PRESTAY_RISP_KEY);if(r)_psRisposte=JSON.parse(r)||{};}catch(e){}
let _psRispInCorso=false;
function _psRisposta(iso,email){
  const e=String(email||'').trim().toLowerCase();
  return (e&&_psRisposte[iso]&&_psRisposte[iso][e])||null;
}
function _psRispToggle(id,btn){
  const el=document.getElementById(id);
  if(!el)return;
  const espanso=el.style.maxHeight==='none';
  if(espanso){el.style.maxHeight='4.5em';el.style.overflow='hidden';if(btn)btn.textContent='Mostra tutto ▾';}
  else{el.style.maxHeight='none';el.style.overflow='visible';if(btn)btn.textContent='Mostra meno ▴';}
}
// L'endpoint delle risposte sta accanto a quello di invio: si ricava dallo stesso indirizzo
// configurato, senza chiedere all'utente una seconda impostazione da tenere allineata.
function _psEndpointRisposte(){
  const e=String(_psMailCfg.endpoint||'').trim();
  if(!e)return'';
  return e.replace(/\/prestay\/send\/?$/,'/prestay/risposte');
}
async function prestayControllaRisposte(){
  if(_psRispInCorso)return;
  const iso=_psTargetISO();
  const ep=_psEndpointRisposte();
  if(!ep||!_psMailCfg.key){
    cqAvviso('Per leggere le risposte serve la configurazione in "Impostazioni": è la stessa di quella usata per inviare.');
    return;
  }
  const indirizzi=[...new Set((_psGiorno(iso).arrivi||[])
    .map(a=>String(a.email||'').trim().toLowerCase()).filter(Boolean))];
  if(!indirizzi.length){cqAvviso('Nessun indirizzo email inserito in questa data: non c\'è nulla da cercare.');return;}
  _psRispInCorso=true;prestayRender();
  try{
    const r=await fetch(ep,{
      method:'POST',
      headers:{'Content-Type':'application/json','X-Prestay-Key':_psMailCfg.key},
      body:JSON.stringify({indirizzi,giorni:14})
    });
    const j=await r.json().catch(()=>({ok:false,error:'risposta non leggibile'}));
    if(!j||!j.ok)throw new Error((j&&j.error)||'lettura non riuscita');
    _psRisposte[iso]=j.risposte||{};
    try{localStorage.setItem(PRESTAY_RISP_KEY,JSON.stringify(_psRisposte));}catch(e){}
    const n=Object.keys(_psRisposte[iso]).length;
    _psAvviso=n?n+' rispost'+(n===1?'a':'e')+' trovat'+(n===1?'a':'e')+' e mostrat'+(n===1?'a':'e')+' sulle schede.'
              :'Nessuna risposta dagli ospiti di questa data. Chi ha scritto dentro la messaggistica di Booking non compare qui: quelle si leggono solo nell\'Extranet.';
  }catch(e){
    cqAvviso('Non è stato possibile leggere le risposte: '+(e&&e.message||e));
  }finally{
    _psRispInCorso=false;prestayRender();
  }
}
// Chiede al Worker da quale casella parte davvero la posta. È l'unica risposta possibile
// alla domanda "perché le mail agli indirizzi Booking tornano indietro se sull'Extranet
// l'indirizzo è quello giusto?": l'Extranet dice quale mittente è autorizzato, questo dice
// quale mittente stiamo usando. Finché i due non coincidono, il relay rifiuta.
function _psEndpointStato(){
  const e=String(_psMailCfg.endpoint||'').trim();
  if(!e)return'';
  return e.replace(/\/prestay\/send\/?$/,'/prestay/stato');
}
let _psMittInCorso=false;
async function prestayVerificaMittente(){
  if(_psMittInCorso)return;
  const ep=_psEndpointStato();
  if(!ep||!_psMailCfg.key){
    cqAvviso('Serve prima la configurazione qui sotto','Endpoint e chiave sono gli stessi usati per inviare.');
    return;
  }
  _psMittInCorso=true;prestayRender();
  try{
    const r=await fetch(ep,{method:'GET',headers:{'X-Prestay-Key':_psMailCfg.key}});
    // 404 = il Worker in produzione è più vecchio di questo file. Si pubblica a mano, quindi
    // è un caso normale, non un guasto: va detto con le istruzioni invece che come errore.
    if(r.status===404)throw new Error('Il Worker pubblicato non conosce ancora questa verifica: va ripubblicato worker.js su Cloudflare (Workers → anthropic-proxy → Modifica codice → Deploy).');
    const j=await r.json().catch(()=>null);
    if(!j||!j.ok)throw new Error((j&&j.error)||'risposta non leggibile');
    _psMitt={mittente:j.mittente||'',mittenteDa:j.mittenteDa||'',via:j.via||'',smtpHost:j.smtpHost||'',
             replyTo:j.replyTo||'',imap:j.imap||'',versione:j.versione||'',ts:Date.now()};
    try{localStorage.setItem(PS_MITT_KEY,JSON.stringify(_psMitt));}catch(e){}
  }catch(e){
    cqAvviso('Verifica non riuscita',(e&&e.message)||String(e));
  }finally{
    _psMittInCorso=false;prestayRender();
  }
}
// Esito della verifica, dentro il pannello Impostazioni. Mostra sempre e comunque i due
// indirizzi affiancati — quello registrato su Booking e quello da cui spediamo — perché è
// il confronto, non il singolo valore, a spiegare i rimbalzi.
function _psMittRiquadro(){
  const esc=t=>String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const bott='padding:6px 12px;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:7px;font-size:var(--fs-xxs);font-weight:700;font-family:inherit;cursor:'+(_psMittInCorso?'wait':'pointer')+';opacity:'+(_psMittInCorso?'.6':'1')+';';
  let h='<div style="margin-top:14px;border-top:1px solid var(--border-light);padding-top:12px;">'
    +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
    +'<button onclick="prestayVerificaMittente()" '+(_psMittInCorso?'disabled':'')+' style="'+bott+'">'+(_psMittInCorso?'Verifica…':'Verifica mittente')+'</button>'
    +'<span style="font-size:var(--fs-xxs);color:var(--text-dim);line-height:1.5;flex:1;min-width:220px;">Chiede al Worker da quale casella parte davvero la posta. Sull\'Extranet Booking è registrato <strong>'+esc(PRESTAY_BOOKING_MITTENTE)+'</strong>, e gli indirizzi <strong>@guest.booking.com</strong> accettano posta solo da lì: da qualunque altro mittente la rimandano indietro.</span>'
    +'</div>';
  if(!_psMitt){
    return h+'<div style="margin-top:10px;font-size:var(--fs-xxs);color:var(--text-dim);line-height:1.55;">Mai verificato su questa postazione. Finché non lo è, gli arrivi con indirizzo Booking restano segnati come non recapitabili e l\'invio in blocco li salta.</div></div>';
  }
  const m=_psMittenteAttuale(),okB=_psMittenteOkBooking();
  const col=okB?'var(--green)':'var(--red)',bg=okB?'var(--green-bg)':'var(--red-bg)';
  const quando=new Date(_psMitt.ts||Date.now());
  const hhmm=String(quando.getHours()).padStart(2,'0')+':'+String(quando.getMinutes()).padStart(2,'0');
  h+='<div style="margin-top:10px;border:1px solid '+col+';background:'+bg+';border-radius:8px;padding:10px 12px;">'
    +'<div style="font-size:var(--fs-xs);font-weight:700;color:'+col+';margin-bottom:6px;">'
    +(okB?'Spediamo dall\'indirizzo registrato su Booking':'Spediamo da un indirizzo diverso da quello registrato su Booking')+'</div>'
    +'<div style="font-size:var(--fs-xxs);color:var(--text);line-height:1.7;">'
    +'mittente reale: <strong>'+esc(m||'(nessuno)')+'</strong>'+(_psMitt.mittenteDa?' <span style="color:var(--text-dim);">(variabile '+esc(_psMitt.mittenteDa)+')</span>':'')+'<br>'
    +'registrato su Booking: <strong>'+esc(PRESTAY_BOOKING_MITTENTE)+'</strong><br>'
    +'invio: '+esc(_psMitt.via||'?')+(_psMitt.smtpHost?' · '+esc(_psMitt.smtpHost):'')
    +(_psMitt.replyTo?' · risposte a '+esc(_psMitt.replyTo):'')
    +'</div>';
  if(!okB){
    h+='<div style="margin-top:8px;font-size:var(--fs-xxs);color:var(--text);line-height:1.6;">'
      +'È questo il motivo dei rimbalzi: sull\'Extranet l\'indirizzo può essere giusto, ma la mail non parte da lì. '
      +'Su Cloudflare (Workers → anthropic-proxy → Impostazioni) vanno messe <strong>SMTP_USER</strong> e <strong>SMTP_PASS</strong> della casella '+esc(PRESTAY_BOOKING_MITTENTE)+', '
      +'e va <strong>cancellata SMTP_FROM</strong> se presente: resta lei a decidere il mittente'+(_psMitt.mittenteDa==='SMTP_FROM'?' — ed è proprio il caso attuale':'')+'. '
      +'Poi si ripubblica il Worker e si preme di nuovo questo pulsante.</div>';
  }
  // La casella letta in IMAP è quella dove finiscono le risposte degli ospiti: cambiando
  // casella di invio, le risposte cambiano posto e "Controlla risposte" smetterebbe di
  // trovarle senza dire perché.
  if(_psMitt.imap&&m&&_psMitt.imap.toLowerCase()!==m.toLowerCase()){
    h+='<div style="margin-top:8px;font-size:var(--fs-xxs);color:var(--text-muted);line-height:1.6;">"Controlla risposte" legge <strong>'+esc(_psMitt.imap)+'</strong>, che non è la casella da cui si spedisce: le risposte degli ospiti arrivano dove torna il messaggio, quindi se non compaiono vanno allineate anche <strong>IMAP_USER</strong>/<strong>IMAP_PASS</strong>.</div>';
  }
  h+='<div style="margin-top:8px;font-size:9px;color:var(--text-dim);">verificato alle '+hhmm+' · Worker versione '+esc(_psMitt.versione||'sconosciuta')+'</div>'
    +'</div></div>';
  return h;
}
function prestayToggleMailCfg(){_prestayMailCfgOpen=!_prestayMailCfgOpen;_psSenzaSalto(prestayRender);}
let _prestayMailCfgOpen=false;
let _psMailInFlight={};

// Spedizione vera e propria — chiamata dall'anteprima, non direttamente dal pulsante.
// Nucleo dell'invio: restituisce una Promise così può essere usato sia da un singolo
// pulsante sia dall'invio di gruppo, che deve aspettare una mail prima di partire con la
// successiva. Non apre mai alert: chi chiama decide come segnalare.
function _psInviaMail(a,ogg,corpo){
  const fromName=PRESTAY_FROM_NAME[a.hotel]||'';
  return fetch(_psMailCfg.endpoint,{
    method:'POST',
    headers:{'Content-Type':'application/json','X-Prestay-Key':_psMailCfg.key},
    body:JSON.stringify({to:a.email,subject:ogg,text:_psMdStrip(corpo),html:_psMdToHtml(corpo),fromName})
  }).then(res=>res.json().catch(()=>({ok:false,error:'risposta non leggibile'})))
   .then(j=>{
    if(j&&j.ok){a.mailTs=Date.now();a.mailErr=null;return true;}
    a.mailErr=(j&&j.error)||'invio fallito';return false;
  }).catch(e=>{a.mailErr=e.message||'rete non raggiungibile';return false;});
}
function _psSpedisciMail(id,ogg,corpo){
  const iso=_psTargetISO(),a=_psScheda(iso,id);
  if(!a)return;
  if(!_psMailPronto()){
    // Il client di posta apre un body testo semplice: niente HTML, quindi i marcatori
    // *grassetto*/_corsivo_ vanno tolti invece di lasciarli visibili come asterischi.
    window.location.href='mailto:'+encodeURIComponent(a.email)+'?subject='+encodeURIComponent(ogg)+'&body='+encodeURIComponent(_psMdStrip(corpo));
    a.mailTs=Date.now();_psSave();
    setTimeout(prestayRender,300);
    return;
  }
  _psMailInFlight[id]=true;prestayRender();
  _psInviaMail(a,ogg,corpo).then(ok=>{
    delete _psMailInFlight[id];
    _psSave();prestayRender();
    if(!ok)cqAvviso('Invio non riuscito: '+a.mailErr+'\n\nL\'arrivo resta da contattare. Se il problema persiste puoi usare WhatsApp o togliere la configurazione per tornare al client di posta.');
  });
}
// Invio in blocco di una struttura. Le mail partono UNA ALLA VOLTA, aspettando l'esito
// della precedente: l'SMTP condiviso di Register e il tetto giornaliero del Worker non
// gradiscono raffiche, e in caso di errore si sa esattamente dove ci si è fermati.
// Si salta chi non ha email e chi è già stato contattato — così ripremere il pulsante
// dopo aver aggiunto un ospite manda solo la mail mancante, non di nuovo tutte.
async function prestayInviaGruppo(hotel){
  const iso=_psTargetISO();
  const nome=(PRESTAY_HOTELS[hotel]||{}).name||hotel;
  if(!_psMailPronto()){
    cqAvviso('L\'invio diretto non è configurato su questo browser, quindi l\'invio in blocco non è disponibile: aprirebbe una finestra del client di posta per ogni ospite.\n\nConfiguralo da "Impostazioni", oppure manda i messaggi uno alla volta.');
    return;
  }
  const tutti=(_psGiorno(iso).arrivi||[]).filter(a=>a.hotel===hotel);
  // Gli indirizzi Booking vengono ESCLUSI, non spediti: Booking li scarterebbe in silenzio
  // e resterebbero segnati come inviati pur non essendo arrivati a nessuno. Meglio un
  // conteggio che resta incompleto — è la verità — di una spunta verde che mente.
  const bloccati=tutti.filter(a=>a.email&&!a.mailTs&&_psBookingBloccato(a.email)).length;
  const daFare=tutti.filter(a=>a.email&&!a.mailTs&&!_psBookingBloccato(a.email));
  const senzaMail=tutti.filter(a=>!a.email).length;
  if(!daFare.length){
    cqAvviso(senzaMail||bloccati
      ? 'Nessuna mail da inviare per '+nome+'.'
        +(senzaMail?'\n\n· '+senzaMail+' arriv'+(senzaMail===1?'o è':'i sono')+' senza indirizzo email.':'')
        +(bloccati?'\n\n· '+bloccati+' ha'+(bloccati===1?'':'nno')+' un indirizzo Booking, recapitabile solo spedendo da '+PRESTAY_BOOKING_MITTENTE+'. Controlla da quale casella parte la posta con Impostazioni → Verifica mittente. Nel frattempo contattali su WhatsApp, se hai il numero.':'')
      : 'Per '+nome+' le mail sono già state inviate tutte.');
    return;
  }
  const avvisoVuoti=senzaMail?'<br><br>'+senzaMail+' arriv'+(senzaMail===1?'o verrà saltato perché non ha':'i verranno saltati perché non hanno')+' email.':'';
  const avvisoBooking=bloccati?'<br><br>'+bloccati+' indirizz'+(bloccati===1?'o Booking verrà saltato':'i Booking verranno saltati')+': Booking li rimanda indietro se la mail non parte da '+PRESTAY_BOOKING_MITTENTE+'.':'';
  if(!await cqConferma('Inviare '+daFare.length+' '+(daFare.length===1?'messaggio':'messaggi')+'?',
      '<strong>'+nome+'</strong>'+avvisoVuoti+avvisoBooking
      +'<br><br>Partono uno alla volta, col testo del template. Non c\'è anteprima: per rileggere prima di mandare usa il pulsante su una singola scheda.',
      {ok:'Invia'}))return;
  let ok=0,ko=0;
  for(const a of daFare){
    _psMailInFlight[a.id]=true;prestayRender();
    const t=_psTpl(a.hotel,a.lang||'it');
    const riuscito=await _psInviaMail(a,_psCompila(t.ogg,a,iso),_psCompila(t.corpo,a,iso));
    delete _psMailInFlight[a.id];
    riuscito?ok++:ko++;
    _psSave();prestayRender();
  }
  _psAvviso=nome+': '+ok+' mail inviat'+(ok===1?'a':'e')+(ko?' · '+ko+' non riuscit'+(ko===1?'a':'e')+', l\'errore è indicato sulla riga':'');
  prestayRender();
}
function _psSpedisciWa(id,corpo){
  const iso=_psTargetISO(),a=_psScheda(iso,id);
  if(!a)return;
  const tel=(a.tel||'').replace(/[^\d+]/g,'');
  if(!tel){cqAvviso('Inserisci prima il numero di telefono di questo ospite.');return;}
  // *grassetto* e _corsivo_ sono già la sintassi nativa di WhatsApp: nessuna conversione.
  // Le righe "- voce" (WhatsApp non ha un vero elenco puntato) diventano "• voce".
  const testoWa=String(corpo||'').split('\n').map(r=>r.replace(/^\s*-\s+/,'• ')).join('\n');
  window.open('https://wa.me/'+tel.replace(/^\+/,'')+'?text='+encodeURIComponent(testoWa),'_blank');
  a.waTs=Date.now();_psSave();
  setTimeout(prestayRender,300);
}

// ── Anteprima prima dell'invio ──────────────────────────────────────────────
// I pulsanti non spediscono al volo: aprono il messaggio già compilato e modificabile.
// Con nome e contatti copiati a mano dal PMS, un refuso o un segnaposto rimasto vuoto si
// vedono solo rileggendo — e una mail sbagliata a un ospite non si richiama indietro. Le
// correzioni valgono per QUESTO invio soltanto: il template resta com'è.
// Aprendo l'anteprima si vuole vedere IL MESSAGGIO, non il testo sorgente con gli
// asterischi: si mostra quindi il risultato finito, come lo leggerà l'ospite. La modifica
// resta a un clic sulla matita, ma non è più la modalità predefinita — nella maggior parte
// dei casi si apre solo per rileggere prima di premere invio.
let _psAnteprima=null;   // {id,canale,ogg,corpo,modifica}
function prestayAnteprima(id,canale){
  const iso=_psTargetISO(),a=_psScheda(iso,id);
  if(!a)return;
  const haMail=!!a.email,haTel=!!(a.tel||'').replace(/[^\d+]/g,'');
  if(canale==='mail'&&!haMail){cqAvviso('Inserisci prima l\'indirizzo email di questo ospite.');return;}
  if(canale==='wa'&&!haTel){cqAvviso('Inserisci prima il numero di telefono di questo ospite.');return;}
  if(canale==='both'&&!haMail&&!haTel){cqAvviso('Inserisci prima almeno un contatto (email o telefono) per vedere l\'anteprima.');return;}
  const t=_psTpl(a.hotel,a.lang||'it');
  _psAnteprima={id,canale,ogg:_psCompila(t.ogg,a,iso),corpo:_psCompila(t.corpo,a,iso),modifica:false};
  const m=document.createElement('div');
  m.id='psAnteprimaModal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;';
  m.onclick=e=>{if(e.target===m)prestayChiudiAnteprima();};
  m.innerHTML='<div id="psAntBox" onclick="event.stopPropagation()" style="background:var(--surface);border-radius:14px;padding:22px;max-width:640px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);margin:auto;"></div>';
  document.body.appendChild(m);
  _psAntRendi();
}
// Passa da lettura a modifica e viceversa, conservando ciò che è stato scritto.
function prestayAntModifica(){
  if(!_psAnteprima)return;
  if(_psAnteprima.modifica)_psAntLeggiCampi();
  _psAnteprima.modifica=!_psAnteprima.modifica;
  _psAntRendi();
}
// Travasa il contenuto dei campi nello stato: va fatto PRIMA di ridisegnare o di inviare,
// altrimenti una correzione appena digitata andrebbe persa.
function _psAntLeggiCampi(){
  if(!_psAnteprima)return;
  const o=document.getElementById('psAntOgg'),c=document.getElementById('psAntCorpo');
  if(o)_psAnteprima.ogg=o.value;
  if(c)_psAnteprima.corpo=c.value;
}
function _psAntRendi(){
  const box=document.getElementById('psAntBox');
  if(!box||!_psAnteprima)return;
  const {id,canale,ogg,corpo,modifica}=_psAnteprima;
  const iso=_psTargetISO(),a=_psScheda(iso,id);
  if(!a)return;
  const haMail=!!a.email,haTel=!!(a.tel||'').replace(/[^\d+]/g,'');
  const dest=canale==='mail'?a.email:canale==='wa'?(a.tel||''):[a.email,a.tel].filter(Boolean).join(' · ')||'nessun contatto';
  const nomeH=(PRESTAY_HOTELS[a.hotel]||{}).name||'';
  const avvisi=[];
  if(/\[SCRIVI QUI|\[WRITE THE/i.test(corpo))avvisi.push('Il testo contiene ancora il segnaposto da riscrivere: personalizzalo in "Modifica testi", oppure correggilo qui con la matita solo per questo invio.');
  if(!(a.nome||'').trim())avvisi.push('Nome ospite vuoto: il messaggio dirà genericamente "Gentile Ospite".');
  if(/\{[a-z]+\}/i.test(corpo)||/\{[a-z]+\}/i.test(ogg))avvisi.push('C\'è un segnaposto tra graffe non sostituito: controlla che sia scritto esattamente {nome}, {struttura} o {data}.');
  if(canale!=='wa'&&_psBookingBloccato(a.email)){
    const mitt=_psMittenteAttuale();
    avvisi.push('<strong>Questo è un indirizzo Booking</strong>: viene recapitato solo se la mail parte da '+PRESTAY_BOOKING_MITTENTE+'. '
      +(mitt?'Compass spedisce da <strong>'+mitt+'</strong>, quindi Booking la rimanda indietro.'
            :'Il mittente da cui Compass spedisce non è stato verificato (Impostazioni → Verifica mittente): se non è quello, Booking la rimanda indietro o la scarta senza avvisare.')
      +' Risulterebbe inviata senza esserlo.');
  }
  const esc=v=>String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const matita='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>';

  box.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap;">
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:var(--fs-sm);font-weight:700;">${canale==='mail'?PS_ICON_MAIL+' Anteprima mail':canale==='wa'?PS_ICON_WA+' Anteprima WhatsApp':PS_ICON_EYE+' Anteprima messaggio'}</span>
      <span style="font-size:var(--fs-xs);color:var(--text-muted);">${nomeH} · ${(a.lang||'it').toUpperCase()}</span>
      <button onclick="prestayAntModifica()" title="${modifica?'Torna a vedere il messaggio finito':'Modifica il testo solo per questo invio'}" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border:1px solid ${modifica?'var(--accent)':'var(--border)'};background:${modifica?'var(--accent-bg)':'var(--surface)'};color:${modifica?'var(--accent)':'var(--text-dim)'};border-radius:7px;cursor:pointer;font-size:var(--fs-xxs);font-weight:700;">${matita}${modifica?'Fine':'Modifica'}</button>
    </div>
    <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-bottom:12px;">A: <strong style="color:var(--text);">${esc(dest)}</strong>${canale==='mail'&&_psMailPronto()?' · parte davvero da qui':canale==='mail'?' · si aprirà il client di posta':''}</div>
    ${avvisi.length?`<div style="background:var(--amber-bg);color:var(--amber);border-radius:7px;padding:9px 12px;font-size:var(--fs-xs);line-height:1.55;margin-bottom:12px;">${avvisi.map(v=>'• '+v).join('<br>')}</div>`:''}
    ${modifica?`
      ${canale!=='wa'?`<label style="display:block;font-size:var(--fs-xxs);font-weight:700;color:var(--text-dim);margin-bottom:3px;">OGGETTO${canale==='both'?' <span style="font-weight:400;text-transform:none;">(solo per la mail)</span>':''}</label>
      <input id="psAntOgg" value="${String(ogg).replace(/"/g,'&quot;')}" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font-size:var(--fs-xs);font-family:'Helvetica Neue',Arial,sans-serif;margin-bottom:10px;">`:''}
      ${psToolbar('psAntCorpo')}
      <textarea id="psAntCorpo" rows="14" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font-size:var(--fs-xs);font-family:'Helvetica Neue',Arial,sans-serif;line-height:1.6;resize:vertical;">${esc(corpo)}</textarea>
      <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-top:6px;line-height:1.5;"><code style="background:var(--surface2);padding:0 4px;border-radius:3px;">*grassetto*</code> · <code style="background:var(--surface2);padding:0 4px;border-radius:3px;">_corsivo_</code> · righe con "- " per gli elenchi. Le modifiche valgono solo per questo invio: per cambiare il testo di tutti usa "✏️ Modifica testi".</div>
    `:`
      ${canale!=='wa'?`<div style="font-size:var(--fs-sm);font-weight:700;color:var(--text);margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border-light);">${esc(ogg)}</div>`:''}
      <div style="border:1px solid var(--border-light);border-radius:8px;padding:14px 16px;background:var(--surface2);font-size:var(--fs-xs);color:var(--text);line-height:1.55;max-height:420px;overflow-y:auto;">${_psMdToHtml(corpo)}</div>
    `}
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
      <button onclick="prestayChiudiAnteprima()" style="flex:1;min-width:90px;padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);font-weight:600;font-size:var(--fs-xs);cursor:pointer;">${canale==='both'?'Chiudi':'Annulla'}</button>
      ${canale!=='wa'&&haMail?`<button onclick="prestayInviaDaAnteprima('mail')" style="flex:2;min-width:150px;padding:10px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:var(--fs-xs);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;">${PS_ICON_MAIL}${_psMailPronto()?'Invia la mail':'Apri il client di posta'}</button>`:''}
      ${canale!=='mail'&&haTel?`<button onclick="prestayInviaDaAnteprima('wa')" style="flex:2;min-width:130px;padding:10px;background:${canale==='both'?'#e9faf0':'#25D366'};color:${canale==='both'?'#1a9f4f':'#fff'};border:${canale==='both'?'1px solid #25D366':'none'};border-radius:8px;font-weight:700;font-size:var(--fs-xs);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;">${PS_ICON_WA}Apri WhatsApp</button>`:''}
    </div>`;
}
function prestayChiudiAnteprima(){
  const m=document.getElementById('psAnteprimaModal');
  if(m)m.remove();
  _psAnteprima=null;
}
function prestayInviaDaAnteprima(canaleScelto){
  if(!_psAnteprima)return;
  _psAntLeggiCampi();                       // eventuali correzioni non ancora confermate
  const {id,ogg,corpo}=_psAnteprima;
  const canale=canaleScelto||_psAnteprima.canale;
  if(!String(corpo||'').trim()){cqAvviso('Il messaggio è vuoto.');return;}
  prestayChiudiAnteprima();
  if(canale==='mail')_psSpedisciMail(id,ogg,corpo);
  else _psSpedisciWa(id,corpo);
}

// Lo stato "inviato" nasce dal click sul pulsante, ma è una spunta come le altre: se il
// client di posta non si apre, o si annulla, va poterla togliere a mano.
function prestayToggleInviato(id,canale){
  const iso=_psTargetISO(),a=_psScheda(iso,id);
  if(!a)return;
  const k=canale==='wa'?'waTs':'mailTs';
  a[k]=a[k]?null:Date.now();
  _psSave();prestayRender();
}
// L'editor dei testi si costruisce in fondo alla vista: aprendolo senza spostare la pagina
// sembrava non succedere nulla. Lo si porta IN VISTA (non "in cima": in cima ci sono gli
// arrivi, l'editor resterebbe comunque fuori schermo).
function prestayToggleTpl(){
  _prestayTplOpen=!_prestayTplOpen;
  prestayRender();
  const c=_psScroller();
  if(!c)return;
  if(!_prestayTplOpen){c.scrollTop=0;return;}     // chiudendo si torna all'elenco
  const porta=()=>{
    const p=document.getElementById('psTplPanel');
    if(p)c.scrollTop=Math.max(0,p.offsetTop-c.offsetTop-8);
  };
  porta();
  requestAnimationFrame(porta);                   // il layout può assestarsi dopo
}
function prestaySetTpl(hotel,lang,campo,val){
  if(!_prestayTpl[hotel])_prestayTpl[hotel]={};
  if(!_prestayTpl[hotel][lang])_prestayTpl[hotel][lang]={...(PRESTAY_TPL_DEFAULT[lang]||{})};
  _prestayTpl[hotel][lang][campo]=val;
  _psSaveTpl();
}

function prestayRender(){
  const el=document.getElementById('prestay-content');
  if(!el)return;
  const iso=_psTargetISO();
  const dt=new Date(iso+'T12:00:00');
  const GIORNI=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const MESI=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const oggiIso=_psFmtISO(new Date());
  const ggDa=Math.round((dt-new Date(oggiIso+'T12:00:00'))/86400000);

  const arrivi=_psGiorno(iso).arrivi||[];
  // Gli arrivi Italcamel restano visibili ma FUORI DAI CONTEGGI: non sono contattabili per
  // definizione, quindi tenerli nel denominatore terrebbe i gruppi eternamente incompleti e
  // l'avviso ambra accesso anche a lavoro finito.
  const contattabili=arrivi.filter(a=>!_psItalcamel(a));
  const inviati=contattabili.filter(a=>a.mailTs||a.waTs).length;

  // Barra su DUE piani: sopra dove sei e come stai andando, sotto cosa puoi fare.
  // Prima erano tutti sulla stessa riga, con due contatori quasi identici affiancati
  // ("9/14 con contatto" e "9/14 contattati") che si leggevano come una ripetizione.
  // Ora un numero solo più la barra di avanzamento; "da fare" resta esplicito.
  const tuttoFatto=contattabili.length>0&&inviati===contattabili.length;
  const pct=contattabili.length?Math.round(inviati/contattabili.length*100):0;
  const bott='padding:6px 12px;border:1px solid var(--border);background:var(--surface);border-radius:7px;cursor:pointer;font-size:var(--fs-xxs);font-weight:600;';
  let h=`<div style="border:1px solid var(--border-light);border-radius:10px;margin-bottom:14px;overflow:hidden;">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:11px 13px;">
      <button onclick="prestayNavDay(-1)" title="Giorno precedente" style="width:30px;height:30px;border:1px solid var(--border);background:var(--surface);border-radius:7px;cursor:pointer;font-size:16px;line-height:1;">‹</button>
      <div style="min-width:190px;">
        <div style="font-size:var(--fs-sm);font-weight:700;color:var(--text);">${GIORNI[dt.getDay()]} ${dt.getDate()} ${MESI[dt.getMonth()]}</div>
        <div style="font-size:var(--fs-xxs);color:${ggDa===PRESTAY_GG?'var(--accent)':'var(--text-dim)'};font-weight:${ggDa===PRESTAY_GG?700:400};">${ggDa===0?'oggi':ggDa===1?'domani':ggDa>0?'fra '+ggDa+' giorni':'passato'}${ggDa===PRESTAY_GG?' · da contattare oggi':''}</div>
      </div>
      <button onclick="prestayNavDay(1)" title="Giorno successivo" style="width:30px;height:30px;border:1px solid var(--border);background:var(--surface);border-radius:7px;cursor:pointer;font-size:16px;line-height:1;">›</button>
      ${ggDa!==PRESTAY_GG?`<button onclick="prestayOggi()" style="padding:5px 11px;border:1px solid var(--accent);background:var(--accent-bg);color:var(--accent);border-radius:7px;cursor:pointer;font-size:var(--fs-xxs);font-weight:700;">Torna a fra ${PRESTAY_GG} giorni</button>`:''}
      <div class="ps-bar-stato">
        <div style="font-size:var(--fs-sm);font-weight:700;color:${tuttoFatto?'var(--green)':'var(--text)'};white-space:nowrap;">
          ${tuttoFatto?'✓ ':''}${inviati} <span style="font-size:var(--fs-xs);font-weight:400;color:var(--text-muted);">di ${contattabili.length} contattati</span>
        </div>
        <div class="ps-bar-prog">
          ${contattabili.length-inviati>0?`<span style="font-size:var(--fs-xxs);color:var(--amber);font-weight:700;">${contattabili.length-inviati} da fare</span>`:''}
          <div style="width:150px;height:5px;background:var(--border-light);border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:5px;background:${tuttoFatto?'var(--green)':'var(--accent)'};transition:width .2s;"></div>
          </div>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 13px;border-top:1px solid var(--border-light);background:var(--bg);">
      <button onclick="prestayControllaRisposte()" ${_psRispInCorso?'disabled':''} title="Cerca nella casella del Quality Manager le risposte degli ospiti di questa data" style="${bott}cursor:${_psRispInCorso?'wait':'pointer'};opacity:${_psRispInCorso?'.6':'1'};">${_psRispInCorso?'Lettura…':'↓ Controlla risposte'}</button>
      <button onclick="prestayAddArrivo()" style="${bott}">+ Aggiungi arrivo</button>
      <div class="ps-bar-cfg">
        <button onclick="prestayToggleTpl()" style="${bott}">✏️ Modifica testi</button>
        <button onclick="prestayToggleMailCfg()" title="${_psMailPronto()?'Invio diretto attivo su questo browser':'Non configurato: il pulsante mail apre il client di posta'}" style="padding:6px 12px;border:1px solid ${_psMailPronto()?'var(--green)':'var(--border)'};background:${_psMailPronto()?'var(--green-bg)':'var(--surface)'};color:${_psMailPronto()?'var(--green)':'var(--text)'};border-radius:7px;cursor:pointer;font-size:var(--fs-xxs);font-weight:600;">⚙️ Impostazioni${_psMailPronto()?' ✓':''}</button>
      </div>
    </div>
  </div>`;

  h+=`<div id="psUploadStato" style="font-size:var(--fs-xs);color:var(--text-muted);margin-bottom:10px;"></div>`;

  if(_psAvviso){
    h+=`<div style="background:var(--green-bg);border:1px solid var(--green);border-radius:8px;padding:9px 13px;margin-bottom:12px;font-size:var(--fs-xs);color:var(--green);line-height:1.5;">${_psAvviso}</div>`;
    _psAvviso=null;
  }

  if(!arrivi.length){
    h+=`<div style="background:var(--surface2);border:1px solid var(--border-light);border-radius:9px;padding:18px;text-align:center;color:var(--text-muted);font-size:var(--fs-xs);line-height:1.6;">
      Nessun arrivo per questa data.<br>Esporta la lista <strong>Arrivi</strong> dal PMS in PDF e caricala dall'Upload Center, riquadro <strong>"Arrivi Pre-stay"</strong>: nomi e strutture si compilano da soli, restano da inserire solo email e telefono.<br>Per un arrivo isolato puoi anche usare "+ Aggiungi arrivo".
    </div>`;
  }else{
    const inpS='padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);font-size:var(--fs-xs);font-family:\'Helvetica Neue\',Arial,sans-serif;width:100%;box-sizing:border-box;';
    const esc=s=>String(s||'').replace(/"/g,'&quot;');
    // Un gruppo per struttura, nell'ordine di PRESTAY_HOTELS: dentro, "Arrivo 1, 2, 3…".
    Object.keys(PRESTAY_HOTELS).forEach(hc=>{
      const gruppo=arrivi.filter(a=>a.hotel===hc);
      if(!gruppo.length)return;
      const gContattabili=gruppo.filter(a=>!_psItalcamel(a));
      const nItal=gruppo.length-gContattabili.length;
      const daInviare=gContattabili.filter(a=>a.email&&!a.mailTs&&!_psBookingBloccato(a.email)).length;
      const bloccatiGruppo=gContattabili.filter(a=>_psBookingBloccato(a.email)&&!a.mailTs).length;
      const contattati=gContattabili.filter(a=>a.mailTs||a.waTs).length;
      const tuttiFatti=gContattabili.length>0&&contattati===gContattabili.length;
      h+=`<div style="margin-bottom:16px;border:1px solid ${tuttiFatti?'var(--green)':'var(--border-light)'};border-radius:10px;overflow:hidden;">
        <div style="background:${tuttiFatti?'var(--green-bg)':'var(--bg)'};padding:8px 13px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-size:var(--fs-xs);font-weight:700;color:var(--text);">${PRESTAY_HOTELS[hc].name}</span>
          <span style="font-size:var(--fs-xxs);font-weight:700;color:${tuttiFatti?'var(--green)':'var(--text-dim)'};">${contattati}/${gContattabili.length} contattati</span>
          ${nItal?`<span style="font-size:var(--fs-xxs);color:var(--text-dim);">+ ${nItal} Italcamel</span>`:''}
          ${daInviare?`<button onclick="prestayInviaGruppo('${hc}')" title="Invia il messaggio a tutti gli arrivi di questa struttura che hanno un'email e non sono ancora stati contattati" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border:1px solid var(--accent);background:var(--accent);color:#fff;border-radius:7px;cursor:pointer;font-size:var(--fs-xxs);font-weight:700;">${PS_ICON_MAIL}Invia tutte (${daInviare})</button>`
            :tuttiFatti?`<span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:var(--fs-xxs);color:var(--green);font-weight:700;">✓ tutti contattati</span>`
            :`<span style="margin-left:auto;font-size:var(--fs-xxs);color:var(--amber);font-weight:700;">${bloccatiGruppo?bloccatiGruppo+' con indirizzo Booking':(gContattabili.length-contattati)+' senza contatto inserito'}</span>`}
        </div>
        <div class="ps-grid">`;
      gruppo.forEach((a,i)=>{
        const mailOk=!!a.mailTs,waOk=!!a.waTs;
        const inFlight=!!_psMailInFlight[a.id];
        // Una scheda già contattata si riconosce senza leggere: fondo e bordo verdi. Il
        // pulsante resta, ma diventa "Rinvia" e perde il pieno — non è più l'azione attesa.
        const fatto=mailOk||waOk;
        const ora=ts=>{const d=new Date(ts);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
        const chip=(ok,ts,lbl,fn)=>`<span onclick="prestayToggleInviato('${a.id}','${fn}')" title="${ok?'Inviato il '+new Date(ts).toLocaleString('it-IT')+' — clicca per annullare':'Non ancora inviato — clicca per segnarlo come inviato a mano'}" style="cursor:pointer;font-size:var(--fs-xxs);font-weight:700;padding:2px 8px;border-radius:10px;background:${ok?'var(--green)':'var(--surface2)'};color:${ok?'#fff':'var(--text-dim)'};border:1px solid ${ok?'var(--green)':'var(--border-light)'};">${ok?'✓ '+lbl+' '+ora(ts):'○ '+lbl}</span>`;
        // Bordo: verde se già contattato, altrimenti il colore del canale di provenienza
        // dedotto dall'indirizzo. Italcamel non ha contatti, quindi la scheda resta sfocata
        // e marcata: non c'è nulla da compilare né da inviare.
        const ital=_psItalcamel(a);
        const bordo=fatto?'var(--green)':_psBordo(a);
        h+=`<div id="psCard-${a.id}" data-fatto="${fatto?'1':'0'}" data-canale="${_psCanaleCol(a)||''}" style="position:relative;background:${fatto?'var(--green-bg)':'var(--surface)'};border:1px solid ${bordo};border-radius:10px;padding:11px 13px;">
          ${ital?`<div style="position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(244,244,246,.45);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);pointer-events:none;">
            <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:700;letter-spacing:-.01em;color:var(--text);opacity:.62;text-shadow:0 1px 0 #fff;white-space:nowrap;">Italcamel</span>
          </div>`:''}
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px;">
            <span style="padding:2px 9px;border-radius:12px;background:${fatto?'var(--green-bg)':'var(--surface2)'};color:${fatto?'var(--green)':'var(--text-muted)'};border:1px solid ${fatto?'var(--green)':'var(--border-light)'};font-size:var(--fs-xxs);font-weight:700;line-height:1.5;white-space:nowrap;">Arrivo ${i+1}</span>
            ${a.fuoriLista?`<span title="Non compare nell'ultima lista arrivi importata: la prenotazione potrebbe essere stata cancellata o il nome corretto. Non elimino nulla da solo." style="font-size:9px;font-weight:700;color:var(--amber);">non più in lista</span>`:''}
            ${(()=>{const nc=(a.camere||[]).length;if(nc<2)return'';
              return`<span title="Prenotazione multicamera: ${a.camere.join(', ')} — un solo messaggio, l'email è la stessa" style="padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;border:1px solid var(--amber);color:var(--amber);background:#fff;white-space:nowrap;">${nc} camere</span>`;})()}
            ${(()=>{const n=_psCanaleNome(a);if(!n)return'';const col=_psCanaleCol(a)||'var(--text-dim)';
              return`<span title="Provenienza della prenotazione, dal PMS" style="padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;border:1px solid ${col};color:${col};background:#fff;white-space:nowrap;">${n}</span>`;})()}
            <select onchange="prestaySetScheda('${a.id}','lang',this.value)" title="Lingua del messaggio" style="${inpS}width:auto;min-width:52px;margin-left:auto;padding:3px 6px;">
              <option value="it" ${(a.lang||'it')==='it'?'selected':''}>IT</option>
              <option value="en" ${a.lang==='en'?'selected':''}>EN</option>
            </select>
            <button onclick="prestayDelScheda('${a.id}')" title="Elimina questo arrivo" style="background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:13px;line-height:1;padding:0 2px;">✕</button>
          </div>
          <input value="${esc(a.nome)}" placeholder="Cognome Nome" onchange="prestaySetScheda('${a.id}','nome',this.value)" style="${inpS}font-weight:700;font-size:var(--fs-sm);margin-bottom:5px;">
          <input type="email" value="${esc(a.email)}" placeholder="email@…" oninput="_psAggiornaBordo('${a.id}',this.value)" onchange="prestaySetScheda('${a.id}','email',this.value)" title="${esc(a.email)}" style="${inpS}margin-bottom:5px;${_psBookingBloccato(a.email)?'border-color:var(--amber);':''}">
          ${_psBookingBloccato(a.email)?`<div style="font-size:9px;font-weight:700;color:var(--amber);line-height:1.35;margin:-2px 0 5px;" title="${esc(_psMittenteAttuale()?'Compass spedisce da '+_psMittenteAttuale()+', Booking accetta solo '+PRESTAY_BOOKING_MITTENTE:'Mittente mai verificato: Impostazioni → Verifica mittente')}">indirizzo Booking · non recapitabile con il mittente attuale</div>`:''}
          <input value="${esc(a.tel)}" placeholder="+39…" onchange="prestaySetScheda('${a.id}','tel',this.value)" style="${inpS}margin-bottom:9px;">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
            <button onclick="prestayAnteprima('${a.id}','both')" title="Vedi e correggi il messaggio prima di mandarlo" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);border-radius:7px;cursor:pointer;">${PS_ICON_EYE}</button>
            <button onclick="prestayAnteprima('${a.id}','mail')" ${inFlight?'disabled':''} title="Anteprima del messaggio prima di inviare" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;height:28px;border:1px solid var(--accent);background:${fatto?'var(--surface)':'var(--accent)'};color:${fatto?'var(--accent)':'#fff'};border-radius:7px;cursor:${inFlight?'wait':'pointer'};opacity:${inFlight?'.5':'1'};font-size:var(--fs-xxs);font-weight:700;">${inFlight?PS_ICON_LOAD:PS_ICON_MAIL}${fatto?'Rinvia':'Invia'}</button>
            <button onclick="prestayAnteprima('${a.id}','wa')" title="Anteprima, poi apre WhatsApp" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:1px solid #25D366;background:#e9faf0;color:#1a9f4f;border-radius:7px;cursor:pointer;">${PS_ICON_WA}</button>
            <span style="margin-left:auto;display:flex;gap:4px;">${chip(mailOk,a.mailTs,'mail','mail')}${chip(waOk,a.waTs,'wa','wa')}</span>
          </div>
          ${a.mailErr&&!mailOk?`<div style="margin-top:6px;font-size:9px;color:var(--red);line-height:1.35;">${String(a.mailErr).substring(0,80)}</div>`:''}
          <div style="position:relative;z-index:3;display:flex;justify-content:flex-end;margin-top:8px;">
            <label title="Arrivo di gruppo Italcamel: nessun contatto dell'ospite, la scheda si spegne" style="display:inline-flex;align-items:center;gap:6px;font-size:var(--fs-xxs);font-weight:700;color:${ital?'var(--text)':'var(--text-dim)'};cursor:pointer;user-select:none;">
              <input type="checkbox" ${ital?'checked':''} onchange="prestayToggleItalcamel('${a.id}')" style="width:15px;height:15px;margin:0;cursor:pointer;accent-color:var(--accent);">Italcamel
            </label>
          </div>
          ${(()=>{const rp=_psRisposta(iso,a.email);if(!rp)return'';
            const testo=String(rp.testo||'');
            const testoEsc=testo.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            const rid='psRisp_'+String(a.id).replace(/[^a-zA-Z0-9_]/g,'');
            const lungo=testo.length>200||testo.split('\n').length>4;
            return`<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--accent-bg);border-left:3px solid var(--accent);">
              <div style="font-size:var(--fs-xxs);font-weight:700;color:var(--accent);margin-bottom:4px;">Ha risposto${rp.data?' · '+String(rp.data).replace(/\s*\+\d{4}.*$/,'').trim():''}</div>
              <div id="${rid}" style="font-size:var(--fs-xs);color:var(--text);line-height:1.5;white-space:pre-wrap;word-break:break-word;${lungo?'max-height:4.5em;overflow:hidden;':''}">${testoEsc}</div>
              ${lungo?`<div style="text-align:right;margin-top:2px;"><button type="button" onclick="_psRispToggle('${rid}',this)" style="border:none;background:none;color:var(--accent);font-size:var(--fs-xxs);font-weight:700;cursor:pointer;padding:2px 0;">Mostra tutto ▾</button></div>`:''}
            </div>`;})()}
        </div>`;
      });
      h+=`</div></div>`;
    });
    h+=`<div style="margin-top:8px;font-size:var(--fs-xxs);color:var(--text-dim);line-height:1.55;">Il numero di arrivi per struttura viene dal Piano Settimanale (i cambi contano: partenza e arrivo lo stesso giorno significa comunque un ospite nuovo). Gli ospiti <strong>non sono legati alla camera</strong>: se la reception li sposta di stanza qui non cambia nulla. Nome e contatti vanno letti dal PMS. I pulsanti aprono il messaggio già compilato: l'invio lo confermi tu, e la spunta si può correggere cliccandola.</div>`;
  }

  // Configurazione invio diretto — chiave salvata solo in questo browser
  if(_prestayMailCfgOpen){
    const escv=v=>String(v||'').replace(/"/g,'&quot;');
    h+=`<div class="panel" style="margin-top:16px;">
      <div class="panel-header"><span class="panel-title">Invio mail diretto</span><span style="font-size:var(--fs-xxs);color:${_psMailPronto()?'var(--green)':'var(--text-dim)'};font-weight:700;">${_psMailPronto()?'attivo su questo browser':'non configurato'}</span></div>
      <div class="panel-body" style="padding:14px;">
        <div style="font-size:var(--fs-xs);color:var(--text-muted);line-height:1.6;margin-bottom:12px;">
          Senza configurazione il pulsante mail apre il client di posta. Configurandolo, la mail parte davvero con un clic.
          <strong style="color:var(--text);">Endpoint e chiave restano solo in questo browser</strong> — non vengono sincronizzati sugli altri PC né salvati sul cloud, quindi vanno reinseriti su ogni postazione da cui vuoi spedire.
          Il codice del Worker e i passaggi su Cloudflare e DNS sono in <code style="background:var(--surface2);padding:1px 5px;border-radius:4px;">worker-prestay-mail.md</code> nel repository.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="display:block;font-size:var(--fs-xxs);font-weight:700;color:var(--text-dim);margin-bottom:4px;">ENDPOINT</label>
            <input value="${escv(_psMailCfg.endpoint)}" placeholder="https://…workers.dev/prestay/send" onchange="prestaySetMailCfg('endpoint',this.value)" style="width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font-size:var(--fs-xs);font-family:inherit;">
          </div>
          <div>
            <label style="display:block;font-size:var(--fs-xxs);font-weight:700;color:var(--text-dim);margin-bottom:4px;">CHIAVE (PRESTAY_KEY)</label>
            <input type="password" value="${escv(_psMailCfg.key)}" placeholder="la password scelta sul Worker" onchange="prestaySetMailCfg('key',this.value)" style="width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font-size:var(--fs-xs);font-family:inherit;">
          </div>
        </div>
        ${_psMittRiquadro()}
      </div>
    </div>`;
  }

  // Editor testi — un template per struttura e lingua, con segnaposto
  if(_prestayTplOpen){
    const hotels=Object.keys(PRESTAY_HOTELS);
    h+=`<div class="panel" id="psTplPanel" style="margin-top:16px;">
      <div class="panel-header"><span class="panel-title">Testi pre-stay</span><span style="font-size:var(--fs-xxs);color:var(--text-dim);">segnaposto: {nome} {struttura} {data}</span></div>
      <div class="panel-body" style="padding:14px;">
        <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-bottom:12px;line-height:1.55;">Un testo per struttura e lingua. I segnaposto vengono sostituiti al momento dell'invio, quindi modificando un testo cambiano subito anche i messaggi non ancora inviati. L'oggetto vale solo per la mail; WhatsApp usa il solo corpo. Nel corpo puoi usare <code style="background:var(--surface2);padding:0 4px;border-radius:3px;">*grassetto*</code>, <code style="background:var(--surface2);padding:0 4px;border-radius:3px;">_corsivo_</code> e righe che iniziano con "- " per un elenco puntato.</div>
        ${hotels.map(hc=>{
          const conf=PRESTAY_HOTELS[hc];
          return`<div style="margin-bottom:14px;border:1px solid var(--border-light);border-radius:9px;overflow:hidden;">
            <div style="background:var(--bg);padding:7px 12px;font-size:var(--fs-xs);font-weight:700;color:var(--text);">${conf.name}</div>
            <div style="padding:10px 12px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              ${['it','en'].map(lg=>{
                const t=_psTpl(hc,lg);
                const taId='ps-tpl-'+hc+'-'+lg;
                return`<div>
                  <div style="font-size:var(--fs-xxs);font-weight:700;color:var(--text-dim);margin-bottom:4px;">${lg.toUpperCase()}</div>
                  <input value="${String(t.ogg||'').replace(/"/g,'&quot;')}" placeholder="Oggetto" onchange="prestaySetTpl('${hc}','${lg}','ogg',this.value)" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);font-size:var(--fs-xs);font-family:'Helvetica Neue',Arial,sans-serif;margin-bottom:5px;">
                  ${psToolbar(taId)}
                  <textarea id="${taId}" rows="7" placeholder="Corpo del messaggio" onchange="prestaySetTpl('${hc}','${lg}','corpo',this.value)" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);font-size:var(--fs-xs);font-family:'Helvetica Neue',Arial,sans-serif;line-height:1.5;resize:vertical;">${String(t.corpo||'')}</textarea>
                </div>`;
              }).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  el.innerHTML=h;
}
// §§ RECEPTION — CASSA (fondo cassa, incasso contante)
// Sola lettura + modifica libera per il QM. I receptionist operano sull'app dedicata
// (reception.html, aperta sui PC di reception): qui si legge lo stesso KV per avere il
// quadro completo e poter correggere qualunque voce, con storico delle correzioni mai
// perso (m.edits), mai sovrascrittura silenziosa.
let _receptionFondo=[],_receptionIncasso=[];
const RECEPTION_FONDO_TARGET=100;
async function receptionLoad(){
  const el=document.getElementById('reception-content');if(!el)return;
  el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Caricamento…</div>';
  async function fetchKey(key){
    try{
      const r=await fetch(PROXY+'/kv/get?key='+encodeURIComponent(key),{cache:'no-store'});
      if(r.ok){const j=await r.json();if(j&&j.value)return JSON.parse(j.value);}
    }catch(e){}
    try{const s=localStorage.getItem(key);if(s)return JSON.parse(s);}catch(e){}
    return[];
  }
  [_receptionFondo,_receptionIncasso]=await Promise.all([fetchKey('qm_cassa_fondo'),fetchKey('qm_cassa_incasso')]);
  receptionRender();
}
function _receptionSave(key,list){
  try{localStorage.setItem(key,JSON.stringify(list));}catch(e){}
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,value:JSON.stringify(list)})}).catch(()=>{});
}
// Il saldo riparte dall'ULTIMO conteggio fisico, non sempre dai 100 ideali: se alla
// consegna si contano 98€ senza una spiegazione, quella resta comunque la base reale su
// cui contare i buoni successivi — altrimenti il saldo calcolato diverge subito dalla
// cassa vera. Stessa formula di reception.html (fondoSaldo()): tenerle allineate.
function _receptionFondoSaldo(){
  const sorted=[..._receptionFondo].sort((a,b)=>a.ts-b.ts);
  let base=RECEPTION_FONDO_TARGET,baseTs=-Infinity;
  sorted.forEach(m=>{if(m.tipo==='conteggio'){base=m.importo;baseTs=m.ts;}});
  let s=base;
  sorted.forEach(m=>{
    if(m.ts<=baseTs)return;
    if(m.tipo==='buono')s-=m.importo;
    if(m.tipo==='ripristino')s+=m.importo;
  });
  return s;
}
// Il fondo è contanti + buoni spesa in essere (non ancora ripristinati): un buono è un
// cambio di forma del denaro, non una perdita, quindi il totale non deve scendere solo
// perché è stato emesso un buono. Stessa formula di reception.html (fondoBreakdown()).
function _receptionFondoBreakdown(){
  const contanti=_receptionFondoSaldo();
  const sorted=[..._receptionFondo].sort((a,b)=>a.ts-b.ts);
  let baseTs=-Infinity,buoni=0;
  sorted.forEach(m=>{if(m.tipo==='conteggio'){baseTs=m.ts;buoni=m.buoniSpesa||0;}});
  sorted.forEach(m=>{
    if(m.ts<=baseTs)return;
    if(m.tipo==='buono')buoni+=m.importo;
    if(m.tipo==='ripristino')buoni-=m.importo;
  });
  return{contanti,buoni,saldo:contanti+buoni};
}
function _receptionFmtTs(ts){const d=new Date(ts);return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'})+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function _receptionFmtEuro(n){return(n<0?'-':'')+'€ '+Math.abs(n).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});}
const RECEPTION_TIPO_LBL={conteggio:'Conteggio',buono:'Buono spesa',ripristino:'Ripristino'};
// Badge Tipo nello storico — stesse icone dei bottoni azione di reception.html, niente più emoji.
const RECEPTION_ICON_CONTEGGIO='<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M13.5 3.5C9 3.5 5.3 6.7 4.3 11H2v2h2c0 .3 0 .7.1 1H2v2h2.6c1.2 4 4.8 6.5 9 6.5 1.9 0 3.7-.6 5.1-1.6l-1.3-1.7c-1.1.7-2.4 1.1-3.8 1.1-3 0-5.5-1.7-6.6-4.3h6.4v-2H6.5a7 7 0 0 1 0-1H15v-2H6.7c1.1-2.6 3.6-4.4 6.6-4.4 1.4 0 2.7.4 3.8 1.1l1.3-1.7c-1.4-1-3.2-1.6-5-1.6z"/></svg>';
const RECEPTION_ICON_BUONO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>';
const RECEPTION_ICON_RIPRISTINO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>';
const RECEPTION_TIPO_ICON={conteggio:RECEPTION_ICON_CONTEGGIO,buono:RECEPTION_ICON_BUONO,ripristino:RECEPTION_ICON_RIPRISTINO};
function _receptionTipoCell(tipo){
  const icon=RECEPTION_TIPO_ICON[tipo]||'';
  const lbl=RECEPTION_TIPO_LBL[tipo]||tipo;
  return `<div style="display:flex;align-items:center;gap:8px;"><span style="width:22px;height:22px;border-radius:50%;background:var(--accent);color:#fff;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${icon}</span>${lbl}</div>`;
}
// Icone azione riga storico — stessi glifi di reception.html, colori Compass (--accent/--accent-bg)
// invece dei link testuali che si accatastavano su più righe in colonne strette.
const RECEPTION_ICON_STAMPA='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1"/><path d="M6 17v4h12v-4"/></svg>';
const RECEPTION_ICON_SPOSTA='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M7 7h12M15 3l4 4-4 4"/><path d="M17 17H5M9 21l-4-4 4-4"/></svg>';
const RECEPTION_ICON_CORREGGI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>';
const RECEPTION_ICON_CANCELLA='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/><path d="M10 11v6M14 11v6"/></svg>';
// Elimina un movimento (fondo o incasso): rimozione definitiva, non un edits[] — riservata
// a correggere voci sbagliate per errore. Stessa logica di cancellaMovimento() in reception.html.
async function receptionDeleteFondo(id){
  const idx=_receptionFondo.findIndex(x=>x.id===id);
  if(idx===-1)return;
  if(!await cqConferma('Eliminare questo movimento?','Non sarà più recuperabile.',{ok:'Elimina'}))return;
  _receptionFondo.splice(idx,1);
  _receptionSave('qm_cassa_fondo',_receptionFondo);
  receptionRender();
}
async function receptionDeleteIncasso(id){
  const idx=_receptionIncasso.findIndex(x=>x.id===id);
  if(idx===-1)return;
  if(!await cqConferma('Eliminare questo movimento?','Non sarà più recuperabile.',{ok:'Elimina'}))return;
  _receptionIncasso.splice(idx,1);
  _receptionSave('qm_cassa_incasso',_receptionIncasso);
  receptionRender();
}
function _receptionActBtn(icon,tip,onclick){
  return `<button onclick="${onclick}" class="rc-act-btn" data-tip="${tip}">${icon}</button>`;
}
function receptionEditFondo(id){
  const m=_receptionFondo.find(x=>x.id===id);if(!m)return;
  const nuovo=prompt('Nuovo importo per "'+(RECEPTION_TIPO_LBL[m.tipo]||m.tipo)+'" del '+_receptionFmtTs(m.ts)+' (attuale: '+m.importo+'):',m.importo);
  if(nuovo===null)return;
  const val=parseFloat(nuovo);if(isNaN(val))return;
  const motivo=prompt('Motivo della correzione:','');
  if(!motivo)return;
  m.edits=m.edits||[];
  m.edits.push({ts:Date.now(),persona:'Quality Manager',campo:'importo',vecchio:m.importo,nuovo:val,motivo});
  m.importo=val;
  _receptionSave('qm_cassa_fondo',_receptionFondo);
  receptionRender();
}
// L'amministrazione riporta il fondo a 100 — unica azione che tipicamente non passa
// dall'app di reception (loro contano e prelevano, non ripristinano), quindi resta
// disponibile qui su Compass.
function receptionAddRipristino(){
  const importo=prompt("Importo ripristinato dall'amministrazione (€):",'');
  if(importo===null)return;
  const val=parseFloat(importo);if(isNaN(val)||val<=0)return;
  const nota=prompt('Nota (opzionale):','')||'';
  _receptionFondo.push({id:Date.now()+'_'+Math.random().toString(36).slice(2,8),ts:Date.now(),tipo:'ripristino',importo:val,persona:'Amministrazione',nota,edits:[]});
  _receptionSave('qm_cassa_fondo',_receptionFondo);
  receptionRender();
}
// Stampa A4 del buono spesa — stesso template semplice bianco/nero di reception.html
// (poco toner, va all'amministrazione): "Riceve" resta sempre in bianco perché l'app
// non cattura chi riceve materialmente il denaro, solo chi lo preleva.
function _receptionBuonoPrintHTML(m){
  const d=new Date(m.ts);
  const dataStr=d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'})+' · ore '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const importoIncasso=m.importoIncasso||0;
  const totale=(m.importo||0)+importoIncasso;
  const fonteNote=importoIncasso>0
    ?`<div style="font-size:8.5pt;color:var(--dim);margin-top:4px;">di cui da fondo cassa ${_receptionFmtEuro(m.importo||0)} · da incasso giornaliero ${_receptionFmtEuro(importoIncasso)}</div>`
    :'';
  return`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Buono Spesa</title>
<style>
:root{--text:#111;--dim:#555;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:var(--text);font-size:11pt;}
@page{size:A4;margin:22mm;}
.doc-hdr{border-bottom:1.5px solid #111;padding-bottom:14px;margin-bottom:26px;display:flex;justify-content:space-between;align-items:baseline;}
.doc-hotel{font-size:12pt;font-weight:700;}
.doc-title{font-size:15pt;font-weight:700;letter-spacing:.02em;text-align:right;}
.doc-num{font-size:9pt;color:var(--dim);margin-top:2px;}
.amount-row{display:flex;align-items:baseline;gap:10px;margin:8px 0 24px;padding-bottom:10px;border-bottom:1px solid #999;}
.amount-lbl{font-size:8.5pt;text-transform:uppercase;letter-spacing:.04em;color:var(--dim);}
.amount-val{font-size:20pt;font-weight:700;margin-left:auto;}
.f{margin-bottom:16px;}
.f-lbl{font-size:8.5pt;text-transform:uppercase;letter-spacing:.04em;color:var(--dim);margin-bottom:4px;}
.f-val{font-size:12pt;border-bottom:1px solid #999;padding-bottom:5px;min-height:18px;}
.f-val.blank{color:#bbb;font-size:10pt;font-style:italic;}
.row{display:flex;gap:30px;margin-bottom:26px;}
.row .f{flex:1;margin-bottom:0;}
.motiv-lbl{font-size:8.5pt;text-transform:uppercase;letter-spacing:.04em;color:var(--dim);margin-bottom:5px;}
.motiv-val{font-size:11.5pt;line-height:1.7;border-bottom:1px solid #999;padding-bottom:6px;min-height:40px;margin-bottom:60px;}
.sign-row{display:flex;gap:40px;padding-top:10px;}
.sign-col{flex:1;}
.sign-role{font-size:8.5pt;text-transform:uppercase;letter-spacing:.04em;color:var(--dim);margin-bottom:40px;}
.sign-line{border-bottom:1px solid #111;}
.sign-caption{font-size:8pt;color:var(--dim);margin-top:5px;}
</style></head><body>
  <div class="doc-hdr">
    <div><div class="doc-hotel">SoulArt Hotel</div><div class="doc-num">Fondo Cassa — Reception</div></div>
    <div><div class="doc-title">Buono Spesa</div><div class="doc-num">${dataStr}</div></div>
  </div>
  <div class="amount-row"><span class="amount-lbl">Importo prelevato</span><span class="amount-val">${_receptionFmtEuro(totale)}</span></div>
  ${fonteNote}
  <div class="row">
    <div class="f"><div class="f-lbl">Consegna (amministrativo)</div><div class="f-val">${esc(m.persona)||'&nbsp;'}</div></div>
    <div class="f"><div class="f-lbl">Riceve</div><div class="f-val blank">&nbsp;</div></div>
  </div>
  <div class="motiv-lbl">Motivazione dell'uscita di cassa</div>
  <div class="motiv-val">${esc(m.motivazione)}</div>
  <div class="sign-row">
    <div class="sign-col"><div class="sign-role">Firma amministrativo che consegna</div><div class="sign-line"></div><div class="sign-caption">${esc(m.persona)}</div></div>
    <div class="sign-col"><div class="sign-role">Firma di chi riceve</div><div class="sign-line"></div><div class="sign-caption">&nbsp;</div></div>
  </div>
</body></html>`;
}
function receptionPrintBuono(id){
  const m=_receptionFondo.find(x=>x.id===id);
  if(!m){cqAvviso('Movimento non trovato.');return;}
  const w=window.open('','_blank');
  if(!w){cqAvviso('Abilita i popup per stampare.');return;}
  w.document.write(_receptionBuonoPrintHTML(m));w.document.close();
  setTimeout(()=>w.print(),400);
}
// Sposta (in tutto o in parte) la quota di un buono già registrato dal fondo cassa
// all'incasso giornaliero — riclassifica una spesa già fatta come pagata dall'incasso
// invece che dal fondo, "ripristinando" il fondo senza un vero ripristino amministrativo.
// Stessa logica di spostaBuonoAIncasso() in reception.html.
function receptionSpostaBuonoIncasso(id){
  const m=_receptionFondo.find(x=>x.id===id);
  if(!m||m.tipo!=='buono')return;
  const max=m.importo||0;
  if(max<=0){cqAvviso("Questo buono è già interamente a carico dell'incasso giornaliero.");return;}
  const valStr=prompt('Quanto spostare dal fondo cassa all\'incasso giornaliero? (max '+_receptionFmtEuro(max)+')',max.toFixed(2));
  if(valStr===null)return;
  const val=parseFloat(valStr);
  if(isNaN(val)||val<=0||val>max){cqAvviso('Importo non valido.');return;}
  const motivo=prompt('Motivo dello spostamento (opzionale):','')||'';
  const vecchioFondo=m.importo,vecchioIncasso=m.importoIncasso||0;
  m.importo=Math.round((vecchioFondo-val)*100)/100;
  m.importoIncasso=Math.round((vecchioIncasso+val)*100)/100;
  m.edits=m.edits||[];
  m.edits.push({ts:Date.now(),persona:'Quality Manager',campo:'importo/importoIncasso',vecchio:`fondo ${_receptionFmtEuro(vecchioFondo)} · incasso ${_receptionFmtEuro(vecchioIncasso)}`,nuovo:`fondo ${_receptionFmtEuro(m.importo)} · incasso ${_receptionFmtEuro(m.importoIncasso)}`,motivo:`Spostato ${_receptionFmtEuro(val)} dal fondo cassa all'incasso giornaliero${motivo?' — '+motivo:''}`});
  _receptionSave('qm_cassa_fondo',_receptionFondo);
  receptionRender();
}
function receptionEditIncasso(id){
  const m=_receptionIncasso.find(x=>x.id===id);if(!m)return;
  const nuovo=prompt('Nuovo importo per la consegna delle '+(m.fascia||'')+':00 del '+_receptionFmtTs(m.ts)+' (attuale: '+m.importo+'):',m.importo);
  if(nuovo===null)return;
  const val=parseFloat(nuovo);if(isNaN(val))return;
  const motivo=prompt('Motivo della correzione:','');
  if(!motivo)return;
  m.edits=m.edits||[];
  m.edits.push({ts:Date.now(),persona:'Quality Manager',campo:'importo',vecchio:m.importo,nuovo:val,motivo});
  m.importo=val;
  _receptionSave('qm_cassa_incasso',_receptionIncasso);
  receptionRender();
}
function receptionRender(){
  const el=document.getElementById('reception-content');if(!el)return;
  const bd=_receptionFondoBreakdown();
  const saldo=bd.saldo;
  const saldoOk=saldo>=RECEPTION_FONDO_TARGET;
  const fondoRows=[..._receptionFondo].sort((a,b)=>b.ts-a.ts).slice(0,80);
  const incassoRows=[..._receptionIncasso].sort((a,b)=>b.ts-a.ts).slice(0,80);
  const fasciaLbl={'07':'07:00','15':'15:00','23':'23:00'};
  // Vere kpi-card di Compass (stesse classi .kpi-card/.kpi-card-icon/.kpi-label/.kpi-value
  // di style.css, usate in Overview) invece di un pannello inventato per questa vista:
  // Contanti e buoni alla pari, nessuno dei due "il" numero principale — scrivere solo
  // il totale era fuorviante, sembrava la cifra fisica in cassa quando invece include
  // i buoni non ancora rimborsati. Stessa logica di reception.html.
  let h=`<div class="reception-kpi-grid" style="margin-bottom:20px;align-items:stretch;max-width:640px;">
    <div class="kpi-card blue">
      <div class="kpi-card-icon"><svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M13.5 3.5C9 3.5 5.3 6.7 4.3 11H2v2h2c0 .3 0 .7.1 1H2v2h2.6c1.2 4 4.8 6.5 9 6.5 1.9 0 3.7-.6 5.1-1.6l-1.3-1.7c-1.1.7-2.4 1.1-3.8 1.1-3 0-5.5-1.7-6.6-4.3h6.4v-2H6.5a7 7 0 0 1 0-1H15v-2H6.7c1.1-2.6 3.6-4.4 6.6-4.4 1.4 0 2.7.4 3.8 1.1l1.3-1.7c-1.4-1-3.2-1.6-5-1.6z"/></svg></div>
      <div class="kpi-label">Contanti</div>
      <div class="kpi-value">${_receptionFmtEuro(bd.contanti)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-card-icon" style="background:var(--gold-bg);color:var(--gold);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h3"/></svg></div>
      <div class="kpi-label">Buoni spesa</div>
      <div class="kpi-value">${_receptionFmtEuro(bd.buoni)}</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border-light);border-radius:8px;padding:16px 22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-width:150px;">
      <div style="font-size:var(--fs-xxs);color:var(--text-dim);letter-spacing:.06em;text-transform:uppercase;">Totale</div>
      <div style="font-size:22px;font-weight:600;color:var(--accent);font-variant-numeric:tabular-nums;">${_receptionFmtEuro(saldo)}</div>
      <span style="font-size:var(--fs-xxs);font-weight:700;padding:4px 11px;border-radius:20px;background:${saldoOk?'var(--green-bg)':'var(--amber-bg)'};color:${saldoOk?'var(--green)':'var(--amber)'};">${saldoOk?'✓ in regola':'mancano '+_receptionFmtEuro(RECEPTION_FONDO_TARGET-saldo)}</span>
    </div>
  </div>
  <button onclick="receptionAddRipristino()" style="margin-bottom:20px;background:var(--accent);color:#fff;border:none;border-radius:7px;padding:8px 16px;font-size:var(--fs-xxs);font-weight:700;cursor:pointer;">🔄 Registra ripristino</button>`;

  h+=`<div style="font-size:var(--fs-sm);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin:8px 0 10px;">Fondo Cassa — storico movimenti</div>`;
  h+=`<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:var(--fs-xs);">
    <thead><tr style="background:var(--surface2);"><th style="text-align:left;padding:8px 10px;">Data/ora</th><th style="text-align:left;padding:8px 10px;">Tipo</th><th style="text-align:right;padding:8px 10px;">Importo</th><th style="text-align:left;padding:8px 10px;">Persona</th><th style="text-align:left;padding:8px 10px;">Motivazione</th><th></th></tr></thead>
    <tbody>${fondoRows.length?fondoRows.map(m=>{
      const sign=m.tipo==='buono'?'-':(m.tipo==='ripristino'?'+':'');
      const editedTag=m.edits&&m.edits.length?` <span style="font-size:10px;color:var(--text-dim);font-style:italic;">(corretto ${m.edits.length}×)</span>`:'';
      // Differenza del conteggio vs il saldo atteso — visibile anche senza spiegazione,
      // non deve sparire nel nuovo saldo (vedi _receptionFondoSaldo).
      const diffTag=(m.tipo==='conteggio'&&m.differenza)
        ?` <span style="font-size:10px;font-weight:700;color:${m.differenza<0?'var(--red)':'var(--green)'};">(${m.differenza>0?'+':''}${_receptionFmtEuro(m.differenza)} vs atteso ${_receptionFmtEuro(m.atteso)})</span>`
        :'';
      const isBuono=m.tipo==='buono';
      const importoIncasso=m.importoIncasso||0;
      const amountCell=isBuono&&m.importo<=0?'—':sign+_receptionFmtEuro(m.importo)+editedTag+diffTag;
      const incassoNote=isBuono&&importoIncasso>0?` <span style="font-size:10px;color:var(--text-dim);">(+ ${_receptionFmtEuro(importoIncasso)} da incasso)</span>`:'';
      const spostaLink=isBuono&&m.importo>0?_receptionActBtn(RECEPTION_ICON_SPOSTA,'Sposta a incasso',`receptionSpostaBuonoIncasso('${m.id}')`):'';
      return`<tr style="border-bottom:1px solid var(--border-light);">
        <td style="padding:8px 10px;white-space:nowrap;">${_receptionFmtTs(m.ts)}</td>
        <td style="padding:8px 10px;">${_receptionTipoCell(m.tipo)}</td>
        <td style="padding:8px 10px;text-align:right;font-variant-numeric:tabular-nums;">${amountCell}${incassoNote}</td>
        <td style="padding:8px 10px;">${m.persona||'—'}</td>
        <td style="padding:8px 10px;color:var(--text-dim);">${(m.motivazione||m.nota||'').replace(/</g,'&lt;')}</td>
        <td style="padding:8px 10px;white-space:nowrap;">${isBuono?_receptionActBtn(RECEPTION_ICON_STAMPA,'Stampa',`receptionPrintBuono('${m.id}')`):''}${spostaLink}${_receptionActBtn(RECEPTION_ICON_CORREGGI,'Correggi',`receptionEditFondo('${m.id}')`)}${_receptionActBtn(RECEPTION_ICON_CANCELLA,'Elimina',`receptionDeleteFondo('${m.id}')`)}</td>
      </tr>`;
    }).join(''):'<tr><td colspan="6" style="padding:16px;text-align:center;color:var(--text-dim);font-style:italic;">Nessun movimento.</td></tr>'}</tbody>
  </table></div>`;

  const _tKey=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
  const buoniIncassoOggi=_receptionFondo.filter(m=>{
    if(m.tipo!=='buono'||!(m.importoIncasso>0))return false;
    const d=new Date(m.ts);
    return (d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))===_tKey;
  });
  if(buoniIncassoOggi.length){
    const totIncassoOggi=buoniIncassoOggi.reduce((s,m)=>s+m.importoIncasso,0);
    h+=`<div style="background:var(--surface2);border:1px solid var(--border-light);border-radius:10px;padding:12px 14px;margin:20px 0 10px;font-size:var(--fs-xs);">
      <b>Buoni spesa pagati oggi dall'incasso (${_receptionFmtEuro(totIncassoOggi)}):</b> ${buoniIncassoOggi.map(m=>_receptionFmtEuro(m.importoIncasso)+' — '+(m.motivazione||'').replace(/</g,'&lt;')).join(' · ')}
    </div>`;
  }
  h+=`<div style="font-size:var(--fs-sm);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin:26px 0 10px;">Incasso Contante — storico consegne</div>`;
  h+=`<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:var(--fs-xs);">
    <thead><tr style="background:var(--surface2);"><th style="text-align:left;padding:8px 10px;">Data/ora</th><th style="text-align:left;padding:8px 10px;">Fascia</th><th style="text-align:right;padding:8px 10px;">Importo</th><th style="text-align:left;padding:8px 10px;">Consegna</th><th style="text-align:left;padding:8px 10px;">Riceve</th><th style="text-align:left;padding:8px 10px;">Nota</th><th></th></tr></thead>
    <tbody>${incassoRows.length?incassoRows.map(m=>{
      const editedTag=m.edits&&m.edits.length?` <span style="font-size:10px;color:var(--text-dim);font-style:italic;">(corretto ${m.edits.length}×)</span>`:'';
      return`<tr style="border-bottom:1px solid var(--border-light);">
        <td style="padding:8px 10px;white-space:nowrap;">${_receptionFmtTs(m.ts)}</td>
        <td style="padding:8px 10px;">${fasciaLbl[m.fascia]||m.fascia}</td>
        <td style="padding:8px 10px;text-align:right;font-variant-numeric:tabular-nums;">${_receptionFmtEuro(m.importo)}${editedTag}</td>
        <td style="padding:8px 10px;">${m.consegnaDa||'—'}</td>
        <td style="padding:8px 10px;">${m.consegnaA||'—'}</td>
        <td style="padding:8px 10px;color:var(--text-dim);">${(m.nota||'').replace(/</g,'&lt;')}</td>
        <td style="padding:8px 10px;">${_receptionActBtn(RECEPTION_ICON_CORREGGI,'Correggi',`receptionEditIncasso('${m.id}')`)}${_receptionActBtn(RECEPTION_ICON_CANCELLA,'Elimina',`receptionDeleteIncasso('${m.id}')`)}</td>
      </tr>`;
    }).join(''):'<tr><td colspan="7" style="padding:16px;text-align:center;color:var(--text-dim);font-style:italic;">Nessuna consegna registrata.</td></tr>'}</tbody>
  </table></div>`;

  el.innerHTML=h;
}

// §§ RESI BIANCHERIA — Distinta reso biancheria inidonea (Fornitore Raimondo)
// Traccia digitale della distinta cartacea che le housekeeper compilano ogni giorno
// (data / tipologia / quantità / motivo / firma HK). Le HKP continuano a scrivere sul
// cartaceo — questa vista è solo per il QM, che trascrive qui i dati e da qui genera la
// distinta riepilogativa A4 da far firmare a Raimondo ogni 15 giorni.
// Le due strutture che fanno capo al QM: Art Resort resta fuori di proposito (fa capo al
// Sig. Maddaloni, non al QM, e la sua ditta di pulizie è esterna).
const RESI_KEY='qm_resi_biancheria';
const RESI_HOTELS={sa:'SoulArt Hotel',bh:'Boutique Hotel Piazza Carità'};
// Struttura selezionata nella vista. Righe/ritiri salvati prima di questa aggiunta non
// hanno il campo `hotel`: valgono come SoulArt (era l'unica struttura gestita), così i
// dati già inseriti restano dove sono invece di sparire dal filtro.
let _resiHotel='sa';
const _resiH=x=>x.hotel||'sa';
// Ogni quanti giorni va consegnato il sacco a Raimondo — oltre questa soglia la vista
// segnala che il periodo aperto è da chiudere.
const RESI_GIORNI_RITIRO=15;
// Tipologie e motivi predefiniti — modificabili dall'interfaccia (salvati nella stessa
// chiave KV), così i totali per tipologia restano coerenti invece di dipendere da come
// ognuno scrive la stessa cosa.
const RESI_TIPOLOGIE_DEFAULT=['Lenzuolo matrimoniale','Lenzuolo singolo','Federa','Copripiumino matrimoniale','Copripiumino singolo','Coprimaterasso','Asciugamano viso','Asciugamano corpo','Asciugamano bidet','Tappetino bagno','Accappatoio','Tovaglia','Tovagliolo'];
const RESI_MOTIVI=['Macchiata','Strappata','Usurata','Ingiallita','Bruciata','Scolorita','Altro'];
let _resi={righe:[],ritiri:[],tipologie:null};

function _resiUid(){return Date.now()+'_'+Math.random().toString(36).slice(2,8);}
function _resiTipologie(){return (_resi.tipologie&&_resi.tipologie.length)?_resi.tipologie:RESI_TIPOLOGIE_DEFAULT;}
function _resiFmtData(d){const x=d instanceof Date?d:new Date(d);return String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0')+'/'+x.getFullYear();}
// dd/MM/yyyy -> Date, per ordinare e trovare il periodo (min/max) di un gruppo di righe
function _resiParseData(s){const m=String(s||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?new Date(+m[3],+m[2]-1,+m[1]):null;}

async function resiLoad(){
  const el=document.getElementById('resi-content');if(!el)return;
  el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Caricamento…</div>';
  let data=null;
  try{
    const r=await fetch(PROXY+'/kv/get?key='+encodeURIComponent(RESI_KEY),{cache:'no-store'});
    if(r.ok){const j=await r.json();if(j&&j.value)data=JSON.parse(j.value);}
  }catch(e){}
  if(!data){try{const s=localStorage.getItem(RESI_KEY);if(s)data=JSON.parse(s);}catch(e){}}
  _resi=Object.assign({righe:[],ritiri:[],tipologie:null},data||{});
  resiRender();
}
function _resiSave(){
  const json=JSON.stringify(_resi);
  try{localStorage.setItem(RESI_KEY,json);}catch(e){}
  kvSet(RESI_KEY,json).catch(()=>{});
}

// Righe non ancora consegnate a Raimondo = periodo aperto in corso. Registrando un
// ritiro vengono "chiuse" (ritiroId valorizzato) e non compaiono più nel periodo aperto.
// Sempre filtrate per struttura: i due sacchi sono distinti e vanno consegnati separati.
function _resiAperte(h){const hot=h||_resiHotel;return _resi.righe.filter(r=>!r.ritiroId&&_resiH(r)===hot);}
function _resiRitiri(h){const hot=h||_resiHotel;return _resi.ritiri.filter(r=>_resiH(r)===hot);}
function resiSetHotel(h){if(!RESI_HOTELS[h])return;_resiHotel=h;resiRender();}
// Da quanti giorni non si consegna: dall'ultimo ritiro della struttura, o — se non ce n'è
// mai stato uno — dal reso più vecchio ancora aperto. null quando non c'è nulla da
// consegnare (niente righe aperte = nessun sacco in attesa, nessun avviso da dare).
function _resiGiorniDaUltimoRitiro(h){
  const aperte=_resiAperte(h);
  if(!aperte.length)return null;
  const rit=_resiRitiri(h).map(r=>_resiParseData(r.dataRitiro)).filter(Boolean).sort((a,b)=>b-a);
  const date=aperte.map(r=>_resiParseData(r.data)).filter(Boolean).sort((a,b)=>a-b);
  const rif=rit.length?rit[0]:(date.length?date[0]:null);
  if(!rif)return null;
  const oggi=new Date();oggi.setHours(0,0,0,0);
  return Math.floor((oggi-rif)/86400000);
}

// Il form di inserimento è sempre visibile in cima alla vista: il bottone "+ Nuovo reso"
// nell'intestazione del pannello serve solo a portarci il focus quando si è più in basso
// nella pagina, non ad aprire/chiudere nulla.
function resiAddRow(){
  const f=document.getElementById('resi-form');
  if(!f)return;
  f.scrollIntoView({behavior:'smooth',block:'center'});
  const q=document.getElementById('resi-f-qta');
  if(q)setTimeout(()=>q.focus(),300);
}
function resiSubmit(){
  const data=(document.getElementById('resi-f-data')||{}).value||'';
  const tipologia=(document.getElementById('resi-f-tipologia')||{}).value||'';
  const qta=parseInt((document.getElementById('resi-f-qta')||{}).value,10);
  const motivo=(document.getElementById('resi-f-motivo')||{}).value||'';
  const hk=((document.getElementById('resi-f-hk')||{}).value||'').trim();
  if(!data){cqAvviso('Inserisci la data.');return;}
  if(!tipologia){cqAvviso('Seleziona la tipologia del pezzo.');return;}
  if(isNaN(qta)||qta<=0){cqAvviso('Inserisci una quantità valida.');return;}
  // input type=date restituisce yyyy-MM-dd: si normalizza a dd/MM/yyyy come nel cartaceo
  const iso=data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dataIt=iso?`${iso[3]}/${iso[2]}/${iso[1]}`:data;
  _resi.righe.push({id:_resiUid(),ts:Date.now(),hotel:_resiHotel,data:dataIt,tipologia,qta,motivo,hk,ritiroId:null,edits:[]});
  _resiSave();
  const q=document.getElementById('resi-f-qta');if(q)q.value='';
  resiRender();
}
async function resiDelRow(id){
  const i=_resi.righe.findIndex(r=>r.id===id);if(i<0)return;
  const r=_resi.righe[i];
  if(!await cqConferma('Eliminare questo reso?',`<strong>${r.tipologia} ×${r.qta}</strong><br>Reso del ${r.data}.`,{ok:'Elimina'}))return;
  _resi.righe.splice(i,1);
  _resiSave();resiRender();
}
// Correzione con storico, mai sovrascrittura silenziosa — stesso principio della cassa.
function resiEditQta(id){
  const r=_resi.righe.find(x=>x.id===id);if(!r)return;
  const v=prompt(`Nuova quantità per "${r.tipologia}" del ${r.data} (attuale: ${r.qta}):`,r.qta);
  if(v===null)return;
  const n=parseInt(v,10);if(isNaN(n)||n<=0){cqAvviso('Quantità non valida.');return;}
  const motivo=prompt('Motivo della correzione:','');
  if(!motivo)return;
  r.edits=r.edits||[];
  r.edits.push({ts:Date.now(),persona:'Quality Manager',campo:'qta',vecchio:r.qta,nuovo:n,motivo});
  r.qta=n;
  _resiSave();resiRender();
}
// Chiude il periodo aperto: tutte le righe non consegnate vengono associate al ritiro,
// con il periodo (dal/al) ricavato dalle date delle righe stesse.
function resiRegistraRitiro(){
  const aperte=_resiAperte();
  if(!aperte.length){cqAvviso('Nessun reso da consegnare in questo periodo.');return;}
  const totPezzi=aperte.reduce((s,r)=>s+r.qta,0);
  const sacchi=prompt(`Sacchi ritirati da Raimondo (totale pezzi: ${totPezzi}):`,'1');
  if(sacchi===null)return;
  const nSacchi=parseInt(sacchi,10);
  if(isNaN(nSacchi)||nSacchi<=0){cqAvviso('Numero sacchi non valido.');return;}
  const dataRitiro=prompt('Data del ritiro (gg/mm/aaaa):',_resiFmtData(new Date()));
  if(!dataRitiro)return;
  const date=aperte.map(r=>_resiParseData(r.data)).filter(Boolean).sort((a,b)=>a-b);
  const rit={id:_resiUid(),ts:Date.now(),hotel:_resiHotel,
    dal:date.length?_resiFmtData(date[0]):dataRitiro,
    al:date.length?_resiFmtData(date[date.length-1]):dataRitiro,
    sacchi:nSacchi,totPezzi,dataRitiro,firmato:false};
  _resi.ritiri.push(rit);
  aperte.forEach(r=>{r.ritiroId=rit.id;});
  _resiSave();resiRender();
}
// La distinta cartacea torna firmata da Raimondo: si spunta qui, così si vede subito
// quali periodi sono chiusi davvero e quali sono ancora in attesa della ricevuta.
function resiToggleFirmato(id){
  const r=_resi.ritiri.find(x=>x.id===id);if(!r)return;
  r.firmato=!r.firmato;
  _resiSave();resiRender();
}
async function resiDelRitiro(id){
  const i=_resi.ritiri.findIndex(x=>x.id===id);if(i<0)return;
  if(!await cqConferma('Annullare questo ritiro?','I resi torneranno nel periodo aperto, pronti per una nuova distinta.',{ok:'Annulla ritiro'}))return;
  _resi.righe.forEach(r=>{if(r.ritiroId===id)r.ritiroId=null;});
  _resi.ritiri.splice(i,1);
  _resiSave();resiRender();
}
function resiEditTipologie(){
  const cur=_resiTipologie().join('\n');
  const v=prompt('Tipologie di pezzo (una per riga):',cur);
  if(v===null)return;
  const list=v.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!list.length){cqAvviso('Serve almeno una tipologia.');return;}
  _resi.tipologie=list;
  _resiSave();resiRender();
}

function resiRender(){
  const el=document.getElementById('resi-content');if(!el)return;
  const aperte=_resiAperte().slice().sort((a,b)=>{
    const da=_resiParseData(a.data),db=_resiParseData(b.data);
    return (db?db.getTime():0)-(da?da.getTime():0)||b.ts-a.ts;
  });
  const totPezzi=aperte.reduce((s,r)=>s+r.qta,0);
  const oggiIso=new Date().toISOString().slice(0,10);
  const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Selettore struttura: i due sacchi sono distinti e si consegnano separatamente, quindi
  // periodo aperto, totali, avviso e distinta sono sempre di una struttura sola. Il badge
  // sulla linguetta non attiva segnala se anche lì c'è un periodo da chiudere, altrimenti
  // un ritardo sull'altra struttura resterebbe invisibile finché non ci si passa sopra.
  const tabs=Object.entries(RESI_HOTELS).map(([k,nome])=>{
    const att=k===_resiHotel;
    const gg=_resiGiorniDaUltimoRitiro(k);
    const late=gg!==null&&gg>=RESI_GIORNI_RITIRO;
    return`<button onclick="resiSetHotel('${k}')" style="padding:9px 18px;border:1px solid var(--border);border-bottom:none;border-radius:6px 6px 0 0;background:${att?'#fff':'var(--surface2)'};color:${att?'var(--accent)':'var(--text-dim)'};font-weight:600;font-size:var(--fs-xs);cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:7px;">
      ${esc(nome)}${!att&&late?`<span style="width:7px;height:7px;border-radius:50%;background:var(--amber);"></span>`:''}
    </button>`;
  }).join('');
  let h=`<div style="display:flex;gap:6px;border-bottom:1px solid var(--border);margin-bottom:18px;">${tabs}</div>`;

  // Avviso ritiro: il sacco va consegnato ogni 15 giorni. Compare solo se c'è davvero
  // qualcosa da consegnare (righe aperte) — senza resi in attesa non c'è nulla da
  // sollecitare, e un avviso perenne diventerebbe rumore da ignorare.
  const gg=_resiGiorniDaUltimoRitiro();
  if(gg!==null&&gg>=RESI_GIORNI_RITIRO){
    h+=`<div style="background:var(--amber-bg);border:1.5px solid var(--amber);border-radius:8px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:18px;">⚠️</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--fs-sm);font-weight:700;color:#7a3a00;">Sacco da consegnare a Raimondo — ${gg} giorni dall'ultimo ritiro</div>
        <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px;">${totPezzi} pezzi in attesa per ${esc(RESI_HOTELS[_resiHotel])}. Stampa la distinta e registra il ritiro quando passa.</div>
      </div>
    </div>`;
  }

  // Form di inserimento — sempre visibile, è l'azione principale di questa vista
  h+=`<div id="resi-form" style="background:var(--surface2);border:1px solid var(--border-light);border-radius:8px;padding:14px 16px;margin-bottom:18px;">
    <div style="font-size:var(--fs-xxs);font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">Nuovo reso — ${esc(RESI_HOTELS[_resiHotel])}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
      <div style="flex:0 0 140px;">
        <label style="display:block;font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:4px;">Data</label>
        <input type="date" id="resi-f-data" value="${oggiIso}" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:var(--fs-xs);font-family:inherit;background:#fff;color:var(--text);">
      </div>
      <div style="flex:1 1 200px;min-width:160px;">
        <label style="display:block;font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:4px;">Tipologia pezzo</label>
        <select id="resi-f-tipologia" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:var(--fs-xs);font-family:inherit;background:#fff;color:var(--text);">
          ${_resiTipologie().map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}
        </select>
      </div>
      <div style="flex:0 0 90px;">
        <label style="display:block;font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:4px;">Quantità</label>
        <input type="number" id="resi-f-qta" min="1" step="1" placeholder="0" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:var(--fs-xs);font-family:inherit;background:#fff;color:var(--text);">
      </div>
      <div style="flex:0 0 140px;">
        <label style="display:block;font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:4px;">Motivo reso</label>
        <select id="resi-f-motivo" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:var(--fs-xs);font-family:inherit;background:#fff;color:var(--text);">
          ${RESI_MOTIVI.map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join('')}
        </select>
      </div>
      <div style="flex:0 0 140px;">
        <label style="display:block;font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:4px;">Housekeeper</label>
        <input type="text" id="resi-f-hk" placeholder="chi ha firmato" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:var(--fs-xs);font-family:inherit;background:#fff;color:var(--text);">
      </div>
      <button onclick="resiSubmit()" style="background:var(--accent);color:#fff;border:none;padding:9px 18px;border-radius:6px;font-size:var(--fs-xs);font-weight:600;cursor:pointer;font-family:inherit;">Aggiungi</button>
    </div>
    <div style="margin-top:8px;"><span onclick="resiEditTipologie()" style="font-size:var(--fs-xxs);color:var(--accent);cursor:pointer;">Modifica elenco tipologie</span></div>
  </div>`;

  // Riepilogo del periodo aperto: totale + dettaglio per tipologia (è il numero che
  // finisce sulla distinta e che Raimondo controlla al ritiro)
  const perTip={};
  aperte.forEach(r=>{perTip[r.tipologia]=(perTip[r.tipologia]||0)+r.qta;});
  const tipRows=Object.entries(perTip).sort((a,b)=>b[1]-a[1]);
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;margin-bottom:18px;align-items:stretch;max-width:720px;">
    <div class="kpi-card blue">
      <div class="kpi-card-icon" style="background:var(--accent-bg);color:var(--accent);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/></svg></div>
      <div class="kpi-label">Pezzi da consegnare</div>
      <div class="kpi-value">${totPezzi}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-card-icon" style="background:var(--gold-bg);color:var(--gold);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h3"/></svg></div>
      <div class="kpi-label">Righe in distinta</div>
      <div class="kpi-value">${aperte.length}</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border-light);border-radius:8px;padding:16px 20px;display:flex;flex-direction:column;justify-content:center;gap:8px;min-width:180px;">
      <button onclick="resiPrintDistinta()" style="background:var(--accent);color:#fff;border:none;border-radius:7px;padding:9px 14px;font-size:var(--fs-xxs);font-weight:600;cursor:pointer;font-family:inherit;">🖨️ Stampa distinta A4</button>
      <button onclick="resiRegistraRitiro()" style="background:#fff;color:var(--accent);border:1.5px solid var(--border);border-radius:7px;padding:9px 14px;font-size:var(--fs-xxs);font-weight:600;cursor:pointer;font-family:inherit;">✓ Registra ritiro Raimondo</button>
    </div>
  </div>`;

  if(tipRows.length){
    h+=`<div style="font-size:var(--fs-sm);font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;">Totale per tipologia</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">${tipRows.map(([t,n])=>`<span style="background:var(--surface2);border:1px solid var(--border-light);border-radius:20px;padding:5px 13px;font-size:var(--fs-xs);color:var(--text);">${esc(t)} <b>${n}</b></span>`).join('')}</div>`;
  }

  // Elenco righe del periodo aperto
  h+=`<div style="font-size:var(--fs-sm);font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;">Periodo aperto — resi non ancora consegnati</div>`;
  h+=`<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:var(--fs-xs);">
    <thead><tr style="background:var(--surface2);">
      <th style="text-align:left;padding:8px 10px;">Data</th>
      <th style="text-align:left;padding:8px 10px;">Tipologia pezzo</th>
      <th style="text-align:right;padding:8px 10px;">Quantità</th>
      <th style="text-align:left;padding:8px 10px;">Motivo reso</th>
      <th style="text-align:left;padding:8px 10px;">Housekeeper</th>
      <th></th>
    </tr></thead>
    <tbody>${aperte.length?aperte.map(r=>{
      const editedTag=r.edits&&r.edits.length?` <span style="font-size:10px;color:var(--text-dim);font-style:italic;">(corretto ${r.edits.length}×)</span>`:'';
      return`<tr style="border-bottom:1px solid var(--border-light);">
        <td style="padding:8px 10px;white-space:nowrap;">${esc(r.data)}</td>
        <td style="padding:8px 10px;">${esc(r.tipologia)}</td>
        <td style="padding:8px 10px;text-align:right;font-variant-numeric:tabular-nums;">${r.qta}${editedTag}</td>
        <td style="padding:8px 10px;color:var(--text-dim);">${esc(r.motivo)}</td>
        <td style="padding:8px 10px;color:var(--text-dim);">${esc(r.hk)||'—'}</td>
        <td style="padding:8px 10px;white-space:nowrap;">${_receptionActBtn(RECEPTION_ICON_CORREGGI,'Correggi quantità',`resiEditQta('${r.id}')`)}${_receptionActBtn(RECEPTION_ICON_CANCELLA,'Elimina',`resiDelRow('${r.id}')`)}</td>
      </tr>`;
    }).join(''):'<tr><td colspan="6" style="padding:16px;text-align:center;color:var(--text-dim);font-style:italic;">Nessun reso registrato in questo periodo.</td></tr>'}</tbody>
  </table></div>`;

  // Storico ritiri già consegnati a Raimondo
  const ritiri=_resiRitiri().slice().sort((a,b)=>b.ts-a.ts);
  if(ritiri.length){
    h+=`<div style="font-size:var(--fs-sm);font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;margin:26px 0 10px;">Ritiri consegnati a Raimondo</div>`;
    h+=`<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:var(--fs-xs);">
      <thead><tr style="background:var(--surface2);">
        <th style="text-align:left;padding:8px 10px;">Periodo</th>
        <th style="text-align:left;padding:8px 10px;">Data ritiro</th>
        <th style="text-align:right;padding:8px 10px;">Sacchi</th>
        <th style="text-align:right;padding:8px 10px;">Pezzi</th>
        <th style="text-align:left;padding:8px 10px;">Ricevuta firmata</th>
        <th></th>
      </tr></thead>
      <tbody>${ritiri.map(rt=>`<tr style="border-bottom:1px solid var(--border-light);">
        <td style="padding:8px 10px;white-space:nowrap;">${esc(rt.dal)} → ${esc(rt.al)}</td>
        <td style="padding:8px 10px;white-space:nowrap;">${esc(rt.dataRitiro)}</td>
        <td style="padding:8px 10px;text-align:right;font-variant-numeric:tabular-nums;">${rt.sacchi}</td>
        <td style="padding:8px 10px;text-align:right;font-variant-numeric:tabular-nums;">${rt.totPezzi}</td>
        <td style="padding:8px 10px;"><span onclick="resiToggleFirmato('${rt.id}')" style="cursor:pointer;font-size:var(--fs-xxs);font-weight:600;padding:4px 11px;border-radius:20px;background:${rt.firmato?'var(--green-bg)':'var(--amber-bg)'};color:${rt.firmato?'var(--green)':'var(--amber)'};">${rt.firmato?'✓ firmata':'in attesa'}</span></td>
        <td style="padding:8px 10px;white-space:nowrap;">${_receptionActBtn(RECEPTION_ICON_STAMPA,'Ristampa distinta',`resiPrintDistinta('${rt.id}')`)}${_receptionActBtn(RECEPTION_ICON_CANCELLA,'Annulla ritiro',`resiDelRitiro('${rt.id}')`)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  el.innerHTML=h;
}

// Stampa A4 della distinta — stesso impianto del modulo cartaceo (intestazione struttura
// e periodo, tabella data/tipologia/quantità/motivo/firma HK, blocco ritiro con firma di
// Raimondo e blocco consegna al Sig. Presta). Senza id stampa il periodo aperto; con un
// ritiroId ristampa quel periodo già consegnato.
function resiPrintDistinta(ritiroId){
  const righe=ritiroId?_resi.righe.filter(r=>r.ritiroId===ritiroId):_resiAperte();
  if(!righe.length){cqAvviso('Nessun reso da stampare per questo periodo.');return;}
  const rit=ritiroId?_resi.ritiri.find(x=>x.id===ritiroId):null;
  // La struttura è quella del ritiro che si sta ristampando, non quella selezionata ora
  // nella vista: ristampando un vecchio periodo l'intestazione deve restare la sua.
  const hotelNome=RESI_HOTELS[rit?_resiH(rit):_resiHotel]||RESI_HOTELS.sa;
  const ord=righe.slice().sort((a,b)=>{
    const da=_resiParseData(a.data),db=_resiParseData(b.data);
    return (da?da.getTime():0)-(db?db.getTime():0);
  });
  const date=ord.map(r=>_resiParseData(r.data)).filter(Boolean);
  const dal=rit?rit.dal:(date.length?_resiFmtData(date[0]):'___/___/____');
  const al=rit?rit.al:(date.length?_resiFmtData(date[date.length-1]):'___/___/____');
  const totPezzi=ord.reduce((s,r)=>s+r.qta,0);
  const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const html=`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Distinta Reso Biancheria</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;font-size:10.5pt;}
@page{size:A4;margin:16mm;}
.hdr{border-bottom:1.5px solid #111;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:baseline;}
.title{font-size:14pt;font-weight:700;letter-spacing:.01em;}
.sub{font-size:9pt;color:#555;margin-top:2px;}
.meta{display:flex;gap:34px;margin-bottom:14px;font-size:10pt;}
.meta-lbl{font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:#555;}
.meta-val{font-weight:700;margin-top:2px;}
.warn{border:1px solid #999;padding:8px 10px;margin-bottom:14px;font-size:8.5pt;line-height:1.6;color:#333;}
table{width:100%;border-collapse:collapse;margin-bottom:16px;}
th{text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:#555;border-bottom:1.5px solid #111;padding:6px 6px;}
td{padding:7px 6px;border-bottom:1px solid #ccc;font-size:10pt;}
td.r{text-align:right;}
tfoot td{border-top:1.5px solid #111;border-bottom:none;font-weight:700;padding-top:8px;}
.blk{border:1px solid #999;padding:10px 12px;margin-bottom:12px;}
.blk-t{font-size:8.5pt;text-transform:uppercase;letter-spacing:.05em;font-weight:700;color:#333;margin-bottom:10px;}
.row{display:flex;gap:26px;margin-bottom:12px;}
.f{flex:1;}
.f-lbl{font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:#555;margin-bottom:3px;}
.f-val{font-size:11pt;border-bottom:1px solid #999;padding-bottom:4px;min-height:17px;}
.sign{border-bottom:1px solid #111;margin-top:34px;}
.sign-c{font-size:8pt;color:#555;margin-top:4px;}
</style></head><body>
  <div class="hdr">
    <div><div class="title">Distinta Reso Biancheria Inidonea</div><div class="sub">Fornitore Raimondo</div></div>
    <div style="text-align:right;"><div class="meta-lbl">Struttura</div><div class="meta-val">${esc(hotelNome)}</div></div>
  </div>
  <div class="meta">
    <div><div class="meta-lbl">Periodo dal</div><div class="meta-val">${esc(dal)}</div></div>
    <div><div class="meta-lbl">al</div><div class="meta-val">${esc(al)}</div></div>
    <div><div class="meta-lbl">Totale pezzi</div><div class="meta-val">${totPezzi}</div></div>
  </div>
  <div class="warn">
    • Mettere la biancheria macchiata / difettata in un sacco distinto, dedicato esclusivamente a Raimondo.<br>
    • NON conteggiarla come normale biancheria sporca nei dati giornalieri.<br>
    • A fine servizio, consegnare la lista al Sig. Presta.
  </div>
  <table>
    <thead><tr><th style="width:70px;">Data</th><th>Tipologia pezzo</th><th style="width:60px;text-align:right;">Quantità</th><th style="width:110px;">Motivo reso</th><th style="width:120px;">Firma HK</th></tr></thead>
    <tbody>${ord.map(r=>`<tr><td>${esc(r.data)}</td><td>${esc(r.tipologia)}</td><td class="r">${r.qta}</td><td>${esc(r.motivo)}</td><td>${esc(r.hk)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="2">Totale pezzi</td><td class="r">${totPezzi}</td><td colspan="2"></td></tr></tfoot>
  </table>
  <div class="blk">
    <div class="blk-t">Ritiro Fornitore Raimondo (ogni 15 giorni)</div>
    <div class="row">
      <div class="f"><div class="f-lbl">Sacchi ritirati n°</div><div class="f-val">${rit?esc(String(rit.sacchi)):'&nbsp;'}</div></div>
      <div class="f"><div class="f-lbl">Totale pezzi</div><div class="f-val">${totPezzi}</div></div>
      <div class="f"><div class="f-lbl">Data</div><div class="f-val">${rit?esc(rit.dataRitiro):'&nbsp;'}</div></div>
    </div>
    <div class="sign"></div>
    <div class="sign-c">Firma per ricevuta — Fornitore Raimondo</div>
  </div>
  <div class="blk">
    <div class="blk-t">Consegna distinta firmata</div>
    <div class="row">
      <div class="f"><div class="f-lbl">Consegnata a</div><div class="f-val">Sig. Presta</div></div>
      <div class="f"><div class="f-lbl">Data</div><div class="f-val">&nbsp;</div></div>
    </div>
    <div class="sign"></div>
    <div class="sign-c">Firma Responsabile / Management</div>
  </div>
</body></html>`;
  const w=window.open('','_blank');
  if(!w){cqAvviso('Abilita i popup per stampare.');return;}
  w.document.write(html);w.document.close();
  setTimeout(()=>w.print(),400);
}

// §§ BIANCHERIA — Ciclo pulito/sporco (Fornitore Raimondo)
// Modulo distinto da §§ RESI BIANCHERIA: quello tratta i pezzi inidonei (macchiati,
// strappati) che viaggiano in un sacco a parte; questo tratta il giro normale del
// pulito e dello sporco.
//
// Il problema che risolve: Raimondo consegna il pulito lasciando la SUA distinta, ma
// ritira lo sporco senza che nessuno lo conti e senza firmare niente. Mancando quel
// documento, quando salta fuori del materiale mancante non c'è modo di sapere se è
// sparito dentro l'albergo o se non è tornato dalla lavanderia. Qui si genera la
// distinta di consegna che oggi non esiste.
//
// Il conteggio dello sporco NON si conta a parte: è la somma dei consumi che le
// cameriere dichiarano ogni giorno sui fogli camera. Se dal giro scorso sono state
// consumate 26 federe, sono 26 le federe che escono.
const BIA_KEY='qm_biancheria';
const BIA_HOTELS={sa:'SoulArt Hotel',bh:'Boutique Hotel Piazza Carità'};
// Le sette voci dei fogli camera, nell'ordine in cui le cameriere le trovano sul
// cartaceo: inserire i numeri seguendo lo stesso ordine riduce gli errori di battitura.
// L'ordine è solo di presentazione — i dati salvati sono indicizzati per NOME, quindi
// riordinare non sposta nessun numero già registrato. Rinominare una voce sì: quella
// orfanerebbe i valori salvati sotto il vecchio nome.
const BIA_VOCI=['Lenzuolo matrimoniale','Lenzuolo singolo','Federa','Telo doccia','Asciugamano viso','Asciugamano bidet','Scendibagno'];
// Nella tabella del giro le voci si leggono in un ordine diverso: prima la biancheria da
// letto, poi gli asciugamani, infine telo doccia e scendibagno. È l'ordine in cui si
// contano i pezzi preparando il sacco, e NON è quello del foglio camera — che invece
// resta identico nel riquadro dei consumi giornalieri, dove si ricopia dal cartaceo.
//
// Le due liste contengono le stesse sette voci: BIA_VOCI resta l'elenco canonico, e gli
// id delle caselle (bia-r-N / bia-s-N / bia-d-N) seguono SEMPRE la sua posizione. Così
// chi rilegge i campi — biaRegistraGiro, biaPrintDistinta, biaAggiornaDelta — continua a
// scorrere BIA_VOCI e non può disallinearsi con l'ordine mostrato a schermo.
const BIA_VOCI_GIRO=['Lenzuolo matrimoniale','Lenzuolo singolo','Federa','Asciugamano viso','Asciugamano bidet','Telo doccia','Scendibagno'];
let _bia={consumi:[],giri:[]};
let _biaHotel='sa';
const _biaH=x=>x.hotel||'sa';

function _biaUid(){return Date.now()+'_'+Math.random().toString(36).slice(2,8);}
function _biaFmt(d){const x=d instanceof Date?d:new Date(d);return String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0')+'/'+x.getFullYear();}
function _biaParse(s){const m=String(s||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?new Date(+m[3],+m[2]-1,+m[1]):null;}
// dd/MM/yyyy <-> yyyy-MM-dd, per i campi <input type="date">
function _biaToIso(s){const d=_biaParse(s);return d?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'):'';}
function _biaFromIso(s){const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:'';}
function _biaOggi(){const d=new Date();d.setHours(0,0,0,0);return d;}
function _biaVuote(){const o={};BIA_VOCI.forEach(v=>o[v]=0);return o;}
function _biaTot(q){return BIA_VOCI.reduce((s,v)=>s+(Number(q&&q[v])||0),0);}

async function biaLoad(){
  const el=document.getElementById('bia-content');if(!el)return;
  el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Caricamento…</div>';
  let data=null;
  try{
    const r=await fetch(PROXY+'/kv/get?key='+encodeURIComponent(BIA_KEY),{cache:'no-store'});
    if(r.ok){const j=await r.json();if(j&&j.value)data=JSON.parse(j.value);}
  }catch(e){}
  if(!data){try{const s=localStorage.getItem(BIA_KEY);if(s)data=JSON.parse(s);}catch(e){}}
  _bia=Object.assign({consumi:[],giri:[]},data||{});
  biaRender();
}
function _biaSave(){
  const json=JSON.stringify(_bia);
  try{localStorage.setItem(BIA_KEY,json);}catch(e){}
  kvSet(BIA_KEY,json).catch(()=>{});
}

function _biaConsumi(h){const hot=h||_biaHotel;return _bia.consumi.filter(c=>_biaH(c)===hot);}
function _biaGiri(h){
  const hot=h||_biaHotel;
  return _bia.giri.filter(g=>_biaH(g)===hot)
    .sort((a,b)=>(_biaParse(a.data)||0)-(_biaParse(b.data)||0));
}
function biaSetHotel(h){if(!BIA_HOTELS[h])return;_biaHotel=h;biaRender();}

// Calendario reale del giro: Raimondo passa martedì, giovedì e sabato (0=domenica).
// Serve SOLO come ripiego quando non c'è ancora nessun giro registrato: il "dal" continua
// a prendersi dai giri realmente registrati, così un giro saltato viene assorbito dal
// successivo. Il calendario non deve mai scavalcare un giro registrato.
const BIA_GIORNI_GIRO=[2,4,6];
const BIA_GG_NOMI=['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
const BIA_GIORNI_GIRO_TXT='martedì, giovedì e sabato';

// Ultimo giorno di calendario in cui Raimondo sarebbe passato PRIMA di d.
function _biaGiroCalPrec(d){
  const x=new Date(d.getTime());
  for(let i=0;i<7;i++){
    x.setDate(x.getDate()-1);
    if(BIA_GIORNI_GIRO.includes(x.getDay()))return x;
  }
  return new Date(d.getTime()-86400000);
}
function _biaGiornoGiro(d){return BIA_GIORNI_GIRO.includes(d.getDay());}
function _biaGiorniPeriodo(per){
  const out=[];
  if(!per||per.vuoto)return out;
  for(let x=new Date(per.dal.getTime());x<=per.al;x.setDate(x.getDate()+1))out.push(new Date(x.getTime()));
  return out;
}
// I giorni del periodo per cui non è stato registrato nessun consumo: senza questi lo
// sporco che esce è incompleto, ed è la cosa che si dimentica più facilmente.
function _biaGiorniSenzaConsumi(hotel,per){
  const avuti=new Set(_biaConsumi(hotel).map(c=>c.data));
  return _biaGiorniPeriodo(per).filter(d=>!avuti.has(_biaFmt(d)));
}
function _biaGgEtichetta(d){return BIA_GG_NOMI[d.getDay()]+' '+String(d.getDate()).padStart(2,'0');}
// Fino a quattro giorni si scrivono per esteso ("giovedì 20 e venerdì 21"): un intervallo
// di date non dice a colpo d'occhio se sono i giorni giusti, i nomi dei giorni sì.
function _biaPeriodoTxt(per){
  if(!per)return'—';
  if(per.vuoto)return'nessun giorno da ritirare';
  const gg=_biaGiorniPeriodo(per).map(_biaGgEtichetta);
  if(gg.length===1)return'di '+gg[0];
  if(gg.length<=4)return'di '+gg.slice(0,-1).join(', ')+' e '+gg[gg.length-1];
  return'dal '+_biaFmt(per.dal)+' al '+_biaFmt(per.al)+' ('+gg.length+' giorni)';
}

// Il giro del giorno D ritira i consumi dal giro precedente (incluso) al giorno prima
// di D (incluso). Il consumo del giorno stesso del giro resta fuori: Raimondo passa
// alle 8:00, prima che le cameriere lavorino, quindi quello sporco lo ritira il giro
// successivo. Il "dal" si prende dai giri realmente registrati, non dal calendario
// martedì/giovedì/sabato: se un giro salta, il successivo copre da solo il buco.
function _biaPeriodo(hotel,dataGiro){
  const d=_biaParse(dataGiro);if(!d)return null;
  const al=new Date(d.getTime()-86400000);
  const prec=_biaGiri(hotel).filter(g=>{const gd=_biaParse(g.data);return gd&&gd<d;});
  let dal,fonte;
  if(prec.length){
    dal=_biaParse(prec[prec.length-1].data);
    fonte='giro';
  }else{
    // Primo giro in assoluto: comanda il CALENDARIO, cioè il giorno in cui Raimondo
    // sarebbe passato la volta prima (sabato → giovedì, martedì → sabato, giovedì →
    // martedì).
    //
    // I giri avvengono comunque, che siano registrati qui o no: i consumi più vecchi del
    // calendario sono già usciti con i giri precedenti, quindi NON vanno rimessi in
    // questo sacco. Un primo tentativo li faceva uscire tutti ("escono anche i consumi
    // più vecchi mai consegnati") e per un giro di sabato mostrava da martedì a venerdì
    // invece di giovedì e venerdì. Restano fuori, ma il pannello li nomina: sparire in
    // silenzio è peggio che restare fuori con una spiegazione.
    dal=_biaGiroCalPrec(d);
    fonte='calendario';
  }
  if(dal>al)return{dal:dal,al:al,vuoto:true,fonte:fonte};
  return{dal:dal,al:al,vuoto:false,fonte:fonte};
}
// Somma dei consumi giornalieri nell'intervallo, estremi inclusi.
function _biaSommaConsumi(hotel,dal,al){
  const out=_biaVuote();
  _biaConsumi(hotel).forEach(c=>{
    const d=_biaParse(c.data);
    if(!d||d<dal||d>al)return;
    BIA_VOCI.forEach(v=>out[v]+=(Number(c.q&&c.q[v])||0));
  });
  return out;
}
// Quanto Raimondo deve riportare a questo giro = lo sporco che gli è stato consegnato
// al giro precedente. null quando non c'è un giro precedente con cui confrontarsi.
function _biaAtteso(hotel,dataGiro){
  const d=_biaParse(dataGiro);if(!d)return null;
  const prec=_biaGiri(hotel).filter(g=>{const gd=_biaParse(g.data);return gd&&gd<d;});
  if(!prec.length)return null;
  return prec[prec.length-1].consegnato||null;
}
// Saldo cumulato per voce: quanto manca sommando tutti i giri chiusi. Un singolo giro
// può tornare in pari per caso; è la somma nel tempo che dice se c'è una perdita
// sistematica. Negativo = pezzi non rientrati.
function _biaSaldo(hotel){
  const out=_biaVuote();
  const giri=_biaGiri(hotel);
  giri.forEach(g=>{
    const att=_biaAtteso(hotel,g.data);
    if(!att||!g.ricevuto)return;
    BIA_VOCI.forEach(v=>out[v]+=((Number(g.ricevuto[v])||0)-(Number(att[v])||0)));
  });
  return out;
}

// ── Inserimento consumi giornalieri ──
// Un totale al giorno per struttura: il QM somma i fogli delle cameriere e riporta qui
// le sette voci. Reinserendo una data già presente si sovrascrive quella riga invece di
// crearne una seconda, così una correzione non raddoppia i numeri.
async function biaSalvaConsumi(){
  const iso=(document.getElementById('bia-cons-data')||{}).value||'';
  const data=_biaFromIso(iso);
  if(!data){cqAvviso('Indica la data dei consumi.');return;}
  const q=_biaVuote();
  BIA_VOCI.forEach((v,i)=>{
    const el=document.getElementById('bia-c-'+i);
    q[v]=Math.max(0,Number(el&&el.value)||0);
  });
  if(_biaTot(q)===0&&!await cqConferma('Tutti i valori sono a zero','Salvare comunque i consumi di questa giornata?',{ok:'Salva'}))return;
  const esistente=_bia.consumi.find(c=>_biaH(c)===_biaHotel&&c.data===data);
  if(esistente){esistente.q=q;}
  else{_bia.consumi.push({id:_biaUid(),hotel:_biaHotel,data:data,q:q});}
  _biaSave();biaRender();
}
async function biaEliminaConsumo(id){
  const c=_bia.consumi.find(x=>x.id===id);
  if(!c)return;
  if(!await cqConferma('Eliminare questi consumi?','<strong>'+c.data+'</strong><br>I giri già registrati non cambiano.',{ok:'Elimina'}))return;
  _bia.consumi=_bia.consumi.filter(x=>x.id!==id);
  _biaSave();biaRender();
}

// ── Registrazione del giro ──
// Lo sporco consegnato viene congelato al momento della registrazione: se più avanti si
// corregge un consumo giornaliero, i giri già chiusi (e le distinte già firmate) non
// devono cambiare sotto i piedi.
async function biaRegistraGiro(){
  const iso=(document.getElementById('bia-giro-data')||{}).value||'';
  const data=_biaFromIso(iso);
  if(!data){cqAvviso('Indica la data del giro.');return;}
  const consegnato=_biaVuote(),ricevuto=_biaVuote();
  BIA_VOCI.forEach((v,i)=>{
    const es=document.getElementById('bia-s-'+i),er=document.getElementById('bia-r-'+i);
    consegnato[v]=Math.max(0,Number(es&&es.value)||0);
    ricevuto[v]=Math.max(0,Number(er&&er.value)||0);
  });
  const g=_bia.giri.find(x=>_biaH(x)===_biaHotel&&x.data===data);
  if(g){
    if(!await cqConferma('Esiste già un giro per questa data','<strong>'+data+'</strong><br>Sovrascriverlo con i valori attuali?',{ok:'Sovrascrivi'}))return;
    g.consegnato=consegnato;g.ricevuto=ricevuto;g.ts=Date.now();
  }else{
    _bia.giri.push({id:_biaUid(),hotel:_biaHotel,data:data,consegnato:consegnato,ricevuto:ricevuto,ts:Date.now()});
  }
  _biaSave();biaRender();
}
async function biaEliminaGiro(id){
  const g=_bia.giri.find(x=>x.id===id);
  if(!g)return;
  if(!await cqConferma('Eliminare questo giro?','<strong>'+g.data+'</strong><br>I giri successivi useranno un periodo diverso.',{ok:'Elimina'}))return;
  _bia.giri=_bia.giri.filter(x=>x.id!==id);
  _biaSave();biaRender();
}

// La colonna Δ e l'avviso di ammanco si aggiornano MENTRE si digita, ma senza rigenerare
// l'HTML del pannello: la casella "Ricevuto" chiamava biaRender() a ogni tasto, che la
// ridisegnava da capo con il valore calcolato (l'atteso, o 0 al primo giro). La cifra
// appena digitata veniva quindi buttata via a ogni battuta e il campo perdeva il fuoco:
// da fuori sembrava semplicemente che il numero non si potesse inserire.
//
// Qui si toccano solo le celle interessate. Stessa regola per qualunque casella futura in
// questo pannello: aggiornare i pezzi che cambiano, mai ridisegnare tutto sotto le dita.
let _biaAttesoVis=null;   // atteso della tabella attualmente a schermo

function _biaMsgDiff(tot){
  if(!tot)return'';
  return tot<0
    ?'Rispetto a quanto consegnato il giro scorso mancano '+Math.abs(tot)+' pezzi.'
    :'Sono rientrati '+tot+' pezzi in più di quanti ne erano stati consegnati il giro scorso.';
}

function biaAggiornaDelta(){
  const att=_biaAttesoVis;
  let tot=0;
  BIA_VOCI.forEach((v,i)=>{
    const er=document.getElementById('bia-r-'+i), cella=document.getElementById('bia-d-'+i);
    if(!er||!cella)return;
    if(!att){cella.textContent='—';return;}
    const d=(Number(er.value)||0)-(Number(att[v])||0);
    tot+=d;
    cella.textContent=d>0?'+'+d:String(d);
    cella.style.color=d===0?'var(--green)':'var(--red)';
    const tr=er.closest?er.closest('tr'):null;
    if(tr)tr.style.background=d===0?'':'rgba(192,53,42,.06)';
  });
  const avviso=document.getElementById('bia-diff-msg');
  if(avviso){
    const msg=att?_biaMsgDiff(tot):'';
    avviso.textContent=msg;
    avviso.style.display=msg?'':'none';
  }
}

function biaRender(){
  const el=document.getElementById('bia-content');if(!el)return;
  const oggi=_biaOggi();
  const giri=_biaGiri();
  const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Data del giro proposta: oggi. Il periodo coperto si ricalcola da lì.
  const giroIso=(document.getElementById('bia-giro-data')||{}).value||_biaToIso(_biaFmt(oggi));
  const giroData=_biaFromIso(giroIso)||_biaFmt(oggi);
  const per=_biaPeriodo(_biaHotel,giroData);
  const sporco=per&&!per.vuoto?_biaSommaConsumi(_biaHotel,per.dal,per.al):_biaVuote();
  const atteso=_biaAtteso(_biaHotel,giroData);
  const saldo=_biaSaldo();
  const giaReg=_bia.giri.find(x=>_biaH(x)===_biaHotel&&x.data===giroData);
  _biaAttesoVis=atteso;   // la tabella disegnata sotto si riferisce a questo atteso

  let h='';

  // Selettore struttura
  h+=`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
    <div style="display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;">
      ${Object.keys(BIA_HOTELS).map(k=>`<button onclick="biaSetHotel('${k}')" style="border:none;padding:7px 14px;font-size:var(--fs-xxs);font-weight:600;cursor:pointer;background:${k===_biaHotel?'var(--accent)':'var(--surface)'};color:${k===_biaHotel?'#fff':'var(--text-dim)'};">${esc(BIA_HOTELS[k])}</button>`).join('')}
    </div>
  </div>`;

  // ── Consumi del giorno ──
  // La data scelta va riletta dal campo prima di rigenerare l'HTML: riscrivendo sempre
  // la data di oggi, qualunque giorno selezionato tornava indietro subito. I sette
  // valori mostrati sono quelli della data selezionata, non quelli di oggi, così si
  // possono correggere anche i giorni passati.
  const consIso=(document.getElementById('bia-cons-data')||{}).value||_biaToIso(_biaFmt(oggi));
  const consData=_biaFromIso(consIso)||_biaFmt(oggi);
  const consSel=_bia.consumi.find(c=>_biaH(c)===_biaHotel&&c.data===consData);
  h+=`<div class="panel" style="margin-bottom:16px;">
    <div class="panel-header"><span class="panel-title">Consumi giornalieri dai fogli camera</span>
      <span style="margin-left:auto;font-size:var(--fs-xxs);color:var(--text-dim);">somma i fogli delle cameriere e riporta i totali</span>
    </div>
    <div class="panel-body" style="padding:14px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <label style="font-size:var(--fs-xxs);color:var(--text-dim);">Data</label>
        <input type="date" id="bia-cons-data" value="${consIso}" onchange="biaRender()" style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:var(--fs-xs);">
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
        ${BIA_VOCI.map((v,i)=>`<div>
          <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:3px;">${esc(v)}</div>
          <input type="number" min="0" id="bia-c-${i}" value="${consSel?(Number(consSel.q[v])||0):0}" onfocus="this.select()" style="width:100%;padding:7px 9px;border:1px solid var(--border);border-radius:6px;font-size:var(--fs-sm);text-align:center;">
        </div>`).join('')}
      </div>
      <div style="margin-top:12px;">
        <button onclick="biaSalvaConsumi()" style="background:var(--accent);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:var(--fs-xxs);font-weight:600;cursor:pointer;">Salva consumi</button>
      </div>
    </div>
  </div>`;

  // ── Il giro ──
  // Il periodo si scrive con i nomi dei giorni e si dice SEMPRE da dove nasce il "dal":
  // un intervallo di date senza spiegazione non permette di accorgersi che è sbagliato.
  const periodoTxt=_biaPeriodoTxt(per);
  const giroDate=_biaParse(giroData);
  const mancanti=per?_biaGiorniSenzaConsumi(_biaHotel,per):[];
  const fonteTxt=!per?'':
      per.fonte==='giro'?'Il periodo parte dal giro precedente registrato.':
      'Nessun giro registrato prima: il periodo parte dal giorno di calendario precedente (il giro passa '+BIA_GIORNI_GIRO_TXT+').';
  // Consumi registrati PRIMA del periodo, quando non c'è ancora nessun giro in archivio:
  // sono usciti con i giri fatti prima di iniziare a registrarli qui. Restano fuori dal
  // sacco, ma vanno nominati, altrimenti sembrano spariti.
  const fuori=(per&&per.fonte==='calendario')
    ?_biaConsumi(_biaHotel).map(c=>_biaParse(c.data)).filter(x=>x&&x<per.dal).sort((a,b)=>a-b)
    :[];
  h+=`<div class="panel" style="margin-bottom:16px;">
    <div class="panel-header"><span class="panel-title">Giro di Raimondo</span>
      ${giaReg?'<span style="margin-left:auto;font-size:var(--fs-xxs);font-weight:700;color:var(--green);">giro già registrato</span>':''}
    </div>
    <div class="panel-body" style="padding:14px;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
        <label style="font-size:var(--fs-xxs);color:var(--text-dim);">Data del giro</label>
        <input type="date" id="bia-giro-data" value="${giroIso}" onchange="biaRender()" style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:var(--fs-xs);">
        <span style="font-size:var(--fs-xxs);color:var(--text-dim);">ritira i consumi ${esc(periodoTxt)}</span>
      </div>
      <div style="font-size:var(--fs-xxs);color:var(--text-dim);line-height:1.5;margin-bottom:8px;">${esc(fonteTxt)}</div>`;

  // Data fuori calendario: non è un errore (un giro straordinario è legittimo), ma se è
  // una svista è meglio accorgersene prima di stampare la distinta.
  if(giroDate&&!_biaGiornoGiro(giroDate)){
    h+=`<div style="font-size:var(--fs-xs);color:var(--amber);line-height:1.5;margin-bottom:8px;">Il ${esc(_biaFmt(giroDate))} è un ${esc(BIA_GG_NOMI[giroDate.getDay()])}: di norma il giro passa ${BIA_GIORNI_GIRO_TXT}.</div>`;
  }

  if(fuori.length){
    h+=`<div style="font-size:var(--fs-xxs);color:var(--text-dim);line-height:1.5;margin-bottom:8px;">I consumi ${esc(fuori.length===1?'del':'dal')} ${esc(_biaFmt(fuori[0]))}${fuori.length>1?' al '+esc(_biaFmt(fuori[fuori.length-1])):''} restano fuori: sono usciti con i giri precedenti. Se invece non sono mai stati consegnati, registra quel giro con la sua data.</div>`;
  }

  // Giorni del periodo senza consumi registrati: è quello che rende incompleto lo sporco
  // che esce, ed è la dimenticanza più facile da fare.
  if(mancanti.length){
    h+=`<div style="background:rgba(160,90,0,.08);border-left:3px solid var(--amber);padding:9px 11px;font-size:var(--fs-xs);color:var(--amber);line-height:1.5;margin-bottom:10px;">Nessun consumo registrato per ${esc(mancanti.map(_biaGgEtichetta).join(', '))}. Finché mancano, lo sporco che esce è incompleto: inseriscili nel riquadro qui sopra cambiando la data.</div>`;
  }

  if(per&&per.vuoto){
    h+=`<div style="font-size:var(--fs-xs);color:var(--amber);line-height:1.5;margin-bottom:10px;">Non ci sono giorni da ritirare per questa data: c'è già un giro registrato lo stesso giorno o successivo.</div>`;
  }

  // Righe: atteso (dal giro prima) / ricevuto (dalla distinta di Raimondo) / sporco che esce
  const diffTot=BIA_VOCI.reduce((s,v)=>{
    if(!atteso)return s;
    const r=giaReg?(Number(giaReg.ricevuto[v])||0):(Number(atteso[v])||0);
    return s+(r-(Number(atteso[v])||0));
  },0);
  const msgDiff=atteso?_biaMsgDiff(diffTot):'';
  h+=`<div id="bia-diff-msg" style="background:var(--red-bg,rgba(192,53,42,.08));border-left:3px solid var(--red);padding:9px 11px;font-size:var(--fs-xs);color:var(--red);line-height:1.45;margin-bottom:10px;${msgDiff?'':'display:none;'}">${esc(msgDiff)}</div>`;

  h+=`<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:var(--fs-xs);">
      <thead><tr>
        <th style="text-align:left;padding:6px 5px;border-bottom:1px solid var(--border);font-size:var(--fs-xxs);text-transform:uppercase;letter-spacing:.04em;color:var(--text-dim);font-weight:600;">Tipologia</th>
        <th style="text-align:center;padding:6px 5px;border-bottom:1px solid var(--border);font-size:var(--fs-xxs);text-transform:uppercase;letter-spacing:.04em;color:var(--text-dim);font-weight:600;">Atteso</th>
        <th style="text-align:center;padding:6px 5px;border-bottom:1px solid var(--border);font-size:var(--fs-xxs);text-transform:uppercase;letter-spacing:.04em;color:var(--text-dim);font-weight:600;">Ricevuto</th>
        <th style="text-align:center;padding:6px 5px;border-bottom:1px solid var(--border);font-size:var(--fs-xxs);text-transform:uppercase;letter-spacing:.04em;color:var(--text-dim);font-weight:600;">Δ</th>
        <th style="text-align:center;padding:6px 5px;border-bottom:1px solid var(--border);font-size:var(--fs-xxs);text-transform:uppercase;letter-spacing:.04em;color:var(--text-dim);font-weight:600;">Sporco che esce</th>
      </tr></thead>
      <tbody>`;
  BIA_VOCI_GIRO.forEach(v=>{
    const i=BIA_VOCI.indexOf(v);          // id canonico: vedi la nota su BIA_VOCI_GIRO
    const att=atteso?(Number(atteso[v])||0):null;
    const ric=giaReg?(Number(giaReg.ricevuto[v])||0):(att===null?0:att);
    const spo=giaReg?(Number(giaReg.consegnato[v])||0):(Number(sporco[v])||0);
    const d=att===null?null:(ric-att);
    const bad=d!==null&&d!==0;
    h+=`<tr style="${bad?'background:rgba(192,53,42,.06);':''}">
      <td style="padding:6px 5px;border-bottom:1px solid var(--border-light,var(--border));">${esc(v)}</td>
      <td style="padding:6px 5px;border-bottom:1px solid var(--border-light,var(--border));text-align:center;color:var(--text-dim);">${att===null?'—':att}</td>
      <td style="padding:6px 5px;border-bottom:1px solid var(--border-light,var(--border));text-align:center;"><input type="number" min="0" id="bia-r-${i}" value="${ric}" oninput="biaAggiornaDelta()" onfocus="this.select()" style="width:56px;padding:5px;border:1px solid var(--border);border-radius:5px;font-size:var(--fs-xs);text-align:center;"></td>
      <td id="bia-d-${i}" style="padding:6px 5px;border-bottom:1px solid var(--border-light,var(--border));text-align:center;font-weight:700;color:${d===null?'var(--text-dim)':(d===0?'var(--green)':'var(--red)')};">${d===null?'—':(d>0?'+'+d:d)}</td>
      <td style="padding:6px 5px;border-bottom:1px solid var(--border-light,var(--border));text-align:center;"><input type="number" min="0" id="bia-s-${i}" value="${spo}" onfocus="this.select()" style="width:56px;padding:5px;border:1px solid var(--border);border-radius:5px;font-size:var(--fs-xs);text-align:center;"></td>
    </tr>`;
  });
  h+=`</tbody></table></div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="biaRegistraGiro()" style="background:var(--accent);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:var(--fs-xxs);font-weight:600;cursor:pointer;">${giaReg?'Aggiorna giro':'Registra giro'}</button>
        <button onclick="biaPrintDistinta()" style="background:var(--surface);color:var(--accent);border:1.5px solid var(--border);padding:8px 16px;border-radius:8px;font-size:var(--fs-xxs);font-weight:600;cursor:pointer;">Stampa distinta di consegna</button>
      </div>
      <div style="margin-top:10px;font-size:var(--fs-xxs);color:var(--text-dim);line-height:1.55;">Lo <strong>sporco che esce</strong> è la somma dei consumi del periodo: è già il numero giusto, correggilo solo se il sacco contiene qualcosa di diverso. Il <strong>ricevuto</strong> parte uguale all'atteso — toccalo solo se la distinta di Raimondo dice altro.</div>
    </div>
  </div>`;

  // ── Saldo cumulato ──
  const saldoTot=_biaTot(saldo);
  if(giri.length){
    h+=`<div class="panel" style="margin-bottom:16px;">
      <div class="panel-header"><span class="panel-title">Pezzi non rientrati — totale da inizio registrazioni</span>
        <span style="margin-left:auto;font-size:var(--fs-sm);font-weight:700;color:${saldoTot<0?'var(--red)':'var(--green)'};">${saldoTot===0?'in pari':saldoTot}</span>
      </div>
      <div class="panel-body" style="padding:14px;">
        ${BIA_VOCI.map(v=>{const n=saldo[v];return`<div style="display:flex;justify-content:space-between;padding:5px 2px;border-bottom:1px solid var(--border);font-size:var(--fs-xs);"><span>${esc(v)}</span><span style="font-weight:600;color:${n<0?'var(--red)':(n>0?'var(--amber)':'var(--green)')};">${n===0?'in pari':n}</span></div>`;}).join('')}
        <div style="margin-top:10px;font-size:var(--fs-xxs);color:var(--text-dim);line-height:1.55;">Un singolo giro può chiudere in pari per caso. È questo totale che dice se la perdita è occasionale o continua.</div>
      </div>
    </div>`;
  }

  // ── Storico ──
  if(giri.length){
    h+=`<div class="panel"><div class="panel-header"><span class="panel-title">Giri registrati</span></div><div class="panel-body" style="padding:0;">`;
    giri.slice().reverse().forEach(g=>{
      const att=_biaAtteso(_biaHotel,g.data);
      const d=att?BIA_VOCI.reduce((s,v)=>s+((Number(g.ricevuto[v])||0)-(Number(att[v])||0)),0):null;
      h+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);font-size:var(--fs-xs);">
        <span style="font-weight:700;">${esc(g.data)}</span>
        <span style="color:var(--text-dim);">consegnati ${_biaTot(g.consegnato)} · ricevuti ${_biaTot(g.ricevuto)}</span>
        ${d===null?'':`<span style="font-weight:700;color:${d===0?'var(--green)':'var(--red)'};">${d===0?'in pari':(d>0?'+'+d:d)}</span>`}
        <span style="margin-left:auto;display:flex;gap:6px;">
          <button onclick="biaPrintDistinta('${g.id}')" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 9px;font-size:var(--fs-xxs);color:var(--accent);cursor:pointer;">Distinta</button>
          <button onclick="biaEliminaGiro('${g.id}')" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 9px;font-size:var(--fs-xxs);color:var(--red);cursor:pointer;">Elimina</button>
        </span>
      </div>`;
    });
    h+=`</div></div>`;
  }

  // ── Consumi registrati di recente ──
  const rec=_biaConsumi().slice().sort((a,b)=>(_biaParse(b.data)||0)-(_biaParse(a.data)||0)).slice(0,14);
  if(rec.length){
    h+=`<div class="panel" style="margin-top:16px;"><div class="panel-header"><span class="panel-title">Ultimi consumi inseriti</span></div><div class="panel-body" style="padding:0;">`;
    rec.forEach(c=>{
      h+=`<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);font-size:var(--fs-xs);">
        <span style="font-weight:600;">${esc(c.data)}</span>
        <span style="color:var(--text-dim);">${_biaTot(c.q)} pezzi</span>
        <button onclick="biaEliminaConsumo('${c.id}')" style="margin-left:auto;background:none;border:1px solid var(--border);border-radius:6px;padding:4px 9px;font-size:var(--fs-xxs);color:var(--red);cursor:pointer;">Elimina</button>
      </div>`;
    });
    h+=`</div></div>`;
  }

  el.innerHTML=h;
}

// Distinta di consegna A4 — il documento che oggi manca. Senza id stampa il giro
// impostato nel form (anche non ancora registrato, così la si può portare già compilata
// al momento del ritiro); con un id ristampa un giro dello storico.
function biaPrintDistinta(giroId){
  const g=giroId?_bia.giri.find(x=>x.id===giroId):null;
  let hotel,data,q,per;
  if(g){
    hotel=_biaH(g);data=g.data;q=g.consegnato;per=_biaPeriodo(hotel,data);
  }else{
    hotel=_biaHotel;
    const iso=(document.getElementById('bia-giro-data')||{}).value||'';
    data=_biaFromIso(iso)||_biaFmt(_biaOggi());
    q=_biaVuote();
    BIA_VOCI.forEach((v,i)=>{const e=document.getElementById('bia-s-'+i);q[v]=Math.max(0,Number(e&&e.value)||0);});
    per=_biaPeriodo(hotel,data);
  }
  const tot=_biaTot(q);
  if(!tot){cqAvviso('Non c\'è niente da consegnare: tutte le quantità sono a zero.');return;}
  const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const periodo=per&&!per.vuoto?(_biaFmt(per.dal)+' — '+_biaFmt(per.al)):'—';
  const html=`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Distinta di Consegna Biancheria</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;font-size:10.5pt;}
@page{size:A4;margin:16mm;}
.hdr{border-bottom:1.5px solid #111;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:baseline;}
.title{font-size:14pt;font-weight:700;letter-spacing:.01em;}
.sub{font-size:9pt;color:#555;margin-top:2px;}
.meta{display:flex;gap:34px;margin-bottom:14px;font-size:10pt;}
.meta-lbl{font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:#555;}
.meta-val{font-weight:700;margin-top:2px;}
.warn{border:1px solid #999;padding:8px 10px;margin-bottom:14px;font-size:8.5pt;line-height:1.6;color:#333;}
table{width:100%;border-collapse:collapse;margin-bottom:16px;}
th{text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:#555;border-bottom:1.5px solid #111;padding:6px 6px;}
td{padding:7px 6px;border-bottom:1px solid #ccc;font-size:10pt;}
td.r{text-align:right;}
tfoot td{border-top:1.5px solid #111;border-bottom:none;font-weight:700;padding-top:8px;}
.blk{border:1px solid #999;padding:10px 12px;margin-bottom:12px;}
.blk-t{font-size:8.5pt;text-transform:uppercase;letter-spacing:.05em;font-weight:700;color:#333;margin-bottom:10px;}
.row{display:flex;gap:26px;margin-bottom:12px;}
.f{flex:1;}
.f-lbl{font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:#555;margin-bottom:3px;}
.f-val{font-size:11pt;border-bottom:1px solid #999;padding-bottom:4px;min-height:17px;}
.sign{border-bottom:1px solid #111;margin-top:34px;}
.sign-c{font-size:8pt;color:#555;margin-top:4px;}
</style></head><body>
  <div class="hdr">
    <div><div class="title">Distinta di Consegna Biancheria Sporca</div><div class="sub">Fornitore Raimondo</div></div>
    <div style="text-align:right;"><div class="meta-lbl">Struttura</div><div class="meta-val">${esc(BIA_HOTELS[hotel]||'')}</div></div>
  </div>
  <div class="meta">
    <div><div class="meta-lbl">Data ritiro</div><div class="meta-val">${esc(data)}</div></div>
    <div><div class="meta-lbl">Consumi del periodo</div><div class="meta-val">${esc(periodo)}</div></div>
    <div><div class="meta-lbl">Totale pezzi</div><div class="meta-val">${tot}</div></div>
  </div>
  <div class="warn">
    • Le quantità sotto indicate corrispondono ai consumi rilevati sui fogli camera del periodo.<br>
    • La biancheria inidonea (macchiata / difettata) viaggia in un sacco separato, con distinta propria, e NON è conteggiata qui.<br>
    • Il rientro del pulito corrispondente è atteso al giro successivo.
  </div>
  <table>
    <thead><tr><th>Tipologia pezzo</th><th style="width:90px;text-align:right;">Quantità</th></tr></thead>
    <tbody>${BIA_VOCI.map(v=>`<tr><td>${esc(v)}</td><td class="r">${Number(q[v])||0}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Totale pezzi consegnati</td><td class="r">${tot}</td></tr></tfoot>
  </table>
  <div class="blk">
    <div class="blk-t">Ritiro Fornitore Raimondo</div>
    <div class="row">
      <div class="f"><div class="f-lbl">Data ritiro</div><div class="f-val">${esc(data)}</div></div>
      <div class="f"><div class="f-lbl">Totale pezzi</div><div class="f-val">${tot}</div></div>
      <div class="f"><div class="f-lbl">Sacchi n°</div><div class="f-val">&nbsp;</div></div>
    </div>
    <div class="sign"></div>
    <div class="sign-c">Firma per ricevuta — Fornitore Raimondo</div>
  </div>
  <div class="blk">
    <div class="blk-t">Consegna a cura di</div>
    <div class="row">
      <div class="f"><div class="f-lbl">Nome</div><div class="f-val">&nbsp;</div></div>
      <div class="f"><div class="f-lbl">Data</div><div class="f-val">&nbsp;</div></div>
    </div>
    <div class="sign"></div>
    <div class="sign-c">Firma Responsabile / Management</div>
  </div>
</body></html>`;
  const w=window.open('','_blank');
  if(!w){cqAvviso('Il browser ha bloccato la finestra di stampa.');return;}
  w.document.write(html);w.document.close();
  setTimeout(()=>w.print(),400);
}

// §§ PRENOTAZIONI — file unico dal PMS (arrivi + colazioni + pre-stay)
//
// Un solo export sostituisce tre upload: Riepilogo Reception, Arrivi Pre-stay e Report
// pasti. Nel PMS (Hotel in Cloud): Prenotazioni → filtro **Presenti** → intervallo di
// date → tutte le strutture → Esporta.
//
// Perché "Presenti" e non "Arrivi": ogni riga porta con sé sia `Arrivo` sia `Partenza`,
// quindi da un solo file si ricava, per QUALSIASI giorno dell'intervallo, chi arriva, chi
// parte e chi resta. Con il filtro "Arrivi" servirebbero tre export separati (il PMS
// permette un filtro per volta) — vedi la nota in CLAUDE.md.
//
// Il parsing è deterministico sulle posizioni x delle colonne, senza AI: stesso approccio
// di _psParsePdfArrivi, stesso motivo (i nomi e i tipi camera vanno a capo).
//
// PREN_UNICO=false → tutto torna esattamente com'era: riappaiono i tre slot separati e i
// loro handler, che NON vengono rimossi. Stesso schema di HKP_DERIVE_FROM_PIANO.
const PREN_UNICO=true;
// Riepilogo dell'ultimo caricamento ("147 prenotazioni · 21/08–28/08"), per ricostruire la
// tessera dell'Upload Center dopo un ricaricamento della pagina. Del PDF non si conserva
// altro: arrivi, colazioni e pre-stay hanno già ciascuno il proprio archivio.
const PREN_RIASS_KEY='qm_pren_riass';

// Posizioni x delle colonne nell'export reale (pagina orizzontale, larghezza 842pt).
// Verificate sull'export del 20/08/2026: intestazioni a x=10 Ospite, 162.5 Arrivo,
// 215.7 Partenza, 300.2 Alloggio, 354.7 Ospiti, 388.7 Stato, 563 Tratt., 595.4 Origine.
const PREN_COL={
  ospite:[0,64], arrivo:[162,215], partenza:[215,268],
  alloggio:[300,354], ospiti:[354,388], stato:[388,424], codice:[470,519],
  tratt:[563,595], origine:[595,649]
};
const PREN_RE_DATA=/^(\d{2})\/(\d{2})\/(\d{4})$/;

function _prenCella(ws,r){return ws.filter(w=>w.x>=r[0]&&w.x<r[1]).map(w=>w.s).join(' ').trim();}
function _prenData(s){const m=String(s||'').trim().match(PREN_RE_DATA);return m?m[3]+'-'+m[2]+'-'+m[1]:null;}
function _prenGiorniTra(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000);}

// "2" -> {a:2,b:0} · "2 + 1" -> {a:2,b:1}. L'export non riporta sempre la suddivisione
// (una prenotazione che il PMS conta 1 adulto + 1 bambino qui può comparire come "2"):
// il TOTALE è corretto, lo split no. Nessuno lo usa separato — app.js e breakfast.html
// sommano sempre — quindi si tiene il totale e si lascia 0 sui bambini.
function _prenPax(s){
  const m=String(s||'').match(/\d+/g)||[];
  return{a:+(m[0]||0), b:+(m[1]||0)};
}

// "Art 21 / AS Superior" -> {camera:'Art 21', tipo:'AS Superior'}
function _prenCamera(alloggio){
  const s=String(alloggio||'').trim();
  const i=s.indexOf('/');
  if(i===-1)return{camera:s,tipo:''};
  return{camera:s.slice(0,i).trim(), tipo:s.slice(i+1).trim()};
}

// Codici struttura maiuscoli, come li usa già qm_arriviData (SA/BH/SL/PR/MS).
// Stesse regole di fixArriviStruttura: TUTTE le camere Art sono SoulArt.
//
// Si guarda l'alloggio INTERO ("Art 21 / AS Superior"), non il solo numero di camera,
// perché quando la camera non è ancora assegnata il PMS scrive lì solo il tipo — es.
// "UM TRIPLA CLASSIC", "MS Family", "AS Suite". Il codice tipo dopo la barra identifica
// comunque la struttura: AS=SoulArt, PC=Boutique, UM=Principe, MS=Mastrangelo,
// AS_LIB=San Liborio. Senza questo ripiego quelle prenotazioni finivano tutte su SoulArt
// e falsavano i conteggi (verificato: i "no colazione" del report non tornavano).
function _prenStruttura(alloggio){
  const c=String(alloggio||'').trim().toUpperCase();
  if(/LIB/.test(c))return'SL';                                  // AS_LIB, prima di AS
  if(/^(CAPRI|NAPOLI|PROCIDA|ISCHIA|POSITANO)/.test(c))return'PR';
  if(/^R\s*[123]\b/.test(c))return'MS';
  if(/^\d+/.test(c)&&+c.match(/^\d+/)[0]>=200&&+c.match(/^\d+/)[0]<=299)return'BH';
  if(/^ART\s*\d/.test(c))return'SA';
  // camera non assegnata: decide il codice tipo
  if(/\bUM\b/.test(c))return'PR';
  if(/\bPC\b/.test(c))return'BH';
  if(/\bMS\b/.test(c))return'MS';
  if(/\bAS\b/.test(c))return'SA';
  return'SA';
}

/**
 * Legge l'export "Prenotazioni" e restituisce una prenotazione per riga logica.
 * @param {Array<{s:string,x:number,y:number}>} items testo con coordinate (da pdf.js)
 */
function _prenParse(items){
  // Raggruppa per riga: stessa tolleranza usata dal parser pre-stay.
  const perRiga=new Map();
  items.forEach(it=>{
    const k=Math.round(it.y/3);
    if(!perRiga.has(k))perRiga.set(k,[]);
    perRiga.get(k).push(it);
  });
  const chiavi=[...perRiga.keys()].sort((a,b)=>b-a);   // y decrescente = alto → basso
  const out=[];
  chiavi.forEach(k=>{
    const ws=perRiga.get(k).sort((a,b)=>a.x-b.x);
    const arrivo=_prenData(_prenCella(ws,PREN_COL.arrivo));
    if(arrivo){
      const all=_prenCella(ws,PREN_COL.alloggio);
      const{camera,tipo}=_prenCamera(all);
      const pax=_prenPax(_prenCella(ws,PREN_COL.ospiti));
      out.push({
        ospite:_prenCella(ws,PREN_COL.ospite), alloggio:all,
        arrivo, partenza:_prenData(_prenCella(ws,PREN_COL.partenza)),
        camera, tipo, pax:pax.a+pax.b, adulti:pax.a, bambini:pax.b,
        stato:_prenCella(ws,PREN_COL.stato),
        codice:_prenCella(ws,PREN_COL.codice),
        tratt:_prenCella(ws,PREN_COL.tratt),
        origine:_prenCella(ws,PREN_COL.origine),
        struttura:_prenStruttura(all)
      });
    }else if(out.length){
      // Riga di continuazione: nome e tipo camera vanno a capo nell'export reale.
      const p=out[out.length-1];
      const n=_prenCella(ws,PREN_COL.ospite); if(n)p.ospite+=' '+n;
      const t=_prenCella(ws,PREN_COL.alloggio); if(t)p.tipo=(p.tipo+' '+t).trim();
      const k=_prenCella(ws,PREN_COL.codice); if(k)p.codice=(p.codice+' '+k).trim();
    }
  });
  // Solo prenotazioni valide: le cancellate non devono contare da nessuna parte.
  return out.filter(p=>p.partenza&&!/annull|cancell/i.test(p.stato));
}

// Intervallo che è stato chiesto al PMS all'export, dedotto dai dati: il PDF non lo
// riporta da nessuna parte.
//
// Una prenotazione compare in "Presenti dal X al Y" solo se parte DOPO X (altrimenti se
// n'era già andata) e arriva PRIMA di Y (altrimenti non è ancora arrivata). Quindi la
// prima partenza presente nel file è X e l'ultimo arrivo è Y.
//
// NON si può usare "primo arrivo → ultima partenza": quelli sconfinano largamente fuori
// dal periodo, perché includono chi era già dentro da giorni e chi resterà per settimane.
// Usandoli, il grafico colazioni copriva 22 giorni invece di 8.
//
// Se per caso nessuno parte esattamente il primo giorno o arriva esattamente l'ultimo,
// l'intervallo risulta un po' più stretto del richiesto: si perde al massimo un giorno di
// coda, mai se ne inventano di inesistenti.
function _prenIntervallo(pren){
  if(!pren.length)return null;
  const arr=pren.map(p=>p.arrivo).sort(), par=pren.map(p=>p.partenza).sort();
  return{dal:par[0], al:arr[arr.length-1]};
}

// ── Derivazione 1: qm_arriviData (sostituisce il Riepilogo Reception) ──
// Stessa identica forma di prima, così Culligan e housekeeper.html continuano a leggerla
// senza sapere che il file sorgente è cambiato.
function _prenArriviData(pren,iso){
  const dmy=s=>{const[a,m,g]=s.split('-');return (+g)+'/'+(+m);};   // "20/8", come prima
  const base=p=>({camera:p.camera, struttura:p.struttura, ospite:p.ospite, pax:p.pax,
                  arrivo:dmy(p.arrivo), partenza:dmy(p.partenza), origine:p.origine});
  const arrivi=[],fermate=[],partenze=[];
  pren.forEach(p=>{
    if(p.arrivo===iso)      arrivi.push({...base(p), tipo_camera:p.tipo, trattamento:p.tratt, note:'', alert:false});
    else if(p.partenza===iso) partenze.push(base(p));
    else if(p.arrivo<iso&&iso<p.partenza) fermate.push(base(p));
  });
  const[a,m,g]=iso.split('-');
  return{
    data:g+'/'+m+'/'+a,
    totale_stanze:arrivi.length+fermate.length,
    totale_persone:[...arrivi,...fermate].reduce((s,x)=>s+(x.pax||0),0),
    arrivi, partenze, fermate, _ts:Date.now()
  };
}

// ── Derivazione 2: qm_bkfData (sostituisce il Report pasti) ──
// Convenzione verificata sul report reale: la colazione si conta il MATTINO DOPO la notte,
// cioè arrivo < giorno <= partenza. Le colazioni contano tutte le strutture; i "no
// colazione" solo SoulArt e Boutique, le uniche che servono la colazione — entrambe le
// regole riproducono il report del PMS su 8 giorni su 8.
const PREN_STRUTT_PASTI=['SA','BH'];
const PREN_GG=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
function _prenBkfData(pren){
  const per=_prenIntervallo(pren); if(!per)return null;
  const giorni=[];
  for(let i=0;;i++){
    const d=new Date(per.dal+'T12:00:00'); d.setDate(d.getDate()+i);
    const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(iso>per.al)break;
    const dentro=pren.filter(p=>p.arrivo<iso&&iso<=p.partenza);
    const bb=dentro.filter(p=>p.tratt==='BB');
    const ro=dentro.filter(p=>p.tratt==='RO'&&PREN_STRUTT_PASTI.includes(p.struttura));
    const colTot=bb.reduce((s,p)=>s+p.pax,0);
    if(!dentro.length&&!giorni.length)continue;      // salta i giorni vuoti iniziali
    giorni.push({
      label:PREN_GG[d.getDay()]+' '+String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'),
      data:String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(),
      noCol:ro.reduce((s,p)=>s+p.pax,0),
      colTot, adulti:colTot, bambini:0     // vedi _prenPax: lo split non è affidabile, il totale sì
    });
  }
  return{data:giorni, activeDay:0, ts:Date.now()};
}

// ── Derivazione 3: schede pre-stay (sostituisce Arrivi Pre-stay) ──
// Stessa forma attesa da _psImportaArrivi: {camera, nome, hotel}. La camera serve solo a
// dedurre la struttura e viene poi scartata (le schede non hanno campo camera).
// `origine` è la novità: il canale arriva dal PMS invece di essere indovinato dall'email,
// e Italcamel si riconosce da sé senza la spunta manuale.
// Una prenotazione multicamera compare come UNA RIGA PER CAMERA. Il codice però è diverso
// per ogni camera — verificato sul file reale: fra 158 prenotazioni non ce ne sono due
// uguali, nemmeno nei gruppi. Quello che coincide sono nome, arrivo, partenza e canale.
// Si raggruppa su quelli: è una sola prenotazione con una sola email, quindi una sola
// scheda. Nel file di prova ne emergono 9, da 2 a 4 camere ciascuna.
//
// I codici di TUTTE le camere del gruppo restano sulla scheda: servono all'abbinamento al
// reimport, e basta che uno solo combaci.
function _prenPrestay(pren,iso){
  const gruppi=new Map();
  pren.filter(p=>p.arrivo===iso).forEach(p=>{
    const k=[_psNomeChiave(p.ospite),p.arrivo,p.partenza,p.origine].join('|');
    let g=gruppi.get(k);
    if(!g){
      g={camera:p.camera, nome:p.ospite, codici:[],
         hotel:_prenStruttura(p.alloggio||p.camera).toLowerCase(),
         origine:p.origine, camere:[]};
      gruppi.set(k,g);
    }
    if(p.codice)g.codici.push(p.codice);
    if(p.camera)g.camere.push(p.camera);
  });
  return[...gruppi.values()].map(g=>({...g,codice:g.codici[0]||''}));
}

// ── Upload e applicazione ──
// Scrive le stesse chiavi che scrivevano i tre upload separati, nella stessa forma:
// nulla a valle (Culligan, housekeeper.html, breakfast.html) si accorge del cambio.
function _prenOggiIso(){
  const d=customDate||new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

async function prenHandlePdf(file){
  const uc=(stato,sub)=>{try{ucSetState('pren',stato,sub,true);}catch(e){}};
  const box=document.getElementById('prenStatus');
  const msg=t=>{if(box)box.textContent=t;};
  try{
    msg('Lettura del PDF…'); uc('loading','Lettura PDF...');
    const ab=await file.arrayBuffer();
    const pdfDoc=await pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise;
    const items=[];
    for(let p=1;p<=pdfDoc.numPages;p++){
      const tc=await (await pdfDoc.getPage(p)).getTextContent();
      // Le pagine successive ripartono dall'alto: si sfalsa la y per non mescolare le righe.
      tc.items.forEach(it=>{const s=(it.str||'').trim();if(s)items.push({s,x:it.transform[4],y:it.transform[5]-(p-1)*10000});});
    }
    const pren=_prenParse(items);
    if(!pren.length){
      msg('Nessuna prenotazione riconosciuta. Controlla di aver esportato con filtro "Presenti" e tutte le strutture.');
      uc('error','Nessuna prenotazione'); return;
    }
    const per=_prenIntervallo(pren);
    const iso=_prenOggiIso();

    // 1. Arrivi del giorno corrente (ex Riepilogo Reception)
    // Lo stesso giorno del caricamento precedente? Serve a rcAggiornaDaArrivi per
    // evidenziare nuove prenotazioni e camere spostate invece di segnare tutto come nuovo.
    const ad=_prenArriviData(pren,iso);
    const _rcStessoGiorno=!!(arriviData&&arriviData.data===ad.data);
    arriviData=ad;
    try{localStorage.setItem('qm_arriviData',JSON.stringify(ad));}catch(e){}
    kvSet('qm_arriviData',JSON.stringify(ad)).catch(()=>{});
    try{arriviUpdateKpi();}catch(e){}
    try{bkfRoomInfoBuild();}catch(e){}

    // 1b. Registration card del giorno. Senza questo passaggio le card restavano quelle
    //     dell'ultimo Riepilogo Reception caricato a mano: qm_arriviData era aggiornata,
    //     ma nessuno ridisegnava la vista Registrazione.
    let _rcEsito='vuoto';
    try{_rcEsito=rcAggiornaDaArrivi(_rcStessoGiorno);}catch(e){console.error('[Prenotazioni] registration card:',e);}

    // 2. Colazioni per tutto l'intervallo (ex Report pasti)
    const bd=_prenBkfData(pren);
    if(bd&&bd.data.length){
      bkfData=bd.data; bkfActiveDay=0;
      try{localStorage.setItem('qm_bkfData',JSON.stringify(bd));}catch(e){}
      kvSet('qm_bkfData',JSON.stringify(bd)).catch(()=>{});
      // Segnatempo delle colazioni. Lo scriveva solo il vecchio upload del Report pasti:
      // senza questa riga i dati si aggiornavano ma il Pannello App continuava a mostrare
      // l'ora dell'ultimo caricamento manuale, indistinguibile da un caricamento mancato.
      try{localStorage.setItem('qm_ts_bkfTs',String(bd.ts));}catch(e){}
      try{setUploadTs('bkfTs',bd.ts);}catch(e){}
      try{updateKpiFromBkf();}catch(e){}
      try{renderBkfData();}catch(e){}
    }

    // 3. Schede pre-stay: si importano TUTTI i giorni dell'intervallo, non solo oggi.
    //    _psImportaArrivi conserva email/telefono già inseriti (confronto per nome), quindi
    //    ricaricare il file dopo nuove prenotazioni non fa perdere il lavoro fatto.
    let giorniPs=0, schedePs=0;
    const viste=new Set(pren.map(p=>p.arrivo));
    viste.forEach(g=>{
      if(g<iso)return;                                  // il passato non serve ai pre-stay
      const lista=_prenPrestay(pren,g);
      if(!lista.length)return;
      try{_psImportaArrivi(g,lista); giorniPs++; schedePs+=lista.length;}catch(e){}
    });

    const dmy=s=>{const[a,m,g]=s.split('-');return g+'/'+m;};
    const riass=pren.length+' prenotazioni · '+dmy(per.dal)+'–'+dmy(per.al);
    // L'esito delle registration card va detto: se restano quelle vecchie deve saperlo chi
    // carica, non scoprirlo stampando la card di un ospite partito ieri.
    const rcNota=_rcEsito==='ok'?'registration card aggiornate'
      :_rcEsito==='nessuna'?'nessuna registration card (solo Principe/Mastrangelo)'
      :'⚠️ registration card NON aggiornate: nessun arrivo valido per oggi';
    msg('Caricato: '+ad.arrivi.length+' arrivi oggi, '+(bd?bd.data.length:0)+' giorni di colazioni, '+schedePs+' schede pre-stay su '+giorniPs+' giorni. '+rcNota+'.');
    uc('loaded',riass);
    setUploadTs('prenTs');
    // Senza questa riga, dopo un Cmd+R la tessera torna a "Non caricato" pur essendo stati
    // aggiornati arrivi, colazioni e pre-stay: identica a un caricamento mai avvenuto.
    try{localStorage.setItem(PREN_RIASS_KEY,JSON.stringify({riass:riass,ts:Date.now()}));}catch(e){}
    try{refreshOverviewForDate(customDate||new Date());}catch(e){}
    try{prestayRender();}catch(e){}
  }catch(err){
    msg('Errore nella lettura del PDF: '+(err&&err.message?err.message:err));
    uc('error','Errore caricamento');
  }
}

// Nasconde gli slot sostituiti quando il file unico è attivo, e viceversa. Gli slot e i
// loro handler restano nel codice: PREN_UNICO=false li fa riapparire identici a prima.
function prenApplicaVisibilitaSlot(){
  const mostra=(id,vis)=>{const e=document.getElementById(id);if(e)e.style.display=vis?'':'none';};
  ['uc-arrivi','uc-prestay','uc-bkf'].forEach(id=>mostra(id,!PREN_UNICO));
  mostra('uc-pren',PREN_UNICO);
  // Con il file unico, "Report pasti" è l'unica tessera della sua riga: la riga vuota
  // resterebbe a occupare lo spazio fra le altre (uc-grid ha gap, non margini sulle card).
  mostra('uc-row-pasti',!PREN_UNICO);
}

// Ricostruisce la tessera Prenotazioni dopo un ricaricamento della pagina, come
// pianoSetLoaded fa per il Piano Settimanale. Silenziosa: non apre l'accordione.
function prenRestoreSlot(){
  if(!PREN_UNICO)return;
  let s=null;
  try{s=JSON.parse(localStorage.getItem(PREN_RIASS_KEY)||'null');}catch(e){}
  if(!s||!s.riass)return;
  ucSetState('pren','loaded',s.riass,true);
  const li=document.getElementById('prenLoadedInfo');if(li)li.classList.add('visible');
  if(s.ts){try{restoreUploadTs('prenTs',s.ts);}catch(e){}}
}

// Collegamento dello slot Upload Center (click, drag&drop, input file) — stesso schema
// degli altri slot. La visibilità viene applicata subito: con PREN_UNICO=false questo
// slot resta nascosto e riappaiono i tre che sostituisce.
(function(){
  const box=document.getElementById('prenUploadBox');
  const inp=document.getElementById('prenFileInput');
  try{prenApplicaVisibilitaSlot();}catch(e){}
  try{prenRestoreSlot();}catch(e){}
  if(!inp)return;
  if(box){
    box.addEventListener('click',()=>inp.click());
    box.addEventListener('dragover',e=>{e.preventDefault();box.classList.add('dragover');});
    box.addEventListener('dragleave',()=>box.classList.remove('dragover'));
    box.addEventListener('drop',e=>{
      e.preventDefault();box.classList.remove('dragover');
      const f=e.dataTransfer.files[0];
      if(f&&/pdf$/i.test(f.type||f.name))prenHandlePdf(f);
      else ucSetState('pren','error','Carica un PDF.');
    });
  }
  inp.addEventListener('change',e=>{
    const f=e.target.files[0];
    if(f)prenHandlePdf(f);
    e.target.value='';
  });
})();

// §§ CONFERME — finestra Compass al posto di confirm()/alert() del browser
// Quelle native mostrano "compass-qm.com dice", non si impaginano e compaiono ancorate in
// alto. Questa riusa l'impianto del dialogo di stampa ed è centrata sullo schermo.
//
// cqConferma restituisce una Promise<boolean>: chi la usa deve essere `async` e mettere
// `await`. cqAvviso è la versione a un pulsante, per i messaggi informativi.
let _cqChiudi=null;
function _cqApri(o){
  const d=document.getElementById('cqDialog');
  if(!d)return Promise.resolve(o.soloAvviso?true:window.confirm(o.titolo));   // ripiego
  document.getElementById('cqTitle').textContent=o.titolo||'';
  document.getElementById('cqSub').innerHTML=o.testo||'';
  const bOk=document.getElementById('cqOk'), bNo=document.getElementById('cqNo');
  bOk.textContent=o.ok||'Conferma';
  bNo.style.display=o.soloAvviso?'none':'';
  d.classList.add('open');
  bOk.focus();
  return new Promise(res=>{
    const fine=v=>{
      d.classList.remove('open');
      bOk.onclick=bNo.onclick=d.onclick=null;
      document.removeEventListener('keydown',tasto);
      _cqChiudi=null; res(v);
    };
    const tasto=e=>{
      if(e.key==='Escape')fine(false);
      if(e.key==='Enter')fine(true);
    };
    _cqChiudi=fine;
    bOk.onclick=()=>fine(true);
    bNo.onclick=()=>fine(false);
    // Clic fuori dal riquadro = annulla, come nelle altre finestre di Compass.
    d.onclick=e=>{if(e.target===d)fine(false);};
    document.addEventListener('keydown',tasto);
  });
}
function cqConferma(titolo,testo,opz){
  const o=opz||{};
  return _cqApri({titolo,testo,ok:o.ok||'Conferma',tipo:o.tipo||'attenzione'});
}
// Accetta anche un messaggio solo, nel formato dei vecchi alert() con gli a capo: la
// prima riga diventa il titolo, il resto la spiegazione, e gli a capo si trasformano in
// interruzioni di riga vere (in HTML \n non manda a capo).
function cqAvviso(titolo,testo,opz){
  const o=opz||{};
  let t=String(titolo||''), c=testo;
  if(c===undefined&&/\n/.test(t)){
    const i=t.indexOf('\n');
    c=t.slice(i).replace(/^\n+/,'');
    t=t.slice(0,i);
  }
  if(typeof c==='string')c=c.replace(/\n/g,'<br>');
  return _cqApri({titolo:t,testo:c||'',ok:o.ok||'Ho capito',tipo:o.tipo||'info',soloAvviso:true});
}
