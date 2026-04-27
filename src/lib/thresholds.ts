// Shared URL-state encoding for the threshold dial. The homepage, compare,
// and plan pages all read the same `?temp=&rain=&prob=&wind=&sun=` convention
// so a link copied from one page is meaningful on the others.
//
// `threshold-dial.ts` owns the visible widget; this module owns the parser
// + storage helpers it (and any other consumer page) depends on. URL wins
// over localStorage on conflict — a shared link is the user's most explicit
// choice.

import {
  DEFAULT_THRESHOLDS,
  type SunPref,
  type Thresholds,
  thresholdsFromSunPref,
} from "./qualify";

export const THRESHOLDS_STORAGE_KEY = "cw-thresholds";

export const URL_KEYS = ["temp", "rain", "prob", "wind", "sun"] as const;
export type ThresholdUrlKey = (typeof URL_KEYS)[number];

export interface DialState {
  tempMin: number;
  rainMax: number;
  probMax: number;
  windMax: number;
  sunPref: SunPref;
}

export const DEFAULT_DIAL_STATE: Readonly<DialState> = Object.freeze({
  tempMin: DEFAULT_THRESHOLDS.tempMin,
  rainMax: DEFAULT_THRESHOLDS.rainMax,
  probMax: DEFAULT_THRESHOLDS.probMax,
  windMax: DEFAULT_THRESHOLDS.windMax,
  sunPref: "sun-cloud",
});

export const SLIDER_BOUNDS = {
  tempMin: { lo: 0, hi: 35 },
  rainMax: { lo: 0, hi: 10 },
  probMax: { lo: 0, hi: 100 },
  windMax: { lo: 10, hi: 60 },
} as const;

function clampNumber(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

export function isSunPref(v: unknown): v is SunPref {
  return v === "sun" || v === "sun-cloud" || v === "all-but-rain" || v === "any";
}

export function dialStateEquals(a: DialState, b: DialState): boolean {
  return (
    a.tempMin === b.tempMin &&
    a.rainMax === b.rainMax &&
    a.probMax === b.probMax &&
    a.windMax === b.windMax &&
    a.sunPref === b.sunPref
  );
}

export function dialStateToThresholds(state: DialState): Thresholds {
  return thresholdsFromSunPref(
    {
      tempMin: state.tempMin,
      rainMax: state.rainMax,
      probMax: state.probMax,
      windMax: state.windMax,
      codeIn: DEFAULT_THRESHOLDS.codeIn,
    },
    state.sunPref,
  );
}

export function readDialStorage(): Partial<DialState> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Partial<DialState>;
  } catch {
    return {};
  }
}

export function writeDialStorage(state: DialState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

export function readDialFromParams(params: URLSearchParams): Partial<DialState> {
  const out: Partial<DialState> = {};
  if (params.has("temp")) out.tempMin = Number(params.get("temp"));
  if (params.has("rain")) out.rainMax = Number(params.get("rain"));
  if (params.has("prob")) out.probMax = Number(params.get("prob"));
  if (params.has("wind")) out.windMax = Number(params.get("wind"));
  const sun = params.get("sun");
  if (sun && isSunPref(sun)) out.sunPref = sun;
  return out;
}

export function readDialUrl(): Partial<DialState> {
  if (typeof location === "undefined") return {};
  return readDialFromParams(new URLSearchParams(location.search));
}

export function writeDialParams(params: URLSearchParams, state: DialState): void {
  if (dialStateEquals(state, DEFAULT_DIAL_STATE)) {
    for (const k of URL_KEYS) params.delete(k);
    return;
  }
  params.set("temp", String(state.tempMin));
  params.set("rain", String(state.rainMax));
  params.set("prob", String(state.probMax));
  params.set("wind", String(state.windMax));
  params.set("sun", state.sunPref);
}

export function writeDialUrl(state: DialState): void {
  if (typeof location === "undefined") return;
  const params = new URLSearchParams(location.search);
  writeDialParams(params, state);
  const qs = params.toString();
  const next = `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`;
  history.replaceState(null, "", next);
}

// Resolves the initial dial state by merging URL > localStorage > defaults.
// URL wins — the strongest signal of explicit user intent (a shared link).
export function resolveInitialDialState(
  override?: Partial<DialState>,
  options?: { url?: Partial<DialState>; storage?: Partial<DialState> },
): DialState {
  const url = options?.url ?? readDialUrl();
  const stored = options?.storage ?? readDialStorage();
  const base: DialState = {
    tempMin: clampNumber(
      url.tempMin ?? stored.tempMin,
      SLIDER_BOUNDS.tempMin.lo,
      SLIDER_BOUNDS.tempMin.hi,
      DEFAULT_DIAL_STATE.tempMin,
    ),
    rainMax: clampNumber(
      url.rainMax ?? stored.rainMax,
      SLIDER_BOUNDS.rainMax.lo,
      SLIDER_BOUNDS.rainMax.hi,
      DEFAULT_DIAL_STATE.rainMax,
    ),
    probMax: clampNumber(
      url.probMax ?? stored.probMax,
      SLIDER_BOUNDS.probMax.lo,
      SLIDER_BOUNDS.probMax.hi,
      DEFAULT_DIAL_STATE.probMax,
    ),
    windMax: clampNumber(
      url.windMax ?? stored.windMax,
      SLIDER_BOUNDS.windMax.lo,
      SLIDER_BOUNDS.windMax.hi,
      DEFAULT_DIAL_STATE.windMax,
    ),
    sunPref: isSunPref(url.sunPref ?? stored.sunPref)
      ? ((url.sunPref ?? stored.sunPref) as SunPref)
      : DEFAULT_DIAL_STATE.sunPref,
  };
  if (!override) return base;
  return { ...base, ...override };
}
