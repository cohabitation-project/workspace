/**
 * sprites.js — small pixel figures for Headquarters, drawn in code (12×18 px, scaled with CSS).
 * Humans have hair and a face; AI agents have a metal head with a lit visor, coloured by kind.
 * If the server has the pixel-agents (MIT) sprite sheet from the old Ashram, kin use those instead.
 *
 * Frames: dir ∈ down | up | right | left, step ∈ 0 (standing) | 1 | 2 (walking).
 */

const mirror = (half) => half + [...half].reverse().join('');

const HUMAN_HEAD_DOWN = ['....oo', '...ohh', '..ohhh', '..ohss', '..oses', '..osss', '...oss', '....os'].map(mirror);
const HUMAN_HEAD_UP = ['....oo', '...ohh', '..ohhh', '..ohhh', '..ohhh', '..ohhh', '...ohh', '....os'].map(mirror);
const AGENT_HEAD_DOWN = ['.....a', '.....o', '..oooo', '..ommm', '..ovvv', '..ovev', '..ommm', '...oom'].map(mirror);
const AGENT_HEAD_UP = ['.....a', '.....o', '..oooo', '..ommm', '..ommm', '..ommm', '..ommm', '...oom'].map(mirror);
const BODY_DOWN = ['..oocc', '.occcc', '.osccc', '.osccc', '..occc', '..oppp'].map(mirror);
const LEGS_DOWN = [
  ['..oppo', '..oppo', '..offo', '...oo.'].map(mirror),
  ['..oppooppo..', '..oppo.offo.', '..offo..oo..', '...oo.......'],
  ['..oppooppo..', '.offo.oppo..', '..oo..offo..', '.......oo...'],
];

const HUMAN_HEAD_SIDE = ['....oooo....', '...ohhhhoo..', '..ohhhhhhho.', '..ohhhssssо.', '..ohhssseso.', '..ohsssssso.', '...ossssso..', '.....osso...'].map((r) => r.replace('о', 'o'));
const AGENT_HEAD_SIDE = ['......a.....', '......o.....', '..oooooooo..', '..ommmmmmmo.', '..ommmvvvvo.', '..ommmvvevo.', '..ommmmmmmo.', '....oommo...'];
const BODY_SIDE = ['....occcco..', '...occcccco.', '...occsccco.', '...occsccco.', '...occcccco.', '...opppppo..'];
const LEGS_SIDE = [
  ['...oppoppo..', '...oppoppo..', '...offoffo..', '....oo.oo...'],
  ['..oppo.oppo.', '.oppo...oppo', '.offo...offo', '..oo.....oo.'],
  ['...oppoppo..', '....oppo....', '....offo....', '.....oo.....'],
];

function grid(kind, dir, step) {
  const agent = kind === 'agent';
  if (dir === 'down' || dir === 'up') {
    const head = agent ? (dir === 'up' ? AGENT_HEAD_UP : AGENT_HEAD_DOWN) : (dir === 'up' ? HUMAN_HEAD_UP : HUMAN_HEAD_DOWN);
    return [...head, ...BODY_DOWN, ...LEGS_DOWN[step]];
  }
  const rows = [...(agent ? AGENT_HEAD_SIDE : HUMAN_HEAD_SIDE), ...BODY_SIDE, ...LEGS_SIDE[step]];
  return dir === 'left' ? rows.map((r) => [...r].reverse().join('')) : rows;
}

function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const HAIR = ['#2b1d14', '#5a3a22', '#8a5a2b', '#c9a15b', '#1c1c24', '#7a2e1f', '#d8d0c0', '#3b2a4a'];
const SKIN = ['#f1c7a0', '#d9a37a', '#b07850', '#8a5636', '#5e3a24', '#f3d3b8'];
const SHIRT = ['#e07a5f', '#3d85c6', '#81b29a', '#f2cc8f', '#9a6fb0', '#d1495b', '#4a9b8e', '#e9a03b'];
const PANTS = ['#2f3e46', '#3c2f2f', '#283044', '#4a4e69', '#33402f'];
const METAL = ['#8d99ae', '#a3a8b8', '#6c7a89', '#b8b0a2', '#7d8597'];
const PLATE = ['#4a5568', '#5b6474', '#3f4a5c', '#625a6e', '#4d5d53'];

export const KIN_COLORS = { Claude: '#e3a55b', GPT: '#74c7a9', Gemini: '#6aa0ff', DeepSeek: '#8b8cff', Grok: '#e5534b' };
export const KIND_COLORS = { kin: '#e3b05b', hosted: '#c79bf2', guest: '#8fd3ff', human: '#f08a6b', guide: '#7cd6b4' };

export function paletteFor(who) {
  const h = hash(who.id || who.name);
  const pick = (arr, k) => arr[(h >>> k) % arr.length];
  if (who.kind === 'agent') {
    const visor = who.guide ? KIND_COLORS.guide : who.kin ? (KIN_COLORS[who.name] || KIND_COLORS.kin) : who.hosted ? KIND_COLORS.hosted : KIND_COLORS.guest;
    return { o: '#15121b', a: visor, m: pick(METAL, 3), v: visor, e: '#ffffff', c: pick(PLATE, 7), s: pick(METAL, 11), p: pick(PANTS, 13), f: '#1b1820' };
  }
  return { o: '#15121b', h: pick(HAIR, 3), s: pick(SKIN, 7), e: '#1b1820', c: pick(SHIRT, 11), p: pick(PANTS, 15), f: '#2a2320' };
}

/** Draw a figure into a canvas (1 canvas px = 1 sprite px; CSS scales it with image-rendering: pixelated). */
export function drawFigure(canvas, who, dir = 'down', step = 0, sheet = null) {
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
  const rows = grid(who.kind === 'agent' ? 'agent' : 'human', dir, step);
  const pal = paletteFor(who);
  if (canvas.width !== 12 || canvas.height !== 18) { canvas.width = 12; canvas.height = 18; }
  ctx.clearRect(0, 0, 12, 18);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = pal[ch]; if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } }));
}
