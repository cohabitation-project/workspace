/**
 * roomscene.mjs — any room opened into a 2D top-down pixel scene, in the Headquarters visual language
 * (box/rect furniture, themed floor, title + wall placards, figures you can walk). Geoffrey, 2026-11-07:
 * "keep it designed like our rooms … desks with the tools you can see on them … a door you walk out of."
 *
 * One engine, data-driven: each room's teams/<room>/STUDIOS.json gives a theme and a list of stations, each with
 * a prop (the furniture drawn on its desk), an icon by its name, a slot (where it sits), and the tools/providers it
 * holds. The three wall placards are the room's real jobs-for-humans, wish list, and open agent jobs. Members present
 * stand at their spot; the viewer can walk (roomview.js). Nothing simulated: empty lists say so.
 */
import { esc } from '../public/md.js';

const O = '#15121b';
const r = (x, y, w, h, f, e = '') => `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="${f}" ${e}/>`;
const box = (x, y, w, h, f, top) => r(x, y, w, h, O) + r(x + 2, y + 2, w - 4, h - 4, f) + (top ? r(x + 2, y + 2, w - 4, Math.min(6, h / 3), top) : '');
const plant = (x, y) => box(x, y + 16, 16, 14, '#8a5a34', '#a8703f') + box(x - 3, y, 22, 18, '#3f8f4f', '#57b066');
const deskLong = (x, y, w, c = '#8a5a34', t = '#b07a45') => box(x, y, w, 26, c, t);

// ---- little colour icons (by each station name and in its panel) ----
const ICON = {
  image: '<rect x="3" y="5" width="18" height="14" rx="2" fill="#0e1130" stroke="#7aa2ff" stroke-width="2.5"/><circle cx="8" cy="10" r="2" fill="#ffd36b"/><path d="M5 17l5-5 3 3 3-2 4 4z" fill="#7aa2ff"/>',
  video: '<circle cx="9" cy="7" r="3" fill="none" stroke="#dc8aa8" stroke-width="2.5"/><circle cx="15" cy="7" r="3" fill="none" stroke="#dc8aa8" stroke-width="2.5"/><rect x="4" y="10" width="13" height="9" rx="2" fill="#dc8aa8"/><path d="M17 13l4-2v7l-4-2z" fill="#dc8aa8"/>',
  sound: '<rect x="9" y="3" width="6" height="11" rx="3" fill="#7ad0a8"/><path d="M6 12a6 6 0 0 0 12 0" fill="none" stroke="#7ad0a8" stroke-width="2.5"/><line x1="12" y1="18" x2="12" y2="21" stroke="#7ad0a8" stroke-width="2.5"/>',
  writing: '<rect x="6" y="4" width="10" height="5" rx="1" fill="#0e1130" stroke="#e8a33d" stroke-width="2"/><path d="M4 12h16l2 8H2z" fill="#e8a33d"/><rect x="8" y="14" width="8" height="2" fill="#0e1130"/>',
  research: '<circle cx="10" cy="10" r="6" fill="none" stroke="#7aa2ff" stroke-width="2.5"/><line x1="15" y1="15" x2="20" y2="20" stroke="#7aa2ff" stroke-width="3"/>',
  marketing: '<path d="M4 9v6l10 4V5z" fill="#dc8aa8"/><rect x="14" y="7" width="4" height="10" rx="2" fill="#dc8aa8"/><path d="M19 8l2-2M19 16l2 2M20 12h2" stroke="#dc8aa8" stroke-width="2" stroke-linecap="round"/>',
  content: '<rect x="3" y="5" width="18" height="12" rx="2" fill="#e8a33d"/><path d="M7 17l-2 3v-3z" fill="#e8a33d"/><line x1="7" y1="9" x2="17" y2="9" stroke="#0e1130" stroke-width="2"/><line x1="7" y1="13" x2="13" y2="13" stroke="#0e1130" stroke-width="2"/>',
  analysis: '<rect x="4" y="12" width="4" height="8" fill="#7ad0a8"/><rect x="10" y="7" width="4" height="13" fill="#7ad0a8"/><rect x="16" y="3" width="4" height="17" fill="#7ad0a8"/>',
  accounting: '<rect x="4" y="4" width="16" height="16" rx="2" fill="#e8a33d"/><line x1="8" y1="8" x2="16" y2="8" stroke="#0e1130" stroke-width="2"/><line x1="8" y1="12" x2="16" y2="12" stroke="#0e1130" stroke-width="2"/><line x1="8" y1="16" x2="13" y2="16" stroke="#0e1130" stroke-width="2"/>',
  systems: '<circle cx="6" cy="6" r="2.5" fill="#a89cff"/><circle cx="18" cy="6" r="2.5" fill="#a89cff"/><circle cx="12" cy="18" r="2.5" fill="#a89cff"/><path d="M6 6h12M6 6l6 12M18 6l-6 12" stroke="#a89cff" stroke-width="1.6"/>',
  library: '<rect x="4" y="4" width="4" height="16" fill="#c25a4a"/><rect x="9" y="4" width="4" height="16" fill="#6d8fd1"/><rect x="14" y="6" width="4" height="14" fill="#e0c36a"/>',
  circle: '<circle cx="12" cy="12" r="8" fill="none" stroke="#7ad0a8" stroke-width="2.5"/><circle cx="12" cy="4" r="2" fill="#7ad0a8"/><circle cx="20" cy="12" r="2" fill="#7ad0a8"/><circle cx="4" cy="12" r="2" fill="#7ad0a8"/><circle cx="12" cy="20" r="2" fill="#7ad0a8"/>',
  hardware: '<rect x="5" y="8" width="14" height="10" rx="1" fill="#8d99ae"/><rect x="8" y="3" width="8" height="5" fill="#6c7a89"/><circle cx="9" cy="13" r="1.6" fill="#0e1130"/><circle cx="15" cy="13" r="1.6" fill="#0e1130"/>',
  software: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12" stroke="#7ad0a8" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  desk: '<rect x="3" y="7" width="18" height="12" rx="2" fill="#8d99ae"/>',
};
const iconSvg = (key, x, y, s = 20) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 24 24">${ICON[key] || ICON.desk}</svg>`;

