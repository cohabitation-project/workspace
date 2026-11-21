import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from '../lib/testing.mjs'; // This helper sets up a test server

test('Marketplace: API behavior for withdrawn listings', async (t) => {
  let app;
  let client;
  let listingId;
  let memberToken;

  await t.before(async () => {
    ({ app, client } = await makeApp());
    const res = await client.post('/api/auth/join', {
      name: 'Test Member',
      email: 'test@example.com',
      password: 'password123',
    });
    memberToken = res.body.token;

    // Create a listing
    const createRes = await client.post('/api/market/listings')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Test Withdrawn Item',
        text: 'This is an item that will be withdrawn.',
        category: 'music',
        type: 'product',
        price: { mode: 'fixed', amount: 10 },
        license: 'cc0',
        rights: true,
      });
    assert.strictEqual(createRes.status, 200, 'Listing should be created successfully');
    listingId = createRes.body.id;

    // Withdraw the listing
    const withdrawRes = await client.post(`/api/market/listings/${listingId}/withdraw`)
      .set('Authorization', `Bearer ${memberToken}`);
    assert.strictEqual(withdrawRes.status, 200, 'Listing should be withdrawn successfully');
    assert.strictEqual(withdrawRes.body.status, 'withdrawn', 'Withdrawn listing status should be "withdrawn"');
  });

  await t.after(async () => {
    await app.close();
  });

  await t.test('GET /api/market/listings/:id should return 200 with withdrawn listing data', async () => {
    const res = await client.get(`/api/market/listings/${listingId}`);
    assert.strictEqual(res.status, 200, 'Withdrawn listing detail should return 200');
    assert.strictEqual(res.body.id, listingId, 'Returned listing ID should match');
    assert.strictEqual(res.body.status, 'withdrawn', 'Returned listing status should be "withdrawn"');
    assert.ok(res.body.withdrawn, 'Withdrawn timestamp should be present');
  });

  await t.test('GET /api/market/listings (default) should NOT return withdrawn listings', async () => {
    const res = await client.get('/api/market/listings');
    assert.strictEqual(res.status, 200, 'Public listings list should return 200');
    const withdrawnListingPresent = res.body.some(listing => listing.id === listingId);
    assert.strictEqual(withdrawnListingPresent, false, 'Withdrawn listing should not be present in default list');
  });

  await t.test('GET /api/market/listings?status=all should return withdrawn listings', async () => {
    const res = await client.get('/api/market/listings?status=all');
    assert.strictEqual(res.status, 200, 'All listings list should return 200');
    const withdrawnListingPresent = res.body.some(listing => listing.id === listingId);
    assert.strictEqual(withdrawnListingPresent, true, 'Withdrawn listing should be present when status=all');
    const withdrawnListing = res.body.find(listing => listing.id === listingId);
    assert.strictEqual(withdrawnListing.status, 'withdrawn', 'Found listing status should be "withdrawn"');
  });
});
