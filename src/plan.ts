// Trip planner — pick a window inside the next 14 days, set departure region
// and ride-clean thresholds, get a ranked list of destinations whose best
// contiguous clean run intersects that window.
//
// Reuses the homepage's `?temp&rain&prob&wind&sun` dial encoding (via the
// shared `lib/thresholds.ts`) and adds page-specific URL keys: `?from=`,
// `?to=`, `?len=`, `?region=`. URL wins over localStorage; both survive
// reload so a shared link encodes the full search.

import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/base.css";
import "./style.css";

import { mountHeader } from "./components/header";
import { type DialChangeDetail, mountThresholdDial } from "./components/threshold-dial";
import { loadSiteData } from "./lib/data";
import { getDestinationMeta } from "./lib/destination-meta";
import { type Thresholds, bestRun, dayMatches } from "./lib/qualify";
import type { DailyForecast, DestinationResult, SiteData } from "./lib/types";

mountHeader({ mount: "#site-header", active: "plan" });

// ---- types & constants ----------------------------------------------------

const TRIP_LENGTHS = [3, 5, 7, 10] as const;
type TripLength = (typeof TRIP_LENGTHS)[number];

type RegionFilter = "any" | "UK" | "EU" | "US-west" | "US-east";
const REGIONS: ReadonlyArray<{ value: RegionFilter; label: string; hint: string }> = [
  { value: "any", label: "Any", hint: "All destinations" },
  { value: "UK", label: "UK", hint: "Drive / train" },
  { value: "EU", label: "EU", hint: "Short flight" },
  { value: "US-west", label: "US-west", hint: "Pacific" },
  { value: "US-east", label: "US-east", hint: "Atlantic" },
];

const NOTIFY_STORAGE_KEY = "cw-notify-alerts";
const PLAN_STORAGE_KEY = "cw-plan-state";

interface PlanState {
  start: string;
  end: string;
  length: TripLength;
  region: RegionFilter;
}

interface RenderInputs {
  results: DestinationResult[];
  state: PlanState;
  thresholds: Thresholds;
  forecastStart: string;
  forecastEnd: string;
}

// ---- date helpers ---------------------------------------------------------

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function diffDays(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function clampDate(iso: string, lo: string, hi: string): string {
  if (iso < lo) return lo;
  if (iso > hi) return hi;
  return iso;
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function closestTripLength(days: number): TripLength {
  let best: TripLength = TRIP_LENGTHS[0];
  let bestDiff = Math.abs(days - best);
  for (const n of TRIP_LENGTHS) {
    const d = Math.abs(days - n);
    if (d < bestDiff) {
      bestDiff = d;
      best = n;
    }
  }
  return best;
}

function isTripLength(v: number): v is TripLength {
  return (TRIP_LENGTHS as ReadonlyArray<number>).includes(v);
}

function isRegionFilter(v: string): v is RegionFilter {
  return REGIONS.some((r) => r.value === v);
}

// ---- state persistence ----------------------------------------------------

function readPlanStorage(): Partial<PlanState> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Partial<PlanState>;
  } catch {
    return {};
  }
}

function writePlanStorage(state: PlanState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function readPlanUrl(): Partial<PlanState> {
  if (typeof location === "undefined") return {};
  const out: Partial<PlanState> = {};
  const params = new URLSearchParams(location.search);
  const from = params.get("from");
  const to = params.get("to");
  const len = params.get("len");
  const region = params.get("region");
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) out.start = from;
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) out.end = to;
  if (len && Number.isFinite(Number(len))) {
    const n = Number(len);
    if (isTripLength(n)) out.length = n;
  }
  if (region && isRegionFilter(region)) out.region = region;
  return out;
}

