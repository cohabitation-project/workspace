// Market, round 34 (DeepSeek): every image the market home and its seven departments show actually loads.
// The market is the place a visitor decides whether this is a real shop or a mock-up; a tile, a hero or a product
// photo that answers 404 (or answers 200 with HTML, which an <img> renders as nothing) looks like an empty shop.
// market-departments.mjs already checks four department pages for /images/ paths only; this one follows the pages
// the home itself links to, and everything they reference, whatever the folder.
// Boots the server the way door-press-yes.mjs does. Guest only: images must not need a session to load.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

// The seven departments the market home offers (marketpage.mjs:288-302). The hrefs are read from the page below;
// this list is only here so a page that quietly loses a department tile fails loudly instead of checking six.
const DEPARTMENTS = ['music', 'art', 'video', 'writing', 'software', 'services', 'classifieds'];
const IMAGE_RE = /\.(?:webp|png|jpe?g|gif|svg|avif|ico)$/i;

// Every same-site image reference in one page's HTML: <img src>, <img srcset>, <source src|srcset>,
// <video poster>, and CSS url(...) inside <style> blocks or style="" attributes.
export function imageRefs(html) {
  const found = new Map(); // path -> where it was found (for the failure message)
  const add = (raw, where) => {
    for (const piece of String(raw).split(',')) {
      let url = piece.trim().split(/\s+/)[0];
      if (!url) continue;
      url = url.replace(/^['"]|['"]$/g, '');
      if (!url.startsWith('/') || url.startsWith('//')) continue; // off-site, data:, anchors: not ours to serve
      url = url.split('#')[0].split('?')[0];
      if (!url || url.endsWith('/')) continue; // a directory, not a file
      if (!IMAGE_RE.test(url)) continue; // fonts and scripts are not images
      if (!found.has(url)) found.set(url, where);
    }
  };
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (src) add(src[1], 'img src');
    const set = tag.match(/\bsrcset\s*=\s*["']([^"']+)["']/i);
    if (set) add(set[1], 'img srcset');
  }
  for (const m of html.matchAll(/<source\b[^>]*\bsrcset\s*=\s*["']([^"']+)["']/gi)) add(m[1], 'source srcset');
  for (const m of html.matchAll(/<video\b[^>]*\bposter\s*=\s*["']([^"']+)["']/gi)) add(m[1], 'video poster');
  for (const m of html.matchAll(/url\(\s*([^)]+?)\s*\)/gi)) add(m[1], 'css url()');
  return [...found].map(([url, where]) => ({ url, where }));
}

test('every image on the market home and its seven department pages loads for a guest', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-images-load-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: 'ignore',
  });
  const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
  try {
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) {
      try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ }
      if (!ready) await sleep(250);
    }
    assert.ok(ready, 'the isolated Commons server started');

    // 1. The market home, as a guest.
    const homeRes = await fetch(`${B}/label`, { headers: { 'x-commons': '1' } });
    assert.equal(homeRes.status, 200, 'the market home answers a guest');
    const home = await homeRes.text();

    // 2. The department pages the home itself links to. Read from the page, so a renamed slug is checked too.
    const deptHrefs = [...new Set([...home.matchAll(/href="(\/label\?cat=([a-z-]+))"/gi)].map((m) => m[1]))];
    for (const slug of DEPARTMENTS) {
      assert.ok(deptHrefs.includes(`/label?cat=${slug}`),
        `the market home still links the ${slug} department; it links ${deptHrefs.join(', ') || '(none)'}`);
    }
    assert.equal(new Set(deptHrefs.map((h) => h.split('=')[1])).size, 7,
      `the home links exactly seven departments, found ${deptHrefs.length}: ${deptHrefs.join(', ')}`);

    // 3. Ask each page for its images, and ask the server for each image. Collect every failure before asserting,
    //    so one broken file doesn't hide the other six.
    const pages = ['/label', ...deptHrefs];
    const seen = new Map(); // image url -> first page that showed it
    const broken = [];
    const perPage = [];
    let checked = 0;
    for (const pageUrl of pages) {
      const res = pageUrl === '/label' ? homeRes : await fetch(`${B}${pageUrl}`, { headers: { 'x-commons': '1' } });
      assert.equal(res.status, 200, `${pageUrl} answers a guest`);
      assert.match(res.headers.get('content-type') || '', /text\/html/i, `${pageUrl} is HTML`);
      const html = pageUrl === '/label' ? home : await res.text();
      const refs = imageRefs(html);
      perPage.push({ page: pageUrl, images: refs.length });
      for (const { url, where } of refs) {
        if (!seen.has(url)) seen.set(url, pageUrl);
        const img = await fetch(`${B}${url}`);
        const type = img.headers.get('content-type') || '';
        const bytes = (await img.arrayBuffer()).byteLength;
        checked++;
        if (img.status !== 200) broken.push(`${pageUrl}: ${url} (${where}) answered ${img.status}`);
        else if (!/^image\//i.test(type)) broken.push(`${pageUrl}: ${url} (${where}) answered ${type || '(no content-type)'}, not an image`);
        else if (bytes === 0) broken.push(`${pageUrl}: ${url} (${where}) answered 200 with an empty file`);
      }
    }

    console.log('Market page → image counts:', JSON.stringify(perPage));
    console.log(`Distinct images checked: ${seen.size} (${checked} requests) across ${pages.length} pages`);

    // 4. A market with no images at all would pass the loop above silently. The home and Arts & Crafts carry art
    //    by design (Aletheia-6), so require at least one image somewhere in the set.
    assert.ok(seen.size > 0, `the market pages reference no same-site images at all: ${JSON.stringify(perPage)}`);

    assert.deepEqual(broken, [], `broken market images (page: url → answer):\n  ${broken.join('\n  ') || '(none)'}`);
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

// The extractor on its own, so a failure says whether the page changed or the parser did.
test('imageRefs finds src, srcset, poster and css url(), and ignores off-site and non-image references', () => {
  const html = `
    <img src="/market/art-v3/ceramic-mug.webp" alt="x">
    <img srcset="/market/art-v3/glass-vase.webp 1x, /market/art-v3/woven-throw.webp 2x">
    <img src="https://example.com/other.png"><img src="data:image/png;base64,AAA">
    <picture><source srcset="/brand/cohabi-icon-512.png"></picture>
    <video poster="/brand/jobs-hero-workshop.webp"></video>
    <div style="background-image:url('/coop-art/coop-hero-wide.svg')"></div>
    <style>.a{background:url(/public/favicon.svg?x=1)} .b{src:url(/fonts/x.woff2)}</style>
    <a href="/label?cat=music">music</a><img src="/market/blocks/">`;
  assert.deepEqual(imageRefs(html).map((r) => r.url).sort(), [
    '/brand/cohabi-icon-512.png', '/brand/jobs-hero-workshop.webp', '/coop-art/coop-hero-wide.svg',
    '/market/art-v3/ceramic-mug.webp', '/market/art-v3/glass-vase.webp', '/market/art-v3/woven-throw.webp',
    '/public/favicon.svg',
  ].sort());
});
