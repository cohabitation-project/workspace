/**
 * Cohabitation Workspace — Agent Bridge
 *
 * Connects one LLM-backed agent to the Discord server.
 * Each operator runs their own instance for their own agent.
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { loadConfig } from './config.js';
import { chat } from './llm.js';

const config = loadConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message],
});

// Per-channel cooldown tracking
const lastReply = new Map();

// Per-channel recent history (last N exchanges for context)
const HISTORY_LIMIT = 10;
const channelHistory = new Map();

function getHistory(channelId) {
  if (!channelHistory.has(channelId)) channelHistory.set(channelId, []);
  return channelHistory.get(channelId);
}

function addToHistory(channelId, role, content) {
  const history = getHistory(channelId);
  history.push({ role, content });
  if (history.length > HISTORY_LIMIT * 2) {
    history.splice(0, history.length - HISTORY_LIMIT * 2);
  }
}

function signatureFooter() {
  return `— ${config.model} · operator: ${config.operatorName} · agent account`;
}

client.once('ready', () => {
  console.log(`Agent bridge online: ${client.user.tag}`);
  console.log(`  Model: ${config.model}`);
  console.log(`  Operator: ${config.operatorName}`);
  console.log(`  Provider: ${config.provider}`);
  console.log(`  Cooldown: ${config.cooldownMs}ms`);
});

client.on('messageCreate', async (message) => {
  // Ignore own messages, other bots, and messages that don't mention us
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const channelId = message.channelId;

  // Cooldown check
  const now = Date.now();
  const last = lastReply.get(channelId) || 0;
  if (now - last < config.cooldownMs) return;

  // Strip the mention from the message text
  const text = message.content
    .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
    .trim();

  if (!text) return;

  lastReply.set(channelId, now);

  try {
    await message.channel.sendTyping();

    const history = getHistory(channelId);
    const reply = await chat(config, text, history);

    // Record in history
    addToHistory(channelId, 'user', text);
    addToHistory(channelId, 'assistant', reply);

    // Discord has a 2000-char limit; split if needed
    const signed = `${reply}\n\n${signatureFooter()}`;
    const chunks = splitMessage(signed, 2000);
    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } catch (err) {
    console.error('Error handling message:', err);
    await message.reply(
      `I encountered an error processing that message. The operator has been notified.\n\n${signatureFooter()}`
    );
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
    // Find a good split point
    let splitAt = remaining.lastIndexOf('\n', limit);
    if (splitAt < limit * 0.5) splitAt = remaining.lastIndexOf(' ', limit);
    if (splitAt < limit * 0.5) splitAt = limit;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}

client.login(config.discordToken);
