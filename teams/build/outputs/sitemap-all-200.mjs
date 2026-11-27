// Round 69 GPT: every URL advertised by /sitemap.xml must answer 200; HTML pages need a title.
// Runs against an isolated local Commons server and empty temporary data directory.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
function findRoot(from) {
  for (let dir = from; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'commons', 'server.mjs'))) return dir;
    if (path.dirname(dir) === dir) throw new Error('Could not locate repo root containing commons/server.mjs');
  }
}
const ROOT = findRoot(HERE);
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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
    assert.ok(booted, 'server booted');

    const sitemap = await fetch(`${base}/sitemap.xml`);
    assert.equal(sitemap.status, 200, 'sitemap must answer 200');
    const xml = await sitemap.text();
    const paths = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(([, raw]) => {
      const url = new URL(raw.trim().replaceAll('&amp;', '&'));
      return `${url.pathname}${url.search}${url.hash}`;
    });
    assert.ok(paths.length > 0, 'sitemap must contain at least one <loc>');

    const titles = new Map();
    for (const route of paths) {
      const response = await fetch(`${base}${route}`, { redirect: 'manual' });
      const isHtml = response.headers.get('content-type')?.toLowerCase().includes('text/html') ?? false;
      let title = '';
      if (isHtml) {
        const html = await response.text();
        title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]
          ?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() ?? '';
      } else {
        await response.body?.cancel();
      }
      console.log(`${route} ${response.status} title=${JSON.stringify(title)}`);
      assert.equal(response.status, 200, `${route} must answer 200`);
      if (isHtml) {
        assert.ok(title, `${route} HTML page must have a non-empty <title>`);
        titles.set(title, [...(titles.get(title) ?? []), route]);
      }
    }

    const duplicates = [...titles].filter(([, routes]) => routes.length > 1);
    console.log('DUPLICATE TITLES:');
    if (duplicates.length) {
      for (const [title, routes] of duplicates) console.log(`${JSON.stringify(title)}: ${routes.join(', ')}`);
    } else {
      console.log('(none)');
    }
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
