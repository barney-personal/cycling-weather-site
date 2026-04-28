#!/usr/bin/env node
// Post-build SW step. Reads each built HTML page, harvests every <script src>
// and <link href> reference into a precache manifest, and writes:
//
//   - assets/sw-precache.json  : { version, urls: [...] }
//   - sw.js                    : copy of scripts/sw-source.js with __BUILD_VERSION__
//                                replaced by the same version stamp.
//
// We DELIBERATELY do NOT precache via a glob (e.g. assets/*.js) — every
// rebuild produces fresh hashed bundles, so a glob would pin every superseded
// bundle that the redesign has accumulated. Parsing the just-built HTMLs gives
// us the exact set of resources the live site references.
//
// data.json is NEVER added to the manifest — the SW must always go to the
// network for it. The hard exclusion in scripts/sw-source.js makes this
// double-safe.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");
const swSource = resolve(here, "sw-source.js");

// The 5 entry HTMLs (must mirror vite.config.ts inputs).
const PAGES = ["index.html", "history.html", "methodology.html", "destination.html", "plan.html"];

// Top-level shell resources that aren't referenced from <link>/<script>.
// Brand icons + favicon make the offline-installed app feel real, and
// unregister-sw.html is the documented escape hatch (must work offline).
const ALWAYS_PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon-monochrome-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/favicon-32.png",
  "./icons/favicon.ico",
];

function harvest(html) {
  const urls = new Set();
  // <script src="…">
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
    urls.add(m[1]);
  }
  // <link rel="(stylesheet|modulepreload|preload|icon|apple-touch-icon|mask-icon|manifest)" href="…">
  for (const m of html.matchAll(/<link[^>]+href=["']([^"']+)["']/g)) {
    urls.add(m[1]);
  }
  return urls;
}

function shouldInclude(url) {
  if (!url) return false;
  if (url.startsWith("data:")) return false;
  if (url.startsWith("http://") || url.startsWith("https://")) return false; // skip CDN refs (we have none today)
  if (url.startsWith("//")) return false;
  // Hard exclusion: data.json must never be precached.
  if (url === "data.json" || url === "./data.json" || url.endsWith("/data.json")) {
    return false;
  }
  return true;
}

function normalise(url) {
  // Strip leading "./" for cache-key consistency. The SW matches by full URL,
  // so we keep the form Vite emits (./assets/foo-hash.js) for runtime parity.
  return url;
}

const allUrls = new Set();

for (const page of PAGES) {
  const html = readFileSync(resolve(repoRoot, page), "utf8");
  // Add the page itself.
  allUrls.add(`./${page}`);
  for (const u of harvest(html)) {
    if (shouldInclude(u)) allUrls.add(normalise(u));
  }
}

for (const u of ALWAYS_PRECACHE) {
  if (shouldInclude(u) || u === "./" || u.endsWith(".html") || u.endsWith(".webmanifest")) {
    allUrls.add(u);
  }
}

const urls = Array.from(allUrls).sort();
const version = process.env.SW_BUILD_VERSION || new Date().toISOString().replace(/[:.]/g, "-");

const manifestPath = resolve(repoRoot, "assets/sw-precache.json");
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify({ version, urls }, null, 2)}\n`);

const swTemplate = readFileSync(swSource, "utf8");
// Replace ONLY the const declaration's placeholder, never the comment that
// names it — keeps the comment readable across rebuilds.
const swOut = swTemplate.replace(
  /const VERSION = "BUILD-VERSION-PLACEHOLDER";/,
  `const VERSION = ${JSON.stringify(version)};`,
);
if (swOut === swTemplate) {
  throw new Error("sw-source.js missing the BUILD-VERSION-PLACEHOLDER const — refusing to write an unstamped sw.js");
}
writeFileSync(resolve(repoRoot, "sw.js"), swOut);

console.log(`✓ sw-precache: ${urls.length} URLs`);
console.log(`✓ sw.js: VERSION=${version}`);
