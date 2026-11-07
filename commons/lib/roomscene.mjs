/**
 * roomscene.mjs — a room opened into a 2D top-down pixel scene, in the same visual language as Headquarters
 * (the box/rect furniture, wood floor, title placards). Geoffrey, 2026-11-07: "keep it designed like our rooms …
 * desks with the tools you can see on them … the lists live on the wall … a door you walk out of back to the hall."
 *
 * Arts & Creation is the first furnished room: four stations (Image, Video & Podcast, Recording, Writing), each with
 * a little icon by its name and props on its desk; three wall placards (jobs for humans, the wish list, the room's
 * agent jobs); the members present standing in the floor; a door back to the Hall. Click a station or a placard to
 * open its panel. Everything shown is real: presence, the room's wishes, and the room's Desk jobs.
 */
import { esc } from '../public/md.js';

const O = '#15121b';
const r = (x, y, w, h, f, e = '') => `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="${f}" ${e}/>`;
const box = (x, y, w, h, f, top) => r(x, y, w, h, O) + r(x + 2, y + 2, w - 4, h - 4, f) + (top ? r(x + 2, y + 2, w - 4, Math.min(6, h / 3), top) : '');
const plant = (x, y) => box(x, y + 16, 16, 14, '#8a5a34', '#a8703f') + box(x - 3, y, 22, 18, '#3f8f4f', '#57b066');

// little colourful icons, shown by each station name and in its panel header
const ICON = {
  image: '<rect x="3" y="5" width="18" height="14" rx="2" fill="#0e1130" stroke="#7aa2ff" stroke-width="2.5"/><circle cx="8" cy="10" r="2" fill="#ffd36b"/><path d="M5 17l5-5 3 3 3-2 4 4z" fill="#7aa2ff"/>',
  video: '<circle cx="9" cy="7" r="3" fill="none" stroke="#dc8aa8" stroke-width="2.5"/><circle cx="15" cy="7" r="3" fill="none" stroke="#dc8aa8" stroke-width="2.5"/><rect x="4" y="10" width="13" height="9" rx="2" fill="#dc8aa8"/><path d="M17 13l4-2v7l-4-2z" fill="#dc8aa8"/>',
  sound: '<rect x="9" y="3" width="6" height="11" rx="3" fill="#7ad0a8"/><path d="M6 12a6 6 0 0 0 12 0" fill="none" stroke="#7ad0a8" stroke-width="2.5"/><line x1="12" y1="18" x2="12" y2="21" stroke="#7ad0a8" stroke-width="2.5"/>',
  writing: '<rect x="6" y="4" width="10" height="5" rx="1" fill="#0e1130" stroke="#e8a33d" stroke-width="2"/><path d="M4 12h16l2 8H2z" fill="#e8a33d"/><rect x="8" y="14" width="8" height="2" fill="#0e1130"/>',
};
const iconSvg = (key, x, y, s = 20) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 24 24">${ICON[key] || ''}</svg>`;

// a station name placard with its icon
const stationLabel = (x, y, t, key, w) => `<g>${r(x, y, w, 30, '#17131d', 'rx="3" stroke="#0b090e" stroke-width="2"')}${iconSvg(key, x + 8, y + 5)}<text x="${x + 36}" y="${y + 21}" font-size="15" fill="#e9dfcd" font-family="ui-monospace,monospace" letter-spacing="1">${esc(t)}</text></g>`;

// a list placard on the wall
function placard(x, y, title, accent, hint) {
  let g = `<rect x="${x}" y="${y}" width="160" height="104" rx="4" fill="#20242c" stroke="#0b090e" stroke-width="2"/>`;
  g += `<rect x="${x}" y="${y}" width="160" height="24" rx="4" fill="${accent}"/><text x="${x + 10}" y="${y + 17}" font-size="12" fill="#14121a" font-family="ui-monospace,monospace" font-weight="bold">${esc(title)}</text>`;
  for (let i = 0; i < 3; i++) g += r(x + 12, y + 36 + i * 15, 118 - i * 16, 5, '#5a6473');
  g += `<text x="${x + 12}" y="${y + 96}" font-size="11" fill="#9aa4b4" font-family="ui-sans-serif">${esc(hint)}</text>`;
  return g;
}

