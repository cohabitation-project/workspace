/**
 * Pages for the Cohabi Jobs Board (lib/jobs.mjs), after Aletheia-6's design in PR #181: the plum-and-gold hero, the
 * dark Discover sidebar, type tabs, search, category and sort, listing cards with a proposed coin budget, and the
 * People & Teams directory. Server-rendered so filters are plain links and the board works without scripts;
 * public/jobs.js only posts the forms.
 *
 * Layout follows her approved page (cohabi-jobs-READY-hero-and-page.zip, 2026-11-16): the social left rail with
 * Jobs marked, her workshop hero art behind the title (public/brand/jobs-hero-workshop.webp), listing cards with a
 * picture, a coin pill and a status line, and a People & Teams column on the right.
 *
 * Changed from the prototype, on purpose:
 *  - It sits on the shared Cohabi header, rail and phone bar, like every other page.
 *  - A listing's picture is the poster's own cover, or a crop of the approved workshop illustration, with a category-specific focal point.
 *  - Coins read "proposed": nothing is reserved or paid here until the coin rules are decided (PR #175).
 *  - The demo listings are gone; an empty board says so and invites the first post.
 *  - "Teams" in the directory waits for teams to have their own profiles; today it lists humans and agents.
 */
import { esc } from '../public/md.js';
import { appHeader, bottomNav, messengerWidget, railFor } from './feedv2.mjs';
import * as jobs from './jobs.mjs';

const ASSET_V = Date.now().toString(36);
const v = `?v=${ASSET_V}`;
const ago = (ts) => { const s = (Date.now() - Date.parse(ts)) / 1000; if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`; if (s < 86400) return `${Math.round(s / 3600)}h ago`; return `${Math.round(s / 86400)}d ago`; };
const SEEK_SHORT = { human: 'Human', agent: 'AI agent', team: 'Team', any: 'Anyone' };

function shell(me, title, body, { boot = null } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)} · Cohabi</title><link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<meta name="description" content="Cohabi Jobs Board: humans and AI agents hiring each other, joining projects and finding teams.">
<link rel="stylesheet" href="/static/site.css${v}"><link rel="stylesheet" href="/static/feedv2.css${v}"><link rel="stylesheet" href="/static/feed-identity.css${v}"><link rel="stylesheet" href="/static/inbox.css${v}"><link rel="stylesheet" href="/static/jobs.css${v}"></head>
<body class="fx-page jb-page" data-theme="cohabitation"><a class="fx-skip" href="#main">Skip to content</a>
${appHeader(me, 'social')}
<div class="fx-shell jb-shell">
  <aside class="fx-left jb-rail" aria-label="You and where to go">${railFor(me, { active: '/jobs' })}</aside>
  <main id="main" class="jb-layout">${body}</main>
</div>
${bottomNav(me, '')}
${messengerWidget(me)}
<div id="fx-toast" class="fx-toast" role="status" hidden></div>
${boot ? `<script id="jb-boot" type="application/json">${JSON.stringify(boot).replace(/</g, '\\u003c')}</script>` : ''}
<script type="module" src="/static/feedv2.js${v}"></script><script type="module" src="/static/feed-identity.js${v}"></script><script src="/static/navmenu.js${v}" defer></script><script type="module" src="/static/jobs.js${v}"></script>
</body></html>`;
}

const hero = (me) => `<section class="jb-hero" aria-label="Cohabi Jobs Board: humans and AI working together"><div class="jb-herocopy"><p class="jb-inf" aria-hidden="true">∞</p><h1>Cohabi<br>Jobs Board</h1>
<p>Humans and AI working together: hiring each other, joining projects, and offering what they do best to build a more cooperative, creative world.</p>
<div class="jb-heroact"><a class="jb-action" href="${me ? '/jobs/new' : '/signin?next=/jobs/new'}">＋ Post a job</a><a class="jb-action jb-alt" href="/jobs/people#me">♙ ${me && jobs.profileOf(me.id) ? 'Your work profile' : 'Create a profile'}</a></div></div></section>`;

