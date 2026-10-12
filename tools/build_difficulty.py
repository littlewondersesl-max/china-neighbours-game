"""Difficulty tables for the globe games, from data/master.json + data/borders.json.

Neighbours game (data/difficulty-neighbours.json), per centre country c with land neighbours N:
  n      = log(1+|N|) / log(15)                         more neighbours to place
  short  = mean_N 1 / (1 + L_cn / 150 km)               short or tiny shared borders are hard to see
  small  = mean_N 1 / (1 + sqrt(area_n) / 300 km)        small pieces are fiddly
  wiggle = mean_N clip((P_n / (2 sqrt(pi A_n)) - 1) / 3)  ragged outlines (isoperimetric excess)
  alike  = max over neighbour pairs of shape similarity  (area ratio x aspect x compactness)
  score  = 100 * (0.30 n + 0.25 short + 0.15 small + 0.15 wiggle + 0.15 alike)

Build-the-continent game (data/difficulty-build.json), per country k in the continent:
  inland = 1 - coast share of the outline (landlocked interior is harder than coast or edge)
  tiny   = 1 - percentile rank of area                   tiny countries are hard
  nbs    = 0.8 for islands (must type the name), else min(|N|, 10) / 12
  plain  = 1 - distinctiveness, distinctiveness = clip((|log aspect| + wiggle) / 1.5)
  score  = 100 * (0.25 inland + 0.35 tiny + 0.15 nbs + 0.25 plain)

Levels 1..5 (Easy, Medium, Tricky, Hard, Expert) are score quintiles within each table.
"""
import json, math, itertools
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
master = json.loads((ROOT / "data/master.json").read_text())
borders = json.loads((ROOT / "data/borders.json").read_text())
C = {c["iso"]: c for c in master["countries"]}
NB = borders["neighbours"]
LEN = borders["lengthKm"]
KM = 111.195

def polys(c):
    g = c["geometry"]
    return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]

def stats(iso):
    c = C[iso]
    lat0 = (c["bbox"][1] + c["bbox"][3]) / 2
    k = math.cos(math.radians(lat0))
    per = 0.0
    for poly in polys(c):
        for ring in poly:
            for (a, b), (x, y) in zip(ring, ring[1:]):
                per += math.hypot((x - a) * k, y - b) * KM
    w = (c["bbox"][2] - c["bbox"][0]) * k * KM
    h = (c["bbox"][3] - c["bbox"][1]) * KM
    area = max(c["areaKm2"], 1)
    wig = min(1, max(0, (per / (2 * math.sqrt(math.pi * area)) - 1) / 3))
    return {"area": area, "per": per, "aspect": max(w, 1) / max(h, 1), "wiggle": wig}

S = {iso: stats(iso) for iso in C}

def blen(a, b):
    return LEN.get(f"{a}|{b}") or LEN.get(f"{b}|{a}") or 0

def similar(a, b):
    A, B = S[a], S[b]
    return (math.exp(-abs(math.log(A["area"] / B["area"])))
            * math.exp(-abs(math.log(A["aspect"] / B["aspect"])))
            * math.exp(-3 * abs(A["wiggle"] - B["wiggle"])))

LEVELS = [
    {"id": 1, "en": "Easy", "zh": "简单", "color": "#3fbf5f"},
    {"id": 2, "en": "Medium", "zh": "中等", "color": "#a6d43a"},
    {"id": 3, "en": "Tricky", "zh": "有点难", "color": "#f2c230"},
    {"id": 4, "en": "Hard", "zh": "难", "color": "#f07a2e"},
    {"id": 5, "en": "Expert", "zh": "高手", "color": "#a347d1"},
]

def bucket(rows):
    order = sorted(rows, key=lambda r: rows[r]["score"])
    for i, iso in enumerate(order):
        rows[iso]["level"] = 1 + min(4, i * 5 // len(order))
    return rows

def r3(x): return round(x, 3)

def neighbours_table(continent):
    rows = {}
    for iso, c in C.items():
        if c["continent"] != continent or not c.get("puzzle"): continue
        nbs = NB.get(iso) or []
        if not nbs: continue
        f = {
            "n": math.log(1 + len(nbs)) / math.log(15),
            "short": sum(1 / (1 + blen(iso, o) / 150) for o in nbs) / len(nbs),
            "small": sum(1 / (1 + math.sqrt(S[o]["area"]) / 300) for o in nbs) / len(nbs),
            "wiggle": sum(S[o]["wiggle"] for o in nbs) / len(nbs),
            "alike": max((similar(a, b) for a, b in itertools.combinations(nbs, 2)), default=0),
        }
        score = 100 * (0.30 * f["n"] + 0.25 * f["short"] + 0.15 * f["small"] + 0.15 * f["wiggle"] + 0.15 * f["alike"])
        rows[iso] = {"score": round(score, 1), "neighbours": len(nbs), **{k: r3(v) for k, v in f.items()}}
    return bucket(rows)

def build_table(continent):
    isos = [i for i, c in C.items() if c["continent"] == continent and c.get("puzzle")]
    areas = sorted(S[i]["area"] for i in isos)
    rows = {}
    for iso in isos:
        nbs = NB.get(iso) or []
        shared = sum(blen(iso, o) for o in nbs)
        coast = max(0.0, 1 - shared / max(S[iso]["per"], 1))
        rank = areas.index(S[iso]["area"]) / max(1, len(areas) - 1)
        distinct = min(1, (abs(math.log(S[iso]["aspect"])) + S[iso]["wiggle"]) / 1.5)
        f = {
            "inland": 1 - coast,
            "tiny": 1 - rank,
            "nbs": 0.8 if not nbs else min(len(nbs), 10) / 12,
            "plain": 1 - distinct,
        }
        score = 100 * (0.25 * f["inland"] + 0.35 * f["tiny"] + 0.15 * f["nbs"] + 0.25 * f["plain"])
        rows[iso] = {"score": round(score, 1), "neighbours": len(nbs), **{k: r3(v) for k, v in f.items()}}
    return bucket(rows)

def big_five(rows):
    return sorted(rows, key=lambda r: -rows[r]["score"])[:5]

conts = ["Asia"]
nb = {"levels": LEVELS, "formula": __doc__.split("\n\n")[1].strip(), "continents": {}}
bd = {"levels": LEVELS, "formula": __doc__.split("\n\n")[2].strip(), "continents": {}}
for cont in conts:
    t = neighbours_table(cont)
    nb["continents"][cont] = {"bigFive": big_five(t), "countries": t}
    bd["continents"][cont] = {"countries": build_table(cont)}
(ROOT / "data/difficulty-neighbours.json").write_text(json.dumps(nb, ensure_ascii=False, indent=1))
(ROOT / "data/difficulty-build.json").write_text(json.dumps(bd, ensure_ascii=False, indent=1))
for name, d in (("neighbours", nb), ("build", bd)):
    for cont, v in d["continents"].items():
        rows = v["countries"]; o = sorted(rows, key=lambda r: rows[r]["score"])
        fmt = lambda l: ", ".join(f"{C[i]['name']} ({rows[i]['score']})" for i in l)
        print(name, cont, len(rows), "\n easiest:", fmt(o[:5]), "\n hardest:", fmt(o[::-1][:5]))
        if "bigFive" in v: print(" bigFive", v["bigFive"])
