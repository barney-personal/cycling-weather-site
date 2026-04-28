// Destination depth page entry. Reads `?slug=…` from the URL, mounts the
// shared header, fetches `data.json`, then renders the page via
// `mountDestinationPage`. Polar chart is lazy-imported inside that component.

import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/base.css";
import "./style.css";

import { mountDestinationPage } from "./components/destination-page";
import { mountFooterFreshness } from "./components/footer-freshness";
import { mountHeader } from "./components/header";
import { registerServiceWorker } from "./components/register-sw";
import { loadSiteData } from "./lib/data";

mountHeader({ mount: "#site-header", active: "forward" });
registerServiceWorker();

const params = new URLSearchParams(window.location.search);
const slug = (params.get("slug") ?? "").toLowerCase();

const mount = document.getElementById("dest-mount");
if (mount) {
  mount.dataset.slug = slug;
  void loadSiteData()
    .then((data) => {
      mountDestinationPage({ mount, data, slug });
      mountFooterFreshness("#footer-freshness", data);
      const result = data.latest?.results.find((r) => r.slug === slug);
      if (result) {
        document.title = `${result.name} · Cycling Weather`;
      }
    })
    .catch((err: unknown) => {
      console.warn("destination: data.json fetch failed", err);
      const footer = document.getElementById("footer-freshness");
      if (footer) footer.textContent = "data.json offline — try again when reconnected.";
      mount.innerHTML = `
        <section class="hero hero-page-header" aria-label="Offline">
          <p class="hero-eyebrow">Offline</p>
          <h1 class="hero-destination"><span class="hero-destination-link">Couldn't reach the daily refresh</span></h1>
          <p class="hero-editorial">The site shell loaded from cache, but data.json couldn't be fetched. Reconnect and reload to see this destination's outlook.</p>
        </section>
      `;
    });
}
