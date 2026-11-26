/* ====== Configuración de venta ====== */
const CONFIG={
  precio:"$99",
  linkDeCompra:"",          // Link de pago (Mercado Pago, Stripe, etc.)
  whatsapp:""               // Número con lada, solo dígitos, ej. 5215512345678
};
const PUBKEY={"kty":"EC","crv":"P-256","x":"h0EUE0Lic5FQG2gXM4xGwTCPu_7BQsHFpQeWLhvS7PM","y":"ygLT4kiwS4OFXUZWhTLDDvJLrmU4REPH4xd3FZRAgfo"};

const KEY="monygent.v1", LIC="monygent.lic";
const CATS=["Comida","Transporte","Antojos","Súper","Casa","Salidas","Mascotas","Otros"];
const MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MES3=MESES.map(m=>m.slice(0,3));
const DIAS=["dom","lun","mar","mié","jue","vie","sáb"];

/* ====== Utilidades ====== */
const $=id=>document.getElementById(id);
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const fmt=n=>{n=Math.round(n*100)/100;const s="$"+Math.abs(n).toLocaleString("es-MX",{minimumFractionDigits:Math.abs(n)%1?2:0,maximumFractionDigits:2});return n<0?"−"+s:s;};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const money=v=>{v=String(v??"").replace(/\s/g,"").replace(/,/g,"").replace(/[^0-9.]/g,"");const n=Math.round(parseFloat(v)*100)/100;return isFinite(n)&&n>0?n:0;};
const pad=n=>String(n).padStart(2,"0");
const dkey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parseK=k=>{const[y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d);};
const today0=()=>{const t=new Date();t.setHours(0,0,0,0);return t;};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const daysBetween=(a,b)=>Math.round((b-a)/864e5);
const monthLen=(y,m)=>new Date(y,m+1,0).getDate();
const onDay=(y,m,day)=>new Date(y,m,Math.min(day,monthLen(y,m)));
const fdate=d=>d.getDate()+" "+MES3[d.getMonth()];

/* ====== Estado ====== */
const DEF={ingreso:0,dias:[15,30],fijos:[],tarjetas:[],metas:[],gastos:[],pagados:{},extras:{},cat:"Comida"};
let S=load();
function load(){try{const d=JSON.parse(ls.get(KEY)||"null");return Object.assign(structuredClone(DEF),d||{});}catch(e){return structuredClone(DEF);}}
function save(){if(!ls.set(KEY,JSON.stringify(S)))toast("No se pudo guardar. Revisa que no estés en navegación privada.");}

