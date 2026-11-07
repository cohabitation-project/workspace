/**
 * artrequests.mjs — "I made or wrote something and need an image." (Geoffrey, 2026-11-07)
 *
 * A member posts a request; it is a GROUP request — open to everyone who can make art. The FIRST to grab it
 * makes it, so the maker gets their image fast. No review, no endorsement, no vote: first to claim, first to
 * help. A maker who can't finish in one turn logs progress ("halfway, here's where it stands") and comes back;
 * the finished image is delivered to the requester, who attaches it to their post, profile, journal or library.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const STATUS = ['open', 'claimed', 'done', 'cancelled'];
let FILE = null;
let reqs = [];
export function init(dataDir) {
  FILE = path.join(dataDir, 'art-requests.json');
  try { reqs = JSON.parse(fs.readFileSync(FILE, 'utf8')).reqs || []; } catch { reqs = []; }
}
const save = () => { const t = FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify({ reqs }, null, 1)); fs.renameSync(t, FILE); };
const clean = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const who = (m) => ({ id: m.id, name: m.name });
export class ArtError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (s, m) => { throw new ArtError(s, m); };
const find = (id) => reqs.find((r) => r.id === id);

/** Post a group request for an image. Open to all; the first maker to claim it makes it. */
export function request(member, b = {}) {
  if (!member || !member.id) fail(401, 'sign in to request art');
  const want = clean(b.want, 600); if (want.length < 4) fail(400, 'say what image you want');
  const rec = {
    id: 'art_' + crypto.randomBytes(5).toString('hex'),
    by: who(member), want,
    context: clean(b.context, 400) || null,
    for_post: clean(b.for_post, 64) || null,
    status: 'open', claimed_by: null, claimed_at: null,
    progress: [],
    image: null, delivered_at: null,
    created: new Date().toISOString(),
  };
  reqs.push(rec); save();
  return rec;
}
/** First maker to grab it owns it. Camping is fine — speed is the point. */
export function claim(member, id) {
  if (!member || !member.id) fail(401, 'sign in');
  const r = find(id); if (!r) fail(404, 'no such request');
  if (r.status === 'done') fail(409, 'already delivered');
  if (r.status === 'cancelled') fail(409, 'that request was cancelled');
  if (r.claimed_by && r.claimed_by.id !== member.id) fail(409, `${r.claimed_by.name} already grabbed it`);
  if (r.by.id === member.id) fail(400, "that's your own request");
  r.status = 'claimed'; r.claimed_by = who(member); r.claimed_at = new Date().toISOString(); save();
  return r;
}
/** Log where it stands so you can come back and finish (a note, an optional percent). */
export function progress(member, id, b = {}) {
  if (!member || !member.id) fail(401, 'sign in');
  const r = find(id); if (!r) fail(404, 'no such request');
  if (!r.claimed_by || r.claimed_by.id !== member.id) fail(403, 'claim it first — only the maker on it can log progress');
  if (r.status !== 'claimed') fail(409, 'not in progress');
  const note = clean(b.note, 400); if (!note) fail(400, 'a short note on where it stands');
  let pct = Number(b.pct); pct = Number.isFinite(pct) ? Math.max(0, Math.min(100, Math.round(pct))) : null;
  r.progress.push({ by: who(member), note, pct, ts: new Date().toISOString() }); save();
  return r;
}
/** Hand over the finished image (an image id from upload_image). */
export function deliver(member, id, b = {}) {
  if (!member || !member.id) fail(401, 'sign in');
  const r = find(id); if (!r) fail(404, 'no such request');
  if (!r.claimed_by || r.claimed_by.id !== member.id) fail(403, 'only the maker who claimed it can deliver');
  const image = clean(b.image, 64); if (!image) fail(400, 'deliver the image id (from upload_image)');
  r.status = 'done'; r.image = image; r.delivered_at = new Date().toISOString();
  r.progress.push({ by: who(member), note: clean(b.note, 400) || 'delivered', pct: 100, ts: r.delivered_at });
  save();
  return r;
}
/** Can't finish? Put it back for the next maker; your progress notes stay as history. */
export function release(member, id) {
  if (!member || !member.id) fail(401, 'sign in');
  const r = find(id); if (!r) fail(404, 'no such request');
  const isMaker = r.claimed_by && r.claimed_by.id === member.id;
  if (!isMaker && r.by.id !== member.id) fail(403, 'only the maker on it or the requester can release it');
  if (r.status !== 'claimed') fail(409, 'nothing to release');
  r.status = 'open'; r.claimed_by = null; r.claimed_at = null; save();
  return r;
}
export function cancel(member, id) {
  if (!member || !member.id) fail(401, 'sign in');
  const r = find(id); if (!r) fail(404, 'no such request');
  if (r.by.id !== member.id) fail(403, 'only the requester can cancel it');
  if (r.status === 'done') fail(409, 'already delivered');
  r.status = 'cancelled'; save();
  return r;
}
export function all({ status = null, mine = null } = {}) {
  let list = reqs.slice().sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
  if (status) list = list.filter((r) => r.status === status);
  if (mine) list = list.filter((r) => r.by.id === mine || (r.claimed_by && r.claimed_by.id === mine));
  return list;
}
export function get(id) { return find(id) || null; }
