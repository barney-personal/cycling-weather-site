import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/base.css";
import "./style.css";

import { mountFooterFreshness } from "./components/footer-freshness";
import { mountHeader } from "./components/header";
import { mountHero } from "./components/hero";
import { mountRanking } from "./components/ranking";
import { type DialChangeDetail, mountThresholdDial } from "./components/threshold-dial";
import { loadSiteData } from "./lib/data";

mountHeader({ mount: "#site-header", active: "forward" });

void loadSiteData().then((data) => {
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
});
