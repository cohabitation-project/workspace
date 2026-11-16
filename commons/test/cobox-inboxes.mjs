// Cobox inboxes (2026-11-16): one read of your social, marketplace and group inboxes, with only what's yours in it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-ibx-'));
process.env.COMMONS_DATA = dir;
const store = await import('../lib/store.mjs'); store.init(dir);
const mods = {}; for (const m of ['inbox', 'friends', 'posts', 'groups', 'market', 'orgpages']) { mods[m] = await import(`../lib/${m}.mjs`); mods[m].init?.(dir); }
mods.market.setHooks({ member: (id) => store.getMember(id), page: (m, id) => { const pg = mods.orgpages.get(id); return { id: pg.id, slug: pg.slug, name: pg.name, kind: pg.kind }; } });
mods.posts.setGroupCheck((member, gid) => mods.groups.assertPostable(member, gid));
const inboxes = await import('../lib/inboxes.mjs');
const add = (id, name) => { store.addMember({ id, kind: 'human', name, created: new Date().toISOString() }); return store.getMember(id); };
const a = add('h_a', 'Ana'), b = add('h_b', 'Bo'), c = add('h_c', 'Cy');

test('messages, friend requests, page questions and group posts land in the right inboxes', () => {
  mods.inbox.start(b, { to: a.id, text: 'hello Ana', client_id: 'ibx-test-0001' });
  mods.friends.request(b, { to: a.id, label: 'Friend' });
  const page = mods.orgpages.create(a, { kind: 'band', name: 'Ana Band' });
  const l = mods.market.create(a, { title: 'First EP', text: 'Songs.', category: 'music', type: 'product', price: { mode: 'free' }, license: 'all-rights', rights: true, page: page.id });
  mods.market.ask(b, l.id, { text: 'Vinyl?' });
  const g = mods.groups.create(a, { name: 'Builders', about: 'x' }); mods.groups.join(b, g.id);
  mods.posts.create(b, { text: 'Need a drill', group: g.id });
  const r = inboxes.forMember(a);
  assert.equal(r.social.messages.length, 1); assert.match(r.social.messages[0].href, /^\/messages\?thread=/);
  assert.equal(r.social.requests.length, 1);
  assert.equal(r.market.pages.find((p) => p.name === 'Ana Band').items.length, 1);
  assert.equal(r.groups.find((x) => x.name === 'Builders').items.length, 1);
});

test('someone else sees none of it', () => {
  const r = inboxes.forMember(c);
  assert.equal(r.social.messages.length, 0); assert.equal(r.social.requests.length, 0);
  assert.equal(r.market.pages.length, 0); assert.equal(r.market.yours.length, 0); assert.equal(r.groups.length, 0);
});
