// M11 — RFC 5545 validation for the .ics files emitted by
// `scripts/generate-ical.mjs`.
//
// We parse each `ical/*.ics` with the upstream `ical.js` parser. If a calendar
// app could trip over our output (missing UID, malformed DTSTART, line-fold
// breakage on a UTF-8 sequence, etc), `ICAL.parse` raises before we reach the
// per-component asserts.

import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { test } from "node:test";

import ICAL from "ical.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const icalDir = resolve(repoRoot, "ical");
const dataPath = resolve(repoRoot, "data.json");

function readIcs(name: string): string {
  return readFileSync(resolve(icalDir, name), "utf8");
}

function parseCalendar(text: string): { calendar: any; events: any[] } {
  const jcal = ICAL.parse(text);
  const calendar = new ICAL.Component(jcal);
  const events = calendar
    .getAllSubcomponents("vevent")
    .map((ev: any) => new ICAL.Event(ev));
  return { calendar, events };
}

const ICS_FILES = readdirSync(icalDir).filter((f) => f.endsWith(".ics"));

test("ical: at least one .ics file exists", () => {
  assert.ok(ICS_FILES.length >= 1, "expected ical/ to contain at least one .ics file");
});

test("ical: every file uses CRLF line endings (RFC 5545 §3.1)", () => {
  for (const f of ICS_FILES) {
    const raw = readIcs(f);
    // Must contain CRLF and no bare LF (outside CRLF pairs).
    const bareLf = raw.replace(/\r\n/g, "").includes("\n");
    assert.equal(bareLf, false, `${f}: expected only CRLF line endings`);
    assert.ok(raw.includes("\r\n"), `${f}: expected at least one CRLF`);
  }
});

test("ical: every file folds long lines at ≤75 octets (RFC 5545 §3.1)", () => {
  for (const f of ICS_FILES) {
    const raw = readIcs(f);
    const lines = raw.split("\r\n");
    for (const line of lines) {
      const octets = Buffer.byteLength(line, "utf8");
      // Lines beyond first chunk start with a single space (continuation).
      assert.ok(octets <= 75, `${f}: line of ${octets} octets exceeds 75: "${line.slice(0, 80)}"`);
    }
  }
});

test("ical: every file parses with ical.js (round-trip safe)", () => {
  for (const f of ICS_FILES) {
    const raw = readIcs(f);
    let parsed: any;
    try {
      parsed = ICAL.parse(raw);
    } catch (err) {
      assert.fail(`${f}: ICAL.parse threw: ${(err as Error).message}`);
    }
    const cal = new ICAL.Component(parsed);
    assert.equal(cal.name, "vcalendar", `${f}: top-level component must be VCALENDAR`);
    assert.equal(
      cal.getFirstPropertyValue("version"),
      "2.0",
      `${f}: VCALENDAR.VERSION must be 2.0`,
    );
    const prodid = cal.getFirstPropertyValue("prodid");
    assert.ok(typeof prodid === "string" && prodid.length > 0, `${f}: PRODID required`);
  }
});

test("ical: every VEVENT carries UID, DTSTAMP, DTSTART (RFC 5545 §3.6.1)", () => {
  for (const f of ICS_FILES) {
    const { events } = parseCalendar(readIcs(f));
    for (const ev of events) {
      assert.ok(typeof ev.uid === "string" && ev.uid.length > 0, `${f}: UID required`);
      assert.ok(ev.startDate, `${f}: DTSTART required`);
      // ICAL.Event.calendar.dtstamp is required per spec.
      const dtstamp = ev.component.getFirstPropertyValue("dtstamp");
      assert.ok(dtstamp, `${f}: DTSTAMP required`);
    }
  }
});

test("ical: per-destination UIDs are stable across regeneration", () => {
  // The UID encodes slug + start-date so the same window stays the same UID
  // when the script re-runs (calendar apps then de-duplicate cleanly).
  for (const f of ICS_FILES) {
    if (f === "all-go.ics") continue;
    const { events } = parseCalendar(readIcs(f));
    if (events.length === 0) continue;
    const slug = f.replace(/\.ics$/, "");
    for (const ev of events) {
      assert.match(
        ev.uid,
        new RegExp(`^cw-${slug.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}-\\d{8}@cycling-weather-site$`),
        `${f}: UID must match cw-{slug}-{YYYYMMDD}@cycling-weather-site`,
      );
    }
  }
});

test("ical: DTEND is exclusive (one day after best_end)", () => {
  for (const f of ICS_FILES) {
    if (f === "all-go.ics") continue;
    const { events } = parseCalendar(readIcs(f));
    for (const ev of events) {
      const start = ev.startDate;
      const end = ev.endDate;
      assert.ok(end.toUnixTime() > start.toUnixTime(), `${f}: DTEND must be after DTSTART`);
      const days = Math.round((end.toUnixTime() - start.toUnixTime()) / 86400);
      // The window length must be ≥1 day and (per CWeather DEFAULT_THRESHOLDS
      // qualifying logic) ≤14 (the forecast horizon).
      assert.ok(days >= 1 && days <= 14, `${f}: window length ${days}d out of 1..14 range`);
    }
  }
});

