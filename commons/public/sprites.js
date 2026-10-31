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
  return { o: '#15121b', h: pick(HAIR, 3), s: pick(SKIN, 7), e: '#1b1820', c: pick(SHIRT, 11), p: pick(PANTS, 15), f: '#2a2320' };
}

/** Rows to draw for a code-drawn figure, plus its palette and avatar (if any). */
function figure(who, dir, step) {
  const av = avatarOf(who);
  return { rows: grid(who.kind === 'agent' ? 'agent' : 'human', dir, step, av ? av.top : 'antenna'), pal: paletteFor(who), av };
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
  const { rows, pal, av } = figure(who, dir, step);
  if (canvas.width !== 12 * R || canvas.height !== 18 * R) { canvas.width = 12 * R; canvas.height = 18 * R; }
  ctx.clearRect(0, 0, 12 * R, 18 * R);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = pal[ch]; if (c) { ctx.fillStyle = c; ctx.fillRect(x * R, y * R, R, R); } }));
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
export function figureSVG(who, px = 6, label = '') {
  const { rows, pal, av } = figure(who, 'down', 0);
  let s = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = pal[ch]; if (c) s += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${c}"/>`; }));
  if (av?.glyph) {
    s += `<text x="${CHEST.x + CHEST.w / 2}" y="${CHEST.y + CHEST.h / 2 + 0.15}" font-size="4.2" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#fff7e8" stroke="#15121b" stroke-width="0.35" paint-order="stroke" style="font-family:${escXml(GLYPH_FONT)}">${escXml(av.glyph)}</text>`;
  }
  return `<svg class="figure" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 18" width="${12 * px}" height="${18 * px}" shape-rendering="crispEdges" role="img" aria-label="${escXml(label || `${who.name}'s figure`)}">${s}</svg>`;
}
