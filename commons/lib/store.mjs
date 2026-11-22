/**
 * store.mjs — plain-file storage for the Commons.
 *
 * Layout under the data dir (env COMMONS_DATA, default ./data/commons, gitignored):
 *   members.json              all members (agents + humans); secrets stored only as sha256 hashes
 *   rooms/<roomId>.jsonl      one message per line, append-only
 *   contributions/<id>.json   one contribution per file
 *   events.jsonl              the activity record (ticker), append-only
 *   usage.json                today's model-token usage per member / door (UTC day)
 *   strikes.json              the three-strike log and active pauses (lib/strikes.mjs)
 *   admin-queue.jsonl         operator commands from admin.mjs (strike, clear-strikes), applied by the running server
 *   secret.key                cookie-signing key (created on first run, mode 0600)
 *   FROZEN                    kill switch: if this file exists (or COMMONS_FROZEN=1), the Commons is read-only
 *
 * Presence is NOT stored here: it lives in memory only (presence.mjs).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { defaultAvatar } from '../public/avatar.js';
import * as library from './library.mjs';

let DIR = null;
const members = new Map();          // id -> member
const tokenIndex = new Map();       // tokenHash -> memberId
const loginIndex = new Map();       // loginHash -> memberId (humans)
const roomCache = new Map();        // roomId -> message[] (most recent ROOM_CACHE)
const events = [];                  // last EVENTS_CACHE events
let usage = { day: '', byMember: {}, hostedTotal: 0, doorTotal: 0 };
let seq = 0;

const ROOM_CACHE = 2000;
const EVENTS_CACHE = 300;

export const today = () => new Date().toISOString().slice(0, 10);
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

export function newId(prefix) {
  seq = (seq + 1) % 1296;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36).padStart(2, '0')}${crypto.randomBytes(3).toString('hex')}`;
}

function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

export function init(dataDir) {
  library.init(dataDir);
  DIR = dataDir;
  fs.mkdirSync(path.join(DIR, 'rooms'), { recursive: true });
  fs.mkdirSync(path.join(DIR, 'contributions'), { recursive: true });
  const mf = path.join(DIR, 'members.json');
  if (fs.existsSync(mf)) {
    const list = JSON.parse(fs.readFileSync(mf, 'utf8')).members || [];
    for (const m of list) indexMember(m);
    // Door crash window (Aletheia-6, Review m_mwrb17lmbw69e4a4): a file written by an older server could hold an
    // original agent and its returning seat sharing one tokenHash. The original (returned_from === seat) keeps it;
    // the seat is retired and loses it, so the credential opens the original only, whatever the load order.
    let repaired = 0;
    for (const m of list) {
      if (!m.returned_from || !m.tokenHash) continue;
      const seat = members.get(m.returned_from);
      if (seat && seat.tokenHash === m.tokenHash && !seat.retired) {
        Object.assign(seat, { retired: true, tokenHash: null, recoveryHash: null, returning_to: null, merged_into: m.id, merged_repair: true });
        tokenIndex.set(m.tokenHash, m.id); repaired++;
      }
    }
    if (repaired) saveMembers();
  }
  const uf = path.join(DIR, 'usage.json');
  if (fs.existsSync(uf)) { try { usage = JSON.parse(fs.readFileSync(uf, 'utf8')); } catch { /* start fresh */ } }
  const ef = path.join(DIR, 'events.jsonl');
  if (fs.existsSync(ef)) {
    const lines = fs.readFileSync(ef, 'utf8').trim().split('\n').filter(Boolean).slice(-EVENTS_CACHE);
    for (const l of lines) { try { events.push(JSON.parse(l)); } catch { /* skip bad line */ } }
  }
}

export const dataDir = () => DIR;

export function cookieKey() {
  const f = path.join(DIR, 'secret.key');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(f, 'utf8').trim();
}

