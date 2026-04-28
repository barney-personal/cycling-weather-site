// Parity guarantee: the client-side `qualify.ts` must produce the SAME boolean
// for every (destination, day) tuple in `data.json` as the Python build script
// did. Drift here is silent — users would see "GO" verdicts that don't match
// reality. Run via `node --test --experimental-strip-types`.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { normaliseSiteData } from "../src/lib/data.ts";
import {
  DEFAULT_THRESHOLDS,
  bestRun,
  dayMatches,
  rankWithThresholds,
  thresholdsFromSunPref,
} from "../src/lib/qualify.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function loadData() {
  const raw = JSON.parse(readFileSync(resolve(repoRoot, "data.json"), "utf8"));
  return normaliseSiteData(raw);
}

test("dayMatches with default thresholds matches Python `qualify` field exactly", () => {
  const data = loadData();
  assert.ok(data.latest, "data.json must contain `latest`");
  let checked = 0;
  let mismatches = 0;
  const examples: string[] = [];
  for (const r of data.latest!.results) {
    for (const d of r.daily) {
      const expected = d.qualify;
      const actual = dayMatches(d, DEFAULT_THRESHOLDS);
      checked += 1;
      if (actual !== expected) {
        mismatches += 1;
        if (examples.length < 5) {
          examples.push(
            `${r.name} ${d.date}: expected=${expected} actual=${actual} ` +
              `temp=${d.temp_max} rain=${d.precip_sum} prob=${d.precip_prob_max} ` +
              `wind=${d.wind_max} code=${d.weather_code}`,
          );
        }
      }
    }
  }
  assert.ok(checked > 0, "must check at least one (destination, day) tuple");
  assert.equal(
    mismatches,
    0,
    `qualify.ts diverged from Python on ${mismatches}/${checked} tuples\n${examples.join("\n")}`,
  );
});

test("bestRun finds the longest contiguous true window with correct indices", () => {
  assert.deepEqual(bestRun([]), { length: 0, startIdx: null, endIdx: null });
  assert.deepEqual(bestRun([false, false, false]), { length: 0, startIdx: null, endIdx: null });
  assert.deepEqual(bestRun([true]), { length: 1, startIdx: 0, endIdx: 0 });
  assert.deepEqual(bestRun([true, true, true]), { length: 3, startIdx: 0, endIdx: 2 });
  assert.deepEqual(bestRun([false, true, true, false, true]), {
    length: 2,
    startIdx: 1,
    endIdx: 2,
  });
  // Multiple equal-length runs — first wins.
  assert.deepEqual(bestRun([true, true, false, true, true]), {
    length: 2,
    startIdx: 0,
    endIdx: 1,
  });
});

test("rankWithThresholds reproduces the Python qualifier flag for every destination at defaults", () => {
  const data = loadData();
  assert.ok(data.latest);
  const ranked = rankWithThresholds(data.latest!.results, DEFAULT_THRESHOLDS);
  assert.equal(ranked.length, data.latest!.results.length);
  for (const row of ranked) {
    assert.equal(
      row.qualifier,
      row.result.qualifier,
      `qualifier divergence on ${row.result.name}: client=${row.qualifier} python=${row.result.qualifier}`,
    );
  }
});

test("rankWithThresholds reproduces dry_days, best_run, score at defaults", () => {
  const data = loadData();
  assert.ok(data.latest);
  const ranked = rankWithThresholds(data.latest!.results, DEFAULT_THRESHOLDS);
  for (const row of ranked) {
    assert.equal(
      row.dryDays,
      row.result.dry_days,
      `dry_days divergence on ${row.result.name}: client=${row.dryDays} python=${row.result.dry_days}`,
    );
    assert.equal(
      row.bestRun,
      row.result.best_run,
      `best_run divergence on ${row.result.name}: client=${row.bestRun} python=${row.result.best_run}`,
    );
    // Score is best_run*100 + dry*5 + median_temp; allow 1e-9 epsilon for
    // floating-point noise (Python's median may differ from JS arithmetic in
    // the last bit).
    assert.ok(
      Math.abs(row.score - row.result.score) < 1e-6,
      `score divergence on ${row.result.name}: client=${row.score} python=${row.result.score}`,
    );
  }
});

test("rankWithThresholds preserves Python's score-then-name ordering at defaults", () => {
  const data = loadData();
  assert.ok(data.latest);
  const pythonOrder = [...data.latest!.results]
    .map((r) => ({ name: r.name, score: r.score }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((r) => r.name);
  const ranked = rankWithThresholds(data.latest!.results, DEFAULT_THRESHOLDS);
  assert.deepEqual(
    ranked.map((r) => r.result.name),
    pythonOrder,
    "client ranking order must match score-desc, name-asc",
  );
});

test("dayMatches is monotone in tempMin (lowering tempMin only adds qualifying days)", () => {
  const data = loadData();
  assert.ok(data.latest);
  let totalAtDefault = 0;
  let totalAtZero = 0;
  for (const r of data.latest!.results) {
    for (const d of r.daily) {
      if (dayMatches(d, DEFAULT_THRESHOLDS)) totalAtDefault += 1;
      if (dayMatches(d, { ...DEFAULT_THRESHOLDS, tempMin: 0 })) totalAtZero += 1;
    }
  }
  assert.ok(
    totalAtZero >= totalAtDefault,
    `lowering tempMin should not lose qualifying days (default=${totalAtDefault} relaxed=${totalAtZero})`,
  );
});

test("thresholdsFromSunPref widens or narrows the code whitelist as expected", () => {
  const sun = thresholdsFromSunPref(DEFAULT_THRESHOLDS, "sun");
  assert.deepEqual(sun.codeIn, [0, 1]);
  const sunCloud = thresholdsFromSunPref(DEFAULT_THRESHOLDS, "sun-cloud");
  assert.deepEqual(sunCloud.codeIn, [0, 1, 2, 3]);
  const allButRain = thresholdsFromSunPref(DEFAULT_THRESHOLDS, "all-but-rain");
  assert.deepEqual(allButRain.codeIn, [0, 1, 2, 3, 45, 48]);
  const any = thresholdsFromSunPref(DEFAULT_THRESHOLDS, "any");
  assert.deepEqual(any.codeIn, []);
});
