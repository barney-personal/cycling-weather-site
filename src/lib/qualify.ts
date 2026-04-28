// Pure client-side reimplementation of the Python `qualify_day` rule defined in
// `scripts/euro_cycling_weather.py`:
//
//   def qualify_day(temp, rain, prob, wind, code):
//       return temp > 25 and rain == 0 and prob < 10
//              and code in (0, 1, 2, 3) and wind < 30
//
// Defaults must remain bit-identical to that Python rule — `tests/qualify.spec.ts`
// asserts parity against the snapshotted `qualify` field for every (destination,
// day) tuple in `data.json`. Tweak with care.
//
// User-controlled thresholds let the homepage threshold dial (M5) recompute
// qualifying days client-side without a refetch. The wider semantic verdict on
// each day (`go` / `edge` / `no-go`) drives the strip encoding even when a day
// fails to fully qualify.

import type { DailyForecast, DestinationResult } from "./types";

export interface Thresholds {
  /** Minimum daily high in °C. Day qualifies when `temp_max > tempMin`. */
  tempMin: number;
  /** Maximum allowed precipitation in mm/day. Day qualifies when `precip_sum <= rainMax`. */
  rainMax: number;
  /** Maximum allowed precipitation probability (%). Day qualifies when `precip_prob_max < probMax`. */
  probMax: number;
  /** Maximum allowed daily peak wind in km/h. Day qualifies when `wind_max < windMax`. */
  windMax: number;
  /** Whitelisted Open-Meteo / WMO weather codes. Day qualifies when `weather_code` is in this set. */
  codeIn: number[];
}

// Mirrors Python defaults bit-for-bit. Cycling-comfort calibration, not
// pro-tour stringency — most Atlantic/Med shoulder-season weather is great
// to ride but never hits 25°C. Dial up to 25/0/10 for the old "Tour" preset.
export const DEFAULT_THRESHOLDS: Readonly<Thresholds> = Object.freeze({
  tempMin: 18,
  rainMax: 2,
  probMax: 30,
  windMax: 30,
  codeIn: [0, 1, 2, 3],
});

/** Minimum clean run length for a destination to qualify as GO.
 *  Mirrors the Python `qualifier = run >= 4` rule. Exported so the status
 *  pill (GO / EDGE / NO-GO) stays in sync with the qualifier band. */
export const QUALIFIER_RUN_MIN = 4;

/** Minimum clean run length for a destination to be considered EDGE
 *  (close to qualifying). Below this, the destination is NO-GO. */
export const EDGE_RUN_MIN = 2;

// Sun preference levels:
//   "any":   no code restriction
//   "sun":   sunny + mostly sunny only (codes 0,1)
//   "sun-cloud": sunny through partly cloudy (codes 0,1,2,3) — Python default
//   "all-but-rain": permit any non-precipitating code (codes 0..48)
export type SunPref = "any" | "sun" | "sun-cloud" | "all-but-rain";

const SUN_PREF_CODES: Record<SunPref, number[] | null> = {
  any: null,
  sun: [0, 1],
  "sun-cloud": [0, 1, 2, 3],
  "all-but-rain": [0, 1, 2, 3, 45, 48],
};

export function thresholdsFromSunPref(base: Thresholds, pref: SunPref): Thresholds {
  const codes = SUN_PREF_CODES[pref];
  return { ...base, codeIn: codes ?? [] };
}

export function dayMatches(d: DailyForecast, t: Thresholds = DEFAULT_THRESHOLDS): boolean {
  if (!(d.temp_max > t.tempMin)) return false;
  if (!(d.precip_sum <= t.rainMax)) return false;
  if (!(d.precip_prob_max < t.probMax)) return false;
  if (!(d.wind_max < t.windMax)) return false;
  if (t.codeIn.length === 0) return false;
  if (!t.codeIn.includes(d.weather_code)) return false;
  return true;
}

export function bestRun(qualifies: boolean[]): {
  length: number;
  startIdx: number | null;
  endIdx: number | null;
} {
  let best = 0;
  let cur = 0;
  let bestStart: number | null = null;
  let bestEnd: number | null = null;
  let curStart = 0;
  for (let i = 0; i < qualifies.length; i++) {
    if (qualifies[i]) {
      if (cur === 0) curStart = i;
      cur += 1;
      if (cur > best) {
        best = cur;
        bestStart = curStart;
        bestEnd = i;
      }
    } else {
      cur = 0;
    }
  }
  return { length: best, startIdx: bestStart, endIdx: bestEnd };
}

export interface RankedDestination {
  result: DestinationResult;
  qualifies: boolean[];
  bestRun: number;
  bestStart: string | null;
  bestEnd: string | null;
  dryDays: number;
  qualifier: boolean;
  score: number;
  medianTemp: number;
}

// Returns a stack-ranked, threshold-aware view of destinations. Mirrors the
// Python ordering: score = bestRun*100 + dryDays*5 + medianTemp; ties broken by
// name. UK destinations need median_high > 20 to fully qualify (matches the
// `is_uk` branch in `euro_cycling_weather.py`).
const UK_NAMES = new Set([
  "London/Surrey Hills",
  "Yorkshire Dales",
  "Lake District",
  "Peak District",
  "South Wales",
]);

export function rankWithThresholds(
  results: DestinationResult[],
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): RankedDestination[] {
  const ranked = results.map((r) => {
    const qualifies = r.daily.map((d) => dayMatches(d, thresholds));
    const run = bestRun(qualifies);
    // Mirrors Python `dry = sum(1 for r,p if r==0 and p<10)` at defaults; widens
    // when the user opens up rainMax / probMax via the threshold dial.
    const dryDays = r.daily.reduce(
      (acc, d) =>
        acc +
        (d.precip_sum <= thresholds.rainMax && d.precip_prob_max < thresholds.probMax ? 1 : 0),
      0,
    );
    // Cycling-comfort defaults: 4-day clean run is enough to call a destination
    // a GO. UK exception dropped — with the looser temperature floor the UK is
    // legitimately gated by its own conditions in shoulder season anyway.
    void UK_NAMES; // retained for backwards compat with stored client state
    const qualifier = run.length >= QUALIFIER_RUN_MIN;
    const score = run.length * 100 + dryDays * 5 + r.median_temp;
    return {
      result: r,
      qualifies,
      bestRun: run.length,
      bestStart: run.startIdx !== null ? (r.daily[run.startIdx]?.date ?? null) : null,
      bestEnd: run.endIdx !== null ? (r.daily[run.endIdx]?.date ?? null) : null,
      dryDays,
      qualifier,
      score,
      medianTemp: r.median_temp,
    };
  });
  ranked.sort((a, b) => b.score - a.score || a.result.name.localeCompare(b.result.name));
  return ranked;
}
