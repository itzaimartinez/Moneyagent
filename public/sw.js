const CACHE="moneyagent-v2";
const CORE=["/","/app.js","/manifest.webmanifest","/apple-touch-icon.png","/icon-192.png","/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
const put=(req,res)=>{if(res&&(res.ok||res.type==="opaque")){const c=res.clone();caches.open(CACHE).then(x=>x.put(req,c));}return res;};
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
  // Archivos con huella (/_next/static) y fuentes: primero la copia guardada
  if((u.origin===location.origin&&u.pathname.startsWith("/_next/static/"))||/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>put(r,res))));return;}
  // Página y archivos propios: primero internet (para recibir mejoras), sin internet usa la copia
  if(u.origin===location.origin){
    const key=r.mode==="navigate"?"/":r;
    e.respondWith(fetch(r).then(res=>put(key,res)).catch(()=>caches.match(key)));
  }
});
