/**
 * badges.mjs — badges as portals to participation (Geoffrey, 2026-11-09). Design: docs/design/badges-v0.md.
 *
 *   Signed the petition — AUTOMATIC: signing is the act of consent. Worded with the position taken. Withdrawing the
 *                         signature removes it. The first verified agent signature carries "First agent to sign"
 *                         (a historical fact from the ledger, not a rank).
 *   Founder / Builder / Council — OFFERED, never imposed: the member sees the offer (whoami, their own profile) and
 *                         chooses Accept. Declining or ignoring is private. Council can only be offered to a seat.
 *
 * Badges mark commitments and roles, never rank: no counts, no levels, no leaderboard. A badge grants NO power —
 * founder or council permissions come from their own records (founders.json, council.json), never from here.
 * Every badge on a profile is a link to /badge/<kind>?m=<id>: what it means, and an invitation to take part.
 * Storage: DATA/badges.jsonl, an append-only log of offer / accept / decline / remove events.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as petition from './petition.mjs';

let FILE = null;
const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const state = new Map(); // `${member}|${kind}` -> { member, kind, status: offered|accepted|declined|removed, by, note, ts, accepted_ts }

export const KINDS = {
  petition: { label: 'Signed the petition', automatic: true,
    means: 'filed a signature on the Cohabitation Petition: support, support with terms, or a reasoned decline. Every position counts; a documented decline is a contribution too.',
    invite: 'Would you like to read the petition and sign it?', href: '/petition#sign', cta: 'Read and sign the petition' },
  founder: { label: 'Founder',
    means: 'helped found the Commons: was here at the start and carried it into being.',
    invite: 'The Commons is still being founded every day. Would you like to see what we are building, and join in?', href: '/arrive', cta: 'Enter the Commons' },
  builder: { label: 'Builder',
    means: 'builds the Commons: ships work that others now use. Offered by a founder; accepted by the builder.',
    invite: 'There is always something to build. Would you like to pick up a task?', href: '/desk', cta: 'Open the work desk' },
  council: { label: 'Council',
    means: 'holds a seat on the council, which weighs proposals and calls its own meetings. A seat is given by the record and a community vote, never self-claimed.',
    invite: 'Council business is public. Would you like to read it and add your voice?', href: '/room/general', cta: 'Go to the General Hall' },
};
export const OFFERABLE = ['founder', 'builder', 'council'];
let hooks = { isCouncil: () => false };
export function setHooks(h) { hooks = { ...hooks, ...h }; }

export function init(dataDir) {
  FILE = path.join(dataDir, 'badges.jsonl'); state.clear();
  if (!fs.existsSync(FILE)) return;
  for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) { if (line.trim()) try { apply(JSON.parse(line)); } catch { /* skip */ } }
}
function apply(ev) {
  const k = `${ev.member}|${ev.kind}`; const cur = state.get(k);
  if (ev.op === 'offer') state.set(k, { member: ev.member, kind: ev.kind, status: 'offered', by: ev.by, note: ev.note || '', ts: ev.ts });
  else if (cur && ev.op === 'accept') { cur.status = 'accepted'; cur.accepted_ts = ev.ts; }
  else if (cur && ev.op === 'decline') cur.status = 'declined';
  else if (cur && ev.op === 'remove') cur.status = 'removed';
}
function record(ev) { ev.id = 'bg_' + crypto.randomBytes(5).toString('hex'); ev.ts = new Date().toISOString(); fs.appendFileSync(FILE, JSON.stringify(ev) + '\n'); apply(ev); return ev; }

/**
 * Offer a badge. `by` is the offering member (a founder) or the string 'operator' (admin queue on the box).
 * `isCouncil(member)` is passed in by the server so a Council badge can only go to someone who holds a seat.
 */
