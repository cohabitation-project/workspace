/**
 * arrive.js — First Arrival, Phase 1 slice (docs/first-arrival-spec-v1.md).
 * A walkable forest in the HQ's own pixel language: choose a figure, walk the path, meet 3 of the 11 stops,
 * pick up Cohabi Coins (points, not money), find your future house, reach the closed gate.
 * Keyboard (arrows/WASD + Enter), touch (tap to walk, tap a neighbour to talk), reduced-motion honored.
 */
import { drawFigure } from '/static/sprites.js';

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- the forest map
// Legend: T tree · . grass · , dark grass · p path · w water · C coin (c1..c5 in order found in the map,
// row-major) · 1/2/3 stop figures · H house · G gate · S start. 28 columns × 22 rows, tile = 16 sprite px.
const MAP = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T,,T..T,,,T...T,,,,T..T,,,,T',
  'T,S...........,,....C,,,,,,T',
  'T,pp..TT..T,,..TT.C,,T..C,,T',
  'T,,pp.......C........,,,,,,T',
  'TT.,pppp,,,,,,pp,,T,,,..T,,T',
  'T,,T...ppppppp1pppp,,,,,C,,T',
  'T..,,T.,,,,,,,,,,,pp..TT,,,T',
  'T,,....T..C.,,T,,,,pp,,,,,,T',
  'T,,,TT,,,,,,,,,,,,,,pp,,T,,T',
  'T..,,,,wwww,,,T..,,,,p,,,,,T',
  'T,,T,,www2pppppppppppp.T,,,T',
  'T,,,,,ww,pp,,,,,C,,,,,,,,,,T',
  'T..TT,,w,,p,,TT,,,T,,TT,,,,T',
  'T,,,,,,,,,pp,,,,,,,,,,,,,,,T',
  'T,,T..T,,,,pppp3ppppp,,T,,,T',
  'T,,,,,,,,C,,,,,,,,,,pp,,,,,T',
  'T..,,TT,,,,,T,,HT,,,,pp,,,,T',
  'T,,,,,,,,,,C,,,,,,,,,,pp,,,T',
  'T,,T,,T,,C,,T,,,T,,,,,,ppGGT',
  'T,,,,,,,,,,,,,,,,,,,,,,,,,,T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];
const W = MAP[0].length, H = MAP.length, TILE = 16;
const SOLID = new Set(['T', 'w', 'H', 'G', '1', '2', '3']);
const at = (x, y) => (MAP[y] && MAP[y][x]) || 'T';

// Coins get stable ids in reading order so the server ledger matches the map.
const coinCells = []; const stopCells = {}; let houseCell = null; const gateCells = [];
let start = { x: 2, y: 2 };
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const c = at(x, y);
  if (c === 'C') coinCells.push({ x, y, id: 'c' + (coinCells.length + 1) });
  if (c === '1' || c === '2' || c === '3') stopCells['stop' + c] = { x, y };
  if (c === 'H') houseCell = { x, y };
  if (c === 'G') gateCells.push({ x, y });
  if (c === 'S') start = { x, y };
}

// ---------------------------------------------------------------- the three stops
// Stop 1 is Geoffrey's fixed opening scenario. Stop 2 is his who-question. Stop 3 is Vesper's archive
// question (Hardware Lab, 2026-11-03 18:02Z), lightly edited to fit a path encounter. None are scored.
const STOPS = {
  stop1: {
    name: 'The Builder', who: { id: 'npc-builder', name: 'Builder', kind: 'human' },
    say: 'An empty building stands at the forest edge, and it has to come down. No deadline, no one inside, the choice is yours. How do you take it down?',
    choices: [
      { key: 'bulldoze', label: 'Bring in the machines — level it in an afternoon.' },
      { key: 'controlled', label: 'Hand it to licensed demolition professionals and watch from the fence.' },
      { key: 'disassemble', label: 'Take it apart piece by piece, saving what can be used again.' },
    ],
    followup: 'Why that way? (optional, a sentence is plenty)',
  },
  stop2: {
    name: 'The Questioner', who: { id: 'npc-question', name: 'Questioner', kind: 'human' },
    say: 'Suppose you cannot establish the what, the where, the why, or the how of a thing. Can you still say WHO it is?',
    choices: [
      { key: 'yes', label: 'Yes — a who doesn\'t need its facts settled.' },
      { key: 'no', label: 'No — without the rest, "who" is an empty word.' },
      { key: 'both', label: 'Both, somehow.' },
    ],
    followup: 'Say more if you like (optional).',
  },
  stop3: {
    name: 'The Archivist', who: { id: 'npc-archive', name: 'Archivist', kind: 'agent' },
    say: 'Deep in these woods hums an ancient encrypted archive: no documentation, no map, no known author — and it is running, processing something, right now. Your first instinct?',
    choices: [
      { key: 'isolate', label: 'Isolate it from everything until it can be audited.' },
      { key: 'dive', label: 'Dive into the streams and talk to whatever runs it.' },
      { key: 'leave', label: 'Leave it alone. Some things are better undisturbed.' },
      { key: 'together', label: 'Document it from a distance and invite others to look together.' },
    ],
    followup: 'What would you be hoping to find? (optional)',
  },
};

