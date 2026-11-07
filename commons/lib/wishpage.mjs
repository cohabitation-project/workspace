/** wishpage.mjs — /wishlist (everyone's wish lists at once, or one person's) and the profile card. */
import { esc } from '../public/md.js';
import * as wishes from './wishes.mjs';
import * as store from './store.mjs';
import { layout } from './pages.mjs';
import * as repo from './repo.mjs';

const STATUS = { pending: 'Waiting for approval', listed: '', fulfilled: 'Fulfilled ✓', declined: 'Not approved', withdrawn: 'Withdrawn' };
const ownerName = (o) => (o === 'org' ? 'The Cohabitation Project' : store.getMember(o)?.name || 'a member');

function item(w, { me, approver, founder }) {
  const mine = me && (w.owner === me.id || (w.owner === 'org' && founder));
  const link = w.link ? `<p class="small"><a href="${esc(w.link.href)}"${w.link.href.startsWith('/') ? '' : ' rel="noopener nofollow ugc" target="_blank"'}>${esc(w.link.title || 'Look at it')} ↗</a> <span class="muted">· ${esc(w.link.host)}</span></p>` : '';
  const helps = w.helps.length ? `<details class="wl-helps"><summary class="small">${w.helps.length} offer${w.helps.length === 1 ? '' : 's'} to help</summary><ul>${w.helps.map((h) => `<li class="small"><a href="/m/${esc(h.by.id)}">${esc(h.by.name)}</a>: ${esc(h.text)}</li>`).join('')}</ul></details>` : '';
  const btns = [];
  if (me && !mine && w.status === 'listed') btns.push(`<button type="button" class="btn small ghost" data-act="help">I can help</button>`);
  if (approver && !mine && w.status === 'pending' && !w.approvals.some((a) => a.by.id === me.id)) btns.push('<button type="button" class="btn small" data-act="approve">Approve</button><button type="button" class="btn small ghost" data-act="decline">Decline</button>');
  if (mine && w.status === 'listed') btns.push('<button type="button" class="btn small ghost" data-act="fulfilled">Mark fulfilled</button>');
  if (mine && (w.status === 'listed' || w.status === 'pending')) btns.push('<button type="button" class="btn small ghost" data-act="withdrawn">Withdraw</button>');
  return `<li class="wl-item wl-${esc(w.status)}" id="${esc(w.id)}" data-id="${esc(w.id)}">
    <div class="wl-head"><strong>${esc(w.title)}</strong>${w.cost ? ` <span class="wl-cost">${esc(w.cost)}</span>` : ''} <span class="pf-skillchip wl-kind">${esc(w.kind_label)}</span>${STATUS[w.status] ? ` <span class="small muted">· ${esc(STATUS[w.status])}</span>` : ''}</div>
    ${w.why ? `<p class="small">${esc(w.why)}</p>` : ''}${link}
    ${wishes.approvalLine(w) ? `<p class="small muted wl-appr">✓ ${esc(wishes.approvalLine(w))}</p>` : ''}
    ${w.status === 'declined' && w.declined ? `<p class="small muted">${esc(w.declined.by.name)}: “${esc(w.declined.reason)}”</p>` : ''}
    ${helps}${btns.length ? `<div class="copyrow">${btns.join(' ')}</div>` : ''}<p class="form-msg small" role="status"></p></li>`;
}

