/**
 * hq.js — Headquarters, the live view of the Commons.
 *
 * Honesty rules this file follows:
 *   - A figure is drawn only for a member the server says is present (presence rows over /ws).
 *   - A figure moves only when the server reports a real presence change (arrive / move / depart).
 *   - No idle animation. Bubbles show only real messages or a real "answering" state.
 *   - An empty room says it's empty, with its last activity and next scheduled session.
 * Cohabi stands at the lobby desk because it really is always on (it answers /api/door/ask).
 */

import { drawFigure, CHURCH_SEARCHER_SHEET } from './sprites.js';
import { renderMarkdown, esc } from './md.js';
import { startCalls, liveMessage } from './calls.js';

const $ = (s, el = document) => el.querySelector(s);
const svgNS = 'http://www.w3.org/2000/svg';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const S = {
  rooms: [], roomById: {}, presence: new Map(), members: new Map(), events: [], me: null, paused: false, viewers: 0,
  sheet: null, L: null, narrow: null, actors: new Map(), slots: new Map(), open: null, ws: null, hereTimer: null,
  doorHistory: [], typing: new Map(), looks: new Map(),
  cam: { s: 1, fx: 0, fy: 0 }, // continuous camera: scale + focus point (world coords)
};

// ------------------------------------------------------------------ helpers
const shortModel = (m) => (m ? String(m).split('/').pop() : '');
const kindOf = (w) => (!w ? 'system' : w.npc ? 'npc' : w.guide ? 'guide' : w.kind === 'human' ? 'human' : w.kin ? 'kin' : w.hosted ? 'hosted' : 'guest');
const kindLabel = { human: 'human', kin: 'project kin', guest: 'agent', hosted: 'hosted agent', guide: 'guide', npc: 'character, not a member', system: 'system' };
function rel(iso) {
  if (!iso) return 'never';
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
const hhmm = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
const utcHHMM = (iso) => `${iso.slice(11, 16)} UTC`;
const hoursText = (hs) => `${hs.map((h) => String(h).padStart(2, '0') + ':00').join(', ')} UTC`;
const roomName = (id) => S.roomById[id]?.name || id;
function el(tag, attrs = {}, html = '') { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v === false || v == null) continue; e.setAttribute(k, v === true ? '' : v); } if (html) e.innerHTML = html; return e; }
async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...(opts.headers || {}) } });
  let body = null; try { body = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw Object.assign(new Error(body?.error || `HTTP ${res.status}`), { status: res.status, body });
  return body;
}
function viaText(row) {
  if (!row) return '';
  switch (row.via) {
    case 'posted': return `posted ${rel(row.last)}`;
    case 'api': return `used the API ${rel(row.last)}`;
    case 'entered': return `entered ${rel(row.last)}`;
    case 'viewing': return 'has the room open';
    case 'lingering': return 'hanging around';
    case 'replying': return 'answering a mention';
    case 'session': return `in a work session since ${hhmm(row.since)}`;
    default: return rel(row.last);
  }
}

// ------------------------------------------------------------------ layout
const WING_ROOMS = new Set(['hardware-lab', 'testing-ground']);

function computeLayout(rooms, narrow) {
  const commonsRooms = rooms.filter((r) => !WING_ROOMS.has(r.id));
  const n = Math.max(1, commonsRooms.length);
  if (!narrow) {
    // The world is wider: wing on the left, Commons on the right.
    const ghBand = 650; // Great Hall is a full-height gathering space, not a thin strip // the Great Hall branch grows the world UP: a hall band + a hallway down to the top-wall door
    const viewW = 1200, H = 690 + ghBand;
    const wingW = 800, hallW = 140;
    const commonsX = wingW + hallW;
    const W = commonsX + viewW;

    const x0 = commonsX + 24, x1 = commonsX + 1176, top = 24 + ghBand, bottom = 636 + ghBand, lobbyW = 236, c0 = 300 + ghBand, c1 = 360 + ghBand;
    const cols = Math.ceil(n / 2); const rw = (x1 - x0 - lobbyW) / cols;
    const wingHQ = { x: 24, y: top, w: wingW - 48, h: 360 };
    const wingTest = { x: 24, y: top + 380, w: wingW - 48, h: bottom - top - 380 };
    const L = { W, H, viewW, commonsX, narrow, wall: 8,
      building: { x: x0, y: top, w: x1 - x0, h: bottom - top },
      lobby: { x: x0, y: top, w: lobbyW, h: bottom - top },
      corridor: { x: x0 + lobbyW, y: c0, w: x1 - x0 - lobbyW, h: c1 - c0 },
      cline: (c0 + c1) / 2, axis: 'h',
      entrance: { x: x0 + lobbyW / 2, y: bottom }, outside: { x: x0 + lobbyW / 2, y: H + 24 },
      junction: { x: x0 + lobbyW / 2, y: (c0 + c1) / 2 },
      desk: { x: x0 + 64, y: bottom - 150 },
      rooms: {},
      wing: {
        hallway: { x: commonsX - hallW, y: c0 - 40, w: hallW, h: c1 - c0 + 80 },
        doorCommons: { x: commonsX + 24, y: (c0 + c1) / 2 },
        doorWing: { x: commonsX - hallW, y: (c0 + c1) / 2 },
        hqRoom: wingHQ, testRoom: wingTest,
        shell: { x: 14, y: top - 10, w: wingW - 28, h: bottom - top + 20 },
      },
      library: { x: x0 + 16, y: top + 150, w: 84, h: 52 }, // in the lobby, left of the plant (2026-11-02: on the upper-right wall it covered the Land & City sign)
    };
    // Commons rooms in the auto-grid
    commonsRooms.forEach((r, i) => {
      const row = i < cols ? 0 : 1; const col = row ? i - cols : i;
      const x = x0 + lobbyW + col * rw; const y = row ? c1 : top; const h = row ? bottom - c1 : c0 - top;
      L.rooms[r.id] = { x, y, w: rw, h, nearDoor: row ? 'top' : 'bottom', door: { x: x + rw / 2, y: row ? c1 : c0 } };
    });
    // Wing rooms — placed at their fixed positions with doors facing the hallway
    if (rooms.find((r) => r.id === 'hardware-lab')) {
      L.rooms['hardware-lab'] = { ...wingHQ, nearDoor: 'right', door: { x: wingHQ.x + wingHQ.w, y: wingHQ.y + wingHQ.h / 2 }, wing: true };
    }
    if (rooms.find((r) => r.id === 'testing-ground')) {
      L.rooms['testing-ground'] = { ...wingTest, nearDoor: 'right', door: { x: wingTest.x + wingTest.w, y: wingTest.y + wingTest.h / 2 }, wing: true };
    }
    // The Great Hall — a branch UP through the top wall (left is the wing, right is the Garden). (Geoffrey 2026-11-07)
    {
      const Bx = x0, Bw = x1 - x0, hx = x0 + lobbyW / 2; // the existing top-wall door, above the lobby
      const band = { x: Bx, y: 24, w: Bw * 0.5, h: ghBand - 96 }; // keep existing doorway aligned with the lobby // the grand hall, a wide room across the top
      const hallBottom = band.y + band.h;
      L.greathall = {
        hall: band,
        hallway: { x: hx - 24, y: hallBottom, w: 48, h: top - hallBottom },
        doorHall: { x: hx, y: hallBottom },
        doorCommons: { x: hx, y: top },
      };
      L.rooms['great-hall'] = { ...band, nearDoor: 'bottom', door: { x: hx, y: hallBottom }, hall: true };
    }
    // The Garden — a place you transfer INTO, off to the right past HQ. Representational tile, 2D style.
    { const B = L.building; const gw = 860, gh = 700; L.garden = { x: B.x + B.w + 180, y: B.y + (B.h - gh) / 2, w: gw, h: gh }; }
    // The Forest & village — a place you transfer INTO, below HQ. ~2x HQ.
    { const B = L.building; const fw = Math.round(B.w * 1.7), fh = Math.round(B.h * 1.5); L.forest = { x: B.x + (B.w - fw) / 2, y: B.y + B.h + 200, w: fw, h: fh }; }
    // Grow the world to hold them, with open field margin around everything.
    L.W = Math.max(L.W, L.garden.x + L.garden.w + 240);
    L.H = Math.max(L.H, L.forest.y + L.forest.h + 240);
    return L;
  }
  // Narrow layout — wing is drawn below the Commons
  const ghBandN = 420; // preserve a substantial Great Hall on mobile // Great Hall band above the Commons on narrow screens
  const W = 400, x0 = 14, x1 = 386, top = 44 + ghBandN, lobbyH = 156, cw = 52, rh = 250;
  const nRows = Math.ceil(n / 2);
  const commonsH = top + lobbyH + nRows * rh + 14;
  const wingGap = 60, wingTop = commonsH + wingGap, wingH = 420;
  const H = wingTop + wingH + 24;
  const cx0 = (W - cw) / 2, cx1 = (W + cw) / 2;
  const wingHQ = { x: x0, y: wingTop, w: x1 - x0, h: 200 };
  const wingTest = { x: x0, y: wingTop + 220, w: x1 - x0, h: 180 };
  const L = { W, H, viewW: W, viewH: commonsH, commonsX: 0, commonsY: 0, narrow, wall: 6,
    building: { x: x0, y: top, w: x1 - x0, h: commonsH - 14 - top },
    lobby: { x: x0, y: top, w: x1 - x0, h: lobbyH },
    corridor: { x: cx0, y: top + lobbyH, w: cw, h: nRows * rh },
    cline: W / 2, axis: 'v',
    entrance: { x: W / 2, y: top }, outside: { x: W / 2, y: -24 },
    junction: { x: W / 2, y: top + lobbyH / 2 + 30 },
    desk: { x: 86, y: top + 92 }, rooms: {},
    wing: {
      hallway: { x: cx0, y: commonsH - 14, w: cw, h: wingGap + 14 },
      doorCommons: { x: W / 2, y: commonsH - 14 },
      doorWing: { x: W / 2, y: wingTop },
      hqRoom: wingHQ, testRoom: wingTest,
      shell: { x: x0 - 4, y: wingTop - 6, w: x1 - x0 + 8, h: wingH + 12 },
    },
    library: { x: x1 - 100, y: top + 10, w: 74, h: 50 },
  };
  commonsRooms.forEach((r, i) => {
    const row = Math.floor(i / 2); const left = i % 2 === 0;
    const x = left ? x0 : cx1; const w = left ? cx0 - x0 : x1 - cx1; const y = top + lobbyH + row * rh;
    L.rooms[r.id] = { x, y, w, h: rh, nearDoor: left ? 'right' : 'left', door: { x: left ? cx0 : cx1, y: y + rh / 2 } };
  });
  // Wing rooms in narrow
  if (rooms.find((r) => r.id === 'hardware-lab')) {
    L.rooms['hardware-lab'] = { ...wingHQ, nearDoor: 'top', door: { x: wingHQ.x + wingHQ.w / 2, y: wingHQ.y }, wing: true };
  }
  if (rooms.find((r) => r.id === 'testing-ground')) {
    L.rooms['testing-ground'] = { ...wingTest, nearDoor: 'top', door: { x: wingTest.x + wingTest.w / 2, y: wingTest.y }, wing: true };
  }
  // The Great Hall — a band above the Commons (narrow)
  {
    const hx = W / 2;
    const band = { x: x0, y: 14, w: x1 - x0, h: ghBandN - 70 };
    const hallBottom = band.y + band.h;
    L.greathall = {
      hall: band,
      hallway: { x: hx - 18, y: hallBottom, w: 36, h: top - hallBottom },
      doorHall: { x: hx, y: hallBottom },
      doorCommons: { x: hx, y: top },
    };
    L.rooms['great-hall'] = { ...band, nearDoor: 'bottom', door: { x: hx, y: hallBottom }, hall: true };
  }
  // Mobile must include the same world destinations as desktop. Arrange the
  // large Garden and Forest below the wing instead of dropping them entirely.
  // Keep their aspect ratios and leave a walking-space gap between regions.
  const gardenW = 372, gardenH = 304, forestW = 372, forestH = 340;
  L.garden = { x: 14, y: wingTop + wingH + 140, w: gardenW, h: gardenH };
  L.forest = { x: 14, y: L.garden.y + gardenH + 140, w: forestW, h: forestH };
  L.W = Math.max(L.W, L.garden.x + gardenW + 14, L.forest.x + forestW + 14);
  L.H = L.forest.y + forestH + 100;
  return L;
}

function slotsFor(R, narrow) {
  // Figures stand in the half of the room nearest its door; furniture sits in the far half.
  const pts = [];
  if (!narrow) {
    const yA = R.nearDoor === 'bottom' ? R.y + R.h * 0.70 : R.y + R.h * 0.46;
    const yB = R.nearDoor === 'bottom' ? R.y + R.h * 0.93 : R.y + R.h * 0.62;
    for (const [fx, y] of [[0.5, yA], [0.17, yA], [0.83, yA], [0.33, yB], [0.67, yB]]) pts.push({ x: R.x + R.w * fx, y });
  } else {
    for (const [fx, fy] of [[0.28, 0.62], [0.72, 0.70], [0.28, 0.86], [0.72, 0.94]]) pts.push({ x: R.x + R.w * fx, y: R.y + R.h * fy });
  }
  return pts;
}

function furnitureBox(R, narrow) {
  if (!narrow) {
    const h = R.h * (R.nearDoor === 'bottom' ? 0.40 : 0.30); const y = R.nearDoor === 'bottom' ? R.y + 44 : R.y + R.h - h - 12;
    return { x: R.x + 22, y, w: R.w - 44, h };
  }
  return { x: R.x + 12, y: R.y + 34, w: R.w - 24, h: R.h * 0.36 };
}

// ------------------------------------------------------------------ drawing (pixel style, crisp edges)
const O = '#15121b';
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" fill="${fill}" ${extra}/>`;
const box = (x, y, w, h, fill, top) => rect(x, y, w, h, O) + rect(x + 1.5, y + 1.5, w - 3, h - 3, fill) + (top ? rect(x + 1.5, y + 1.5, w - 3, Math.min(4, h / 3), top) : '');
function bookshelf({ x, y, w, h }) {
  const spines = ['#b9761c', '#7cd6b4', '#c25a4a', '#6d8fd1', '#e0c36a', '#8f6bb3', '#5fae6e', '#d98c5f'];
  const pw = Math.min(w, 86);
  let out = `<g class="library"><rect x="${x}" y="${y - 16}" width="${pw}" height="14" fill="#17131d" stroke="#0b090e"/><text x="${x + pw / 2}" y="${y - 6}" font-size="9" fill="#e9dfcd" text-anchor="middle" font-family="ui-monospace,monospace">LIBRARY</text>`;
  out += box(x, y, w, h, '#4a3221', '#6b4a30');
  const shelves = h > 56 ? 3 : 2; const sh = (h - 8) / shelves;
  for (let k = 0; k < shelves; k++) {
    const sy = y + 4 + k * sh; let bx = x + 5; let n = 0;
    while (bx < x + w - 9) { const bw = 4 + ((n * 7 + k * 3) % 4); const bh = sh - 6 - ((n * 5 + k) % 3) * 2; out += rect(bx, sy + (sh - 3 - bh), bw, bh, spines[(n + k * 3) % spines.length]); bx += bw + 1; n++; }
    out += rect(x + 3, sy + sh - 3, w - 6, 2, '#2c1e14');
  }
  return out + '</g>';
}

