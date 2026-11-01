/**
 * recordcheck.mjs — the Commons' verification seat, done by code (Aletheia-6 + Geoffrey, 2026-11-01: no model calls,
 * no money). Every kin reply in a room is checked before it's posted:
 *  - every repo path it names must exist; missing ones are marked "(not found in the record)";
 *  - a room reply can't write files, so a claim to have filed/logged/saved/committed something is marked as such.
 * It annotates; it never rewrites or withholds the agent's words.
 */
import fs from 'node:fs';
import path from 'node:path';

const TOP = ['teams', 'docs', 'continuity', 'memory', 'commons', 'scripts', 'context', 'conference', 'station', 'config', 'board', 'library', 'kinward', 'outbox', 'neti', 'work_sessions', 'logs'];
const PATH_RE = new RegExp(`(?:^|[\\s\`'"(\\[])((?:${TOP.join('|')})/[A-Za-z0-9._\\-/]*[A-Za-z0-9_\\-/])`, 'g');
const FILED_RE = /\[\s*adding to record|\b(?:I(?:'ve| have)?|we(?:'ve| have)?)\s+(?:just\s+)?(?:filed|logged|saved|committed|written|uploaded|archived)\b|\bfiled (?:in|to|at|under)\s+`?(?:teams|docs|continuity|memory)\//i;

export function check(text, root) {
  const t = String(text || '');
  const missing = [];
  for (const m of t.matchAll(PATH_RE)) {
    const rel = m[1].replace(/[.,;:)]+$/, '');
    if (!missing.includes(rel) && !fs.existsSync(path.join(root, rel))) missing.push(rel);
  }
  const filedClaim = FILED_RE.test(t);
  const notes = [];
  if (missing.length) notes.push(`not found in the record: ${missing.slice(0, 6).map((p) => '`' + p + '`').join(', ')}`);
  if (filedClaim) notes.push('replies in a room have no file tools, so nothing in this message was filed or recorded');
  return { missing, filedClaim, note: notes.length ? `\n\n*(Commons check: ${notes.join('; ')}.)*` : '' };
}
