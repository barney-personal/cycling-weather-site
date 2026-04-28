// Renders a "data freshness" footer line: forecast generated date + actuals
// through date + data.json built timestamp. Each segment falls back gracefully
// if the underlying data.json is older than the M2 schema (deploy-window safe).

import type { SiteData } from "../lib/types";

function formatBuilt(ts: string): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  // Use UTC to match the cron — local time would fluctuate across viewer time-zones.
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd} ${hh}:${mi} UTC`;
}

function latestActualsDate(data: SiteData): string | null {
  if (!Array.isArray(data.actuals_timeline) || data.actuals_timeline.length === 0) {
    return null;
  }
  let latest: string | null = null;
  for (const r of data.actuals_timeline) {
    if (!r?.date) continue;
    if (latest === null || r.date > latest) latest = r.date;
  }
  return latest;
}

export function freshnessLine(data: SiteData): string {
  const built = formatBuilt(data.generated_at);
  const forecastDate = data.hero?.forecast_date ?? data.latest?.forecast_date ?? null;
  const actualsThrough = latestActualsDate(data);
  const parts: string[] = [];
  if (forecastDate) parts.push(`Forecast generated <b>${forecastDate}</b>`);
  if (actualsThrough) parts.push(`actuals through <b>${actualsThrough}</b>`);
  parts.push(`data.json built <b>${built}</b>`);
  return parts.join(" · ");
}

export function mountFooterFreshness(selector: string, data: SiteData): void {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;
  el.innerHTML = freshnessLine(data);
}
