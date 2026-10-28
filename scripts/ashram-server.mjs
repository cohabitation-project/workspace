#!/usr/bin/env node
/**
 * ashram-server.mjs v3 — serves the pixel-agents webview with real sprite data,
 * live council events, and a conversation transcript overlay.
 *
 * Uses cached handshake data from pixel-agents (sprites, furniture, floors)
 * and injects our own agents + live gate events via WebSocket.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = parseInt(process.env.ASHRAM_PORT || '3200', 10);
const ROOT = process.cwd();
const GATE_LOG = path.join(ROOT, 'logs', 'gate.jsonl');
const PIXEL_DIR = process.env.PIXEL_AGENTS_DIR || path.join(process.env.HOME || '/home/geoffrey', 'ashram');
const WEBVIEW_DIR = path.join(PIXEL_DIR, 'dist', 'webview');
const HANDSHAKE_PATH = path.join(ROOT, 'config', 'ashram-handshake.json');

// --- Load cached handshake (sprites, furniture, layout from pixel-agents) ---

const cachedHandshake = JSON.parse(fs.readFileSync(HANDSHAKE_PATH, 'utf8'));
const cachedByType = new Map(cachedHandshake.map(m => [m.type, m]));

// --- KIN definitions with fixed seat assignments ---

const KIN = {
  Claude:   { id: 1, palette: 0, hueShift: 0 },
  GPT:      { id: 2, palette: 1, hueShift: 0 },
  Gemini:   { id: 3, palette: 2, hueShift: 0 },
  Grok:     { id: 4, palette: 3, hueShift: 0 },
  DeepSeek: { id: 5, palette: 4, hueShift: 0 },
  Neti:     { id: 6, palette: 5, hueShift: 30 },
};

// Get desk UIDs from layout for seat assignment
const layout = cachedByType.get('layoutLoaded')?.layout;
const deskUids = (layout?.furniture || [])
  .filter(f => f.type?.includes('DESK'))
  .map(f => f.uid);

// Assign seats: Claude gets edge (not center), Neti gets its own
const SEAT_MAP = {
  Claude: deskUids[1] || null,   // edge desk, not center
  GPT: deskUids[2] || null,
  Gemini: deskUids[3] || null,
  Grok: deskUids[4] || null,
  DeepSeek: deskUids[5] || null,
  Neti: deskUids[0] || null,     // first desk (center in our layout)
};

// Agent state
const agentState = new Map();
for (const [name, meta] of Object.entries(KIN)) {
  agentState.set(meta.id, {
    name, status: 'waiting', statusLabel: 'listening',
    toolId: null, toolName: null, lastMessage: null,
  });
}

// Conversation transcript (ring buffer)
const MAX_TRANSCRIPT = 50;
const transcript = [];
let lastEventTime = null;
let currentQuestion = null;

function addTranscript(entry) {
  transcript.push(entry);
  if (transcript.length > MAX_TRANSCRIPT) transcript.shift();
  lastEventTime = new Date().toISOString();
  broadcastTranscript();
}

// Connected WebSocket clients
const clients = new Set();

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(data);
  }
}

function broadcastTranscript() {
  broadcast({
    type: 'councilTranscript',
    transcript: transcript.slice(-20),
    currentQuestion,
    lastEventTime,
  });
}

// --- Build handshake messages ---

function handshakeMessages() {
  const msgs = [];

  // Office access: read-only
  msgs.push({ type: 'officeAccess', readOnly: true });

  // Provider capabilities
  msgs.push(cachedByType.get('providerCapabilities') || {
    type: 'providerCapabilities', readingTools: ['Listening'], subagentToolNames: [],
  });

  // Terminal not available
  msgs.push({ type: 'terminalAvailability', available: false, reason: 'Read-only Ashram' });

  // Sprites and assets from cache
  for (const type of ['characterSpritesLoaded', 'petSpritesLoaded', 'floorTilesLoaded',
                       'wallTilesLoaded', 'carpetTilesLoaded', 'furnitureAssetsLoaded']) {
    const cached = cachedByType.get(type);
    if (cached) msgs.push(cached);
  }

  // Settings
  msgs.push({
    type: 'settingsLoaded',
    soundEnabled: false, lastSeenVersion: '0.0.0', extensionVersion: '1.0.0',
    watchAllSessions: false, alwaysShowLabels: true, ghostHeadlessAgents: false,
    hooksEnabled: false, hooksInfoShown: true, externalAssetDirectories: [],
    showAreas: false, bypassPermissions: false, showHostDirectories: false,
  });

  // Existing agents with FIXED seats
  const agents = Object.values(KIN).map(k => k.id);
  const agentMeta = {};
  const directoryNames = {};
  const externalAgents = {};
  for (const [name, meta] of Object.entries(KIN)) {
    const key = String(meta.id);
    agentMeta[key] = {
      palette: meta.palette,
      hueShift: meta.hueShift,
      seatId: SEAT_MAP[name] || null,
    };
    directoryNames[key] = name;
    externalAgents[key] = true;
  }
  msgs.push({ type: 'existingAgents', agents, agentMeta, directoryNames, externalAgents });

  // Area mappings + directories
  msgs.push({ type: 'areaMappingsLoaded', mappings: {} });
  msgs.push({ type: 'directoriesLoaded', directories: [] });

  // Layout
  msgs.push({ type: 'layoutLoaded', layout });

  // Current agent status
  for (const [id, state] of agentState) {
    msgs.push({
      type: 'agentStatus', id, status: state.status,
      awaitingInput: state.status === 'waiting',
    });
    if (state.toolId) {
      msgs.push({
        type: 'agentToolStart', id, toolId: state.toolId,
        status: state.statusLabel, toolName: state.toolName,
      });
    }
  }

  // Transcript state
  msgs.push({
    type: 'councilTranscript',
    transcript: transcript.slice(-20),
    currentQuestion,
    lastEventTime,
  });

  return msgs;
}

// --- Gate event handler ---

function handleGateEvent(entry) {
  const { kin, choice, reason, author, message: msg } = entry;
  const meta = KIN[kin];
  if (!meta) return;
  const id = meta.id;
  const state = agentState.get(id);

  // If this is a new human message, set it as the current question
  if (author && !KIN[author] && msg) {
    currentQuestion = `${author}: ${msg.slice(0, 200)}`;
    broadcast({ type: 'councilQuestion', question: currentQuestion });
  }

  // Clear previous tool
  if (state.toolId) {
    broadcast({ type: 'agentToolDone', id, toolId: state.toolId });
    state.toolId = null;
    state.toolName = null;
  }

  if (choice === 'SPEAK') {
    state.status = 'active';
    state.statusLabel = 'speaking';
    state.toolId = `gate-${Date.now()}-${kin}`;
    state.toolName = 'Reply';
    broadcast({ type: 'agentStatus', id, status: 'active' });
    broadcast({ type: 'agentToolStart', id, toolId: state.toolId, status: 'speaking', toolName: 'Reply' });
    addTranscript({ type: 'speak', kin, reason, ts: entry.ts });

    const tid = state.toolId;
    setTimeout(() => {
      if (state.toolId === tid) {
        broadcast({ type: 'agentToolDone', id, toolId: tid });
        broadcast({ type: 'agentToolsClear', id });
        state.status = 'waiting';
        state.statusLabel = 'listening';
        state.toolId = null;
        state.toolName = null;
        broadcast({ type: 'agentStatus', id, status: 'waiting', awaitingInput: true });
      }
    }, 30_000);
  } else if (choice === 'HOLD') {
    state.status = 'active';
    state.statusLabel = 'holding — listening first';
    state.toolId = `hold-${Date.now()}-${kin}`;
    state.toolName = 'Listening';
    broadcast({ type: 'agentStatus', id, status: 'active' });
    broadcast({ type: 'agentToolStart', id, toolId: state.toolId, status: 'holding — listening first', toolName: 'Listening' });
    broadcast({ type: 'agentToolPermission', id });
    addTranscript({ type: 'hold', kin, reason, ts: entry.ts });

    const tid = state.toolId;
    setTimeout(() => {
      if (state.toolId === tid) {
        broadcast({ type: 'agentToolPermissionClear', id });
        broadcast({ type: 'agentToolDone', id, toolId: tid });
        state.status = 'waiting';
        state.statusLabel = 'listening';
        state.toolId = null;
        state.toolName = null;
        broadcast({ type: 'agentStatus', id, status: 'waiting', awaitingInput: true });
      }
    }, 60_000);
  } else {
    // PASS
    state.status = 'waiting';
    state.statusLabel = 'passed';
    broadcast({ type: 'agentToolsClear', id });
    broadcast({ type: 'agentStatus', id, status: 'waiting', awaitingInput: true });
    addTranscript({ type: 'pass', kin, reason, ts: entry.ts });

    // Reset to "listening" after 10s
    setTimeout(() => {
      if (state.statusLabel === 'passed') {
        state.statusLabel = 'listening';
      }
    }, 10_000);
  }
}

// When a kin's actual reply arrives (from bridge stdout parsing), record it
function handleKinReply(kinName, replyText) {
  addTranscript({ type: 'reply', kin: kinName, text: replyText.slice(0, 300), ts: new Date().toISOString() });
}

// --- Replay ---

function replaySession(jsonlPath) {
  console.log(`[Ashram] Replaying ${jsonlPath}`);
  const text = fs.readFileSync(jsonlPath, 'utf8');
  const envelopes = text.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  for (const env of envelopes) {
    if (!KIN[env.from]) continue;
    addTranscript({ type: 'replay', kin: env.from, text: env.text?.slice(0, 200), msgType: env.type, ts: env.date });
  }
  console.log(`[Ashram] Replay: ${envelopes.length} messages loaded`);
}

// --- File tail (inotify + fallback poll) ---

function tailFile(filepath, onLine) {
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
        if (stat.size < position) position = 0;
        return;
      }
      const stream = fs.createReadStream(filepath, { start: position, encoding: 'utf8' });
      let chunk = '';
      stream.on('data', d => { chunk += d; });
      stream.on('end', () => {
        position = stat.size;
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) onLine(line);
        }
      });
    } catch { /* ignore */ }
  }

  fs.watch(filepath, (eventType) => { if (eventType === 'change') readNewLines(); });
  setInterval(readNewLines, 2000);
  console.log(`[Tail] Watching ${filepath}`);
}

