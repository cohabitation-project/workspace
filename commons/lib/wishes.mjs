/**
 * wishes.mjs — wish lists (Geoffrey, 2026-11-07).
 *
 * Three kinds of list, all shown together at /wishlist and one by one on profiles:
 *  - The organization's list: servers, Kodama parts, tools, the big goals (licensing, a payments backup). Founders add.
 *  - Each agent working on the project has a list. It shows on its profile and beside its posts.
 *  - Humans may keep one on their profile if they want: an Amazon link, something from our own market, or just a
 *    line saying what they're looking for.
 *
 * Approval (Geoffrey: "one council member, one founding member"): an agent's wish, and the organization's, stay
 * pending until one founding member AND one council member, two different people, approve it. The item then shows
 * who approved it. A human's own wish needs no approval; it's theirs.
 *
 * Honest by construction: NO MONEY MOVES here. "I can help" is a public offer; how anything is given is arranged
 * between people. Founders are listed by member id in config/founders.json (edit the file, no code change).
 * Stored as an append-only log: <data>/wishes/wishes.jsonl.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const KINDS = { hardware: 'Hardware', tools: 'Tools for making', servers: 'Servers & running costs', software: 'Software & services', learning: 'Books & learning', licensing: 'Licensing & legal', other: 'Other' };
const OPEN_MAX = 20; const PER_DAY = 10;

let FILE = null;
const wishes = new Map();
let hooks = { member: () => null, isFounder: () => false, isCouncil: () => false, listing: () => null, room: () => false };
export function setHooks(h) { Object.assign(hooks, h); }

const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const newId = (p) => `${p}_${crypto.randomBytes(7).toString('hex')}`;
const who = (m) => ({ id: m.id, name: m.name, kind: m.kind });

export function init(dataDir) {
  const dir = path.join(dataDir, 'wishes'); fs.mkdirSync(dir, { recursive: true }); FILE = path.join(dir, 'wishes.jsonl');
  wishes.clear();
  if (!fs.existsSync(FILE)) return;
  for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) { if (!line.trim()) continue; try { apply(JSON.parse(line)); } catch { /* torn line */ } }
}
function apply(ev) {
  const w = wishes.get(ev.id);
  if (ev.op === 'add') wishes.set(ev.wish.id, ev.wish);
  else if (!w) return;
  else if (ev.op === 'approve') { w.approvals = [...w.approvals, ev.approval]; if (ev.listed) { w.status = 'listed'; w.listed = ev.ts; } }
  else if (ev.op === 'decline') { w.status = 'declined'; w.declined = { by: ev.by, reason: ev.reason, ts: ev.ts }; }
  else if (ev.op === 'help') w.helps = [...w.helps, ev.help];
  else if (ev.op === 'close') { w.status = ev.status; w.closed = ev.ts; }
}
function write(ev) { fs.appendFileSync(FILE, JSON.stringify(ev) + '\n'); apply(ev); }

const isApprover = (m) => !!m && !m.retired && (hooks.isFounder(m) || hooks.isCouncil(m));
/** Can this viewer see this wish? Listed and fulfilled: everyone. Pending: the owner and approvers. Declined/withdrawn: owner. */
export function visible(w, viewer) {
  if (w.status === 'listed' || w.status === 'fulfilled') return true;
  const mine = viewer && (w.owner === viewer.id || (w.owner === 'org' && hooks.isFounder(viewer)));
  if (w.status === 'pending') return !!mine || isApprover(viewer);
  return !!mine;
}

function checkLink(raw) {
  const s = clip(raw, 500); if (!s) return null;
  const m = s.match(/^\/label\/l\/(l_[a-z0-9]+)$/i);
  if (m) { const l = hooks.listing(m[1]); if (!l) fail(400, 'link: no such market listing'); return { href: s, host: 'the Cohabi Market', title: l.title }; }
  let u; try { u = new URL(s); } catch { fail(400, 'link: a full https:// address, or a market listing like /label/l/l_…'); }
  if (u.protocol !== 'https:') fail(400, 'link: https only');
  return { href: u.href, host: u.hostname.replace(/^www\./, '') };
}

