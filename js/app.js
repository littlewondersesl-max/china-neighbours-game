import { makeLaea, buildMesh, boundsOfFeature, pairKey, screenPath, absLinePath } from "./geo.js";
import { createView } from "./gl.js";
import { prepareWorldStrokes, drawGlobeStrokes } from "./strokes.js";
import { skinsFor, skinSources, readSkin, writeSkin, clipSkin } from "./skins.js";
import { LANGS, pick, line, htmlStack, esc, getLang, setLang, onLangChange, activeLangs, langButtonText, scriptLang } from "./i18n.js";

const SIZE_TOL = 0.07;
const POS_TOL_KM = 180;
const MIN_KMPP = 0.8;
const MAX_KMPP = 40;
const GLOBE_MIN_MUL = 0.18;
const GLOBE_MAX_MUL = 5.2;
const CHINA_TOP = ["RUS", "KAZ", "MNG", "KGZ", "TJK", "AFG", "PAK"];
const CHINA_BOTTOM = ["IND", "NPL", "BTN", "MMR", "LAO", "VNM", "PRK"];
const PALETTE = ["#c4b07a", "#8fb08a", "#d2a07a", "#9eb4c8", "#c9b48a", "#a8c4a2", "#e0c98a", "#b7a48a"];
const CONT_ZH = {
  Africa: "非洲", Europe: "欧洲", "North America": "北美洲", "South America": "南美洲",
  Oceania: "大洋洲", Antarctica: "南极洲", Asia: "亚洲", "Seven seas (open ocean)": "海洋",
};
const SLOTS = [
  ["animal", "animal"],
  ["currency", "currency"],
  ["landmark", "landmark"],
  ["dish", "dish"],
];
const BUILD_LABEL = { en: "Build Continents", zh: "拼出大洲" };
const BUILD_TARGET = { continent: "Asia", en: "Asia", zh: "亚洲", lon: 95, lat: 35 };
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
const strokesEl = $("strokes");
const ghostsEl = $("ghosts");
const coastsEl = $("coasts");
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
let cardsMode = false;
let hoverIso = null;
let askMode = null;
let askIso = null;
let namedFlash = null;
let buildIsos = [];
let buildSet = new Set();
let namesByLang = { en: new Map(), zh: new Map() };
let showNeighbourHint = false;
let guideIds = [];
let globeAnchor = null;
let didPinch = false;
const pointers = new Map();
let pinching = false;
let pinch = null;
let proj = null;
let meshes = new Map();
let seamKm = new Map();
let pieces = new Map();
let selected = null;
let focusIso = null;
const skinImages = new Map();
const skinChoice = new Map();
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
let interacting = false;
let idleTimer = 0;
let worldStrokes = null;
let overlayMode = "";
const lineNodes = new Map();
let gratNode = null;
let gratFor = null;
let gratD = "";

let worldFeatures = [];
let shapeByIso = new Map();
let borders = null;
let rivers = null;
let coastLonLat = [];
let coastKm = [];
let shakeWatch = null;
let splashStart = 0;
let splashFrame = 0;
let splashTimer = 0;
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

function noteInteraction() {
  interacting = true;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (pointers.size || pinching || globeAnimating) {
      noteInteraction();
      return;
    }
    interacting = false;
    requestDraw();
  }, 140);
}

function pixelRatio() {
  const dpr = window.devicePixelRatio || 1;
  // A 1080p TV reports 1. Resizing the drawing buffer for a fraction of a pixel
  // is pure overhead, and a moving view stays at 1x so the picture can keep up.
  if (interacting || dpr <= 1.25) return 1;
  return Math.min(dpr, 1.5);
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
    const [world, shapes, borderData, riverData, cardData, coastData, relief, ...skins] = await Promise.all([
      loadJSON("data/world.json"),
      loadJSON("data/shapes.json"),
      loadJSON("data/borders.json"),
      loadJSON("data/rivers.json"),
      loadJSON("data/cards.json"),
      loadJSON("data/coast.json"),
      loadImage("assets/relief.jpg"),
      ...skinSources().map((src) => loadImage(src).then((img) => ({ src, img })).catch(() => null)),
    ]);
    borders = borderData;
    rivers = riverData;
    coastLonLat = coastData;
    cards = cardData;
    reliefImage = relief;
    for (const skin of skins) if (skin) skinImages.set(skin.src, skin.img);
    worldFeatures = world.features;
    for (const f of worldFeatures) f._b = boundsOfFeature(f);
    worldStrokes = prepareWorldStrokes(worldFeatures);
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
    applyLanguage();
    loadingEl.hidden = true;
    requestDraw();
  } catch (err) {
    loadingEl.textContent = err.message || pick("loadError").main;
    console.error(err);
  }
}

function bind() {
  onLangChange(applyLanguage);
  playfield.addEventListener("pointerdown", onPointerDown);
  playfield.addEventListener("pointermove", onPointerMove);
  playfield.addEventListener("pointerup", onPointerUp);
  playfield.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
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
  $("cards-mode").addEventListener("click", () => {
    cardsMode = !cardsMode;
    syncCardsButton();
    paintHeading();
  });
  playfield.addEventListener("pointerleave", () => setHover(null));
  $("guide-close").addEventListener("click", () => setGuideOpen(false));
  $("name-entry").addEventListener("click", () => openAsk("name"));
  $("choose-neighbours").addEventListener("click", chooseNeighbours);
  $("choose-build").addEventListener("click", () => openAsk("start"));
  $("ask-form").addEventListener("submit", onAskSubmit);
  $("ask-input").addEventListener("input", onAskInput);
  $("ask-cancel").addEventListener("click", closeAsk);
  $("lang-toggle").addEventListener("click", (e) => {
    e.stopPropagation();
    const panel = $("lang-panel");
    panel.hidden = !panel.hidden;
    $("lang-toggle").setAttribute("aria-expanded", panel.hidden ? "false" : "true");
  });
  $("lang-main").addEventListener("change", () => setLang($("lang-main").value, getLang().sub));
  $("lang-sub").addEventListener("change", () => {
    const value = $("lang-sub").value;
    setLang(getLang().main, value || null);
  });
  document.addEventListener("pointerdown", (e) => {
    if ($("lang").contains(e.target)) return;
    $("lang-panel").hidden = true;
    $("lang-toggle").setAttribute("aria-expanded", "false");
  });
  $("card-modal").addEventListener("click", onCardClick);
  $("reward-back").addEventListener("click", closeReward);
  $("reward").addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    advanceReward(true);
  });
  $("skin-bar").addEventListener("pointerdown", (e) => e.stopPropagation());
  $("skin-prev").addEventListener("click", () => cycleSkin(-1));
  $("skin-next").addEventListener("click", () => cycleSkin(1));
  buildPhotoGrid();
}

function onEsc() {
  if (!$("lang-panel").hidden) {
    $("lang-panel").hidden = true;
    $("lang-toggle").setAttribute("aria-expanded", "false");
    return;
  }
  if (!$("reward").hidden) { closeReward(); return; }
  if (cardsOpen) { closeCards(); return; }
  if (cardsMode) {
    cardsMode = false;
    syncCardsButton();
    paintHeading();
    return;
  }
  if (!$("ask").hidden) closeAsk();
}

function showToast(row, vars) {
  const text = pick(row, vars);
  toastEl.innerHTML = `<strong>${esc(text.main)}</strong>${text.sub ? `<span>${esc(text.sub)}</span>` : ""}`;
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
  stopCoastSplash();
  if (next !== "puzzle") {
    guideOpen = false;
    namedFlash = null;
    cardsMode = false;
    setHover(null);
    $("island-note").hidden = true;
    stopCoastSplash();
  }
  syncGuide();
  syncCardsButton();
  syncTools();
  syncSkinBar();
}

function syncGuide() {
  const show = mode === "puzzle" && guideOpen;
  appEl.classList.toggle("guide-open", show);
  $("guide").hidden = !show;
  const btn = $("reveal-map");
  btn.textContent = line(show ? "hideMap" : "reveal");
  btn.setAttribute("aria-pressed", show ? "true" : "false");
}

