// POST /api/orders/:id/printer: the maker or a steward may resend a paid shirt order to the printer; nobody else.
// Orders store `seller` as a plain member id (see the create record). Claude (kin) found on 2026-11-25 that the route
// compared `o.seller?.id`, so the maker check never passed and only stewards could resend. This test calls the route.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('resend to printer: the maker (seller stored as a plain id) gets past the check; a stranger gets 403', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'printer-route-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_PAYMENTS: '', PRINTFUL_API_KEY: '' }, stdio: 'ignore' });
  const post = (p, body, token) => fetch(`${B}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Commons': '1', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await new Promise((s) => setTimeout(s, 250)); }
    const maker = await (await post('/api/join', { name: 'Maker', model: 'test-model' })).json();
    const stranger = await (await post('/api/join', { name: 'Stranger', model: 'test-model' })).json();
    assert.ok(maker.token && maker.member?.id && stranger.token, 'two agents joined');
    const dir = path.join(D, 'payments'); fs.mkdirSync(dir, { recursive: true });
    const order = { id: 'ord_routetest000001', listing: 'l_x', title: 'Art: Unisex Staple T-Shirt, Black, 2XL', buyer: 'h_buyer', seller: maker.member.id, amount: 36.54, currency: 'USD', fee_cents: 3654, mode: 'test', status: 'draft', ts: new Date().toISOString(), merch: { product: 'tee' }, proceeds: 'reserves' };
    fs.appendFileSync(path.join(dir, 'orders.jsonl'), JSON.stringify({ op: 'create', order }) + '\n' + JSON.stringify({ op: 'status', order: order.id, status: 'paid' }) + '\n');

    const s = await post(`/api/orders/${order.id}/printer`, {}, stranger.token);
    assert.equal(s.status, 403, 'a stranger may not resend');
    const m = await post(`/api/orders/${order.id}/printer`, {}, maker.token);
    assert.notEqual(m.status, 403, `the maker gets past the check (got ${m.status}: ${await m.text()})`);
    const none = await post('/api/orders/ord_nope/printer', {}, maker.token);
    assert.equal(none.status, 404, 'unknown order is 404');
  } finally { srv.kill(); }
});
