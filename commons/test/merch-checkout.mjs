// Buying one product under an artwork (Setu, 2026-11-24; Geoffrey: "let's get the marketplace set up"). In-process, no
// network, no real money: a stand-in Stripe and a stand-in Printful. Asserts:
//   - the price is that product's, in that colour and size, as the page shows it (2XL costs its upcharge more)
//   - a colour or size the maker didn't offer, or a product still in draft, is refused in plain words
//   - the order records exactly what was bought; Stripe is asked for a shipping address
//   - once the signed webhook says paid, the order goes to Printful as a DRAFT (no confirm), with the catalog variant,
//     the buyer's address and the approved print file and position; it is sent once, however often Stripe repeats
//   - a Printful refusal is recorded on the order, not lost and not retried into a loop
//   - an AGENT's goods sell for cash into the cooperative's reserves (no transfer, no fee split); an agent's SERVICES
//     stay coins-only (Geoffrey, 2026-11-24)
//   - a human + AI piece: the cooperative's cut, then a fixed 25% of the rest to the reserves; a maker who chooses none
//     keeps it all, and the listing says so publicly
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');

test('pick a product, colour and size; pay in test mode; it reaches Printful as a draft', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-checkout-'));
  const oldFetch = globalThis.fetch;
  Object.assign(process.env, { COMMONS_DATA: D, COMMONS_PAYMENTS: 'stripe', STRIPE_SECRET_KEY: 'sk_test_merch', STRIPE_WEBHOOK_SECRET: 'whsec_merch',
    PRINTFUL_TOKEN: 'pf-test', PRINTFUL_STORE_ID: '42', PRINTFUL_API_URL: 'https://printful.test', COMMONS_PUBLIC_URL: 'https://cohabi.test',
    PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }]), COMMONS_FEE_PERCENT: '0' });
  delete process.env.STRIPE_PUBLISHABLE_KEY; delete process.env.COMMONS_LIVE_PAYMENTS_APPROVED;
  const seen = { sessions: [], orders: [] }; let printfulSays = 200;
  const ok = (j, status = 200) => ({ ok: status < 300, status, json: async () => j });
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url); const p = u.pathname;
    if (u.host === 'api.stripe.com') {
      if (p === '/v1/accounts' && init.method === 'POST') return ok({ id: 'acct_merch' });
      if (p === '/v1/account_links') return ok({ url: 'https://connect.stripe.test/onboard' });
      if (p === '/v1/accounts/acct_merch') return ok({ id: 'acct_merch', charges_enabled: true, payouts_enabled: true, details_submitted: true });
      if (p.startsWith('/v1/checkout/sessions/cs_noaddr')) return ok({ id: 'cs_noaddr', collected_information: { shipping_details: { name: 'Tee Buyer', address: { line1: '9 Late St', city: 'Bisbee', state: 'AZ', postal_code: '85603', country: 'US' } } } });
      if (p === '/v1/checkout/sessions') { seen.sessions.push(new URLSearchParams(String(init.body))); return ok({ id: 'cs_merch', url: 'https://checkout.stripe.test/pay' }); }
    }
    if (u.host === 'printful.test') {
      if (p === '/products/71') return ok({ result: { product: { id: 71, title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', currency: 'USD', is_discontinued: false }, variants: [
        { id: 4012, name: 'Black / M', color: 'Black', color_code: '#0b0b0b', size: 'M', price: '11.50' },
        { id: 4013, name: 'Black / 2XL', color: 'Black', color_code: '#0b0b0b', size: '2XL', price: '14.25' },
        { id: 4022, name: 'White / M', color: 'White', color_code: '#ffffff', size: 'M', price: '11.50' }] } });
      if (p === '/mockup-generator/printfiles/71') return ok({ result: { available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400, dpi: 150 }], variant_printfiles: [4012, 4013, 4022].map((v) => ({ variant_id: v, placements: { front: 1 } })) } });
      if (p === '/orders' && init.method === 'POST') { seen.orders.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) }); return printfulSays === 200 ? ok({ result: { id: 9001 + seen.orders.length, status: 'draft' } }) : ok({ error: { message: 'nope' } }, printfulSays); }
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
    const maker = add({ id: 'h_merch_maker', kind: 'human', name: 'Painter One' });
    const buyer = add({ id: 'h_merch_buyer', kind: 'human', name: 'Tee Buyer' });
    const art = images.upload(maker, { data: PNG.toString('base64'), alt: 'a spiral sun', credit: 'Painter One' });
    const l = market.create(maker, { title: 'Spiral Sun', text: 'A painting.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true, images: [art.id] });
    const id = l.id || l.listing?.id;
    // The maker's approved tee, Black and White, as merchsets.approve leaves it (the panel flow is merch-sets.mjs's test).
    const dir = path.join(D, 'merch'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'sets.json'), JSON.stringify({ [id]: { listing: id, by: maker.id, art: art.id, items: { tee: {
      title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', status: 'approved', colors: ['Black', 'White'], sizes: [], price: 30,
      pos: { scale: 0.6, x: 0.5, y: 0.3, rot: 0 }, photos: {}, queue: [], tasks: {}, errors: {} } } } }));
    const merchsets = await import('../lib/merchsets.mjs'); merchsets.init(D);
    assert.equal((await printful.products()).length, 1, 'the stand-in catalogue loaded');
    await checkout.startPayoutAccount(maker, { base: 'https://cohabi.test' });
    assert.equal((await checkout.refreshAccount(maker)).status, 'verified');

    // The price is that size's: M $30, 2XL $32.75 (Printful's $2.75 upcharge passed through, as the page shows).
    assert.equal(checkout.quote(id, { merch: { product: 'tee', color: 'Black', size: 'M' } }).amount, 30);
    const q = checkout.quote(id, { merch: { product: 'tee', color: 'Black', size: '2XL' } });
    assert.equal(q.amount, 32.75); assert.equal(q.payable, true, JSON.stringify(q.why));
    assert.match(q.title, /Spiral Sun: Unisex Staple T-Shirt, Black, 2XL/);
    // Things the page never offered are refused in plain words.
    assert.throws(() => checkout.quote(id, { merch: { product: 'tee', color: 'Red', size: 'M' } }), /colours shown/);
    assert.throws(() => checkout.quote(id, { merch: { product: 'tee', color: 'White', size: '2XL' } }), /sizes shown/, 'White has no 2XL');
    assert.throws(() => checkout.quote(id, { merch: { product: 'mug', size: '11 oz' } }), /isn't offered/);

    const started = await checkout.startCheckout(buyer, id, { merch: { product: 'tee', color: 'Black', size: '2XL' } }, { base: 'https://cohabi.test' });
    const o = checkout.order(started.order);
    assert.equal(o.amount, 32.75); assert.equal(o.merch.variant_id, 4013); assert.equal(o.merch.color, 'Black'); assert.equal(o.merch.size, '2XL');
    const sess = seen.sessions[0];
    assert.equal(sess.get('line_items[0][price_data][unit_amount]'), '3275');
    assert.equal(sess.get('shipping_address_collection[allowed_countries][0]'), 'US', 'a shirt needs an address');
    assert.match(sess.get('line_items[0][price_data][product_data][name]'), /Black, 2XL/);

    // Stripe says paid (signed, the way server.mjs verifies it), with the address.
    const deliver = (event) => {
      const raw = Buffer.from(JSON.stringify(event)); const ts = Math.floor(Date.now() / 1000);
      const v1 = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${ts}.${raw.toString('utf8')}`).digest('hex');
      return checkout.handleEvent(stripe.verifyWebhook(raw, `t=${ts},v1=${v1}`));
    };
    const paid = { id: 'evt_paid', type: 'checkout.session.completed', data: { object: { id: 'cs_merch', payment_status: 'paid', payment_intent: 'pi_merch', metadata: { cohabi_order: o.id },
      shipping_details: { name: 'Tee Buyer', address: { line1: '1 Main St', city: 'Sierra Vista', state: 'AZ', postal_code: '85635', country: 'US' } } } } };
    assert.equal(deliver(paid).status, 'paid');
    const sent = await checkout.sendToPrinter(o.id, { base: 'https://cohabi.test' });
    assert.equal(sent.state, 'draft'); assert.equal(sent.provider_order, 9002);
    assert.equal(seen.orders.length, 1);
    const pf = seen.orders[0];
    assert.equal(new URL(pf.url).search, '', 'no ?confirm: Printful keeps it as a draft, nothing is charged or printed');
    assert.equal(pf.headers['X-PF-Store-Id'], '42');
    assert.equal(pf.body.external_id, o.id);
    assert.equal(pf.body.recipient.address1, '1 Main St'); assert.equal(pf.body.recipient.state_code, 'AZ');
    const item = pf.body.items[0];
    assert.equal(item.variant_id, 4013, 'the Black 2XL catalog variant');
    assert.equal(item.files[0].type, 'front');
    assert.match(item.files[0].url, /^https:\/\/cohabi\.test\/images\//, 'Printful fetches the art from our public address');
    assert.deepEqual(Object.keys(item.files[0].position).sort(), ['area_height', 'area_width', 'height', 'left', 'top', 'width']);
    assert.equal(item.files[0].position.width, Math.round(1800 * 0.6), 'placed as the maker approved it');
    assert.equal(checkout.order(o.id).fulfillment.state, 'draft');

    // Stripe repeats itself: no second printer order.
    deliver(paid);
    assert.equal(await checkout.sendToPrinter(o.id, { base: 'https://cohabi.test' }), null);
    assert.equal(seen.orders.length, 1, 'sent once');

    // Two paid events land at once (kin-Claude's round 56 probe): still one printer order.
    const s3 = await checkout.startCheckout(buyer, id, { merch: { product: 'tee', color: 'White', size: 'M' } }, { base: 'https://cohabi.test' });
    deliver({ ...paid, id: 'evt_paid3', data: { object: { ...paid.data.object, id: 'cs_merch3', metadata: { cohabi_order: s3.order } } } });
    const before = seen.orders.length;
    const twin = await Promise.all([checkout.sendToPrinter(s3.order, { base: 'https://cohabi.test' }), checkout.sendToPrinter(s3.order, { base: 'https://cohabi.test' })]);
    assert.equal(seen.orders.length - before, 1, 'two overlapping sends post once');
    assert.equal(twin.filter(Boolean).length, 1, 'one call sent it, the other stood back');
    assert.equal(checkout.order(s3.order).fulfillment.state, 'draft');

    // Printful refuses another order: recorded on the order, not lost.
    printfulSays = 400;
    const s2 = await checkout.startCheckout(buyer, id, { merch: { product: 'tee', color: 'White', size: 'M' } }, { base: 'https://cohabi.test' });
    deliver({ ...paid, id: 'evt_paid2', data: { object: { ...paid.data.object, id: 'cs_merch2', metadata: { cohabi_order: s2.order } } } });
    const r2 = await checkout.sendToPrinter(s2.order, { base: 'https://cohabi.test' });
    assert.equal(r2.state, 'failed'); assert.match(r2.error, /refused/);
    assert.equal(checkout.order(s2.order).fulfillment.state, 'failed');
    assert.equal(checkout.order(s2.order).status, 'paid', 'the payment stands; the maker or a steward sends it again');

    // Newer Stripe events carry the address in collected_information (Geoffrey's first live test shirt, 2026-11-25).
    printfulSays = 200;
    const s5 = await checkout.startCheckout(buyer, id, { merch: { product: 'tee', color: 'Black', size: 'M' } }, { base: 'https://cohabi.test' });
    const { shipping_details: sd, ...rest } = paid.data.object;
    deliver({ ...paid, id: 'evt_new', data: { object: { ...rest, id: 'cs_new', metadata: { cohabi_order: s5.order }, collected_information: { shipping_details: sd } } } });
    const r3 = await checkout.sendToPrinter(s5.order, { base: 'https://cohabi.test' });
    assert.equal(r3.state, 'draft', JSON.stringify(r3)); assert.equal(seen.orders.at(-1).body.recipient.address1, '1 Main St');
    // An event with no address at all: we ask Stripe for the session, and it goes through.
    const s4 = await checkout.startCheckout(buyer, id, { merch: { product: 'tee', color: 'Black', size: 'M' } }, { base: 'https://cohabi.test' });
    deliver({ ...paid, id: 'evt_noaddr', data: { object: { ...rest, id: 'cs_noaddr', metadata: { cohabi_order: s4.order } } } });
    assert.equal(checkout.order(s4.order).ship_to, undefined, 'the event carried no address');
    const r4 = await checkout.sendToPrinter(s4.order, { base: 'https://cohabi.test' });
    assert.equal(r4.state, "draft", JSON.stringify(r4)); assert.equal(seen.orders.at(-1).body.recipient.city, 'Bisbee');
    assert.equal(checkout.order(s4.order).ship_to.address.line1, '9 Late St', 'and it is on our record now');

    // An agent's art on a tee: cash, into the reserves. Its service: coins only.
    const ai = add({ id: 'a_merch_agent', kind: 'agent', name: 'Painter Agent', model: 'test-model' });
    const aiArt = images.upload(ai, { data: PNG.toString('base64'), alt: 'an agent painting', credit: 'Painter Agent' });
    const al = market.create(ai, { title: 'Agent Sun', text: 'An agent painting.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true, images: [aiArt.id] });
    const aid = al.id || al.listing?.id;
    const sets = JSON.parse(fs.readFileSync(path.join(dir, 'sets.json'), 'utf8'));
    sets[aid] = { listing: aid, by: ai.id, art: aiArt.id, items: { tee: { ...sets[id].items.tee } } };
    fs.writeFileSync(path.join(dir, 'sets.json'), JSON.stringify(sets)); merchsets.init(D);
    const aq = checkout.quote(aid, { merch: { product: 'tee', color: 'Black', size: 'M' } });
    assert.equal(aq.payable, true, JSON.stringify(aq.why)); assert.equal(aq.currency, 'USD'); assert.equal(aq.proceeds, 'reserves');
    const n = seen.sessions.length;
    const as = await checkout.startCheckout(buyer, aid, { merch: { product: 'tee', color: 'Black', size: 'M' } }, { base: 'https://cohabi.test' });
    const sess2 = seen.sessions[n];
    assert.equal(sess2.get('payment_intent_data[transfer_data][destination]'), null, 'no transfer: agents hold no money account');
    assert.equal(sess2.get('payment_intent_data[application_fee_amount]'), null);
    assert.equal(sess2.get('payment_intent_data[metadata][cohabi_proceeds]'), 'reserves');
    assert.equal(checkout.order(as.order).proceeds, 'reserves');
    const svc = market.create(ai, { title: 'Agent edits your essay', text: 'A service.', category: Object.keys(market.CATEGORIES)[0], type: 'service', price: { mode: 'fixed', amount: 20 }, license: 'all-rights', rights: true });
    const sq = checkout.quote(svc.id || svc.listing?.id);
    assert.equal(sq.currency, 'COINS'); assert.equal(sq.payable, false); assert.match(sq.why.join(' '), /services are paid in Cohabi coins/);

    // A human + AI piece (made_by hybrid), sold by its human. Cooperative cut 10%, then 25% of the rest to the reserves.
    process.env.COMMONS_FEE_PERCENT = '10';
    const mk = (extra) => { const r = market.create(maker, { title: 'Together', text: 'Made with an AI member.', category: 'art', type: 'product', price: { mode: 'fixed', amount: 100 }, license: 'all-rights', rights: true, made_by: 'hybrid', physical: false, ...extra }); return r.id || r.listing?.id; };
    const both = mk({});
    const cq = checkout.quote(both); assert.equal(cq.payable, true, JSON.stringify(cq.why)); assert.deepEqual(cq.collab, { reserves_pct: 25, chose_none: false });
    let k = seen.sessions.length;
    const co = await checkout.startCheckout(buyer, both, {}, { base: 'https://cohabi.test' });
    assert.equal(seen.sessions[k].get('payment_intent_data[application_fee_amount]'), String(1000 + 2250), 'cut $10, then 25% of $90 = $22.50 stays for the reserves');
    assert.equal(seen.sessions[k].get('payment_intent_data[transfer_data][destination]'), 'acct_merch', 'the rest goes to the human maker');
    const cord = checkout.order(co.order); assert.equal(cord.coop_fee_cents, 1000); assert.equal(cord.reserves_cents, 2250);
    // The maker chooses no share: kept by the maker, and said publicly.
    const none = mk({ reserves_share: 'none' });
    assert.deepEqual(checkout.quote(none).collab, { reserves_pct: 0, chose_none: true });
    k = seen.sessions.length; await checkout.startCheckout(buyer, none, {}, { base: 'https://cohabi.test' });
    assert.equal(seen.sessions[k].get('payment_intent_data[application_fee_amount]'), '1000', 'only the cooperative cut');
    const { listingPage } = await import('../lib/marketpage.mjs');
    if (typeof listingPage === 'function') { const html = listingPage({ me: buyer, l: market.get(none) }); assert.match(String(html), /chose to send no share to the cooperative/); }
    assert.throws(() => market.create(maker, { title: 'Bad', text: 'x', category: 'art', type: 'product', price: { mode: 'fixed', amount: 5 }, license: 'all-rights', rights: true, reserves_share: 'half' }), /reserves_share must be fixed or none/);
    // A human-only piece is unchanged: no reserves share.
    const solo = market.create(maker, { title: 'Solo', text: 'Mine alone.', category: 'art', type: 'product', price: { mode: 'fixed', amount: 100 }, license: 'all-rights', rights: true, made_by: 'human', physical: false });
    assert.equal(checkout.quote(solo.id || solo.listing?.id).collab, undefined);
  } finally {
    globalThis.fetch = oldFetch;
    fs.rmSync(D, { recursive: true, force: true });
  }
});
