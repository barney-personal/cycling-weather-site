#!/usr/bin/env node
// Smoke test: serve the built site as a static directory and assert each page returns 200,
// references the expected runtime fetch of data.json, and ships its entry script bundle.
//
// This is intentionally network-free — no headless browser. We GET each HTML file and verify
// (a) HTTP 200, (b) the expected per-page tag is present (heading id), (c) a hashed
// asset reference exists, and (d) data.json itself returns 200 (the daily cron's contract).
//
// Usage: node scripts/smoke.mjs
//   Run after `npm run build`. Exits non-zero on any failure.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function mimeFor(p) {
  const ext = p.slice(p.lastIndexOf("."));
  return MIME[ext] || "application/octet-stream";
}

async function safeRead(urlPath) {
  // Prevent path traversal; we resolve against repoRoot and ensure the result stays inside.
  const cleaned = normalize(urlPath).replace(/^\/+/, "");
  const target = join(repoRoot, cleaned);
  if (!target.startsWith(repoRoot)) throw new Error("traversal");
  const s = await stat(target);
  if (s.isDirectory()) throw new Error("dir");
  return { body: await readFile(target), path: target };
}

const server = createServer(async (req, res) => {
  try {
    const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const { body, path: p } = await safeRead(urlPath);
    res.writeHead(200, { "content-type": mimeFor(p) });
    res.end(body);
  } catch (e) {
    res.writeHead(404);
    res.end(`not found: ${req.url}`);
  }
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const pages = [
  {
    path: "/index.html",
    expect: [
      'id="hero-mount"',
      'id="rank-body"',
      'id="world-map-mount"',
      'rel="manifest"',
      'rel="apple-touch-icon"',
      'property="og:image"',
    ],
    expectScript: true,
  },
  {
    path: "/history.html",
    expect: ['id="cards"', 'id="actuals-heatmap"', 'rel="manifest"'],
    expectScript: true,
  },
  {
    path: "/methodology.html",
    expect: ["Forecast pipeline", "Caveats", 'rel="manifest"'],
    expectScript: false,
  },
  {
    path: "/destination.html?slug=cyprus",
    expect: ['id="dest-mount"', "data-slug=", 'rel="manifest"'],
    expectScript: true,
  },
  {
    path: "/plan.html",
    expect: [
      'id="plan-form"',
      'id="plan-results"',
      'data-active="plan"',
      'rel="manifest"',
    ],
    expectScript: true,
  },
];

let failures = 0;
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failures += 1;
}

for (const page of pages) {
  console.log(`GET ${page.path}`);
  const res = await fetch(`${base}${page.path}`);
  if (res.status !== 200) {
    fail(`expected 200, got ${res.status}`);
    continue;
  }
  const html = await res.text();
  for (const needle of page.expect) {
    if (!html.includes(needle)) fail(`missing "${needle}"`);
  }
  if (page.expectScript) {
    // Vite splits modules across chunks: the entry bundle (script src=) plus any
    // preloaded chunks (link rel=modulepreload). The data.json reference may live
    // in any of them — verify reachability across the whole graph.
    const entryScripts = [
      ...html.matchAll(/<script[^>]+src="((?:\.\/)?assets\/[^"]+\.js)"/g),
    ].map((m) => m[1]);
    const preloadScripts = [
      ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="((?:\.\/)?assets\/[^"]+\.js)"/g),
    ].map((m) => m[1]);
    const localScripts = [...entryScripts, ...preloadScripts];
    if (localScripts.length === 0) {
      fail("no built local JS bundle reference found (assets/*.js)");
    } else {
      let dataRefSeen = false;
      for (const entry of localScripts) {
        const bundleUrl = `${base}/${entry.replace(/^\.?\/?/, "")}`;
        const bres = await fetch(bundleUrl);
        if (bres.status !== 200) {
          fail(`bundle ${bundleUrl} returned ${bres.status}`);
          continue;
        }
        const bjs = await bres.text();
        if (bjs.includes("data.json")) dataRefSeen = true;
      }
      if (!dataRefSeen) fail(`no chunk in ${page.path} references data.json`);
    }
  }
  const cssMatch = html.match(/<link[^>]+href="([^"]+\.css)"/);
  if (cssMatch) {
    const cssUrl = `${base}/${cssMatch[1].replace(/^\.?\/?/, "")}`;
    const cres = await fetch(cssUrl);
    if (cres.status !== 200) fail(`CSS ${cssUrl} returned ${cres.status}`);
  }
}

