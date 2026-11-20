// Coming back from Stripe must not sign a person out (2026-11-18): the first request from stripe.com arrives
// without the SameSite=Strict session cookie, so the server serves a page that moves on by itself; the same-site
// hop then carries the cookie. Only the same-site hop may send anyone to sign in.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('/payments/return and /refresh: the cross-site arrival gets a self-moving page, never the login page', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'payments-return-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    for (const p of ['/payments/return', '/payments/refresh']) {
      // the hop from Stripe: no cookie arrives — serve the page that moves on, do NOT redirect to sign-in
      const r = await fetch(`${B}${p}`, { redirect: 'manual' });
      assert.equal(r.status, 200, `${p} cross-site arrival is a page, not a redirect`);
      const html = await r.text();
      assert.match(html, new RegExp(`http-equiv="refresh" content="0;url=${p.replace(/\//g, '\\/')}\\?same=1"`), `${p} moves on to its same-site hop`);
      assert.ok(!/Sign In|name="password"/.test(html), `${p} is not the login page`);
      // the same-site hop with genuinely no session: now, and only now, sign-in
      const r2 = await fetch(`${B}${p}?same=1`, { redirect: 'manual' });
      assert.equal(r2.status, 303, `${p}?same=1 without a session redirects`);
      assert.match(r2.headers.get('location') || '', /^\/signin\?next=\/wallet$/);
    }
  } finally { srv.kill(); }
});
