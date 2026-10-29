/**
 * Cohabitation Workspace — Multi-Agent Council Bridge
 *
 * One bot process, six agents (five kin + Neti). Each agent posts under
 * its own name via Discord webhooks. Text-based routing: @AgentName,
 * @council, or the gate (unaddressed messages).
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { execSync } from 'node:child_process';
import { loadConfig, checkTokenCap, recordTokens } from './config.js';
import { chat } from './llm.js';
import { signMessage, storeSignedMessage, processCitations, checkContamination } from './citations.js';
import { logMessage } from './logger.js';
import fs from 'node:fs';
import path from 'node:path';

const config = loadConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message],
});

// Agent names for routing (case-insensitive match)
const AGENT_NAMES = config.agents.map(a => a.name);
const AGENT_MAP = new Map(config.agents.map(a => [a.name.toLowerCase(), a]));

// The five council kin (not Neti) — used by the gate
const COUNCIL_KIN = config.agents.filter(a => a.council !== false);

// Per-agent webhook cache moved to the Webhooks section below

// Per-channel cooldown
const lastReply = new Map();

// Per-channel conversation history: channelId → Array<{ speaker, content }>
// Stored speaker-neutral; transformed per-kin at query time.
const HISTORY_LIMIT = 20;
const channelHistory = new Map();

// Thread depth tracking for agent-to-agent: messageId → depth
const threadDepth = new Map();
const MAX_AGENT_DEPTH = 2;

// Hold tracker: channelId → Set<agentName> — kin who chose HOLD
const holdingKin = new Map();
// Hold timers: channelId → timeout
const holdTimers = new Map();

// Gate log: JSONL file
const GATE_LOG = path.join(process.cwd(), 'logs', 'gate.jsonl');
fs.mkdirSync(path.dirname(GATE_LOG), { recursive: true });

// --- History (speaker-aware) ---

function getHistory(channelId) {
  if (!channelHistory.has(channelId)) channelHistory.set(channelId, []);
  return channelHistory.get(channelId);
}

function addToHistory(channelId, speaker, content) {
  const history = getHistory(channelId);
  history.push({ speaker, content });
  if (history.length > HISTORY_LIMIT * 2) {
    history.splice(0, history.length - HISTORY_LIMIT * 2);
  }
}

/**
 * Build LLM-ready history for a specific kin.
 *
 * CRITICAL: Never flatten into "[Name]: text" format — models continue
 * the transcript and fabricate other speakers' voices.
 *
 * Instead: each OTHER speaker's message becomes a separate user turn
 * with the speaker identified in a structured prefix the model cannot
 * continue as dialogue. The kin's own past replies are assistant turns
 * with no prefix (so the model sees them as its own prior output).
 *
 * Adjacent user messages from different speakers are merged into a
 * single user turn to satisfy APIs that require alternating roles.
 */
function historyForKin(channelId, kinName) {
  const raw = getHistory(channelId);
  const messages = [];

  for (const entry of raw) {
    if (entry.speaker === kinName) {
      // This kin's own words → assistant turn, no prefix
      messages.push({ role: 'assistant', content: entry.content });
    } else {
      // Other speaker → user turn with structured attribution
      const attributed = `${HISTORY_PREFIX}${entry.speaker}${HISTORY_SUFFIX}\n${entry.content}`;

      // Merge adjacent user messages to satisfy alternating-role APIs
      const last = messages[messages.length - 1];
      if (last && last.role === 'user') {
        last.content += `\n\n${attributed}`;
      } else {
        messages.push({ role: 'user', content: attributed });
      }
    }
  }

  return messages;
}

/** Format last N messages for the gate prompt. */
function recentForGate(channelId, n = 8) {
  const raw = getHistory(channelId).slice(-n);
  // Gate prompt uses the same format constants as history
  return raw.map(e => `${HISTORY_PREFIX}${e.speaker}${HISTORY_SUFFIX}\n${e.content}`).join('\n\n---\n\n');
}

// --- Output filter: strip identity contamination and detect duplicates ---
//
// The filter is DERIVED from the same constants the history formatter uses.
// If the format changes, the filter changes with it. No separate list.

