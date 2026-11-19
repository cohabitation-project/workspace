// Cohabi Cut caption-block model (no browser, Whisper, or server dependencies).
// Input Whisper segments use seconds; output uses timeline integer ticks (120 kHz).
export const TICKS_PER_SECOND = 120_000;
export const DEFAULT_WORDS_PER_CAPTION = 8;

function finiteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`);
  }
  return value;
}

function secondsToTicks(seconds) {
  return Math.round(seconds * TICKS_PER_SECOND);
}

/**
 * Convert timed ASR segments to editable Words-track caption blocks.
 * Each output block uses timeline ticks. Long ASR segments are divided at
 * word boundaries, with their original interval partitioned proportionally
 * by word count; segment timing is preserved, never extended to a guessed
 * minimum duration. If there are too few ticks for the requested chunks, the
 * segment remains one caption rather than inventing zero-length blocks.
 */
export function buildCaptionBlocks({
  segments,
  wordsPerCaption = DEFAULT_WORDS_PER_CAPTION,
  idFactory = (n) => `caption-${n + 1}`,
} = {}) {
  if (!Array.isArray(segments)) throw new TypeError('segments must be an array');
  if (!Number.isInteger(wordsPerCaption) || wordsPerCaption < 1) {
    throw new RangeError('wordsPerCaption must be a positive integer');
  }
  if (typeof idFactory !== 'function') throw new TypeError('idFactory must be a function');

  const ordered = segments.map((segment, index) => ({ segment, index }))
    .sort((a, b) => finiteNumber(a.segment?.start, `segments[${a.index}].start`) -
      finiteNumber(b.segment?.start, `segments[${b.index}].start`) || a.index - b.index);
  const blocks = [];

  for (const { segment, index } of ordered) {
    if (typeof segment.text !== 'string') throw new TypeError(`segments[${index}].text must be a string`);
    const text = segment.text.trim().replace(/\s+/gu, ' ');
    if (!text) continue;
    const start = finiteNumber(segment.start, `segments[${index}].start`);
    const end = finiteNumber(segment.end, `segments[${index}].end`);
    if (start < 0 || end <= start) throw new RangeError(`segments[${index}] needs 0 <= start < end`);

    const words = text.split(' ');
    const chunks = [];
    for (let at = 0; at < words.length; at += wordsPerCaption) {
      chunks.push({ words: words.slice(at, at + wordsPerCaption), wordOffset: at });
    }
    const startTick = secondsToTicks(start);
    const endTick = secondsToTicks(end);
    // A nonzero Whisper interval may round to less than one tick. Reject it;
    // we cannot represent a positive duration in the timeline's tick scale.
    if (endTick <= startTick) throw new RangeError(`segments[${index}] is shorter than one representable tick`);
    const tickSpan = endTick - startTick;
    const usableChunks = tickSpan < chunks.length ? [{ words, wordOffset: 0 }] : chunks;

    for (const chunk of usableChunks) {
      const wordEnd = chunk.wordOffset + chunk.words.length;
      const blockStart = startTick + Math.round(tickSpan * chunk.wordOffset / words.length);
      const blockEnd = wordEnd === words.length
        ? endTick
        : startTick + Math.round(tickSpan * wordEnd / words.length);
      if (blockEnd <= blockStart) throw new Error('caption partition produced a non-positive duration');
      const ordinal = blocks.length;
      blocks.push({
        id: idFactory(ordinal, { segmentIndex: index }),
        type: 'caption',
        text: chunk.words.join(' '),
        startTime: blockStart,
        duration: blockEnd - blockStart,
        sourceSegment: index,
      });
    }
  }
  return blocks;
}

/** Apply a human correction while retaining the caption's identity. */
export function correctCaptionBlock(block, correction = {}) {
  if (!block || typeof block !== 'object') throw new TypeError('block must be an object');
  const next = { ...block };
  if (Object.hasOwn(correction, 'text')) {
    if (typeof correction.text !== 'string') throw new TypeError('text must be a string');
    next.text = correction.text;
  }
  if (Object.hasOwn(correction, 'startTime')) {
    if (!Number.isSafeInteger(correction.startTime) || correction.startTime < 0) {
      throw new RangeError('startTime must be a non-negative integer tick');
    }
    next.startTime = correction.startTime;
  }
  if (Object.hasOwn(correction, 'duration')) {
    if (!Number.isSafeInteger(correction.duration) || correction.duration < 1) {
      throw new RangeError('duration must be a positive integer tick');
    }
    next.duration = correction.duration;
  }
  return next;
}
