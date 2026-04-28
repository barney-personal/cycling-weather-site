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
// Run from the worktree root. Exits non-zero on any failure.

import { spawnSync } from "node:child_process";
import { copyFile, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

// Backup current data.json so the rebuild doesn't dirty the working tree.
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
  // Validate schema.
  const json = JSON.parse(await readFile(dataPath, "utf8"));
  if (typeof json.version !== "number") fail("regenerated data.json missing version");
  if (!json.latest) fail("regenerated data.json missing top-level 'latest'");
  if (!Array.isArray(json.changelog)) fail("regenerated data.json missing 'changelog' array");
  if (!json.hero) fail("regenerated data.json missing 'hero' block");
  if (!Array.isArray(json.latest?.results) || json.latest.results.length < 22) {
    fail(`regenerated data.json has <22 destinations (${json.latest?.results?.length ?? 0})`);
  } else {
    const allHaveSlug = json.latest.results.every(
      (r) => typeof r.slug === "string" && r.slug.length > 0,
    );
    if (!allHaveSlug) fail("regenerated data.json: some results missing slug");
  }
  const afterBytes = (await readFile(dataPath)).length;
  ok(`regenerated data.json (before=${beforeBytes} B, after=${afterBytes} B)`);
}

// Always restore the backup to leave the working tree clean.
await copyFile(backupPath, dataPath);
await (await import("node:fs/promises")).unlink(backupPath);
ok("restored original data.json from backup");

if (failures > 0) {
  console.error(`\n${failures} cron-sim failure${failures > 1 ? "s" : ""}`);
  process.exit(1);
} else {
  console.log("\n✓ cron-sim OK");
}