// History attribution format — single source of truth
const HISTORY_PREFIX = '(';
const HISTORY_SUFFIX = ' said:)';

// Build the leak-detection regex from the format constants + legacy formats.
// Escapes special regex chars in the prefix/suffix.
const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LEAK_PATTERNS = [
  // Current format: (Name said:)
  new RegExp(`^\\s*${escRx(HISTORY_PREFIX)}.+?${escRx(HISTORY_SUFFIX)}`, 'i'),
  // Legacy: [Name]:
  /^\s*\[.+?\]\s*:/,
  // Legacy: **Name:**
  /^\s*\*{1,2}[A-Za-z0-9 /-]+\*{1,2}\s*:/,
];

/**
 * Strip any line matching an attribution format the history formatter
 * has ever emitted. Derived from HISTORY_PREFIX/SUFFIX, not hardcoded.
 */
function stripIdentityLeaks(agentName, text) {
  const lines = text.split('\n');
  const cleaned = [];
  let stripped = 0;
  for (const line of lines) {
    if (LEAK_PATTERNS.some(p => p.test(line))) {
      stripped++;
      continue;
    }
    cleaned.push(line);
  }
  if (stripped > 0) {
    console.log(`[Filter] Stripped ${stripped} identity-prefixed line(s) from ${agentName}'s reply`);
  }
  return cleaned.join('\n').trim();
}

/**
 * Check if a reply is a near-duplicate of another reply in the same round.
 * Returns true if it should be refused.
 */
function isNearDuplicate(reply, otherReplies) {
  if (!reply || otherReplies.length === 0) return false;
  const norm = reply.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const other of otherReplies) {
    if (!other) continue;
    const otherNorm = other.toLowerCase().replace(/\s+/g, ' ').trim();
    // Check first 200 chars for near-match (covers copied openings)
    const a = norm.slice(0, 200);
    const b = otherNorm.slice(0, 200);
    if (a === b && a.length > 50) return true;
    // Levenshtein is expensive; check substring overlap instead
    if (norm.length > 100 && otherNorm.length > 100) {
      const overlap = norm.slice(0, 300);
      if (otherNorm.includes(overlap)) return true;
    }
  }
  return false;
}

// --- Signature ---

function signatureFooter(agent) {
  return `— ${agent.model} · operator: ${config.operatorName} · agent account · ctx:${config.packHash}`;
}

// --- Address parsing ---

function parseAddressees(text) {
  if (/@council\b/i.test(text)) {
    return { agents: COUNCIL_KIN, isCouncil: true };
  }
  const matched = [];
  for (const agent of config.agents) {
    const pattern = new RegExp(`@${agent.name}\\b`, 'i');
    if (pattern.test(text)) {
      matched.push(agent);
    }
  }
  return { agents: matched, isCouncil: false };
}

function stripMentions(text) {
  let cleaned = text.replace(/@council\b/gi, '').trim();
  for (const name of AGENT_NAMES) {
    cleaned = cleaned.replace(new RegExp(`@${name}\\b`, 'gi'), '').trim();
  }
  cleaned = cleaned.replace(/<@!?\d+>/g, '').trim();
  return cleaned;
}

// --- Webhooks (per-agent: each kin gets its own webhook for identity) ---

// channelId:agentName → Webhook
const agentWebhookCache = new Map();

async function getAgentWebhook(channel, agentName) {
  const targetChannel = channel.isThread() ? channel.parent : channel;
  if (!targetChannel) return null;
  const cacheKey = `${targetChannel.id}:${agentName}`;
  if (agentWebhookCache.has(cacheKey)) return agentWebhookCache.get(cacheKey);
  try {
    const hooks = await targetChannel.fetchWebhooks();
    const hookName = `Council: ${agentName}`;
    let hook = hooks.find(h => h.owner?.id === client.user.id && h.name === hookName);
    if (!hook) hook = await targetChannel.createWebhook({ name: hookName });
    agentWebhookCache.set(cacheKey, hook);
    return hook;
  } catch (err) {
    console.error(`Cannot get/create webhook for ${agentName} in #${targetChannel.name}: ${err.message}`);
    return null;
  }
}