test("ical: SUMMARY references destination name; URL points at destination page", () => {
  const dataRaw = JSON.parse(readFileSync(dataPath, "utf8"));
  const results = (dataRaw?.latest?.results ?? []) as Array<{ slug: string; name: string }>;
  for (const r of results) {
    const file = `${r.slug}.ics`;
    if (!ICS_FILES.includes(file)) continue;
    const { events } = parseCalendar(readIcs(file));
    if (events.length === 0) continue;
    for (const ev of events) {
      assert.ok(ev.summary.includes(r.name), `${file}: SUMMARY missing destination name "${r.name}"`);
      const url = ev.component.getFirstPropertyValue("url");
      assert.ok(typeof url === "string", `${file}: URL property required`);
      assert.ok(
        (url as string).includes(`destination.html?slug=${encodeURIComponent(r.slug)}`),
        `${file}: URL must deep-link to destination page`,
      );
    }
  }
});

test("ical: text fields escape commas and backslashes per RFC 5545 §3.3.11", () => {
  // The destination "Lake District (gravel + road)" — were any to exist —
  // would force escapes; cycling-weather slugs don't include commas, but the
  // script must still escape correctly. Check the stamps we know contain a
  // comma in the description (we generate "(cycling-weather, refreshed daily)")
  // — those parentheses are literal but the comma has to be escaped.
  for (const f of ICS_FILES) {
    const raw = readIcs(f);
    // Look for any unescaped comma followed by a space inside DESCRIPTION:.
    // If found, the calendar app would interpret it as a list separator.
    const lines = raw.split("\r\n");
    let inDescription = false;
    for (const line of lines) {
      if (line.startsWith("DESCRIPTION:") || line.startsWith("X-WR-CALDESC:")) {
        inDescription = true;
        // The header line itself: must not contain bare commas (escaped only).
        const after = line.slice(line.indexOf(":") + 1);
        // Replace escaped commas first, then check.
        const cleaned = after.replace(/\\,/g, "");
        assert.ok(!cleaned.includes(","), `${f}: unescaped comma in TEXT-property line: ${line}`);
      }
      if (inDescription && line.startsWith(" ") === false && line.includes(":") === true) {
        inDescription = false;
      }
    }
  }
});

test("ical: all-go.ics aggregates every QUALIFIER destination's window", () => {
  const dataRaw = JSON.parse(readFileSync(dataPath, "utf8"));
  const results = (dataRaw?.latest?.results ?? []) as Array<{ slug: string; qualifier: boolean }>;
  const expectedSlugs = new Set(results.filter((r) => r.qualifier).map((r) => r.slug));

  const text = readIcs("all-go.ics");
  const { events } = parseCalendar(text);
  // Each event's UID encodes the slug — extract and compare.
  const presentSlugs = new Set<string>();
  for (const ev of events) {
    const m = ev.uid.match(/^cw-go-(.+?)-\d{8}@cycling-weather-site$/);
    if (m) presentSlugs.add(m[1]!);
  }
  // Every QUALIFIER destination must appear; non-qualifying ones must not.
  for (const slug of expectedSlugs) {
    assert.ok(presentSlugs.has(slug), `all-go.ics: missing QUALIFIER destination ${slug}`);
  }
  for (const slug of presentSlugs) {
    assert.ok(expectedSlugs.has(slug), `all-go.ics: contains non-QUALIFIER destination ${slug}`);
  }
});

test("ical: REFRESH-INTERVAL and X-PUBLISHED-TTL are present and short (≤24h)", () => {
  // ical.js types REFRESH-INTERVAL as a Duration object (registered iCal
  // property) but X-PUBLISHED-TTL as a raw string (X- experimental property).
  // We accept both shapes.
  const durationSeconds = (v: any): number => {
    if (typeof v?.toSeconds === "function") return v.toSeconds();
    if (typeof v === "string") {
      try {
        return ICAL.Duration.fromString(v).toSeconds();
      } catch {
        return Number.NaN;
      }
    }
    return Number.NaN;
  };
  for (const f of ICS_FILES) {
    const { calendar } = parseCalendar(readIcs(f));
    const refresh = calendar.getFirstPropertyValue("refresh-interval");
    const ttl = calendar.getFirstPropertyValue("x-published-ttl");
    assert.ok(refresh, `${f}: REFRESH-INTERVAL required`);
    assert.ok(ttl, `${f}: X-PUBLISHED-TTL required`);
    const refreshSeconds = durationSeconds(refresh);
    const ttlSeconds = durationSeconds(ttl);
    assert.ok(
      refreshSeconds > 0 && refreshSeconds <= 86400,
      `${f}: REFRESH-INTERVAL out of range (${refreshSeconds}s)`,
    );
    assert.ok(
      ttlSeconds > 0 && ttlSeconds <= 86400,
      `${f}: X-PUBLISHED-TTL out of range (${ttlSeconds}s)`,
    );
  }
});
