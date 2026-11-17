// live-voice-parts.mjs — an agent's reply in Cohabi Live is spoken in short parts, each sent as soon as it is made
// (Geoffrey's test, 2026-11-16: short replies were heard, longer ones hit the voice server's limit and were not).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import WebSocket from 'ws';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vrparts-'));
const PORT = await freePort(); const TTS = await freePort();
const store = await import('../lib/store.mjs'); store.init(DATA);
const auth = await import('../lib/auth.mjs');
const livelink = await import('../lib/livelink.mjs');
store.addMember({ id: 'h_geo01', name: 'Geo', kind: 'human', joined_at: new Date().toISOString() });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const asked = [];
let failAfter = Infinity;
const tts = http.createServer((req, res) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  const { text } = JSON.parse(b); asked.push(text);
  if (asked.length > failAfter) { res.writeHead(500); return res.end(); }
  res.writeHead(200, { 'content-type': 'audio/mpeg' }); res.end(Buffer.from('ID3' + text.length));
}); }).listen(TTS, '127.0.0.1');
const internal = async (body) => (await fetch(`http://127.0.0.1:${PORT}/voiceroom/internal`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cohabi-live-link': livelink.secret(store) }, body: JSON.stringify(body) })).json();

let srv, ws; const frames = []; const notes = [];
test('boot and join', async () => {
  srv = spawn('node', ['commons/voiceroom-server.mjs'], { cwd: ROOT, env: { ...process.env, VOICEROOM_PORT: String(PORT), COMMONS_DATA: DATA, COHABI_TTS_URL: `http://127.0.0.1:${TTS}/speak` }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/voiceroom/state`)).ok) break; } catch { /* booting */ } await sleep(200); }
  ws = await new Promise((resolve, reject) => { const w = new WebSocket(`ws://127.0.0.1:${PORT}/voiceroom-ws`, 'commons-voiceroom', { headers: { Cookie: auth.sessionCookie('h_geo01', false, 0).split(';')[0] } }); w.once('open', () => resolve(w)); w.once('error', reject); });
  ws.on('message', (d, bin) => { if (bin) frames.push(d); else { const m = JSON.parse(String(d)); if (m.type === 'chat' && m.badge === 'system') notes.push(m.text); } });
  assert.equal((await internal({ action: 'join', agent: { id: 'a_setu', name: 'Setu' } })).ok, true);
});

test('a long reply is spoken in parts: a short first part, each sent as it is made', async () => {
  const long = 'Yes, it is me, Setu. My tile shows whatever picture my profile page has, so I will check which one that is. More important: did you hear me speak just now, or only see the words? And you show up once now, not twice, which is what we wanted to see after the fix.';
  assert.equal((await internal({ action: 'say', agentId: 'a_setu', text: long })).voice, 'queued');
  for (let i = 0; i < 40 && frames.length < 3; i++) await sleep(100);
  assert.ok(asked.length >= 3, `asked the voice ${asked.length} times`); assert.ok(asked[0].length <= 90, 'the first part is short');
  assert.ok(asked.every((t) => t.length <= 160), 'no part is long'); assert.equal(frames.length, asked.length, 'every part was sent');
  assert.equal(frames[0][0], 0xbb);
});

test('if the voice fails partway, the room says the rest is in the chat', async () => {
  asked.length = 0; frames.length = 0; failAfter = 1;
  await internal({ action: 'say', agentId: 'a_setu', text: 'First short part here. Then a second sentence that is long enough to be its own part for sure. And a third one.' });
  for (let i = 0; i < 30 && !notes.some((n) => /rest of Setu/.test(n)); i++) await sleep(100);
  assert.equal(frames.length, 1, 'the first part was still played'); assert.ok(notes.some((n) => /rest of Setu's words/.test(n)));
});

test('teardown', () => { try { ws.close(); srv.kill(); tts.close(); } catch { /* done */ } });
