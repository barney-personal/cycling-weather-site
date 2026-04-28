// Fetches `data.json` and normalises it to the M2 schema, supplying safe
// defaults for fields that legacy snapshots (pre-M2) didn't include. The
// daily refresh cron commits a fresh `data.json` to master at 04:45 UTC; we
// must tolerate the deploy window in either direction (new code + old data,
// or old code + new data).

import { json } from "d3-fetch";

import type {
  ChangelogEntry,
  DailyForecast,
  DestinationResult,
  HeroBlock,
  HourlyEntry,
  LatestSnapshot,
  NarrativeEntry,
  SiteData,
  SnapshotLite,
} from "./types";

const SLUG_RE = /[^a-z0-9]+/g;

export function slugify(name: string): string {
  const s = (name || "")
    .toLowerCase()
    .replace(SLUG_RE, "-")
    .replace(/^-+|-+$/g, "");
  return s || "destination";
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asNullableNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNullableString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asBool(v: unknown): boolean {
  return v === true;
}

function asNullableBool(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  return null;
}

function normaliseHourlyEntry(h: any): HourlyEntry {
  return {
    time: asString(h?.time),
    temp: asNumber(h?.temp),
    precip: asNumber(h?.precip),
    precip_prob: asNumber(h?.precip_prob),
    wind: asNumber(h?.wind),
    code: asNumber(h?.code),
  };
}

function normaliseDaily(d: any): DailyForecast {
  return {
    date: asString(d?.date),
    temp_max: asNumber(d?.temp_max),
    precip_sum: asNumber(d?.precip_sum),
    precip_prob_max: asNumber(d?.precip_prob_max),
    wind_max: asNumber(d?.wind_max),
    weather_code: asNumber(d?.weather_code),
    qualify: asBool(d?.qualify),
    hourly: Array.isArray(d?.hourly) ? d.hourly.map(normaliseHourlyEntry) : [],
  };
}

function normaliseResult(r: any): DestinationResult {
  const name = asString(r?.name);
  return {
    name,
    slug: asString(r?.slug, slugify(name)),
    region: typeof r?.region === "string" ? r.region : undefined,
    lat: typeof r?.lat === "number" ? r.lat : undefined,
    lon: typeof r?.lon === "number" ? r.lon : undefined,
    peak_temp: typeof r?.peak_temp === "number" ? r.peak_temp : undefined,
    median_temp: asNumber(r?.median_temp),
    best_run: asNumber(r?.best_run),
    best_start: asNullableString(r?.best_start),
    best_end: asNullableString(r?.best_end),
    dry_days: asNumber(r?.dry_days),
    qualifier: asBool(r?.qualifier),
    blocker: asNullableString(r?.blocker),
    score: asNumber(r?.score),
    daily: Array.isArray(r?.daily) ? r.daily.map(normaliseDaily) : [],
  };
}

function normaliseLatest(l: any): LatestSnapshot | null {
  if (!l || typeof l !== "object") return null;
  const results = Array.isArray(l.results) ? l.results.map(normaliseResult) : [];
  return {
    generated_at: asString(l.generated_at),
    forecast_date: asString(l.forecast_date),
    forecast_days: asNumber(l.forecast_days, results[0]?.daily.length ?? 14),
    qualify_thresholds: l.qualify_thresholds ?? {
      temp_max_gt: 18,
      precip_sum_eq: 2,
      precip_prob_lt: 30,
      weather_code_in: [0, 1, 2, 3],
      wind_max_lt: 30,
    },
    qualifier_rule: asString(l.qualifier_rule),
    verdict: asString(l.verdict, "no-go"),
    outlook: asString(l.outlook),
    results,
  };
}

// Reconstruct a hero block when the data.json predates M2.
function deriveHero(latest: LatestSnapshot | null): HeroBlock | null {
  if (!latest || latest.results.length === 0) return null;
  const ranked = [...latest.results].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top) return null;
  const goCount = ranked.filter((r) => r.qualifier).length;
  const verdict: HeroBlock["verdict"] = goCount >= 3 ? "go" : goCount >= 1 ? "edge" : "no-go";
  return {
    verdict,
    top_slug: top.slug || slugify(top.name),
    top_name: top.name,
    top_region: top.region ?? null,
    top_score: top.score,
    top_median_temp: top.median_temp,
    top_best_run: top.best_run,
    lead_window_start: top.best_start ?? null,
    lead_window_end: top.best_end ?? null,
    go_count: goCount,
    total_count: ranked.length,
    editorial: `Top pick: ${top.name}.`,
    outlook: latest.outlook || null,
    forecast_date: latest.forecast_date || null,
  };
}

