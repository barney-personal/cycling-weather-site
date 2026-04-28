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
  **prefers-contrast: more** (`-hcontrast.png`),
- one stale-banner state at 1280 — `index-1280-stale.png`, captured via the
  `?stale=1` debug query param so the banner snapshots deterministically
  regardless of `data.json.generated_at`,
- two calendar-view states — `index-1280-calendar.png` (full grid) and
  `index-320-calendar.png` (sticky-column horizontal-scroll on small phones),
  captured via `?view=calendar` so the lazy-loaded calendar chunk is in scope
  for visual regression.

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
- `data.json` schema v2 (M4) adds `hourly` arrays to each `daily[]` entry — 15 ride-hour
  entries (06:00–20:00) per day with `{time, temp, precip, precip_prob, wind, code}`. The
  loader treats missing `hourly` as `[]` so v1 data renders without sparklines. The cron
  pipeline (`euro_cycling_weather.py`) now fetches hourly data from Open-Meteo; the build
  script (`cycling_weather_data_build.py`) passes it through.
- `data.json` schema v3 (M5) adds a top-level `climatology` block — a per-destination
  same-week 5-year rollup (median + P10/P90 temp, median precip) used to render the
  "is this week unusual?" context line on the hero and destination pages. The cron-side
  fetcher is `cycling_weather_climatology.py` (separate from the build aggregator so the
  build stays network-free). Loader returns `null` on missing/malformed; renderer is
  silent when null.
- `data.json` schema v4 (M7) adds a top-level `model_spread` block — per-destination
  per-day envelope `{temp_min/max/spread_c, prob_min/max/spread_pct, models_count}`
  across three independent global forecast models (ECMWF, GFS, ICON). The cron-side
  fetcher is `cycling_weather_model_spread.py` (separate script, daily TTL, ~22 HTTP
  calls per cron cycle). The destination-page confidence chip fires when any of the
  next 7 days has temp_spread ≥ 3°C OR precip-prob spread ≥ 25% — empirically ~13.6%
  of (destination, day) pairs trip this on a typical week. Loader returns `null` on
  missing/malformed; chip is silent when the lead window is confident.
- d3 v7 ships as ESM sub-packages, bundled by Vite — no CDN.
- Stale-data banner (homepage): when `data.json.generated_at` is more than 36 hours old,
  the homepage shows a `role="status"` banner above the hero so users aren't quietly
  shown out-of-date forecasts. Force-trigger it with `?stale=1` (used by the visual snapshot
  suite). See `src/components/stale-banner.ts`; threshold + parsing rules covered by
  `tests/stale-banner.spec.ts`.
- Calendar view (M9): the homepage stack-ranking section ships two layouts behind a tablist
  toggle in `.ranking-toolbar`. Default is the existing **table** (cards on mobile, table on
  ≥1024px). The **calendar** view renders a grid where rows = destinations (in qualifier rank)
  and columns = the next 14 days, with the leftmost destination column sticky for horizontal
  scroll on narrow viewports. Cells reuse the strip-cell encoding (temp gradient + rain dots
  + wind hatch + qualifier outline) so the visual vocabulary is identical to the table strip.
  Toggle state persists in the URL (`?view=calendar`); reload round-trips. The calendar bytes
  ship in a separate `calendar-*.js` chunk loaded via `await import("./components/calendar")`,
  so the homepage initial-paint graph is unaffected when the user stays on the table view.
  Keyboard: when focus is inside the grid, ArrowLeft/Right move within a row, ArrowUp/Down
  move within a column, Home/End jump to the row's first/last day, Ctrl+Home/Ctrl+End jump
  to the top-left/bottom-right cell.
- Personal calibration profile (M6): the threshold dial exposes a "Calibrate from a profile"
  CTA that opens a 5-question modal (heat preference, rain tolerance, max wind, sky, stringency).
  Answers map deterministically to a `DialState` via `src/lib/profile.ts` (pure function,
  covered by `tests/profile.spec.ts`). The picker dispatches a `cwprofile:apply` window event
  carrying the resolved state; the threshold dial subscribes and runs its existing `commit()`
  pipeline so storage + URL + the standard `cwthresholds:change` event all update without
  duplicate plumbing. Profile is persisted under `cw:profile:v1` (versioned key — schema bumps
  ignore unknown shapes safely). "Reset" clears the storage key and applies the canonical
  cycling-comfort defaults.
- Build-artefact hygiene: every `assets/*.{js,css}` file in the repo MUST be reachable from
  the live import graph (entry HTMLs at HEAD → `<script>`/`<link>` refs → recursive
  dynamic-import refs inside the chunks themselves) or from `assets/sw-precache.json`. When
  a rebuild produces new content-hashed bundles, `git rm` every superseded bundle in the
  same commit. Two verification loops gate this:
  ```bash
  # M14 loop: every <script>/<link> ref in HEAD HTML is a tracked file
  for page in index destination history methodology plan; do
    for f in $(git show HEAD:$page.html | grep -oE 'assets/[A-Za-z0-9_-]+\.(js|css)'); do
      git ls-files --error-unmatch "$f" >/dev/null 2>&1 || echo "UNTRACKED: $f"
    done
  done
  # M15 loop: total chunk count stays low — bundle-budget script enumerates assets/*.js
  npm run test:perf
  ```
  The `lighthouse-check.mjs` "All chunks total" gate sums every `assets/*.js` on disk
  regardless of whether it's referenced; orphaned bundles eat the 250 KB total-JS budget.
- CSS undefined-token guard (M17): `npm run test:css-tokens` (also chained into `npm test`)
  scans every `assets/*.css` file, builds the union of `--token-name:` declarations, and
  fails the run if any `var(--token-name)` reference points at a token that isn't defined
  anywhere. Catches the recurring class of regressions where a CSS edit references a
  non-existent token — under the CSS spec the property silently becomes
  invalid-at-computed-value-time and inherits the parent value, so visual baselines often
  miss it. Run after `npm run build`; expects fresh bundles in `assets/`.

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
