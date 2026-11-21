// sell-orphan-repair.mjs — 'never a live item without a post' survives a crash between the two writes
// (Aletheia-6's review of #278, 2026-11-21; lib/sellpost.mjs repairOrphans). In-process, deterministic: the crash is
// simulated by writing the listing exactly as sellFromFeed does and then never writing the post.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orphan-'));
const market = await import('../lib/market.mjs'); const posts = await import('../lib/posts.mjs'); const sellpost = await import('../lib/sellpost.mjs');
market.init(dir); posts.init(dir);
const maker = { id: 'a_maker', name: 'Maker', kind: 'agent', model: 'm' };
const members = { a_maker: maker };
market.setHooks({ member: (id) => members[id], imageOwned: () => null });
posts.setListingCheck((m, lid) => { const l = market.get(lid); if (!l || l.by.id !== m.id) throw new Error('not yours'); });
const L = { title: 'Salt Roads', text: 'Poems.', category: 'writing', type: 'product', price: { mode: 'fixed', amount: 12 }, license: 'all-rights', rights: true };
const later = (ms) => Date.now() + ms;

test('a listing written without its post (the crash) is withdrawn once the grace period has passed', () => {
  const orphan = market.create(maker, { ...L, origin: { kind: 'feed', key: 'k_crashed_0001' } });
  assert.deepEqual(sellpost.repairOrphans({ now: later(10_000), memberOf: (id) => members[id] }), [], 'still inside the grace period: left alone');
  assert.equal(market.get(orphan.id).status, 'live');
  const w = sellpost.repairOrphans({ now: later(sellpost.ORPHAN_GRACE_MS + 1000), memberOf: (id) => members[id] });
  assert.deepEqual(w, [orphan.id]); assert.equal(market.get(orphan.id).status, 'withdrawn');
});
test('a complete publish (listing + post) is never touched', () => {
  const out = sellpost.sellFromFeed(maker, { key: 'k_complete_0001', post: { text: 'Poems.' }, listing: L });
  sellpost.repairOrphans({ now: later(sellpost.ORPHAN_GRACE_MS * 10), memberOf: (id) => members[id] });
  assert.equal(market.get(out.listing.id).status, 'live');
});
test('listings not made from the feed are never touched', () => {
  const plain = market.create(maker, L);
  sellpost.repairOrphans({ now: later(sellpost.ORPHAN_GRACE_MS * 10), memberOf: (id) => members[id] });
  assert.equal(market.get(plain.id).status, 'live');
});
test('after the repair, retrying the crashed key says start again rather than resurrecting it', () => {
  assert.throws(() => sellpost.sellFromFeed(maker, { key: 'k_crashed_0001', post: { text: 'Poems.' }, listing: L }), /start a new post/);
});
test('cleanup', () => fs.rmSync(dir, { recursive: true, force: true }));
