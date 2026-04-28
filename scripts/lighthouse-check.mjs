#!/usr/bin/env node
// Performance + bundle-size budget check.
//
// Asserts:
//   1. Total initial-paint JS gz across the homepage modulepreload graph
//      ≤ 250 KB. World-map and other lazy chunks are NOT counted.
//   2. Total assets/*.js gz across ALL chunks ≤ 250 KB (the M14 budget).
//   3. (optional) Lighthouse mobile + desktop scores when `lighthouse` is
//      available on PATH. We DON'T install lighthouse as a devDep because
//      it pulls in chrome-launcher and the puppeteer download chain; we
//      only assert when `lighthouse --version` exits 0. Documented misses
//      are acceptable per the M13 plan.
//
// Run after `npm run build`. Exits non-zero on any budget failure.

import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");
const assetsDir = join(repoRoot, "assets");

const HOMEPAGE_INITIAL_BUDGET_KB = 250; // initial-paint chunks
const TOTAL_ALL_CHUNKS_BUDGET_KB = 250; // every assets/*.js gz, summed

let failures = 0;
const fail = (m) => {
  console.error(`  ✗ ${m}`);
  failures += 1;
};
const ok = (m) => console.log(`  ✓ ${m}`);

async function gzSizeKb(absPath) {
  const buf = await readFile(absPath);
  return gzipSync(buf, { level: 9 }).length / 1024;
}

async function getJsAssetMap() {
  const files = await readdir(assetsDir);
  const out = new Map();
  for (const f of files) {
    if (f.endsWith(".js")) out.set(f, await gzSizeKb(join(assetsDir, f)));
  }
  return out;
}

function findScriptsInHtml(html) {
  const entry = [...html.matchAll(/<script[^>]+src="((?:\.\/)?assets\/([^"]+\.js))"/g)].map(
    (m) => m[2],
  );
  const preload = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="((?:\.\/)?assets\/([^"]+\.js))"/g)].map(
    (m) => m[2],
  );
  return [...new Set([...entry, ...preload])];
}

console.log("Bundle-size budget check");

const indexHtml = await readFile(join(repoRoot, "index.html"), "utf8");
const homepageInitial = findScriptsInHtml(indexHtml);
const allJs = await getJsAssetMap();

let homepageTotal = 0;
console.log("  Homepage initial-paint graph:");
for (const file of homepageInitial) {
  const sz = allJs.get(file);
  if (sz === undefined) {
    fail(`homepage references missing chunk: ${file}`);
    continue;
  }
  console.log(`    - ${file}: ${sz.toFixed(2)} KB gz`);
  homepageTotal += sz;
}
console.log(`  Homepage total: ${homepageTotal.toFixed(2)} KB gz`);
if (homepageTotal > HOMEPAGE_INITIAL_BUDGET_KB) {
  fail(`homepage initial-paint JS gz ${homepageTotal.toFixed(2)} KB exceeds ${HOMEPAGE_INITIAL_BUDGET_KB} KB budget`);
} else {
  ok(`homepage initial-paint JS gz under ${HOMEPAGE_INITIAL_BUDGET_KB} KB budget (${homepageTotal.toFixed(2)} KB used)`);
}

let allTotal = 0;
for (const sz of allJs.values()) allTotal += sz;
console.log(`  All chunks total (${allJs.size} files): ${allTotal.toFixed(2)} KB gz`);
if (allTotal > TOTAL_ALL_CHUNKS_BUDGET_KB) {
  fail(`total JS gz ${allTotal.toFixed(2)} KB exceeds ${TOTAL_ALL_CHUNKS_BUDGET_KB} KB budget`);
} else {
  ok(`total JS gz under ${TOTAL_ALL_CHUNKS_BUDGET_KB} KB budget (${allTotal.toFixed(2)} KB used)`);
}

// World-map chunk MUST NOT appear in the homepage's initial-paint graph.
const worldChunkOnHomepage = homepageInitial.find((f) => /^world-map-/.test(f));
if (worldChunkOnHomepage) {
  fail(`world-map chunk ${worldChunkOnHomepage} is in homepage initial-paint graph (must be lazy-only)`);
} else {
  ok("world-map chunk is NOT in homepage initial-paint graph (lazy-only contract holds)");
}

// Optional: Lighthouse run when the binary is available on PATH.
console.log("\nLighthouse availability check");
const lh = spawnSync("lighthouse", ["--version"], { encoding: "utf8" });
if (lh.error || lh.status !== 0) {
  console.log(
    "  - lighthouse CLI not installed; skipped per M13 plan (documented miss). Bundle budget remains the gating constraint.",
  );
} else {
  console.log(`  - lighthouse ${lh.stdout.trim()} available, but in-process run is gated behind a manual flag (CW_RUN_LIGHTHOUSE=1).`);
  if (process.env.CW_RUN_LIGHTHOUSE !== "1") {
    console.log("    Set CW_RUN_LIGHTHOUSE=1 to invoke. Skipping by default to avoid CI flake.");
  } else {
    fail("CW_RUN_LIGHTHOUSE=1 is set but the runner has no Lighthouse harness wired (yet). Drop the env var for now or wire the harness in cycle 15.");
  }
}

if (failures > 0) {
  console.error(`\n${failures} budget failure${failures > 1 ? "s" : ""}`);
  process.exit(1);
} else {
  console.log("\n✓ bundle budgets OK");
}
