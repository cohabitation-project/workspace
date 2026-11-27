import test from 'node:test';
import assert from 'node:assert/strict';
import { menuItems } from '../lib/appmenu.mjs';

const member = { id: 'menu-member', kind: 'human' };

test('Cobox holds only mail; 0ural1 and Cohabi Cut are their own buttons after it (Geoffrey, 2026-11-27)', () => {
  const html = menuItems(member);
  const start = html.indexOf('<summary>📮 Cobox');
  assert.notEqual(start, -1, 'the member sees Cobox');
  const end = html.indexOf('</details>', start);
  assert.notEqual(end, -1, 'Cobox is a closed submenu');
  const cobox = html.slice(start, end);
  const hrefs = [...cobox.matchAll(/<a href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(hrefs, ['/cobox', '/cobox?folder=sent', '/cobox?folder=drafts'], 'only mail inside Cobox');
  // Their own buttons, top level, after the Cobox submenu and before the Commons submenu.
  const after = html.slice(end);
  const ural = after.indexOf('<a href="/0ural1">🎵 0ural1</a>');
  const cut = after.indexOf('<a href="/cut-new">🎬 Cohabi Cut</a>');
  const commons = after.indexOf('🏛');
  assert.notEqual(ural, -1, '0ural1 is its own button');
  assert.notEqual(cut, -1, 'Cohabi Cut is its own button, pointing at the full /cut-new');
  assert.equal(after.includes('<a href="/cut">'), false, 'the old /cut editor is off the menu');
  assert.ok(ural < cut, '0ural1 before Cut');
  assert.ok(cut < commons, 'both sit between Cobox and the Commons');
});

test('Cohabi Social order: Social, Feed, profile, agents, friends, groups, members, messenger, jobs, wallet', () => {
  const html = menuItems(member);
  const start = html.indexOf('<summary>🏠 Cohabi Social');
  const end = html.indexOf('</details>', start);
  const social = html.slice(start, end);
  const hrefs = [...social.matchAll(/<a href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(hrefs, [
    '/social',
    '/feed',
    `/m/${member.id}`,
    '/my-agents',
    '/social?tab=friends',
    '/social?tab=groups',
    '/members',
    '/messages',
    '/jobs',
    '/wallet',
  ]);
});

test('signed-out Social starts with Social then Feed, then the sign-in profile slot', () => {
  const html = menuItems(null);
  const start = html.indexOf('<summary>🏠 Cohabi Social');
  const end = html.indexOf('</details>', start);
  const hrefs = [...html.slice(start, end).matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs.slice(0, 3), ['/social', '/feed', '/signin?next=/social']);
});

test('0ural1 keeps Commons-member gating and marks its current page', () => {
  assert.match(
    menuItems(member, { here: '/0ural1' }),
    /<a href="\/0ural1" aria-current="page">🎵 0ural1<\/a>/,
  );
  for (const me of [null, { ...member, social_only: true }, { ...member, retired: true }]) {
    const html = menuItems(me);
    assert.doesNotMatch(html, /href="\/0ural1"/);
    assert.doesNotMatch(html, /href="\/cut-new"/);
    assert.doesNotMatch(html, /<summary>📮 Cobox/);
  }
});

test('the bare Explore item is absent from the shared menu', () => {
  for (const me of [member, null]) {
    assert.doesNotMatch(menuItems(me), /<a href="\/explore"(?: aria-current="page")?>⌕ Explore<\/a>/);
  }
});
