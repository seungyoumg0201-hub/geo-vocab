const VER='v6-r83b';const CACHE='gvb-'+VER;const ASSETS=['./','./index.html','./manifest.webmanifest','./app.js?v='+VER,'../icons/icon-192.png?v=3','../icons/icon-512.png?v=3','../icons/maskable-512.png?v=3','../icons/apple-touch-icon.png?v=3','../icons/favicon-32.png?v=3','../icons/icon.svg?v=3'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))))});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('gvb-')&&k!==CACHE&&k!=='gvb-meta').map(k=>caches.delete(k)))).then(()=>self.clients.claim()).then(()=>{/* r75: 활성화 직후 열린 창을 새 버전으로 다시 열기(waitUntil 밖 — 안에서 기다리면 내비게이션 fetch와 교착) */setTimeout(()=>self.clients.matchAll({type:'window'}).then(cs=>cs.forEach(c=>{try{c.navigate(c.url).catch(()=>{})}catch(err){}})).catch(()=>{}),300)}))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 /* r78: 베타 채널(/beta/)은 건드리지 않음 — 안정판 캐시에 베타 응답이 섞이지 않게 */
 const U=new URL(r.url);if(U.pathname.includes('/audio/')&&U.pathname.endsWith('.mp3')){e.respondWith(caches.open('gvb-audio-v1').then(c=>c.match(r).then(h=>h||fetch(r).then(n=>{if(n.ok&&n.status==200)c.put(r,n.clone());return n}))));return}
 if(/\/audio\/([a-z]+\/)?manifest\.json$/.test(U.pathname)){e.respondWith(fetch(r).then(n=>{if(n.ok){const cp=n.clone();caches.open('gvb-audio-v1').then(c=>c.put(r,cp))}return n}).catch(()=>caches.open('gvb-audio-v1').then(c=>c.match(r))));return}
 if(r.mode==='navigate'){e.respondWith(fetch(r,{cache:'no-store'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',cp))}return res}).catch(()=>caches.match('./index.html')));return}
 e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}return res}).catch(()=>r.mode==='navigate'?caches.match('./index.html'):undefined)))});
// Android Chrome installed PWA: periodic background sync -> local reminder (no server)
self.addEventListener('periodicsync',e=>{if(e.tag!=='gvb-due')return;e.waitUntil((async()=>{const c=await caches.open('gvb-meta');const r=await c.match('./__due.json');if(!r)return;const d=await r.json();const now=Date.now();const n=(d.dues||[]).filter(x=>x<=now).length;
 if(self.navigator&&self.navigator.setAppBadge)try{n?await self.navigator.setAppBadge(n):await self.navigator.clearAppBadge()}catch(err){}
 if(n>0)await self.registration.showNotification('지리 임용 단어장',{body:`오늘 인출할 카드 ${n}장이 기다려요 🧠`,icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:'gvb-due'})})())});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(cs=>cs.length?cs[0].focus():self.clients.openWindow('./?m=review')))});