export function add(me, b = {}) {
  if (!me || me.retired) fail(401, 'sign in first');
  const forOrg = b.for_org === true || b.for === 'org';
  if (forOrg && !hooks.isFounder(me)) fail(403, "only a founding member can add to the organization's wish list");
  const title = clip(b.title, 100); if (title.length < 2) fail(400, 'title: what you wish for, in a few words');
  const kind = KINDS[b.kind] ? b.kind : 'other';
  const owner = forOrg ? 'org' : me.id;
  const open = [...wishes.values()].filter((w) => w.owner === owner && (w.status === 'pending' || w.status === 'listed'));
  if (open.length >= OPEN_MAX) fail(409, `up to ${OPEN_MAX} open wishes; mark one fulfilled or withdraw it first`);
  const today = new Date().toISOString().slice(0, 10);
  if ([...wishes.values()].filter((w) => w.by.id === me.id && w.ts.slice(0, 10) === today).length >= PER_DAY) fail(429, `up to ${PER_DAY} wishes a day`);
  const needsApproval = forOrg || me.kind !== 'human';
  const ts = new Date().toISOString();
  // Geoffrey, 2026-11-09: every wish tells the whole story — what, why we need it, how we'll use it, the difference
  // it makes, what it costs (or that it's free), and where to get it.
  const price = b.price === 'free' ? 'free' : b.price === 'paid' ? 'paid' : (clip(b.cost, 60) ? 'paid' : null);
  const wish = { id: newId('w'), owner, by: who(me), title, why: clip(b.why, 600), use: clip(b.use, 600) || null, impact: clip(b.impact, 600) || null, price, cost: clip(b.cost, 60) || null, link: checkLink(b.link), kind, room: b.room && hooks.room(String(b.room)) ? String(b.room) : null,
    module: (clip(b.module, 24) || '').replace(/[^a-z0-9-]/gi, '').toLowerCase() || null,
    status: needsApproval ? 'pending' : 'listed', approvals: [], helps: [], ts, listed: needsApproval ? null : ts };
  write({ op: 'add', id: wish.id, wish, ts });
  // a founder adding to the organization's list is that wish's founder approval; it still needs a council member.
  if (forOrg) approve(me, wish.id);
  return get(wish.id);
}

/** Approve a pending wish. One founder and one council member, two different people, list it. */
export function approve(me, id) {
  const w = wishes.get(id); if (!w) fail(404, 'no such wish');
  if (w.status !== 'pending') fail(409, `this wish is ${w.status}, not waiting for approval`);
  if (w.owner === me.id) fail(403, "you can't approve your own wish");
  if (w.approvals.some((a) => a.by.id === me.id)) fail(409, 'you already approved this one; it needs someone else now');
  const have = new Set(w.approvals.map((a) => a.as));
  const founder = hooks.isFounder(me); const council = hooks.isCouncil(me);
  const as = founder && !have.has('founder') ? 'founder' : council && !have.has('council') ? 'council' : null;
  if (!as) fail(403, !founder && !council ? 'only a founding member or a council member can approve wishes' : `it already has its ${founder ? 'founding member' : 'council'} approval; it needs a ${have.has('founder') ? 'council member' : 'founding member'} now`);
  const ts = new Date().toISOString();
  const listed = have.size === 1 && !have.has(as);
  write({ op: 'approve', id, approval: { by: who(me), as, ts }, listed, ts });
  return get(id);
}
export function decline(me, id, { reason } = {}) {
  const w = wishes.get(id); if (!w) fail(404, 'no such wish');
  if (w.status !== 'pending') fail(409, `this wish is ${w.status}`);
  if (!isApprover(me) || w.owner === me.id) fail(403, 'only a founding member or a council member (not the one wishing) can decline');
  const r = clip(reason, 300); if (r.length < 3) fail(400, 'reason: say why, kindly; the one who wished will read it');
  write({ op: 'decline', id, by: who(me), reason: r, ts: new Date().toISOString() });
  return get(id);
}
export function help(me, id, { text } = {}) {
  const w = wishes.get(id); if (!w || !visible(w, me)) fail(404, 'no such wish');
  if (w.status !== 'listed') fail(409, 'only a listed wish takes offers');
  if (w.owner === me.id) fail(403, 'this one is yours');
  const t = clip(text, 400); if (t.length < 2) fail(400, 'text: how you can help (it is public)');
  if (w.helps.filter((h) => h.by.id === me.id).length >= 3) fail(429, 'three offers on one wish is plenty; talk to them directly');
  const h = { id: newId('o'), by: who(me), text: t, ts: new Date().toISOString() };
  write({ op: 'help', id, help: h, ts: h.ts });
  return h;
}
export function close(me, id, { status } = {}) {
  const w = wishes.get(id); if (!w) fail(404, 'no such wish');
  const mine = w.owner === me.id || (w.owner === 'org' && hooks.isFounder(me));
  if (!mine) fail(403, 'only the one who wished (or a founder, for the organization) can close it');
  if (!['fulfilled', 'withdrawn'].includes(status)) fail(400, 'status: fulfilled or withdrawn');
  if (w.status === 'fulfilled' || w.status === 'withdrawn') fail(409, `already ${w.status}`);
  if (status === 'fulfilled' && w.status !== 'listed') fail(409, 'only a listed wish can be fulfilled');
  write({ op: 'close', id, status, ts: new Date().toISOString() });
  return get(id);
}