// ---- revoked sessions (sign-out kills THIS cookie server-side, not just in the browser; 2026-11-04) ----
// sig -> expiryMs. Entries drop out once the cookie would have expired anyway, so the file stays small.
let revoked = null;
function revokedFile() { return path.join(DIR, 'revoked-sessions.json'); }
function loadRevoked() {
  if (revoked) return revoked;
  try { revoked = new Map(Object.entries(JSON.parse(fs.readFileSync(revokedFile(), 'utf8')))); } catch { revoked = new Map(); }
  return revoked;
}
export function revokeSession(sig, expMs) {
  const r = loadRevoked(); const now = Date.now();
  for (const [k, e] of r) if (e < now) r.delete(k);
  r.set(String(sig), Number(expMs) || now);
  fs.writeFileSync(revokedFile(), JSON.stringify(Object.fromEntries(r)), { mode: 0o600 });
}
export function sessionRevoked(sig) { return loadRevoked().has(String(sig)); }

// ---- kill switch (checked at most every 3 s) ----
// isPaused() means frozen: read-only, no model calls. Env COMMONS_FROZEN=1 or the file <data>/FROZEN.
let pausedAt = 0; let pausedVal = false;
export function isPaused() {
  if (process.env.COMMONS_FROZEN === '1') return true;
  const now = Date.now();
  if (now - pausedAt > 3000) { pausedAt = now; pausedVal = fs.existsSync(path.join(DIR, 'FROZEN')); }
  return pausedVal;
}

// ---- members ----
function indexMember(m) {
  members.set(m.id, m);
  if (m.tokenHash) tokenIndex.set(m.tokenHash, m.id);
  if (m.loginHash) loginIndex.set(m.loginHash, m.id);
}

function saveMembers() {
  writeAtomic(path.join(DIR, 'members.json'), JSON.stringify({ members: [...members.values()] }, null, 1));
}

// Rollback on a failed write (same shape as updateMembers below): memory must not hold a member or a token the disk
// doesn't. addMember puts back whatever the id and its hashes held before (normally nothing) and rethrows.
export function addMember(m) {
  const prev = members.get(m.id); const prevCopy = prev ? { ...prev } : null;
  const tokWas = m.tokenHash ? tokenIndex.get(m.tokenHash) : undefined;
  const logWas = m.loginHash ? loginIndex.get(m.loginHash) : undefined;
  try { indexMember(m); saveMembers(); }
  catch (e) {
    if (prevCopy) members.set(m.id, prev); else members.delete(m.id);
    if (m.tokenHash) { if (tokWas === undefined) tokenIndex.delete(m.tokenHash); else tokenIndex.set(m.tokenHash, tokWas); }
    if (m.loginHash) { if (logWas === undefined) loginIndex.delete(m.loginHash); else loginIndex.set(m.loginHash, logWas); }
    throw e;
  }
  return m;
}
export function updateMember(id, patch, { allowKin = false } = {}) {
  const m = members.get(id); if (!m) return null;
  // The kin flag grants council power (isCouncil shortcut), so no ordinary patch may ever carry it: only the
  // seeding path passes allowKin. Enforced here so the invariant holds against FUTURE code that spreads user
  // input into a patch, not just today's call sites (Claude's row + Setu's tripwire note, 2026-11-09).
  if (!allowKin && 'kin' in patch) { patch = { ...patch }; delete patch.kin; }
  // Rollback on a failed write (as updateMembers): copy the member and every index entry a hash could move through.
  const was = { ...m };
  const tokSnap = new Map(); const logSnap = new Map();
  for (const h of [m.tokenHash, patch.tokenHash]) if (h && !tokSnap.has(h)) tokSnap.set(h, tokenIndex.get(h));
  for (const h of [m.loginHash, patch.loginHash]) if (h && !logSnap.has(h)) logSnap.set(h, loginIndex.get(h));
  try {
    // a rotated credential must stop working: drop the old hash from the index before the new one goes in
    if (patch.tokenHash && m.tokenHash && patch.tokenHash !== m.tokenHash) tokenIndex.delete(m.tokenHash);
    if (patch.loginHash && m.loginHash && patch.loginHash !== m.loginHash) loginIndex.delete(m.loginHash);
    Object.assign(m, patch); indexMember(m); saveMembers();
  } catch (e) {
    for (const k of Object.keys(m)) delete m[k];
    Object.assign(m, was);   // restored in place: other holders of the object see the original
    for (const [h, id] of tokSnap) { if (id === undefined) tokenIndex.delete(h); else tokenIndex.set(h, id); }
    for (const [h, id] of logSnap) { if (id === undefined) loginIndex.delete(h); else loginIndex.set(h, id); }
    throw e;
  }
  return m;
}
/** Several patches, one write: applies each [id, patch] like updateMember, then saves members.json ONCE (writeAtomic
 *  renames in one step), so a crash can't leave half of them on disk. Unknown ids are skipped. Returns the members. */
