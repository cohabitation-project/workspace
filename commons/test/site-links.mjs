import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import { JSDOM } from 'jsdom'; // Assuming JSDOM is available in the test environment

const excludedExtensions = ['.css', '.js', '.png', '.svg', '.jpg', '.ico', '.json', '.xml', '.txt', '.mp3'];

function extractLinks(html, baseUrl) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const links = new Set();
  document.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('/api/')) {
      const extension = path.extname(href);
      if (!excludedExtensions.includes(extension)) {
        links.add(new URL(href, baseUrl).pathname);
      }
    }
  });
  return Array.from(links);
}

test('site-wide link check: no page links nowhere', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'site-links-'));
  const PORT = await freePort();
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D },
    stdio: 'ignore'
  });

  const brokenLinks = [];
  const visited = new Set();
  const queue = [
    '/', '/label', '/social', '/commons', '/door', '/join', '/connect', '/rejoin',
    '/signin', '/signup', '/explore', '/library', '/petition', '/cooperative'
  ];
  let pagesVisitedCount = 0;
  const maxPagesToVisit = 150;

  try {
    // Wait for the server to start
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${baseUrl}/skill.md`)).ok) break;
      } catch { /* starting */ }
      await new Promise((s) => setTimeout(s, 250));
    }

    while (queue.length > 0 && pagesVisitedCount < maxPagesToVisit) {
      const currentPath = queue.shift();

      if (visited.has(currentPath)) {
        continue;
      }

      visited.add(currentPath);
      pagesVisitedCount++;

      console.log(`Visiting: ${currentPath}`); // Debugging

      const response = await fetch(`${baseUrl}${currentPath}`);
      if (response.status !== 200) {
        brokenLinks.push({ path: currentPath, status: response.status, referrer: 'initial_queue' });
        continue; // Don't try to extract links from a broken page
      }

      const html = await response.text();
      const newLinks = extractLinks(html, baseUrl);

      for (const link of newLinks) {
        if (!visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }
    }

    assert.equal(brokenLinks.length, 0, `Found broken links: ${JSON.stringify(brokenLinks, null, 2)}`);

  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
