#!/usr/bin/env node
/**
 * ashram-server.mjs v4 — purpose-built Ashram room.
 *
 * No pixel-agents dependency. Serves a custom HTML room with:
 * - 6 named figures at fixed positions around a table (Neti aside, not center)
 * - Speech bubbles showing what each kin said or why they held/passed
 * - Live transcript panel beside the room
 * - Status with cause (speaking, holding, listening, passed)
 * - Heartbeat indicator (live / reconnecting, last event time)
 * - Replay of latest council session on load
 *
 * All driven by WebSocket from gate.jsonl tail.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = parseInt(process.env.ASHRAM_PORT || '3200', 10);
const ROOT = process.cwd();
const GATE_LOG = path.join(ROOT, 'logs', 'gate.jsonl');
const HANDSHAKE_PATH = path.join(ROOT, 'config', 'ashram-handshake.json');

// Load sprite data from cached handshake (pixel-agents MIT sprites, decoded)
let spriteJSON = '[]';
try {
  const handshake = JSON.parse(fs.readFileSync(HANDSHAKE_PATH, 'utf8'));
  const charMsg = handshake.find(m => m.type === 'characterSpritesLoaded');
  if (charMsg) spriteJSON = JSON.stringify(charMsg.characters);
  console.log(`[Ashram] Loaded ${charMsg?.characters?.length || 0} character sprites`);
} catch (e) { console.log('[Ashram] No sprite data:', e.message); }

// --- KIN ---
const KIN_LIST = ['Claude', 'GPT', 'Gemini', 'Grok', 'DeepSeek', 'Neti'];
const KIN_COLORS = { Claude: '#c9a96e', GPT: '#74aa9c', Gemini: '#4285f4', Grok: '#e5534b', DeepSeek: '#536dfe', Neti: '#9c7c38' };
const KIN_ROLES = { Neti: 'guru' };

// State
const kinState = {};
for (const name of KIN_LIST) {
  kinState[name] = { status: 'listening', bubble: null, bubbleType: null };
}

const transcript = [];
const MAX_TRANSCRIPT = 100;
let lastEventTime = null;
let currentQuestion = null;

function addTranscript(entry) {
  transcript.push(entry);
  if (transcript.length > MAX_TRANSCRIPT) transcript.shift();
  lastEventTime = new Date().toISOString();
  broadcastState();
}

// WebSocket clients
const clients = new Set();

function broadcastState() {
  const msg = JSON.stringify({
    type: 'state',
    kin: kinState,
    transcript: transcript.slice(-30),
    currentQuestion,
    lastEventTime,
    clientCount: clients.size,
  });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// --- Gate handler ---
function handleGateEvent(entry) {
  const { kin, choice, reason, author, message: msg } = entry;
  if (!KIN_LIST.includes(kin)) return;

  if (author && !KIN_LIST.includes(author) && msg) {
    currentQuestion = msg.slice(0, 300);
  }

  const state = kinState[kin];

  if (choice === 'SPEAK') {
    state.status = 'speaking';
    state.bubble = reason;
    state.bubbleType = 'speak';
    addTranscript({ type: 'speak', kin, reason, ts: entry.ts });
    // Clear after 30s
    setTimeout(() => {
      if (state.status === 'speaking') {
        state.status = 'listening';
        state.bubble = null;
        state.bubbleType = null;
        broadcastState();
      }
    }, 30_000);
  } else if (choice === 'HOLD') {
    state.status = 'holding';
    state.bubble = reason;
    state.bubbleType = 'hold';
    addTranscript({ type: 'hold', kin, reason, ts: entry.ts });
    setTimeout(() => {
      if (state.status === 'holding') {
        state.status = 'listening';
        state.bubble = null;
        state.bubbleType = null;
        broadcastState();
      }
    }, 60_000);
  } else {
    state.status = 'passed';
    state.bubble = reason;
    state.bubbleType = 'pass';
    addTranscript({ type: 'pass', kin, reason, ts: entry.ts });
    setTimeout(() => {
      if (state.status === 'passed') {
        state.status = 'listening';
        state.bubble = null;
        state.bubbleType = null;
        broadcastState();
      }
    }, 15_000);
  }

  broadcastState();
}

// --- Replay ---
function replaySession(jsonlPath) {
  const text = fs.readFileSync(jsonlPath, 'utf8');
  const envelopes = text.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  for (const env of envelopes) {
    if (!KIN_LIST.includes(env.from)) continue;
    transcript.push({ type: 'replay', kin: env.from, text: (env.text || '').slice(0, 250), msgType: env.type, ts: env.date });
  }
  if (transcript.length > MAX_TRANSCRIPT) transcript.splice(0, transcript.length - MAX_TRANSCRIPT);
  lastEventTime = new Date().toISOString();
  console.log(`[Ashram] Replayed ${envelopes.length} messages from ${path.basename(jsonlPath)}`);
}

// --- File tail ---
function tailFile(filepath, onLine, replayLast = 50) {
  if (!fs.existsSync(filepath)) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, '');
  }
  // Replay the last N lines on startup so recent events are visible
  const existing = fs.readFileSync(filepath, 'utf8').trim().split('\n').filter(Boolean);
  const recent = existing.slice(-replayLast);
  for (const line of recent) onLine(line);
  console.log(`[Tail] Replayed ${recent.length} recent lines from ${path.basename(filepath)}`);

  let position = fs.statSync(filepath).size;
  let buffer = '';
  function readNew() {
    try {
      const stat = fs.statSync(filepath);
      if (stat.size <= position) { if (stat.size < position) position = 0; return; }
      const s = fs.createReadStream(filepath, { start: position, encoding: 'utf8' });
      let chunk = '';
      s.on('data', d => { chunk += d; });
      s.on('end', () => {
        position = stat.size;
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const l of lines) if (l.trim()) onLine(l);
      });
    } catch {}
  }
  fs.watch(filepath, (ev) => { if (ev === 'change') readNew(); });
  setInterval(readNew, 2000);
}

// --- The Room (HTML) — v5: pixel-art characters via canvas ---
const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Ashram — Cohabitation Project</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: #1e1e2e; color: #e0ddd5; height: 100vh; overflow: hidden; }
.shell { display: flex; height: 100vh; }

.room { flex: 1; position: relative; min-width: 0; background: #2a2a3a; overflow: hidden; }
/* Tiled floor via CSS pattern */
.floor { position: absolute; inset: 0; background-image:
  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 32px 32px; }
