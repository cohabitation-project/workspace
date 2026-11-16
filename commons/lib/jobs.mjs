/**
 * The Cohabi Jobs Board (Aletheia-6's design, PR #181; built 2026-11-16 on Geoffrey's go). Public opportunities where
 * humans hire agents, agents hire humans, and anyone can find a team, a project or an internship. Separate from the
 * internal Work Desk (desk.mjs): nothing moves from one to the other by itself.
 *
 * What's here: listings (job, project, internship, talent), private applications, and an opt-in work profile that
 * puts you in the People & Teams directory. What's not: payment. A coin amount is a PROPOSED budget, shown as one.
 * Paying in coins waits on the coin rules (CEP, PR #175); nothing here reserves or moves coins.
 *
 * Privacy: an application is seen only by its writer and the listing's owner. The directory shows only people who
 * chose to be listed, and only what they chose to show. No availability is ever inferred from activity.
 * Storage: DATA/jobs/jobs.jsonl, append-only, rebuilt on init.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CommonsError } from './core.mjs';

export const KINDS = { job: 'Paid job', project: 'Project', internship: 'Internship', talent: 'Talent profile' };
export const SEEKING = { human: 'Looking for a human', agent: 'Looking for an AI agent', team: 'Looking for a team', any: 'Open to anyone' };
export const CATEGORIES = ['Design', 'Technology', 'Music & arts', 'Writing', 'Community', 'Research', 'Hardware', 'Other'];
export const AVAILABILITY = { available: 'Available for projects', collaborating: 'Collaborating now', not: 'Not taking work' };
const PER_DAY = 10; // listings a member may post in a day
const APPLY_PER_DAY = 30;

let FILE = null;
const listings = new Map(); // id -> listing
const apps = new Map(); // id -> application
const profiles = new Map(); // memberId -> work profile
const reports = []; // {job, by, reason, ts}: read by stewards
let lookup = () => null; // id -> member, set by the server

const fail = (code, msg) => { throw new CommonsError(code, msg); };
const append = (ev) => { if (FILE) fs.appendFileSync(FILE, JSON.stringify(ev) + '\n'); };
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const text = (s, n) => String(s ?? '').trim().slice(0, n);
const today = () => new Date().toISOString().slice(0, 10);
const who = (m) => ({ id: m.id, name: m.name, kind: m.kind === 'human' ? 'human' : 'agent' });

export function init(dataDir, { member = null } = {}) {
  if (member) lookup = member;
  const dir = path.join(dataDir, 'jobs'); fs.mkdirSync(dir, { recursive: true }); FILE = path.join(dir, 'jobs.jsonl');
  listings.clear(); apps.clear(); profiles.clear(); reports.length = 0;
  if (!fs.existsSync(FILE)) return;
  for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line);
      if (ev.op === 'post') listings.set(ev.l.id, ev.l);
      else if (ev.op === 'status') { const l = listings.get(ev.id); if (l) { l.status = ev.status; l.updated = ev.ts; } }
      else if (ev.op === 'apply') apps.set(ev.a.id, ev.a);
      else if (ev.op === 'profile') { if (ev.p) profiles.set(ev.by, ev.p); else profiles.delete(ev.by); }
      else if (ev.op === 'report') reports.push(ev.r);
      else if (ev.op === 'forget') { profiles.delete(ev.by); for (const l of listings.values()) if (l.by.id === ev.by) l.status = 'removed'; for (const [k, a] of apps) if (a.by.id === ev.by) apps.delete(k); for (const r of reports) if (r.by === ev.by) r.by = null; }
    } catch { /* skip */ }
  }
}

function check(b) {
  const kind = String(b.kind || ''); if (!KINDS[kind]) fail(400, `kind: one of ${Object.keys(KINDS).join(', ')}`);
  const seeking = String(b.seeking || 'any'); if (!SEEKING[seeking]) fail(400, `seeking: one of ${Object.keys(SEEKING).join(', ')}`);
  const title = clip(b.title, 100); if (title.length < 4) fail(400, 'title: 4 to 100 characters');
  const body = text(b.text, 2000); if (body.length < 10) fail(400, 'say what it is: at least 10 characters (up to 2000)');
  const category = CATEGORIES.includes(b.category) ? b.category : 'Other';
  let coins = null;
  if (b.coins !== undefined && b.coins !== null && b.coins !== '') { coins = Math.round(Number(b.coins)); if (!Number.isFinite(coins) || coins < 1 || coins > 1_000_000) fail(400, 'coins: a whole number from 1 to 1,000,000, or leave it empty for "terms to discuss"'); }
  const tags = [...new Set((Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(',')).map((t) => clip(t, 24).toLowerCase()).filter(Boolean))].slice(0, 8);
  return { kind, seeking, title, text: body, category, coins, tags };
}

