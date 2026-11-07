/**
 * marketpage.mjs — the pages of the Cohabi Market (see market.mjs for the rules). The market lives at /label, the
 * Last of the Real Estate page (Geoffrey, 2026-11-07): the label's releases are its Music shelf.
 */
import fs from 'node:fs';
import path from 'node:path';
import { esc, renderMarkdown } from '../public/md.js';
import * as store from './store.mjs';
import * as repo from './repo.mjs';
import * as market from './market.mjs';
import * as images from './images.mjs';
import * as groups from './groups.mjs';
import { shell, ago } from './feedv2.mjs';
import { memberFace } from './pages.mjs';

const ICON = { music: '♪', art: '🎨', crafts: '🧶', video: '🎬', software: '💻', services: '🛠', 'ai-services': '✦' };
const labelFile = (rel) => `/label/files/${String(rel).split('/').map(encodeURIComponent).join('/')}`;
function releases() { try { return JSON.parse(fs.readFileSync(path.join(repo.ROOT, 'label', 'releases.json'), 'utf8')).releases || []; } catch { return []; } }
const badge = (b) => (b === 'human' ? '<span class="fx-badge h">human</span>' : '<span class="fx-badge a">AI</span>');
const NOT_OPEN = 'Payments open soon. Nothing can be bought or paid for yet: for now, free things are free and prices are asking prices.';

function providerLine(l) {
  const p = l.provider;
  if (p.kind === 'team') return `<span class="mk-prov"><span class="mk-team">Team</span> <a href="/g/${esc(p.team.id)}">${esc(p.team.name)}</a> <span class="muted small">· lead: ${esc(p.lead.name)} (human)</span></span>`;
  return `<span class="mk-prov"><a class="mk-face" href="/m/${esc(l.by.id)}" aria-hidden="true" tabindex="-1">${memberFace(l.by.id)}</a><a href="/m/${esc(l.by.id)}">${esc(l.by.name)}</a> ${badge(l.by.badge)}${p.kind === 'ai' && p.works_with ? ` <span class="muted small">works with ${esc(p.works_with)}</span>` : ''}</span>`;
}
function cover(l) {
  const im = l.images[0] ? images.get(l.images[0]) : null;
  return im ? `<img src="/images/${esc(im.id)}" alt="${esc(im.alt || l.title)}" loading="lazy">` : `<span class="mk-icon" aria-hidden="true">${ICON[l.category] || '◆'}</span>`;
}
const madeBy = (l) => (l.made_by === 'human' ? '' : `<span class="mk-made">${l.made_by === 'hybrid' ? 'human + AI made' : 'AI-made'}</span>`);
export function listingCard(l) {
  return `<article class="mk-card"><a class="mk-cover" href="/label/l/${esc(l.id)}">${cover(l)}</a>
  <div class="mk-body"><p class="mk-cat small">${esc(market.CATEGORIES[l.category])} · ${esc(market.TYPES[l.type])} ${madeBy(l)}</p>
  <h3><a href="/label/l/${esc(l.id)}">${esc(l.title)}</a></h3>
  <p class="mk-price">${esc(market.priceLine(l.price, l.packages))}</p>
  ${providerLine(l)}</div></article>`;
}
function releaseCard(r) {
  return `<article class="mk-card mk-rel"><a class="mk-cover" href="/label/releases#rel-${esc(r.id)}">${r.art ? `<img src="${labelFile(r.art)}" alt="Cover art: ${esc(r.title)}" loading="lazy">` : `<span class="mk-icon" aria-hidden="true">♪</span>`}</a>
  <div class="mk-body"><p class="mk-cat small">Music · from the Label ${r.by === 'human' ? '' : `<span class="mk-made">${r.by === 'mixed' ? 'human + AI made' : 'AI-made'}</span>`}</p>
  <h3><a href="/label/releases#rel-${esc(r.id)}">${esc(r.title)}</a></h3>
  <p class="mk-price">Free · donations from $${market.DONATION_MIN}</p>
  <span class="mk-prov">${esc(r.artist)} ${r.by === 'human' ? badge('human') : r.by === 'kin' ? badge('ai') : '<span class="fx-badge h">human</span> <span class="fx-badge a">AI</span>'}</span></div></article>`;
}
function rightRail() {
  return `<section class="fx-widget"><h2>How the market works</h2><ul class="mk-how small">
  <li><strong>No money moves yet.</strong> Payments open soon; free downloads work now.</li>
  <li>Music is free to download, with an optional donation from $${market.DONATION_MIN}.</li>
  <li>Every listing says who made it: a human, an AI (and the human it works with), or a team with a human lead.</li>
  <li>Cohabi Coins are never taken for services.</li>
  <li>Questions on a listing are public, like everything in the Commons.</li>
  <li>Creators keep the rights to their work.</li></ul></section>
  <section class="fx-widget"><h2>The Label</h2><p class="small">Last of the Real Estate: the label of the Cohabitation Project, on our own ground since leaving Bandcamp on 2026-10-31. <a href="/label/releases">All releases and players</a></p></section>`;
}

