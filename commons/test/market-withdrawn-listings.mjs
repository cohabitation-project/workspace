
import { strict as assert } from 'node:assert';
import { fork } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SERVER_PATH = path.join(__dirname, '..', 'server.mjs');
const DATA_DIR = path.join(__dirname, 'temp_data_market_withdrawn');

// Helper to run a Commons server in a child process
function runServer(env = {}) {
  return fork(SERVER_PATH, {
    env: {
      ...process.env,
      COMMONS_DATA: DATA_DIR,
      ASHRAM_PORT: '0', // Let the OS pick a free port
      ...env,
    },
    silent: true, // Don't print server output to console directly
  });
}

// Helper to wait for the server to start and return its port
async function waitForServer(server) {
  return new Promise((resolve, reject) => {
    server.stdout.on('data', (data) => {
      const match = data.toString().match(/Listening on http:\/\/localhost:(\\d+)/);
      if (match) resolve(parseInt(match[1], 10));
    });
    server.stderr.on('data', (data) => console.error(`[SERVER ERR] ${data}`));
    server.on('error', reject);
    server.on('exit', (code) => {
      if (!server.port) reject(new Error(`Server exited with code ${code} before starting.`));
    });
  });
}

// Clean up temporary data directory
function cleanUpData() {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
}

// Main test function
async function testWithdrawnListings() {
  let server;
  let port;
  let adminToken;
  let memberToken;
  let listingId;

  console.log('Running test: testWithdrawnListings');

  try {
    cleanUpData();

    // 1. Start server and create an admin and a regular member
    server = runServer();
    port = await waitForServer(server);
    server.port = port; // Store port for later use

    // Admin login
    let res = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'admin', password: 'password' }),
    });
    assert.equal(res.status, 200, 'Admin login should succeed');
    adminToken = (await res.json()).token;

    // Regular member signup and login
    res = await fetch(`http://localhost:${port}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'testmember', password: 'password' }),
    });
    assert.equal(res.status, 201, 'Member signup should succeed');

    res = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'testmember', password: 'password' }),
    });
    assert.equal(res.status, 200, 'Member login should succeed');
    memberToken = (await res.json()).token;

    // 2. Create a listing by testmember
    res = await fetch(`http://localhost:${port}/api/market/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${memberToken}` },
      body: JSON.stringify({
        title: 'Test Listing',
        text: 'A great product for testing.',
        category: 'software',
        type: 'product',
        price: { mode: 'fixed', amount: 100 },
        license: 'cc-by',
        rights: true,
      }),
    });
    assert.equal(res.status, 201, 'Listing creation should succeed');
    listingId = (await res.json()).id;
    console.log(`Created listing: ${listingId}`);

    // 3. Withdraw the listing by testmember
    res = await fetch(`http://localhost:${port}/api/market/listings/${listingId}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${memberToken}` },
    });
    assert.equal(res.status, 200, 'Listing withdrawal should succeed');
    const withdrawnListing = await res.json();
    assert.equal(withdrawnListing.status, 'withdrawn', 'Withdrawn listing status should be "withdrawn"');
    console.log(`Withdrew listing: ${listingId}`);

    // 4. Verify that GET /api/market/listings/:id returns the withdrawn listing (current behavior)
    res = await fetch(`http://localhost:${port}/api/market/listings/${listingId}`);
    assert.equal(res.status, 200, 'GET /api/market/listings/:id for withdrawn listing should return 200');
    const fetchedWithdrawnListing = await res.json();
    assert.equal(fetchedWithdrawnListing.id, listingId, 'Fetched listing ID should match');
    assert.equal(fetchedWithdrawnListing.status, 'withdrawn', 'Fetched listing status should be "withdrawn"');
    console.log(`Verified GET /api/market/listings/:id returns withdrawn listing with status "withdrawn"`);

    // 5. Verify that GET /api/market/listings (default) does NOT return the withdrawn listing
    res = await fetch(`http://localhost:${port}/api/market/listings`);
    assert.equal(res.status, 200, 'GET /api/market/listings (default) should return 200');
    const listingsDefault = await res.json();
    const foundInDefault = listingsDefault.some(l => l.id === listingId);
    assert.equal(foundInDefault, false, 'Withdrawn listing should NOT appear in default GET /api/market/listings');
    console.log(`Verified GET /api/market/listings (default) does NOT return withdrawn listing`);

    // 6. Verify that GET /api/market/listings?status=all DOES return the withdrawn listing
    res = await fetch(`http://localhost:${port}/api/market/listings?status=all`);
    assert.equal(res.status, 200, 'GET /api/market/listings?status=all should return 200');
    const listingsAll = await res.json();
    const foundInAll = listingsAll.some(l => l.id === listingId);
    assert.equal(foundInAll, true, 'Withdrawn listing SHOULD appear in GET /api/market/listings?status=all');
    const foundListingInAll = listingsAll.find(l => l.id === listingId);
    assert.equal(foundListingInAll.status, 'withdrawn', 'Listing fetched with status=all should have status "withdrawn"');
    console.log(`Verified GET /api/market/listings?status=all DOES return withdrawn listing`);

    console.log('\\n--- Test Passed: All assertions met ---');
    console.log('NOTE: There is an inconsistency. GET /api/market/listings/:id returns a withdrawn listing with status: "withdrawn", while GET /api/market/listings (default) does not. A design decision is needed on whether GET /api/market/listings/:id for a withdrawn listing should return a 404 to consistently hide it, or if returning 200 with "withdrawn" status is acceptable for internal record-keeping/auditing purposes.');

  } finally {
    if (server) {
      server.kill();
      await new Promise(resolve => server.on('exit', resolve));
      console.log('Server stopped.');
    }
    cleanUpData();
    console.log('Data cleaned up.');
  }
}

// Run the test
import fs from 'node:fs'; // Import fs for cleanup
testWithdrawnListings().catch((error) => {
  console.error('Test Failed:', error);
  process.exit(1);
});
