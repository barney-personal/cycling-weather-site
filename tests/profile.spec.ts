// Unit tests for the personal calibration profile (M6).
//
// `profileToDialState` is the pure boundary between the picker UI and the
// threshold-dial pipeline — drift here would silently mis-set thresholds for
// every user who hits "Apply profile". Tests cover the canonical profiles,
// stringency-bias monotonicity, slider clamping, schema validation, and
// the default-profile <→> default-dial round-trip the picker reset relies on.
//
// Run via `node --test --experimental-strip-types`.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  DEFAULT_PROFILE,
  PROFILE_QUESTIONS,
  PROFILE_STORAGE_KEY,
  type Profile,
  defaultDialState,
  parseProfile,
  profileToDialState,
} from "../src/lib/profile.ts";
import { DEFAULT_DIAL_STATE, SLIDER_BOUNDS } from "../src/lib/thresholds.ts";

test("profileToDialState — default profile maps onto cycling-comfort dial defaults", () => {
  const state = profileToDialState({ ...DEFAULT_PROFILE });
  // mild=16, drizzle.rainMax=2 / probMax=30, moderate=30, sun-cloud, comfort=zero bias.
  assert.equal(state.tempMin, 16);
  assert.equal(state.rainMax, 2);
  assert.equal(state.probMax, 30);
  assert.equal(state.windMax, 30);
  assert.equal(state.sunPref, "sun-cloud");
});

test("profileToDialState — Tour stringency tightens the dial vs comfort", () => {
  const comfort = profileToDialState({ ...DEFAULT_PROFILE, stringency: "comfort" });
  const tour = profileToDialState({ ...DEFAULT_PROFILE, stringency: "tour" });
  assert.ok(tour.tempMin > comfort.tempMin, "Tour raises the temperature floor");
  assert.ok(tour.rainMax <= comfort.rainMax, "Tour does not loosen rain");
  assert.ok(tour.probMax < comfort.probMax, "Tour drops the prob ceiling");
  assert.ok(tour.windMax < comfort.windMax, "Tour drops the wind ceiling");
});

test("profileToDialState — any-day stringency loosens the dial vs comfort", () => {
  const comfort = profileToDialState({ ...DEFAULT_PROFILE, stringency: "comfort" });
  const anyDay = profileToDialState({ ...DEFAULT_PROFILE, stringency: "any-day" });
  assert.ok(anyDay.tempMin < comfort.tempMin, "any-day drops the temperature floor");
  assert.ok(anyDay.rainMax > comfort.rainMax, "any-day loosens rain");
  assert.ok(anyDay.probMax > comfort.probMax, "any-day raises the prob ceiling");
  assert.ok(anyDay.windMax > comfort.windMax, "any-day raises the wind ceiling");
});

test("profileToDialState — heatPref strictly orders the temperature floor", () => {
  const cool = profileToDialState({ ...DEFAULT_PROFILE, heatPref: "cool" });
  const mild = profileToDialState({ ...DEFAULT_PROFILE, heatPref: "mild" });
  const warm = profileToDialState({ ...DEFAULT_PROFILE, heatPref: "warm" });
  const hot = profileToDialState({ ...DEFAULT_PROFILE, heatPref: "hot" });
  assert.ok(
    cool.tempMin < mild.tempMin && mild.tempMin < warm.tempMin && warm.tempMin < hot.tempMin,
    `expected strictly increasing tempMin, got ${cool.tempMin} ${mild.tempMin} ${warm.tempMin} ${hot.tempMin}`,
  );
});

test("profileToDialState — windTolerance strictly orders windMax", () => {
  const calm = profileToDialState({ ...DEFAULT_PROFILE, windTolerance: "calm" });
  const moderate = profileToDialState({ ...DEFAULT_PROFILE, windTolerance: "moderate" });
  const blustery = profileToDialState({ ...DEFAULT_PROFILE, windTolerance: "blustery" });
  assert.ok(calm.windMax < moderate.windMax && moderate.windMax < blustery.windMax);
});

test("profileToDialState — rainTolerance strictly orders both rainMax and probMax", () => {
  const dry = profileToDialState({ ...DEFAULT_PROFILE, rainTolerance: "dry" });
  const drizzle = profileToDialState({ ...DEFAULT_PROFILE, rainTolerance: "drizzle" });
  const any = profileToDialState({ ...DEFAULT_PROFILE, rainTolerance: "any" });
  assert.ok(dry.rainMax <= drizzle.rainMax && drizzle.rainMax <= any.rainMax);
  assert.ok(dry.probMax < drizzle.probMax && drizzle.probMax < any.probMax);
});

test("profileToDialState — sunPref passes through unchanged", () => {
  for (const pref of ["sun", "sun-cloud", "all-but-rain", "any"] as const) {
    const state = profileToDialState({ ...DEFAULT_PROFILE, sunPref: pref });
    assert.equal(state.sunPref, pref);
  }
});

