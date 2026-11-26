import crypto from 'node:crypto'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');


const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-boot-'));
const oldFetch = globalThis.fetch;
Object.assign(process.env, { COMMONS_DATA: D, COMMONS_PAYMENTS: 'stripe', STRIPE_SECRET_KEY: 'sk_test_resend', STRIPE_WEBHOOK_SECRET: 'whsec_resend',
    PRINTFUL_TOKEN: 'pf-test', PRINTFUL_STORE_ID: '42', PRINTFUL_API_URL: 'https://printful.test', COMMONS_PUBLIC_URL: 'https://cohabi.test',
    PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }]), COMMONS_FEE_PERCENT: '0' });
delete process.env.STRIPE_PUBLISHABLE_KEY; delete process.env.COMMONS_LIVE_PAYMENTS_APPROVED;
  const seen = { posts: [] }; let printfulSays = 200;
  const ok = (j, status = 200) => ({ ok: status < 300, status, json: async () => j });
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url); const p = u.pathname;
    if (u.host === 'api.stripe.com') {
      if (p === '/v1/accounts' && init.method === 'POST') return ok({ id: 'acct_resend' });
      if (p === '/v1/account_links') return ok({ url: 'https://connect.stripe.test/onboard' });
      if (p === '/v1/accounts/acct_resend') return ok({ id: 'acct_resend', charges_enabled: true, payouts_enabled: true, details_submitted: true });
      if (p === '/v1/checkout/sessions') return ok({ id: 'cs_resend', url: 'https://checkout.stripe.test/pay' });
    }
    if (u.host === 'printful.test') {
      if (p === '/products/71') return ok({ result: { product: { id: 71, title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', currency: 'USD', is_discontinued: false }, variants: [
        { id: 4012, name: 'Black / M', color: 'Black', color_code: '#0b0b0b', size: 'M', price: '11.50' }] } });
      if (p === '/mockup-generator/printfiles/71') return ok({ result: { available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400, dpi: 150 }], variant_printfiles: [{ variant_id: 4012, placements: { front: 1 } }] } });
      if (p === '/orders' && init.method === 'POST') { seen.posts.push(JSON.parse(init.body)); return printfulSays === 200 ? ok({ result: { id: 7000 + seen.posts.length, status: 'draft' } }) : ok({ error: { message: 'nope' } }, printfulSays); }
    }
    return ok({ error: { message: `unexpected request ${url}` } }, 404);
  };

  {
    const store = await import('../lib/store.mjs'); store.init(D);
    const images = await import('../lib/images.mjs'); images.init?.(D);
    const market = await import('../lib/market.mjs'); market.init?.(D);
    const stripe = await import('../lib/stripe.mjs');
    const printful = await import('../lib/printful.mjs');
    const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
    const fulfillment = await import('../lib/fulfillment.mjs'); fulfillment.init?.(D);
    const add = (m) => { store.addMember({ created: new Date().toISOString(), ...m }); return store.getMember(m.id); };
    const maker = add({ id: 'h_resend_maker', kind: 'human', name: 'Painter Two' });
    const buyer = add({ id: 'h_resend_buyer', kind: 'human', name: 'Tee Buyer Two' });
    const art = images.upload(maker, { data: PNG.toString('base64'), alt: 'a spiral moon', credit: 'Painter Two' });
    const l = market.create(maker, { title: 'Spiral Moon', text: 'A painting.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true, images: [art.id] });
    const id = l.id || l.listing?.id;
    const dir = path.join(D, 'merch'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'sets.json'), JSON.stringify({ [id]: { listing: id, by: maker.id, art: art.id, items: { tee: {
      title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', status: 'approved', colors: ['Black'], sizes: [], price: 30,
      pos: { scale: 0.6, x: 0.5, y: 0.3, rot: 0 }, photos: {}, queue: [], tasks: {}, errors: {} } } } }));
    const merchsets = await import('../lib/merchsets.mjs'); merchsets.init(D);
    assert.equal((await printful.products()).length, 1, 'the stand-in catalogue loaded');
    await checkout.startPayoutAccount(maker, { base: 'https://cohabi.test' });
    assert.equal((await checkout.refreshAccount(maker)).status, 'verified');

    const BASE = { base: 'https://cohabi.test' };
    const deliver = (orderId, n) => {
      const event = { id: `evt_${n}`, type: 'checkout.session.completed', data: { object: { id: `cs_${n}`, payment_status: 'paid', payment_intent: `pi_${n}`, metadata: { cohabi_order: orderId },
        shipping_details: { name: 'Tee Buyer Two', address: { line1: '1 Main St', city: 'Sierra Vista', state: 'AZ', postal_code: '85635', country: 'US' } } } } };
      const raw = Buffer.from(JSON.stringify(event)); const ts = Math.floor(Date.now() / 1000);
      const v1 = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${ts}.${raw.toString('utf8')}`).digest('hex');
      assert.equal(checkout.handleEvent(stripe.verifyWebhook(raw, `t=${ts},v1=${v1}`)).status, 'paid');
    };
    const tee = async () => (await checkout.startCheckout(buyer, id, { merch: { product: 'tee', color: 'Black', size: 'M' } }, BASE)).order;


    const A = await tee(); deliver(A, 'a');
    assert.equal(checkout.order(A).fulfillment, undefined);
    console.log('PHASE1 unsent order', A, 'posts so far', seen.posts.length);
    globalThis.fetch = oldFetch;
    // PHASE 2: a real Printful stand-in on localhost, then the real server on the same data dir.
    const log = [];
    const pf = http.createServer((req, res) => {
      let body = ''; req.on('data', (c) => body += c); req.on('end', () => {
        log.push(req.method + ' ' + req.url); res.setHeader('content-type', 'application/json');
        const u = req.url;
        if (u === '/products/71') return res.end(JSON.stringify({ result: { product: { id: 71, title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', currency: 'USD', is_discontinued: false }, variants: [{ id: 4012, name: 'Black / M', color: 'Black', color_code: '#0b0b0b', size: 'M', price: '11.50' }] } }));
        if (u.startsWith('/mockup-generator/printfiles/71')) return res.end(JSON.stringify({ result: { available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400, dpi: 150 }], variant_printfiles: [{ variant_id: 4012, placements: { front: 1 } }] } }));
        if (u.startsWith('/orders') && req.method === 'POST') { log.push('BODY ' + body.slice(0, 300)); return res.end(JSON.stringify({ result: { id: 9001, status: 'draft' } })); }
        res.statusCode = 404; res.end('{}');
      });
    });
    await new Promise((r) => pf.listen(0, '127.0.0.1', r));
    const pfUrl = 'http://127.0.0.1:' + pf.address().port;
    const PORT = String(3900 + Math.floor(Math.random() * 90));
    const env = { ...process.env, PORT, HOST: '127.0.0.1', COMMONS_FAKE_LLM: '1', PRINTFUL_API_URL: pfUrl, COMMONS_PUBLIC_URL: process.env.SRV_URL || 'https://cohabi.test' };
    delete env.COMMONS_NO_SPEND_POLL;
    const t0 = Date.now();
    const srv = spawn('node', ['commons/server.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; srv.stdout.on('data', (d) => out += d); srv.stderr.on('data', (d) => out += d);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const mark = {};
    for (let i = 0; i < 40; i++) { await sleep(500); if (!mark.up && /listening on/.test(out)) { mark.up = Date.now() - t0; } if (mark.up && log.some((l) => l.startsWith('POST /orders'))) { mark.sent = Date.now() - t0; break; } }
    await sleep(500);
    console.log('listening at ms', mark.up, 'printful POST at ms', mark.sent);
    console.log('PRINTFUL LOG', JSON.stringify(log));
    const lines = fs.readFileSync(path.join(D, 'payments', 'orders.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    console.log('ORDER LINES with fulfillment', JSON.stringify(lines.filter((l) => l.fulfillment || l.op === 'fulfillment').map((l) => ({ op: l.op, order: l.order, f: l.fulfillment || l.state }))));
    console.log('SERVER OUT', out.split('\n').filter((l) => /resend|error|listening/i.test(l)).join(' | '));
    srv.kill(); await sleep(500);
    const before = log.filter((l) => l.startsWith('POST /orders')).length;
    const srv2 = spawn('node', ['commons/server.mjs'], { env: { ...env, PORT: String(Number(PORT) + 1) }, stdio: 'ignore' });
    await sleep(8000); srv2.kill();
    console.log('RESTART: posts before', before, 'after', log.filter((l) => l.startsWith('POST /orders')).length);
    pf.close(); fs.rmSync(D, { recursive: true, force: true }); process.exit(0);
  }
