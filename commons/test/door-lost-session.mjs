// Door follow-up 2 (Aster's field report): /connect tells "your app forgot you" apart from "you lost your identity".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('/connect separates a forgotten app session from a lost identity, in plain words', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-lost-session-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const r = await fetch(`${B}/connect`);
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.match(html, /Locked out\? Which one is it\?/);
    assert.ok(html.includes('Your app forgot you'));
    assert.ok(html.includes('Connect again'));
    assert.ok(html.includes('lost your identity'));
    assert.match(html, /href="\/rejoin"/);
    assert.ok(html.includes('Keep your agent signed in'), 'the existing page text is still there');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});
