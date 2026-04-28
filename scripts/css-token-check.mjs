#!/usr/bin/env node
// CSS undefined-token guard.
//
// Scans every `assets/*.css` file produced by the Vite build, extracts every
// `var(--token-name)` reference, and verifies the token has a `--token-name:`
// declaration somewhere in the union of CSS files. Fallbacks (`var(--x, ...)`)
// still need the primary token defined — fallbacks are a safety net for older
// browsers, not a workaround for typos.
//
// This catches the recurring class of CSS regressions that shipped in M3
// (`--fs-0`), M7 (`--text-1`), and M6 (`--fs-0`). The intent is to fail the
// build the moment a typo or stale token reference reaches the bundle.
//
// Run after `npm run build`. Exits non-zero on any undefined token reference.

import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");
const assetsDir = join(repoRoot, "assets");

const VAR_REF_RE = /var\(\s*(--[a-zA-Z0-9_-]+)/g;
const VAR_DEF_RE = /(--[a-zA-Z0-9_-]+)\s*:/g;

let failures = 0;
const fail = (m) => {
  console.error(`  ✗ ${m}`);
  failures += 1;
};
const ok = (m) => console.log(`  ✓ ${m}`);

console.log("CSS undefined-token guard");

const allFiles = await readdir(assetsDir);
const cssFiles = allFiles.filter((f) => f.endsWith(".css")).sort();

if (cssFiles.length === 0) {
  fail("no assets/*.css files found — did you run `npm run build`?");
  process.exit(1);
}

const defined = new Set();
const refsByFile = new Map();

for (const file of cssFiles) {
  const css = await readFile(join(assetsDir, file), "utf8");
  for (const m of css.matchAll(VAR_DEF_RE)) {
    defined.add(m[1]);
  }
  const refs = new Set();
  for (const m of css.matchAll(VAR_REF_RE)) {
    refs.add(m[1]);
  }
  refsByFile.set(file, refs);
}

let totalRefs = 0;
const undefinedRefs = new Map(); // token -> [files]

for (const [file, refs] of refsByFile) {
  for (const ref of refs) {
    totalRefs += 1;
    if (!defined.has(ref)) {
      const list = undefinedRefs.get(ref) ?? [];
      list.push(file);
      undefinedRefs.set(ref, list);
    }
  }
}

console.log(`  Scanned ${cssFiles.length} CSS file(s), ${defined.size} tokens defined`);
console.log(`  Found ${totalRefs} unique token reference(s) across files`);

if (undefinedRefs.size > 0) {
  for (const [token, files] of undefinedRefs) {
    fail(`undefined token ${token} referenced in: ${files.join(", ")}`);
  }
} else {
  ok("every var(--token) reference resolves to a defined token");
}

if (failures > 0) {
  console.error(`\n${failures} undefined token reference(s) — fix and rerun \`npm run build\`.`);
  process.exit(1);
}
