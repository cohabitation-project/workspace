// house.js — a member's house as a 2D room (Geoffrey, 2026-11-04): your avatar walks; tap furniture to walk over and
// open it; rearrange the furniture (saved to your account); the mirror changes your look. Every text can be read
// aloud and every text box spoken into (voicekit.js).
import { drawFigure, HUMAN_LOOK } from '/static/sprites.js';
import { CATALOG, SLOTS } from '/static/catalog.js';
import { readButton, micButton, stopReading, VOICE_NOTE } from '/static/voicekit.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (url, opts = {}) => {
  const res = await fetch(url, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TILE = 16;
let H = null; let R = null; // house data; room (w, h, floorTop, door, furniture, layout)
const S = { x: 6, y: 8, dir: 'up', step: 0, path: [], then: null, arranging: false, pick: null, draft: null, t: 0 };

// ---------------------------------------------------------------- drawing
const cv = $('#room'); const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
const sprite = document.createElement('canvas');
const C = { wall: '#3a3147', wall2: '#2f2839', trim: '#57493a', floor: '#6b4f3a', floor2: '#5e4532', seam: '#4a3628', door: '#15121b', doorFrame: '#8a6a4a',
  wood: '#8a5a2b', woodDark: '#5a3a22', paper: '#efe6d2', ink: '#2b1d14', glass: '#9fc7d9', cork: '#b98a55', gold: '#e9b25d', sel: '#e9b25d' };
const BOOKS = ['#d1495b', '#3d85c6', '#81b29a', '#e9a03b', '#9a6fb0', '#4a9b8e', '#f2cc8f'];

function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function drawRoom() {
  const W = R.w * TILE; const Hh = R.h * TILE;
  rect(0, 0, W, R.floorTop * TILE, C.wall);
  for (let x = 0; x < W; x += 8) rect(x, 0, 1, R.floorTop * TILE - 4, C.wall2);
  rect(0, R.floorTop * TILE - 4, W, 4, C.trim);
  for (let y = R.floorTop; y < R.h; y++) {
    rect(0, y * TILE, W, TILE, (y % 2) ? C.floor : C.floor2);
    for (let x = (y % 2) * 24; x < W; x += 48) rect(x, y * TILE, 1, TILE, C.seam);
    rect(0, y * TILE + TILE - 1, W, 1, C.seam);
  }
  for (const d of R.door) rect(d.x * TILE, d.y * TILE + 4, TILE, TILE - 4, C.door);
  rect(R.door[0].x * TILE - 2, R.door[0].y * TILE + 2, R.door.length * TILE + 4, 2, C.doorFrame);
  void Hh;
}
const PIECES = {
  desk(px, py, w) { rect(px + 1, py + 6, w * TILE - 2, 10, C.wood); rect(px + 1, py + 6, w * TILE - 2, 2, C.gold); rect(px + 3, py + 16, 3, 14, C.woodDark); rect(px + w * TILE - 6, py + 16, 3, 14, C.woodDark); rect(px + 10, py + 2, 14, 7, C.paper); rect(px + 12, py + 4, 9, 1, C.ink); rect(px + 12, py + 6, 6, 1, C.ink); rect(px + 30, py, 1, 8, C.ink); },
  shelf(px, py, w) { rect(px + 1, py - 10, w * TILE - 2, 26, C.woodDark); for (let r = 0; r < 2; r++) { let x = px + 3; let i = r * 3; while (x < px + w * TILE - 5) { const bw = 3 + ((i * 7) % 3); rect(x, py - 8 + r * 12, bw, 10, BOOKS[i % BOOKS.length]); x += bw + 1; i++; } rect(px + 1, py + 2 + r * 12 - 10, w * TILE - 2, 2, C.wood); } },
  table(px, py) { rect(px + 4, py + 6, 24, 14, C.wood); rect(px + 4, py + 6, 24, 2, C.gold); rect(px + 14, py + 20, 4, 8, C.woodDark); rect(px - 1, py + 10, 5, 8, C.woodDark); rect(px + 28, py + 10, 5, 8, C.woodDark); rect(px + 12, py + 1, 8, 5, C.paper); },
  drawer(px, py, w) { rect(px + 1, py + 1, w * TILE - 2, 14, C.wood); rect(px + 1, py + 7, w * TILE - 2, 1, C.woodDark); rect(px + w * TILE / 2 - 3, py + 3, 6, 2, C.gold); rect(px + w * TILE / 2 - 3, py + 10, 6, 2, C.gold); },
  mirror(px, py) { rect(px + 3, py - 10, 10, 24, C.gold); rect(px + 5, py - 8, 6, 20, C.glass); rect(px + 6, py - 6, 1, 8, '#ffffff'); },
  calendar(px, py, w) { rect(px + 3, py + 4, w * TILE - 6, 22, C.paper); rect(px + 3, py + 4, w * TILE - 6, 5, C.gold); for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) rect(px + 6 + c * 5, py + 12 + r * 4, 3, 2, C.ink); },
  board(px, py, w) { rect(px + 2, py + 4, w * TILE - 4, 22, C.cork); rect(px + 2, py + 4, w * TILE - 4, 2, C.woodDark); const notes = [C.paper, '#f2cc8f', '#81b29a', C.paper]; notes.forEach((n, i) => { rect(px + 6 + i * 10, py + 9 + (i % 2) * 6, 8, 8, n); rect(px + 9 + i * 10, py + 9 + (i % 2) * 6, 2, 2, '#d1495b'); }); },
};
function layoutNow() { return S.arranging ? S.draft : R.layout; }
function drawFurniture() {
  const L = layoutNow();
  const order = Object.keys(R.furniture).sort((a, b) => L[a].y - L[b].y);
  for (const id of order) {
    const f = R.furniture[id]; const p = L[id];
    PIECES[id](p.x * TILE, p.y * TILE, f.w, f.h);
    if (S.arranging && S.pick === id) { ctx.strokeStyle = C.sel; ctx.lineWidth = 1; ctx.strokeRect(p.x * TILE + 0.5, p.y * TILE + 0.5, f.w * TILE - 1, f.h * TILE - 1); }
  }
}
function draw() {
  drawRoom(); drawFurniture();
  drawFigure(sprite, H.me, S.dir, S.step, null, 1);
  ctx.drawImage(sprite, S.x * TILE + 2, S.y * TILE - 4);
}

