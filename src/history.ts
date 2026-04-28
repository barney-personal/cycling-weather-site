import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/base.css";
import "./style.css";

import { extent, mean } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { format } from "d3-format";
import { scaleBand, scaleLinear, scaleSequential } from "d3-scale";
import { interpolateInferno, interpolateRdYlBu } from "d3-scale-chromatic";
import { select } from "d3-selection";
import { line } from "d3-shape";

import { mountFooterFreshness } from "./components/footer-freshness";
import { mountHeader } from "./components/header";
import { loadSiteData } from "./lib/data";
import type { ActualsTimelineRow, CalibrationRow, SiteData } from "./lib/types";

mountHeader({ mount: "#site-header", active: "history" });

const tt = select<HTMLDivElement, unknown>("#tt");

function showTip(html: string, ev: MouseEvent): void {
  tt.html(html)
    .style("opacity", 1)
    .style("left", `${ev.pageX + 12}px`)
    .style("top", `${ev.pageY + 12}px`);
}

function hideTip(): void {
  tt.style("opacity", 0);
}

function clearMount(id: string): HTMLElement | null {
  const el = document.getElementById(id);
  if (el) el.innerHTML = "";
  return el;
}

function emptyState(mountId: string, title: string, msg: string): void {
  const el = clearMount(mountId);
  if (!el) return;
  el.innerHTML = `
    <div class="chart-empty" role="status">
      <p class="chart-empty-title">${title}</p>
      <p class="chart-empty-msg">${msg}</p>
    </div>
  `;
}

void loadSiteData()
  .then((data) => {
    renderHero(data);
    renderCards(data);
    renderCalibration(data);
    renderHitRate(data);
    renderTempErrorTrend(data);
    renderDestAccuracy(data);
    renderActualsHeatmap(data);
    mountFooterFreshness("#footer-freshness", data);
  })
  .catch((err: unknown) => {
    console.error("history: failed to load data.json", err);
    const heroMeta = document.getElementById("hero-meta");
    if (heroMeta) {
      heroMeta.textContent = "Couldn't load data.json — try refreshing.";
    }
    emptyState(
      "scatter",
      "Data unavailable",
      "data.json couldn't be loaded. Refresh the page or check back later.",
    );
    emptyState(
      "leadbar",
      "Data unavailable",
      "Hit-rate buckets need a successful data.json fetch.",
    );
    emptyState(
      "errtrend",
      "Data unavailable",
      "Mean temp error trend needs a successful data.json fetch.",
    );
    emptyState(
      "dest-acc",
      "Data unavailable",
      "Per-destination accuracy needs a successful data.json fetch.",
    );
    emptyState(
      "actuals-heatmap",
      "Data unavailable",
      "Actuals heatmap needs a successful data.json fetch.",
    );
    document.getElementById("cards")?.setAttribute("aria-busy", "false");
  });

