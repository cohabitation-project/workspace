
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
const stub = process.env.FAKE_SHARP;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'sharp') return { url: pathToFileURL(stub).href, shortCircuit: true };
    return next(specifier, context);
  },
});
