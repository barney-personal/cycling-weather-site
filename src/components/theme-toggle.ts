/*
 * Theme toggle — three-state (system / light / dark), persists to localStorage.
 *
 * The companion FOUC-prevention <head> script (inline in each HTML page) reads
 * `cw-theme` from localStorage synchronously and writes the resolved theme onto
 * <html data-theme="…"> before first paint. This component only handles the
 * after-load click cycle; it must NOT race that head script.
 *
 * Storage values:
 *   cw-theme=light  -> always light, regardless of OS
 *   cw-theme=dark   -> always dark
 *   cw-theme=system -> follow prefers-color-scheme (also: missing key)
 */

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "cw-theme";
const VALID: ReadonlyArray<ThemeChoice> = ["light", "dark", "system"];

function readStored(): ThemeChoice {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (VALID as ReadonlyArray<string>).includes(raw)) {
      return raw as ThemeChoice;
    }
  } catch {
    /* localStorage may be unavailable in private modes — fall through. */
  }
  return "system";
}

function writeStored(choice: ThemeChoice): void {
  try {
    if (choice === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, choice);
    }
  } catch {
    /* swallow — storage is best-effort. */
  }
}

function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice === "light" || choice === "dark") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(choice: ThemeChoice): void {
  const resolved = resolveTheme(choice);
  document.documentElement.setAttribute("data-theme", resolved);
}

function nextChoice(current: ThemeChoice): ThemeChoice {
  if (current === "system") return "light";
  if (current === "light") return "dark";
  return "system";
}

const ICONS: Record<ThemeChoice, string> = {
  system:
    '<svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="9" rx="1.5"/><path d="M5.5 14h5"/><path d="M8 12v2"/></svg>',
  light:
    '<svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.5M8 13v1.5M14.5 8H13M3 8H1.5M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5L3.4 3.4"/></svg>',
  dark: '<svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16" fill="currentColor"><path d="M13.5 9.4a5.5 5.5 0 0 1-7-7 .5.5 0 0 0-.7-.6 6.5 6.5 0 1 0 8.4 8.4.5.5 0 0 0-.7-.7z"/></svg>',
};

const LABELS: Record<ThemeChoice, string> = {
  system: "Theme: matches your system",
  light: "Theme: light",
  dark: "Theme: dark",
};

/**
 * Mount a theme toggle button at `mountSelector`. The button cycles through
 * system → light → dark on click. Returns a cleanup function.
 */
export function mountThemeToggle(mountSelector: string): () => void {
  const mount = document.querySelector<HTMLElement>(mountSelector);
  if (!mount) return () => {};

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "theme-toggle";
  btn.setAttribute("aria-live", "polite");

  let current = readStored();

  function paint(): void {
    btn.innerHTML = `${ICONS[current]}<span class="visually-hidden">${LABELS[current]}</span>`;
    btn.title = LABELS[current];
    btn.setAttribute("aria-label", LABELS[current]);
    btn.dataset.themeChoice = current;
    applyTheme(current);
  }

  paint();

  btn.addEventListener("click", () => {
    current = nextChoice(current);
    writeStored(current);
    paint();
  });

  // When user is on "system" and OS theme flips mid-session, follow it.
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onMq = (): void => {
    if (current === "system") applyTheme(current);
  };
  mq.addEventListener("change", onMq);

  mount.appendChild(btn);

  return () => {
    mq.removeEventListener("change", onMq);
    btn.remove();
  };
}
