#!/usr/bin/env node
// M11 — generate per-destination iCal subscription files from data.json.
//
// One .ics per destination (and one all-go.ics for everywhere that
// qualifies today) is written to `<repoRoot>/ical/`. The URL stem is
// stable across rebuilds:
//
//   ./ical/{slug}.ics
//   ./ical/all-go.ics
//
// Each .ics carries an all-day VEVENT spanning the destination's best
// `bestRun` window (DEFAULT_THRESHOLDS — same `qualify` rule the homepage
// dial defaults to). DTEND is exclusive per RFC 5545 (best_end + 1d).
//
// The script is invoked from `npm run build`; the cron refresh script
// also calls it after `cycling_weather_data_build.py` so subscribers see
// fresh windows daily without a redeploy.
//
// Pure node, no third-party deps. Output is RFC-5545 friendly (CRLF
// line endings, ≤75-octet line folding, TEXT escaping). The `ical.js`
// parser validates the output in `tests/ical.spec.ts`.

import { readFile, mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");
const dataPath = join(repoRoot, "data.json");
const outDir = join(repoRoot, "ical");

// Mirrors `src/lib/qualify.ts` DEFAULT_THRESHOLDS (cycling-comfort).
// Hard-coded here because the script must run from vanilla node (no TS).
const DEFAULTS = {
  tempMin: 18,
  rainMax: 2,
  probMax: 30,
  windMax: 30,
  codeIn: new Set([0, 1, 2, 3]),
};
const QUALIFIER_RUN_MIN = 4;

function dayMatches(d) {
  if (!(d.temp_max > DEFAULTS.tempMin)) return false;
  if (!(d.precip_sum <= DEFAULTS.rainMax)) return false;
  if (!(d.precip_prob_max < DEFAULTS.probMax)) return false;
  if (!(d.wind_max < DEFAULTS.windMax)) return false;
  if (!DEFAULTS.codeIn.has(d.weather_code)) return false;
  return true;
}

function bestRun(qualifies) {
  let best = 0;
  let cur = 0;
  let bestStart = null;
  let bestEnd = null;
  let curStart = 0;
  for (let i = 0; i < qualifies.length; i++) {
    if (qualifies[i]) {
      if (cur === 0) curStart = i;
      cur += 1;
      if (cur > best) {
        best = cur;
        bestStart = curStart;
        bestEnd = i;
      }
    } else {
      cur = 0;
    }
  }
  return { length: best, startIdx: bestStart, endIdx: bestEnd };
}

// RFC 5545 §3.3.11 — escape semicolons, commas, backslashes, newlines in TEXT.
function escapeText(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

// RFC 5545 §3.1 — fold lines at 75 octets, continuation begins with single
// space. We measure octets not chars (UTF-8) for safety with é, ñ, etc.
function foldLine(line) {
  const buf = Buffer.from(line, "utf8");
  if (buf.length <= 75) return line;
  const out = [];
  let off = 0;
  // First chunk up to 75 octets.
  let take = Math.min(75, buf.length - off);
  out.push(buf.slice(off, off + take).toString("utf8"));
  off += take;
  // Subsequent continuation chunks: 1 space + 74 octets.
  while (off < buf.length) {
    take = Math.min(74, buf.length - off);
    out.push(` ${buf.slice(off, off + take).toString("utf8")}`);
    off += take;
  }
  return out.join("\r\n");
}

function joinIcs(lines) {
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

// "2026-04-28" -> "20260428"
function isoDateCompact(iso) {
  return iso.replace(/-/g, "");
}

// "2026-04-28T04:45:30.000Z" -> "20260428T044530Z"
function isoStampCompact(iso) {
  const safe = iso.length >= 19 ? iso : `${iso.slice(0, 10)}T00:00:00Z`;
  const date = safe.slice(0, 10).replace(/-/g, "");
  const time = safe.slice(11, 19).replace(/:/g, "");
  return `${date}T${time}Z`;
}

// "2026-04-28" -> next-day ISO "2026-04-29" (DTEND is exclusive for VALUE=DATE).
function nextDayIso(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function shortDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric", timeZone: "UTC" });
}

const PRODID = "-//Cycling Weather//Plan v1//EN";
const SITE_URL = "https://barney-personal.github.io/cycling-weather-site";

function buildEventLines({ uid, dtstamp, summary, description, url, startIso, endExclusiveIso }) {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${isoDateCompact(startIso)}`,
    `DTEND;VALUE=DATE:${isoDateCompact(endExclusiveIso)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${url}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ];
}

function calendarHeader({ name, description, dtstamp }) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `NAME:${escapeText(name)}`,
    `X-WR-CALNAME:${escapeText(name)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `X-WR-CALDESC:${escapeText(description)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
    `LAST-MODIFIED:${dtstamp}`,
  ];
}

function calendarFooter() {
  return ["END:VCALENDAR"];
}

function summariseWindow({ name, qualifyDays, medianTemp, startIso, endIso }) {
  const dates = startIso === endIso ? shortDate(startIso) : `${shortDate(startIso)}–${shortDate(endIso)}`;
  const tempLabel = Number.isFinite(medianTemp) ? `${medianTemp.toFixed(0)}°C median` : "";
  const parts = [
    `${qualifyDays} clean ${qualifyDays === 1 ? "day" : "days"} for cycling`,
    tempLabel,
    `Window: ${dates}`,
    `Forecast for ${name} (cycling-weather)`,
  ].filter(Boolean);
  return parts.join("\n");
}

function destinationCalendar(result, generatedAtIso) {
  const slug = result.slug;
  const name = result.name;
  const daily = Array.isArray(result.daily) ? result.daily : [];
  if (daily.length === 0) return null;

  const qualifies = daily.map((d) => dayMatches(d));
  const run = bestRun(qualifies);
  if (run.length === 0 || run.startIdx === null || run.endIdx === null) {
    // No qualifying window — emit an empty calendar so subscribers stay subscribed.
    const header = calendarHeader({
      name: `Cycling — ${name}`,
      description: `Cycling-clean windows for ${name}. No qualifying window in the next ${daily.length} days.`,
      dtstamp: isoStampCompact(generatedAtIso),
    });
    return joinIcs([...header, ...calendarFooter()]);
  }

  const startIso = daily[run.startIdx]?.date;
  const endIso = daily[run.endIdx]?.date;
  const endExclusiveIso = nextDayIso(endIso);
  const dtstamp = isoStampCompact(generatedAtIso);
  // UID is stable across regenerations of the same window so calendar
  // apps de-duplicate correctly: slug + startIso identifies the window.
  const uid = `cw-${slug}-${isoDateCompact(startIso)}@cycling-weather-site`;
  const tempsInWindow = daily.slice(run.startIdx, run.endIdx + 1).map((d) => d.temp_max);
  const medianTemp = tempsInWindow.length
    ? tempsInWindow.slice().sort((a, b) => a - b)[Math.floor(tempsInWindow.length / 2)]
    : NaN;
  const summary = `Cycle ${name} — ${run.length}-day window`;
  const description = summariseWindow({
    name,
    qualifyDays: run.length,
    medianTemp,
    startIso,
    endIso,
  });
  const url = `${SITE_URL}/destination.html?slug=${encodeURIComponent(slug)}`;

  const header = calendarHeader({
    name: `Cycling — ${name}`,
    description: `Cycling-clean windows for ${name} (cycling-weather, refreshed daily).`,
    dtstamp,
  });
  const event = buildEventLines({
    uid,
    dtstamp,
    summary,
    description,
    url,
    startIso,
    endExclusiveIso,
  });
  return joinIcs([...header, ...event, ...calendarFooter()]);
}

function allGoCalendar(results, generatedAtIso) {
  const dtstamp = isoStampCompact(generatedAtIso);
  const header = calendarHeader({
    name: "Cycling — every GO destination",
    description: "Every cycling-clean window across all tracked destinations (cycling-weather, refreshed daily).",
    dtstamp,
  });
  const events = [];
  for (const r of results) {
    const daily = Array.isArray(r.daily) ? r.daily : [];
    if (daily.length === 0) continue;
    const qualifies = daily.map((d) => dayMatches(d));
    const run = bestRun(qualifies);
    if (run.length < QUALIFIER_RUN_MIN || run.startIdx === null || run.endIdx === null) continue;
    const startIso = daily[run.startIdx]?.date;
    const endIso = daily[run.endIdx]?.date;
    const endExclusiveIso = nextDayIso(endIso);
    const uid = `cw-go-${r.slug}-${isoDateCompact(startIso)}@cycling-weather-site`;
    const tempsInWindow = daily.slice(run.startIdx, run.endIdx + 1).map((d) => d.temp_max);
    const medianTemp = tempsInWindow.length
      ? tempsInWindow.slice().sort((a, b) => a - b)[Math.floor(tempsInWindow.length / 2)]
      : NaN;
    events.push(
      ...buildEventLines({
        uid,
        dtstamp,
        summary: `Cycle ${r.name} — ${run.length}-day window`,
        description: summariseWindow({
          name: r.name,
          qualifyDays: run.length,
          medianTemp,
          startIso,
          endIso,
        }),
        url: `${SITE_URL}/destination.html?slug=${encodeURIComponent(r.slug)}`,
        startIso,
        endExclusiveIso,
      }),
    );
  }
  return joinIcs([...header, ...events, ...calendarFooter()]);
}

async function main() {
  const raw = await readFile(dataPath, "utf8").catch(() => null);
  if (!raw) {
    console.error("generate-ical: data.json not found at", dataPath);
    process.exit(1);
  }
  const data = JSON.parse(raw);
  const results = Array.isArray(data?.latest?.results) ? data.latest.results : [];
  const generatedAt = typeof data?.generated_at === "string" ? data.generated_at : new Date().toISOString();

  await mkdir(outDir, { recursive: true });

  // Track which slug files we wrote so we can prune any that vanish.
  const writtenFiles = new Set();
  let goCount = 0;

  for (const r of results) {
    const slug = typeof r?.slug === "string" && r.slug ? r.slug : null;
    if (!slug) continue;
    const ics = destinationCalendar(r, generatedAt);
    if (!ics) continue;
    const fname = `${slug}.ics`;
    await writeFile(join(outDir, fname), ics, "utf8");
    writtenFiles.add(fname);
    if (r.qualifier) goCount += 1;
  }

  const allGo = allGoCalendar(results, generatedAt);
  await writeFile(join(outDir, "all-go.ics"), allGo, "utf8");
  writtenFiles.add("all-go.ics");

  // Prune ical files for destinations that are no longer in data.json.
  const existing = await readdir(outDir).catch(() => []);
  for (const f of existing) {
    if (!f.endsWith(".ics")) continue;
    if (!writtenFiles.has(f)) {
      await unlink(join(outDir, f));
      console.log(`  - pruned stale ${f}`);
    }
  }

  console.log(`✓ ical: ${writtenFiles.size} files (${goCount} qualifying destinations) written to ical/`);
}

main().catch((err) => {
  console.error("generate-ical: failed:", err);
  process.exit(1);
});
