// sales-unsent-truth.mjs — the seller page says "Not sent to <Printer> yet" when no printer record exists, and "Sent to" only when one does.
// Round 81, Claude. Server-free and network-free (shape of market-sales-printer-state.mjs): real listings linked to a printer,
// paid orders written straight into a temp data dir, the sales page rendered from them.
//  - paid order, listing linked to Lulu / Printify, NO printer record -> data-printer-state="unsent", "Not sent to Lulu yet", never "Sent to Lulu";
//  - paid order, listing linked to Printful, with a printer record carrying no state (the printer has it) -> still "Sent to Printful";
//  - the buyer's copy shows nothing of the printer; no address on the seller page.
// UNSENT_MUTANT=1 runs the same asserts against a copy of marketpage.mjs with the new fallback removed: must be red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ship = { name: 'Rae Buyer', address: { line1: '9 Dock Road', line2: '', city: 'Bristol', postal_code: 'BS1 1AA', state: '', country: 'GB' } };
const row = (r) => JSON.stringify({ ts: '2026-11-25T00:00:00.000Z', ...r });
const here = path.dirname(fileURLToPath(import.meta.url));
const libDir = path.join(here, '..', 'lib');

async function pageModule() {
  if (!process.env.UNSENT_MUTANT) return { mod: await import('../lib/marketpage.mjs'), cleanup() {} };
  const src = fs.readFileSync(path.join(libDir, 'marketpage.mjs'), 'utf8');
  const line = " if (printer) pstate = 'unsent';";
  assert.equal(src.split(line).length, 2, 'the mutant needs the new fallback line exactly once');
  const f = path.join(libDir, `marketpage.unsent-mutant-${process.pid}.mjs`);
  fs.writeFileSync(f, src.replace(line, ''));
  return { mod: await import(f), cleanup() { fs.rmSync(f, { force: true }); } };
}

const CASES = [
  { provider: 'lulu', name: 'Lulu', link: { provider: 'lulu', product_id: 'bk-1', sku: '0600X0900BWSTDPB060UW444MXX' }, record: null, sent: false },
  { provider: 'printify', name: 'Printify', link: { provider: 'printify', product_id: 'py-1', variant_ids: ['77'] }, record: null, sent: false },
  { provider: 'printful', name: 'Printful', link: { provider: 'printful', product_id: 'pf-12345', variant_ids: ['4011'] }, record: { provider: 'printful', provider_order: 'PF-2002' }, sent: true },
];

for (const c of CASES) {
  test(`${c.provider}: ${c.sent ? 'a printer record says "Sent to"' : 'no printer record says "Not sent … yet"'}`, async () => {
    const D = fs.mkdtempSync(path.join(os.tmpdir(), `sales-unsent-${c.provider}-`));
    process.env.COMMONS_DATA = D;
    fs.mkdirSync(path.join(D, 'payments'), { recursive: true });
    const { mod, cleanup } = await pageModule();
    try {
      const store = await import('../lib/store.mjs'); store.init(D);
      const market = await import('../lib/market.mjs'); market.init(D);
      store.addMember({ created: new Date().toISOString(), id: 'h_un_seller', kind: 'human', name: 'Print Seller' });
      store.addMember({ created: new Date().toISOString(), id: 'h_un_buyer', kind: 'human', name: 'Rae Buyer' });
      const seller = store.getMember('h_un_seller'), buyer = store.getMember('h_un_buyer');
      const made = market.create(seller, { title: `${c.name} thing`, category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 }, text: 'A test-only work', rights: true, made_by: 'human', license: 'all-rights', physical: true });
      const listing = made.id || made.listing?.id;
      assert.ok(listing, 'the linked listing exists');
      const fulfillment = await import('../lib/fulfillment.mjs'); fulfillment.init(D);
      fulfillment.link(seller, listing, c.link);
      const lines = [
        row({ op: 'create', order: { id: 'ord_un', listing, title: `${c.name} thing`, amount: 25, currency: 'USD', mode: 'test', status: 'awaiting_payment', ts: '2026-11-25T00:00:00.000Z', buyer: buyer.id, seller: seller.id } }),
        row({ op: 'status', order: 'ord_un', status: 'paid', ship_to: ship }),
      ];
      if (c.record) lines.push(row({ op: 'fulfillment', order: 'ord_un', fulfillment: c.record }));
      fs.writeFileSync(path.join(D, 'payments', 'orders.jsonl'), lines.join('\n') + '\n');
      const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
      const { sales } = checkout.ordersFor(seller);
      assert.equal(sales.length, 1);
      assert.equal(!!sales[0].printer, !!c.record, 'precondition: the order has a printer record only when the case says so');
      const mine = mod.salesPage({ me: seller, sales });
      if (c.sent) {
        assert.ok(mine.includes(`Sent to ${c.name}`) && mine.includes('data-sent-to'), 'a real printer record still reads "Sent to"');
        assert.ok(!mine.includes('data-printer-state="unsent"') && !mine.includes('Not sent to'), 'and is not called unsent');
      } else {
        assert.ok(mine.includes('data-printer-state="unsent"'), 'the seller is told it is unsent');
        assert.ok(mine.includes(`Not sent to ${c.name} yet`), `"Not sent to ${c.name} yet"`);
        assert.ok(mine.includes('a steward will send it or refund it'), 'and what happens next');
        assert.ok(!mine.includes(`Sent to ${c.name}`) || mine.includes(`Not sent to ${c.name}`), 'never a bare "Sent to"');
        assert.ok(!/(^|[^t] )Sent to /.test(mine.replace(/<[^>]+>/g, ' ')), 'no sentence on the page starts "Sent to"');
        assert.ok(!mine.includes('data-sent-to'), 'no sent marker');
      }
      assert.ok(!mine.includes('9 Dock Road'), 'no address on the seller page');
      const theirs = mod.salesPage({ me: buyer, sales });
      assert.ok(!theirs.includes('data-printer-state') && !theirs.includes('data-sent-to') && !theirs.includes('Not sent to'), 'the buyer sees nothing of the printer');
    } finally { cleanup(); fs.rmSync(D, { recursive: true, force: true }); }
  });
}
