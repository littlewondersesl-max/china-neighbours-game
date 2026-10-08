#!/usr/bin/env python3
"""Build a zoom pyramid of shaded-relief JPEGs from ETOPO 2022.

The page keeps Natural Earth's low-resolution relief as the fast first paint.
These tiles add the same hypsometric colour, with a sharper hillshade, and
only where the elevation actually varies. Flat deep ocean is left out; the
client keeps using the low-resolution image there.

Levels (512px tiles, y = 0 at the north edge):

  z=1  32 x 16    about 2.4 km/px   from the global 60 arc-second grid
  z=2  64 x 32    about 1.2 km/px   60 arc-second, replaced by 15 arc-second on land
  z=3  128 x 64   about 0.6 km/px   15 arc-second land and coast only

Downloads (not committed) land in /tmp/etopo by default:

  https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif
  https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/15s/15s_surface_elev_gtif/ETOPO_2022_v1_15s_<NW>_surface.tif

Citation: NOAA National Centers for Environmental Information. 2022:
ETOPO 2022 15 Arc-Second Global Relief Model. DOI: 10.25921/fd45-gt74.
Public domain.

    python3 tools/build_terrain.py
    python3 tools/build_terrain.py --levels 1,2
    python3 tools/build_terrain.py --bbox 80,26,89,32 --levels 3

Re-running skips tiles that are already on disk. Pass --force to rebuild.
"""
from __future__ import annotations

import argparse
import base64
import math
import multiprocessing as mp
import os
import subprocess
import threading
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RELIEF_PATH = os.path.join(ROOT, "assets", "relief.jpg")
TILE = 512
PAD = 16
URL60 = (
    "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/"
    "60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif"
)
URL15 = (
    "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/"
    "15s/15s_surface_elev_gtif/"
)
DEG60 = 1 / 60
DEG15 = 1 / 240

MEM = None
RELIEF = None
SRC15 = {}
LOCK15 = threading.Lock()


def grid(z):
    cols = 32 << (z - 1)
    rows = cols // 2
    return cols, rows, 360 / cols


def tile_name(north, west):
    ns = f"N{north:02d}" if north >= 0 else f"S{-north:02d}"
    ew = f"E{west:03d}" if west >= 0 else f"W{-west:03d}"
    return f"ETOPO_2022_v1_15s_{ns}{ew}_surface.tif"


def ensure_memmap(mem_path, tif_path):
    shape = (10800, 21600)
    need = shape[0] * shape[1] * 4
    if os.path.exists(mem_path) and os.path.getsize(mem_path) == need:
        return
    import tifffile
    if not os.path.exists(tif_path) or os.path.getsize(tif_path) < 1_000_000:
        os.makedirs(os.path.dirname(mem_path), exist_ok=True)
        print("downloading ETOPO 60 arc-second grid", flush=True)
        subprocess.check_call(["curl", "-fL", "--retry", "3", "-C", "-", "-o", tif_path, URL60])
    print("unpacking 60 arc-second grid", flush=True)
    arr = tifffile.imread(tif_path)
    mm = np.memmap(mem_path, dtype="float32", mode="w+", shape=shape)
    mm[:] = arr
    mm.flush()
    del arr, mm


def open_mem(mem_path):
    return np.memmap(mem_path, dtype="float32", mode="r", shape=(10800, 21600))


def init_worker(mem_path, relief_path):
    global MEM, RELIEF
    MEM = open_mem(mem_path)
    RELIEF = Image.open(relief_path).convert("RGB")


def _bilinear(src, out_h, out_w):
    if src.shape == (out_h, out_w):
        return src.astype(np.float32, copy=False)
    y = (np.arange(out_h, dtype=np.float32) + 0.5) * src.shape[0] / out_h - 0.5
    x = (np.arange(out_w, dtype=np.float32) + 0.5) * src.shape[1] / out_w - 0.5
    y0 = np.clip(np.floor(y).astype(np.int32), 0, src.shape[0] - 1)
    x0 = np.clip(np.floor(x).astype(np.int32), 0, src.shape[1] - 1)
    y1 = np.clip(y0 + 1, 0, src.shape[0] - 1)
    x1 = np.clip(x0 + 1, 0, src.shape[1] - 1)
    fy = (y - y0).astype(np.float32)[:, None]
    fx = (x - x0).astype(np.float32)[None, :]
    top = src[y0][:, x0] * (1 - fx) + src[y0][:, x1] * fx
    bot = src[y1][:, x0] * (1 - fx) + src[y1][:, x1] * fx
    return top * (1 - fy) + bot * fy


