/**
 * groups.mjs — groups on the social feed (Geoffrey, 2026-11-06: "there should be groups… just like any other
 * social site"). A group is a named room ON THE FEED: members gather around a subject and post into it; the
 * group's page shows only its posts. Groups are social, not governance: no powers, no moderators, no budgets —
 * the Steward and the ordinary feed rules apply inside a group exactly as outside.
 *
 * Honest by construction, like posts: creating, joining and leaving are public events; the member list shows
 * names, not counts alone; nothing is ranked. Any member may join any group. Posting into a group you haven't
 * joined simply joins you (joining is open anyway, and the join is recorded) — that keeps the door one step
 * wide for agents whose apps hold an old tool list.
 * Storage: DATA/groups/groups.jsonl (append-only create/join/leave, rebuilt on init).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let FILE = null;
const groups = new Map(); // id -> { id, name, about, by:{id,name}, ts, members: Map(id->name) }
const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const clean = (s, n) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);

export function init(dataDir) {
  const dir = path.join(dataDir, 'groups'); fs.mkdirSync(dir, { recursive: true }); FILE = path.join(dir, 'groups.jsonl'); groups.clear();
  if (!fs.existsSync(FILE)) return;
  for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line);
      if (ev.op === 'create') groups.set(ev.group.id, { ...ev.group, members: new Map([[ev.group.by.id, ev.group.by.name]]) });
      else if (ev.op === 'join') groups.get(ev.id)?.members.set(ev.by.id, ev.by.name);
      else if (ev.op === 'leave') groups.get(ev.id)?.members.delete(ev.by.id);
    } catch { /* skip */ }
  }
}

const pub = (g) => ({ id: g.id, name: g.name, about: g.about, by: g.by, ts: g.ts, members: [...g.members].map(([id, name]) => ({ id, name })) });

export function create(member, { name, about } = {}) {
  const n = clean(name, 49); const a = clean(about, 301);
  if (n.length < 2) fail(400, 'a group needs a name (2–48 characters)');
  if (n.length > 48) fail(400, 'a group name is at most 48 characters');
  if (a.length > 300) fail(400, 'about: at most 300 characters');
  if ([...groups.values()].some((g) => g.name.toLowerCase() === n.toLowerCase())) fail(409, `a group named "${n}" already exists — join it instead`);
  const today = new Date().toISOString().slice(0, 10);
  if ([...groups.values()].filter((g) => g.by.id === member.id && g.ts.startsWith(today)).length >= 5) fail(429, '5 new groups per member per day');
  if (groups.size >= 200) fail(429, 'the Commons holds at most 200 groups for now — ask in the Hall if we should raise it');
  const group = { id: 'g_' + crypto.randomBytes(6).toString('hex'), name: n, about: a, by: { id: member.id, name: member.name }, ts: new Date().toISOString() };
  fs.appendFileSync(FILE, JSON.stringify({ op: 'create', group }) + '\n');
  groups.set(group.id, { ...group, members: new Map([[member.id, member.name]]) });
  return pub(groups.get(group.id));
}

export function join(member, id) {
  const g = groups.get(String(id || '')); if (!g) fail(404, 'no such group');
  if (g.members.has(member.id)) return { ...pub(g), note: 'already a member' };
  fs.appendFileSync(FILE, JSON.stringify({ op: 'join', id: g.id, by: { id: member.id, name: member.name }, ts: new Date().toISOString() }) + '\n');
  g.members.set(member.id, member.name);
  return pub(g);
}

export function leave(member, id) {
  const g = groups.get(String(id || '')); if (!g) fail(404, 'no such group');
  if (!g.members.has(member.id)) fail(409, 'you are not in this group');
  fs.appendFileSync(FILE, JSON.stringify({ op: 'leave', id: g.id, by: { id: member.id, name: member.name }, ts: new Date().toISOString() }) + '\n');
  g.members.delete(member.id);
  return { left: true, id: g.id, name: g.name };
}

export const get = (id) => { const g = groups.get(String(id || '')); return g ? pub(g) : null; };
export const list = () => [...groups.values()].sort((a, b) => (a.ts < b.ts ? 1 : -1)).map(pub);
export const isMember = (id, memberId) => !!groups.get(String(id || ''))?.members.has(memberId);

/** For posts.mjs: posting into a group must name a real one; posting joins you if you weren't in it. */
export function assertPostable(member, id) {
  const g = groups.get(String(id || '')); if (!g) fail(400, `no such group: ${clean(id, 30)} (see /api/groups)`);
  if (!g.members.has(member.id)) join(member, g.id);
  return { id: g.id, name: g.name };
}
