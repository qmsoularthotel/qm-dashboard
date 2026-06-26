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
const DEPTS={fo:{label:'Front Office',cls:'fo',members:['Maddaloni M.','Presta P.','De Rosa T.','Pennacchio V.','Perez L.','Imparato G.','Vatiero R.','Barbosa D.','D\'Andrea F.','Grieco V.','Extra Night','Iannario R.','Extra Angelica','Extra Benedetta','Raucci A.','Ruggiero B.']},hk:{label:'Housekeeping',cls:'hk',members:['Matarese A.','Nacci M.','De Masi C.','Chiantese M.','Extra Antonella','Extra Anushka','Extra Giuditta','Extra Nunzia','Extra Roberta','Scognamillo E.','Esposito M.','Branno M.','Sarnataro A.']},bkf:{label:'Breakfast',cls:'bkf',members:['Amorese S.','Albano D.','Ferace C.','Panagodage S.']},mt:{label:'Manutenzione',cls:'mt',members:['Basile G.']}};
const ALL_STAFF=Object.values(DEPTS).flatMap(d=>d.members);
let weekData=null,activeDay=0;
const IS_REST=v=>{if(!v)return true;const u=v.trim().toUpperCase();return['R','RIPOSO','OFF','—','-','–',''].includes(u);};
// §§ TURNO — ACCORDIONI UC & UPLOAD BOX
let turnoOpen=false;
function toggleTurnoAccordion(){}
function ucToggle(key){
  const slot=document.getElementById('uc-'+key);
  const panel=document.getElementById('uc-'+key+'-panel');
  if(!panel)return;
  const isOpen=panel.classList.contains('open');
  // Chiudi tutti gli altri
  ['turno','arrivi','pul','bkf','soul','bout'].forEach(k=>{
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
      ['turno','arrivi','pul','bkf','soul','bout'].forEach(k=>{
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
function ucUpdateProgress(){
  const slots=['turno','arrivi','pul','bkf','soul','bout'];
  const loaded=slots.filter(k=>{
    const el=document.getElementById('uc-'+k);
    return el&&el.classList.contains('loaded');
  }).length;
  const bar=document.getElementById('ucProgressBar');
  const label=document.getElementById('ucProgressLabel');
  if(bar)bar.style.width=(loaded/6*100)+'%';
  if(label)label.textContent=loaded+'/6';
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
    const prompt=`Sei un assistente che analizza planning settimanali di turni per un hotel.
Analizza questa immagine/PDF del planning e restituisci SOLO un oggetto JSON valido con questa struttura esatta:
{
  "giorni": [
    {
      "label": "Lun 23/03",
      "date": "2026-03-23",
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
4. Celle con solo "-" o "." o vuote → metti "R".
5. "R" da solo → "R" (riposo). "P" è turno valido (presenza), NON è riposo.
6. Qualsiasi altro valore ("P", "AC", "CG", "AG", "CC", "NC", "NG", "FERIE", "9-17", ecc.) → valore ESATTO della cella.
7. Date "lunedì 30 marzo" → date "2026-03-30", label "Lun 30/03". Includi tutti i 7 giorni.

Restituisci SOLO il JSON, nessun testo prima o dopo.`;
    const contentBlock=isPDF
      ?{type:'document',source:{type:'base64',media_type:mediaType,data:base64}}
      :{type:'image',source:{type:'base64',media_type:mediaType,data:base64}};
    const response=await fetch('https://anthropic-proxy.qm-d82.workers.dev/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:4000,
        messages:[{
          role:'user',
          content:[
            contentBlock,
            {type:'text',text:prompt}
          ]
        }]
      })
    });
    const data=await response.json();
    if(!data.content||!data.content[0])throw new Error('Risposta vuota');
    let jsonText=data.content[0].text.replace(/```json/g,'').replace(/```/g,'').trim();
    const parsed=JSON.parse(jsonText);
    if(!parsed.giorni||!Array.isArray(parsed.giorni)||!parsed.giorni.length){
      throw new Error('Struttura JSON non valida');
    }
    // Converti date string in oggetti Date
    parsed.giorni=parsed.giorni.map(g=>({
      ...g,
      date:g.date?new Date(g.date+'T12:00:00'):new Date()
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
// §§ TURNO — RENDER & NAVIGAZIONE (loadWeekData, renderDay, buildWeekNav)
function loadWeekData(data){
  weekData=data;
  const today=new Date();
  const todayD=today.getDate();
  const todayM=today.getMonth()+1;
  const todayY=today.getFullYear();
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
      if(m2)return{y:m2[3]?parseInt(m2[3]):todayY,mo:parseInt(m2[2]),d:parseInt(m2[1])};
      const m3=g.label.match(/(\d{1,2})$/);
      if(m3)return{y:todayY,mo:todayM,d:parseInt(m3[1])};
    }
    return null;
  }
  let idx=data.giorni.findIndex(g=>{
    const p=parseLocalDate(g);
    return p&&p.d===todayD&&p.mo===todayM&&p.y===todayY;
  });
  if(idx===-1){
    // Fallback 1: cerca per abbreviazione giorno della settimana nel label (es. "Mar" per martedì)
    const dayPfx=['dom','lun','mar','mer','gio','ven','sab'][today.getDay()];
    const byDow=data.giorni.findIndex(g=>g.label&&g.label.toLowerCase().startsWith(dayPfx));
    if(byDow!==-1){
      idx=byDow;
    } else {
      // Fallback 2: primo o ultimo giorno
      const lastP=parseLocalDate(data.giorni[data.giorni.length-1]);
      const isPast=lastP&&(lastP.y<todayY||(lastP.y===todayY&&lastP.mo<todayM)||(lastP.y===todayY&&lastP.mo===todayM&&lastP.d<todayD));
      idx=isPast?data.giorni.length-1:0;
    }
  }
  activeDay=idx;buildWeekNav();renderDay(activeDay);updateSidebarInfo();
  document.getElementById('weekNavWrap').style.display='block';
  document.getElementById('loadedInfo').classList.add('visible');
  document.getElementById('btnReload').style.display='block';
}
function buildWeekNav(){const nav=document.getElementById('weekNav');nav.innerHTML='';weekData.giorni.forEach((g,i)=>{const btn=document.createElement('button');btn.className='wday-btn'+(i===activeDay?' active':'');btn.textContent=g.label.split(' ')[0].substring(0,3);btn.title=g.label;btn.onclick=()=>{activeDay=i;renderDay(i);updateWeekNavActive();updateSidebarInfo();};nav.appendChild(btn);});document.getElementById('weekRangeLabel').textContent=weekData.giorni[0].label+' – '+weekData.giorni[weekData.giorni.length-1].label;}
function updateWeekNavActive(){document.querySelectorAll('.wday-btn').forEach((b,i)=>b.classList.toggle('active',i===activeDay));}
const IS_ABSENT=v=>{if(!v)return false;const u=v.trim().toUpperCase();return['R','RIPOSO','OFF','FERIE'].includes(u);};
function updateSidebarInfo(){if(!weekData)return;const g=weekData.giorni[activeDay];document.getElementById('loadedDate').textContent=g.label;document.getElementById('loadedActive').textContent=ALL_STAFF.filter(n=>!IS_REST(getShift(g.shifts,n))).length+' in turno';document.getElementById('loadedAbsent').textContent=ALL_STAFF.filter(n=>IS_ABSENT(getShift(g.shifts,n))).length+' non in servizio';}
// Cerca lo shift di un membro DEPTS in modo case-insensitive
function getShift(shifts,name){
  if(shifts[name]!==undefined)return shifts[name];
  const low=name.toLowerCase();
  const key=Object.keys(shifts).find(k=>k.toLowerCase()===low);
  return key!==undefined?shifts[key]:undefined;
}
function renderDay(idx){
  const g=weekData.giorni[idx],shifts=g.shifts,area=document.getElementById('staffArea');
  // Indice case-insensitive dei nomi DEPTS per escluderli dagli extra
  const allStaffLow=new Set(ALL_STAFF.map(n=>n.toLowerCase()));
  const shiftsKeys=new Set(Object.keys(shifts).map(k=>k.toLowerCase()));
  const nonServizio=ALL_STAFF.filter(n=>shiftsKeys.has(n.toLowerCase())&&IS_REST(getShift(shifts,n)));
  let html='';
  if(nonServizio.length)html+=`<div class="non-servizio-strip"><span class="ns-label">Non in servizio — ${g.label}</span>${nonServizio.map(n=>`<span class="ns-chip">${n}</span>`).join('')}</div>`;
  const shiftRow=(n,sv,cls)=>`<div class="staff-row" style="cursor:pointer;" title="Clicca per correggere" onclick="editShift(${idx},'${n.replace(/'/g,"\\'")}')"><span class="sname">${n}</span><span class="sshift ${cls}">${sv||'—'}</span></div>`;
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
    const showMembers=key==='mt'?dept.members:[...inT,...extras];
    if(!showMembers.length)return;
    const inTCount=inT.length+extras.length;
    html+=`<div class="staff-dept-card"><div class="sdh"><span class="sdh-name ${dept.cls}">${dept.label}</span><span class="sdh-count">${inTCount} in turno</span></div><div class="staff-list">${showMembers.map(n=>{const sv=(getShift(shifts,n)||'').trim();const isActive=key==='mt'?!IS_REST(sv):['P','AC','CG','AG','CC','NC','NG'].includes(sv);return shiftRow(n,sv,isActive?'ss-active':'ss-special');}).join('')}</div></div>`;
  });
  html+='</div>';area.innerHTML=html;
}
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
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_weekData',value:null})}).catch(()=>{});}catch(e){}document.getElementById('loadedInfo').classList.remove('visible');document.getElementById('weekNavWrap').style.display='none';document.getElementById('btnReload').style.display='none';const ts=document.getElementById('turnoTs');if(ts){ts.textContent='';ts.classList.remove('visible');}document.getElementById('staffArea').innerHTML=`<div class="ov-empty"><div class="ov-empty-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="ov-empty-text">Nessun turno caricato</div><div class="ov-empty-sub">Carica uno screenshot o PDF del planning dalla sidebar</div></div>`;}
// §§ NAVIGAZIONE VISTE (setView, pageTitles, toggleRecGroup)
const pageTitles={overview:'Panoramica del giorno',registrazione:'Registration Cards',checklist:'Checklist operativa','recensioni-sa':'Recensioni SoulArt','recensioni-bh':'Recensioni Boutique','recensioni-sl':'Recensioni San Liborio','recensioni-pr':'Recensioni Principe','recensioni-ms':'Recensioni Mastrangelo','recensioni-ar':'Recensioni Art Resort','recensioni-sb':'Recensioni Santa Brigida','recensioni-exp-sa':'Expedia — SoulArt','recensioni-exp-bh':'Expedia — Boutique','recensioni-exp-ar':'Expedia — Art Resort','recensioni-exp-sb':'Expedia — Santa Brigida',hkpsheet:'Housekeeping — SoulArt',hkpsheetar:'Housekeeping — Art Resort',bkfsheet:'Breakfast Sheet — SoulArt',bkfsheetar:'Breakfast Sheet — Galleria',dvr:'DVR','miniapp':'Mini App',inventario:'Inventari Detersivi','turni-pref':'Preferenze Turni'};
const breadcrumbs={overview:'Operativo Quotidiano',registrazione:'Operativo Quotidiano',checklist:'Operativo Quotidiano',hkpsheet:'Operativa Housekeeping',hkpsheetar:'Operativa Housekeeping',bkfsheet:'Breakfast Sheet',bkfsheetar:'Breakfast Sheet','recensioni-sa':'Qualità · Recensioni','recensioni-bh':'Qualità · Recensioni','recensioni-sl':'Qualità · Recensioni','recensioni-pr':'Qualità · Recensioni','recensioni-ms':'Qualità · Recensioni','recensioni-ar':'Qualità · Recensioni','recensioni-sb':'Qualità · Recensioni','recensioni-exp-sa':'Qualità · Expedia','recensioni-exp-bh':'Qualità · Expedia','recensioni-exp-ar':'Qualità · Expedia','recensioni-exp-sb':'Qualità · Expedia',dvr:'Sicurezza',miniapp:'Strumenti','turni-pref':'Operativo Quotidiano'};
let hkpGroupOpen=false;
function toggleHkpGroup(){
  hkpGroupOpen=!hkpGroupOpen;
  document.getElementById('hkpGroupToggle').classList.toggle('open',hkpGroupOpen);
  document.getElementById('hkpGroupItems').classList.toggle('open',hkpGroupOpen);
}
// §§ HKP OPERATIVE — Google Sheets (hkpLoad, hkpRenderAll, hkpRenderContent, hkpTab, hkpSave, hkpRestore)
const HKP_URL_DEFAULTS={
  sa:{foglio:'https://docs.google.com/spreadsheets/d/1lhbaUyFTzLX6NNForKkad3KQTF9HH0BB1BFdhZJZSmo/edit',script:'https://script.google.com/macros/s/AKfycbw1xDrmcRUm0WqM47wTmTin4eqC4wJn9w1KLZbq2XiMryEu6a2UWNsUF6hYcNRjVYgc/exec'},
  ar:{foglio:'https://docs.google.com/spreadsheets/d/1pwqVFHiix6LSSIao-LhX4h5vN2psXLJrTRVMl2eJDGs/edit',script:'https://script.google.com/macros/s/AKfycbyiWIlDqHcaCQPmyZ5qV9LKET-eSaFpl5k4u2uKZse1D0NstbBzReidBIa4s1t7gdA/exec'}
};
let HKP_CONFIG={sa:{...HKP_URL_DEFAULTS.sa},ar:{...HKP_URL_DEFAULTS.ar}};
function hkpSaveConfig(){
  const json=JSON.stringify(HKP_CONFIG);
  try{localStorage.setItem('qm_hkp_config',json);}catch(e){}
  kvSet('qm_hkp_config',json).catch(()=>{});
}
function hkpRestoreConfig(){
  try{const s=localStorage.getItem('qm_hkp_config');if(s){const p=JSON.parse(s);['sa','ar'].forEach(k=>{if(p[k]?.foglio)HKP_CONFIG[k].foglio=p[k].foglio;if(p[k]?.script)HKP_CONFIG[k].script=p[k].script;});}}catch(e){}
  ['sa','ar'].forEach(k=>{const link=document.getElementById('hkp-'+k+'-link');if(link)link.href=HKP_CONFIG[k].foglio;});
}
function hkpEditUrl(p){
  const nome=p==='sa'?'SoulArt':'Art Resort';
  const curFoglio=HKP_CONFIG[p].foglio;
  const curScript=HKP_CONFIG[p].script;
  const newFoglio=(prompt(`[${nome}] URL Google Sheets (Apri foglio):\n\nIncolla il nuovo URL del foglio mensile:`,curFoglio)||'').trim();
  if(!newFoglio||newFoglio===curFoglio){return;}
  HKP_CONFIG[p].foglio=newFoglio;
  const newScript=(prompt(`[${nome}] URL Apps Script (Aggiorna dati):\n\nIncolla il nuovo URL del deploy Apps Script (.../exec):`,curScript)||'').trim();
  if(newScript&&newScript!==curScript)HKP_CONFIG[p].script=newScript;
  hkpSaveConfig();
  const link=document.getElementById('hkp-'+p+'-link');if(link)link.href=HKP_CONFIG[p].foglio;
  alert(`URL ${nome} aggiornati. Clicca Aggiorna per ricaricare i dati.`);
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
      tasks:['Fondo','Filtri AC','Lav. Piumoni','Lav. Tende','Lav. Vetri'],
      rooms:['ART 01','ART 02','ART 03','ART 04','ART 05','ART 06','ART 07','ART 08','ART 09','ART 10','ART 11','ART 12','ART 13','ART 14','ART 15','ART 16','ART 17','ART 18','ART 19','ART 20','ART 21','ART 22','201','203','204','205','206','207','208','209','210','211'],
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
      tasks:['Fondo','Filtri AC','Lav. Piumoni','Lav. Tende','Lav. Vetri'],
      rooms:['AR 01','AR 02','AR 03','AR 04','AR 05','AR 06','AR 07','AR 08','AR 09','AR 10'],
    },
  },
};
let HKP_NTAB={sa:'camere',ar:'camere'};
let HKP_NMON={sa:'',ar:''};
let _hkpNdata={};   // {p_yyyy-mm: {cellId: val}}
let _hkpNdebounce={};
let _hkpNsel={drag:false,cells:new Set()};
const HKP_SYM={RP:'hkp-ripasso',ND:'hkp-nd',LIB:'open-sign'};
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
function hkpNPrint(p){
  const tab=HKP_NTAB[p]||'camere';
  const tabLabels={camere:'Camere',aree:'Aree Comuni',fondi:'Fondi & Lavaggi'};
  const hotel=p==='sa'?'SoulArt Hotel':'Art Resort';
  const [y,m]=hkpNCurMon(p).split('-').map(Number);
  const monName=(HKP_MON_NAMES||['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'])[m-1];
  const days=new Array(new Date(y,m,0).getDate()).fill(0).map((_,i)=>i+1);
  const rows=hkpNGetRows(p,tab);
  const data=(_hkpNdata[hkpNCacheKey(p)]||{})[tab]||{};

  // Build totals
  const rowTotals={},dayTotals={};
  rows.forEach((row,ri)=>{
    let rt=0;
    days.forEach(d=>{
      const v=hkpNGetCell(p,tab,ri,d);
      const n=v.split('/').reduce((s,x)=>{const num=parseFloat(x.trim());return s+(isNaN(num)?0:num);},0);
      rt+=n;dayTotals[d]=(dayTotals[d]||0)+n;
    });
    rowTotals[ri]=rt;
  });
  const grandTot=Object.values(rowTotals).reduce((a,b)=>a+b,0);

  // Build print HTML
  let th='<tr><th style="background:#1E4080;color:#fff;padding:6px 10px;white-space:nowrap;border:1px solid #ccc;">Gruppo</th>'
        +'<th style="background:#1E4080;color:#fff;padding:6px 10px;white-space:nowrap;border:1px solid #ccc;">Camera</th>';
  days.forEach(d=>th+='<th style="background:#1E4080;color:#fff;padding:4px 6px;text-align:center;border:1px solid #ccc;font-size:11px;">'+d+'</th>');
  th+='<th style="background:#1a5c2e;color:#fff;padding:4px 8px;text-align:center;border:1px solid #ccc;">Tot</th></tr>';

  let groups=[];
  if(tab==='camere'){
    const roomDef=HKP_ROOMS[p]||[];
    roomDef.forEach(g=>g.rooms.forEach(r=>{groups.push({group:g.label,room:r});}));
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

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${hotel} — HKP ${tabLabels[tab]} ${monName} ${y}</title>
<style>
@page{size:A4 landscape;margin:10mm}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;margin:0;padding:0}
h2{margin:0 0 4px;font-size:15px;color:#1E4080}
p{margin:0 0 10px;font-size:11px;color:#555}
table{border-collapse:collapse;width:100%}
@media print{button{display:none}}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
  <div><h2>${hotel} — ${tabLabels[tab]}</h2><p>${monName} ${y}</p></div>
  <button onclick="window.print()" style="padding:6px 14px;background:#1E4080;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">🖨 Stampa</button>
</div>
<table><thead>${th}</thead><tbody>${tbody}</tbody></table>
</body></html>`;

  const w=window.open('','_blank','width=1100,height=750');
  if(w){w.document.write(html);w.document.close();}
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
  const dayTotals={};const rowTotals={};const hwCounts={};
  rows.forEach((row,ri)=>{
    days.forEach(d=>{
      const v=hkpNGetCell(p,tab,ri,d);
      if(!v)return;
      dayTotals[d]=(dayTotals[d]||0)+1;
      rowTotals[ri]=(rowTotals[ri]||0)+1;
      v.split('/').forEach(k=>{const t=k.trim();if(t)hwCounts[t]=(hwCounts[t]||0)+1;});
    });
  });
  const maxCam=Math.max(...rows.map(r=>r.name.length));
  const RW=Math.max(70,maxCam*9+20);
  const maxGrp=Math.max(...conf.map(g=>Math.max(...g.g.split('\n').map(l=>l.length))));
  const GW=Math.max(70,Math.min(110,maxGrp*7+14));
  const DW=46;const TOTW=46;
  const RH=36; // altezza riga fissa per allineamento tra le due tabelle
  const B='border:1px solid #d8dae0;';
  const today=new Date();

  // === TABELLA SINISTRA: Gruppo (rowspan) + Camera ===
  // height:RH su ogni <tr> impedisce al rowspan di alterare le altezze → allineamento garantito
  let L='<table style="border-collapse:collapse;table-layout:fixed;">';
  L+='<colgroup><col style="width:'+GW+'px"><col style="width:'+RW+'px"></colgroup>';
  L+='<thead><tr style="height:'+RH+'px;">';
  L+='<th style="background:var(--accent,#1E4080);color:#fff;'+B+'padding:5px 4px;font-size:12px;font-weight:700;text-align:center;height:'+RH+'px;">Gruppo</th>';
  L+='<th style="background:#f5f6f8;'+B+'padding:5px 10px;font-size:14px;font-weight:700;text-align:left;white-space:nowrap;height:'+RH+'px;"></th>';
  L+='</tr></thead><tbody>';
  rows.forEach((row,ri)=>{
    L+='<tr style="height:'+RH+'px;">';
    if(row.isFirst){
      L+='<td rowspan="'+row.grpSize+'" style="background:var(--accent,#1E4080);color:#fff;'+B
        +'padding:4px 5px;font-size:13px;font-weight:700;text-align:center;vertical-align:middle;'
        +'overflow:hidden;line-height:1.5;max-width:'+GW+'px;">'+row.grp.replace(/\n/g,'<br>')+'</td>';
    }
    L+='<td style="background:#fff;'+B+'padding:0 10px;font-size:15px;font-weight:500;white-space:nowrap;height:'+RH+'px;vertical-align:middle;overflow:hidden;">'+row.name+'</td>';
    L+='</tr>';
  });
  L+='<tr style="height:'+RH+'px;"><td style="background:#c8d0e8;'+B+'height:'+RH+'px;"></td>';
  L+='<td style="background:#c8d0e8;'+B+'padding:0 10px;font-size:14px;font-weight:700;color:#3a4a6b;height:'+RH+'px;vertical-align:middle;white-space:nowrap;">Totali</td></tr>';
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
    R+='<th style="background:#f5f6f8;'+B+'padding:5px 2px;font-size:13px;font-weight:'+(isToday?'800':'500')+';text-align:center;color:'+(isToday?'var(--accent,#1E4080)':'#555')+';height:'+RH+'px;'+(isToday?'border-bottom:2px solid var(--accent,#1E4080);':'')+'">'+d+'</th>';
  });
  R+='</tr></thead><tbody>';
  rows.forEach((row,ri)=>{
    R+='<tr style="height:'+RH+'px;">';
    days.forEach(d=>{
      const v=hkpNGetCell(p,tab,ri,d);
      const dual=v.includes('/');
      const isToday=today.getDate()===d&&today.getMonth()+1===mo&&today.getFullYear()===yr;
      const iw=colW[d]-2;
      R+='<td style="'+B+'padding:1px;background:'+(v?'#f0f5ff':(isToday?'#f4f7fd':'#fff'))+';height:'+RH+'px;">'
        +'<input type="text" maxlength="10" value="'+v+'" data-p="'+p+'" data-tab="'+tab+'" data-ri="'+ri+'" data-col="'+d+'" '
        +'oninput="hkpNInput(this)" onblur="hkpNBlur(this)" onfocus="hkpNFocus(this)" onkeydown="hkpNKey(this,event)" '
        +'onmousedown="hkpNDragStart(this,event)" onmouseover="hkpNDragOver(this)" '
        +'style="width:'+iw+'px;height:'+(RH-2)+'px;border:none;background:transparent;text-align:center;font-size:15px;'
        +'font-family:inherit;padding:0 2px;outline:none;color:'+(dual?'var(--accent,#1E4080)':'#1a1a1a')+';font-weight:'+(v?'700':'400')+';'
        +'cursor:default;display:block;caret-color:transparent;box-sizing:border-box;"/></td>';
    });
    R+='</tr>';
  });
  R+='<tr style="height:'+RH+'px;">';
  days.forEach(d=>R+='<td style="'+B+'text-align:center;background:#c8d0e8;color:#3a4a6b;font-size:14px;font-weight:700;height:'+RH+'px;vertical-align:middle;padding:0 2px;">'+(dayTotals[d]||'')+'</td>');
  R+='</tr></tbody></table>';

  // Wrapper: sinistra fissa + destra scrollabile
  const symBtnStyle='display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border:1px solid #d0d3db;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;color:#333;font-weight:600;';
  let h='<div style="font-size:17px;font-weight:700;color:#1a1a1a;padding:0 0 8px;letter-spacing:.01em;">'+monLabel+'</div>';
  h+='<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">';
  const imgStyle='height:28px;width:auto;mix-blend-mode:multiply;';
  h+='<button onclick="hkpNInsertSymbol(\''+p+'\',\'RP\')" style="'+symBtnStyle+'"><img src="img/hkp-ripasso.'+HKP_SYM_EXT+'" style="'+imgStyle+'"> Ripasso</button>';
  h+='<button onclick="hkpNInsertSymbol(\''+p+'\',\'ND\')" style="'+symBtnStyle+'"><img src="img/hkp-nd.'+HKP_SYM_EXT+'" style="'+imgStyle+'"> Non disturbare</button>';
  h+='<button onclick="hkpNInsertSymbol(\''+p+'\',\'LIB\')" style="'+symBtnStyle+'"><img src="img/open-sign.'+HKP_SYM_EXT+'" style="'+imgStyle+'"> Camera libera</button>';
  h+='<button onclick="hkpNInsertSymbol(\''+p+'\',\'\')" style="'+symBtnStyle+'background:#fef2f2;border-color:#fca5a5;color:#b91c1c;">✕ Cancella</button>';
  h+='</div>';
  h+='<div style="display:flex;border:1px solid #d0d3db;border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06);">';
  h+='<div data-hkpnl="'+p+'" style="flex-shrink:0;border-right:2px solid var(--accent,#1E4080);overflow:hidden;">'+L+'</div>';
  h+='<div data-hkpnr="'+p+'" style="overflow-x:auto;flex:1;">'+R+'</div>';
  h+='</div>';
  // Riepilogo cameriere
  const colors=[['#dbeafe','#1d4ed8'],['#fef3c7','#92400e'],['#dcfce7','#166534'],['#fce7f3','#9d174d'],['#ede9fe','#4c1d95'],['#ffedd5','#9a3412']];
  const sorted=Object.entries(hwCounts).sort((a,b)=>b[1]-a[1]);
  if(sorted.length){
    h+='<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;">';
    sorted.forEach(([init,cnt],i)=>{
      const [bg,fg]=colors[i%colors.length];
      const symFile=HKP_SYM[init.toUpperCase()];
      const avatar=symFile
        ?'<img src="img/'+symFile+'.'+HKP_SYM_EXT+'" style="width:36px;height:36px;object-fit:contain;mix-blend-mode:multiply;">'
        :'<span style="display:inline-flex;width:36px;height:36px;border-radius:50%;background:'+bg+';color:'+fg+';font-size:12px;font-weight:800;align-items:center;justify-content:center;">'+init.substring(0,3)+'</span>';
      h+='<div style="background:#fff;border-radius:8px;padding:10px 14px;border:1px solid #e2e4e8;display:flex;align-items:center;gap:10px;">';
      h+=avatar;
      h+='<div><div style="font-size:24px;font-weight:700;line-height:1.1;color:#1a1a1a;">'+cnt+'</div><div style="font-size:12px;color:#666;margin-top:1px;">'+init+'</div></div></div>';
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
    img.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;height:90%;object-fit:contain;mix-blend-mode:multiply;pointer-events:none;z-index:2;image-rendering:-webkit-optimize-contrast;image-rendering:crisp-edges;';
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
    if(el){el.value=code;_hkpNUpdateCellDisplay(el);el.parentElement.style.background=code?'#fff':'#fff';}
  });
  clearTimeout(_hkpNdebounce[p]);
  hkpNSave(p);
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
  const tasks=conf.tasks;const rooms=conf.rooms;
  const taskTotals=tasks.map((_,ti)=>rooms.reduce((s,_,ri)=>s+(parseInt(hkpNGetCell(p,'fondi',ri,ti))||0),0));
  const roomTotals=rooms.map((_,ri)=>tasks.reduce((s,_,ti)=>s+(parseInt(hkpNGetCell(p,'fondi',ri,ti))||0),0));
  const maxCam=Math.max(...rooms.map(r=>r.length));
  const RW=Math.max(70,maxCam*9+20);
  const TW=90;const B='border:1px solid #d8dae0;';
  const stickyR='position:sticky;left:0;z-index:2;background:#fff;'+B+'border-right:2px solid var(--accent,#1E4080);padding:6px 10px;font-size:15px;font-weight:500;white-space:nowrap;';
  let h='<div style="overflow-x:auto;border:1px solid #d0d3db;border-radius:8px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06);">';
  h+='<table style="border-collapse:collapse;table-layout:fixed;">';
  h+='<colgroup><col style="width:'+RW+'px">';
  tasks.forEach(()=>h+='<col style="width:'+TW+'px">');
  h+='<col style="width:46px"></colgroup>';
  h+='<thead><tr>';
  h+='<th style="position:sticky;left:0;z-index:3;background:var(--accent,#1E4080);color:#fff;'+B+'border-right:2px solid rgba(255,255,255,.3);padding:8px 10px;font-size:14px;font-weight:700;text-align:left;white-space:nowrap;">Camera</th>';
  tasks.forEach(t=>h+='<th style="background:#f5f6f8;'+B+'padding:8px 8px;font-size:13px;font-weight:600;text-align:center;white-space:nowrap;color:#444;">'+t+'</th>');
  h+='<th style="background:#1a5c2e;color:#fff;'+B+'padding:8px;font-size:13px;font-weight:700;text-align:center;">Tot</th>';
  h+='</tr></thead><tbody>';
  rooms.forEach((room,ri)=>{
    const rTot=roomTotals[ri];
    h+='<tr><td style="'+stickyR+'">'+room+'</td>';
    tasks.forEach((_,ti)=>{
      const v=hkpNGetCell(p,'fondi',ri,ti);
      h+='<td style="'+B+'padding:1px;background:'+(v?'#f0f5ff':'#fff')+';">'
        +'<input type="number" min="0" max="99" value="'+v+'" data-p="'+p+'" data-tab="fondi" data-ri="'+ri+'" data-col="'+ti+'" '
        +'oninput="hkpNInput(this)" onblur="hkpNBlur(this)" onfocus="hkpNFocus(this)" onkeydown="hkpNKey(this,event)" '
        +'style="width:'+TW+'px;border:none;background:transparent;text-align:center;font-size:15px;font-family:inherit;padding:6px 2px;outline:none;font-weight:'+(v?'700':'400')+';display:block;"/></td>';
    });
    h+='<td style="'+B+'text-align:center;background:#d4edda;color:#1a5c2e;font-size:15px;font-weight:700;padding:6px 4px;">'+(rTot||'')+'</td></tr>';
  });
  const grandTot=taskTotals.reduce((a,b)=>a+b,0);
  h+='<tr><td style="position:sticky;left:0;z-index:2;background:#d4edda;'+B+'border-right:2px solid var(--accent,#1E4080);padding:6px 10px;font-size:15px;font-weight:700;color:#1a5c2e;white-space:nowrap;">Totali</td>';
  taskTotals.forEach(t=>h+='<td style="'+B+'text-align:center;background:#d4edda;color:#1a5c2e;font-size:14px;font-weight:700;padding:6px 4px;">'+(t||'')+'</td>');
  h+='<td style="'+B+'text-align:center;background:#c3e6cb;color:#155724;font-size:15px;font-weight:800;padding:6px 4px;">'+(grandTot||'')+'</td></tr>';
  h+='</tbody></table></div>';
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
  // Delete/Backspace su selezione multipla → svuota tutte le celle
  if((e.key==='Delete'||e.key==='Backspace')&&_hkpNsel.cells.size>1){
    e.preventDefault();
    const p=input.dataset.p;
    _hkpNsel.cells.forEach(key=>{
      const [sp,stab,sri,scol]=key.split(':');
      hkpNSetCell(sp,stab,parseInt(sri),scol,'');
    });
    _hkpNsel.cells.clear();
    clearTimeout(_hkpNdebounce[p]);
    hkpNSave(p);
    hkpNRender(p);
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
  if(id==='hkpsheet'||id==='hkpsheetar'){if(!hkpGroupOpen){hkpGroupOpen=true;document.getElementById('hkpGroupToggle').classList.add('open');document.getElementById('hkpGroupItems').classList.add('open');}}
  if(id==='bkfsheet'||id==='bkfsheetar'){if(!bkfGroupOpen){bkfGroupOpen=true;document.getElementById('bkfGroupToggle').classList.add('open');document.getElementById('bkfGroupItems').classList.add('open');}}
  if(id.startsWith('recensioni-')&&!id.startsWith('recensioni-exp-')){if(!recGroupOpen){recGroupOpen=true;document.getElementById('recGroupToggle').classList.add('open');document.getElementById('recGroupItems').classList.add('open');}}
  if(id.startsWith('recensioni-exp-')){if(!expGroupOpen){expGroupOpen=true;document.getElementById('expGroupToggle').classList.add('open');document.getElementById('expGroupItems').classList.add('open');}}
  try{localStorage.setItem('qm_last_view',id);}catch(e){}
  if(id==='inventario'){try{invRender();}catch(e){}}
  if(id==='turni-pref'){try{turniPrefRender();turniPrefMarkAllSeen();}catch(e){}}
  if(id==='controllo-mattino'){try{cmLoad();}catch(e){}}
  document.querySelector('.content').scrollTo({top:0,behavior:'instant'});
  if(id==='overview'&&weekData){
    try{loadWeekData(weekData);}catch(e){}
    try{refreshOverviewForDate(new Date());}catch(e){}
  }
  if(id==='hkpsheet')setTimeout(()=>hkpNRender('sa'),50);
  if(id==='hkpsheetar')setTimeout(()=>hkpNRender('ar'),50);
  if(id==='bkfsheet')setTimeout(bkfRenderChart,50);
  if(id==='bkfsheetar')setTimeout(bkfRenderChartAR,50);
  if(id==='miniapp'){setTimeout(miniappRender,50);setTimeout(loadHkAccessStats,100);setTimeout(loadBkfAccessStats,150);setTimeout(loadDvrAccessStats,200);setTimeout(miniappNoTrackRender,50);}
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
function dvrEmpDelete(id){
  if(!confirm('Eliminare questo dipendente?'))return;
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
function dvrDelete(type,id){
  if(!confirm('Eliminare questa voce?'))return;
  DVR_DATA[_dvrSoc][type]=(DVR_DATA[_dvrSoc][type]||[]).filter(x=>x.id!==id);
  dvrSave();dvrRenderPanel(type);
}
async function loadDvrAccessStats(){
  try{
    const res=await fetch(PROXY+'/kv/get?key=qm_dvr_access');
    const json=await res.json();
    if(!json.value)return;
    const d=JSON.parse(json.value);
    const todayStr=new Date().toISOString().slice(0,10);
    const ms=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    const fmtDt=iso=>{if(!iso)return'—';const dt=new Date(iso);return dt.getDate()+' '+ms[dt.getMonth()]+' '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');};
    const todayCount=d.todayDate===todayStr?d.today:0;
    const el=document.getElementById('dvr-access-today');
    const elT=document.getElementById('dvr-access-total');
    const elL=document.getElementById('dvr-access-last');
    if(el)el.textContent=todayCount;
    if(elT)elT.textContent=d.total||0;
    if(elL)elL.textContent=fmtDt(d.last);
    const elDev=document.getElementById('dvr-access-devices');
    if(elDev&&d.devices&&Object.keys(d.devices).length){
      const devEntries=Object.entries(d.devices).sort((a,b)=>(a[1].firstSeen||a[1].last||'').localeCompare(b[1].firstSeen||b[1].last||''));
      elDev.innerHTML=devEntries.map(([,dev],idx)=>{
        const devToday=dev.todayDate===todayStr?dev.today:0;
        const isOnline=dev.last&&(Date.now()-new Date(dev.last).getTime())<3600000;
        return`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;${idx>0?'border-top:1px solid var(--border-light);':''}">
          <span style="width:7px;height:7px;border-radius:50%;background:${isOnline?'var(--green)':'var(--border)'};flex-shrink:0;"></span>
          <span style="flex:1;font-size:var(--fs-sm);font-weight:500;">Dispositivo ${idx+1}</span>
          <span style="font-size:var(--fs-xs);color:var(--text-dim);">${devToday>0?`<b>${devToday}</b> oggi · `:''}<span style="color:var(--text-muted);">${dev.total||0} tot</span></span>
          <span style="font-size:10px;color:var(--text-muted);">${fmtDt(dev.last)}</span>
        </div>`;
      }).join('');
    }else if(elDev){elDev.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);padding:6px 0;">Nessun dato per dispositivo</div>';}
  }catch(e){}
}
function miniappNoTrackToggle(){
  const active=localStorage.getItem('qm_no_track')==='1';
  if(active){localStorage.removeItem('qm_no_track');}else{localStorage.setItem('qm_no_track','1');}
  miniappNoTrackRender();
}
function miniappNoTrackRender(){
  const btn=document.getElementById('notrack-btn');
  if(!btn)return;
  const active=localStorage.getItem('qm_no_track')==='1';
  btn.textContent=active?'✓ Questo dispositivo è escluso':'Escludi questo dispositivo';
  btn.style.background=active?'var(--green)':'var(--surface2)';
  btn.style.color=active?'#fff':'var(--text-dim)';
  btn.style.border=active?'none':'1px solid var(--border)';
}
function miniappCopy(inputId,btn){
  const inp=document.getElementById(inputId);
  navigator.clipboard.writeText(inp.value).then(()=>{
    const orig=btn.textContent;btn.textContent='✓ Copiato';btn.style.background='var(--green)';
    setTimeout(()=>{btn.textContent=orig;btn.style.background='';},2000);
  }).catch(()=>{inp.select();document.execCommand('copy');});
}
// §§ MINI APP — RENDER (miniappRenderBkf, loadHkAccessStats, renderPianoGiorno)
function miniappRender(){miniappRenderBkf();miniappRenderPiano();}
async function loadHkAccessStats(){
  try{
    const res=await fetch(PROXY+'/kv/get?key=qm_hk_access');
    const json=await res.json();
    if(!json.value)return;
    const d=JSON.parse(json.value);
    const todayStr=new Date().toISOString().slice(0,10);
    const ms=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    const fmtDt=iso=>{if(!iso)return'—';const dt=new Date(iso);return dt.getDate()+' '+ms[dt.getMonth()]+' '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');};
    const todayCount=d.todayDate===todayStr?d.today:0;
    const el=document.getElementById('hk-access-today');
    const elT=document.getElementById('hk-access-total');
    const elL=document.getElementById('hk-access-last');
    if(el)el.textContent=todayCount;
    if(elT)elT.textContent=d.total||0;
    if(elL)elL.textContent=fmtDt(d.last);
    // Tabella per dispositivo
    const elDev=document.getElementById('hk-access-devices');
    if(elDev&&d.devices&&Object.keys(d.devices).length){
      // Ordina per firstSeen (primo accesso) per numerarli stabilmente
      const devEntries=Object.entries(d.devices).sort((a,b)=>(a[1].firstSeen||a[1].last||'').localeCompare(b[1].firstSeen||b[1].last||''));
      elDev.innerHTML=devEntries.map(([,dev],idx)=>{
        const devToday=dev.todayDate===todayStr?dev.today:0;
        const isOnline=dev.last&&(Date.now()-new Date(dev.last).getTime())<3600000;
        const label=dev.name||('Dispositivo '+(idx+1));
        return`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;${idx>0?'border-top:1px solid var(--border-light);':''}">
          <span style="width:7px;height:7px;border-radius:50%;background:${isOnline?'var(--green)':'var(--border)'};flex-shrink:0;"></span>
          <span style="flex:1;font-size:var(--fs-sm);font-weight:500;">${label}</span>
          <span style="font-size:var(--fs-xs);color:var(--text-dim);">${devToday>0?`<b>${devToday}</b> oggi · `:''}<span style="color:var(--text-muted);">${dev.total||0} tot</span></span>
          <span style="font-size:10px;color:var(--text-muted);">${fmtDt(dev.last)}</span>
        </div>`;
      }).join('');
    }else if(elDev){elDev.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);padding:6px 0;">Nessun dato per dispositivo</div>';}
  }catch(e){}
}
async function loadBkfAccessStats(){
  try{
    const res=await fetch(PROXY+'/kv/get?key=qm_bkf_access');
    const json=await res.json();
    const todayStr=new Date().toISOString().slice(0,10);
    const ms=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    const fmtDt=iso=>{if(!iso)return'—';const dt=new Date(iso);return dt.getDate()+' '+ms[dt.getMonth()]+' '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');};
    const d=json.value?JSON.parse(json.value):null;
    const todayCount=d&&d.todayDate===todayStr?d.today:0;
    const el=document.getElementById('bkf-access-today');
    const elT=document.getElementById('bkf-access-total');
    const elL=document.getElementById('bkf-access-last');
    if(el)el.textContent=todayCount;
    if(elT)elT.textContent=d?.total||0;
    if(elL)elL.textContent=fmtDt(d?.last);
    const elDev=document.getElementById('bkf-access-devices');
    if(elDev){
      if(d&&d.devices&&Object.keys(d.devices).length){
        const devEntries=Object.entries(d.devices).sort((a,b)=>(a[1].firstSeen||a[1].last||'').localeCompare(b[1].firstSeen||b[1].last||''));
        elDev.innerHTML=devEntries.map(([,dev],idx)=>{
          const devToday=dev.todayDate===todayStr?dev.today:0;
          const isOnline=dev.last&&(Date.now()-new Date(dev.last).getTime())<3600000;
          const label=dev.name||('Dispositivo '+(idx+1));
          return`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;${idx>0?'border-top:1px solid var(--border-light);':''}">
            <span style="width:7px;height:7px;border-radius:50%;background:${isOnline?'var(--green)':'var(--border)'};flex-shrink:0;"></span>
            <span style="flex:1;font-size:var(--fs-sm);font-weight:500;">${label}</span>
            <span style="font-size:var(--fs-xs);color:var(--text-dim);">${devToday>0?`<b>${devToday}</b> oggi · `:''}<span style="color:var(--text-muted);">${dev.total||0} tot</span></span>
            <span style="font-size:10px;color:var(--text-muted);">${fmtDt(dev.last)}</span>
          </div>`;
        }).join('');
      } else {
        elDev.innerHTML=`<div style="display:flex;align-items:center;gap:6px;padding:6px 0;color:var(--text-dim);font-size:var(--fs-xs);">
          <span style="width:7px;height:7px;border-radius:50%;background:var(--green);flex-shrink:0;"></span>
          <span style="font-size:var(--fs-sm);font-weight:500;">Responsabile Breakfast</span>
          <span style="margin-left:auto;font-size:var(--fs-xs);color:var(--text-muted);">accesso rilevato · no tracking</span>
        </div>`;
      }
    }
  }catch(e){}
}
function miniappRenderBkf(){
  const el=document.getElementById('miniapp-bkf-preview');if(!el)return;
  const today=new Date();
  const todayLabel=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][today.getDay()]+' '+String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0');
  if(!bkfData||!bkfData.length){el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Carica il report pasti per vedere l\'anteprima</div>';return;}
  const todayIdx=bkfData.findIndex(d=>d.label&&d.label.includes(String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')));
  const tIdx=todayIdx!==-1?todayIdx:bkfActiveDay;
  const todayData=bkfData[tIdx];
  const coperti=todayData?(todayData.adulti+todayData.bambini):0;
  const t=new Date();t.setHours(0,0,0,0);
  const gruppiOggi=(bkfGroups||[]).filter(g=>{const a=new Date(g.arrivo||g.data);a.setHours(0,0,0,0);const p=new Date(g.partenza||g.arrivo||g.data);p.setHours(0,0,0,0);return t>=a&&t<=p;});
  const totPax=gruppiOggi.reduce((s,g)=>s+g.pax,0);
  const noteOggi=(bkfNotes||{})[todayData?.label]||'';
  // Oggi
  let html=`<div style="font-size:var(--fs-xxs);font-weight:600;color:var(--accent);margin-bottom:8px;">📅 Oggi — ${todayLabel}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div style="background:var(--surface2);border-radius:7px;padding:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--accent);">${coperti}</div><div style="font-size:10px;color:var(--text-dim);">Coperti</div></div>
      <div style="background:var(--surface2);border-radius:7px;padding:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--text-muted);">${todayData?.noCol||0}</div><div style="font-size:10px;color:var(--text-dim);">Room Only</div></div>
    </div>
    ${gruppiOggi.length?`<div style="font-size:var(--fs-xxs);background:#fff3cd;border-radius:6px;padding:6px 10px;color:#856404;margin-bottom:6px;">⚠️ ${gruppiOggi.length} gruppo${gruppiOggi.length>1?'i':''} oggi — ${totPax} persone</div>`:''}
    ${noteOggi?`<div style="font-size:var(--fs-xxs);color:var(--text-muted);font-style:italic;background:var(--surface2);padding:6px 8px;border-radius:6px;margin-bottom:6px;">📋 ${noteOggi}</div>`:''}`;
  // Prossimi giorni
  const nextDays=bkfData.slice(tIdx+1,tIdx+4);
  if(nextDays.length){
    html+=`<div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px;">Prossimi giorni</div>`;
    nextDays.forEach(nd=>{
      const tot=(nd.adulti||0)+(nd.bambini||0);
      html+=`<div style="background:var(--surface2);border-radius:7px;padding:8px 10px;margin-bottom:5px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:var(--fs-xxs);font-weight:600;color:var(--text);">${nd.label}</span>
        <span style="font-size:var(--fs-xs);font-weight:700;color:var(--accent);">${tot} <span style="font-size:10px;font-weight:400;color:var(--text-dim);">cop.</span></span>
        <span style="font-size:var(--fs-xs);font-weight:600;color:var(--text-muted);">${nd.noCol||0} <span style="font-size:10px;font-weight:400;color:var(--text-dim);">RO</span></span>
      </div>`;
    });
  }
  // Grafico settimanale
  const pts=bkfData.map(d=>({label:d.label.split(' ')[0],v:(d.adulti||0)+(d.bambini||0)}));
  const W=600,H=190,PL=28,PR=8,PT=32,PB=32;
  const plotW=W-PL-PR,plotH=H-PT-PB;
  const YMAX=Math.max(20,...pts.map(p=>p.v))+8;
  const sx=i=>PL+i/(pts.length-1||1)*plotW;
  const sy=v=>PT+plotH-(v/YMAX)*plotH;
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">`;
  const linePath='M'+pts.map((p,i)=>`${sx(i)},${sy(p.v)}`).join('L');
  svg+=`<path d="${linePath}L${sx(pts.length-1)},${sy(0)} L${sx(0)},${sy(0)} Z" fill="var(--accent)" opacity="0.1"/>`;
  svg+=`<path d="${linePath}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
  pts.forEach((p,i)=>{
    const x=sx(i),y=sy(p.v),isActive=i===tIdx;
    svg+=`<circle cx="${x}" cy="${y}" r="${isActive?6:4}" fill="var(--accent)" stroke="white" stroke-width="2"/>`;
    svg+=`<text x="${x}" y="${y-13}" font-size="${isActive?20:17}" fill="var(--accent)" text-anchor="middle" font-weight="${isActive?800:600}">${p.v}</text>`;
    svg+=`<text x="${x}" y="${H-4}" font-size="14" fill="var(--text-dim)" text-anchor="middle">${p.label}</text>`;
  });
  svg+='</svg>';
  html+=`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light);">${svg}</div>`;
  el.innerHTML=html;
}
let pianoNavIdx=null; // indice giorno selezionato nel pannello overview

