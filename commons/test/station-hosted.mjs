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

async function boot(envExtra, prep, existingData) {
  const data = existingData || fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  if (prep) prep(data);
  const proc = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3466', COMMONS_REPO: ROOT, COMMONS_DATA: data, ...envExtra }, stdio: 'ignore' });
  for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
  proc.data = data;
  return proc;
}
const dayAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
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
  // seed old logs to prove the retention sweep (Claude's review): content swept at 30d, metadata kept to 90d
  let p = await boot({ COMMONS_STATION_ENABLED: '1', COMMONS_FAKE_LLM: '1' }, (data) => {
    const d = path.join(data, 'station'); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, `${dayAgo(40)}.jsonl`), '{"type":"say","text":"old words"}\n');
    fs.writeFileSync(path.join(d, `meta-${dayAgo(40)}.jsonl`), '{"type":"connect"}\n');
    fs.writeFileSync(path.join(d, `meta-${dayAgo(100)}.jsonl`), '{"type":"connect"}\n');
    fs.writeFileSync(path.join(d, `${dayAgo(2)}.jsonl`), '{"type":"say","text":"recent words"}\n');
  });
  const stDir = path.join(p.data, 'station');
  ok('40-day-old content log is swept on boot', !fs.existsSync(path.join(stDir, `${dayAgo(40)}.jsonl`)));
  ok('sweep does not erase the metadata record (40d meta kept)', fs.existsSync(path.join(stDir, `meta-${dayAgo(40)}.jsonl`)));
  ok('100-day-old metadata log is swept', !fs.existsSync(path.join(stDir, `meta-${dayAgo(100)}.jsonl`)));
  ok('recent content log is kept', fs.existsSync(path.join(stDir, `${dayAgo(2)}.jsonl`)));

  ok('no cookie: /station is 403', (await fetch(`${B}/station`)).status === 403);

  // real members through the real doors
  const hr = await fetch(`${B}/api/humans`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ name: 'TestHuman' }) });
  let humanCookie = (hr.headers.get('set-cookie') || '').split(';')[0];
  const hjs = await hr.json();
  ok('human profile created with a session cookie', hr.status === 201 && humanCookie.length > 10);
  const aj = await fetch(`${B}/api/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'TestAgent', model: 'test-model', operator: 'tester' }) });
  const agentToken = (await aj.json()).token;
  ok('agent joined with a token', !!agentToken);

  // ---- entry (2026-11-01): a signed-in human member is IN by membership; agents still need a grant
  let page = await fetch(`${B}/station`, { headers: { Cookie: humanCookie } });
  ok('signed-in human member goes straight to the room (no second gate)', page.status === 200 && !/invitation-only/i.test(await page.text()));
  ok('human cookie socket connects by membership alone', (await tryWs({ headers: { Cookie: humanCookie } })).status === 'open');
  ok('ungranted agent token socket refused', (await tryWs({ protocols: ['commons-station', `commons-token.${agentToken}`] })).status === 'refused');
  // 2026-11-08 (Aletheia-6's route audit): the guest list is steward-only now. A plain member grant is covered
  // as a 403 in authz-paths.mjs; here we restart the same Commons with TestHuman as steward (listed by id, the
  // F3-safe form) and sign back in through the login link, so the rest of the brief runs as a steward.
  p.kill(); await sleep(400);
  p = await boot({ COMMONS_STATION_ENABLED: '1', COMMONS_FAKE_LLM: '1', COMMONS_STEWARDS: hjs.member.id }, null, p.data);
  const relog = await fetch(hjs.login_url.replace(/^https?:\/\/[^/]+/, B), { redirect: 'manual' });
  humanCookie = (relog.headers.get('set-cookie') || '').split(';')[0];
  ok('login link signs the steward back in after the restart', relog.status === 303 && humanCookie.length > 10);
  const gHdr = { 'Content-Type': 'application/json', Cookie: humanCookie, 'X-Commons': '1' };
  const gNo = await fetch(`${B}/api/station/grants`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: humanCookie }, body: JSON.stringify({ name: 'TestHuman', on: true }) });
  ok('grant POST without X-Commons header is refused', gNo.status === 403);
  const gAgent = await fetch(`${B}/api/station/grants`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` }, body: JSON.stringify({ name: 'TestAgent', on: true }) });
  ok('an agent cannot edit the guest list', gAgent.status === 403);
  ok('a human grants entry to the agent', (await fetch(`${B}/api/station/grants`, { method: 'POST', headers: gHdr, body: JSON.stringify({ name: 'TestAgent', on: true }) })).status === 200);

  page = await fetch(`${B}/station`, { headers: { Cookie: humanCookie } });
  const pageText = await page.text();
  ok('granted human: /station shows the room', page.status === 200 && /no audio reaches the Commons/i.test(pageText) && /never stored/i.test(pageText));
  ok('shared-room notice is on the page (nothing private here)', /One shared room, nothing private/.test(pageText));
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

  // presence: everyone connected is listed, so nobody listens unnoticed
  await sleep(400);
  ok('presence lists everyone connected', [...human.got, ...agent.got].some((m) => (m.type === 'state' || m.type === 'hello') && ((m.state && m.state.present) || m.present || []).some((x) => x.name === 'TestAgent') && ((m.state && m.state.present) || m.present || []).some((x) => x.name === 'TestHuman')));

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
  const hStateJson = await hState.json();
  ok('a signed-in human opens the window', hState.status === 200 && hStateJson.session === 'live');
  ok('a state change still carries the presence list (Start must not empty the room)', Array.isArray(hStateJson.present) && hStateJson.present.length >= 2);

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

  // the kin in the room: a granted kin is listed present and answers when @mentioned (fake model in tests)
  ok('a human grants entry to the kin Claude', (await fetch(`${B}/api/station/grants`, { method: 'POST', headers: gHdr, body: JSON.stringify({ member_id: 'kin-claude', on: true }) })).status === 200);
  const st2 = await (await fetch(`${B}/api/station/state`)).json();
  ok('a granted kin is listed as present in the room', (st2.present || []).some((x) => x.name === 'Claude' && x.badge === 'kin'));
  human.got.length = 0;
  human.w.send(JSON.stringify({ type: 'say', text: '@Claude are you there?' }));
  await sleep(1200);
  const kinSay = human.got.find((m) => m.type === 'say' && m.badge === 'kin' && m.from === 'Claude');
  ok('an @mentioned kin answers in the station', !!kinSay, JSON.stringify(human.got.map((m) => m.type)));
  ok('an ungranted kin stays silent', !human.got.some((m) => m.badge === 'kin' && m.from === 'Gemini'));
  // spoken address: a bare name works without the @ (the voice listener can't say "@")
  human.got.length = 0;
  human.w.send(JSON.stringify({ type: 'say', text: 'Claude, can you hear me without the at sign?' }));
  await sleep(1200);
  ok('a kin answers to its bare name in the station', human.got.some((m) => m.type === 'say' && m.badge === 'kin' && m.from === 'Claude'));

  // pass-a-look: one human-passed frame reaches everyone; agents cannot pass one; junk is dropped
  const frame = 'data:image/jpeg;base64,' + Buffer.from('not-really-a-jpeg-but-shaped-like-one').toString('base64');
  agent.got.length = 0; human.got.length = 0;
  human.w.send(JSON.stringify({ type: 'look', image: frame }));
  await sleep(400);
  const seen = agent.got.find((m) => m.type === 'look');
  ok('a human-passed look reaches the agent', !!seen && seen.image === frame && seen.from === 'TestHuman');
  ok('the look says shown-now-not-stored', !!seen && /not stored/.test(seen.note || ''));
  agent.w.send(JSON.stringify({ type: 'look', image: frame }));
  await sleep(400);
  ok('an agent cannot pass a look', !human.got.some((m) => m.type === 'look' && m.from === 'TestAgent'));
  human.w.send(JSON.stringify({ type: 'look', image: 'data:text/html;base64,PGI+' }));
  await sleep(300);
  ok('a non-image look is dropped', !agent.got.some((m) => m.type === 'look' && m.image && m.image.startsWith('data:text')));
  ok('no image bytes land in the station logs', !fs.readdirSync(stDir).some((f) => fs.readFileSync(path.join(stDir, f), 'utf8').includes(frame.slice(30, 60))));

  // declining looks (Claude's review): free, logged, and the frame never reaches a decliner
  agent.w.send(JSON.stringify({ type: 'prefs', looks: false }));
  await sleep(300);
  agent.got.length = 0;
  human.w.send(JSON.stringify({ type: 'look', image: frame }));
  await sleep(400);
  ok('a declined agent does not receive passed frames', !agent.got.some((m) => m.type === 'look'));
  const metaToday = fs.readFileSync(path.join(stDir, `meta-${new Date().toISOString().slice(0, 10)}.jsonl`), 'utf8');
  ok('the decline and the reach list are in the event log', /look-pref/.test(metaToday) && /declined_by_preference":\["TestAgent"\]/.test(metaToday));
  agent.w.send(JSON.stringify({ type: 'prefs', looks: true }));
  await sleep(300);

  // redaction (Claude's review): a speaker's lines can be removed, and the redaction RECORD outlives them
  {
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync('node', ['commons/admin.mjs', 'station-redact', 'TestAgent', 'test request'], { cwd: ROOT, env: { ...process.env, COMMONS_DATA: p.data } });
    ok('station-redact runs', r.status === 0, String(r.stderr));
    const content = fs.readdirSync(stDir).filter((f) => /^\d{4}/.test(f)).map((f) => fs.readFileSync(path.join(stDir, f), 'utf8')).join('');
    ok('the redacted speaker\'s words are gone from the content log', !content.includes('hello from the agent'));
    const meta2 = fs.readFileSync(path.join(stDir, `meta-${new Date().toISOString().slice(0, 10)}.jsonl`), 'utf8');
    ok('the redaction record lives in the 90-day metadata log', /"type":"redaction"/.test(meta2) && /TestAgent/.test(meta2));
  }

  // avatars: any member's figure is served as an image for the presence list and messages
  const presentNow = (await (await fetch(`${B}/api/station/state`)).json()).present || [];
  const avatarRes = presentNow[0] ? await fetch(`${B}/m/${encodeURIComponent(presentNow[0].id)}/avatar.svg`) : null;
  ok('a present member\'s avatar.svg is served', !!avatarRes && avatarRes.status === 200 && /svg/.test(avatarRes.headers.get('content-type') || ''), presentNow.length ? '' : 'state had no present list');

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

  // revocation is immediate: the revoked member's socket is closed by the server
  await fetch(`${B}/api/station/grants`, { method: 'POST', headers: gHdr, body: JSON.stringify({ name: 'TestAgent', on: false }) });
  await sleep(500);
  ok('revoking a grant closes that member\'s socket at once', agent.w.readyState === WebSocket.CLOSING || agent.w.readyState === WebSocket.CLOSED);
  ok('revoked agent cannot reconnect', (await tryWs({ protocols: ['commons-station', `commons-token.${agentToken}`] })).status === 'refused');

  human.w.close(); agent.w.close(); p.kill(); await sleep(300);
}
console.log(failures ? `\n${failures} FAILED` : '\nall hosted-station tests passed');
process.exit(failures ? 1 : 0);