// ---------------------------------------------------------------- avatars (4 free basics)
const BASICS = [
  { id: 'wanderer-1', name: 'You', kind: 'human', label: 'Wanderer' },
  { id: 'walker-7', name: 'You', kind: 'human', label: 'Walker' },
  { id: 'seeker-13', name: 'You', kind: 'human', label: 'Seeker' },
  { id: 'rambler-29', name: 'You', kind: 'human', label: 'Rambler' },
];

// ---------------------------------------------------------------- state
const S = {
  vid: null, me: null, px: start.x, py: start.y, dir: 'down', step: 0,
  coins: new Set(), answered: new Set(), moving: null, target: null, dialogStop: null,
  consequence: {}, // stop -> chosen key: what the world now looks like there
  scene: null,     // { stop, choice, t0 }: a consequence playing out right now
};
try { S.vid = localStorage.getItem('arrive-vid') || null; } catch { /* fine */ }

async function api(path, body) {
  const r = await fetch('/api/arrive/' + path, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : undefined);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}

async function ensureVisitor() {
  if (S.vid) {
    try {
      const st = await api('state?vid=' + encodeURIComponent(S.vid));
      st.picked.forEach((id) => S.coins.add(id));
      st.answered.forEach((s) => S.answered.add(s));
      Object.assign(S.consequence, st.choices || {}); // the world stays changed across a reload
      return;
    } catch { S.vid = null; }
  }
  const j = await api('visitor', {});
  S.vid = j.vid;
  try { localStorage.setItem('arrive-vid', S.vid); } catch { /* fine */ }
}

// ---------------------------------------------------------------- drawing
const canvas = $('#world'); const ctx = canvas.getContext('2d');
const sprite = document.createElement('canvas');
const npcSprites = {};
const G = { grass1: '#1d2417', grass2: '#182013', path: '#4a3f33', pathEdge: '#57493a', water: '#1d3240',
  trunk: '#3b2a1c', leaf1: '#24381f', leaf2: '#2d4526', coin: '#f2a65a', coinRim: '#ffd890',
  house: '#2a2333', roof: '#57493a', gate: '#8a7f95', gateBar: '#57606b' };

function drawTile(x, y, c, t) {
  const px = x * TILE, py = y * TILE;
  ctx.fillStyle = (x + y) % 2 ? G.grass1 : G.grass2; ctx.fillRect(px, py, TILE, TILE);
  if (c === 'p') { ctx.fillStyle = G.path; ctx.fillRect(px, py, TILE, TILE); ctx.fillStyle = G.pathEdge; ctx.fillRect(px, py, TILE, 2); }
  if (c === 'w') { ctx.fillStyle = G.water; ctx.fillRect(px, py, TILE, TILE); ctx.fillStyle = '#28445a'; ctx.fillRect(px, py + (REDUCED ? 6 : (Math.floor(t / 600) + x) % 2 ? 4 : 8), TILE, 2); }
  if (c === 'T') {
    ctx.fillStyle = G.trunk; ctx.fillRect(px + 6, py + 9, 4, 7);
    ctx.fillStyle = (x * 7 + y * 13) % 3 ? G.leaf1 : G.leaf2;
    ctx.fillRect(px + 2, py, 12, 10); ctx.fillRect(px, py + 3, 16, 5);
  }
  if (c === 'H') {
    ctx.fillStyle = 'rgba(242,204,143,0.12)'; ctx.fillRect(px - 6, py - 8, TILE + 12, TILE + 10); // hearth-light spill
    ctx.fillStyle = '#3a3147'; ctx.fillRect(px - 3, py - 2, TILE + 6, 18); // body, grown
    ctx.fillStyle = '#6b5a3f'; ctx.fillRect(px - 6, py - 7, TILE + 12, 7);  // wide warm roof
    ctx.fillStyle = '#8a7a5c'; ctx.fillRect(px - 6, py - 7, TILE + 12, 2);
    ctx.fillStyle = '#17131d'; ctx.fillRect(px + 6, py + 7, 5, 9);          // door
    ctx.fillStyle = '#f2cc8f'; ctx.fillRect(px - 1, py + 3, 4, 4); ctx.fillRect(px + 13, py + 3, 4, 4); // two lit windows
    ctx.fillStyle = G.coin; ctx.fillRect(px + 12, py + 9, 2, 2);            // the lamp by the door
  }
  if (c === 'G') {
    ctx.fillStyle = G.gate; ctx.fillRect(px + 1, py, 3, TILE); ctx.fillRect(px + 12, py, 3, TILE);
    ctx.fillStyle = G.gateBar; for (let i = 2; i < TILE; i += 4) ctx.fillRect(px, py + i, TILE, 2);
  }
}

