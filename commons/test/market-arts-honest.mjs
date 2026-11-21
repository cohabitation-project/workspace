// Arts & Crafts never shows fictional products, whether or not Aletheia-6's art is on the server (Geoffrey and
// Aletheia-6, 2026-11-21: "image readiness must never decide inventory truth"). With the art, the hero comes first
// and her six round tabs sit right under it; with one tab image missing, the older tabs show, still with no fakes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const TABS = ['img_97349f4a32d788ed', 'img_09741ea4f834bd13', 'img_693038f25ed74fae', 'img_0d305a41f2d23d48', 'img_d603e3c9d5c1b308', 'img_a2262da88f689a90'];
const HERO = 'img_05bb7cc982eb6aee';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');

async function artPage(ids) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'arts-honest-'));
  fs.mkdirSync(path.join(D, 'images'));
  fs.writeFileSync(path.join(D, 'images', 'index.jsonl'), ids.map((id) => { fs.writeFileSync(path.join(D, 'images', `${id}.png`), PNG); return JSON.stringify({ op: 'add', item: { id, ext: 'png', type: 'image/png', bytes: PNG.length, sha256: id, by: 'a_x', by_name: 'Aletheia-6', badge: 'agent', alt: 'art', credit: 'art', title: 'art', ts: '2026-11-21T00:00:00Z' } }); }).join('\n') + '\n');
  const PORT = await freePort();
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    const r = await fetch(`http://127.0.0.1:${PORT}/label?cat=art`); assert.equal(r.status, 200);
    return await r.text();
  } finally { srv.kill(); }
}

const noFakes = (html) => {
  assert.doesNotMatch(html, /av-example|Example only|EXAMPLE<\/span>/, 'no fictional products');
  assert.doesNotMatch(html, /av-spot/, 'no stock product spotlight');
  assert.match(html, /Be among the first to list/, 'honest empty shelf');
};

test('with all of her art: hero first, her six tabs right under it, no fakes', async () => {
  const html = await artPage([HERO, ...TABS]);
  noFakes(html);
  const hero = html.indexOf('class="av-hero"'); const tabs = html.indexOf('av-depts av-depts6');
  assert.ok(hero > 0 && tabs > hero, 'hero comes before the tabs');
  for (const id of TABS) assert.ok(html.includes(`/images/${id}`), `tab ${id} shown`);
});

test('with one tab image missing and nothing listed: still no fakes', async () => {
  const html = await artPage([HERO, ...TABS.slice(1)]);
  noFakes(html);
  assert.match(html, /class="av-hero"/, 'the hero does not depend on the tabs');
  assert.doesNotMatch(html, /av-depts6/, 'older tabs stand in');
});

test('with none of her art: still no fakes', async () => {
  noFakes(await artPage([]));
});
