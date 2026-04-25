const ALL_AUDIO_KEYS = ["danceability", "energy", "tempo", "valence", "acousticness"];
const AUDIO_LABELS   = {
  danceability: "dance",
  energy:       "energy",
  tempo:        "tempo",
  valence:      "valence",
  acousticness: "acoustic",
};

let allData        = [];
let selectedGenres = new Set();
let activeAudio    = new Set(ALL_AUDIO_KEYS);
let allGenresView  = "bar";
let firstRenderDone = false;

const BAR_MARGIN  = { top: 8, right: 60, bottom: 38, left: 90 };
const HEAT_MARGIN = { top: 42, right: 10, bottom: 8, left: 90 };
const CHART_BASE_WIDTH = 500;
const NORMAL_HEIGHT_RATIO = 560 / CHART_BASE_WIDTH;
const ALL_GENRES_HEIGHT_RATIO = 1240 / CHART_BASE_WIDTH;
const NORMAL_MAX_HEIGHT = 560;
const ALL_GENRES_MAX_HEIGHT = 1240;
const NORMAL_MIN_HEIGHT = 330;
const ALL_GENRES_MIN_HEIGHT = 760;

function notifyReady() {
  if (window.parent !== window) window.parent.postMessage({ type: "viz-ready" }, "*");
}

d3.selectAll(".chip").on("click", function () {
  const key = this.dataset.key;
  if (activeAudio.has(key)) {
    if (activeAudio.size === 1) return;
    activeAudio.delete(key);
    d3.select(this).classed("active", false);
  } else {
    activeAudio.add(key);
    d3.select(this).classed("active", true);
  }
  render();
});

["#filter-popularity", "#filter-topn", "#filter-explicit"].forEach(id => {
  d3.select(id).on("change", () => { selectedGenres.clear(); render(); });
});

d3.select("#toggle-all-view").on("click", () => {
  allGenresView = allGenresView === "bar" ? "heat" : "bar";
  render();
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 100);
});

function getFilters() {
  return {
    popularity: d3.select("#filter-popularity").property("value"),
    topN:       +d3.select("#filter-topn").property("value"),
    explicit:   d3.select("#filter-explicit").property("value"),
  };
}

function render() {
  const { popularity, topN, explicit } = getFilters();
  const filtered  = applyFilters(allData, popularity, explicit);
  const genreData = computeGenrePopularity(filtered, topN);
  const genres    = genreData.map(d => d.genre);
  const popMap    = Object.fromEntries(genreData.map(d => [d.genre, d.meanPop]));

  const audioKeys    = ALL_AUDIO_KEYS.filter(k => activeAudio.has(k));
  const audioProfile = computeAudioProfile(filtered, genres, audioKeys);

  const heatGenres = genres
    .filter(g => selectedGenres.size === 0 || selectedGenres.has(g))
    .slice().reverse();

  const isAllGenres = topN === 0;
  updateGraphPanels(isAllGenres);

  if (!isAllGenres || allGenresView === "bar") {
    drawBarChart(genres, popMap, isAllGenres);
  }
  if (!isAllGenres || allGenresView === "heat") {
    drawHeatmap(heatGenres, audioKeys, audioProfile, isAllGenres);
  }
  if (!firstRenderDone) {
    firstRenderDone = true;
    notifyReady();
  }
}

function getPanelInnerWidth(svgEl) {
  const panel = svgEl.parentElement;
  const styles = window.getComputedStyle(panel);
  const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  return Math.max(320, panel.clientWidth - paddingX);
}

function getInnerHeight(panelW, isSingleView) {
  const ratio = isSingleView ? ALL_GENRES_HEIGHT_RATIO : NORMAL_HEIGHT_RATIO;
  const minHeight = isSingleView ? ALL_GENRES_MIN_HEIGHT : NORMAL_MIN_HEIGHT;
  const maxHeight = isSingleView ? ALL_GENRES_MAX_HEIGHT : NORMAL_MAX_HEIGHT;
  return Math.round(Math.max(minHeight, Math.min(maxHeight, panelW * ratio)));
}

function updateGraphPanels(isAllGenres) {
  const toggleButton = document.getElementById("toggle-all-view");
  const barPanel = document.getElementById("panel-bar");
  const heatPanel = document.getElementById("panel-heat");

  toggleButton.hidden = !isAllGenres;
  toggleButton.textContent = allGenresView === "bar" ? "Voir le profil audio" : "Voir la popularité";

  barPanel.classList.toggle("panel-hidden", isAllGenres && allGenresView !== "bar");
  heatPanel.classList.toggle("panel-hidden", isAllGenres && allGenresView !== "heat");
}

