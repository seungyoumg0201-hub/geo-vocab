const VER='v6-r8';const CACHE='gv-'+VER;const ASSETS=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png','./icons/favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('gv-')&&k!==CACHE&&k!=='gv-meta').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(caches.match(r,{ignoreSearch:r.mode==='navigate'}).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}return res}).catch(()=>r.mode==='navigate'?caches.match('./index.html'):undefined)))});
// Android Chrome installed PWA: periodic background sync -> local reminder (no server)
self.addEventListener('periodicsync',e=>{if(e.tag!=='gv-due')return;e.waitUntil((async()=>{const c=await caches.open('gv-meta');const r=await c.match('./__due.json');if(!r)return;const d=await r.json();const now=Date.now();const n=(d.dues||[]).filter(x=>x<=now).length;
 if(self.navigator&&self.navigator.setAppBadge)try{n?await self.navigator.setAppBadge(n):await self.navigator.clearAppBadge()}catch(err){}
 if(n>0)await self.registration.showNotification('지리 임용 단어장',{body:`오늘 인출할 카드 ${n}장이 기다려요 🧠`,icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:'gv-due'})})())});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(cs=>cs.length?cs[0].focus():self.clients.openWindow('./?m=review')))});
