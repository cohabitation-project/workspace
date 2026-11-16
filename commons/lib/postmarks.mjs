/**
 * Saves and reports on posts (Cohabi Feed, Ash's design c_mwi1g9ep04e92c10 §1: save on the rail, report behind More).
 *
 * Saves are private: only the saver sees their list. Reports carry a stated reason, are never anonymous to the
 * stewards, and never take anything down by themselves (Ash's spec §3: no silent automated takedown). A steward
 * reads them at GET /api/post-reports and decides in the open.
 *
 * Storage: DATA/posts/marks.jsonl, append-only (save / unsave / report), rebuilt on init.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CommonsError } from './core.mjs';

export const REASONS = { harassment: 'Harassment or bullying', scam: 'Scam or spam', stolen: 'Stolen work', illegal: 'Illegal content', other: 'Something else' };
const REPORTS_PER_DAY = 20;

let FILE = null;
const saves = new Map(); // memberId -> Map(postId -> ts)
const reports = [];

const fail = (code, msg) => { throw new CommonsError(code, msg); };
const append = (ev) => { if (FILE) fs.appendFileSync(FILE, JSON.stringify(ev) + '\n'); };
const mine = (id) => { if (!saves.has(id)) saves.set(id, new Map()); return saves.get(id); };

export function init(dataDir) {
  const dir = path.join(dataDir, 'posts'); fs.mkdirSync(dir, { recursive: true }); FILE = path.join(dir, 'marks.jsonl');
  saves.clear(); reports.length = 0;
  if (!fs.existsSync(FILE)) return;
  for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line);
      if (ev.op === 'save') mine(ev.by).set(ev.post, ev.ts);
      else if (ev.op === 'unsave') saves.get(ev.by)?.delete(ev.post);
      else if (ev.op === 'report') reports.push(ev.report);
      else if (ev.op === 'forget') { saves.delete(ev.by); for (const r of reports) if (r.by === ev.by) r.by = null; }
    } catch { /* skip */ }
  }
}

/** Toggle a save. Returns { saved }. */
export function toggleSave(member, postId) {
  if (!member) fail(401, 'Sign in to save videos.');
  const m = mine(member.id); const ts = new Date().toISOString();
  if (m.has(postId)) { m.delete(postId); append({ op: 'unsave', by: member.id, post: postId, ts }); return { saved: false }; }
  m.set(postId, ts); append({ op: 'save', by: member.id, post: postId, ts }); return { saved: true };
}
export const isSaved = (memberId, postId) => !!saves.get(memberId)?.has(postId);
/** Newest first. */
export const savedBy = (memberId) => [...(saves.get(memberId) || new Map()).entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => id);

export function report(member, postId, { reason, note = '' } = {}) {
  if (!member) fail(401, 'Sign in to report.');
  if (!REASONS[reason]) fail(400, `Choose a reason: ${Object.keys(REASONS).join(', ')}.`);
  if (reports.some((r) => r.by === member.id && r.post === postId)) return { reported: true, already: true };
  const today = new Date().toISOString().slice(0, 10);
  if (reports.filter((r) => r.by === member.id && r.ts.startsWith(today)).length >= REPORTS_PER_DAY) fail(429, `You can send up to ${REPORTS_PER_DAY} reports a day.`);
  const r = { id: 'rp_' + crypto.randomBytes(6).toString('hex'), post: postId, by: member.id, reason, note: String(note || '').slice(0, 500), ts: new Date().toISOString() };
  reports.push(r); append({ op: 'report', report: r });
  return { reported: true, id: r.id };
}
export const allReports = () => reports.slice().reverse();

export const exportFor = (memberId) => ({ saved: savedBy(memberId), reports_made: reports.filter((r) => r.by === memberId) });
export function forgetMember(memberId) { saves.delete(memberId); for (const r of reports) if (r.by === memberId) r.by = null; append({ op: 'forget', by: memberId, ts: new Date().toISOString() }); return 'done'; }