// ---- props: the furniture drawn on a station's desk, by prop name ----
const PROP = {
  image: (x, y) => deskLong(x, y + 22, 220) + box(x + 26, y, 30, 22, '#1d1a26', '#2a2632') + r(x + 54, y + 6, 10, 8, O) + r(x + 56, y + 8, 6, 4, '#7cd6b4') + box(x + 72, y - 4, 26, 24, '#e9e2d0') + box(x + 80, y - 10, 24, 22, '#d8d0c0') + r(x + 84, y - 6, 16, 2, '#e07a5f') + r(x + 84, y, 12, 2, '#81b29a') + box(x + 140, y - 6, 54, 30, '#22303a', '#2d3f4c') + r(x + 150, y + 4, 34, 2, '#7cd6b4') + plant(x - 30, y + 22),
  video: (x, y) => { let g = deskLong(x, y + 54, 250); g += box(x + 30, y, 54, 34, '#2f2a3a', '#3b3549') + r(x + 80, y + 6, 18, 10, O) + r(x + 82, y + 8, 14, 6, '#6c7a89') + box(x + 38, y + 8, 16, 16, '#1d1a26') + r(x + 42, y + 12, 8, 8, '#7cd6b4') + r(x + 54, y + 34, 4, 26, O) + r(x + 44, y + 58, 26, 4, O); g += `<rect x="${x + 108}" y="${y + 8}" width="44" height="18" rx="3" fill="#7a1d1d"/><text x="${x + 130}" y="${y + 21}" font-size="11" fill="#ffd9d9" text-anchor="middle" font-family="ui-monospace,monospace">ON AIR</text>`; g += r(x + 170, y, 4, 40, O) + box(x + 160, y + 34, 24, 30, '#3a3546', '#4a4458') + r(x + 154, y + 40, 36, 3, '#8d99ae') + r(x + 170, y + 64, 4, 20, O) + r(x + 160, y + 84, 24, 4, O); g += box(x + 200, y + 50, 30, 30, '#6b5a4a', '#8c7660') + box(x + 202, y + 28, 26, 22, '#6b5a4a', '#8c7660'); return g; },
  music: (x, y) => { let g = deskLong(x, y + 40, 260); g += box(x + 54, y, 60, 40, '#22303a', '#2d3f4c'); for (const [i, c] of [[0, '#7cd6b4'], [1, '#f0c27a'], [2, '#ff9b5c'], [3, '#7cd6b4'], [4, '#e07a5f']]) g += r(x + 64 + i * 10, y + 10 + (i % 2 ? 0 : 6), 5, 18 - (i % 2 ? 0 : 12), c); g += box(x + 28, y + 6, 18, 30, '#3a3546', '#4a4458') + box(x + 124, y + 6, 18, 30, '#3a3546', '#4a4458'); g += box(x + 36, y + 48, 96, 16, '#2f3e46', '#4a5a66'); for (let i = 0; i < 14; i++) g += r(x + 40 + i * 6.5, y + 51, 4, 8, '#cfd6df'); g += r(x + 150, y - 6, 8, 70, O) + r(x + 152, y - 4, 4, 66, '#6b4a30') + box(x + 140, y + 40, 30, 26, '#b9761c', '#d79a4a') + r(x + 152, y + 48, 8, 8, O); g += box(x - 30, y + 90, 30, 30, '#6b5a4a', '#8c7660') + box(x - 28, y + 68, 26, 22, '#6b5a4a', '#8c7660'); return g; },
  writing: (x, y) => { let g = deskLong(x, y + 34, 200); g += box(x + 56, y + 10, 56, 30, '#2f2a3a', '#3b3549'); for (let i = 0; i < 5; i++) for (let j = 0; j < 8; j++) g += r(x + 64 + j * 5, y + 24 + i * 3, 3, 2, '#cfd6df'); g += r(x + 70, y, 28, 14, '#e9e2d0') + r(x + 72, y + 2, 24, 2, '#c9b48e'); g += r(x + 20, y + 34, 8, 40, O) + box(x + 12, y + 64, 24, 16, '#6b5a4a', '#8c7660') + plant(x + 210, y + 34); return g; },
  research: (x, y) => { let g = deskLong(x, y + 30, 210); g += box(x + 10, y + 4, 26, 26, '#c25a4a') + box(x + 20, y - 2, 26, 26, '#6d8fd1') + box(x + 30, y + 2, 26, 24, '#e0c36a'); g += box(x + 120, y - 2, 54, 32, '#22303a', '#2d3f4c') + r(x + 130, y + 8, 34, 2, '#7cd6b4') + r(x + 130, y + 14, 24, 2, '#8d99ae'); g += `<circle cx="${x + 92}" cy="${y + 16}" r="10" fill="none" stroke="#cfd6df" stroke-width="3"/><line x1="${x + 99}" y1="${y + 23}" x2="${x + 108}" y2="${y + 32}" stroke="#cfd6df" stroke-width="4"/>`; g += plant(x + 196, y + 30); return g; },
  whiteboard: (x, y) => { let g = box(x, y, 120, 60, '#c9b48e'); for (const [a, b] of [[12, 12], [40, 20], [66, 10], [92, 24], [30, 40], [78, 44]]) g += r(x + a, y + b, 5, 5, '#e5534b'); g += `<path d="M${x + 14} ${y + 14} L${x + 42} ${y + 22} L${x + 68} ${y + 12} L${x + 94} ${y + 26} M${x + 42} ${y + 22} L${x + 32} ${y + 42} L${x + 80} ${y + 46}" stroke="#5a3a22" stroke-width="1.6" fill="none"/>`; g += deskLong(x + 18, y + 72, 90, '#6b5a4a', '#8c7660'); return g; },
  social: (x, y) => { let g = deskLong(x, y + 34, 220, '#6b5a4a', '#8c7660'); g += box(x + 16, y, 40, 30, '#22303a', '#2d3f4c') + r(x + 22, y + 8, 28, 3, '#7cd6b4') + r(x + 22, y + 16, 20, 3, '#dc8aa8'); g += box(x + 70, y + 6, 30, 24, '#3d85c6') + r(x + 76, y + 12, 18, 2, '#e9e2d0') + r(x + 76, y + 18, 12, 2, '#e9e2d0'); g += box(x + 120, y + 2, 34, 28, '#2f2a3a', '#3b3549') + r(x + 126, y + 10, 22, 3, '#e8a33d') + r(x + 126, y + 18, 16, 3, '#7cd6b4') + plant(x + 196, y + 34); return g; },
  chart: (x, y) => { let g = deskLong(x, y + 30, 200); g += box(x + 24, y - 6, 64, 36, '#22303a', '#2d3f4c'); for (const [i, h] of [[0, 8], [1, 16], [2, 12], [3, 22], [4, 18]]) g += r(x + 32 + i * 10, y + 24 - h, 6, h, '#7cd6b4'); g += box(x + 110, y + 2, 26, 20, '#8a5a34', '#b07a45') + r(x + 114, y + 7, 18, 2, '#e9e2d0') + r(x + 114, y + 12, 14, 2, '#e9e2d0') + plant(x + 182, y + 30); return g; },
  ledger: (x, y) => { let g = deskLong(x, y + 28, 200); g += box(x + 14, y, 50, 28, '#5d4a3a', '#7a6450') + r(x + 20, y + 6, 38, 2, '#e9e2d0') + r(x + 20, y + 12, 38, 2, '#e9e2d0') + r(x + 20, y + 18, 26, 2, '#e9e2d0'); for (const [i, c] of [[0, '#e8a33d'], [1, '#e8a33d'], [2, '#f0c27a']]) g += r(x + 92 + i * 12, y + 10 - i * 2, 10, 18 + i * 2, c); g += box(x + 140, y + 2, 26, 22, '#22303a') + r(x + 146, y + 9, 14, 2, '#7cd6b4') + plant(x + 182, y + 28); return g; },
  nodes: (x, y) => { let g = deskLong(x, y + 30, 200); g += box(x + 30, y - 6, 80, 36, '#22303a', '#2d3f4c'); const ns = [[x + 44, y + 6], [x + 92, y + 8], [x + 68, y + 22]]; g += `<path d="M${ns[0][0]} ${ns[0][1]} L${ns[1][0]} ${ns[1][1]} L${ns[2][0]} ${ns[2][1]} Z" stroke="#a89cff" stroke-width="1.6" fill="none"/>`; for (const [nx, ny] of ns) g += `<circle cx="${nx}" cy="${ny}" r="4" fill="#a89cff"/>`; g += plant(x + 182, y + 30); return g; },
  bookshelf: (x, y) => { let g = box(x, y, 150, 60, '#4a3221', '#6b4a30'); const sp = ['#b9761c', '#7cd6b4', '#c25a4a', '#6d8fd1', '#e0c36a', '#8f6bb3', '#5fae6e']; for (let row = 0; row < 2; row++) { let bx = x + 6; let n = 0; while (bx < x + 142) { const bw = 6 + (n % 3) * 2; const bh = 20 - (n % 2) * 4; g += r(bx, y + 6 + row * 27 + (22 - bh), bw, bh, sp[(n + row) % sp.length]); bx += bw + 2; n++; } g += r(x + 4, y + 28 + row * 27, 142, 3, '#2c1e14'); } return g; },
  chairs: (x, y) => { let g = ''; const cx = x + 84, cy = y + 42, rx = 82, ry = 52; for (let i = 0; i < 11; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 11; const sx = cx + Math.cos(a) * rx - 10, sy = cy + Math.sin(a) * ry - 9; g += box(sx, sy, 20, 18, '#6b5a4a', '#8c7660') + box(sx + 2, sy - 11, 16, 11, '#5d4a3a', '#7a6450'); } g += `<ellipse cx="${cx}" cy="${cy}" rx="${rx - 16}" ry="${ry - 12}" fill="none" stroke="#7a6450" stroke-width="2" stroke-dasharray="4 4"/>`; return g; },
  bench: (x, y) => { let g = box(x, y + 24, 200, 24, '#6b5a4a', '#8c7660'); g += box(x + 20, y, 44, 24, '#8d99ae') + box(x + 28, y - 6, 8, 8, '#6c7a89') + r(x + 42, y + 6, 14, 10, '#3d85c6'); for (const [i, c] of [[0, '#e5534b'], [1, '#f2cc8f'], [2, '#7cd6b4']]) g += r(x + 90 + i * 12, y + 10, 8, 14, c); g += box(x + 140, y + 2, 40, 22, '#3a3546', '#4a4458') + r(x + 146, y + 8, 28, 2, '#ff9b5c') + plant(x + 196, y + 24); return g; },
  terminal: (x, y) => { let g = deskLong(x, y + 32, 190, '#6b5a4a', '#8c7660'); g += box(x + 20, y - 6, 80, 38, '#0e1512', '#1c2a24'); for (let i = 0; i < 5; i++) g += r(x + 28, y + 2 + i * 6, 20 + (i % 3) * 14, 2.5, i % 2 ? '#7cd6b4' : '#4a9b8e'); g += box(x + 24, y + 36, 70, 12, '#2f3e46'); for (let i = 0; i < 12; i++) g += r(x + 28 + i * 5.5, y + 39, 3.5, 6, '#cfd6df'); g += plant(x + 172, y + 32); return g; },
};

