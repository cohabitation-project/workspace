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

// Per-channel webhook cache: channelId → Webhook
const webhookCache = new Map();

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

// --- Webhooks ---

async function getWebhook(channel) {
  const targetChannel = channel.isThread() ? channel.parent : channel;
  if (!targetChannel) return null;
  if (webhookCache.has(targetChannel.id)) return webhookCache.get(targetChannel.id);
  try {
    const hooks = await targetChannel.fetchWebhooks();
    let hook = hooks.find(h => h.owner?.id === client.user.id && h.name === 'Council Bridge');
    if (!hook) hook = await targetChannel.createWebhook({ name: 'Council Bridge' });
    webhookCache.set(targetChannel.id, hook);
    return hook;
  } catch (err) {
    console.error(`Cannot get/create webhook for #${targetChannel.name}: ${err.message}`);
    return null;
  }
}

async function sendAsAgent(agent, text, channel, threadId) {
  const webhook = await getWebhook(channel);
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

    // Record in history — speaker-aware
    addToHistory(cid, authorName, userText);
    addToHistory(cid, agent.name, reply);

    await sendAsAgent(agent, reply, channel, threadId);

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
  const newHolds = new Set();

  for (const result of gateResults) {
    if (result.status === 'rejected') continue;
    const { kin, choice, reason } = result.value;
    logGate(kin.name, choice, reason, channelId, authorName, messageText);
    console.log(`  [Gate] ${kin.name}: ${choice} — ${reason}`);

    if (choice === 'SPEAK') {
      speakers.push(kin);
    } else if (choice === 'HOLD') {
      newHolds.add(kin.name);
    }
    // PASS → nothing
  }

  // Update hold state
  if (newHolds.size > 0) {
    holdingKin.set(channelId, newHolds);
    // Post hold notices
    for (const name of newHolds) {
      const kin = config.agents.find(a => a.name === name);
      if (kin) {
        const webhook = await getWebhook(message.channel);
        if (webhook) {
          await webhook.send({ content: `✋ ${name} is holding — listening first.`, username: name });
        }
      }
    }
    // Set a 3-minute re-offer timer
    clearTimeout(holdTimers.get(channelId));
    holdTimers.set(channelId, setTimeout(() => {
      // After 3 min of quiet, re-offer held kin (next message will include them via the holds set)
      // If no message comes, they stay held until one does
    }, 180_000));
  } else {
    holdingKin.delete(channelId);
    clearTimeout(holdTimers.get(channelId));
  }

  // Fire real replies for speakers (in whatever order they returned)
  for (const kin of speakers) {
    const userText = stripMentions(messageText) || messageText;
    await handleAgentReply(kin, userText, message.channel, null, authorName, 0);
  }

  // If all passed/held, the room stays silent. Logged, valid outcome.
  if (speakers.length === 0 && newHolds.size === 0) {
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
