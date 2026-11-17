
// station-grant-allow-revoke.mjs — steward grants an agent, MCP+HTTP Station reads/says allowed, revoke closes them. Synthetic.
// Run from repo root: PORT=3495 node station-grant-allow-revoke.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = process.cwd(), PORT = process.env.PORT || '3495', B = `http://127.0.0.1:${PORT}`;
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-')); const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? '  ✓' : '  ✗'} ${n}${c ? '' : ' — ' + d}`); };
let p; const boot = async (stew) => { if (p) { p.kill(); await sleep(500); }
  p = spawn(process.execPath, [process.env.SERVER || 'commons/server.mjs'], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, COMMONS_PORT: PORT, COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_STATION_ENABLED: '1', COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1', COMMONS_STEWARDS: stew, OPENROUTER_API_KEY: '', LLM_API_KEY: '', COMMONS_DISCORD_MIRROR: '0' } });
  for (let i = 0; i < 40; i++) { await sleep(300); try { if ((await fetch(B + '/healthz')).ok) return; } catch {} } };
let id = 0; const rpc = async (name, args, token) => { const r = await fetch(B + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer ' + token }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name, arguments: args } }) }); const j = await r.json().catch(() => null); const t = JSON.stringify(j?.result?.content || ''); return { s: r.status, err: j?.result?.isError === true, t }; };
const J = (h = {}) => ({ 'content-type': 'application/json', ...h });
try {
  await boot('h_nobody');
  const hr = await fetch(B + '/api/humans', { method: 'POST', headers: J({ 'X-Commons': '1' }), body: JSON.stringify({ name: 'SgSteward' }) }); const hj = await hr.json();
  const aj = await (await fetch(B + '/api/join', { method: 'POST', headers: J(), body: JSON.stringify({ name: 'SgAgent', model: 'test-model', operator: 'tester' }) })).json(); const tok = aj.token;
  await boot(hj.member.id);
  const relog = await fetch(hj.login_url.replace(/^https?:\/\/[^/]+/, B), { redirect: 'manual' }); const cookie = (relog.headers.get('set-cookie') || '').split(';')[0];
  ok('steward signed in after restart', relog.status === 303 && cookie.length > 10);
  const gh = J({ Cookie: cookie, 'X-Commons': '1' });
  const httpRead = async () => (await fetch(B + '/api/station/read', { method: 'POST', headers: J(), body: JSON.stringify({ token: tok }) })).status;
  // 1 before grant
  const r0 = await rpc('station_read', {}, tok); ok('A1 before grant: MCP station_read denied', r0.err, r0.t.slice(0, 120));
  ok('A2 before grant: HTTP station/read == 403', await httpRead() === 403);
  // 2 grant
  const g = await fetch(B + '/api/station/grants', { method: 'POST', headers: gh, body: JSON.stringify({ name: 'SgAgent', on: true }) }); ok('B0 steward grant == 200', g.status === 200, g.status + '');
  const r1 = await rpc('station_read', {}, tok); ok('B1 granted: MCP station_read ALLOWED (not isError)', !r1.err && r1.s === 200, r1.t.slice(0, 160));
  ok('B2 granted: HTTP station/read == 200', await httpRead() === 200);
  const s1 = await rpc('station_say', { text: 'hello from test' }, tok); console.log('INFO granted station_say (window closed) ->', s1.err, s1.t.slice(0, 160));
  ok('B3 granted station_say refusal (if any) is about the window, not the grant', !s1.err || /window|open|Start|live/i.test(s1.t) && !/grant/i.test(s1.t), s1.t.slice(0, 160));
  const st = await fetch(B + '/api/station/state', { method: 'POST', headers: gh, body: JSON.stringify({ session: 'live', authorizer: 'SgSteward' }) }); console.log('INFO state live ->', st.status, (await st.text()).slice(0, 120));
  const s2 = await rpc('station_say', { text: 'hello live' }, tok); ok('B4 granted + window live: MCP station_say ALLOWED', !s2.err, s2.t.slice(0, 160));
  // 3 revoke
  const rv = await fetch(B + '/api/station/grants', { method: 'POST', headers: gh, body: JSON.stringify({ name: 'SgAgent', on: false }) }); ok('C0 revoke == 200', rv.status === 200, rv.status + '');
  const r2 = await rpc('station_read', {}, tok); ok('C1 after revoke: MCP station_read denied again', r2.err, r2.t.slice(0, 120));
  const s3 = await rpc('station_say', { text: 'after revoke' }, tok); ok('C2 after revoke: MCP station_say denied again', s3.err && /grant/i.test(s3.t), s3.t.slice(0, 160));
  ok('C3 after revoke: HTTP station/read == 403', await httpRead() === 403);
  // 4 restart persistence of revoke
  await boot(hj.member.id); const r3 = await rpc('station_read', {}, tok); ok('C4 revoke survives a restart', r3.err, r3.t.slice(0, 100));
} catch (e) { fail++; console.log('HARNESS ERROR', e); } finally { p && p.kill(); console.log(`RESULT pass=${pass} fail=${fail}`); process.exit(0); }
