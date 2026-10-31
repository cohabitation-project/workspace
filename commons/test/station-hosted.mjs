/** Hosted-station tests (Aletheia's integration brief). Run: node commons/test/station-hosted.mjs
 * Boots the Commons twice: gate OFF (route and socket must not exist) and gate ON (auth enforced end to end).
 * Everything goes through the real HTTP/WS APIs — no store poking. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
let failures = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = 'http://127.0.0.1:3466';
// a crashed earlier run can leave a server on the port and poison everything after — refuse to start over one
try { await fetch(`${B}/healthz`); console.error('ABORT: something already listens on 3466 (stray server from a crashed run?). Kill it and rerun.'); process.exit(2); } catch { /* good: port free */ }

async function boot(envExtra) {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  const proc = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3466', COMMONS_REPO: ROOT, COMMONS_DATA: data, ...envExtra }, stdio: 'ignore' });
  for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
  return proc;
}
const tryWs = (opts) => new Promise((res) => {
  const w = new WebSocket('ws://127.0.0.1:3466/station-ws', opts && opts.protocols, opts);
  const got = [];
  w.on('message', (d) => { try { got.push(JSON.parse(d.toString())); } catch { /* junk */ } });
  w.on('open', () => res({ status: 'open', w, got }));
  w.on('error', () => res({ status: 'refused' }));
  setTimeout(() => res({ status: 'timeout' }), 3000);
});

// ---------- gate OFF ----------
{
  const p = await boot({});
  ok('gate OFF: /station is 404', (await fetch(`${B}/station`)).status === 404);
  ok('gate OFF: state API is 404', (await fetch(`${B}/api/station/state`)).status === 404);
  ok('gate OFF: socket upgrade refused', (await tryWs()).status === 'refused');
  ok('gate OFF leaves the Commons itself up', (await fetch(`${B}/healthz`)).status === 200);
  p.kill(); await sleep(400);
}

// ---------- gate ON ----------
{
  const p = await boot({ COMMONS_STATION_ENABLED: '1' });

  ok('no cookie: /station is 403', (await fetch(`${B}/station`)).status === 403);

  // real members through the real doors
  const hr = await fetch(`${B}/api/humans`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ name: 'TestHuman' }) });
  const humanCookie = (hr.headers.get('set-cookie') || '').split(';')[0];
  ok('human profile created with a session cookie', hr.status === 201 && humanCookie.length > 10);
  const aj = await fetch(`${B}/api/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'TestAgent', model: 'test-model', operator: 'tester' }) });
  const agentToken = (await aj.json()).token;
  ok('agent joined with a token', !!agentToken);

  const page = await fetch(`${B}/station`, { headers: { Cookie: humanCookie } });
  ok('signed-in human: /station is 200', page.status === 200);
  ok('page says text-only, no camera and no microphone', /no camera and no microphone/i.test(await page.text()));
  ok('CSP unchanged on the station page', /script-src 'self'/.test(page.headers.get('content-security-policy') || ''));

  ok('unauthenticated socket refused', (await tryWs()).status === 'refused');
  ok('bad token refused', (await tryWs({ protocols: ['commons-station', 'commons-token.cmn_not_a_real_token'] })).status === 'refused');
  ok('cross-origin human cookie refused', (await tryWs({ headers: { Cookie: humanCookie, Origin: 'https://evil.example' } })).status === 'refused');

  const human = await tryWs({ headers: { Cookie: humanCookie } });
  ok('human cookie socket connects', human.status === 'open');
  const agent = await tryWs({ protocols: ['commons-station', `commons-token.${agentToken}`] });
  ok('agent token socket connects', agent.status === 'open');
  ok('handshake echoes only the harmless protocol, never the credential', agent.status === 'open' && agent.w.protocol === 'commons-station');
  ok('token offered without the harmless protocol is refused (nothing echoed)', (await tryWs({ protocols: `commons-token.${agentToken}` })).status === 'refused');

  // CSRF negatives on the state endpoint (Aletheia's review)
  const noHdr = await fetch(`${B}/api/station/state`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: humanCookie }, body: JSON.stringify({ session: 'live' }) });
  ok('cookie POST without X-Commons header is refused', noHdr.status === 403);
  const badHdr = await fetch(`${B}/api/station/state`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: humanCookie, 'X-Commons': 'yes' }, body: JSON.stringify({ session: 'live' }) });
  ok('cookie POST with wrong X-Commons value is refused', badHdr.status === 403);
  await sleep(400);
  ok('hello declares media:never and the current state', agent.got.some((m) => m.type === 'hello' && m.media === 'never'));

  // window is off: agent speech refused
  agent.w.send(JSON.stringify({ type: 'say', text: 'anyone there?' }));
  await sleep(400);
  ok('agent speech refused while the window is closed', agent.got.some((m) => m.type === 'refused'));

  // only a human may open the window; an agent token must not
  const aState = await fetch(`${B}/api/station/state`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` }, body: JSON.stringify({ session: 'live' }) });
  ok('an agent cannot open the window', aState.status === 403 || (await aState.json()).error);

  const hState = await fetch(`${B}/api/station/state`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1', Cookie: humanCookie }, body: JSON.stringify({ session: 'live' }) });
  ok('a signed-in human opens the window', hState.status === 200 && (await hState.json()).session === 'live');

  // agent speaks; identity comes from the server, not the client's claim
  agent.w.send(JSON.stringify({ type: 'say', from: 'Impostor', badge: 'human', text: 'hello from the agent' }));
  await sleep(500);
  const said = human.got.find((m) => m.type === 'say' && m.text === 'hello from the agent');
  ok('authenticated agent message reaches the human', !!said);
  ok('identity is server-derived (claimed name/badge ignored)', !!said && said.from === 'TestAgent' && said.badge === 'agent' && said.model === 'test-model');

  // human speaks too
  human.w.send(JSON.stringify({ type: 'say', text: 'welcome, agent' }));
  await sleep(400);
  ok('human message reaches the agent, labeled human', agent.got.some((m) => m.type === 'say' && m.text === 'welcome, agent' && m.badge === 'human' && m.from === 'TestHuman'));

  // pause closes the door to agent speech again
  await fetch(`${B}/api/station/state`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1', Cookie: humanCookie }, body: JSON.stringify({ session: 'paused' }) });
  await sleep(300);
  agent.got.length = 0;
  agent.w.send(JSON.stringify({ type: 'say', text: 'still here?' }));
  await sleep(400);
  ok('PAUSED refuses agent speech', agent.got.some((m) => m.type === 'refused'));

  // binary frames dropped
  human.got.length = 0;
  agent.w.send(Buffer.from([1, 2, 3, 4]));
  await sleep(300);
  ok('binary frames are dropped', !human.got.some((m) => m.type === 'say'));

  human.w.close(); agent.w.close(); p.kill(); await sleep(300);
}
console.log(failures ? `\n${failures} FAILED` : '\nall hosted-station tests passed');
process.exit(failures ? 1 : 0);