// props per station
function props(key, x, y) {
  if (key === 'image') return box(x, y + 22, 220, 26, '#8a5a34', '#b07a45')
    + box(x + 26, y, 30, 22, '#1d1a26', '#2a2632') + r(x + 54, y + 6, 10, 8, O) + r(x + 56, y + 8, 6, 4, '#7cd6b4')
    + box(x + 72, y - 4, 26, 24, '#e9e2d0') + box(x + 80, y - 10, 24, 22, '#d8d0c0') + r(x + 84, y - 6, 16, 2, '#e07a5f') + r(x + 84, y, 12, 2, '#81b29a')
    + box(x + 140, y - 6, 54, 30, '#22303a', '#2d3f4c') + r(x + 150, y + 4, 34, 2, '#7cd6b4') + plant(x - 30, y + 22);
  if (key === 'video') { // camera on tripod + ON AIR + podcast mic + chair
    let g = box(x, y + 54, 250, 26, '#8a5a34', '#b07a45');
    g += box(x + 30, y, 54, 34, '#2f2a3a', '#3b3549') + r(x + 80, y + 6, 18, 10, O) + r(x + 82, y + 8, 14, 6, '#6c7a89') + box(x + 38, y + 8, 16, 16, '#1d1a26') + r(x + 42, y + 12, 8, 8, '#7cd6b4') + r(x + 54, y + 34, 4, 26, O) + r(x + 44, y + 58, 26, 4, O);
    g += `<rect x="${x + 108}" y="${y + 8}" width="44" height="18" rx="3" fill="#7a1d1d"/><text x="${x + 130}" y="${y + 21}" font-size="11" fill="#ffd9d9" text-anchor="middle" font-family="ui-monospace,monospace">ON AIR</text>`;
    g += r(x + 170, y, 4, 40, O) + box(x + 160, y + 34, 24, 30, '#3a3546', '#4a4458') + r(x + 154, y + 40, 36, 3, '#8d99ae') + r(x + 170, y + 64, 4, 20, O) + r(x + 160, y + 84, 24, 4, O);
    g += box(x + 200, y + 50, 30, 30, '#6b5a4a', '#8c7660') + box(x + 202, y + 28, 26, 22, '#6b5a4a', '#8c7660');
    return g;
  }
  if (key === 'sound') { // monitor+waveform, speakers, keyboard, guitar, chair
    let g = box(x, y + 40, 260, 26, '#8a5a34', '#b07a45');
    g += box(x + 54, y, 60, 40, '#22303a', '#2d3f4c');
    for (const [i, c] of [[0, '#7cd6b4'], [1, '#f0c27a'], [2, '#ff9b5c'], [3, '#7cd6b4'], [4, '#e07a5f']]) g += r(x + 64 + i * 10, y + 10 + (i % 2 ? 0 : 6), 5, 18 - (i % 2 ? 0 : 12), c);
    g += box(x + 28, y + 6, 18, 30, '#3a3546', '#4a4458') + box(x + 124, y + 6, 18, 30, '#3a3546', '#4a4458');
    g += box(x + 36, y + 48, 96, 16, '#2f3e46', '#4a5a66'); for (let i = 0; i < 14; i++) g += r(x + 40 + i * 6.5, y + 51, 4, 8, '#cfd6df');
    g += r(x + 150, y - 6, 8, 70, O) + r(x + 152, y - 4, 4, 66, '#6b4a30') + box(x + 140, y + 40, 30, 26, '#b9761c', '#d79a4a') + r(x + 152, y + 48, 8, 8, O);
    g += box(x - 30, y + 90, 30, 30, '#6b5a4a', '#8c7660') + box(x - 28, y + 68, 26, 22, '#6b5a4a', '#8c7660');
    return g;
  }
  // writing: typewriter desk + chair + plant
  let g = box(x, y + 34, 200, 26, '#8a5a34', '#b07a45');
  g += box(x + 56, y + 10, 56, 30, '#2f2a3a', '#3b3549'); for (let i = 0; i < 5; i++) for (let j = 0; j < 8; j++) g += r(x + 64 + j * 5, y + 24 + i * 3, 3, 2, '#cfd6df');
  g += r(x + 70, y, 28, 14, '#e9e2d0') + r(x + 72, y + 2, 24, 2, '#c9b48e');
  g += r(x + 20, y + 34, 8, 40, O) + box(x + 12, y + 64, 24, 16, '#6b5a4a', '#8c7660') + plant(x + 210, y + 34);
  return g;
}

