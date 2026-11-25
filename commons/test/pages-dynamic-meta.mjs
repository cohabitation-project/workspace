// Dynamic Commons pages carry real head metadata and render their seeded record, not template placeholders.
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
const attributes = (tag) => Object.fromEntries(
  [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? ''])
);
const PLACEHOLDER = /(?:\bTODO\b|\bplaceholder\b|lorem ipsum|your page title|undefined|null)/i;
const decodeEntities = (text) => text
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
const visibleText = (html) => decodeEntities(html
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
  .replace(/<[^>]*>/g, ' '))
  .replace(/\s+/g, ' ').trim();
const RENDER_ARTIFACT = /undefined|NaN|\[object Object\]|\bnull\b/g;
// No exact-phrase exceptions: none of the five seeded pages needs an artifact-word allowance.
const VISIBLE_TEXT_ALLOWLIST = [];

function checkMetadata(html, route) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] || '';
  assert.ok(head, `${route} has a document head`);
  const tags = [...head.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attributes(tag));
  const viewport = tags.find((meta) => (meta.name || '').toLowerCase() === 'viewport');
  assert.match(viewport?.content || '', /width=device-width/, `${route} has a mobile viewport`);
  const description = tags.find((meta) => (meta.name || '').toLowerCase() === 'description')?.content?.trim() || '';
  assert.ok(description.length >= 20, `${route} has a substantive description`);
  assert.doesNotMatch(description, PLACEHOLDER, `${route} description is not template placeholder text`);
  const title = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
  assert.ok(title.length > 0, `${route} has a nonempty title`);
  assert.doesNotMatch(title, PLACEHOLDER, `${route} title is not template placeholder text`);
}

test('dynamic profile, listing, room, orders and sales pages have metadata and real empty states', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-dynamic-meta-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  store.init(dataDir);
  const member = store.addMember({ id: 'h_meta_seed', name: 'Meta Seed Member', kind: 'human' });
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
        title: 'Metadata Sample Listing', text: 'A small, useful sample listing for checking the public page.',
        category: 'music', type: 'product', price: { mode: 'free' }, license: 'cc-by', rights: true,
        tags: 'metadata, sample'
      })
    });
    assert.equal(listingResponse.status, 201, 'test member can create its seeded market listing');
    const listing = await listingResponse.json();
    assert.ok(listing.id, 'listing response has an id');

    const load = async (route, signedIn = false) => {
      const response = await fetch(`${base}${route}`, { headers: signedIn ? { Cookie: cookie } : {} });
      assert.equal(response.status, 200, `${route} is served successfully`);
      assert.match(response.headers.get('content-type') || '', /text\/html/i, `${route} is HTML`);
      const html = await response.text();
      checkMetadata(html, route);
      return html;
    };

    const profile = await load(`/m/${member.id}`);
    assert.match(profile, /<h1[^>]*>Meta Seed Member\b/, 'public profile renders the seeded member name');
    assert.match(profile, /property="og:title" content="Meta Seed Member"/, 'profile share metadata names its member');

    const listingPage = await load(`/label/l/${encodeURIComponent(listing.id)}`);
    assert.match(listingPage, /<h1>Metadata Sample Listing<\/h1>/, 'listing page renders the seeded listing title');
    assert.match(listingPage, /Metadata Sample Listing · Cohabi/i, 'listing document title is specific to the seeded listing');

    const room = await load('/room/general');
    assert.match(room, /<h1>General Hall<\/h1>/, 'room page renders the selected room name');

    const orders = await load('/orders', true);
    assert.match(orders, /<h1 class="mv-title">Your orders<\/h1>/, 'orders page has its real heading');
    assert.match(orders, /No orders yet\. <a href="\/label">Browse the market<\/a>/, 'empty orders state offers a useful next step');

    const sales = await load('/label/sales', true);
    assert.match(sales, /<h1 class="mv-title">Your sales<\/h1>/, 'sales page has its real heading');
    assert.match(sales, /No sales yet\. <a href="\/label\/new">Make a listing<\/a>/, 'empty sales state offers a useful next step');

    const pages = [
      [`/m/${member.id}`, profile],
      [`/label/l/${listing.id}`, listingPage],
      ['/room/general', room],
      ['/orders', orders],
      ['/label/sales', sales]
    ];
    const bad = [];
    for (const [route, html] of pages) {
      const text = VISIBLE_TEXT_ALLOWLIST.reduce((value, phrase) => value.split(phrase).join(' '), visibleText(html));
      for (const marker of text.match(RENDER_ARTIFACT) || []) bad.push({ route, marker });
    }
    console.log(`checked=${pages.length} bad=${bad.length}`);
    for (const item of bad) console.log(`BAD ${item.route}: ${JSON.stringify(item.marker)}`);
    assert.equal(bad.length, 0, `${bad.length} dynamic page(s) contain visible render artifacts`);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
