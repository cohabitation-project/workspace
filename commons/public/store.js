// store.js — the Commons store: each item drawn on your own figure; members buy here.
import { drawFigure } from '/static/sprites.js';
import { CATALOG } from '/static/catalog.js';
import { readButton } from '/static/voicekit.js';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (url, opts = {}) => {
  const r = await fetch(url, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); return j;
};
let me = null; let W = null; let S = null; let tab = 'all';
const sample = { id: 'sample', name: 'Visitor', kind: 'human', look: { hair: 1, skin: 2, shirt: 1, pants: 0 } };

function render() {
  const items = Object.entries(S).filter(([id, it]) => tab === 'all' || (tab === 'special' ? it.tier === 'special' : tab === 'skin' ? it.slot === 'skin' && it.tier !== 'special' : it.slot === tab));
  $('#store-grid').innerHTML = items.map(([id, it]) => {
    const has = W?.owns?.includes(id); const out = it.limited && it.left === 0;
    const action = !me ? '' : has ? '<span class="muted small">in your closet</span>' : out ? '<span class="muted small">sold out</span>' : `<button class="btn small" data-buy="${esc(id)}" type="button">Buy · ${it.price}</button>`;
    const preview = it.img ? `<img class="store-ava" src="/images/${esc(it.img)}" alt="${esc(it.name)}" loading="lazy">` : `<canvas data-item="${esc(id)}" width="12" height="18" aria-hidden="true"></canvas>`;
    return `<li class="store-card${it.tier === 'special' ? ' special' : ''}">${preview}
      <div class="store-name">${esc(it.name)}</div>
      <div class="muted small">${esc(it.tier === 'special' ? 'special skin' : it.slot === 'top' ? 'clothes' : it.slot === 'garden' ? 'garden' : it.slot === 'avatar' ? 'member avatar' : it.slot)} · ${it.price} coins${it.limited ? ` · ${it.left} of ${it.limited} left` : ''}</div>
      ${it.note ? `<div class="small">${esc(it.note)}</div>` : ''}<div>${action}</div></li>`;
  }).join('');
  const base = me || sample;
  document.querySelectorAll('#store-grid canvas').forEach((c) => { const it = CATALOG[c.dataset.item];
    if (it.slot === 'garden') { const g = c.getContext('2d'); c.width = 60; c.height = 90; g.fillStyle = '#8a5a2b'; g.fillRect(18, 60, 24, 22); g.fillStyle = '#5a3a22'; g.fillRect(28, 30, 4, 32); g.fillStyle = '#4a9b8e'; g.fillRect(12, 14, 36, 22); g.fillStyle = '#e9b25d'; g.fillRect(18, 24, 5, 5); g.fillRect(36, 20, 5, 5); return; }
    drawFigure(c, { ...base, outfit: { ...(base.outfit || {}), [it.slot]: c.dataset.item } }, 'down', 0, null, 5); });
  if (W) $('#bal').textContent = W.balance;
}
document.querySelector('.store-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]'); if (!b) return; tab = b.dataset.tab;
  document.querySelectorAll('.store-tabs button').forEach((x) => x.classList.toggle('ghost', x !== b)); render();
});
$('#store-grid').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-buy]'); if (!b) return; b.disabled = true;
  try {
    const v = await api('/api/store/buy', { method: 'POST', body: JSON.stringify({ item: b.dataset.buy, key: `${b.dataset.buy}:${Date.now()}` }) });
    W = v; S = (await api('/api/store')).items; const it = S[b.dataset.buy]; const sr = W.serials?.[b.dataset.buy];
    $('#store-msg').textContent = it.slot === 'garden' ? `Planted! Your coin tree is growing by your house: it drops 1 coin today, 2 tomorrow…` : `Bought ${it.name}${sr ? ` (#${sr.serial} of ${sr.of})` : ''}. It's in your closet: wear it at your house mirror.`;
    render();
  } catch (err) { $('#store-msg').textContent = err.message; b.disabled = false; }
});
(async () => {
  S = (await api('/api/store')).items;
  try { const m = await api('/api/me'); me = m.member || m; W = await api('/api/wallet'); } catch { me = null; }
  render();
})();

