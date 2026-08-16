const CACHE='queuehub-shell-v7-modular';
const CORE=[
  './',
  './index.html',
  './src/design-system/legacy/base.css',
  './src/design-system/legacy/user-v4.css',
  './src/admin/styles/staff-v4.css',
  './src/design-system/user/minimal-v5.css',
  './src/design-system/theme/adaptive-gradient-v6.css',
  './src/design-system/theme/system-theme.js',
  './src/core/legacy/app.js',
  './src/admin/legacy/features-admin.js',
  './src/user/legacy/user-v4.js',
  './src/admin/legacy/staff-v4.js',
  './src/user/legacy/minimal-v5.js',
  './manifest.webmanifest'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const request=event.request;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
      return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>{
    const network=fetch(request).then(response=>{
      if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
      return response;
    }).catch(()=>cached);
    return cached||network;
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'./#/my-orders';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    for(const client of clients){if('focus'in client){client.navigate(target);return client.focus();}}
    return self.clients.openWindow(target);
  }));
});
