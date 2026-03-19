// /public/sw.js — boxboxboard Service Worker

const CACHE_NAME = "boxboxboard-v1";

// Assets to cache on install
const PRECACHE_URLS = [
  "/",
  "/app",
  "/manifest.json",
  "/favicon.ico",
  "/icon-192.png",
  "/icon.png",
];

// Install — precache key assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  // API routes — network only, no cache
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (
          response.ok &&
          (event.request.url.includes("/_next/static/") ||
            event.request.url.includes("/fonts.googleapis") ||
            event.request.url.includes("/fonts.gstatic"))
        ) {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback — serve cached version if available
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, serve the app shell
          if (event.request.mode === "navigate") {
            return caches.match("/app") ?? caches.match("/");
          }
          return new Response("Offline", { status: 503 });
        });
      }),
  );
});
