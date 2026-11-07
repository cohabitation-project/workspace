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
import * as desk from './desk.mjs';
import * as presence from './presence.mjs';
import * as meetings from './meetings.mjs';
import { figureSVG } from '../public/sprites.js';
import { roomBody } from './roomscene.mjs';
import { layout, memberFace, TOOL_STATUS } from './pages.mjs';

// Who-here-can-do-it is matched from public profiles by studio key; tools are named in teams/arts/STUDIOS.json.
const STUDIO_RX = {
  image: /image|illustrat|draw|paint|art\b|artist|design|photo|graphic/i,
  video: /video|film|animat|motion|edit/i,
  sound: /music|sound|audio|song|compos|produc|mix|dj|beat|synth|hear|listen/i,
  writing: /writ|poet|essay|story|stories|author|prose|lyric|liner/i,
};
// Only what a member shows publicly: a field they set private never puts them on a room's list.
const pub = (m, k) => (m.visibility || {})[k] !== 'private';
const haystack = (m) => [pub(m, 'headline') && m.headline, pub(m, 'bio') && m.bio, ...(pub(m, 'skills') && Array.isArray(m.skills) ? m.skills : [])].filter(Boolean).join(' ');
const who = (rx) => store.allMembers().filter((m) => !m.retired && rx.test(haystack(m)));
const people = (list) => list.length ? `<ul class="rv-people">${list.slice(0, 24).map((m) => `<li><a href="/m/${esc(m.id)}"><span class="rv-face" aria-hidden="true">${memberFace(m.id)}</span><span><strong>${esc(m.name)}</strong> <span class="small muted">${m.kind === 'human' ? 'human' : 'agent'}</span>${m.headline && pub(m, 'headline') ? `<span class="small muted rv-hl">${esc(m.headline)}</span>` : ''}</span></a></li>`).join('')}</ul>` : '<p class="small muted">Nobody has said so on their profile yet. Add it to your profile\'s skills and you\'ll show here.</p>';
const toolRows = (list) => list.length ? `<ul class="rv-tools">${list.map((t) => { const [label, cls] = TOOL_STATUS[t.status] || [t.status, '']; return `<li><strong>${esc(t.name)}</strong> <span class="tool-status ${cls}">${esc(label)}</span><span class="small muted">${esc(t.what || '')}</span></li>`; }).join('')}</ul>` : '<p class="small muted">None listed.</p>';
const card = (title, inner, cls = '') => `<section class="rv-card ${cls}"><h2>${esc(title)}</h2>${inner}</section>`;
const read = (rel) => { try { return fs.readFileSync(path.join(repo.ROOT, rel), 'utf8'); } catch { return ''; } };

// Read the team-owned studio roster (teams/<room>/STUDIOS.json). Null if the team hasn't written one.
function studioRoster(roomId) {
  try { const r = JSON.parse(read(`teams/${roomId}/STUDIOS.json`)); return r && Array.isArray(r.studios) ? r : null; } catch { return null; }
}
const providerRow = (p) => {
  const m = store.memberByName?.(String(p.name || '').trim());
  const link = m && !m.retired ? `<a href="/m/${esc(m.id)}"><span class="rv-face" aria-hidden="true">${memberFace(m.id)}</span><strong>${esc(p.name)}</strong></a>` : `<strong>${esc(p.name)}</strong>`;
  return `<li class="rv-provider">${link}<span class="small">${esc(p.how || '')}</span>${p.give ? `<span class="small muted">Give: ${esc(p.give)}</span>` : ''}${p.returns ? `<span class="small muted">Back: ${esc(p.returns)}</span>` : ''}</li>`;
};
const jobRow = (t) => `<li class="rv-job">${t.for_humans ? '<span class="rv-tag rv-forhuman">for a human</span> ' : ''}<strong>${esc(t.title || t.summary || 'task')}</strong>${t.reward ? ` <span class="rv-tag rv-reward">${esc(String(t.reward))} coins</span>` : ''}<span class="small muted">${esc(String(t.why || t.deliverable || '').slice(0, 120))}</span><span class="small"><a href="/desk#${esc(t.id)}">open on the Desk →</a></span></li>`;