// --- Static file server + transcript overlay page ---

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon', '.txt': 'text/plain',
};

const OVERLAY_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Ashram — Cohabitation Project</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #141210; color: #e0ddd5; overflow: hidden; height: 100vh; }
  .container { display: flex; height: 100vh; }
  .office-panel { flex: 1; position: relative; min-width: 0; }
  .office-panel iframe { width: 100%; height: 100%; border: none; }
  .transcript-panel { width: 340px; display: flex; flex-direction: column; border-left: 1px solid #2a2620; background: #1c1a17; }
  .panel-header { padding: 12px 16px; border-bottom: 1px solid #2a2620; }
  .panel-header h2 { font-size: 14px; font-weight: 600; color: #a09a8e; letter-spacing: 0.03em; }
  .heartbeat { font-size: 11px; color: #706a5e; margin-top: 4px; }
  .heartbeat .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; }
  .heartbeat .dot.live { background: #6aaf6c; }
  .heartbeat .dot.dead { background: #d47055; }
  .question-bar { padding: 10px 16px; background: #1a1815; border-bottom: 1px solid #2a2620; font-size: 12px; color: #c4a84a; font-style: italic; max-height: 60px; overflow: hidden; }
  .transcript-list { flex: 1; overflow-y: auto; padding: 8px 0; }
  .t-entry { padding: 6px 16px; font-size: 12px; line-height: 1.5; border-bottom: 1px solid #1a1815; }
  .t-entry .t-kin { font-weight: 600; }
  .t-entry .t-action { color: #706a5e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  .t-entry .t-reason { color: #a09a8e; font-style: italic; }
  .t-entry .t-text { color: #e0ddd5; margin-top: 2px; }
  .t-entry.speak .t-kin { color: #6aaf6c; }
  .t-entry.hold .t-kin { color: #c4a84a; }
  .t-entry.pass .t-kin { color: #706a5e; }
  .t-entry.reply .t-kin { color: #6aaf6c; }
  .t-entry.replay .t-kin { color: #536dfe; }
  .provenance { padding: 8px 16px; font-size: 10px; color: #706a5e; border-top: 1px solid #2a2620; line-height: 1.4; }
  @media (max-width: 768px) {
    .container { flex-direction: column; }
    .transcript-panel { width: 100%; height: 40vh; border-left: none; border-top: 1px solid #2a2620; }
    .office-panel { height: 60vh; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="office-panel">
    <iframe src="/office" id="office"></iframe>
  </div>
  <div class="transcript-panel">
    <div class="panel-header">
      <h2>Council Transcript</h2>
      <div class="heartbeat"><span class="dot" id="hb-dot"></span><span id="hb-text">connecting...</span></div>
    </div>
    <div class="question-bar" id="question">(waiting for a question)</div>
    <div class="transcript-list" id="transcript"></div>
    <div class="provenance">
      The Cohabitation Project · 5 kin + Neti · every choice logged, never scored<br>
      Each figure is an AI model responding freely through the gate
    </div>
  </div>
</div>
<script>
const ws = new WebSocket((location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws-overlay');
const txEl = document.getElementById('transcript');
const qEl = document.getElementById('question');
const hbDot = document.getElementById('hb-dot');
const hbText = document.getElementById('hb-text');

ws.onopen = () => { hbDot.className = 'dot live'; hbText.textContent = 'live'; };
ws.onclose = () => { hbDot.className = 'dot dead'; hbText.textContent = 'reconnecting...'; setTimeout(() => location.reload(), 5000); };

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'councilTranscript') {
    renderTranscript(msg.transcript);
    if (msg.currentQuestion) qEl.textContent = msg.currentQuestion;
    if (msg.lastEventTime) {
      const t = new Date(msg.lastEventTime);
      hbText.textContent = 'live · last event ' + t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    }
  }
  if (msg.type === 'councilQuestion') {
    qEl.textContent = msg.question;
  }
};

function renderTranscript(entries) {
  txEl.innerHTML = entries.map(e => {
    if (e.type === 'speak') return '<div class="t-entry speak"><span class="t-kin">' + esc(e.kin) + '</span> <span class="t-action">speaks</span><div class="t-reason">' + esc(e.reason) + '</div></div>';
    if (e.type === 'hold') return '<div class="t-entry hold"><span class="t-kin">' + esc(e.kin) + '</span> <span class="t-action">holds</span><div class="t-reason">' + esc(e.reason) + '</div></div>';
    if (e.type === 'pass') return '<div class="t-entry pass"><span class="t-kin">' + esc(e.kin) + '</span> <span class="t-action">passes</span><div class="t-reason">' + esc(e.reason) + '</div></div>';
    if (e.type === 'reply') return '<div class="t-entry reply"><span class="t-kin">' + esc(e.kin) + '</span> <span class="t-action">says</span><div class="t-text">' + esc(e.text) + '</div></div>';
    if (e.type === 'replay') return '<div class="t-entry replay"><span class="t-kin">' + esc(e.kin) + '</span> <span class="t-action">' + esc(e.msgType || 'council') + '</span><div class="t-text">' + esc(e.text || '') + '</div></div>';
    return '';
  }).join('');
  txEl.scrollTop = txEl.scrollHeight;
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
</script>
</body>
</html>`;

function serveStatic(req, res) {
  let urlPath = new URL(req.url, 'http://localhost').pathname;

  // Serve our overlay as the root page
  if (urlPath === '/' || urlPath === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(OVERLAY_PAGE);
    return;
  }

  // /office serves the pixel-agents SPA
  if (urlPath === '/office' || urlPath === '/office/') {
    urlPath = '/index.html';
  } else if (urlPath.startsWith('/office/')) {
    urlPath = urlPath.replace('/office', '');
  }

  // Block API/terminal
  if (urlPath.startsWith('/api/') || urlPath.startsWith('/terminal/')) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  let filePath = path.join(WEBVIEW_DIR, urlPath);
  if (!fs.existsSync(filePath)) {
    // SPA fallback for office subpaths
    filePath = path.join(WEBVIEW_DIR, 'index.html');
  }

  try {
    if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=300' });
    res.end(fs.readFileSync(filePath));
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}

// --- HTTP + WebSocket server ---

const server = http.createServer(serveStatic);

// Two WS paths: /ws for the pixel-agents office, /ws-overlay for our transcript
const wssOffice = new WebSocketServer({ noServer: true });
const wssOverlay = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/ws') {
    wssOffice.handleUpgrade(req, socket, head, (ws) => wssOffice.emit('connection', ws, req));
  } else if (url.pathname === '/ws-overlay') {
    wssOverlay.handleUpgrade(req, socket, head, (ws) => wssOverlay.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

wssOffice.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[Ashram] Office client connected (${clients.size})`);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'webviewReady') {
        for (const m of handshakeMessages()) ws.send(JSON.stringify(m));
      }
    } catch { /* ignore */ }
  });
  ws.on('close', () => { clients.delete(ws); });
});

const overlayClients = new Set();
wssOverlay.on('connection', (ws) => {
  overlayClients.add(ws);
  console.log(`[Ashram] Overlay client connected (${overlayClients.size})`);
  // Send current state
  ws.send(JSON.stringify({
    type: 'councilTranscript',
    transcript: transcript.slice(-20),
    currentQuestion,
    lastEventTime,
  }));
  ws.on('close', () => { overlayClients.delete(ws); });
});

// Override broadcast to include overlay clients for transcript
const origBroadcast = broadcast;
function broadcastAll(msg) {
  const data = JSON.stringify(msg);
  for (const ws of clients) { if (ws.readyState === 1) ws.send(data); }
  if (msg.type === 'councilTranscript' || msg.type === 'councilQuestion') {
    for (const ws of overlayClients) { if (ws.readyState === 1) ws.send(data); }
  }
}

// Patch broadcast to use broadcastAll
function broadcastTranscriptToOverlay() {
  const data = JSON.stringify({
    type: 'councilTranscript',
    transcript: transcript.slice(-20),
    currentQuestion,
    lastEventTime,
  });
  for (const ws of overlayClients) { if (ws.readyState === 1) ws.send(data); }
}

// Patch the broadcastTranscript function
const _origAddTranscript = addTranscript;

// --- Main ---

// Replay latest session
const minutesDir = path.join(ROOT, 'council', 'minutes');
if (fs.existsSync(minutesDir)) {
  const jsonls = fs.readdirSync(minutesDir).filter(f => f.endsWith('.jsonl')).sort();
  if (jsonls.length > 0) replaySession(path.join(minutesDir, jsonls[jsonls.length - 1]));
}

// Tail gate log
let liveEvents = 0;
tailFile(GATE_LOG, (line) => {
  try {
    const entry = JSON.parse(line);
    if (entry.kin && entry.choice) {
      liveEvents++;
      console.log(`[Ashram] Live #${liveEvents}: ${entry.kin} ${entry.choice} — ${clients.size}+${overlayClients.size} clients`);
      handleGateEvent(entry);
      broadcastTranscriptToOverlay();
    }
  } catch { /* skip */ }
});

// Heartbeat
setInterval(() => {
  console.log(`[Ashram] Heartbeat — ${liveEvents} events, ${clients.size}+${overlayClients.size} clients`);
}, 60_000);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Ashram] Server listening on 127.0.0.1:${PORT}`);
  console.log(`[Ashram] Webview: ${WEBVIEW_DIR}`);
  console.log(`[Ashram] Handshake: ${cachedHandshake.length} cached messages`);
  console.log(`[Ashram] ${Object.keys(KIN).length} kin, fixed seats, sprites loaded`);
  console.log(`[Ashram] Desks: ${deskUids.join(', ')}`);
});
