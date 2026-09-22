// TECH KONFORT V1.8 — extension fonctionnelle
// Documents cliquables + acompte configurable + compteurs de test
(()=>{
const $tk=id=>document.getElementById(id);
const style=document.createElement("style");
style.textContent=`
.docFilter{cursor:pointer}.docFilter.active,.docFilter:hover{border-color:#8a682d!important;box-shadow:0 0 0 1px #8a682d55}
.docClient{padding:15px;border:1px solid #293037;border-radius:11px;background:#0d1215;cursor:pointer}
.docClient:hover{border-color:#6f5524}.docActions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.depositBox,.tkSettingsBlock{margin-top:16px;padding:14px;border:1px solid #302b22;border-radius:10px;background:#0c1114}
.depositBox{max-width:420px;margin-left:auto}.tkSettingsBlock h3{margin:0 0 6px}.tkSettingsBlock p{color:var(--muted);font-size:12px}
@media(max-width:600px){.docActions{justify-content:flex-start}.depositBox{max-width:none}}
`; document.head.appendChild(style);

let tkDocView="all";
const counterKey=t=>t==="quote"?"tk_next_quote_number":"tk_next_invoice_number";
const getCounter=t=>Math.max(1,parseInt(localStorage.getItem(counterKey(t))||"1",10)||1);
const setCounter=(t,n)=>localStorage.setItem(counterKey(t),String(Math.max(1,parseInt(n,10)||1)));

function baseTotal(){
 let total=0;
 document.querySelectorAll("#qLines .line").forEach(l=>{
   const t=(+l.querySelector(".qty").value||0)*(+l.querySelector(".price").value||0);
   l.querySelector(".ltotal").textContent=fmt(t); total+=t;
 });
 return total;
}
function depInfo(){
 const mode=$tk("qDepositMode")?.value||"percent", value=+$tk("qDepositValue")?.value||0, total=baseTotal();
 const amount=mode==="none"?0:mode==="fixed"?Math.min(total,Math.max(0,value)):total*Math.max(0,value)/100;
 return {mode,value,amount,total,remain:Math.max(0,total-amount)};
}
function refreshDeposit(){
 const d=depInfo(); $tk("qtotal").textContent=fmt(d.total);$tk("qdeposit").textContent=fmt(d.amount);$tk("qremain").textContent=fmt(d.remain);
 if($tk("qDepositLabel"))$tk("qDepositLabel").textContent=d.mode==="none"?"Aucun acompte":d.mode==="fixed"?"Acompte fixe":`Acompte ${d.value} %`;
 if($tk("qDepositValue"))$tk("qDepositValue").disabled=d.mode==="none"; return d.total;
}
calc=refreshDeposit;

const totals=document.querySelector("#quoteEditor .totals");
if(totals&&!$tk("qDepositMode")){
 totals.insertAdjacentHTML("beforebegin",`<div class="depositBox"><b>Acompte demandé</b><div class="formgrid"><label>Type<select id="qDepositMode"><option value="none">Aucun acompte</option><option value="percent" selected>Pourcentage</option><option value="fixed">Montant fixe</option></select></label><label>Valeur<input id="qDepositValue" type="number" min="0" step="0.01" value="30"></label></div></div>`);
 const s=totals.querySelectorAll("span"); if(s[1])s[1].id="qDepositLabel";
 $tk("qDepositMode").onchange=refreshDeposit;$tk("qDepositValue").oninput=refreshDeposit;
}

const oldNewQuote=newQuote;
newQuote=function(client=""){oldNewQuote(client);$tk("qnum").value=`DEV-${new Date().getFullYear()}-${String(getCounter("quote")).padStart(4,"0")}`;if($tk("qDepositMode"))$tk("qDepositMode").value="percent";if($tk("qDepositValue"))$tk("qDepositValue").value=30;refreshDeposit()};
const oldEditQuote=editQuote;
editQuote=function(id){oldEditQuote(id);const q=quotes.find(x=>x.id===id),d=q?.deposit||{mode:"percent",value:30};if($tk("qDepositMode"))$tk("qDepositMode").value=d.mode;if($tk("qDepositValue"))$tk("qDepositValue").value=d.value;refreshDeposit()};

$tk("saveQuote").onclick=()=>{
 if(!$tk("qclient").value){toast("Choisissez un client");return}
 const lines=[...document.querySelectorAll("#qLines .line")].map(l=>({desc:l.querySelector(".desc").value,qty:+l.querySelector(".qty").value||0,price:+l.querySelector(".price").value||0})).filter(x=>x.desc.trim());
 const d=depInfo(), isNew=!editingQuote;
 const q={id:editingQuote||crypto.randomUUID?.()||String(Date.now()),num:$tk("qnum").value,clientId:$tk("qclient").value,object:$tk("qobject").value.trim(),date:$tk("qdate").value,valid:$tk("qvalid").value,notes:$tk("qnotes").value,lines,total:d.total,deposit:{mode:d.mode,value:d.value,amount:d.amount},status:"En attente"};
 if(editingQuote)quotes=quotes.map(x=>x.id===editingQuote?q:x);else quotes.unshift(q);
 store("tk_quotes_v2",quotes);editingQuote=q.id;if(isNew)setCounter("quote",getCounter("quote")+1);renderAll();toast("Devis enregistré");
};

createInvoiceFromQuote=function(q){
 if(!q)return;if(invoices.find(i=>i.quoteId===q.id)){toast("Facture déjà créée");go("factures");return}
 const n=getCounter("invoice"),num=`FAC-${new Date().getFullYear()}-${String(n).padStart(4,"0")}`;
 const inv={id:uid(),num,quoteId:q.id,clientId:q.clientId,object:q.object,date:new Date().toISOString().slice(0,10),lines:q.lines,total:q.total,deposit:q.deposit||{mode:"percent",value:30,amount:q.total*.3},status:"À payer"};
 invoices.unshift(inv);setCounter("invoice",n+1);store("tk_invoices_v2",invoices);q.status="Accepté / facturé";store("tk_quotes_v2",quotes);
 if(!projects.find(p=>p.quoteId===q.id)){projects.unshift({id:uid(),clientId:q.clientId,quoteId:q.id,name:q.object||"Chantier",status:"À planifier",progress:10,notes:""});store("tk_projects_v2",projects)}
 renderAll();go("factures");toast("Facture créée depuis le devis");
};

function rows(list){
 return list.length?list.map(d=>`<div class="historyRow"><b>${d.num}<small style="display:block;color:#98a0a6">${esc(clientName(d.clientId))}</small></b><span>${esc(d.object||"Document")}</span><div class="docActions"><strong>${fmt(d.total)}</strong><button class="secondary mini" onclick="tkOpenDoc('${d.type}','${d.id}')">Voir</button><button class="secondary mini" onclick="printDoc('${d.type}','${d.id}')">PDF / Imprimer</button></div></div>`).join(""):'<div class="emptyModule">Aucun document enregistré.</div>';
}
window.tkSetDocView=v=>{tkDocView=v;renderDocuments()};
window.tkOpenClient=id=>{
 const c=clients.find(x=>x.id===id);if(!c)return;
 const docs=[...quotes.filter(x=>x.clientId===id).map(x=>({...x,type:"quote"})),...invoices.filter(x=>x.clientId===id).map(x=>({...x,type:"invoice"}))];
 $tk("documentRows").innerHTML=`<div><button class="secondary mini" onclick="tkSetDocView('clients')">← Clients</button><div class="detailHead" style="margin-top:14px"><div><span class="pill">${c.id}</span><h2>${esc(c.name)}</h2><p>${esc(c.site||"Adresse chantier non renseignée")}</p></div></div><div class="detailGrid"><div class="infoBox"><small>Téléphone</small>${esc(c.phone||"—")}</div><div class="infoBox"><small>E-mail</small>${esc(c.mail||"—")}</div><div class="infoBox"><small>Facturation</small>${esc(c.bill||"—")}</div><div class="infoBox"><small>Chantier</small>${esc(c.site||"—")}</div></div><div class="infoBox"><small>Notes</small>${esc(c.notes||"Aucune note")}</div><h3>Devis et factures</h3>${rows(docs)}</div>`;
};
window.tkOpenDoc=(type,id)=>{
 const d=type==="quote"?quotes.find(x=>x.id===id):invoices.find(x=>x.id===id),c=clients.find(x=>x.id===d?.clientId);if(!d)return;
 const paid=type==="invoice"?paidFor(d.id):0,dep=d.deposit||{mode:"percent",value:30,amount:d.total*.3};
 $tk("documentRows").innerHTML=`<div><button class="secondary mini" onclick="renderDocuments()">← Retour</button><div class="detailHead" style="margin-top:14px"><div><span class="pill">${type==="quote"?"DEVIS":"FACTURE"}</span><h2>${esc(d.num)}</h2><p>${esc(c?.name||"Client supprimé")} · ${esc(d.object||"")}</p></div><button class="primary" onclick="printDoc('${type}','${d.id}')">PDF / Imprimer</button></div><div class="detailGrid"><div class="infoBox"><small>Client</small>${esc(c?.name||"—")}</div><div class="infoBox"><small>Téléphone</small>${esc(c?.phone||"—")}</div><div class="infoBox"><small>Total</small>${fmt(d.total)}</div><div class="infoBox"><small>${type==="invoice"?"Réglé / reste":"Acompte"}</small>${type==="invoice"?fmt(paid)+" / "+fmt(Math.max(0,d.total-paid)):(dep.mode==="none"?"Aucun":fmt(dep.amount||0))}</div></div></div>`;
};
renderDocuments=function(){
 if(!$tk("documentRows"))return;$tk("docQuotes").textContent=quotes.length;$tk("docInvoices").textContent=invoices.length;$tk("docClients").textContent=clients.length;
 const cards=[...document.querySelectorAll("#documents .moduleGrid article")],views=["quotes","invoices","clients"];
 cards.forEach((c,i)=>{c.classList.add("docFilter");c.classList.toggle("active",tkDocView===views[i]);c.onclick=()=>tkSetDocView(views[i])});
 if(tkDocView==="clients"){$tk("documentRows").innerHTML=clients.length?clients.map(c=>`<div class="docClient" onclick="tkOpenClient('${c.id}')"><div class="clientTop"><b>${esc(c.name)}</b><span class="pill">${c.id}</span></div><small>${esc(c.phone||c.mail||"Aucune coordonnée")}</small><small>${esc(c.site||c.bill||"Adresse non renseignée")}</small></div>`).join(""):'<div class="emptyModule">Aucun client enregistré.</div>';return}
 let docs=[];if(tkDocView!=="invoices")docs.push(...quotes.map(x=>({...x,type:"quote"})));if(tkDocView!=="quotes")docs.push(...invoices.map(x=>({...x,type:"invoice"})));$tk("documentRows").innerHTML=rows(docs);
};

printDoc=function(type,id){
 const d=type==="quote"?quotes.find(x=>x.id===id):invoices.find(x=>x.id===id);if(!d)return;const c=clients.find(x=>x.id===d.clientId),title=type==="quote"?"DEVIS":"FACTURE",dep=d.deposit||{mode:"percent",value:30,amount:d.total*.3};
 const lines=d.lines.map(x=>`<tr><td>${esc(x.desc)}</td><td>${x.qty}</td><td>${fmt(x.price)}</td><td>${fmt(x.qty*x.price)}</td></tr>`).join("");
 const extra=type==="quote"?(dep.mode==="none"?'<p><b>Aucun acompte demandé.</b></p>':`<p><b>Acompte demandé :</b> ${fmt(dep.amount||0)}${dep.mode==="percent"?" ("+dep.value+" %)":""}<br><b>Reste après acompte :</b> ${fmt(Math.max(0,d.total-(dep.amount||0)))}</p>`):`<p><b>Déjà réglé :</b> ${fmt(paidFor(d.id))}<br><b>Reste à payer :</b> ${fmt(Math.max(0,d.total-paidFor(d.id)))}</p>`;
 $tk("printArea").innerHTML=`<div class="docPreview"><div style="display:flex;justify-content:space-between"><div><h2>TECH KONFORT</h2><p>Solutions techniques & amélioration de l'habitat<br><i>Votre projet, notre savoir-faire</i></p></div><div style="text-align:right"><h1>${title}</h1><b>${esc(d.num)}</b></div></div><hr><p><b>Client :</b> ${esc(c?.name||"")}<br>${esc(c?.bill||c?.site||"")}<br>${esc(c?.phone||"")} ${esc(c?.mail||"")}</p><p><b>Objet :</b> ${esc(d.object||"")}</p><table><thead><tr><th>Désignation</th><th>Qté</th><th>PU</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table><h2 style="text-align:right">TOTAL : ${fmt(d.total)}</h2>${extra}${d.notes?'<p><b>Notes :</b> '+esc(d.notes)+'</p>':""}<p style="margin-top:50px;border-top:1px solid #ddd;padding-top:12px">TECH KONFORT · Document généré par TECH KONFORT Gestion</p></div>`;
 $tk("printArea").style.display="block";setTimeout(()=>{window.print();$tk("printArea").style.display="none"},120);
};

const settings=document.querySelector("#parametres .settings");
if(settings&&!$tk("nextQuoteNo")){
 settings.insertAdjacentHTML("beforeend",`<div class="tkSettingsBlock"><h3>Numérotation</h3><p>Après tes essais, remets les prochains numéros à 1 avant de commencer les vrais documents.</p><div class="formgrid"><label>Prochain devis<input id="nextQuoteNo" type="number" min="1"></label><label>Prochaine facture<input id="nextInvoiceNo" type="number" min="1"></label></div><button class="secondary" id="saveCounters" type="button">Enregistrer la numérotation</button></div><div class="tkSettingsBlock"><h3>Données de test</h3><p>Efface devis, factures, paiements et chantiers de test. Clients, catalogue et réglages restent conservés.</p><button class="secondary danger" id="clearTests" type="button">Effacer les documents de test</button></div>`);
 $tk("nextQuoteNo").value=getCounter("quote");$tk("nextInvoiceNo").value=getCounter("invoice");
 $tk("saveCounters").onclick=()=>{setCounter("quote",$tk("nextQuoteNo").value);setCounter("invoice",$tk("nextInvoiceNo").value);newQuote();toast("Numérotation enregistrée")};
 $tk("clearTests").onclick=()=>{if(!confirm("Effacer tous les devis, factures, paiements et chantiers de test ?"))return;quotes=[];invoices=[];payments=[];projects=[];store("tk_quotes_v2",quotes);store("tk_invoices_v2",invoices);store("tk_payments_v2",payments);store("tk_projects_v2",projects);setCounter("quote",1);setCounter("invoice",1);$tk("nextQuoteNo").value=1;$tk("nextInvoiceNo").value=1;renderAll();newQuote();toast("Données de test effacées")};
}
renderAll();newQuote();
})();