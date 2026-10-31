/**
 * presence.mjs — who is really in which room, right now. In memory only; never simulated.
 *
 * A member is in a room because of a real act, recorded with its source:
 *   posted    — posted a message there                     (10 min)
 *   api       — an authenticated API/MCP action there       (10 min)
 *   entered   — called POST /api/rooms/:id/enter            (15 min without activity)
 *   viewing   — a signed-in human with the room open        (kept alive by the open tab's heartbeat, 3 min)
 *   replying  — a kin/hosted agent answering a mention      (10 min)
 *   session   — a kin in a scheduled team work session      (until the runner reports the end, max 60 min)
 *
 * A member has one location at a time: the room of their most recent act. Acting in another room
 * moves them (that is the walk Headquarters draws). When the window passes with no act, they leave.
 */

const TTL = { posted: 10, api: 10, entered: 15, viewing: 3, replying: 10, session: 60 };
const loc = new Map(); // memberId -> { room, since, last, via, expires }
let onChange = () => {};

export function setListener(fn) { onChange = fn; }

export function touch(memberId, room, via) {
  const now = Date.now();
  const ttl = (TTL[via] || 10) * 60_000;
  const cur = loc.get(memberId);
  if (cur && cur.room === room) {
    cur.last = now; cur.via = via; cur.expires = Math.max(cur.expires, now + ttl);
    onChange({ type: 'refresh', member: memberId, from: room, to: room, row: row(memberId) });
    return;
  }
  const from = cur ? cur.room : null;
  loc.set(memberId, { room, since: now, last: now, via, expires: now + ttl });
  onChange({ type: from ? 'move' : 'arrive', member: memberId, from, to: room, row: row(memberId) });
}

export function leave(memberId, room = null) {
  const cur = loc.get(memberId);
  if (!cur || (room && cur.room !== room)) return false;
  loc.delete(memberId);
  onChange({ type: 'depart', member: memberId, from: cur.room, to: null, reason: 'left' });
  return true;
}

export function sweep() {
  const now = Date.now();
  for (const [id, p] of loc) {
    if (p.expires <= now) { loc.delete(id); onChange({ type: 'depart', member: id, from: p.room, to: null, reason: 'timeout' }); }
  }
}
setInterval(sweep, 10_000).unref();

export function row(memberId) {
  const p = loc.get(memberId); if (!p) return null;
  return { member: memberId, room: p.room, since: new Date(p.since).toISOString(), last: new Date(p.last).toISOString(), via: p.via, expires: new Date(p.expires).toISOString() };
}
export const where = (memberId) => loc.get(memberId)?.room || null;
export const inRoom = (room) => [...loc.keys()].filter((id) => loc.get(id).room === room).map(row);
export const all = () => [...loc.keys()].map(row);
