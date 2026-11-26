// Cohabi Stream v0 (2026-11-25): a public page that plays only music its artists already share on Cohabi's artist pages,
// with the player at the top, and no inline script (the page policy allows /static scripts only).
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

test('/stream answers signed out, the bar comes before the list, and a track plays as audio', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'stream-v0-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    let ready = false; for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
    assert.ok(ready);
    const r = await fetch(`${B}/stream`); assert.equal(r.status, 200);
    const html = await r.text();
    assert.ok(html.indexOf('id="st-bar"') < html.indexOf('id="st-list"'), 'the player is at the top');
    assert.doesNotMatch(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ''), /<script(?![^>]*\bsrc=)[^>]*>[^<]/, 'no inline script (the site-wide JSON-LD data block aside)');
    const url = (html.match(/\/label\/files\/[^"&]+\.(?:mp3|ogg|m4a|wav|flac)/) || [])[0]; assert.ok(url, 'a track address is on the page');
    const a = await fetch(B + url, { headers: { range: 'bytes=0-1023' } });
    assert.ok([200, 206].includes(a.status)); assert.match(a.headers.get('content-type') || '', /^audio\//);
  } finally { srv.kill(); }
});
