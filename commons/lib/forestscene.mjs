// forestscene.mjs — the First Arrival forest as a static SVG scene, for the Headquarters canvas.
// Renders the real 28x22 map from ./forestmap.mjs (verbatim copy of commons/public/arrive.js) in the
// walk's own pixel language: the same grass checker, path, water, trees, house, gate, store and coins
// as drawTile/drawStore/drawCoin in arrive.js, frozen at the rest frame (no bob, no shimmer, no walking).
// The three stop figures are schematic paused villagers — the walk draws real sprites via figureAt and
// this scene cannot — so the header says "paused" and nobody mistakes them for live people.
// Mirrors gardenscene.mjs's shape: one exported function returning an SVG string.
import { FOREST_MAP, FOREST_W, FOREST_H, FOREST_TILE, FOREST_PALETTE, FOREST_STORE } from './forestmap.mjs';

const HEADER = 36;
const MARGIN = 190; // grass bands either side of the map, so the scene's aspect matches the HQ forest tile (~2.13:1)
const W = MARGIN * 2 + FOREST_W * FOREST_TILE; // 828
const H = HEADER + FOREST_H * FOREST_TILE;     // 388

const r = (x, y, w, h, f, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${e}/>`;
let seed = 20261107; // fixed seed: the margin trees never move between deploys
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0, seed / 4294967296);

// A tree, exactly as arrive.js drawTile draws it (trunk + two leaf rects; leaf colour by (tx*7+ty*13)%3).
function treeGlyph(px, py, tx, ty) {
  const leaf = (tx * 7 + ty * 13) % 3 ? FOREST_PALETTE.leaf1 : FOREST_PALETTE.leaf2;
  return r(px + 6, py + 9, 4, 7, FOREST_PALETTE.trunk)
    + r(px + 2, py, 12, 10, leaf) + r(px, py + 3, 16, 5, leaf);
}

// A stop figure, paused: the mistFigure shape from arrive.js (head, body, two legs) in the stop's colour,
// over the rest-frame glow. Schematic, not the walk's sprite — see the header note above.
const STOP_COLORS = { 1: '#e9c46a', 2: '#7cd6b4', 3: '#b48cff' };
function stopFigure(px, py, n) {
  const color = STOP_COLORS[n] || '#e9c46a';
  return `<ellipse cx="${px + 8}" cy="${py + 14}" rx="11" ry="5" fill="rgba(242,166,90,0.28)"/>`
    + r(px + 4, py - 2, 6, 5, '#f0e6d2') + r(px + 3, py + 3, 8, 8, color)
    + r(px + 3, py + 11, 3, 4, '#2a2536') + r(px + 8, py + 11, 3, 4, '#2a2536');
}

export function forestScene({ label = true } = {}) {
  const G = FOREST_PALETTE;
  const ox = MARGIN, oy = HEADER; // map origin inside the scene
  let s = `<svg viewBox="0 0 ${W} ${H}" class="rv-scene-svg forest-scene" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">`;
  // Header strip: the name lives here, outside the map floor (2026-11-07 review).
  if (label) {
    s += `<rect width="${W}" height="${HEADER}" fill="#141a3e"/><rect x="0" y="${HEADER - 3}" width="${W}" height="4" fill="#15121b"/>`;
    s += `<text x="14" y="24" font-size="16" fill="#e9dfcd" font-family="ui-monospace,monospace" letter-spacing="1">THE FOREST &amp; VILLAGE</text>`;
    s += `<text x="${W - 14}" y="24" font-size="12" fill="#9fb0d0" font-family="ui-monospace,monospace" text-anchor="end">paused · click to walk in</text>`;
  }
  // Margin bands: forest floor with deterministic trees, drawn first so the map paints over any spill.
  s += r(0, HEADER, W, FOREST_H * FOREST_TILE, G.grass2);
  for (let ty = 0; ty < FOREST_H; ty++) {
    for (const band of [0, MARGIN + FOREST_W * FOREST_TILE]) {
      for (let mx = 0; mx < MARGIN; mx += 46) {
        if (rnd() < 0.45) continue;
        const px = band + mx + Math.floor(rnd() * 20), py = HEADER + ty * FOREST_TILE + Math.floor(rnd() * 6);
        s += treeGlyph(px, py, Math.floor(px / FOREST_TILE), ty);
      }
    }
  }
  // The map itself, tile by tile, in row-major order like the walk (later tiles paint over earlier spill).
  const coins = [], stops = [];
  for (let y = 0; y < FOREST_H; y++) {
    for (let x = 0; x < FOREST_W; x++) {
      const c = FOREST_MAP[y][x];
      const px = ox + x * FOREST_TILE, py = oy + y * FOREST_TILE;
      s += r(px, py, FOREST_TILE, FOREST_TILE, (x + y) % 2 ? G.grass1 : G.grass2);
      if (c === 'p') s += r(px, py, FOREST_TILE, FOREST_TILE, G.path) + r(px, py, FOREST_TILE, 2, G.pathEdge);
      if (c === 'w') s += r(px, py, FOREST_TILE, FOREST_TILE, G.water) + r(px, py + 6, FOREST_TILE, 2, '#28445a');
      if (c === 'T') s += treeGlyph(px, py, x, y);
      if (c === 'H') {
        s += r(px - 6, py - 8, FOREST_TILE + 12, FOREST_TILE + 10, 'rgba(242,204,143,0.12)'); // hearth-light spill
        s += r(px - 3, py - 2, FOREST_TILE + 6, 18, '#3a3147'); // body, grown
        s += r(px - 6, py - 7, FOREST_TILE + 12, 7, '#6b5a3f'); // wide warm roof
        s += r(px - 6, py - 7, FOREST_TILE + 12, 2, '#8a7a5c');
        s += r(px + 6, py + 7, 5, 9, '#17131d'); // door
        s += r(px - 1, py + 3, 4, 4, '#f2cc8f') + r(px + 13, py + 3, 4, 4, '#f2cc8f'); // two lit windows
        s += r(px + 12, py + 9, 2, 2, G.coin); // the lamp by the door
      }
      if (c === 'G') {
        s += r(px + 1, py, 3, FOREST_TILE, G.gate) + r(px + 12, py, 3, FOREST_TILE, G.gate);
        for (let i = 2; i < FOREST_TILE; i += 4) s += r(px, py + i, FOREST_TILE, 2, G.gateBar);
      }
      if (c === 'C') coins.push([px, py]);
      if (c === '1' || c === '2' || c === '3') stops.push([px, py, +c]);
    }
  }
  // Second pass, like the walk: coins (rest frame, no bob), the village store, then the paused stop figures.
  for (const [px, py] of coins) s += r(px + 5, py + 5, 6, 6, G.coin) + r(px + 6, py + 6, 2, 2, G.coinRim);
  {
    const px = ox + FOREST_STORE.x * FOREST_TILE, py = oy + FOREST_STORE.y * FOREST_TILE;
    s += r(px - 2, py - 6, FOREST_TILE * 2 + 4, 20, '#2e2639'); // body, two tiles wide
    s += r(px - 4, py - 10, FOREST_TILE * 2 + 8, 6, '#57493a'); // roof
    for (let i = 0; i < 4; i++) s += r(px - 2 + i * 9, py - 5, 9, 3, i % 2 ? '#8a5a2b' : '#c9a15b'); // awning
    s += r(px + 3, py + 2, 5, 5, '#f2cc8f'); // lit window
    s += r(px + FOREST_TILE + 4, py + 4, 6, 10, '#17131d'); // door
    s += r(px + FOREST_TILE - 2, py - 9, 4, 4, G.coin); // the coin sign
  }
  for (const [px, py, n] of stops) s += stopFigure(px, py, n);
  s += '</svg>';
  return s;
}
