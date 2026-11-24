// Unknown Printful options must be rejected explicitly instead of silently disappearing from a draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');

test('unknown colours and wall-art sizes name the unknown option and available choices', async () => {
  const PRODUCTS = {
    71: { title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', variants: [
      { id: 4012, name: 'Black / M', color: 'Black', size: 'M', price: '11.50' },
      { id: 4013, name: 'Black / 2XL', color: 'Black', size: '2XL', price: '14.25' },
      { id: 4022, name: 'White / M', color: 'White', size: 'M', price: '11.50' }] },
    3: { title: 'Canvas (in)', variants: [
      { id: 5, name: '12×16', size: '12×16', price: '24.25' },
      { id: 7, name: '16×20', size: '16×20', price: '29.50' }] },
  };
  const FP = await freePort();
  const fake = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    let m = u.pathname.match(/^\/products\/(\d+)$/);
    if (m && PRODUCTS[m[1]]) { const p = PRODUCTS[m[1]]; return json(200, { code: 200, result: { product: { id: Number(m[1]), title: p.title, currency: 'USD', is_discontinued: false }, variants: p.variants.map((v) => ({ ...v, in_stock: true })) } }); }
    m = u.pathname.match(/^\/mockup-generator\/printfiles\/(\d+)$/);
    if (m && m[1] === '3') return json(200, { code: 200, result: { available_placements: { default: 'Print' }, printfiles: [{ printfile_id: 105, width: 3600, height: 4800, dpi: 150 }, { printfile_id: 107, width: 4800, height: 6000, dpi: 150 }], variant_printfiles: [{ variant_id: 5, placements: { default: 105 } }, { variant_id: 7, placements: { default: 107 } }] } });
    if (m) return json(200, { code: 200, result: { available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400, dpi: 150 }], variant_printfiles: PRODUCTS[m[1]].variants.map((v) => ({ variant_id: v.id, placements: { front: 1 } })) } });
    json(404, { code: 404 });
  });
  await new Promise((r) => fake.listen(FP, '127.0.0.1', r));
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-unknown-option-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_TEST_ASSETS: '1',
    PRINTFUL_TOKEN: 'test-token', PRINTFUL_API_URL: `http://127.0.0.1:${FP}`, COMMONS_PUBLIC_URL: B, COMMONS_FEE_PERCENT: '0',
    PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }, { key: 'canvas', id: 3 }]) }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const call = async (p, method = 'GET', body, cookie) => { const r = await fetch(B + p, { method, headers: { ...J, ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { r, j: await r.json().catch(() => ({})) }; };
  const human = async (name) => { const { r } = await call('/api/humans', 'POST', { name }); return (r.headers.get('set-cookie') || '').split(';')[0]; };
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    assert.ok(ready, 'test server started');
    const maker = await human('Option Tester');
    const art = await call('/api/images', 'POST', { data: PNG.toString('base64'), alt: 'test artwork' }, maker);
    assert.equal(art.r.status, 201, JSON.stringify(art.j));
    const listing = await call('/api/market/listings', 'POST', { title: 'Test artwork', text: 'A test.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true, images: [art.j.id] }, maker);
    assert.equal(listing.r.status, 201, JSON.stringify(listing.j));
    const id = listing.j.id;

    const badColor = await call(`/api/market/listings/${id}/merch/tee`, 'PUT', { colors: ['Black', 'Chartreuse'], price: 30 }, maker);
    assert.equal(badColor.r.status, 400, JSON.stringify(badColor.j));
    assert.match(badColor.j.error, /Chartreuse/); assert.match(badColor.j.error, /Black, White/);

    const badSize = await call(`/api/market/listings/${id}/merch/canvas`, 'PUT', { sizes: ['16×20', 'Poster XXL'], price: 60 }, maker);
    assert.equal(badSize.r.status, 400, JSON.stringify(badSize.j));
    assert.match(badSize.j.error, /Poster XXL/); assert.match(badSize.j.error, /12×16, 16×20/);

    const goodColors = await call(`/api/market/listings/${id}/merch/tee`, 'PUT', { colors: ['Black', 'White'], price: 30 }, maker);
    assert.equal(goodColors.r.status, 200, JSON.stringify(goodColors.j)); assert.deepEqual(goodColors.j.colors, ['Black', 'White']);
    const goodSizes = await call(`/api/market/listings/${id}/merch/canvas`, 'PUT', { sizes: ['12×16', '16×20'], price: 60 }, maker);
    assert.equal(goodSizes.r.status, 200, JSON.stringify(goodSizes.j)); assert.deepEqual(goodSizes.j.sizes.map((s) => s.size), ['12×16', '16×20']);
  } finally { srv.kill(); fake.close(); fs.rmSync(D, { recursive: true, force: true }); }
});