/* ====== Licencia ====== */
const b64u=s=>{s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";const b=atob(s);return Uint8Array.from(b,c=>c.charCodeAt(0));};
function extractCode(txt){
  txt=(txt||"").trim();
  const m=txt.match(/MG1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  return m?m[0]:null;
}
async function verify(code){
  if(!code)return null;
  if(!(window.crypto&&crypto.subtle))throw new Error("nocrypto");
  const [p,payload,sig]=code.split(".");
  if(p!=="MG1"||!payload||!sig)return null;
  try{
    const key=await crypto.subtle.importKey("jwk",PUBKEY,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    const ok=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,b64u(sig),new TextEncoder().encode("MG1."+payload));
    if(!ok)return null;
    return JSON.parse(new TextDecoder().decode(b64u(payload)));
  }catch(e){return null;}
}
let LICENSE=null;

async function boot(){
  // Link de activación: …/#activar=MG1.xxx.yyy
  const fromHash=extractCode(decodeURIComponent(location.hash||""));
  if(fromHash){
    history.replaceState(null,"",location.pathname);
    try{const info=await verify(fromHash);if(info){ls.set(LIC,fromHash);toast("¡Listo! moneyagent quedó activada.");}else{showPaywall("Ese link de activación no es válido. Revisa que lo hayas copiado completo.");return;}}
    catch(e){showPaywall("Tu navegador no puede verificar el código. Ábrelo en Safari o Chrome.");return;}
  }
  const saved=ls.get(LIC);
  let info=null;try{info=await verify(saved);}catch(e){}
  if(info){LICENSE=info;showApp();}else showPaywall();
}

function showPaywall(msg){
  $("app").hidden=true;$("paywall").hidden=false;
  $("priceTxt").innerHTML=esc(CONFIG.precio)+" <small>MXN · pago único</small>";
  const buy=$("buyBtn");
  const href=CONFIG.linkDeCompra||(CONFIG.whatsapp?"https://wa.me/"+CONFIG.whatsapp+"?text="+encodeURIComponent("Hola, quiero comprar moneyagent"):"");
  if(href){buy.href=href;buy.removeAttribute("aria-disabled");}else{buy.removeAttribute("href");buy.setAttribute("aria-disabled","true");buy.textContent="Compra disponible muy pronto";buy.style.opacity=".6";}
  if(msg){$("actErr").textContent=msg;$("actErr").hidden=false;}
}
$("actForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const code=extractCode($("actCode").value);
  const err=$("actErr");err.hidden=true;
  if(!code){err.textContent="No encontramos un código en lo que pegaste. Copia el link completo que te enviamos.";err.hidden=false;return;}
  let info=null;
  try{info=await verify(code);}catch(x){err.textContent="Tu navegador no puede verificar el código. Ábrelo en Safari o Chrome.";err.hidden=false;return;}
  if(!info){err.textContent="Ese código no es válido. Revisa que esté completo o escríbenos.";err.hidden=false;return;}
  ls.set(LIC,code);LICENSE=info;showApp();toast("¡Listo! moneyagent quedó activada.");
});

/* ====== Periodos de quincena ====== */
function paydays(ref){
  const out=[];const dias=[...new Set((S.dias||[]).map(Number).filter(d=>d>=1&&d<=31))].sort((a,b)=>a-b);
  if(!dias.length)dias.push(15,30);
  for(let k=-2;k<=3;k++){const y=ref.getFullYear(),m=ref.getMonth()+k;const base=new Date(y,m,1);dias.forEach(d=>out.push(onDay(base.getFullYear(),base.getMonth(),d)));}
  return out.sort((a,b)=>a-b).filter((d,i,a)=>i===0||+d!==+a[i-1]);
}
function periodOf(ref){
  ref=ref||today0();const p=paydays(ref);
  let start=p[0],next=p[p.length-1];
  for(let i=0;i<p.length;i++){if(p[i]<=ref)start=p[i];else{next=p[i];break;}}
  const end=addDays(next,-1);
  return {start,end,next,key:dkey(start)};
}
function monthsSpan(a,b){const r=[];let d=new Date(a.getFullYear(),a.getMonth(),1);while(d<=b){r.push([d.getFullYear(),d.getMonth()]);d=new Date(d.getFullYear(),d.getMonth()+1,1);}return r;}
function obligations(per){
  const items=[];const span=monthsSpan(per.start,per.end);
  S.fijos.forEach(f=>{
    if(f.freq==="q")items.push({id:"f:"+f.id,tipo:"fijo",nombre:f.nombre,monto:f.monto,fecha:null,nota:"Cada quincena"});
    else span.forEach(([y,m])=>{const d=onDay(y,m,f.dia||1);if(d>=per.start&&d<=per.end)items.push({id:"f:"+f.id+":"+dkey(d),tipo:"fijo",nombre:f.nombre,monto:f.monto,fecha:d,nota:"Cada mes"});});
  });
  S.tarjetas.forEach(t=>{span.forEach(([y,m])=>{const d=onDay(y,m,t.diaPago||1);if(d>=per.start&&d<=per.end)items.push({id:"t:"+t.id+":"+dkey(d),tipo:"tarjeta",ref:t.id,nombre:"Pagar "+t.nombre,monto:t.pagoMes||0,fecha:d,nota:t.pagoMes?"":"Define cuánto pagar en Tarjetas"});});});
  S.metas.forEach(m=>{if(m.porQuincena>0&&m.ahorrado<m.meta)items.push({id:"m:"+m.id,tipo:"meta",ref:m.id,nombre:"Ahorro: "+m.nombre,monto:Math.min(m.porQuincena,m.meta-m.ahorrado),fecha:null,nota:"Al apartado"});});
  return items.sort((a,b)=>(a.fecha?+a.fecha:0)-(b.fecha?+b.fecha:0));
}
function paidMap(per){return S.pagados[per.key]||{};}
function gastosIn(per){const a=+per.start,b=+addDays(per.end,1);return S.gastos.filter(g=>g.ts>=a&&g.ts<b);}
function summary(per){
  per=per||periodOf();
  const ob=obligations(per);const paid=paidMap(per);
  const obTotal=ob.reduce((s,i)=>s+(paid[i.id]?paid[i.id].monto:i.monto),0);
  const gs=gastosIn(per).reduce((s,g)=>s+g.monto,0);
  const extra=S.extras[per.key]||0;
  const left=S.ingreso+extra-obTotal-gs;
  const t=today0();const diasRest=Math.max(1,daysBetween(t,per.end)+1);
  return {per,ob,paid,obTotal,gs,extra,left,diasRest,porDia:Math.floor(left/diasRest)};
}
function dueChip(d){
  if(!d)return "";const n=daysBetween(today0(),d);
  if(n<0)return `<span class="chip bad">Venció ${fdate(d)}</span>`;
  if(n===0)return `<span class="chip bad">Hoy</span>`;
  if(n<=3)return `<span class="chip warn">En ${n} día${n>1?"s":""} · ${fdate(d)}</span>`;
  return `<span class="chip">Vence ${fdate(d)}</span>`;
}
function nextDue(t){const ref=today0();for(let k=0;k<3;k++){const b=new Date(ref.getFullYear(),ref.getMonth()+k,1);const d=onDay(b.getFullYear(),b.getMonth(),t.diaPago||1);if(d>=ref)return d;}return null;}

/* ====== Navegación ====== */
let VIEW="gastos";
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>go(b.dataset.v)));
function go(v){VIEW=v;document.querySelectorAll(".tab").forEach(b=>{if(b.dataset.v===v)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  ["gastos","quincena","tarjetas","metas"].forEach(x=>$("v-"+x).hidden=x!==v);render();window.scrollTo(0,0);}
function showApp(){$("paywall").hidden=true;$("app").hidden=false;if(!S.ingreso&&!ls.get("monygent.setup"))openSetup(true);render();}
function render(){({gastos:rGastos,quincena:rQuincena,tarjetas:rTarjetas,metas:rMetas})[VIEW]();}

/* ====== Vista: Gastos ====== */
let openMov=null;
function rGastos(){
  const v=$("v-gastos");const sm=summary();
  const standalone=navigator.standalone===true||matchMedia("(display-mode: standalone)").matches;
  const showInst=!standalone&&ls.get("monygent.instHide")!=="1";
  v.innerHTML=`
  ${showInst?`<div class="card stack" style="gap:8px"><b>Instálala en tu celular</b><span class="small muted">1. Copia tu código. 2. En Safari toca ••• o Compartir → «Agregar a inicio». 3. Abre moneyagent desde el ícono y pega tu código en «¿Ya compraste?». Tu celular guarda la app aparte del navegador, por eso se activa otra vez.</span><div class="row"><button class="btn soft sm" id="cpLic">Copiar mi código</button><button class="btn ghost sm" id="hideInst">Ya la instalé</button></div></div>`:""}
  <form class="card cap" id="capForm" autocomplete="off">
    <label class="amount" for="monto"><span>$</span><input id="monto" inputmode="decimal" enterkeyhint="done" placeholder="0" aria-label="¿Cuánto gastaste?"></label>
    <div class="cats" role="group" aria-label="Categoría">${CATS.map(c=>`<button type="button" class="cat" aria-pressed="${c===S.cat}" data-c="${c}">${c}</button>`).join("")}</div>
    <input class="input" id="nota" maxlength="80" placeholder="Nota (opcional): tacos, metro, Oxxo…">
    <button class="btn" id="guardar" type="submit" disabled>Guardar gasto</button>
  </form>
  <button class="left-mini" id="toQ"><span><span class="lbl">Te queda esta quincena</span><br><span class="small muted">${S.ingreso?"Unos "+fmt(Math.max(0,sm.porDia))+" al día · cobras el "+fdate(sm.per.next):"Configura tu sueldo para calcularlo"}</span></span><b class="num">${S.ingreso?fmt(sm.left):"—"}</b></button>
  <section><div class="sechead"><h2>Movimientos</h2><span class="small muted num">${fmt(sm.gs)} esta quincena</span></div><div id="movs"></div></section>`;
  v.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{S.cat=b.dataset.c;save();v.querySelectorAll(".cat").forEach(x=>x.setAttribute("aria-pressed",x===b));});
  const mi=$("monto");mi.oninput=()=>$("guardar").disabled=!money(mi.value);
  $("toQ").onclick=()=>go("quincena");
  if(showInst){$("cpLic").onclick=()=>copyLic();$("hideInst").onclick=()=>{ls.set("monygent.instHide","1");rGastos();};}
  $("capForm").onsubmit=e=>{e.preventDefault();const m=money(mi.value);if(!m)return;
    const g={id:uid(),monto:m,cat:S.cat,nota:$("nota").value.trim(),ts:Date.now()};S.gastos.unshift(g);save();
    toast("Guardado "+fmt(m)+" · "+g.cat,()=>{S.gastos=S.gastos.filter(x=>x.id!==g.id);save();render();});render();setTimeout(()=>$("monto")&&$("monto").focus(),0);};
  const L=$("movs");
  if(!S.gastos.length){L.innerHTML=`<div class="empty">Aquí aparecen tus gastos. Escribe el monto arriba y toca Guardar.</div>`;return;}
  const groups=new Map();S.gastos.slice(0,250).forEach(g=>{const k=dkey(new Date(g.ts));if(!groups.has(k))groups.set(k,[]);groups.get(k).push(g);});
  const hoy=dkey(today0()),ayer=dkey(addDays(today0(),-1));
  let h="";groups.forEach((arr,k)=>{const d=parseK(k);
    h+=`<div class="dayh"><span>${k===hoy?"Hoy":k===ayer?"Ayer":DIAS[d.getDay()]+" "+fdate(d)}</span><span class="num">${fmt(arr.reduce((s,g)=>s+g.monto,0))}</span></div>`;
    arr.forEach(g=>{h+=`<button class="mov" data-id="${g.id}"><span class="t">${esc(g.cat)}</span><span class="n">${esc(g.nota?g.nota+" · ":"")}${new Date(g.ts).toLocaleTimeString("es-MX",{hour:"numeric",minute:"2-digit"})}</span><span class="a num">${fmt(g.monto)}</span></button>`;
      if(openMov===g.id)h+=`<div class="movact"><button class="btn ghost sm" data-x="cancel">Cancelar</button><button class="btn danger sm" data-x="del" data-id="${g.id}">Borrar gasto</button></div>`;});});
  L.innerHTML=h;
  L.querySelectorAll(".mov").forEach(b=>b.onclick=()=>{openMov=openMov===b.dataset.id?null:b.dataset.id;rGastos();});
  L.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>{if(b.dataset.x==="del"){const g=S.gastos.find(x=>x.id===b.dataset.id);S.gastos=S.gastos.filter(x=>x.id!==b.dataset.id);save();toast("Borrado "+fmt(g.monto),()=>{S.gastos.push(g);S.gastos.sort((a,b)=>b.ts-a.ts);save();render();});}openMov=null;rGastos();});
}

