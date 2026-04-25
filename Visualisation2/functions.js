function colorOf(d) {
  if (d.popularity >= 70) return "#3a9e5f";
  if (d.popularity >= 40) return "#3b7fd4";
  return "#d04040";
}

function normalizeAudio(key, value) {
  if (key === "tempo") return Math.max(0, Math.min(1, (+value - 60) / 190));
  return +value;
}

function applyFilters(rows, popularityFilter, explicitFilter) {
  return rows.filter(d => {
    const pop = +d.popularity;

    let passPop = true;
    if (popularityFilter === "high")        passPop = pop >= 70;
    else if (popularityFilter === "medium") passPop = pop >= 40 && pop < 70;
    else if (popularityFilter === "low")    passPop = pop < 40;

    let passExp = true;
    if (explicitFilter === "yes")
      passExp = d.explicit === "True" || d.explicit === "true" || d.explicit === "1";
    else if (explicitFilter === "no")
      passExp = d.explicit === "False" || d.explicit === "false" || d.explicit === "0";

    return passPop && passExp;
  });
}

function computeGenrePopularity(rows, topN) {
  const byGenre = d3.rollup(
    rows,
    v => d3.mean(v, d => +d.popularity),
    d => d.track_genre
  );

  let sorted = Array.from(byGenre, ([genre, meanPop]) => ({ genre, meanPop }))
    .sort((a, b) => d3.ascending(a.meanPop, b.meanPop));

  if (topN > 0) sorted = sorted.slice(-topN);
  return sorted;
}

function computeAudioProfile(rows, genres, audioKeys) {
  const genreSet = new Set(genres);
  const byGenre  = d3.group(
    rows.filter(d => genreSet.has(d.track_genre)),
    d => d.track_genre
  );

  const result = {};
  genres.forEach(genre => {
    const genreRows = byGenre.get(genre) || [];
    result[genre] = {};
    audioKeys.forEach(key => {
      result[genre][key] = d3.mean(genreRows, d => normalizeAudio(key, d[key])) ?? 0;
    });
  });
  return result;
}

function showTooltip(event, html) {
  const tip = document.getElementById("tooltip");
  tip.innerHTML = html;
  tip.style.opacity = "1";
  positionTooltip(event);
}

function moveTooltip(event) {
  positionTooltip(event);
}

function hideTooltip() {
  document.getElementById("tooltip").style.opacity = "0";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function positionTooltip(event) {
  const tip = document.getElementById("tooltip");
  const offset = 12;
  const edge = 8;
  const tipW = tip.offsetWidth;
  const tipH = tip.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = event.clientX + offset;
  let top = event.clientY - tipH - 10;

  if (left + tipW + edge > vw) left = vw - tipW - edge;
  if (left < edge) left = edge;

  if (top < edge) top = event.clientY + offset;
  if (top + tipH + edge > vh) top = vh - tipH - edge;
  if (top < edge) top = edge;

  tip.style.left = (left + window.scrollX) + "px";
  tip.style.top = (top + window.scrollY) + "px";
}
