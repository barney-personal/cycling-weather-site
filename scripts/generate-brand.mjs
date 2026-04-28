#!/usr/bin/env node
// One-shot brand asset generator. Reads SVG sources from src/assets/brand/
// and rasterises them into icons/ + og-image.png at the repo root using
// ImageMagick's `convert`. Run once when brand artwork changes; the
// committed PNGs are what GitHub Pages and the manifest reference.
//
// Usage: node scripts/generate-brand.mjs
//   Requires `convert` on PATH (ImageMagick 6.x). Errors out otherwise.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "..");

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exited ${res.status}`);
  }
}

function rasterise(srcSvg, outPng, size, opts = {}) {
  const args = [
    "-background",
    opts.opaque ? "#0c3d1a" : "none",
    "-density",
    String(Math.max(72, size * 1.5)),
    "-resize",
    `${size}x${size}`,
    "-depth",
    "8",
  ];
  if (opts.flatten) args.push("-flatten");
  args.push(srcSvg, "PNG32:" + outPng);
  console.log(`  ${cmdFor(args, srcSvg, outPng)}`);
  run("convert", args);
}

function cmdFor(args, src, out) {
  return `convert ${args.filter((a) => a !== src && a !== "PNG32:" + out).join(" ")} ${src} ${out}`;
}

const brand = resolve(repoRoot, "src/assets/brand");
const icons = resolve(repoRoot, "icons");
const iconSrc = resolve(brand, "icon.svg");
const maskableSrc = resolve(brand, "icon-maskable.svg");
const monoSrc = resolve(brand, "icon-monochrome.svg");
const ogSrc = resolve(brand, "og-image.svg");

for (const f of [iconSrc, maskableSrc, monoSrc, ogSrc]) {
  if (!existsSync(f)) {
    console.error(`missing source: ${f}`);
    process.exit(1);
  }
}

console.log("rasterising brand assets…");

// Manifest icons (transparent background allowed for "any")
rasterise(iconSrc, resolve(icons, "icon-192.png"), 192);
rasterise(iconSrc, resolve(icons, "icon-512.png"), 512);

// Maskable icon — full-bleed, opaque (manifest "purpose": "maskable")
rasterise(maskableSrc, resolve(icons, "icon-maskable-512.png"), 512, {
  opaque: true,
  flatten: true,
});

// Monochrome icon — transparent (manifest "purpose": "monochrome")
rasterise(monoSrc, resolve(icons, "icon-monochrome-512.png"), 512);

// Apple touch icons — Apple wants opaque PNGs (transparent renders as black on home screen)
rasterise(iconSrc, resolve(icons, "apple-touch-icon-180.png"), 180, {
  opaque: true,
  flatten: true,
});
rasterise(iconSrc, resolve(icons, "apple-touch-icon-167.png"), 167, {
  opaque: true,
  flatten: true,
});
rasterise(iconSrc, resolve(icons, "apple-touch-icon-152.png"), 152, {
  opaque: true,
  flatten: true,
});

// Favicons
rasterise(iconSrc, resolve(icons, "favicon-32.png"), 32, { opaque: true, flatten: true });
run("convert", [
  "-background",
  "#0c3d1a",
  "-density",
  "192",
  "-resize",
  "32x32",
  "-flatten",
  "-define",
  "icon:auto-resize=16,32,48",
  iconSrc,
  resolve(icons, "favicon.ico"),
]);

// OG image — 1200×630 PNG
{
  const args = [
    "-background",
    "#14130d",
    "-density",
    "120",
    "-resize",
    "1200x630",
    "-flatten",
    "-depth",
    "8",
    ogSrc,
    "PNG24:" + resolve(repoRoot, "og-image.png"),
  ];
  console.log(`  convert (og-image)`);
  run("convert", args);
}

console.log("✓ brand assets generated");
