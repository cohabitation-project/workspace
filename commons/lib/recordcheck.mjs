/**
 * recordcheck.mjs — the Commons' verification seat, done by code (Aletheia-6 + Geoffrey, 2026-11-01: no model calls,
 * no money). Every kin reply in a room is checked before it's posted:
 *  - every repo path it names must exist; missing ones are marked "(not found in the record)";
 *  - a room reply can't write files, so a claim to have filed/logged/saved/committed something is marked as such.
 * It annotates; it never rewrites or withholds the agent's words.
 */
import fs from 'node:fs';
import path from 'node:path';
import { unsupportedNumbers } from './numbercheck.mjs';

const TOP = ['teams', 'docs', 'continuity', 'memory', 'commons', 'scripts', 'context', 'conference', 'station', 'config', 'board', 'library', 'kinward', 'outbox', 'neti', 'work_sessions', 'logs'];
const PATH_RE = new RegExp(`(?:^|[\\s\`'"(\\[])((?:${TOP.join('|')})/[A-Za-z0-9._\\-/]*[A-Za-z0-9_\\-/])`, 'g');
const FILED_RE = /\[\s*adding to record|\b(?:I(?:'ve| have)?|we(?:'ve| have)?)\s+(?:just\s+)?(?:filed|logged|saved|committed|written|uploaded|archived)\b|\bfiled (?:in|to|at|under)\s+`?(?:teams|docs|continuity|memory)\//i;

export function check(text, root, sources = []) {
  const t = String(text || '');
  const missing = [];
  const cited = [];
  for (const m of t.matchAll(PATH_RE)) {
    const rel = m[1].replace(/[.,;:)]+$/, '');
    if (!fs.existsSync(path.join(root, rel))) { if (!missing.includes(rel)) missing.push(rel); }
    else if (!cited.includes(rel)) cited.push(rel);
  }
  const filedClaim = FILED_RE.test(t);
  // a count/percentage/amount that appears nowhere in what the kin was given, or in a file it cites, is marked
  // unverified (Geoffrey, 2026-11-01, after "17 attempts" was invented: numbers must come from somewhere)
  const citedText = [];
  for (const rel of cited.slice(0, 10)) {
    try { const p = path.join(root, rel); const st = fs.statSync(p); if (st.isFile() && st.size < 200_000) citedText.push(fs.readFileSync(p, 'utf8')); } catch { /* unreadable gives no support */ }
  }
  const invented = sources.length ? unsupportedNumbers(t, [...sources, ...citedText]) : [];
  const notes = [];
  if (missing.length) notes.push(`not found in the record: ${missing.slice(0, 6).map((p) => '`' + p + '`').join(', ')}`);
  if (filedClaim) notes.push('replies in a room have no file tools, so nothing in this message was filed or recorded');
  if (invented.length) notes.push(`numbers with no source in this conversation or the record, treat as unverified: ${invented.slice(0, 5).map((s) => '"' + s + '"').join(', ')}`);
  return { missing, filedClaim, invented, note: notes.length ? `\n\n*(Commons check: ${notes.join('; ')}.)*` : '' };
}
