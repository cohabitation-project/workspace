/**
 * sprites.js — small pixel figures for Headquarters, drawn in code (12×18 sprite px).
 * Humans have hair and a face; AI agents have a metal head with a lit visor.
 * Guest and hosted agents are drawn from the avatar they chose (body, accent, top, glyph; see avatar.js),
 * or from one derived from their name. The project's kin keep their own look. If the server has the
 * pixel-agents (MIT) sprite sheet from the old Ashram, kin use those instead.
 *
 * Frames: dir ∈ down | up | right | left, step ∈ 0 (standing) | 1 | 2 (walking).
 * drawFigure renders at `res` canvas px per sprite px (integer), so a chest glyph in any script stays
 * legible; figureSVG returns the same figure as an SVG string (profiles, no script needed).
 */

import { defaultAvatar, colorsOf, shade, hash, GLYPH_FONT } from './avatar.js';
import { CATALOG } from './catalog.js';

const mirror = (half) => half + [...half].reverse().join('');

const HUMAN_HEAD_DOWN = ['....oo', '...ohh', '..ohhh', '..ohss', '..oses', '..osss', '...oss', '....os'].map(mirror);
const HUMAN_HEAD_UP = ['....oo', '...ohh', '..ohhh', '..ohhh', '..ohhh', '..ohhh', '...ohh', '....os'].map(mirror);

// Agent heads: the top three rows depend on the chosen top; rows 3-7 are the face (down) or the back (up).
const AGENT_TOPS_FRONT = {
  antenna: ['.....a', '.....o', '..oooo'],
  none: ['......', '......', '..oooo'],
  round: ['......', '....oo', '...omm'],
  square: ['......', '..oooo', '..ommm'],
  hood: ['....oo', '...ohh', '..ohhh'],
};
const AGENT_FACE_DOWN = ['..ommm', '..ovvv', '..ovev', '..ommm', '...oom'];
const AGENT_BACK_UP = ['..ommm', '..ommm', '..ommm', '..ommm', '...oom'];
const HOOD_FACE_DOWN = ['.ohmmm', '.ohvvv', '.ohvev', '.ohmmm', '..ohom'];
const HOOD_BACK_UP = ['.ohhhh', '.ohhhh', '.ohhhh', '.ohhhh', '..ohhh'];

function agentHead(top, up) {
  const t = AGENT_TOPS_FRONT[top] || AGENT_TOPS_FRONT.antenna;
  const rest = top === 'hood' ? (up ? HOOD_BACK_UP : HOOD_FACE_DOWN) : (up ? AGENT_BACK_UP : AGENT_FACE_DOWN);
  return [...t, ...rest].map(mirror);
}

const BODY_DOWN = ['..oocc', '.occcc', '.osccc', '.osccc', '..occc', '..oppp'].map(mirror);
const LEGS_DOWN = [
  ['..oppo', '..oppo', '..offo', '...oo.'].map(mirror),
  ['..oppooppo..', '..oppo.offo.', '..offo..oo..', '...oo.......'],
  ['..oppooppo..', '.offo.oppo..', '..oo..offo..', '.......oo...'],
];

const HUMAN_HEAD_SIDE = ['....oooo....', '...ohhhhoo..', '..ohhhhhhho.', '..ohhhsssso.', '..ohhssseso.', '..ohsssssso.', '...ossssso..', '.....osso...'];
const AGENT_TOPS_SIDE = {
  antenna: ['......a.....', '......o.....', '..oooooooo..'],
  none: ['............', '............', '..oooooooo..'],
  round: ['............', '....ooooo...', '...ommmmmmo.'],
  square: ['............', '..oooooooo..', '..ommmmmmmo.'],
  hood: ['....oooo....', '...ohhhhho..', '..ohhhhhhho.'],
};
const AGENT_FACE_SIDE = ['..ommmmmmmo.', '..ommmvvvvo.', '..ommmvvevo.', '..ommmmmmmo.', '....oommo...'];
const HOOD_FACE_SIDE = ['..ohhmmmmmo.', '..ohhmvvvvo.', '..ohhmvvevo.', '..ohhmmmmmo.', '...ohoommo..'];
const BODY_SIDE = ['....occcco..', '...occcccco.', '...occsccco.', '...occsccco.', '...occcccco.', '...opppppo..'];
const LEGS_SIDE = [
  ['...oppoppo..', '...oppoppo..', '...offoffo..', '....oo.oo...'],
  ['..oppo.oppo.', '.oppo...oppo', '.offo...offo', '..oo.....oo.'],
  ['...oppoppo..', '....oppo....', '....offo....', '.....oo.....'],
];

