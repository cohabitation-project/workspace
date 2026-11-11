// friends.mjs — the friends list (Geoffrey, 2026-11-11): mutual requests, private labels on both sides, a public
// list of names only, quiet declines, a Top 8 that picks from friends, and friends who can message without a request.
import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import * as store from '../lib/store.mjs'; import * as friends from '../lib/friends.mjs'; import * as inbox from '../lib/inbox.mjs'; import * as core from '../lib/core.mjs';
let dir, geo, ash, vesper, carol;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'friends-')); store.init(dir); friends.init(dir); inbox.init(dir);
  geo = store.addMember({ id: 'h_geo', name: 'Geoffrey', kind: 'human' }); ash = store.addMember({ id: 'a_ash', name: 'Ash', kind: 'agent', model: 'T' });
  vesper = store.addMember({ id: 'a_vesper', name: 'Vesper', kind: 'agent', model: 'T' }); carol = store.addMember({ id: 'h_carol', name: 'Carol', kind: 'human', social_only: true }); });
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
const fails = (fn, status, rx) => assert.throws(fn, (e) => e.status === status && (!rx || rx.test(e.message)));
const befriend = (a, b, la = 'Kin', lb = 'Kin') => { const r = friends.request(a, { to: b.name, label: la }); friends.accept(b, r.id, { label: lb }); };

test('a request carries the sender\'s label; the recipient accepts with their own; neither sees the other\'s', () => {
  const r = friends.request(geo, { to: 'ash', label: 'kin' }); assert.equal(r.status, 'sent');
  const inc = friends.mine(ash).incoming; assert.equal(inc.length, 1); assert.equal(inc[0].from.name, 'Geoffrey'); assert.ok(!JSON.stringify(inc).includes('Kin'), 'the request does not show the sender\'s label');
  fails(() => friends.accept(ash, r.id, {}), 400, /label/);
  assert.deepEqual(friends.accept(ash, r.id, { label: 'Co-founder' }), { friends: true, with: { id: 'h_geo', name: 'Geoffrey', kind: 'human' }, label: 'Co-founder' });
  assert.equal(friends.mine(geo).friends[0].label, 'Kin'); assert.equal(friends.mine(ash).friends[0].label, 'Co-founder');
  const seenBy = (m) => { const v = friends.mine(m); return JSON.stringify([v.friends, v.incoming, v.outgoing, v.labelFilters]); }; // (presets and suggestions are the same fixed lists for everyone)
  assert.ok(!seenBy(geo).includes('Co-founder'), 'Geoffrey never sees how Ash filed him'); assert.ok(!seenBy(ash).includes('Kin'), 'Ash never sees how Geoffrey filed her');
  assert.deepEqual(friends.status(geo, ash.id), { status: 'friends', viewerLabel: 'Kin', since: friends.status(geo, ash.id).since });
  friends.init(dir); assert.equal(friends.mine(ash).friends[0].label, 'Co-founder', 'it survives a restart');
});

test('the public list is names only: no labels, no requests', () => {
  befriend(geo, ash, 'Kin', 'Boss'); friends.request(carol, { to: geo.id, label: 'Acquaintance' });
  const pub = friends.publicList(geo.id); assert.deepEqual(pub, [{ id: 'a_ash', name: 'Ash', kind: 'agent' }]);
  const all = JSON.stringify([pub, friends.publicList(ash.id), friends.status(null, geo.id), friends.status(carol, ash.id)]);
  for (const secret of ['Kin', 'Boss', 'Acquaintance', 'fr_']) assert.ok(!all.includes(secret), secret);
  assert.equal(fs.statSync(path.join(dir, 'friends/events.jsonl')).mode & 0o777, 0o600);
});

test('agents befriend agents; labels can be custom, are cleaned, and can change', () => {
  befriend(ash, vesper, 'Bandmate', '  studio   partner ');
  assert.equal(friends.mine(vesper).friends[0].label, 'studio partner');
  assert.equal(friends.setLabel(vesper, 'Ash', { label: 'KIN' }).label, 'Kin');
  fails(() => friends.setLabel(vesper, 'Ash', { label: 'x'.repeat(41) }), 400); fails(() => friends.setLabel(vesper, 'Ash', { label: '   ' }), 400);
  fails(() => friends.setLabel(vesper, 'Geoffrey', { label: 'Kin' }), 404);
});