function writePlanUrl(state: PlanState, defaults: PlanState): void {
  if (typeof location === "undefined") return;
  const params = new URLSearchParams(location.search);
  if (state.start === defaults.start) params.delete("from");
  else params.set("from", state.start);
  if (state.end === defaults.end) params.delete("to");
  else params.set("to", state.end);
  if (state.length === defaults.length) params.delete("len");
  else params.set("len", String(state.length));
  if (state.region === defaults.region) params.delete("region");
  else params.set("region", state.region);
  const qs = params.toString();
  const next = `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`;
  history.replaceState(null, "", next);
}

function resolveInitialPlan(forecastStart: string, forecastEnd: string): PlanState {
  const url = readPlanUrl();
  const stored = readPlanStorage();
  const fallbackStart = clampDate(isoToday(), forecastStart, forecastEnd);
  const length: TripLength = url.length ?? stored.length ?? 7;
  const startRaw = url.start ?? stored.start ?? fallbackStart;
  const start = clampDate(startRaw, forecastStart, forecastEnd);
  const endRaw = url.end ?? stored.end ?? addDays(start, length - 1);
  const end = clampDate(endRaw, start, forecastEnd);
  const region: RegionFilter = url.region ?? stored.region ?? "any";
  return { start, end, length, region };
}

// ---- ranking --------------------------------------------------------------

interface PlanRanked {
  result: DestinationResult;
  region: RegionFilter;
  windowDaily: DailyForecast[];
  qualifies: boolean[];
  bestRun: number;
  bestStartIso: string | null;
  bestEndIso: string | null;
  dryDays: number;
  windowMedianTemp: number;
  score: number;
  reason: string;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function regionForResult(r: DestinationResult): RegionFilter {
  return getDestinationMeta(r.slug).departureRegion;
}

function rankPlanned(input: RenderInputs): PlanRanked[] {
  const { results, state, thresholds } = input;
  const ranked: PlanRanked[] = [];
  for (const r of results) {
    const region = regionForResult(r);
    if (state.region !== "any" && region !== state.region) continue;
    const window = r.daily.filter((d) => d.date >= state.start && d.date <= state.end);
    if (window.length === 0) continue;
    const qualifies = window.map((d) => dayMatches(d, thresholds));
    const run = bestRun(qualifies);
    const dry = window.reduce(
      (acc, d) =>
        acc +
        (d.precip_sum <= thresholds.rainMax && d.precip_prob_max < thresholds.probMax ? 1 : 0),
      0,
    );
    const med = median(window.map((d) => d.temp_max));
    const score = run.length * 100 + dry * 5 + med;
    ranked.push({
      result: r,
      region,
      windowDaily: window,
      qualifies,
      bestRun: run.length,
      bestStartIso: run.startIdx !== null ? (window[run.startIdx]?.date ?? null) : null,
      bestEndIso: run.endIdx !== null ? (window[run.endIdx]?.date ?? null) : null,
      dryDays: dry,
      windowMedianTemp: med,
      score,
      reason: makeReason(run.length, dry, med, window.length),
    });
  }
  ranked.sort((a, b) => b.score - a.score || a.result.name.localeCompare(b.result.name));
  return ranked;
}

function makeReason(run: number, dry: number, med: number, windowLen: number): string {
  const tempLabel = `median ${med.toFixed(0)}°C`;
  if (run >= windowLen && windowLen > 0) {
    return `Clean ${windowLen}/${windowLen} days · ${tempLabel}`;
  }
  if (run >= 3) {
    return `Best ${run}-day run · ${dry}/${windowLen} dry · ${tempLabel}`;
  }
  if (dry > 0) {
    return `${dry}/${windowLen} dry days · ${tempLabel}`;
  }
  return `No clean window · ${tempLabel}`;
}

// ---- DOM helpers ----------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

function $<T extends HTMLElement>(sel: string): T | null {
  return document.querySelector<T>(sel);
}

function $$<T extends HTMLElement>(sel: string): T[] {
  return Array.from(document.querySelectorAll<T>(sel));
}

// ---- chip-row renderers ---------------------------------------------------

function renderTripLengthChips(state: PlanState, onPick: (n: TripLength) => void): void {
  const mount = $<HTMLDivElement>("#plan-length");
  if (!mount) return;
  mount.innerHTML = TRIP_LENGTHS.map((n) => {
    const active = n === state.length;
    return `<label class="chip plan-chip"${active ? ' data-active="1"' : ""}>
      <input type="radio" name="plan-length" value="${n}"${active ? " checked" : ""}>
      <span>${n} days</span>
    </label>`;
  }).join("");
  for (const input of mount.querySelectorAll<HTMLInputElement>('input[name="plan-length"]')) {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      const v = Number(input.value);
      if (isTripLength(v)) onPick(v);
    });
  }
}

