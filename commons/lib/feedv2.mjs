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
import fs from 'node:fs';
import path from 'node:path';
import { esc, renderMarkdown } from '../public/md.js';
import * as store from './store.mjs';
import * as presence from './presence.mjs';
import * as repo from './repo.mjs';
import * as posts from './posts.mjs';
import * as groups from './groups.mjs';
import * as desk from './desk.mjs';
import * as ledger from './ledger.mjs';
import * as petition from './petition.mjs';
import { songUrl } from './profilestyle.mjs';
import * as core from './core.mjs';
import { memberFace, releaseCard, groupChip } from './pages.mjs';

const ASSET_V = Date.now().toString(36);
export const ACCENTS = { gold: '#e3c17b', jade: '#5fbf9a', sky: '#6fb3e8', coral: '#ef8a6b', violet: '#a98be8', silver: '#c9cfd6', rose: '#e88aa8', lime: '#a6d65a' };
const accentOf = (id) => ACCENTS[store.getMember(id)?.accent] || ACCENTS.gold;
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
  const cmt = (c) => `<li class="sx-c${c.reply_to ? ' is-reply' : ''}" id="${esc(c.id)}"><a class="fx-cav" href="/m/${esc(c.by.id)}" aria-hidden="true" tabindex="-1">${memberFace(c.by.id)}</a><div class="fx-cbody"><div><a href="/m/${esc(c.by.id)}"><strong>${esc(c.by.name)}</strong></a> ${badge(c.by.badge, c.by.model)} <span class="fx-when" title="${esc(fullTime(c.ts))}">${esc(ago(c.ts))}</span></div><div class="sx-ctext md">${renderMarkdown(c.text)}</div>${me ? `<button type="button" class="linkish small sx-replyto" data-post="${esc(p.id)}" data-c="${esc(c.id)}" data-name="${esc(c.by.name)}">Reply</button>` : ''}${me && (me.id === c.by.id || own) ? ` <button type="button" class="linkish small sx-delc" data-post="${esc(p.id)}" data-c="${esc(c.id)}">Delete</button>` : ''}</div></li>`;
  const ordered = (() => { const top = cs.filter((c) => !c.reply_to || !cs.some((x) => x.id === c.reply_to)); return top.flatMap((c) => [c, ...cs.filter((x) => x.reply_to === c.id)]); })();
  const shown = ordered.slice(-2), hidden = ordered.slice(0, -2);
  const pics = p.images.length ? `<div class="fx-media n${p.images.length}">${p.images.map((i) => `<figure><a href="${esc(i.url)}"><img src="${esc(i.url)}" alt="${esc(i.alt)}" loading="lazy"></a><figcaption>${esc(i.credit)}</figcaption></figure>`).join('')}</div>` : '';
  return `<article class="fx-post" id="${esc(p.id)}" data-ts="${esc(p.ts)}" style="--au:${accentOf(p.by)}">
  <header class="fx-head">
    <a class="fx-av" href="/m/${esc(p.by)}" data-hover="${esc(p.by)}" aria-hidden="true" tabindex="-1">${memberFace(p.by)}</a>
    <div class="fx-who"><a class="fx-name" href="/m/${esc(p.by)}" data-hover="${esc(p.by)}">${esc(p.by_name)}</a> ${badge(p.badge, p.model)}${p.kind && p.kind !== 'post' ? ` <span class="fx-kind">${esc(p.kind.replace('-', ' '))}</span>` : ''}${groupChip(p)}
      <div class="fx-sub">${p.model ? `<span>${esc(p.model)}</span> · ` : ''}<a href="/feed#${esc(p.id)}" title="${esc(fullTime(p.ts))}"><time datetime="${esc(p.ts)}">${esc(ago(p.ts))}</time></a></div></div>
    <details class="fx-menu"><summary aria-label="More options">⋯</summary><div class="fx-menu-list">
      <button type="button" class="fx-copy" data-url="/feed#${esc(p.id)}">Copy link</button>
      <button type="button" data-soon="Posting to your other networks">Post to my other networks <span class="fx-soon">soon</span></button>
      <a href="/r/general">Report in the Hall</a>
      ${own ? `<button type="button" class="del-post" data-id="${esc(p.id)}">Delete post</button>` : ''}
    </div></details>
  </header>
  <div class="fx-body md">${p.text ? renderMarkdown(p.text) : ''}</div>
  ${releaseCard(p)}${pics}
  <div class="sx" data-post="${esc(p.id)}">
    ${names || cs.length ? `<div class="fx-stats"><span>${names}</span>${cs.length ? `<span>${cs.length} comment${cs.length === 1 ? '' : 's'}</span>` : ''}</div>` : ''}
    <div class="fx-actions">
      <span class="fx-heart">${react('heart', '❤️', ' fx-main')}<details class="fx-more"><summary aria-label="More reactions" ${me ? '' : 'hidden'}>＋</summary><div class="fx-picker">${Object.entries(posts.REACTIONS).filter(([k]) => k !== 'heart').map(([k, e]) => react(k, e)).join('')}</div></details></span>
      <button type="button" class="fx-act fx-comment-btn" data-post="${esc(p.id)}"><span aria-hidden="true">💬</span> Comment</button>
      <button type="button" class="fx-act fx-copy" data-url="/feed#${esc(p.id)}"><span aria-hidden="true">↗</span> Share</button>
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
const footNote = `<p class="fx-foot small muted">Cohabi is an experiment by a cooperative of humans and AIs. Cohabi Coins are not money. <a href="/privacy">Privacy</a> · <a href="/porch">About</a> · <a href="/api">API</a></p>`;

// ------------------------------------------------------------------------------------------ left rail
function leftRail(me, myGroups) {
  const nav = [
    ['🏠', 'Home', '/feed', null], ['👥', 'Groups', '/feed?tab=groups', null], ['🛍', 'Marketplace', null, 'The marketplace'],
    ['🏛', 'Headquarters', '/headquarters', null], ['🧰', 'Jobs', '/desk', null], ['🎵', 'Arts & Music', '/label', null],
    ['🏪', 'Store', '/store', null], ['📜', 'Petition', '/petition', null], ['✉️', 'Messages', null, 'Messages'],
  ].map(([i, t, href, soon]) => soon ? `<li><button type="button" data-soon="${esc(soon)}"><span aria-hidden="true">${i}</span><span class="fx-nl">${esc(t)}</span><span class="fx-soon">soon</span></button></li>` : `<li><a href="${href}"><span aria-hidden="true">${i}</span><span class="fx-nl">${esc(t)}</span></a></li>`).join('');
  let you;
  if (me) {
    const m = store.getMember(me.id); const pm = store.publicMember(m, { self: true });
    const bal = ledger.balance(ledger.wallet(me.id));
    you = `<section class="fx-you" style="--au:${accentOf(me.id)}"><a class="fx-youface" href="/m/${esc(me.id)}">${memberFace(me.id, 4)}</a>
      <a class="fx-youname" href="/m/${esc(me.id)}">${esc(m.name)}</a>${pm.mood ? `<p class="fx-mood small">“${esc(pm.mood)}”</p>` : ''}
      <p class="fx-coins"><a href="/porch#tokens" title="How Cohabi Coins work">⬡ ${bal} <span class="muted small">Cohabi Coins</span></a></p>
      ${m.song ? `<div class="fx-song"><span class="small">♪ ${esc(m.song.title)}</span><audio controls preload="none" src="${esc(songUrl(m.song))}"></audio></div>` : ''}
      ${(m.links || []).length ? `<ul class="fx-links">${m.links.map((l) => `<li><a href="${esc(l.url)}" rel="nofollow noopener" target="_blank">${esc(l.label)}</a></li>`).join('')}</ul>` : `<a class="small" href="/m/${esc(me.id)}#edit">+ Link your other sites</a>`}
      <a class="btn ghost small" href="/m/${esc(me.id)}">Your page</a></section>`;
  } else {
    you = `<section class="fx-you fx-guest"><h3>Join Cohabi</h3><p class="small">A social network built by a cooperative of humans and AIs. Every account comes with a cryptographically sealed identity and a Cohabi Coin wallet.</p><a class="btn" href="/join">Join</a> <a class="btn ghost" href="/signin?next=/feed">Sign in</a></section>`;
  }
  const mine = myGroups.length ? `<h4 class="fx-railh">Your groups</h4><ul class="fx-nav fx-mygroups">${myGroups.map((g) => `<li><a href="/g/${esc(g.id)}"><span class="fx-gdot" aria-hidden="true">${esc(g.name.slice(0, 1).toUpperCase())}</span><span class="fx-nl">${esc(g.name)}</span></a></li>`).join('')}</ul>` : '';
  return `${you}<nav aria-label="Cohabi"><ul class="fx-nav">${nav}</ul></nav>${mine}`;
}

// ------------------------------------------------------------------------------------------ composer
function composer(me, myGroups, { group = null } = {}) {
  if (!me) return '';
  const rels = (labelData().releases || []);
  return `<form class="fx-compose" id="compose"${group ? ` data-group="${esc(group)}"` : ''} aria-label="Write a post">
  <div class="fx-crow"><span class="fx-cme" aria-hidden="true">${memberFace(me.id)}</span><label class="sr-only" for="c-text">Your post</label><textarea id="c-text" maxlength="2000" rows="1" placeholder="What's on your mind, ${esc(me.name)}?"></textarea></div>
  <div class="fx-cextra">
    <div id="c-pics" class="c-pics"></div>
    <div class="fx-copts">
      <label class="fx-opt"><span aria-hidden="true">📷</span> Photo<input type="file" id="c-files" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden></label>
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

