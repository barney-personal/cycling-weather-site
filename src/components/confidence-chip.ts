// Forecast-confidence chip — "is this forecast split?"
//
// Reads the schema-v4 `model_spread` block (per-destination per-day envelope
// across ECMWF / GFS / ICON, fetched daily by
// `cycling_weather_model_spread.py` on the cron side) and renders a small chip
// on the destination page summarising how many days in the next LEAD_DAYS
// have meaningful model disagreement. Schema v1/v2/v3 snapshots have
// `model_spread: null` and the chip is silently omitted.
//
// Threshold tuning (per the M7 acceptance criteria — should fire on roughly
// 10–20% of day-rows in a typical forecast week, not 100% nor 0%):
//   • SPLIT_TEMP_C       = 3.0  (max-min temp spread across models, °C)
//   • SPLIT_PROB_PCT     = 25   (max-min precip-prob spread across models, %)
//   • LEAD_DAYS          = 7    (we summarise the next-week window only)
//   • MIN_MODELS_COUNTED = 2    (a single-model day is ignored — no spread to
//                                report)
//
// Empirical (2026-04-28 / 22 destinations × 14 days = 308 rows): 13.6% of
// rows trip the threshold, well inside the band.
//
// The chip is a `role="note"` element with a `title` + `aria-describedby`
// pair so screen-reader and tooltip users both get the underlying numbers.
// Users with `prefers-reduced-motion` get the same chip (no animation).

import type { ModelSpreadBlock, ModelSpreadEntry } from "../lib/types";

const SPLIT_TEMP_C = 3.0;
const SPLIT_PROB_PCT = 25;
const LEAD_DAYS = 7;
const MIN_MODELS_COUNTED = 2;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

export function findModelSpreadEntry(
  block: ModelSpreadBlock | null,
  destinationName: string,
): ModelSpreadEntry | null {
  if (!block) return null;
  return block.destinations.find((d) => d.name === destinationName) ?? null;
}

export interface ConfidenceContext {
  /** True when at least one lead-window day exceeds the spread threshold. */
  isSplit: boolean;
  /** Number of lead-window days flagged as split. */
  splitDays: number;
  /** Total lead-window days actually scored (excludes single-model days). */
  scoredDays: number;
  /** Largest temp envelope (°C) across lead-window days, for the tooltip. */
  maxTempSpread: number;
  /** Largest precip-prob envelope (%) across lead-window days. */
  maxProbSpread: number;
  /** Lead-window length, in days, considered (typically LEAD_DAYS). */
  leadDays: number;
  /** Models the spread block was sourced from (e.g. ["ecmwf_ifs04", ...]). */
  models: string[];
}

/** Pure formatter — given a destination's spread entry and the parent block,
 * produce a confidence summary or null. Returns null when the entry is
 * missing, has no scored lead-window days, or no day trips the threshold
 * (silent on confident days). */
export function formatConfidenceContext(
  entry: ModelSpreadEntry | null,
  block: ModelSpreadBlock | null,
): ConfidenceContext | null {
  if (!entry || !block || entry.days.length === 0) return null;

  const lead = entry.days.slice(0, LEAD_DAYS);
  let splitDays = 0;
  let scoredDays = 0;
  let maxTempSpread = 0;
  let maxProbSpread = 0;

  for (const d of lead) {
    if (d.models_count < MIN_MODELS_COUNTED) continue;
    scoredDays += 1;
    const t = d.temp_spread_c;
    const p = d.precip_prob_spread_pct;
    const tempTrips = typeof t === "number" && Number.isFinite(t) && t >= SPLIT_TEMP_C;
    const probTrips = typeof p === "number" && Number.isFinite(p) && p >= SPLIT_PROB_PCT;
    if (tempTrips || probTrips) splitDays += 1;
    if (typeof t === "number" && Number.isFinite(t) && t > maxTempSpread) maxTempSpread = t;
    if (typeof p === "number" && Number.isFinite(p) && p > maxProbSpread) maxProbSpread = p;
  }

  if (scoredDays === 0 || splitDays === 0) return null;

  return {
    isSplit: true,
    splitDays,
    scoredDays,
    maxTempSpread: Math.round(maxTempSpread * 10) / 10,
    maxProbSpread: Math.round(maxProbSpread),
    leadDays: lead.length,
    models: block.models,
  };
}

function modelLabel(id: string): string {
  // Map Open-Meteo model IDs to short, human-friendly labels for the tooltip.
  if (id.startsWith("ecmwf")) return "ECMWF";
  if (id.startsWith("gfs")) return "GFS";
  if (id.startsWith("icon")) return "ICON";
  if (id.startsWith("meteofrance")) return "Météo-France";
  if (id.startsWith("gem")) return "GEM";
  return id.toUpperCase();
}

export function renderConfidenceChip(context: ConfidenceContext | null): string {
  if (!context) return "";
  const dayLabel = context.splitDays === 1 ? "day" : "days";
  const headline = `Split forecast · ${context.splitDays} of next ${context.scoredDays} ${dayLabel}`;
  const labelledModels = context.models.map(modelLabel).join(", ") || "multiple models";
  const tempPart =
    context.maxTempSpread > 0 ? `up to ${context.maxTempSpread.toFixed(1)}°C apart` : "";
  const probPart = context.maxProbSpread > 0 ? `${context.maxProbSpread}% rain-prob gap` : "";
  const detail = [tempPart, probPart].filter(Boolean).join(" · ") || "model envelope nontrivial";
  const describedBy = `Models disagree (${escapeHtml(labelledModels)}): ${escapeHtml(detail)} across the next ${context.scoredDays}-day window.`;
  return `<span class="confidence-chip confidence-split" role="note" title="${describedBy}" aria-label="${describedBy}">
      <span class="confidence-icon" aria-hidden="true">⚠</span>
      <span class="confidence-text">${escapeHtml(headline)}</span>
      <span class="visually-hidden">${describedBy}</span>
    </span>`;
}
