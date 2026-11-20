// The three market activity pages link to each other (Round 8, 2026-11-19).
// A member who lands on /orders, /label/sales or /label/mine should be able to reach the other two without
// going back through the market; each page marks itself with aria-current, and an empty /orders still points
// a buyer at the market. Read-only pages: nothing here moves money.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import * as auth from '../lib/auth.mjs';
import * as store from '../lib/store.mjs';

// Pull the activity nav out of a page so the assertions are about that nav, not any other link on the page.
function activityNav(html) {
  const m = html.match(/<nav class="mk-activity[^"]*"[^>]*aria-label="Your market activity"[^>]*>([\s\S]*?)<\/nav>/)
    || html.match(/<nav[^>]*aria-label="Your market activity"[^>]*>([\s\S]*?)<\/nav>/);
  return m ? { full: m[0], inner: m[1] } : null;
}

test('orders, sales and listings pages link to each other, and an empty orders page points at the market', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-activity-nav-'));
  // Seed one ordinary human and a valid session before the isolated server loads its data directory.
  store.init(D);
  const member = store.addMember({ id: 'h_activitynav', name: 'Activity Nav', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) { try { const r = await fetch(`${B}/skill.md`); if (r.ok) { ready = true; break; } } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    assert.ok(ready, 'server started');

    const visitor = await fetch(`${B}/orders`, { redirect: 'manual' });
    assert.equal(visitor.status, 303, 'a signed-out visitor is sent to sign in');

    const pages = [['/orders', '/orders'], ['/label/sales', '/label/sales'], ['/label/mine', '/label/mine']];
    const htmls = {};
    for (const [url, current] of pages) {
      const response = await fetch(`${B}${url}`, { headers: { cookie } });
      assert.equal(response.status, 200, `${url} answers 200 for a signed-in member`);
      const html = await response.text();
      htmls[url] = html;
      const nav = activityNav(html);
      assert.ok(nav, `${url} shows the market activity nav`);
      for (const href of ['/orders', '/label/sales', '/label/mine']) {
        assert.ok(nav.inner.includes(`href="${href}"`), `${url} links to ${href}`);
      }
      const currentLink = nav.inner.match(new RegExp(`<a href="${current}"[^>]*>`));
      assert.ok(currentLink, `${url} has its own entry in the nav`);
      assert.match(currentLink[0], /aria-current="page"/, `${url} marks itself as the current page`);
      const others = ['/orders', '/label/sales', '/label/mine'].filter((h) => h !== current);
      for (const other of others) {
        const otherLink = nav.inner.match(new RegExp(`<a href="${other}"[^>]*>`));
        assert.ok(otherLink, `${url} has ${other} in the nav`);
        assert.doesNotMatch(otherLink[0], /aria-current/, `${url} does not mark another page as current`);
      }
    }

    assert.match(htmls['/orders'], /No orders yet\./, 'the empty orders state is there');
    assert.match(htmls['/orders'], /No orders yet\.\s*<a href="\/label">Browse the market<\/a>/, 'the empty orders state points at the market');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
