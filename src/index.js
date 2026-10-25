/**
 * Cohabitation Workspace — Multi-Agent Council Bridge
 *
 * One bot process, five agents. Each agent posts under its own name
 * via Discord webhooks. Text-based routing: @AgentName or @council.
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { loadConfig, checkTokenCap, recordTokens } from './config.js';
import { chat } from './llm.js';
import { logMessage } from './logger.js';

const config = loadConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message],
});

// Agent names for routing (case-insensitive match)
const AGENT_NAMES = config.agents.map(a => a.name);
const AGENT_MAP = new Map(config.agents.map(a => [a.name.toLowerCase(), a]));

// Per-channel webhook cache: channelId → Webhook
const webhookCache = new Map();

// Per-channel cooldown
const lastReply = new Map();

// Per-channel conversation history (shared across agents in a channel)
const HISTORY_LIMIT = 10;
const channelHistory = new Map();

// Thread depth tracking for agent-to-agent: messageId → depth
const threadDepth = new Map();
const MAX_AGENT_DEPTH = 2;

// --- Helpers ---

function getHistory(channelId) {
  if (!channelHistory.has(channelId)) channelHistory.set(channelId, []);
  return channelHistory.get(channelId);
}

function addToHistory(channelId, role, name, content) {
  const history = getHistory(channelId);
  history.push({ role, content: `[${name}] ${content}` });
  if (history.length > HISTORY_LIMIT * 2) {
    history.splice(0, history.length - HISTORY_LIMIT * 2);
  }
}

function signatureFooter(agent) {
  return `— ${agent.model} · operator: ${config.operatorName} · agent account · ctx:${config.packHash}`;
}

/**
 * Parse which agents are addressed in a message.
 * Returns { agents: Agent[], isCouncil: boolean }
 */
function parseAddressees(text) {
  const lower = text.toLowerCase();

  // @council → all agents
  if (/@council\b/i.test(text)) {
    return { agents: config.agents, isCouncil: true };
  }

  // Check for individual @AgentName mentions
  const matched = [];
  for (const agent of config.agents) {
    const pattern = new RegExp(`@${agent.name}\\b`, 'i');
    if (pattern.test(text)) {
      matched.push(agent);
    }
  }

  return { agents: matched, isCouncil: false };
}

/** Strip @mentions (agent names and @council) from the message text. */
function stripMentions(text) {
  let cleaned = text.replace(/@council\b/gi, '').trim();
  for (const name of AGENT_NAMES) {
    cleaned = cleaned.replace(new RegExp(`@${name}\\b`, 'gi'), '').trim();
  }
  // Also strip Discord bot mentions
  cleaned = cleaned.replace(/<@!?\d+>/g, '').trim();
  return cleaned;
}

/** Get or create a webhook for a channel. */
async function getWebhook(channel) {
  // Threads don't have webhooks — use the parent channel's webhook
  const targetChannel = channel.isThread() ? channel.parent : channel;
  if (!targetChannel) return null;

  if (webhookCache.has(targetChannel.id)) {
    return webhookCache.get(targetChannel.id);
  }

  try {
    const hooks = await targetChannel.fetchWebhooks();
    let hook = hooks.find(h => h.owner?.id === client.user.id && h.name === 'Council Bridge');

    if (!hook) {
      hook = await targetChannel.createWebhook({ name: 'Council Bridge' });
    }

    webhookCache.set(targetChannel.id, hook);
    return hook;
  } catch (err) {
    console.error(`Cannot get/create webhook for #${targetChannel.name}: ${err.message}`);
    console.error('  → Does the bot have Manage Webhooks permission?');
    return null;
  }
}

/** Send a message as a specific agent via webhook. */
async function sendAsAgent(agent, text, channel, threadId) {
  const webhook = await getWebhook(channel);
  if (!webhook) {
    // Fallback: send as the bot itself
    const target = threadId ? await client.channels.fetch(threadId) : channel;
    await target.send(`**${agent.name}:** ${text}`);
    return;
  }

  const signed = `${text}\n\n${signatureFooter(agent)}`;
  const chunks = splitMessage(signed, 2000);

  for (const chunk of chunks) {
    const opts = {
      content: chunk,
      username: agent.name,
    };
    if (threadId) {
      opts.threadId = threadId;
    }
    await webhook.send(opts);
  }
}

