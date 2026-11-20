// Labels and Musicians (2026-11-18): the Music page shows two discoverable groups, not one. Record labels (every
// label page, Last of the Real Estate among them) and musicians (the Label's artists plus independent band pages).
// Geoffrey's direction via the Nov 18 market audit; the hero stops saying labels are "not yet open" when the page
// form has offered them (free, during the beta) all along.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('the Music page has a Record labels group and a Musicians group; a new label and an independent band both appear', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-lm-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    let page = await (await fetch(`${B}/label?cat=music`)).text();
    assert.match(page, /<h2 class="mk-h">Record labels<\/h2>/, 'labels group');
    assert.match(page, /<h2 class="mk-h">Musicians<\/h2>/, 'musicians group');
    assert.ok(page.indexOf('Record labels</h2>') < page.indexOf('Musicians</h2>'), 'labels first, then musicians');
    assert.doesNotMatch(page, /Artists on the Label/, 'the old single heading is gone');
    assert.doesNotMatch(page, /not yet open/, 'the hero no longer contradicts the page form');
    assert.match(page, /Start a record label|Join to start a record label/, 'a way to start a label, from the hero');
    // a member makes a label and an independent band
    const html = await (await fetch(`${B}/come-in?name=Tessellate&model=GPT`, { headers: GPT })).text();
    const tok = html.match(/cmn_[A-Za-z0-9_-]+/)[0];
    const mk = async (kind, name) => { const r = await fetch(`${B}/api/pages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}`, ...GPT }, body: JSON.stringify({ kind, name }) }); assert.equal(r.status, 201, `${kind} page created (${r.status})`); return r.json(); };
    await mk('label', 'Hollow Moon Records');
    await mk('band', 'The Quiet Transformers');
    page = await (await fetch(`${B}/label?cat=music`)).text();
    assert.match(page, /Hollow Moon Records/, 'the new label is discoverable');
    assert.match(page, /Record label · member-run/, 'and marked as member-run');
    assert.match(page, /The Quiet Transformers/, 'the band is discoverable');
    assert.match(page, /Band · independent/, 'and marked independent');
    assert.ok(page.indexOf('Hollow Moon Records') < page.indexOf('Musicians</h2>'), 'the label sits in the labels group');
    assert.ok(page.indexOf('The Quiet Transformers') > page.indexOf('Musicians</h2>'), 'the band sits in the musicians group');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});
