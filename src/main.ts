import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/base.css";
import "./style.css";

import { mountFooterFreshness } from "./components/footer-freshness";
import { mountHeader } from "./components/header";
import { mountHero } from "./components/hero";
import { mountProfilePicker } from "./components/profile-picker";
import { mountRanking } from "./components/ranking";
import { registerServiceWorker } from "./components/register-sw";
import { mountStaleBanner } from "./components/stale-banner";
import { type DialChangeDetail, mountThresholdDial } from "./components/threshold-dial";
import { loadSiteData } from "./lib/data";

// `?stale=1` is a debug switch used by the visual snapshot suite — it forces
// the stale banner to render even when the data is fresh, so the screenshot
// is deterministic regardless of when it runs. Read once at module scope.
const FORCE_STALE = (() => {
  try {
    return new URLSearchParams(window.location.search).get("stale") === "1";
  } catch {
    return false;
  }
})();

type ViewMode = "table" | "calendar";

function readViewFromURL(): ViewMode {
  try {
    return new URLSearchParams(window.location.search).get("view") === "calendar"
      ? "calendar"
      : "table";
  } catch {
    return "table";
  }
}

mountHeader({ mount: "#site-header", active: "forward" });
registerServiceWorker();

void loadSiteData()
  .then((data) => {
    mountStaleBanner({
      mount: "#stale-banner-mount",
      generatedAt: data.generated_at,
      force: FORCE_STALE,
    });
    mountHero({ mount: "#hero-mount", data });
    mountFooterFreshness("#footer-freshness", data);

    const latest = data.latest;
    if (!latest || latest.results.length === 0) return;
    const results = latest.results;

    const ranking = mountRanking({
      cardsMount: "#rank-cards",
      tableMount: "#rank-body",
      filtersMount: "#filters",
      liveRegionMount: "#rank-summary",
      results,
    });

    mountThresholdDial({
      trigger: "#threshold-trigger",
    });

    mountProfilePicker();

    // ----- View toggle (table ↔ calendar) -------------------------------
    // Calendar view is lazy-loaded — bytes only download when the user
    // clicks the toggle (or the page loads with `?view=calendar`).
    const tableRegion = document.getElementById("rank-list-region");
    const calendarMount = document.getElementById("calendar-mount");
    const tableBtn = document.getElementById("view-toggle-table");
    const calendarBtn = document.getElementById("view-toggle-calendar");

    let calendarHandle: {
      setThresholds(t: import("./lib/qualify").Thresholds): void;
      destroy(): void;
    } | null = null;
    let calendarLoading: Promise<void> | null = null;
    let currentThresholds: import("./lib/qualify").Thresholds | null = null;
    let currentView: ViewMode = readViewFromURL();

    function syncToggleAria(view: ViewMode): void {
      if (tableBtn) {
        tableBtn.setAttribute("aria-selected", view === "table" ? "true" : "false");
        tableBtn.classList.toggle("is-active", view === "table");
      }
      if (calendarBtn) {
        calendarBtn.setAttribute("aria-selected", view === "calendar" ? "true" : "false");
        calendarBtn.classList.toggle("is-active", view === "calendar");
      }
    }

    function loadCalendarChunk(): Promise<void> {
      if (calendarHandle || calendarLoading) return calendarLoading ?? Promise.resolve();
      calendarLoading = import("./components/calendar")
        .then(({ mountCalendar }) => {
          if (!calendarMount) return;
          calendarHandle = mountCalendar({ mount: calendarMount, results });
          if (currentThresholds) calendarHandle.setThresholds(currentThresholds);
        })
        .catch((err) => {
          console.warn("calendar: import failed", err);
          if (calendarMount) {
            calendarMount.innerHTML = `<p class="cal-empty-msg">Calendar view unavailable. <button type="button" class="cal-empty-fallback" data-view="table">Switch back to table</button>.</p>`;
          }
        })
        .finally(() => {
          calendarLoading = null;
        });
      return calendarLoading;
    }

    function applyView(view: ViewMode, opts: { pushUrl?: boolean } = {}): void {
      currentView = view;
      if (tableRegion) tableRegion.hidden = view !== "table";
      if (calendarMount) calendarMount.hidden = view !== "calendar";
      syncToggleAria(view);
      if (opts.pushUrl) {
        try {
          const url = new URL(window.location.href);
          if (view === "calendar") url.searchParams.set("view", "calendar");
          else url.searchParams.delete("view");
          window.history.replaceState({}, "", url.toString());
        } catch {
          // ignore — URL state is best-effort
        }
      }
      if (view === "calendar") void loadCalendarChunk();
    }

    if (tableBtn) {
      tableBtn.addEventListener("click", () => applyView("table", { pushUrl: true }));
    }
    if (calendarBtn) {
      calendarBtn.addEventListener("click", () => applyView("calendar", { pushUrl: true }));
    }
    if (calendarMount) {
      calendarMount.addEventListener("click", (ev) => {
        const target = ev.target as HTMLElement | null;
        const fallback = target?.closest<HTMLElement>("[data-view='table']");
        if (fallback) applyView("table", { pushUrl: true });
      });
    }

    applyView(currentView, { pushUrl: false });

    window.addEventListener("cwthresholds:change", (ev) => {
      const detail = (ev as CustomEvent<DialChangeDetail>).detail;
      currentThresholds = detail.thresholds;
      ranking.setThresholds(detail.thresholds);
      if (calendarHandle) calendarHandle.setThresholds(detail.thresholds);
    });

    // World map — lazy-loaded after the mount intersects the viewport so
    // d3-geo, topojson-client, and the land-110m topology never count
    // against the homepage's initial-paint bundle. Falls back to an
    // immediate import if IntersectionObserver isn't available.
    const mapMount = document.getElementById("world-map-mount");
    if (mapMount) {
      const loadMap = (): void => {
        void import("./components/world-map")
          .then(({ mountWorldMap }) => {
            mountWorldMap({ mount: mapMount, results });
            mapMount.removeAttribute("aria-busy");
          })
          .catch((err) => {
            console.warn("world-map: import failed", err);
            mapMount.innerHTML = '<p class="world-map-empty">Map unavailable offline.</p>';
            mapMount.removeAttribute("aria-busy");
          });
      };
      if (typeof IntersectionObserver === "undefined") {
        loadMap();
      } else {
        const io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                io.disconnect();
                loadMap();
                break;
              }
            }
          },
          { rootMargin: "200px 0px" },
        );
        io.observe(mapMount);
      }
    }
  })
  .catch((err: unknown) => {
    console.warn("homepage: data.json fetch failed", err);
    const footer = document.getElementById("footer-freshness");
    if (footer) footer.textContent = "data.json offline — try again when reconnected.";
    const heroMount = document.getElementById("hero-mount");
    if (heroMount) {
      heroMount.dataset.loaded = "1";
      heroMount.innerHTML = `
        <section class="hero hero-page-header" aria-label="Offline">
          <p class="hero-eyebrow">Offline</p>
          <h1 class="hero-destination"><span class="hero-destination-link">Couldn't reach the daily refresh</span></h1>
          <p class="hero-editorial">The site shell loaded from cache, but data.json couldn't be fetched. Reconnect and reload to see today's ranking.</p>
        </section>
      `;
    }
  });
