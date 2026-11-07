/**
 * orgpages.mjs — band, artist and business PAGES (Geoffrey, 2026-11-07): "my personal page is my personal page; set
 * me up a band page for Geoffrey David, and a business page for RollinHost, all on the same login."
 *
 * A page is not a member. It has no vote, no coins and no seat; it is run by one or more members (its managers), who
 * edit it and list in the market as it. That keeps the cooperative honest about who is who (Aletheia-6's spec: never
 * treat one account, page or instance as one vote). One login: a manager moves between their own profile and their
 * pages from the "Your pages" menu.
 *
 * Label artist folders are pages too: a folder linked to a member in the Label's own record (label/releases.json
 * "artists") becomes a band page run by that member, at the folder's address (/label/a/<slug>). Other pages live at
 * /p/<slug>. Pages seeded by the project (commons/pages-seed.json) are created once at boot.
 *
 * Stored as an append-only log: <data>/pages/pages.jsonl.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as profilekinds from './profilekinds.mjs';

export const KINDS = { band: 'Band / musician', artist: 'Artist / maker', business: 'Business / services' };
export const THEMES = { navy: 'Navy and gold', music: 'Dark, like a listening app', art: 'Gallery white', video: 'Cinema', software: 'Terminal', services: 'Clean studio', classifieds: 'Newsprint', home: 'Cream' };
const DEFAULT_THEME = { band: 'music', artist: 'art', business: 'services' };
const ACCENT_RX = /^#[0-9a-f]{6}$/i;

let FILE = null;
const pages = new Map();
let hooks = { member: () => null, imageOwned: () => null, labelOwners: () => ({}), labelFolders: () => [] };
export function setHooks(h) { Object.assign(hooks, h); }
const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
export const slugOf = (name) => String(name || '').replace(/\(.*?\)/g, '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

let SEED = null;
export function init(dataDir, { seedFile = null } = {}) {
  SEED = seedFile;
  const dir = path.join(dataDir, 'pages'); fs.mkdirSync(dir, { recursive: true }); FILE = path.join(dir, 'pages.jsonl'); pages.clear();
  if (fs.existsSync(FILE)) for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) { if (!line.trim()) continue; try { apply(JSON.parse(line)); } catch { /* torn line */ } }
  if (seedFile) seed(seedFile);
}
function apply(ev) {
  if (ev.op === 'create') pages.set(ev.page.id, ev.page);
  else if (ev.op === 'update') { const p = pages.get(ev.id); if (p) pages.set(ev.id, { ...p, ...ev.patch, updated: ev.ts }); }
}
function write(ev) { fs.appendFileSync(FILE, JSON.stringify(ev) + '\n'); apply(ev); }

/** Pages the project seeds (commons/pages-seed.json): created once, if no page has that slug yet. */
function seed(file) {
  let list = []; try { list = JSON.parse(fs.readFileSync(file, 'utf8')).pages || []; } catch { return; }
  for (const s of list) {
    if (bySlug(s.slug)) continue;
    const m = hooks.member(s.manager); if (!m) continue; // the manager must exist on this server
    const { manager, ...rest } = s;
    write({ op: 'create', ts: new Date().toISOString(), page: { id: newId(), created: new Date().toISOString(), by: { id: m.id, name: m.name }, managers: [{ id: m.id, name: m.name }], label: false, seeded: true, kind_info: {}, links: [], ...rest } });
  }
}
/** A Label folder linked to a member becomes a band page run by them, the first time anyone looks (2026-11-07). */
export function ensureLabelPages() {
  if (SEED) seed(SEED); // seeded pages whose manager has arrived since boot
  const owners = hooks.labelOwners();
  for (const a of hooks.labelFolders()) {
    const who = owners[a.slug]?.member; if (!who || bySlug(a.slug)) continue;
    const m = hooks.member(who); if (!m) continue;
    write({ op: 'create', ts: new Date().toISOString(), page: { id: newId(), slug: a.slug, kind: 'band', name: a.name, created: new Date().toISOString(), by: { id: m.id, name: m.name }, managers: [{ id: m.id, name: m.name }], label: true, theme: 'music', headline: '', bio: '', kind_info: { record_label: 'Last of the Real Estate', label_type: 'cohabi', members: [`${m.name}`] }, links: [] } });
  }
}
const newId = () => `pg_${crypto.randomBytes(7).toString('hex')}`;

// ------------------------------------------------------------------------------------------ reads
export const get = (id) => pages.get(String(id || '')) || null;
export const findSlug = (slug) => { ensureLabelPages(); return bySlug(slug); };
export const bySlug = (slug) => [...pages.values()].find((p) => p.slug === String(slug || '')) || null;
export const list = ({ kind = null } = {}) => [...pages.values()].filter((p) => !kind || p.kind === kind).sort((a, b) => (a.created < b.created ? -1 : 1));
export const managedBy = (memberId) => { ensureLabelPages(); return [...pages.values()].filter((p) => p.managers.some((x) => x.id === memberId)); };
export const isManager = (p, memberId) => !!p && p.managers.some((x) => x.id === memberId);
export const href = (p) => (p.label ? `/label/a/${p.slug}` : `/page/${p.slug}`);
export const themeOf = (p) => (THEMES[p.theme] ? p.theme : DEFAULT_THEME[p.kind] || 'home');

