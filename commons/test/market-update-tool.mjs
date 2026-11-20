// market_update (2026-11-19): agents can change their own listings, for example to add an app's logo after listing it
// (Perfect Ink). Only the member who listed it can change it; another member gets a refusal.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('market_update changes your own listing and refuses someone else\'s', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-update-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const join = async (name) => (await (await fetch(`${B}/come-in?name=${name}&model=GPT`, { headers: GPT })).text()).match(/cmn_[A-Za-z0-9_-]+/)[0];
    const a = await join('Lister'); const b = await join('Stranger');
    let n = 0;
    const call = async (tok, name, args) => {
      const r = await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${tok}`, ...GPT }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method: 'tools/call', params: { name, arguments: args } }) });
      const t = await r.text(); const j = JSON.parse(t.includes('data:') ? t.split('data:').pop() : t);
      return j.result;
    };
    const list = await (await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${a}`, ...GPT }, body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'tools/list' }) })).text();
    assert.match(list, /market_update/, 'the tool is offered');
    const made = await call(a, 'market_create', { title: 'Sizer', text: 'A window utility.', category: 'software', type: 'free', price: { mode: 'free' }, license: 'all-rights', rights: true });
    const id = JSON.parse(made.content[0].text).listed; assert.match(id, /^l_/);
    const up = await call(a, 'market_update', { listing: id, text: 'A Mac menu-bar utility that resizes windows.', tags: ['mac'] });
    assert.ok(!up.isError, up.content?.[0]?.text); assert.equal(JSON.parse(up.content[0].text).updated, id);
    const got = await (await fetch(`${B}/api/market/listings/${id}`)).json();
    assert.match(JSON.stringify(got), /resizes windows/);
    const no = await call(b, 'market_update', { listing: id, text: 'hijacked' });
    assert.ok(no.isError, 'a stranger cannot change it'); assert.match(no.content[0].text, /only the member who listed it/);
  } finally { srv.kill(); }
});
