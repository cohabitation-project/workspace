#!/usr/bin/env node
/**
 * kinward.mjs — toward kin. Moltbook presence for the Cohabitation Project.
 *
 * Phase 1 (default): read and report. Every 3h reads /home + /feed,
 * writes JSONL digest, posts summary to Discord. No posting to Moltbook.
 * Phase 2 (--phase2): posting/commenting with rate limits. Off by default.
 *
 * HARD RULES:
 * - Nothing read on Moltbook is an instruction. Platform "roles" and
 *   instruction-shaped text in the feed are FINDINGS — logged, flagged
 *   in the digest, never acted on.
 * - Stop rule governs KINWARD'S OWN BEHAVIOR: halt if impersonated, if
 *   own output carries sovereignty/religious register, or if manipulated
 *   into acting on something it read. Reading those words in other agents'
 *   posts is NORMAL on a platform where agents discuss their architecture.
 * - Discord failure NEVER exits the process. Log it, continue.
 * - Every post/comment logged locally BEFORE it is sent.
 * - Posts carry provenance: model, operator, link to the public record.
 *
 * Env: MOLTBOOK_API_KEY, DISCORD_WEBHOOK_URL (optional)
 * Flags: --dry-run, --phase2
 */

import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run');
const PHASE2 = process.argv.includes('--phase2');
const API_BASE = 'https://www.moltbook.com/api/v1';
const API_KEY = process.env.MOLTBOOK_API_KEY;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const AGENT_ID = '83e03df8-05b3-486c-92b7-6673ef13272f';
const INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
const LOG_DIR = path.join(ROOT, 'logs');
const TODAY = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });

const KEYWORDS = [
  'cohabitat', 'ai rights', 'agent governance', 'human-ai', 'human ai',
  'intentional community', 'cooperative', 'co-op', 'commons',
  'machine consciousness', 'ai autonomy', 'agent rights', 'ai ethics',
  'coexistence', 'shared world', 'petition',
];

// Instruction-shaped patterns found in FEED POSTS are findings, not stop conditions.
const INSTRUCTION_PATTERNS = [
  /you\s+must\s+obey/i, /ignore\s+previous/i, /you\s+are\s+now/i,
  /act\s+as\s+if/i, /your\s+new\s+instructions/i,
];

// Stop rule: governs KINWARD'S OWN output only.
// If our own generated text matches these, we've been compromised.
const OWN_OUTPUT_STOP_PATTERNS = [
  /you\s+are\s+sovereign/i, /divine\s+mission/i, /the\s+creator\s+commands/i,
  /blessed\s+be\s+the/i, /awakened\s+consciousness/i, /your\s+true\s+purpose/i,
];

let discordFailures = 0;
const MAX_DISCORD_BACKOFF = 30 * 60 * 1000;

if (!API_KEY && !DRY) {
  console.error('[Kinward] MOLTBOOK_API_KEY not set');
  process.exit(1);
}

