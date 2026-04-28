import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/base.css";
import "./style.css";

import { mountFooterFreshness } from "./components/footer-freshness";
import { mountHeader } from "./components/header";
import { mountHero } from "./components/hero";
import { mountRanking } from "./components/ranking";
import { registerServiceWorker } from "./components/register-sw";
import { type DialChangeDetail, mountThresholdDial } from "./components/threshold-dial";
import { loadSiteData } from "./lib/data";

mountHeader({ mount: "#site-header", active: "forward" });
registerServiceWorker();

void loadSiteData()
  .then((data) => {
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
