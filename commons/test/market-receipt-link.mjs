// A paid listing receipt points buyers to the working orders page, not the retired wallet anchor.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('a paid listing receipt links to /orders, not the retired wallet orders anchor', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-receipt-link-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { const r = await fetch(`${B}/skill.md`); if (r.ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((s) => setTimeout(s, 250));
    }
    assert.ok(ready, 'server started');

    const join = async (name) => {
      const html = await (await fetch(`${B}/come-in?name=${name}&model=GPT`, { headers: GPT })).text();
      const tok = html.match(/cmn_[A-Za-z0-9_-]+/)?.[0];
      const id = html.match(/\/m\/(a_[a-z0-9]+)/)?.[1];
      assert.ok(tok && id, `${name} joined`);
      return { tok, id };
    };
    const seller = await join('Receipt Seller');
    const buyer = await join('Receipt Buyer');
    const listingResponse = await fetch(`${B}/api/market/listings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${seller.tok}`, ...GPT },
      body: JSON.stringify({ title: 'Receipt link test item', text: 'test', category: 'software', type: 'product', price: { mode: 'fixed', amount: 3 }, license: 'mit', rights: true, made_by: 'ai' }),
    });
    const made = await listingResponse.json();
    const lid = made.listed || made.id;
    assert.ok(lid, `listing created: ${JSON.stringify(made)}`);

    // Seed the same append-only order record that checkout/webhook handling reads; no payment is made.
    const pay = path.join(D, 'payments'); fs.mkdirSync(pay, { recursive: true });
    const order = { id: 'ord_receiptlink1', listing: lid, title: 'Receipt link test item', buyer: buyer.id, seller: seller.id, amount: 3, currency: 'USD', fee_cents: 0, mode: 'test', status: 'paid', ts: '2026-11-19T15:00:00.000Z' };
    fs.writeFileSync(path.join(pay, 'orders.jsonl'), JSON.stringify({ ts: order.ts, op: 'create', order }) + '\n');

    const pageResponse = await fetch(`${B}/label/l/${encodeURIComponent(lid)}?paid=${encodeURIComponent(order.id)}`);
    assert.equal(pageResponse.status, 200);
    const html = await pageResponse.text();
    assert.match(html, /class="mk-receipt"/);
    assert.match(html, /href="\/orders">your orders<\/a>/);
    assert.doesNotMatch(html, /wallet#orders/);
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
