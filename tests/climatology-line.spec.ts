// M5 climatology context — pure-function tests for `formatClimatologyContext`
// + `findClimatologyEntry`. The 120-character cap and the neutral-band
// (≤0.6°C → "tracking with") boundary are contract; below them the line
// reads as "warmer/cooler", above the cap it gets ellipsised. Run via
// `node --test --experimental-strip-types`.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  type ClimatologyContext,
  findClimatologyEntry,
  formatClimatologyContext,
  renderClimatologyLine,
} from "../src/components/climatology-line.ts";
import type { ClimatologyBlock, ClimatologyEntry } from "../src/lib/types.ts";

function block(overrides: Partial<ClimatologyBlock> = {}): ClimatologyBlock {
  return {
    generated_at: "2026-04-28T10:00:00+00:00",
    anchor_date: "2026-04-28",
    window_start: "2026-04-25",
    window_end: "2026-05-01",
    window_label: "late April",
    years: 5,
    destinations: [],
    ...overrides,
  };
}

function entry(overrides: Partial<ClimatologyEntry> = {}): ClimatologyEntry {
  return {
    name: "Mallorca",
    median_temp_max: 22.5,
    p10_temp_max: 19.0,
    p90_temp_max: 26.0,
    median_precip_sum: 0.4,
    sample_size: 35,
    years: 5,
    ...overrides,
  };
}

test("formatClimatologyContext — warmer than median returns positive tone + signed delta", () => {
  const ctx = formatClimatologyContext(25.5, entry(), block(), "Mallorca");
  assert.ok(ctx);
  assert.equal(ctx?.tone, "warmer");
  assert.equal(ctx?.delta, 3);
  assert.equal(ctx?.deltaAbs, 3);
  assert.match(ctx?.headline ?? "", /Mallorca is 3°C warmer than the 5y median for late April\./);
});

test("formatClimatologyContext — cooler than median returns negative tone", () => {
  const ctx = formatClimatologyContext(20.0, entry(), block(), "Mallorca");
  assert.ok(ctx);
  assert.equal(ctx?.tone, "cooler");
  assert.match(ctx?.headline ?? "", /2\.5°C cooler/);
});

test("formatClimatologyContext — within neutral band reports as 'tracking'", () => {
  // Default neutral threshold is 0.6°C; a 0.4°C delta should land in the
  // tracking band.
  const ctx = formatClimatologyContext(22.9, entry(), block(), "Mallorca");
  assert.ok(ctx);
  assert.equal(ctx?.tone, "tracking");
  assert.match(ctx?.headline ?? "", /tracking with the 5y median for late April/);
});

test("formatClimatologyContext — null current temp returns null (silent)", () => {
  const ctx = formatClimatologyContext(null, entry(), block(), "Mallorca");
  assert.equal(ctx, null);
});

test("formatClimatologyContext — empty entry sample returns null", () => {
  const ctx = formatClimatologyContext(
    25,
    entry({ sample_size: 0, median_temp_max: null }),
    block(),
    "Mallorca",
  );
  assert.equal(ctx, null);
});

test("formatClimatologyContext — null block returns null (v1/v2 schema)", () => {
  const ctx = formatClimatologyContext(25, entry(), null, "Mallorca");
  assert.equal(ctx, null);
});

test("formatClimatologyContext — headline is capped at 120 chars", () => {
  const longName = "A".repeat(150);
  const ctx = formatClimatologyContext(30, entry(), block(), longName);
  assert.ok(ctx);
  assert.ok((ctx?.headline.length ?? 0) <= 120);
  assert.ok(ctx?.headline.endsWith("…"));
});

test("formatClimatologyContext — large positive delta rounds to integer °C", () => {
  const ctx = formatClimatologyContext(35, entry({ median_temp_max: 22 }), block(), "Mallorca");
  assert.ok(ctx);
  assert.match(ctx?.headline ?? "", /13°C warmer/);
});

test("formatClimatologyContext — small fractional delta rounds to one decimal", () => {
  const ctx = formatClimatologyContext(23.7, entry({ median_temp_max: 22.0 }), block(), "Mallorca");
  assert.ok(ctx);
  assert.match(ctx?.headline ?? "", /1\.7°C warmer/);
});

test("findClimatologyEntry — locates by exact name match", () => {
  const b = block({
    destinations: [entry({ name: "Mallorca" }), entry({ name: "Girona", median_temp_max: 19 })],
  });
  const found = findClimatologyEntry(b, "Girona");
  assert.equal(found?.name, "Girona");
  assert.equal(found?.median_temp_max, 19);
});

test("findClimatologyEntry — missing destination returns null", () => {
  const b = block({ destinations: [entry({ name: "Mallorca" })] });
  assert.equal(findClimatologyEntry(b, "Andorra"), null);
});

test("findClimatologyEntry — null block returns null", () => {
  assert.equal(findClimatologyEntry(null, "Mallorca"), null);
});

test("renderClimatologyLine — null context returns empty string (silent)", () => {
  assert.equal(renderClimatologyLine(null), "");
});

test("renderClimatologyLine — escapes destination name in headline", () => {
  const ctx: ClimatologyContext = {
    headline: "<script>alert('x')</script> is 3°C warmer than the 5y median for late April.",
    tone: "warmer",
    delta: 3,
    deltaAbs: 3,
    windowLabel: "late April",
    years: 5,
    median: 22.5,
    current: 25.5,
  };
  const html = renderClimatologyLine(ctx);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("renderClimatologyLine — emits aria-live polite + a tone class", () => {
  const ctx = formatClimatologyContext(25, entry(), block(), "Mallorca");
  assert.ok(ctx);
  const html = renderClimatologyLine(ctx);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /climatology-warmer/);
  assert.match(html, /<table class="visually-hidden"/);
});
