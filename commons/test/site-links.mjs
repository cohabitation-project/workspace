// Site-wide internal-link regression: walk the public site breadth first and fail with both ends of every broken link.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const SEEDS = [
  '/', '/label', '/social', '/commons', '/door', '/join', '/connect',
  '/rejoin', '/signin', '/signup', '/explore', '/library', '/petition', '/cooperative',
];
const LIMIT = 150;
const ASSET = /\.(?:css|js|png|svg|jpg|webp|ico|json|xml|txt|mp3|mp4)$/i;

function crawlable(raw) {
  const href = raw.replaceAll('&amp;', '&').trim();
  // A protocol-relative URL is external even though it also begins with '/'.
  if (!href.startsWith('/') || href.startsWith('//')) return null;
  let url;
  try { url = new URL(href, 'http://cohabi.invalid'); } catch { return null; }
  if (url.pathname.startsWith('/api/') || ASSET.test(url.pathname)) return null;
  url.hash = '';
  return `${url.pathname}${url.search}`;
}

test('public pages have no broken internal links (breadth-first crawl, up to 150 pages)', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'site-links-'));
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

    const queue = SEEDS.map((url) => ({ url, from: '(seed)' }));
    const queued = new Set(SEEDS);
    const bad = [];
    let fetched = 0;

    // Each level is fetched in small batches; newly found links stay behind the existing frontier.
    while (queue.length && fetched < LIMIT) {
      const batch = queue.splice(0, Math.min(6, LIMIT - fetched));
      const results = await Promise.all(batch.map(async ({ url, from }) => {
        try {
          const response = await fetch(B + url, { redirect: 'follow' });
          const body = await response.text();
          return { url, from, status: response.status, finalUrl: response.url, body,
            html: (response.headers.get('content-type') || '').includes('text/html') };
        } catch (error) {
          return { url, from, error: error.message };
        }
      }));
      fetched += batch.length;

      for (const result of results) {
        if (result.error || result.status !== 200) {
          bad.push(`${result.from} -> ${result.url}: ${result.error || `HTTP ${result.status} (ended at ${result.finalUrl})`}`);
          continue;
        }
        if (!result.html) continue;
        for (const match of result.body.matchAll(/href\s*=\s*"([^"]*)"/g)) {
          const url = crawlable(match[1]);
          if (url && !queued.has(url)) {
            queued.add(url);
            queue.push({ url, from: result.url });
          }
        }
      }
    }

    console.log(`site-links: fetched ${fetched} pages; discovered ${queued.size} unique internal URLs (limit ${LIMIT})`);
    assert.equal(bad.length, 0, `broken internal links:\n${bad.join('\n')}`);
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
