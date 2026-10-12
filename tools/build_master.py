#!/usr/bin/env python3
"""One Natural Earth topology for every country outline.

Shared borders are extracted once (topojson arcs), simplified once, and written
to data/master.json. world.json and shapes.json are the same polygons, not a
second simplification. borders.json seam lines are those same arcs.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

import shapefile
from PIL import Image, ImageDraw, ImageFont
from pyproj import Geod
from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.ops import unary_union

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
NE = "/tmp/ne-data/ne_10m_admin_0_countries.shp"
RAW = "/tmp/master-raw.geojson"
SIMPLE = "/tmp/master-simple.json"
NODE = os.path.join(os.path.dirname(__file__), "simplify_master.mjs")
QUANTILE = os.environ.get("MASTER_Q", "0.08")

MERGE_INTO = {
    "CHN": ["TWN", "HKG", "MAC"],
    "KAZ": ["KAB"],
    "IND": ["KAS"],
    "CYP": ["CYN", "ESB", "WSB", "CNM"],
}
SKIP = {"PGA", "SCR", "IOA"}
NAME_EN = {
    "CHN": "China", "KOR": "South Korea", "PRK": "North Korea", "LAO": "Laos",
    "VNM": "Vietnam", "MMR": "Myanmar", "TLS": "Timor-Leste", "RUS": "Russia",
    "ARE": "United Arab Emirates", "PSX": "Palestine", "TUR": "Turkey",
}
NAME_ZH = {
    "CHN": "中国", "KOR": "韩国", "PRK": "朝鲜", "RUS": "俄罗斯",
    "LAO": "老挝", "VNM": "越南", "MMR": "缅甸", "ARE": "阿联酋",
    "TLS": "东帝汶", "PSX": "巴勒斯坦", "KHM": "柬埔寨", "BRN": "文莱",
    "PNG": "巴布亚新几内亚", "UKR": "乌克兰", "BLR": "白俄罗斯",
}
GEOD = Geod(ellps="WGS84")


def fix(geom):
    if geom is None or geom.is_empty:
        return Polygon()
    if not geom.is_valid:
        geom = geom.buffer(0)
    return geom


def as_multi(geom):
    geom = fix(geom)
    if geom.is_empty:
        return MultiPolygon([])
    if geom.geom_type == "Polygon":
        return MultiPolygon([geom])
    if geom.geom_type == "MultiPolygon":
        return geom
    if geom.geom_type == "GeometryCollection":
        polys = [g for g in geom.geoms if g.geom_type in ("Polygon", "MultiPolygon")]
        return as_multi(unary_union(polys) if polys else Polygon())
    return MultiPolygon([])


def rnd(coords, nd=4):
    if not coords:
        return coords
    if isinstance(coords[0], (float, int)):
        return [round(float(coords[0]), nd), round(float(coords[1]), nd)]
    return [rnd(c, nd) for c in coords]


def area_km2(geom):
    try:
        area, _ = GEOD.geometry_area_perimeter(geom)
        return abs(float(area)) / 1e6
    except Exception:
        return 0.0


def bbox_of(geom):
    minx, miny, maxx, maxy = geom.bounds
    return [round(minx, 4), round(miny, 4), round(maxx, 4), round(maxy, 4)]


def label_of(geom):
    point = geom.representative_point()
    if point.is_empty:
        point = geom.centroid
    return [round(point.x, 4), round(point.y, 4)]


def load_raw():
    sf = shapefile.Reader(NE)
    raw = {}
    for sr in sf.iterShapeRecords():
        d = sr.record.as_dict()
        iso = d["ADM0_A3"]
        try:
            geom = shape(sr.shape.__geo_interface__)
        except Exception:
            continue
        raw[iso] = {
            "geom": fix(geom),
            "name": d.get("NAME_EN") or d.get("ADMIN") or d.get("NAME") or iso,
            "zh": d.get("NAME_ZH") or d.get("NAME_ZHT") or d.get("ADMIN") or iso,
            "continent": d.get("CONTINENT") or "Seven seas (open ocean)",
        }
    return raw


def draw_sheet(countries, arcs, path):
    font = ImageFont.load_default()
    world_w, world_h = 2200, 1100

    def xy(lon, lat):
        return ((lon + 180) / 360 * (world_w - 40) + 20,
                (90 - lat) / 180 * (world_h - 40) + 20)

    world = Image.new("RGB", (world_w, world_h), (244, 236, 220))
    draw = ImageDraw.Draw(world)
    for arc in arcs:
        pts = arc["pts"]
        seg = []
        prev = None
        for lon, lat in pts:
            if prev is not None and abs(lon - prev[0]) > 180:
                if len(seg) >= 2:
                    draw.line(seg, fill=(36, 48, 40), width=1)
                seg = []
            seg.append(xy(lon, lat))
            prev = (lon, lat)
        if len(seg) >= 2:
            draw.line(seg, fill=(36, 48, 40), width=1)
    for rec in countries:
        if rec["bbox"][2] - rec["bbox"][0] < 8 and rec["bbox"][3] - rec["bbox"][1] < 6:
            continue
        x, y = xy(rec["label"][0], rec["label"][1])
        draw.text((x, y), rec["name"], fill=(90, 40, 24), font=font, anchor="mm")

    cols = 10
    cell_w, cell_h = 220, 150
    rows = (len(countries) + cols - 1) // cols
    grid = Image.new("RGB", (cols * cell_w, rows * cell_h + 8), (250, 246, 236))
    g = ImageDraw.Draw(grid)
    ordered = sorted(countries, key=lambda r: r["name"])
    for i, rec in enumerate(ordered):
        col, row = i % cols, i // cols
        x0, y0 = col * cell_w, row * cell_h
        g.rectangle((x0 + 4, y0 + 4, x0 + cell_w - 4, y0 + cell_h - 4), outline=(220, 210, 190))
        rings = []
        for poly in rec["geometry"]["coordinates"]:
            rings.extend(poly)
        if not rings:
            continue
        minx, miny, maxx, maxy = rec["bbox"]
        span = max(maxx - minx, maxy - miny) or 1
        pad = 18
        usable = min(cell_w, cell_h - 28) - pad * 2

        def cell_xy(lon, lat, span=span, minx=minx, maxy=maxy):
            return (x0 + pad + (lon - minx) / span * usable,
                    y0 + pad + (maxy - lat) / span * usable)

        for ring in rings:
            seg = []
            prev = None
            for lon, lat in ring:
                if prev is not None and abs(lon - prev[0]) > 180:
                    if len(seg) >= 2:
                        g.line(seg, fill=(28, 52, 46), width=1)
                    seg = []
                seg.append(cell_xy(lon, lat))
                prev = (lon, lat)
            if len(seg) >= 2:
                g.line(seg, fill=(28, 52, 46), width=1)
        g.text((x0 + 10, y0 + cell_h - 28), f"{rec['name']}  {rec['iso']}", fill=(40, 32, 24), font=font)
        g.text((x0 + 10, y0 + cell_h - 16), f"{rec['areaKm2']:,.0f} km²", fill=(90, 70, 50), font=font)

    sheet = Image.new("RGB", (max(world_w, grid.width), world_h + grid.height + 16), (244, 236, 220))
    sheet.paste(world, (0, 0))
    sheet.paste(grid, (0, world_h + 8))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sheet.save(path, "PNG", optimize=True)
    print("sheet", path, os.path.getsize(path) // 1024, "KB", flush=True)


def main():
    print("load…", flush=True)
    raw = load_raw()
    merged_away = {iso for group in MERGE_INTO.values() for iso in group}
    records = {}
    features = []
    for iso, rec in raw.items():
        if iso in SKIP or iso in merged_away:
            continue
        geom = rec["geom"]
        for extra in MERGE_INTO.get(iso, []):
            if extra in raw and not raw[extra]["geom"].is_empty:
                geom = unary_union([geom, raw[extra]["geom"]])
        geom = as_multi(geom)
        if geom.is_empty:
            continue
        records[iso] = {
            "name": NAME_EN.get(iso, rec["name"]),
            "zh": NAME_ZH.get(iso, rec["zh"]),
            "continent": "Asia" if iso == "RUS" else rec["continent"],
            "source": geom,
            "areaKm2": round(area_km2(geom), 1),
        }
        features.append({
            "type": "Feature",
            "id": iso,
            "properties": {"iso": iso},
            "geometry": mapping(geom),
        })
    print("countries", len(features), flush=True)
    with open(RAW, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)
    print("topojson…", flush=True)
    staged = "/tmp/topojs/simplify-master.mjs"
    os.makedirs("/tmp/topojs", exist_ok=True)
    with open(NODE, encoding="utf-8") as src, open(staged, "w", encoding="utf-8") as dst:
        dst.write(src.read())
    subprocess.check_call(["node", staged, RAW, SIMPLE, QUANTILE], cwd="/tmp/topojs")
    simple = json.load(open(SIMPLE, encoding="utf-8"))
    print("simplified", simple["arcCount"], "arcs", simple["pointCount"], "points", flush=True)

    by_iso = {}
    restored = []
    for feat in simple["features"]:
        iso = feat.get("id") or feat["properties"]["iso"]
        geom = as_multi(shape(feat["geometry"]))
        if geom.is_empty or geom.area < 1e-8:
            geom = as_multi(records[iso]["source"].simplify(0.01, preserve_topology=True))
            if geom.is_empty:
                geom = records[iso]["source"]
            coords = rnd(mapping(geom)["coordinates"])
            restored.append(iso)
        else:
            coords = rnd(mapping(geom)["coordinates"])
        src = records[iso]
        by_iso[iso] = {
            "iso": iso,
            "name": src["name"],
            "zh": src["zh"],
            "continent": src["continent"],
            "areaKm2": src["areaKm2"],
            "bbox": bbox_of(geom),
            "label": label_of(geom),
            "geometry": {"type": "MultiPolygon", "coordinates": coords},
        }

    puzzle = {f["properties"]["iso"] for f in json.load(open(os.path.join(ROOT, "data", "shapes.json"), encoding="utf-8"))["features"]}
    missing = sorted(puzzle - set(by_iso))
    if missing:
        raise SystemExit("puzzle countries missing from master: " + ",".join(missing))
    for iso in puzzle:
        by_iso[iso]["puzzle"] = True

    arcs = []
    for arc in simple["arcs"]:
        pts = arc["pts"]
        if len(pts) < 2:
            continue
        if arc["a"] in restored or (arc["b"] in restored):
            continue
        arcs.append({"a": arc["a"], "b": arc["b"], "pts": pts})
    def boundary_lines(geom):
        boundary = geom.boundary
        if boundary.is_empty:
            return
        if boundary.geom_type == "LineString":
            yield boundary
        else:
            for part in getattr(boundary, "geoms", []):
                yield from boundary_lines(part) if part.geom_type != "LineString" else [part]

    for iso in restored:
        geom = shape(by_iso[iso]["geometry"])
        for line in boundary_lines(geom):
            deduped = []
            for p in rnd(list(line.coords)):
                if not deduped or deduped[-1] != p:
                    deduped.append(p)
            if len(deduped) >= 2:
                arcs.append({"a": iso, "b": None, "pts": deduped})
    if restored:
        print("restored tiny", ",".join(restored), flush=True)

    countries = [by_iso[iso] for iso in sorted(by_iso)]
    master = {
        "source": "Natural Earth 10m admin-0, one topology",
        "quantile": simple["quantile"],
        "countries": countries,
        "arcs": arcs,
    }
    data = os.path.join(ROOT, "data")

    def dump(path, obj):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        print(path, os.path.getsize(path) // 1024, "KB", flush=True)

    dump(os.path.join(data, "master.json"), master)

    def as_feature(rec):
        return {
            "type": "Feature",
            "properties": {
                "iso": rec["iso"],
                "name": rec["name"],
                "zh": rec["zh"],
                "continent": rec["continent"],
                "areaKm2": rec["areaKm2"],
                "label": rec["label"],
            },
            "geometry": rec["geometry"],
        }

    dump(os.path.join(data, "world.json"),
         {"type": "FeatureCollection", "features": [as_feature(r) for r in countries]})
    dump(os.path.join(data, "shapes.json"),
         {"type": "FeatureCollection", "features": [as_feature(by_iso[iso]) for iso in sorted(puzzle)]})

    borders = json.load(open(os.path.join(data, "borders.json"), encoding="utf-8"))
    seams = {}
    for arc in arcs:
        if not arc["b"]:
            continue
        key = "|".join(sorted((arc["a"], arc["b"])))
        if arc["a"] not in puzzle or arc["b"] not in puzzle:
            continue
        seams.setdefault(key, []).append(arc["pts"])
    old = set(borders["seams"])
    print("seams", len(seams), "was", len(old), "missing", sorted(old - set(seams))[:12], flush=True)
    borders["seams"] = seams
    dump(os.path.join(data, "borders.json"), borders)

    sheet = "/opt/cursor/artifacts/screenshots/master-borders-sheet.png"
    draw_sheet(countries, arcs, sheet)
    # China / Mongolia arc should exist and be a single shared line.
    chn = [a for a in arcs if {a["a"], a["b"]} == {"CHN", "MNG"}]
    print("CHN-MNG arcs", len(chn), "pts", sum(len(a["pts"]) for a in chn), flush=True)


if __name__ == "__main__":
    main()