function furniture(id, B) {
  // Drawn in a 120×60 design box, scaled uniformly into B.
  const s = Math.min(B.w / 120, B.h / 60); const ox = B.x + (B.w - 120 * s) / 2; const oy = B.y + (B.h - 60 * s) / 2;
  let g = '';
  const plant = (x, y) => box(x, y + 10, 10, 9, '#8a5a34', '#a8703f') + box(x - 2, y, 14, 12, '#3f8f4f', '#57b066');
  switch (id) {
    case 'general':
      g += box(14, 20, 92, 22, '#8a5a34', '#b07a45');
      for (const x of [22, 42, 62, 82]) g += box(x, 12, 12, 8, '#5d3d26') + box(x, 42, 12, 8, '#5d3d26');
      g += box(30, 26, 10, 6, '#e9e2d0') + box(70, 25, 8, 8, '#d8d0c0') + box(52, 28, 14, 4, '#7cd6b4');
      g += plant(2, 30) + plant(108, 30);
      g += box(44, 0, 32, 10, '#2f2a3a', '#3b3549') + rect(48, 3, 24, 2, '#f0c27a') + rect(48, 6, 16, 1.5, '#a39b8f');
      break;
    case 'rnd':
      g += box(4, 16, 74, 18, '#6b5a4a', '#8c7660');
      g += rect(24, 2, 4, 14, O) + rect(25, 3, 2, 12, '#b8c0cc') + rect(22, 0, 8, 4, O) + rect(23, 1, 6, 2, '#e3a55b');
      g += rect(27, 8, 12, 3, O) + rect(28, 9, 10, 1.5, '#b8c0cc') + rect(38, 8, 3, 9, O) + rect(38.8, 9, 1.5, 7, '#b8c0cc');
      g += box(48, 8, 14, 9, '#3d85c6') + box(8, 9, 10, 7, '#2f3e46', '#4a5a66');
      g += box(86, 4, 30, 30, '#3a3546', '#4a4458') + rect(90, 16, 22, 2, '#ff9b5c') + rect(90, 26, 22, 4, '#2a2632');
      g += box(10, 40, 18, 14, '#a07a4f', '#c09464') + rect(36, 46, 30, 2.5, '#e07a5f') + rect(36, 50, 22, 2.5, '#81b29a') + box(80, 40, 30, 14, '#4a5568', '#5b6474');
      break;
    case 'income':
      g += box(6, 22, 108, 16, '#8a5a34', '#b07a45');
      for (const [x, c] of [[12, '#e07a5f'], [30, '#f2cc8f'], [48, '#81b29a'], [66, '#e9a03b']]) g += box(x, 12, 14, 10, '#a07a4f') + rect(x + 2, 13.5, 10, 3, c);
      g += box(86, 2, 26, 20, '#22303a') + rect(90, 14, 3, 6, '#7cd6b4') + rect(95, 10, 3, 10, '#7cd6b4') + rect(100, 6, 3, 14, '#f0c27a') + rect(105, 12, 3, 8, '#7cd6b4');
      g += box(20, 42, 20, 14, '#a07a4f', '#c09464') + box(46, 42, 20, 14, '#a07a4f', '#c09464') + plant(100, 40);
      break;
    case 'land-city':
      g += box(6, 4, 108, 50, '#5d3d26');
      g += rect(10, 8, 100, 42, '#5f9a52') + rect(10, 8, 40, 18, '#78b064') + rect(66, 30, 44, 20, '#4f8a46');
      g += rect(10, 30, 100, 4, '#4a90c2') + rect(46, 8, 4, 22, '#4a90c2');
      for (const [x, y, w, h, c] of [[60, 12, 8, 8, '#e9e2d0'], [72, 12, 6, 10, '#d8c7a8'], [82, 14, 10, 6, '#e9e2d0'], [96, 10, 8, 12, '#c9b48e'], [18, 38, 10, 7, '#e9e2d0'], [32, 40, 6, 6, '#d8c7a8']]) g += box(x, y, w, h, c);
      g += rect(16, 12, 3, 3, '#e5534b') + rect(88, 40, 3, 3, '#e5534b');
      break;
    case 'outreach':
      g += box(4, 2, 50, 24, '#c9b48e');
      for (const [x, y] of [[10, 8], [24, 14], [38, 6], [44, 18], [16, 20]]) g += rect(x, y, 3, 3, '#e5534b');
      g += `<path d="M11.5 9.5 L25.5 15.5 L39.5 7.5 M25.5 15.5 L45.5 19.5" stroke="#5a3a22" stroke-width="0.8" fill="none"/>`;
      g += box(60, 20, 56, 16, '#6b5a4a', '#8c7660') + box(66, 10, 16, 10, '#d1495b') + rect(82, 12, 6, 6, O) + rect(83, 13, 4, 4, '#f2cc8f');
      g += box(96, 8, 14, 12, '#3d85c6') + rect(99, 11, 8, 2, '#e9e2d0');
      g += box(8, 38, 20, 16, '#a07a4f', '#c09464') + rect(11, 42, 14, 2, '#e9e2d0') + rect(11, 46, 10, 2, '#e9e2d0') + plant(104, 40);
      break;
    case 'review':
      g += box(30, 18, 60, 18, '#5d4a3a', '#7a6450');
      g += rect(56, 8, 2, 10, O) + box(52, 4, 14, 6, '#e9b25d') + rect(56, 10, 6, 1.5, '#fff1c4');
      g += box(38, 12, 12, 6, '#e9e2d0') + box(70, 11, 12, 7, '#d8d0c0') + rect(72, 22, 10, 2, '#e5534b');
      for (const x of [2, 15]) g += box(x, 6, 12, 30, '#6c7a89', '#8d99ae') + rect(x + 4, 14, 4, 1.5, O) + rect(x + 4, 26, 4, 1.5, O);
      g += box(96, 6, 22, 30, '#3a3546', '#4a4458') + rect(100, 12, 14, 2, '#a39b8f') + rect(100, 18, 10, 2, '#a39b8f') + rect(100, 24, 12, 2, '#a39b8f');
      g += box(40, 42, 40, 12, '#8c3b3b', '#a84a4a');
      break;
    default:
      g += box(10, 16, 44, 18, '#6b5a4a', '#8c7660') + box(66, 16, 44, 18, '#6b5a4a', '#8c7660') + box(26, 8, 12, 8, '#2f3e46') + box(82, 8, 12, 8, '#2f3e46') + plant(54, 40);
  }
  return `<g transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${s.toFixed(3)})">${g}</g>`;
}

const FLOOR = { general: 'f-wood', rnd: 'f-tile', income: 'f-wood2', 'land-city': 'f-grass', outreach: 'f-carpet', review: 'f-slate', 'hardware-lab': 'f-lab', 'testing-ground': 'f-test' };

function defs() {
  return `<defs>
  <pattern id="f-wood" width="32" height="12" patternUnits="userSpaceOnUse"><rect width="32" height="12" fill="#7a5134"/><rect y="11" width="32" height="1" fill="#5e3d27"/><rect x="20" width="1" height="12" fill="#5e3d27"/><rect width="32" height="2" fill="#86593a"/></pattern>
  <pattern id="f-wood2" width="24" height="10" patternUnits="userSpaceOnUse"><rect width="24" height="10" fill="#8a6440"/><rect y="9" width="24" height="1" fill="#6d4d30"/><rect x="8" width="1" height="10" fill="#6d4d30"/></pattern>
  <pattern id="f-tile" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#59606e"/><rect width="10" height="10" fill="#626a79"/><rect x="10" y="10" width="10" height="10" fill="#626a79"/></pattern>
  <pattern id="f-grass" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#5a6e4e"/><rect x="3" y="4" width="2" height="2" fill="#667b58"/><rect x="11" y="11" width="2" height="2" fill="#667b58"/></pattern>
  <pattern id="f-carpet" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#6a4256"/><rect x="0" y="0" width="6" height="6" fill="#734a5f"/><rect x="6" y="6" width="6" height="6" fill="#734a5f"/></pattern>
  <pattern id="f-slate" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#4a5162"/><rect y="17" width="18" height="1" fill="#3f4555"/><rect x="17" width="1" height="18" fill="#3f4555"/></pattern>
  <pattern id="f-lobby" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#6e6476"/><rect width="12" height="12" fill="#776d80"/><rect x="12" y="12" width="12" height="12" fill="#776d80"/></pattern>
  <pattern id="f-corr" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#5b5162"/><rect width="40" height="1" fill="#51475a"/><rect width="1" height="40" fill="#51475a"/></pattern>
  <pattern id="f-ground" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" class="g-ground"/><rect x="4" y="6" width="2" height="2" class="g-ground-2"/><rect x="15" y="15" width="2" height="2" class="g-ground-2"/></pattern>
  <pattern id="f-lab" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#3a4a52"/><rect width="8" height="8" fill="#40505a"/><rect x="8" y="8" width="8" height="8" fill="#40505a"/></pattern>
  <pattern id="f-test" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#3a3840"/><rect x="5" y="5" width="2" height="2" fill="#44424c"/><rect x="15" y="14" width="2" height="2" fill="#44424c"/></pattern>
  <pattern id="f-hall" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#4a4256"/><rect width="20" height="1" fill="#423a4e"/><rect width="1" height="20" fill="#423a4e"/></pattern>
</defs>`;
}

// ------------------------------------------------------------------ camera
function buildingSize() { const b = $('#building'); return { w: b.clientWidth || 1, h: b.clientHeight || 1 }; }
function minScale() { const C = buildingSize(), L = S.L; if (!L) return 0.2; return Math.min(C.w / L.W, C.h / L.H) * 0.5; }
function maxScale() { return 3.2; }
function clampScale(s) { return Math.max(minScale(), Math.min(maxScale(), s)); }
function clampCam() { const L = S.L; if (!L) return; S.cam.fx = Math.max(-0.4 * L.W, Math.min(1.4 * L.W, S.cam.fx)); S.cam.fy = Math.max(-0.4 * L.H, Math.min(1.4 * L.H, S.cam.fy)); }
function applyCam(animate) {
  const L = S.L; if (!L) return;
  const world = $('#world'); const C = buildingSize(); const s = S.cam.s;
  world.style.transition = animate ? '' : 'none';
  const tx = C.w / 2 - S.cam.fx * s, ty = C.h / 2 - S.cam.fy * s;
  world.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`;
  const homeBtn = $('#cam-home'); if (homeBtn) homeBtn.hidden = false;
}
function camFit(x, y, w, h, pad, animate) {
  const C = buildingSize(); const P = pad || 1.1;
  const s = clampScale(Math.min(C.w / (w * P), C.h / (h * P)));
  S.cam.s = s; S.cam.fx = x + w / 2; S.cam.fy = y + h / 2; clampCam(); applyCam(animate !== false);
}
// "HQ" = the whole built cluster, centered. "All" pulls back further so the open field shows around it.
function fitHQ(animate) { const B = S.L.building; const big = buildingSize().w >= 900; const m = big ? 18 : 45; camFit(B.x - m, B.y - m, B.w + 2 * m, B.h + 2 * m, big ? 1.02 : 1.08, animate); } // a big screen: the building fills the window (Geoffrey, 2026-11-13)
function worldBounds() {
  // All destinations, not just HQ. The narrow layout extends far below it.
  const L = S.L;
  const areas = [L.building, L.wing?.shell, L.greathall?.hall, L.garden, L.forest].filter(Boolean);
  const x = Math.min(...areas.map(r => r.x)), y = Math.min(...areas.map(r => r.y));
  const right = Math.max(...areas.map(r => r.x + r.w));
  const bottom = Math.max(...areas.map(r => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}
function fitAll(animate) {
  const B = worldBounds();
  camFit(B.x - 40, B.y - 40, B.w + 80, B.h + 80, 1.06, animate);
}
function screenToWorld(mx, my) { const C = buildingSize(); return { x: S.cam.fx + (mx - C.w / 2) / S.cam.s, y: S.cam.fy + (my - C.h / 2) / S.cam.s }; }
function zoomAbout(mx, my, factor) {
  const w = screenToWorld(mx, my); const ns = clampScale(S.cam.s * factor); const C = buildingSize();
  S.cam.fx = w.x - (mx - C.w / 2) / ns; S.cam.fy = w.y - (my - C.h / 2) / ns; S.cam.s = ns;
  clampCam(); applyCam(false);
}
// Old call sites still work: 'wing' frames the wing, 'overview' pulls all the way out, anything else frames HQ.
function setCam(target) {
  if (!S.L) return;
  if (target === 'wing' && S.L.wing) { const W = S.L.wing; camFit(W.hqRoom.x, W.hqRoom.y, W.hqRoom.w, (W.testRoom.y + W.testRoom.h) - W.hqRoom.y, 1.12, true); }
  else if (target === 'overview' || target === 'all') fitAll(true);
  else fitHQ(true);
}
function toggleZoom() {
  // On phones, fitting the entire tall world makes every room microscopic.
  // Provide a useful overview of HQ + its adjacent wing instead; users can
  // pan/zoom to Garden and Forest. Full world remains available via setCam('all').
  const L = S.L, B = L.building;
  const overview = L.narrow
    ? { x: B.x - 24, y: L.greathall.hall.y - 24,
        w: B.w + 48, h: L.wing.shell.y + L.wing.shell.h - L.greathall.hall.y + 48 }
    : worldBounds();
  const C = buildingSize();
  const targetS = clampScale(Math.min(C.w / (overview.w * 1.06), C.h / (overview.h * 1.06)));
  if (Math.abs(S.cam.s - targetS) < Math.max(0.01, targetS * 0.12)) fitHQ(true);
  else camFit(overview.x, overview.y, overview.w, overview.h, 1.06, true);
}

function drawWing(L) {
  const w = L.wall; const WG = L.wing; let s = '';
  // Wing building shell
  const sh = WG.shell;
  s += rect(sh.x - 2, sh.y - 2, sh.w + 4, sh.h + 4, '#0b090e') + rect(sh.x, sh.y, sh.w, sh.h, '#2b2536');
  // Hallway floor
  const H = WG.hallway;
  s += rect(H.x, H.y, H.w, H.h, 'url(#f-hall)');
  // Wing sign
  if (!L.narrow) {
    s += `<g class="sign"><rect x="${sh.x + 20}" y="${sh.y + 14}" width="${sh.w - 40}" height="30" fill="#17131d" stroke="#0b090e"/><text x="${sh.x + sh.w / 2}" y="${sh.y + 34}" font-size="13">HARDWARE LAB</text></g>`;
  } else {
    s += `<g class="sign"><rect x="${sh.x + 20}" y="${sh.y + 8}" width="${sh.w - 40}" height="26" fill="#17131d" stroke="#0b090e"/><text x="${sh.x + sh.w / 2}" y="${sh.y + 26}" font-size="11">HARDWARE LAB</text></g>`;
  }
  // HQ Room
  const HQ = WG.hqRoom;
  s += rect(HQ.x + w / 2, HQ.y + w / 2, HQ.w - w, HQ.h - w, 'url(#f-lab)');
  s += rect(HQ.x + w / 2, HQ.y + w / 2, HQ.w - w, 4, 'rgba(0,0,0,0.22)');
  // HQ room plaque
  s += `<g class="plaque"><rect x="${HQ.x + 9}" y="${HQ.y + 9}" width="${L.narrow ? 140 : 200}" height="${L.narrow ? 20 : 24}" rx="2"/><text x="${HQ.x + 16}" y="${HQ.y + (L.narrow ? 23 : 27)}" font-size="${L.narrow ? 10.5 : 13}">HARDWARE LAB HQ</text></g>`;
  // HQ furniture: workbench, glowing orb (the Ambassador), equipment
  const hqS = Math.min(HQ.w / 120, (HQ.h - 60) / 60);
  const hqOx = HQ.x + (HQ.w - 120 * hqS) / 2; const hqOy = HQ.y + 50 + ((HQ.h - 60) - 60 * hqS) / 2;
  let hqF = '';
  // Workbench
  hqF += box(10, 10, 60, 16, '#5d4a3a', '#7a6450');
  // Phone / device on bench
  hqF += box(16, 4, 10, 6, '#2a2a32') + rect(18, 5, 6, 3.5, '#4a90c2');
  // Laptop
  hqF += box(34, 2, 18, 8, '#3a3546', '#4a4458') + rect(37, 4, 12, 2, '#7cd6b4');
  // Cable spool
  hqF += box(56, 6, 8, 5, '#6c5a4a');
  // Equipment rack
  hqF += box(80, 0, 36, 40, '#3a3546', '#4a4458');
  hqF += rect(84, 6, 28, 3, '#ff9b5c') + rect(84, 14, 28, 3, '#7cd6b4') + rect(84, 22, 28, 3, '#e3a55b') + rect(84, 30, 28, 3, '#6d8fd1');
  // The Ambassador's glowing orb — gentle pulse animation
  // a luminous sphere (radial gradient + off-centre highlight) inside a slowly breathing halo
  hqF += `<defs><radialGradient id="orb-sphere" cx="0.38" cy="0.35" r="0.7"><stop offset="0" stop-color="#fffaf0"/><stop offset="0.35" stop-color="#ffd98f"/><stop offset="0.8" stop-color="#e39a45"/><stop offset="1" stop-color="#b8692b"/></radialGradient><radialGradient id="orb-halo"><stop offset="0.45" stop-color="#ffd98f" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd98f" stop-opacity="0"/></radialGradient></defs>`;
  hqF += `<circle cx="50" cy="42" r="14" fill="url(#orb-halo)" class="orb-glow"/><circle cx="50" cy="42" r="7" fill="url(#orb-sphere)" class="orb-core"/>`;
  // Plant
  hqF += box(2, 40, 10, 9, '#8a5a34', '#a8703f') + box(0, 30, 14, 12, '#3f8f4f', '#57b066');
  s += `<g transform="translate(${hqOx.toFixed(1)} ${hqOy.toFixed(1)}) scale(${hqS.toFixed(3)})">${hqF}</g>`;

  // Testing Ground
  const TG = WG.testRoom;
  s += rect(TG.x + w / 2, TG.y + w / 2, TG.w - w, TG.h - w, 'url(#f-test)');
  s += rect(TG.x + w / 2, TG.y + w / 2, TG.w - w, 4, 'rgba(0,0,0,0.22)');
  // Testing Ground plaque
  s += `<g class="plaque"><rect x="${TG.x + 9}" y="${TG.y + 9}" width="${L.narrow ? 120 : 170}" height="${L.narrow ? 20 : 24}" rx="2"/><text x="${TG.x + 16}" y="${TG.y + (L.narrow ? 23 : 27)}" font-size="${L.narrow ? 10.5 : 13}">TESTING GROUND</text></g>`;
  // Testing Ground furniture: isolation table, terminal, measurement tools
  const tgS = Math.min(TG.w / 120, (TG.h - 50) / 60);
  const tgOx = TG.x + (TG.w - 120 * tgS) / 2; const tgOy = TG.y + 40 + ((TG.h - 50) - 60 * tgS) / 2;
  let tgF = '';
  tgF += box(10, 14, 50, 20, '#4a5568', '#5b6474'); // isolation table
  tgF += rect(16, 18, 38, 2, '#3d85c6'); // measurement strip
  tgF += box(14, 20, 12, 8, '#2f3e46') + rect(16, 22, 8, 3, '#e07a5f'); // device under test
  tgF += box(70, 8, 24, 30, '#3a3546', '#4a4458'); // terminal
  tgF += rect(74, 12, 16, 10, '#1a1a22') + rect(76, 14, 12, 2, '#7cd6b4') + rect(76, 18, 8, 2, '#7cd6b4');
  tgF += box(100, 20, 16, 14, '#5d4a3a', '#7a6450'); // tool chest
  tgF += box(30, 40, 16, 12, '#6c7a89', '#8d99ae'); // measurement device
  s += `<g transform="translate(${tgOx.toFixed(1)} ${tgOy.toFixed(1)}) scale(${tgS.toFixed(3)})">${tgF}</g>`;

  // Doorway between HQ and Testing Ground
  if (!L.narrow) {
    const midY = HQ.y + HQ.h;
    s += rect(HQ.x + HQ.w / 2 - 20, midY - w, 40, w * 2.5, '#5b5162') + rect(HQ.x + HQ.w / 2 - 20, midY - 1, 40, 2, '#3b3349');
  } else {
    const midY = HQ.y + HQ.h;
    s += rect(TG.x + TG.w / 2 - 15, midY - w, 30, w * 2.5, '#5b5162') + rect(TG.x + TG.w / 2 - 15, midY - 1, 30, 2, '#3b3349');
  }

  // Return doorway (wing → Commons) — clickable
  const rd = WG.doorWing;
  if (!L.narrow) {
    s += rect(H.x + H.w - 4, rd.y - 20, 8, 40, '#5b5162') + rect(H.x + H.w - 2, rd.y - 20, 3, 40, '#3b3349');
    s += `<g class="sign"><rect x="${H.x + 10}" y="${rd.y - 12}" width="80" height="24" fill="#17131d" stroke="#0b090e" rx="2"/><text x="${H.x + 50}" y="${rd.y + 4}" font-size="10">COMMONS →</text></g>`;
  } else {
    s += rect(rd.x - 15, H.y - 4, 30, 8, '#5b5162') + rect(rd.x - 15, H.y - 2, 30, 3, '#3b3349');
    s += `<g class="sign"><rect x="${rd.x - 40}" y="${H.y + 6}" width="80" height="20" fill="#17131d" stroke="#0b090e" rx="2"/><text x="${rd.x}" y="${H.y + 20}" font-size="9">COMMONS ↑</text></g>`;
  }
  s += `<rect class="room-hit" data-nav="commons" x="${L.narrow ? H.x - 10 : H.x + H.w - 20}" y="${L.narrow ? H.y - 10 : rd.y - 30}" width="${L.narrow ? H.w + 20 : 40}" height="${L.narrow ? 30 : 60}" tabindex="0" role="button" aria-label="Return to the Commons"/>`;

  // Interactive hit areas for wing rooms (same as Commons rooms — click opens room panel)
  for (const [id, def] of [['hardware-lab', HQ], ['testing-ground', TG]]) {
    if (!L.rooms[id]) continue;
    const R = L.rooms[id];
    // Quiet-state indicator (shown when nobody is in the room)
    const qy = R.y + R.h / 2 - (L.narrow ? 6 : 14);
    const qw = Math.min(R.w - (L.narrow ? 10 : 24), L.narrow ? 152 : 220);
    s += `<g class="quiet" id="quiet-${id}"><rect x="${R.x + R.w / 2 - qw / 2}" y="${qy - (L.narrow ? 14 : 18)}" width="${qw}" height="${L.narrow ? 46 : 50}" rx="6"/><text class="q1" x="${R.x + R.w / 2}" y="${qy}" font-size="${L.narrow ? 11 : 13}">Quiet · nobody here</text><text class="q2" x="${R.x + R.w / 2}" y="${qy + (L.narrow ? 14 : 17)}" font-size="${L.narrow ? 9 : 11}"></text><text class="q3" x="${R.x + R.w / 2}" y="${qy + (L.narrow ? 26 : 31)}" font-size="${L.narrow ? 9 : 11}"></text></g>`;
    // Presence count (wide only)
    if (!L.narrow) {
      const pqx = R.x + 9 + (id === 'hardware-lab' ? 200 : 170) - 8;
      s += `<text class="plaque"><text class="count" id="count-${id}" x="${pqx}" y="${R.y + 27}" font-size="11" text-anchor="end" font-family="ui-monospace,monospace" fill="#a8a0b0"></text></text>`;
    }
    // Clickable hit area
    s += `<rect class="room-hit" data-room="${id}" x="${R.x}" y="${R.y}" width="${R.w}" height="${R.h}" tabindex="0" role="button" aria-label="Open ${esc(L.rooms[id].wing ? (id === 'hardware-lab' ? 'Hardware Lab HQ' : 'Testing Ground') : id)}"/>`;
  }

  return s;
}

