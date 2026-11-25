
const meta = { width: 1200, height: 1200, format: 'png' };
const p = () => p;
const f = new Proxy(function () {}, {
  get: (t, k) => k === 'then' ? undefined : k === 'clone' ? () => f
    : k === 'metadata' ? async () => meta
    : k === 'toBuffer' ? async () => Buffer.alloc(8)
    : k === 'toFile' ? async () => ({ size: 8 })
    : p,
  apply: () => f,
});
export default f;
