/** Globe borders from the master arc set. One line weight, no second simplification. */

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

export function prepareBorderArcs(arcs, continentOf) {
  const lines = [];
  for (const arc of arcs) {
    if (!arc.pts || arc.pts.length < 2) continue;
    const asia = continentOf.get(arc.a) === "Asia" || (arc.b && continentOf.get(arc.b) === "Asia");
    addRing(lines, asia, arc.pts);
  }
  return { lines, gratFine: graticule(15), gratCoarse: graticule(30) };
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
  const zoomed = radius > half * 1.2;
  let lines = pack.lines;
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
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = mode === "asia" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.55)";
  ctx.stroke(dim);
  ctx.strokeStyle = "rgba(255,236,196,0.9)";
  ctx.stroke(asia);
  ctx.beginPath();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.arc(w / 2, h / 2, Math.max(0, radius - 0.5), 0, Math.PI * 2);
  ctx.stroke();
}
