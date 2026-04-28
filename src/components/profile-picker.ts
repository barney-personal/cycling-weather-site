// Profile picker (M6).
//
// A 5-question modal that maps plain-language answers to a DialState, then
// dispatches `cwprofile:apply` so the threshold dial (and any other listener)
// can re-emit `cwthresholds:change` through its existing commit pipeline.
//
// The picker has no first-class UI on the page — it opens in response to a
// `cwprofile:open` window event dispatched by the threshold dial's CTA row.
// This keeps the entry point contextual ("you're already in the dial; here's
// a faster way") without forcing the homepage chrome to surface a new
// top-level button. State is persisted to localStorage under `cw:profile:v1`.

import {
  DEFAULT_PROFILE,
  PROFILE_QUESTIONS,
  type Profile,
  type ProfileQuestion,
  clearProfileStorage,
  defaultDialState,
  profileToDialState,
  readProfileStorage,
  writeProfileStorage,
} from "../lib/profile";
import type { DialState } from "../lib/thresholds";

export interface ProfileApplyDetail {
  state: DialState;
  /** null when the user clicked "Reset" — caller should clear profile state. */
  profile: Profile | null;
}

export interface MountProfilePickerOptions {
  /** Container that receives the modal markup. Defaults to body. */
  surface?: string | HTMLElement;
  /** Element on which to dispatch `cwprofile:apply`. Defaults to window. */
  emitter?: EventTarget;
  /** Element on which to listen for `cwprofile:open`. Defaults to window. */
  opener?: EventTarget;
}

export interface ProfilePickerHandle {
  open(initial?: Partial<Profile>): void;
  close(): void;
  destroy(): void;
}

