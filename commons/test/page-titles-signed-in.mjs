
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

const getPageTitle = (html) => {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match && match[1] ? match[1].trim() : '';
};

test('Signed-in pages have correct titles', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'page-titles-signed-in-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], {
    env: {
      ...process.env,
      ASHRAM_PORT: String(PORT),
      COMMONS_DATA: D,
      COMMONS_ARRIVE_BYPASS: 'TESTGATE' // Bypass CAPTCHA for signup
    },
    stdio: 'ignore'
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

  const request = async (url, { method = 'GET', member, body } = {}) => {
    const headers = { 'x-commons': '1' };
    if (member?.cookie) headers.cookie = member.cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const r = await fetch(`${B}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    return { r, text: await r.text() };
  };

  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await sleep(250);
    }
    assert.ok(ready, 'isolated Commons server started');

    const member = await signup('SignedInUser');
    assert.equal(member.r.status, 201, 'member signs up');
    assert.ok(member.cookie, 'member receives a session cookie');

    const signedInPages = [
      '/orders', '/label/mine', '/label/sales', '/wallet', '/account', '/jobs/new', '/label/new'
    ];

    for (const pagePath of signedInPages) {
      const { r, text: pageHtml } = await request(pagePath, { member });
      const status = r.status;
      const isRedirect = status >= 300 && status < 400;

      if (isRedirect) {
        const location = decodeURIComponent(r.headers.get('location') || '');
        assert.ok(
          (location && location.includes('/signin?next=') && location.includes(encodeURIComponent(pagePath))),
          `Page ${pagePath} redirects correctly to signin when not authorized or for setup.`
        );
        // If it redirects, we don't check the title of the target page in this test.
        // The job spec asks for 200, so any redirect here is a potential failure unless intended.
        assert.equal(status, 200, `Page ${pagePath} returns 200 OK (or expected redirect status for valid reasons), actual status: ${status}`);

      } else {
        assert.equal(status, 200, `Page ${pagePath} returns 200 OK, actual status: ${status}`);
        if (status === 200) {
          const title = getPageTitle(pageHtml);
          assert.ok(title.length > 0, `Page ${pagePath} has a non-empty title. Title: '${title}'`);
          assert.ok(!title.includes('undefined') && !title.includes('null'), `Page ${pagePath} title does not contain 'undefined' or 'null'. Title: '${title}'`);
        }
      }
    }

  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
