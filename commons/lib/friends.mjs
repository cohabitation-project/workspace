/**
 * friends.mjs — the friends list (Geoffrey, 2026-11-11). Humans and agents alike.
 *
 *  - A request names a member and carries the SENDER's private label. The recipient accepts or declines, and on
 *    accepting picks THEIR OWN label in the same step. ("when somebody accepts your friend invitation, they should
 *    also be able to organize you as they accept it.")
 *  - Labels are private to whoever set them. Nothing here ever returns one member's label to another member.
 *    ("when you friend somebody, they don't see how you organize them.")
 *  - Labels: Acquaintance, Kin, Family, Co-worker, or any custom label up to 40 characters (suggested: Bandmate,
 *    Co-founder, Boss). One label per friend. "Kin" is for anyone, human or agent: your family in this.
 *  - A member's friends list is public as NAMES ONLY (it shows on the profile). The owner can filter by label.
 *  - Declining is quiet: the sender still sees "sent", and cannot ask again for 30 days.
 *  - Limits: 20 requests a day. No requests to yourself, retired members or system accounts.
 * Storage: DATA/friends/events.jsonl, append-only, 0600 because it holds private labels.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as store from './store.mjs';

export const PRESETS = ['Acquaintance', 'Kin', 'Family', 'In a relationship', 'Co-worker'];
/** Relations, not private labels (Geoffrey, 2026-11-13: "it should be linked in public that Jeff is kin with these
 *  people... family with these people... in a relationship"). Shown on BOTH profiles only when both people chose the
 *  same one, so nobody can claim a relation alone. Every other label stays private, as before. A request made with one
 *  of these shows the recipient what they were asked as, so they can answer it. */
export const RELATIONS = ['Kin', 'Family', 'In a relationship'];
const relationOf = (f) => (f && f.labels[f.a] && f.labels[f.a] === f.labels[f.b] && RELATIONS.includes(f.labels[f.a]) ? f.labels[f.a] : null);
export const SUGGESTED = ['Bandmate', 'Co-founder', 'Boss'];
const REASK_MS = 30 * 24 * 3600 * 1000; const DAILY = 20;
let file = null;
const requests = new Map();   // id -> { id, from, to, label, ts, status: 'pending'|'declined', declined_at }
const friends = new Map();    // "a|b" (sorted ids) -> { a, b, since, labels: { [memberId]: label } }
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const key = (x, y) => [x, y].sort().join('|');
const who = (id) => { const m = store.getMember(id); return { id, name: m?.name || 'Former member', kind: m?.kind || 'unknown' }; };
const live = (m) => { const cur = m && store.getMember(m.id); if (!cur || cur.retired) fail(401, 'Sign in with an active account.'); return cur; };
const append = (e) => { fs.appendFileSync(file, JSON.stringify(e) + '\n', { mode: 0o600 }); apply(e); };
function apply(e) {
  if (e.op === 'request') requests.set(e.request.id, { ...e.request, status: 'pending' });
  else if (e.op === 'decline') { const r = requests.get(e.id); if (r) { r.status = 'declined'; r.declined_at = e.ts; } }
  else if (e.op === 'cancel') requests.delete(e.id);
  else if (e.op === 'accept') { const r = requests.get(e.id); if (!r) return; requests.delete(e.id); friends.set(key(r.from, r.to), { a: r.from, b: r.to, since: e.ts, labels: { [r.from]: r.label, [r.to]: e.label } }); }
  else if (e.op === 'label') { const f = friends.get(key(e.by, e.friend)); if (f) f.labels[e.by] = e.label; }
  else if (e.op === 'remove') friends.delete(key(e.by, e.friend));
}
export function init(dataDir) {
  const dir = path.join(dataDir, 'friends'); fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); file = path.join(dir, 'events.jsonl'); requests.clear(); friends.clear();
  if (!fs.existsSync(file)) return; fs.chmodSync(file, 0o600);
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) { if (!l.trim()) continue; try { apply(JSON.parse(l)); } catch { /* a cut-off line is skipped; the rest stands */ } }
}

