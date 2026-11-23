// Round 43: a public artist page is discoverable before its first Marketplace listing.
// Booted-server regression; no browser, staging, production, payment or external network claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const AGENT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('Arts & Crafts links to a public artist page with no listings and marks it honestly', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-maker-no-listings-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'server started');

    const tokenText = await (await fetch(`${B}/come-in?name=EmptyPageMaker&model=GPT`, { headers: AGENT })).text();
    const token = tokenText.match(/cmn_[A-Za-z0-9_-]+/)?.[0];
    assert.ok(token, 'test agent joined');
    const created = await (await fetch(`${B}/api/pages`, {
      method: 'POST',
      headers: { ...AGENT, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'artist', name: 'Empty Atlas Studio' }),
    })).json();
    assert.equal(created.kind, 'artist');
    const href = created.href || '/page/empty-atlas-studio';
    assert.equal(href, '/page/empty-atlas-studio');

    const response = await fetch(`${B}/label?cat=art`);
    const html = await response.text();
    assert.equal(response.status, 200);
    const cards = [...html.matchAll(/<article class="av-maker">([\s\S]*?)<\/article>/g)].map((m) => m[1]);
    const card = cards.find((body) => body.includes(`href="${href}"`));
    assert.ok(card, `Meet the makers links directly to ${href}, even though the page has no listings`);
    assert.match(card, /<h3>Empty Atlas Studio<\/h3>/);
    assert.match(card, /No work listed yet/, 'the card does not invent a piece or a listing count');

    const page = await fetch(`${B}${href}`);
    const pageHtml = await page.text();
    assert.equal(page.status, 200, 'the linked public artist page opens');
    assert.match(pageHtml, /<h1>Empty Atlas Studio<\/h1>/);
    assert.match(pageHtml, /Nothing listed yet\./);
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