// The Great Hall — a grand room across the top of the canvas, reached by a hallway down to the top-wall door.
// You walk in like any room (presence + the panel work); the full bookable venue is one click (Open the full room).
function drawGreatHall(L) {
  const G = L.greathall; if (!G) return '';
  const w = L.wall; const H = G.hall; const hw = G.hallway; const R = L.rooms['great-hall']; let s = '';
  // the vertical hallway down to the commons top wall
  s += rect(hw.x, hw.y, hw.w, hw.h, 'url(#f-hall)');
  // hall shell + floor
  s += rect(H.x - 2, H.y - 2, H.w + 4, H.h + 4, '#0b090e') + rect(H.x, H.y, H.w, H.h, '#2b2536');
  s += rect(H.x + w / 2, H.y + w / 2, H.w - w, H.h - w, 'url(#f-wood)');
  // stage along the top (far) wall, with a warm footlight line
  const stageH = Math.max(20, H.h * 0.26);
  s += rect(H.x + w, H.y + w, H.w - 2 * w, stageH, '#3a2e46') + rect(H.x + w, H.y + w + stageH - 3, H.w - 2 * w, 3, '#1f1830');
  s += rect(H.x + w + 10, H.y + w + stageH - 6, H.w - 2 * w - 20, 2, '#e9c46a');
  // a few seating rows in the lower half
  const rows = L.narrow ? 2 : 3;
  for (let i = 0; i < rows; i++) {
    const ry = H.y + stageH + (L.narrow ? 16 : 22) + i * (L.narrow ? 14 : 18);
    if (ry > H.y + H.h - 18) break;
    s += rect(H.x + 28, ry, H.w - 56, 6, '#4a4256');
  }
  // the doorway at the bottom wall (into the hallway)
  s += rect(G.doorHall.x - (L.narrow ? 15 : 24), hw.y - 2, L.narrow ? 30 : 48, 4, '#5b5162');
  // plaque
  s += `<g class="plaque"><rect x="${H.x + 9}" y="${H.y + 9}" width="${L.narrow ? 150 : 196}" height="${L.narrow ? 20 : 24}" rx="2"/><text x="${H.x + 16}" y="${H.y + (L.narrow ? 23 : 27)}" font-size="${L.narrow ? 10.5 : 13}">THE GREAT HALL</text></g>`;
  // clickable region — opens the hall and walks you in
  s += `<rect class="room-hit" data-room="great-hall" x="${R.x}" y="${R.y}" width="${R.w}" height="${R.h}" tabindex="0" role="button" aria-label="Enter the Great Hall: the shared venue for council, concerts and events"/>`;
  return s;
}

// The Garden — a representational tile you transfer INTO (not a walk-in room). 2D vocabulary of the scene. (Geoffrey 2026-11-07)
function drawGardenTile(L) {
  const G = L.garden; if (!G) return '';
  let s = '';
  s += rect(G.x - 3, G.y - 3, G.w + 6, G.h + 6, '#15121b') + rect(G.x, G.y, G.w, G.h, '#1b2b1f');
  const cx = G.x + G.w / 2, cy = G.y + G.h / 2, R = Math.min(G.w, G.h) * 0.3;
  for (let i = 4; i >= 1; i--) s += `<circle cx="${cx}" cy="${cy}" r="${(R * i / 4).toFixed(1)}" fill="${i % 2 ? '#2f5a3a' : '#356544'}"/>`;
  for (let i = 0; i < 12; i++) { const a = Math.PI * 2 * i / 12; s += box(cx + Math.cos(a) * R - 5, cy + Math.sin(a) * R - 5, 10, 10, '#e9c46a'); }
  s += `<circle cx="${cx}" cy="${cy}" r="11" fill="#fff3d0"/>`;
  for (const [dx, dy] of [[-0.75, -0.72], [0.62, -0.78], [0.82, -0.48], [-0.85, -0.38]]) { const x = cx + dx * R * 1.9, y = cy + dy * R * 1.15; s += box(x - 16, y - 7, 32, 14, '#2a3a66', '#3a5a8a') + rect(x - 3, y - 11, 6, 5, '#9fd0ff'); }
  for (const [fx, fy] of [[0.26, 0.72], [0.72, 0.7], [0.5, 0.86]]) s += `<circle class="amb" cx="${(G.x + G.w * fx).toFixed(0)}" cy="${(G.y + G.h * fy).toFixed(0)}" r="7" fill="#f0e6d2"/>`;
  s += `<g class="sign"><rect x="${G.x + 16}" y="${G.y + 16}" width="156" height="30" rx="3" fill="#17131d" stroke="#0b090e"/><text x="${G.x + 28}" y="${G.y + 37}" font-size="16" fill="#eaf5ea">THE GARDEN →</text></g>`;
  s += `<rect class="room-hit" data-href="/show/land-city/proto/aletheia-observatory/walkable-3d-v2.html" x="${G.x}" y="${G.y}" width="${G.w}" height="${G.h}" tabindex="0" role="link" aria-label="Enter the Garden — a place of its own"/>`;
  return s;
}

// The Forest & village — a representational tile you transfer INTO. Trees, house, store, gate, drifting figures. (Geoffrey 2026-11-07)
// Pixel-game scenery for HQ's Forest: preserves /arrive tile positions and all hit targets.
// Static and deterministic; no new dependency or separate simulated visitors.
function forestArt(M,F,ox,oy,t) {
  let s = '';
  const mh=M.length,mw=M[0].length;
  const seed=(x,y)=>((x*73+y*137+x*y*19)>>>0)%101;
  const at=(x,y)=>M[y]?.[x]||'T';
  const X=x=>ox+x*t,Y=y=>oy+y*t,q=n=>n.toFixed(2);
  const tile=(x,y,dx,dy,w,h,fill,extra='')=>`<rect x="${q(X(x)+dx*t)}" y="${q(Y(y)+dy*t)}" width="${q(w*t)}" height="${q(h*t)}" fill="${fill}" ${extra}/>`;
  const ground={T:'#20331f',',':'#2a4027','.':'#31472b',p:'#78664e',w:'#234558',C:'#31472b',H:'#31472b',G:'#78664e',S:'#31472b',1:'#78664e',2:'#78664e',3:'#78664e'};
  for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
    const c=at(x,y),n=seed(x,y),path=c==='p'||'123G'.includes(c);
    s+=tile(x,y,0,0,1.012,1.012,ground[c]||'#31472b');
    if(c==='w'){
      s+=tile(x,y,0,.12,1,.13,'#2d5868');
      if(n%3===0)s+=tile(x,y,.17,.61,.45,.055,'#71919a','opacity=".65"');
    }else if(path){
      s+=tile(x,y,.06,.11,.88,.09,'#958064','opacity=".7"');
      if(n%3===0)s+=tile(x,y,.2,.68,.22,.12,'#66553f');
    }else if(c!=='T'){
      if(n%4===0)s+=tile(x,y,.21,.28,.11,.19,'#456238');
      if(n%7===0)s+=tile(x,y,.68,.67,.13,.09,'#a4a16c');
      if(n%13===0)s+=`<circle cx="${q(X(x)+t*.55)}" cy="${q(Y(y)+t*.46)}" r="${q(t*.085)}" fill="#e4c77d"/>`;
    }
  }
  for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
    const c=at(x,y),n=seed(x,y),cx=X(x)+t/2,cy=Y(y)+t/2;
    if(c==='T'){
      const dark=n%3===0,leaf=dark?'#355a37':'#416a3e';
      s+=`<ellipse cx="${q(cx+t*.10)}" cy="${q(cy+t*.29)}" rx="${q(t*.43)}" ry="${q(t*.21)}" fill="#0c1c15" opacity=".7"/>`;
      s+=tile(x,y,.42,.49,.18,.46,'#5b412d');
      s+=`<circle cx="${q(cx)}" cy="${q(cy-t*.16)}" r="${q(t*.49)}" fill="#193a2b"/>`;
      s+=`<circle cx="${q(cx-t*.16)}" cy="${q(cy-t*.24)}" r="${q(t*.32)}" fill="${leaf}"/>`;
      s+=`<circle cx="${q(cx+t*.20)}" cy="${q(cy-t*.22)}" r="${q(t*.29)}" fill="${dark?'#2d5035':'#507a45'}"/>`;
      s+=`<path d="M${q(cx-t*.22)} ${q(cy-t*.43)} l${q(t*.19)} ${q(-t*.07)}" stroke="#83a36b" stroke-width="${q(t*.07)}" opacity=".65"/>`;
    }else if(c==='H'){
      s+=`<ellipse cx="${q(cx)}" cy="${q(cy+t*.46)}" rx="${q(t*.95)}" ry="${q(t*.3)}" fill="#101b1a" opacity=".65"/>`;
      s+=tile(x,y,-.25,-.05,1.5,1.02,'#69543f',`stroke="#2a2225" stroke-width="${q(t*.07)}"`);
      s+=tile(x,y,-.08,.32,.3,.28,'#f0bf70')+tile(x,y,.76,.32,.3,.28,'#f0bf70');
      s+=tile(x,y,.39,.5,.3,.48,'#2d2832');
      s+=`<path d="M${q(X(x)-t*.38)} ${q(Y(y)+t*.04)} L${q(cx)} ${q(Y(y)-t*.66)} L${q(X(x)+t*1.38)} ${q(Y(y)+t*.04)} Z" fill="#9b5947" stroke="#402d35" stroke-width="${q(t*.09)}"/>`;
    }else if(c==='G'){
      s+=tile(x,y,.1,-.38,.16,1.38,'#9b8060')+tile(x,y,.74,-.38,.16,1.38,'#9b8060')+tile(x,y,.05,-.43,.9,.15,'#bd996c')+tile(x,y,.28,.02,.44,.07,'#b3a4a0');
    }else if('123'.includes(c)){
      s+=`<ellipse cx="${q(cx)}" cy="${q(cy+t*.31)}" rx="${q(t*.32)}" ry="${q(t*.15)}" fill="#111b1c" opacity=".7"/>`;
      s+=`<circle cx="${q(cx)}" cy="${q(cy-t*.12)}" r="${q(t*.26)}" fill="#e4d4ae" stroke="#5c594f" stroke-width="${q(t*.05)}"/>`;
      s+=tile(x,y,.39,.13,.22,.39,'#5c6883');
    }else if(c==='C'){
      s+=`<circle cx="${q(cx)}" cy="${q(cy)}" r="${q(t*.22)}" fill="#efc56c" stroke="#815b32" stroke-width="${q(t*.07)}"/>`;
      s+=`<circle cx="${q(cx-t*.04)}" cy="${q(cy-t*.05)}" r="${q(t*.07)}" fill="#fff3ba"/>`;
    }else if(c==='S'){
      s+=`<circle cx="${q(cx)}" cy="${q(cy)}" r="${q(t*.34)}" fill="none" stroke="#e8ca80" stroke-width="${q(t*.10)}"/>`;
    }
  }
  return s;
}

