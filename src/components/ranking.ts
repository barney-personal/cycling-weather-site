// Homepage ranking — cards on mobile, table on ≥1024.  A single render
// function fills both the cards <ul> and the table <tbody>; CSS handles
// visibility so we don't pay JS for media-query branches. Each row carries a
// `data-slug` + `id="${slug}"` so the hero CTA link from the M4 hero can scroll
// straight to its target.
//
// The strip cell encodes three variables at once:
//   - background fill: temp gradient (cool → warm)
//   - dot density:     rain (clean / drizzle / wet)
//   - hatching:        wind (calm / breezy / blustery)
//   - outline:         qualifying day (matches `dayMatches` with current dial)

import {
  DEFAULT_THRESHOLDS,
  EDGE_RUN_MIN,
  type RankedDestination,
  type Thresholds,
  rankWithThresholds,
} from "../lib/qualify";
import type { DestinationResult } from "../lib/types";

export type FilterMode = "all" | "qualifiers" | string;

export interface RankingState {
  thresholds: Thresholds;
  filter: FilterMode;
}

export interface MountRankingOptions {
  /** Container element (or selector) for the mobile card list. */
  cardsMount: string | HTMLElement;
  /** Container element (or selector) for the desktop table tbody. */
  tableMount: string | HTMLElement;
  /** Filter pill bar mount. */
  filtersMount: string | HTMLElement;
  /** Live region used for screen-reader summary updates. */
  liveRegionMount?: string | HTMLElement;
  /** Source data. */
  results: DestinationResult[];
}