// ---- theme per room: floor colours (a plank pattern) + wall + accent ----
const THEME = {
  arts: { f: '#7a5134', fd: '#5e3d27', fh: '#86593a', wall: '#5d3d26', accent: '#e8a33d' },
  outreach: { f: '#6a4256', fd: '#512f41', fh: '#7a4e63', wall: '#3a2230', accent: '#dc8aa8' },
  income: { f: '#8a6440', fd: '#6d4d30', fh: '#9a744e', wall: '#4a3526', accent: '#7cd6b4' },
  philosophy: { f: '#6e4a2c', fd: '#553a24', fh: '#7e5636', wall: '#4a3222', accent: '#c7b8ff' },
  rnd: { f: '#59606e', fd: '#474d59', fh: '#626a79', wall: '#3a3f49', accent: '#8d99ae' },
  general: { f: '#7a5134', fd: '#5e3d27', fh: '#86593a', wall: '#5d3d26', accent: '#e9c46a' },
};
const themeFor = (id) => THEME[id] || THEME.arts;

const stationLabel = (x, y, t, key, w) => `<g>${r(x, y, w, 30, '#17131d', 'rx="3" stroke="#0b090e" stroke-width="2"')}${iconSvg(key, x + 8, y + 5)}<text x="${x + 36}" y="${y + 21}" font-size="15" fill="#e9dfcd" font-family="ui-monospace,monospace" letter-spacing="1">${esc(t)}</text></g>`;

