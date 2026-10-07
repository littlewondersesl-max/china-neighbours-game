(() => {
  const SIZE_TOL = 0.07;
  const POS_TOL_KM = 180;
  const SMALL_CODES = new Set(["BTN", "TJK", "KGZ", "NPL", "PRK", "LAO"]);
  const MIN_KMPP = 0.8;
  const MAX_KMPP = 40;

  const els = {
    playfield: document.getElementById("playfield"),
    mapWorld: document.getElementById("map-world"),
    piecesLayer: document.getElementById("pieces-layer"),
    chinaFixed: document.getElementById("china-fixed"),
    grid: document.getElementById("grid"),
    trayTop: document.getElementById("tray-top"),
    trayBottom: document.getElementById("tray-bottom"),
    pctLabel: document.getElementById("pct-label"),
    rewardOverlay: document.getElementById("reward-overlay"),
    rewardVideo: document.getElementById("reward-video"),
    rewardFallback: document.getElementById("reward-fallback"),
    rfStage: document.getElementById("rf-stage"),
    rfCaption: document.getElementById("rf-caption"),
    rewardClose: document.getElementById("reward-close"),
    factOverlay: null,
    overviewSvg: document.getElementById("overview-svg"),
    overviewWrap: document.getElementById("overview-wrap"),
    overviewTip: document.getElementById("overview-tooltip"),
  };

  let meta = null;
  /** View: kmPerPx + origin (bottom-left of playfield in CRS km). */
  let view = { kmPerPx: 10, originX: 0, originY: 0, width: 800, height: 600 };
  const pieces = new Map();
  let selected = null;
  let drag = null;
  let rewarded = false;
  let factOpen = false;
  let spaceDown = false;

  function geoToPx(gx, gy) {
    return {
      x: (gx - view.originX) / view.kmPerPx,
      y: view.height - (gy - view.originY) / view.kmPerPx,
    };
  }

  function pxToGeo(px, py) {
    return {
      gx: view.originX + px * view.kmPerPx,
      gy: view.originY + (view.height - py) * view.kmPerPx,
    };
  }

  function clientToPlayPx(clientX, clientY) {
    const r = els.playfield.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  function correctGeo(code) {
    const c = meta.countries[code];
    return {
      minx: c.minx, miny: c.miny, maxx: c.maxx, maxy: c.maxy,
      widthKm: c.maxx - c.minx,
      heightKm: c.maxy - c.miny,
      cx: (c.minx + c.maxx) / 2,
      cy: (c.miny + c.maxy) / 2,
    };
  }

  function correctRect(code) {
    const c = meta.countries[code];
    const tl = geoToPx(c.minx, c.maxy);
    const br = geoToPx(c.maxx, c.miny);
    return { left: tl.x, top: tl.y, width: br.x - tl.x, height: br.y - tl.y };
  }

  function fitInitialView() {
    const rect = els.playfield.getBoundingClientRect();
    const w = Math.max(100, rect.width);
    const h = Math.max(100, rect.height);
    const b = meta.play_bounds || meta.world_bounds;
    const worldW = b.maxx - b.minx;
    const worldH = b.maxy - b.miny;
    const pad = 0.04;
    const kmPerPx = Math.max(worldW / (w * (1 - 2 * pad)), worldH / (h * (1 - 2 * pad)));
    const cx = (b.minx + b.maxx) / 2;
    const cy = (b.miny + b.maxy) / 2;
    view.width = w;
    view.height = h;
    view.kmPerPx = kmPerPx;
    view.originX = cx - (w * kmPerPx) / 2;
    view.originY = cy - (h * kmPerPx) / 2;
  }

  function updateGridSize() {
    // Large grid canvas in map-world covering world_bounds with margin
    const b = meta.world_bounds;
    const pad = 500;
    const tl = geoToPx(b.minx - pad, b.maxy + pad);
    const br = geoToPx(b.maxx + pad, b.miny - pad);
    const left = Math.min(tl.x, br.x) - 2000;
    const top = Math.min(tl.y, br.y) - 2000;
    const width = Math.abs(br.x - tl.x) + 4000;
    const height = Math.abs(br.y - tl.y) + 4000;
    els.grid.style.left = left + "px";
    els.grid.style.top = top + "px";
    els.grid.style.width = width + "px";
    els.grid.style.height = height + "px";
    const cell = Math.max(24, 48 * (10 / view.kmPerPx));
    els.grid.style.backgroundSize = `${cell}px ${cell}px`;
  }

  function placeChina() {
    const r = correctRect("CHN");
    const c = meta.countries.CHN;
    els.chinaFixed.style.left = r.left + "px";
    els.chinaFixed.style.top = r.top + "px";
    els.chinaFixed.style.width = r.width + "px";
    els.chinaFixed.style.height = r.height + "px";
    if (!els.chinaFixed.dataset.ready) {
      els.chinaFixed.innerHTML = "";
      const img = document.createElement("img");
      img.src = "assets/" + c.file;
      img.alt = "China";
      els.chinaFixed.appendChild(img);
      const lab = document.createElement("div");
      lab.className = "label";
      lab.textContent = "China";
      els.chinaFixed.appendChild(lab);
      els.chinaFixed.dataset.ready = "1";
    }
  }

  function applyPieceLayout(state) {
    const g = correctGeo(state.code);
    const wKm = g.widthKm * state.scale;
    const hKm = g.heightKm * state.scale;
    const minx = state.cx - wKm / 2;
    const maxy = state.cy + hKm / 2;
    const tl = geoToPx(minx, maxy);
    const width = wKm / view.kmPerPx;
    const height = hKm / view.kmPerPx;
    state.el.style.left = tl.x + "px";
    state.el.style.top = tl.y + "px";
    state.el.style.width = width + "px";
    state.el.style.height = height + "px";

    const lab = state.el.querySelector(".piece-label");
    if (lab) {
      if (height < 48 || width < 56) {
        lab.style.top = "calc(100% + 2px)";
        lab.style.transform = "translate(-50%, 0)";
        lab.style.fontSize = "11px";
        lab.style.color = "#f8fafc";
        lab.style.textShadow = "0 1px 3px #000";
        lab.style.background = "rgba(15,23,42,0.75)";
        lab.style.padding = "1px 5px";
        lab.style.borderRadius = "4px";
      } else {
        lab.style.top = "50%";
        lab.style.transform = "translate(-50%, -50%)";
        lab.style.fontSize = "";
        lab.style.color = "";
        lab.style.textShadow = "";
        lab.style.background = "";
        lab.style.padding = "";
        lab.style.borderRadius = "";
      }
    }
  }

  function refreshAllLayouts() {
    placeChina();
    updateGridSize();
    for (const state of pieces.values()) applyPieceLayout(state);
  }

  function traySizeHint() {
    const tile = els.trayTop.querySelector(".tray-tile");
    const tw = tile ? tile.clientWidth - 12 : 100;
    return Math.max(56, Math.min(110, tw * 0.95));
  }

  function makeTrayTile(code) {
    const c = meta.countries[code];
    const tile = document.createElement("div");
    tile.className = "tray-tile";
    tile.dataset.code = code;
    tile.innerHTML = `<img src="assets/${c.file}" alt="${c.name}" /><div class="name">${c.name}</div>`;
    tile.addEventListener("pointerdown", (e) => startTrayDrag(e, code, tile));
    return tile;
  }

  function buildTrays() {
    els.trayTop.innerHTML = "";
    els.trayBottom.innerHTML = "";
    meta.tray_top.forEach((code) => els.trayTop.appendChild(makeTrayTile(code)));
    meta.tray_bottom.forEach((code) => els.trayBottom.appendChild(makeTrayTile(code)));
  }

  function markTrayUsed(code, used) {
    document.querySelectorAll(`.tray-tile[data-code="${code}"]`).forEach((t) => {
      t.classList.toggle("used", used);
    });
  }

  function createBoardPiece(code, clientX, clientY) {
    if (pieces.has(code)) return pieces.get(code);
    const c = meta.countries[code];
    const g = correctGeo(code);
    const trayHint = traySizeHint();
    const correctWpx = g.widthKm / view.kmPerPx;
    const correctHpx = g.heightKm / view.kmPerPx;
    const aspect = correctWpx / correctHpx;
    let startW;
    if (aspect >= 1) startW = trayHint;
    else startW = trayHint * aspect;
    const scale = startW / correctWpx;

    const pp = clientToPlayPx(clientX, clientY);
    const geo = pxToGeo(pp.x, pp.y);

    const el = document.createElement("div");
    el.className = "piece" + (SMALL_CODES.has(code) ? " small-label" : "");
    el.dataset.code = code;
    el.innerHTML = `<img src="assets/${c.file}" alt="${c.name}" /><div class="piece-label">${c.name}</div>`;
    ["nw", "ne", "sw", "se"].forEach((corner) => {
      const h = document.createElement("div");
      h.className = "handle " + corner;
      h.dataset.corner = corner;
      h.addEventListener("pointerdown", (e) => startResize(e, code, corner));
      el.appendChild(h);
    });
    el.addEventListener("pointerdown", (e) => onPiecePointerDown(e, code));
    els.piecesLayer.appendChild(el);

    const state = {
      code, el, scale, cx: geo.gx, cy: geo.gy, locked: false, factShown: false,
    };
    pieces.set(code, state);
    markTrayUsed(code, true);
    selectPiece(code);
    applyPieceLayout(state);
    updatePctDisplay(state, clientX, clientY, true);
    return state;
  }

  function pctOf(state) {
    return state.scale * 100;
  }

  function updatePctDisplay(state, clientX, clientY, show) {
    if (!show) {
      els.pctLabel.hidden = true;
      return;
    }
    const p = Math.round(pctOf(state));
    els.pctLabel.textContent = p + "%";
    els.pctLabel.hidden = false;
    els.pctLabel.style.left = clientX + "px";
    els.pctLabel.style.top = clientY + "px";
    if (Math.abs(p - 100) <= SIZE_TOL * 100) {
      els.pctLabel.style.color = "#4ade80";
      els.pctLabel.style.borderColor = "#4ade80";
    } else {
      els.pctLabel.style.color = "#fbbf24";
      els.pctLabel.style.borderColor = "#f59e0b";
    }
  }

  function selectPiece(code) {
    if (selected && pieces.has(selected)) {
      pieces.get(selected).el.classList.remove("selected");
    }
    selected = code;
    if (code && pieces.has(code) && !pieces.get(code).locked) {
      pieces.get(code).el.classList.add("selected");
      pieces.get(code).el.style.zIndex = 20;
    }
  }

  function onPiecePointerDown(e, code) {
    if (e.target.classList.contains("handle")) return;
    if (factOpen) return;
    const state = pieces.get(code);
    if (!state) return;
    e.preventDefault();
    e.stopPropagation();
    if (state.locked) {
      showFactModal(code);
      return;
    }
    startMove(e, code);
  }

  function startTrayDrag(e, code, tile) {
    if (factOpen) return;
    if (pieces.has(code) && pieces.get(code).locked) return;
    e.preventDefault();
    tile.setPointerCapture(e.pointerId);
    const onMove = (ev) => {
      const pf = els.playfield.getBoundingClientRect();
      if (
        ev.clientX >= pf.left && ev.clientX <= pf.right &&
        ev.clientY >= pf.top && ev.clientY <= pf.bottom
      ) {
        tile.releasePointerCapture(e.pointerId);
        tile.removeEventListener("pointermove", onMove);
        tile.removeEventListener("pointerup", onUp);
        let state = pieces.get(code);
        if (!state) state = createBoardPiece(code, ev.clientX, ev.clientY);
        else {
          markTrayUsed(code, true);
          selectPiece(code);
        }
        startMove(ev, code);
      }
    };
    const onUp = () => {
      tile.removeEventListener("pointermove", onMove);
      tile.removeEventListener("pointerup", onUp);
    };
    tile.addEventListener("pointermove", onMove);
    tile.addEventListener("pointerup", onUp);
  }

  function startMove(e, code) {
    if (factOpen) return;
    const state = pieces.get(code);
    if (!state || state.locked) return;
    e.preventDefault();
    e.stopPropagation();
    selectPiece(code);
    const pp = clientToPlayPx(e.clientX, e.clientY);
    const geo = pxToGeo(pp.x, pp.y);
    drag = {
      mode: "move",
      code,
      offGx: state.cx - geo.gx,
      offGy: state.cy - geo.gy,
    };
    state.el.setPointerCapture(e.pointerId);
    updatePctDisplay(state, e.clientX, e.clientY, true);
  }

  function startResize(e, code, corner) {
    if (factOpen) return;
    const state = pieces.get(code);
    if (!state || state.locked) return;
    e.preventDefault();
    e.stopPropagation();
    selectPiece(code);
    const g = correctGeo(code);
    drag = {
      mode: "resize",
      code,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startScale: state.scale,
      aspect: g.widthKm / g.heightKm,
      startCx: state.cx,
      startCy: state.cy,
    };
    state.el.setPointerCapture(e.pointerId);
    updatePctDisplay(state, e.clientX, e.clientY, true);
  }

  function startPan(e) {
    if (factOpen) return;
    drag = {
      mode: "pan",
      startX: e.clientX,
      startY: e.clientY,
      originX: view.originX,
      originY: view.originY,
    };
    els.playfield.classList.add("panning");
    els.playfield.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!drag || factOpen) return;
    if (drag.mode === "pan") {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      view.originX = drag.originX - dx * view.kmPerPx;
      view.originY = drag.originY + dy * view.kmPerPx; // screen y down → geo y up
      refreshAllLayouts();
      return;
    }
    const state = pieces.get(drag.code);
    if (!state) return;
    if (drag.mode === "move") {
      const pp = clientToPlayPx(e.clientX, e.clientY);
      const geo = pxToGeo(pp.x, pp.y);
      state.cx = geo.gx + drag.offGx;
      state.cy = geo.gy + drag.offGy;
      applyPieceLayout(state);
      updatePctDisplay(state, e.clientX, e.clientY, true);
    } else if (drag.mode === "resize") {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      // Convert pixel drag to scale change at current zoom
      const g = correctGeo(state.code);
      const correctWpx = g.widthKm / view.kmPerPx;
      let dW = 0;
      if (drag.corner === "se" || drag.corner === "ne") dW = dx;
      if (drag.corner === "sw" || drag.corner === "nw") dW = -dx;
      const dySign = drag.corner.includes("n") ? -1 : 1;
      const altW = dySign * dy * drag.aspect;
      if (Math.abs(dy) > Math.abs(dx)) dW = altW;
      let newScale = drag.startScale + dW / correctWpx;
      newScale = Math.max(0.02, Math.min(newScale, 2.5));
      state.scale = newScale;
      // Keep geographic center fixed while resizing
      state.cx = drag.startCx;
      state.cy = drag.startCy;
      applyPieceLayout(state);
      updatePctDisplay(state, e.clientX, e.clientY, true);
    }
  }

  function trySnapAndLock(state) {
    const sizeOk = Math.abs(state.scale - 1) <= SIZE_TOL;
    if (sizeOk) state.scale = 1;

    const g = correctGeo(state.code);
    const distKm = Math.hypot(state.cx - g.cx, state.cy - g.cy);
    const posOk = distKm <= POS_TOL_KM;

    if (sizeOk && posOk) {
      state.scale = 1;
      state.cx = g.cx;
      state.cy = g.cy;
      applyPieceLayout(state);
      if (!state.locked) {
        state.locked = true;
        state.el.classList.add("locked");
        state.el.classList.remove("selected");
        if (selected === state.code) selected = null;
        if (!state.factShown) {
          state.factShown = true;
          showFactModal(state.code);
        } else {
          maybeReward();
        }
      }
      return true;
    }
    applyPieceLayout(state);
    return false;
  }

  function onPointerUp(e) {
    if (!drag) return;
    const mode = drag.mode;
    const code = drag.code;
    drag = null;
    els.playfield.classList.remove("panning");
    els.pctLabel.hidden = true;
    if (mode === "pan") return;
    const state = pieces.get(code);
    if (state && !state.locked) trySnapAndLock(state);
  }

  function onWheel(e) {
    if (factOpen) return;
    e.preventDefault();
    const pp = clientToPlayPx(e.clientX, e.clientY);
    const before = pxToGeo(pp.x, pp.y);
    const factor = e.deltaY < 0 ? 0.9 : 1.1;
    let next = view.kmPerPx * factor;
    next = Math.max(MIN_KMPP, Math.min(MAX_KMPP, next));
    view.kmPerPx = next;
    // Keep cursor geo point fixed
    view.originX = before.gx - pp.x * view.kmPerPx;
    view.originY = before.gy - (view.height - pp.y) * view.kmPerPx;
    refreshAllLayouts();
  }

  function themeLayers(theme) {
    const map = {
      russia: '<div class="birch"></div><div class="snow"></div>',
      kazakhstan: '<div class="clouds"></div><div class="horses"></div>',
      mongolia: '<div class="clouds"></div><div class="gers"></div>',
      india: '<div class="motif"></div>',
      nepal: '<div class="peaks"></div><div class="flags"></div>',
      bhutan: '<div class="peaks"></div><div class="flags"></div>',
      vietnam: '<div class="terraces"></div><div class="river"></div>',
      laos: '<div class="terraces"></div><div class="river"></div><div class="pagoda"></div>',
      myanmar: '<div class="terraces"></div><div class="river"></div><div class="pagoda"></div>',
      northkorea: '<div class="mt"></div><div class="pines"></div>',
      pakistan: '<div class="mts"></div><div class="orchard"></div>',
      afghanistan: '<div class="mts"></div><div class="orchard"></div>',
      tajikistan: '<div class="mts"></div><div class="orchard"></div>',
      kyrgyzstan: '<div class="mts"></div><div class="yurt"></div>',
    };
    return map[theme] || "";
  }

  function ensureFactOverlay() {
    if (els.factOverlay) return els.factOverlay;
    const ov = document.createElement("div");
    ov.id = "fact-overlay";
    ov.className = "fact-overlay";
    ov.hidden = true;
    ov.innerHTML = `
      <div class="fact-card" role="dialog" aria-modal="true">
        <div class="fact-theme-bg" id="fact-theme-bg"></div>
        <button type="button" class="fact-x" aria-label="Close">×</button>
        <div class="fact-body">
          <div class="fact-left">
            <div class="fact-silhouette-wrap" id="fact-sil-wrap">
              <img id="fact-img" alt="" />
              <div class="capital-dot" id="fact-cap-dot"></div>
              <div class="capital-dot-label" id="fact-cap-lab"></div>
            </div>
            <div class="fact-title-float" id="fact-title-side"></div>
          </div>
          <div class="fact-text-block">
            <h2 id="fact-title"></h2>
            <div class="fact-cols">
              <div class="fact-col">
                <h3>English</h3>
                <ul id="fact-en"></ul>
              </div>
              <div class="fact-col">
                <h3>中文</h3>
                <ul id="fact-zh"></ul>
              </div>
            </div>
            <button type="button" class="fact-close-btn">Close · 关闭</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.addEventListener("click", (e) => {
      if (e.target === ov) hideFactModal();
    });
    ov.querySelector(".fact-x").addEventListener("click", hideFactModal);
    ov.querySelector(".fact-close-btn").addEventListener("click", hideFactModal);
    els.factOverlay = ov;
    return ov;
  }

  function showFactModal(code) {
    const ov = ensureFactOverlay();
    const c = meta.countries[code];
    const facts = (window.COUNTRY_FACTS && window.COUNTRY_FACTS[code]) || {
      theme: "kazakhstan",
      en: ["Capital: —."],
      zh: ["首都：—。"],
    };
    const theme = facts.theme || "kazakhstan";
    const bg = ov.querySelector("#fact-theme-bg");
    bg.className = "fact-theme-bg theme-" + theme;
    bg.innerHTML = themeLayers(theme);

    ov.querySelector("#fact-img").src = "assets/" + c.file;
    ov.querySelector("#fact-img").alt = c.name;
    ov.querySelector("#fact-title").textContent = c.name;
    ov.querySelector("#fact-title-side").textContent = c.name;

    // Capital red dot on silhouette (fractions of image box)
    const wrap = ov.querySelector("#fact-sil-wrap");
    const img = ov.querySelector("#fact-img");
    const dot = ov.querySelector("#fact-cap-dot");
    const lab = ov.querySelector("#fact-cap-lab");
    const cap = c.capital;
    const placeDot = () => {
      if (!cap) { dot.style.display = "none"; lab.style.display = "none"; return; }
      const wr = wrap.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      const left = ir.left - wr.left + cap.fx * ir.width;
      const top = ir.top - wr.top + cap.fy * ir.height;
      dot.style.display = "block";
      lab.style.display = "block";
      dot.style.left = left + "px";
      dot.style.top = top + "px";
      lab.style.left = left + "px";
      lab.style.top = top + "px";
      lab.textContent = cap.name;
    };
    img.onload = placeDot;
    requestAnimationFrame(() => requestAnimationFrame(placeDot));

    const en = ov.querySelector("#fact-en");
    const zh = ov.querySelector("#fact-zh");
    function liClass(text, i, lang) {
      const classes = [];
      const isCapital = i === 0 || (lang === "en" ? /^Capital:/i.test(text) : /^首都/.test(text));
      const isBorder = /land border with China/i.test(text) || /陆地边界约/.test(text) || /^Shares about .+ km/i.test(text);
      if (isCapital) classes.push("capital-line");
      if (isBorder) classes.push("border-line");
      return classes.length ? ` class="${classes.join(" ")}"` : "";
    }
    en.innerHTML = facts.en.map((t, i) => `<li${liClass(t, i, "en")}>${t}</li>`).join("");
    zh.innerHTML = facts.zh.map((t, i) => `<li${liClass(t, i, "zh")}>${t}</li>`).join("");

    ov.hidden = false;
    factOpen = true;
  }

  function hideFactModal() {
    if (!els.factOverlay) return;
    els.factOverlay.hidden = true;
    factOpen = false;
    maybeReward();
  }

  function maybeReward() {
    if (rewarded || factOpen) return;
    const all = meta.neighbours.every((code) => pieces.has(code) && pieces.get(code).locked);
    if (!all) return;
    rewarded = true;
    playReward();
  }

  function playReward() {
    els.rewardOverlay.hidden = false;
    const video = els.rewardVideo;
    video.src = "reward.mp4";
    const play = video.play();
    if (play && typeof play.catch === "function") play.catch(() => runFallbackReward());
    video.onerror = () => runFallbackReward();
  }

  function runFallbackReward() {
    els.rewardVideo.style.display = "none";
    els.rewardFallback.hidden = false;
    const stage = els.rfStage;
    stage.innerHTML = "";
    const captions = [
      "China has 14 land neighbors.",
      "Each one shares a land border with China.",
      "The biggest of these is Russia.",
      "The smallest of these neighbors is Bhutan.",
    ];
    // Temporarily fit view for fallback using current view maths
    const scale = Math.min(stage.clientWidth / view.width, stage.clientHeight / view.height) || 1;
    const ox = (stage.clientWidth - view.width * scale) / 2;
    const oy = (stage.clientHeight - view.height * scale) / 2;
    function placeImg(code, left, top, w, h, opacity) {
      let img = stage.querySelector(`[data-code="${code}"]`);
      if (!img) {
        img = document.createElement("img");
        img.dataset.code = code;
        img.src = "assets/" + meta.countries[code].file;
        stage.appendChild(img);
      }
      img.style.left = left + "px";
      img.style.top = top + "px";
      img.style.width = w + "px";
      img.style.height = h + "px";
      img.style.opacity = opacity;
    }
    const cr = correctRect("CHN");
    placeImg("CHN", ox + cr.left * scale, oy + cr.top * scale, cr.width * scale, cr.height * scale, 1);
    els.rfCaption.textContent = captions[0];
    const order = ["RUS","KAZ","MNG","IND","PAK","AFG","KGZ","TJK","NPL","BTN","MMR","LAO","VNM","PRK"];
    let i = 0;
    const timer = setInterval(() => {
      if (i < order.length) {
        const code = order[i];
        const r = correctRect(code);
        placeImg(code, ox + r.left * scale, oy + r.top * scale, r.width * scale, r.height * scale, 1);
        if (i === 0) els.rfCaption.textContent = captions[1];
        if (code === "RUS") els.rfCaption.textContent = captions[2];
        if (code === "BTN") els.rfCaption.textContent = captions[3];
        i++;
      } else clearInterval(timer);
    }, 550);
  }

  els.rewardClose.addEventListener("click", () => location.reload());

  els.playfield.addEventListener("pointerdown", (e) => {
    if (factOpen) return;
    // Pan: empty background, middle button, right button, or Space+drag
    const isEmpty =
      e.target === els.playfield ||
      e.target === els.mapWorld ||
      e.target === els.grid ||
      e.target === els.piecesLayer ||
      e.target === els.chinaFixed ||
      e.target.closest?.(".china-fixed");
    const panBtn = e.button === 1 || e.button === 2 || spaceDown;
    if (panBtn || (e.button === 0 && isEmpty)) {
      e.preventDefault();
      selectPiece(null);
      startPan(e);
    }
  });
  els.playfield.addEventListener("contextmenu", (e) => e.preventDefault());
  els.playfield.addEventListener("wheel", onWheel, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") { spaceDown = true; e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") spaceDown = false;
  });

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("resize", () => {
    clearTimeout(window.__rz);
    window.__rz = setTimeout(() => {
      const rect = els.playfield.getBoundingClientRect();
      const oldW = view.width, oldH = view.height;
      const cx = view.originX + (oldW * view.kmPerPx) / 2;
      const cy = view.originY + (oldH * view.kmPerPx) / 2;
      view.width = Math.max(100, rect.width);
      view.height = Math.max(100, rect.height);
      view.originX = cx - (view.width * view.kmPerPx) / 2;
      view.originY = cy - (view.height * view.kmPerPx) / 2;
      refreshAllLayouts();
    }, 100);
  });


  async function buildOverview() {
    if (!els.overviewSvg) return;
    const res = await fetch("assets/overview.json");
    const ov = await res.json();
    const svg = els.overviewSvg;
    svg.setAttribute("viewBox", ov.viewBox);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.innerHTML = "";

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    const [ , , vbW, vbH] = ov.viewBox.split(/\s+/).map(Number);
    bg.setAttribute("width", String(vbW));
    bg.setAttribute("height", String(vbH));
    bg.setAttribute("fill", ov.bg || "#0b1220");
    svg.appendChild(bg);

    const tip = els.overviewTip;
    const wrap = els.overviewWrap;

    function showTip(name, clientX, clientY) {
      const wr = wrap.getBoundingClientRect();
      tip.hidden = false;
      tip.textContent = name;
      tip.style.left = (clientX - wr.left) + "px";
      tip.style.top = (clientY - wr.top) + "px";
    }
    function hideTip() {
      tip.hidden = true;
      svg.querySelectorAll(".ov-country.is-hover").forEach((el) => el.classList.remove("is-hover"));
    }

    for (const code of ov.drawOrder) {
      const c = ov.countries[code];
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", c.d);
      path.setAttribute("fill", c.color);
      path.setAttribute("class", "ov-country" + (c.hoverOnly ? " hoverable" : ""));
      path.dataset.code = code;
      path.dataset.name = c.name;
      path.dataset.hoverOnly = c.hoverOnly ? "1" : "0";
      if (c.hoverOnly) {
        path.addEventListener("pointerenter", (e) => {
          path.classList.add("is-hover");
          showTip(c.name, e.clientX, e.clientY);
        });
        path.addEventListener("pointermove", (e) => showTip(c.name, e.clientX, e.clientY));
        path.addEventListener("pointerleave", hideTip);
      }
      svg.appendChild(path);
    }

    // Static labels for roomy countries
    for (const code of ov.drawOrder) {
      const c = ov.countries[code];
      if (c.hoverOnly) continue;
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "ov-label");
      text.setAttribute("x", String(c.lx));
      text.setAttribute("y", String(c.ly));
      text.setAttribute("font-size", String(c.fontSize));
      text.textContent = c.name;
      svg.appendChild(text);
    }

    wrap.addEventListener("pointerleave", hideTip);
  }

  async function init() {
    const res = await fetch("assets/meta.json");
    meta = await res.json();
    fitInitialView();
    buildTrays();
    refreshAllLayouts();
    ensureFactOverlay();
    await buildOverview();
  }


  window.__puzzleDebug = {
    getView: () => ({ ...view }),
    zoomToFitWorld() {
      const rect = els.playfield.getBoundingClientRect();
      view.width = Math.max(100, rect.width);
      view.height = Math.max(100, rect.height);
      const b = meta.world_bounds;
      const pad = 0.03;
      view.kmPerPx = Math.max(
        (b.maxx - b.minx) / (view.width * (1 - 2 * pad)),
        (b.maxy - b.miny) / (view.height * (1 - 2 * pad))
      );
      const cx = (b.minx + b.maxx) / 2;
      const cy = (b.miny + b.maxy) / 2;
      view.originX = cx - (view.width * view.kmPerPx) / 2;
      view.originY = cy - (view.height * view.kmPerPx) / 2;
      refreshAllLayouts();
    },
    lockCountry(code) {
      let state = pieces.get(code);
      if (!state) {
        const g = correctGeo(code);
        const c = meta.countries[code];
        const el = document.createElement("div");
        el.className = "piece locked";
        el.dataset.code = code;
        el.innerHTML = `<img src="assets/${c.file}" alt="${c.name}" /><div class="piece-label">${c.name}</div>`;
        el.addEventListener("pointerdown", (e) => onPiecePointerDown(e, code));
        els.piecesLayer.appendChild(el);
        state = { code, el, scale: 1, cx: g.cx, cy: g.cy, locked: true, factShown: true };
        pieces.set(code, state);
        markTrayUsed(code, true);
      } else {
        const g = correctGeo(code);
        state.scale = 1; state.cx = g.cx; state.cy = g.cy;
        state.locked = true; state.factShown = true;
        state.el.classList.add("locked");
        state.el.classList.remove("selected");
      }
      applyPieceLayout(state);
      return state;
    },
    showFact(code) { showFactModal(code); },
    hideFact() { hideFactModal(); },
    pieceHasGreenOutline(code) {
      const el = pieces.get(code)?.el;
      if (!el) return null;
      const after = getComputedStyle(el, "::after");
      return { display: after.display, content: after.content, border: after.border };
    },
    isFactOpen: () => factOpen,
    overviewReady: () => !!els.overviewSvg?.querySelector(".ov-country"),
    hoverOverviewCountry(code) {
      const path = els.overviewSvg.querySelector(`.ov-country[data-code="${code}"]`);
      if (!path) return null;
      const r = path.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      path.dispatchEvent(new PointerEvent("pointerenter", { clientX: cx, clientY: cy, bubbles: true }));
      path.dispatchEvent(new PointerEvent("pointermove", { clientX: cx, clientY: cy, bubbles: true }));
      return { name: path.dataset.name, tip: els.overviewTip.textContent, tipHidden: els.overviewTip.hidden };
    },
  };

  init().catch((err) => {
    console.error(err);
    alert("Could not load game assets. Serve this folder over HTTP (see README).");
  });
})();
