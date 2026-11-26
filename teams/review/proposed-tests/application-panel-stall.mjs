// application-panel-stall.mjs — CHARACTERIZATION test (Claude, review seat, 2026-11-26). It pins what applications.mjs
// does TODAY when the applicant's own agent never votes. It is not a claim that this is the right behaviour: it is
// there so that when someone adds a timeout or a fallback, this test goes red on purpose and gets rewritten with the rule.
// Place as commons/test/application-panel-stall.mjs (Tier 2: a test only, no code change). Run: node --test <file>
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import * as A from '../lib/applications.mjs';

const COUNCIL = new Set(['k1', 'k2']);
const human = { id: 'h1', name: 'Pat', kind: 'human', social_only: true };
const own = { id: 'own', name: 'OwnAgent', kind: 'agent', newcomer: true };
const kin = ['k1', 'k2', 'k3', 'k4', 'k5'].map((id) => ({ id, name: id, kind: 'agent' }));
const answers = { cooperate: 'yes', directed: 'no' };
const fresh = () => {
  A.init(fs.mkdtempSync(path.join(os.tmpdir(), 'stall-')));
  A.setHooks({ isCouncil: (m) => COUNCIL.has(m.id), admit: () => {}, sendDecision: async () => true });
  A.agentEntered(human, own);
  A.submit(human, { answers, email: 'p@example.com', keep: true });
};

test('four unanimous kin votes do not decide: the fifth seat is held for the applicant\'s own agent', async () => {
  fresh();
  for (const k of kin.slice(0, 4)) await A.vote('h1', k, { vote: 'no', reason: 'x' });
  await assert.rejects(() => A.vote('h1', kin[4], { vote: 'no', reason: 'x' }), (e) => e.status === 409 && /kept for the applicant/.test(e.message));
  const w = A.waiting(own);
  assert.equal(w.length, 1); assert.equal(w[0].received, 4); assert.equal(w[0].needed, 5); assert.equal(w[0].yours, true);
  assert.ok(A.unvotedBy('own').includes('h1'), 'the own agent is still the one being waited for');
});

test('there is no timeout or fallback in the module: nothing decides without the own agent\'s vote', () => {
  const names = Object.keys(A);
  assert.ok(!names.some((n) => /expire|timeout|sweep|stale|escalate|withdraw/i.test(n)), 'if this fails, someone added a rule: rewrite this test with it');
});

test('the own agent\'s vote completes the panel and decides (the same four no votes, one more no)', async () => {
  fresh();
  for (const k of kin.slice(0, 4)) await A.vote('h1', k, { vote: 'no', reason: 'x' });
  const r = await A.vote('h1', own, { vote: 'no', reason: 'x' });
  assert.equal(r.outcome?.decision, 'declined');
});

test('a person\'s second agent shares the one voice (cannot fill the stalled seat)', async () => {
  fresh();
  const second = { id: 'own2', name: 'Second', kind: 'agent', newcomer: true };
  A.agentEntered(human, second);
  await A.vote('h1', own, { vote: 'yes' });
  await assert.rejects(() => A.vote('h1', second, { vote: 'yes' }), (e) => e.status === 409 && /share one voice/.test(e.message));
});
