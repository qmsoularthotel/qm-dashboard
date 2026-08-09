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
// Ricalcolo in tempo reale nella maschera di modifica/inserimento DDT (usato sia da
// index.html/app.js — Compass — sia da breakfast.html): modificare quantità o prezzo
// unitario di una riga deve aggiornare da sola il totale della riga, e qualunque
// modifica (riga o totale digitato a mano) deve aggiornare il totale del DDT.
function ddtRecalcRowTotale(articoli,i){
  const a=articoli&&articoli[i];if(!a)return;
  const q=Number(a.qta),p=Number(a.prezzo_unit);
  if(!isNaN(q)&&!isNaN(p))a.totale=Math.round(q*p*100)/100;
}
function ddtRecalcTotaleOrdine(d){
  const somma=(d.articoli||[]).reduce((s,a)=>{const t=Number(a.totale);return isNaN(t)?s:s+t;},0);
  d.totale_ordine=Math.round(somma*100)/100;
}
