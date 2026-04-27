// Destination depth page entry. Reads `?slug=…` from the URL, mounts the
// shared header, fetches `data.json`, then renders the page via
// `mountDestinationPage`. Polar chart is lazy-imported inside that component.

import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/base.css";
import "./style.css";

import { mountDestinationPage } from "./components/destination-page";
import { mountHeader } from "./components/header";
import { loadSiteData } from "./lib/data";

mountHeader({ mount: "#site-header", active: "forward" });

const params = new URLSearchParams(window.location.search);
const slug = (params.get("slug") ?? "").toLowerCase();

const mount = document.getElementById("dest-mount");
if (mount) {
  mount.dataset.slug = slug;
  void loadSiteData().then((data) => {
    mountDestinationPage({ mount, data, slug });
    const result = data.latest?.results.find((r) => r.slug === slug);
    if (result) {
      document.title = `${result.name} · Cycling Weather`;
    }
  });
}
