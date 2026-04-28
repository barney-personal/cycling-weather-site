// Calendar view — rows = destinations (ranked), columns = the next 14 days.
// Mounted only when the user toggles `?view=calendar` on the homepage.
//
// Bundling shape: this module is loaded via `await import("./components/
// calendar")` from main.ts, so its bytes ship in a separate `calendar-*.js`
// chunk. The default homepage initial-paint graph (table + cards) stays
// untouched.
//
// Each cell reuses the strip-cell encoding from src/lib/strip.ts:
//   - --cell-fill: temp gradient (cool → warm)
//   - .rain-*:     rain density via dot overlay
//   - .wind-*:     wind via diagonal hatch
//   - .is-qualify: white outline on a clean ride day
//
// Keyboard nav: when focus is inside the grid, ArrowLeft/Right move
// between days for the same destination, ArrowUp/Down move between
// destinations for the same day, Home/End jump to first/last day in
// the current row, Ctrl+Home/Ctrl+End jump to top-left / bottom-right.

import {
  DEFAULT_THRESHOLDS,
  type RankedDestination,
  type Thresholds,
  rankWithThresholds,
} from "../lib/qualify";
import { rainBucket, tempColour, windBucket } from "../lib/strip";
import type { DestinationResult } from "../lib/types";

export interface MountCalendarOptions {
  mount: HTMLElement;
  results: DestinationResult[];
}

export interface CalendarHandle {
  setThresholds(t: Thresholds): void;
  destroy(): void;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

function destinationLink(slug: string): string {
  return `./destination.html?slug=${encodeURIComponent(slug)}`;
}

interface DateHeader {
  iso: string;
  weekday: string;
  day: string;
  month: string;
}

function buildDateHeaders(rows: RankedDestination[]): DateHeader[] {
  // Use the first non-empty destination's daily array to derive the column
  // dates. Every destination in `data.json` shares the same forecast window,
  // so any row's `daily` will do.
  const sample = rows.find((r) => r.result.daily.length > 0)?.result.daily ?? [];
  return sample.map((d) => {
    const dt = new Date(`${d.date}T00:00:00Z`);
    if (Number.isNaN(dt.getTime())) {
      return { iso: d.date, weekday: "", day: d.date, month: "" };
    }
    return {
      iso: d.date,
      weekday: dt.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }),
      day: dt.toLocaleDateString(undefined, { day: "numeric", timeZone: "UTC" }),
      month: dt.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" }),
    };
  });
}

