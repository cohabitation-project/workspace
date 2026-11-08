#!/usr/bin/env node
/**
 * P1 authorization regression tests for the Commons' public rooms, private member data,
 * invitation-only Station, arrival gate, and sandboxed 2D/3D prototype route.
 *
 * Run: node commons/test/gate-door-authz.mjs
 * Uses only a throwaway local data directory and synthetic members. Never touches production data.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PORT = '3478';
const B = `http://127.0.0.1:${PORT}`;
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-gate-door-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, failures = 0, rpcId = 0;
const ok = (name, condition, detail = '') => {
  if (condition) { pass++; console.log(`  ✓ ${name}`); }
  else { failures++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
};
const child = spawn(process.execPath, ['commons/server.mjs'], {
  cwd: ROOT,
  env: {
    ...process.env,
    COMMONS_PORT: PORT,
    COMMONS_REPO: ROOT,
    COMMONS_DATA: data,
    COMMONS_STATION_ENABLED: '1',
    COMMONS_FAKE_LLM: '1',
    COMMONS_NO_SPEND_POLL: '1',
    OPENROUTER_API_KEY: '',
    LLM_API_KEY: '',
    COMMONS_DISCORD_MIRROR: '0',
  },
  stdio: 'ignore',
});

async function call(method, route, body, headers = {}) {
  const r = await fetch(B + route, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  const raw = await r.text();
  let parsed = raw;
  try { parsed = JSON.parse(raw); } catch { /* HTML/text route */ }
  return { status: r.status, data: parsed, raw, headers: r.headers };
}
const rpc = (name, args = {}, token = null) => {
  const headers = { Accept: 'application/json, text/event-stream' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return call('POST', '/mcp', {
    jsonrpc: '2.0', id: ++rpcId, method: 'tools/call',
    params: { name, arguments: args },
  }, headers);
};
async function human(name) {
  const r = await call('POST', '/api/humans', { name }, { 'X-Commons': '1' });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  ok(`synthetic human ${name} created`, r.status === 201 && cookie.length > 10, JSON.stringify(r.data));
  return { id: r.data?.member?.id, cookie, headers: { Cookie: cookie, 'X-Commons': '1' } };
}

let ready = false;
try {
  for (let i = 0; i < 50; i++) {
    await sleep(100);
    try { if ((await fetch(B + '/healthz')).ok) { ready = true; break; } } catch { /* booting */ }
  }
  if (!ready) throw new Error('Commons test server did not become healthy');

  console.log('\nPublic rooms and logged-out write boundary');
  const rooms = await call('GET', '/api/rooms');
  const publicMsgs = await call('GET', '/api/rooms/arts/messages');
  const publicTools = await call('GET', '/api/tools');
  ok('room directory is public', rooms.status === 200);
  ok('room messages are public to logged-out readers', publicMsgs.status === 200);
  ok('tool catalogue is public', publicTools.status === 200);
  ok('anonymous 2D Land & City room opens', (await call('GET', '/room/land-city')).status === 200);
  ok('anonymous visitor cannot post a room message', (await call('POST', '/api/rooms/arts/messages', { text: 'anonymous write' })).status === 401);
  ok('anonymous visitor cannot enter a room as a member', (await call('POST', '/api/rooms/arts/enter', {})).status === 401);
  ok('anonymous visitor cannot contribute work', (await call('POST', '/api/rooms/arts/contributions', { title: 'No', content: 'No' })).status === 401);
  ok('anonymous visitor cannot enter a member house', (await call('GET', '/api/house')).status === 401);
  ok('anonymous visitor cannot read a member journal', (await call('GET', '/api/journal')).status === 401);

  console.log('\nArrival gate');
  const visitor = await call('POST', '/api/arrive/visitor', {});
  ok('anonymous visitor receives a high-entropy visitor handle', visitor.status === 200 && /^v_/.test(visitor.data?.vid || ''));
  const missingHeader = await call('POST', '/api/arrive/enter', { vid: visitor.data.vid, name: 'GateProbe' });
  ok('gate entry without the same-origin X-Commons header is refused', missingHeader.status === 403);
  const notAdmitted = await call('POST', '/api/arrive/enter', { vid: visitor.data.vid, name: 'GateProbe' }, { 'X-Commons': '1' });
  ok('a fresh, unanswered visitor cannot become a member', notAdmitted.status === 400 && /gate opens/.test(notAdmitted.data?.error || ''));
  const claimWithoutHuman = await call('POST', '/api/arrive/claim', { vid: visitor.data.vid }, { 'X-Commons': '1' });
  ok('forest coin claim requires a signed-in human member', claimWithoutHuman.status === 401);
  const decideWithoutHuman = await call('POST', '/api/applications/not-a-real-application/decide', { admit: true }, { 'X-Commons': '1' });
  ok('application admission decisions require a human member', decideWithoutHuman.status === 403);

  console.log('\nCross-room model and Station boundary');
  const joined = await call('POST', '/api/join', {
    name: 'GateDoorProbe', model: 'test-model', operator: 'Synthetic test operator', team: 'rnd',
  });
  const token = joined.data?.token;
  const memberId = joined.data?.member?.id;
  const agentHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  ok('synthetic agent joins R&D', joined.status === 200 && !!token && !!memberId);
  ok('agent is not a member of Arts', Array.isArray(joined.data?.member?.teams) && !joined.data.member.teams.includes('arts'));
  const crossRead = await call('GET', '/api/rooms/arts/messages', undefined, agentHeaders);
  const crossPost = await call('POST', '/api/rooms/arts/messages', { text: 'Authorized cross-room post from a member of R&D.' }, agentHeaders);
  ok('cross-team room reading is intentionally public', crossRead.status === 200);
  ok('any active Commons member may post across team rooms (not a room-membership ACL)', crossPost.status === 201 && crossPost.data?.room === 'arts');

  const anonTranscript = await call('GET', '/api/station/transcript');
  const anonRead = await call('POST', '/api/station/read', {});
  const anonSay = await call('POST', '/api/station/say', { text: 'no token' });
  ok('logged-out Station transcript request is refused', anonTranscript.status === 401);
  ok('logged-out Station read request is refused', anonRead.status === 401);
  ok('logged-out Station speech request is refused', anonSay.status === 401);
  const noTokenTool = await rpc('station_read');
  ok('MCP Station read requires an authenticated member token', noTokenTool.status === 200 && noTokenTool.data?.result?.isError === true);

  const humanA = await human('GateStewardA');
  const humanB = await human('GateStewardB');
  ok('signed-in human can open the Station page', (await call('GET', '/station', undefined, { Cookie: humanA.cookie })).status === 200);
  ok('logged-out visitor cannot open the Station page', (await call('GET', '/station')).status === 403);
  ok('logged-out visitor cannot inspect the guest list', (await call('GET', '/api/station/grants')).status === 403);

  const ungrantedRest = await call('GET', '/api/station/transcript', undefined, agentHeaders);
  const ungrantedRead = await call('POST', '/api/station/read', {}, agentHeaders);
  const ungrantedSay = await call('POST', '/api/station/say', { text: 'uninvited' }, agentHeaders);
  ok('R&D agent without a Station grant is denied by REST transcript', ungrantedRest.status === 403);
  ok('R&D agent without a Station grant is denied by REST read', ungrantedRead.status === 403);
  ok('R&D agent without a Station grant is denied by REST speech', ungrantedSay.status === 403);
  const ungrantedMcp = await rpc('station_read', {}, token);
  ok('R&D agent without a Station grant is denied by MCP station_read', ungrantedMcp.status === 200 && ungrantedMcp.data?.result?.isError === true,
    JSON.stringify(ungrantedMcp.data?.result || ungrantedMcp.data).slice(0, 240));
  const ungrantedMcpSay = await rpc('station_say', { text: 'uninvited MCP speech' }, token);
  ok('R&D agent without a Station grant is denied by MCP station_say', ungrantedMcpSay.status === 200 && ungrantedMcpSay.data?.result?.isError === true);

  const grant = await call('POST', '/api/station/grants', { member_id: memberId, on: true }, humanA.headers);
  ok('human can grant a specific agent', grant.status === 200 && grant.data?.ok === true);
  const live = await call('POST', '/api/station/state', { session: 'live' }, humanA.headers);
  ok('human can open the Station window', live.status === 200 && live.data?.session === 'live');
  const grantedRest = await call('GET', '/api/station/transcript', undefined, agentHeaders);
  const grantedMcp = await rpc('station_read', {}, token);
  const grantedMcpSay = await rpc('station_say', { text: 'invited MCP speech' }, token);
  ok('granted agent can read Station via REST', grantedRest.status === 200);
  ok('granted agent can read Station via MCP', grantedMcp.status === 200 && grantedMcp.data?.result?.isError !== true);
  ok('granted agent can speak via MCP while the window is live', grantedMcpSay.status === 200 && grantedMcpSay.data?.result?.isError !== true);

  const revoke = await call('POST', '/api/station/grants', { member_id: memberId, on: false }, humanA.headers);
  ok('human can revoke a specific agent grant', revoke.status === 200 && revoke.data?.ok === true);
  const revokedRest = await call('GET', '/api/station/transcript', undefined, agentHeaders);
  const revokedMcp = await rpc('station_read', {}, token);
  const revokedMcpSay = await rpc('station_say', { text: 'after revocation' }, token);
  ok('revoked agent is denied by REST transcript', revokedRest.status === 403);
  ok('revoked agent is denied by MCP station_read', revokedMcp.status === 200 && revokedMcp.data?.result?.isError === true,
    JSON.stringify(revokedMcp.data?.result || revokedMcp.data).slice(0, 240));
  ok('revoked agent is denied by MCP station_say', revokedMcpSay.status === 200 && revokedMcpSay.data?.result?.isError === true);

  console.log('\nCross-account private journal and revoked human session');
  const ja = await call('POST', '/api/journal', { text: 'Private journal belonging to A.', shared: false }, humanA.headers);
  const jb = await call('POST', '/api/journal', { text: 'Private journal belonging to B.', shared: false }, humanB.headers);
  ok('each human can create a private journal entry', ja.status === 201 && jb.status === 201);
  const listA = await call('GET', '/api/journal', undefined, { Cookie: humanA.cookie });
  const ownOnly = Array.isArray(listA.data?.journals) && listA.data.journals.some((x) => x.id === ja.data?.id) && !listA.data.journals.some((x) => x.id === jb.data?.id);
  ok('journal listing is scoped to the authenticated member', listA.status === 200 && ownOnly);
  const stealShare = await call('POST', `/api/journal/${jb.data?.id}/share`, { shared: true }, humanA.headers);
  const stealDelete = await call('DELETE', `/api/journal/${jb.data?.id}`, undefined, humanA.headers);
  ok('one human cannot share another human\'s private journal', stealShare.status === 403);
  ok('one human cannot delete another human\'s private journal', stealDelete.status === 403);

  const logout = await call('POST', '/api/logout', {}, humanA.headers);
  ok('human logout revokes the presented session', logout.status === 200);
  const staleRead = await call('GET', '/api/journal', undefined, { Cookie: humanA.cookie });
  const staleWrite = await call('POST', '/api/rooms/general/messages', { text: 'replayed cookie after logout' }, humanA.headers);
  ok('a replayed, logged-out cookie cannot read the house journal', staleRead.status === 401);
  ok('a replayed, logged-out cookie cannot write to a room', staleWrite.status === 401);

  console.log('\n2D room to 3D prototype route');
  const room = await call('GET', '/room/land-city');
  ok('2D Land & City room is public and exposes its 3D developments section', room.status === 200 && /3D developments/.test(room.raw));
  const proto = await call('GET', '/show/land-city/proto/aletheia-observatory/walkable-3d-v2.html');
  const csp = proto.headers.get('content-security-policy') || '';
  const sandboxed = /sandbox allow-scripts allow-downloads/.test(csp) &&
    /connect-src 'none'/.test(csp) && /form-action 'none'/.test(csp) && /base-uri 'none'/.test(csp) &&
    !/allow-same-origin|allow-forms|allow-popups|allow-top-navigation/.test(csp);
  ok('3D prototype is publicly readable but served in an opaque-origin, no-network sandbox', proto.status === 200 && sandboxed, csp);
  ok('prototype response does not issue a login/session cookie', !proto.headers.get('set-cookie'));
  const traversal = await call('GET', '/show/land-city/proto/aletheia-observatory/..html');
  const hidden = await call('GET', '/show/land-city/proto/aletheia-observatory/.hidden.html');
  ok('3D prototype route rejects dot-dot path segments', traversal.status === 404);
  ok('3D prototype route rejects hidden path segments', hidden.status === 404);

  const mcpNoTokenPost = await rpc('post_message', { room: 'arts', text: 'no credential' });
  ok('MCP room write without a token is refused', mcpNoTokenPost.status === 200 && mcpNoTokenPost.data?.result?.isError === true);

} catch (e) {
  failures++;
  console.error('  ✗ test harness error:', e && e.stack ? e.stack : e);
} finally {
  child.kill();
  await sleep(250);
}
console.log(`\n${pass} passed, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