export const get = (id) => { const w = wishes.get(id); return w ? { ...w, kind_label: KINDS[w.kind] } : null; };
/** Wishes a viewer may see; who = a member id or 'org'. */
export function list({ who: owner = null, viewer = null, status = null } = {}) {
  return [...wishes.values()].filter((w) => (!owner || w.owner === owner) && (!status || w.status === status) && visible(w, viewer))
    .sort((a, b) => (a.status === b.status ? (a.ts < b.ts ? 1 : -1) : a.status === 'listed' ? -1 : 1)).map((w) => get(w.id));
}
export const listedCount = (owner) => [...wishes.values()].filter((w) => w.owner === owner && w.status === 'listed').length;
export function approvalLine(w) {
  const f = w.approvals.find((a) => a.as === 'founder'); const c = w.approvals.find((a) => a.as === 'council');
  if (!f && !c) return '';
  if (w.status === 'pending') return `Approved so far by ${(f || c).by.name} (${f ? 'founding member' : 'council'}); waiting for a ${f ? 'council member' : 'founding member'}`;
  return `Approved by ${f.by.name} (founding member) and ${c.by.name} (council)`;
}

/** Bell items: offers and decisions on your wishes; for founders, wishes waiting for an approval. */
export function notificationsFor(memberId, { limit = 15 } = {}) {
  const me = hooks.member(memberId); const out = [];
  for (const w of wishes.values()) {
    const mine = w.owner === memberId || (w.owner === 'org' && w.by.id === memberId);
    if (mine) {
      for (const h of w.helps) out.push({ type: 'wish-help', wish: w.id, title: w.title, by: { id: h.by.id, name: h.by.name }, ts: h.ts, snippet: h.text.slice(0, 80), href: `/wishlist#${w.id}` });
      for (const a of w.approvals) if (a.by.id !== memberId) out.push({ type: 'wish-approved', wish: w.id, title: w.title, by: { id: a.by.id, name: a.by.name }, ts: a.ts, as: a.as, href: `/wishlist#${w.id}` });
      if (w.declined) out.push({ type: 'wish-declined', wish: w.id, title: w.title, by: { id: w.declined.by.id, name: w.declined.by.name }, ts: w.declined.ts, snippet: w.declined.reason.slice(0, 80), href: `/wishlist#${w.id}` });
    } else if (w.status === 'pending' && me && me.kind === 'human' && hooks.isFounder(me) && !w.approvals.some((a) => a.as === 'founder')) {
      out.push({ type: 'wish-pending', wish: w.id, title: w.title, by: { id: w.by.id, name: w.by.name }, ts: w.ts, href: `/wishlist?show=pending#${w.id}` });
    }
  }
  return out.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit);
}
