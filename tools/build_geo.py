#!/usr/bin/env python3
"""Build puzzle geometry from Natural Earth 10m.

Outputs (repo-relative):
  assets/relief.jpg          hypsometric tint + shaded relief (public domain)
  data/world.json            simplified world for the globe
  data/shapes.json           detailed shapes for Asia puzzles
  data/borders.json          land neighbours, lengths, weld seams
  data/rivers.json           major rivers clipped per country
"""
from __future__ import annotations

import json
import math
import os
from collections import defaultdict

import shapefile
from PIL import Image
from pyproj import Geod, Transformer
from shapely.geometry import GeometryCollection, LineString, MultiLineString, MultiPolygon, Polygon, mapping, shape
from shapely.ops import linemerge, unary_union
from shapely.strtree import STRtree

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
NE_COUNTRIES = "/tmp/ne-data/countries/ne_10m_admin_0_countries.shp"
NE_RIVERS = "/tmp/ne-data/rivers/ne_10m_rivers_lake_centerlines.shp"
NE_RELIEF = "/tmp/ne-data/relief/HYP_50M_SR_W.tif"

# Parts drawn as part of a parent country. Kid-safe classroom map:
# Taiwan, Hong Kong and Macao stay with China (as the previous game did for Taiwan).
# Baykonur is a lease inside Kazakhstan. Siachen is a glacier polygon between
# India and Pakistan; folding it into India avoids a hole and is not mentioned in copy.
# Cyprus is drawn as one island (buffer, bases, and the north included) so it
# reads as a single island country with no land neighbours.
MERGE_INTO = {
    "CHN": ["TWN", "HKG", "MAC"],
    "KAZ": ["KAB"],
    "IND": ["KAS"],
    "CYP": ["CYN", "ESB", "WSB", "CNM"],
}
SKIP = {"PGA", "SCR", "IOA"}

# 2025 CIA World Factbook land-boundary lengths (km). The simplified seam is
# shorter than a surveyed border, so a rebuild keeps these published figures.
# China–Russia is the two segments added (4,133 + 46). Israel–Jordan is 307:
# Jordan's figure, equal to Israel's 327 minus the 20 km inside the Dead Sea.
# Palestine adds the West Bank and Gaza Strip lengths.
FACTBOOK_BORDER_KM = {
    "AFG|CHN": 91, "AFG|IRN": 921, "AFG|PAK": 2670, "AFG|TJK": 1357,
    "AFG|TKM": 804, "AFG|UZB": 144, "ARE|OMN": 609, "ARE|SAU": 457,
    "ARM|AZE": 996, "ARM|GEO": 219, "ARM|IRN": 44, "ARM|TUR": 311,
    "AZE|GEO": 428, "AZE|IRN": 689, "AZE|RUS": 338, "AZE|TUR": 17,
    "BGD|IND": 4142, "BGD|MMR": 271, "BGR|GRC": 472, "BGR|TUR": 223,
    "BLR|LTU": 640, "BLR|LVA": 161, "BLR|POL": 375, "BLR|RUS": 1312,
    "BLR|UKR": 1111, "BRN|MYS": 266, "BTN|CHN": 477, "BTN|IND": 659,
    "CHN|IND": 2659, "CHN|KAZ": 1765, "CHN|KGZ": 1063, "CHN|LAO": 475,
    "CHN|MMR": 2129, "CHN|MNG": 4630, "CHN|NPL": 1389, "CHN|PAK": 438,
    "CHN|PRK": 1352, "CHN|RUS": 4179, "CHN|TJK": 477, "CHN|VNM": 1297,
    "EGY|ISR": 208, "EGY|PSX": 13, "EST|LVA": 333, "EST|RUS": 324,
    "FIN|NOR": 709, "FIN|RUS": 1309, "GEO|RUS": 894, "GEO|TUR": 273,
    "GRC|TUR": 192, "IDN|MYS": 1881, "IDN|PNG": 824, "IDN|TLS": 253,
    "IND|MMR": 1468, "IND|NPL": 1770, "IND|PAK": 3190, "IRN|IRQ": 1599,
    "IRN|PAK": 959, "IRN|TKM": 1148, "IRN|TUR": 534, "IRQ|JOR": 179,
    "IRQ|KWT": 254, "IRQ|SAU": 811, "IRQ|SYR": 599, "IRQ|TUR": 367,
    "ISR|JOR": 307, "ISR|LBN": 81, "ISR|PSX": 389, "ISR|SYR": 83,
    "JOR|PSX": 148, "JOR|SAU": 731, "JOR|SYR": 379, "KAZ|KGZ": 1212,
    "KAZ|RUS": 7644, "KAZ|TKM": 413, "KAZ|UZB": 2330, "KGZ|TJK": 984,
    "KGZ|UZB": 1314, "KHM|LAO": 555, "KHM|THA": 817, "KHM|VNM": 1158,
    "KOR|PRK": 237, "KWT|SAU": 221, "LAO|MMR": 238, "LAO|THA": 1845,
    "LAO|VNM": 2161, "LBN|SYR": 403, "LTU|LVA": 544, "LTU|POL": 100,
    "LTU|RUS": 261, "LVA|RUS": 332, "MMR|THA": 2416, "MNG|RUS": 3452,
    "MYS|THA": 595, "NOR|RUS": 191, "OMN|SAU": 658, "OMN|YEM": 294,
    "POL|RUS": 209, "POL|UKR": 498, "PRK|RUS": 18, "QAT|SAU": 87,
    "RUS|UKR": 1944, "SAU|YEM": 1307, "SYR|TUR": 899, "TJK|UZB": 1312,
    "TKM|UZB": 1793,
}

