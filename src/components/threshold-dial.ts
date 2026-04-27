// Threshold dial — mobile bottom-sheet / desktop popover that lets the user
// dial in what "ride-clean" means. State is persisted to URL params (so links
// are shareable) AND localStorage (so reload picks up the last-used state when
// no URL params are present). Emits a CustomEvent("cwthresholds:change") with
// the resolved Thresholds + SunPref so consumers (the ranking component) can
// recompute on the client without touching the dial implementation.

import {
  DEFAULT_THRESHOLDS,
  type SunPref,
  type Thresholds,
  thresholdsFromSunPref,
} from "../lib/qualify";

const STORAGE_KEY = "cw-thresholds";
const URL_KEYS = ["temp", "rain", "prob", "wind", "sun"] as const;

export interface DialState {
  tempMin: number;
  rainMax: number;
  probMax: number;
  windMax: number;
  sunPref: SunPref;
}

export const DEFAULT_DIAL_STATE: Readonly<DialState> = Object.freeze({
  tempMin: DEFAULT_THRESHOLDS.tempMin,
  rainMax: DEFAULT_THRESHOLDS.rainMax,
  probMax: DEFAULT_THRESHOLDS.probMax,
  windMax: DEFAULT_THRESHOLDS.windMax,
  sunPref: "sun-cloud",
});

const SUN_PREFS: SunPref[] = ["sun", "sun-cloud", "all-but-rain"];
const SUN_LABELS: Record<SunPref, string> = {
  sun: "Sun only",
  "sun-cloud": "Sun + cloud",
  "all-but-rain": "Anything but rain",
  any: "Any",
};

function clampNumber(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

function isSunPref(v: unknown): v is SunPref {
  return v === "sun" || v === "sun-cloud" || v === "all-but-rain" || v === "any";
}

function safeReadStorage(): Partial<DialState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Partial<DialState>;
  } catch {
    return {};
  }
}