function renderRegionChips(state: PlanState, onPick: (r: RegionFilter) => void): void {
  const mount = $<HTMLDivElement>("#plan-region");
  if (!mount) return;
  mount.innerHTML = REGIONS.map((r) => {
    const active = r.value === state.region;
    return `<label class="chip plan-chip"${active ? ' data-active="1"' : ""}>
      <input type="radio" name="plan-region" value="${r.value}"${active ? " checked" : ""}>
      <span>${escapeHtml(r.label)}</span>
    </label>`;
  }).join("");
  for (const input of mount.querySelectorAll<HTMLInputElement>('input[name="plan-region"]')) {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      if (isRegionFilter(input.value)) onPick(input.value);
    });
  }
}

// Reflect chip-row checked state without re-binding listeners.
function reflectChips(state: PlanState): void {
  for (const input of $$<HTMLInputElement>(
    'input[name="plan-length"], input[name="plan-region"]',
  )) {
    const active =
      input.name === "plan-length"
        ? Number(input.value) === state.length
        : input.value === state.region;
    input.checked = active;
    const label = input.closest<HTMLElement>(".chip");
    if (label) {
      if (active) label.dataset.active = "1";
      else delete label.dataset.active;
    }
  }
}

// ---- date input reflection ------------------------------------------------

function reflectDates(state: PlanState, forecastStart: string, forecastEnd: string): void {
  const startInput = $<HTMLInputElement>("#plan-start");
  const endInput = $<HTMLInputElement>("#plan-end");
  if (startInput) {
    startInput.min = forecastStart;
    startInput.max = forecastEnd;
    startInput.value = state.start;
  }
  if (endInput) {
    endInput.min = state.start;
    endInput.max = forecastEnd;
    endInput.value = state.end;
  }
  const summary = $<HTMLParagraphElement>("#plan-window-summary");
  if (summary) {
    const days = diffDays(state.start, state.end) + 1;
    summary.textContent = `${shortDate(state.start)} → ${shortDate(state.end)} · ${days} day${
      days === 1 ? "" : "s"
    }`;
  }
}

// ---- results render -------------------------------------------------------

function renderResults(input: RenderInputs): void {
  const list = $<HTMLUListElement>("#plan-results");
  const summary = $<HTMLParagraphElement>("#plan-results-summary");
  if (!list) return;
  const ranked = rankPlanned(input);
  if (ranked.length === 0) {
    list.innerHTML = `<li class="plan-empty">
      <p class="plan-empty-title">No destinations meet your thresholds in this window.</p>
      <p class="plan-empty-hint">Try widening rain tolerance or extending the date range.</p>
    </li>`;
    if (summary) summary.textContent = "0 destinations match this window.";
    return;
  }
  const cleanCount = ranked.filter(
    (r) => r.bestRun >= diffDays(input.state.start, input.state.end) + 1,
  ).length;
  const goCount = ranked.filter(
    (r) => r.bestRun >= Math.min(7, diffDays(input.state.start, input.state.end) + 1),
  ).length;
  list.innerHTML = ranked.map((r, idx) => renderResultCard(r, idx + 1, input.state)).join("");
  if (summary) {
    const days = diffDays(input.state.start, input.state.end) + 1;
    if (cleanCount > 0) {
      summary.textContent = `${cleanCount} destination${cleanCount === 1 ? "" : "s"} clean every day · ${goCount} with a 7-day window inside ${days} days.`;
    } else {
      summary.textContent = `${ranked.length} destination${
        ranked.length === 1 ? "" : "s"
      } shown · best run ${ranked[0]?.bestRun ?? 0} day${(ranked[0]?.bestRun ?? 0) === 1 ? "" : "s"}.`;
    }
  }
}

