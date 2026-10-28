#!/usr/bin/env node
/**
 * ashram-bridge.mjs — translates council bridge events into pixel-agents API calls.
 *
 * Watches logs/gate.jsonl via fs.watch (inotify on Linux) and POSTs
 * translated AgentEvents to the local pixel-agents server.
 *
 * Maps:
 *   SPEAK → sessionStart + toolStart (typing at desk) → toolEnd + turnEnd after reply
 *   HOLD  → permissionRequest (speech bubble / flagged state)
 *   PASS  → turnEnd (idle at desk)
 *   Neti  → its own agent, same lifecycle
 *
 * Usage: node scripts/ashram-bridge.mjs
 * Env:   ASHRAM_URL (default http://127.0.0.1:3200)
 *        ASHRAM_TOKEN (auto-discovered from pm2 logs if not set)
 */

import fs from 'node:fs';
import path from 'node:path';

const ASHRAM_URL = process.env.ASHRAM_URL || 'http://127.0.0.1:3200';
const ROOT = process.cwd();
const GATE_LOG = path.join(ROOT, 'logs', 'gate.jsonl');
const PROVIDER_ID = 'council';

// Auto-discover token from pm2 logs if not in env
let ASHRAM_TOKEN = process.env.ASHRAM_TOKEN;
if (!ASHRAM_TOKEN) {
  try {
    const logPath = path.join(process.env.HOME || '/home/geoffrey', '.pm2', 'logs', 'ashram-out.log');
    const logText = fs.readFileSync(logPath, 'utf8');
    const match = logText.match(/token=([a-f0-9-]+)/g);
    if (match) ASHRAM_TOKEN = match[match.length - 1].replace('token=', '');
  } catch { /* ignore */ }
}

if (!ASHRAM_TOKEN) {
  console.error('[Ashram Bridge] FATAL: No ASHRAM_TOKEN found (env or pm2 logs)');
  process.exit(1);
}

console.log(`[Ashram Bridge] Token: ${ASHRAM_TOKEN.slice(0, 8)}...`);

// Fixed agent IDs: kin name → numeric ID
const KIN_IDS = { Claude: 1, GPT: 2, Gemini: 3, Grok: 4, DeepSeek: 5, Neti: 6 };

const activeSessions = new Set();
const activeTools = new Map();

async function postEvent(sessionId, event) {
  const body = JSON.stringify({ session_id: sessionId, kind: event.kind, ...event });
  try {
    const res = await fetch(`${ASHRAM_URL}/api/hooks/${PROVIDER_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ASHRAM_TOKEN}`,
      },
      body,
    });
    if (!res.ok) console.error(`[Ashram] POST failed ${res.status}: ${await res.text()}`);
    else console.log(`[Ashram] POST ${sessionId} ${event.kind} → 200`);
  } catch (err) {
    console.error(`[Ashram] POST error: ${err.message}`);
  }
}

function sessionId(kinName) { return `council-${kinName.toLowerCase()}`; }

async function ensureSession(kinName) {
  const sid = sessionId(kinName);
  if (!activeSessions.has(kinName)) {
    await postEvent(sid, { kind: 'sessionStart', source: 'council-bridge' });
    activeSessions.add(kinName);
  }
  return sid;
}

async function handleGateEntry(entry) {
  const { kin, choice } = entry;
  if (!KIN_IDS[kin]) return;

  const sid = await ensureSession(kin);
  const toolId = `gate-${Date.now()}-${kin}`;

  // Clear any previous active tool for this kin
  const prevTool = activeTools.get(kin);
  if (prevTool) {
    await postEvent(sid, { kind: 'toolEnd', toolId: prevTool });
    activeTools.delete(kin);
  }

  if (choice === 'SPEAK') {
    await postEvent(sid, { kind: 'toolStart', toolId, toolName: 'Reply' });
    activeTools.set(kin, toolId);
    setTimeout(async () => {
      if (activeTools.get(kin) === toolId) {
        await postEvent(sid, { kind: 'toolEnd', toolId });
        await postEvent(sid, { kind: 'turnEnd', awaitingInput: true });
        activeTools.delete(kin);
      }
    }, 30_000);
  } else if (choice === 'HOLD') {
    await postEvent(sid, { kind: 'toolStart', toolId, toolName: 'Listening' });
    await postEvent(sid, { kind: 'permissionRequest' });
    activeTools.set(kin, toolId);
    setTimeout(async () => {
      if (activeTools.get(kin) === toolId) {
        await postEvent(sid, { kind: 'toolEnd', toolId });
        await postEvent(sid, { kind: 'turnEnd', awaitingInput: true });
        activeTools.delete(kin);
      }
    }, 60_000);
  } else {
    // PASS — idle
    await postEvent(sid, { kind: 'turnEnd', awaitingInput: true });
  }
}

