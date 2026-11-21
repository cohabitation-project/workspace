// Artist-folder route checks (Builders Round 20): public releases page, a member's music listing,
// the artist link exposed from that listing, missing artist behavior, and internal links on both pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('Label releases and artist pages resolve for members and visitors', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'label-artist-releases-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore'
  });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const problems = [];
  const record = (condition, message) => { if (!condition) problems.push(message); };
  const internalLinksWork = async (html, pageName) => {
    const hrefs = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)]
      .map((m) => (m[1] ?? m[2] ?? m[3] ?? '').replace(/&amp;/g, '&'))
      .filter((href) => href.startsWith('/'));
    const unique = [...new Set(hrefs)];
    record(unique.length > 0, `${pageName} has at least one internal href to check`);
    for (const href of unique) {
      try {
        const response = await fetch(new URL(href, B), { redirect: 'follow' });
        record(response.status < 400, `${pageName} internal href ${href} returned ${response.status}`);
      } catch (error) {
        record(false, `${pageName} internal href ${href} failed: ${error.message}`);
      }
    }
  };

  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await sleep(250);
    }
    assert.ok(ready, 'isolated Commons server started');

    // Public Label release index: no session cookie is sent.
    const releasesResponse = await fetch(`${B}/label/releases`, { redirect: 'manual' });
    record(releasesResponse.status === 200, `/label/releases returned ${releasesResponse.status}, expected 200`);
    const releasesHtml = await releasesResponse.text();
    const titleText = releasesHtml.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || '';
    record(titleText.length > 0, '/label/releases has a non-empty HTML title');
    await internalLinksWork(releasesHtml, '/label/releases');

    // A signed-in human creates a music item using the same signup route as the Jobs Board HTTP tests.
    const signup = await fetch(`${B}/api/humans`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-commons': '1' },
      body: JSON.stringify({ name: 'Label Music Maker' })
    });
    const signupData = await signup.json().catch(() => ({}));
    const cookie = (signup.headers.get('set-cookie') || '').split(';')[0];
    record(signup.status === 201, `member signup returned ${signup.status}`);
    record(!!cookie, 'member signup issued a session cookie');

    const listingResponse = await fetch(`${B}/api/market/listings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-commons': '1', cookie },
      body: JSON.stringify({
        title: 'A Song for the Shared Road', text: 'A short music release listed for route testing.',
        category: 'music', type: 'product', price: { mode: 'free' }, license: 'cc0', rights: true, made_by: 'human'
      })
    });
    const listing = await listingResponse.json().catch(() => ({}));
    record(listingResponse.status < 300, `member music listing returned ${listingResponse.status}: ${JSON.stringify(listing)}`);
    const listingId = listing.id || listing.listed || listing.listing?.id;
    record(typeof listingId === 'string' && listingId.length > 0, 'listing response contains its id');

    let artistHtml = '';
    if (listingId) {
      const detailResponse = await fetch(`${B}/label/l/${encodeURIComponent(listingId)}`);
      const detailHtml = await detailResponse.text();
      record(detailResponse.status === 200, `music listing detail returned ${detailResponse.status}`);
      record(detailHtml.includes('A Song for the Shared Road'), 'music listing detail shows the listed title');
      // Deliberately discover the route from rendered page markup, rather than constructing an assumed slug.
      const artistHref = detailHtml.match(/\bhref\s*=\s*["'](\/label\/a\/[^"'#?]+)["']/i)?.[1];
      record(!!artistHref, 'music listing detail links to its Label artist page (/label/a/…)');
      if (artistHref) {
        const artistResponse = await fetch(new URL(artistHref, B), { redirect: 'manual' });
        record(artistResponse.status === 200, `artist page ${artistHref} returned ${artistResponse.status}`);
        artistHtml = await artistResponse.text();
        record(artistHtml.includes('A Song for the Shared Road'), 'artist page shows the member-listed music title');
        await internalLinksWork(artistHtml, artistHref);
      }
    }

    const missing = await fetch(`${B}/label/a/no-such-artist`, { redirect: 'manual' });
    record(missing.status === 404, `/label/a/no-such-artist returned ${missing.status}, expected 404`);
    assert.deepEqual(problems, [], problems.join('\n'));
  } finally {
    srv.kill();
    await sleep(100);
    fs.rmSync(D, { recursive: true, force: true });
  }
});