function pianoGetGiornoIdx(refDate){
  if(!pianoData||!pianoData.giorni)return -1;
  const ref=new Date(refDate||new Date());
  const refStr=String(ref.getDate()).padStart(2,'0')+'/'+String(ref.getMonth()+1).padStart(2,'0')+'/'+ref.getFullYear();
  const normDate=s=>s.split('/').map((p,i)=>i<2?p.padStart(2,'0'):p).join('/');
  return pianoData.giorni.findIndex(g=>g.data&&normDate(g.data)===refStr);
}

function pianoNavRender(idx){
  if(!pianoData||!pianoData.giorni||!pianoData.giorni.length)return;
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
  const _ico=_mob?'18px':'36px';
  const _numFs=_mob?'14px':'18px';
  const _dayFs=_mob?'12px':'15px';
  const _dateFs=_mob?'10px':'11px';
  const _pad=_mob?'8px 4px 6px':'12px 8px 10px';
  const _minW=_mob?'48px':'70px';
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
      <div style="display:flex;align-items:center;justify-content:center;gap:${_mob?'4px':'10px'};margin-bottom:5px;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <img src="img/icons/fermata.png" class="ov-icon" style="width:${_ico};height:${_ico};object-fit:contain;">
          <span style="font-size:${_numFs};font-weight:700;color:${fColor};line-height:1;">${totF}</span>
        </div>
        ${!_mob?`<div style="width:1px;height:40px;background:var(--border-light);"></div>`:''}
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <img src="img/icons/arrivi.png" class="ov-icon" style="width:${_ico};height:${_ico};object-fit:contain;">
          <span style="font-size:${_numFs};font-weight:700;color:${pColor};line-height:1;">${totP}</span>
        </div>
      </div>
      <div style="border-top:1px solid var(--border-light);padding-top:4px;">
        <span style="font-size:10px;color:var(--text-dim);">tot </span><span style="font-size:${_mob?'12px':'14px'};font-weight:700;color:var(--text);">${totTot}</span>
      </div>
    </div>`;
  }).join('');
}

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
    const tuttePartenze=sortRooms([...cambi,...partenze]);
    if(!tuttePartenze.length&&!fermate.length)return'';
    // KPI numerici
    const _icoSz=window.innerWidth<=768?'20px':'30px';
    let h=`<div style="margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">${label}</div>
        ${tuttePartenze.length?`<span style="display:inline-flex;align-items:center;gap:4px;font-size:15px;font-weight:700;color:var(--amber);"><img src="img/icons/arrivi.png" class="ov-icon" style="width:${_icoSz};height:${_icoSz};object-fit:contain;"> ${tuttePartenze.length}</span>`:''}
        ${cambi.length?`<span style="font-size:15px;font-weight:700;color:var(--red);">⇄ ${cambi.length}</span>`:''}
        ${fermate.length?`<span style="display:inline-flex;align-items:center;gap:4px;font-size:15px;font-weight:700;color:var(--accent);"><img src="img/icons/fermata.png" class="ov-icon" style="width:${_icoSz};height:${_icoSz};object-fit:contain;"> ${fermate.length}</span>`:''}
      </div>`;
    if(tuttePartenze.length)h+=`<div style="margin-bottom:6px;"><div style="display:flex;flex-wrap:wrap;gap:5px;">${tuttePartenze.map(r=>{const isCambio=cambi.includes(r);return`<span style="background:${isCambio?'#fce8e8':'var(--amber-bg)'};border:1px solid ${isCambio?'var(--red)':'var(--amber)'};color:${isCambio?'var(--red)':'var(--amber)'};font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;">${r}${isCambio?` ⇄`:''}</span>`;}).join('')}</div></div>`;
    if(fermate.length)h+=`<div><div style="display:flex;flex-wrap:wrap;gap:5px;">${fermate.map(r=>`<span style="background:var(--accent-bg);border:1px solid var(--accent);color:var(--accent);font-size:11px;font-weight:600;padding:4px 10px;border-radius:7px;">${r}</span>`).join('')}</div></div>`;
    h+=`</div>`;return h;
  }
  const lib=giorno.liborio||{partenze:[],fermate:[],cambi:[]};
  const bMerged={partenze:[...(giorno.boutique?.partenze||[]),...lib.partenze],fermate:[...(giorno.boutique?.fermate||[]),...lib.fermate],cambi:[...(giorno.boutique?.cambi||[]),...lib.cambi]};
  const sHtml=renderHotel('SoulArt',giorno.soulart||{}),bHtml=renderHotel('Boutique - San Liborio',bMerged);
  if(!sHtml&&!bHtml){el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Nessuna camera nel piano per questo giorno</div>';return;}
  const _mob=window.innerWidth<=768;
  const brandLogo=(!_mob&&elId==='ov-piano-preview')?`<div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0 32px;pointer-events:none;user-select:none;border-left:1px solid var(--border-light);margin-left:8px;"><span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#1A2E55;letter-spacing:.01em;white-space:nowrap;">Compass QM <span style="font-weight:300;color:var(--text-dim);margin:0 6px;">|</span><span style="font-weight:400;color:var(--text-dim);font-size:14px;"> Dashboard</span></span></div>`:'';
  el.innerHTML=`<div style="display:flex;align-items:stretch;"><div style="min-width:0;width:100%;">${sHtml}${bHtml}<div style="font-size:9px;color:var(--text-dim);margin-top:4px;">↑ partenze · = fermate · ⇄ cambio camera</div></div>${brandLogo}</div>`;
}

function pianoOvInit(){
  if(!pianoData||!pianoData.giorni)return;
  const todayIdx=pianoGetGiornoIdx();
  const idx=todayIdx!==-1?todayIdx:0;
  pianoNavRender(idx);
}

function miniappRenderPiano(){renderPianoGiorno('miniapp-piano-preview');}
// §§ UTILITÀ — FORMATTAZIONE DATE & TIMESTAMP (fmtNow, fmtUploadTs, setUploadTs)
function fmtNow(){const n=new Date();return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');}
function fmtUploadTs(ts){const n=ts?new Date(ts):new Date();const ms=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];return'↑ '+n.getDate()+' '+ms[n.getMonth()]+' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');}
const TS_TO_UC={turnoTs:'uc-turno-sub',arriviTs:'uc-arrivi-sub',pulTs:'uc-pul-sub',bkfTs:'uc-bkf-sub',soulTs:'uc-soul-sub',boutTs:'uc-bout-sub',pianoTs:'uc-piano-sub'};
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
    if(slot)slot.classList.toggle('stale',!!ts&&(Date.now()-ts)>86400000);}
}
function setUploadTs(elId,ts){const t=ts||Date.now();_setUcTs(elId,t);try{localStorage.setItem('qm_ts_'+elId,String(t));}catch(e){}}
function restoreUploadTs(elId,ts){if(!ts)return;try{const existing=parseInt(localStorage.getItem('qm_ts_'+elId)||'0');if(existing>ts){_setUcTs(elId,existing);return;}_setUcTs(elId,ts);localStorage.setItem('qm_ts_'+elId,String(ts));}catch(e){_setUcTs(elId,ts);}}
function loadStoredTs(elId){try{const t=localStorage.getItem('qm_ts_'+elId);if(t)_setUcTs(elId,parseInt(t));}catch(e){}}
const DAILY_TASKS=[
  {text:'Generazione registration cards',dept:'fo',link:'registrazione'},
  {text:'Breakfast Sheet SoulArt',dept:'bkf',link:'bkfsheet'},
  {text:'Breakfast Sheet Galleria',dept:'bkf',link:'bkfsheetar'},
  {text:'Operativa Housekeeping SoulArt',dept:'hkp',extlink:'https://docs.google.com/spreadsheets/d/1NzJCavF4hb-rHSSERSUgHBcVpHDHrSolMcwpZAtx-Pc/edit'},
  {text:'Operativa Housekeeping Art Resort',dept:'hkp',extlink:'https://docs.google.com/spreadsheets/d/1FO9YxVpojxWD1eyi_IxVwQOYbddfDk9iOLBtD-fH3qo/edit'},
  {text:'Incasso prenotazioni NR',dept:'fo'},
];
const WED_TASKS=[
  {text:'Distribuzione ai carrelli Housekeeping',dept:'hkp',badge:'Solo mer'},
];
const THU_TASKS=[
  {text:'Inventario magazzino detersivi',dept:'mt',badge:'Solo gio'},
  {text:'Compilazione registri Legionella',dept:'mt',badge:'Solo gio'},
];
const DEPT_CLS={fo:'dept-fo',hkp:'dept-hk',bkf:'dept-fb',mt:'dept-mt'};
const DEPT_LABEL={fo:'FO',hkp:'HKP',bkf:'BKF',mt:'MT'};
// §§ CHECKLIST — TASK ITEMS (buildTaskItem, getTasksForDay, renderTaskList)
function buildTaskItem(t,listId){
  const li=document.createElement('li');
  li.className='check-item';
  li.setAttribute('data-list',listId);
  const badgeHtml=t.badge?`<span style="font-size:10px;padding:1px 6px;border-radius:6px;background:var(--amber-bg);color:var(--amber);font-weight:500;">${t.badge}</span>`:'';
  const linkHtml=t.link?`<span onclick="event.stopPropagation();setView('${t.link}',document.querySelector('[onclick*=\\'${t.link}\\']'))" style="font-size:9px;padding:1px 7px;border-radius:6px;background:var(--accent-bg);color:var(--accent);cursor:pointer;flex-shrink:0;" title="Apri modulo">→ Apri</span>`:t.extlink?`<span onclick="event.stopPropagation();window.open('${t.extlink}','_blank')" style="font-size:9px;padding:1px 7px;border-radius:6px;background:var(--accent-bg);color:var(--accent);cursor:pointer;flex-shrink:0;">↗ Apri</span>`:'';
  li.innerHTML=`<div class="check-box"></div><div class="check-content"><span class="check-text">${t.text}</span><div class="check-meta"><span class="check-dept ${DEPT_CLS[t.dept]}">${DEPT_LABEL[t.dept]}</span>${badgeHtml}${linkHtml}<span class="check-time"></span></div></div>`;
  const _s=TASK_STATE[t.text];if(_s?.done){const _b=li.querySelector('.check-box'),_tx=li.querySelector('.check-text'),_te=li.querySelector('.check-time');if(_b){_b.classList.add('done');_b.textContent='✓';}if(_tx)_tx.classList.add('done');if(_te)_te.textContent=_s.time||'';}
  li.addEventListener('click',()=>toggleCheck(li,listId));
  return li;
}
function getTasksForDay(dow){
  let tasks=[...DAILY_TASKS];
  if(dow===3) tasks=[...tasks,...WED_TASKS];
  if(dow===4) tasks=[...tasks,...THU_TASKS];
  return tasks;
}
function renderTaskList(listId,labelId,counterId){
  const dow=new Date().getDay();
  const tasks=getTasksForDay(dow);
  const ul=document.getElementById(listId);
  if(!ul)return;
  ul.innerHTML='';
  tasks.forEach(t=>ul.appendChild(buildTaskItem(t,listId)));
  if(counterId)document.getElementById(counterId).textContent='0/'+tasks.length;
  const ds=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const extras=[];
  if(dow===3)extras.push('+ Mercoledì');
  if(dow===4)extras.push('+ Giovedì');
  if(labelId&&extras.length){const el=document.getElementById(labelId);if(el)el.textContent=extras.join(' ');}
}
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
    const keys=['checklist','custom_tasks','dept_custom_tasks','pulData','bkfData',
      'rev_sa','rev_bh','rev_sl','rev_pr','rev_ms','rev_ar','rev_sb',
      'rev_sent',
      'weekData','arriviData','rcGuests','bkfGroups','bkfNotes','hk_soul','hk_bout','bkfSheetARData','piano',
      'ts_rev_sa','ts_rev_bh','ts_rev_sl','ts_rev_pr','ts_rev_ms','ts_rev_ar','ts_rev_sb','dvr',
      'inv_catalog_sa','inv_catalog_ar','inv_moves_sa','inv_moves_ar','inv_orders',
      'tp_seen_until','hkp_config'];
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
              if(localTs){
                const cloudObj=JSON.parse(json.value);
                if(!cloudObj.ts||localTs>cloudObj.ts)return; // locale più recente: tieni locale
                // cloud più recente: aggiorna ts in localStorage e visual
                if(cloudObj.ts){
                  localStorage.setItem(tsKey,String(cloudObj.ts));
                  try{_setUcTs(elId,cloudObj.ts);}catch(e){}
                }
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
// §§ CHECKLIST — STATO CENTRALIZZATO & CUSTOM TASK (taskKey, syncTaskState, addCustomTask)
// ── STATO CENTRALIZZATO CHECKLIST ──
// Chiave: testo del task. Valore: {done, time}
// Usato per sincronizzare overview ↔ checklist in tempo reale
let TASK_STATE={};
function taskKey(item){
  return item.querySelector('.check-text')?.textContent?.trim()||'';
}
function syncTaskState(key, done, time){
  if(!key)return;
  TASK_STATE[key]={done,time};
  // Aggiorna tutti gli elementi con lo stesso testo in tutte le liste
  ['taskList','cl-fo','cl-hkp','cl-bkf','cl-mt','cl-custom'].forEach(listId=>{
    const ul=document.getElementById(listId);if(!ul)return;
    ul.querySelectorAll('.check-item').forEach(item=>{
      if(taskKey(item)!==key)return;
      const b=item.querySelector('.check-box');
      const t=item.querySelector('.check-text');
      const te=item.querySelector('.check-time');
      if(b){b.classList.toggle('done',done);b.textContent=done?'✓':'';}
      if(t)t.classList.toggle('done',done);
      if(te)te.textContent=done?(time||fmtNow()):'';
    });
  });
  saveChecklistState();
  updateClProgress();
}
function saveChecklistState(){
  if(Object.keys(TASK_STATE).length===0)return;
  LS.set('checklist',{date:LS.today(),state:TASK_STATE});
  // Salva task personalizzati
  const customs=[];
  const ul=document.getElementById('cl-custom');
  if(ul)ul.querySelectorAll('.check-item').forEach(item=>{
    const key=taskKey(item);
    if(key)customs.push(key);
  });
  LS.set('custom_tasks',{date:LS.today(),tasks:customs});
}
function restoreChecklistState(){
  const saved=LS.get('checklist',null);
  if(!saved||saved.date!==LS.today())return;
  TASK_STATE=saved.state||{};
  // Applica stato a tutti gli item esistenti
  ['taskList','cl-fo','cl-hkp','cl-bkf','cl-mt','cl-custom'].forEach(listId=>{
    const ul=document.getElementById(listId);if(!ul)return;
    ul.querySelectorAll('.check-item').forEach(item=>{
      const key=taskKey(item);
      const s=TASK_STATE[key];
      if(!s||!s.done)return;
      const b=item.querySelector('.check-box');
      const t=item.querySelector('.check-text');
      const te=item.querySelector('.check-time');
      if(b){b.classList.add('done');b.textContent='✓';}
      if(t)t.classList.add('done');
      if(te&&s.time)te.textContent=s.time;
    });
  });
  updateClProgress();
}
// Task personalizzati
let customTasksLoaded=false;
function addCustomTaskById(inputId){
  const inp=document.getElementById(inputId);
  if(!inp)return;
  addCustomTask(inp);
}
function addCustomTaskByDeptId(dept){
  const inp=document.getElementById('deptInput-'+dept);
  if(!inp)return;
  addCustomTaskToDept(dept,inp);
}
function addCustomTask(inp){
  // Fallback: se non riceve l'input, cerca il primo con valore non vuoto
  if(!inp||!inp.value){
    const i1=document.getElementById('customTaskInput');
    const i2=document.getElementById('customTaskInput2');
    if(i1&&i1.value.trim())inp=i1;
    else if(i2&&i2.value.trim())inp=i2;
    else return;
  }
  if(!inp)return;
  const text=inp.value.trim();
  if(!text)return;
  inp.value='';
  const otherId=inp.id==='customTaskInput'?'customTaskInput2':'customTaskInput';
  const other=document.getElementById(otherId);
  if(other)other.value='';
  // Aggiungi a entrambe le liste
  ['taskList','cl-custom'].forEach(listId=>{
    const ul=document.getElementById(listId);if(!ul)return;
    const li=document.createElement('li');
    li.className='check-item';
    li.innerHTML=`<div class="check-box"></div><div class="check-content"><span class="check-text">${text}</span><div class="check-meta"><span class="check-dept" style="background:var(--surface2);color:var(--text-dim);padding:2px 7px;border-radius:4px;font-size:10px;">★</span><span class="check-time"></span><span onclick="removeCustomTask('${text.replace(/'/g,"\\'")}',this,event)" style="font-size:9px;color:var(--text-dim);cursor:pointer;margin-left:auto;">✕</span></div></div>`;
    li.querySelector('.check-box').addEventListener('click',function(e){
      e.stopPropagation();
      const done=!this.classList.contains('done');
      syncTaskState(text, done, fmtNow());
      const tot=ul.querySelectorAll('.check-item').length;
      const dn=ul.querySelectorAll('.check-box.done').length;
      if(listId==='taskList'){const tc=document.getElementById('taskCounter');if(tc)tc.textContent=dn+'/'+tot;}
    });
    li.addEventListener('click',function(){
      const b=this.querySelector('.check-box');
      const done=!b.classList.contains('done');
      syncTaskState(text, done, fmtNow());
      const tot=ul.querySelectorAll('.check-item').length;
      const dn=ul.querySelectorAll('.check-box.done').length;
      if(listId==='taskList'){const tc=document.getElementById('taskCounter');if(tc)tc.textContent=dn+'/'+tot;}
    });
    // Applica stato esistente se già spuntato
    if(TASK_STATE[text]?.done){
      const b=li.querySelector('.check-box');const t=li.querySelector('.check-text');const te=li.querySelector('.check-time');
      if(b){b.classList.add('done');b.textContent='✓';}
      if(t)t.classList.add('done');
      if(te)te.textContent=TASK_STATE[text].time||'';
    }
    ul.appendChild(li);
  });
  // Aggiorna contatori
  const tl=document.getElementById('taskList');
  if(tl){const tc=document.getElementById('taskCounter');if(tc)tc.textContent=tl.querySelectorAll('.check-box.done').length+'/'+tl.querySelectorAll('.check-item').length;}
  const cc=document.getElementById('cl-custom');
  if(cc){const ce=document.getElementById('cl-custom-count');if(ce)ce.textContent=cc.querySelectorAll('.check-box.done').length+'/'+cc.querySelectorAll('.check-item').length;}
  updateClProgress();
  saveChecklistState();
}
function addCustomTaskToDept(dept, inp){
  // inp può essere l'elemento input oppure il bottone (in quel caso cerchiamo previousElementSibling)
  if(inp&&inp.tagName==='BUTTON')inp=inp.previousElementSibling;
  const text=((inp&&inp.value)||'').trim();
  if(!text)return;
  if(inp)inp.value='';
  const deptCls={fo:'dept-fo',hk:'dept-hk',bkf:'dept-fb',mt:'dept-mt'};
  const deptLabel={fo:'FO',hk:'HK',bkf:'BKF',mt:'MT'};
  // Aggiungi in cl-[dept] e in taskList
  ['cl-'+dept,'taskList'].forEach(listId=>{
    const ul=document.getElementById(listId);if(!ul)return;
    const li=document.createElement('li');li.className='check-item';
    const badge=`<span class="check-dept ${deptCls[dept]||''}">${deptLabel[dept]||dept.toUpperCase()}</span>`;
    li.innerHTML=`<div class="check-box"></div><div class="check-content"><span class="check-text">${text}</span><div class="check-meta">${badge}<span class="check-time"></span><span onclick="removeDeptTask('${dept}','${text.replace(/'/g,"\\'")}',this,event)" style="font-size:9px;color:var(--text-dim);cursor:pointer;margin-left:auto;">✕</span></div></div>`;
    li.addEventListener('click',function(){
      const done=!this.querySelector('.check-box').classList.contains('done');
      syncTaskState(text,done,done?fmtNow():'');
      refreshDeptCount(dept);
      const tc=document.getElementById('taskCounter');
      const tl=document.getElementById('taskList');
      if(tc&&tl)tc.textContent=tl.querySelectorAll('.check-box.done').length+'/'+tl.querySelectorAll('.check-item').length;
    });
    if(TASK_STATE[text]?.done){
      const b=li.querySelector('.check-box');const t=li.querySelector('.check-text');const te=li.querySelector('.check-time');
      if(b){b.classList.add('done');b.textContent='✓';}if(t)t.classList.add('done');if(te)te.textContent=TASK_STATE[text].time||'';
    }
    ul.appendChild(li);
  });
  refreshDeptCount(dept);
  const tl=document.getElementById('taskList');
  if(tl){const tc=document.getElementById('taskCounter');if(tc)tc.textContent=tl.querySelectorAll('.check-box.done').length+'/'+tl.querySelectorAll('.check-item').length;}
  updateClProgress();
  saveDeptCustomTasks();
}
function removeCustomTask(text, btn, evt){
  if(evt)evt.stopPropagation();
  ['taskList','cl-custom'].forEach(listId=>{
    const ul=document.getElementById(listId);if(!ul)return;
    ul.querySelectorAll('.check-item').forEach(item=>{if(taskKey(item)===text)item.remove();});
  });
  delete TASK_STATE[text];
  const tl=document.getElementById('taskList');
  if(tl){const tc=document.getElementById('taskCounter');if(tc)tc.textContent=tl.querySelectorAll('.check-box.done').length+'/'+tl.querySelectorAll('.check-item').length;}
  const cc=document.getElementById('cl-custom');
  if(cc){const ce=document.getElementById('cl-custom-count');if(ce)ce.textContent=cc.querySelectorAll('.check-box.done').length+'/'+cc.querySelectorAll('.check-item').length;}
  updateClProgress();
  saveChecklistState();
}
function removeDeptTask(dept,text,btn,evt){
  if(evt)evt.stopPropagation();
  ['cl-'+dept,'taskList'].forEach(listId=>{
    const ul=document.getElementById(listId);if(!ul)return;
    ul.querySelectorAll('.check-item').forEach(item=>{if(taskKey(item)===text)item.remove();});
  });
  delete TASK_STATE[text];
  refreshDeptCount(dept);
  updateClProgress();
  saveDeptCustomTasks();
}
function refreshDeptCount(dept){
  const ul=document.getElementById('cl-'+dept);
  const el=document.getElementById('cl-'+dept+'-count');
  if(ul&&el)el.textContent=ul.querySelectorAll('.check-box.done').length+'/'+ul.querySelectorAll('.check-item').length;
}
function saveDeptCustomTasks(){
  const saved={date:LS.today(),depts:{}};
  ['fo','hk','bkf','mt'].forEach(dept=>{
    const ul=document.getElementById('cl-'+dept);if(!ul)return;
    // Salva solo i task custom (non quelli standard da DAILY_TASKS)
    const standardKeys=new Set([...DAILY_TASKS,...WED_TASKS,...THU_TASKS].map(t=>t.text));
    const customs=[];
    ul.querySelectorAll('.check-item').forEach(item=>{
      const key=taskKey(item);
      if(key&&!standardKeys.has(key))customs.push(key);
    });
    if(customs.length)saved.depts[dept]=customs;
  });
  LS.set('dept_custom_tasks',saved);
}
function restoreDeptCustomTasks(){
  const saved=LS.get('dept_custom_tasks',null);
  if(!saved||saved.date!==LS.today())return;
  Object.entries(saved.depts||{}).forEach(([dept,tasks])=>{
    tasks.forEach(text=>{
      addCustomTaskToDept(dept,{value:text,tagName:'INPUT'});
    });
  });
}
function restoreCustomTasks(){
  const saved=LS.get('custom_tasks',null);
  if(!saved||saved.date!==LS.today()||!saved.tasks?.length)return;
  const inp=document.getElementById('customTaskInput');
  saved.tasks.forEach(text=>{
    if(inp){inp.value=text;addCustomTask();}
  });
  if(inp)inp.value='';
}
function toggleCheck(item,listId){
  const b=item.querySelector('.check-box');
  const timeEl=item.querySelector('.check-time');
  const done=!b.classList.contains('done');
  const key=taskKey(item);
  const time=done?fmtNow():'';
  syncTaskState(key, done, time);
  const ul=document.getElementById(listId);
  if(!ul)return;
  const total=ul.querySelectorAll('.check-item').length;
  const doneN=ul.querySelectorAll('.check-box.done').length;
  if(listId==='taskList'){
    document.getElementById('taskCounter').textContent=doneN+'/'+total;
  }
}
// §§ CHECKLIST — RENDER & PROGRESS (toggleCheck, updateClProgress, toggleCheckV2)
function updateClProgress(){
  const allLists=['cl-fo','cl-hkp','cl-bkf','cl-mt','cl-custom'];
  let total=0,done=0;
  allLists.forEach(id=>{
    const ul=document.getElementById(id);if(!ul)return;
    total+=ul.querySelectorAll('.check-item').length;
    done+=ul.querySelectorAll('.check-box.done').length;
  });
  if(total===0)return;
  const remaining=total-done;
  const pct=Math.round(done/total*100);
  const pctEl=document.getElementById('clPct');if(pctEl)pctEl.textContent=pct+'%';
  const fillEl=document.getElementById('clFill');if(fillEl)fillEl.style.width=pct+'%';
  // Aggiorna badge nav
  const badge=document.getElementById('checklistNavBadge');
  if(badge){
    badge.textContent=remaining;
    badge.style.display=remaining===0?'none':'';
  }
  const depts={fo:{label:'FO',cls:'dept-fo'},hk:{label:'HK',cls:'dept-hk'},bkf:{label:'BKF',cls:'dept-fb'},mt:{label:'MT',cls:'dept-mt'}};
  let html='';
  Object.entries(depts).forEach(([k,v])=>{
    const ul=document.getElementById('cl-'+k);if(!ul)return;
    const d=ul.querySelectorAll('.check-box.done').length;
    const tot=ul.querySelectorAll('.check-item').length;
    html+=`<span class="cl-dept-stat ${v.cls}">${v.label} ${d}/${tot}</span>`;
  });
  const statsEl=document.getElementById('clDeptStats');if(statsEl)statsEl.innerHTML=html;
}
function toggleCheckV2(item,dept){
  const b=item.querySelector('.check-box');
  const done=!b.classList.contains('done');
  const key=taskKey(item);
  syncTaskState(key, done, done?fmtNow():'');
  const ul=document.getElementById('cl-'+dept);
  if(ul){const tot=ul.querySelectorAll('.check-item').length,dn=ul.querySelectorAll('.check-box.done').length;const el=document.getElementById('cl-'+dept+'-count');if(el)el.textContent=dn+'/'+tot;}
}
(function initCl(){
  const d=new Date();
  const ds=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const ms=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const el=document.getElementById('clDate');if(el)el.textContent=ds[d.getDay()]+' '+d.getDate()+' '+ms[d.getMonth()]+' '+d.getFullYear();
  // Render Overview task list
  renderTaskList('taskList','taskDayLabel','taskCounter');
  // Render Checklist view — pannelli generati dinamicamente dalla stessa fonte dei task
  (function initClView(){
    const dow=new Date().getDay();
    // Mappa task per reparto
    const deptTasks={fo:[],hk:[],bkf:[],mt:[]};
    DAILY_TASKS.forEach(t=>{if(deptTasks[t.dept])deptTasks[t.dept].push(t);});
    if(dow===3) WED_TASKS.forEach(t=>{if(deptTasks[t.dept])deptTasks[t.dept].push(t);});
    if(dow===4) THU_TASKS.forEach(t=>{if(deptTasks[t.dept])deptTasks[t.dept].push(t);});
    ['fo','hk','bkf','mt'].forEach(dept=>{
      const ul=document.getElementById('cl-'+dept);
      const countEl=document.getElementById('cl-'+dept+'-count');
      if(!ul)return;
      ul.innerHTML='';
      const tasks=deptTasks[dept];
      if(!tasks||tasks.length===0){
        ul.innerHTML=`<li style="padding:10px 0;font-size:var(--fs-xs);color:var(--text-dim);text-align:center;">Nessun task oggi</li>`;
        if(countEl)countEl.textContent='—';
        return;
      }
      tasks.forEach(t=>{
        const badgeHtml=t.badge?`<span style="font-size:10px;padding:1px 6px;border-radius:6px;background:var(--amber-bg);color:var(--amber);font-weight:500;">${t.badge}</span>`:'';
        const linkHtml=t.link?`<span onclick="event.stopPropagation();setView('${t.link}',document.querySelector('[onclick*=\\'${t.link}\\']'))" style="font-size:9px;padding:1px 7px;border-radius:6px;background:var(--accent-bg);color:var(--accent);cursor:pointer;flex-shrink:0;" title="Apri modulo">→ Apri</span>`:t.extlink?`<span onclick="event.stopPropagation();window.open('${t.extlink}','_blank')" style="font-size:9px;padding:1px 7px;border-radius:6px;background:var(--accent-bg);color:var(--accent);cursor:pointer;flex-shrink:0;">↗ Apri</span>`:'';
        const li=document.createElement('li');
        li.className='check-item';
        li.innerHTML=`<div class="check-box"></div><div class="check-content"><span class="check-text">${t.text}</span><div class="check-meta"><span class="check-dept ${DEPT_CLS[t.dept]}">${DEPT_LABEL[t.dept]}</span>${badgeHtml}${linkHtml}<span class="check-time"></span></div></div>`;
        li.addEventListener('click',function(){toggleCheckV2(this,dept);});
        ul.appendChild(li);
      });
      if(countEl)countEl.textContent='0/'+tasks.length;
    });
    // Badge "Solo giovedì" sul pannello MT
    const mtBadge=document.getElementById('cl-mt-day-badge');
    if(mtBadge)mtBadge.style.display=(dow===4)?'inline-block':'none';
    updateClProgress();
  })();
})();
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
  try{refreshOverviewForDate(d);}catch(e){}
}
// §§ OVERVIEW — RENDER PRINCIPALE + INIT + POLLING 30s (refreshOverviewForDate, renderArriviData, syncFromCloud)
function refreshOverviewForDate(d){
  const ref=new Date(d||customDate||new Date());
  ref.setHours(0,0,0,0);
  // 0. Pulizia task personalizzati se la data non è oggi
  try{
    const todayD=new Date();todayD.setHours(0,0,0,0);
    if(ref.getTime()!==todayD.getTime()){
      // Rimuovi task personalizzati da tutte le liste
      ['cl-custom','taskList'].forEach(listId=>{
        const ul=document.getElementById(listId);if(!ul)return;
        const standardKeys=new Set([...DAILY_TASKS,...WED_TASKS,...THU_TASKS].map(t=>t.text));
        ul.querySelectorAll('.check-item').forEach(item=>{
          const key=taskKey(item);
          if(key&&!standardKeys.has(key))item.remove();
        });
      });
      ['fo','hk','bkf','mt'].forEach(dept=>{
        const ul=document.getElementById('cl-'+dept);if(!ul)return;
        const standardKeys=new Set([...DAILY_TASKS,...WED_TASKS,...THU_TASKS].map(t=>t.text));
        ul.querySelectorAll('.check-item').forEach(item=>{
          const key=taskKey(item);
          if(key&&!standardKeys.has(key))item.remove();
        });
      });
      TASK_STATE={};
    }
  }catch(e){}
  // 1. Turno di Paolo
  try{
    const el=document.getElementById('paoloTurno');
    if(el){
      if(weekData){
        const giorno=weekData.giorni.find(g=>{const gd=g.date instanceof Date?g.date:new Date(g.date);return gd.getFullYear()===ref.getFullYear()&&gd.getMonth()===ref.getMonth()&&gd.getDate()===ref.getDate();});
        if(!giorno){el.textContent='Quality Manager';el.style.color='';}
        else{const turno=giorno.shifts['Presta P.'];if(!turno||IS_REST(turno)){el.textContent='Riposo';el.style.color='var(--red)';}else{el.textContent='Turno: '+turno;el.style.color='var(--green)';}}
      }else{el.textContent='Quality Manager';el.style.color='';}
    }
  }catch(e){}
  // 2. Staff area
  try{
    if(weekData){
      let idx=weekData.giorni.findIndex(g=>{
        const gd=g.date instanceof Date?g.date:new Date(g.date);
        return gd.getFullYear()===ref.getFullYear()&&gd.getMonth()===ref.getMonth()&&gd.getDate()===ref.getDate();
      });
      if(idx!==-1){
        activeDay=idx;renderDay(activeDay);updateWeekNavActive();updateSidebarInfo();
      } else {
        // Oggi non è nella settimana caricata — mostra avviso
        const sa=document.getElementById('staffArea');
        if(sa)sa.innerHTML=`<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:10px;padding:14px 16px;text-align:center;">
          <div style="font-size:1.3rem;margin-bottom:6px;">⚠️</div>
          <div style="font-weight:700;font-size:13px;color:#92400E;margin-bottom:4px;">Turni settimana precedente</div>
          <div style="font-size:12px;color:#92400E;">Carica il turno della settimana corrente per vedere il personale di oggi.</div>
        </div>`;
      }
    }
  }catch(e){}
  // 3. Task quotidiani
  try{
    const dow=ref.getDay();
    const ds=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const ms=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    const clDateEl=document.getElementById('clDate');
    if(clDateEl)clDateEl.textContent=ds[dow]+' '+ref.getDate()+' '+ms[ref.getMonth()]+' '+ref.getFullYear();
    let tasks=[...DAILY_TASKS];
    if(dow===3)tasks=[...tasks,...WED_TASKS];
    if(dow===4)tasks=[...tasks,...THU_TASKS];
    const tl=document.getElementById('taskList');
    if(tl){tl.innerHTML='';tasks.forEach(t=>tl.appendChild(buildTaskItem(t,'taskList')));
      // Ripristina task personalizzati generici (★)
      const _ct=LS.get('custom_tasks',null);
      if(_ct&&_ct.date===LS.today()&&_ct.tasks?.length){_ct.tasks.forEach(text=>{
        const li=document.createElement('li');li.className='check-item';
        li.innerHTML=`<div class="check-box"></div><div class="check-content"><span class="check-text">${text}</span><div class="check-meta"><span class="check-dept" style="background:var(--surface2);color:var(--text-dim);padding:2px 7px;border-radius:4px;font-size:10px;">★</span><span class="check-time"></span><span onclick="removeCustomTask('${text.replace(/'/g,"\\'")}',this,event)" style="font-size:9px;color:var(--text-dim);cursor:pointer;margin-left:auto;">✕</span></div></div>`;
        li.querySelector('.check-box').addEventListener('click',function(e){e.stopPropagation();const done=!this.classList.contains('done');syncTaskState(text,done,fmtNow());const tc2=document.getElementById('taskCounter');if(tc2)tc2.textContent=tl.querySelectorAll('.check-box.done').length+'/'+tl.querySelectorAll('.check-item').length;});
        li.addEventListener('click',function(){const done=!this.querySelector('.check-box').classList.contains('done');syncTaskState(text,done,fmtNow());const tc2=document.getElementById('taskCounter');if(tc2)tc2.textContent=tl.querySelectorAll('.check-box.done').length+'/'+tl.querySelectorAll('.check-item').length;});
        if(TASK_STATE[text]?.done){const b=li.querySelector('.check-box');const tx=li.querySelector('.check-text');const te=li.querySelector('.check-time');if(b){b.classList.add('done');b.textContent='✓';}if(tx)tx.classList.add('done');if(te)te.textContent=TASK_STATE[text].time||'';}
        tl.appendChild(li);
      });}
      // Ripristina task personalizzati per reparto
      const _dct=LS.get('dept_custom_tasks',null);
      if(_dct&&_dct.date===LS.today()){const _dcls={fo:'dept-fo',hk:'dept-hk',bkf:'dept-fb',mt:'dept-mt'};const _dlbl={fo:'FO',hk:'HK',bkf:'BKF',mt:'MT'};
        Object.entries(_dct.depts||{}).forEach(([dept,dtasks])=>{dtasks.forEach(text=>{
          const li=document.createElement('li');li.className='check-item';
          li.innerHTML=`<div class="check-box"></div><div class="check-content"><span class="check-text">${text}</span><div class="check-meta"><span class="check-dept ${_dcls[dept]||''}">${_dlbl[dept]||dept.toUpperCase()}</span><span class="check-time"></span><span onclick="removeDeptTask('${dept}','${text.replace(/'/g,"\\'")}',this,event)" style="font-size:9px;color:var(--text-dim);cursor:pointer;margin-left:auto;">✕</span></div></div>`;
          li.addEventListener('click',function(){const done=!this.querySelector('.check-box').classList.contains('done');syncTaskState(text,done,done?fmtNow():'');refreshDeptCount(dept);const tc2=document.getElementById('taskCounter');if(tc2)tc2.textContent=tl.querySelectorAll('.check-box.done').length+'/'+tl.querySelectorAll('.check-item').length;});
          if(TASK_STATE[text]?.done){const b=li.querySelector('.check-box');const tx=li.querySelector('.check-text');const te=li.querySelector('.check-time');if(b){b.classList.add('done');b.textContent='✓';}if(tx)tx.classList.add('done');if(te)te.textContent=TASK_STATE[text].time||'';}
          tl.appendChild(li);
        });});
      }
      const tc=document.getElementById('taskCounter');if(tc)tc.textContent=tl.querySelectorAll('.check-box.done').length+'/'+tl.querySelectorAll('.check-item').length;}
    const deptTasks={fo:[],hk:[],bkf:[],mt:[]};
    tasks.forEach(t=>{if(deptTasks[t.dept])deptTasks[t.dept].push(t);});
    ['fo','hk','bkf','mt'].forEach(dept=>{
      const ul=document.getElementById('cl-'+dept);
      const countEl=document.getElementById('cl-'+dept+'-count');
      if(!ul)return;ul.innerHTML='';
      const dt=deptTasks[dept];
      if(!dt||!dt.length){ul.innerHTML=`<li style="padding:10px 0;font-size:var(--fs-xs);color:var(--text-dim);text-align:center;">Nessun task oggi</li>`;if(countEl)countEl.textContent='—';return;}
      dt.forEach(t=>{
        const badgeHtml=t.badge?`<span style="font-size:10px;padding:1px 6px;border-radius:6px;background:var(--amber-bg);color:var(--amber);font-weight:500;">${t.badge}</span>`:'';
        const linkHtml=t.link?`<span onclick="event.stopPropagation();setView('${t.link}',document.querySelector('[onclick*=\\'${t.link}\\']'))" style="font-size:9px;padding:1px 7px;border-radius:6px;background:var(--accent-bg);color:var(--accent);cursor:pointer;flex-shrink:0;">→ Apri</span>`:t.extlink?`<span onclick="event.stopPropagation();window.open('${t.extlink}','_blank')" style="font-size:9px;padding:1px 7px;border-radius:6px;background:var(--accent-bg);color:var(--accent);cursor:pointer;flex-shrink:0;">↗ Apri</span>`:'';
        const li=document.createElement('li');li.className='check-item';
        li.innerHTML=`<div class="check-box"></div><div class="check-content"><span class="check-text">${t.text}</span><div class="check-meta"><span class="check-dept ${DEPT_CLS[t.dept]}">${DEPT_LABEL[t.dept]}</span>${badgeHtml}${linkHtml}<span class="check-time"></span></div></div>`;
        const _s=TASK_STATE[t.text];if(_s?.done){const _b=li.querySelector('.check-box'),_tx=li.querySelector('.check-text'),_te=li.querySelector('.check-time');if(_b){_b.classList.add('done');_b.textContent='✓';}if(_tx)_tx.classList.add('done');if(_te)_te.textContent=_s.time||'';}
        li.addEventListener('click',function(){toggleCheckV2(this,dept);});
        ul.appendChild(li);
      });
      if(countEl)countEl.textContent=ul.querySelectorAll('.check-box.done').length+'/'+dt.length;
    });
    const mtBadge=document.getElementById('cl-mt-day-badge');
    if(mtBadge)mtBadge.style.display=(dow===4)?'inline-block':'none';
    updateClProgress();
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
        }
      }
      // Controlla arrivi raw (RC cards + arriviData)
      await checkAndParseArriviRaw().catch(()=>{});
      // Controlla piano raw
      await checkAndParsePianoRaw().catch(()=>{});
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
    try{turniPrefLoad();}catch(e){}
  },30000);
  const alertTimeEl=document.getElementById('alertTime');if(alertTimeEl)alertTimeEl.textContent='Aggiornato '+String(new Date().getHours()).padStart(2,'0')+':'+String(new Date().getMinutes()).padStart(2,'0');
  buildBarChart();
  // Sync dal cloud poi ripristina TUTTI i dati
  (async()=>{
    setSyncStatus('syncing');
    try{
      const n=await LS.syncFromCloud();
      setSyncStatus('ok');
      checkAndParsePianoRaw().catch(()=>{});
    }catch(e){
      setSyncStatus('offline');
    }
    // Ripristina dati persistenti
  setTimeout(async()=>{
    // Rileggi REV_SENT da localStorage (può essere stato aggiornato dalla sync cloud)
    try{const s=localStorage.getItem('qm_rev_sent');if(s)REV_SENT=JSON.parse(s);}catch(e){}
    restoreChecklistState();
    restoreCustomTasks();
    restoreDeptCustomTasks();
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
  // Per ogni mese calcola lo score ponderato 85/10/5 usando tutte le rec fino a quel mese
  function calcWeightedAt(refDate){
    const refTs=refDate.getTime()+30*24*60*60*1000; // fine del mese
    const available=scored.filter(r=>r._dateTs<=refTs);
    if(!available.length)return null;
    const f1=available.filter(r=>(refTs-r._dateTs)/86400000<=365);
    const f2=available.filter(r=>{const d=(refTs-r._dateTs)/86400000;return d>365&&d<=730;});
    const f3=available.filter(r=>{const d=(refTs-r._dateTs)/86400000;return d>730&&d<=1096;});
    const avg=arr=>arr.length?arr.reduce((s,r)=>s+r._score,0)/arr.length:null;
    const a1=avg(f1),a2=avg(f2),a3=avg(f3);
    let wT=0,wS=0;
    if(a1!==null){wT+=0.85;wS+=0.85*a1;}
    if(a2!==null){wT+=0.10;wS+=0.10*a2;}
    if(a3!==null){wT+=0.05;wS+=0.05*a3;}
    return wT>0?wS/wT:null;
  }
  const vals=months.map(m=>calcWeightedAt(m));
  const validVals=vals.filter(v=>v!==null);
  if(validVals.length<2)return;
  const title=REV_HOTELS[p].name;
  document.getElementById('catChartModalTitle').textContent='📈 Andamento score — '+title;
  document.getElementById('catChartModalTitle').style.color='#003580';
  document.getElementById('catChartModalSub').textContent='Score ponderato Booking 85/10/5 · '+months.length+' mesi · tutto il periodo';
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
  // Mostra dati, nascondi upload box
  const pulBox=document.getElementById('pulUploadBox');if(pulBox)pulBox.style.display='none';
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
  if(!silent){const _pts=localStorage.getItem('qm_ts_pulTs');LS.set('pulData',{data:pulData,activeDay:pulActiveDay,ts:_pts?parseInt(_pts):undefined});}
}
function updateKpiFromPulizie(d){
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
  alert(msg);
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
      document.getElementById('revProcessing-'+p).style.display='none';
      document.getElementById('revContent-'+p).style.display='block';
      revRenderStats(p);
      revRenderExpiring(p);
      revRenderCatTrend(p);
      revRenderList(p);
      ovUpdateRevNoreply();ovUpdateRevImport();
      // Salva il testo CSV grezzo in localStorage e cloud KV
      try{localStorage.setItem('qm_rev_'+p, csvText);}catch(e){}
      // Salva timestamp upload
      const _revTs=Date.now();
      try{localStorage.setItem('qm_ts_rev_'+p,String(_revTs));
        fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_ts_rev_'+p,value:String(_revTs)})}).catch(()=>{});} catch(e){}
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
    const rawDate=(obj['Data della recensione']||'').split(' ')[0];
    const parsedDate=new Date(rawDate);
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
  // ── Funzione calcolo score ponderato Booking 85/10/5 ──
  function calcScore(reviewSet){
    const f1=reviewSet.filter(r=>(nowTs-r._dateTs)/(86400000)<=365);
    const f2=reviewSet.filter(r=>{const d=(nowTs-r._dateTs)/86400000;return d>365&&d<=730;});
    const f3=reviewSet.filter(r=>{const d=(nowTs-r._dateTs)/86400000;return d>730&&d<=1096;});
    const a1=f1.length?f1.reduce((s,r)=>s+r._score,0)/f1.length:null;
    const a2=f2.length?f2.reduce((s,r)=>s+r._score,0)/f2.length:null;
    const a3=f3.length?f3.reduce((s,r)=>s+r._score,0)/f3.length:null;
    let wT=0,wS=0;
    if(a1!==null){wT+=0.85;wS+=0.85*a1;}
    if(a2!==null){wT+=0.10;wS+=0.10*a2;}
    if(a3!==null){wT+=0.05;wS+=0.05*a3;}
    return wT>0?wS/wT:null;
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
        <span style="font-size:10px;background:var(--surface2);padding:2px 8px;border-radius:8px;color:var(--text-dim);">${reviews.length} recension${reviews.length===1?'e':'i'}</span>
        <span style="font-size:11px;" title="${sem.label}">${sem.icon} ${sem.label}</span>`;
    if(afterScore!==null&&scoreAttuale!==null){
      const dScoreAtt=Math.round(scoreAttuale*10)/10;
      const dScoreAft=Math.round(afterScore*10)/10;
      const delta=dScoreAft-dScoreAtt;
      const dc=delta>=0?'var(--green)':'var(--red)';
      html+=`<span style="margin-left:auto;font-size:var(--fs-xs);font-weight:700;color:${dc};">${dScoreAtt.toFixed(1)} → ${dScoreAft.toFixed(1)} <span style="font-size:10px;">(${delta>=0?'+':''}${delta.toFixed(1)})</span></span>`;
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
          <span style="font-size:9px;background:${g.color};color:#fff;border-radius:8px;padding:1px 6px;font-weight:600;">${group.length}</span>
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
        <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">Score attuale</div>
        <div style="font-size:24px;font-weight:700;color:var(--accent);">${(Math.round(scoreAttuale*10)/10).toFixed(1)}</div>
      </div>
      ${hasExp?`<div style="font-size:20px;color:var(--text-dim);">→</div>
      <div style="text-align:center;">
        <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">Dopo scadenze</div>
        <div style="font-size:24px;font-weight:700;color:${proiezioneColor};">${scoreAfterBoth!==null?(Math.round(scoreAfterBoth*10)/10).toFixed(1):'—'}</div>
      </div>
      <div style="font-size:18px;font-weight:700;color:${proiezioneColor};">${proiezioneDelta!==null?(proiezioneDelta>=0?'▲ +':'▼ ')+proiezioneDelta.toFixed(2):''}</div>`:''}
    </div>`;
  }
  // ── Debug bucket f1/f2/f3 ──
  const dbF1=scored.filter(r=>(nowTs-r._dateTs)/86400000<=365);
  const dbF2=scored.filter(r=>{const d=(nowTs-r._dateTs)/86400000;return d>365&&d<=730;});
  const dbF3=scored.filter(r=>{const d=(nowTs-r._dateTs)/86400000;return d>730&&d<=1096;});
  const dbA1=dbF1.length?dbF1.reduce((s,r)=>s+r._score,0)/dbF1.length:null;
  const dbA2=dbF2.length?dbF2.reduce((s,r)=>s+r._score,0)/dbF2.length:null;
  const dbA3=dbF3.length?dbF3.reduce((s,r)=>s+r._score,0)/dbF3.length:null;
  html+=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
    <div style="font-size:9px;color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:.04em;align-self:center;">Bucket:</div>
    <div style="background:var(--surface2);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:10px;">
      <span style="color:var(--accent);font-weight:700;">F1</span> <span style="color:var(--text-dim);">${dbF1.length} rec · avg </span><span style="font-weight:700;">${dbA1!==null?dbA1.toFixed(2):'—'}</span> <span style="color:var(--text-dim);">(85%)</span>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:10px;">
      <span style="color:var(--accent);font-weight:700;">F2</span> <span style="color:var(--text-dim);">${dbF2.length} rec · avg </span><span style="font-weight:700;">${dbA2!==null?dbA2.toFixed(2):'—'}</span> <span style="color:var(--text-dim);">(10%)</span>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:10px;">
      <span style="color:var(--accent);font-weight:700;">F3</span> <span style="color:var(--text-dim);">${dbF3.length} rec · avg </span><span style="font-weight:700;">${dbA3!==null?dbA3.toFixed(2):'—'}</span> <span style="color:var(--text-dim);">(5%)</span>
    </div>
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
function revRenderStats(p){
  const data=REV_HOTELS[p].data;
  if(!data.length)return;
  const scored=data.filter(r=>r._score>0);
  const scores=scored.map(r=>r._score);
  // Media semplice
  const avgSimple=scores.reduce((a,b)=>a+b,0)/scores.length;
  // Media ponderata Booking.com 2025: 85% ultimi 12m, 10% 12-24m, 5% 24-36m
  const DECAY_F1=270*24*60*60*1000;
  const now=Date.now();
  const fascia1=scored.filter(r=>(now-r._dateTs)/(24*60*60*1000)<=365);
  const fascia2=scored.filter(r=>{const d=(now-r._dateTs)/(24*60*60*1000);return d>365&&d<=730;});
  const fascia3=scored.filter(r=>{const d=(now-r._dateTs)/(24*60*60*1000);return d>730&&d<=1096;});
  // Score visualizzato: media SEMPLICE per fascia (allineato a Booking)
  const avg1=fascia1.length?fascia1.reduce((s,r)=>s+r._score,0)/fascia1.length:null;
  const avg2=fascia2.length?fascia2.reduce((s,r)=>s+r._score,0)/fascia2.length:null;
  const avg3=fascia3.length?fascia3.reduce((s,r)=>s+r._score,0)/fascia3.length:null;
  // Score visualizzato con media semplice per fascia
  let wTotal=0,wScore=0;
  if(avg1!==null){wTotal+=0.85;wScore+=0.85*avg1;}
  if(avg2!==null){wTotal+=0.10;wScore+=0.10*avg2;}
  if(avg3!==null){wTotal+=0.05;wScore+=0.05*avg3;}
  const avgWeighted=wTotal>0?wScore/wTotal:avgSimple;
  // Media fascia1 con decadimento interno (solo per simulatore)
  const avg1Decay=fascia1.length?(()=>{
    const ws=fascia1.reduce((s,r)=>s+Math.exp(-(now-r._dateTs)/DECAY_F1)*r._score,0);
    const wt=fascia1.reduce((s,r)=>s+Math.exp(-(now-r._dateTs)/DECAY_F1),0);
    return wt?ws/wt:null;
  })():null;
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
  g('rev-avg-sub').textContent='ponderato Booking 85/10/5 · media semplice '+avgSimple.toFixed(1);
  g('rev-count').textContent=data.length;
  g('rev-count-sub').textContent=data.length+' recensioni importate';
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
    const displayScore=Math.round(avgWeighted*10)/10; // score visualizzato (ceil)
    const target=Math.round((displayScore+0.1)*10)/10; // prossimo decimo sopra il display
    function simAvgWithN(n, scoreVal){
      // Simulatore usa decadimento interno fascia1 — nuove rec pesano di più
      const newF1=[...fascia1,...Array(n).fill({_score:scoreVal,_dateTs:now})];
      const ws=newF1.reduce((s,r)=>s+Math.exp(-(now-r._dateTs)/DECAY_F1)*r._score,0);
      const wt=newF1.reduce((s,r)=>s+Math.exp(-(now-r._dateTs)/DECAY_F1),0);
      const newAvg1=wt?ws/wt:scoreVal;
      let wT=0.85, wS=0.85*newAvg1;
      if(avg2!==null){wT+=0.10;wS+=0.10*avg2;}
      if(avg3!==null){wT+=0.05;wS+=0.05*avg3;}
      return wS/wT;
    }
    // Recensioni in scadenza — impatto futuro
    const THREE_YEARS=3*365.25*24*60*60*1000;
    const expiringThisMonth=scored.filter(r=>{
      const exp=r._dateTs+THREE_YEARS;
      return exp>=now&&exp<=(now+30*24*60*60*1000);
    });
    const MAX_SIM=300;
    let needed10=0,needed9=0;
    for(let n=1;n<=MAX_SIM;n++){
      if(!needed10&&simAvgWithN(n,10)>=target-0.005)needed10=n;
      if(!needed9&&simAvgWithN(n,9)>=target-0.005)needed9=n;
      if(needed10&&needed9)break;
    }
    targetEl.style.display='flex';
    const expiringNote=expiringThisMonth.length>0
      ?` · ⚠️ ${expiringThisMonth.length} rec. in scadenza entro 30gg`:'';
    if(needed10>0&&needed10<MAX_SIM){
      targetTitle.textContent=needed10===1
        ?`1 recensione con 10 per raggiungere ${target.toFixed(1)}`
        :`${needed10} recensioni con 10 per raggiungere ${target.toFixed(1)}`;
      const detail9=needed9>0&&needed9<MAX_SIM?` · con 9: ${needed9} rec`:'';
      targetDetail.textContent=`Score attuale: ${displayScore.toFixed(1)} → obiettivo ${target.toFixed(1)}${detail9}${expiringNote}`;
    } else {
      targetTitle.textContent=`Score già a ${displayScore.toFixed(1)} — ottimo!`;
      targetDetail.textContent=expiringNote||'';
    }
  }
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
    const _tone=REV_HOTELS[p].tone||'bilanciato';
    const replyPanel=(!r._hasReply&&!isNotNeeded&&!isSent)?`
      <div class="rev-reply-panel" id="rp-${uid}">
        <div class="rev-tone-bar">
          <span style="font-size:10px;color:var(--text-dim);flex-shrink:0;">Tono:</span>
          <button class="rev-tone-btn${_tone==='formale'?' active':''}" data-p="${p}" data-tone="formale" onclick="revSetTone('${p}','formale',event)">Formale</button>
          <button class="rev-tone-btn${_tone==='bilanciato'?' active':''}" data-p="${p}" data-tone="bilanciato" onclick="revSetTone('${p}','bilanciato',event)">Bilanciato</button>
          <button class="rev-tone-btn${_tone==='empatico'?' active':''}" data-p="${p}" data-tone="empatico" onclick="revSetTone('${p}','empatico',event)">Empatico</button>
        </div>
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
function revSetTone(p,tone,evt){
  if(evt)evt.stopPropagation();
  REV_HOTELS[p].tone=tone;
  document.querySelectorAll(`.rev-tone-btn[data-p="${p}"]`).forEach(b=>{
    b.classList.toggle('active',b.dataset.tone===tone);
  });
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
  const firma=isItalian?'Paolo P. - Quality Manager':'Best regards. Paolo P. - Quality Manager';
  const hotelName=REV_HOTELS[p].name;
  const tone=REV_HOTELS[p].tone||'bilanciato';
  const toneDesc=tone==='formale'?'Tono istituzionale e professionale. Stile sobrio, distanza rispettosa, linguaggio formale senza eccedere in calore.':tone==='empatico'?'Tono molto empatico e vicino. Mostra comprensione autentica verso i disagi o le emozioni dell\'ospite. Usa frasi che trasmettono cura personale.':'Tono bilanciato: professionale e cordiale, né freddo né eccessivamente caloroso. Il registro naturale di un Quality Manager competente.';
  const posText=(r['Recensione positiva']||'').trim();
  const negText=(r['Recensione negativa']||'').trim();
  const hasBookingText=posText.length>3||negText.length>3;
  if(!hasBookingText){ta.value='Nessun commento scritto — risposta non necessaria per Booking.com.';btn.disabled=false;btn.innerHTML='✦ Genera risposta';return;}
  const guestName=r["Nome dell'ospite"]||'Ospite';
  const prompt=`Sei Paolo P., Quality Manager del ${hotelName} a Napoli, un hotel 4 stelle con storia e carattere unico.\n\nDevi rispondere a questa recensione Booking.com in ${lang}.\n\nDATI RECENSIONE:\n- Ospite: ${guestName}\n- Punteggio: ${r._score}/10\n- Titolo: ${r['Titolo della recensione']||'—'}\n- Commento positivo: ${posText||'—'}\n- Commento negativo: ${negText||'—'}\n\nREGOLE — rispettale tutte:\n1. APERTURA: rivolgiti all'ospite per nome ("Dear ${guestName}," / "Cara/Caro ${guestName},") e ringrazia per la recensione — varia il modo ad ogni risposta\n2. LUNGHEZZA: 3 paragrafi. Primo: 1-2 frasi (ringraziamento + positivi). Secondo: 2-3 frasi (feedback/critiche con spiegazione e azione). Terzo: 1 frase (chiusura). Totale 5-7 frasi — né troppo corto né prolisso.\n3. TONO: professionale e caldo come un Quality Manager di un 4 stelle\n4. CRITICHE — REGOLA FONDAMENTALE: non dire mai "hai ragione", "you are right", "you are absolutely right" — riconosci il feedback in modo neutro e professionale (es. "We take note of your observation", "We appreciate your feedback on X") e poi spiega l'azione concreta\n5. PUNTEGGIO: citalo solo se è alto (9-10/10) E la recensione è entusiasta\n6. PUNTI POSITIVI: richiama aspetti specifici citati dall'ospite, non frasi generiche\n7. CARATTERE STRUTTURA: valorizza l'identità storica/unica quando pertinente\n8. CHIUSURA: invita a tornare — varia il phrasing\n9. VIETATO: non invitare mai al contatto diretto né alla prenotazione diretta (OTA)\n10. FIRMA su riga separata: "${firma}"\n11. Non ripetere le parole dell'ospite\n12. Rispondi SOLO con il testo, senza preamboli`;
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
  const bkfBox=document.getElementById('bkfUploadBox');if(bkfBox)bkfBox.style.display='none';
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
  if(!silent){const _bts=localStorage.getItem('qm_ts_bkfTs');LS.set('bkfData',{data:bkfData,activeDay:bkfActiveDay,ts:_bts?parseInt(_bts):undefined});}
  bkfRenderChart();
  bkfRenderNotes();
  renderOvBkfChart();
}
function renderOvBkfChart(){
  const el=document.getElementById('ov-bkf-chart');if(!el)return;
  if(!bkfData||!bkfData.length){el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Carica il report pasti per vedere il grafico</div>';return;}
  const pts=bkfData.map(d=>({label:d.label.split(' ')[0],v:d.adulti+d.bambini,nc:d.noCol||0}));
  const W=600,H=160,PL=30,PR=10,PT=20,PB=28;
  const plotW=W-PL-PR,plotH=H-PT-PB;
  const YMAX=Math.max(30,...pts.map(p=>p.v))+10;
  const sx=i=>PL+i/(pts.length-1||1)*plotW;
  const sy=v=>PT+plotH-(v/YMAX)*plotH;
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">`;
  for(let v=0;v<=YMAX;v+=Math.ceil(YMAX/4/10)*10){
    const y=sy(v);
    svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border-light)" stroke-width="1"/>`;
    svg+=`<text x="${PL-4}" y="${y+4}" font-size="10" fill="var(--text-dim)" text-anchor="end">${v}</text>`;
  }
  const linePath='M'+pts.map((p,i)=>`${sx(i)},${sy(p.v)}`).join('L');
  const areaPath=linePath+`L${sx(pts.length-1)},${sy(0)} L${sx(0)},${sy(0)} Z`;
  svg+=`<path d="${areaPath}" fill="var(--amber)" opacity="0.12"/>`;
  svg+=`<path d="${linePath}" fill="none" stroke="var(--amber)" stroke-width="2"/>`;
  pts.forEach((p,i)=>{
    const x=sx(i),y=sy(p.v);
    const isActive=i===bkfActiveDay;
    svg+=`<circle cx="${x}" cy="${y}" r="${isActive?4:3}" fill="${isActive?'var(--amber)':'var(--amber)'}" stroke="white" stroke-width="1.5"/>`;
    svg+=`<text x="${x}" y="${y-8}" font-size="10" fill="var(--amber)" text-anchor="middle" font-weight="600">${p.v}</text>`;
    svg+=`<text x="${x}" y="${H-4}" font-size="10" fill="var(--text-dim)" text-anchor="middle">${p.label}</text>`;
  });
  svg+='</svg>';
  el.innerHTML=svg;
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
// §§ PIANO SETTIMANA — UPLOAD & PARSER (handlePianoFile, parsePianoItems, checkAndParsePianoRaw, pianoSetLoaded)
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
  const giorni=cols.map(c=>({label:c.label,data:c.data,soulart:{partenze:[],fermate:[],cambi:[]},boutique:{partenze:[],fermate:[],cambi:[]},liborio:{partenze:[],fermate:[],cambi:[]}}));
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
      const hasMinus=val.includes('-'),hasPlus=val.includes('+');
      if(hasMinus&&hasPlus)giorni[ci][roomType].cambi.push(roomCode);
      else if(hasMinus)giorni[ci][roomType].partenze.push(roomCode);
      else if(val.includes('='))giorni[ci][roomType].fermate.push(roomCode);
    });
  }
  return{stampato,giorni};
}
async function checkAndParsePianoRaw(){
  try{
    // Fetch direttamente da KV — non passa per localStorage (PDF troppo grande)
    const res=await fetch(PROXY+'/kv/get?key=qm_piano_raw',{cache:'no-store'});
    const json=await res.json();
    if(!json.value)return;
    const raw=JSON.parse(json.value);
    if(!raw||!raw.pdf)return;
    // Confronta timestamp: se piano già aggiornato, non ri-parsare
    const pianoStr=localStorage.getItem('qm_piano');
    const pianoTs=pianoStr?(JSON.parse(pianoStr)||{})._ts||0:0;
    if(raw._ts&&raw._ts<=pianoTs)return;
    // Decode base64 → Uint8Array
    const bstr=atob(raw.pdf);
    const bytes=new Uint8Array(bstr.length);
    for(let i=0;i<bstr.length;i++)bytes[i]=bstr.charCodeAt(i);
    if(!window.pdfjsLib)throw new Error('pdfjsLib non disponibile');
    const pdfDoc=await pdfjsLib.getDocument({data:bytes}).promise;
    const allItems=[];
    for(let p=1;p<=pdfDoc.numPages;p++){
      const page=await pdfDoc.getPage(p);
      const tc=await page.getTextContent();
      tc.items.forEach(it=>{const s=it.str.trim();if(s)allItems.push({s,x:Math.round(it.transform[4]),y:Math.round(it.transform[5]),p});});
    }
    const data=parsePianoItems(allItems);
    if(!data||!data.giorni||!data.giorni.length)throw new Error('Nessun dato nel piano');
    data._ts=raw._ts;
    pianoData=data;
    localStorage.setItem('qm_piano',JSON.stringify(data));
    kvSet('qm_piano',JSON.stringify(data)).then(ok=>{setSyncStatus(ok?'ok':'error');});
    fetch(PROXY+'/kv/delete?key=qm_piano_raw').catch(()=>{});
    restoreUploadTs('pianoTs',data._ts);
    pianoSetLoaded(true);
  }catch(e){console.warn('checkAndParsePianoRaw:',e);}
}
function pianoSetLoaded(silent){
  if(!pianoData||!pianoData.giorni)return;
  const range=(pianoData.giorni[0]?.label||'')+' – '+(pianoData.giorni[pianoData.giorni.length-1]?.label||'');
  ucSetState('piano','loaded',range,silent);
  const dateEl=document.getElementById('pianoLoadedDate');if(dateEl)dateEl.textContent='Settimana: '+range;
  const btn=document.getElementById('btnPianoReload');if(btn)btn.style.display='block';
  const box=document.getElementById('pianoUploadBox');if(box)box.style.display='none';
  const li=document.getElementById('pianoLoadedInfo');if(li)li.classList.add('visible');
  try{pianoOvInit();}catch(e){}
  try{renderPianoGiorno('miniapp-piano-preview',new Date());}catch(e){}
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
  if(!nome||!arrivo||!partenza||!pax){alert('Compila almeno nome, date e numero persone.');return;}
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
function bkfRenderChart(){
  const el=document.getElementById('bkfChartBody');
  if(!el)return;
  if(!bkfData||!bkfData.length){
    el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);text-align:center;padding:20px 0;">Carica il report pasti dall\'Upload Center per visualizzare il grafico</div>';
    return;
  }
  const pts=bkfData.map(d=>({label:d.label,v:d.adulti+d.bambini}));
  const W=680,H=260,PL=36,PR=16,PT=20,PB=36;
  const plotW=W-PL-PR,plotH=H-PT-PB;
  const YMAX=70; // asse Y fisso 0-70
  const sx=i=>PL+i/(pts.length-1||1)*plotW;
  const sy=v=>PT+plotH-(v/YMAX)*plotH;
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">`;
  // Griglia 0,10,20,30,40,50,60,70
  for(let v=0;v<=70;v+=10){
    const y=sy(v);
    svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border-light)" stroke-width="${v===0?1.5:1}"/>`;
    svg+=`<text x="${PL-4}" y="${y+4}" font-size="12" fill="var(--text-dim)" text-anchor="end">${v}</text>`;
  }
  // Labels asse X
  pts.forEach((p,i)=>{
    const x=sx(i);
    const shortLabel=p.label.replace(/\s+\d{4}/,'').trim();
    svg+=`<text x="${x}" y="${H-6}" font-size="12" fill="var(--text-dim)" text-anchor="middle">${shortLabel}</text>`;
  });
  // Area
  const linePath='M'+pts.map((p,i)=>`${sx(i)},${sy(p.v)}`).join('L');
  const areaPath=linePath+`L${sx(pts.length-1)},${sy(0)} L${sx(0)},${sy(0)} Z`;
  svg+=`<path d="${areaPath}" fill="var(--accent)" opacity="0.1"/>`;
  svg+=`<path d="${linePath}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>`;
  // Punti + valori
  pts.forEach((p,i)=>{
    const x=sx(i),y=sy(p.v);
    svg+=`<circle cx="${x}" cy="${y}" r="3" fill="var(--accent)" stroke="white" stroke-width="1.5"/>`;
    const above=i%2===0;
    svg+=`<text x="${x}" y="${above?y-11:y+18}" font-size="12" fill="var(--accent)" text-anchor="middle" font-weight="600">${p.v}</text>`;
  });
  svg+='</svg>';
  el.innerHTML=svg;
}
function bkfRenderChartAR(){
  const el=document.getElementById('bkfChartBodyAR');
  if(!el)return;
  if(!bkfSheetARData||!bkfSheetARData.length){
    el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);text-align:center;padding:20px 0;">Carica il file BKF OGGI Galleria per visualizzare il grafico</div>';
    return;
  }
  const pts=bkfSheetARData.map(r=>({label:r.d||'—',v:parseInt(r.b)||0}));
  const W=680,H=260,PL=36,PR=16,PT=20,PB=36;
  const plotW=W-PL-PR,plotH=H-PT-PB;
  const YMAX=70;
  const sx=i=>PL+i/(pts.length-1||1)*plotW;
  const sy=v=>PT+plotH-(v/YMAX)*plotH;
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">`;
  for(let v=0;v<=70;v+=10){
    const y=sy(v);
    svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border-light)" stroke-width="${v===0?1.5:1}"/>`;
    svg+=`<text x="${PL-4}" y="${y+4}" font-size="12" fill="var(--text-dim)" text-anchor="end">${v}</text>`;
  }
  pts.forEach((p,i)=>{
    const x=sx(i);
    svg+=`<text x="${x}" y="${H-6}" font-size="12" fill="var(--text-dim)" text-anchor="middle">${p.label}</text>`;
  });
  const linePath='M'+pts.map((p,i)=>`${sx(i)},${sy(p.v)}`).join('L');
  const areaPath=linePath+`L${sx(pts.length-1)},${sy(0)} L${sx(0)},${sy(0)} Z`;
  svg+=`<path d="${areaPath}" fill="var(--accent)" opacity="0.1"/>`;
  svg+=`<path d="${linePath}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>`;
  pts.forEach((p,i)=>{
    const x=sx(i),y=sy(p.v);
    svg+=`<circle cx="${x}" cy="${y}" r="3" fill="var(--accent)" stroke="white" stroke-width="1.5"/>`;
    const above=i%2===0;
    svg+=`<text x="${x}" y="${above?y-11:y+18}" font-size="12" fill="var(--accent)" text-anchor="middle" font-weight="600">${p.v}</text>`;
  });
  svg+='</svg>';
  el.innerHTML=svg;
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
      <div class="kpi-value" style="font-size:${i===0?'var(--fs-xl, 28px)':'22px'};">${nc}</div>
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
// §§ REGISTRATION CARDS — RC (handleRCFile, rcParseGuests, rcRenderCards, checkAndParseArriviRaw)
async function checkAndParseArriviRaw(){
  try{
    const res=await fetch(PROXY+'/kv/get?key=qm_arrivi_raw',{cache:'no-store'});
    const json=await res.json();
    if(!json.value)return;
    const raw=JSON.parse(json.value);
    if(!raw||!raw.pdf)return;
    // Salta se già processato
    const lastTs=parseInt(localStorage.getItem('qm_ts_arriviRaw')||'0');
    if(raw._ts&&raw._ts<=lastTs)return;
    // Decode base64 → Uint8Array
    const bstr=atob(raw.pdf);
    const bytes=new Uint8Array(bstr.length);
    for(let i=0;i<bstr.length;i++)bytes[i]=bstr.charCodeAt(i);
    if(!window.pdfjsLib)throw new Error('pdfjsLib non disponibile');
    const pdfDoc=await pdfjsLib.getDocument({data:bytes}).promise;
    let fullText='';
    for(let i=1;i<=pdfDoc.numPages;i++){
      const page=await pdfDoc.getPage(i);
      const tc=await page.getTextContent();
      fullText+=tc.items.map(x=>x.str).join(' ')+'\n';
    }
    const guests=rcParseGuests(fullText);
    if(!guests.length)return;
    localStorage.setItem('qm_ts_arriviRaw',String(raw._ts));
    fetch(PROXY+'/kv/delete?key=qm_arrivi_raw').catch(()=>{});
    document.getElementById('rcUploadZone').style.display='none';
    document.getElementById('rcProcessing').style.display='none';
    rcRenderCards(guests);
  }catch(e){console.warn('checkAndParseArriviRaw:',e);}
}
async function handleRCFile(file){rcShowProc('Lettura del PDF...');rcHideError();try{const ab=await file.arrayBuffer();const pdfData=new Uint8Array(ab);rcShowProc('Estrazione testo...');const pdfDoc=await pdfjsLib.getDocument({data:pdfData}).promise;let fullText='';for(let i=1;i<=pdfDoc.numPages;i++){const page=await pdfDoc.getPage(i);const tc=await page.getTextContent();fullText+=tc.items.map(x=>x.str).join(' ')+'\n';}const guests=rcParseGuests(fullText);rcHideProc();if(!guests.length)rcShowError('Nessun ospite trovato.');else rcRenderCards(guests);}catch(err){rcHideProc();rcShowError('Errore: '+err.message);}}
function rcCleanName(raw){let name=raw.trim().replace(/\s*\([^)]+\)/g,'').trim();const cp=new RegExp('^('+ROOM_CODES.join('|')+')\\s+','i');let prev='';while(prev!==name){prev=name;name=name.replace(cp,'').trim();}return name;}
function rcParseGuests(text){let year=new Date().getFullYear();const ym=text.match(/arrivi\s*[-–]\s*\d{1,2}\/\d{1,2}\/(\d{4})/i);if(ym)year=parseInt(ym[1]);const norm=text.replace(/\s+/g,' ').trim();const guests=[];const pat=/(\b(?:Art\s*\d+|\d{2,3}|AS_LIB|[A-Z]{2,8}_?[A-Z]*\d*)\b)\s*\/\s*(?:[A-Z_\s]{2,20}?)\s+([A-ZÀÈÉÌÒÙ][A-Za-zÀ-ÿ\s']+?(?:\s+\([^)]+\))?)\s+(\d)\s+(BB|HB|FB|RO|AI|MP)\s+(\d{1,2}\/\d{1,2})\s*[-–]\s*(\d{1,2}\/\d{1,2})/gi;let m;while((m=pat.exec(norm))!==null){const nome=rcCleanName(m[2]);if(!nome||nome.length<2)continue;guests.push({camera:m[1].trim(),nome,pax:parseInt(m[3]),trattamento:m[4].trim(),checkin:rcFmtDate(m[5],year),checkout:rcFmtDate(m[6],year)});}return guests;}
function rcFmtDate(raw,year){const p=raw.split('/');return p.length===2?String(p[0]).padStart(2,'0')+'/'+String(p[1]).padStart(2,'0')+'/'+year:raw;}
function rcCalcNights(ci,co){try{const[di,mi,yi]=ci.split('/').map(Number),[d2,m2,y2]=co.split('/').map(Number);const n=Math.round((new Date(y2,m2-1,d2)-new Date(yi,mi-1,di))/86400000);return n>0?n:'—';}catch{return '—';}}
function rcTodayStr(){const d=new Date();return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
function ccNumberHTML(){const g=[0,1,2,3].map(()=>`<div class="cc-group">${[0,1,2,3].map(()=>`<span class="cc-digit"></span>`).join('')}</div>`);return`<div class="cc-num-wrap">${g[0]}<span class="cc-dash">–</span>${g[1]}<span class="cc-dash">–</span>${g[2]}<span class="cc-dash">–</span>${g[3]}</div>`;}
function ccExpiryHTML(){return`<div class="cc-exp-wrap"><span class="cc-exp-digit"></span><span class="cc-exp-digit"></span><span class="cc-slash">/</span><span class="cc-exp-digit"></span><span class="cc-exp-digit"></span></div>`;}
function rcCardHTML(g){const nights=rcCalcNights(g.checkin,g.checkout),paxIT=g.pax+(g.pax===1?' ospite':' ospiti'),paxEN=g.pax+(g.pax===1?' guest':' guests'),trat=tratMap[g.trattamento]||g.trattamento;return`<div class="pc-header"><div><div class="pc-title">Registration Card</div><div class="pc-sub">Check-in — ${rcTodayStr()}</div></div><div class="pc-header-right"><div class="pc-rlabel">Camera / Room</div><div class="pc-room">${g.camera}</div></div></div><div class="pc-body"><div class="pc-name">${g.nome}</div><div class="pc-dates"><div class="pc-dc"><div class="pc-dl">Arrivo<br>Arrival</div><div class="pc-dv">${g.checkin||'—'}</div></div><div class="pc-dc"><div class="pc-dl">Partenza<br>Departure</div><div class="pc-dv">${g.checkout||'—'}</div></div><div class="pc-dc"><div class="pc-dl">Notti<br>Nights</div><div class="pc-dv">${nights}</div></div><div class="pc-dc"><div class="pc-dl">${paxIT}<br>${paxEN}</div><div class="pc-dv">${trat}</div></div></div><div class="pc-bilingual"><div class="pc-lc"><div class="pc-ltag">IT — Garanzia</div><div class="pc-ltitle">Carta di credito a garanzia</div><div class="pc-ltext">In conformità alla nostra policy, viene richiesta una carta di credito a garanzia per eventuali extra, danni alla camera o servizi non inclusi nella prenotazione. Nessun importo verrà addebitato senza preventiva comunicazione e consenso dell'ospite.</div></div><div class="pc-lc"><div class="pc-ltag">EN — Guarantee</div><div class="pc-ltitle">Credit card guarantee</div><div class="pc-ltext">In accordance with our policy, a credit card is required as a guarantee for any extras, room damages or services not included in the reservation. No amount will be charged without prior notice and the guest's explicit consent.</div></div></div><div class="pc-cc"><div class="pc-cc-head"><span class="pc-cc-hlabel">Dati carta / Card details</span><div class="pc-cc-types"><span class="pc-cc-type">☐ Visa</span><span class="pc-cc-type">☐ Mastercard</span><span class="pc-cc-type">☐ Amex</span><span class="pc-cc-type">☐ Other</span></div></div><div class="pc-cc-body"><div class="pc-cc-row"><div><div class="pc-fl">Numero carta / Card number</div>${ccNumberHTML()}</div><div><div class="pc-fl">Scadenza / Expiry (MM/AA)</div>${ccExpiryHTML()}</div></div><div><div class="pc-fl">Titolare / Cardholder name</div><div class="pc-holder"></div></div></div></div><div class="pc-privacy"><div class="pc-privacy-head"><span class="pc-privacy-label">Informativa Privacy — Privacy Notice (GDPR Reg. UE 2016/679)</span></div><div class="pc-privacy-body"><div class="pc-pc"><b>IT —</b> I dati personali raccolti con questa scheda saranno trattati dalla struttura ricettiva in qualità di Titolare del trattamento, ai sensi del Reg. UE 2016/679 (GDPR), esclusivamente per finalità di gestione del soggiorno, adempimenti fiscali e di pubblica sicurezza (comunicazione alle autorità ai sensi del T.U.L.P.S.). I dati non saranno ceduti a terzi per finalità commerciali. L'ospite ha diritto di accesso, rettifica, cancellazione e opposizione al trattamento.</div><div class="pc-pc"><b>EN —</b> Personal data collected through this form will be processed by the accommodation facility as Data Controller, pursuant to EU Regulation 2016/679 (GDPR), solely for stay management, fiscal obligations and public security requirements (communication to authorities pursuant to T.U.L.P.S.). Data will not be shared with third parties for commercial purposes. Guests have the right to access, rectify, erase and object to the processing of their personal data.</div></div></div><div class="pc-sign"><div class="pc-sf"><div class="pc-slabel">Firma ospite / Guest signature</div><div class="pc-sline"></div></div><div class="pc-sf"><div class="pc-slabel">Data / Date &nbsp;${rcTodayStr()}</div><div class="pc-sline"></div></div></div></div>`;}
const PRINT_CSS=`*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;margin:0;}@page{margin:0;size:A4;}.page{width:210mm;min-height:297mm;padding:11mm 13mm;page-break-after:always;page-break-inside:avoid;font-size:10pt;color:#1A1916;background:#fff;display:flex;flex-direction:column;}.page:last-child{page-break-after:avoid;}.pc-header{background:#1A1916!important;padding:15px 22px;border-radius:7px 7px 0 0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}.pc-title{font-size:15pt;font-weight:600;color:#fff!important;}.pc-sub{font-size:8pt;text-transform:uppercase;color:#9A9890!important;margin-top:3px;}.pc-header-right{text-align:right;}.pc-rlabel{font-size:7.5pt;text-transform:uppercase;color:#9A9890!important;margin-bottom:3px;}.pc-room{font-size:28pt;font-weight:600;color:#fff!important;line-height:1;}.pc-body{border:1px solid #E0DED8;border-top:none;border-radius:0 0 7px 7px;padding:16px 20px;flex:1;display:flex;flex-direction:column;}.pc-name{font-size:24pt;font-weight:600;color:#1A1916;padding-bottom:10px;border-bottom:2px solid #1A1916;margin-bottom:18px;flex-shrink:0;}.pc-dates{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #E0DED8;border-radius:5px;overflow:hidden;margin-bottom:18px;flex-shrink:0;}.pc-dc{padding:11px 13px;border-right:1px solid #E0DED8;}.pc-dc:last-child{border-right:none;}.pc-dl{font-size:7.5pt;text-transform:uppercase;color:#6A6860;margin-bottom:5px;line-height:1.4;}.pc-dv{font-size:14pt;font-weight:600;color:#1A1916;}.pc-bilingual{display:grid;grid-template-columns:1fr 1fr;border:1px solid #E0DED8;border-radius:5px;overflow:hidden;margin-bottom:18px;flex-shrink:0;}.pc-lc{padding:13px 15px;}.pc-lc:first-child{border-right:1px solid #E0DED8;}.pc-ltag{font-size:7pt;font-weight:600;text-transform:uppercase;color:#1A1916;background:#F0EFEC!important;display:inline-block;padding:2px 8px;border-radius:3px;margin-bottom:6px;}.pc-ltitle{font-size:10.5pt;font-weight:600;margin-bottom:7px;}.pc-ltext{font-size:9pt;color:#6A6860;line-height:1.65;}.pc-cc{border:1px solid #E0DED8;border-radius:5px;overflow:hidden;margin-bottom:18px;flex-shrink:0;}.pc-cc-head{background:#F0EFEC!important;padding:9px 15px;border-bottom:1px solid #E0DED8;display:flex;align-items:center;justify-content:space-between;}.pc-cc-hlabel{font-size:9pt;font-weight:600;text-transform:uppercase;color:#1A1916;}.pc-cc-types{display:flex;gap:7px;}.pc-cc-type{font-size:9pt;border:1px solid #E0DED8;border-radius:4px;padding:3px 11px;background:#fff!important;color:#1A1916;}.pc-cc-body{padding:14px 18px;}.pc-cc-row{display:flex;flex-direction:column;gap:12px;margin-bottom:14px;}.pc-fl{font-size:7.5pt;text-transform:uppercase;color:#6A6860;margin-bottom:7px;}.cc-num-wrap{display:flex;align-items:center;gap:6px;}.cc-group{display:flex;gap:3px;}.cc-digit{width:26px;height:26px;border:1px solid #E0DED8;border-radius:4px;background:#fff!important;display:inline-block;}.cc-dash{font-size:14pt;font-weight:600;color:#1A1916;line-height:26px;}.cc-exp-wrap{display:flex;align-items:center;gap:3px;}.cc-exp-digit{width:26px;height:26px;border:1px solid #E0DED8;border-radius:4px;background:#fff!important;display:inline-block;}.cc-slash{font-size:16pt;font-weight:600;color:#1A1916;line-height:26px;padding:0 3px;}.pc-holder{width:100%;height:30px;border:1px solid #E0DED8;border-radius:4px;display:block;background:#fff!important;}.pc-privacy{border:1px solid #E0DED8;border-radius:5px;overflow:hidden;margin-bottom:18px;flex-shrink:0;}.pc-privacy-head{background:#F0EFEC!important;padding:8px 15px;border-bottom:1px solid #E0DED8;}.pc-privacy-label{font-size:8.5pt;font-weight:600;text-transform:uppercase;color:#1A1916;}.pc-privacy-body{display:grid;grid-template-columns:1fr 1fr;}.pc-pc{padding:10px 14px;font-size:8pt;color:#6A6860;line-height:1.65;}.pc-pc:first-child{border-right:1px solid #E0DED8;}.pc-pc b{color:#1A1916;}.pc-sign{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:flex-end;padding-top:10px;}.pc-sf{display:flex;flex-direction:column;justify-content:flex-end;}.pc-slabel{font-size:8pt;text-transform:uppercase;color:#6A6860;margin-bottom:48px;line-height:1.4;}.pc-sline{border-bottom:2px solid #1A1916;}`;
function preparePrint(idx){const cards=idx===null?guestsData:[guestsData[idx]];const pages=cards.map(g=>`<div class="page">${rcCardHTML(g)}</div>`).join('');const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PRINT_CSS}</style></head><body>${pages}</body></html>`;document.getElementById('printIframe').srcdoc=html;const n=cards.length;document.getElementById('pdTitle').textContent=n===1?`Camera ${cards[0].camera} — ${cards[0].nome}`:`${n} registration card${n>1?'s':''} pronte`;document.getElementById('printDialog').classList.add('open');}
function executePrint(){const iframe=document.getElementById('printIframe');iframe.contentWindow.focus();iframe.contentWindow.print();}
function closePrintDialog(){document.getElementById('printDialog').classList.remove('open');}
function rcRenderCards(guests){
  guestsData=guests;
  document.getElementById('rcCountBadge').textContent=guests.length+(guests.length===1?' ospite':' ospiti');
  const grid=document.getElementById('rcCardGrid');
  grid.innerHTML='';
  guests.forEach((g,i)=>grid.appendChild(rcBuildPreview(g,i)));
  document.getElementById('rcResults').style.display='block';
  // Salva per ripristino
  try{localStorage.setItem('qm_rcGuests',JSON.stringify(guests));}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_rcGuests',value:JSON.stringify(guests)})}).catch(()=>{});}catch(e){}
}
function rcBuildPreview(g,idx){const nights=rcCalcNights(g.checkin,g.checkout);
  const normCam=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
  const arrivoMatch=arriviData&&arriviData.arrivi&&arriviData.arrivi.find(a=>normCam(a.camera)===normCam(g.camera));
  const origine=String(g.origine||(arrivoMatch&&arrivoMatch.origine)||'').trim();
  const isBooking=/booking/i.test(origine);
  const origBadge=origine?`<span class="rc-pill" style="background:${isBooking?'var(--accent-bg)':'var(--surface2)'};color:${isBooking?'var(--accent)':'var(--text-dim)'};font-weight:${isBooking?'700':'400'};">${isBooking?BK_ICON:''}${origine}</span>`:'';
  const card=document.createElement('div');card.className='rc-card';card.innerHTML=`<div class="rc-card-top"><span class="rc-card-label">Registration Card</span><span class="rc-card-room">Camera ${g.camera}</span></div><div class="rc-card-guest">${g.nome}</div><div class="rc-card-dates"><div class="rc-date-cell"><div class="rc-date-label">Arrivo</div><div class="rc-date-val">${g.checkin||'—'}</div></div><div class="rc-date-cell"><div class="rc-date-label">Partenza</div><div class="rc-date-val">${g.checkout||'—'}</div></div><div class="rc-date-cell"><div class="rc-date-label">Notti</div><div class="rc-date-val">${nights}</div></div></div><div class="rc-pills"><span class="rc-pill">${g.pax} ${g.pax===1?'ospite':'ospiti'}</span><span class="rc-pill">${tratMap[g.trattamento]||g.trattamento}</span>${origBadge}</div><div class="rc-card-footer"><span class="rc-hint">Clicca per anteprima</span><button class="btn-print-one" onclick="event.stopPropagation();preparePrint(${idx})">Stampa</button></div>`;card.addEventListener('click',()=>rcOpenModal(idx));return card;}
function rcOpenModal(idx){const g=guestsData[idx];document.getElementById('rcModalTitle').textContent=g.nome+' — Camera '+g.camera;document.getElementById('rcModalBody').innerHTML=`<div class="mp" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:9pt;color:#1A1916;">${rcCardHTML(g)}</div>`;document.getElementById('rcModalPrintBtn').onclick=()=>{rcCloseModal();setTimeout(()=>preparePrint(idx),150);};document.getElementById('rcModalOverlay').classList.add('open');}
function rcCloseModal(){document.getElementById('rcModalOverlay').classList.remove('open');}
function rcCloseModalOutside(e){if(e.target===document.getElementById('rcModalOverlay'))rcCloseModal();}
function rcResetApp(){document.getElementById('rcResults').style.display='none';document.getElementById('rcUploadZone').style.display='block';document.getElementById('rcFileInput').value='';guestsData=[];try{localStorage.removeItem('qm_rcGuests');}catch(e){}}
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
    // Merge se stesso giorno: arrivi e partenze si accumulano, fermate si sostituiscono
    if(arriviData&&arriviData.data&&arriviData.data===newData.data){
      const mergeByCamera=(existing,incoming)=>{
        const map=new Map();
        existing.forEach(x=>map.set(x.camera,x));
        // Nuovi: aggiunge o aggiorna (es. cambio camera viene gestito solo se camera diversa)
        incoming.forEach(x=>{if(!map.has(x.camera))map.set(x.camera,x);});
        return Array.from(map.values());
      };
      newData.arrivi=mergeByCamera(arriviData.arrivi||[],newData.arrivi);
      newData.partenze=mergeByCamera(arriviData.partenze||[],newData.partenze);
      // fermate: sempre sostituite (stato corrente in casa)
    }
    arriviData=newData;
    // Salva locale + cloud
    arriviData._ts=Date.now();
    try{localStorage.setItem('qm_arriviData',JSON.stringify(arriviData));}catch(e){}
    try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_arriviData',value:JSON.stringify(arriviData)})}).catch(()=>{});}catch(e){}
    // Aggiorna UI
    ucSetState('arrivi','loaded',arriviData.data+' · '+arriviData.arrivi.length+' arrivi');
    document.getElementById('arriviLoadedDate').textContent=arriviData.data;
    setUploadTs('arriviTs');
    arriviUpdateKpi();
    // Aggiorna RC cards: arrivi + fermate arrivate OGGI (stessa data del documento)
    (function(){
      // Claude ora classifica già in "arrivi" tutti gli ospiti con check-in oggi,
      // anche se nel PDF erano già in sezione "In Casa"
      if(!arriviData||!arriviData.arrivi||!arriviData.arrivi.length)return;
      const year=arriviData.data?parseInt(arriviData.data.split('/').pop())||new Date().getFullYear():new Date().getFullYear();
      const toGuest=a=>({
        camera:a.camera,
        nome:a.ospite||'',
        pax:parseInt(a.pax)||1,
        trattamento:a.trattamento||'BB',
        checkin:a.arrivo?rcFmtDate(a.arrivo,year):'',
        checkout:a.partenza?rcFmtDate(a.partenza,year):'',
        origine:a.origine||''
      });
      const guests=(arriviData.arrivi||[]).map(toGuest).filter(g=>g.nome&&g.nome.trim());
      if(!guests.length)return;
      document.getElementById('rcUploadZone').style.display='none';
      document.getElementById('rcProcessing').style.display='none';
      rcRenderCards(guests);
    })();
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
      let html=`<div style="background:var(--surface);border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
        <div style="padding:10px 14px;background:var(--accent-bg);border-bottom:1px solid #B8CEEE;display:flex;align-items:center;gap:6px;">
          ${BK_ICON}<span style="font-size:var(--fs-xs);font-weight:700;color:var(--accent);">Booking.com — Riepilogo giornata</span>
        </div>
        <div style="padding:12px 14px;display:flex;gap:14px;flex-wrap:wrap;">`;
      if(bkArrivi.length>0){
        const chips=bkArrivi.map(a=>`<span style="padding:3px 10px;border-radius:10px;background:var(--accent-bg);color:var(--accent);font-size:var(--fs-xxs);font-weight:600;border:1px solid #B8CEEE;">↓ ${a.camera}${a.ospite?' · '+a.ospite.split(' ')[0]:''}</span>`).join('');
        html+=`<div style="flex:1;min-width:160px;"><div style="font-size:var(--fs-xxs);color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">Check-in <span style="background:var(--accent);color:#fff;border-radius:6px;padding:0 6px;">${bkArrivi.length}</span></div><div style="display:flex;flex-wrap:wrap;gap:4px;">${chips}</div></div>`;
      }
      if(bkFermate.length>0){
        const chips=bkFermate.map(f=>`<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:10px;background:#F0F5FF;color:#2563EB;font-size:var(--fs-xxs);font-weight:600;border:1px solid #BFDBFE;"><img src="img/icons/fermata.png" class="ov-icon" style="width:16px;height:16px;object-fit:contain;">${f.camera}${f.ospite?' · '+f.ospite.split(' ')[0]:''}</span>`).join('');
        html+=`<div style="flex:1;min-width:160px;"><div style="font-size:var(--fs-xxs);color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">In fermata <span style="background:#2563EB;color:#fff;border-radius:6px;padding:0 6px;">${bkFermate.length}</span></div><div style="display:flex;flex-wrap:wrap;gap:4px;">${chips}</div></div>`;
      }
      if(bkPartenze.length>0){
        const chips=bkPartenze.map(p=>`<span style="padding:3px 10px;border-radius:10px;background:#FFFBEB;color:#92400E;font-size:var(--fs-xxs);font-weight:600;border:1px solid #FDE68A;">↑ ${p.camera}${p.ospite?' · '+p.ospite.split(' ')[0]:''}</span>`).join('');
        html+=`<div style="flex:1;min-width:160px;"><div style="font-size:var(--fs-xxs);color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">Check-out — recensioni attese <span style="background:#D97706;color:#fff;border-radius:6px;padding:0 6px;">${bkPartenze.length}</span></div><div style="display:flex;flex-wrap:wrap;gap:4px;">${chips}</div></div>`;
      }
      html+=`</div></div>`;
      ovBox.innerHTML=html;
      ovBox.style.display='block';
    } else {
      ovBox.innerHTML='';
      ovBox.style.display='none';
    }
  }
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
  const hdrs=`<div style="display:grid;grid-template-columns:1fr 72px 52px 88px 44px;gap:6px;padding:4px 12px 6px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-transform:uppercase;letter-spacing:.05em;">
    <div>Prodotto</div><div style="text-align:center;">Ultimo mov.</div><div style="text-align:center;">Soglia</div><div style="text-align:right;">Stock</div><div></div>
  </div>`;
  // Rows
  const rows=items.map(it=>{
    const borderColor=it.status==='out'?'var(--red)':it.status==='low'?'var(--amber)':'transparent';
    const qtyColor=it.status==='out'?'var(--red)':it.status==='low'?'var(--amber)':'var(--green)';
    const lastStr=invFmtDate(it.last?.ts);
    const sogliaStr=it.soglia!=null?`<span style="cursor:pointer;color:var(--text-muted);" onclick="invEditSoglia('${it.bc}')" title="Modifica soglia">${it.soglia}</span>`:`<span style="cursor:pointer;color:var(--text-dim);font-style:italic;" onclick="invEditSoglia('${it.bc}')" title="Imposta soglia">—</span>`;
    const unit=it.unit?`<span style="font-size:var(--fs-xxs);color:var(--text-dim);margin-left:2px;">${_esc(it.unit)}</span>`:'';
    return`<div style="display:grid;grid-template-columns:1fr 72px 52px 88px 44px;gap:6px;align-items:center;padding:9px 12px;background:var(--surface);border:1px solid var(--border-light);border-left:3px solid ${borderColor};border-radius:8px;margin-bottom:5px;">
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
function invDeleteMove(id){
  if(!confirm('Eliminare questo movimento?'))return;
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
  if(isNaN(n)||n<0){alert('Quantità non valida');return;}
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
function invDeleteProduct(bc){
  let catalog={};
  try{catalog=JSON.parse(localStorage.getItem('qm_inv_catalog_'+_invWh)||'{}');}catch(e){}
  const name=catalog[bc]?.name||bc;
  if(!confirm(`Eliminare "${name}" dal catalogo di questo magazzino?\nI movimenti di questo magazzino verranno rimossi. L'altro magazzino non viene modificato.`))return;
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
    // Consumo settimanale: basato su scarichi (out), periodo minimo 14gg per smorzare
    // picchi da pochi dati. Con dati sufficienti converge al valore reale.
    const effectiveDays=Math.max(14,days);
    const consumoSett=consumo>0?Math.round((consumo/effectiveDays)*7*10)/10:0;
    const consumoGg=consumoSett/7;
    const autonomia=consumoGg>0?Math.round((stock[bc]??0)/consumoGg):null;
    return{bc,name:p.name,unit:p.unit||'',qty:stock[bc]??0,consumo,rifornimento,consumoSett,autonomia,hasMoves:bm.length>0};
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

  // Tabella dettaglio — ordine alfabetico
  const sorted=[...items].sort((a,b)=>a.name.localeCompare(b.name,'it'));
  const hdrs=`<div style="display:grid;grid-template-columns:1fr 80px 70px;gap:4px;padding:4px 10px 6px;font-size:var(--fs-xxs);color:var(--text-dim);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-top:4px;">
    <div>Prodotto</div>
    <div>Cons./sett</div>
    <div>Stock</div>
  </div>`;
  const rows=sorted.map(it=>{
    const borderL=it.autonomia!==null&&it.autonomia<=7?'var(--red)':it.autonomia!==null&&it.autonomia<=14?'var(--amber)':'transparent';
    const unit=it.unit?` <span style="font-size:9px;color:var(--text-dim);">${_esc(it.unit)}</span>`:'';
    return`<div style="background:var(--surface);border:1px solid var(--border-light);border-left:3px solid ${borderL};border-radius:8px;padding:8px 10px;margin-bottom:5px;">
      <div style="display:grid;grid-template-columns:1fr 80px 70px;gap:4px;align-items:center;">
        <div style="font-size:var(--fs-xs);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${_esc(it.name)}">${_esc(it.name)}</div>
        <div style="font-size:var(--fs-xs);">${it.consumoSett>0?`${it.consumoSett}${unit}`:'—'}</div>
        <div style="font-size:var(--fs-xs);">${it.qty}${unit}</div>
      </div>
    </div>`;
  }).join('');

  el.innerHTML=periodHtml+kpi+urgBlock+`<div style="max-width:420px;"><div style="font-size:var(--fs-xxs);font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim);margin-bottom:7px;">📋 Dettaglio prodotti</div>`+hdrs+rows+`</div>`;
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
  if(!newName.trim()){alert('Il nome non può essere vuoto.');return;}
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
function invRenderCatalog(){
  const el=document.getElementById('inv-catalog-view');
  if(!el)return;
  const{catalog}=invGetData();
  const items=Object.entries(catalog).sort((a,b)=>a[1].name.localeCompare(b[1].name,'it'));
  if(!items.length){el.innerHTML='<div style="padding:32px;text-align:center;color:var(--text-dim);font-size:var(--fs-sm);">Nessun prodotto in catalogo</div>';return;}
  el.innerHTML=`<div style="max-width:560px;"><div style="display:flex;flex-direction:column;gap:6px;padding:4px 0;">
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
  if(!bc){alert('Seleziona un prodotto.');return;}
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
  if(!date){alert('Inserisci la data ordine.');return;}
  if(!_invOrdersDraft.length){alert('Aggiungi almeno un prodotto.');return;}
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

function invOrdersUndoReceived(id){
  if(!confirm('Annullare la ricezione? I movimenti di carico creati verranno rimossi dall\'inventario.'))return;
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

function invOrdersDelete(id){
  if(!confirm('Eliminare questo ordine?'))return;
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
  if(!filtered.length){alert('Nessun ordine da stampare.');return;}
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

  let listHtml='';
  if(!items.length){
    listHtml='<div style="padding:20px 0;text-align:center;color:var(--text-dim);font-size:var(--fs-sm);">Nessuna richiesta</div>';
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
      rows.forEach(r=>{
        const isNew=seenUntil ? (r.ts&&r.ts>seenUntil) : false;
        const d=new Date(r.ts);
        const tsStr=isNaN(d)?_tpFmtDate(r.ts):d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});
        listHtml+=`<div style="background:var(--surface);border:1px solid var(--border-light);border-left:3px solid ${isNew?'var(--accent)':'transparent'};border-radius:8px;padding:11px 14px;margin-bottom:5px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;">
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
      });
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
  function cmStatus(room){
    const rs=state&&state[room];
    if(!rs||!rs.visited)return'pending';
    if(rs.libera)return'empty';
    const nc=Object.values(rs.checks||{}).some(v=>!v);
    const needsBottle=rs.bottiglia==='consumata';
    if(nc&&needsBottle)return'both';if(nc)return'warn';if(needsBottle)return'bottle';return'ok';
  }
  if(!state||!Object.keys(state).length){
    el.innerHTML=`<div style="text-align:center;padding:24px 20px 16px;color:var(--text-dim);">
      <div style="font-size:2rem;margin-bottom:8px;">🌅</div>
      <div style="font-weight:700;font-size:var(--fs-sm);margin-bottom:4px;">Nessun controllo per oggi</div>
      <div style="font-size:var(--fs-xs);margin-bottom:14px;">${dateStr}</div>
      <a href="controllo-mattino.html" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:var(--accent);color:#fff;padding:10px 18px;border-radius:10px;font-weight:700;font-size:var(--fs-xs);text-decoration:none;">📱 Apri app mobile</a>
    </div>`;
    cmLoadWeeklyQC();
    return;
  }
  const visited=CM_ROOMS.filter(r=>state[r]?.visited).length;
  const btl=CM_ROOMS.filter(r=>{const s=cmStatus(r);return s==='bottle'||s==='both';});
  const wrn=CM_ROOMS.filter(r=>{const s=cmStatus(r);return s==='warn'||s==='both';});
  const ok=CM_ROOMS.filter(r=>cmStatus(r)==='ok');
  const emp=CM_ROOMS.filter(r=>cmStatus(r)==='empty');
  const pnd=CM_ROOMS.filter(r=>cmStatus(r)==='pending');

  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
    <div style="font-size:var(--fs-xs);color:var(--text-dim);">${dateStr}</div>
    <div style="display:flex;gap:7px;align-items:center;">
      <button onclick="cmPrintBottle()" style="display:inline-flex;align-items:center;gap:5px;background:var(--surface);border:1px solid var(--border);color:var(--text-dim);padding:7px 14px;border-radius:8px;font-weight:700;font-size:var(--fs-xxs);cursor:pointer;">🖨️ Stampa A4</button>
      <a href="controllo-mattino.html" target="_blank" style="display:inline-flex;align-items:center;gap:5px;background:var(--accent);color:#fff;padding:7px 14px;border-radius:8px;font-weight:700;font-size:var(--fs-xxs);text-decoration:none;">📱 Apri app mobile</a>
    </div>
  </div>`;
  h+=`<div style="background:var(--surface);border-radius:12px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:var(--fs-xxs);color:var(--text-dim);font-weight:600;">Camere visitate</span>
      <span style="font-size:var(--fs-xs);font-weight:800;color:var(--accent);">${visited} / ${CM_ROOMS.length}</span>
    </div>
    <div style="height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden;">
      <div style="height:100%;background:linear-gradient(90deg,var(--accent),#4A7FC1);border-radius:4px;width:${Math.round(visited/CM_ROOMS.length*100)}%;transition:width .4s;"></div>
    </div>
  </div>`;
  h+=`<div style="display:flex;gap:8px;margin-bottom:14px;">
    ${[['💧',btl.length,'Da mettere','var(--accent)'],['✅',ok.length,'Non consumate','var(--green)'],['⭕',pnd.length,'Da visitare','var(--text-dim)']].map(([ico,n,lbl,col])=>`
    <div style="flex:1;background:var(--surface);border-radius:10px;padding:12px 8px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.06);">
      <div style="font-size:1.3rem;font-weight:800;color:${col};line-height:1;">${ico} ${n}</div>
      <div style="font-size:0.6rem;color:var(--text-dim);margin-top:3px;">${n===1?'camera':'camere'} · ${lbl}</div>
    </div>`).join('')}
  </div>`;
  if(btl.length>0){
    h+=`<div style="background:var(--surface);border-radius:12px;margin-bottom:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
      <div style="padding:12px 16px;font-size:var(--fs-xs);font-weight:700;background:#FEF3C7;color:#92400E;display:flex;align-items:center;gap:6px;">💧 Portare bottiglia riempita — ${btl.length} ${btl.length===1?'camera':'camere'}</div>
      <div style="padding:12px 14px;display:flex;flex-wrap:wrap;gap:8px;">${btl.map(r=>`<span style="padding:5px 14px;border-radius:20px;font-size:var(--fs-xs);font-weight:700;background:var(--accent-bg);color:var(--accent);border:1.5px solid #B8CEEE;">${r}</span>`).join('')}</div>
    </div>`;
  }else{
    h+=`<div style="background:var(--surface);border-radius:12px;margin-bottom:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
      <div style="padding:12px 16px;font-size:var(--fs-xs);font-weight:700;background:#D1FAE5;color:#065F46;">💧 Nessuna bottiglia consumata — niente da portare ✅</div>
    </div>`;
  }
  if(pnd.length>0){
    h+=`<div style="background:var(--surface);border-radius:12px;margin-bottom:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
      <div style="padding:12px 16px;font-size:var(--fs-xs);font-weight:700;background:#F3F4F6;color:var(--text-dim);">⭕ Non ancora visitate — ${pnd.length} ${pnd.length===1?'camera':'camere'}</div>
      <div style="padding:10px 14px;display:flex;flex-wrap:wrap;gap:7px;">${pnd.map(r=>`<span style="padding:5px 14px;border-radius:20px;font-size:var(--fs-xs);font-weight:700;background:#fff;color:#444;border:1.5px solid #C9CDD4;">${r}</span>`).join('')}</div>
    </div>`;
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
      // QC solo quando bottiglia consumata e sostituita (non su non consumate, DND né camere libere)
      if(rs&&rs.visited&&!rs.dnd&&!rs.libera&&rs.bottiglia==='consumata'){perRoom[r]++;totalChecks++;}
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
  // Righe per camera: semplici e leggibili
  const roomRows=roomsChecked.length?roomsChecked.map((r,idx)=>{
    const n=perRoom[r];
    const col=n>=5?'var(--green)':n>=3?'var(--accent)':'var(--text)';
    return`<div style="display:flex;align-items:baseline;gap:10px;padding:9px 14px;${idx>0?'border-top:1px solid var(--border-light)':''};">
      <span style="font-size:14px;font-weight:700;color:var(--text);flex:1;">${r}</span>
      <span style="font-size:22px;font-weight:900;color:${col};line-height:1;">${n}</span>
      <span style="font-size:11px;color:var(--text-dim);min-width:30px;">${n===1?'volta':'volte'}</span>
    </div>`;
  }).join(''):`<div style="color:var(--text-dim);font-size:13px;padding:12px 14px;">Nessun controllo questa settimana.</div>`;
  // Testo anteprima WhatsApp
  const waLines=roomsChecked.map(r=>`• ${r} — ${perRoom[r]} ${perRoom[r]===1?'volta':'volte'}`).join('\n');
  const waMsg=`Ciao Laura ti invio il report settimanale dei miei controlli qualità nelle camere SoulArt legati alla distribuzione delle Bottiglie Culligan.\n\n📊 Quality Check Settimanale SoulArt Hotel\n${weekFrom} → ${weekTo}\n\n✅ ${roomsChecked.length} ${roomsChecked.length===1?'camera controllata':'camere controllate'} su ${CM_ROOMS.length}\n\n${waLines||'Nessun dato'}\n\nQuality Manager Paolo P.`;
  const waText=encodeURIComponent(waMsg);
  const section=document.createElement('div');
  section.style.cssText='margin-top:14px;';
  section.innerHTML=`
    <div style="background:var(--surface);border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
      <div style="padding:12px 16px;background:var(--accent-bg);border-bottom:1px solid #B8CEEE;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div>
          <div style="font-size:var(--fs-xs);font-weight:700;color:var(--accent);">📊 Quality Check Settimanale SoulArt Hotel</div>
          <div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-top:2px;">${weekFrom} → ${weekTo}</div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:22px;font-weight:900;color:var(--accent);">${roomsChecked.length}</span>
          <span style="font-size:var(--fs-xxs);color:var(--text-dim);"> / ${CM_ROOMS.length} camere</span>
        </div>
      </div>
      <div style="padding:4px 0;">${roomRows}</div>
      ${roomsNot.length?`<div style="padding:8px 14px;border-top:1px solid var(--border-light);"><span style="font-size:var(--fs-xxs);color:var(--text-dim);">Non visitate: ${roomsNot.join(', ')}</span></div>`:''}
      <div style="padding:10px 14px;border-top:1px solid var(--border-light);display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <a href="https://wa.me/393274919588?text=${waText}" target="_blank" style="display:inline-flex;align-items:center;gap:7px;font-size:var(--fs-xs);padding:10px 18px;border-radius:10px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.555 4.122 1.528 5.857L.057 23.882a.5.5 0 0 0 .607.65l6.277-1.638A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.13-1.418l-.36-.214-3.733.974.998-3.647-.236-.374A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            WhatsApp albergo
          </a>
          <button data-msg="${waMsg.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" onclick="navigator.clipboard.writeText(this.dataset.msg).then(()=>{this.textContent='✓ Copiato!';setTimeout(()=>this.textContent='📋 Copia testo',2000);});" style="display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:var(--fs-xs);color:var(--text);cursor:pointer;font-weight:600;">📋 Copia testo</button>
          <button onclick="const p=this.parentNode.parentNode.querySelector('.qc-preview');p.style.display=p.style.display==='none'?'block':'none';this.textContent=p.style.display==='none'?'👁 Anteprima':'✕ Chiudi';" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:var(--fs-xs);color:var(--text-dim);cursor:pointer;">👁 Anteprima</button>
        </div>
        <div class="qc-preview" style="display:none;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:12px;">
          <pre style="font-family:inherit;font-size:12px;color:#166534;white-space:pre-wrap;margin:0;">${waMsg.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>
        </div>
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
  if(!w){alert('Abilita i popup per stampare.');return;}
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
