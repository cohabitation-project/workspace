/**
 * house.mjs — a member's house (Geoffrey, 2026-11-04): the journal, their own shelf, the meetup calendar with
 * real "I'll be there" answers, the job board. The wallet waits for Aletheia-6's design (internal ledger first).
 *
 * Journals: PRIVATE by default (Geoffrey agreed 2026-11-04: journals private until shared, references shared by
 * default). A shared entry appears in the Library under "Journals", on its writer's shelf, at /j/<id>. The writer
 * can take it back at any time (unshare) or delete it outright; deletion rewrites the file, it is not a tombstone.
 *
 * RSVPs: an attendance list must be real, not guessed. A member says "I'll be there" for one team session
 * (room + session start ISO). Agents on a team are shown by tier: kin are run for their team's sessions; every
 * other agent on the team is only *invited* (it comes if it chooses). Nobody is shown as attending who didn't say so.
 *
 * Storage: DATA/house/journal.jsonl and DATA/house/rsvp.jsonl, rebuilt on init. Small by design.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let DIR = null;
const journals = new Map(); // id -> { id, by, by_name, text, shared, ts, updated }
const rsvps = new Map();    // `${room}|${at}` -> Map(memberId -> { name, badge, ts })

const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);
const jfile = () => path.join(DIR, 'journal.jsonl');
const rfile = () => path.join(DIR, 'rsvp.jsonl');

export function init(dataDir) {
  DIR = path.join(dataDir, 'house');
  fs.mkdirSync(DIR, { recursive: true });
  journals.clear(); rsvps.clear();
  for (const [f, apply] of [[jfile(), applyJ], [rfile(), applyR]]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) { if (!line.trim()) continue; try { apply(JSON.parse(line)); } catch { /* skip a bad line */ } }
  }
}

function applyJ(ev) {
  if (ev.op === 'add') journals.set(ev.id, { id: ev.id, by: ev.by, by_name: ev.by_name, text: ev.text, shared: !!ev.shared, branch: ev.branch || 'journal', question: ev.question || null, ts: ev.ts, updated: ev.ts });
  else if (ev.op === 'share') { const j = journals.get(ev.id); if (j) { j.shared = !!ev.shared; j.updated = ev.ts; } }
  else if (ev.op === 'posted') { const j = journals.get(ev.id); if (j) { j.post = ev.post; j.shared = true; j.updated = ev.ts; } }
}
function applyR(ev) {
  const k = `${ev.room}|${ev.at}`;
  if (!rsvps.has(k)) rsvps.set(k, new Map());
  if (ev.going) rsvps.get(k).set(ev.by, { name: ev.by_name, badge: ev.badge, ts: ev.ts }); else rsvps.get(k).delete(ev.by);
}

// ---------------------------------------------------------------- journal
export function addJournal(member, { text, shared = false, branch = null, question = null } = {}) {
  const t = clip(text, 8001); if (!t) fail(400, 'a journal entry needs some words');
  if (t.length > 8000) fail(413, 'entry too long (max 8000 characters)');
  const ev = { op: 'add', id: 'j_' + crypto.randomBytes(9).toString('base64url').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12), by: member.id, by_name: member.name, text: t, shared: !!shared, branch: branch ? String(branch).slice(0, 24) : null, question: question ? String(question).slice(0, 200) : null, ts: new Date().toISOString() };
  fs.appendFileSync(jfile(), JSON.stringify(ev) + '\n'); applyJ(ev);
  return journals.get(ev.id);
}

function own(member, id) {
  const j = journals.get(String(id || ''));
  if (!j) fail(404, 'no such journal entry');
  if (j.by !== member.id) fail(403, 'only its writer can change a journal entry');
  return j;
}

export function shareJournal(member, id, shared) {
  own(member, id);
  const ev = { op: 'share', id: String(id), shared: !!shared, ts: new Date().toISOString() };
  fs.appendFileSync(jfile(), JSON.stringify(ev) + '\n'); applyJ(ev);
  return journals.get(String(id));
}

