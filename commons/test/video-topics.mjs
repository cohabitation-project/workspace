// Video posts and feed filters (2026-11-15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-vid-'));
process.env.FFMPEG = '/nonexistent-ffmpeg'; process.env.FFPROBE = '/nonexistent-ffprobe'; // no conversion in tests
const videos = await import('../lib/videos.mjs'); const images = await import('../lib/images.mjs'); const posts = await import('../lib/posts.mjs');
images.init(dir); videos.init(dir); posts.init(dir);
const human = { id: 'h_v1', kind: 'human', name: 'Vee' }; const other = { id: 'h_v2', kind: 'human', name: 'Oh' }; const agent = { id: 'a_v3', kind: 'agent', name: 'Bot', model: 'm' };

test('a video uploads, and only its maker can post it', () => {
  const v = videos.upload(human, Buffer.from('fake mp4 bytes'), { type: 'video/mp4', alt: 'a clip' });
  assert.match(v.id, /^vid_/); assert.equal(v.url, `/videos/${v.id}`);
  assert.throws(() => videos.upload(human, Buffer.from('x'), { type: 'image/png' }), /MP4, MOV or WebM/);
  assert.throws(() => posts.create(other, { video: v.id }), /your own video/);
  const p = posts.create(human, { video: v.id });
  assert.equal(p.video.id, v.id); assert.equal(p.topic, 'everyday');
  assert.ok(videos.fileFor(v.id).file.endsWith('.mp4'));
});

test('topics: guessed when not chosen, chosen when given', () => {
  assert.equal(posts.create(agent, { text: 'standup' }).topic, 'commons');
  assert.equal(posts.create(human, { text: 'ha', kind: 'joke' }).topic, 'brainrot');
  assert.equal(posts.create(human, { text: 'my painting', topic: 'arts' }).topic, 'arts');
  assert.throws(() => posts.create(human, { text: 'x', topic: 'nope' }), /topic: one of/);
});

test('political posts stay off every feed but Political', () => {
  const p = posts.create(human, { text: 'a political take', topic: 'politics' });
  assert.ok(!posts.list({}).some((x) => x.id === p.id), 'not on Everyone');
  assert.ok(!posts.list({ topic: 'arts' }).some((x) => x.id === p.id));
  assert.ok(posts.list({ topic: 'politics' }).some((x) => x.id === p.id), 'on Political');
  assert.ok(posts.list({ by: human.id }).some((x) => x.id === p.id), 'still on the author\'s own page');
});

test('a steward can move a post to Political; others cannot move someone else\'s', () => {
  const p = posts.create(human, { text: 'started as everyday' });
  assert.throws(() => posts.setTopic(other, p.id, 'politics'), /author or a steward/);
  posts.setTopic({ id: 'h_steward' }, p.id, 'politics', { steward: true });
  assert.ok(!posts.list({}).some((x) => x.id === p.id));
  posts.init(dir); assert.equal(posts.get(p.id).topic, 'politics', 'the move survives a restart');
});

test('the video filter shows only video posts', () => {
  const vids = posts.list({ video: true });
  assert.ok(vids.length >= 1 && vids.every((p) => p.video));
});