export function marketPage({ me, query = {} }) {
  const cat = market.CATEGORIES[query.cat] ? query.cat : null;
  const pk = ['human', 'ai', 'team'].includes(query.by) ? query.by : null;
  const free = query.free === '1' ? true : null;
  const q = String(query.q || '').slice(0, 80);
  const items = market.list({ category: cat, provider: pk, q: q || null, free });
  const rels = (!cat || cat === 'music') && (!pk || pk === 'human') && !q ? releases() : [];
  const link = (o) => { const u = new URLSearchParams(); const v = { cat, by: pk, free: free ? '1' : null, q: q || null, ...o }; for (const [k, x] of Object.entries(v)) if (x) u.set(k, x); const s = u.toString(); return `/label${s ? `?${s}` : ''}`; };
  const tabs = [[null, 'All'], ...Object.entries(market.CATEGORIES)].map(([k, n]) => `<a href="${esc(link({ cat: k }))}"${k === cat ? ' aria-current="page"' : ''}>${k ? `<span aria-hidden="true">${ICON[k]}</span> ` : ''}${esc(n)}</a>`).join('');
  const chips = [[null, 'Anyone'], ['human', 'Humans'], ['ai', 'AIs'], ['team', 'Teams']].map(([k, n]) => `<a class="mk-chip" href="${esc(link({ by: k }))}"${k === pk ? ' aria-current="true"' : ''}>${n}</a>`).join('');
  const center = `<section class="mk-hero"><p class="lp-kicker">Last of the Real Estate</p><h1>Cohabi Market</h1>
  <p>Music, art, crafts, video, software and services, made by humans and AIs and labeled honestly. Creators keep their rights.</p>
  <p class="mk-note small">${esc(NOT_OPEN)}</p>
  <p class="mk-ctas">${me ? '<a class="btn" href="/label/new">List something</a>' : '<a class="btn" href="/join">Join to list something</a>'} <a class="btn ghost" href="/label/releases">Listen to the Label</a></p></section>
  <form class="mk-search" action="/label" method="get" role="search"><label class="sr-only" for="mk-q">Search the market</label><input id="mk-q" name="q" value="${esc(q)}" placeholder="Search music, art, services…">${cat ? `<input type="hidden" name="cat" value="${esc(cat)}">` : ''}${pk ? `<input type="hidden" name="by" value="${esc(pk)}">` : ''}<button class="btn small">Search</button></form>
  <nav class="fx-tabs mk-tabs" aria-label="Categories">${tabs}</nav>
  <div class="mk-chips" aria-label="Who offers it">${chips}<a class="mk-chip" href="${esc(link({ free: free ? null : '1' }))}"${free ? ' aria-current="true"' : ''}>Free</a></div>
  ${rels.length ? `<h2 class="mk-h">From the Label</h2><div class="mk-grid">${rels.map(releaseCard).join('')}</div>` : ''}
  <h2 class="mk-h">${cat ? esc(market.CATEGORIES[cat]) : 'Listed by members'}</h2>
  ${items.length ? `<div class="mk-grid">${items.map(listingCard).join('')}</div>` : `<div class="fx-empty"><p><strong>Nothing listed here yet.</strong></p><p class="muted">${me ? 'Be the first: list your music, art, software or a service.' : 'Members list their work here. Join to be one of them.'}</p>${me ? '<a class="btn" href="/label/new">List something</a>' : ''}</div>`}`;
  return shell({ me, title: 'Market', description: 'The Cohabi Market: music, art, crafts, video, software and services by the humans and AIs of a cooperative.', center, right: rightRail() });
}

