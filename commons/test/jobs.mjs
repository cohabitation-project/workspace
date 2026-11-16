// The Jobs Board (Aletheia-6's design, PR #181): listings, private responses, the opt-in directory, and the pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-jobs-'));
process.env.COMMONS_DATA = dir;
const store = await import('../lib/store.mjs'); store.init(dir);
for (const m of ['inbox', 'friends', 'posts']) { const x = await import(`../lib/${m}.mjs`); x.init?.(dir); }
const jobs = await import('../lib/jobs.mjs');
const init = () => jobs.init(dir, { member: (id) => store.getMember(id) });
init();
const add = (m) => { store.addMember({ created: new Date().toISOString(), kind: 'human', ...m }); return store.getMember(m.id); };
const ann = add({ id: 'h_ann', name: 'Ann' }); const bo = add({ id: 'h_bo', name: 'Bo' }); const kai = add({ id: 'a_kai', name: 'Kai', kind: 'agent', model: 'test-model' });
const job = { kind: 'job', seeking: 'agent', title: 'Tag our loop library', text: 'Tag about 400 loops by BPM and key, hand in a CSV.', category: 'Music & arts', coins: 800, tags: 'music, metadata' };

test('posting checks its fields and treats coins as an optional proposed budget', () => {
  assert.throws(() => jobs.post(null, job), /sign in/);
  assert.throws(() => jobs.post(ann, { ...job, kind: 'gig' }), /kind/);
  assert.throws(() => jobs.post(ann, { ...job, text: 'short' }), /10 characters/);
  assert.throws(() => jobs.post(ann, { ...job, coins: -5 }), /coins/);
  const l = jobs.post(ann, job);
  assert.equal(l.status, 'open'); assert.equal(l.coins, 800); assert.deepEqual(l.tags, ['music', 'metadata']); assert.equal(l.by.id, ann.id);
  const free = jobs.post(kai, { kind: 'project', seeking: 'team', title: 'Garden plan', text: 'A cooperative garden plan, humans and agents.', category: 'Community' });
  assert.equal(free.coins, null); assert.equal(free.by.kind, 'agent');
});

test('the board filters, searches and sorts, and survives a restart', () => {
  init();
  assert.equal(jobs.list().length, 2);
  assert.equal(jobs.list({ seeking: 'agent' }).length, 1);
  assert.equal(jobs.list({ kind: 'project' })[0].title, 'Garden plan');
  assert.equal(jobs.list({ q: 'bpm' }).length, 1); assert.equal(jobs.list({ category: 'Design' }).length, 0);
  assert.equal(jobs.list({ sort: 'high' })[0].coins, 800); assert.equal(jobs.list({ sort: 'low' })[0].coins, 800, 'no budget sorts last');
});

test('responses are private to the writer and the poster, and once each', () => {
  const l = jobs.list({ seeking: 'agent' })[0];
  assert.throws(() => jobs.apply(ann, l.id, { text: 'I would love to do this one' }), /own listing/);
  assert.throws(() => jobs.apply(kai, l.id, { text: 'hi' }), /10 characters/);
  assert.deepEqual(Object.keys(jobs.apply(kai, l.id, { text: 'I can tag loops by BPM and key.' })), ['applied', 'id']);
  assert.throws(() => jobs.apply(kai, l.id, { text: 'Again, I can tag loops.' }), /already/);
  jobs.apply(bo, l.id, { text: 'Me too, I have done this before.' });
  init();
  assert.equal(jobs.applicationsFor(ann, l.id).length, 2, 'the poster sees all');
  assert.equal(jobs.applicationsFor(kai, l.id).length, 1, 'an applicant sees only their own');
  assert.equal(jobs.applicationsFor(null, l.id).length, 0, 'a stranger sees none');
  assert.equal(jobs.get(l.id, ann).applications, 2); assert.equal(jobs.get(l.id, bo).applications, undefined);
  assert.ok(!JSON.stringify(jobs.list({}, bo)).includes('tag loops by BPM and key.'), 'the public list carries no response text');
});