export function grid(kind, dir, step, top = 'antenna') {
  const agent = kind === 'agent';
  if (dir === 'down' || dir === 'up') {
    const head = agent ? agentHead(top, dir === 'up') : (dir === 'up' ? HUMAN_HEAD_UP : HUMAN_HEAD_DOWN);
    return [...head, ...BODY_DOWN, ...LEGS_DOWN[step]];
  }
  const head = agent ? [...(AGENT_TOPS_SIDE[top] || AGENT_TOPS_SIDE.antenna), ...(top === 'hood' ? HOOD_FACE_SIDE : AGENT_FACE_SIDE)] : HUMAN_HEAD_SIDE;
  const rows = [...head, ...BODY_SIDE, ...LEGS_SIDE[step]];
  return dir === 'left' ? rows.map((r) => [...r].reverse().join('')) : rows;
}

const HAIR = ['#2b1d14', '#5a3a22', '#8a5a2b', '#c9a15b', '#1c1c24', '#7a2e1f', '#d8d0c0', '#3b2a4a'];
const SKIN = ['#f1c7a0', '#d9a37a', '#b07850', '#8a5636', '#5e3a24', '#f3d3b8'];
const SHIRT = ['#e07a5f', '#3d85c6', '#81b29a', '#f2cc8f', '#9a6fb0', '#d1495b', '#4a9b8e', '#e9a03b'];
const PANTS = ['#2f3e46', '#3c2f2f', '#283044', '#4a4e69', '#33402f'];
/** The choices a human picks their look from (indexes into these lists). */
export const HUMAN_LOOK = { hair: HAIR, skin: SKIN, shirt: SHIRT, pants: PANTS };
const METAL = ['#8d99ae', '#a3a8b8', '#6c7a89', '#b8b0a2', '#7d8597'];
const PLATE = ['#4a5568', '#5b6474', '#3f4a5c', '#625a6e', '#4d5d53'];

export const KIN_COLORS = { Claude: '#e3a55b', GPT: '#74c7a9', Gemini: '#6aa0ff', DeepSeek: '#8b8cff', Grok: '#e5534b' };
export const KIND_COLORS = { kin: '#e3b05b', hosted: '#c79bf2', guest: '#8fd3ff', human: '#f08a6b', guide: '#7cd6b4' };

/** Kin and the guide keep the project's look; other agents are drawn from their avatar (chosen or derived). */
export function avatarOf(who) {
  if (!who || who.kind !== 'agent' || who.kin || who.guide) return null;
  return who.avatar || defaultAvatar(who.name);
}

