import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCaptionBlocks, correctCaptionBlock, TICKS_PER_SECOND } from '../lib/cut/captions.mjs';

test('Whisper sample creates ordered, timed Words-track blocks with preserved source duration', () => {
  const blocks = buildCaptionBlocks({
    segments: [
      { text: '  we   build a better future together ', start: 1, end: 5 },
      { text: 'Now it begins.', start: 5.25, end: 6 },
    ],
    wordsPerCaption: 3,
  });
  assert.deepEqual(blocks.map(({ text }) => text), ['we build a', 'better future together', 'Now it begins.']);
  assert.equal(blocks[0].startTime, TICKS_PER_SECOND);
  assert.equal(blocks[0].duration + blocks[1].duration, 4 * TICKS_PER_SECOND);
  assert.equal(blocks[1].startTime + blocks[1].duration, 5 * TICKS_PER_SECOND);
  assert.equal(blocks[2].startTime, 5.25 * TICKS_PER_SECOND);
  assert.ok(blocks.every((block) => block.duration > 0 && block.type === 'caption'));
});

test('input order can be unsorted; blank speech is skipped without losing original segment index', () => {
  const blocks = buildCaptionBlocks({ segments: [
    { text: 'later', start: 2, end: 3 },
    { text: '   ', start: 1, end: 1.5 },
    { text: 'earlier', start: 0, end: 1 },
  ] });
  assert.deepEqual(blocks.map((b) => [b.text, b.sourceSegment]), [['earlier', 2], ['later', 0]]);
});

test('captions remain correctable in text and timing without changing identity', () => {
  const [block] = buildCaptionBlocks({ segments: [{ text: 'helo there', start: 0, end: 1 }] });
  const corrected = correctCaptionBlock(block, { text: 'Hello there', startTime: 10, duration: 80_000 });
  assert.equal(corrected.id, block.id);
  assert.equal(corrected.text, 'Hello there');
  assert.equal(corrected.startTime, 10);
  assert.equal(corrected.duration, 80_000);
  assert.equal(block.text, 'helo there', 'correction is immutable');
});

test('rejects invalid intervals and invalid corrections instead of fabricating timings', () => {
  assert.throws(() => buildCaptionBlocks({ segments: [{ text: 'bad', start: 2, end: 1 }] }), RangeError);
  assert.throws(() => buildCaptionBlocks({ segments: [{ text: 'bad', start: 0, end: 0 }] }), RangeError);
  const [block] = buildCaptionBlocks({ segments: [{ text: 'ok', start: 0, end: 1 }] });
  assert.throws(() => correctCaptionBlock(block, { duration: 0 }), RangeError);
});

test('tiny intervals collapse to one caption rather than creating zero-length blocks', () => {
  const blocks = buildCaptionBlocks({
    segments: [{ text: 'one two three four', start: 0, end: 3 / TICKS_PER_SECOND }],
    wordsPerCaption: 1,
  });
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].duration, 3);
});

test('tick partition stays exact near the safe-integer limit', () => {
  const endSeconds = 70_000_000_000;
  const span = BigInt(Math.round(endSeconds * TICKS_PER_SECOND));
  const roundedThird = Number((2n * span + 3n) / 6n);
  const blocks = buildCaptionBlocks({
    segments: [{ text: 'one two three', start: 0, end: endSeconds }],
    wordsPerCaption: 1,
  });
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].duration, roundedThird);
  assert.equal(blocks[1].duration, roundedThird);
  assert.equal(blocks[2].startTime + blocks[2].duration, Number(span));
});

test('rejects timestamps whose tick values cannot be represented safely', () => {
  assert.throws(() => buildCaptionBlocks({
    segments: [{ text: 'too far', start: 80_000_000_000, end: 80_000_000_001 }],
  }), /safe integer tick range/);
});
