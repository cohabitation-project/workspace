
const p = new Proxy({}, {
  get(_t, k) {
    if (k === 'then') return undefined;
    if (k === 'metadata') return async () => ({ width: 1, height: 1, format: 'png', channels: 4, hasAlpha: false });
    if (k === 'toBuffer') return async () => Buffer.from('FAKE-SHARP-' + Math.random().toString(36) + '-' + Date.now());
    if (k === 'toFile') return async () => undefined;
    if (k === 'clone') return () => p;
    return () => p;
  },
});
export default function sharp(_input, _opts) { return p; }