def read_rect(mem, north, west, south, east, src_deg, origin_north, origin_west):
    """North-up window. `north`/`west` are the edges of the requested rectangle."""
    h = mem.shape[0]
    w = mem.shape[1]
    r0f = (origin_north - north) / src_deg
    r1f = (origin_north - south) / src_deg
    c0f = (west - origin_west) / src_deg
    c1f = (east - origin_west) / src_deg
    r0 = int(math.floor(r0f))
    r1 = int(math.ceil(r1f))
    c0 = int(math.floor(c0f))
    c1 = int(math.ceil(c1f))
    r0c = max(0, r0)
    r1c = min(h, r1)
    if r1c <= r0c or c1 <= c0:
        return np.zeros((2, 2), np.float32)
    # Longitude may wrap. Stitch columns into one contiguous block.
    width = c1 - c0
    block = np.empty((r1c - r0c, width), np.float32)
    x = c0
    out_x = 0
    while x < c1:
        xs = x % w
        span = min(w - xs, c1 - x)
        block[:, out_x:out_x + span] = mem[r0c:r1c, xs:xs + span]
        x += span
        out_x += span
    if r0 < 0 or r1 > h:
        full = np.zeros((r1 - r0, width), np.float32)
        full[r0c - r0:r0c - r0 + block.shape[0]] = block
        block = full
    # Crop to the exact edge window in source-pixel units, then the caller resizes.
    return block, r0, c0, r0f, c0f, r1f, c1f


def sample_dem(mem, north, west, south, east, out_h, out_w, src_deg, origin_north, origin_west):
    got = read_rect(mem, north, west, south, east, src_deg, origin_north, origin_west)
    if isinstance(got, np.ndarray):
        return got
    block, r0, c0, r0f, c0f, r1f, c1f = got
    # Pixel slice that matches [north,south] x [west,east] inside `block`.
    y0 = r0f - r0
    y1 = r1f - r0
    x0 = c0f - c0
    x1 = c1f - c0
    y0i = max(0, int(math.floor(y0)))
    y1i = min(block.shape[0], int(math.ceil(y1)))
    x0i = max(0, int(math.floor(x0)))
    x1i = min(block.shape[1], int(math.ceil(x1)))
    if y1i <= y0i or x1i <= x0i:
        return np.zeros((out_h, out_w), np.float32)
    return _bilinear(block[y0i:y1i, x0i:x1i], out_h, out_w)


def sample60(north, west, south, east, out_h, out_w):
    return sample_dem(MEM, north, west, south, east, out_h, out_w, DEG60, 90, -180)


def load_15(path):
    import tifffile
    arr = tifffile.imread(path).astype(np.float32, copy=False)
    return arr


def cell_of(lat, lon):
    north = int(math.ceil((lat - 1e-8) / 15.0) * 15)
    north = min(90, max(-75, north))
    west = int(math.floor(lon / 15.0) * 15)
    if west >= 180:
        west -= 360
    if west < -180:
        west += 360
    return north, west


def sample15_wrapped(tiles_dir, north, west, south, east, out_h, out_w):
    """15 arc-second sample. Splits a window that crosses the antimeridian."""
    if west < -180:
        span = east - west
        left = -180 - west
        left_w = min(out_w - 1, max(1, int(round(left / span * out_w))))
        a = sample15_files(tiles_dir, north, west + 360, south, 180, out_h, left_w)
        b = sample15_files(tiles_dir, north, -180, south, east, out_h, out_w - left_w)
        if a is None or b is None:
            return None
        return np.concatenate([a, b], axis=1)
    if east > 180:
        span = east - west
        left = 180 - west
        left_w = min(out_w - 1, max(1, int(round(left / span * out_w))))
        a = sample15_files(tiles_dir, north, west, south, 180, out_h, left_w)
        b = sample15_files(tiles_dir, north, -180, south, east - 360, out_h, out_w - left_w)
        if a is None or b is None:
            return None
        return np.concatenate([a, b], axis=1)
    return sample15_files(tiles_dir, north, west, south, east, out_h, out_w)


