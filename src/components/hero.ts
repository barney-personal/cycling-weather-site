// Homepage hero — big verdict, top-pick destination, editorial copy, lead
// window, and a "what changed since yesterday" chip row pulled from the
// changelog block. Falls back gracefully when the data.json predates M2
// (no `hero`, no `changelog`); the loader's `deriveHero` reconstructs a
// minimal hero from `latest`, and changelog is `[]`.

import type { ChangelogEntry, HeroBlock, SiteData } from "../lib/types";

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

function renderEmpty(target: HTMLElement, message: string): void {
  target.innerHTML = `
    <section class="hero hero-empty" id="hero" aria-live="polite">
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

  const { hero, latest, changelog } = options.data;
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

  const generated = hero.forecast_date || latest.forecast_date;
  const generatedHuman = generated ? shortDate(generated) : "";
  const metaLine = `Forecast ${escapeHtml(generated || "—")}${
    generatedHuman ? ` · ${escapeHtml(generatedHuman)}` : ""
  } · ${latest.results.length} destinations · ${latest.forecast_days}-day window`;

  target.innerHTML = `
    <section class="hero hero-${verdict}" id="hero" aria-live="polite">
      <div class="hero-header">
        <span class="hero-verdict-pill verdict-${verdict}" aria-label="${escapeHtml(VERDICT_DESCRIPTION[verdict])}">${VERDICT_LABEL[verdict]}</span>
        <p class="hero-eyebrow"><span class="visually-hidden">Today's </span>top pick</p>
      </div>
      <h1 class="hero-destination">
        <a class="hero-destination-link" href="./index.html#${escapeHtml(hero.top_slug)}">${escapeHtml(hero.top_name)}</a>
        ${region}
      </h1>
      <p class="hero-editorial" id="verdict">${escapeHtml(editorial)}</p>
      <p class="hero-window">${escapeHtml(leadWindowLine(hero))}</p>
      <div class="hero-stats">${tempLine}${runLine}${goCountLine}</div>
      ${chipsBlock}
      <p class="hero-meta" id="meta">${metaLine}</p>
    </section>
  `;
}