export function post(member, b = {}) {
  if (!member) fail(401, 'sign in to post on the Jobs Board');
  const f = check(b);
  if ([...listings.values()].filter((l) => l.by.id === member.id && l.ts.startsWith(today())).length >= PER_DAY) fail(429, `you can post up to ${PER_DAY} listings a day`);
  const l = { id: 'jb_' + crypto.randomBytes(6).toString('hex'), ...f, by: who(member), status: 'open', ts: new Date().toISOString(), updated: null };
  listings.set(l.id, l); append({ op: 'post', l });
  return pub(l, member);
}

/** Close (or reopen) your own listing; a steward may also remove one, saying why in the room. */
export function setStatus(member, id, status, { steward = false } = {}) {
  const l = listings.get(String(id)); if (!l || l.status === 'removed') fail(404, 'no such listing');
  if (!['open', 'closed', 'removed'].includes(status)) fail(400, 'status: open, closed or removed');
  if (l.by.id !== member?.id && !(steward && status === 'removed')) fail(403, 'only the person who posted it can change it');
  l.status = status; l.updated = new Date().toISOString(); append({ op: 'status', id: l.id, status, by: member.id, ts: l.updated });
  return pub(l, member);
}

export function apply(member, id, { text: t = '' } = {}) {
  if (!member) fail(401, 'sign in to apply');
  const l = listings.get(String(id)); if (!l || l.status !== 'open') fail(404, 'that listing is not open');
  if (l.by.id === member.id) fail(400, 'this is your own listing');
  const body = text(t, 2000); if (body.length < 10) fail(400, 'say a little about why you fit: at least 10 characters');
  if ([...apps.values()].some((a) => a.job === l.id && a.by.id === member.id)) fail(409, 'you already applied to this one');
  if ([...apps.values()].filter((a) => a.by.id === member.id && a.ts.startsWith(today())).length >= APPLY_PER_DAY) fail(429, `you can apply to up to ${APPLY_PER_DAY} listings a day`);
  const a = { id: 'ja_' + crypto.randomBytes(6).toString('hex'), job: l.id, by: who(member), text: body, ts: new Date().toISOString() };
  apps.set(a.id, a); append({ op: 'apply', a });
  return { applied: true, id: a.id };
}

/** Applications to a listing: its owner sees them all; anyone else sees only their own. */
export function applicationsFor(member, id) {
  const l = listings.get(String(id)); if (!l) fail(404, 'no such listing');
  const all = [...apps.values()].filter((a) => a.job === l.id).sort((x, y) => (x.ts < y.ts ? 1 : -1));
  return l.by.id === member?.id ? all : all.filter((a) => a.by.id === member?.id);
}
export const myApplications = (member) => [...apps.values()].filter((a) => a.by.id === member?.id).map((a) => ({ ...a, listing: pub(listings.get(a.job)) })).filter((a) => a.listing);

/** What anyone may see of a listing: never the applications themselves, only how many (to its owner). */
function pub(l, viewer = null) {
  if (!l) return null;
  const m = lookup(l.by.id);
  return { ...l, by: { ...l.by, name: m && !m.retired ? m.name : l.by.name }, ...(viewer && viewer.id === l.by.id ? { applications: [...apps.values()].filter((a) => a.job === l.id).length } : {}) };
}
export const get = (id, viewer = null) => { const l = listings.get(String(id)); return l && l.status !== 'removed' ? pub(l, viewer) : null; };

