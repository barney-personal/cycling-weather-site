// Methodology page entry — bundles the design system, mounts the site
// header, and surfaces the data-freshness footer line so the prose page
// also has a heartbeat tied to the daily cron.

import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/base.css";
import "./style.css";

import { mountFooterFreshness } from "./components/footer-freshness";
import { mountHeader } from "./components/header";
import { loadSiteData } from "./lib/data";

mountHeader({ mount: "#site-header", active: "methodology" });

void loadSiteData()
  .then((data) => {
    mountFooterFreshness("#footer-freshness", data);
  })
  .catch(() => {
    const el = document.getElementById("footer-freshness");
    if (el) el.textContent = "Data freshness unavailable.";
  });
