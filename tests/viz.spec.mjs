// Visualisation invariants — codifies the headless-chromium probes from
// cycles 7/8/12 (polar bounds + world-map glyph bounds + reduced-motion
// clamp) and the M9+M10 history-chart contract (every chart mount renders
// either an SVG or a .chart-empty placeholder; heatmap rect bounds inside
// the SVG bbox).
//
// Cross-browser: loops over `selectedBrowsers()` (chromium-only by
// default, all three under `CW_BROWSERS=all`). SVG bbox math is identical
// across engines so these invariants are good cross-browser fodder.
//
// Run via `node --test --no-warnings`. Requires a prior `npm run build`.

import { strict as assert } from "node:assert";
import { after, before, test } from "node:test";

import { selectedBrowsers } from "./_lib/browsers.mjs";
import { startTestServer } from "./_lib/server.mjs";

const BROWSERS = selectedBrowsers();

let server;
const browsers = new Map();

before(async () => {
  server = await startTestServer();
  for (const b of BROWSERS) {
    browsers.set(b.name, await b.launcher.launch({ headless: true }));
  }
});

after(async () => {
  for (const b of browsers.values()) await b?.close();
  await server?.close();
});

// Helper: register a test once per selected browser. The test body is
// passed the launched browser instance — write tests as `vtest("name",
// async (browser) => { ... })` instead of relying on a module-scope
// `browser` const.
function vtest(name, fn) {
  for (const b of BROWSERS) {
    test(`${name} [${b.name}]`, async () => fn(browsers.get(b.name)));
  }
}

// ---- M6.1: polar wedge bounds within .polar-svg --------------------------
vtest("destination: polar wedges (.polar-temp/.polar-rain/.polar-wind/.polar-halo/.polar-hit) lie within .polar-svg bbox", async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/destination.html?slug=cyprus`, { waitUntil: "networkidle" });
  await p.waitForSelector(".polar-svg", { timeout: 8_000 });
  await p.waitForSelector(".polar-temp", { timeout: 8_000 });

  const result = await p.evaluate(() => {
    const svg = document.querySelector(".polar-svg");
    if (!svg) return { error: "no .polar-svg" };
    const sb = svg.getBoundingClientRect();
    const selectors = [".polar-temp", ".polar-rain", ".polar-wind", ".polar-halo", ".polar-hit"];
    const out = {};
    for (const sel of selectors) {
      const els = Array.from(document.querySelectorAll(sel));
      const items = els.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          inside:
            r.left >= sb.left - 0.5 &&
            r.right <= sb.right + 0.5 &&
            r.top >= sb.top - 0.5 &&
            r.bottom <= sb.bottom + 0.5,
          finite:
            Number.isFinite(r.left) &&
            Number.isFinite(r.top) &&
            Number.isFinite(r.right) &&
            Number.isFinite(r.bottom),
        };
      });
      out[sel] = { count: els.length, allInside: items.every((i) => i.inside && i.finite) };
    }
    return out;
  });

  for (const [sel, r] of Object.entries(result)) {
    assert.ok(r.count > 0, `${sel} must render at least one element`);
    assert.equal(r.allInside, true, `${sel}: every wedge must lie inside .polar-svg bbox`);
  }
  await ctx.close();
});

// ---- M9+M10: every history chart mount renders SVG or .chart-empty -------
vtest("history: every chart mount contains either an <svg> or a .chart-empty placeholder", async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/history.html`, { waitUntil: "networkidle" });
  await p.waitForSelector("#actuals-heatmap svg", { timeout: 8_000 });

  const result = await p.evaluate(() => {
    const mounts = Array.from(document.querySelectorAll(".chart-mount"));
    return mounts.map((m) => {
      const id = m.id;
      const hasSvg = !!m.querySelector("svg");
      const hasEmpty = !!m.querySelector(".chart-empty");
      // dest-acc renders an HTML <table> instead of an SVG when calibration
      // data is present — that's "rendered, not blank", which satisfies the
      // contract.
      const hasTable = !!m.querySelector("table");
      return { id, ok: hasSvg || hasEmpty || hasTable };
    });
  });

  assert.ok(result.length >= 4, `expected ≥4 chart mounts, got ${result.length}`);
  for (const m of result) {
    assert.equal(
      m.ok,
      true,
      `chart mount #${m.id} renders neither <svg> nor <table> nor .chart-empty`,
    );
  }
  await ctx.close();
});

