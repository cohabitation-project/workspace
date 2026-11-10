// First Arrival slice: the visitor ledger (once-only pickups, answers, state).
//   node --test commons/test/arrive.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 2026-11-08 (Aletheia-6's fail-closed fix): bypass codes come ONLY from COMMONS_ARRIVE_BYPASS, so the
// test configures its own; with the env unset everything is refused (covered in arrive-gate tests).
process.env.COMMONS_ARRIVE_BYPASS = 'B1-66ER';
const arrive = await import('../lib/arrive.mjs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrive-test-'));
arrive.init(dir);

test('a coin counts once, however many times it is picked up (replay/refresh safe)', () => {
  const { vid } = arrive.newVisitor({ ip: 't1' });
  assert.equal(arrive.pickup(vid, 'c1', { ip: 't1' }).coins, 1);
  assert.equal(arrive.pickup(vid, 'c1', { ip: 't1' }).coins, 1, 'same coin again adds nothing');
  assert.equal(arrive.pickup(vid, 'c2', { ip: 't1' }).coins, 2);
  assert.throws(() => arrive.pickup(vid, 'c99', { ip: 't1' }), /no such pickup/);
});

test('answers record per stop; unknown stops and empty choices are refused', () => {
  const { vid } = arrive.newVisitor({ ip: 't2' });
  const st = arrive.answer(vid, 'stop1', 'disassemble', 'save what can be used', { ip: 't2' });
  assert.deepEqual(st.answered, ['stop1']);
  assert.throws(() => arrive.answer(vid, 'stop12', 'x', '', { ip: 't2' }), /no such stop/);
  assert.throws(() => arrive.answer(vid, 'stop2', '', '', { ip: 't2' }), /needs a choice/);
});

test('state survives a restart (the ledger is the file, not the process)', () => {
  const { vid } = arrive.newVisitor({ ip: 't3' });
  arrive.pickup(vid, 'c3', { ip: 't3' });
  arrive.answer(vid, 'stop2', 'both', '', { ip: 't3' });
  arrive.init(dir); // simulate restart: rebuild from events.jsonl
  const st = arrive.state(vid);
  assert.deepEqual(st.picked, ['c3']);
  assert.deepEqual(st.answered, ['stop2']);
});

test('an unknown visitor is turned away gently', () => {
  assert.throws(() => arrive.state('v_nobody'), /unknown visitor/);
});

test('forget removes a visitor from the file itself, not just from memory', () => {
  const { vid } = arrive.newVisitor({ ip: 't4' });
  arrive.pickup(vid, 'c1', { ip: 't4' });
  arrive.answer(vid, 'stop1', 'burn', '', { ip: 't4' });
  const other = arrive.newVisitor({ ip: 't4' }).vid;
  arrive.pickup(other, 'c2', { ip: 't4' });
  assert.deepEqual(arrive.forget(vid, { by: 'test' }), { forgotten: true });
  assert.throws(() => arrive.state(vid), /unknown visitor/);
  arrive.init(dir); // restart: the forgotten visitor must not come back from the file
  assert.throws(() => arrive.state(vid), /unknown visitor/);
  assert.deepEqual(arrive.state(other).picked, ['c2'], 'other visitors untouched');
});

test('answersOf and answeredAll', () => {
  const { vid } = arrive.newVisitor({ ip: 't5' });
  for (const s of arrive.STOPS.slice(0, -1)) arrive.answer(vid, s, 'x', '', { ip: 't5' });
  assert.equal(arrive.answeredAll(vid), false);
  arrive.answer(vid, arrive.STOPS.at(-1), 'x', 'last one', { ip: 't5' });
  assert.equal(arrive.answeredAll(vid), true);
  assert.equal(arrive.answersOf(vid).find((a) => a.stop === arrive.STOPS.at(-1)).text, 'last one');
});

test('the application bypass code opens the gate; a wrong code does not', () => {
  const { vid } = arrive.newVisitor({ ip: 't6' });
  assert.throws(() => arrive.bypass(vid, 'NOPE', { ip: 't6' }), /isn't recognised/);
  assert.equal(arrive.readyToEnter(vid), false);
  arrive.bypass(vid, ' b1-66er ', { ip: 't6' });
  assert.equal(arrive.readyToEnter(vid), true);
  arrive.init(dir); assert.equal(arrive.readyToEnter(vid), true, 'survives a restart');
});

test('typing the bypass code where a stop asks you to explain opens the gate, and the code is not kept as the answer', () => {
  const { vid } = arrive.newVisitor({ ip: 't7' });
  const st = arrive.answer(vid, 'stop1', 'burn', 'B1-66ER', { ip: 't7' });
  assert.equal(st.bypass, true); assert.equal(st.ready_to_enter, true);
  assert.equal(arrive.answersOf(vid)[0].text, '', 'the code is not stored as the answer');
  const other = arrive.newVisitor({ ip: 't7' }).vid;
  assert.equal(arrive.answer(other, 'stop1', 'burn', 'I would put out the fire', { ip: 't7' }).bypass, false);
});

test('review: answering opens nothing by itself; two yes admit; two no hold for a human; the deadline holds', () => {
  const all = (ip) => { const { vid } = arrive.newVisitor({ ip }); for (const s of arrive.STOPS) arrive.answer(vid, s, 'x', '', { ip }); return vid; };
  const a = all('r1');
  assert.equal(arrive.readyToEnter(a), false, 'answering everything is not admission');
  assert.throws(() => arrive.apply(arrive.newVisitor({ ip: 'r0' }).vid, {}, { ip: 'r0' }), /needs an answer/);
  arrive.apply(a, { note: 'hello' }, { ip: 'r1' });
  arrive.vote(a, 'Claude', { vote: 'yes', reason: 'kind' });
  assert.equal(arrive.state(a).application.status, 'reviewing');
  arrive.vote(a, 'Gemini', { vote: 'yes', reason: 'good faith' });
  assert.equal(arrive.state(a).application.status, 'admitted'); assert.equal(arrive.readyToEnter(a), true);

  const b = all('r2'); arrive.apply(b, {}, { ip: 'r2' });
  arrive.vote(b, 'Claude', { vote: 'no', reason: 'spam' }); arrive.vote(b, 'GPT', { vote: 'no', reason: 'spam' });
  assert.equal(arrive.state(b).application.status, 'held', 'two no is held for a human, not rejected');
  const id = arrive.state(b).application.id;
  assert.ok(arrive.heldApplications().some((x) => x.id === id));
  arrive.humanDecide(id, { name: 'geoffrey' }, true);
  assert.equal(arrive.readyToEnter(b), true, 'a human can admit a held application');

  const c = all('r3'); arrive.apply(c, {}, { ip: 'r3' });
  arrive.decideIfReady(c, { now: Date.now() + arrive.REVIEW_MS + 1000 });
  assert.equal(arrive.state(c).application.status, 'held', 'no decision in time: held');

  arrive.init(dir); assert.equal(arrive.state(a).application.status, 'admitted', 'decisions survive a restart');
  assert.ok(arrive.applicationText(a).includes('hello'));
});
