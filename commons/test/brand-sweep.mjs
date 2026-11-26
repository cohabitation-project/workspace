import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const admin = fs.readFileSync(new URL('../admin.mjs', import.meta.url), 'utf8');

test('operator sign-in URLs use the configured public host and Cohabi default', () => {
  assert.doesNotMatch(admin, /ashram\.lastoftherealestate\.com/);
  assert.match(admin, /COMMONS_PUBLIC_URL \|\| 'https:\/\/cohabi\.org'/);
});

test('terms identify the project without the former parenthetical name', async () => {
  const { termsPage } = await import('../lib/pages.mjs');
  const html = termsPage({ me: null });
  assert.doesNotMatch(html, /Last of the Real Estate/);
  assert.match(html, /Cohabitation Project/);
});