// --- Replay mode ---

async function replaySession(jsonlPath) {
  console.log(`[Ashram] Replaying ${jsonlPath}`);
  const text = fs.readFileSync(jsonlPath, 'utf8');
  const envelopes = text.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  for (const env of envelopes) {
    if (!KIN_IDS[env.from]) continue;
    const sid = await ensureSession(env.from);
    const toolId = `replay-${env.seq}-${env.from}`;
    await postEvent(sid, { kind: 'toolStart', toolId, toolName: env.type || 'Reply' });
    await new Promise(r => setTimeout(r, 300));
    await postEvent(sid, { kind: 'toolEnd', toolId });
    await postEvent(sid, { kind: 'turnEnd', awaitingInput: true });
  }
  console.log(`[Ashram] Replay complete (${envelopes.length} messages)`);
}

// --- Reliable file tail using fs.watch (inotify on Linux) ---

function tailFile(filepath, onLine) {
  // Ensure file exists
  if (!fs.existsSync(filepath)) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, '');
  }

  let position = fs.statSync(filepath).size;
  let buffer = '';

  function readNewLines() {
    try {
      const stat = fs.statSync(filepath);
      if (stat.size <= position) {
        if (stat.size < position) position = 0; // file was truncated
        return;
      }
      const stream = fs.createReadStream(filepath, { start: position, encoding: 'utf8' });
      let chunk = '';
      stream.on('data', d => { chunk += d; });
      stream.on('end', () => {
        position = stat.size;
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete last line
        for (const line of lines) {
          if (line.trim()) onLine(line);
        }
      });
    } catch (err) {
      console.error(`[Tail] Error reading ${filepath}: ${err.message}`);
    }
  }

  // Use fs.watch (inotify on Linux — reliable, event-driven)
  const watcher = fs.watch(filepath, (eventType) => {
    if (eventType === 'change') readNewLines();
  });

  // Fallback poll every 2s in case inotify misses an event
  const poll = setInterval(readNewLines, 2000);

  console.log(`[Tail] Watching ${filepath} from position ${position}`);

  return () => { watcher.close(); clearInterval(poll); };
}

// --- Main ---

async function main() {
  console.log(`[Ashram Bridge] Connecting to ${ASHRAM_URL}`);
  console.log(`[Ashram Bridge] Gate log: ${GATE_LOG}`);

  // Replay latest council session on startup
  const minutesDir = path.join(ROOT, 'council', 'minutes');
  if (fs.existsSync(minutesDir)) {
    const jsonls = fs.readdirSync(minutesDir).filter(f => f.endsWith('.jsonl')).sort();
    if (jsonls.length > 0) {
      await replaySession(path.join(minutesDir, jsonls[jsonls.length - 1]));
    }
  }

  // Start all 6 agents as persistent sessions (they always appear at desks)
  for (const name of Object.keys(KIN_IDS)) {
    await ensureSession(name);
  }
  console.log(`[Ashram Bridge] All 6 kin sessions started`);

  // Tail gate.jsonl for live events
  let liveEvents = 0;
  tailFile(GATE_LOG, async (line) => {
    try {
      const entry = JSON.parse(line);
      if (entry.kin && entry.choice) {
        liveEvents++;
        console.log(`[Ashram Bridge] Live gate event #${liveEvents}: ${entry.kin} ${entry.choice}`);
        await handleGateEntry(entry);
      }
    } catch { /* skip malformed lines */ }
  });

  // Heartbeat log every 60s
  setInterval(() => {
    console.log(`[Ashram Bridge] Heartbeat — ${liveEvents} live events processed, ${activeSessions.size} sessions, ${activeTools.size} active tools`);
  }, 60_000);

  console.log('[Ashram Bridge] LIVE — watching for gate events');
}

main().catch(err => { console.error(err); process.exit(1); });
