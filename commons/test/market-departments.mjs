// Department landing-page HTTP/image smoke (Builders Round 28, 2026-11-21).
// The test boots an isolated Commons server and requests each page as a guest and a member.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import * as auth from '../lib/auth.mjs';
import * as store from '../lib/store.mjs';

const DEPARTMENTS = [
  ['video', 'Make something worth watching.', 'Share your film or design'],
  ['writing', 'Stories deserve a home.', 'List your writing'],
  ['services', 'Good work starts together.', 'Offer a service'],
  ['classifieds', 'Find it. Trade it. Pass it on.', 'Post a notice'],
];

test('department pages render and every referenced Commons image loads for guests and members', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-departments-'));
  store.init(D);
  const member = store.addMember({ id: 'h_marketdept', name: 'Market Department Tester', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore',
  });
  // Round 35: the old matcher only matched image paths under /images/, a folder that does not exist in
  // commons/public/, so it found zero images on every market page and this test passed while checking none
  // (measured on main 2026-11-22: 0 references on all 8 pages). The pages really use two kinds of reference:
  //   /static/<dir>/<file>.<ext>   brand and product assets, served from commons/public/
  //   /images/<id>                 member uploads: no file extension, so the /images/ prefix is the test
  // Scripts, stylesheets and fonts also live under /static/, so a path there counts only with an image extension.
  const IMAGE_EXT = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
  const imagePaths = (html) => {
    const found = new Set();
    const add = (raw) => {
      const url = (raw || '').trim().split(/\s+/)[0]; // srcset entries are "url 1x"
      if (!url.startsWith('/')) return;
      const bare = url.replace(/[?#].*$/, '');
      if (bare.startsWith('/images/') || (bare.startsWith('/static/') && IMAGE_EXT.test(bare))) found.add(url);
    };
    for (const m of html.matchAll(/(?:src|poster)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
    for (const m of html.matchAll(/srcset\s*=\s*["']([^"']+)["']/gi)) for (const part of m[1].split(',')) add(part);
    for (const m of html.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) add(m[1]);
    return [...found];
  };
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { const r = await fetch(`${B}/skill.md`); if (r.ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((s) => setTimeout(s, 250));
    }
    assert.ok(ready, 'server started');

    const observations = [];
    for (const [category, title, makerAction] of DEPARTMENTS) {
      for (const [audience, headers] of [['guest', { 'x-commons': '1' }], ['member', { 'x-commons': '1', cookie }]]) {
        const url = `/label?cat=${category}`;
        const response = await fetch(`${B}${url}`, { headers });
        const html = await response.text();
        const images = [];
        const refs = imagePaths(html);
        // The guard that stops this test passing empty again: a page with no recognised image is a red run,
        // not a silent skip. Measured on main 2026-11-22: each of these four pages carries one image (the shared
        // brand asset /static/brand/cohabi-coin-tree.webp), so this proves the matcher works on every page it
        // claims to cover; Arts & Crafts, which carries eight product photos as well, is covered by
        // commons/test/market-images-load.mjs.
        assert.ok(refs.length >= 1, `${audience} ${url}: at least one image reference was found (the matcher found none, so this page's image checks would be empty)`);
        for (const image of refs) {
          const r = await fetch(`${B}${image}`);
          const contentType = r.headers.get('content-type') || '';
          images.push({ url: image, status: r.status, contentType });
          assert.equal(r.status, 200, `${audience} ${url}: image ${image} returns 200`);
          assert.match(contentType, /^image\//i, `${audience} ${url}: ${image} has image content-type, got ${contentType}`);
        }
        observations.push({ audience, url, status: response.status, images });
        assert.equal(response.status, 200, `${audience} ${url} answers`);
        assert.match(response.headers.get('content-type') || '', /text\/html/i, `${audience} ${url} is HTML`);
        assert.match(html, new RegExp(`<h[12]\\b[^>]*>\\s*${title.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*</h[12]>`, 'i'), `${audience} ${url} has the live department title as an h1/h2`);
        // The department's own call to action ("Share your film or design", ...) links to listing or sign-up.
        // (Round 28 asserted exactly one /label/new|/signup link; the page has several by design: nav, steps, footer.)
        const makerLinks = [...html.matchAll(/<a\b[^>]*href="(?:\/label\/new|\/signup)(?:[?"#][^"]*)?"[^>]*>([\s\S]*?)<\/a>/gi)];
        assert.ok(makerLinks.some((m) => m[1].replace(/<[^>]+>/g, '').includes(makerAction)), `${audience} ${url} links "${makerAction}" to listing or sign-up`);
        assert.doesNotMatch(html, /style="[^"]*(?:width\s*:\s*(?:1\d{2,}|\d{4,})vw)/i, `${audience} ${url} has no inline width above 100vw`);
      }
    }

    const unknown = await fetch(`${B}/label?cat=nonsense`);
    const unknownHtml = await unknown.text();
    observations.push({ audience: 'guest', url: '/label?cat=nonsense', status: unknown.status, images: imagePaths(unknownHtml) });
    console.log('Department page → image observations:', JSON.stringify(observations));
    assert.equal(unknown.status, 200, 'unknown category falls back to the market home');
    assert.match(unknownHtml, /Cohabi Market|Cohabi Marketplace/i, 'unknown category renders the market home, not an error');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
