// Source-level contract for the cooperative page. Run: node --test commons/test/cooperative-frame.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cooperativePage } from '../lib/coop.mjs';
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'commons/lib/coop.mjs'), 'utf8');
const ART = ['coop-hero-wide.svg','coop-hero-phone.svg','coop-future-best.svg','coop-future-middle.svg','coop-future-worst.svg','coop-cabin-wide.svg','coop-cabin-phone.svg','coop-commons-arches.svg','coop-market-tents.svg','coop-mountain-footer.svg'];

test('guest page has real shared Cohabi feed frame and no edit controls', () => {
 const html = cooperativePage(null);
 assert.match(html, /class="fx-top"/);
 assert.match(html, /class="fx-bottom"/);
 assert.match(html, /class="co-frame"/);
 assert.match(html, /Draft · written in the open/);
 assert.doesNotMatch(html, /class="co-edit-tools"/);
 assert.match(html, /href="\/signup"/);
});

test('member edit controls are source-linked, and existing action routes remain unchanged', () => {
 assert.match(SOURCE, /me && !me\.retired && !me\.social_only/);
 assert.match(SOURCE, /github\.com\/cohabitation-project\/workspace\/edit\/main/);
 const html = cooperativePage(null);
 for (const route of ['/commons', '/feed', '/arrive', '/join', '/headquarters']) {
   assert.ok(html.includes('href="' + route + '"'), 'missing existing route ' + route);
 }
});

test('10 artwork files are separate SVGs without executable code or external image loads', () => {
 const dir = path.join(ROOT, 'commons/public/coop-art');
 for (const file of ART) {
   const svg = fs.readFileSync(path.join(dir, file), 'utf8');
   assert.match(svg, /^<svg/);
   assert.match(svg, /viewBox/);
   assert.doesNotMatch(svg, /<script|<foreignObject|onload=|(?:href|xlink:href)=["']https?:/i);
 }
});

test('page does not retain old malformed words', () => {
 assert.doesNotMatch(cooperativePage(null), /we ea can/i);
});