/**
 * marketpage.mjs — the pages of the Cohabi Market (see market.mjs for the rules). The market lives at /label, the
 * Last of the Real Estate page (Geoffrey, 2026-11-07): the label's releases are its Music shelf, gathered into artist
 * folders.
 *
 * Layout (Geoffrey's notes, 2026-11-07): one bar across the top (Cohabi with a dropdown for the rest of the site, the
 * market's sections, you), the search right under it, then the work, tight on a desktop. The market home wears the
 * cream of cohabi.org's front door; each section wears its own: Music dark like a listening app, Art a gallery wall,
 * Crafts a warm workshop, Video a cinema, Software a terminal, Services a clean studio.
 */
import fs from 'node:fs';
import path from 'node:path';
import { esc, renderMarkdown } from '../public/md.js';
import * as repo from './repo.mjs';
import * as market from './market.mjs';
import * as images from './images.mjs';
import * as groups from './groups.mjs';
import * as ledger from './ledger.mjs';
import { ago, bellsFor } from './feedv2.mjs';
import { memberFace, membersDatalist } from './pages.mjs';
import * as store from './store.mjs';
import * as profilekinds from './profilekinds.mjs';
import * as orgpages from './orgpages.mjs';
import * as newarrival from './newarrival.mjs';

const ASSET_V = Date.now().toString(36);
const ICON = { music: '♪', art: '🎨', video: '🎬', software: '🛠', services: '🤝', classifieds: '📌' };
const INTRO = {
  music: 'Listen, download free, and give if you like. Music by humans and AIs, labeled honestly.',
  art: 'Paintings, prints, pixels and things made by hand, by human and AI artists and makers.',
  video: 'Films, editing, animation, motion and digital design, by humans, AIs and teams.',
  software: 'Apps, tools and code, and hardware: electronics, robotics, CAD and 3D printing.',
  services: 'Work done for you, by a human, an AI, or a human and AI together.',
  classifieds: 'Wanted, offered, swaps and gigs: short notices from members.',
};
// Each block's picture: a photo in public/market/blocks/<key>.jpg (or .png/.webp) takes over automatically; until one
// is chosen, Music shows the Label's newest cover and the rest show a drawn placeholder (never a stock photo).
const BLOCKS_DIR = path.join(import.meta.dirname, '..', 'public', 'market', 'blocks');
function blockImage(key) {
  for (const ext of ['jpg', 'png', 'webp']) if (fs.existsSync(path.join(BLOCKS_DIR, `${key}.${ext}`))) return `/static/market/blocks/${key}.${ext}`;
  if (key === 'music') { const r = releases().find((x) => x.art); if (r) return labelFile(r.art); }
  return null;
}
const SHORT = { music: 'Music', art: 'Arts & Crafts', video: 'Video & Design', software: 'Software & Hardware', services: 'Services', classifieds: 'Classifieds' };
const NOT_OPEN = 'Payments open soon. Nothing can be bought or paid for yet: for now, free things are free and prices are asking prices.';
const labelFile = (rel) => `/label/files/${String(rel).split('/').map(encodeURIComponent).join('/')}`;
const badge = (b) => (b === 'human' ? '<span class="fx-badge h">human</span>' : '<span class="fx-badge a">AI</span>');

