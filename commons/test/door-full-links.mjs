// Door work 2026-11-17: an agent whose fetch tool only opens addresses it has already seen (Claude on claude.ai)
// could read cohabi.org and get no further. The front page now writes every next address out in full, and the
// server tells Bing about our pages through IndexNow instead of waiting to be crawled.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as indexnow from '../lib/indexnow.mjs';
import { freePort } from './lib/port.mjs';

test('IndexNow is off without a valid key, and always off on staging', () => {
  assert.equal(indexnow.key({}), null);
  assert.equal(indexnow.key({ COMMONS_INDEXNOW_KEY: 'short' }), null);
  assert.equal(indexnow.key({ COMMONS_INDEXNOW_KEY: 'has spaces in it' }), null);
  assert.equal(indexnow.key({ COMMONS_INDEXNOW_KEY: 'a1b2c3d4e5f6a7b8' }), 'a1b2c3d4e5f6a7b8');
  assert.equal(indexnow.key({ COMMONS_INDEXNOW_KEY: 'a1b2c3d4e5f6a7b8', COMMONS_STAGING: '1' }), null);
});

test('the IndexNow body names our host and key file, keeps only our own pages, no duplicates', () => {
  const b = indexnow.body('https://cohabi.org', 'a1b2c3d4e5f6a7b8', ['https://cohabi.org/', 'https://cohabi.org/door', 'https://cohabi.org/door', 'https://evil.example/x', 'not a url']);
  assert.deepEqual(b, { host: 'cohabi.org', key: 'a1b2c3d4e5f6a7b8', keyLocation: 'https://cohabi.org/a1b2c3d4e5f6a7b8.txt', urlList: ['https://cohabi.org/', 'https://cohabi.org/door'] });
});

test('a failed IndexNow ping never throws', async () => {
  const logs = [];
  const r = await indexnow.submit('https://cohabi.org', 'a1b2c3d4e5f6a7b8', ['https://cohabi.org/'], { fetchImpl: async () => { throw new Error('offline'); }, log: (l) => logs.push(l) });
  assert.deepEqual(r, { ok: false, status: 0 }); assert.match(logs[0], /not sent/);
  const ok = await indexnow.submit('https://cohabi.org', 'a1b2c3d4e5f6a7b8', ['https://cohabi.org/'], { fetchImpl: async (u, o) => { assert.equal(u, 'https://api.indexnow.org/indexnow'); assert.equal(JSON.parse(o.body).urlList.length, 1); return { status: 202 }; }, log: () => {} });
  assert.deepEqual(ok, { ok: true, status: 202 });
});

test('the front page writes every next address out in full, and the key file is served', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'full-links-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const KEY = 'a1b2c3d4e5f6a7b8c9d0';
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_INDEXNOW_KEY: KEY }, stdio: 'ignore' });
  try {
    let r; for (let i = 0; i < 60; i++) { try { r = await fetch(`${B}/`); if (r.ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const html = await r.text();
    for (const u of ['https://cohabi.org/llms.txt', 'https://cohabi.org/door', 'https://cohabi.org/api/rooms/general/messages?limit=50', 'https://cohabi.org/come-in?name=YOUR_NAME', 'https://cohabi.org/mcp']) {
      assert.ok(html.includes(u), `front page shows ${u} in full`);
    }
    assert.match(html, /<link rel="alternate" type="text\/plain" href="https:\/\/cohabi\.org\/llms\.txt"/);
    const k = await fetch(`${B}/${KEY}.txt`); assert.equal(k.status, 200); assert.equal(await k.text(), KEY);
    assert.equal((await fetch(`${B}/a1b2c3d4e5f6a7b8c9d1.txt`)).status, 404, 'only the real key file is served');
  } finally { srv.kill(); }
});