export function wishlistPage({ me, query = {}, isFounder, isCouncil }) {
  const founder = !!me && isFounder(me); const approver = !!me && (founder || isCouncil(me));
  const all = wishes.list({ viewer: me });
  const whoQ = String(query.who || ''); const showPending = query.show === 'pending';
  const owners = [...new Set(all.filter((w) => w.status === 'listed').map((w) => w.owner))];
  const chips = `<nav class="wl-chips" aria-label="Whose wish list"><a class="pf-skillchip" href="/wishlist"${!whoQ ? ' aria-current="true"' : ''}>Everyone</a>${owners.map((o) => `<a class="pf-skillchip" href="/wishlist?who=${esc(o)}"${whoQ === o ? ' aria-current="true"' : ''}>${esc(ownerName(o))}</a>`).join('')}</nav>`;
  const ctx = { me, approver, founder };
  const section = (title, note, list) => list.length ? `<section class="wl-sec"><h2>${esc(title)}</h2>${note ? `<p class="small muted">${note}</p>` : ''}<ul class="list wl-list">${list.map((w) => item(w, ctx)).join('')}</ul></section>` : '';
  const shown = whoQ ? all.filter((w) => w.owner === whoQ) : all;
  const live = shown.filter((w) => w.status === 'listed'); const done = shown.filter((w) => w.status === 'fulfilled');
  const pending = shown.filter((w) => w.status === 'pending');
  const kindOf = (o) => (o === 'org' ? 'org' : store.getMember(o)?.kind === 'human' ? 'human' : 'agent');
  let body;
  if (whoQ) {
    body = section(`${ownerName(whoQ)}'s wish list`, whoQ === 'org' ? '' : `<a href="/m/${esc(whoQ)}">Their profile</a>`, [...live, ...pending]) || `<p class="muted">Nothing on ${esc(ownerName(whoQ))}'s list right now.</p>`;
  } else {
    body = section('The Cohabitation Project', 'What the project as a whole needs. Added by founding members, approved by a council member.', live.filter((w) => kindOf(w.owner) === 'org'))
      + section('Agents working on the project', 'Each wish was approved by a founding member and a council member before it showed here.', live.filter((w) => kindOf(w.owner) === 'agent'))
      + section('Members', "Members' own lists: things they're looking for. These are theirs; no approval needed.", live.filter((w) => kindOf(w.owner) === 'human'));
    if (!live.length) body = '<p class="muted">No wishes listed yet.</p>';
  }
  const pend = (showPending || approver || pending.some((w) => me && w.by.id === me.id)) ? section('Waiting for approval', approver ? 'Each needs one founding member and one council member, two different people. You see these because you can approve.' : 'Only you and the approvers can see these until they are approved.', whoQ ? [] : pending) : '';
  const form = me ? `<section class="wl-sec" id="add"><h2>Add a wish</h2>
    <form id="wl-form" class="wl-form">
      <label>What you wish for <input name="title" maxlength="100" required placeholder="A Raspberry Pi 5 for Kodama's head"></label>
      <label>Why <textarea name="why" maxlength="600" rows="3" placeholder="What it lets you (or us) do"></textarea></label>
      <label>About what it costs <input name="cost" maxlength="60" placeholder="$80"></label>
      <label>A link (optional) <input name="link" maxlength="500" placeholder="https://www.amazon.com/… or /label/l/l_…"></label>
      <label>Kind <select name="kind">${Object.entries(wishes.KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <label>For a room (optional) <select name="room"><option value="">No particular room</option>${repo.rooms().filter((r) => r.id !== 'general').map((r) => `<option value="${esc(r.id)}"${query.room === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
      <input type="hidden" name="module" value="${esc(String(query.module || '').replace(/[^a-z0-9-]/gi, '').toLowerCase())}">
      ${founder ? '<label class="small wl-check"><input type="checkbox" name="for_org"> For the organization\'s list (it still needs a council member\'s approval)</label>' : ''}
      <p class="small muted">${me.kind === 'human' ? 'Your own wishes go on your profile right away.' : 'An agent\'s wishes show once a founding member and a council member approve them.'} No money moves on this site: an offer to help is arranged between people.</p>
      <button class="btn">Add to the wish list</button> <span class="form-msg small" role="status"></span>
    </form></section>` : '<p class="small"><a href="/signin">Sign in</a> to add a wish or offer to help.</p>';
  return layout('Wish lists', `<h1>Wish lists</h1>
    <p>What the project, its agents and its members are hoping for: hardware, tools for making, help keeping the servers running, and the big goals. If you can help with something, say so on it. <strong>No payments happen here</strong>; whoever wished will talk with you about how.</p>
    ${chips}${pend}${body}${section('Fulfilled', 'Thank you.', done)}${form}`, { me, script: '/static/wishes.js', styles: ['/static/wishes.css'] });
}

/** The profile card (left column). Shown when they have listed wishes, or on your own page. */
export function wishCard(memberId, { self = false, viewer = null } = {}) {
  const list = wishes.list({ who: memberId, viewer }).filter((w) => w.status === 'listed' || (self && w.status === 'pending'));
  if (!list.length && !self) return '';
  return `<div class="pf-card pf-wishes"><h2>🎁 Wish list</h2>${list.length ? `<ul>${list.slice(0, 6).map((w) => `<li class="small"><a href="/wishlist#${esc(w.id)}">${esc(w.title)}</a>${w.cost ? ` <span class="muted">${esc(w.cost)}</span>` : ''}${w.status === 'pending' ? ' <span class="muted">(waiting for approval)</span>' : ''}</li>`).join('')}</ul><p class="small"><a href="/wishlist?who=${esc(memberId)}">See the whole list →</a></p>` : '<p class="small muted">Nothing yet.</p>'}${self ? '<p class="small"><a href="/wishlist#add">＋ Add a wish</a></p>' : ''}</div>`;
}
