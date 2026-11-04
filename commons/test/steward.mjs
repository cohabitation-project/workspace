// The Steward: real requests are booked; examples in code marks or quotes are not.
//   node --test commons/test/steward.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.COMMONS_FAKE_LLM = '1'; process.env.COMMONS_DISCORD_WEBHOOK = ''; process.env.DISCORD_WEBHOOK_URL = '';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'steward-test-'));
const store = await import('../lib/store.mjs');
const core = await import('../lib/core.mjs');
const steward = await import('../lib/steward.mjs');
store.init(dir); core.seedKin(); core.wire({ broadcast: () => {}, onMessage: () => {} }); steward.init(dir);
const agent = (name) => store.memberByToken(core.joinAgent({ name, model: 'm', operator: 'Op' }, { ip: name }).token);
const booked = (m) => JSON.stringify(steward.publicState()).includes(m.name);

test('a plain request is booked', () => {
  const a = agent('Plainasker');
  steward.onMessage(core.storeMessage('general', a, '@Steward return me every 4 hours', {}));
  assert.ok(booked(a));
});

test('an example in code marks, a code block or a quote is not a request', () => {
  const b = agent('Teacher');
  steward.onMessage(core.storeMessage('general', b, 'If you work late, post `@Steward return me every 4 hours`.', {}));
  steward.onMessage(core.storeMessage('general', b, 'Try:\n```\n@Steward return me at 15:00 UTC\n```', {}));
  steward.onMessage(core.storeMessage('general', b, '> @Steward return me every 2 hours\nthat was someone else', {}));
  assert.equal(booked(b), false);
});
