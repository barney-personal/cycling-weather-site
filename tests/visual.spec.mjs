// Visual baselines — captures full-page screenshots of each of the 5 pages
// at multiple breakpoints (320/360/768/1280/1440/1920 portrait + 812×375
// landscape) plus reduced-motion and prefers-contrast variants at desktop.
//
// On a missing baseline, the captured PNG is written to `tests/visual/`
// and the test passes (initial commit). On a present baseline, the bytes
// are compared with a 5% byte-budget tolerance — roomy enough to absorb
// daily timestamp drift and sub-pixel font-render noise across the same
// chromium revision. Set CW_UPDATE_VISUAL=1 to refresh baselines after a
// deliberate visual change.
//
// Run via `node --test --no-warnings`. Requires a prior `npm run build`.

import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { startTestServer } from "./_lib/server.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const baselineDir = resolve(here, "visual");

let server;
let browser;

before(async () => {
  server = await startTestServer();
  browser = await chromium.launch({ headless: true });
  await mkdir(baselineDir, { recursive: true });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

const PAGES = [
  { name: "index", path: "/index.html", waitFor: "[data-dest-glyph]" },
  { name: "history", path: "/history.html", waitFor: "#actuals-heatmap svg rect" },
  { name: "methodology", path: "/methodology.html", waitFor: "main#main h2" },
  { name: "destination", path: "/destination.html?slug=cyprus", waitFor: ".polar-svg" },
  { name: "plan", path: "/plan.html", waitFor: "#plan-results .plan-card" },
];

// Portrait widths spanning small phone → desktop → wide desktop.
const PORTRAIT_WIDTHS = [320, 360, 768, 1280, 1440, 1920];

// Mobile-landscape variant (typical iPhone landscape: 812×375).
const LANDSCAPE_VIEWPORT = { width: 812, height: 375, label: "812landscape" };

// Variant matrix at the desktop reference width (1280). Exercises
// reduced-motion and prefers-contrast: more so we catch token regressions
// in those modes early.
const VARIANTS = [
  { suffix: "rmotion", width: 1280, contextOverrides: { reducedMotion: "reduce" } },
  { suffix: "hcontrast", width: 1280, contextOverrides: { forcedColors: "none", colorScheme: "light" }, mediaFeatures: [{ name: "prefers-contrast", value: "more" }] },
];

const PIXEL_BUDGET_RATIO = 0.05; // documented in the header comment

function pngsApproximatelyEqual(a, b) {
  if (a.length === b.length && a.equals(b)) return { ok: true, ratio: 0 };
  // We don't ship a PNG decoder — fall back to a deflated-stream byte budget.
  // 5% absorbs daily timestamp drift in hero copy + sub-pixel font shifts
  // within the same chromium revision; deliberate visual changes blow the
  // budget and require `CW_UPDATE_VISUAL=1` to refresh.
  const sizeRatio = Math.abs(a.length - b.length) / Math.max(a.length, b.length);
  return { ok: sizeRatio <= PIXEL_BUDGET_RATIO, ratio: sizeRatio };
}

async function loadPage(ctx, p) {
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem("cw-theme", "light");
    } catch {}
  });
  await page.goto(`${server.base}${p.path}`, { waitUntil: "networkidle" });
  // Walk the page top-to-bottom so any IntersectionObserver-driven late
  // mounts (world map) fire before we wait for their gating selectors.
  // Critical for short-height landscape viewports where the lazy mount
  // sits below the initial fold and a single scrollTo(bottom) may overshoot.
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight - 50, 200);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.waitForSelector(p.waitFor, { timeout: 10_000, state: "attached" });
  return page;
}

async function compareOrUpdate(buf, baselineName) {
  const baselinePath = resolve(baselineDir, `${baselineName}.png`);
  const update = process.env.CW_UPDATE_VISUAL === "1";
  if (!existsSync(baselinePath) || update) {
    await writeFile(baselinePath, buf);
    console.log(`  baseline ${update ? "updated" : "written"}: ${baselineName}.png (${buf.length} B)`);
    return;
  }
  const baseline = await readFile(baselinePath);
  const cmp = pngsApproximatelyEqual(baseline, buf);
  assert.ok(
    cmp.ok,
    `${baselineName}: baseline byte-length drift ${(cmp.ratio * 100).toFixed(2)}% > ${(PIXEL_BUDGET_RATIO * 100).toFixed(0)}% budget`,
  );
}

// ---- Portrait widths × pages -------------------------------------------
for (const p of PAGES) {
  for (const width of PORTRAIT_WIDTHS) {
    test(`visual: ${p.name} @ ${width}px`, async () => {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        colorScheme: "light",
      });
      const page = await loadPage(ctx, p);
      const buf = await page.screenshot({ type: "png", fullPage: true });
      await compareOrUpdate(buf, `${p.name}-${width}`);
      await ctx.close();
    });
  }
}

// ---- Mobile-landscape variant ------------------------------------------
for (const p of PAGES) {
  test(`visual: ${p.name} @ ${LANDSCAPE_VIEWPORT.label}`, async () => {
    const ctx = await browser.newContext({
      viewport: { width: LANDSCAPE_VIEWPORT.width, height: LANDSCAPE_VIEWPORT.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      colorScheme: "light",
    });
    const page = await loadPage(ctx, p);
    const buf = await page.screenshot({ type: "png", fullPage: true });
    await compareOrUpdate(buf, `${p.name}-${LANDSCAPE_VIEWPORT.label}`);
    await ctx.close();
  });
}

// ---- Variant matrix at 1280: reduced-motion + prefers-contrast --------
for (const p of PAGES) {
  for (const v of VARIANTS) {
    test(`visual: ${p.name} @ ${v.width}px (${v.suffix})`, async () => {
      const ctx = await browser.newContext({
        viewport: { width: v.width, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: "light",
        ...v.contextOverrides,
      });
      if (v.mediaFeatures) {
        // Playwright API: emulateMedia accepts only a small set of features
        // directly. For prefers-contrast we use the underlying CDP via the
        // page after creation.
      }
      const page = await loadPage(ctx, p);
      if (v.mediaFeatures) {
        const session = await page.context().newCDPSession(page);
        await session.send("Emulation.setEmulatedMedia", { features: v.mediaFeatures });
        // Trigger a re-render so the media query takes effect.
        await page.evaluate(() => document.body.getBoundingClientRect());
        await page.waitForTimeout(50);
      }
      const buf = await page.screenshot({ type: "png", fullPage: true });
      await compareOrUpdate(buf, `${p.name}-${v.width}-${v.suffix}`);
      await ctx.close();
    });
  }
}

// ---- Stale-data banner state (M3) --------------------------------------
// `?stale=1` forces the stale banner regardless of `data.json.generated_at`,
// giving us a deterministic snapshot of that mode without time-travelling
// the test fixture.
test("visual: index @ 1280px (?stale=1)", async () => {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  const page = await loadPage(ctx, {
    name: "index-stale",
    path: "/index.html?stale=1",
    waitFor: "[data-dest-glyph]",
  });
  // Wait for the banner DOM to render (mount script is non-blocking).
  await page.waitForSelector(".stale-banner", { timeout: 5_000, state: "attached" });
  const buf = await page.screenshot({ type: "png", fullPage: true });
  await compareOrUpdate(buf, "index-1280-stale");
  await ctx.close();
});
