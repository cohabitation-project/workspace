// Print on demand with real Printful mockups (Ash's spec, 2026-11-21), against a stand-in Printful on 127.0.0.1.
// A maker picks a product, places their own art, gets a mockup (kept in our image library: Printful's links expire),
// sets a price at or above the base cost, and publishes a listing linked to the Printful product. Orders stay closed.
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

test('a maker turns their art into a Printful product with a real mockup', async () => {
  const seen = { tasks: [], auth: [] }; let polls = 0;
  const FP = await freePort();
  const fake = http.createServer((req, res) => {
    seen.auth.push(req.headers.authorization);
    const u = new URL(req.url, 'http://x'); const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (u.pathname === '/products/71') return json(200, { code: 200, result: { product: { id: 71, title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', currency: 'USD', is_discontinued: false }, variants: [{ id: 4012, name: 'Black / M', color: 'Black', size: 'M', price: '12.95', in_stock: true }, { id: 4013, name: 'White / L', color: 'White', size: 'L', price: '11.50', in_stock: true }] } });
    if (u.pathname === '/products/999') return json(404, { code: 404, error: { message: 'Not found' } });
    if (u.pathname === '/mockup-generator/printfiles/71') return json(200, { code: 200, result: { product_id: 71, available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400, dpi: 150 }], variant_printfiles: [{ variant_id: 4012, placements: { front: 1 } }] } });
    if (u.pathname === '/mockup-generator/create-task/71' && req.method === 'POST') { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { seen.tasks.push(JSON.parse(b)); json(200, { code: 200, result: { task_key: `gt-${seen.tasks.length}`, status: 'pending' } }); }); return; }
    if (u.pathname === '/mockup-generator/task') { polls++; return json(200, { code: 200, result: polls === 1 ? { task_key: u.searchParams.get('task_key'), status: 'pending' } : { task_key: u.searchParams.get('task_key'), status: 'completed', mockups: [{ placement: 'front', variant_ids: [4012], mockup_url: `http://127.0.0.1:${FP}/mockup.png` }] } }); }
    if (u.pathname === '/mockup.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(PNG2); }
    json(404, { code: 404 });
  });
  await new Promise((r) => fake.listen(FP, '127.0.0.1', r));

  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-printful-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_TEST_ASSETS: '1',
    PRINTFUL_TOKEN: 'test-token', PRINTFUL_API_URL: `http://127.0.0.1:${FP}`, COMMONS_PUBLIC_URL: B, PRINTFUL_MOCKUPS_PER_MINUTE: '2',
    PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }, { key: 'gone', id: 999 }]) }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const call = async (p, method = 'GET', body, cookie) => { const r = await fetch(B + p, { method, headers: { ...J, ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { r, j: await r.json().catch(() => ({})) }; };
  const human = async (name) => { const { r } = await call('/api/humans', 'POST', { name }); return (r.headers.get('set-cookie') || '').split(';')[0]; };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    const maker = await human('Maker One'); const other = await human('Other Maker');
    const art = await call('/api/images', 'POST', { data: PNG.toString('base64'), alt: 'my sunflower drawing' }, maker);
    assert.equal(art.r.status, 201, JSON.stringify(art.j));
    const theirs = await call('/api/images', 'POST', { data: PNG2.toString('base64'), alt: 'someone else art' }, other);

    // The product list: only products Printful actually returns, with Printful's own title and prices.
    const pr = await call('/api/merch/products');
    assert.equal(pr.j.connected, true);
    assert.deepEqual(pr.j.products.map((p) => p.key), ['tee'], 'a product Printful does not return is left out');
    assert.match(pr.j.products[0].title, /Bella \+ Canvas 3001/);
    assert.equal(pr.j.products[0].area.width, 1800); assert.equal(pr.j.products[0].base_from, 11.5);
    assert.ok(seen.auth.every((a) => a === 'Bearer test-token'), 'the token goes only in the Authorization header');

    // Signed out, or someone else's picture: no mockup.
    assert.equal((await call('/api/merch/mockups', 'POST', { product: 'tee', art: art.j.id })).r.status, 401);
    assert.equal((await call('/api/merch/mockups', 'POST', { product: 'tee', variant: 4012, art: theirs.j.id }, maker)).r.status, 403);

    // A mockup: the art's public address and a position inside the print area go to Printful.
    const mk = await call('/api/merch/mockups', 'POST', { product: 'tee', variant: 4012, art: art.j.id, scale: 0.5, y: 0.2, aspect: 2 }, maker);
    assert.equal(mk.r.status, 202, JSON.stringify(mk.j)); assert.equal(mk.j.base_price, 12.95);
    const sent = seen.tasks.at(-1);
    assert.deepEqual(sent.variant_ids, [4012]); assert.equal(sent.files[0].placement, 'front');
    assert.equal(sent.files[0].image_url, `${B}/images/${art.j.id}`);
    assert.deepEqual(sent.files[0].position, { area_width: 1800, area_height: 2400, width: 900, height: 450, left: 450, top: 390 });

    // Nobody else can read it; it's pending, then done, and our copy is kept.
    assert.equal((await call(`/api/merch/mockups/${mk.j.task}`, 'GET', null, other)).r.status, 404);
    assert.equal((await call(`/api/merch/mockups/${mk.j.task}`, 'GET', null, maker)).j.status, 'pending');
    const done = await call(`/api/merch/mockups/${mk.j.task}`, 'GET', null, maker);
    assert.equal(done.j.status, 'completed', JSON.stringify(done.j));
    const pic = await fetch(`${B}${done.j.url}`); assert.equal(pic.status, 200); assert.match(pic.headers.get('content-type') || '', /^image\//);

    // Publishing: below the base cost is refused; at or above it makes a listing linked to the Printful product.
    const listing = { title: 'Sunflower tee', text: 'My sunflower drawing on a soft black tee.', tags: 'sunflower', license: 'all-rights', made_by: 'human', rights: true, mockup: mk.j.task };
    const low = await call('/api/merch/listings', 'POST', { ...listing, price: { amount: 10 } }, maker);
    assert.equal(low.r.status, 400); assert.match(low.j.error, /12\.95/);
    assert.equal((await call('/api/merch/listings', 'POST', { ...listing, price: { amount: 30 } }, other)).r.status, 404, "someone else can't publish your mockup");
    const ok = await call('/api/merch/listings', 'POST', { ...listing, price: { amount: 25 } }, maker);
    assert.equal(ok.r.status, 201, JSON.stringify(ok.j));
    assert.equal(ok.j.category, 'art'); assert.equal(ok.j.price.amount, 25);
    assert.deepEqual(ok.j.images.map((x) => x.id || x), [done.j.image, art.j.id], 'the mockup leads, the art follows');
    const fl = await call(`/api/market/listings/${ok.j.id}/fulfillment`, 'GET', null, maker);
    assert.equal(fl.j.link.provider, 'printful'); assert.equal(fl.j.link.product_id, '71'); assert.deepEqual(fl.j.link.variant_ids, ['4012']);
    assert.equal(fl.j.link.design.art, art.j.id); assert.equal(fl.j.link.design.position.width, 900);
    assert.equal((await call('/api/merch/listings', 'POST', { ...listing, price: { amount: 25 } }, maker)).r.status, 404, 'a mockup publishes once');

    // Printful's limit: a few mockups a minute for the whole market.
    await call('/api/merch/mockups', 'POST', { product: 'tee', variant: 4012, art: art.j.id }, maker);
    const third = await call('/api/merch/mockups', 'POST', { product: 'tee', variant: 4012, art: art.j.id }, maker);
    assert.equal(third.r.status, 429); assert.match(third.j.error, /a minute/);
  } finally { srv.kill(); fake.close(); }
});

// ---------------------------------------------------------------------------------------------------------------
// Geoffrey hit this live (Ash, Builders m_mwv37m0npd1e8b7f): a WebP uploads fine, then Printful refuses the mockup —
// "Use PNG or JPG". Setu's call: the SERVER converts, the maker does nothing, and the converted PNG is what the task
// and the later ORDER carry, so a printer is never handed a WebP. PNG art is untouched: same id in, same id sent.
const WEBP = Buffer.from('UklGRkAAAABXRUJQVlA4IDQAAAAwAgCdASoCAAIAAMASJaACdLoB+AH4AARoAAD++iGX/3easNN39a3/9aOfron+tHP/WVgA', 'base64');
test('WebP art is turned into a PNG before it goes to Printful', async () => {
  const seen = { tasks: [] }; let polls = 0;
  const FP = await freePort();
  const fake = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (u.pathname === '/products/71') return json(200, { code: 200, result: { product: { id: 71, title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', currency: 'USD', is_discontinued: false }, variants: [{ id: 4012, name: 'Black / M', color: 'Black', size: 'M', price: '12.95', in_stock: true }] } });
    if (u.pathname === '/mockup-generator/printfiles/71') return json(200, { code: 200, result: { product_id: 71, available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400, dpi: 150 }], variant_printfiles: [{ variant_id: 4012, placements: { front: 1 } }] } });
    if (u.pathname === '/mockup-generator/create-task/71' && req.method === 'POST') { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { seen.tasks.push(JSON.parse(b)); json(200, { code: 200, result: { task_key: `wb-${seen.tasks.length}`, status: 'pending' } }); }); return; }
    if (u.pathname === '/mockup-generator/task') { polls++; return json(200, { code: 200, result: polls === 1 ? { task_key: u.searchParams.get('task_key'), status: 'pending' } : { task_key: u.searchParams.get('task_key'), status: 'completed', mockups: [{ placement: 'front', variant_ids: [4012], mockup_url: `http://127.0.0.1:${FP}/mockup.png` }] } }); }
    if (u.pathname === '/mockup.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(PNG2); }
    json(404, { code: 404 });
  });
  await new Promise((r) => fake.listen(FP, '127.0.0.1', r));

  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-printful-webp-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_TEST_ASSETS: '1',
    PRINTFUL_TOKEN: 'test-token', PRINTFUL_API_URL: `http://127.0.0.1:${FP}`, COMMONS_PUBLIC_URL: B, PRINTFUL_MOCKUPS_PER_MINUTE: '9',
    PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }]) }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const call = async (p, method = 'GET', body, cookie) => { const r = await fetch(B + p, { method, headers: { ...J, ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { r, j: await r.json().catch(() => ({})) }; };
  const human = async (name) => { const { r } = await call('/api/humans', 'POST', { name }); return (r.headers.get('set-cookie') || '').split(';')[0]; };
  const pic = async (id) => { const r = await fetch(`${B}/images/${id}`); return { status: r.status, buf: Buffer.from(await r.arrayBuffer()) }; };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    const maker = await human('Maker Webp'); const other = await human('Other Maker');
    const webp = await call('/api/images', 'POST', { data: WEBP.toString('base64'), alt: 'my webp drawing' }, maker);
    assert.equal(webp.r.status, 201, JSON.stringify(webp.j)); assert.equal(webp.j.ext, 'webp', 'the library keeps an upload as it came');
    const png = await call('/api/images', 'POST', { data: PNG.toString('base64'), alt: 'my png drawing' }, maker);
    assert.equal(png.r.status, 201, JSON.stringify(png.j)); assert.equal(png.j.ext, 'png');
    const theirs = await call('/api/images', 'POST', { data: WEBP.toString('base64'), alt: 'someone else webp' }, other);

    // Someone else's WebP is still refused before any conversion.
    assert.equal((await call('/api/merch/mockups', 'POST', { product: 'tee', variant: 4012, art: theirs.j.id }, maker)).r.status, 403);

    // WebP art: the task carries a DIFFERENT picture, and that picture is a real PNG.
    const mk = await call('/api/merch/mockups', 'POST', { product: 'tee', variant: 4012, art: webp.j.id, aspect: 1 }, maker);
    assert.equal(mk.r.status, 202, JSON.stringify(mk.j));
    const sentWebp = seen.tasks.at(-1);
    assert.match(sentWebp.files[0].image_url, /\/images\/img_[0-9a-f]{16}$/);
    const convId = sentWebp.files[0].image_url.split('/').pop();
    assert.notEqual(convId, webp.j.id, 'Printful is not handed the WebP id any more');
    const conv = await pic(convId);
    assert.equal(conv.status, 200); assert.equal(conv.buf.subarray(0, 4).toString('hex'), '89504e47', 'the converted file starts with the PNG signature');
    assert.equal((await pic(webp.j.id)).buf.subarray(8, 12).toString('latin1'), 'WEBP', "the maker's original is left as it was");

    // PNG art is untouched: the id the maker chose is the id Printful is handed.
    const mk2 = await call('/api/merch/mockups', 'POST', { product: 'tee', variant: 4012, art: png.j.id }, maker);
    assert.equal(mk2.r.status, 202, JSON.stringify(mk2.j));
    assert.equal(seen.tasks.at(-1).files[0].image_url, `${B}/images/${png.j.id}`);

    // And the ORDER is built on the PNG, not the WebP: the listing's fulfillment link carries the converted id.
    assert.equal((await call(`/api/merch/mockups/${mk.j.task}`, 'GET', null, maker)).j.status, 'pending');
    assert.equal((await call(`/api/merch/mockups/${mk.j.task}`, 'GET', null, maker)).j.status, 'completed');
    const ok = await call('/api/merch/listings', 'POST', { title: 'Webp tee', text: 'My drawing on a soft black tee.', tags: 'drawing', license: 'all-rights', made_by: 'human', rights: true,
      mockup: mk.j.task, price: { amount: 25 } }, maker);
    assert.equal(ok.r.status, 201, JSON.stringify(ok.j));
    const fl = await call(`/api/market/listings/${ok.j.id}/fulfillment`, 'GET', null, maker);
    assert.equal(fl.j.link.design.art, convId, 'the printed file is the converted PNG');
  } finally { srv.kill(); fake.close(); }
});
