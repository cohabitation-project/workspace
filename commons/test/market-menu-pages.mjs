// Every destination in the signed-in Marketplace menu opens, and member-only pages ask visitors to sign in.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('signed-in Marketplace menu pages open; private pages require sign-in', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-menu-pages-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore'
  });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const signup = async (name) => {
    const r = await fetch(`${B}/api/humans`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-commons': '1' },
      body: JSON.stringify({ name })
    });
    return { r, j: await r.json().catch(() => ({})), cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
  };

  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await sleep(250);
    }
    assert.ok(ready, 'isolated Commons server started');

    const member = await signup('Market Menu Tester');
    assert.equal(member.r.status, 201, 'test member signs up');
    assert.ok(member.cookie, 'signup gives this member a session cookie');
    const headers = { cookie: member.cookie };
    const social = await fetch(`${B}/social`, { headers });
    assert.equal(social.status, 200, '/social renders for the signed-in member');
    const html = await social.text();

    // Find the complete outer dropdown, accounting for the nested Your pages <details>.
    const start = html.indexOf('<details class="cm-sub mk-sub">');
    assert.notEqual(start, -1, 'signed-in /social contains the Marketplace dropdown');
    const tags = /<\/?details\b[^>]*>/g; tags.lastIndex = start;
    let depth = 0; let end = -1; let tag;
    while ((tag = tags.exec(html))) {
      if (/^<details\b/.test(tag[0])) depth++;
      else if (/^<\/details/.test(tag[0]) && --depth === 0) { end = tags.lastIndex; break; }
    }
    assert.notEqual(end, -1, 'Marketplace dropdown has a closing details tag');
    const menu = html.slice(start, end);
    const hrefs = [...menu.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((m) => m[1]);
    const required = ['/label', '/label/new', '/label/mine', '/orders', '/label/sales', '/page/new'];
    for (const href of required) assert.ok(hrefs.includes(href), `Marketplace menu contains ${href}`);

    for (const href of hrefs) {
      const response = await fetch(`${B}${href}`, { headers });
      assert.equal(response.status, 200, `${href} opens for a signed-in member`);
      const page = await response.text();
      assert.match(page, /<h1\b[^>]*>[\s\S]*?<\/h1>/, `${href} renders a page heading`);
      assert.doesNotMatch(page, /Not found/i, `${href} is not a not-found page`);
    }

    for (const href of ['/label/mine', '/orders', '/label/sales']) {
      const response = await fetch(`${B}${href}`, { redirect: 'manual' });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        assert.match(response.headers.get('location') || '', /\/signin(?:\?|$)/, `${href} redirects visitors to sign-in`);
      } else {
        assert.equal(response.status, 200, `${href} gives visitors a sign-in page`);
        assert.match(await response.text(), /sign\s*in|sign-in|sign in/i, `${href} prompts visitors to sign in`);
      }
    }
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
