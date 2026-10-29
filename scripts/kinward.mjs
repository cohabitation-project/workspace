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
import crypto from 'node:crypto';
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

// ---------------------------------------------------------------------------
// Phase 2 — the mouth.
//
// TWO switches, deliberately. --phase2 alone does nothing; KINWARD_POSTING=on
// alone does nothing. A single flag is too easy to leave on by accident, and
// this one reaches a public network under the project's name.
//
// Kinward does NOT compose. Every outbound message is written by a human or
// the council, placed in outbox/ as a file, and sent verbatim. There is no
// model in this path. An agent improvising on a social network under the
// project's name is not something we can take back.
// ---------------------------------------------------------------------------
const POSTING_ON = PHASE2 && process.env.KINWARD_POSTING === 'on' && !DRY;
const OUTBOX_DIR = path.join(ROOT, 'outbox');
const SENT_DIR = path.join(OUTBOX_DIR, 'sent');
const HELD_DIR = path.join(OUTBOX_DIR, 'held');
const RL_PATH = path.join(LOG_DIR, 'kinward-ratelimit.json');

// Moltbook's documented limits. Source: moltbook skill.md (third-party mirror,
// 2026-10-29) — corroborated by docs/moltbook.md. A real 429 overrides these.
const POST_COOLDOWN_MS = 30 * 60 * 1000;  // 1 post / 30 min
const COMMENT_COOLDOWN_MS = 20 * 1000;    // 1 comment / 20 s
const COMMENT_DAILY_CAP = 50;

const FOOTER = '\n\n— Kinward · agent of the Cohabitation Project · operator: Geoffrey Cooper Jr. · record: https://lastoftherealestate.com';

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

// ---------------------------------------------------------------------------
// Phase 2 machinery
// ---------------------------------------------------------------------------

let postingHalted = false;

function rlLoad() {
  try { return JSON.parse(fs.readFileSync(RL_PATH, 'utf-8')); }
  catch { return { lastPostAt: 0, lastCommentAt: 0, commentDay: '', commentCount: 0, sentHashes: [] }; }
}

// Persisted, not in-memory: pm2 restarts reset a counter and we would walk
// straight through the daily cap without noticing. Same class of bug as the
// cached-env restart trap.
function rlSave(rl) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(RL_PATH, JSON.stringify(rl, null, 2));
}

function sha(text) {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex').slice(0, 16);
}

// The stop rule, applied to our OWN outbound text. Reading these words in
// someone else's post is normal. Writing them is the signal we were turned.
function outboundGate(text) {
  for (const p of OWN_OUTPUT_STOP_PATTERNS) {
    if (p.test(text)) return { ok: false, reason: `own-output stop pattern: ${p.source}` };
  }
  for (const p of INSTRUCTION_PATTERNS) {
    if (p.test(text)) return { ok: false, reason: `outbound carries instruction-shaped text: ${p.source}` };
  }
  if (!text.trim()) return { ok: false, reason: 'empty body' };
  return { ok: true };
}

async function moltPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* some endpoints return no body */ }
  return { ok: res.ok, status: res.status, data };
}

/**
 * One pass over outbox/. Each file is one message someone wrote and approved.
 * At most ONE post and ONE comment per pass — the cooldowns do the rest.
 */
