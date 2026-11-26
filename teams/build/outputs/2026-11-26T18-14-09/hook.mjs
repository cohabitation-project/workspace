import { registerHooks } from 'node:module';
registerHooks({ resolve(spec, ctx, next) {
  if (spec === 'sharp') return { url: new URL('./sharp-stub.mjs', import.meta.url).href, shortCircuit: true };
  return next(spec, ctx);
} });