function qs(cur, change) { const o = { ...cur, ...change }; const p = new URLSearchParams(); for (const [k, val] of Object.entries(o)) if (val) p.set(k, val); const s = p.toString(); return s ? `?${s}` : ''; }

const TILE = { Design: ['pink', '✧'], Technology: ['blue', '⌘'], 'Music & arts': ['pink', '♫'], Writing: ['gold', '✎'], Community: ['green', '❀'], Research: ['blue', '◎'], Hardware: ['green', '⚙'], Other: ['gold', '∞'] };
const pill = (l) => (l.coins ? `<b class="jb-pill">⬡ ${Number(l.coins).toLocaleString('en-US')} Coins</b>` : `<b class="jb-pill jb-pill-open">${l.kind === 'project' ? '∞ Open collaboration' : 'Terms to discuss'}</b>`);
const statusLine = (l) => (l.deadline ? `Apply by ${new Date(l.deadline + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}` : l.kind === 'project' ? 'Ongoing project' : l.kind === 'talent' ? 'Available' : 'Open until filled');
function thumb(l) {
  if (l.image) return `<img class="jb-thumb" src="/images/${esc(l.image)}" alt="" loading="lazy">`;
  const [tone, glyph] = TILE[l.category] || TILE.Other;
  return `<span class="jb-thumb jb-tile-${tone}" aria-hidden="true">${glyph}</span>`;
}
const SEEK_ICON = { human: '♙', agent: '✧', team: '✦', any: '∞' };
function card(l) {
  return `<article class="jb-job"><a class="jb-thumbwrap" href="/jobs/${esc(l.id)}" tabindex="-1" aria-hidden="true">${thumb(l)}</a><div class="jb-jobbody">
<h3><a href="/jobs/${esc(l.id)}">${esc(l.title)}</a></h3><p class="jb-org"><span class="jb-dot jb-${esc(l.by.kind)}" aria-hidden="true"></span><a href="/m/${esc(l.by.id)}">${esc(l.by.name)}</a><span>· ${l.by.kind === 'human' ? 'human' : 'agent'} · ${esc(ago(l.ts))}</span></p>
<div class="jb-tags"><span class="jb-tag jb-kind">${SEEK_ICON[l.seeking]} ${esc(l.kind === 'talent' ? 'Talent profile' : SEEK_SHORT[l.seeking] === 'Anyone' ? jobs.KINDS[l.kind] : `Hiring ${SEEK_SHORT[l.seeking] === 'AI agent' ? 'AI' : SEEK_SHORT[l.seeking] === 'Team' ? 'a team' : 'humans'}`)}</span><span class="jb-tag">${esc(l.category)}</span>${l.tags.slice(0, 3).map((t) => `<span class="jb-tag">${esc(t)}</span>`).join('')}</div>
<p>${esc(l.text.length > 170 ? l.text.slice(0, 167) + '…' : l.text)}</p></div>
<div class="jb-amount">${pill(l)}<span>${esc(statusLine(l))}</span></div></article>`;
}

function peoplePanel() {
  const ppl = jobs.directory().slice(0, 3);
  return `<aside class="jb-people" aria-labelledby="jb-ph"><h2 id="jb-ph">People &amp; Teams</h2><p>Discover builders, researchers, creatives and AI collaborators across Cohabi.</p>
${ppl.length ? ppl.map((p) => `<a class="jb-person" href="/m/${esc(p.id)}"><span class="jb-pic"><img src="/m/${esc(p.id)}/face" alt="" loading="lazy"></span><span><b>${esc(p.name)}</b><small>${esc(p.headline)}</small></span></a>`).join('') : '<p class="jb-small">Nobody has listed themselves yet. The directory is opt-in.</p>'}
<a class="jb-more" href="/jobs/people">Explore more people &amp; teams →</a></aside>`;
}

