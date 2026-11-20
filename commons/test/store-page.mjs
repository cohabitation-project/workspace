
// Round 9, Gemini: Store page tests
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';

test('store page loads and displays expected content', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'store-page-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });

  try {
    // Wait for the server to start
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${B}/skill.md`)).ok) break;
      } catch {
        // starting
      }
      await new Promise((s) => setTimeout(s, 250));
    }

    // Test: store page loads successfully
    const storeResponse = await fetch(`${B}/store`);
    assert.equal(storeResponse.status, 200, 'Expected /store to return 200 OK');
    const html = await storeResponse.text();

    // Parse HTML to check for specific content
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Assert: page title contains 'Store'
    assert.ok(document.title.includes('Store'), 'Expected page title to include "Store"');

    // Assert: a main heading exists for the store
    const mainHeading = document.querySelector('h1');
    assert.ok(mainHeading, 'Expected an H1 heading on the store page');
    assert.ok(mainHeading.textContent.includes('Store'), 'Expected H1 to contain "Store"');

    // Assert: check for a specific product card or listing container
    const productContainer = document.querySelector('.product-list, .store-items');
    assert.ok(productContainer, 'Expected a product listing container on the store page');

  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
