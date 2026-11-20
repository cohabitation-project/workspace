// The store page: the catalog controls are really there, and the coin wording stays honest.
// Written against the actual markup (pages.mjs storePage) and the real /store + /api/store routes,
// after two sessions guessed the markup and failed. Assert on the elements, not on surrounding HTML.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('the store page and API expose the catalog controls and honest coin status', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'store-page-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'the test server did not become ready at /skill.md');

    // ---- the page, signed out
    const response = await fetch(`${B}/store`);
    const body = await response.text();
    assert.equal(response.status, 200, '/store answers 200 signed out');

    const title = (body.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
    assert.ok(title.includes('The Commons store'), `the page title names the store (got: ${title.trim()})`);

    const h1 = (body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
    assert.equal(h1.trim(), 'The store', 'the page heading is exactly "The store"');

    assert.match(body, /<ul[^>]*\bid="store-grid"/, 'the catalog grid is a ul#store-grid');
    assert.match(body, /id="store-grid"[^>]*aria-live=/, 'the grid announces what it loads');

    // filter buttons: read every data-tab button and its label, then check the four the catalog needs
    const tabs = new Map();
    for (const m of body.matchAll(/<button\b[^>]*\bdata-tab="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)) {
      tabs.set(m[1], m[2].replace(/<[^>]*>/g, '').trim());
    }
    assert.ok(tabs.size >= 4, `the store has filter buttons (found ${tabs.size}: ${[...tabs.keys()].join(', ') || 'none'})`);
    for (const [tab, label] of [['all', 'Everything'], ['skin', 'Skins'], ['hat', 'Hats'], ['ride', 'Rides']]) {
      assert.equal(tabs.get(tab), label, `a "${label}" filter button carries data-tab="${tab}"`);
    }

    // the coin wording, and the signed-out door
    assert.match(body, /not money, not redeemable/, 'the page says the coins are not money, not redeemable');
    assert.match(body, /Anyone can look/, 'signed out, the page says anyone can look');

    // ---- the API the grid reads
    const api = await fetch(`${B}/api/store`);
    assert.equal(api.status, 200, '/api/store answers 200');
    const data = await api.json();
    // The job said "an items array". Measured against ledger.storeView(), it is an OBJECT keyed by item id
    // (e.g. hat-tophat, top-tuxedo) — so that is what this asserts. If the API ever becomes a list, this fails
    // and the change gets looked at, which is the point.
    assert.equal(typeof data.items, 'object', '/api/store returns an items collection');
    assert.ok(!Array.isArray(data.items), '/api/store items is the keyed map ledger.storeView() builds');
    const ids = Object.keys(data.items || {});
    assert.ok(ids.length > 0, `the store has items (found ${ids.length})`);
    const first = data.items[ids[0]];
    assert.equal(typeof first.name, 'string', 'each item has a name');
    assert.equal(typeof first.price, 'number', 'each item has a price in coins');
    assert.ok('slot' in first, 'each item names the slot it fills');
    assert.match(String(data.note || ''), /not money/, '/api/store note says the coins are not money');
    assert.match(String(data.note || ''), /not redeemable/, '/api/store note says the coins are not redeemable');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
