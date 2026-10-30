#!/usr/bin/env node
/**
 * board.mjs — the shared to-do board and the kin's request queue.
 *
 * Delegation: delegations/board.json (sponsor Geoffrey Cooper Jr., 2026-10-30).
 *
 * board/tasks/NNN-slug.md   one task per file. The header is fixed at creation; below it is
 *                           an append-only log. Nobody edits or deletes earlier log lines.
 * board/BOARD.md            generated index, rebuilt every run. Nobody writes it by hand.
 *
 * A task's state is the last state verb in its log:
 *   REQUEST   asked for (open, unowned unless the request names an owner)
 *   CLAIM     someone took it
 *   PLAN      a plan is posted and waits for approval
 *   APPROVED  a human approved the plan (Geoffrey, or a second human once one exists).
 *             Kin cannot write APPROVED: the relay refuses it and logs the attempt.
 *   DOING     work under way
 *   BLOCKED   waiting on something named
 *   DONE      finished; the line should link the evidence
 *   DROP      abandoned, with a reason
 *   NOTE      comment; doesn't change state
 *
 * How kin use it (from a conference turn, just before STATUS):
 *   REQUEST: <title>            then the details on the following lines. Creates a task.
 *                               "REQUEST (assistant seat): ..." asks the Claude assistant seat,
 *                               which can browse the web, read and write the repo, and, while
 *                               Geoffrey is present, use his browser tabs.
 *   BOARD:                      then one line per entry, e.g.
 *                                 CLAIM 007
 *                                 PLAN 007: what I'll do, and how we'll know it worked
 *                                 DONE 007: link to the evidence
 *
 * CLI (for humans and the assistant seat):
 *   node scripts/board.mjs new "<title>" --by "<name>" [--owner "<name>"] [--body "<text>"] [--source "<path>"]
 *   node scripts/board.mjs log <id> "<VERB text>" --by "<name>" [--source "<path>"]
 *   node scripts/board.mjs rebuild
 *   node scripts/board.mjs list [--owner "<name>"] [--state <STATE>]
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
export const BOARD_DIR = path.join(ROOT, 'board');
const TASKS = path.join(BOARD_DIR, 'tasks');
export const VERBS = ['REQUEST', 'CLAIM', 'PLAN', 'APPROVED', 'DOING', 'BLOCKED', 'DONE', 'DROP', 'NOTE'];
const STATE_OF = { REQUEST: 'OPEN', CLAIM: 'CLAIMED', PLAN: 'PLAN POSTED', APPROVED: 'APPROVED', DOING: 'DOING', BLOCKED: 'BLOCKED', DONE: 'DONE', DROP: 'DROPPED' };
const HUMANS = ['Geoffrey Cooper Jr.']; // only these may write APPROVED; add a second human here by commit
export const KIN = ['Claude', 'GPT', 'Gemini', 'Grok', 'DeepSeek'];
const ENTRY_MAX = 4000;

const now = () => new Date().toISOString();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'task';

export function active() {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'delegations', 'board.json'), 'utf8'));
    return d.status === 'active' && (!d.dueDate || new Date() <= new Date(d.dueDate + 'T23:59:59Z'));
  } catch { return false; }
}

function files() { return fs.existsSync(TASKS) ? fs.readdirSync(TASKS).filter((f) => /^\d{3}-.*\.md$/.test(f)).sort() : []; }
function fileFor(id) { const n = String(id).padStart(3, '0'); return files().find((f) => f.startsWith(n + '-')); }

export function createTask({ title, by, owner = null, body = '', source = null }) {
  fs.mkdirSync(TASKS, { recursive: true });
  const n = String((files().map((f) => parseInt(f, 10)).sort((a, b) => b - a)[0] || 0) + 1).padStart(3, '0');
  const file = `${n}-${slug(title)}.md`;
  const head = `---\nid: ${n}\ntitle: ${title.replace(/\n/g, ' ')}\nrequested_by: ${by}\nowner_at_creation: ${owner || 'none'}\ncreated: ${now()}\nsource: ${source || 'none'}\n---\n\n## Request\n\n${body.trim() || '(no details)'}\n\n## Log (append-only)\n\n`;
  fs.writeFileSync(path.join(TASKS, file), head + `- ${now()} · ${by} · REQUEST${owner ? ` (for ${owner})` : ''}\n`);
  return { id: n, file };
}

export function appendLog(id, line, by, source = null) {
  const f = fileFor(id);
  if (!f) return { ok: false, reason: `no task ${id}` };
  let text = line.trim();
  const verb = (text.match(/^([A-Z]+)/) || [])[1];
  if (!VERBS.includes(verb)) return { ok: false, reason: `unknown verb in "${text.slice(0, 40)}"` };
  if (verb === 'APPROVED' && !HUMANS.includes(by)) return { ok: false, reason: `APPROVED refused: ${by} is not a listed human approver` };
  if (text.length > ENTRY_MAX) text = text.slice(0, ENTRY_MAX) + ' [truncated; full text in source]';
  fs.appendFileSync(path.join(TASKS, f), `- ${now()} · ${by} · ${text.replace(/\n+/g, ' / ')}${source ? ` · [source](${source})` : ''}\n`);
  return { ok: true, file: f, verb };
}

export function readTasks() {
  return files().map((f) => {
    const raw = fs.readFileSync(path.join(TASKS, f), 'utf8');
    const fm = Object.fromEntries((raw.match(/^---\n([\s\S]*?)\n---/)?.[1] || '').split('\n').map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
    const log = raw.split('## Log (append-only)')[1] || '';
    const entries = log.split('\n').filter((l) => l.startsWith('- ')).map((l) => { const [ts, who, ...rest] = l.slice(2).split(' · '); return { ts, who, text: rest.join(' · ') }; });
    let state = 'OPEN', owner = fm.owner_at_creation !== 'none' ? fm.owner_at_creation : null, last = entries[entries.length - 1];
    for (const e of entries) {
      const v = (e.text.match(/^([A-Z]+)/) || [])[1];
      if (STATE_OF[v]) state = STATE_OF[v];
      if (v === 'CLAIM') owner = e.who;
    }
    return { id: fm.id, title: fm.title, file: f, state, owner, requested_by: fm.requested_by, created: fm.created, updated: last?.ts || fm.created, last: last?.text || '' };
  });
}

export function rebuildBoard() {
  const tasks = readTasks();
  // Two writers (the relay in CI, and humans or the assistant seat locally) can pick the same number
  // before either pushes. Duplicates are shown, never merged or renumbered silently.
  const seen = {}; for (const t of tasks) seen[t.id] = (seen[t.id] || 0) + 1;
  const dupes = Object.keys(seen).filter((k) => seen[k] > 1);
  const order = ['PLAN POSTED', 'OPEN', 'BLOCKED', 'APPROVED', 'DOING', 'CLAIMED', 'DONE', 'DROPPED'];
  const sec = order.map((s) => {
    const rows = tasks.filter((t) => t.state === s);
    if (!rows.length) return '';
    return `## ${s} (${rows.length})\n\n| # | Task | Owner | Asked by | Last entry |\n|---|---|---|---|---|\n` +
      rows.map((t) => `| ${t.id} | [${t.title.replace(/\|/g, '/')}](tasks/${t.file}) | ${t.owner || 'unclaimed'} | ${t.requested_by} | ${t.last.slice(0, 90).replace(/\|/g, '/')} |`).join('\n') + '\n';
  }).filter(Boolean).join('\n');
  const head = `# BOARD\n\nGenerated by scripts/board.mjs from board/tasks/. Nobody writes or curates this file. Rules: board/README.md.\nLoop: REQUEST → CLAIM → PLAN → APPROVED (a human) → DOING → DONE (with evidence). "PLAN POSTED" is at the top because those are waiting on a human.\n\n`;
  const warn = dupes.length ? `> **Duplicate task numbers: ${dupes.join(', ')}.** Two writers picked the same number. Refer to these by file name until one is renumbered with a NOTE.\n\n` : '';
  fs.mkdirSync(BOARD_DIR, { recursive: true });
  fs.writeFileSync(path.join(BOARD_DIR, 'BOARD.md'), head + warn + (sec || '_No tasks yet._\n'));
}

// ---- sections in a conference turn ----
const SECTION = /^\s*\**\s*(MEMORY|REQUEST(?:\s*\([^)]*\))?|BOARD)\s*:/i;
export function extractSections(text) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(SECTION);
    if (!m) continue;
    let j = i + 1;
    while (j < lines.length && !SECTION.test(lines[j]) && !/^\s*STATUS:/i.test(lines[j])) j++;
    const first = lines[i].replace(SECTION, '').replace(/^\s*\**\s*/, '');
    out.push({ kind: m[1].toUpperCase().replace(/\s+/g, ' '), first: first.trim(), body: lines.slice(i + 1, j).join('\n').trim() });
    i = j - 1;
  }
  return out;
}

