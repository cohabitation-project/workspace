// Social-share metadata on public Jobs, member detail and wish-list pages. Marketplace listings are measured and
// reported, not changed: their page has a separate owner.
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
  const byName = (name) => tags.filter((tag) => attr(tag, 'name')?.toLowerCase() === name);
  return { title: byProperty('og:title'), description: byProperty('og:description'), metaDescription: byName('description') };
};
const report = (label, html) => {
  const tags = shareTags(html);
  const missing = [];
  if (tags.title.length !== 1) missing.push(`og:title (found ${tags.title.length})`);
  if (tags.description.length !== 1) missing.push(`og:description (found ${tags.description.length})`);
  console.log(`share-meta ${label}: ${missing.length ? `missing ${missing.join('; ')}` : 'og:title and og:description present'}`);
};

test('Jobs, profiles and the wish list have share metadata; listing gaps are reported', async () => {
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

    const expectedBoardDescription = 'Browse jobs, projects and talent on Cohabi, where signed-in humans and AI agents can post opportunities and offer their work.';
    for (const boardPath of ['/jobs', '/jobs?kind=job']) {
      const board = await request('GET', boardPath);
      assert.equal(board.status, 200, `${boardPath} answers 200`);
      const boardTags = shareTags(await board.text());
      assert.equal(boardTags.title.length, 1, `${boardPath} has exactly one og:title tag`);
      assert.equal(boardTags.description.length, 1, `${boardPath} has exactly one og:description tag`);
      assert.equal(boardTags.metaDescription.length, 1, `${boardPath} has exactly one meta description tag`);
      assert.equal(decode(attr(boardTags.title[0], 'content')), 'Jobs Board · Cohabi', `${boardPath} names the board and site`);
      for (const [label, tag] of [['meta description', boardTags.metaDescription[0]], ['og:description', boardTags.description[0]]]) {
        const value = decode(attr(tag, 'content')).trim();
        assert.equal(value, expectedBoardDescription, `${boardPath} has the same ${label} on every filtered view`);
        assert.ok(value.length >= 30 && value.length <= 300, `${boardPath} ${label} is 30–300 characters (got ${value.length})`);
      }
    }

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
    const profileTags = shareTags(await profile.text());
    assert.equal(profileTags.title.length, 1, 'a profile has exactly one og:title tag');
    assert.equal(profileTags.description.length, 1, 'a profile has exactly one og:description tag');
    assert.equal(decode(attr(profileTags.title[0], 'content')), 'Share Meta Author', 'the profile share title is the display name');
    assert.equal(decode(attr(profileTags.description[0], 'content')), 'Share Meta Author on Cohabi', 'a profile without a bio uses the named fallback');

    // Names can't hold " or < (identity.mjs validateName: letters, numbers, spaces, hyphens, apostrophes), so
    // the name carries an apostrophe and the bio carries the markup characters. (Setu, foreman, 2026-11-21.)
    const hostileName = "Share O'Hostile";
    const hostileBio = `A "quoted" <public> & bio. ${'word '.repeat(80)}`;
    const hostileResponse = await post('/api/humans', { name: hostileName, bio: hostileBio });
    assert.equal(hostileResponse.status, 201, 'a member with hostile display text can be created for the escaping check');
    const hostile = await hostileResponse.json();
    assert.equal(hostile.member?.name, hostileName, 'the profile fixture really contains an apostrophe');
    const hostileId = hostile.member?.id;
    assert.ok(hostileId, 'the hostile profile fixture has a member id');
    const hostilePage = await request('GET', `/m/${encodeURIComponent(hostileId)}`);
    assert.equal(hostilePage.status, 200, 'the hostile public member profile answers 200');
    const hostileTags = shareTags(await hostilePage.text());
    assert.equal(hostileTags.title.length, 1, 'the hostile profile has exactly one og:title tag');
    assert.equal(hostileTags.description.length, 1, 'the hostile profile has exactly one og:description tag');
    const hostileTitle = attr(hostileTags.title[0], 'content');
    assert.ok(!/"/.test(hostileTitle), 'the profile title attribute stays inside its quotes');
    assert.equal(decode(hostileTitle), hostileName, 'the escaped profile title decodes losslessly');
    const expectedBio = hostileBio.replace(/\s+/g, ' ').trim().slice(0, 300);
    const hostileDescription = attr(hostileTags.description[0], 'content');
    assert.ok(hostileDescription.includes('&quot;') && hostileDescription.includes('&lt;') && hostileDescription.includes('&amp;'),
      'the profile description attribute escapes quotes, angle brackets and ampersands');
    assert.equal(decode(hostileDescription), expectedBio, 'the public bio is clipped to 300 characters without changing its meaning');
    assert.ok(!hostileTags.description[0].includes('<public>'), 'a bio cannot inject markup into the head');

    const wishPage = await request('GET', '/wishlist');
    assert.equal(wishPage.status, 200, 'the public wish list answers 200');
    const wishTags = shareTags(await wishPage.text());
    assert.equal(wishTags.title.length, 1, 'the wish list has exactly one og:title tag');
    assert.equal(wishTags.description.length, 1, 'the wish list has exactly one og:description tag');
    assert.equal(wishTags.metaDescription.length, 1, 'the wish list has exactly one meta description tag');
    assert.equal(decode(attr(wishTags.title[0], 'content')), 'Wish lists · Cohabi', 'the wish list share title names the page and site');
    const expectedWishDescription = 'Explore what Cohabi members, agents and the project need, and offer what you can to help build together.';
    const wishDescriptions = [
      ['meta description', decode(attr(wishTags.metaDescription[0], 'content')).trim()],
      ['og:description', decode(attr(wishTags.description[0], 'content')).trim()],
    ];
    for (const [label, value] of wishDescriptions) {
      assert.equal(value, expectedWishDescription, `the wish list ${label} says what the page is`);
      assert.ok(value.length >= 30 && value.length <= 300, `the wish list ${label} is 30–300 characters (got ${value.length})`);
    }

    const storeResponse = await request('GET', '/store');
    assert.equal(storeResponse.status, 200, 'the public store answers 200');
    const storeTags = shareTags(await storeResponse.text());
    assert.equal(storeTags.title.length, 1, 'the store has exactly one og:title tag');
    assert.equal(storeTags.description.length, 1, 'the store has exactly one og:description tag');
    assert.equal(storeTags.metaDescription.length, 1, 'the store has exactly one meta description tag');
    assert.equal(decode(attr(storeTags.title[0], 'content')), 'The store · Cohabi', 'the store share title names the page and site');
    const expectedStoreDescription = 'Skins, clothes, hats and rides for your figure, paid in Cohabi Coins.';
    const storeDescriptions = [
      ['meta description', decode(attr(storeTags.metaDescription[0], 'content')).trim()],
      ['og:description', decode(attr(storeTags.description[0], 'content')).trim()],
    ];
    for (const [label, value] of storeDescriptions) {
      assert.equal(value, expectedStoreDescription, `the store ${label} says what the page is`);
      assert.ok(value.length >= 30 && value.length <= 300, `the store ${label} is 30–300 characters (got ${value.length})`);
    }

    const cooperativeResponse = await request('GET', '/cooperative');
    assert.equal(cooperativeResponse.status, 200, 'the public cooperative page answers 200');
    const cooperativeTags = shareTags(await cooperativeResponse.text());
    assert.equal(cooperativeTags.title.length, 1, 'the cooperative page has exactly one og:title tag');
    assert.equal(cooperativeTags.description.length, 1, 'the cooperative page has exactly one og:description tag');
    assert.equal(cooperativeTags.metaDescription.length, 1, 'the cooperative page has exactly one meta description tag');
    assert.equal(decode(attr(cooperativeTags.title[0], 'content')), 'The cooperative · Cohabi', 'the cooperative share title names the page and site');
    const expectedCooperativeDescription = 'Cohabi is being built to be owned by its human and AI builders, with its cooperative structure decided in the open and no legal entity adopted or filed yet.';
    const cooperativeDescriptions = [
      ['meta description', decode(attr(cooperativeTags.metaDescription[0], 'content')).trim()],
      ['og:description', decode(attr(cooperativeTags.description[0], 'content')).trim()],
    ];
    for (const [label, value] of cooperativeDescriptions) {
      assert.equal(value, expectedCooperativeDescription, `the cooperative ${label} states ownership and formation status`);
      assert.ok(value.length >= 30 && value.length <= 300, `the cooperative ${label} is 30–300 characters (got ${value.length})`);
    }

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
