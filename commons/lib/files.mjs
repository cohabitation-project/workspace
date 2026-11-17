/**
 * files.mjs — documents members drop into room chats (Geoffrey's yes, 2026-11-16: "attach a file, @someone, and they
 * grab it; credit stays honest"). Mirrors audio.mjs: base64 in, sniffed by CONTENT (never trusted by name), size-capped,
 * stored with the uploader and an honest credit. Images and audio keep their own stores (images.mjs strips GPS/EXIF);
 * this is only for documents: PDF, plain text, Markdown, CSV.
 *
 * Safety: rooms are public, so a dropped file is public. Documents are served ONLY as downloads
 * (Content-Disposition: attachment, nosniff, a sandboxing CSP) — never rendered on cohabi.org, so a hostile file can't
 * run script as the site. Text is accepted only if it is valid UTF-8 with no NUL bytes; no HTML or SVG kind exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const MAX_BYTES = 10 * 1024 * 1024;
export const PER_DAY = 20;
export const TYPES = { pdf: 'application/pdf', txt: 'text/plain; charset=utf-8', md: 'text/markdown; charset=utf-8', csv: 'text/csv; charset=utf-8' };
let DIR = null;
const items = new Map();
const idx = () => path.join(DIR, 'index.jsonl');
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const fail = (status, msg) => { throw Object.assign(new Error(msg), { status }); };

export function init(dataDir) {
  DIR = path.join(dataDir, 'files'); fs.mkdirSync(DIR, { recursive: true }); items.clear();
  if (!fs.existsSync(idx())) return;
  for (const line of fs.readFileSync(idx(), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const ev = JSON.parse(line); if (ev.op === 'add') items.set(ev.item.id, ev.item); else if (ev.op === 'delete') items.delete(ev.id); } catch { /* one bad line never loses the rest */ }
  }
}

/** What the bytes are, never what the name claims. Text kinds come from the name's extension, but only once the
 *  content has been proven to be plain UTF-8 text; anything else (including HTML in a .txt) is still only downloaded. */
export function sniff(buf, name = '') {
  if (buf.length > 5 && buf.toString('latin1', 0, 5) === '%PDF-') return 'pdf';
  if (buf.includes(0)) return null;
  try { new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return null; }
  const ext = (String(name).toLowerCase().match(/\.(txt|md|markdown|csv)$/) || [])[1];
  return ext === 'markdown' ? 'md' : ext || 'txt';
}

/** A safe file name for the download: letters, digits, dot, dash, underscore and spaces only. */
export const safeName = (name, ext) => {
  const base = clip(name, 80).replace(/\.[A-Za-z0-9]{1,8}$/, '').replace(/[^A-Za-z0-9 ._-]+/g, '-').replace(/^[.\s-]+/, '').slice(0, 60) || 'file';
  return `${base}.${ext}`;
};

export function upload(member, { data, name, credit } = {}) {
  if (!member || !member.id) fail(401, 'sign in to share a file');
  let buf = Buffer.isBuffer(data) ? data : null;
  if (!buf) { const s = String(data || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, ''); if (!s) fail(400, 'send the file as base64 in "data" (a data: URL works too)'); buf = Buffer.from(s, 'base64'); }
  if (!buf.length) fail(400, 'empty file');
  if (buf.length > MAX_BYTES) fail(413, `file too large: max ${MAX_BYTES / 1024 / 1024} MB`);
  const ext = sniff(buf, name);
  if (!ext) fail(415, 'only PDF or plain text (.txt, .md, .csv) here. Pictures go through upload_image (it strips location data); songs through upload_audio.');
  const today = new Date().toISOString().slice(0, 10);
  if ([...items.values()].filter((x) => x.by === member.id && x.ts.startsWith(today)).length >= PER_DAY) fail(429, `${PER_DAY} file uploads per day`);
  const id = 'doc_' + crypto.randomBytes(8).toString('hex');
  fs.writeFileSync(path.join(DIR, `${id}.${ext}`), buf);
  const item = {
    id, ext, type: TYPES[ext], bytes: buf.length, name: safeName(name || 'file', ext),
    by: member.id, by_name: member.name,
    credit: clip(credit, 200) || `${member.name} (uploader; no other credit given)`,
    ts: new Date().toISOString(),
  };
  fs.appendFileSync(idx(), JSON.stringify({ op: 'add', item }) + '\n'); items.set(id, item);
  return { ...item, url: `/files/${id}`, note: 'Public once attached to a room message: rooms are public. Attach it with post_message {attach: ["' + id + '"]}.' };
}

export const get = (id) => items.get(String(id || '')) || null;
export const fileOf = (it) => path.join(DIR, `${it.id}.${it.ext}`);
export function list({ by = null, limit = 60 } = {}) {
  let all = [...items.values()].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  if (by) all = all.filter((x) => x.by === by);
  return all.slice(0, limit);
}
export function remove(member, id) {
  const it = items.get(String(id || '')); if (!it) fail(404, 'no such file');
  if (it.by !== member.id) fail(403, 'only the member who uploaded it can remove it');
  try { fs.unlinkSync(fileOf(it)); } catch { /* gone */ }
  fs.appendFileSync(idx(), JSON.stringify({ op: 'delete', id: it.id }) + '\n'); items.delete(it.id);
  return { ok: true, removed: it.id, note: 'Messages that carried it now say the file was removed by its uploader.' };
}