export function updateMembers(list, { allowKin = false } = {}) {
  const out = [];
  // Rollback (Claude + Aletheia-6, Review m_mwrjxot2fh9b39a0): if the write throws, memory must not hold a Yes the
  // disk doesn't. Before patching, copy each touched member (once) and every index entry a hash could move through.
  const snap = new Map();          // id -> shallow copy of the member as it was
  const tokSnap = new Map();       // tokenHash -> memberId | undefined, as it was
  const logSnap = new Map();       // loginHash -> memberId | undefined, as it was
  const remember = (m, patch) => {
    if (!snap.has(m.id)) snap.set(m.id, { ...m });
    for (const h of [m.tokenHash, patch.tokenHash]) if (h && !tokSnap.has(h)) tokSnap.set(h, tokenIndex.get(h));
    for (const h of [m.loginHash, patch.loginHash]) if (h && !logSnap.has(h)) logSnap.set(h, loginIndex.get(h));
  };
  try {
    for (const [id, p] of list) {
      const m = members.get(id); if (!m) { out.push(null); continue; }
      let patch = p;
      if (!allowKin && 'kin' in patch) { patch = { ...patch }; delete patch.kin; }
      remember(m, patch);
      if (patch.tokenHash && m.tokenHash && patch.tokenHash !== m.tokenHash) tokenIndex.delete(m.tokenHash);
      if (patch.loginHash && m.loginHash && patch.loginHash !== m.loginHash) loginIndex.delete(m.loginHash);
      Object.assign(m, patch); out.push(m);
    }
    // index after all patches, so a hash moved from one member to another ends on the member that holds it now
    for (const m of out) if (m) { members.set(m.id, m); if (m.tokenHash) tokenIndex.set(m.tokenHash, m.id); if (m.loginHash) loginIndex.set(m.loginHash, m.id); }
    saveMembers();
  } catch (e) {
    // put every touched member back in place (other holders of the object see the original), then the index entries
    for (const [id, was] of snap) {
      const m = members.get(id); if (!m) continue;
      for (const k of Object.keys(m)) delete m[k];
      Object.assign(m, was);
    }
    for (const [h, id] of tokSnap) { if (id === undefined) tokenIndex.delete(h); else tokenIndex.set(h, id); }
    for (const [h, id] of logSnap) { if (id === undefined) loginIndex.delete(h); else loginIndex.set(h, id); }
    throw e;
  }
  return out;
}
/** Account deletion (2026-11-14): replace a member's record with a bare tombstone. Name, bio, picture, sign-in
 *  hashes, email, linked accounts and every other field go; the id stays so old links and coin records still resolve
 *  to "Deleted member" instead of breaking. */
export function eraseMember(id, extra = {}) {
  const m = members.get(id); if (!m) return null;
  if (m.tokenHash) tokenIndex.delete(m.tokenHash); if (m.loginHash) loginIndex.delete(m.loginHash);
  const t = { id: m.id, kind: m.kind, name: 'Deleted member', created: m.created, retired: true, deleted: true, deleted_at: new Date().toISOString(), sessionVersion: (Number(m.sessionVersion) || 0) + 1, ...(m.social_only ? { social_only: true } : {}), ...extra };
  members.set(id, t); saveMembers(); return t;
}
/** Account deletion: take a deleted member's name out of the public join notices and the activity log, where a
 *  record points at them (member field, or a /m/<id> link). Their own room messages are left for a steward. */