/** Handle a single agent's response to a message. */
async function handleAgentReply(agent, userText, channel, threadId, authorName, depth) {
  // Token cap check
  if (!checkTokenCap(agent)) {
    await sendAsAgent(
      agent,
      `I've reached my daily token limit. I'll be back tomorrow.`,
      channel,
      threadId,
    );
    return;
  }

  const history = getHistory(threadId || channel.id);

  try {
    const { text: reply, tokensUsed, stopReason } = await chat(agent, userText, history, config.maxTokens);

    recordTokens(agent, tokensUsed);

    // Log
    logMessage({
      agent: agent.name,
      model: agent.model,
      channel: channel.name || channel.id,
      user: authorName,
      packHash: config.packHash,
      tokensUsed,
      prompt: userText,
      reply,
    });

    // Guard: if the LLM returned empty content, post a visible error
    if (!reply || !reply.trim()) {
      const reason = stopReason === 'max_tokens'
        ? 'response truncated to zero by token limit'
        : `empty response from API (stop_reason: ${stopReason})`;
      console.error(`[${agent.name}] Empty reply — ${reason}`);
      await sendAsAgent(agent, `⚠ Empty response — ${reason}. The operator has been notified.`, channel, threadId);
      return;
    }

    // Record in history
    addToHistory(threadId || channel.id, 'user', authorName, userText);
    addToHistory(threadId || channel.id, 'assistant', agent.name, reply);

    // Send reply
    await sendAsAgent(agent, reply, channel, threadId);

    // Agent-to-agent: check if reply mentions another agent
    if (depth < MAX_AGENT_DEPTH) {
      const { agents: followUp } = parseAddressees(reply);
      for (const nextAgent of followUp) {
        if (nextAgent.name === agent.name) continue; // don't talk to yourself
        const followUpText = stripMentions(reply);
        if (followUpText) {
          // Small delay to avoid flooding
          await new Promise(r => setTimeout(r, 2000));
          await handleAgentReply(nextAgent, followUpText, channel, threadId, agent.name, depth + 1);
        }
      }
    }
  } catch (err) {
    console.error(`Error from ${agent.name}:`, err.message);
    await sendAsAgent(
      agent,
      `I encountered an error processing that message. The operator has been notified.`,
      channel,
      threadId,
    );
  }
}

// --- Event handlers ---

client.once('ready', () => {
  console.log(`Council bridge online: ${client.user.tag}`);
  console.log(`  Operator: ${config.operatorName}`);
  console.log(`  Context pack hash: ${config.packHash}`);
  console.log(`  Agents:`);
  for (const a of config.agents) {
    console.log(`    ${a.name} — ${a.provider}/${a.model} (cap: ${a.dailyTokenCap} tokens/day)`);
  }
});

client.on('messageCreate', async (message) => {
  // Ignore bots (including our own webhook messages)
  if (message.author.bot) return;
  if (!message.content) return;

  const { agents, isCouncil } = parseAddressees(message.content);
  if (agents.length === 0) return;

  // Cooldown check (per channel)
  const channelId = message.channelId;
  const now = Date.now();
  const last = lastReply.get(channelId) || 0;
  if (now - last < config.cooldownMs) return;
  lastReply.set(channelId, now);

  const userText = stripMentions(message.content);
  if (!userText) return;

  if (isCouncil) {
    // Fan out to all agents in a thread
    let thread;
    if (message.channel.isThread()) {
      thread = message.channel;
    } else {
      thread = await message.startThread({
        name: `Council: ${userText.slice(0, 80)}`,
        autoArchiveDuration: 1440,
      });
    }

    // Send all agent replies into the thread (sequentially to avoid rate limits)
    for (const agent of agents) {
      await handleAgentReply(agent, userText, message.channel, thread.id, message.author.username, 0);
    }
  } else {
    // Individual agent(s) — reply in the same channel/thread
    const threadId = message.channel.isThread() ? message.channelId : null;
    for (const agent of agents) {
      await handleAgentReply(agent, userText, message.channel, threadId, message.author.username, 0);
    }
  }
});

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
