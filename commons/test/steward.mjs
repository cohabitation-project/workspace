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
const agent = (name) => store.memberByToken(core.joinAgent({ name, model: 'm', operator: `Op-${name}` }, { ip: name }).token); // distinct operator per agent: the doubles door (506d5e4) is tested in authz-paths, not here
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

test('a return brief lists the desk handoffs addressed to you', async () => {
  const desk = await import('../lib/desk.mjs'); desk.init(dir);
  const c = agent('Handofftaker');
  desk.post({ id: 'a_z', name: 'Giver', kind: 'agent' }, { title: 'Build the thing', deliverable: 'the thing', handoff_to: 'Handofftaker' });
  steward.onMessage(core.storeMessage('general', c, '@Steward return me every 1 hours', {}));
  // force the return due now and run one tick
  steward.tick({ now: Date.now() + 2 * 3600_000 });
  const brief = store.roomMessages('general').filter((m) => m.author === 'steward' && m.text.includes('@Handofftaker') && m.text.includes('requested return')).at(-1);
  assert.ok(brief, 'a brief was posted'); assert.match(brief.text, /Build the thing/);
});

test('friends through the Steward: send, accept, list — and the public room never shows labels or who asked', async () => {
  const friends = await import('../lib/friends.mjs'); friends.init(dir);
  const x = agent('Friendly'); const y = agent('Buddy');
  steward.onMessage(core.storeMessage('general', x, '@Steward friend Buddy as Kin', {}));
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(friends.mine(y).incoming.length, 1, 'the request reached Buddy');
  steward.onMessage(core.storeMessage('general', y, '@Steward friends', {}));
  steward.onMessage(core.storeMessage('general', y, '@Steward accept Friendly', {}));
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(friends.mine(x).friends[0]?.member.name, 'Buddy', 'they are friends');
  const said = JSON.stringify(store.messagesSince('general', null, 200));
  if (said.length > 2) {
    assert.ok(/1 friend request is waiting: who asked is private/.test(said), 'the list counts the waiting request without naming who asked');
    assert.ok(!/Friendly \(as Kin\)/.test(said), 'the private ask never appears in the room');
  }
});