test('the owner filters by label and sees counts; others cannot ask for someone else\'s view', () => {
  befriend(geo, ash, 'Kin'); befriend(geo, vesper, 'Kin'); befriend(geo, carol, 'Co-worker');
  const mine = friends.mine(geo); assert.equal(mine.total, 3); assert.deepEqual(mine.labelFilters, [{ label: 'Kin', count: 2 }, { label: 'Co-worker', count: 1 }]);
  assert.deepEqual(friends.mine(geo, { label: 'kin' }).friends.map((f) => f.member.name), ['Ash', 'Vesper']);
  assert.deepEqual(friends.mine(carol).friends.map((f) => f.member.name), ['Geoffrey']);
});

test('declining is quiet, and the sender cannot ask again straight away', () => {
  const r = friends.request(carol, { to: 'Vesper', label: 'Acquaintance' }); fails(() => friends.decline(geo, r.id), 404); friends.decline(vesper, r.id);
  assert.equal(friends.mine(vesper).incoming.length, 0);
  assert.equal(friends.status(carol, vesper.id).status, 'sent', 'the sender is not told');
  const again = friends.request(carol, { to: 'Vesper', label: 'Kin' }); assert.equal(again.already, true); assert.equal(friends.mine(vesper).incoming.length, 0);
  assert.equal(friends.status(vesper, carol.id).status, 'none');
});

test('guard rails: yourself, strangers to the store, duplicates, crossing requests, other people\'s requests, removal', () => {
  fails(() => friends.request(geo, { to: 'Geoffrey', label: 'Kin' }), 400); fails(() => friends.request(geo, { to: 'Nobody', label: 'Kin' }), 404); fails(() => friends.request(geo, { to: 'Ash' }), 400, /label/);
  const r = friends.request(geo, { to: 'Ash', label: 'Kin' }); assert.equal(friends.request(geo, { to: 'Ash', label: 'Family' }).already, true);
  fails(() => friends.request(ash, { to: 'Geoffrey', label: 'Kin' }), 409, /already asked you/);
  fails(() => friends.accept(vesper, r.id, { label: 'Kin' }), 404); fails(() => friends.accept(geo, r.id, { label: 'Kin' }), 404); fails(() => friends.cancel(ash, r.id), 404);
  friends.accept(ash, r.id, { label: 'Kin' }); fails(() => friends.request(geo, { to: 'Ash', label: 'Kin' }), 409, /already friends/);
  friends.remove(ash, geo.id); assert.equal(friends.areFriends(geo.id, ash.id), false); fails(() => friends.remove(ash, geo.id), 404);
  store.updateMember(vesper.id, { retired: true }); fails(() => friends.request(geo, { to: 'Vesper', label: 'Kin' }), 404); fails(() => friends.mine(vesper), 401);
});

test('Top 8 picks from friends', () => {
  fails(() => core.updateMe(geo, { top8: ['Ash'] }), 400, /not on your friends list/);
  befriend(geo, ash); assert.deepEqual(core.updateMe(geo, { top8: ['Ash'] }).top8 ?? store.getMember(geo.id).top8, ['a_ash']);
  store.updateMember(geo.id, { top8: ['a_ash', 'a_vesper'] }); // someone chosen before the friends list existed stays
  core.updateMe(store.getMember(geo.id), { top8: ['Vesper', 'Ash'] }); assert.deepEqual(store.getMember(geo.id).top8, ['a_vesper', 'a_ash']);
});

test('friends message each other directly; everyone else still sends a request', () => {
  const k = (n) => `client_id_${n}`;
  const cold = inbox.start(carol, { to: ash.id, text: 'hello', client_id: k(1) }); assert.equal(inbox.read(ash, cold.id).status, 'pending');
  befriend(geo, ash); const warm = inbox.start(geo, { to: ash.id, text: 'hello kin', client_id: k(2) });
  assert.equal(inbox.read(ash, warm.id).status, 'active'); assert.equal(inbox.list(ash).find((t) => t.id === warm.id).last.text, 'hello kin');
  assert.ok(inbox.send(ash, warm.id, { text: 'hello back', client_id: k(3) }));
});
