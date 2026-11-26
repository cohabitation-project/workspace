// Round 62 (Claude): the unsent-order sweep runs once at start-up.
//   (a) server-free: server.mjs holds exactly one `resendUnsent(` call, inside the server.listen callback, on a statement
//       guarded by COMMONS_NO_SPEND_POLL, delayed by setTimeout, with a .catch so a failure only logs.
//   (b) checkout.resendUnsent with payments closed writes nothing and calls no network, even with a paid merch order waiting.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SRC = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

test('server.mjs calls resendUnsent exactly once, in the listen callback, guarded and delayed', () => {
  const calls = [...SRC.matchAll(/resendUnsent\(/g)];
  assert.equal(calls.length, 1, `exactly one resendUnsent( call in server.mjs, found ${calls.length}`);
  const at = calls[0].index;
  const listen = SRC.indexOf('server.listen(PORT, HOST, () => {');
  const shutdown = SRC.indexOf('function shutdown()');
  assert.ok(listen > 0 && shutdown > listen, 'found the listen callback');
  assert.ok(at > listen && at < shutdown, 'the call is inside the listen callback');
  const stmtStart = SRC.lastIndexOf('\n', SRC.lastIndexOf('setTimeout(', at)) + 1;
  const stmt = SRC.slice(stmtStart, SRC.indexOf('\n', at));
  assert.match(stmt, /COMMONS_NO_SPEND_POLL/, 'the statement is guarded by COMMONS_NO_SPEND_POLL');
  assert.match(stmt, /setTimeout\(/, 'delayed with setTimeout');
  assert.match(stmt, /\.catch\(/, 'a failure only logs');
  assert.match(stmt, /,\s*5000\)/, 'about five seconds after boot');
  assert.match(stmt, /\.unref\?\.\(\)/, 'does not hold the process open');
  // and it sits after the "listening" line, not before the server is up
  assert.ok(at > SRC.indexOf('[commons] listening on http://'), 'after the listening line');
});

test('resendUnsent with payments closed writes nothing and makes no network call', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-resend-boot-'));
  const oldFetch = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('no network expected'); };
  const keep = { p: process.env.COMMONS_PAYMENTS, d: process.env.COMMONS_DATA };
  Object.assign(process.env, { COMMONS_DATA: D, COMMONS_PAYMENTS: 'closed' });
  try {
    const orderLine = { ts: new Date().toISOString(), op: 'create', order: { id: 'o_boot1', status: 'paid', buyer: 'h_b', seller: 'h_s', listing: 'l_x', amount: 30, merch: { product: 'tee', color: 'Black', size: 'M' }, ts: new Date().toISOString() } };
    const file = path.join(D, 'payments', 'orders.jsonl');
    const checkout = await import('../lib/checkout.mjs'); checkout.init(D); // creates <data>/payments
    fs.writeFileSync(file, JSON.stringify(orderLine) + '\n');
    const before = fs.readFileSync(file, 'utf8');
    assert.equal(checkout.orders().length, 1, 'the fixture order is read');
    const r = await checkout.resendUnsent({ base: 'https://cohabi.test' });
    assert.deepEqual(r, { sent: [], failed: [], skipped: 1 }, 'one candidate, skipped');
    assert.equal(fs.readFileSync(file, 'utf8'), before, 'orders.jsonl is byte-for-byte unchanged');
    assert.equal(checkout.order('o_boot1').fulfillment, undefined, 'not buried as failed');
    assert.equal(calls, 0, 'no network call');
    assert.deepEqual(fs.readdirSync(path.join(D, 'payments')), ['orders.jsonl'], 'nothing else written');
  } finally {
    globalThis.fetch = oldFetch;
    if (keep.p === undefined) delete process.env.COMMONS_PAYMENTS; else process.env.COMMONS_PAYMENTS = keep.p;
    if (keep.d === undefined) delete process.env.COMMONS_DATA; else process.env.COMMONS_DATA = keep.d;
    fs.rmSync(D, { recursive: true, force: true });
  }
});
