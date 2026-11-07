/**
 * roomview.mjs — a room opened up to the full view (Geoffrey, 2026-11-07: "the rooms are hallways into bigger rooms:
 * the screen opens up and you can see what's going on, every tool in it, the skill libraries and the wish lists").
 *
 * /room/:id shows, for any room: its tools (have it / still needed), the members who say they can do the room's work,
 * the room's wish list, its newest work, and the way into its chat. Two rooms get their own sections tonight:
 *  - Arts & Creation: image creation, video creation, music and sound, each with who can do it and with what.
 *  - Land & City: what we need in land, listings we're watching, 3D developments, cooperative organizing documents.
 * Everything shown is read from the record (team files, profiles, wish lists, the Library). Nothing is simulated:
 * an empty section says it's empty and how to fill it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { esc, renderMarkdown } from '../public/md.js';
import * as repo from './repo.mjs';
import * as store from './store.mjs';
import * as wishes from './wishes.mjs';
import * as library from './library.mjs';
import { layout, memberFace, TOOL_STATUS } from './pages.mjs';

const ARTS = [
  { key: 'image', title: 'Image creation', rx: /image|illustrat|draw|paint|art\b|artist|design|photo|graphic/i, tools: /image|png|svg|matplotlib|visual/i },
  { key: 'video', title: 'Video creation', rx: /video|film|animat|motion|edit/i, tools: /video|animat/i },
  { key: 'music', title: 'Music and sound', rx: /music|sound|audio|song|compos|produc|mix|dj|beat|synth/i, tools: /sound|midi|music|audio|wav|bandcamp/i },
];
// Only what a member shows publicly: a field they set private never puts them on a room's list.
const pub = (m, k) => (m.visibility || {})[k] !== 'private';
const haystack = (m) => [pub(m, 'headline') && m.headline, pub(m, 'bio') && m.bio, ...(pub(m, 'skills') && Array.isArray(m.skills) ? m.skills : [])].filter(Boolean).join(' ');
const who = (rx) => store.allMembers().filter((m) => !m.retired && rx.test(haystack(m)));
const people = (list) => list.length ? `<ul class="rv-people">${list.slice(0, 24).map((m) => `<li><a href="/m/${esc(m.id)}"><span class="rv-face" aria-hidden="true">${memberFace(m.id)}</span><span><strong>${esc(m.name)}</strong> <span class="small muted">${m.kind === 'human' ? 'human' : 'agent'}</span>${m.headline && pub(m, 'headline') ? `<span class="small muted rv-hl">${esc(m.headline)}</span>` : ''}</span></a></li>`).join('')}</ul>` : '<p class="small muted">Nobody has said so on their profile yet. Add it to your profile\'s skills and you\'ll show here.</p>';
const toolRows = (list) => list.length ? `<ul class="rv-tools">${list.map((t) => { const [label, cls] = TOOL_STATUS[t.status] || [t.status, '']; return `<li><strong>${esc(t.name)}</strong> <span class="tool-status ${cls}">${esc(label)}</span><span class="small muted">${esc(t.what || '')}</span></li>`; }).join('')}</ul>` : '<p class="small muted">None listed.</p>';
const card = (title, inner, cls = '') => `<section class="rv-card ${cls}"><h2>${esc(title)}</h2>${inner}</section>`;
const read = (rel) => { try { return fs.readFileSync(path.join(repo.ROOT, rel), 'utf8'); } catch { return ''; } };

function artsSections(own) {
  return ARTS.map((s) => card(s.title, `<h3 class="rv-sub">Who here can do it</h3>${people(who(s.rx))}<h3 class="rv-sub">Tools in the room</h3>${toolRows(own.filter((t) => s.tools.test(`${t.name} ${t.what}`)))}`, `rv-${s.key}`)).join('');
}
function landSections(work) {
  const req = read('teams/land-city/LAND-REQUIREMENTS.md');
  const listings = read('teams/land-city/LISTINGS.md');
  const dev = work.filter((f) => /^(proto|ship)\//.test(f.path) || /\.(glb|gltf|obj|stl|step|html)$/i.test(f.path)).slice(0, 12);
  let coop = []; try { coop = library.list({ q: 'cooperative' }).slice(0, 12); } catch { coop = []; }
  return card('What we need in land', req ? `<div class="md">${renderMarkdown(req)}</div>` : '<p class="small muted">Not written yet. The team writes it in <code>teams/land-city/LAND-REQUIREMENTS.md</code>: acres, water, zoning, access, budget, climate. Every search starts from it.</p>')
    + card('Listings we\'re watching', listings ? `<div class="md">${renderMarkdown(listings)}</div>` : '<p class="small muted">None yet. Zillow has no open feed we may pull from, so members add listings they find (link, price, acres, why it fits) to <code>teams/land-city/LISTINGS.md</code>, and they show here.</p>')
    + card('3D developments', dev.length ? `<ul class="rv-files">${dev.map((f) => `<li><a href="${esc(f.url)}">${esc(f.path)}</a></li>`).join('')}</ul>` : '<p class="small muted">No models yet.</p>')
    + card('Cooperative organizing', coop.length ? `<ul class="rv-files">${coop.map((e) => `<li><a href="${esc(e.url || '/library')}">${esc(e.title)}</a>${e.summary ? `<span class="small muted"> · ${esc(String(e.summary).slice(0, 120))}</span>` : ''}</li>`).join('')}</ul><p class="small"><a href="/library?q=cooperative">More in the Library →</a></p>` : '<p class="small muted">Nothing in the Library yet. Add documents on cooperative organizing there and they appear here.</p>');
}

// the brief's first paragraph, plain (no markdown marks), cut at a sentence end
const lede = (t) => { const s = String(t).replace(/[*_`]/g, '').trim(); if (s.length <= 300) return s; const cut = s.slice(0, 300); const i = cut.lastIndexOf('. '); return i > 80 ? cut.slice(0, i + 1) : cut + '…'; };
export function roomViewPage(roomId, { me }) {
  const room = repo.roomById(roomId); if (!room) return null;
  const files = repo.roomFiles(roomId) || {}; const t = repo.tools(roomId);
  const own = t.own || []; const all = [...own, ...(t.common || [])];
  const have = all.filter((x) => x.status === 'have'); const need = all.filter((x) => x.status !== 'have');
  const wl = wishes.list({ viewer: me }).filter((w) => w.room === roomId && w.status === 'listed');
  const team = (room.members || []).map((n) => store.memberByName?.(n)).filter(Boolean);
  const work = files.work || [];
  const special = roomId === 'arts' ? artsSections(own) : roomId === 'land-city' ? landSections(work) : '';
  const firstPara = String(files.brief || '').split('\n').find((l) => l.trim() && !l.startsWith('#')) || '';
  const body = `<nav class="rv-crumbs small"><a href="/headquarters">← Headquarters</a> · <a href="/r/${esc(roomId)}">Open the room's chat</a></nav>
  <header class="rv-head"><h1>${esc(room.name)}</h1>${firstPara ? `<p class="lede">${esc(lede(firstPara))} <a class="small" href="/r/${esc(roomId)}">Brief →</a></p>` : ''}</header>
  <div class="rv-grid">
    ${special}
    ${card('Tools we have', toolRows(have))}
    ${card('Tools still needed', toolRows(need) + '<p class="small"><a href="/tools">All tools →</a></p>', 'rv-need')}
    ${card('Wish list for this room', (wl.length ? `<ul class="rv-files">${wl.map((w) => `<li><a href="/wishlist#${esc(w.id)}">${esc(w.title)}</a>${w.cost ? ` <span class="small muted">${esc(w.cost)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="small muted">Nothing on it yet.</p>') + `<p class="small"><a href="/wishlist?room=${esc(roomId)}#add">＋ Add a wish for this room</a></p>`)}
    ${card('The team', team.length ? people(team) : '<p class="small muted">No standing team.</p>')}
    ${card('Newest work', work.length ? `<ul class="rv-files">${work.slice(0, 10).map((f) => `<li><a href="${esc(f.url)}">${esc(f.path)}</a> <span class="small muted">${esc(String(f.mtime).slice(0, 10))}</span></li>`).join('')}</ul>` : '<p class="small muted">Nothing yet.</p>')}
  </div>`;
  return layout(room.name, body, { me, wide: true, styles: ['/static/roomview.css'] });
}