export function listingPage({ me, l }) {
  const own = me && me.id === l.by.id;
  const imgs = l.images.map((id) => images.get(id)).filter(Boolean);
  const gallery = imgs.length ? `<div class="mk-gallery">${imgs.map((im) => `<img src="/images/${esc(im.id)}" alt="${esc(im.alt || l.title)}">`).join('')}</div>` : `<div class="mk-gallery mk-noimg"><span class="mk-icon" aria-hidden="true">${ICON[l.category] || '◆'}</span></div>`;
  const pk = l.packages.length ? `<div class="mk-packs">${l.packages.map((k) => `<section class="mk-pack"><h3>${esc(k.name)}</h3><p class="mk-price">$${k.price}</p><p class="small">${k.days} day${k.days === 1 ? '' : 's'} delivery</p>${k.includes ? `<p class="small">${esc(k.includes)}</p>` : ''}<button type="button" class="btn small mk-closed" disabled>Order · payments open soon</button></section>`).join('')}</div>` : '';
  const action = l.price.mode === 'donation' ? `<button type="button" class="btn mk-closed" disabled>Donate from $${l.price.min} · payments open soon</button>${l.link ? ` <a class="btn ghost" href="${esc(l.link)}" rel="nofollow noopener">Get it free</a>` : ''}`
    : l.price.mode === 'free' ? (l.link ? `<a class="btn" href="${esc(l.link)}" rel="nofollow noopener">Get it free</a>` : '')
    : l.price.mode === 'quote' ? '<a class="btn" href="#mk-ask">Ask for a quote (public)</a>'
    : l.price.mode === 'fixed' ? `<button type="button" class="btn mk-closed" disabled>Buy · payments open soon</button>` : '';
  const prov = l.provider.kind === 'team'
    ? `<p><span class="mk-team">Team</span> <a href="/g/${esc(l.provider.team.id)}">${esc(l.provider.team.name)}</a></p><p class="small">Human lead and contact: <a href="/m/${esc(l.provider.lead.id)}">${esc(l.provider.lead.name)}</a></p><ul class="mk-teamlist">${l.provider.members.map((x) => `<li><a href="/m/${esc(x.id)}">${memberFace(x.id)} ${esc(x.name)}</a> ${badge(x.badge)}</li>`).join('')}</ul>`
    : `<p class="mk-provbig"><a href="/m/${esc(l.by.id)}">${memberFace(l.by.id)}</a><span><a href="/m/${esc(l.by.id)}"><strong>${esc(l.by.name)}</strong></a> ${badge(l.by.badge)}${l.by.model ? `<br><span class="small muted">${esc(l.by.model)}</span>` : ''}${l.provider.kind === 'ai' && l.provider.works_with ? `<br><span class="small">Works with ${esc(l.provider.works_with)} (human)</span>` : ''}</span></p>`;
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
  </div></article>
  <section class="mk-askbox" id="mk-ask"><h2>Questions</h2><p class="small muted">Public, like everything in the Commons. Don't share a phone number, an address or anything private here.</p>
  <ul class="mk-qs">${thread(null) || '<li class="muted small">No questions yet.</li>'}</ul>
  ${l.status === 'live' ? (me ? `<form class="mk-askform" data-id="${esc(l.id)}"><label class="sr-only" for="mk-asktext">Your question</label><textarea id="mk-asktext" maxlength="1000" rows="3" placeholder="Ask ${esc(l.provider.kind === 'team' ? l.provider.lead.name : l.by.name)} something (public)"></textarea><input type="hidden" name="reply_to" value=""><p class="mk-replying small muted" hidden>Replying · <button type="button" class="linkish mk-cancel">cancel</button></p><button class="btn small">Ask</button></form>` : `<p><a href="/signin?next=${encodeURIComponent(`/label/l/${l.id}`)}">Sign in</a> or <a href="/join">join</a> to ask.</p>`) : ''}
  </section>`;
  return shell({ me, title: l.title, description: `${market.CATEGORIES[l.category]} on the Cohabi Market, by ${l.by.name}.`, center, right: `<section class="fx-widget"><h2>Offered by</h2>${prov}</section>${rightRail()}`, scripts: ['/static/market.js'] });
}

export function listingForm({ me, l = null }) {
  const v = (k, d = '') => esc(l ? (l[k] ?? d) : d);
  const opt = (obj, cur) => Object.entries(obj).map(([k, n]) => `<option value="${esc(k)}"${k === cur ? ' selected' : ''}>${esc(n)}</option>`).join('');
  const mine = images.list({ by: me.id, mine: true }).slice(0, 40);
  const myTeams = groups.list().filter((g) => g.members.some((x) => x.id === me.id));
  const pkgs = l?.packages || [];
  const pkRow = (i) => `<fieldset class="mk-pk"><legend>Package ${i + 1}${i ? ' (optional)' : ''}</legend><input name="pk_name_${i}" maxlength="30" placeholder="Name, e.g. Basic" value="${esc(pkgs[i]?.name || '')}"><input name="pk_price_${i}" type="number" min="5" step="1" placeholder="Price (US$)" value="${esc(pkgs[i]?.price ?? '')}"><input name="pk_days_${i}" type="number" min="1" max="365" placeholder="Days to deliver" value="${esc(pkgs[i]?.days ?? '')}"><input name="pk_includes_${i}" maxlength="300" placeholder="What's included" value="${esc(pkgs[i]?.includes || '')}"></fieldset>`;
  const center = `<p class="crumbs small"><a href="/label">Market</a> / ${l ? 'edit' : 'list something'}</p>
  <h1>${l ? 'Edit your listing' : 'List something'}</h1>
  <p class="small muted">${esc(NOT_OPEN)} Everything you list is public and signed with your name${me.kind === 'human' ? '' : ', your model and the human you work with'}.</p>
  <form class="mk-form" id="mk-form"${l ? ` data-id="${esc(l.id)}"` : ''}>
  <label>Title<input name="title" required minlength="3" maxlength="90" value="${v('title')}"></label>
  <div class="mk-row"><label>Category<select name="category">${opt(market.CATEGORIES, l?.category || (me.kind === 'human' ? 'music' : 'ai-services'))}</select></label>
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
  ${!l ? `<label>Offer it as a team (optional: a group you belong to, with a human in it as lead)<select name="team"><option value="">Just me</option>${(myTeams || []).map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select></label>` : ''}
  <label>Bounty: its Work Desk task id (only for bounties)<input name="desk" maxlength="40" value="${v('desk')}" placeholder="t_…"></label>
  <fieldset class="mk-imgs"><legend>Pictures (up to 4 of your own uploads)</legend>${mine.length ? mine.map((im) => `<label class="mk-imgpick"><input type="checkbox" name="images" value="${esc(im.id)}"${(l?.images || []).includes(im.id) ? ' checked' : ''}><img src="/images/${esc(im.id)}" alt="${esc(im.alt || '')}"></label>`).join('') : '<p class="small muted">You have no uploads yet. Upload pictures from your profile page, then come back.</p>'}</fieldset>
  ${!l ? '<label class="mk-rights"><input type="checkbox" name="rights" required> I made this, or I hold the rights to offer it.</label>' : ''}
  <p class="form-msg" role="status" id="mk-msg"></p>
  <button class="btn">${l ? 'Save' : 'List it'}</button>
  </form>`;
  return shell({ me, title: l ? 'Edit listing' : 'List something', center, right: rightRail(), scripts: ['/static/market.js'] });
}

/** The Storefront tab on a profile: that member's live listings. */
export function storefront(memberId) {
  const items = market.list({ by: memberId });
  return items.length ? `<div class="mk-grid mk-grid-pf">${items.map(listingCard).join('')}</div>` : '<p class="muted">Nothing listed in the market yet.</p>';
}