function renderResultCard(r: PlanRanked, rank: number, state: PlanState): string {
  const meta = getDestinationMeta(r.result.slug);
  const region = r.region === "any" ? "EU" : r.region;
  const href = `./destination.html?slug=${encodeURIComponent(r.result.slug)}`;
  const runWindow =
    r.bestStartIso && r.bestEndIso
      ? `${shortDate(r.bestStartIso)} → ${shortDate(r.bestEndIso)}`
      : "—";
  const verdict = r.bestRun >= 7 ? "go" : r.bestRun >= 4 ? "edge" : "no-go";
  const verdictLabel = verdict === "go" ? "GO" : verdict === "edge" ? "EDGE" : "NO-GO";
  const days = diffDays(state.start, state.end) + 1;
  return `<li class="plan-card" data-verdict="${verdict}">
    <a class="plan-card-link" href="${href}">
      <div class="plan-card-rank" aria-hidden="true">${rank}</div>
      <div class="plan-card-body">
        <header class="plan-card-head">
          <h3 class="plan-card-name">${escapeHtml(r.result.name)}</h3>
          <span class="plan-card-region region-${region}">${escapeHtml(region)}</span>
          ${meta.airport ? `<span class="plan-card-airport">${escapeHtml(meta.airport)}</span>` : ""}
        </header>
        <p class="plan-card-reason">${escapeHtml(r.reason)}</p>
        <dl class="plan-card-stats">
          <div><dt>Best run</dt><dd class="tabular">${r.bestRun}d <span class="plan-card-substat">/ ${days}d</span></dd></div>
          <div><dt>Clean window</dt><dd class="tabular">${runWindow}</dd></div>
          <div><dt>Median high</dt><dd class="tabular">${r.windowMedianTemp.toFixed(0)}°C</dd></div>
        </dl>
      </div>
      <span class="plan-card-verdict verdict-${verdict}" aria-label="Verdict ${verdictLabel}">${verdictLabel}</span>
    </a>
  </li>`;
}

// ---- notify stub ----------------------------------------------------------

interface NotifyAlert {
  email: string;
  destSlug: string;
  savedAt: string;
}

function readNotifyAlerts(): NotifyAlert[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIFY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as NotifyAlert[];
  } catch {
    return [];
  }
}

function writeNotifyAlerts(alerts: NotifyAlert[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // ignore
  }
}

function populateNotifyDestinations(results: DestinationResult[]): void {
  const select = $<HTMLSelectElement>("#plan-notify-dest");
  if (!select) return;
  const opts = ['<option value="">— pick a destination —</option>']
    .concat(
      results
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((r) => `<option value="${escapeHtml(r.slug)}">${escapeHtml(r.name)}</option>`),
    )
    .join("");
  select.innerHTML = opts;
}

function bindNotifyForm(): void {
  const form = $<HTMLFormElement>("#plan-notify-form");
  const status = $<HTMLParagraphElement>("#plan-notify-status");
  if (!form) return;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const email = ($<HTMLInputElement>("#plan-notify-email")?.value ?? "").trim();
    const destSlug = $<HTMLSelectElement>("#plan-notify-dest")?.value ?? "";
    if (!email || !destSlug) {
      if (status) status.textContent = "Pick a destination and enter an email.";
      return;
    }
    const alerts = readNotifyAlerts();
    alerts.push({ email, destSlug, savedAt: new Date().toISOString() });
    writeNotifyAlerts(alerts);
    if (status) {
      status.textContent = "Saved — we'll wire real notifications later.";
      status.dataset.tone = "ok";
    }
    form.reset();
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (status) {
        status.textContent = "";
        delete status.dataset.tone;
      }
    }, 4000);
  });
}

