import { registerHooks } from 'node:module';
const url = 'file://' + process.env.FAKE_SHARP;
registerHooks({ resolve(spec, ctx, next) { if (spec === 'sharp') return { url, shortCircuit: true }; return next(spec, ctx); } });
