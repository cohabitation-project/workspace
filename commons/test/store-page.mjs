// The public store shows its catalog controls and describes coins honestly.
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

    const title = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    assert.ok(title?.[1].includes('The Commons store'), 'the page title names The Commons store');
    const headings = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
      .map((match) => match[1].replace(/<[^>]*>/g, '').trim());
    assert.ok(headings.includes('The store'), 'the page has an h1 whose text is The store');
    assert.match(body, /<ul\b[^>]*\bid="store-grid"[^>]*>/i);

    for (const [tab, label] of [['all', 'Everything'], ['skin', 'Skins'], ['hat', 'Hats'], ['ride', 'Rides']]) {
      const button = new RegExp(`<button\\b(?=[^>]*\\bdata-tab="${tab}")[^>]*>\\s*${label}\\s*</button>`, 'i');
      assert.match(body, button, `${label} is a button with data-tab=${tab}`);
    }
    assert.ok(body.includes('not money, not redeemable'), 'the page says coins are not money or redeemable');
    assert.ok(body.includes('Anyone can look'), 'signed-out visitors are told they can look');

    const apiResponse = await fetch(`${B}/api/store`);
    assert.equal(apiResponse.status, 200);
    const api = await apiResponse.json();
    assert.ok(api.items && typeof api.items === 'object' && Object.keys(api.items).length > 0, 'the API returns the catalog keyed by item id');
    assert.ok(api.note.includes('not money'), 'the API note says coins are not money');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
