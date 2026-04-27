// Polar / clock chart of the next-14-day forecast window.
//
// One ring = one variable (temperature, precipitation probability, wind).
// Each day is a wedge; angle = day index (0 = today at 12 o'clock, advancing
// clockwise so the eye reads the future like a watch face). Colour and length
// of each wedge encode that variable's reading. A central halo highlights
// qualifying days so the reader can find clean ride windows at a glance.
//
// Imported lazily by the destination page (`await import("./polar")`) so the
// homepage bundle stays clean; d3-shape only ships when this view loads.

import { type DefaultArcObject, arc as d3arc } from "d3-shape";

import type { DailyForecast } from "../lib/types";

export interface MountPolarOptions {
  mount: HTMLElement;
  days: DailyForecast[];
  qualifies: boolean[];
  /** Optional human label for the destination, used in SR description. */
  label?: string;
}

const PI2 = Math.PI * 2;

function describeWedge(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
): string {
  const a: DefaultArcObject = {
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    padAngle: 0,
  };
  const generator = d3arc().padAngle(0).cornerRadius(2);
  return generator(a) ?? "";
}

function tempColour(t: number): string {
  // Mirrors ranking.ts tempColour ramp so the polar ring matches the strip.
  const clamped = Math.min(35, Math.max(5, t));
  const hue = 220 - ((clamped - 5) / 30) * 202;
  return `hsl(${hue.toFixed(0)}, 60%, 55%)`;
}

function precipColour(prob: number, sum: number): string {
  if (sum > 1 || prob >= 60) return "var(--no-go)";
  if (sum > 0 || prob >= 25) return "var(--edge)";
  return "var(--text-3)";
}

function windColour(km: number): string {
  if (km >= 30) return "var(--no-go)";
  if (km >= 18) return "var(--edge)";
  return "var(--good)";
}

