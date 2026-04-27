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
npm run dev      # vite dev server on http://localhost:5173
npm run build    # emits index.html / history.html / methodology.html / assets/* into repo root
npm run preview  # serves the built output locally
npm run smoke    # static-server smoke test against built output
npm run check    # tsc --noEmit + biome check
npm run format   # biome format --write
```

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
  main.ts            homepage logic
  history.ts         history page logic
  style.css          shared stylesheet
  types.d.ts         ambient TS declarations
scripts/
  smoke.mjs          static-server smoke test
data.json            daily-regenerated data (committed by cron, never hashed)
index.html, history.html, methodology.html, assets/   built artefacts (committed)
package.json, tsconfig.json, vite.config.ts, biome.json
```

## Conventions

- Do not commit `node_modules/`. Do commit built artefacts at the repo root.
- `data.json` schema can evolve, but loaders must default missing fields gracefully — see
  `M2` of the implementation plan: there is a ~24h window where new code will load yesterday's
  `data.json`.
- d3 v7 is currently loaded from a CDN script tag in each HTML head. M2/M5 will migrate to
  pinned ESM sub-packages.