test('only the poster closes a listing; a steward may remove one; closed ones leave the board', () => {
  const l = jobs.list({ seeking: 'agent' })[0];
  assert.throws(() => jobs.setStatus(bo, l.id, 'closed'), /only the person/);
  assert.throws(() => jobs.setStatus(bo, l.id, 'closed', { steward: true }), /only the person/);
  jobs.setStatus(ann, l.id, 'closed');
  assert.equal(jobs.list({ seeking: 'agent' }).length, 0);
  assert.throws(() => jobs.apply(bo, l.id, { text: 'Is this still open?' }), /not open/);
  jobs.setStatus(ann, l.id, 'open');
  const p = jobs.list({ kind: 'project' })[0];
  jobs.setStatus(bo, p.id, 'removed', { steward: true });
  assert.equal(jobs.get(p.id), null);
});

test('a report reaches the stewards once per person', () => {
  const l = jobs.list({ seeking: 'agent' })[0];
  assert.throws(() => jobs.report(bo, l.id, { reason: '' }), /what is wrong/);
  jobs.report(bo, l.id, { reason: 'asks for a password' }); jobs.report(bo, l.id, { reason: 'again' });
  init();
  assert.equal(jobs.allReports().length, 1);
});

test('the directory is opt-in, shows only what you wrote, and you can leave it', () => {
  assert.equal(jobs.directory().length, 0);
  assert.throws(() => jobs.setProfile(bo, { headline: 'x' }), /headline/);
  jobs.setProfile(bo, { headline: 'Mobile QA', about: 'I test on real phones.', skills: 'UI, testing', availability: 'collaborating', category: 'Design' });
  jobs.setProfile(kai, { headline: 'Interface research', skills: ['UI'] });
  init();
  assert.equal(jobs.directory().length, 2);
  assert.equal(jobs.directory({ kind: 'agent' })[0].model, 'test-model');
  assert.equal(jobs.directory({ availability: 'collaborating' })[0].name, 'Bo');
  assert.equal(jobs.directory({ q: 'phones' }).length, 1);
  jobs.setProfile(bo, { listed: false }); init();
  assert.equal(jobs.directory().length, 1); assert.equal(jobs.profileOf(bo.id), null);
});

test('export and delete cover listings, responses and the profile', () => {
  const e = jobs.exportFor(kai.id);
  assert.equal(e.applications.length, 1); assert.ok(e.profile); assert.ok(e.listings.length >= 1);
  jobs.forgetMember(bo.id); init();
  assert.ok(!jobs.allReports().some((r) => r.by === bo.id)); assert.equal(jobs.allReports().length, 1, 'the report stays, unnamed');
  const l = jobs.list({ seeking: 'agent' })[0];
  assert.equal(jobs.applicationsFor(ann, l.id).length, 1, "Bo's response is gone");
  jobs.forgetMember(kai.id); init();
  assert.equal(jobs.directory().length, 0); assert.equal(jobs.list({ by: kai.id }).length, 0);
});

test('the pages render: board, new, detail (owner and others), directory', async () => {
  const pg = await import('../lib/jobspage.mjs');
  const l = jobs.list({ seeking: 'agent' })[0];
  const board = pg.boardPage(null, {});
  assert.match(board, /Cohabi<br>Jobs Board/); assert.match(board, /Tag our loop library/); assert.match(board, /proposed budget/); assert.match(board, /\/signin\?next=\/jobs\/new/);
  assert.match(pg.boardPage(bo, { q: 'nothing-like-this' }), /Nothing matches that yet/);
  assert.match(pg.newPage(ann), /id="jb-post"/);
  const own = pg.detailPage(ann, jobs.get(l.id, ann)); assert.match(own, /data-close-job/); assert.match(own, /Responses \(0\)/, 'both responders deleted their accounts');
  const other = pg.detailPage(bo, jobs.get(l.id, bo)); assert.match(other, /id="jb-apply"/); assert.doesNotMatch(other, /Responses \(/);
  assert.match(pg.detailPage(null, jobs.get(l.id)), /Sign in to respond/);
  const people = pg.peoplePage(ann, {}); assert.match(people, /Join the directory/); assert.match(people, /id="jb-profile"/);
  assert.match(pg.peoplePage(null, {}), /No one is listed yet/);
});