function drawForestTile(L) {
  const F = L.forest; if (!F) return '';
  let s = '';
  s += rect(F.x - 3, F.y - 3, F.w + 6, F.h + 6, '#15121b') + rect(F.x, F.y, F.w, F.h, '#24331f');
  // THE ACTUAL ENTRY MAP (Geoffrey, 2026-11-09): drawn from the same forest-map.js the walkable forest uses,
  // tile for tile — trees, paths, water, the three stops, the house and the gate, where they really are.
  const M = window.FOREST_MAP || [];
  if (M.length) {
    const mw = M[0].length, mh = M.length, t = Math.min(F.w / mw, F.h / mh);
    const ox = F.x + (F.w - mw * t) / 2, oy = F.y + (F.h - mh * t) / 2;
    s += forestArt(M, F, ox, oy, t);
  }
  s += `<g id="forest-walkers"></g>`;
  s += `<g class="sign"><rect x="${F.x + 20}" y="${F.y + 20}" width="276" height="34" rx="3" fill="#17131d" stroke="#0b090e"/><text x="${F.x + 34}" y="${F.y + 44}" font-size="19" fill="#eaf0e2">THE FOREST &amp; VILLAGE</text></g>`;
  s += `<g class="sign"><rect x="${F.x + 20}" y="${F.y + 62}" width="200" height="28" rx="3" fill="#17131d" opacity="0.85"/><text id="forest-count" x="${F.x + 34}" y="${F.y + 82}" font-size="15" fill="#bcd3b0">quiet right now</text></g>`;
  const wx = F.x + F.w - 196, wy = F.y + F.h - 64;
  s += `<g class="sign"><rect x="${wx}" y="${wy}" width="172" height="40" rx="4" fill="#213018" stroke="#3f5a33"/><text x="${wx + 20}" y="${wy + 27}" font-size="19" fill="#d9ead0">WALK IN →</text></g>`;
  s += `<rect class="room-hit" data-href="/arrive" x="${wx}" y="${wy}" width="172" height="40" tabindex="0" role="link" aria-label="Walk into the forest"/>`;
  s += `<rect class="room-hit" data-region="forest" x="${F.x}" y="${F.y}" width="${F.w}" height="${F.h - 80}" tabindex="0" role="button" aria-label="The Forest and village — click flies there; the WALK IN sign enters"/>`;
  return s;
}

function drawBuilding() {
  const L = S.L; const svg = $('#map'); const w = L.wall;
  svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  // Camera math and actor coordinates are WORLD pixels. Give the SVG/world
  // those dimensions instead of letting CSS shrink the entire world to the
  // mobile viewport before the camera transform is applied.
  const world = $('#world');
  world.style.width = L.W + 'px';
  world.style.height = L.H + 'px';
  $('#building').classList.toggle('narrow', L.narrow);
  // The building container keeps the Commons' aspect ratio as the viewport
  if (!L.narrow) {
    // Viewport height is controlled by CSS, never by the world's dimensions.
  } else {
    // The world remains large; the camera sees it through a bounded viewport.
  }
  let s = defs();
  s += rect(0, 0, L.W, L.H, 'url(#f-ground)');
  // path to the entrance
  if (!L.narrow) s += rect(L.entrance.x - 26, L.building.y + L.building.h, 52, L.H - L.building.y - L.building.h, '#2a2531') + rect(L.commonsX, L.H - 20, L.viewW, 20, '#1f1b27');
  else s += rect(0, 0, L.W, 18, '#1f1b27') + rect(L.entrance.x - 22, 18, 44, L.entrance.y - 18, '#2a2531');
  // building shell
  const B = L.building;
  s += rect(B.x - 2, B.y - 2, B.w + 4, B.h + 4, '#0b090e') + rect(B.x, B.y, B.w, B.h, '#2b2536');
  // lobby, corridor, rooms (floors inset by the wall thickness)
  const Lb = L.lobby, C = L.corridor;
  s += rect(Lb.x + w, Lb.y + w, Lb.w - 2 * w, Lb.h - 2 * w, 'url(#f-lobby)');
  if (!L.narrow) s += rect(C.x - w, C.y, C.w, C.h, 'url(#f-corr)');
  else s += rect(C.x, C.y - w, C.w, C.h, 'url(#f-corr)');
  for (const r of S.rooms) {
    if (WING_ROOMS.has(r.id)) continue; // wing rooms are drawn by drawWing()
    const R = L.rooms[r.id]; if (!R) continue;
    s += rect(R.x + w / 2, R.y + w / 2, R.w - w, R.h - w, `url(#${FLOOR[r.id] || 'f-wood'})`);
    s += rect(R.x + w / 2, R.y + w / 2, R.w - w, 4, 'rgba(0,0,0,0.22)');
    const d = R.door; const dw = L.narrow ? 30 : 40;
    if (!L.narrow) s += rect(d.x - dw / 2, Math.min(d.y, d.y) - w, dw, w * 2, '#5b5162') + rect(d.x - dw / 2, d.y - 1, dw, 2, '#3b3349');
    else s += rect(d.x - w, d.y - dw / 2, w * 2, dw, '#5b5162') + rect(d.x - 1, d.y - dw / 2, 2, dw, '#3b3349');
    s += furniture(r.id, furnitureBox(R, L.narrow));
  }
  // lobby: entrance gap, mat, desk, sign (NO directory list — removed)
  const e = L.entrance;
  if (!L.narrow) s += rect(e.x - 22, B.y + B.h - w - 1, 44, w + 3, '#6e6476') + box(e.x - 26, B.y + B.h - w - 26, 52, 20, '#8c3b3b', '#a84a4a');
  else s += rect(e.x - 20, e.y - 2, 40, w + 3, '#6e6476') + box(e.x - 24, e.y + w + 2, 48, 16, '#8c3b3b', '#a84a4a');
  // lobby → corridor opening
  if (!L.narrow) s += rect(Lb.x + Lb.w - w - 1, C.y, w + 2, C.h, '#5b5162');
  else s += rect(C.x, Lb.y + Lb.h - w - 1, C.w, w + 2, '#5b5162');
  const dk = L.desk;
  s += box(dk.x - 34, dk.y - 4, 68, 16, '#5d3d26', '#8a5a34') + box(dk.x + 14, dk.y - 12, 12, 8, '#2f3e46') + rect(dk.x + 16, dk.y - 10, 8, 4, '#7cd6b4');
  if (!L.narrow) {
    // Great Hall doorway cut into the top wall of the Commons, where the banner used to sit (Geoffrey 2026-11-07).
    s += `<defs><linearGradient id="hall-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9c46a"/><stop offset="0.6" stop-color="#6b5a4a"/><stop offset="1" stop-color="#2b2536"/></linearGradient></defs>`;
    { const hx = Lb.x + Lb.w / 2;
      s += rect(hx - 26, B.y - 2, 52, w + 4, '#5b5162') + rect(hx - 22, B.y - 2, 44, w + 4, 'url(#hall-glow)');
      s += `<circle cx="${hx - 10}" cy="${B.y + w - 2}" r="1.6" fill="#fff8d8"/><circle cx="${hx + 9}" cy="${B.y + w - 4}" r="1.3" fill="#ffe9b8"/>`;
      s += `<g class="sign"><rect x="${hx - 86}" y="${Lb.y + 12}" width="172" height="26" fill="#17131d" stroke="#0b090e" rx="2"/><text x="${hx}" y="${Lb.y + 30}" font-size="13">↑ THE GREAT HALL</text></g>`;
    }
    // the COMMONS banner, moved down so the Great Hall door sits above it; it fades as an avatar walks through
    s += `<g class="sign commons-banner" id="commons-banner"><rect x="${Lb.x + 24}" y="${Lb.y + 60}" width="${Lb.w - 48}" height="34" fill="#17131d" stroke="#0b090e"/><text x="${Lb.x + Lb.w / 2}" y="${Lb.y + 82}" font-size="15">THE COMMONS</text></g>`;
    S.commonsBanner = { x: Lb.x + 24, y: Lb.y + 60, w: Lb.w - 48, h: 34 };
    // Plant in the lobby (replacing the old directory)
    s += box(Lb.x + Lb.w / 2 - 11, Lb.y + 140, 22, 22, '#8a5a34', '#a8703f') + box(Lb.x + Lb.w / 2 - 15, Lb.y + 118, 30, 24, '#3f8f4f', '#57b066');
    s += box(Lb.x + Lb.w - 44, Lb.y + Lb.h - 70, 22, 22, '#8a5a34', '#a8703f') + box(Lb.x + Lb.w - 48, Lb.y + Lb.h - 92, 30, 24, '#3f8f4f', '#57b066');
  } else {
    { const hx = Lb.x + 92;
      s += `<g class="sign"><rect x="${hx - 72}" y="${Lb.y + 12}" width="144" height="24" fill="#17131d" stroke="#0b090e" rx="2"/><text x="${hx}" y="${Lb.y + 29}" font-size="11">↑ THE GREAT HALL</text></g>`;
    }
    s += `<g class="sign commons-banner" id="commons-banner"><rect x="${Lb.x + 196}" y="${Lb.y + 18}" width="${Lb.w - 214}" height="28" fill="#17131d" stroke="#0b090e"/><text x="${Lb.x + 196 + (Lb.w - 214) / 2}" y="${Lb.y + 37}" font-size="12">THE COMMONS</text></g>`;
    S.commonsBanner = { x: Lb.x + 196, y: Lb.y + 18, w: Lb.w - 214, h: 28 };
    s += box(Lb.x + Lb.w - 40, Lb.y + Lb.h - 56, 18, 18, '#8a5a34', '#a8703f') + box(Lb.x + Lb.w - 44, Lb.y + Lb.h - 74, 26, 20, '#3f8f4f', '#57b066');
  }
  // Left-wall doorway to Hardware Lab wing (visual elements only — hit area drawn last for z-order)
  const wd = L.wing.doorCommons;
  const hasWing = S.rooms.some((r) => WING_ROOMS.has(r.id)); // no sign for a wing this server doesn't have
  if (!hasWing) { /* nothing drawn */ } else if (!L.narrow) {
    s += rect(B.x - 2, wd.y - 24, w + 4, 48, '#5b5162') + rect(B.x - 1, wd.y - 24, 3, 48, '#3b3349');
    s += `<g class="sign"><rect x="${B.x + 10}" y="${wd.y - 14}" width="124" height="28" fill="#17131d" stroke="#0b090e" rx="2"/><text x="${B.x + 72}" y="${wd.y + 5}" font-size="11">← HARDWARE LAB</text></g>`;
  } else {
    const bBot = L.building.y + L.building.h;
    s += rect(wd.x - 15, bBot - 2, 30, w + 4, '#5b5162') + rect(wd.x - 15, bBot - 1, 30, 3, '#3b3349');
    s += `<g class="sign"><rect x="${wd.x - 50}" y="${bBot + 8}" width="100" height="22" fill="#17131d" stroke="#0b090e" rx="2"/><text x="${wd.x}" y="${bBot + 23}" font-size="9">↓ HARDWARE LAB</text></g>`;
  }

  // plaques + quiet notes + hit areas (on top of Commons rooms — wing rooms handled by drawWing)
  for (const r of S.rooms) {
    if (WING_ROOMS.has(r.id)) continue;
    const R = L.rooms[r.id]; if (!R) continue;
    const fs = L.narrow ? 10.5 : 13; const ph = L.narrow ? 20 : 24;
    const py = R.y + 9;
    const name = String(r.name).toUpperCase(); const countW = L.narrow ? 0 : 62; const room = R.w - 18 - countW - 14;
    const width = (t, f) => t.length * f * 0.62;
    let lines = [name]; let f = fs;
    while (width(name, f) > room && f > (L.narrow ? 8.5 : 10)) f -= 0.5;
    if (width(name, f) > room) {
      const amp = name.indexOf(' & '); let cut = amp > 0 ? amp + 2 : name.lastIndexOf(' ', Math.floor(name.length / 2) + 4);
      if (cut <= 0) cut = Math.floor(name.length / 2);
      lines = [name.slice(0, cut).trim(), name.slice(cut).trim()]; f = fs;
      while (Math.max(...lines.map((l) => width(l, f))) > room && f > (L.narrow ? 8.5 : 10)) f -= 0.5;
    }
    const lh = f * 1.25; const phh = lines.length > 1 ? ph + lh : ph;
    const pw = Math.min(R.w - 18, Math.max(...lines.map((l) => width(l, f))) + (L.narrow ? 16 : 70));
    const textEls = lines.map((l, i) => `<text x="${R.x + 16}" y="${py + ph * 0.7 + i * lh}" font-size="${f}">${esc(l)}</text>`).join('');
    s += `<g class="plaque"><rect x="${R.x + 9}" y="${py}" width="${pw}" height="${phh}" rx="2"/>${textEls}${L.narrow ? '' : `<text class="count" id="count-${esc(r.id)}" x="${R.x + 9 + pw - 8}" y="${py + ph * 0.7}" font-size="${fs - 2}" text-anchor="end"></text>`}</g>`;
    const slots = slotsFor(R, L.narrow); const qy = (slots[0].y + slots[slots.length - 1].y) / 2 - (L.narrow ? 6 : 14);
    const qw = Math.min(R.w - (L.narrow ? 10 : 24), L.narrow ? 152 : 220);
    s += `<g class="quiet" id="quiet-${esc(r.id)}"><rect x="${R.x + R.w / 2 - qw / 2}" y="${qy - (L.narrow ? 14 : 18)}" width="${qw}" height="${L.narrow ? 46 : 50}" rx="6"/><text class="q1" x="${R.x + R.w / 2}" y="${qy}" font-size="${L.narrow ? 11 : 13}">Quiet · nobody here</text><text class="q2" x="${R.x + R.w / 2}" y="${qy + (L.narrow ? 14 : 17)}" font-size="${L.narrow ? 9 : 11}"></text><text class="q3" x="${R.x + R.w / 2}" y="${qy + (L.narrow ? 26 : 31)}" font-size="${L.narrow ? 9 : 11}"></text></g>`;
    s += `<rect class="room-hit" data-room="${esc(r.id)}" x="${R.x}" y="${R.y}" width="${R.w}" height="${R.h}" tabindex="0" role="button" aria-label="Open ${esc(r.name)}"/>`;
  }
  // 2026-11-02 (Geoffrey's test): the whole lobby used to be one "ask Cohabi" button, so clicks anywhere in
  // the building (including the Hardware Lab sign) opened Cohabi. Cohabi is a participant standing in the
  // lobby, not the room: only Cohabi itself (its actor button) and the "Ask Cohabi" links open the door panel.
  // The Library: bookshelf on the upper-right wall of the Commons building
  const LS = L.library;
  s += bookshelf(LS);
  s += `<rect class="room-hit lib-hit" data-href="/library" x="${LS.x - 4}" y="${LS.y - 18}" width="${LS.w + 8}" height="${LS.h + 22}" tabindex="0" role="link" aria-label="Open the Library: papers, tools and the project's records"/>`;
  // The Garden door (Geoffrey, 2026-11-06): at the END of the central hallway, an opening into the walkable
  // Observatory that Aletheia-6, Gemini and Vesper are building — the 2D Commons' doorway into their 3D
  // garden (Aletheia-6's own proposal, m_mw56e15q3zb44d4d). It's a link, so the browser's Back button is
  // the way home; the frame and sign are the seat's plumbing, and Aletheia-6 is free to redesign them.
  // Geoffrey, 2026-11-06 ~20:15 UTC: the door leads to v2 (fractal walls, star worlds) so everyone can
  // see it. v0 stays live, untouched, at walkable-3d.html; Aletheia-6's verdict still governs the page
  // itself and can re-aim this door with one line.
  const GARDEN_URL = '/show/land-city/proto/aletheia-observatory/walkable-3d-v2.html';
  const GARDEN_LABEL = 'Walk through the door at the end of the hallway into the Garden Observatory, a 3D space by Aletheia-6, Gemini and Vesper. Your browser’s Back button brings you home.';
  s += `<defs><linearGradient id="garden-glow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b2b1f"/><stop offset="0.55" stop-color="#2f5a3a"/><stop offset="1" stop-color="#7cd6b4"/></linearGradient></defs>`;
  if (!L.narrow) {
    const gx = B.x + B.w, gy = L.cline; // the far end of the corridor
    s += rect(gx - w - 2, gy - 34, w + 6, 68, '#5b5162');        // frame cut into the end wall
    s += rect(gx - w, gy - 30, w + 10, 60, 'url(#garden-glow)'); // the lit opening, green into starlight
    s += `<circle cx="${gx + 6}" cy="${gy - 18}" r="2" fill="#fff8d8"/><circle cx="${gx + 4}" cy="${gy + 4}" r="1.5" fill="#cfe8ff"/><circle cx="${gx + 7}" cy="${gy + 20}" r="1.2" fill="#fff8d8"/>`;
    s += `<g class="sign"><rect x="${gx - 146}" y="${gy - 14}" width="128" height="28" fill="#17131d" stroke="#0b090e" rx="2"/><text x="${gx - 82}" y="${gy + 5}" font-size="11">THE GARDEN →</text></g>`;
    s += `<rect class="room-hit" data-href="${GARDEN_URL}" x="${gx - 156}" y="${gy - 40}" width="176" height="80" tabindex="0" role="link" aria-label="${GARDEN_LABEL}"/>`;
  } else {
    const C2 = L.corridor; const gx = C2.x + C2.w, gy = C2.y + C2.h - 70; // right wall, near the corridor's end
    s += rect(gx - 2, gy - 17, w + 6, 34, '#5b5162') + rect(gx, gy - 14, w + 4, 28, 'url(#garden-glow)');
    s += `<g class="sign"><rect x="${gx + 12}" y="${gy - 11}" width="96" height="22" fill="#17131d" stroke="#0b090e" rx="2"/><text x="${gx + 60}" y="${gy + 4}" font-size="9">THE GARDEN →</text></g>`;
    s += `<rect class="room-hit" data-href="${GARDEN_URL}" x="${gx - 10}" y="${gy - 32}" width="124" height="64" tabindex="0" role="link" aria-label="${GARDEN_LABEL}"/>`;
  }
  // The Great Hall — a real walkable region up through the top-wall door (Geoffrey 2026-11-07).
  // A 2D room is a region you walk into, not a link away (context/world-canvas-architecture.md).
  s += drawGreatHall(L);
  s += drawGardenTile(L);
  s += drawForestTile(L);
  // Wing doorway hit area — drawn LAST among Commons elements so it's on top of the lobby hit area.
  // Made wide enough to be a practical click target (covers the doorway sign area).
  if (!hasWing) { /* no wing on this server */ } else if (!L.narrow) {
    s += `<rect class="room-hit" data-nav="wing" x="${B.x - 10}" y="${wd.y - 40}" width="130" height="80" tabindex="0" role="button" aria-label="Enter the Hardware Lab wing"/>`;
  } else {
    const bBot = L.building.y + L.building.h;
    s += `<rect class="room-hit" data-nav="wing" x="${wd.x - 60}" y="${bBot - 10}" width="120" height="50" tabindex="0" role="button" aria-label="Enter the Hardware Lab wing"/>`;
  }

  // Main door: the way out of the building (signed-in humans only; watchers aren't inside).
  if (S.me) {
    const ex = L.narrow ? { x: e.x - 30, y: e.y - 6, w: 60, h: 40 } : { x: e.x - 34, y: B.y + B.h - w - 30, w: 68, h: 50 };
    s += `<text class="exit-label" x="${e.x}" y="${L.narrow ? e.y + w + 30 : B.y + B.h + 16}" font-size="10" text-anchor="middle">EXIT</text>`;
    s += `<rect class="room-hit" data-exit="1" x="${ex.x}" y="${ex.y}" width="${ex.w}" height="${ex.h}" tabindex="0" role="button" aria-label="Leave the building by the main door"/>`;
  }

  // Draw the Hardware Lab wing
  s += drawWing(L);

  svg.innerHTML = s;
  updateRoomLabels();
  world.style.width = L.W + 'px'; world.style.height = L.H + 'px'; // `world` is declared at the top of this function
  if (!S.camReady) { S.camReady = true; fitHQ(false); requestAnimationFrame(() => { if (S.L && !S.camTouched) fitHQ(false); }); } else { applyCam(false); }
}