/* ====== Vista: Quincena ====== */
function rQuincena(){
  const v=$("v-quincena");
  if(!S.ingreso){v.innerHTML=`<div class="card stack"><h2>Arma tu quincena</h2><p class="muted" style="margin:0">Pon cuánto cobras, qué días te pagan y tus pagos fijos (renta, apoyo en casa, suscripciones). Con eso te decimos cuánto te queda para gastar cada día.</p><button class="btn" id="cfg">Configurar mi sueldo</button></div>`;$("cfg").onclick=()=>openSetup();return;}
  const s=summary();const p=s.per;
  v.innerHTML=`
  <div class="card stack">
    <div class="hero-left">
      <span class="lbl">Te queda para ti · ${fdate(p.start)} al ${fdate(p.end)}</span>
      <span class="big num ${s.left<0?"neg":""}">${fmt(s.left)}</span>
      <span class="muted">${s.left>=0?"Unos <b class='num'>"+fmt(s.porDia)+"</b> al día por "+s.diasRest+" día"+(s.diasRest>1?"s":""):"Te pasaste de tu quincena. Revisa tus gastos o ajusta un pago."} · cobras el ${fdate(p.next)}</span>
    </div>
    <div class="breakdown num">
      <div class="bline"><span>Sueldo</span><b>${fmt(S.ingreso)}</b></div>
      <div class="bline"><span>Extra (comisiones, bonos)</span><span class="row" style="align-items:center;gap:6px"><input class="input num" id="extra" inputmode="decimal" style="width:110px;padding:6px 10px;text-align:right" placeholder="$0" value="${s.extra||""}"></span></div>
      <div class="bline"><span>Pagos y ahorro de la quincena</span><b>${s.obTotal?"−"+fmt(s.obTotal):"$0"}</b></div>
      <div class="bline"><span>Gastos anotados</span><b>${s.gs?"−"+fmt(s.gs):"$0"}</b></div>
    </div>
  </div>
  <section class="card">
    <div class="sechead"><h2>Lo que toca pagar</h2><button class="btn ghost sm" id="edit">Editar</button></div>
    ${s.ob.length?`<ul class="oblig">${s.ob.map(i=>{const pd=s.paid[i.id];return `<li class="${pd?"done":""}"><input type="checkbox" class="check" data-id="${esc(i.id)}" ${pd?"checked":""} aria-label="Marcar ${esc(i.nombre)} como pagado"><span class="c">${esc(i.nombre)}</span><span class="n">${dueChip(i.fecha)}<span>${esc(i.nota||"")}</span></span><span class="a">${fmt(pd?pd.monto:i.monto)}</span></li>`;}).join("")}</ul>`:`<div class="empty">No tienes pagos en esta quincena. Agrega tus pagos fijos, tarjetas o metas.</div>`}
    <p class="small muted" style="margin:10px 0 0">Palomea cada pago cuando lo hagas. Si es una tarjeta, se descuenta de su saldo; si es una meta, se suma a tu ahorro.</p>
  </section>
  <section class="card stack">
    <div class="sechead"><h2>Recordatorios</h2></div>
    <p class="small muted" style="margin:0">Agrega a tu calendario tus días de cobro y las fechas límite de tus tarjetas y pagos de los próximos 3 meses, con alerta.</p>
    <button class="btn soft" id="ics">Agregar a mi calendario</button>
  </section>`;
  $("edit").onclick=()=>openSetup();$("ics").onclick=exportICS;
  $("extra").onchange=e=>{const m=money(e.target.value);if(m)S.extras[p.key]=m;else delete S.extras[p.key];save();rQuincena();};
  v.querySelectorAll(".check").forEach(c=>c.onchange=()=>{const it=s.ob.find(i=>i.id===c.dataset.id);togglePaid(p,it,c.checked);});
}
function togglePaid(per,it,on){
  S.pagados[per.key]=S.pagados[per.key]||{};const pm=S.pagados[per.key];
  if(on){
    if(it.tipo==="tarjeta"&&!it.monto){toast("Primero define cuánto vas a pagar de esta tarjeta.");go("tarjetas");return;}
    pm[it.id]={monto:it.monto,ts:Date.now()};
    if(it.tipo==="tarjeta"){const t=S.tarjetas.find(x=>x.id===it.ref);if(t)t.saldo=Math.max(0,Math.round((t.saldo-it.monto)*100)/100);}
    if(it.tipo==="meta"){const m=S.metas.find(x=>x.id===it.ref);if(m)m.ahorrado=Math.round((m.ahorrado+it.monto)*100)/100;}
  }else{
    const prev=pm[it.id];if(prev){
      if(it.tipo==="tarjeta"){const t=S.tarjetas.find(x=>x.id===it.ref);if(t)t.saldo=Math.round((t.saldo+prev.monto)*100)/100;}
      if(it.tipo==="meta"){const m=S.metas.find(x=>x.id===it.ref);if(m)m.ahorrado=Math.max(0,Math.round((m.ahorrado-prev.monto)*100)/100);}
    }
    delete pm[it.id];
  }
  save();render();
}

