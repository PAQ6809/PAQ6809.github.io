const CACHE = 'educraft-v8-20260718-chatgpt-app';
const CORE = ['./','./index.html','./styles.css','./community.css?v=20260718-1','./chatgpt.css?v=20260718-1','./mobile-overlay-fix.css?v=20260718-2','./app-core.js','./app-library.js','./app-editor.js','./app-sync.js','./app-account.js?v=20260718-1','./app-styles.js?v=20260718-1','./app-chatgpt.js?v=20260718-1','./mobile-overlay-fix.js?v=20260718-3','./manifest.webmanifest','./favicon.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === location.origin && url.pathname.startsWith('/educraft/')) {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
  }
});
