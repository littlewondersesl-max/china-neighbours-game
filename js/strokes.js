/** Cached country outlines for the globe. Coarse lines are for drag and zoom; fine lines are for the settled view. */

function simplify(ring, minDeg) {
  if (ring.length <= 2 || minDeg <= 0) return ring;
  const min2 = minDeg * minDeg;
  const out = [ring[0]];
  let last = ring[0];
  for (let i = 1; i < ring.length - 1; i++) {
    const p = ring[i];
    const dlon = p[0] - last[0];
    const dlat = p[1] - last[1];
    if (dlon * dlon + dlat * dlat >= min2) {
      out.push(p);
      last = p;
    }
  }
  out.push(ring[ring.length - 1]);
  return out;
}

function smallRing(ring) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of ring) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  return maxX - minX < 1.15 && maxY - minY < 1.15;
}

function commit(bucket, asia, pts, a, b) {
  if (b - a < 2) return;
  const data = new Float32Array((b - a) * 2);
  let n = 0;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (let i = a; i < b; i++) {
    const lon = pts[i][0];
    const lat = pts[i][1];
    data[n++] = lon;
    data[n++] = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  bucket.push({ asia, data, minLon, minLat, maxLon, maxLat });
}

function addRing(bucket, asia, pts) {
  let start = 0;
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i][0] - pts[i - 1][0]) > 180) {
      commit(bucket, asia, pts, start, i);
      start = i;
    }
  }
  commit(bucket, asia, pts, start, pts.length);
}

function graticule(step) {
  const lines = [];
  for (let lon = -180; lon <= 180; lon += step) {
    const pts = [];
    for (let lat = -80; lat <= 80; lat += step) pts.push(lon, lat);
    lines.push(new Float32Array(pts));
  }
  for (let lat = -60; lat <= 75; lat += step) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += step) pts.push(lon, lat);
    lines.push(new Float32Array(pts));
  }
  return lines;
}

function spanOf(ring) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of ring) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  return Math.max(maxX - minX, maxY - minY);
}

export function prepareWorldStrokes(features) {
  const detail = [];
  const settled = [];
  const coarse = [];
  for (const feature of features) {
    const asia = feature.properties.continent === "Asia";
    const polys = feature.geometry.coordinates;
    for (const poly of polys) {
      for (const ring of poly) {
        if (ring.length < 2) continue;
        const span = spanOf(ring);
        if (span >= 0.18 || ring.length > 12) addRing(detail, asia, simplify(ring, 0.12));
        const mid = simplify(ring, 0.42);
        if (mid.length >= 2 && (span >= 0.7 || mid.length >= 28)) addRing(settled, asia, mid);
        const low = simplify(ring, 1.15);
        if (low.length >= 2 && !(smallRing(low) && low.length < 24)) addRing(coarse, asia, low);
      }
    }
  }
  return { detail, settled, coarse, gratFine: graticule(15), gratCoarse: graticule(30) };
}

function touches(line, lon0, lat0, maxC) {
  const midLon = (line.minLon + line.maxLon) / 2;
  let dlon = Math.abs(midLon - lon0);
  if (dlon > 180) dlon = 360 - dlon;
  const midLat = (line.minLat + line.maxLat) / 2;
  return dlon <= maxC + (line.maxLon - line.minLon) / 2
    && Math.abs(midLat - lat0) <= maxC + (line.maxLat - line.minLat) / 2;
}

function project(data, lon0, lat0, radius, w, h, path) {
  const rad = Math.PI / 180;
  const s0 = Math.sin(lat0 * rad);
  const c0 = Math.cos(lat0 * rad);
  let pen = false;
  let px = 0, py = 0, pz = 0;
  for (let i = 0; i < data.length; i += 2) {
    const lam = (data[i] - lon0) * rad;
    const phi = data[i + 1] * rad;
    const cphi = Math.cos(phi);
    const sphi = Math.sin(phi);
    const clam = Math.cos(lam);
    const slam = Math.sin(lam);
    const x = cphi * slam;
    const y = sphi * c0 - cphi * clam * s0;
    const z = cphi * clam * c0 + sphi * s0;
    const sx = w / 2 + x * radius;
    const sy = h / 2 - y * radius;
    if (z >= 0.02) {
      if (!pen && i > 0 && pz < 0.02) {
        const t = (0.02 - pz) / (z - pz || 1);
        path.moveTo(px + (sx - px) * t, py + (sy - py) * t);
        path.lineTo(sx, sy);
      } else if (!pen) path.moveTo(sx, sy);
      else path.lineTo(sx, sy);
      pen = true;
    } else if (pen) {
      const t = (0.02 - pz) / (z - pz || 1);
      path.lineTo(px + (sx - px) * t, py + (sy - py) * t);
      pen = false;
    }
    px = sx;
    py = sy;
    pz = z;
  }
}

export function drawGlobeStrokes(ctx, w, h, pack, lon0, lat0, radius, mode, fast) {
  ctx.clearRect(0, 0, w, h);
  const half = Math.hypot(w, h) * 0.5;
  const zoomed = !fast && radius > half * 1.2;
  let lines = fast ? pack.coarse : zoomed ? pack.detail : pack.settled;
  if (zoomed) {
    const maxC = Math.asin(Math.min(1, half / Math.max(radius, 1))) * (180 / Math.PI) + 8;
    lines = lines.filter((line) => touches(line, lon0, lat0, maxC));
  }
  const grats = fast ? pack.gratCoarse : pack.gratFine;
  const grat = new Path2D();
  const dim = new Path2D();
  const asia = new Path2D();
  for (const line of grats) project(line, lon0, lat0, radius, w, h, grat);
  for (const line of lines) project(line.data, lon0, lat0, radius, w, h, line.asia ? asia : dim);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = fast ? 0.7 : 0.6;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.stroke(grat);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = mode === "asia" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.55)";
  ctx.stroke(dim);
  ctx.lineWidth = mode === "asia" ? 1.15 : 0.95;
  ctx.strokeStyle = "rgba(255,236,196,0.92)";
  ctx.stroke(asia);
  ctx.beginPath();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.arc(w / 2, h / 2, Math.max(0, radius - 0.5), 0, Math.PI * 2);
  ctx.stroke();
}
