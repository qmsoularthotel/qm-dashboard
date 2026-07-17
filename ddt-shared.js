// Condiviso tra index.html (app.js) e breakfast.html — evita di dover
// aggiornare la stessa logica in due punti quando cambiano le regole.
const DDT_MON=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
function ddtSupplierHidden(nome,mon){
  return (nome==='MARR'&&mon==='2026-01')||(nome==='Valgarda'&&mon<'2026-05');
}
// Normalizza il nome fornitore scritto sul DDT sulla chiave canonica.
// supplierObj è l'elenco fornitori di CHI chiama (DDT_FORNITORI in app.js,
// DDT_BKF in breakfast.html) — ognuno vede solo il proprio elenco, invariato.
function ddtNormFornGeneric(s,supplierObj){
  if(!s)return s;
  const norm=s.toLowerCase().replace(/[\s.\-_]/g,'');
  return Object.keys(supplierObj).find(k=>norm.includes(k.toLowerCase().replace(/[\s.\-_]/g,'')))||s;
}
