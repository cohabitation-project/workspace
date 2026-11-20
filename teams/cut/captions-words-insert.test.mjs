import test from 'node:test';
import assert from 'node:assert/strict';
import { insertWordsTrack } from './captions-words-insert.mjs';

const block = (id, text = id, startTime = 0) => ({ id, text, startTime, duration: 100 });
const track = (id, type, name, elements = []) => ({ id, type, name, elements });
const emptySceneTracks = () => ({
  overlay: [track('graphics', 'graphic', 'Graphics', [{ id: 'graphic-1', type: 'graphic' }])],
  main: track('main-video', 'video', 'Main', [{ id: 'video-1', type: 'video' }]),
  audio: [track('music', 'audio', 'Music', [{ id: 'audio-1', type: 'audio' }])],
});

test('inserts Words as an overlay text track and preserves other scene tracks', () => {
  const original = emptySceneTracks();
  const result = insertWordsTrack({ tracks: original, blocks: [block('c1', 'Hello')] });
  assert.notEqual(result, original);
  assert.notEqual(result.overlay, original.overlay);
  assert.equal(result.overlay.length, 2);
  assert.deepEqual(result.overlay[0], original.overlay[0]);
  assert.equal(result.overlay[1].id, 'words');
  assert.equal(result.overlay[1].type, 'text');
  assert.equal(result.overlay[1].name, 'Words');
  assert.equal(result.overlay[1].elements[0].params.content, 'Hello');
  assert.equal(result.main, original.main);
  assert.equal(result.audio, original.audio);
  assert.deepEqual(original.overlay.map((item) => item.id), ['graphics']);
});

test('replaces the existing named Words track in place without changing other tracks', () => {
  const original = emptySceneTracks();
  const oldWords = track('words', 'text', 'Words', [{ id: 'old-caption' }]);
  original.overlay.splice(0, 0, oldWords);
  const result = insertWordsTrack({ tracks: original, blocks: [block('new', 'Corrected')] });
  assert.equal(result.overlay.length, original.overlay.length);
  assert.equal(result.overlay[0].id, 'words');
  assert.equal(result.overlay[0].elements[0].params.content, 'Corrected');
  assert.equal(result.overlay[1], original.overlay[1]);
  assert.equal(result.main, original.main);
  assert.equal(result.audio, original.audio);
  assert.equal(original.overlay[0], oldWords);
});

test('replaces by matching Words name when the previous track id differs', () => {
  const original = emptySceneTracks();
  original.overlay.push(track('captions-v0', 'text', 'Words', [{ id: 'old' }]));
  const result = insertWordsTrack({ tracks: original, blocks: [block('next')] });
  assert.equal(result.overlay.at(-1).id, 'words');
  assert.equal(result.overlay.at(-1).elements[0].id, 'cut-caption-next');
});

test('rejects ambiguous matches, ID collisions, and cross-track element collisions', () => {
  const twoWords = emptySceneTracks();
  twoWords.overlay.push(track('words', 'text', 'Words'));
  twoWords.overlay.push(track('words-2', 'text', 'Words'));
  assert.throws(() => insertWordsTrack({ tracks: twoWords, blocks: [block('x')] }), /multiple Words/);

  const trackCollision = emptySceneTracks();
  trackCollision.audio.push(track('words', 'audio', 'Not Words'));
  assert.throws(() => insertWordsTrack({ tracks: trackCollision, blocks: [block('x')] }), /track id collides/);

  const elementCollision = emptySceneTracks();
  elementCollision.audio[0].elements.push({ id: 'cut-caption-x' });
  assert.throws(() => insertWordsTrack({ tracks: elementCollision, blocks: [block('x')] }), /collides/);
});

test('does not replace a text track outside overlay and rejects malformed SceneTracks', () => {
  const audioWords = emptySceneTracks();
  audioWords.audio.push(track('words', 'text', 'Words'));
  assert.throws(() => insertWordsTrack({ tracks: audioWords, blocks: [block('x')] }), /must be in the overlay/);
  assert.throws(() => insertWordsTrack({ tracks: { overlay: [], main: null, audio: [] }, blocks: [] }), /SceneTracks/);
});
