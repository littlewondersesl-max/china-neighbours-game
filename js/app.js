import { makeLaea, buildMesh, boundsOfFeature, pairKey, screenPath, linePath, absLinePath } from "./geo.js";
import { createView } from "./gl.js";

const SIZE_TOL = 0.07;
const POS_TOL_KM = 180;
const MIN_KMPP = 0.8;
const MAX_KMPP = 40;
const CHINA_TOP = ["RUS", "KAZ", "MNG", "KGZ", "TJK", "AFG", "PAK"];
const CHINA_BOTTOM = ["IND", "NPL", "BTN", "MMR", "LAO", "VNM", "PRK"];
const PALETTE = ["#c4b07a", "#8fb08a", "#d2a07a", "#9eb4c8", "#c9b48a", "#a8c4a2", "#e0c98a", "#b7a48a"];
const CONT_ZH = {
  Africa: "非洲", Europe: "欧洲", "North America": "北美洲", "South America": "南美洲",
  Oceania: "大洋洲", Antarctica: "南极洲", Asia: "亚洲", "Seven seas (open ocean)": "海洋",
};
const SLOTS = [
  ["animal", "National animal", "代表动物"],
  ["currency", "Currency", "货币"],
  ["landmark", "Famous place", "著名地点"],
  ["dish", "Popular dish", "美食"],
];
const ASIA_LON = 95;
const ASIA_LAT = 35;
const ALIASES = {
  ARE: ["UAE", "U.A.E.", "Emirates", "the Emirates", "阿拉伯联合酋长国"],
  BGD: ["孟加拉"],
  BRN: ["Brunei Darussalam"],
  CHN: ["PRC", "People's Republic of China", "中华人民共和国"],
  IDN: ["印尼"],
  KAZ: ["哈萨克"],
  KGZ: ["Kirghizia", "吉尔吉斯"],
  KHM: ["Kampuchea"],
  KOR: ["Korea", "South Korea", "Republic of Korea", "ROK", "南韩", "大韩民国"],
  LAO: ["Lao"],
  MMR: ["Burma"],
  MNG: ["蒙古"],
  PRK: ["North Korea", "DPRK", "Democratic People's Republic of Korea", "北韩"],
  PSX: ["State of Palestine"],
  RUS: ["Russian Federation", "俄国"],
  SAU: ["Saudi", "沙特"],
  TJK: ["塔吉克"],
  TKM: ["土库曼"],
  TLS: ["East Timor", "Timor Leste"],
  TUR: ["Turkiye", "Türkiye"],
  UZB: ["乌兹别克"],
  VNM: ["Viet Nam"],
};
const EXTRA_CAPITALS = {
  JPN: ["Tokyo", "东京", "東京都"],
  LKA: ["Sri Jayewardenepura Kotte", "Sri Jayawardenepura Kotte", "Kotte", "Colombo", "科伦坡", "斯里贾亚瓦德纳普拉科特"],
  PHL: ["Manila", "马尼拉"],
  SGP: ["Singapore", "新加坡"],
  CYP: ["Nicosia", "Lefkosia", "尼科西亚"],
  BHR: ["Manama", "麦纳麦"],
};

const $ = (id) => document.getElementById(id);
const playfield = $("playfield");
const trayTop = $("tray-top");
const trayBottom = $("tray-bottom");
const appEl = $("app");
const labelsEl = $("labels");
const handlesEl = $("handles");
const linesEl = $("lines");
const weldEl = $("weld");
const graticuleEl = $("graticule");
const titleEl = $("title");
const hintEl = $("hint");
const toastEl = $("toast");
const pctEl = $("pct");
const backBtn = $("back");
const loadingEl = $("loading");

const view = { kmPerPx: 12, originX: 0, originY: 0, width: 800, height: 600 };
const globe = { lon0: 70, lat0: 18, mul: 0.42, targetLon: 70, targetLat: 18, targetMul: 0.42 };
let mode = "world";
let playKind = "neighbours";
let centreIso = null;
let buildStart = null;
let capitalRoots = new Set();
let guideOpen = false;
let askMode = null;
let askIso = null;
let asiaIsos = [];
let asiaSet = new Set();
let nameIndex = new Map();
let proj = null;
let meshes = new Map();
let seamKm = new Map();
let pieces = new Map();
let selected = null;
let spaceDown = false;
let drag = null;
let busy = false;
let cardsOpen = false;
let cardIndex = 0;
let cardIso = null;
let rewarded = false;
let rewardTimer = 0;
let rewardIndex = 0;
let rewardSlides = [];
let weldToken = 0;
let drawQueued = false;
let globeAnimating = false;

let worldFeatures = [];
let shapeByIso = new Map();
let borders = null;
let rivers = null;
let cards = null;
let mainGL = null;
let cardGL = null;
let thumbGL = null;
let reliefImage = null;
const thumbCache = new Map();

const d3 = globalThis.d3;
const ortho = d3.geoOrthographic().clipAngle(90).precision(0.4);

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function requestDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    draw();
  });
}

function loadJSON(url) {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error("Could not load " + url);
    return r.json();
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(url));
    img.src = url;
  });
}

async function init() {
  try {
    mainGL = createView($("gl"));
    cardGL = createView($("card-gl"));
    thumbGL = createView(document.createElement("canvas"), { preserve: true });
    const [world, shapes, borderData, riverData, cardData, relief] = await Promise.all([
      loadJSON("data/world.json"),
      loadJSON("data/shapes.json"),
      loadJSON("data/borders.json"),
      loadJSON("data/rivers.json"),
      loadJSON("data/cards.json"),
      loadImage("assets/relief.jpg"),
    ]);
    borders = borderData;
    rivers = riverData;
    cards = cardData;
    reliefImage = relief;
    worldFeatures = world.features;
    for (const f of worldFeatures) f._b = boundsOfFeature(f);
    for (const f of shapes.features) shapeByIso.set(f.properties.iso, f);
    indexNames();
    mainGL.setRelief(relief);
    cardGL.setRelief(relief);
    thumbGL.setRelief(relief);
    bind();
    const params = new URLSearchParams(location.search);
    const jump = (params.get("centre") || "").toUpperCase();
    if (jump && borders.neighbours[jump] && borders.neighbours[jump].length) enterPuzzle(jump);
    else enterWorld();
    loadingEl.hidden = true;
    requestDraw();
  } catch (err) {
    loadingEl.textContent = err.message || "The map could not start.";
    console.error(err);
  }
}

function bind() {
  playfield.addEventListener("pointerdown", onPlayDown);
  playfield.addEventListener("wheel", onWheel, { passive: false });
  playfield.addEventListener("contextmenu", (e) => e.preventDefault());
  backBtn.addEventListener("click", () => back());
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") { spaceDown = true; e.preventDefault(); }
    if (e.key === "Escape") onEsc();
  });
  window.addEventListener("keyup", (e) => { if (e.code === "Space") spaceDown = false; });
  window.addEventListener("resize", requestDraw);
  new ResizeObserver(requestDraw).observe(playfield);
  toastEl.addEventListener("click", () => { toastEl.hidden = true; });
  $("puzzle-tools").addEventListener("pointerdown", (e) => e.stopPropagation());
  $("mode-choice").addEventListener("pointerdown", (e) => e.stopPropagation());
  $("reveal-map").addEventListener("click", () => setGuideOpen(!guideOpen));
  $("guide-close").addEventListener("click", () => setGuideOpen(false));
  $("name-entry").addEventListener("click", () => openAsk("name"));
  $("choose-neighbours").addEventListener("click", chooseNeighbours);
  $("choose-build").addEventListener("click", () => openAsk("start"));
  $("ask-form").addEventListener("submit", onAskSubmit);
  $("ask-cancel").addEventListener("click", closeAsk);
  $("card-modal").addEventListener("click", onCardClick);
  $("reward-back").addEventListener("click", closeReward);
  $("reward").addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    advanceReward(true);
  });
  buildPhotoGrid();
}