function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: "UTC",
  });
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function mountPolar(options: MountPolarOptions): void {
  const { mount, days, qualifies, label } = options;
  if (days.length === 0) {
    mount.innerHTML = `<p class="polar-empty">No forecast data.</p>`;
    return;
  }

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 12;

  const ring = (outer - 70) / 3;
  const tempInner = 70;
  const tempOuter = tempInner + ring;
  const rainInner = tempOuter + 4;
  const rainOuter = rainInner + ring;
  const windInner = rainOuter + 4;
  const windOuter = windInner + ring;

  const wedgeAngle = PI2 / days.length;

  const wedges: string[] = [];

  // Halo around the centre highlighting qualifying days.
  const haloPath = qualifies
    .map((q, i) => {
      if (!q) return "";
      const start = i * wedgeAngle - wedgeAngle / 2;
      const end = i * wedgeAngle + wedgeAngle / 2;
      return describeWedge(start, end, tempInner - 12, tempInner - 4);
    })
    .filter(Boolean)
    .join(" ");
  if (haloPath) {
    wedges.push(`<path d="${haloPath}" class="polar-halo" fill="var(--good)" aria-hidden="true"/>`);
  }

  days.forEach((d, i) => {
    const start = i * wedgeAngle - wedgeAngle / 2;
    const end = i * wedgeAngle + wedgeAngle / 2;

    // Temperature ring — wedge fill = temperature colour
    wedges.push(
      `<path d="${describeWedge(start, end, tempInner, tempOuter)}" fill="${tempColour(d.temp_max)}" class="polar-temp"/>`,
    );

    // Precip ring — opacity scales with prob; colour signals dry/light/wet
    const probScale = Math.max(0.12, Math.min(1, d.precip_prob_max / 100));
    wedges.push(
      `<path d="${describeWedge(start, end, rainInner, rainOuter)}" fill="${precipColour(d.precip_prob_max, d.precip_sum)}" fill-opacity="${probScale.toFixed(2)}" class="polar-rain"/>`,
    );

    // Wind ring — wedge length scales with wind speed
    const windFraction = Math.max(0.1, Math.min(1, d.wind_max / 40));
    const windRingOuter = windInner + (windOuter - windInner) * windFraction;
    wedges.push(
      `<path d="${describeWedge(start, end, windInner, windRingOuter)}" fill="${windColour(d.wind_max)}" class="polar-wind"/>`,
    );

    // Wedge separator line — subtle, helps eye count days
    const ang = end - Math.PI / 2;
    const x1 = cx + Math.cos(ang) * tempInner;
    const y1 = cy + Math.sin(ang) * tempInner;
    const x2 = cx + Math.cos(ang) * windOuter;
    const y2 = cy + Math.sin(ang) * windOuter;
    wedges.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="polar-sep"/>`,
    );
  });

  // Day labels at outer tips
  const labels = days
    .map((d, i) => {
      const ang = i * wedgeAngle - Math.PI / 2;
      const lr = windOuter + 14;
      const x = cx + Math.cos(ang) * lr;
      const y = cy + Math.sin(ang) * lr;
      const showFull = i === 0 || i === days.length - 1 || i % 2 === 0;
      if (!showFull) return "";
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="polar-label" text-anchor="middle" dominant-baseline="middle">${shortDay(d.date)}</text>`;
    })
    .filter(Boolean)
    .join("");

  // Hover handles on top of all wedges (transparent, full radial slice)
  const hoverHandles = days
    .map((d, i) => {
      const start = i * wedgeAngle - wedgeAngle / 2;
      const end = i * wedgeAngle + wedgeAngle / 2;
      const path = describeWedge(start, end, tempInner - 12, windOuter);
      const ariaLabel = `${shortDate(d.date)} · ${d.temp_max.toFixed(0)}°C · ${d.precip_sum.toFixed(1)} mm rain · ${Math.round(d.precip_prob_max)}% prob · ${d.wind_max.toFixed(0)} km/h wind${qualifies[i] ? " · qualifies" : ""}`;
      return `<path d="${path}" class="polar-hit" data-day="${i}" tabindex="0" role="img" aria-label="${ariaLabel.replace(/"/g, "&quot;")}"/>`;
    })
    .join("");

  // Centre label
  const centre = `
    <text x="${cx}" y="${cy - 8}" class="polar-centre-eyebrow" text-anchor="middle">14-day</text>
    <text x="${cx}" y="${cy + 12}" class="polar-centre-num" text-anchor="middle">${days.length}d</text>`;

  // Ring labels (small caps, just outside each ring)
  const ringLabel = (radius: number, text: string): string => {
    const x = cx;
    const y = cy + radius;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="polar-ring-label" text-anchor="middle">${text}</text>`;
  };

  const ringLabels = `
    ${ringLabel(tempOuter - ring / 2 + 4, "TEMP")}
    ${ringLabel(rainOuter - ring / 2 + 4, "RAIN")}
    ${ringLabel(windOuter - ring / 2 + 4, "WIND")}
  `;

  const desc = label
    ? `Polar 14-day forecast for ${label}. Three concentric rings: inner temperature, middle precipitation probability, outer wind speed.`
    : "Polar 14-day forecast. Three concentric rings: inner temperature, middle precipitation probability, outer wind speed.";

  mount.innerHTML = `
    <figure class="polar" role="figure" aria-label="${desc.replace(/"/g, "&quot;")}">
      <svg viewBox="0 0 ${size} ${size}" class="polar-svg" preserveAspectRatio="xMidYMid meet">
        <g transform="translate(${cx}, ${cy})">
          <g transform="translate(${-cx}, ${-cy})">
            ${wedges.join("")}
            ${ringLabels}
            ${labels}
            ${centre}
            ${hoverHandles}
          </g>
        </g>
      </svg>
      <figcaption class="polar-caption">
        Inner ring: temperature · Middle: rain probability · Outer: wind speed.
        Green halo marks days that meet your thresholds.
      </figcaption>
    </figure>
  `;
}
