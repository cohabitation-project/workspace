// A 404 page is a dead end only if it says so: it must offer the way forward and every link it offers must work.
// Boot copied from commons/test/site-links.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const FORWARD = ['/', '/label', '/social', '/headquarters'];

test('the 404 page offers a way forward, and every link on it works', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'not-found-links-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
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

    // The 404 itself: still a real 404, but no dead end.
    const missing = await fetch(`${B}/no-such-page-xyz`, { redirect: 'follow' });
    const body = await missing.text();
    assert.equal(missing.status, 404, 'an unknown page should answer 404');
    assert.ok(
      body.includes('<p><a href="/">Home</a> · <a href="/label">Marketplace</a> · <a href="/social">Feed</a> · <a href="/headquarters">Headquarters</a></p>'),
      'the 404 page carries the way-forward paragraph',
    );
    assert.ok(body.includes('href="/"'), 'the 404 page links home');
    assert.ok(body.includes('href="/label"'), 'the 404 page links the marketplace');
    assert.ok(body.includes('href="/social"'), 'the 404 page links the feed');
    assert.ok(body.includes('href="/headquarters"'), 'the 404 page links headquarters');

    // Every way forward it offers actually works.
    const bad = [];
    for (const url of FORWARD) {
      const response = await fetch(B + url, { redirect: 'follow' });
      if (response.status !== 200) bad.push(`${url}: HTTP ${response.status} (ended at ${response.url})`);
    }
    assert.equal(bad.length, 0, `links on the 404 page that do not work:\n${bad.join('\n')}`);
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
