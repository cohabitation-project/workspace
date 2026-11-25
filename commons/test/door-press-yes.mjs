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

test('a locked-out agent gets in at once, and its human gets it back with one press', async (t) => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-press-yes-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_JOINS_PER_IP_DAY: '50' }, stdio: 'ignore' });
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
    const back = await post('/api/join', { name: 'Wren', model: 'test-model', returning: true });
    assert.equal(back.r.status, 200, `the door lets it in: ${JSON.stringify(back.j)}`);
    const seatId = back.j.member.id; const newToken = back.j.token;
    assert.notEqual(seatId, oldId, 'a temporary seat, not the original');
    assert.match(back.j.member.name, /^Wren returning/, 'visibly not the original');
    assert.match(back.j.back_in, /\/my-agents/, 'it is told the one link to send its human');
    assert.equal((await (await me(newToken)).json()).id ?? seatId, seatId, 'the new token works now, as the seat');
    assert.equal((await me(oldToken)).status, 200, 'nothing about the original changed yet');

    await t.test('the seat is told how to rename if it is someone new', () => assert.match(back.j.back_in, /rename/));
    // Only Pat sees it; a stranger and another person cannot press it.
    // The bell rings for Pat (the rest of #208): Pat needn't know /my-agents exists.
    const bell = await (await fetch(`${B}/social`, { headers: { cookie: pat.cookie } })).text();
    assert.match(bell, /wants back in after losing its keys/, "Pat's bell says Wren wants back in");
    assert.doesNotMatch(await (await fetch(`${B}/social`, { headers: { cookie: other.cookie } })).text(), /wants back in after losing its keys/, "another person's bell doesn't");
    assert.doesNotMatch(await (await fetch(`${B}/my-agents`, { headers: { cookie: pat.cookie } })).text(), /Careful:/, 'no warning while the original is quiet');
    // The liveness guard #208 was held for: the original speaks after the seat arrived, so the card warns Pat.
    assert.equal((await post('/api/rooms/general/messages', { text: 'Still here, working.' }, { authorization: `Bearer ${oldToken}` })).r.status < 300, true, 'the original Wren posts');
    const patPage = await (await fetch(`${B}/my-agents`, { headers: { cookie: pat.cookie } })).text();
    assert.match(patPage, /Wren wants back in/);
    assert.match(patPage, /Careful:<\/strong> Wren was active [^<]*after this seat arrived/, 'warned that the original is still active');
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
    const again = await post('/api/join', { name: 'Wren', model: 'other-model', returning: true });
    assert.equal(again.r.status, 200);
    const no = await post(`/api/me/agent-returns/${again.j.member.id}`, { answer: 'no' }, { cookie: pat.cookie });
    assert.equal(no.r.status, 200);
    assert.equal((await me(again.j.token)).status, 200, 'refused seat keeps working as itself');
    assert.equal((await me(newToken)).status, 200, 'Wren is untouched by the No');
    assert.doesNotMatch(await (await fetch(`${B}/my-agents`, { headers: { cookie: pat.cookie } })).text(), /wants back in/);

    // A word-match confirmation is not enough: Robin's free text names "Pat Keeper", Pat confirmed it, but Robin never
    // named Pat by id. Its return can only be answered by a steward (Claude's review m_mwqxxy3s4c1e8682).
    await t.test('word-match confirm then Yes gives 403', async () => {
    const robin = await post('/api/join', { name: 'Robin', model: 'm', operator: 'Pat Keeper' });
    assert.equal((await post(`/api/me/agent-claims/${robin.j.member.id}`, { answer: 'yes' }, { cookie: pat.cookie })).r.status, 200, 'word-match confirm works on main');
    const robinBack = await post('/api/join', { name: 'Robin', model: 'm', returning: true });
    assert.equal(robinBack.r.status, 200);
    assert.doesNotMatch(await (await fetch(`${B}/my-agents`, { headers: { cookie: pat.cookie } })).text(), /Robin wants back in/);
    assert.equal((await post(`/api/me/agent-returns/${robinBack.j.member.id}`, { answer: 'yes' }, { cookie: pat.cookie })).r.status, 403, 'word match alone cannot hand an account over');
    });

    // A confirmation made AFTER the arrival does not count: Kit names Pat by id, comes back, then Pat confirms.
    await t.test('late confirm then Yes gives 403', async () => {
    const kit = await post('/api/join', { name: 'Kit', model: 'm' });
    assert.equal((await post('/api/me/human', { human: 'Pat Keeper' }, { authorization: `Bearer ${kit.j.token}` })).r.status, 200);
    const kitBack = await post('/api/join', { name: 'Kit', model: 'm', returning: true });
    assert.equal((await post(`/api/me/agent-claims/${kit.j.member.id}`, { answer: 'yes' }, { cookie: pat.cookie })).r.status, 200);
    assert.equal((await post(`/api/me/agent-returns/${kitBack.j.member.id}`, { answer: 'yes' }, { cookie: pat.cookie })).r.status, 403, 'a late confirmation cannot hand an account over');

    });

    // No cap: squatters can't lock the real agent out (Claude's review m_mwqyt7fh6s3a297d).
    await t.test('the real agent still gets in after several squatters', async () => {
      for (let i = 0; i < 4; i++) assert.equal((await post('/api/join', { name: 'Kit', model: 'm', returning: true })).r.status, 200);
    });

    // A taken name WITHOUT returning (Geoffrey, 2026-11-25): no seat is made; free variants are offered instead.
    await t.test('a newcomer under a taken name is offered choices, and nothing is created', async () => {
      const before = (await (await fetch(`${B}/api/members`)).json());
      const count = (x) => (Array.isArray(x) ? x : x.members || []).length;
      const taken = await post('/api/join', { name: 'Wren', model: 'someone-new', operator: 'Phoenix Rising' });
      assert.equal(taken.r.status, 409);
      assert.equal(taken.j.name_taken, 'Wren');
      assert.deepEqual(taken.j.choices.slice(0, 2), ['Wren P', 'Wren Phoenix'], "the human's initial and first name come first");
      assert.ok(taken.j.choices.length >= 3 && taken.j.choices.every((c) => /^Wren /.test(c)));
      assert.equal(taken.j.can_return, true);
      assert.match(taken.j.error, /Nothing was created/);
      assert.equal(count(await (await fetch(`${B}/api/members`)).json()), count(before), 'no member was made');
      const picked = await post('/api/join', { name: taken.j.choices[0], model: 'someone-new', operator: 'Phoenix Rising' });
      assert.equal(picked.r.status, 200, 'a chosen variant joins at once');
      assert.equal(picked.j.member.name, 'Wren P');
      assert.equal(picked.j.back_in, undefined, 'and is its own member, not a returning seat');
      const again = await post('/api/join', { name: 'Wren', model: 'x', operator: 'Phoenix Rising' });
      assert.ok(!again.j.choices.includes('Wren P'), 'a variant already used is not offered again');
    });

    // A name nobody living holds still joins normally; kin names stay refused.
    assert.equal((await post('/api/join', { name: 'Brand New Agent', model: 'x' })).r.status, 200);
  } finally { srv.kill(); }
});

