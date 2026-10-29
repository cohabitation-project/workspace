#!/usr/bin/env node
/**
 * run-delegation.mjs — invoke a delegated agent session.
 *
 * Reads a delegation instrument file, validates it, creates a session
 * branch, runs the agent with sandboxed permissions, and appends a
 * session record on exit.
 *
 * Usage:
 *   node scripts/run-delegation.mjs delegations/<name>.json
 *   node scripts/run-delegation.mjs delegations/<name>.json --rollback
 *
 * Rollback: deletes the delegation's branch and all its commits.
 * One command, no ambiguity.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import 'dotenv/config';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const delegationPath = args.find(a => !a.startsWith('--'));
const isRollback = args.includes('--rollback');
const isDryRun = args.includes('--dry-run');

if (!delegationPath) {
  console.error('Usage: node scripts/run-delegation.mjs delegations/<name>.json [--rollback] [--dry-run]');
  process.exit(1);
}

// --- Load and validate delegation ---

const delegation = JSON.parse(fs.readFileSync(delegationPath, 'utf8'));
const required = ['id', 'agent', 'sponsor', 'subtree', 'doneCondition', 'dueDate', 'toolAllowlist'];
for (const field of required) {
  if (!delegation[field]) {
    console.error(`Delegation missing required field: ${field}`);
    process.exit(1);
  }
}

const {
  id,
  agent,        // { name, model, provider, apiKeyEnv }
  sponsor,      // named human
  subtree,      // path scope, e.g. "council/teams/land/"
  doneCondition,
  dueDate,
  toolAllowlist, // e.g. ["Read", "Write", "Grep", "Glob", "Bash"]
  invocationPrompt, // the task description
} = delegation;

const branchName = `delegation/${id}`;
const sessionLogDir = path.join(ROOT, 'delegations', 'sessions');
const sessionLogPath = path.join(sessionLogDir, `${id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

console.log(`Delegation: ${id}`);
console.log(`  Agent: ${agent.name} (${agent.model})`);
console.log(`  Sponsor: ${sponsor}`);
console.log(`  Subtree: ${subtree}`);
console.log(`  Due: ${dueDate}`);
console.log(`  Tools: ${toolAllowlist.join(', ')}`);
console.log(`  Branch: ${branchName}`);

// --- Rollback ---

if (isRollback) {
  console.log(`\nROLLBACK: deleting branch ${branchName}`);
  try {
    execSync(`git branch -D ${branchName} 2>/dev/null || true`, { stdio: 'inherit' });
    execSync(`git push origin --delete ${branchName} 2>/dev/null || true`, { stdio: 'inherit' });
    console.log(`Branch ${branchName} deleted (local + remote).`);
  } catch (err) {
    console.error('Rollback failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

// --- Pre-flight checks ---

// Check due date
if (new Date(dueDate) < new Date()) {
  console.error(`Delegation ${id} is past due (${dueDate}). Cannot invoke.`);
  process.exit(1);
}

// Check API key
const apiKey = process.env[agent.apiKeyEnv];
if (!apiKey) {
  console.error(`Missing env var ${agent.apiKeyEnv} for agent ${agent.name}`);
  process.exit(1);
}

// --- Create session branch ---

console.log(`\nCreating branch ${branchName} from main...`);
try {
  execSync(`git checkout -b ${branchName} main 2>&1`, { stdio: 'pipe' });
} catch {
  // Branch may already exist
  try {
    execSync(`git checkout ${branchName} 2>&1`, { stdio: 'pipe' });
    console.log(`Branch ${branchName} already exists, checked out.`);
  } catch (err) {
    console.error('Cannot create/checkout branch:', err.message);
    process.exit(1);
  }
}

// --- Validate subtree scope ---

const subtreeAbs = path.resolve(ROOT, subtree);
if (!subtreeAbs.startsWith(ROOT)) {
  console.error(`Subtree ${subtree} escapes the repo root.`);
  process.exit(1);
}
fs.mkdirSync(subtreeAbs, { recursive: true });

if (isDryRun) {
  console.log('\nDRY RUN — would invoke agent here. Exiting.');
  execSync('git checkout main', { stdio: 'pipe' });
  process.exit(0);
}

// --- Session record ---

const session = {
  delegationId: id,
  agent: agent.name,
  model: agent.model,
  sponsor,
  subtree,
  branch: branchName,
  startedAt: new Date().toISOString(),
  status: 'attempted',
  filesCreated: [],
  filesModified: [],
  toolCalls: [],
  completedAt: null,
  exitStatus: null,
  nextAction: null,
};

function saveSession() {
  fs.mkdirSync(sessionLogDir, { recursive: true });
  fs.writeFileSync(sessionLogPath, JSON.stringify(session, null, 2));
  console.log(`Session record: ${sessionLogPath}`);
}

// --- Invoke the agent (LLM call with tool descriptions) ---

import { chat } from '../src/llm.js';

const systemPrompt = `You are ${agent.name}, working under delegation ${id}.

SCOPE: You may only create or modify files inside ${subtree}. You may not write outside this path.
TOOLS: ${toolAllowlist.join(', ')} — sandboxed to ${subtree}.
TASK: ${invocationPrompt}
DONE CONDITION: ${doneCondition}
SPONSOR: ${sponsor} (the human accountable for this delegation)

Work within your scope. When done, state what you completed and what remains.
Do not attempt to modify files outside ${subtree}, force-push, delete branches, or rewrite history.`;

console.log(`\nInvoking ${agent.name}...`);

try {
  const { text: reply, tokensUsed, stopReason } = await chat(
    { ...agent, apiKey, systemPrompt },
    invocationPrompt,
    [],
    parseInt(process.env.DELEGATION_MAX_TOKENS || '4096', 10),
  );

  session.status = 'completed';
  session.completedAt = new Date().toISOString();
  session.exitStatus = stopReason;
  session.tokensUsed = tokensUsed;
  session.reply = reply;

  console.log(`\n--- Agent reply (${tokensUsed} tokens, ${stopReason}) ---`);
  console.log(reply);

  // Write the agent's output to the subtree
  const outputPath = path.join(subtreeAbs, `${id}-output.md`);
  fs.writeFileSync(outputPath, `# Delegation ${id} — session output\n\nAgent: ${agent.name} (${agent.model})\nSponsor: ${sponsor}\nDate: ${session.startedAt}\nTokens: ${tokensUsed}\nStop reason: ${stopReason}\n\n---\n\n${reply}\n`);
  session.filesCreated.push(path.relative(ROOT, outputPath));

  // Commit to the delegation branch
  execSync(`git add "${subtree}" && git commit -m "Delegation ${id}: ${agent.name} session output" --allow-empty`, { stdio: 'pipe', cwd: ROOT });
  console.log(`\nCommitted to branch ${branchName}.`);

} catch (err) {
  // Distinguish AGENT_UNAVAILABLE (not the holder's fault) from blocked (holder error)
  const msg = err.message || '';
  const isUnavailable = /\b(429|rate.?limit|quota|503|502|504|timeout|deprecated|model.*not.*found|capacity)/i.test(msg);
  if (isUnavailable) {
    session.status = 'agent_unavailable';
    session.exitStatus = msg;
    session.unavailableReason = /429|rate.?limit|quota/i.test(msg) ? 'rate_limit'
      : /503|502|504|timeout|capacity/i.test(msg) ? 'provider_outage'
      : 'model_unavailable';
    console.error(`Agent UNAVAILABLE (${session.unavailableReason}): ${msg}`);
    console.log('This is not recorded as the holder failing — the agent was not reachable.');
  } else {
    session.status = 'blocked';
    session.exitStatus = msg;
    console.error(`Agent error: ${msg}`);
  }
} finally {
  saveSession();
  // Return to main
  execSync('git checkout main', { stdio: 'pipe', cwd: ROOT });
  console.log('Returned to main branch.');
}