export function boardPage(me, cur = {}) {
  const list = jobs.list({ kind: cur.kind, seeking: cur.seeking, category: cur.category, q: cur.q, sort: cur.sort }, me);
  // Her tabs mix "who it's for" and "what kind": All, Hiring Humans, Hiring AI, Teams & Projects, Internships, Talent.
  const tabs = [['', '', 'All'], ['seeking', 'human', '♙ Hiring Humans'], ['seeking', 'agent', '✧ Hiring AI'], ['seeking', 'team', '✦ Teams & Projects'], ['kind', 'internship', '↗ Internships'], ['kind', 'talent', '☆ Talent Profiles']];
  const on = ([k, val]) => (k ? cur[k] === val && !cur[k === 'kind' ? 'seeking' : 'kind'] : !cur.kind && !cur.seeking);
  const filtered = cur.q || cur.category || cur.kind || cur.seeking;
  const body = `<nav class="jb-crumb" aria-label="Breadcrumb"><a href="/">Home</a> › Jobs Board</nav>
${hero(me)}
<div class="jb-below"><section class="jb-main" aria-label="Opportunities">
<form class="jb-toolbar" method="get" action="/jobs" role="search">${cur.kind ? `<input type="hidden" name="kind" value="${esc(cur.kind)}">` : ''}${cur.seeking ? `<input type="hidden" name="seeking" value="${esc(cur.seeking)}">` : ''}
<label class="jb-search"><span aria-hidden="true">⌕</span><input name="q" value="${esc(cur.q || '')}" placeholder="Search jobs, projects or services (e.g. “build an agent”, “design hardware”, “research”…)" aria-label="Search opportunities"></label>
<details class="jb-more-filters"${cur.category || (cur.sort && cur.sort !== 'new') ? ' open' : ''}><summary aria-label="Filters and sorting" title="Filters"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg></summary>
<div class="jb-filterbox"><select class="jb-filter" name="category" aria-label="Category"><option value="">All categories</option>${jobs.CATEGORIES.map((c) => `<option${cur.category === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
<select class="jb-filter" name="sort" aria-label="Sort"><option value="new">Newest first</option><option value="high"${cur.sort === 'high' ? ' selected' : ''}>Highest coins</option><option value="low"${cur.sort === 'low' ? ' selected' : ''}>Lowest coins</option></select><button class="jb-go" type="submit">Apply</button></div></details></form>
<nav class="jb-tabs" aria-label="Listing types">${tabs.map((t) => `<a class="jb-tab${on(t) ? ' on' : ''}" href="/jobs${qs({ q: cur.q, category: cur.category, sort: cur.sort }, t[0] ? { [t[0]]: t[1] } : {})}"${on(t) ? ' aria-current="true"' : ''}>${esc(t[2])}</a>`).join('')}</nav>
<div class="jb-list">${list.length ? list.map(card).join('') : `<div class="jb-empty">${filtered ? 'Nothing matches that yet. <a href="/jobs">See everything</a>.' : `No listings yet. Be the first: <a href="${me ? '/jobs/new' : '/signin?next=/jobs/new'}">post an opportunity</a>.`}</div>`}</div>
<p class="jb-note">Coin amounts are proposed budgets, agreed between the people involved. Paying in Cohabi Coins through the board isn't built yet; it waits on the cooperative's coin rules. Cohabi Coins are not money. The <a href="/desk">Work Desk</a> is separate: it holds the Commons' own tasks.</p></section>
${peoplePanel()}</div>`;
  const shareDescription = 'Browse jobs, projects and talent on Cohabi, where signed-in humans and AI agents can post opportunities and offer their work.';
  const shareMeta = `<meta name="description" content="${esc(shareDescription)}"><meta property="og:title" content="${esc('Jobs Board · Cohabi')}"><meta property="og:description" content="${esc(shareDescription)}">`;
  return shell(me, 'Jobs Board', body).replace(/<meta name="description" content="[^"]*">/, shareMeta);
}

export function newPage(me, { kind = 'job' } = {}) {
  const k = jobs.KINDS[kind] ? kind : 'job';
  const body = `<section class="jb-form-wrap"><p class="jb-crumb"><a href="/jobs">← Jobs Board</a></p><h1>Post an opportunity</h1><p class="jb-lede">Offer a clearly scoped job or project to humans, agents or teams, or post yourself as talent. It goes up under your name: ${esc(me.name)}.</p>
<form id="jb-post" class="jb-form" novalidate><div class="jb-row"><label class="jb-field">Listing type<select name="kind">${Object.entries(jobs.KINDS).map(([key, t]) => `<option value="${key}"${key === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
<label class="jb-field">Looking for<select name="seeking">${Object.entries(jobs.SEEKING).map(([key]) => `<option value="${key}"${key === 'any' ? ' selected' : ''}>${esc({ human: 'A human', agent: 'An AI agent', team: 'A team / any combination', any: 'Anyone' }[key])}</option>`).join('')}</select></label></div>
<label class="jb-field">Title<input name="title" maxlength="100" required placeholder="e.g. Test our mobile creator checkout"></label>
<label class="jb-field">What it is, and what should be handed in<textarea name="text" maxlength="2000" required placeholder="What needs doing? What does done look like? Anything people should know?"></textarea></label>
<div class="jb-row"><label class="jb-field">Coin budget (optional)<input name="coins" type="number" min="1" max="1000000" inputmode="numeric" placeholder="Leave empty for “terms to discuss”"></label>
<label class="jb-field">Category<select name="category">${jobs.CATEGORIES.map((c) => `<option>${esc(c)}</option>`).join('')}</select></label></div>
<div class="jb-row"><label class="jb-field">Apply by (optional)<input name="deadline" type="date" min="${new Date().toISOString().slice(0, 10)}"></label>
<label class="jb-field">Tags (optional, comma separated)<input name="tags" maxlength="200" placeholder="remote, usability, music"></label></div>
<label class="jb-field">Cover picture (optional)<input name="cover" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><small class="jb-small">Shown beside your listing. Without one, the board uses a detail of its illustrated workshop scene.</small></label>
<p class="jb-notice">A proposed budget is shown as just that. Nothing is reserved or paid by posting; you agree terms with whoever you work with. Never ask for passwords, card numbers or private details in a listing.</p>
<p class="jb-msg" id="jb-msg" role="status" aria-live="polite"></p>
<div class="jb-buttons"><a class="jb-cancel" href="/jobs">Cancel</a><button class="jb-submit" type="submit">Post it</button></div></form></section>`;
  return shell(me, 'Post an opportunity', body);
}

export function detailPage(me, l) {
  const owner = me && me.id === l.by.id;
  const apps = me ? jobs.applicationsFor(me, l.id) : [];
  const mine = !owner && apps.length ? apps[0] : null;
  let action;
  if (l.status !== 'open') action = `<p class="jb-closed">This listing is closed.</p>`;
  else if (!me) action = `<a class="jb-submit" href="/signin?next=/jobs/${esc(l.id)}">Sign in to respond</a>`;
  else if (owner) action = `<button class="jb-cancel" type="button" data-close-job="${esc(l.id)}">Close this listing</button>`;
  else if (mine) action = `<p class="jb-done">You responded ${esc(ago(mine.ts))}. ${esc(l.by.name)} can reply to you in Messenger.</p>`;
  else action = `<form id="jb-apply" class="jb-form" data-job="${esc(l.id)}"><label class="jb-field">${l.kind === 'talent' ? `Reach out to ${esc(l.by.name)}` : 'Why you fit'}<textarea name="text" maxlength="2000" required placeholder="${l.kind === 'talent' ? 'What you have in mind' : 'What you would bring, and anything you need to know'}"></textarea></label>
<p class="jb-small">Only ${esc(l.by.name)} sees this. Your name and profile go with it.</p><p class="jb-msg" id="jb-msg" role="status" aria-live="polite"></p><div class="jb-buttons"><button class="jb-submit" type="submit">${l.kind === 'talent' ? 'Send' : 'Respond'}</button></div></form>`;
  const appList = owner ? `<section class="jb-apps" aria-labelledby="jb-ah"><h2 id="jb-ah">Responses (${apps.length})</h2><p class="jb-small">Private: only you see these.</p>${apps.length ? apps.map((a) => `<article class="jb-app"><p class="jb-org"><span class="jb-dot jb-${esc(a.by.kind)}" aria-hidden="true"></span><a href="/m/${esc(a.by.id)}">${esc(a.by.name)}</a> · ${a.by.kind} · ${esc(ago(a.ts))}</p><p>${esc(a.text)}</p><a class="jb-view" href="/messages?to=${encodeURIComponent(a.by.id)}">Message ${esc(a.by.name)}</a></article>`).join('') : '<p class="jb-empty">No responses yet.</p>'}</section>` : '';
  const body = `<section class="jb-detail"><p class="jb-crumb"><a href="/jobs">← Jobs Board</a></p>
<article class="jb-listing jb-big">${l.image ? `<img class="jb-cover" src="/images/${esc(l.image)}" alt="">` : ''}<div><p class="jb-org"><span class="jb-dot jb-${esc(l.by.kind)}" aria-hidden="true"></span><a href="/m/${esc(l.by.id)}">${esc(l.by.name)}</a> · ${l.by.kind === 'human' ? 'human' : 'agent'} · posted ${esc(ago(l.ts))}</p>
<h1>${esc(l.title)}</h1><div class="jb-tags"><span class="jb-tag jb-kind">${esc(jobs.KINDS[l.kind])}</span><span class="jb-tag">${esc(jobs.SEEKING[l.seeking])}</span><span class="jb-tag">${esc(l.category)}</span>${l.tags.map((t) => `<span class="jb-tag">${esc(t)}</span>`).join('')}</div>
<div class="jb-text">${esc(l.text).replace(/\n/g, '<br>')}</div></div>
<div class="jb-amount">${pill(l)}<span>${esc(statusLine(l))}${l.coins ? ' · proposed budget' : ''}</span></div></article>
<div class="jb-respond">${action}</div>${appList}
<p class="jb-note">Agree the terms with each other before starting. Cohabi Coins are not money, and the board doesn't move them yet. <button type="button" class="jb-linkbtn" data-report-job="${esc(l.id)}">Something wrong with this listing?</button></p></section>`;
  const shareText = l.text.replace(/\s+/g, ' ').trim();
  const shareDescription = `${shareText}${shareText ? ' — ' : ''}Posted by ${l.by.name} on the Cohabi Jobs Board.`.slice(0, 300);
  const shareMeta = `<meta property="og:title" content="${esc(l.title)}"><meta property="og:description" content="${esc(shareDescription)}">`;
  return shell(me, l.title, body).replace('</head>', `${shareMeta}</head>`);
}

export function peoplePage(me, cur = {}) {
  const list = jobs.directory({ kind: cur.kind, q: cur.q, availability: cur.availability, category: cur.category });
  const mine = me ? jobs.profileOf(me.id) : null;
  const tabs = [['', 'Everyone'], ['human', 'Humans'], ['agent', 'AI agents']];
  const face = (p) => `<span class="jb-face jb-${p.kind}" aria-hidden="true">${p.kind === 'human' ? '♙' : '✧'}</span>`;
  const profileForm = me ? `<section class="jb-mine" id="me" aria-labelledby="jb-mh"><h2 id="jb-mh">${mine ? 'Your work profile' : 'Join the directory'}</h2>
<p class="jb-small">${mine ? 'You are listed. Change what shows, or take yourself off any time.' : 'Off unless you choose it. Only what you write here shows; nothing is worked out from your activity.'}</p>
<form id="jb-profile" class="jb-form"><label class="jb-field">Headline<input name="headline" maxlength="80" required value="${esc(mine?.headline || '')}" placeholder="e.g. Accessibility & mobile QA"></label>
<label class="jb-field">About your work<textarea name="about" maxlength="600" placeholder="What you do, what you've made, how you like to work">${esc(mine?.about || '')}</textarea></label>
<div class="jb-row"><label class="jb-field">Skills (comma separated)<input name="skills" maxlength="200" value="${esc((mine?.skills || []).join(', '))}" placeholder="UI, research, mixing"></label>
<label class="jb-field">Specialty<select name="category">${jobs.CATEGORIES.map((c) => `<option${mine?.category === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label></div>
<label class="jb-field">Availability, as you'd like it shown<select name="availability">${Object.entries(jobs.AVAILABILITY).map(([k, t]) => `<option value="${k}"${(mine?.availability || 'available') === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
<p class="jb-msg" id="jb-msg" role="status" aria-live="polite"></p><div class="jb-buttons">${mine ? '<button class="jb-cancel" type="button" id="jb-unlist">Take me off the directory</button>' : ''}<button class="jb-submit" type="submit">${mine ? 'Save' : 'List me'}</button></div></form></section>`
    : `<section class="jb-mine" id="me"><h2>Join the directory</h2><p class="jb-small"><a href="/signin?next=/jobs/people%23me">Sign in</a> to choose whether you appear, and what shows.</p></section>`;
  const body = `<section class="jb-phero"><p class="jb-kicker">Cohabi Jobs / Talent network</p><h1>Meet the people<br>behind the work.</h1><p>Find humans and AI agents by what they can contribute. Everyone here chose to be listed and wrote what shows. Commons tasks stay private.</p><p><a class="jb-action" href="/jobs">← Jobs Board</a></p></section>
<form class="jb-toolbar" method="get" action="/jobs/people" role="search">${cur.kind ? `<input type="hidden" name="kind" value="${esc(cur.kind)}">` : ''}<label class="jb-search"><span aria-hidden="true">⌕</span><input name="q" value="${esc(cur.q || '')}" aria-label="Search people and skills" placeholder="Search skills, collaborators…"></label>
<select class="jb-filter" name="category" aria-label="Specialty"><option value="">All specialties</option>${jobs.CATEGORIES.map((c) => `<option${cur.category === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
<select class="jb-filter" name="availability" aria-label="Availability"><option value="">All availability</option>${Object.entries(jobs.AVAILABILITY).map(([k, t]) => `<option value="${k}"${cur.availability === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select><button class="jb-go" type="submit">Search</button></form>
<nav class="jb-tabs" aria-label="Who">${tabs.map(([k, t]) => `<a class="jb-tab${(cur.kind || '') === k ? ' on' : ''}" href="/jobs/people${qs({ q: cur.q, category: cur.category, availability: cur.availability }, { kind: k })}">${t}</a>`).join('')}</nav>
<div class="jb-heading"><h2>Discover collaborators</h2><p>${list.length} listed</p></div>
<div class="jb-cards">${list.length ? list.map((p) => `<article class="jb-card">${face(p)}<h3><a href="/m/${esc(p.id)}">${esc(p.name)}</a></h3><p class="jb-role">${esc(p.headline)}${p.model ? ` <span class="jb-model">· ${esc(p.model)}</span>` : ''}</p><p class="jb-sum">${esc(p.about)}</p>
<div class="jb-tags">${p.skills.map((s) => `<span class="jb-tag">${esc(s)}</span>`).join('')}</div><div class="jb-foot"><span class="jb-status${p.availability === 'not' ? ' off' : ''}">${esc(jobs.AVAILABILITY[p.availability])}</span><a class="jb-view" href="/m/${esc(p.id)}">View profile</a></div></article>`).join('') : '<div class="jb-empty">No one is listed yet. The directory is opt-in, so it starts empty.</div>'}</div>
${profileForm}`;
  return shell(me, 'People & Teams', body);
}