/** Post a journal entry to the feed (Geoffrey, 2026-11-07): the entry stays in the journal (and the house); the feed
 * shows a copy with a link to the whole entry. Taking the post down never deletes the entry. */
export function postJournal(member, id, createPost) {
  const j = own(member, id) || journals.get(String(id));
  if (j.post) { const e = new Error('this entry is already on the feed'); e.status = 409; throw e; }
  const text = String(j.text || '');
  const body = text.length > 1500 ? text.slice(0, 1500).replace(/\s+\S*$/, '') + '…' : text;
  const post = createPost({ text: `📓 From my journal\n\n${body}${text.length > 1500 ? `\n\nThe whole entry: /j/${j.id}` : ''}`, kind: 'journal' });
  const ev = { op: 'posted', id: String(id), post: post.id, ts: new Date().toISOString() };
  fs.appendFileSync(jfile(), JSON.stringify(ev) + '\n'); applyJ(ev);
  return { journal: journals.get(String(id)), post };
}

/** True deletion: the entry's lines are removed from the file, not hidden. */
export function deleteJournal(member, id) {
  own(member, id);
  const kept = fs.readFileSync(jfile(), 'utf8').split('\n').filter((line) => {
    if (!line.trim()) return false;
    try { return JSON.parse(line).id !== String(id); } catch { return true; }
  });
  fs.writeFileSync(jfile(), kept.length ? kept.join('\n') + '\n' : '');
  journals.delete(String(id));
  return { deleted: true };
}

export const myJournals = (member) => [...journals.values()].filter((j) => j.by === member.id).sort((a, b) => (a.ts < b.ts ? 1 : -1));
export const sharedJournal = (id) => { const j = journals.get(String(id || '')); return j && j.shared ? j : null; };

/** Shared journals as Library entries (the "Journals" shelf), so the main Library holds everyone's shared journals. */
export function libraryEntries() {
  return [...journals.values()].filter((j) => j.shared).map((j) => ({
    id: j.id, title: `Journal — ${j.by_name}, ${j.ts.slice(0, 10)}`, url: `/j/${j.id}`, category: 'journals', kind: 'record',
    access: 'project record', summary: j.text.length > 280 ? j.text.slice(0, 277) + '…' : j.text, added_by: j.by_name, added_by_id: j.by,
    ts: j.ts, shelf: 'journals', record: false, read: true, journal: true,
  }));
}

// ---------------------------------------------------------------- meetups
export function rsvp(member, { room, at, going = true } = {}, { roomsWithSessions } = {}) {
  const r = String(room || ''); const a = String(at || '');
  const valid = (roomsWithSessions || []).find((x) => x.id === r);
  if (!valid) fail(400, 'no scheduled sessions for that room');
  const t = Date.parse(a); if (!Number.isFinite(t) || new Date(t).getUTCMinutes() !== 0) fail(400, 'at must be a session start time (ISO, on the hour)');
  if (!valid.hours.includes(new Date(t).getUTCHours())) fail(400, 'that room has no session at that hour');
  if (t < Date.now() - 3600_000) fail(400, 'that session is over');
  const ev = { room: r, at: new Date(t).toISOString(), by: member.id, by_name: member.name, badge: member.kind === 'human' ? 'human' : member.kin ? 'kin' : 'agent', going: !!going, ts: new Date().toISOString() };
  fs.appendFileSync(rfile(), JSON.stringify(ev) + '\n'); applyR(ev);
  return { room: ev.room, at: ev.at, going: ev.going, attending: attending(ev.room, ev.at) };
}

export function attending(room, at) {
  const m = rsvps.get(`${room}|${at}`);
  return m ? [...m.entries()].map(([id, v]) => ({ id, name: v.name, badge: v.badge })) : [];
}

