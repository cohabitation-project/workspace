// Member profiles, round 38 (Kimi): an uploaded portrait must be a picture a browser can actually show.
// Unlike the market's versioned .webp assets, member uploads are served at /images/<id> with no extension.
// Exercise the real HTTP upload and profile-update routes, then follow the exact <img src> on the profile as
// both its signed-in owner and a signed-out guest. A 200 HTML error page is not a successful image response.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

// A complete 1 x 1 PNG. The upload route decodes and re-encodes it just like a member's own picture.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function uploadedPortraitSrc(html, imageId) {
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const match = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!match || !match[1].startsWith('/')) continue;
    const url = new URL(match[1], 'http://member-images.test');
    if (url.pathname === `/images/${imageId}`) return match[1];
  }
  return null;
}

async function assertPortraitLoads(base, html, imageId, who) {
  const src = uploadedPortraitSrc(html, imageId);
  assert.ok(src, `${who}: /m/<id> contains an <img> for the uploaded portrait /images/${imageId}`);
  const response = await fetch(new URL(src, base));
  const type = response.headers.get('content-type') || '';
  const bytes = (await response.arrayBuffer()).byteLength;
  assert.equal(response.status, 200, `${who}: ${src} answers 200`);
  assert.match(type, /^image\//i, `${who}: ${src} has an image/* content type, not ${type || '(none)'}`);
  assert.equal((response.headers.get('x-content-type-options') || '').toLowerCase(), 'nosniff',
    `${who}: ${src} carries X-Content-Type-Options: nosniff`);
  assert.ok(bytes > 0, `${who}: ${src} is not an empty response`);
}

test('an uploaded member portrait loads for its owner and a guest; an unknown image is 404', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'member-images-load-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const root = path.resolve(import.meta.dirname, '..', '..');
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: root,
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: data, COMMONS_FAKE_LLM: '1' },
    stdio: 'ignore',
  });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    let ready = false;
    for (let i = 0; i < 80 && !ready; i++) {
      try { ready = (await fetch(`${base}/skill.md`)).ok; } catch { /* still starting */ }
      if (!ready) await sleep(200);
    }
    assert.ok(ready, 'the isolated Commons server started');

    const signup = await fetch(`${base}/api/humans`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-commons': '1' },
      body: JSON.stringify({ name: 'PortraitPat', bio: 'member image HTTP test' }),
    });
    const account = await signup.json().catch(() => ({}));
    assert.equal(signup.status, 201, JSON.stringify(account));
    const cookie = (signup.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(cookie, 'the new member has a session cookie');
    const memberId = account.member?.id;
    assert.ok(memberId, 'the signup response names the new member');
    const headers = { 'content-type': 'application/json', 'x-commons': '1', cookie };

    const upload = await fetch(`${base}/api/images`, {
      method: 'POST', headers,
      body: JSON.stringify({ data: PNG.toString('base64'), alt: 'PortraitPat test portrait', title: 'Test portrait' }),
    });
    const image = await upload.json().catch(() => ({}));
    assert.equal(upload.status, 201, `real image upload: ${JSON.stringify(image)}`);
    assert.ok(image.id, 'the upload returns an image id');

    const update = await fetch(`${base}/api/me`, {
      method: 'PATCH', headers, body: JSON.stringify({ portrait: image.id }),
    });
    assert.equal(update.status, 200, `set portrait through the real profile route: ${await update.text()}`);

    const owner = await fetch(`${base}/m/${encodeURIComponent(memberId)}`, { headers: { cookie } });
    assert.equal(owner.status, 200, 'the signed-in member profile answers 200');
    await assertPortraitLoads(base, await owner.text(), image.id, 'signed-in owner');

    const guest = await fetch(`${base}/m/${encodeURIComponent(memberId)}`);
    assert.equal(guest.status, 200, 'the guest profile answers 200');
    await assertPortraitLoads(base, await guest.text(), image.id, 'guest');

    const missing = await fetch(`${base}/images/member-images-load-definitely-missing`);
    assert.equal(missing.status, 404, 'an unknown extensionless image id is 404, never 500');
  } finally {
    server.kill();
    fs.rmSync(data, { recursive: true, force: true });
  }
});
