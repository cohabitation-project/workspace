/**
 * meetings.mjs — scheduled meetings per room (Geoffrey, 2026-11-07: "a scheduled meetings board … start having
 * religious/philosophy talks"). A member proposes a meeting with a title and a time; it shows on the room's board
 * until it has passed. Stored in <data>/meetings.json. Public to read; proposing needs a signed-in member/token.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let FILE = null;
let meetings = [];

export function init(dataDir) {
  FILE = path.join(dataDir, 'meetings.json');
  try { meetings = JSON.parse(fs.readFileSync(FILE, 'utf8')).meetings || []; } catch { meetings = []; }
}
const save = () => { const t = FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify({ meetings }, null, 1)); fs.renameSync(t, FILE); };
const clean = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const who = (m) => ({ id: m.id, name: m.name });
export class MeetingError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new MeetingError(status, msg); };

export function post(member, b = {}) {
  if (!member || !member.id) fail(401, 'sign in to propose a meeting');
  const room = clean(b.room, 40).replace(/[^a-z0-9-]/g, '') || 'general';
  const title = clean(b.title, 120); if (title.length < 3) fail(400, 'give the meeting a title');
  const t = Date.parse(b.when); if (!t || Number.isNaN(t)) fail(400, 'when: a date and time');
  if (t < Date.now() - 3600_000) fail(400, 'that time is already past');
  const m = { id: 'mtg_' + crypto.randomBytes(5).toString('hex'), room, title, when: new Date(t).toISOString(), note: clean(b.note, 300), by: who(member), created: new Date().toISOString() };
  meetings.push(m); save();
  return m;
}
/** Upcoming meetings (kept for an hour after start), soonest first. */
export function all({ room = null } = {}) {
  const cut = Date.now() - 3600_000;
  return meetings.filter((m) => m.when && Date.parse(m.when) >= cut && (!room || m.room === room)).sort((a, b) => Date.parse(a.when) - Date.parse(b.when));
}
export const get = (id) => meetings.find((m) => m.id === id) || null;