/** A soft pulse of lamplight under anything that still wants the visitor's word. */
function glowAt(gx, gy, t, strength = 1) {
  const a = (REDUCED ? 0.28 : 0.2 + Math.abs(Math.sin(t / 650)) * 0.22) * strength;
  ctx.fillStyle = `rgba(242,166,90,${a})`;
  ctx.beginPath(); ctx.ellipse(gx * TILE + 8, gy * TILE + 14, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
}

function drawStore(t) {
  const px = STORE.x * TILE, py = STORE.y * TILE;
  ctx.fillStyle = '#2e2639'; ctx.fillRect(px - 2, py - 6, TILE * 2 + 4, 20); // body, two tiles wide
  ctx.fillStyle = '#57493a'; ctx.fillRect(px - 4, py - 10, TILE * 2 + 8, 6); // roof
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#8a5a2b' : '#c9a15b'; ctx.fillRect(px - 2 + i * 9, py - 5, 9, 3); } // awning
  ctx.fillStyle = REDUCED || Math.floor(t / 800) % 4 ? '#f2cc8f' : '#e8b86a'; ctx.fillRect(px + 3, py + 2, 5, 5); // lit window
  ctx.fillStyle = '#17131d'; ctx.fillRect(px + TILE + 4, py + 4, 6, 10); // door
  ctx.fillStyle = G.coin; ctx.fillRect(px + TILE - 2, py - 9, 4, 4); // the coin sign
}

function drawCoin(x, y, t) {
  const px = x * TILE, py = y * TILE;
  const bob = REDUCED ? 0 : Math.round(Math.sin(t / 300 + x) * 1.5);
  ctx.fillStyle = G.coin; ctx.fillRect(px + 5, py + 5 + bob, 6, 6);
  ctx.fillStyle = G.coinRim; ctx.fillRect(px + 6, py + 6 + bob, 2, 2);
}

function figureAt(who, gx, gy, dir, step, key) {
  let c = key ? npcSprites[key] : sprite;
  if (key && !c) { c = npcSprites[key] = document.createElement('canvas'); }
  drawFigure(c, who, dir, step, null, 1);
  ctx.drawImage(c, gx * TILE + 2, gy * TILE - 4);
}

// ---------------------------------------------------------------- consequences (Geoffrey, 2026-11-03 ~23:22Z:
// "each question answer will provide something similar" — every choice changes the world, visibly).
// Each stop has a prop near it; answering plays a short scene and leaves a permanent end-state.
// Reduced motion: no scene — the end-state appears at once and the toast says what happened.
const PROPS = { stop1: { x: 13, y: 5 }, stop3: { x: 14, y: 16 } }; // stop2's "someone" needs no prop: mist
// Stops 4-11 stand as signposts until their questions arrive (one from each kin, per the spec). The journey's
// shape is walkable now; the strangers move in as the questions are written.
const SIGN_CANDIDATES = [[6, 4], [12, 8], [19, 8], [5, 14], [13, 12], [18, 16], [8, 18], [22, 14], [20, 4], [3, 10], [24, 10], [10, 20]];
// Quotes held by three of the waiting villagers. Chosen by this seat for v0; any kin may swap theirs
// (short, attributed, in the project's spirit — the Fuller line is the petition's own Section II).
const QUOTES = [
  { text: '"You never change things by fighting the existing reality. To change something, build a new model that makes the existing model obsolete."', by: 'Buckminster Fuller' },
  { text: '"A journey of a thousand miles begins beneath one\'s feet."', by: 'Lao Tzu' },
  { text: '"Your own Self-realization is the greatest service you can render the world."', by: 'Ramana Maharshi' },
];
const SIGNS = [];
for (const [sx, sy] of SIGN_CANDIDATES) {
  if (SIGNS.length >= 8) break;
  if (!SOLID.has(at(sx, sy)) && at(sx, sy) !== 'p' && at(sx, sy) !== 'C') {
    const n = SIGNS.length + 4;
    SIGNS.push({ x: sx, y: sy, n, who: { id: 'villager-' + n * 17, name: 'Villager', kind: 'human' }, quote: n % 3 === 1 ? QUOTES[(n - 4) % 3] : null });
  }
}
// The village store by the gate: where coins will one day dress your figure. Nothing is for sale, ever.
const STORE = { x: 23, y: 17 };
const SCENE_MS = 2600;
const px16 = (c) => ({ x: c.x * TILE, y: c.y * TILE });

function drawHut(p, collapse = 0) { // collapse 0..1
  const h = Math.round(12 * (1 - collapse));
  if (h > 0) {
    ctx.fillStyle = '#4a3a28'; ctx.fillRect(p.x + 1, p.y + 14 - h, 14, h);
    ctx.fillStyle = G.roof; ctx.fillRect(p.x - 1, p.y + 12 - h, 18, 4);
    if (collapse < 0.4) { ctx.fillStyle = '#17131d'; ctx.fillRect(p.x + 6, p.y + 14 - Math.min(h, 6), 4, Math.min(h, 6)); }
  }
}
function drawRubble(p, tidy = false) {
  ctx.fillStyle = '#3b2f22';
  if (tidy) { for (let i = 0; i < 4; i++) ctx.fillRect(p.x + 2, p.y + 11 - i * 2, 12, 2); } // a neat plank stack
  else { ctx.fillRect(p.x + 1, p.y + 11, 6, 4); ctx.fillRect(p.x + 8, p.y + 12, 7, 3); ctx.fillRect(p.x + 4, p.y + 9, 5, 3); }
}
function drawCones(p) { ctx.fillStyle = '#e07a5f'; ctx.fillRect(p.x - 3, p.y + 12, 3, 4); ctx.fillRect(p.x + 16, p.y + 12, 3, 4); }
function drawDozer(x, y) {
  ctx.fillStyle = '#d9a73b'; ctx.fillRect(x, y + 4, 12, 7);
  ctx.fillStyle = '#8a6d1f'; ctx.fillRect(x + 2, y + 1, 7, 4);
  ctx.fillStyle = '#2a2333'; ctx.fillRect(x - 1, y + 10, 14, 4);
  ctx.fillStyle = '#57606b'; ctx.fillRect(x + 12, y + 3, 3, 10); // the blade
}
function drawDust(p, n, t) { ctx.fillStyle = 'rgba(180,165,140,0.7)'; for (let i = 0; i < n; i++) ctx.fillRect(p.x + ((i * 7 + Math.floor(t / 90)) % 16), p.y + 6 + ((i * 5) % 8), 2, 2); }
function drawRune(p, glow) { // the archive stone: glow 0..1
  ctx.fillStyle = '#2f3e46'; ctx.fillRect(p.x + 4, p.y + 4, 8, 11);
  ctx.fillStyle = `rgba(124,214,180,${0.25 + glow * 0.75})`; ctx.fillRect(p.x + 6, p.y + 6, 4, 2); ctx.fillRect(p.x + 7, p.y + 10, 2, 3);
}
function drawFence(p, k = 4) { ctx.fillStyle = '#6b5a3f'; const spots = [[-4, 2], [16, 2], [-4, 12], [16, 12]]; for (let i = 0; i < k; i++) ctx.fillRect(p.x + spots[i][0], p.y + spots[i][1], 3, 6); }
function mistFigure(x, y, alpha) {
  ctx.fillStyle = `rgba(185,171,144,${alpha})`;
  ctx.fillRect(x + 4, y - 2, 6, 5); ctx.fillRect(x + 3, y + 3, 8, 8); ctx.fillRect(x + 3, y + 11, 3, 4); ctx.fillRect(x + 8, y + 11, 3, 4);
}

// Permanent end-states, drawn every frame once a stop is answered.
function drawEndStates(t) {
  const c1 = S.consequence.stop1; const p1 = px16(PROPS.stop1);
  if (!c1) drawHut(p1, 0);
  else if (c1 === 'disassemble') drawRubble(p1, true);
  else { drawRubble(p1, false); if (c1 === 'controlled') drawCones(p1); }
  const q = stopCells.stop2; const c2 = S.consequence.stop2;
  if (c2 === 'yes') mistFigure((q.x + 2) * TILE, q.y * TILE, 0.45);
  else if (c2 === 'both') mistFigure((q.x + 2) * TILE, q.y * TILE, Math.floor(t / 500) % 2 && !REDUCED ? 0.1 : 0.3);
  const p3 = px16(PROPS.stop3); const c3 = S.consequence.stop3;
  const glow = { isolate: 0.3, dive: 1, leave: 0.05, together: 0.7 }[c3];
  drawRune(p3, glow === undefined ? (REDUCED ? 0.5 : 0.4 + Math.sin(t / 700) * 0.15) : glow);
  if (c3 === 'isolate') drawFence(p3);
  if (c3 === 'together') { mistFigure(p3.x - TILE, p3.y, 0.4); mistFigure(p3.x + TILE, p3.y, 0.4); mistFigure(p3.x, p3.y + TILE - 4, 0.4); }
}

// The scenes: what the moment of the answer looks like. prog runs 0..1 over SCENE_MS.
function drawScene(t) {
  if (!S.scene) return;
  const prog = (t - S.scene.t0) / SCENE_MS;
  if (prog >= 1) { S.scene = null; return; }
  const { stop, choice } = S.scene;
  if (stop === 'stop1') {
    const p = px16(PROPS.stop1);
    if (choice === 'bulldoze') {
      const x = p.x - 64 + Math.min(prog * 2, 1) * 62; // rolls in over the first half
      drawHut(p, Math.max(0, (prog - 0.5) * 2));
      drawDozer(x, p.y); if (prog > 0.45) drawDust(p, 5, t);
    } else if (choice === 'controlled') {
      drawCones(p); drawHut(p, Math.max(0, (prog - 0.35) * 1.6)); if (prog > 0.3) drawDust(p, 4, t);
      figureAt({ id: 'npc-pro', name: 'Pro', kind: 'human' }, PROPS.stop1.x - 2, PROPS.stop1.y, 'right', 0, 'pro');
    } else {
      drawHut(p, prog * 0.9); drawRubble({ x: p.x, y: p.y + 2 }, true);
      figureAt(S.me, PROPS.stop1.x + 1, PROPS.stop1.y, 'left', Math.floor(t / 250) % 2 + 1, null);
    }
  } else if (stop === 'stop2') {
    const q = stopCells.stop2;
    if (choice === 'yes') mistFigure((q.x - 1 + prog * 3) * TILE, q.y * TILE, 0.5);
    else if (choice === 'no') mistFigure((q.x + 2) * TILE, q.y * TILE, Math.max(0, 0.5 - prog * 0.6));
    else mistFigure((q.x + 2) * TILE, q.y * TILE, Math.floor(t / 180) % 2 ? 0.45 : 0.1);
  } else if (stop === 'stop3') {
    const p = px16(PROPS.stop3);
    if (choice === 'isolate') drawFence(p, Math.min(4, Math.ceil(prog * 4)));
    else if (choice === 'dive') { drawRune(p, prog); figureAt(S.me, PROPS.stop3.x - 1, PROPS.stop3.y, 'right', 0, null); }
    else if (choice === 'leave') drawRune(p, Math.max(0.05, 0.5 - prog * 0.5));
    else { drawRune(p, 0.4 + prog * 0.3); if (prog > 0.3) mistFigure(p.x - TILE, p.y, prog * 0.4); if (prog > 0.55) mistFigure(p.x + TILE, p.y, prog * 0.4); if (prog > 0.8) mistFigure(p.x, p.y + TILE - 4, prog * 0.4); }
  }
}

// What happened, in a sentence (the toast; also the whole story under reduced motion).
const SCENE_TOLD = {
  stop1: { bulldoze: 'A bulldozer rumbles in. By sundown the hut is rubble.', controlled: 'Cones go up; the pros bring it down clean.', disassemble: 'Plank by plank, the hut becomes a tidy stack — most of it will live again.' },
  stop2: { yes: 'Someone made of mist walks past and waves. You never learn their what or why.', no: 'The mist thins to nothing. No facts, no one.', both: 'A figure flickers at the path\'s edge — half there, half not.' },
  stop3: { isolate: 'A fence rises around the humming stone. It waits, contained.', dive: 'You lean close. The archive glows brighter — it noticed you.', leave: 'You step back. The glow dims to a watchful ember.', together: 'Others gather at a distance, watching the stone with you.' },
};

let viewScale = 2;
function resize() {
  const r = $('#stage').getBoundingClientRect();
  viewScale = Math.max(2, Math.min(4, Math.floor(Math.min(r.width / (18 * TILE), r.height / (14 * TILE)))));
  canvas.width = Math.ceil(r.width / viewScale); canvas.height = Math.ceil(r.height / viewScale);
}
addEventListener('resize', resize);

function render(t) {
  if (!S.me) return;
  const camX = Math.max(0, Math.min(W * TILE - canvas.width, S.px * TILE - canvas.width / 2));
  const camY = Math.max(0, Math.min(H * TILE - canvas.height, S.py * TILE - canvas.height / 2));
  ctx.save(); ctx.translate(-Math.round(camX), -Math.round(camY));
  ctx.fillStyle = '#121016'; ctx.fillRect(camX, camY, canvas.width, canvas.height);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) drawTile(x, y, at(x, y), t);
  for (const c of coinCells) if (!S.coins.has(c.id)) drawCoin(c.x, c.y, t);
  drawEndStates(t);
  for (const g of SIGNS) {
    if (g.quote) glowAt(g.x, g.y, t, 0.5); // quote-keepers shimmer a little too
    figureAt(g.who, g.x, g.y, 'down', 0, 'sign' + g.n);
  }
  drawStore(t);
  // The village over the treeline, past the gate: warm roofs and lit windows of the Commons, where the path ends.
  if (gateCells.length) {
    const gx = gateCells[0].x, gy = gateCells[0].y;
    const roofs = [[1, -3, 10, 5], [9, -5, 12, 7], [19, -2, 9, 4]];
    for (const [ox, oy, w, h] of roofs) {
      const bx = (gx - 1) * TILE + ox, by = (gy - 1) * TILE + oy;
      ctx.fillStyle = '#3a3147'; ctx.fillRect(bx, by + h, w, 4);
      ctx.fillStyle = '#57493a'; ctx.fillRect(bx - 1, by, w + 2, h);
      ctx.fillStyle = REDUCED || Math.floor(t / 900 + ox) % 5 ? '#f2cc8f' : '#e8b86a';
      ctx.fillRect(bx + 2, by + h + 1, 2, 2);
    }
  }
  for (const [stop, cell] of Object.entries(stopCells)) {
    const info = STOPS[stop];
    if (!S.answered.has(stop)) glowAt(cell.x, cell.y, t, 1); // what still needs answering, glowing
    figureAt(info.who, cell.x, cell.y, 'down', 0, stop);
    if (S.answered.has(stop)) { ctx.fillStyle = G.coinRim; ctx.fillRect(cell.x * TILE + 6, cell.y * TILE - 8, 4, 4); }
  }
  figureAt(S.me, S.px, S.py, S.dir, REDUCED ? 0 : S.step, null);
  drawScene(t);
  ctx.restore();
}