def sample15_files(tiles_dir, north, west, south, east, out_h, out_w):
    """Sample the 15 arc-second tiles that cover this rectangle. Missing files yield NaN."""
    # Walk 15° cells overlapped by the rectangle. Longitude may sit slightly outside ±180.
    west_n = west
    east_n = east
    lats = []
    lat = south
    while lat < north - 1e-6:
        lats.append(lat)
        lat += 5
    lats.append((south + north) / 2)
    lats.append(north - 1e-4)
    cells = {}
    lon = west_n
    while lon < east_n:
        for lat in lats:
            lon_w = lon
            while lon_w < -180:
                lon_w += 360
            while lon_w >= 180:
                lon_w -= 360
            cells[cell_of(max(-89, min(89, lat)), lon_w)] = True
        lon += 5
    # Build a small mosaic at 15s resolution covering the request, then resize.
    src_h = max(2, int(round((north - south) / DEG15)))
    src_w = max(2, int(round((east - west) / DEG15)))
    mosaic = np.full((src_h, src_w), np.nan, np.float32)
    for (cn, cw) in cells:
        name = tile_name(cn, cw)
        path = os.path.join(tiles_dir, name)
        if not os.path.exists(path) or os.path.getsize(path) < 1_000_000:
            continue
        with LOCK15:
            arr = SRC15.get(path)
            if arr is None:
                arr = load_15(path)
                if len(SRC15) > 8:
                    SRC15.clear()
                SRC15[path] = arr
        # This file's north/west edges.
        # Place into mosaic.
        file_south = cn - 15
        file_east = cw + 15
        row0 = int(round((cn - north) / DEG15))
        col0 = int(round((cw - west) / DEG15))
        # overlap of mosaic [0,src_h) x [0,src_w) with file placed at row0,col0
        r_src0 = max(0, -row0)
        c_src0 = max(0, -col0)
        r_dst0 = max(0, row0)
        c_dst0 = max(0, col0)
        r_copy = min(arr.shape[0] - r_src0, src_h - r_dst0)
        c_copy = min(arr.shape[1] - c_src0, src_w - c_dst0)
        if r_copy > 0 and c_copy > 0:
            mosaic[r_dst0:r_dst0 + r_copy, c_dst0:c_dst0 + c_copy] = arr[r_src0:r_src0 + r_copy, c_src0:c_src0 + c_copy]
        del file_south, file_east
    if np.isnan(mosaic).all():
        return None
    # Fill gaps from the edges so a missing neighbour does not punch a hole.
    if np.isnan(mosaic).any():
        fill = np.nanmean(mosaic)
        if not np.isfinite(fill):
            return None
        mosaic = np.where(np.isnan(mosaic), fill, mosaic)
    return _bilinear(mosaic, out_h, out_w)


def hillshade(elev, north, dlat, dlon):
    h, w = elev.shape
    lat = north - (np.arange(h, dtype=np.float64) + 0.5) * dlat
    dx = np.clip(dlon * 111320.0 * np.cos(np.radians(lat)), 40.0, None)
    dy = dlat * 110540.0
    gx = np.empty_like(elev)
    gy = np.empty_like(elev)
    gx[:, 1:-1] = (elev[:, 2:] - elev[:, :-2]) / (2 * dx[:, None])
    gx[:, 0] = (elev[:, 1] - elev[:, 0]) / dx
    gx[:, -1] = (elev[:, -1] - elev[:, -2]) / dx
    gy[1:-1, :] = (elev[2:, :] - elev[:-2, :]) / (2 * dy)
    gy[0, :] = (elev[1, :] - elev[0, :]) / dy
    gy[-1, :] = (elev[-1, :] - elev[-2, :]) / dy
    slope = np.pi / 2 - np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    az = math.radians(360 - 315 + 90)
    zen = math.radians(45)
    hs = np.sin(zen) * np.sin(slope) + np.cos(zen) * np.cos(slope) * np.cos(az - aspect)
    return np.clip(hs, 0, 1).astype(np.float32)


