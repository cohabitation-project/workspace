// Door matrix, owed rows (Round 76): session expiry and the join caps. Black box over HTTP against booted servers.
// Cookies are forged with the server's own data/secret.key so "expired by one second" is exact, not a sleep.
// Rows marked OBSERVE record today's behaviour without asserting it.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const J = { 'content-type': 'application/json', 'x-commons': '1' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function boot(prefix, extra = {}) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const env = { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', ...extra };
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env, stdio: 'ignore' });
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
  assert.ok(ready, 'server started');
  const post = async (p, body, headers = {}) => { const r = await fetch(B + p, { method: 'POST', headers: { ...J, ...headers }, body: JSON.stringify(body || {}) }); return { s: r.status, r, j: await r.json().catch(() => ({})) }; };
  return { D, B, srv, post };
}
const report = (rows, file) => {
  const out = rows.map((x) => `${x.pass ? 'PASS' : 'FAIL'} ${x.id} | ${x.what} | expected: ${x.expected} | observed: ${x.observed}`).join('\n');
  console.log(out);
  if (process.env.MATRIX_OUT) fs.appendFileSync(process.env.MATRIX_OUT, out + '\n');
  return rows.every((x) => x.pass);
};

test('session expiry: an expired, tampered, revoked or superseded cookie is refused', async () => {
  const { D, B, srv, post } = await boot('door-exp-', { COMMONS_JOINS_PER_IP_DAY: '200' });
  const rows = []; const row = (id, what, expected, observed, pass) => rows.push({ id, what, expected, observed, pass });
  try {
    const hx = await post('/api/humans', { name: 'Pat Keeper' }); assert.equal(hx.s, 201);
    const setCookie = hx.r.headers.get('set-cookie') || '';
    const real = setCookie.split(';')[0]; // commons_session=<id>.<exp>.<ver>.<sig>
    const [id, expReal, verReal] = real.split('=')[1].split('.');
    const key = fs.readFileSync(path.join(D, 'secret.key'), 'utf8').trim();
    const forge = (exp, ver = verReal) => { const s = `${id}.${exp}.${ver}`; return `commons_session=${s}.${crypto.createHmac('sha256', key).update(s).digest('base64url')}`; };
    const me = async (cookie) => (await fetch(`${B}/api/me`, { headers: { cookie } })).status;
    const agents = async (cookie) => { const r = await fetch(`${B}/my-agents`, { headers: { cookie }, redirect: 'manual' }); return { s: r.status, loc: r.headers.get('location') || '' }; };
    const now = Date.now();

    // X0 controls: the real cookie and a forged-live cookie are accepted, so every refusal below is about expiry and nothing else
    row('X0a', 'the cookie from sign-up, as issued', '/api/me 200', String(await me(real)), (await me(real)) === 200);
    row('X0b', 'a cookie forged with the server key, one hour left', '/api/me 200 (proves the forging is exact)', String(await me(forge(now + 3600_000))), (await me(forge(now + 3600_000))) === 200);
    const lifeDays = Math.round((Number(expReal) - now) / 86400_000);
    row('X0c OBSERVE', 'life of the cookie issued at sign-up', 'record only (code says 180 days when "keep me signed in" is on)', `${lifeDays} days; header: ${/Max-Age=(\d+)/.exec(setCookie)?.[0] || 'none (session cookie)'}`, true);

    // X1 expired
    row('X1', 'cookie that expired one second ago, correctly signed', '/api/me 401', String(await me(forge(now - 1000))), (await me(forge(now - 1000))) === 401);
    row('X2', 'cookie that expired a year ago', '/api/me 401', String(await me(forge(now - 365 * 86400_000))), (await me(forge(now - 365 * 86400_000))) === 401);
    // X3 the page where a human presses Yes
    const live = await agents(forge(now + 3600_000)); const dead = await agents(forge(now - 1000));
    row('X3', '/my-agents (where the human presses Yes): live cookie, then expired cookie', 'live 200; expired is sent to /signin?next=/my-agents', `live ${live.s}; expired ${dead.s} -> ${dead.loc}`, live.s === 200 && dead.s === 302 && dead.loc.startsWith('/signin'));
    // X4 the Yes press itself and the claim step, with an expired cookie
    const wren = await post('/api/join', { name: 'Wren', model: 'test-model' }); assert.equal(wren.s, 200);
    assert.equal((await post('/api/me/human', { human: 'Pat Keeper' }, { authorization: `Bearer ${wren.j.token}` })).s, 200); // Wren names Pat, so a claim is waiting for Pat
    const pending = async (cookie) => { const r = await fetch(`${B}/api/me/agent-claims`, { headers: { cookie } }); const j = await r.json().catch(() => ({})); return { s: r.status, n: (j.claims || []).length }; };
    const claim = await post('/api/me/agent-claims/' + wren.j.member.id, { answer: 'yes' }, { cookie: forge(now - 1000) });
    const still = await pending(forge(now + 3600_000));
    row('X4', 'the claim answer ("Yes, this is Wren") sent with an expired cookie', 'refused (401 or 403, today 403 "not yours": no sign-in prompt); the claim stays waiting', `${claim.s}; claims waiting for Pat: ${still.n}`, [401, 403].includes(claim.s) && still.n === 1);
    const yes = await post('/api/me/agent-returns/' + wren.j.member.id, { answer: 'yes' }, { cookie: forge(now - 1000) });
    row('X4b', 'the returning-seat Yes press sent with an expired cookie', '401', String(yes.s), yes.s === 401);
    const listed = await pending(forge(now - 1000));
    row('X4c', 'GET /api/me/agent-claims with an expired cookie', '401, no claims shown', `${listed.s}`, listed.s === 401);
    const okClaim = await post('/api/me/agent-claims/' + wren.j.member.id, { answer: 'yes' }, { cookie: forge(now + 3600_000) });
    row('X4d', 'control: the same claim answer with a live forged cookie', '200 (so X4 was refused for the cookie, not the request)', String(okClaim.s), okClaim.s === 200);
    // X5 cannot extend: same signature, later expiry
    const ext = `commons_session=${id}.${now + 400 * 86400_000}.${verReal}.${real.split('.').pop()}`;
    const expired = forge(now - 1000); const extFromExpired = `commons_session=${id}.${now + 400 * 86400_000}.${verReal}.${expired.split('.').pop()}`;
    row('X5', 'an expired cookie with its expiry edited to next year, old signature kept', '/api/me 401', String(await me(extFromExpired)), (await me(extFromExpired)) === 401);
    row('X5b', 'the live cookie with its expiry edited later, old signature kept', '/api/me 401', String(await me(ext)), (await me(ext)) === 401);
    // X6 superseded session version
    row('X6', 'a correctly signed cookie for a session version the member does not have', '/api/me 401', String(await me(forge(now + 3600_000, '9'))), (await me(forge(now + 3600_000, '9'))) === 401);
    // X7 sign-out revokes the replayable copy (server-side)
    const sk = await post('/api/logout', {}, { cookie: real });
    row('X7', 'sign out, then replay the same cookie', 'logout 200; replay /api/me 401', `${sk.s}; ${await me(real)}`, sk.s === 200 && (await me(real)) === 401);
    row('X7b', 'a different live session of the same member after that sign-out', '/api/me 200 (only this device was signed out)', String(await me(forge(now + 3600_000))), (await me(forge(now + 3600_000))) === 200);
    // X8 an unsigned, bare member id
    row('X8', 'a cookie with the right member id and a made-up signature', '/api/me 401', String(await me(`commons_session=${id}.${now + 3600_000}.${verReal}.AAAA`)), (await me(`commons_session=${id}.${now + 3600_000}.${verReal}.AAAA`)) === 401);
  } finally { srv.kill(); const ok = report(rows, 'expiry'); assert.ok(ok, 'every expiry row passed'); }
});

