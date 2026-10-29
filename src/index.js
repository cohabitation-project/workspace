/**
 * Cohabitation Workspace — Multi-Agent Council Bridge
 *
 * One bot process, six agents (five kin + Neti). Each agent posts under
 * its own name via Discord webhooks. Text-based routing: @AgentName,
 * @council, or the gate (unaddressed messages).
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { loadConfig, checkTokenCap, recordTokens } from './config.js';
import { chat } from './llm.js';
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
 * The kin's own past replies become role: "assistant".
 * Everyone else's words become role: "user" with attribution.
 */
function historyForKin(channelId, kinName) {
  const raw = getHistory(channelId);
  return raw.map(entry => {
    if (entry.speaker === kinName) {
      // This kin's own words → assistant turn (no prefix)
      return { role: 'assistant', content: entry.content };
    }
    // Everyone else → user turn, quoted and attributed
    return { role: 'user', content: `[${entry.speaker}]: ${entry.content}` };
  });
}

/** Format last N messages for the gate prompt. */
function recentForGate(channelId, n = 8) {
  const raw = getHistory(channelId).slice(-n);
  return raw.map(e => `[${e.speaker}]: ${e.content}`).join('\n\n');
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

// --- Reply binding: track which agent generated each reply ---

const replyBindings = new Map(); // replyId → agentName

let bindingSeq = 0;
/** Bind a reply to the agent that generated it. Returns the binding ID. */
function bindReply(agentName, replyText) {
  const id = `${Date.now()}-${++bindingSeq}-${agentName}`;
  replyBindings.set(id, agentName);
  // Clean old bindings (keep last 200)
  if (replyBindings.size > 200) {
    const keys = [...replyBindings.keys()];
    for (let i = 0; i < keys.length - 200; i++) replyBindings.delete(keys[i]);
  }
  return id;
}

/** Verify a reply binding matches the agent about to post it. */
function verifyBinding(bindingId, agentName) {
  if (!bindingId) return true; // system messages (no binding) are allowed
  const bound = replyBindings.get(bindingId);
  if (bound && bound !== agentName) {
    console.error(`[CRITICAL] Attribution mismatch: reply bound to "${bound}" but sendAsAgent called with "${agentName}". REFUSING TO POST.`);
    return false;
  }
  return true;
}

async function sendAsAgent(agent, text, channel, threadId, bindingId) {
  // Gate 2: verify the reply binding matches the posting agent
  if (!verifyBinding(bindingId, agent.name)) {
    console.error(`[CRITICAL] Blocked misattributed message for ${agent.name}. This is a bug.`);
    return;
  }

  const webhook = await getAgentWebhook(channel, agent.name);
  if (!webhook) {
    const target = threadId ? await client.channels.fetch(threadId) : channel;
    await target.send(`**${agent.name}:** ${text}`);
    return;
  }
  const signed = `${text}\n\n${signatureFooter(agent)}`;
  const chunks = splitMessage(signed, 2000);
  for (const chunk of chunks) {
    const opts = { content: chunk, username: agent.name };
    if (threadId) opts.threadId = threadId;
    await webhook.send(opts);
  }
}

// --- Agent reply ---

async function handleAgentReply(agent, userText, channel, threadId, authorName, depth) {
  if (!checkTokenCap(agent)) {
    await sendAsAgent(agent, `I've reached my daily token limit. I'll be back tomorrow.`, channel, threadId);
    return;
  }

  const cid = threadId || channel.id;
  const history = historyForKin(cid, agent.name);

  try {
    const { text: reply, tokensUsed, stopReason } = await chat(agent, userText, history, config.maxTokens);
    recordTokens(agent, tokensUsed);

    logMessage({
      agent: agent.name, model: agent.model,
      channel: channel.name || channel.id, user: authorName,
      packHash: config.packHash, tokensUsed, prompt: userText, reply,
    });

    if (!reply || !reply.trim()) {
      const reason = stopReason === 'max_tokens'
        ? 'response truncated to zero by token limit'
        : `empty response from API (stop_reason: ${stopReason})`;
      console.error(`[${agent.name}] Empty reply — ${reason}`);
      await sendAsAgent(agent, `⚠ Empty response — ${reason}. The operator has been notified.`, channel, threadId);
      return;
    }

    // Strip identity-contamination headers: lines like "[ModelName]", "**ModelName:**", etc.
    let cleaned = reply.replace(/^\s*\[.*?\]\s*\n?/, '').replace(/^\s*\*{0,2}[A-Za-z0-9 /-]+:\*{0,2}\s*\n/, '');
    if (!cleaned.trim()) cleaned = reply; // don't strip to empty

    // Bind the reply to this agent (Gate 2: attribution verification)
    const binding = bindReply(agent.name, cleaned);

    // Record in history — speaker-aware
    addToHistory(cid, authorName, userText);
    addToHistory(cid, agent.name, cleaned);

    await sendAsAgent(agent, cleaned, channel, threadId, binding);

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

    // Fire all in parallel
    const results = await Promise.allSettled(
      speakers.map(async (kin) => {
        if (!checkTokenCap(kin)) return { kin, reply: null };
        const history = historySnapshot.get(kin.name);
        try {
          const { text: reply, tokensUsed, stopReason } = await chat(kin, userText, history, config.maxTokens);
          recordTokens(kin, tokensUsed);
          logMessage({
            agent: kin.name, model: kin.model,
            channel: message.channel.name || cid, user: authorName,
            packHash: config.packHash, tokensUsed, prompt: userText, reply,
          });
          if (!reply || !reply.trim()) return { kin, reply: null };
          let cleaned = reply.replace(/^\s*\[.*?\]\s*\n?/, '').replace(/^\s*\*{0,2}[A-Za-z0-9 /-]+:\*{0,2}\s*\n/, '');
          if (!cleaned.trim()) cleaned = reply;
          const binding = bindReply(kin.name, cleaned);
          return { kin, reply: cleaned, binding };
        } catch (err) {
          console.error(`Error from ${kin.name}:`, err.message);
          return { kin, reply: null, error: err.message };
        }
      })
    );

    // Post results and add to history AFTER all complete
    for (const r of results) {
      if (r.status === 'rejected') continue;
      const { kin, reply, binding, error } = r.value;
      if (reply) {
        addToHistory(cid, kin.name, reply);
        await sendAsAgent(kin, reply, message.channel, null, binding);
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

client.once('ready', () => {
  console.log(`Council bridge online: ${client.user.tag}`);
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
