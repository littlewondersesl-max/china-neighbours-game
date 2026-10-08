#!/usr/bin/env python3
"""Simplify Natural Earth 10m coastlines for the shake-to-see-the-coast hint.

Reads ne_10m_coastline.shp (public domain). Writes data/coast.json: line
strings in longitude/latitude, detailed enough to follow the real shore and
small enough to load with the puzzle. Lakes that Natural Earth files on the
coastline layer (the Caspian, for example) stay in. Country borders do not,
because this layer is the shoreline only.

Look for the shapefile in COAST_SHP, then /tmp/ne-data/coast/.
"""
from __future__ import annotations

import json
import os

import shapefile
from shapely.geometry import box, shape
from shapely.ops import unary_union

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_SHP = "/tmp/ne-data/coast/ne_10m_coastline.shp"


def main():
    shp = os.environ.get("COAST_SHP", DEFAULT_SHP)
    # Asia-centred puzzles can see Europe, Africa, Australia, and the
    # Pacific edge of Russia. The Americas and Antarctica are outside that view.
    region = unary_union([
        box(-25, -42, 180, 84),
        box(-180, 50, -166, 72),
    ])
    sf = shapefile.Reader(shp)
    lines = []
    for sr in sf.iterShapeRecords():
        rank = sr.record.as_dict().get("scalerank")
        if rank is None or rank > 5:
            continue
        geom = shape(sr.shape.__geo_interface__)
        if geom.is_empty or not geom.intersects(region):
            continue
        geom = geom.intersection(region)
        parts = [geom] if geom.geom_type == "LineString" else list(getattr(geom, "geoms", []))
        for part in parts:
            if part.geom_type != "LineString":
                continue
            simple = part.simplify(0.04, preserve_topology=False)
            if simple.length < 0.18 or simple.geom_type != "LineString":
                continue
            chunk = []
            for x, y in simple.coords:
                point = [round(x, 2), round(y, 2)]
                if chunk and point == chunk[-1]:
                    continue
                if chunk and (abs(point[0] - chunk[-1][0]) > 25 or abs(point[1] - chunk[-1][1]) > 25):
                    if len(chunk) >= 2:
                        lines.append(chunk)
                    chunk = [point]
                else:
                    chunk.append(point)
            if len(chunk) >= 2:
                lines.append(chunk)

    path = os.path.join(ROOT, "data", "coast.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(lines, fh, separators=(",", ":"))
    points = sum(len(line) for line in lines)
    print(f"{path} lines={len(lines)} points={points} KB={os.path.getsize(path) // 1024}")


if __name__ == "__main__":
    main()
