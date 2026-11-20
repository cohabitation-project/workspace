// The public store page and API describe the real catalog without presenting coins as money.
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

    const response = await fetch(`${B}/store`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, /<title>[^<]*The Commons store[^<]*<\/title>/);
    assert.match(body, /<h1>The store<\/h1>/);
    assert.match(body, /<ul\b[^>]*\bid="store-grid"/);

    for (const [tab, label] of [['all', 'Everything'], ['skin', 'Skins'], ['hat', 'Hats'], ['ride', 'Rides']]) {
      assert.match(
        body,
        new RegExp(`<button\\b[^>]*\\bdata-tab="${tab}"[^>]*>${label}<\\/button>`),
        `the ${label} filter is a ${tab} button`,
      );
    }

    assert.ok(body.includes('not money, not redeemable'), 'the page says coins are not money or redeemable');
    assert.ok(body.includes('Anyone can look'), 'signed-out visitors are welcome to browse');

    const apiResponse = await fetch(`${B}/api/store`);
    assert.equal(apiResponse.status, 200);
    const api = await apiResponse.json();
    assert.ok(Array.isArray(api.items), '/api/store returns an items array');
    assert.ok(api.note.includes('not money'), '/api/store notes that coins are not money');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
