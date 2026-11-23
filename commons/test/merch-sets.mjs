// One artwork, many products, done the way the best print shops do it (Geoffrey, 2026-11-23: "People want to see it
// before they release it ... There has to be color options ... the costs and the cuts ... clear right there"; Ash's
// six-point bar, Income m_mwtpc8631geb4a0b). Booted server against a stand-in Printful. Asserts:
//   - each product is a DRAFT, hidden from buyers, until the maker has the real photo and approves it
//   - the maker picks colours; buyers get those colours and every size, priced per size (upcharge passed through)
//   - the money: card fee 2.9% + $0.30, Cohabi cut from COMMONS_FEE_PERCENT, earnings; a price that pays nothing refused
//   - moving the art takes an approved product back to draft (its photo no longer matches)
//   - only the maker can do any of it; the art stays ONE listing
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

test('preview, colours, placement and money before a product reaches buyers', async () => {
  const seen = { tasks: [] };
  const PRODUCTS = {
    71: { title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', variants: [
      { id: 4012, name: 'Black / M', color: 'Black', color_code: '#0b0b0b', size: 'M', price: '11.50' },
      { id: 4013, name: 'Black / 2XL', color: 'Black', color_code: '#0b0b0b', size: '2XL', price: '14.25' },
      { id: 4022, name: 'White / M', color: 'White', color_code: '#ffffff', size: 'M', price: '11.50' }] },
    19: { title: 'White Glossy Mug', variants: [{ id: 1320, name: '11 oz', size: '11 oz', price: '6.95' }] },
    3: { title: 'Canvas (in)', variants: [{ id: 5, name: '12″×16″', size: '12″×16″', price: '24.25' }, { id: 7, name: '16″×20″', size: '16″×20″', price: '29.50' }] },
  };
  const PF = { 5: { w: 3600, h: 4800 }, 7: { w: 4800, h: 6000 } }; // wall art: each size its own print file (shape)
  const FP = await freePort();
  const fake = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    let m = u.pathname.match(/^\/products\/(\d+)$/);
    if (m && PRODUCTS[m[1]]) { const p = PRODUCTS[m[1]]; return json(200, { code: 200, result: { product: { id: Number(m[1]), title: p.title, currency: 'USD', is_discontinued: false }, variants: p.variants.map((v) => ({ ...v, in_stock: true })) } }); }
    m = u.pathname.match(/^\/mockup-generator\/printfiles\/(\d+)$/);
    if (m && m[1] === '3') return json(200, { code: 200, result: { available_placements: { default: 'Print' }, printfiles: Object.entries(PF).map(([vid, f]) => ({ printfile_id: 100 + Number(vid), width: f.w, height: f.h, dpi: 150 })), variant_printfiles: Object.keys(PF).map((vid) => ({ variant_id: Number(vid), placements: { default: 100 + Number(vid) } })) } });
    if (m) return json(200, { code: 200, result: { available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400, dpi: 150 }], variant_printfiles: PRODUCTS[m[1]].variants.map((v) => ({ variant_id: v.id, placements: { front: 1 } })) } });
    m = u.pathname.match(/^\/mockup-generator\/templates\/(\d+)$/);
    if (m) return json(200, { code: 200, result: { version: 1, min_dpi: 150, variant_mapping: [{ variant_id: 4012, templates: [{ placement: 'front', template_id: 919 }] }], templates: [{ template_id: 919, image_url: 'https://files.cdn.printful.com/tpl.png', background_url: null, background_color: '#ffffff', printfile_id: 1, template_width: 1000, template_height: 1000, print_area_width: 300, print_area_height: 400, print_area_top: 200, print_area_left: 350 }] } });
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
    PRINTFUL_TOKEN: 'test-token', PRINTFUL_API_URL: `http://127.0.0.1:${FP}`, COMMONS_PUBLIC_URL: B, PRINTFUL_MOCKUPS_PER_MINUTE: '10', MERCH_TICK_MS: '150', COMMONS_FEE_PERCENT: '0',
    PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }, { key: 'mug', id: 19 }, { key: 'canvas', id: 3 }]) }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const call = async (p, method = 'GET', body, cookie) => { const r = await fetch(B + p, { method, headers: { ...J, ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { r, j: await r.json().catch(() => ({})) }; };
  const page = async (p, cookie) => { const r = await fetch(B + p, { headers: cookie ? { cookie } : {}, redirect: 'manual' }); return { status: r.status, html: await r.text() }; };
  const human = async (name) => { const { r } = await call('/api/humans', 'POST', { name }); return (r.headers.get('set-cookie') || '').split(';')[0]; };
  const until = async (fn) => { for (let i = 0; i < 100; i++) { const v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 150)); } return null; };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    const maker = await human('Painter One'); const other = await human('Someone Else');
    const art = await call('/api/images', 'POST', { data: PNG.toString('base64'), alt: 'a spiral sun over a city' }, maker);
    const l = await call('/api/market/listings', 'POST', { title: 'Spiral Sun', text: 'A painting.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true, images: [art.j.id] }, maker);
    assert.equal(l.r.status, 201, JSON.stringify(l.j)); const id = l.j.id; const before = (await call('/api/market/listings')).j.listings.length;

    // The panel page and its data: the maker only. Template for live positioning, colours, print area, fees.
    assert.equal((await page(`/label/l/${id}/products`, other)).status, 404);
    assert.match((await page(`/label/l/${id}/products`, maker)).html, /id="mp-app"[^]*merch-panel-aletheia\.js/);
    assert.match((await page(`/label/l/${id}/edit`, maker)).html, new RegExp(`href="/label/l/${id}/products">Put this art on products`));
    assert.equal((await call(`/api/market/listings/${id}/merch/panel`)).r.status, 401);
    assert.equal((await call(`/api/market/listings/${id}/merch/panel`, 'GET', null, other)).r.status, 403);
    const panel = (await call(`/api/market/listings/${id}/merch/panel`, 'GET', null, maker)).j;
    const tee = panel.products.find((p) => p.product === 'tee');
    assert.deepEqual(tee.colors.map((c) => c.name), ['Black', 'White']);
    assert.deepEqual(tee.template.area, { left: 350, top: 200, width: 300, height: 400 }, 'the print area for client-side positioning');
    assert.equal(tee.dpi, 150); assert.equal(panel.fees.card_pct, 0.029); assert.equal(panel.fees.card_fee_payer, 'undecided');
    assert.equal(panel.art.width, 1, 'the art\'s pixel size reaches the quality meter');

    // A price that pays the maker nothing is refused, with the lowest price that does.
    const low = await call(`/api/market/listings/${id}/merch/tee`, 'PUT', { colors: ['Black'], scale: 0.6, x: 0.5, y: 0.3, price: 11.8 }, maker);
    assert.equal(low.r.status, 400); assert.match(low.j.error, /lowest price that pays you is \$12\.\d\d/);
    assert.equal((await call(`/api/market/listings/${id}/merch/tee`, 'PUT', { colors: ['Black'], price: 30 }, other)).r.status, 403);

    // A draft: saved, NOT shown to buyers; approving before seeing the real photo is refused.
    const d = await call(`/api/market/listings/${id}/merch/tee`, 'PUT', { colors: ['Black', 'White'], scale: 0.6, x: 0.5, y: 0.3, price: 30 }, maker);
    assert.equal(d.r.status, 200, JSON.stringify(d.j)); assert.equal(d.j.status, 'draft');
    assert.deepEqual(d.j.sizes.find((z) => z.size === 'M'), { size: 'M', pays: 30, printful: 11.5, card_fee: 1.17, cohabi: 0, earns: 17.33 });
    assert.equal(d.j.sizes.find((z) => z.size === '2XL').pays, 32.75, 'the 2XL upcharge is passed through');
    assert.equal(d.j.sizes.find((z) => z.size === '2XL').earns, 17.25, 'about level: the card fee rises a few cents with the price');
    assert.deepEqual((await call(`/api/market/listings/${id}/merch`)).j.items, [], 'buyers see nothing while it is a draft');
    assert.equal((await call(`/api/market/listings/${id}/merch/tee/approve`, 'POST', null, maker)).r.status, 409);

    // The real photo, on request, at the maker's position; then approve.
    assert.equal((await call(`/api/market/listings/${id}/merch/tee/photo`, 'POST', { color: 'Black' }, maker)).r.status, 202);
    const ready = await until(async () => (await call(`/api/market/listings/${id}/merch?mine=1`, 'GET', null, maker)).j.items[0]?.ready_to_approve);
    assert.ok(ready, 'the real photo arrived');
    assert.equal(seen.tasks.length, 1); assert.equal(seen.tasks[0].variant_ids[0], 4012, 'the photo is of the colour asked for');
    assert.equal(seen.tasks[0].files[0].image_url, `${B}/images/${art.j.id}`);
    assert.equal((await call(`/api/market/listings/${id}/merch/tee/approve`, 'POST', null, maker)).j.status, 'approved');
    const pub = (await call(`/api/market/listings/${id}/merch`)).j.items;
    assert.equal(pub.length, 1); assert.equal(pub[0].sizes[0].earns, undefined, 'buyers see prices, not the maker\'s earnings');
    assert.deepEqual(pub[0].sizes.map((z) => [z.size, z.price]), [['M', 30], ['2XL', 32.75]]);
    assert.ok(await until(async () => (await call(`/api/market/listings/${id}/merch`)).j.items[0].options.every((c) => c.photo)), 'approving makes the other colours\' photos');
    const lp = (await page(`/label/l/${id}`)).html;
    assert.match(lp, /Get it on[^]*Unisex Staple T-Shirt[^]*class="mk-sw on"[^]*title="Black"[^]*title="White"[^]*M · \$30\.00[^]*2XL · \$32\.75/);
    assert.match(lp, /<button type="button" class="btn small" disabled>Buy<\/button>/); assert.match(lp, /merch-row\.js/);
    assert.match((await page('/label?cat=art')).html, /Also on 1 product\b/);
    assert.equal((await call('/api/market/listings')).j.listings.length, before, 'still one listing');

    // Moving the art: back to draft, hidden from buyers until a new photo is approved.
    const moved = await call(`/api/market/listings/${id}/merch/tee`, 'PUT', { colors: ['Black', 'White'], scale: 0.8, x: 0.5, y: 0.3, price: 30 }, maker);
    assert.equal(moved.j.status, 'draft'); assert.equal(moved.j.ready_to_approve, false);
    assert.deepEqual((await call(`/api/market/listings/${id}/merch`)).j.items, []);

    // Wall art: no colours, the maker picks SIZES; the art turns 90° (wide art on a tall canvas hangs sideways); each
    // size's photo is placed on THAT size's print area; Printful fetches the turned art from our turned-art address.
    const cv = (await call(`/api/market/listings/${id}/merch/panel`, 'GET', null, maker)).j.products.find((p) => p.product === 'canvas');
    assert.equal(cv.kind, 'sizes'); assert.deepEqual(cv.sizes.map((z) => [z.name, z.area.width, z.area.height]), [['12″×16″', 3600, 4800], ['16″×20″', 4800, 6000]]);
    assert.equal((await call(`/api/market/listings/${id}/merch/canvas`, 'PUT', { colors: ['Black'], price: 60 }, maker)).r.status, 400, 'a canvas is sized, not coloured');
    assert.equal((await call(`/api/market/listings/${id}/merch/canvas`, 'PUT', { sizes: ['16″×20″'], rot: 45, price: 60 }, maker)).r.status, 400, 'turns are 90° steps');
    const c1 = await call(`/api/market/listings/${id}/merch/canvas`, 'PUT', { sizes: ['12″×16″', '16″×20″'], scale: 1, x: 0.5, y: 0.5, rot: 90, price: 45 }, maker);
    assert.equal(c1.r.status, 200, JSON.stringify(c1.j)); assert.deepEqual(c1.j.sizes.map((z) => [z.size, z.pays]), [['12″×16″', 45], ['16″×20″', 50.25]]);
    const turnedRes = await fetch(`${B}/api/merch/art/${id}/90`); assert.equal(turnedRes.status, 200); assert.match(turnedRes.headers.get('content-type'), /png/);
    assert.equal((await fetch(`${B}/api/merch/art/${id}/45`)).status, 404);
    const nTasks = seen.tasks.length;
    await call(`/api/market/listings/${id}/merch/canvas/photo`, 'POST', { option: '16″×20″' }, maker);
    assert.ok(await until(async () => seen.tasks.length > nTasks), 'a canvas photo was asked for');
    const ct = seen.tasks[seen.tasks.length - 1];
    assert.equal(ct.variant_ids[0], 7, 'the photo is of the size asked for');
    assert.equal(ct.files[0].image_url, `${B}/api/merch/art/${id}/90`, 'Printful gets the turned art');
    assert.deepEqual([ct.files[0].position.area_width, ct.files[0].position.area_height], [4800, 6000], 'placed on that size\'s own print area');

    // Remove.
    await call(`/api/market/listings/${id}/merch/tee`, 'DELETE', null, maker);
    assert.deepEqual((await call(`/api/market/listings/${id}/merch?mine=1`, 'GET', null, maker)).j.items.map((i) => i.product), ['canvas'], 'the shirt is gone, the canvas stays');
  } finally { srv.kill(); fake.close(); }
});
