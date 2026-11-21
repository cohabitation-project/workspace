// The signed-out visitor's first minute: GET / and make sure the doors on it lead somewhere.
// Run: node --test commons/test/visitor-first-minute.mjs
//
// What "/" is: for a signed-out visitor server.mjs serves commons/public/preview-home/index.html (Aletheia-6's homepage,
// sendHome). commons/lib/landing.mjs is the OLD Porch, now only at /porch-classic, so a broken link on "/" is fixed in
// the preview-home file, which is Aletheia-6's, not in landing.mjs.
//
// Checks (all on the raw HTML, scripts never run, so "visible in the HTML" is literal):
//  1. "/" answers 200 with no cookie (no redirect to /social).
//  2. Every href starting with "/" inside <header>/<nav> and inside the first <section> of <main> answers below 400
//     (a redirect is fine) and, once redirects are followed, lands on a 200 page.
//  3. The page links to a way to sign up (/signup) and a way to sign in (/signin or /login), with visible text.
//  4. The page links to a way to read about the project (/cooperative or /about), with visible text.
//  5. The sets in (2) are not empty (so the test cannot pass by finding nothing).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { freePort } from './lib/port.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('a signed-out visitor to "/" can sign up, read about the project, and no front-page link is broken', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'first-minute-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore',
  });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } await sleep(250); }

    // 1. the home page itself, signed out, not redirected
    const home = await fetch(`${B}/`, { redirect: 'manual' });
    assert.equal(home.status, 200, `GET / signed out should be 200, got ${home.status}`);
    const html = await home.text();
    const doc = new JSDOM(html).window.document;

    // 2. the links in the header/nav and in the first section of <main>
    const main = doc.querySelector('main');
    assert.ok(main, 'the home page has a <main>');
    const firstSection = main.querySelector('section') || main;
    const regions = [
      ['nav', [...doc.querySelectorAll('header a, nav a')]],
      ['first section of main', [...firstSection.querySelectorAll('a')]],
    ];
    const internal = (a) => {
      const href = (a.getAttribute('href') || '').trim();
      if (!href.startsWith('/') || href.startsWith('//')) return null;
      return href.split('#')[0] || null; // "/" + hash is the home page itself
    };
    for (const [name, links] of regions) {
      const distinct = new Set(links.map(internal).filter((h) => h && h !== '/'));
      assert.ok(distinct.size >= 3, `found at least 3 distinct internal links (not counting "/") in the ${name} (found ${distinct.size})`);
    }
    const hrefs = [...new Set(regions.flatMap(([, links]) => links.map(internal)).filter(Boolean))];
    const bad = [];
    for (const href of hrefs) {
      if (href === '/') continue;
      const first = await fetch(`${B}${href}`, { redirect: 'manual' });
      if (first.status >= 400) { bad.push(`${href} answered ${first.status}`); continue; }
      const end = await fetch(`${B}${href}`, { redirect: 'follow' });
      if (end.status !== 200) bad.push(`${href} redirects to ${end.url.replace(B, '')} which answered ${end.status}`);
    }
    assert.deepEqual(bad, [], `broken links on the signed-out home page:\n${bad.join('\n')}`);

    // 3 and 4. a way to sign up, a way to sign in, a way to read about the project, visible in the HTML
    const visible = (pattern) => [...doc.querySelectorAll('a[href]')].filter((a) => pattern.test(a.getAttribute('href')) && a.textContent.trim().length > 0 && !a.hasAttribute('hidden'));
    assert.ok(visible(/^\/signup(\?|#|$)/).length, 'a visible /signup link with text');
    assert.ok(visible(/^\/(signin|login)(\?|#|$)/).length, 'a visible /signin or /login link with text');
    assert.ok(visible(/^\/(cooperative|about)(\?|#|$)/).length, 'a visible /cooperative or /about link with text');
    // and the sign-up / about targets are real pages (200 after redirects), not just tolerated by the loop above
    for (const p of ['/signup', '/cooperative']) assert.equal((await fetch(`${B}${p}`)).status, 200, `${p} is a page`);
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