function el<T extends HTMLElement>(html: string): T {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  const node = tpl.content.firstElementChild;
  if (!node) throw new Error("profile-picker: empty template");
  return node as T;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderQuestion(q: ProfileQuestion, current: Profile): string {
  const safeKey = escapeHtml(q.key);
  const optionsHtml = q.options
    .map((opt) => {
      const checked =
        (current as unknown as Record<string, unknown>)[q.key] === opt.value ? " checked" : "";
      const detail = opt.detail
        ? `<span class="profile-option-detail">${escapeHtml(opt.detail)}</span>`
        : "";
      return `
        <label class="profile-option">
          <input type="radio" name="profile-${safeKey}" value="${escapeHtml(String(opt.value))}"${checked}>
          <span class="profile-option-label">${escapeHtml(opt.label)}</span>
          ${detail}
        </label>
      `;
    })
    .join("");
  const hint = q.hint ? `<p class="profile-question-hint">${escapeHtml(q.hint)}</p>` : "";
  return `
    <fieldset class="profile-question" data-key="${safeKey}">
      <legend class="profile-question-legend">${escapeHtml(q.question)}</legend>
      ${hint}
      <div class="profile-options">${optionsHtml}</div>
    </fieldset>
  `;
}

function renderHtml(current: Profile): string {
  return `
<aside class="profile-picker" role="dialog" aria-modal="false" aria-labelledby="profile-picker-title" hidden>
  <div class="profile-picker-backdrop" data-dismiss="1"></div>
  <div class="profile-picker-panel">
    <header class="profile-picker-header">
      <h2 id="profile-picker-title" class="profile-picker-title">Calibrate your ride profile</h2>
      <button type="button" class="profile-picker-close" aria-label="Close profile picker">×</button>
    </header>
    <p class="profile-picker-help">Answer five quick questions; we'll set the threshold dial for you.</p>
    <form class="profile-picker-form" novalidate>
      ${PROFILE_QUESTIONS.map((q) => renderQuestion(q, current)).join("")}
      <p class="profile-picker-status visually-hidden" role="status" aria-live="polite"></p>
      <footer class="profile-picker-footer">
        <button type="button" class="profile-picker-reset" data-action="reset">Reset to defaults</button>
        <button type="submit" class="profile-picker-apply" data-action="apply">Apply profile</button>
      </footer>
    </form>
  </div>
</aside>
  `;
}

export function mountProfilePicker(opts: MountProfilePickerOptions = {}): ProfilePickerHandle {
  const surfaceCandidate =
    typeof opts.surface === "string"
      ? document.querySelector<HTMLElement>(opts.surface)
      : (opts.surface ?? document.body);
  if (!surfaceCandidate) throw new Error("mountProfilePicker: surface not found");
  const surface: HTMLElement = surfaceCandidate;

  const emitter: EventTarget = opts.emitter ?? window;
  const opener: EventTarget = opts.opener ?? window;

  let profile: Profile = readProfileStorage() ?? { ...DEFAULT_PROFILE };

  const root = el<HTMLElement>(renderHtml(profile));
  surface.appendChild(root);

  const form = root.querySelector<HTMLFormElement>(".profile-picker-form")!;
  const status = root.querySelector<HTMLElement>(".profile-picker-status")!;

  function reflectInputs(): void {
    const radios = root.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    for (const r of radios) {
      const key = r.name.replace(/^profile-/, "") as keyof Profile;
      r.checked = String((profile as unknown as Record<string, unknown>)[key]) === r.value;
    }
  }

  function readForm(): Profile {
    const fd = new FormData(form);
    return {
      heatPref: (fd.get("profile-heatPref") as Profile["heatPref"]) ?? profile.heatPref,
      rainTolerance:
        (fd.get("profile-rainTolerance") as Profile["rainTolerance"]) ?? profile.rainTolerance,
      windTolerance:
        (fd.get("profile-windTolerance") as Profile["windTolerance"]) ?? profile.windTolerance,
      sunPref: (fd.get("profile-sunPref") as Profile["sunPref"]) ?? profile.sunPref,
      stringency: (fd.get("profile-stringency") as Profile["stringency"]) ?? profile.stringency,
    };
  }

  function announce(msg: string): void {
    status.textContent = "";
    // Force re-announcement even if message text repeats by toggling content
    // in two ticks; aria-live only fires when textContent changes.
    queueMicrotask(() => {
      status.textContent = msg;
    });
  }

  function emitApply(detail: ProfileApplyDetail): void {
    emitter.dispatchEvent(new CustomEvent<ProfileApplyDetail>("cwprofile:apply", { detail }));
  }

  function open(initial?: Partial<Profile>): void {
    if (initial) profile = { ...profile, ...initial };
    else profile = readProfileStorage() ?? { ...DEFAULT_PROFILE };
    reflectInputs();
    root.hidden = false;
    root.classList.add("is-open");
    document.documentElement.classList.add("profile-picker-open");
    queueMicrotask(() => {
      root.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
    });
  }

  function close(): void {
    root.hidden = true;
    root.classList.remove("is-open");
    document.documentElement.classList.remove("profile-picker-open");
  }

  function onSubmit(ev: Event): void {
    ev.preventDefault();
    const next = readForm();
    profile = next;
    writeProfileStorage(profile);
    const state = profileToDialState(profile);
    emitApply({ state, profile });
    announce("Profile applied — thresholds updated.");
    close();
  }

  function onReset(): void {
    profile = { ...DEFAULT_PROFILE };
    clearProfileStorage();
    reflectInputs();
    emitApply({ state: defaultDialState(), profile: null });
    announce("Profile reset to defaults.");
    close();
  }

  form.addEventListener("submit", onSubmit);

  function onRootClick(ev: Event): void {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    if (target.dataset.dismiss === "1") close();
    if (target.classList.contains("profile-picker-close")) close();
    if (target.dataset.action === "reset") onReset();
  }
  root.addEventListener("click", onRootClick);

  function onKey(ev: KeyboardEvent): void {
    if (ev.key === "Escape" && !root.hidden) {
      ev.stopPropagation();
      close();
    }
  }
  document.addEventListener("keydown", onKey);

  function onOpen(ev: Event): void {
    const detail = (ev as CustomEvent<Partial<Profile> | undefined>).detail;
    open(detail ?? undefined);
  }
  opener.addEventListener("cwprofile:open", onOpen as EventListener);

  return {
    open,
    close,
    destroy(): void {
      form.removeEventListener("submit", onSubmit);
      root.removeEventListener("click", onRootClick);
      document.removeEventListener("keydown", onKey);
      opener.removeEventListener("cwprofile:open", onOpen as EventListener);
      root.remove();
    },
  };
}
