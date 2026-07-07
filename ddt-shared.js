// Condiviso tra index.html (app.js) e breakfast.html — evita di dover
// aggiornare la stessa logica in due punti quando cambiano le regole.
const DDT_MON=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
function ddtSupplierHidden(nome,mon){
  return (nome==='SAIMA'&&mon>='2026-03')||(nome==='MARR'&&mon==='2026-01')||(nome==='Valgarda'&&mon<'2026-05');
}