function safeWriteStorage(state: DialState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

function readUrl(): Partial<DialState> {
  const out: Partial<DialState> = {};
  if (typeof location === "undefined") return out;
  const params = new URLSearchParams(location.search);
  if (params.has("temp")) out.tempMin = Number(params.get("temp"));
  if (params.has("rain")) out.rainMax = Number(params.get("rain"));
  if (params.has("prob")) out.probMax = Number(params.get("prob"));
  if (params.has("wind")) out.windMax = Number(params.get("wind"));
  const sun = params.get("sun");
  if (sun && isSunPref(sun)) out.sunPref = sun;
  return out;
}

function writeUrl(state: DialState): void {
  if (typeof location === "undefined") return;
  const params = new URLSearchParams(location.search);
  const isDefault = stateEquals(state, DEFAULT_DIAL_STATE);
  if (isDefault) {
    for (const k of URL_KEYS) params.delete(k);
  } else {
    params.set("temp", String(state.tempMin));
    params.set("rain", String(state.rainMax));
    params.set("prob", String(state.probMax));
    params.set("wind", String(state.windMax));
    params.set("sun", state.sunPref);
  }
  const qs = params.toString();
  const next = `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`;
  history.replaceState(null, "", next);
}

function stateEquals(a: DialState, b: DialState): boolean {
  return (
    a.tempMin === b.tempMin &&
    a.rainMax === b.rainMax &&
    a.probMax === b.probMax &&
    a.windMax === b.windMax &&
    a.sunPref === b.sunPref
  );
}

function resolveInitialState(): DialState {
  const stored = safeReadStorage();
  const url = readUrl();
  // URL wins over localStorage.
  return {
    tempMin: clampNumber(url.tempMin ?? stored.tempMin, 0, 35, DEFAULT_DIAL_STATE.tempMin),
    rainMax: clampNumber(url.rainMax ?? stored.rainMax, 0, 10, DEFAULT_DIAL_STATE.rainMax),
    probMax: clampNumber(url.probMax ?? stored.probMax, 0, 100, DEFAULT_DIAL_STATE.probMax),
    windMax: clampNumber(url.windMax ?? stored.windMax, 10, 60, DEFAULT_DIAL_STATE.windMax),
    sunPref: isSunPref(url.sunPref ?? stored.sunPref)
      ? (url.sunPref ?? stored.sunPref)!
      : DEFAULT_DIAL_STATE.sunPref,
  };
}

export function dialStateToThresholds(state: DialState): Thresholds {
  return thresholdsFromSunPref(
    {
      tempMin: state.tempMin,
      rainMax: state.rainMax,
      probMax: state.probMax,
      windMax: state.windMax,
      codeIn: DEFAULT_THRESHOLDS.codeIn,
    },
    state.sunPref,
  );
}

export interface DialChangeDetail {
  state: DialState;
  thresholds: Thresholds;
  isDefault: boolean;
}

export interface MountThresholdDialOptions {
  /** Trigger button (or selector) the user taps to open the dial. */
  trigger: string | HTMLElement;
  /** Container that receives the popover/sheet markup. Defaults to body. */
  surface?: string | HTMLElement;
  /** Element on which to dispatch `cwthresholds:change`. Defaults to window. */
  emitter?: EventTarget;
  /** Optional initial-state override (test hook). */
  initial?: Partial<DialState>;
}

export interface ThresholdDialHandle {
  state: DialState;
  thresholds: Thresholds;
  destroy(): void;
  open(): void;
  close(): void;
}

function el<T extends HTMLElement>(html: string): T {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  const node = tpl.content.firstElementChild;
  if (!node) throw new Error("threshold-dial: empty template");
  return node as T;
}

const DIAL_HTML = `
<aside class="threshold-dial" role="dialog" aria-modal="false" aria-label="Threshold dial" hidden>
  <div class="threshold-dial-backdrop" data-dismiss="1"></div>
  <div class="threshold-dial-panel">
    <header class="threshold-dial-header">
      <h2 class="threshold-dial-title">What counts as ride-clean?</h2>
      <button type="button" class="threshold-dial-close" aria-label="Close threshold dial">×</button>
    </header>
    <p class="threshold-dial-help">Tweak any of these and the rankings recompute live.</p>
    <div class="threshold-dial-row" data-row="temp">
      <label for="th-temp">Min daily high</label>
      <input id="th-temp" type="range" min="0" max="35" step="1" />
      <output for="th-temp" data-output="temp"></output>
    </div>
    <div class="threshold-dial-row" data-row="wind">
      <label for="th-wind">Max wind</label>
      <input id="th-wind" type="range" min="10" max="60" step="1" />
      <output for="th-wind" data-output="wind"></output>
    </div>
    <div class="threshold-dial-row" data-row="rain">
      <label for="th-rain">Rain tolerance</label>
      <input id="th-rain" type="range" min="0" max="10" step="0.5" />
      <output for="th-rain" data-output="rain"></output>
    </div>
    <div class="threshold-dial-row" data-row="prob">
      <label for="th-prob">Max rain probability</label>
      <input id="th-prob" type="range" min="0" max="100" step="5" />
      <output for="th-prob" data-output="prob"></output>
    </div>
    <fieldset class="threshold-dial-row threshold-dial-radio">
      <legend>Sun preference</legend>
      <div class="threshold-dial-radio-group" data-row="sun">
        <label><input type="radio" name="th-sun" value="sun"><span>Sun only</span></label>
        <label><input type="radio" name="th-sun" value="sun-cloud"><span>Sun + cloud</span></label>
        <label><input type="radio" name="th-sun" value="all-but-rain"><span>Anything but rain</span></label>
      </div>
    </fieldset>
    <footer class="threshold-dial-footer">
      <button type="button" class="threshold-dial-reset" data-action="reset">Reset to defaults</button>
      <button type="button" class="threshold-dial-done" data-action="done">Done</button>
    </footer>
  </div>
</aside>
`;

export function mountThresholdDial(opts: MountThresholdDialOptions): ThresholdDialHandle {
  const triggerCandidate =
    typeof opts.trigger === "string"
      ? document.querySelector<HTMLButtonElement>(opts.trigger)
      : (opts.trigger as HTMLButtonElement);
  if (!triggerCandidate) throw new Error("mountThresholdDial: trigger not found");
  const trigger: HTMLButtonElement = triggerCandidate;

  const surfaceCandidate =
    typeof opts.surface === "string"
      ? document.querySelector<HTMLElement>(opts.surface)
      : (opts.surface ?? document.body);
  if (!surfaceCandidate) throw new Error("mountThresholdDial: surface not found");
  const surface: HTMLElement = surfaceCandidate;

  const emitter: EventTarget = opts.emitter ?? window;

  let state: DialState = { ...resolveInitialState(), ...(opts.initial ?? {}) };

  const root = el<HTMLElement>(DIAL_HTML);
  surface.appendChild(root);

  const tempIn = root.querySelector<HTMLInputElement>("#th-temp")!;
  const windIn = root.querySelector<HTMLInputElement>("#th-wind")!;
  const rainIn = root.querySelector<HTMLInputElement>("#th-rain")!;
  const probIn = root.querySelector<HTMLInputElement>("#th-prob")!;
  const sunInputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="th-sun"]'));

  const tempOut = root.querySelector<HTMLOutputElement>('[data-output="temp"]')!;
  const windOut = root.querySelector<HTMLOutputElement>('[data-output="wind"]')!;
  const rainOut = root.querySelector<HTMLOutputElement>('[data-output="rain"]')!;
  const probOut = root.querySelector<HTMLOutputElement>('[data-output="prob"]')!;

  function reflectInputs(): void {
    tempIn.value = String(state.tempMin);
    windIn.value = String(state.windMax);
    rainIn.value = String(state.rainMax);
    probIn.value = String(state.probMax);
    tempOut.textContent = `${state.tempMin}°C`;
    windOut.textContent = `${state.windMax} km/h`;
    rainOut.textContent = state.rainMax === 0 ? "0 mm" : `≤ ${state.rainMax} mm`;
    probOut.textContent = `< ${state.probMax}%`;
    for (const r of sunInputs) r.checked = r.value === state.sunPref;
    updateTriggerLabel();
  }

  function updateTriggerLabel(): void {
    const isDefault = stateEquals(state, DEFAULT_DIAL_STATE);
    trigger.dataset.dirty = isDefault ? "0" : "1";
    const summary = isDefault
      ? "Defaults"
      : `${state.tempMin}° · ${state.windMax}km/h · ${SUN_LABELS[state.sunPref]}`;
    const summaryEl = trigger.querySelector<HTMLElement>(".threshold-trigger-summary");
    if (summaryEl) summaryEl.textContent = summary;
    trigger.setAttribute("aria-label", `Adjust ride-clean thresholds (current: ${summary})`);
  }

  function emit(): void {
    const thresholds = dialStateToThresholds(state);
    const detail: DialChangeDetail = {
      state: { ...state },
      thresholds,
      isDefault: stateEquals(state, DEFAULT_DIAL_STATE),
    };
    emitter.dispatchEvent(new CustomEvent<DialChangeDetail>("cwthresholds:change", { detail }));
  }

  function commit(next: Partial<DialState>): void {
    state = {
      ...state,
      ...next,
    };
    safeWriteStorage(state);
    writeUrl(state);
    reflectInputs();
    emit();
  }

  // Wire change events. `input` fires on drag — but we throttle the visible
  // output text + emit until the user lets go to keep the rendering work
  // proportional to user intent (one re-render per slider release, not per
  // pixel).
  function bindRange(input: HTMLInputElement, key: keyof DialState): void {
    input.addEventListener("input", () => {
      const v = Number(input.value);
      // Reflect output text live for feedback, but defer the emit to `change`.
      if (key === "tempMin") tempOut.textContent = `${v}°C`;
      if (key === "windMax") windOut.textContent = `${v} km/h`;
      if (key === "rainMax") rainOut.textContent = v === 0 ? "0 mm" : `≤ ${v} mm`;
      if (key === "probMax") probOut.textContent = `< ${v}%`;
    });
    input.addEventListener("change", () => {
      const v = Number(input.value);
      commit({ [key]: v } as Partial<DialState>);
    });
  }

  bindRange(tempIn, "tempMin");
  bindRange(windIn, "windMax");
  bindRange(rainIn, "rainMax");
  bindRange(probIn, "probMax");

  for (const r of sunInputs) {
    r.addEventListener("change", () => {
      if (r.checked && isSunPref(r.value)) commit({ sunPref: r.value });
    });
  }

  function open(): void {
    root.hidden = false;
    root.classList.add("is-open");
    document.documentElement.classList.add("threshold-dial-open");
    trigger.setAttribute("aria-expanded", "true");
    // Focus first slider for accessibility.
    queueMicrotask(() => tempIn.focus());
  }
  function close(): void {
    root.hidden = true;
    root.classList.remove("is-open");
    document.documentElement.classList.remove("threshold-dial-open");
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
  }

  function onTriggerClick(): void {
    if (root.hidden) open();
    else close();
  }
  trigger.addEventListener("click", onTriggerClick);
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-haspopup", "dialog");

  function onRootClick(ev: Event): void {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    if (target.dataset.dismiss === "1" || target.dataset.action === "done") close();
    if (target.dataset.action === "reset") commit({ ...DEFAULT_DIAL_STATE });
    if (target.classList.contains("threshold-dial-close")) close();
  }
  root.addEventListener("click", onRootClick);

  function onKey(ev: KeyboardEvent): void {
    if (ev.key === "Escape" && !root.hidden) {
      ev.stopPropagation();
      close();
    }
  }
  document.addEventListener("keydown", onKey);

  reflectInputs();
  // Emit initial state on mount so consumers don't need to read the URL/storage themselves.
  queueMicrotask(emit);

  return {
    get state(): DialState {
      return { ...state };
    },
    get thresholds(): Thresholds {
      return dialStateToThresholds(state);
    },
    destroy(): void {
      trigger.removeEventListener("click", onTriggerClick);
      root.removeEventListener("click", onRootClick);
      document.removeEventListener("keydown", onKey);
      root.remove();
    },
    open,
    close,
  };
}