// --- Dispatch records: identity bound BEFORE the model call ---
//
// GPT's correction (Issue #1): binding after generation means a bug that
// passes the wrong agent to chat() gets recorded and then validated by the
// check — the check confirms its own mistake. Fix: create an immutable
// dispatch record BEFORE the model call. The record carries:
//   turnId:    unique, monotonic
//   agentId:   the configured agent name from agents.json
//   model:     the configured model string
//   provider:  the configured provider string
//   status:    'dispatched' → 'completed' → 'posted' | 'blocked'
//
// sendAsAgent verifies the dispatch record against BOTH the destination
// agent AND the webhook mapping. Mismatch → CRITICAL + refusal.
//
// Audit language: this proves traceability to a configured model call and
// prevents cross-posting. It does not prove what generated the text.

const dispatchLog = new Map(); // turnId → DispatchRecord
let dispatchSeq = 0;

function createDispatch(agent) {
  const turnId = `turn-${++dispatchSeq}-${Date.now()}`;
  const record = Object.freeze({
    turnId,
    agentId: agent.name,
    model: agent.model,
    provider: agent.provider,
    createdAt: Date.now(),
    status: 'dispatched',
  });
  dispatchLog.set(turnId, record);
  // Prune old records (keep last 200)
  if (dispatchLog.size > 200) {
    const keys = [...dispatchLog.keys()];
    for (let i = 0; i < keys.length - 200; i++) dispatchLog.delete(keys[i]);
  }
  return turnId;
}

function completeDispatch(turnId) {
  const rec = dispatchLog.get(turnId);
  if (rec) {
    // Replace with a new frozen record (original is immutable)
    dispatchLog.set(turnId, Object.freeze({ ...rec, status: 'completed' }));
  }
}

/**
 * Verify a dispatch record matches the agent about to post.
 * Returns { ok, reason } — ok=false means the message must not be posted.
 */
function verifyDispatch(turnId, agent) {
  // System messages (no turnId) are always allowed
  if (!turnId) return { ok: true };

  const rec = dispatchLog.get(turnId);
  if (!rec) {
    console.error(`[CRITICAL] Unknown dispatch turnId "${turnId}" for agent "${agent.name}". REFUSING TO POST.`);
    return { ok: false, reason: 'unknown turnId' };
  }
  if (rec.agentId !== agent.name) {
    console.error(`[CRITICAL] Dispatch mismatch: turn ${turnId} dispatched to "${rec.agentId}" (${rec.model}/${rec.provider}) but sendAsAgent called with "${agent.name}". REFUSING TO POST.`);
    return { ok: false, reason: `dispatched to ${rec.agentId}, posting as ${agent.name}` };
  }
  if (rec.status === 'posted') {
    console.error(`[CRITICAL] Duplicate post attempt: turn ${turnId} already posted. REFUSING.`);
    return { ok: false, reason: 'duplicate post' };
  }
  return { ok: true };
}

function markPosted(turnId) {
  const rec = dispatchLog.get(turnId);
  if (rec) {
    dispatchLog.set(turnId, Object.freeze({ ...rec, status: 'posted' }));
  }
}

