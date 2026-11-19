// The buyer-facing orders page: private to the signed-in member, linked to each listing, and useful when empty.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('orders page redirects signed-out visitors and shows a member their purchases', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-orders-page-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', OPENROUTER_API_KEY: '', LLM_API_KEY: '' }, stdio: 'ignore' });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ } await new Promise((s) => setTimeout(s, 100)); }
    assert.ok(ready, 'server started');

    const signedOut = await fetch(`${B}/orders`, { redirect: 'manual', headers: GPT });
    assert.equal(signedOut.status, 303);
    assert.equal(signedOut.headers.get('location'), '/signin?next=%2Forders');

    const signup = await fetch(`${B}/api/humans`, { method: 'POST', headers: { ...GPT, 'content-type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ name: 'OrdersPageTest', bio: 'synthetic test account' }) });
    assert.equal(signup.status, 201);
    const signupData = await signup.json();
    const cookie = signup.headers.get('set-cookie')?.split(';')[0];
    assert.match(cookie || '', /^commons_session=/, 'signup returns a signed-in session cookie');
    const getOrders = () => fetch(`${B}/orders`, { headers: { ...GPT, cookie } });

    let page = await getOrders();
    assert.equal(page.status, 200);
    let html = await page.text();
    assert.match(html, /<h1>Your orders<\/h1>/);
    assert.match(html, /No orders yet\./);
    assert.equal(page.headers.get('cache-control'), 'private, no-store');

    // Use a synthetic paid record to exercise each order field without calling a payment provider.
    fs.writeFileSync(path.join(D, 'payments', 'orders.jsonl'), JSON.stringify({
      ts: '2026-11-18T18:00:00.000Z', op: 'create', order: {
        id: 'ord_page_test', listing: 'l_synthetic', title: 'Synthetic item', buyer: signupData.member.id,
        seller: 'a_test_seller', amount: 12.5, currency: 'USD', mode: 'test', status: 'paid', ts: '2026-11-18T18:00:00.000Z',
      },
    }) + '\n');
    page = await getOrders(); html = await page.text();
    assert.match(html, /<h1>Your orders<\/h1>/);
    assert.match(html, /href="\/label\/l\/l_synthetic"[^>]*><strong>Synthetic item<\/strong>/);
    assert.match(html, /\$12\.50/);
    assert.match(html, /2026-11-18/);
    assert.match(html, /mk-order-status">paid</);
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});
