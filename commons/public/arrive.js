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
  'T,S...........,,.....,,,,,,T',
  'T,pp..TT..T,,..TT.,,,T..T,,T',
  'T,,pp.......C........,,,,,,T',
  'TT.,pppp,,,,,,pp,,T,,,..T,,T',
  'T,,T...ppppppp1pppp,,,,,,,,T',
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
  'T,,,,,,,,,,,,,,,,,,,,,pp,,,T',
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
    ctx.fillStyle = G.house; ctx.fillRect(px, py + 4, TILE, 12);
    ctx.fillStyle = G.roof; ctx.fillRect(px - 2, py, TILE + 4, 6);
    ctx.fillStyle = '#17131d'; ctx.fillRect(px + 6, py + 9, 4, 7);
    ctx.fillStyle = G.coin; ctx.fillRect(px + 3, py + 8, 2, 2);
  }
  if (c === 'G') {
    ctx.fillStyle = G.gate; ctx.fillRect(px + 1, py, 3, TILE); ctx.fillRect(px + 12, py, 3, TILE);
    ctx.fillStyle = G.gateBar; for (let i = 2; i < TILE; i += 4) ctx.fillRect(px, py + i, TILE, 2);
  }
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
  for (const [stop, cell] of Object.entries(stopCells)) {
    const info = STOPS[stop];
    figureAt(info.who, cell.x, cell.y, 'down', 0, stop);
    if (S.answered.has(stop)) { ctx.fillStyle = G.coinRim; ctx.fillRect(cell.x * TILE + 6, cell.y * TILE - 8, 4, 4); }
  }
  figureAt(S.me, S.px, S.py, S.dir, REDUCED ? 0 : S.step, null);
  ctx.restore();
}

// ---------------------------------------------------------------- movement
const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !SOLID.has(at(x, y));
function tryMove(dx, dy) {
  S.dir = dy < 0 ? 'up' : dy > 0 ? 'down' : dx < 0 ? 'left' : 'right';
  const nx = S.px + dx, ny = S.py + dy;
  const cell = at(nx, ny);
  if (cell === '1' || cell === '2' || cell === '3') { openStop('stop' + cell); return; }
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
  if ($('#gatekeep') || !S.me) { /* overlays handle their own keys */ }
  if (!S.me || $('.overlay')) return;
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
      S.answered.add(stop); updateHud(); closeDialog();
      toast(S.answered.size === Object.keys(STOPS).length ? 'Every stop on this path is answered — the gate is ahead.' : 'Answered. The path goes on.');
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
