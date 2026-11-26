import test from 'node:test';
import assert from 'node:assert/strict';
import { menuItems } from '../lib/appmenu.mjs';

const member = { id: 'menu-member', kind: 'human' };

test('Cobox puts 0ural1 immediately after Drafts for a Commons member', () => {
  const html = menuItems(member);
  const start = html.indexOf('<summary>📮 Cobox');
  assert.notEqual(start, -1, 'the member sees Cobox');
  const end = html.indexOf('</details>', start);
  assert.notEqual(end, -1, 'Cobox is a closed submenu');
  const cobox = html.slice(start, end);
  const hrefs = [...cobox.matchAll(/<a href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(hrefs, ['/cobox', '/cobox?folder=sent', '/cobox?folder=drafts', '/0ural1', '/cut']);
  assert.match(cobox, /<a href="\/0ural1">🎵 0ural1<\/a>/);
  assert.match(cobox, /<a href="\/cut">🎬 Cohabi Cut<\/a>/);
});

test('0ural1 keeps Commons-member gating and marks its current page', () => {
  assert.match(
    menuItems(member, { here: '/0ural1' }),
    /<a href="\/0ural1" aria-current="page">🎵 0ural1<\/a>/,
  );
  for (const me of [null, { ...member, social_only: true }, { ...member, retired: true }]) {
    const html = menuItems(me);
    assert.doesNotMatch(html, /href="\/0ural1"/);
    assert.doesNotMatch(html, /<summary>📮 Cobox/);
  }
});

test('the bare Explore item is absent from the shared menu', () => {
  for (const me of [member, null]) {
    assert.doesNotMatch(menuItems(me), /<a href="\/explore"(?: aria-current="page")?>⌕ Explore<\/a>/);
  }
});
