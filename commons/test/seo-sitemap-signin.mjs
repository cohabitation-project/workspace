// Search fixes (Round 68, Ash's SEO lane; Geoffrey 2026-11-26):
//   (1) the sitemap leaves out market listings whose title starts with TEST (any case, after trim) and /explore;
//   (2) /signin answers X-Robots-Tag: noindex.
// Boots a real server on a temp data dir, like pages-door-links.mjs. Listings are seeded through market.create
// before boot, so the server reads them the way it reads real ones.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as market from '../lib/market.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const body = (title) => ({
  title, text: 'A thing made for the seo test.', category: 'art', type: 'product', license: 'all-rights-reserved',
  price: { mode: 'fixed', amount: 10 }, rights: true, tags: [], physical: false,
});

test('sitemap drops TEST listings and /explore; /signin is noindex', { timeout: 120000 }, async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-sitemap-signin-'));
  market.init(dataDir);
  const seller = { id: 'h_seo_seed', name: 'Seo Seed', kind: 'human' };
  const license = Object.keys(market.LICENSES)[0];
  const make = (title) => market.create(seller, { ...body(title), license });
  const ordinary = make('Blue ceramic cup');
  const upper = make('TEST do not buy');
  const spaced = make('   test listing, lower case');
  const mid = make('A latest testament'); // "test" inside the title, not at the start: stays listed
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

    const res = await fetch(`${base}/sitemap.xml`);
    assert.equal(res.status, 200);
    const locs = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].trim()).pathname);
    console.log(`sitemap locs=${locs.length} ordinary=${locs.includes(`/label/l/${ordinary.id}`)} test_upper=${locs.includes(`/label/l/${upper.id}`)} test_spaced=${locs.includes(`/label/l/${spaced.id}`)} explore=${locs.includes('/explore')}`);
    assert.ok(locs.includes(`/label/l/${ordinary.id}`), 'an ordinary listing is in the sitemap');
    assert.ok(locs.includes(`/label/l/${mid.id}`), 'a title with "test" later in it is still listed');
    assert.ok(!locs.includes(`/label/l/${upper.id}`), 'TEST listing is not in the sitemap');
    assert.ok(!locs.includes(`/label/l/${spaced.id}`), 'a lower-case, space-padded test listing is not in the sitemap');
    assert.ok(!locs.includes('/explore'), '/explore is not in the sitemap');
    assert.ok(locs.includes('/petition') && locs.includes('/label'), 'the rest of the list is still there');

    // the listing page itself is untouched: not withdrawn, only left out of search
    const page = await fetch(`${base}/label/l/${upper.id}`);
    assert.equal(page.status, 200, 'the TEST listing still opens (it is not withdrawn here)');
    const explore = await fetch(`${base}/explore`, { redirect: 'manual' });
    assert.ok(explore.status < 400, '/explore page stays');

    for (const url of ['/signin', '/signin?next=/label']) {
      const r = await fetch(`${base}${url}`, { redirect: 'manual' });
      console.log(`${url} status=${r.status} x-robots-tag=${r.headers.get('x-robots-tag')}`);
      assert.equal(r.status, 200);
      assert.match(r.headers.get('x-robots-tag') || '', /noindex/i, `${url} says noindex`);
      await r.body?.cancel();
    }
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
