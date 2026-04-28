// Destination depth page — assembled from the loader's `SiteData`, the M5
// `qualify` engine, and `destination-meta.ts` curated copy. Sections, top to
// bottom:
//   1. Page hero  — verdict pill, big name, region, meta line
//   2. Quick stats (median high, dry days, best run, qualifier status)
//   3. Polar chart (lazy-imported — `await import("./polar")`)
//   4. 14-day detail cards (per-day temp / rain / wind / code icon)
//   5. Climatology strip — last N actuals from `actuals_timeline`
//   6. Curated route + ride-type chips
//   7. FAQ — "is it good for cyclists in <month>?"
//   8. Signature copy + airport hint
//
// Unknown slug → friendly 404 panel with link home.

import {
  type DestinationMeta,
  type SignatureRoute,
  formatBestMonths,
  getDestinationMeta,
  hasDestinationMeta,
} from "../lib/destination-meta";
import { DEFAULT_THRESHOLDS, type Thresholds, bestRun, dayMatches } from "../lib/qualify";
import type { ActualsTimelineRow, DailyForecast, DestinationResult, SiteData } from "../lib/types";

export interface MountDestinationOptions {
  mount: HTMLElement;
  data: SiteData;
  slug: string;
  /** Threshold overrides (URL state). Defaults to Python defaults. */
  thresholds?: Thresholds;
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

function fullDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const WEATHER_CODE_LABEL: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Heavy showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunder + hail",
  99: "Heavy thunder",
};

const WEATHER_CODE_GLYPH: Record<number, string> = {
  0: "☀",
  1: "🌤",
  2: "⛅",
  3: "☁",
  45: "🌫",
  48: "🌫",
  51: "🌦",
  53: "🌦",
  55: "🌧",
  61: "🌧",
  63: "🌧",
  65: "🌧",
  71: "❄",
  73: "❄",
  75: "❄",
  77: "❄",
  80: "🌧",
  81: "🌧",
  82: "⛈",
  95: "⛈",
  96: "⛈",
  99: "⛈",
};

function weatherLabel(code: number): string {
  return WEATHER_CODE_LABEL[code] ?? `Code ${code}`;
}

function weatherGlyph(code: number): string {
  return WEATHER_CODE_GLYPH[code] ?? "·";
}

function verdictForRun(run: number, qualifier: boolean): "go" | "edge" | "no-go" {
  if (qualifier) return "go";
  if (run >= 5) return "edge";
  return "no-go";
}

function findDestination(data: SiteData, slug: string): DestinationResult | null {
  if (!data.latest) return null;
  return data.latest.results.find((r) => r.slug === slug) ?? null;
}

function climatologyFor(timeline: ActualsTimelineRow[], name: string): ActualsTimelineRow[] {
  return timeline
    .filter((row) => row.name === name)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);
}

function renderRouteHint(routes: SignatureRoute[]): string {
  if (routes.length === 0) {
    return `<p class="dest-routes-empty">Curated route notes coming soon.</p>`;
  }
  return `<ul class="dest-routes">${routes
    .map(
      (r) => `<li class="dest-route">
        <span class="dest-route-name">${escapeHtml(r.name)}</span>
        ${
          r.distanceKm || r.ascentM
            ? `<span class="dest-route-stats">${r.distanceKm ? `${r.distanceKm} km` : ""}${
                r.distanceKm && r.ascentM ? " · " : ""
              }${r.ascentM ? `${r.ascentM} m` : ""}</span>`
            : ""
        }
        ${r.note ? `<span class="dest-route-note">${escapeHtml(r.note)}</span>` : ""}
      </li>`,
    )
    .join("")}</ul>`;
}

function renderRideTypeChips(types: DestinationMeta["rideTypes"]): string {
  if (types.length === 0) return "";
  return `<ul class="dest-tags" aria-label="Ride types">${types
    .map((t) => `<li class="dest-tag">${escapeHtml(t)}</li>`)
    .join("")}</ul>`;
}

function renderForecastDay(d: DailyForecast, qualifies: boolean, i: number): string {
  return `<li class="dest-day${qualifies ? " is-qualify" : ""}" aria-label="${escapeHtml(`Day ${i + 1}: ${fullDate(d.date)}`)}">
    <header class="dest-day-header">
      <span class="dest-day-date">${escapeHtml(fullDate(d.date))}</span>
      <span class="dest-day-glyph" aria-hidden="true">${weatherGlyph(d.weather_code)}</span>
    </header>
    <p class="dest-day-temp"><span class="dest-day-temp-num">${d.temp_max.toFixed(0)}°</span><span class="dest-day-temp-unit">C high</span></p>
    <dl class="dest-day-stats">
      <div><dt>Rain</dt><dd>${d.precip_sum.toFixed(1)} mm · ${Math.round(d.precip_prob_max)}%</dd></div>
      <div><dt>Wind</dt><dd>${d.wind_max.toFixed(0)} km/h</dd></div>
      <div><dt>Sky</dt><dd>${escapeHtml(weatherLabel(d.weather_code))}</dd></div>
    </dl>
    ${qualifies ? '<p class="dest-day-badge">Qualifies</p>' : ""}
  </li>`;
}

