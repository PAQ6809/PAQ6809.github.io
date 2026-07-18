const CACHE = 'educraft-v5-20260718-overlay-fix';
const CORE = ['./','./index.html','./styles.css','./mobile-overlay-fix.css?v=20260718-1','./app-core.js','./app-library.js','./app-editor.js','./app-sync.js','./mobile-overlay-fix.js?v=20260718-1','./manifest.webmanifest','./favicon.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === location.origin && url.pathname.startsWith('/educraft/')) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(c=>c.put(event.request,copy)); return response; }).catch(() => caches.match('./index.html'))));
  }
});
