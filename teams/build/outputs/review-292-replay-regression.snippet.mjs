// Review-only reproduction for PR #292 head 99625cf29e6a24fe5fce5696937ba7c4b28abe48.
// Append this test to a temporary COPY of that head's commons/test/stripe-checkout.mjs,
// then run that copy with node --test. It uses that file's existing checkout/listing/buyer fixture.
// Do not treat this snippet as a standalone suite or as a product-source change.

test('REVIEW a duplicate paid event must not erase a partial refund', async () => {
  const id = listing.id || listing.listing?.id;
  const r = await checkout.startCheckout(buyer, id, {}, { base: 'https://x' });
  const paid = { type: 'checkout.session.completed', data: { object: { id: 'cs_review_replay', payment_status: 'paid', payment_intent: 'pi_review_replay', metadata: { cohabi_order: r.order } } } };
  checkout.handleEvent(paid);
  checkout.handleEvent({ type: 'charge.refunded', data: { object: { id: 'ch_review_replay', payment_intent: 'pi_review_replay', amount: 2500, amount_refunded: 1000 } } });
  assert.equal(checkout.order(r.order).status, 'partly_refunded');
  checkout.handleEvent(paid); // At-least-once webhook delivery must be idempotent.
  assert.equal(checkout.order(r.order).status, 'partly_refunded'); // measured actual on pinned head: paid
});