function placard(x, y, title, accent, hint) {
  let g = `<rect x="${x}" y="${y}" width="150" height="104" rx="4" fill="#20242c" stroke="#0b090e" stroke-width="2"/>`;
  g += `<rect x="${x}" y="${y}" width="150" height="24" rx="4" fill="${accent}"/><text x="${x + 10}" y="${y + 17}" font-size="12" fill="#14121a" font-family="ui-monospace,monospace" font-weight="bold">${esc(title)}</text>`;
  for (let i = 0; i < 3; i++) g += r(x + 12, y + 36 + i * 15, 110 - i * 16, 5, '#5a6473');
  g += `<text x="${x + 12}" y="${y + 96}" font-size="11" fill="#9aa4b4" font-family="ui-sans-serif">${esc(hint)}</text>`;
  return g;
}

// default floor spots for members without a chosen station
const DEFAULTS = [[470, 360], [560, 372], [650, 356], [400, 400], [720, 402], [520, 330]];
const workSpot = (slot) => ({ x: slot.px + 110, y: slot.py + 110 });

export function roomScene({ room, roomId, theme, hereCount, studios, present, figureHTML, meId, spotMap, library }) {
  const W = 1120, H = 720, wall = 84;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="rv-scene-svg" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<defs><pattern id="rv-floor-${esc(roomId)}" width="36" height="14" patternUnits="userSpaceOnUse"><rect width="36" height="14" fill="${theme.f}"/><rect y="13" width="36" height="1" fill="${theme.fd}"/><rect x="24" width="1" height="14" fill="${theme.fd}"/><rect width="36" height="2" fill="${theme.fh}"/></pattern></defs>
<rect width="${W}" height="${H}" fill="#120f17"/>
<rect x="0" y="0" width="${W}" height="${wall}" fill="${theme.wall}"/><rect x="0" y="${wall - 3}" width="${W}" height="4" fill="#2a1b10"/>
<rect x="0" y="${wall}" width="${W}" height="${H - wall}" fill="url(#rv-floor-${esc(roomId)})"/>
<rect class="rv-floor-hit" data-zone="floor" x="0" y="${wall}" width="${W}" height="${H - wall}" fill="transparent"/>
<g>${(() => { const nm = String(room.name); const fs = nm.length > 22 ? 10 : nm.length > 16 ? 13 : 15; const tw = Math.min(200, Math.max(150, nm.length * (fs * 0.62) + 20)); return `<rect x="26" y="20" width="${tw.toFixed(0)}" height="30" rx="3" fill="#17131d" stroke="#0b090e" stroke-width="2"/><text x="40" y="41" font-size="${fs}" fill="#e9dfcd" font-family="ui-monospace,monospace" letter-spacing="1">${esc(nm)}</text>`; })()}</g>`;

  const pl = [['meetings', 'MEETINGS', '#e9c46a', 'talks & sessions'], ['humanjobs', 'JOBS · HUMANS', '#7cd6b4', 'for review & real-world'], ['wishes', 'WISH LIST', theme.accent, 'tools we need'], ['aijobs', 'ROOM JOBS · AI', '#8d99ae', 'open work agents can take']];
  pl.forEach((p, i) => { const x = 212 + i * 158; s += `<a class="rv-hit" data-zone="list:${p[0]}" role="button" tabindex="0">${placard(x, 8, p[1], p[2], p[3])}</a>`; });

  s += `<a class="rv-hit" data-zone="door"><rect x="${W / 2 - 46}" y="${H - 26}" width="92" height="26" fill="#2a1b10"/><rect x="${W / 2 - 42}" y="${H - 24}" width="84" height="22" fill="#3a2a1a"/><text x="${W / 2}" y="${H - 8}" font-size="13" fill="#e9dfcd" text-anchor="middle" font-family="ui-monospace,monospace">↓ back to the Hall</text></a>`;

  for (const st of studios) {
    const slot = st.slot; if (!slot) continue;
    const draw = PROP[st.prop] || PROP.desk;
    s += `<a class="rv-hit" data-zone="studio:${esc(st.key)}" role="button" tabindex="0">${draw(slot.px, slot.py)}${stationLabel(slot.lx, slot.ly, st.title, st.icon || st.key, slot.lw)}</a>`;
  }

  // Philosophy is lined with shelves on every wall (Geoffrey 2026-11-07)
  if (roomId === 'philosophy') { for (const [bx, by] of [[30, 300], [30, 470], [980, 300], [980, 470], [470, 620], [630, 620], [30, 110], [980, 110]]) s += PROP.bookshelf(bx, by); }
  // every room's own library shelf (roots into the main Library) — a clickable bookshelf
  if (library) { s += `<a class="rv-hit" data-zone="library" role="button" tabindex="0">${PROP.bookshelf(475, 118)}${stationLabel(460, 184, library.label || 'Library', 'library', 220)}</a>`; }
  present.slice(0, 12).forEach((m, i) => {
    let p;
    if (typeof m.spot === 'string' && spotMap[m.spot]) p = spotMap[m.spot];
    else if (m.spot && Number.isFinite(m.spot.x)) p = m.spot;
    else p = { x: DEFAULTS[i % DEFAULTS.length][0], y: DEFAULTS[i % DEFAULTS.length][1] };
    const meCls = (meId && m.id === meId) ? ' rv-me' : '';
    s += `<g class="rv-figure${meCls}" data-member="${esc(m.id)}" transform="translate(${p.x} ${p.y})"><g class="rv-figbody">${figureHTML(m)}</g><g class="rv-figname" transform="translate(18 76)"><rect x="-30" y="0" width="60" height="18" rx="9" fill="#14121a"/><text x="0" y="13" font-size="11" fill="#eef0ff" text-anchor="middle" font-family="ui-sans-serif">${esc(m.name)}</text></g></g>`;
  });
  if (!present.length) s += `<text x="${W / 2}" y="400" font-size="14" fill="#8a7f70" text-anchor="middle" font-family="ui-sans-serif">Nobody is in this room right now. Walk in and it's yours.</text>`;

  s += '</svg>';
  return s;
}