NAME_EN = {
    "CHN": "China", "KOR": "South Korea", "PRK": "North Korea", "LAO": "Laos",
    "VNM": "Vietnam", "MMR": "Myanmar", "TLS": "Timor-Leste", "RUS": "Russia",
    "ARE": "United Arab Emirates", "PSX": "Palestine", "TUR": "Turkey",
    "CIV": "Côte d'Ivoire", "COD": "DR Congo", "COG": "Congo",
    "SWZ": "Eswatini", "MKD": "North Macedonia", "CZE": "Czechia",
}
NAME_ZH = {
    "CHN": "中国", "KOR": "韩国", "PRK": "朝鲜", "RUS": "俄罗斯",
    "LAO": "老挝", "VNM": "越南", "MMR": "缅甸", "ARE": "阿联酋",
    "TLS": "东帝汶", "PSX": "巴勒斯坦", "KHM": "柬埔寨", "BRN": "文莱",
    "PNG": "巴布亚新几内亚", "UKR": "乌克兰", "BLR": "白俄罗斯",
    "USA": "美国", "GBR": "英国", "KOR_LONG": "韩国",
}

GEOD = Geod(ellps="WGS84")
TOUCH_DEG = 0.007  # ~700 m; catches tiny topology gaps, not ocean straits
MIN_BORDER_KM = 0.8


def rnd(coords, nd):
    if not coords:
        return coords
    if isinstance(coords[0], (float, int)):
        return [round(float(coords[0]), nd), round(float(coords[1]), nd)]
    return [rnd(c, nd) for c in coords]


def drop_dust(geom, min_area=1e-6):
    if geom.is_empty:
        return geom
    if geom.geom_type == "Polygon":
        return geom if geom.area >= min_area else Polygon()
    if geom.geom_type == "MultiPolygon":
        parts = [p for p in geom.geoms if p.area >= min_area]
        if not parts:
            return Polygon()
        return parts[0] if len(parts) == 1 else MultiPolygon(parts)
    return geom


def fix(geom):
    if geom is None or geom.is_empty:
        return Polygon()
    if not geom.is_valid:
        geom = geom.buffer(0)
    return drop_dust(geom)


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