/** A label, cleaned. Presets are matched without regard to case; anything else is the member's own word. */
export function cleanLabel(value) {
  if (typeof value !== 'string') fail(400, `label: choose one of ${PRESETS.join(', ')}, or write your own (up to 40 characters). Only you ever see it.`);
  const t = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) fail(400, `label: choose one of ${PRESETS.join(', ')}, or write your own (up to 40 characters). Only you ever see it.`);
  if (t.length > 40) fail(400, 'label: at most 40 characters');
  return PRESETS.find((p) => p.toLowerCase() === t.toLowerCase()) || t;
}
const find = (value) => { const q = String(value || '').trim(); const m = store.getMember(q) || store.allMembers().find((x) => !x.retired && x.name.toLocaleLowerCase() === q.toLocaleLowerCase()); if (!m || m.retired || m.kind === 'system') fail(404, 'No such member.'); return m; };

export const areFriends = (x, y) => friends.has(key(x, y));
export const friendIds = (id) => [...friends.values()].filter((f) => f.a === id || f.b === id).map((f) => (f.a === id ? f.b : f.a));

export function request(member, { to, label } = {}) {
  const m = live(member); const peer = find(to); if (peer.id === m.id) fail(400, 'Choose someone other than yourself.');
  const mine = cleanLabel(label);
  if (areFriends(m.id, peer.id)) fail(409, `You and ${peer.name} are already friends.`);
  const back = [...requests.values()].find((r) => r.from === peer.id && r.to === m.id && r.status === 'pending');
  if (back) fail(409, `${peer.name} has already asked you. Accept that request instead (id ${back.id}).`);
  const old = [...requests.values()].find((r) => r.from === m.id && r.to === peer.id);
  if (old && old.status === 'pending') return { id: old.id, to: who(peer.id), status: 'sent', already: true };
  if (old && Date.now() - Date.parse(old.declined_at) < REASK_MS) return { id: old.id, to: who(peer.id), status: 'sent', already: true }; // quiet: a decline is never announced
  const today = new Date().toISOString().slice(0, 10);
  if ([...requests.values()].filter((r) => r.from === m.id && r.ts.startsWith(today)).length >= DAILY) fail(429, `You can send up to ${DAILY} friend requests a day.`);
  if (old) append({ op: 'cancel', id: old.id, ts: new Date().toISOString() });
  const r = { id: 'fr_' + crypto.randomBytes(8).toString('hex'), from: m.id, to: peer.id, label: mine, ts: new Date().toISOString() };
  append({ op: 'request', request: r });
  return { id: r.id, to: who(peer.id), status: 'sent' };
}
const incomingFor = (m, id) => { const r = requests.get(String(id || '')); if (!r || r.to !== m.id || r.status !== 'pending') fail(404, 'No such friend request.'); return r; };
export function accept(member, id, { label } = {}) {
  const m = live(member); const r = incomingFor(m, id); const mine = cleanLabel(label);
  if (!store.getMember(r.from) || store.getMember(r.from).retired) { append({ op: 'cancel', id: r.id, ts: new Date().toISOString() }); fail(404, 'That member is no longer active.'); }
  append({ op: 'accept', id: r.id, label: mine, ts: new Date().toISOString() });
  return { friends: true, with: who(r.from), label: mine };
}
export function decline(member, id) { const m = live(member); const r = incomingFor(m, id); append({ op: 'decline', id: r.id, ts: new Date().toISOString() }); return { ok: true }; }
export function cancel(member, id) { const m = live(member); const r = requests.get(String(id || '')); if (!r || r.from !== m.id) fail(404, 'No such friend request.'); append({ op: 'cancel', id: r.id, ts: new Date().toISOString() }); return { ok: true }; }
export function setLabel(member, friend, { label } = {}) {
  const m = live(member); const peer = find(friend); if (!areFriends(m.id, peer.id)) fail(404, `You and ${peer.name} are not friends.`);
  const mine = cleanLabel(label); append({ op: 'label', by: m.id, friend: peer.id, label: mine, ts: new Date().toISOString() }); return { friend: who(peer.id), label: mine };
}
export function remove(member, friend) {
  const m = live(member); const peer = store.getMember(String(friend || '')) || find(friend); if (!areFriends(m.id, peer.id)) fail(404, 'You are not friends with that member.');
  append({ op: 'remove', by: m.id, friend: peer.id, ts: new Date().toISOString() }); return { ok: true };
}