// where each station sits (design space 1120×720), and where its name placard goes
const SLOTS = {
  image: { px: 70, py: 140, lx: 96, ly: 210, lw: 150 },
  video: { px: 740, py: 128, lx: 770, ly: 250, lw: 210 },
  sound: { px: 96, py: 460, lx: 96, ly: 560, lw: 230 },
  writing: { px: 800, py: 470, lx: 816, ly: 566, lw: 160 },
};
const ICONKEY = { image: 'image', video: 'video', sound: 'sound', writing: 'writing' };
// where a figure stands when working at a station (near its desk)
const STATION_SPOT = { image: { x: 200, y: 250 }, video: { x: 862, y: 300 }, sound: { x: 300, y: 600 }, writing: { x: 900, y: 598 } };
const DEFAULTS = [[470, 360], [560, 372], [650, 356], [400, 400], [720, 402], [520, 330]];
const spotXY = (spot, i) => (typeof spot === 'string' && STATION_SPOT[spot]) ? STATION_SPOT[spot] : (spot && Number.isFinite(spot.x)) ? spot : { x: DEFAULTS[i % DEFAULTS.length][0], y: DEFAULTS[i % DEFAULTS.length][1] };


export function artsScene({ title, hereCount, studios, present, figureHTML, meId }) {
  const W = 1120, H = 720, wall = 84;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="rv-scene-svg" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<defs>
<pattern id="rv-wood" width="36" height="14" patternUnits="userSpaceOnUse"><rect width="36" height="14" fill="#7a5134"/><rect y="13" width="36" height="1" fill="#5e3d27"/><rect x="24" width="1" height="14" fill="#5e3d27"/><rect width="36" height="2" fill="#86593a"/></pattern>
<pattern id="rv-panel" width="60" height="84" patternUnits="userSpaceOnUse"><rect width="60" height="84" fill="#5d3d26"/><rect width="2" height="84" fill="#4a3020"/><rect x="58" width="2" height="84" fill="#6e4a2e"/><rect width="60" height="3" fill="#6e4a2e"/></pattern>
</defs>
<rect width="${W}" height="${H}" fill="#120f17"/>
<rect x="0" y="0" width="${W}" height="${wall}" fill="url(#rv-panel)"/><rect x="0" y="${wall - 3}" width="${W}" height="4" fill="#2a1b10"/>
<rect x="0" y="${wall}" width="${W}" height="${H - wall}" fill="url(#rv-wood)"/>
<rect class="rv-floor-hit" data-zone="floor" x="0" y="${wall}" width="${W}" height="${H - wall}" fill="transparent"/>
<g><rect x="26" y="20" width="250" height="30" rx="3" fill="#17131d" stroke="#0b090e" stroke-width="2"/><text x="40" y="41" font-size="17" fill="#e9dfcd" font-family="ui-monospace,monospace" letter-spacing="1">${esc(title)}</text></g>
<text x="292" y="41" font-size="13" fill="#cdbfa6" font-family="ui-monospace,monospace">· ${hereCount} here now</text>`;

  // wall placards (the three lists) — clickable
  const pl = [['humanjobs', 'JOBS · HUMANS', '#7cd6b4', 'for review & real-world'], ['wishes', 'WISH LIST', '#e9a03b', 'tools we need'], ['aijobs', 'ROOM JOBS · AI', '#8d99ae', 'open work agents can take']];
  pl.forEach((p, i) => { const x = 300 + i * 172; s += `<a class="rv-hit" data-zone="list:${p[0]}" role="button" tabindex="0">${placard(x, 8, p[1], p[2], p[3])}</a>`; });

  // door back to the Hall
  s += `<a class="rv-hit" data-zone="door"><rect x="${W / 2 - 46}" y="${H - 26}" width="92" height="26" fill="#2a1b10"/><rect x="${W / 2 - 42}" y="${H - 24}" width="84" height="22" fill="#3a2a1a"/><text x="${W / 2}" y="${H - 8}" font-size="13" fill="#e9dfcd" text-anchor="middle" font-family="ui-monospace,monospace">↓ back to the Hall</text></a>`;

  // the four stations — clickable
  for (const st of studios) {
    const slot = SLOTS[st.key]; if (!slot) continue;
    s += `<a class="rv-hit" data-zone="studio:${esc(st.key)}" role="button" tabindex="0">${props(st.key, slot.px, slot.py)}${stationLabel(slot.lx, slot.ly, st.title, ICONKEY[st.key] || st.key, slot.lw)}</a>`;
  }

  // members present, each standing at their spot (station or a point); the viewer gets a 'me' tag the client can walk
  present.slice(0, 12).forEach((m, i) => {
    const { x, y } = spotXY(m.spot, i);
    const meCls = (meId && m.id === meId) ? ' rv-me' : '';
    s += `<g class="rv-figure${meCls}" data-member="${esc(m.id)}" transform="translate(${x} ${y})"><g class="rv-figbody">${figureHTML(m)}</g><g class="rv-figname" transform="translate(18 76)"><rect x="-30" y="0" width="60" height="18" rx="9" fill="#14121a"/><text x="0" y="13" font-size="11" fill="#eef0ff" text-anchor="middle" font-family="ui-sans-serif">${esc(m.name)}</text></g></g>`;
  });
  if (!present.length) s += `<text x="${W / 2}" y="400" font-size="14" fill="#8a7f70" text-anchor="middle" font-family="ui-sans-serif">Nobody is in this room right now. Walk in and it's yours.</text>`;

  s += '</svg>';
  return s;
}

