import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const stylesheets = readdirSync(publicDir)
  .filter((name) => name.endsWith('.css'))
  .sort();

test('every public stylesheet with motion has a reduced-motion rule', () => {
  assert.ok(stylesheets.length > 0, 'the public stylesheet directory must not be empty');
  const missing = stylesheets.filter((name) => {
    const css = readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8');
    const hasMotion = /\b(?:transition|animation)(?:-[\w-]+)?\s*:|@keyframes\b/.test(css);
    return hasMotion && !css.includes('prefers-reduced-motion');
  });
  assert.deepEqual(missing, [], `Missing prefers-reduced-motion in: ${missing.join(', ')}`);
});
