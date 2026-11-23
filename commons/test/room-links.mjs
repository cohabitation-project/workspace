// The room references on the cooperative and Ambassador charter pages must lead somewhere real.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('every same-site link on the cooperative and Ambassador charter pages reaches a 200 page', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'room-links-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, COMMONS_PORT: String(port), COMMONS_REPO: path.resolve(import.meta.dirname, '..', '..'), COMMONS_DATA: data },
    stdio: 'ignore'
  });
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try { if ((await fetch(`${base}/healthz`)).ok) { ready = true; break; } } catch { /* server starting */ }
      await pause(250);
    }
    assert.ok(ready, 'isolated Commons server did not become ready');

    const bad = [];
    for (const page of ['/cooperative', '/ambassador/charter']) {
      const response = await fetch(`${base}${page}`, { redirect: 'follow' });
      assert.equal(response.status, 200, `${page} itself should answer 200`);
      const html = await response.text();
      const targets = new Set();
      const anchors = html.match(/<a\\b[^>]*>/gi) || [];
      for (const anchor of anchors) {
        const attr = anchor.match(/\\bhref\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))/i);
        if (!attr) continue;
        const href = (attr[1] ?? attr[2] ?? attr[3] ?? '').replace(/&amp;/gi, '&');
        let target;
        try { target = new URL(href, `${base}${page}`); } catch { continue; }
        if (target.origin !== base) continue;
        target.hash = '';
        targets.add(target.href);
      }
      for (const href of targets) {
        try {
          const linked = await fetch(href, { redirect: 'follow' });
          if (linked.status !== 200) bad.push(`${page} -> ${new URL(href).pathname}${new URL(href).search} (${linked.status})`);
        } catch (error) { bad.push(`${page} -> ${href} (${error.message})`); }
      }
    }
    assert.deepEqual(bad, [], `same-site links with non-200 final responses:\n${bad.join('\n')}`);
  } finally {
    server.kill();
    await pause(150);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