function renderCell(row: RankedDestination, dayIdx: number): string {
  const d = row.result.daily[dayIdx];
  if (!d) return '<td class="cal-cell cal-cell-empty" aria-hidden="true"></td>';
  const fill = tempColour(d.temp_max);
  const rain = rainBucket(d.precip_sum, d.precip_prob_max);
  const wind = windBucket(d.wind_max);
  const qualifies = row.qualifies[dayIdx] === true;
  const cls = [
    "cal-cell",
    "strip-cell",
    `rain-${rain}`,
    `wind-${wind}`,
    qualifies ? "is-qualify" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const ariaLabel =
    `${row.result.name}, ${d.date}: ` +
    `${d.temp_max.toFixed(0)}°C, ` +
    `${d.precip_sum.toFixed(1)}mm rain (${Math.round(d.precip_prob_max)}% probability), ` +
    `${d.wind_max.toFixed(0)} km/h wind${qualifies ? ", qualifies" : ""}`;
  return `<td class="cal-cell-wrap"><button type="button" class="${cls}" tabindex="-1" style="--cell-fill:${fill}" data-day="${dayIdx}" data-slug="${escapeHtml(row.result.slug)}" aria-label="${escapeHtml(ariaLabel)}"></button></td>`;
}

function renderRow(row: RankedDestination, rank: number, dayCount: number): string {
  const cells = [] as string[];
  for (let i = 0; i < dayCount; i++) cells.push(renderCell(row, i));
  const region = row.result.region
    ? `<span class="cal-row-region">${escapeHtml(row.result.region)}</span>`
    : "";
  return `<tr class="cal-row" data-slug="${escapeHtml(row.result.slug)}" data-qualifier="${row.qualifier ? "1" : "0"}"><th class="cal-row-head" scope="row"><a class="cal-row-link" href="${destinationLink(row.result.slug)}"><span class="cal-row-rank" aria-label="Rank ${rank}">${rank}</span><span class="cal-row-name">${escapeHtml(row.result.name)}</span>${region}</a></th>${cells.join("")}</tr>`;
}

function renderHeader(headers: DateHeader[]): string {
  const cells = headers
    .map((h) => {
      const label = h.weekday
        ? `<span class="cal-head-weekday">${escapeHtml(h.weekday)}</span><span class="cal-head-day">${escapeHtml(h.day)}</span>`
        : escapeHtml(h.day);
      return `<th scope="col" class="cal-head-day-cell"><span class="visually-hidden">${escapeHtml(`${h.weekday} ${h.month} ${h.day}`)}</span><span aria-hidden="true">${label}</span></th>`;
    })
    .join("");
  return `<thead><tr><th scope="col" class="cal-head-corner"><span class="visually-hidden">Destination</span></th>${cells}</tr></thead>`;
}

function renderCalendar(rows: RankedDestination[]): string {
  if (rows.length === 0) {
    return '<div class="cal-empty"><p class="cal-empty-title">No destinations match.</p><p class="cal-empty-msg">Try widening your thresholds.</p></div>';
  }
  const headers = buildDateHeaders(rows);
  const dayCount = headers.length;
  const body = rows.map((row, i) => renderRow(row, i + 1, dayCount)).join("");
  return `<div class="cal-scroll" role="region" aria-label="Calendar of destinations × forecast days" tabindex="0"><table class="cal-grid" role="grid">${renderHeader(headers)}<tbody>${body}</tbody></table></div>`;
}

function buildView(results: DestinationResult[], thresholds: Thresholds): RankedDestination[] {
  return rankWithThresholds(results, thresholds);
}

export function mountCalendar(opts: MountCalendarOptions): CalendarHandle {
  const mount = opts.mount;
  let thresholds: Thresholds = DEFAULT_THRESHOLDS;

  function focusCellAt(row: number, col: number): void {
    const cells = mount.querySelectorAll<HTMLButtonElement>("button.cal-cell");
    // Find the button at (row, col) — easier via the row's local index.
    const rows = mount.querySelectorAll<HTMLElement>("tr.cal-row");
    const tr = rows[row];
    if (!tr) return;
    const rowCells = tr.querySelectorAll<HTMLButtonElement>("button.cal-cell");
    const target = rowCells[col];
    if (target) {
      // Roving tabindex: clear all, set target.
      cells.forEach((c) => c.setAttribute("tabindex", "-1"));
      target.setAttribute("tabindex", "0");
      target.focus();
    }
  }

  function onKeydown(ev: KeyboardEvent): void {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest<HTMLButtonElement>("button.cal-cell");
    if (!btn) return;
    const tr = btn.closest<HTMLElement>("tr.cal-row");
    if (!tr) return;
    const rows = Array.from(mount.querySelectorAll<HTMLElement>("tr.cal-row"));
    const rowIdx = rows.indexOf(tr);
    const rowCells = Array.from(tr.querySelectorAll<HTMLButtonElement>("button.cal-cell"));
    const colIdx = rowCells.indexOf(btn);
    if (rowIdx < 0 || colIdx < 0) return;
    const lastRow = rows.length - 1;
    const lastCol = rowCells.length - 1;
    let nextRow = rowIdx;
    let nextCol = colIdx;
    switch (ev.key) {
      case "ArrowLeft":
        nextCol = Math.max(0, colIdx - 1);
        break;
      case "ArrowRight":
        nextCol = Math.min(lastCol, colIdx + 1);
        break;
      case "ArrowUp":
        nextRow = Math.max(0, rowIdx - 1);
        break;
      case "ArrowDown":
        nextRow = Math.min(lastRow, rowIdx + 1);
        break;
      case "Home":
        if (ev.ctrlKey || ev.metaKey) {
          nextRow = 0;
        }
        nextCol = 0;
        break;
      case "End":
        if (ev.ctrlKey || ev.metaKey) {
          nextRow = lastRow;
        }
        nextCol = lastCol;
        break;
      default:
        return;
    }
    if (nextRow === rowIdx && nextCol === colIdx) return;
    ev.preventDefault();
    focusCellAt(nextRow, nextCol);
  }

  function onFocusIn(ev: FocusEvent): void {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest<HTMLButtonElement>("button.cal-cell");
    if (!btn) return;
    // Roving tabindex: only the focused cell is tab-stop; clear all others
    // so Shift+Tab leaves the grid in one keypress.
    const cells = mount.querySelectorAll<HTMLButtonElement>("button.cal-cell");
    cells.forEach((c) => c.setAttribute("tabindex", "-1"));
    btn.setAttribute("tabindex", "0");
  }

  function render(): void {
    const view = buildView(opts.results, thresholds);
    mount.innerHTML = renderCalendar(view);
    // Make the first cell the initial tab-stop so keyboard users can enter
    // the grid via a single Tab.
    const firstCell = mount.querySelector<HTMLButtonElement>("button.cal-cell");
    if (firstCell) firstCell.setAttribute("tabindex", "0");
  }

  mount.addEventListener("keydown", onKeydown);
  mount.addEventListener("focusin", onFocusIn);
  render();

  return {
    setThresholds(t: Thresholds): void {
      thresholds = t;
      render();
    },
    destroy(): void {
      mount.removeEventListener("keydown", onKeydown);
      mount.removeEventListener("focusin", onFocusIn);
      mount.innerHTML = "";
    },
  };
}
