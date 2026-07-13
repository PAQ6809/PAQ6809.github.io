const CACHE_NAME = "reelscribe-shell-v12";
const APP_SHELL = [
  "./",
  "./index.html",
  "./supported-platforms.html",
  "./styles.css",
  "./ui-polish.css",
  "./format-compat.js",
  "./speech-enhancer.js",
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
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: "REELSCRIBE_UPDATE_READY", version: CACHE_NAME }));
  })());
});

async function cacheResponse(request, response) {
  if (response?.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    return await cacheResponse(request, await fetch(request, { cache: "no-store" }));
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw new Error("Network unavailable and no cached response exists.");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  return cacheResponse(request, await fetch(request));
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const destination = event.request.destination;
  const critical = event.request.mode === "navigate"
    || destination === "document"
    || destination === "script"
    || destination === "style"
    || destination === "worker"
    || url.pathname.endsWith(".webmanifest");

  event.respondWith(critical ? networkFirst(event.request) : cacheFirst(event.request));
});