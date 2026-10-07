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
let centreIso = null;
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
let reliefImage = null;

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
    mainGL.setRelief(relief);
    cardGL.setRelief(relief);
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
  if (cardsOpen) closeCards();
}

function showToast(en, zh) {
  toastEl.innerHTML = `<strong>${en}</strong><span>${zh}</span>`;
  toastEl.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toastEl.hidden = true; }, 4200);
}

function setMode(next) {
  mode = next;
  appEl.classList.remove("mode-world", "mode-asia", "mode-puzzle", "one-tray");
  appEl.classList.add("mode-" + next);
  backBtn.hidden = next === "world";
  $("guide").hidden = next !== "puzzle";
  toastEl.hidden = true;
}

function enterWorld() {
  closeCards();
  closeReward();
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
  setMode("asia");
  centreIso = null;
  pieces.clear();
  meshes.clear();
  trayTop.innerHTML = "";
  trayBottom.innerHTML = "";
  globe.targetLon = 90;
  globe.targetLat = 28;
  globe.targetMul = 0.92;
  titleEl.innerHTML = `<b>Asia</b><span>亚洲 · 点击一个国家</span>`;
  hintEl.textContent = "Click a country to start its puzzle · 点击国家开始拼图";
  document.title = "Asia — Land Neighbours";
  animateGlobe();
  requestDraw();
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

function centreLonLat(iso) {
  if (iso === "CHN") return [100, 40];
  return shapeByIso.get(iso).properties.label.slice();
}

function enterPuzzle(iso) {
  closeCards();
  closeReward();
  rewarded = false;
  centreIso = iso;
  setMode("puzzle");
  const [lon0, lat0] = centreLonLat(iso);
  proj = makeLaea(lon0, lat0);
  const nbs = borders.neighbours[iso].slice();
  const need = [iso, ...nbs];
  meshes = new Map();
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
  buildTrays(trays);
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

function thumbSvg(mesh) {
  const pad = Math.max(mesh.width, mesh.height) * 0.08 || 1;
  const minX = mesh.minX - pad, maxX = mesh.maxX + pad;
  const minY = mesh.minY - pad, maxY = mesh.maxY + pad;
  let d = "";
  for (const ring of mesh.rings) {
    for (let i = 0; i < ring.length; i++) {
      const x = mesh.cx + ring[i][0];
      const y = mesh.cy + ring[i][1];
      d += (i ? "L" : "M") + x.toFixed(1) + " " + (-y).toFixed(1) + " ";
    }
    d += "Z ";
  }
  return `<svg viewBox="${minX.toFixed(1)} ${(-maxY).toFixed(1)} ${(maxX - minX).toFixed(1)} ${(maxY - minY).toFixed(1)}" aria-hidden="true"><path d="${d}" fill="#d7c4a2" stroke="#3c4a44" stroke-width="${((maxX - minX) / 80).toFixed(2)}"/></svg>`;
}

function buildTrays(trays) {
  trayTop.innerHTML = "";
  trayBottom.innerHTML = "";
  const make = (iso) => {
    const meta = shapeByIso.get(iso).properties;
    const tile = document.createElement("div");
    tile.className = "tray-tile";
    tile.dataset.code = iso;
    tile.innerHTML = `${thumbSvg(meshes.get(iso))}<div class="name">${meta.name}<small>${meta.zh}</small></div>`;
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
    if (m.width > span * 0.07) {
      parts.push(`<text x="${m.cx.toFixed(1)}" y="${(-m.cy).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${(span / 38).toFixed(1)}" fill="#1b2420">${meta.name}</text>`);
    }
  });
  $("guide-svg-wrap").innerHTML = `<svg viewBox="${minX.toFixed(1)} ${(-maxY).toFixed(1)} ${(maxX - minX).toFixed(1)} ${(maxY - minY).toFixed(1)}">${parts.join("")}</svg>`;
}

function fitMesh(mesh, pad) {
  const w = playfield.clientWidth || view.width;
  const h = playfield.clientHeight || view.height;
  view.width = w;
  view.height = h;
  const kmpp = Math.max(mesh.width / (w * (1 - 2 * pad)), mesh.height / (h * (1 - 2 * pad)));
  view.kmPerPx = clamp(kmpp, MIN_KMPP, MAX_KMPP);
  view.originX = mesh.cx - (w * view.kmPerPx) / 2;
  view.originY = mesh.cy - (h * view.kmPerPx) / 2;
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
    const wpx = mesh.width * piece.scale / view.kmPerPx;
    if (wpx < 36 && piece.iso !== selected) continue;
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
    piece.scale = 1;
    piece.cx = mesh.cx;
    piece.cy = mesh.cy;
    piece.locked = true;
    if (selected === piece.iso) selected = null;
    playWeld(piece.iso, () => openCards(piece.iso));
  }
}

function playWeld(iso, done) {
  const lines = [];
  const mates = [centreIso, ...borders.neighbours[centreIso]].filter((id) => id !== iso && pieces.get(id)?.locked);
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
  }, 1300);
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
  if (allLocked() && !rewarded && mode === "puzzle") {
    rewarded = true;
    showReward();
  }
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

function borderSentence(iso) {
  const meta = shapeByIso.get(iso).properties;
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
  const cls = racing ? "outline runner" : "outline";
  $("card-svg").setAttribute("viewBox", `0 0 ${w} ${h}`);
  $("card-svg").innerHTML = `<path class="${cls}" pathLength="1000" d="${outline}"/>${dot}`;
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

function lockAll() {
  if (mode !== "puzzle") return;
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
  get centre() { return centreIso; },
  go: (iso) => {
    const id = String(iso || "").toUpperCase();
    if (borders?.neighbours[id]?.length) enterPuzzle(id);
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
  // Place a neighbour within the snap tolerance so the weld runs, then the card opens.
  snap(iso) {
    if (mode !== "puzzle" || !meshes.has(iso) || iso === centreIso) return;
    const mesh = meshes.get(iso);
    const piece = pieces.get(iso) || { iso, locked: false, fixed: false };
    piece.cx = mesh.cx + 40;
    piece.cy = mesh.cy;
    piece.scale = 1;
    piece.locked = false;
    pieces.set(iso, piece);
    markTray(iso, true);
    trySnap(piece);
  },
};

init();