function drawBarChart(genres, popMap, isSingleView) {
  const svgEl  = document.getElementById("bar-svg");
  const panelW = getPanelInnerWidth(svgEl);
  const innerH = getInnerHeight(panelW, isSingleView);
  const W      = panelW;
  const H      = innerH + BAR_MARGIN.top + BAR_MARGIN.bottom;
  const innerW = W - BAR_MARGIN.left - BAR_MARGIN.right;

  const svg = d3.select("#bar-svg")
    .attr("width", W)
    .attr("height", H);
  svg.selectAll("*").remove();

  const g = svg.append("g")
    .attr("transform", `translate(${BAR_MARGIN.left},${BAR_MARGIN.top})`);

  const xMax = d3.max(Object.values(popMap)) || 100;
  const xScale = d3.scaleLinear()
    .domain([0, Math.ceil(xMax / 5) * 5])
    .range([0, innerW]);

  const yScale = d3.scaleBand()
    .domain(genres)
    .range([innerH, 0])
    .padding(0.25);
  const showLabels = yScale.bandwidth() >= 9;
  const showValues = yScale.bandwidth() >= 14;

  g.append("g").attr("class", "x-grid")
    .selectAll("line")
    .data(xScale.ticks(5))
    .join("line")
      .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
      .attr("y1", 0).attr("y2", innerH);

  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(5).tickSize(4))
    .call(ax => ax.select(".domain").remove());

  svg.append("text")
    .attr("x", BAR_MARGIN.left + innerW / 2)
    .attr("y", H - 4)
    .attr("text-anchor", "middle")
    .attr("font-size", 10)
    .attr("fill", "#aaa")
    .text("Popularité moyenne");

  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(yScale).tickSize(0).tickPadding(6)
    .tickFormat(d => showLabels ? capitalize(d) : ""))
    .call(ax => ax.select(".domain").remove())
    .selectAll("text").attr("class", "bar-label");

  g.selectAll(".bar-rect")
    .data(genres)
    .join("rect")
      .attr("class", d => `bar-rect${selectedGenres.has(d) ? " selected" : ""}`)
      .attr("x", 0)
      .attr("y", d => yScale(d))
      .attr("height", yScale.bandwidth())
      .attr("width", d => xScale(popMap[d] || 0))
      .attr("rx", 3)
      .attr("fill", d => selectedGenres.has(d) ? "#3a9e5f" : "#b0c8e8")
      .on("click", (event, d) => {
        if (selectedGenres.has(d)) selectedGenres.delete(d);
        else selectedGenres.add(d);
        render();
      })
      .on("mouseover", (event, d) => showTooltip(event, `<strong>${capitalize(d)}</strong> — ${(popMap[d]||0).toFixed(1)}`))
      .on("mousemove", moveTooltip)
      .on("mouseout",  hideTooltip);

  g.selectAll(".bar-value")
    .data(showValues ? genres : [])
    .join("text")
    .attr("class", "bar-value")
    .attr("x", d => xScale(popMap[d] || 0) + 4)
    .attr("y", d => yScale(d) + yScale.bandwidth() / 2 + 3.5)
    .text(d => (popMap[d] || 0).toFixed(1));
  
}

function drawHeatmap(genres, audioKeys, audioProfile, isSingleView) {
  const svgEl  = document.getElementById("heat-svg");
  const panelW = getPanelInnerWidth(svgEl);

  if (!genres.length || !audioKeys.length) {
    d3.select("#heat-svg").attr("width", panelW).attr("height", 40).selectAll("*").remove();
    return;
  }

  const innerH = getInnerHeight(panelW, isSingleView);
  const W      = panelW;
  const H      = innerH + HEAT_MARGIN.top + HEAT_MARGIN.bottom;
  const innerW = W - HEAT_MARGIN.left - HEAT_MARGIN.right;
  const cellW  = innerW / audioKeys.length;
  const cellH  = innerH / genres.length;
  const showRowLabels = cellH >= 9;
  const showCellValues = cellH >= 18 && cellW >= 44;

  const svg = d3.select("#heat-svg")
    .attr("width", W)
    .attr("height", H);
  svg.selectAll("*").remove();

  const g = svg.append("g")
    .attr("transform", `translate(${HEAT_MARGIN.left},${HEAT_MARGIN.top})`);

  const colScales = {};
  audioKeys.forEach(key => {
    const vals = genres.map(genre => audioProfile[genre]?.[key] ?? 0);
    const lo = d3.min(vals), hi = d3.max(vals);
    colScales[key] = d3.scaleSequential()
      .domain([lo === hi ? 0 : lo, lo === hi ? 1 : hi])
      .interpolator(d3.interpolateRgb("#e8f0fb", "#3b7fd4"));
  });

  genres.forEach((genre, gi) => {
    audioKeys.forEach((key, ki) => {
      const val = audioProfile[genre]?.[key] ?? 0;
      const x = ki * cellW, y = gi * cellH;

      g.append("rect")
        .attr("class", "heat-cell")
        .attr("x", x + 2).attr("y", y + 2)
        .attr("width", cellW - 4).attr("height", cellH - 4)
        .attr("rx", 3)
        .attr("fill", colScales[key](val))
        .on("mouseover", event => {
          const display = key === "tempo"
            ? ((val * 190) + 60).toFixed(0) + " BPM"
            : val.toFixed(3);
          showTooltip(event, `<strong>${capitalize(genre)}</strong> · ${capitalize(AUDIO_LABELS[key])}: ${display}`);
        })
        .on("mousemove", moveTooltip)
        .on("mouseout",  hideTooltip);

      if (showCellValues) {
        const display = key === "tempo"
          ? ((val * 190) + 60).toFixed(0)
          : val.toFixed(2);
        g.append("text")
          .attr("class", "heat-cell-val")
          .attr("x", x + cellW / 2).attr("y", y + cellH / 2 + 3.5)
          .attr("text-anchor", "middle")
          .text(display);
      }
    });
  });

  audioKeys.forEach((key, ki) => {
    const x = ki * cellW + cellW / 2;
    const y = -12;
    g.append("text")
      .attr("class", "heat-col-label")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${x}, ${y}) rotate(-20)`)
      .text(capitalize(AUDIO_LABELS[key]));
  });

    if (showRowLabels) genres.forEach((genre, gi) => {
    g.append("text")
        .attr("class", "heat-row-label")
        .attr("x", -6)
        .attr("y", gi * cellH + cellH / 2 + 4)
        .attr("text-anchor", "end")
        .text(capitalize(genre));
    });
}

d3.csv("../pré-traitement/dataset_250.csv").then(raw => {
  allData = raw;
  render();
});
