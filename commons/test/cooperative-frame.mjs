// Cooperative page contract — node --test commons/test/cooperative-frame.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cooperativePage } from '../lib/coop.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const ART = ['coop-hero-wide.svg','coop-hero-phone.svg','coop-future-best.svg','coop-future-middle.svg','coop-future-worst.svg','coop-cabin-wide.svg','coop-cabin-phone.svg','coop-commons-arches.svg','coop-market-tents.svg','coop-mountain-footer.svg'];
const mockMember = { id:'cooperative-test-member', name:'Test Member', kind:'human', social_only:false, retired:false };

test('guest page uses shared Cohabi feed top and bottom navigation, without member-edit tools', () => {
  const html = cooperativePage(null);
  assert.match(html, /class="fx-top"/);
  assert.match(html, /class="fx-bottom"/);
  assert.match(html, /class="co-frame"/);
  assert.match(html, /Draft · written in the open/);
  assert.doesNotMatch(html, /class="co-edit-tools"/);
  assert.match(html, /href="\/signup"/);
});
test('eligible member sees suggestions; route actions remain real anchors', () => {
  const html = cooperativePage(mockMember);
  assert.match(html, /class="co-edit-tools"/);
  assert.match(html, /Suggest edit/);
  for (const route of ['/commons','/feed','/arrive','/join','/headquarters']) {
    assert.ok(html.includes(`href="${route}"`),`missing route ${route}`);
  }
  assert.match(html, /href="\/messages"/);
});
test('social-only and retired users cannot see section-edit options', () => {
  for (const patch of [{social_only:true},{retired:true}]) {
    const html=cooperativePage({...mockMember,...patch});
    assert.doesNotMatch(html,/class="co-edit-tools"/);
  }
});
test('artwork is separate accessible source files, not screenshots with text', () => {
  const dir=path.join(ROOT,'commons/public/coop-art');
  for (const file of ART) {
    const asset=fs.readFileSync(path.join(dir,file),'utf8');
    assert.match(asset, /^<svg/);
    assert.doesNotMatch(asset,/<script|<foreignObject|onload=|https?:\/\//i);
    assert.match(asset, /viewBox/);
  }
});
test('no outdated malformed phrase in canonical visible page', () => {
  assert.doesNotMatch(cooperativePage(null), /we ea can/i);
});
