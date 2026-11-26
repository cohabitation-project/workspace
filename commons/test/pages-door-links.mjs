// Door and sign-in public pages and their first-hop same-origin references must resolve.
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
const ROOT = path.resolve(HERE, '../..');
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const BASE = process.env.BASE?.replace(/\/+$/, '') || '';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const decodeEntities = (text) => text
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");

function sameOriginReferences(html, pageUrl) {
  // Keep real element tags, not markup-like strings inside scripts or comments.
  const markup = html.replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, (script) => script.slice(0, script.indexOf('>') + 1));
  const found = new Map();
  for (const tag of markup.matchAll(/<[a-z][^>]*>/gi)) {
    for (const attr of tag[0].matchAll(/\b(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const raw = decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? '').trim();
      if (!raw) continue;
      let url;
      try { url = new URL(raw, pageUrl); } catch { continue; }
      if (url.origin !== new URL(pageUrl).origin) continue;
      url.hash = '';
      const target = `${url.pathname}${url.search}`;
      if (!found.has(target)) found.set(target, target);
    }
  }
  return [...found.values()];
}

const isSuccessOrRedirect = (status) => status >= 200 && status < 400;
const pages = ['/door', '/join', '/signin', '/signup', '/connect'];

test('door and sign-in pages plus one hop of same-origin href/src resolve signed out and in', { timeout: 120000 }, async () => {
  const dataDir = BASE ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'pages-door-links-'));
  const port = await freePort();
  const base = BASE || `http://127.0.0.1:${port}`;
  if (!BASE) store.init(dataDir);
  let cookie, server;
  if (!BASE) {
    const member = store.addMember({ id: 'h_door_links_seed', name: 'Door Links Seed', kind: 'human' });
    cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
    server = spawn(process.execPath, ['commons/server.mjs'], {
      cwd: ROOT,
      env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' },
      stdio: 'ignore',
    });
  } else {
    // BASE is intended for a disposable test server. Create only a clearly named test member.
    const humanResponse = await fetch(`${base}/api/humans`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' },
      body: JSON.stringify({ name: 'Door Links Test', age13: true }),
    });
    assert.equal(humanResponse.status, 201, `BASE test human created: ${await humanResponse.text()}`);
    cookie = (humanResponse.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^commons_session=/, 'BASE returned a session cookie for the seeded test human');
  }
  const bad = [];
  const checked = new Set();
  try {
    if (!BASE) {
      let booted = false;
      for (let i = 0; i < 80 && !booted; i++) {
        try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* server starting */ }
        if (!booted) await sleep(250);
      }
      assert.ok(booted, 'Commons server booted on an isolated temporary data directory');
    }

    const get = async (route, page, headers, session) => {
      const url = new URL(route, `${base}/`);
      const key = `${url.pathname}${url.search}`;
      checked.add(`${session}:${key}`);
      let response;
      try { response = await fetch(url, { redirect: 'manual', headers }); }
      catch (error) {
        console.log(`LINK ${page} ${key} fetch-error:${error.message}`);
        bad.push({ page, href: key, status: null });
        return { response: null, contentType: '', html: '', key };
      }
      if (response.status >= 300 && response.status < 400) {
        console.log(`REDIRECT ${page} ${response.headers.get('location') || '(no location)'} (${response.status})`);
      }
      if (!isSuccessOrRedirect(response.status)) {
        console.log(`LINK ${page} ${key} ${response.status}`);
        bad.push({ page, href: key, status: response.status });
      }
      const contentType = response.headers.get('content-type') || '';
      const html = /text\/html/i.test(contentType) && response.status >= 200 && response.status < 300
        ? await response.text() : '';
      if (!html && response.body && !response.bodyUsed) await response.body.cancel().catch(() => {});
      return { response, contentType, html, key };
    };

    for (const page of pages) {
      for (const signedIn of [false, true]) {
        const label = `${page}${signedIn ? ' [signed in]' : ' [signed out]'}`;
        const headers = signedIn ? { Cookie: cookie } : {};
        const session = signedIn ? 'in' : 'out';
        const loaded = await get(page, label, headers, session);
        const signinRedirectAllowed = signedIn && (page === '/signin' || page === '/signup')
          && loaded.response && loaded.response.status >= 300 && loaded.response.status < 400;
        if (!signinRedirectAllowed) {
          assert.equal(loaded.response.status, 200, `${label} returns HTTP 200`);
          assert.match(loaded.contentType, /text\/html/i, `${label} returns HTML`);
          assert.match(loaded.html, /<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title\s*>/i, `${label} contains a nonempty HTML title`);
        }

        // Resolve references from only this page. Their own outbound links are deliberately not followed.
        for (const ref of sameOriginReferences(loaded.html, new URL(page, `${base}/`).href)) {
          if (ref === loaded.key || checked.has(`${session}:${ref}`)) continue;
          await get(ref, label, headers, session);
        }
        // Test-only mutant: inject one nonexistent same-origin href; the normal 404 assertion must turn red.
        if (process.env.FAKE_REFERENCE_MUTANT === '1' && page === '/door' && !signedIn) {
          await get('/__round62_fake_missing_reference__', `${label} [fake mutant]`, headers, session);
        }
      }
    }
    console.log(`page-visits=${pages.length * 2} page-and-link-visits=${checked.size} bad=${bad.length}`);
    assert.equal(bad.filter((item) => item.status === 404 || item.status >= 500).length, 0,
      'same-origin href/src references must not return 404 or 5xx');
    assert.equal(bad.filter((item) => typeof item.status !== 'number').length, 0,
      'same-origin href/src references must be fetchable');
  } finally {
    server?.kill();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
