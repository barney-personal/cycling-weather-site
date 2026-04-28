// Pure data.json schema validator used by cron-sim AND by a paired
// unit test. Extracted in M12 so we can prove the gate has teeth: the
// unit test feeds it deliberately-bad fixtures (the "Tenerife points
// at Mt Teide" class of regression) and asserts validation fails.
//
// Returns { ok, failures } where failures is a list of human-readable
// strings. Never throws; bad input → ok: false, never a stack trace.

const REQUIRED_DEST_COUNT = 22;

const KNOWN_DESTINATIONS = new Map([
  // Lat/lon sanity table for the dataset's hand-picked destinations.
  // Bounds are wide enough to allow a planner to retune within-region
  // (e.g. swap a town centre for a popular trailhead) but tight enough
  // to catch the "Tenerife points at Mt Teide" class of regression
  // where a destination was inadvertently re-pointed elsewhere.
  // Mirrors the names in data.json's latest.results; unknown names are
  // skipped (no false positive for a newly-added destination).
  // Format: [name, latMin, latMax, lonMin, lonMax]
  ["Los Angeles", [33.5, 34.5, -118.7, -117.7]],
  ["Palo Alto", [37.0, 37.7, -122.5, -121.8]],
  ["Tenerife", [27.5, 28.8, -17.5, -16.0]],
  ["Gran Canaria", [27.5, 28.4, -16.2, -15.2]],
  ["Crete", [34.8, 35.7, 23.4, 26.4]],
  ["Algarve", [36.9, 37.4, -9.1, -7.4]],
  ["Cyprus", [34.4, 35.7, 32.2, 34.7]],
  ["Sardinia", [38.8, 41.3, 8.1, 9.9]],
  ["Sicily", [36.6, 38.4, 12.4, 15.7]],
  ["Mallorca", [39.2, 40.1, 2.3, 3.5]],
  ["Malaga", [36.4, 37.0, -4.7, -3.7]],
  ["Costa Blanca", [37.8, 39.0, -1.0, 0.3]],
  ["Tuscany", [42.3, 44.5, 9.7, 12.4]],
  ["Lake Garda", [45.4, 46.0, 10.5, 11.0]],
  ["Lake District", [54.2, 54.8, -3.5, -2.7]],
  ["Nice", [43.5, 44.0, 6.9, 7.5]],
  ["South Wales", [51.4, 52.0, -4.5, -2.7]],
  ["London/Surrey Hills", [51.0, 51.6, -1.0, 0.5]],
  ["Provence", [43.0, 44.5, 4.4, 7.7]],
  ["Peak District", [53.1, 53.6, -2.1, -1.4]],
  ["Yorkshire Dales", [54.0, 54.6, -2.6, -1.7]],
  ["Girona", [41.6, 42.5, 2.4, 3.0]],
]);

export function validateCronOutput(json) {
  const failures = [];
  const fail = (m) => failures.push(m);

  if (!json || typeof json !== "object") {
    fail("data.json is not an object");
    return { ok: false, failures };
  }

  if (typeof json.version !== "number") fail("missing version");
  if (json.version < 2) fail(`version is ${json.version}, expected >= 2`);
  if (json.version < 4) {
    fail(`version is ${json.version}, expected >= 4 post-M7`);
  }

  if (!json.latest) fail("missing top-level 'latest'");
  if (!Array.isArray(json.changelog)) fail("missing 'changelog' array");
  if (!json.hero) fail("missing 'hero' block");

  const results = json.latest?.results;
  if (!Array.isArray(results) || results.length < REQUIRED_DEST_COUNT) {
    fail(`<${REQUIRED_DEST_COUNT} destinations (${results?.length ?? 0})`);
  } else {
    const allHaveSlug = results.every(
      (r) => typeof r.slug === "string" && r.slug.length > 0,
    );
    if (!allHaveSlug) fail("some results missing slug");

    // Lat/lon sanity per destination — catches the "Tenerife points at
    // Mt Teide" class of regression where a coordinate was misedited.
    for (const r of results) {
      const known = KNOWN_DESTINATIONS.get(r.name);
      if (!known) continue;
      const [latMin, latMax, lonMin, lonMax] = known;
      if (typeof r.lat !== "number" || typeof r.lon !== "number") {
        fail(`${r.name}: lat/lon missing or non-numeric`);
        continue;
      }
      if (r.lat < latMin || r.lat > latMax) {
        fail(`${r.name}: lat ${r.lat} outside expected band [${latMin}, ${latMax}]`);
      }
      if (r.lon < lonMin || r.lon > lonMax) {
        fail(`${r.name}: lon ${r.lon} outside expected band [${lonMin}, ${lonMax}]`);
      }
    }

    // v2: when hourly data present, verify shape.
    const withHourly = results.filter(
      (r) => r.daily?.some((d) => Array.isArray(d.hourly) && d.hourly.length > 0),
    );
    if (withHourly.length > 0) {
      const sample = withHourly[0].daily.find((d) => d.hourly?.length > 0);
      const h = sample.hourly[0];
      if (typeof h.time !== "string") fail("hourly entry missing time");
      if (typeof h.temp !== "number") fail("hourly entry missing temp");
      if (typeof h.precip !== "number") fail("hourly entry missing precip");
    }
  }

  // v3: climatology block when present.
  if (json.climatology) {
    if (typeof json.climatology.window_label !== "string") {
      fail("climatology missing window_label");
    }
    if (!Array.isArray(json.climatology.destinations)) {
      fail("climatology missing destinations array");
    } else if (json.climatology.destinations.length === 0) {
      fail("climatology destinations array is empty");
    } else {
      const sample = json.climatology.destinations[0];
      if (typeof sample.name !== "string") fail("climatology entry missing name");
      if (
        sample.median_temp_max !== null &&
        typeof sample.median_temp_max !== "number"
      ) {
        fail("climatology entry has malformed median_temp_max");
      }
    }
  }

  // v4: model_spread block when present.
  if (json.model_spread) {
    if (
      !Array.isArray(json.model_spread.models) ||
      json.model_spread.models.length === 0
    ) {
      fail("model_spread missing models array");
    }
    if (!Array.isArray(json.model_spread.destinations)) {
      fail("model_spread missing destinations array");
    } else if (json.model_spread.destinations.length === 0) {
      fail("model_spread destinations array is empty");
    } else {
      const sample = json.model_spread.destinations[0];
      if (typeof sample.name !== "string") fail("model_spread entry missing name");
      if (!Array.isArray(sample.days)) fail("model_spread entry missing days array");
      if (sample.days.length > 0) {
        const d0 = sample.days[0];
        if (typeof d0.date !== "string") fail("model_spread day missing date");
        if (
          d0.temp_spread_c !== null &&
          typeof d0.temp_spread_c !== "number"
        ) {
          fail("model_spread day has malformed temp_spread_c");
        }
        if (typeof d0.models_count !== "number") {
          fail("model_spread day missing models_count");
        }
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

export const _internals = { KNOWN_DESTINATIONS };
