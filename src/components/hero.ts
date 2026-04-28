// Homepage hero — big verdict, top-pick destination, editorial copy, lead
// window, "what changed since yesterday" chip row, and (M3) a top-3 GO
// leaderboard row beneath the verdict block. Falls back gracefully when the
// data.json predates M2 (no `hero`, no `changelog`); the loader's
// `deriveHero` reconstructs a minimal hero from `latest`, and changelog is
// `[]`.

import { DEFAULT_THRESHOLDS, dayMatches, rankWithThresholds } from "../lib/qualify";
import { rainBucket, tempColour, windBucket } from "../lib/strip";
import type { ChangelogEntry, DestinationResult, HeroBlock, SiteData } from "../lib/types";
import {
  findClimatologyEntry,
  formatClimatologyContext,
  renderClimatologyLine,
} from "./climatology-line";

const VERDICT_LABEL: Record<HeroBlock["verdict"], string> = {
  go: "GO",
  edge: "EDGE",
  "no-go": "NO-GO",
};

const VERDICT_DESCRIPTION: Record<HeroBlock["verdict"], string> = {
  go: "Clean ride window detected",
  edge: "Marginal — a window may emerge",
  "no-go": "No clean window in the next 14 days",
};

// Mini-strip horizon — the next week reads at a glance without competing
// with the 14-day cells in the ranking table below.
const MINI_STRIP_DAYS = 7;

// How many GO destinations to surface in the leaderboard row.
const TOP_GO_LIMIT = 3;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

// Best-effort short month/day formatter, locale-aware. Falls back to the
// raw ISO date if parsing fails.
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

function leadWindowLine(hero: HeroBlock): string {
  const start = shortDate(hero.lead_window_start);
  const end = shortDate(hero.lead_window_end);
  if (!start && !end) {
    return hero.top_best_run && hero.top_best_run > 0
      ? `Best clean run: ${hero.top_best_run} day${hero.top_best_run === 1 ? "" : "s"}`
      : "No clean run yet";
  }
  if (start && end && start !== end) {
    return `Best window: ${start} → ${end} (${hero.top_best_run ?? 0} clean days)`;
  }
  return `Best window: ${start || end} (${hero.top_best_run ?? 0} clean days)`;
}

function deltaIcon(delta: number): string {
  if (delta > 0) return "↑";
  if (delta < 0) return "↓";
  return "→";
}