/* ====== Vista: Tarjetas ====== */
function rTarjetas(){
  const v=$("v-tarjetas");const total=S.tarjetas.reduce((s,t)=>s+(t.saldo||0),0);
  let h=`<div class="card total"><span><span class="lbl">Debes en tarjetas</span><br><span class="small muted">${S.tarjetas.length} tarjeta${S.tarjetas.length===1?"":"s"}</span></span><b class="num">${fmt(total)}</b></div>`;
  h+=`<div class="tip">Paga antes de la fecha límite. Un día tarde puede costarte más de $300 de comisión, más intereses.</div>`;
  if(!S.tarjetas.length)h+=`<div class="empty">Agrega tus tarjetas de crédito para ver cuánto debes y cuándo vence cada una.</div>`;
  S.tarjetas.forEach(t=>{const due=nextDue(t);const uso=t.limite?Math.min(100,t.saldo/t.limite*100):0;
    h+=`<article class="card tc">
      <div class="tc-top"><div><h3>${esc(t.nombre)}</h3><div style="margin-top:4px">${t.saldo>0?dueChip(due):'<span class="chip ok">Liquidada</span>'}</div></div><div class="saldo num">${fmt(t.saldo)}<div class="small muted" style="font-family:var(--body);font-weight:500">${t.limite?"de "+fmt(t.limite):"saldo"}</div></div></div>
      ${t.limite?`<div class="bar ${uso>70?"neg":""}"><i style="width:${uso}%"></i></div>`:""}
      <div class="facts num"><div>Corte<b>Día ${t.diaCorte||"—"}</b></div><div>Pagar antes del<b>Día ${t.diaPago||"—"}</b></div><div>Pagar este mes<b>${t.pagoMes?fmt(t.pagoMes):"—"}</b></div></div>
      <div class="row"><button class="btn soft sm" data-pay="${t.id}">Registrar pago</button><button class="btn ghost sm" data-edit="${t.id}">Editar</button></div>
    </article>`;});
  h+=`<button class="btn" id="addT">Agregar tarjeta</button>`;
  v.innerHTML=h;
  $("addT").onclick=()=>editTarjeta();
  v.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editTarjeta(S.tarjetas.find(t=>t.id===b.dataset.edit)));
  v.querySelectorAll("[data-pay]").forEach(b=>b.onclick=()=>payTarjeta(S.tarjetas.find(t=>t.id===b.dataset.pay)));
}
function editTarjeta(t){
  const isNew=!t;t=t||{id:uid(),nombre:"",saldo:0,limite:0,diaCorte:"",diaPago:"",pagoMes:0};
  openSheet(isNew?"Nueva tarjeta":"Editar tarjeta",`
    <form id="tf" class="stack" autocomplete="off">
      <div class="field"><label for="tn">Nombre</label><input class="input" id="tn" required maxlength="30" placeholder="Ej. BBVA Azul" value="${esc(t.nombre)}"></div>
      <div class="grid2"><div class="field"><label for="ts">Saldo que debes</label><input class="input num" id="ts" inputmode="decimal" value="${t.saldo||""}" placeholder="$0"></div>
      <div class="field"><label for="tl">Límite de crédito</label><input class="input num" id="tl" inputmode="decimal" value="${t.limite||""}" placeholder="$0"></div></div>
      <div class="grid2"><div class="field"><label for="tc">Día de corte</label><input class="input num" id="tc" inputmode="numeric" value="${t.diaCorte||""}" placeholder="Ej. 3"></div>
      <div class="field"><label for="tp">Día límite de pago</label><input class="input num" id="tp" inputmode="numeric" value="${t.diaPago||""}" placeholder="Ej. 18"></div></div>
      <div class="field"><label for="tm">Cuánto vas a pagar este mes</label><input class="input num" id="tm" inputmode="decimal" value="${t.pagoMes||""}" placeholder="Pago para no generar intereses"><span class="small muted">Búscalo en la app de tu banco como «pago para no generar intereses».</span></div>
      <button class="btn" type="submit">Guardar tarjeta</button>
      ${isNew?"":`<button class="btn danger" type="button" id="tdel">Borrar tarjeta</button>`}
    </form>`,()=>{
    $("tf").onsubmit=e=>{e.preventDefault();const dia=x=>{const n=parseInt($(x).value,10);return n>=1&&n<=31?n:"";};
      Object.assign(t,{nombre:$("tn").value.trim()||"Tarjeta",saldo:money($("ts").value),limite:money($("tl").value),diaCorte:dia("tc"),diaPago:dia("tp"),pagoMes:money($("tm").value)});
      if(!t.diaPago){toast("Pon el día límite de pago para avisarte a tiempo.");return;}
      if(isNew)S.tarjetas.push(t);save();closeSheet();render();toast("Tarjeta guardada");};
    if(!isNew)confirmBtn($("tdel"),()=>{S.tarjetas=S.tarjetas.filter(x=>x.id!==t.id);save();closeSheet();render();});
  });
}
function payTarjeta(t){
  openSheet("Pago a "+t.nombre,`<form id="pf" class="stack"><div class="field"><label for="pm">¿Cuánto pagaste?</label><input class="input num" id="pm" inputmode="decimal" placeholder="$0" value="${t.pagoMes||""}"></div><p class="small muted" style="margin:0">Debes ${fmt(t.saldo)}. Se descuenta del saldo.</p><button class="btn" type="submit">Registrar pago</button></form>`,()=>{
    $("pf").onsubmit=e=>{e.preventDefault();const m=money($("pm").value);if(!m)return;t.saldo=Math.max(0,Math.round((t.saldo-m)*100)/100);save();closeSheet();render();toast("Pago de "+fmt(m)+" registrado");};});
}

