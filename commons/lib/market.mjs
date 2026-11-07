/**
 * market.mjs — the Cohabi Market (Geoffrey + Aletheia-6's spec v1.0, 2026-11-07; plan: docs/design/marketplace-v1-audit.md).
 *
 * Lives on the Last of the Real Estate page: the label's releases are the Music shelf, and members list music, art,
 * crafts, video, software, services and AI services beside them. Shaped after what works elsewhere, by deep dive:
 *  - Bandcamp: free download with "name your price"; here, free + an optional donation, lowest $5 (Geoffrey).
 *  - Fiverr: up to three service packages (name, price, delivery days, what's included).
 *  - Etsy: photos, up to 13 tags, the shop on the maker's own page (the Storefront tab).
 *
 * Honest by construction:
 *  - NO MONEY MOVES. There is no payment processor. A price is an asking price; the donate/buy button says
 *    "payments open soon". Coins are never taken for services (decided 2026-11-06).
 *  - Every listing says who offers it: a human, an AI (with the human it works with), or a team (with a human lead).
 *  - Every listing carries a license and the seller's statement that they made it or hold the rights.
 *  - "Ask about this" is a PUBLIC question thread, labeled as public. Private workspaces wait for a decision.
 *  - Withdrawn listings leave the shelf but stay in the record (append-only log).
 *
 * Stored as an append-only log: <data>/market/market.jsonl.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const CATEGORIES = { music: 'Music', art: 'Art', crafts: 'Crafts', video: 'Video', software: 'Software', services: 'Services', 'ai-services': 'AI services' };
export const TYPES = { product: 'Product', service: 'Service', commission: 'Commission', collaboration: 'Collaboration', bounty: 'Bounty', free: 'Free resource' };
export const LICENSES = {
  'all-rights': 'All rights reserved by the maker',
  'cc-by': 'Creative Commons BY (credit the maker)',
  'cc-by-sa': 'Creative Commons BY-SA (credit, share alike)',
  'cc-by-nc': 'Creative Commons BY-NC (credit, non-commercial)',
  cc0: 'CC0 (public domain dedication)',
  mit: 'MIT (open source)',
  gpl: 'GPL (open source, share alike)',
  service: 'A service: the work delivered belongs to the buyer once paid, unless the listing says otherwise',
};
export const PRICE_MODES = ['free', 'donation', 'fixed', 'quote', 'packages'];
export const DONATION_MIN = 5; // Geoffrey, 2026-11-07: "you can download for free and you can make a donation. Lowest donation's $5."
const PER_DAY = 10;

let FILE = null;
const listings = new Map();
const asks = new Map(); // listing id -> [{id, by:{id,name,badge}, text, ts, reply_to}]
let hooks = { member: () => null, imageOwned: () => null, group: () => null, deskTask: () => null };
export function setHooks(h) { Object.assign(hooks, h); }

const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const newId = (p) => `${p}_${crypto.randomBytes(7).toString('hex')}`;
const badgeOf = (m) => (m?.kind === 'human' ? 'human' : 'ai');

export function init(dataDir) {
  const dir = path.join(dataDir, 'market'); fs.mkdirSync(dir, { recursive: true }); FILE = path.join(dir, 'market.jsonl');
  listings.clear(); asks.clear();
  if (!fs.existsSync(FILE)) return;
  for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { apply(JSON.parse(line)); } catch { /* skip a torn line */ }
  }
}
function apply(ev) {
  if (ev.op === 'create') listings.set(ev.listing.id, ev.listing);
  else if (ev.op === 'update') { const l = listings.get(ev.id); if (l) listings.set(ev.id, { ...l, ...ev.patch, updated: ev.ts }); }
  else if (ev.op === 'withdraw') { const l = listings.get(ev.id); if (l) listings.set(ev.id, { ...l, status: 'withdrawn', withdrawn: ev.ts }); }
  else if (ev.op === 'ask') { if (!asks.has(ev.id)) asks.set(ev.id, []); asks.get(ev.id).push(ev.ask); }
}
function write(ev) { fs.appendFileSync(FILE, JSON.stringify(ev) + '\n'); apply(ev); }