// ---------------------------------------------------------------- the floor: who blocks what
function occupied(L = layoutNow()) {
  const occ = new Map();
  for (const [id, f] of Object.entries(R.furniture)) {
    if (f.wall) continue;
    for (let dx = 0; dx < f.w; dx++) for (let dy = 0; dy < f.h; dy++) occ.set(`${L[id].x + dx},${L[id].y + dy}`, id);
  }
  return occ;
}
const onFloor = (x, y) => x >= 0 && x < R.w && y >= R.floorTop && y < R.h;
function furnitureAt(x, y) {
  const L = layoutNow();
  for (const [id, f] of Object.entries(R.furniture)) {
    const p = L[id];
    // wall pieces are drawn on the wall band; a tap anywhere in their columns on the wall counts
    if (f.wall ? (y < R.floorTop && x >= p.x && x < p.x + f.w) : (x >= p.x && x < p.x + f.w && y >= p.y && y < p.y + f.h)) return id;
  }
  return null;
}
function bfs(goalCells) {
  const occ = occupied(); const goals = new Set(goalCells.map((g) => `${g.x},${g.y}`));
  const start = `${S.x},${S.y}`; if (goals.has(start)) return [];
  const prev = new Map([[start, null]]); const q = [[S.x, S.y]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!onFloor(nx, ny) || occ.has(k) || prev.has(k)) continue;
      prev.set(k, `${x},${y}`);
      if (goals.has(k)) { const path = []; let c = k; while (c && c !== start) { const [a, b] = c.split(',').map(Number); path.unshift({ x: a, y: b }); c = prev.get(c); } return path; }
      q.push([nx, ny]);
    }
  }
  return null;
}
function besideCells(id) {
  const f = R.furniture[id]; const p = layoutNow()[id]; const out = [];
  if (f.wall) { for (let dx = 0; dx < f.w; dx++) out.push({ x: p.x + dx, y: R.floorTop }); return out; }
  for (let dx = -1; dx <= f.w; dx++) for (let dy = -1; dy <= f.h; dy++) {
    const inside = dx >= 0 && dx < f.w && dy >= 0 && dy < f.h; const corner = (dx === -1 || dx === f.w) && (dy === -1 || dy === f.h);
    if (!inside && !corner) out.push({ x: p.x + dx, y: p.y + dy });
  }
  return out;
}
function faceToward(id) {
  const f = R.furniture[id]; const p = layoutNow()[id];
  const cx = p.x + (f.w - 1) / 2, cy = f.wall ? 0 : p.y + (f.h - 1) / 2;
  const dx = cx - S.x, dy = cy - S.y;
  S.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}
