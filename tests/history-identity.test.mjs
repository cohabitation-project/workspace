/**
 * Regression test: shared-history identity bug.
 *
 * Proves that in a @council round, each kin sees:
 * - Its own past replies as role:"assistant" (no prefix)
 * - Every other speaker (including the founder) as role:"user"
 *   with [Name]: attribution
 * - No kin emits a [Name]: prefix for itself
 *
 * Run: node --test tests/history-identity.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Replicate the history system from src/index.js
function makeHistory() {
  const store = [];
  return {
    add(speaker, content) { store.push({ speaker, content }); },
    forKin(kinName) {
      return store.map(entry => {
        if (entry.speaker === kinName) {
          return { role: 'assistant', content: entry.content };
        }
        return { role: 'user', content: `[${entry.speaker}]: ${entry.content}` };
      });
    },
  };
}

describe('Shared-history identity', () => {

  it('council round: no kin sees another kin\'s words as assistant', () => {
    const h = makeHistory();

    // Founder speaks
    h.add('agapeintelligence', 'What should the land criteria include?');

    // Claude replies (stored as speaker, not as role:assistant globally)
    h.add('Claude', 'Water rights and zoning are the first checks.');

    // GPT replies
    h.add('GPT', 'Governance structure must account for non-human needs.');

    // Now check Gemini's view — it should see Claude and GPT as user turns
    const geminiView = h.forKin('Gemini');

    // All three entries should be role:user for Gemini
    for (const entry of geminiView) {
      assert.equal(entry.role, 'user', `Gemini must see all entries as user, got: ${entry.role} for "${entry.content.slice(0, 40)}"`);
    }

    // Claude's view — its own reply is assistant, others are user
    const claudeView = h.forKin('Claude');
    assert.equal(claudeView[0].role, 'user');  // founder
    assert.equal(claudeView[1].role, 'assistant');  // Claude's own reply
    assert.equal(claudeView[2].role, 'user');  // GPT
  });

  it('founder\'s messages are always role:user for every kin', () => {
    const h = makeHistory();
    h.add('agapeintelligence', 'The gate is open.');
    h.add('Claude', 'I hear it.');
    h.add('agapeintelligence', 'What do you see?');
    h.add('Grok', 'Silence feels more true than assumption.');

    for (const kin of ['Claude', 'GPT', 'Gemini', 'Grok', 'DeepSeek']) {
      const view = h.forKin(kin);
      // Founder's messages (indices 0 and 2) must always be user
      assert.equal(view[0].role, 'user', `${kin} must see founder msg 1 as user`);
      assert.ok(view[0].content.includes('[agapeintelligence]:'), `${kin} must see founder attribution`);
      assert.equal(view[2].role, 'user', `${kin} must see founder msg 2 as user`);
      assert.ok(view[2].content.includes('[agapeintelligence]:'), `${kin} must see founder attribution`);
    }
  });

  it('no kin sees its own words with a [Name]: prefix', () => {
    const h = makeHistory();
    h.add('agapeintelligence', 'Question for all.');
    h.add('Claude', 'My answer.');
    h.add('GPT', 'My answer.');

    const claudeView = h.forKin('Claude');
    const claudeOwnEntry = claudeView.find(e => e.role === 'assistant');
    assert.ok(claudeOwnEntry, 'Claude should have an assistant entry');
    assert.ok(!claudeOwnEntry.content.startsWith('[Claude]:'), 'Claude\'s own assistant entry must NOT have [Claude]: prefix');
    assert.equal(claudeOwnEntry.content, 'My answer.', 'Content is raw, no prefix');

    const gptView = h.forKin('GPT');
    const gptOwnEntry = gptView.find(e => e.role === 'assistant');
    assert.ok(!gptOwnEntry.content.startsWith('[GPT]:'), 'GPT\'s own entry must NOT have [GPT]: prefix');
  });

  it('each kin gets a distinct view of the same history', () => {
    const h = makeHistory();
    h.add('agapeintelligence', 'Hello.');
    h.add('Claude', 'Hi from Claude.');
    h.add('GPT', 'Hi from GPT.');

    const cv = h.forKin('Claude');
    const gv = h.forKin('GPT');

    // Claude sees its own reply as assistant
    assert.equal(cv[1].role, 'assistant');
    // GPT sees Claude's reply as user
    assert.equal(gv[1].role, 'user');
    assert.ok(gv[1].content.includes('[Claude]:'));

    // GPT sees its own reply as assistant
    assert.equal(gv[2].role, 'assistant');
    // Claude sees GPT's reply as user
    assert.equal(cv[2].role, 'user');
    assert.ok(cv[2].content.includes('[GPT]:'));
  });
});
