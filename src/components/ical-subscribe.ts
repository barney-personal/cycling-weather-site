// M11 — iCal subscription block.
//
// Renders a copyable subscription URL + an "Add to Calendar" deep link for a
// destination's `.ics`. The .ics file is written by `scripts/generate-ical.mjs`
// at build time AND re-emitted by the cron refresh, so subscribers always see
// today's qualifying window without requiring a redeploy.
//
// `webcal://` is the conventional protocol calendar apps register for
// subscription URLs. We surface it as the deep link (button) and `https://` as
// the copyable string (since not every renderer handles webcal).

export interface IcalSubscribeOptions {
  mount: HTMLElement | string | null;
  /** Site-relative URL of the .ics file (e.g. `./ical/los-angeles.ics`). */
  href: string;
  /** Friendly destination label used in the heading. */
  label?: string;
  /** "all-go.ics" should set this so the helper copy makes sense. */
  variant?: "destination" | "all-go";
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

function resolveAbsoluteUrl(href: string): string {
  // Normalise a site-relative URL to an absolute one suitable for copying
  // into a calendar app's "Subscribe to URL" field. We deliberately do this
  // at runtime so the same code works on the live site, on a local preview
  // (`npm run preview`), and from `file://` (which falls back to a path).
  try {
    return new URL(href, location.href).toString();
  } catch {
    return href;
  }
}

function asWebcal(absUrl: string): string {
  // Replace the leading scheme (https/http) with webcal so calendar apps that
  // recognise the webcal: protocol open their "subscribe to remote calendar"
  // sheet directly. https-served URLs map to webcals: per RFC 7986 §6.10.
  return absUrl.replace(/^https?:\/\//, "webcal://").replace(/^webcals:\/\//, "webcal://");
}

function findMount(target: HTMLElement | string | null): HTMLElement | null {
  if (!target) return null;
  if (typeof target === "string") return document.querySelector<HTMLElement>(target);
  return target;
}

export function mountIcalSubscribe(opts: IcalSubscribeOptions): void {
  const mount = findMount(opts.mount);
  if (!mount) return;
  const variant = opts.variant ?? "destination";
  const label = opts.label ?? (variant === "all-go" ? "every GO destination" : "this destination");

  const absUrl = resolveAbsoluteUrl(opts.href);
  const webcalUrl = asWebcal(absUrl);

  const headline =
    variant === "all-go" ? "Subscribe to every GO destination" : `Subscribe to ${label}`;
  const body =
    variant === "all-go"
      ? "Get a calendar feed of every cycling-clean window across all destinations. Calendar apps re-fetch this URL on their own schedule (typically daily) — events update as the forecast moves."
      : `Get a calendar feed of clean windows for ${label}. Calendar apps re-fetch this URL on their own schedule (typically daily) — events update as the forecast moves.`;

  mount.innerHTML = `
    <div class="ical-subscribe" data-variant="${escapeHtml(variant)}">
      <div class="ical-subscribe-head">
        <span class="ical-subscribe-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2"/>
            <path d="M3 9h18"/>
            <path d="M8 3v4"/>
            <path d="M16 3v4"/>
            <circle cx="12" cy="14" r="2.2"/>
          </svg>
        </span>
        <h3 class="ical-subscribe-title">${escapeHtml(headline)}</h3>
      </div>
      <p class="ical-subscribe-body">${escapeHtml(body)}</p>
      <div class="ical-subscribe-actions">
        <a class="ical-subscribe-btn" href="${escapeHtml(webcalUrl)}" rel="noopener">Add to Calendar</a>
        <button type="button" class="ical-subscribe-copy" data-url="${escapeHtml(absUrl)}" aria-label="Copy subscription URL to clipboard">Copy URL</button>
      </div>
      <code class="ical-subscribe-url" aria-label="Subscription URL">${escapeHtml(absUrl)}</code>
      <p class="ical-subscribe-status" role="status" aria-live="polite"></p>
    </div>`;

  const copyBtn = mount.querySelector<HTMLButtonElement>(".ical-subscribe-copy");
  const status = mount.querySelector<HTMLElement>(".ical-subscribe-status");
  let statusTimeout: ReturnType<typeof setTimeout> | null = null;
  copyBtn?.addEventListener("click", async () => {
    const url = copyBtn.dataset.url ?? "";
    if (!url) return;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        copied = true;
      }
    } catch {
      // fall through to manual fallback
    }
    if (!copied) {
      // Fallback for older browsers / file:// without clipboard permissions.
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (status) {
      status.textContent = copied
        ? "Copied — paste into your calendar app's 'Subscribe to URL'."
        : "Couldn't copy — long-press the URL above to copy manually.";
      status.dataset.tone = copied ? "ok" : "warn";
      if (statusTimeout) clearTimeout(statusTimeout);
      statusTimeout = setTimeout(() => {
        status.textContent = "";
        delete status.dataset.tone;
      }, 5000);
    }
  });
}
