// Dynamic Commons pages: every rendered same-site link should resolve, rather than 404 or 5xx.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as auth from '../lib/auth.mjs';
import * as store from '../lib/store.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, path.basename(HERE) === 'outputs' ? '../../..' : '../..');
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const decodeEntities = (text) => text
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
const localHref = (value) => {
  const href = decodeEntities(value.trim());
  if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('#')) return null;
  let url;
  try { url = new URL(href, 'http://commons.test'); } catch { return null; }
  if (url.origin !== 'http://commons.test' || url.pathname.startsWith('/api/') || url.pathname === '/logout') return null;
  return `${url.pathname}${url.search}`;
};
const hrefsIn = (html) => [...html.matchAll(/(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)]
  .map((match) => localHref(match[1] ?? match[2] ?? match[3] ?? ''))
  .filter(Boolean);

test('all same-site links on dynamic profile, listing, room, orders and sales pages resolve', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-dynamic-links-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  store.init(dataDir);
  const member = store.addMember({ id: 'h_links_seed', name: 'Links Seed Member', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
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
    assert.ok(booted, 'Commons server booted on an isolated temporary data directory');

    const listingResponse = await fetch(`${base}/api/market/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Commons': '1', Cookie: cookie },
      body: JSON.stringify({
        title: 'Links Sample Listing', text: 'A small, useful sample listing for checking dynamic page links.',
        category: 'music', type: 'product', price: { mode: 'free' }, license: 'cc-by', rights: true,
        tags: 'links, sample'
      })
    });
    assert.equal(listingResponse.status, 201, 'test member can create its seeded market listing');
    const listing = await listingResponse.json();
    assert.ok(listing.id, 'listing response has an id');

    const routes = [
      [`/m/${member.id}`, false],
      [`/label/l/${encodeURIComponent(listing.id)}`, false],
      ['/room/general', false],
      ['/orders', true],
      ['/label/sales', true]
    ];
    const targets = new Map();
    for (const [page, signedIn] of routes) {
      const response = await fetch(`${base}${page}`, { headers: signedIn ? { Cookie: cookie } : {} });
      assert.equal(response.status, 200, `${page} is served successfully`);
      assert.match(response.headers.get('content-type') || '', /text\/html/i, `${page} is HTML`);
      const html = await response.text();
      for (const href of hrefsIn(html)) if (!targets.has(href)) targets.set(href, page);
    }

    const bad = [];
    for (const [href, page] of targets) {
      let response;
      try {
        response = await fetch(`${base}${href}`, { redirect: 'manual', headers: { Cookie: cookie } });
      } catch (error) {
        bad.push({ page, href, status: `fetch-error:${error.message}` });
        continue;
      }
      if (response.status === 404 || response.status >= 500) bad.push({ page, href, status: response.status });
      await response.body?.cancel();
    }
    console.log(`links=${targets.size} bad=${bad.length}`);
    for (const item of bad) console.log(`BAD ${item.page} -> ${item.href} ${item.status}`);
    assert.equal(bad.length, 0, `${bad.length} same-site link target(s) failed`);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
