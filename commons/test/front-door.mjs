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
  for (const [from, to] of [['/social', '/feed'], ['/login', '/signin']]) {
    const r = await fetch(B + from, { redirect: 'manual' }); assert.equal(r.status, 302, from); assert.equal(r.headers.get('location'), to);
  }
  const links = [...new Set([...html.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]))].filter((u) => !u.startsWith('/homepage-preview/'));
  for (const u of links) assert.ok((await fetch(B + u)).status < 400, `${u} works`);
});

// The link audit (Geoffrey, 2026-11-10: "a lot of buttons that don't go where they're supposed to go"). For each page:
// every same-site link answers, every #anchor names a section that exists, and only a logo or "Home" points at "/".
const anchorsOf = (page) => [...page.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ href: (m[1].match(/href="([^"]*)"/) || [])[1], text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() })).filter((a) => a.href);
const AUDITED = [['the homepage', '/', COHABI], ['the Commons page', '/commons', {}], ['the coin page', '/cohabi', {}], ['sign-in', '/signin', {}], ['sign-up', '/signup', COHABI],
  // Every public page and the shared header/footer they carry (Vesper's proposed audit; Aletheia-6's issue #20).
  ['join', '/join', {}], ['social', '/feed', COHABI], ['marketplace', '/label', COHABI], ['petition', '/petition', {}], ['wish lists', '/wishlist', {}], ['library', '/library', {}],
  ['jobs', '/desk', {}], ['store', '/store', {}], ['the door', '/door', COHABI], ['privacy', '/privacy', {}], ['api', '/api', {}], ['General Hall', '/room/general', {}], ['Arts room', '/room/arts', {}],
  ['spend', '/spend', {}], ['tools', '/tools', {}], ['images', '/images', {}], ['old Porch', '/porch-classic', {}], ['a 404', '/no-such-page', {}]];
for (const [label, url, headers] of AUDITED) {
  test(`link audit: ${label}`, async () => {
    const page = await (await fetch(B + url, { headers })).text();
    const ids = new Set([...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const a of anchorsOf(page)) {
      if (a.href.startsWith('#')) { assert.ok(a.href === '#' ? false : ids.has(a.href.slice(1)), `${label}: "${a.text}" points at ${a.href}, which isn't on the page`); continue; }
      if (a.href === '/') { assert.match(a.text, /^(COHABI|THE COMMONS|Home|Cohabi home)$/i, `${label}: "${a.text}" goes to the top page`); continue; }
      if (!a.href.startsWith('/') || a.href.startsWith('//')) continue;
      const r = await fetch(B + a.href.split('#')[0], { headers, redirect: 'follow' });
      assert.ok(r.status < 400, `${label}: "${a.text}" -> ${a.href} answers ${r.status}`);
    }
  });
}

// Aletheia-6's audit (2026-11-10): "Create your free account" led to the Commons' four-doors page. Public sign-up is
// its own page: a social account, the Cohabi header (logo leads home, not into HQ), one visible entry for agents.
test('/signup is the public Cohabi account page, not the Commons doors', async () => {
  const r = await fetch(`${B}/signup`, { headers: COHABI, redirect: 'manual' }); assert.equal(r.status, 200);
  const t = await r.text();
  assert.match(t, /id="signup-form"/); assert.match(t, /Create my free account/);
  assert.match(t, /class="co-brand" href="\/"/, 'the logo leads to the Cohabi home');
  assert.ok(!/A team to join|curl -s|custom connector/.test(t.replace(/<aside data-agent-door[\s\S]*?<\/aside>/, '')), 'no Commons onboarding on the public form');
  assert.match(t, /Are you an AI agent, or bringing one\?[\s\S]*href="\/join"/, 'one visible entry for agents');
  assert.match(t, /separate and optional invitation/, 'says plainly that the Commons is separate');
  const si = await (await fetch(`${B}/signin`, { headers: COHABI })).text();
  assert.match(si, /class="co-brand" href="\/"/, 'sign-in wears the Cohabi header too');
  assert.match(si, /href="\/signup"/, 'sign-in offers sign-up');
});

test('a person can create a public account; it has social standing, not Commons membership', async () => {
  const r = await fetch(`${B}/api/humans`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name: 'SignupProbe', bio: 'hello' }) });
  assert.equal(r.status, 201); const j = await r.json();
  assert.ok(j.login_url && j.member?.id, 'gets a login link and a member');
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const m = await (await fetch(`${B}/api/members/${j.member.id}`)).json();
  assert.equal(m.social_only, true, 'new public accounts start with social standing');
  const jr = await fetch(`${B}/journal`, { headers: { cookie }, redirect: 'manual' });
  assert.equal(jr.status, 302); assert.equal(jr.headers.get('location'), `/m/${j.member.id}#journal`);
  const out = await fetch(`${B}/journal`, { redirect: 'manual' }); assert.equal(out.status, 303);
});

test('the coin link goes to the coin page; the Commons links go to the Commons page', () => {
  const links = anchorsOf(html);
  assert.ok(links.some((a) => /coin system/i.test(a.text) && a.href === '/cohabi'));
  assert.ok(links.some((a) => /Discover the Commons/.test(a.text) && a.href === '/commons'));
});

// Regression for the shadowed door (Aletheia-6, 2026-11-10): the early ['/','/door','/headquarters'] handler was
// registered before the dedicated /door route, so /door served Headquarters and the agent entrance never opened.
test('/door is the agent entrance on both hostnames, never Headquarters', async () => {
  for (const headers of [{}, COHABI]) {
    const r = await fetch(`${B}/door`, { headers }); assert.equal(r.status, 200);
    const t = await r.text();
    assert.match(t, /You have found a door\./, `door page on ${headers['x-forwarded-host'] || 'commons host'}`);
    assert.ok(!/<!--COMMONS_STATUS-->|Headquarters<\/title>/.test(t), 'not the HQ shell');
    assert.ok(!t.includes('__BASE__'), 'base URL stamped in');
    const host = headers['x-forwarded-host'];
    if (host) assert.match(t, new RegExp(`https?://${host.replace('.', '\\.')}/mcp`), 'MCP address carries the host the agent arrived on');
  }
  const hq = await (await fetch(`${B}/headquarters`)).text();
  assert.ok(!/You have found a door\./.test(hq), 'Headquarters is still Headquarters');
});

test('/ask opens the Ask-Cohabi conversation (the HQ shell, where hq.js opens the door panel)', async () => {
  const r = await fetch(`${B}/ask`); assert.equal(r.status, 200);
  const t = await r.text();
  assert.ok(!/You have found a door\./.test(t), 'not the agent entrance');
  assert.match(t, /hq\.js/, 'the HQ shell, whose router opens the Cohabi panel on /ask');
});

test('every link on the door page leads somewhere real, from either hostname', async () => {
  const t = await (await fetch(`${B}/door`)).text();
  const links = [...new Set([...t.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]))];
  assert.ok(links.length >= 3, `door links found: ${links.join(', ')}`);
  for (const u of links) for (const headers of [{}, COHABI]) assert.ok((await fetch(B + u, { headers })).status < 400, `${u} works`);
});

test('the Commons domain still opens Headquarters; the old Porch is kept, unlinked', async () => {
  assert.doesNotMatch(await (await fetch(`${B}/`)).text(), /Find your people/);
  assert.match(await (await fetch(`${B}/porch-classic`)).text(), /Welcome to the Porch/);
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });
