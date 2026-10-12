/** Lambert azimuthal equal-area, matching the build used for this puzzle (sphere R). */

const R = 6371.0088;

export function makeLaea(lon0, lat0) {
  const rad = Math.PI / 180;
  const phi0 = lat0 * rad;
  const lam0 = lon0 * rad;
  const s0 = Math.sin(phi0);
  const c0 = Math.cos(phi0);
  return {
    lon0,
    lat0,
    forward(lon, lat) {
      const phi = lat * rad;
      const dlam = lon * rad - lam0;
      const cosc = s0 * Math.sin(phi) + c0 * Math.cos(phi) * Math.cos(dlam);
      if (cosc < -0.2) return null;
      const k = Math.sqrt(2 / (1 + cosc));
      const x = R * k * Math.cos(phi) * Math.sin(dlam);
      const y = R * k * (c0 * Math.sin(phi) - s0 * Math.cos(phi) * Math.cos(dlam));
      return [x, y];
    },
    inverse(x, y) {
      const rho = Math.hypot(x, y);
      if (rho < 1e-8) return [lon0, lat0];
      const c = 2 * Math.asin(Math.min(1, rho / (2 * R)));
      const sc = Math.sin(c);
      const cc = Math.cos(c);
      const lat = Math.asin(cc * s0 + (y * sc * c0) / rho);
      const lon = lam0 + Math.atan2(x * sc, rho * c0 * cc - y * s0 * sc);
      return [lon / rad, lat / rad];
    },
  };
}

export function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function dropClose(ring) {
  if (ring.length > 1) {
    const a = ring[0];
    const b = ring[ring.length - 1];
    if (a[0] === b[0] && a[1] === b[1]) return ring.slice(0, -1);
  }
  return ring;
}

/** Triangulate a GeoJSON feature in the given LAEA. Positions are km relative to the bbox centre. */
export function buildMesh(feature, proj, riverLines) {
  const polys = feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
  const earcut = globalThis.earcut;
  const abs = [];
  const indices = [];
  const rings = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const consider = (x, y) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const poly of polys) {
    const flat = [];
    const holes = [];
    const pts = [];
    poly.forEach((ring, ri) => {
      const open = dropClose(ring);
      if (open.length < 3) return;
      if (ri > 0 && flat.length) holes.push(flat.length / 2);
      for (const [lon, lat] of open) {
        const xy = proj.forward(lon, lat);
        if (!xy) return;
        flat.push(xy[0], xy[1]);
        pts.push(xy[0], xy[1], lon, lat);
        consider(xy[0], xy[1]);
      }
    });
    if (flat.length < 6) continue;
    const tris = earcut(flat, holes.length ? holes : null, 2) || [];
    const base = abs.length / 4;
    for (let i = 0; i < pts.length; i++) abs.push(pts[i]);
    for (const idx of tris) indices.push(base + idx);
  }

  if (!Number.isFinite(minX)) {
    minX = minY = maxX = maxY = 0;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const verts = new Float32Array(abs.length);
  for (let i = 0; i < abs.length; i += 4) {
    verts[i] = abs[i] - cx;
    verts[i + 1] = abs[i + 1] - cy;
    verts[i + 2] = abs[i + 2];
    verts[i + 3] = abs[i + 3];
  }

  const pushRing = (ring) => {
    const open = dropClose(ring);
    const out = [];
    for (const [lon, lat] of open) {
      const xy = proj.forward(lon, lat);
      if (!xy) { out.length = 0; break; }
      out.push([xy[0] - cx, xy[1] - cy]);
    }
    if (out.length >= 3) rings.push(out);
  };
  for (const poly of polys) poly.forEach(pushRing);

  const rivers = [];
  for (const line of riverLines || []) {
    const out = [];
    for (const [lon, lat] of line) {
      const xy = proj.forward(lon, lat);
      if (!xy) { out.length = 0; break; }
      out.push([xy[0] - cx, xy[1] - cy]);
    }
    if (out.length >= 2) rivers.push(out);
  }

  let indexArr;
  if (verts.length / 4 > 65535) indexArr = new Uint32Array(indices);
  else indexArr = new Uint16Array(indices);

  return {
    feature,
    iso: feature.properties.iso,
    cx, cy,
    minX, minY, maxX, maxY,
    relMinX: minX - cx,
    relMinY: minY - cy,
    relMaxX: maxX - cx,
    relMaxY: maxY - cy,
    width: maxX - minX,
    height: maxY - minY,
    verts,
    indices: indexArr,
    rings,
    rivers,
  };
}

export function boundsOfFeature(feature) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === "number") {
      if (c[0] < minX) minX = c[0];
      if (c[0] > maxX) maxX = c[0];
      if (c[1] < minY) minY = c[1];
      if (c[1] > maxY) maxY = c[1];
    } else {
      for (const x of c) walk(x);
    }
  };
  walk(feature.geometry.coordinates);
  return [minX, minY, maxX, maxY];
}

export function screenPath(rings, piece, view) {
  let d = "";
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const x = piece.cx + piece.scale * ring[i][0];
      const y = piece.cy + piece.scale * ring[i][1];
      const sx = (x - view.originX) / view.kmPerPx;
      const sy = view.height - (y - view.originY) / view.kmPerPx;
      d += (i ? "L" : "M") + sx.toFixed(1) + " " + sy.toFixed(1) + " ";
    }
    d += "Z ";
  }
  return d;
}

export function linePath(lines, piece, view) {
  let d = "";
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const x = piece.cx + piece.scale * line[i][0];
      const y = piece.cy + piece.scale * line[i][1];
      const sx = (x - view.originX) / view.kmPerPx;
      const sy = view.height - (y - view.originY) / view.kmPerPx;
      d += (i ? "L" : "M") + sx.toFixed(1) + " " + sy.toFixed(1) + " ";
    }
  }
  return d;
}

/** Absolute km polylines (seams) to a screen path. */
export function absLinePath(lines, view) {
  let d = "";
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const sx = (line[i][0] - view.originX) / view.kmPerPx;
      const sy = view.height - (line[i][1] - view.originY) / view.kmPerPx;
      d += (i ? "L" : "M") + sx.toFixed(1) + " " + sy.toFixed(1) + " ";
    }
  }
  return d;
}
