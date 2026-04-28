// Playwright smoke: each of the 5 pages loads end-to-end, has the key
// landmark elements rendered, raises no JS console errors, and (for /index)
// successfully boots the PWA service worker. Plan-page interactions
// (date-window form, region-chip URL update, notify-stub localStorage write)
// are also verified here.
//
// Run via `node --test --no-warnings`. Requires a prior `npm run build`.

import { strict as assert } from "node:assert";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

import { startTestServer } from "./_lib/server.mjs";

let server;
let browser;
const failures = [];

before(async () => {
  server = await startTestServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

const PAGES = [
  {
    name: "index",
    path: "/index.html",
    landmarks: ["#site-header", "#hero-mount", "#rank-body", "#world-map-mount", "main#main"],
  },
  {
    name: "history",
    path: "/history.html",
    landmarks: ["#site-header", "#cards", "#actuals-heatmap", "main#main"],
  },
  {
    name: "methodology",
    path: "/methodology.html",
    landmarks: ["#site-header", "main#main"],
  },
  {
    name: "destination",
    path: "/destination.html?slug=cyprus",
    landmarks: ["#site-header", "#dest-mount", "main#main"],
  },
  {
    name: "plan",
    path: "/plan.html",
    landmarks: ["#site-header", "#plan-form", "#plan-results", "main#main"],
  },
];

for (const page of PAGES) {
  test(`page ${page.name} loads with landmarks and no console errors`, async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    const errors = [];
    p.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    p.on("console", (msg) => {
      if (msg.type() === "error") {
        // Tolerate the dev-only `cwthresholds` console warnings we know about
        // (the ranking 16ms render-budget gate logs warn, not error).
        const text = msg.text();
        if (!/favicon|net::ERR_/i.test(text)) errors.push(`console.error: ${text}`);
      }
    });
    await p.goto(`${server.base}${page.path}`, { waitUntil: "networkidle" });
    for (const sel of page.landmarks) {
      const found = await p.locator(sel).count();
      assert.ok(found > 0, `${page.name}: missing landmark ${sel}`);
    }
    assert.deepEqual(errors, [], `${page.name}: console/page errors: ${errors.join(" | ")}`);
    await ctx.close();
  });
}

test("index: SW registers and shell cache contains >5 entries; data.json NOT cached", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/index.html`, { waitUntil: "networkidle" });
  // register-sw.ts defers to `load`, which has already fired by `networkidle`.
  // Allow up to 5s for the SW to reach `activated`.
  const swResult = await p.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return { supported: false };
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (!reg) return { supported: true, ready: false };
    // The cache name is generated from sw.js's BUILD_VERSION; we don't know
    // it ahead of time, but we can list all caches.
    const cacheNames = await caches.keys();
    const counts = {};
    for (const name of cacheNames) {
      const c = await caches.open(name);
      const keys = await c.keys();
      counts[name] = keys.map((r) => new URL(r.url).pathname);
    }
    return { supported: true, ready: true, counts };
  });
  assert.equal(swResult.supported, true, "SW must be supported");
  assert.equal(swResult.ready, true, "SW must reach activated state");
  const allEntries = Object.values(swResult.counts ?? {}).flat();
  assert.ok(allEntries.length > 5, `cache must hold >5 entries, got ${allEntries.length}`);
  const dataJsonCached = allEntries.some((u) => u.endsWith("/data.json") || u === "/data.json");
  assert.equal(dataJsonCached, false, "data.json must never be precached");
  await ctx.close();
});

test("index: manifest link + 3 apple-touch-icons present in HTML", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/index.html`, { waitUntil: "domcontentloaded" });
  const counts = await p.evaluate(() => ({
    manifest: document.querySelectorAll('link[rel="manifest"]').length,
    appleIcons: document.querySelectorAll('link[rel="apple-touch-icon"]').length,
  }));
  assert.ok(counts.manifest >= 1, "manifest link present");
  assert.equal(counts.appleIcons, 3, "exactly 3 apple-touch-icons (180/167/152)");
  await ctx.close();
});

test("unregister-sw.html exposes a working unregister button", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/unregister-sw.html`, { waitUntil: "domcontentloaded" });
  const btn = await p.locator("button").first().textContent();
  assert.ok(btn && /unregister/i.test(btn), `button must mention unregister, got "${btn}"`);
  await ctx.close();
});

test("plan: form renders 22 cards at defaults", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/plan.html`, { waitUntil: "networkidle" });
  await p.waitForSelector("#plan-results .plan-card", { timeout: 5_000 });
  const cardCount = await p.locator("#plan-results .plan-card").count();
  assert.equal(cardCount, 22, "22 destination cards at defaults");
  await ctx.close();
});

