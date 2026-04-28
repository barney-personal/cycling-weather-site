// Accessibility regression — runs axe-core against each of the 5 pages in
// both light and dark themes; asserts zero serious/critical issues. Best
// Practices, AA contrast, ARIA, keyboard reachability, and document-level
// landmark rules are all in scope.
//
// Run via `node --test --no-warnings`. Requires a prior `npm run build`.

import { strict as assert } from "node:assert";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { default as AxeBuilder } from "@axe-core/playwright";

import { startTestServer } from "./_lib/server.mjs";

let server;
let browser;

before(async () => {
  server = await startTestServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

const PAGES = [
  { name: "index", path: "/index.html", waitFor: "#rank-body tr, #rank-cards .rank-card" },
  { name: "history", path: "/history.html", waitFor: "#actuals-heatmap svg" },
  { name: "methodology", path: "/methodology.html", waitFor: "main#main h2" },
  { name: "destination", path: "/destination.html?slug=cyprus", waitFor: "#dest-mount" },
  { name: "plan", path: "/plan.html", waitFor: "#plan-results .plan-card" },
];

const THEMES = ["light", "dark"];

// axe-core rule whitelist applied to all pages — WCAG 2 AA + best-practices.
function newAxe(page) {
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    // Frame walkthrough is unnecessary (no iframes); skip to speed runs.
    .disableRules([]);
}

for (const p of PAGES) {
  for (const theme of THEMES) {
    test(`a11y: ${p.name} (${theme}) — 0 serious/critical axe violations`, async () => {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        colorScheme: theme,
      });
      const page = await ctx.newPage();
      // Pre-seed the explicit theme so the FOUC script picks it up before
      // first paint — works in both directions regardless of OS scheme.
      await page.addInitScript((t) => {
        try {
          localStorage.setItem("cw-theme", t);
        } catch {}
      }, theme);
      await page.goto(`${server.base}${p.path}`, { waitUntil: "networkidle" });
      // The wait selector may match elements that are display:none under the
      // current viewport (cards vs. table). Use `state: "attached"` because
      // we only need the DOM to be populated before scanning.
      await page.waitForSelector(p.waitFor, { timeout: 8_000, state: "attached" });

      // Confirm the data-theme attribute resolved as expected before scanning.
      const resolved = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
      assert.equal(resolved, theme, `${p.name}/${theme}: data-theme must be "${theme}", got "${resolved}"`);

      const results = await newAxe(page).analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      if (blocking.length > 0) {
        console.error(
          `${p.name}/${theme} blocking violations:\n` +
            blocking
              .map(
                (v) =>
                  `  • ${v.id} [${v.impact}] — ${v.help}\n    nodes: ${v.nodes
                    .slice(0, 3)
                    .map((n) => n.target.join(" "))
                    .join(" | ")}`,
              )
              .join("\n"),
        );
      }
      assert.equal(
        blocking.length,
        0,
        `${p.name}/${theme}: ${blocking.length} serious/critical axe issues`,
      );
      await ctx.close();
    });
  }
}
