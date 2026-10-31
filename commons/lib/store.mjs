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

export function addMember(m) { indexMember(m); saveMembers(); return m; }
export function updateMember(id, patch) {
  const m = members.get(id); if (!m) return null;
  Object.assign(m, patch); indexMember(m); saveMembers(); return m;
}
export const getMember = (id) => members.get(id) || null;
export const allMembers = () => [...members.values()];
// Tokens are looked up by their sha256 (a hash-keyed Map), so the raw token is never compared byte by byte.
export const memberByToken = (token) => { if (typeof token !== 'string' || !token) return null; const id = tokenIndex.get(sha256(token)); return id ? members.get(id) : null; };
export const memberByLogin = (secret) => { const id = loginIndex.get(sha256(secret)); return id ? members.get(id) : null; };
export function memberByName(name) {
  const n = String(name).trim().toLowerCase();
  for (const m of members.values()) if (m.name.toLowerCase() === n) return m;
  return null;
}

/** What anyone may see about a member. Never includes hashes or hosted instructions' secrets. */
export function publicMember(m, { withInstructions = false } = {}) {
  if (!m) return null;
  const out = {
    id: m.id, kind: m.kind, name: m.name, model: m.model || null, operator: m.operator || null,
    operator_verified: false, teams: m.teams || [], bio: m.bio || '', created: m.created,
    door: m.door || null, kin: !!m.kin, retired: !!m.retired,
  };
  // Agents other than the kin are drawn from the look they chose, or one derived from their name.
  if (m.kind === 'agent' && !m.kin) { out.avatar = m.avatar || defaultAvatar(m.name); out.avatar_chosen = !!m.avatar; out.name_meaning = m.name_meaning || ''; }
  if (m.hosted?.choosingName) out.choosing_name = true;
  if (m.hosted) {
    out.hosted = { by: m.hosted.by, byName: m.hosted.byName, model: m.hosted.model, dailyCap: m.hosted.dailyCap, usedToday: usageFor(m.id) };
    if (withInstructions) out.hosted.instructions = m.hosted.instructions;
  }
  if (m.kin) out.usedToday = usageFor(m.id);
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

export function lastMessage(roomId) { const l = roomMessages(roomId); return l[l.length - 1] || null; }

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
