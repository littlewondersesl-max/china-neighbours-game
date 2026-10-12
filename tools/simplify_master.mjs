import { readFileSync, writeFileSync } from "fs";
import { topology } from "topojson-server";
import { presimplify, simplify, quantile } from "topojson-simplify";
import { feature } from "topojson-client";

const src = process.argv[2];
const dest = process.argv[3];
const q = Number(process.argv[4] || "0.12");
const fc = JSON.parse(readFileSync(src, "utf8"));
const topo = topology({ countries: fc }, 1e5);
const pre = presimplify(topo);
const weight = quantile(pre, q);
const simple = simplify(pre, weight);

function countPts(t) {
  let n = 0;
  for (const arc of t.arcs) n += arc.length;
  return n;
}

const geoms = simple.objects.countries.geometries;
const owners = new Map();
function add(idx, iso) {
  const i = idx < 0 ? ~idx : idx;
  let set = owners.get(i);
  if (!set) owners.set(i, set = new Set());
  set.add(iso);
}
function visit(node, iso) {
  if (typeof node === "number") { add(node, iso); return; }
  for (const child of node) visit(child, iso);
}
for (const g of geoms) visit(g.arcs, g.id);

function decode(i) {
  const arc = simple.arcs[i];
  const tr = simple.transform;
  let x = 0;
  let y = 0;
  const pts = [];
  for (const p of arc) {
    let lon;
    let lat;
    if (tr) {
      x += p[0];
      y += p[1];
      lon = tr.translate[0] + x * tr.scale[0];
      lat = tr.translate[1] + y * tr.scale[1];
    } else {
      lon = p[0];
      lat = p[1];
    }
    const rlon = Math.round(lon * 1e4) / 1e4;
    const rlat = Math.round(lat * 1e4) / 1e4;
    const last = pts[pts.length - 1];
    if (!last || last[0] !== rlon || last[1] !== rlat) pts.push([rlon, rlat]);
  }
  return pts;
}

const arcs = [];
for (let i = 0; i < simple.arcs.length; i++) {
  const who = [...(owners.get(i) || [])].sort();
  if (!who.length) continue;
  const pts = decode(i);
  if (pts.length < 2) continue;
  arcs.push({ a: who[0], b: who[1] || null, pts });
}

const collection = feature(simple, simple.objects.countries);
const out = {
  weight,
  quantile: q,
  arcCount: arcs.length,
  pointCount: arcs.reduce((n, a) => n + a.pts.length, 0),
  rawPoints: countPts(topo),
  features: collection.features,
  arcs,
};
writeFileSync(dest, JSON.stringify(out));
console.log(JSON.stringify({
  weight, quantile: q, arcs: arcs.length, points: out.pointCount,
  features: collection.features.length,
}));
