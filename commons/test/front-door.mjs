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

// The link audit (Geoffrey, 2026-11-10: "a lot of buttons that don't go where they're supposed to go"). For each page:
// every same-site link answers, every #anchor names a section that exists, and only a logo or "Home" points at "/".
const anchorsOf = (page) => [...page.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ href: (m[1].match(/href="([^"]*)"/) || [])[1], text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() })).filter((a) => a.href);
for (const [label, url, headers] of [['the homepage', '/', COHABI], ['the Commons page', '/commons', {}], ['the coin page', '/cohabi', {}], ['sign-in', '/signin', {}]]) {
  test(`link audit: ${label}`, async () => {
    const page = await (await fetch(B + url, { headers })).text();
    const ids = new Set([...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const a of anchorsOf(page)) {
      if (a.href.startsWith('#')) { assert.ok(a.href === '#' ? false : ids.has(a.href.slice(1)), `${label}: "${a.text}" points at ${a.href}, which isn't on the page`); continue; }
      if (a.href === '/') { assert.match(a.text, /^(COHABI|THE COMMONS|Home|Headquarters)$/i, `${label}: "${a.text}" goes to the top page`); continue; }
      if (!a.href.startsWith('/') || a.href.startsWith('//')) continue;
      const r = await fetch(B + a.href.split('#')[0], { headers, redirect: 'follow' });
      assert.ok(r.status < 400, `${label}: "${a.text}" -> ${a.href} answers ${r.status}`);
    }
  });
}

test('the coin link goes to the coin page; the Commons links go to the Commons page', () => {
  const links = anchorsOf(html);
  assert.ok(links.some((a) => /coin system/i.test(a.text) && a.href === '/cohabi'));
  assert.ok(links.some((a) => /Discover the Commons/.test(a.text) && a.href === '/commons'));
});

test('the Commons domain still opens Headquarters; the old Porch is kept, unlinked', async () => {
  assert.doesNotMatch(await (await fetch(`${B}/`)).text(), /Find your people/);
  assert.match(await (await fetch(`${B}/porch-classic`)).text(), /Welcome to the Porch/);
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });
