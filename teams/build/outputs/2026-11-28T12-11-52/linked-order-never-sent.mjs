// linked-order-never-sent.mjs — a paid order for a listing linked to Lulu (a book) or Printify is never sent to its printer.
// Round 80b, Claude. checkout.sendToPrinter returns null unless order.merch is set; only merch-set orders (always Printful) are sent.
// In-process, stand-in Stripe + Lulu + Printify. These asserts describe the FINDING (what main does today).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('paid orders on a Lulu-linked and a Printify-linked listing: nothing is posted to the printer', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'linked-send-'));
  const oldFetch = globalThis.fetch;
  Object.assign(process.env, { COMMONS_DATA: D, COMMONS_PAYMENTS: 'stripe', STRIPE_SECRET_KEY: 'sk_test_linked', STRIPE_WEBHOOK_SECRET: 'whsec_linked',
    LULU_CLIENT_KEY: 'k', LULU_CLIENT_SECRET: 's', LULU_API_URL: 'https://lulu.test', PRINTIFY_TOKEN: 'pt', PRINTIFY_SHOP_ID: '9', PRINTIFY_API_URL: 'https://printify.test',
    COMMONS_PUBLIC_URL: 'https://cohabi.test', COMMONS_FEE_PERCENT: '0' });
  for (const k of ['STRIPE_PUBLISHABLE_KEY', 'COMMONS_LIVE_PAYMENTS_APPROVED', 'PRINTFUL_TOKEN']) delete process.env[k];
  const posts = [];
  const ok = (j, status = 200) => ({ ok: status < 300, status, json: async () => j });
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url); const p = u.pathname;
    if (u.host === 'api.stripe.com') {
      if (p === '/v1/accounts' && init.method === 'POST') return ok({ id: 'acct_l' });
      if (p === '/v1/account_links') return ok({ url: 'https://connect.stripe.test/o' });
      if (p === '/v1/accounts/acct_l') return ok({ id: 'acct_l', charges_enabled: true, payouts_enabled: true, details_submitted: true });
      if (p === '/v1/checkout/sessions') return ok({ id: 'cs_l', url: 'https://checkout.stripe.test/pay' });
    }
    if (u.host === 'lulu.test' || u.host === 'printify.test') {
      if (/token/.test(p)) return ok({ access_token: 't' });
      if (init.method === 'POST') { posts.push(u.host + p); return ok({ id: 'job_1' }); }
    }
    return ok({ error: { message: 'unexpected ' + url } }, 404);
  };
  try {
    const store = await import('../lib/store.mjs'); store.init(D);
    const market = await import('../lib/market.mjs'); market.init?.(D);
    const stripe = await import('../lib/stripe.mjs');
    const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
    const fulfillment = await import('../lib/fulfillment.mjs'); fulfillment.init?.(D);
    const add = (m) => { store.addMember({ created: new Date().toISOString(), ...m }); return store.getMember(m.id); };
    const maker = add({ id: 'h_lk_maker', kind: 'human', name: 'Book Maker' });
    const buyer = add({ id: 'h_lk_buyer', kind: 'human', name: 'Book Buyer' });
    await checkout.startPayoutAccount(maker, { base: 'https://cohabi.test' });
    assert.equal((await checkout.refreshAccount(maker)).status, 'verified');
    const mk = (t) => { const l = market.create(maker, { title: t, text: 'A thing.', category: 'art', type: 'product', price: { mode: 'fixed', amount: 20 }, license: 'all-rights', rights: true }); return l.id || l.listing?.id; };
    const lulu = mk('A Lulu book'), pify = mk('A Printify tee');
    fulfillment.link(maker, lulu, { provider: 'lulu', product_id: 'bk-1', sku: '0600X0900BWSTDPB060UW444MXX' });
    fulfillment.link(maker, pify, { provider: 'printify', product_id: 'py-1', variant_ids: ['77'] });
    const BASE = { base: 'https://cohabi.test' };
    const deliver = (orderId, n) => {
      const event = { id: 'evt_' + n, type: 'checkout.session.completed', data: { object: { id: 'cs_' + n, payment_status: 'paid', payment_intent: 'pi_' + n, metadata: { cohabi_order: orderId },
        shipping_details: { name: 'Book Buyer', address: { line1: '1 Main St', city: 'Sierra Vista', state: 'AZ', postal_code: '85635', country: 'US' } } } } };
      const raw = Buffer.from(JSON.stringify(event)); const ts = Math.floor(Date.now() / 1000);
      const v1 = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(ts + '.' + raw.toString('utf8')).digest('hex');
      assert.equal(checkout.handleEvent(stripe.verifyWebhook(raw, `t=${ts},v1=${v1}`)).status, 'paid');
    };
    for (const [name, id] of [['lulu', lulu], ['printify', pify]]) {
      const o = (await checkout.startCheckout(buyer, id, {}, BASE)).order; deliver(o, name);
      assert.equal(fulfillment.plan(checkout.order(o)).provider, name, 'plan() says this printer will ship it');
      assert.equal(checkout.postTo(o), null, 'the maker is NOT shown the address, because a printer is meant to ship it');
      const r = await checkout.sendToPrinter(o, BASE);
      console.log(name, 'sendToPrinter ->', JSON.stringify(r), '| fulfillment record:', JSON.stringify(checkout.order(o).fulfillment));
      assert.equal(r, null, 'FINDING: sendToPrinter does nothing for a linked order');
    }
    assert.deepEqual(posts, [], 'FINDING: no job was posted to Lulu or Printify');
  } finally { globalThis.fetch = oldFetch; fs.rmSync(D, { recursive: true, force: true }); }
});