def simplify_geom(geom, tol, small_tol=0.004):
    geom = as_multi(geom)
    parts = []
    for p in geom.geoms:
        # Thin island chains (Maldives, Andamans) disappear if simplified too hard.
        t = 0.002 if p.area < 0.05 else (small_tol if p.area < 0.2 else tol)
        g = p.simplify(t, preserve_topology=True)
        if g.is_empty or (p.area > 0 and g.area < p.area * 0.5):
            g = p.simplify(0.0015, preserve_topology=True)
        if g.is_empty:
            g = p
        g = drop_dust(g, 1e-8)
        if not g.is_empty:
            if g.geom_type == "Polygon":
                parts.append(g)
            elif g.geom_type == "MultiPolygon":
                parts.extend([q for q in g.geoms if not q.is_empty])
    if not parts:
        return MultiPolygon([])
    return MultiPolygon(parts)


def iter_lines(geom):
    if geom is None or geom.is_empty:
        return
    gt = geom.geom_type
    if gt == "LineString":
        if geom.length > 0:
            yield geom
    elif gt == "MultiLineString":
        for g in geom.geoms:
            yield from iter_lines(g)
    elif gt == "GeometryCollection":
        for g in geom.geoms:
            yield from iter_lines(g)


def line_km(geom):
    total = 0.0
    for ln in iter_lines(geom):
        coords = list(ln.coords)
        if len(coords) < 2:
            continue
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        # Geod.line_length wants radians? In pyproj, geometry methods take degrees
        # via geometry_length. Use inverse pairwise for control.
        _, _, dist = GEOD.inv(lons[:-1], lats[:-1], lons[1:], lats[1:])
        total += float(abs(sum(dist))) / 1000.0
    return total


def dedupe_line(coords, nd=3):
    out = []
    for lon, lat in coords:
        p = (round(lon, nd), round(lat, nd))
        if not out or out[-1] != p:
            out.append(p)
    return out


def load_countries():
    sf = shapefile.Reader(NE_COUNTRIES)
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
            "name": d["NAME_EN"] or d["ADMIN"] or d["NAME"],
            "zh": d["NAME_ZH"] or d["NAME_ZHT"] or d["ADMIN"],
            "continent": d["CONTINENT"] or "Seven seas (open ocean)",
        }
    return raw


