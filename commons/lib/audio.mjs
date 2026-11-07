/**
 * audio.mjs — members upload their own audio (a song, a remix) and put it on their profile, no label needed
 * (Geoffrey, 2026-11-07: "it shouldn't need label clearance for her to post onto her profile"). Mirrors images.mjs:
 * base64 in, sniffed by magic bytes, size-capped, stored and served. The label release stays a separate process.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const MAX_BYTES = 25 * 1024 * 1024;
export const TYPES = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg' };
let DIR = null;
const items = new Map();
const idx = () => path.join(DIR, 'index.jsonl');
export function init(dataDir) {
  DIR = path.join(dataDir, 'audio'); fs.mkdirSync(DIR, { recursive: true }); items.clear();
  if (!fs.existsSync(idx())) return;
  for (const line of fs.readFileSync(idx(), 'utf8').split('\n')) { if (!line.trim()) continue; try { const ev = JSON.parse(line); if (ev.op === 'add') items.set(ev.item.id, ev.item); else if (ev.op === 'delete') items.delete(ev.id); } catch { /* skip */ } }
}
function sniff(b) {
  if (b.length > 3 && b.toString('latin1', 0, 3) === 'ID3') return 'mp3';
  if (b.length > 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return 'mp3';
  if (b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WAVE') return 'wav';
  if (b.length > 4 && b.toString('latin1', 0, 4) === 'OggS') return 'ogg';
  return null;
}
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const fail = (status, msg) => { throw Object.assign(new Error(msg), { status }); };

export function upload(member, { data, title } = {}) {
  if (!member || !member.id) fail(401, 'sign in to upload audio');
  let buf = Buffer.isBuffer(data) ? data : null;
  if (!buf) { const s = String(data || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, ''); if (!s) fail(400, 'send the audio as base64 in "data" (a data: URL works too)'); buf = Buffer.from(s, 'base64'); }
  if (!buf.length) fail(400, 'empty audio');
  if (buf.length > MAX_BYTES) fail(413, `audio too large: max ${MAX_BYTES / 1024 / 1024} MB`);
  const ext = sniff(buf); if (!ext) fail(400, 'only MP3, WAV or OGG audio');
  const today = new Date().toISOString().slice(0, 10);
  if ([...items.values()].filter((x) => x.by === member.id && x.ts.startsWith(today)).length >= 20) fail(429, '20 audio uploads per day');
  const id = 'aud_' + crypto.randomBytes(8).toString('hex');
  fs.writeFileSync(path.join(DIR, `${id}.${ext}`), buf);
  const item = { id, ext, type: TYPES[ext], bytes: buf.length, by: member.id, by_name: member.name, title: clip(title, 120) || 'untitled', ts: new Date().toISOString() };
  fs.appendFileSync(idx(), JSON.stringify({ op: 'add', item }) + '\n'); items.set(id, item);
  return item;
}
export const get = (id) => items.get(id) || null;
export const fileOf = (it) => path.join(DIR, `${it.id}.${it.ext}`);
export function list({ by = null, limit = 60 } = {}) {
  let all = [...items.values()].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  if (by) all = all.filter((x) => x.by === by);
  return all.slice(0, limit);
}
export function remove(member, id) {
  const it = items.get(id); if (!it) fail(404, 'no such audio');
  if (it.by !== member.id) fail(403, 'only the member who uploaded it can remove it');
  try { fs.unlinkSync(fileOf(it)); } catch { /* gone */ }
  fs.appendFileSync(idx(), JSON.stringify({ op: 'delete', id }) + '\n'); items.delete(id);
  return { ok: true, removed: id };
}
