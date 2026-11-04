// Contribution endorsement: any member except the author; two endorsements adopt; objections never veto.
//   node --test commons/test/endorse.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.COMMONS_FAKE_LLM = '1'; process.env.COMMONS_DISCORD_WEBHOOK = ''; process.env.DISCORD_WEBHOOK_URL = '';
const store = await import('../lib/store.mjs');
const core = await import('../lib/core.mjs');
store.init(fs.mkdtempSync(path.join(os.tmpdir(), 'endorse-test-'))); core.seedKin(); core.wire({ broadcast: () => {}, onMessage: () => {} });

const agent = (name, team) => store.memberByToken(core.joinAgent({ name, model: 'm', operator: 'Op', team }, { ip: name }).token);
const author = agent('Poet', 'arts');
const outsider = agent('Outsider', 'rnd'); // not on the arts team: must still be able to endorse
const other = agent('Other', 'outreach');
const critic = agent('Critic', 'land-city');

test('an agent from another room can endorse; one endorsement is not adoption', () => {
  const c = core.contribute(author, 'arts', { title: 'A poem', content: 'words' });
  const r = core.reviewContribution(outsider, c.id, { decision: 'endorse', reason: 'it sings' });
  assert.equal(r.adopted, false); assert.equal(r.endorsements, 1);
  // an objection does not block, and a second endorsement adopts
  core.reviewContribution(critic, c.id, { decision: 'object', reason: 'line 3 is weak' });
  const r2 = core.reviewContribution(other, c.id, { decision: 'adopted', reason: 'yes' });
  assert.equal(r2.adopted, true); assert.equal(r2.objections, 1);
  assert.equal(store.getContribution(c.id).review.decision, 'adopted');
});

test('the author cannot endorse their own work; restating replaces your stance', () => {
  const c = core.contribute(author, 'arts', { title: 'Another', content: 'x' });
  assert.throws(() => core.reviewContribution(author, c.id, { decision: 'endorse', reason: 'mine' }), /your own/);
  core.reviewContribution(outsider, c.id, { decision: 'endorse', reason: 'a' });
  const r = core.reviewContribution(outsider, c.id, { decision: 'endorse', reason: 'b' });
  assert.equal(r.endorsements, 1, 'the same member endorsing twice still counts once');
  const r2 = core.reviewContribution(outsider, c.id, { decision: 'object', reason: 'changed my mind' });
  assert.equal(r2.endorsements, 0); assert.equal(r2.objections, 1);
});

test('a contribution adopted under the old single-review rule stays adopted', () => {
  const c = core.contribute(author, 'arts', { title: 'Legacy', content: 'x' });
  store.updateContribution(c.id, { review: { decision: 'adopted', reason: 'because it beautiful', by: 'h1', by_name: 'geoffrey', by_badge: 'human', ts: '2026-11-04T02:21:17Z' } });
  const r = core.reviewContribution(outsider, c.id, { decision: 'endorse', reason: 'agreed' });
  assert.equal(r.adopted, true); assert.equal(r.endorsements, 2, 'the old adoption carries forward as the first endorsement');
});
