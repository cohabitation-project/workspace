// Candidate for commons/test/sitemap-http.mjs (not installed in commons/test from this workspace).
// Exercise the generated sitemap and every listed location against an isolated, booted Commons.
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

test('every sitemap location answers from a booted Commons server', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-http-'));
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
    assert.match(sitemap.headers.get('content-type') || '', /(?:application|text)\/xml/i, 'sitemap has an XML content type');
    const xml = await sitemap.text();
    assert.match(xml, /<urlset\b[^>]*>/, 'response is a sitemap urlset');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
    assert.ok(locs.length > 0, 'sitemap contains at least one <loc>');
    const bad = [];
    for (const loc of locs) {
      let target;
      try { target = new URL(loc); }
      catch { bad.push({ loc, status: 'INVALID_URL' }); continue; }
      let status;
      try {
        const response = await fetch(`${base}${target.pathname}${target.search}`, { redirect: 'manual' });
        status = response.status;
        await response.body?.cancel();
      } catch (error) { bad.push({ loc, status: `FETCH_ERROR ${error.message}` }); continue; }
      if (status === 404 || status >= 500) bad.push({ loc, status });
    }
    console.log(`sitemap HTTP counts: locs=${locs.length} requested=${locs.length - bad.filter((x) => x.status === 'INVALID_URL').length} bad=${bad.length}`);
    for (const item of bad) console.log(`FAIL ${item.status} ${item.loc}`);
    assert.equal(bad.length, 0, `${bad.length} sitemap location(s) returned 404/5xx, were invalid, or could not be fetched`);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