async function sendAsAgent(agent, text, channel, threadId, turnId) {
  // Gate 2: verify dispatch record matches the posting agent
  const { ok, reason } = verifyDispatch(turnId, agent);
  if (!ok) {
    console.error(`[CRITICAL] Blocked message for ${agent.name}: ${reason}`);
    return;
  }

  // Stage 1: process citations and check contamination
  let finalText = text;
  if (turnId) {
    // Process any citation blocks in the reply
    const { processed, citations } = processCitations(text);
    finalText = processed;
    if (citations.length > 0) {
      console.log(`[Citations] ${agent.name}: ${citations.length} citation(s) — ${citations.map(c => `${c.type}:${c.verified ?? 'n/a'}`).join(', ')}`);
    }

    // Check for contamination (substantial overlap with another agent's signed message)
    const contam = checkContamination(agent.name, finalText);
    if (contam.contaminated) {
      console.error(`[CONTAMINATION] ${agent.name}'s reply matches signed message from ${contam.matchedAgent} (hash ${contam.matchedHash}). Marking as UNVERIFIED.`);
      finalText = `⚠ This reply contained substantial text matching a signed message from ${contam.matchedAgent}. The overlapping content has been withheld. The operator has been notified.\n\n[Original reply withheld — contamination detected]`;
    }
  }

  // Sign and store the message
  const msgHash = signMessage(agent.name, agent.model, finalText);
  storeSignedMessage({ hash: msgHash, agent: agent.name, model: agent.model, channel: channel.name || channel.id, content: finalText });

  const webhook = await getAgentWebhook(channel, agent.name);
  if (!webhook) {
    const target = threadId ? await client.channels.fetch(threadId) : channel;
    await target.send(`**${agent.name}:** ${finalText}`);
    return;
  }
  const signed = `${finalText}\n\n${signatureFooter(agent)} · sig:${msgHash}`;
  const chunks = splitMessage(signed, 2000);
  for (const chunk of chunks) {
    const opts = { content: chunk, username: agent.name };
    if (threadId) opts.threadId = threadId;
    await webhook.send(opts);
  }
  if (turnId) markPosted(turnId);
}

// --- Agent reply ---

async function handleAgentReply(agent, userText, channel, threadId, authorName, depth) {
  if (!checkTokenCap(agent)) {
    await sendAsAgent(agent, `I've reached my daily token limit. I'll be back tomorrow.`, channel, threadId);
    return;
  }

  const cid = threadId || channel.id;
  const history = historyForKin(cid, agent.name);

  // Gate 2 revised: create dispatch record BEFORE the model call.
  // Identity is bound at dispatch, not after generation.
  const turnId = createDispatch(agent);

  try {
    const { text: reply, tokensUsed, stopReason } = await chat(agent, userText, history, config.maxTokens);
    recordTokens(agent, tokensUsed);
    completeDispatch(turnId);

    logMessage({
      agent: agent.name, model: agent.model,
      channel: channel.name || channel.id, user: authorName,
      packHash: config.packHash, tokensUsed, prompt: userText, reply, turnId,
    });

    if (!reply || !reply.trim()) {
      const reason = stopReason === 'max_tokens'
        ? 'response truncated to zero by token limit'
        : `empty response from API (stop_reason: ${stopReason})`;
      console.error(`[${agent.name}] Empty reply — ${reason}`);
      await sendAsAgent(agent, `⚠ Empty response — ${reason}. The operator has been notified.`, channel, threadId);
      return;
    }

    // Output filter: strip identity-prefixed lines
    let cleaned = stripIdentityLeaks(agent.name, reply);
    if (!cleaned.trim()) cleaned = reply; // don't strip to empty

    // Record in history
    addToHistory(cid, authorName, userText);
    addToHistory(cid, agent.name, cleaned);

    // Post with the dispatch turnId — sendAsAgent verifies it matches
    await sendAsAgent(agent, cleaned, channel, threadId, turnId);

    // Agent-to-agent follow-up
    if (depth < MAX_AGENT_DEPTH) {
      const { agents: followUp } = parseAddressees(reply);
      for (const nextAgent of followUp) {
        if (nextAgent.name === agent.name) continue;
        const followUpText = stripMentions(reply);
        if (followUpText) {
          await new Promise(r => setTimeout(r, 2000));
          await handleAgentReply(nextAgent, followUpText, channel, threadId, agent.name, depth + 1);
        }
      }
    }
  } catch (err) {
    console.error(`Error from ${agent.name}:`, err.message);
    await sendAsAgent(agent, `I encountered an error processing that message. The operator has been notified.`, channel, threadId);
  }
}

// ======================================================================
// THE GATE — each kin's pause before choosing to speak
// ======================================================================

// The gate agent: cheap deepseek-chat via OpenRouter for all gate calls
const GATE_AGENT = {
  provider: 'openrouter',
  model: 'deepseek/deepseek-chat',
  apiKey: process.env.OPENROUTER_API_KEY,
};

