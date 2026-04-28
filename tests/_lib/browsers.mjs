// Cross-browser matrix selector.
//
// `npm test` defaults to chromium-only (fast, mirrors local dev). Set
// `CW_BROWSERS=all` to loop the smoke/viz/a11y suites across chromium,
// firefox AND webkit; or `CW_BROWSERS=chromium,webkit` for a custom
// subset. Visual baselines are chromium-only by design — byte-identity
// across browsers is impossible, and the visual gate is a chromium
// regression detector, not a cross-browser pixel-comparison.
//
// Each spec calls `selectedBrowsers()` once and either iterates the
// returned list or runs only the first entry. Browsers that fail to
// launch (typically missing host system libs in a CI image) raise an
// up-front error rather than producing confusing per-test timeouts.

import { chromium, firefox, webkit } from "playwright";

const REGISTRY = {
  chromium: { name: "chromium", launcher: chromium },
  firefox: { name: "firefox", launcher: firefox },
  webkit: { name: "webkit", launcher: webkit },
};

export function selectedBrowsers() {
  const env = (process.env.CW_BROWSERS ?? "chromium").trim();
  const requested =
    env.toLowerCase() === "all"
      ? ["chromium", "firefox", "webkit"]
      : env.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const out = [];
  for (const r of requested) {
    if (!REGISTRY[r]) {
      throw new Error(
        `CW_BROWSERS: unknown browser "${r}" (allowed: chromium, firefox, webkit, all)`,
      );
    }
    out.push(REGISTRY[r]);
  }
  if (out.length === 0) out.push(REGISTRY.chromium);
  return out;
}

// Convenience: the single entry to use for tests that don't need
// cross-browser coverage (e.g. visual regression — chromium-only by
// design). Always returns the first selected browser, defaulting to
// chromium when nothing is set.
export function primaryBrowser() {
  return selectedBrowsers()[0];
}
