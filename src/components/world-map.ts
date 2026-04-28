// World map — "where it's clean right now" global view, mounted only on
// the homepage and lazy-loaded after the mount intersects the viewport.
//
// Bundling shape: this module imports d3-geo, topojson-client, and the
// world-atlas land-110m topology (~55 KB raw / ~15 KB gz). All three only
// ship inside the world-map chunk, which is loaded via `await import(
// "./components/world-map")` from main.ts after IntersectionObserver fires
// — so the homepage initial-paint budget is unaffected.
//
// Cycle-12 acceptance: every projected glyph must lie inside the SVG bbox
// (d3-geo returns NaN for points outside the projection clip extent — see
// the M6.1 lesson). The `bounds-inspect` headless probe in
// scripts/probe-world-map.mjs verifies this on every render.

import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

import landTopology from "world-atlas/land-110m.json";
import type { DestinationResult } from "../lib/types";

// Topology is treated as opaque — we only ever convert the `land` object
// to a single GeoJSON feature. The `as` keeps strict TypeScript happy.
const TOPOLOGY = landTopology as unknown as Topology<{
  land: GeometryCollection;
}>;

export interface WorldMapDestination {
  slug: string;
  name: string;
  region?: string;
  lat: number;
  lon: number;
  qualifier: boolean;
  median_temp: number;
  best_run: number;
  rank: number;
}

export interface MountWorldMapOptions {
  mount: HTMLElement;
  /**
   * The full ranked destination list. Already sorted by score descending —
   * we use the array index as the rank for glyph sizing.
   */
  results: DestinationResult[];
}

const VIEWBOX_W = 720;
const VIEWBOX_H = 360;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

function verdictToken(qualifier: boolean, bestRun: number): "go" | "edge" | "no-go" {
  if (qualifier) return "go";
  if (bestRun >= 4) return "edge";
  return "no-go";
}