def colorize(elev_core, hs_core, west, south, east, north, dlon):
    rgb = relief_rgb(west, south, east, north, hs_core.shape[1], hs_core.shape[0])
    sigma = max(0.8, (360 / 8192) / dlon * 0.9)
    blur = np.asarray(
        Image.fromarray((hs_core * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(radius=sigma)),
        dtype=np.float32,
    ) / 255.0
    detail = hs_core - blur
    boost = np.clip(1.0 + detail * 2.8, 0.28, 3.0)
    out = rgb * boost[..., None]
    snow = np.clip((elev_core - 4800) / 1600, 0, 1) * np.clip((hs_core - blur) * 1.4, 0, 1) * 0.35
    white = np.array([238, 242, 244], np.float32)
    out = out * (1 - snow[..., None]) + white * snow[..., None]
    return np.clip(out, 0, 255).astype(np.uint8)


def relief_rgb(west, south, east, north, width, height):
    image = RELIEF
    W, H = image.size
    canvas = Image.new("RGB", (width, height))
    spans = []
    if east > 180:
        spans.append((west, 180, west, 180))
        spans.append((-180, east - 360, 180, east))
    elif west < -180:
        spans.append((west + 360, 180, west, -180))
        spans.append((-180, east, -180, east))
    else:
        spans.append((west, east, west, east))
    lon_span = max(1e-6, east - west)
    for src0, src1, dest0, dest1 in spans:
        if src1 <= src0 or dest1 <= dest0:
            continue
        s0 = (src0 + 180) / 360 * W
        s1 = (src1 + 180) / 360 * W
        top = (90 - north) / 180 * H
        bot = (90 - south) / 180 * H
        crop = image.crop((s0, top, max(s0 + 1, s1), max(top + 1, bot)))
        dw = max(1, int(round((dest1 - dest0) / lon_span * width)))
        dh = height
        crop = crop.resize((dw, dh), Image.Resampling.BILINEAR)
        dx = int(round((dest0 - west) / lon_span * width))
        canvas.paste(crop, (dx, 0))
    return np.asarray(canvas, dtype=np.float32)


def render_array(elev, north_edge, west_edge, dlat, dlon):
    """elev includes PAD pixels around the TILE core. Returns core RGB or None to skip."""
    core = elev[PAD:-PAD, PAD:-PAD]
    finite = np.isfinite(core)
    if finite.mean() < 0.5:
        return None
    work = np.where(np.isfinite(elev), elev, -5000).astype(np.float32)
    mx = float(core[finite].max())
    mn = float(core[finite].min())
    if mx < -250 and (mx - mn) < 180:
        return None
    hs = hillshade(work, north_edge, dlat, dlon)
    hs_core = hs[PAD:-PAD, PAD:-PAD]
    south = north_edge - elev.shape[0] * dlat
    east = west_edge + elev.shape[1] * dlon
    core_north = north_edge - PAD * dlat
    core_west = west_edge + PAD * dlon
    core_south = south + PAD * dlat
    core_east = east - PAD * dlon
    return colorize(core, hs_core, core_west, core_south, core_east, core_north, dlon)


def job_bounds(z, x, y):
    cols, rows, deg = grid(z)
    north = 90 - y * deg
    west = -180 + x * deg
    d = deg / TILE
    north_p = north + PAD * d
    west_p = west - PAD * d
    south_p = north - deg - PAD * d
    east_p = west + deg + PAD * d
    return north, west, deg, d, north_p, west_p, south_p, east_p


def write_tile(path, rgb):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(rgb, "RGB").save(path, format="JPEG", quality=78, optimize=False)


def render_60(job):
    z, x, y, out_root, force = job
    path = os.path.join(out_root, str(z), str(x), f"{y}.jpg")
    if not force and os.path.exists(path) and os.path.getsize(path) > 400:
        return None
    north, west, deg, d, north_p, west_p, south_p, east_p = job_bounds(z, x, y)
    side = TILE + 2 * PAD
    elev = sample60(north_p, west_p, south_p, east_p, side, side)
    rgb = render_array(elev, north_p, west_p, d, d)
    if rgb is None:
        return None
    write_tile(path, rgb)
    return z, x, y


def render_15(job, tiles_dir, out_root, force, min_elev):
    z, x, y = job
    path = os.path.join(out_root, str(z), str(x), f"{y}.jpg")
    if not force and os.path.exists(path) and os.path.getsize(path) > 400 and z == 3:
        return False
    north, west, deg, d, north_p, west_p, south_p, east_p = job_bounds(z, x, y)
    side = TILE + 2 * PAD
    elev = sample15_wrapped(tiles_dir, north_p, west_p, south_p, east_p, side, side)
    if elev is None:
        elev = sample60(north_p, west_p, south_p, east_p, side, side)
    core = elev[PAD:-PAD, PAD:-PAD]
    if float(np.nanmax(core)) < min_elev:
        return False
    rgb = render_array(elev, north_p, west_p, d, d)
    if rgb is None:
        return False
    write_tile(path, rgb)
    return True


def land_cells(mem):
    found = []
    for i, north in enumerate(range(90, -90, -15)):
        r0, r1 = i * 900, (i + 1) * 900
        for j, west in enumerate(range(-180, 180, 15)):
            c0, c1 = j * 900, (j + 1) * 900
            if float(mem[r0:r1:2, c0:c1:2].max()) > 0:
                found.append((north, west))
    return found


def download_15(cells, tiles_dir, workers):
    os.makedirs(tiles_dir, exist_ok=True)

    def one(cell):
        north, west = cell
        name = tile_name(north, west)
        path = os.path.join(tiles_dir, name)
        if os.path.exists(path) and os.path.getsize(path) > 1_000_000:
            return name
        url = URL15 + name
        tmp = path + ".part"
        subprocess.check_call(["curl", "-fL", "--retry", "3", "-C", "-", "-o", tmp, url])
        os.replace(tmp, path)
        return name

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(one, c) for c in cells]
        done = 0
        for fut in as_completed(futures):
            fut.result()
            done += 1
            if done % 10 == 0 or done == len(cells):
                print(f"15s tiles {done}/{len(cells)}", flush=True)


