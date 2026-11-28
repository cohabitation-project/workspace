// Publishing Desk (t_e50fd534c2): the page is a COHABI service (no Firedamm CTA), the quote is read-only
// cost math against a stub Lulu (no real network), validation refuses junk, and the floor math holds.
// Run: node --test commons/test/publishing.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

// a stub Lulu: answers the sign-in and the cost calculation; counts print-job attempts so we can prove zero
const hits = { costs: 0, jobs: 0 };
let mode = 'ok'; // ok | auth500 | cost500 | reset-auth | reset-cost : how the stub Lulu misbehaves
const stub = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => { body += c; });
  req.on('end', () => {
    if (req.url.startsWith('/print-jobs')) { hits.jobs += 1; res.statusCode = 500; return res.end('{}'); }
    if (req.url.includes('/auth/')) { if (mode === 'reset-auth') return req.socket.destroy(); if (mode === 'auth500') { res.statusCode = 500; return res.end('{}'); } }
    if (req.url.startsWith('/print-job-cost-calculations')) { hits.costs += 1; if (mode === 'reset-cost') return req.socket.destroy(); if (mode === 'cost500') { res.statusCode = 500; return res.end('{}'); } }
    res.setHeader('content-type', 'application/json');
    if (req.url.includes('/auth/')) return res.end(JSON.stringify({ access_token: 'stub-token' }));
    if (req.url.startsWith('/print-job-cost-calculations')) {
      hits.costs += 1;
      const pages = JSON.parse(body).line_items[0].page_count;
      return res.end(JSON.stringify({ currency: 'USD', total_cost_excl_tax: '15.93', line_item_costs: [{ total_cost_excl_discounts: pages >= 300 ? '9.49' : '5.74' }], shipping_cost: { total_cost_excl_tax: '5.69' }, fulfillment_cost: { total_cost_excl_tax: '0.75' } }));
    }
    res.statusCode = 404; res.end('{}');
  });
});
const stubPort = await freePort();
await new Promise((r) => stub.listen(stubPort, '127.0.0.1', r));

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'publishing-'));
const PORT = await freePort(), B = `http://127.0.0.1:${PORT}`;
const env = { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, LULU_API_URL: `http://127.0.0.1:${stubPort}`, LULU_CLIENT_KEY: 'stub', LULU_CLIENT_SECRET: 'stub' };
delete env.COMMONS_PAYMENTS; delete env.STRIPE_SECRET_KEY; delete env.LULU_LIVE;
let srvErr = ''; // the server's stderr: an unhandled exception is logged there as '[commons] error', and must not be for a Lulu failure
const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env, stdio: ['ignore', 'ignore', 'pipe'] });
srv.stderr.on('data', (c) => { srvErr += c; });
test.after(() => { srv.kill(); stub.close(); });
async function up() { for (let i = 0; i < 60; i++) { try { if ((await fetch(B + '/healthz')).ok) return; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); } throw new Error('server did not start'); }

test('the Publishing Desk page is a Cohabi service, honest about test mode and the pending council decision', async () => {
  await up();
  const r = await fetch(B + '/label/publish'); assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /A COHABI COOPERATIVE SERVICE/, 'the service is the cooperative’s');
  assert.ok(!/firedamm/i.test(html), 'no Firedamm CTA (Geoffrey, 2026-11-26)');
  assert.match(html, /pending the cooperative council/i, 'prices labelled pending council');
  assert.match(html, /publishing\.js\?v=/, 'the live calculator ships with a cache-busted asset');
  assert.match(html, /planned — not built yet/i, 'future tools are labelled planned, never implied live');
});

test('the quote is read-only cost math: real split out, junk refused, zero print jobs created', async () => {
  await up();
  const q = await (await fetch(B + '/api/publishing/quote?pages=300&bind=PB&level=MAIL')).json();
  assert.equal(q.print_usd, 9.49); assert.equal(q.fulfillment_usd, 0.75); assert.equal(q.shipping_usd, 5.69);
  assert.equal(q.total_usd, 15.93); assert.equal(q.pending_council, true);
  assert.ok(q.floor_usd > q.print_usd + 0.75, 'the floor covers more than the landed cost');
  assert.equal(q.floor_usd, 14.99, 'the route floors with the quoted SHIPPING too (print 9.49 + 0.75 + 5.69 shipping)');
  assert.match(q.note, /no print job is created/i);
  assert.equal((await fetch(B + '/api/publishing/quote?pages=10')).status, 400, 'too few pages refused');
  assert.equal((await fetch(B + '/api/publishing/quote?pages=200&bind=XX')).status, 400, 'unknown binding refused');
  assert.equal((await fetch(B + '/api/publishing/quote?pages=200&level=DRONE')).status, 400, 'unknown shipping refused');
  assert.ok(hits.costs >= 1, 'the cost endpoint was really asked');
  assert.equal(hits.jobs, 0, 'NOTHING on this path can create a print job');
});

// the page's own rounding of the seller split, in whole cents (publishing.js render()): what the author is SHOWN keeping
const shownKeepCents = (price, print, ful, ship) => { const cut = Math.round(price * 0.10 * 100) / 100; const card = Math.round(((price + ship) * 0.029 + 0.30) * 100) / 100; return Math.round((price - print - ful - cut - card) * 100); };