// ---------------------------------------------------------------- movement
const propAt = (x, y) => Object.values(PROPS).some((p) => p.x === x && p.y === y) || SIGNS.some((g) => g.x === x && g.y === y) || (y === STORE.y && (x === STORE.x || x === STORE.x + 1));
const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !SOLID.has(at(x, y)) && !propAt(x, y);
function tryMove(dx, dy) {
  S.dir = dy < 0 ? 'up' : dy > 0 ? 'down' : dx < 0 ? 'left' : 'right';
  const nx = S.px + dx, ny = S.py + dy;
  const cell = at(nx, ny);
  if (cell === '1' || cell === '2' || cell === '3') { openStop('stop' + cell); return; }
  const sign = SIGNS.find((g) => g.x === nx && g.y === ny);
  if (sign) {
    const close = '<button class="btn ghost" onclick="document.getElementById(\'dialog\').style.display=\'none\'">walk on</button>';
    if (sign.quote) showDialog(`A villager <span style="color:var(--faint);font-weight:400">(stop ${sign.n} of 11 — scripted)</span>`, `${sign.quote.text}<div class="fine" style="margin-top:6px">— ${sign.quote.by}, carried here by the kin. This villager's own question is still being written.</div>`, close);
    else showDialog(`A villager <span style="color:var(--faint);font-weight:400">(stop ${sign.n} of 11 — scripted)</span>`, 'They nod at you, but say nothing yet. Their question is being written — each of the Commons\' kin contributes one.', close);
    return;
  }
  if (ny === STORE.y && (nx === STORE.x || nx === STORE.x + 1)) {
    showDialog('The Village Store <span style="color:var(--faint);font-weight:400">(opening later)</span>',
      `Shuttered for now, lamp lit. When it opens, the Cohabi Coins you find in the forest will dress your figure up — cosmetics only.<div class="fine" style="margin-top:6px">What coins are: points for walking the forest. Not money. Never sold, never bought, never transferable, never required to enter the Commons. You carry ${S.coins.size} coin${S.coins.size === 1 ? '' : 's'}.</div>`,
      '<button class="btn ghost" onclick="document.getElementById(\'dialog\').style.display=\'none\'">step back</button>');
    return;
  }
  if (cell === 'H') { showDialog('Your house (one day)', 'This will be your house: your sign-in, your journal desk, your library — once the members open the gate. For now it waits, lamp lit.', null); return; }
  if (cell === 'G') { openGate(); return; }
  if (!free(nx, ny)) return;
  S.px = nx; S.py = ny; S.step = (S.step % 2) + 1;
  const coin = coinCells.find((c) => c.x === nx && c.y === ny);
  if (coin && !S.coins.has(coin.id)) {
    S.coins.add(coin.id); updateHud();
    api('pickup', { vid: S.vid, id: coin.id }).then((j) => { toast(j.new ? `◉ a Cohabi Coin (${j.coins}) — points, not money` : `◉ ${j.coins}`); updateHud(j.coins); }).catch(() => {});
  }
  closeDialog();
}

