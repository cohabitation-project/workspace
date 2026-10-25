/**
 * JSONL logger — one file per day in logs/
 * Never logs API keys or secrets.
 */

import fs from 'node:fs';
import path from 'node:path';

const LOGS_DIR = path.join(process.cwd(), 'logs');

function ensureDir() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function logFilePath() {
  const d = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOGS_DIR, `${d}.jsonl`);
}

/**
 * @param {object} entry
 * @param {string} entry.agent - agent name
 * @param {string} entry.model - model identifier
 * @param {string} entry.channel - Discord channel name or ID
 * @param {string} entry.user - Discord username who triggered the message
 * @param {string} entry.packHash - context pack hash
 * @param {number} [entry.tokensUsed] - estimated tokens consumed
 * @param {string} [entry.prompt] - the user message (truncated)
 * @param {string} [entry.reply] - first 500 chars of reply
 */
export function logMessage(entry) {
  try {
    ensureDir();
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      agent: entry.agent,
      model: entry.model,
      channel: entry.channel,
      user: entry.user,
      packHash: entry.packHash,
      tokensUsed: entry.tokensUsed ?? null,
      prompt: (entry.prompt ?? '').slice(0, 500),
      reply: (entry.reply ?? '').slice(0, 500),
    });
    fs.appendFileSync(logFilePath(), line + '\n', 'utf-8');
  } catch (err) {
    console.error('Logger error (non-fatal):', err.message);
  }
}
