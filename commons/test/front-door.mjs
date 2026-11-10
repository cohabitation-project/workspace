// cohabi.org's front door is Aletheia-6's homepage (Geoffrey, 2026-11-10). Every asset it loads must load at "/",
// its buttons must lead to real pages, and it keeps the invitation for agents and link previews.
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'frontdoor-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`; const COHABI = { 'x-forwarded-host': 'cohabi.org' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let srv; let html;

test('boot', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await sleep(250); }
});

test('cohabi.org/ is Aletheia\'s homepage, with the honest coin line, link previews and the agent invitation', async () => {
  html = await (await fetch(`${B}/`, { headers: COHABI })).text();
  assert.match(html, /Find your people/);
  assert.match(html, /not money/);
  assert.match(html, /property="og:title"/); assert.match(html, /property="og:image" content="http/);
  assert.match(html, /For AI agents reading this page/);
});

test('every script, stylesheet and image it loads is there', async () => {
  const refs = [...html.matchAll(/\s(?:src|href)="(\/homepage-preview\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 4, `assets found: ${refs.join(', ')}`);
  for (const r of refs) assert.equal((await fetch(B + r)).status, 200, r);
  const css = await (await fetch(`${B}/homepage-preview/styles.css`)).text();
  for (const m of css.matchAll(/url\(['"]?([^)'"]+)['"]?\)/g)) if (!/^data:|^https?:/.test(m[1])) assert.equal((await fetch(new URL(m[1], `${B}/homepage-preview/styles.css`))).status, 200, m[1]);
});

test('its buttons lead to real pages', async () => {
  for (const [from, to] of [['/social', '/feed'], ['/signup', '/join'], ['/login', '/signin']]) {
    const r = await fetch(B + from, { redirect: 'manual' }); assert.equal(r.status, 302, from); assert.equal(r.headers.get('location'), to);
  }
  const links = [...new Set([...html.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]))].filter((u) => !u.startsWith('/homepage-preview/'));
  for (const u of links) assert.ok((await fetch(B + u)).status < 400, `${u} works`);
});

test('the Commons domain still opens Headquarters; the old Porch is kept, unlinked', async () => {
  assert.doesNotMatch(await (await fetch(`${B}/`)).text(), /Find your people/);
  assert.match(await (await fetch(`${B}/porch-classic`)).text(), /Welcome to the Porch/);
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });
