/**
 * Harmony PWA Service Worker
 * Minimal app-shell strategy for senior users on flaky mobile networks.
 *
 * Strategy:
 *  - Static assets (icons, fonts): cache-first, fall back to network
 *  - Navigation requests: network-first with cache fallback (offline page)
 *  - API requests: network-only — never cache (auth-sensitive, user-specific)
 *
 * No Workbox / no plugin so this stays compatible with Next.js 16 + Turbopack
 * and the WebView wrapper we'll eventually ship.
 */

const CACHE_VERSION = "harmony-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

// Pre-cache the shell so first offline visit still shows something.
const SHELL = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;
  // Never cache POST/PUT/etc
  if (request.method !== "GET") return;

  // Never cache auth-sensitive APIs or supabase calls
  if (url.pathname.startsWith("/api/")) return;

  // Navigation — network first, fall back to cached page or offline shell
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          if (offline) return offline;
          return new Response(
            "<h1>오프라인 상태예요</h1><p>인터넷 연결을 확인해주세요.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
          );
        }
      })()
    );
    return;
  }

  // Static assets — cache first
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            // Only cache successful, basic responses
            if (response.ok && response.type === "basic") {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});