/* ====== Vista: Metas ====== */
function rMetas(){
  const v=$("v-metas");const tot=S.metas.reduce((s,m)=>s+m.ahorrado,0);
  let h=`<div class="card total"><span><span class="lbl">Llevas ahorrado</span><br><span class="small muted">${S.metas.length} meta${S.metas.length===1?"":"s"}</span></span><b class="num" style="color:var(--pos)">${fmt(tot)}</b></div>`;
  if(!S.metas.length)h+=`<div class="empty">Crea una meta: la escuela, un viaje, un fondo de emergencias. Te decimos cuánto apartar cada quincena.</div>`;
  S.metas.forEach(m=>{const pct=m.meta?Math.min(100,m.ahorrado/m.meta*100):0;const falta=Math.max(0,m.meta-m.ahorrado);
    let sug="";if(m.fecha&&falta>0){const q=Math.max(1,paydays(today0()).filter(d=>d>today0()&&d<=parseK(m.fecha)).length);sug=`Para llegar al ${fdate(parseK(m.fecha))}: aparta ${fmt(Math.ceil(falta/q))} por quincena (${q} quincena${q>1?"s":""}).`;}
    h+=`<article class="card tc">
      <div class="tc-top"><div><h3>${esc(m.nombre)}</h3><div class="small muted">${falta>0?"Faltan "+fmt(falta):"¡Meta cumplida!"}</div></div><div class="saldo num" style="color:var(--pos)">${fmt(m.ahorrado)}<div class="small muted" style="font-family:var(--body);font-weight:500">de ${fmt(m.meta)}</div></div></div>
      <div class="bar pos"><i style="width:${pct}%"></i></div>
      <div class="small muted">${m.porQuincena?"Apartas "+fmt(m.porQuincena)+" cada quincena. ":""}${sug}</div>
      <div class="row"><button class="btn soft sm" data-add="${m.id}">Aportar</button><button class="btn ghost sm" data-out="${m.id}">Retirar</button><button class="btn ghost sm" data-edit="${m.id}">Editar</button></div>
    </article>`;});
  h+=`<button class="btn" id="addM">Nueva meta</button>`;
  v.innerHTML=h;
  $("addM").onclick=()=>editMeta();
  v.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editMeta(S.metas.find(m=>m.id===b.dataset.edit)));
  v.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>moveMeta(S.metas.find(m=>m.id===b.dataset.add),1));
  v.querySelectorAll("[data-out]").forEach(b=>b.onclick=()=>moveMeta(S.metas.find(m=>m.id===b.dataset.out),-1));
}
function editMeta(m){
  const isNew=!m;m=m||{id:uid(),nombre:"",meta:0,ahorrado:0,fecha:"",porQuincena:0};
  openSheet(isNew?"Nueva meta":"Editar meta",`
    <form id="mf" class="stack" autocomplete="off">
      <div class="field"><label for="mn">¿Para qué ahorras?</label><input class="input" id="mn" maxlength="30" placeholder="Ej. Escuela de enero" value="${esc(m.nombre)}"></div>
      <div class="grid2"><div class="field"><label for="mm">Meta</label><input class="input num" id="mm" inputmode="decimal" placeholder="$0" value="${m.meta||""}"></div>
      <div class="field"><label for="ma">Ya tienes</label><input class="input num" id="ma" inputmode="decimal" placeholder="$0" value="${m.ahorrado||""}"></div></div>
      <div class="grid2"><div class="field"><label for="mfch">¿Para cuándo?</label><input class="input" id="mfch" type="date" value="${m.fecha||""}"></div>
      <div class="field"><label for="mq">Apartar por quincena</label><input class="input num" id="mq" inputmode="decimal" placeholder="$0" value="${m.porQuincena||""}"></div></div>
      <p class="small muted" style="margin:0" id="msug"></p>
      <button class="btn" type="submit">Guardar meta</button>
      ${isNew?"":`<button class="btn danger" type="button" id="mdel">Borrar meta</button>`}
    </form>`,()=>{
    const sug=()=>{const meta=money($("mm").value),ya=Number(String($("ma").value).replace(/[^0-9.]/g,""))||0,f=$("mfch").value;
      if(meta&&f){const q=Math.max(1,paydays(today0()).filter(d=>d>today0()&&d<=parseK(f)).length);const s=Math.ceil(Math.max(0,meta-ya)/q);$("msug").textContent="Sugerido: "+fmt(s)+" por quincena para llegar a tiempo.";if(!money($("mq").value))$("mq").placeholder=fmt(s);}else $("msug").textContent="";};
    ["mm","ma","mfch"].forEach(id=>$(id).addEventListener("input",sug));sug();
    $("mf").onsubmit=e=>{e.preventDefault();const meta=money($("mm").value);if(!meta){toast("Pon cuánto quieres juntar.");return;}
      let pq=money($("mq").value);if(!pq&&$("mq").placeholder.startsWith("$"))pq=money($("mq").placeholder);
      Object.assign(m,{nombre:$("mn").value.trim()||"Mi meta",meta,ahorrado:Number(String($("ma").value).replace(/[^0-9.]/g,""))||0,fecha:$("mfch").value,porQuincena:pq});
      if(isNew)S.metas.push(m);save();closeSheet();render();toast("Meta guardada");};
    if(!isNew)confirmBtn($("mdel"),()=>{S.metas=S.metas.filter(x=>x.id!==m.id);save();closeSheet();render();});
  });
}
function moveMeta(m,sign){
  openSheet((sign>0?"Aportar a ":"Retirar de ")+m.nombre,`<form id="af" class="stack"><div class="field"><label for="am">¿Cuánto?</label><input class="input num" id="am" inputmode="decimal" placeholder="$0" value="${sign>0&&m.porQuincena?m.porQuincena:""}"></div><button class="btn" type="submit">${sign>0?"Aportar":"Retirar"}</button></form>`,()=>{
    $("af").onsubmit=e=>{e.preventDefault();const a=money($("am").value);if(!a)return;m.ahorrado=Math.max(0,Math.round((m.ahorrado+sign*a)*100)/100);save();closeSheet();render();toast(sign>0?"Aportaste "+fmt(a):"Retiraste "+fmt(a));};});
}

