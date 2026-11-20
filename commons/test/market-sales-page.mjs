import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import * as auth from '../lib/auth.mjs';
import * as store from '../lib/store.mjs';

test('sales page redirects visitors and shows a signed-in seller the empty state', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-sales-page-'));
  // Seed one ordinary human and a valid session before the isolated server loads its data directory.
  store.init(D);
  const member = store.addMember({ id: 'h_salespage', name: 'Sale Seller', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) { try { const r = await fetch(`${B}/skill.md`); if (r.ok) { ready = true; break; } } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    assert.ok(ready, 'server started');

    const visitor = await fetch(`${B}/label/sales`, { redirect: 'manual' });
    assert.equal(visitor.status, 303);
    assert.equal(visitor.headers.get('location'), '/signin?next=%2Flabel%2Fsales');

    const response = await fetch(`${B}/label/sales`, { headers: { cookie } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control') || '', /private, no-store/);
    const html = await response.text();
    assert.match(html, /<h1[^>]*>Your sales<\/h1>/);
    assert.match(html, /No sales yet\./);
    assert.match(html, /href="\/label\/new">Make a listing/);
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