const toolRow = (t, youTag) => `<div class="rv-tool"><strong>${esc(t.name)}</strong> ${youTag ? '<span class="rv-tag t-you">you can use</span>' : (t.status === 'have' ? '<span class="rv-tag t-have">have it</span>' : `<span class="rv-tag t-need">${esc(({ setup: 'free to add', account: 'needs an account', money: 'needs money', desktop: 'needs a workstation' })[t.status] || 'needed')}</span>`)}<span class="small muted">${esc(t.what || '')}</span></div>`;

function stationPanel(st) {
  const agent = (st.agent_tools || []).map((t) => toolRow(t, false)).join('') || '<p class="small muted">None in the Commons yet — see the wish list.</p>';
  const human = (st.human_tools || []).map((t) => toolRow(t, true)).join('') || '<p class="small muted">Nothing a human runs here yet.</p>';
  const use = st.use && st.use.href ? `<a class="rv-use" href="${esc(st.use.href)}">${esc(st.use.label || 'Open')} →</a>` : '';
  const provs = (st.providers || []).length
    ? `<h4>Ask a member</h4>${st.providers.map((p) => `<div class="rv-prov">${p.id ? `<a href="/m/${esc(p.id)}"><strong>${esc(p.name)}</strong></a>` : `<strong>${esc(p.name)}</strong>`}<span class="small muted">— ${esc(p.how || '')}</span></div>`).join('')}` : '';
  return `<section class="rv-panel" id="panel-studio:${esc(st.key)}" hidden><button class="rv-close" data-close>✕</button>
    <div class="rv-ph"><svg width="40" height="40" viewBox="0 0 24 24">${ICON[st.icon || st.key] || ICON.desk}</svg><h2>${esc(st.title)}</h2></div>
    <p class="rv-what">${esc(st.what || '')}</p>
    <h4>Tools for agents</h4>${agent}
    <h4>Tools for you</h4>${human}${use ? `<p>${use}</p>` : ''}${provs}</section>`;
}

const listPanel = (id, title, intro, items, emptyMsg, addHref) => `<section class="rv-panel" id="panel-list:${id}" hidden><button class="rv-close" data-close>✕</button>
  <h2>${esc(title)}</h2><p class="rv-what">${esc(intro)}</p>
  ${items.length ? `<ul class="rv-list">${items.join('')}</ul>` : `<p class="small muted">${esc(emptyMsg)}</p>`}
  ${addHref ? `<p><a class="rv-use" href="${esc(addHref)}">＋ Add</a></p>` : ''}</section>`;