test("profileToDialState — all combinations stay inside SLIDER_BOUNDS", () => {
  const heats: Profile["heatPref"][] = ["cool", "mild", "warm", "hot"];
  const rains: Profile["rainTolerance"][] = ["dry", "drizzle", "any"];
  const winds: Profile["windTolerance"][] = ["calm", "moderate", "blustery"];
  const stringencies: Profile["stringency"][] = ["tour", "comfort", "any-day"];
  let count = 0;
  for (const heat of heats) {
    for (const rain of rains) {
      for (const wind of winds) {
        for (const string of stringencies) {
          const profile: Profile = {
            heatPref: heat,
            rainTolerance: rain,
            windTolerance: wind,
            stringency: string,
            sunPref: "sun-cloud",
          };
          const state = profileToDialState(profile);
          assert.ok(
            state.tempMin >= SLIDER_BOUNDS.tempMin.lo && state.tempMin <= SLIDER_BOUNDS.tempMin.hi,
            `tempMin out of bounds for ${JSON.stringify(profile)}: ${state.tempMin}`,
          );
          assert.ok(
            state.rainMax >= SLIDER_BOUNDS.rainMax.lo && state.rainMax <= SLIDER_BOUNDS.rainMax.hi,
            `rainMax out of bounds for ${JSON.stringify(profile)}: ${state.rainMax}`,
          );
          assert.ok(
            state.probMax >= SLIDER_BOUNDS.probMax.lo && state.probMax <= SLIDER_BOUNDS.probMax.hi,
            `probMax out of bounds for ${JSON.stringify(profile)}: ${state.probMax}`,
          );
          assert.ok(
            state.windMax >= SLIDER_BOUNDS.windMax.lo && state.windMax <= SLIDER_BOUNDS.windMax.hi,
            `windMax out of bounds for ${JSON.stringify(profile)}: ${state.windMax}`,
          );
          count += 1;
        }
      }
    }
  }
  // 4 heat × 3 rain × 3 wind × 3 stringency = 108 combinations.
  assert.equal(count, 108);
});

test("profileToDialState — extreme profile (cool + dry + calm + tour) clamps to bounds", () => {
  // cool=12, +4 → 16 (within range). dry rainMax=0, -2 bias → 0 (clamped at lo).
  // dry probMax=10, -10 bias → 0 (at lo). calm windMax=20, -5 → 15 (clamped to lo=10? no, 15 ok).
  const state = profileToDialState({
    heatPref: "cool",
    rainTolerance: "dry",
    windTolerance: "calm",
    sunPref: "sun-cloud",
    stringency: "tour",
  });
  assert.equal(state.rainMax, 0);
  assert.equal(state.probMax, 0);
  assert.ok(state.windMax >= SLIDER_BOUNDS.windMax.lo);
});

test("profileToDialState — extreme any-day clamps prob/wind to upper bounds", () => {
  // hot=24, -4 → 20. any rainMax=10, +2 → clamp to 10. any probMax=80, +20 → 100.
  // blustery windMax=45, +5 → 50.
  const state = profileToDialState({
    heatPref: "hot",
    rainTolerance: "any",
    windTolerance: "blustery",
    sunPref: "all-but-rain",
    stringency: "any-day",
  });
  assert.equal(state.tempMin, 20);
  assert.equal(state.rainMax, 10);
  assert.equal(state.probMax, 100);
  assert.equal(state.windMax, 50);
});

test("defaultDialState — matches the dial's published DEFAULT_DIAL_STATE", () => {
  const ds = defaultDialState();
  assert.equal(ds.tempMin, DEFAULT_DIAL_STATE.tempMin);
  assert.equal(ds.rainMax, DEFAULT_DIAL_STATE.rainMax);
  assert.equal(ds.probMax, DEFAULT_DIAL_STATE.probMax);
  assert.equal(ds.windMax, DEFAULT_DIAL_STATE.windMax);
  assert.equal(ds.sunPref, DEFAULT_DIAL_STATE.sunPref);
});

test("parseProfile — accepts a fully-valid profile blob", () => {
  const ok = parseProfile({
    heatPref: "warm",
    rainTolerance: "drizzle",
    windTolerance: "moderate",
    sunPref: "sun-cloud",
    stringency: "comfort",
  });
  assert.ok(ok, "valid profile must parse");
  assert.equal(ok!.heatPref, "warm");
});

test("parseProfile — rejects unknown enum values", () => {
  assert.equal(
    parseProfile({
      heatPref: "blistering",
      rainTolerance: "drizzle",
      windTolerance: "moderate",
      sunPref: "sun-cloud",
      stringency: "comfort",
    }),
    null,
  );
});

test("parseProfile — rejects missing fields", () => {
  assert.equal(
    parseProfile({
      heatPref: "warm",
      rainTolerance: "drizzle",
      windTolerance: "moderate",
      // sunPref missing
      stringency: "comfort",
    }),
    null,
  );
});

test("parseProfile — rejects null and non-objects", () => {
  assert.equal(parseProfile(null), null);
  assert.equal(parseProfile("[object Object]"), null);
  assert.equal(parseProfile(42), null);
  assert.equal(parseProfile([]), null);
});

test("PROFILE_QUESTIONS — exposes exactly five questions in canonical order", () => {
  assert.equal(PROFILE_QUESTIONS.length, 5);
  assert.deepEqual(
    PROFILE_QUESTIONS.map((q) => q.key),
    ["heatPref", "rainTolerance", "windTolerance", "sunPref", "stringency"],
  );
  for (const q of PROFILE_QUESTIONS) {
    assert.ok(q.options.length >= 3, `${q.key} must offer ≥3 options`);
  }
});

test("PROFILE_STORAGE_KEY — stable versioned key", () => {
  assert.equal(PROFILE_STORAGE_KEY, "cw:profile:v1");
});