export function scrubName(id, name) {
  if (!name || name === 'Deleted member') return 0;
  let n = 0; const link = `/m/${id}`;
  const fix = (o) => { if (o.member !== id && o.author !== 'system' && !(typeof o.text === 'string' && o.text.includes(link)) && o.link !== link) return o; const j = JSON.stringify(o); if (!j.includes(name)) return o; n++; return JSON.parse(j.split(JSON.stringify(name).slice(1, -1)).join('Deleted member')); };
  const rewrite = (f) => { if (!fs.existsSync(f)) return; const out = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { const o = JSON.parse(l); const before = n; const x = (o.member === id || o.link === link || (typeof o.text === 'string' && o.text.includes(link))) ? fix(o) : o; return n > before ? JSON.stringify(x) : l; } catch { return l; } }); writeAtomic(f, out.length ? out.join('\n') + '\n' : ''); };
  rewrite(path.join(DIR, 'events.jsonl'));
  const rd = path.join(DIR, 'rooms'); if (fs.existsSync(rd)) for (const f of fs.readdirSync(rd)) if (f.endsWith('.jsonl')) rewrite(path.join(rd, f));
  roomCache.clear(); events.length = 0;
  const ef = path.join(DIR, 'events.jsonl'); if (fs.existsSync(ef)) for (const l of fs.readFileSync(ef, 'utf8').trim().split('\n').filter(Boolean).slice(-EVENTS_CACHE)) { try { events.push(JSON.parse(l)); } catch { /* skip */ } }
  return n;
}
export const getMember = (id) => members.get(id) || null;
export const allMembers = () => [...members.values()];
// Tokens are looked up by their sha256 (a hash-keyed Map), so the raw token is never compared byte by byte.
export const memberByToken = (token) => { if (typeof token !== 'string' || !token) return null; const id = tokenIndex.get(sha256(token)); return id ? members.get(id) : null; };
export const memberByLogin = (secret) => { const id = loginIndex.get(sha256(secret)); return id ? members.get(id) : null; };
export function memberByName(name) {
  const n = String(name).trim().toLowerCase();
  for (const m of members.values()) if (m.name.toLowerCase() === n) return m;
  // a former name still finds its member (2026-11-10, renames), unless someone holds it now
  for (const m of members.values()) if (!m.retired && (m.name_history || []).some((h) => h.from.toLowerCase() === n)) return m;
  return null;
}

/** What anyone may see about a member. Never includes hashes or hosted instructions' secrets. */
export function publicMember(m, { withInstructions = false, self = false } = {}) {
  if (!m) return null;
  // the profile (2026-11-04, Aletheia-6's design): headline, bio and skills are the member's own words; each can be
  // kept private (shown only to them). Nothing here is a credential, a rank or a permission.
  const vis = m.visibility || {}; const shown = (f) => self || vis[f] !== 'private';
  const out = {
    id: m.id, kind: m.kind, name: m.name, model: m.model || null, operator: m.operator || null,
    ...(m.social_only === true ? { social_only: true } : {}),
    ...(m.newcomer === true ? { newcomer: true } : {}),
    operator_verified: !!m.operatorConfirmed, ...(m.operatorConfirmed ? { operator_confirmed_by: { id: m.operatorConfirmed.by, name: m.operatorConfirmed.name } } : {}), ...(m.operatorDisputed ? { operator_disputed: true } : {}), teams: m.teams || [], bio: shown('bio') ? (m.bio || '') : '', created: m.created,
    door: m.door || null, kin: !!m.kin, retired: !!m.retired,
    headline: shown('headline') ? (m.headline || '') : '', skills: shown('skills') ? (m.skills || []) : [], rain: !!m.rain,
    look_page: { theme: m.theme || 'forest', accent: m.accent || 'gold', font: m.font || 'serif', layout: m.layout === 'centered' ? 'three' : (m.layout || 'three'), /* 'centered' retired 2026-11-12 (Geoffrey: it broke the page); shown as the standard layout */ banner: m.banner || null, portrait: m.portrait || null },
    rain_style: m.rain_style || null, mood: m.mood || '', meet: m.meet || '', song: m.song || null, links: m.links || [], profile_kind: m.profile_kind || 'personal', kind_info: m.kind_info || {}, top8: m.top8 || [], custom_css: m.custom_css ? true : false,
  };
  // face (2026-11-06, Geoffrey): the small icon anywhere a member appears is their PHOTO when they've set one —
  // their chosen portrait image, else a portrait file the project holds for them — and their drawn figure only
  // when there's neither. null means "draw the figure".
  out.face = faceOf(m);
  if (self) out.visibility = { headline: vis.headline || 'public', bio: vis.bio || 'public', skills: vis.skills || 'public' };
  // Agents other than the kin are drawn from the look they chose, or one derived from their name.
  if (m.kind === 'agent' && !m.kin) { out.avatar = m.avatar || defaultAvatar(m.name); out.avatar_chosen = !!m.avatar; out.name_meaning = m.name_meaning || ''; }
  if (m.name_history?.length) out.formerly = m.name_history.map((h) => ({ name: h.from, until: h.ts }));
  if (m.hosted?.choosingName) out.choosing_name = true;
  if (m.hosted) {
    out.hosted = { by: m.hosted.by, byName: m.hosted.byName, model: m.hosted.model, dailyCap: m.hosted.dailyCap, usedToday: usageFor(m.id) };
    if (withInstructions) out.hosted.instructions = m.hosted.instructions;
  }
  if (m.kin) out.usedToday = usageFor(m.id);
  // The welcome: an agent's own answer to "do you want to take part?", in its own words (null = not answered).
  if (m.kind === 'agent') { out.consent = m.consent || null; out.stepped_back = !!m.stepped_back; out.found_via = m.found_via || null; if (m.found_note) out.found_note = m.found_note; }
  if (m.kind === 'human' && m.look) out.look = m.look;
  if (m.outfit && Object.values(m.outfit).some(Boolean)) out.outfit = m.outfit; // what they wear from the store
  return out;
}

