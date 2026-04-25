const DATA_PATH = "../pré-traitement/dataset_250.csv";

const margin = { top: 20, right: 30, bottom: 50, left: 55 };
const svgW = 440;
const svgH = 420;
const innerW = svgW - margin.left - margin.right;
const innerH = svgH - margin.top - margin.bottom;

const COLORS = {
  "Avec paroles": "#5b9bd5",
  "Instrumental":  "#ed7d31",
  "< 3 min":       "#5b9bd5",
  "3–5 min":       "#5dae8b",
  "> 5 min":       "#ed7d31"
};

const KEYS_ORDERED = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MODES_ORDERED = ["Major", "Minor"];

let heatmapVisible = false;

function notifyReady() {
  if (window.parent !== window) window.parent.postMessage({ type: "viz-ready" }, "*");
}

function updateView() {
  const button = document.getElementById("toggle-heatmap");
  const boxplots = document.getElementById("charts-container");
  const heatmap = document.getElementById("heatmap-panel");
  if (!button || !boxplots || !heatmap) return;
  boxplots.classList.toggle("panel-hidden", heatmapVisible);
  heatmap.classList.toggle("panel-hidden", !heatmapVisible);
  button.textContent = heatmapVisible ? "Voir les distributions" : "Voir la tonalité et le mode";
  if (window.parent !== window) window.parent.dispatchEvent(new Event("resize"));
}

document.getElementById("toggle-heatmap").addEventListener("click", () => {
  heatmapVisible = !heatmapVisible;
  updateView();
});

updateView();

function colorFn(key) { return COLORS[key] || "#999"; }

const yScale = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

function normalizeSongsFromCsv(rows) {
  return rows
    .filter(d => Number.isFinite(+d.popularity) && Number.isFinite(+d.key) && Number.isFinite(+d.mode))
    .map(d => ({
      popularity: +d.popularity,
      key: KEYS_ORDERED[+d.key],
      mode: +d.mode === 1 ? "Major" : "Minor"
    }))
    .filter(d => d.key);
}

function drawHeatmapChart(songs) {
  const width = 980;
  const innerHeight = 326;
  const margin = { top: 34, right: 100, bottom: 20, left: 60 };
  const height = margin.top + innerHeight + margin.bottom;
  const innerWidth = width - margin.left - margin.right;

  const grouped = [];
  MODES_ORDERED.forEach(mode => {
    KEYS_ORDERED.forEach(key => {
      const subset = songs.filter(d => d.mode === mode && d.key === key);
      grouped.push({
        mode,
        key,
        value: d3.mean(subset, d => +d.popularity) || 0,
        count: subset.length
      });
    });
  });

  const svg = d3.select("#chart-c")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("width", "100%")
    .attr("height", height);
  svg.selectAll("*").remove();

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const x = d3.scaleBand().domain(KEYS_ORDERED).range([0, innerWidth]).padding(0.06);
  const y = d3.scaleBand().domain(MODES_ORDERED).range([0, innerHeight]).padding(0.12);
  const extent = d3.extent(grouped, d => d.value);
  const domain = extent[0] === extent[1] ? [extent[0] - 1, extent[1] + 1] : extent;
  const color = d3.scaleSequential().domain(domain).interpolator(d3.interpolateBlues);

  g.selectAll("rect.cell")
    .data(grouped)
    .join("rect")
    .attr("class", "cell")
    .attr("x", d => x(d.key))
    .attr("y", d => y(d.mode))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 10)
    .attr("fill", d => color(d.value));

  g.selectAll("text.value")
    .data(grouped)
    .join("text")
    .attr("class", "value")
    .attr("x", d => x(d.key) + x.bandwidth() / 2)
    .attr("y", d => y(d.mode) + y.bandwidth() / 2 + 8)
    .attr("text-anchor", "middle")
    .attr("font-size", 24)
    .attr("font-weight", 700)
    .attr("fill", d => d.value > (domain[0] + domain[1]) / 2 ? "white" : "#172233")
    .text(d => d3.format(".0f")(d.value));

  g.append("g")
    .attr("class", "axis axis-heatmap")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .attr("class", "axis axis-heatmap")
    .call(d3.axisLeft(y));

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "legend-gradient-c")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

  d3.range(0, 1.01, 0.1).forEach(t => {
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", d3.interpolateBlues(t));
  });

  const legendX = width - margin.right + 12;
  const legendY = margin.top + 20;
  svg.append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", 18)
    .attr("height", 180)
    .attr("rx", 9)
    .attr("fill", "url(#legend-gradient-c)");

  const legendScale = d3.scaleLinear().domain(domain).range([legendY + 180, legendY]);
  svg.append("g")
    .attr("class", "axis axis-heatmap")
    .attr("transform", `translate(${legendX + 24},0)`)
    .call(d3.axisRight(legendScale).ticks(5));

  svg.append("text")
    .attr("class", "axis-label heatmap-legend-title")
    .attr("x", legendX - 12)
    .attr("y", legendY - 22)
    .text("Popularité");
}

function setupSvg(id, categories) {
  const svg = d3.select(`#${id}`)
    .attr("width",  svgW)
    .attr("height", svgH)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("g")
    .attr("class", "axis axis-y")
    .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").attr("stroke", "#ddd"));

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .text("Popularité");

  const xScale = d3.scaleBand()
    .domain(categories)
    .range([0, innerW])
    .padding(0.35);

  svg.append("g")
    .attr("class", "axis axis-x")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .call(g => g.select(".domain").attr("stroke", "#bbb"));

  return { svg, xScale };
}

d3.csv(DATA_PATH, d3.autoType).then(raw => {
  const data = raw.map(d => ({
    popularity:       +d.popularity,
    duration_ms:      +d.duration_ms,
    instrumentalness: +d.instrumentalness
  }));

  const categoriesA = ["Avec paroles", "Instrumental"];

  const groupedA = categoriesA.map(cat => {
    const vals = data
      .filter(d => cat === "Instrumental"
        ? d.instrumentalness > 0.5
        : d.instrumentalness <= 0.5)
      .map(d => d.popularity);
    return { key: cat, stats: computeBoxStats(vals) };
  });

  const { svg: svgA, xScale: xA } = setupSvg("chart-a", categoriesA);
  drawBoxPlots(svgA, groupedA, xA, yScale, colorFn, xA.bandwidth() * 0.6);

  const categoriesB = ["< 3 min", "3–5 min", "> 5 min"];

  function durationLabel(ms) {
    if (ms < 180000)  return "< 3 min";
    if (ms <= 300000) return "3–5 min";
    return "> 5 min";
  }

  const groupedB = categoriesB.map(cat => {
    const vals = data
      .filter(d => durationLabel(d.duration_ms) === cat)
      .map(d => d.popularity);
    return { key: cat, stats: computeBoxStats(vals) };
  });

  const { svg: svgB, xScale: xB } = setupSvg("chart-b", categoriesB);
  drawBoxPlots(svgB, groupedB, xB, yScale, colorFn, xB.bandwidth() * 0.6);

  const heatmapSongs = normalizeSongsFromCsv(raw);
  drawHeatmapChart(heatmapSongs);
  notifyReady();
});

