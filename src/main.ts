// Homepage entry — boots the existing forward-looking ranking + 14-day strip view.
// Logic preserved verbatim from the v0 inline script while we stand up the toolchain (M1).
// M3-M5 will replace this with the design-system + threshold-dial implementation.
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
  const latest = data?.latest;
  const verdictEl = document.getElementById("verdict");
  if (!latest) {
    if (verdictEl) verdictEl.textContent = "No snapshot yet";
    return;
  }
  const verdict =
    latest.verdict === "qualifier"
      ? "🚴☀️ Cycling Weather Alert — go window detected"
      : "🚴 No Go Yet";
  if (verdictEl) verdictEl.textContent = verdict;
  const outlookEl = document.getElementById("outlook");
  if (outlookEl) outlookEl.textContent = latest.outlook || "";
  const metaEl = document.getElementById("meta");
  if (metaEl) {
    metaEl.textContent = `Forecast date ${latest.forecast_date} · generated ${latest.generated_at} UTC · ${latest.results.length} destinations · ${latest.forecast_days}-day window`;
  }

  // Filters
  const regions = Array.from(new Set(latest.results.map((r: any) => r.region))).sort();
  const filterBar = d3.select("#filters");
  let active = "all";
  const chips = ["all", "qualifiers", ...regions];
  filterBar
    .selectAll(".chip")
    .data(chips)
    .enter()
    .append("span")
    .attr("class", (d: string) => `chip${d === "all" ? " active" : ""}`)
    .text((d: string) => d.charAt(0).toUpperCase() + d.slice(1))
    .on("click", function (this: HTMLElement, _ev: MouseEvent, d: string) {
      active = d;
      filterBar.selectAll(".chip").classed("active", (c: string) => c === d);
      render();
    });

  // Temp scale for the bar
  const allTemps = latest.results.map((r: any) => r.median_temp);
  const tempScale = d3
    .scaleLinear()
    .domain([Math.min(0, d3.min(allTemps)), Math.max(30, d3.max(allTemps))])
    .range([0, 120]);

  function render(): void {
    let rows = latest.results.slice();
    if (active === "qualifiers") {
      rows = rows.filter((r: any) => r.qualifier);
    } else if (active !== "all") {
      rows = rows.filter((r: any) => r.region === active);
    }

    const tb = d3.select("#rank-body");
    tb.selectAll("tr").remove();
    rows.forEach((r: any, i: number) => {
      const tr = tb.append("tr");
      tr.append("td")
        .attr("class", "rank")
        .text(i + 1);
      tr.append("td").html(
        `<span class="dest">${r.name}</span><span class="region">${r.region || ""}</span>`,
      );
      const tcell = tr.append("td");
      const bar = tcell.append("div").attr("class", "temp-bar");
      bar.append("span").style("width", `${Math.max(0, tempScale(r.median_temp))}px`);
      bar
        .append("div")
        .attr("class", "threshold")
        .style("left", `${tempScale(25)}px`);
      tcell
        .append("span")
        .attr("class", "temp-label")
        .text(`${r.median_temp.toFixed(1)}°C`);
      // Forecast strip
      const strip = tr.append("td").append("div").attr("class", "strip");
      r.daily.forEach((d: any) => {
        const cls = d.qualify
          ? "q"
          : d.precip_sum > 1 || d.precip_prob_max >= 60 || d.wind_max >= 35
            ? "x"
            : "m";
        strip
          .append("span")
          .attr("class", `cell ${cls}`)
          .on("mousemove", (ev: MouseEvent) => {
            showTip(
              `${d.date}<br>${d.temp_max.toFixed(1)}°C · rain ${d.precip_sum.toFixed(1)}mm (${d.precip_prob_max}% prob) · wind ${d.wind_max.toFixed(0)}km/h`,
              ev,
            );
          })
          .on("mouseleave", hideTip);
      });
      tr.append("td").text(
        r.best_run + (r.best_start ? ` · ${r.best_start.slice(5)}–${r.best_end.slice(5)}` : ""),
      );
      tr.append("td").text(r.dry_days);
      const status = tr.append("td");
      if (r.qualifier) {
        status.append("span").attr("class", "qualifier-badge").text("GO");
      } else {
        status.append("span").attr("class", "blocker").text(r.blocker);
      }
    });
  }
  render();
});
