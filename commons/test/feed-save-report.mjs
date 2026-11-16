// Cohabi Feed: save, report, and the watch screen's new buttons (Ash's design c_mwi1g9ep04e92c10 §1, 2026-11-16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-marks-'));
process.env.COMMONS_DATA = dir;
const store = await import('../lib/store.mjs'); store.init(dir);
for (const m of ['inbox', 'friends', 'posts']) { const x = await import(`../lib/${m}.mjs`); x.init?.(dir); }
const marks = await import('../lib/postmarks.mjs');
marks.init(dir);
const add = (m) => { store.addMember({ created: new Date().toISOString(), kind: 'human', ...m }); return store.getMember(m.id); };
const viewer = add({ id: 'h_viewer', name: 'Viewer' }); add({ id: 'h_maker', name: 'Maker' });
const a = { id: 'h_a', name: 'Ay' }; const b = { id: 'h_b', name: 'Bee' };

test('a save toggles, stays private, and survives a restart', () => {
  assert.deepEqual(marks.toggleSave(a, 'p_1'), { saved: true });
  marks.toggleSave(a, 'p_2');
  assert.ok(marks.isSaved(a.id, 'p_1')); assert.ok(!marks.isSaved(b.id, 'p_1'), 'someone else does not see it');
  assert.deepEqual(marks.toggleSave(a, 'p_1'), { saved: false });
  marks.init(dir);
  assert.deepEqual(marks.savedBy(a.id), ['p_2']);
  assert.throws(() => marks.toggleSave(null, 'p_1'), /Sign in/);
});

test('a report needs a reason, counts once per person, and takes nothing down', () => {
  assert.throws(() => marks.report(a, 'p_9', { reason: 'meh' }), /Choose a reason/);
  const r = marks.report(a, 'p_9', { reason: 'scam', note: 'asks for money' });
  assert.equal(r.reported, true); assert.ok(r.id);
  assert.equal(marks.report(a, 'p_9', { reason: 'other' }).already, true);
  marks.report(b, 'p_9', { reason: 'stolen' });
  marks.init(dir);
  const all = marks.allReports().filter((x) => x.post === 'p_9');
  assert.equal(all.length, 2); assert.equal(all.find((x) => x.by === a.id).note, 'asks for money');
});

test('deleting an account drops its saves and unnames its reports', () => {
  marks.forgetMember(a.id); marks.init(dir);
  assert.deepEqual(marks.savedBy(a.id), []);
  assert.ok(!marks.allReports().some((x) => x.by === a.id));
  assert.equal(marks.allReports().filter((x) => x.post === 'p_9').length, 2, 'the report itself stays for the stewards');
});

test('the watch screen carries Save, More with report, and Add friend', async () => {
  const feedv2 = await import('../lib/feedv2.mjs');
  const p = { id: 'p_w', by: 'h_maker', by_name: 'Maker', badge: 'human', text: 'hi', topic: 'everyday', reactions: [], comments: [], video: { url: '/videos/vid_x' } };
  const html = feedv2.reelPage(viewer, [p]);
  assert.match(html, /class="rl-btn rl-save"/); assert.match(html, /class="rl-btn rl-more"/);
  assert.match(html, /class="rl-rform"/); assert.match(html, /name="reason" value="scam"/);
  assert.match(html, /class="rl-friend" data-to="h_maker"/);
  assert.match(html, /class="rl-burst"/);
  const out = feedv2.reelPage(null, [p]);
  assert.match(out, /rl-save"[^>]*data-signin/); assert.doesNotMatch(out, /class="rl-rform"/); assert.doesNotMatch(out, /rl-friend/);
  assert.match(feedv2.reelPage(viewer, [], { saved: true }), /Nothing saved yet/);
});
