// 0ural1, Cohabi's music app (began as Cohabi Stream v0, 2026-11-25): a public page that plays only music its artists
// already share on Cohabi's artist pages, with the player at the top, its own install manifest, and no inline script.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';
import { catalog } from '../lib/streampage.mjs';

test('the catalog is the label\'s published tracks, each with a playable address and its source', () => {
  const c = catalog();
  assert.ok(c.length > 0, 'the label has releases');
  for (const r of c) { assert.equal(r.source, 'Cohabi Marketplace Artist'); for (const t of r.tracks) { assert.match(t.url, /^\/label\/files\//); assert.match(t.type, /^audio\//); } }
});

test('/0ural1 (and the old /stream) answer signed out, the player comes first, and a track plays as audio', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'stream-v0-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    let ready = false; for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
    assert.ok(ready);
    assert.equal((await fetch(`${B}/stream`)).status, 200, 'old links keep working');
    const r = await fetch(`${B}/0ural1`); assert.equal(r.status, 200);
    const html = await r.text();
    assert.match(html, /<title>0ural1/);
    for (const mode of ['ou-shuffle', 'ou-repeat', 'ou-vol', 'ou-seek', 'ou-heart', 'ou-qbtn']) assert.match(html, new RegExp(`id="${mode}"`), `player has ${mode}`);
    for (const v of ['discover', 'albums', 'artists', 'songs', 'mix', 'playlists', 'liked']) assert.match(html, new RegExp(`data-nav="${v}"`), `nav has ${v}`);
    const man = await fetch(`${B}/static/0ural1/0ural1.webmanifest`); assert.equal(man.status, 200);
    const mj = JSON.parse(await man.text()); assert.equal(mj.name, '0ural1'); assert.equal(mj.start_url, '/0ural1'); assert.equal(mj.display, 'standalone');
    assert.equal((await fetch(`${B}/static/0ural1/app.js`)).status, 200);
    assert.ok(html.indexOf('id="st-bar"') < html.indexOf('id="st-list"'), 'the player is at the top');
    assert.doesNotMatch(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ''), /<script(?![^>]*\bsrc=)[^>]*>[^<]/, 'no inline script (the site-wide JSON-LD data block aside)');
    const url = (html.match(/\/label\/files\/[^"&]+\.(?:mp3|ogg|m4a|wav|flac)/) || [])[0]; assert.ok(url, 'a track address is on the page');
    const a = await fetch(B + url, { headers: { range: 'bytes=0-1023' } });
    assert.ok([200, 206].includes(a.status)); assert.match(a.headers.get('content-type') || '', /^audio\//);
  } finally { srv.kill(); }
});