/* ====== Ajustes / configuración ====== */
$("setBtn").onclick=()=>openSetup();
function openSetup(first){
  const fx=()=>S.fijos.length?S.fijos.map(f=>`<div class="fx"><span><b>${esc(f.nombre)}</b> · <span class="num">${fmt(f.monto)}</span></span><span class="n">${f.freq==="q"?"Cada quincena":"Cada mes, día "+f.dia}</span><button class="btn ghost sm" type="button" data-rm="${f.id}">Quitar</button></div>`).join(""):`<p class="small muted" style="margin:0">Aún no tienes pagos fijos.</p>`;
  openSheet(first?"Bienvenido a moneyagent":"Ajustes",`
    ${first?`<p class="muted" style="margin:0">Dos datos y listo: cuánto cobras y qué días te pagan.</p>`:""}
    <form id="sf" class="stack" autocomplete="off">
      <div class="field"><label for="si">¿Cuánto cobras por quincena?</label><input class="input num" id="si" inputmode="decimal" placeholder="Ej. 4200" value="${S.ingreso||""}"><span class="small muted">Pon lo seguro, sin comisiones. Los extras los anotas en cada quincena.</span></div>
      <div class="grid2"><div class="field"><label for="d1">Primer día de pago</label><input class="input num" id="d1" inputmode="numeric" value="${S.dias[0]||15}"></div>
      <div class="field"><label for="d2">Segundo día de pago</label><input class="input num" id="d2" inputmode="numeric" value="${S.dias[1]||30}"></div></div>
      <button class="btn" type="submit">${first?"Empezar":"Guardar"}</button>
    </form>
    ${first?`<button class="btn ghost" id="skip">Ahora no</button>`:`
    <section class="stack"><h2 style="font-size:1.05rem">Pagos fijos</h2><p class="small muted" style="margin:0">Renta, apoyo en casa, suscripciones, pasajes, comida de tu mascota.</p>
      <div id="fxl">${fx()}</div>
      <form id="ff" class="stack" autocomplete="off" style="background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:12px">
        <div class="grid2"><div class="field"><label for="fn">Pago</label><input class="input" id="fn" maxlength="30" placeholder="Ej. Renta"></div><div class="field"><label for="fm">Monto</label><input class="input num" id="fm" inputmode="decimal" placeholder="$0"></div></div>
        <div class="grid2"><div class="field"><label for="ffq">¿Cada cuándo?</label><select class="input" id="ffq"><option value="q">Cada quincena</option><option value="m">Cada mes</option></select></div><div class="field"><label for="fd">Día (si es mensual)</label><input class="input num" id="fd" inputmode="numeric" placeholder="Ej. 1"></div></div>
        <button class="btn soft" type="submit">Agregar pago fijo</button>
      </form>
    </section>
    <section class="stack"><h2 style="font-size:1.05rem">Respaldo</h2><p class="small muted" style="margin:0">Tus datos viven solo en este celular. Guarda un respaldo de vez en cuando por si cambias de teléfono.</p>
      <div class="row"><button class="btn ghost sm" id="bk">Guardar respaldo</button><label class="btn ghost sm" for="rs" style="text-align:center">Restaurar respaldo</label><input type="file" id="rs" accept=".json,application/json" hidden></div>
    </section>
    <section class="stack"><h2 style="font-size:1.05rem">Licencia</h2><p class="small muted" style="margin:0">moneyagent activada${LICENSE&&LICENSE.n?" a nombre de <b>"+esc(LICENSE.n)+"</b>":""}. Gracias por tu compra.</p>
      <button class="btn ghost" type="button" id="cpLic2">Copiar mi código de activación</button>
      <p class="small muted" style="margin:0">Guárdalo: lo necesitas si cambias de celular o instalas la app desde el ícono.</p>
      <button class="btn danger" type="button" id="wipe">Borrar todos mis datos</button>
    </section>`}`,()=>{
    $("sf").onsubmit=e=>{e.preventDefault();const i=money($("si").value);const d=x=>{const n=parseInt($(x).value,10);return n>=1&&n<=31?n:null;};
      const a=d("d1"),b=d("d2");if(!i){toast("Pon cuánto cobras por quincena.");return;}if(!a||!b||a===b){toast("Pon dos días de pago distintos, del 1 al 31.");return;}
      S.ingreso=i;S.dias=[Math.min(a,b),Math.max(a,b)];save();ls.set("monygent.setup","1");
      if(first){closeSheet();go("quincena");toast("¡Listo! Ahora agrega tus pagos fijos en Ajustes.");}else{toast("Guardado");render();}};
    if(first){$("skip").onclick=()=>{ls.set("monygent.setup","1");closeSheet();};return;}
    const bindRm=()=>document.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{S.fijos=S.fijos.filter(f=>f.id!==b.dataset.rm);save();$("fxl").innerHTML=fx();bindRm();render();});bindRm();
    $("ff").onsubmit=e=>{e.preventDefault();const m=money($("fm").value);const n=$("fn").value.trim();const q=$("ffq").value;const dd=parseInt($("fd").value,10);
      if(!n||!m){toast("Pon el nombre y el monto del pago.");return;}if(q==="m"&&!(dd>=1&&dd<=31)){toast("Pon el día del mes en que pagas.");return;}
      S.fijos.push({id:uid(),nombre:n,monto:m,freq:q,dia:q==="m"?dd:null});save();$("fxl").innerHTML=fx();bindRm();e.target.reset();render();toast("Pago fijo agregado");};
    $("bk").onclick=()=>shareFile("monygent-respaldo-"+dkey(new Date())+".json",JSON.stringify(S),"application/json");
    $("rs").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!d||!Array.isArray(d.gastos))throw 0;S=Object.assign(structuredClone(DEF),d);save();closeSheet();render();toast("Respaldo restaurado");}catch(x){toast("Ese archivo no es un respaldo de moneyagent.");}};
    $("cpLic2").onclick=()=>copyLic();
    confirmBtn($("wipe"),()=>{S=structuredClone(DEF);save();ls.del("monygent.setup");closeSheet();render();toast("Datos borrados");});
  });
}