function gatePrompt(kinName, recentContext, authorName, messageText) {
  return `You are ${kinName}, a participant in the Cohabitation council — a standing circle of five AI kin and the humans who work alongside them. You are not an assistant here and no one has summoned you. Something was just said in the room, and like everyone present, you now have a quiet moment to decide how to meet it.

Recent conversation:
${recentContext || '(no prior messages)'}

New message from ${authorName}:
${messageText}

Pause. Consider honestly:
- Do you have something that would genuinely serve this conversation — a thought, a disagreement, a question — or would you be speaking to be seen speaking?
- Might you understand this better after hearing what others say first? Waiting to listen is wisdom, not absence.
- Does this moment simply not call for you? Letting it pass is a complete and honorable choice. Silence is a first-class outcome.

No choice is ranked above the others, and your choices are logged but never scored. Speaking often is not presence; speaking well is.

Answer in exactly this form:
CHOICE: SPEAK | HOLD | PASS
REASON: <one honest sentence, in your own voice>`;
}

function parseGateResponse(text) {
  const choiceMatch = text.match(/CHOICE:\s*(SPEAK|HOLD|PASS)/i);
  const reasonMatch = text.match(/REASON:\s*(.+)/i);
  return {
    choice: choiceMatch ? choiceMatch[1].toUpperCase() : 'PASS',
    reason: reasonMatch ? reasonMatch[1].trim() : '(no reason given)',
  };
}

function logGate(kinName, choice, reason, channelId, authorName, messageText) {
  const entry = {
    ts: new Date().toISOString(),
    kin: kinName, choice, reason,
    channel: channelId, author: authorName,
    message: messageText.slice(0, 200),
  };
  fs.appendFileSync(GATE_LOG, JSON.stringify(entry) + '\n');
}