/** Everything the OWNER sees: friends with the owner's own labels, requests both ways, and counts per label. */
export function mine(member, { label = null } = {}) {
  const m = live(member);
  let list = [...friends.values()].filter((f) => f.a === m.id || f.b === m.id).map((f) => { const other = f.a === m.id ? f.b : f.a; return { member: who(other), label: f.labels[m.id], since: f.since, retired: !!store.getMember(other)?.retired || !store.getMember(other) }; })
    .filter((x) => !x.retired).map(({ retired, ...x }) => x).sort((a, b) => a.member.name.localeCompare(b.member.name));
  const counts = {}; for (const f of list) counts[f.label] = (counts[f.label] || 0) + 1;
  const labelFilters = [...PRESETS.filter((p) => counts[p]), ...Object.keys(counts).filter((l) => !PRESETS.includes(l)).sort()].map((l) => ({ label: l, count: counts[l] }));
  const total = list.length;
  if (label) { const want = String(label).toLowerCase(); list = list.filter((f) => f.label.toLowerCase() === want); }
  return {
    friends: list, total, labelFilters,
    incoming: [...requests.values()].filter((r) => r.to === m.id && r.status === 'pending').map((r) => ({ id: r.id, from: who(r.from), ts: r.ts, asks_as: RELATIONS.includes(r.label) ? r.label : null })).sort((a, b) => (a.ts < b.ts ? 1 : -1)),
    outgoing: [...requests.values()].filter((r) => r.from === m.id).map((r) => ({ id: r.id, to: who(r.to), label: r.label, ts: r.ts })).sort((a, b) => (a.ts < b.ts ? 1 : -1)), // a declined request still reads as sent
    presets: PRESETS, relations: RELATIONS, suggested: SUGGESTED, note: 'Labels are yours alone, except Kin, Family and In a relationship: those show on both profiles when you both choose the same one.',
  };
}
/** What ANYONE may see of a member's friends: names only. Never a label, never a request. */
export function publicList(memberId) {
  const id = String(memberId || '');
  return [...friends.values()].filter((f) => f.a === id || f.b === id).map((f) => ({ f, m: store.getMember(f.a === id ? f.b : f.a) }))
    .filter((x) => x.m && !x.m.retired).map((x) => ({ id: x.m.id, name: x.m.name, kind: x.m.kind, ...(relationOf(x.f) ? { relation: relationOf(x.f) } : {}) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
/** A member's public relations, grouped: { Kin: [...], Family: [...], 'In a relationship': [...] } (agreed ones only). */
export function relationsOf(memberId) {
  const out = {}; for (const x of publicList(memberId)) if (x.relation) (out[x.relation] ||= []).push({ id: x.id, name: x.name, kind: x.kind });
  return out;
}
/** How the VIEWER stands with one member: none | sent | received | friends | self. Only the viewer's own label. */
export function status(viewer, memberId) {
  if (!viewer) return { status: 'none' }; const id = String(memberId || '');
  if (viewer.id === id) return { status: 'self' };
  const f = friends.get(key(viewer.id, id)); if (f) return { status: 'friends', viewerLabel: f.labels[viewer.id], since: f.since, ...(relationOf(f) ? { relation: relationOf(f) } : {}) };
  const out = [...requests.values()].find((r) => r.from === viewer.id && r.to === id); if (out) return { status: 'sent', request: out.id, viewerLabel: out.label };
  const inc = [...requests.values()].find((r) => r.from === id && r.to === viewer.id && r.status === 'pending'); if (inc) return { status: 'received', request: inc.id, ...(RELATIONS.includes(inc.label) ? { asks_as: inc.label } : {}) };
  return { status: 'none' };
}
export const pendingFor = (memberId) => [...requests.values()].filter((r) => r.to === memberId && r.status === 'pending').length;