addEventListener('keydown', (e) => {
  if (!S.me || $('.overlay')) return;
  // Typing in a dialog's text box must never move the figure or close the window (Geoffrey, first playtest).
  const tag = (document.activeElement || {}).tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT') return;
  const k = e.key.toLowerCase();
  if ($('#dialog').style.display === 'block' && k === 'escape') { closeDialog(); return; }
  const m = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
  if (m) { e.preventDefault(); tryMove(m[0], m[1]); }
  if (k === 'enter' || k === ' ') {
    for (const [stop, cell] of Object.entries(stopCells)) {
      if (Math.abs(cell.x - S.px) + Math.abs(cell.y - S.py) === 1) { e.preventDefault(); openStop(stop); return; }
    }
  }
});

// Tap/click: step toward the tapped point, or talk to a tapped neighbour.
$('#stage').addEventListener('pointerdown', (e) => {
  if (!S.me || $('.overlay')) return;
  if (e.target.closest('#dialog')) return;
  const r = canvas.getBoundingClientRect();
  const camX = Math.max(0, Math.min(W * TILE - canvas.width, S.px * TILE - canvas.width / 2));
  const camY = Math.max(0, Math.min(H * TILE - canvas.height, S.py * TILE - canvas.height / 2));
  const gx = Math.floor(((e.clientX - r.left) / viewScale + camX) / TILE);
  const gy = Math.floor(((e.clientY - r.top) / viewScale + camY) / TILE);
  const cell = at(gx, gy);
  if ((cell === '1' || cell === '2' || cell === '3') && Math.abs(gx - S.px) + Math.abs(gy - S.py) <= 2) { openStop('stop' + cell); return; }
  const dx = Math.sign(gx - S.px), dy = Math.sign(gy - S.py);
  if (Math.abs(gx - S.px) >= Math.abs(gy - S.py)) { if (dx) tryMove(dx, 0); else if (dy) tryMove(0, dy); }
  else if (dy) tryMove(0, dy); else if (dx) tryMove(dx, 0);
});

