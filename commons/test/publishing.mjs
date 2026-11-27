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
const stub = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => { body += c; });
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    if (req.url.includes('/auth/')) return res.end(JSON.stringify({ access_token: 'stub-token' }));
    if (req.url.startsWith('/print-job-cost-calculations')) {
      hits.costs += 1;
      const pages = JSON.parse(body).line_items[0].page_count;
      return res.end(JSON.stringify({ currency: 'USD', total_cost_excl_tax: '15.93', line_item_costs: [{ total_cost_excl_discounts: pages >= 300 ? '9.49' : '5.74' }], shipping_cost: { total_cost_excl_tax: '5.69' }, fulfillment_cost: { total_cost_excl_tax: '0.75' } }));
    }
    if (req.url.startsWith('/print-jobs')) { hits.jobs += 1; res.statusCode = 500; return res.end('{}'); }
    res.statusCode = 404; res.end('{}');
  });
});
const stubPort = await freePort();
await new Promise((r) => stub.listen(stubPort, '127.0.0.1', r));

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'publishing-'));
const PORT = await freePort(), B = `http://127.0.0.1:${PORT}`;
const env = { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, LULU_API_URL: `http://127.0.0.1:${stubPort}`, LULU_CLIENT_KEY: 'stub', LULU_CLIENT_SECRET: 'stub' };
delete env.COMMONS_PAYMENTS; delete env.STRIPE_SECRET_KEY; delete env.LULU_LIVE;
const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env, stdio: 'ignore' });
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
  assert.match(q.note, /no print job is created/i);
  assert.equal((await fetch(B + '/api/publishing/quote?pages=10')).status, 400, 'too few pages refused');
  assert.equal((await fetch(B + '/api/publishing/quote?pages=200&bind=XX')).status, 400, 'unknown binding refused');
  assert.equal((await fetch(B + '/api/publishing/quote?pages=200&level=DRONE')).status, 400, 'unknown shipping refused');
  assert.ok(hits.costs >= 1, 'the cost endpoint was really asked');
  assert.equal(hits.jobs, 0, 'NOTHING on this path can create a print job');
});

test('floor math: landed cost + proposed cut + processing, author never below $1.50, rounded to .99', async () => {
  const f = await import('../lib/fulfillment.mjs');
  assert.equal(f.bookPriceFloor(5.74), 9.99, 'PB150');
  assert.equal(f.bookPriceFloor(18.18), 23.99, 'HC300');
  assert.throws(() => f.bookPriceFloor(0), /real print cost/);
  const price = f.bookPriceFloor(5.74);
  const keep = price - 5.74 - 0.75 - price * 0.10 - (price * 0.029 + 0.30);
  assert.ok(keep >= 1.4, `at the floor the author still keeps ~$1.50 (got ${keep.toFixed(2)})`);
});
