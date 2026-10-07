# China's 14 Land Neighbours — Interactive Puzzle

Classroom web puzzle for ESL students (~ages 8–14).

## Play online

**Live:** https://littlewondersesl-max.github.io/china-neighbours-game/

Open the link in Chrome (desktop) — nothing to install.

## Run locally (optional)

```bash
git clone https://github.com/littlewondersesl-max/china-neighbours-game.git
cd china-neighbours-game
python3 -m http.server 8765
```

Open **http://localhost:8765/** in Chrome. Prefer HTTP over `file://` (the game loads JSON with `fetch`).

## How to play

1. **Example map** (right): interactive SVG overview — large names where they fit; hover small countries (Nepal, Bhutan, etc.) to see their names.
2. **Trays** (top & bottom): 7 + 7 neighbour thumbnails.
3. Drag a country onto the dark map (China is fixed at true geographic scale).
4. Click it, then drag a **corner handle** to resize. Watch the **%** by the cursor (true size vs China — independent of zoom). Aim for **100%**.
5. Place it where it belongs. Near-correct size (±7%) and place (~180 km) soft-snaps and locks.
6. A **fact card** opens (themed background, EN + 中文). Capital shown with a **red dot** on the silhouette. Click outside / × / Close to dismiss.
7. Click a locked country anytime to reopen its facts (it stays locked).
8. **Scroll** to zoom (centred on cursor). **Drag empty map**, **right-drag**, or **Space+drag** to pan — zoom out / pan north to see the top of Russia.
9. When all 14 are locked (and the last fact card is closed), the reward video plays.

## Snap tolerances

- **Size:** ±7% → snaps to 100%.
- **Position:** centre within ~180 km → locks.

## Projection

LAEA `lat_0=40`, `lon_0=100`, km. Natural Earth CHN outline (Taiwan with China).

## Limits

- Desktop mouse recommended.
- Tiny countries (e.g. Bhutan) are very small at 100%; zoom in to place them.
- Facts are light geography / culture / food only.