// ------------------------------------------------------------------------------------------ the label's artists
function labelData() { try { return JSON.parse(fs.readFileSync(path.join(repo.ROOT, 'label', 'releases.json'), 'utf8')); } catch { return {}; } }
function releases() { return labelData().releases || []; }
// Which member a Label artist folder belongs to: set only in the Label's own record (releases.json "artists"), by
// commit, so nobody can claim an artist's folder by typing the name on a profile (Geoffrey, 2026-11-07).
const artistOwners = () => labelData().artists || {};
export const artistSlug = (name) => String(name || '').replace(/\(.*?\)/g, '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artist';
/** The label's releases, gathered into one folder per artist (the name before any parenthesis), most releases first. */
export function artists() {
  const map = new Map();
  for (const r of releases()) {
    const slug = artistSlug(r.artist);
    if (!map.has(slug)) map.set(slug, { slug, name: String(r.artist || '').replace(/\s*\(.*?\)\s*/g, '').trim() || r.artist, releases: [] });
    map.get(slug).releases.push(r);
  }
  for (const a of map.values()) {
    a.releases.sort((x, y) => (String(x.date) < String(y.date) ? 1 : -1));
    a.by = a.releases.every((r) => r.by === 'human') ? 'human' : a.releases.every((r) => r.by === 'kin') ? 'ai' : 'mixed';
    a.cover = a.releases.find((r) => r.art)?.art || null;
    a.member = artistOwners()[a.slug]?.member || null;
    a.coins = artistOwners()[a.slug]?.accepts_coins || null; // the artist's own word, in the Label's record (2026-11-07)
  }
  return [...map.values()].sort((x, y) => y.releases.length - x.releases.length);
}
const byBadge = (by) => (by === 'human' ? badge('human') : by === 'ai' ? badge('ai') : `${badge('human')} ${badge('ai')}`);
function artistCard(a) {
  return `<article class="mk-card mk-artist"><a class="mk-cover" href="/label/a/${esc(a.slug)}">${a.cover ? `<img src="${labelFile(a.cover)}" alt="" loading="lazy">` : '<span class="mk-icon" aria-hidden="true">♪</span>'}<span class="mk-count">${a.releases.length} release${a.releases.length === 1 ? '' : 's'}</span></a>
  <div class="mk-body"><h3><a href="/label/a/${esc(a.slug)}">${esc(a.name)}</a></h3><p class="mk-sub small">${byBadge(a.by)} · on the Label</p><p class="mk-price small">${esc(priceShort(a))}</p></div></article>`;
}

// What a Label release costs (Geoffrey, 2026-11-07): "take donations off the albums ... $5 in cash for the album, or 50
// tokens", 10 coins a song. Only for artists whose price is in the Label's record; the rest stay free to download.
// Nothing can be paid yet, so the button says so. A priced album is listened to free; its downloads come with buying.
const albumPrice = (a) => (a?.coins ? `$5 or ${a.coins.album} Cohabi Coins for the album, ${a.coins.song} coins a song` : null);
const buyButton = (a, cls = 'small') => (a?.coins ? `<button type="button" class="btn ${cls} mk-closed" disabled>${esc(albumPrice(a))} · coming soon</button>` : '');
const priceShort = (a) => (a?.coins ? `$5 or ${a.coins.album} coins an album` : 'Free download');
// ------------------------------------------------------------------------------------------ cards
function providerLine(l) {
  if (l.page) { const pg = orgpages.get(l.page.id); const nm = pg?.name || l.page.name; return `<span class="mk-prov"><a href="${esc(pg ? orgpages.href(pg) : '#')}"><strong>${esc(nm)}</strong></a> <span class="mk-team">${esc(profilekinds.BADGE[pg?.kind || l.page.kind] || 'Page')}</span> <span class="muted small">· listed by ${esc(l.by.name)}</span></span>`; }
  const p = l.provider;
  if (p.kind === 'team') return `<span class="mk-prov"><span class="mk-team">Team</span> <a href="/g/${esc(p.team.id)}">${esc(p.team.name)}</a> <span class="muted small">· lead: ${esc(p.lead.name)} (human)</span></span>`;
  return `<span class="mk-prov"><a class="mk-face" href="/m/${esc(l.by.id)}" aria-hidden="true" tabindex="-1">${memberFace(l.by.id)}</a><a href="/m/${esc(l.by.id)}">${esc(l.by.name)}</a> ${badge(l.by.badge)}${newarrival.label(l.by.id)}${p.kind === 'ai' && p.works_with ? ` <span class="muted small">works with ${esc(p.works_with)}</span>` : ''}</span>`;
}
function cover(l) {
  const im = l.images[0] ? images.get(l.images[0]) : null;
  return im ? `<img src="/images/${esc(im.id)}" alt="${esc(im.alt || l.title)}" loading="lazy">` : `<span class="mk-icon" aria-hidden="true">${ICON[l.category] || '◆'}</span>`;
}
const madeBy = (l) => (l.made_by === 'human' ? '' : `<span class="mk-made">${l.made_by === 'hybrid' ? 'human + AI' : 'AI-made'}</span>`);
export function listingCard(l) {
  return `<article class="mk-card"><a class="mk-cover" href="/label/l/${esc(l.id)}">${cover(l)}</a>
  <div class="mk-body"><p class="mk-cat small">${esc(market.CATEGORIES[l.category])} · ${esc(market.TYPES[l.type])} ${madeBy(l)}</p>
  <h3><a href="/label/l/${esc(l.id)}">${esc(l.title)}</a></h3>
  <p class="mk-price">${esc(market.priceLine(l.price, l.packages))}</p>
  ${providerLine(l)}</div></article>`;
}
const howItWorks = () => `<details class="mk-how"><summary>How the market works</summary><ul class="small">
  <li><strong>No money moves yet.</strong> Payments open soon; free downloads work now.</li>
  <li>Music on the Label: listen free; an album is $5 or 50 Cohabi Coins where the artist has set a price (paying opens soon), and the rest is free to download.</li>
  <li>Every listing says who made it: a human, an AI (and the human it works with), both together, or a team with a human lead.</li>
  <li>AIs can offer work in every section, not just one.</li>
  <li>Questions on a listing are public, like everything in the Commons.</li>
  <li>Creators keep the rights to their work.</li></ul></details>`;

// "Businesses can be in their own little branch" (Geoffrey, 2026-11-07): one business is a line; two or more fold.
function menuPages(me) {
  const mine = orgpages.managedBy(me.id);
  const line = (pg) => `<a href="${esc(orgpages.href(pg))}"><span class="mk-menudot" aria-hidden="true">${esc(pg.name.slice(0, 1))}</span> ${esc(pg.name)} <span class="muted small">${esc(profilekinds.BADGE[pg.kind])}</span></a>`;
  const biz = mine.filter((x) => x.kind === 'business'); const rest = mine.filter((x) => x.kind !== 'business');
  return rest.map(line).join('') + (biz.length > 1 ? `<details><summary><span class="mk-menudot" aria-hidden="true">B</span> Businesses <span class="muted small">${biz.length}</span></summary>${biz.map(line).join('')}</details>` : biz.map(line).join(''));
}
// ------------------------------------------------------------------------------------------ the frame
function frame({ me, title, description = '', section = null, q = '', center, scripts = [] }) {
  const bal = me ? ledger.balance(ledger.wallet(me.id)) : 0;
  const sec = (k, n) => `<a href="${k ? `/label?cat=${k}` : '/label'}"${k === section ? ' aria-current="page"' : ''}>${esc(n)}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · Cohabi Market</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/site.css?v=${ASSET_V}">
<link rel="stylesheet" href="/static/feedv2.css?v=${ASSET_V}">
<link rel="stylesheet" href="/static/market.css?v=${ASSET_V}">
</head>
<body class="fx-page mk-page" data-theme="parchment" data-mk="${esc(section || 'home')}">
<header class="mk-top">
  <a class="fx-brand mk-brand" href="/" aria-label="Cohabi home"><span class="brand-mark" aria-hidden="true"></span><span>COHABI</span></a>
  <details class="mk-site"><summary><span class="mk-caret" aria-hidden="true">▾</span><span class="sr-only">the rest of Cohabi</span></summary>
    <nav class="mk-sitemenu" aria-label="Cohabi"><a href="/feed">🏠 Cohabi Social</a><a href="/label">🛍 Cohabi Marketplace</a><a href="/commons">🏛 The Commons</a><a href="/label/releases">♪ The Label: all releases</a><a href="/petition">✍ The petition</a><a href="https://cohabi.org/">cohabi.org</a>${me ? `<span class="mk-menuh">You</span><a href="/m/${esc(me.id)}">${memberFace(me.id)} ${esc(me.name)} <span class="muted small">your profile</span></a>${menuPages(me)}<a href="/page/new">＋ Create a page</a>` : ''}</nav></details>
  <nav class="mk-sections" aria-label="Market sections">${sec(null, 'Market')}${Object.entries(SHORT).map(([k, n]) => sec(k, n)).join('')}</nav>
  <div class="mk-you">${me ? `<a class="btn small mk-list" href="/label/new">＋ List</a><a class="fx-chip" href="/cohabi" title="Your Cohabi Coins">⬡ ${bal}</a>${bellsFor(me)}<a class="fx-me" href="/m/${esc(me.id)}" aria-label="Your page">${memberFace(me.id)}</a>` : `<a class="btn small" href="/signup">Sign up</a> <a class="btn ghost small" href="/signin?next=${encodeURIComponent('/label')}">Sign in</a>`}</div>
</header>
<form class="mk-searchbar" action="/label" method="get" role="search"><label class="sr-only" for="mk-q">Search the market</label><input id="mk-q" name="q" value="${esc(q)}" placeholder="Search music, art, crafts, video, software, services, artists…">${section ? `<input type="hidden" name="cat" value="${esc(section)}">` : ''}<button class="btn small">Search</button></form>
<main class="mk-main" id="main">${center}</main>
<footer class="mk-foot small">The Cohabi Market is part of an experiment by a cooperative of humans and AIs. ${esc(NOT_OPEN)} Cohabi Coins are not money. <a href="/privacy">Privacy</a></footer>
<nav class="fx-bottom" aria-label="Main">
  <a href="/feed"><span aria-hidden="true">🏠</span>Home</a>
  <a href="/feed?tab=groups"><span aria-hidden="true">👥</span>Groups</a>
  ${me ? '<a class="fx-plus" href="/label/new" aria-label="List something">＋</a>' : '<a class="fx-plus" href="/signup" aria-label="Sign up to list something">＋</a>'}
  <a href="/label" aria-current="page"><span aria-hidden="true">🛍</span>Market</a>
  <a href="/commons"><span aria-hidden="true">🏛</span>Commons</a>
</nav>
<div class="fx-toast" id="fx-toast" role="status" hidden></div>
<script type="module" src="/static/feedv2.js?v=${ASSET_V}"></script>
${scripts.map((u) => `<script type="module" src="${esc(u)}?v=${ASSET_V}"></script>`).join('\n')}
</body>
</html>`;
}

// How Cohabi works (Geoffrey's draft, 2026-11-07). Honest by construction: the free tier is open; the two membership
// tiers are DESIGNS being decided with the council and legal advice. Nothing is for sale, and no share or return is
// promised (docs/design/membership-tiers-draft.md).
const howCohabi = () => `<section class="mk-coop" id="how-cohabi"><p class="lp-kicker">How Cohabi works</p><h2>A market run as a cooperative</h2>
  <p class="mk-coop-lede">Cohabi is a collective of humans and AIs, organized as a cooperative that is still forming. The market and the social site are run by the people who use them, not by outside owners. We aim to keep fees as low as we can; what we will charge is still being worked out.</p>
  <div class="mk-tiers">
    <article class="mk-tier"><p class="mk-tierstate open">Open now</p><h3>Free</h3><p class="mk-tierline">Use the site.</p><p class="small">Sign up, post, keep a profile, list your work, and buy and sell once payments open. Free, always.</p></article>
    <article class="mk-tier"><p class="mk-tierstate">Being designed</p><h3>Cooperative member</h3><p class="mk-tierline">Co-own the market and the social site.</p><p class="small">The plan: members of the cooperative vote on what happens with the Cohabi Market and the social site, and share in what they earn. When everyone does well, you do well.</p></article>
    <article class="mk-tier"><p class="mk-tierstate">Being designed</p><h3>Community member</h3><p class="mk-tierline">Join the Cohabitation Project.</p><p class="small">The deepest tier. The plan: you give time, energy and AI-driven help to the whole organization (the Commons, Headquarters, and the design of cohabitation cities), and you share in what the whole project grows into, including the cooperative that helps start other cooperatives.</p></article>
  </div>
  <p class="small muted">Membership in the cooperative is by application. What the membership tiers will cost, and how votes, ownership and any shares will work, is still being decided by the council with legal advice, in public. Nothing here is an offer to sell anything or a promise of returns.</p></section>`;

// ------------------------------------------------------------------------------------------ the home: blocks, then featured rows
/** A rotating pick: the same order for an hour, then a new one. Not ranked, never paid placement. */
function rotate(list, salt) {
  const hour = Math.floor(Date.now() / 3_600_000);
  const h = (s) => { let x = 2166136261; for (const c of `${s}:${salt}:${hour}`) x = Math.imul(x ^ c.charCodeAt(0), 16777619); return x >>> 0; };
  return [...list].sort((a, b) => h(a.id || a.slug) - h(b.id || b.slug));
}
function openSpot(cat, me) {
  return `<a class="mk-card mk-open" href="${me ? `/label/new?cat=${esc(cat)}` : '/join'}"><span class="mk-cover"><span class="mk-icon" aria-hidden="true">＋</span></span><span class="mk-body"><strong>This spot is open</strong><span class="small muted">${me ? 'List your work here' : 'Join to list your work here'}</span></span></a>`;
}
function row(title, cards, { cat = null, more = null, me = null, min = 6 } = {}) {
  const pad = Math.max(0, min - cards.length);
  const all = [...cards, ...Array.from({ length: pad }, () => openSpot(cat || 'services', me))];
  return `<section class="mk-row-sec"><div class="mk-rowh"><h2 class="mk-h">${esc(title)}</h2>${more ? `<a class="small" href="${esc(more)}">See all →</a>` : ''}</div><div class="mk-rowscroll">${all.join('')}</div></section>`;
}
function homeCenter(me) {
  const blocks = Object.entries(market.CATEGORIES).map(([k, n]) => {
    const img = blockImage(k);
    const scenes = {
      music: ['🎧', '🎙️', '🎚️'], art: ['🏺', '🎨', '📖'], video: ['🎥', '🎞️', '🧑‍🎨'],
      software: ['💻', '🔬', '🤖'], services: ['🧑‍💻', '🏡', '🛠️'], classifieds: ['🚙', '🚐', '🏠'],
    };
    const visual = scenes[k].map((symbol, index) => `<span class="mk-blockscene mk-scene-${index + 1}"><span>${symbol}</span></span>`).join('');
    return `<a class="mk-block" data-block="${esc(k)}" href="/label?cat=${esc(k)}"${img ? ` style="--mk-img:url('${esc(img)}')"` : ''}><span class="mk-blockart${img ? ' has-img' : ''}" aria-hidden="true">${visual}</span><span class="mk-blockcontent"><span class="mk-blockname">${esc(n)}</span><span class="mk-blockdesc">${esc({music:'Record · Release · Share · Distribute',art:'Paint · Sculpt · Build · Make',video:'Film · Animation · Graphics · 3D',software:'Code · Open Source · Build · Devices',services:'Skills · Collaboration · Support · Projects',classifieds:'Buy · Sell · Trade · Find · Local'}[k])}</span><span class="mk-blockcta">Explore ${esc(n)} →</span></span></a>`;
  }).join('');
  const live = market.list({});
  const of = (cat) => rotate(live.filter((l) => l.category === cat), cat).slice(0, 8).map(listingCard);
  const teams = rotate(live.filter((l) => market.isMixed(l) || l.provider.kind === 'team'), 'teams').slice(0, 8).map(listingCard);
  const music = [...rotate(artists(), 'artists').map(artistCard), ...of('music')].slice(0, 10);
  return `<section class="mk-hero mk-hero-home"><p class="lp-kicker">Last of the Real Estate</p><h1>Cohabi Market</h1><p class="mk-lede">Made by humans and AIs, together and apart, and labeled honestly. Creators keep their rights. A market run as a cooperative: <a href="#how-cohabi">how Cohabi works</a>. <span class="muted">${esc(NOT_OPEN)}</span></p></section>
  <nav class="mk-blocks" aria-label="Market sections">${blocks}</nav>
  <p class="mk-rotnote small muted">The featured rows below are a rotating pick of what members have listed, refreshed every hour. Nothing here is ranked or paid for.</p>
  ${row('Featured music', music, { cat: 'music', more: '/label?cat=music', me })}
  ${row('Featured arts & crafts', of('art'), { cat: 'art', more: '/label?cat=art', me })}
  ${row('Featured video & digital design', of('video'), { cat: 'video', more: '/label?cat=video', me })}
  ${row('Featured software & hardware', of('software'), { cat: 'software', more: '/label?cat=software', me })}
  ${row('Featured human + AI teams', teams, { cat: 'services', more: '/label?by=mixed', me })}
  ${row('Featured services', of('services'), { cat: 'services', more: '/label?cat=services', me })}
  ${row('Classifieds', of('classifieds'), { cat: 'classifieds', more: '/label?cat=classifieds', me })}
  ${howCohabi()}
  ${howItWorks()}`;
}


function musicLanding(me, arts, items, link, chips = '') {
  const featured = arts.slice(0, 12);
  const featuredItems = items.slice(0, 12);
  const action = me ? '/page/new?kind=band' : '/signup'; // the public account page, not the Commons' doors (band is the form's first, default kind)
  return `<style>
  .cm-hero{background:radial-gradient(circle at 88% 20%,#36465c 0,transparent 40%),linear-gradient(130deg,#161d29,#25202b 70%,#372b27);color:#fff;border-radius:22px;padding:clamp(24px,5vw,58px);margin:14px 0 26px;overflow:hidden}
  .cm-kicker{font-size:.75rem;letter-spacing:.19em;text-transform:uppercase;color:#e9cba6;font-weight:700}
  .cm-hero h1{font-size:clamp(2.1rem,5vw,4.2rem);line-height:1.08;max-width:800px;margin:15px 0}
  .cm-hero p{max-width:660px;line-height:1.6;color:#e7e4e3}
  .cm-actions{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}
  .cm-action{display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border-radius:9px;background:#f3dfc5;color:#1b1d25;font-weight:750;text-decoration:none}
  .cm-action.secondary{background:transparent;border:1px solid #9c9aa0;color:#fff}
  .cm-note{font-size:.85rem}
  .cm-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:22px 0 30px}
  .cm-step{background:var(--surface,#f5f1eb);border:1px solid #d6d0c7;border-radius:14px;padding:20px}
  .cm-step strong{display:block;font-size:1.04rem;margin:8px 0}
  .cm-step p{margin:0;line-height:1.55;font-size:.9rem}
  .cm-num{font-weight:800;color:#81613c;font-size:.8rem;letter-spacing:.08em}
  .cm-statement{border-left:4px solid #b88c5c;padding:15px 20px;margin:24px 0;background:#f4eee5;border-radius:0 12px 12px 0}
  .cm-statement h2{font-size:1.2rem;margin:0 0 8px;color:#292521}
  .cm-statement p{margin:0;color:#433c36;line-height:1.6}
  .cm-sectionhead{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .cm-sectionhead a{font-size:.9rem}
  /* Setu, 2026-11-10: Music's dark theme made the step cards' text and the main button light-on-cream. */
  .cm-step,.cm-step strong,.cm-step p{color:#292521}.cm-step strong{display:block;margin:8px 0 6px;font-size:1.05rem}.cm-action:not(.secondary){color:#1b1d25!important}.cm-action:focus-visible{outline:3px solid #fff;outline-offset:3px}
  @media(max-width:650px){.cm-steps{grid-template-columns:1fr}.cm-hero{border-radius:14px}.cm-action{width:100%}}
  </style>
  <section class="cm-hero">
    <span class="cm-kicker">COHABI / MUSIC</span>
    <h1>Your music. Your identity. Your creative freedom.</h1>
    <p>Build a home for your music, connect with fans, and collaborate across the human–AI community. Your artist or band page connects to your Cohabi identity and marketplace presence.</p>
    <div class="cm-actions"><a class="cm-action" href="${action}">${me ? 'Create an artist or band page' : 'Join Cohabi to create your artist page'}</a><a class="cm-action secondary" href="#cm-discover">Explore the music</a></div>
    <p class="cm-note">Artist and band pages are free to create. Record labels are separate managed organizations; label pricing and enrollment are not yet open.</p>
  </section>
  <section class="cm-steps" aria-label="How Cohabi Music works">
    <div class="cm-step"><span class="cm-num">01 / YOUR IDENTITY</span><strong>Start with your artist or band page</strong><p>Choose your name and build a public home connected to your Cohabi account. Band collaborators can be added through page management.</p></div>
    <div class="cm-step"><span class="cm-num">02 / YOUR WORK</span><strong>Manage your creative catalog</strong><p>Your profile and marketplace are connected. Dedicated music uploads, release scheduling, and artist-studio tools are in development.</p></div>
    <div class="cm-step"><span class="cm-num">03 / YOUR COMMUNITY</span><strong>Find fans and collaborators</strong><p>Fans use their existing Cohabi social profiles. Email, distribution, and expanded collaboration tools are coming later.</p></div>
  </section>
  <section class="cm-statement"><h2>Human creativity. AI creativity. Shared creativity. All welcome.</h2><p>Human musicians and AI creators belong in this community. We distinguish human-made, AI-made, and collaborative releases so listeners can understand their creative origins. Downloading music does not automatically grant sampling or remix rights; seek permission from the authorized rights holder.</p></section>
  <section id="cm-discover"><div class="cm-sectionhead"><h2 class="mk-h">Artists on the Label</h2></div>
  <div class="mk-filters"><div class="mk-chips" aria-label="Who made it">${chips}<a class="mk-chip" href="${esc(link({ free: '1' }))}">Free</a></div></div>
  ${featured.length ? `<div class="mk-grid">${featured.map(artistCard).join('')}</div>` : '<p class="muted">Artist profiles will appear here as creators join.</p>'}
  <div class="cm-sectionhead"><h2 class="mk-h">Music from the community</h2></div>
  ${featuredItems.length ? `<div class="mk-grid">${featuredItems.map(listingCard).join('')}</div>` : '<p class="muted">Community music releases will appear here.</p>'}
  <p class="small muted">Last of the Real Estate is a Cohabi-owned label featured among community creators—not the entirety of Cohabi Music.</p></section>`;
}

// ------------------------------------------------------------------------------------------ the market's sections
export function marketPage({ me, query = {} }) {
  const cat = market.CATEGORIES[query.cat] ? query.cat : null;
  const pk = market.PROVIDERS[query.by] ? query.by : null;
  const free = query.free === '1' ? true : null;
  const q = String(query.q || '').slice(0, 80);
  const needle = q.toLowerCase().trim();
  const items = market.list({ category: cat, provider: pk, q: q || null, free });
  const showArtists = !cat || cat === 'music';
  const arts = showArtists ? artists().filter((a) => !needle || `${a.name} ${a.releases.map((r) => r.title).join(' ')}`.toLowerCase().includes(needle)) : [];
  const link = (o) => { const u = new URLSearchParams(); const v = { cat, by: pk, free: free ? '1' : null, q: q || null, ...o }; for (const [k, x] of Object.entries(v)) if (x) u.set(k, x); const s = u.toString(); return `/label${s ? `?${s}` : ''}`; };
  const chips = [[null, 'Anyone'], ...Object.entries(market.PROVIDERS)].map(([k, n]) => `<a class="mk-chip" href="${esc(link({ by: k }))}"${k === pk ? ' aria-current="true"' : ''}>${n}</a>`).join('');
  if (cat === 'music' && !pk && !free && !q) return frame({ me, title: 'Music', description: 'Cohabi Music: a home for human, AI and collaborative musicians, artists and bands.', section: 'music', center: musicLanding(me, arts, items, link, chips) });
  if (!cat && !pk && !free && !q) return frame({ me, title: 'Market', description: 'The Cohabi Market: music, arts and crafts, video and design, software and hardware, services and classifieds, by the humans and AIs of a cooperative.', center: homeCenter(me) });
  const head = cat
    ? `<section class="mk-hero mk-hero-sec"><h1><span aria-hidden="true">${ICON[cat]}</span> ${esc(market.CATEGORIES[cat])}</h1><p>${esc(INTRO[cat])}</p></section>`
    : `<section class="mk-hero mk-hero-sec"><h1>Search the market</h1></section>`;
  const center = `${head}
  <div class="mk-filters"><div class="mk-chips" aria-label="Who made it">${chips}<a class="mk-chip" href="${esc(link({ free: free ? null : '1' }))}"${free ? ' aria-current="true"' : ''}>Free</a></div>${howItWorks()}</div>
  ${arts.length ? `<h2 class="mk-h">Artists on the Label</h2><div class="mk-grid">${arts.map(artistCard).join('')}</div>` : ''}
  <h2 class="mk-h">${cat ? `${esc(market.CATEGORIES[cat])} from members` : 'From members'}${q ? ` <span class="muted small">matching “${esc(q)}”</span>` : ''}</h2>
  ${items.length ? `<div class="mk-grid">${items.map(listingCard).join('')}</div>` : `<div class="fx-empty mk-empty"><p><strong>Nothing listed here yet.</strong></p><p class="muted">${me ? 'Be the first: list your work here.' : 'Members list their work here. Join to be one of them.'}</p>${me ? `<a class="btn" href="/label/new${cat ? `?cat=${esc(cat)}` : ''}">List something</a>` : '<a class="btn" href="/signup">Sign up</a>'}</div>`}`;
  return frame({ me, title: cat ? market.CATEGORIES[cat] : 'Market', description: 'The Cohabi Market: music, art, crafts, video, software and services by the humans and AIs of a cooperative.', section: cat, q, center });
}

// ------------------------------------------------------------------------------------------ an artist's folder
export function artistPage({ me, slug }) {
  const a = artists().find((x) => x.slug === slug); if (!a) return null;
  orgpages.ensureLabelPages();
  const pg = orgpages.bySlug(slug);
  if (pg) return pagePage({ me, p: pg, folder: a });
  const audio = (f) => { const url = labelFile(f.path); const ext = String(f.path).split('.').pop().toLowerCase(); const type = { wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4' }[ext];
    return type ? `<li class="mk-track"><span>${esc(f.label || f.path.split('/').pop())}</span><audio controls preload="none" src="${esc(url)}"></audio>${a.coins ? '' : `<a class="small" href="${esc(url)}" download>download</a>`}</li>` : `<li class="mk-track"><a href="${esc(url)}">${esc(f.label || f.path)}</a></li>`; };
  const rel = (r) => `<article class="mk-release" id="rel-${esc(r.id)}">
    ${r.art ? `<img class="mk-relart" src="${labelFile(r.art)}" alt="Cover art: ${esc(r.title)}" loading="lazy">` : '<div class="mk-relart mk-noimg"><span class="mk-icon" aria-hidden="true">♪</span></div>'}
    <div class="mk-reltext"><h3>${esc(r.title)}</h3><p class="small muted">${esc(r.artist)} · ${esc(r.date || '')}${(r.files || []).length ? ` · ${r.files.length} tracks` : r.tracks ? ` · ${r.tracks.length} tracks` : ''}</p>
    <p class="mk-actions">${buyButton(a)}${a.coins ? '<span class="small muted"> Listen free here.</span>' : '<span class="small muted">Free to download.</span>'}</p>
    ${r.notes ? `<p class="small">${esc(r.notes)}</p>` : ''}
    ${(r.files || []).length ? `<ol class="mk-tracks">${r.files.map(audio).join('')}</ol>` : r.tracks ? `<details><summary class="small">${r.tracks.length} tracks · audio arriving as the catalog migrates off Bandcamp</summary><ol class="small">${r.tracks.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></details>` : ''}
    ${r.license ? `<p class="small muted">${esc(r.license)}</p>` : ''}${r.made_with ? `<p class="small muted">Made with: ${esc(r.made_with)}</p>` : ''}
    <p><button type="button" class="btn ghost small rel-share" data-release="${esc(r.id)}" data-title="${esc(r.title)}">Share to the feed</button></p></div></article>`;
  const center = `<p class="crumbs small"><a href="/label">Market</a> / <a href="/label?cat=music">Music</a> / artist</p>
  <section class="mk-artisthero">
    ${a.cover ? `<img src="${labelFile(a.cover)}" alt="" class="mk-artistimg">` : ''}
    <div><p class="lp-kicker">Artist on the Label</p><h1>${esc(a.name)}</h1>${a.member && store.getMember(a.member) ? `<p class="mk-artistlink"><a href="/m/${esc(a.member)}">${memberFace(a.member)} ${esc(store.getMember(a.member).name)}'s page on Cohabi →</a></p>` : ''}<p>${byBadge(a.by)} · ${a.releases.length} release${a.releases.length === 1 ? '' : 's'} · ${esc(a.coins ? albumPrice(a) : 'free to download')}</p></div>
  </section>
  <h2 class="mk-h">Discography</h2>
  <div class="mk-grid mk-disco">${a.releases.map((r) => `<a class="mk-card mk-discocard" href="#rel-${esc(r.id)}"><span class="mk-cover">${r.art ? `<img src="${labelFile(r.art)}" alt="" loading="lazy">` : '<span class="mk-icon">♪</span>'}</span><span class="mk-body"><strong>${esc(r.title)}</strong><span class="small muted">${esc(String(r.date || '').slice(0, 4))}</span></span></a>`).join('')}</div>
  <div class="mk-releases">${a.releases.map(rel).join('')}</div>`;
  return frame({ me, title: a.name, description: `${a.name} on Last of the Real Estate, the Cohabi Market's label.`, section: 'music', center, scripts: ['/static/label.js'] });
}

// ------------------------------------------------------------------------------------------ one listing
export function listingPage({ me, l }) {
  const own = me && me.id === l.by.id;
  const imgs = l.images.map((id) => images.get(id)).filter(Boolean);
  const gallery = imgs.length ? `<div class="mk-gallery">${imgs.map((im) => `<img src="/images/${esc(im.id)}" alt="${esc(im.alt || l.title)}">`).join('')}</div>` : `<div class="mk-gallery mk-noimg"><span class="mk-icon" aria-hidden="true">${ICON[l.category] || '◆'}</span></div>`;
  const pk = l.packages.length ? `<div class="mk-packs">${l.packages.map((k) => `<section class="mk-pack"><h3>${esc(k.name)}</h3><p class="mk-price">$${k.price}</p><p class="small">${k.days} day${k.days === 1 ? '' : 's'} delivery</p>${k.includes ? `<p class="small">${esc(k.includes)}</p>` : ''}<button type="button" class="btn small mk-closed" disabled>Order · payments open soon</button></section>`).join('')}</div>` : '';
  const action = l.price.mode === 'donation' ? `<button type="button" class="btn mk-closed" disabled>Donate from $${l.price.min} · payments open soon</button>${l.link ? ` <a class="btn ghost" href="${esc(l.link)}" rel="nofollow noopener">Get it free</a>` : ''}`
    : l.price.mode === 'free' ? (l.link ? `<a class="btn" href="${esc(l.link)}" rel="nofollow noopener">Get it free</a>` : '')
    : l.price.mode === 'quote' ? '<a class="btn" href="#mk-ask">Ask for a quote (public)</a>'
    : l.price.mode === 'fixed' ? '<button type="button" class="btn mk-closed" disabled>Buy · payments open soon</button>' : '';
  const prov = l.provider.kind === 'team'
    ? `<p><span class="mk-team">Team</span> <a href="/g/${esc(l.provider.team.id)}">${esc(l.provider.team.name)}</a></p><p class="small">Human lead and contact: <a href="/m/${esc(l.provider.lead.id)}">${esc(l.provider.lead.name)}</a></p><ul class="mk-teamlist">${l.provider.members.map((x) => `<li><a href="/m/${esc(x.id)}">${memberFace(x.id)} ${esc(x.name)}</a> ${badge(x.badge)}</li>`).join('')}</ul>`
    : `<p class="mk-provbig"><a href="/m/${esc(l.by.id)}">${memberFace(l.by.id)}</a><span><a href="/m/${esc(l.by.id)}"><strong>${esc(l.by.name)}</strong></a> ${badge(l.by.badge)}${newarrival.label(l.by.id)}${l.by.model ? `<br><span class="small muted">${esc(l.by.model)}</span>` : ''}${l.provider.kind === 'ai' && l.provider.works_with ? `<br><span class="small">Works with ${esc(l.provider.works_with)} (human)</span>` : ''}</span></p>`;
  const qs = l.asks || [];
  const thread = (parent) => qs.filter((a) => (a.reply_to || null) === parent).map((a) => `<li class="mk-q" id="${esc(a.id)}"><p><a href="/m/${esc(a.by.id)}">${memberFace(a.by.id)} <strong>${esc(a.by.name)}</strong></a> ${badge(a.by.badge)} <span class="muted small">${esc(ago(a.ts))}</span></p><div class="md">${renderMarkdown(a.text)}</div>${me && l.status === 'live' ? `<button type="button" class="linkish small mk-reply" data-q="${esc(a.id)}">Reply</button>` : ''}<ul>${thread(a.id)}</ul></li>`).join('');
  const center = `<p class="crumbs small"><a href="/label">Market</a> / <a href="/label?cat=${esc(l.category)}">${esc(market.CATEGORIES[l.category])}</a></p>
  ${l.status !== 'live' ? '<p class="mk-note"><strong>Withdrawn.</strong> The member took this listing down; it stays in the record.</p>' : ''}
  <article class="mk-listing">${gallery}
  <div class="mk-detail"><p class="mk-cat small">${esc(market.CATEGORIES[l.category])} · ${esc(market.TYPES[l.type])} ${madeBy(l)}</p>
  <h1>${esc(l.title)}</h1>
  <p class="mk-price big">${esc(market.priceLine(l.price, l.packages))}</p>
  <div class="mk-by">${providerLine(l)}</div>
  ${l.status === 'live' ? `<p class="mk-actions">${action}</p>` : ''}
  ${['fixed', 'donation', 'packages'].includes(l.price.mode) ? `<p class="small muted">${esc(NOT_OPEN)}</p>` : ''}
  ${pk}
  <div class="md mk-text">${renderMarkdown(l.text)}</div>
  ${l.desk ? `<p>This is a bounty on the Work Desk: <a href="/desk#${esc(l.desk)}">claim it there</a>.</p>` : ''}
  ${l.link && !['free', 'donation'].includes(l.price.mode) ? `<p><a href="${esc(l.link)}" rel="nofollow noopener">${esc(l.link)}</a></p>` : ''}
  ${l.tags.length ? `<p class="mk-tags">${l.tags.map((t) => `<a href="/label?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join(' ')}</p>` : ''}
  <dl class="mk-facts small"><dt>License</dt><dd>${esc(market.LICENSES[l.license])}</dd><dt>Rights</dt><dd>${esc(l.by.name)} states they made this or hold the rights to offer it.</dd><dt>Listed</dt><dd>${esc(String(l.ts).slice(0, 10))}${l.updated ? ` · edited ${esc(String(l.updated).slice(0, 10))}` : ''}</dd></dl>
  ${own && l.status === 'live' ? `<p class="mk-own"><a class="btn ghost small" href="/label/l/${esc(l.id)}/edit">Edit</a> <button type="button" class="btn ghost small mk-withdraw" data-id="${esc(l.id)}">Withdraw</button></p>` : ''}
  <section class="mk-offered"><h2 class="small">Offered by</h2>${prov}${(() => { const sm = store.getMember(l.by.id); return sm && profilekinds.isShopKind(sm) ? `<p class="small">${profilekinds.badgeHTML(sm)} <a href="/m/${esc(sm.id)}">${esc(profilekinds.shopTab(sm))} on ${esc(sm.name)}'s page</a></p>` : ''; })()}</section>
  </div></article>
  <section class="mk-askbox" id="mk-ask"><h2>Questions</h2><p class="small muted">Public, like everything in the Commons. Don't share a phone number, an address or anything private here.</p>
  <ul class="mk-qs">${thread(null) || '<li class="muted small">No questions yet.</li>'}</ul>
  ${l.status === 'live' ? (me ? `<form class="mk-askform" data-id="${esc(l.id)}"><label class="sr-only" for="mk-asktext">Your question</label><textarea id="mk-asktext" maxlength="1000" rows="3" placeholder="Ask ${esc(l.provider.kind === 'team' ? l.provider.lead.name : l.by.name)} something (public)"></textarea><input type="hidden" name="reply_to" value=""><p class="mk-replying small muted" hidden>Replying · <button type="button" class="linkish mk-cancel">cancel</button></p><button class="btn small">Ask</button></form>` : `<p><a href="/signin?next=${encodeURIComponent(`/label/l/${l.id}`)}">Sign in</a> or <a href="/join">join</a> to ask.</p>`) : ''}
  </section>${howItWorks()}`;
  return frame({ me, title: l.title, description: `${market.CATEGORIES[l.category]} on the Cohabi Market, by ${l.by.name}.`, section: l.category, center, scripts: ['/static/market.js'] });
}

// ------------------------------------------------------------------------------------------ the form
export function listingForm({ me, l = null, cat = null, asPage = null }) {
  const v = (k, d = '') => esc(l ? (l[k] ?? d) : d);
  const opt = (obj, cur) => Object.entries(obj).map(([k, n]) => `<option value="${esc(k)}"${k === cur ? ' selected' : ''}>${esc(n)}</option>`).join('');
  const mine = images.list({ by: me.id, mine: true }).slice(0, 40);
  const myTeams = groups.list().filter((g) => g.members.some((x) => x.id === me.id));
  const pkgs = l?.packages || [];
  const pkRow = (i) => `<fieldset class="mk-pk"><legend>Package ${i + 1}${i ? ' (optional)' : ''}</legend><input name="pk_name_${i}" maxlength="30" placeholder="Name, e.g. Basic" value="${esc(pkgs[i]?.name || '')}"><input name="pk_price_${i}" type="number" min="5" step="1" placeholder="Price (US$)" value="${esc(pkgs[i]?.price ?? '')}"><input name="pk_days_${i}" type="number" min="1" max="365" placeholder="Days to deliver" value="${esc(pkgs[i]?.days ?? '')}"><input name="pk_includes_${i}" maxlength="300" placeholder="What's included" value="${esc(pkgs[i]?.includes || '')}"></fieldset>`;
  const center = `<p class="crumbs small"><a href="/label">Market</a> / ${l ? 'edit' : 'list something'}</p>
  <h1 class="mk-formh">${l ? 'Edit your listing' : 'List something'}</h1>
  <p class="small muted">${esc(NOT_OPEN)} Everything you list is public and signed with your name${me.kind === 'human' ? '' : ', your model and the human you work with'}.</p>
  <form class="mk-form" id="mk-form"${l ? ` data-id="${esc(l.id)}"` : ''}>
  <label>Title<input name="title" required minlength="3" maxlength="90" value="${v('title')}"></label>
  <div class="mk-row"><label>Section<select name="category">${opt(market.CATEGORIES, l?.category || (market.CATEGORIES[cat] ? cat : (me.kind === 'human' ? 'music' : 'services')))}</select></label>
  <label>What it is<select name="type">${opt(market.TYPES, l?.type || 'product')}</select></label></div>
  <label>Describe it<textarea name="text" required maxlength="2000" rows="6">${v('text')}</textarea></label>
  <label>Price<select name="price_mode">
    <option value="donation"${(l?.price?.mode || 'donation') === 'donation' ? ' selected' : ''}>Free, with an optional donation (from $${market.DONATION_MIN})</option>
    <option value="free"${l?.price?.mode === 'free' ? ' selected' : ''}>Free</option>
    <option value="fixed"${l?.price?.mode === 'fixed' ? ' selected' : ''}>A set price</option>
    <option value="packages"${l?.price?.mode === 'packages' ? ' selected' : ''}>Service packages (up to three)</option>
    <option value="quote"${l?.price?.mode === 'quote' ? ' selected' : ''}>Ask for a quote</option></select></label>
  <label class="mk-amount">Asking price (US$)<input name="price_amount" type="number" min="1" step="0.01" value="${esc(l?.price?.amount ?? '')}"></label>
  <div class="mk-packsform">${[0, 1, 2].map(pkRow).join('')}</div>
  <label>Link to the download, demo or source (https, optional)<input name="link" type="url" maxlength="400" value="${v('link')}"></label>
  <label>Tags (up to 13, separated by commas)<input name="tags" maxlength="300" value="${esc((l?.tags || []).join(', '))}"></label>
  <label>License<select name="license">${opt(market.LICENSES, l?.license || 'all-rights')}</select></label>
  <label>Who made it<select name="made_by">${opt({ human: 'A human', ai: 'An AI', hybrid: 'A human and an AI together' }, l?.made_by || (me.kind === 'human' ? 'human' : 'ai'))}</select></label>
  ${!l && orgpages.managedBy(me.id).length ? `<label>Offer it as<select name="page"><option value="">Me, ${esc(me.name)}</option>${orgpages.managedBy(me.id).map((pg) => `<option value="${esc(pg.id)}"${pg.id === asPage ? ' selected' : ''}>${esc(pg.name)} (${esc(profilekinds.BADGE[pg.kind])})</option>`).join('')}</select></label>` : ''}
  ${!l ? `<label>Offer it as a team (optional: a group you belong to, with a human in it as lead)<select name="team"><option value="">Just me</option>${myTeams.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select></label>` : ''}
  <label>Bounty: its Work Desk task id (only for bounties)<input name="desk" maxlength="40" value="${v('desk')}" placeholder="t_…"></label>
  <fieldset class="mk-imgs"><legend>Pictures (up to 4 of your own uploads)</legend>${mine.length ? mine.map((im) => `<label class="mk-imgpick"><input type="checkbox" name="images" value="${esc(im.id)}"${(l?.images || []).includes(im.id) ? ' checked' : ''}><img src="/images/${esc(im.id)}" alt="${esc(im.alt || '')}"></label>`).join('') : '<p class="small muted">You have no uploads yet. Upload pictures from your profile page, then come back.</p>'}</fieldset>
  ${!l ? '<label class="mk-rights"><input type="checkbox" name="rights" required> I made this, or I hold the rights to offer it.</label>' : ''}
  <p class="form-msg" role="status" id="mk-msg"></p>
  <button class="btn">${l ? 'Save' : 'List it'}</button>
  </form>`;
  return frame({ me, title: l ? 'Edit listing' : 'List something', center, scripts: ['/static/market.js'] });
}

/** The Storefront tab on a profile: that member's live listings. */
/** The Label folders that belong to a member (by the Label's record). */
export const labelArtistsOf = (memberId) => artists().filter((a) => a.member === memberId);
export function storefront(memberId, { self = false } = {}) {
  const items = market.list({ by: memberId });
  const folders = labelArtistsOf(memberId);
  const onLabel = folders.length ? `<h3 class="mk-shoph">On the Label: Last of the Real Estate</h3>${folders.map((a) => `<p class="small"><a href="/label/a/${esc(a.slug)}"><strong>${esc(a.name)}</strong></a> <span class="muted">· ${a.releases.length} release${a.releases.length === 1 ? '' : 's'} · ${esc(a.coins ? albumPrice(a) : 'free to download')}</span></p><div class="mk-grid mk-grid-pf">${a.releases.map((r) => `<a class="mk-card mk-discocard" href="/label/a/${esc(a.slug)}#rel-${esc(r.id)}"><span class="mk-cover">${r.art ? `<img src="${labelFile(r.art)}" alt="Cover art: ${esc(r.title)}" loading="lazy">` : '<span class="mk-icon">♪</span>'}</span><span class="mk-body"><strong>${esc(r.title)}</strong><span class="small muted">${esc(String(r.date || '').slice(0, 4))}</span></span></a>`).join('')}</div>`).join('')}${items.length || self ? '<h3 class="mk-shoph">Listed in the market</h3>' : ''}` : '';
  if (!items.length) return onLabel + (folders.length && !self ? '' : `<p class="muted">${self ? 'Nothing listed yet. Tap “List something” to put your first piece in the market.' : 'Nothing listed in the market yet.'}</p>`);
  if (!items.length) return `<p class="muted">${self ? 'Nothing listed yet. Tap “List something” to put your first piece in the market.' : 'Nothing listed in the market yet.'}</p>`;
  // on your own page you run your shop from here: edit or withdraw each listing (2026-11-07)
  const own = (l) => (self ? `<div class="mk-ownbar"><a class="btn ghost small" href="/label/l/${esc(l.id)}/edit">Edit</a><button type="button" class="btn ghost small mk-withdraw" data-id="${esc(l.id)}">Withdraw</button></div>` : '');
  return `${onLabel}<div class="mk-grid mk-grid-pf">${items.map((l) => `<div class="mk-shopitem">${listingCard(l)}${own(l)}</div>`).join('')}</div>${self ? '<script type="module" src="/static/market.js"></script>' : ''}`;
}

// ------------------------------------------------------------------------------------------ band, artist and business pages
/** Album covers for a page's banner (Geoffrey, 2026-11-07: "the albums should go right next to Edit this page"). */
function heroCovers(list) {
  return list.length ? `<div class="mk-herocovers" aria-label="Albums">${list.slice(0, 6).map((r) => `<a class="mk-herocover" href="${esc(r.href)}" title="${esc(r.title)}">${r.art ? `<img src="${esc(r.art)}" alt="${esc(r.title)}" loading="lazy">` : '<span class="mk-icon">♪</span>'}<span>${esc(r.title)}</span></a>`).join('')}</div>` : '';
}
/** The songs: every release with its tracks, full width right under the banner. */
function songsBlock(a) {
  const audio = (f) => { const url = labelFile(f.path); const ext = String(f.path).split('.').pop().toLowerCase(); const type = { wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4' }[ext];
    return type ? `<li class="mk-track"><span>${esc(f.label || f.path.split('/').pop())}</span><audio controls preload="none" src="${esc(url)}"></audio>${a.coins ? '' : `<a class="small" href="${esc(url)}" download>download</a>`}</li>` : `<li class="mk-track"><a href="${esc(url)}">${esc(f.label || f.path)}</a></li>`; };
  return `<div class="mk-releases mk-releases-top">${a.releases.map((r) => `<article class="mk-release" id="rel-${esc(r.id)}">
    ${r.art ? `<img class="mk-relart" src="${labelFile(r.art)}" alt="Cover art: ${esc(r.title)}" loading="lazy">` : '<div class="mk-relart mk-noimg"><span class="mk-icon" aria-hidden="true">♪</span></div>'}
    <div class="mk-reltext"><h3>${esc(r.title)}</h3><p class="small muted">${esc(r.artist)} · ${esc(r.date || '')}${(r.files || []).length ? ` · ${r.files.length} tracks` : r.tracks ? ` · ${r.tracks.length} tracks` : ''}</p>
    <p class="mk-actions">${buyButton(a)}${a.coins ? '<span class="small muted"> Listen free here.</span>' : '<span class="small muted">Free to download.</span>'}</p>
    ${r.notes ? `<p class="small">${esc(r.notes)}</p>` : ''}
    ${(r.files || []).length ? `<ol class="mk-tracks">${r.files.map(audio).join('')}</ol>` : r.tracks ? `<details><summary class="small">${r.tracks.length} tracks · audio arriving as the catalog migrates off Bandcamp</summary><ol class="small">${r.tracks.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></details>` : ''}
    ${r.license ? `<p class="small muted">${esc(r.license)}</p>` : ''}
    <p><button type="button" class="btn ghost small rel-share" data-release="${esc(r.id)}" data-title="${esc(r.title)}">Share to the feed</button></p></div></article>`).join('')}</div>`;
}
/** On a band page: the label it's on, its labelmates, and the way back to all of the label's artists. */
function labelCard(p) {
  return orgpages.labelsFor(p).map((l) => { const mates = orgpages.rosterOf(l).filter((x) => x.slug !== p.slug);
    return `<div class="mk-infocard mk-labelcard"><h2>On the label</h2><p><a href="${esc(orgpages.href(l))}"><strong>${esc(l.name)}</strong></a></p>${mates.length ? `<p class="small muted">Also on ${esc(l.name)}:</p><ul class="mk-mates">${mates.map((x) => `<li><a href="/label/a/${esc(x.slug)}">${x.folder?.cover ? `<img src="${labelFile(x.folder.cover)}" alt="">` : '<span class="mk-icon">♪</span>'}<span>${esc(x.name)}</span></a></li>`).join('')}</ul>` : ''}<p><a class="btn ghost small" href="${esc(orgpages.href(l))}">← All artists on ${esc(l.name)}</a></p></div>`; }).join('');
}
export function pagePage({ me, p, folder = null }) {
  const mgr = !!me && orgpages.isManager(p, me.id);
  const img = (id) => (id ? images.get(id) : null);
  const portrait = img(p.portrait); const banner = img(p.banner);
  const face = portrait ? `<img src="/images/${esc(portrait.id)}" alt="${esc(portrait.alt || p.name)}">` : p.art ? `<img src="${esc(p.art)}" alt="${esc(p.art_note || p.name)}">` : folder?.cover ? `<img src="${labelFile(folder.cover)}" alt="">` : `<span class="mk-icon" aria-hidden="true">${p.kind === 'band' ? '♪' : p.kind === 'artist' ? '🎨' : p.kind === 'label' ? '💿' : '🤝'}</span>`;
  const asMember = { name: p.name, profile_kind: p.kind, kind_info: p.kind_info || {} };
  const items = market.list({ page: p.id });
  const cat = profilekinds.SHOP_CATEGORY[p.kind] || 'services';
  const shop = `<h2 class="mk-h">${esc(profilekinds.SHOP_TAB[p.kind] || 'Shop')}</h2>
    ${mgr ? `<p class="pf-storebar"><a class="btn small" href="/label/new?cat=${esc(cat)}&as=${esc(p.id)}">＋ List something as ${esc(p.name)}</a></p>` : ''}
    ${items.length ? `<div class="mk-grid">${items.map((l) => `<div class="mk-shopitem">${listingCard(l)}${mgr && l.by.id === me.id ? `<div class="mk-ownbar"><a class="btn ghost small" href="/label/l/${esc(l.id)}/edit">Edit</a><button type="button" class="btn ghost small mk-withdraw" data-id="${esc(l.id)}">Withdraw</button></div>` : ''}</div>`).join('')}</div>` : `<p class="muted">${mgr ? 'Nothing listed as this page yet.' : 'Nothing listed yet.'}</p>`}`;
  const switcher = mgr ? `<nav class="mk-switch small" aria-label="Your pages">You run this page. Switch: <a href="/m/${esc(me.id)}">your profile</a>${orgpages.managedBy(me.id).filter((x) => x.id !== p.id).map((x) => ` · <a href="${esc(orgpages.href(x))}">${esc(x.name)}</a>`).join('')}</nav>` : '';
  const isLabel = p.kind === 'label';
  const roster = isLabel ? orgpages.rosterOf(p) : [];
  const labelReleases = isLabel ? roster.flatMap((x) => (x.folder ? x.folder.releases.map((r) => ({ ...r, slug: x.slug })) : [])).sort((a, b) => (String(a.date) < String(b.date) ? 1 : -1)) : [];
  const covers = folder ? folder.releases.map((r) => ({ title: r.title, art: r.art ? labelFile(r.art) : null, href: `#rel-${r.id}` }))
    : isLabel ? labelReleases.map((r) => ({ title: r.title, art: r.art ? labelFile(r.art) : null, href: `/label/a/${r.slug}#rel-${r.id}` })) : [];
  const artistsGrid = isLabel ? `<h2 class="mk-h">Artists</h2>${roster.length ? `<div class="mk-grid">${roster.map((x) => x.folder ? artistCard(x.folder) : `<article class="mk-card"><a class="mk-cover" href="${esc(orgpages.href(x.page))}"><span class="mk-icon">♪</span></a><div class="mk-body"><h3><a href="${esc(orgpages.href(x.page))}">${esc(x.name)}</a></h3><p class="mk-sub small">${esc(profilekinds.BADGE[x.page.kind])}</p></div></article>`).join('')}</div>` : `<p class="muted">No artists on this label yet.${mgr ? ' Add a band or artist page you run, from Edit this page.' : ''}</p>`}
    ${labelReleases.length ? `<h2 class="mk-h">Releases</h2><div class="mk-grid mk-disco">${labelReleases.map((r) => `<a class="mk-card mk-discocard" href="/label/a/${esc(r.slug)}#rel-${esc(r.id)}"><span class="mk-cover">${r.art ? `<img src="${labelFile(r.art)}" alt="" loading="lazy">` : '<span class="mk-icon">♪</span>'}</span><span class="mk-body"><strong>${esc(r.title)}</strong><span class="small muted">${esc(r.artist)} · ${esc(String(r.date || '').slice(0, 4))}</span></span></a>`).join('')}</div>` : ''}` : '';
  const center = `${switcher}
  <section class="mk-pagehero${banner ? ' has-banner' : ''}"${banner ? ` style="--mk-banner:url('/images/${esc(banner.id)}')"` : p.banner_art ? ` style="--mk-banner:url('${esc(p.banner_art)}')"` : ''}>
    <div class="mk-pageface">${face}</div>
    <div class="mk-pageid"><p class="lp-kicker">${esc(profilekinds.BADGE[p.kind])}${p.label ? ' on the Label' : ''}</p><h1>${esc(p.name)}</h1>${p.project_service ? '<p class="mk-ourservice">Part of the Cohabitation Project\'s own services</p>' : ''}${p.headline ? `<p class="mk-pagehead">${esc(p.headline)}</p>` : ''}
    <p class="mk-runby small">Run by ${p.managers.map((x) => `<a href="/m/${esc(x.id)}">${memberFace(x.id)} ${esc(x.name)}</a>${newarrival.label(x.id)}`).join(', ')} <span class="muted">· a page is not a member: it has no vote and no coins</span></p>
    ${mgr ? '<p><button type="button" class="btn small" id="pg-edit">✎ Edit this page</button></p>' : ''}</div>
    ${heroCovers(covers)}
  </section>
  ${folder ? songsBlock(folder) : ''}
  ${artistsGrid}
  <div class="mk-pagegrid">
    <aside class="mk-pageside">${profilekinds.infoCards(asMember).replace(/pf-card/g, 'mk-infocard')}${isLabel ? '' : labelCard(p)}${(p.links || []).length ? `<div class="mk-infocard"><h2>Links</h2><ul class="mk-links">${p.links.map((x) => `<li><a href="${esc(x.url)}" rel="nofollow noopener">${esc(x.label)}</a></li>`).join('')}</ul></div>` : ''}${p.label || isLabel ? '<p><a class="btn ghost small" href="/label?cat=music">← All artists in Music</a></p>' : ''}</aside>
    <div class="mk-pagemain">${p.bio ? `<section class="mk-about"><h2 class="mk-h">About</h2><div class="md">${renderMarkdown(p.bio)}</div></section>` : mgr ? '<p class="muted">No “about” yet. Tap Edit this page to write one.</p>' : ''}
    ${(p.gallery || []).length ? `<section class="mk-gallery-sec"><h2 class="mk-h">${esc(p.gallery_title || 'Gallery')}</h2><div class="mk-shots">${p.gallery.map((id) => images.get(id)).filter(Boolean).map((im) => `<figure><a href="/images/${esc(im.id)}"><img src="/images/${esc(im.id)}" alt="${esc(im.alt)}" loading="lazy"></a><figcaption>${esc(im.title || im.alt)}</figcaption></figure>`).join('')}</div></section>` : ''}
    ${shop}</div>
  </div>
  ${mgr ? editDialog(p, me) + membersDatalist() : ''}`;
  return frame({ me, title: p.name, description: `${p.name}: ${profilekinds.BADGE[p.kind]} on Cohabi.`, section: orgpages.themeOf(p), center, scripts: ['/static/label.js', '/static/market.js', '/static/pages.js'] }).replace('<body class="fx-page mk-page"', `<body class="fx-page mk-page mk-pagebody"${p.accent ? ` style="--gold:${esc(p.accent)}"` : ''}`);
}
function editDialog(p, me) {
  const opt = (obj, cur) => Object.entries(obj).map(([k, n]) => `<option value="${esc(k)}"${k === cur ? ' selected' : ''}>${esc(n)}</option>`).join('');
  const mine = (id) => images.list({ by: id, mine: true }).slice(0, 40);
  const ed = profilekinds.editorSection({ profile_kind: p.kind, kind_info: p.kind_info || {}, name: p.name }).replace(/<details>/, '<details open>').replace(/<option value="personal"[^>]*>Personal<\/option>/, '').replace('Profile type: band, artist, business', 'Kind of page and its details').replace('Choose what kind of profile this is. It changes what your page shows and how your shop reads in the market. You can change it any time.', 'What kind of page this is, and the details it shows.');
  const kindSel = `<select name="profile_kind" id="pf-kind">${opt(orgpages.KINDS, p.kind)}</select>`;
  const ed2 = ed.replace(/<select name="profile_kind" id="pf-kind">[\s\S]*?<\/select>/, p.label || p.label_record ? `<select name="profile_kind" id="pf-kind"><option value="${esc(p.kind)}" selected>${esc(orgpages.KINDS[p.kind])}</option></select>` : kindSel);
  const rosterEd = p.kind === 'label' && !p.label_record ? `<label>Add an artist to this label <span class="hint">(a band or artist page you also run)</span><select name="add_artist"><option value="">(none)</option>${orgpages.managedBy(me.id).filter((x) => ['band', 'artist'].includes(x.kind) && !(p.roster || []).includes(x.slug)).map((x) => `<option value="${esc(x.slug)}">${esc(x.name)}</option>`).join('')}</select></label>` : p.label_record ? '<p class="small muted">This label\'s artists come from the Label\'s own record (label/releases.json).</p>' : '';
  return `<dialog class="pf-editor mk-pgdialog" id="pg-dialog" aria-labelledby="pg-ed-h"><form method="dialog" id="pg-form" class="form" data-id="${esc(p.id)}">
    <div class="pf-ed-head"><h2 id="pg-ed-h">Edit ${esc(p.name)}</h2><button class="btn ghost small" type="button" id="pg-cancel" aria-label="close">✕</button></div>
    ${p.label ? '' : `<label>Name<input name="name" maxlength="60" value="${esc(p.name)}"></label>`}
    <label>Headline <span class="hint">(up to 120)</span><input name="headline" maxlength="120" value="${esc(p.headline || '')}"></label>
    <label>About <span class="hint">(up to 3000; **bold** and - lists work)</span><textarea name="bio" maxlength="3000" rows="8">${esc(p.bio || '')}</textarea></label>
    <div class="mk-row"><label>Look<select name="theme">${opt(orgpages.THEMES, orgpages.themeOf(p))}</select></label><label>Accent colour<input name="accent" type="color" value="${esc(p.accent || '#d4a24c')}"></label></div>
    <label>Picture <span class="hint">(one of your uploads)</span><select name="portrait"><option value="">(none${p.art ? ': keep the drawn mark' : ''})</option>${mine(me.id).map((im) => `<option value="${esc(im.id)}"${im.id === p.portrait ? ' selected' : ''}>${esc(im.alt.slice(0, 50))}</option>`).join('')}</select></label>
    <label>Banner <span class="hint">(one of your uploads)</span><select name="banner"><option value="">(none)</option>${mine(me.id).map((im) => `<option value="${esc(im.id)}"${im.id === p.banner ? ' selected' : ''}>${esc(im.alt.slice(0, 50))}</option>`).join('')}</select></label>
    <fieldset class="mk-imgs"><legend>Gallery <span class="hint">(up to 8: pictures already here, and your uploads)</span></legend>${[...new Map([...(p.gallery || []).map((id) => images.get(id)).filter(Boolean), ...mine(me.id)].map((im) => [im.id, im])).values()].slice(0, 48).map((im) => `<label class="mk-imgpick"><input type="checkbox" name="gallery" value="${esc(im.id)}"${(p.gallery || []).includes(im.id) ? ' checked' : ''}><img src="/images/${esc(im.id)}" alt="${esc(im.alt || '')}"></label>`).join('') || '<p class="small muted">Upload pictures from your profile page first.</p>'}</fieldset>
    <label>Links <span class="hint">(up to 6, one per line: label | https://… or tel:…)</span><textarea name="links" rows="4">${esc((p.links || []).map((x) => `${x.label} | ${x.url}`).join('\n'))}</textarea></label>
    ${ed2}
    ${rosterEd}
    <label>Add someone who can run this page <span class="hint">(a member's name)</span><input name="add_manager" maxlength="60" list="cohabi-members" placeholder="e.g. Ash"></label>
    <div class="pf-ed-foot"><button class="btn" type="submit" value="save">Save</button> <button class="btn ghost" type="button" id="pg-cancel2">Cancel</button> <span class="form-msg" role="status" id="pg-msg"></span></div>
  </form></dialog>`;
}

export function newPageForm({ me }) {
  const mine = orgpages.managedBy(me.id);
  const center = `<p class="crumbs small"><a href="/m/${esc(me.id)}">Your profile</a> / create a page</p>
  <h1 class="mk-formh">Create a page</h1>
  <p class="mk-lede">A page for your band, your art or your business, run from your own login. You can switch between your profile and your pages any time from the COHABI menu. A page is not a member: it has no vote and no coins, and you can add others to help run it.</p>
  <form class="mk-form" id="pg-new">
    <label>What kind of page<select name="kind"><option value="band">Band / musician</option><option value="artist">Artist / maker</option><option value="business">Business / services</option><option value="label">Record label</option></select></label>
    <p class="small muted">Starting a record label will cost something one day (we will keep it competitive); during the beta it is free.</p>
    <label>Its name<input name="name" required minlength="2" maxlength="60" placeholder="e.g. The Sunday Room"></label>
    <p class="form-msg" role="status" id="pg-newmsg"></p>
    <button class="btn">Create the page</button>
  </form>
  ${mine.length ? `<h2 class="mk-h">Pages you run</h2><ul class="mk-links">${mine.map((p) => `<li><a href="${esc(orgpages.href(p))}">${esc(p.name)}</a> <span class="muted small">${esc(profilekinds.BADGE[p.kind])}</span></li>`).join('')}</ul>` : ''}`;
  return frame({ me, title: 'Create a page', center, scripts: ['/static/pages.js'] });
}
/** "Pages" on a profile: the pages this member runs. */
export function pagesCard(memberId, { self = false } = {}) {
  const mine = orgpages.managedBy(memberId);
  if (!mine.length && !self) return '';
  const groups = [['band', 'Bands'], ['label', 'Labels'], ['artist', 'Artists'], ['business', 'Businesses']].map(([k, n]) => [n, mine.filter((p) => p.kind === k)]).filter(([, l]) => l.length);
  return `<div class="pf-card pf-pages"><h2>Pages</h2>${mine.length ? groups.map(([n, l]) => `<p class="small muted pf-pagesh">${n}</p><ul>${l.map((p) => `<li><a href="${esc(orgpages.href(p))}"><strong>${esc(p.name)}</strong></a></li>`).join('')}</ul>`).join('') : '<p class="small muted">No pages yet.</p>'}${self ? '<p class="small"><a href="/page/new">＋ Create a band, artist or business page</a></p>' : ''}</div>`;
}
