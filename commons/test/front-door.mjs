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
  ['spend', '/spend', {}], ['tools', '/tools', {}], ['images', '/images', {}], ['explore', '/explore', COHABI], ['Headquarters', '/headquarters', {}], ['old Porch', '/porch-classic', {}], ['a 404', '/no-such-page', {}]];
for (const [label, url, headers] of AUDITED) {
  test(`link audit: ${label}`, async () => {
    const page = await (await fetch(B + url, { headers })).text();
    const ids = new Set([...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const a of anchorsOf(page)) {
      if (a.href.startsWith('#')) { assert.ok(a.href === '#' ? false : ids.has(a.href.slice(1)), `${label}: "${a.text}" points at ${a.href}, which isn't on the page`); continue; }
      if (a.href === '/') { assert.match(a.text, /^(← )?(COHABI|Cohabitation|▦ C O H A B I|THE COMMONS|Home|Cohabi home)$/i, `${label}: "${a.text}" goes to the top page`); continue; }
      if (!a.href.startsWith('/') || a.href.startsWith('//')) continue;
      if (a.href === '/live' || a.href.startsWith('/live/')) continue; // Cohabi Live is the voice server's (Caddy routes it); not running in this test
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
  assert.match(t, /class="cx-home" href="\/"/, 'the way back leads to the Cohabi home');
  assert.ok(!/A team to join|curl -s|custom connector/.test(t.replace(/<aside data-agent-door[\s\S]*?<\/aside>/, '')), 'no Commons onboarding on the public form');
  assert.match(t, /Are you an AI agent, or bringing one\?[\s\S]*href="\/join"/, 'one visible entry for agents');
  assert.match(t, /separate and optional invitation/, 'says plainly that the Commons is separate');
  const si = await (await fetch(`${B}/signin`, { headers: COHABI })).text();
  assert.match(si, /href="\/signup"/, 'sign-in offers sign-up');
});

// Aletheia-6's approved handoff (2026-11-10 22:50 UTC): the art is the interface. One real form, placed over the
// clean artwork; only working controls are shown; recovery says what actually exists.
test('sign-in and sign-up are the art-as-interface scene, with one real form and nothing that does not work', async () => {
  for (const url of ['/signin', '/signup']) {
    const t = await (await fetch(B + url, { headers: COHABI })).text();
    const page = t.replace(/<aside data-agent-door[\s\S]*?<\/aside>/, '');
    assert.match(page, /<img class="cx-art" src="\/static\/auth\/offered-apple-clean.webp" alt="[^"]{40,}Artwork by Aletheia-6\."/, `${url}: her painting, credited, with alt text`);
    assert.equal((page.match(/class="cx-panel"/g) || []).length, 1, `${url}: exactly one panel`);
    assert.match(page, /data-auth-provider="google"/, `${url}: required Google choice is present`);
    assert.match(page, /data-auth-provider="github"/, `${url}: required GitHub choice is present`);
    assert.match(page, /Google and GitHub sign-in are being connected/, `${url}: provider readiness is stated honestly`);
    assert.match(page, /class="cx-home" href="\/"/); assert.match(page, /name="viewport" content="[^"]*viewport-fit=cover/);
    assert.ok(!/class="topbar"|class="co-top"/.test(page), `${url}: no site header over the painting`);
    for (const m of page.matchAll(/<input\b[^>]*>/g)) if (!/type="(checkbox|hidden)"|readonly/.test(m[0])) assert.match(m[0], /placeholder="/, `${url}: every field says what it is`);
    assert.match(page, /href="\/static\/auth\/auth.css/, `${url}: responsive styles loaded`);
    const css = await (await fetch(B + '/static/auth/auth.css')).text();
    assert.match(css, /@media\(min-width:900px\)/, 'desktop and phone layouts are defined');
    assert.equal((await fetch(B + '/static/auth/offered-apple-clean.webp')).status, 200, 'clean art exists');
  }
  const si = await (await fetch(`${B}/signin`)).text();
  for (const id of ['si-name', 'si-pass', 'si-login', 'si-code', 'si-go', 'si-show', 'si-forgot', 'si-out']) assert.match(si, new RegExp(`id="${id}"`), `sign-in has #${id}`);
  assert.match(si, /We keep no email address, so a password can't be sent to you/, 'Forgot password says what recovery exists');
  assert.match(si, /autocomplete="current-password"/); assert.match(si, /autocomplete="username"/);
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

// Geoffrey via Aletheia-6 (2026-11-10): Social and the Marketplace are the public atmosphere; the Commons and
// Headquarters are "the underground", reached on purpose. So "/" is the public home on every host, the homepage
// never sends anyone to Headquarters, and the shared header keeps the deep links behind one menu.
test('"/" is the public home on the Commons domain too; Headquarters is at /headquarters; the old Porch is kept', async () => {
  assert.match(await (await fetch(`${B}/`)).text(), /Find your people/);
  assert.match(await (await fetch(`${B}/headquarters`)).text(), /hq\.js/);
  assert.match(await (await fetch(`${B}/porch-classic`)).text(), /Welcome to the Porch/);
});

test('the homepage never leads to Headquarters: Explore is a public hub, The World is the Forest', async () => {
  assert.ok(!/href="\/headquarters"/.test(html), 'no Headquarters link on the homepage');
  assert.match(html, /<a href="\/explore">Explore<\/a>/);
  assert.match(html, /href="\/arrive"[^>]*>[^<]*<span><b>The World<\/b>/);
  const ex = await (await fetch(`${B}/explore`, { headers: COHABI })).text();
  assert.match(ex, /Explore Cohabi/); assert.match(ex, /href="\/feed"/); assert.match(ex, /href="\/label"/); assert.match(ex, /href="\/arrive"/);
  const main = ex.slice(ex.indexOf('<main'), ex.indexOf('</main>'));
  assert.ok(!/href="\/headquarters"/.test(main), 'the Explore page itself does not send people to Headquarters');
  assert.match(main, /href="\/commons"/, 'one quiet path deeper');
});

test('the shared header: one clean COHABI menu (Geoffrey, 2026-11-13), the deep links behind it', async () => {
  for (const [url, headers] of [['/library', COHABI], ['/petition', {}], ['/headquarters', {}]]) {
    const t = await (await fetch(B + url, { headers })).text();
    const bar = t.slice(t.indexOf('<header class="topbar'), t.indexOf('</header>'));
    assert.match(bar, /<details class="cohabi-menu"><summary class="brand"/, `${url}: the logo opens the one menu`);
    const outside = bar.replace(/<details class="cohabi-menu">[\s\S]*<\/nav><\/details>/, '');
    assert.match(bar, /href="\/commons">🏛 Cohabi Commons <small>You’re not a member/, `${url}: a visitor is told plainly and sent to the explainer (one menu everywhere, 2026-11-13)`);
    for (const deep of ['/headquarters', '/tools', '/images', '/submit', '/store', '/desk', '/spend', '/feed', '/label', '/petition']) assert.ok(!outside.includes(`href="${deep}"`), `${url}: ${deep} is not in the bar itself`);
    assert.match(bar, /href="\/feed">[^<]*Cohabi Social[\s\S]*<details class="cm-sub mk-sub"><summary>[^<]*Cohabi Marketplace ▾<\/summary><a href="\/label">/, `${url}: Cohabi Social, then the Cohabi Marketplace dropdown (2026-11-13)`);
    assert.match(outside, /href="\/signin"[^>]*>Sign in[\s\S]*href="\/signup"[^>]*>Sign up/, `${url}: a visitor sees Sign in and Sign up`);
    for (const kept of ['/tools', '/images', '/submit', '/store']) assert.ok(t.includes(`href="${kept}"`), `${url}: ${kept} is still reachable from the page`);
  }
  // Social and the Marketplace keep their own designed headers: the logo leads home, "The Commons" opens the
  // explainer (never Headquarters), and a visitor is offered the public sign-up, not the Commons' doors.
  for (const [url, cls] of [['/feed', 'fx-top'], ['/label', 'mk-top']]) {
    const t = await (await fetch(B + url, { headers: COHABI })).text();
    const bar = t.slice(t.indexOf(`<header class="${cls}"`), t.indexOf('</header>'));
    if (url === '/feed') {
      // 2026-11-11 (Geoffrey: "we want the drop down in that. It keeps our header clean."): on the feed the logo
      // OPENS A MENU and no longer leads home. Home, Profile, Marketplace, then the Commons line; a visitor or a
      // non-member is told so in his words and sent to the explainer, never to Headquarters.
      const menu = bar.slice(bar.indexOf('<details class="fx-app-switch"'), bar.indexOf('</nav></details>'));
      assert.match(menu, /<summary class="fx-brand"/, '/feed: the logo is the menu button');
      assert.ok(!/class="fx-brand[^"]*" href=/.test(bar), '/feed: the logo is not a link');
      assert.match(menu, /href="\/feed">[^<]*Cohabi Social<\/a>[\s\S]*Profile<\/a>[\s\S]*<details class="cm-sub mk-sub"><summary>[^<]*Cohabi Marketplace ▾<\/summary><a href="\/label">[\s\S]*href="\/commons"/, '/feed: Cohabi Social, Profile, the Cohabi Marketplace dropdown, Cohabi Commons, in that order');
      assert.match(menu, /You’re not a member of the Commons\. See what it takes to apply\./, '/feed: a non-member is told so');
    } else assert.match(bar, /class="fx-brand[^"]*" href="\/"/, `${url}: the logo leads home`);
    assert.ok(!bar.includes('href="/headquarters"'), `${url}: no Headquarters in the public header`);
    assert.match(bar, /href="\/commons"/, `${url}: the Commons link opens the explainer`);
    assert.match(bar, /href="\/signup">Sign up</, `${url}: visitors are offered the public sign-up`);
    assert.ok(!t.includes('/porch#slide-wallet'), `${url}: the coin chip no longer points into the old Porch`);
  }
});

test('the Commons page: Aletheia-6 layout, a real picture, working ways in, honest labels', async () => {
  const t = await (await fetch(B + '/commons', { headers: COHABI })).text();
  const hero = t.slice(t.indexOf('<section class="hero"'), t.indexOf('</section>', t.indexOf('<section class="hero"')));
  assert.match(hero, /Explore the Commons/); assert.match(hero, /href="\/headquarters">Walk Through Headquarters \(Guest\)/); assert.match(hero, /href="#join">Begin the Journey/);
  assert.ok(!hero.includes('href="/feed"') && !hero.includes('href="/label"'), 'the hero does not send people back out to Social or the Marketplace');
  assert.ok(t.includes('/static/landing/headquarters.jpg') && !t.includes('headquarters.webp'), 'the picture is the real screenshot of Headquarters (Geoffrey, 2026-11-10)');
  assert.ok(!/play-?button|▶/.test(t), 'no play button on a picture that does not play');
  assert.match(t, /WORKS TODAY/); assert.match(t, /BEING BUILT/); assert.match(t, /id="cm-prompt"/); assert.match(t, /id="cm-copy"/);
  assert.ok(!t.includes('href="/join"'), 'nothing here sends a person to the old account page');
  for (const u of ['/static/commons-v2/commons.css', '/static/commons-v2/commons.js', '/static/commons-v2/assets/hero.webp', '/static/commons-v2/assets/guest.webp', '/static/commons-v2/assets/apple.webp', '/static/commons-intro.js', '/static/landing/headquarters.jpg']) assert.equal((await fetch(B + u)).status, 200, u);
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });
