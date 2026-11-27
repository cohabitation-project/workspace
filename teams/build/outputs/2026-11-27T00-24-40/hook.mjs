import { registerHooks } from 'node:module';
const STUB = new URL('./sharp-stub.mjs', import.meta.url).href;
registerHooks({ resolve(spec, ctx, next) { if (spec === 'sharp') return { url: STUB, shortCircuit: true }; return next(spec, ctx); } });
