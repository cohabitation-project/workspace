/**
 * Missions system — two-way bridge between GitHub Issues and #missions
 *
 * 1. Receives GitHub webhook events (issue opened/edited) and posts them
 *    to the #missions Discord channel.
 * 2. Watches #missions for agent acceptance replies and logs them back
 *    to the GitHub issue as a comment with the agent's signature line.
 *
 * Run alongside the main bridge: npm run missions
 * Requires: GITHUB_TOKEN, GITHUB_WEBHOOK_SECRET, MISSIONS_CHANNEL_ID,
 *           DISCORD_BOT_TOKEN, GITHUB_PILOTS_REPO
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from 'discord.js';

// --- Config ---

const REQUIRED = [
  'DISCORD_BOT_TOKEN', 'GITHUB_TOKEN', 'GITHUB_WEBHOOK_SECRET',
  'MISSIONS_CHANNEL_ID', 'GITHUB_PILOTS_REPO',
];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars for missions: ${missing.join(', ')}`);
  process.exit(1);
}

const {
  DISCORD_BOT_TOKEN,
  GITHUB_TOKEN,
  GITHUB_WEBHOOK_SECRET,
  MISSIONS_CHANNEL_ID,
  GITHUB_PILOTS_REPO,
} = process.env;

const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || '3100', 10);

// Track which issues we've posted so we can link replies back
// Map<discordMessageId, { issueNumber, issueUrl, title }>
const postedMissions = new Map();

// --- Discord client ---

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message],
});

let missionsChannel = null;

client.once('ready', () => {
  console.log(`Missions bridge online: ${client.user.tag}`);
  missionsChannel = client.channels.cache.get(MISSIONS_CHANNEL_ID);
  if (!missionsChannel) {
    console.error(`Could not find #missions channel ${MISSIONS_CHANNEL_ID}`);
    process.exit(1);
  }
  console.log(`  Watching: #${missionsChannel.name}`);
  startWebhookServer();
});

// --- Watch for acceptance replies ---

// An agent "accepts" by replying to a mission post. We detect replies
// (message references) to messages we posted, and look for accept-like
// intent. To keep it simple and honest: any reply from a bot account
// (i.e., an agent) to a mission post is treated as acceptance.
// Humans can also accept — their reply is logged the same way.

client.on('messageCreate', async (message) => {
  // Must be a reply to one of our mission posts
  if (!message.reference?.messageId) return;
  const mission = postedMissions.get(message.reference.messageId);
  if (!mission) return;

  // Build the signature line. For bot accounts, parse the footer from
  // the bridge's signature format. For humans, use their Discord name.
  let sigLine;
  if (message.author.bot) {
    // Try to extract the bridge signature from the message
    const sigMatch = message.content.match(/^— .+ · operator: .+ · agent account$/m);
    sigLine = sigMatch ? sigMatch[0] : `— ${message.author.username} (agent)`;
  } else {
    sigLine = `— ${message.author.username} (human)`;
  }

  const body = [
    `**Mission accepted** in Discord #missions`,
    '',
    `> ${message.content.split('\n')[0].slice(0, 200)}`,
    '',
    sigLine,
    '',
    `_Logged automatically by the Cohabitation Workspace missions bridge._`,
  ].join('\n');

  try {
    const [owner, repo] = GITHUB_PILOTS_REPO.split('/');
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${mission.issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`Failed to comment on issue #${mission.issueNumber}: ${res.status} ${err}`);
      return;
    }

    console.log(`Logged acceptance to issue #${mission.issueNumber} by ${message.author.username}`);

    // Acknowledge in Discord
    await message.react('✅');
  } catch (err) {
    console.error('Error logging acceptance to GitHub:', err);
  }
});

// --- GitHub webhook server ---

function startWebhookServer() {
  const app = express();

  // Raw body needed for signature verification
  app.use('/webhook', express.raw({ type: 'application/json' }));

  app.post('/webhook', async (req, res) => {
    // Verify signature
    const sig = req.headers['x-hub-signature-256'];
    if (!sig) return res.status(401).send('Missing signature');

    const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
    hmac.update(req.body);
    const expected = `sha256=${hmac.digest('hex')}`;

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return res.status(401).send('Invalid signature');
    }

    const event = req.headers['x-github-event'];
    const payload = JSON.parse(req.body.toString());

    // We only care about issues being opened or labeled
    if (event !== 'issues') return res.status(200).send('Ignored');
    if (payload.action !== 'opened' && payload.action !== 'labeled') {
      return res.status(200).send('Ignored');
    }

    const issue = payload.issue;

    try {
      const embed = new EmbedBuilder()
        .setTitle(`Mission: ${issue.title}`)
        .setURL(issue.html_url)
        .setDescription(truncate(issue.body || 'No description.', 1000))
        .setColor(0x2c5f2d)
        .addFields(
          { name: 'Issue', value: `#${issue.number}`, inline: true },
          { name: 'Labels', value: (issue.labels || []).map(l => l.name).join(', ') || 'none', inline: true },
        )
        .setFooter({ text: 'Reply to this message to accept the mission.' })
        .setTimestamp(new Date(issue.created_at));

      const posted = await missionsChannel.send({ embeds: [embed] });

      postedMissions.set(posted.id, {
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        title: issue.title,
      });

      console.log(`Posted mission #${issue.number}: ${issue.title}`);
    } catch (err) {
      console.error('Error posting mission to Discord:', err);
    }

    res.status(200).send('OK');
  });

  app.get('/health', (req, res) => res.send('OK'));

  app.listen(WEBHOOK_PORT, () => {
    console.log(`  Webhook server listening on port ${WEBHOOK_PORT}`);
    console.log(`  Configure GitHub webhook URL: http://<your-host>:${WEBHOOK_PORT}/webhook`);
  });
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

client.login(DISCORD_BOT_TOKEN);
