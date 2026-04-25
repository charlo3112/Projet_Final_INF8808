function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function colorOf(d) {
  if (d.popularity >= 70) return "#070707";
  if (d.popularity >= 40) return "#3b7fd4";
  return "#d04040";
}

function categoryOf(d) {
  if (d.popularity >= 70) return "high";
  if (d.popularity >= 40) return "medium";
  return "low";
}

function linePath(d) {
  return d3.line()(
    dimensions.map(dim => [xScale(dim), yScales[dim](d[dim])])
  );
}

function linePathWithOverride(d, overrideDim, overrideX) {
  return d3.line()(
    dimensions.map(dim => [
      dim === overrideDim ? overrideX : xScale(dim),
      yScales[dim](d[dim])
    ])
  );
}

function updateVisibility() {
  lines.selectAll("path").classed("dimmed", d => {
    const categoryHidden = !activeCategories.has(categoryOf(d));
    const brushHidden = Object.entries(brushSelections).some(([k, [lo, hi]]) => {
      return d[k] < lo || d[k] > hi;
    });
    return categoryHidden || brushHidden;
  });

  const hasBrush = Object.keys(brushSelections).length > 0;
  document.getElementById("reset-btn").style.display =
    hasBrush ? "inline-block" : "none";
}

function attachBrush(selection, dim) {
  const brush = d3.brushY()
    .extent([[-12, 0], [12, height]])
    .on("brush end", ({ selection: sel }) => {
      if (sel) {
        brushSelections[dim] = sel.map(yScales[dim].invert).reverse();
      } else {
        delete brushSelections[dim];
      }
      updateVisibility();
    });
  selection.call(brush);
  return brush;
}

function resetBrushes() {
  Object.keys(brushSelections).forEach(k => delete brushSelections[k]);
  axisGroups.selectAll("g.brush").each(function(dim) {
    attachBrush(d3.select(this), dim);
    d3.select(this).call(
      d3.brushY().extent([[-12, 0], [12, height]]).move, null
    );
  });
  updateVisibility();
}