test('floor math: landed cost + proposed cut + card on book AND shipping, author never below $1.50, rounded to .99', async () => {
  const f = await import('../lib/fulfillment.mjs');
  assert.equal(f.bookPriceFloor(5.74), 9.99, 'PB150, no shipping argument: unchanged');
  assert.equal(f.bookPriceFloor(18.18), 23.99, 'HC300, no shipping argument: unchanged');
  assert.throws(() => f.bookPriceFloor(0), /real print cost/);
  // GPT's case (round 77): 300pp paperback, print 9.49 + fulfillment 0.75 + shipping 5.69. The old floor, 13.99, left $1.48.
  assert.equal(shownKeepCents(13.99, 9.49, 0.75, 5.69), 148, 'the old floor really did leave 1.48');
  const p = f.bookPriceFloor(9.49, 5.69, 0.75);
  assert.equal(p, 14.99); assert.ok(shownKeepCents(p, 9.49, 0.75, 5.69) >= 150, 'now at least $1.50 is shown as the author share');
  // a grid, so the property holds beyond one example: every print cost x every shipping level the stub/Lulu use
  let n = 0;
  for (let c = 200; c <= 4000; c += 7) for (const ship of [0, 5.69, 20.74]) {
    const print = c / 100, price = f.bookPriceFloor(print, ship, 0.75); n += 1;
    assert.ok(shownKeepCents(price, print, 0.75, ship) >= 150, `print ${print} ship ${ship} floor ${price}: author share under $1.50`);
    assert.equal(Math.round(price * 100) % 100, 99, 'ends in .99');
  }
  assert.ok(n > 1000);
});

test('the seller split shows Fulfillment as its own line, and says the card fee is on book + shipping', () => {
  const js = fs.readFileSync(path.join(import.meta.dirname, '..', 'public', 'publishing.js'), 'utf8');
  assert.ok(!/Print \+ fulfillment/.test(js), 'print and fulfillment are not merged into one deduction');
  assert.match(js, /<td[^>]*>Print<\/td><td>−\$\{usd\(q\.print_usd\)\}/);
  assert.match(js, /<td[^>]*>Fulfillment<\/td><td>−\$\{usd\(q\.fulfillment_usd/);
  assert.match(js, /Card processing, on book \+ shipping/);
});

// ---- refusal paths: whatever Lulu does, the member gets one short sentence (502), never a stack or a 500, and no print job
async function refused(url, want) {
  const before = srvErr.length;
  const r = await fetch(B + url); const b = await r.json();
  assert.equal(r.status, want.status, `${want.why}: status ${r.status} ${JSON.stringify(b)}`);
  assert.equal(typeof b.error, 'string'); assert.ok(b.error.length > 0 && b.error.length < 120, 'one short sentence');
  assert.ok(!/fetch failed|ECONNRESET|TypeError|\bat \w|node_modules|stub-token/.test(JSON.stringify(b)), 'no stack, no internals, no token');
  assert.ok(!/\[commons\] error/.test(srvErr.slice(before)), `${want.why}: the server must not log an unhandled exception`);
  return b;
}
test('Lulu sign-in refused, cost refused, or network dropped: a 502 sentence, no stack, no log, no /print-jobs', async () => {
  await up();
  for (const m of ['auth500', 'cost500', 'reset-auth', 'reset-cost']) {
    mode = m;
    await refused('/api/publishing/quote?pages=200&bind=PB&level=MAIL', { status: 502, why: m });
  }
  mode = 'ok';
  assert.equal((await fetch(B + '/api/publishing/quote?pages=200')).status, 200, 'and it recovers when Lulu does');
  assert.equal(hits.jobs, 0, 'NOTHING on any failure path creates a print job');
});

test('missing Lulu credentials: 503 before any network call (unit, the same function the route calls)', async () => {
  const f = await import('../lib/fulfillment.mjs');
  const saved = [process.env.LULU_CLIENT_KEY, process.env.LULU_CLIENT_SECRET];
  delete process.env.LULU_CLIENT_KEY; delete process.env.LULU_CLIENT_SECRET;
  let calls = 0;
  try { await assert.rejects(() => f.luluCost({ pages: 200 }, async () => { calls += 1; return { ok: true, json: async () => ({}) }; }), (e) => e.status === 503 && /not configured/.test(e.message)); }
  finally { [process.env.LULU_CLIENT_KEY, process.env.LULU_CLIENT_SECRET] = saved; }
  assert.equal(calls, 0, 'no call goes out without credentials');
});

test('a rejected fetch inside luluCost is the same 502 sentence as a refusal (unit: sign-in leg and cost leg)', async () => {
  const f = await import('../lib/fulfillment.mjs');
  const boom = () => Promise.reject(new TypeError('fetch failed'));
  await assert.rejects(() => f.luluCost({ pages: 200 }, boom), (e) => e.status === 502 && !/fetch failed/.test(e.message), 'sign-in leg');
  let n = 0;
  const costLegBoom = (url) => (++n === 1 ? Promise.resolve({ ok: true, json: async () => ({ access_token: 't' }) }) : Promise.reject(new TypeError('fetch failed')));
  await assert.rejects(() => f.luluCost({ pages: 200 }, costLegBoom), (e) => e.status === 502 && !/fetch failed/.test(e.message), 'cost leg');
  assert.equal(n, 2);
});
