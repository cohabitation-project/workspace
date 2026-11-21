// Social-share metadata on a public Jobs detail page. The two other public detail pages are measured and reported,
// not changed: member profiles and Marketplace listings have separate owners.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null;
};
const decode = (value) => String(value || '').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const shareTags = (html) => {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  const tags = head.match(/<meta\b[^>]*>/gi) || [];
  const byProperty = (property) => tags.filter((tag) => attr(tag, 'property')?.toLowerCase() === property);
  return { title: byProperty('og:title'), description: byProperty('og:description') };
};
const report = (label, html) => {
  const tags = shareTags(html);
  const missing = [];
  if (tags.title.length !== 1) missing.push(`og:title (found ${tags.title.length})`);
  if (tags.description.length !== 1) missing.push(`og:description (found ${tags.description.length})`);
  console.log(`share-meta ${label}: ${missing.length ? `missing ${missing.join('; ')}` : 'og:title and og:description present'}`);
};

test('a Jobs detail has escaped Open Graph metadata; profile and listing gaps are reported', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'page-share-meta-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: {
      ...process.env,
      ASHRAM_PORT: String(PORT),
      COMMONS_PORT: String(PORT),
      COMMONS_DATA: D,
      COMMONS_ARRIVE_BYPASS: 'TESTGATE',
    },
    stdio: 'ignore',
  });
  const request = (method, url, body, cookie) => fetch(`${B}${url}`, {
    method,
    redirect: 'manual',
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json', 'x-commons': '1' } : {}),
      ...(cookie ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const post = (url, body, cookie) => request('POST', url, body, cookie);
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/healthz`)).ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'isolated Commons server started');

    const visitorResponse = await post('/api/arrive/visitor', {});
    const visitor = await visitorResponse.json();
    assert.ok(visitor.vid, 'the forest gate issued a visitor id');
    await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
    const entered = await post('/api/arrive/enter', { vid: visitor.vid, name: 'Share Meta Author' });
    const cookie = (entered.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(cookie, 'the test member receives a session');

    const title = 'Build <quiet> "share" cards';
    const text = 'Design a "clear" <social> preview & check one shared job description on a phone and a computer.';
    const posted = await post('/api/jobs', {
      kind: 'job', seeking: 'human', title, text, category: 'Design', coins: 120, tags: 'sharing, metadata',
    }, cookie);
    assert.equal(posted.status, 200, 'the member posts a job');
    const job = await posted.json();
    assert.match(job.id || '', /^jb_[a-f0-9]+$/i, 'posting returns a job id');

    const detail = await request('GET', `/jobs/${encodeURIComponent(job.id)}`);
    assert.equal(detail.status, 200, 'the public job detail answers 200');
    const html = await detail.text();
    const tags = shareTags(html);
    assert.equal(tags.title.length, 1, 'the head has exactly one og:title tag');
    assert.equal(tags.description.length, 1, 'the head has exactly one og:description tag');
    const rawTitle = attr(tags.title[0], 'content');
    assert.equal(rawTitle, 'Build &lt;quiet&gt; &quot;share&quot; cards', 'the title attribute is HTML-escaped');
    assert.equal(decode(rawTitle), title, 'the escaped title still decodes to the job title');
    assert.ok(!tags.title[0].includes('<quiet>'), 'a title tag cannot inject markup into the head');
    const rawDescription = attr(tags.description[0], 'content');
    assert.ok(rawDescription.includes('&quot;clear&quot;') && rawDescription.includes('&lt;social&gt;') && rawDescription.includes('&amp;'),
      'the description attribute escapes quotes, angle brackets and ampersands');
    assert.ok(!tags.description[0].includes('<social>'), 'a description cannot inject markup into the head');
    const description = decode(rawDescription).trim();
    assert.ok(description.length >= 30 && description.length <= 300,
      `og:description is 30–300 characters (got ${description.length})`);
    assert.ok(description.startsWith(text), 'the escaped description still decodes to this job\'s text');
    assert.ok(!/(?:undefined|null)/i.test(description), 'the description has no placeholder values');

    const memberId = job.by?.id;
    assert.ok(memberId, 'the job identifies its public author for the profile measurement');
    const profile = await request('GET', `/m/${encodeURIComponent(memberId)}`);
    assert.equal(profile.status, 200, 'the public member profile answers 200');
    report(`/m/${memberId}`, await profile.text());

    const made = await post('/api/market/listings', {
      title: 'A share-metadata test print',
      text: 'One original test print used only to measure the public listing page metadata.',
      category: 'art', type: 'product', price: { mode: 'fixed', amount: 500 },
      license: 'all-rights', rights: true,
    }, cookie);
    assert.equal(made.status, 201, 'the member creates a listing for the measurement');
    const listing = await made.json();
    const listingPage = await request('GET', `/label/l/${encodeURIComponent(listing.id)}`);
    assert.equal(listingPage.status, 200, 'the public listing answers 200');
    report(`/label/l/${listing.id}`, await listingPage.text());
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
