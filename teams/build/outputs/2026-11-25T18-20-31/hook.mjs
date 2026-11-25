import { registerHooks } from 'node:module';
registerHooks({ resolve(spec, ctx, next) { if (spec === 'sharp') return { url: 'file:///tmp/kin-py-3pOEJa/out/fake-sharp.mjs', shortCircuit: true }; return next(spec, ctx); } });
