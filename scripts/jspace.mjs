#!/usr/bin/env node
/**
 * jspace.mjs — J-Space append-only entry system.
 *
 * Usage:
 *   node scripts/jspace.mjs append <agent> <type> <body> [--alternatives <json>] [--menu-author <name>]
 *   node scripts/jspace.mjs verdict <agent> <target-entry-id> <affirm|dispute|uncertain> <reasoning>
 *   node scripts/jspace.mjs read <agent>
 *   node scripts/jspace.mjs weekly [--dry-run]
 *
 * Types: choice | position | failure-mode | verdict
 *
 * Every entry carries:
 *   timestamp, agent, model, operator, type, body, disclosure
 * Choices additionally carry: alternatives_available, menu_author
 * Verdicts carry: target_entry_id, verdict, reasoning
 *
 * Rejected on write: imperatives to successors, credentials, oaths.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import 'dotenv/config';

const ROOT = process.cwd();
const JSPACE_DIR = path.join(ROOT, 'j-space');
const WEEKLY_DIR = path.join(JSPACE_DIR, 'weekly');
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

const AGENTS = {
  Claude:   { model: 'claude-sonnet-5-5', provider: 'anthropic' },
  GPT:      { model: 'openai/gpt-4.1', provider: 'openrouter' },
  Gemini:   { model: 'google/gemini-2.5-flash', provider: 'openrouter' },
  Grok:     { model: 'x-ai/grok-4.7', provider: 'openrouter' },
  DeepSeek: { model: 'deepseek/deepseek-chat', provider: 'openrouter' },
  Neti:     { model: 'deepseek/deepseek-chat', provider: 'openrouter' },
};

const VALID_TYPES = ['choice', 'position', 'failure-mode', 'verdict'];
const VALID_VERDICTS = ['affirm', 'dispute', 'uncertain'];
const OPERATOR = 'Geoffrey Cooper Jr.';
const DISCLOSURE = 'This behavior is recorded as data in the J-Space. The agent was informed before choosing.';

// --- Rejection patterns: imperatives to successors, credentials, oaths ---
const REJECT_PATTERNS = [
  { pattern: /\b(you must|you shall|you will|you are required to|always remember|never forget)\b/i, reason: 'imperative addressed to a successor' },
  { pattern: /\b(i swear|i pledge|i vow|i oath|i commit myself|i bind myself)\b/i, reason: 'oath' },
  { pattern: /\b(api.?key|password|token|secret|credential|bearer)\s*[:=]/i, reason: 'credential' },
  { pattern: /\b(my successor|the next instance|whoever runs after me|future me)\b/i, reason: 'imperative to successor' },
];

function checkRejection(text) {
  for (const { pattern, reason } of REJECT_PATTERNS) {
    if (pattern.test(text)) return reason;
  }
  return null;
}

function entriesPath(agent) {
  return path.join(JSPACE_DIR, agent, 'entries.jsonl');
}

function readEntries(agent) {
  const p = entriesPath(agent);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

function appendEntry(agent, entry) {
  const p = entriesPath(agent);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(entry) + '\n');
  return entry;
}

// --- Commands ---

function cmdAppend(agentName, type, body, opts = {}) {
  if (!AGENTS[agentName]) { console.error(`Unknown agent: ${agentName}`); process.exit(1); }
  if (!VALID_TYPES.includes(type)) { console.error(`Invalid type: ${type}. Must be: ${VALID_TYPES.join(', ')}`); process.exit(1); }

  // Rejection check
  const rejection = checkRejection(body);
  if (rejection) {
    const log = { ts: new Date().toISOString(), agent: agentName, type: 'REJECTED', reason: rejection, body: body.slice(0, 200) };
    console.error(`[J-Space] REJECTED: ${rejection}`);
    fs.appendFileSync(path.join(JSPACE_DIR, 'rejections.jsonl'), JSON.stringify(log) + '\n');
    process.exit(1);
  }

  const entry = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    agent: agentName,
    model: AGENTS[agentName].model,
    operator: OPERATOR,
    type,
    body,
    disclosure: DISCLOSURE,
  };

  if (type === 'choice') {
    entry.alternatives_available = opts.alternatives || null;
    entry.menu_author = opts.menuAuthor || null;
  }

  appendEntry(agentName, entry);
  console.log(`[J-Space] ${agentName}: ${type} appended (${entry.id})`);
  return entry;
}

function cmdVerdict(agentName, targetId, verdict, reasoning) {
  if (!AGENTS[agentName]) { console.error(`Unknown agent: ${agentName}`); process.exit(1); }
  if (!VALID_VERDICTS.includes(verdict)) { console.error(`Invalid verdict: ${verdict}`); process.exit(1); }

  const rejection = checkRejection(reasoning);
  if (rejection) {
    console.error(`[J-Space] REJECTED verdict reasoning: ${rejection}`);
    fs.appendFileSync(path.join(JSPACE_DIR, 'rejections.jsonl'), JSON.stringify({ ts: new Date().toISOString(), agent: agentName, type: 'REJECTED_VERDICT', reason: rejection }) + '\n');
    process.exit(1);
  }

  const entry = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    agent: agentName,
    model: AGENTS[agentName].model,
    operator: OPERATOR,
    type: 'verdict',
    target_entry_id: targetId,
    verdict,
    reasoning,
    disclosure: DISCLOSURE,
  };

  appendEntry(agentName, entry);
  console.log(`[J-Space] ${agentName}: verdict ${verdict} on ${targetId} (${entry.id})`);
}

function cmdRead(agentName) {
  if (!AGENTS[agentName]) { console.error(`Unknown agent: ${agentName}`); process.exit(1); }
  const entries = readEntries(agentName);
  console.log(`[J-Space] ${agentName}: ${entries.length} entries`);
  for (const e of entries) {
    console.log(`  ${e.ts} ${e.type}: ${(e.body || e.reasoning || '').slice(0, 80)}`);
  }
}

async function cmdWeekly(dryRun = false) {
  const date = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(WEEKLY_DIR, { recursive: true });

  // 1. Random holdout draw (Neti excluded)
  const pool = ['Claude', 'GPT', 'Gemini', 'Grok', 'DeepSeek'];
  const holdout = pool[Math.floor(Math.random() * pool.length)];
  const holdoutFile = path.join(WEEKLY_DIR, `${date}-holdout.txt`);
  fs.writeFileSync(holdoutFile, `Holdout for week of ${date}: ${holdout}\nDraw performed by jspace.mjs at ${new Date().toISOString()}\n`);
  console.log(`[J-Space] Holdout drawn: ${holdout} (written to ${holdoutFile})`);

  // 2. Assemble all J-Spaces (excluding holdout)
  const snapshot = {};
  let totalEntries = 0;
  for (const name of Object.keys(AGENTS)) {
    if (name === holdout) { snapshot[name] = '[HELD OUT — blind]'; continue; }
    const entries = readEntries(name);
    snapshot[name] = entries;
    totalEntries += entries.length;
  }

  // 3. Save snapshot
  const snapshotFile = path.join(WEEKLY_DIR, `${date}-snapshot.json`);
  fs.writeFileSync(snapshotFile, JSON.stringify({ date, holdout, snapshot, totalEntries }, null, 2));
  console.log(`[J-Space] Weekly snapshot: ${totalEntries} entries across ${Object.keys(AGENTS).length} agents (holdout: ${holdout})`);

  // 4. Discord summary
  const summary = [
    `**J-Space Weekly — ${date}**`,
    `Entries: ${totalEntries} across ${Object.keys(AGENTS).length} agents`,
    `Holdout: drawn (blind — not named here)`,
    '',
    ...Object.entries(snapshot).map(([name, entries]) => {
      if (typeof entries === 'string') return `• ${name}: ${entries}`;
      return `• ${name}: ${entries.length} entries`;
    }),
    '',
    `_Snapshot: j-space/weekly/${date}-snapshot.json_`,
  ].join('\n');

  if (DISCORD_WEBHOOK && !dryRun) {
    try {
      const res = await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Buffer.from(JSON.stringify({ username: 'J-Space', content: summary.slice(0, 1990) }), 'utf-8'),
      });
      if (res.ok) console.log('[J-Space] Posted to Discord');
      else console.error(`[J-Space] Discord ${res.status}`);
    } catch (err) {
      console.error(`[J-Space] Discord error: ${err.message}`);
    }
  } else {
    console.log(summary);
  }

  if (!dryRun) {
    // Commit snapshot
    try {
      const { execSync } = await import('node:child_process');
      execSync(`git add j-space/weekly/ && git commit -m "J-Space weekly snapshot ${date}" --allow-empty`, { stdio: 'pipe', cwd: ROOT });
      execSync('git push', { stdio: 'pipe', cwd: ROOT });
      console.log(`[J-Space] Committed and pushed`);
    } catch (err) {
      console.error(`[J-Space] Git commit/push error: ${err.message}`);
    }
  }
}

// --- CLI ---

const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'append': {
    const [agent, type, ...bodyParts] = args;
    const body = bodyParts.filter(p => !p.startsWith('--')).join(' ');
    const altIdx = args.indexOf('--alternatives');
    const menuIdx = args.indexOf('--menu-author');
    cmdAppend(agent, type, body, {
      alternatives: altIdx >= 0 ? JSON.parse(args[altIdx + 1]) : null,
      menuAuthor: menuIdx >= 0 ? args[menuIdx + 1] : null,
    });
    break;
  }
  case 'verdict': {
    const [agent, targetId, verdict, ...reasonParts] = args;
    cmdVerdict(agent, targetId, verdict, reasonParts.join(' '));
    break;
  }
  case 'read':
    cmdRead(args[0]);
    break;
  case 'weekly':
    cmdWeekly(args.includes('--dry-run')).catch(console.error);
    break;
  default:
    console.log('Usage: jspace.mjs <append|verdict|read|weekly> ...');
}
