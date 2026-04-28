// Trip finder — scores (destination × start-date) combinations for a given
// trip length and ranks them by qualifying-day count + median temperature.
// Lazy-loaded via `await import("./components/trip-mode")` from plan.ts so
// the plan page's initial-paint graph stays unchanged for ranked-view users.

import { getDestinationMeta } from "../lib/destination-meta";
import { DEFAULT_THRESHOLDS, type Thresholds, bestRun, dayMatches } from "../lib/qualify";
import type { DestinationResult } from "../lib/types";

// -- public types ----------------------------------------------------------

export interface TripItem {
  slug: string;
  start: string;
  length: number;
}

export interface TripConstraints {
  start: string;
  end: string;
  length: number;
  region: string;
}

export interface MountTripModeOptions {
  mount: HTMLElement;
  results: DestinationResult[];
  initialShortlist: TripItem[];
  onShortlistChange: (items: TripItem[]) => void;
}

export interface TripModeHandle {
  setThresholds(t: Thresholds): void;
  setConstraints(c: TripConstraints): void;
  destroy(): void;
}

// -- internal types --------------------------------------------------------

interface TripCombo {
  slug: string;
  name: string;
  region: string;
  start: string;
  endDate: string;
  length: number;
  qualifyCount: number;
  totalDays: number;
  bestRunLen: number;
  medianTemp: number;
  score: number;
  saved: boolean;
}

// -- constants -------------------------------------------------------------

const MAX_RESULTS = 30;
const MAX_SHORTLIST = 5;

// -- helpers ---------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function tripKey(item: TripItem): string {
  return `${item.slug}:${item.start}:${item.length}`;
}

// -- scoring ---------------------------------------------------------------

function findTrips(
  results: DestinationResult[],
  constraints: TripConstraints,
  thresholds: Thresholds,
  shortlist: TripItem[],
): TripCombo[] {
  const savedKeys = new Set(shortlist.map(tripKey));
  const combos: TripCombo[] = [];

  for (const r of results) {
    const region = getDestinationMeta(r.slug).departureRegion;
    if (constraints.region !== "any" && region !== constraints.region) continue;

    for (const day of r.daily) {
      if (day.date < constraints.start) continue;
      const end = addDays(day.date, constraints.length - 1);
      if (end > constraints.end) continue;

      const window = r.daily.filter((d) => d.date >= day.date && d.date <= end);
      if (window.length === 0) continue;

      const quals = window.map((d) => dayMatches(d, thresholds));
      const qCount = quals.filter(Boolean).length;
      const run = bestRun(quals);
      const med = median(window.map((d) => d.temp_max));

      combos.push({
        slug: r.slug,
        name: r.name,
        region,
        start: day.date,
        endDate: end,
        length: constraints.length,
        qualifyCount: qCount,
        totalDays: window.length,
        bestRunLen: run.length,
        medianTemp: med,
        score: qCount * 100 + med,
        saved: savedKeys.has(
          tripKey({ slug: r.slug, start: day.date, length: constraints.length }),
        ),
      });
    }
  }

  combos.sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.start.localeCompare(b.start),
  );
  return combos.slice(0, MAX_RESULTS);
}

// -- renderers -------------------------------------------------------------

function renderShortlistItem(item: TripItem, idx: number, results: DestinationResult[]): string {
  const r = results.find((x) => x.slug === item.slug);
  const name = r ? r.name : item.slug;
  const end = addDays(item.start, item.length - 1);
  const dates = `${shortDate(item.start)} – ${shortDate(end)}`;
  return `<li class="trip-sl-item">
    <a class="trip-sl-link" href="./destination.html?slug=${encodeURIComponent(item.slug)}">
      <span class="trip-sl-name">${escapeHtml(name)}</span>
      <span class="trip-sl-meta">${escapeHtml(dates)} · ${item.length}d</span>
    </a>
    <button type="button" class="trip-sl-remove" data-idx="${idx}" aria-label="Remove ${escapeHtml(name)} from shortlist">×</button>
  </li>`;
}

function renderShortlist(sl: TripItem[], results: DestinationResult[]): string {
  if (sl.length === 0) return "";
  const items = sl.map((item, idx) => renderShortlistItem(item, idx, results)).join("");
  return `<div class="trip-shortlist" role="region" aria-label="Saved trips">
    <div class="trip-sl-head">
      <h3 class="trip-sl-title">Shortlist <span class="trip-sl-count">${sl.length}/${MAX_SHORTLIST}</span></h3>
      <button type="button" class="trip-sl-copy" aria-label="Copy shareable link to clipboard">Copy link</button>
    </div>
    <ol class="trip-sl-list">${items}</ol>
  </div>`;
}

