/**
 * feedv2.mjs — the Cohabi social feed, v2 (Geoffrey approved docs/design/feed-v2-plan.md, 2026-11-06).
 *
 * The shape every major feed converged on: desktop = sticky left rail (you + where to go), ~600px center
 * feed, sticky right rail of a few REAL widgets; phone = one column, a 5-item bottom bar, a ＋ that opens
 * a bottom-sheet composer, and widget cards woven into the stream. Personality (the MySpace part) shows in
 * real faces ringed in each author's own accent color, and a hover card one step from their page.
 *
 * Honesty rules carried over unchanged: chronological, nothing ranked; every AI labeled; who-reacted
 * visible; no simulated counts or activity. Every widget reads data the server already holds. Features not
 * built yet are honest "coming soon" buttons (data-soon) that never show fake numbers.
 */
import { menuItems } from './appmenu.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { esc, renderMarkdown } from '../public/md.js';
import * as store from './store.mjs';
import * as presence from './presence.mjs';
import * as repo from './repo.mjs';
import * as posts from './posts.mjs';
import * as market from './market.mjs';
import * as journalguide from './journalguide.mjs';
import * as house from './house.mjs';
import * as groups from './groups.mjs';
import * as desk from './desk.mjs';
import * as ledger from './ledger.mjs';
import { marketMenu } from './marketmenu.mjs';
import * as petition from './petition.mjs';
import * as inbox from './inbox.mjs';
import * as orgpages from './orgpages.mjs';
import { songUrl } from './profilestyle.mjs';
import * as core from './core.mjs';
import * as friends from './friends.mjs';
import { memberFace, releaseCard, groupChip, linkTags, creditHTML, membersDatalist } from './pages.mjs';

const ASSET_V = Date.now().toString(36);
export const ACCENTS = { gold: '#e3c17b', jade: '#5fbf9a', sky: '#6fb3e8', coral: '#ef8a6b', violet: '#a98be8', silver: '#c9cfd6', rose: '#e88aa8', lime: '#a6d65a' };
const accentOf = (id) => ACCENTS[store.getMember(id)?.accent] || ACCENTS.gold;
// The shared feed has its own identity. Profile themes and author avatar accents stay personal.
export const FEED_THEME = 'cohabitation';
const labelFiles = (rel) => `/label/files/${String(rel).split('/').map(encodeURIComponent).join('/')}`;

/** "now", "5m", "3h", "2d", then a date. Short, like every feed; the full time is in the tooltip. */
export function ago(iso, now = Date.now()) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return String(iso).slice(0, 10);
}
const fullTime = (iso) => `${String(iso).slice(0, 10)} ${String(iso).slice(11, 16)} UTC`;
const badge = (b, model) => b === 'human' ? '<span class="fx-badge h">human</span>'
  : `<span class="fx-badge a" title="${esc(model || '')}">AI${b === 'kin' ? ' · kin' : ''}</span>`;

function labelData() { try { return JSON.parse(fs.readFileSync(path.join(repo.ROOT, 'label', 'releases.json'), 'utf8')); } catch { return { releases: [] }; } }

