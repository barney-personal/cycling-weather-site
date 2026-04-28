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

test("normaliseSiteData accepts the post-M2 schema verbatim", () => {
  const raw = loadJson("data.json") as Record<string, unknown>;
  const out = normaliseSiteData(raw);

  assert.equal(out.version, 1);
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
});

test("slugify handles unicode + punctuation", () => {
  assert.equal(slugify("Côte d'Azur"), "c-te-d-azur");
  assert.equal(slugify("San Francisco"), "san-francisco");
  assert.equal(slugify("  --foo--  "), "foo");
  assert.equal(slugify(""), "destination");
});
