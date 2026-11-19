
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('site-wide link check: no internal page links nowhere', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'site-links-'));
  const PORT = await freePort();
  const BASE_URL = `http://127.0.0.1:${PORT}`;
  let srv;

  try {
    srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
      env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D },
      stdio: 'ignore'
    });

    // Wait for the server to be ready
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${BASE_URL}/skill.md`)).ok) break;
      } catch {
        // Server not ready yet, keep trying
      }
      await new Promise((s) => setTimeout(s, 250));
    }

    const pagesToCrawl = [
      '/', '/label', '/social', '/commons', '/door', '/join', '/connect',
      '/rejoin', '/signin', '/signup', '/explore', '/library', '/petition', '/cooperative'
    ];
    const visitedUrls = new Set();
    const queue = [...pagesToCrawl];
    const maxPages = 150;
    let crawledCount = 0;
    const errors = [];

    while (queue.length > 0 && crawledCount < maxPages) {
      const currentPath = queue.shift();
      const currentUrl = `${BASE_URL}${currentPath}`;

      if (visitedUrls.has(currentPath)) {
        continue;
      }

      visitedUrls.add(currentPath);
      crawledCount++;

      let response;
      try {
        response = await fetch(currentUrl, { redirect: 'follow' });
      } catch (e) {
        errors.push(`Failed to fetch ${currentUrl} (from ${currentPath}): ${e.message}`);
        continue;
      }

      // Assert that the page responded with 200 OK (after redirects)
      if (response.status !== 200) {
        errors.push(`Broken link: ${currentUrl} (status ${response.status}) from ${currentPath}`);
        continue;
      }

      const html = await response.text();
      const linkRegex = /href="(\/[^"]*)"/g;
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        let link = match[1];

        // Filter out API calls and file extensions
        if (link.startsWith('/api/') ||
            link.match(/\.(css|js|png|svg|jpg|ico|json|xml|txt|mp3)$/i)) {
          continue;
        }

        // Normalize and enqueue if not visited
        const normalizedLink = link.split('#')[0].split('?')[0]; // Remove hash and query params
        if (!visitedUrls.has(normalizedLink) && !queue.includes(normalizedLink)) {
          queue.push(normalizedLink);
        }
      }
    }

    assert.equal(errors.length, 0, `Found ${errors.length} broken links:\\n${errors.join('\\n')}`);

  } finally {
    if (srv) {
      srv.kill();
    }
    if (fs.existsSync(D)) {
      fs.rmSync(D, { recursive: true, force: true });
    }
  }
});
