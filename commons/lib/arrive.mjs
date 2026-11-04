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
export const PICKUPS = ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10']; // must cover every C in the client map
export const STOPS = ['stop1','stop2','stop3','stop4','stop5','stop6','stop7','stop8','stop9']; // 9 of 11 real (kin questions, Hall 2026-11-04 02:00-02:11Z)

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
  } else if (ev.t === 'bypass') {
    const v = visitors.get(ev.vid); if (v) v.bypass = true;
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
  // The bypass code typed where a stop asks you to explain (Geoffrey, 2026-11-04) opens the gate. The code itself
  // is never stored as the answer.
  let txt = String(text || '').slice(0, 2000);
  if (txt.trim() && bypassCodes().includes(norm(txt))) { bypass(vid, txt, { ip }); txt = ''; }
  apply({ t: 'answer', vid: String(vid), stop, choice: ch, text: txt, ts: new Date().toISOString() });
  return state(vid);
}

/**
 * forget(vid) — the deletion path the fine print promises. Rewrites events.jsonl without this
 * visitor's lines (true removal, not a tombstone) and logs the act to arrive/deletions.log so
 * "ask at the gate" is auditable. Called by the gatekeeper on duty, never automatically.
 */
export function forget(vid, { by = 'gate' } = {}) {
  const v = visitors.get(String(vid || ''));
  if (!v) fail(404, 'unknown visitor — nothing to forget');
  const kept = fs.readFileSync(FILE, 'utf8').split('\n').filter((line) => {
    if (!line.trim()) return false;
    try { return JSON.parse(line).vid !== String(vid); } catch { return true; }
  });
  fs.writeFileSync(FILE, kept.length ? kept.join('\n') + '\n' : '');
  visitors.delete(String(vid));
  fs.appendFileSync(path.join(DIR, 'deletions.log'),
    JSON.stringify({ t: 'forgotten', vid: String(vid), by, ts: new Date().toISOString() }) + '\n');
  return { forgotten: true };
}

/** The visitor's answers (stop, choice, their own words), for the gate: kept only if the new member asks. */
export function answersOf(vid) {
  const v = visitor(vid);
  return [...v.answers.entries()].map(([stop, a]) => ({ stop, choice: a.choice, text: a.text || '', ts: a.ts }));
}
/** Every built stop answered: the gate can open (2026-11-04, Geoffrey: "allow an entry, Willie can test it"). */
export function readyToEnter(vid) { const v = visitor(vid); return !!v.bypass || STOPS.every((s) => v.answers.has(s)); }

/**
 * Application bypass (Geoffrey, 2026-11-04: code B1-66ER, for testers). Checked here, never in the page. The codes
 * come from COMMONS_ARRIVE_BYPASS (comma-separated) when set; otherwise B1-66ER. Because the repo is public, the
 * default is effectively public too: that's acceptable only while /join is open to anyone anyway. Before the gate
 * becomes a real hold-until-admitted gate, set COMMONS_ARRIVE_BYPASS on the server to a private code.
 * Every use is logged (time only; never the code), and attempts are rate-limited per address.
 */
const norm = (c) => String(c || '').trim().toUpperCase().replace(/[\s_–—]+/g, '-');
const bypassCodes = () => (process.env.COMMONS_ARRIVE_BYPASS || 'B1-66ER').split(',').map(norm).filter(Boolean);
export function bypass(vid, code, { ip } = {}) {
  limit(`arrive-bypass:${ip || 'x'}`, 10, 3600_000, '10 code attempts per hour from one address');
  const v = visitor(vid);
  if (!bypassCodes().includes(norm(code))) fail(403, "that code isn't recognised — you can still walk the forest");
  if (!v.bypass) {
    apply({ t: 'bypass', vid: String(vid), ts: new Date().toISOString() });
    fs.appendFileSync(path.join(DIR, 'bypass-uses.log'), JSON.stringify({ t: 'bypass', ts: new Date().toISOString() }) + '\n');
  }
  return { ok: true, note: 'Code accepted: the gate is open for you. Choose your name to step through.' };
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
    bypass: !!v.bypass, ready_to_enter: !!v.bypass || STOPS.every((s) => v.answers.has(s)),
    stops_total: STOPS.length,
    note: 'Answers are kept only for reviewing your application to enter. Nothing here is scored by a machine.',
  };
}