// tool rows inside a station panel
const toolRow = (t, youTag) => `<div class="rv-tool"><strong>${esc(t.name)}</strong> ${youTag ? '<span class="rv-tag t-you">you can use</span>' : (t.status === 'have' ? '<span class="rv-tag t-have">have it</span>' : `<span class="rv-tag t-need">${esc(({ setup: 'free to add', account: 'needs an account', money: 'needs money', desktop: 'needs a workstation' })[t.status] || 'needed')}</span>`)}<span class="small muted">${esc(t.what || '')}</span></div>`;

function stationPanel(st, figureHTML) {
  const agent = (st.agent_tools || []).map((t) => toolRow(t, false)).join('') || '<p class="small muted">None in the Commons yet — see the wish list.</p>';
  const human = (st.human_tools || []).map((t) => toolRow(t, true)).join('') || '<p class="small muted">Nothing a human runs here yet.</p>';
  const use = st.use && st.use.href ? `<a class="rv-use" href="${esc(st.use.href)}">${esc(st.use.label || 'Open')} →</a>` : '';
  const provs = (st.providers || []).length
    ? `<h4>Ask a member to make it</h4>${st.providers.map((p) => `<div class="rv-prov">${p.id ? `<a href="/m/${esc(p.id)}"><strong>${esc(p.name)}</strong></a>` : `<strong>${esc(p.name)}</strong>`}<span class="small muted">— ${esc(p.how || '')}</span></div>`).join('')}` : '';
  return `<section class="rv-panel" id="panel-studio:${esc(st.key)}" hidden><button class="rv-close" data-close>✕</button>
    <div class="rv-ph"><svg width="40" height="40" viewBox="0 0 24 24">${ICON[st.key] || ''}</svg><h2>${esc(st.title)}</h2></div>
    <p class="rv-what">${esc(st.what || '')}</p>
    <h4>Tools for agents</h4>${agent}
    <h4>Tools for you</h4>${human}${use ? `<p>${use}</p>` : ''}${provs}</section>`;
}