function normaliseHero(h: any, latest: LatestSnapshot | null): HeroBlock | null {
  if (!h || typeof h !== "object") return deriveHero(latest);
  const verdictRaw = asString(h.verdict, "no-go");
  const verdict: HeroBlock["verdict"] =
    verdictRaw === "go" || verdictRaw === "edge" || verdictRaw === "no-go" ? verdictRaw : "no-go";
  return {
    verdict,
    top_slug: asString(h.top_slug, slugify(asString(h.top_name))),
    top_name: asString(h.top_name),
    top_region: asNullableString(h.top_region),
    top_score: asNullableNumber(h.top_score),
    top_median_temp: asNullableNumber(h.top_median_temp),
    top_best_run: asNullableNumber(h.top_best_run),
    lead_window_start: asNullableString(h.lead_window_start),
    lead_window_end: asNullableString(h.lead_window_end),
    go_count: asNumber(h.go_count),
    total_count: asNumber(h.total_count),
    editorial: asString(h.editorial),
    outlook: asNullableString(h.outlook),
    forecast_date: asNullableString(h.forecast_date),
  };
}

function normaliseChangelog(c: unknown): ChangelogEntry[] {
  if (!Array.isArray(c)) return [];
  return c.map((e: any) => ({
    name: asString(e?.name),
    slug: asString(e?.slug, slugify(asString(e?.name))),
    region: asNullableString(e?.region),
    rank_now: asNumber(e?.rank_now),
    rank_prev: asNullableNumber(e?.rank_prev),
    rank_delta: asNullableNumber(e?.rank_delta),
    qualifier_now: asBool(e?.qualifier_now),
    qualifier_prev: asNullableBool(e?.qualifier_prev),
    qualifier_flip: asBool(e?.qualifier_flip),
  }));
}

function normaliseNarratives(n: unknown): NarrativeEntry[] {
  if (!Array.isArray(n)) return [];
  return n
    .filter((e) => e && typeof e === "object")
    .map((e: any) => ({
      kind: asString(e.kind, "calibration_hit"),
      destination: asString(e.destination),
      copy: asString(e.copy),
      generated_at: asString(e.generated_at),
    }));
}

function normaliseSnapshots(s: unknown): SnapshotLite[] {
  if (!Array.isArray(s)) return [];
  return s.map((snap: any) => ({
    forecast_date: asString(snap?.forecast_date),
    verdict: asString(snap?.verdict, "no-go"),
    outlook: asString(snap?.outlook),
    results: Array.isArray(snap?.results)
      ? snap.results.map((r: any) => ({
          name: asString(r?.name),
          slug: asString(r?.slug, slugify(asString(r?.name))),
          region: asNullableString(r?.region),
          median_temp: asNullableNumber(r?.median_temp),
          best_run: asNullableNumber(r?.best_run),
          dry_days: asNullableNumber(r?.dry_days),
          qualifier: asNullableBool(r?.qualifier),
          score: asNullableNumber(r?.score),
          blocker: asNullableString(r?.blocker),
        }))
      : [],
  }));
}

export function normaliseSiteData(raw: unknown): SiteData {
  const r = (raw && typeof raw === "object" ? (raw as any) : {}) as Record<string, unknown>;
  const latest = normaliseLatest(r.latest);
  const hero = normaliseHero(r.hero, latest);
  return {
    version: asNumber(r.version, 0),
    generated_at: asString(r.generated_at),
    latest,
    hero,
    changelog: normaliseChangelog(r.changelog),
    narratives: normaliseNarratives(r.narratives),
    forecasts_count: asNumber(r.forecasts_count),
    actuals_count: asNumber(r.actuals_count),
    calibration: Array.isArray(r.calibration) ? (r.calibration as any) : [],
    actuals_timeline: Array.isArray(r.actuals_timeline) ? (r.actuals_timeline as any) : [],
    snapshots: normaliseSnapshots(r.snapshots),
  };
}

export async function loadSiteData(url = "data.json"): Promise<SiteData> {
  // cache: "no-store" defeats both the browser HTTP cache AND any future
  // mis-installed service worker — the SW also has a hard exclusion for
  // /data.json (see scripts/sw-source.js). Together this guarantees a
  // freshly-deployed cron rebuild is never masked by stale data.
  const raw = await json<unknown>(url, { cache: "no-store" });
  return normaliseSiteData(raw);
}
