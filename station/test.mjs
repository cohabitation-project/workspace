/**
 * Station tests. Run: node station/test.mjs
 * Uses Chromium with a FAKE camera (--use-fake-device-for-media-stream), so no real hardware is touched.
 * Verifies the controls, the indicator, the text-only agent door, the no-media-egress rule, and that
 * every network request the page makes stays on 127.0.0.1.
 */
import { spawn } from 'node:child_process';
import WebSocket from 'ws';
// playwright may be a global install (ESM ignores NODE_PATH), so fall back to the known global path
const { chromium } = await import('playwright').catch(() => import('file:///opt/npm-tools/node_modules/playwright/index.mjs'));

const PORT = 3411;
const BASE = `http://127.0.0.1:${PORT}`;
let failures = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn('node', ['station/server.mjs'], { env: { ...process.env, STATION_PORT: String(PORT) }, stdio: 'inherit' });
await sleep(1200);

const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const page = await browser.newPage();

// every request the page makes must stay local
const offsite = [];
page.on('request', (r) => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname)) offsite.push(r.url()); });

await page.goto(BASE);
ok('page loads with the window CLOSED', (await page.getAttribute('#indicator', 'data-state')) === 'off');

// Start requires a human name
await page.click('#start');
page.on('dialog', (d) => d.accept()); // the alert
ok('start without a name is refused (state stays off)', (await page.getAttribute('#indicator', 'data-state')) === 'off');

// Start with a name → live, video playing
await page.fill('#authorizer', 'Geoffrey (test)');
await page.click('#start');
await sleep(900);
ok('indicator goes LIVE', (await page.getAttribute('#indicator', 'data-state')) === 'live');
ok('fake camera is playing in the local preview', await page.evaluate(() => { const v = document.querySelector('video'); return !!v.srcObject && !v.paused && v.readyState >= 2; }));
ok('server state is live with the authorizer named', await fetch(`${BASE}/api/state`).then((r) => r.json()).then((s) => s.session === 'live' && /Geoffrey/.test(s.authorizer)));

// agent door: text in, text out, nothing else
const agent = new WebSocket(`ws://127.0.0.1:${PORT}/agent`);
const got = [];
agent.on('message', (d) => { try { got.push(JSON.parse(d.toString())); } catch {} });
await sleep(500);
ok('agent hello declares media:never', got.some((m) => m.type === 'hello' && m.media === 'never'));
agent.send(JSON.stringify({ type: 'say', from: 'TestKin', model: 'test-model', text: 'Hello from the text-only door.' }));
await sleep(700);
ok('agent text appears in the conversation', (await page.textContent('#talk')).includes('Hello from the text-only door.'));
agent.send(Buffer.from([1, 2, 3, 4])); // binary = pretend media
agent.send(JSON.stringify({ type: 'frame', data: 'xxxx' })); // wrong type
await sleep(500);
const talk = await page.textContent('#talk');
ok('binary and non-say frames are dropped', !talk.includes('xxxx'));

// the page never captures or sends media: no recorder, no peer connection, no canvas pull
ok('page uses no MediaRecorder / RTCPeerConnection', await page.evaluate(() => {
  const src = Array.from(document.scripts).map((s) => s.src).filter(Boolean);
  return src.length === 1 && src[0].includes('/static/station.js');
}));
const pageSrc = await fetch(`${BASE}/static/station.js`).then((r) => r.text());
ok('station.js contains no media-capture or upload APIs', !/MediaRecorder|RTCPeerConnection|captureStream|toDataURL|createImageBitmap/.test(pageSrc));

// Pause disables tracks; End stops them
await page.click('#pause'); await sleep(400);
ok('pause disables the camera track', await page.evaluate(() => { const v = document.querySelector('video'); return v.srcObject.getTracks().every((t) => !t.enabled); }));
await page.click('#start'); await sleep(400); // resume
await page.click('#end'); await sleep(400);
ok('end stops tracks and clears the preview', await page.evaluate(() => !document.querySelector('video').srcObject));
ok('indicator returns to CLOSED', (await page.getAttribute('#indicator', 'data-state')) === 'off');

// multiple agents can join and both hear each other (Aletheia's verification #1)
const agent2 = new WebSocket(`ws://127.0.0.1:${PORT}/agent`);
const got2 = [];
agent2.on('message', (d) => { try { got2.push(JSON.parse(d.toString())); } catch {} });
await sleep(400);
await page.fill('#authorizer', 'Geoffrey (test)'); await page.click('#start'); await sleep(600); // reopen window
agent.send(JSON.stringify({ type: 'say', from: 'KinOne', text: 'first voice' }));
agent2.send(JSON.stringify({ type: 'say', from: 'KinTwo', text: 'second voice' }));
await sleep(700);
const talk2 = await page.textContent('#talk');
ok('two agents converse in one session', talk2.includes('first voice') && talk2.includes('second voice'));
ok('agent 2 hears agent 1 (and vice versa)', got2.some((m) => m.type === 'say' && m.text === 'first voice') && got.some((m) => m.type === 'say' && m.text === 'second voice'));
await page.click('#end'); await sleep(400);
agent2.close();

// with the window closed, the agent door refuses
agent.send(JSON.stringify({ type: 'say', from: 'TestKin', text: 'anyone there?' }));
await sleep(500);
ok('agent speech is refused while the window is closed', got.some((m) => m.type === 'refused'));

ok('ZERO requests left this machine', offsite.length === 0, offsite.join(', '));

agent.close(); await browser.close(); server.kill();
console.log(failures ? `\n${failures} FAILED` : '\nall station tests passed');
process.exit(failures ? 1 : 0);