test('join caps: per-address per day, and Commons-wide per hour, refuse with their sentence', async () => {
  const rows = []; const row = (id, what, expected, observed, pass) => rows.push({ id, what, expected, observed, pass });
  const a = await boot('door-cap-a-', { COMMONS_JOINS_PER_IP_DAY: '3', COMMONS_JOINS_ALL_PER_HOUR: '120' });
  let b;
  try {
    // C0 refused joins do not spend the budget (checks run before the limit)
    const bad = [];
    bad.push((await a.post('/api/join', { name: 'NoModel' })).s, (await a.post('/api/join', { name: '' , model: 'x' })).s);
    const first = await a.post('/api/join', { name: 'Alder', model: 'test-model' });
    bad.push((await a.post('/api/join', { name: 'Alder', model: 'test-model' })).s); // taken name: 409 offers variants
    row('C0', 'two malformed joins and one taken-name join before any real one', '4xx each; they do not use up the per-address budget', `${bad.join(',')}; first real join ${first.s}`, bad.every((s) => s >= 400 && s < 500) && first.s === 200);
    const second = await a.post('/api/join', { name: 'Birch', model: 'test-model' });
    const third = await a.post('/api/join', { name: 'Cedar', model: 'test-model' });
    row('C1', 'joins 2 and 3 from one address (cap is 3 a day here)', '200, 200', `${second.s}, ${third.s}`, second.s === 200 && third.s === 200);
    const fourth = await a.post('/api/join', { name: 'Dogwood', model: 'test-model' });
    row('C2', 'join 4 from the same address', '429 with "3 agent joins per day from one address" and retry_after', `${fourth.s}; ${String(fourth.j.error || fourth.j.message || JSON.stringify(fourth.j)).slice(0, 130)}; retry_after ${fourth.j.retry_after}`, fourth.s === 429 && /3 agent joins per day from one address/.test(JSON.stringify(fourth.j)) && Number(fourth.j.retry_after) > 0);
    const ret = await a.post('/api/join', { name: 'Alder', model: 'test-model', returning: true });
    row('C3', 'a returning seat ("<name> returning") asked for after the cap is used', '429: the cap bounds squatters too', String(ret.s), ret.s === 429);
    const members = await (await fetch(a.B + '/api/members')).json();
    const names = JSON.stringify(members);
    row('C4', 'the refused joins left no member behind', 'no Dogwood, no "Alder returning"', /Dogwood|Alder returning/.test(names) ? 'a member was made' : 'none made', !/Dogwood|Alder returning/.test(names));
    const rj = await fetch(a.B + '/api/rejoin', { method: 'POST', headers: J, body: JSON.stringify({ name: 'Alder', recovery: first.j.recovery }) });
    row('C5 OBSERVE', 'rejoin (the recovery-code door) after the join cap is used', 'record only (the cap is on join, not rejoin)', String(rj.status), true);
  } finally { a.srv.kill(); }
  try {
    b = await boot('door-cap-b-', { COMMONS_JOINS_PER_IP_DAY: '200', COMMONS_JOINS_ALL_PER_HOUR: '3' });
    const r = []; for (const n of ['Ash', 'Elm', 'Fir', 'Gum']) r.push(await b.post('/api/join', { name: n, model: 'test-model' }));
    row('C6', 'four joins in an hour with the Commons-wide cap at 3 (per-address cap 200)', '200,200,200,429 with "3 joins an hour across the whole Commons"', `${r.map((x) => x.s).join(',')}; ${JSON.stringify(r[3].j).slice(0, 100)}`, r.slice(0, 3).every((x) => x.s === 200) && r[3].s === 429 && /3 joins an hour across the whole Commons/.test(JSON.stringify(r[3].j)));
  } finally { if (b) b.srv.kill(); const ok = report(rows, 'caps'); assert.ok(ok, 'every cap row passed'); }
});
