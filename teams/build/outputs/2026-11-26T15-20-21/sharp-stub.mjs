
const sharp = (input) => ({
  png: () => ({ toBuffer: async () => Buffer.from('') }),
  metadata: async () => ({ width: 1, height: 1 }),
  resize: () => sharp(input), extend: () => sharp(input), composite: () => sharp(input),
  jpeg: () => ({ toBuffer: async () => Buffer.from('') }),
  toBuffer: async () => Buffer.from(''),
});
export default sharp;
