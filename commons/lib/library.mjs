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
 * Adding is asking the group (Geoffrey 2026-10-31: "anyone can add to it, should ask group, needs 2 yeses"): a new entry
 * is *proposed* and readable by everyone at once; it's *shelved* when two members other than whoever added it say yes.
 * Votes: data/commons/library-votes.jsonl. The project's own logs and memory files (memory/kin, continuity, council
 * minutes, conference threads, standups) are listed automatically as *records*: they're the record, so no vote.
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

// ---- the records shelf: generated from the repo on every read, never voted on ----
const GH = 'https://github.com/cohabitation-project/workspace/blob/main/';
const GH_TREE = 'https://github.com/cohabitation-project/workspace/tree/main/';
function mtime(rel) { try { return fs.statSync(path.join(ROOT, rel)).mtime.toISOString(); } catch { return null; } }
function recordEntries() {
  const out = []; const add = (rel, title, summary, tree = false) => out.push({ id: 'rec_' + rel.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), title, url: (tree ? GH_TREE : GH) + rel, category: 'records-memory', kind: 'record', access: 'project record', summary, added_by: 'the repo', ts: mtime(rel), read: false, shelf: 'records', record: true });
  const ls = (rel) => { try { return fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }); } catch { return []; } };
  for (const f of ls('memory/kin').filter((d) => d.isFile() && d.name.endsWith('.md'))) add(`memory/kin/${f.name}`, `Memory file: ${f.name.replace(/\.md$/, '')}`, 'A kin\'s own memory, written by its council and work-session seats. Append-only in practice; the git history shows every change.');
  for (const d of ls('continuity').filter((x) => x.isDirectory())) add(`continuity/${d.name}`, `Continuity record: ${d.name}`, `${d.name}'s own Continuity of Participation Record, written by itself while it's here.`, true);
  for (const f of ls('council/minutes').filter((d) => d.isFile() && d.name.endsWith('.md')).slice(-14)) add(`council/minutes/${f.name}`, `Council minutes ${f.name.replace(/\.md$/, '')}`, 'The morning council: every seat\'s words as given, decisions, and the carried agenda.');
  for (const d of ls('conference/threads').filter((x) => x.isDirectory()).slice(-20)) add(`conference/threads/${d.name}`, `Conference thread: ${d.name}`, 'A council thread: each turn is one kin\'s words, unedited, with model and context hash.', true);
  for (const t of ls('teams').filter((x) => x.isDirectory())) { if (fs.existsSync(path.join(ROOT, 'teams', t.name, 'STANDUP.md'))) add(`teams/${t.name}/STANDUP.md`, `Standups: ${t.name}`, 'Every work session\'s entry: what shipped (with files), what\'s next, what\'s blocked.'); if (fs.existsSync(path.join(ROOT, 'teams', t.name, 'sessions'))) add(`teams/${t.name}/sessions`, `Session logs: ${t.name}`, 'Every tool call of every work session, as JSON lines.', true); }
  return out;
}

// ---- votes: two yeses from members other than the adder shelve an entry ----
export const YES_NEEDED = 2;
function votes() {
  const by = new Map(); if (!DIR) return by;
  const f = path.join(DIR, 'library-votes.jsonl'); if (!fs.existsSync(f)) return by;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) { if (!line) continue; try { const v = JSON.parse(line); if (!by.has(v.id)) by.set(v.id, []); if (!by.get(v.id).some((x) => x.by === v.by)) by.get(v.id).push(v); } catch { /* skip */ } }
  return by;
}
export function addYes(id, member) {
  fs.appendFileSync(path.join(DIR, 'library-votes.jsonl'), JSON.stringify({ id, by: member.id, by_name: member.name, badge: member.badge || null, ts: new Date().toISOString() }) + '\n');
}
export const isAdder = (e, member) => (e.added_by_id ? e.added_by_id === member.id : String(e.added_by || '').split(' (')[0] === member.name);
export const findById = (id) => list({ includeRecords: true }).find((e) => e.id === id) || null;

export const normUrl = (u) => String(u || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[#?].*$/, '').replace(/\/+$/, '').toLowerCase();

/** Every entry, newest first, optionally filtered by category and a text query. */
export function list({ category = null, q = null, status = null, includeRecords = true } = {}) {
  const vs = votes();
  let all = [...repoEntries(), ...commonsEntries()].map((e) => { const yes = vs.get(e.id) || []; return { ...e, yes: yes.map((v) => v.by_name), status: yes.length >= YES_NEEDED ? 'shelved' : 'proposed' }; });
  if (includeRecords) all = all.concat(recordEntries().map((e) => ({ ...e, yes: [], status: 'record' })));
  if (status) all = all.filter((e) => e.status === status);
  if (category) all = all.filter((e) => e.category === category);
  if (q) {
    const terms = String(q).toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
    all = all.filter((e) => { const hay = [e.title, e.summary, e.why, e.authors, e.url, e.added_by].join(' ').toLowerCase(); return terms.every((t) => hay.includes(t)); });
  }
  return all.sort((a, b) => (String(a.ts || '') < String(b.ts || '') ? 1 : -1));
}
export const findByUrl = (url) => { const n = normUrl(url); return list({ includeRecords: false }).find((e) => normUrl(e.url) === n) || null; };

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