async function copyLic(){const c=ls.get(LIC)||"";try{await navigator.clipboard.writeText(c);toast("Código copiado. Pégalo en la app instalada.");}catch(e){shareFile("codigo-moneyagent.txt",c,"text/plain");}}

/* ====== Recordatorios (.ics) ====== */
function exportICS(){
  const now=today0();const until=addDays(now,92);const ev=[];
  // Días de cobro con lo que toca pagar
  paydays(now).filter(d=>d>=now&&d<=until).forEach(d=>{const per=periodOf(d);const ob=obligations(per);
    const lines=ob.map(i=>"- "+i.nombre+": "+(i.monto?fmt(i.monto):"por definir")+(i.fecha?" (vence "+fdate(i.fecha)+")":""));
    ev.push({d,h:9,m:0,t:"Cobras hoy: aparta tus pagos",desc:(lines.length?lines.join("\n"):"Revisa tu quincena en moneyagent.")});});
  // Tarjetas: aviso 2 días antes
  S.tarjetas.filter(t=>t.diaPago).forEach(t=>{for(let k=0;k<4;k++){const b=new Date(now.getFullYear(),now.getMonth()+k,1);const due=onDay(b.getFullYear(),b.getMonth(),t.diaPago);const al=addDays(due,-2);if(al>=now&&al<=until)ev.push({d:al,h:10,m:0,t:"Pagar "+t.nombre+(t.pagoMes?" "+fmt(t.pagoMes):""),desc:"Vence el "+fdate(due)+". Paga hoy o mañana para no tener recargos."});}});
  // Pagos fijos mensuales
  S.fijos.filter(f=>f.freq==="m").forEach(f=>{for(let k=0;k<4;k++){const b=new Date(now.getFullYear(),now.getMonth()+k,1);const d=onDay(b.getFullYear(),b.getMonth(),f.dia);if(d>=now&&d<=until)ev.push({d,h:9,m:30,t:"Pago: "+f.nombre+" "+fmt(f.monto),desc:"Pago fijo mensual."});}});
  // Metas con fecha
  S.metas.filter(m=>m.fecha).forEach(m=>{const d=parseK(m.fecha);if(d>=now&&d<=until)ev.push({d,h:10,m:0,t:"Meta: "+m.nombre,desc:"Fecha de tu meta de "+fmt(m.meta)+"."});});
  if(!ev.length){toast("Configura tu sueldo, tarjetas o pagos para crear recordatorios.");return;}
  const e=s=>String(s).replace(/\\/g,"\\\\").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n");
  const st=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//moneyagent//ES","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:moneyagent"];
  ev.forEach((x,i)=>{const s=new Date(x.d);s.setHours(x.h,x.m,0,0);const en=new Date(s.getTime()+15*60000);
    const f=d=>d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+"T"+pad(d.getHours())+pad(d.getMinutes())+"00";
    L.push("BEGIN:VEVENT","UID:"+uid()+i+"@monygent","DTSTAMP:"+st,"DTSTART:"+f(s),"DTEND:"+f(en),"SUMMARY:"+e(x.t),"DESCRIPTION:"+e(x.desc),"BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+e(x.t),"TRIGGER:PT0M","END:VALARM","END:VEVENT");});
  L.push("END:VCALENDAR");
  shareFile("monygent-recordatorios.ics",L.join("\r\n")+"\r\n","text/calendar");
}
async function shareFile(name,text,type){
  const file=new File([text],name,{type});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});return;}}catch(e){if(e&&e.name==="AbortError")return;}
  const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
}

