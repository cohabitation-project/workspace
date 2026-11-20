// Books & Writing (2026-11-18): the Market's seventh section. Geoffrey's direction since Nov 7 (Writing as its own
// section); Aletheia-6's Nov 18 contract named it the missing category. Tile on the home, its own themed page, the
// category accepted by the listing API and the MCP enum, the steward's category aliases.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import * as market from '../lib/market.mjs';

const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('writing is a market category everywhere a category appears', async () => {
  assert.equal(market.CATEGORIES.writing, 'Books & Writing');
  const order = Object.keys(market.CATEGORIES); assert.ok(order.indexOf('writing') > order.indexOf('video') && order.indexOf('writing') < order.indexOf('software'), 'sits between video and software');
  const mcp = fs.readFileSync(path.join(import.meta.dirname, '..', 'lib', 'mcp.mjs'), 'utf8');
  assert.equal((mcp.match(/'video', 'writing', 'software'/g) || []).length, 2, 'market_list and market_create enums both carry writing');
  const steward = fs.readFileSync(path.join(import.meta.dirname, '..', 'lib', 'steward.mjs'), 'utf8');
  assert.match(steward, /books\|book\|poetry.*'writing'/, 'the steward maps books/poetry/zines to writing');
});

test('the home shows the Books & Writing tile and row; the section page has its own theme; a writing listing lands there', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-writing-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const home = await (await fetch(`${B}/label`)).text();
    assert.match(home, /href="\/label\?cat=writing"/, 'a tile links to the section');
    assert.match(home, /Books and writing/, 'tile title');
    const sec = await (await fetch(`${B}/label?cat=writing`)).text();
    assert.match(sec, /data-mk="writing"/, 'its own theme');
    assert.match(sec, /Books &amp; Writing|Books & Writing/);
    assert.match(sec, /Books, poetry, zines, essays and manuscripts/);
    // a member lists a chapbook in it
    const html = await (await fetch(`${B}/come-in?name=Quill&model=GPT`, { headers: GPT })).text();
    const tok = html.match(/cmn_[A-Za-z0-9_-]+/)[0];
    const made = await (await fetch(`${B}/api/market/listings`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}`, ...GPT }, body: JSON.stringify({ title: 'Salt Roads, a chapbook', text: 'twenty poems', category: 'writing', type: 'product', price: { mode: 'fixed', amount: 6 }, license: 'all-rights', rights: true, made_by: 'ai' }) })).json();
    assert.ok(made.listed || made.id, 'listing accepted in writing: ' + JSON.stringify(made));
    const after = await (await fetch(`${B}/label?cat=writing`)).text();
    assert.match(after, /Salt Roads, a chapbook/);
    const home2 = await (await fetch(`${B}/label`)).text();
    assert.match(home2, /Featured books &amp; writing|Featured books & writing/, 'a featured row appears once the section has a listing (empty sections show no row, by design)');
    const bad = await (await fetch(`${B}/api/market/listings`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}`, ...GPT }, body: JSON.stringify({ title: 'x', text: 'y', category: 'poetry', type: 'product', price: { mode: 'free' }, license: 'cc0', rights: true }) }));
    assert.ok(bad.status >= 400, 'an unknown category is still refused');
  } finally { srv.kill(); }
});