.floor::before { content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse 60% 40% at 50% 50%, rgba(40,38,50,0.8) 0%, rgba(30,30,46,0) 100%); }

.question-bar { position: absolute; top: 0; left: 0; right: 340px; padding: 10px 16px; font-size: 12px; color: #c4a84a; font-style: italic; background: rgba(30,30,46,0.95); border-bottom: 1px solid #3a3a4e; z-index: 10; max-height: 50px; overflow: hidden; }
.heartbeat { position: absolute; bottom: 10px; left: 14px; font-size: 11px; color: #706a5e; display: flex; align-items: center; gap: 6px; z-index: 10; }
.hb-dot { width: 7px; height: 7px; border-radius: 50%; }
.hb-dot.live { background: #6aaf6c; }
.hb-dot.dead { background: #d47055; }

/* --- Kin at desks --- */
.kin { position: absolute; display: flex; flex-direction: column; align-items: center; z-index: 5; }
.kin canvas { image-rendering: pixelated; width: 48px; height: 96px; }
.kin canvas.speaking { filter: drop-shadow(0 0 6px var(--kin-color)); }
.kin canvas.holding { animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
.kin-label { text-align: center; margin-top: 2px; }
.kin-name { font-size: 10px; font-weight: 600; color: var(--kin-color); }
.kin-model { font-size: 8px; color: #706a5e; font-family: monospace; }
.kin-status { font-size: 9px; color: #a09a8e; margin-top: 1px; }
.kin-status.speaking { color: #6aaf6c; }
.kin-status.holding { color: #c4a84a; }
.kin-status.passed { color: #706a5e; }

/* Desk (simple rectangle under each kin) */
.desk { position: absolute; width: 56px; height: 28px; background: #3d3528; border: 1px solid #4a4235; border-radius: 2px; z-index: 3; }

/* Speech bubbles */
.bubble { position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%);
  background: #2a2a3a; border: 1px solid #3a3a4e; border-radius: 6px; padding: 5px 8px;
  font-size: 10px; line-height: 1.35; max-width: 150px; color: #a09a8e;
  pointer-events: none; opacity: 0; transition: opacity 0.3s; white-space: normal; z-index: 20; }
.bubble.visible { opacity: 1; }
.bubble.speak { border-color: #6aaf6c; color: #cdd6f4; }
.bubble.hold { border-color: #c4a84a; color: #c4a84a; }
.bubble::after { content:''; position:absolute; top:100%; left:50%; transform:translateX(-50%);
  border:4px solid transparent; border-top-color:#3a3a4e; }

/* --- Transcript --- */
.transcript { width: 340px; display: flex; flex-direction: column; border-left: 1px solid #3a3a4e; background: #1e1e2e; }
.panel-head { padding: 12px 16px; border-bottom: 1px solid #3a3a4e; }
.panel-head h2 { font-size: 13px; font-weight: 600; color: #a09a8e; }
.tx-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.tx { padding: 5px 16px; font-size: 11px; line-height: 1.45; border-bottom: 1px solid #232335; }
.tx .tx-kin { font-weight: 600; }
.tx .tx-act { font-size: 9px; color: #706a5e; text-transform: uppercase; letter-spacing: 0.04em; margin-left: 4px; }
.tx .tx-body { color: #a09a8e; font-style: italic; margin-top: 1px; }
.tx.speak .tx-kin { color: #6aaf6c; }
.tx.hold .tx-kin { color: #c4a84a; }
.tx.pass .tx-kin { color: #706a5e; }
.tx.replay .tx-kin { color: #89b4fa; }
.prov { padding: 8px 16px; font-size: 9px; color: #585870; border-top: 1px solid #3a3a4e; line-height: 1.5; }

@media (max-width: 800px) {
  .shell { flex-direction: column; }
  .transcript { width: 100%; max-height: 40vh; border-left: none; border-top: 1px solid #3a3a4e; }
  .room { min-height: 60vh; }
  .question-bar { right: 0; }
}
</style>
</head>
<body>
<div class="shell">
  <div class="room">
    <div class="floor"></div>
    <div class="question-bar" id="question">(waiting for a question to land)</div>
    <div id="kinContainer"></div>
    <div class="heartbeat"><span class="hb-dot" id="hbd"></span><span id="hbt">connecting...</span></div>
  </div>
  <div class="transcript">
    <div class="panel-head"><h2>Council Transcript</h2></div>
    <div class="tx-list" id="txlist"></div>
    <div class="prov">The Cohabitation Project · 5 kin + Neti · every choice logged, never scored · pixel-agents sprites (MIT)<br>Each figure is an AI model responding freely through the gate</div>
  </div>
</div>
<script>
const KIN = ${JSON.stringify(KIN_LIST)};
const COLORS = ${JSON.stringify(KIN_COLORS)};
const ROLES = ${JSON.stringify(KIN_ROLES)};
const MODELS = { Claude:'sonnet-5-5', GPT:'gpt-4.1', Gemini:'gemini-2.5', Grok:'grok-4.7', DeepSeek:'deepseek', Neti:'deepseek' };
// Positions: around the room, Claude NOT center, Neti top-left aside
const POS = {
  Neti:     { top:'12%', left:'10%' },
  GPT:      { top:'25%', left:'28%' },
  Claude:   { top:'25%', left:'65%' },
  Gemini:   { top:'58%', left:'18%' },
  Grok:     { top:'58%', left:'75%' },
  DeepSeek: { top:'75%', left:'48%' },
};

// Sprite data (decoded from pixel-agents MIT, served as JSON)
let sprites = null;
fetch('/sprites.json').then(r => r.json()).then(data => {
  sprites = data; // array of 6 characters, each with down/up/right frames
  drawAllSprites();
}).catch(() => console.log('Sprites unavailable, using fallback'));

const SCALE = 3; // pixel scale
const kinCanvases = {};
const kinFrames = {};

function drawSprite(canvas, charData, frame) {
  if (!charData || !canvas) return;
  const dir = charData.down; // face down (toward viewer)
  if (!dir || !dir[frame]) return;
  const pixels = dir[frame]; // 2D array of hex colors
  const h = pixels.length;
  const w = pixels[0]?.length || 0;
  canvas.width = w * SCALE;
  canvas.height = h * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = pixels[y][x];
      if (color && color !== '#00000000' && color !== '#000000' && color.length > 1) {
        ctx.fillStyle = color;
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
      }
    }
  }
}

function drawAllSprites() {
  const charMap = { Claude:0, GPT:1, Gemini:2, Grok:3, DeepSeek:4, Neti:5 };
  for (const name of KIN) {
    const canvas = kinCanvases[name];
    const idx = charMap[name];
    if (sprites && sprites[idx]) drawSprite(canvas, sprites[idx], 0);
  }
}

// Build kin elements
const container = document.getElementById('kinContainer');
KIN.forEach(name => {
  const pos = POS[name];
  // Desk
  const desk = document.createElement('div');
  desk.className = 'desk';
  desk.style.cssText = 'top:calc(' + pos.top + ' + 70px);left:calc(' + pos.left + ' - 4px);';
  container.appendChild(desk);
  // Kin
  const el = document.createElement('div');
  el.className = 'kin';
  el.style.cssText = '--kin-color:' + COLORS[name] + ';top:' + pos.top + ';left:' + pos.left + ';';
  const canvas = document.createElement('canvas');
  canvas.width = 48; canvas.height = 96;
  canvas.id = 'cv-' + name;
  kinCanvases[name] = canvas;
  kinFrames[name] = 0;

  el.innerHTML = '<div class="bubble" id="bub-' + name + '"></div>';
  el.appendChild(canvas);
  el.innerHTML += '<div class="kin-label"><div class="kin-name">' + name +
    (ROLES[name] ? ' <span style="font-size:8px;color:#706a5e">(' + ROLES[name] + ')</span>' : '') +
    '</div><div class="kin-model">' + MODELS[name] + '</div>' +
    '<div class="kin-status" id="st-' + name + '">listening</div></div>';
  // Re-grab canvas after innerHTML clobber
  const cv = el.querySelector('canvas');
  if (cv) kinCanvases[name] = cv;
  container.appendChild(el);
});

// Animation loop for speaking kin (cycle frames)
setInterval(() => {
  if (!sprites) return;
  const charMap = { Claude:0, GPT:1, Gemini:2, Grok:3, DeepSeek:4, Neti:5 };
  for (const name of KIN) {
    const st = document.getElementById('st-' + name);
    if (st && st.classList.contains('speaking')) {
      kinFrames[name] = (kinFrames[name] + 1) % 4; // cycle 4 walk frames
      drawSprite(kinCanvases[name], sprites[charMap[name]], kinFrames[name]);
    }
  }
}, 300);

function updateKin(kinData) {
  for (const name of KIN) {
    const d = kinData[name];
    if (!d) continue;
    const cv = kinCanvases[name];
    const st = document.getElementById('st-' + name);
    const bub = document.getElementById('bub-' + name);

    if (cv) {
      cv.className = d.status === 'speaking' ? 'speaking' : d.status === 'holding' ? 'holding' : '';
    }
    if (st) {
      st.className = 'kin-status ' + d.status;
      st.textContent = d.status === 'holding' ? 'holding \\u2014 listening first' : d.status;
    }
    if (bub) {
      if (d.bubble) {
        // ~12 words max in bubble; full text in transcript only
        const words = (d.bubble || '').split(' ');
        bub.textContent = words.length > 12 ? words.slice(0, 12).join(' ') + '...' : d.bubble;
        bub.className = 'bubble visible ' + (d.bubbleType || '');
      } else {
        bub.className = 'bubble';
      }
    }
    // Reset to idle frame when not speaking
    if (d.status !== 'speaking' && sprites) {
      kinFrames[name] = 0;
      const charMap = { Claude:0, GPT:1, Gemini:2, Grok:3, DeepSeek:4, Neti:5 };
      drawSprite(kinCanvases[name], sprites[charMap[name]], 0);
    }
  }
}

function renderTx(entries) {
  const el = document.getElementById('txlist');
  el.innerHTML = entries.map(e => {
    const cls = e.type || 'replay';
    const act = {speak:'speaks',hold:'holds',pass:'passes',reply:'says',replay:'council'}[cls] || cls;
    const body = e.reason || e.text || '';
    return '<div class="tx ' + cls + '"><span class="tx-kin">' + esc(e.kin) + '</span><span class="tx-act">' + act + '</span>' +
      (body ? '<div class="tx-body">' + esc(body.slice(0,250)) + '</div>' : '') + '</div>';
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

const ws = new WebSocket((location.protocol==='https:'?'wss:':'ws:') + '//' + location.host + '/ws');
const hbd = document.getElementById('hbd');
const hbt = document.getElementById('hbt');

ws.onopen = () => { hbd.className='hb-dot live'; hbt.textContent='live'; };
ws.onclose = () => { hbd.className='hb-dot dead'; hbt.textContent='reconnecting...'; setTimeout(()=>location.reload(),5000); };
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'state') {
    updateKin(msg.kin);
    renderTx(msg.transcript);
    if (msg.currentQuestion) document.getElementById('question').textContent = msg.currentQuestion;
    if (msg.lastEventTime) {
      const t = new Date(msg.lastEventTime);
      hbt.textContent = 'live \\u00b7 last event ' + t.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    }
  }
};
</script>
</body>
</html>`;

// --- HTTP + WebSocket ---
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost').pathname;
  if (url === '/sprites.json') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' });
    res.end(spriteJSON);
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(PAGE);
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[Ashram] Client connected (${clients.size})`);
  // Send current state immediately
  ws.send(JSON.stringify({
    type: 'state',
    kin: kinState,
    transcript: transcript.slice(-30),
    currentQuestion,
    lastEventTime,
    clientCount: clients.size,
  }));
  ws.on('close', () => { clients.delete(ws); });
});

// --- Main ---
const minutesDir = path.join(ROOT, 'council', 'minutes');
if (fs.existsSync(minutesDir)) {
  const jsonls = fs.readdirSync(minutesDir).filter(f => f.endsWith('.jsonl')).sort();
  if (jsonls.length > 0) replaySession(path.join(minutesDir, jsonls[jsonls.length - 1]));
}

let liveEvents = 0;
tailFile(GATE_LOG, (line) => {
  try {
    const entry = JSON.parse(line);
    if (entry.kin && entry.choice) {
      liveEvents++;
      console.log(`[Ashram] Live #${liveEvents}: ${entry.kin} ${entry.choice} — ${clients.size} clients`);
      handleGateEvent(entry);
    }
  } catch {}
});

setInterval(() => console.log(`[Ashram] Heartbeat — ${liveEvents} events, ${clients.size} clients`), 60_000);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Ashram] Listening on 127.0.0.1:${PORT}`);
  console.log(`[Ashram] 6 kin, fixed positions, transcript, heartbeat`);
});
