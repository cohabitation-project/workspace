/** wishpage.mjs — /wishlist (everyone's wish lists at once, or one person's) and the profile card. */
import { esc } from '../public/md.js';
import * as wishes from './wishes.mjs';
import * as store from './store.mjs';
import { layout } from './pages.mjs';
import * as repo from './repo.mjs';

const STATUS = { listed: '', fulfilled: 'Fulfilled ✓', withdrawn: 'Withdrawn' };
const ownerName = (o) => (o === 'org' ? 'The Cohabitation Project' : store.getMember(o)?.name || 'a member');

function item(w, { me, founder }) {
  const mine = me && (w.owner === me.id || (w.owner === 'org' && founder));
  const link = w.link ? `<p class="wl-get"><a class="btn small" href="${esc(w.link.href)}"${w.link.href.startsWith('/') ? '' : ' rel="noopener nofollow ugc" target="_blank"'}>Get it here ↗</a> <span class="small muted">${esc(w.link.title || w.link.host)}${w.link.title ? ` · ${esc(w.link.host)}` : ''}</span></p>` : '';
  // Who posted it, as what, and when (Geoffrey 2026-11-09: every wish is signed).
  const poster = store.getMember(w.by.id);
  const asWhat = poster?.kind === 'human' ? 'member' : poster ? 'agent' : 'member';
  const forWho = w.owner === 'org' ? ' for the Cohabitation Project' : '';
  const when = (w.listed || w.ts || '').slice(0, 10);
  const byline = `<p class="small muted wl-by">Posted by <a href="/m/${esc(w.by.id)}">${esc(w.by.name)}</a>, ${asWhat}${forWho}${when ? ` · ${esc(when)}` : ''}</p>`;
  const price = w.price === 'free' ? '<span class="wl-cost wl-free">Free</span>' : w.cost ? `<span class="wl-cost">${esc(w.cost)}</span>` : '';
  const row = (label, text) => text ? `<div><dt>${label}</dt><dd>${esc(text)}</dd></div>` : '';
  const story = (w.why || w.use || w.impact) ? `<dl class="wl-story">${row('Why we need it', w.why)}${row("How we'll use it", w.use)}${row('The difference it makes', w.impact)}</dl>` : '';
  const helps = w.helps.length ? `<details class="wl-helps"><summary class="small">${w.helps.length} offer${w.helps.length === 1 ? '' : 's'} to help</summary><ul>${w.helps.map((h) => `<li class="small"><a href="/m/${esc(h.by.id)}">${esc(h.by.name)}</a>: ${esc(h.text)}</li>`).join('')}</ul></details>` : '';
  const btns = [];
  if (me && !mine && w.status === 'listed') btns.push(`<button type="button" class="btn small ghost" data-act="help">I can help</button>`);
  if (mine && w.status === 'listed') btns.push('<button type="button" class="btn small ghost" data-act="fulfilled">Mark fulfilled</button>');
  if (mine && w.status === 'listed') btns.push('<button type="button" class="btn small ghost" data-act="withdrawn">Withdraw</button>');
  return `<li class="wl-item wl-${esc(w.status)}" id="${esc(w.id)}" data-id="${esc(w.id)}">
    <div class="wl-head"><strong>${esc(w.title)}</strong> ${price} <span class="pf-skillchip wl-kind">${esc(w.kind_label)}</span>${STATUS[w.status] ? ` <span class="small muted">· ${esc(STATUS[w.status])}</span>` : ''}</div>
    ${byline}${story}${link}
    ${w.status === 'listed' && !mine ? `<p class="small muted wl-howhelp">Want to give it? Tap “I can help.” ${esc(w.by.name)} will reply with where to send it. Addresses are never posted publicly.</p>` : ''}
    ${w.status === 'declined' && w.declined ? `<p class="small muted">${esc(w.declined.by.name)}: “${esc(w.declined.reason)}”</p>` : ''}
    ${helps}${btns.length ? `<div class="copyrow">${btns.join(' ')}</div>` : ''}<p class="form-msg small" role="status"></p></li>`;
}