export interface RankingHandle {
  setThresholds(t: Thresholds): void;
  setFilter(f: FilterMode): void;
  destroy(): void;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Map a 0-35°C reading onto a CSS-variable-driven gradient stop. Anything
// below 10°C is clamped (cool blues), anything above 30°C clamped (warm
// reds). Returned as a hsl() so it adapts naturally to dark mode without
// looking neon — saturation is held back deliberately.
function tempColour(t: number): string {
  const clamped = Math.min(35, Math.max(5, t));
  // 5°C → 220° (deep blue), 35°C → 18° (warm orange).
  const hue = 220 - ((clamped - 5) / 30) * 202;
  return `hsl(${hue.toFixed(0)}, 55%, 56%)`;
}

function rainBucket(precip: number, prob: number): "clean" | "light" | "wet" {
  if (precip > 1 || prob >= 60) return "wet";
  if (precip > 0 || prob >= 25) return "light";
  return "clean";
}

function windBucket(wind: number): "calm" | "breezy" | "blustery" {
  if (wind >= 30) return "blustery";
  if (wind >= 18) return "breezy";
  return "calm";
}

function destinationLink(slug: string): string {
  return `./destination.html?slug=${encodeURIComponent(slug)}`;
}

interface RowView extends RankedDestination {
  rank: number;
  pythonRank: number;
}

function buildView(results: DestinationResult[], thresholds: Thresholds): RowView[] {
  const ranked = rankWithThresholds(results, thresholds);
  // Capture python-defaults rank too so we can show movement when the user
  // tightens/loosens. Indexed by name.
  const defaultRank = new Map<string, number>();
  rankWithThresholds(results, DEFAULT_THRESHOLDS).forEach((r, i) => {
    defaultRank.set(r.result.name, i + 1);
  });
  return ranked.map((r, i) => ({
    ...r,
    rank: i + 1,
    pythonRank: defaultRank.get(r.result.name) ?? i + 1,
  }));
}

function renderStrip(row: RowView): string {
  return row.result.daily
    .map((d, i) => {
      const fill = tempColour(d.temp_max);
      const rain = rainBucket(d.precip_sum, d.precip_prob_max);
      const wind = windBucket(d.wind_max);
      const qualifies = row.qualifies[i] === true;
      const cls = ["strip-cell", `rain-${rain}`, `wind-${wind}`, qualifies ? "is-qualify" : ""]
        .filter(Boolean)
        .join(" ");
      const ariaLabel =
        `${d.date}: ${d.temp_max.toFixed(0)}°C, ` +
        `${d.precip_sum.toFixed(1)}mm rain (${Math.round(d.precip_prob_max)}% probability), ` +
        `${d.wind_max.toFixed(0)} km/h wind${qualifies ? ", qualifies" : ""}`;
      return `<span class="${cls}" style="--cell-fill:${fill}" role="img" aria-label="${escapeHtml(ariaLabel)}"></span>`;
    })
    .join("");
}

// Status band ladders against the qualifier threshold rather than a hard-coded
// 5/7-day rule. With cycling-comfort defaults (qualifier = best_run >= 4):
//   bestRun >= 4              → GO
//   bestRun in [EDGE_RUN_MIN, 3] → EDGE · Xd  (close to qualifying)
//   bestRun <  EDGE_RUN_MIN   → NO-GO
// If the user dials thresholds tighter via the homepage dial, qualifier flips
// off naturally and the EDGE band absorbs near-misses.
function renderStatus(row: RowView): string {
  if (row.qualifier) return `<span class="status-pill verdict-go">GO</span>`;
  if (row.bestRun >= EDGE_RUN_MIN)
    return `<span class="status-pill verdict-edge">EDGE · ${row.bestRun}d</span>`;
  return `<span class="status-pill verdict-no-go">NO-GO</span>`;
}

function renderRunBadge(row: RowView): string {
  if (row.bestRun === 0) return `<span class="run-badge run-zero">No clean run</span>`;
  const window =
    row.bestStart && row.bestEnd
      ? row.bestStart === row.bestEnd
        ? shortDate(row.bestStart)
        : `${shortDate(row.bestStart)} → ${shortDate(row.bestEnd)}`
      : "";
  return `<span class="run-badge"><span class="run-badge-num">${row.bestRun}</span><span class="run-badge-label">clean ${row.bestRun === 1 ? "day" : "days"}${window ? ` · ${escapeHtml(window)}` : ""}</span></span>`;
}

function renderCard(row: RowView): string {
  const region = row.result.region
    ? `<span class="rank-card-region">${escapeHtml(row.result.region)}</span>`
    : "";
  const blocker =
    !row.qualifier && row.result.blocker
      ? `<p class="rank-card-blocker">${escapeHtml(row.result.blocker)}</p>`
      : "";
  return `<li class="rank-card" id="${escapeHtml(row.result.slug)}" data-slug="${escapeHtml(row.result.slug)}" data-region="${escapeHtml(row.result.region ?? "")}" data-qualifier="${row.qualifier ? "1" : "0"}">
    <a class="rank-card-link" href="${destinationLink(row.result.slug)}">
      <header class="rank-card-header">
        <span class="rank-card-rank" aria-label="Rank ${row.rank}">${row.rank}</span>
        <div class="rank-card-title">
          <span class="rank-card-name">${escapeHtml(row.result.name)}</span>
          ${region}
        </div>
        ${renderStatus(row)}
      </header>
      <div class="rank-card-stats">
        <span class="rank-stat"><span class="rank-stat-num">${row.medianTemp.toFixed(1)}°</span><span class="rank-stat-label">median high</span></span>
        <span class="rank-stat"><span class="rank-stat-num">${row.dryDays}</span><span class="rank-stat-label">dry days</span></span>
        ${renderRunBadge(row)}
      </div>
      <div class="rank-card-strip" aria-hidden="true">${renderStrip(row)}</div>
      ${blocker}
    </a>
  </li>`;
}

// Desktop table status column — same band as the mobile pill so the two views
// stay consistent. EDGE shows the partial run length + blocker hint so it
// doesn't read as a hard NO-GO when the destination is genuinely close.
function renderTableStatus(row: RowView): string {
  if (row.qualifier) return '<span class="qualifier-badge">GO</span>';
  const hint = row.result.blocker
    ? ` <span class="blocker">· ${escapeHtml(row.result.blocker)}</span>`
    : "";
  if (row.bestRun >= EDGE_RUN_MIN) {
    return `<span class="status-pill verdict-edge">EDGE · ${row.bestRun}d</span>${hint}`;
  }
  // NO-GO as a peer pill (was bare blocker text before — broke the visual
  // parallel with GO/EDGE and made the column read like a tooltip rather than
  // a status state).
  return `<span class="status-pill verdict-no-go">NO-GO</span>${hint}`;
}

function renderTableRow(row: RowView): string {
  const region = row.result.region
    ? `<span class="region">${escapeHtml(row.result.region)}</span>`
    : "";
  return `<tr id="${escapeHtml(row.result.slug)}-row" data-slug="${escapeHtml(row.result.slug)}" data-region="${escapeHtml(row.result.region ?? "")}" data-qualifier="${row.qualifier ? "1" : "0"}">
    <td class="rank">${row.rank}</td>
    <td><a class="dest dest-link" href="${destinationLink(row.result.slug)}">${escapeHtml(row.result.name)}</a>${region}</td>
    <td class="cell-num">${row.medianTemp.toFixed(1)}°C</td>
    <td><div class="strip">${renderStrip(row)}</div></td>
    <td class="cell-num">${row.bestRun}${row.bestStart ? ` · ${escapeHtml(shortDate(row.bestStart))}` : ""}</td>
    <td class="cell-num">${row.dryDays}</td>
    <td>${renderTableStatus(row)}</td>
  </tr>`;
}

function renderEmpty(): string {
  return `<li class="rank-empty">
    <p class="rank-empty-title">No destinations match.</p>
    <p class="rank-empty-msg">Try widening your thresholds or pick a different region.</p>
  </li>`;
}

function renderTableEmpty(): string {
  return `<tr class="rank-empty-row"><td colspan="7"><span class="rank-empty-title">No destinations match.</span> <span class="rank-empty-msg">Try widening your thresholds or pick a different region.</span></td></tr>`;
}

function summariseForSr(rows: RowView[]): string {
  if (rows.length === 0) return "No destinations match the current filter.";
  const first = rows[0];
  if (!first) return "";
  const top = `${first.result.name} ranks ${ordinal(first.rank)} with median high ${first.medianTemp.toFixed(0)}°C and ${first.dryDays} dry days.`;
  const goCount = rows.filter((r) => r.qualifier).length;
  const tail =
    goCount === 0
      ? "No destinations currently qualify."
      : goCount === 1
        ? "1 destination currently qualifies."
        : `${goCount} destinations currently qualify.`;
  return `${top} ${tail}`;
}

function applyFilter(rows: RowView[], filter: FilterMode): RowView[] {
  if (filter === "all") return rows;
  if (filter === "qualifiers") return rows.filter((r) => r.qualifier);
  return rows.filter((r) => r.result.region === filter);
}

function uniqueRegions(results: DestinationResult[]): string[] {
  return Array.from(
    new Set(
      results
        .map((r) => r.region)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  ).sort();
}

function renderFilterPills(results: DestinationResult[], active: FilterMode): string {
  const regions = uniqueRegions(results);
  const items: { key: FilterMode; label: string }[] = [
    { key: "all", label: "All" },
    { key: "qualifiers", label: "Qualifiers only" },
    ...regions.map((r) => ({ key: r as FilterMode, label: r })),
  ];
  return items
    .map(
      (item) =>
        `<button type="button" class="chip${item.key === active ? " active" : ""}" data-filter="${escapeHtml(String(item.key))}" role="tab" aria-selected="${item.key === active ? "true" : "false"}">${escapeHtml(item.label)}</button>`,
    )
    .join("");
}

function resolveMount<T extends HTMLElement>(mount: string | HTMLElement, label: string): T {
  const el = typeof mount === "string" ? document.querySelector<T>(mount) : (mount as T);
  if (!el) throw new Error(`mountRanking: ${label} mount not found`);
  return el;
}

export function mountRanking(opts: MountRankingOptions): RankingHandle {
  const cards = resolveMount<HTMLElement>(opts.cardsMount, "cards");
  const tableBody = resolveMount<HTMLElement>(opts.tableMount, "table");
  const filters = resolveMount<HTMLElement>(opts.filtersMount, "filters");
  const live = opts.liveRegionMount
    ? resolveMount<HTMLElement>(opts.liveRegionMount, "live region")
    : null;

  let state: RankingState = {
    thresholds: DEFAULT_THRESHOLDS,
    filter: "all",
  };

  function render(): void {
    const t0 =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : 0;
    const view = buildView(opts.results, state.thresholds);
    const filtered = applyFilter(view, state.filter);
    if (filtered.length === 0) {
      cards.innerHTML = renderEmpty();
      tableBody.innerHTML = renderTableEmpty();
    } else {
      cards.innerHTML = filtered.map(renderCard).join("");
      tableBody.innerHTML = filtered.map(renderTableRow).join("");
    }
    if (live) live.textContent = summariseForSr(filtered);
    if (typeof performance !== "undefined" && typeof performance.mark === "function") {
      const dur = typeof performance.now === "function" ? performance.now() - t0 : 0;
      // Performance budget: aim ≤16ms per render on a typical phone. Surface
      // overshoots in dev via a single warning; do not throw.
      if (dur > 16) {
        console.warn(`[ranking] render took ${dur.toFixed(1)}ms (budget 16ms)`);
      }
    }
  }

  function renderFilters(): void {
    filters.innerHTML = renderFilterPills(opts.results, state.filter);
  }

  function onFilterClick(ev: Event): void {
    const target = (ev.target as HTMLElement | null)?.closest<HTMLElement>("[data-filter]");
    if (!target) return;
    const next = target.dataset.filter ?? "all";
    state = { ...state, filter: next as FilterMode };
    renderFilters();
    render();
  }

  filters.addEventListener("click", onFilterClick);

  renderFilters();
  render();

  return {
    setThresholds(t: Thresholds): void {
      state = { ...state, thresholds: t };
      render();
    },
    setFilter(f: FilterMode): void {
      state = { ...state, filter: f };
      renderFilters();
      render();
    },
    destroy(): void {
      filters.removeEventListener("click", onFilterClick);
      cards.innerHTML = "";
      tableBody.innerHTML = "";
      filters.innerHTML = "";
      if (live) live.textContent = "";
    },
  };
}