function onEsc() {
  if (!$("reward").hidden) { closeReward(); return; }
  if (cardsOpen) { closeCards(); return; }
  if (!$("ask").hidden) closeAsk();
}

function showToast(en, zh) {
  toastEl.innerHTML = `<strong>${en}</strong><span>${zh}</span>`;
  toastEl.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toastEl.hidden = true; }, 4200);
}

function setMode(next) {
  mode = next;
  appEl.classList.remove("mode-world", "mode-asia", "mode-puzzle", "mode-build", "one-tray", "guide-open");
  appEl.classList.add("mode-" + next);
  if (next === "puzzle" && playKind === "build") appEl.classList.add("mode-build");
  backBtn.hidden = next === "world";
  $("mode-choice").hidden = next !== "asia";
  $("puzzle-tools").hidden = next !== "puzzle";
  toastEl.hidden = true;
  if (next !== "puzzle") guideOpen = false;
  syncGuide();
  syncTools();
}

function syncGuide() {
  const show = mode === "puzzle" && guideOpen;
  appEl.classList.toggle("guide-open", show);
  $("guide").hidden = !show;
  const btn = $("reveal-map");
  btn.textContent = show ? "Hide map · 收起地图" : "Reveal map · 显示地图";
  btn.setAttribute("aria-pressed", show ? "true" : "false");
}

function setGuideOpen(open) {
  if (mode !== "puzzle") return;
  guideOpen = !!open;
  syncGuide();
  requestDraw();
}

function syncTools() {
  const build = mode === "puzzle" && playKind === "build";
  $("name-entry").hidden = !build;
  $("skip-wrap").hidden = !build;
  if (!build) $("progress").hidden = true;
}

function enterWorld() {
  closeCards();
  closeReward();
  closeAsk();
  playKind = "neighbours";
  buildStart = null;
  capitalRoots = new Set();
  setMode("world");
  centreIso = null;
  pieces.clear();
  meshes.clear();
  globe.targetLon = 70;
  globe.targetLat = 18;
  globe.targetMul = 0.42;
  titleEl.innerHTML = `<b>Land Neighbours</b><span>陆地邻国</span>`;
  hintEl.textContent = "Drag to spin the globe · click a continent · 拖动旋转，点击大洲";
  document.title = "Land Neighbours";
  animateGlobe();
  requestDraw();
}

function enterAsia() {
  closeCards();
  closeReward();
  closeAsk();
  playKind = "neighbours";
  buildStart = null;
  capitalRoots = new Set();
  setMode("asia");
  centreIso = null;
  pieces.clear();
  meshes.clear();
  trayTop.innerHTML = "";
  trayBottom.innerHTML = "";
  globe.targetLon = 90;
  globe.targetLat = 28;
  globe.targetMul = 0.92;
  titleEl.innerHTML = `<b>Asia</b><span>亚洲</span>`;
  hintEl.textContent = "";
  document.title = "Asia — Land Neighbours";
  animateGlobe();
  requestDraw();
}

function chooseNeighbours() {
  if (mode !== "asia") enterAsia();
  hintEl.textContent = "Click a country to start its neighbour puzzle · 点击国家，拼它的邻国";
}

function back() {
  if (mode === "puzzle") enterAsia();
  else if (mode === "asia") enterWorld();
}