// World-map chunk contract (M12) — the world-map module is dynamically
// imported by main.ts only after the homepage map mount intersects the
// viewport. Therefore:
//   1. A world-map chunk MUST be present in assets/ (Vite emits it as a
//      separately-named file because of the dynamic import).
//   2. The homepage HTML must NOT preload or directly reference that chunk
//      via <script src> or <link rel="modulepreload">. If it did, the
//      chunk would ship in the initial paint waterfall, defeating the
//      whole point of the lazy load.
console.log("CHECK world-map lazy chunk shape");
{
  const indexHtml = await (await fetch(`${base}/index.html`)).text();
  const fs = await import("node:fs/promises");
  const assetFiles = await fs.readdir(`${repoRoot}/assets`);
  const worldChunk = assetFiles.find((f) => /^world-map-[A-Za-z0-9_-]+\.js$/.test(f));
  if (!worldChunk) {
    fail("no world-map-*.js chunk found in assets/");
  } else {
    console.log(`  world-map chunk: ${worldChunk}`);
    if (indexHtml.includes(worldChunk)) {
      fail(`world-map chunk ${worldChunk} is referenced in index.html (must be lazy-only)`);
    }
  }
}

// data.json contract — must be at repo root, fetchable, and parse as JSON.
console.log("GET /data.json");
const dataRes = await fetch(`${base}/data.json`);
if (dataRes.status !== 200) {
  fail(`data.json returned ${dataRes.status}`);
} else {
  try {
    const j = await dataRes.json();
    if (!j || typeof j !== "object") fail("data.json did not parse to an object");
    if (!j.latest) fail("data.json missing top-level `latest`");
  } catch (e) {
    fail(`data.json JSON parse failed: ${e.message}`);
  }
}

// PWA contract — manifest, SW, precache JSON, escape hatch, top icons.
const pwaResources = [
  { path: "/manifest.webmanifest", validate: async (r) => {
    const j = await r.json();
    if (!j.name || !j.icons || !Array.isArray(j.icons) || j.icons.length === 0) {
      fail("manifest missing name/icons");
    }
    if (!j.icons.some((i) => i.purpose && i.purpose.includes("maskable"))) {
      fail("manifest missing a maskable icon");
    }
    if (!j.start_url) fail("manifest missing start_url");
  } },
  { path: "/sw.js", validate: async (r) => {
    const text = await r.text();
    if (text.includes("__BUILD_VERSION__")) fail("sw.js still has __BUILD_VERSION__ placeholder");
    if (!text.includes("skipWaiting")) fail("sw.js missing skipWaiting");
    if (!text.includes("clientsClaim")) fail("sw.js missing clientsClaim");
    // Hard exclusion check
    if (!text.includes("data.json")) fail("sw.js doesn't reference data.json (no exclusion?)");
  } },
  { path: "/assets/sw-precache.json", validate: async (r) => {
    const j = await r.json();
    if (!Array.isArray(j.urls) || j.urls.length === 0) fail("sw-precache.json has no urls");
    if (j.urls.some((u) => u.endsWith("/data.json") || u === "data.json")) {
      fail("sw-precache.json contains data.json (must NEVER be precached)");
    }
  } },
  { path: "/unregister-sw.html", validate: async (r) => {
    const text = await r.text();
    if (!text.includes("unregister")) fail("unregister-sw.html missing unregister keyword");
  } },
  { path: "/icons/icon-192.png" },
  { path: "/icons/icon-512.png" },
  { path: "/icons/icon-maskable-512.png" },
  { path: "/icons/apple-touch-icon-180.png" },
  { path: "/og-image.png" },
];
for (const r of pwaResources) {
  console.log(`GET ${r.path}`);
  const res = await fetch(`${base}${r.path}`);
  if (res.status !== 200) {
    fail(`${r.path} returned ${res.status}`);
    continue;
  }
  if (r.validate) await r.validate(res);
}

server.close();

if (failures > 0) {
  console.error(`\n${failures} smoke check failure${failures > 1 ? "s" : ""}`);
  process.exit(1);
} else {
  console.log("\n✓ smoke OK");
}