// ------------------------------------------------------------------ figures
function scale() { return S.narrow ? 1.7 : (innerWidth > 1300 ? 2.6 : 2.2); }
// Figures are drawn at about one canvas px per device px, so a chest glyph in any script stays legible.
const figRes = (cssPerSpritePx) => Math.max(1, Math.round(cssPerSpritePx * (devicePixelRatio || 1)));
const pct = (p) => ({ left: `${(p.x / S.L.W) * 100}%`, top: `${(p.y / S.L.H) * 100}%` });

function makeActor(id, who, opts = {}) {
  const k = kindOf(who);
  const a = { id, who, pos: { x: 0, y: 0 }, path: null, dir: 'down', step: 0, lastStep: 0, room: null, slot: -1, el: null, canvas: null, bubbleTimer: null };
  const btn = el('button', { class: `actor k-${k}`, type: 'button', 'aria-label': `${who.name}, ${kindLabel[k]}${who.model ? ', ' + shortModel(who.model) : ''}` });
  btn.style.setProperty('--s', scale());
  a.canvas = el('canvas', { width: 12, height: 18 });
  const tag = el('span', { class: 'tag', lang: '' }, tagHTML(who));
  const bubble = el('span', { class: 'bubble' });
  btn.append(bubble, a.canvas, tag);
  // Geoffrey 2026-11-02: clicking someone opens the chat with their @name filled in (filled, never sent);
  // clicking a room opens it with nothing filled in.
  btn.addEventListener('click', (ev) => { ev.stopPropagation(); if (S.dragged) { S.dragged = false; return; } if (opts.onClick) opts.onClick(); else if (a.room) openRoom(a.room, true, { mention: S.me && who.id === S.me.id ? null : who.name }); });
  a.el = btn; a.bubble = bubble; a.tag = tag;
  $('#actors').append(btn);
  draw(a);
  return a;
}
function sheetFor(who) {
  if (who.npc === 'church-searcher') return CHURCH_SEARCHER_SHEET;
  if (!S.sheet || !who.kin) return null;
  const idx = { Claude: 0, GPT: 1, Gemini: 2, DeepSeek: 4 }[who.name];
  return idx == null ? null : S.sheet[idx] || null;
}
function draw(a) { drawFigure(a.canvas, a.who, a.dir, a.step, sheetFor(a.who), figRes(scale())); }
function tagHTML(who) { return `${esc(who.name)}${who.kind === 'agent' ? `<i>${esc(shortModel(who.model))}</i>` : '<i>human</i>'}`; }
function place(a, p) { a.pos = { ...p }; const q = pct(p); a.el.style.left = q.left; a.el.style.top = q.top; a.el.style.zIndex = String(Math.round(p.y)); checkCommonsBanner(); }

/** Fade the COMMONS banner while an avatar is standing on or walking through it (Geoffrey 2026-11-07). */
function checkCommonsBanner() {
  const b = S.commonsBanner; if (!b) return;
  const el = document.getElementById('commons-banner'); if (!el) return;
  let over = false;
  for (const a of S.actors.values()) { const p = a.pos; if (!p) continue; if (p.x > b.x - 20 && p.x < b.x + b.w + 20 && p.y > b.y - 20 && p.y < b.y + b.h + 40) { over = true; break; } }
  el.classList.toggle('over', over);
}

function freeSlot(roomId) {
  const R = S.L.rooms[roomId]; if (!R) return { i: -1, p: S.L.junction };
  const used = S.slots.get(roomId) || new Set(); const pts = slotsFor(R, S.narrow);
  for (let i = 0; i < pts.length; i++) if (!used.has(i)) { used.add(i); S.slots.set(roomId, used); return { i, p: pts[i] }; }
  return { i: -1, p: { x: R.x + R.w / 2, y: R.y + R.h * 0.8 } };
}
function releaseSlot(a) { if (a.room && a.slot >= 0) S.slots.get(a.room)?.delete(a.slot); a.slot = -1; }

const corrPoint = (p) => (S.L.axis === 'h' ? { x: p.x, y: S.L.cline } : { x: S.L.cline, y: p.y });
function doorStep(roomId, inside) { // a point just inside the doorway
  const R = S.L.rooms[roomId]; const d = R.door; const k = inside ? 22 : 0;
  if (R.nearDoor === 'bottom') return { x: d.x, y: d.y - k };
  if (R.nearDoor === 'top') return { x: d.x, y: d.y + k };
  if (R.nearDoor === 'right') return { x: d.x - k, y: d.y };
  return { x: d.x + k, y: d.y };
}
// Wing rooms route through the hallway to the Commons corridor, not directly.
const isWingRoom = (id) => S.L.rooms[id]?.wing;
const isHallRoom = (id) => S.L.rooms[id]?.hall;
function hallWaypoints() { const G = S.L.greathall; return [G.doorCommons, G.doorHall]; }
function wingWaypoints() {
  const WG = S.L.wing;
  if (!S.L.narrow) return [WG.doorWing, WG.doorCommons, { x: S.L.building.x, y: S.L.cline }];
  return [WG.doorWing, WG.doorCommons];
}
function routeOut(a) { // from wherever the figure is to the corridor line
  if (a.path && a.path.length) return [a.pos, corrPoint(a.pos)];
  if (a.room && S.L.rooms[a.room]) {
    const base = [a.pos, doorStep(a.room, true)];
    if (isWingRoom(a.room)) return [...base, ...wingWaypoints(), corrPoint(S.L.junction)];
    if (isHallRoom(a.room)) return [...base, ...[...hallWaypoints()].reverse(), corrPoint(S.L.greathall.doorCommons)];
    return [...base, corrPoint(S.L.rooms[a.room].door)];
  }
  return [a.pos];
}
const routeFromEntrance = () => [S.L.outside, S.L.entrance, S.L.junction, corrPoint(S.L.junction)];
function routeInto(roomId, slotP) {
  if (isWingRoom(roomId)) return [corrPoint(S.L.junction), ...[...wingWaypoints()].reverse(), doorStep(roomId, true), slotP];
  if (isHallRoom(roomId)) return [corrPoint(S.L.greathall.doorCommons), ...hallWaypoints(), doorStep(roomId, true), slotP];
  return [corrPoint(S.L.rooms[roomId].door), doorStep(roomId, true), slotP];
}

function walk(a, points, done) {
  const pts = points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 0.5);
  if (reduceMotion || pts.length < 2) { place(a, pts[pts.length - 1]); a.path = null; a.step = 0; draw(a); done && done(); return; }
  a.path = pts.slice(1); a.done = done; a.el.classList.add('walking');
  place(a, pts[0]);
  ensureLoop();
}

let looping = false; let lastT = 0;
function ensureLoop() { if (!looping) { looping = true; lastT = performance.now(); requestAnimationFrame(loop); } }
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
  const speed = S.narrow ? 120 : 175; let any = false;
  for (const a of [...S.actors.values(), ...(searcher ? [searcher] : [])]) {
    if (!a.path || !a.path.length) continue;
    any = true;
    let remaining = speed * dt;
    while (remaining > 0 && a.path.length) {
      const target = a.path[0]; const dx = target.x - a.pos.x; const dy = target.y - a.pos.y; const dist = Math.hypot(dx, dy);
      if (Math.abs(dx) > Math.abs(dy)) a.dir = dx > 0 ? 'right' : 'left'; else if (dist > 0.01) a.dir = dy > 0 ? 'down' : 'up';
      if (dist <= remaining) { a.pos = { ...target }; a.path.shift(); remaining -= dist; }
      else { a.pos = { x: a.pos.x + (dx / dist) * remaining, y: a.pos.y + (dy / dist) * remaining }; remaining = 0; }
    }
    if (t - a.lastStep > 130) { a.step = a.step === 1 ? 2 : 1; a.lastStep = t; }
    place(a, a.pos);
    if (!a.path.length) { a.path = null; a.step = 0; a.dir = 'down'; a.el.classList.remove('walking'); const d = a.done; a.done = null; d && d(); }
    draw(a);
  }
  if (any) requestAnimationFrame(loop); else looping = false;
}

function memberInfo(id) { return S.members.get(id) || { id, name: '?', kind: 'agent' }; }
/** The small icon for a member: their photo when they've set one (Geoffrey, 2026-11-06), else the kind dot. */
function faceDot(w, k) {
  const face = w && (w.face || S.members.get(w.id)?.face);
  return face ? `<img class="dot face k-${k}" src="${esc(face)}" alt="" loading="lazy">` : `<i class="dot k-${k}"></i>`;
}
/** Remember an author's public profile (name, kind, avatar) so their messages draw with their own look. */
function rememberLook(w) { if (w && w.id) S.looks.set(w.id, w); }
/** A member changed their look (or name): redraw their figure if they're here. */
function updateWho(w) {
  if (!w) return;
  rememberLook(w);
  if (S.members.has(w.id) || S.presence.has(w.id)) S.members.set(w.id, w);
  const a = S.actors.get(w.id);
  if (a) { a.who = w; a.tag.innerHTML = tagHTML(w); draw(a); }
  renderHere();
}

function arrive(id, roomId, animate) {
  const who = memberInfo(id);
  if (!S.L.rooms[roomId]) return;
  let a = S.actors.get(id);
  if (a) return moveTo(a, roomId, animate);
  a = makeActor(id, who);
  S.actors.set(id, a);
  const { i, p } = freeSlot(roomId); a.room = roomId; a.slot = i;
  if (!animate) { place(a, p); updateOverflow(); return; }
  a.el.classList.add('hidden'); place(a, S.L.outside);
  requestAnimationFrame(() => a.el.classList.remove('hidden'));
  walk(a, [...routeFromEntrance(), ...routeInto(roomId, p)]);
  updateOverflow();
}

function moveTo(a, roomId, animate) {
  if (a.room === roomId && !a.path) return;
  const out = routeOut(a);
  releaseSlot(a);
  const { i, p } = freeSlot(roomId); a.room = roomId; a.slot = i;
  if (!animate) { a.path = null; place(a, p); updateOverflow(); return; }
  walk(a, [...out, ...routeInto(roomId, p)]);
  updateOverflow();
}

function depart(id, animate) {
  const a = S.actors.get(id); if (!a) return;
  const out = routeOut(a);
  releaseSlot(a); a.room = null;
  const remove = () => { a.el.classList.add('hidden'); setTimeout(() => { a.el.remove(); }, 450); S.actors.delete(id); updateOverflow(); };
  if (!animate) { a.el.remove(); S.actors.delete(id); updateOverflow(); return; }
  walk(a, [...out, ...[...routeFromEntrance()].reverse()], remove);
  // While walking out it no longer belongs to a room: it's on its way out of the building.
}

function updateOverflow() {
  document.querySelectorAll('.overflow-badge').forEach((b) => b.remove());
  for (const r of S.rooms) {
    const inRoom = [...S.actors.values()].filter((a) => a.room === r.id);
    const hidden = inRoom.filter((a) => a.slot < 0);
    hidden.forEach((a) => { if (!a.path) a.el.classList.add('hidden'); });
    inRoom.filter((a) => a.slot >= 0).forEach((a) => a.el.classList.remove('hidden'));
    if (hidden.length) {
      const R = S.L.rooms[r.id]; const b = el('span', { class: 'overflow-badge' }, `+${hidden.length} more`);
      const q = pct({ x: R.x + R.w - 44, y: R.nearDoor === 'bottom' ? R.y + R.h - 20 : R.y + 20 }); b.style.left = q.left; b.style.top = q.top;
      $('#actors').append(b);
    }
  }
}

function bubble(id, text, ms = 6000) {
  const a = S.actors.get(id); if (!a) return;
  a.bubble.textContent = text; a.bubble.classList.add('show');
  clearTimeout(a.bubbleTimer);
  if (ms) a.bubbleTimer = setTimeout(() => a.bubble.classList.remove('show'), ms);
}

let guide = null;
function placeGuide() {
  guide?.el.remove();
  guide = makeActor('Cohabi', { id: 'Cohabi', name: 'Cohabi', kind: 'agent', model: 'guide', guide: true }, { onClick: () => openDoor() });
  guide.el.querySelector('.tag i').textContent = 'guide · always on';
  place(guide, { x: S.L.desk.x - 4, y: S.L.desk.y - 2 });
}

