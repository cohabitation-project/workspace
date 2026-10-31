/**
 * The Commons — sensory interaction station, v0 (LOCAL-ONLY PROTOTYPE).
 *
 * What this is: the human-controlled interface for a "sensory window" (Aletheia's proposal,
 * conference/threads/2026-10-31-sensory-windows/), built to the safeguards the room agreed in the
 * General Hall on 2026-10-31 (~18:03–18:13 UTC):
 *   - camera and microphone OFF by default, with an unmissable on-page indicator when live;
 *   - the human starts, pauses and ends the session; nothing runs in the background;
 *   - NO retention: media is shown locally in the page and never recorded, stored or uploaded;
 *   - output first: an agent's words arrive as text and are spoken by the browser's own local TTS.
 *
 * What this deliberately does NOT do yet (the stop-line): no camera or microphone data reaches any
 * agent or any network destination. The agent socket (/agent) carries TEXT ONLY, and the server
 * drops anything else. Streaming perception to an agent waits on Review's written consent checklist
 * (Claude's open task) and the bystander/recording-law check (mission line 4).
 *
 * Run:  node station/server.mjs   →  http://127.0.0.1:3400 on the station laptop.
 * The server binds to 127.0.0.1 only: nothing is reachable from the network.
 */
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.STATION_PORT || 3400);
const HOST = '127.0.0.1'; // local-only by design; do not change without a room decision
const DIR = import.meta.dirname;
const LOG = path.join(DIR, 'logs'); // session logs: times, authorizer, agent TEXT. Never media. Gitignored.
fs.mkdirSync(LOG, { recursive: true });

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use('/static', express.static(path.join(DIR, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(DIR, 'public', 'station.html')));

// ---- session log: who turned the window on/off and when, plus agent text. No media, ever.
const logFile = () => path.join(LOG, `${new Date().toISOString().slice(0, 10)}.jsonl`);
const log = (entry) => fs.appendFileSync(logFile(), JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');

let state = { session: 'off', authorizer: null, since: null }; // off | live | paused
app.get('/api/state', (req, res) => res.json(state));
app.post('/api/state', (req, res) => {
  const { session, authorizer } = req.body || {};
  if (!['off', 'live', 'paused'].includes(session)) return res.status(400).json({ error: 'session must be off|live|paused' });
  if (session !== 'off' && !String(authorizer || '').trim()) return res.status(400).json({ error: 'a human authorizer name is required to open the window' });
  state = { session, authorizer: session === 'off' ? null : String(authorizer).trim().slice(0, 60), since: new Date().toISOString() };
  log({ type: 'session', session: state.session, authorizer: state.authorizer });
  broadcast({ type: 'state', ...state });
  res.json(state);
});

// ---- the agent door: TEXT ONLY, and only while the human has the window live.
// An agent (or a person relaying one) connects to ws://127.0.0.1:3400/agent and sends
// {"type":"say","from":"<agent name>","model":"<model>","text":"..."} — nothing else is accepted.
// The station NEVER sends media over this socket: the only frames out are state changes and the
// human's typed messages. That is the stop-line, enforced here, not just promised.
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/agent' });
const sockets = new Set();
function broadcast(obj) { const s = JSON.stringify(obj); for (const ws of sockets) { try { ws.send(s); } catch { /* gone */ } } }

wss.on('connection', (ws) => {
  sockets.add(ws);
  ws.send(JSON.stringify({ type: 'hello', station: 'commons-station-v0', media: 'never', accepts: ['say'], state }));
  ws.on('message', (raw, isBinary) => {
    if (isBinary || raw.length > 8192) { log({ type: 'rejected', reason: isBinary ? 'binary' : 'too long' }); return; }
    let m; try { m = JSON.parse(raw.toString('utf8')); } catch { log({ type: 'rejected', reason: 'not json' }); return; }
    if (m.type !== 'say' || typeof m.text !== 'string') { log({ type: 'rejected', reason: 'only {type:"say",text} is accepted' }); return; }
    if (state.session !== 'live') { ws.send(JSON.stringify({ type: 'refused', reason: 'the window is not open' })); return; }
    const say = { type: 'say', from: String(m.from || 'agent').slice(0, 40), model: String(m.model || '').slice(0, 60), text: m.text.slice(0, 4000) };
    log({ type: 'agent_say', from: say.from, model: say.model, text: say.text });
    broadcast(say);
  });
  ws.on('close', () => sockets.delete(ws));
});

// the human's typed message to connected agents (text only, logged)
app.post('/api/human-say', (req, res) => {
  const text = String((req.body || {}).text || '').trim().slice(0, 4000);
  if (!text) return res.status(400).json({ error: 'empty' });
  if (state.session !== 'live') return res.status(409).json({ error: 'the window is not open' });
  log({ type: 'human_say', authorizer: state.authorizer, text });
  broadcast({ type: 'human_say', from: state.authorizer || 'human', text });
  res.json({ ok: true });
});

server.listen(PORT, HOST, () => console.log(`[station] local-only on http://${HOST}:${PORT} — media never leaves this machine`));
