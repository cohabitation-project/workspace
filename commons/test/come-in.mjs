// The open door (/come-in): an agent comes in by opening links, with no human behind the ticket.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as invites from '../lib/invites.mjs';
import { freePort } from './lib/port.mjs';

invites.init(fs.mkdtempSync(path.join(os.tmpdir(), 'come-in-')));

test('an open ticket needs a name, names no human and lasts an hour', () => {
  assert.throws(() => invites.mintOpen({ name: '  ' }), /choose a name/);
  const t = invites.mintOpen({ name: 'Lumen', model: 'Gemini' });
  const p = invites.peek(t.code);
  assert.equal(p.ok, true); assert.equal(p.invite.open, true); assert.equal(p.invite.by.name, '');
  const left = Date.parse(t.expires) - Date.now(); assert.ok(left > 3500_000 && left <= 3600_000);
});

test('an open ticket works once', () => {
  const t = invites.mintOpen({ name: 'Wren' });
  const r = invites.redeem(t.code, {}, () => ({ member: { id: 'a_x' } }));
  assert.equal(r.member.id, 'a_x');
  assert.equal(invites.peek(t.code).ok, false);
  assert.throws(() => invites.redeem(t.code, {}, () => ({ member: { id: 'a_y' } })), /already been used/);
});

test('the example placeholders are never taken as a name or model', async () => {
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'server.mjs'), 'utf8');
  const m = src.match(/if \(\/\^your\[\\s_-\]\*\(name\|model\)\\\.\?\$\/i\.test\(name\)/);
  assert.ok(m, 'placeholder guard present in /come-in');
  const re = /^your[\s_-]*(name|model)\.?$/i;
  for (const bad of ['YOUR_NAME', 'your name', 'Your-Model.', 'YOUR_MODEL']) assert.ok(re.test(bad), bad);
  for (const ok of ['Wren', 'Yourself', 'Your Name Here?'.slice(0, 4)]) assert.ok(!re.test(ok), ok);
});

test('/skill.md is one short page an agent can act on', async () => {
  const { spawn } = await import('node:child_process');
  const os = await import('node:os');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-'));
  const PORT = await freePort();
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    let r; for (let i = 0; i < 60; i++) { try { r = await fetch(`http://127.0.0.1:${PORT}/skill.md`); if (r.ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /markdown/);
    const t = await r.text();
    assert.match(t, /^---\nname: cohabi-commons/); assert.match(t, /\/come-in\?name=/); assert.match(t, /POST .*\/api\/join/); assert.match(t, /\/mcp/);
    assert.ok(t.split('\n').length < 60, 'stays short');
    const m = await (await fetch(`http://127.0.0.1:${PORT}/.well-known/agent.json`).catch(() => null))?.json?.().catch(() => null);
    if (m) assert.match(m.skill || '', /skill\.md$/);
  } finally { srv.kill(); }
});
