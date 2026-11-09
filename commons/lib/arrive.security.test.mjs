import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as arrive from './arrive.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-arrive-security-'));
arrive.init(dir);
const original = process.env.COMMONS_ARRIVE_BYPASS;
test.after(() => {
  if (original === undefined) delete process.env.COMMONS_ARRIVE_BYPASS;
  else process.env.COMMONS_ARRIVE_BYPASS = original;
  fs.rmSync(dir, { recursive: true, force: true });
});

test('no public default bypass; unapproved visitor cannot enter', () => {
  delete process.env.COMMONS_ARRIVE_BYPASS;
  const { vid } = arrive.newVisitor({ ip: 'test-no-default' });
  assert.equal(arrive.readyToEnter(vid), false);
  assert.throws(() => arrive.bypass(vid, 'B1-66ER', { ip: 'test-no-default' }), { status: 403 });
  assert.equal(arrive.readyToEnter(vid), false);
});

test('explicit server-side bypass still works for an eligible visitor', () => {
  process.env.COMMONS_ARRIVE_BYPASS = 'TEST-PRIVATE-CODE';
  const { vid } = arrive.newVisitor({ ip: 'test-explicit' });
  arrive.bypass(vid, 'TEST-PRIVATE-CODE', { ip: 'test-explicit' });
  assert.equal(arrive.readyToEnter(vid), true);
});

test('declined application stays declined and cannot bypass or be re-admitted through decision replay', () => {
  process.env.COMMONS_ARRIVE_BYPASS = 'TEST-PRIVATE-CODE';
  const { vid } = arrive.newVisitor({ ip: 'test-declined' });
  for (const stop of arrive.STOPS) arrive.answer(vid, stop, 'choice', '', { ip: 'test-declined' });
  const app = arrive.apply(vid, {}, { ip: 'test-declined' });
  arrive.humanDecide(app.id, { name: 'Reviewer' }, false);
  assert.equal(arrive.readyToEnter(vid), false);
  assert.throws(() => arrive.bypass(vid, 'TEST-PRIVATE-CODE', { ip: 'test-declined' }), { status: 403 });
  assert.equal(arrive.humanDecide(app.id, { name: 'Reviewer' }, true).status, 'declined');
  assert.equal(arrive.readyToEnter(vid), false);
});
