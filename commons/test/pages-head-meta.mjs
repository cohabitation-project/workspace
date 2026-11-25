// Every public sitemap page that serves HTML has a viewport declaration and a real meta description.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, path.basename(HERE) === 'outputs' ? '../../..' : '../..');
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const attributes = (tag) => Object.fromEntries(
  [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? ''])
);

 test('every 200 HTML sitemap page declares viewport and a non-empty meta description', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-head-meta-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' },
    stdio: 'ignore'
  });
  try {
    let booted = false;
    for (let i = 0; i < 80 && !booted; i++) {
      try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* server is still starting */ }
      if (!booted) await sleep(250);
    }
    assert.ok(booted, 'Commons server booted on a temporary data directory');

    const sitemap = await fetch(`${base}/sitemap.xml`, { redirect: 'manual' });
    assert.equal(sitemap.status, 200, 'GET /sitemap.xml returns 200');
    const xml = await sitemap.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
    assert.ok(locs.length > 0, 'sitemap contains at least one <loc>');

    const bad = [];
    let checked = 0;
    for (const loc of locs) {
      let target;
      try { target = new URL(loc); }
      catch { bad.push({ loc, issue: 'invalid sitemap URL' }); continue; }
      let response;
      try { response = await fetch(`${base}${target.pathname}${target.search}`, { redirect: 'manual' }); }
      catch (error) { bad.push({ loc, issue: `fetch failed: ${error.message}` }); continue; }
      const type = response.headers.get('content-type') || '';
      if (response.status !== 200 || !/text\/html/i.test(type)) { await response.body?.cancel(); continue; }
      checked++;
      const html = await response.text();
      const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] || '';
      const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attributes(tag));
      if (!metas.some((meta) => (meta.name || '').toLowerCase() === 'viewport')) {
        bad.push({ loc, issue: 'missing <meta name="viewport"> in <head>' });
      }
      const description = metas.find((meta) => (meta.name || '').toLowerCase() === 'description');
      if (!description || !description.content?.trim()) {
        bad.push({ loc, issue: 'missing non-empty <meta name="description" content="…"> in <head>' });
      }
    }

    console.log(`pages=${locs.length} checked=${checked} bad=${bad.length}`);
    for (const item of bad) console.log(`BAD ${item.loc}: ${item.issue}`);
    assert.equal(bad.length, 0, `${bad.length} sitemap page(s) failed head metadata checks`);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
