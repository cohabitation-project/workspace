// FireDamm on the section pages (2026-11-18): a service is "Available" only when FireDamm has a real listing for it;
// everything else says "Coming soon" with no link. Geoffrey: CTAs marked COMING SOON where not live.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'firedamm-'));
const PORT = await freePort(), B = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
test.after(() => { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); });
const H = { 'x-commons': '1', 'content-type': 'application/json' };
async function up() { for (let i = 0; i < 60; i++) { try { if ((await fetch(B + '/healthz')).ok) return; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); } throw new Error('server did not start'); }
const strip = (html) => (html.match(/<section class="mk-fd"[\s\S]*?<\/section>/) || [''])[0];

test('every section shows FireDamm help; nothing is Available until FireDamm lists it; then it links to the real listing', async () => {
  await up();
  for (const cat of ['music', 'art', 'writing', 'video', 'software', 'services']) {
    const s = strip(await (await fetch(`${B}/label?cat=${cat}`)).text());
    assert.ok(s, `${cat}: the strip is there`);
    assert.match(s, /Coming soon/, `${cat}: says what isn't built`);
    assert.doesNotMatch(s, /Available<\/span>/, `${cat}: nothing claims to be orderable`);
    assert.doesNotMatch(s.replace(/<a href="\/page\/[^"]+">its page<\/a>/, ''), /<a /, `${cat}: no links to things that don't exist`);
  }
  assert.equal(strip(await (await fetch(`${B}/label?cat=classifieds`)).text()), '', 'classifieds: no services strip');
  // FireDamm's page lists its Launch package
  const h = await fetch(B + '/api/humans', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Fern Builder' }) });
  const cookie = h.headers.get('set-cookie').split(';')[0];
  const pg = await (await fetch(B + '/api/pages', { method: 'POST', headers: { ...H, cookie }, body: JSON.stringify({ kind: 'business', name: 'Firedamm' }) })).json();
  assert.equal(pg.slug, 'firedamm');
  const l = await (await fetch(B + '/api/market/listings', { method: 'POST', headers: { ...H, cookie }, body: JSON.stringify({ title: 'Launch package: a hand-coded website', text: 'Four pages.', category: 'services', type: 'service', price: { mode: 'fixed', amount: 1195 }, license: 'all-rights', rights: true, made_by: 'human', page: pg.id }) })).json();
  const id = l.id || l.listing?.id; assert.ok(id, JSON.stringify(l));
  const s = strip(await (await fetch(`${B}/label?cat=music`)).text());
  assert.match(s, new RegExp(`<a href="/label/l/${id}">Your artist website, hand-coded</a> <span class="mk-fd-tag live">Available`), 'the live one links to the real listing');
  assert.match(s, /Release to Spotify[^<]*<\/span> <span class="mk-fd-tag soon">Coming soon/, 'the unbuilt one still says so');
  assert.match(s, /href="\/page\/firedamm"/, 'links to FireDamm\'s page');
});