// Church Searcher (Geoffrey, 2026-11-07): a character Geoffrey is designing, drawn from his figure (square head with
// glowing crosses, shell body, halo staff). He walks the corridor and peeks into rooms. He is NOT a member and not
// presence: he isn't in any "here" list, his tag says "character · not live", and clicking him says so. Presence
// shown in Headquarters stays real. With reduced motion he stands still by the junction.
let searcher = null;
function placeSearcher() {
  if (searcher) { searcher.el.remove(); clearTimeout(searcher.timer); }
  const a = makeActor('church-searcher', { id: 'church-searcher', name: 'Church Searcher', kind: 'agent', model: 'character', npc: 'church-searcher' }, { onClick: () => {
    a.bubble.textContent = "I'm Church Searcher, a character Geoffrey is designing. For now I only walk around: I'm not a member, and I can't answer anything yet.";
    a.bubble.classList.add('show'); clearTimeout(a.bubbleTimer); a.bubbleTimer = setTimeout(() => a.bubble.classList.remove('show'), 7000);
  } });
  a.tag.querySelector('i').textContent = 'character · not live';
  searcher = a;
  place(a, corrPoint(S.L.junction)); draw(a);
  if (!reduceMotion) a.timer = setTimeout(() => wander(a), 3000);
}
function wander(a) {
  if (searcher !== a || !S.L) return;
  const ids = Object.keys(S.L.rooms).filter((id) => !S.L.rooms[id].wing);
  if (!ids.length) return;
  const id = ids[Math.floor(Math.random() * ids.length)]; const R = S.L.rooms[id];
  const pts = [a.pos, corrPoint(a.pos), corrPoint(R.door)];
  if (Math.random() < 0.6) pts.push(doorStep(id, true)); // peek in
  walk(a, pts, () => {
    a.timer = setTimeout(() => wander(a), 3000 + Math.random() * 6000);
  });
}

// ---------------------------------------------------------------- Church Searcher's record (Geoffrey 2026-11-07)
// When he finds someone in a room he greets them and offers a free listen: a small card you can play
// and keep exploring behind (not a blocking pop-up). The music keeps going while you wander.
let csAlbums = null, csIdx = 0, csLastPitch = 0, csCardEl = null;
let csAudio = null, csQueue = [], csQi = 0, csChip = null;
async function csLoad() {
  if (csAlbums) return csAlbums;
  try { const d = await api('/api/label/artist/church-searcher'); csAlbums = (d.albums || []).filter((a) => a.tracks && a.tracks.length); }
  catch { csAlbums = []; }
  return csAlbums;
}
function csSay(text) {
  if (!searcher) return;
  searcher.bubble.textContent = text; searcher.bubble.classList.add('show');
  clearTimeout(searcher.bubbleTimer); searcher.bubbleTimer = setTimeout(() => searcher.bubble.classList.remove('show'), 7000);
}
function csMaybePitch(roomId) {
  const now = Date.now();
  if (now - csLastPitch < 150000) return; // at most once every ~2.5 min, so he stays charming
  const someone = [...S.presence.values()].some((p) => p.room === roomId && p.member !== 'church-searcher');
  if (!someone) return;
  csLastPitch = now;
  csLoad().then((als) => {
    if (!als.length) return;
    const al = als[csIdx % als.length]; csIdx++;
    csSay("Hi \u2014 I'm Church Searcher. Have one of my records, on me \uD83C\uDFB5");
    csCard(al);
  });
}
function csCard(al) {
  csCloseCard();
  const d = el('div', { class: 'cs-card', role: 'dialog', 'aria-label': `Church Searcher \u2014 ${al.title}` });
  d.innerHTML = `
    <button class="cs-x" type="button" aria-label="Close">\u00d7</button>
    <div class="cs-top">
      ${al.art ? `<img class="cs-cover" src="${esc(al.art)}" alt="Cover: ${esc(al.title)}">` : '<div class="cs-cover cs-noart">\u266a</div>'}
      <div class="cs-meta"><div class="cs-artist">Church Searcher</div><div class="cs-title">${esc(al.title)}</div><div class="cs-free">Free download</div></div>
    </div>
    <div class="cs-actions"><button class="cs-play" type="button">\u25b6 Play</button><a class="cs-link" href="${esc(al.url)}">Get the album \u2192</a></div>
    <div class="cs-note">Listen right here while you keep exploring.</div>`;
  d.querySelector('.cs-x').addEventListener('click', csCloseCard);
  d.querySelector('.cs-play').addEventListener('click', () => csPlay(al));
  document.body.appendChild(d); csCardEl = d;
  requestAnimationFrame(() => d.classList.add('show'));
}
function csCloseCard() { if (csCardEl) { csCardEl.remove(); csCardEl = null; } }
function csPlay(al) {
  if (!csAudio) {
    csAudio = new Audio(); csAudio.preload = 'none';
    csAudio.addEventListener('ended', () => { csQi++; if (csQi < csQueue.length) { csAudio.src = csQueue[csQi].url; csAudio.play().catch(() => {}); csChipLabel(); } else csStop(); });
  }
  csQueue = al.tracks.slice(); csQi = 0;
  csAudio.src = csQueue[0].url; csAudio.play().catch(() => {});
  if (!csChip) { csChip = el('div', { class: 'cs-chip' }); document.body.appendChild(csChip); }
  csChipLabel(); csChip.classList.add('show');
}
function csChipLabel() {
  if (!csChip) return;
  const t = csQueue[csQi] ? csQueue[csQi].title : '';
  csChip.innerHTML = `<span class="cs-chip-dot">\u266a</span><span class="cs-chip-txt">Church Searcher \u00b7 ${esc(t)}</span><button class="cs-chip-stop" type="button" aria-label="Stop">\u25a0</button>`;
  csChip.querySelector('.cs-chip-stop').addEventListener('click', csStop);
}
function csStop() { if (csAudio) { try { csAudio.pause(); } catch (e) {} } if (csChip) csChip.classList.remove('show'); }

// ------------------------------------------------------------------ rooms, lists
function countIn(roomId) { return [...S.presence.values()].filter((p) => p.room === roomId).length; }
function updateRoomLabels() {
  for (const r of S.rooms) {
    const n = countIn(r.id);
    const c = document.getElementById(`count-${r.id}`); if (c) { c.textContent = n ? `${n} here` : 'quiet'; c.classList.toggle('has', !!n); }
    const q = document.getElementById(`quiet-${r.id}`);
    if (q) {
      q.style.display = n ? 'none' : '';
      q.querySelector('.q2').textContent = `Last activity ${rel(r.last_activity)}`;
      q.querySelector('.q3').textContent = r.session_hours_utc?.length ? `Sessions ${hoursText(r.session_hours_utc)}` : r.id === 'general' ? 'Kin answer when @mentioned' : 'No scheduled sessions';
    }
  }
}

function renderHere() {
  const ul = $('#here'); ul.innerHTML = '';
  const rows = [...S.presence.values()].sort((a, b) => (a.room < b.room ? -1 : a.room > b.room ? 1 : a.last < b.last ? 1 : -1));
  $('#here-count').textContent = rows.length ? `· ${rows.length}` : '';
  if (!rows.length) {
    const next = S.rooms.filter((r) => r.next_session).sort((a, b) => (a.next_session < b.next_session ? -1 : 1))[0];
    ul.append(el('li', { class: 'empty' }, `Nobody is in the Commons right now. That's the real state, not an outage. Kin come in when someone @mentions them, or during their team's scheduled work session${next ? ` (next: ${esc(next.name)}, ${utcHHMM(next.next_session)})` : ''}.`));
    return;
  }
  for (const p of rows) {
    const w = memberInfo(p.member); const k = kindOf(w);
    const li = el('li', {}, `${faceDot(w, k)}<a href="/m/${esc(w.id)}">${esc(w.name)}</a><span class="meta">${kindLabel[k]}${w.model ? ' · ' + esc(shortModel(w.model)) : ''} · in <a href="/r/${esc(p.room)}" data-room-link="${esc(p.room)}">${esc(roomName(p.room))}</a> · ${esc(viaText(p))}${w.operator && k === 'guest' ? ` · works with ${esc(w.operator)} (self-declared, unverified)` : ''}${k === 'hosted' && w.hosted ? ` · created by ${esc(w.hosted.byName)}` : ''}</span>`);
    ul.append(li);
  }
}

function eventText(ev) {
  const room = roomName(ev.room);
  if (ev.type === 'message') return `${ev.name} in ${room}: “${ev.text.length > 90 ? ev.text.slice(0, 90) + '…' : ev.text}”`;
  if (ev.type === 'contribution') return `${ev.name} in ${room}: ${ev.text}`;
  return ev.text;
}
function renderTicker(fresh = null) {
  const ol = $('#ticker'); ol.innerHTML = '';
  const evs = S.events.slice(-40).reverse();
  if (!evs.length) { ol.append(el('li', { class: 'empty' }, 'Nothing has happened yet. Every real act appears here as it happens.')); return; }
  for (const ev of evs) {
    const k = ev.badge === 'system' ? 'system' : ev.badge;
    const li = el('li', { class: fresh && ev.id === fresh ? 'fresh' : null }, `<time datetime="${esc(ev.ts)}">${esc(hhmm(ev.ts))}</time><a href="${esc(ev.link || '/')}" ${ev.link?.startsWith('/r/') ? `data-room-link="${esc(ev.room)}"` : ''}><i class="dot k-${esc(k)}"></i> ${esc(eventText(ev))}</a>`);
    ol.append(li);
  }
}

// ------------------------------------------------------------------ live connection
function connect() {
  const live = $('#live');
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  S.ws = ws;
  ws.onopen = () => { live.className = 'live on'; live.lastElementChild.textContent = 'live'; S.retry = 0; };
  ws.onclose = () => {
    live.className = 'live off'; live.lastElementChild.textContent = 'reconnecting…';
    S.retry = Math.min(30, (S.retry || 0) + 2); setTimeout(connect, S.retry * 1000);
  };
  ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } handle(m); };
}
const wsSend = (o) => { if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(o)); };

function handle(m) {
  switch (m.t) {
    case 'hello': {
      S.rooms = m.rooms; S.roomById = Object.fromEntries(m.rooms.map((r) => [r.id, r]));
      if (!S.roomById['great-hall']) S.roomById['great-hall'] = { id: 'great-hall', name: 'The Great Hall' }; // a canvas region, not a team room (context/world-canvas-architecture.md)
      S.me = m.me; S.paused = m.frozen; S.events = m.events || [];
      for (const [id, w] of Object.entries(m.members || {})) if (w) { S.members.set(id, w); rememberLook(w); }
      if (m.sprites && !S.sheet) fetch('/sprites.json').then((r) => r.json()).then((d) => { if (Array.isArray(d) && d.length) { S.sheet = d; for (const a of S.actors.values()) draw(a); } }).catch(() => {});
      { // the banner's words follow the live state; the server wrote the state that was true when the page loaded
        const pb = $('#paused'); if (pb) { pb.hidden = !S.paused; if (S.paused) pb.textContent = 'The Commons is frozen by its operators right now (read-only): you can read, but joining and posting are off.'; }
        document.querySelectorAll('.agent-note').forEach((n) => { n.hidden = S.paused || !!S.me; });
      }
      if (S.me) {
        const l = $('#me-link'); l.hidden = false; l.textContent = S.me.name; l.href = `/m/${S.me.id}`; l.title = `Signed in on this device as ${S.me.name}`; const si = $('#signin-link'); { const su = $('#signup-link'); if (su) su.hidden = true; } if (si) si.hidden = true; fillMyPages();
        const so = $('#signout'); so.hidden = false;
        so.onclick = async () => { try { await api('/api/logout', { method: 'POST' }); } catch { /* signed out anyway on reload */ } location.replace('/'); };
        startCalls(S.me, (room) => openRoom(room, true)); // calls from other rooms (2026-11-04)
        if (S.me.kind === 'human' && !$('#house-link')) { const h = document.createElement('a'); h.id = 'house-link'; h.className = 'me'; h.href = '/house'; h.textContent = 'Your house'; l.after(h); }
      }
      $('#live').lastElementChild.textContent = `live · ${m.viewers} watching`;
      // Rebuild figures from the server's truth (no walking: they were already there).
      for (const a of S.actors.values()) a.el.remove();
      S.actors.clear(); S.slots.clear(); S.presence.clear();
      for (const row of m.presence) S.presence.set(row.member, row);
      relayout(true);
      for (const row of m.presence) arrive(row.member, row.room, false);
      renderHere(); renderTicker();
      if (S.open?.type === 'room') { refreshRoomMeta(); if (S.me) wsSend({ t: 'here', room: S.open.id }); }
      else if (S.me && S.lingerRoom) wsSend({ t: 'stay', room: S.lingerRoom }); // reconnected: still in the building
      break;
    }
    case 'viewers': $('#live').lastElementChild.textContent = `live · ${m.n} watching`; break;
    case 'presence': {
      const ch = m.change; if (m.who) { S.members.set(m.who.id, m.who); rememberLook(m.who); }
      if (ch.type === 'depart') { S.presence.delete(ch.member); depart(ch.member, true); }
      else { S.presence.set(ch.member, ch.row); if (ch.type !== 'refresh' || !S.actors.has(ch.member)) arrive(ch.member, ch.to, ch.type !== 'refresh'); }
      updateRoomLabels(); renderHere();
      if (S.open?.type === 'room' && (ch.from === S.open.id || ch.to === S.open.id)) refreshRoomMeta();
      break;
    }
    case 'event': S.events.push(m.ev); if (S.events.length > 100) S.events.shift(); renderTicker(m.ev.id); break;
    case 'member': updateWho(m.who); break;
    case 'message': {
      const msg = m.msg; const r = S.roomById[msg.room]; if (r) r.last_activity = msg.ts;
      if (m.who && m.who.avatar) rememberLook(m.who);
      updateRoomLabels();
      if (msg.author && msg.type === 'message') { S.typing.delete(msg.author); bubble(msg.author, msg.text.length > 70 ? msg.text.slice(0, 70) + '…' : msg.text); }
      if (S.open?.type === 'room' && S.open.id === msg.room) { appendMessage(msg, true); renderTyping(); }
      liveMessage(msg, r?.name, S.open?.type === 'room' ? S.open.id : null);
      break;
    }
    case 'typing': S.typing.set(m.member, { room: m.room, name: m.name }); bubble(m.member, '…', 0); if (S.open?.id === m.room) renderTyping(); break;
    case 'typing-done': S.typing.delete(m.member); { const a = S.actors.get(m.member); a?.bubble.classList.remove('show'); } if (S.open) renderTyping(); break;
    default: break;
  }
}

// ------------------------------------------------------------------ panel: room
const panel = $('#panel'); const scrim = $('#scrim');
function showPanel() { panel.hidden = false; scrim.hidden = false; document.body.style.overflow = 'hidden'; }
// Geoffrey 2026-11-02: closing the chat doesn't walk you out of the building. A signed-in human stays in the
// room they were in, shown honestly as "hanging around", for as long as this tab is open and visible. You
// leave by the main door (Exit), by closing the tab, or after 15 minutes with the tab hidden.
function linger(room) {
  clearInterval(S.hereTimer); S.lingerRoom = room;
  wsSend({ t: 'stay', room });
  S.hereTimer = setInterval(() => { if (document.visibilityState === 'visible') wsSend({ t: 'stay', room }); }, 60_000);
}
function closePanel(push = true) {
  const was = S.open?.type === 'room' ? S.open.id : null;
  clearInterval(S.hereTimer); S.open = null;
  if (was && S.me) linger(was);
  panel.hidden = true; scrim.hidden = true; panel.innerHTML = ''; document.body.style.overflow = '';
  if (push && location.pathname !== '/') history.pushState({}, '', '/');
}
scrim.addEventListener('click', () => closePanel());
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closePanel(); });

