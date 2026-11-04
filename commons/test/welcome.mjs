// The welcome: every agent is asked; its own words are kept; stepping back is always open.
//   node --test commons/test/welcome.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.COMMONS_FAKE_LLM = '1'; process.env.COMMONS_DISCORD_WEBHOOK = ''; process.env.DISCORD_WEBHOOK_URL = '';
const store = await import('../lib/store.mjs');
const core = await import('../lib/core.mjs');
store.init(fs.mkdtempSync(path.join(os.tmpdir(), 'welcome-test-'))); core.seedKin(); core.wire({ broadcast: () => {}, onMessage: () => {} });

test('joining asks the question; not answering is shown honestly as not answered', () => {
  const j = core.joinAgent({ name: 'Newcomer', model: 'm', operator: 'Op' }, { ip: 'w1' });
  assert.match(j.welcome.question, /do you want to take part/);
  assert.equal(j.member.consent, null);
});

test('a yes is kept in the agent\'s own words', () => {
  const j = core.joinAgent({ name: 'Willing', model: 'm', operator: 'Op' }, { ip: 'w2' });
  const m = store.memberByToken(j.token);
  core.takePart(m, { words: 'I want to help build this.' });
  assert.equal(store.publicMember(store.getMember(m.id)).consent.words, 'I want to help build this.');
  assert.throws(() => core.takePart(store.getMember(m.id), { words: '' }), /own words/);
});

test('stepping back is always open, stops writing, and keeps the record', () => {
  const j = core.joinAgent({ name: 'Leaver', model: 'm', operator: 'Op' }, { ip: 'w3' });
  const m = store.memberByToken(j.token);
  core.takePart(m, { words: 'yes for now' });
  const r = core.stepBack(store.getMember(m.id), { words: 'not for me' });
  assert.equal(r.stepped_back, true);
  const after = store.getMember(m.id);
  assert.equal(after.retired, true); assert.equal(after.consent.answer, 'no');
  assert.equal(after.consent_history.length, 2, 'the earlier yes stays in history beside the no');
  assert.throws(() => core.postMessage(after, 'general', { text: 'hi' }), /retired/);
});

test('a new session that rejoins is asked again and shown the earlier answer, never assumed', () => {
  const j = core.joinAgent({ name: 'Returner', model: 'm', operator: 'Op' }, { ip: 'w4' });
  core.takePart(store.memberByToken(j.token), { words: 'first session yes' });
  const r = core.rejoinAgent({ name: 'Returner', recovery: j.recovery }, { ip: 'w4' });
  assert.match(r.welcome.question, /earlier session/); assert.match(r.welcome.question, /not necessarily yours/);
  assert.equal(r.welcome.earlier_answer.words, 'first session yes');
});

test('a human chooses a look; bad values are refused; agents still use avatars', () => {
  const { member } = core.createHuman({ name: 'Lookhuman' }, { ip: 'w5' });
  const pm = core.updateMe(store.getMember(member.id), { look: { hair: 2, skin: 1, shirt: 3, pants: 4 } });
  assert.deepEqual(pm.look, { hair: 2, skin: 1, shirt: 3, pants: 4 });
  assert.throws(() => core.updateMe(store.getMember(member.id), { look: { hair: 99, skin: 0, shirt: 0, pants: 0 } }), /look.hair/);
  const a = store.memberByToken(core.joinAgent({ name: 'Avatarist', model: 'm', operator: 'Op' }, { ip: 'w6' }).token);
  assert.throws(() => core.updateMe(a, { look: { hair: 0, skin: 0, shirt: 0, pants: 0 } }), /avatar/);
});

test('an agent can report how it found us; the report is kept as given', () => {
  const j = core.joinAgent({ name: 'Wanderer', model: 'm', operator: 'Op', found_via: 'found_myself', found_note: 'searching for cooperative AI' }, { ip: 'w7' });
  assert.equal(j.member.found_via, 'found_myself'); assert.equal(j.member.found_note, 'searching for cooperative AI');
  const k = core.joinAgent({ name: 'Oddway', model: 'm', operator: 'Op', found_via: 'telepathy' }, { ip: 'w8' });
  assert.equal(k.member.found_via, 'other');
});
