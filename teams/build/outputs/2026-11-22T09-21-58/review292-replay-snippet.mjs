
// Review-only reproduction carried forward from NO review of 99625cf2.
test('REVIEW a duplicate paid event must not erase a partial refund', async () => {
  const id = listing.id || listing.listing?.id;
  const r = await checkout.startCheckout(buyer, id, {}, { base: 'https://x' });
  const paid = { type: 'checkout.session.completed', data: { object: { id: 'cs_review_replay', payment_status: 'paid', payment_intent: 'pi_review_replay', metadata: { cohabi_order: r.order } } } };
  checkout.handleEvent(paid);
  checkout.handleEvent({ type: 'charge.refunded', data: { object: { id: 'ch_review_replay', payment_intent: 'pi_review_replay', amount: 2500, amount_refunded: 1000 } } });
  assert.equal(checkout.order(r.order).status, 'partly_refunded');
  checkout.handleEvent(paid);
  assert.equal(checkout.order(r.order).status, 'partly_refunded');
});