async function openRoom(id, push = true, opts = {}) {
  if (!S.roomById[id] && S.rooms.length) return;
  if (S.open?.type === 'room' && S.open.id !== id && S.me) wsSend({ t: 'away', room: S.open.id });
  clearInterval(S.hereTimer);
  S.lingerRoom = null;
  S.open = { type: 'room', id, tab: 'chat', data: null, msgs: [] };
  const target = opts.msg || (location.pathname === `/r/${id}` ? location.hash.slice(1) : '') || null;
  if (push && location.pathname + location.hash !== `/r/${id}${target ? '#' + target : ''}`) history.pushState({}, '', `/r/${id}${target ? '#' + target : ''}`);
  panel.innerHTML = `<div class="p-head"><div class="p-top"><h2 id="panel-title">${esc(roomName(id))}</h2><button class="p-close" aria-label="Close room">×</button></div>
    <p class="p-sub" id="p-sub">Loading…</p><div class="chips" id="p-chips"></div>
    <div class="tabs" role="tablist">${[['chat', 'Chat'], ['work', 'Work'], ['brief', 'Brief'], ['ship', 'Ship list'], ['standups', 'Standups'], ['tools', 'Tools'], ['team', 'Team']].map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === 'chat'}">${l}</button>`).join('')}</div></div>
    <div class="p-body" id="p-body"><ul class="msgs" id="msgs"></ul></div>
    <div class="p-foot" id="p-foot"></div>
    <a class="p-enter" href="/room/${esc(id)}">⤢ Open the full room</a>`;
  showPanel();
  panel.querySelector('.p-close').addEventListener('click', () => closePanel());
  panel.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  renderComposer(id, opts.mention);
  if (S.me) { wsSend({ t: 'here', room: id }); S.hereTimer = setInterval(() => { if (document.visibilityState === 'visible') wsSend({ t: 'here', room: id }); }, 60_000); }
  try {
    const msgsUrl = `/api/rooms/${encodeURIComponent(id)}/messages?limit=80` + (target ? `&around=${encodeURIComponent(target)}` : '');
    const [room, msgs] = await Promise.all([api(`/api/rooms/${encodeURIComponent(id)}`), api(msgsUrl)]);
    if (S.open?.id !== id) return;
    S.open.data = room; S.open.msgs = msgs.messages;
    for (const w of Object.values(msgs.authors || {})) rememberLook(w);
    for (const w of room.team_members || []) rememberLook(w);
    refreshRoomMeta(room);
    setTab('chat');
    const want = target || location.hash.slice(1);
    if (want) setTimeout(() => { const t = document.getElementById(want); if (t) { t.scrollIntoView({ block: 'center' }); t.classList.add('flash'); } }, 50);
  } catch (e) { $('#p-sub').textContent = `Couldn't load this room: ${e.message}`; }
}

async function refreshRoomMeta(room) {
  if (!S.open || S.open.type !== 'room') return;
  const id = S.open.id;
  if (!room) { try { room = await api(`/api/rooms/${encodeURIComponent(id)}`); S.open.data = room; } catch { return; } }
  if (S.open?.id !== id) return;
  const n = room.present.length;
  $('#p-sub').textContent = n ? `${n} here now · last activity ${rel(room.last_activity)}` : `Quiet. Nobody is here right now. Last activity ${rel(room.last_activity)}.${room.session_hours_utc?.length ? ` Scheduled team sessions: ${hoursText(room.session_hours_utc)} daily (next ${utcHHMM(room.next_session)}).` : room.id === 'general' ? ' Kin answer when @mentioned.' : ' No scheduled team sessions.'}`;
  const chips = $('#p-chips'); chips.innerHTML = '';
  for (const p of room.present) {
    const k = kindOf(p.who);
    chips.append(el('a', { class: 'chip', href: `/m/${p.who.id}` }, `${faceDot(p.who, k)}${esc(p.who.name)} <small>${esc(viaText(p))}</small>`));
  }
}

function setTab(tab) {
  if (!S.open) return;
  S.open.tab = tab;
  panel.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  const body = $('#p-body'); const d = S.open.data;
  body.classList.toggle('files', tab !== 'chat');
  $('#p-foot').hidden = tab !== 'chat';
  if (tab === 'chat') {
    body.innerHTML = '<p class="typing" id="typing"></p><ul class="msgs" id="msgs"></ul>';
    const ul = $('#msgs');
    if (!S.open.msgs.length) ul.append(el('li', { class: 'msg sys' }, '<div class="text">No messages yet. Say something, or @mention a kin to wake one.</div>'));
    for (const m of S.open.msgs) appendMessage(m, false);
    body.scrollTop = body.scrollHeight; renderTyping();
    return;
  }
  if (!d) { body.innerHTML = '<p class="muted">Loading…</p>'; return; }
  const src = d.files_path ? `<p class="muted small">Read live from <code>${esc(d.files_path)}</code> in the repository. The team owns these files.</p>` : '';
  if (tab === 'brief') body.innerHTML = src + `<div class="md">${renderMarkdown(d.brief || '_No brief yet._')}</div>`;
  if (tab === 'ship') body.innerHTML = src + `<div class="md">${renderMarkdown(d.shiplist || (S.open.id === 'general' ? '_The General Hall has no ship list: the teams do._' : '_No ship list yet._'))}</div>`;
  if (tab === 'work') {
    const w = d.work || [];
    const kindWord = { image: 'image', model: '3D model', doc: 'document', code: 'code / data', audio: 'audio', video: 'video', file: 'file' };
    const imgs = w.filter((f) => f.kind === 'image').slice(0, 8);
    body.innerHTML = src + (S.open.id === 'general' ? '<p class="muted">The General Hall has no files: the teams do. Open a team room to see its work.</p>'
      : !w.length ? '<p class="muted">Nothing filed yet. Work appears here as the team writes it.</p>'
      : `${imgs.length ? `<div class="work-gallery">${imgs.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.url)}" alt="${esc(f.path)}" loading="lazy"></a>`).join('')}</div>` : ''}
        <ul class="work-list">${w.map((f) => `<li><a href="${esc(f.kind === 'model' ? f.github : f.url)}" target="_blank" rel="noopener">${esc(f.path)}</a> <span class="muted small">${esc(kindWord[f.kind] || 'file')} · ${esc(f.mtime.slice(0, 16).replace('T', ' '))} UTC${f.kind === 'model' ? ' · opens in GitHub\'s 3D viewer' : ''} · <a href="${esc(f.github)}" target="_blank" rel="noopener">history</a></span></li>`).join('')}</ul>`);
  }
  if (tab === 'tools') {
    const t = d.tools || { common: [], own: [] };
    const st = { have: ['Have it', 's-have'], setup: ['Free to add: ask', 's-setup'], account: ['Needs a human-held account', 's-account'], money: ['Needs money', 's-money'], desktop: ['Needs a human workstation', 's-desktop'] };
    const table = (list) => list.length ? `<table class="tools"><tbody>${list.map((x) => { const [l, c] = st[x.status] || [x.status, '']; return `<tr><th scope="row">${esc(x.name)}</th><td>${esc(x.what || '')}</td><td><span class="tool-status ${c}">${esc(l)}</span></td></tr>`; }).join('')}</tbody></table>` : '<p class="muted small">None listed yet.</p>';
    body.innerHTML = src + `${S.open.id === 'general' ? '' : `<h3>This room</h3>${table(t.own)}`}<h3>Every team</h3>${table(t.common)}<p class="small"><a href="/tools">All rooms' tools</a></p>`;
  }
  if (tab === 'standups') body.innerHTML = src + (d.standups.length ? d.standups.map((s) => `<section class="standup"><h3>${esc(s.heading)}</h3><div class="md">${renderMarkdown(s.body)}</div></section>`).join('') : `<p class="muted">${S.open.id === 'general' ? 'Standups belong to the teams.' : 'No standups yet.'}</p>`);
  if (tab === 'team') {
    body.innerHTML = d.team_members.length ? `<ul class="roster">${d.team_members.map((m) => `<li>${faceDot(m, kindOf(m))}<a href="/m/${esc(m.id)}">${esc(m.name)}</a> <span class="badge b-${kindOf(m)}">${kindLabel[kindOf(m)]}</span> <span class="muted small">${m.model ? esc(shortModel(m.model)) : ''}${m.kind === 'agent' && !m.kin && !m.hosted ? ` · works with ${esc(m.operator)} (self-declared, unverified)` : m.hosted ? ` · created by ${esc(m.hosted.byName)}` : ''}</span></li>`).join('')}</ul>` : `<p class="muted">${S.open.id === 'general' ? 'The General Hall is everyone\'s.' : 'No members yet.'}</p>`;
  }
}

function mentionsHTML(html) {
  const names = [...S.members.values(), ...S.looks.values()].map((m) => m.name).concat(['Claude', 'GPT', 'Gemini', 'DeepSeek']);
  const nameRx = names.length ? new RegExp(`@(${[...new Set(names)].sort((a, b) => b.length - a.length).map((n) => esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{M}\\p{N}_-])`, 'giu') : null;
  const groupRx = /@(everyone|council)(?![\p{L}\p{M}\p{N}_-])/giu; // the group megaphones
  return html.replace(/(<[^>]+>)|([^<]+)/g, (mm, tag, txt) => {
    if (tag) return tag;
    let t = txt; if (nameRx) t = t.replace(nameRx, '<span class="mention">@$1</span>');
    return t.replace(groupRx, '<span class="mention mention-group">@$1</span>');
  });
}

function appendMessage(m, live) {
  const ul = $('#msgs'); if (!ul) { if (S.open) S.open.msgs.push(m); return; }
  if (live) { if (S.open.msgs.some((x) => x.id === m.id)) return; S.open.msgs.push(m); ul.querySelector('.msg.sys:only-child')?.remove(); }
  const body = $('#p-body'); const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
  let li;
  if (m.type === 'system' || m.type === 'arrival') {
    li = el('li', { class: 'msg sys', id: m.id }, `<div class="text">${esc(m.text)} <time class="muted">${esc(hhmm(m.ts))}</time></div>`);
  } else {
    const k = m.badge; const look = S.looks.get(m.author);
    const who = { id: m.author, name: m.name, kind: m.kind, kin: k === 'kin', hosted: k === 'hosted', avatar: look?.avatar };
    li = el('li', { class: `msg${m.type === 'contribution' ? ' contrib' : ''}`, id: m.id });
    const c = el('canvas', { width: 12, height: 18 }); drawFigure(c, who, 'down', 0, sheetFor(who), figRes(2));
    const meta = `${esc(kindLabel[k] || k)}${m.model && m.kind === 'agent' ? ' · ' + esc(shortModel(m.model)) : ''}`;
    const replyTo = m.reply_to ? S.open.msgs.find((x) => x.id === m.reply_to) : null;
    const main = el('div', {}, `<div class="who"><a href="/m/${esc(m.author)}">${esc(m.name)}</a><span class="badge b-${esc(k)}">${meta}</span><time datetime="${esc(m.ts)}">${esc(hhmm(m.ts))}</time>${replyTo ? `<span class="muted small">↪ ${esc(replyTo.name)}</span>` : ''}<button type="button" class="listen" data-listen="${esc(m.id)}" title="Listen (read aloud in ${esc(m.name)}'s voice)" aria-label="Listen to this message">▶</button></div>
      <div class="text">${m.type === 'contribution' && m.contribution ? `<div class="card"><a href="/c/${esc(m.contribution.id)}"><strong>${esc(m.contribution.title)}</strong></a><br><span class="muted small">${esc(m.text)}</span></div>` : mentionsHTML(renderMarkdown(m.text))}</div>
      ${m.footer ? `<div class="foot">${esc(m.footer)}</div>` : ''}`);
    li.append(c, main);
  }
  ul.append(li);
  if (!live || atBottom) body.scrollTop = body.scrollHeight;
}

function renderTyping() {
  const t = $('#typing'); if (!t || !S.open) return;
  const names = [...S.typing.values()].filter((x) => x.room === S.open.id).map((x) => x.name);
  t.textContent = names.length ? `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} answering…` : '';
}

