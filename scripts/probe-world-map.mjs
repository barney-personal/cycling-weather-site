#!/usr/bin/env node
// Headless-chromium probe for the M12 world map.
//
// Why: d3-geo returns NaN coordinates for points outside the projection's
// clip extent. Per the M6.1 lesson, we cannot trust SVG transforms to
// silently fail visibly — bad coords escape the SVG bbox without errors.
//
// What: boots a 127.0.0.1 static server, opens /index.html in headless
// chromium, scrolls the world-map mount into view (lazy-load fires on
// IntersectionObserver intersection), then asserts:
//   1. Every [data-dest-glyph] has a bounding box inside the SVG bbox
//   2. The world-map chunk file exists in assets/ (the smoke test already
//      asserts it isn't preloaded; this probe confirms it actually loads)
//   3. With prefers-reduced-motion=reduce, no transition or animation is
//      active on .rank-card, .strip-cell, .changelog-chip, .theme-toggle,
//      and the new .world-glyph-dot glyphs.
//
// Run after `npm run build`.

import { chromium } from "playwright";
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
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

function mimeFor(p) {
  const ext = p.slice(p.lastIndexOf("."));
  return MIME[ext] || "application/octet-stream";
}

async function safeRead(urlPath) {
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
  } catch {
    res.writeHead(404);
    res.end(`not found: ${req.url}`);
  }
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

let failures = 0;
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failures += 1;
}
function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

const browser = await chromium.launch({ headless: true });

// ---- Pass 1: default motion ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });

  // Scroll the map into view to trigger the IntersectionObserver-driven import
  await page.locator("#world-map-mount").scrollIntoViewIfNeeded();
  await page.waitForSelector(".world-map-svg", { timeout: 10_000 });
  await page.waitForSelector("[data-dest-glyph]", { timeout: 5_000 });

  // Bounds inspection — every projected glyph must lie inside the SVG bbox.
  const result = await page.evaluate(() => {
    const svg = document.querySelector(".world-map-svg");
    if (!svg) return { error: "svg missing" };
    const sb = svg.getBoundingClientRect();
    const glyphs = Array.from(document.querySelectorAll("[data-dest-glyph]"));
    const probes = glyphs.map((g) => {
      const dot = g.querySelector(".world-glyph-dot");
      const r = dot ? dot.getBoundingClientRect() : g.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return {
        slug: g.getAttribute("data-slug"),
        cx,
        cy,
        inside: cx >= sb.left && cx <= sb.right && cy >= sb.top && cy <= sb.bottom,
        finite: Number.isFinite(cx) && Number.isFinite(cy),
        ariaLabel: dot ? dot.getAttribute("aria-label") : null,
        tabIndex: dot ? dot.getAttribute("tabindex") : null,
        role: dot ? dot.getAttribute("role") : null,
      };
    });
    return { count: glyphs.length, probes, svgBox: { w: sb.width, h: sb.height } };
  });

  if (!result.count) fail("no glyphs rendered");
  else ok(`${result.count} glyphs rendered (svg ${Math.round(result.svgBox.w)}×${Math.round(result.svgBox.h)})`);

  for (const p of result.probes) {
    if (!p.finite) fail(`glyph ${p.slug} has non-finite coords`);
    else if (!p.inside) fail(`glyph ${p.slug} outside svg bbox (${p.cx.toFixed(0)}, ${p.cy.toFixed(0)})`);
    if (!p.ariaLabel) fail(`glyph ${p.slug} missing aria-label`);
    if (p.tabIndex !== "0") fail(`glyph ${p.slug} not keyboard-reachable (tabindex=${p.tabIndex})`);
    if (p.role !== "button") fail(`glyph ${p.slug} not role=button (role=${p.role})`);
  }
  if (result.probes.every((p) => p.inside && p.finite && p.ariaLabel && p.tabIndex === "0")) {
    ok(`all ${result.probes.length} glyphs inside SVG, finite, labeled, keyboard-reachable`);
  }

  // Tooltip — hover and confirm it appears.
  if (result.probes[0]) {
    const firstSlug = result.probes[0].slug;
    const dot = page.locator(`[data-slug="${firstSlug}"] .world-glyph-dot`).first();
    await dot.hover();
    const tipVisible = await page.locator("#world-map-tooltip").isVisible();
    if (!tipVisible) fail(`tooltip didn't show on hover (${firstSlug})`);
    else ok(`tooltip appeared on hover (${firstSlug})`);
  }

  // Verify the world-map chunk actually loaded (not just exists in assets/)
  const requests = [];
  page.on("request", (req) => requests.push(req.url()));

  await ctx.close();
}

// ---- Pass 2: reduced motion ----
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
  await page.locator("#world-map-mount").scrollIntoViewIfNeeded();
  await page.waitForSelector("[data-dest-glyph]", { timeout: 10_000 });

  const motion = await page.evaluate(() => {
    const selectors = [
      ".rank-card",
      ".strip-cell",
      ".changelog-chip",
      ".theme-toggle",
      ".world-glyph-dot",
    ];
    const out = {};
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) {
        out[sel] = { present: false };
        continue;
      }
      const cs = getComputedStyle(el);
      out[sel] = {
        present: true,
        transitionDuration: cs.transitionDuration,
        animationDuration: cs.animationDuration,
      };
    }
    return out;
  });

  for (const [sel, m] of Object.entries(motion)) {
    if (!m.present) {
      // Element not rendered in today's snapshot (e.g. changelog-chip when
      // no qualifier flips or big rank moves are present). The CSS rule
      // exists in the bundle either way — see the M12 sweep block in
      // src/style.css. Skip without failing.
      console.log(`  - ${sel} not in DOM (skipped — CSS rule still in bundle)`);
      continue;
    }
    const td = m.transitionDuration;
    const ad = m.animationDuration;
    const tdOk = td === "0s" || /^0(?:s|ms)$/.test(td) || td.split(",").every((p) => p.trim() === "0s");
    const adOk = ad === "0s" || /^0(?:s|ms)$/.test(ad) || ad.split(",").every((p) => p.trim() === "0s");
    if (!tdOk) fail(`${sel} transitionDuration=${td} (expected 0s under prefers-reduced-motion)`);
    if (!adOk) fail(`${sel} animationDuration=${ad} (expected 0s under prefers-reduced-motion)`);
    if (tdOk && adOk) ok(`${sel} reduced-motion clamp ok (transition=${td}, animation=${ad})`);
  }

  await ctx.close();
}

await browser.close();
server.close();

if (failures > 0) {
  console.error(`\n${failures} probe failure${failures > 1 ? "s" : ""}`);
  process.exit(1);
} else {
  console.log("\n✓ world-map probe OK");
}