vtest("history: heatmap rect bounds lie inside #actuals-heatmap SVG bbox", async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/history.html`, { waitUntil: "networkidle" });
  await p.waitForSelector("#actuals-heatmap svg rect", { timeout: 8_000 });

  const result = await p.evaluate(() => {
    const svg = document.querySelector("#actuals-heatmap svg");
    if (!svg) return { error: "no svg" };
    const sb = svg.getBoundingClientRect();
    const rects = Array.from(svg.querySelectorAll("rect"));
    const allInside = rects.every((r) => {
      const b = r.getBoundingClientRect();
      return (
        b.left >= sb.left - 0.5 &&
        b.right <= sb.right + 0.5 &&
        b.top >= sb.top - 0.5 &&
        b.bottom <= sb.bottom + 0.5
      );
    });
    return { count: rects.length, allInside };
  });
  assert.ok(result.count > 0, "heatmap must render rects");
  assert.equal(result.allInside, true, "every heatmap rect must lie within the SVG bbox");
  await ctx.close();
});

vtest("history: .hm-qualify stroke uses --surface-elevated token (or computed equivalent, never #000)", async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/history.html`, { waitUntil: "networkidle" });
  // .hm-qualify dots only render when at least one actuals-day matched the
  // qualifier. In dry months the data may produce zero dots — guard with a
  // presence check, do not fail on absence.
  const present = await p.locator(".hm-qualify").count();
  if (present === 0) {
    console.log("  (no .hm-qualify dots in today's heatmap; skipped — token rule still in bundle)");
    await ctx.close();
    return;
  }
  const stroke = await p.evaluate(() => {
    const el = document.querySelector(".hm-qualify");
    if (!el) return null;
    const cs = getComputedStyle(el);
    return cs.stroke;
  });
  // Computed stroke comes back as `rgb(...)`. Hard-coded #000 would be `rgb(0, 0, 0)`.
  // Both light and dark theme `--surface-elevated` are non-pure-black, so guard
  // by asserting NOT equal to rgb(0, 0, 0).
  assert.notEqual(stroke, "rgb(0, 0, 0)", "qualifier dot must not use hard-coded #000");
  assert.ok(stroke && stroke.startsWith("rgb"), `expected rgb(...) stroke, got ${stroke}`);
  await ctx.close();
});

// ---- M9+M10: footer-freshness ------------------------------------------
for (const path of ["/index.html", "/history.html", "/methodology.html", "/destination.html?slug=cyprus", "/plan.html"]) {
  vtest(`footer-freshness contains 'data.json built' on ${path}`, async (browser) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(`${server.base}${path}`, { waitUntil: "networkidle" });
    await p.waitForSelector("#footer-freshness", { timeout: 5_000 });
    const text = await p.locator("#footer-freshness").textContent();
    assert.ok(
      text && /data\.json built/i.test(text),
      `${path}: footer-freshness must mention "data.json built", got "${text}"`,
    );
    await ctx.close();
  });
}

// ---- M12: world-map invariants ------------------------------------------
vtest("index: every world-map glyph has bbox inside .world-map-svg, role=button, tabindex=0, aria-label", async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/index.html`, { waitUntil: "networkidle" });
  await p.locator("#world-map-mount").scrollIntoViewIfNeeded();
  await p.waitForSelector(".world-map-svg", { timeout: 10_000 });
  await p.waitForSelector("[data-dest-glyph]", { timeout: 5_000 });

  const result = await p.evaluate(() => {
    const svg = document.querySelector(".world-map-svg");
    const sb = svg.getBoundingClientRect();
    const glyphs = Array.from(document.querySelectorAll("[data-dest-glyph]"));
    return glyphs.map((g) => {
      const dot = g.querySelector(".world-glyph-dot");
      const r = dot ? dot.getBoundingClientRect() : g.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return {
        slug: g.getAttribute("data-slug"),
        inside: cx >= sb.left && cx <= sb.right && cy >= sb.top && cy <= sb.bottom,
        finite: Number.isFinite(cx) && Number.isFinite(cy),
        role: dot?.getAttribute("role"),
        tabindex: dot?.getAttribute("tabindex"),
        ariaLabel: dot?.getAttribute("aria-label") ?? null,
      };
    });
  });
  assert.ok(result.length >= 22, `expected ≥22 glyphs, got ${result.length}`);
  for (const g of result) {
    assert.equal(g.inside, true, `glyph ${g.slug} outside SVG bbox`);
    assert.equal(g.finite, true, `glyph ${g.slug} non-finite coords`);
    assert.equal(g.role, "button", `glyph ${g.slug} role=${g.role}`);
    assert.equal(g.tabindex, "0", `glyph ${g.slug} tabindex=${g.tabindex}`);
    assert.ok(g.ariaLabel && g.ariaLabel.length > 0, `glyph ${g.slug} missing aria-label`);
  }
  await ctx.close();
});

vtest("index: hovering a world-map glyph surfaces #world-map-tooltip", async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/index.html`, { waitUntil: "networkidle" });
  await p.locator("#world-map-mount").scrollIntoViewIfNeeded();
  await p.waitForSelector("[data-dest-glyph]", { timeout: 8_000 });
  const firstSlug = await p
    .locator("[data-dest-glyph]")
    .first()
    .getAttribute("data-slug");
  await p.locator(`[data-slug="${firstSlug}"] .world-glyph-dot`).first().hover();
  await p.waitForFunction(() => {
    const tip = document.querySelector("#world-map-tooltip");
    if (!tip) return false;
    const cs = getComputedStyle(tip);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }, null, { timeout: 3_000 });
  await ctx.close();
});

