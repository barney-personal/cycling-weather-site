import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/base.css";
import "./style.css";

import { mountFooterFreshness } from "./components/footer-freshness";
import { mountHeader } from "./components/header";
import { mountHero } from "./components/hero";
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

    const ranking = mountRanking({
      cardsMount: "#rank-cards",
      tableMount: "#rank-body",
      filtersMount: "#filters",
      liveRegionMount: "#rank-summary",
      results: latest.results,
    });

    mountThresholdDial({
      trigger: "#threshold-trigger",
    });

    window.addEventListener("cwthresholds:change", (ev) => {
      const detail = (ev as CustomEvent<DialChangeDetail>).detail;
      ranking.setThresholds(detail.thresholds);
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
            mountWorldMap({ mount: mapMount, results: latest.results });
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
    if (heroMount && !heroMount.firstChild) {
      heroMount.innerHTML = `
        <section class="hero hero-page-header" aria-label="Offline">
          <p class="hero-eyebrow">Offline</p>
          <h1 class="hero-destination"><span class="hero-destination-link">Couldn't reach the daily refresh</span></h1>
          <p class="hero-editorial">The site shell loaded from cache, but data.json couldn't be fetched. Reconnect and reload to see today's ranking.</p>
        </section>
      `;
    }
  });
