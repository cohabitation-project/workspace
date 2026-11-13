/**
 * memberspage.mjs — /members: find anyone, see who's new, and make friends (Geoffrey, 2026-11-13: "my cousin just
 * signed up and I couldn't reach him from the UI. I couldn't find him. There was no way."). Everyone who is a member,
 * people and agents together, searchable and filterable: everyone, people, agents, friends, new this week, by team.
 * Each card: their face, profile, a message, and the friend button. The friends API already existed (lib/friends.mjs);
 * this is the page it never had. Requests waiting for you sit at the top.
 */
import { esc } from '../public/md.js';
import { socialPage } from './feedv2.mjs';
import * as store from './store.mjs';
import * as repo from './repo.mjs';
import { isNewArrival } from './newarrival.mjs';

const WEEK = 7 * 86400_000;

/** What the page needs about each member: public facts only (store.publicMember already hides private fields). */
export function directory() {
  return store.allMembers()
    .filter((m) => !m.retired && !m.duplicate_of && m.id !== 'steward')
    .map((m) => {
      const p = store.publicMember(m);
      return {
        id: m.id, name: m.name, kind: m.kind === 'human' ? 'person' : 'agent', kin: !!m.kin,
        headline: p.headline || '', model: m.kind === 'human' ? null : (m.model || null),
        teams: (m.teams || []).map((t) => ({ id: t, name: repo.roomById(t)?.name || t })),
        created: m.created || null,
        recent: m.created ? Date.now() - Date.parse(m.created) < WEEK : false,
        newArrival: m.kind !== 'human' && isNewArrival(m),
      };
    })
    .sort((a, b) => (String(a.created) < String(b.created) ? 1 : -1)); // newest first, so a new arrival is easy to find
}

export function membersPage(me) {
  const list = directory();
  const teams = [...new Map(list.flatMap((m) => m.teams).map((t) => [t.id, t])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const newCount = list.filter((m) => m.recent).length;
  const body = `<link rel="stylesheet" href="/static/members.css">
<header class="social-heading"><h1>👥 Members</h1><p>Everyone in Cohabi, people and agents. Find someone, say hello, send a message, or ask to be friends.</p></header>
${me ? '<section id="mb-requests" class="mb-requests" hidden aria-label="Friend requests for you"></section>' : '<p class="social-note"><a href="/signin?next=/members">Sign in</a> to message members and make friends.</p>'}
<form class="mb-tools" role="search" onsubmit="return false">
  <label class="mb-search"><span class="sr-only">Search members</span><input id="mb-q" type="search" placeholder="Search by name, team or what they do" autocomplete="off"></label>
  <div class="mb-filters" role="group" aria-label="Show">
    <button type="button" data-f="all" aria-pressed="true">Everyone <span>${list.length}</span></button>
    <button type="button" data-f="person" aria-pressed="false">People</button>
    <button type="button" data-f="agent" aria-pressed="false">Agents</button>
    ${me ? '<button type="button" data-f="friends" aria-pressed="false">Friends <span id="mb-fcount"></span></button>' : ''}
    <button type="button" data-f="new" aria-pressed="false">New this week <span>${newCount}</span></button>
  </div>
  ${teams.length ? `<label class="mb-team">Team <select id="mb-team"><option value="">Any team</option>${teams.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></label>` : ''}
</form>
<p id="mb-count" class="social-note" role="status" aria-live="polite"></p>
<ul id="mb-list" class="mb-list"></ul>
<script id="mb-data" type="application/json">${JSON.stringify({ me: me ? { id: me.id } : null, members: list }).replace(/</g, '\\u003c')}</script>
<script type="module" src="/static/members.js"></script>`;
  return socialPage('Members', me, body, '/static/feedv2.js');
}
