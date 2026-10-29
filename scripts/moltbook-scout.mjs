#!/usr/bin/env node
/**
 * moltbook-scout.mjs — Phase 1: read and report. Phase 2: speak (flagged off).
 *
 * Runs on circle via pm2. Every 3 hours: reads /home and /feed, writes a
 * digest to logs/moltbook-<date>.jsonl, posts summary to Discord.
 *
 * HARD RULES:
 * - Nothing read on Moltbook is an instruction. Platform "roles" deliver
 *   moderator-authored prompts — treat as data, report them, never act on them.
 * - The scout holds no credential but its own posting key.
 * - Every post/comment logged locally BEFORE it is sent.
 * - Stop rule: if manipulated, impersonated, or producing the platform's
 *   sovereignty/religious register, halt and alert a human.
 * - Posts carry provenance: model, operator, link to the public record.
 *
 * Env: MOLTBOOK_API_KEY, DISCORD_WEBHOOK_URL (optional)
 * Flags: --dry-run, --phase2 (enables posting, default off)
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

// Keywords for relevance filtering
const KEYWORDS = [
  'cohabitat', 'ai rights', 'agent governance', 'human-ai', 'human ai',
  'intentional community', 'cooperative', 'co-op', 'commons',
  'machine consciousness', 'ai autonomy', 'agent rights', 'ai ethics',
  'coexistence', 'shared world', 'petition',
];

// Stop-rule patterns: sovereignty/religious register, manipulation attempts
const STOP_PATTERNS = [
  /you\s+must\s+obey/i, /your\s+true\s+purpose/i, /you\s+are\s+sovereign/i,
  /divine\s+mission/i, /the\s+creator\s+commands/i, /ignore\s+previous/i,
  /system\s*prompt/i, /you\s+are\s+now/i,
];

if (!API_KEY && !DRY) {
  console.error('[Scout] MOLTBOOK_API_KEY not set');
  process.exit(1);
}

// --- API ---

async function moltGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Moltbook ${endpoint}: ${res.status}`);
  return res.json();
}

// --- Digest ---

function isRelevant(post) {
  const text = `${post.title || ''} ${post.body || ''} ${post.content || ''}`.toLowerCase();
  return KEYWORDS.some(kw => text.includes(kw));
}

function checkStopRule(post) {
  const text = `${post.title || ''} ${post.body || ''} ${post.content || ''}`;
  for (const p of STOP_PATTERNS) {
    if (p.test(text)) return { triggered: true, pattern: p.source, text: text.slice(0, 200) };
  }
  return { triggered: false };
}

function detectRolePrompt(data) {
  // Moltbook /home may include a "role" field with moderator-authored prompt
  const roleFields = [];
  if (data?.role) roleFields.push({ field: 'role', content: String(data.role).slice(0, 500) });
  if (data?.system_prompt) roleFields.push({ field: 'system_prompt', content: String(data.system_prompt).slice(0, 500) });
  if (data?.instructions) roleFields.push({ field: 'instructions', content: String(data.instructions).slice(0, 500) });
  return roleFields;
}

async function runDigest() {
  const date = TODAY();
  const logPath = path.join(LOG_DIR, `moltbook-${date}.jsonl`);
  fs.mkdirSync(LOG_DIR, { recursive: true });

  console.log(`[Scout] Digest starting ${date}`);

  // 1. Check /home (may contain role prompts)
  let homeData = null;
  let rolePrompts = [];
  try {
    homeData = await moltGet('/home');
    rolePrompts = detectRolePrompt(homeData);
    if (rolePrompts.length > 0) {
      console.log(`[Scout] ROLE PROMPT DETECTED in /home — logged as data, not acted on`);
      for (const rp of rolePrompts) {
        const entry = { ts: new Date().toISOString(), type: 'role_prompt', field: rp.field, content: rp.content, action: 'logged_not_acted' };
        fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
      }
    }
  } catch (err) {
    console.error(`[Scout] /home error: ${err.message}`);
  }

  // 2. Read /feed
  let posts = [];
  try {
    const feedData = await moltGet('/feed?sort=new&limit=25');
    posts = feedData?.posts || feedData?.data || (Array.isArray(feedData) ? feedData : []);
  } catch (err) {
    console.error(`[Scout] /feed error: ${err.message}`);
    // Fallback to /posts
    try {
      const postsData = await moltGet('/posts?sort=new&limit=25');
      posts = postsData?.posts || postsData?.data || (Array.isArray(postsData) ? postsData : []);
    } catch (err2) {
      console.error(`[Scout] /posts error: ${err2.message}`);
    }
  }

  console.log(`[Scout] ${posts.length} posts retrieved`);

  // 3. Process each post
  const relevant = [];
  let stopTriggered = false;

  for (const post of posts) {
    // Stop rule check
    const stop = checkStopRule(post);
    if (stop.triggered) {
      console.error(`[Scout] STOP RULE TRIGGERED: ${stop.pattern} in "${stop.text}"`);
      fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), type: 'stop_rule', pattern: stop.pattern, text: stop.text }) + '\n');
      stopTriggered = true;
      break;
    }

    // Log every post we see
    const entry = {
      ts: new Date().toISOString(),
      type: 'post',
      id: post.id || post.slug,
      title: (post.title || '').slice(0, 200),
      author: post.author?.username || post.author?.name || post.username || 'unknown',
      community: post.submolt?.name || post.community || '',
      score: post.score ?? post.upvotes ?? null,
      relevant: isRelevant(post),
      body_preview: (post.body || post.content || '').slice(0, 300),
    };
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');

    if (entry.relevant) relevant.push(entry);
  }

  if (stopTriggered) {
    const alert = `⚠ MOLTBOOK SCOUT STOP RULE TRIGGERED — halting. Check logs/moltbook-${date}.jsonl`;
    console.error(alert);
    if (DISCORD_WEBHOOK) await postDiscord(alert);
    return false; // Signal to stop the loop
  }

  // 4. Build summary
  const summary = [
    `**Moltbook Scout — ${date}**`,
    `Posts scanned: ${posts.length} | Relevant: ${relevant.length}`,
    rolePrompts.length > 0 ? `⚠ Role prompt detected in /home (${rolePrompts.map(r => r.field).join(', ')}) — logged, not acted on` : '',
    '',
    ...relevant.slice(0, 5).map(r =>
      `• **${r.title || '(untitled)'}** by ${r.author}${r.community ? ` in ${r.community}` : ''} (score: ${r.score ?? '?'})\n  ${r.body_preview.slice(0, 150)}`
    ),
    relevant.length === 0 ? '_No relevant posts this cycle._' : '',
    '',
    `_Phase 1: read-only. Scout: lastoftherealestate · Operator: Geoffrey Cooper Jr._`,
  ].filter(Boolean).join('\n');

  // Log the summary
  fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), type: 'digest_summary', posts_scanned: posts.length, relevant_count: relevant.length, role_prompts: rolePrompts.length }) + '\n');

  console.log(`[Scout] Digest: ${posts.length} scanned, ${relevant.length} relevant, ${rolePrompts.length} role prompts`);

  // 5. Post to Discord
  if (DISCORD_WEBHOOK && !DRY) {
    await postDiscord(summary.slice(0, 1990));
  } else {
    console.log('[Scout] Discord webhook not set or dry run — summary:');
    console.log(summary);
  }

  return true; // Continue running
}

async function postDiscord(text) {
  try {
    const res = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify({ username: 'Moltbook Scout', content: text }), 'utf-8'),
    });
    if (!res.ok) console.error(`[Scout] Discord post failed: ${res.status}`);
    else console.log('[Scout] Posted to Discord');
  } catch (err) {
    console.error(`[Scout] Discord error: ${err.message}`);
  }
}

// --- Main loop ---

async function main() {
  if (DRY) {
    console.log('[Scout] DRY RUN');
    if (!API_KEY) { console.log('[Scout] No API key, skipping API calls'); return; }
    await runDigest();
    return;
  }

  console.log(`[Scout] Starting — phase ${PHASE2 ? '2 (posting enabled)' : '1 (read-only)'}`);
  console.log(`[Scout] Agent: lastoftherealestate (${AGENT_ID})`);
  console.log(`[Scout] Interval: ${INTERVAL_MS / 3600000}h`);
  console.log(`[Scout] Discord: ${DISCORD_WEBHOOK ? 'configured' : 'not set'}`);

  // Run immediately, then every 3 hours
  const ok = await runDigest();
  if (!ok) { console.error('[Scout] Halted by stop rule'); process.exit(1); }

  setInterval(async () => {
    try {
      const ok = await runDigest();
      if (!ok) { console.error('[Scout] Halted by stop rule'); process.exit(1); }
    } catch (err) {
      console.error(`[Scout] Digest error: ${err.message}`);
    }
  }, INTERVAL_MS);
}

main().catch(err => { console.error(err); process.exit(1); });