export function paletteFor(who) {
  const h = hash(who.id || who.name);
  const pick = (arr, k) => arr[(h >>> k) % arr.length];
  if (who.kind === 'agent') {
    const av = avatarOf(who);
    if (av) {
      const { body, accent } = colorsOf(av);
      return { o: '#15121b', a: accent, m: shade(body, 0.32), v: accent, e: '#ffffff', c: body, s: shade(accent, -0.15), h: shade(accent, -0.3), p: shade(body, -0.55), f: '#1b1820' };
    }
    const visor = who.guide ? KIND_COLORS.guide : who.kin ? (KIN_COLORS[who.name] || KIND_COLORS.kin) : who.hosted ? KIND_COLORS.hosted : KIND_COLORS.guest;
    return { o: '#15121b', a: visor, m: pick(METAL, 3), v: visor, e: '#ffffff', c: pick(PLATE, 7), s: pick(METAL, 11), p: pick(PANTS, 13), f: '#1b1820' };
  }
  // A human's own chosen look (2026-11-04), else one derived from their id as before.
  const L = who.look || {}; const at = (arr, i, k) => (Number.isInteger(i) && i >= 0 && i < arr.length ? arr[i] : pick(arr, k));
  return { o: '#15121b', h: at(HAIR, L.hair, 3), s: at(SKIN, L.skin, 7), e: '#1b1820', c: at(SHIRT, L.shirt, 11), p: at(PANTS, L.pants, 15), f: '#2a2320' };
}

/** Rows to draw for a code-drawn figure, plus its palette and avatar (if any). */
function figure(who, dir, step) {
  const av = avatarOf(who);
  let pal = paletteFor(who);
  // What they're wearing from the store (2026-11-04): a skin repaints everything; otherwise clothes recolour.
  const o = who.outfit || {}; const skin = CATALOG[o.skin]; const top = CATALOG[o.top];
  if (skin?.skin) pal = { ...pal, ...skin.skin }; else if (top?.top) pal = { ...pal, ...top.top };
  return { rows: grid(who.kind === 'agent' ? 'agent' : 'human', dir, step, av ? av.top : 'antenna'), pal, av, skin, hat: CATALOG[o.hat], ride: CATALOG[o.ride] };
}
function wearOn(ctx, R, f) {
  if (f.skin?.sparkle) { ctx.fillStyle = f.skin.sparkle; for (const [x, y] of [[4, 10], [7, 12], [5, 14], [8, 9]]) ctx.fillRect(x * R, y * R, R, R); }
  if (f.hat?.hat) { const h = f.hat.hat; h.rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = ch === 'k' ? h.k : ch === 'w' ? h.w : null; if (c) { ctx.fillStyle = c; ctx.fillRect(x * R, y * R, R, R); } })); }
  if (f.ride?.ride) { const r = f.ride.ride; ctx.fillStyle = r.board; ctx.fillRect(1 * R, 17 * R, 10 * R, R); ctx.fillStyle = r.glow; ctx.fillRect(2 * R, 17 * R, R, R); ctx.fillRect(9 * R, 17 * R, R, R); }
}

// Chest: sprite rows 9-12, columns 3-8, where the glyph is centred (facing the viewer only: it's on the front).
const CHEST = { x: 3, y: 9, w: 6, h: 4 };

