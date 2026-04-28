// Shared cell-encoding helpers used by the homepage ranking strip and the
// hero's top-3 GO mini-strips. Kept tiny and dependency-free so both modules
// can import without dragging the full qualifier scoring graph.
//
// The encoding is documented in `src/components/ranking.ts`:
//   - background fill: temp gradient (cool → warm)
//   - dot density:     rain (clean / drizzle / wet)
//   - hatching:        wind (calm / breezy / blustery)
// Whether a cell shows the qualifier outline is decided by the caller via
// `dayMatches(...)` — that lives in `./qualify` and depends on the active
// threshold dial state.

export type RainBucket = "clean" | "light" | "wet";
export type WindBucket = "calm" | "breezy" | "blustery";

// Map a 0-35°C reading onto a CSS-variable-driven gradient stop. Anything
// below 5°C is clamped (cool blues), anything above 35°C clamped (warm
// oranges). hsl() so it adapts to dark mode without going neon — saturation
// held back deliberately.
export function tempColour(t: number): string {
  const clamped = Math.min(35, Math.max(5, t));
  const hue = 220 - ((clamped - 5) / 30) * 202;
  return `hsl(${hue.toFixed(0)}, 55%, 56%)`;
}

export function rainBucket(precip: number, prob: number): RainBucket {
  if (precip > 1 || prob >= 60) return "wet";
  if (precip > 0 || prob >= 25) return "light";
  return "clean";
}

export function windBucket(wind: number): WindBucket {
  if (wind >= 30) return "blustery";
  if (wind >= 18) return "breezy";
  return "calm";
}