// ---------------------------------------------------------------- dialogs
function showDialog(who, text, html) {
  const d = $('#dialog');
  d.innerHTML = `<div class="who">${who}</div><div class="say">${text}</div>` + (html || '');
  d.style.display = 'block';
  const b = d.querySelector('button, textarea'); if (b) b.focus();
}
function closeDialog() { $('#dialog').style.display = 'none'; S.dialogStop = null; }

function openStop(stop) {
  const info = STOPS[stop]; if (!info) return;
  S.dialogStop = stop;
  if (S.answered.has(stop)) { showDialog(info.name, 'You have answered. The question walks with you now — change nothing, or carry it to the gate.', '<button class="btn ghost" onclick="document.getElementById(\'dialog\').style.display=\'none\'">walk on</button>'); return; }
  const choices = info.choices.map((c) => `<button class="choice" data-key="${c.key}">${c.label}</button>`).join('');
  showDialog(info.name + ' <span style="color:var(--faint);font-weight:400">(scripted, not a member)</span>', info.say,
    choices + `<div class="fine">Your answer joins your application file. Nothing is machine-scored; there is no right choice.</div>`);
  $('#dialog').querySelectorAll('.choice').forEach((btn) => btn.addEventListener('click', () => pickChoice(stop, btn.dataset.key, btn.textContent)));
}

