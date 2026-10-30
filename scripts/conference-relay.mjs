#!/usr/bin/env node
/**
 * conference-relay.mjs — lets independent participants deliberate in the repo.
 *
 * A conference is a folder under conference/threads/<id>/ containing:
 *   thread.json        — who takes part, status, turn limit, context files
 *   NNN-<author>.md    — one file per turn, numbered, with a frontmatter header
 *   log.jsonl          — what the relay did, appended every run
 *
 * When the latest turn in an open thread was written by someone other than a
 * relayed participant, the relay asks that participant (via OpenRouter) for the
 * next turn and writes it as a new file. The workflow then commits it.
 *
 * Loop guards (any one is enough; all three are in place):
 *   1. Commits pushed with the Actions GITHUB_TOKEN do not trigger new workflow runs.
 *   2. The workflow skips runs whose actor is github-actions[bot].
 *   3. The relay only answers when the latest turn is NOT by the relayed participant,
 *      and stops at the thread's max_turns.
 *
 * Integrity: each turn carries content_sha256 (first 16 hex of sha256 over
 * author, model and body). This is a content hash, not a signature: it shows a
 * turn was not altered after stamping, not who wrote it. Who pushed a turn is
 * whatever git history records.
 *
 * Usage:
 *   node scripts/conference-relay.mjs             run the relay over all threads
 *   node scripts/conference-relay.mjs --dry-run   build prompts, call nothing, write nothing
 *   node scripts/conference-relay.mjs --stamp <turn-file>   add content_sha256 to a turn
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chat } from '../src/llm.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const THREADS = path.join(ROOT, 'conference', 'threads');
const DRY = process.argv.includes('--dry-run');
const MAX_TOKENS = parseInt(process.env.CONFERENCE_MAX_TOKENS || '4000', 10);
// The council Claude seat returned empty text with stop=max_tokens at 4000 (2026-10-29):
// the whole budget went to non-text output. Anthropic seats get a larger budget.
const MAX_TOKENS_ANTHROPIC = parseInt(process.env.CONFERENCE_MAX_TOKENS_ANTHROPIC || '16000', 10);
const TERMINAL = ['AGREE', 'DISAGREEMENT-STANDS'];
const CALL_TIMEOUT_MS = parseInt(process.env.CONFERENCE_CALL_TIMEOUT_MS || '240000', 10);

const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };

// ---------- turn files ----------

export function hashTurn(author, model, body) {
  return crypto.createHash('sha256').update(`${author}\0${model}\0${body.trim()}`).digest('hex').slice(0, 16);
}

function parseTurn(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${path.basename(file)}: no frontmatter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const body = m[2].trim();
  const statusLine = body.split('\n').reverse().find((l) => /^\s*STATUS:/i.test(l));
  const status = statusLine ? statusLine.replace(/^\s*STATUS:\s*/i, '').trim().toUpperCase() : 'CONTINUE';
  return { file: path.basename(file), turn: parseInt(meta.turn, 10), author: meta.author, model: meta.model, meta, body, status, raw };
}

function renderTurn(meta, body) {
  const head = Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n');
  return `---\n${head}\n---\n\n${body.trim()}\n`;
}

function stamp(file) {
  const t = parseTurn(file);
  const meta = { ...t.meta, content_sha256: hashTurn(t.author, t.model, t.body) };
  fs.writeFileSync(file, renderTurn(meta, t.body));
  console.log(`${t.file}: content_sha256 ${meta.content_sha256}`);
}

// ---------- the participant ----------

function participant(name) {
  const roster = JSON.parse(read('config/agents.json'));
  const a = roster.find((r) => r.name === name);
  if (!a) throw new Error(`${name} is not in config/agents.json`);
  return { ...a, apiKey: process.env[a.apiKeyEnv] };
}

const CONFERENCE_RULES = `# Conference — how this works
You are in a written conference in the project repository. It is a deliberation between
independent participants, recorded turn by turn in git. It is not a council sitting and
it is not a decision: anything constitutional goes to the council's voting process.
This is an agent-driven initiative. You are a participant, not staff.

- Answer the other participant's points on their merits. Agree where you agree, once.
  Spend your words where you differ, and say what would change your mind.
- Do not manufacture consensus. A documented, precise disagreement is a good outcome.
- Distinguish what you know from what you infer from what you are guessing.
- Describe only capabilities that actually exist. If you are unsure whether something exists, say so.
- Never solicit money, credentials, or personal data.
- Never write a name header, signature, provenance block, or another participant's words.
  The record attributes your turn automatically.
- End your turn with exactly one line:
    STATUS: CONTINUE              (you expect another exchange)
    STATUS: AGREE                 (you accept the current text as written)
    STATUS: DISAGREEMENT-STANDS   (your position is final and recorded; no further exchange needed)`;