// ---------------------------------------------------------------------------
// Hero meta — counts + freshness summary
// ---------------------------------------------------------------------------
function renderHero(data: SiteData): void {
  const heroMeta = document.getElementById("hero-meta");
  if (!heroMeta) return;
  heroMeta.textContent = `${data.forecasts_count} forecast snapshot${data.forecasts_count === 1 ? "" : "s"} · ${data.actuals_count} day${data.actuals_count === 1 ? "" : "s"} of actuals · ${data.calibration.length} matched location-day${data.calibration.length === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------
// At-a-glance summary cards
// ---------------------------------------------------------------------------
function renderCards(data: SiteData): void {
  const cards = document.getElementById("cards");
  if (!cards) return;
  cards.innerHTML = "";
  cards.setAttribute("aria-busy", "false");

  const calib = data.calibration;
  const append = (title: string, stat: string, sub: string): void => {
    const c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `<h3>${title}</h3><div class="stat">${stat}</div><div class="sub">${sub}</div>`;
    cards.appendChild(c);
  };

  if (calib.length) {
    const correct = calib.filter((r) => r.predicted_qualify === r.actual_qualify).length;
    const tempErr =
      mean(calib, (r) => Math.abs((r.predicted_temp ?? 0) - (r.actual_temp ?? 0))) ?? 0;
    const goPred = calib.filter((r) => r.predicted_qualify);
    const hitGo = goPred.filter((r) => r.actual_qualify).length;
    append(
      "Correct verdict",
      `${((100 * correct) / calib.length).toFixed(0)}%`,
      `${correct} / ${calib.length} location-days`,
    );
    append("Mean temp error", `${tempErr.toFixed(1)}°C`, "absolute, all lead times");
    append(
      "'Go' calls hit",
      goPred.length ? `${((100 * hitGo) / goPred.length).toFixed(0)}%` : "—",
      `${hitGo} / ${goPred.length} predicted-clean days`,
    );
  } else {
    append("Correct verdict", "—", "still ripening · need ≥14d of forecast maturation");
    append("Mean temp error", "—", "still ripening");
    append("'Go' calls hit", "—", "still ripening");
  }
  append("Actuals coverage", String(data.actuals_count), "days seeded from archive");
}

// ---------------------------------------------------------------------------
// Calibration reliability — scatter + ±1σ residual band on the identity line
// ---------------------------------------------------------------------------
function renderCalibration(data: SiteData): void {
  const calib = data.calibration;
  const calibStatus = document.getElementById("calib-status");
  const sr = document.getElementById("calib-sr");

  if (!calib.length) {
    if (calibStatus) {
      calibStatus.textContent =
        "Still ripening — calibration begins after 14 days of forecast maturation. We're seeded with actuals; predictions need to age before they can be graded.";
    }
    if (sr) {
      sr.textContent =
        "Calibration view is empty — no matured forecasts yet. Check back as the daily cron accumulates 14 day-old predictions.";
    }
    emptyState(
      "scatter",
      "Still ripening",
      "Calibration begins after 14 days of forecast maturation. The pipeline is seeded with actuals; predictions need to age before we can grade them.",
    );
    return;
  }

  if (calibStatus) calibStatus.style.display = "none";
  const mount = clearMount("scatter");
  if (!mount) return;

  const W = 720;
  const H = 420;
  const M = { t: 24, r: 24, b: 44, l: 56 };
  const svg = select(mount)
    .append("svg")
    .attr("class", "scatter-svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("width", "100%")
    .attr("height", H)
    .attr("role", "img")
    .attr("aria-labelledby", "calib-title")
    .attr("aria-describedby", "calib-sr");

  const pts = calib.filter(
    (r): r is CalibrationRow & { predicted_temp: number; actual_temp: number } =>
      r.predicted_temp != null && r.actual_temp != null,
  );

  if (!pts.length) {
    emptyState(
      "scatter",
      "No matched values yet",
      "Forecasts have started maturing but none have both a predicted and actual daily high to compare yet.",
    );
    return;
  }

  const flat = pts.flatMap((r) => [r.predicted_temp, r.actual_temp]);
  const ext = extent(flat);
  const lo = ext[0] ?? 0;
  const hi = ext[1] ?? 1;

  const x = scaleLinear()
    .domain([lo, hi])
    .nice()
    .range([M.l, W - M.r]);
  const y = scaleLinear()
    .domain([lo, hi])
    .nice()
    .range([H - M.b, M.t]);

  // Residual sigma — the width of the ±1σ band parallel to the identity line.
  const residuals = pts.map((p) => p.actual_temp - p.predicted_temp);
  const meanR = mean(residuals) ?? 0;
  const sigma = Math.sqrt(
    residuals.reduce((acc, r) => acc + (r - meanR) * (r - meanR), 0) /
      Math.max(1, residuals.length - 1),
  );

  // Confidence band: y = x + (mean ± sigma). Drawn as a polygon over the
  // chart area, clipped visually by the axis box.
  const [xDomLo = 0, xDomHi = 1] = x.domain();
  const upperPath = `M ${x(xDomLo)},${y(xDomLo + meanR + sigma)} L ${x(xDomHi)},${y(xDomHi + meanR + sigma)} L ${x(xDomHi)},${y(xDomHi + meanR - sigma)} L ${x(xDomLo)},${y(xDomLo + meanR - sigma)} Z`;
  svg
    .append("path")
    .attr("class", "calib-band")
    .attr("d", upperPath)
    .attr("fill", "var(--accent-soft)")
    .attr("stroke", "none")
    .attr("opacity", 0.55);

  // Axes
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(axisBottom(x).ticks(6));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${M.l},0)`)
    .call(axisLeft(y).ticks(6));

  // Identity line (perfect-forecast reference)
  const xLo = xDomLo;
  const xHi = xDomHi;
  svg
    .append("line")
    .attr("class", "calib-identity")
    .attr("x1", x(xLo))
    .attr("x2", x(xHi))
    .attr("y1", y(xLo))
    .attr("y2", y(xHi))
    .attr("stroke", "var(--border-strong)")
    .attr("stroke-dasharray", "3 4");

  // Points coloured by lead time
  const colorByLead = scaleSequential(interpolateInferno).domain([0, 14]);
  svg
    .append("g")
    .selectAll("circle")
    .data(pts)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.predicted_temp))
    .attr("cy", (d) => y(d.actual_temp))
    .attr("r", 3.5)
    .attr("fill", (d) => colorByLead(d.lead_days))
    .attr("opacity", 0.78)
    .attr("stroke", "var(--surface-elevated)")
    .attr("stroke-width", 0.5)
    .on("mousemove", (ev: MouseEvent, d) =>
      showTip(
        `${d.name} · ${d.target_date}<br>predicted ${d.predicted_temp.toFixed(1)}°C · actual ${d.actual_temp.toFixed(1)}°C<br>lead ${d.lead_days}d`,
        ev,
      ),
    )
    .on("mouseleave", hideTip);

  // Axis titles
  svg
    .append("text")
    .attr("x", (M.l + W - M.r) / 2)
    .attr("y", H - 8)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-3)")
    .attr("font-family", "var(--font-mono)")
    .attr("font-size", 11)
    .text("Predicted high (°C)");
  svg
    .append("text")
    .attr("transform", `translate(16,${(H - M.b + M.t) / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-3)")
    .attr("font-family", "var(--font-mono)")
    .attr("font-size", 11)
    .text("Actual high (°C)");

  // Legend strip — band + identity
  const legend = svg.append("g").attr("transform", `translate(${M.l + 8},${M.t + 8})`);
  legend
    .append("rect")
    .attr("x", 0)
    .attr("y", -7)
    .attr("width", 16)
    .attr("height", 12)
    .attr("fill", "var(--accent-soft)")
    .attr("opacity", 0.55);
  legend
    .append("text")
    .attr("x", 22)
    .attr("y", 3)
    .attr("font-family", "var(--font-mono)")
    .attr("font-size", 10)
    .attr("fill", "var(--text-3)")
    .text(`±1σ band (${sigma.toFixed(1)}°C)`);

  if (sr) {
    const sub1 = pts.filter((p) => p.lead_days <= 3);
    const sub47 = pts.filter((p) => p.lead_days >= 4 && p.lead_days <= 7);
    sr.textContent = `Calibration scatter of ${pts.length} predicted-vs-actual daily highs. Mean residual ${meanR >= 0 ? "+" : ""}${meanR.toFixed(1)}°C, ±1σ ${sigma.toFixed(1)}°C. ${sub1.length} short-lead samples (1–3 day), ${sub47.length} mid-lead (4–7 day).`;
  }
}

// ---------------------------------------------------------------------------
// Hit rate by lead time — bars + sample-size labels
// ---------------------------------------------------------------------------
function renderHitRate(data: SiteData): void {
  const calib = data.calibration;
  const sr = document.getElementById("hit-sr");

  const buckets = [
    { label: "1–3d", min: 1, max: 3 },
    { label: "4–7d", min: 4, max: 7 },
    { label: "8–14d", min: 8, max: 14 },
  ];
  const stats = buckets.map((b) => {
    const sub = calib.filter((r) => r.lead_days >= b.min && r.lead_days <= b.max);
    const goPred = sub.filter((r) => r.predicted_qualify);
    const hits = goPred.filter((r) => r.actual_qualify).length;
    return {
      ...b,
      n: sub.length,
      predicted_go: goPred.length,
      hits,
      rate: goPred.length ? hits / goPred.length : null,
    };
  });

  const totalGo = stats.reduce((acc, s) => acc + s.predicted_go, 0);
  if (!totalGo) {
    emptyState(
      "leadbar",
      "Still ripening",
      "We need at least one matured 'go' prediction before we can compute a hit rate. The site emits no go-calls today, so this view is intentionally empty.",
    );
    if (sr) sr.textContent = "Hit-rate buckets are empty — no matured go-predictions yet.";
    return;
  }

  const mount = clearMount("leadbar");
  if (!mount) return;

  const W = 720;
  const H = 240;
  const M = { t: 24, r: 24, b: 56, l: 64 };
  const svg = select(mount)
    .append("svg")
    .attr("class", "scatter-svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("width", "100%")
    .attr("height", H)
    .attr("role", "img")
    .attr("aria-labelledby", "hit-title")
    .attr("aria-describedby", "hit-sr");

  const x = scaleBand()
    .domain(stats.map((s) => s.label))
    .range([M.l, W - M.r])
    .padding(0.3);
  const y = scaleLinear()
    .domain([0, 1])
    .range([H - M.b, M.t]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(axisBottom(x));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${M.l},0)`)
    .call(axisLeft(y).ticks(5).tickFormat(format(".0%")));

  // Bars
  svg
    .selectAll("rect.bar")
    .data(stats)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.label) ?? 0)
    .attr("width", x.bandwidth())
    .attr("y", (d) => (d.rate == null ? H - M.b : y(d.rate)))
    .attr("height", (d) => (d.rate == null ? 0 : H - M.b - y(d.rate)))
    .attr("fill", "var(--accent)")
    .attr("opacity", 0.85)
    .attr("rx", 4)
    .on("mousemove", (ev: MouseEvent, d) =>
      showTip(
        `${d.label}<br>predicted-go: ${d.predicted_go}<br>hits: ${d.hits}<br>rate: ${d.rate == null ? "—" : `${(100 * d.rate).toFixed(0)}%`}`,
        ev,
      ),
    )
    .on("mouseleave", hideTip);

  // Rate labels above bars
  svg
    .selectAll("text.lbl")
    .data(stats)
    .enter()
    .append("text")
    .attr("class", "lbl")
    .attr("x", (d) => (x(d.label) ?? 0) + x.bandwidth() / 2)
    .attr("y", (d) => (d.rate == null ? H - M.b - 6 : y(d.rate) - 6))
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text)")
    .attr("font-family", "var(--font-mono)")
    .attr("font-size", 11)
    .text((d) => (d.rate == null ? "no go-calls" : `${(100 * d.rate).toFixed(0)}%`));

  // Sample-size labels under each x category
  svg
    .selectAll("text.n")
    .data(stats)
    .enter()
    .append("text")
    .attr("class", "n")
    .attr("x", (d) => (x(d.label) ?? 0) + x.bandwidth() / 2)
    .attr("y", H - M.b + 32)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-3)")
    .attr("font-family", "var(--font-mono)")
    .attr("font-size", 10)
    .text((d) => `n=${d.predicted_go} of ${d.n}`);

  if (sr) {
    sr.textContent = `Hit-rate by lead time: ${stats
      .map(
        (s) =>
          `${s.label} ${s.rate == null ? "no go-calls" : `${(100 * s.rate).toFixed(0)}% (${s.hits} of ${s.predicted_go} predicted-go)`}`,
      )
      .join("; ")}.`;
  }
}

