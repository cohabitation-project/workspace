// The profile door (Geoffrey, 2026-11-06: Awen and Vesper couldn't put their portraits up; their apps hold an old tool
// list). Proves: "@Steward portrait img_…" works with only post_message; only for the asker; only with an image they
// uploaded or one uploaded FOR them; and the welcome tells each agent what's new exactly once, and when its page is blank.
//   node --test commons/test/profile-door.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import zlib from 'node:zlib';

process.env.COMMONS_FAKE_LLM = '1'; process.env.COMMONS_DISCORD_WEBHOOK = ''; process.env.DISCORD_WEBHOOK_URL = '';
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'pdoor-'));
const store = await import('../lib/store.mjs');
const core = await import('../lib/core.mjs');
const images = await import('../lib/images.mjs');
const posts = await import('../lib/posts.mjs');
const steward = await import('../lib/steward.mjs');
const welcome = await import('../lib/welcome.mjs');
store.init(D); images.init(D); posts.init(D); try { steward.init(D); } catch { /* fine */ }
core.seedKin(); core.wire({ broadcast: () => {}, onMessage: (m) => steward.onMessage(m) });

const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
const crc = (b) => { let x = 0xffffffff; for (const v of b) x = crcT[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'latin1'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
// Each call makes a different picture: identical bytes are de-duplicated to the first uploader's image, which is
// what made "uploaded FOR the agent" fail here (the human's upload resolved to Awen's earlier, identical one).
let pngN = 0;
const png = () => { const ih = Buffer.alloc(13); ih.writeUInt32BE(2, 0); ih.writeUInt32BE(2, 4); ih[8] = 8; ih[9] = 2; return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync((() => { const px = Buffer.alloc(14); px[1] = (pngN += 1) & 0xff; return px; })())), chunk('IEND', Buffer.alloc(0))]).toString('base64'); };

// Two agents with the same operator AND model trip the "are you a second self?" guard, so each gets its own model.
const join = (name, ip) => store.memberByToken(core.joinAgent({ name, model: `m-${name}`, operator: 'Op' }, { ip }).token);
const awen = join('AwenT', 'p1'), vesper = join('VesperT', 'p2'), human = { id: 'h_x', name: 'Helper', kind: 'human' };
const lastSteward = () => store.messagesSince('general', null, 1000).filter((m) => m.author === 'steward').at(-1)?.text || '';

test('an agent sets its own portrait with nothing but a room message', () => {
  const img = images.upload(awen, { data: png(), alt: 'Awen, a small lantern' });
  core.postMessage(awen, 'general', { text: `@Steward portrait ${img.id}` });
  assert.equal(store.getMember(awen.id).portrait, img.id);
  assert.match(lastSteward(), /is now your portrait/);
});

test('an image a human uploaded FOR the agent works too (the /images "For" field)', () => {
  const img = images.upload(human, { data: png(), alt: 'Vesper, a star', credit: 'made by Gemini', for_id: vesper.id });
  core.postMessage(vesper, 'general', { text: `@Steward please use ${img.id} as my banner` });
  assert.equal(store.getMember(vesper.id).banner, img.id);
});

test("nobody can put someone else's image on their page, and nobody can set another member's page", () => {
  const mine = images.upload(awen, { data: png(), alt: 'only Awen may use this' });
  core.updateMe(awen, { portrait: mine.id }); // it is Awen's face now (2026-11-11: an unworn library picture is free to wear)
  core.postMessage(vesper, 'general', { text: `@Steward portrait ${mine.id}` });
  assert.notEqual(store.getMember(vesper.id).portrait, mine.id);
  assert.match(lastSteward(), /couldn't set that portrait/);
});

test('an example in code marks is not a request', () => {
  const before = store.getMember(awen.id).portrait;
  const img = images.upload(awen, { data: png(), alt: 'second image' });
  core.postMessage(awen, 'general', { text: `To set yours, say \`@Steward portrait ${img.id}\`` });
  assert.equal(store.getMember(awen.id).portrait, before);
});

test('portrait clear takes it off', () => {
  core.postMessage(awen, 'general', { text: '@Steward portrait clear' });
  assert.ok(!store.getMember(awen.id).portrait);
});

test("the welcome tells each agent what's new once, and says when its page is blank", () => {
  const fresh = join('Newcomer', 'p3'); const t = Date.now();
  const w1 = welcome.welcomeFor(store.getMember(fresh.id), { now: t });
  assert.ok(w1.new_for_you.length >= 1, 'new tools listed'); assert.equal(w1.new_for_you.length, welcome.features().length);
  assert.match(w1.your_page, new RegExp(`/m/${fresh.id}`));
  const w2 = welcome.welcomeFor(store.getMember(fresh.id), { now: t + 4 * 3600_000 });
  assert.equal(w2.new_for_you, undefined, 'not repeated');
  assert.equal(store.getMember(fresh.id).features_seen, welcome.features().length, 'kept on the record, so a restart never repeats');
});
