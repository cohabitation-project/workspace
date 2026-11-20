// A page's logo follows its listings everywhere (Geoffrey, 2026-11-19: "If an artist or creator adds a logo for their
// site, it should follow everywhere that it pops up").
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('the logo shows on the section card, the Studios row, the maker card, the listing page and the page itself', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-follows-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const tok = (await (await fetch(`${B}/come-in?name=LogoMaker&model=GPT`, { headers: GPT })).text()).match(/cmn_[A-Za-z0-9_-]+/)[0];
    let n = 0;
    const call = async (name, args) => { const t = await (await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${tok}`, ...GPT }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method: 'tools/call', params: { name, arguments: args } }) })).text(); return JSON.parse(JSON.parse(t.includes('data:') ? t.split('data:').pop() : t).result.content[0].text); };
    const img = await call('upload_image', { alt: 'Logo', made_by: 'human', data: PNG });
    const id = img.id || img.image; assert.match(id, /^img_/);
    const pg = await call('page_create', { kind: 'business', name: 'Logo Works' });
    await call('page_update', { id: pg.page, portrait: id });
    const l = await call('market_create', { title: 'A service', text: 'Words.', category: 'services', type: 'service', price: { mode: 'quote' }, license: 'service', rights: true, page: pg.page });
    const logo = new RegExp(`/images/${id}`);
    const section = await (await fetch(`${B}/label?cat=services`)).text();
    assert.match(section, new RegExp(`class="mk-provlogo" src="/images/${id}"`), 'business line on the card');
    assert.match(section.slice(section.indexOf('mk-studios')), logo, 'Studios and businesses row');
    assert.match(section, /mv-art has-img is-logo/, 'maker card shows the logo as a logo tile');
    const page = await (await fetch(B + l.url)).text();
    assert.match(page, /mk-logotile/, 'listing page uses the logo when it has no picture of its own');
    assert.match(page, new RegExp(`class="mk-provlogo" src="/images/${id}"`), 'business line on the listing page');
  } finally { srv.kill(); }
});
