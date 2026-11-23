// One artwork, many products (Geoffrey, 2026-11-23: "An artist shouldn't have to post a cup, a shirt, a print as
// different individual objects ... make the one image that's sitting there able to be applied to anything").
// Booted server against a stand-in Printful: the maker ticks products on their EXISTING art listing, prices are held at
// or above Printful's highest base cost, mockups are made in the background and land in a "Get it on" row on the same
// listing. Only the maker can set them. No new listings are created. Buying stays off (a separate Tier 1 step).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
const PNG2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC', 'base64');

test('a maker puts one artwork on several products, and the mockups appear under it', async () => {
  const seen = { tasks: [] };
  const PRODUCTS = {
    71: { title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', variants: [{ id: 4012, name: 'Black / M', price: '11.50' }, { id: 4013, name: 'Black / 2XL', price: '14.25' }] },
    19: { title: 'White Glossy Mug', variants: [{ id: 1320, name: '11 oz', price: '6.95' }] },
  };
  const FP = await freePort();
  const fake = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    let m = u.pathname.match(/^\/products\/(\d+)$/);
    if (m && PRODUCTS[m[1]]) { const p = PRODUCTS[m[1]]; return json(200, { code: 200, result: { product: { id: Number(m[1]), title: p.title, currency: 'USD', is_discontinued: false }, variants: p.variants.map((v) => ({ ...v, in_stock: true })) } }); }
    m = u.pathname.match(/^\/mockup-generator\/printfiles\/(\d+)$/);
    if (m) return json(200, { code: 200, result: { available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400 }], variant_printfiles: PRODUCTS[m[1]].variants.map((v) => ({ variant_id: v.id, placements: { front: 1 } })) } });
    m = u.pathname.match(/^\/mockup-generator\/create-task\/(\d+)$/);
    if (m && req.method === 'POST') { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { seen.tasks.push({ product: m[1], ...JSON.parse(b) }); json(200, { code: 200, result: { task_key: `gt-${seen.tasks.length}`, status: 'pending' } }); }); return; }
    if (u.pathname === '/mockup-generator/task') return json(200, { code: 200, result: { task_key: u.searchParams.get('task_key'), status: 'completed', mockups: [{ placement: 'front', mockup_url: `http://127.0.0.1:${FP}/mockup.png` }] } });
    if (u.pathname === '/mockup.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(PNG2); }
    json(404, { code: 404 });
  });
  await new Promise((r) => fake.listen(FP, '127.0.0.1', r));
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-sets-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_TEST_ASSETS: '1',
    PRINTFUL_TOKEN: 'test-token', PRINTFUL_API_URL: `http://127.0.0.1:${FP}`, COMMONS_PUBLIC_URL: B, PRINTFUL_MOCKUPS_PER_MINUTE: '10', MERCH_TICK_MS: '150',
    PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }, { key: 'mug', id: 19 }]) }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const call = async (p, method = 'GET', body, cookie) => { const r = await fetch(B + p, { method, headers: { ...J, ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { r, j: await r.json().catch(() => ({})) }; };
  const page = async (p, cookie) => (await fetch(B + p, { headers: cookie ? { cookie } : {} })).text();
  const human = async (name) => { const { r } = await call('/api/humans', 'POST', { name }); return (r.headers.get('set-cookie') || '').split(';')[0]; };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    const maker = await human('Painter One'); const other = await human('Someone Else');
    const art = await call('/api/images', 'POST', { data: PNG.toString('base64'), alt: 'a spiral sun over a city' }, maker);
    const l = await call('/api/market/listings', 'POST', { title: 'Spiral Sun', text: 'A painting.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true, images: [art.j.id] }, maker);
    assert.equal(l.r.status, 201, JSON.stringify(l.j));
    const before = (await call('/api/market/listings')).j.listings.length;

    // The new-listing form no longer has the one-product-per-listing panel; the edit page has the products section.
    assert.doesNotMatch(await page('/label/new?cat=art', maker), /id="mk-merch"/);
    assert.match(await page(`/label/l/${l.j.id}/edit`, maker), /id="mk-pods-edit"[^]*Put this art on products/);

    // Only the maker; prices at or above Printful's HIGHEST base cost for that product (so every size can sell).
    assert.equal((await call(`/api/market/listings/${l.j.id}/merch`, 'PUT', { items: [{ product: 'tee', price: 30 }] }, other)).r.status, 403);
    const low = await call(`/api/market/listings/${l.j.id}/merch`, 'PUT', { items: [{ product: 'tee', price: 12 }] }, maker);
    assert.equal(low.r.status, 400); assert.match(low.j.error, /14\.25/);
    const ok = await call(`/api/market/listings/${l.j.id}/merch`, 'PUT', { items: [{ product: 'tee', price: 25 }, { product: 'mug', price: 15 }] }, maker);
    assert.equal(ok.r.status, 200, JSON.stringify(ok.j));
    assert.deepEqual(ok.j.items.map((i) => [i.product, i.price]), [['tee', 25], ['mug', 15]]);
    assert.equal((await call('/api/market/listings')).j.listings.length, before, 'no new listings: the art stays one listing');

    // The row is on the listing right away; the background maker finishes the photos.
    assert.match(await page(`/label/l/${l.j.id}`), /Get it on[^]*Making the photo/);
    let v; for (let i = 0; i < 80; i++) { v = (await call(`/api/market/listings/${l.j.id}/merch`)).j; if (v.items.every((x) => x.status === 'ready')) break; await new Promise((r) => setTimeout(r, 150)); }
    assert.ok(v.items.every((x) => x.status === 'ready' && /^\/images\/img_/.test(x.mockup)), JSON.stringify(v));
    assert.equal(seen.tasks.length, 2, 'one mockup per product');
    assert.ok(seen.tasks.every((t) => t.files[0].image_url === `${B}/images/${art.j.id}`), 'Printful is sent the listing\'s own art');
    const lp = await page(`/label/l/${l.j.id}`);
    assert.match(lp, /Get it on[^]*Unisex Staple T-Shirt[^]*\$25\.00[^]*Black \/ 2XL[^]*White Glossy Mug[^]*\$15\.00/);
    assert.match(lp, /<button type="button" class="btn small" disabled>Buy<\/button>/, 'buying stays off until its checkout step');
    assert.match(lp, /Buying products opens with payments/);
    assert.match(await page('/label?cat=art'), /Also on 2 products/);

    // A price change keeps the finished photos; removing everything empties the row.
    await call(`/api/market/listings/${l.j.id}/merch`, 'PUT', { items: [{ product: 'tee', price: 28 }] }, maker);
    const kept = (await call(`/api/market/listings/${l.j.id}/merch`)).j;
    assert.equal(kept.items.length, 1); assert.equal(kept.items[0].status, 'ready'); assert.equal(seen.tasks.length, 2, 'no new mockup for a price change');
    await call(`/api/market/listings/${l.j.id}/merch`, 'PUT', { items: [] }, maker);
    assert.doesNotMatch(await page(`/label/l/${l.j.id}`), /Get it on/);
  } finally { srv.kill(); fake.close(); }
});
