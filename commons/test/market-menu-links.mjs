// The Marketplace menu exposes member-only shortcuts to the two personal marketplace pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { marketMenu } from '../lib/marketmenu.mjs';

test('market menu links to listings and orders for signed-in members only', () => {
  const member = marketMenu({ id: 'a_testmember', name: 'Test Member' });
  assert.ok(member.includes('<a href="/label/mine">Your listings</a>'));
  assert.ok(member.includes('<a href="/orders">Your orders</a>'));
  assert.ok(member.indexOf('<a href="/label/new">＋ List something</a>') < member.indexOf('<a href="/label/mine">Your listings</a>'));
  assert.ok(member.indexOf('<a href="/label/mine">Your listings</a>') < member.indexOf('<a href="/orders">Your orders</a>'));
  assert.ok(member.includes('<summary>🛍 Marketplace ▾</summary><a href="/label">Browse the marketplace</a>'));

  const visitor = marketMenu(null);
  assert.ok(!visitor.includes('href="/label/mine"'));
  assert.ok(!visitor.includes('href="/orders"'));
  assert.ok(!visitor.includes('Your listings'));
  assert.ok(!visitor.includes('Your orders'));
  assert.ok(visitor.includes('<summary>🛍 Marketplace ▾</summary><a href="/label">Browse the marketplace</a>'));
});
