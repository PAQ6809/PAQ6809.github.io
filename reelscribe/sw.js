const CACHE_NAME = "reelscribe-shell-v8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./supported-platforms.html",
  "./styles.css",
  "./ui-polish.css",
  "./format-compat.js",
  "./app.js",
  "./capture.js",
  "./traditional.js",
  "./instagram-direct.js",
  "./universal-link.js",
  "./ui.js",
  "./share.js",
  "./worker.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./social-card.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});