// Offline support for the currency converter.
// - Pages: network first, fall back to the last cached copy (app opens offline).
// - /_next/static/*: cache first (content-hashed, immutable).
// - /api/rates: network first, fall back to the last cached rates.
// - Everything else same-origin (icons, manifest, fonts): stale-while-revalidate.
const VERSION = "v1";
const CACHE = `currency-${VERSION}`;
const PRECACHE = ["/", "/manifest.webmanifest", "/icon", "/apple-icon"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallbackUrl ?? request, response.clone());
    return response;
  } catch (err) {
    const cached = (await cache.match(fallbackUrl ?? request)) ?? (fallbackUrl ? undefined : await cache.match("/"));
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached ?? network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, url.pathname === "/" ? "/" : undefined));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname === "/api/rates") {
    event.respondWith(networkFirst(request, "/api/rates"));
  } else if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    return; // health checks, dev/HMR, RSC data: always live
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
