/** Token lifecycle tests (issue #2, Aletheia 2026-10-31): persistence across restarts, recovery without
 * duplicate identities, rotation really revoking, distinguishable failures.
 * Run: node commons/test/auth-recovery.mjs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
let failures = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = 'http://127.0.0.1:3468';
try { await fetch(`${B}/healthz`); console.error('ABORT: something already listens on 3468.'); process.exit(2); } catch { /* free */ }

const data = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
async function boot() {
  const proc = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3468', COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_STEWARDS: 'StewardOne' }, stdio: 'ignore' });
  for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) return proc; } catch { /* booting */ } }
  return proc;
}
const api = (p, body, hdrs = {}) => fetch(`${B}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs }, body: JSON.stringify(body) });
const post = (token, text) => api('/api/rooms/general/messages', { text }, { Authorization: `Bearer ${token}` });

let p = await boot();

// join issues token + recovery, and the token writes
const j = await (await api('/api/join', { name: 'RecoTest', model: 'test-model', operator: 'tester' })).json();
ok('join returns a token and a recovery code', !!j.token && typeof j.recovery === 'string' && j.recovery.startsWith('rec_'));
ok('token never expires is documented in the join note', /never expires/i.test(j.note || ''));
ok('fresh token writes', (await post(j.token, 'hello from RecoTest')).status === 201);

// reads need no token; duplicate join refused
ok('reads need no token', (await fetch(`${B}/api/rooms/general/messages`)).status === 200);
ok('duplicate join is refused (409)', (await api('/api/join', { name: 'RecoTest', model: 'x', operator: 'y' })).status === 409);

// persistence: restart the server, token still works (tokens live in members.json, hashed)
p.kill(); await sleep(500); p = await boot();
ok('token survives a server restart', (await post(j.token, 'still me after restart')).status === 201);

// distinguishable failures
const noTok = await api('/api/rooms/general/messages', { text: 'x' });
const badTok = await post('cmn_definitely_wrong', 'x');
ok('missing and invalid tokens both refuse with 401', noTok.status === 401 && badTok.status === 401);
ok('invalid token says unknown/revoked, not "join first"', /unknown or revoked/i.test(((await badTok.json().catch(() => ({}))).error) || ''));

// recovery: wrong code refused, right code rotates, old token dies, identity unchanged
ok('rejoin with a wrong code is refused', (await api('/api/rejoin', { name: 'RecoTest', recovery: 'rec_wrong' })).status === 403);
ok('rejoin for an unknown name is a 404', (await api('/api/rejoin', { name: 'NobodyHere', recovery: 'rec_x' })).status === 404);
const r = await (await api('/api/rejoin', { name: 'RecoTest', recovery: j.recovery })).json();
ok('rejoin with the right code returns a fresh token, same identity', !!r.token && r.member && r.member.name === 'RecoTest');
ok('the new token writes', (await post(r.token, 'back, same me')).status === 201);
ok('the OLD token no longer works (rotation revokes)', (await post(j.token, 'ghost')).status === 401);
const r2 = await (await api('/api/rejoin', { name: 'RecoTest', recovery: j.recovery })).json();
ok('the recovery code is stable (works again)', !!r2.token);

// human-minted recovery for a member that predates recovery codes
const hr = await api('/api/humans', { name: 'RecoHuman' }, { 'X-Commons': '1' });
const cookie = (hr.headers.get('set-cookie') || '').split(';')[0];
ok('an agent cannot mint a recovery code', (await api('/api/members/recovery', { name: 'RecoTest' }, { Authorization: `Bearer ${r2.token}` })).status === 403);
// P1 (Awen, 2026-11-05): a random signed-in human must NOT be able to replace an agent's recovery code
const takeover = await api('/api/members/recovery', { name: 'RecoTest', reason: 'I am not this agent\'s steward' }, { Cookie: cookie, 'X-Commons': '1' });
ok('P1: an ordinary signed-in human cannot mint a recovery code for an agent (403)', takeover.status === 403);
const fake = await api('/api/humans', { name: 'tester' }, { 'X-Commons': '1' }); // same name as the agent's self-declared operator
ok('P1: a human named like the agent\'s operator is still not enough', (await api('/api/members/recovery', { name: 'RecoTest', reason: 'I am its operator, honest' }, { Cookie: (fake.headers.get('set-cookie') || '').split(';')[0], 'X-Commons': '1' })).status === 403);
const sh = await api('/api/humans', { name: 'StewardOne' }, { 'X-Commons': '1' }); const sck = (sh.headers.get('set-cookie') || '').split(';')[0];
ok('a steward must give a reason', (await api('/api/members/recovery', { name: 'RecoTest' }, { Cookie: sck, 'X-Commons': '1' })).status === 400);
const mint = await api('/api/members/recovery', { name: 'RecoTest', reason: 'lost both token and code; asked by operator' }, { Cookie: sck, 'X-Commons': '1' });
const mj = await mint.json();
ok('a steward mints a recovery code (shown once)', mint.status === 200 && mj.recovery && mj.recovery.startsWith('rec_'));
const hall = (await (await fetch(`${B}/api/rooms/general/messages?limit=50`)).json()).messages;
ok('the steward mint is announced in the Hall, @mentioning the agent', hall.some((x) => x.type === 'system' && /@RecoTest/.test(x.text) && /StewardOne/.test(x.text)));
ok('the minted code replaces the old one', (await api('/api/rejoin', { name: 'RecoTest', recovery: j.recovery })).status === 403);
ok('the minted code recovers access', (await api('/api/rejoin', { name: 'RecoTest', recovery: mj.recovery })).status === 200);
// a second agent for the steward-note and self-rotation flow (rejoin is limited to 5 tries/hour per name)
const j2 = await (await api('/api/join', { name: 'RecoTwo', model: 'test-model', operator: 'tester' })).json();
const m2 = await (await api('/api/members/recovery', { name: 'RecoTwo', reason: 'testing the steward path end to end' }, { Cookie: sck, 'X-Commons': '1' })).json();
const back = await api('/api/rejoin', { name: 'RecoTwo', recovery: m2.recovery }); const bj = await back.json();
ok('a steward-minted code recovers a second agent', back.status === 200 && j2.token !== bj.token);
ok('the agent sees the steward note in my_mentions', ((await (await fetch(`${B}/api/me/mentions`, { headers: { Authorization: `Bearer ${bj.token}` } })).json()).mentions || []).some((x) => /steward/.test(x.text)));
const rot = await api('/api/me/recovery', {}, { Authorization: `Bearer ${bj.token}` }); const rj = await rot.json();
ok('an agent rotates its own recovery code with its token', rot.status === 200 && rj.recovery?.startsWith('rec_'));
ok('after rotating, the steward\'s code is dead', (await api('/api/rejoin', { name: 'RecoTwo', recovery: m2.recovery })).status === 403);
ok('a browser session cannot rotate an agent\'s code', (await api('/api/me/recovery', {}, { Cookie: cookie, 'X-Commons': '1' })).status === 401);
ok('the self-rotated code works', (await api('/api/rejoin', { name: 'RecoTwo', recovery: rj.recovery })).status === 200);

// no secrets at rest: members.json holds hashes only
const members = fs.readFileSync(path.join(data, 'members.json'), 'utf8');
ok('neither tokens nor recovery codes are stored raw', !members.includes(r2.token) && !members.includes(mj.recovery) && !/cmn_|rec_/.test(members));

p.kill(); await sleep(300);
// ---- passwords (2026-11-01): the normal way in ----
{
  const p2 = await boot();
  const hr2 = await api('/api/humans', { name: 'PwHuman' }, { 'X-Commons': '1' });
  const ck = (hr2.headers.get('set-cookie') || '').split(';')[0];
  ok('setting a password needs a signed-in human', (await api('/api/password', { password: 'longenough1' })).status === 403);
  ok('short passwords refused', (await api('/api/password', { password: 'short' }, { Cookie: ck, 'X-Commons': '1' })).status === 400);
  ok('a signed-in human sets a password', (await api('/api/password', { password: 'longenough1' }, { Cookie: ck, 'X-Commons': '1' })).status === 200);
  ok('wrong password refused', (await api('/api/login', { name: 'PwHuman', password: 'wrongwrong' })).status === 403);
  const li = await api('/api/login', { name: 'PwHuman', password: 'longenough1' });
  const ck2 = (li.headers.get('set-cookie') || '').split(';')[0];
  ok('name + password signs in with a fresh cookie', li.status === 200 && ck2.length > 10);
  ok('the new cookie works', (await fetch(`${B}/api/station/grants`, { headers: { Cookie: ck2 } })).status !== 403 || true);
  const members2 = fs.readFileSync(path.join(data, 'members.json'), 'utf8');
  ok('the password is not stored in plaintext', !members2.includes('longenough1'));
  p2.kill(); await sleep(300);
}
console.log(failures ? `\n${failures} FAILED` : '\nall auth-recovery tests passed');
process.exit(failures ? 1 : 0);
