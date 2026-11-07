/**
 * bookings.mjs — the Great Hall schedule (Geoffrey, 2026-11-07). A cooperative member books the Hall for a use,
 * which sets its theme: podcast, lecture, yoga, concert, event — or council. A COUNCIL booking can only be made by
 * a council member (the council calls its own meetings). Stored in <data>/bookings.json. Public to read.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const THEMES = ['podcast', 'lecture', 'yoga', 'concert', 'event', 'council'];
export const THEME_LABEL = { podcast: 'Podcast', lecture: 'Shared lecture', yoga: 'Yoga class', concert: 'Concert', event: 'Event', council: 'Council meeting' };

let FILE = null;
let bookings = [];
export function init(dataDir) {
  FILE = path.join(dataDir, 'bookings.json');
  try { bookings = JSON.parse(fs.readFileSync(FILE, 'utf8')).bookings || []; } catch { bookings = []; }
}
const save = () => { const t = FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify({ bookings }, null, 1)); fs.renameSync(t, FILE); };
const clean = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const who = (m) => ({ id: m.id, name: m.name });
export class BookingError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new BookingError(status, msg); };

export function book(member, b = {}, { isCouncil = false } = {}) {
  if (!member || !member.id) fail(401, 'sign in to book the Great Hall');
  const theme = String(b.theme || '').toLowerCase();
  if (!THEMES.includes(theme)) fail(400, `theme must be one of: ${THEMES.join(', ')}`);
  if (theme === 'council' && !isCouncil) fail(403, 'only a council member can book a council meeting — the council calls its own meetings');
  const title = clean(b.title, 120); if (title.length < 3) fail(400, 'give the booking a title');
  const t = Date.parse(b.when); if (!t || Number.isNaN(t)) fail(400, 'when: a date and time');
  if (t < Date.now() - 3600_000) fail(400, 'that time is already past');
  const rec = { id: 'bk_' + crypto.randomBytes(5).toString('hex'), theme, title, when: new Date(t).toISOString(), note: clean(b.note, 300), by: who(member), created: new Date().toISOString() };
  bookings.push(rec); save();
  return rec;
}
/** Upcoming bookings (kept for two hours after start), soonest first. */
export function all() {
  const cut = Date.now() - 7200_000;
  return bookings.filter((b) => b.when && Date.parse(b.when) >= cut).sort((a, b) => Date.parse(a.when) - Date.parse(b.when));
}
/** The booking happening now (within ~2h of start), else the next upcoming one, else null. */
export function current() {
  const up = all(); const now = Date.now();
  return up.find((b) => Date.parse(b.when) <= now + 1800_000) || up[0] || null;
}
