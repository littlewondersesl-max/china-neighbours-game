# Land Neighbours — classroom puzzle

A browser puzzle for ESL students (about ages 8–14). It opens on a globe, zooms into Asia, then becomes a drag-and-drop map of one country’s **land neighbours**. Facts stay on geography, animals, food, and everyday culture.

**Live:** https://littlewondersesl-max.github.io/china-neighbours-game/

## Run locally

```bash
git clone https://github.com/littlewondersesl-max/china-neighbours-game.git
cd china-neighbours-game
python3 -m http.server 8765
```

Open **http://localhost:8765/** in Chrome. The page loads JSON and pictures with `fetch`, so use HTTP rather than opening the file directly. Paths are relative, so the same folder also works under `/china-neighbours-game/` on GitHub Pages.

## How to play

1. **Globe.** Drag to spin it. Scroll or pinch to zoom, centered on the pointer. Click **Asia** (Russia is included with Asia here, because most of its land is there and it is one of China’s neighbours). Other continents show “Coming soon”. The same scroll and pinch zoom works on the Asia map.
2. **Asia.** Choose a game. **Neighbours:** click a country. If it has land neighbours, its puzzle opens. If it is an island with no land border, a short note says so. **Build Continents:** type any Asian country. It is placed, named, on an empty map of Asia. The title stays Build Continents, and the subtitle names the continent (Asia). The other countries are nameless shapes. A shape locks only when it touches the chain of countries already placed. **Enter country name** asks for the capital and, if both are right, fills that country in even when it is not connected yet (islands included). **Skip cards** keeps the border flash and skips the four cards. **Back** goes to the globe.
3. **Language.** A small control at the top right chooses a main language and an optional supplementary language, shown smaller underneath. The default is English with no second language. English and Chinese (Simplified) are included. The choice is remembered in this browser. Country names and capitals are accepted in the languages that are turned on.
4. **Puzzle.** The centre country stays fixed at its true size. Neighbours start in the tray (one row, or two when there are more than seven). China’s tray is the familiar 7 + 7 order.
5. Drag a country onto the map. Drag a **corner** to resize. The **%** by the cursor is that piece’s own true size (100% is correct), not a comparison with the centre country.
6. Near the right size (**±7%**) and the right place (**about 180 km**), it snaps, locks, and a bright line runs along the border it shares. The four cards open that first time only. A name is drawn on the country when it fits inside the shape at the current zoom. If it does not fit, the name stays hidden until you hover, which draws a dashed line out to a small name tab. Zooming in and out shows and hides those names again.
7. **Scroll** or a pinch zooms on the cursor. **Drag the map or a placed country** to pan. Right-drag and Space+drag still pan too. A drag never opens cards. **Reveal map** opens the finished example, and closes again. It stays closed until you ask for it.
8. **Cards** (with a supplementary language, **Cards · 卡片**) arms one more look. The next click on a placed country opens its cards, and the button turns off. **Esc** or the button again cancels before that click. **Esc** also closes cards that are already open.
9. When every neighbour is locked and the cards are closed, a short ending plays (about 4–5 seconds a sentence). **Back to map** or **Esc** returns to the finished map. The puzzle is not reset.

## The four cards

1. The country’s shape with terrain, a red dot on the capital, and a sentence saying where that capital is.
2. The same shape, with a light racing around the whole outline (islands included), and the length of the land border with the centre country, in kilometres.
3. The flag, labelled “Flag of …”.
4. Four square pictures: national animal, currency, a real landmark, and a popular dish. Every country uses the same frame, crop, and label style.

## Swapping a picture for a watercolor

Pictures live in one folder per country, with fixed names:

```
assets/cards/npl/animal.jpg
assets/cards/npl/currency.jpg
assets/cards/npl/landmark.jpg
assets/cards/npl/dish.jpg
```

Replace the file (a square picture works best; the page frames it). You do not need to change any code. Flags are `assets/flags/<iso>.svg`. Sources and licences are in `ATTRIBUTIONS.md`.

## Map notes

- Outlines are Natural Earth 1:10m, drawn as vectors so they stay crisp when you zoom. India’s Andaman and Nicobar Islands are included.
- Terrain is Natural Earth’s shaded relief, sampled inside each country.
- Projection is Lambert azimuthal equal-area. The China puzzle stays centred at 40°N, 100°E, as before. Other centres use the same kind of projection, recentred so neighbours are not stretched.
- Taiwan, Hong Kong, and Macao are drawn as part of China. Cyprus is drawn as one island.
- A river is drawn only when that river actually crosses from one puzzle country into another.
- Singapore is not given a land piece: the causeway to Malaysia is not a shared land border in this data. Countries with no land neighbours (Japan, the Philippines, Sri Lanka, the Maldives, Bahrain, Cyprus, Singapore) stay on the globe with a short note.

## Rebuild the data

Optional. Needs Python, Pillow, Shapely, pyproj, and pyshp, plus the Natural Earth files the scripts expect.

```bash
python3 tools/build_geo.py
python3 tools/fetch_cards.py
python3 tools/fill_gaps.py
```
