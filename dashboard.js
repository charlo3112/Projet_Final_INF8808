const frames = Array.from(document.querySelectorAll(".frame"));

function getContentHeight(doc) {
  const body = doc.body;
  if (!body) return 0;
  const bodyTop = body.getBoundingClientRect().top;
  return Array.from(body.children).reduce((height, element) => {
    const style = doc.defaultView.getComputedStyle(element);
    if (style.position === "absolute" || style.position === "fixed") return height;
    const rect = element.getBoundingClientRect();
    const marginBottom = parseFloat(style.marginBottom) || 0;
    return Math.max(height, rect.bottom - bodyTop + marginBottom);
  }, 0);
}

function resizeFrame(frame) {
  const doc = frame.contentDocument;
  if (!doc) return;
  doc.documentElement.style.removeProperty("--frame-height");
  const nextHeight = Math.ceil(getContentHeight(doc));
  if (nextHeight > 0) {
    frame.dataset.contentHeight = nextHeight;
    setFrameHeight(frame, nextHeight);
  }
}

function showFrame(frame) {
  requestAnimationFrame(() => {
    resizeFrame(frame);
    syncGridFrames();
    frame.classList.add("frame-ready");
  });
}

function setFrameHeight(frame, height) {
  if (Math.abs(frame.offsetHeight - height) > 1) {
    frame.style.height = `${height}px`;
  }
}

function syncGridFrames() {
  const genre = document.querySelector(".frame-genre");
  const features = document.querySelector(".frame-features");
  if (!genre || !features) return;

  const genreSection = genre.closest(".dashboard-section");
  const featuresSection = features.closest(".dashboard-section");
  const sameRow = genreSection && featuresSection && genreSection.offsetTop === featuresSection.offsetTop;
  const genreHeight = Number(genre.dataset.contentHeight) || genre.offsetHeight;
  const featuresHeight = Number(features.dataset.contentHeight) || features.offsetHeight;

  if (!sameRow) {
    setFrameHeight(genre, genreHeight);
    setFrameHeight(features, featuresHeight);
    return;
  }

  const height = Math.max(genreHeight, featuresHeight);
  setFrameHeight(genre, height);
  setFrameHeight(features, height);

  const doc = features.contentDocument;
  if (doc) {
    doc.documentElement.style.setProperty("--frame-height", `${height}px`);
  }
}

function resizeFrames() {
  frames.forEach(resizeFrame);
  syncGridFrames();
}

frames.forEach((frame) => {
  frame.addEventListener("load", () => {
    frame.classList.remove("frame-ready");
    resizeFrames();
    setTimeout(resizeFrames, 200);
    setTimeout(() => showFrame(frame), 2500);
  });
});

window.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "viz-ready") return;
  const frame = frames.find(item => item.contentWindow === event.source);
  if (frame) showFrame(frame);
});

window.addEventListener("resize", () => {
  resizeFrames();
});

setInterval(() => {
  resizeFrames();
}, 1200);
