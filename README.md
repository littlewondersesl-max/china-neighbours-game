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

1. **Globe.** Drag to spin it. Click **Asia** (Russia is included with Asia here, because most of its land is there and it is one of China’s neighbours). Other continents show “Coming soon / 即将推出”.
2. **Asia.** Choose a game. **Neighbours · 邻国拼图:** click a country. If it has land neighbours, its puzzle opens. If it is an island with no land border, a short note says so. **Build Asia · 拼出亚洲:** type any Asian country (English or Chinese). It is placed, named, on an empty map of Asia. The other countries are nameless shapes. A shape locks only when it touches the chain of countries already placed. **Enter country name · 输入国名** asks for the capital and, if both are right, fills that country in even when it is not connected yet (islands included). **Skip cards · 跳过卡片** keeps the border flash and skips the four cards. **Back · 返回** goes to the globe.
3. **Puzzle.** The centre country stays fixed at its true size. Neighbours start in the tray (one row, or two when there are more than seven). China’s tray is the familiar 7 + 7 order.
4. Drag a country onto the map. Drag a **corner** to resize. The **%** by the cursor is that piece’s own true size (100% is correct), not a comparison with the centre country.
5. Near the right size (**±7%**) and the right place (**about 180 km**), it snaps, locks, and a bright line runs along the border it shares. Then a four-card sequence opens.
6. **Scroll** zooms on the cursor. **Drag empty map**, **right-drag**, or **Space+drag** pans. **Reveal map · 显示地图** opens the finished example, and closes again. It stays closed until you ask for it.
7. Click a locked country to open its cards again. **Esc** closes the cards.
8. When every neighbour is locked and the cards are closed, a short ending plays (about 4–5 seconds a sentence). **Back to map · 返回地图** or **Esc** returns to the finished map. The puzzle is not reset.

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
