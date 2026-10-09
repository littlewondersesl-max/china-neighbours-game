#!/usr/bin/env python3
"""Second pass for card photos the strict fetch missed or that were the wrong subject.

Keeps the same square files: assets/cards/<iso>/{animal,currency,landmark,dish}.jpg
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import fetch_cards as fc

ROOT = fc.ROOT
SLOTS = ("animal", "currency", "landmark", "dish")

# Force these even if a file is already there.
REPLACE = {
    ("CHN", "currency"): "China 1 yuan coin renminbi",
    ("LAO", "animal"): "Asian elephant Elephas maximus portrait",
    ("LVA", "animal"): "white wagtail Motacilla alba",
    ("MMR", "animal"): "Asian elephant Elephas maximus",
    ("THA", "animal"): "Asian elephant portrait no people",
    ("SYR", "animal"): "Arabian horse head portrait photo",
    ("EGY", "animal"): "steppe eagle Aquila nipalensis",
    ("EGY", "currency"): "Egypt pound coin",
    ("RUS", "currency"): "Russia 10 ruble coin bi-metallic",
    ("BGR", "landmark"): "Rila Monastery exterior Bulgaria",
    ("EST", "currency"): "Estonia 1 euro coin",
    ("LTU", "currency"): "Lithuania 1 euro coin",
    ("IND", "currency"): "India 5 rupee coin",
    ("NOR", "currency"): "Norway 20 krone coin",
}

BLOCK = (
    "emperor", "jahangir", "painting", "yuan dynasty", "bulbul", "african elephant",
    "loxodonta", "starter kit", "banknote", "godolphin", "seymour", "ussr", "soviet",
    "fresco", "mahout", "keeper", "manuscript", "miniature", "illustration",
    "zoo sign", "plush", "toy", "logo", "coat of arms", "stamp", "poster",
    "ongal", "russian ruble", "ussr", "soviet",
)

# A filename must contain one of these, when set. Stops "white bulbul" matching "white wagtail".
# Currency filenames must name that country (or its own unit), so a Russian coin
# cannot fill in for Belarus just because both say "ruble".
CURRENCY_NEED = {
    "AFG": ("afghan", "afghani"), "ARE": ("emirates", "uae", "dirham"),
    "ARM": ("armenia", "armenian", "dram"), "AZE": ("azerbaijan", "manat"),
    "BGD": ("bangladesh", "taka"), "BGR": ("bulgaria", "bulgarian"),
    "BLR": ("belarus", "belarusian"), "BRN": ("brunei",), "BTN": ("bhutan", "ngultrum"),
    "CHN": ("china", "chinese", "yuan", "renminbi"), "EGY": ("egypt", "egyptian"),
    "EST": ("estonia", "estonian"), "FIN": ("finland", "finnish"),
    "GEO": ("georgia", "georgian", "lari"), "GRC": ("greece", "greek"),
    "IDN": ("indonesia", "rupiah"), "IND": ("india", "indian"),
    "IRN": ("iran", "iranian"), "IRQ": ("iraq", "iraqi"),
    "ISR": ("israel", "shekel"), "JOR": ("jordan",),
    "KAZ": ("kazakhstan", "kazakh", "tenge"), "KGZ": ("kyrgyz",),
    "KHM": ("cambodia", "riel"), "KOR": ("korea", "won"),
    "KWT": ("kuwait",), "LAO": ("laos", "lao", "kip"),
    "LBN": ("lebanon", "lebanese"), "LTU": ("lithuania", "lithuanian"),
    "LVA": ("latvia", "latvian"), "MMR": ("myanmar", "kyat"),
    "MNG": ("mongolia", "tugrik", "togrog"), "MYS": ("malaysia", "ringgit"),
    "NOR": ("norway", "norwegian"), "NPL": ("nepal", "nepali", "nepalese"),
    "OMN": ("oman", "omani"), "PAK": ("pakistan",),
    "PNG": ("papua", "kina"), "POL": ("poland", "polish", "zloty", "złoty"),
    "PRK": ("korea",), "PSX": ("shekel", "israel"),
    "QAT": ("qatar",), "RUS": ("russia", "russian"),
    "SAU": ("saudi",), "SYR": ("syria", "syrian"),
    "THA": ("thailand", "thai", "baht"), "TJK": ("tajik",),
    "TKM": ("turkmen",), "TLS": ("timor",),
    "TUR": ("turkey", "türkiye", "turkish"), "UKR": ("ukraine", "ukrainian", "hryvnia"),
    "UZB": ("uzbek",), "VNM": ("vietnam", "vietnamese", "dong"),
    "YEM": ("yemen", "yemeni"),
}

NEED = {
    ("LAO", "animal"): ("elephant", "elephas"),
    ("MMR", "animal"): ("elephant", "elephas"),
    ("THA", "animal"): ("elephant", "elephas"),
    ("LVA", "animal"): ("wagtail", "motacilla"),
    ("SYR", "animal"): ("horse", "arab"),
    ("EGY", "animal"): ("eagle", "aquila"),
    ("CHN", "currency"): ("yuan", "renminbi", "jiao"),
    ("EGY", "currency"): ("coin", "piastre", "pound"),
    ("RUS", "currency"): ("ruble", "rouble", "rubl"),
    ("BGR", "landmark"): ("rila",),
    ("EST", "currency"): ("euro", "coin", "sent", "cent"),
    ("LTU", "currency"): ("euro", "coin", "cent", "sent"),
    ("IND", "currency"): ("rupee", "coin"),
    ("NOR", "currency"): ("krone", "krone", "coin"),
    ("PAK", "landmark"): ("k2", "karakoram", "chogori", "godwin"),
    ("VNM", "landmark"): ("long", "halong", "ha-long"),
    ("OMN", "dish"): ("oman", "omani"),
    ("YEM", "animal"): ("leopard", "panthera"),
}


def need_for(iso, slot, label):
    if (iso, slot) in NEED:
        return NEED[(iso, slot)]
    words = fc.tokens(label)
    drop = {"white", "european", "asian", "arabian", "persian", "golden", "brown", "giant", "wild", "national"}
    words -= drop
    return tuple(words) if words else tuple(fc.tokens(label))


def loose_score(title, info, slot, label):
    if not info:
        return -1
    mime = info.get("mime") or ""
    if not mime.startswith("image/") or "svg" in mime:
        return -1
    if (info.get("width") or 0) < 500 or (info.get("height") or 0) < 400:
        return -1
    if not fc.license_ok(info):
        return -1
    name = title.lower().replace("_", " ")
    if any(b in name for b in BLOCK):
        return -1
    if any(b in name for b in fc.SLOT_BAD.get(slot, ())):
        return -1
    s = 8
    have = fc.tokens(title)
    overlap = (fc.tokens(label) | fc.tokens(title)) & have
    s += 5 * len(fc.tokens(label) & have)
    if slot == "currency" and "coin" in name:
        s += 6
    if slot == "currency" and "coin" not in name and "note" in name:
        return -1
    if "night" in name or "silhouette" in name:
        s -= 3
    return s


def candidates(iso, slot, query, label):
    titles = []
    titles.extend(fc.search_titles(query, 8))
    titles.extend(fc.search_titles(label, 6))
    if slot == "currency":
        titles.extend(fc.search_titles(label + " coin", 4))
    seen = []
    for t in titles:
        if t not in seen:
            seen.append(t)
    infos = fc.imageinfos(seen[:14])
    need = need_for(iso, slot, label)
    ranked = []
    for t in seen[:14]:
        sc = loose_score(t, infos.get(t), slot, label)
        if sc < 13:
            continue
        name = t.lower()
        if any(b in name for b in ("ambulance", "soldier", "warship", "casualty")):
            continue
        if slot == "currency" and "coin" not in name:
            continue
        if slot == "currency":
            country_need = CURRENCY_NEED.get(iso, ())
            if country_need and not any(n in name for n in country_need):
                continue
            if iso == "RUS" and any(b in name for b in ("ussr", "soviet")):
                continue
        if need and not any(n in name for n in need):
            continue
        ranked.append((sc, t, infos[t]))
    ranked.sort(key=lambda x: -x[0])
    return ranked


def save_one(iso, slot, query, label, credits, known, weak):
    dest = os.path.join(ROOT, "assets", "cards", iso.lower(), slot + ".jpg")
    rel = f"assets/cards/{iso.lower()}/{slot}.jpg"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        ranked = candidates(iso, slot, query, label)
    except Exception as e:
        print("  ERR", iso, slot, e)
        weak.append(f"{iso} {slot}: {e}")
        return False
    if not ranked:
        print("  MISS", iso, slot, query)
        weak.append(f"{iso} {slot}: still no photo for “{label}”")
        return False
    import statistics
    from io import BytesIO
    from PIL import Image
    for sc, title, info in ranked[:4]:
        url = info.get("thumburl") or info.get("url")
        try:
            im = Image.open(BytesIO(fc.download(url)))
            im = fc.square_crop(im)
            sample = list(im.resize((24, 24)).convert("L").getdata())
            mean = statistics.fmean(sample)
            if mean < 28 or mean > 248:
                print(f"  skip flat {iso} {slot} {mean:.0f}")
                continue
            im.save(dest, "JPEG", quality=86, optimize=True, progressive=True)
        except Exception as e:
            print("  SAVE", iso, slot, e)
            continue
        credits[:] = [c for c in credits if c.get("path") != rel]
        credits.append(fc.credit_row(rel, title, info, slot))
        known.add(rel)
        print(f"  {iso} {slot} [{sc}] {title.replace('File:', '')[:78]}")
        return True
    weak.append(f"{iso} {slot}: downloads failed for “{label}”")
    return False


def main():
    shapes = json.load(open(os.path.join(ROOT, "data", "shapes.json"), encoding="utf-8"))
    by_iso = {f["properties"]["iso"]: f for f in shapes["features"]}
    cards_path = os.path.join(ROOT, "data", "cards.json")
    cards = json.load(open(cards_path, encoding="utf-8")) if os.path.exists(cards_path) else {}
    credits = fc.load_credits()
    known = {c["path"] for c in credits}
    weak = []
    slot_index = {"animal": (4, 6), "currency": (7, 9), "landmark": (10, 12), "dish": (13, 15)}
    for iso, row in fc.SEED.items():
        for slot in SLOTS:
            dest = os.path.join(ROOT, "assets", "cards", iso.lower(), slot + ".jpg")
            force = (iso, slot) in REPLACE
            if os.path.exists(dest) and os.path.getsize(dest) > 8000 and not force:
                continue
            if force and os.path.exists(dest):
                os.remove(dest)
            a, b = slot_index[slot]
            label = row[a]
            query = REPLACE.get((iso, slot), row[b])
            save_one(iso, slot, query, label, credits, known, weak)
        # refresh image paths on the card record
        if iso in cards:
            images = {}
            for slot in SLOTS:
                rel = f"assets/cards/{iso.lower()}/{slot}.jpg"
                if os.path.exists(os.path.join(ROOT, rel)) and os.path.getsize(os.path.join(ROOT, rel)) > 8000:
                    images[slot] = rel
            cards[iso]["images"] = images
    with open(os.path.join(ROOT, "data", "credits.json"), "w", encoding="utf-8") as f:
        json.dump(credits, f, ensure_ascii=False)
    with open(cards_path, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    fc.write_attributions(credits)
    with open(os.path.join(ROOT, "data", "image-notes.json"), "w", encoding="utf-8") as f:
        json.dump(weak, f, ensure_ascii=False, indent=2)
    print("remaining notes", len(weak))
    fc.make_sheets()


if __name__ == "__main__":
    main()
