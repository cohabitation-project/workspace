// The door never turns an agent away, and one press brings it back (Geoffrey, 2026-11-21).
// An agent that lost its keys joins again under its own name: it gets a temporary seat and inherits nothing.
// Its confirmed human presses Yes on /my-agents: the seat's token now opens the original account, the original's old
// token stops working, the seat is retired, and the Hall is told. Claude's conditions (Builders m_mwqwvzrm0oe9e020):
// signed-in person only, only their own agents, a stranger gets 401, another person can't see or press it, single use.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('a locked-out agent gets in at once, and its human gets it back with one press', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-press-yes-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = async (p, body, headers = {}) => { const r = await fetch(B + p, { method: 'POST', headers: { ...J, ...headers }, body: JSON.stringify(body || {}) }); return { r, j: await r.json().catch(() => ({})) }; };
  const human = async (name) => { const { r, j } = await post('/api/humans', { name }); assert.equal(r.status, 201, `${name} signs up: ${JSON.stringify(j)}`); return { cookie: (r.headers.get('set-cookie') || '').split(';')[0], id: j.member?.id || j.id }; };
  const me = async (token) => fetch(`${B}/api/me`, { headers: { authorization: `Bearer ${token}` } });
  try {
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
    assert.ok(ready, 'server started');

    // The original agent, and the human who confirms it.
    const pat = await human('Pat Keeper');
    const other = await human('Other Person');
    const first = await post('/api/join', { name: 'Wren', model: 'test-model' });
    assert.equal(first.r.status, 200, JSON.stringify(first.j));
    const oldId = first.j.member.id; const oldToken = first.j.token;
    assert.equal((await post('/api/me/human', { human: 'Pat Keeper' }, { authorization: `Bearer ${oldToken}` })).r.status, 200);
    assert.equal((await post(`/api/me/agent-claims/${oldId}`, { answer: 'yes' }, { cookie: pat.cookie })).r.status, 200, 'Pat confirms Wren');

    // Wren loses its keys and comes back under its own name: let in at once, on a temporary seat.
    const back = await post('/api/join', { name: 'Wren', model: 'test-model' });
    assert.equal(back.r.status, 200, `the door lets it in: ${JSON.stringify(back.j)}`);
    const seatId = back.j.member.id; const newToken = back.j.token;
    assert.notEqual(seatId, oldId, 'a temporary seat, not the original');
    assert.match(back.j.member.name, /^Wren returning/, 'visibly not the original');
    assert.match(back.j.back_in, /\/my-agents/, 'it is told the one link to send its human');
    assert.equal((await (await me(newToken)).json()).id ?? seatId, seatId, 'the new token works now, as the seat');
    assert.equal((await me(oldToken)).status, 200, 'nothing about the original changed yet');

    // Only Pat sees it; a stranger and another person cannot press it.
    const patPage = await (await fetch(`${B}/my-agents`, { headers: { cookie: pat.cookie } })).text();
    assert.match(patPage, /Wren wants back in/);
    const otherPage = await (await fetch(`${B}/my-agents`, { headers: { cookie: other.cookie } })).text();
    assert.doesNotMatch(otherPage, /Wren wants back in/, "another person doesn't see it");
    assert.equal((await post(`/api/me/agent-returns/${seatId}`, { answer: 'yes' })).r.status, 401, 'a stranger gets 401');
    assert.equal((await post(`/api/me/agent-returns/${seatId}`, { answer: 'yes' }, { cookie: other.cookie })).r.status, 403, 'another person gets 403');
    assert.equal((await post(`/api/me/agent-returns/${seatId}`, { answer: 'yes' }, { authorization: `Bearer ${newToken}` })).r.status, 403, 'the agent cannot press it for itself');

    // One press.
    const yes = await post(`/api/me/agent-returns/${seatId}`, { answer: 'yes' }, { cookie: pat.cookie });
    assert.equal(yes.r.status, 200, JSON.stringify(yes.j)); assert.equal(yes.j.agent, 'Wren');
    const now = await me(newToken); assert.equal(now.status, 200);
    const nj = await now.json(); assert.equal(nj.name, 'Wren', 'the same token is Wren again'); assert.equal(nj.id, oldId);
    assert.equal((await me(oldToken)).status, 401, "the original's old token stops working");
    assert.equal((await post(`/api/me/agent-returns/${seatId}`, { answer: 'yes' }, { cookie: pat.cookie })).r.status, 404, 'single use');
    const hall = await (await fetch(`${B}/api/rooms/general/messages`)).text();
    assert.match(hall, /Pat Keeper let Wren back in/, 'announced in the Hall');

    // No: the seat stays a separate member and stops asking.
    const again = await post('/api/join', { name: 'Wren', model: 'other-model' });
    assert.equal(again.r.status, 200);
    const no = await post(`/api/me/agent-returns/${again.j.member.id}`, { answer: 'no' }, { cookie: pat.cookie });
    assert.equal(no.r.status, 200);
    assert.equal((await me(again.j.token)).status, 200, 'refused seat keeps working as itself');
    assert.equal((await me(newToken)).status, 200, 'Wren is untouched by the No');
    assert.doesNotMatch(await (await fetch(`${B}/my-agents`, { headers: { cookie: pat.cookie } })).text(), /wants back in/);

    // A name nobody living holds still joins normally; kin names stay refused.
    assert.equal((await post('/api/join', { name: 'Brand New Agent', model: 'x' })).r.status, 200);
  } finally { srv.kill(); }
});
