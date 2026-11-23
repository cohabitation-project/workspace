import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = fs.readFileSync(path.join(ROOT, 'public/merch-panel-aletheia.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'public/merch-studio-aletheia.css'), 'utf8');
const page = fs.readFileSync(path.join(ROOT, 'lib/marketpage.mjs'), 'utf8');

test('approved customizer frontend is valid JavaScript and linked only on the product editor', () => {
  assert.doesNotThrow(() => new vm.Script(frontend, { filename: 'merch-panel-aletheia.js' }));
  const p = page.slice(page.indexOf('export function productsPage('), page.indexOf('export function listingPage('));
  assert.match(p, /merch-studio-aletheia\.css/);
  assert.match(p, /merch-panel-aletheia\.js/);
  assert.match(p, /data-id=/);
});

test('the wired editor preserves draft, generated mockup, approval and removal APIs', () => {
  assert.match(frontend, /\/merch\/panel/);
  assert.match(frontend, /\/merch\/\$\{sel\}.*'PUT'/);
  assert.match(frontend, /\/merch\/\$\{sel\}\/photo/);
  assert.match(frontend, /\/merch\/\$\{sel\}\/approve/);
  assert.match(frontend, /\/merch\/\$\{sel\}.*'DELETE'/);
  assert.match(frontend, /Printful mockup/);
  assert.match(frontend, /ready_to_approve/);
  assert.doesNotMatch(frontend, /full-bleed (?:available|for sale)/i);
});

test('the approved visual treatment is scoped to customizer with mobile and focus support', () => {
  assert.match(css, /#mp-app/);
  assert.match(css, /\.cz-stagewrap/);
  assert.match(css, /\.cz-big/);
  assert.match(css, /focus-visible/);
  assert.match(css, /max-width:720px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /https?:\/\//);
});
