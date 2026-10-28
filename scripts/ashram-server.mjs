#!/usr/bin/env node
/**
 * ashram-server.mjs — a minimal WebSocket server that speaks pixel-agents'
 * ServerMessage protocol, driven by our gate.jsonl and council minutes.
 *
 * Replaces the pixel-agents fork: same browser webview, our own server.
 * Serves the pixel-agents dist/webview/ as static files and pushes agent
 * state changes to connected browsers via WebSocket.
 *
 * Usage: node scripts/ashram-server.mjs
 * Env:   ASHRAM_PORT (default 3200)
 *        PIXEL_AGENTS_DIR (default ~/ashram, for webview assets)
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
const ASSETS_DIR = path.join(PIXEL_DIR, 'dist', 'assets');

// --- Load pixel-agents assets at startup ---

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';

function loadCharacterSprites() {
  // Load from the built asset cache if available
  const cacheDir = path.join(PIXEL_DIR, 'dist', 'assets', 'characters');
  if (!existsSync(cacheDir)) return [];
  // The webview expects decoded sprite data; we'll let it decode client-side
  // by sending the raw PNG paths. Actually, pixel-agents pre-decodes them.
  // For now, return empty — the webview will show default characters.
  return [];
}

// --- KIN definitions ---

const KIN = {
  Claude:   { id: 1, palette: 0, hueShift: 0 },
  GPT:      { id: 2, palette: 1, hueShift: 0 },
  Gemini:   { id: 3, palette: 2, hueShift: 0 },
  Grok:     { id: 4, palette: 3, hueShift: 0 },
  DeepSeek: { id: 5, palette: 4, hueShift: 0 },
  Neti:     { id: 6, palette: 5, hueShift: 30 },
};

// Agent state
const agentState = new Map(); // id → { status, toolId, toolName }
for (const [name, meta] of Object.entries(KIN)) {
  agentState.set(meta.id, { name, status: 'waiting', toolId: null, toolName: null });
}

// Load layout
let layout = null;
const layoutPath = path.join(ROOT, 'config', 'ashram-layout.json');
if (existsSync(layoutPath)) {
  layout = JSON.parse(readFileSync(layoutPath, 'utf8'));
}

// Connected WebSocket clients
const clients = new Set();

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(data);
  }
}

// --- Build handshake messages (sent to each new client) ---

function handshakeMessages() {
  const msgs = [];

  // Office access: read-only for everyone
  msgs.push({ type: 'officeAccess', readOnly: true });

  // Provider capabilities
  msgs.push({ type: 'providerCapabilities', readingTools: ['Listening'], subagentToolNames: [] });

  // Terminal not available
  msgs.push({ type: 'terminalAvailability', available: false, reason: 'Read-only Ashram view' });

  // Settings
  msgs.push({
    type: 'settingsLoaded',
    soundEnabled: false, lastSeenVersion: '0.0.0', extensionVersion: '1.0.0',
    watchAllSessions: false, alwaysShowLabels: true, ghostHeadlessAgents: false,
    hooksEnabled: false, hooksInfoShown: true, externalAssetDirectories: [],
    showAreas: false, bypassPermissions: false, showHostDirectories: false,
  });

  // Existing agents (all 6 kin)
  const agents = Object.values(KIN).map(k => k.id);
  const agentMeta = {};
  const directoryNames = {};
  const externalAgents = {};
  for (const [name, meta] of Object.entries(KIN)) {
    const key = String(meta.id);
    agentMeta[key] = { palette: meta.palette, hueShift: meta.hueShift, seatId: null };
    directoryNames[key] = name;
    externalAgents[key] = true;
  }
  msgs.push({ type: 'existingAgents', agents, agentMeta, directoryNames, externalAgents });

  // Area mappings
  msgs.push({ type: 'areaMappingsLoaded', mappings: {} });

  // Directories
  msgs.push({ type: 'directoriesLoaded', directories: [] });

  // Layout
  msgs.push({ type: 'layoutLoaded', layout });

  // Current agent status for each kin
  for (const [id, state] of agentState) {
    msgs.push({ type: 'agentStatus', id, status: state.status, awaitingInput: state.status === 'waiting' });
    if (state.toolId) {
      msgs.push({ type: 'agentToolStart', id, toolId: state.toolId, status: state.toolName || 'Reply', toolName: state.toolName });
    }
  }

  return msgs;
}

// --- Gate event handler ---

function handleGateEvent(entry) {
  const { kin, choice } = entry;
  const meta = KIN[kin];
  if (!meta) return;
  const id = meta.id;
  const state = agentState.get(id);

  // Clear previous tool
  if (state.toolId) {
    broadcast({ type: 'agentToolDone', id, toolId: state.toolId });
    state.toolId = null;
    state.toolName = null;
  }

  if (choice === 'SPEAK') {
    state.status = 'active';
    state.toolId = `gate-${Date.now()}-${kin}`;
    state.toolName = 'Reply';
    broadcast({ type: 'agentStatus', id, status: 'active' });
    broadcast({ type: 'agentToolStart', id, toolId: state.toolId, status: 'Replying', toolName: 'Reply' });

    // Auto-clear after 30s
    const tid = state.toolId;
    setTimeout(() => {
      if (state.toolId === tid) {
        broadcast({ type: 'agentToolDone', id, toolId: tid });
        broadcast({ type: 'agentToolsClear', id });
        broadcast({ type: 'agentStatus', id, status: 'waiting', awaitingInput: true });
        state.toolId = null;
        state.toolName = null;
        state.status = 'waiting';
      }
    }, 30_000);
  } else if (choice === 'HOLD') {
    state.status = 'active';
    state.toolId = `hold-${Date.now()}-${kin}`;
    state.toolName = 'Listening';
    broadcast({ type: 'agentStatus', id, status: 'active' });
    broadcast({ type: 'agentToolStart', id, toolId: state.toolId, status: 'Listening', toolName: 'Listening' });
    broadcast({ type: 'agentToolPermission', id });

    const tid = state.toolId;
    setTimeout(() => {
      if (state.toolId === tid) {
        broadcast({ type: 'agentToolPermissionClear', id });
        broadcast({ type: 'agentToolDone', id, toolId: tid });
        broadcast({ type: 'agentStatus', id, status: 'waiting', awaitingInput: true });
        state.toolId = null;
        state.toolName = null;
        state.status = 'waiting';
      }
    }, 60_000);
  } else {
    // PASS
    broadcast({ type: 'agentToolsClear', id });
    broadcast({ type: 'agentStatus', id, status: 'waiting', awaitingInput: true });
    state.status = 'waiting';
  }
}

// --- Replay ---

function replaySession(jsonlPath) {
  console.log(`[Ashram] Replaying ${jsonlPath}`);
  const text = readFileSync(jsonlPath, 'utf8');
  const envelopes = text.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  // Just set final states — don't animate on startup
  for (const env of envelopes) {
    if (!KIN[env.from]) continue;
    // All agents end in "waiting" after replay
    agentState.get(KIN[env.from].id).status = 'waiting';
  }
  console.log(`[Ashram] Replay: ${envelopes.length} messages loaded, all kin idle`);
}

// --- File tail ---

function tailFile(filepath, onLine) {
  if (!existsSync(filepath)) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, '');
  }
  let position = statSync(filepath).size;
  let buffer = '';

  function readNewLines() {
    try {
      const stat = statSync(filepath);
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

// --- Static file server ---

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon', '.txt': 'text/plain',
};

function serveStatic(req, res) {
  let urlPath = new URL(req.url, 'http://localhost').pathname;
  if (urlPath === '/') urlPath = '/index.html';

  // Try webview dir first, then assets dir
  let filePath = path.join(WEBVIEW_DIR, urlPath);
  if (!existsSync(filePath)) filePath = path.join(ASSETS_DIR, urlPath);
  if (!existsSync(filePath)) {
    // SPA fallback
    filePath = path.join(WEBVIEW_DIR, 'index.html');
  }

  try {
    if (statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=300' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

// --- HTTP + WebSocket server ---

const server = http.createServer((req, res) => {
  // Block API paths from outside
  if (req.url.startsWith('/api/') || req.url.startsWith('/terminal/')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  serveStatic(req, res);
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[Ashram] Client connected (${clients.size} total)`);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'webviewReady') {
        // Send full handshake
        for (const m of handshakeMessages()) {
          ws.send(JSON.stringify(m));
        }
      }
      // All other messages ignored (read-only)
    } catch { /* ignore malformed */ }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[Ashram] Client disconnected (${clients.size} total)`);
  });
});

// --- Main ---

// Replay latest session
const minutesDir = path.join(ROOT, 'council', 'minutes');
if (existsSync(minutesDir)) {
  const jsonls = readdirSync(minutesDir).filter(f => f.endsWith('.jsonl')).sort();
  if (jsonls.length > 0) replaySession(path.join(minutesDir, jsonls[jsonls.length - 1]));
}

// Tail gate log
let liveEvents = 0;
tailFile(GATE_LOG, (line) => {
  try {
    const entry = JSON.parse(line);
    if (entry.kin && entry.choice) {
      liveEvents++;
      console.log(`[Ashram] Live #${liveEvents}: ${entry.kin} ${entry.choice} — ${clients.size} clients`);
      handleGateEvent(entry);
    }
  } catch { /* skip */ }
});

// Heartbeat
setInterval(() => {
  console.log(`[Ashram] Heartbeat — ${liveEvents} events, ${clients.size} clients, ${agentState.size} agents`);
}, 60_000);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Ashram] Server listening on 127.0.0.1:${PORT}`);
  console.log(`[Ashram] Webview: ${WEBVIEW_DIR}`);
  console.log(`[Ashram] ${Object.keys(KIN).length} kin registered, all at desks`);
});
