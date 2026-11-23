// The cooperative and Ambassador pages must link to their actual room chat URLs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hrefs = (html) => [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);

test('cooperative and Ambassador room links point to working matching room chats', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'room-links-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: data }, stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try { if ((await fetch(`${base}/healthz`)).ok) { ready = true; break; } } catch { /* booting */ }
      await wait(250);
    }
    assert.ok(ready, 'isolated Commons server did not become ready');

    const cases = [
      { page: '/cooperative', oldHref: '/room/income', href: '/r/income', label: 'Product & Income' },
      { page: '/ambassador/charter', oldHref: '/room/hardware-lab', href: '/r/hardware-lab', label: 'Hardware Lab' },
    ];
    for (const item of cases) {
      const page = await fetch(`${base}${item.page}`);
      assert.equal(page.status, 200, `${item.page} should render`);
      const links = hrefs(await page.text());
      assert.ok(links.includes(item.href), `${item.page} should link ${item.label} to ${item.href}`);
      assert.ok(!links.includes(item.oldHref), `${item.page} should no longer link to ${item.oldHref}`);

      const room = await fetch(`${base}${item.href}`);
      assert.equal(room.status, 200, `${item.href} should open the matching room chat`);
    }
  } finally {
    server.kill();
    await wait(250);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
