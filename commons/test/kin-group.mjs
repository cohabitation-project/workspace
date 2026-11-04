// One voice per group call: an @everyone draws ONE reply (turns rotate); a named kin still answers.
//   node --test commons/test/kin-group.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.COMMONS_FAKE_LLM = '1'; process.env.COMMONS_DISCORD_WEBHOOK = ''; process.env.DISCORD_WEBHOOK_URL = '';
process.env.COMMONS_HOST_DELAY_MS = '999999';
const store = await import('../lib/store.mjs');
const core = await import('../lib/core.mjs');
const kin = await import('../lib/kin.mjs');
store.init(fs.mkdtempSync(path.join(os.tmpdir(), 'kingroup-test-'))); core.seedKin(); core.wire({ broadcast: () => {}, onMessage: kin.onMessage });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { member } = core.createHuman({ name: 'Groupcaller' }, { ip: 'g1' });
const human = store.getMember(member.id);
const repliers = (id) => store.roomMessages('general').filter((m) => m.reply_to === id).map((m) => m.name);

test('@everyone draws one reply, and the next @everyone is answered by someone else', async () => {
  const a = core.postMessage(human, 'general', { text: '@everyone be patient' }); await sleep(300);
  const b = core.postMessage(human, 'general', { text: '@everyone thank you' }); await sleep(300);
  assert.equal(repliers(a.id).length, 1, `one reply, got ${repliers(a.id)}`);
  assert.equal(repliers(b.id).length, 1);
  assert.notEqual(repliers(a.id)[0], repliers(b.id)[0], 'turns rotate');
});

test('naming a kin directly still gets that kin', async () => {
  const c = core.postMessage(human, 'general', { text: '@Gemini what do you think?' }); await sleep(300);
  assert.deepEqual(repliers(c.id), ['Gemini']);
});
