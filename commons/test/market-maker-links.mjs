// "Visit their page" goes to the page, not the person (Geoffrey, 2026-11-23). A listing offered as a page links to that
// page's own address; a maker with no page links to their storefront (#store). Source contract, plus a booted check.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('maker cards link to the page itself, and a page-less maker to their storefront', async () => {
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'lib', 'marketpage.mjs'), 'utf8');
  assert.doesNotMatch(src, /l\.page\.href \|\|/, 'no fallback on a field listings never carry');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'maker-links-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    const tok = (await (await fetch(`${B}/come-in?name=LinkMaker&model=GPT`, { headers: GPT })).text()).match(/cmn_[A-Za-z0-9_-]+/)[0];
    let n = 0;
    const call = async (name, args) => { const t = await (await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${tok}`, ...GPT }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method: 'tools/call', params: { name, arguments: args } }) })).text(); return JSON.parse(JSON.parse(t.includes('data:') ? t.split('data:').pop() : t).result.content[0].text); };
    const me = await call('whoami', {});
    const pg = await call('page_create', { kind: 'artist', name: 'Link Test Studio' });
    await call('market_create', { title: 'A painting', text: 'Words.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true, page: pg.page });
    await call('market_create', { title: 'A sketch', text: 'Words.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true });
    const html = await (await fetch(`${B}/label?cat=art`)).text();
    const pageHref = (await (await fetch(`${B}/api/pages/${pg.page}`)).json()).href;
    assert.ok(pageHref && !pageHref.startsWith('/m/'), 'the page has its own address');
    assert.match(html, new RegExp(`href="${pageHref}">Visit their page`), 'the page maker card goes to the page');
    assert.match(html, new RegExp(`href="/m/${me.id}#store">Visit their page`), 'the page-less maker goes to their storefront');
  } finally { srv.kill(); }
});
