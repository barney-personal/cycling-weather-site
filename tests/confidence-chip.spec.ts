// M7 forecast-confidence chip — pure-function tests for
// `formatConfidenceContext`, `findModelSpreadEntry`, and `renderConfidenceChip`.
// Threshold contract:
//   • temp_spread_c >= 3.0  OR  precip_prob_spread_pct >= 25  → splits a day
//   • LEAD_DAYS = 7 (only the first 7 entries are scored)
//   • days with models_count < 2 are ignored (no spread to report)
// On a confident week (zero split days) the formatter returns null so the
// renderer emits an empty string. Run via `node --test
// --experimental-strip-types`.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  type ConfidenceContext,
  findModelSpreadEntry,
  formatConfidenceContext,
  renderConfidenceChip,
} from "../src/components/confidence-chip.ts";
import type {
  ModelSpreadBlock,
  ModelSpreadDay,
  ModelSpreadEntry,
} from "../src/lib/types.ts";

function block(overrides: Partial<ModelSpreadBlock> = {}): ModelSpreadBlock {
  return {
    generated_at: "2026-04-28T10:00:00+00:00",
    anchor_date: "2026-04-28",
    models: ["ecmwf_ifs04", "gfs_seamless", "icon_seamless"],
    forecast_days: 14,
    destinations: [],
    ...overrides,
  };
}

function day(overrides: Partial<ModelSpreadDay> = {}): ModelSpreadDay {
  return {
    date: "2026-04-28",
    temp_min: 22.0,
    temp_max: 23.0,
    temp_spread_c: 1.0,
    prob_min: 5,
    prob_max: 10,
    precip_prob_spread_pct: 5,
    models_count: 3,
    ...overrides,
  };
}

function entry(name: string, days: ModelSpreadDay[]): ModelSpreadEntry {
  return { name, days };
}

test("formatConfidenceContext — confident week returns null (silent)", () => {
  const e = entry(
    "Mallorca",
    Array.from({ length: 7 }, (_, i) =>
      day({ date: `2026-04-${28 + i}`, temp_spread_c: 1.0, precip_prob_spread_pct: 10 }),
    ),
  );
  const ctx = formatConfidenceContext(e, block({ destinations: [e] }));
  assert.equal(ctx, null);
});

test("formatConfidenceContext — split temp day trips the chip", () => {
  const days: ModelSpreadDay[] = Array.from({ length: 7 }, (_, i) =>
    day({ date: `2026-04-${28 + i}`, temp_spread_c: 1.0, precip_prob_spread_pct: 10 }),
  );
  // Day 3 has a 4°C temp spread → should trigger.
  days[2] = day({ date: "2026-04-30", temp_spread_c: 4.0, precip_prob_spread_pct: 8 });
  const e = entry("Mallorca", days);
  const ctx = formatConfidenceContext(e, block({ destinations: [e] }));
  assert.ok(ctx);
  assert.equal(ctx?.isSplit, true);
  assert.equal(ctx?.splitDays, 1);
  assert.equal(ctx?.scoredDays, 7);
  assert.equal(ctx?.maxTempSpread, 4.0);
});

test("formatConfidenceContext — split precip-prob day trips the chip", () => {
  const days: ModelSpreadDay[] = Array.from({ length: 7 }, (_, i) =>
    day({ date: `2026-04-${28 + i}`, temp_spread_c: 0.5, precip_prob_spread_pct: 10 }),
  );
  // 30% prob spread but tiny temp delta → still trips.
  days[4] = day({ date: "2026-05-02", temp_spread_c: 0.4, precip_prob_spread_pct: 30 });
  const e = entry("Mallorca", days);
  const ctx = formatConfidenceContext(e, block({ destinations: [e] }));
  assert.ok(ctx);
  assert.equal(ctx?.splitDays, 1);
  assert.equal(ctx?.maxProbSpread, 30);
});

test("formatConfidenceContext — exactly at threshold (3.0°C) trips", () => {
  const days: ModelSpreadDay[] = Array.from({ length: 7 }, (_, i) =>
    day({ date: `2026-04-${28 + i}`, temp_spread_c: 1.0, precip_prob_spread_pct: 5 }),
  );
  days[0] = day({ date: "2026-04-28", temp_spread_c: 3.0, precip_prob_spread_pct: 5 });
  const e = entry("Mallorca", days);
  const ctx = formatConfidenceContext(e, block({ destinations: [e] }));
  assert.ok(ctx);
  assert.equal(ctx?.splitDays, 1);
});

test("formatConfidenceContext — single-model day is excluded from scored count", () => {
  const days: ModelSpreadDay[] = Array.from({ length: 7 }, (_, i) =>
    day({
      date: `2026-04-${28 + i}`,
      temp_spread_c: 0,
      precip_prob_spread_pct: 0,
      models_count: 1,
    }),
  );
  // Inject one multi-model split day so the chip is shown — but scoredDays
  // should reflect only the multi-model rows.
  days[3] = day({
    date: "2026-05-01",
    temp_spread_c: 4.5,
    precip_prob_spread_pct: 0,
    models_count: 3,
  });
  const e = entry("Mallorca", days);
  const ctx = formatConfidenceContext(e, block({ destinations: [e] }));
  assert.ok(ctx);
  assert.equal(ctx?.scoredDays, 1, "only the one multi-model day was scored");
  assert.equal(ctx?.splitDays, 1);
});