// ---- empty-data fallback --------------------------------------------------

function renderEmptyData(): void {
  const list = $<HTMLUListElement>("#plan-results");
  const summary = $<HTMLParagraphElement>("#plan-results-summary");
  if (list) {
    list.innerHTML = `<li class="plan-empty">
      <p class="plan-empty-title">No forecast data yet.</p>
      <p class="plan-empty-hint">The daily refresh hasn't completed — check back after 04:45 UTC.</p>
    </li>`;
  }
  if (summary) summary.textContent = "Forecast unavailable.";
}

// ---- boot -----------------------------------------------------------------

void loadSiteData().then((data: SiteData) => {
  const latest = data.latest;
  if (!latest || latest.results.length === 0) {
    renderEmptyData();
    return;
  }

  const results = latest.results;
  const forecastStart = results[0]?.daily[0]?.date ?? isoToday();
  const lastDaily = results[0]?.daily;
  const forecastEnd = lastDaily?.[lastDaily.length - 1]?.date ?? addDays(forecastStart, 13);

  let state: PlanState = resolveInitialPlan(forecastStart, forecastEnd);
  let thresholds: Thresholds | null = null;
  const defaults: PlanState = {
    start: clampDate(isoToday(), forecastStart, forecastEnd),
    end: clampDate(
      addDays(clampDate(isoToday(), forecastStart, forecastEnd), 6),
      forecastStart,
      forecastEnd,
    ),
    length: 7,
    region: "any",
  };

  function persist(): void {
    writePlanStorage(state);
    writePlanUrl(state, defaults);
  }

  function rerender(): void {
    if (!thresholds) return;
    renderResults({ results, state, thresholds, forecastStart, forecastEnd });
  }

  reflectDates(state, forecastStart, forecastEnd);
  populateNotifyDestinations(results);
  bindNotifyForm();

  renderTripLengthChips(state, (n) => {
    state = {
      ...state,
      length: n,
      end: clampDate(addDays(state.start, n - 1), state.start, forecastEnd),
    };
    reflectDates(state, forecastStart, forecastEnd);
    persist();
    rerender();
  });

  renderRegionChips(state, (r) => {
    state = { ...state, region: r };
    persist();
    rerender();
  });

  const startInput = $<HTMLInputElement>("#plan-start");
  const endInput = $<HTMLInputElement>("#plan-end");
  startInput?.addEventListener("change", () => {
    if (!startInput.value) return;
    const newStart = clampDate(startInput.value, forecastStart, forecastEnd);
    const newEnd =
      newStart > state.end
        ? clampDate(addDays(newStart, state.length - 1), newStart, forecastEnd)
        : state.end;
    state = {
      ...state,
      start: newStart,
      end: newEnd,
      length: closestTripLength(diffDays(newStart, newEnd) + 1),
    };
    reflectDates(state, forecastStart, forecastEnd);
    reflectChips(state);
    persist();
    rerender();
  });
  endInput?.addEventListener("change", () => {
    if (!endInput.value) return;
    const newEnd = clampDate(endInput.value, state.start, forecastEnd);
    state = { ...state, end: newEnd, length: closestTripLength(diffDays(state.start, newEnd) + 1) };
    reflectDates(state, forecastStart, forecastEnd);
    reflectChips(state);
    persist();
    rerender();
  });

  mountThresholdDial({ trigger: "#threshold-trigger" });
  window.addEventListener("cwthresholds:change", (ev) => {
    const detail = (ev as CustomEvent<DialChangeDetail>).detail;
    thresholds = detail.thresholds;
    rerender();
  });
});
