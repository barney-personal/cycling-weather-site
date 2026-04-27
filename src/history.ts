// History page entry — calibration scatter, lead-time hit rate, 30-day actuals heatmap.
// Logic preserved verbatim from the v0 inline script while we stand up the toolchain (M1).
// M9 will refactor this to the new design system + reliability charts.
export {};

const tt = d3.select("#tt");

function showTip(html: string, ev: MouseEvent): void {
  tt.html(html)
    .style("opacity", 1)
    .style("left", `${ev.pageX + 12}px`)
    .style("top", `${ev.pageY + 12}px`);
}

function hideTip(): void {
  tt.style("opacity", 0);
}

d3.json("data.json").then((data: any) => {
  const heroMeta = document.getElementById("hero-meta");
  if (heroMeta) {
    heroMeta.textContent = `${data.forecasts_count} forecast snapshots · ${data.actuals_count} days of actuals · ${data.calibration.length} matched location-days`;
  }

  // ---- At-a-glance cards
  const cards = d3.select("#cards");
  const calib: any[] = data.calibration;
  function card(title: string, stat: string, sub: string): void {
    const c = cards.append("div").attr("class", "card");
    c.append("h3").text(title);
    c.append("div").attr("class", "stat").html(stat);
    c.append("div").attr("class", "sub").text(sub);
  }
  if (calib.length) {
    const correct = calib.filter((r: any) => r.predicted_qualify === r.actual_qualify).length;
    const tempErr = d3.mean(calib, (r: any) =>
      Math.abs((r.predicted_temp ?? 0) - (r.actual_temp ?? 0)),
    );
    const goPred = calib.filter((r: any) => r.predicted_qualify);
    const hitGo = goPred.filter((r: any) => r.actual_qualify).length;
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
  const scatterDiv = d3.select("#scatter");
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
    const pts = calib.filter((r: any) => r.predicted_temp != null && r.actual_temp != null);
    const ext = d3.extent(pts.flatMap((r: any) => [r.predicted_temp, r.actual_temp]));
    const x = d3
      .scaleLinear()
      .domain(ext)
      .nice()
      .range([M.l, W - M.r]);
    const y = d3
      .scaleLinear()
      .domain(ext)
      .nice()
      .range([H - M.b, M.t]);
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${H - M.b})`)
      .call(d3.axisBottom(x));
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${M.l},0)`)
      .call(d3.axisLeft(y));
    // y=x reference
    svg
      .append("line")
      .attr("x1", x(ext[0]))
      .attr("x2", x(ext[1]))
      .attr("y1", y(ext[0]))
      .attr("y2", y(ext[1]))
      .attr("stroke", "var(--neutral)")
      .attr("stroke-dasharray", "3 4");
    const colorByLead = d3.scaleSequential(d3.interpolateInferno).domain([0, 14]);
    svg
      .append("g")
      .selectAll("circle")
      .data(pts)
      .enter()
      .append("circle")
      .attr("cx", (d: any) => x(d.predicted_temp))
      .attr("cy", (d: any) => y(d.actual_temp))
      .attr("r", 3.5)
      .attr("fill", (d: any) => colorByLead(d.lead_days))
      .attr("opacity", 0.7)
      .on("mousemove", (ev: MouseEvent, d: any) =>
        showTip(
          `${d.name} · ${d.target_date}<br>predicted ${d.predicted_temp?.toFixed(1)}°C · actual ${d.actual_temp?.toFixed(1)}°C<br>lead ${d.lead_days}d`,
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
  const lbDiv = d3.select("#leadbar");
  const buckets = [
    { label: "1–3d", min: 1, max: 3 },
    { label: "4–7d", min: 4, max: 7 },
    { label: "8–14d", min: 8, max: 14 },
  ];
  const bucketStats = buckets.map((b) => {
    const sub = calib.filter((r: any) => r.lead_days >= b.min && r.lead_days <= b.max);
    const goPred = sub.filter((r: any) => r.predicted_qualify);
    const hits = goPred.filter((r: any) => r.actual_qualify).length;
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
  const x2 = d3
    .scaleBand()
    .domain(bucketStats.map((b) => b.label))
    .range([M2.l, W2 - M2.r])
    .padding(0.3);
  const y2 = d3
    .scaleLinear()
    .domain([0, 1])
    .range([H2 - M2.b, M2.t]);
  svg2
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${H2 - M2.b})`)
    .call(d3.axisBottom(x2));
  svg2
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${M2.l},0)`)
    .call(d3.axisLeft(y2).tickFormat(d3.format(".0%")));
  svg2
    .selectAll("rect.bar")
    .data(bucketStats)
    .enter()
    .append("rect")
    .attr("x", (d: any) => x2(d.label))
    .attr("width", x2.bandwidth())
    .attr("y", (d: any) => (d.rate == null ? H2 - M2.b : y2(d.rate)))
    .attr("height", (d: any) => (d.rate == null ? 0 : H2 - M2.b - y2(d.rate)))
    .attr("fill", "var(--accent)")
    .attr("opacity", 0.8)
    .on("mousemove", (ev: MouseEvent, d: any) =>
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
    .attr("x", (d: any) => x2(d.label) + x2.bandwidth() / 2)
    .attr("y", (d: any) => (d.rate == null ? H2 - M2.b - 6 : y2(d.rate) - 6))
    .attr("text-anchor", "middle")
    .attr("fill", "var(--fg-2)")
    .attr("font-size", 11)
    .attr("font-family", "var(--mono)")
    .text((d: any) => (d.rate == null ? "no data yet" : `${(100 * d.rate).toFixed(0)}%`));

  // ---- Actuals heatmap
  const actuals: any[] = data.actuals_timeline;
  const hmDiv = d3.select("#actuals-heatmap");
  if (actuals.length) {
    const names = Array.from(new Set(actuals.map((a: any) => a.name))) as string[];
    const dates = (Array.from(new Set(actuals.map((a: any) => a.date))) as string[]).sort();
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
    const tempExt = d3.extent(actuals, (d: any) => d.temp_max);
    const color = d3.scaleSequential(d3.interpolateRdYlBu).domain([tempExt[1], tempExt[0]]);
    // y labels
    svg3
      .selectAll("text.row")
      .data(names)
      .enter()
      .append("text")
      .attr("class", "row")
      .attr("x", padL - 8)
      .attr("y", (_d: string, i: number) => padT + i * lh + lh * 0.7)
      .attr("text-anchor", "end")
      .attr("fill", "var(--fg-2)")
      .attr("font-size", 11)
      .attr("font-family", "var(--mono)")
      .text((d: string) => d);
    // x labels (every 3 days)
    svg3
      .selectAll("text.col")
      .data(dates)
      .enter()
      .append("text")
      .attr("class", "col")
      .attr("x", (_d: string, i: number) => padL + i * cell + cell / 2)
      .attr("y", padT - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--fg-3)")
      .attr("font-size", 9)
      .attr("font-family", "var(--mono)")
      .text((d: string, i: number) => (i % 3 === 0 ? d.slice(5) : ""));
    // cells
    const byKey = new Map<string, any>();
    actuals.forEach((a: any) => byKey.set(`${a.name}|${a.date}`, a));
    names.forEach((n: string, ri: number) => {
      dates.forEach((dt: string, ci: number) => {
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