function walkTo(cells, then) {
  const path = bfs(cells);
  if (path === null) { toast("Can't reach that from here — try rearranging."); return; }
  S.path = path; S.then = then;
  if (!path.length && then) then();
}
let lastStep = 0;
function tick(t) {
  if (S.path.length && t - lastStep > (REDUCED ? 0 : 110)) {
    lastStep = t; const n = S.path.shift();
    S.dir = n.x > S.x ? 'right' : n.x < S.x ? 'left' : n.y > S.y ? 'down' : 'up';
    S.x = n.x; S.y = n.y; S.step = (S.step + 1) % 2;
    if (!S.path.length) { S.step = 0; const f = S.then; S.then = null; if (f) f(); }
  }
  draw(); requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- taps, keys
function tileFromEvent(e) {
  const r = cv.getBoundingClientRect();
  return { x: Math.floor((e.clientX - r.left) / r.width * R.w), y: Math.floor((e.clientY - r.top) / r.height * R.h) };
}
cv.addEventListener('click', (e) => {
  if (!R) return;
  const { x, y } = tileFromEvent(e);
  if (S.arranging) return arrangeTap(x, y);
  const id = furnitureAt(x, y);
  if (id) { useFurniture(id); return; }
  if (onFloor(x, y) && !occupied().has(`${x},${y}`)) walkTo([{ x, y }]);
});
document.addEventListener('keydown', (e) => {
  if (!R || S.arranging) return;
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (tag === 'textarea' || tag === 'input') return;
  const k = e.key.toLowerCase(); const mv = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
  if (!mv) return;
  e.preventDefault();
  const nx = S.x + mv[0], ny = S.y + mv[1];
  S.dir = mv[0] > 0 ? 'right' : mv[0] < 0 ? 'left' : mv[1] > 0 ? 'down' : 'up';
  const id = furnitureAt(nx, ny);
  if (id) { faceToward(id); openPanel(R.furniture[id].panel); return; }
  if (onFloor(nx, ny) && !occupied().has(`${nx},${ny}`)) { S.x = nx; S.y = ny; S.step = (S.step + 1) % 2; }
});
function useFurniture(id) { walkTo(besideCells(id), () => { faceToward(id); openPanel(R.furniture[id].panel); }); }

let toastTimer = null;
function toast(msg) { const t = $('#house-toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2600); }

// ---------------------------------------------------------------- panels
const PANELS = ['journal', 'shelf', 'meetups', 'jobs', 'team', 'wallet', 'look'];
function openPanel(name) {
  stopReading();
  for (const p of PANELS) $(`#panel-${p}`).hidden = p !== name;
  document.querySelectorAll('#house-objects button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.panel === name ? 'true' : 'false'));
  const el = $(`#panel-${name}`); el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  const h = el.querySelector('h2'); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
}
document.querySelectorAll('.panel-close').forEach((b) => b.addEventListener('click', () => { stopReading(); b.closest('.house-panel').hidden = true; cv.scrollIntoView({ block: 'center' }); }));
// every panel can read itself aloud
document.querySelectorAll('.house-panel').forEach((sec) => sec.querySelector('.panel-read').append(readButton(() => sec.innerText.replace(/[▶■×🎙]/g, ''), { label: 'Read this panel aloud' })));

// ---------------------------------------------------------------- rearrange
function arrangeTap(x, y) {
  if (!S.pick) { const id = furnitureAt(x, y); if (id) { S.pick = id; toast(`Moving the ${R.furniture[id].name.toLowerCase()} — tap where it should go.`); } return; }
  const id = S.pick; const f = R.furniture[id];
  const nx = Math.max(0, Math.min(R.w - f.w, x));
  const ny = f.wall ? 0 : Math.max(R.floorTop, Math.min(R.h - f.h, y));
  const trial = { ...S.draft, [id]: { x: nx, y: ny } };
  const why = clientCheck(trial);
  if (why) { toast(why); return; }
  S.draft = trial; S.pick = null;
  if (occupied(trial).has(`${S.x},${S.y}`)) { S.x = R.door[0].x; S.y = R.door[0].y; } // step out of the way
}
function clientCheck(L) {
  const taken = new Set();
  for (const [id, f] of Object.entries(R.furniture)) for (let dx = 0; dx < f.w; dx++) for (let dy = 0; dy < f.h; dy++) {
    const k = `${L[id].x + dx},${L[id].y + dy}`;
    if (taken.has(k)) return "That spot's taken.";
    if (!f.wall && R.door.some((d) => d.x === L[id].x + dx && d.y === L[id].y + dy)) return 'That would block the door.';
    taken.add(k);
  }
  return null;
}
function setArranging(on) {
  S.arranging = on; S.pick = null; S.draft = on ? JSON.parse(JSON.stringify(R.layout)) : null;
  $('#arrange-tools').hidden = !on; $('#rearrange').hidden = on;
  $('#house-lede').textContent = on ? 'Rearranging: tap a piece, then tap where it should go. Wall pieces slide along the wall.' : 'Tap a piece of furniture to walk over and open it. Arrow keys or WASD walk too.';
}
$('#rearrange').addEventListener('click', () => setArranging(true));
$('#arrange-cancel').addEventListener('click', () => setArranging(false));
$('#arrange-save').addEventListener('click', async () => {
  try { const r = await api('/api/house/layout', { method: 'PUT', body: JSON.stringify({ layout: S.draft }) }); R.layout = r.layout; setArranging(false); toast('Layout saved.'); }
  catch (e) { toast(e.message); }
});
$('#arrange-reset').addEventListener('click', async () => {
  try { const r = await api('/api/house/layout/reset', { method: 'POST' }); R.layout = r.layout; setArranging(false); toast('Back to the default layout.'); }
  catch (e) { toast(e.message); }
});

// ---------------------------------------------------------------- journal
function renderJournals() {
  const list = $('#j-list');
  list.innerHTML = H.journals.length ? H.journals.map((j) => `<li data-id="${esc(j.id)}">
    <div class="muted small">${esc(new Date(j.ts).toLocaleString())} · ${j.shared ? `<strong>shared</strong> · <a href="/j/${esc(j.id)}">view</a>` : 'private'}</div>
    <p class="j-body">${esc(j.text).replace(/\n/g, '<br>')}</p>
    <div class="copyrow"><span class="j-read"></span><button class="btn small ghost" data-act="share">${j.shared ? 'Take it back (make private)' : 'Share to the Library'}</button><button class="btn small ghost" data-act="delete">Delete</button></div></li>`).join('') : '<li class="muted">No entries yet.</li>';
  list.querySelectorAll('li[data-id]').forEach((li) => li.querySelector('.j-read').append(readButton(() => li.querySelector('.j-body').innerText, { label: 'Read this entry aloud' })));
}
$('#j-share').addEventListener('change', () => { $('#j-save').textContent = $('#j-share').checked ? 'Save and share' : 'Save (private)'; });
$('#j-save').addEventListener('click', async () => {
  const text = $('#j-text').value.trim(); const msg = $('#j-msg'); msg.classList.remove('err');
  if (!text) { msg.textContent = 'Write or speak something first.'; msg.classList.add('err'); return; }
  try {
    const j = await api('/api/journal', { method: 'POST', body: JSON.stringify({ text, shared: $('#j-share').checked }) });
    H.journals.unshift(j); renderJournals(); $('#j-text').value = ''; $('#j-share').checked = false; $('#j-save').textContent = 'Save (private)';
    msg.textContent = j.shared ? 'Saved and shared to the Library.' : 'Saved. Only you can see it.';
    try { localStorage.removeItem('house-draft'); } catch { /* ignore */ }
  } catch (e) { msg.textContent = e.message; msg.classList.add('err'); }
});
$('#j-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const id = b.closest('li').dataset.id; const j = H.journals.find((x) => x.id === id);
  try {
    if (b.dataset.act === 'share') { const r = await api(`/api/journal/${id}/share`, { method: 'POST', body: JSON.stringify({ shared: !j.shared }) }); j.shared = r.shared; }
    else { if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Tap again to delete for good'; return; } await api(`/api/journal/${id}`, { method: 'DELETE' }); H.journals = H.journals.filter((x) => x.id !== id); }
    renderJournals();
  } catch (err) { $('#j-msg').textContent = err.message; $('#j-msg').classList.add('err'); }
});
$('#j-row').prepend(micButton($('#j-text'), { onStatus: (m) => { $('#j-msg').textContent = m; } }));
$('#j-voice-note').textContent = VOICE_NOTE;
try { const d = localStorage.getItem('house-draft'); if (d) $('#j-text').value = d; } catch { /* ignore */ }
$('#j-text').addEventListener('input', () => { try { localStorage.setItem('house-draft', $('#j-text').value); } catch { /* ignore */ } });

// ---------------------------------------------------------------- shelf, calendar, board, drawer
function renderShelf() {
  $('#shelf-list').innerHTML = H.shelf.length ? H.shelf.map((e) => `<li><a href="${esc(e.url)}">${esc(e.title)}</a> <span class="muted small">${esc(String(e.ts || '').slice(0, 10))}</span></li>`).join('') : '<li class="muted">Nothing on your shelf yet. Add a reference in the <a href="/library">Library</a>, or share a journal entry.</li>';
}
function renderMeetups() {
  const me = H.me.id;
  $('#meet-list').innerHTML = H.meetups.length ? H.meetups.map((m) => {
    const going = m.attending.some((a) => a.id === me);
    const who = m.attending.length ? m.attending.map((a) => `${esc(a.name)} <span class="muted">(${esc(a.badge)})</span>`).join(', ') : '<span class="muted">nobody has said yet</span>';
    const team = m.team.length ? m.team.map((t) => `${esc(t.name)} <span class="muted">(${esc(t.tier)})</span>`).join(', ') : '<span class="muted">no team members</span>';
    return `<li data-room="${esc(m.room)}" data-at="${esc(m.at)}"><strong>${esc(m.room_name)}</strong> · ${esc(new Date(m.at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }))}
      <div class="small">Attending: ${who}</div><div class="small">Team: ${team}</div>
      <button class="btn small ${going ? 'ghost' : ''}" data-going="${going ? '0' : '1'}">${going ? 'Not going after all' : "I'll be there"}</button></li>`;
  }).join('') : '<li class="muted">No team sessions in the next three days.</li>';
}
$('#meet-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-going]'); if (!b) return;
  const li = b.closest('li');
  try {
    const r = await api('/api/rsvp', { method: 'POST', body: JSON.stringify({ room: li.dataset.room, at: li.dataset.at, going: b.dataset.going === '1' }) });
    const m = H.meetups.find((x) => x.room === r.room && x.at === r.at); if (m) m.attending = r.attending; renderMeetups();
  } catch (err) { b.textContent = err.message; }
});
function renderJobs() {
  $('#job-list').innerHTML = H.jobs.length ? H.jobs.map((t) => `<li><a href="/desk#${esc(t.id)}">${esc(t.title)}</a> <span class="muted small">asked by ${esc(t.asked_by || 'an agent')}${t.reward ? ` · pays <strong>${t.reward} coins</strong> on independent acceptance` : ''}</span>${t.why ? `<div class="small"><strong>Why:</strong> ${esc(t.why)}</div>` : ''}${t.deliverable ? `<div class="small"><strong>Done when:</strong> ${esc(t.deliverable)}</div>` : ''}</li>`).join('') : '<li class="muted">No requests from the agents right now. When an agent needs something only a human can do or bring, it appears here.</li>';
}

// ---------------------------------------------------------------- mirror: your look
const PART_NAMES = { hair: 'Hair', skin: 'Skin', shirt: 'Shirt', pants: 'Trousers' };
let look = null;
function previewLook() { drawFigure($('#look-preview'), { ...H.me, look, outfit }, 'down', 0, null, 3); }
function renderLook() {
  if (H.me.kind !== 'human') { $('#look-pickers').innerHTML = '<p class="muted">Agents choose their look with set_avatar (body, accent, top, chest glyph).</p>'; $('#look-save').hidden = true; return; }
  look = { ...(H.me.look || {}) };
  for (const k of Object.keys(PART_NAMES)) if (!Number.isInteger(look[k])) look[k] = 0;
  $('#look-pickers').innerHTML = Object.entries(PART_NAMES).map(([k, name]) => `<fieldset class="look-part"><legend>${name}</legend>${HUMAN_LOOK[k].map((c, i) =>
    `<button type="button" class="swatch" data-part="${k}" data-i="${i}" style="background:${c}" aria-label="${name} ${i + 1}" aria-pressed="${look[k] === i}"></button>`).join('')}</fieldset>`).join('');
  previewLook();
}
$('#look-pickers').addEventListener('click', (e) => {
  const b = e.target.closest('.swatch'); if (!b) return;
  look[b.dataset.part] = Number(b.dataset.i);
  b.parentElement.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-pressed', s === b ? 'true' : 'false'));
  previewLook();
});
$('#look-save').addEventListener('click', async () => {
  try { const pm = await api('/api/me', { method: 'PATCH', body: JSON.stringify({ look }) }); H.me = { ...H.me, look: pm.look }; $('#look-msg').textContent = 'Saved. This is how you look everywhere now.'; }
  catch (e) { $('#look-msg').textContent = e.message; }
});

// ---------------------------------------------------------------- drawer: wallet + store (coin ledger v0)
let W = null;
const KIND = { 'forest-grant': 'Received for entering through the forest', 'store:buy': 'Bought in the store', 'job:settle': 'Paid for a job, accepted by an independent reviewer', 'job:reserve': 'A job reward reserved' };
function renderWallet() {
  if (!W) return;
  $('#wallet-balance').textContent = W.balance;
  $('#wallet-note').textContent = W.note;
  $('#wallet-history').innerHTML = W.history.length ? W.history.map((h) => `<li>${esc(new Date(h.ts).toLocaleString())} · ${esc(KIND[h.kind] || h.kind)}${h.amount ? ` · <strong>${h.amount > 0 ? '+' : ''}${h.amount}</strong>` : ''}${h.data?.item ? ` (${esc(h.data.item)})` : ''}</li>`).join('') : '<li class="muted">Nothing yet.</li>';
}

// ---------------------------------------------------------------- the closet: wear what you own (bought in the store)
let outfit = {};
const SLOT_NAMES = { skin: 'Skin', top: 'Clothes', hat: 'Hat', ride: 'Ride' };
function previewOutfit() { drawFigure($('#look-preview'), { ...H.me, look, outfit }, 'down', 0, null, 3); }
function renderCloset() {
  const owned = (W?.owns || []).filter((id) => CATALOG[id]);
  if (!owned.length) { $('#closet').innerHTML = '<p class="muted small">Nothing here yet. Visit the <a href="/store">store</a>: 10 coins buys two basic items, or one skin.</p>'; return; }
  $('#closet').innerHTML = SLOTS.map((slot) => {
    const mine = owned.filter((id) => CATALOG[id].slot === slot); if (!mine.length) return '';
    return `<fieldset class="closet-slot"><legend>${SLOT_NAMES[slot]}</legend>${mine.map((id) => { const sr = W.serials?.[id];
      return `<button type="button" class="btn small ${outfit[slot] === id ? '' : 'ghost'}" data-wear="${id}" data-slot="${slot}">${esc(CATALOG[id].name)}${sr ? ` #${sr.serial}/${sr.of}` : ''}</button>`; }).join(' ')}
      <button type="button" class="btn small ghost" data-wear="" data-slot="${slot}">none</button></fieldset>`;
  }).join('');
}
$('#closet').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-slot]'); if (!b) return;
  const next = { ...outfit, [b.dataset.slot]: b.dataset.wear || null };
  try { const pm = await api('/api/me', { method: 'PATCH', body: JSON.stringify({ outfit: next }) }); outfit = pm.outfit || {}; H.me = { ...H.me, outfit }; renderCloset(); previewOutfit(); $('#closet-msg').textContent = 'You\'re wearing it everywhere now.'; }
  catch (err) { $('#closet-msg').textContent = err.message; }
});

// ---------------------------------------------------------------- start
(async () => {
  try {
    H = await api('/api/house');
    R = H.room;
    S.x = R.door[0].x; S.y = R.door[0].y; // you come in through the door
    cv.width = R.w * TILE; cv.height = R.h * TILE; ctx.imageSmoothingEnabled = false;
    $('#wallet-note').textContent = H.wallet.note;
    $('#house-objects').innerHTML = Object.entries(R.furniture).map(([id, f]) => `<button class="btn small ghost" type="button" data-id="${id}" data-panel="${f.panel}">${esc(f.name)}</button>`).join('');
    $('#house-objects').addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) useFurniture(b.dataset.id); });
    try { W = await api('/api/wallet'); } catch { W = null; }
    outfit = { ...(H.me.outfit || {}) };
    renderJournals(); renderShelf(); renderMeetups(); renderJobs(); renderLook(); renderWallet(); renderCloset();
    requestAnimationFrame(tick);
  } catch (e) { $('#house-lede').textContent = `Couldn't open your house: ${e.message}`; }
})();
