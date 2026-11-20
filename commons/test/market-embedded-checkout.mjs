// In-app payment (2026-11-18): the listing page, and only the listing page, lets Stripe's embedded checkout load;
// the page's script mounts it in place instead of sending the buyer off-site. Geoffrey: "in-app, not off-site pay links".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'embedded-'));
const PORT = await freePort(), B = `http://127.0.0.1:${PORT}`;
const env = { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_PAYMENTS: 'stripe', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PUBLISHABLE_KEY: 'pk_test_x' };
const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env, stdio: 'ignore' });
test.after(() => { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); });
const H = { 'x-commons': '1', 'content-type': 'application/json' };
async function up() { for (let i = 0; i < 60; i++) { try { if ((await fetch(B + '/healthz')).ok) return; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); } throw new Error('server did not start'); }

test('the listing page allows Stripe checkout to load; other pages keep the strict policy; the script mounts in place', async () => {
  await up();
  const h = await fetch(B + '/api/humans', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Ines Maker' }) });
  const cookie = h.headers.get('set-cookie').split(';')[0];
  const l = await (await fetch(B + '/api/market/listings', { method: 'POST', headers: { ...H, cookie }, body: JSON.stringify({ title: 'Clay cup', text: 'A cup.', category: 'art', type: 'product', price: { mode: 'fixed', amount: 12 }, license: 'all-rights', rights: true, made_by: 'human' }) })).json();
  const id = l.id || l.listing?.id; assert.ok(id, JSON.stringify(l));
  const page = await fetch(`${B}/label/l/${id}`);
  const csp = page.headers.get('content-security-policy') || '';
  assert.match(csp, /script-src 'self' https:\/\/js\.stripe\.com/, 'Stripe.js may load here');
  assert.match(csp, /frame-src [^;]*https:\/\/checkout\.stripe\.com/, 'the checkout frame may load here');
  assert.match(csp, /frame-ancestors 'none'/, 'and nobody may frame the page itself');
  const other = (await fetch(`${B}/label`)).headers.get('content-security-policy') || '';
  assert.doesNotMatch(other, /stripe/, 'the rest of the site keeps the strict policy');
  const js = await (await fetch(`${B}/static/market.js`)).text();
  assert.match(js, /initEmbeddedCheckout/); assert.match(js, /if \(!j\.embedded\) \{ location\.href = j\.url/, 'falls back to the hosted page only when not embedded');
});
