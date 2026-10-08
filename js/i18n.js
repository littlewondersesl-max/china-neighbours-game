// One translation table for the interface.
// Country names, capitals, and card sentences use the same { en, zh } shape
// in data/shapes.json and data/cards.json, and are read with pick().
// To add a language: add it to LANGS, then add that key on every row here
// and on every country name, capital, and card sentence.

export const LANGS = [
  { id: "en", name: "English", short: "EN" },
  { id: "zh", name: "中文（简体）", short: "中文" },
];

const UI = {
  appTitle: { en: "Land Neighbours", zh: "陆地邻国" },
  back: { en: "Back", zh: "返回" },
  reveal: { en: "Reveal map", zh: "显示地图" },
  hideMap: { en: "Hide map", zh: "收起地图" },
  cards: { en: "Cards", zh: "卡片" },
  cardsHint: { en: "Click a placed country to open its cards", zh: "点击已放好的国家，打开它的卡片" },
  enterName: { en: "Enter country name", zh: "输入国名" },
  skipCards: { en: "Skip cards", zh: "跳过卡片" },
  chooseGame: { en: "Choose a game", zh: "选一种玩法" },
  neighbours: { en: "Neighbours", zh: "邻国拼图" },
  buildContinents: { en: "Build Continents", zh: "拼出大洲" },
  exampleMap: { en: "Example map", zh: "示例地图" },
  close: { en: "Close", zh: "关闭" },
  closeMap: { en: "Close map", zh: "关闭地图" },
  next: { en: "Next", zh: "下一张" },
  cardBack: { en: "Back", zh: "上一张" },
  backToMap: { en: "Back to map", zh: "返回地图" },
  cancel: { en: "Cancel", zh: "取消" },
  ok: { en: "OK", zh: "确定" },
  loading: { en: "Loading the map…", zh: "地图加载中…" },
  loadError: { en: "The map could not start.", zh: "地图没有打开。" },
  worldHint: { en: "Drag to spin · scroll or pinch to zoom · click a continent", zh: "拖动旋转 · 滚轮或双指缩放 · 点击大洲" },
  asiaZoom: { en: "Scroll or pinch to zoom", zh: "滚轮或双指缩放" },
  asiaHint: { en: "Click a country to start its neighbour puzzle · scroll or pinch to zoom", zh: "点击国家，拼它的邻国 · 滚轮或双指缩放" },
  puzzleHint: { en: "Scroll or pinch to zoom · drag a corner to resize · drag the map or a placed country to pan", zh: "滚轮或双指缩放 · 拖角落改大小 · 拖地图或已放好的国家来平移" },
  shakeHint: { en: "Shake a piece to see the coasts", zh: "摇一摇看海岸线" },
  buildHint: { en: "A shape locks only when it touches the chain · or enter a name and its capital", zh: "形状要连上已放好的国家，或输入国名和首都" },
  placed: { en: "{n} / {total} placed", zh: "已放好 {n} / {total}" },
  comingSoon: { en: "Coming soon — {name}", zh: "即将推出 · {name}" },
  noNeighbours: { en: "{name} has no land neighbours.", zh: "{name}没有陆地邻国。" },
  chainBlock: { en: "This shape has to touch a country already on the chain.", zh: "这块要和已经连上的国家接壤，才能放好。" },
  islandNote: { en: "The remaining countries have no land borders. They are islands! Enter their name and capital to place them.", zh: "剩下的国家没有陆地邻国，它们是岛国！输入国名和首都来放置它们。" },
  whichCountry: { en: "Which country?", zh: "哪个国家？" },
  whichHelp: { en: "Type its name. Next you will name its capital.", zh: "先写国名，下一步写首都。" },
  capitalHelp: { en: "What is its capital?", zh: "它的首都叫什么？" },
  startHelp: { en: "Type any country in {continent} to begin.", zh: "输入任何一个{continent}国家。" },
  typeCountry: { en: "Type a country name.", zh: "请输入一个国家的名字。" },
  notFound: { en: "I can't find that one. Try again in a language you turned on.", zh: "没找到。请用已打开的语言再试一次。" },
  notOnMap: { en: "That country is not on this {continent} map.", zh: "这个国家不在这幅{continent}地图上。" },
  alreadyPlaced: { en: "That country is already on the map.", zh: "这个国家已经放好了。" },
  notCapital: { en: "That's not the capital. Try again.", zh: "这不是首都，再试一次。" },
  animal: { en: "National animal", zh: "代表动物" },
  currency: { en: "Currency", zh: "货币" },
  landmark: { en: "Famous place", zh: "著名地点" },
  dish: { en: "Popular dish", zh: "美食" },
  piece: { en: "Piece", zh: "拼块" },
  langMain: { en: "Main language", zh: "主要语言" },
  langSub: { en: "Supplementary language", zh: "辅助语言" },
  langNone: { en: "None", zh: "无" },
  rewardEvery: { en: "You placed every piece.", zh: "你把每一块都放好了。" },
  rewardIslands: { en: "Islands and neighbours, together on one map.", zh: "岛屿和邻国，都在同一幅地图上。" },
};

const STORAGE_KEY = "ln-lang";
const known = new Set(LANGS.map((l) => l.id));

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
    const main = known.has(raw.main) ? raw.main : "en";
    let sub = known.has(raw.sub) ? raw.sub : null;
    if (sub === main) sub = null;
    return { main, sub };
  } catch {
    return { main: "en", sub: null };
  }
}

let state = readStored();
let changed = () => {};

function fill(text, vars) {
  if (!vars) return text || "";
  return String(text || "").replace(/\{(\w+)\}/g, (_, key) => (vars[key] == null ? "" : String(vars[key])));
}

export function getLang() {
  return { main: state.main, sub: state.sub };
}

export function activeLangs() {
  return state.sub && state.sub !== state.main ? [state.main, state.sub] : [state.main];
}

export function onLangChange(fn) {
  changed = fn;
}

export function setLang(main, sub) {
  const nextMain = known.has(main) ? main : "en";
  let nextSub = known.has(sub) ? sub : null;
  if (nextSub === nextMain) nextSub = null;
  state = { main: nextMain, sub: nextSub };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  changed();
}

export function pick(row, vars) {
  const dict = typeof row === "string" ? UI[row] : row;
  if (!dict) return { main: "", sub: "" };
  const main = fill(dict[state.main] || dict.en || "", vars);
  const sub = state.sub && state.sub !== state.main ? fill(dict[state.sub] || "", vars) : "";
  return { main, sub };
}

export function line(row, vars) {
  const { main, sub } = pick(row, vars);
  return sub ? `${main} · ${sub}` : main;
}

export function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

export function htmlStack(row, vars) {
  const { main, sub } = pick(row, vars);
  return sub ? `<b>${esc(main)}</b><span>${esc(sub)}</span>` : `<b>${esc(main)}</b>`;
}

export function langButtonText() {
  const main = LANGS.find((l) => l.id === state.main);
  const sub = state.sub ? LANGS.find((l) => l.id === state.sub) : null;
  if (!main) return "EN";
  return sub ? `${main.short} · ${sub.short}` : main.short;
}

export function scriptLang(raw) {
  return /[\u4e00-\u9fff]/.test(String(raw || "")) ? "zh" : "en";
}
