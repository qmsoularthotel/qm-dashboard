const DEPTS={fo:{label:'Front Office',cls:'fo',members:['Maddaloni M.','Presta P.','De Rosa T.','Pennacchio V.','Perez L.','Imparato G.','Vatiero R.','Barbosa D.','D\'Andrea F.','Grieco V.']},hk:{label:'Housekeeping',cls:'hk',members:['Matarese A.','Nacci M.','De Masi C.','Chiantese M.','Extra Antonella','Extra Anushka','Scognamillo E.','Esposito M.','Branno M.','Sarnataro A.']},bkf:{label:'Breakfast',cls:'bkf',members:['Amorese S.','Albano D.','Ferace C.','Extra BKF SAU']},mt:{label:'Manutenzione',cls:'mt',members:['Basile G.']}};
const ALL_STAFF=Object.values(DEPTS).flatMap(d=>d.members);
let weekData=null,activeDay=0;
const IS_REST=v=>{if(!v)return true;const u=v.trim().toUpperCase();return['R','RIPOSO','OFF','—','-','–',''].includes(u);};
const WEEK={giorni:[
  {label:'Lun 16',date:new Date(2026,2,16),shifts:{'Maddaloni M.':'P','Presta P.':'R','De Rosa T.':'CC','Pennacchio V.':'CG','Perez L.':'AC','Imparato G.':'AG','Vatiero R.':'R','Barbosa D.':'NG','D\'Andrea F.':'R','Grieco V.':'NC','Matarese A.':'R','Nacci M.':'SOUL N.','De Masi C.':'SOUL','Chiantese M.':'200','Scognamillo E.':'400','Esposito M.':'300/100','Branno M.':'R','Sarnataro A.':'PR/MS','Amorese S.':'BKF SOUL','Albano D.':'R','Ferace C.':'BKF GALL','Extra BKF SAU':'R','Basile G.':'9-17 porterage'}},
  {label:'Mar 17',date:new Date(2026,2,17),shifts:{'Maddaloni M.':'P','Presta P.':'AC','De Rosa T.':'CG','Pennacchio V.':'R','Perez L.':'AG','Imparato G.':'INT GALL 10/18','Vatiero R.':'CC','Barbosa D.':'NG','D\'Andrea F.':'R','Grieco V.':'NC','Matarese A.':'SOUL','Nacci M.':'SOUL N.','De Masi C.':'PR/MS O (200)','Chiantese M.':'400','Scognamillo E.':'R','Esposito M.':'300/200','Branno M.':'100','Sarnataro A.':'R','Amorese S.':'R','Albano D.':'BKF SOUL','Ferace C.':'BKF GALL','Extra BKF SAU':'BKF SOUL','Basile G.':'9-17 porterage'}},
  {label:'Mer 18',date:new Date(2026,2,18),shifts:{'Maddaloni M.':'P','Presta P.':'P','De Rosa T.':'CG','Pennacchio V.':'CC','Perez L.':'AC','Imparato G.':'R','Vatiero R.':'AG','Barbosa D.':'R','D\'Andrea F.':'NG','Grieco V.':'NC','Matarese A.':'SOUL','Nacci M.':'SOUL N.','De Masi C.':'FERIE','Chiantese M.':'200','Scognamillo E.':'400/300','Esposito M.':'R','Branno M.':'100','Sarnataro A.':'PR/MS','Amorese S.':'FERIE','Albano D.':'BKF SOUL','Ferace C.':'BKF GALL','Extra BKF SAU':'BKF SOUL','Basile G.':'9-17'}},
  {label:'Gio 19',date:new Date(2026,2,19),shifts:{'Maddaloni M.':'P','Presta P.':'PGALL','De Rosa T.':'CG','Pennacchio V.':'R','Perez L.':'AC','Imparato G.':'CC','Vatiero R.':'AG','Barbosa D.':'R','D\'Andrea F.':'NG','Grieco V.':'NC','Matarese A.':'SOUL','Nacci M.':'SOUL N.','De Masi C.':'FERIE','Chiantese M.':'R','Scognamillo E.':'400','Esposito M.':'300/200','Branno M.':'100','Sarnataro A.':'PR/MS','Amorese S.':'FERIE','Albano D.':'BKF SOUL','Ferace C.':'BKF GALL','Extra BKF SAU':'BKF SOUL','Basile G.':'9-17'}},
  {label:'Ven 20',date:new Date(2026,2,20),shifts:{'Maddaloni M.':'P','Presta P.':'R','De Rosa T.':'R','Pennacchio V.':'AC','Perez L.':'AG','Imparato G.':'CC','Vatiero R.':'CG','Barbosa D.':'NC','D\'Andrea F.':'NG','Grieco V.':'R','Matarese A.':'SOUL','Nacci M.':'R','De Masi C.':'FERIE','Chiantese M.':'SOUL N.','Scognamillo E.':'400/300','Esposito M.':'300/200','Branno M.':'100','Sarnataro A.':'PR/MS','Amorese S.':'BKF SOUL','Albano D.':'BKF SOUL','Ferace C.':'R','Extra BKF SAU':'BKF GALL','Basile G.':'9-17'}},
  {label:'Sab 21',date:new Date(2026,2,21),shifts:{'Maddaloni M.':'R','Presta P.':'AC','De Rosa T.':'AG','Pennacchio V.':'CC','Perez L.':'R','Imparato G.':'INT GALL 10/18','Vatiero R.':'CG','Barbosa D.':'NC','D\'Andrea F.':'NG','Grieco V.':'R','Matarese A.':'SOUL','Nacci M.':'SOUL N.','De Masi C.':'FERIE','Chiantese M.':'200','Scognamillo E.':'400','Esposito M.':'300','Branno M.':'100','Sarnataro A.':'PR/MS','Amorese S.':'BKF SOUL','Albano D.':'BKF SOUL','Ferace C.':'BKF GALL','Extra BKF SAU':'BKF GALL','Basile G.':'9-14'}},
  {label:'Dom 22',date:new Date(2026,2,22),shifts:{'Maddaloni M.':'R','Presta P.':'P','De Rosa T.':'AG','Pennacchio V.':'CG','Perez L.':'R','Imparato G.':'AC','Vatiero R.':'INT GALL 9/17','Barbosa D.':'NC','D\'Andrea F.':'NG','Grieco V.':'CC','Matarese A.':'SOUL','Nacci M.':'SOUL N.','De Masi C.':'R','Chiantese M.':'200','Scognamillo E.':'400','Esposito M.':'300','Branno M.':'100','Sarnataro A.':'PR/MS','Amorese S.':'BKF SOUL','Albano D.':'BKF SOUL','Ferace C.':'BKF GALL','Extra BKF SAU':'BKF GALL','Basile G.':'R'}}
]};
let turnoOpen=false;
function toggleTurnoAccordion(){}
function ucToggle(key){
  const slot=document.getElementById('uc-'+key);
  const panel=document.getElementById('uc-'+key+'-panel');
  if(!panel)return;
  const isOpen=panel.classList.contains('open');
  // Chiudi tutti gli altri
  ['turno','arrivi','pul','bkf'].forEach(k=>{
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
      ['turno','arrivi','pul','bkf'].forEach(k=>{
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
function turniPasteDetect(el){
  const text=el.value;
  if(!text.trim())return;
  // Aspetta che l'utente abbia incollato tutto (debounce 600ms)
  clearTimeout(el._t);
  el._t=setTimeout(()=>handleTurniPaste(text),600);
}
function handleTurniPaste(text){
  ucSetState('turno','loading','Elaborazione...');
  try{
    const parsed=parseTurniTSV(text);
    if(!parsed||!parsed.giorni||!parsed.giorni.length)throw new Error('Formato non riconosciuto');
    parsed.giorni=parsed.giorni.map(g=>({...g,date:g.date?new Date(g.date+'T12:00:00'):new Date()}));
    const _wts=Date.now();
    const toSave=parsed.giorni.map(g=>({...g,date:g.date.toISOString()}));
    toSave._ts=_wts;
    localStorage.setItem('qm_weekData',JSON.stringify(toSave));
    localStorage.setItem('qm_ts_turnoTs',String(_wts));
    kvSet('qm_weekData',JSON.stringify(toSave));
    loadWeekData(parsed);
    // Imposta activeDay al giorno di oggi (o il più vicino)
    const todayStr=new Date().toISOString().slice(0,10);
    let bestIdx=0,bestDiff=Infinity;
    parsed.giorni.forEach((g,i)=>{const d=new Date(g.date);const diff=Math.abs(d-new Date(todayStr));if(diff<bestDiff){bestDiff=diff;bestIdx=i;}});
    activeDay=bestIdx;renderDay(activeDay);updateWeekNavActive();
    const range=parsed.giorni[0].label+' – '+parsed.giorni[parsed.giorni.length-1].label;
    ucSetState('turno','loaded',range);
    setUploadTs('turnoTs',_wts);
    setTimeout(()=>{try{refreshOverviewForDate(new Date());}catch(e){}},100);
    // Svuota textarea
    const ta=document.getElementById('turniPasteBox');if(ta)ta.value='';
  }catch(e){ucSetState('turno','error','Errore: '+e.message);}
}
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

  // Righe dati — filtra staff noto (exact o prefix) o Extra*
  for(let ri=headerRow+1;ri<rows.length;ri++){
    const row=rows[ri];
    const nome=(row[0]||'').trim();
    if(!nome)continue;
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

REGOLE IMPORTANTI:
1. Estrai TUTTE le righe presenti nel planning senza eccezioni, incluse righe con nomi "Extra XYZ" — ognuna è una persona diversa.
2. Usa il nome ESATTAMENTE come scritto nel planning (rispetta maiuscole/minuscole e abbreviazioni). Non abbinare, non rinominare.
3. Le celle con solo "-" o "." o vuote → metti "R" (persona non disponibile quel giorno).
4. La lettera "R" da sola → metti "R" (riposo). ATTENZIONE: "P" è un turno valido (presenza), NON è riposo — non confondere P con R.
5. Qualsiasi altro valore ("AG", "P", "P GALL", "BKF SOUL", "FERIE", "R RECUPERO", "SOUL N.", "9-17", "INT GALL 10/18", "NC", "NG", "CC", "CG", "AC", ecc.) → metti il valore ESATTO della cella così com'è, senza modifiche.
6. Le date nel planning sono nel formato "lunedì 30 marzo" → converti in "2026-03-30" e label "Lun 30/03".
7. Includi tutti i 7 giorni presenti nel planning.

Elenco orientativo dei dipendenti (potrebbero esserci nomi aggiuntivi nell'immagine — includili tutti):
${staff.join(', ')}

Restituisci SOLO il JSON, nessun testo prima o dopo.`;
    const contentBlock=isPDF
      ?{type:'document',source:{type:'base64',media_type:mediaType,data:base64}}
      :{type:'image',source:{type:'base64',media_type:mediaType,data:base64}};
    const response=await fetch('https://anthropic-proxy.qm-d82.workers.dev/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
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
      const toSave=parsed.giorni.map(g=>({...g,date:g.date.toISOString()}));
      toSave._ts=_wts;
      localStorage.setItem('qm_weekData',JSON.stringify(toSave));
      localStorage.setItem('qm_ts_turnoTs',String(_wts));
      fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_weekData',value:JSON.stringify(toSave)})}).catch(()=>{});
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
function updateSidebarInfo(){if(!weekData)return;const g=weekData.giorni[activeDay];document.getElementById('loadedDate').textContent=g.label;document.getElementById('loadedActive').textContent=ALL_STAFF.filter(n=>!IS_REST(getShift(g.shifts,n))).length+' in turno';document.getElementById('loadedAbsent').textContent=ALL_STAFF.filter(n=>IS_REST(getShift(g.shifts,n))).length+' non in servizio';}
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
  const nonServizio=ALL_STAFF.filter(n=>IS_REST(getShift(shifts,n)));
  let html='';
  if(nonServizio.length)html+=`<div class="non-servizio-strip"><span class="ns-label">Non in servizio — ${g.label}</span>${nonServizio.map(n=>`<span class="ns-chip">${n}</span>`).join('')}</div>`;
  const shiftRow=(n,sv,cls)=>`<div class="staff-row" style="cursor:pointer;" title="Clicca per correggere" onclick="editShift(${idx},'${n.replace(/'/g,"\\'")}')"><span class="sname">${n}</span><span class="sshift ${cls}">${sv||'—'}</span></div>`;
  html+='<div class="staff-grid">';
  Object.entries(DEPTS).forEach(([key,dept])=>{
    const inT=dept.members.filter(n=>!IS_REST(getShift(shifts,n)));if(!inT.length)return;
    html+=`<div class="staff-dept-card"><div class="sdh"><span class="sdh-name ${dept.cls}">${dept.label}</span><span class="sdh-count">${inT.length} in turno</span></div><div class="staff-list">${inT.map(n=>{const sv=(getShift(shifts,n)||'').trim();return shiftRow(n,sv,['P','AC','CG','AG','CC','NC','NG'].includes(sv)?'ss-active':'ss-special');}).join('')}</div></div>`;
  });
  // Extra / collaboratori non in DEPTS (case-insensitive)
  const extra=Object.entries(shifts).filter(([n,v])=>!IS_REST(v)&&!allStaffLow.has(n.toLowerCase()));
  if(extra.length){
    html+=`<div class="staff-dept-card"><div class="sdh"><span class="sdh-name" style="color:var(--amber);">Extra / Collaboratori</span><span class="sdh-count">${extra.length} in turno</span></div><div class="staff-list">${extra.map(([n,v])=>{const sv=(v||'').trim();return shiftRow(n,sv,'ss-special');}).join('')}</div></div>`;
  }
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
  const toSave=weekData.giorni.map(g=>({...g,date:g.date instanceof Date?g.date.toISOString():g.date}));
  toSave._ts=Date.now();
  localStorage.setItem('qm_weekData',JSON.stringify(toSave));
  kvSet('qm_weekData',JSON.stringify(toSave));
  renderDay(dayIdx);
  updateSidebarInfo();
}
function resetTurni(){weekData=null;activeDay=0;ucSetState('turno','','Non caricato');turniInput.value='';
  try{localStorage.removeItem('qm_weekData');}catch(e){}
  try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_weekData',value:null})}).catch(()=>{});}catch(e){}document.getElementById('loadedInfo').classList.remove('visible');document.getElementById('weekNavWrap').style.display='none';document.getElementById('btnReload').style.display='none';const ts=document.getElementById('turnoTs');if(ts){ts.textContent='';ts.classList.remove('visible');}document.getElementById('staffArea').innerHTML=`<div class="ov-empty"><div class="ov-empty-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="ov-empty-text">Nessun turno caricato</div><div class="ov-empty-sub">Espandi "Carica turno" nella sidebar per caricare il planning</div></div>`;}
const pageTitles={overview:'Panoramica del giorno',registrazione:'Registration Cards — PMS',checklist:'Checklist operativa','recensioni-sa':'Recensioni — SoulArt Hotel','recensioni-bh':'Recensioni — Boutique Hotel','recensioni-sl':'Recensioni — San Liborio','recensioni-pr':'Recensioni — Principe','recensioni-ms':'Recensioni — Mastrangelo','recensioni-ar':'Recensioni — Art Resort','recensioni-sb':'Recensioni — Santa Brigida',bkfsheet:'Breakfast Sheet — SoulArt Hotel',bkfsheetar:'Breakfast Sheet — Galleria','hkp-sa':'Operativa HKP — SoulArt Hotel','hkp-ar':'Operativa HKP — Art Resort','miniapp':'Mini App — Anteprima e Link'};
let recGroupOpen=false;
function toggleRecGroup(){
  recGroupOpen=!recGroupOpen;
  document.getElementById('recGroupToggle').classList.toggle('open',recGroupOpen);
  document.getElementById('recGroupItems').classList.toggle('open',recGroupOpen);
}
let bkfGroupOpen=false;
function toggleBkfGroup(){
  bkfGroupOpen=!bkfGroupOpen;
  document.getElementById('bkfGroupToggle').classList.toggle('open',bkfGroupOpen);
  document.getElementById('bkfGroupItems').classList.toggle('open',bkfGroupOpen);
}
let hkpGroupOpen=false;
function toggleHkpGroup(){
  hkpGroupOpen=!hkpGroupOpen;
  document.getElementById('hkpGroupToggle').classList.toggle('open',hkpGroupOpen);
  document.getElementById('hkpGroupItems').classList.toggle('open',hkpGroupOpen);
}
function setView(id,navEl){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById('view-'+id).classList.add('active');document.getElementById('pageTitle').textContent=pageTitles[id];if(navEl){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));navEl.classList.add('active');}
  if(id==='bkfsheet'||id==='bkfsheetar'){if(!bkfGroupOpen){bkfGroupOpen=true;document.getElementById('bkfGroupToggle').classList.add('open');document.getElementById('bkfGroupItems').classList.add('open');}}
  if(id==='hkp-sa'||id==='hkp-ar'){if(!hkpGroupOpen){hkpGroupOpen=true;document.getElementById('hkpGroupToggle').classList.add('open');document.getElementById('hkpGroupItems').classList.add('open');}}
  if(id.startsWith('recensioni-')){if(!recGroupOpen){recGroupOpen=true;document.getElementById('recGroupToggle').classList.add('open');document.getElementById('recGroupItems').classList.add('open');}}
  try{localStorage.setItem('qm_last_view',id);}catch(e){}
  document.querySelector('.content').scrollTo({top:0,behavior:'instant'});
  if(id==='overview'&&weekData){
    try{loadWeekData(weekData);}catch(e){}
    try{refreshOverviewForDate(new Date());}catch(e){}
  }
  if(id==='bkfsheet')setTimeout(bkfRenderChart,50);
  if(id==='bkfsheetar')setTimeout(bkfRenderChartAR,50);
  if(id==='miniapp')setTimeout(miniappRender,50);
}
function miniappCopy(inputId,btn){
  const inp=document.getElementById(inputId);
  navigator.clipboard.writeText(inp.value).then(()=>{
    const orig=btn.textContent;btn.textContent='✓ Copiato';btn.style.background='var(--green)';
    setTimeout(()=>{btn.textContent=orig;btn.style.background='';},2000);
  }).catch(()=>{inp.select();document.execCommand('copy');});
}
function miniappRender(){miniappRenderHK();miniappRenderBkf();}
function miniappRenderHK(){
  const el=document.getElementById('miniapp-hk-preview');if(!el)return;
  const today=new Date();
  const todayISO=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  const todayLabel=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][today.getDay()]+' '+String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0');
  const renderS=(data,nome)=>{
    if(!data||!data.giorni)return`<div style="font-size:var(--fs-xxs);color:var(--text-dim);margin-bottom:8px;">${nome}: nessun dato</div>`;
    const g=data.giorni.find(d=>d.data===todayISO)||data.giorni[0];if(!g)return'';
    return`<div style="margin-bottom:10px;">
      <div style="font-size:var(--fs-xxs);font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;">${nome}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:var(--surface2);border-radius:7px;padding:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:#003580;">${g.fermate}</div><div style="font-size:10px;color:var(--text-dim);">Fermate</div></div>
        <div style="background:var(--surface2);border-radius:7px;padding:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:#003580;">${g.partenze}</div><div style="font-size:10px;color:var(--text-dim);">Partenze</div></div>
      </div></div>`;
  };
  if(!hkSoulData&&!hkBoutData){el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Carica Soul App HKP e Boutique App HKP per vedere l\'anteprima</div>';return;}
  el.innerHTML=`<div style="font-size:var(--fs-xxs);font-weight:600;color:var(--accent);margin-bottom:10px;">📅 Oggi — ${todayLabel}</div>`+renderS(hkSoulData,'SoulArt Hotel')+renderS(hkBoutData,'Boutique Hotel');
}
function miniappRenderBkf(){
  const el=document.getElementById('miniapp-bkf-preview');if(!el)return;
  const today=new Date();
  const todayLabel=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][today.getDay()]+' '+String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0');
  if(!bkfData||!bkfData.length){el.innerHTML='<div style="color:var(--text-dim);font-size:var(--fs-xs);">Carica il report pasti per vedere l\'anteprima</div>';return;}
  const todayData=bkfData.find(d=>d.label&&d.label.includes(String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')))||bkfData[bkfActiveDay];
  const coperti=todayData?(todayData.adulti+todayData.bambini):0;
  const t=new Date();t.setHours(0,0,0,0);
  const gruppiOggi=(bkfGroups||[]).filter(g=>{const a=new Date(g.arrivo||g.data);a.setHours(0,0,0,0);const p=new Date(g.partenza||g.arrivo||g.data);p.setHours(0,0,0,0);return t>=a&&t<=p;});
  const totPax=gruppiOggi.reduce((s,g)=>s+g.pax,0);
  const noteOggi=(bkfNotes||{})[todayData?.label]||'';
  el.innerHTML=`
    <div style="font-size:var(--fs-xxs);font-weight:600;color:var(--accent);margin-bottom:10px;">📅 Oggi — ${todayLabel}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div style="background:var(--surface2);border-radius:7px;padding:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--accent);">${coperti}</div><div style="font-size:10px;color:var(--text-dim);">Coperti BB</div></div>
      <div style="background:var(--surface2);border-radius:7px;padding:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--accent);">${totPax||'—'}</div><div style="font-size:10px;color:var(--text-dim);">Pax gruppi</div></div>
    </div>
    ${gruppiOggi.length?`<div style="font-size:var(--fs-xxs);background:#fff3cd;border-radius:6px;padding:6px 10px;color:#856404;margin-bottom:6px;">⚠️ ${gruppiOggi.length} gruppo${gruppiOggi.length>1?'i':''} oggi — ${totPax} persone</div>`:''}
    ${noteOggi?`<div style="font-size:var(--fs-xxs);color:var(--text-muted);font-style:italic;background:var(--surface2);padding:6px 8px;border-radius:6px;">📋 ${noteOggi}</div>`:''}`;
}
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
      'rev_sent','hkp_sa','hkp_ar',
      'weekData','arriviData','rcGuests','bkfGroups','bkfNotes','hk_soul','hk_bout','bkfSheetARData','piano',
      'ts_rev_sa','ts_rev_bh','ts_rev_sl','ts_rev_pr','ts_rev_ms','ts_rev_ar','ts_rev_sb'];
    let synced=0;
    await Promise.all(keys.map(async k=>{
      try{
        const res=await fetch(PROXY+'/kv/get?key=qm_'+encodeURIComponent(k));
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
              if(cloudTs){
                const localTs=parseInt(localStorage.getItem(tsKey)||'0');
                if(cloudTs>localTs){localStorage.setItem(tsKey,String(cloudTs));try{_setUcTs(elId,cloudTs);}catch(e){}}
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
              if(cloudTs){
                const localTs=parseInt(localStorage.getItem(tsKey)||'0');
                if(cloudTs>localTs){
                  localStorage.setItem(tsKey,String(cloudTs));
                  try{_setUcTs(elId,cloudTs);}catch(e){}
                }
              }
            }catch(e){}
          }
          synced++;
        }
      }catch(e){}
    }));
    return synced;
  }
};
// Salva stato checklist (task spuntati per data)
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
    li.innerHTML=`<div class="check-box"></div><div class="check-content"><span class="check-text">${text}</span><div class="check-meta"><span class="check-dept" style="background:var(--surface2);color:var(--text-dim);padding:2px 7px;border-radius:4px;font-size:10px;">★</span><span class="check-time"></span><span onclick="removeCustomTask('${text.replace(/'/g,"\\'")}',this)" style="font-size:9px;color:var(--text-dim);cursor:pointer;margin-left:auto;">✕</span></div></div>`;
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
    li.innerHTML=`<div class="check-box"></div><div class="check-content"><span class="check-text">${text}</span><div class="check-meta">${badge}<span class="check-time"></span><span onclick="removeDeptTask('${dept}','${text.replace(/'/g,"\\'")}',this)" style="font-size:9px;color:var(--text-dim);cursor:pointer;margin-left:auto;">✕</span></div></div>`;
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
function removeCustomTask(text, btn){
  event.stopPropagation();
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
function removeDeptTask(dept,text,btn){
  event.stopPropagation();
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
function toggleOccupazionePreview(){
  const el=document.getElementById('kpi-occ-preview');
  if(!el)return;
  if(el.style.display==='block'){el.style.display='none';return;}
  if(!pulData||!pulData.length){return;}
  const CAP=CAP_CAMERE||33;
  const pts=pulData.map(d=>{
    const occ=Math.min(CAP,(d.fermatePulizia||d.fermate||0)+d.arrivi);
    const pct=Math.round((occ/CAP)*100);
    return{label:d.label,occ,pct};
  });
  const W=600,H=200,PL=36,PR=12,PT=30,PB=30;
  const plotW=W-PL-PR,plotH=H-PT-PB;
  const n=pts.length;
  const barW=Math.floor(plotW/n*0.6);
  const gap=plotW/n;
  const sx=i=>PL+i*gap+gap/2;
  const sy=pct=>PT+plotH-(pct/100)*plotH;
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">`;
  for(let v=0;v<=100;v+=20){const y=sy(v);svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border-light)" stroke-width="${v===0?1.5:1}"/><text x="${PL-4}" y="${y+4}" font-size="11" fill="var(--text-dim)" text-anchor="end">${v}%</text>`;}
  pts.forEach((p,i)=>{
    const x=sx(i);const y=sy(p.pct);const bh=plotH-(y-PT);
    const col=p.pct>=80?'var(--green)':p.pct>=60?'#A05A00':'var(--red)';
    svg+=`<rect x="${x-barW/2}" y="${y}" width="${barW}" height="${bh}" fill="${col}" rx="3" opacity=".85"/>`;
    svg+=`<text x="${x}" y="${y-5}" font-size="11" font-weight="700" fill="${col}" text-anchor="middle">${p.pct}%</text>`;
    svg+=`<text x="${x}" y="${H-6}" font-size="11" fill="var(--text-dim)" text-anchor="middle">${p.label.split(' ')[0]}</text>`;
  });
  svg+='</svg>';
  el.innerHTML=`<div style="font-size:11px;font-weight:600;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">📊 Occupazione SoulArt e Boutique Hotel — coefficiente giornaliero</div>`+svg;
  el.style.display='block';
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
function toggleHkpPreview(){
  const el=document.getElementById('kpi-hkp-preview');
  if(!el)return;
  if(el.style.display==='block'){el.style.display='none';return;}
  const data=hkSoulData||hkBoutData;
  if(!data||!data.giorni||!data.giorni.length){return;}
  const pts=data.giorni.map(d=>({label:d.label,arrivi:d.arrivi,fermate:d.fermate,partenze:d.partenze}));
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
  const struttura=(hkSoulData?'SoulArt Hotel':'Boutique Hotel');
  el.innerHTML=`<div style="font-size:11px;font-weight:600;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">📊 HKP ${struttura} — andamento settimanale</div>`+svg;
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
function buildBarChart(){
  const data=[{l:'Lun 10',v:91},{l:'Mar 11',v:89},{l:'Mer 12',v:92},{l:'Gio 13',v:90},{l:'Ven 14',v:93},{l:'Sab 15',v:92},{l:'Oggi',v:94}];
  const max=100,target=90;
  const wrap=document.getElementById('qualityBarChart');
  if(!wrap)return;
  const colors=data.map(d=>d.v>=target?'var(--green)':d.l==='Oggi'?'var(--accent)':'var(--amber)');
  wrap.innerHTML=data.map((d,i)=>{
    const h=Math.round((d.v/max)*72);
    return`<div class="bar-col"><div class="bar-wrap"><div class="bar" style="height:${h}px;background:${colors[i]};width:85%;" title="${d.v}"></div></div><div class="bar-label">${d.l}</div><div class="bar-val">${d.v}</div></div>`;
  }).join('');
  // target line overlay – simplified as text
  wrap.title='Linea target: 90';
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
    const grid=document.getElementById('forecastGrid');
    if(!grid)return;
    const days=data.daily;
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
// Orologio sidebar + turno automatico
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
      const giorno=WEEK.giorni.find(g=>{const gd=new Date(g.date);gd.setHours(0,0,0,0);return gd.getTime()===ref.getTime();});
      if(!giorno){el.textContent='Quality Manager';el.style.color='';}
      else{
        const turno=giorno.shifts['Presta P.'];
        if(!turno||IS_REST(turno)){el.textContent='Riposo';el.style.color='var(--red)';}
        else{el.textContent='Turno: '+turno;el.style.color='var(--green)';}
      }
    }
  }catch(e){}
  // 2. Staff area
  try{
    if(weekData){
      let idx=weekData.giorni.findIndex(g=>{
        const gd=new Date(g.date instanceof Date?g.date:g.date);
        gd.setHours(0,0,0,0);
        return gd.getTime()===ref.getTime();
      });
      if(idx!==-1){
        activeDay=idx;renderDay(activeDay);updateWeekNavActive();updateSidebarInfo();
      }
      // Se idx===-1 usa activeDay già impostato da loadWeekData (oggi)
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
        li.innerHTML=`<div class="check-box"></div><div class="check-content"><span class="check-text">${text}</span><div class="check-meta"><span class="check-dept" style="background:var(--surface2);color:var(--text-dim);padding:2px 7px;border-radius:4px;font-size:10px;">★</span><span class="check-time"></span><span onclick="removeCustomTask('${text.replace(/'/g,"\\'")}',this)" style="font-size:9px;color:var(--text-dim);cursor:pointer;margin-left:auto;">✕</span></div></div>`;
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
          li.innerHTML=`<div class="check-box"></div><div class="check-content"><span class="check-text">${text}</span><div class="check-meta"><span class="check-dept ${_dcls[dept]||''}">${_dlbl[dept]||dept.toUpperCase()}</span><span class="check-time"></span><span onclick="removeDeptTask('${dept}','${text.replace(/'/g,"\\'")}',this)" style="font-size:9px;color:var(--text-dim);cursor:pointer;margin-left:auto;">✕</span></div></div>`;
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
    restoreChecklistState();
    restoreCustomTasks();
    restoreDeptCustomTasks();
    hkpRestore();
    ovUpdateRevNoreply();
    // Ripristina turno settimanale
    try{
      const saved=localStorage.getItem('qm_weekData');
      if(saved){
        const parsed=JSON.parse(saved);
        // Converti SEMPRE le date in oggetti Date prima di passare a loadWeekData
        const restored={giorni:parsed.map(g=>{const d=new Date(g.date);return{...g,date:new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0)};})};
        loadWeekData(restored);
        const range=restored.giorni[0].label+' – '+restored.giorni[restored.giorni.length-1].label;
        ucSetState('turno','loaded',range,true);
        if(parsed._ts)restoreUploadTs('turnoTs',parsed._ts);else loadStoredTs('turnoTs');
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
    // Ripristina BKF Sheet Galleria
    const savedARData=LS.get('bkfSheetARData',null);
    if(savedARData&&Array.isArray(savedARData)&&savedARData.length){
      bkfSheetARData=savedARData;
      const tbody=document.getElementById('bkfSheetARTableBody');
      if(tbody)tbody.innerHTML=bkfSheetARData.map(r=>`<tr><td style="font-weight:500;">${r.d||'—'}</td><td><span class="bkf-ro">${r.r??'—'}</span></td><td><span class="bkf-badge">${r.b??'—'}</span></td><td style="font-size:var(--fs-xs);color:var(--text-muted);">${r.pg||''}</td></tr>`).join('');
      bkfSheetARSetStatus('ready');
      setTimeout(bkfRenderChartAR,50);
    }
    // Ripristina Soul App HKP e Boutique App HKP dal cloud
    ['soul','bout'].forEach(key=>{
      try{
        const raw=localStorage.getItem('qm_hk_'+key);
        if(raw){
          const data=JSON.parse(raw);
          if(key==='soul')hkSoulData=data;
          else hkBoutData=data;
          hkSetLoaded(key,true);
          if(data._ts)restoreUploadTs(key+'Ts',data._ts);else loadStoredTs(key+'Ts');
        }
      }catch(e){}
    });
    // Ri-ripristina HKP SA/AR (dopo sync cloud potrebbe avere dati più freschi)
    hkpRestore();
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
          ovUpdateRevNoreply();
        }catch(e){}
      }
    }
    await restoreReviews();
    // Ripristina ultima vista dopo che i dati sono pronti
    try{
      const _lv=localStorage.getItem('qm_last_view');
      if(_lv&&_lv!=='overview'&&document.getElementById('view-'+_lv)){
        const _ne=document.querySelector('[onclick*="\''+_lv+'\'"]');
        setView(_lv,_ne);
      }
    }catch(e){}
  },150);
  })(); // fine async sync
})();
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
const HKP_URLS={
  sa:'https://script.google.com/macros/s/AKfycbyosKJIaYIxh7D7GnCMFU7K_gABx2uNSy2VuaEjRc4ND1eEF9zrcSyUgc1Kp3X27lPa/exec',
  ar:'https://script.google.com/macros/s/AKfycbwtxy0lngIzQ07QKRX2llx3lBCp2GdE1CoXsAW7GbKre5OEEARNdpCDuahc0DFsPAp7/exec'
};
let HKP_DATA={sa:null,ar:null};
let HKP_TAB={sa:'riepilogo',ar:'riepilogo'};
// Salva/carica HKP dal localStorage + cloud
function hkpSave(p){
  try{localStorage.setItem('qm_hkp_'+p, JSON.stringify(HKP_DATA[p]));}catch(e){}
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({key:'qm_hkp_'+p, value:JSON.stringify(HKP_DATA[p])})}).catch(()=>{});
}
function hkpRestore(){
  ['sa','ar'].forEach(p=>{
    try{
      const raw=localStorage.getItem('qm_hkp_'+p);
      if(raw){
        HKP_DATA[p]=JSON.parse(raw);
        hkpRenderAll(p);
      }
    }catch(e){}
  });
}
async function hkpLoad(p){
  const btnIcon=document.getElementById('hkp-'+p+'-btn-icon');
  const content=document.getElementById('hkp-'+p+'-content');
  if(btnIcon){btnIcon.textContent='⏳';}
  content.innerHTML='<div style="text-align:center;padding:30px;color:var(--text-dim);">Caricamento dati mese in corso…</div>';
  try{
    const res=await fetch(HKP_URLS[p]);
    const data=await res.json();
    if(data.error){content.innerHTML=`<div style="color:var(--red);padding:20px;">${data.error}</div>`;return;}
    HKP_DATA[p]=data;
    hkpSave(p);
    hkpRenderAll(p);
  }catch(e){
    content.innerHTML=`<div style="color:var(--red);padding:20px;">Errore: ${e.message}</div>`;
  }
  if(btnIcon)btnIcon.textContent='↻';
}
function hkpTab(p,tab,btn){
  HKP_TAB[p]=tab;
  const view=document.getElementById('view-hkp-'+p);
  view.querySelectorAll('.rev-filter-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  if(HKP_DATA[p])hkpRenderContent(p);
}
function hkpRenderAll(p){
  const data=HKP_DATA[p];
  const dateEl=document.getElementById('hkp-'+p+'-date');
  const kpiEl=document.getElementById('hkp-'+p+'-kpi');
  if(dateEl)dateEl.textContent='Mese '+data.mese+' · '+data.giorni_elaborati+' giorni elaborati';
  const cameriere=data.cameriere||[];
  const totMese=data.tot_mese||0;
  // Conta solo giorni con camere > 0
  const giorniConDati=Object.values(data.totale_per_giorno||{}).filter(n=>n>0).length||1;
  const mediaGiornaliera=Math.round(totMese/giorniConDati*10)/10;
  const top=cameriere.length?[...cameriere].sort((a,b)=>b.camere_tot-a.camere_tot)[0]:null;
  kpiEl.innerHTML=`
    <div class="kpi-card green"><div class="kpi-card-icon">🛏️</div><div class="kpi-label">Camere mese</div><div class="kpi-value">${totMese}</div><div class="kpi-delta up">${giorniConDati} giorni con dati</div></div>
    <div class="kpi-card blue"><div class="kpi-card-icon">📊</div><div class="kpi-label">Media/giorno</div><div class="kpi-value">${mediaGiornaliera}</div><div class="kpi-delta">su ${giorniConDati} giorni</div></div>
    <div class="kpi-card amber"><div class="kpi-card-icon">👑</div><div class="kpi-label">Top cameriera</div><div class="kpi-value" style="font-size:16px;">${top?top.nome:'—'}</div><div class="kpi-delta">${top?top.camere_tot+' cam':''}</div></div>
    <div class="kpi-card"><div class="kpi-card-icon">👥</div><div class="kpi-label">Cameriere attive</div><div class="kpi-value">${cameriere.length}</div><div class="kpi-delta">nel mese</div></div>
  `;
  hkpRenderContent(p);
}
function hkpRenderContent(p){
  const data=HKP_DATA[p];
  const content=document.getElementById('hkp-'+p+'-content');
  const tab=HKP_TAB[p]||'riepilogo';
  const cameriere=[...(data.cameriere||[])].sort((a,b)=>b.camere_tot-a.camere_tot);
  const totMese=data.tot_mese||0;
  const giorni=Object.values(data.totale_per_giorno||{}).filter(n=>n>0).length||1;
  const mese=data.mese||'';
  if(tab==='riepilogo'){
    // Ranking mensile: nome + barra + camere tot + media + %
    const maxCam=cameriere[0]?.camere_tot||1;
    let html='<div class="panel"><div class="panel-header"><span class="panel-title">Riepilogo mensile</span><span style="font-size:var(--fs-xxs);color:var(--text-dim);">'+mese+'</span></div><div class="panel-body" style="padding:0;">';
    cameriere.forEach((cam,i)=>{
      const bar=Math.round(cam.camere_tot/maxCam*100);
      const media=Math.round(cam.camere_tot/giorni*10)/10;
      const pct=Math.round(cam.camere_tot/totMese*100);
      const color=bar>66?'var(--green)':bar>33?'var(--accent)':'var(--amber)';
      html+=`<div style="display:flex;align-items:center;gap:14px;padding:12px 16px;${i>0?'border-top:1px solid var(--border-light);':''}">
        <div style="min-width:140px;font-size:var(--fs-sm);font-weight:500;color:var(--text);">${cam.nome}</div>
        <div style="flex:1;">
          <div style="background:var(--border-light);border-radius:4px;height:6px;overflow:hidden;">
            <div style="width:${bar}%;background:${color};height:100%;border-radius:4px;"></div>
          </div>
        </div>
        <div style="text-align:right;min-width:64px;">
          <span style="font-size:var(--fs-sm);font-weight:600;color:var(--text);">${cam.camere_tot}</span>
          <span style="font-size:var(--fs-xxs);color:var(--text-dim);"> cam</span>
        </div>
        <div style="text-align:right;min-width:55px;">
          <span style="font-size:var(--fs-sm);font-weight:600;color:var(--accent);">${media}</span>
          <span style="font-size:var(--fs-xxs);color:var(--text-dim);">/gg</span>
        </div>
        <div style="text-align:right;min-width:36px;font-size:var(--fs-xxs);color:var(--text-dim);">${pct}%</div>
      </div>`;
    });
    html+='</div></div>';
    // Grafico andamento mensile per cameriera (mini sparkline SVG)
    const totGiorni=data.totale_per_giorno||{};
    const giorniDisp=Object.keys(totGiorni).map(Number).filter(d=>totGiorni[d]>0).sort((a,b)=>a-b);
    if(giorniDisp.length>=2&&cameriere.length){
      const COLORS=['#003580','#e65100','#1b5e20','#880e4f','#6a1b9a','#0d47a1','#2e7d32','#b71c1c','#f57f17','#37474f'];
      const W=680,H=160,PL=36,PR=12,PT=14,PB=28;
      const plotW=W-PL-PR,plotH=H-PT-PB;
      const allVals=cameriere.flatMap(cam=>{
        const pg={};Object.entries(cam.camere_per_giorno||{}).forEach(([k,v])=>{pg[parseInt(k)]=parseInt(v)||0;});
        cam._pgn=pg;
        return giorniDisp.map(d=>pg[d]||0);
      });
      const maxV=Math.max(...allVals,1);
      const sx=i=>PL+i/(giorniDisp.length-1)*plotW;
      const sy=v=>PT+plotH-(v/maxV)*plotH;
      let svg=`<div class="panel" style="margin-top:12px;"><div class="panel-header"><span class="panel-title">Andamento giornaliero per cameriera</span></div><div class="panel-body" style="padding:14px;overflow-x:auto;">`;
      svg+=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">`;
      // Griglia
      [0,0.25,0.5,0.75,1].forEach(t=>{
        const y=PT+plotH*(1-t);
        svg+=`<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="var(--border-light)" stroke-width="1"/>`;
        svg+=`<text x="${PL-4}" y="${y+4}" font-size="9" fill="var(--text-dim)" text-anchor="end">${Math.round(t*maxV)}</text>`;
      });
      // Labels giorni (ogni 5)
      giorniDisp.forEach((d,i)=>{
        if(d===1||d%5===0||i===giorniDisp.length-1){
          const x=sx(i);
          svg+=`<text x="${x}" y="${H-4}" font-size="9" fill="var(--text-dim)" text-anchor="middle">${d}</text>`;
        }
      });
      // Linea per ogni cameriera
      cameriere.forEach((cam,ci)=>{
        const col=COLORS[ci%COLORS.length];
        const pts=giorniDisp.map((d,i)=>{const v=cam._pgn?cam._pgn[d]||0:(cam.camere_per_giorno||{})[d]||0;return{x:sx(i),y:sy(v),v};});
        const path='M'+pts.map(pt=>`${pt.x},${pt.y}`).join('L');
        svg+=`<path d="${path}" fill="none" stroke="${col}" stroke-width="1.5" opacity="0.85"/>`;
        // Solo il punto finale
        const last=pts[pts.length-1];
        svg+=`<circle cx="${last.x}" cy="${last.y}" r="3" fill="${col}"/>`;
      });
      svg+='</svg>';
      // Legenda
      svg+='<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;">';
      cameriere.forEach((cam,ci)=>{
        svg+=`<div style="display:flex;align-items:center;gap:5px;font-size:var(--fs-xxs);color:var(--text-muted);">
          <div style="width:16px;height:3px;background:${COLORS[ci%COLORS.length]};border-radius:2px;"></div>
          ${cam.nome}
        </div>`;
      });
      svg+='</div></div></div>';
      html+=svg;
    }
    content.innerHTML=html;
  } else if(tab==='dettaglio'){
    const totGiorni=data.totale_per_giorno||{};
    const giorniDisponibili=[];
    for(let d=1;d<=data.giorni_mese;d++){if(totGiorni[d]>0)giorniDisponibili.push(d);}
    if(!giorniDisponibili.length){content.innerHTML='<div style="padding:30px;text-align:center;color:var(--text-dim);">Nessun dato disponibile</div>';return;}
    let selDay=parseInt(content.dataset.selDay||giorniDisponibili[giorniDisponibili.length-1]);
    if(!giorniDisponibili.includes(selDay))selDay=giorniDisponibili[giorniDisponibili.length-1];
    // Navigazione giorni
    let navHtml=`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px;">`;
    giorniDisponibili.forEach(d=>{
      navHtml+=`<button class="rev-filter-btn${d===selDay?' active':''}" onclick="hkpSelectDay('${p}',${d})">${d}</button>`;
    });
    navHtml+='</div>';
    // Barre per cameriera per il giorno selezionato
    const camData=cameriere.map(cam=>{
      const pg={};Object.entries(cam.camere_per_giorno||{}).forEach(([k,v])=>{pg[parseInt(k)]=parseInt(v)||0;});
      return{nome:cam.nome,n:pg[selDay]||0};
    }).filter(x=>x.n>0).sort((a,b)=>b.n-a.n);
    const maxN=camData.length?camData[0].n:1;
    const totGiorno=totGiorni[selDay]||0;
    let barHtml=`<div class="panel"><div class="panel-header"><span class="panel-title">${selDay} ${mese.split('/')[0]?'mar':''} — ${totGiorno} camere totali</span></div><div class="panel-body" style="padding:0;">`;
    if(!camData.length){
      barHtml+='<div style="padding:20px;text-align:center;color:var(--text-dim);">Nessun dato per questo giorno</div>';
    } else {
      camData.forEach((cam,i)=>{
        const bar=Math.round(cam.n/maxN*100);
        const pct=Math.round(cam.n/totGiorno*100);
        const color=bar>66?'var(--green)':bar>33?'var(--accent)':'var(--amber)';
        barHtml+=`<div style="display:flex;align-items:center;gap:14px;padding:12px 16px;${i>0?'border-top:1px solid var(--border-light);':''}">
          <div style="min-width:140px;font-size:var(--fs-sm);font-weight:500;color:var(--text);">${cam.nome}</div>
          <div style="flex:1;">
            <div style="background:var(--border-light);border-radius:4px;height:8px;overflow:hidden;">
              <div style="width:${bar}%;background:${color};height:100%;border-radius:4px;transition:width .3s;"></div>
            </div>
          </div>
          <div style="text-align:right;min-width:48px;">
            <span style="font-size:var(--fs-sm);font-weight:600;color:var(--text);">${cam.n}</span>
            <span style="font-size:var(--fs-xxs);color:var(--text-dim);"> cam</span>
          </div>
          <div style="text-align:right;min-width:36px;font-size:var(--fs-xxs);color:var(--text-dim);">${pct}%</div>
        </div>`;
      });
    }
    barHtml+='</div></div>';
    content.innerHTML=navHtml+barHtml;
    content.dataset.selDay=selDay;
  }
}
function hkpSelectDay(p,day){
  const content=document.getElementById('hkp-'+p+'-content');
  content.dataset.selDay=day;
  hkpRenderContent(p);
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
        model:'claude-sonnet-4-20250514',
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
        model:'claude-sonnet-4-20250514',
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
      ovUpdateRevNoreply();
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
    const unfavorable=reviews.filter(r=>r._score<=6).length;
    if(favorable>unfavorable)return{color:'var(--red)',label:'Attenzione — score alto in scadenza',icon:'🔴'};
    if(unfavorable>favorable)return{color:'var(--green)',label:'Favorevole — score basso in scadenza',icon:'🟢'};
    return{color:'var(--amber)',label:'Neutro — impatto bilanciato',icon:'🟡'};
  }
  function renderWeekSection(reviews,title,weekColor,afterScore){
    const sem=semaforo(reviews, scoreAttuale);
    const favorevoli=reviews.filter(r=>r._score>=9);
    const sfavorevoli=reviews.filter(r=>r._score<=6);
    const neutri=reviews.filter(r=>r._score>=7&&r._score<=8);
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
      <div class="rev-card-header"><span class="rev-score-badge ${cls}">${s.toFixed(1)}</span><span class="rev-guest">${r["Nome dell'ospite"]||'Ospite anonimo'}</span>${noReplyBadge}${sentBadge}${langBadge}<span class="rev-date">${dateStr}</span>${bookingBadge}</div>
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
    const res=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,messages:[{role:'user',content:`Traduci in italiano il testo di questa recensione di hotel. Rispondi SOLO con la traduzione, mantenendo la struttura:\n${r['Titolo della recensione']?'Titolo: [titolo tradotto]\n':''}${r['Recensione positiva']?'Positivo: [testo tradotto]\n':''}${r['Recensione negativa']?'Negativo: [testo tradotto]':''}\n\nTESTO ORIGINALE:\n${testo}`}]})});
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
  const prompt=`Sei Paolo P., Quality Manager del ${hotelName} a Napoli, un hotel 4 stelle.\n\nDevi rispondere a questa recensione Booking.com in ${lang}.\n\nDATI RECENSIONE:\n- Ospite: ${r["Nome dell'ospite"]||'Ospite'}\n- Punteggio: ${r._score}/10\n- Titolo: ${r['Titolo della recensione']||'—'}\n- Commento positivo: ${r['Recensione positiva']||'—'}\n- Commento negativo: ${r['Recensione negativa']||'—'}\n- Staff: ${r['Staff']||'—'} | Pulizia: ${r['Pulizia']||'—'} | Posizione: ${r['Posizione']||'—'} | Servizi: ${r['Servizi']||'—'} | Comfort: ${r['Comfort']||'—'} | Qualità/prezzo: ${r['Rapporto qualità/prezzo']||'—'}\n\nREGOLE OBBLIGATORIE:\n1. Non ripetere le stesse parole usate dall'ospite nella recensione\n2. Includi sempre informazioni per incentivare potenziali ospiti a prenotare\n3. Se ci sono critiche, rispondi in modo professionale senza essere difensivo\n4. Tono caldo, professionale, elegante\n5. Termina SEMPRE con la firma: "${firma}"\n6. Risposta diretta, senza preamboli, inizia subito rivolgendoti all'ospite`;
  try{
    const response=await fetch('https://anthropic-proxy.qm-d82.workers.dev',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
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
  revRenderList(p);
  revRenderStats(p);
  revRenderExpiring(p);
  revRenderCatTrend(p);
  ovUpdateRevNoreply();
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
}
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
    inp.addEventListener('change',e=>{if(e.target.files[0])handleHkFile(key,e.target.files[0]);});
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
    setSyncStatus('syncing');
    kvSet('qm_hk_'+key,JSON.stringify(data)).then(ok=>{setSyncStatus(ok?'ok':'error');if(!ok)ucSetState(key,'error','Errore cloud — riprova');});
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
  const dateEl=document.getElementById(key+'LoadedDate');if(dateEl)dateEl.textContent=data.struttura+' · '+range;
  const btnId='btn'+key.charAt(0).toUpperCase()+key.slice(1)+'Reload';
  const btn=document.getElementById(btnId);if(btn)btn.style.display='block';
  const box=document.getElementById(key+'UploadBox');if(box)box.style.display='none';
  const li=document.getElementById(key+'LoadedInfo');if(li)li.classList.add('visible');
  // Aggiorna card KPI overview
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
  fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_hk_'+key,value:null})}).catch(()=>{});
  ucSetState(key,'','Non caricato');
  const box=document.getElementById(key+'UploadBox');if(box)box.style.display='';
  const li=document.getElementById(key+'LoadedInfo');if(li)li.classList.remove('visible');
  const btnId='btn'+key.charAt(0).toUpperCase()+key.slice(1)+'Reload';
  const btn=document.getElementById(btnId);if(btn)btn.style.display='none';
  document.getElementById(key+'FileInput').value='';
}
// ── PIANO SETTIMANA ──
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
  const giorni=cols.map(c=>({label:c.label,data:c.data,soulart:{partenze:[],fermate:[]},boutique:{partenze:[],fermate:[]}}));
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
      if(val.includes('-'))giorni[ci][roomType].partenze.push(roomCode);
      else if(val.includes('='))giorni[ci][roomType].fermate.push(roomCode);
    });
  }
  return{stampato,giorni};
}
function pianoSetLoaded(silent){
  if(!pianoData||!pianoData.giorni)return;
  const range=(pianoData.giorni[0]?.label||'')+' – '+(pianoData.giorni[pianoData.giorni.length-1]?.label||'');
  ucSetState('piano','loaded',range,silent);
  const dateEl=document.getElementById('pianoLoadedDate');if(dateEl)dateEl.textContent='Settimana: '+range;
  const btn=document.getElementById('btnPianoReload');if(btn)btn.style.display='block';
  const box=document.getElementById('pianoUploadBox');if(box)box.style.display='none';
  const li=document.getElementById('pianoLoadedInfo');if(li)li.classList.add('visible');
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
async function handleRCFile(file){rcShowProc('Lettura del PDF...');rcHideError();try{const ab=await file.arrayBuffer();const pdfData=new Uint8Array(ab);rcShowProc('Estrazione testo...');const pdfDoc=await pdfjsLib.getDocument({data:pdfData}).promise;let fullText='';for(let i=1;i<=pdfDoc.numPages;i++){const page=await pdfDoc.getPage(i);const tc=await page.getTextContent();fullText+=tc.items.map(x=>x.str).join(' ')+'\n';}const guests=rcParseGuests(fullText);rcHideProc();if(!guests.length)rcShowError('Nessun ospite trovato.');else rcRenderCards(guests);}catch(err){rcHideProc();rcShowError('Errore: '+err.message);}}
function rcCleanName(raw){let name=raw.trim().replace(/\s*\([^)]+\)/g,'').trim();const cp=new RegExp('^('+ROOM_CODES.join('|')+')\\s+','i');let prev='';while(prev!==name){prev=name;name=name.replace(cp,'').trim();}return name;}
function rcParseGuests(text){let year=new Date().getFullYear();const ym=text.match(/arrivi\s*[-–]\s*\d{1,2}\/\d{1,2}\/(\d{4})/i);if(ym)year=parseInt(ym[1]);const norm=text.replace(/\s+/g,' ').trim();const guests=[];const pat=/(\b(?:Art\s*\d+|\d{2,3}|AS_LIB|[A-Z]{2,8}_?[A-Z]*\d*)\b)\s*\/\s*(?:[A-Z_\s]{2,20}?)\s+([A-ZÀÈÉÌÒÙ][A-Za-zÀ-ÿ\s']+?(?:\s+\([^)]+\))?)\s+(\d)\s+(BB|HB|FB|RO|AI|MP)\s+(\d{1,2}\/\d{1,2})\s*[-–]\s*(\d{1,2}\/\d{1,2})/gi;let m;while((m=pat.exec(norm))!==null){const nome=rcCleanName(m[2]);if(!nome||nome.length<2)continue;guests.push({camera:m[1].trim(),nome,pax:parseInt(m[3]),trattamento:m[4].trim(),checkin:rcFmtDate(m[5],year),checkout:rcFmtDate(m[6],year)});}return guests;}
function rcFmtDate(raw,year){const p=raw.split('/');return p.length===2?String(p[0]).padStart(2,'0')+'/'+String(p[1]).padStart(2,'0')+'/'+year:'https://script.google.com/macros/s/AKfycbwtxy0lngIzQ07QKRX2llx3lBCp2GdE1CoXsAW7GbKre5OEEARNdpCDuahc0DFsPAp7/exec';}
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
function rcBuildPreview(g,idx){const nights=rcCalcNights(g.checkin,g.checkout);const card=document.createElement('div');card.className='rc-card';card.innerHTML=`<div class="rc-card-top"><span class="rc-card-label">Registration Card</span><span class="rc-card-room">Camera ${g.camera}</span></div><div class="rc-card-guest">${g.nome}</div><div class="rc-card-dates"><div class="rc-date-cell"><div class="rc-date-label">Arrivo</div><div class="rc-date-val">${g.checkin||'—'}</div></div><div class="rc-date-cell"><div class="rc-date-label">Partenza</div><div class="rc-date-val">${g.checkout||'—'}</div></div><div class="rc-date-cell"><div class="rc-date-label">Notti</div><div class="rc-date-val">${nights}</div></div></div><div class="rc-pills"><span class="rc-pill">${g.pax} ${g.pax===1?'ospite':'ospiti'}</span><span class="rc-pill">${tratMap[g.trattamento]||g.trattamento}</span></div><div class="rc-card-footer"><span class="rc-hint">Clicca per anteprima</span><button class="btn-print-one" onclick="event.stopPropagation();preparePrint(${idx})">Stampa</button></div>`;card.addEventListener('click',()=>rcOpenModal(idx));return card;}
function rcOpenModal(idx){const g=guestsData[idx];document.getElementById('rcModalTitle').textContent=g.nome+' — Camera '+g.camera;document.getElementById('rcModalBody').innerHTML=`<div class="mp" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:9pt;color:#1A1916;">${rcCardHTML(g)}</div>`;document.getElementById('rcModalPrintBtn').onclick=()=>{rcCloseModal();setTimeout(()=>preparePrint(idx),150);};document.getElementById('rcModalOverlay').classList.add('open');}
function rcCloseModal(){document.getElementById('rcModalOverlay').classList.remove('open');}
function rcCloseModalOutside(e){if(e.target===document.getElementById('rcModalOverlay'))rcCloseModal();}
function rcResetApp(){document.getElementById('rcResults').style.display='none';document.getElementById('rcUploadZone').style.display='block';document.getElementById('rcFileInput').value='';guestsData=[];try{localStorage.removeItem('qm_rcGuests');}catch(e){}}
function rcShowProc(msg){document.getElementById('rcProcText').textContent=msg;document.getElementById('rcProcessing').style.display='flex';document.getElementById('rcUploadZone').style.display='none';}
function rcHideProc(){document.getElementById('rcProcessing').style.display='none';}
function rcShowError(msg){document.getElementById('rcError').textContent=msg;document.getElementById('rcError').style.display='block';document.getElementById('rcUploadZone').style.display='block';}
function rcHideError(){document.getElementById('rcError').style.display='none';}
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
    const prompt=`Analizza questo documento "Arrivi oggi" di un hotel e restituisci SOLO un JSON valido con questa struttura:
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
      "alert": false
    }
  ]
}
Per "struttura" identifica la struttura dal NUMERO/PREFISSO della camera:
- "SA": camere con prefisso "Art" (es. Art 2, Art 5, Art 22) E camere numeriche al di fuori della serie 200 → SoulArt Hotel
- "BH": camere numeriche 200-299 (es. 201, 202, 203, 215) → Boutique Hotel
- "SL": camere con prefisso Lib → San Liborio
- "PR": camere con nome geografico: Capri, Napoli, Procida, Ischia, Positano → Principe/Umberto
- "MS": camere R1, R2, R3 → Rooms Mastrangelo
- "NA": qualsiasi altra camera non identificata
Per "alert" metti true se le note contengono parole come: ATTENZIONE, NON SPOSTARE, REPEATER, MASSIMA PULIZIA, IMPORTANTE, WARNING.
Restituisci SOLO il JSON, nessun testo prima o dopo.`;
    const response=await fetch('https://anthropic-proxy.qm-d82.workers.dev/v1/messages',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:4000,
        messages:[{role:'user',content:[contentBlock,{type:'text',text:prompt}]}]})
    });
    const data=await response.json();
    if(!data.content||!data.content[0])throw new Error('Risposta vuota');
    let jsonText=data.content[0].text.replace(/```json/g,'').replace(/```/g,'').trim();
    arriviData=JSON.parse(jsonText);
    // Correggi struttura in base al numero camera
    arriviData.arrivi=fixArriviStruttura(arriviData.arrivi);
    // Salva locale + cloud
    arriviData._ts=Date.now();
    try{localStorage.setItem('qm_arriviData',JSON.stringify(arriviData));}catch(e){}
    try{fetch(PROXY+'/kv/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'qm_arriviData',value:JSON.stringify(arriviData)})}).catch(()=>{});}catch(e){}
    // Aggiorna UI
    ucSetState('arrivi','loaded',arriviData.data+' · '+arriviData.arrivi.length+' arrivi');
    document.getElementById('arriviLoadedDate').textContent=arriviData.data;
    setUploadTs('arriviTs');
    // Aggiorna anche le registration cards automaticamente con lo stesso file
    arriviUpdateKpi();
    handleRCFile(file);
  }catch(err){
    ucSetState('arrivi','error','Errore caricamento');
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
function openArriviModal(){
  const modal=document.getElementById('arriviModal');
  if(!modal)return;
  if(!arriviData){
    modal.querySelector('#arriviModalBody').innerHTML=
      '<div style="text-align:center;padding:30px;color:var(--text-dim);">Carica prima il PDF arrivi dalla sidebar</div>';
  } else {
    renderArriviModal();
  }
  modal.style.display='flex';
}
function closeArriviModal(){
  const modal=document.getElementById('arriviModal');
  if(modal)modal.style.display='none';
}
function renderArriviModal(filtStruttura='all', filtTratt='all'){
  if(!arriviData)return;
  let list=arriviData.arrivi;
  if(filtStruttura!=='all')list=list.filter(a=>a.struttura===filtStruttura);
  if(filtTratt!=='all')list=list.filter(a=>a.trattamento===filtTratt);
  const strutture=[...new Set(arriviData.arrivi.map(a=>a.struttura))].sort();
  const trattamenti=[...new Set(arriviData.arrivi.map(a=>a.trattamento))].sort();
  const filterBar=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
    <span style="font-size:var(--fs-xxs);color:var(--text-dim);align-self:center;">Struttura:</span>
    ${['all',...strutture].map(s=>`<button class="rev-filter-btn${filtStruttura===s?' active':''}" onclick="renderArriviModal('${s}','${filtTratt}')">${s==='all'?'Tutte':strutLabel(s)}</button>`).join('')}
    <span style="font-size:var(--fs-xxs);color:var(--text-dim);align-self:center;margin-left:8px;">Trattamento:</span>
    ${['all',...trattamenti].map(t=>`<button class="rev-filter-btn${filtTratt===t?' active':''}" onclick="renderArriviModal('${filtStruttura}','${t}')">${t==='all'?'Tutti':t}</button>`).join('')}
  </div>`;
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