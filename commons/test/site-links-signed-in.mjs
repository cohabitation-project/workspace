// Signed-in link crawl (Round 9, 2026-11-19): the member-only surfaces should not lead to dead pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { freePort } from './lib/port.mjs';
import * as auth from '../lib/auth.mjs';
import * as store from '../lib/store.mjs';

// Entries are [page containing the link, href]. Keep only specific, observed failures here;
// otherwise the test must report and fail on every broken internal page link.
const KNOWN_BROKEN = [];
const ASSET = /\.(css|js|png|svg|jpg|jpeg|webp|ico|json|xml|txt|mp3|wav|mp4|woff2?)$/i;

test('signed-in market, social, wallet, studio and own-profile links lead to pages', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'site-links-signed-in-'));
  store.init(D);
  const member = store.addMember({ id: 'h_signedlinkscrawl', name: 'Link Crawl Member', kind: 'human', created: new Date().toISOString() });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  const PORT = await freePort();
  const BASE_URL = `http://127.0.0.1:${PORT}`;
  const serverPath = path.join(import.meta.dirname, '..', 'server.mjs');
  const srv = spawn(process.execPath, [serverPath], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D },
    stdio: 'ignore'
  });
  const visited = new Set();
  const queue = ['/social', '/wallet', '/orders', '/label/mine', '/label/sales', '/studio', `/m/${member.id}`]
    .map((route) => ({ route, from: 'seed routes', href: route }));
  const brokenLinks = [];

  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${BASE_URL}/skill.md`)).ok) { ready = true; break; } }
      catch { /* server is starting */ }
      await new Promise((s) => setTimeout(s, 250));
    }
    assert.ok(ready, 'isolated Commons server started');

    let pagesCrawled = 0;
    while (queue.length > 0 && pagesCrawled < 150) {
      const { route, from, href } = queue.shift();
      const currentUrl = new URL(route, BASE_URL);
      currentUrl.hash = '';
      const key = `${currentUrl.pathname}${currentUrl.search}`;
      if (visited.has(key)) continue;
      visited.add(key);
      pagesCrawled++;

      let response;
      try {
        response = await fetch(currentUrl, { headers: { cookie }, redirect: 'follow' });
      } catch (error) {
        brokenLinks.push({ page: from, href, route: key, error: error.message });
        continue;
      }
      if (response.status >= 400) {
        brokenLinks.push({ page: from, href, route: key, status: response.status });
        continue;
      }

      const html = await response.text();
      const document = new JSDOM(html).window.document;
      for (const link of document.querySelectorAll('a[href]')) {
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('/') || href.startsWith('/api/')) continue;
        const target = new URL(href, BASE_URL);
        if (ASSET.test(target.pathname)) continue;
        target.hash = '';
        const targetPath = `${target.pathname}${target.search}`;
        if (!visited.has(targetPath) && !queue.includes(targetPath)) queue.push(targetPath);
      }
    }

    const known = new Set(KNOWN_BROKEN.map(([page, href]) => `${page} ${href}`));
    const unexpected = brokenLinks.filter(({ page, href }) => !known.has(`${page} ${href}`));
    assert.equal(unexpected.length, 0,
      `Found ${unexpected.length} broken signed-in internal links after crawling ${pagesCrawled} pages:\n` +
      unexpected.map(({ page, href, status, error }) => `- ${page} -> ${href}: ${status ?? error}`).join('\n') +
      (brokenLinks.length > unexpected.length ? `\nKnown broken: ${brokenLinks.length - unexpected.length}` : ''));
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
