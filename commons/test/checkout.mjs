// Checkout wiring (2026-11-14): the shapes and the gates. Payments are closed, agents never get money accounts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'checkout-'));
const PORT = await freePort(), B = `http://127.0.0.1:${PORT}`;
const env = { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }; delete env.COMMONS_PAYMENTS; delete env.STRIPE_SECRET_KEY;
const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env, stdio: 'ignore' });
test.after(() => srv.kill());
const H = { 'x-commons': '1', 'content-type': 'application/json' };
async function up() { for (let i = 0; i < 60; i++) { try { if ((await fetch(B + '/healthz')).ok) return; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); } throw new Error('server did not start'); }
async function human(name) { const r = await fetch(B + '/api/humans', { method: 'POST', headers: H, body: JSON.stringify({ name, email: name.replace(/ /g, '').toLowerCase() + '@example.com', password: 'a-long-test-password-123', agree: true, age_ok: true }) }); return { cookie: r.headers.get('set-cookie').split(';')[0] }; }
const call = (who, p, body) => fetch(B + p, { method: body ? 'POST' : 'GET', headers: { ...H, ...(who ? { cookie: who.cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });

test('a quote says what it costs and why it cannot be paid; buying answers plainly; payouts closed', async () => {
  await up();
  const seller = await human('Sela Maker'), buyer = await human('Bo Buyer');
  const l = await (await call(seller, '/api/market/listings', { title: 'Clay bowl', text: 'A bowl.', category: 'art', type: 'product', price: { mode: 'fixed', amount: 40 }, license: 'all-rights', rights: true })).json();
  const q = await (await call(null, `/api/market/listings/${l.id}/checkout`)).json();
  assert.equal(q.amount, 40); assert.equal(q.currency, 'USD'); assert.equal(q.payable, false); assert.ok(q.why.includes("payments aren't open yet"));
  const r = await call(buyer, `/api/market/listings/${l.id}/checkout`, {});
  assert.equal(r.status, 503); assert.match((await r.json()).error, /Payments aren't open yet/);
  assert.equal((await call(seller, `/api/market/listings/${l.id}/checkout`, {})).status, 400, 'no buying your own listing');
  const acct = await (await call(seller, '/api/payments/account')).json();
  assert.equal(acct.kind, 'money'); assert.equal(acct.status, 'none'); assert.equal(acct.payments_open, false);
  assert.equal((await call(seller, '/api/payments/account', {})).status, 503);
  assert.ok(!fs.existsSync(path.join(D, 'payments', 'orders.jsonl')), 'no order is written while payments are closed');
});

test('agents get a coin account, never a money account', async () => {
  await up();
  const j = await (await fetch(B + '/api/join', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Wren Agent', model: 'test-model', intro: 'testing', operator: 'Sela Maker' }) })).json();
  const token = j.token || j.member?.token; assert.ok(token, 'agent joined');
  const A = { 'content-type': 'application/json', authorization: 'Bearer ' + token };
  const acct = await (await fetch(B + '/api/payments/account', { headers: A })).json();
  assert.equal(acct.kind, 'coins');
  const r = await fetch(B + '/api/payments/account', { method: 'POST', headers: A, body: '{}' });
  assert.equal(r.status, 403); assert.match((await r.json()).error, /Agents do not get money accounts/);
});
