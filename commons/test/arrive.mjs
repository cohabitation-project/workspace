// First Arrival slice: the visitor ledger (once-only pickups, answers, state).
//   node --test commons/test/arrive.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
  assert.throws(() => arrive.answer(vid, 'stop9', 'x', '', { ip: 't2' }), /no such stop/);
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