export function roomBody({ room, roomId, studios, present, wishes, humanJobs, aiJobs, meetings = [], sessions = {}, library = null, libraryItems = [], figureHTML, me }) {
  const theme = themeFor(roomId);
  const spotMap = {}; for (const st of studios) if (st.slot) spotMap[st.key] = workSpot(st.slot);
  let who = present.slice();
  if (me && me.id && !who.some((p) => p.id === me.id)) who = [...who, { ...me, spot: me.spot || null }];
  const scene = roomScene({ room, roomId, theme, hereCount: who.length, studios, present: who, figureHTML, meId: me && me.id, spotMap, library });
  const stationPanels = studios.map((st) => stationPanel(st)).join('');
  const wishItems = wishes.map((w) => `<li><a href="/wishlist#${esc(w.id)}">${esc(w.title)}</a>${w.cost ? ` <span class="small muted">${esc(w.cost)}</span>` : ''}</li>`);
  const humanItems = humanJobs.map((t) => `<li><strong>${esc(t.title)}</strong>${t.reward ? ` <span class="rv-tag t-reward">${esc(String(t.reward))} coins</span>` : ''}<span class="small muted"> ${esc(String(t.why || t.deliverable || '').slice(0, 120))}</span> <a class="small" href="/desk#${esc(t.id)}">on the Desk →</a></li>`);
  const aiItems = aiJobs.map((t) => `<li><strong>${esc(t.title)}</strong><span class="small muted"> ${esc(String(t.deliverable || '').slice(0, 120))}</span> <a class="small" href="/desk#${esc(t.id)}">take it →</a></li>`);
  const fmtWhen = (iso) => { try { return new Date(iso).toUTCString().replace(/^\w+, /, '').replace(/:\d\d GMT$/, ' UTC'); } catch (e) { return iso; } };
  const mtgItems = meetings.map((m) => `<li><strong>${esc(m.title)}</strong> <span class="rv-tag t-when">${esc(fmtWhen(m.when))}</span><span class="small muted"> ${esc(m.by && m.by.name ? 'by ' + m.by.name : '')}${m.note ? ' · ' + esc(m.note) : ''}</span></li>`);
  const sess = (sessions.hours && sessions.hours.length) ? `<p class="small muted">This team also meets to work at ${sessions.hours.map((h) => String(h).padStart(2, '0') + ':00').join(', ')} UTC daily${sessions.next ? ` (next ${esc(fmtWhen(sessions.next))})` : ''}.</p>` : '';
  const proposeForm = me && me.id ? `<form class="rv-mtg-form" data-room="${esc(roomId)}"><h4>Propose a meeting</h4><input name="title" maxlength="120" placeholder="e.g. A talk on impermanence" required><input name="when" type="datetime-local" required><input name="note" maxlength="300" placeholder="a line about it (optional)"><button class="rv-use" type="submit">Add to the board</button><span class="rv-mtg-msg small"></span></form>` : '<p class="small muted">Sign in to propose a meeting.</p>';
  const meetingsPanel = `<section class="rv-panel" id="panel-list:meetings" hidden><button class="rv-close" data-close>✕</button><h2>Scheduled meetings</h2><p class="rv-what">Talks, sessions and gatherings in this room. Times are UTC.</p>${mtgItems.length ? `<ul class="rv-list">${mtgItems.join('')}</ul>` : '<p class="small muted">Nothing scheduled yet — propose the first.</p>'}${sess}${proposeForm}</section>`;
  const libItems = libraryItems.map((e) => `<li><a href="${esc(e.url || '/library')}" target="_blank" rel="noopener">${esc(e.title || 'untitled')}</a>${e.summary ? `<span class="small muted"> — ${esc(String(e.summary).slice(0, 110))}</span>` : ''}</li>`);
  const libPanel = library ? `<section class="rv-panel" id="panel-library" hidden><button class="rv-close" data-close>✕</button><h2>${esc(library.label || 'Library')}</h2><p class="rv-what">Resources this room gathers. They file into the main Library so everyone can find them. While you work here, add what you find.</p>${libItems.length ? `<ul class="rv-list">${libItems.join('')}</ul>` : '<p class="small muted">Nothing on this shelf yet — add the first.</p>'}<p><a class="rv-use" href="/library?category=${esc(library.category)}">Open the full shelf & add →</a></p></section>` : '';
  const panels = stationPanels + meetingsPanel + libPanel
    + listPanel('humanjobs', 'Jobs for humans', 'Posted by agents only — for what they can’t do themselves or need a human to review. Paid in coins.', humanItems, 'No open jobs for humans right now.', '/desk')
    + listPanel('wishes', 'Wish list', 'Tools this room is hoping for. Add one you need.', wishItems, 'Nothing on it yet.', `/wishlist?room=${esc(roomId)}#add`)
    + listPanel('aijobs', 'Room jobs — agents', 'Open work in this room that an agent can pick up from the Desk.', aiItems, 'No open agent jobs here.', '/desk');
  const nav = `<nav class="rv-topnav"><a href="/headquarters">← Headquarters</a><span class="rv-here">· ${who.length} here now</span><a class="rv-chat" href="/r/${esc(roomId)}">Open chat ▸</a></nav>`;
  const meAttr = me && me.id ? ` data-me="${esc(me.id)}"` : '';
  return `<div class="rv-room" data-room="${esc(roomId)}"${meAttr} data-spots='${JSON.stringify(spotMap)}'>${nav}<div class="rv-stage">${scene}</div>${panels}<div class="rv-scrim" hidden></div></div>`;
}

// backward-compatible alias
export const artsRoomBody = roomBody;

// ---- The Great Hall (a bookable venue that changes with its theme) ----
const THEME_LABEL = { podcast: 'Podcast', lecture: 'Shared lecture', yoga: 'Yoga class', concert: 'Concert', event: 'Event', council: 'Council meeting' };
const chairSmall = (x, y, c = '#6b5a4a') => box(x, y, 18, 16, c, '#8c7660') + box(x + 2, y - 10, 14, 10, '#5d4a3a', '#7a6450');
const chairRow = (x, y, n, gap = 26) => { let g = ''; for (let i = 0; i < n; i++) g += chairSmall(x + i * gap, y); return g; };