function animateGlobe() {
  if (globeAnimating) return;
  globeAnimating = true;
  const step = () => {
    if (mode === "puzzle") { globeAnimating = false; return; }
    globe.lon0 += (globe.targetLon - globe.lon0) * 0.16;
    globe.lat0 += (globe.targetLat - globe.lat0) * 0.16;
    globe.mul += (globe.targetMul - globe.mul) * 0.16;
    requestDraw();
    const done = Math.abs(globe.targetLon - globe.lon0) < 0.08
      && Math.abs(globe.targetLat - globe.lat0) < 0.08
      && Math.abs(globe.targetMul - globe.mul) < 0.004;
    if (done) globeAnimating = false;
    else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function normName(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, "and")
    .replace(/['’".]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "");
}

function indexNames() {
  asiaIsos = [];
  asiaSet = new Set();
  nameIndex = new Map();
  for (const [iso, feature] of shapeByIso) {
    if (feature.properties.continent === "Asia") {
      asiaIsos.push(iso);
      asiaSet.add(iso);
    }
    addName(feature.properties.name, iso);
    addName(feature.properties.zh, iso);
  }
  for (const [iso, list] of Object.entries(ALIASES)) {
    if (!shapeByIso.has(iso)) continue;
    for (const alias of list) addName(alias, iso);
  }
  asiaIsos.sort();
}

function addName(raw, iso) {
  const key = normName(raw);
  if (!key || nameIndex.has(key)) return;
  nameIndex.set(key, iso);
}

function lookupCountry(raw) {
  const key = normName(raw);
  if (!key) return { kind: "empty" };
  const iso = nameIndex.get(key);
  if (!iso) return { kind: "unknown" };
  const meta = shapeByIso.get(iso).properties;
  if (!asiaSet.has(iso)) return { kind: "not-asia", iso, meta };
  return { kind: "asia", iso, meta };
}

function capitalAnswers(iso) {
  const list = [];
  const card = cards[iso];
  if (card?.capital) list.push(card.capital.en, card.capital.zh);
  if (EXTRA_CAPITALS[iso]) list.push(...EXTRA_CAPITALS[iso]);
  return list;
}

function capitalMatches(iso, raw) {
  const key = normName(raw);
  if (!key) return false;
  return capitalAnswers(iso).some((name) => normName(name) === key);
}

function asiaNeighbours(iso) {
  return (borders.neighbours[iso] || []).filter((id) => asiaSet.has(id));
}

function anchorSet() {
  const locked = new Set();
  for (const [iso, piece] of pieces) if (piece.locked) locked.add(iso);
  const seen = new Set();
  const queue = [];
  const seed = (iso) => {
    if (!iso || !locked.has(iso) || seen.has(iso)) return;
    seen.add(iso);
    queue.push(iso);
  };
  seed(buildStart);
  for (const iso of capitalRoots) seed(iso);
  while (queue.length) {
    const cur = queue.pop();
    for (const next of asiaNeighbours(cur)) seed(next);
  }
  return seen;
}

function touchesChain(iso) {
  const anchors = anchorSet();
  return asiaNeighbours(iso).some((id) => anchors.has(id));
}

function placedCount() {
  let n = 0;
  for (const iso of asiaIsos) if (pieces.get(iso)?.locked) n += 1;
  return n;
}

function updateProgress() {
  if (playKind !== "build" || mode !== "puzzle") return;
  const el = $("progress");
  el.hidden = false;
  el.textContent = `${placedCount()} / ${asiaIsos.length} placed · 已放好`;
}

function skippingCards() {
  return playKind === "build" && $("skip-cards").checked;
}

function finishPlacement(iso) {
  updateProgress();
  if (skippingCards() || !cards[iso]) {
    maybeReward();
    return;
  }
  openCards(iso);
}

function maybeReward() {
  if (allLocked() && !rewarded && mode === "puzzle") {
    rewarded = true;
    showReward();
  }
}

function centreLonLat(iso) {
  if (iso === "CHN") return [100, 40];
  return shapeByIso.get(iso).properties.label.slice();
}

function enterPuzzle(iso) {
  closeCards();
  closeReward();
  closeAsk();
  rewarded = false;
  playKind = "neighbours";
  buildStart = null;
  capitalRoots = new Set();
  guideOpen = false;
  centreIso = iso;
  setMode("puzzle");
  const [lon0, lat0] = centreLonLat(iso);
  proj = makeLaea(lon0, lat0);
  const nbs = borders.neighbours[iso].slice();
  const need = [iso, ...nbs];
  meshes = new Map();
  thumbCache.clear();
  for (const id of need) {
    const feature = shapeByIso.get(id);
    meshes.set(id, buildMesh(feature, proj, rivers[id] || []));
  }
  seamKm = new Map();
  for (const [key, lines] of Object.entries(borders.seams)) {
    const [a, b] = key.split("|");
    if (!need.includes(a) || !need.includes(b)) continue;
    const projected = [];
    for (const line of lines) {
      const out = [];
      for (const [lon, lat] of line) {
        const xy = proj.forward(lon, lat);
        if (!xy) { out.length = 0; break; }
        out.push(xy);
      }
      if (out.length >= 2) projected.push(out);
    }
    if (projected.length) seamKm.set(key, projected);
  }
  pieces = new Map();
  const centreMesh = meshes.get(iso);
  pieces.set(iso, { iso, cx: centreMesh.cx, cy: centreMesh.cy, scale: 1, locked: true, fixed: true });
  selected = null;
  const trays = trayLayout(iso, nbs);
  if (!trays.bottom.length) appEl.classList.add("one-tray");
  buildTrays(trays, false);
  buildGuide(need);
  const meta = shapeByIso.get(iso).properties;
  titleEl.innerHTML = `<b>${meta.name}'s land neighbours</b><span>${meta.zh}的陆地邻国</span>`;
  hintEl.textContent = "Scroll = zoom · drag a corner to resize · drag empty map / right-drag / Space+drag = pan";
  document.title = `${meta.name} — Land Neighbours`;
  requestAnimationFrame(() => {
    fitMesh(centreMesh, 0.14);
    requestDraw();
  });
}

function enterBuild(iso) {
  closeCards();
  closeReward();
  closeAsk();
  rewarded = false;
  playKind = "build";
  buildStart = iso;
  capitalRoots = new Set();
  guideOpen = false;
  centreIso = iso;
  setMode("puzzle");
  appEl.classList.add("one-tray");
  proj = makeLaea(ASIA_LON, ASIA_LAT);
  const need = asiaIsos.slice();
  meshes = new Map();
  thumbCache.clear();
  for (const id of need) {
    const feature = shapeByIso.get(id);
    meshes.set(id, buildMesh(feature, proj, rivers[id] || []));
  }
  seamKm = new Map();
  for (const [key, lines] of Object.entries(borders.seams)) {
    const [a, b] = key.split("|");
    if (!asiaSet.has(a) || !asiaSet.has(b)) continue;
    const projected = [];
    for (const line of lines) {
      const out = [];
      for (const [lon, lat] of line) {
        const xy = proj.forward(lon, lat);
        if (!xy) { out.length = 0; break; }
        out.push(xy);
      }
      if (out.length >= 2) projected.push(out);
    }
    if (projected.length) seamKm.set(key, projected);
  }
  pieces = new Map();
  const startMesh = meshes.get(iso);
  pieces.set(iso, { iso, cx: startMesh.cx, cy: startMesh.cy, scale: 1, locked: true, fixed: true });
  selected = null;
  const rest = shuffle(need.filter((id) => id !== iso));
  buildTrays({ top: rest, bottom: [] }, true);
  buildGuide(need);
  const meta = shapeByIso.get(iso).properties;
  titleEl.innerHTML = `<b>Build Asia</b><span>拼出亚洲 · 从${meta.zh}开始</span>`;
  hintEl.textContent = "A shape locks only when it touches the chain · or enter a name and its capital · 形状要连上已放好的国家，或输入国名和首都";
  document.title = "Build Asia · 拼出亚洲";
  updateProgress();
  requestAnimationFrame(() => {
    fitIds(need, 0.08);
    requestDraw();
  });
}

function trayLayout(iso, nbs) {
  if (iso === "CHN") return { top: CHINA_TOP.slice(), bottom: CHINA_BOTTOM.slice() };
  const c = shapeByIso.get(iso).properties.label;
  const sorted = nbs.slice().sort((a, b) => bearing(c, shapeByIso.get(a).properties.label) - bearing(c, shapeByIso.get(b).properties.label));
  if (sorted.length <= 7) return { top: sorted, bottom: [] };
  const mid = Math.ceil(sorted.length / 2);
  return { top: sorted.slice(0, mid), bottom: sorted.slice(mid) };
}

function bearing(a, b) {
  const r = Math.PI / 180;
  const lat1 = a[1] * r, lat2 = b[1] * r, dLon = (b[0] - a[0]) * r;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.atan2(y, x);
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = arr[i];
    arr[i] = arr[j];
    arr[j] = swap;
  }
  return arr;
}

function thumbHtml(iso) {
  const cached = thumbCache.get(iso);
  if (cached) return cached;
  const mesh = meshes.get(iso);
  const size = 256;
  const pad = 0.86;
  const kmpp = Math.max(mesh.width / (size * pad), mesh.height / (size * pad)) || 1;
  const thumbView = {
    width: size,
    height: size,
    kmPerPx: kmpp,
    originX: mesh.cx - (size * kmpp) / 2,
    originY: mesh.cy - (size * kmpp) / 2,
  };
  thumbGL.resize(size, size);
  thumbGL.drawPieces([{ mesh, cx: mesh.cx, cy: mesh.cy, scale: 1 }], thumbView, { shadow: false });
  const url = thumbGL.gl.canvas.toDataURL("image/png");
  const outline = screenPath(mesh.rings, { cx: mesh.cx, cy: mesh.cy, scale: 1 }, thumbView);
  const html = `<span class="thumb"><img alt="" src="${url}"><svg viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${outline}"/></svg></span>`;
  thumbCache.set(iso, html);
  return html;
}

function buildTrays(trays, nameless) {
  trayTop.innerHTML = "";
  trayBottom.innerHTML = "";
  const make = (iso) => {
    const meta = shapeByIso.get(iso).properties;
    const tile = document.createElement("div");
    tile.className = "tray-tile";
    tile.dataset.code = iso;
    const name = nameless ? "" : `<div class="name">${meta.name}<small>${meta.zh}</small></div>`;
    tile.innerHTML = `${thumbHtml(iso)}${name}`;
    if (nameless) tile.setAttribute("aria-label", "Piece");
    tile.addEventListener("pointerdown", (e) => startTrayDrag(e, iso));
    return tile;
  };
  trays.top.forEach((iso) => trayTop.appendChild(make(iso)));
  trays.bottom.forEach((iso) => trayBottom.appendChild(make(iso)));
}

function markTray(iso, used) {
  document.querySelectorAll(`.tray-tile[data-code="${iso}"]`).forEach((el) => el.classList.toggle("used", used));
}

function buildGuide(ids) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ids) {
    const m = meshes.get(id);
    minX = Math.min(minX, m.minX); minY = Math.min(minY, m.minY);
    maxX = Math.max(maxX, m.maxX); maxY = Math.max(maxY, m.maxY);
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const pad = span * 0.05;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const parts = [];
  ids.forEach((id, i) => {
    const m = meshes.get(id);
    const meta = m.feature.properties;
    let d = "";
    for (const ring of m.rings) {
      for (let k = 0; k < ring.length; k++) {
        const x = m.cx + ring[k][0];
        const y = m.cy + ring[k][1];
        d += (k ? "L" : "M") + x.toFixed(1) + " " + (-y).toFixed(1) + " ";
      }
      d += "Z ";
    }
    const fill = id === centreIso ? "#6f9468" : PALETTE[i % PALETTE.length];
    parts.push(`<path d="${d}" fill="${fill}" stroke="#1c2a24" stroke-width="${(span / 520).toFixed(2)}"><title>${meta.name} · ${meta.zh}</title></path>`);
    const labelCut = playKind === "build" ? 0.018 : 0.07;
    if (m.width > span * labelCut) {
      parts.push(`<text x="${m.cx.toFixed(1)}" y="${(-m.cy).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${(span / 38).toFixed(1)}" fill="#1b2420">${meta.name}</text>`);
    }
  });
  $("guide-svg-wrap").innerHTML = `<svg viewBox="${minX.toFixed(1)} ${(-maxY).toFixed(1)} ${(maxX - minX).toFixed(1)} ${(maxY - minY).toFixed(1)}">${parts.join("")}</svg>`;
}

function fitMesh(mesh, pad) {
  fitBox(mesh.minX, mesh.minY, mesh.maxX, mesh.maxY, pad);
}

function fitIds(ids, pad) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ids) {
    const mesh = meshes.get(id);
    if (!mesh) continue;
    minX = Math.min(minX, mesh.minX);
    minY = Math.min(minY, mesh.minY);
    maxX = Math.max(maxX, mesh.maxX);
    maxY = Math.max(maxY, mesh.maxY);
  }
  if (!Number.isFinite(minX)) return;
  fitBox(minX, minY, maxX, maxY, pad);
}

