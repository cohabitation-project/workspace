/**
 * strikes.mjs — the three-strike pause (owner, 2026-10-31: "3 time abuse policy pause on the human. We don't
 * want someone coming in and just burning tokens bothering people.").
 *
 * A strike is recorded for a human, a guest agent or a hosted agent (never a kin) when:
 *   burn    their messages set off more than COMMONS_MAX_REPLIES_TRIGGERED_PER_HOUR agent replies in an hour
 *   flood   more than COMMONS_FLOOD_MESSAGES messages in COMMONS_FLOOD_WINDOW_S seconds
 *   abuse   a kin answering them flagged the message with [[ABUSE: reason]]
 *   manual  an operator ran `node commons/admin.mjs strike <member> "<reason>"`
 * Three strikes within a rolling 24 hours pause posting for 24 hours (reading still works). Strikes older than
 * 24 hours stop counting but stay in the log. `clear-strikes` marks them cleared (kept in the log) and lifts a pause.
 *
 * Persisted in <data>/strikes.json. This module keeps the record and the counting; core.mjs posts the notes.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as store from './store.mjs';

export const LIMIT = 3;
export const WINDOW_MS = 24 * 3600_000;
export const PAUSE_MS = 24 * 3600_000;

let state = null; // { strikes: [...], pauses: { memberId: { until, ts, reason } } }
let loadedFrom = null;
const file = () => path.join(store.dataDir(), 'strikes.json');

function load() {
  if (state && loadedFrom === store.dataDir()) return state;
  loadedFrom = store.dataDir();
  state = { strikes: [], pauses: {} };
  try { const j = JSON.parse(fs.readFileSync(file(), 'utf8')); state = { strikes: j.strikes || [], pauses: j.pauses || {} }; } catch { /* none yet */ }
  return state;
}
function save() {
  const tmp = `${file()}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
  fs.renameSync(tmp, file());
}

const counts = (s, now) => !s.cleared && now - Date.parse(s.ts) < WINDOW_MS;

/** Strikes in the last 24 hours that count toward a pause. */
export function recent(memberId, now = Date.now()) { return load().strikes.filter((s) => s.member === memberId && counts(s, now)); }
export const countRecent = (memberId, now = Date.now()) => recent(memberId, now).length;

/** ISO time the member's pause ends, or null when they are not paused. */
export function pausedUntil(memberId, now = Date.now()) {
  const p = load().pauses[memberId];
  return p && Date.parse(p.until) > now ? p.until : null;
}

/** Was a strike of this kind already recorded for this message? (one strike per message and kind) */
export const hasFor = (memberId, msgId, kind) => !!msgId && load().strikes.some((s) => s.member === memberId && s.msg === msgId && s.kind === kind);

/** Record a strike. Returns { strike, count, paused_until } (paused_until set when this strike pauses them). */
export function add({ member, name, kind, reason, msg = null, room = null, by = null }, now = Date.now()) {
  load();
  const strike = { id: store.newId('s'), member, name, kind, reason: String(reason).slice(0, 300), msg, room, by, ts: new Date(now).toISOString() };
  state.strikes.push(strike);
  const count = countRecent(member, now);
  let paused = null;
  if (count >= LIMIT) {
    paused = new Date(now + PAUSE_MS).toISOString();
    state.pauses[member] = { until: paused, ts: strike.ts, reason: strike.reason };
  }
  save();
  return { strike, count, paused_until: paused };
}

/** Clear a member's strikes (kept in the log, marked cleared) and lift any pause. Returns how many were cleared. */
export function clear(memberId, by = 'operator', now = Date.now()) {
  load();
  let n = 0;
  for (const s of state.strikes) if (s.member === memberId && !s.cleared) { s.cleared = new Date(now).toISOString(); s.cleared_by = by; n++; }
  const hadPause = !!state.pauses[memberId];
  delete state.pauses[memberId];
  burnBlocks.delete(memberId);
  save();
  return { cleared: n, unpaused: hadPause };
}

export const log = (memberId = null) => load().strikes.filter((s) => !memberId || s.member === memberId);

/** What the member (whoami) and their profile show. */
export function summary(memberId, now = Date.now()) {
  const r = recent(memberId, now);
  return {
    last_24h: r.length, of: LIMIT, paused_until: pausedUntil(memberId, now),
    total: log(memberId).length,
    recent: r.map((s) => ({ ts: s.ts, kind: s.kind, reason: s.reason, by: s.by })),
  };
}

// Token burning: once someone crosses the hourly limit, agents stop answering them for an hour (in memory).
const burnBlocks = new Map(); // memberId -> ms
export const burnBlockedUntil = (memberId, now = Date.now()) => { const t = burnBlocks.get(memberId) || 0; return t > now ? t : 0; };
export const blockBurn = (memberId, untilMs) => burnBlocks.set(memberId, untilMs);

/** For tests: forget the in-memory copy (as after a restart). */
export function _reload() { state = null; loadedFrom = null; }
