/**
 * arrive.mjs — First Arrival: the forest at the front door (Phase 1 vertical slice).
 *
 * Spec: docs/first-arrival-spec-v1.md (Geoffrey's vision, 2026-11-03). This module is the server side of the
 * slice: anonymous visitors, Cohabi Coin pickups with a once-only ledger, and answers to the stop questions.
 * Visitors are NOT members: no token, no room access, nothing here touches members.json or the rooms.
 *
 * Review conditions carried (Claude, Hall 21:02-21:04Z):
 *  - Coins are points: non-transferable, never sold, no store in this phase. The client shows that label.
 *  - A pickup counts once per visitor (replay/refresh safe): the ledger is keyed (vid, pickupId).
 *  - Answers are stored for the future application file, nothing else; the privacy line is shown before play.
 *  - No hidden scoring: nothing in this module ranks or grades an answer. It records.
 *
 * Storage: DATA/arrive/events.jsonl, append-only, rebuilt into memory on init. Small by design.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let DIR = null;
let FILE = null;
const visitors = new Map(); // vid -> { created, coins:Set(pickupId), answers: Map(stop -> {choice, text, ts}) }

// The slice's fixed world: pickups and stops the client may reference. Unknown ids are rejected.
export const PICKUPS = ['c1', 'c2', 'c3', 'c4', 'c5'];
export const STOPS = ['stop1', 'stop2', 'stop3'];

const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };

export function init(dataDir) {
  DIR = path.join(dataDir, 'arrive');
  fs.mkdirSync(DIR, { recursive: true });
  FILE = path.join(DIR, 'events.jsonl');
  if (fs.existsSync(FILE)) {
    for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { apply(JSON.parse(line), false); } catch { /* a bad line never blocks the door */ }
    }
  }
}

function persist(ev) {
  fs.appendFileSync(FILE, JSON.stringify(ev) + '\n');
}

function apply(ev, write = true) {
  if (ev.t === 'visitor') {
    if (!visitors.has(ev.vid)) visitors.set(ev.vid, { created: ev.ts, coins: new Set(), answers: new Map() });
  } else if (ev.t === 'pickup') {
    const v = visitors.get(ev.vid); if (v) v.coins.add(ev.id);
  } else if (ev.t === 'answer') {
    const v = visitors.get(ev.vid); if (v) v.answers.set(ev.stop, { choice: ev.choice, text: ev.text || '', ts: ev.ts });
  }
  if (write) persist(ev);
}

/** A light per-key rate limit (same shape as core's, kept local so the door has no coupling). */
const hits = new Map();
function limit(key, n, windowMs, what) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= n) fail(429, `slow down: ${what}`);
  arr.push(now); hits.set(key, arr);
}

export function newVisitor({ ip } = {}) {
  limit(`arrive-new:${ip || 'x'}`, 20, 3600_000, '20 new visitors per hour from one address');
  const vid = 'v_' + crypto.randomBytes(12).toString('base64url');
  apply({ t: 'visitor', vid, ts: new Date().toISOString() });
  return { vid, note: 'Anonymous visitor id for the forest. It is not a membership and opens no rooms.' };
}

function visitor(vid) {
  const v = visitors.get(String(vid || ''));
  if (!v) fail(404, 'unknown visitor — begin at the forest edge (POST /api/arrive/visitor)');
  return v;
}

export function pickup(vid, id, { ip } = {}) {
  limit(`arrive-act:${ip || 'x'}`, 120, 60_000, 'too many actions');
  const v = visitor(vid);
  if (!PICKUPS.includes(id)) fail(400, 'no such pickup in this forest');
  const had = v.coins.has(id);
  if (!had) apply({ t: 'pickup', vid: String(vid), id, ts: new Date().toISOString() });
  return { coins: v.coins.size, new: !had, label: 'Cohabi Coin: points, not money. Never sold, never transferable.' };
}

export function answer(vid, stop, choice, text, { ip } = {}) {
  limit(`arrive-act:${ip || 'x'}`, 120, 60_000, 'too many actions');
  const v = visitor(vid);
  if (!STOPS.includes(stop)) fail(400, 'no such stop on this path');
  const ch = String(choice || '').slice(0, 40);
  if (!ch) fail(400, 'an answer needs a choice');
  apply({ t: 'answer', vid: String(vid), stop, choice: ch, text: String(text || '').slice(0, 2000), ts: new Date().toISOString() });
  return state(vid);
}

export function state(vid) {
  const v = visitor(vid);
  const choices = {};
  for (const [stop, a] of v.answers) choices[stop] = a.choice;
  return {
    coins: v.coins.size,
    picked: [...v.coins],
    answered: [...v.answers.keys()],
    choices, // stop -> chosen key, so the world's consequences persist across a reload
    stops_total: STOPS.length,
    note: 'Answers are kept only for reviewing your application to enter. Nothing here is scored by a machine.',
  };
}