vtest("reduced-motion: rank-card / strip-cell / theme-toggle / world-glyph-dot have transitionDuration 0s", async (browser) => {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/index.html`, { waitUntil: "networkidle" });
  await p.locator("#world-map-mount").scrollIntoViewIfNeeded();
  await p.waitForSelector("[data-dest-glyph]", { timeout: 8_000 });

  const result = await p.evaluate(() => {
    const selectors = [".rank-card", ".strip-cell", ".theme-toggle", ".world-glyph-dot"];
    const out = {};
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) {
        out[sel] = { present: false };
        continue;
      }
      const cs = getComputedStyle(el);
      out[sel] = { present: true, td: cs.transitionDuration, ad: cs.animationDuration };
    }
    return out;
  });
  for (const [sel, m] of Object.entries(result)) {
    if (!m.present) continue; // CSS rule still in bundle; element absent in today's snapshot
    const tdOk =
      m.td === "0s" ||
      /^0(?:s|ms)$/.test(m.td) ||
      m.td.split(",").every((part) => part.trim() === "0s");
    const adOk =
      m.ad === "0s" ||
      /^0(?:s|ms)$/.test(m.ad) ||
      m.ad.split(",").every((part) => part.trim() === "0s");
    assert.equal(tdOk, true, `${sel} transitionDuration=${m.td} (expected 0s under reduced-motion)`);
    assert.equal(adOk, true, `${sel} animationDuration=${m.ad} (expected 0s under reduced-motion)`);
  }
  await ctx.close();
});

// ---- world-map glyphs in-bounds at 360 / 768 / 1280 ---------------------
for (const w of [360, 768, 1280]) {
  vtest(`world-map glyphs all inside SVG bbox at ${w}px width`, async (browser) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(`${server.base}/index.html`, { waitUntil: "networkidle" });
    await p.locator("#world-map-mount").scrollIntoViewIfNeeded();
    await p.waitForSelector("[data-dest-glyph]", { timeout: 10_000 });
    const ok = await p.evaluate(() => {
      const svg = document.querySelector(".world-map-svg");
      const sb = svg.getBoundingClientRect();
      const glyphs = Array.from(document.querySelectorAll("[data-dest-glyph] .world-glyph-dot"));
      return glyphs.every((g) => {
        const r = g.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        return cx >= sb.left && cx <= sb.right && cy >= sb.top && cy <= sb.bottom;
      });
    });
    assert.equal(ok, true, `at ${w}px: every glyph must lie inside SVG bbox`);
    await ctx.close();
  });
}

// ---- index: hero CTA scrolls to ranking row ------------------------------
vtest("index: hero pick CTA targets a real ranking row by slug", async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${server.base}/index.html`, { waitUntil: "networkidle" });
  // Hero is rendered into #hero-mount; the top pick link points at index.html#<slug>.
  const href = await p.locator("#hero-mount a").first().getAttribute("href");
  if (!href) {
    // Hero may render a non-link variant in legacy data; not a hard requirement.
    console.log("  (hero has no <a>; skipped)");
    await ctx.close();
    return;
  }
  const hash = href.split("#")[1];
  if (!hash) {
    console.log(`  (hero CTA href ${href} has no #fragment; skipped)`);
    await ctx.close();
    return;
  }
  const card = await p.locator(`#${hash}.rank-card`).count();
  assert.ok(card > 0, `expected a .rank-card with id="${hash}", found 0`);
  await ctx.close();
});