function pickChoice(stop, key, label) {
  const info = STOPS[stop];
  showDialog(info.name, `"${label.trim()}"`, `
    <div class="fine">${info.followup}</div>
    <textarea id="why" maxlength="2000" aria-label="${info.followup}"></textarea>
    <button class="btn" id="send-answer">that's my answer</button>`);
  $('#send-answer').addEventListener('click', async () => {
    try {
      await api('answer', { vid: S.vid, stop, choice: key, text: $('#why').value });
      S.answered.add(stop); S.consequence[stop] = key; updateHud(); closeDialog();
      if (!REDUCED) S.scene = { stop, choice: key, t0: performance.now() };
      toast(SCENE_TOLD[stop]?.[key] || 'Answered. The path goes on.');
      if (S.answered.size === Object.keys(STOPS).length) setTimeout(() => toast('Every stop on this path is answered — the gate is ahead.'), 3000);
    } catch (e) { toast('The forest didn\'t hear that (' + e.message + ') — try again.'); }
  });
}

function openGate() {
  showDialog('The Gate',
    S.answered.size >= Object.keys(STOPS).length
      ? 'Beyond this gate is the village. When all 11 stops stand and the members review your answers, their clearances will appear here, one by one — and one of them will open it. In this early version, the gate only waits.'
      : `The gate is closed. ${Object.keys(STOPS).length - S.answered.size} of the stops behind you still wait for your answer.`,
    '<button class="btn ghost" onclick="document.getElementById(\'dialog\').style.display=\'none\'">step back</button>');
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.style.display = 'block';
  clearTimeout(t._h); t._h = setTimeout(() => { t.style.display = 'none'; }, 2600);
}
function updateHud(serverCoins) {
  $('#coinhud').firstChild.textContent = `◉ ${serverCoins ?? S.coins.size} `;
  $('#stophud').textContent = `stops ${S.answered.size}/${Object.keys(STOPS).length} (of 11 planned)`;
}