function verdictLabel(token: "go" | "edge" | "no-go"): string {
  if (token === "go") return "GO";
  if (token === "edge") return "EDGE";
  return "no-go";
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

interface GlyphRecord {
  dest: WorldMapDestination;
  cx: number;
  cy: number;
  verdict: "go" | "edge" | "no-go";
}

export function mountWorldMap(options: MountWorldMapOptions): void {
  const { mount, results } = options;

  const dests: WorldMapDestination[] = [];
  for (let i = 0; i < results.length; i += 1) {
    const r = results[i];
    if (!r) continue;
    if (!isFiniteNumber(r.lat) || !isFiniteNumber(r.lon)) continue;
    const dest: WorldMapDestination = {
      slug: r.slug,
      name: r.name,
      lat: r.lat,
      lon: r.lon,
      qualifier: r.qualifier,
      median_temp: r.median_temp,
      best_run: r.best_run,
      rank: i + 1,
    };
    if (r.region) dest.region = r.region;
    dests.push(dest);
  }

  if (dests.length === 0) {
    mount.innerHTML = `<p class="world-map-empty">No mappable destinations.</p>`;
    return;
  }

  const land = feature(TOPOLOGY, TOPOLOGY.objects.land);

  const projection = geoNaturalEarth1()
    .fitSize([VIEWBOX_W - 16, VIEWBOX_H - 16], land)
    .translate([VIEWBOX_W / 2, VIEWBOX_H / 2 + 4]);

  const path = geoPath(projection);
  const landPath = path(land) ?? "";

  // Project each destination once. Anything that returns null/NaN (which
  // d3-geo does for points outside the projection clip) is dropped — the
  // bounds-inspect probe in M13 will catch any future drift.
  const glyphs: GlyphRecord[] = [];
  for (const dest of dests) {
    const projected = projection([dest.lon, dest.lat]);
    if (!projected) continue;
    const [cx, cy] = projected;
    if (!isFiniteNumber(cx) || !isFiniteNumber(cy)) continue;
    if (cx < 0 || cx > VIEWBOX_W || cy < 0 || cy > VIEWBOX_H) continue;
    glyphs.push({
      dest,
      cx,
      cy,
      verdict: verdictToken(dest.qualifier, dest.best_run),
    });
  }

  // Render larger glyphs for better-ranked dests; cap to keep the map readable.
  const radiusFor = (rank: number): number => {
    if (rank <= 3) return 7;
    if (rank <= 8) return 6;
    return 5;
  };

  const goCount = glyphs.filter((g) => g.verdict === "go").length;
  const subtitle =
    goCount > 0
      ? `${goCount} destination${goCount === 1 ? "" : "s"} flagged GO right now.`
      : "No destination is GO yet — top picks shown by rank.";

  // Build SVG markup. Glyphs are <g> with a real <button>-style focusable
  // <circle> inside. Native <button> doesn't render well as an SVG child,
  // so we use tabindex=0 + role=button + Enter/Space handling.
  const glyphMarkup = glyphs
    .map((g) => {
      const r = radiusFor(g.dest.rank);
      const verdictTok = g.verdict;
      const ariaLabel = `${g.dest.name}${g.dest.region ? ` (${g.dest.region})` : ""}: ${verdictLabel(verdictTok)}, median high ${g.dest.median_temp.toFixed(0)}°C, best run ${g.dest.best_run} day${g.dest.best_run === 1 ? "" : "s"}.`;
      return `
        <g class="world-glyph world-glyph-${verdictTok}" data-dest-glyph data-slug="${escapeHtml(g.dest.slug)}" transform="translate(${g.cx.toFixed(2)} ${g.cy.toFixed(2)})">
          <circle r="${r + 4}" class="world-glyph-halo" aria-hidden="true"></circle>
          <circle r="${r}" class="world-glyph-dot"
                  role="button" tabindex="0"
                  aria-label="${escapeHtml(ariaLabel)}"
                  data-name="${escapeHtml(g.dest.name)}"
                  data-region="${escapeHtml(g.dest.region ?? "")}"
                  data-verdict="${verdictTok}"
                  data-temp="${g.dest.median_temp.toFixed(1)}"
                  data-best-run="${g.dest.best_run}"
                  data-slug="${escapeHtml(g.dest.slug)}"></circle>
        </g>`;
    })
    .join("");

  mount.innerHTML = `
    <figure class="world-map" role="figure" aria-labelledby="world-map-title">
      <figcaption class="world-map-caption">
        <h2 id="world-map-title" class="section-title world-map-title">Where it's clean right now</h2>
        <p class="world-map-subtitle">${escapeHtml(subtitle)}</p>
      </figcaption>
      <div class="world-map-frame">
        <svg viewBox="0 0 ${VIEWBOX_W} ${VIEWBOX_H}" class="world-map-svg" preserveAspectRatio="xMidYMid meet">
          <rect class="world-map-bg" x="0" y="0" width="${VIEWBOX_W}" height="${VIEWBOX_H}"></rect>
          <path class="world-map-land" d="${landPath}"></path>
          <g class="world-map-glyphs">${glyphMarkup}</g>
        </svg>
        <div class="world-map-tooltip" role="tooltip" id="world-map-tooltip" hidden></div>
      </div>
      <p class="world-map-legend" aria-hidden="true">
        <span class="world-legend-swatch world-legend-go"></span>GO
        <span class="world-legend-swatch world-legend-edge"></span>Edge
        <span class="world-legend-swatch world-legend-nogo"></span>No-go
      </p>
    </figure>
  `;

  const tooltip = mount.querySelector<HTMLElement>("#world-map-tooltip");
  if (!tooltip) return;
  const frame = mount.querySelector<HTMLElement>(".world-map-frame");

  function showTooltip(target: SVGElement): void {
    if (!tooltip || !frame) return;
    const name = target.getAttribute("data-name") ?? "";
    const region = target.getAttribute("data-region") ?? "";
    const verdict = (target.getAttribute("data-verdict") ?? "edge") as "go" | "edge" | "no-go";
    const temp = target.getAttribute("data-temp") ?? "";
    const bestRun = target.getAttribute("data-best-run") ?? "";
    const slug = target.getAttribute("data-slug") ?? "";

    tooltip.innerHTML = `
      <p class="world-tip-name">${escapeHtml(name)}${region ? ` <span class="world-tip-region">${escapeHtml(region)}</span>` : ""}</p>
      <p class="world-tip-line"><span class="world-tip-pill verdict-${verdict}">${verdictLabel(verdict)}</span><span class="world-tip-stat">${escapeHtml(temp)}°C median · best run ${escapeHtml(bestRun)}d</span></p>
      <p class="world-tip-link"><a href="./destination.html?slug=${encodeURIComponent(slug)}">Destination detail →</a></p>
    `;

    // Position: bottom-sheet on small viewports, popover near glyph on desktop.
    const frameRect = frame.getBoundingClientRect();
    const isMobile = frameRect.width < 600;
    if (isMobile) {
      tooltip.classList.add("world-map-tooltip--sheet");
      tooltip.classList.remove("world-map-tooltip--popover");
      tooltip.style.removeProperty("left");
      tooltip.style.removeProperty("top");
    } else {
      tooltip.classList.add("world-map-tooltip--popover");
      tooltip.classList.remove("world-map-tooltip--sheet");
      const dotRect = target.getBoundingClientRect();
      const localX = dotRect.left - frameRect.left + dotRect.width / 2;
      const localY = dotRect.top - frameRect.top + dotRect.height / 2;
      tooltip.style.left = `${localX}px`;
      tooltip.style.top = `${localY}px`;
    }
    tooltip.removeAttribute("hidden");
  }

  function hideTooltip(): void {
    if (!tooltip) return;
    tooltip.setAttribute("hidden", "");
  }

  const dotEls = mount.querySelectorAll<SVGElement>(".world-glyph-dot");
  for (const dot of dotEls) {
    dot.addEventListener("mouseenter", () => showTooltip(dot));
    dot.addEventListener("mouseleave", hideTooltip);
    dot.addEventListener("focus", () => showTooltip(dot));
    dot.addEventListener("blur", hideTooltip);
    dot.addEventListener("keydown", (ev) => {
      const key = (ev as KeyboardEvent).key;
      if (key === "Enter" || key === " ") {
        ev.preventDefault();
        const slug = dot.getAttribute("data-slug");
        if (slug) {
          window.location.assign(`./destination.html?slug=${encodeURIComponent(slug)}`);
        }
      } else if (key === "Escape") {
        hideTooltip();
      }
    });
    dot.addEventListener("click", () => {
      const slug = dot.getAttribute("data-slug");
      if (slug) {
        window.location.assign(`./destination.html?slug=${encodeURIComponent(slug)}`);
      }
    });
  }
}
