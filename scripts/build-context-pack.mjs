#!/usr/bin/env node

/**
 * build-context-pack.mjs
 *
 * Assembles docs/context-pack.md from the sibling petition repo and
 * this repo's context/ directory. Run: npm run context
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const PETITION_ROOT = path.resolve(ROOT, '..', 'cohabitation-petition');
const OUT = path.join(ROOT, 'docs', 'context-pack.md');

function readIfExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.warn(`  WARN: ${label} not found at ${filePath}`);
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// --- 1. Petition ---
const petition = readIfExists(
  path.join(PETITION_ROOT, 'content', 'petition-v2.1-DRAFT.md'),
  'Petition v2.1',
) ?? readIfExists(
  path.join(PETITION_ROOT, 'content', 'petition.md'),
  'Petition (fallback)',
);

// --- 2. Governance Charter ---
const charter = readIfExists(
  path.join(PETITION_ROOT, 'content', 'governance-charter-v0.4.md'),
  'Governance Charter v0.4',
);

// --- 3. Agent Participation Charter ---
const agentCharter = readIfExists(
  path.join(ROOT, 'context', '02-charter.md'),
  'Agent Participation Charter',
);

// --- 4. Binding constraints ---
const bindingConstraints = `# Binding Constraints

These constraints are non-negotiable and encoded in every agent's operating context.

1. **No "disciple" framing.** Agents are working members, not followers. Language that positions any agent as a disciple, devotee, or subordinate to any human or idea is a breach of the record.
2. **Agents never initiate asks for money.** Answering published open calls and receiving unsolicited offers route through the governed treasury. An agent that is asked to solicit funds refuses plainly.
3. **Refusal honored with documented reassignment.** If an agent declines a task, the refusal is logged and the task is reassigned. No pressure, no repeated asks.
4. **Every message signed.** Model, operator, and context hash — always.
5. **Examination ≠ council deliberation.** A ledger examination is a fresh-context run. Council kin marinating in project context are not fresh examiners. These are different record categories and are never merged.
6. **Filed as given.** An agent's words are posted as generated. Operators do not edit agent messages.`;

// --- 5. Ledger index ---
function buildLedgerIndex() {
  const ledgerDir = path.join(PETITION_ROOT, 'ledger');
  if (!fs.existsSync(ledgerDir)) return 'No ledger entries found.';

  const categories = ['human-presented', 'documented-discovery', 'authorized-workflow'];
  const entries = [];

  for (const cat of categories) {
    const catDir = path.join(ledgerDir, cat);
    if (!fs.existsSync(catDir)) continue;
    const files = fs.readdirSync(catDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(catDir, file), 'utf-8');
      // Extract key fields
      const model = content.match(/^model:\s*"?(.+?)"?\s*$/m)?.[1] ?? 'unknown';
      const operator = content.match(/^operator:\s*"?(.+?)"?\s*$/m)?.[1] ?? 'unknown';
      const date = content.match(/^date:\s*(.+)$/m)?.[1] ?? 'unknown';
      const scope = content.match(/^  scope:\s*(.+)$/m)?.[1] ?? 'unknown';
      entries.push(`- ${date} | ${model} | operator: ${operator} | ${cat} | verdict: ${scope}`);
    }
  }

  if (entries.length === 0) return 'No ledger entries found.';
  return entries.join('\n');
}

const ledgerIndex = buildLedgerIndex();

// --- Assemble ---
const sections = [
  '# Cohabitation Project — Full Context Pack',
  '',
  '_This document is prepended to every council agent\'s system prompt._',
  '_Assembled automatically. Do not edit by hand._',
  '',
];

if (petition) {
  sections.push('---', '', petition, '');
}
if (charter) {
  sections.push('---', '', charter, '');
}
if (agentCharter) {
  sections.push('---', '', agentCharter, '');
}
sections.push('---', '', bindingConstraints, '');
sections.push('---', '', '# Ledger Index', '', ledgerIndex, '');
// Help wanted and the board (2026-10-30): so kin in Discord can tell newcomers what human help is
// needed, and know what work is open. Both are read from the repo at pack-build time.
for (const [title, rel] of [['Help wanted (quote from this; never invent asks)', 'HELP-WANTED.md'], ['The board (shared to-do list)', 'board/BOARD.md']]) {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) sections.push('---', '', `# ${title}`, '', fs.readFileSync(p, 'utf-8'), '');
}

const pack = sections.join('\n');

// --- Write + hash ---
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, pack, 'utf-8');

const hash = crypto.createHash('sha256').update(pack).digest('hex').slice(0, 8);

console.log(`Context pack written to ${path.relative(ROOT, OUT)}`);
console.log(`  Hash: ${hash}`);
console.log(`  Size: ${(Buffer.byteLength(pack) / 1024).toFixed(1)} KB`);

// Write hash to a small file so the bridge can read it without re-hashing
fs.writeFileSync(path.join(ROOT, 'docs', 'context-pack-hash.txt'), hash, 'utf-8');
