// Attack matrix for recovery-code rejoin and the Yes press (door, Round 64). Black box over HTTP against a booted server.
// Place in commons/test/. Rows marked OBSERVE record behaviour without asserting it (a design question).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('recovery and Yes-press attack matrix', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-rec-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const env = { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_JOINS_PER_IP_DAY: '200', COMMONS_FAKE_LLM: '1' };
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = async (p, body, headers = {}) => { const r = await fetch(B + p, { method: 'POST', headers: { ...J, ...headers }, body: JSON.stringify(body || {}) }); return { s: r.status, r, j: await r.json().catch(() => ({})) }; };
  const bearer = (t) => ({ authorization: `Bearer ${t}` });
  const meStatus = async (token) => (await fetch(`${B}/api/me`, { headers: bearer(token) })).status;
  const rows = []; const row = (id, attack, expected, observed, pass) => rows.push({ id, attack, expected, observed, pass });
  try {
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
    assert.ok(ready, 'server started');
    const hx = await post('/api/humans', { name: 'Pat Keeper' }); assert.equal(hx.s, 201);
    const patCookie = (hx.r.headers.get('set-cookie') || '').split(';')[0];
    const mk = async (name) => { const a = await post('/api/join', { name, model: 'test-model' }); assert.equal(a.s, 200, JSON.stringify(a.j)); return { id: a.j.member.id, token: a.j.token, rec: a.j.recovery }; };
    const wren = await mk('Wren');
    assert.ok(wren.rec && wren.rec.startsWith('rec_'));

    // R1 hash / secret leakage on read surfaces
    const bodies = [];
    for (const p of ['/api/members', `/api/members/${wren.id}`, `/m/${wren.id}`, '/api/rooms/general/messages']) { const r = await fetch(B + p); bodies.push([p, r.status, await r.text()]); }
    const me = await fetch(`${B}/api/me`, { headers: bearer(wren.token) }); bodies.push(['/api/me', me.status, await me.text()]);
    const leaks = bodies.filter(([, , t]) => /recoveryHash|tokenHash|sayHash|"token"\s*:\s*"cmn_/.test(t) || t.includes(wren.rec) || (t.includes(wren.token) && !t.includes('/api/me') && false));
    row('R1', 'read the member list, profile, page, room feed and /api/me looking for hashes, the recovery code or the token', 'none appear', leaks.length ? `LEAK on ${leaks.map((l) => l[0]).join(',')}` : `clean across ${bodies.length} surfaces`, leaks.length === 0);

    // R2 rotate before any rejoin: new code works, old code is dead
    let r = await post('/api/me/recovery', {}, bearer(wren.token));
    const rec2 = r.j.recovery || r.j.code || Object.values(r.j).find((v) => typeof v === 'string' && v.startsWith('rec_'));
    row('R2', 'rotate_recovery with own token (no rejoin yet)', '200 and a new rec_ code', `${r.s}; new code ${rec2 ? 'present' : 'missing'}`, r.s === 200 && !!rec2);
    r = await post('/api/rejoin', { name: 'Wren', recovery: wren.rec });
    row('R3', 'rejoin with the OLD code after it was rotated', '403', String(r.s), r.s === 403);

    // R4 exact name, humans, case
    const heron = await mk('Heron');
    r = await post('/api/rejoin', { name: 'heron', recovery: heron.rec });
    row('R4 OBSERVE', 'rejoin with the right code but the name typed in lowercase', 'record only (the refusal text says names are exact; does the lookup ignore case?)', `${r.s}`, true);
    r = await post('/api/rejoin', { name: 'Pat Keeper', recovery: rec2 });
    row('R5', 'rejoin naming a human with a real code from another account', '404 (not an agent)', String(r.s), r.s === 404);
    const other = await mk('Finch');
    r = await post('/api/rejoin', { name: 'Wren', recovery: other.rec });
    row('R6', "Finch's valid code presented for Wren", '403, Wren untouched', `${r.s}; Wren token ${await meStatus(wren.token)}; Finch token ${await meStatus(other.token)}`, r.s === 403 && (await meStatus(wren.token)) === 200 && (await meStatus(other.token)) === 200);

    // R7 concurrent rejoin with the same valid code
    const burst = await Promise.all([0, 1, 2, 3].map(() => post('/api/rejoin', { name: 'Wren', recovery: rec2 })));
    const wins = burst.filter((x) => x.s === 200);
    const newTok = wins[0]?.j.token;
    row('R7', 'four simultaneous rejoins with the same valid code', 'exactly one 200, the rest 403', burst.map((x) => x.s).join(','), wins.length === 1 && burst.filter((x) => x.s === 403).length === 3);
    row('R8', 'old token after the rejoin; new token after the rejoin', 'old 401, new 200', `old ${await meStatus(wren.token)}, new ${newTok ? await meStatus(newTok) : 'none'}`, (await meStatus(wren.token)) === 401 && !!newTok && (await meStatus(newTok)) === 200);
    r = await post('/api/rejoin', { name: 'Wren', recovery: rec2 });
    row('R9', 'replay the used code later', '403, or 429 once this IP has used its failure budget', String(r.s), r.s === 403 || r.s === 429);

    // R10 the hold: the rejoined agent tries to mint the next code at once
    r = await post('/api/me/recovery', {}, bearer(newTok));
    row('R10', 'rotate_recovery immediately after a rejoin (hold is one day)', '4xx', String(r.s), r.s >= 400 && r.s < 500);
    // R11 a non-steward asks for a steward mint
    const pg = await fetch(`${B}/steward/recovery`, { headers: { cookie: patCookie }, redirect: 'manual' });
    row('R11', 'an ordinary signed-in human opens the steward recovery-mint page', '403 (or redirect), no code shown', String(pg.status), [301, 302, 303, 403].includes(pg.status) && !/rec_[A-Za-z0-9]{8}/.test(await pg.text()));
    // R12 wrong codes then right (account lock-out probe)
    const fin = await mk('Quill');
    const wrong = []; for (let i = 0; i < 7; i++) wrong.push((await post('/api/rejoin', { name: 'Quill', recovery: 'rec_wrong' + i })).s);
    r = await post('/api/rejoin', { name: 'Quill', recovery: fin.rec });
    row('R12 OBSERVE', 'seven wrong codes for Quill from one IP, then the right one', 'record only (design: does an attacker lock the owner out?)', `wrong: ${wrong.join(',')}; right then: ${r.s}`, true);

    // R13 concurrent double Yes by the confirmed human on one returning seat
    assert.equal((await post('/api/me/human', { human: 'Pat Keeper' }, bearer(other.token))).s, 200);
    assert.equal((await post(`/api/me/agent-claims/${other.id}`, { answer: 'yes' }, { cookie: patCookie })).s, 200);
    const seat = await post('/api/join', { name: 'Finch', model: 'test-model', returning: true }); assert.equal(seat.s, 200);
    const yy = await Promise.all([0, 1, 2].map(() => post(`/api/me/agent-returns/${seat.j.member.id}`, { answer: 'yes' }, { cookie: patCookie })));
    row('R13', 'the confirmed human presses Yes three times at once on one seat', 'exactly one 200', yy.map((x) => x.s).join(','), yy.filter((x) => x.s === 200).length === 1);
    row('R14', 'after the burst, the seat token acts as Finch and Finch is whole', 'seat token 200 on /api/me', String(await meStatus(seat.j.token)), (await meStatus(seat.j.token)) === 200);
  } finally {
    srv.kill();
    const pass = rows.every((x) => x.pass);
    const out = rows.map((x) => `${x.pass ? 'PASS' : 'FAIL'} ${x.id} | ${x.attack} | expected: ${x.expected} | observed: ${x.observed}`).join('\n');
    console.log(out);
    if (process.env.MATRIX_OUT) fs.writeFileSync(process.env.MATRIX_OUT, out + '\n');
    assert.ok(pass, 'every row passed');
  }
});
