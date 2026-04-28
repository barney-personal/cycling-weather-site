// Cron-output validation has teeth — paired test for scripts/cron-validate.mjs.
//
// scripts/cron-sim.mjs invokes the python build script and feeds the
// regenerated data.json into validateCronOutput. To prove this gate
// would catch a regression — not silently rubber-stamp it — this spec
// loads the live data.json (which must validate), then deliberately
// corrupts it in well-known ways (the "Tenerife points at Mt Teide"
// class of bug) and asserts each corruption is caught.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// @ts-expect-error — .mjs without a .d.mts; the validator is JS-only.
import { validateCronOutput } from "../scripts/cron-validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function loadLive(): any {
  return JSON.parse(readFileSync(resolve(repoRoot, "data.json"), "utf8"));
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

test("live data.json validates cleanly", () => {
  const live = loadLive();
  const v = validateCronOutput(live);
  assert.equal(v.ok, true, `live data.json should validate: ${v.failures.join(", ")}`);
});

test("rejects non-object input", () => {
  for (const bad of [null, undefined, 7, "string", []]) {
    const v = validateCronOutput(bad);
    assert.equal(v.ok, false, `should reject ${typeof bad}: ${JSON.stringify(bad)}`);
    assert.ok(v.failures.length >= 1, "should report at least one failure");
  }
});

test("rejects missing version", () => {
  const live = loadLive();
  delete live.version;
  const v = validateCronOutput(live);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f: string) => /version/i.test(f)));
});

test("rejects version below v4 (the post-M7 floor)", () => {
  const live = loadLive();
  live.version = 3;
  const v = validateCronOutput(live);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f: string) => /version is 3/.test(f)));
});

test("rejects fewer than 22 destinations", () => {
  const live = loadLive();
  live.latest.results = live.latest.results.slice(0, 10);
  const v = validateCronOutput(live);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f: string) => /destinations/i.test(f)));
});

test("rejects destination missing slug", () => {
  const live = loadLive();
  delete live.latest.results[0].slug;
  const v = validateCronOutput(live);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f: string) => /slug/i.test(f)));
});

test("catches Tenerife → Mt Teide regression (lat/lon out of band)", () => {
  // Mt Teide summit is at 28.27°N, 16.64°W — inside the Tenerife-island
  // bounding box [27.5–28.8, -17.5 to -16.0] (it's the volcano in the
  // middle of the island), so this exact regression alone wouldn't fail
  // the bands — the historical bug also placed the marker at a non-
  // representative point. To exercise the bands we use a clearly-wrong
  // coordinate (e.g. the Sahara) — the M12 plan calls this the
  // "Tenerife-points-at-Mt-Teide-CLASS" of regression.
  const live = loadLive();
  const tenerife = live.latest.results.find((r: any) => r.name === "Tenerife");
  assert.ok(tenerife, "live data.json must have a Tenerife destination");
  // Move it to the Sahara (~25°N, 5°E)
  const corrupt = clone(live);
  const t2 = corrupt.latest.results.find((r: any) => r.name === "Tenerife");
  t2.lat = 25;
  t2.lon = 5;
  const v = validateCronOutput(corrupt);
  assert.equal(v.ok, false);
  assert.ok(
    v.failures.some((f: string) => /Tenerife/.test(f) && /lat|lon/.test(f)),
    `should flag Tenerife coordinate regression, got: ${v.failures.join(" | ")}`,
  );
});

test("catches lat/lon swap (rough proxy: lat in lon's range)", () => {
  // Cyprus lat 35.0, lon 33.4 — swapping puts lat at 33 (just below
  // the 34.4–35.7 band) and lon at 35 (above the 32.2–34.7 band).
  const live = loadLive();
  const cyprus = live.latest.results.find((r: any) => r.name === "Cyprus");
  assert.ok(cyprus, "live data.json must have a Cyprus destination");
  const corrupt = clone(live);
  const c2 = corrupt.latest.results.find((r: any) => r.name === "Cyprus");
  const tmp = c2.lat;
  c2.lat = c2.lon;
  c2.lon = tmp;
  const v = validateCronOutput(corrupt);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f: string) => /Cyprus/.test(f)));
});

test("catches malformed hourly entry (missing temp)", () => {
  const live = loadLive();
  const dest = live.latest.results.find(
    (r: any) => r.daily?.some((d: any) => d.hourly?.length > 0),
  );
  if (!dest) return; // skip if hourly not populated yet
  const corrupt = clone(live);
  const d2 = corrupt.latest.results.find((r: any) => r.name === dest.name);
  const day = d2.daily.find((d: any) => d.hourly?.length > 0);
  delete day.hourly[0].temp;
  const v = validateCronOutput(corrupt);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f: string) => /hourly.*temp/i.test(f)));
});

test("catches malformed climatology block (empty destinations)", () => {
  const live = loadLive();
  if (!live.climatology) return; // skip if climatology not populated yet
  const corrupt = clone(live);
  corrupt.climatology.destinations = [];
  const v = validateCronOutput(corrupt);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f: string) => /climatology/i.test(f)));
});

test("catches malformed model_spread block (missing models array)", () => {
  const live = loadLive();
  if (!live.model_spread) return; // skip if model_spread not populated yet
  const corrupt = clone(live);
  corrupt.model_spread.models = [];
  const v = validateCronOutput(corrupt);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f: string) => /model_spread.*models/i.test(f)));
});

test("catches malformed model_spread day (missing date)", () => {
  const live = loadLive();
  if (!live.model_spread) return;
  const corrupt = clone(live);
  const dest = corrupt.model_spread.destinations.find((d: any) => d.days?.length > 0);
  if (!dest) return;
  delete dest.days[0].date;
  const v = validateCronOutput(corrupt);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f: string) => /model_spread.*date/i.test(f)));
});

test("returns failures as array of strings, never throws", () => {
  // Hostile fuzz-style inputs shouldn't crash the validator.
  const inputs = [
    {},
    { version: "string" },
    { version: 4, latest: null },
    { version: 4, latest: { results: "not-array" } },
    { version: 4, latest: { results: [{ name: 1, lat: "x" }] } },
  ];
  for (const i of inputs) {
    const v = validateCronOutput(i);
    assert.equal(typeof v.ok, "boolean");
    assert.ok(Array.isArray(v.failures));
    for (const f of v.failures) assert.equal(typeof f, "string");
  }
});