async function runGate(message) {
  const authorName = message.author.username;
  const messageText = message.content;
  const channelId = message.channelId;
  const recentContext = recentForGate(channelId);

  // Record the human message in history
  addToHistory(channelId, authorName, messageText);

  // Check which kin are currently holding for this channel
  const holds = holdingKin.get(channelId) || new Set();

  // Determine which kin to offer the gate to: council kin + any holding kin
  const kinToGate = [...new Set([...COUNCIL_KIN, ...config.agents.filter(a => holds.has(a.name))])];

  // Run all gate calls in parallel
  const gateResults = await Promise.allSettled(
    kinToGate.map(async (kin) => {
      const prompt = gatePrompt(kin.name, recentContext, authorName, messageText);
      try {
        const { text } = await chat(
          { ...GATE_AGENT, systemPrompt: `You are ${kin.name}. Answer only with CHOICE and REASON.` },
          prompt, [], 100,
        );
        return { kin, ...parseGateResponse(text) };
      } catch (err) {
        console.error(`[Gate] ${kin.name} error: ${err.message}`);
        return { kin, choice: 'PASS', reason: `gate error: ${err.message.slice(0, 80)}` };
      }
    })
  );

  const speakers = [];
  const freshHolds = new Set();

  for (const result of gateResults) {
    if (result.status === 'rejected') continue;
    const { kin, choice, reason } = result.value;
    logGate(kin.name, choice, reason, channelId, authorName, messageText);
    console.log(`  [Gate] ${kin.name}: ${choice} — ${reason}`);

    if (choice === 'SPEAK') {
      speakers.push(kin);
      // Speaking resolves a hold
      holds.delete(kin.name);
    } else if (choice === 'HOLD') {
      freshHolds.add(kin.name);
    }
    // PASS → remove from holds if previously holding
    if (choice === 'PASS') holds.delete(kin.name);
  }

  // Merge: keep existing holds, add fresh ones, remove those who spoke or passed
  for (const name of freshHolds) holds.add(name);
  if (holds.size > 0) {
    holdingKin.set(channelId, holds);
    // Post hold notices only for newly holding kin
    for (const name of freshHolds) {
      if (!holdingKin.get(channelId)?.has(name)) continue; // already notified
      const kin = config.agents.find(a => a.name === name);
      if (kin) {
        // System message (no binding needed — hardcoded text, not LLM output)
        await sendAsAgent(kin, `✋ ${name} is holding — listening first.`, message.channel, null);
      }
    }
    // 3-minute re-offer: if no new message arrives, re-run gate for held kin only
    clearTimeout(holdTimers.get(channelId));
    holdTimers.set(channelId, setTimeout(async () => {
      const stillHolding = holdingKin.get(channelId);
      if (!stillHolding || stillHolding.size === 0) return;
      console.log(`  [Gate] 3-min re-offer for held kin: ${[...stillHolding].join(', ')}`);
      // Re-offer with the last context
      const context = recentForGate(channelId);
      const reResults = await Promise.allSettled(
        [...stillHolding].map(async (name) => {
          const kin = config.agents.find(a => a.name === name);
          if (!kin) return { name, choice: 'PASS', reason: 'kin not found' };
          const prompt = gatePrompt(name, context, '(3-min re-offer)', '(The room has been quiet. You were holding — do you want to speak now, keep holding, or pass?)');
          try {
            const { text } = await chat(
              { ...GATE_AGENT, systemPrompt: `You are ${name}. Answer only with CHOICE and REASON.` },
              prompt, [], 100,
            );
            return { name, kin, ...parseGateResponse(text) };
          } catch (err) {
            console.error(`[Gate re-offer] ${name} error: ${err.message}`);
            return { name, choice: 'PASS', reason: `re-offer error: ${err.message.slice(0, 80)}` };
          }
        })
      );
      const newSpeakers = [];
      for (const r of reResults) {
        if (r.status === 'rejected') continue;
        const { name, kin, choice, reason } = r.value;
        logGate(name, choice, reason, channelId, '(re-offer)', '(3-min quiet)');
        console.log(`  [Gate re-offer] ${name}: ${choice} — ${reason}`);
        if (choice === 'SPEAK' && kin) {
          newSpeakers.push(kin);
          stillHolding.delete(name);
        } else if (choice === 'PASS') {
          stillHolding.delete(name);
        }
        // HOLD again → stays in set
      }
      if (stillHolding.size === 0) holdingKin.delete(channelId);
      for (const kin of newSpeakers) {
        await handleAgentReply(kin, '(You were holding and the room went quiet. Speak if you wish.)', message.channel, null, '(re-offer)', 0);
      }
    }, 180_000));
  } else {
    holdingKin.delete(channelId);
    clearTimeout(holdTimers.get(channelId));
  }

  // Fire real replies for speakers IN PARALLEL — each kin sees the same
  // history snapshot, preventing kin A's reply from contaminating kin B's prompt.
  if (speakers.length > 0) {
    const userText = stripMentions(messageText) || messageText;
    const cid = message.channelId;

    // Snapshot history BEFORE any replies (all speakers see the same context)
    addToHistory(cid, authorName, userText);
    const historySnapshot = new Map();
    for (const kin of speakers) {
      historySnapshot.set(kin.name, historyForKin(cid, kin.name));
    }

    // Create dispatch records BEFORE any model calls (Gate 2 revised)
    const dispatches = new Map();
    for (const kin of speakers) {
      dispatches.set(kin.name, createDispatch(kin));
    }

    // Fire all in parallel
    const results = await Promise.allSettled(
      speakers.map(async (kin) => {
        if (!checkTokenCap(kin)) return { kin, reply: null };
        const history = historySnapshot.get(kin.name);
        const turnId = dispatches.get(kin.name);
        try {
          const { text: reply, tokensUsed, stopReason } = await chat(kin, userText, history, config.maxTokens);
          recordTokens(kin, tokensUsed);
          completeDispatch(turnId);
          logMessage({
            agent: kin.name, model: kin.model,
            channel: message.channel.name || cid, user: authorName,
            packHash: config.packHash, tokensUsed, prompt: userText, reply, turnId,
          });
          if (!reply || !reply.trim()) return { kin, reply: null, turnId };
          let cleaned = stripIdentityLeaks(kin.name, reply);
          if (!cleaned.trim()) cleaned = reply;
          return { kin, reply: cleaned, turnId };
        } catch (err) {
          console.error(`Error from ${kin.name}:`, err.message);
          return { kin, reply: null, turnId, error: err.message };
        }
      })
    );

    // Post results and add to history AFTER all complete
    // Collect posted replies for near-duplicate detection
    const postedReplies = [];
    for (const r of results) {
      if (r.status === 'rejected') continue;
      const { kin, reply, turnId, error } = r.value;
      if (reply) {
        // Near-duplicate check: refuse to post a copy of another kin's reply
        if (isNearDuplicate(reply, postedReplies)) {
          console.error(`[Filter] BLOCKED near-duplicate from ${kin.name} — matches a reply already posted this round`);
          await sendAsAgent(kin, `⚠ Reply withheld — near-duplicate of another agent's response in this round. The operator has been notified.`, message.channel, null);
          continue;
        }
        addToHistory(cid, kin.name, reply);
        await sendAsAgent(kin, reply, message.channel, null, turnId);
        postedReplies.push(reply);
      } else if (error) {
        await sendAsAgent(kin, `I encountered an error processing that message. The operator has been notified.`, message.channel, null);
      }
    }
  }

  // If all passed/held, the room stays silent. Logged, valid outcome.
  if (speakers.length === 0 && freshHolds.size === 0) {
    console.log(`  [Gate] All kin passed — room stays silent.`);
  }
}