function renderClimatology(rows: ActualsTimelineRow[]): string {
  if (rows.length === 0) {
    return `<p class="dest-climatology-empty">Actuals are still ripening — they accumulate as the daily snapshots mature.</p>`;
  }
  const cells = rows
    .map((r) => {
      const fillHue = (() => {
        const t = Math.min(35, Math.max(5, r.temp_max));
        const h = 220 - ((t - 5) / 30) * 202;
        return `hsl(${h.toFixed(0)}, 55%, 55%)`;
      })();
      const wet = r.precip_sum > 1 ? "wet" : r.precip_sum > 0 ? "light" : "clean";
      const aria = `${r.date}: ${r.temp_max.toFixed(0)}°C, ${r.precip_sum.toFixed(1)} mm rain, ${r.wind_max.toFixed(0)} km/h wind${r.qualify ? ", qualified" : ""}`;
      return `<span class="dest-climatology-cell rain-${wet}${r.qualify ? " is-qualify" : ""}" style="--cell-fill:${fillHue}" role="img" aria-label="${escapeHtml(aria)}"></span>`;
    })
    .join("");
  const dryDays = rows.filter((r) => r.precip_sum <= 0.1).length;
  const qualifyDays = rows.filter((r) => r.qualify).length;
  return `<div class="dest-climatology">
    <div class="dest-climatology-strip" aria-hidden="true">${cells}</div>
    <p class="dest-climatology-summary">Last ${rows.length} days · ${dryDays} dry · ${qualifyDays} would have qualified.</p>
  </div>`;
}

function faqMonthName(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "this month";
  return d.toLocaleDateString(undefined, { month: "long", timeZone: "UTC" });
}

function renderFaq(
  result: DestinationResult,
  meta: DestinationMeta,
  forecastDate: string | null,
  bestRunLen: number,
  qualifier: boolean,
): string {
  const month = faqMonthName(forecastDate ?? result.daily[0]?.date ?? "");
  const monthIdx = forecastDate
    ? new Date(`${forecastDate}T00:00:00Z`).getUTCMonth() + 1
    : new Date().getUTCMonth() + 1;
  const inSeason = meta.bestMonths.includes(monthIdx);
  const seasonLine = inSeason
    ? `${month} sits inside the favoured riding window (${formatBestMonths(meta.bestMonths)}).`
    : meta.bestMonths.length > 0
      ? `${month} is outside the typical sweet spot (${formatBestMonths(meta.bestMonths)}).`
      : "Best months are still being collected.";
  const verdictLine = qualifier
    ? `Yes — the next 14 days produce a clean ${bestRunLen}-day window.`
    : bestRunLen >= 5
      ? `Maybe — the forecast shows a ${bestRunLen}-day stretch that's almost there. Consider widening rain or wind tolerance.`
      : "Not yet — no contiguous clean window is in the next 14 days.";

  return `<dl class="dest-faq">
    <div>
      <dt>Is ${escapeHtml(result.name)} good for cycling in ${escapeHtml(month)}?</dt>
      <dd>${escapeHtml(verdictLine)} ${escapeHtml(seasonLine)}</dd>
    </div>
    <div>
      <dt>What's the climate like overall?</dt>
      <dd>${escapeHtml(meta.climateNote)}</dd>
    </div>
    <div>
      <dt>How would I get there?</dt>
      <dd>${meta.airport ? `Closest airport: ${escapeHtml(meta.airport)}.` : "Local rail or road access only."} Departure region: ${escapeHtml(meta.departureRegion)}.</dd>
    </div>
  </dl>`;
}

function render404(mount: HTMLElement, slug: string): void {
  mount.innerHTML = `
    <section class="dest-404" aria-labelledby="dest-404-title">
      <p class="dest-404-eyebrow">404</p>
      <h1 id="dest-404-title" class="dest-404-title">No destination ${escapeHtml(slug ? `"${slug}"` : "selected")}.</h1>
      <p class="dest-404-msg">Either the slug is wrong, or the destination has been removed from the daily snapshot. Try the home page for the current ranking.</p>
      <a class="dest-404-link" href="./index.html">← Back to today's ranking</a>
    </section>`;
}

