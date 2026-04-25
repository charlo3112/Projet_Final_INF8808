function computeBoxStats(values) {
  const sorted = [...values].sort(d3.ascending);
  const q1 = d3.quantile(sorted, 0.25);
  const median = d3.quantile(sorted, 0.5);
  const q3 = d3.quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const whiskerLow = Math.max(d3.min(sorted), q1 - 1.5 * iqr);
  const whiskerHigh = Math.min(d3.max(sorted), q3 + 1.5 * iqr);
  return { q1, median, q3, whiskerLow, whiskerHigh, values: sorted };
}

function drawBoxPlots(svg, groups, xScale, yScale, colorFn, jitter) {
  const bw = xScale.bandwidth();

  const gGroups = svg.selectAll(".box-group")
    .data(groups, d => d.key)
    .join("g")
    .attr("class", "box-group")
    .attr("transform", d => `translate(${xScale(d.key)}, 0)`);

  gGroups.append("line")
    .attr("class", "whisker-line")
    .attr("x1", bw / 2)
    .attr("x2", bw / 2)
    .attr("y1", d => yScale(d.stats.whiskerHigh))
    .attr("y2", d => yScale(d.stats.whiskerLow))
    .attr("stroke", d => colorFn(d.key))
    .attr("stroke-width", 1.5);

  gGroups.append("rect")
    .attr("class", "box-rect")
    .attr("x", bw * 0.15)
    .attr("width", bw * 0.7)
    .attr("y", d => yScale(d.stats.q3))
    .attr("height", d => Math.max(0, yScale(d.stats.q1) - yScale(d.stats.q3)))
    .attr("fill", d => colorFn(d.key))
    .attr("fill-opacity", 0.25)
    .attr("stroke", d => colorFn(d.key))
    .attr("stroke-width", 1.5);

  gGroups.append("line")
    .attr("class", "median-line")
    .attr("x1", bw * 0.15)
    .attr("x2", bw * 0.85)
    .attr("y1", d => yScale(d.stats.median))
    .attr("y2", d => yScale(d.stats.median))
    .attr("stroke", d => colorFn(d.key))
    .attr("stroke-width", 2.5);

  gGroups.append("line")
    .attr("x1", bw * 0.35)
    .attr("x2", bw * 0.65)
    .attr("y1", d => yScale(d.stats.whiskerHigh))
    .attr("y2", d => yScale(d.stats.whiskerHigh))
    .attr("stroke", d => colorFn(d.key))
    .attr("stroke-width", 1.5);

  gGroups.append("line")
    .attr("x1", bw * 0.35)
    .attr("x2", bw * 0.65)
    .attr("y1", d => yScale(d.stats.whiskerLow))
    .attr("y2", d => yScale(d.stats.whiskerLow))
    .attr("stroke", d => colorFn(d.key))
    .attr("stroke-width", 1.5);

  gGroups.each(function(d) {
    d3.select(this).selectAll("circle")
      .data(d.stats.values)
      .join("circle")
      .attr("cx", () => bw / 2 + (Math.random() - 0.5) * jitter)
      .attr("cy", v => yScale(v))
      .attr("r", 3.5)
      .attr("fill", colorFn(d.key))
      .attr("fill-opacity", 0.35)
      .attr("stroke", "none");
  });
}