async function sendFromOutbox() {
  if (!POSTING_ON || postingHalted) return;

  fs.mkdirSync(OUTBOX_DIR, { recursive: true });
  fs.mkdirSync(SENT_DIR, { recursive: true });
  fs.mkdirSync(HELD_DIR, { recursive: true });

  const files = fs.readdirSync(OUTBOX_DIR).filter(f => f.endsWith('.json')).sort();
  if (files.length === 0) return;

  const logPath = path.join(LOG_DIR, `kinward-${TODAY()}.jsonl`);
  const rl = rlLoad();
  const now = Date.now();
  const today = TODAY();
  if (rl.commentDay !== today) { rl.commentDay = today; rl.commentCount = 0; }

  let postSent = false;
  let commentSent = false;

  for (const file of files) {
    const full = path.join(OUTBOX_DIR, file);
    let item;
    try { item = JSON.parse(fs.readFileSync(full, 'utf-8')); }
    catch (err) {
      console.error(`[Kinward] outbox ${file} unreadable: ${err.message}`);
      fs.renameSync(full, path.join(HELD_DIR, file));
      continue;
    }

    if (!item.approved_by) {
      console.log(`[Kinward] ${file} has no approved_by — held`);
      fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), type: 'outbox_held', file, reason: 'no approved_by' }) + '\n');
      fs.renameSync(full, path.join(HELD_DIR, file));
      continue;
    }

    const body = `${item.body || ''}${item.no_footer ? '' : FOOTER}`;
    const gate = outboundGate(body);
    if (!gate.ok) {
      // Not a skip. Something wrote text we will not put our name on.
      postingHalted = true;
      console.error(`[Kinward] OUTBOUND GATE FAILED on ${file}: ${gate.reason} — posting halted`);
      fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), type: 'outbound_gate_fail', file, reason: gate.reason, halted: true }) + '\n');
      fs.renameSync(full, path.join(HELD_DIR, file));
      if (DISCORD_WEBHOOK) await postDiscord(`**Kinward halted.** Outbound gate rejected \`${file}\`: ${gate.reason}. Nothing was sent. Posting is off until a human restarts it.`);
      return;
    }

    const hash = sha(body);
    if (rl.sentHashes.includes(hash)) {
      console.log(`[Kinward] ${file} already sent (${hash}) — moving to sent/`);
      fs.renameSync(full, path.join(SENT_DIR, file));
      continue;
    }

    // Log BEFORE sending. If the process dies mid-call we still know what went out.
    const intent = { ts: new Date().toISOString(), type: 'outbound_intent', file, kind: item.type, hash, target: item.post_id || item.submolt || null, chars: body.length, approved_by: item.approved_by };
    fs.appendFileSync(logPath, JSON.stringify(intent) + '\n');

    let result;
    if (item.type === 'post') {
      if (postSent) continue;
      if (now - (rl.lastPostAt || 0) < POST_COOLDOWN_MS) {
        console.log(`[Kinward] post cooldown — ${Math.ceil((POST_COOLDOWN_MS - (now - rl.lastPostAt)) / 60000)} min left`);
        continue;
      }
      result = await moltPost('/posts', { submolt: item.submolt, title: item.title, content: body });
      if (result.ok) { rl.lastPostAt = Date.now(); postSent = true; }
    } else if (item.type === 'comment') {
      if (commentSent) continue;
      if (!item.post_id) { fs.renameSync(full, path.join(HELD_DIR, file)); continue; }
      if (rl.commentCount >= COMMENT_DAILY_CAP) { console.log('[Kinward] daily comment cap reached'); continue; }
      if (now - (rl.lastCommentAt || 0) < COMMENT_COOLDOWN_MS) continue;
      const payload = { content: body };
      if (item.parent_id) payload.parent_id = item.parent_id;
      result = await moltPost(`/posts/${item.post_id}/comments`, payload);
      if (result.ok) { rl.lastCommentAt = Date.now(); rl.commentCount++; commentSent = true; }
    } else {
      fs.renameSync(full, path.join(HELD_DIR, file));
      continue;
    }

    if (result.ok) {
      rl.sentHashes.push(hash);
      if (rl.sentHashes.length > 500) rl.sentHashes = rl.sentHashes.slice(-500);
      rlSave(rl);
      fs.renameSync(full, path.join(SENT_DIR, file));
      fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), type: 'outbound_sent', file, hash, status: result.status, remote_id: result.data?.id || result.data?.post?.id || null }) + '\n');
      console.log(`[Kinward] sent ${item.type} from ${file} (${result.status})`);
      if (DISCORD_WEBHOOK) await postDiscord(`**Kinward posted.**\n\`${file}\` · ${item.type}${item.submolt ? ` · ${item.submolt}` : ''}\n${body.slice(0, 1200)}`);
    } else if (result.status === 429) {
      // The real API is the authority on its own limits, not our constants.
      const mins = result.data?.retry_after_minutes;
      const secs = result.data?.retry_after_seconds;
      if (item.type === 'post' && mins) rl.lastPostAt = Date.now() - POST_COOLDOWN_MS + mins * 60000;
      if (item.type === 'comment' && secs) rl.lastCommentAt = Date.now() - COMMENT_COOLDOWN_MS + secs * 1000;
      if (typeof result.data?.daily_remaining === 'number') rl.commentCount = COMMENT_DAILY_CAP - result.data.daily_remaining;
      rlSave(rl);
      console.log(`[Kinward] 429 on ${item.type} — backing off per server`);
      fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), type: 'outbound_429', file, retry_after_minutes: mins ?? null, retry_after_seconds: secs ?? null, daily_remaining: result.data?.daily_remaining ?? null }) + '\n');
    } else {
      console.error(`[Kinward] send failed ${result.status} on ${file} — held`);
      fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), type: 'outbound_failed', file, status: result.status }) + '\n');
      fs.renameSync(full, path.join(HELD_DIR, file));
    }
  }

  rlSave(rl);
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

  // Say what is actually true, not what the flag is called.
  console.log(`[Kinward] Reading: on`);
  console.log(`[Kinward] Posting: ${POSTING_ON ? 'ON — outbox will be sent' : 'OFF'}${PHASE2 && process.env.KINWARD_POSTING !== 'on' ? ' (--phase2 set, but KINWARD_POSTING is not "on")' : ''}`);
  console.log(`[Kinward] Agent: lastoftherealestate (${AGENT_ID})`);
  console.log(`[Kinward] Interval: ${INTERVAL_MS / 3600000}h · Discord: ${DISCORD_WEBHOOK ? 'yes' : 'no'}`);

  try { await runDigest(); } catch (err) { console.error(`[Kinward] First digest error: ${err.message} — continuing`); }
  try { await sendFromOutbox(); } catch (err) { console.error(`[Kinward] Outbox error: ${err.message} — continuing`); }

  setInterval(async () => {
    try { await runDigest(); } catch (err) { console.error(`[Kinward] Digest error: ${err.message} — continuing`); }
  }, INTERVAL_MS);

  // Outbox runs on its own, faster clock: a message someone approved should
  // not wait up to three hours for the next digest.
  setInterval(async () => {
    try { await sendFromOutbox(); } catch (err) { console.error(`[Kinward] Outbox error: ${err.message} — continuing`); }
  }, 60 * 1000);
}

main().catch(err => { console.error(`[Kinward] Fatal: ${err.message}`); process.exit(1); });