function renderTripCard(c: TripCombo, rank: number): string {
  const href = `./destination.html?slug=${encodeURIComponent(c.slug)}`;
  const meta = getDestinationMeta(c.slug);
  const dates = `${shortDate(c.start)} → ${shortDate(c.endDate)}`;
  const verdict =
    c.qualifyCount === c.totalDays
      ? "go"
      : c.qualifyCount >= Math.ceil(c.totalDays / 2)
        ? "edge"
        : "no-go";
  const vLabel = verdict === "go" ? "GO" : verdict === "edge" ? "EDGE" : "NO-GO";
  const saveLabel = c.saved ? "Remove" : "Save";

  return `<li class="trip-card" data-verdict="${verdict}">
    <div class="trip-card-rank" aria-hidden="true">${rank}</div>
    <div class="trip-card-body">
      <header class="trip-card-head">
        <h3 class="trip-card-name"><a href="${href}">${escapeHtml(c.name)}</a></h3>
        <span class="trip-card-region region-${escapeHtml(c.region)}">${escapeHtml(c.region)}</span>
        ${meta.airport ? `<span class="trip-card-airport">${escapeHtml(meta.airport)}</span>` : ""}
      </header>
      <p class="trip-card-dates">${escapeHtml(dates)}</p>
      <dl class="trip-card-stats">
        <div><dt>Clean</dt><dd class="tabular">${c.qualifyCount}/${c.totalDays}</dd></div>
        <div><dt>Best run</dt><dd class="tabular">${c.bestRunLen}d</dd></div>
        <div><dt>Median</dt><dd class="tabular">${c.medianTemp.toFixed(0)}°C</dd></div>
      </dl>
    </div>
    <div class="trip-card-aside">
      <span class="trip-card-verdict verdict-${verdict}" aria-label="Verdict ${vLabel}">${vLabel}</span>
      <button type="button" class="trip-card-save${c.saved ? " is-saved" : ""}" data-slug="${escapeHtml(c.slug)}" data-start="${escapeHtml(c.start)}" data-length="${c.length}" aria-label="${saveLabel} ${escapeHtml(c.name)} ${escapeHtml(dates)}">${c.saved ? "Saved" : "Save"}</button>
    </div>
  </li>`;
}

// -- mount -----------------------------------------------------------------

export function mountTripMode(opts: MountTripModeOptions): TripModeHandle {
  const { mount, results, onShortlistChange } = opts;
  let thresholds: Thresholds = DEFAULT_THRESHOLDS;
  let constraints: TripConstraints = {
    start: "",
    end: "",
    length: 7,
    region: "any",
  };
  let shortlist: TripItem[] = [...opts.initialShortlist];

  function render(): void {
    if (!constraints.start || !constraints.end) return;
    const combos = findTrips(results, constraints, thresholds, shortlist);
    const summary =
      combos.length > 0
        ? `${combos.length} combination${combos.length === 1 ? "" : "s"} found`
        : "";
    const body =
      combos.length === 0
        ? `<div class="trip-empty"><p class="trip-empty-title">No ${constraints.length}-day trips found in this window.</p><p class="trip-empty-hint">Try widening your date range, shortening the trip, or loosening thresholds.</p></div>`
        : `<ul class="trip-results" aria-label="Ranked trip combinations">${combos.map((c, i) => renderTripCard(c, i + 1)).join("")}</ul>`;
    mount.innerHTML =
      renderShortlist(shortlist, results) +
      (summary ? `<p class="trip-summary" aria-live="polite">${escapeHtml(summary)}</p>` : "") +
      body;
  }

  function onClick(ev: MouseEvent): void {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;

    const saveBtn = t.closest<HTMLButtonElement>(".trip-card-save");
    if (saveBtn) {
      ev.preventDefault();
      const { slug, start, length } = saveBtn.dataset;
      if (!slug || !start || !length) return;
      const item: TripItem = { slug, start, length: Number(length) };
      const key = tripKey(item);
      const idx = shortlist.findIndex((s) => tripKey(s) === key);
      if (idx >= 0) {
        shortlist = shortlist.filter((_, i) => i !== idx);
      } else if (shortlist.length < MAX_SHORTLIST) {
        shortlist = [...shortlist, item];
      }
      onShortlistChange(shortlist);
      render();
      return;
    }

    const removeBtn = t.closest<HTMLButtonElement>(".trip-sl-remove");
    if (removeBtn) {
      ev.preventDefault();
      const idx = Number(removeBtn.dataset.idx);
      if (!Number.isFinite(idx) || idx < 0 || idx >= shortlist.length) return;
      shortlist = shortlist.filter((_, i) => i !== idx);
      onShortlistChange(shortlist);
      render();
      return;
    }

    const copyBtn = t.closest<HTMLButtonElement>(".trip-sl-copy");
    if (copyBtn) {
      ev.preventDefault();
      if (typeof navigator?.clipboard?.writeText === "function") {
        navigator.clipboard.writeText(window.location.href).catch(() => {});
      }
      const orig = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = orig;
      }, 2000);
    }
  }

  mount.addEventListener("click", onClick);

  return {
    setThresholds(t: Thresholds): void {
      thresholds = t;
      render();
    },
    setConstraints(c: TripConstraints): void {
      if (
        c.start === constraints.start &&
        c.end === constraints.end &&
        c.length === constraints.length &&
        c.region === constraints.region
      )
        return;
      constraints = c;
      render();
    },
    destroy(): void {
      mount.removeEventListener("click", onClick);
      mount.innerHTML = "";
    },
  };
}
