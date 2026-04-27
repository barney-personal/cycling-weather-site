# Design tokens — cycling-weather-site (M3)

The token system lives in `src/styles/tokens.css`. Every component must consume
semantic tokens (e.g. `var(--good)`, `var(--text-2)`) — never raw palette ramps
or hex literals. The legacy raw-colour aliases (`--green`, `--amber`, `--red`,
`--bg`, `--bg-2`, `--bg-3`, `--fg`, `--fg-2`, `--fg-3`, `--neutral`, `--mono`,
`--sans`, `--accent` was renamed) were deleted in M3. All references in
`main.ts`, `history.ts`, and `style.css` have been migrated.

## Themes

Two themes (`[data-theme="light"]` and `[data-theme="dark"]`) live as parallel
token blocks. The FOUC-prevention `<head>` script in each HTML page reads
`localStorage.cw-theme` (with a fallback to `prefers-color-scheme`) and writes
the resolved value to `<html data-theme="…">` synchronously, before the
stylesheet loads. This eliminates the white-flash on hard reload that would
otherwise hit dark-mode users.

The toggle (`src/components/theme-toggle.ts`) cycles through three states:
**system → light → dark**. "system" removes the storage key so future visits
follow the OS preference. `matchMedia('(prefers-color-scheme: dark)')` change
events trigger a re-resolve only when the user is on "system".

## Categories

- **Surfaces** — `--surface`, `--surface-2`, `--surface-3`, `--surface-elevated`
- **Borders** — `--border`, `--border-strong`
- **Text** — `--text`, `--text-2`, `--text-3`, `--text-on-accent`
- **Accent** — `--accent`, `--accent-2`, `--accent-soft`, `--focus-ring`
- **Verdict (semantic)** — `--good` / `--good-fg` / `--good-soft` / `--good-soft-fg`
  with parallel `--edge-*` and `--no-go-*` ramps. These replace the legacy
  hard-coded green/amber/red.
- **Geometry** — `--space-1..10` (4px baseline), `--radius-1..4`, `--radius-pill`,
  `--container-max`
- **Motion** — `--transition-fast`, `--transition-mid`, `--motion`. Suppressed
  to `0ms` under `prefers-reduced-motion: reduce`.
- **Typography** — `--font-serif` (Fraunces Variable), `--font-sans` (Inter
  Variable), `--font-mono` (JetBrains Mono Variable). All self-hosted via
  `@fontsource-variable/*` — no CDN.

## WCAG AA contrast audit

Computed contrast ratios for the foreground/background pairs that ship as
default body, accent, and verdict combinations. WCAG 2.1 AA requires ≥4.5:1
for normal text and ≥3:1 for large text + UI components; AAA requires ≥7:1.

### Light theme (background: `--surface` `#fafaf7`, except where noted)

| Foreground          | Token             | Ratio | Grade |
| ------------------- | ----------------- | ----- | ----- |
| `#14130d` body      | `--text`          | 18.3  | AAA   |
| `#4a4738` secondary | `--text-2`        |  9.0  | AAA   |
| `#6c6757` tertiary  | `--text-3`        |  5.4  | AA    |
| `#2557d6` link      | `--accent`        |  5.9  | AA    |
| `#1f7a36` on white  | `--good` chip     |  5.4  | AA    |
| `#a25a00` on white  | `--edge` chip     |  5.3  | AA    |
| `#b1271a` on white  | `--no-go` chip    |  6.6  | AA    |
| `--good-fg` on `--good`     | white on green | 5.4 | AA    |
| `--edge-fg` on `--edge`     | white on amber | 5.3 | AA    |
| `--no-go-fg` on `--no-go`   | white on red   | 6.6 | AA    |
| `--good-soft-fg` on `--good-soft` | dark on tint | 10.1 | AAA |

### Dark theme (background: `--surface` `#0e1116`)

| Foreground          | Token         | Ratio | Grade |
| ------------------- | ------------- | ----- | ----- |
| `#e8eef5` body      | `--text`      | 16.2  | AAA   |
| `#b6c0cc` secondary | `--text-2`    | 10.3  | AAA   |
| `#8493a3` tertiary  | `--text-3`    |  6.0  | AA    |
| `#7aa9ff` link      | `--accent`    |  8.0  | AAA   |
| `#5fd07b` good chip | `--good`      |  9.7  | AAA   |
| `#efb547` edge chip | `--edge`      | 10.3  | AAA   |
| `#f37b73` no-go     | `--no-go`     |  7.1  | AAA   |
| `--good-fg` on `--good` | `#062813` on green | 8.1 | AAA |

The "soft" verdict tokens (`--good-soft`, `--edge-soft`, `--no-go-soft`) are
designed as background tints; their paired `*-soft-fg` token is what should be
used as text colour on top of them. All such pairs land at AAA. The "solid"
verdict tokens (`--good`, etc.) are designed for use as a chip background with
the matching `*-fg` token on top, also AA.

Methodology: ratios computed with the WCAG 2.1 luminance formula
`L = 0.2126·R + 0.7152·G + 0.0722·B` after sRGB linearisation, on the actual
hex values shipped in `tokens.css`.

## Conventions

1. **Never** hard-code a hex colour in a component file. Add a token first.
2. **Never** consume a `--c-*` palette ramp directly — those exist only to
   supply the semantic layer.
3. New verdict-adjacent states (e.g. "marginal-warm") get a new semantic token,
   not a re-use of `--edge`.
4. For one-off chart strokes that need a faint divider, use `--border`. For a
   strong divider, `--border-strong`.
5. Numbers in tables, badges, and stats inherit `font-variant-numeric:
   tabular-nums` from `typography.css`. Do not override.

## Adding a token

1. Edit `src/styles/tokens.css`. Add it under both `[data-theme="light"]` (the
   `:root` block) and `[data-theme="dark"]`.
2. If it's typography or motion, prefer `typography.css` / the motion section
   of `tokens.css` instead.
3. If it's a semantic colour pairing (foreground/background) document the
   contrast ratio in this file.
4. Run `npm run check` and `npm run build` — biome lints CSS via the formatter
   and the build will fail on a missing reference.