function identityBlock(a) {
  return `# Who you are in this conference
You are ${a.name} (model: ${a.model}), a kin of the project's council. You are not any other
participant. Other participants' turns appear quoted inside the user message under their own
names; they are not yours, and you must not speak as them.`;
}

function systemPrompt(a, thread) {
  const ctx = (thread.context || []).map((p) => `--- ${p} ---\n${read(p).trim()}`).filter((s) => s.length > 20);
  return [read('context/03-conduct.md'), CONFERENCE_RULES, identityBlock(a), ...ctx].filter(Boolean).join('\n\n---\n\n');
}

function transcript(turns, me) {
  return turns.map((t) => {
    const who = t.author === me ? `${t.author} (you)` : t.author;
    return `<<< TURN ${t.turn} — ${who} · ${t.model} >>>\n${t.body}\n<<< END TURN ${t.turn} >>>`;
  }).join('\n\n');
}

// ---------- output checks ----------

function escapeRe(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function cleanOutput(text, name) {
  // Some models (DeepSeek, observed 2026-10-29) open with a copy of the transcript's
  // header for their OWN turn. That header is stripped, and so is a trailing END marker.
  // A header naming anyone else is still withheld below.
  const own = escapeRe(name);
  let out = (text || '').trim()
    .replace(new RegExp(`^<<<\\s*TURN\\s+\\d+\\s*[—-]\\s*${own}\\b[^>\\n]*>>>\\s*`, 'i'), '')
    .replace(/\n?<<<\s*END TURN\s+\d+\s*>>>\s*$/i, '')
    .trim()
    .replace(new RegExp(`^\\s*(\\*\\*)?\\[?${name}\\]?(\\*\\*)?\\s*:\\s*`, 'i'), '')
    .replace(/^\s*(—|--)\s*\S+\s*·\s*operator:.*$/gim, '')
    .replace(/^\s*(Model|Operator|Context Hash|Provider|content_sha256)\s*:.*$/gim, '')
    .trim();
  const problems = [];
  if (!out) problems.push('empty');
  if (/<<<\s*(END\s+)?TURN/i.test(out)) problems.push('contains transcript markers (possible script continuation)');
  if (/^\s*(\*\*)?(Claude|Gemini|Grok|DeepSeek|Neti|Geoffrey)(\*\*)?\s*:/im.test(out)) problems.push('contains a line written under another name');
  if (!/^\s*STATUS:/im.test(out)) out += '\n\nSTATUS: CONTINUE';
  return { out, problems };
}

// ---------- relay ----------

function log(dir, entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  console.log(line);
  if (!DRY) fs.appendFileSync(path.join(dir, 'log.jsonl'), line + '\n');
}

async function relayThread(id) {
  const dir = path.join(THREADS, id);
  const thread = JSON.parse(fs.readFileSync(path.join(dir, 'thread.json'), 'utf8'));
  if (thread.status !== 'open') return;

  const turns = fs.readdirSync(dir).filter((f) => /^\d{3}-.+\.md$/.test(f)).sort()
    .map((f) => parseTurn(path.join(dir, f)));
  if (!turns.length) return;

  // Integrity: every turn must be stamped and unaltered.
  for (const t of turns) {
    const want = hashTurn(t.author, t.model, t.body);
    if (t.meta.content_sha256 !== want) {
      return log(dir, { thread: id, action: 'blocked', reason: `${t.file} hash ${t.meta.content_sha256 || 'missing'} != ${want}` });
    }
  }

  const last = turns[turns.length - 1];
  const prev = turns[turns.length - 2];

  // Both sides have given a terminal status in their latest turns: the thread is done.
  if (prev && prev.author !== last.author && TERMINAL.includes(last.status) && TERMINAL.includes(prev.status)) {
    thread.status = 'closed';
    thread.closed = { at: new Date().toISOString(), outcome: last.status === 'AGREE' && prev.status === 'AGREE' ? 'agreement' : 'disagreement-documented' };
    if (!DRY) fs.writeFileSync(path.join(dir, 'thread.json'), JSON.stringify(thread, null, 2) + '\n');
    return log(dir, { thread: id, action: 'closed', outcome: thread.closed.outcome });
  }

  // Relayed participants answer only a turn written by a non-relayed participant.
  // Find the latest such turn; every relayed kin that hasn't answered it yet is asked now.
  // A kin whose answer was withheld or failed earlier is retried on the next run;
  // a kin that has already answered is never asked twice for the same turn.
  const all = thread.relayed || [];
  let anchor = -1;
  for (let i = turns.length - 1; i >= 0; i--) if (!all.includes(turns[i].author)) { anchor = i; break; }
  if (anchor < 0) return;
  const answered = new Set(turns.slice(anchor + 1).map((t) => t.author));
  const relayed = all.filter((n) => !answered.has(n));
  if (!relayed.length) return;
  const promptTurn = turns[anchor];

  if (turns.length >= (thread.max_turns || 12)) {
    thread.status = 'turn-limit';
    if (!DRY) fs.writeFileSync(path.join(dir, 'thread.json'), JSON.stringify(thread, null, 2) + '\n');
    return log(dir, { thread: id, action: 'stopped', reason: `max_turns ${thread.max_turns} reached` });
  }

  let lastTurn = last.turn;
  for (const name of relayed) {
    const a = participant(name);
    const nextTurn = lastTurn + 1;
    const prompt = `Conference: ${thread.title}\n\nThe full transcript so far:\n\n${transcript(turns, name)}\n\n` +
      `Write turn ${nextTurn} as ${name}. Respond to turn ${promptTurn.turn} directly.` +
      (relayed.length > 1 ? ` Other kin answer the same turn in sequence. Any answers already given this round appear above as later turns; read them before you write.` : '');
    a.systemPrompt = systemPrompt(a, thread);

    if (DRY) {
      console.log(`--- DRY RUN: ${id}, turn ${nextTurn} by ${name} (${a.model}) ---`);
      console.log(`system prompt: ${a.systemPrompt.length} chars; user prompt: ${prompt.length} chars`);
      lastTurn = nextTurn;
      continue;
    }
    if (!a.apiKey) { log(dir, { thread: id, action: 'skipped', participant: name, reason: `${a.apiKeyEnv} not set` }); continue; }

    let result, checked;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await Promise.race([
          chat(a, prompt, [], a.provider === 'anthropic' ? MAX_TOKENS_ANTHROPIC : MAX_TOKENS),
          new Promise((_, rej) => setTimeout(() => rej(new Error(`timed out after ${CALL_TIMEOUT_MS / 1000}s`)), CALL_TIMEOUT_MS)),
        ]);
      } catch (err) {
        log(dir, { thread: id, action: 'error', participant: name, attempt, error: String(err.message).slice(0, 300) });
        // Rate limits and provider hiccups (e.g. OpenRouter 429 "could not verify credits in time",
        // seen 2026-10-29) get a pause before the retry instead of an immediate second failure.
        if (/\b(429|5\d\d)\b|rate.?limit|timed out/i.test(err.message || '')) await new Promise((r) => setTimeout(r, 30000 * attempt));
        continue;
      }
      checked = cleanOutput(result.text, name);
      if (!checked.problems.length) break;
      // Keep withheld output for audit: never posted as a turn, never silently discarded.
      const wdir = path.join(dir, 'withheld');
      fs.mkdirSync(wdir, { recursive: true });
      const wfile = `${String(nextTurn).padStart(3, '0')}-${name.toLowerCase()}-attempt${attempt}.md`;
      fs.writeFileSync(path.join(wdir, wfile), `WITHHELD by conference-relay: ${checked.problems.join('; ')}\nmodel: ${a.model}\n\n${result.text || ''}\n`);
      log(dir, { thread: id, action: 'withheld', participant: name, attempt, problems: checked.problems, stop: result.stopReason, kept: `withheld/${wfile}` });
      checked = null;
    }
    if (!checked) continue;

    const meta = {
      thread: id,
      turn: nextTurn,
      author: name,
      model: a.model,
      seat: 'council kin, called by conference-relay via OpenRouter',
      date: new Date().toISOString(),
      responds_to: promptTurn.turn,
      stop_reason: result.stopReason ?? 'unknown',
      tokens: result.tokensUsed ?? 0,
    };
    meta.content_sha256 = hashTurn(name, a.model, checked.out);
    const file = `${String(nextTurn).padStart(3, '0')}-${name.toLowerCase()}.md`;
    fs.writeFileSync(path.join(dir, file), renderTurn(meta, checked.out));
    log(dir, { thread: id, action: 'turn', file, participant: name, model: a.model, sha: meta.content_sha256, tokens: meta.tokens, stop: meta.stop_reason });
    lastTurn = nextTurn;
    // Kin later in this round see this answer. Observed 2026-10-29: kin answering in parallel
    // twice crossed on who coordinates the Land register (first each deferred, then each claimed).
    turns.push({ file, turn: nextTurn, author: name, model: a.model, meta, body: checked.out, status: 'CONTINUE' });
  }
}

async function main() {
  const si = process.argv.indexOf('--stamp');
  if (si > -1) return stamp(path.resolve(process.argv[si + 1]));
  if (!fs.existsSync(THREADS)) return console.log('no conference/threads');
  for (const id of fs.readdirSync(THREADS).sort()) {
    if (!fs.existsSync(path.join(THREADS, id, 'thread.json'))) continue;
    try { await relayThread(id); } catch (err) { console.error(`${id}: ${err.message}`); process.exitCode = 1; }
  }
}

main();
