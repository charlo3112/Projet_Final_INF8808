let allSongs = [];

function notifyReady() {
  if (window.parent !== window) window.parent.postMessage({ type: "viz-ready" }, "*");
}

function sample(arr, n) {
  if (arr.length <= n) return arr;
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function redraw(songs) {
  lines.selectAll("path")
    .data(songs, d => d.name)
    .join(
      enter => enter.append("path")
        .attr("class", "line")
        .attr("stroke", colorOf)
        .attr("d", linePath)
        .style("opacity", 0)
        .call(e => e.transition().duration(400).style("opacity", null)),
      update => update
        .call(u => u.transition().duration(400).attr("d", linePath)),
      exit => exit
        .call(e => e.transition().duration(200).style("opacity", 0).remove())
    );
  resetBrushes();
  updateVisibility();
}

function populateGenreSelect(genres) {
  const select = d3.select("#genre-select");
  select.append("option").attr("value", "").text("Tous les genres");
  genres.forEach(g => select.append("option").attr("value", g).text(g));
  select.on("change", function() {
    const genre = this.value;
    const filtered = genre ? allSongs.filter(d => d.genre === genre) : allSongs;
    redraw(filtered);
  });
}

const margin = { top: 80, right: 40, bottom: 20, left: 40 };
const width  = 800 - margin.left - margin.right;
const height = 420 - margin.top  - margin.bottom;

let dimensions = ["danceability", "energy", "valence", "tempo", "liveness", "popularity"];

const activeCategories = new Set(["high", "medium", "low"]);
const brushSelections  = {};

const svg = d3.select("#chart")
  .attr("width",  width  + margin.left + margin.right)
  .attr("height", height + margin.top  + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const xScale = d3.scalePoint()
  .domain(dimensions)
  .range([0, width]);

const yScales = {};
dimensions.forEach(dim => {
  const extent = dim === "tempo"      ? [60, 250]
               : dim === "popularity" ? [0, 100]
               : dim === "duration"   ? [90, 400]
               : [0, 1];
  yScales[dim] = d3.scaleLinear().domain(extent).range([height, 0]);
});

const lines = svg.append("g").attr("class", "lines");

const axisGroups = svg.selectAll(".axis")
  .data(dimensions)
  .join("g")
  .attr("class", "axis")
  .attr("transform", dim => `translate(${xScale(dim)},0)`);

axisGroups.each(function(dim) {
  const axis = dim === "tempo"
    ? d3.axisLeft(yScales[dim]).tickValues([60, 100, 140, 180, 220, 250])
    : d3.axisLeft(yScales[dim]).ticks(5);
  d3.select(this).call(axis);
});

axisGroups.append("text")
  .attr("y", -12)
  .attr("text-anchor", "middle")
  .attr("fill", "#333")
  .style("font-size", "12px")
  .style("font-weight", "bold")
  .text(dim => dim);

axisGroups.append("g")
  .attr("class", "brush")
  .each(function(dim) { attachBrush(d3.select(this), dim); });

axisGroups.append("text")
  .attr("class", "drag-handle")
  .attr("y", -28)
  .attr("text-anchor", "middle")
  .attr("fill", "#aaa")
  .style("font-size", "14px")
  .style("cursor", "grab")
  .text("⠿")
  .call(
    d3.drag()
      .on("start", function(event, dim) {
        d3.select(this.parentNode).raise();
        this._currentX = xScale(dim);
      })
      .on("drag", function(event, dim) {
        this._currentX += event.dx;
        d3.select(this.parentNode)
          .attr("transform", `translate(${this._currentX},0)`);
        if (!this._rafPending) {
          this._rafPending = true;
          requestAnimationFrame(() => {
            this._rafPending = false;
            lines.selectAll("path")
              .attr("d", d => linePathWithOverride(d, dim, this._currentX));
          });
        }
      })
      .on("end", function(event, dim) {
        const step     = width / (dimensions.length - 1);
        const newIndex = Math.max(0, Math.min(
          dimensions.length - 1,
          Math.round(this._currentX / step)
        ));
        const oldIndex = dimensions.indexOf(dim);

        dimensions.splice(oldIndex, 1);
        dimensions.splice(newIndex, 0, dim);
        xScale.domain(dimensions);

        resetBrushes();

        axisGroups.transition().duration(300)
          .attr("transform", d => `translate(${xScale(d)},0)`);
        lines.selectAll("path").transition().duration(300)
          .attr("d", linePath);
      })
  );

const legendData = [
  { label: "Popularité élevée (≥70)",    color: "#070707", key: "high"   },
  { label: "Popularité moyenne (40–69)", color: "#3b7fd4", key: "medium" },
  { label: "Popularité faible (<40)",    color: "#d04040", key: "low"    },
];

const legend = d3.select("#legend");
legendData.forEach(({ label, color, key }) => {
  const item = legend.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "8px")
    .style("cursor", "pointer")
    .style("transition", "opacity 0.2s")
    .on("click", function() {
      if (activeCategories.has(key)) {
        activeCategories.delete(key);
        d3.select(this).select(".check-box")
          .style("background", "#ccc")
          .style("border-color", "#ccc");
        d3.select(this).select(".check-mark").style("opacity", "0");
        d3.select(this).select(".label-text").style("color", "#ccc");
      } else {
        activeCategories.add(key);
        d3.select(this).select(".check-box")
          .style("background", color)
          .style("border-color", color);
        d3.select(this).select(".check-mark").style("opacity", "1");
        d3.select(this).select(".label-text").style("color", "#333");
      }
      updateVisibility();
    });

  const box = item.append("div")
    .attr("class", "check-box")
    .style("width", "16px")
    .style("height", "16px")
    .style("background", color)
    .style("border", `2px solid ${color}`)
    .style("border-radius", "3px")
    .style("display", "flex")
    .style("align-items", "center")
    .style("justify-content", "center")
    .style("flex-shrink", "0")
    .style("transition", "background 0.2s, border-color 0.2s");

  box.append("span")
    .attr("class", "check-mark")
    .style("font-size", "11px")
    .style("color", "white")
    .style("line-height", "1")
    .style("transition", "opacity 0.2s")
    .text("✓");

  item.append("span")
    .attr("class", "label-text")
    .style("transition", "color 0.2s")
    .text(label);
});

d3.select("#reset-btn").on("click", resetBrushes);

d3.csv("../pré-traitement/dataset_250.csv", d => ({
  name:         d.track_name,
  popularity:   +d.popularity,
  danceability: +d.danceability,
  energy:       +d.energy,
  valence:      +d.valence,
  tempo:        +d.tempo,
  liveness:     +d.liveness,
  genre:        d.track_genre,
})).then(data => {
  allSongs = data.filter(d => d.tempo > 0 && d.popularity >= 0);
  const genres = [...new Set(allSongs.map(d => d.genre))].sort();
  populateGenreSelect(genres);
  redraw(allSongs);
  notifyReady();
});
