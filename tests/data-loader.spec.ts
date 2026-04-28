// Backwards-compat regression: ensure `normaliseSiteData` accepts both the
// legacy pre-M2 schema (missing version/hero/changelog/narratives/slug) and
// the new schema. Run via `node --test --experimental-strip-types`.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { normaliseSiteData, slugify } from "../src/lib/data.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function loadJson(rel: string): unknown {
  return JSON.parse(readFileSync(resolve(repoRoot, rel), "utf8"));
}

test("normaliseSiteData accepts the latest schema (v3 with climatology + hourly)", () => {
  const raw = loadJson("data.json") as Record<string, unknown>;
  const out = normaliseSiteData(raw);

  assert.ok(out.version >= 2, `version >= 2 (got ${out.version})`);
  assert.ok(out.latest, "latest must be present");
  assert.equal(out.latest!.results.length, 22);
  assert.ok(
    out.latest!.results.every((r) => typeof r.slug === "string" && r.slug.length > 0),
    "every result has a non-empty slug",
  );

  assert.ok(out.hero, "hero must be present");
  assert.ok(["go", "edge", "no-go"].includes(out.hero!.verdict));
  assert.ok(out.hero!.editorial.length > 0, "hero editorial copy is set");
  assert.equal(typeof out.hero!.go_count, "number");
  assert.equal(typeof out.hero!.total_count, "number");
  assert.equal(out.hero!.total_count, 22);

  assert.ok(Array.isArray(out.changelog), "changelog is an array");
  assert.equal(out.changelog.length, 22);
  assert.ok(
    out.changelog.every((c) => typeof c.slug === "string" && typeof c.rank_now === "number"),
    "every changelog entry has slug + rank_now",
  );

  assert.ok(Array.isArray(out.narratives), "narratives is an array");

  const firstResult = out.latest!.results[0]!;
  const firstDay = firstResult.daily[0]!;
  assert.ok(Array.isArray(firstDay.hourly), "daily entry has hourly array");
  assert.ok(firstDay.hourly.length > 0, "hourly array is populated");
  const h0 = firstDay.hourly[0]!;
  assert.equal(typeof h0.time, "string", "hourly.time is string");
  assert.equal(typeof h0.temp, "number", "hourly.temp is number");
  assert.equal(typeof h0.precip, "number", "hourly.precip is number");
  assert.equal(typeof h0.precip_prob, "number", "hourly.precip_prob is number");
  assert.equal(typeof h0.wind, "number", "hourly.wind is number");
  assert.equal(typeof h0.code, "number", "hourly.code is number");

  // v3: climatology block (optional, but expected on the live data.json).
  if (out.version >= 3) {
    assert.ok(out.climatology, "climatology block present at v3");
    assert.equal(typeof out.climatology!.window_label, "string");
    assert.ok(out.climatology!.destinations.length >= 22, "≥22 destinations rolled up");
    const sample = out.climatology!.destinations[0]!;
    assert.equal(typeof sample.name, "string");
    assert.ok(sample.median_temp_max === null || typeof sample.median_temp_max === "number");
    assert.equal(typeof sample.sample_size, "number");
  }
});

test("normaliseSiteData tolerates legacy pre-M2 schema (no version/hero/changelog)", () => {
  const raw = loadJson("tests/fixtures/data-v0.json") as Record<string, unknown>;

  // Sanity: confirm the fixture really is missing the new fields.
  assert.equal((raw as { version?: unknown }).version, undefined, "fixture is pre-M2");
  assert.equal((raw as { hero?: unknown }).hero, undefined, "fixture has no hero block");

  const out = normaliseSiteData(raw);

  assert.equal(out.version, 0, "missing version defaults to 0");
  assert.ok(out.latest, "latest still loads");
  assert.equal(out.latest!.results.length, 22);

  // Loader synthesises slugs from names so downstream can route safely.
  for (const r of out.latest!.results) {
    assert.ok(r.slug && r.slug.length > 0, `${r.name} got a synthetic slug`);
    assert.equal(r.slug, slugify(r.name), `slug for ${r.name} is deterministic`);
  }

  // Hero is reconstructed from `latest` when absent.
  assert.ok(out.hero, "hero is reconstructed from latest");
  assert.equal(out.hero!.total_count, 22);
  assert.ok(["go", "edge", "no-go"].includes(out.hero!.verdict));

  // Missing optional collections become empty arrays, not undefined.
  assert.ok(Array.isArray(out.changelog) && out.changelog.length === 0);
  assert.ok(Array.isArray(out.narratives) && out.narratives.length === 0);

  // v1 data has no hourly → normaliser supplies empty arrays (v1 fallback).
  for (const r of out.latest!.results) {
    for (const d of r.daily) {
      assert.ok(Array.isArray(d.hourly), `${r.name} ${d.date} hourly is array`);
      assert.equal(d.hourly.length, 0, `${r.name} ${d.date} hourly is empty for v1`);
    }
  }

  // v1 has no climatology block — must surface as null (caller renders nothing).
  assert.equal(out.climatology, null, "climatology is null on legacy v1 schema");
});

test("normaliseSiteData survives malformed input without throwing", () => {
  const out = normaliseSiteData({});
  assert.equal(out.version, 0);
  assert.equal(out.latest, null);
  assert.equal(out.hero, null);
  assert.deepEqual(out.changelog, []);
  assert.deepEqual(out.narratives, []);
  assert.deepEqual(out.calibration, []);
  assert.deepEqual(out.actuals_timeline, []);
  assert.deepEqual(out.snapshots, []);
  assert.equal(out.climatology, null);
});

test("slugify handles unicode + punctuation", () => {
  assert.equal(slugify("Côte d'Azur"), "c-te-d-azur");
  assert.equal(slugify("San Francisco"), "san-francisco");
  assert.equal(slugify("  --foo--  "), "foo");
  assert.equal(slugify(""), "destination");
});
