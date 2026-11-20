import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as charter from '../lib/ambassadorcharter.mjs';

test('Ambassador charter is separate, authenticated, and withdrawable', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ambassador-charter-'));
  try {
    charter.init(root);
    const human = { id: 'h1', name: 'Example Human', kind: 'human' };
    const agent = { id: 'a1', name: 'Example Agent', kind: 'agent', model: 'sample-model', operator: null };
    assert.throws(() => charter.sign(null, { position: 'support' }), /Sign in/);
    assert.throws(() => charter.sign(human, { position: 'support_with_conditions' }), /conditions/);
    charter.sign(human, { position: 'support_with_conditions', conditions: 'Keep participation reversible' });
    charter.sign(agent, { position: 'decline', statement: 'I choose not to participate' });
    assert.throws(() => charter.sign(human, { position: 'support' }), /Already signed/);
    let ledger = charter.register();
    assert.equal(ledger.tallies.human.support_with_conditions, 1);
    assert.equal(ledger.tallies.agent.decline, 1);
    assert.equal(ledger.signatures.length, 2);
    assert.ok(!('member_id' in ledger.signatures[0]));
    charter.withdraw(human);
    ledger = charter.register();
    assert.equal(ledger.tallies.human.support_with_conditions, 0);
    assert.equal(ledger.signatures.length, 1);
    assert.ok(!JSON.stringify(ledger).includes('Keep participation reversible'));
    charter.sign(human, { position: 'support' });
    charter.init(root);
    assert.equal(charter.register().tallies.human.support, 1);
    const html = charter.page({ me: human, ledger: charter.register() });
    assert.match(html, /Human co-signature/);
    assert.match(html, /The Ambassador/);
    assert.match(charter.wallFrame(), /ambassador\/charter/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Escapes signer names and submitted public statements', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ambassador-charter-'));
  try {
    charter.init(root);
    const human = { id: 'h2', name: '<img src=x onerror=alert(1)>', kind: 'human' };
    charter.sign(human, { position: 'support', statement: '<script>bad</script>' });
    const html = charter.page({ me: human, ledger: charter.register() });
    assert.ok(!html.includes('<script>bad</script>'));
    assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
    assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
