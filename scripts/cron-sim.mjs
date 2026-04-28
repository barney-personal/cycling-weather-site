#!/usr/bin/env node
// Cron-path simulation.
//
// The pipeline scripts live at /home/node/.openclaw/workspace/scripts/ and
// hardcode SITE_DIR = "$WORKSPACE/cycling-weather-site" (the main worktree
// on master). Don't run cycling_weather_site_refresh.sh directly — it
// commits + pushes to remote. Instead invoke cycling_weather_data_build.py
// with SITE_DIR overridden to THIS orchestrator worktree, capture the
// regenerated data.json, and validate the schema is still M2-compatible.
//
// Validation is delegated to scripts/cron-validate.mjs — a pure function
// that's also exercised by tests/cron-validate.spec.ts with deliberately
// bad fixtures, so the gate is proven to have teeth.
//
// Run from the worktree root. Exits non-zero on any failure.

import { spawnSync } from "node:child_process";
import { copyFile, readFile, stat, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateCronOutput } from "./cron-validate.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");
const dataPath = resolve(repoRoot, "data.json");
const backupPath = resolve(repoRoot, "data.json.cron-sim-backup");

const PIPELINE = "/home/node/.openclaw/workspace/scripts/cycling_weather_data_build.py";

let failures = 0;
const fail = (m) => {
  console.error(`  ✗ ${m}`);
  failures += 1;
};
const ok = (m) => console.log(`  ✓ ${m}`);

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

console.log(`Cron simulation against pipeline ${PIPELINE}`);

if (!(await exists(PIPELINE))) {
  console.log(`  - pipeline script not present at ${PIPELINE}`);
  console.log("    (expected on this orchestrator worktree's container — skipping cron-sim).");
  process.exit(0);
}

await copyFile(dataPath, backupPath);
const beforeBytes = (await readFile(dataPath)).length;

const env = { ...process.env, SITE_DIR: repoRoot };
const proc = spawnSync("python3", [PIPELINE], {
  cwd: "/home/node/.openclaw/workspace",
  env,
  encoding: "utf8",
  timeout: 60_000,
});

if (proc.error) fail(`pipeline failed to start: ${proc.error.message}`);
if (proc.status !== 0) {
  console.error(proc.stdout);
  console.error(proc.stderr);
  fail(`pipeline exited with status ${proc.status}`);
}

if (failures === 0) {
  const json = JSON.parse(await readFile(dataPath, "utf8"));
  const v = validateCronOutput(json);
  if (!v.ok) {
    for (const m of v.failures) fail(m);
  } else {
    ok(`schema OK at version ${json.version} (${json.latest.results.length} destinations)`);
    if (json.climatology) {
      ok(`v3 climatology block present (${json.climatology.destinations.length} dests, "${json.climatology.window_label}")`);
    } else {
      ok("v3 schema OK (climatology block absent — cache not yet populated)");
    }
    if (json.model_spread) {
      ok(`v4 model_spread block present (${json.model_spread.destinations.length} dests, ${json.model_spread.models.length} models)`);
    } else {
      ok("v4 schema OK (model_spread block absent — cache not yet populated)");
    }
  }
  const afterBytes = (await readFile(dataPath)).length;
  ok(`regenerated data.json (before=${beforeBytes} B, after=${afterBytes} B)`);
}

await copyFile(backupPath, dataPath);
await unlink(backupPath);
ok("restored original data.json from backup");

if (failures > 0) {
  console.error(`\n${failures} cron-sim failure${failures > 1 ? "s" : ""}`);
  process.exit(1);
} else {
  console.log("\n✓ cron-sim OK");
}