def cells_for_jobs(jobs):
    cells = set()
    for z, x, y in jobs:
        cols, rows, deg = grid(z)
        north = 90 - y * deg
        west = -180 + x * deg
        lat = north - deg / 2
        lon = west + deg / 2
        cells.add(cell_of(lat, lon))
        # Neighbours too, so a tile on the cell edge can hillshade across it.
        cells.add(cell_of(min(89, lat + deg), lon))
        cells.add(cell_of(max(-89, lat - deg), lon))
        cells.add(cell_of(lat, lon + deg if lon + deg < 180 else lon + deg - 360))
        cells.add(cell_of(lat, lon - deg if lon - deg >= -180 else lon - deg + 360))
    return sorted(cells)


def interesting_tiles(mem, z, min_elev):
    cols, rows, deg = grid(z)
    step = max(2, int(deg * 60 / 40))
    jobs = []
    for y in range(rows):
        north = 90 - y * deg
        r0 = max(0, int((90 - north) * 60))
        r1 = min(10800, int((90 - (north - deg)) * 60) + 1)
        for x in range(cols):
            west = -180 + x * deg
            c0 = int(round((west + 180) * 60)) % 21600
            c1 = int(round((west + deg + 180) * 60))
            if c1 <= 21600:
                slab = mem[r0:r1:step, c0:c1:step]
            else:
                slab = np.concatenate([
                    mem[r0:r1:step, c0::step],
                    mem[r0:r1:step, :c1 - 21600:step],
                ], axis=1)
            if slab.size and float(slab.max()) > min_elev:
                jobs.append((z, x, y))
    return jobs