export function mountDestinationPage(opts: MountDestinationOptions): void {
  const { mount, data, slug } = opts;
  const thresholds = opts.thresholds ?? DEFAULT_THRESHOLDS;

  const result = findDestination(data, slug);
  if (!result) {
    render404(mount, slug);
    return;
  }

  const meta = getDestinationMeta(slug);
  const isCurated = hasDestinationMeta(slug);

  const qualifies = result.daily.map((d) => dayMatches(d, thresholds));
  const run = bestRun(qualifies);
  const dryDays = result.daily.reduce(
    (acc, d) =>
      acc + (d.precip_sum <= thresholds.rainMax && d.precip_prob_max < thresholds.probMax ? 1 : 0),
    0,
  );
  const isUk = [
    "lake-district",
    "peak-district",
    "yorkshire-dales",
    "south-wales",
    "london-surrey-hills",
  ].includes(slug);
  const qualifier = run.length >= 7 && (!isUk || result.median_temp > 20);
  const verdict = verdictForRun(run.length, qualifier);

  const forecastDate = data.latest?.forecast_date ?? null;
  const climatology = climatologyFor(data.actuals_timeline, result.name);

  const region = result.region
    ? `<span class="dest-region">${escapeHtml(result.region)}</span>`
    : "";

  const verdictLabel = verdict === "go" ? "GO" : verdict === "edge" ? "EDGE" : "NO-GO";
  const runWindow =
    run.startIdx !== null && run.endIdx !== null
      ? run.startIdx === run.endIdx
        ? shortDate(result.daily[run.startIdx]?.date ?? null)
        : `${shortDate(result.daily[run.startIdx]?.date ?? null)} → ${shortDate(result.daily[run.endIdx]?.date ?? null)}`
      : "—";

  const blocker =
    !qualifier && result.blocker ? `<p class="dest-blocker">${escapeHtml(result.blocker)}</p>` : "";

  const fallbackBanner = !isCurated
    ? `<p class="dest-fallback">Curated guide notes are still being written for this destination.</p>`
    : "";

  mount.innerHTML = `
    <article class="dest-page" data-slug="${escapeHtml(slug)}" data-verdict="${verdict}">
      <p class="dest-back"><a class="dest-back-link" href="./index.html">← All destinations</a></p>

      <header class="dest-header hero hero-${verdict}" aria-labelledby="dest-title">
        <div class="hero-header">
          <span class="hero-verdict-pill verdict-${verdict}">${verdictLabel}</span>
          <p class="hero-eyebrow">14-day outlook</p>
        </div>
        <h1 id="dest-title" class="hero-destination">
          <span class="dest-title-name">${escapeHtml(result.name)}</span>
          ${region}
        </h1>
        <p class="hero-editorial">${escapeHtml(meta.terrain)}</p>
        <p class="hero-window">Best window: ${escapeHtml(runWindow)} · ${run.length} clean ${run.length === 1 ? "day" : "days"}${
          forecastDate ? ` · forecast ${escapeHtml(shortDate(forecastDate))}` : ""
        }</p>
        <div class="hero-stats">
          <span class="hero-stat"><span class="hero-stat-num">${result.median_temp.toFixed(1)}°</span><span class="hero-stat-label">median high</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${dryDays}</span><span class="hero-stat-label">dry days</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${run.length}</span><span class="hero-stat-label">best clean run</span></span>
        </div>
        ${blocker}
        ${renderRideTypeChips(meta.rideTypes)}
      </header>

      ${fallbackBanner}

      <section class="dest-section dest-section-polar" aria-labelledby="dest-polar-title">
        <h2 id="dest-polar-title" class="section-title">14-day rhythm</h2>
        <div id="dest-polar-mount" class="dest-polar-mount" aria-busy="true"></div>
      </section>

      <section class="dest-section" aria-labelledby="dest-forecast-title">
        <h2 id="dest-forecast-title" class="section-title">Day-by-day</h2>
        <ul class="dest-day-grid">
          ${result.daily.map((d, i) => renderForecastDay(d, qualifies[i] === true, i)).join("")}
        </ul>
      </section>

      <section class="dest-section" aria-labelledby="dest-climatology-title">
        <h2 id="dest-climatology-title" class="section-title">Recent actuals · ${escapeHtml(result.name)}</h2>
        ${renderClimatology(climatology)}
      </section>

      <section class="dest-section" aria-labelledby="dest-routes-title">
        <h2 id="dest-routes-title" class="section-title">Signature routes</h2>
        ${renderRouteHint(meta.routes)}
      </section>

      <section class="dest-section" aria-labelledby="dest-faq-title">
        <h2 id="dest-faq-title" class="section-title">Quick answers</h2>
        ${renderFaq(result, meta, forecastDate, run.length, qualifier)}
      </section>
    </article>`;

  // Lazy-load the polar chart so the homepage bundle doesn't pay for it.
  const polarMount = mount.querySelector<HTMLElement>("#dest-polar-mount");
  if (polarMount) {
    void import("./polar")
      .then(({ mountPolar }) => {
        mountPolar({
          mount: polarMount,
          days: result.daily,
          qualifies,
          label: result.name,
        });
        polarMount.removeAttribute("aria-busy");
      })
      .catch(() => {
        polarMount.innerHTML = `<p class="polar-empty">Polar chart unavailable.</p>`;
        polarMount.removeAttribute("aria-busy");
      });
  }
}
