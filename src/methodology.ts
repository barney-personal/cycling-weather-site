// Methodology page entry — bundles the design system + theme toggle.
// No data fetch; the page is fully static prose.

import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/base.css";
import "./style.css";

import { mountThemeToggle } from "./components/theme-toggle";

mountThemeToggle("#theme-toggle");
