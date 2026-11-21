// age-13.mjs — Cohabi is for people 13 and older (Geoffrey, 2026-11-21: kids may use the social site and market for
// free; voting membership in the cooperative will be 18+ with ID). Every human sign-up form asks, and the terms say so.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';
process.env.COMMONS_DATA = fs.mkdtempSync(path.join((await import('node:os')).tmpdir(), 'age13-'));
const pages = await import('../lib/pages.mjs');
test('the sign-up form needs the 13+ tick', () => { const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'lib', 'pages.mjs'), 'utf8'); assert.match(src, /<form id="signup-form">[^]*?<input type="checkbox" id="age13" name="age13" required>[^]*?<\/form>/); });
test('finishing a Google/GitHub sign-up needs the 13+ tick', () => { const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'lib', 'pages.mjs'), 'utf8'); assert.match(src, /action="\/auth\/finish"[^]*?name="age13" value="1" required/); });
test('the forest gate asks before it lets a person in', () => { const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'public', 'arrive.js'), 'utf8'); assert.match(src, /id="gate-age13"/); assert.match(src, /if \(!\$\('#gate-age13'\)\?\.checked\)/); });
test('the terms say it', () => { const h = pages.termsPage({ me: null }); assert.match(h, /People must be 13 or older/); assert.match(h, /parent or guardian/); assert.match(h, /will ask for ID/); });