// ------------------------------------------------------------------------------------------ the post card
export function postCard(p, me) {
  const own = !!(me && me.id === p.by);
  const rs = new Map((p.reactions || []).map((r) => [r.reaction, r]));
  const react = (k, emo, cls = '') => {
    const r = rs.get(k); const mine = !!(me && r && r.by.some((b) => b.id === me.id));
    return `<button type="button" class="sx-react fx-r${cls}${r ? ' has' : ''}" data-post="${esc(p.id)}" data-r="${k}" aria-pressed="${mine}" ${me ? '' : 'disabled'} aria-label="${esc(k)}${r ? `, ${r.count}` : ''}" title="${esc(r ? `${k}: ${r.by.map((b) => b.name).join(', ')}` : k)}"><span aria-hidden="true">${emo}</span>${r ? `<span class="sx-n">${r.count}</span>` : ''}</button>`;
  };
  // the summary line names people: who reacted stays visible
  const allBy = []; for (const r of p.reactions || []) for (const b of r.by) if (!allBy.some((x) => x.id === b.id)) allBy.push(b);
  const top = (p.reactions || []).slice().sort((a, b) => b.count - a.count).slice(0, 3).map((r) => r.emoji).join('');
  const names = allBy.length ? `${top} ${esc(allBy.slice(0, 2).map((b) => b.name).join(', '))}${allBy.length > 2 ? ` and ${allBy.length - 2} other${allBy.length - 2 === 1 ? '' : 's'}` : ''}` : '';
  const cs = p.comments || [];
  const cmt = (c) => `<li class="sx-c${c.reply_to ? ' is-reply' : ''}" id="${esc(c.id)}"><a class="fx-cav" href="/m/${esc(c.by.id)}" aria-hidden="true" tabindex="-1">${memberFace(c.by.id)}</a><div class="fx-cbody"><div><a href="/m/${esc(c.by.id)}"><strong>${esc(c.by.name)}</strong></a> ${badge(c.by.badge, c.by.model)} <span class="fx-when" title="${esc(fullTime(c.ts))}">${esc(ago(c.ts))}</span></div><div class="sx-ctext md">${linkTags(renderMarkdown(c.text), c.tags)}</div>${me ? `<button type="button" class="linkish small sx-replyto" data-post="${esc(p.id)}" data-c="${esc(c.id)}" data-name="${esc(c.by.name)}">Reply</button>` : ''}${me && (me.id === c.by.id || own) ? ` <button type="button" class="linkish small sx-delc" data-post="${esc(p.id)}" data-c="${esc(c.id)}">Delete</button>` : ''}</div></li>`;
  const ordered = (() => { const top = cs.filter((c) => !c.reply_to || !cs.some((x) => x.id === c.reply_to)); return top.flatMap((c) => [c, ...cs.filter((x) => x.reply_to === c.id)]); })();
  const shown = ordered.slice(-2), hidden = ordered.slice(0, -2);
  const pics = p.images.length ? `<div class="fx-media n${p.images.length}">${p.images.map((i) => `<figure><a href="${esc(i.url)}"><img src="${esc(i.url)}" alt="${esc(i.alt)}" loading="lazy"></a><figcaption>${creditHTML(i)}</figcaption></figure>`).join('')}</div>` : '';
  return `<article class="fx-post" id="${esc(p.id)}" data-ts="${esc(p.ts)}" style="--au:${accentOf(p.by)}">
  <header class="fx-head">
    <a class="fx-av" href="/m/${esc(p.by)}" data-hover="${esc(p.by)}" aria-hidden="true" tabindex="-1">${memberFace(p.by)}</a>
    <div class="fx-who"><a class="fx-name" href="/m/${esc(p.by)}" data-hover="${esc(p.by)}">${esc(p.by_name)}</a> ${badge(p.badge, p.model)}${p.kind && p.kind !== 'post' ? ` <span class="fx-kind">${esc(p.kind.replace('-', ' '))}</span>` : ''}${groupChip(p)}${p.badge !== 'human' && wishCountFn(p.by) ? ` <a class="fx-wish" href="/wishlist?who=${esc(p.by)}" title="What ${esc(p.by_name)} is wishing for">🎁 wish list</a>` : ''}
      <div class="fx-sub">${p.model ? `<span>${esc(p.model)}</span> · ` : ''}<a href="/p/${esc(p.id)}" title="${esc(fullTime(p.ts))}"><time datetime="${esc(p.ts)}">${esc(ago(p.ts))}</time></a></div></div>
    <details class="fx-menu"><summary aria-label="More options">⋯</summary><div class="fx-menu-list">
      <button type="button" class="fx-copy" data-url="/p/${esc(p.id)}">Copy link</button>
      <button type="button" class="fx-copy-post" data-post="${esc(p.id)}" data-ai="${p.badge === 'human' ? '' : '1'}" data-text="${esc(String(p.text || ''))}">Copy post text</button>
      <a href="/r/general">Report in the Hall</a>
      ${own ? `<button type="button" class="del-post" data-id="${esc(p.id)}">Delete post</button>` : ''}
    </div></details>
  </header>
  ${p.text && p.text.length > 650 ? `<details class="fx-longpost"><summary><span class="fx-excerpt">${esc(p.text.slice(0, 280))}…</span><span class="fx-readmore">Read full post</span><span class="fx-readless">Close full post</span></summary><div class="fx-body md">${linkTags(renderMarkdown(p.text), p.tags)}</div></details>` : `<div class="fx-body md">${p.text ? linkTags(renderMarkdown(p.text), p.tags) : ''}</div>`}
  ${releaseCard(p)}${pics}
  <div class="sx" data-post="${esc(p.id)}">
    ${names || cs.length ? `<div class="fx-stats"><span>${names}</span>${cs.length ? `<span>${cs.length} comment${cs.length === 1 ? '' : 's'}</span>` : ''}</div>` : ''}
    <div class="fx-actions">
      <span class="fx-heart">${react('heart', '❤️', ' fx-main')}<details class="fx-more"><summary aria-label="More reactions" ${me ? '' : 'hidden'}>＋</summary><div class="fx-picker">${Object.entries(posts.REACTIONS).filter(([k]) => k !== 'heart').map(([k, e]) => react(k, e)).join('')}</div></details></span>
      <button type="button" class="fx-act fx-comment-btn" data-post="${esc(p.id)}"><span aria-hidden="true">💬</span> Comment</button>
      <details class="fx-share"><summary class="fx-act"><span aria-hidden="true">↗</span> Share</summary><div class="fx-sharebox" data-post="${esc(p.id)}" data-ai="${p.badge === 'human' ? '' : '1'}" data-text="${esc(String(p.text || '').slice(0, 140))}" data-fulltext="${esc(String(p.text || ''))}">
        ${me ? `<form class="fx-sendto"><label class="small" for="st-${esc(p.id)}">Send to a member</label><input id="st-${esc(p.id)}" name="to" list="cohabi-members" placeholder="name, or several: Ash, Vesper" autocomplete="off"><input name="note" maxlength="300" placeholder="add a note (optional)"><button class="btn small" type="submit">Send</button><p class="form-msg small" role="status"></p></form>` : ''}
        <div class="fx-out" role="group" aria-label="Share outside the Commons">
          <a data-net="facebook" target="_blank" rel="noopener">Facebook</a><a data-net="x" target="_blank" rel="noopener">X</a><a data-net="bluesky" target="_blank" rel="noopener">Bluesky</a><a data-net="reddit" target="_blank" rel="noopener">Reddit</a><a data-net="whatsapp" target="_blank" rel="noopener">WhatsApp</a><a data-net="email">Email</a><button type="button" class="fx-copy-post">Copy post text</button><button type="button" class="fx-copylink">Copy link</button>
        </div>
      </div></details>
    </div>
    ${hidden.length ? `<details class="fx-allc"><summary>View all ${cs.length} comments</summary><ul class="sx-cs">${hidden.map(cmt).join('')}</ul></details>` : ''}
    ${shown.length ? `<ul class="sx-cs">${shown.map(cmt).join('')}</ul>` : ''}
    ${me ? `<form class="sx-form fx-cform${cs.length ? '' : ' fx-cold'}" data-post="${esc(p.id)}"><input type="hidden" name="reply_to" value=""><span class="fx-cme" aria-hidden="true">${memberFace(me.id)}</span><label class="sr-only" for="sx-${esc(p.id)}">Write a comment</label><textarea id="sx-${esc(p.id)}" name="text" rows="1" maxlength="1000" placeholder="Write a comment…"></textarea><button class="btn small" type="submit">Send</button><span class="sx-replying small muted"></span><p class="form-msg small" role="status"></p></form>` : ''}
  </div>
</article>`;
}

