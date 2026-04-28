// Site header — brand wordmark + primary nav + theme toggle.
// Replaces the duplicated `<header class="site">` markup that lived in
// each entry HTML page. Each entry calls `mountHeader({ active })` once.
//
// Layout:
//   ≥768px: brand on the left, horizontal nav + theme toggle on the right
//   <768px: brand + hamburger button visible; nav collapses into a sheet
//           that drops below the brand row when toggled. The theme toggle
//           lives next to the hamburger so it stays one-tap accessible.

import { mountThemeToggle } from "./theme-toggle";

export type ActiveSection = "forward" | "compare" | "plan" | "history" | "methodology";

interface NavLink {
  section: ActiveSection;
  href: string;
  label: string;
}

// Compare ("compare") is reserved in `ActiveSection` for forward compatibility
// (the M15 stretch milestone). It deliberately stays out of `LINKS` until that
// page actually ships — we'd rather leave the door than bake dead nav links
// into the deployed bundle.
const LINKS: ReadonlyArray<NavLink> = [
  { section: "forward", href: "./index.html", label: "Forward" },
  { section: "plan", href: "./plan.html", label: "Plan" },
  { section: "history", href: "./history.html", label: "History" },
  { section: "methodology", href: "./methodology.html", label: "Method" },
];

const HAMBURGER_OPEN_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 5h10M3 8h10M3 11h10"/></svg>';
const HAMBURGER_CLOSE_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

// In-DOM brand mark — a simplified, single-colour rendition of
// src/assets/brand/icon.svg (sun + wheel + crossed spokes). Uses
// `currentColor` everywhere so it inherits from `.site-brand`'s `color`
// token and tracks both themes with no extra plumbing. Sized via CSS on
// `.site-brand-mark svg`. The richer multi-colour stamp (with cream rays
// + green dashed ring) lives in the PWA icon set, not the inline header.
const BRAND_MARK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="1.5"><line x1="12" y1="2" x2="12" y2="4"/><line x1="17.5" y1="3.6" x2="16.4" y2="5.6"/><line x1="6.5" y1="3.6" x2="7.6" y2="5.6"/></g><circle cx="12" cy="14.5" r="6.6" stroke-width="1.7"/><circle cx="12" cy="14.5" r="1.15" fill="currentColor" stroke="none"/><g stroke-width="1.1"><line x1="7.4" y1="9.9" x2="16.6" y2="19.1"/><line x1="16.6" y1="9.9" x2="7.4" y2="19.1"/></g></svg>';

export interface MountHeaderOptions {
  mount: string | HTMLElement;
  active: ActiveSection;
}

/**
 * Render the site header into `mount`. Returns a cleanup function.
 *
 * `mount` may be a CSS selector or an element. The element's contents are
 * replaced; existing classes/ids on the element itself are preserved so
 * pages can keep `<div id="site-header">` or similar in HTML for
 * pre-paint layout reservation.
 */
export function mountHeader(options: MountHeaderOptions): () => void {
  const target =
    typeof options.mount === "string"
      ? document.querySelector<HTMLElement>(options.mount)
      : options.mount;
  if (!target) return () => {};

  const navId = "site-nav-list";
  const navItems = LINKS.map((link) => {
    const isActive = link.section === options.active;
    const cls = isActive ? "site-nav-link active" : "site-nav-link";
    const ariaCurrent = isActive ? ' aria-current="page"' : "";
    return `<li><a class="${cls}" href="${link.href}"${ariaCurrent}>${link.label}</a></li>`;
  }).join("");

  target.innerHTML = `
    <header class="site" data-nav-open="false">
      <div class="site-row">
        <a class="site-brand" href="./index.html" aria-label="Cycling Weather — home">
          <span class="site-brand-mark" aria-hidden="true">${BRAND_MARK_SVG}</span>
          <span class="site-brand-name">Cycling Weather</span>
        </a>
        <div class="site-actions">
          <span id="theme-toggle" class="theme-toggle-mount"></span>
          <button
            type="button"
            class="site-hamburger"
            aria-label="Open navigation"
            aria-expanded="false"
            aria-controls="${navId}"
          >${HAMBURGER_OPEN_ICON}</button>
        </div>
      </div>
      <nav class="site-nav" aria-label="Primary">
        <ul class="site-nav-list" id="${navId}">${navItems}</ul>
      </nav>
    </header>
  `.trim();

  const headerEl = target.querySelector<HTMLElement>("header.site");
  const hamburger = target.querySelector<HTMLButtonElement>(".site-hamburger");

  function setOpen(open: boolean): void {
    if (!headerEl || !hamburger) return;
    headerEl.dataset.navOpen = open ? "true" : "false";
    hamburger.setAttribute("aria-expanded", open ? "true" : "false");
    hamburger.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    hamburger.innerHTML = open ? HAMBURGER_CLOSE_ICON : HAMBURGER_OPEN_ICON;
  }

  const onHamburgerClick = (): void => {
    if (!headerEl) return;
    setOpen(headerEl.dataset.navOpen !== "true");
  };
  hamburger?.addEventListener("click", onHamburgerClick);

  // Auto-collapse the sheet when a nav link is tapped (mobile pattern).
  const navLinks = target.querySelectorAll<HTMLAnchorElement>(".site-nav-link");
  const onNavClick = (): void => setOpen(false);
  navLinks.forEach((a) => a.addEventListener("click", onNavClick));

  // If viewport widens past the breakpoint, collapse so state stays sane.
  const mq = window.matchMedia("(min-width: 768px)");
  const onMq = (): void => {
    if (mq.matches) setOpen(false);
  };
  mq.addEventListener("change", onMq);

  // Close on Escape when the sheet is open.
  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key === "Escape" && headerEl?.dataset.navOpen === "true") setOpen(false);
  };
  document.addEventListener("keydown", onKey);

  const cleanupTheme = mountThemeToggle("#theme-toggle");

  return () => {
    cleanupTheme();
    hamburger?.removeEventListener("click", onHamburgerClick);
    navLinks.forEach((a) => a.removeEventListener("click", onNavClick));
    mq.removeEventListener("change", onMq);
    document.removeEventListener("keydown", onKey);
    target.innerHTML = "";
  };
}
