// Personal calibration profile (M6).
//
// The threshold dial is honest but opaque: a new visitor sees five sliders +
// a sun-pref radio and has to decide what each number means. The profile
// picker is a higher-level shortcut — five short, plain-language questions
// that map deterministically onto a `DialState` and (transitively) onto the
// `Thresholds` the dial already drives.
//
// This module owns:
//   1. The Profile shape + the canonical answer sets.
//   2. The pure mapping `profileToDialState(profile)` (no DOM, no storage).
//   3. localStorage helpers under the versioned key `cw:profile:v1`.
//
// The picker UI lives in `../components/profile-picker.ts`. It dispatches
// `cwprofile:apply` on window with `detail: { state: DialState }`; the
// existing dial subscribes to that event and runs its own `commit(state)`,
// which already writes to the dial's storage + URL and emits the standard
// `cwthresholds:change` event the rest of the site listens for. So a profile
// apply re-uses the established event vocabulary by design.

import { DEFAULT_THRESHOLDS, type SunPref } from "./qualify.ts";
import { DEFAULT_DIAL_STATE, type DialState, SLIDER_BOUNDS } from "./thresholds.ts";

export const PROFILE_STORAGE_KEY = "cw:profile:v1";

export type HeatPref = "cool" | "mild" | "warm" | "hot";
export type RainTolerance = "dry" | "drizzle" | "any";
export type WindTolerance = "calm" | "moderate" | "blustery";
export type Stringency = "tour" | "comfort" | "any-day";

export interface Profile {
  /** "How hot do you like it?" — drives tempMin. */
  heatPref: HeatPref;
  /** "Rain tolerance" — drives rainMax + probMax together. */
  rainTolerance: RainTolerance;
  /** "Max wind you'll ride in" — drives windMax. */
  windTolerance: WindTolerance;
  /** "Sky preference" — passes through to the dial's sunPref radio. */
  sunPref: SunPref;
  /** "Stringency" — biases the other four toward Tour or any-day cycling. */
  stringency: Stringency;
}

/** Canonical "starter" profile — matches the dial's cycling-comfort defaults. */
export const DEFAULT_PROFILE: Readonly<Profile> = Object.freeze({
  heatPref: "mild",
  rainTolerance: "drizzle",
  windTolerance: "moderate",
  sunPref: DEFAULT_DIAL_STATE.sunPref,
  stringency: "comfort",
});

/** Question metadata — drives the picker UI without hardcoding labels. */
export interface ProfileQuestion<K extends keyof Profile = keyof Profile> {
  key: K;
  question: string;
  hint?: string;
  options: ReadonlyArray<{
    value: Profile[K];
    label: string;
    detail?: string;
  }>;
}

export const PROFILE_QUESTIONS: ReadonlyArray<ProfileQuestion> = [
  {
    key: "heatPref",
    question: "How hot do you like it?",
    hint: "Sets the daily-high floor.",
    options: [
      { value: "cool", label: "Cool", detail: "12°C and up" },
      { value: "mild", label: "Mild", detail: "16°C and up" },
      { value: "warm", label: "Warm", detail: "20°C and up" },
      { value: "hot", label: "Hot", detail: "24°C and up" },
    ],
  } as ProfileQuestion<"heatPref">,
  {
    key: "rainTolerance",
    question: "Rain tolerance",
    hint: "Combines mm/day and forecast probability.",
    options: [
      { value: "dry", label: "Dry only", detail: "0 mm · <10% prob" },
      { value: "drizzle", label: "Drizzle OK", detail: "≤2 mm · <30% prob" },
      { value: "any", label: "I'll ride wet", detail: "up to 10 mm · <80% prob" },
    ],
  } as ProfileQuestion<"rainTolerance">,
  {
    key: "windTolerance",
    question: "Max wind you'll ride in",
    options: [
      { value: "calm", label: "Calm", detail: "<20 km/h" },
      { value: "moderate", label: "Moderate", detail: "<30 km/h" },
      { value: "blustery", label: "Blustery", detail: "<45 km/h" },
    ],
  } as ProfileQuestion<"windTolerance">,
  {
    key: "sunPref",
    question: "Sky",
    hint: "Which weather codes count as ride-worthy.",
    options: [
      { value: "sun", label: "Sun only" },
      { value: "sun-cloud", label: "Sun + cloud" },
      { value: "all-but-rain", label: "Anything but rain" },
      { value: "any", label: "Any" },
    ],
  } as ProfileQuestion<"sunPref">,
  {
    key: "stringency",
    question: "Stringency",
    hint: "Biases the dial toward Tour or any-day cycling.",
    options: [
      { value: "tour", label: "Tour", detail: "tighter — race-day clean" },
      { value: "comfort", label: "Cycling-comfort", detail: "balanced (default)" },
      { value: "any-day", label: "Any-day rider", detail: "relaxed — wider windows" },
    ],
  } as ProfileQuestion<"stringency">,
];

const HEAT_TEMP_MIN: Record<HeatPref, number> = {
  cool: 12,
  mild: 16,
  warm: 20,
  hot: 24,
};

const RAIN_TOLERANCE: Record<RainTolerance, { rainMax: number; probMax: number }> = {
  dry: { rainMax: 0, probMax: 10 },
  drizzle: { rainMax: 2, probMax: 30 },
  any: { rainMax: 10, probMax: 80 },
};

