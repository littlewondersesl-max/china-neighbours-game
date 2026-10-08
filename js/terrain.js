/** Sharper relief for the area on screen. The low-resolution image stays underneath. */

const BASE_KM = 40075 / 8192;
const MAX_Z = 3;

export function createTerrain(relief, onReady) {
  let index = null;
  let indexTask = null;
  let enabled = true;
  let tokenSeq = 1;
  const images = new Map();
  const composites = new Map();
  const pending = new Map();
  const views = new Map();
  let raf = 0;
  let lastTick = 0;

  function viewState(view) {
    let state = views.get(view);
    if (!state) {
      views.set(view, state = {
        wanted: "",
        newer: 1,
        a: blankSlot(),
        b: blankSlot(),
      });
    }
    return state;
  }

  function levelFor(kmPerPx) {
    if (!(kmPerPx > 0) || kmPerPx >= BASE_KM * 0.9) return 0;
    let z = 1;
    for (let i = 1; i <= MAX_Z; i++) {
      z = i;
      if (BASE_KM / 2 ** i <= kmPerPx * 0.85) break;
    }
    return z;
  }

  function specFor(req, maxPx) {
    if (!req) return null;
    let { west, south, east, north } = req;
    if (!(east > west) || !(north > south)) return null;
    if (east - west > 110 || north - south > 80) return null;
    let z = levelFor(req.kmPerPx);
    const degOf = (level) => 360 / (8192 * 2 ** level);
    while (z > 0) {
      const deg = degOf(z);
      if ((east - west) / deg <= maxPx && (north - south) / deg <= maxPx) break;
      z -= 1;
    }
    if (!z) return null;
    const tile = 360 / (32 * 2 ** (z - 1));
    const step = tile / 2;
    const qWest = Math.floor(west / step) * step;
    const qSouth = Math.max(-85, Math.floor(south / step) * step);
    const qEast = Math.ceil(east / step) * step;
    const qNorth = Math.min(85, Math.ceil(north / step) * step);
    const deg = degOf(z);
    if ((qEast - qWest) / deg <= maxPx && (qNorth - qSouth) / deg <= maxPx) {
      west = qWest;
      south = qSouth;
      east = qEast;
      north = qNorth;
    }
    south = Math.max(-85, south);
    north = Math.min(85, north);
    const lonSpan = east - west;
    const latSpan = north - south;
    let pxW = Math.ceil(lonSpan / deg);
    let pxH = Math.ceil(latSpan / deg);
    if (pxW < 2 || pxH < 2 || pxW > maxPx || pxH > maxPx) return null;
    const key = `${z}|${west.toFixed(3)}|${south.toFixed(3)}|${east.toFixed(3)}|${north.toFixed(3)}`;
    return { z, west, south, east, north, lonSpan, latSpan, pxW, pxH, key, deg };
  }

  function ensureIndex() {
    if (index) return Promise.resolve(index);
    if (!indexTask) {
      indexTask = fetch("assets/terrain/index.json")
        .then((res) => {
          if (!res.ok) throw new Error("terrain index");
          return res.json();
        })
        .then((doc) => {
          for (const level of doc.levels) {
            const raw = atob(level.bits);
            const mask = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) mask[i] = raw.charCodeAt(i);
            level.mask = mask;
          }
          index = doc;
          return doc;
        })
        .catch((err) => {
          console.warn(err);
          index = { levels: [] };
          return index;
        });
    }
    return indexTask;
  }

  function hasTile(z, x, y) {
    const level = index && index.levels.find((item) => item.z === z);
    if (!level) return false;
    const cols = level.cols;
    const rows = level.rows;
    x = ((x % cols) + cols) % cols;
    if (y < 0 || y >= rows) return false;
    const i = y * cols + x;
    return (level.mask[i >> 3] >> (i & 7)) & 1;
  }

  function loadTile(z, x, y) {
    const key = `${z}/${x}/${y}`;
    const cached = images.get(key);
    if (cached) return cached;
    const task = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `assets/terrain/${z}/${x}/${y}.jpg`;
    });
    images.set(key, task);
    return task;
  }

  function tilesFor(spec) {
    const cols = 32 * 2 ** (spec.z - 1);
    const rows = cols / 2;
    const tile = 360 / cols;
    const x0 = Math.floor((spec.west + 180) / tile);
    const x1 = Math.floor((spec.east + 180 - 1e-6) / tile);
    const y0 = Math.floor((90 - spec.north) / tile);
    const y1 = Math.floor((90 - spec.south - 1e-6) / tile);
    const list = [];
    for (let y = y0; y <= y1; y++) {
      if (y < 0 || y >= rows) continue;
      for (let x = x0; x <= x1; x++) {
        const xx = ((x % cols) + cols) % cols;
        if (!hasTile(spec.z, xx, y)) continue;
        let west = -180 + xx * tile;
        const hits = (lon) => lon + tile > spec.west && lon < spec.east;
        if (!hits(west) && hits(west + 360)) west += 360;
        else if (!hits(west) && hits(west - 360)) west -= 360;
        list.push({
          z: spec.z,
          x: xx,
          y,
          west,
          north: 90 - y * tile,
          tile,
        });
      }
    }
    return list;
  }

  function paintRelief(ctx, spec) {
    const width = relief.width;
    const height = relief.height;
    const drawSlice = (src0, src1, dest0, dest1) => {
      if (src1 <= src0 || dest1 <= dest0) return;
      const s0 = (src0 + 180) / 360 * width;
      const s1 = (src1 + 180) / 360 * width;
      const top = (90 - spec.north) / 180 * height;
      const bot = (90 - spec.south) / 180 * height;
      const dx = (dest0 - spec.west) / spec.lonSpan * spec.pxW;
      const dw = (dest1 - dest0) / spec.lonSpan * spec.pxW;
      ctx.drawImage(relief, s0, top, Math.max(1, s1 - s0), Math.max(1, bot - top), dx, 0, dw, spec.pxH);
    };
    if (spec.east > 180) {
      drawSlice(spec.west, 180, spec.west, 180);
      drawSlice(-180, spec.east - 360, 180, spec.east);
    } else if (spec.west < -180) {
      drawSlice(spec.west + 360, 180, spec.west, -180);
      drawSlice(-180, spec.east, -180, spec.east);
    } else {
      drawSlice(spec.west, spec.east, spec.west, spec.east);
    }
  }

  function paint(spec, loaded) {
    const canvas = document.createElement("canvas");
    canvas.width = spec.pxW;
    canvas.height = spec.pxH;
    const ctx = canvas.getContext("2d");
    paintRelief(ctx, spec);
    const sx = spec.pxW / spec.lonSpan;
    const sy = spec.pxH / spec.latSpan;
    for (const tile of loaded) {
      if (!tile.img) continue;
      const dx = tile.west - spec.west;
      const dy = spec.north - tile.north;
      const tw = tile.tile * sx;
      const th = tile.tile * sy;
      ctx.drawImage(tile.img, dx * sx - 0.5, dy * sy - 0.5, tw + 1, th + 1);
    }
    return canvas;
  }

  function remember(key, composite) {
    composites.set(key, composite);
    while (composites.size > 8) {
      const oldest = composites.keys().next().value;
      composites.delete(oldest);
    }
  }

  function ensure(spec) {
    const ready = composites.get(spec.key);
    if (ready) return Promise.resolve(ready);
    const waiting = pending.get(spec.key);
    if (waiting) return waiting;
    const task = ensureIndex().then(async () => {
      const list = [];
      for (let z = 1; z <= spec.z; z++) list.push(...tilesFor({ ...spec, z }));
      if (!list.length) return null;
      const imgs = await Promise.all(list.map((tile) => loadTile(tile.z, tile.x, tile.y)));
      const loaded = list.map((tile, i) => ({ ...tile, img: imgs[i] }));
      if (!loaded.some((tile) => tile.img)) return null;
      const composite = {
        key: spec.key,
        canvas: paint(spec, loaded),
        token: ++tokenSeq,
        west: spec.west,
        south: spec.south,
        lonSpan: spec.lonSpan,
        latSpan: spec.latSpan,
      };
      remember(spec.key, composite);
      return composite;
    }).finally(() => pending.delete(spec.key));
    pending.set(spec.key, task);
    return task;
  }

  function blankSlot() {
    return { mix: 0, target: 0, token: 0, canvas: null, west: 0, south: 0, lonSpan: 1, latSpan: 1, key: "" };
  }

  function show(state, composite, snap) {
    if (!composite) return;
    if (state.a.key === composite.key && state.newer === 0 && state.a.mix > 0.98) return;
    if (state.b.key === composite.key && state.newer === 1 && state.b.mix > 0.98) return;
    const slotName = state.a.mix <= state.b.mix ? "a" : "b";
    const slot = state[slotName];
    slot.key = composite.key;
    slot.canvas = composite.canvas;
    slot.token = composite.token;
    slot.west = composite.west;
    slot.south = composite.south;
    slot.lonSpan = composite.lonSpan;
    slot.latSpan = composite.latSpan;
    slot.target = 1;
    state.newer = slotName === "a" ? 0 : 1;
    if (snap) {
      slot.mix = 1;
      const other = slotName === "a" ? state.b : state.a;
      other.mix = 0;
      other.target = 0;
    }
  }

  function fadeOut(state, snap) {
    state.wanted = "";
    state.a.target = 0;
    state.b.target = 0;
    if (snap) {
      state.a.mix = 0;
      state.b.mix = 0;
    }
  }

  function moving(state) {
    return Math.abs(state.a.mix - state.a.target) > 0.01 || Math.abs(state.b.mix - state.b.target) > 0.01;
  }

  function apply(view, state) {
    view.setTerrain({
      newer: state.newer,
      a: state.a,
      b: state.b,
    });
  }

  function kick() {
    if (raf) return;
    lastTick = performance.now();
    const step = (now) => {
      raf = 0;
      const dt = Math.min(0.08, (now - lastTick) / 1000);
      lastTick = now;
      let again = false;
      for (const state of views.values()) {
        for (const slot of [state.a, state.b]) {
          const k = 1 - Math.exp(-dt / 0.07);
          slot.mix += (slot.target - slot.mix) * k;
          if (Math.abs(slot.target - slot.mix) < 0.012) slot.mix = slot.target;
        }
        const top = state.newer === 0 ? state.a : state.b;
        const under = state.newer === 0 ? state.b : state.a;
        if (top.mix > 0.98 && under.target > 0 && under.key && under.key !== top.key) under.target = 0;
        if (moving(state)) again = true;
      }
      onReady(false);
      if (again) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function update(view, req, opts = {}) {
    const state = viewState(view);
    const maxPx = opts.maxPx || 2048;
    const spec = enabled ? specFor(req, maxPx) : null;
    if (!spec) {
      fadeOut(state, !!opts.snap || !enabled);
      apply(view, state);
      if (moving(state)) kick();
      return null;
    }
    state.wanted = spec.key;
    const ready = composites.get(spec.key);
    if (ready) {
      show(state, ready, !!opts.snap);
      apply(view, state);
      if (moving(state)) kick();
      return spec;
    }
    if (opts.snap) fadeOut(state, true);
    apply(view, state);
    ensure(spec).then((composite) => {
      const current = viewState(view);
      if (current.wanted !== spec.key) return;
      if (!composite) {
        fadeOut(current, !!opts.snap);
        apply(view, current);
        if (moving(current)) kick();
        return;
      }
      show(current, composite, !!opts.snap);
      apply(view, current);
      onReady(true);
      if (moving(current)) kick();
    }).catch((err) => console.warn(err));
    return spec;
  }

  function covers(req, maxPx) {
    const spec = specFor(req, maxPx || 512);
    return !!(spec && composites.has(spec.key));
  }

  return {
    update,
    covers,
    levelFor,
    setEnabled(on) {
      enabled = !!on;
      if (!enabled) {
        for (const state of views.values()) fadeOut(state, true);
      }
      onReady(true);
    },
    get enabled() { return enabled; },
  };
}
