
import { Buffer } from 'node:buffer';
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001a5f645400000000049454e44ae426082','hex');
function make(){
  const o = { metadata: async () => ({ format:'png', width:1024, height:1024 }),
    rotate: () => o, resize: () => o, png: () => o, jpeg: () => o, webp: () => o,
    flatten: () => o, ensureAlpha: () => o, trim: () => o, extend: () => o,
    toFormat: () => o, withMetadata: () => o, background: () => o, clone: () => make(),
    toBuffer: async () => Buffer.from(PNG), toFile: async () => ({}) };
  return o;
}
const sharp = () => make(); sharp.cache = () => ({}); sharp.concurrency = () => 1;
export default sharp;