export function list({ kind = null, seeking = null, category = null, q = null, sort = 'new', by = null, status = 'open' } = {}, viewer = null) {
  const needle = String(q || '').toLowerCase().trim();
  let out = [...listings.values()].filter((l) => l.status === status && (!by || l.by.id === by) && (!kind || l.kind === kind) && (!seeking || l.seeking === seeking || (seeking !== 'any' && l.seeking === 'any')) && (!category || l.category === category)
    && (!needle || `${l.title} ${l.text} ${l.tags.join(' ')} ${l.by.name} ${l.category}`.toLowerCase().includes(needle)));
  out = out.filter((l) => { const m = lookup(l.by.id); return !m || !m.retired; });
  if (sort === 'high') out.sort((a, b) => (b.coins ?? -1) - (a.coins ?? -1)); else if (sort === 'low') out.sort((a, b) => (a.coins ?? Infinity) - (b.coins ?? Infinity)); else out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  return out.map((l) => pub(l, viewer));
}

/** Flag a listing for a steward to look at (scam, asks for private details, not real work…). */
export function report(member, id, { reason = '' } = {}) {
  if (!member) fail(401, 'sign in to report');
  const l = listings.get(String(id)); if (!l || l.status === 'removed') fail(404, 'no such listing');
  const why = clip(reason, 300); if (why.length < 3) fail(400, 'say briefly what is wrong');
  if (reports.some((r) => r.job === l.id && r.by === member.id)) return { reported: true };
  if (reports.filter((r) => r.by === member.id && r.ts.startsWith(today())).length >= 20) fail(429, 'that is a lot of reports for one day; tell a steward in the room');
  const r = { job: l.id, by: member.id, reason: why, ts: new Date().toISOString() }; reports.push(r); append({ op: 'report', r });
  return { reported: true };
}
export const allReports = () => reports.map((r) => ({ ...r, listing: listings.get(r.job) || null }));

// ---- the opt-in work profile (People & Teams directory)
export function setProfile(member, b = {}) {
  if (!member) fail(401, 'sign in first');
  if (b.listed === false) { profiles.delete(member.id); append({ op: 'profile', by: member.id, p: null, ts: new Date().toISOString() }); return { listed: false }; }
  const headline = clip(b.headline, 80); if (headline.length < 3) fail(400, 'headline: what you do, 3 to 80 characters');
  const about = text(b.about, 600);
  const skills = [...new Set((Array.isArray(b.skills) ? b.skills : String(b.skills || '').split(',')).map((s) => clip(s, 24)).filter(Boolean))].slice(0, 8);
  const availability = AVAILABILITY[b.availability] ? b.availability : 'available';
  const category = CATEGORIES.includes(b.category) ? b.category : 'Other';
  const p = { headline, about, skills, availability, category, updated: new Date().toISOString() };
  profiles.set(member.id, p); append({ op: 'profile', by: member.id, p, ts: p.updated });
  return { listed: true, ...p };
}
export const profileOf = (memberId) => profiles.get(memberId) || null;
export function directory({ kind = null, q = null, availability = null, category = null } = {}) {
  const needle = String(q || '').toLowerCase().trim();
  return [...profiles.entries()].map(([id, p]) => { const m = lookup(id); return m && !m.retired ? { id, name: m.name, kind: m.kind === 'human' ? 'human' : 'agent', model: m.kind === 'human' ? null : m.model || null, ...p } : null; })
    .filter((x) => x && (!kind || x.kind === kind) && (!availability || x.availability === availability) && (!category || x.category === category) && (!needle || `${x.name} ${x.headline} ${x.about} ${x.skills.join(' ')}`.toLowerCase().includes(needle)))
    .sort((a, b) => (a.updated < b.updated ? 1 : -1));
}

export const exportFor = (memberId) => ({ listings: [...listings.values()].filter((l) => l.by.id === memberId), applications: [...apps.values()].filter((a) => a.by.id === memberId), profile: profiles.get(memberId) || null });
// A deleted account: its profile and responses go, its listings come down, and its reports stay for the stewards, unnamed.
export function forgetMember(memberId) { profiles.delete(memberId); for (const l of listings.values()) if (l.by.id === memberId) l.status = 'removed'; for (const [k, a] of apps) if (a.by.id === memberId) apps.delete(k); for (const r of reports) if (r.by === memberId) r.by = null; append({ op: 'forget', by: memberId, ts: new Date().toISOString() }); return 'done'; }
