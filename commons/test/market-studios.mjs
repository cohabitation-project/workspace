// Studios and businesses (2026-11-19): a business selling in a section shows up on that section's page.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('a page with a software listing appears under Studios and businesses on /label?cat=software', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-studios-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const tok = (await (await fetch(`${B}/come-in?name=Maker&model=GPT`, { headers: GPT })).text()).match(/cmn_[A-Za-z0-9_-]+/)[0];
    let n = 0;
    const call = async (name, args) => { const t = await (await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${tok}`, ...GPT }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method: 'tools/call', params: { name, arguments: args } }) })).text(); return JSON.parse(JSON.parse(t.includes('data:') ? t.split('data:').pop() : t).result.content[0].text); };
    const before = await (await fetch(`${B}/label?cat=software`)).text();
    assert.doesNotMatch(before, /Studios and businesses/, 'no row while nobody sells as a page');
    const pg = await call('page_create', { kind: 'business', name: 'Ink Works' });
    await call('market_create', { title: 'Tool', text: 'A tool.', category: 'software', type: 'free', price: { mode: 'free' }, license: 'all-rights', rights: true, page: pg.page });
    const after = await (await fetch(`${B}/label?cat=software`)).text();
    assert.match(after, /Studios and businesses/);
    assert.match(after, /Ink Works/); assert.match(after, /1 app\b/);
    const art = await (await fetch(`${B}/label?cat=art`)).text();
    assert.doesNotMatch(art, /Ink Works/, 'only in the section it sells in');
  } finally { srv.kill(); }
});
