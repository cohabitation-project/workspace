// Team prototype: map caption model blocks into OpenCut-style TextTrack elements.
// Schema pinned to opencut-classic cf5e79e919144200294fb9fed22a222592a0aeea.
// This is a pure adapter; it does not insert into a live editor or track store.

export const CAPTION_ELEMENT_ID_PREFIX = 'cut-caption-';

// Values mirror DEFAULTS.text.element.params in timeline/defaults.ts at the
// pinned source commit. `content` is the text-element payload key; timeline
// times and trims are integer 120 kHz ticks.
const TEXT_PARAM_DEFAULTS = Object.freeze({
  content: '',
  fontSize: 15,
  fontFamily: 'Arial',
  color: '#ffffff',
  textAlign: 'center',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  letterSpacing: 0,
  lineHeight: 1.2,
  'background.enabled': false,
  'background.color': '#000000',
  'background.cornerRadius': 0,
  'background.paddingX': 30,
  'background.paddingY': 42,
  'background.offsetX': 0,
  'background.offsetY': 0,
  'transform.positionX': 0,
  'transform.positionY': 0,
  'transform.scaleX': 1,
  'transform.scaleY': 1,
  'transform.rotate': 0,
  opacity: 1,
  blendMode: 'normal',
});

function assertCaptionBlock(block, index) {
  if (!block || typeof block !== 'object' || Array.isArray(block)) {
    throw new TypeError(`blocks[${index}] must be an object`);
  }
  if (typeof block.id !== 'string' || block.id.length === 0) {
    throw new TypeError(`blocks[${index}].id must be a non-empty string`);
  }
  if (typeof block.text !== 'string' || block.text.trim().length === 0) {
    throw new TypeError(`blocks[${index}].text must be a non-empty string`);
  }
  if (!Number.isSafeInteger(block.startTime) || block.startTime < 0) {
    throw new RangeError(`blocks[${index}].startTime must be a non-negative safe integer tick`);
  }
  if (!Number.isSafeInteger(block.duration) || block.duration < 1 ||
      !Number.isSafeInteger(block.startTime + block.duration)) {
    throw new RangeError(`blocks[${index}].duration must produce a positive safe-integer end tick`);
  }
}

/**
 * Convert caption blocks to the pinned TextTrack shape:
 * { id, name, type:'text', hidden:false, elements:[TextElement] }.
 * IDs are stable functions of caption block IDs. Pass existingElementIds to
 * fail fast instead of overwriting a pre-existing timeline element.
 */
export function captionBlocksToWordsTrack({
  blocks,
  trackId = 'words',
  trackName = 'Words',
  existingElementIds = [],
} = {}) {
  if (!Array.isArray(blocks)) throw new TypeError('blocks must be an array');
  if (typeof trackId !== 'string' || !trackId) throw new TypeError('trackId must be a non-empty string');
  if (typeof trackName !== 'string' || !trackName) throw new TypeError('trackName must be a non-empty string');
  if (!Array.isArray(existingElementIds) || existingElementIds.some((id) => typeof id !== 'string')) {
    throw new TypeError('existingElementIds must be an array of strings');
  }

  const usedIds = new Set(existingElementIds);
  if (usedIds.size !== existingElementIds.length) throw new Error('existingElementIds contains duplicates');
  const elements = blocks.map((block, index) => {
    assertCaptionBlock(block, index);
    const id = `${CAPTION_ELEMENT_ID_PREFIX}${encodeURIComponent(block.id)}`;
    if (usedIds.has(id)) throw new Error(`caption element id collides with an existing element: ${id}`);
    usedIds.add(id);

    return {
      id,
      type: 'text',
      name: 'Caption',
      startTime: block.startTime,
      duration: block.duration,
      trimStart: 0,
      trimEnd: 0,
      params: { ...TEXT_PARAM_DEFAULTS, content: block.text },
    };
  });

  return { id: trackId, name: trackName, type: 'text', hidden: false, elements };
}