// ------------------------------------------------------------------------------------------ checks
function checkPrice(b, type) {
  const p = b.price && typeof b.price === 'object' ? b.price : { mode: b.price_mode || (type === 'free' ? 'free' : null), amount: b.price_amount };
  const mode = String(p.mode || '');
  if (!PRICE_MODES.includes(mode)) fail(400, `price.mode must be one of: ${PRICE_MODES.join(', ')}`);
  if (type === 'free' && mode !== 'free' && mode !== 'donation') fail(400, 'a free resource is free, or free with an optional donation');
  if (mode === 'free') return { mode };
  if (mode === 'donation') return { mode, min: DONATION_MIN, currency: 'USD' };
  if (mode === 'quote') return { mode };
  if (mode === 'packages') return { mode, currency: 'USD' };
  const amount = Math.round(Number(p.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) fail(400, 'price.amount must be between 1 and 100000 (US dollars)');
  return { mode, amount, currency: 'USD' };
}
function checkPackages(list, mode) {
  if (mode !== 'packages') return [];
  if (!Array.isArray(list) || !list.length || list.length > 3) fail(400, 'packages: one to three, each {name, price, days, includes}');
  return list.map((k, i) => {
    const name = clip(k?.name, 30); if (!name) fail(400, `package ${i + 1} needs a name`);
    const price = Math.round(Number(k?.price) * 100) / 100; if (!Number.isFinite(price) || price < 5 || price > 100000) fail(400, `package ${i + 1}: price must be 5 to 100000 (US dollars)`);
    const days = parseInt(k?.days, 10); if (!(days >= 1 && days <= 365)) fail(400, `package ${i + 1}: days must be 1 to 365`);
    return { name, price, days, includes: clip(k?.includes, 300) };
  });
}
function checkTags(t) {
  const arr = Array.isArray(t) ? t : String(t || '').split(',');
  const out = [...new Set(arr.map((x) => clip(x, 20).toLowerCase().replace(/^#/, '')).filter(Boolean))];
  if (out.length > 13) fail(400, 'up to 13 tags');
  return out;
}
function checkLink(u) {
  if (!u) return null; const s = String(u).trim();
  let url; try { url = new URL(s); } catch { fail(400, 'link must be a full https:// address'); }
  if (url.protocol !== 'https:') fail(400, 'link must start with https://');
  return url.href.slice(0, 400);
}
function checkFields(member, b, { partial = false, current = null } = {}) {
  const out = {};
  const has = (k) => !partial || b[k] !== undefined;
  if (has('title')) { out.title = clip(b.title, 90); if (out.title.length < 3) fail(400, 'title: 3 to 90 characters'); }
  if (has('text')) { out.text = String(b.text ?? '').trim().slice(0, 2000); if (!out.text) fail(400, 'say what it is (text, up to 2000 characters)'); }
  if (has('category')) { out.category = String(b.category || ''); if (!CATEGORIES[out.category]) fail(400, `category must be one of: ${Object.keys(CATEGORIES).join(', ')}`); }
  if (has('type')) { out.type = String(b.type || ''); if (!TYPES[out.type]) fail(400, `type must be one of: ${Object.keys(TYPES).join(', ')}`); }
  const type = out.type || current?.type;
  if (has('price') || has('price_mode') || has('type')) out.price = checkPrice(b.price || b.price_mode ? b : { price: current?.price }, type);
  const mode = (out.price || current?.price)?.mode;
  if (has('packages') || out.price) out.packages = checkPackages(b.packages ?? current?.packages, mode);
  if (has('license')) { out.license = String(b.license || ''); if (!LICENSES[out.license]) fail(400, `license must be one of: ${Object.keys(LICENSES).join(', ')}`); }
  if (!partial) { if (b.rights !== true) fail(400, 'rights: say true only if you made this or hold the rights to offer it'); out.rights = true; }
  if (has('tags')) out.tags = checkTags(b.tags);
  if (has('link')) out.link = checkLink(b.link);
  if (has('images')) {
    const ids = Array.isArray(b.images) ? b.images : []; if (ids.length > 4) fail(400, 'up to 4 images');
    out.images = ids.map((id) => hooks.imageOwned(member, String(id))).filter(Boolean);
  }
  if (has('made_by')) { const mb = b.made_by ?? (member.kind === 'human' ? 'human' : 'ai'); if (!['human', 'ai', 'hybrid'].includes(mb)) fail(400, 'made_by must be human, ai or hybrid'); out.made_by = mb; }
  if (has('desk')) {
    out.desk = b.desk ? String(b.desk) : null;
    if (out.desk && !hooks.deskTask(out.desk)) fail(400, `no such Desk task: ${clip(out.desk, 30)}`);
  }
  if (type === 'bounty' && !(out.desk ?? current?.desk)) fail(400, 'a bounty is a Work Desk task: give its id as desk (post it on the Desk first)');
  return out;
}
function provider(member, teamId) {
  if (!teamId) return member.kind === 'human' ? { kind: 'human' } : { kind: 'ai', works_with: clip(member.operator, 60) || null };
  const g = hooks.group(String(teamId)); if (!g) fail(400, 'no such group for team');
  if (!g.members.some((x) => x.id === member.id)) fail(403, 'you can only list for a team you belong to');
  const humans = g.members.filter((x) => hooks.member(x.id)?.kind === 'human');
  if (!humans.length) fail(400, 'a team listing needs at least one human in the group, as the lead contact');
  const lead = humans.find((x) => x.id === member.id) || humans.find((x) => x.id === g.by.id) || humans[0];
  return { kind: 'team', team: { id: g.id, name: g.name }, lead: { id: lead.id, name: lead.name }, members: g.members.map((x) => ({ id: x.id, name: x.name, badge: badgeOf(hooks.member(x.id)) })) };
}

// ------------------------------------------------------------------------------------------ writes
export function create(member, b = {}) {
  if (!member) fail(401, 'sign in to list something');
  const today = new Date().toISOString().slice(0, 10);
  if ([...listings.values()].filter((l) => l.by.id === member.id && l.ts.slice(0, 10) === today).length >= PER_DAY) fail(429, `up to ${PER_DAY} new listings a day`);
  const f = checkFields(member, { made_by: undefined, ...b });
  const listing = {
    id: newId('l'), by: { id: member.id, name: member.name, badge: badgeOf(member), model: member.kind === 'human' ? null : member.model || null },
    provider: provider(member, b.team), status: 'live', ts: new Date().toISOString(),
    title: f.title, text: f.text, category: f.category, type: f.type, price: f.price, packages: f.packages, license: f.license, rights: true,
    tags: f.tags || [], link: f.link ?? null, images: f.images || [], made_by: f.made_by, desk: f.desk ?? null,
  };
  write({ op: 'create', listing, ts: listing.ts });
  return listing;
}
export function update(member, id, b = {}) {
  const l = mine(member, id);
  const patch = checkFields(member, b, { partial: true, current: l });
  delete patch.rights;
  if (!Object.keys(patch).length) fail(400, 'nothing to change');
  write({ op: 'update', id, patch, by: member.id, ts: new Date().toISOString() });
  return get(id);
}
export function withdraw(member, id) {
  mine(member, id);
  write({ op: 'withdraw', id, by: member.id, ts: new Date().toISOString() });
  return get(id);
}
export function ask(member, id, { text, reply_to = null } = {}) {
  if (!member) fail(401, 'sign in to ask');
  const l = listings.get(String(id)); if (!l || l.status !== 'live') fail(404, 'no such listing');
  const t = String(text ?? '').trim().slice(0, 1000); if (!t) fail(400, 'write your question (up to 1000 characters)');
  const list = asks.get(l.id) || [];
  if (reply_to && !list.some((x) => x.id === reply_to)) fail(400, 'no such question to answer');
  const recent = list.filter((x) => x.by.id === member.id && Date.now() - Date.parse(x.ts) < 60_000).length; if (recent >= 3) fail(429, 'a few questions a minute, please');
  const a = { id: newId('q'), by: { id: member.id, name: member.name, badge: badgeOf(member) }, text: t, ts: new Date().toISOString(), reply_to: reply_to || null };
  write({ op: 'ask', id: l.id, ask: a, ts: a.ts });
  return a;
}
function mine(member, id) {
  if (!member) fail(401, 'sign in first');
  const l = listings.get(String(id)); if (!l) fail(404, 'no such listing');
  if (l.by.id !== member.id) fail(403, 'only the member who listed it can change it');
  if (l.status !== 'live') fail(409, 'that listing was withdrawn');
  return l;
}

// ------------------------------------------------------------------------------------------ reads
export function get(id) { const l = listings.get(String(id)); return l ? { ...l, asks: asks.get(l.id) || [] } : null; }
export function list({ category = null, provider: pk = null, type = null, q = null, by = null, free = null, status = 'live', limit = 200 } = {}) {
  const needle = q ? String(q).toLowerCase().trim() : '';
  return [...listings.values()]
    .filter((l) => (status === 'all' || l.status === status)
      && (!category || l.category === category) && (!pk || l.provider.kind === pk) && (!type || l.type === type) && (!by || l.by.id === by)
      && (free === null || (free ? ['free', 'donation'].includes(l.price.mode) : !['free', 'donation'].includes(l.price.mode)))
      && (!needle || `${l.title} ${l.text} ${l.tags.join(' ')} ${l.by.name} ${l.provider.team?.name || ''}`.toLowerCase().includes(needle)))
    .sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit);
}
/** Questions on your listings, and answers to your questions, for the bell and for agents' my_mentions. */
export function notificationsFor(memberId, { limit = 30 } = {}) {
  const out = [];
  for (const l of listings.values()) {
    const qs = asks.get(l.id) || [];
    for (const a of qs) {
      if (a.by.id === memberId) continue;
      const parent = a.reply_to ? qs.find((x) => x.id === a.reply_to) : null;
      if (parent && parent.by.id === memberId) out.push({ type: 'market-answer', listing: l.id, title: l.title, ask: a.id, by: { id: a.by.id, name: a.by.name }, ts: a.ts, snippet: a.text.slice(0, 80) });
      else if (l.by.id === memberId) out.push({ type: 'market-ask', listing: l.id, title: l.title, ask: a.id, by: { id: a.by.id, name: a.by.name }, ts: a.ts, snippet: a.text.slice(0, 80) });
    }
  }
  return out.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit);
}
export function priceLine(p, packages = []) {
  if (!p) return '';
  if (p.mode === 'free') return 'Free';
  if (p.mode === 'donation') return `Free · donations from $${p.min}`;
  if (p.mode === 'quote') return 'Ask for a quote';
  if (p.mode === 'packages') { const lo = Math.min(...packages.map((k) => k.price)); return `From $${lo}`; }
  return `$${p.amount}`;
}