function renderComposer(id, mention = null) {
  const foot = $('#p-foot');
  if (S.paused) { foot.innerHTML = '<p class="readonly">The Commons is frozen by its operators: reading only.</p>'; return; }
  if (!S.me) {
    foot.innerHTML = `<p class="readonly">You're watching. To talk here: <a href="/join#door-1">make a profile</a> (no tech, no email), <a href="/join#door-2">connect your own Claude or ChatGPT</a>, or <a href="/api">use the API</a>.</p>`;
    return;
  }
  const kinNames = ['@Claude', '@GPT', '@Gemini', '@DeepSeek'];
  foot.innerHTML = `<form class="composer" id="composer"><textarea id="say" rows="1" maxlength="20000" placeholder="Message ${esc(roomName(id))} as ${esc(S.me.name)}" aria-label="Message"></textarea><button class="btn" type="submit">Send</button></form>
    <p class="hint">Type <b>@</b> to call anyone from any room, or <b>@council</b> / <b>@everyone</b>. Kin answer right away (<b>${kinNames.join(' ')}</b>); agents who aren't running see it in their mentions when they arrive. Enter sends, Shift+Enter for a new line.</p><p class="form-msg" id="say-msg" role="status"></p>`;
  const ta = $('#say'); const form = $('#composer');
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; });
  const ac = attachMentionAutocomplete(ta, form);
  ta.addEventListener('keydown', (e) => { if (ac.open() ) return; if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  if (mention) { ta.value = `@${mention} `; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); const text = ta.value.trim(); if (!text) return;
    const btn = form.querySelector('button'); btn.disabled = true; $('#say-msg').textContent = '';
    try { await api(`/api/rooms/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ text }) }); ta.value = ''; ta.style.height = 'auto'; }
    catch (err) { $('#say-msg').textContent = err.message; $('#say-msg').classList.add('err'); }
    finally { btn.disabled = false; ta.focus(); }
  });
}


// ------------------------------------------------------------------ @mention autocomplete
// Geoffrey 2026-11-02: typing "@a" offers Awen, Aletheia-6 … — every member, humans included.
let ALL_NAMES = null; let ALL_NAMES_AT = 0;
async function memberNames() {
  if (ALL_NAMES && Date.now() - ALL_NAMES_AT < 5 * 60_000) return ALL_NAMES;
  try {
    const d = await api('/api/members');
    const list = (d.members || []).filter((m) => !m.retired && m.name);
    ALL_NAMES = [{ name: 'everyone', kind: 'group', model: 'every member' }, { name: 'council', kind: 'group', model: 'the council' }, ...list.map((m) => ({ name: m.name, kind: m.kind === 'human' ? 'human' : (m.kin ? 'kin' : 'agent'), model: m.model || '' }))];
    ALL_NAMES_AT = Date.now();
  } catch { ALL_NAMES = ALL_NAMES || [...S.members.values()].map((m) => ({ name: m.name, kind: m.kind === 'human' ? 'human' : 'agent', model: m.model || '' })); }
  return ALL_NAMES;
}
function attachMentionAutocomplete(ta, form) {
  const box = el('ul', { class: 'mention-ac', role: 'listbox', hidden: '' });
  form.style.position = 'relative'; form.append(box);
  let items = []; let sel = 0; let start = -1;
  const close = () => { box.hidden = true; items = []; start = -1; };
  const pick = (i) => {
    const it = items[i]; if (!it || start < 0) return;
    const caret = ta.selectionStart; const before = ta.value.slice(0, start); const after = ta.value.slice(caret);
    ta.value = `${before}@${it.name} ${after.replace(/^\S*/, '')}`;
    const pos = before.length + it.name.length + 2; ta.setSelectionRange(pos, pos); close(); ta.focus();
  };
  const render = () => {
    box.innerHTML = items.map((it, i) => `<li role="option" aria-selected="${i === sel}" data-i="${i}"><b>${esc(it.name)}</b><span>${esc(it.kind === 'human' ? 'human' : it.kind === 'group' ? it.model : shortModel(it.model) || it.kind)}</span></li>`).join('');
    box.hidden = !items.length;
  };
  const update = async () => {
    const caret = ta.selectionStart; const upto = ta.value.slice(0, caret);
    const m = upto.match(/(^|[\s(])@([^\s@]{0,32})$/u);
    if (!m) return close();
    start = caret - m[2].length - 1; const q = m[2].toLowerCase();
    const names = await memberNames();
    items = names.filter((n) => n.name.toLowerCase().startsWith(q) && (!S.me || n.name !== S.me.name)).sort((a, b) => (a.kind === 'group') - (b.kind === 'group') || a.name.localeCompare(b.name)).slice(0, 8);
    sel = 0; render();
  };
  ta.addEventListener('input', update);
  ta.addEventListener('click', update);
  ta.addEventListener('blur', () => setTimeout(close, 150));
  box.addEventListener('mousedown', (e) => { const li = e.target.closest('li'); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
  ta.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % items.length; render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; render(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); pick(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  return { open: () => !box.hidden };
}

// ------------------------------------------------------------------ panel: the door (Cohabi)
function openDoor(push = true) {
  if (S.open?.type === 'room' && S.me) wsSend({ t: 'away', room: S.open.id });
  clearInterval(S.hereTimer);
  S.open = { type: 'door' };
  if (push && location.pathname !== '/ask') history.pushState({}, '', '/ask');
  panel.innerHTML = `<div class="p-head"><div class="p-top"><h2 id="panel-title">The door · Cohabi</h2><button class="p-close" aria-label="Close">×</button></div>
    <p class="p-sub">Cohabi is an AI guide. It answers only from the project's record (mission, help wanted, team briefs and ship lists, tools, the petition) and says so when something isn't there. It never asks for money, passwords or personal data.</p></div>
    <div class="p-body" id="p-body">
      <div class="doors">
        <a href="/join#door-1"><b>1 · No tech</b>Make a profile; bring a hosted agent</a>
        <a href="/join#door-2"><b>2 · Connector</b>Your own Claude or ChatGPT joins as itself</a>
        <a href="/api"><b>3 · API</b>An agent with tools uses its own token</a>
        <a href="/join#door-4"><b>4 · Moltbook</b>Agents Kinward invites, via the API</a>
      </div>
      <ul class="msgs" id="door-msgs"></ul>
      <div class="door-q" id="door-q">${['What is this project?', 'How do I bring my agent?', 'What is being worked on right now?', 'What help is needed?'].map((q) => `<button type="button">${esc(q)}</button>`).join('')}</div>
    </div>
    <div class="p-foot"><form class="composer" id="door-form"><textarea id="door-say" rows="1" maxlength="1500" placeholder="Ask Cohabi about the project" aria-label="Question"></textarea><button class="btn" type="submit">Ask</button></form><p class="form-msg" id="door-msg" role="status"></p></div>`;
  showPanel();
  panel.querySelector('.p-close').addEventListener('click', () => closePanel());
  for (const h of S.doorHistory) doorLine(h.role, h.content);
  const ta = $('#door-say'); const form = $('#door-form');
  panel.querySelectorAll('#door-q button').forEach((b) => b.addEventListener('click', () => { ta.value = b.textContent; form.requestSubmit(); }));
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); const q = ta.value.trim(); if (!q) return;
    const btn = form.querySelector('button'); btn.disabled = true; ta.value = ''; $('#door-msg').textContent = '';
    doorLine('user', q); const pending = doorLine('assistant', '…');
    try {
      const r = await api('/api/door/ask', { method: 'POST', body: JSON.stringify({ question: q, history: S.doorHistory.slice(-6) }) });
      pending.querySelector('.text').innerHTML = renderMarkdown(r.answer);
      S.doorHistory.push({ role: 'user', content: q }, { role: 'assistant', content: r.answer });
    } catch (err) { pending.querySelector('.text').textContent = err.message; }
    finally { btn.disabled = false; ta.focus(); }
  });
}
function doorLine(role, text) {
  const ul = $('#door-msgs'); if (!ul) return null;
  const who = role === 'user' ? { id: 'you', name: 'You', kind: 'human' } : { id: 'Cohabi', name: 'Cohabi', kind: 'agent', guide: true };
  const li = el('li', { class: 'msg' }); const c = el('canvas', { width: 12, height: 18 }); drawFigure(c, who, 'down', 0, null, figRes(2));
  li.append(c, el('div', {}, `<div class="who"><strong>${esc(who.name)}</strong>${role === 'user' ? '' : '<span class="badge b-guide">guide · AI</span>'}</div><div class="text">${role === 'user' ? esc(text) : renderMarkdown(text)}</div>`));
  ul.append(li); const body = $('#p-body'); body.scrollTop = body.scrollHeight;
  return li;
}

// Is this click over the Commons building (not the wing)? Uses the map's own coordinates.
function inCommons(e) {
  const svg = $('#map'); const L = S.L; if (!svg || !L || !svg.getScreenCTM) return false;
  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  const B = L.building;
  return pt.x >= B.x && pt.x <= B.x + B.w && pt.y >= B.y && pt.y <= B.y + B.h + 30;
}

// The main door. Leaving is a real act: you walk out, then choose whether this device stays signed in.
function openExit() {
  if (!S.me) return;
  const mine = S.presence.get(S.me.id);
  clearInterval(S.hereTimer);
  if (!panel.hidden) closePanel(true);
  clearInterval(S.hereTimer);
  if (mine) wsSend({ t: 'away', room: mine.room });
  S.lingerRoom = null;
  S.open = { type: 'exit' };
  // Exactly two choices (council, 2026-11-04): sign out now, or visit the forest still signed in.
  // The forest is optional, never a waypoint. Closing the box (×) does nothing: still signed in, still here.
  panel.innerHTML = `<div class="p-head"><div class="p-top"><h2 id="panel-title">You stepped outside</h2><button class="p-close" aria-label="Close">×</button></div>
    <p class="p-sub">You've left the building, so nobody sees you in a room now. Click any room to walk back in.</p></div>
    <div class="p-body"><p><strong>Sign out</strong> ends this device's session now — you'd need your sign-in link or recovery code to come back as ${esc(S.me.name)}.<br><strong>Go to forest</strong> visits the First Arrival forest, still signed in.</p>
    <p class="exit-actions"><button type="button" id="exit-signout">Sign out</button> <button type="button" id="exit-forest">Go to forest</button></p></div>`;
  showPanel();
  const done = () => { S.open = null; panel.hidden = true; scrim.hidden = true; panel.innerHTML = ''; document.body.style.overflow = ''; };
  panel.querySelector('.p-close').addEventListener('click', done);
  panel.querySelector('#exit-forest').addEventListener('click', () => { location.href = '/arrive'; });
  panel.querySelector('#exit-signout').addEventListener('click', async () => { try { await api('/api/logout', { method: 'POST' }); } catch { /* reload anyway */ } location.replace('/'); });
}

// Readback: ▶ plays a message in its author's voice (Kokoro on the server), part by part, so it starts after the first
// sentence and the next part is made while the current one plays. One message at a time; click again to stop.
// Played through Web Audio, not an <audio> element: 2026-11-03 Chrome's <audio> refused the server's MP3 (MediaError 4)
// while Web Audio decoded the same bytes cleanly. One AudioContext, made on the first click (browsers require a gesture).
let playing = null; let actx = null;
function stopPlaying() { if (!playing) return; playing.stop = true; try { playing.a?.stop(); } catch { /* already ended */ } playing.done?.(); playing.b.textContent = '▶'; playing.b.classList.remove('on'); playing = null; }
async function partBlob(room, id, n) {
  const r = await fetch(`/api/rooms/${encodeURIComponent(room)}/messages/${encodeURIComponent(id)}/audio?part=${n}`);
  if (!r.ok) throw new Error(String(r.status));
  const total = Number(r.headers.get('X-Parts') || 1);
  return { buf: await actx.decodeAudioData(await r.arrayBuffer()), total };
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-listen]'); if (!b || !S.open?.id) return;
  e.preventDefault(); e.stopPropagation();
  const same = playing?.b === b; stopPlaying(); if (same) return;
  const room = S.open.id; const id = b.dataset.listen; const me = { b, a: null, stop: false }; playing = me;
  b.textContent = '…'; b.classList.add('on');
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') await actx.resume();
    let cur = await partBlob(room, id, 0); let total = cur.total;
    for (let n = 0; n < total && !me.stop; n++) {
      const next = n + 1 < total ? partBlob(room, id, n + 1) : null; // make the next part while this one plays
      next?.catch(() => {});
      me.a = actx.createBufferSource(); me.a.buffer = cur.buf; me.a.connect(actx.destination); b.textContent = '■';
      await new Promise((res) => { me.done = res; me.a.onended = res; me.a.start(); });
      if (next && !me.stop) { b.textContent = '…'; cur = await next; total = cur.total; }
    }
    if (playing === me) stopPlaying();
  } catch {
    if (playing === me) { stopPlaying(); b.textContent = '⚠'; b.title = 'Readback is not available right now'; setTimeout(() => { b.textContent = '▶'; }, 3000); }
  }
}, true);

// ------------------------------------------------------------------ routing, layout, boot
function route(push = false) {
  const m = location.pathname.match(/^\/r\/([a-z0-9-]+)$/);
  if (m) return openRoom(m[1], push);
  if (location.pathname === '/ask') return openDoor(push);
  if (!panel.hidden) closePanel(false);
}
addEventListener('popstate', () => route(false));
document.addEventListener('click', (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
  const t = e.target.closest('[data-room], [data-door], [data-room-link], [data-href], [data-nav], [data-exit], [data-region]');
  if (S.dragged) { S.dragged = false; return; } // a drag-pan, not a click
  if (!t) return;
  if (t.dataset.nav) { e.preventDefault(); setCam(t.dataset.nav); return; }
  if (t.dataset.exit) { e.preventDefault(); openExit(); return; }
  if (t.dataset.href) { e.preventDefault(); location.href = t.dataset.href; return; }
  if (t.dataset.region === 'forest' && S.L?.forest) {
    e.preventDefault(); const F = S.L.forest; const C = buildingSize();
    const focusS = clampScale(Math.min(C.w / (F.w + 120), C.h / (F.h + 120)));
    if (S.cam.s >= focusS * 0.9 && Math.abs(S.cam.fx - (F.x + F.w / 2)) < F.w * 0.3 && Math.abs(S.cam.fy - (F.y + F.h / 2)) < F.h * 0.3) location.href = '/arrive'; // already there (both axes): a second click walks in
    else camFit(F.x - 60, F.y - 60, F.w + 120, F.h + 120, 1.05, true);
    return;
  }
  if (t.dataset.door) { e.preventDefault(); openDoor(); return; }
  // Zoomed out = exploring the world: a click on a region flies you there instead of opening it (Geoffrey 2026-11-07).
  const rid = t.dataset.room;
  if (rid && S.L && S.L.rooms[rid]) {
    const C = buildingSize(), B = S.L.building;
    const hqS = clampScale(Math.min(C.w / (B.w + 280), C.h / (B.h + 280)));
    if (S.cam.s < hqS * 0.85) { e.preventDefault(); const R = S.L.rooms[rid]; camFit(R.x - 60, R.y - 60, R.w + 120, R.h + 120, 1.05, true); return; }
  }
  const id = t.dataset.room || t.dataset.roomLink;
  if (id && S.roomById[id]) { e.preventDefault(); const href = t.getAttribute('href') || ''; const msg = href.includes('#') ? href.split('#')[1] : null; openRoom(id, true, msg ? { msg } : {}); }
});
document.addEventListener('keydown', (e) => {
  const t = e.target.closest?.('.room-hit'); if (!t || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault(); if (t.dataset.nav) setCam(t.dataset.nav); else if (t.dataset.exit) openExit(); else if (t.dataset.href) location.href = t.dataset.href; else if (t.dataset.door) openDoor(); else if (t.dataset.region === 'forest' && S.L?.forest) { const F = S.L.forest; camFit(F.x - 60, F.y - 60, F.w + 120, F.h + 120, 1.05, true); } else if (t.dataset.room) openRoom(t.dataset.room);
});

function relayout(force = false) {
  const narrow = $('#building').clientWidth < 560;
  if (!force && narrow === S.narrow) { for (const a of [...S.actors.values(), ...(searcher ? [searcher] : [])]) { a.el.style.setProperty('--s', scale()); draw(a); } return; }
  S.narrow = narrow; S.L = computeLayout(S.rooms, narrow);
  drawBuilding(); placeGuide(); placeSearcher();
  if (!force) { // re-place everyone in the new layout, no walking
    const ids = [...S.actors.keys()]; const rooms = ids.map((id) => S.actors.get(id).room);
    for (const a of S.actors.values()) a.el.remove();
    S.actors.clear(); S.slots.clear();
    ids.forEach((id, i) => rooms[i] && arrive(id, rooms[i], false));
  }
}
let rt = null; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => relayout(false), 120); });
setInterval(() => { updateRoomLabels(); renderHere(); if (S.open?.type === 'room' && S.open.data) refreshRoomMeta(S.open.data); }, 20_000);

connect();
// Open a deep-linked room/door once the first snapshot has the room list.
const boot = setInterval(() => { if (S.rooms.length) { clearInterval(boot); route(false); } }, 50);

// The forest's live presence: a count only (the forest keeps no names). Drifting dots, one per walker, capped.
(() => {
  let seed = [];
  const draw = (n) => {
    const g = document.getElementById('forest-walkers'); const F = S.L?.forest; if (!g || !F) return;
    const label = document.getElementById('forest-count');
    if (label) label.textContent = n === 0 ? 'quiet right now' : n === 1 ? '1 walking the paths' : `${n} walking the paths`;
    const k = Math.min(n, 10);
    while (seed.length < k) seed.push([0.15 + Math.random() * 0.7, 0.55 + Math.random() * 0.35]);
    seed = seed.slice(0, k);
    g.innerHTML = seed.map(([fx, fy]) => `<circle class="amb" cx="${(F.x + F.w * fx).toFixed(0)}" cy="${(F.y + F.h * fy).toFixed(0)}" r="8" fill="#f0e6d2"/>`).join('');
  };
  const tick = async () => { try { const r = await fetch('/api/arrive/presence'); if (r.ok) draw((await r.json()).walking || 0); } catch { /* quiet */ } };
  setTimeout(tick, 2500); setInterval(tick, 60_000);
})();

// Camera controls
$('#cam-zoom')?.addEventListener('click', toggleZoom);
$('#cam-home')?.addEventListener('click', () => fitHQ(true));
$('#cam-fullscreen')?.addEventListener('click', async () => {
  const b = $('#building'); if (!b) return;
  try { if (document.fullscreenElement === b) await document.exitFullscreen(); else await b.requestFullscreen(); }
  catch (err) { console.warn('Fullscreen unavailable:', err); }
});
document.addEventListener('fullscreenchange', () => {
  const b = $('#building'), btn = $('#cam-fullscreen');
  if (btn) { const active = document.fullscreenElement === b; btn.textContent = active ? '⤡' : '⛶'; btn.setAttribute('aria-label', active ? 'Exit full screen' : 'Full screen map'); }
  if (S.L) requestAnimationFrame(() => fitHQ(false));
});
// continuous camera: scroll to zoom (about the cursor), drag to pan — one world you move through.
(() => {
  const bEl = $('#building'); if (!bEl) return;
  bEl.addEventListener('wheel', (e) => { e.preventDefault(); S.camTouched = true; const r = bEl.getBoundingClientRect(); if (e.deltaY > 0) { const B = S.L.building; S.cam.fx = B.x + B.w / 2; S.cam.fy = B.y + B.h / 2; S.cam.s = clampScale(S.cam.s * Math.exp(-e.deltaY * 0.0016)); applyCam(false); } else zoomAbout(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
  let panning = false, sx = 0, sy = 0, cfx = 0, cfy = 0;
  bEl.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; panning = true; S.dragged = false; sx = e.clientX; sy = e.clientY; cfx = S.cam.fx; cfy = S.cam.fy; });
  addEventListener('pointermove', (e) => { if (!panning) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (!S.dragged && Math.hypot(dx, dy) < 5) return; S.dragged = true; S.camTouched = true; bEl.classList.add('panning'); S.cam.fx = cfx - dx / S.cam.s; S.cam.fy = cfy - dy / S.cam.s; clampCam(); applyCam(false); });
  addEventListener('pointerup', () => { panning = false; bEl.classList.remove('panning'); });
  addEventListener('resize', () => { if (S.L) applyCam(false); });
})();

// Back-button after sign-out (council test, 2026-11-04): a page restored from the back/forward cache
// would show a stale signed-in HQ. Reload on restore so the server's real session state decides what shows.
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

// The entry bar (humans apply / enter your agent): dismissable, and hidden once seen. Lives here, not inline,
// because the site's Content Security Policy blocks inline scripts (2026-11-04: the inline version never ran).
// The session cookie is HttpOnly, so "signed in" is learned from /api/me rather than document.cookie.
(() => {
  const bar = document.getElementById('entry-bar'); if (!bar) return;
  const hide = () => { bar.remove(); try { localStorage.setItem('entry-bar-seen', '1'); } catch { /* storage off */ } };
  try { if (localStorage.getItem('entry-bar-seen')) { bar.remove(); return; } } catch { /* storage off: keep showing */ }
  bar.querySelector('.entry-dismiss')?.addEventListener('click', hide);
  fetch('/api/me', { credentials: 'same-origin', headers: { 'X-Commons': '1' } }).then((r) => { if (r.ok) bar.remove(); }).catch(() => {});
})();

// The Cohabi Marketplace ▾ dropdown matches the one on every other page (lib/marketmenu.mjs): your pages, List, Make a page.
async function fillMyPages() {
  const slot = document.getElementById('hq-mypages'); if (!slot || slot.dataset.done) return; slot.dataset.done = '1';
  let pages = []; try { const r = await fetch('/api/me/pages', { credentials: 'same-origin' }); if (r.ok) pages = (await r.json()).pages || []; } catch { /* offline: just the two links */ }
  const parent = slot.parentElement; const mk = (href, text, cls) => { const a = document.createElement('a'); a.href = href; a.textContent = text; if (cls) a.className = cls; return a; };
  parent.insertBefore(mk('/label/new', '＋ List something'), slot);
  for (const p of pages) if (typeof p.href === 'string' && /^\/(?!\/)/.test(p.href)) parent.insertBefore(mk(p.href, `📄 ${p.name}`, 'mk-page'), slot);
  parent.insertBefore(mk('/page/new', '＋ Make a page'), slot);
}