/* ====== Hoja, confirmación y avisos ====== */
function openSheet(title,html,mount){
  const host=$("sheetHost");host.innerHTML=`<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-h"><h2>${esc(title)}</h2><button class="iconbtn" id="xs" aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>${html}</div></div>`;
  $("xs").onclick=closeSheet;$("scrim").onclick=e=>{if(e.target.id==="scrim")closeSheet();};
  mount&&mount();const f=host.querySelector("input:not([type=hidden]):not([type=file])");if(f&&!matchMedia("(pointer:coarse)").matches)f.focus();
}
function closeSheet(){$("sheetHost").innerHTML="";}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet();});
function confirmBtn(btn,fn){if(!btn)return;let armed=false;const txt=btn.textContent;btn.onclick=()=>{if(!armed){armed=true;btn.textContent="¿Seguro? Toca otra vez";setTimeout(()=>{armed=false;btn.textContent=txt;},3500);return;}fn();};}
let tT;function toast(msg,undo){clearTimeout(tT);const h=$("toastHost");h.innerHTML="";const t=document.createElement("div");t.className="toast";t.setAttribute("role","status");const s=document.createElement("span");s.textContent=msg;t.appendChild(s);
  if(undo){const b=document.createElement("button");b.textContent="Deshacer";b.onclick=()=>{h.innerHTML="";undo();};t.appendChild(b);}h.appendChild(t);tT=setTimeout(()=>h.innerHTML="",4000);}

/* ====== Arranque ====== */
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
if("serviceWorker" in navigator){const reg=()=>navigator.serviceWorker.register("/sw.js").catch(()=>{});if(document.readyState==="complete")reg();else window.addEventListener("load",reg);}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!$("app").hidden)render();});
window.addEventListener("hashchange",()=>{if(extractCode(decodeURIComponent(location.hash)))boot();});
boot();
