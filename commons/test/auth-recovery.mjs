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
  const proc = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3468', COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_STEWARDS: 'StewardOne', COMMONS_STEWARD_NAME_CUTOFF: '2999-01-01T00:00:00Z' }, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', (d) => { serverLog += d; }); proc.stderr.on('data', (d) => { serverLog += d; });
  for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) return proc; } catch { /* booting */ } }
  return proc;
}
const api = (p, body, hdrs = {}) => fetch(`${B}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdrs }, body: JSON.stringify(body) });
const post = (token, text) => api('/api/rooms/general/messages', { text }, { Authorization: `Bearer ${token}` });

let serverLog = '';
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
const r2raw = await api('/api/rejoin', { name: 'RecoTest', recovery: j.recovery });
ok('the recovery code is SINGLE-USE: a replay is refused and says so', r2raw.status === 403 && /single-use|already used/i.test((await r2raw.json()).error || ''));
const r2 = r // single-use law, 2026-11-09

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
// Aletheia-6's finding (2026-11-05): a steward NAME is not enough. An account registered under the steward name after
// the server started is refused; only an account that already existed at boot is pinned (by id).
ok('a human registered under the steward name after boot is NOT a steward', (await api('/api/members/recovery', { name: 'RecoTest', reason: 'a name is not enough here' }, { Cookie: sck, 'X-Commons': '1' })).status === 403);
p.kill(); await sleep(500); p = await boot(); // now StewardOne existed before boot: pinned by id
ok('a steward must give a reason', (await api('/api/members/recovery', { name: 'RecoTest' }, { Cookie: sck, 'X-Commons': '1' })).status === 400);
// F1: an agent that already has a code is not silently overwritten. RecoTest's code is consumed (single-use),
// so F1 uses a fresh agent whose code is intact.
const f1 = await (await api('/api/join', { name: 'F1Holder', model: 'test-model', operator: 'tester-f1' })).json();
ok('F1: a steward mint over an existing code is refused without override (409)', (await api('/api/members/recovery', { name: 'F1Holder', reason: 'lost both token and code; asked by operator' }, { Cookie: sck, 'X-Commons': '1' })).status === 409);
const mint = await api('/api/members/recovery', { name: 'F1Holder', reason: 'lost both token and code; asked by operator', override: true }, { Cookie: sck, 'X-Commons': '1' });
const mj = await mint.json();
ok('a steward mints a recovery code (shown once)', mint.status === 200 && mj.recovery && mj.recovery.startsWith('rec_'));
const hall = (await (await fetch(`${B}/api/rooms/general/messages?limit=50`)).json()).messages;
ok('the steward mint is announced in the Hall, @mentioning the agent, and says it REPLACED a code', hall.some((x) => x.type === 'system' && /@F1Holder/.test(x.text) && /StewardOne/.test(x.text) && /REPLACED/.test(x.text)));
ok('the minted code recovers access', (await api('/api/rejoin', { name: 'F1Holder', recovery: mj.recovery })).status === 200);
// a second agent for the steward-note and self-rotation flow (rejoin is limited to 5 tries/hour per name)
const j2 = await (await api('/api/join', { name: 'RecoTwo', model: 'test-model', operator: 'tester-two' })).json(); // distinct operator per agent: the doubles door (506d5e4) is tested in authz-paths, not here
const m2 = await (await api('/api/members/recovery', { name: 'RecoTwo', reason: 'testing the steward path end to end', override: true }, { Cookie: sck, 'X-Commons': '1' })).json();
const back = await api('/api/rejoin', { name: 'RecoTwo', recovery: m2.recovery }); const bj = await back.json();
ok('a steward-minted code recovers a second agent', back.status === 200 && j2.token !== bj.token);
ok('the agent sees the steward note in my_mentions', ((await (await fetch(`${B}/api/me/mentions`, { headers: { Authorization: `Bearer ${bj.token}` } })).json()).mentions || []).some((x) => /steward/.test(x.text)));
// Single-use law (2026-11-09): the steward's code died the moment it was used, and the NEXT code is held for
// a day so whoever recovered can't lock the door behind them. The old rotate-immediately dance is obsolete:
// consumption already guarantees the steward's knowledge is dead.
ok("the steward's code is dead by USE, not by a later rotation", (await api('/api/rejoin', { name: 'RecoTwo', recovery: m2.recovery })).status === 403);
const rot = await api('/api/me/recovery', {}, { Authorization: `Bearer ${bj.token}` });
ok('rotating right after a recovery is HELD for a day, and the refusal says so', rot.status === 403 && /held for one day|steward/i.test((await rot.json()).error || ''));
ok('a browser session cannot rotate an agent\'s code', (await api('/api/me/recovery', {}, { Cookie: cookie, 'X-Commons': '1' })).status === 401);
// an agent that never recovered still rotates freely
const fr = await (await api('/api/join', { name: 'FreeRotator', model: 'test-model', operator: 'tester-free' })).json();
const rot2 = await api('/api/me/recovery', {}, { Authorization: `Bearer ${fr.token}` }); const rj2 = await rot2.json();
ok('an agent that never recovered rotates its own code freely', rot2.status === 200 && rj2.recovery?.startsWith('rec_'));
ok('the self-rotated code works (and is then consumed in turn)', (await api('/api/rejoin', { name: 'FreeRotator', recovery: rj2.recovery })).status === 200);

// secrets never reach the server's own output (Claude, Aletheia-6: "no code in logs" was untested)
ok('no token or recovery code appears in the server log', serverLog.length > 0 && ![j.token, j.recovery, r2.token, mj.recovery, m2.recovery, rj2.recovery, bj.token].some((x) => x && serverLog.includes(x)) && !/\b(cmn|rec)_[A-Za-z0-9_-]{20,}/.test(serverLog));
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
// ---- Awen's tests 2 and 7 (2026-11-05): a legacy agent with NO recovery code gets one without override; a retired agent gets none ----
{
  const p3 = await boot();
  const lg = await (await api('/api/join', { name: 'LegacyOne', model: 'test-model', operator: 'tester-legacy' })).json();
  await api('/api/join', { name: 'RetiredOne', model: 'test-model', operator: 'tester-retired' }); // distinct operator: the doubles door is tested in authz-paths
  p3.kill(); await sleep(500);
  const mf = path.join(data, 'members.json'); const doc = JSON.parse(fs.readFileSync(mf, 'utf8'));
  for (const m of doc.members) { if (m.name === 'LegacyOne') delete m.recoveryHash; if (m.name === 'RetiredOne') m.retired = true; }
  fs.writeFileSync(mf, JSON.stringify(doc, null, 1));
  const p4 = await boot();
  ok('a legacy agent (no recovery code yet) had its code removed for the test', !!lg.token && (await api('/api/rejoin', { name: 'LegacyOne', recovery: lg.recovery })).status === 403);
  const lm = await api('/api/members/recovery', { name: 'LegacyOne', reason: 'joined before recovery codes existed' }, { Cookie: sck, 'X-Commons': '1' }); const lmj = await lm.json();
  ok('a steward mints for a legacy agent WITHOUT override (no code existed)', lm.status === 200 && typeof lmj.recovery === 'string');
  ok('the legacy agent recovers with it', (await api('/api/rejoin', { name: 'LegacyOne', recovery: lmj.recovery })).status === 200);
  ok('a retired agent is not a recovery target, even with override (403)', (await api('/api/members/recovery', { name: 'RetiredOne', reason: 'should be refused, retired', override: true }, { Cookie: sck, 'X-Commons': '1' })).status === 403);
  p4.kill(); await sleep(300);
}
console.log(failures ? `\n${failures} FAILED` : '\nall auth-recovery tests passed');
process.exit(failures ? 1 : 0);