const WIND_TOLERANCE: Record<WindTolerance, number> = {
  calm: 20,
  moderate: 30,
  blustery: 45,
};

// Stringency biases the four numeric thresholds. "Tour" tightens (cooler floor
// raised, rain dropped, prob dropped). "Any-day" loosens. The deltas are
// deliberately modest (≤4°C / ≤2 mm / ≤20 % / ≤5 km/h) so a user who picked
// "warm + dry + calm + tour" still ends up on a sensible dial — not at the
// extreme of the slider range. Final values clamp to SLIDER_BOUNDS so the
// dial slider can render them without out-of-range errors.
const STRINGENCY_BIAS: Record<
  Stringency,
  { tempMin: number; rainMax: number; probMax: number; windMax: number }
> = {
  tour: { tempMin: +4, rainMax: -2, probMax: -10, windMax: -5 },
  comfort: { tempMin: 0, rainMax: 0, probMax: 0, windMax: 0 },
  "any-day": { tempMin: -4, rainMax: +2, probMax: +20, windMax: +5 },
};

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Pure mapping. Same input → same output. No DOM, no storage, no clock.
 * Always returns a DialState whose numeric fields lie inside SLIDER_BOUNDS,
 * so the dial can render it without further validation.
 */
export function profileToDialState(profile: Profile): DialState {
  const baseTemp = HEAT_TEMP_MIN[profile.heatPref];
  const baseRain = RAIN_TOLERANCE[profile.rainTolerance];
  const baseWind = WIND_TOLERANCE[profile.windTolerance];
  const bias = STRINGENCY_BIAS[profile.stringency];
  return {
    tempMin: clamp(baseTemp + bias.tempMin, SLIDER_BOUNDS.tempMin.lo, SLIDER_BOUNDS.tempMin.hi),
    rainMax: clamp(
      baseRain.rainMax + bias.rainMax,
      SLIDER_BOUNDS.rainMax.lo,
      SLIDER_BOUNDS.rainMax.hi,
    ),
    probMax: clamp(
      baseRain.probMax + bias.probMax,
      SLIDER_BOUNDS.probMax.lo,
      SLIDER_BOUNDS.probMax.hi,
    ),
    windMax: clamp(baseWind + bias.windMax, SLIDER_BOUNDS.windMax.lo, SLIDER_BOUNDS.windMax.hi),
    sunPref: profile.sunPref,
  };
}

const HEAT_VALUES: HeatPref[] = ["cool", "mild", "warm", "hot"];
const RAIN_VALUES: RainTolerance[] = ["dry", "drizzle", "any"];
const WIND_VALUES: WindTolerance[] = ["calm", "moderate", "blustery"];
const STRINGENCY_VALUES: Stringency[] = ["tour", "comfort", "any-day"];
const SUN_VALUES: SunPref[] = ["sun", "sun-cloud", "all-but-rain", "any"];

function isHeatPref(v: unknown): v is HeatPref {
  return typeof v === "string" && (HEAT_VALUES as string[]).includes(v);
}
function isRainTolerance(v: unknown): v is RainTolerance {
  return typeof v === "string" && (RAIN_VALUES as string[]).includes(v);
}
function isWindTolerance(v: unknown): v is WindTolerance {
  return typeof v === "string" && (WIND_VALUES as string[]).includes(v);
}
function isStringency(v: unknown): v is Stringency {
  return typeof v === "string" && (STRINGENCY_VALUES as string[]).includes(v);
}
function isSunPref(v: unknown): v is SunPref {
  return typeof v === "string" && (SUN_VALUES as string[]).includes(v);
}

/**
 * Validate-and-normalise an arbitrary blob into a Profile. Returns null when
 * any field is missing or out-of-set. Used as the localStorage gate so a
 * future schema bump (`cw:profile:v2`) can ignore unknown shapes safely.
 */
export function parseProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    isHeatPref(v.heatPref) &&
    isRainTolerance(v.rainTolerance) &&
    isWindTolerance(v.windTolerance) &&
    isSunPref(v.sunPref) &&
    isStringency(v.stringency)
  ) {
    return {
      heatPref: v.heatPref,
      rainTolerance: v.rainTolerance,
      windTolerance: v.windTolerance,
      sunPref: v.sunPref,
      stringency: v.stringency,
    };
  }
  return null;
}

export function readProfileStorage(): Profile | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return parseProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeProfileStorage(profile: Profile): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore (private mode, quota)
  }
}

export function clearProfileStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Reset reverts the dial to canonical defaults. Centralised so the picker
 *  Reset button and the consumer of `cwprofile:apply` agree. */
export function defaultDialState(): DialState {
  return {
    tempMin: DEFAULT_DIAL_STATE.tempMin,
    rainMax: DEFAULT_DIAL_STATE.rainMax,
    probMax: DEFAULT_DIAL_STATE.probMax,
    windMax: DEFAULT_DIAL_STATE.windMax,
    sunPref: DEFAULT_DIAL_STATE.sunPref,
  };
}

// Re-export for convenience so consumers can read defaults without crossing
// modules unnecessarily.
export { DEFAULT_THRESHOLDS };