function syncCardsButton() {
  const btn = $("cards-mode");
  btn.textContent = line("cards");
  btn.setAttribute("aria-pressed", cardsMode ? "true" : "false");
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

function nameBlock(meta) {
  const text = pick({ en: meta.name, zh: meta.zh });
  return `<div class="name">${esc(text.main)}${text.sub ? `<small>${esc(text.sub)}</small>` : ""}</div>`;
}

function paintCopy(row) {
  const text = pick(row);
  $("card-en").textContent = text.main;
  $("card-zh").textContent = text.sub;
  $("card-zh").hidden = !text.sub;
}

function paintPhotoLabels() {
  for (const [slot, key] of SLOTS) {
    const fig = document.querySelector(`.photo-card[data-slot="${slot}"]`);
    if (!fig) continue;
    fig.querySelector(".eyebrow").textContent = line(key);
  }
}

function paintLangControl() {
  const lang = getLang();
  $("lang-toggle").textContent = langButtonText();
  $("lang-main-lab").textContent = pick("langMain").main;
  $("lang-sub-lab").textContent = pick("langSub").main;
  const main = $("lang-main");
  const sub = $("lang-sub");
  main.innerHTML = LANGS.map((item) => `<option value="${item.id}">${esc(item.name)}</option>`).join("");
  sub.innerHTML = `<option value="">${esc(pick("langNone").main)}</option>`
    + LANGS.filter((item) => item.id !== lang.main).map((item) => `<option value="${item.id}">${esc(item.name)}</option>`).join("");
  main.value = lang.main;
  sub.value = lang.sub || "";
  document.documentElement.lang = lang.main === "zh" ? "zh-Hans" : "en";
}

function paintIslandNote() {
  const text = pick("islandNote");
  $("island-note").querySelector("strong").textContent = text.main;
  const span = $("island-note").querySelector("span");
  span.textContent = text.sub;
  span.hidden = !text.sub;
}

function withShake(row) {
  return `${line(row)} · ${line("shakeHint")}`;
}

function paintHeading() {
  if (mode === "world") {
    titleEl.innerHTML = htmlStack("appTitle");
    hintEl.textContent = line("worldHint");
    document.title = pick("appTitle").main;
    return;
  }
  if (mode === "asia") {
    titleEl.innerHTML = htmlStack({ en: "Asia", zh: "亚洲" });
    hintEl.textContent = line(showNeighbourHint ? "asiaHint" : "asiaZoom");
    document.title = `${pick({ en: "Asia", zh: "亚洲" }).main} — ${pick("appTitle").main}`;
    return;
  }
  if (playKind === "build" && buildStart) {
    const meta = shapeByIso.get(buildStart).properties;
    const modeName = pick({ en: BUILD_LABEL.en, zh: BUILD_LABEL.zh });
    const place = pick({ en: BUILD_TARGET.en, zh: BUILD_TARGET.zh });
    const where = place.sub ? `${place.main} · ${place.sub}` : place.main;
    titleEl.innerHTML = `<b>${esc(modeName.main)}</b>${modeName.sub ? `<span>${esc(modeName.sub)}</span>` : ""}<span class="where">${esc(where)}</span>`;
    hintEl.textContent = withShake(cardsMode
      ? "cardsHint"
      : buildNeighbours(buildStart).length
        ? "buildHint"
        : {
          en: `${meta.name} is an island, so type a name and a capital to place the next country.`,
          zh: `${meta.zh}是岛国，请输入国名和首都来放置下一个国家。`,
        });
    document.title = modeName.main;
    return;
  }
  if (centreIso && shapeByIso.has(centreIso)) {
    const meta = shapeByIso.get(centreIso).properties;
    titleEl.innerHTML = htmlStack({
      en: `${meta.name}'s land neighbours`,
      zh: `${meta.zh}的陆地邻国`,
    });
    hintEl.textContent = withShake(cardsMode ? "cardsHint" : "puzzleHint");
    document.title = `${pick({ en: meta.name, zh: meta.zh }).main} — ${pick("appTitle").main}`;
  }
}

function refreshTrayNames() {
  document.querySelectorAll(".tray-tile").forEach((tile) => {
    const name = tile.querySelector(".name");
    if (!name) {
      tile.setAttribute("aria-label", pick("piece").main);
      return;
    }
    const meta = shapeByIso.get(tile.dataset.code)?.properties;
    if (!meta) return;
    name.outerHTML = nameBlock(meta);
  });
}

function applyLanguage() {
  paintLangControl();
  paintIslandNote();
  $("back").textContent = line("back");
  $("name-entry").textContent = line("enterName");
  $("skip-label").textContent = line("skipCards");
  $("choose-neighbours").textContent = line("neighbours");
  $("choose-build").textContent = line("buildContinents");
  $("mode-choice").querySelector("p").textContent = line("chooseGame");
  $("guide-title").textContent = line("exampleMap");
  $("guide-close").setAttribute("aria-label", pick("closeMap").main);
  $("ask-cancel").textContent = line("cancel");
  $("ask-ok").textContent = line("ok");
  $("reward-back").textContent = line("backToMap");
  $("card-back").textContent = line("cardBack");
  loadingEl.textContent = pick("loading").main;
  paintHeading();
  syncGuide();
  syncCardsButton();
  updateProgress();
  paintPhotoLabels();
  refreshTrayNames();
  if (mode === "puzzle" && guideIds.length) buildGuide(guideIds);
  paintAsk();
  syncSkinBar();
  if (cardsOpen) renderCard();
  if (!$("reward").hidden) renderReward();
  requestDraw();
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
  globeAnchor = null;
  showNeighbourHint = false;
  paintHeading();
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
  globeAnchor = null;
  showNeighbourHint = false;
  paintHeading();
  animateGlobe();
  requestDraw();
}

function chooseNeighbours() {
  if (mode !== "asia") enterAsia();
  showNeighbourHint = true;
  paintHeading();
}

function back() {
  if (mode === "puzzle") enterAsia();
  else if (mode === "asia") enterWorld();
}

function animateGlobe() {
  if (globeAnimating) return;
  globeAnimating = true;
  noteInteraction();
  let last = 0;
  const step = (now) => {
    try {
      if (mode === "puzzle") { globeAnimating = false; return; }
      const dt = last ? Math.min(0.08, (now - last) / 1000) : 0.016;
      last = now;
      const k = 1 - Math.exp(-dt / 0.09);
      noteInteraction();
      if (globeAnchor) {
        globe.mul += (globe.targetMul - globe.mul) * k;
        holdAnchor(globeAnchor);
        globe.targetLon = globe.lon0;
        globe.targetLat = globe.lat0;
      } else {
        globe.lon0 += (globe.targetLon - globe.lon0) * k;
        globe.lat0 += (globe.targetLat - globe.lat0) * k;
        globe.mul += (globe.targetMul - globe.mul) * k;
      }
      requestDraw();
      const zoomed = globeAnchor && Math.abs(globe.targetMul - globe.mul) < 0.002;
      const flown = !globeAnchor
        && Math.abs(globe.targetLon - globe.lon0) < 0.08
        && Math.abs(globe.targetLat - globe.lat0) < 0.08
        && Math.abs(globe.targetMul - globe.mul) < 0.004;
      if (zoomed || flown) {
        if (globeAnchor) {
          globe.mul = globe.targetMul;
          holdAnchor(globeAnchor);
          globe.targetLon = globe.lon0;
          globe.targetLat = globe.lat0;
          globeAnchor = null;
          requestDraw();
        }
        globeAnimating = false;
      } else requestAnimationFrame(step);
    } catch (err) {
      globeAnimating = false;
      console.error(err);
    }
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
  buildIsos = [];
  buildSet = new Set();
  namesByLang = { en: new Map(), zh: new Map() };
  for (const [iso, feature] of shapeByIso) {
    if (feature.properties.continent === BUILD_TARGET.continent) {
      buildIsos.push(iso);
      buildSet.add(iso);
    }
    addName(feature.properties.name, iso, "en");
    addName(feature.properties.zh, iso, "zh");
  }
  for (const [iso, list] of Object.entries(ALIASES)) {
    if (!shapeByIso.has(iso)) continue;
    for (const alias of list) addName(alias, iso, scriptLang(alias));
  }
  buildIsos.sort();
}

function addName(raw, iso, langId) {
  const key = normName(raw);
  const bucket = namesByLang[langId];
  if (!key || !bucket || bucket.has(key)) return;
  bucket.set(key, iso);
}

function lookupCountry(raw) {
  const key = normName(raw);
  if (!key) return { kind: "empty" };
  let iso = null;
  for (const langId of activeLangs()) {
    const hit = namesByLang[langId]?.get(key);
    if (hit) { iso = hit; break; }
  }
  if (!iso) return { kind: "unknown" };
  const meta = shapeByIso.get(iso).properties;
  if (!buildSet.has(iso)) return { kind: "outside", iso, meta };
  return { kind: "build", iso, meta };
}

function capitalAnswers(iso) {
  const list = [];
  const langs = new Set(activeLangs());
  const card = cards[iso];
  if (card?.capital) {
    if (langs.has("en") && card.capital.en) list.push(card.capital.en);
    if (langs.has("zh") && card.capital.zh) list.push(card.capital.zh);
  }
  if (EXTRA_CAPITALS[iso]) {
    for (const name of EXTRA_CAPITALS[iso]) {
      if (langs.has(scriptLang(name))) list.push(name);
    }
  }
  return list;
}

function capitalMatches(iso, raw) {
  const key = normName(raw);
  if (!key) return false;
  return capitalAnswers(iso).some((name) => normName(name) === key);
}

function buildNeighbours(iso) {
  return (borders.neighbours[iso] || []).filter((id) => buildSet.has(id));
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
    for (const next of buildNeighbours(cur)) seed(next);
  }
  return seen;
}

function touchesChain(iso) {
  const anchors = anchorSet();
  return buildNeighbours(iso).some((id) => anchors.has(id));
}

function placedCount() {
  let n = 0;
  for (const iso of buildIsos) if (pieces.get(iso)?.locked) n += 1;
  return n;
}

function startComponent() {
  const seen = new Set();
  if (!buildStart || !buildSet.has(buildStart)) return seen;
  const queue = [buildStart];
  seen.add(buildStart);
  while (queue.length) {
    const cur = queue.pop();
    for (const next of buildNeighbours(cur)) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

function unplacedIsos() {
  return buildIsos.filter((iso) => !pieces.get(iso)?.locked);
}

function islandsOnlyLeft() {
  if (playKind !== "build" || mode !== "puzzle") return false;
  for (const iso of startComponent()) {
    if (!pieces.get(iso)?.locked) return false;
  }
  const left = unplacedIsos();
  return left.length > 0 && left.every((iso) => buildNeighbours(iso).length === 0);
}

function flashTargets() {
  const set = new Set();
  if (playKind !== "build" || mode !== "puzzle") return set;
  if (islandsOnlyLeft()) {
    for (const iso of unplacedIsos()) set.add(iso);
  }
  if (namedFlash && meshes.has(namedFlash) && !pieces.get(namedFlash)?.locked) set.add(namedFlash);
  return set;
}

function syncIslandNote() {
  const el = $("island-note");
  if (!el) return;
  el.hidden = !islandsOnlyLeft();
}

function updateProgress() {
  if (playKind !== "build" || mode !== "puzzle") return;
  const el = $("progress");
  el.hidden = false;
  el.textContent = line("placed", { n: placedCount(), total: buildIsos.length });
  syncIslandNote();
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
  projectCoasts();
  pieces = new Map();
  const centreMesh = meshes.get(iso);
  pieces.set(iso, { iso, cx: centreMesh.cx, cy: centreMesh.cy, scale: 1, locked: true, fixed: true });
  selected = null;
  focusIso = iso;
  syncSkinBar();
  const trays = trayLayout(iso, nbs);
  if (!trays.bottom.length) appEl.classList.add("one-tray");
  buildTrays(trays, false);
  buildGuide(need);
  const meta = shapeByIso.get(iso).properties;
  paintHeading();
  document.title = `${pick({ en: meta.name, zh: meta.zh }).main} — ${pick("appTitle").main}`;
  syncIslandNote();
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
  proj = makeLaea(BUILD_TARGET.lon, BUILD_TARGET.lat);
  const need = buildIsos.slice();
  meshes = new Map();
  thumbCache.clear();
  for (const id of need) {
    const feature = shapeByIso.get(id);
    meshes.set(id, buildMesh(feature, proj, rivers[id] || []));
  }
  seamKm = new Map();
  for (const [key, lines] of Object.entries(borders.seams)) {
    const [a, b] = key.split("|");
    if (!buildSet.has(a) || !buildSet.has(b)) continue;
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
  projectCoasts();
  pieces = new Map();
  const startMesh = meshes.get(iso);
  pieces.set(iso, { iso, cx: startMesh.cx, cy: startMesh.cy, scale: 1, locked: true, fixed: true });
  selected = null;
  focusIso = iso;
  syncSkinBar();
  const rest = shuffle(need.filter((id) => id !== iso));
  buildTrays({ top: rest, bottom: [] }, true);
  buildGuide(need);
  paintHeading();
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
  const skin = skinRecord(iso);
  const thumbKey = `${iso}|${skin.id}`;
  const cached = thumbCache.get(thumbKey);
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
  thumbGL.drawPieces([pieceDraw({ iso, cx: mesh.cx, cy: mesh.cy, scale: 1 }, thumbGL)], thumbView, { shadow: false });
  const url = thumbGL.gl.canvas.toDataURL("image/png");
  const outline = screenPath(mesh.rings, { cx: mesh.cx, cy: mesh.cy, scale: 1 }, thumbView);
  const html = `<span class="thumb"><img alt="" src="${url}"><svg viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${outline}"/></svg></span>`;
  thumbCache.set(thumbKey, html);
  return html;
}

function refreshTrayThumb(iso) {
  document.querySelectorAll(`.tray-tile[data-code="${iso}"] .thumb`).forEach((el) => {
    el.outerHTML = thumbHtml(iso);
  });
}

function buildTrays(trays, nameless) {
  trayTop.innerHTML = "";
  trayBottom.innerHTML = "";
  const make = (iso) => {
    const meta = shapeByIso.get(iso).properties;
    const tile = document.createElement("div");
    tile.className = "tray-tile";
    tile.dataset.code = iso;
    const name = nameless ? "" : nameBlock(meta);
    tile.innerHTML = `${thumbHtml(iso)}${name}`;
    if (nameless) tile.setAttribute("aria-label", pick("piece").main);
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
  guideIds = ids.slice();
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
    if (!m) return;
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
    const label = pick({ en: meta.name, zh: meta.zh }).main;
    parts.push(`<path d="${d}" fill="${fill}" stroke="#1c2a24" stroke-width="${(span / 520).toFixed(2)}"><title>${esc(line({ en: meta.name, zh: meta.zh }))}</title></path>`);
    const labelCut = playKind === "build" ? 0.018 : 0.07;
    if (m.width > span * labelCut) {
      parts.push(`<text x="${m.cx.toFixed(1)}" y="${(-m.cy).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${(span / 38).toFixed(1)}" fill="#1b2420">${esc(label)}</text>`);
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

function chosenSkin(iso) {
  if (!skinChoice.has(iso)) skinChoice.set(iso, readSkin(iso));
  return skinChoice.get(iso);
}

function skinRecord(iso) {
  const list = skinsFor(iso);
  const id = chosenSkin(iso);
  return list.find((skin) => skin.id === id) || list[0];
}

function pieceDraw(piece, glView) {
  const mesh = meshes.get(piece.iso);
  const entry = { mesh, cx: piece.cx, cy: piece.cy, scale: piece.scale };
  const skin = skinRecord(piece.iso);
  const image = skin.src ? skinImages.get(skin.src) : null;
  if (image && mesh && mesh.width > 0 && mesh.height > 0) {
    entry.tex = glView.prepareSkin(mesh, skin.id, clipSkin(image, mesh));
  }
  return entry;
}

function setFocus(iso) {
  const next = iso || null;
  const changed = focusIso !== next;
  focusIso = next;
  syncSkinBar();
  if (changed) requestDraw();
}

function syncSkinBar() {
  const bar = $("skin-bar");
  if (!bar) return;
  const list = mode === "puzzle" && focusIso ? skinsFor(focusIso) : [];
  const show = list.length > 1;
  bar.hidden = !show;
  if (!show) return;
  const skin = skinRecord(focusIso);
  $("skin-name").textContent = line(skin.label);
  $("skin-prev").setAttribute("aria-label", pick("skinPrev").main);
  $("skin-next").setAttribute("aria-label", pick("skinNext").main);
}

function cycleSkin(dir) {
  if (mode !== "puzzle" || !focusIso) return;
  const list = skinsFor(focusIso);
  if (list.length < 2) return;
  let index = list.findIndex((skin) => skin.id === chosenSkin(focusIso));
  if (index < 0) index = 0;
  index = (index + dir + list.length) % list.length;
  skinChoice.set(focusIso, list[index].id);
  writeSkin(focusIso, list[index].id);
  for (const key of [...thumbCache.keys()]) {
    if (key === focusIso || key.startsWith(focusIso + "|")) thumbCache.delete(key);
  }
  refreshTrayThumb(focusIso);
  syncSkinBar();
  requestDraw();
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
  mainGL.resize(w, h, pixelRatio());
  if (mode === "puzzle" && proj) {
    if (overlayMode !== "puzzle") {
      overlayMode = "puzzle";
      resetOverlay();
    }
    const order = drawOrder();
    mainGL.drawPieces(order.map((p) => pieceDraw(p, mainGL)), view, { shadow: !interacting });
    if (interacting) {
      playfield.classList.add("interacting");
      drawFastPuzzleLines(order);
    } else {
      clearStrokes(w, h);
      playfield.classList.remove("interacting");
      syncPuzzleLines(order);
      syncGraticule();
      drawGhosts();
      drawLabels(order);
      drawHandles();
    }
  } else {
    if (overlayMode !== "globe") {
      overlayMode = "globe";
      resetOverlay();
      ghostsEl.replaceChildren();
      labelsEl.replaceChildren();
      handlesEl.replaceChildren();
    }
    const radius = globeRadius();
    mainGL.drawGlobe(globe.lon0, globe.lat0, radius, w, h);
    drawGlobeLines(radius);
    if (interacting) playfield.classList.add("interacting");
    else playfield.classList.remove("interacting");
  }
}

function resetOverlay() {
  lineNodes.clear();
  linesEl.replaceChildren();
  gratNode = null;
  gratFor = null;
  gratD = "";
  graticuleEl.replaceChildren();
}

function strokeContext(w, h) {
  const ratio = pixelRatio();
  const bw = Math.max(1, Math.round(w * ratio));
  const bh = Math.max(1, Math.round(h * ratio));
  if (strokesEl.width !== bw || strokesEl.height !== bh) {
    strokesEl.width = bw;
    strokesEl.height = bh;
  }
  const ctx = strokesEl.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  strokesEl.hidden = false;
  return ctx;
}

function clearStrokes(w, h) {
  if (strokesEl.hidden && strokesEl.width < 2) return;
  const ctx = strokeContext(w, h);
  ctx.clearRect(0, 0, w, h);
  strokesEl.hidden = true;
}

function globeRadius() {
  return Math.min(view.width, view.height) * globe.mul;
}

function drawGlobeLines(radius) {
  if (!worldStrokes) return;
  const ctx = strokeContext(view.width, view.height);
  drawGlobeStrokes(ctx, view.width, view.height, worldStrokes, globe.lon0, globe.lat0, radius, mode, interacting);
}

const SVGNS = "http://www.w3.org/2000/svg";

function kmPath(lines, close) {
  let d = "";
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      d += (i ? "L" : "M") + line[i][0].toFixed(1) + " " + (-line[i][1]).toFixed(1) + " ";
    }
    if (close) d += "Z ";
  }
  return d;
}

function kmTransform(cx, cy, scale) {
  const a = scale / view.kmPerPx;
  const tx = (cx - view.originX) / view.kmPerPx;
  const ty = view.height - (cy - view.originY) / view.kmPerPx;
  return `matrix(${a.toFixed(5)},0,0,${a.toFixed(5)},${tx.toFixed(2)},${ty.toFixed(2)})`;
}

function coarseRings(mesh) {
  if (mesh.coarse) return mesh.coarse;
  mesh.coarse = mesh.rings.map((ring) => {
    if (ring.length < 220) return ring;
    const stride = Math.ceil(ring.length / 160);
    const out = [];
    for (let i = 0; i < ring.length; i += stride) out.push(ring[i]);
    if (out[out.length - 1] !== ring[ring.length - 1]) out.push(ring[ring.length - 1]);
    return out;
  });
  return mesh.coarse;
}

function drawFastPuzzleLines(order) {
  const ctx = strokeContext(view.width, view.height);
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  for (const piece of order) {
    const mesh = meshes.get(piece.iso);
    if (!mesh) continue;
    for (const ring of coarseRings(mesh)) {
      for (let i = 0; i < ring.length; i++) {
        const x = piece.cx + piece.scale * ring[i][0];
        const y = piece.cy + piece.scale * ring[i][1];
        const sx = (x - view.originX) / view.kmPerPx;
        const sy = view.height - (y - view.originY) / view.kmPerPx;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,0.82)";
  ctx.stroke();
  const focus = focusIso && order.find((piece) => piece.iso === focusIso);
  if (focus) strokeFocusGlow(ctx, focus);
}

function strokeFocusGlow(ctx, piece) {
  const mesh = meshes.get(piece.iso);
  if (!mesh) return;
  ctx.save();
  ctx.beginPath();
  for (const ring of coarseRings(mesh)) {
    for (let i = 0; i < ring.length; i += 1) {
      const x = piece.cx + piece.scale * ring[i][0];
      const y = piece.cy + piece.scale * ring[i][1];
      const sx = (x - view.originX) / view.kmPerPx;
      const sy = view.height - (y - view.originY) / view.kmPerPx;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
  }
  ctx.shadowColor = "rgba(210, 140, 52, 0.55)";
  ctx.shadowBlur = 10;
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(226, 168, 78, 0.28)";
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = "rgba(255, 214, 150, 0.72)";
  ctx.stroke();
  ctx.restore();
}

function ensureMeshPaths(mesh) {
  if (mesh.ringD != null) return;
  mesh.ringD = kmPath(mesh.rings, true);
  mesh.riverD = kmPath(mesh.rivers, false);
}

function syncPuzzleLines(order) {
  const seen = new Set();
  for (const piece of order) {
    const mesh = meshes.get(piece.iso);
    if (!mesh) continue;
    seen.add(piece.iso);
    ensureMeshPaths(mesh);
    let node = lineNodes.get(piece.iso);
    if (!node) {
      const g = document.createElementNS(SVGNS, "g");
      const river = document.createElementNS(SVGNS, "path");
      river.setAttribute("class", "river");
      river.setAttribute("d", mesh.riverD);
      if (!mesh.riverD) river.setAttribute("visibility", "hidden");
      const outline = document.createElementNS(SVGNS, "path");
      outline.setAttribute("d", mesh.ringD);
      const glow = document.createElementNS(SVGNS, "path");
      glow.setAttribute("class", "border-glow");
      glow.setAttribute("d", mesh.ringD);
      glow.setAttribute("vector-effect", "non-scaling-stroke");
      g.dataset.iso = piece.iso;
      g.append(river, glow, outline);
      linesEl.append(g);
      node = { g, outline, glow, cls: "", glowOn: false };
      lineNodes.set(piece.iso, node);
    }
    const glowOn = piece.iso === focusIso;
    if (node.glow && node.glowOn !== glowOn) {
      node.glow.classList.toggle("on", glowOn);
      node.glowOn = glowOn;
    }
    const cls = `outline${piece.fixed ? " centre" : ""}${piece.locked ? " locked" : ""}`;
    if (node.cls !== cls) {
      node.outline.setAttribute("class", cls);
      node.cls = cls;
    }
    const tf = kmTransform(piece.cx, piece.cy, piece.scale);
    if (node.tf !== tf) {
      node.g.setAttribute("transform", tf);
      node.tf = tf;
    }
  }
  for (const [iso, node] of lineNodes) {
    if (seen.has(iso)) continue;
    node.g.remove();
    lineNodes.delete(iso);
  }
}

function syncGraticule() {
  if (!proj) return;
  if (gratFor !== proj) {
    const lines = [];
    const push = (lon, lat, pts) => {
      const xy = proj.forward(lon, lat);
      if (!xy) {
        if (pts.length > 1) lines.push(pts.slice());
        pts.length = 0;
        return;
      }
      pts.push(xy);
    };
    for (let lon = -180; lon <= 180; lon += 15) {
      const pts = [];
      for (let lat = -70; lat <= 80; lat += 4) push(lon, lat, pts);
      if (pts.length > 1) lines.push(pts);
    }
    for (let lat = -60; lat <= 80; lat += 15) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += 4) push(lon, lat, pts);
      if (pts.length > 1) lines.push(pts);
    }
    gratD = kmPath(lines, false);
    gratFor = proj;
    gratNode = null;
    graticuleEl.replaceChildren();
  }
  if (!gratNode) {
    gratNode = document.createElementNS(SVGNS, "g");
    const path = document.createElementNS(SVGNS, "path");
    path.setAttribute("d", gratD);
    gratNode.append(path);
    graticuleEl.append(gratNode);
  }
  gratNode.setAttribute("transform", kmTransform(0, 0, 1));
}

function drawGhosts() {
  const targets = flashTargets();
  if (!targets.size) {
    ghostsEl.innerHTML = "";
    return;
  }
  let html = "";
  for (const iso of targets) {
    const mesh = meshes.get(iso);
    if (!mesh) continue;
    const d = screenPath(mesh.rings, { cx: mesh.cx, cy: mesh.cy, scale: 1 }, view);
    const span = Math.max(mesh.width, mesh.height) / view.kmPerPx;
    const stroke = span < 26 ? 3.4 : 2.4;
    html += `<path class="ghost${iso === namedFlash ? " named" : ""}" data-iso="${iso}" style="stroke-width:${stroke}px" d="${d}"/>`;
  }
  ghostsEl.innerHTML = html;
}

const labelMeasure = document.createElement("canvas").getContext("2d");
const textWidthCache = new Map();
const fitCache = new Map();

function textWidth(text, size, weight) {
  const key = `${weight}|${size}|${text}`;
  const hit = textWidthCache.get(key);
  if (hit != null) return hit;
  labelMeasure.font = `${weight} ${size}px "Avenir Next", "Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif`;
  const w = labelMeasure.measureText(text).width;
  textWidthCache.set(key, w);
  return w;
}

function labelMetrics(text) {
  const mainW = textWidth(text.main || "", 13, 700);
  const subW = text.sub ? textWidth(text.sub, 11, 500) : 0;
  return {
    w: Math.ceil(Math.max(mainW, subW) * 1.04) + 4,
    h: text.sub ? 28 : 16,
  };
}

function pointInPiece(piece, mesh, sx, sy) {
  const geo = pxToGeo(sx, sy);
  const ax = mesh.cx + (geo.gx - piece.cx) / piece.scale;
  const ay = mesh.cy + (geo.gy - piece.cy) / piece.scale;
  const ll = proj.inverse(ax, ay);
  if (!ll || Number.isNaN(ll[0]) || Number.isNaN(ll[1])) return false;
  return d3.geoContains(mesh.feature, ll);
}

function labelFits(piece, mesh, text) {
  const key = `${piece.iso}|${view.kmPerPx.toFixed(2)}|${piece.scale.toFixed(3)}|${text.main}|${text.sub}`;
  if (fitCache.has(key)) return fitCache.get(key);
  const box = labelMetrics(text);
  const bw = mesh.width * piece.scale / view.kmPerPx;
  const bh = mesh.height * piece.scale / view.kmPerPx;
  let ok = box.w < bw - 4 && box.h < bh - 4;
  if (ok) {
    const anchor = screenOf(piece.cx, piece.cy);
    const hw = box.w / 2;
    const hh = box.h / 2;
    for (const dx of [-hw, 0, hw]) {
      for (const dy of [-hh, 0, hh]) {
        if (!pointInPiece(piece, mesh, anchor.x + dx, anchor.y + dy)) ok = false;
      }
    }
  }
  if (fitCache.size > 500) fitCache.clear();
  fitCache.set(key, ok);
  return ok;
}

function countryText(mesh) {
  const meta = mesh.feature.properties;
  return pick({ en: meta.name, zh: meta.zh });
}

function namedPiece(piece) {
  return piece.locked || playKind !== "build";
}

function interiorScreen(piece, mesh) {
  const spots = [];
  const label = mesh.feature.properties.label;
  if (label) spots.push(label);
  const mid = proj.inverse(mesh.cx, mesh.cy);
  if (mid) spots.push(mid);
  for (const ll of spots) {
    if (!d3.geoContains(mesh.feature, ll)) continue;
    const xy = proj.forward(ll[0], ll[1]);
    if (!xy) continue;
    return screenOf(
      piece.cx + piece.scale * (xy[0] - mesh.cx),
      piece.cy + piece.scale * (xy[1] - mesh.cy),
    );
  }
  return screenOf(piece.cx, piece.cy);
}

function pieceScreenBounds(piece, mesh) {
  const pts = [
    screenOf(piece.cx + piece.scale * mesh.relMinX, piece.cy + piece.scale * mesh.relMinY),
    screenOf(piece.cx + piece.scale * mesh.relMaxX, piece.cy + piece.scale * mesh.relMaxY),
  ];
  return {
    minX: Math.min(pts[0].x, pts[1].x),
    maxX: Math.max(pts[0].x, pts[1].x),
    minY: Math.min(pts[0].y, pts[1].y),
    maxY: Math.max(pts[0].y, pts[1].y),
  };
}

function overlapsChrome(x, y, w, h) {
  const zones = [
    { x: view.width - 210, y: 0, w: 210, h: 210 },
    { x: 0, y: 0, w: 280, h: 110 },
  ];
  return zones.some((z) => x < z.x + z.w && x + w > z.x && y < z.y + z.h && y + h > z.y);
}

function leaderMarkup(piece, mesh, text) {
  const box = labelMetrics(text);
  const anchor = interiorScreen(piece, mesh);
  const bounds = pieceScreenBounds(piece, mesh);
  const gap = 12;
  const tabW = box.w + 16;
  const tabH = box.h + 8;
  const candidates = [
    { x: bounds.maxX + gap, y: anchor.y - tabH / 2 },
    { x: bounds.minX - gap - tabW, y: anchor.y - tabH / 2 },
    { x: anchor.x - tabW / 2, y: bounds.minY - gap - tabH },
    { x: anchor.x - tabW / 2, y: bounds.maxY + gap },
  ];
  let tab = candidates.find((c) => (
    c.x > 8 && c.y > 8 && c.x + tabW < view.width - 8 && c.y + tabH < view.height - 8
    && !overlapsChrome(c.x, c.y, tabW, tabH)
  ));
  if (!tab) {
    tab = {
      x: clamp(candidates[0].x, 8, Math.max(8, view.width - tabW - 8)),
      y: clamp(candidates[0].y, 8, Math.max(8, view.height - tabH - 8)),
    };
  }
  const left = anchor.x < tab.x;
  const above = anchor.y < tab.y;
  const endX = left ? tab.x : tab.x + tabW;
  const endY = above ? tab.y : tab.y + tabH;
  const nearerX = Math.abs(anchor.x - endX) < Math.abs(anchor.x - (tab.x + tabW / 2));
  const tipX = nearerX ? endX : tab.x + tabW / 2;
  const tipY = nearerX ? tab.y + tabH / 2 : endY;
  const name = `<b>${esc(text.main)}</b>${text.sub ? `<span>${esc(text.sub)}</span>` : ""}`;
  return `<svg class="leader-layer" aria-hidden="true"><line x1="${anchor.x.toFixed(1)}" y1="${anchor.y.toFixed(1)}" x2="${tipX.toFixed(1)}" y2="${tipY.toFixed(1)}"/><circle cx="${anchor.x.toFixed(1)}" cy="${anchor.y.toFixed(1)}" r="2.6"/></svg><div class="name-tab" style="left:${tab.x.toFixed(1)}px;top:${tab.y.toFixed(1)}px">${name}</div>`;
}

function drawLabels(order) {
  let html = "";
  for (const piece of order) {
    if (!namedPiece(piece)) continue;
    const mesh = meshes.get(piece.iso);
    if (!mesh) continue;
    const text = countryText(mesh);
    if (!labelFits(piece, mesh, text)) continue;
    const at = screenOf(piece.cx, piece.cy);
    html += `<div class="map-label" style="left:${at.x}px;top:${at.y}px"><b>${esc(text.main)}</b>${text.sub ? `<span>${esc(text.sub)}</span>` : ""}</div>`;
  }
  if (hoverIso && pieces.has(hoverIso) && meshes.has(hoverIso)) {
    const piece = pieces.get(hoverIso);
    const mesh = meshes.get(hoverIso);
    if (namedPiece(piece)) {
      const text = countryText(mesh);
      if (!labelFits(piece, mesh, text)) html += leaderMarkup(piece, mesh, text);
    }
  }
  labelsEl.innerHTML = html;
}

function setHover(iso) {
  if (hoverIso === iso) return;
  hoverIso = iso;
  requestDraw();
}

function updateHover(e) {
  if (mode !== "puzzle" || e.buttons || cardsOpen || busy || pinching) {
    setHover(null);
    return;
  }
  if (e.target.closest && e.target.closest("button, a, input, select, #puzzle-tools, #mode-choice, #ask, #lang")) {
    setHover(null);
    return;
  }
  const p = localPoint(e);
  const iso = hitTest(p.x, p.y);
  const piece = iso ? pieces.get(iso) : null;
  if (!piece || !namedPiece(piece)) { setHover(null); return; }
  const mesh = meshes.get(iso);
  if (!mesh || labelFits(piece, mesh, countryText(mesh))) { setHover(null); return; }
  setHover(iso);
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

function projectCoasts() {
  coastKm = [];
  if (!proj || !coastLonLat) return;
  for (const line of coastLonLat) {
    let out = [];
    let prev = null;
    const flush = () => {
      if (out.length >= 2) coastKm.push(out);
      out = [];
      prev = null;
    };
    for (const [lon, lat] of line) {
      const xy = proj.forward(lon, lat);
      if (!xy) { flush(); continue; }
      if (prev && Math.hypot(xy[0] - prev[0], xy[1] - prev[1]) > 900) flush();
      out.push(xy);
      prev = xy;
    }
    flush();
  }
}

function shook(samples) {
  if (samples.length < 5) return false;
  const span = samples[samples.length - 1].t - samples[0].t;
  if (span < 120 || span > 620) return false;
  let reversals = 0;
  let strokeStart = samples[0];
  let strokeDir = null;
  let path = 0;
  let last = samples[0];
  for (let i = 1; i < samples.length; i++) {
    const p = samples[i];
    const dx = p.x - last.x;
    const dy = p.y - last.y;
    const step = Math.hypot(dx, dy);
    if (step < 2.5) continue;
    path += step;
    const ux = dx / step;
    const uy = dy / step;
    if (!strokeDir) {
      strokeDir = { x: ux, y: uy };
      last = p;
      continue;
    }
    const dot = strokeDir.x * ux + strokeDir.y * uy;
    if (dot < -0.5) {
      const leg = Math.hypot(last.x - strokeStart.x, last.y - strokeStart.y);
      if (leg >= 18 && leg <= 260) {
        reversals += 1;
        strokeStart = last;
        strokeDir = { x: ux, y: uy };
      } else if (leg > 260) {
        reversals = 0;
        strokeStart = last;
        strokeDir = { x: ux, y: uy };
        path = step;
      }
    } else {
      const stroke = Math.hypot(p.x - strokeStart.x, p.y - strokeStart.y);
      if (stroke > 260) {
        reversals = 0;
        strokeStart = p;
        strokeDir = { x: ux, y: uy };
        path = 0;
      } else if (dot > 0.4) {
        strokeDir = { x: ux, y: uy };
      }
    }
    last = p;
  }
  const net = Math.hypot(
    samples[samples.length - 1].x - samples[0].x,
    samples[samples.length - 1].y - samples[0].y,
  );
  return reversals >= 3 && path >= 72 && net <= path * 0.5;
}

function beginShake(e) {
  if (mode !== "puzzle" || pinching) return;
  shakeWatch = {
    fired: false,
    samples: [{ t: performance.now(), x: e.clientX, y: e.clientY }],
  };
}

function sampleShake(e) {
  if (!shakeWatch || shakeWatch.fired || pinching || pointers.size >= 2) return;
  const now = performance.now();
  const samples = shakeWatch.samples;
  samples.push({ t: now, x: e.clientX, y: e.clientY });
  const cutoff = now - 600;
  while (samples.length > 2 && samples[0].t < cutoff) samples.shift();
  if (shook(samples)) {
    shakeWatch.fired = true;
    startCoastSplash();
  }
}

function endShake() {
  shakeWatch = null;
}

function stopCoastSplash() {
  splashStart = 0;
  if (splashFrame) {
    cancelAnimationFrame(splashFrame);
    splashFrame = 0;
  }
  clearTimeout(splashTimer);
  splashTimer = 0;
  coastsEl.innerHTML = "";
  coastsEl.removeAttribute("opacity");
}

function startCoastSplash() {
  if (mode !== "puzzle" || !coastKm.length) return;
  splashStart = performance.now();
  clearTimeout(splashTimer);
  splashTimer = setTimeout(() => {
    if (!splashStart || performance.now() - splashStart >= 1750) stopCoastSplash();
  }, 1900);
  if (splashFrame) return;
  const step = (now) => {
    const age = now - splashStart;
    if (mode !== "puzzle" || !splashStart || age >= 1850) {
      splashFrame = 0;
      splashStart = 0;
      coastsEl.innerHTML = "";
      coastsEl.removeAttribute("opacity");
      return;
    }
    paintCoasts(now);
    splashFrame = requestAnimationFrame(step);
  };
  splashFrame = requestAnimationFrame(step);
}

function paintCoasts(now) {
  const age = now - splashStart;
  const u = age / 1800;
  if (u <= 0 || u >= 1) return;
  const env = Math.sin(Math.PI * u);
  const shimmer = 0.84 + 0.16 * Math.sin(age / 110);
  coastsEl.setAttribute("opacity", (env * shimmer).toFixed(3));
  const k = view.kmPerPx;
  const pad = 48 * k;
  const minX = view.originX - pad;
  const maxX = view.originX + view.width * k + pad;
  const minY = view.originY - pad;
  const maxY = view.originY + view.height * k + pad;
  let d = "";
  const drops = [];
  let pen = false;
  let last = null;
  let carry = 0;
  const minPx = 2.2;
  for (const line of coastKm) {
    pen = false;
    last = null;
    for (const [x, y] of line) {
      if (x < minX || x > maxX || y < minY || y > maxY) {
        pen = false;
        last = null;
        continue;
      }
      const sx = (x - view.originX) / k;
      const sy = view.height - (y - view.originY) / k;
      if (last) {
        const dist = Math.hypot(sx - last[0], sy - last[1]);
        if (pen && dist < minPx) continue;
        carry += dist;
        if (carry > 78 && drops.length < 42) {
          carry = 0;
          drops.push([sx, sy, drops.length]);
        }
      }
      d += (pen ? "L" : "M") + sx.toFixed(1) + " " + sy.toFixed(1) + " ";
      pen = true;
      last = [sx, sy];
    }
  }
  if (!d) {
    coastsEl.innerHTML = "";
    return;
  }
  const ripple = (age / 26) % 90;
  let dots = "";
  for (const [x, y, i] of drops) {
    const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(age / 150 + i * 0.85));
    const r = 1.05 + pulse * 1.35;
    dots += `<circle class="coast-ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 2.15).toFixed(1)}"/>`;
    dots += `<circle class="coast-drop" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/>`;
  }
  coastsEl.innerHTML =
    `<path class="coast-wash" d="${d}"/>` +
    `<path class="coast-line" d="${d}"/>` +
    `<path class="coast-ripple" d="${d}" stroke-dashoffset="${(-ripple).toFixed(1)}"/>` +
    dots;
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
  setFocus(iso);
  const piece = pieces.get(iso);
  if (piece.locked) { startPlacedGesture(e, iso); return; }
  startMove(e, iso);
}

function track(pointerId, move, up) {
  const onMove = (e) => {
    if (e.pointerId !== pointerId || pinching) return;
    move(e);
  };
  const onUp = (e) => {
    if (e.pointerId !== pointerId) return;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    if (pinching) return;
    if (didPinch) {
      if (pointers.size === 0) didPinch = false;
      return;
    }
    up(e);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

function startGlobeDrag(e) {
  globeAnchor = null;
  globe.targetMul = globe.mul;
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
    noteInteraction();
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
      const place = CONT_ZH[continent] || continent;
      showToast({
        en: `Coming soon — ${continent}`,
        zh: `即将推出 · ${place}`,
      });
    }
    return;
  }
  if (continent !== "Asia") return;
  const nbs = borders.neighbours[iso];
  if (!nbs || !nbs.length) {
    const name = f.properties.name;
    const zh = f.properties.zh;
    showToast({
      en: `${name} has no land neighbours.`,
      zh: `${zh}没有陆地邻国。`,
    });
    return;
  }
  enterPuzzle(iso);
}

function startPlacedGesture(e, iso) {
  setHover(null);
  const originX = view.originX;
  const originY = view.originY;
  const startX = e.clientX;
  const startY = e.clientY;
  let moved = false;
  beginShake(e);
  playfield.classList.add("panning");
  track(e.pointerId, (ev) => {
    sampleShake(ev);
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (Math.hypot(dx, dy) <= 5) return;
    moved = true;
    view.originX = originX - dx * view.kmPerPx;
    view.originY = originY + dy * view.kmPerPx;
    noteInteraction();
    requestDraw();
  }, () => {
    endShake();
    playfield.classList.remove("panning");
    if (moved || !cardsMode || !pieces.get(iso)?.locked) return;
    cardsMode = false;
    syncCardsButton();
    paintHeading();
    openCards(iso);
  });
}

function startPan(e) {
  const originX = view.originX, originY = view.originY;
  const startX = e.clientX, startY = e.clientY;
  beginShake(e);
  playfield.classList.add("panning");
  track(e.pointerId, (ev) => {
    sampleShake(ev);
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    view.originX = originX - dx * view.kmPerPx;
    view.originY = originY + dy * view.kmPerPx;
    noteInteraction();
    requestDraw();
  }, () => {
    endShake();
    playfield.classList.remove("panning");
  });
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
  setFocus(iso);
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
  beginShake(e);
  showPct(piece, e.clientX, e.clientY);
  track(e.pointerId, (ev) => {
    sampleShake(ev);
    const lp = localPoint(ev);
    const g = pxToGeo(lp.x, lp.y);
    piece.cx = g.gx + offGx;
    piece.cy = g.gy + offGy;
    showPct(piece, ev.clientX, ev.clientY);
    noteInteraction();
    requestDraw();
  }, () => {
    endShake();
    endGesture(piece, e);
  });
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
    noteInteraction();
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
      showToast("chainBlock");
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
    ? buildNeighbours(iso)
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

function syncViewSize() {
  const w = playfield.clientWidth;
  const h = playfield.clientHeight;
  if (w > 2 && h > 2) {
    view.width = w;
    view.height = h;
  }
}

function onWheel(e) {
  if (cardsOpen) return;
  if (mode !== "puzzle" && mode !== "world" && mode !== "asia") return;
  e.preventDefault();
  syncViewSize();
  const dy = wheelDelta(e);
  if (!dy) return;
  const factor = Math.exp(-dy * 0.0016);
  const p = localPoint(e);
  if (mode === "puzzle") {
    if (!proj) return;
    const before = pxToGeo(p.x, p.y);
    view.kmPerPx = clamp(view.kmPerPx / factor, MIN_KMPP, MAX_KMPP);
    view.originX = before.gx - p.x * view.kmPerPx;
    view.originY = before.gy - (view.height - p.y) * view.kmPerPx;
    noteInteraction();
    requestDraw();
    return;
  }
  const base = globeAnchor ? globe.targetMul : globe.mul;
  globe.targetMul = clamp(base * factor, GLOBE_MIN_MUL, GLOBE_MAX_MUL);
  const ll = invertGlobe(p.x, p.y);
  globeAnchor = ll ? { lon: ll[0], lat: ll[1], x: p.x, y: p.y } : null;
  animateGlobe();
}

function wheelDelta(e) {
  if (e.deltaMode === 1) return e.deltaY * 16;
  if (e.deltaMode === 2) return e.deltaY * view.height;
  return e.deltaY;
}

function invertGlobe(px, py) {
  const radius = globeRadius();
  const dx = px - view.width / 2;
  const dy = py - view.height / 2;
  if (dx * dx + dy * dy > radius * radius * 0.98) return null;
  ortho.rotate([-globe.lon0, -globe.lat0]).translate([view.width / 2, view.height / 2]).scale(radius);
  const ll = ortho.invert([px, py]);
  if (!ll || Number.isNaN(ll[0]) || Number.isNaN(ll[1])) return null;
  return ll;
}

function holdAnchor(anchor) {
  const radius = Math.min(view.width, view.height) * globe.mul;
  if (radius < 8) return;
  ortho.translate([view.width / 2, view.height / 2]).scale(radius);
  let lon = globe.lon0;
  let lat = globe.lat0;
  for (let i = 0; i < 8; i++) {
    ortho.rotate([-lon, -lat]);
    const cur = ortho([anchor.lon, anchor.lat]);
    if (!cur || Number.isNaN(cur[0])) break;
    const errx = cur[0] - anchor.x;
    const erry = cur[1] - anchor.y;
    if (Math.hypot(errx, erry) < 0.6) break;
    const cos = Math.max(0.25, Math.cos(lat * Math.PI / 180));
    lon += (errx / radius) * (180 / Math.PI) / cos;
    lat = clamp(lat - (erry / radius) * (180 / Math.PI), -75, 75);
  }
  globe.lon0 = lon;
  globe.lat0 = lat;
}

function onPointerDown(e) {
  if (e.target.closest("button, a, input, select, label, #lang")) return;
  if (e.isPrimary) {
    for (const id of pointers.keys()) {
      if (id !== e.pointerId) pointers.delete(id);
    }
    pinching = false;
    pinch = null;
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { playfield.setPointerCapture(e.pointerId); } catch { /* synthetic events have no active pointer */ }
  if (pointers.size >= 2) {
    pinching = true;
    didPinch = true;
    endShake();
    globeAnchor = null;
    globe.targetMul = globe.mul;
    globe.targetLon = globe.lon0;
    globe.targetLat = globe.lat0;
    const pts = [...pointers.values()].slice(-2);
    pinch = {
      dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
      mul: globe.mul,
      kmpp: view.kmPerPx,
    };
    return;
  }
  onPlayDown(e);
}

function onPointerMove(e) {
  if (!pointers.has(e.pointerId)) {
    updateHover(e);
    return;
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!pinching || pointers.size < 2 || !pinch) return;
  syncViewSize();
  const pts = [...pointers.values()].slice(-2);
  const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
  const ratio = clamp(dist / pinch.dist, 0.2, 5);
  const mid = localPoint({ clientX: (pts[0].x + pts[1].x) / 2, clientY: (pts[0].y + pts[1].y) / 2 });
  if (mode === "puzzle" && proj) {
    const before = pxToGeo(mid.x, mid.y);
    view.kmPerPx = clamp(pinch.kmpp / ratio, MIN_KMPP, MAX_KMPP);
    view.originX = before.gx - mid.x * view.kmPerPx;
    view.originY = before.gy - (view.height - mid.y) * view.kmPerPx;
    noteInteraction();
    requestDraw();
    return;
  }
  if (mode !== "world" && mode !== "asia") return;
  const ll = invertGlobe(mid.x, mid.y);
  globe.mul = clamp(pinch.mul * ratio, GLOBE_MIN_MUL, GLOBE_MAX_MUL);
  globe.targetMul = globe.mul;
  if (ll) {
    holdAnchor({ lon: ll[0], lat: ll[1], x: mid.x, y: mid.y });
    globe.targetLon = globe.lon0;
    globe.targetLat = globe.lat0;
  }
  noteInteraction();
  requestDraw();
}

function onPointerUp(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) {
    pinching = false;
    pinch = null;
  }
}

function allLocked() {
  if (playKind === "build") return buildIsos.every((iso) => pieces.get(iso)?.locked);
  if (!centreIso) return false;
  return borders.neighbours[centreIso].every((iso) => pieces.get(iso)?.locked);
}

function buildPhotoGrid() {
  const root = $("card-photos");
  root.innerHTML = SLOTS.map(([slot]) => `
    <figure class="photo-card" data-slot="${slot}">
      <div class="mat"><img alt="" /></div>
      <figcaption>
        <span class="eyebrow"></span>
        <strong class="nm-en"></strong>
        <em class="nm-zh"></em>
      </figcaption>
    </figure>`).join("");
  paintPhotoLabels();
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
  $("card-title").textContent = line({ en: meta.name, zh: meta.zh });
  const shapeOn = cardIndex <= 1;
  $("card-shape-wrap").hidden = !shapeOn;
  $("card-copy").hidden = cardIndex > 1;
  $("card-flag").hidden = cardIndex !== 2;
  $("card-photos").hidden = cardIndex !== 3;
  $("card-back").disabled = cardIndex === 0;
  $("card-next").textContent = line(cardIndex === 3 ? "close" : "next");
  document.querySelectorAll("#card-dots span").forEach((dot, i) => {
    dot.classList.toggle("on", i === cardIndex);
  });
  if (cardIndex === 0) paintCopy(card.blurb);
  else if (cardIndex === 1) paintCopy(borderSentence(iso));
  if (shapeOn) drawCardShape(iso, cardIndex === 1);
  if (cardIndex === 2) {
    const img = $("flag-img");
    img.src = `assets/flags/${iso.toLowerCase()}.svg`;
    img.alt = `Flag of ${meta.name}`;
    $("flag-caption").textContent = line({
      en: `Flag of ${meta.name}`,
      zh: `${meta.zh}国旗`,
    });
  }
  if (cardIndex === 3) fillPhotos(iso, card);
}

function buildBorderSentence(iso, meta) {
  const all = buildNeighbours(iso);
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

function cardMates(iso) {
  if (playKind === "build") {
    return buildNeighbours(iso).filter((id) => id !== iso && pieces.get(id)?.locked && meshes.has(id));
  }
  if (!centreIso || !meshes.has(centreIso)) return [];
  if (iso === centreIso) return (borders.neighbours[centreIso] || []).filter((id) => meshes.has(id));
  return [centreIso];
}

function cardFrame(mesh, mates) {
  let minX = mesh.minX, minY = mesh.minY, maxX = mesh.maxX, maxY = mesh.maxY;
  const span = Math.max(mesh.width, mesh.height) || 1;
  for (const id of mates) {
    const other = meshes.get(id);
    if (!other || Math.max(other.width, other.height) > span * 1.4) continue;
    minX = Math.min(minX, other.minX);
    minY = Math.min(minY, other.minY);
    maxX = Math.max(maxX, other.maxX);
    maxY = Math.max(maxY, other.maxY);
  }
  return { minX, minY, maxX, maxY };
}

function sharedBorderPaths(iso, mates, cardView) {
  const paths = [];
  for (const id of mates) {
    const lines = borders.seams[pairKey(iso, id)] || [];
    for (const line of lines) {
      let d = "";
      let n = 0;
      let broke = false;
      for (const [lon, lat] of line) {
        const xy = proj.forward(lon, lat);
        if (!xy) { broke = true; break; }
        const s = screenOfKm(xy[0], xy[1], cardView);
        d += (n ? "L" : "M") + s.x.toFixed(1) + " " + s.y.toFixed(1) + " ";
        n += 1;
      }
      if (!broke && n >= 2) paths.push(d);
    }
  }
  return paths;
}

function drawCardShape(iso, racing) {
  const mesh = meshes.get(iso);
  if (!mesh) return;
  const mates = racing ? cardMates(iso) : [];
  const box = cardFrame(mesh, mates);
  const w = 640, h = 340;
  const pad = 0.8;
  const kmpp = Math.max((box.maxX - box.minX) / (w * pad), (box.maxY - box.minY) / (h * pad)) || 1;
  const midX = (box.minX + box.maxX) / 2;
  const midY = (box.minY + box.maxY) / 2;
  const cardView = {
    width: w, height: h, kmPerPx: kmpp,
    originX: midX - (w * kmpp) / 2,
    originY: midY - (h * kmpp) / 2,
  };
  const entries = [];
  for (const id of mates) {
    const other = meshes.get(id);
    entries.push({ mesh: other, cx: other.cx, cy: other.cy, scale: 1, alpha: 0.42 });
  }
  entries.push({ mesh, cx: mesh.cx, cy: mesh.cy, scale: 1, alpha: 1 });
  cardGL.resize(w, h);
  cardGL.drawPieces(entries, cardView, { shadow: false });
  const piece = { cx: mesh.cx, cy: mesh.cy, scale: 1 };
  const bordersD = racing ? sharedBorderPaths(iso, mates, cardView) : [];
  const quiet = bordersD.length > 0;
  let matesSvg = "";
  for (const id of mates) {
    const other = meshes.get(id);
    matesSvg += `<path class="mate" d="${screenPath(other.rings, { cx: other.cx, cy: other.cy, scale: 1 }, cardView)}"/>`;
  }
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
  const seam = bordersD.map((d) => `<path class="seam" d="${d}"/>`).join("");
  const comet = bordersD.map((d) =>
    `<path class="comet comet-glow" pathLength="1000" d="${d}"/>` +
    `<path class="comet comet-tail" pathLength="1000" d="${d}"/>` +
    `<path class="comet comet-head" pathLength="1000" d="${d}"/>`
  ).join("");
  $("card-svg").setAttribute("viewBox", `0 0 ${w} ${h}`);
  $("card-svg").innerHTML = `${matesSvg}<path class="outline${quiet ? " quiet" : ""}" d="${outline}"/>${seam}${comet}${dot}`;
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
    const text = pick({ en: info.en, zh: info.zh });
    fig.querySelector(".nm-en").textContent = text.main;
    const sub = fig.querySelector(".nm-zh");
    sub.textContent = text.sub;
    sub.hidden = !text.sub;
    img.alt = text.main;
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
      { en: `You built the whole of ${BUILD_TARGET.en}.`, zh: `你拼出了整个${BUILD_TARGET.zh}。` },
      { en: `All ${buildIsos.length} countries are in their real places.`, zh: `${buildIsos.length} 个国家都在真正的位置上。` },
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
  const text = pick(slide);
  $("reward-en").textContent = text.main;
  $("reward-zh").textContent = text.sub;
  $("reward-zh").hidden = !text.sub;
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
  namedFlash = next === "capital" && askIso && !pieces.get(askIso)?.locked ? askIso : null;
  $("ask").hidden = false;
  $("ask-input").value = "";
  $("ask-msg").hidden = true;
  paintAsk(next);
  requestAnimationFrame(() => $("ask-input").focus());
  requestDraw();
}

function paintAsk(next = askMode) {
  if (!next || $("ask").hidden) return;
  if (next === "start") {
    $("ask-title").textContent = line({ en: BUILD_LABEL.en, zh: BUILD_LABEL.zh });
    $("ask-help").textContent = line({
      en: `Type any country in ${BUILD_TARGET.en} to begin.`,
      zh: `输入任何一个${BUILD_TARGET.zh}国家。`,
    });
  } else if (next === "name") {
    $("ask-title").textContent = line("whichCountry");
    $("ask-help").textContent = line("whichHelp");
  } else if (askIso) {
    const meta = shapeByIso.get(askIso).properties;
    $("ask-title").textContent = line({ en: meta.name, zh: meta.zh });
    $("ask-help").textContent = line("capitalHelp");
  }
}

function closeAsk() {
  askMode = null;
  askIso = null;
  namedFlash = null;
  $("ask").hidden = true;
  $("ask-msg").hidden = true;
  requestDraw();
}

function onAskInput() {
  if (askMode !== "name") return;
  const found = lookupCountry($("ask-input").value);
  const next = found.kind === "build" && !pieces.get(found.iso)?.locked ? found.iso : null;
  if (next === namedFlash) return;
  namedFlash = next;
  requestDraw();
}

function setAskMsg(row) {
  const text = typeof row === "string" ? pick(row) : pick(row);
  const el = $("ask-msg");
  el.hidden = false;
  el.textContent = text.sub ? `${text.main} ${text.sub}` : text.main;
}

function onAskSubmit(e) {
  e.preventDefault();
  const raw = $("ask-input").value;
  if (askMode === "capital") {
    if (!capitalMatches(askIso, raw)) {
      setAskMsg("notCapital");
      return;
    }
    const iso = askIso;
    closeAsk();
    placeByCapital(iso);
    return;
  }
  const found = lookupCountry(raw);
  if (found.kind === "empty") {
    setAskMsg("typeCountry");
    return;
  }
  if (found.kind === "unknown") {
    setAskMsg("notFound");
    return;
  }
  if (found.kind === "outside") {
    setAskMsg({
      en: `That country is not on this ${BUILD_TARGET.en} map.`,
      zh: `这个国家不在这幅${BUILD_TARGET.zh}地图上。`,
    });
    return;
  }
  if (askMode === "start") {
    enterBuild(found.iso);
    return;
  }
  if (pieces.get(found.iso)?.locked) {
    setAskMsg("alreadyPlaced");
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
  get globeView() {
    return { mul: globe.mul, lon: globe.lon0, lat: globe.lat0 };
  },
  get playKind() { return playKind; },
  get centre() { return centreIso; },
  get focus() { return focusIso; },
  get skin() { return focusIso ? chosenSkin(focusIso) : null; },
  setSkin(id) {
    if (!focusIso) return null;
    const list = skinsFor(focusIso);
    if (!list.some((skin) => skin.id === id)) return chosenSkin(focusIso);
    skinChoice.set(focusIso, id);
    writeSkin(focusIso, id);
    syncSkinBar();
    requestDraw();
    return id;
  },
  cycleSkin(dir) { cycleSkin(dir || 1); return chosenSkin(focusIso); },
  get guideOpen() { return guideOpen; },
  get progress() {
    if (playKind !== "build") return null;
    return { placed: placedCount(), total: buildIsos.length };
  },
  go: (iso) => {
    const id = String(iso || "").toUpperCase();
    if (borders?.neighbours[id]?.length) enterPuzzle(id);
  },
  build(name) {
    const found = lookupCountry(name);
    if (found.kind !== "build") return found;
    enterBuild(found.iso);
    return { ok: true, iso: found.iso, placed: placedCount(), total: buildIsos.length };
  },
  answer(name, capital) {
    if (playKind !== "build") return { ok: false, reason: "mode" };
    const found = lookupCountry(name);
    if (found.kind !== "build") return { ok: false, ...found };
    if (pieces.get(found.iso)?.locked) return { ok: false, reason: "placed", iso: found.iso };
    if (!capitalMatches(found.iso, capital)) return { ok: false, reason: "capital", iso: found.iso };
    placeByCapital(found.iso);
    return { ok: true, iso: found.iso, placed: placedCount(), total: buildIsos.length, locked: true };
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
  islandsLeft() {
    return islandsOnlyLeft();
  },
  flashing() {
    return [...flashTargets()];
  },
  placeLand() {
    if (playKind !== "build") return { ok: false };
    for (const iso of buildIsos) {
      if (!buildNeighbours(iso).length || pieces.get(iso)?.locked) continue;
      const mesh = meshes.get(iso);
      pieces.set(iso, { iso, cx: mesh.cx, cy: mesh.cy, scale: 1, locked: true, fixed: iso === buildStart });
      markTray(iso, true);
    }
    updateProgress();
    requestDraw();
    return { ok: true, placed: placedCount(), total: buildIsos.length, flashing: [...flashTargets()], note: !$("island-note").hidden };
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
  splash() {
    if (mode !== "puzzle") return false;
    startCoastSplash();
    return splashStart > 0;
  },
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