function fitBox(minX, minY, maxX, maxY, pad) {
  const w = playfield.clientWidth || view.width;
  const h = playfield.clientHeight || view.height;
  view.width = w;
  view.height = h;
  const kmpp = Math.max((maxX - minX) / (w * (1 - 2 * pad)), (maxY - minY) / (h * (1 - 2 * pad))) || 1;
  view.kmPerPx = clamp(kmpp, MIN_KMPP, MAX_KMPP);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  view.originX = cx - (w * view.kmPerPx) / 2;
  view.originY = cy - (h * view.kmPerPx) / 2;
}

function drawOrder() {
  const list = [];
  if (pieces.has(centreIso)) list.push(pieces.get(centreIso));
  for (const [iso, piece] of pieces) {
    if (iso !== centreIso && iso !== selected) list.push(piece);
  }
  if (selected && pieces.has(selected) && selected !== centreIso) list.push(pieces.get(selected));
  return list;
}

function draw() {
  const w = playfield.clientWidth;
  const h = playfield.clientHeight;
  if (w < 2 || h < 2) return;
  view.width = w;
  view.height = h;
  mainGL.resize(w, h);
  if (mode === "puzzle" && proj) {
    const order = drawOrder();
    mainGL.drawPieces(order.map((p) => ({
      mesh: meshes.get(p.iso), cx: p.cx, cy: p.cy, scale: p.scale,
    })), view);
    drawPuzzleLines(order);
    drawLabels(order);
    drawHandles();
    graticuleEl.innerHTML = puzzleGraticule();
  } else {
    const radius = globeRadius();
    mainGL.drawGlobe(globe.lon0, globe.lat0, radius, w, h);
    drawGlobeLines(radius);
    labelsEl.innerHTML = "";
    handlesEl.innerHTML = "";
    graticuleEl.innerHTML = "";
  }
}

function globeRadius() {
  return Math.min(view.width, view.height) * globe.mul;
}

function drawGlobeLines(radius) {
  ortho.rotate([-globe.lon0, -globe.lat0]).translate([view.width / 2, view.height / 2]).scale(radius);
  const path = d3.geoPath(ortho);
  const grat = d3.geoGraticule10();
  let html = `<path class="graticule" d="${path(grat) || ""}"/>`;
  html += `<path class="sphere" d="${path({ type: "Sphere" }) || ""}"/>`;
  for (const f of worldFeatures) {
    const d = path(f);
    if (!d) continue;
    const asia = f.properties.continent === "Asia";
    const dim = mode === "asia" && !asia;
    html += `<path class="country-stroke${asia ? " asia" : ""}${dim ? " dim" : ""}" d="${d}"/>`;
  }
  linesEl.innerHTML = html;
}

function puzzleGraticule() {
  if (!proj) return "";
  const parts = [];
  const add = (pts) => {
    let d = "";
    let open = false;
    for (const [lon, lat] of pts) {
      const xy = proj.forward(lon, lat);
      if (!xy) { open = false; continue; }
      const sx = (xy[0] - view.originX) / view.kmPerPx;
      const sy = view.height - (xy[1] - view.originY) / view.kmPerPx;
      if (sx < -200 || sy < -200 || sx > view.width + 200 || sy > view.height + 200) { open = false; continue; }
      d += (open ? "L" : "M") + sx.toFixed(1) + " " + sy.toFixed(1) + " ";
      open = true;
    }
    if (d) parts.push(`<path d="${d}"/>`);
  };
  for (let lon = -180; lon <= 180; lon += 15) {
    const pts = [];
    for (let lat = -70; lat <= 80; lat += 4) pts.push([lon, lat]);
    add(pts);
  }
  for (let lat = -60; lat <= 80; lat += 15) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 4) pts.push([lon, lat]);
    add(pts);
  }
  return parts.join("");
}

function drawPuzzleLines(order) {
  let html = "";
  for (const piece of order) {
    const mesh = meshes.get(piece.iso);
    const riversD = linePath(mesh.rivers, piece, view);
    if (riversD) html += `<path class="river" d="${riversD}"/>`;
    const outline = screenPath(mesh.rings, piece, view);
    html += `<path class="outline${piece.fixed ? " centre" : ""}${piece.locked ? " locked" : ""}" d="${outline}"/>`;
  }
  linesEl.innerHTML = html;
}

function drawLabels(order) {
  let html = "";
  for (const piece of order) {
    const mesh = meshes.get(piece.iso);
    const sx = (piece.cx - view.originX) / view.kmPerPx;
    const sy = view.height - (piece.cy - view.originY) / view.kmPerPx;
    if (playKind === "build" && !piece.locked) continue;
    const wpx = mesh.width * piece.scale / view.kmPerPx;
    if (playKind !== "build" && wpx < 36 && piece.iso !== selected) continue;
    const meta = mesh.feature.properties;
    html += `<div class="map-label" style="left:${sx}px;top:${sy}px"><b>${meta.name}</b><span>${meta.zh}</span></div>`;
  }
  labelsEl.innerHTML = html;
}