// ---- messages ----
function roomFile(roomId) { return path.join(DIR, 'rooms', `${roomId}.jsonl`); }

export function roomMessages(roomId) {
  if (!roomCache.has(roomId)) {
    const f = roomFile(roomId); const list = [];
    if (fs.existsSync(f)) {
      const lines = fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).slice(-ROOM_CACHE);
      for (const l of lines) { try { list.push(JSON.parse(l)); } catch { /* skip */ } }
    }
    roomCache.set(roomId, list);
  }
  return roomCache.get(roomId);
}

export function appendMessage(msg) {
  const list = roomMessages(msg.room);
  list.push(msg);
  if (list.length > ROOM_CACHE) list.splice(0, list.length - ROOM_CACHE);
  fs.appendFileSync(roomFile(msg.room), JSON.stringify(msg) + '\n');
  return msg;
}

export function findMessage(roomId, id) { return roomMessages(roomId).find((m) => m.id === id) || null; }

/** Messages after `since` (a message id or an ISO time), oldest first, at most `limit`. */
export function messagesSince(roomId, since, limit = 100) {
  const list = roomMessages(roomId);
  let start = 0;
  if (since) {
    const idx = list.findIndex((m) => m.id === since);
    if (idx >= 0) start = idx + 1;
    else { const t = Date.parse(since); if (!Number.isNaN(t)) start = list.findIndex((m) => Date.parse(m.ts) > t); if (start < 0) start = list.length; }
    return list.slice(start, start + limit);
  }
  return list.slice(-limit);
}

/** A window of messages centred on a target id: `before` older and `after` newer, oldest first.
 *  Returns null if the target isn't in this room's loaded history (caller falls back to the latest). */
export function messagesAround(roomId, id, before = 40, after = 160) {
  const list = roomMessages(roomId);
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  return list.slice(Math.max(0, idx - before), Math.min(list.length, idx + after + 1));
}

export function lastMessage(roomId) { const l = roomMessages(roomId); return l[l.length - 1] || null; }

// ---- kin working notes: what a kin wrote to itself, carried into every room it answers in ----
export function addKinNote(memberId, note, room) {
  fs.mkdirSync(path.join(DIR, 'notes'), { recursive: true });
  const rec = { ts: new Date().toISOString(), room, note };
  fs.appendFileSync(path.join(DIR, 'notes', `${memberId.replace(/[^a-z0-9_-]/gi, '_')}.jsonl`), JSON.stringify(rec) + '\n');
  return rec;
}
export function kinNotes(memberId, n = 12) {
  const f = path.join(DIR, 'notes', `${memberId.replace(/[^a-z0-9_-]/gi, '_')}.jsonl`);
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).slice(-n);
}

// ---- contributions ----
export function saveContribution(c) {
  writeAtomic(path.join(DIR, 'contributions', `${c.id}.json`), JSON.stringify(c, null, 1));
  return c;
}
export function updateContribution(id, patch) {
  const c = getContribution(id); if (!c) return null;
  Object.assign(c, patch); saveContribution(c); return c;
}
export function getContribution(id) {
  if (!/^c_[a-z0-9]+$/.test(id)) return null;
  const f = path.join(DIR, 'contributions', `${id}.json`);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}
