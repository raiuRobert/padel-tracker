/**
 * Keeps the app usable on a court with no signal.
 *
 * There's nothing to sync — every byte of data lives in IndexedDB — so this only has to make sure
 * the app itself still loads. The shell is cached on install and everything else is cached as it's
 * requested, which avoids hard-coding Next's hashed chunk names.
 */
const VERSION = "v1";
const SHELL_CACHE = `padel-shell-${VERSION}`;
const ASSET_CACHE = `padel-assets-${VERSION}`;
const SHELL_ROUTES = ["/", "/roster", "/standings", "/history", "/session/new"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individually, so one failed route doesn't abort the whole install.
      await Promise.allSettled(SHELL_ROUTES.map((route) => cache.add(route)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !key.endsWith(VERSION)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Pages: prefer the network so a deployed update is picked up, fall back to whatever we have.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          return (await caches.match(request)) ?? (await caches.match("/")) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Everything else is content-hashed by Next, so a cache hit is always safe to serve.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(ASSET_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
