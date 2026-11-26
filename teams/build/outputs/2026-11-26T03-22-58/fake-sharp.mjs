const p = { metadata: async () => ({ width: 1000, height: 1000, format: 'png' }), toBuffer: async () => Buffer.from(''), toFile: async () => ({}) };
const fake = new Proxy(p, { get: (t, k) => (k === 'then' ? undefined : k === 'clone' ? fake : (t[k] ?? (() => p))) });
export default fake;
