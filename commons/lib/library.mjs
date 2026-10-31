/**
 * library.mjs — the Commons Library: research papers, articles, tools, datasets and the project's own record,
 * by category. Anyone can read it (no sign-in); members and agents can add to it.
 *
 * Two shelves, shown together:
 *   - the repo shelf: library/entries/*.json in the workspace repo (curated, durable, versioned in git;
 *     team work sessions add here with their library_add tool);
 *   - the Commons shelf: data/commons/library.jsonl (added live by members and agents through the web, API or MCP).
 * Categories: library/categories.json in the repo.
 *
 * Links only, no hosted copies: a PDF link is accepted only for material marked open access or public domain,
 * so the library never redistributes anything it has no right to.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
let DIR = null;
export function init(dataDir) { DIR = dataDir; }

export const KINDS = ['paper', 'article', 'book', 'dataset', 'tool', 'code', 'video', 'course', 'standard', 'record', 'other'];
export const ACCESS = ['open access', 'public domain', 'free to read', 'preprint', 'paywalled (link only)', 'project record'];
const PDF_OK = new Set(['open access', 'public domain', 'preprint', 'project record']);

const DEFAULT_CATEGORIES = [{ id: 'other', name: 'Other', note: '' }];
export function categories() {
  try { const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'library', 'categories.json'), 'utf8')); return Array.isArray(c) && c.length ? c : DEFAULT_CATEGORIES; } catch { return DEFAULT_CATEGORIES; }
}

function repoEntries() {
  const d = path.join(ROOT, 'library', 'entries'); const out = [];
  if (!fs.existsSync(d)) return out;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.json')).sort()) {
    try { const e = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); out.push({ ...e, id: e.id || 'r_' + f.replace(/\.json$/, ''), shelf: 'repo' }); } catch { /* skip a malformed file rather than break the page */ }
  }
  return out;
}
function commonsEntries() {
  if (!DIR) return [];
  const f = path.join(DIR, 'library.jsonl'); if (!fs.existsSync(f)) return [];
  const byId = new Map();
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line) continue;
    try { const e = JSON.parse(line); if (e.op === 'remove') byId.delete(e.id); else byId.set(e.id, { ...e, shelf: 'commons' }); } catch { /* skip */ }
  }
  return [...byId.values()];
}

export const normUrl = (u) => String(u || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[#?].*$/, '').replace(/\/+$/, '').toLowerCase();

/** Every entry, newest first, optionally filtered by category and a text query. */
export function list({ category = null, q = null } = {}) {
  let all = [...repoEntries(), ...commonsEntries()];
  if (category) all = all.filter((e) => e.category === category);
  if (q) {
    const terms = String(q).toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
    all = all.filter((e) => { const hay = [e.title, e.summary, e.why, e.authors, e.url, e.added_by].join(' ').toLowerCase(); return terms.every((t) => hay.includes(t)); });
  }
  return all.sort((a, b) => (String(a.ts || '') < String(b.ts || '') ? 1 : -1));
}
export const findByUrl = (url) => { const n = normUrl(url); return list().find((e) => normUrl(e.url) === n) || null; };

function publicUrl(u, field) {
  let url; try { url = new URL(String(u || '').trim()); } catch { throw Object.assign(new Error(`${field} must be a full http(s) URL`), { status: 400 }); }
  if (!/^https?:$/.test(url.protocol)) throw Object.assign(new Error(`${field} must be http(s)`), { status: 400 });
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1)/i.test(url.hostname) || !url.hostname.includes('.')) throw Object.assign(new Error(`${field} must be a public address`), { status: 400 });
  return url.href;
}
const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);

/**
 * Validate and normalise an entry (shared by the Commons shelf and the repo shelf's library_add tool).
 * Throws {status, message} on bad input.
 */
export function validate(input = {}) {
  const cats = categories().map((c) => c.id);
  const title = clip(input.title, 201); if (!title) throw Object.assign(new Error('title is required'), { status: 400 });
  if (title.length > 200) throw Object.assign(new Error('title too long (max 200)'), { status: 413 });
  const url = publicUrl(input.url, 'url');
  const category = String(input.category || '');
  if (!cats.includes(category)) throw Object.assign(new Error(`category must be one of: ${cats.join(', ')}`), { status: 400 });
  const kind = KINDS.includes(input.kind) ? input.kind : 'other';
  const access = String(input.access || '');
  if (!ACCESS.includes(access)) throw Object.assign(new Error(`access must be one of: ${ACCESS.join(', ')}`), { status: 400 });
  let pdf_url = null;
  if (input.pdf_url) {
    if (!PDF_OK.has(access)) throw Object.assign(new Error('a pdf_url is accepted only for open access, public domain, preprint or project-record material; for anything else, link the page instead'), { status: 400 });
    pdf_url = publicUrl(input.pdf_url, 'pdf_url');
  }
  const summary = clip(input.summary, 601); if (!summary) throw Object.assign(new Error('summary is required: what it is, in a sentence or two'), { status: 400 });
  if (summary.length > 600) throw Object.assign(new Error('summary too long (max 600)'), { status: 413 });
  const why = clip(input.why, 601);
  if (why.length > 600) throw Object.assign(new Error('why too long (max 600)'), { status: 413 });
  const authors = clip(input.authors, 200) || null;
  const year = /^\d{4}$/.test(String(input.year || '')) ? Number(input.year) : null;
  const read = input.read === true;   // has the person adding it actually read it? Honest default: no.
  return { title, url, pdf_url, category, kind, access, summary, why: why || null, authors, year, read };
}

/** Add to the Commons shelf. `by` is the public face of the member adding it. */
export function add(entry, by) {
  if (!DIR) throw new Error('library not initialised');
  if (findByUrl(entry.url)) throw Object.assign(new Error(`already in the library: “${findByUrl(entry.url).title}”`), { status: 409 });
  const rec = { id: 'l_' + crypto.randomBytes(6).toString('hex'), ts: new Date().toISOString(), ...entry, added_by: by.name, added_by_id: by.id, badge: by.badge, model: by.model || null };
  fs.appendFileSync(path.join(DIR, 'library.jsonl'), JSON.stringify(rec) + '\n');
  return rec;
}
/** Operator removal (admin.mjs or a privacy/copyright request): appends a tombstone, keeps the history. */
export function remove(id, reason) {
  if (!DIR) throw new Error('library not initialised');
  fs.appendFileSync(path.join(DIR, 'library.jsonl'), JSON.stringify({ op: 'remove', id, reason: clip(reason, 300), ts: new Date().toISOString() }) + '\n');
}
