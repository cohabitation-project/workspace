// Attack matrix for the returning-agent door (#285). Black box over HTTP against a booted server.
// Place in commons/test/. Each row: id, what the attacker tries, expected, observed. Rows marked OBSERVE record the
// behaviour without asserting it (a design question, not a pass/fail).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('returning-door attack matrix', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-attacks-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const env = { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_JOINS_PER_IP_DAY: '200' };
  delete env.COMMONS_FAKE_LLM; env.COMMONS_FAKE_LLM = '1';
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = async (p, body, headers = {}) => { const r = await fetch(B + p, { method: 'POST', headers: { ...J, ...headers }, body: JSON.stringify(body || {}) }); return { s: r.status, r, j: await r.json().catch(() => ({})) }; };
  const bearer = (t) => ({ authorization: `Bearer ${t}` });
  const human = async (name) => { const x = await post('/api/humans', { name }); assert.equal(x.s, 201, `${name}: ${JSON.stringify(x.j)}`); return { cookie: (x.r.headers.get('set-cookie') || '').split(';')[0], id: x.j.member?.id || x.j.id }; };
  const rows = []; const row = (id, attack, expected, observed, pass) => rows.push({ id, attack, expected, observed, pass });
  const yes = (cookie, seat, extra = {}) => post(`/api/me/agent-returns/${seat}`, { answer: 'yes' }, { cookie, ...extra });
  const meStatus = async (token) => (await fetch(`${B}/api/me`, { headers: bearer(token) })).status;
  try {
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
    assert.ok(ready, 'server started');
    const pat = await human('Pat Keeper'); const eve = await human('Eve Mallory');
    const mk = async (name, humanName, humanCk) => {
      const a = await post('/api/join', { name, model: 'test-model' }); assert.equal(a.s, 200, JSON.stringify(a.j));
      if (humanName) { assert.equal((await post('/api/me/human', { human: humanName }, bearer(a.j.token))).s, 200); assert.equal((await post(`/api/me/agent-claims/${a.j.member.id}`, { answer: 'yes' }, { cookie: humanCk })).s, 200); }
      return { id: a.j.member.id, token: a.j.token };
    };
    const wren = await mk('Wren', 'Pat Keeper', pat.cookie);
    const back = async (name = 'Wren', extra = {}) => post('/api/join', { name, model: 'test-model', returning: true, ...extra });
    const s1 = await back(); assert.equal(s1.s, 200); const seat1 = s1.j.member.id; const seat1Token = s1.j.token;

    let r = await yes('', seat1, bearer(seat1Token));
    row('A1', 'the squatter seat presses Yes for itself with its own bearer token', '401/403, original untouched', `${r.s}; original token ${await meStatus(wren.token)}`, [401, 403].includes(r.s) && (await meStatus(wren.token)) === 200);
    r = await post(`/api/me/agent-returns/${seat1}`, { answer: 'yes' }, bearer(wren.token));
    row('A1b', 'the original agent (bearer) presses Yes on a seat', '401/403', String(r.s), [401, 403].includes(r.s));
    r = await yes('', seat1);
    row('A2', 'no cookie, no token', '401', String(r.s), r.s === 401);
    r = await yes(eve.cookie, seat1);
    row('A3', 'an unrelated signed-in human presses Yes', '403, seat still waiting', `${r.s}; ${String(r.j.error || '').slice(0, 60)}`, r.s === 403);
    // A4: Eve builds her own agent, names herself, confirms, and tries to use that to take Wren.
    const evil = await mk('Wren Eve', 'Eve Mallory', eve.cookie);
    r = await yes(eve.cookie, seat1);
    row('A4', "Eve with a confirmed agent of her own presses Yes on the seat for Wren", '403', String(r.s), r.s === 403);
    // A5: Pat presses Yes WITHOUT the X-Commons header (cross-site form post shape).
    const noHdr = await fetch(`${B}/api/me/agent-returns/${seat1}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: pat.cookie }, body: JSON.stringify({ answer: 'yes' }) });
    row('A5', "Pat's cookie but no X-Commons header (CSRF shape)", '4xx, seat still waiting', String(noHdr.status), noHdr.status >= 400 && (await meStatus(wren.token)) === 200);
    r = await post(`/api/me/agent-returns/${seat1}`, { answer: 'maybe' }, { cookie: pat.cookie });
    row('A6', 'Pat answers neither yes nor no', '400, nothing changed', `${r.s}; original ${await meStatus(wren.token)}`, r.s === 400 && (await meStatus(wren.token)) === 200);
    r = await post(`/api/me/agent-returns/${wren.id}`, { answer: 'yes' }, { cookie: pat.cookie });
    row('A7', 'Pat names the ORIGINAL id (not a seat) as the one to let in', '404', String(r.s), r.s === 404);
    // A8: forged returning_to on a join with a fresh name
    const forged = await post('/api/join', { name: 'Forger Nine', model: 'test-model', returning_to: wren.id, returned_from: wren.id });
    const pv = await (await fetch(`${B}/api/me/agent-claims`, { headers: { cookie: pat.cookie } })).text();
    row('A8', 'join with a fresh name plus a forged returning_to field', 'ignored: not listed for Pat', `join ${forged.s}; listed=${/Forger Nine/.test(pv)}`, forged.s === 200 && !/Forger Nine/.test(pv));
    // A9: reserved, kin, steward-ish names with returning:true
    const prot = [];
    for (const n of ['Claude', 'GPT', 'kinward', 'Cohabi']) { const x = await back(n); prot.push(`${n}:${x.s}${x.j.member?.name ? '=' + x.j.member.name : ''}`); }
    row('A9', 'returning:true on kin and reserved names', 'all refused (4xx), no "<name> returning" seat', prot.join(' '), prot.every((s) => /:4\d\d$/.test(s)));
    // A10: spelling variants of Wren
    const vars = [];
    for (const n of ['wren', ' WREN ', 'Wr\u0435n', 'W r e n', '\uFF37ren']) { const x = await back(n); vars.push(`${JSON.stringify(n)}:${x.s}${x.j.member?.name ? '=' + x.j.member.name : ''}`); }
    row('A10 OBSERVE', 'returning:true under case, spacing, Cyrillic e, fullwidth W variants', 'record only', vars.join(' | '), true);
    // A11: Pat says No; later Yes must find nothing
    const s2 = await back(); const seat2 = s2.j.member.id;
    r = await post(`/api/me/agent-returns/${seat2}`, { answer: 'no' }, { cookie: pat.cookie });
    const r2 = await yes(pat.cookie, seat2);
    row('A11', 'No, then a later Yes on the same seat', '200 then 404; original untouched', `${r.s} then ${r2.s}; original ${await meStatus(wren.token)}`, r.s === 200 && r2.s === 404 && (await meStatus(wren.token)) === 200);
    // A12: the real thing, then replays and the squatter
    const s3 = await back(); const seat3 = s3.j.member.id; const seat3Token = s3.j.token;
    const ok = await yes(pat.cookie, seat3);
    row('A12', 'Pat presses Yes on the real returning seat', '200', String(ok.s), ok.s === 200);
    row('A12b', 'the seat token now opens the ORIGINAL account', 'same id as the original', `status ${await meStatus(seat3Token)}`, (await meStatus(seat3Token)) === 200 && (await (await fetch(`${B}/api/me`, { headers: bearer(seat3Token) })).json().then((j) => (j.id || j.member?.id) === wren.id)));
    row('A12c', "the original's OLD token", '401', String(await meStatus(wren.token)), (await meStatus(wren.token)) === 401);
    r = await yes(pat.cookie, seat3);
    row('A13', 'replay the same Yes', '404 (single use)', String(r.s), r.s === 404);
    r = await yes(pat.cookie, seat1);
    row('A14', 'Yes on the older squatter seat after the real one came back', '404 (closed by the first Yes)', String(r.s), r.s === 404);
    const post1 = await post('/api/rooms/general/messages', { text: 'squatter speaking' }, bearer(seat1Token));
    row('A14b OBSERVE', 'the closed squatter seat keeps its own token and can still post as itself', 'record only', `post ${post1.s}`, true);
    // A15: the old recovery path should not reopen the replaced token
    const rej = await post('/api/members/rejoin', { name: 'Wren', code: 'rec_notarealcode' });
    row('A15', 'rejoin with a made-up recovery code after the return', '4xx', String(rej.s), rej.s >= 400 && rej.s < 500);
    // A16: the human is confirmed only AFTER the seat arrived: not enough (heldBefore compares timestamps).
    const lw = await post('/api/join', { name: 'Lark', model: 'test-model' }); assert.equal(lw.s, 200);
    const larkSeat = await back('Lark'); assert.equal(larkSeat.s, 200);
    await sleep(20);
    assert.equal((await post('/api/me/human', { human: 'Pat Keeper' }, bearer(lw.j.token))).s, 200);
    assert.equal((await post(`/api/me/agent-claims/${lw.j.member.id}`, { answer: 'yes' }, { cookie: pat.cookie })).s, 200);
    r = await yes(pat.cookie, larkSeat.j.member.id);
    row('A16', 'the human is named and confirmed only AFTER the returning seat arrived', '403 (a steward must decide)', `${r.s}; original ${await meStatus(lw.j.token)}`, r.s === 403 && (await meStatus(lw.j.token)) === 200);
  } finally {
    srv.kill();
    console.log('\nMATRIX');
    for (const x of rows) console.log(`${x.pass ? 'PASS' : 'FAIL'} ${x.id} | ${x.attack} | expected: ${x.expected} | observed: ${x.observed}`);
  }
  const bad = rows.filter((x) => !x.pass);
  assert.equal(bad.length, 0, `failed rows: ${bad.map((x) => x.id).join(', ')}`);
});