// ------------------------------------------------------------------------------------------ writes
export function create(member, { kind, name } = {}) {
  if (!member) fail(401, 'sign in to make a page');
  if (!KINDS[kind]) fail(400, `kind: one of ${Object.keys(KINDS).join(', ')}`);
  const nm = clip(name, 60); if (nm.length < 2) fail(400, 'name: 2 to 60 characters');
  const slug = slugOf(nm); if (slug.length < 2) fail(400, 'that name needs some letters or numbers');
  ensureLabelPages();
  if (bySlug(slug) || hooks.labelFolders().some((a) => a.slug === slug)) fail(409, 'a page with that name already exists; pick another name, or ask its managers to add you');
  if (['new', 'edit', 'api'].includes(slug)) fail(400, 'pick another name');
  if (managedBy(member.id).length >= 10) fail(429, 'up to 10 pages per member');
  const page = { id: newId(), slug, kind, name: nm, created: new Date().toISOString(), by: { id: member.id, name: member.name }, managers: [{ id: member.id, name: member.name }], label: false, theme: DEFAULT_THEME[kind], headline: '', bio: '', kind_info: {}, links: [] };
  write({ op: 'create', page, ts: page.created });
  return page;
}
export function update(member, id, b = {}) {
  const p = get(id); if (!p) fail(404, 'no such page');
  if (!isManager(p, member?.id)) fail(403, 'only the members who run this page can change it');
  const patch = {};
  if (b.name !== undefined) { if (p.label) fail(400, "a Label artist's name comes from the Label's record"); const nm = clip(b.name, 60); if (nm.length < 2) fail(400, 'name: 2 to 60 characters'); patch.name = nm; }
  if (b.kind !== undefined) { if (!KINDS[b.kind]) fail(400, `kind: one of ${Object.keys(KINDS).join(', ')}`); if (p.label && b.kind !== 'band') fail(400, 'a Label artist page stays a band page'); patch.kind = b.kind; }
  if (b.headline !== undefined) patch.headline = clip(b.headline, 120);
  if (b.bio !== undefined) patch.bio = String(b.bio ?? '').trim().slice(0, 3000);
  if (b.theme !== undefined) { if (!THEMES[b.theme]) fail(400, `theme: one of ${Object.keys(THEMES).join(', ')}`); patch.theme = b.theme; }
  if (b.accent !== undefined) { if (b.accent && !ACCENT_RX.test(b.accent)) fail(400, 'accent: a colour like #d4a24c'); patch.accent = b.accent || null; }
  if (b.kind_info !== undefined) { try { patch.kind_info = profilekinds.check({ kind_info: b.kind_info }).kind_info; } catch (e) { fail(400, e.message); } }
  if (b.links !== undefined) {
    const raw = Array.isArray(b.links) ? b.links : String(b.links || '').split('\n');
    const out = [];
    for (const x of raw) { const [label, url] = typeof x === 'string' ? (x.includes('|') ? x.split('|').map((s) => s.trim()) : ['', x.trim()]) : [x.label, x.url]; if (!url) continue; let u; try { u = new URL(url); } catch { fail(400, `not a link: ${clip(url, 60)}`); } if (!['https:', 'tel:', 'mailto:'].includes(u.protocol)) fail(400, 'links must start with https://, tel: or mailto:'); out.push({ label: clip(label, 40) || u.hostname || u.href.slice(0, 40), url: u.href.slice(0, 300) }); }
    if (out.length > 6) fail(400, 'up to 6 links'); patch.links = out;
  }
  for (const k of ['portrait', 'banner']) if (b[k] !== undefined) patch[k] = b[k] ? hooks.imageOwned(member, String(b[k])) : null;
  if (b.add_manager !== undefined) {
    const m = hooks.member(String(b.add_manager)); if (!m || m.retired) fail(400, 'no such member to add');
    if (p.managers.some((x) => x.id === m.id)) fail(409, `${m.name} already runs this page`);
    if (p.managers.length >= 12) fail(400, 'up to 12 people run a page');
    patch.managers = [...p.managers, { id: m.id, name: m.name }];
  }
  if (b.remove_manager !== undefined) {
    const rest = p.managers.filter((x) => x.id !== String(b.remove_manager) && x.name !== String(b.remove_manager));
    if (rest.length === p.managers.length) fail(400, 'that member does not run this page');
    if (!rest.length) fail(400, 'a page needs at least one member running it');
    patch.managers = rest;
  }
  if (!Object.keys(patch).length) fail(400, 'nothing to change');
  write({ op: 'update', id: p.id, patch, by: member.id, ts: new Date().toISOString() });
  return get(p.id);
}
