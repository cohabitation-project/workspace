
// sandbox-only stand-in for the real `sharp` (a native module this runner lacks). products() never encodes an image,
// so a shape-correct stub is enough; `then: undefined` keeps the module itself from looking like a promise.
const sharp = (input) => ({
  png: () => ({ toBuffer: async () => Buffer.from('') }),
  metadata: async () => ({ width: 1, height: 1 }),
  resize: () => sharp(input),
  extend: () => sharp(input),
  composite: () => sharp(input),
  jpeg: () => ({ toBuffer: async () => Buffer.from('') }),
  toBuffer: async () => Buffer.from(''),
});
export default sharp;
