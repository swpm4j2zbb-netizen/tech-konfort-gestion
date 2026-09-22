// TECH KONFORT V1.8.1 — suppression sécurisée
// À charger APRÈS patch-v18.js
(()=>{
const $tk=id=>document.getElementById(id);

const css=document.createElement("style");
css.textContent=`
.tkDelete{border-color:#6e3434!important;color:#ffb0b0!important}
.tkDelete:hover{background:#321818!important}
`;
document.head.appendChild(css);

function tkSave(){
  store("tk_clients_v2",clients);
  store("tk_quotes_v2",quotes);
  store("tk_invoices_v2",invoices);
  store("tk_payments_v2",payments);
  store("tk_projects_v2",projects);
}
function tkBack(view){
  tkDocView=view;
  renderDocuments();
}
window.tkDeleteClient=id=>{
  const c=clients.find(x=>x.id===id); if(!c)return;
  const nq=quotes.filter(x=>x.clientId===id).length;
  const ni=invoices.filter(x=>x.clientId===id).length;
  let msg=`Supprimer définitivement le client « ${c.name} » ?`;
  if(nq||ni) msg+=`\n\nAttention : ce client possède ${nq} devis et ${ni} facture(s). Ces documents NE seront PAS supprimés.`;
  msg+="\n\nCette action est irréversible.";
  if(!confirm(msg))return;
  clients=clients.filter(x=>x.id!==id);
  tkSave(); renderAll(); tkBack("clients"); toast("Client supprimé");
};
window.tkDeleteQuote=id=>{
  const q=quotes.find(x=>x.id===id); if(!q)return;
  const linked=invoices.filter(x=>x.quoteId===id).length;
  let msg=`Supprimer définitivement le devis ${q.num} ?`;
  if(linked) msg+=`\n\nAttention : ${linked} facture(s) liée(s) seront conservées.`;
  msg+="\n\nCette action est irréversible.";
  if(!confirm(msg))return;
  quotes=quotes.filter(x=>x.id!==id);
  projects=projects.filter(x=>x.quoteId!==id);
  tkSave(); renderAll(); tkBack("quotes"); toast("Devis supprimé");
};
window.tkDeleteInvoice=id=>{
  const inv=invoices.find(x=>x.id===id); if(!inv)return;
  if(!confirm(`Supprimer définitivement la facture ${inv.num} ?\n\nLes paiements associés à cette facture seront également supprimés.\n\nCette action est irréversible.`))return;
  invoices=invoices.filter(x=>x.id!==id);
  payments=payments.filter(x=>x.invoiceId!==id);
  tkSave(); renderAll(); tkBack("invoices"); toast("Facture supprimée");
};

const oldOpenClient=window.tkOpenClient;
window.tkOpenClient=id=>{
  oldOpenClient(id);
  const c=clients.find(x=>x.id===id); if(!c)return;
  const host=$tk("documentRows")?.firstElementChild;
  const head=host?.querySelector(".detailHead");
  if(head && !head.querySelector(".tkDelete")){
    head.insertAdjacentHTML("beforeend",`<button class="secondary mini tkDelete" type="button" onclick="tkDeleteClient('${id}')">🗑 Supprimer</button>`);
  }
};

const oldOpenDoc=window.tkOpenDoc;
window.tkOpenDoc=(type,id)=>{
  oldOpenDoc(type,id);
  const host=$tk("documentRows")?.firstElementChild;
  const head=host?.querySelector(".detailHead");
  if(head && !head.querySelector(".tkDelete")){
    head.insertAdjacentHTML("beforeend",`<button class="secondary mini tkDelete" type="button" onclick="${type==="quote"?"tkDeleteQuote":"tkDeleteInvoice"}('${id}')">🗑 Supprimer</button>`);
  }
};

// Retire l'ancien bouton ambigu "Données de test".
const clear=$tk("clearTests");
if(clear){
  const block=clear.closest(".tkSettingsBlock");
  if(block) block.remove();
}
})();
