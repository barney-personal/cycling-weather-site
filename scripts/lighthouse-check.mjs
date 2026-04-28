#!/usr/bin/env node
// Performance + Lighthouse + bundle-size budget check.
//
// Asserts:
//   1. Total initial-paint JS gz across the homepage modulepreload graph
//      ≤ 250 KB. World-map and other lazy chunks are NOT counted.
//   2. Total assets/*.js gz across ALL chunks ≤ 250 KB (the M14 budget).
//   3. World-map chunk MUST NOT appear in the homepage's initial-paint
//      graph (lazy-only contract).
//   4. Lighthouse mobile score gates: perf ≥ 95, a11y = 100,
//      best-practices ≥ 95, SEO ≥ 95.
//
// Lighthouse runs against playwright's chromium binary launched with
// --remote-debugging-port. No system-wide Chrome required — works in
// any environment where playwright's chromium is installed (which is
// every CI image already running our Playwright tests).
//
// Set CW_SKIP_LIGHTHOUSE=1 to skip the Lighthouse leg only (e.g. when
// the host OS is missing libs that Chromium's full DOM probe needs but
// playwright's headless probe tolerates). Bundle budget always runs.
//
// Run after `npm run build`. Exits non-zero on any budget failure.

import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");
const assetsDir = join(repoRoot, "assets");

const HOMEPAGE_INITIAL_BUDGET_KB = 250;
const TOTAL_ALL_CHUNKS_BUDGET_KB = 250;

// Workflow target thresholds (the DoD endpoint M13 must hit):
//   perf ≥ 95, a11y = 100, best-practices ≥ 95, SEO ≥ 95.
//
// Current floor (M12 entry point):
//   perf 50: today the homepage scores ~54 mobile under simulated 4G,
//   dragged down by LCP (5.4s) + CLS (0.62) — both font-loading + lazy
//   chart-mount layout-shift artefacts. M13 will raise perf threshold
//   to 95 after those root causes are fixed; the perf=50 floor here is
//   a regression gate, NOT the target. Override with CW_LH_PERF_FLOOR.
//
// a11y/best-practices/SEO already hit the workflow target — those
// thresholds match the DoD. They're ratchets: never lower.
const LH_THRESHOLDS = {
  performance: Number(process.env.CW_LH_PERF_FLOOR ?? 50),
  accessibility: 100,
  "best-practices": 95,
  seo: 95,
};

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

// ---- 1-3: bundle budget ---------------------------------------------------
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

const worldChunkOnHomepage = homepageInitial.find((f) => /^world-map-/.test(f));
if (worldChunkOnHomepage) {
  fail(`world-map chunk ${worldChunkOnHomepage} is in homepage initial-paint graph (must be lazy-only)`);
} else {
  ok("world-map chunk is NOT in homepage initial-paint graph (lazy-only contract holds)");
}

// ---- 4: Lighthouse mobile gate -------------------------------------------
console.log("\nLighthouse mobile-form-factor gate");

if (process.env.CW_SKIP_LIGHTHOUSE === "1") {
  console.log("  - CW_SKIP_LIGHTHOUSE=1 set — skipping Lighthouse leg");
  console.log(
    "    (the gate is mandatory by default; set to 1 only on hosts where chromium can't reach a stable rendering state — e.g. missing GPU/font libs).",
  );
} else {
  await runLighthouse();
}

if (failures > 0) {
  console.error(`\n${failures} budget failure${failures > 1 ? "s" : ""}`);
  process.exit(1);
} else {
  console.log("\n✓ all budgets OK");
}

// ---- helpers --------------------------------------------------------------

async function pathExists(p) {
  try {
    await readFile(p);
    return true;
  } catch {
    return false;
  }
}

async function runLighthouse() {
  // Spin up a tiny static server pointing at the repo root.
  const { startTestServer } = await import("../tests/_lib/server.mjs");
  const server = await startTestServer();
  const url = `${server.base}/index.html`;

  // Resolve playwright's chromium-headless-shell binary. The full
  // chromium binary needs a Crashpad database directory we don't manage;
  // the headless-shell variant is the build chrome-launcher would use
  // anyway, and it's already on disk because playwright downloaded it.
  // playwright.chromium.executablePath() points at the full chromium —
  // we derive the headless-shell sibling path.
  const fullChromiumPath = chromium.executablePath();
  // Path looks like:
  //   <cache>/chromium-NNN/chrome-linux64/chrome
  // and the headless-shell sibling is at:
  //   <cache>/chromium_headless_shell-NNN/chrome-headless-shell-linux64/chrome-headless-shell
  let chromePath = fullChromiumPath
    .replace(/chromium-(\d+)/, "chromium_headless_shell-$1")
    .replace(/chrome-linux64\/chrome$/, "chrome-headless-shell-linux64/chrome-headless-shell");
  if (!(await pathExists(chromePath))) {
    chromePath = fullChromiumPath;
  }

  const debugPort = 9222 + Math.floor(Math.random() * 100);
  const userDataDir = await mkdtemp(join(tmpdir(), "cw-lh-"));
  const chromeArgs = [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-setuid-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ];

  const proc = spawn(chromePath, chromeArgs, {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let chromeReady = false;
  let chromeErr = "";
  proc.stderr.on("data", (chunk) => {
    chromeErr += chunk.toString();
    if (chromeErr.includes("DevTools listening on")) chromeReady = true;
  });

  for (let i = 0; i < 150 && !chromeReady; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!chromeReady) {
    fail(`chromium did not start DevTools listener in 15s. Stderr tail: ${chromeErr.slice(-500)}`);
    proc.kill("SIGKILL");
    await server.close();
    await rm(userDataDir, { recursive: true, force: true });
    return;
  }

  let runnerResult;
  try {
    const lighthouseMod = await import("lighthouse");
    const lighthouse = lighthouseMod.default;
    runnerResult = await lighthouse(
      url,
      {
        port: debugPort,
        output: "json",
        logLevel: "error",
        onlyCategories: Object.keys(LH_THRESHOLDS),
      },
      // Use Lighthouse's default mobile config — what real users see
      // on a 4G/3G Fast simulated network with a Moto G4-class CPU.
    );
  } catch (e) {
    fail(`lighthouse run failed: ${String(e).slice(0, 400)}`);
    proc.kill("SIGKILL");
    await server.close();
    await rm(userDataDir, { recursive: true, force: true });
    return;
  } finally {
    proc.kill("SIGKILL");
  }

  await server.close();
  await rm(userDataDir, { recursive: true, force: true });

  if (!runnerResult || !runnerResult.lhr) {
    fail("lighthouse returned no result");
    return;
  }

  const cats = runnerResult.lhr.categories;
  console.log("  Mobile scores:");
  for (const [key, threshold] of Object.entries(LH_THRESHOLDS)) {
    const cat = cats[key];
    if (!cat) {
      fail(`lighthouse category "${key}" missing from result`);
      continue;
    }
    const score100 = Math.round((cat.score ?? 0) * 100);
    const padded = `${cat.title}:`.padEnd(20);
    if (score100 >= threshold) {
      ok(`${padded} ${score100} (≥ ${threshold})`);
    } else {
      fail(`${padded} ${score100} (< ${threshold} threshold)`);
    }
  }
}
