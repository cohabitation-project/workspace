#!/usr/bin/env node
/**
 * ashram-bridge.mjs — translates council bridge events into pixel-agents API calls.
 *
 * Watches logs/gate.jsonl (tail -f) and the bridge's stdout for message events.
 * POSTs translated AgentEvents to the local pixel-agents server.
 *
 * Maps:
 *   SPEAK → sessionStart + toolStart (typing at desk) → toolEnd + turnEnd after reply
 *   HOLD  → permissionRequest (speech bubble / flagged state)
 *   PASS  → turnEnd (idle at desk)
 *   Neti  → its own agent, same lifecycle
 *
 * Usage: node scripts/ashram-bridge.mjs
 * Env:   ASHRAM_URL (default http://127.0.0.1:3200)
 *        ASHRAM_TOKEN (from pixel-agents startup)
 */

import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

const ASHRAM_URL = process.env.ASHRAM_URL || 'http://127.0.0.1:3200';
const ASHRAM_TOKEN = process.env.ASHRAM_TOKEN;
const GATE_LOG = path.join(process.cwd(), 'logs', 'gate.jsonl');
const PROVIDER_ID = 'council';

// Fixed agent IDs: kin name → numeric ID
const KIN_IDS = {
  Claude: 1,
  GPT: 2,
  Gemini: 3,
  Grok: 4,
  DeepSeek: 5,
  Neti: 6,
};

// Track which agents have active sessions
const activeSessions = new Set();
// Track active tools per agent
const activeTools = new Map();

async function postEvent(sessionId, event) {
  const body = JSON.stringify({
    session_id: sessionId,
    event_type: event.kind,
    ...event,
  });

  try {
    const res = await fetch(`${ASHRAM_URL}/api/hooks/${PROVIDER_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ASHRAM_TOKEN}`,
      },
      body,
    });
    if (!res.ok) {
      console.error(`[Ashram] POST failed ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error(`[Ashram] POST error: ${err.message}`);
  }
}

function sessionId(kinName) {
  return `council-${kinName.toLowerCase()}`;
}

async function ensureSession(kinName) {
  const sid = sessionId(kinName);
  if (!activeSessions.has(kinName)) {
    await postEvent(sid, {
      kind: 'sessionStart',
      source: 'council-bridge',
      cwd: '/home/geoffrey/workspace',
    });
    activeSessions.add(kinName);
  }
  return sid;
}

async function handleGateEntry(entry) {
  const { kin, choice, reason } = entry;
  if (!KIN_IDS[kin]) return;

  const sid = await ensureSession(kin);
  const toolId = `gate-${Date.now()}-${kin}`;

  if (choice === 'SPEAK') {
    // Start typing animation
    await postEvent(sid, {
      kind: 'toolStart',
      toolId,
      toolName: 'Reply',
    });
    activeTools.set(kin, toolId);
    // toolEnd comes when the actual reply is posted (or after a timeout)
    setTimeout(async () => {
      if (activeTools.get(kin) === toolId) {
        await postEvent(sid, { kind: 'toolEnd', toolId });
        await postEvent(sid, { kind: 'turnEnd', awaitingInput: true });
        activeTools.delete(kin);
      }
    }, 30_000); // 30s max typing animation
  } else if (choice === 'HOLD') {
    // Speech bubble / flagged state
    await postEvent(sid, {
      kind: 'toolStart',
      toolId,
      toolName: 'Listening',
    });
    await postEvent(sid, { kind: 'permissionRequest' });
    activeTools.set(kin, toolId);
    // Clear after 60s if not resolved
    setTimeout(async () => {
      if (activeTools.get(kin) === toolId) {
        await postEvent(sid, { kind: 'toolEnd', toolId });
        await postEvent(sid, { kind: 'turnEnd', awaitingInput: true });
        activeTools.delete(kin);
      }
    }, 60_000);
  } else {
    // PASS — idle at desk
    const prevTool = activeTools.get(kin);
    if (prevTool) {
      await postEvent(sid, { kind: 'toolEnd', toolId: prevTool });
      activeTools.delete(kin);
    }
    await postEvent(sid, { kind: 'turnEnd', awaitingInput: true });
  }
}

// When a kin actually posts a reply, end the typing animation
async function handleKinReply(kinName) {
  if (!KIN_IDS[kinName]) return;
  const toolId = activeTools.get(kinName);
  if (toolId) {
    const sid = sessionId(kinName);
    await postEvent(sid, { kind: 'toolEnd', toolId });
    await postEvent(sid, { kind: 'turnEnd', awaitingInput: true });
    activeTools.delete(kinName);
  }
}

// --- Replay mode: play a .jsonl file as events ---

async function replaySession(jsonlPath) {
  console.log(`[Ashram] Replaying ${jsonlPath}`);
  const text = fs.readFileSync(jsonlPath, 'utf8');
  const envelopes = text.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

  for (const env of envelopes) {
    if (!KIN_IDS[env.from]) continue;
    const sid = await ensureSession(env.from);
    const toolId = `replay-${env.seq}-${env.from}`;

    // Typing animation
    await postEvent(sid, { kind: 'toolStart', toolId, toolName: env.type || 'Reply' });
    // Brief pause between agents for visual effect
    await new Promise(r => setTimeout(r, 800));
    await postEvent(sid, { kind: 'toolEnd', toolId });
    await postEvent(sid, { kind: 'turnEnd', awaitingInput: true });
  }
  console.log(`[Ashram] Replay complete (${envelopes.length} messages)`);
}

// --- Tail gate.jsonl ---

function tailFile(filepath, onLine) {
  let size = 0;
  try { size = fs.statSync(filepath).size; } catch { /* file may not exist yet */ }

  fs.watchFile(filepath, { interval: 500 }, () => {
    try {
      const stat = fs.statSync(filepath);
      if (stat.size > size) {
        const stream = fs.createReadStream(filepath, { start: size, encoding: 'utf8' });
        const rl = createInterface({ input: stream });
        rl.on('line', line => {
          if (line.trim()) onLine(line);
        });
        size = stat.size;
      }
    } catch { /* ignore */ }
  });
}

// --- Main ---

async function main() {
  if (!ASHRAM_TOKEN) {
    console.error('Set ASHRAM_TOKEN (from pixel-agents startup URL)');
    process.exit(1);
  }

  console.log(`[Ashram Bridge] Connecting to ${ASHRAM_URL}`);
  console.log(`[Ashram Bridge] Watching ${GATE_LOG}`);

  // Replay latest council session on startup
  const minutesDir = path.join(process.cwd(), 'council', 'minutes');
  if (fs.existsSync(minutesDir)) {
    const jsonls = fs.readdirSync(minutesDir).filter(f => f.endsWith('.jsonl')).sort();
    if (jsonls.length > 0) {
      await replaySession(path.join(minutesDir, jsonls[jsonls.length - 1]));
    }
  }

  // Start all 6 agents as persistent sessions
  for (const name of Object.keys(KIN_IDS)) {
    await ensureSession(name);
  }

  // Tail gate.jsonl for live events
  tailFile(GATE_LOG, async (line) => {
    try {
      const entry = JSON.parse(line);
      if (entry.kin && entry.choice) {
        await handleGateEntry(entry);
      }
    } catch { /* skip malformed lines */ }
  });

  console.log('[Ashram Bridge] Live — watching for gate events');
}

main().catch(err => { console.error(err); process.exit(1); });