function deltaClass(delta: number): string {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

// Pick the most newsworthy changelog entries: qualifier flips first,
// then big rank moves. Capped so the row stays scannable.
function selectChangelogChips(changelog: ChangelogEntry[]): ChangelogEntry[] {
  if (changelog.length === 0) return [];
  const flips = changelog.filter((c) => c.qualifier_flip);
  const movers = changelog
    .filter((c) => !c.qualifier_flip && c.rank_delta !== null && Math.abs(c.rank_delta) >= 2)
    .sort((a, b) => Math.abs(b.rank_delta ?? 0) - Math.abs(a.rank_delta ?? 0));
  return [...flips, ...movers].slice(0, 4);
}

function renderChangelogChip(entry: ChangelogEntry): string {
  const name = escapeHtml(entry.name);
  if (entry.qualifier_flip) {
    const text = entry.qualifier_now ? "→ GO" : "→ no-go";
    const cls = entry.qualifier_now ? "flip-go" : "flip-nogo";
    return `<li class="changelog-chip ${cls}"><span class="changelog-name">${name}</span><span class="changelog-text">${text}</span></li>`;
  }
  const delta = entry.rank_delta ?? 0;
  const icon = deltaIcon(delta);
  const cls = `delta-${deltaClass(delta)}`;
  const magnitude = Math.abs(delta);
  return `<li class="changelog-chip ${cls}"><span class="changelog-name">${name}</span><span class="changelog-text">${icon}${magnitude}</span></li>`;
}

// Render the next-7-day mini-strip for one destination. Reuses the
// `.strip-cell` token vocabulary (rain dot density, wind hatching, qualifier
// outline) from the homepage ranking — the cells are sized smaller via a
// `.top-go-strip` wrapper. Hero rendering currently fixes thresholds at
// `DEFAULT_THRESHOLDS`; if we later wire the dial to re-render the hero,
// this becomes the single point that needs to read live thresholds.
function renderMiniStrip(daily: DestinationResult["daily"]): string {
  return daily
    .slice(0, MINI_STRIP_DAYS)
    .map((d) => {
      const fill = tempColour(d.temp_max);
      const rain = rainBucket(d.precip_sum, d.precip_prob_max);
      const wind = windBucket(d.wind_max);
      const qualifies = dayMatches(d, DEFAULT_THRESHOLDS);
      const cls = ["strip-cell", `rain-${rain}`, `wind-${wind}`, qualifies ? "is-qualify" : ""]
        .filter(Boolean)
        .join(" ");
      return `<span class="${cls}" style="--cell-fill:${fill}" aria-hidden="true"></span>`;
    })
    .join("");
}

function destinationHref(slug: string): string {
  return `./destination.html?slug=${encodeURIComponent(slug)}`;
}

// Build the top-3 GO leaderboard from `latest.results`. Re-uses the same
// scoring (rankWithThresholds at DEFAULT_THRESHOLDS) as the ranking
// table beneath, so the order matches what the user sees when they scroll
// down. Returns `[]` when no destination qualifies — caller decides whether
// to render anything.
function selectTopGo(results: DestinationResult[]): DestinationResult[] {
  const ranked = rankWithThresholds(results, DEFAULT_THRESHOLDS);
  return ranked
    .filter((r) => r.qualifier)
    .slice(0, TOP_GO_LIMIT)
    .map((r) => r.result);
}

function renderTopGoRow(results: DestinationResult[]): string {
  const top = selectTopGo(results);
  if (top.length === 0) return "";
  const items = top
    .map((r) => {
      const region = r.region ? `<span class="top-go-region">${escapeHtml(r.region)}</span>` : "";
      const tempLabel = `${r.median_temp.toFixed(1)}° median high`;
      const aria = `${r.name}${r.region ? `, ${r.region}` : ""} — GO, ${tempLabel}, ${r.best_run} clean-day run; open destination page.`;
      return `<li class="top-go-card">
        <a class="top-go-link" href="${destinationHref(r.slug)}" aria-label="${escapeHtml(aria)}">
          <span class="top-go-header">
            <span class="top-go-pill verdict-go" aria-hidden="true">GO</span>
            <span class="top-go-temp" aria-hidden="true">${r.median_temp.toFixed(1)}°</span>
          </span>
          <span class="top-go-title">
            <span class="top-go-name">${escapeHtml(r.name)}</span>
            ${region}
          </span>
          <span class="top-go-strip" aria-hidden="true">${renderMiniStrip(r.daily)}</span>
        </a>
      </li>`;
    })
    .join("");
  return `<div class="top-go-row" aria-label="Top GO destinations">
      <p class="top-go-eyebrow">Top ${top.length} GO ${top.length === 1 ? "destination" : "destinations"}</p>
      <ul class="top-go-list">${items}</ul>
    </div>`;
}

function renderEmpty(target: HTMLElement, message: string): void {
  target.innerHTML = `
    <section class="hero hero-empty" aria-live="polite">
      <p class="hero-eyebrow">Cycling Weather</p>
      <p class="hero-empty-msg">${escapeHtml(message)}</p>
    </section>
  `;
}

export interface MountHeroOptions {
  mount: string | HTMLElement;
  data: SiteData;
}

export function mountHero(options: MountHeroOptions): void {
  const target =
    typeof options.mount === "string"
      ? document.querySelector<HTMLElement>(options.mount)
      : options.mount;
  if (!target) return;

  target.dataset.loaded = "1";

  const { hero, latest, changelog, climatology } = options.data;
  if (!hero || !latest || latest.results.length === 0) {
    renderEmpty(target, "No snapshot yet — the daily forecast will appear here.");
    return;
  }

  const verdict = hero.verdict;
  const editorial =
    hero.editorial && hero.editorial.trim().length > 0
      ? hero.editorial
      : `Top pick: ${hero.top_name}.`;
  const region = hero.top_region
    ? `<span class="hero-region">${escapeHtml(hero.top_region)}</span>`
    : "";
  const tempLine =
    typeof hero.top_median_temp === "number"
      ? `<span class="hero-stat"><span class="hero-stat-num">${hero.top_median_temp.toFixed(1)}°</span><span class="hero-stat-label">median high</span></span>`
      : "";
  const goCountLine = `<span class="hero-stat"><span class="hero-stat-num">${hero.go_count}<span class="hero-stat-divider">/</span>${hero.total_count}</span><span class="hero-stat-label">go destinations</span></span>`;
  const runLine =
    hero.top_best_run !== null && hero.top_best_run > 0
      ? `<span class="hero-stat"><span class="hero-stat-num">${hero.top_best_run}</span><span class="hero-stat-label">clean-day run</span></span>`
      : "";

  const chips = selectChangelogChips(changelog);
  const chipsBlock =
    chips.length > 0
      ? `<div class="changelog-row" aria-label="What changed since yesterday">
           <p class="changelog-eyebrow">Since yesterday</p>
           <ul class="changelog-list">${chips.map(renderChangelogChip).join("")}</ul>
         </div>`
      : "";

  const topGoBlock = renderTopGoRow(latest.results);

  const climatologyEntry = findClimatologyEntry(climatology, hero.top_name);
  const climatologyContext = formatClimatologyContext(
    hero.top_median_temp,
    climatologyEntry,
    climatology,
    hero.top_name,
  );
  const climatologyBlock = renderClimatologyLine(
    climatologyContext,
    `Climatology comparison for ${hero.top_name}`,
  );

  const generated = hero.forecast_date || latest.forecast_date;
  const generatedHuman = generated ? shortDate(generated) : "";
  const metaLine = `Forecast ${escapeHtml(generated || "—")}${
    generatedHuman ? ` · ${escapeHtml(generatedHuman)}` : ""
  } · ${latest.results.length} destinations · ${latest.forecast_days}-day window`;

  target.innerHTML = `
    <section class="hero hero-${verdict}" aria-live="polite">
      <div class="hero-header">
        <span class="hero-verdict-pill verdict-${verdict}" aria-label="${escapeHtml(VERDICT_DESCRIPTION[verdict])}">${VERDICT_LABEL[verdict]}</span>
        <p class="hero-eyebrow"><span class="visually-hidden">Today's </span>top pick</p>
      </div>
      <h1 class="hero-destination">
        <a class="hero-destination-link" href="./index.html#${escapeHtml(hero.top_slug)}">${escapeHtml(hero.top_name)}</a>
        ${region}
      </h1>
      <p class="hero-editorial">${escapeHtml(editorial)}</p>
      <p class="hero-window">${escapeHtml(leadWindowLine(hero))}</p>
      <div class="hero-stats">${tempLine}${runLine}${goCountLine}</div>
      ${climatologyBlock}
      ${topGoBlock}
      ${chipsBlock}
      <p class="hero-meta">${metaLine}</p>
    </section>
  `;
}