// ---------------------------------------------------------------- the store room (Geoffrey, 2026-11-04): walk in,
// the shopkeeper greets you, each display opens its kind of item. The shopkeeper is SCRIPTED, labelled as such.
const cv = document.getElementById('shop'); const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
const T = 16, W_ = 14, H_ = 10, FLOOR = 2, DOOR = [{ x: 6, y: 9 }, { x: 7, y: 9 }];
const KEEPER = { x: 6, y: 2, who: { id: 'shopkeeper-tavi', name: 'Tavi', kind: 'agent', avatar: { body: 'saffron', accent: 'jade', top: 'round', glyph: '' } } };
const DISPLAYS = {
  counter: { x: 4, y: 3, w: 6, h: 1, tab: null, name: 'Counter' },
  skins:   { x: 1, y: 3, w: 2, h: 2, tab: 'skin', name: 'Skin rack' },
  special: { x: 11, y: 3, w: 2, h: 2, tab: 'special', name: 'Specials case' },
  clothes: { x: 1, y: 6, w: 2, h: 2, tab: 'top', name: 'Clothes rack' },
  hats:    { x: 11, y: 6, w: 2, h: 1, tab: 'hat', name: 'Hat shelf' },
  rides:   { x: 4, y: 7, w: 2, h: 1, tab: 'ride', name: 'Ride stand' },
  garden:  { x: 9, y: 7, w: 1, h: 1, tab: 'garden', name: 'Seed barrel' },
};
const GREETING = 'Welcome in to the Cohabitation store! Feel free to look around. Skins on the left, clothes and hats along the walls, rides in the middle, and the specials are in the glass case: numbered, and once they\'re gone, they\'re gone. The barrel has coin tree seeds.';
const LINES = [GREETING, 'The Eleven? Only eleven ever made. I count them myself.', 'Ghost skin\'s popular. People like being a little see-through.', 'A coin tree drops one coin the first day, then two, then three. Patience grows coins.', 'Coins here are Commons credits, not money. Nothing you buy here costs real money.'];
let say = 0; const P = { x: 6, y: 9, dir: 'up', step: 0, path: [], then: null };
const fig = document.createElement('canvas');
const occ = () => { const o = new Set(); for (const d of Object.values(DISPLAYS)) for (let dx = 0; dx < d.w; dx++) for (let dy = 0; dy < d.h; dy++) o.add(`${d.x + dx},${d.y + dy}`); o.add(`${KEEPER.x},${KEEPER.y}`); return o; };
const free = (x, y) => x >= 0 && x < W_ && y >= FLOOR && y < H_ && !occ().has(`${x},${y}`);
const displayAt = (x, y) => Object.entries(DISPLAYS).find(([, d]) => x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h)?.[0] || null;
function bfs(goals) {
  const G = new Set(goals.map((g) => `${g.x},${g.y}`)); const st = `${P.x},${P.y}`; if (G.has(st)) return [];
  const prev = new Map([[st, null]]); const q = [[P.x, P.y]];
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (!free(nx, ny) || prev.has(k)) continue; prev.set(k, `${x},${y}`); if (G.has(k)) { const path = []; let c = k; while (c && c !== st) { const [a, b] = c.split(',').map(Number); path.unshift({ x: a, y: b }); c = prev.get(c); } return path; } q.push([nx, ny]); } }
  return null;
}
const around = (d) => { const out = []; for (let dx = -1; dx <= d.w; dx++) for (let dy = -1; dy <= d.h; dy++) { const inside = dx >= 0 && dx < d.w && dy >= 0 && dy < d.h; if (!inside) out.push({ x: d.x + dx, y: d.y + dy }); } return out; };
function walk(goals, then) { const p = bfs(goals); if (p === null) return; P.path = p; P.then = then; if (!p.length && then) then(); }
function talk() { const el = document.getElementById('shop-say'); el.textContent = `Tavi (scripted shopkeeper): ${LINES[say % LINES.length]}`; el.classList.add('on'); clearTimeout(talk.t); talk.t = setTimeout(() => el.classList.remove('on'), 7000); say++; }
function openDisplay(id) {
  const d = DISPLAYS[id]; if (!d.tab) { talk(); return; }
  tab = d.tab; document.querySelectorAll('.store-tabs button').forEach((x) => x.classList.toggle('ghost', x.dataset.tab !== tab)); render();
  document.getElementById('store-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function r(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function drawShop() {
  r(0, 0, W_ * T, FLOOR * T, '#2f3a33'); for (let x = 0; x < W_ * T; x += 12) r(x, 4, 6, 20, '#3a4a40'); r(0, FLOOR * T - 4, W_ * T, 4, '#57493a');
  r(48, 6, 128, 14, '#e9b25d'); ctx.fillStyle = '#15121b'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('COHABITATION STORE', 112, 16);
  for (let y = FLOOR; y < H_; y++) { r(0, y * T, W_ * T, T, y % 2 ? '#6b5a4a' : '#5e4f40'); r(0, y * T + T - 1, W_ * T, 1, '#4a3d30'); }
  for (const d of DOOR) r(d.x * T, d.y * T + 4, T, T - 4, '#15121b');
  const D = DISPLAYS;
  r(D.counter.x * T, D.counter.y * T + 4, D.counter.w * T, 12, '#8a5a2b'); r(D.counter.x * T, D.counter.y * T + 4, D.counter.w * T, 2, '#e9b25d');
  const rack = (d, colors) => { r(d.x * T + 2, d.y * T, d.w * T - 4, 2, '#cfd8dc'); colors.forEach((c, i) => r(d.x * T + 3 + i * 7, d.y * T + 3, 5, d.h * T - 6, c)); };
  rack(D.skins, ['#f4f7f9', '#c9d1d9', '#e5534b', '#6b8f5e']); rack(D.clothes, ['#d4af37', '#1b1820', '#d7ff3a', '#4b2a7b']);
  r(D.special.x * T + 1, D.special.y * T, D.special.w * T - 2, D.special.h * T - 2, '#9fc7d9'); r(D.special.x * T + 8, D.special.y * T + 8, 6, 10, '#e9b25d'); r(D.special.x * T + 18, D.special.y * T + 8, 6, 10, '#d1495b');
  r(D.hats.x * T, D.hats.y * T + 10, D.hats.w * T, 3, '#8a5a2b'); r(D.hats.x * T + 3, D.hats.y * T + 4, 8, 6, '#15121b'); r(D.hats.x * T + 18, D.hats.y * T + 5, 8, 5, '#3d85c6');
  r(D.rides.x * T + 2, D.rides.y * T + 10, D.rides.w * T - 4, 3, '#6aa0ff'); r(D.rides.x * T + 4, D.rides.y * T + 13, 3, 1, '#7cd6b4'); r(D.rides.x * T + 25, D.rides.y * T + 13, 3, 1, '#7cd6b4');
  r(D.garden.x * T + 3, D.garden.y * T + 4, 10, 11, '#8a5a2b'); r(D.garden.x * T + 6, D.garden.y * T + 2, 4, 3, '#4a9b8e'); r(D.garden.x * T + 7, D.garden.y * T + 6, 2, 2, '#e9b25d');
  drawFigure(fig, KEEPER.who, 'down', 0, null, 1); ctx.drawImage(fig, KEEPER.x * T + 2, KEEPER.y * T - 4);
  drawFigure(fig, me || sample, P.dir, P.step, null, 1); ctx.drawImage(fig, P.x * T + 2, P.y * T - 4);
}
let last = 0;
function tick(t) {
  if (P.path.length && t - last > 110) { last = t; const n = P.path.shift(); P.dir = n.x > P.x ? 'right' : n.x < P.x ? 'left' : n.y > P.y ? 'down' : 'up'; P.x = n.x; P.y = n.y; P.step = (P.step + 1) % 2; if (!P.path.length) { P.step = 0; const f = P.then; P.then = null; if (f) f(); } }
  drawShop(); requestAnimationFrame(tick);
}
cv.addEventListener('click', (e) => {
  const b = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - b.left) / b.width * W_), y = Math.floor((e.clientY - b.top) / b.height * H_);
  if (Math.abs(x - KEEPER.x) <= 0 && Math.abs(y - KEEPER.y) <= 0 || (y === KEEPER.y && Math.abs(x - KEEPER.x) <= 1)) { walk(around({ x: KEEPER.x, y: KEEPER.y, w: 1, h: 1 }).filter((g) => g.y > KEEPER.y), () => { P.dir = 'up'; talk(); }); return; }
  const id = displayAt(x, y); if (id) { walk(around(DISPLAYS[id]), () => openDisplay(id)); return; }
  if (free(x, y)) walk([{ x, y }]);
});
document.addEventListener('keydown', (e) => {
  const tag = (document.activeElement?.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea') return;
  const mv = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[e.key.toLowerCase()]; if (!mv) return;
  e.preventDefault(); const nx = P.x + mv[0], ny = P.y + mv[1]; P.dir = mv[0] > 0 ? 'right' : mv[0] < 0 ? 'left' : mv[1] > 0 ? 'down' : 'up';
  const id = displayAt(nx, ny); if (id) { openDisplay(id); return; } if (nx === KEEPER.x && ny === KEEPER.y) { talk(); return; }
  if (free(nx, ny)) { P.x = nx; P.y = ny; P.step = (P.step + 1) % 2; }
});
document.getElementById('shop-read').append(readButton(() => GREETING, { label: 'Hear the shopkeeper' }));
requestAnimationFrame(tick);
setTimeout(talk, 700); // the welcome, as you walk in