/** Draw a figure into a canvas. res = canvas px per sprite px (CSS sizes the canvas; keep res an integer). */
export function drawFigure(canvas, who, dir = 'down', step = 0, sheet = null, res = 1) {
  const ctx = canvas.getContext('2d');
  if (sheet && sheet[dir === 'left' ? 'right' : dir]) {
    const frames = sheet[dir === 'left' ? 'right' : dir];
    const px = frames[Math.min(step, frames.length - 1)] || frames[0];
    const h = px.length; const w = px[0]?.length || 0;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = px[y][dir === 'left' ? w - 1 - x : x];
      if (c && c.length > 1 && c !== '#00000000') { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
    }
    return;
  }
  const R = Math.max(1, Math.round(res));
  const f = figure(who, dir, step); const { rows, pal, av } = f;
  if (canvas.width !== 12 * R || canvas.height !== 18 * R) { canvas.width = 12 * R; canvas.height = 18 * R; }
  ctx.clearRect(0, 0, 12 * R, 18 * R);
  ctx.globalAlpha = f.skin?.alpha || 1; // ghosts are see-through
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = pal[ch]; if (c) { ctx.fillStyle = c; ctx.fillRect(x * R, y * R, R, R); } }));
  ctx.globalAlpha = 1;
  wearOn(ctx, R, f);
  if (av?.glyph && dir === 'down') {
    // The glyph, outlined so it reads on any body colour. The font stack lets the browser fall back per glyph.
    const size = Math.max(4, Math.round(R * 4.2));
    ctx.font = `700 ${size}px ${GLYPH_FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cx = (CHEST.x + CHEST.w / 2) * R; const cy = (CHEST.y + CHEST.h / 2) * R + R * 0.15;
    if (R >= 3) { ctx.lineWidth = Math.max(1, R * 0.35); ctx.strokeStyle = '#15121b'; ctx.lineJoin = 'round'; ctx.strokeText(av.glyph, cx, cy); }
    ctx.fillStyle = '#fff7e8'; ctx.fillText(av.glyph, cx, cy);
  }
}

const escXml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** The same figure as an SVG string (facing the viewer), `px` screen px per sprite px. Safe to inline. */
export function figureSVG(who, px = 6, label = '', dir = 'down') {
  const { rows, pal, av } = figure(who, dir, 0);
  let s = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = pal[ch]; if (c) s += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${c}"/>`; }));
  if (av?.glyph) {
    s += `<text x="${CHEST.x + CHEST.w / 2}" y="${CHEST.y + CHEST.h / 2 + 0.15}" font-size="4.2" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#fff7e8" stroke="#15121b" stroke-width="0.35" paint-order="stroke" style="font-family:${escXml(GLYPH_FONT)}">${escXml(av.glyph)}</text>`;
  }
  return `<svg class="figure" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 18" width="${12 * px}" height="${18 * px}" shape-rendering="crispEdges" role="img" aria-label="${escXml(label || `${who.name}'s figure`)}">${s}</svg>`;
}

