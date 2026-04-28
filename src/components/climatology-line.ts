// Climatology context line — "is this week unusual?"
//
// Reads the schema-v3 `climatology` block (5-year same-week rollup, fetched
// weekly by `cycling_weather_climatology.py` on the cron side) and renders a
// short comparison of today's median high vs the historical median for the
// matching calendar week. Schema v1/v2 snapshots have `climatology: null` and
// the line is silently omitted.
//
// Used in two places:
//   • Hero (homepage) — compares the top GO destination's median temp.
//   • Destination page — compares each destination's own median temp.
//
// Hard cap on visible text length (CONTEXT_MAX_LEN, 120 chars) per the M5
// acceptance criteria. An accessible alt-table fallback (visually-hidden) is
// emitted alongside the headline so screen readers can pick up the
// underlying numbers without parsing the prose.
//
// Uses `aria-live="polite"` so the line is announced when the page hydrates
// without interrupting whatever the user is hearing.

import type { ClimatologyBlock, ClimatologyEntry } from "../lib/types";

const CONTEXT_MAX_LEN = 120;
// Anything below this absolute delta is reported as "tracking with" rather
// than "warmer/cooler" — gives the line a calm baseline when the weather is
// running close to climatology.
const TEMP_NEUTRAL_THRESHOLD_C = 0.6;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

export function findClimatologyEntry(
  block: ClimatologyBlock | null,
  destinationName: string,
): ClimatologyEntry | null {
  if (!block) return null;
  return block.destinations.find((d) => d.name === destinationName) ?? null;
}

export interface ClimatologyContext {
  /** Plain-text headline, capped to CONTEXT_MAX_LEN characters. */
  headline: string;
  /** Coarse signal class for CSS theming. */
  tone: "warmer" | "cooler" | "tracking";
  /** Magnitude of the temp delta in °C (always non-negative). */
  deltaAbs: number;
  /** Absolute delta sign relative to climatology median (positive = warmer). */
  delta: number;
  /** Window label e.g. "late April". */
  windowLabel: string;
  /** Number of years rolled up. */
  years: number;
  /** Climatology median high used for comparison, in °C. */
  median: number;
  /** Today's median high used for comparison, in °C. */
  current: number;
}

/** Pure formatter — given a current median temp, the climatology entry, and
 * the window block, produce a short context string + tone classification.
 * Returns null when comparison isn't meaningful (entry absent, no samples,
 * NaN inputs). Keep all math in °C. */
export function formatClimatologyContext(
  currentMedianTemp: number | null | undefined,
  entry: ClimatologyEntry | null,
  block: ClimatologyBlock | null,
  destinationName: string,
): ClimatologyContext | null {
  if (
    !block ||
    !entry ||
    entry.sample_size <= 0 ||
    entry.median_temp_max === null ||
    typeof currentMedianTemp !== "number" ||
    !Number.isFinite(currentMedianTemp)
  ) {
    return null;
  }

  const median = entry.median_temp_max;
  const delta = currentMedianTemp - median;
  const deltaAbs = Math.abs(delta);
  const windowLabel = block.window_label || "this week";
  const years = block.years || entry.years || 5;
  const dest = destinationName || "this destination";

  let tone: ClimatologyContext["tone"];
  let headline: string;
  if (deltaAbs < TEMP_NEUTRAL_THRESHOLD_C) {
    tone = "tracking";
    headline = `${dest} is tracking with the ${years}y median for ${windowLabel}.`;
  } else {
    tone = delta > 0 ? "warmer" : "cooler";
    const deltaRounded = deltaAbs >= 10 ? Math.round(deltaAbs) : Math.round(deltaAbs * 10) / 10;
    const deltaStr = Number.isInteger(deltaRounded)
      ? `${deltaRounded.toFixed(0)}°C`
      : `${deltaRounded.toFixed(1)}°C`;
    const direction = tone === "warmer" ? "warmer" : "cooler";
    headline = `${dest} is ${deltaStr} ${direction} than the ${years}y median for ${windowLabel}.`;
  }

  if (headline.length > CONTEXT_MAX_LEN) {
    headline = `${headline.slice(0, CONTEXT_MAX_LEN - 1)}…`;
  }

  return {
    headline,
    tone,
    delta,
    deltaAbs,
    windowLabel,
    years,
    median,
    current: currentMedianTemp,
  };
}

export interface MountClimatologyLineOptions {
  mount: string | HTMLElement;
  context: ClimatologyContext | null;
  /** Optional source label that screen-readers will announce in the alt-table. */
  altLabel?: string;
}

export function renderClimatologyLine(
  context: ClimatologyContext | null,
  altLabel?: string,
): string {
  if (!context) return "";
  const tone = context.tone;
  const headline = escapeHtml(context.headline);
  const altCaption = altLabel ?? "Climatology comparison";
  return `<aside class="climatology-line climatology-${tone}" role="note" aria-live="polite">
      <span class="climatology-icon" aria-hidden="true">${tone === "warmer" ? "▲" : tone === "cooler" ? "▼" : "≈"}</span>
      <p class="climatology-text">${headline}</p>
      <table class="visually-hidden" aria-label="${escapeHtml(altCaption)}">
        <thead><tr><th>Window</th><th>${context.years}y median high</th><th>This week median high</th><th>Delta</th></tr></thead>
        <tbody><tr>
          <td>${escapeHtml(context.windowLabel)}</td>
          <td>${context.median.toFixed(1)}°C</td>
          <td>${context.current.toFixed(1)}°C</td>
          <td>${(context.delta >= 0 ? "+" : "") + context.delta.toFixed(1)}°C</td>
        </tr></tbody>
      </table>
    </aside>`;
}

export function mountClimatologyLine(opts: MountClimatologyLineOptions): void {
  const target =
    typeof opts.mount === "string" ? document.querySelector<HTMLElement>(opts.mount) : opts.mount;
  if (!target) return;
  if (!opts.context) {
    target.innerHTML = "";
    return;
  }
  target.innerHTML = renderClimatologyLine(opts.context, opts.altLabel);
}