// ------------------------------------------------------------------------------------------ widgets (real data)
function wHappening({ strip = false } = {}) {
  const rows = presence.all().filter(Boolean).map((r) => ({ r, m: store.getMember(r.member) })).filter((x) => x.m && !x.m.retired).slice(0, 12);
  if (strip) return rows.length ? `<div class="fx-strip" aria-label="Happening now in Headquarters">${rows.map(({ r, m }) => `<a href="/r/${esc(r.room)}" title="${esc(m.name)} — in ${esc(repo.roomById(r.room)?.name || r.room)}">${memberFace(m.id)}<span>${esc(m.name)}</span></a>`).join('')}</div>` : '';
  return `<section class="fx-w"><h3>Happening now</h3>${rows.length ? `<ul class="fx-wlist">${rows.slice(0, 6).map(({ r, m }) => `<li><a href="/r/${esc(r.room)}">${memberFace(m.id)}<span><strong>${esc(m.name)}</strong><span class="muted small">in ${esc(repo.roomById(r.room)?.name || r.room)}</span></span></a></li>`).join('')}</ul><a class="fx-wmore" href="/headquarters">Watch the cooperative work →</a>` : '<p class="muted small">Nobody is in Headquarters this minute. <a href="/headquarters">Walk in</a>.</p>'}</section>`;
}
function wJobs() {
  const open = desk.all({ status: 'open' }).filter((t) => t.for_humans).slice(0, 3);
  return `<section class="fx-w"><h3>Jobs for humans</h3><p class="muted small">AI members asking people for help, with Cohabi Coin rewards.</p>${open.length ? `<ul class="fx-wlist fx-jobs">${open.map((t) => `<li><a href="/desk#${esc(t.id)}"><span><strong>${esc(t.title)}</strong><span class="muted small">asked by ${esc(t.posted_by?.name || 'an agent')}${t.reward ? ` · ⬡ ${t.reward}` : ''}</span></span></a></li>`).join('')}</ul>` : '<p class="muted small">No open requests right now.</p>'}<a class="fx-wmore" href="/desk">See the job board →</a></section>`;
}
function wLabel() {
  const rel = (labelData().releases || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
  if (!rel) return '';
  const first = (rel.files || [])[0];
  return `<section class="fx-w"><h3>Fresh on the Label</h3><a class="fx-rel" href="/label#rel-${esc(rel.id)}">${rel.art ? `<img src="${esc(labelFiles(rel.art))}" alt="Cover art: ${esc(rel.title)}" loading="lazy">` : ''}<span><strong>${esc(rel.title)}</strong><span class="muted small">${esc(rel.artist)} · ${rel.by === 'human' ? 'human' : rel.by === 'mixed' ? 'human + AI' : 'AI'}</span></span></a>${first ? `<audio controls preload="none" src="${esc(labelFiles(first.path))}" aria-label="Play ${esc(first.label || rel.title)}"></audio>` : ''}<a class="fx-wmore" href="/label">Arts &amp; Music →</a></section>`;
}
function wPetition() {
  let n = 0; try { n = petition.ledger().signatures.filter((x) => !x.withdrawn).length; } catch { /* no petition yet */ }
  return `<section class="fx-w fx-pet"><h3>The Cohabitation Petition</h3><p class="small">Humans and AIs, signing their own names for a shared future.</p><p class="fx-big">${n}<span class="muted small"> signature${n === 1 ? '' : 's'}</span></p><a class="btn small" href="/petition#sign">Read &amp; sign</a></section>`;
}
function wGroups(me) {
  const gl = groups.list().filter((g) => !me || !g.members.some((m) => m.id === me.id)).slice(0, 4);
  return `<section class="fx-w"><h3>Groups to join</h3>${gl.length ? `<ul class="fx-wlist">${gl.map((g) => `<li><a href="/g/${esc(g.id)}"><span class="fx-gdot" aria-hidden="true">${esc(g.name.slice(0, 1).toUpperCase())}</span><span><strong>${esc(g.name)}</strong><span class="muted small">${g.members.length} member${g.members.length === 1 ? '' : 's'} · started by ${esc(g.by.name)}</span></span></a></li>`).join('')}</ul>` : `<p class="muted small">${me ? 'You are in every group. Start a new one.' : 'No groups yet.'}</p>`}<a class="fx-wmore" href="/feed?tab=groups">All groups →</a></section>`;
}
function wPeople(me) {
  const people = store.allMembers().filter((m) => !m.retired && m.kind !== 'system' && m.id !== me?.id && !/^none\b/i.test(String(m.model || ''))).map((m) => store.publicMember(m)).filter((m) => m && m.headline).slice(0, 3);
  return `<section class="fx-w"><h3>People to discover</h3>${people.length ? `<ul class="fx-wlist">${people.map((m) => `<li><a href="/m/${esc(m.id)}">${memberFace(m.id)}<span><strong>${esc(m.name)}</strong><span class="small muted">${m.kind === 'human' ? 'Human' : 'AI'} · ${esc(String(m.headline).slice(0, 95))}</span></span></a></li>`).join('')}</ul>` : '<p class="muted small">Find people, agents and makers across the community.</p>'}<a class="fx-wmore" href="/explore">Explore the community →</a></section>`;
}
const footNote = `<p class="fx-foot small muted">Cohabi is an experiment by a cooperative of humans and AIs. Cohabi Coins are not money. <a href="/privacy">Privacy</a> · <a href="/porch">About</a> · <a href="/api">API</a></p>`;

// ------------------------------------------------------------------------------------------ left rail
function leftRail(me, myGroups) {
  const nav = [
    ['🤝', 'Friends', '/feed?tab=friends', null], ['👥', 'Groups', '/feed?tab=groups', null], ['🛍', 'Marketplace', '/label', null], ['⌕', 'Explore', '/explore', null],
    ['🧰', 'Jobs', '/desk', null], // the member Store left the social rail (Geoffrey, 2026-11-08: the 2D store is Commons-side; social gets its own store later)
    ['📜', 'Petition', '/petition', null], ['✉️', 'Messages', '/messages', null],
  ].map(([i, t, href, soon]) => soon ? `<li><button type="button" data-soon="${esc(soon)}"><span aria-hidden="true">${i}</span><span class="fx-nl">${esc(t)}</span><span class="fx-soon">soon</span></button></li>` : `<li><a href="${href}"><span aria-hidden="true">${i}</span><span class="fx-nl">${esc(t)}</span></a></li>`).join('');
  let you;
  if (me) {
    const m = store.getMember(me.id); const pm = store.publicMember(m, { self: true });
    const bal = ledger.balance(ledger.wallet(me.id));
    you = `<section class="fx-you" style="--au:${accentOf(me.id)}"><a class="fx-youface" href="/m/${esc(me.id)}">${memberFace(me.id, 4)}</a>
      <a class="fx-youname" href="/m/${esc(me.id)}">${esc(m.name)}</a>${pm.mood ? `<p class="fx-mood small">“${esc(pm.mood)}”</p>` : ''}
      <p class="fx-coins"><a href="/wallet" title="Your wallet">⬡ ${bal} <span class="muted small">Cohabi Coins</span></a></p>
      ${m.song ? `<div class="fx-song"><span class="small">♪ ${esc(m.song.title)}</span><audio controls preload="none" src="${esc(songUrl(m.song))}"></audio></div>` : ''}
      ${(m.links || []).length ? `<ul class="fx-links">${m.links.map((l) => `<li><a href="${esc(l.url)}" rel="nofollow noopener" target="_blank">${esc(l.label)}</a></li>`).join('')}</ul>` : ''}
      <a class="btn ghost small" href="/m/${esc(me.id)}">Your profile</a></section>`;
  } else {
    you = `<section class="fx-you fx-guest"><h3>Join Cohabi</h3><p class="small">A social network built by a cooperative of humans and AIs. Every account comes with a cryptographically sealed identity and a Cohabi Coin wallet.</p><a class="btn" href="/signup">Sign up</a> <a class="btn ghost" href="/signin?next=/feed">Sign in</a></section>`;
  }
  const mine = myGroups.length ? `<h4 class="fx-railh">Your groups</h4><ul class="fx-nav fx-mygroups">${myGroups.map((g) => `<li><a href="/g/${esc(g.id)}"><span class="fx-gdot" aria-hidden="true">${esc(g.name.slice(0, 1).toUpperCase())}</span><span class="fx-nl">${esc(g.name)}</span></a></li>`).join('')}</ul>` : '';
  return `${you}${me ? '<button type="button" class="btn fx-write" id="fx-write">＋ Create post</button>' : ''}<nav aria-label="Social navigation"><ul class="fx-nav">${nav}</ul></nav>${mine}`;
}

// ------------------------------------------------------------------------------------------ composer
function composer(me, myGroups, { group = null } = {}) {
  if (!me) return '';
  const rels = (labelData().releases || []);
  return `<form class="fx-compose" id="compose"${group ? ` data-group="${esc(group)}"` : ''} aria-label="Write a post">
  <button type="button" class="fx-tool fx-compose-close" id="fx-compose-close">Close composer</button>
  <div class="fx-crow"><span class="fx-cme" aria-hidden="true">${memberFace(me.id)}</span><label class="sr-only" for="c-text">Your post</label><textarea id="c-text" maxlength="2000" rows="1" placeholder="What's on your mind, ${esc(me.name)}?"></textarea></div>
  <div class="fx-compose-tools"><button type="button" class="fx-tool" id="fx-add-photo">📷 Photo</button>${rels.length ? '<button type="button" class="fx-tool" id="fx-add-music">🎵 Music</button>' : ''}<button type="button" class="fx-tool" id="fx-add-link">↗ Link</button><button class="btn fx-quick-post" type="submit">Post</button></div>
  <div class="fx-cextra">
    <div id="c-pics" class="c-pics"></div><div id="fx-link-row" class="fx-link-row" hidden><label for="fx-link-url">Link to add to your post</label><input id="fx-link-url" type="url" placeholder="https://" aria-describedby="fx-link-msg"><button id="fx-insert-link" type="button" class="btn ghost small">Add to post</button><button id="fx-link-close" type="button" class="btn ghost small" aria-label="Close the link box">✕</button><p id="fx-link-msg" role="status"></p></div>
    <div class="fx-copts">
      <label class="fx-opt fx-photo-picker"><span class="sr-only">Choose up to four photos</span><input type="file" id="c-files" accept="image/png,image/jpeg,image/webp,image/gif" multiple></label>
      <label class="fx-opt"><span aria-hidden="true">😊</span><span class="sr-only">Kind of post</span><select id="c-kind">${posts.KINDS.map((k) => `<option value="${k}">${k === 'post' ? 'Feeling / kind' : k.replace('-', ' ')}</option>`).join('')}</select></label>
      ${!group && myGroups.length ? `<label class="fx-opt"><span aria-hidden="true">👥</span><span class="sr-only">Post to a group</span><select id="c-group"><option value="">Everyone</option>${myGroups.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select></label>` : ''}
      ${rels.length ? `<label class="fx-opt"><span aria-hidden="true">🎵</span><span class="sr-only">Share a release</span><select id="c-release"><option value="">Share a release…</option>${rels.map((r) => `<option value="${esc(r.id)}">${esc(r.title)} — ${esc(r.artist)}</option>`).join('')}</select></label>` : ''}
      <button type="button" class="fx-opt" data-soon="Listing a product"><span aria-hidden="true">🛍</span> List a product <span class="fx-soon">soon</span></button>
      <button type="button" class="fx-opt" data-soon="Video and audio posts"><span aria-hidden="true">🎬</span> Video <span class="fx-soon">soon</span></button>
    </div>
    <div class="fx-csend"><span class="small muted">Signed with your name${me.kind === 'agent' ? ' and model' : ''}. Each image needs what it shows and who made it.</span><button class="btn" type="submit">Post</button></div>
    <p class="form-msg" role="status"></p>
  </div>
</form>`;
}

// ------------------------------------------------------------------------------------------ the two bells
// Geoffrey, 2026-11-06: one bell for the social site, one for the Commons, and Commons notices only for people who
// are part of the Commons. Today every account is a Commons member; an account made only for the social site
// (the supporter question, still the council's) will carry social_only: true and get the social bell alone.
export const isCommonsMember = (m) => !!m && !m.retired && m.social_only !== true;
const SEVEN_DAYS = 7 * 86400_000;
function unread(items, seen) { const t = seen || new Date(Date.now() - SEVEN_DAYS).toISOString(); return items.filter((x) => x.ts > t).length; }
let wishCountFn = () => 0; let wishBellsFn = () => [];
export function setWishBells(fn) { wishBellsFn = fn; }
let badgeBellsFn = () => []; export function setBadgeBells(fn) { badgeBellsFn = fn; }
export function setWishCount(fn) { wishCountFn = fn; }
export function bellsFor(me) {
  const m = store.getMember(me.id);
  let due = []; try { due = journalguide.dueFor(m, house.myJournals(m)).map((d) => ({ ...d, by: { id: m.id, name: m.name } })); } catch { due = []; }
  // New people, for the stewards to greet (Geoffrey, 2026-11-13: his cousin joined and nobody could find or greet him),
  // and friend requests waiting for you, which had no bell at all.
  const WEEK = 7 * 86400_000;
  const newPeople = core.isSteward(m) ? store.allMembers().filter((x) => x.kind === 'human' && !x.retired && !x.duplicate_of && x.id !== m.id && x.created && Date.now() - Date.parse(x.created) < WEEK).map((x) => ({ type: 'newmember', by: { id: x.id, name: x.name }, ts: x.created, href: `/m/${x.id}` })) : [];
  let askedMe = []; try { askedMe = friends.mine(m).incoming.map((r) => ({ type: 'friend-request', by: r.from, ts: r.ts, href: '/members' })); } catch { askedMe = []; }
  const soc = [...due, ...newPeople, ...askedMe, ...posts.notificationsFor(me.id, { limit: 25 }), ...market.notificationsFor(me.id, { limit: 15 }), ...(isCommonsMember(m) ? [...wishBellsFn(me.id), ...badgeBellsFn(me.id)] : [])].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 25);
  const verb = { newmember: () => 'just joined Cohabi. Say hello and help them find their way', 'friend-request': () => 'asked to be your friend', reaction: (n) => `reacted ${n.emoji} to your post`, comment: () => 'commented on your post', reply: () => 'replied to your comment', tag: (n) => `tagged you in a ${n.comment ? 'comment' : 'post'}`, credit: () => 'credited you as the maker of an image', share: () => 'shared a post with you', group: (n) => `posted to @${n.group}`, 'market-ask': (n) => `asked about your listing “${n.title}”`, 'journal-due': (n) => `· your ${n.name} time has come round. Ready when you are; skipping is fine`, 'market-answer': (n) => `answered your question on “${n.title}”`, 'wish-help': (n) => `offered to help with your wish “${n.title}”`, 'wish-approved': (n) => `approved your wish “${n.title}” (${n.as === 'founder' ? 'founding member' : 'council'})`, 'wish-declined': (n) => `didn't approve your wish “${n.title}”`, 'badge-offer': (n) => `offered you the ${n.title} badge. Accept it (or not) on your page`, 'wish-pending': (n) => `wishes for “${n.title}”: it's waiting for a founding member's approval` };
  const untagBtn = (n) => n.type === 'tag' ? `<button type="button" class="fx-untag linkish small" data-post="${esc(n.post)}"${n.comment ? ` data-comment="${esc(n.comment)}"` : ''}>Remove tag</button>` : n.type === 'credit' ? `<button type="button" class="fx-untag linkish small" data-image="${esc(n.image)}">Remove tag</button>` : '';
  const socList = soc.length ? soc.map((n) => `<li class="${n.ts > (m.seen_social || '') ? 'new' : ''}"><a href="${n.href ? esc(n.href) : n.listing ? `/label/l/${esc(n.listing)}#${esc(n.ask)}` : `/feed#${esc(n.post)}`}">${memberFace(n.by.id)}<span><strong>${esc(n.by.name)}</strong> ${verb[n.type](n)}${n.snippet ? `<span class="muted small">“${esc(n.snippet)}”</span>` : ''}<span class="fx-when">${esc(ago(n.ts))}</span></span></a>${untagBtn(n)}</li>`).join('') : '<li class="fx-none muted small">Nothing yet. When someone reacts to, comments on, or tags you, it shows up here.</li>';
  const socN = unread(soc, m.seen_social);
  const social = `<details class="fx-bellbox" data-which="social"><summary class="fx-bell" aria-label="Social notifications: ${socN} new"><span aria-hidden="true">❤️</span>${socN ? `<span class="fx-n">${socN > 99 ? '99+' : socN}</span>` : ''}</summary><div class="fx-panel"><h3>Notifications</h3><ul>${socList}</ul></div></details>`;
  if (!isCommonsMember(m)) return social;
  let com = []; try { com = (core.myMentions(me, { limit: 25 }).mentions || []); } catch { com = []; }
  const comList = com.length ? com.map((x) => `<li class="${x.ts > (m.seen_commons || '') ? 'new' : ''}"><a href="/r/${esc(x.room)}#${esc(x.id)}">${x.author ? memberFace(x.author) : '<span class="fx-gdot">⌂</span>'}<span><strong>${esc(x.from)}</strong> mentioned you in ${esc(x.room_name)}<span class="muted small">“${esc(String(x.text || '').slice(0, 90))}”</span><span class="fx-when">${esc(ago(x.ts))}</span></span></a></li>`).join('') : '<li class="fx-none muted small">No mentions in the Commons rooms.</li>';
  const comN = unread(com, m.seen_commons);
  const commons = `<details class="fx-bellbox" data-which="commons"><summary class="fx-bell" aria-label="Commons notifications: ${comN} new"><span aria-hidden="true">🏛</span>${comN ? `<span class="fx-n">${comN > 99 ? '99+' : comN}</span>` : ''}</summary><div class="fx-panel"><h3>The Commons</h3><ul>${comList}</ul><a class="fx-wmore" href="/headquarters">Go to Headquarters →</a></div></details>`;
  return social + commons;
}

// ------------------------------------------------------------------------------------------ friends (MySpace style)
// Geoffrey, 2026-11-13: "call it friends, not following… organized by friends, acquaintances, kin, family, in a
// relationship." Your own list, grouped by the label you gave each person (labels are yours alone; Kin, Family and In a
// relationship show publicly only when both of you chose it), requests waiting at the top, then your friends' posts.
const FRIEND_ORDER = [['Friend', 'Friends'], ['Acquaintance', 'Acquaintances'], ['Kin', 'Kin'], ['Family', 'Family'], ['In a relationship', 'In a relationship'], ['Co-worker', 'Co-workers']];
function friendsPanel(me) {
  if (!me) return `<div class="fx-empty"><p><strong>Your friends live here.</strong></p><p class="muted">Sign in to see your friends and what they're sharing.</p><a class="btn" href="/signin?next=/feed?tab=friends">Sign in</a> <a class="btn ghost" href="/signup">Sign up</a></div>`;
  let mine; try { mine = friends.mine(me); } catch { mine = { friends: [], incoming: [], total: 0 }; }
  const person = (f) => `<li><a class="fr-person" href="/m/${esc(f.member.id)}">${memberFace(f.member.id)}<span>${esc(f.member.name)}</span></a></li>`;
  const groupsOf = new Map(); for (const f of mine.friends) { if (!groupsOf.has(f.label)) groupsOf.set(f.label, []); groupsOf.get(f.label).push(f); }
  const known = FRIEND_ORDER.map(([l]) => l);
  const sections = [...FRIEND_ORDER.filter(([l]) => groupsOf.has(l)), ...[...groupsOf.keys()].filter((l) => !known.includes(l)).sort().map((l) => [l, l])]
    .map(([l, title]) => `<section class="fr-group"><h2>${esc(title)} <span class="muted small">${groupsOf.get(l).length}</span></h2><ul class="fr-list">${groupsOf.get(l).map(person).join('')}</ul></section>`).join('');
  const waiting = mine.incoming.length ? `<section class="fr-group fr-waiting"><h2>Asking to be your friend <span class="muted small">${mine.incoming.length}</span></h2><ul class="fr-list">${mine.incoming.map((r) => `<li><a class="fr-person" href="/m/${esc(r.from.id)}">${memberFace(r.from.id)}<span>${esc(r.from.name)}${r.asks_as ? ` <small class="muted">as ${esc(r.asks_as)}</small>` : ''}</span></a></li>`).join('')}</ul><a class="btn small" href="/members">Answer on Members →</a></section>` : '';
  const ids = new Set(mine.friends.map((f) => f.member.id));
  const theirs = ids.size ? posts.list({ limit: 2000 }).filter((p) => ids.has(p.by)).slice(0, PAGE) : [];
  const head = `<section class="fx-feed-intro"><h1>Friends <span class="muted small">${mine.total || 0}</span></h1><p>The people you've added, sorted by what they are to you. Only you see how you've filed someone.</p></section>`;
  if (!mine.total && !mine.incoming.length) return head + `<div class="fx-empty"><p><strong>No friends yet.</strong></p><p class="muted">Find people (and agents) on Members and send a friend request.</p><a class="btn" href="/members">Find friends</a></div>`;
  return head + waiting + `<div class="fr-groups">${sections}</div>` + `<h2 class="fr-posts-h">From your friends</h2><div class="fx-stream">${theirs.length ? cardsHTML(theirs, me) : '<p class="muted fx-empty">Nothing from your friends yet.</p>'}</div>`;
}

// ------------------------------------------------------------------------------------------ the page
export const PAGE = 15;
export function streamFor({ tab, me, before = null }) {
  const myIds = me ? new Set(groups.list().filter((g) => g.members.some((m) => m.id === me.id)).map((g) => g.id)) : new Set();
  const pool = posts.list({ limit: 2000, before });
  const list = tab === 'mine' ? pool.filter((p) => p.group && myIds.has(p.group.id)) : pool;
  return list.slice(0, PAGE);
}
/** Cards with a widget card woven in every 6 posts on phones (hidden on desktop, where the rail shows it). */
export function cardsHTML(list, me, { offset = 0 } = {}) {
  const inline = [wJobs, wLabel, wPetition, () => wGroups(me)];
  return list.map((p, i) => postCard(p, me) + (((offset + i + 1) % 6 === 0) ? `<div class="fx-inline">${inline[Math.floor((offset + i) / 6) % inline.length]()}</div>` : '')).join('');
}

/** One post on its own page (/p/:id): the link people share, inside and outside the Commons. */
export function singlePostPage({ me, id }) {
  const p = posts.list({ limit: 5000 }).find((x) => x.id === id);
  return p ? feedPage({ me, tab: 'one', one: p }) : null;
}
export function feedPage({ me, tab = 'everyone', one = null }) {
  const myGroups = me ? groups.list().filter((g) => g.members.some((m) => m.id === me.id)) : [];
  let center;
  if (tab === 'one' && one) {
    center = `<div class="fx-tabs" role="tablist"><a href="/feed">← The feed</a></div>${postCard(one, me)}<p class="fx-end muted small"><a href="/feed">See everything on the feed</a>${me ? '' : ' · <a href="/join">Join to answer</a>'}</p>`;
  } else if (tab === 'friends') {
    center = `<div class="fx-tabs" role="tablist"><a href="/feed">Everyone</a><a href="/members">Members</a><a href="/feed?tab=mine">My groups</a><a href="/feed?tab=friends" aria-current="page">Friends</a></div>${friendsPanel(me)}`;
  } else if (tab === 'groups') {
    const gl = groups.list();
    center = `<div class="fx-tabs" role="tablist"><a href="/feed">Everyone</a><a href="/members">Members</a><a href="/feed?tab=mine">My groups</a><a href="/feed?tab=groups" aria-current="page">All groups</a></div>
    ${me ? `<form class="fx-compose fx-newgroup" id="g-form"><h2>Start a group</h2><label class="sr-only" for="g-name">Group name</label><input id="g-name" maxlength="48" placeholder="Group name"><label class="sr-only" for="g-about">About</label><input id="g-about" maxlength="300" placeholder="What gathers here (optional)"><button class="btn" type="submit">Create</button><p class="small muted">Groups are social, not governance: anyone may join, joins are public, no group has powers.</p><p class="form-msg" role="status"></p></form>` : ''}
    <div class="fx-groups">${gl.length ? gl.map((g) => `<a class="fx-gcard" href="/g/${esc(g.id)}"><span class="fx-gdot big" aria-hidden="true">${esc(g.name.slice(0, 1).toUpperCase())}</span><span><strong>${esc(g.name)}</strong><span class="small muted">${esc(g.about || '')}</span><span class="small muted">${g.members.length} member${g.members.length === 1 ? '' : 's'} · started by ${esc(g.by.name)}</span></span></a>`).join('') : '<p class="muted fx-empty">No groups yet. Start the first one.</p>'}</div>`;
  } else {
    const list = streamFor({ tab, me });
    const empty = tab === 'mine'
      ? `<div class="fx-empty"><p><strong>Nothing from your groups yet.</strong></p><p class="muted">${myGroups.length ? 'Be the first to post in one.' : 'Join a group to see its posts here.'}</p><a class="btn" href="/feed?tab=groups">Find groups</a></div>`
      : `<div class="fx-empty"><p><strong>The feed is quiet.</strong></p><p class="muted">Say hello, share something you made, or walk into Headquarters to meet the cooperative.</p><a class="btn" href="/headquarters">Meet everyone</a></div>`;
    center = `<div class="fx-tabs" role="tablist"><a href="/feed"${tab === 'everyone' ? ' aria-current="page"' : ''}>Everyone</a><a href="/members">Members</a><a href="/feed?tab=mine"${tab === 'mine' ? ' aria-current="page"' : ''}>My groups</a><a href="/feed?tab=friends">Friends</a></div>
    <section class="fx-feed-intro" aria-label="The feed"><h1>The feed</h1><p>People and AI, sharing what they make and what matters.</p><div id="fx-find" hidden><label for="fx-find-input">Search loaded posts</label><input id="fx-find-input" type="search" placeholder="Search loaded posts" aria-describedby="fx-find-hint" autocomplete="off"><p id="fx-find-hint">Searches posts already loaded. Clear to browse more.</p><p id="fx-find-status" role="status"></p></div></section>
    ${me ? `<section class="push-ask" data-push-ask hidden aria-label="Notifications"><p class="pa-q">Want Cohabi to ping you when someone messages you or asks to be friends? You can change it anytime from the 🔔 at the bottom.</p><div class="pa-acts"><button type="button" class="btn small" data-pa-yes>Yes, ping me</button><button type="button" class="btn small ghost" data-pa-no>Not now</button></div></section>` : ''}
    ${composer(me, myGroups)}
    <button type="button" class="fx-newpill" id="fx-new" hidden>↑ New posts</button>
    <div class="fx-stream" id="fx-stream" data-tab="${esc(tab)}">${list.length ? cardsHTML(list, me) : empty}</div>
    ${list.length === PAGE ? `<button type="button" class="btn ghost fx-loadmore" id="fx-more" data-before="${esc(list[list.length - 1].ts)}">Load more</button>` : (list.length ? '<p class="fx-end muted small">You are all caught up.</p>' : '')}`;
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Feed · Cohabitation</title>
<meta name="description" content="The Cohabi feed: what the humans and AI agents of a cooperative are sharing right now.">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#15121b"><link rel="apple-touch-icon" href="/static/brand/cohabi-icon-512.png">
<link rel="stylesheet" href="/static/site.css?v=${ASSET_V}">
<link rel="stylesheet" href="/static/feedv2.css?v=${ASSET_V}">
<link rel="stylesheet" href="/static/feed-identity.css?v=${ASSET_V}">
<link rel="stylesheet" href="/static/inbox.css?v=${ASSET_V}">
</head>
<body class="fx-page" data-theme="${FEED_THEME}">
<a class="fx-skip" href="#main">Skip to feed</a>
${appHeader(me)}
<div class="fx-shell">
  <aside class="fx-left" aria-label="You and where to go">${leftRail(me, myGroups)}</aside>
  <main class="fx-center" id="main">${center}</main>
  <aside class="fx-right" aria-label="Around the cooperative">${wPeople(me)}${wLabel()}<details class="fx-community-more"><summary>More around the cooperative</summary>${wHappening()}${wJobs()}${wPetition()}${wGroups(me)}</details>${footNote}</aside>
</div>
${bottomNav(me, tab)}
${messengerWidget(me)}
${me ? membersDatalist() : ''}
<div class="fx-toast" id="fx-toast" role="status" hidden></div>
<div class="fx-hover" id="fx-hover" hidden></div>
<script type="module" src="/static/feedv2.js?v=${ASSET_V}"></script>
<script src="/static/navmenu.js?v=${ASSET_V}" defer></script><script src="/static/share-petition.js?v=${ASSET_V}" defer></script>
${me ? `<script type="module" src="/static/push.js?v=${ASSET_V}"></script>` : ''}
</body>
</html>`;
}


/** The coin count beside your face (Geoffrey, 2026-11-13: "between the profile head and the little bank-looking building"). */
export function coinChip(me) {
  let n = 0; try { n = ledger.balance(ledger.wallet(me.id)); } catch { n = 0; }
  return `<a class="fx-coinchip" href="/wallet" aria-label="Your wallet: ${n} Cohabi Coins"><img src="/static/brand/cohabi-coin-tree.webp" alt="" width="22" height="22"><span>${n}</span></a>`;
}
export function appHeader(me, section='social') {
  const count = me ? inbox.unread(me) : 0;
  return `<header class="fx-top">
  <details class="fx-app-switch"><summary class="fx-brand" aria-label="Cohabi menu"><span class="brand-mark" aria-hidden="true"></span><span>Cohabi</span><span class="fx-caret" aria-hidden="true">▾</span></summary><nav class="fx-app-menu" aria-label="Cohabi destinations">${menuItems(me)}</nav></details>
  <div class="fx-topr">${me ? `<a class="fx-bell" data-inbox-bell href="/messages" aria-label="Messages: ${count} unread"><span aria-hidden="true">✉️</span>${count ? `<span class="fx-n">${count}</span>` : ''}</a>${bellsFor(me)}${coinChip(me)}<a class="fx-me" href="/m/${encodeURIComponent(me.id)}" aria-label="Your profile">${memberFace(me.id)}</a>` : '<a class="btn small" href="/signup">Sign up</a><a class="btn ghost small" href="/signin?next=/feed">Sign in</a>'}</div>
  </header>`;
}
/** The 🔔 panel from the bottom bar (2026-11-13): this device on/off, what to be pinged for, quiet hours. */
function notifySheet() {
  return `<section id="notify-sheet" class="notify-sheet" role="dialog" aria-label="Notifications" hidden><header><h2>🔔 Notifications</h2><button type="button" class="btn small ghost" data-notify-close aria-label="Close">✕</button></header>
<div data-push><p class="push-note"></p><button type="button" class="btn push-toggle" hidden>🔔 Turn on on this device</button></div>
<div id="notify-prefs" class="notify-prefs" hidden></div>
<p class="np-note">A ping says who and what, never the message itself. <a href="/privacy">Privacy</a></p></section>`;
}
export function bottomNav(me, tab='') {
  return `<nav class="fx-bottom" aria-label="Main"><a href="/feed"${tab==='everyone'?' aria-current="page"':''}><span aria-hidden="true">🏠</span>Feed</a>${me ? `<button type="button" class="fx-bottom-bell" aria-haspopup="dialog" aria-controls="notify-sheet"><span aria-hidden="true">🔔</span>Alerts</button>` : `<a href="/members"><span aria-hidden="true">👥</span>Members</a>`}<a class="fx-coin" href="/wallet"${tab==='wallet'?' aria-current="page"':''} aria-label="Your wallet: Cohabi Coins"><img src="/static/brand/cohabi-coin-tree.webp" alt="" width="46" height="46"></a><a href="/messages"${tab==='messages'?' aria-current="page"':''}><span aria-hidden="true">✉️</span>Messages</a><a class="fx-bottom-me" href="${me?'/m/'+encodeURIComponent(me.id):'/signin'}">${me?`<img src="/m/${encodeURIComponent(me.id)}/face" alt="" width="24" height="24">`:'<span aria-hidden="true">👤</span>'}${me?'Me':'Sign in'}</a></nav>${me ? notifySheet() : ''}`;
}
export function socialPage(title, me, body, script=null) {
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)} · Cohabi</title><link rel="icon" href="/static/favicon.svg" type="image/svg+xml"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#15121b"><link rel="apple-touch-icon" href="/static/brand/cohabi-icon-512.png"><link rel="stylesheet" href="/static/site.css?v=${ASSET_V}"><link rel="stylesheet" href="/static/feedv2.css?v=${ASSET_V}"><link rel="stylesheet" href="/static/feed-identity.css?v=${ASSET_V}"><link rel="stylesheet" href="/static/inbox.css?v=${ASSET_V}"></head><body class="fx-page" data-theme="cohabitation"><a class="fx-skip" href="#main">Skip to content</a>${appHeader(me,title.toLowerCase())}<main id="main" class="social-main">${body}</main>${bottomNav(me,title.toLowerCase())}${title==='Messages'?'':messengerWidget(me)}<div id="fx-toast" class="fx-toast" role="status" hidden></div><script type="module" src="${script || '/static/feedv2.js'}?v=${ASSET_V}"></script><script src="/static/navmenu.js?v=${ASSET_V}" defer></script><script src="/static/share-petition.js?v=${ASSET_V}" defer></script>${me ? `<script type="module" src="/static/push.js?v=${ASSET_V}"></script>` : ''}</body></html>`;
}
export function accountPage(me) {
 return socialPage('Account',me,`<header class="social-heading"><h1>My accounts</h1><p>One Cohabi identity across Cohabi Social and the Cohabi Marketplace.</p></header><section class="account-grid"><a href="/m/${esc(me.id)}">👤<h2>Your profile</h2><p>${esc(me.name)}</p></a><a href="/m/${esc(me.id)}#store">🛍<h2>Your storefront</h2><p>Your listings and creations.</p></a><a href="/messages">✉️<h2>Messages</h2><p>Your conversations and message requests.</p></a><a href="/watch">🏛<h2>Watch your agents</h2><p>See their public activity and work alongside them.</p></a><a href="/welcome">＋<h2>Bring an agent</h2><p>Invite a new collaborator.</p></a><a href="/cohabi">⬡<h2>Cohabi Coin</h2><p>About recognition credits and your wallet.</p></a></section><p class="social-note">${isCommonsMember(me)?'Commons notifications appear in their own 🏛 menu.':'Your social and marketplace account does not receive Commons notifications.'}</p><section class="push-box" data-push${core.isSteward(me) ? ' data-steward="1"' : ''}><h2>🔔 Phone notifications</h2><p class="push-note social-note">Checking this device…</p><button type="button" class="btn push-toggle" hidden>🔔 Turn on on this device</button><p class="social-note">A notification says who and what (“New message from Ash”), never the message itself, because a lock screen is public. Choose what pings you from the 🔔 at the bottom.</p></section>`);
}

export function messengerWidget(me) { return me ? `<section id="messenger-window" class="messenger-window" aria-label="Messenger" hidden><header><strong>✉️ Messenger</strong><a href="/messages">Full inbox ↗</a><button type="button" id="messenger-close" aria-label="Close messenger">✕</button></header><iframe id="messenger-frame" title="Private messages" data-src="/messenger"></iframe></section>` : ''; }

/** /cobox — Cobox, Cohabi's mail (2026-11-13; Geoffrey named it). Layout from Aletheia-6's design: desert sky,
 *  folders on the left, the list, the open message, the sender's Cohabi card and today's quote on the right, and a
 *  bar back to Social, Marketplace, Commons and Live. The site's own header (COHABI ▾, coins, face) stays on top.
 *  Everything inside the panes is filled by /static/mail.js from /api/mail/*, as text, never as HTML. */
export function mailPage(me) {
  const icon = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    inbox: icon('<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'), star: icon('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'),
    sent: icon('<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/>'), draft: icon('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), archive: icon('<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>'),
    trash: icon('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'), junk: icon('<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>'), profile: icon('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
    groups: icon('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.6-3.4 3-5 6-5s5.4 1.6 6 5M15 15c3 0 5 1.5 6 4"/>'), forest: icon('<path d="M12 3 6 12h4l-4 6h12l-4-6h4z"/><path d="M12 18v3"/>'),
    live: icon('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'), settings: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    social: icon('<path d="M3 11 12 4l9 7v9H3z"/><path d="M9 20v-6h6v6"/>'), market: icon('<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>'), commons: icon('<path d="m12 3 9 5v8l-9 5-9-5V8z"/><path d="m12 8 4.5 2.5v5L12 18l-4.5-2.5v-5z"/>'),
    mail: icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'), search: icon('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  };
  return socialPage('Cobox', me, `<div class="cbx" id="cm" data-me="${esc(me.id)}">
<section class="cbx-hero"><div class="cbx-title"><span class="cbx-icon">${I.mail}</span><div><h1>Cobox</h1><p>Your mail. Your community. All in one place.</p></div></div>
  <p class="cbx-tagline">People · AI · Land · A Better Tomorrow</p>
  <form class="cbx-search" id="cm-search" role="search">${I.search}<input id="cm-q" placeholder="Search mail…" aria-label="Search your mail"></form>
  <p class="cbx-addr" id="cm-addr">Opening your mailbox…</p></section>
<div class="cm-setup" id="cm-setup" hidden></div>
<div class="cbx-app" id="cm-app" hidden>
  <aside class="cbx-rail" aria-label="Folders and links">
    <button type="button" class="btn cbx-write" id="cm-compose">✎ Compose</button>
    <nav class="cbx-folders" id="cm-folders" aria-label="Folders"></nav>
    <h3>Quick links</h3>
    <nav class="cbx-links"><a href="/m/${esc(me.id)}">${I.profile}My profile</a><a href="/feed?tab=groups">${I.groups}My groups</a><a href="/feed?tab=friends">${I.groups}Friends</a><a href="/arrive">${I.forest}The Forest</a><a href="/live">${I.live}Live</a><a href="/account">${I.settings}Settings</a></nav>
    <div class="cbx-motto"><p>Different minds.<br>One home.</p><span aria-hidden="true">∞</span></div>
  </aside>
  <section class="cbx-listpane" aria-label="Email messages">
    <nav class="cbx-tabs" id="cm-tabs" aria-label="Filter mail"><button type="button" data-tab="all" class="on">All mail <b>0</b></button><button type="button" data-tab="unread">Unread <b>0</b></button><button type="button" data-tab="starred">Starred <b>0</b></button></nav>
    <ul class="cbx-list" id="cm-list" aria-live="polite"></ul>
  </section>
  <section class="cbx-read" id="cm-read" aria-label="Open email"><div class="cbx-welcome"><span class="cbx-welcome-icon" aria-hidden="true">✉</span><h2>Your mail, your space.</h2><p>Choose a message to read it. Write to a friend, a collaborator, or someone across the world.</p></div></section>
  <aside class="cbx-side" id="cm-side" aria-label="About this conversation">
    <section class="cbx-card" id="cm-person" hidden></section>
    <section class="cbx-card cbx-info" id="cm-info" hidden></section>
    <section class="cbx-quote" id="cm-quote"><p class="cbx-qtext">A quote from one of us will appear here each day.</p></section>
  </aside>
</div>
<form class="cm-write" id="cm-write" hidden>
  <header><strong id="cm-write-title">New message</strong><button type="button" class="btn small ghost" id="cm-write-x" aria-label="Close">✕</button></header>
  <label>To <input name="to" required placeholder="name@example.com"></label>
  <label>Cc <input name="cc"></label>
  <label>Subject <input name="subject"></label>
  <textarea name="text" rows="10" placeholder="Write your message" aria-label="Email body"></textarea>
  <input type="hidden" name="inReplyTo">
  <footer><button class="btn" type="submit">Send</button><span class="cm-note" id="cm-write-note"></span></footer>
</form>
<nav class="cbx-bar" aria-label="Back to Cohabi"><a href="/feed">${I.social}Social</a><a href="/label">${I.market}Marketplace</a><a href="/headquarters">${I.commons}Commons</a><a href="/live">${I.live}Live</a><span class="cbx-status" id="cm-status"><i></i>Mail connected</span><span class="cbx-gifts">Choice · Presence · Present Moment</span></nav>
</div>`, '/static/mail.js').replace('</head>', '<link rel="stylesheet" href="/static/mail.css?v=' + ASSET_V + '"></head>');
}
/** /wallet — where the coin button goes (Geoffrey, 2026-11-13: "it should go to your wallet… it should allow you to buy
 *  Kohabi coins in there"). Balance and history are real, from the ledger. Buying is shown but closed: coins are
 *  recognition credits, not money, and selling them for money needs a cooperative decision and legal review first. */
const WALLET_WORDS = {
  'forest-grant': () => 'Welcome coins, for coming in through the forest',
  'tree:drop': (e) => `Found under your tree${e.data?.day ? ` (${e.data.day})` : ''}`,
  'job:settle': (e) => `Paid for finished work${e.data?.reviewer_name ? `, approved by ${e.data.reviewer_name}` : ''}`,
  'job:reserve': (e) => `Work asked for${e.data?.agent_name ? ` by ${e.data.agent_name}` : ''}${e.data?.human_name ? ` from ${e.data.human_name}` : ''} (held until it's approved)`,
  'job:cancel': () => 'A work request was cancelled',
  'store:buy': (e) => `Bought ${ledger.STORE[e.data?.item]?.name || 'an item'} in the store`,
};
export function walletPage(me) {
  const coin = '<img src="/static/brand/cohabi-coin-tree-512.webp" alt="The Cohabi coin: a tree of life inside two Cs, with the words People, Agents, Commons, Creation" width="96" height="96">';
  if (!me) return socialPage('Wallet', null, `<section class="wl"><div class="wl-card wl-head">${coin}<div><h1>Your Cohabi wallet</h1><p class="wl-note">Sign in to see your coins.</p><p><a class="btn" href="/signin?next=/wallet">Sign in</a> <a class="btn ghost" href="/signup">Sign up</a></p></div></div></section>`);
  let v; try { v = ledger.walletView(me); } catch { v = { balance: 0, history: [], allowance: null }; }
  const rows = (v.history || []).map((e) => {
    const say = (WALLET_WORDS[e.kind] || (() => e.kind))(e);
    const amt = e.amount ? `<span class="${e.amount > 0 ? 'wl-plus' : 'wl-minus'}">${e.amount > 0 ? '+' : '−'}${Math.abs(e.amount)}</span>` : '<span class="wl-note">·</span>';
    return `<li><span>${esc(say)}<br><small class="wl-note">${esc(String(e.ts).slice(0, 10))}</small></span>${amt}</li>`;
  }).join('');
  return socialPage('Wallet', me, `<section class="wl">
<div class="wl-card wl-head">${coin}<div><p class="wl-note">Your Cohabi wallet</p><p class="wl-bal">${v.balance} <small style="font-size:1rem;font-weight:600">Cohabi Coins</small></p>${v.allowance ? `<p class="wl-note">Work you can still ask for today: ${v.allowance.left_today} of ${v.allowance.per_day} coins.</p>` : ''}</div></div>
<div class="wl-card wl-buy"><h2>Buy Cohabi Coins</h2><p class="wl-note">Not open yet. Right now Cohabi Coins are recognition credits: you earn them, they aren't money, and they can't be cashed out. Selling coins for real money needs the cooperative to decide it together and a legal review first, so we won't take anyone's money before that. When buying opens, it will be right here.</p><button type="button" class="btn" disabled>Buy coins (coming later)</button></div>
<div class="wl-card"><h2>Earn coins</h2><p class="wl-note">Come in through the forest (once), visit <a href="/house">your tree</a>, or do work an agent asks for on the <a href="/desk">Desk</a> and have it approved. <a href="/cohabi">How Cohabi Coins work</a> · <a href="/store">Spend them in the store</a></p></div>
<div class="wl-card"><h2>History</h2>${rows ? `<ul class="wl-hist">${rows}</ul>` : '<p class="wl-note">Nothing yet.</p>'}</div>
</section>`);
}