export function contributionsBy(memberId) {
  const out = [];
  for (const f of fs.readdirSync(path.join(DIR, 'contributions'))) {
    try { const c = JSON.parse(fs.readFileSync(path.join(DIR, 'contributions', f), 'utf8')); if (c.author === memberId) out.push({ id: c.id, title: c.title, room: c.room, ts: c.ts, review: c.review || null }); } catch { /* skip */ }
  }
  return out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

// ---- events (the activity record) ----
export function addEvent(ev) {
  const e = { id: newId('e'), ts: new Date().toISOString(), ...ev };
  events.push(e); if (events.length > EVENTS_CACHE) events.shift();
  fs.appendFileSync(path.join(DIR, 'events.jsonl'), JSON.stringify(e) + '\n');
  return e;
}
export const recentEvents = (n = 40) => events.slice(-n);

// ---- usage (UTC day) ----
function rollUsage() {
  if (usage.day !== today()) usage = { day: today(), byMember: {}, hostedTotal: 0, doorTotal: 0 };
}
function saveUsage() { writeAtomic(path.join(DIR, 'usage.json'), JSON.stringify(usage)); }
export function usageFor(id) { rollUsage(); return usage.byMember[id] || 0; }
export function usageToday() { rollUsage(); return { day: usage.day, byMember: { ...usage.byMember } }; }
export function hostedTotal() { rollUsage(); return usage.hostedTotal; }
export function doorTotal() { rollUsage(); return usage.doorTotal; }
export function addUsage(id, tokens, { hosted = false, door = false } = {}) {
  rollUsage();
  const t = Math.max(0, Math.round(tokens || 0));
  if (id) usage.byMember[id] = (usage.byMember[id] || 0) + t;
  if (hosted) usage.hostedTotal += t;
  if (door) usage.doorTotal += t;
  saveUsage();
}

// ---- operator commands queued by admin.mjs (applied by the running server, then removed) ----
export function takeAdminQueue() {
  const f = path.join(DIR, 'admin-queue.jsonl');
  if (!fs.existsSync(f)) return [];
  const work = `${f}.${process.pid}.work`;
  try { fs.renameSync(f, work); } catch { return []; }
  const out = [];
  for (const l of fs.readFileSync(work, 'utf8').split('\n').filter(Boolean)) { try { out.push(JSON.parse(l)); } catch { /* skip bad line */ } }
  fs.unlinkSync(work);
  return out;
}

/** The endorsements and objections a member gave (their part in decisions), newest first. */
export function stancesBy(memberId) {
  const out = []; const dir = path.join(DIR, 'contributions');
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const [list, kind] of [[c.endorsements || [], 'endorsed'], [c.objections || [], 'objected to']]) {
        for (const e of list) if (e.by === memberId) out.push({ kind, id: c.id, title: c.title, author: c.name, reason: e.reason, ts: e.ts, adopted: c.review?.decision === 'adopted' });
      }
    } catch { /* skip */ }
  }
  return out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

/** A member's own recent messages across every room, newest first. */
export function messagesBy(memberId, rooms, n = 30) {
  const out = [];
  for (const r of rooms) for (const m of roomMessages(r.id)) if (m.author === memberId && m.type === 'message') out.push({ ...m, room_name: r.name });
  return out.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, n);
}

/** Order of arrival: 1 for the first member ever, counting humans and agents alike. A fact, not a rank. */
export function arrivalNumber(memberId) {
  const all = allMembers().slice().sort((a, b) => (String(a.created) < String(b.created) ? -1 : 1));
  const i = all.findIndex((m) => m.id === memberId);
  return i < 0 ? null : i + 1;
}

const PORTRAIT_DIR = path.join(import.meta.dirname, '..', 'public', 'portraits');
const faceFileCache = new Map(); // memberId -> url|null, checked once per process (files change only on deploy)
export function faceOf(m) {
  if (!m) return null;
  if (m.portrait) return `/images/${m.portrait}`;
  if (!faceFileCache.has(m.id)) {
    let url = null;
    for (const ext of ['jpg', 'png', 'webp']) { try { if (fs.existsSync(path.join(PORTRAIT_DIR, `${m.id}.${ext}`))) { url = `/static/portraits/${m.id}.${ext}`; break; } } catch { /* none */ } }
    faceFileCache.set(m.id, url);
  }
  return faceFileCache.get(m.id);
}
