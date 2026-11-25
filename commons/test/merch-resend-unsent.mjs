// Round 58 (kin-Claude): checkout.resendUnsent. After a restart, a paid product order whose printer call never ran has no
// `fulfillment` record. resendUnsent sends exactly those. In-process, no network: a stand-in Stripe and a stand-in Printful.
// Asserts:
//   - a paid merch order with no printer record -> one Printful post and a `draft` record
//   - called again -> no second post (it now has a record)
//   - an order Printful already refused (`failed`) is untouched: no post, still `failed` (a refusal is a person's call)
//   - a paid order that isn't merch is untouched
//   - with payments closed nothing is posted AND nothing is recorded: fulfillment.send would refuse, and sendToPrinter
//     would then bury the order as `failed` without Printful ever being asked
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');

test('resendUnsent sends only paid merch orders with no printer record', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-resend-'));
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
  try {
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

    // B: Printful refused it earlier, so it carries a `failed` record.
    const B = await tee(); deliver(B, 'b');
    printfulSays = 400;
    assert.equal((await checkout.sendToPrinter(B, BASE)).state, 'failed');
    printfulSays = 200;
    const afterB = seen.posts.length;
    // A: paid, and the process died before the printer call: no record at all.
    const A = await tee(); deliver(A, 'a');
    assert.equal(checkout.order(A).fulfillment, undefined, 'A has no printer record yet');
    // C: paid, but not a product under an artwork: nothing for a printer.
    const cl = market.create(maker, { title: 'A plain download', text: 'Digital.', category: 'art', type: 'product', price: { mode: 'fixed', amount: 20 }, license: 'all-rights', rights: true, made_by: 'human', physical: false });
    const C = (await checkout.startCheckout(buyer, cl.id || cl.listing?.id, {}, BASE)).order; deliver(C, 'c');
    assert.equal(checkout.order(C).merch, undefined);

    const first = await checkout.resendUnsent(BASE);
    assert.deepEqual(first.sent, [A], 'only the unsent merch order is sent');
    assert.deepEqual(first.failed, []);
    assert.equal(seen.posts.length - afterB, 1, 'one Printful post');
    assert.equal(checkout.order(A).fulfillment.state, 'draft'); assert.ok(checkout.order(A).fulfillment.provider_order);
    assert.equal(checkout.order(B).fulfillment.state, 'failed', 'a failed order is left alone');
    assert.equal(checkout.order(C).fulfillment, undefined, 'a non-merch order is left alone');

    const second = await checkout.resendUnsent(BASE);
    assert.deepEqual(second.sent, []); assert.equal(seen.posts.length - afterB, 1, 'called again: no second post');
    assert.equal(checkout.order(B).fulfillment.state, 'failed', 'still failed after the second call');

    // Payments closed: nothing is posted and nothing is written, so the order can still be sent when they open.
    const E = await tee(); deliver(E, 'e');
    const n = seen.posts.length; process.env.COMMONS_PAYMENTS = 'closed';
    const shut = await checkout.resendUnsent(BASE);
    process.env.COMMONS_PAYMENTS = 'stripe';
    assert.deepEqual(shut.sent, []); assert.equal(shut.skipped, 1);
    assert.equal(seen.posts.length, n, 'no post while payments are closed');
    assert.equal(checkout.order(E).fulfillment, undefined, 'not buried as failed');
    assert.deepEqual((await checkout.resendUnsent(BASE)).sent, [E], 'once payments open, it goes');
  } finally {
    globalThis.fetch = oldFetch;
    fs.rmSync(D, { recursive: true, force: true });
  }
});