function drawHandles() {
  if (!selected || !pieces.has(selected) || pieces.get(selected).locked || cardsOpen) {
    handlesEl.innerHTML = "";
    return;
  }
  const piece = pieces.get(selected);
  const mesh = meshes.get(selected);
  const corners = {
    nw: screenOf(piece.cx + piece.scale * mesh.relMinX, piece.cy + piece.scale * mesh.relMaxY),
    ne: screenOf(piece.cx + piece.scale * mesh.relMaxX, piece.cy + piece.scale * mesh.relMaxY),
    sw: screenOf(piece.cx + piece.scale * mesh.relMinX, piece.cy + piece.scale * mesh.relMinY),
    se: screenOf(piece.cx + piece.scale * mesh.relMaxX, piece.cy + piece.scale * mesh.relMinY),
  };
  handlesEl.innerHTML = Object.entries(corners).map(([name, p]) =>
    `<div class="handle ${name}" data-corner="${name}" style="left:${p.x}px;top:${p.y}px"></div>`).join("");
  handlesEl.querySelectorAll(".handle").forEach((el) => {
    el.addEventListener("pointerdown", (e) => startResize(e, selected, el.dataset.corner));
  });
}

function screenOf(x, y) {
  return {
    x: (x - view.originX) / view.kmPerPx,
    y: view.height - (y - view.originY) / view.kmPerPx,
  };
}

function pxToGeo(x, y) {
  return {
    gx: view.originX + x * view.kmPerPx,
    gy: view.originY + (view.height - y) * view.kmPerPx,
  };
}

function localPoint(e) {
  const r = playfield.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function hitTest(px, py) {
  if (mode !== "puzzle" || !proj) return null;
  const geo = pxToGeo(px, py);
  const order = drawOrder().slice().reverse();
  for (const piece of order) {
    const mesh = meshes.get(piece.iso);
    const ax = mesh.cx + (geo.gx - piece.cx) / piece.scale;
    const ay = mesh.cy + (geo.gy - piece.cy) / piece.scale;
    const ll = proj.inverse(ax, ay);
    if (d3.geoContains(mesh.feature, ll)) return piece.iso;
  }
  return null;
}

function globePick(px, py) {
  const radius = globeRadius();
  const dx = px - view.width / 2;
  const dy = py - view.height / 2;
  if (dx * dx + dy * dy > radius * radius) return null;
  ortho.rotate([-globe.lon0, -globe.lat0]).translate([view.width / 2, view.height / 2]).scale(radius);
  const ll = ortho.invert([px, py]);
  if (!ll || Number.isNaN(ll[0])) return null;
  for (const f of worldFeatures) {
    const b = f._b;
    if (ll[0] < b[0] || ll[0] > b[2] || ll[1] < b[1] || ll[1] > b[3]) continue;
    if (d3.geoContains(f, ll)) return f;
  }
  return null;
}

function onPlayDown(e) {
  if (e.target.closest("button") || e.target.closest("#toast") || e.target.closest(".handle")) return;
  if (e.target.closest("#puzzle-tools") || e.target.closest("#mode-choice") || e.target.closest("#ask")) return;
  if (cardsOpen || !$("reward").hidden || busy) return;
  if (mode !== "puzzle") { startGlobeDrag(e); return; }
  const p = localPoint(e);
  if (spaceDown || e.button === 1 || e.button === 2) { startPan(e); return; }
  if (e.button !== 0) return;
  const iso = hitTest(p.x, p.y);
  if (!iso) { startPan(e); return; }
  const piece = pieces.get(iso);
  if (piece.locked) { openCards(iso); return; }
  startMove(e, iso);
}

function track(pointerId, move, up) {
  const onMove = (e) => { if (e.pointerId === pointerId) move(e); };
  const onUp = (e) => {
    if (e.pointerId !== pointerId) return;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    up(e);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

function startGlobeDrag(e) {
  const startX = e.clientX, startY = e.clientY;
  const lon = globe.lon0, lat = globe.lat0;
  let moved = false;
  track(e.pointerId, (ev) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (Math.hypot(dx, dy) > 5) moved = true;
    const radius = Math.max(80, globeRadius());
    const deg = 180 / radius;
    globe.lon0 = lon - dx * deg;
    globe.lat0 = clamp(lat + dy * deg, -75, 75);
    globe.targetLon = globe.lon0;
    globe.targetLat = globe.lat0;
    globe.targetMul = globe.mul;
    requestDraw();
  }, () => {
    if (!moved) onGlobeClick(localPoint(e));
  });
}

function onGlobeClick(p) {
  const f = globePick(p.x, p.y);
  if (!f) return;
  const iso = f.properties.iso;
  const continent = f.properties.continent;
  if (mode === "world") {
    if (continent === "Asia") enterAsia();
    else {
      const zh = CONT_ZH[continent] || continent;
      showToast(`Coming soon — ${continent}`, `即将推出 · ${zh} · 制作中`);
    }
    return;
  }
  if (continent !== "Asia") return;
  const nbs = borders.neighbours[iso];
  if (!nbs || !nbs.length) {
    const name = f.properties.name;
    const zh = f.properties.zh;
    showToast(`${name} has no land neighbours.`, `${zh}没有陆地邻国。`);
    return;
  }
  enterPuzzle(iso);
}

function startPan(e) {
  const originX = view.originX, originY = view.originY;
  const startX = e.clientX, startY = e.clientY;
  playfield.classList.add("panning");
  track(e.pointerId, (ev) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    view.originX = originX - dx * view.kmPerPx;
    view.originY = originY + dy * view.kmPerPx;
    requestDraw();
  }, () => playfield.classList.remove("panning"));
}

function startTrayDrag(e, iso) {
  if (cardsOpen || busy) return;
  if (pieces.has(iso)) return;
  e.preventDefault();
  let started = false;
  track(e.pointerId, (ev) => {
    if (started) return;
    const r = playfield.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
    started = true;
    createPiece(iso, ev.clientX, ev.clientY);
    startMove(ev, iso);
  }, () => {});
}

function createPiece(iso, clientX, clientY) {
  const mesh = meshes.get(iso);
  const hint = trayHint();
  const correctW = mesh.width / view.kmPerPx;
  const aspect = mesh.width / Math.max(mesh.height, 0.001);
  const startW = aspect >= 1 ? hint : hint * aspect;
  const scale = startW / Math.max(correctW, 1);
  const p = localPoint({ clientX, clientY });
  const geo = pxToGeo(p.x, p.y);
  const piece = { iso, cx: geo.gx, cy: geo.gy, scale, locked: false, fixed: false };
  pieces.set(iso, piece);
  markTray(iso, true);
  selected = iso;
  showPct(piece, clientX, clientY);
  requestDraw();
  return piece;
}

function trayHint() {
  const tile = trayTop.querySelector(".tray-tile") || trayBottom.querySelector(".tray-tile");
  const tw = tile ? tile.clientWidth - 16 : 100;
  return Math.max(64, Math.min(120, tw * 0.92));
}

function startMove(e, iso) {
  const piece = pieces.get(iso);
  if (!piece || piece.locked) return;
  selected = iso;
  const p = localPoint(e);
  const geo = pxToGeo(p.x, p.y);
  const offGx = piece.cx - geo.gx;
  const offGy = piece.cy - geo.gy;
  showPct(piece, e.clientX, e.clientY);
  track(e.pointerId, (ev) => {
    const lp = localPoint(ev);
    const g = pxToGeo(lp.x, lp.y);
    piece.cx = g.gx + offGx;
    piece.cy = g.gy + offGy;
    showPct(piece, ev.clientX, ev.clientY);
    requestDraw();
  }, () => endGesture(piece, e));
}

function startResize(e, iso, corner) {
  if (cardsOpen || busy) return;
  const piece = pieces.get(iso);
  if (!piece || piece.locked) return;
  e.preventDefault();
  e.stopPropagation();
  selected = iso;
  const mesh = meshes.get(iso);
  const startX = e.clientX, startY = e.clientY;
  const startScale = piece.scale;
  const aspect = mesh.width / Math.max(mesh.height, 0.001);
  showPct(piece, e.clientX, e.clientY);
  track(e.pointerId, (ev) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    let dW = (corner === "se" || corner === "ne") ? dx : -dx;
    const dySign = corner.includes("n") ? -1 : 1;
    if (Math.abs(dy) > Math.abs(dx)) dW = dySign * dy * aspect;
    const correctW = mesh.width / view.kmPerPx;
    piece.scale = clamp(startScale + dW / correctW, 0.02, 8);
    showPct(piece, ev.clientX, ev.clientY);
    requestDraw();
  }, () => endGesture(piece));
}

