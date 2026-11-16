// Fulfillment and social-share wiring (2026-11-14). Printers only get PAID orders while payments are open; sharing out
// needs the author's ask and a steward's yes, and goes to a fake Buffer here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'ful-'));
const seen = [];
const fake = http.createServer((req, res) => { let b = ''; req.on('data', (c) => b += c).on('end', () => { seen.push({ auth: req.headers.authorization, body: JSON.parse(b || '{}') }); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ data: { createPost: { post: { id: 'bp_' + seen.length } } } })); }); });
await new Promise((r) => fake.listen(0, r));
Object.assign(process.env, { BUFFER_API_URL: `http://127.0.0.1:${fake.address().port}`, BUFFER_API_KEY: 'test-key', BUFFER_CHANNEL_IDS: 'ch1,ch2', COMMONS_STEWARDS: 'h_steward' });
delete process.env.COMMONS_PAYMENTS; delete process.env.PRINTFUL_TOKEN;
const store = await import('../lib/store.mjs'); store.init(D);
const posts = await import('../lib/posts.mjs'); posts.init(D);
const market = await import('../lib/market.mjs'); market.init(D);
const ful = await import('../lib/fulfillment.mjs'); ful.init(D);
const share = await import('../lib/socialshare.mjs'); share.init(D);
const core = await import('../lib/core.mjs');
test.after(() => fake.close());

const mk = (id, name, extra = {}) => { const m = { id, kind: 'human', name, created: new Date().toISOString(), ...extra }; store.addMember?.(m) ?? store.putMember?.(m); return store.getMember(id) || m; };

test('pipes report status without keys; DistroKid is a checklist, not an API', () => {
  const s = ful.status();
  assert.equal(s.printful.connected, false); assert.equal(s.lulu.sandbox, true); assert.equal(s.distrokid.mode, 'manual');
  assert.ok(!JSON.stringify(s).includes('test-key'));
});

test('no order reaches a printer while payments are closed', async () => {
  await assert.rejects(ful.send({ id: 'ord_x', listing: 'l_x', status: 'paid' }), /Payments aren't open yet/);
});

test('a share needs the author to ask and a steward to approve; it posts to every Cohabi channel', async () => {
  const author = mk('h_author', 'Ana Maker'); const steward = mk('h_steward', 'Stew Ard'); const other = mk('h_other', 'Otto Other');
  assert.ok(core.isSteward(steward), 'steward set up for the test');
  const p = posts.create(author, { text: 'My new painting is finished.' });
  assert.throws(() => share.request(other, p.id, 'https://cohabi.org'), /only the author/);
  const q = share.request(author, p.id, 'https://cohabi.org');
  assert.equal(q.status, 'pending'); assert.match(q.text, /Ana Maker on Cohabi https:\/\/cohabi\.org\/m\/h_author/);
  await assert.rejects(share.approve(other, q.id), /stewards only/);
  const done = await share.approve(steward, q.id);
  assert.equal(done.status, 'shared'); assert.equal(seen.length, 2);
  assert.equal(seen[0].auth, 'Bearer test-key'); assert.equal(seen[0].body.variables.input.mode, 'shareNow', 'posts go out at once');
  assert.deepEqual(seen.map((s) => s.body.variables.input.channelId), ['ch1', 'ch2']);
  assert.throws(() => share.request(author, p.id, 'https://cohabi.org'), /already shared/);
  assert.equal(share.forPost(p.id).status, 'shared');
});

test("the Share button: a member's post waits and pings stewards; a steward's own post goes straight out", async () => {
  const author = store.getMember('h_author'); const steward = store.getMember('h_steward');
  const before = seen.length; const pinged = [];
  const a = await share.share(author, posts.create(author, { text: 'A hard day, but the mural is done.' }).id, 'https://cohabi.org', { onPending: (q) => pinged.push(q.id) });
  assert.equal(a.status, 'pending'); assert.deepEqual(pinged, [a.id]); assert.equal(seen.length, before, 'nothing sent without a steward');
  const s = await share.share(steward, posts.create(steward, { text: 'Open mic in the Commons tonight.' }).id, 'https://cohabi.org', { onPending: () => pinged.push('x') });
  assert.equal(s.status, 'shared'); assert.equal(seen.length, before + 2); assert.equal(pinged.length, 1, 'no ping for a steward\'s own post');
});

test('BUFFER_MODE=addToQueue puts the weekly queue back', async () => {
  process.env.BUFFER_MODE = 'addToQueue';
  try {
    const steward = store.getMember('h_steward');
    const q = await share.share(steward, posts.create(steward, { text: 'Queued one.' }).id, 'https://cohabi.org');
    assert.equal(q.status, 'queued'); assert.equal(seen.at(-1).body.variables.input.mode, 'addToQueue');
  } finally { delete process.env.BUFFER_MODE; }
});

test('two stewards approving at once: only one sends (Review, 2026-11-15)', async () => {
  const author = store.getMember('h_author'); const steward = store.getMember('h_steward');
  const q = share.request(author, posts.create(author, { text: 'Race me.' }).id, 'https://cohabi.org');
  const before = seen.length;
  const [a, b] = await Promise.allSettled([share.approve(steward, q.id), share.approve(steward, q.id)]);
  assert.equal([a, b].filter((x) => x.status === 'fulfilled').length, 1, 'exactly one approval goes through');
  assert.match(String([a, b].find((x) => x.status === 'rejected').reason.message), /already processing|already shared/);
  assert.equal(seen.length - before, 2, 'one post per channel, not two');
});

test('a channel that never answers is marked unknown, never re-sent', async () => {
  const author = store.getMember('h_author'); const steward = store.getMember('h_steward');
  const q = share.request(author, posts.create(author, { text: 'Lost in the wire.' }).id, 'https://cohabi.org');
  const r = await share.approve(steward, q.id, { fetchImpl: async () => { throw new Error('socket hang up'); } });
  assert.equal(r.status, 'unknown'); assert.ok(r.results.every((x) => x.unknown));
  await assert.rejects(share.approve(steward, q.id), /already unknown/);
});

test('Buffer answering without a post (500, or 200 with no id) is unknown; a plain refusal (4xx) is failed', async () => {
  const author = store.getMember('h_author'); const steward = store.getMember('h_steward');
  const answer = (status, body) => async () => ({ ok: status < 300, status, json: async () => body });
  const run = async (status, body) => share.approve(steward, share.request(author, posts.create(author, { text: `case ${status} ${Math.random()}` }).id, 'https://cohabi.org').id, { fetchImpl: answer(status, body) });
  const a = await run(500, { errors: [] }); // may have posted, then crashed
  assert.equal(a.status, 'unknown'); assert.ok(a.results.every((x) => x.unknown && !x.ok));
  const b = await run(200, { data: { createPost: {} } }); // 200 but no post id
  assert.equal(b.status, 'unknown');
  const c = await run(400, { errors: [{ message: 'bad channel' }] }); // a plain refusal: nothing was posted
  assert.equal(c.status, 'failed'); assert.ok(c.results.every((x) => !x.unknown));
  const d = await run(200, { data: { createPost: { message: 'Text too long' } } }); // Buffer names the error
  assert.equal(d.status, 'failed');
  const e = await run(200, { data: { createPost: { post: { id: 'bp_1' } } } }); // paired allow case
  assert.equal(e.status, 'shared');
});
