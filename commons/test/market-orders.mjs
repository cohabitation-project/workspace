// Order visibility (2026-11-18): after the first live sandbox sale, neither side could see it. A buyer lands on a
// receipt, a seller sees Sales in the wallet, both can read /api/me/orders, and a live listing no longer says
// "nothing can be bought" next to a working Buy button.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import * as checkout from '../lib/checkout.mjs';

const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('orders: receipt, /api/me/orders for buyer and seller, drafts hidden, other listings refused', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-orders-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    // two members by the open door; their tokens are on the welcome page
    const join = async (name) => { const html = await (await fetch(`${B}/come-in?name=${name}&model=GPT`, { headers: GPT })).text(); const tok = html.match(/cmn_[A-Za-z0-9_-]+/)[0]; const id = html.match(/\/m\/(a_[a-z0-9]+)/)[1]; return { tok, id }; };
    const seller = await join('Maple'); const buyer = await join('Reed');
    // the seller lists something fixed-price
    const made = await (await fetch(`${B}/api/market/listings`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${seller.tok}`, ...GPT }, body: JSON.stringify({ title: 'A small thing', text: 'test', category: 'software', type: 'product', price: { mode: 'fixed', amount: 3 }, license: 'mit', rights: true, made_by: 'ai' }) })).json();
    const lid = made.listed || made.id; assert.ok(lid, 'listing created: ' + JSON.stringify(made));
    // orders are an append-only log the webhook writes; write what a real checkout + webhook would have written
    const pay = path.join(D, 'payments'); fs.mkdirSync(pay, { recursive: true });
    const ord = { id: 'ord_test0001', listing: lid, title: 'A small thing', buyer: buyer.id, seller: seller.id, amount: 3, currency: 'USD', fee_cents: 0, mode: 'test', status: 'draft', ts: '2026-11-18T18:00:00.000Z' };
    const draft = { ...ord, id: 'ord_draft999', ts: '2026-11-18T18:01:00.000Z' };
    fs.writeFileSync(path.join(pay, 'orders.jsonl'), [
      JSON.stringify({ ts: ord.ts, op: 'create', order: ord }),
      JSON.stringify({ ts: '2026-11-18T18:00:10.000Z', op: 'status', order: ord.id, status: 'awaiting_payment', session: 'cs_test_1' }),
      JSON.stringify({ ts: '2026-11-18T18:00:40.000Z', op: 'status', order: ord.id, status: 'paid', session: 'cs_test_1' }),
      JSON.stringify({ ts: draft.ts, op: 'create', order: draft }),
    ].join('\n') + '\n');
    // buyer sees the purchase, seller sees the sale, nobody sees the draft
    const mine = async (tok) => (await fetch(`${B}/api/me/orders`, { headers: { authorization: `Bearer ${tok}`, ...GPT } })).json();
    const b = await mine(buyer.tok); const s = await mine(seller.tok);
    assert.equal(b.purchases.length, 1); assert.equal(b.sales.length, 0);
    assert.equal(b.purchases[0].id, 'ord_test0001'); assert.equal(b.purchases[0].status, 'paid'); assert.equal(b.purchases[0].seller.name, 'Maple');
    assert.equal(s.sales.length, 1); assert.equal(s.purchases.length, 0); assert.equal(s.sales[0].buyer.name, 'Reed');
    assert.ok(!JSON.stringify(b).includes('ord_draft999') && !JSON.stringify(s).includes('ord_draft999'), 'drafts never show');
    const nobody = await fetch(`${B}/api/me/orders`); assert.equal(nobody.status, 401, 'orders need a member');
    // the receipt on the listing page: paid, with the order id; a draft or another listing's order shows nothing
    const page = await (await fetch(`${B}/label/l/${lid}?paid=ord_test0001`)).text();
    assert.match(page, /Paid\. Thank you\./); assert.match(page, /ord_test0001/); assert.match(page, /test mode, no real money/);
    const noDraft = await (await fetch(`${B}/label/l/${lid}?paid=ord_draft999`)).text();
    assert.ok(!/mk-receipt/.test(noDraft), 'a draft shows no receipt');
    const other = await (await fetch(`${B}/label/l/${lid}?paid=ord_nope`)).text();
    assert.ok(!/mk-receipt/.test(other), 'an unknown order shows no receipt');
    const cancelled = await (await fetch(`${B}/label/l/${lid}?cancelled=1`)).text();
    assert.match(cancelled, /Checkout cancelled\./); assert.match(cancelled, /Nothing was charged/);
  } finally { srv.kill(); }
});

test('receipt() and ordersFor() shapes', () => {
  // pure-function checks on the folding, without a server
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'orders-fold-'));
  checkout.init(D);
  const pay = path.join(D, 'payments');
  fs.writeFileSync(path.join(pay, 'orders.jsonl'), [
    JSON.stringify({ ts: 't1', op: 'create', order: { id: 'ord_a', listing: 'l_1', title: 'T', buyer: 'h_b', seller: 'h_s', amount: 5, currency: 'USD', mode: 'test', status: 'draft', ts: 't1' } }),
    JSON.stringify({ ts: 't2', op: 'status', order: 'ord_a', status: 'awaiting_payment' }),
  ].join('\n') + '\n');
  const r = checkout.receipt('ord_a', 'l_1');
  assert.equal(r.status, 'awaiting_payment'); assert.equal(r.updated, 't2');
  assert.equal(checkout.receipt('ord_a', 'l_other'), null, 'another listing cannot show this receipt');
  assert.equal(checkout.receipt('ord_zz', 'l_1'), null);
});
