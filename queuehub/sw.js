const CACHE='queuehub-shell-v1';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return res}).catch(()=>caches.match('./index.html'))))});
self.addEventListener('notificationclick',event=>{event.notification.close();const target=event.notification.data?.url||'./#/my-orders';event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{for(const client of clients){if('focus'in client){client.navigate(target);return client.focus()}}return self.clients.openWindow(target)}))});
