/** Illustrated skins clipped onto a country's real outline. The mesh and hit test stay vector. */

export const SKINS = {
  CHN: [
    { id: "terrain", label: "skinTerrain" },
    { id: "sketch", label: "skinSketch", src: "assets/skins/chn/sketch.jpg" },
    { id: "photo", label: "skinPhoto", src: "assets/skins/chn/photo.jpg" },
  ],
};

const STORAGE = "ln-skin-";

export function skinsFor(iso) {
  return SKINS[iso] || [{ id: "terrain", label: "skinTerrain" }];
}

export function skinSources() {
  const urls = [];
  for (const list of Object.values(SKINS)) {
    for (const skin of list) if (skin.src) urls.push(skin.src);
  }
  return urls;
}

export function readSkin(iso) {
  const list = skinsFor(iso);
  if (iso !== "CHN" || list.length < 2) return list[0].id;
  try {
    const id = localStorage.getItem(STORAGE + iso);
    if (list.some((skin) => skin.id === id)) return id;
  } catch {
    /* private mode */
  }
  return list[0].id;
}

export function writeSkin(iso, id) {
  if (iso !== "CHN") return;
  try { localStorage.setItem(STORAGE + iso, id); } catch { /* ignore */ }
}

function sample(image, maxW) {
  const scale = Math.min(1, maxW / image.width);
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  return { w, h, data: ctx.getImageData(0, 0, w, h).data };
}

function background(data, w, h) {
  const spots = [
    [2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3],
    [(w / 2) | 0, 2], [2, (h / 2) | 0], [w - 3, (h / 2) | 0], [(w / 2) | 0, h - 3],
  ];
  let r = 0, g = 0, b = 0, n = 0;
  for (const [x, y] of spots) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = (y * w + x) * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  }
  return [r / n, g / n, b / n];
}

/** Rectangular crop of the illustrated landmass, ignoring parchment or ocean. */
export function contentCrop(image) {
  const { data, w, h } = sample(image, 240);
  const bg = background(data, w, h);
  const bgLum = (bg[0] + bg[1] + bg[2]) / 3;
  const mask = new Uint8Array(w * h);
  const thresh = 48 * 48;
  for (let p = 0, i = 0; p < w * h; p += 1, i += 4) {
    const dr = data[i] - bg[0];
    const dg = data[i + 1] - bg[1];
    const db = data[i + 2] - bg[2];
    const lum = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
    const ink = bgLum > 140 && lum < 78;
    if (dr * dr + dg * dg + db * db > thresh || ink) mask[p] = 1;
  }
  const seen = new Uint8Array(w * h);
  const comps = [];
  const stack = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const start = y * w + x;
      if (!mask[start] || seen[start]) continue;
      let minX = x, minY = y, maxX = x, maxY = y, count = 0;
      stack.push(start);
      seen[start] = 1;
      while (stack.length) {
        const p = stack.pop();
        const px = p % w;
        const py = (p / w) | 0;
        count += 1;
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
        if (px > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
        if (px + 1 < w && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
        if (py > 0 && mask[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
        if (py + 1 < h && mask[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
      }
      comps.push({ minX, minY, maxX, maxY, count });
    }
  }
  const fallback = () => {
    const m = 0.08;
    return {
      x: image.width * m,
      y: image.height * m,
      w: image.width * (1 - 2 * m),
      h: image.height * (1 - 2 * m),
    };
  };
  if (!comps.length) return fallback();
  comps.sort((a, b) => b.count - a.count);
  const main = comps[0];
  let minX = main.minX, minY = main.minY, maxX = main.maxX, maxY = main.maxY;
  const span = Math.max(main.maxX - main.minX, main.maxY - main.minY, 1);
  const join = span * 0.12;
  for (let i = 1; i < comps.length; i += 1) {
    const part = comps[i];
    if (part.count < main.count * 0.008) continue;
    const near = part.maxX >= minX - join && part.minX <= maxX + join
      && part.maxY >= minY - join && part.minY <= maxY + join;
    if (!near) continue;
    minX = Math.min(minX, part.minX);
    minY = Math.min(minY, part.minY);
    maxX = Math.max(maxX, part.maxX);
    maxY = Math.max(maxY, part.maxY);
  }
  const sx = image.width / w;
  const sy = image.height / h;
  const pad = 0.012;
  let x = minX * sx;
  let y = minY * sy;
  let cw = (maxX - minX + 1) * sx;
  let ch = (maxY - minY + 1) * sy;
  const px = cw * pad;
  const py = ch * pad;
  x = Math.max(0, x - px);
  y = Math.max(0, y - py);
  cw = Math.min(image.width - x, cw + px * 2);
  ch = Math.min(image.height - y, ch + py * 2);
  if (cw < image.width * 0.18 || ch < image.height * 0.18) return fallback();
  return { x, y, w: cw, h: ch };
}

/** Fit the crop into the country's bounding box (uniform cover) and mask to the real rings. */
export function clipSkin(image, mesh) {
  if (!mesh.skinCanvas) mesh.skinCanvas = new WeakMap();
  const cached = mesh.skinCanvas.get(image);
  if (cached) return cached;
  const long = 1024;
  const aspect = mesh.width / Math.max(mesh.height, 1);
  const W = aspect >= 1 ? long : Math.max(1, Math.round(long * aspect));
  const H = aspect >= 1 ? Math.max(1, Math.round(long / aspect)) : long;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const crop = contentCrop(image);
  const scale = Math.max(W / crop.w, H / crop.h);
  const dw = crop.w * scale;
  const dh = crop.h * scale;
  ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  const { relMinX, relMaxY, width, height } = mesh;
  for (const ring of mesh.rings) {
    for (let i = 0; i < ring.length; i += 1) {
      const x = ((ring[i][0] - relMinX) / width) * W;
      const y = ((relMaxY - ring[i][1]) / height) * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  ctx.fill("evenodd");
  mesh.skinCanvas.set(image, canvas);
  return canvas;
}
