// Methodology page entry — bundles the design system + site header.
// No data fetch; the page is fully static prose.

import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/base.css";
import "./style.css";

import { mountHeader } from "./components/header";

mountHeader({ mount: "#site-header", active: "methodology" });