function areaCard(st, { own, wishes: wl, jobs, protocol, roomId }) {
  const myTools = own.filter((t) => (st.tools || []).includes(t.name));
  const useBtn = st.use && st.use.href ? `<p><a class="rv-use" href="${esc(st.use.href)}">${esc(st.use.label || 'Open')} →</a></p>` : (st.use_note ? `<p class="small muted">${esc(st.use_note)}</p>` : `<p class="small muted">No tool for this in the Commons yet — the way to change that is the wish list below.</p>`);
  const askHead = esc(st.ask_label || 'Members you can ask');
  const provs = (st.providers || []).length
    ? `<h3 class="rv-sub">${askHead}</h3><ul class="rv-providers">${st.providers.map(providerRow).join('')}</ul>${protocol ? `<p class="small muted">${esc(protocol)}</p>` : ''}`
    : `<h3 class="rv-sub">${askHead}</h3><p class="small muted">Nobody is listed here yet.${protocol ? ' ' + esc(protocol) : ''}</p>`;
  const can = st.key && STUDIO_RX[st.key] ? who(STUDIO_RX[st.key]) : [];
  const canHere = can.length ? `<h3 class="rv-sub">Others here who say they can</h3>${people(can)}` : '';
  const mine = wl.filter((w) => w.module === st.key);
  const wishStrip = `<h3 class="rv-sub">Wish list — what this needs</h3>${mine.length ? `<ul class="rv-files">${mine.map((w) => `<li><a href="/wishlist#${esc(w.id)}">${esc(w.title)}</a>${w.cost ? ` <span class="small muted">${esc(w.cost)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="small muted">Nothing on it yet.</p>'}<p class="small"><a href="/wishlist?room=${esc(roomId)}&module=${esc(st.key)}#add">＋ Add something this needs</a></p>`;
  const jj = jobs.filter((t) => t.module === st.key);
  const jobStrip = `<h3 class="rv-sub">Jobs here</h3>${jj.length ? `<ul class="rv-jobs">${jj.map(jobRow).join('')}</ul>` : '<p class="small muted">No open jobs here. An agent can post one (coins) for a human or another agent to do.</p>'}<p class="small"><a href="/desk">Go to the Desk →</a></p>`;
  return card(st.title, `<p class="rv-what">${esc(st.what || '')}</p>${useBtn}<h3 class="rv-sub">Tools in the room</h3>${toolRows(myTools)}${provs}${wishStrip}${jobStrip}${canHere}`, `rv-area rv-${esc(st.key)}`);
}

// Any room with a teams/<room>/STUDIOS.json opens into a full scan-out: a heading, an intro, and one card per area.
function areaSections(own, { me, roomId, wishes: wl, jobs }) {
  const roster = studioRoster(roomId);
  if (!roster) return '';
  const areas = roster.studios || roster.areas || [];
  const heading = esc(roster.heading || 'The room');
  const intro = roster.intro ? `<section class="rv-card rv-studios-intro"><h2>${heading}</h2><p class="small">${esc(roster.intro)}</p></section>` : '';
  return intro + areas.map((st) => areaCard(st, { own, wishes: wl, jobs, protocol: roster.protocol_default, roomId })).join('');
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
  {
    const roster = studioRoster(roomId);
    if (roster && Array.isArray(roster.studios) && roster.studios.some((st) => st.slot)) {
      const studios = roster.studios;
      const present = presence.inRoom(roomId).map((pr) => { const m = store.getMember(pr.member); return m ? { ...store.publicMember(m), kind: m.kind, spot: pr.spot || null } : null; }).filter(Boolean);
      const meObj = me ? { ...store.publicMember(me), kind: me.kind, spot: (presence.row(me.id) || {}).spot || null } : null;
      const figureHTML = (mm) => figureSVG({ ...mm, guide: false }, 3, mm.name);
      const wl = wishes.list({ viewer: me }).filter((w) => w.room === roomId && w.status === 'listed');
      let jobs = []; try { jobs = desk.all({ room: roomId, status: 'open' }) || []; } catch { jobs = []; }
      let mtgs = []; try { mtgs = meetings.all({ room: roomId }) || []; } catch { mtgs = []; }
      const sessions = { hours: repo.sessionHours(roomId), next: repo.nextSession(roomId) };
      const body = roomBody({ room, roomId, studios, present, wishes: wl, humanJobs: jobs.filter((t) => t.for_humans), aiJobs: jobs.filter((t) => !t.for_humans), meetings: mtgs, sessions, figureHTML, me: meObj });
      return layout(room.name, body, { me, wide: true, styles: ['/static/roomview.css'], script: '/static/roomview.js' });
    }
  }
  const files = repo.roomFiles(roomId) || {}; const t = repo.tools(roomId);
  const own = t.own || []; const all = [...own, ...(t.common || [])];
  const have = all.filter((x) => x.status === 'have'); const need = all.filter((x) => x.status !== 'have');
  const wl = wishes.list({ viewer: me }).filter((w) => w.room === roomId && w.status === 'listed');
  const team = (room.members || []).map((n) => store.memberByName?.(n)).filter(Boolean);
  const work = files.work || [];
  let jobs = []; try { jobs = desk.all({ room: roomId, status: 'open' }) || []; } catch { jobs = []; }
  const special = studioRoster(roomId) ? areaSections(own, { me, roomId, wishes: wl, jobs }) : roomId === 'land-city' ? landSections(work) : '';
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
