
// Site-wide link checker: ensures no page links nowhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

// Importing JSDOM for robust HTML parsing and link extraction.
// Note: If JSDOM is unavailable in CI, a regex-based link extraction will be required.
import { JSDOM } from 'jsdom';

test('site-wide link check: all internal links return 200', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'site-links-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });

  const startPages = [
    '/', '/label', '/social', '/commons', '/door', '/join', '/connect', '/rejoin',
    '/signin', '/signup', '/explore', '/library', '/petition', '/cooperative'
  ];
  const visited = new Set();
  const queue = [...startPages];
  const badLinks = [];
  let pagesCrawled = 0;

  try {
    // Wait for the server to be ready
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }

    while (queue.length > 0 && pagesCrawled < 150) {
      const currentPath = queue.shift();
      const url = `${B}${currentPath}`;

      if (visited.has(currentPath)) continue;
      visited.add(currentPath);
      pagesCrawled++;

      process.stdout.write(`Crawling: ${currentPath} (${pagesCrawled}/150)
`);

      let response;
      try {
        response = await fetch(url, { redirect: 'follow' });
      } catch (e) {
        badLinks.push(`Error fetching ${currentPath} (from unknown source): ${e.message}`);
        continue;
      }

      if (response.status !== 200) {
        badLinks.push(`Bad link: ${currentPath} (status ${response.status})`);
        continue;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;

        document.querySelectorAll('a').forEach(a => {
          const href = a.getAttribute('href');
          if (href && href.startsWith('/')) {
            // Skip API, static files and other non-HTML links
            if (href.startsWith('/api/') ||
                href.match(/\.(css|js|png|svg|jpg|ico|json|xml|txt|mp3)$/i)) {
              return;
            }
            if (!visited.has(href) && !queue.includes(href)) {
              queue.push(href);
            }
          }
        });
      }
    }

    if (badLinks.length > 0) {
      assert.fail(`Found ${badLinks.length} bad links:
${badLinks.join('\n')}`);
    }

  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
