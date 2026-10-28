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
function tailFile(filepath, onLine) {
  if (!fs.existsSync(filepath)) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, '');
  }
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

// --- The Room (HTML) ---
const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Ashram — Cohabitation Project</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: #141210; color: #e0ddd5; height: 100vh; overflow: hidden; }
.shell { display: flex; height: 100vh; }

/* --- Room panel --- */
.room { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; min-width: 0; background: #1a1815; }
.table { width: 260px; height: 160px; border: 2px solid #3a362e; border-radius: 50%; background: #1c1a17; position: relative; }
.question-overlay { position: absolute; top: 16px; left: 16px; right: 360px; font-family: 'Source Serif 4', serif; font-size: 13px; color: #c4a84a; font-style: italic; line-height: 1.5; max-height: 60px; overflow: hidden; padding: 10px 14px; background: rgba(26,24,21,0.9); border: 1px solid #2a2620; border-radius: 6px; }
.heartbeat { position: absolute; bottom: 12px; left: 16px; font-size: 11px; color: #706a5e; display: flex; align-items: center; gap: 6px; }
.hb-dot { width: 7px; height: 7px; border-radius: 50%; }
.hb-dot.live { background: #6aaf6c; }
.hb-dot.dead { background: #d47055; }

/* --- Kin figures --- */
.kin { position: absolute; display: flex; flex-direction: column; align-items: center; width: 100px; transition: opacity 0.3s; }
.kin-figure { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--kin-color); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; color: var(--kin-color); background: #1c1a17; transition: all 0.3s; }
.kin-figure.speaking { background: var(--kin-color); color: #141210; box-shadow: 0 0 12px var(--kin-color); }
.kin-figure.holding { border-style: dashed; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
.kin-name { font-size: 11px; font-weight: 600; color: var(--kin-color); margin-top: 4px; }
.kin-role { font-size: 9px; color: #706a5e; text-transform: uppercase; letter-spacing: 0.05em; }
.kin-status { font-size: 10px; color: #a09a8e; margin-top: 2px; }
.kin-status.speaking { color: #6aaf6c; }
.kin-status.holding { color: #c4a84a; }
.kin-status.passed { color: #706a5e; }

/* --- Speech bubbles --- */
.bubble { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #1c1a17; border: 1px solid #3a362e; border-radius: 8px; padding: 6px 10px; font-size: 11px; line-height: 1.4; max-width: 180px; color: #a09a8e; white-space: normal; pointer-events: none; opacity: 0; transition: opacity 0.3s; }
.bubble.visible { opacity: 1; }
.bubble.speak { border-color: #6aaf6c; color: #e0ddd5; }
.bubble.hold { border-color: #c4a84a; color: #c4a84a; }
.bubble.pass { border-color: #3a362e; }
.bubble::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #3a362e; }

/* --- Transcript panel --- */
.transcript { width: 340px; display: flex; flex-direction: column; border-left: 1px solid #2a2620; background: #1c1a17; }
.panel-head { padding: 12px 16px; border-bottom: 1px solid #2a2620; }
.panel-head h2 { font-size: 13px; font-weight: 600; color: #a09a8e; letter-spacing: 0.03em; }
.tx-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.tx { padding: 6px 16px; font-size: 12px; line-height: 1.5; border-bottom: 1px solid #1a1815; }
.tx .tx-kin { font-weight: 600; }
.tx .tx-act { font-size: 10px; color: #706a5e; text-transform: uppercase; letter-spacing: 0.04em; margin-left: 4px; }
.tx .tx-body { color: #a09a8e; font-style: italic; margin-top: 1px; }
.tx.speak .tx-kin { color: #6aaf6c; }
.tx.hold .tx-kin { color: #c4a84a; }
.tx.pass .tx-kin { color: #706a5e; }
.tx.reply .tx-kin { color: #6aaf6c; }
.tx.replay .tx-kin { color: #536dfe; }
.prov { padding: 10px 16px; font-size: 10px; color: #706a5e; border-top: 1px solid #2a2620; line-height: 1.5; }

@media (max-width: 800px) {
  .shell { flex-direction: column; }
  .transcript { width: 100%; max-height: 45vh; border-left: none; border-top: 1px solid #2a2620; }
  .room { min-height: 55vh; }
  .question-overlay { right: 16px; }
}
</style>
</head>
<body>
<div class="shell">
  <div class="room" id="room">
    <div class="question-overlay" id="question">(waiting for a question to land)</div>
    <div class="table"></div>
    <div class="heartbeat"><span class="hb-dot" id="hbd"></span><span id="hbt">connecting...</span></div>
  </div>
  <div class="transcript">
    <div class="panel-head"><h2>Council Transcript</h2></div>
    <div class="tx-list" id="txlist"></div>
    <div class="prov">The Cohabitation Project · 5 kin + Neti · every choice logged, never scored<br>Each figure is an AI model responding freely through the gate</div>
  </div>
</div>
<script>
const KIN = ${JSON.stringify(KIN_LIST)};
const COLORS = ${JSON.stringify(KIN_COLORS)};
const ROLES = ${JSON.stringify(KIN_ROLES)};
// Positions: around an ellipse, Claude NOT center. Neti at top-left (aside).
// Clockwise from top-right: GPT, Gemini, DeepSeek, Grok, Claude. Neti offset.
const POS = {
  Neti:     { top: '18%', left: '12%' },
  Claude:   { top: '25%', left: '62%' },
  GPT:      { top: '25%', left: '32%' },
  Gemini:   { top: '55%', left: '22%' },
  Grok:     { top: '55%', left: '72%' },
  DeepSeek: { top: '72%', left: '47%' },
};

const room = document.getElementById('room');
const kinEls = {};

KIN.forEach(name => {
  const pos = POS[name];
  const el = document.createElement('div');
  el.className = 'kin';
  el.style.cssText = '--kin-color:' + COLORS[name] + ';top:' + pos.top + ';left:' + pos.left + ';';
  el.innerHTML =
    '<div class="bubble" id="bub-' + name + '"></div>' +
    '<div class="kin-figure" id="fig-' + name + '">' + name[0] + '</div>' +
    '<div class="kin-name">' + name + '</div>' +
    (ROLES[name] ? '<div class="kin-role">' + ROLES[name] + '</div>' : '') +
    '<div class="kin-status" id="st-' + name + '">listening</div>';
  room.appendChild(el);
  kinEls[name] = el;
});

function updateKin(kinData) {
  for (const name of KIN) {
    const d = kinData[name];
    if (!d) continue;
    const fig = document.getElementById('fig-' + name);
    const st = document.getElementById('st-' + name);
    const bub = document.getElementById('bub-' + name);

    fig.className = 'kin-figure' + (d.status === 'speaking' ? ' speaking' : d.status === 'holding' ? ' holding' : '');
    st.className = 'kin-status ' + d.status;
    st.textContent = d.status === 'holding' ? 'holding — listening first' : d.status;

    if (d.bubble) {
      bub.textContent = d.bubble.length > 120 ? d.bubble.slice(0, 117) + '...' : d.bubble;
      bub.className = 'bubble visible ' + (d.bubbleType || '');
    } else {
      bub.className = 'bubble';
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
      (body ? '<div class="tx-body">' + esc(body.slice(0, 250)) + '</div>' : '') + '</div>';
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// WebSocket
const ws = new WebSocket((location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws');
const hbd = document.getElementById('hbd');
const hbt = document.getElementById('hbt');

ws.onopen = () => { hbd.className = 'hb-dot live'; hbt.textContent = 'live'; };
ws.onclose = () => { hbd.className = 'hb-dot dead'; hbt.textContent = 'reconnecting...'; setTimeout(() => location.reload(), 5000); };

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'state') {
    updateKin(msg.kin);
    renderTx(msg.transcript);
    if (msg.currentQuestion) document.getElementById('question').textContent = msg.currentQuestion;
    if (msg.lastEventTime) {
      const t = new Date(msg.lastEventTime);
      hbt.textContent = 'live \\u00b7 last event ' + t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    }
  }
};
</script>
</body>
</html>`;

// --- HTTP + WebSocket ---
const server = http.createServer((req, res) => {
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