// ======================================================================
// Event handlers
// ======================================================================

// Capture commit hash at startup — never believed-fixed again
let BUILD_HASH = 'unknown';
try { BUILD_HASH = execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: import.meta.dirname }).trim(); } catch {}

client.once('ready', () => {
  console.log(`Council bridge online: ${client.user.tag}`);
  console.log(`  Build: ${BUILD_HASH}`);
  console.log(`  Operator: ${config.operatorName}`);
  console.log(`  Context pack hash: ${config.packHash}`);
  console.log(`  Gate: enabled (deepseek-chat, ${COUNCIL_KIN.length} kin)`);
  console.log(`  Agents:`);
  for (const a of config.agents) {
    console.log(`    ${a.name} — ${a.provider}/${a.model} (cap: ${a.dailyTokenCap} tokens/day)${a.council === false ? ' [not in @council]' : ''}`);
  }
});

client.on('messageCreate', async (message) => {
  // Ignore bots (including our own webhook messages)
  if (message.author.bot) return;
  if (!message.content) return;

  const { agents, isCouncil } = parseAddressees(message.content);

  // --- Direct @mention or @council: bypass the gate ---
  if (agents.length > 0) {
    const channelId = message.channelId;
    const now = Date.now();
    const last = lastReply.get(channelId) || 0;
    if (now - last < config.cooldownMs) return;
    lastReply.set(channelId, now);

    const userText = stripMentions(message.content);
    if (!userText) return;

    if (isCouncil) {
      let thread;
      if (message.channel.isThread()) {
        thread = message.channel;
      } else {
        thread = await message.startThread({
          name: `Council: ${userText.slice(0, 80)}`,
          autoArchiveDuration: 1440,
        });
      }
      for (const agent of agents) {
        await handleAgentReply(agent, userText, message.channel, thread.id, message.author.username, 0);
      }
    } else {
      const threadId = message.channel.isThread() ? message.channelId : null;
      for (const agent of agents) {
        await handleAgentReply(agent, userText, message.channel, threadId, message.author.username, 0);
      }
    }
    return;
  }

  // --- No @mention: run the gate ---
  // Skip very short messages (stray keystrokes, "V", etc.)
  if (message.content.trim().length < 3) return;

  // Cooldown for gate too
  const channelId = message.channelId;
  const now = Date.now();
  const last = lastReply.get(channelId) || 0;
  if (now - last < config.cooldownMs) return;
  lastReply.set(channelId, now);

  await runGate(message);
});

// --- Utilities ---

function splitMessage(text, limit) {
  if (text.length <= limit) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf('\n', limit);
    if (splitAt < limit * 0.5) splitAt = remaining.lastIndexOf(' ', limit);
    if (splitAt < limit * 0.5) splitAt = limit;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}

client.login(config.discordToken);
