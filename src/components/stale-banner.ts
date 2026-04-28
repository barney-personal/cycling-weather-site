// Subtle stale-data banner shown above the homepage hero when `data.json`
// is more than 36 hours old, or when `?stale=1` is set (debug switch used by
// the visual snapshot suite). When fresh and no debug flag, the banner is
// silent — no DOM, no announcement.
//
// `role="status"` (an aria-live="polite" landmark) so screen readers pick
// it up without interrupting whatever the user is currently hearing. The
// banner is keyboard-focusable but stops short of being a `<dialog>` —
// it is informational, not blocking.

const STALE_THRESHOLD_MS = 36 * 60 * 60 * 1000;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

// Express the gap since `generatedAt` as a short, human-friendly relative
// phrase. The cron is daily; the threshold is 36h; so the practical range
// is ~36h–168h. Fall back to the absolute date if parsing fails so the user
// is never stranded with a vague "—".
function humanRelative(generatedAt: string, now: number): string {
  const t = Date.parse(generatedAt);
  if (!Number.isFinite(t)) return generatedAt;
  const diffMs = Math.max(0, now - t);
  const hours = diffMs / 3_600_000;
  if (hours < 24) {
    const rounded = Math.max(1, Math.round(hours));
    return `${rounded} hour${rounded === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  // Beyond two weeks fall back to the ISO date — a banner saying "29 days ago"
  // is less useful than the actual date for diagnosis.
  try {
    const d = new Date(t);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return generatedAt;
  }
}

export interface MountStaleBannerOptions {
  mount: string | HTMLElement;
  /** ISO timestamp from `data.json.generated_at`. */
  generatedAt: string;
  /** When true, force-show the banner regardless of age. Used by `?stale=1`. */
  force?: boolean;
  /** Override `Date.now()` for deterministic tests. */
  now?: number;
}

export function isStale(generatedAt: string, now: number = Date.now()): boolean {
  const t = Date.parse(generatedAt);
  if (!Number.isFinite(t)) return false;
  return now - t > STALE_THRESHOLD_MS;
}

export function mountStaleBanner(opts: MountStaleBannerOptions): void {
  const target =
    typeof opts.mount === "string" ? document.querySelector<HTMLElement>(opts.mount) : opts.mount;
  if (!target) return;
  const now = opts.now ?? Date.now();
  const stale = opts.force === true || isStale(opts.generatedAt, now);
  if (!stale) {
    target.innerHTML = "";
    return;
  }
  const relative = opts.generatedAt ? humanRelative(opts.generatedAt, now) : "an unknown time ago";
  target.innerHTML = `
    <div class="stale-banner" role="status" aria-live="polite">
      <span class="stale-banner-icon" aria-hidden="true">⚠</span>
      <span class="stale-banner-text">Forecast may be stale — last refreshed ${escapeHtml(relative)}.</span>
    </div>
  `;
}