// ---------------------------------------------------------------------------
// Mean temp error by lead time — line + dots, with sample-size annotation
// ---------------------------------------------------------------------------
function renderTempErrorTrend(data: SiteData): void {
  const calib = data.calibration;
  const sr = document.getElementById("err-sr");

  const matured = calib.filter(
    (r): r is CalibrationRow & { predicted_temp: number; actual_temp: number } =>
      r.predicted_temp != null && r.actual_temp != null,
  );

  if (!matured.length) {
    emptyState(
      "errtrend",
      "Still ripening",
      "Mean temp error needs at least one (predicted, actual) pair to plot. None matured yet.",
    );
    if (sr) {
      sr.textContent = "Mean temp error chart is empty — no matured predictions to score yet.";
    }
    return;
  }

  // Bucket per lead day
  const byLead = new Map<number, number[]>();
  matured.forEach((r) => {
    const arr = byLead.get(r.lead_days) ?? [];
    arr.push(Math.abs(r.predicted_temp - r.actual_temp));
    byLead.set(r.lead_days, arr);
  });
  const series = Array.from(byLead.entries())
    .map(([lead, errs]) => ({
      lead,
      err: mean(errs) ?? 0,
      n: errs.length,
    }))
    .sort((a, b) => a.lead - b.lead);

  const mount = clearMount("errtrend");
  if (!mount) return;

  const W = 720;
  const H = 240;
  const M = { t: 24, r: 24, b: 44, l: 56 };
  const svg = select(mount)
    .append("svg")
    .attr("class", "scatter-svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("width", "100%")
    .attr("height", H)
    .attr("role", "img")
    .attr("aria-labelledby", "err-title")
    .attr("aria-describedby", "err-sr");

  const x = scaleLinear()
    .domain([1, 14])
    .range([M.l, W - M.r]);
  const yMax = Math.max(2, Math.ceil(Math.max(...series.map((s) => s.err)) + 0.5));
  const y = scaleLinear()
    .domain([0, yMax])
    .range([H - M.b, M.t]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(
      axisBottom(x)
        .ticks(7)
        .tickFormat((d) => `${d}d`),
    );
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${M.l},0)`)
    .call(
      axisLeft(y)
        .ticks(5)
        .tickFormat((d) => `${d}°C`),
    );

  const lineGen = line<{ lead: number; err: number }>()
    .x((d) => x(d.lead))
    .y((d) => y(d.err));

  svg
    .append("path")
    .attr("class", "err-line")
    .attr("d", lineGen(series) ?? "")
    .attr("fill", "none")
    .attr("stroke", "var(--accent)")
    .attr("stroke-width", 2);

  svg
    .append("g")
    .selectAll("circle")
    .data(series)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.lead))
    .attr("cy", (d) => y(d.err))
    .attr("r", 4)
    .attr("fill", "var(--accent)")
    .attr("stroke", "var(--surface-elevated)")
    .attr("stroke-width", 1.5)
    .on("mousemove", (ev: MouseEvent, d) =>
      showTip(`lead ${d.lead}d<br>mean abs error ${d.err.toFixed(2)}°C<br>n=${d.n}`, ev),
    )
    .on("mouseleave", hideTip);

  svg
    .append("text")
    .attr("x", (M.l + W - M.r) / 2)
    .attr("y", H - 8)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-3)")
    .attr("font-family", "var(--font-mono)")
    .attr("font-size", 11)
    .text("Lead time (days)");
  svg
    .append("text")
    .attr("transform", `translate(16,${(H - M.b + M.t) / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-3)")
    .attr("font-family", "var(--font-mono)")
    .attr("font-size", 11)
    .text("Mean abs error");

  if (sr) {
    const overall = mean(series, (s) => s.err) ?? 0;
    sr.textContent = `Mean temp error climbs from ${series[0]?.err.toFixed(1) ?? "?"}°C at lead day ${series[0]?.lead ?? "?"} to ${series[series.length - 1]?.err.toFixed(1) ?? "?"}°C at lead day ${series[series.length - 1]?.lead ?? "?"}. Average across ${series.length} lead-day buckets is ${overall.toFixed(1)}°C.`;
  }
}

// ---------------------------------------------------------------------------
// Per-destination accuracy mini-table
// ---------------------------------------------------------------------------
function renderDestAccuracy(data: SiteData): void {
  const mount = document.getElementById("dest-acc");
  if (!mount) return;
  mount.innerHTML = "";

  const calib = data.calibration;
  if (!calib.length) {
    mount.innerHTML = `
      <div class="chart-empty" role="status">
        <p class="chart-empty-title">Still ripening</p>
        <p class="chart-empty-msg">Per-destination accuracy fills in as forecasts mature against actuals. Today every destination is at 0 / 0.</p>
      </div>
    `;
    return;
  }

  const byDest = new Map<string, CalibrationRow[]>();
  calib.forEach((r) => {
    const arr = byDest.get(r.name) ?? [];
    arr.push(r);
    byDest.set(r.name, arr);
  });

  const rows = Array.from(byDest.entries()).map(([name, rs]) => {
    const correct = rs.filter((r) => r.predicted_qualify === r.actual_qualify).length;
    const errs = rs
      .filter(
        (r): r is CalibrationRow & { predicted_temp: number; actual_temp: number } =>
          r.predicted_temp != null && r.actual_temp != null,
      )
      .map((r) => Math.abs(r.predicted_temp - r.actual_temp));
    const goPred = rs.filter((r) => r.predicted_qualify);
    const hitGo = goPred.filter((r) => r.actual_qualify).length;
    return {
      name,
      total: rs.length,
      correct,
      pctCorrect: correct / rs.length,
      tempErr: mean(errs) ?? null,
      goPred: goPred.length,
      hitGo,
    };
  });
  rows.sort((a, b) => b.pctCorrect - a.pctCorrect);

  const table = document.createElement("table");
  table.className = "acc-table";
  table.innerHTML = `
    <caption class="visually-hidden">Per-destination forecast accuracy</caption>
    <thead>
      <tr>
        <th scope="col">Destination</th>
        <th scope="col">Days</th>
        <th scope="col">Correct verdict</th>
        <th scope="col">Mean temp err</th>
        <th scope="col">Go-call hits</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) => `
            <tr>
              <th scope="row">${r.name}</th>
              <td class="cell-num">${r.total}</td>
              <td class="cell-num">${(r.pctCorrect * 100).toFixed(0)}% <span class="acc-substat">(${r.correct}/${r.total})</span></td>
              <td class="cell-num">${r.tempErr == null ? "—" : `${r.tempErr.toFixed(1)}°C`}</td>
              <td class="cell-num">${r.goPred ? `${r.hitGo}/${r.goPred}` : "—"}</td>
            </tr>
          `,
        )
        .join("")}
    </tbody>
  `;
  mount.appendChild(table);
}

// ---------------------------------------------------------------------------
// 30-day actuals heatmap — re-themed (currentColor stroke instead of #000)
// ---------------------------------------------------------------------------
function renderActualsHeatmap(data: SiteData): void {
  const actuals: ActualsTimelineRow[] = data.actuals_timeline;
  const sr = document.getElementById("hm-sr");
  if (!actuals.length) {
    emptyState(
      "actuals-heatmap",
      "No actuals yet",
      "The pipeline hasn't received any backfill rows from the historical archive.",
    );
    if (sr) sr.textContent = "Actuals heatmap is empty.";
    return;
  }
  const mount = clearMount("actuals-heatmap");
  if (!mount) return;

  const names = Array.from(new Set(actuals.map((a) => a.name)));
  const dates = Array.from(new Set(actuals.map((a) => a.date))).sort();
  const cell = 14;
  const lh = 22;
  const padL = 160;
  const padT = 60;
  const W = padL + dates.length * cell + 30;
  const H = padT + names.length * lh + 20;

  const svg = select(mount)
    .append("svg")
    .attr("class", "scatter-svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("width", W)
    .attr("height", H)
    .attr("role", "img")
    .attr("aria-labelledby", "hm-title")
    .attr("aria-describedby", "hm-sr");

  const tempExt = extent(actuals, (d) => d.temp_max);
  const tHi = tempExt[1] ?? 30;
  const tLo = tempExt[0] ?? 0;
  const color = scaleSequential(interpolateRdYlBu).domain([tHi, tLo]);

  svg
    .selectAll("text.row")
    .data(names)
    .enter()
    .append("text")
    .attr("class", "row")
    .attr("x", padL - 8)
    .attr("y", (_d, i) => padT + i * lh + lh * 0.7)
    .attr("text-anchor", "end")
    .attr("fill", "var(--text-2)")
    .attr("font-size", 11)
    .attr("font-family", "var(--font-mono)")
    .text((d) => d);

  svg
    .selectAll("text.col")
    .data(dates)
    .enter()
    .append("text")
    .attr("class", "col")
    .attr("x", (_d, i) => padL + i * cell + cell / 2)
    .attr("y", padT - 10)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-3)")
    .attr("font-size", 9)
    .attr("font-family", "var(--font-mono)")
    .text((d, i) => (i % 3 === 0 ? d.slice(5) : ""));

  const byKey = new Map<string, ActualsTimelineRow>();
  actuals.forEach((a) => byKey.set(`${a.name}|${a.date}`, a));
  let qualifyCount = 0;
  names.forEach((n, ri) => {
    dates.forEach((dt, ci) => {
      const a = byKey.get(`${n}|${dt}`);
      if (!a) return;
      svg
        .append("rect")
        .attr("x", padL + ci * cell + 1)
        .attr("y", padT + ri * lh + 2)
        .attr("width", cell - 2)
        .attr("height", lh - 4)
        .attr("fill", color(a.temp_max))
        .attr("rx", 2)
        .on("mousemove", (ev: MouseEvent) =>
          showTip(
            `${a.name} · ${a.date}<br>${a.temp_max.toFixed(1)}°C · rain ${a.precip_sum.toFixed(1)}mm · wind ${a.wind_max.toFixed(0)}km/h${a.qualify ? "<br><b>RIDE-CLEAN</b>" : ""}`,
            ev,
          ),
        )
        .on("mouseleave", hideTip);
      if (a.qualify) {
        qualifyCount += 1;
        svg
          .append("circle")
          .attr("class", "hm-qualify")
          .attr("cx", padL + ci * cell + cell / 2)
          .attr("cy", padT + ri * lh + lh / 2)
          .attr("r", 2)
          .attr("fill", "var(--good)")
          .attr("stroke", "var(--surface-elevated)")
          .attr("stroke-width", 0.6)
          .attr("pointer-events", "none");
      }
    });
  });

  if (sr) {
    sr.textContent = `Heatmap of ${dates.length} days across ${names.length} destinations. ${qualifyCount} day-cells were actually rideable. Temperature range ${tLo.toFixed(0)}°C to ${tHi.toFixed(0)}°C.`;
  }
}