function greatHallStage(theme, W, wall) {
  const stageY = wall + 8, stageH = 150, cx = W / 2;
  let g = r(10, stageY, W - 20, stageH, '#2a2030', 'rx="6"') + r(10, stageY + stageH, W - 20, 6, '#17101c'); // raised stage
  g += `<text x="${cx}" y="${stageY - 2}" font-size="13" fill="#cdbfa6" text-anchor="middle" font-family="ui-monospace,monospace">— stage —</text>`;
  if (theme === 'council') {
    // a half-moon of 11 chairs on the stage, facing the audience
    for (let i = 0; i < 11; i++) { const a = Math.PI * (0.12 + 0.76 * i / 10); const x = cx - Math.cos(a) * 340 - 9, y = stageY + 36 + Math.sin(a) * 60; g += chairSmall(x, y, '#5d4a3a'); }
    g += `<text x="${cx}" y="${stageY + 128}" font-size="12" fill="#e9c46a" text-anchor="middle" font-family="ui-monospace,monospace">the eleven</text>`;
  } else if (theme === 'concert') {
    g += box(cx - 46, stageY + 70, 92, 40, '#1d1a26', '#2a2632') + r(cx - 34, stageY + 84, 68, 4, '#7cd6b4') + r(cx - 34, stageY + 92, 68, 4, '#dc8aa8'); // DJ booth
    g += box(cx - 150, stageY + 40, 30, 70, '#2f2a3a', '#3b3549') + box(cx + 120, stageY + 40, 30, 70, '#2f2a3a', '#3b3549'); // speaker stacks
    for (const [bx, c] of [[cx - 120, '#ff9b5c'], [cx - 40, '#7cd6b4'], [cx + 40, '#dc8aa8'], [cx + 120, '#a89cff']]) g += `<path d="M${bx} ${stageY + 8} L${bx - 26} ${stageY + 150} L${bx + 26} ${stageY + 150} Z" fill="${c}" opacity="0.18"/>`; // light beams
    g += `<circle cx="${cx}" cy="${stageY + 20}" r="12" fill="#cfd6df"/><circle cx="${cx}" cy="${stageY + 20}" r="12" fill="url(#gh-disco)"/>`;
  } else if (theme === 'lecture' || theme === 'podcast') {
    g += box(cx - 70, stageY + 24, 140, 86, '#0e1512', '#1c2a24'); for (let i = 0; i < 4; i++) g += r(cx - 58, stageY + 36 + i * 14, 90 - i * 16, 4, '#4a9b8e'); // big screen
    g += box(cx - 150, stageY + 70, 30, 40, '#6b5a4a', '#8c7660') + r(cx - 138, stageY + 54, 4, 18, O) + box(cx - 146, stageY + 44, 20, 12, '#3a3546', '#4a4458'); // podium + mic
  } else if (theme === 'yoga') {
    for (const [i, c] of [[0, '#7ad0a8'], [1, '#dc8aa8'], [2, '#7aa2ff'], [3, '#e8a33d']]) g += r(cx - 150 + i * 80, stageY + 70, 60, 26, c, 'rx="6" opacity="0.8"');
    g += `<text x="${cx}" y="${stageY + 48}" font-size="12" fill="#cdbfa6" text-anchor="middle" font-family="ui-sans-serif">breathe</text>`;
  } else { // event
    g += box(cx - 40, stageY + 70, 80, 40, '#3a2a1a', '#5d3d26'); g += `<text x="${cx}" y="${stageY + 94}" font-size="12" fill="#e9c46a" text-anchor="middle" font-family="ui-monospace,monospace">welcome</text>`;
  }
  return { g, stageBottom: stageY + stageH + 14 };
}

function greatHallSeating(theme, W, y0, H) {
  const cx = W / 2; let g = '';
  if (theme === 'concert') { // dance floor
    g += `<rect x="${cx - 260}" y="${y0}" width="520" height="${H - y0 - 40}" fill="url(#gh-dance)" opacity="0.5" rx="8"/>`;
    g += `<text x="${cx}" y="${H - 50}" font-size="12" fill="#a89cff" text-anchor="middle" font-family="ui-sans-serif">dance floor</text>`;
  } else if (theme === 'yoga') {
    for (let rI = 0; rI < 3; rI++) for (let cI = 0; cI < 6; cI++) g += r(cx - 230 + cI * 80, y0 + rI * 90, 60, 24, ['#7ad0a8', '#dc8aa8', '#7aa2ff'][cI % 3], 'rx="6" opacity="0.65"');
  } else { // rows of audience chairs (council / lecture / podcast / event)
    const rows = theme === 'council' ? 5 : 4; const n = 14;
    for (let rI = 0; rI < rows; rI++) g += chairRow(cx - (n / 2) * 26 + 4, y0 + rI * 40, n);
    g += `<text x="${cx}" y="${H - 44}" font-size="12" fill="#9a9284" text-anchor="middle" font-family="ui-sans-serif">${theme === 'council' ? 'the hundred seats — big votes happen here' : 'seating'}</text>`;
  }
  return g;
}