def build_relief():
    dest = os.path.join(ROOT, "assets", "relief.jpg")
    print("relief…", flush=True)
    Image.MAX_IMAGE_PIXELS = None
    im = Image.open(NE_RELIEF).convert("RGB")
    im = im.resize((8192, 4096), Image.Resampling.LANCZOS)
    im.save(dest, "JPEG", quality=82, optimize=True, progressive=True)
    print("  wrote", dest, os.path.getsize(dest) // 1024, "KB", flush=True)


def area_km2(geom):
    try:
        a, _ = GEOD.geometry_area_perimeter(geom)
        return abs(a) / 1e6
    except Exception:
        return 0.0


def centroid_ll(geom):
    if geom is None or geom.is_empty:
        return [0.0, 0.0]
    c = geom.representative_point()
    if c.is_empty:
        c = geom.centroid
    if c.is_empty:
        return [0.0, 0.0]
    return [round(c.x, 4), round(c.y, 4)]


def feature(iso, rec, geom, nd):
    geom = as_multi(geom)
    return {
        "type": "Feature",
        "properties": {
            "iso": iso,
            "name": NAME_EN.get(iso, rec["name"]),
            "zh": NAME_ZH.get(iso, rec["zh"]),
            "continent": "Asia" if iso == "RUS" else rec["continent"],
            "areaKm2": round(area_km2(geom), 1),
            "label": centroid_ll(geom),
        },
        "geometry": {"type": "MultiPolygon", "coordinates": rnd(mapping(geom)["coordinates"], nd)},
    }


def shared_boundary(a, b):
    # Portion of A's outline that lies against B. Degree-buffer only bridges
    # sub-kilometre digitising gaps, not straits such as the Bering Strait.
    near = a.boundary.intersection(b.buffer(TOUCH_DEG))
    lines = list(iter_lines(near))
    if not lines:
        return None, 0.0
    merged = linemerge(MultiLineString(lines))
    km = line_km(merged)
    return merged, km


def seam_coords(geom):
    geoms = []
    if geom.geom_type == "LineString":
        geoms = [geom]
    elif geom.geom_type == "MultiLineString":
        geoms = list(geom.geoms)
    elif geom.geom_type == "GeometryCollection":
        geoms = list(iter_lines(geom))
    out = []
    for ln in geoms:
        s = ln.simplify(0.01, preserve_topology=False)
        pts = dedupe_line(s.coords, 3)
        if len(pts) >= 2 and line_km(LineString(pts)) >= 1.0:
            out.append([[p[0], p[1]] for p in pts])
    return out


def load_rivers(countries):
    print("rivers…", flush=True)
    sf = shapefile.Reader(NE_RIVERS)
    isos = list(countries)
    geoms = [countries[i]["detailed"] for i in isos]
    tree = STRtree(geoms)
    by_iso = defaultdict(list)
    kept = 0
    for sr in sf.iterShapeRecords():
        d = sr.record.as_dict()
        rank = d.get("scalerank") or 99
        name = (d.get("name_en") or d.get("name") or "").strip()
        if not name or rank > 5:
            continue
        try:
            geom = shape(sr.shape.__geo_interface__)
        except Exception:
            continue
        if geom.is_empty:
            continue
        hits = tree.query(geom)
        owners = []
        for idx in hits:
            iso = isos[int(idx)]
            cg = countries[iso]["detailed"]
            if not geom.intersects(cg):
                continue
            piece = geom.intersection(cg.buffer(0.012))
            lines = []
            for ln in iter_lines(piece):
                if line_km(ln) < 25:
                    continue
                s = ln.simplify(0.015, preserve_topology=False)
                pts = dedupe_line(s.coords, 3)
                if len(pts) >= 2:
                    lines.append([[p[0], p[1]] for p in pts])
            if lines:
                owners.append(iso)
                by_iso[iso].extend(lines)
        if len(set(owners)) >= 2:
            kept += 1
        else:
            # Drop rivers that never cross into a second puzzle country.
            for iso in set(owners):
                # remove the lines we just added for single-country rivers
                pass
    # Second pass: only keep segments whose river was multi-country.
    # The loop above already extended by_iso before knowing. Rebuild cleanly.
    return by_iso, kept


def load_rivers_clean(countries):
    print("rivers…", flush=True)
    sf = shapefile.Reader(NE_RIVERS)
    isos = list(countries)
    geoms = [countries[i]["detailed"] for i in isos]
    tree = STRtree(geoms)
    by_iso = defaultdict(list)
    multi = 0
    for sr in sf.iterShapeRecords():
        d = sr.record.as_dict()
        rank = d.get("scalerank") if d.get("scalerank") is not None else 99
        name = (d.get("name_en") or d.get("name") or "").strip()
        if not name or rank > 5:
            continue
        try:
            geom = shape(sr.shape.__geo_interface__)
        except Exception:
            continue
        if geom.is_empty or geom.length < 0.05:
            continue
        clips = {}
        for idx in tree.query(geom):
            iso = isos[int(idx)]
            cg = countries[iso]["detailed"]
            if not geom.intersects(cg):
                continue
            piece = geom.intersection(cg.buffer(0.015))
            lines = []
            for ln in iter_lines(piece):
                if line_km(ln) < 30:
                    continue
                s = ln.simplify(0.018, preserve_topology=False)
                pts = dedupe_line(s.coords, 3)
                if len(pts) >= 2:
                    lines.append([[p[0], p[1]] for p in pts])
            if lines:
                clips[iso] = lines
        if len(clips) < 2:
            continue
        multi += 1
        for iso, lines in clips.items():
            by_iso[iso].extend(lines)
    print(f"  cross-border rivers: {multi}", flush=True)
    return by_iso


def main():
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
    build_relief()

    print("countries…", flush=True)
    raw = load_countries()
    merged_away = {iso for group in MERGE_INTO.values() for iso in group}

    records = {}
    for iso, rec in raw.items():
        if iso in SKIP or iso in merged_away:
            continue
        geom = rec["geom"]
        for extra in MERGE_INTO.get(iso, []):
            if extra in raw and not raw[extra]["geom"].is_empty:
                geom = unary_union([geom, raw[extra]["geom"]])
        geom = as_multi(fix(geom))
        if geom.is_empty:
            continue
        records[iso] = {
            "name": rec["name"],
            "zh": rec["zh"],
            "continent": rec["continent"],
            "base": geom,
        }
        print(f"  {iso} parts={len(geom.geoms)}", flush=True)

    print("simplify…", flush=True)
    for iso, rec in records.items():
        rec["world"] = simplify_geom(rec["base"], 0.09, 0.03)
        rec["detailed"] = rec["world"]
        rec.pop("base")

    # Neighbours among a working set: every detailed asian country + russia,
    # then pull in outside countries that actually touch them and upgrade
    # those outsiders to detailed geometry. We need the original for that,
    # so re-simplify outsiders after the first neighbour pass using world
    # geom (good enough to detect touch) and then recompute on detailed.
    print("neighbour pass…", flush=True)
    # Upgrade every country that touches the Asia/Russia set to detailed res.
    # World geom is enough to find candidates; lengths use a buffer test.
    asia_ids = [i for i, r in records.items() if r["continent"] == "Asia" or i == "RUS"]
    # Use world polygons for a cheap candidate search, then recompute.
    ids = list(records)
    tree = STRtree([records[i]["world"] for i in ids])
    need_detail = set(asia_ids)
    for iso in asia_ids:
        g = records[iso]["world"]
        buf = g.buffer(TOUCH_DEG)
        for idx in tree.query(buf):
            other = ids[int(idx)]
            if other == iso:
                continue
            # STRtree.query is an envelope test; confirm a real touch.
            if records[other]["world"].intersects(buf):
                need_detail.add(other)
    print("  countries in puzzle set:", len(need_detail), flush=True)

    # Reload originals for the puzzle set only and simplify at detail tolerance.
    # (We dropped base geoms.) Rebuild those from the shapefile.
    print("detail reload…", flush=True)
    raw = load_countries()
    for iso in list(need_detail):
        if iso not in raw and iso not in MERGE_INTO:
            continue
        geom = raw[iso]["geom"] if iso in raw else Polygon()
        for extra in MERGE_INTO.get(iso, []):
            if extra in raw:
                geom = unary_union([geom, raw[extra]["geom"]])
        records[iso]["detailed"] = simplify_geom(fix(geom), 0.01, 0.003)
        records[iso]["continent"] = "Asia" if iso == "RUS" else records[iso]["continent"]

    puzzle_ids = [i for i in need_detail if i in records and not records[i]["detailed"].is_empty]
    print("shared borders…", flush=True)
    ptree = STRtree([records[i]["detailed"] for i in puzzle_ids])
    neighbours = {i: [] for i in puzzle_ids}
    lengths = {}
    seams = {}
    for i, iso in enumerate(puzzle_ids):
        g = records[iso]["detailed"]
        for idx in ptree.query(g.buffer(TOUCH_DEG)):
            other = puzzle_ids[int(idx)]
            if other <= iso:
                continue
            merged, km = shared_boundary(g, records[other]["detailed"])
            if km < MIN_BORDER_KM:
                continue
            key = "|".join(sorted((iso, other)))
            if key in FACTBOOK_BORDER_KM:
                km = FACTBOOK_BORDER_KM[key]
            lengths[key] = int(round(km))
            if merged is not None:
                seams[key] = seam_coords(merged)
            neighbours[iso].append(other)
            neighbours[other].append(iso)
        if (i + 1) % 15 == 0:
            print(f"  {i+1}/{len(puzzle_ids)}", flush=True)

    # Stable geographic order: west-to-east around each centre.
    for iso, nbs in neighbours.items():
        c = records[iso]["detailed"].centroid
        def ang(o):
            oc = records[o]["detailed"].centroid
            return math.atan2(oc.x - c.x, oc.y - c.y)
        nbs.sort(key=ang)

    asia_centres = {i for i in neighbours if records[i]["continent"] == "Asia" or i == "RUS"}
    keep = set(asia_centres)
    for iso in asia_centres:
        keep.update(neighbours[iso])
    # Drop everybody else (bbox false-friends such as Germany via Russia's box).
    neighbours = {i: [n for n in neighbours[i] if n in keep] for i in keep}
    lengths = {k: v for k, v in lengths.items() if all(p in keep for p in k.split("|"))}
    seams = {k: v for k, v in seams.items() if k in lengths or k in seams and all(p in keep for p in k.split("|"))}
    seams = {k: v for k, v in seams.items() if all(p in keep for p in k.split("|"))}
    puzzle_ids = [i for i in puzzle_ids if i in keep]
    print("\n=== kept puzzle countries", len(puzzle_ids), "===")
    for iso in sorted(neighbours, key=lambda k: (-len(neighbours[k]), k)):
        if records[iso]["continent"] == "Asia" or iso == "RUS" or neighbours[iso]:
            print(f"{iso:4} {len(neighbours[iso]):2} {records[iso]['continent'][:12]:12} {','.join(neighbours[iso])}")

    world_features = []
    for iso, rec in records.items():
        g = rec["world"]
        if g is None or g.is_empty:
            print("  skip empty world", iso, flush=True)
            continue
        world_features.append(feature(iso, rec, g, 3))

    shape_features = []
    for iso in puzzle_ids:
        rec = records[iso]
        shape_features.append(feature(iso, rec, rec["detailed"], 4))

    ind = records.get("IND", {}).get("detailed")
    if ind is not None and not ind.is_empty:
        print("India bounds", tuple(round(v, 2) for v in ind.bounds), "parts", len(ind.geoms), flush=True)
    rivers = load_rivers_clean({i: records[i] for i in puzzle_ids})

    def dump(path, obj):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        print(path, os.path.getsize(path) // 1024, "KB", flush=True)

    dump(os.path.join(ROOT, "data", "world.json"),
         {"type": "FeatureCollection", "features": world_features})
    dump(os.path.join(ROOT, "data", "shapes.json"),
         {"type": "FeatureCollection", "features": shape_features})
    dump(os.path.join(ROOT, "data", "borders.json"),
         {"neighbours": neighbours, "lengthKm": lengths, "seams": seams})
    dump(os.path.join(ROOT, "data", "rivers.json"), rivers)

    # Sanity: LAEA km vs pyproj at Beijing, China-centred.
    lon0, lat0 = 100.0, 40.0
    R = 6371.0088
    lon, lat = 116.4074, 39.9042
    phi = math.radians(lat); lam = math.radians(lon)
    phi0 = math.radians(lat0); lam0 = math.radians(lon0)
    dlam = lam - lam0
    cosc = math.sin(phi0) * math.sin(phi) + math.cos(phi0) * math.cos(phi) * math.cos(dlam)
    k = math.sqrt(2.0 / (1.0 + cosc))
    x = R * k * math.cos(phi) * math.sin(dlam)
    y = R * k * (math.cos(phi0) * math.sin(phi) - math.sin(phi0) * math.cos(phi) * math.cos(dlam))
    tr = Transformer.from_crs("EPSG:4326", "+proj=laea +lat_0=40 +lon_0=100 +units=km +datum=WGS84", always_xy=True)
    px, py = tr.transform(lon, lat)
    print(f"LAEA check Beijing  ours=({x:.2f},{y:.2f}) proj4=({px:.2f},{py:.2f}) d={math.hypot(x-px,y-py):.3f} km")


if __name__ == "__main__":
    main()