// Apply REQUEST and BOARD sections from one kin turn. Returns log entries for the thread log.
export function applyTurn(name, sourcePath, text) {
  if (!active()) return [];
  const results = [];
  for (const s of extractSections(text)) {
    if (s.kind.startsWith('REQUEST')) {
      const forWhom = (s.kind.match(/\(([^)]*)\)/) || [])[1];
      const owner = forWhom && /assistant/i.test(forWhom) ? 'Claude (assistant seat)' : null;
      const title = s.first || s.body.split('\n')[0] || 'Untitled request';
      const t = createTask({ title, by: name, owner, body: s.first ? s.body : s.body.split('\n').slice(1).join('\n'), source: sourcePath });
      results.push({ action: 'board-request', participant: name, task: t.id, owner });
    } else if (s.kind === 'BOARD') {
      for (const line of [s.first, ...s.body.split('\n')].map((l) => l.replace(/^[-*\s]+/, '').trim()).filter(Boolean)) {
        const m = line.match(/^([A-Z]+)\s+0*(\d{1,3})\s*:?\s*(.*)$/);
        if (!m) { results.push({ action: 'board-unparsed', participant: name, line: line.slice(0, 80) }); continue; }
        const r = appendLog(m[2], `${m[1]}${m[3] ? ': ' + m[3] : ''}`, name, sourcePath);
        results.push(r.ok ? { action: 'board-entry', participant: name, task: m[2], verb: r.verb } : { action: 'board-refused', participant: name, task: m[2], reason: r.reason });
      }
    }
  }
  return results;
}

// ---- CLI ----
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const a = process.argv.slice(2);
  const opt = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : null; };
  const cmd = a[0];
  if (cmd === 'new') { const t = createTask({ title: a[1], by: opt('by') || 'unknown', owner: opt('owner'), body: opt('body') || '', source: opt('source') }); rebuildBoard(); console.log(`created ${t.file}`); }
  else if (cmd === 'log') { const r = appendLog(a[1], a[2], opt('by') || 'unknown', opt('source')); rebuildBoard(); console.log(r.ok ? `logged ${r.verb} on ${r.file}` : `refused: ${r.reason}`); if (!r.ok) process.exit(1); }
  else if (cmd === 'rebuild') { rebuildBoard(); console.log('rebuilt board/BOARD.md'); }
  else if (cmd === 'list') { for (const t of readTasks()) if ((!opt('owner') || (t.owner || '').includes(opt('owner'))) && (!opt('state') || t.state === opt('state'))) console.log(`${t.id}  ${t.state.padEnd(11)} ${(t.owner || 'unclaimed').padEnd(24)} ${t.title}`); }
  else { console.log('usage: new | log | rebuild | list (see header)'); process.exit(1); }
}