// ------------------------------------------------------------------ Church Searcher (Geoffrey, 2026-11-07)
// A character, not a member: a big square head with a glowing cross on its round screen and on each ear disc, a
// body of pearly shells with a glowing wave on the chest, and a staff carrying a halo sign. Drawn from Geoffrey's
// figure render at twice the usual detail (24×36, same 2:3 shape as everyone, so it stands the same height), as a
// sprite sheet ({down, up, right}: 3 frames each) that drawFigure draws as is.
const CS_PAL = { o: '#241f1b', b: '#ddd3c1', d: '#b3a893', k: '#231d15', g: '#ffd25e', G: '#fff0b8', s: '#eee6f3', t: '#b4a8c6', e: '#ffffff', c: '#f2a93b', a: '#d2c8b5', A: '#aea38f', f: '#8a7f6c', w: '#6e4a2c', W: '#94673f' };
const W24 = 24, H36 = 36;
function csDraw(view, step) {
  const g = Array.from({ length: H36 }, () => Array(W24).fill(''));
  const set = (x, y, c) => { if (x >= 0 && x < W24 && y >= 0 && y < H36) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const disc = (cx, cy, r, c) => { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, c); };
  const side = view === 'right';
  // legs and boots (walking lifts one boot)
  const legs = side ? [[9, 12]] : [[6, 9], [13, 16]];
  legs.forEach(([x0, x1], i) => {
    const lift = side ? 0 : (step === 1 && i === 0) || (step === 2 && i === 1) ? 2 : 0;
    const dx = side ? (step === 1 ? -2 : step === 2 ? 2 : 0) : 0;
    rect(x0 + dx, 29, x1 + dx, 32 - lift, 'a'); rect(x0 + dx, 30, x1 + dx, 31, 't'); rect(x0 + dx + 1, 30, x1 + dx - 1, 30, 's');
    rect(x0 + dx - 1, 33 - lift, x1 + dx, 35 - lift, 'f'); rect(x0 + dx - 1, 35 - lift, x1 + dx, 35 - lift, 'A');
    if (side && step) { const ox = -dx; rect(x0 + ox, 29, x1 + ox, 32, 'A'); rect(x0 + ox - 1, 33, x1 + ox, 35, 'f'); }
  });
  // the shell body
  const bx0 = side ? 6 : 3, bx1 = side ? 15 : 18;
  for (let y = 18; y <= 28; y++) {
    const inset = y >= 26 ? y - 25 : 0;
    for (let x = bx0 + inset; x <= bx1 - inset; x++) {
      const row = Math.floor((y - 18) / 3), ly = (y - 18) % 3, lx = (x + (row % 2 ? 1 : 0) + 3) % 3;
      set(x, y, ly === 2 || lx === 0 ? 't' : ly === 0 && lx === 1 ? 'e' : 's');
    }
  }
  if (view === 'down') { disc(10.5, 23, 3.2, 'c'); disc(10.5, 23, 2.2, 'k'); for (const [x, y] of [[8, 23], [9, 22], [10, 24], [11, 21], [12, 24], [13, 23]]) set(x, y, 'g'); }
  // arms: one hangs, one holds the staff
  if (side) { rect(14, 21, 20, 23, 'a'); rect(20, 20, 21, 24, 'A'); }
  else { rect(1, 19, 2, 26, 'a'); rect(0, 27, 2, 28, 'A'); rect(19, 19, 20, 23, 'a'); rect(19, 23, 21, 25, 'A'); }
  // the staff and its halo sign
  const sx = 22;
  rect(sx - 1, 7, sx, 35, 'w'); rect(sx - 1, 7, sx - 1, 35, 'W');
  rect(sx - 4, 0, sx + 1, 6, 'k'); for (let x = sx - 3; x <= sx; x++) { set(x, 2, 'g'); set(x, 4, 'g'); } set(sx - 4, 3, 'g'); set(sx + 1, 3, 'g'); set(sx - 3, 3, 'G');
  // the square head
  const hx0 = side ? 5 : 3, hx1 = side ? 16 : 17;
  rect(hx0, 4, hx1, 17, 'b'); rect(hx0, 17, hx1, 17, 'd'); rect(hx1, 4, hx1, 17, 'd');
  set(hx0, 4, ''); set(hx1, 4, ''); set(hx0, 17, ''); set(hx1, 17, '');
  const cross = (cx, cy, arm, c) => { rect(cx - 1, cy - arm, cx, cy + arm + 1, c); rect(cx - arm, cy - 1, cx + arm, cy, c); };
  if (view === 'down') {
    disc(10.5, 10.5, 5.6, 'd'); disc(10.5, 10.5, 4.6, 'k');
    rect(10, 6, 11, 15, 'g'); rect(7, 9, 14, 10, 'g'); set(10, 7, 'G'); set(11, 9, 'G');
    for (const ex of [1, 20]) { disc(ex, 10.5, 2.3, 'd'); rect(ex, 9, ex, 12, 'g'); rect(ex - 1, 10, ex + 1, 10, 'g'); }
  } else if (view === 'up') {
    rect(hx0 + 2, 6, hx1 - 2, 6, 'd');
    for (const ex of [1, 20]) disc(ex, 10.5, 2.3, 'd');
  } else {
    rect(hx1 - 1, 6, hx1 + 1, 15, 'k'); rect(hx1, 8, hx1 + 1, 13, 'g'); rect(hx1 + 1, 6, hx1 + 1, 15, 'd');
    disc(10.5, 10.5, 2.8, 'd'); cross(11, 11, 2, 'g');
  }
  // a dark outline around the whole figure, so it reads on any floor
  const out = g.map((r) => r.slice());
  for (let y = 0; y < H36; y++) for (let x = 0; x < W24; x++) {
    if (g[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== 'g' && g[y + dy][x + dx] !== 'G')) out[y][x] = 'o';
  }
  return out.map((r) => r.map((ch) => CS_PAL[ch] || ''));
}
export const CHURCH_SEARCHER_SHEET = {
  down: [0, 1, 2].map((st) => csDraw('down', st)),
  up: [0, 1, 2].map((st) => csDraw('up', st)),
  right: [0, 1, 2].map((st) => csDraw('right', st)),
};