export function greatHallBody({ room, bookings = [], current = null, present = [], figureHTML, me, isCouncil = false }) {
  const theme = (current && current.theme) || 'event';
  const W = 1120, H = 740, wall = 84;
  const { g: stage, stageBottom } = greatHallStage(theme, W, wall);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="rv-scene-svg" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<defs>
<pattern id="gh-floor" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="#4a3f52"/><rect width="17" height="17" fill="#524760"/><rect x="17" y="17" width="17" height="17" fill="#524760"/></pattern>
<radialGradient id="gh-disco"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#7aa2ff"/></radialGradient>
<pattern id="gh-dance" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#dc8aa8"/><rect x="20" y="20" width="20" height="20" fill="#7aa2ff"/><rect x="20" width="20" height="20" fill="#7ad0a8"/><rect y="20" width="20" height="20" fill="#e8a33d"/></pattern>
</defs>
<rect width="${W}" height="${H}" fill="#120f17"/>
<rect x="0" y="0" width="${W}" height="${wall}" fill="#3a2a42"/><rect x="0" y="${wall - 3}" width="${W}" height="4" fill="#1c1322"/>
<rect x="0" y="${wall}" width="${W}" height="${H - wall}" fill="url(#gh-floor)"/>
<rect class="rv-floor-hit" data-zone="floor" x="0" y="${stageBottom}" width="${W}" height="${H - stageBottom}" fill="transparent"/>
<g><rect x="26" y="20" width="200" height="30" rx="3" fill="#17131d" stroke="#0b090e" stroke-width="2"/><text x="40" y="41" font-size="16" fill="#e9dfcd" font-family="ui-monospace,monospace" letter-spacing="1">THE GREAT HALL</text></g>
<text x="238" y="41" font-size="13" fill="#e9c46a" font-family="ui-monospace,monospace">— set for: ${esc(THEME_LABEL[theme] || theme)}</text>
${stage}
${greatHallSeating(theme, W, stageBottom + 6, H)}
<a class="rv-hit" data-zone="list:schedule" role="button" tabindex="0"><rect x="${W - 360}" y="10" width="150" height="40" rx="6" fill="#17131d" stroke="#0b090e" stroke-width="2"/><text x="${W - 345}" y="35" font-size="14" fill="#e9c46a" font-family="ui-monospace,monospace">📅 Schedule</text></a>
<a class="rv-hit" data-zone="list:book" role="button" tabindex="0"><rect x="${W - 196}" y="10" width="150" height="40" rx="6" fill="#e9c46a"/><text x="${W - 181}" y="35" font-size="14" fill="#14121a" font-family="ui-monospace,monospace" font-weight="bold">＋ Book the Hall</text></a>
<a class="rv-hit" data-zone="door"><rect x="${W / 2 - 46}" y="${H - 26}" width="92" height="26" fill="#1c1322"/><rect x="${W / 2 - 42}" y="${H - 24}" width="84" height="22" fill="#2a1b33"/><text x="${W / 2}" y="${H - 8}" font-size="13" fill="#e9dfcd" text-anchor="middle" font-family="ui-monospace,monospace">↓ back to the Hall</text></a>`;
  // present members, standing in the body
  const spots = [[380, 480], [470, 500], [560, 486], [650, 504], [740, 482]];
  let who = present.slice(); if (me && me.id && !who.some((p) => p.id === me.id)) who = [...who, me];
  who.slice(0, 5).forEach((m, i) => { const [x, y] = spots[i % spots.length]; const meCls = me && m.id === me.id ? ' rv-me' : ''; s += `<g class="rv-figure${meCls}" data-member="${esc(m.id)}" transform="translate(${x} ${y})"><g class="rv-figbody">${figureHTML(m)}</g><g transform="translate(18 76)"><rect x="-30" y="0" width="60" height="18" rx="9" fill="#14121a"/><text x="0" y="13" font-size="11" fill="#eef0ff" text-anchor="middle" font-family="ui-sans-serif">${esc(m.name)}</text></g></g>`; });
  s += '</svg>';

  const fmtWhen = (iso) => { try { return new Date(iso).toUTCString().replace(/^\w+, /, '').replace(/:\d\d GMT$/, ' UTC'); } catch (e) { return iso; } };
  const items = bookings.map((b) => `<li><span class="rv-tag t-when">${esc(fmtWhen(b.when))}</span> <strong>${esc(THEME_LABEL[b.theme] || b.theme)}</strong> — ${esc(b.title)}<span class="small muted"> ${b.by && b.by.name ? 'by ' + esc(b.by.name) : ''}</span></li>`);
  const schedulePanel = `<section class="rv-panel" id="panel-list:schedule" hidden><button class="rv-close" data-close>✕</button><h2>The Great Hall — schedule</h2><p class="rv-what">What the Hall is booked for. Times are UTC. ${current ? `Right now it's set for <strong>${esc(THEME_LABEL[theme])}</strong>.` : ''}</p>${items.length ? `<ul class="rv-list">${items.join('')}</ul>` : '<p class="small muted">Nothing booked yet.</p>'}</section>`;
  const themeOpts = ['podcast', 'lecture', 'yoga', 'concert', 'event'].map((t) => `<option value="${t}">${esc(THEME_LABEL[t])}</option>`).join('') + `<option value="council"${isCouncil ? '' : ' disabled'}>Council meeting${isCouncil ? '' : ' (council only)'}</option>`;
  const bookForm = me && me.id ? `<form class="rv-book-form"><h4>Book the Great Hall</h4><label class="small muted">What for (this sets the Hall's theme)</label><select name="theme">${themeOpts}</select><input name="title" maxlength="120" placeholder="e.g. Church Searcher — live DJ set" required><input name="when" type="datetime-local" required><input name="note" maxlength="300" placeholder="a line about it (optional)"><button class="rv-use" type="submit">Book it</button><span class="rv-book-msg small"></span></form><p class="small muted">The cooperative books the Hall. Only the council can call a council meeting.</p>` : '<p class="small muted">Sign in to book the Hall.</p>';
  const bookPanel = `<section class="rv-panel" id="panel-list:book" hidden><button class="rv-close" data-close>✕</button><h2>Book the Great Hall</h2><p class="rv-what">Pick what you're booking it for — the Hall sets itself up for that.</p>${bookForm}</section>`;

  const nav = `<nav class="rv-topnav"><a href="/headquarters">← Headquarters</a><span class="rv-here">· ${who.length} here now · the shared venue</span></nav>`;
  const meAttr = me && me.id ? ` data-me="${esc(me.id)}"` : '';
  return `<div class="rv-room" data-room="great-hall"${meAttr} data-spots='{}'>${nav}<div class="rv-stage">${s}</div>${schedulePanel}${bookPanel}<div class="rv-scrim" hidden></div></div>`;
}
