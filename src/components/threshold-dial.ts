// Threshold dial — mobile bottom-sheet / desktop popover that lets the user
// dial in what "ride-clean" means. State is persisted to URL params (so links
// are shareable) AND localStorage (so reload picks up the last-used state when
// no URL params are present). Emits a CustomEvent("cwthresholds:change") with
// the resolved Thresholds + SunPref so consumers (the ranking component) can
// recompute on the client without touching the dial implementation.
//
// URL parsing / storage / state-equality helpers live in `../lib/thresholds.ts`
// so the same `?temp=&rain=&prob=&wind=&sun=` convention is shared across the
// homepage, compare, and plan pages without copying the parser.

import type { SunPref, Thresholds } from "../lib/qualify";
import {
  DEFAULT_DIAL_STATE,
  type DialState,
  dialStateEquals,
  dialStateToThresholds,
  isSunPref,
  resolveInitialDialState,
  writeDialStorage,
  writeDialUrl,
} from "../lib/thresholds";

export type { DialState };
export { DEFAULT_DIAL_STATE, dialStateToThresholds };

const SUN_LABELS: Record<SunPref, string> = {
  sun: "Sun only",
  "sun-cloud": "Sun + cloud",
  "all-but-rain": "Anything but rain",
  any: "Any",
};

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

  let state: DialState = resolveInitialDialState(opts.initial);

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
    const isDefault = dialStateEquals(state, DEFAULT_DIAL_STATE);
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
      isDefault: dialStateEquals(state, DEFAULT_DIAL_STATE),
    };
    emitter.dispatchEvent(new CustomEvent<DialChangeDetail>("cwthresholds:change", { detail }));
  }

  function commit(next: Partial<DialState>): void {
    state = {
      ...state,
      ...next,
    };
    writeDialStorage(state);
    writeDialUrl(state);
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