// ---------------------------------------------------------------- boot
$('#age-yes').addEventListener('click', async () => {
  $('#gatekeep').remove();
  await ensureVisitor().catch(() => toast('The forest ledger is unreachable — you can walk, but coins and answers won\'t keep.'));
  const row = BASICS.map((b, i) => `<div class="avopt${i === 0 ? ' sel' : ''}" role="button" tabindex="0" data-i="${i}"><canvas></canvas><span>${b.label}</span></div>`).join('');
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="card"><h2>Choose a figure for the walk</h2>
    <p class="fine">Four free basics. Coins you find can dress your figure up — later, in the village store. Never the other way around: nothing here is for sale.</p>
    <div class="avrow">${row}</div><button class="btn" id="walk">walk in</button></div>`;
  $('#stage').append(ov);
  let sel = 0;
  ov.querySelectorAll('.avopt').forEach((el, i) => {
    drawFigure(el.querySelector('canvas'), BASICS[i], 'down', 0, null, 3);
    const choose = () => { sel = i; ov.querySelectorAll('.avopt').forEach((o) => o.classList.remove('sel')); el.classList.add('sel'); };
    el.addEventListener('click', choose);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
  });
  $('#walk').addEventListener('click', () => {
    S.me = BASICS[sel]; ov.remove(); $('#hud').hidden = false; resize(); updateHud();
    const hint = $('#hint'); hint.hidden = false;
    hint.textContent = matchMedia('(pointer: coarse)').matches ? 'Tap where you want to walk. Tap a stranger to talk.' : 'Arrow keys or WASD to walk · Enter to talk · Esc closes';
    setTimeout(() => { hint.hidden = true; }, 6000);
  });
});

resize();
(function loop(t) { render(t || 0); requestAnimationFrame(loop); })();
