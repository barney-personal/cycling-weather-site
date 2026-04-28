// URL-wins precedence is the documented contract for the threshold dial:
// a shared `?temp=15&...` link is the strongest signal of explicit user
// intent and must override any value previously stashed in localStorage.
// Drift here is silent — the user's link recipient would see a different
// dial state than expected. Run via `node --test --experimental-strip-types`.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  DEFAULT_DIAL_STATE,
  type DialState,
  dialStateEquals,
  dialStateToThresholds,
  readDialFromParams,
  resolveInitialDialState,
  writeDialParams,
} from "../src/lib/thresholds.ts";

test("resolveInitialDialState — URL wins over storage", () => {
  const state = resolveInitialDialState(undefined, {
    url: { tempMin: 15 },
    storage: { tempMin: 22 },
  });
  assert.equal(state.tempMin, 15);
});

test("resolveInitialDialState — storage fills in when URL omits a key", () => {
  const state = resolveInitialDialState(undefined, {
    url: { tempMin: 15 },
    storage: { rainMax: 4, sunPref: "all-but-rain" },
  });
  assert.equal(state.tempMin, 15, "URL still wins for tempMin");
  assert.equal(state.rainMax, 4, "storage fills rainMax");
  assert.equal(state.sunPref, "all-but-rain", "storage fills sunPref");
});

test("resolveInitialDialState — defaults apply when neither URL nor storage set", () => {
  const state = resolveInitialDialState(undefined, { url: {}, storage: {} });
  assert.equal(state.tempMin, DEFAULT_DIAL_STATE.tempMin);
  assert.equal(state.rainMax, DEFAULT_DIAL_STATE.rainMax);
  assert.equal(state.probMax, DEFAULT_DIAL_STATE.probMax);
  assert.equal(state.windMax, DEFAULT_DIAL_STATE.windMax);
  assert.equal(state.sunPref, DEFAULT_DIAL_STATE.sunPref);
});

test("resolveInitialDialState — out-of-bounds values clamp to slider bounds", () => {
  const state = resolveInitialDialState(undefined, {
    url: { tempMin: 999, rainMax: -5, probMax: 250, windMax: 5 },
    storage: {},
  });
  assert.equal(state.tempMin, 35, "tempMin clamped to upper bound");
  assert.equal(state.rainMax, 0, "rainMax clamped to lower bound");
  assert.equal(state.probMax, 100, "probMax clamped to upper bound");
  assert.equal(state.windMax, 10, "windMax clamped to lower bound (10 is the floor)");
});

test("resolveInitialDialState — non-finite or malformed values fall back to defaults", () => {
  const state = resolveInitialDialState(undefined, {
    url: { tempMin: Number.NaN as unknown as number },
    storage: {},
  });
  assert.equal(state.tempMin, DEFAULT_DIAL_STATE.tempMin);
});

test("readDialFromParams parses ?temp=&rain=&prob=&wind=&sun= into a partial state", () => {
  const params = new URLSearchParams("temp=15&rain=2&prob=30&wind=25&sun=sun-cloud");
  const partial = readDialFromParams(params);
  assert.equal(partial.tempMin, 15);
  assert.equal(partial.rainMax, 2);
  assert.equal(partial.probMax, 30);
  assert.equal(partial.windMax, 25);
  assert.equal(partial.sunPref, "sun-cloud");
});

test("writeDialParams strips keys when state matches defaults; writes all keys when dirty", () => {
  const clean = new URLSearchParams("temp=20&other=keep");
  writeDialParams(clean, { ...DEFAULT_DIAL_STATE });
  assert.equal(clean.has("temp"), false, "temp removed when matching default");
  assert.equal(clean.get("other"), "keep", "unrelated params preserved");

  const dirty = new URLSearchParams();
  const dirtyState: DialState = { ...DEFAULT_DIAL_STATE, tempMin: 15 };
  writeDialParams(dirty, dirtyState);
  assert.equal(dirty.get("temp"), "15");
  assert.equal(dirty.get("rain"), String(DEFAULT_DIAL_STATE.rainMax));
  assert.equal(dirty.get("sun"), DEFAULT_DIAL_STATE.sunPref);
});

test("dialStateEquals returns true for structurally equal states, false otherwise", () => {
  const a: DialState = { ...DEFAULT_DIAL_STATE };
  const b: DialState = { ...DEFAULT_DIAL_STATE };
  assert.equal(dialStateEquals(a, b), true);
  b.tempMin += 1;
  assert.equal(dialStateEquals(a, b), false);
});

test("dialStateToThresholds maps sun-pref to the documented codeIn whitelist", () => {
  const t1 = dialStateToThresholds({ ...DEFAULT_DIAL_STATE, sunPref: "sun" });
  assert.deepEqual([...t1.codeIn].sort((x, y) => x - y), [0, 1]);

  const t2 = dialStateToThresholds({ ...DEFAULT_DIAL_STATE, sunPref: "sun-cloud" });
  assert.deepEqual([...t2.codeIn].sort((x, y) => x - y), [0, 1, 2, 3]);

  const t3 = dialStateToThresholds({ ...DEFAULT_DIAL_STATE, sunPref: "all-but-rain" });
  assert.ok(t3.codeIn.length >= 6, "all-but-rain widens to ≥6 codes (sun + clouds + fog)");

  // `any` returns an empty whitelist; dayMatches() then rejects every day —
  // intentional, used as a "show all without qualifier" marker upstream.
  const t4 = dialStateToThresholds({ ...DEFAULT_DIAL_STATE, sunPref: "any" });
  assert.equal(t4.codeIn.length, 0, "any → empty whitelist (semantic: no qualifier)");
});
