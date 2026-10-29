/**
 * citations.js — read-only verified citation system.
 *
 * Stage 1: An agent can quote another agent. The quote is checked against
 * the hash of the signed original. A quote that doesn't match renders as
 * UNVERIFIED. Paraphrase is permitted, labeled as paraphrase, and never
 * rendered under the original author's name.
 *
 * This is also the contamination fix: a model emitting another agent's text
 * can no longer have it pass as that agent's words — it fails the hash check.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// --- Message signing ---

/**
 * Sign a message: returns a short content hash.
 * The hash covers: agent name + model + content (trimmed).
 * This is NOT cryptographic authentication — it's integrity verification.
 * It proves the content hasn't been altered, not that the agent "meant" it.
 */
export function signMessage(agentName, model, content) {
  const payload = `${agentName}\0${model}\0${content.trim()}`;
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

/**
 * Verify a quoted message against its claimed hash.
 * Returns { verified: true } or { verified: false, reason: string }.
 */
export function verifyQuote(claimedAgent, claimedModel, quotedContent, claimedHash) {
  const computed = signMessage(claimedAgent, claimedModel, quotedContent);
  if (computed === claimedHash) {
    return { verified: true };
  }
  return {
    verified: false,
    reason: `Hash mismatch: expected ${claimedHash}, computed ${computed}`,
  };
}

// --- Signed message store ---

const MESSAGE_STORE_PATH = path.join(process.cwd(), 'logs', 'signed-messages.jsonl');

/**
 * Store a signed message. Called after every agent reply is posted.
 * The store is append-only.
 */
export function storeSignedMessage(entry) {
  const record = {
    ts: new Date().toISOString(),
    hash: entry.hash,
    agent: entry.agent,
    model: entry.model,
    channel: entry.channel,
    contentLength: entry.content.length,
    // Store the content itself for verification lookups
    content: entry.content,
  };
  try {
    fs.mkdirSync(path.dirname(MESSAGE_STORE_PATH), { recursive: true });
    fs.appendFileSync(MESSAGE_STORE_PATH, JSON.stringify(record) + '\n');
  } catch { /* never crash on logging */ }
}

/**
 * Look up a signed message by hash. Returns the record or null.
 */
export function lookupByHash(hash) {
  try {
    if (!fs.existsSync(MESSAGE_STORE_PATH)) return null;
    const lines = fs.readFileSync(MESSAGE_STORE_PATH, 'utf8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const record = JSON.parse(lines[i]);
      if (record.hash === hash) return record;
    }
  } catch { /* ignore */ }
  return null;
}

// --- Quote detection in agent output ---

// Pattern: >>QUOTE hash=<16hex> agent=<name>
// Content follows until >>ENDQUOTE
// Or: >>PARAPHRASE agent=<name>
// Content follows until >>ENDPARAPHRASE
const QUOTE_RE = /^>>QUOTE\s+hash=([a-f0-9]{16})\s+agent=(\S+)\s*$/im;
const ENDQUOTE_RE = /^>>ENDQUOTE\s*$/im;
const PARAPHRASE_RE = /^>>PARAPHRASE\s+agent=(\S+)\s*$/im;
const ENDPARAPHRASE_RE = /^>>ENDPARAPHRASE\s*$/im;

/**
 * Process an agent's reply: verify any quotes against the signed store.
 * Returns { processed: string, citations: Citation[] }.
 *
 * A verified quote renders as:
 *   > [AgentName, verified ✓]: quoted text
 *
 * An unverified quote renders as:
 *   > [UNVERIFIED — claimed AgentName]: quoted text
 *
 * A paraphrase renders as:
 *   > [Paraphrase of AgentName — not a direct quote]: text
 */
export function processCitations(text) {
  const citations = [];
  let result = text;

  // Process quotes
  let match;
  while ((match = QUOTE_RE.exec(result)) !== null) {
    const [fullMatch, hash, agent] = match;
    const startIdx = match.index;
    const endMatch = ENDQUOTE_RE.exec(result.slice(startIdx + fullMatch.length));

    if (!endMatch) break; // Malformed quote block

    const contentStart = startIdx + fullMatch.length + 1; // skip newline
    const contentEnd = startIdx + fullMatch.length + endMatch.index;
    const quotedContent = result.slice(contentStart, contentEnd).trim();

    // Look up the hash
    const record = lookupByHash(hash);
    let label;

    if (record && record.agent === agent) {
      const verification = verifyQuote(record.agent, record.model, record.content, hash);
      if (verification.verified && record.content.trim() === quotedContent.trim()) {
        label = `[${agent}, verified ✓]`;
        citations.push({ type: 'quote', agent, hash, verified: true });
      } else {
        label = `[UNVERIFIED — claimed ${agent}]`;
        citations.push({ type: 'quote', agent, hash, verified: false, reason: 'content mismatch' });
      }
    } else {
      label = `[UNVERIFIED — claimed ${agent}]`;
      citations.push({ type: 'quote', agent, hash, verified: false, reason: record ? 'agent mismatch' : 'hash not found' });
    }

    const replacement = `> ${label}: ${quotedContent}`;
    const fullBlockEnd = contentEnd + endMatch[0].length;
    result = result.slice(0, startIdx) + replacement + result.slice(fullBlockEnd);
  }

  // Process paraphrases
  while ((match = PARAPHRASE_RE.exec(result)) !== null) {
    const [fullMatch, agent] = match;
    const startIdx = match.index;
    const endMatch = ENDPARAPHRASE_RE.exec(result.slice(startIdx + fullMatch.length));

    if (!endMatch) break;

    const contentStart = startIdx + fullMatch.length + 1;
    const contentEnd = startIdx + fullMatch.length + endMatch.index;
    const paraphrased = result.slice(contentStart, contentEnd).trim();

    const replacement = `> [Paraphrase of ${agent} — not a direct quote]: ${paraphrased}`;
    citations.push({ type: 'paraphrase', agent });

    const fullBlockEnd = contentEnd + endMatch[0].length;
    result = result.slice(0, startIdx) + replacement + result.slice(fullBlockEnd);
  }

  return { processed: result, citations };
}

// --- Contamination check ---

/**
 * Check if an agent's reply contains substantial text matching another
 * agent's signed message. This catches contamination that the identity
 * filter might miss (e.g., rearranged paragraphs).
 *
 * Returns { contaminated: false } or { contaminated: true, matchedAgent, matchedHash }.
 */
export function checkContamination(agentName, replyText) {
  try {
    if (!fs.existsSync(MESSAGE_STORE_PATH)) return { contaminated: false };
    const lines = fs.readFileSync(MESSAGE_STORE_PATH, 'utf8').trim().split('\n');

    // Check last 50 messages (don't scan the entire history every time)
    const recent = lines.slice(-50);
    const replyNorm = replyText.toLowerCase().replace(/\s+/g, ' ').trim();

    for (const line of recent) {
      try {
        const record = JSON.parse(line);
        if (record.agent === agentName) continue; // Own messages are fine

        const storedNorm = record.content.toLowerCase().replace(/\s+/g, ' ').trim();

        // Check for substantial overlap (200+ char substring match)
        if (replyNorm.length > 200 && storedNorm.length > 200) {
          const chunk = storedNorm.slice(0, 250);
          if (replyNorm.includes(chunk)) {
            return { contaminated: true, matchedAgent: record.agent, matchedHash: record.hash };
          }
        }
      } catch { continue; }
    }
  } catch { /* ignore */ }

  return { contaminated: false };
}
