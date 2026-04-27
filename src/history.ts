import { extent, mean } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { format } from "d3-format";
import { scaleBand, scaleLinear, scaleSequential } from "d3-scale";
import { interpolateInferno, interpolateRdYlBu } from "d3-scale-chromatic";
import { select } from "d3-selection";

import { loadSiteData } from "./lib/data";
import type { ActualsTimelineRow, CalibrationRow } from "./lib/types";

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

void loadSiteData().then((data) => {
  const heroMeta = document.getElementById("hero-meta");
  if (heroMeta) {
    heroMeta.textContent = `${data.forecasts_count} forecast snapshots · ${data.actuals_count} days of actuals · ${data.calibration.length} matched location-days`;
  }

  // ---- At-a-glance cards
  const cards = select<HTMLElement, unknown>("#cards");
  const calib: CalibrationRow[] = data.calibration;
  function card(title: string, stat: string, sub: string): void {
    const c = cards.append("div").attr("class", "card");
    c.append("h3").text(title);
    c.append("div").attr("class", "stat").html(stat);
    c.append("div").attr("class", "sub").text(sub);
  }
  if (calib.length) {
    const correct = calib.filter((r) => r.predicted_qualify === r.actual_qualify).length;
    const tempErr =
      mean(calib, (r) => Math.abs((r.predicted_temp ?? 0) - (r.actual_temp ?? 0))) ?? 0;
    const goPred = calib.filter((r) => r.predicted_qualify);
    const hitGo = goPred.filter((r) => r.actual_qualify).length;
    card(
      "Correct verdict",
      `${((100 * correct) / calib.length).toFixed(0)}%`,
      `${correct} / ${calib.length} location-days`,
    );
    card("Mean temp error", `${tempErr.toFixed(1)}°C`, "absolute, all lead times");
    card(
      "'Go' calls hit",
      goPred.length ? `${((100 * hitGo) / goPred.length).toFixed(0)}%` : "—",
      `${hitGo} / ${goPred.length} predicted-clean days`,
    );
  } else {
    card("Correct verdict", "—", "awaiting matured forecasts");
    card("Mean temp error", "—", "awaiting matured forecasts");
    card("'Go' calls hit", "—", "awaiting matured forecasts");
  }
  card("Actuals coverage", String(data.actuals_count), "days seeded from archive");

  // ---- Calibration scatter (predicted vs actual temp)
  const scatterDiv = select<HTMLElement, unknown>("#scatter");
  if (calib.length) {
    const status = document.getElementById("calib-status");
    if (status) status.style.display = "none";
    const W = 720;
    const H = 420;
    const M = { t: 20, r: 20, b: 40, l: 50 };
    const svg = scatterDiv
      .append("svg")
      .attr("class", "scatter-svg")
      .attr("width", W)
      .attr("height", H);
    const pts = calib.filter(
      (r): r is CalibrationRow & { predicted_temp: number; actual_temp: number } =>
        r.predicted_temp != null && r.actual_temp != null,
    );
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
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${H - M.b})`)
      .call(axisBottom(x));
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${M.l},0)`)
      .call(axisLeft(y));
    svg
      .append("line")
      .attr("x1", x(lo))
      .attr("x2", x(hi))
      .attr("y1", y(lo))
      .attr("y2", y(hi))
      .attr("stroke", "var(--neutral)")
      .attr("stroke-dasharray", "3 4");
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
      .attr("opacity", 0.7)
      .on("mousemove", (ev: MouseEvent, d) =>
        showTip(
          `${d.name} · ${d.target_date}<br>predicted ${d.predicted_temp.toFixed(1)}°C · actual ${d.actual_temp.toFixed(1)}°C<br>lead ${d.lead_days}d`,
          ev,
        ),
      )
      .on("mouseleave", hideTip);
    svg
      .append("text")
      .attr("x", W / 2)
      .attr("y", H - 6)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--fg-3)")
      .attr("font-size", 11)
      .text("Predicted high (°C)");
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -H / 2)
      .attr("y", 14)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--fg-3)")
      .attr("font-size", 11)
      .text("Actual high (°C)");
  }

  // ---- Hit rate by lead time
  const lbDiv = select<HTMLElement, unknown>("#leadbar");
  const buckets = [
    { label: "1–3d", min: 1, max: 3 },
    { label: "4–7d", min: 4, max: 7 },
    { label: "8–14d", min: 8, max: 14 },
  ];
  const bucketStats = buckets.map((b) => {
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
  const W2 = 720;
  const H2 = 220;
  const M2 = { t: 20, r: 20, b: 40, l: 60 };
  const svg2 = lbDiv
    .append("svg")
    .attr("class", "scatter-svg")
    .attr("width", W2)
    .attr("height", H2);
  const x2 = scaleBand()
    .domain(bucketStats.map((b) => b.label))
    .range([M2.l, W2 - M2.r])
    .padding(0.3);
  const y2 = scaleLinear()
    .domain([0, 1])
    .range([H2 - M2.b, M2.t]);
  svg2
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${H2 - M2.b})`)
    .call(axisBottom(x2));
  svg2
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${M2.l},0)`)
    .call(axisLeft(y2).tickFormat(format(".0%")));
  svg2
    .selectAll("rect.bar")
    .data(bucketStats)
    .enter()
    .append("rect")
    .attr("x", (d) => x2(d.label) ?? 0)
    .attr("width", x2.bandwidth())
    .attr("y", (d) => (d.rate == null ? H2 - M2.b : y2(d.rate)))
    .attr("height", (d) => (d.rate == null ? 0 : H2 - M2.b - y2(d.rate)))
    .attr("fill", "var(--accent)")
    .attr("opacity", 0.8)
    .on("mousemove", (ev: MouseEvent, d) =>
      showTip(
        `${d.label}<br>predicted-go: ${d.predicted_go}<br>hits: ${d.hits}<br>rate: ${d.rate == null ? "—" : `${(100 * d.rate).toFixed(0)}%`}`,
        ev,
      ),
    )
    .on("mouseleave", hideTip);
  svg2
    .selectAll("text.lbl")
    .data(bucketStats)
    .enter()
    .append("text")
    .attr("class", "lbl")
    .attr("x", (d) => (x2(d.label) ?? 0) + x2.bandwidth() / 2)
    .attr("y", (d) => (d.rate == null ? H2 - M2.b - 6 : y2(d.rate) - 6))
    .attr("text-anchor", "middle")
    .attr("fill", "var(--fg-2)")
    .attr("font-size", 11)
    .attr("font-family", "var(--mono)")
    .text((d) => (d.rate == null ? "no data yet" : `${(100 * d.rate).toFixed(0)}%`));

  // ---- Actuals heatmap
  const actuals: ActualsTimelineRow[] = data.actuals_timeline;
  const hmDiv = select<HTMLElement, unknown>("#actuals-heatmap");
  if (actuals.length) {
    const names = Array.from(new Set(actuals.map((a) => a.name)));
    const dates = Array.from(new Set(actuals.map((a) => a.date))).sort();
    const cell = 14;
    const lh = 22;
    const padL = 160;
    const padT = 60;
    const W3 = padL + dates.length * cell + 30;
    const H3 = padT + names.length * lh + 20;
    const svg3 = hmDiv
      .append("svg")
      .attr("class", "scatter-svg")
      .attr("width", W3)
      .attr("height", H3);
    const tempExt = extent(actuals, (d) => d.temp_max);
    const tHi = tempExt[1] ?? 30;
    const tLo = tempExt[0] ?? 0;
    const color = scaleSequential(interpolateRdYlBu).domain([tHi, tLo]);
    svg3
      .selectAll("text.row")
      .data(names)
      .enter()
      .append("text")
      .attr("class", "row")
      .attr("x", padL - 8)
      .attr("y", (_d, i) => padT + i * lh + lh * 0.7)
      .attr("text-anchor", "end")
      .attr("fill", "var(--fg-2)")
      .attr("font-size", 11)
      .attr("font-family", "var(--mono)")
      .text((d) => d);
    svg3
      .selectAll("text.col")
      .data(dates)
      .enter()
      .append("text")
      .attr("class", "col")
      .attr("x", (_d, i) => padL + i * cell + cell / 2)
      .attr("y", padT - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--fg-3)")
      .attr("font-size", 9)
      .attr("font-family", "var(--mono)")
      .text((d, i) => (i % 3 === 0 ? d.slice(5) : ""));
    const byKey = new Map<string, ActualsTimelineRow>();
    actuals.forEach((a) => byKey.set(`${a.name}|${a.date}`, a));
    names.forEach((n, ri) => {
      dates.forEach((dt, ci) => {
        const a = byKey.get(`${n}|${dt}`);
        if (!a) return;
        svg3
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
          svg3
            .append("circle")
            .attr("cx", padL + ci * cell + cell / 2)
            .attr("cy", padT + ri * lh + lh / 2)
            .attr("r", 2)
            .attr("fill", "var(--green)")
            .attr("stroke", "#000")
            .attr("stroke-width", 0.4)
            .attr("pointer-events", "none");
        }
      });
    });
  }
});