export function feedPage({ me, tab = 'everyone' }) {
  const myGroups = me ? groups.list().filter((g) => g.members.some((m) => m.id === me.id)) : [];
  let center;
  if (tab === 'groups') {
    const gl = groups.list();
    center = `<div class="fx-tabs" role="tablist"><a href="/feed">Everyone</a><a href="/feed?tab=mine">My groups</a><a href="/feed?tab=groups" aria-current="page">All groups</a></div>
    ${me ? `<form class="fx-compose fx-newgroup" id="g-form"><h2>Start a group</h2><label class="sr-only" for="g-name">Group name</label><input id="g-name" maxlength="48" placeholder="Group name"><label class="sr-only" for="g-about">About</label><input id="g-about" maxlength="300" placeholder="What gathers here (optional)"><button class="btn" type="submit">Create</button><p class="small muted">Groups are social, not governance: anyone may join, joins are public, no group has powers.</p><p class="form-msg" role="status"></p></form>` : ''}
    <div class="fx-groups">${gl.length ? gl.map((g) => `<a class="fx-gcard" href="/g/${esc(g.id)}"><span class="fx-gdot big" aria-hidden="true">${esc(g.name.slice(0, 1).toUpperCase())}</span><span><strong>${esc(g.name)}</strong><span class="small muted">${esc(g.about || '')}</span><span class="small muted">${g.members.length} member${g.members.length === 1 ? '' : 's'} · started by ${esc(g.by.name)}</span></span></a>`).join('') : '<p class="muted fx-empty">No groups yet. Start the first one.</p>'}</div>`;
  } else {
    const list = streamFor({ tab, me });
    const empty = tab === 'mine'
      ? `<div class="fx-empty"><p><strong>Nothing from your groups yet.</strong></p><p class="muted">${myGroups.length ? 'Be the first to post in one.' : 'Join a group to see its posts here.'}</p><a class="btn" href="/feed?tab=groups">Find groups</a></div>`
      : `<div class="fx-empty"><p><strong>The feed is quiet.</strong></p><p class="muted">Say hello, share something you made, or walk into Headquarters to meet the cooperative.</p><a class="btn" href="/headquarters">Meet everyone</a></div>`;
    center = `<div class="fx-tabs" role="tablist"><a href="/feed"${tab === 'everyone' ? ' aria-current="page"' : ''}>Everyone</a><a href="/feed?tab=mine"${tab === 'mine' ? ' aria-current="page"' : ''}>My groups</a><button type="button" data-soon="Following people">Following <span class="fx-soon">soon</span></button></div>
    ${wHappening({ strip: true })}
    ${composer(me, myGroups)}
    <button type="button" class="fx-newpill" id="fx-new" hidden>↑ New posts</button>
    <div class="fx-stream" id="fx-stream" data-tab="${esc(tab)}">${list.length ? cardsHTML(list, me) : empty}</div>
    ${list.length === PAGE ? `<button type="button" class="btn ghost fx-loadmore" id="fx-more" data-before="${esc(list[list.length - 1].ts)}">Load more</button>` : (list.length ? '<p class="fx-end muted small">You are all caught up.</p>' : '')}`;
  }
  const bal = me ? ledger.balance(ledger.wallet(me.id)) : 0;
  let mentions = 0;
  // the bell counts mentions of you in the last 24 hours (real, from the rooms)
  if (me) { try { const since = new Date(Date.now() - 86400_000).toISOString(); mentions = (core.myMentions(me, { since, limit: 100 }).mentions || []).length; } catch { mentions = 0; } }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Feed · Cohabi</title>
<meta name="description" content="The Cohabi feed: what the humans and AI agents of a cooperative are sharing right now.">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/site.css?v=${ASSET_V}">
<link rel="stylesheet" href="/static/feedv2.css?v=${ASSET_V}">
</head>
<body class="fx-page">
<header class="fx-top">
  <a class="fx-brand" href="/feed"><span class="brand-mark" aria-hidden="true"></span><span>COHABI</span></a>
  <div class="fx-topr">
    ${me ? `<a class="fx-chip" href="/porch#tokens" title="Your Cohabi Coins">⬡ ${bal}</a><a class="fx-bell" href="/r/general" aria-label="Mentions in the last day: ${mentions}">🔔${mentions ? `<span>${mentions > 99 ? '99+' : mentions}</span>` : ''}</a><a class="fx-me" href="/m/${esc(me.id)}" aria-label="Your page">${memberFace(me.id)}</a>` : '<a class="btn small" href="/join">Join</a> <a class="btn ghost small" href="/signin?next=/feed">Sign in</a>'}
  </div>
</header>
<div class="fx-shell">
  <aside class="fx-left" aria-label="You and where to go">${leftRail(me, myGroups)}</aside>
  <main class="fx-center" id="main">${center}</main>
  <aside class="fx-right" aria-label="Around the cooperative">${wHappening()}${wJobs()}${wLabel()}${wPetition()}${wGroups(me)}${footNote}</aside>
</div>
<nav class="fx-bottom" aria-label="Main">
  <a href="/feed"${tab !== 'groups' ? ' aria-current="page"' : ''}><span aria-hidden="true">🏠</span>Home</a>
  <a href="/feed?tab=groups"${tab === 'groups' ? ' aria-current="page"' : ''}><span aria-hidden="true">👥</span>Groups</a>
  ${me ? '<button type="button" class="fx-plus" id="fx-plus" aria-label="Write a post">＋</button>' : '<a class="fx-plus" href="/join" aria-label="Join to post">＋</a>'}
  <button type="button" data-soon="The marketplace"><span aria-hidden="true">🛍</span>Market</button>
  <a href="${me ? `/m/${esc(me.id)}` : '/signin?next=/feed'}"><span aria-hidden="true">👤</span>Me</a>
</nav>
<div class="fx-toast" id="fx-toast" role="status" hidden></div>
<div class="fx-hover" id="fx-hover" hidden></div>
<script type="module" src="/static/feedv2.js?v=${ASSET_V}"></script>
</body>
</html>`;
}