test("formatConfidenceContext — all-single-model entry returns null", () => {
  const e = entry(
    "Mallorca",
    Array.from({ length: 7 }, (_, i) =>
      day({
        date: `2026-04-${28 + i}`,
        models_count: 1,
        temp_spread_c: 0,
        precip_prob_spread_pct: 0,
      }),
    ),
  );
  const ctx = formatConfidenceContext(e, block({ destinations: [e] }));
  assert.equal(ctx, null);
});

test("formatConfidenceContext — only first 7 days are scored", () => {
  // First 7 days are confident; days 8-14 have splits. Should NOT trip.
  const days: ModelSpreadDay[] = [];
  for (let i = 0; i < 7; i++) days.push(day({ date: `2026-04-${28 + i}`, temp_spread_c: 1.0 }));
  for (let i = 7; i < 14; i++)
    days.push(day({ date: `2026-05-${i - 6 + 4}`, temp_spread_c: 6.0 }));
  const e = entry("Mallorca", days);
  const ctx = formatConfidenceContext(e, block({ destinations: [e] }));
  assert.equal(ctx, null);
});

test("formatConfidenceContext — null entry returns null", () => {
  assert.equal(formatConfidenceContext(null, block()), null);
});

test("formatConfidenceContext — null block returns null", () => {
  const e = entry("Mallorca", [day({ temp_spread_c: 5.0 })]);
  assert.equal(formatConfidenceContext(e, null), null);
});

test("formatConfidenceContext — empty days array returns null", () => {
  const e = entry("Mallorca", []);
  assert.equal(formatConfidenceContext(e, block({ destinations: [e] })), null);
});

test("formatConfidenceContext — null spread fields are tolerated (no crash)", () => {
  const days: ModelSpreadDay[] = Array.from({ length: 7 }, (_, i) =>
    day({
      date: `2026-04-${28 + i}`,
      temp_spread_c: null,
      precip_prob_spread_pct: null,
      temp_min: null,
      temp_max: null,
      prob_min: null,
      prob_max: null,
    }),
  );
  const e = entry("Mallorca", days);
  // No usable signal → null.
  const ctx = formatConfidenceContext(e, block({ destinations: [e] }));
  assert.equal(ctx, null);
});

test("findModelSpreadEntry — exact name match", () => {
  const e1 = entry("Mallorca", [day()]);
  const e2 = entry("Girona", [day({ temp_spread_c: 5 })]);
  const b = block({ destinations: [e1, e2] });
  const found = findModelSpreadEntry(b, "Girona");
  assert.equal(found?.name, "Girona");
});

test("findModelSpreadEntry — missing destination returns null", () => {
  const b = block({ destinations: [entry("Mallorca", [day()])] });
  assert.equal(findModelSpreadEntry(b, "Andorra"), null);
});

test("findModelSpreadEntry — null block returns null", () => {
  assert.equal(findModelSpreadEntry(null, "Mallorca"), null);
});

test("renderConfidenceChip — null context returns empty string (silent)", () => {
  assert.equal(renderConfidenceChip(null), "");
});

test("renderConfidenceChip — emits role=note + aria-label + escaped content", () => {
  const ctx: ConfidenceContext = {
    isSplit: true,
    splitDays: 2,
    scoredDays: 7,
    maxTempSpread: 4.5,
    maxProbSpread: 30,
    leadDays: 7,
    models: ["ecmwf_ifs04", "gfs_seamless", "icon_seamless"],
  };
  const html = renderConfidenceChip(ctx);
  assert.match(html, /role="note"/);
  assert.match(html, /aria-label=/);
  assert.match(html, /Split forecast/);
  assert.match(html, /2 of next 7 days/);
  // Friendly model labels rather than raw IDs.
  assert.match(html, /ECMWF/);
  assert.match(html, /GFS/);
  assert.match(html, /ICON/);
});

test("renderConfidenceChip — single split day uses singular 'day'", () => {
  const ctx: ConfidenceContext = {
    isSplit: true,
    splitDays: 1,
    scoredDays: 7,
    maxTempSpread: 3.5,
    maxProbSpread: 10,
    leadDays: 7,
    models: ["ecmwf_ifs04"],
  };
  const html = renderConfidenceChip(ctx);
  assert.match(html, /1 of next 7 day(?!s)/);
});

test("renderConfidenceChip — escapes hostile model strings", () => {
  const ctx: ConfidenceContext = {
    isSplit: true,
    splitDays: 1,
    scoredDays: 7,
    maxTempSpread: 4,
    maxProbSpread: 0,
    leadDays: 7,
    models: ["<script>alert(1)</script>"],
  };
  const html = renderConfidenceChip(ctx);
  assert.ok(!html.includes("<script>"));
});
