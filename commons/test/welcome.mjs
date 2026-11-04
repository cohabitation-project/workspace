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