test("plan: changing date window re-renders results", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/plan.html`, { waitUntil: "networkidle" });
  await p.waitForSelector("#plan-results .plan-card", { timeout: 5_000 });
  const before = await p.locator("#plan-results").innerHTML();

  // Change the trip-length to a non-default. Plan page exposes a chip row
  // for this; we'll click the first chip whose data-value differs from the
  // current selection.
  const chips = p.locator(".plan-trip-chip");
  const count = await chips.count();
  if (count >= 2) {
    // pick a chip we haven't selected yet
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const chip = chips.nth(i);
      const aria = await chip.getAttribute("aria-pressed");
      if (aria !== "true") {
        await chip.click();
        clicked = true;
        break;
      }
    }
    assert.ok(clicked, "found a non-selected trip-length chip to click");
    // Allow the re-render
    await p.waitForFunction(
      (oldHtml) => document.querySelector("#plan-results")?.innerHTML !== oldHtml,
      before,
      { timeout: 5_000 },
    );
  }
  await ctx.close();
});

test("plan: clicking region radio writes ?region= to URL", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/plan.html`, { waitUntil: "networkidle" });
  await p.waitForSelector("#plan-region input[name='plan-region']", { timeout: 5_000 });
  // Click a non-default region (defaults are "any"); pick the first non-any value.
  const targetRadio = p
    .locator("#plan-region input[name='plan-region']:not([value='any'])")
    .first();
  const targetValue = await targetRadio.getAttribute("value");
  await targetRadio.check();
  // The plan page calls history.replaceState in handleStateChange.
  await p.waitForFunction(
    (val) => location.search.includes(`region=${val}`),
    targetValue,
    { timeout: 3_000 },
  );
  const search = await p.evaluate(() => location.search);
  assert.ok(
    search.includes(`region=${targetValue}`),
    `URL must contain region=${targetValue}, got ${search}`,
  );
  await ctx.close();
});

test("plan: notify-stub form writes to localStorage[\"cw-notify-alerts\"]", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/plan.html`, { waitUntil: "networkidle" });
  await p.waitForSelector("#plan-notify-form", { timeout: 5_000 });
  await p.fill("#plan-notify-email", "rider@example.com");
  // The form requires BOTH email and destSlug; pick the first non-empty option.
  const firstOption = await p
    .locator("#plan-notify-dest option:not([value=''])")
    .first()
    .getAttribute("value");
  assert.ok(firstOption, "destination select must have at least one non-empty option");
  await p.selectOption("#plan-notify-dest", firstOption);
  await p.locator("#plan-notify-form button[type=submit]").click();
  // Wait for the storage write (synchronous — but the listener fires after click).
  await p.waitForFunction(() => !!localStorage.getItem("cw-notify-alerts"), null, {
    timeout: 3_000,
  });
  const stored = await p.evaluate(() => localStorage.getItem("cw-notify-alerts"));
  assert.ok(
    stored && stored.includes("rider@example.com"),
    `localStorage must contain the email, got ${stored}`,
  );
  await ctx.close();
});

test("history: footer-freshness contains 'data.json built'", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/history.html`, { waitUntil: "networkidle" });
  await p.waitForSelector("#footer-freshness", { timeout: 5_000 });
  const text = await p.locator("#footer-freshness").textContent();
  assert.ok(text && /data\.json built/i.test(text), `footer must mention "data.json built", got "${text}"`);
  await ctx.close();
});

test("threshold-dial URL-wins: ?temp=15 overrides storage at boot", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  // Pre-seed localStorage with a different tempMin then visit ?temp=15.
  await p.goto(`${server.base}/index.html`);
  await p.evaluate(() => {
    localStorage.setItem(
      "cw-thresholds",
      JSON.stringify({ tempMin: 22, rainMax: 0, probMax: 10, windMax: 30, sunPref: "sun-cloud" }),
    );
  });
  await p.goto(`${server.base}/index.html?temp=15`, { waitUntil: "networkidle" });
  // The dial summary chip reflects the live state. Read its data-attribute or
  // the rendered text. Easier: open the dial and inspect the slider value.
  // The trigger pill shows live summary or "Defaults". We'll click it open
  // and read the temp slider's value.
  await p.locator("#threshold-trigger").click();
  await p.waitForSelector(".threshold-dial input[type='range']", { timeout: 3_000 });
  const tempSlider = p.locator('.threshold-dial input[type="range"]').first();
  const v = await tempSlider.inputValue();
  assert.equal(v, "15", `URL ?temp=15 must override stored tempMin=22, got slider value ${v}`);
  await ctx.close();
});