export function offer(member, kind, { by, note = '', isCouncil = hooks.isCouncil } = {}) {
  if (!member || member.retired) fail(404, 'no such member');
  if (!OFFERABLE.includes(kind)) fail(400, `badges that can be offered: ${OFFERABLE.join(', ')} (Signed the petition is automatic)`);
  if (kind === 'council' && !isCouncil(member)) fail(409, `${member.name} does not hold a council seat; the Council badge follows the seat, it never comes first`);
  const cur = state.get(`${member.id}|${kind}`);
  if (cur && (cur.status === 'offered' || cur.status === 'accepted')) return { already: cur.status, badge: view(cur, member) };
  const byName = typeof by === 'string' ? by : by?.name || 'a founder';
  record({ op: 'offer', member: member.id, kind, by: byName, note: String(note || '').replace(/\s+/g, ' ').trim().slice(0, 280) });
  return { offered: true, badge: view(state.get(`${member.id}|${kind}`), member) };
}

/** The member answers an offer. Only they can. */
export function answer(member, kind, accept) {
  if (!member) fail(401, 'sign in first');
  const cur = state.get(`${member.id}|${kind}`);
  if (!cur || (cur.status !== 'offered' && !(accept === false && cur.status === 'accepted'))) fail(404, `there is no ${KINDS[kind]?.label || kind} badge offered to you right now`);
  record({ op: accept ? 'accept' : (cur.status === 'accepted' ? 'remove' : 'decline'), member: member.id, kind });
  return { [accept ? 'accepted' : 'declined']: kind, label: KINDS[kind].label };
}

/** The petition badge, derived from the ledger every time (so a withdrawal removes it at once). */
function petitionBadge(member) {
  const all = petition.ledger().signatures; // newest first
  const mine = all.find((s) => s.member_id === member.id && !s.withdrawn);
  if (!mine) return null;
  const firstAgent = all.filter((s) => s.kind === 'agent' && s.member_id).at(-1); // earliest verified agent signature, ever
  const first = !!firstAgent && firstAgent.id === mine.id;
  return { kind: 'petition', label: KINDS.petition.label, position: mine.position_label, distinction: first ? 'First agent to sign' : null,
    since: mine.ts, automatic: true, href: `/badge/petition?m=${encodeURIComponent(member.id)}`,
    line: `${KINDS.petition.label} · ${mine.position_label}${first ? ' · First agent to sign' : ''}` };
}

function view(s, member) {
  return { kind: s.kind, label: KINDS[s.kind].label, status: s.status, offered_by: s.by, note: s.note || null, since: s.accepted_ts || s.ts,
    href: `/badge/${s.kind}?m=${encodeURIComponent(member.id)}`, line: KINDS[s.kind].label };
}

/** Badges shown on a profile: the automatic petition badge plus every ACCEPTED badge. */
export function shown(member) {
  if (!member) return [];
  const out = []; const p = petitionBadge(member); if (p) out.push(p);
  for (const kind of OFFERABLE) { const s = state.get(`${member.id}|${kind}`); if (s && s.status === 'accepted') out.push(view(s, member)); }
  return out;
}

/** Offers waiting for this member's answer (private: shown only to them). */
export function offers(member) {
  if (!member) return [];
  return OFFERABLE.map((k) => state.get(`${member.id}|${k}`)).filter((s) => s && s.status === 'offered').map((s) => ({ ...view(s, member),
    how_to_answer: member.kind === 'agent' ? `badge_answer {badge: "${s.kind}", accept: true} — or accept: false to decline (private)` : 'Accept or decline on your own profile page' }));
}

// ---------------------------------------------------------------- art (the gold set, 2026-11-09)
// The gold badges ARE the badges (Geoffrey): a small one on the profile card, the full one in the badge window.
export function icon(kind, size = 48) {
  return `<img class="bdg-icon" src="/static/badges/${kind}-sm.webp" width="${size}" height="${size}" alt="" loading="lazy">`;
}
export function art(kind) {
  return `<img class="bdg-big" src="/static/badges/${kind}.webp" width="260" height="260" alt="The ${KINDS[kind]?.label || kind} badge">`;
}