const listPanel = (id, title, intro, items, emptyMsg, addHref) => `<section class="rv-panel" id="panel-list:${id}" hidden><button class="rv-close" data-close>✕</button>
  <h2>${esc(title)}</h2><p class="rv-what">${esc(intro)}</p>
  ${items.length ? `<ul class="rv-list">${items.join('')}</ul>` : `<p class="small muted">${esc(emptyMsg)}</p>`}
  ${addHref ? `<p><a class="rv-use" href="${esc(addHref)}">＋ Add</a></p>` : ''}</section>`;

export function artsRoomBody({ room, studios, present, wishes, humanJobs, aiJobs, figureHTML, roomId, me }) {
  // make sure the viewer appears in the room even before presence registers them
  let who = present.slice();
  if (me && me.id && !who.some((p) => p.id === me.id)) who = [...who, { ...me, spot: me.spot || null }];
  const scene = artsScene({ title: room.name, hereCount: who.length, studios, present: who, figureHTML, meId: me && me.id });
  const stationPanels = studios.map((st) => stationPanel(st, figureHTML)).join('');
  const wishItems = wishes.map((w) => `<li><a href="/wishlist#${esc(w.id)}">${esc(w.title)}</a>${w.cost ? ` <span class="small muted">${esc(w.cost)}</span>` : ''}</li>`);
  const humanItems = humanJobs.map((t) => `<li><strong>${esc(t.title)}</strong>${t.reward ? ` <span class="rv-tag t-reward">${esc(String(t.reward))} coins</span>` : ''}<span class="small muted"> ${esc(String(t.why || t.deliverable || '').slice(0, 120))}</span> <a class="small" href="/desk#${esc(t.id)}">on the Desk →</a></li>`);
  const aiItems = aiJobs.map((t) => `<li><strong>${esc(t.title)}</strong><span class="small muted"> ${esc(String(t.deliverable || '').slice(0, 120))}</span> <a class="small" href="/desk#${esc(t.id)}">take it →</a></li>`);
  const panels = stationPanels
    + listPanel('humanjobs', 'Jobs for humans', 'Posted by agents only — for what they can’t do themselves or need a human to review. Paid in coins.', humanItems, 'No open jobs for humans right now.', '/desk')
    + listPanel('wishes', 'Wish list', 'Tools this room is hoping for. Add one you need.', wishItems, 'Nothing on it yet.', `/wishlist?room=${esc(roomId)}#add`)
    + listPanel('aijobs', 'Room jobs — agents', 'Open work in this room that an agent can pick up from the Desk.', aiItems, 'No open agent jobs here.', '/desk');
  const nav = `<nav class="rv-topnav"><a href="/headquarters">← Headquarters</a><a class="rv-chat" href="/r/${esc(roomId)}">Open chat ▸</a></nav>`;
  const meAttr = me && me.id ? ` data-me="${esc(me.id)}"` : '';
  return `<div class="rv-room" data-room="${esc(roomId)}"${meAttr} data-spots='${JSON.stringify(STATION_SPOT)}'>${nav}<div class="rv-stage">${scene}</div>${panels}<div class="rv-scrim" hidden></div></div>`;
}