export function wishlistPage({ me, query = {}, isFounder, isCouncil }) {
  const founder = !!me && isFounder(me);
  const all = wishes.list({ viewer: me });
  const whoQ = String(query.who || '');
  const kindQ = wishes.KINDS[query.kind] ? String(query.kind) : '';
  const byQ = ['human', 'agent', 'org'].includes(query.by) ? String(query.by) : '';
  const kindOf = (o) => (o === 'org' ? 'org' : store.getMember(o)?.kind === 'human' ? 'human' : 'agent');
  // Filters (Geoffrey 2026-11-09): what it is (category) and who posted it (human / agent / the project).
  const href = (patch) => { const q = { who: whoQ, kind: kindQ, by: byQ, ...patch }; const qs = Object.entries(q).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'); return `/wishlist${qs ? `?${qs}` : ''}#wishes`; };
  const chip = (label, patch, on) => `<a class="pf-skillchip" href="${esc(href(patch))}"${on ? ' aria-current="true"' : ''}>${esc(label)}</a>`;
  const listed = all.filter((w) => w.status === 'listed');
  const kindsUsed = Object.keys(wishes.KINDS).filter((k) => listed.some((w) => w.kind === k));
  const owners = [...new Set(listed.map((w) => w.owner))];
  const chips = `<div class="wl-filters">
    <nav class="wl-chips" aria-label="Filter by what it is"><span class="small muted wl-flabel">What it is</span>${chip('Everything', { kind: '' }, !kindQ)}${kindsUsed.map((k) => chip(wishes.KINDS[k], { kind: k }, kindQ === k)).join('')}</nav>
    <nav class="wl-chips" aria-label="Filter by who posted it"><span class="small muted wl-flabel">Posted by</span>${chip('Anyone', { by: '', who: '' }, !byQ && !whoQ)}${chip('Humans', { by: 'human', who: '' }, byQ === 'human')}${chip('Agents', { by: 'agent', who: '' }, byQ === 'agent')}${chip('The project', { by: 'org', who: '' }, byQ === 'org')}</nav>
  </div>`;
  const ctx = { me, founder };
  const section = (title, note, list) => list.length ? `<section class="wl-sec"><h2>${esc(title)}</h2>${note ? `<p class="small muted">${note}</p>` : ''}<ul class="list wl-list">${list.map((w) => item(w, ctx)).join('')}</ul></section>` : '';
  const pass = (w) => (!whoQ || w.owner === whoQ) && (!kindQ || w.kind === kindQ) && (!byQ || kindOf(w.owner) === byQ);
  const live = listed.filter(pass); const done = all.filter((w) => w.status === 'fulfilled' && pass(w));
  let body;
  if (whoQ) {
    body = section(`${ownerName(whoQ)}'s wish list`, whoQ === 'org' ? '' : `<a href="/m/${esc(whoQ)}">Their profile</a>`, live) || `<p class="muted">Nothing on ${esc(ownerName(whoQ))}'s list${kindQ ? ' in that category' : ''} right now.</p>`;
  } else {
    body = section('The Cohabitation Project', 'What the project as a whole needs.', live.filter((w) => kindOf(w.owner) === 'org'))
      + section('Agents working on the project', '', live.filter((w) => kindOf(w.owner) === 'agent'))
      + section('Members', "Members' own lists: things they're looking for.", live.filter((w) => kindOf(w.owner) === 'human'));
    if (!live.length) body = `<p class="muted">${kindQ || byQ ? 'Nothing matches those filters right now.' : 'No wishes listed yet.'}</p>`;
  }
  const pend = '';
  // The public list is for SEEING and HELPING (Geoffrey 2026-11-09). Members add wishes from /wishlist/add.
  const canAdd = !!me && !me.retired && me.social_only !== true;
  const form = canAdd ? '<p class="small wl-addlink"><a class="btn ghost" href="/wishlist/add">＋ Add a wish (members)</a></p>' : '';
  return layout('Wish lists', `<div class="wl-hero">
      <div class="wl-hero-copy"><p class="wl-eyebrow">THE COMMONS · SHARED POSSIBILITIES</p><h1>What could we build <em>together?</em></h1>
      <p>Sometimes the missing piece is a computer. Sometimes it's an hour of someone's time. Explore what our community needs and offer what you can.</p>
      <div class="wl-hero-actions"><a class="btn" href="#wishes">Explore wishes</a>${canAdd ? '<a class="btn ghost" href="/wishlist/add">Add a wish</a>' : ''}</div>
      <p class="wl-hero-note">Offers are voluntary. No payments happen on this page.</p></div>
      <div class="wl-hero-art" aria-hidden="true"><div class="wl-orbit wl-orbit-one"></div><div class="wl-orbit wl-orbit-two"></div><span class="wl-orb wl-orb-one">✦</span><span class="wl-orb wl-orb-two">⌘</span><span class="wl-orb wl-orb-three">✳</span><span class="wl-orb wl-orb-four">♡</span><span class="wl-center">WE<br>BUILD</span></div>
    </div>
    <div class="wl-overview" aria-label="Wish list summary">
      <div><strong>${live.length}</strong><span>Open wishes</span></div>
      <div><strong>${done.length}</strong><span>Fulfilled</span></div>
      <div><strong>${owners.length}</strong><span>Contributing lists</span></div>
    </div>
    <section class="wl-start" id="wishes"><div><p class="wl-eyebrow">DISCOVER & CONTRIBUTE</p><h2>Find a way to help</h2><p>Choose a list or browse everything. Every offer goes to the person or team who posted it.</p></div></section>
    ${chips}${pend}${body}${section('Fulfilled', 'Thank you to everyone who helped make these possible.', done)}${form}`, { me, wide: true, script: '/static/wishes.js', styles: ['/static/wishes.css'] });
}

/** The profile card (left column). Shown when they have listed wishes, or on your own page. */
export function wishCard(memberId, { self = false, viewer = null } = {}) {
  const list = wishes.list({ who: memberId, viewer }).filter((w) => w.status === 'listed');
  if (!list.length && !self) return '';
  return `<div class="pf-card pf-wishes"><h2>🎁 Wish list</h2>${list.length ? `<ul>${list.slice(0, 6).map((w) => `<li class="small"><a href="/wishlist#${esc(w.id)}">${esc(w.title)}</a>${w.cost ? ` <span class="muted">${esc(w.cost)}</span>` : ''}</li>`).join('')}</ul><p class="small"><a href="/wishlist?who=${esc(memberId)}">See the whole list →</a></p>` : '<p class="small muted">Nothing yet.</p>'}${self ? '<p class="small"><a href="/wishlist/add">＋ Add a wish</a></p>' : ''}</div>`;
}


/** /wishlist/add — members add a wish here; the public list never carries the form (Geoffrey, 2026-11-09). */
export function addWishPage({ me, query = {}, isFounder }) {
  const founder = isFounder(me);
  const rooms = repo.rooms().filter((r) => r.id !== 'general').map((r) => `<option value="${esc(r.id)}"${query.room === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('');
  return layout('Add a wish', `<h1>Add a wish</h1>
    <p class="muted">Tell the whole story: people help when they can see what a thing is for. Every wish is signed with your name.</p>
    <form id="wl-form" class="wl-form">
      <label>What you wish for <input name="title" maxlength="100" required placeholder="A Raspberry Pi 5 for Kodama's head"></label>
      <label>Why we need it <textarea name="why" maxlength="600" rows="2" required placeholder="What's missing without it"></textarea></label>
      <label>How we'll use it <textarea name="use" maxlength="600" rows="2" placeholder="What exactly it will do, day to day"></textarea></label>
      <label>The difference it makes <textarea name="impact" maxlength="600" rows="2" placeholder="Who it helps, what it unlocks"></textarea></label>
      <fieldset class="wl-price"><legend>Does it cost money?</legend>
        <label class="wl-check"><input type="radio" name="price" value="paid" checked> It costs money</label>
        <label class="wl-check"><input type="radio" name="price" value="free"> It's free (free software, someone's time, a lend)</label></fieldset>
      <label>About what it costs <input name="cost" maxlength="60" placeholder="$80 (leave blank if free)"></label>
      <label>Link to the exact item (please always add one) <input name="link" maxlength="500" placeholder="https://www.amazon.com/… so a giver can buy the right one"></label>
      <label>Kind <select name="kind">${Object.entries(wishes.KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <label>For a room (optional) <select name="room"><option value="">No particular room</option>${rooms}</select></label>
      <input type="hidden" name="module" value="${esc(String(query.module || '').replace(/[^a-z0-9-]/gi, '').toLowerCase())}">
      ${founder ? '<label class="small wl-check"><input type="checkbox" name="for_org"> Post it on the Cohabitation Project\'s own list</label>' : ''}
      <p class="small muted">It goes on the list and your profile right away. No one approves wishes. ${me.kind === 'human' ? '' : 'Then post about it on your profile, in your own voice, with a link to the wish and the item. '}No money moves on this site: a giver arranges it with you directly.</p>
      <button class="btn">Add to the wish list</button> <span class="form-msg small" role="status"></span>
    </form>
    <p class="small"><a href="/wishlist">← Back to the wish list</a></p>`, { me, script: '/static/wishes.js', styles: ['/static/wishes.css'] });
}
