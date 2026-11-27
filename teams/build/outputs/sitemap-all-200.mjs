// Every sitemap URL must resolve locally; HTML responses must have a non-empty title.
// node --test commons/test/sitemap-all-200.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let ROOT = HERE;
while (!fs.existsSync(path.join(ROOT, 'commons/server.mjs'))) {
  const parent = path.dirname(ROOT);
  if (parent === ROOT) throw new Error('could not locate repository root from test file');
  ROOT = parent;
}
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('every sitemap URL answers 200 and every HTML page has a title', { timeout: 120000 }, async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-all-200-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' },
    stdio: 'ignore',
  });
  try {
    let booted = false;
    for (let i = 0; i < 120 && !booted; i++) {
      try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* still starting */ }
      if (!booted) await sleep(250);
    }
    assert.ok(booted, 'isolated server booted');

    const sitemap = await fetch(`${base}/sitemap.xml`);
    assert.equal(sitemap.status, 200, 'sitemap answers 200');
    const locs = [...(await sitemap.text()).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
      .map((m) => new URL(m[1].trim()).pathname);
    assert.ok(locs.length > 0, 'sitemap contains at least one <loc>');
    // Mutation hook: inject a known 404 into the sitemap walk; the normal test never adds it.
    if (process.env.MUTANT_404 === '1') locs.push('/does-not-exist');

    const titles = new Map();
    for (const pathname of locs) {
      const response = await fetch(`${base}${pathname}`);
      const contentType = response.headers.get('content-type') || '';
      let title = '(non-HTML)';
      if (/text\/html/i.test(contentType)) {
        const html = await response.text();
        const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
        title = match ? match[1].replace(/\s+/g, ' ').trim() : '(missing title)';
      }
      console.log(`${pathname} ${response.status} ${title}`);
      assert.equal(response.status, 200, `${pathname} must answer 200`);
      if (/text\/html/i.test(contentType)) {
        assert.notEqual(title, '(missing title)', `${pathname} must have a <title>`);
        assert.ok(title, `${pathname} must have a non-empty <title>`);
        const pages = titles.get(title) || [];
        pages.push(pathname);
        titles.set(title, pages);
      }
    }

    const duplicates = [...titles].filter(([, pages]) => pages.length > 1);
    console.log('DUPLICATE TITLES:');
    if (!duplicates.length) console.log('(none)');
    for (const [title, pages] of duplicates) console.log(`${JSON.stringify(title)}: ${pages.join(', ')}`);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
