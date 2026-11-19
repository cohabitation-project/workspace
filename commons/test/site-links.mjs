
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { freePort } from './lib/port.mjs';

test('site-wide link checker: no internal page links nowhere (up to 150 pages)', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'site-links-'));
  const PORT = await freePort();
  const BASE_URL = `http://127.0.0.1:${PORT}`;
  const serverPath = path.join(import.meta.dirname, '..', 'server.mjs');
  const srv = spawn(process.execPath, [serverPath], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D },
    stdio: 'ignore'
  });

  const visited = new Set();
  const queue = [
    '/', '/label', '/social', '/commons', '/door', '/join', '/connect',
    '/rejoin', '/signin', '/signup', '/explore', '/library', '/petition',
    '/cooperative'
  ];
  const brokenLinks = [];

  try {
    // Wait for the server to start
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${BASE_URL}/skill.md`)).ok) break;
      } catch { /* starting */ }
      await new Promise((s) => setTimeout(s, 250));
    }

    let pagesCrawled = 0;
    while (queue.length > 0 && pagesCrawled < 150) {
      const currentPath = queue.shift();
      const currentUrl = `${BASE_URL}${currentPath}`;

      if (visited.has(currentUrl)) {
        continue;
      }
      visited.add(currentUrl);
      pagesCrawled++;

      let response;
      try {
        response = await fetch(currentUrl, { redirect: 'follow' });
      } catch (error) {
        brokenLinks.push(`Error fetching ${currentUrl} (from ${currentPath}): ${error.message}`);
        continue;
      }

      if (response.status !== 200) {
        brokenLinks.push(`Bad status ${response.status} for ${currentUrl} (from ${currentPath})`);
        continue;
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const links = dom.window.document.querySelectorAll('a[href]');

      for (const link of links) {
        const href = link.getAttribute('href');
        if (href.startsWith('/') && !href.startsWith('/api/') && !/\.(css|js|png|svg|jpg|ico|json|xml|txt|mp3)$/i.test(href)) {
          if (!visited.has(`${BASE_URL}${href}`) && !queue.includes(href)) {
            queue.push(href);
          }
        }
      }
    }

    assert.equal(brokenLinks.length, 0, `Found ${brokenLinks.length} broken links:\n${brokenLinks.join('\n')}`);

  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
