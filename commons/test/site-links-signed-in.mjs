// Signed-in link crawl: exercise member-only destinations and links with a real session.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import * as auth from '../lib/auth.mjs';
import * as store from '../lib/store.mjs';
import { JSDOM } from 'jsdom';

// /live is routed by Caddy in production, not by the isolated Commons test server.
const KNOWN_BROKEN = [
  { href: '/live', why: 'Caddy route, not in the test server' }
];

const skipLink = (href) => href.startsWith('/api/') ||
  href.match(/\.(css|js|png|svg|jpg|jpeg|gif|ico|json|xml|txt|mp3|mp4|webm|woff2?)($|\?)/i);

const normalizeHref = (href, base) => {
  const url = new URL(href, base);
  if (url.origin !== new URL(base).origin) return null;
  return `${url.pathname}${url.search}`;
};

test('signed-in market, social, wallet, studio and own-profile links lead to pages', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'site-links-signed-in-'));
  // Seed an ordinary human and session before the isolated server loads its data directory.
  store.init(D);
  const member = store.addMember({ id: 'h_sitelinksignedin', name: 'Link Crawl Member', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D },
    stdio: 'ignore'
  });

  const startPages = [
    '/social', '/wallet', '/orders', '/label/mine', '/label/sales', '/studio', `/m/${member.id}`
  ];
  const visited = new Set();
  const queued = new Set();
  const queue = startPages.map((href) => ({ href, from: 'seed' }));
  for (const item of queue) queued.add(item.href);
  const badLinks = [];
  let pagesCrawled = 0;

  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${B}/skill.md`, { headers: { cookie } })).ok) { ready = true; break; }
      } catch { /* server starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'isolated Commons server started');

    // Give the signed-in feed a real post whose own-page link must be crawled.
    const createPost = await fetch(`${B}/api/posts`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json', 'x-commons': '1' },
      body: JSON.stringify({ text: 'Signed-in link crawl fixture post.' })
    });
    assert.equal(createPost.status, 201, 'the signed-in member can create a text post');
    const post = await createPost.json();
    assert.ok(post.id, 'the post API returns its id');
    const postPageHref = `/p/${post.id}`;
    // /social is already a seed above; explicitly seed the post page as well as walking its feed link.
    if (!queued.has(postPageHref)) {
      queue.push({ href: postPageHref, from: 'post created by test' });
      queued.add(postPageHref);
    }
    let postPageLinksFound = 0;
    let postPagesCrawled = 0;

    while (queue.length > 0 && pagesCrawled < 150) {
      const { href: currentHref, from } = queue.shift();
      queued.delete(currentHref);
      if (visited.has(currentHref)) continue;
      visited.add(currentHref);

      const knownBroken = KNOWN_BROKEN.find((item) => normalizeHref(item.href, B) === currentHref);
      if (knownBroken) continue;
      pagesCrawled++;
      if (currentHref === postPageHref) postPagesCrawled++;

      let response;
      try {
        response = await fetch(`${B}${currentHref}`, {
          redirect: 'follow',
          headers: { cookie }
        });
      } catch (error) {
        badLinks.push(`Error fetching ${currentHref} from ${from}: ${error.message}`);
        continue;
      }

      if (response.status !== 200) {
        badLinks.push(`Bad link: ${currentHref} from ${from} (status ${response.status})`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) continue;
      const dom = new JSDOM(await response.text());
      dom.window.document.querySelectorAll('a').forEach((anchor) => {
        const rawHref = anchor.getAttribute('href');
        if (!rawHref || !rawHref.startsWith('/') || skipLink(rawHref)) return;
        const normalized = normalizeHref(rawHref, B);
        if (!normalized) return; // Ignore protocol-relative links to other origins.
        if (currentHref === '/social' && normalized === postPageHref) postPageLinksFound++;
        if (KNOWN_BROKEN.some((item) => normalizeHref(item.href, B) === normalized)) return;
        if (!visited.has(normalized) && !queued.has(normalized)) {
          queue.push({ href: normalized, from: currentHref });
          queued.add(normalized);
        }
      });
    }

    assert.ok(postPageLinksFound > 0, `/social links to the created post page ${postPageHref}`);
    assert.ok(postPagesCrawled > 0, `the signed-in crawl visits the post page ${postPageHref}`);
    if (badLinks.length > 0) {
      assert.fail(`Found ${badLinks.length} bad signed-in links:\n${badLinks.join('\n')}`);
    }
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