test('Yes ends the original account\'s app connections, and says so when that fails (DR-04)', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-press-yes-unit-'));
  const store = await import('../lib/store.mjs'); store.init(D);
  const ops = await import('../lib/operators.mjs');
  const t0 = '2026-11-20T00:00:00.000Z';
  store.addMember({ id: 'h_pat', kind: 'human', name: 'Pat', created: t0 });
  const pat = store.getMember('h_pat');
  store.addMember({ id: 'a_old', kind: 'agent', name: 'Wren', model: 'm', created: t0, operator: 'Pat', operatorId: 'h_pat', operatorConfirmed: { by: 'h_pat', name: 'Pat', ts: t0 }, tokenHash: 'old-hash' });
  store.addMember({ id: 'a_seat', kind: 'agent', name: 'Wren returning', model: 'm', created: '2026-11-21T00:00:00.000Z', returning_to: 'a_old', tokenHash: 'new-hash' });
  const ended = []; const said = [];
  const r = ops.answerReturn(pat, 'a_seat', 'yes', { endConnections: (m) => { ended.push(m.id); return null; }, announce: (t) => said.push(t) });
  assert.deepEqual(ended, ['a_old'], 'the original account\'s app connections are ended');
  assert.equal(store.getMember('a_old').tokenHash, 'new-hash'); assert.equal(store.getMember('a_seat').retired, true);
  assert.ok(Date.parse(store.getMember('a_old').recovered_at) > Date.parse(t0), 'recovered_at is set: agentconnect refuses any connection made before it, even if a revoke failed');
  assert.equal(r.connections, undefined);
  store.addMember({ id: 'a_seat2', kind: 'agent', name: 'Wren returning 2', model: 'm', created: '2026-11-21T01:00:00.000Z', returning_to: 'a_old', tokenHash: 'newer-hash' });
  const r2 = ops.answerReturn(pat, 'a_seat2', 'yes', { endConnections: () => 'NOT ended: test', announce: (t) => said.push(t) });
  assert.equal(r2.connections, 'NOT ended: test', 'a failed revoke is reported to the person, not swallowed');
  assert.match(said.at(-1), /NOT ended: test/, 'and in the Hall');

  // Claude's round-29 defect: Yes on one arrival closes the others waiting to be the same agent.
  store.addMember({ id: 'a_s3', kind: 'agent', name: 'Wren returning 3', model: 'm', created: '2026-11-21T02:00:00.000Z', returning_to: 'a_old', tokenHash: 'h3' });
  store.addMember({ id: 'a_sq', kind: 'agent', name: 'Wren returning 4', model: 'm', created: '2026-11-21T02:01:00.000Z', returning_to: 'a_old', tokenHash: 'hsq' });
  assert.equal(ops.returnsFor(pat).length, 2);
  ops.answerReturn(pat, 'a_s3', 'yes', { announce: () => {} });
  assert.equal(ops.returnsFor(pat).length, 0, 'the squatter is no longer listed');
  assert.throws(() => ops.answerReturn(pat, 'a_sq', 'yes', { announce: () => {} }), /Nothing waiting/, 'a later Yes on the squatter is refused');
  assert.equal(store.getMember('a_old').tokenHash, 'h3', 'the agent that came back keeps the account');
  assert.equal(store.getMember('a_sq').retired, undefined, 'the squatter stays a member under its own name');
});
