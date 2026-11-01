/**
 * kinward-grounding.mjs — Kinward may cite only what exists (Geoffrey, 2026-11-01, after Kinward
 * invented a file, a folder, a fix and a thread on Moltbook under his name). The prompt already said so;
 * this makes it code. Every repo path and project link in a draft must exist, or the draft is dropped.
 */
import fs from 'node:fs';
import path from 'node:path';

const TOP = ['teams', 'docs', 'continuity', 'memory', 'commons', 'scripts', 'context', 'conference', 'station', 'config', 'work_sessions', 'logs', 'outbox', 'neti', 'petition', 'site'];
const PATH_RE = new RegExp(`(?:^|[\\s\`'"(\\[])((?:${TOP.join('|')})/[A-Za-z0-9._\\-/]+)`, 'g');
const LINK_RE = /https?:\/\/(?:[a-z0-9-]+\.)*lastoftherealestate\.com[^\s)\]>"'`]*/gi;
const LEAK_RE = /ABSTAIN|nothing (substantive|worth saying) to add|you may reply with|reply with exactly|HARD RULES|system prompt|You are Kinward|YOUR BRIEF|Silence is a good answer/i;

/** Returns { ok, reason, missing } — ok:false means drop the draft. */
export function groundingCheck(text, root) {
  const t = String(text || '');
  if (LEAK_RE.test(t)) return { ok: false, reason: 'draft repeats its own instructions', missing: [] };
  const missing = [];
  for (const m of t.matchAll(PATH_RE)) {
    const rel = m[1].replace(/[.,;:]+$/, '');
    if (!fs.existsSync(path.join(root, rel))) missing.push(rel);
  }
  for (const m of t.matchAll(LINK_RE)) {
    const u = m[0].replace(/[.,;:]+$/, '');
    let p; try { p = new URL(u); } catch { missing.push(u); continue; }
    // a link that searches for something must name something that exists in the repo
    const q = p.searchParams.get('q');
    if (q && !findName(root, q)) missing.push(u);
  }
  return missing.length ? { ok: false, reason: `cites things that don't exist: ${missing.slice(0, 5).join(', ')}`, missing } : { ok: true, reason: '', missing };
}

function findName(root, q) {
  const needle = q.toLowerCase();
  const stack = TOP.map((d) => path.join(root, d)); let seen = 0;
  while (stack.length && seen < 20000) {
    const d = stack.pop(); let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of es) { seen++; if (e.name.startsWith('.') || e.name === 'node_modules') continue; if (e.name.toLowerCase().includes(needle)) return true; if (e.isDirectory()) stack.push(path.join(d, e.name)); }
  }
  return false;
}