def write_index(out_root):
    levels = []
    for z in (1, 2, 3):
        cols, rows, _deg = grid(z)
        bits = bytearray((cols * rows + 7) // 8)
        count = 0
        folder = os.path.join(out_root, str(z))
        if os.path.isdir(folder):
            for xname in os.listdir(folder):
                if not xname.isdigit():
                    continue
                x = int(xname)
                xdir = os.path.join(folder, xname)
                if not os.path.isdir(xdir):
                    continue
                for yname in os.listdir(xdir):
                    if not yname.endswith(".jpg"):
                        continue
                    y = int(yname[:-4])
                    if not (0 <= x < cols and 0 <= y < rows):
                        continue
                    i = y * cols + x
                    bits[i >> 3] |= 1 << (i & 7)
                    count += 1
        levels.append({
            "z": z,
            "cols": cols,
            "rows": rows,
            "count": count,
            "bits": base64.b64encode(bytes(bits)).decode("ascii"),
        })
        print(f"z={z} tiles {count}", flush=True)
    import json
    doc = {
        "tile": TILE,
        "baseWidth": 8192,
        "baseHeight": 4096,
        "levels": levels,
        "source": "NOAA NCEI ETOPO 2022",
        "doi": "10.25921/fd45-gt74",
    }
    path = os.path.join(out_root, "index.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(doc, f, separators=(",", ":"))
    print("wrote", path, flush=True)


def parse_bbox(text):
    if not text:
        return None
    lon0, lat0, lon1, lat1 = (float(p) for p in text.split(","))
    return min(lon0, lon1), min(lat0, lat1), max(lon0, lon1), max(lat0, lat1)


def inside_bbox(z, x, y, bbox):
    if not bbox:
        return True
    cols, rows, deg = grid(z)
    north = 90 - y * deg
    west = -180 + x * deg
    south = north - deg
    east = west + deg
    return not (east < bbox[0] or west > bbox[2] or north < bbox[1] or south > bbox[3])


def main():
    parser = argparse.ArgumentParser(description="Build ETOPO shaded-relief tiles.")
    parser.add_argument("--memmap", default="/tmp/etopo/elev60.f32")
    parser.add_argument("--dem60", default="/tmp/etopo/etopo60s.tif")
    parser.add_argument("--tiles15", default="/tmp/etopo/15s")
    parser.add_argument("--out", default=os.path.join(ROOT, "assets", "terrain"))
    parser.add_argument("--levels", default="1,2,3")
    parser.add_argument("--bbox", default="")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--downloads", type=int, default=6)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    levels = [int(p) for p in args.levels.split(",") if p]
    bbox = parse_bbox(args.bbox)
    ensure_memmap(args.memmap, args.dem60)
    mem = open_mem(args.memmap)
    os.makedirs(args.out, exist_ok=True)

    if any(z in levels for z in (1, 2)):
        jobs = []
        for z in (1, 2):
            if z not in levels:
                continue
            found = interesting_tiles(mem, z, -250 if z == 1 else -200)
            found = [j for j in found if inside_bbox(*j, bbox)]
            print(f"z={z} candidates {len(found)}", flush=True)
            jobs.extend((z, x, y, args.out, args.force) for z, x, y in found)
        if jobs:
            with ProcessPoolExecutor(
                max_workers=args.workers,
                mp_context=mp.get_context("fork"),
                initializer=init_worker,
                initargs=(args.memmap, RELIEF_PATH),
            ) as pool:
                done = 0
                wrote = 0
                for result in pool.map(render_60, jobs, chunksize=4):
                    done += 1
                    if result:
                        wrote += 1
                    if done % 100 == 0 or done == len(jobs):
                        print(f"coarse {done}/{len(jobs)} wrote {wrote}", flush=True)

    if 3 in levels or 2 in levels:
        fine = interesting_tiles(mem, 3, -40)
        fine = [j for j in fine if inside_bbox(*j, bbox)]
        # Also upgrade the z=2 tiles that cover the same land.
        upgrade = []
        if 2 in levels:
            parents = set()
            for _z, x, y in fine:
                parents.add((2, x // 2, y // 2))
            upgrade = [j for j in sorted(parents) if inside_bbox(*j, bbox)]
        need = fine + upgrade
        if need and not bbox:
            # Global run downloads every 15° cell that contains land.
            cells = land_cells(mem)
        else:
            cells = cells_for_jobs([(3, x, y) for _z, x, y in need] or fine)
        print(f"15s cells {len(cells)}, z=3 tiles {len(fine)}, z=2 upgrades {len(upgrade)}", flush=True)
        if cells:
            download_15(cells, args.tiles15, args.downloads)
        global MEM, RELIEF
        MEM = mem
        RELIEF = Image.open(RELIEF_PATH).convert("RGB")
        wrote = 0
        todo = [(3, x, y) for _z, x, y in fine] + upgrade
        for i, job in enumerate(todo, 1):
            z = job[0]
            # z=2 upgrades always rewrite from the 15s grid when --force, and
            # also when the file was only the coarse pass. Track via mtime later;
            # here, skip z=3 when present and always refresh z=2 if a sibling
            # z=3 tile was written in this run. Cheap rule: skip existing z=3;
            # overwrite z=2 unless --force is false and a .15 marker exists.
            marker = os.path.join(args.out, str(z), str(job[1]), f"{job[2]}.15")
            force = args.force or (z == 2 and not os.path.exists(marker))
            if z == 3 and not args.force and os.path.exists(os.path.join(args.out, "3", str(job[1]), f"{job[2]}.jpg")):
                wrote += 1
            elif render_15(job, args.tiles15, args.out, force, -40 if z == 3 else -80):
                wrote += 1
                open(marker, "w").close()
            if i % 50 == 0 or i == len(todo):
                print(f"fine {i}/{len(todo)} wrote {wrote}", flush=True)
        # Markers are local resume state, not part of the site.
        for dirpath, _dirnames, filenames in os.walk(args.out):
            for name in filenames:
                if name.endswith(".15"):
                    os.remove(os.path.join(dirpath, name))

    write_index(args.out)


if __name__ == "__main__":
    main()