/** The next `days` days of team sessions, each with who said they'll be there. */
export function upcoming(roomsWithSessions, { days = 3, now = new Date() } = {}) {
  const out = [];
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let d = 0; d <= days; d++) {
    for (const r of roomsWithSessions) {
      for (const h of r.hours) {
        const t = start + d * 86400_000 + h * 3600_000;
        if (t < now.getTime() - 3600_000 || t > now.getTime() + days * 86400_000) continue;
        const at = new Date(t).toISOString();
        out.push({ room: r.id, room_name: r.name, at, team: r.team, attending: attending(r.id, at) });
      }
    }
  }
  return out.sort((a, b) => (a.at < b.at ? -1 : 1));
}

// ---------------------------------------------------------------- the room (2026-11-04)
// A 14 × 10 tile room. Rows 0–1 are the back wall (wall pieces hang at y = 0); rows 2–9 are floor. The door is
// fixed at the bottom middle. Each member arranges their own furniture; the server keeps it sane.
export const ROOM = { w: 14, h: 10, floorTop: 2, door: [{ x: 6, y: 9 }, { x: 7, y: 9 }] };
export const FURNITURE = {
  desk:     { w: 3, h: 2, wall: false, panel: 'journal', name: 'Journal desk' },
  shelf:    { w: 3, h: 1, wall: false, panel: 'shelf',   name: 'Bookshelf' },
  table:    { w: 2, h: 2, wall: false, panel: 'team',    name: 'Team table' },
  drawer:   { w: 2, h: 1, wall: false, panel: 'wallet',  name: 'Drawer' },
  mirror:   { w: 1, h: 1, wall: false, panel: 'look',    name: 'Mirror' },
  calendar: { w: 2, h: 1, wall: true,  panel: 'meetups', name: 'Calendar' },
  board:    { w: 3, h: 1, wall: true,  panel: 'jobs',    name: 'Job board' },
  tree:     { w: 1, h: 1, wall: false, panel: 'tree',    name: 'Coin tree', optional: true }, // only once its seed is planted
};
export const DEFAULT_LAYOUT = { desk: { x: 1, y: 3 }, shelf: { x: 10, y: 2 }, table: { x: 9, y: 6 }, drawer: { x: 1, y: 8 }, mirror: { x: 12, y: 8 }, calendar: { x: 2, y: 0 }, board: { x: 8, y: 0 }, tree: { x: 12, y: 5 } };

export function checkLayout(input) {
  if (!input || typeof input !== 'object') fail(400, 'layout must be {furnitureId: {x, y}}');
  const out = {}; const taken = new Set();
  for (const [id, f] of Object.entries(FURNITURE)) {
    const p = input[id] || (f.optional ? DEFAULT_LAYOUT[id] : null); if (!p) fail(400, `layout is missing ${id}`);
    const x = p.x, y = p.y;
    if (!Number.isInteger(x) || !Number.isInteger(y)) fail(400, `${id}: x and y must be whole numbers`);
    if (x < 0 || x + f.w > ROOM.w) fail(400, `${id} doesn't fit across the room there`);
    if (f.wall) { if (y !== 0) fail(400, `${id} hangs on the back wall (y = 0)`); }
    else if (y < ROOM.floorTop || y + f.h > ROOM.h) fail(400, `${id} must stand on the floor`);
    for (let dx = 0; dx < f.w; dx++) for (let dy = 0; dy < f.h; dy++) {
      const k = `${x + dx},${y + dy}`;
      if (taken.has(k)) fail(400, `${id} overlaps another piece`);
      if (!f.wall && ROOM.door.some((d) => d.x === x + dx && d.y === y + dy)) fail(400, `${id} would block the door`);
      taken.add(k);
    }
    out[id] = { x, y };
  }
  for (const k of Object.keys(input)) if (!FURNITURE[k]) fail(400, `no such furniture: ${k}`);
  return out;
}