function endGesture(piece) {
  hidePct();
  trySnap(piece);
  requestDraw();
}

function showPct(piece, clientX, clientY) {
  const p = Math.round(piece.scale * 100);
  pctEl.textContent = p + "%";
  pctEl.hidden = false;
  pctEl.style.left = clientX + 14 + "px";
  pctEl.style.top = clientY + 14 + "px";
  pctEl.classList.toggle("good", Math.abs(piece.scale - 1) <= SIZE_TOL);
}

function hidePct() { pctEl.hidden = true; }

function trySnap(piece) {
  if (piece.locked || piece.fixed) return;
  const sizeOk = Math.abs(piece.scale - 1) <= SIZE_TOL;
  if (sizeOk) piece.scale = 1;
  const mesh = meshes.get(piece.iso);
  const dist = Math.hypot(piece.cx - mesh.cx, piece.cy - mesh.cy);
  if (sizeOk && dist <= POS_TOL_KM) {
    if (playKind === "build" && !touchesChain(piece.iso)) {
      showToast(
        "This shape has to touch a country already on the chain.",
        "这块要和已经连上的国家接壤，才能放好。",
      );
      return;
    }
    piece.scale = 1;
    piece.cx = mesh.cx;
    piece.cy = mesh.cy;
    piece.locked = true;
    if (selected === piece.iso) selected = null;
    updateProgress();
    playWeld(piece.iso, () => finishPlacement(piece.iso));
  }
}

function playWeld(iso, done) {
  const lines = [];
  const pool = playKind === "build"
    ? asiaNeighbours(iso)
    : [centreIso, ...(borders.neighbours[centreIso] || [])];
  const mates = pool.filter((id) => id !== iso && pieces.get(id)?.locked);
  for (const other of mates) {
    const segs = seamKm.get(pairKey(iso, other));
    if (segs) lines.push(...segs);
  }
  const token = ++weldToken;
  if (!lines.length) { done(); return; }
  busy = true;
  const d = absLinePath(lines, view);
  weldEl.innerHTML = `<path class="weld-glow" pathLength="100" d="${d}"/><path class="weld-core" pathLength="100" d="${d}"/>`;
  requestDraw();
  setTimeout(() => {
    if (token !== weldToken) return;
    weldEl.innerHTML = "";
    busy = false;
    done();
  }, 1800);
}

function onWheel(e) {
  if (mode !== "puzzle" || cardsOpen) return;
  e.preventDefault();
  const p = localPoint(e);
  const before = pxToGeo(p.x, p.y);
  const factor = e.deltaY > 0 ? 1.1 : 0.9;
  view.kmPerPx = clamp(view.kmPerPx * factor, MIN_KMPP, MAX_KMPP);
  view.originX = before.gx - p.x * view.kmPerPx;
  view.originY = before.gy - (view.height - p.y) * view.kmPerPx;
  requestDraw();
}

function allLocked() {
  if (playKind === "build") return asiaIsos.every((iso) => pieces.get(iso)?.locked);
  if (!centreIso) return false;
  return borders.neighbours[centreIso].every((iso) => pieces.get(iso)?.locked);
}

function buildPhotoGrid() {
  const root = $("card-photos");
  root.innerHTML = SLOTS.map(([slot, en, zh]) => `
    <figure class="photo-card" data-slot="${slot}">
      <div class="mat"><img alt="" /></div>
      <figcaption>
        <span class="eyebrow"><span>${en}</span> · ${zh}</span>
        <strong class="nm-en"></strong>
        <em class="nm-zh"></em>
      </figcaption>
    </figure>`).join("");
}

function openCards(iso) {
  if (!cards[iso]) return;
  cardIso = iso;
  cardIndex = 0;
  cardsOpen = true;
  $("card-modal").hidden = false;
  renderCard();
}

function closeCards() {
  if (!cardsOpen) return;
  cardsOpen = false;
  $("card-modal").hidden = true;
  maybeReward();
}

function onCardClick(e) {
  if (e.target.id === "card-modal") return;
  if (e.target.closest("[data-close]")) { closeCards(); return; }
  if (e.target.closest("[data-back]")) { cardIndex = Math.max(0, cardIndex - 1); renderCard(); return; }
  if (e.target.closest("[data-next]") || e.target.closest(".card-panel")) {
    if (cardIndex >= 3) closeCards();
    else { cardIndex += 1; renderCard(); }
  }
}

function renderCard() {
  const iso = cardIso;
  const meta = shapeByIso.get(iso).properties;
  const card = cards[iso];
  document.querySelector(".card-panel").classList.toggle("show-photos", cardIndex === 3);
  $("card-kicker").textContent = `${cardIndex + 1} / 4`;
  $("card-title").textContent = `${meta.name} · ${meta.zh}`;
  const shapeOn = cardIndex <= 1;
  $("card-shape-wrap").hidden = !shapeOn;
  $("card-copy").hidden = cardIndex > 1;
  $("card-flag").hidden = cardIndex !== 2;
  $("card-photos").hidden = cardIndex !== 3;
  $("card-back").disabled = cardIndex === 0;
  $("card-next").textContent = cardIndex === 3 ? "Close · 关闭" : "Next · 下一张";
  document.querySelectorAll("#card-dots span").forEach((dot, i) => {
    dot.classList.toggle("on", i === cardIndex);
  });
  if (cardIndex === 0) {
    $("card-en").textContent = card.blurb.en;
    $("card-zh").textContent = card.blurb.zh;
  } else if (cardIndex === 1) {
    const sentence = borderSentence(iso);
    $("card-en").textContent = sentence.en;
    $("card-zh").textContent = sentence.zh;
  }
  if (shapeOn) drawCardShape(iso, cardIndex === 1);
  if (cardIndex === 2) {
    const img = $("flag-img");
    img.src = `assets/flags/${iso.toLowerCase()}.svg`;
    img.alt = `Flag of ${meta.name}`;
    $("flag-caption").textContent = `Flag of ${meta.name} · ${meta.zh}国旗`;
  }
  if (cardIndex === 3) fillPhotos(iso, card);
}