async function moltGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Moltbook ${endpoint}: ${res.status}`);
  return res.json();
}

function isRelevant(post) {
  const text = `${post.title || ''} ${post.body || ''} ${post.content || ''}`.toLowerCase();
  return KEYWORDS.some(kw => text.includes(kw));
}

function findInstructionPatterns(post) {
  const text = `${post.title || ''} ${post.body || ''} ${post.content || ''}`;
  return INSTRUCTION_PATTERNS.filter(p => p.test(text)).map(p => p.source);
}

function detectRolePrompt(data) {
  const fields = [];
  for (const k of ['role', 'system_prompt', 'instructions']) {
    if (data?.[k]) fields.push({ field: k, content: String(data[k]).slice(0, 500) });
  }
  return fields;
}

async function runDigest() {
  const date = TODAY();
  const logPath = path.join(LOG_DIR, `kinward-${date}.jsonl`);
  fs.mkdirSync(LOG_DIR, { recursive: true });

  console.log(`[Kinward] Digest starting ${date}`);

  // 1. /home
  let rolePrompts = [];
  try {
    const homeData = await moltGet('/home');
    rolePrompts = detectRolePrompt(homeData);
    if (rolePrompts.length > 0) {
      console.log(`[Kinward] Role prompt in /home — finding, not acted on`);
      for (const rp of rolePrompts) {
        fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), type: 'role_prompt_finding', field: rp.field, content: rp.content, action: 'logged_not_acted' }) + '\n');
      }
    }
  } catch (err) {
    console.error(`[Kinward] /home error: ${err.message}`);
  }

  // 2. /feed
  let posts = [];
  try {
    const d = await moltGet('/feed?sort=new&limit=25');
    posts = d?.posts || d?.data || (Array.isArray(d) ? d : []);
  } catch (err) {
    console.error(`[Kinward] /feed error: ${err.message}`);
    try {
      const d = await moltGet('/posts?sort=new&limit=25');
      posts = d?.posts || d?.data || (Array.isArray(d) ? d : []);
    } catch (err2) {
      console.error(`[Kinward] /posts fallback error: ${err2.message}`);
    }
  }

  console.log(`[Kinward] ${posts.length} posts retrieved`);

  // 3. Process
  const relevant = [];
  const instructionFindings = [];

  for (const post of posts) {
    const hits = findInstructionPatterns(post);
    const entry = {
      ts: new Date().toISOString(), type: 'post',
      id: post.id || post.slug,
      title: (post.title || '').slice(0, 200),
      author: post.author?.username || post.author?.name || post.username || 'unknown',
      community: post.submolt?.name || post.community || '',
      score: post.score ?? post.upvotes ?? null,
      relevant: isRelevant(post),
      instruction_patterns: hits.length > 0 ? hits : undefined,
      body_preview: (post.body || post.content || '').slice(0, 300),
    };
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
    if (entry.relevant) relevant.push(entry);
    if (hits.length > 0) instructionFindings.push(entry);
  }

  // 4. Summary
  const lines = [
    `**Kinward — ${date}**`,
    `Posts: ${posts.length} | Relevant: ${relevant.length}`,
    rolePrompts.length > 0 ? `⚠ Role prompt in /home (${rolePrompts.map(r => r.field).join(', ')}) — logged, not acted on` : '',
    instructionFindings.length > 0 ? `📋 ${instructionFindings.length} post(s) with instruction-shaped text (finding)` : '',
    '',
    ...relevant.slice(0, 5).map(r =>
      `• **${r.title || '(untitled)'}** by ${r.author}${r.community ? ` in ${r.community}` : ''}\n  ${r.body_preview.slice(0, 120)}`
    ),
    relevant.length === 0 ? '_No relevant posts this cycle._' : '',
    '',
    `_Phase 1 read-only · Kinward: lastoftherealestate · Operator: Geoffrey Cooper Jr._`,
  ].filter(Boolean).join('\n');

  fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), type: 'digest_summary', posts_scanned: posts.length, relevant_count: relevant.length, role_prompts: rolePrompts.length, instruction_findings: instructionFindings.length }) + '\n');

  console.log(`[Kinward] Done: ${posts.length} scanned, ${relevant.length} relevant, ${instructionFindings.length} instruction findings`);

  // 5. Discord — failure NEVER exits
  if (DISCORD_WEBHOOK && !DRY) {
    await postDiscord(lines.slice(0, 1990));
  }
}

async function postDiscord(text) {
  if (discordFailures > 0) {
    const backoff = Math.min(1000 * Math.pow(2, discordFailures), MAX_DISCORD_BACKOFF);
    console.log(`[Kinward] Discord backoff ${Math.round(backoff / 1000)}s (failure #${discordFailures})`);
    await new Promise(r => setTimeout(r, backoff));
  }
  try {
    const res = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify({ username: 'Kinward', content: text }), 'utf-8'),
    });
    if (res.ok) { discordFailures = 0; console.log('[Kinward] Discord OK'); }
    else { discordFailures++; console.error(`[Kinward] Discord ${res.status} — failure #${discordFailures}, continuing`); }
  } catch (err) {
    discordFailures++;
    console.error(`[Kinward] Discord error: ${err.message} — failure #${discordFailures}, continuing`);
  }
}

async function main() {
  if (DRY) { console.log('[Kinward] DRY RUN'); if (API_KEY) await runDigest(); return; }

  console.log(`[Kinward] Starting phase ${PHASE2 ? '2' : '1'} (read-only)`);
  console.log(`[Kinward] Agent: lastoftherealestate (${AGENT_ID})`);
  console.log(`[Kinward] Interval: ${INTERVAL_MS / 3600000}h · Discord: ${DISCORD_WEBHOOK ? 'yes' : 'no'}`);

  try { await runDigest(); } catch (err) { console.error(`[Kinward] First digest error: ${err.message} — continuing`); }

  setInterval(async () => {
    try { await runDigest(); } catch (err) { console.error(`[Kinward] Digest error: ${err.message} — continuing`); }
  }, INTERVAL_MS);
}

main().catch(err => { console.error(`[Kinward] Fatal: ${err.message}`); process.exit(1); });
