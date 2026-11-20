import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCaptionBlocks } from './captions-model.mjs';
import { captionBlocksToWordsTrack, CAPTION_ELEMENT_ID_PREFIX } from './captions-words-adapter.mjs';

const sampleBlocks = () => buildCaptionBlocks({
  segments: [
    { text: 'We build a better future.', start: 1, end: 3 },
    { text: 'Together.', start: 3.25, end: 4 },
  ],
  wordsPerCaption: 4,
});

test('maps caption blocks to a Words TextTrack and flat text-element params', () => {
  const blocks = sampleBlocks();
  const track = captionBlocksToWordsTrack({ blocks });
  assert.deepEqual({ id: track.id, name: track.name, type: track.type, hidden: track.hidden }, {
    id: 'words', name: 'Words', type: 'text', hidden: false,
  });
  assert.equal(track.elements.length, blocks.length);
  for (const [index, element] of track.elements.entries()) {
    assert.deepEqual(Object.keys(element).sort(), [
      'duration', 'id', 'name', 'params', 'startTime', 'trimEnd', 'trimStart', 'type',
    ]);
    assert.equal(element.type, 'text');
    assert.equal(element.name, 'Caption');
    assert.equal(element.params.content, blocks[index].text);
    assert.equal(element.startTime, blocks[index].startTime);
    assert.equal(element.duration, blocks[index].duration);
    assert.equal(element.trimStart, 0);
    assert.equal(element.trimEnd, 0);
    assert.equal(element.params.fontFamily, 'Arial');
    assert.equal(element.params.fontSize, 15);
    assert.equal(element.params['transform.scaleX'], 1);
    assert.equal(element.params['background.enabled'], false);
  }
});

test('IDs are deterministic, URL-escaped, unique across blocks, and collision-checked', () => {
  const blocks = [
    { id: 'asr/a', text: 'first', startTime: 0, duration: 10 },
    { id: 'second', text: 'second', startTime: 10, duration: 20 },
  ];
  const one = captionBlocksToWordsTrack({ blocks, trackId: 'track-custom', trackName: 'Dialogue' });
  const two = captionBlocksToWordsTrack({ blocks, trackId: 'track-custom', trackName: 'Dialogue' });
  assert.deepEqual(one.elements.map((e) => e.id), two.elements.map((e) => e.id));
  assert.equal(one.elements[0].id, `${CAPTION_ELEMENT_ID_PREFIX}asr%2Fa`);
  assert.equal(new Set(one.elements.map((e) => e.id)).size, blocks.length);
  assert.throws(() => captionBlocksToWordsTrack({ blocks, existingElementIds: [one.elements[0].id] }), /collides/);
  assert.throws(() => captionBlocksToWordsTrack({ blocks: [blocks[0], blocks[0]] }), /collides/);
});

test('preserves integer tick timing exactly, including safe large tick values', () => {
  const end = Number.MAX_SAFE_INTEGER - 10;
  const track = captionBlocksToWordsTrack({
    blocks: [{ id: 'large', text: 'safe end', startTime: end - 5, duration: 5 }],
  });
  assert.equal(track.elements[0].startTime, end - 5);
  assert.equal(track.elements[0].startTime + track.elements[0].duration, end);
});

test('rejects malformed blocks, unsafe/non-integer timing, and overflowing end ticks', () => {
  assert.throws(() => captionBlocksToWordsTrack({ blocks: [{}] }), /id/);
  assert.throws(() => captionBlocksToWordsTrack({ blocks: [{ id: 'x', text: ' ', startTime: 0, duration: 1 }] }), /text/);
  assert.throws(() => captionBlocksToWordsTrack({ blocks: [{ id: 'x', text: 'ok', startTime: -1, duration: 1 }] }), /startTime/);
  assert.throws(() => captionBlocksToWordsTrack({ blocks: [{ id: 'x', text: 'ok', startTime: 1.5, duration: 1 }] }), /startTime/);
  assert.throws(() => captionBlocksToWordsTrack({ blocks: [{ id: 'x', text: 'ok', startTime: 0, duration: 0 }] }), /duration/);
  assert.throws(() => captionBlocksToWordsTrack({
    blocks: [{ id: 'x', text: 'ok', startTime: Number.MAX_SAFE_INTEGER, duration: 1 }],
  }), /duration/);
});