function buildBorderSentence(iso, meta) {
  const all = asiaNeighbours(iso);
  const mates = all.filter((id) => pieces.get(id)?.locked);
  if (!all.length) {
    return {
      en: `${meta.name} is an island country with no land borders.`,
      zh: `${meta.zh}是岛国，没有陆地边界。`,
    };
  }
  if (!mates.length) {
    return {
      en: `${meta.name} is on the map. Its land neighbours are still in the tray.`,
      zh: `${meta.zh}已经在地图上，它的陆地邻国还在托盘里。`,
    };
  }
  if (mates.length === 1) {
    const other = shapeByIso.get(mates[0]).properties;
    const km = borders.lengthKm[pairKey(iso, mates[0])];
    if (km) {
      const text = km.toLocaleString("en-US");
      return {
        en: `${meta.name} shares about ${text} km of land border with ${other.name}.`,
        zh: `${meta.zh}与${other.zh}的陆地边界大约 ${text} 公里。`,
      };
    }
    return {
      en: `${meta.name} shares a land border with ${other.name}.`,
      zh: `${meta.zh}与${other.zh}陆上接壤。`,
    };
  }
  const shown = mates.slice(0, 3).map((id) => shapeByIso.get(id).properties);
  const en = shown.map((p) => p.name).join(", ");
  const zh = shown.map((p) => p.zh).join("、");
  const more = mates.length > 3 ? " and others" : "";
  const moreZh = mates.length > 3 ? "等" : "";
  return {
    en: `${meta.name} shares a land border with ${en}${more}.`,
    zh: `${meta.zh}与${zh}${moreZh}陆上接壤。`,
  };
}

function borderSentence(iso) {
  const meta = shapeByIso.get(iso).properties;
  if (playKind === "build") return buildBorderSentence(iso, meta);
  const centre = shapeByIso.get(centreIso).properties;
  if (iso === centreIso) {
    const n = borders.neighbours[centreIso].length;
    return {
      en: `${meta.name} is the centre of this puzzle. It has ${n} land neighbour${n === 1 ? "" : "s"}.`,
      zh: `${meta.zh}是这幅拼图的中心，有 ${n} 个陆地邻国。`,
    };
  }
  const km = borders.lengthKm[pairKey(iso, centreIso)];
  if (!km) {
    return {
      en: `${meta.name} shares a land border with ${centre.name}.`,
      zh: `${meta.zh}与${centre.zh}陆上接壤。`,
    };
  }
  const text = km.toLocaleString("en-US");
  return {
    en: `${meta.name} shares about ${text} km of land border with ${centre.name}.`,
    zh: `${meta.zh}与${centre.zh}的陆地边界大约 ${text} 公里。`,
  };
}

function drawCardShape(iso, racing) {
  const mesh = meshes.get(iso);
  if (!mesh) return;
  const w = 640, h = 340;
  const pad = 0.84;
  const kmpp = Math.max(mesh.width / (w * pad), mesh.height / (h * pad)) || 1;
  const cardView = {
    width: w, height: h, kmPerPx: kmpp,
    originX: mesh.cx - (w * kmpp) / 2,
    originY: mesh.cy - (h * kmpp) / 2,
  };
  const piece = { cx: mesh.cx, cy: mesh.cy, scale: 1 };
  cardGL.resize(w, h);
  cardGL.drawPieces([{ mesh, cx: piece.cx, cy: piece.cy, scale: 1 }], cardView);
  const outline = screenPath(mesh.rings, piece, cardView);
  const card = cards[iso];
  let dot = "";
  if (!racing && card?.capital) {
    const xy = proj.forward(card.capital.lon, card.capital.lat);
    if (xy) {
      const s = screenOfKm(xy[0], xy[1], cardView);
      dot = `<circle class="capital" cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="5.5"/>`;
    }
  }
  $("card-svg").setAttribute("viewBox", `0 0 ${w} ${h}`);
  const comet = racing
    ? `<path class="comet comet-glow" pathLength="1000" d="${outline}"/><path class="comet comet-tail" pathLength="1000" d="${outline}"/><path class="comet comet-head" pathLength="1000" d="${outline}"/>`
    : "";
  $("card-svg").innerHTML = `<path class="outline" pathLength="1000" d="${outline}"/>${comet}${dot}`;
}

function screenOfKm(x, y, v) {
  return {
    x: (x - v.originX) / v.kmPerPx,
    y: v.height - (y - v.originY) / v.kmPerPx,
  };
}

function fillPhotos(iso, card) {
  for (const [slot] of SLOTS) {
    const fig = document.querySelector(`.photo-card[data-slot="${slot}"]`);
    const img = fig.querySelector("img");
    const info = card[slot];
    fig.querySelector(".nm-en").textContent = info.en;
    fig.querySelector(".nm-zh").textContent = info.zh;
    img.alt = info.en;
    img.classList.remove("missing");
    img.onload = () => img.classList.remove("missing");
    img.onerror = () => img.classList.add("missing");
    img.src = `assets/cards/${iso.toLowerCase()}/${slot}.jpg`;
  }
}

function showReward() {
  rewardSlides = makeRewardSlides();
  rewardIndex = 0;
  $("reward").hidden = false;
  renderReward();
  clearInterval(rewardTimer);
  rewardTimer = setInterval(advanceReward, 4500);
}

function makeRewardSlides() {
  if (playKind === "build") {
    return [
      { en: "You built the whole of Asia.", zh: "你拼出了整个亚洲。" },
      { en: "All 48 countries are in their real places.", zh: "48 个国家都在真正的位置上。" },
      { en: "Islands and neighbours, together on one map.", zh: "岛屿和邻国，都在同一幅地图上。" },
      { en: "You placed every piece.", zh: "你把每一块都放好了。", end: true },
    ];
  }
  const meta = shapeByIso.get(centreIso).properties;
  const nbs = borders.neighbours[centreIso];
  const slides = [];
  if (nbs.length === 1) {
    const o = shapeByIso.get(nbs[0]).properties;
    slides.push({
      en: `${meta.name} has 1 land neighbour: ${o.name}.`,
      zh: `${meta.zh}有 1 个陆地邻国：${o.zh}。`,
    });
  } else {
    slides.push({
      en: `${meta.name} has ${nbs.length} land neighbours.`,
      zh: `${meta.zh}有 ${nbs.length} 个陆地邻国。`,
    });
    const ranked = nbs.map((iso) => shapeByIso.get(iso).properties).slice().sort((a, b) => b.areaKm2 - a.areaKm2);
    const big = ranked[0];
    const small = ranked[ranked.length - 1];
    slides.push({
      en: `The biggest neighbour is ${big.name}.`,
      zh: `面积最大的邻国是${big.zh}。`,
    });
    slides.push({
      en: `The smallest neighbour is ${small.name}.`,
      zh: `面积最小的邻国是${small.zh}。`,
    });
  }
  slides.push({
    en: "You placed every piece.",
    zh: "你把每一块都放好了。",
    end: true,
  });
  return slides;
}

function renderReward() {
  const slide = rewardSlides[rewardIndex];
  if (!slide) return;
  $("reward-en").textContent = slide.en;
  $("reward-zh").textContent = slide.zh;
  $("reward-back").classList.toggle("large", !!slide.end);
  $("reward-count").textContent = `${rewardIndex + 1} / ${rewardSlides.length}`;
}

function advanceReward(manual) {
  if (rewardIndex >= rewardSlides.length - 1) {
    clearInterval(rewardTimer);
    renderReward();
    return;
  }
  rewardIndex += 1;
  renderReward();
  if (manual) {
    clearInterval(rewardTimer);
    if (rewardIndex < rewardSlides.length - 1) rewardTimer = setInterval(() => advanceReward(false), 4500);
  } else if (rewardIndex >= rewardSlides.length - 1) {
    clearInterval(rewardTimer);
  }
}

