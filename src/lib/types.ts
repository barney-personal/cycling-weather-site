// Shape of `data.json` consumed by the static site. Mirrors the output of
// `scripts/cycling_weather_data_build.py`. Optional fields tolerate older
// pre-M2 snapshots (where `version`, `hero`, `changelog`, `narratives`, and
// per-result `slug` were absent); the loader in `./data.ts` fills sensible
// defaults so the deploy window between PR merge and the next 04:45 UTC cron
// remains safe.

export type Verdict = "go" | "edge" | "no-go" | "qualifier" | string;

export interface HourlyEntry {
  time: string;
  temp: number;
  precip: number;
  precip_prob: number;
  wind: number;
  code: number;
}

export interface DailyForecast {
  date: string;
  temp_max: number;
  precip_sum: number;
  precip_prob_max: number;
  wind_max: number;
  weather_code: number;
  qualify: boolean;
  hourly: HourlyEntry[];
}

export interface DestinationResult {
  name: string;
  slug: string;
  region?: string;
  lat?: number;
  lon?: number;
  peak_temp?: number;
  median_temp: number;
  best_run: number;
  best_start?: string | null;
  best_end?: string | null;
  dry_days: number;
  qualifier: boolean;
  blocker?: string | null;
  score: number;
  daily: DailyForecast[];
}

export interface QualifyThresholds {
  temp_max_gt: number;
  precip_sum_eq: number;
  precip_prob_lt: number;
  weather_code_in: number[];
  wind_max_lt: number;
}

export interface LatestSnapshot {
  generated_at: string;
  forecast_date: string;
  forecast_days: number;
  qualify_thresholds: QualifyThresholds;
  qualifier_rule: string;
  verdict: Verdict;
  outlook: string;
  results: DestinationResult[];
}

export interface HeroBlock {
  verdict: "go" | "edge" | "no-go";
  top_slug: string;
  top_name: string;
  top_region: string | null;
  top_score: number | null;
  top_median_temp: number | null;
  top_best_run: number | null;
  lead_window_start: string | null;
  lead_window_end: string | null;
  go_count: number;
  total_count: number;
  editorial: string;
  outlook: string | null;
  forecast_date: string | null;
}

export interface ChangelogEntry {
  name: string;
  slug: string;
  region: string | null;
  rank_now: number;
  rank_prev: number | null;
  rank_delta: number | null;
  qualifier_now: boolean;
  qualifier_prev: boolean | null;
  qualifier_flip: boolean;
}

export interface NarrativeEntry {
  // Reserved for matured-forecast retrospectives once calibration data
  // accumulates. Today the build script always emits `[]` here.
  kind: "calibration_hit" | "calibration_miss" | string;
  destination: string;
  copy: string;
  generated_at: string;
}

export interface CalibrationRow {
  snapshot_date: string;
  target_date: string;
  name: string;
  lead_days: number;
  predicted_temp: number | null;
  predicted_precip: number | null;
  predicted_qualify: boolean | null;
  actual_temp: number | null;
  actual_precip: number | null;
  actual_qualify: boolean | null;
}

export interface ActualsTimelineRow {
  date: string;
  name: string;
  region?: string;
  temp_max: number;
  precip_sum: number;
  wind_max: number;
  qualify: boolean;
}

export interface SnapshotResultLite {
  name: string;
  slug?: string;
  region: string | null;
  median_temp: number | null;
  best_run: number | null;
  dry_days: number | null;
  qualifier: boolean | null;
  score: number | null;
  blocker: string | null;
}

export interface SnapshotLite {
  forecast_date: string;
  verdict: Verdict;
  outlook: string;
  results: SnapshotResultLite[];
}

export interface ClimatologyEntry {
  name: string;
  median_temp_max: number | null;
  p10_temp_max: number | null;
  p90_temp_max: number | null;
  median_precip_sum: number | null;
  sample_size: number;
  years: number;
}

export interface ClimatologyBlock {
  generated_at: string;
  anchor_date: string;
  window_start: string;
  window_end: string;
  window_label: string;
  years: number;
  destinations: ClimatologyEntry[];
}

export interface SiteData {
  version: number;
  generated_at: string;
  latest: LatestSnapshot | null;
  hero: HeroBlock | null;
  changelog: ChangelogEntry[];
  narratives: NarrativeEntry[];
  forecasts_count: number;
  actuals_count: number;
  calibration: CalibrationRow[];
  actuals_timeline: ActualsTimelineRow[];
  snapshots: SnapshotLite[];
  climatology: ClimatologyBlock | null;
}
