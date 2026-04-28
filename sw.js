/* Cycling Weather — service worker (template)
 *
 * The post-build step `scripts/build-sw-precache.mjs` copies this file to
 * `sw.js` at the repo root and replaces the build-version placeholder
 * (literal string BUILD-VERSION-PLACEHOLDER on the next const line) with a
 * fresh timestamp. Each rebuild therefore changes the SW byte content, which
 * the browser detects and uses to install + activate the new SW.
 *
 * Strategy (mandatory per plan M11):
 *   - skipWaiting() + clientsClaim() so a new SW activates immediately.
 *   - Precache only the app shell (HTML/CSS/JS bundles + brand icons).
 *   - data.json is NEVER intercepted (return without responding so the
 *     browser handles it natively, with whatever cache: hint the page set).
 *     This means a stuck SW can't ever serve yesterday's data.
 *   - Old caches (different VERSION) are deleted on activate.
 *   - Navigation requests use network-first with a cache fallback so the
 *     site is installable + usable offline (data-driven sections show an
 *     empty state when the page can't load data.json).
 */

const VERSION = "2026-04-28T11-58-54-139Z";
const SHELL_CACHE = `cw-shell-${VERSION}`;
const PRECACHE_MANIFEST = "./assets/sw-precache.json";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch(PRECACHE_MANIFEST, { cache: "no-store" });
        if (res && res.ok) {
          const list = await res.json();
          const urls = Array.isArray(list && list.urls) ? Array.from(new Set(list.urls)) : [];
          const cache = await caches.open(SHELL_CACHE);
          await Promise.all(
            urls.map(async (u) => {
              try {
                const r = await fetch(u, { cache: "no-store" });
                if (r && r.ok) await cache.put(u, r.clone());
              } catch (_) {
                // Tolerate missing/broken individual resources — the SW still
                // installs; runtime will lazily populate the cache for them.
              }
            }),
          );
        }
      } catch (_) {
        // Network failure during install (offline first-load) is fine —
        // the SW installs; nothing is precached; runtime cache fills as
        // pages are visited.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("cw-shell-") && k !== SHELL_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  // Allow the page to force-skipWaiting (used by future update-toast UX).
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Hard exclusion: never intercept data.json. The page must always reach
  // the network for it; offline → fetch rejects → page shows offline state.
  if (url.pathname === "/data.json" || url.pathname.endsWith("/data.json")) return;

  // Never intercept the SW's own update check or the precache manifest.
  if (
    url.pathname.endsWith("/sw.js") ||
    url.pathname.endsWith("/assets/sw-precache.json")
  ) {
    return;
  }

  // Navigations: network-first → cache fallback → /index.html shell fallback.
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(req, res.clone()).catch(() => {});
          }
          return res;
        } catch (_) {
          const cached = await caches.match(req, { ignoreSearch: true });
          if (cached) return cached;
          const indexFallback =
            (await caches.match("./index.html")) || (await caches.match("/index.html"));
          if (indexFallback) return indexFallback;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title><p>You appear to be offline and this page isn\'t cached.</p>',
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
    return;
  }

  // Same-origin assets (CSS, JS, fonts, images): cache-first, network-fallback.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok && res.type === "basic") {
          const cache = await caches.open(SHELL_CACHE);
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      } catch (e) {
        // Re-throw so the browser surfaces a network error to the page;
        // pages should already handle missing optional assets gracefully.
        throw e;
      }
    })(),
  );
});
