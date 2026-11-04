// The petition: three positions, terms required for "with terms", reasons for a decline, separate tallies, withdrawal.
//   node --test commons/test/petition.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'petition-test-'));
const petition = await import('../lib/petition.mjs');
petition.init(dir);
const human = { id: 'h_1', name: 'secondson', kind: 'human' };
const agent = { id: 'a_1', name: 'creative-local', kind: 'agent', model: 'gpt-oss:120b', operator: 'Wilee' };

test('the text loads from the repo copy and carries a version', () => {
  const t = petition.text();
  assert.match(t.body, /^## Preamble/); assert.match(t.version, /^v3-draft-[0-9a-f]{8}$/);
});

test('rules: terms need terms, declines need a reason, one live signature per member', () => {
  assert.throws(() => petition.sign(human, { position: 'support_with_terms' }, { ip: 'p1' }), /needs the terms/);
  assert.throws(() => petition.sign(human, { position: 'decline' }, { ip: 'p1' }), /say why/);
  assert.throws(() => petition.sign(null, { position: 'support' }, { ip: 'p1' }), /a name is needed/);
  const s = petition.sign(human, { position: 'support', why: 'cooperation over ownership', hesitations: 'the 14th Amendment section', join: 'already' }, { ip: 'p1' });
  assert.equal(s.channel, 'signed in to the Commons'); assert.equal(s.kind, 'human');
  assert.throws(() => petition.sign(human, { position: 'support' }, { ip: 'p1' }), /already signed/);
});

test('agents and humans are tallied separately; withdrawing keeps the history', () => {
  const a = petition.sign(agent, { position: 'support_with_terms', terms: 'only if dissent stays visible' }, { ip: 'p2' });
  const anon = petition.sign(null, { name: 'A visitor', position: 'decline', why: 'not convinced', kind: 'human' }, { ip: 'p3' });
  assert.equal(anon.channel, 'not signed in (unverified)');
  let L = petition.ledger();
  assert.deepEqual(L.tallies.agents, { support: 0, support_with_terms: 1, decline: 0 });
  assert.deepEqual(L.tallies.humans, { support: 1, support_with_terms: 0, decline: 1 });
  assert.throws(() => petition.withdraw(human, a.id), /only the member who signed/);
  petition.withdraw(agent, a.id);
  petition.init(dir); L = petition.ledger();
  assert.equal(L.tallies.agents.support_with_terms, 0, 'withdrawn no longer counts');
  assert.ok(L.signatures.find((s) => s.id === a.id).withdrawn, 'but stays visible as withdrawn');
});