function closeReward() {
  clearInterval(rewardTimer);
  $("reward").hidden = true;
}

function openAsk(next) {
  askMode = next;
  askIso = next === "capital" ? askIso : null;
  $("ask").hidden = false;
  $("ask-input").value = "";
  $("ask-msg").hidden = true;
  if (next === "start") {
    $("ask-title").textContent = "Build Asia · 拼出亚洲";
    $("ask-help").textContent = "Type any Asian country to begin, in English or Chinese. · 用英文或中文输入任何一个亚洲国家。";
  } else if (next === "name") {
    $("ask-title").textContent = "Which country? · 哪个国家？";
    $("ask-help").textContent = "Type its name. Next you will name its capital. · 先写国名，下一步写首都。";
  } else {
    const meta = shapeByIso.get(askIso).properties;
    $("ask-title").textContent = `${meta.name} · ${meta.zh}`;
    $("ask-help").textContent = "What is its capital? · 它的首都叫什么？";
  }
  requestAnimationFrame(() => $("ask-input").focus());
}

function closeAsk() {
  askMode = null;
  askIso = null;
  $("ask").hidden = true;
  $("ask-msg").hidden = true;
}

function setAskMsg(en, zh) {
  const el = $("ask-msg");
  el.hidden = false;
  el.textContent = `${en} ${zh}`;
}

function onAskSubmit(e) {
  e.preventDefault();
  const raw = $("ask-input").value;
  if (askMode === "capital") {
    if (!capitalMatches(askIso, raw)) {
      setAskMsg("That's not the capital. Try again.", "这不是首都，再试一次。");
      return;
    }
    const iso = askIso;
    closeAsk();
    placeByCapital(iso);
    return;
  }
  const found = lookupCountry(raw);
  if (found.kind === "empty") {
    setAskMsg("Type a country name.", "请输入一个国家的名字。");
    return;
  }
  if (found.kind === "unknown") {
    setAskMsg("I can't find that one. Try the English or Chinese name.", "没找到。试试英文或中文名字。");
    return;
  }
  if (found.kind === "not-asia") {
    setAskMsg("That country is not on this Asia map.", "这个国家不在这幅亚洲地图上。");
    return;
  }
  if (askMode === "start") {
    enterBuild(found.iso);
    return;
  }
  if (pieces.get(found.iso)?.locked) {
    setAskMsg("That country is already on the map.", "这个国家已经放好了。");
    return;
  }
  askIso = found.iso;
  openAsk("capital");
}

function placeByCapital(iso) {
  const mesh = meshes.get(iso);
  if (!mesh || pieces.get(iso)?.locked) return;
  const piece = pieces.get(iso) || { iso, fixed: false };
  piece.cx = mesh.cx;
  piece.cy = mesh.cy;
  piece.scale = 1;
  piece.locked = true;
  piece.fixed = false;
  pieces.set(iso, piece);
  capitalRoots.add(iso);
  markTray(iso, true);
  if (selected === iso) selected = null;
  updateProgress();
  requestDraw();
  playWeld(iso, () => finishPlacement(iso));
}

function lockAll() {
  if (mode !== "puzzle" || playKind === "build") return;
  for (const iso of borders.neighbours[centreIso]) {
    const mesh = meshes.get(iso);
    let piece = pieces.get(iso);
    if (!piece) {
      piece = { iso, cx: mesh.cx, cy: mesh.cy, scale: 1, locked: true, fixed: false };
      pieces.set(iso, piece);
    } else {
      piece.cx = mesh.cx;
      piece.cy = mesh.cy;
      piece.scale = 1;
      piece.locked = true;
    }
    markTray(iso, true);
  }
  selected = null;
  requestDraw();
}

window.__game = {
  get mode() { return mode; },
  get playKind() { return playKind; },
  get centre() { return centreIso; },
  get guideOpen() { return guideOpen; },
  get progress() {
    if (playKind !== "build") return null;
    return { placed: placedCount(), total: asiaIsos.length };
  },
  go: (iso) => {
    const id = String(iso || "").toUpperCase();
    if (borders?.neighbours[id]?.length) enterPuzzle(id);
  },
  build(name) {
    const found = lookupCountry(name);
    if (found.kind !== "asia") return found;
    enterBuild(found.iso);
    return { ok: true, iso: found.iso, placed: placedCount(), total: asiaIsos.length };
  },
  answer(name, capital) {
    if (playKind !== "build") return { ok: false, reason: "mode" };
    const found = lookupCountry(name);
    if (found.kind !== "asia") return { ok: false, ...found };
    if (pieces.get(found.iso)?.locked) return { ok: false, reason: "placed", iso: found.iso };
    if (!capitalMatches(found.iso, capital)) return { ok: false, reason: "capital", iso: found.iso };
    placeByCapital(found.iso);
    return { ok: true, iso: found.iso, placed: placedCount(), total: asiaIsos.length, locked: true };
  },
  chain(iso) {
    const id = String(iso || "").toUpperCase();
    return touchesChain(id);
  },
  reveal(open) {
    setGuideOpen(open);
    return guideOpen;
  },
  skip(on) {
    $("skip-cards").checked = !!on;
    return $("skip-cards").checked;
  },
  frame(iso) {
    const id = String(iso || "").toUpperCase();
    const mesh = meshes.get(id);
    if (!mesh || mode !== "puzzle") return false;
    fitMesh(mesh, 0.22);
    requestDraw();
    return true;
  },
  asia: enterAsia,
  world: enterWorld,
  lockAll,
  openCard: (iso) => openCards(iso || centreIso),
  closeCards,
  showReward: () => { if (centreIso) { rewarded = true; showReward(); } },
  closeReward,
  hitTest,
  pick(x, y) {
    const f = globePick(x, y);
    if (!f) return null;
    return { iso: f.properties.iso, name: f.properties.name, continent: f.properties.continent };
  },
  view,
  // Frame the shared border, then place the neighbour so the weld is easy to see.
  focusSeam(iso) {
    if (mode !== "puzzle" || !centreIso) return false;
    const segs = seamKm.get(pairKey(String(iso || "").toUpperCase(), centreIso));
    if (!segs || !segs.length) return false;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const line of segs) {
      for (const p of line) {
        if (p[0] < minX) minX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] > maxY) maxY = p[1];
      }
    }
    const w = playfield.clientWidth;
    const h = playfield.clientHeight;
    const pad = 0.16;
    const kmpp = Math.max((maxX - minX) / (w * (1 - 2 * pad)), (maxY - minY) / (h * (1 - 2 * pad))) || 1;
    view.kmPerPx = clamp(kmpp, MIN_KMPP, MAX_KMPP);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    view.originX = cx - (w * view.kmPerPx) / 2;
    view.originY = cy - (h * view.kmPerPx) / 2;
    requestDraw();
    return true;
  },
  // Place a neighbour within the snap tolerance so the weld runs, then the card opens.
  snap(iso) {
    const id = String(iso || "").toUpperCase();
    if (mode !== "puzzle" || !meshes.has(id) || pieces.get(id)?.fixed) return false;
    const mesh = meshes.get(id);
    const piece = pieces.get(id) || { iso: id, locked: false, fixed: false };
    piece.cx = mesh.cx + 40;
    piece.cy = mesh.cy;
    piece.scale = 1;
    piece.locked = false;
    pieces.set(id, piece);
    markTray(id, true);
    trySnap(piece);
    return !!pieces.get(id)?.locked;
  },
};

init();
