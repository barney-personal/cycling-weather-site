// Register the service worker after the page has loaded.
//
// Deferred until "load" so SW registration never blocks first paint or
// first interaction. SW activation does not affect rendering — the SW is
// for offline + installable-app polish, not for the critical path.
//
// Strategy alignment with sw-source.js:
//   - SW filename is fixed at "./sw.js"; build-time version stamp lives
//     INSIDE the SW (a `const VERSION = "…"` that changes each build).
//     Browser detects byte change → installs new SW → skipWaiting +
//     clientsClaim activate it immediately.
//   - We never call .update() or unregister() here. The escape hatch lives
//     at /unregister-sw.html.

export function registerServiceWorker(swUrl = "./sw.js"): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  // Don't register from the unregister-sw page itself, to avoid racing the
  // unregistration the user just triggered.
  if (location.pathname.endsWith("/unregister-sw.html")) return;
  // Skip on dev origins served by `vite` — the dev server doesn't emit sw.js.
  if (location.protocol === "http:" && location.hostname === "localhost") return;

  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker.register(swUrl, { scope: "./" }).catch((err) => {
        console.warn("SW registration failed", err);
      });
    },
    { once: true },
  );
}
