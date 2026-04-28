# cycling-weather-site

Daily 14-day cycling-weather outlook + reliability history. Static site built with Vite +
TypeScript, served by GitHub Pages from `master`.

## How it deploys

- Source lives in `src/` (HTML, TS modules, CSS).
- `npm run build` emits the static site directly into the **repo root** (`index.html`,
  `history.html`, `methodology.html`, plus a hashed `assets/` directory).
- GitHub Pages serves the repo root as-is — there is no Actions deploy.
- The daily cron (`scripts/cycling_weather_site_refresh.sh` in the orchestrator scripts repo)
  regenerates `data.json` at the repo root and pushes; it does **not** run `npm install`/
  `npm run build`. Therefore built artefacts must be committed.
- `data.json` is fetched at runtime by a relative URL and is never hashed/renamed by Vite.

## Local development

```bash
npm install
npm run dev          # vite dev server on http://localhost:5173
npm run build        # vite build + post-build SW precache stamp (writes sw.js + assets/sw-precache.json)
npm run preview      # serves the built output locally
npm run smoke        # static-server smoke test against built output (HTML + data.json + PWA contracts)
npm run check        # tsc --noEmit + biome check + unit tests (loader + qualify + thresholds)
npm run test         # full gate: smoke → unit → e2e (Playwright + axe + visual) → bundle budget
npm run test:e2e     # Playwright suite alone (smoke / viz / a11y / visual snapshots)
npm run test:perf    # bundle-size + Lighthouse availability check
npm run test:cron    # simulate the daily cron path with SITE_DIR override (read-only)
npm run format       # biome format --write
npm run build:brand  # one-shot: regenerate icons/ and og-image.png from src/assets/brand/*.svg (needs ImageMagick)
```

### Test suite reproducibility

The Playwright e2e tests (`smoke.spec.mjs`, `viz.spec.mjs`, `a11y.spec.mjs`,
`visual.spec.mjs`) launch headless chromium from the local Playwright cache
(pinned to **chromium-1217** at `~/.cache/ms-playwright/`). Visual baselines
in `tests/visual/` were captured at this revision; refresh them with
`CW_UPDATE_VISUAL=1 npm run test:visual` after deliberate UI changes.

The visual baseline matrix covers each of the five entry pages at:

- portrait widths **320 / 360 / 768 / 1280 / 1440 / 1920**,
- a mobile-landscape viewport **812 × 375** (typical iPhone landscape),
- two desktop variants at 1280 — **reduced-motion** (`-rmotion.png`) and
  **prefers-contrast: more** (`-hcontrast.png`).

Comparison uses a 5% deflated-byte budget which absorbs daily timestamp
drift in hero copy + sub-pixel font shifts within the same chromium
revision; deliberate visual changes blow the budget and need
`CW_UPDATE_VISUAL=1 npm run test:visual` to refresh. Commit the refreshed
PNGs in the same change as the visual edit so reviewers can see what
moved.

The static server in `tests/_lib/server.mjs` binds to `127.0.0.1` (NOT
`localhost`) because `register-sw.ts` skips localhost — testing the PWA
layer requires a non-localhost loopback address.

After running `npm run build` you can also serve with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Repo layout

```
src/
  index.html         entry — Forward: stack-ranked 14-day outlook
  history.html       entry — predictions vs reality
  methodology.html   entry — methodology copy
  destination.html   entry — per-destination depth page
  plan.html          entry — trip planner
  main.ts            homepage logic
  history.ts         history page logic
  style.css          shared stylesheet
  types.d.ts         ambient TS declarations
  assets/brand/      hand-built icon + OG SVGs (rasterised by scripts/generate-brand.mjs)
  components/        UI components (header, hero, ranking, threshold-dial, register-sw, …)
  lib/               data + qualify + thresholds libraries
  styles/            tokens.css + typography.css + base.css
scripts/
  smoke.mjs              static-server smoke test (HTML + data.json + PWA contracts)
  generate-brand.mjs     one-shot: SVG → PNG icons + OG image (uses ImageMagick `convert`)
  sw-source.js           service-worker template (build-sw-precache.mjs stamps the version)
  build-sw-precache.mjs  post-build: writes sw.js + assets/sw-precache.json
data.json            daily-regenerated data (committed by cron, never hashed)
manifest.webmanifest PWA manifest (root)
sw.js                service worker (rebuilt every npm run build)
unregister-sw.html   escape hatch — unregister SW + clear caches
icons/, og-image.png brand assets (regenerate via npm run build:brand)
index.html, history.html, methodology.html, destination.html, plan.html, assets/   built artefacts (committed)
package.json, tsconfig.json, vite.config.ts, biome.json
```

## Conventions

- Do not commit `node_modules/`. Do commit built artefacts at the repo root.
- `data.json` schema can evolve, but loaders must default missing fields gracefully — there is
  a ~24h window where new code will load yesterday's `data.json`.
- d3 v7 ships as ESM sub-packages, bundled by Vite — no CDN.

## PWA layer

The site installs as a standalone app on iOS/Android.

- `manifest.webmanifest` (root) advertises icons (`./icons/icon-{192,512}.png`,
  `icon-maskable-512.png`, `icon-monochrome-512.png`) and `start_url`.
- `sw.js` (root) is generated each build by `scripts/build-sw-precache.mjs` from
  `scripts/sw-source.js`. The post-build step also writes `assets/sw-precache.json` listing
  every shell asset referenced by the just-built HTMLs (no glob — globbing would pin every
  superseded hashed bundle).
- The SW uses `skipWaiting()` + `clientsClaim()` so a new deploy activates immediately.
- `data.json` is **never** intercepted by the SW or precached. The page fetches it with
  `cache: "no-store"`, so a stuck SW can never serve yesterday's data.
- Brand source SVGs live in `src/assets/brand/`. Run `npm run build:brand` to regenerate
  the committed PNGs after editing them (requires `convert` from ImageMagick on PATH).

### Escape hatch

If a stuck SW shows stale content, navigate to `/unregister-sw.html` and click the button.
That unregisters all SWs for this origin and clears their caches. The page is committed at
the repo root and excluded from the web manifest's start_url.

### Updating brand assets

```bash
# edit src/assets/brand/{icon,icon-maskable,icon-monochrome,og-image}.svg
npm run build:brand   # rasterises into icons/ + og-image.png
git add icons og-image.png src/assets/brand
```
