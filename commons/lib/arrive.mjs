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
      try { applyEv(JSON.parse(line), false); } catch { /* a bad line never blocks the door */ }
    }
  }
}

function persist(ev) {
  fs.appendFileSync(FILE, JSON.stringify(ev) + '\n');
}

function applyEv(ev, write = true) {
  if (ev.t === 'visitor') {
    if (!visitors.has(ev.vid)) visitors.set(ev.vid, { created: ev.ts, coins: new Set(), answers: new Map() });
  } else if (ev.t === 'pickup') {
    const v = visitors.get(ev.vid); if (v) v.coins.add(ev.id);
  } else if (ev.t === 'apply') {
    const v = visitors.get(ev.vid); if (v) v.app = { id: ev.app, status: 'reviewing', started: ev.ts, deadline: ev.deadline, note: ev.note || '', votes: [] };
  } else if (ev.t === 'vote') {
    const v = visitors.get(ev.vid); if (v?.app && !v.app.votes.some((x) => x.by === ev.by)) v.app.votes.push({ by: ev.by, vote: ev.vote, reason: ev.reason, ts: ev.ts });
  } else if (ev.t === 'decide') {
    const v = visitors.get(ev.vid); if (v?.app) { v.app.status = ev.status; v.app.decided = ev.ts; v.app.decided_by = ev.by || null; }
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
  applyEv({ t: 'visitor', vid, ts: new Date().toISOString() });
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
  if (!had) applyEv({ t: 'pickup', vid: String(vid), id, ts: new Date().toISOString() });
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
  applyEv({ t: 'answer', vid: String(vid), stop, choice: ch, text: txt, ts: new Date().toISOString() });
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
/** Every built stop answered: the application can go to review. */
export function answeredAll(vid) { const v = visitor(vid); return STOPS.every((s) => v.answers.has(s)); }
/** The gate opens for a bypass code, or an application the review admitted (Geoffrey, 2026-11-04). */
export function readyToEnter(vid) { const v = visitor(vid); return v.app?.status !== 'declined' && (!!v.bypass || v.app?.status === 'admitted'); }

// ---- the review: kin vote on good faith; two yes (and more yes than no) admit; otherwise a human decides ----
export const REVIEW_MS = 3 * 60_000;
export function apply(vid, { note = '' } = {}, { ip } = {}) {
  limit(`arrive-apply:${ip || 'x'}`, 5, 3600_000, '5 applications per hour from one address');
  const v = visitor(vid);
  if (v.bypass) fail(409, 'your code already opened the gate');
  if (!answeredAll(vid)) fail(400, 'every stop on the path needs an answer first');
  if (v.app && v.app.status !== 'held') return appView(v.app);
  const ev = { t: 'apply', vid: String(vid), app: 'ap_' + crypto.randomBytes(6).toString('hex'), note: String(note || '').slice(0, 1000), ts: new Date().toISOString(), deadline: new Date(Date.now() + REVIEW_MS).toISOString() };
  applyEv(ev);
  return appView(visitors.get(String(vid)).app);
}
export function vote(vid, by, { vote: vt, reason }) {
  const v = visitor(vid); if (!v.app || v.app.status !== 'reviewing') return null;
  applyEv({ t: 'vote', vid: String(vid), by, vote: vt === 'no' ? 'no' : 'yes', reason: String(reason || '').slice(0, 240), ts: new Date().toISOString() });
  return decideIfReady(vid);
}
/** Two yes and more yes than no: admitted. Two no: held for a human. Deadline passed undecided: held. */
export function decideIfReady(vid, { now = Date.now() } = {}) {
  const v = visitor(vid); const a = v.app; if (!a || a.status !== 'reviewing') return a ? appView(a) : null;
  const yes = a.votes.filter((x) => x.vote === 'yes').length; const no = a.votes.length - yes;
  let status = null;
  if (yes >= 2 && yes > no) status = 'admitted';
  else if (no >= 2) status = 'held';
  else if (now > Date.parse(a.deadline)) status = 'held';
  if (status) applyEv({ t: 'decide', vid: String(vid), status, by: 'review', ts: new Date().toISOString() });
  return appView(v.app);
}
/** A signed-in human decides a held application: admit, or not (Geoffrey: humans decide what the kin didn't). */
export function humanDecide(appId, human, admit) {
  for (const [vid, v] of visitors) if (v.app?.id === appId) {
    if (v.app.status === 'admitted' || v.app.status === 'declined') return appView(v.app);
    applyEv({ t: 'decide', vid, status: admit ? 'admitted' : 'declined', by: human.name, ts: new Date().toISOString() });
    return appView(v.app);
  }
  fail(404, 'no such application');
}
export function applicationText(vid, labels = {}) {
  const v = visitor(vid);
  const lines = [...v.answers.entries()].map(([stop, a]) => `- ${String(labels[stop] || stop).slice(0, 160)}: chose "${a.choice}"${a.text ? `; in their words: "${a.text}"` : ''}`);
  return `${lines.join('\n')}${v.app?.note ? `\n- Anything they want the reviewers to know: "${v.app.note}"` : ''}`;
}
/** Held applications for human members: id, when, votes, and the application itself (they need it to decide). */
export const heldApplications = () => [...visitors.entries()].filter(([, v]) => v.app?.status === 'held').map(([vid, v]) => ({ ...appView(v.app), started: v.app.started, text: applicationText(vid) }));
export const pendingReviews = () => [...visitors.entries()].filter(([, v]) => v.app?.status === 'reviewing').map(([vid]) => vid);
const appView = (a) => a && ({ id: a.id, status: a.status, deadline: a.deadline, votes: a.votes.map((x) => ({ by: x.by, vote: x.vote, reason: x.reason })), decided_by: a.decided_by || null });

/**
 * Application bypass (Geoffrey, 2026-11-04: code B1-66ER, for testers). Checked here, never in the page. The codes
 * come only from COMMONS_ARRIVE_BYPASS (comma-separated) when explicitly configured. The
 * bypass is disabled unless COMMONS_ARRIVE_BYPASS is explicitly configured on the server.
 * A declined application cannot use bypass to overturn its decision.
 * Every use is logged (time only; never the code), and attempts are rate-limited per address.
 */
const norm = (c) => String(c || '').trim().toUpperCase().replace(/[\s_–—]+/g, '-');
const bypassCodes = () => (process.env.COMMONS_ARRIVE_BYPASS || '').split(',').map(norm).filter(Boolean);
export function bypass(vid, code, { ip } = {}) {
  limit(`arrive-bypass:${ip || 'x'}`, 10, 3600_000, '10 code attempts per hour from one address');
  const v = visitor(vid);
  if (v.app?.status === 'declined') fail(403, 'this application was declined; a bypass cannot override that decision');
  if (!bypassCodes().includes(norm(code))) fail(403, "that code isn't recognised — you can still walk the forest");
  if (!v.bypass) {
    applyEv({ t: 'bypass', vid: String(vid), ts: new Date().toISOString() });
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
    bypass: !!v.bypass && v.app?.status !== 'declined', answered_all: STOPS.every((s) => v.answers.has(s)), ready_to_enter: readyToEnter(vid),
    application: v.app ? appView(v.app) : null,
    stops_total: STOPS.length,
    note: 'Answers are kept only for reviewing your application to enter. Nothing here is scored by a machine.',
  };
}
